import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import type { Assignment, BlockedSlot, Dock, Truck } from "../data/types";
import { TruckCard } from "./TruckCard";
import { SCHEDULE_START_MINUTES, SCHEDULE_END_MINUTES } from "../data/mock";
import { formatTime, formatTimeShort } from "../lib/time";
import { cn } from "../lib/cn";

const DOCK_COL_WIDTH = 92;
const HEADER_HEIGHT = 44;

const DENSITY = {
  expanded: { HOUR_WIDTH: 440, ROW_HEIGHT: 104 },
  compact: { HOUR_WIDTH: 165, ROW_HEIGHT: 40 },
} as const;

/** Hardcoded "now" for the prototype — 2:15 PM. */
const CURRENT_TIME_MINUTES = 14 * 60 + 15;

/** Extra bottom space so the last dock row clears the floating legend pill with breathing room. */
const SCROLL_BOTTOM_PADDING = 96; // 80 for legend area + 16px breathing room

export const GRID_CONSTANTS = { DOCK_COL_WIDTH, HEADER_HEIGHT, DENSITY };

export interface ScheduleGridHandle {
  /** Hit-test a viewport (clientX, clientY) point. Returns the dock + start minutes for the slot it falls into, or null. */
  hitTest: (clientX: number, clientY: number) => { dockId: string; startMinutes: number } | null;
}

interface Props {
  docks: Dock[];
  trucksById: Record<string, Truck>;
  assignments: Assignment[];
  blocked: BlockedSlot[];
  /** Trigger drag on an already-scheduled truck (moves it). */
  onStartDrag: (truckId: string, e: React.PointerEvent) => void;
  /** Truck currently being dragged (for ghost rendering). */
  draggingTruckId: string | null;
  /** The slot the drag pointer is currently over. */
  hoverSlot: { dockId: string; startMinutes: number } | null;
  /** When set, render assignments using this map: truckId → variant ("compact" | "scheduled"). */
  variantByTruckId?: (truckId: string) => "compact" | "scheduled";
  /** Show the ... menu on each scheduled card. */
  showMenu?: boolean;
  /** Click handler for the ... menu trigger. */
  onMenuOpen?: (truckId: string, anchor: DOMRect) => void;
  /** Compact-card click-to-expand handler. */
  onExpand?: (truckId: string) => void;
  /** Inline-expanded card click-to-collapse handler (only fired on breakout-expanded cards). */
  onCollapse?: (truckId: string) => void;
  /** Drives row/hour size. Defaults to expanded. */
  density?: "expanded" | "compact";
  /** Called when user click-and-drags on empty grid to create a blocked-time slot. */
  onCreateBlock?: (draft: { dockId: string; startMinutes: number; durationMinutes: number }) => void;
  /** Called when the trash button on a blocked slot is clicked. */
  onDeleteBlock?: (blockId: string) => void;
  /** Called when a blocked slot is dragged to a new start time (blocking mode only). */
  onMoveBlock?: (blockId: string, newStartMinutes: number) => void;
  /** Called when a blocked slot is resized via the right edge (blocking mode only). */
  onResizeBlock?: (blockId: string, newDurationMinutes: number) => void;
  /** When true, only block-time creation is allowed; trucks are inert. */
  blockingMode?: boolean;
  /** Show the current-time line + triangle. Defaults to true. */
  showCurrentTime?: boolean;
}

