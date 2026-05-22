import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import type { Assignment, BlockedSlot, Dock, Truck } from "../data/types";
import { TruckCard, type Treatment } from "./TruckCard";
import { CURRENT_TIME_MINUTES, SCHEDULE_START_MINUTES, SCHEDULE_END_MINUTES } from "../data/mock";
import { formatTime, formatTimeShort, getBarRange } from "../lib/time";
import { cn } from "../lib/cn";

const DOCK_COL_WIDTH = 92;
const HEADER_HEIGHT = 44;

const DENSITY = {
  expanded: { HOUR_WIDTH: 440, ROW_HEIGHT: 104 },
  compact: { HOUR_WIDTH: 165, ROW_HEIGHT: 40 },
} as const;

/** Extra bottom space so the last dock row clears the floating legend pill with breathing room. */
/** No extra whitespace past the last hour — chart ends at 5 AM tomorrow. */
const SCROLL_RIGHT_PADDING = 0;

export const GRID_CONSTANTS = { DOCK_COL_WIDTH, HEADER_HEIGHT, DENSITY };

export interface ScheduleGridHandle {
  /** Hit-test a viewport (clientX, clientY) point. Returns the dock + start minutes for the slot it falls into, or null. */
  hitTest: (
    clientX: number,
    clientY: number,
    extraSnapMinutes?: number[],
  ) => { dockId: string; startMinutes: number } | null;
  /** Scroll horizontally so the hour boundary before "now" sits at the left edge. */
  scrollToCurrentTime: () => void;
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
  /** Per-truck menu trigger icon. Defaults to "more" (triple-dot). */
  menuVariantByTruckId?: (truckId: string) => "more" | "info";
  /** Compact-card click-to-expand handler. */
  onExpand?: (truckId: string) => void;
  /** Inline-expanded card click-to-collapse handler (only fired on breakout-expanded cards). */
  onCollapse?: (truckId: string) => void;
  /** Mouse enters a compact card — hover-expand it. */
  onHoverExpand?: (truckId: string) => void;
  /** Mouse leaves a card — clear hover-expand (sticky click-expanded cards stay open). */
  onHoverCollapse?: (truckId: string) => void;
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
  /** True when the viewed date is entirely in the past (block creation is disallowed). */
  isPastDate?: boolean;
  /** Fired when the user attempts an action that's not allowed (e.g. block in past). */
  onBlockedActionAttempt?: (message: string) => void;
  /** Predicate — truck has already departed (or its window is past) and can't be rearranged. */
  isDepartedTruckId?: (truckId: string) => boolean;
  /** Predicate — truck has actually arrived and is currently at the dock. */
  isInProgressTruckId?: (truckId: string) => boolean;
  /** Visual treatment for appointment cards (temporary V4–V14 prototypes). */
  treatment?: Treatment;
  /** V34: enable the Typefix card layout (combined meta line, status text). */
  typefix?: boolean;
  /** V35: declutter — hide direction arrows and partner-name underlines. */
  declutter?: boolean;
  /** V37: color the late triangle + bold-late counter red. */
  redLate?: boolean;
  /** V39: swap colored left strip for a colored prism (GripVertical) icon. */
  prismIcon?: boolean;
  /** Short label for the day after the viewed date (e.g. "May 14"), shown on past-midnight hour headers. */
  nextDayLabel?: string;
  /** Viewed date (ISO). Used as the trigger for auto-scrolling on day change. */
  dateIso?: string;
  /** If set, draws a thick divider above the row at this index — used to visually
   *  separate the on-hold rows from the regular dock rows. */
  holdStartIndex?: number;
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
  treatment,
  declutter,
  prismIcon,
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
  treatment?: Treatment;
  declutter?: boolean;
  prismIcon?: boolean;
}) {
  const padY = density === "compact" ? 4 : 6;
  const left = ((startMinutes - SCHEDULE_START_MINUTES) / 60) * hourWidth;
  const width = (durationMinutes / 60) * hourWidth;
  // Blocked slots are always movable/resizable when not a draft. Previously this
  // was gated on `blockingMode`, but the prototype should let users adjust
  // existing blocks directly.
  const interactive = !draft;
  void blockingMode;
  // V20 (and V34, which inherits V20) — match the inset "little bar"
  // appointment treatment instead of the legacy outlined box.
  const useInsetBar = treatment === "v20";
  return (
    <div
      data-block
      onPointerDown={interactive ? onMoveStart : undefined}
      className={cn(
        "absolute z-10 flex justify-between text-body-md font-medium overflow-hidden",
        durationMinutes <= 15 ? "pr-0.5" : "pr-2",
        density === "expanded" ? "items-start" : "items-center",
        !declutter && "bg-line text-ink",
        useInsetBar ? (prismIcon ? "rounded-lg pl-0" : "rounded-lg pl-[13px]") : "border-2 rounded pl-2",
        !declutter && !useInsetBar && "border-[#b2b2b2]",
        draft && "opacity-80 cursor-grabbing",
        interactive && "cursor-grab active:cursor-grabbing touch-none",
      )}
      style={{
        left,
        top: dockIdx * rowHeight + padY,
        width,
        height: rowHeight - padY * 2,
        ...(declutter
          ? {
              backgroundColor: "#FFF0ED",
              color: "#B71000",
              ...(useInsetBar ? {} : { borderColor: "#B71000" }),
            }
          : {}),
      }}
    >
      {useInsetBar && !prismIcon && (
        <span
          aria-hidden
          className="absolute"
          style={{
            left: 6,
            top: 4,
            bottom: 4,
            width: 3,
            borderRadius: 2,
            backgroundColor: declutter ? "#B71000" : "#6c707a",
          }}
        />
      )}
      {useInsetBar && prismIcon && (
        <span
          aria-hidden
          className="shrink-0 self-start h-8 flex items-center justify-center"
          style={{ width: 28, color: declutter ? "#B71000" : "#6c707a" }}
        >
          <GripVertical className="size-4" strokeWidth={2.25} />
        </span>
      )}
      <span className="flex-1 min-w-0 truncate text-left">Blocked</span>
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
          <Trash2 className="size-4 text-icon" />
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
    menuVariantByTruckId,
    onExpand,
    onCollapse,
    onHoverExpand,
    onHoverCollapse,
    density = "expanded",
    onCreateBlock,
    onDeleteBlock,
    onMoveBlock,
    onResizeBlock,
    blockingMode = false,
    showCurrentTime = true,
    isPastDate = false,
    onBlockedActionAttempt,
    isDepartedTruckId,
    isInProgressTruckId,
    treatment,
    typefix,
    declutter,
    redLate,
    prismIcon,
    nextDayLabel,
    dateIso,
    holdStartIndex,
  },
  ref,
) {
  const { HOUR_WIDTH, ROW_HEIGHT: BASE_ROW_HEIGHT } = DENSITY[density];
  // Typefix removes the load-type tag line from expanded cards, so the row can
  // shrink by roughly one line + its gap.
  const ROW_HEIGHT =
    typefix && density === "expanded" ? BASE_ROW_HEIGHT - 22 : BASE_ROW_HEIGHT;
  const totalMinutes = SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES;
  const totalWidth = (totalMinutes / 60) * HOUR_WIDTH;
  const totalHeight = docks.length * ROW_HEIGHT;
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const proxyScrollbarRef = useRef<HTMLDivElement>(null);
  // Measure the scroller height so we can decide whether the bottom spacer is needed
  const [, setScrollerHeight] = useState(0);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => setScrollerHeight(el.clientHeight);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Drag-to-create blocked-time slot
  const [blockDraft, setBlockDraft] = useState<{
    dockId: string;
    anchorMin: number;
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
    // Can't add a blocked time in the past.
    if (isPastDate || (showCurrentTime && start < CURRENT_TIME_MINUTES)) {
      onBlockedActionAttempt?.("You can't block time in the past");
      return;
    }
    setBlockDraft({ dockId, anchorMin: start, startMin: start, endMin: start + 15 });
    e.preventDefault();
  };

  useEffect(() => {
    if (!blockDraft) return;
    const onMove = (e: PointerEvent) => {
      const floor = snapXToMinute(e.clientX, "floor");
      const ceil = snapXToMinute(e.clientX, "ceil");
      if (floor == null || ceil == null) return;
      setBlockDraft((d) => {
        if (!d) return d;
        const start = Math.min(d.anchorMin, floor);
        const end = Math.max(d.anchorMin + 15, ceil);
        return { ...d, startMin: start, endMin: end };
      });
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

  const scrollToCurrentTime = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const hoursSinceStart = Math.floor(
      (CURRENT_TIME_MINUTES - SCHEDULE_START_MINUTES) / 60,
    );
    scroller.scrollLeft = hoursSinceStart * HOUR_WIDTH;
  };

  // Latest assignments — read inside the date-change effect without retriggering it on every drop.
  const assignmentsRef = useRef(assignments);
  useEffect(() => {
    assignmentsRef.current = assignments;
  }, [assignments]);

  // On mount / when switching days (or zoom changes), align the left edge of the chart
  // to the hour boundary *before* a meaningful anchor:
  //   - Today: the hour before "now" (e.g. 2:15 PM → left edge lands on 2:00 PM).
  //   - Other days: the hour before the first scheduled truck's arrival.
  //   - If there are no assignments on a non-today date, fall back to the chart start.
  // Intentionally NOT depending on `assignments` — drag-drops that change
  // assignments must not yank the scroll position back to "now".
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (showCurrentTime) {
      scrollToCurrentTime();
      return;
    }
    const firstStart = assignmentsRef.current.reduce<number | null>(
      (min, a) => (min === null || a.startMinutes < min ? a.startMinutes : min),
      null,
    );
    if (firstStart === null) {
      scroller.scrollLeft = 0;
      return;
    }
    const hoursSinceStart = Math.floor(
      (firstStart - SCHEDULE_START_MINUTES) / 60,
    );
    scroller.scrollLeft = Math.max(0, hoursSinceStart) * HOUR_WIDTH;
  }, [showCurrentTime, HOUR_WIDTH, dateIso]);

  useImperativeHandle(ref, () => ({
    scrollToCurrentTime,
    hitTest(clientX, clientY, extraSnapMinutes) {
      const el = gridRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > totalWidth || y > totalHeight) return null;
      const dockIndex = Math.floor(y / ROW_HEIGHT);
      if (dockIndex < 0 || dockIndex >= docks.length) return null;
      // Snap to 15-min increments, plus any extra snap targets (e.g. a truck's
      // appointment time) that may not fall on a 15-min boundary.
      const rawMinutes = SCHEDULE_START_MINUTES + (x / HOUR_WIDTH) * 60;
      const candidates = [
        SCHEDULE_START_MINUTES + Math.round((rawMinutes - SCHEDULE_START_MINUTES) / 15) * 15,
        ...(extraSnapMinutes ?? []),
      ];
      const startMinutes = candidates.reduce((best, c) =>
        Math.abs(c - rawMinutes) < Math.abs(best - rawMinutes) ? c : best,
      );
      return { dockId: docks[dockIndex].id, startMinutes };
    },
  }));

  const hours: number[] = [];
  for (let m = SCHEDULE_START_MINUTES; m < SCHEDULE_END_MINUTES; m += 60) hours.push(m);

  return (
    <div className="px-10 flex flex-col">
      <div className="bg-white flex flex-col border border-line rounded-card overflow-hidden">
        <div
          ref={scrollerRef}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const proxy = proxyScrollbarRef.current;
            if (proxy && proxy.scrollLeft !== e.currentTarget.scrollLeft) {
              proxy.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
        >
          <div
            className="relative"
            style={{ width: DOCK_COL_WIDTH + totalWidth + SCROLL_RIGHT_PADDING }}
          >
            {/* Time header — border-b lives on the inner children so it stops at the
                chart's right edge instead of extending into the right whitespace. */}
            <div
              className="sticky top-0 z-20 flex bg-surface-hovered"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                className="sticky left-0 z-10 bg-surface-hovered border-r border-b border-line"
                style={{ width: DOCK_COL_WIDTH, minWidth: DOCK_COL_WIDTH }}
              />
              <div
                className="relative flex border-b border-line"
                style={{ width: totalWidth }}
              >
                {hours.map((m) => (
                  <div
                    key={m}
                    className="px-5 flex items-center gap-1.5 text-body-sm-strong text-ink border-r border-line whitespace-nowrap"
                    style={{ width: HOUR_WIDTH, minWidth: HOUR_WIDTH }}
                  >
                    <span>{formatTimeShort(m)}</span>
                    {m >= 24 * 60 && (
                      <span className="text-body-sm text-ink-subdued font-normal">
                        ({nextDayLabel ?? "tomorrow"})
                      </span>
                    )}
                  </div>
                ))}
                {showCurrentTime &&
                  CURRENT_TIME_MINUTES >= SCHEDULE_START_MINUTES &&
                  CURRENT_TIME_MINUTES <= SCHEDULE_END_MINUTES && (
                    <div
                      className="absolute pointer-events-none -translate-x-1/2"
                      style={{
                        left:
                          ((CURRENT_TIME_MINUTES - SCHEDULE_START_MINUTES) / 60) * HOUR_WIDTH,
                        top: HEADER_HEIGHT - 13,
                      }}
                    >
                      <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                        <path
                          d="M7 11 L1.5 2 L12.5 2 Z"
                          fill="#6b7280"
                          stroke="#6b7280"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {/* Bridge from triangle tip down through the header so the stem in the
                          grid (which sits behind the sticky header bg) appears continuous. */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-0.5"
                        style={{ top: 10, height: 6, backgroundColor: "#6b7280" }}
                      />
                    </div>
                  )}
              </div>
            </div>

            {/* Body: dock label column + grid */}
            <div className="flex">
              {/* Dock labels */}
              <div
                className="sticky left-0 z-10 bg-white border-r border-line relative"
                style={{ width: DOCK_COL_WIDTH, minWidth: DOCK_COL_WIDTH }}
              >
                {docks.map((d, i) => (
                  <div
                    key={d.id}
                    className={cn(
                      "px-3 flex items-center text-body-sm-strong text-ink whitespace-nowrap",
                      i < docks.length - 1 && "border-b border-line",
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {d.label}
                  </div>
                ))}
                {holdStartIndex != null && holdStartIndex > 0 && holdStartIndex < docks.length && (
                  <div
                    aria-hidden
                    className="absolute left-0 right-0 bg-line pointer-events-none"
                    style={{ top: holdStartIndex * ROW_HEIGHT - 2, height: 4 }}
                  />
                )}
              </div>

              {/* Schedule canvas */}
              <div
                ref={gridRef}
                onPointerDown={onGridPointerDown}
                className={cn("relative isolate", blockingMode && "cursor-crosshair")}
                style={{ width: totalWidth, height: totalHeight }}
                data-schedule-grid
              >
                {/* Background row stripes & hour grid lines */}
                {docks.map((d, i) => (
                  <div
                    key={d.id}
                    className={cn(
                      "absolute left-0 right-0",
                      i < docks.length - 1 && "border-b border-line",
                    )}
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
                {holdStartIndex != null && holdStartIndex > 0 && holdStartIndex < docks.length && (
                  <div
                    aria-hidden
                    className="absolute left-0 right-0 bg-line pointer-events-none"
                    style={{ top: holdStartIndex * ROW_HEIGHT - 2, height: 4 }}
                  />
                )}

                {/* Current-time line — inside the grid, rendered before assignments so trucks paint on top */}
                {showCurrentTime &&
                  CURRENT_TIME_MINUTES >= SCHEDULE_START_MINUTES &&
                  CURRENT_TIME_MINUTES <= SCHEDULE_END_MINUTES && (
                    <div
                      className="absolute pointer-events-none w-0.5 -translate-x-1/2"
                      style={{
                        left: ((CURRENT_TIME_MINUTES - SCHEDULE_START_MINUTES) / 60) * HOUR_WIDTH,
                        top: -3, // extend upward so the stem meets the triangle tip with no gap
                        bottom: 0,
                        backgroundColor: "#6b7280",
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
                      treatment={treatment}
                      declutter={declutter}
                      prismIcon={prismIcon}
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
                        treatment={treatment}
                        declutter={declutter}
                        prismIcon={prismIcon}
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
                        className="absolute rounded-button border-2 border-dashed border-ink bg-ink/5 pointer-events-none"
                        style={{
                          left,
                          top: dockIdx * ROW_HEIGHT + 6,
                          width,
                          height: ROW_HEIGHT - 12,
                          zIndex: 50,
                        }}
                      />
                    );
                  })()}

                {/* Assigned trucks */}
                {(() => {
                  // Build layering metadata: later start time renders on top.
                  // Ties on the same dock+startMinutes get a small x-shift so both remain visible.
                  const sorted = [...assignments].sort(
                    (a, b) => a.startMinutes - b.startMinutes,
                  );
                  const tieIndex = new Map<string, number>();
                  const meta = new Map<string, { z: number; shiftX: number }>();
                  sorted.forEach((a, i) => {
                    const key = `${a.dockId}|${a.startMinutes}`;
                    const t = tieIndex.get(key) ?? 0;
                    tieIndex.set(key, t + 1);
                    meta.set(a.truckId, { z: i + 1, shiftX: t * 5 });
                  });
                  return assignments.map((a) => {
                  const truck = trucksById[a.truckId];
                  if (!truck) return null;
                  const dockIdx = docks.findIndex((d) => d.id === a.dockId);
                  if (dockIdx < 0) return null;
                  const m = meta.get(a.truckId) ?? { z: 1, shiftX: 0 };
                  const isDragging = draggingTruckId === a.truckId;
                  const departed = isDepartedTruckId?.(a.truckId) ?? false;
                  // Align the bar with the status label: ETA → left edge, Arrived →
                  // left edge, Departed → right edge. Only the visual position
                  // changes; hit-testing / drag still uses a.startMinutes.
                  const bar = getBarRange(
                    truck,
                    a.startMinutes,
                    CURRENT_TIME_MINUTES,
                    departed,
                  );
                  const barEnd = bar.startMin + bar.widthMin;
                  const barStatus: "scheduled" | "in_progress" | "departed" = showCurrentTime
                    ? barEnd < CURRENT_TIME_MINUTES
                      ? "departed"
                      : bar.startMin >= CURRENT_TIME_MINUTES
                        ? "scheduled"
                        : "in_progress"
                    : isPastDate
                      ? "departed"
                      : "scheduled";
                  const left =
                    ((bar.startMin - SCHEDULE_START_MINUTES) / 60) * HOUR_WIDTH + m.shiftX;
                  const width = (bar.widthMin / 60) * HOUR_WIDTH;
                  const v = variantByTruckId?.(a.truckId) ?? "scheduled";
                  const source = departed
                    ? "departed"
                    : a.source === "manual"
                      ? "manual"
                      : "auto";
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
                      onMouseEnter={() => {
                        if (draggingTruckId) return;
                        onHoverExpand?.(a.truckId);
                      }}
                      onMouseLeave={() => {
                        if (draggingTruckId) return;
                        onHoverCollapse?.(a.truckId);
                      }}
                      className={cn(
                        "absolute",
                        isDragging && "opacity-40",
                        breakoutExpand && "shadow-drag rounded-button",
                        blockingMode && "opacity-40 pointer-events-none",
                        draggingTruckId && !isDragging && "pointer-events-none",
                        departed && !isDragging && "cursor-not-allowed",
                      )}
                      style={{
                        left,
                        top: dockIdx * ROW_HEIGHT + padY,
                        width: cardWidth,
                        zIndex: breakoutExpand ? 40 : m.z,
                        ...(breakoutExpand
                          ? {}
                          : { height: ROW_HEIGHT - padY * 2 }),
                      }}
                    >
                      <TruckCard
                        truck={truck}
                        variant={v}
                        source={source}
                        treatment={treatment}
                        typefix={typefix}
                        declutter={declutter}
                        redLate={redLate}
                        prismIcon={prismIcon}
                        barStatus={barStatus}
                        showMenu={showMenu}
                        menuVariant={menuVariantByTruckId?.(a.truckId) ?? "more"}
                        onMenuOpen={(rect) => onMenuOpen?.(a.truckId, rect)}
                        onExpand={() => onExpand?.(a.truckId)}
                        onCollapse={breakoutExpand ? () => onCollapse?.(a.truckId) : undefined}
                        onPointerDown={(e) => onStartDrag(a.truckId, e)}
                      />
                    </div>
                  );
                });
                })()}
              </div>
            </div>

            {/* Appointment-time guide — overlays the whole chart (above the sticky header)
                so labels and the stick aren't clipped. Rendered last so it z-stacks on top. */}
            {hoverSlot && draggingTruckId && (() => {
              const inProgress = isInProgressTruckId?.(draggingTruckId) ?? false;
              const departed = isDepartedTruckId?.(draggingTruckId) ?? false;
              const dragTruck = trucksById[draggingTruckId];
              // Arrived trucks are locked to their arrival time — the flag
              // tracks the (locked) hoverSlot. Every other status shows the
              // appointment time at a fixed position even as the card is
              // rearranged before or after that time.
              const flagMinutes = inProgress
                ? hoverSlot.startMinutes
                : dragTruck?.apptMinutes ?? hoverSlot.startMinutes;
              const guideX =
                DOCK_COL_WIDTH +
                ((flagMinutes - SCHEDULE_START_MINUTES) / 60) * HOUR_WIDTH;
              // (departed never drags, but keep the flag silent if it ever did)
              if (departed) return null;
              return (
                <>
                  {/* Solid vertical stick — starts at the top of the dock rows and runs to
                      the bottom of the chart. z-10 keeps it behind the floating legend (z-20). */}
                  <div
                    className="absolute z-10 pointer-events-none border-l-2 border-ink"
                    style={{ left: guideX, top: HEADER_HEIGHT, bottom: 0 }}
                  />
                  {/* Flag sits flush inside the header bar (no overhang above). */}
                  <div
                    className="absolute z-30 pointer-events-none -translate-x-1/2 flex flex-col items-center justify-center px-3 rounded-button bg-ink text-white whitespace-nowrap shadow-card"
                    style={{ left: guideX, top: 0, height: HEADER_HEIGHT }}
                  >
                    <span className="text-label-xs-strong uppercase tracking-wider text-white/70 leading-none">
                      {inProgress ? "Arrival time" : "Appointment time"}
                    </span>
                    <span className="text-body-md-strong leading-tight mt-0.5">
                      {formatTime(flagMinutes)}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      <div
        ref={proxyScrollbarRef}
        className="overflow-x-auto scrollbar-thin mt-2"
        style={{ marginBottom: ROW_HEIGHT * 3 }}
        onScroll={(e) => {
          const scroller = scrollerRef.current;
          if (scroller && scroller.scrollLeft !== e.currentTarget.scrollLeft) {
            scroller.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
      >
        <div style={{ width: DOCK_COL_WIDTH + totalWidth + SCROLL_RIGHT_PADDING, height: 1 }} />
      </div>
    </div>
  );
});
