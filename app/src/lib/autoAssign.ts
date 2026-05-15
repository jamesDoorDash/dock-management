import type { Assignment, BlockedSlot, Dock, Truck } from "../data/types";

/** Minimum gap (minutes) auto-assign tries to leave between two trucks on the same dock. */
const TURNAROUND_GAP = 30;

/**
 * Deterministic auto-assign: place every truck on the schedule.
 *
 * Trucks are sorted by appointment time; each picks the first dock that can fit it
 * with a {@link TURNAROUND_GAP}-minute turnaround between trucks. If no dock has the
 * full gap, falls back to the first dock with no hard overlap so the truck still lands.
 */
export function autoAssignAll(
  trucks: Truck[],
  docks: Dock[],
  blocked: BlockedSlot[],
): Assignment[] {
  const sorted = [...trucks].sort((a, b) => a.apptMinutes - b.apptMinutes);

  // Track busy intervals per dock: [start, end][]
  const busy: Record<string, Array<[number, number]>> = {};
  for (const d of docks) busy[d.id] = [];
  for (const b of blocked) {
    busy[b.dockId]?.push([b.startMinutes, b.startMinutes + b.durationMinutes]);
  }

  const result: Assignment[] = [];
  for (const t of sorted) {
    const want: [number, number] = [t.apptMinutes, t.apptMinutes + t.durationMinutes];
    // Prefer a dock that leaves the full turnaround gap on either side.
    let dock = docks.find((d) => !conflicts(busy[d.id], want, TURNAROUND_GAP));
    // Fall back to any dock with no hard overlap if no clean dock exists.
    if (!dock) dock = docks.find((d) => !conflicts(busy[d.id], want, 0));
    if (!dock) continue;
    busy[dock.id].push(want);
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