function BlockedCard({
  density,
  rowHeight,
  hourWidth,
  dockIdx,
  startMinutes,
  durationMinutes,
  draft,
  onDelete,
  blockingMode,
  onMoveStart,
  onResizeStart,
}: {
  density: "expanded" | "compact";
  rowHeight: number;
  hourWidth: number;
  dockIdx: number;
  startMinutes: number;
  durationMinutes: number;
  draft?: boolean;
  onDelete?: () => void;
  blockingMode?: boolean;
  onMoveStart?: (e: React.PointerEvent) => void;
  onResizeStart?: (e: React.PointerEvent) => void;
}) {
  const padY = density === "compact" ? 4 : 6;
  const left = ((startMinutes - SCHEDULE_START_MINUTES) / 60) * hourWidth;
  const width = (durationMinutes / 60) * hourWidth;
  const interactive = blockingMode && !draft;
  return (
    <div
      data-block
      onPointerDown={interactive ? onMoveStart : undefined}
      className={cn(
        "absolute z-10 bg-line border-2 border-[#b2b2b2] rounded flex items-center justify-between pl-2 pr-0.5 text-body-md font-medium text-ink overflow-hidden",
        draft && "opacity-80 cursor-grabbing",
        interactive && "cursor-grab active:cursor-grabbing touch-none",
      )}
      style={{
        left,
        top: dockIdx * rowHeight + padY,
        width,
        height: rowHeight - padY * 2,
      }}
    >
      <span className="truncate">Blocked</span>
      {!draft && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="shrink-0 size-6 grid place-items-center rounded hover:bg-black/5"
          aria-label="Delete block"
        >
          <Trash2 className="size-4 text-icon-subdued" />
        </button>
      )}
      {/* Right-edge resize handle (only in blocking mode) */}
      {interactive && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart?.(e);
          }}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center group"
          aria-label="Resize block"
        >
          <div className="h-3 w-0.5 bg-[#b2b2b2] group-hover:bg-ink rounded-full" />
        </div>
      )}
    </div>
  );
}

