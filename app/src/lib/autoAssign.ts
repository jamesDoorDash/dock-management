import type { Assignment, BlockedSlot, Dock, Truck } from "../data/types";
import { synthLateMinutes, synthStayOvertimeMinutes } from "./time";

/** Minimum gap (minutes) auto-assign tries to leave between two trucks on the same dock. */
const TURNAROUND_GAP = 30;

/**
 * Visual dock-occupancy window for a truck — the union of the scheduled span
 * (where ETA bars render) and the actual arrival→depart span (where Arrived/
 * Departed bars render). Auto-assign uses this so two trucks never end up
 * sharing a dock+timeslot regardless of which status they'll display in.
 */
export function visualOccupancy(t: Truck): [number, number] {
  const arrivalDelay = synthLateMinutes(t.id);
  const stayOvertime = synthStayOvertimeMinutes(t.id);
  const scheduledStart = t.apptMinutes;
  const scheduledEnd = t.apptMinutes + t.durationMinutes;
  const actualDepart = scheduledStart + arrivalDelay + t.durationMinutes + stayOvertime;
  return [scheduledStart, Math.max(scheduledEnd, actualDepart)];
}

/**
 * Deterministic auto-assign: place every truck on the schedule.
 *
 * Trucks are sorted by actual arrival; each picks the first dock that can fit
 * the truck's full actual occupancy (arrival → predicted depart, including
 * stay overtime) with a {@link TURNAROUND_GAP}-minute buffer. If no dock has
 * the full gap, falls back to the first dock with no hard overlap.
 */
export function autoAssignAll(
  trucks: Truck[],
  docks: Dock[],
  blocked: BlockedSlot[],
): Assignment[] {
  const sorted = [...trucks].sort((a, b) => {
    const aRange = visualOccupancy(a);
    const bRange = visualOccupancy(b);
    return aRange[0] - bRange[0] || a.apptMinutes - b.apptMinutes;
  });

  // Per-dock busy intervals. Truck-to-truck conflicts use TURNAROUND_GAP so
  // auto-placed trucks get a visual buffer; blocked slots are kept separate
  // and only block on hard overlap (a block placed flush against a truck
  // should not shove the truck).
  const truckBusy: Record<string, Array<[number, number]>> = {};
  const blockBusy: Record<string, Array<[number, number]>> = {};
  for (const d of docks) {
    truckBusy[d.id] = [];
    blockBusy[d.id] = [];
  }
  for (const b of blocked) {
    blockBusy[b.dockId]?.push([b.startMinutes, b.startMinutes + b.durationMinutes]);
  }

  const result: Assignment[] = [];
  for (const t of sorted) {
    const want = visualOccupancy(t);
    const blockedOk = (d: Dock) => !conflicts(blockBusy[d.id], want, 0);
    // Prefer a dock that leaves the full turnaround gap from other trucks.
    let dock = docks.find(
      (d) => blockedOk(d) && !conflicts(truckBusy[d.id], want, TURNAROUND_GAP),
    );
    // Fall back to any dock with no hard truck overlap if no clean dock exists.
    if (!dock) dock = docks.find((d) => blockedOk(d) && !conflicts(truckBusy[d.id], want, 0));
    if (!dock) continue;
    truckBusy[dock.id].push(want);
    result.push({
      truckId: t.id,
      dockId: dock.id,
      startMinutes: t.apptMinutes,
      source: "auto",
    });
  }
  return result;
}

function conflicts(
  intervals: Array<[number, number]>,
  want: [number, number],
  gap: number,
): boolean {
  return intervals.some(([s, e]) => want[0] < e + gap && want[1] > s - gap);
}
