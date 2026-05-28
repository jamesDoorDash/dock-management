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
  return parts.join(" ・ ");
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
 * Synthesized arrival delta for prototype purposes — signed minutes:
 *   positive = arrives late, negative = arrives early.
 * Hand-tuned per-truck so the time-scrubber demo (< / > / space) shows a
 * rich mix of grinding-late, on-time, and arrives-early behavior. Trucks
 * whose appt is at/after 14:15 keep their delta small (or 0) so the
 * canonical 14:15 frame still renders trucks as scheduled-grey.
 */
const ARRIVAL_DELTAS: Record<string, number> = {
  // Past appts — all visibly departed at canonical 14:15
  "tr-petco-ret": 0,
  "tr-aeo-ret": 6,
  "tr-backcountry-ret": 0,
  "tr-staples-ret": -3,
  "tr-gco-1": 30, // late, but still departed before 14:15
  // tr-hm-ret stays in the hash bucket (kept for existing demo)
  // tr-allpack pinned so it arrives exactly at 14:15
  "tr-allpack": 40,
  // Trucks with appt at/after 14:30 — late deltas grind through the demo,
  // negative deltas show "arrived early, jumps to current-time bar"
  "tr-petco-in": 35, // late: appt 14:30 → arrives 15:05
  "tr-ord7-out": -12, // early: appt 15:08 → arrives 14:56
  "tr-stord-2f0b": 22, // late: appt 15:17 → arrives 15:39
  "tr-ord7-in": -18, // early: appt 15:25 → arrives 15:07
  "tr-macys-731": 45, // late
  "tr-everlasting": -9, // early
  "tr-stord-66f0": 12,
  "tr-ewr2-in": -7,
  "tr-builtbar": 28,
  "tr-macys-745": -14,
  "tr-aeo-in": 20,
  "tr-jtv": -6,
  "tr-ewr2-out": 18,
  "tr-crn-out": 0,
  "tr-nas-out": -8,
  "tr-mco-out": 11,
  "tr-atl12-out": -5,
};
const LATE_HASH_IDS = new Set(["tr-hm-ret"]);
export function synthLateMinutes(truckId: string): number {
  const override = ARRIVAL_DELTAS[truckId];
  if (override !== undefined) return override;
  if (!LATE_HASH_IDS.has(truckId)) return 0;
  let h = 0;
  for (let i = 0; i < truckId.length; i++) h = (h * 31 + truckId.charCodeAt(i)) >>> 0;
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
// Demo-only display override for HM-IN's overtime. Affects the visible bar
// width via getBarRange only — synthStayOvertimeMinutes stays untouched so the
// auto-assign layout doesn't shift between demo frames.
let HM_DISPLAY_OVERTIME: number | null = null;
export function setHmOvertimeOverride(m: number | null) {
  HM_DISPLAY_OVERTIME = m;
}
// Allpack stays overtime as the demo advances — bar's right edge tracks the
// current-time line so it visibly grows without finishing.
let ALLPACK_OVERTIME = 0;
export function setAllpackOvertimeOverride(m: number) {
  ALLPACK_OVERTIME = m;
}
/**
 * Per-truck signed overtime delta: positive = stayed at dock longer than
 * expected (bar grows past expected depart), negative = left dock early
 * (bar shrinks). Hand-tuned so the time-scrubber demo shows departure
 * variety. Trucks not in the map fall back to the deterministic hash
 * below (kept for backwards compatibility with the existing demo).
 */
const OVERTIME_DELTAS: Record<string, number> = {
  "tr-petco-ret": -4,
  "tr-aeo-ret": 8,
  "tr-backcountry-ret": -2,
  "tr-staples-ret": 5,
  "tr-gco-1": -6,
  "tr-petco-in": 0, // overrun handled by OVERRUN_DELTAS below
  "tr-ord7-out": -30, // departs early
  "tr-stord-2f0b": 0, // overrun handled by OVERRUN_DELTAS below
  "tr-ord7-in": -22,
  "tr-macys-731": 25,
  "tr-everlasting": -7,
  "tr-stord-66f0": 14,
  "tr-ewr2-in": -10,
  "tr-builtbar": 0, // overrun handled by OVERRUN_DELTAS below
  "tr-macys-745": -15,
  "tr-aeo-in": -25, // arrived 20m late but unloaded fast → beats scheduled depart, no triangle when green
  "tr-jtv": -6,
  "tr-ewr2-out": 16,
  "tr-crn-out": -3,
  "tr-nas-out": 5,
  "tr-mco-out": -8,
  "tr-atl12-out": 7,
};
export function synthStayOvertimeMinutes(truckId: string): number {
  if (truckId === "tr-allpack") return ALLPACK_OVERTIME;
  const override = OVERTIME_DELTAS[truckId];
  if (override !== undefined) return override;
  let h = 0;
  for (let i = 0; i < truckId.length; i++) h = (h * 37 + truckId.charCodeAt(i) + 13) >>> 0;
  const bucket = h % 100;
  if (bucket < 80) return 0;
  return 10 + (h % 41);
}

/**
 * Per-truck overrun (positive minutes): how much LONGER the truck stays at the
 * dock than its expected duration. Unlike OVERTIME_DELTAS (which is baked into
 * the bar from the moment of arrival), overrun is a *deferred* extension —
 * during the overrun window the bar's right edge tracks the current-time line,
 * so it visibly stretches as time advances, then snaps to its final width once
 * the truck actually departs. Matches the Allpack-style behavior in the W/E
 * demo but applied automatically as the scrubber advances.
 */
const OVERRUN_DELTAS: Record<string, number> = {
  "tr-petco-in": 25, // overstays 25 min past expected depart
  "tr-stord-2f0b": 35,
  "tr-builtbar": 30,
};
export function synthOverrunMinutes(truckId: string): number {
  return OVERRUN_DELTAS[truckId] ?? 0;
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
  const overrun = synthOverrunMinutes(truck.id);
  const actualArrival = truck.apptMinutes + arrivalDelay;
  const expectedDepart = actualArrival + Math.max(truck.durationMinutes + stayOvertime, 10);
  const actualDepart = expectedDepart + overrun;
  const overdue = nowMinutes > truck.apptMinutes ? nowMinutes - truck.apptMinutes : 0;

  if (isDeparted || actualDepart <= nowMinutes) {
    // Lateness on the Departed line = total minutes late departing
    // (arrival delay + extra time at the dock + overrun).
    return {
      primary: `Departed ${formatTime(actualDepart)}`,
      late: formatLateness(arrivalDelay + stayOvertime + overrun),
    };
  }
  if (actualArrival <= nowMinutes) {
    // While the truck is overrunning, surface the running overdue minutes so
    // the caution triangle fires even if arrival was on time.
    const runningOverrun =
      overrun > 0 && nowMinutes > expectedDepart ? nowMinutes - expectedDepart : 0;
    return {
      primary: `Arrived ${formatTime(actualArrival)}`,
      late: formatLateness(arrivalDelay + runningOverrun),
    };
  }
  // Truck hasn't actually arrived yet. Label as ETA — even if the scheduled
  // appt block notionally spans `now`, the visual bar grows toward `now` (see
  // getBarRange) to make the overdue gap obvious; promoting these to "Arrived"
  // would conflict with that.
  return { primary: `Appt. ${formatTime(truck.apptMinutes)}`, late: formatLateness(overdue) };
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
  const stayOvertime =
    truck.id === "tr-hm-ret" && HM_DISPLAY_OVERTIME !== null
      ? HM_DISPLAY_OVERTIME
      : synthStayOvertimeMinutes(truck.id);
  const actualArrival = scheduledStartMinutes + arrivalDelay;
  const planned = truck.durationMinutes;
  const minWidth = 10;
  const overrun = synthOverrunMinutes(truck.id);
  // "True" depart used to decide when the bar finally turns green. Never
  // exposed as the bar's right edge during the yellow phase — we don't yet
  // know the actual depart while the truck is being unloaded.
  const actualDepart = actualArrival + Math.max(planned + stayOvertime, minWidth) + overrun;
  const plannedDepart = actualArrival + planned;

  if (isDeparted || actualDepart <= nowMinutes) {
    return { startMin: actualArrival, widthMin: actualDepart - actualArrival };
  }
  if (actualArrival <= nowMinutes) {
    // Yellow phase: the bar's right edge sits at the truck's PLANNED slot
    // end. The current-time line slides through the bar without changing
    // its extent — we don't know the truck will depart early or late until
    // it actually does. Only exception is overrun: when the time line gets
    // past the planned end and the truck still hasn't left, the right edge
    // sticks to the time line and grows until depart.
    if (nowMinutes > plannedDepart) {
      return { startMin: actualArrival, widthMin: nowMinutes - actualArrival };
    }
    return { startMin: actualArrival, widthMin: planned };
  }
  // Not yet arrived. If the appt is already past (overdue ETA), the bar's
  // LEFT edge (its nose) rests on the current-time line and the whole bar
  // pushes right as `now` advances — "should arrive any minute now, ETA
  // keeps slipping." Once the truck actually arrives, the Arrived branch
  // above takes over and the bar snaps to actualArrival.
  if (nowMinutes > scheduledStartMinutes) {
    return { startMin: nowMinutes, widthMin: truck.durationMinutes };
  }
  return { startMin: scheduledStartMinutes, widthMin: truck.durationMinutes };
}
