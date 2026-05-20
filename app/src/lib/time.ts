export function formatTime(minutes: number): string {
  const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function formatTimeShort(minutes: number): string {
  const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12} ${period}`;
}

export function formatTrailer(size?: string, parcels?: number): string {
  const parts: string[] = [];
  if (size) parts.push(size.replace(" ft", "'"));
  if (parcels !== undefined) parts.push(`${parcels.toLocaleString()} parcels`);
  return parts.join(" · ");
}

export function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "1h 24m" / "24m" / "" when not late. */
export function formatLateness(min: number): string {
  if (min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m late`;
  if (m === 0) return `${h}h late`;
  return `${h}h ${m}m late`;
}

/**
 * Deterministic synthesized arrival lateness for prototype purposes. ~⅓ of
 * trucks are on-time; the rest are 5–110 minutes late. Hashed off the truck id
 * so the value is stable across renders.
 */
export function synthLateMinutes(truckId: string): number {
  let h = 0;
  for (let i = 0; i < truckId.length; i++) h = (h * 31 + truckId.charCodeAt(i)) >>> 0;
  const bucket = h % 100;
  if (bucket < 35) return 0;
  return 5 + (h % 106);
}

/**
 * Deterministic synthesized stay overtime — extra minutes the truck spent at
 * the dock beyond its expected `durationMinutes`. Independent of arrival
 * lateness: a truck can arrive late AND stay overtime, or either by itself.
 * About 80% of trucks finish in their expected slot (0 overtime); the rest
 * stay 10–50 minutes longer. Separate hash from `synthLateMinutes` so the two
 * signals don't correlate.
 */
export function synthStayOvertimeMinutes(truckId: string): number {
  let h = 0;
  for (let i = 0; i < truckId.length; i++) h = (h * 37 + truckId.charCodeAt(i) + 13) >>> 0;
  const bucket = h % 100;
  if (bucket < 80) return 0;
  return 10 + (h % 41);
}

export interface StatusLine {
  /** "Departed 3:09 PM" / "Arrived 1:35 PM" / "ETA 3:24 PM" */
  primary: string;
  /** "1h 24m late" — empty string when on-time. */
  late: string;
}

/**
 * Build the "Departed / Arrived / ETA" line shown on a Typefix card.
 * `truck` carries the appointment + duration; `nowMinutes` is the prototype's
 * fixed "now" used to decide if a still-scheduled truck is past-due.
 */
export function getStatusLine(
  truck: { id: string; apptMinutes: number; durationMinutes: number; status: string },
  nowMinutes: number,
  /** Pass the card's visual source so the label tracks the card color: a green
   *  (departed) card always reads "Departed", regardless of synthesized late. */
  isDeparted = false,
): StatusLine {
  const arrivalDelay = synthLateMinutes(truck.id);
  const stayOvertime = synthStayOvertimeMinutes(truck.id);
  const actualArrival = truck.apptMinutes + arrivalDelay;
  const actualDepart = actualArrival + truck.durationMinutes + stayOvertime;
  const overdue = nowMinutes > truck.apptMinutes ? nowMinutes - truck.apptMinutes : 0;

  if (isDeparted || actualDepart <= nowMinutes || truck.status === "departed") {
    // Lateness on the Departed line = total minutes late departing
    // (arrival delay + extra time at the dock).
    return {
      primary: `Departed ${formatTime(actualDepart)}`,
      late: formatLateness(arrivalDelay + stayOvertime),
    };
  }
  if (actualArrival <= nowMinutes) {
    return { primary: `Arrived ${formatTime(actualArrival)}`, late: formatLateness(arrivalDelay) };
  }
  // Truck hasn't actually arrived yet. Label as ETA — even if the scheduled
  // appt block notionally spans `now`, the visual bar grows toward `now` (see
  // getBarRange) to make the overdue gap obvious; promoting these to "Arrived"
  // would conflict with that.
  return { primary: `ETA ${formatTime(truck.apptMinutes)}`, late: formatLateness(overdue) };
}

/**
 * Visual bar range for an appointment card. Mirrors `getStatusLine` so the
 * bar's edges align with the displayed status time:
 *   • Departed / Arrived → bar = [actualArrival, actualDepart]; left edge =
 *     arrival time, right edge = depart time. Width only exceeds the expected
 *     duration when the truck stayed overtime.
 *   • ETA (future appt) → bar = [appt, appt + duration] (scheduled window).
 *   • ETA (overdue: appt is past but synth says truck still hasn't arrived) →
 *     bar = [appt, now]. The right edge tracks the current-time line, so the
 *     bar visibly grows the longer the truck stays missing. When the truck
 *     actually arrives, the Arrived branch takes over and the bar snaps to
 *     start at the real arrival time.
 */
export function getBarRange(
  truck: { id: string; apptMinutes: number; durationMinutes: number; status: string },
  scheduledStartMinutes: number,
  nowMinutes: number,
  isDeparted = false,
): { startMin: number; widthMin: number } {
  const arrivalDelay = synthLateMinutes(truck.id);
  const stayOvertime = synthStayOvertimeMinutes(truck.id);
  const actualArrival = scheduledStartMinutes + arrivalDelay;
  const actualDepart = actualArrival + truck.durationMinutes + stayOvertime;

  if (isDeparted || actualDepart <= nowMinutes || truck.status === "departed") {
    return { startMin: actualArrival, widthMin: actualDepart - actualArrival };
  }
  if (actualArrival <= nowMinutes) {
    return { startMin: actualArrival, widthMin: actualDepart - actualArrival };
  }
  // Not yet arrived. If the appt is already past (overdue ETA, or in-progress
  // by scheduled-block but synth-late puts actual arrival in the future), the
  // bar's right edge tracks `now` so the visual reflects "the truck was due
  // by now and still isn't here." Once the truck actually arrives, the
  // Arrived branch above takes over and the whole bar snaps to actualArrival.
  if (nowMinutes > scheduledStartMinutes) {
    return { startMin: scheduledStartMinutes, widthMin: nowMinutes - scheduledStartMinutes };
  }
  return { startMin: scheduledStartMinutes, widthMin: truck.durationMinutes };
}