export const ScheduleGrid = forwardRef<ScheduleGridHandle, Props>(function ScheduleGrid(
  {
    docks,
    trucksById,
    assignments,
    blocked,
    onStartDrag,
    draggingTruckId,
    hoverSlot,
    variantByTruckId,
    showMenu,
    onMenuOpen,
    onExpand,
    onCollapse,
    density = "expanded",
    onCreateBlock,
    onDeleteBlock,
    onMoveBlock,
    onResizeBlock,
    blockingMode = false,
    showCurrentTime = true,
  },
  ref,
) {
  const { HOUR_WIDTH, ROW_HEIGHT } = DENSITY[density];
  const totalMinutes = SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES;
  const totalWidth = (totalMinutes / 60) * HOUR_WIDTH;
  const totalHeight = docks.length * ROW_HEIGHT;
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Drag-to-create blocked-time slot
  const [blockDraft, setBlockDraft] = useState<{
    dockId: string;
    startMin: number;
    endMin: number;
  } | null>(null);

  // Move/resize interaction for an existing blocked slot (blocking mode only)
  const [blockInteraction, setBlockInteraction] = useState<{
    kind: "move" | "resize";
    blockId: string;
    origStart: number;
    origDuration: number;
    pointerStartX: number;
    deltaMinutes: number;
  } | null>(null);

  const startBlockMove = (blockId: string, e: React.PointerEvent) => {
    const b = blocked.find((x) => x.id === blockId);
    if (!b) return;
    setBlockInteraction({
      kind: "move",
      blockId,
      origStart: b.startMinutes,
      origDuration: b.durationMinutes,
      pointerStartX: e.clientX,
      deltaMinutes: 0,
    });
    e.preventDefault();
  };

  const startBlockResize = (blockId: string, e: React.PointerEvent) => {
    const b = blocked.find((x) => x.id === blockId);
    if (!b) return;
    setBlockInteraction({
      kind: "resize",
      blockId,
      origStart: b.startMinutes,
      origDuration: b.durationMinutes,
      pointerStartX: e.clientX,
      deltaMinutes: 0,
    });
    e.preventDefault();
  };

  useEffect(() => {
    if (!blockInteraction) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - blockInteraction.pointerStartX;
      // Snap delta to 15-min increments
      const deltaMin = Math.round((dx / HOUR_WIDTH) * 60 / 15) * 15;
      setBlockInteraction((b) => (b ? { ...b, deltaMinutes: deltaMin } : b));
    };
    const onUp = () => {
      const b = blockInteraction;
      setBlockInteraction(null);
      if (!b || b.deltaMinutes === 0) return;
      if (b.kind === "move") {
        const newStart = Math.max(
          SCHEDULE_START_MINUTES,
          Math.min(b.origStart + b.deltaMinutes, SCHEDULE_END_MINUTES - b.origDuration),
        );
        onMoveBlock?.(b.blockId, newStart);
      } else {
        const newDuration = Math.max(15, b.origDuration + b.deltaMinutes);
        onResizeBlock?.(b.blockId, newDuration);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockInteraction, HOUR_WIDTH]);

  const snapXToMinute = (clientX: number, mode: "floor" | "ceil") => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const minutesFromStart = (x / HOUR_WIDTH) * 60;
    const snap = mode === "floor"
      ? Math.floor(minutesFromStart / 15) * 15
      : Math.ceil(minutesFromStart / 15) * 15;
    return SCHEDULE_START_MINUTES + Math.max(0, Math.min(snap, totalMinutes));
  };

  const dockAtY = (clientY: number) => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const y = clientY - rect.top;
    const idx = Math.floor(y / ROW_HEIGHT);
    if (idx < 0 || idx >= docks.length) return null;
    return docks[idx].id;
  };

  const onGridPointerDown = (e: React.PointerEvent) => {
    if (!onCreateBlock || !blockingMode) return;
    const target = e.target as HTMLElement;
    // Bail if the press lands on a truck or existing block.
    if (target.closest("[data-truck-card], [data-block]")) return;
    const dockId = dockAtY(e.clientY);
    const start = snapXToMinute(e.clientX, "floor");
    if (!dockId || start == null) return;
    setBlockDraft({ dockId, startMin: start, endMin: start + 15 });
    e.preventDefault();
  };

  useEffect(() => {
    if (!blockDraft) return;
    const onMove = (e: PointerEvent) => {
      const end = snapXToMinute(e.clientX, "ceil");
      if (end == null) return;
      setBlockDraft((d) => (d ? { ...d, endMin: Math.max(d.startMin + 15, end) } : d));
    };
    const onUp = () => {
      // Capture from closure so the side effect runs exactly once even under StrictMode.
      const d = blockDraft;
      setBlockDraft(null);
      if (d && d.endMin > d.startMin) {
        onCreateBlock?.({
          dockId: d.dockId,
          startMinutes: d.startMin,
          durationMinutes: d.endMin - d.startMin,
        });
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockDraft]);

  useImperativeHandle(ref, () => ({
    hitTest(clientX, clientY) {
      const el = gridRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > totalWidth || y > totalHeight) return null;
      const dockIndex = Math.floor(y / ROW_HEIGHT);
      if (dockIndex < 0 || dockIndex >= docks.length) return null;
      // Snap to 15-min increments
      const minutesFromStart = (x / HOUR_WIDTH) * 60;
      const snapped = Math.round(minutesFromStart / 15) * 15;
      const startMinutes = SCHEDULE_START_MINUTES + snapped;
      return { dockId: docks[dockIndex].id, startMinutes };
    },
  }));

  const hours: number[] = [];
  for (let m = SCHEDULE_START_MINUTES; m < SCHEDULE_END_MINUTES; m += 60) hours.push(m);

  return (
    <div className="px-10 flex-1 min-h-0 flex flex-col">
      <div className="border-t border-x border-line bg-white overflow-hidden flex-1 min-h-0 flex flex-col">
        <div ref={scrollerRef} className="overflow-auto scrollbar-thin flex-1 min-h-0">
          <div className="relative" style={{ width: DOCK_COL_WIDTH + totalWidth }}>
            {/* Time header */}
            <div
              className="sticky top-0 z-20 flex bg-surface-hovered border-b border-line"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                className="sticky left-0 z-10 bg-surface-hovered border-r border-line"
                style={{ width: DOCK_COL_WIDTH, minWidth: DOCK_COL_WIDTH }}
              />
              <div className="flex" style={{ width: totalWidth }}>
                {hours.map((m) => (
                  <div
                    key={m}
                    className="px-5 flex items-center text-body-sm-strong text-ink border-r border-line"
                    style={{ width: HOUR_WIDTH, minWidth: HOUR_WIDTH }}
                  >
                    {formatTimeShort(m)}
                  </div>
                ))}
              </div>
            </div>

            {/* Body: dock label column + grid */}
            <div className="flex">
              {/* Dock labels */}
              <div
                className="sticky left-0 z-10 bg-white border-r border-line"
                style={{ width: DOCK_COL_WIDTH, minWidth: DOCK_COL_WIDTH }}
              >
                {docks.map((d) => (
                  <div
                    key={d.id}
                    className="px-3 flex items-center text-body-sm-strong text-ink border-b border-line whitespace-nowrap"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {d.label}
                  </div>
                ))}
              </div>

              {/* Schedule canvas */}
              <div
                ref={gridRef}
                onPointerDown={onGridPointerDown}
                className={cn("relative", blockingMode && "cursor-crosshair")}
                style={{ width: totalWidth, height: totalHeight }}
                data-schedule-grid
              >
                {/* Background row stripes & hour grid lines */}
                {docks.map((d, i) => (
                  <div
                    key={d.id}
                    className="absolute left-0 right-0 border-b border-line"
                    style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                  />
                ))}
                {hours.map((m, i) => (
                  <div
                    key={m}
                    className="absolute top-0 bottom-0 border-r border-line"
                    style={{ left: (i + 1) * HOUR_WIDTH - 1, width: 1 }}
                  />
                ))}

                {/* Current-time line — inside the grid, rendered before assignments so trucks paint on top */}
                {showCurrentTime &&
                  CURRENT_TIME_MINUTES >= SCHEDULE_START_MINUTES &&
                  CURRENT_TIME_MINUTES <= SCHEDULE_END_MINUTES && (
                    <div
                      className="absolute pointer-events-none w-px bg-sched-blocked -translate-x-1/2"
                      style={{
                        left: ((CURRENT_TIME_MINUTES - SCHEDULE_START_MINUTES) / 60) * HOUR_WIDTH,
                        top: -1, // extend 1px upward so the triangle tip overlaps with no gap
                        bottom: 0,
                      }}
                    />
                  )}

                {/* Blocked slots */}
                {blocked.map((b) => {
                  const dockIdx = docks.findIndex((d) => d.id === b.dockId);
                  if (dockIdx < 0) return null;
                  // Live-preview the move/resize while interacting
                  let liveStart = b.startMinutes;
                  let liveDuration = b.durationMinutes;
                  if (blockInteraction && blockInteraction.blockId === b.id) {
                    if (blockInteraction.kind === "move") {
                      liveStart = Math.max(
                        SCHEDULE_START_MINUTES,
                        Math.min(
                          blockInteraction.origStart + blockInteraction.deltaMinutes,
                          SCHEDULE_END_MINUTES - blockInteraction.origDuration,
                        ),
                      );
                    } else {
                      liveDuration = Math.max(15, blockInteraction.origDuration + blockInteraction.deltaMinutes);
                    }
                  }
                  return (
                    <BlockedCard
                      key={b.id}
                      density={density}
                      rowHeight={ROW_HEIGHT}
                      hourWidth={HOUR_WIDTH}
                      dockIdx={dockIdx}
                      startMinutes={liveStart}
                      durationMinutes={liveDuration}
                      blockingMode={blockingMode}
                      onDelete={() => onDeleteBlock?.(b.id)}
                      onMoveStart={(e) => startBlockMove(b.id, e)}
                      onResizeStart={(e) => startBlockResize(b.id, e)}
                    />
                  );
                })}

                {/* Draft block being created via drag */}
                {blockDraft &&
                  (() => {
                    const dockIdx = docks.findIndex((d) => d.id === blockDraft.dockId);
                    if (dockIdx < 0) return null;
                    return (
                      <BlockedCard
                        density={density}
                        rowHeight={ROW_HEIGHT}
                        hourWidth={HOUR_WIDTH}
                        dockIdx={dockIdx}
                        startMinutes={blockDraft.startMin}
                        durationMinutes={blockDraft.endMin - blockDraft.startMin}
                        draft
                      />
                    );
                  })()}

                {/* Hover indicator */}
                {hoverSlot &&
                  (() => {
                    const dockIdx = docks.findIndex((d) => d.id === hoverSlot.dockId);
                    if (dockIdx < 0 || !draggingTruckId) return null;
                    const truck = trucksById[draggingTruckId];
                    if (!truck) return null;
                    const left =
                      ((hoverSlot.startMinutes - SCHEDULE_START_MINUTES) / 60) * HOUR_WIDTH;
                    const width = (truck.durationMinutes / 60) * HOUR_WIDTH;
                    return (
                      <div
                        className="absolute rounded-button border-2 border-dashed border-sched-manual bg-sched-manual/10 pointer-events-none"
                        style={{
                          left,
                          top: dockIdx * ROW_HEIGHT + 6,
                          width,
                          height: ROW_HEIGHT - 12,
                        }}
                      />
                    );
                  })()}

                {/* Assigned trucks */}
                {assignments.map((a) => {
                  const truck = trucksById[a.truckId];
                  if (!truck) return null;
                  const dockIdx = docks.findIndex((d) => d.id === a.dockId);
                  if (dockIdx < 0) return null;
                  const left = ((a.startMinutes - SCHEDULE_START_MINUTES) / 60) * HOUR_WIDTH;
                  const width = (truck.durationMinutes / 60) * HOUR_WIDTH;
                  const isDragging = draggingTruckId === a.truckId;
                  const v = variantByTruckId?.(a.truckId) ?? "scheduled";
                  const source = a.source === "manual" ? "manual" : "auto";
                  // When density is compact but this card is rendered as expanded, it's been
                  // inline-expanded by the user. Break out of the 40px row: dynamic height,
                  // wider min-width, z-elevated.
                  const breakoutExpand = density === "compact" && v === "scheduled";
                  // Same vertical inset in both states so the title doesn't shift on expand.
                  const padY = 4;
                  const cardWidth = breakoutExpand ? Math.max(width, 240) : width;
                  // Breakout: let content size the height; otherwise hug the row.
                  return (
                    <div
                      key={a.truckId}
                      data-truck-card
                      data-expanded-card={breakoutExpand ? "true" : undefined}
                      className={cn(
                        "absolute",
                        isDragging && "opacity-40",
                        breakoutExpand && "z-30 shadow-drag rounded-button",
                        blockingMode && "opacity-40 pointer-events-none",
                      )}
                      style={{
                        left,
                        top: dockIdx * ROW_HEIGHT + padY,
                        width: cardWidth,
                        ...(breakoutExpand
                          ? {}
                          : { height: ROW_HEIGHT - padY * 2 }),
                      }}
                    >
                      <TruckCard
                        truck={truck}
                        variant={v}
                        source={source}
                        showMenu={showMenu}
                        onMenuOpen={(rect) => onMenuOpen?.(a.truckId, rect)}
                        onExpand={() => onExpand?.(a.truckId)}
                        onCollapse={breakoutExpand ? () => onCollapse?.(a.truckId) : undefined}
                        onPointerDown={(e) => onStartDrag(a.truckId, e)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current-time triangle — sits above the time header and points down to the line.
                The line itself lives inside the grid (rendered below truck cards via DOM order). */}
            {showCurrentTime &&
              CURRENT_TIME_MINUTES >= SCHEDULE_START_MINUTES &&
              CURRENT_TIME_MINUTES <= SCHEDULE_END_MINUTES && (
                <div
                  className="absolute z-20 pointer-events-none -translate-x-1/2"
                  style={{
                    left:
                      DOCK_COL_WIDTH +
                      ((CURRENT_TIME_MINUTES - SCHEDULE_START_MINUTES) / 60) * HOUR_WIDTH,
                    top: HEADER_HEIGHT - 9,
                  }}
                >
                  <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                    <path
                      d="M7 11 L1.5 2 L12.5 2 Z"
                      fill="#949494"
                      stroke="#949494"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}

            {/* Bottom scroll spacer so the last dock + ~16px clears the floating legend */}
            <div aria-hidden style={{ height: SCROLL_BOTTOM_PADDING }} />

            {/* Appointment-time guide — overlays the whole chart (above the sticky header)
                so labels and the stick aren't clipped. Rendered last so it z-stacks on top. */}
            {hoverSlot && draggingTruckId && (() => {
              const guideX =
                DOCK_COL_WIDTH +
                ((hoverSlot.startMinutes - SCHEDULE_START_MINUTES) / 60) * HOUR_WIDTH;
              return (
                <>
                  {/* Solid vertical stick — spans below the header to the bottom of the chart */}
                  <div
                    className="absolute z-30 pointer-events-none border-l-2 border-sched-manual"
                    style={{ left: guideX, top: HEADER_HEIGHT, bottom: 0 }}
                  />
                  {/* Single flag containing both the eyebrow label and the time */}
                  <div
                    className="absolute z-30 pointer-events-none -translate-x-1/2 flex flex-col items-center px-3 py-1.5 rounded-button bg-sched-manual text-white whitespace-nowrap shadow-card"
                    style={{ left: guideX, top: 4 }}
                  >
                    <span className="text-[10px] uppercase tracking-wider text-white/70 leading-none">
                      Appointment time
                    </span>
                    <span className="text-body-md-strong leading-tight mt-0.5">
                      {formatTime(hoverSlot.startMinutes)}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
});
