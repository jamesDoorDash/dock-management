import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { RotateCw, Info } from "lucide-react";

function PrismPauseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M4 4V20H8V4H4ZM16 4V20H20V4H16ZM10 20C10 21.1046 9.10457 22 8 22H4C2.89543 22 2 21.1046 2 20V4C2 2.89543 2.89543 2 4 2H8C9.10457 2 10 2.89543 10 4V20ZM22 20C22 21.1046 21.1046 22 20 22H16C14.8954 22 14 21.1046 14 20V4C14 2.89543 14.8954 2 16 2H20C21.1046 2 22 2.89543 22 4V20Z" />
    </svg>
  );
}

function PrismCloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M18.7929 3.79289C19.1834 3.40237 19.8164 3.40237 20.207 3.79289C20.5974 4.18342 20.5975 4.81646 20.207 5.20696L13.414 12L20.207 18.7929C20.5974 19.1834 20.5975 19.8165 20.207 20.207C19.8165 20.5975 19.1834 20.5974 18.7929 20.207L12 13.414L5.20696 20.207C4.81646 20.5975 4.18342 20.5974 3.79289 20.207C3.40237 19.8164 3.40237 19.1834 3.79289 18.7929L10.5859 12L3.79289 5.20696C3.40237 4.81643 3.40237 4.18342 3.79289 3.79289C4.18342 3.40237 4.81643 3.40237 5.20696 3.79289L12 10.5859L18.7929 3.79289Z" />
    </svg>
  );
}
import { PageHeaderV2 } from "../components/PageHeaderV2";
import { ScheduleGrid, type ScheduleGridHandle } from "../components/ScheduleGrid";
import { TruckCard, STATUS_COLORS, type Treatment } from "../components/TruckCard";
import {
  AssignmentPanel,
  HOLD_DOCK_ID,
  UNASSIGNED_DOCK_ID,
} from "../components/AssignmentPanel";
import { PopoverMenu } from "../components/PopoverMenu";
import { DockSettingsModal } from "../components/DockSettingsModal";
import { TruckDetailSheet } from "../components/TruckDetailSheet";
import { ErrorModal } from "../components/ErrorModal";
import { BLOCKED_SLOTS, CURRENT_TIME_MINUTES, DOCKS, FACILITY, TODAY_ISO, TRUCKS, setCurrentTimeMinutes } from "../data/mock";
import type { Assignment, BlockedSlot, Dock, Truck } from "../data/types";
import { autoAssignAll } from "../lib/autoAssign";
import { getBarRange, synthLateMinutes, synthStayOvertimeMinutes, setHmOvertimeOverride, setAllpackOvertimeOverride } from "../lib/time";
import { cn } from "../lib/cn";

type DragState =
  | { kind: "idle" }
  | {
      kind: "pending";
      truckId: string;
      startX: number;
      startY: number;
      offsetX: number;
      offsetY: number;
      width: number;
      height: number;
      fromAssignment: Assignment;
    }
  | {
      kind: "active";
      truckId: string;
      x: number;
      y: number;
      offsetX: number;
      offsetY: number;
      width: number;
      height: number;
      fromAssignment: Assignment;
    };

const DRAG_THRESHOLD = 5; // pixels
// Shift the dashed drop indicator a constant up-and-left from the floating
// card's top-left corner — independent of where the user grabbed the card —
// so the indicator always peeks out in the same spot relative to the card.
const DRAG_INDICATOR_OFFSET_X = 12; // pixels — left of card's left edge
const DRAG_INDICATOR_OFFSET_Y = 16; // pixels — above card's top edge

export function DockManagementV3({
  treatment,
  typefix = false,
  declutter = false,
  legendAttached = false,
  redLate = false,
  autoReassignLabel = false,
  prismIcon = false,
  figmaCard = false,
}: { treatment?: Treatment; typefix?: boolean; declutter?: boolean; legendAttached?: boolean; redLate?: boolean; autoReassignLabel?: boolean; prismIcon?: boolean; figmaCard?: boolean } = {}) {
  const [dateIso, setDateIso] = useState<string>(TODAY_ISO);
  const [zoom, setZoom] = useState<"compact" | "expanded">("compact");
  const [blockingMode, setBlockingMode] = useState(false);
  const [dockSettingsOpen, setDockSettingsOpen] = useState(false);
  const [dockSettingsInitialTab, setDockSettingsInitialTab] = useState<"manage" | "priority" | "schedule">("manage");
  const [docks, setDocks] = useState<Dock[]>(DOCKS);
  const [priorityOrder, setPriorityOrder] = useState<string[]>(() => DOCKS.map((d) => d.id));
  /** Ordered list of on-hold row IDs. The last entry is always the empty "On hold" drop target.
   *  Pre-V40 only — V40 replaces this with the side-panel `panelHold` list. */
  const [holdSlotIds, setHoldSlotIds] = useState<string[]>(["hold-1"]);
  /** V40: ordered list of truck IDs in the right-side On hold panel. */
  const [panelHold, setPanelHold] = useState<string[]>([]);
  /** V40: ordered list of truck IDs in the right-side Unassigned panel. */
  const [panelUnassigned, setPanelUnassigned] = useState<string[]>([]);
  /** V40: drop zone the pointer is currently over while dragging — drives the highlight. */
  const [panelHoverZone, setPanelHoverZone] = useState<"hold" | "unassigned" | null>(null);
  /** V40: zone the current drag originated from, if it started in the panel. */
  const [panelDragOrigin, setPanelDragOrigin] = useState<"hold" | "unassigned" | null>(null);
  const [receivingHours, setReceivingHours] = useState(FACILITY.receivingHours);
  const [shippingHours, setShippingHours] = useState(FACILITY.shippingHours);
  const [blocked, setBlocked] = useState<BlockedSlot[]>(figmaCard ? [] : BLOCKED_SLOTS);
  /** Manual overrides keyed by truckId. These override the auto-assigned slot for that truck. */
  const [manualOverrides, setManualOverrides] = useState<Record<string, Assignment>>({});
  /** Cards the user clicked to inline-expand from compact mode (sticky until outside click). */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  /** Card currently expanded by hover (non-sticky; clears on mouse leave). */
  const [hoverExpandedId, setHoverExpandedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });
  /** Horizontal center (in viewport px) of the schedule plot — used to center the floating legend
   *  on the table instead of the full screen when a sidebar shifts the viewport center. */
  const plotAreaRef = useRef<HTMLDivElement>(null);
  const [plotCenterX, setPlotCenterX] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = plotAreaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPlotCenterX(rect.left + rect.width / 2);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const [hoverSlot, setHoverSlot] = useState<{ dockId: string; startMinutes: number } | null>(null);
  // Demo flow advanced by pressing "W". Resets to 0 on hard refresh.
  const [demoStep, setDemoStep] = useState(0);
  // Alternate flow advanced by pressing "E". Same story but auto-pushes the
  // scheduled truck before any collision can happen — no modal, no user input.
  const [demoStepE, setDemoStepE] = useState(0);
  const [demoCollisionModalOpen, setDemoCollisionModalOpen] = useState(false);
  // null = no choice yet, "confirm" = displaced, "cancel" = left overlapping.
  const [demoCollisionChoice, setDemoCollisionChoice] = useState<null | "confirm" | "cancel">(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "w" || e.key === "W") setDemoStep((s) => s + 1);
      else if (e.key === "e" || e.key === "E") setDemoStepE((s) => s + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Effective step = whichever demo flow has progressed further. W and E share
  // most frames; E diverges at step 4 by auto-displacing ORD-7 instead of
  // letting the W flow reach a step-5 collision modal.
  const effectiveStep = Math.max(demoStep, demoStepE);
  // Apply during render so dependent reads of CURRENT_TIME_MINUTES see the new value this pass.
  setCurrentTimeMinutes(
    effectiveStep >= 6
      ? 15 * 60 + 30
      : effectiveStep >= 5
        ? 15 * 60 + 25
        : effectiveStep >= 4
          ? 15 * 60 + 20
          : effectiveStep >= 3
            ? 15 * 60 + 15
            : effectiveStep >= 2
              ? 14 * 60 + 50
              : 14 * 60 + 15,
  );
  // HM grows ~10% past its appointment starting at frame 2 (overtime while
  // it's still checked in), and stays that wider size through frame 3.
  setHmOvertimeOverride(effectiveStep >= 2 ? 3 : 0);
  // Allpack stays overtime past frame 3 — bar's right edge follows the time line.
  setAllpackOvertimeOverride(
    effectiveStep >= 6 ? 15 : effectiveStep >= 5 ? 10 : effectiveStep >= 4 ? 5 : 0,
  );
  useEffect(() => {
    const anyStarted = demoStep >= 1 || demoStepE >= 1;
    if (anyStarted) {
      setManualOverrides((prev) => {
        // E auto-displaces ORD-7 at step 4 (silent, no modal). W requires the
        // user to acknowledge the step-5 collision modal first.
        const wDisplaces = demoStep >= 5 && demoCollisionChoice === "confirm";
        const eDisplaces = demoStepE >= 4;
        const desiredOrdDock = wDisplaces || eDisplaces ? "dock-6" : "dock-5";
        if (prev["tr-ord7-in"]?.dockId === desiredOrdDock) return prev;
        return {
          ...prev,
          "tr-ord7-in": { truckId: "tr-ord7-in", dockId: desiredOrdDock, startMinutes: 15 * 60 + 25, source: "manual" },
        };
      });
    }
    if (demoStep === 5 && demoCollisionChoice === null) {
      setDemoCollisionModalOpen(true);
    }
  }, [demoStep, demoStepE, demoCollisionChoice]);
  const [menu, setMenu] = useState<{ truckId: string; anchor: DOMRect } | null>(null);
  const [detailTruckId, setDetailTruckId] = useState<string | null>(null);
  /** Set when a drop on an in-progress truck needs user confirmation before applying.
   *  `mode: "reset"` reuses the same modal for "Reset to recommended" so an
   *  in-progress truck can't be reassigned without confirmation. */
  const [pendingMove, setPendingMove] = useState<
    | { truckId: string; fromDockId: string; toDockId: string; mode?: "move" | "reset" }
    | null
  >(null);
  /** Set when the drop position collides with another scheduled truck. */
  const [pendingCollision, setPendingCollision] = useState<
    | {
        truckId: string;
        toDockId: string;
        colliderTruckId: string;
        /** Snapshot of assignments before the preview move, so Cancel can restore. */
        previousAssignments: Assignment[];
      }
    | null
  >(null);
  /** Set when a new blocked-time slot intersects with a scheduled truck. */
  const [pendingBlock, setPendingBlock] = useState<
    | {
        draft: { dockId: string; startMinutes: number; durationMinutes: number };
        colliderTruckId: string;
        /** Id of the preview block rendered while the modal is open. */
        previewBlockId: string;
      }
    | null
  >(null);
  /** Shown when the user drops an in-progress truck somewhere it can't go (panel hold/unassigned, or an on-hold dock slot) — acknowledgement only. */
  const [inProgressHoldError, setInProgressHoldError] = useState<
    | { truckId: string; zone: "hold" | "unassigned" }
    | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const gridRef = useRef<ScheduleGridHandle>(null);
  const trucksById = useMemo<Record<string, Truck>>(
    () => Object.fromEntries(TRUCKS.map((t) => [t.id, t])),
    [],
  );

  // Trucks visible on the schedule for the current viewing date
  const trucksForDate = useMemo(() => TRUCKS.filter((t) => t.dateIso === dateIso), [dateIso]);
  // V40: trucks in the side panel (on hold or unassigned) are excluded from auto-assign;
  // they only live in the panel until dragged onto the grid.
  const panelTruckIds = useMemo(
    () => new Set<string>(figmaCard ? [...panelHold, ...panelUnassigned] : []),
    [figmaCard, panelHold, panelUnassigned],
  );
  const trucksForAutoAssign = useMemo(
    () => trucksForDate.filter((t) => !panelTruckIds.has(t.id)),
    [trucksForDate, panelTruckIds],
  );
  // Display order — schedule left column matches the canonical dock order from Manage docks
  const activeDocks = useMemo(() => docks.filter((d) => d.active), [docks]);
  // Virtual "On hold" rows rendered below the real docks. The last slot is the
  // always-empty drop target labeled "On hold"; the rest are numbered "On hold N".
  // V40 replaces this with the side panel — no bottom hold rows.
  const holdDocks = useMemo<Dock[]>(
    () =>
      figmaCard
        ? []
        : holdSlotIds.map((id, i) => ({
            id,
            label: holdSlotIds.length === 1 ? "On hold" : `On hold ${i + 1}`,
            uuid: id,
            active: true,
          })),
    [figmaCard, holdSlotIds],
  );
  // Docks + hold rows together — what the schedule grid actually renders.
  const displayDocks = useMemo(() => [...activeDocks, ...holdDocks], [activeDocks, holdDocks]);
  const holdEmptyId = holdSlotIds[holdSlotIds.length - 1];
  // Auto-assign uses priority order to pick the first available dock — drives WHICH dock a truck lands in
  const priorityActiveDocks = useMemo(() => {
    const byId = new Map(activeDocks.map((d) => [d.id, d]));
    const inOrder = priorityOrder
      .map((id) => byId.get(id))
      .filter((d): d is Dock => !!d);
    const extras = activeDocks.filter((d) => !priorityOrder.includes(d.id));
    return [...inOrder, ...extras];
  }, [activeDocks, priorityOrder]);
  // Auto-assignment layout for the current date — recomputed when date or blocked slots change.
  // Preview blocks (awaiting user confirmation) are excluded so the colliding truck stays put
  // and the intersection stays visible until the user confirms.
  const committedBlocked = useMemo(
    () => blocked.filter((b) => !b.id.startsWith("blk-preview-")),
    [blocked],
  );
  const autoForDate = useMemo(
    () => autoAssignAll(trucksForAutoAssign, priorityActiveDocks, committedBlocked),
    [trucksForAutoAssign, priorityActiveDocks, committedBlocked],
  );
  const autoById = useMemo(
    () => Object.fromEntries(autoForDate.map((a) => [a.truckId, a])) as Record<string, Assignment>,
    [autoForDate],
  );

  // Combine auto-assignments with any manual overrides for visible trucks
  const assignments = useMemo<Assignment[]>(
    () =>
      autoForDate.map((a) =>
        manualOverrides[a.truckId] ? manualOverrides[a.truckId] : a,
      ),
    [autoForDate, manualOverrides],
  );
  /**
   * "In progress" = truck has actually arrived (per the synth model) and is
   * being loaded/unloaded right now. Overdue ETAs (appt is past but the truck
   * still hasn't shown) are NOT in-progress — they're just late showing up.
   */
  const isTruckInProgress = useCallback(
    (truckId: string) => {
      const t = trucksById[truckId];
      if (!t) return false;
      if (t.status === "departed") return false;
      if (t.dateIso !== TODAY_ISO) return false;
      const a = assignments.find((x) => x.truckId === truckId);
      const start = a?.startMinutes ?? t.apptMinutes;
      const arrivalDelay = synthLateMinutes(truckId);
      const stayOvertime = synthStayOvertimeMinutes(truckId);
      const actualArrival = start + arrivalDelay;
      const actualDepart = actualArrival + t.durationMinutes + stayOvertime;
      // Strict less-than on arrival: a truck whose actualArrival is exactly the
      // current time line (e.g. allpack at frame 0) hasn't *actually* arrived
      // yet — it's still scheduled/overdue and remains movable.
      return actualArrival < CURRENT_TIME_MINUTES && CURRENT_TIME_MINUTES < actualDepart;
    },
    [trucksById, assignments],
  );

  /**
   * Time to lock a card to when it's dragged. For an arrived truck this is
   * its actual arrival time (so the card visually stays at the moment the
   * truck got there); for any other status, the scheduled appointment time.
   */
  const lockedStartFor = useCallback(
    (truckId: string) => {
      const t = trucksById[truckId];
      if (!t) return 0;
      if (isTruckInProgress(truckId)) {
        return t.apptMinutes + synthLateMinutes(truckId);
      }
      // Overdue ETA — bar nose visually rests on the current-time line, so
      // lock the drop position there too (instead of the past appt time).
      if (
        t.dateIso === TODAY_ISO &&
        t.status !== "departed" &&
        t.apptMinutes < CURRENT_TIME_MINUTES
      ) {
        return CURRENT_TIME_MINUTES;
      }
      return t.apptMinutes;
    },
    [trucksById, isTruckInProgress],
  );

  const isTruckDeparted = useCallback(
    (truckId: string) => {
      const t = trucksById[truckId];
      if (!t) return false;
      if (t.status === "departed") return true;
      if (t.dateIso < TODAY_ISO) return true;
      if (t.dateIso === TODAY_ISO) {
        const a = assignments.find((x) => x.truckId === truckId);
        const start = a?.startMinutes ?? t.apptMinutes;
        // Depart status uses ACTUAL depart (arrival delay + stay overtime),
        // not scheduled depart — otherwise a truck still being unloaded after
        // its scheduled slot would be misclassified as departed and its bar
        // would visually cross the current-time line.
        const actualDepart =
          start + synthLateMinutes(truckId) + t.durationMinutes + synthStayOvertimeMinutes(truckId);
        return actualDepart <= CURRENT_TIME_MINUTES;
      }
      return false;
    },
    [trucksById, assignments],
  );

  // Helper that mirrors the old setAssignments API on the same shape
  const setAssignments = useCallback(
    (updater: Assignment[] | ((prev: Assignment[]) => Assignment[])) => {
      const next = typeof updater === "function" ? updater(assignments) : updater;
      // Reconcile: any truckId whose assignment differs from auto becomes/stays a manual override.
      setManualOverrides((prev) => {
        const out: Record<string, Assignment> = { ...prev };
        const nextById = new Map(next.map((a) => [a.truckId, a]));
        // Trucks present in next + different from auto → manual
        for (const [truckId, a] of nextById) {
          const auto = autoById[truckId];
          if (!auto || auto.dockId !== a.dockId || auto.startMinutes !== a.startMinutes) {
            out[truckId] = { ...a, source: "manual" };
          } else {
            delete out[truckId];
          }
        }
        // Any previously-manual truck dropped from next → clear its override
        for (const truckId of Object.keys(prev)) {
          if (!nextById.has(truckId)) delete out[truckId];
        }
        return out;
      });
    },
    [assignments, autoById],
  );

  // Reset inline-expanded set when global zoom changes
  useEffect(() => setExpandedIds(new Set()), [zoom]);

  // V40 easter egg: clicking "Returns" in the sidebar bulk-moves every truck on
  // the current schedule into the Unassigned panel so the panel can be exercised.
  useEffect(() => {
    if (!figmaCard) return;
    const onUnassignAll = () => {
      // Skip departed (they can't be moved) and in-progress (panel can't hold a
      // truck that's currently being loaded/unloaded).
      const ids = trucksForDate
        .filter((t) => !isTruckDeparted(t.id) && !isTruckInProgress(t.id))
        .map((t) => t.id);
      setPanelHold([]);
      setPanelUnassigned(ids);
      setManualOverrides({});
    };
    window.addEventListener("v40:unassign-all", onUnassignAll);
    return () => window.removeEventListener("v40:unassign-all", onUnassignAll);
  }, [figmaCard, trucksForDate, isTruckDeparted, isTruckInProgress]);

  // Compact on-hold rows: drop any empty hold slot that isn't the trailing
  // drop target so numbering stays contiguous.
  useEffect(() => {
    setHoldSlotIds((prev) => {
      if (prev.length <= 1) return prev;
      const used = new Set(
        assignments
          .map((a) => a.dockId)
          .filter((id) => prev.includes(id)),
      );
      const trailing = prev[prev.length - 1];
      const next = prev.filter((id, i) => i === prev.length - 1 || used.has(id));
      if (next.length === prev.length) return prev;
      // Guarantee the trailing empty drop target is preserved.
      if (next[next.length - 1] !== trailing) next.push(trailing);
      return next;
    });
  }, [assignments]);

  // Defensive: onMouseLeave can be missed when the pointer flies out of the
  // window or onto an overlay. Once a card is hover-expanded, watch the
  // document and clear hover state if the cursor isn't actually over a card.
  useEffect(() => {
    if (!hoverExpandedId) return;
    const clear = () => setHoverExpandedId(null);
    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
      if (!el?.closest("[data-truck-card]")) clear();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", clear);
    window.addEventListener("blur", clear);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", clear);
      window.removeEventListener("blur", clear);
    };
  }, [hoverExpandedId]);

  // Click outside any inline-expanded card collapses them all
  useEffect(() => {
    if (zoom !== "compact" || expandedIds.size === 0) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t?.closest('[data-expanded-card="true"]')) return; // click inside an expanded card
      if (t?.closest('[role="menu"]')) return; // popover menu
      setExpandedIds(new Set());
    };
    // Defer one tick so the click that opened it doesn't immediately close it
    const id = setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onDown);
    };
  }, [zoom, expandedIds]);

  const variantByTruckId = useCallback(
    (truckId: string): "compact" | "scheduled" => {
      if (zoom === "expanded") return "scheduled";
      if (expandedIds.has(truckId) || hoverExpandedId === truckId) return "scheduled";
      return "compact";
    },
    [zoom, expandedIds, hoverExpandedId],
  );

  // V40: lookup ordered Truck[] for each panel section.
  const holdTrucks = useMemo<Truck[]>(
    () => panelHold.map((id) => trucksById[id]).filter((t): t is Truck => !!t),
    [panelHold, trucksById],
  );
  const unassignedTrucks = useMemo<Truck[]>(
    () =>
      panelUnassigned
        .map((id) => trucksById[id])
        .filter((t): t is Truck => !!t)
        // Unassigned is always ordered by appointment time — there's no notion
        // of priority within it (unlike on hold), so dispatchers see the next
        // truck to deal with at the top.
        .sort((a, b) => a.apptMinutes - b.apptMinutes),
    [panelUnassigned, trucksById],
  );

  const startDrag = useCallback(
    (truckId: string, e: React.PointerEvent) => {
      // Don't initiate drag from the ... menu button — that's a click-only target.
      const target = e.target as HTMLElement;
      if (target.closest('button[aria-label="More options"], button[aria-label="Additional info"]')) return;

      const cardEl = (e.currentTarget as HTMLElement).closest(".group") as HTMLElement | null;
      const rect = (cardEl ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
      const fromAssignment = assignments.find((a) => a.truckId === truckId);
      if (!fromAssignment) return;
      if (isTruckDeparted(truckId)) {
        showToast("This truck has already departed and can't be rearranged");
        return;
      }
      // Clear any panel-origin marker; this drag came from the grid.
      setPanelDragOrigin(null);
      // Start in 'pending' — we don't commit to a drag until pointer moves past threshold.
      // This lets simple clicks (e.g. on the underline to expand) still work.
      setDrag({
        kind: "pending",
        truckId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        fromAssignment,
      });
    },
    [assignments, isTruckDeparted, showToast],
  );

  /** V40: start a drag for a truck originating in the right-side AssignmentPanel.
   *  Panel trucks don't have a real Assignment, so we synthesize one with a sentinel
   *  dockId so the drop-handler can recognize the origin and clean up the list. */
  const startPanelDrag = useCallback(
    (truckId: string, zone: "hold" | "unassigned", e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button[aria-label="More options"], button[aria-label="Additional info"]')) return;
      const cardEl = (e.currentTarget as HTMLElement).closest("[data-panel-truck-id]") as HTMLElement | null;
      const rect = (cardEl ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
      const truck = trucksById[truckId];
      if (!truck) return;
      setPanelDragOrigin(zone);
      setDrag({
        kind: "pending",
        truckId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        fromAssignment: {
          truckId,
          dockId: zone === "hold" ? HOLD_DOCK_ID : UNASSIGNED_DOCK_ID,
          startMinutes: truck.apptMinutes,
          source: "manual",
        },
      });
    },
    [trucksById],
  );

  const applyMove = useCallback(
    (truckId: string, toDockId: string, startMinutes?: number) => {
      const truck = trucksById[truckId];
      if (!truck) return;
      // Dropping into the trailing empty hold slot "consumes" it — it stays
      // with the same id (now occupied) and we append a new empty slot below.
      if (toDockId === holdEmptyId) {
        setHoldSlotIds((prev) => [...prev, `hold-${prev.length + 1}`]);
      }
      // For arrived trucks the start is locked to the scheduled appt time and
      // getBarRange shifts the visual bar to actualArrival. For non-arrived
      // trucks the caller may pass a cursor-driven start time so the card can
      // be placed before or after its appointment.
      const resolvedStart = startMinutes ?? truck.apptMinutes;
      setAssignments((prev) => {
        const without = prev.filter((a) => a.truckId !== truckId);
        return [
          ...without,
          { truckId, dockId: toDockId, startMinutes: resolvedStart, source: "manual" },
        ];
      });
    },
    [trucksById, setAssignments, holdEmptyId],
  );

  /**
   * Returns the truckId of an existing assignment on `toDockId` whose visual
   * range collides with the dragged truck, or null if there's no collision.
   */
  const findCollider = useCallback(
    (truckId: string, toDockId: string, startMinutes?: number): string | null => {
      const truck = trucksById[truckId];
      if (!truck) return null;
      // Compare actually-rendered bar footprints, not visualOccupancy's union
      // of scheduled+actual spans. A future-ETA truck with synth stay-overtime
      // would otherwise report a tail past its visible bar end and cause a
      // false collision when dropping another truck flush behind it.
      const aBar = getBarRange(truck, startMinutes ?? truck.apptMinutes, CURRENT_TIME_MINUTES);
      const aStart = aBar.startMin;
      const aEnd = aBar.startMin + aBar.widthMin;
      for (const a of assignments) {
        if (a.truckId === truckId) continue;
        if (a.dockId !== toDockId) continue;
        const other = trucksById[a.truckId];
        if (!other) continue;
        // Departed trucks have freed the dock — their bar is gone, so they
        // shouldn't trigger a "dock already has a truck" collision.
        if (isTruckDeparted(a.truckId)) continue;
        const bBar = getBarRange(other, a.startMinutes, CURRENT_TIME_MINUTES);
        const bStart = bBar.startMin;
        const bEnd = bBar.startMin + bBar.widthMin;
        if (aStart < bEnd && aEnd > bStart) return a.truckId;
      }
      return null;
    },
    [trucksById, assignments, isTruckDeparted],
  );

  /** Find the first active dock (excluding `excludeDockId`) where `truckId`'s
   *  visual range doesn't collide with any current assignment or blocked slot. */
  const findOpenDockForTruck = useCallback(
    (truckId: string, excludeDockId: string): string | null => {
      const truck = trucksById[truckId];
      if (!truck) return null;
      const aBar = getBarRange(truck, truck.apptMinutes, CURRENT_TIME_MINUTES);
      const start = aBar.startMin;
      const end = aBar.startMin + aBar.widthMin;
      const overlaps = (s: number, e: number) => start < e && end > s;
      for (const d of priorityActiveDocks) {
        if (d.id === excludeDockId) continue;
        const dockBusy =
          assignments.some((a) => {
            if (a.truckId === truckId) return false;
            if (a.dockId !== d.id) return false;
            const other = trucksById[a.truckId];
            if (!other) return false;
            if (isTruckDeparted(a.truckId)) return false;
            const bBar = getBarRange(other, a.startMinutes, CURRENT_TIME_MINUTES);
            return overlaps(bBar.startMin, bBar.startMin + bBar.widthMin);
          }) ||
          blocked.some(
            (b) => b.dockId === d.id && overlaps(b.startMinutes, b.startMinutes + b.durationMinutes),
          );
        if (!dockBusy) return d.id;
      }
      return null;
    },
    [trucksById, assignments, priorityActiveDocks, blocked, isTruckDeparted],
  );

  /** Apply a move and, if a collider was identified, relocate that truck. */
  const applyMoveWithDisplacement = useCallback(
    (truckId: string, toDockId: string, colliderTruckId: string) => {
      const truck = trucksById[truckId];
      if (!truck) return;
      const colliderTruck = trucksById[colliderTruckId];
      const newDockForCollider = findOpenDockForTruck(colliderTruckId, toDockId);
      setAssignments((prev) => {
        const without = prev.filter(
          (a) => a.truckId !== truckId && a.truckId !== colliderTruckId,
        );
        const next: Assignment[] = [
          ...without,
          { truckId, dockId: toDockId, startMinutes: truck.apptMinutes, source: "manual" },
        ];
        if (colliderTruck && newDockForCollider) {
          next.push({
            truckId: colliderTruckId,
            dockId: newDockForCollider,
            startMinutes: colliderTruck.apptMinutes,
            source: "manual",
          });
        }
        return next;
      });
    },
    [trucksById, setAssignments, findOpenDockForTruck],
  );

  /** V40: figure out which panel drop-zone (if any) is under the pointer. */
  const panelZoneAt = useCallback((clientX: number, clientY: number): "hold" | "unassigned" | null => {
    if (!figmaCard) return null;
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      const zone = (el as HTMLElement).getAttribute?.("data-drop-zone");
      if (zone === "hold" || zone === "unassigned") return zone;
    }
    return null;
  }, [figmaCard]);

  useEffect(() => {
    if (drag.kind === "idle") return;

    const onMove = (e: PointerEvent) => {
      setDrag((d) => {
        if (d.kind === "pending") {
          const dx = e.clientX - d.startX;
          const dy = e.clientY - d.startY;
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return d;
          // Cross threshold — activate the drag.
          document.body.classList.add("dragging");
          return {
            kind: "active",
            truckId: d.truckId,
            x: e.clientX,
            y: e.clientY,
            offsetX: d.offsetX,
            offsetY: d.offsetY,
            width: d.width,
            height: d.height,
            fromAssignment: d.fromAssignment,
          };
        }
        if (d.kind === "active") {
          return { ...d, x: e.clientX, y: e.clientY };
        }
        return d;
      });
      // Update hover slot whenever the drag is (or is about to be) active.
      // Handles the threshold-crossing pointermove where the captured `drag` is still "pending".
      const truck = trucksById[drag.truckId];
      const justActivated =
        drag.kind === "pending" &&
        Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) >= DRAG_THRESHOLD;
      // V40: the moment a panel-originated drag lifts off, scroll the chart
      // so the truck's appointment time is in view (no-op if already visible).
      if (justActivated && panelDragOrigin && truck) {
        gridRef.current?.scrollAppointmentIntoView(
          truck.apptMinutes,
          figmaCard ? 282 : 0,
        );
      }
      const pastThreshold =
        drag.kind === "active" || justActivated;
      if (pastThreshold && truck) {
        // V40: panel-zone hover takes precedence over grid hit-test.
        const zone = panelZoneAt(e.clientX, e.clientY);
        setPanelHoverZone(zone);
        // Live-reorder within the on-hold list — mutate panelHold during the
        // drag (same technique as the priority-list reorder). Items outside
        // the dragging one have CSS transitions on transform, so they slide
        // smoothly into their new slots.
        if (panelDragOrigin === "hold" && zone === "hold") {
          const holdEl = document.querySelector(
            '[data-drop-zone="hold"]',
          ) as HTMLElement | null;
          if (holdEl) {
            const rect = holdEl.getBoundingClientRect();
            const cardHeight = zoom === "expanded" ? 74 : 32;
            const rowStride = cardHeight + 8;
            const relY = e.clientY - rect.top;
            // Use mid-card crossing as the swap threshold so reorder triggers
            // exactly when the cursor passes another item's center, not its edge.
            const rawIdx = Math.floor((relY + cardHeight / 2) / rowStride);
            setPanelHold((prev) => {
              const currentIdx = prev.indexOf(drag.truckId);
              if (currentIdx === -1) return prev;
              const targetIdx = Math.max(0, Math.min(prev.length - 1, rawIdx));
              if (targetIdx === currentIdx) return prev;
              const next = [...prev];
              const [removed] = next.splice(currentIdx, 1);
              next.splice(targetIdx, 0, removed);
              return next;
            });
          }
        }
        if (zone) {
          setHoverSlot(null);
        } else {
          // Hit-test relative to the floating card's top-left, not the cursor,
          // so the offset is the same no matter where on the card the user
          // grabbed.
          const cardLeft = e.clientX - drag.offsetX;
          const cardTop = e.clientY - drag.offsetY;
          const hit = gridRef.current?.hitTest(
            cardLeft - DRAG_INDICATOR_OFFSET_X,
            cardTop - DRAG_INDICATOR_OFFSET_Y,
            [truck.apptMinutes],
          );
          // Arrived trucks stay locked to their actual arrival time. Everything
          // else follows the cursor so the user can place the card before or
          // after its appointment.
          const locked = isTruckInProgress(drag.truckId);
          setHoverSlot(
            hit
              ? {
                  dockId: hit.dockId,
                  startMinutes: locked
                    ? lockedStartFor(drag.truckId)
                    : Math.max(hit.startMinutes, CURRENT_TIME_MINUTES),
                }
              : null,
          );
        }
      }
    };

    const onUp = (e: PointerEvent) => {
      const wasActive = drag.kind === "active";
      const current = drag;
      const originZone = panelDragOrigin;
      document.body.classList.remove("dragging");
      setHoverSlot(null);
      setPanelHoverZone(null);
      setPanelDragOrigin(null);
      setDrag({ kind: "idle" });

      if (!wasActive) return; // Was a click, not a drag — let the click event fire normally.

      // Suppress the click event that would otherwise fire on whatever button is under the pointer.
      const suppressClick = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", suppressClick, { once: true, capture: true });
      // Safety: if no click fires, remove the suppressor on the next frame.
      requestAnimationFrame(() =>
        window.removeEventListener("click", suppressClick, true),
      );

      // V40: panel-zone drop takes precedence over grid hit-test.
      const droppedZone = panelZoneAt(e.clientX, e.clientY);
      if (figmaCard && droppedZone) {
        // In-progress trucks can't live on the panel — same rule as dropping
        // them on an on-hold dock pre-V40. Show the existing acknowledgement modal.
        if (isTruckInProgress(current.truckId)) {
          setInProgressHoldError({ truckId: current.truckId, zone: droppedZone });
          return;
        }
        // Same-zone drop after a live-reorder: the order was already updated
        // in onMove, so don't touch it (re-appending would undo the reorder).
        if (originZone && originZone === droppedZone) {
          return;
        }
        // Cross-zone move or grid → panel: remove from any existing list, drop
        // any manual override, then append to the target list.
        setPanelHold((prev) => prev.filter((id) => id !== current.truckId));
        setPanelUnassigned((prev) => prev.filter((id) => id !== current.truckId));
        setManualOverrides((prev) => {
          if (!(current.truckId in prev)) return prev;
          const out = { ...prev };
          delete out[current.truckId];
          return out;
        });
        if (droppedZone === "hold") {
          setPanelHold((prev) => [...prev, current.truckId]);
        } else {
          setPanelUnassigned((prev) => [...prev, current.truckId]);
        }
        return;
      }

      const cardLeft = e.clientX - current.offsetX;
      const cardTop = e.clientY - current.offsetY;
      const dragTruckForHit = trucksById[current.truckId];
      const hit =
        gridRef.current?.hitTest(
          cardLeft - DRAG_INDICATOR_OFFSET_X,
          cardTop - DRAG_INDICATOR_OFFSET_Y,
          dragTruckForHit ? [dragTruckForHit.apptMinutes] : undefined,
        ) ?? null;
      const truck = trucksById[current.truckId];
      if (!hit || !truck) {
        // V40: if the drag started in the panel and dropped nowhere meaningful,
        // ensure the truck stays in its origin list (it may have been filtered out
        // of the rendered list during drag but the source state was unchanged).
        return;
      }

      // V40: drag originated in the panel and landed on the grid — pull it out
      // of the panel list. Assignment is added via the normal applyMove path below.
      if (figmaCard && originZone) {
        if (originZone === "hold") {
          setPanelHold((prev) => prev.filter((id) => id !== current.truckId));
        } else {
          setPanelUnassigned((prev) => prev.filter((id) => id !== current.truckId));
        }
      }

      // For in-progress trucks, keep storing the scheduled appt time —
      // getBarRange shifts the bar to actualArrival, so the card stays put.
      // For everything else, store the cursor-snapped time so the user can
      // place the card before or after its appointment.
      const locked = isTruckInProgress(current.truckId);
      const resolvedStart = locked
        ? truck.apptMinutes
        : Math.max(hit.startMinutes, CURRENT_TIME_MINUTES);

      const fromDockId =
        current.kind === "active" || current.kind === "pending"
          ? current.fromAssignment.dockId
          : null;
      const dockChanged = fromDockId !== null && fromDockId !== hit.dockId;

      // An in-progress truck can't be moved to an on-hold slot.
      if (
        dockChanged &&
        isTruckInProgress(current.truckId) &&
        holdSlotIds.includes(hit.dockId)
      ) {
        setInProgressHoldError({ truckId: current.truckId, zone: "hold" });
        return;
      }

      // If a truck is currently being loaded/unloaded and the user moves it to
      // a different dock, confirm before reassigning.
      if (dockChanged && isTruckInProgress(current.truckId)) {
        setPendingMove({
          truckId: current.truckId,
          fromDockId: fromDockId!,
          toDockId: hit.dockId,
        });
        return;
      }

      // If the drop position collides with another scheduled truck, confirm
      // before applying — the other truck will be moved to make room.
      const colliderId = findCollider(current.truckId, hit.dockId, resolvedStart);
      if (colliderId) {
        const snapshot = assignments;
        setPendingCollision({
          truckId: current.truckId,
          toDockId: hit.dockId,
          colliderTruckId: colliderId,
          previousAssignments: snapshot,
        });
        // Preview the drop so the user sees the overlap behind the modal.
        applyMove(current.truckId, hit.dockId, resolvedStart);
        return;
      }

      applyMove(current.truckId, hit.dockId, resolvedStart);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, trucksById]);

  const applyClearOverride = (truckId: string) => {
    const original = autoById[truckId];
    if (!original) return;
    setAssignments((prev) => {
      const without = prev.filter((a) => a.truckId !== truckId);
      return [...without, original];
    });
  };

  const handleClearOverride = (truckId: string) => {
    const original = autoById[truckId];
    if (!original) return;
    const current = assignments.find((a) => a.truckId === truckId);
    const dockChanged = current ? current.dockId !== original.dockId : false;
    // If the truck is being loaded/unloaded and resetting would move it to
    // a different dock, confirm first — same modal as a manual drag-move.
    if (dockChanged && isTruckInProgress(truckId)) {
      setPendingMove({
        truckId,
        fromDockId: current!.dockId,
        toDockId: original.dockId,
        mode: "reset",
      });
      return;
    }
    applyClearOverride(truckId);
  };

  const moveTruckToPanel = useCallback(
    (truckId: string, zone: "hold" | "unassigned") => {
      setPanelHold((prev) => prev.filter((id) => id !== truckId));
      setPanelUnassigned((prev) => prev.filter((id) => id !== truckId));
      setManualOverrides((prev) => {
        if (!(truckId in prev)) return prev;
        const out = { ...prev };
        delete out[truckId];
        return out;
      });
      if (zone === "hold") {
        setPanelHold((prev) => [...prev, truckId]);
      } else {
        setPanelUnassigned((prev) => [...prev, truckId]);
      }
    },
    [],
  );

  const isManuallyOverridden = (truckId: string) => {
    const cur = assignments.find((a) => a.truckId === truckId);
    return cur?.source === "manual";
  };

  const draggingTruck = drag.kind === "active" ? trucksById[drag.truckId] : null;
  const draggingSource: "auto" | "manual" | "departed" = (() => {
    if (drag.kind !== "active") return "auto";
    if (isTruckDeparted(drag.truckId)) return "departed";
    const a = assignments.find((x) => x.truckId === drag.truckId);
    return a?.source === "manual" ? "manual" : "auto";
  })();
  const draggingBarStatus: "scheduled" | "in_progress" | "departed" = (() => {
    if (!draggingTruck) return "scheduled";
    const a = assignments.find((x) => x.truckId === draggingTruck.id);
    if (!a) return "scheduled";
    const departed = isTruckDeparted(draggingTruck.id);
    const bar = getBarRange(draggingTruck, a.startMinutes, CURRENT_TIME_MINUTES, departed);
    const barEnd = bar.startMin + bar.widthMin;
    if (barEnd < CURRENT_TIME_MINUTES) return "departed";
    if (bar.startMin >= CURRENT_TIME_MINUTES) return "scheduled";
    return "in_progress";
  })();

  return (
    <>
      <PageHeaderV2
        dateIso={dateIso}
        onPrevDay={() => setDateIso(shiftDate(dateIso, -1))}
        onNextDay={() => setDateIso(shiftDate(dateIso, 1))}
        onToday={() => {
          if (dateIso === TODAY_ISO) {
            gridRef.current?.scrollToCurrentTime();
          } else {
            setDateIso(TODAY_ISO);
          }
        }}
        onSetDate={setDateIso}
        zoom={zoom}
        onZoomIn={() => setZoom("expanded")}
        onZoomOut={() => setZoom("compact")}
        toggleZoom={figmaCard}
        blockingMode={blockingMode}
        onEnterBlockingMode={() => setBlockingMode(true)}
        onExitBlockingMode={() => setBlockingMode(false)}
        onDockSettings={() => {
          setDockSettingsInitialTab("manage");
          setDockSettingsOpen(true);
        }}
        onEditHours={() => {
          setDockSettingsInitialTab("schedule");
          setDockSettingsOpen(true);
        }}
        receivingHours={receivingHours}
        shippingHours={shippingHours}
      />

      <div ref={plotAreaRef} className="relative flex flex-col pb-6">
        <ScheduleGrid
        ref={gridRef}
        docks={displayDocks}
        holdStartIndex={activeDocks.length}
        trucksById={trucksById}
        assignments={assignments}
        blocked={blocked}
        density={zoom}
        blockingMode={blockingMode}
        showCurrentTime={dateIso === TODAY_ISO}
        isPastDate={dateIso < TODAY_ISO}
        nextDayLabel={formatNextDayShort(dateIso)}
        dateIso={dateIso}
        onBlockedActionAttempt={showToast}
        isDepartedTruckId={isTruckDeparted}
        isInProgressTruckId={isTruckInProgress}
        onCreateBlock={(d) => {
          const blockStart = d.startMinutes;
          const blockEnd = d.startMinutes + d.durationMinutes;
          const colliderId = (() => {
            for (const a of assignments) {
              if (a.dockId !== d.dockId) continue;
              const other = trucksById[a.truckId];
              if (!other) continue;
              if (isTruckDeparted(a.truckId)) continue;
              const bBar = getBarRange(other, a.startMinutes, CURRENT_TIME_MINUTES);
              const s = bBar.startMin;
              const e = bBar.startMin + bBar.widthMin;
              if (blockStart < e && blockEnd > s) return a.truckId;
            }
            return null;
          })();
          if (colliderId) {
            const previewBlockId = `blk-preview-${Date.now()}`;
            setBlocked((prev) => [
              ...prev,
              { id: previewBlockId, dateIso, ...d },
            ]);
            setPendingBlock({ draft: d, colliderTruckId: colliderId, previewBlockId });
            return;
          }
          setBlocked((prev) => [
            ...prev,
            { id: `blk-${Date.now()}`, dateIso, ...d },
          ]);
        }}
        onDeleteBlock={(blockId) => setBlocked((prev) => prev.filter((b) => b.id !== blockId))}
        onMoveBlock={(blockId, newStartMinutes) =>
          setBlocked((prev) => prev.map((b) => (b.id === blockId ? { ...b, startMinutes: newStartMinutes } : b)))
        }
        onResizeBlock={(blockId, newDurationMinutes) =>
          setBlocked((prev) => prev.map((b) => (b.id === blockId ? { ...b, durationMinutes: newDurationMinutes } : b)))
        }
        onStartDrag={startDrag}
        draggingTruckId={drag.kind === "active" ? drag.truckId : null}
        hoverSlot={hoverSlot}
        dragLockedStartMinutes={
          drag.kind === "active" ? lockedStartFor(drag.truckId) : null
        }
        variantByTruckId={variantByTruckId}
        showMenu
        menuVariantByTruckId={(truckId) =>
          isTruckDeparted(truckId) || isTruckInProgress(truckId) ? "info" : "more"
        }
        onMenuOpen={(truckId, anchor) => {
          // Treat the menu trigger like a click on the card itself: make it sticky-expanded.
          setExpandedIds(new Set([truckId]));
          // Departed and in-progress trucks only get "Additional info" → skip the popover
          // and open the side sheet directly. Neither can be moved to the side panel.
          if (isTruckDeparted(truckId) || isTruckInProgress(truckId)) {
            setDetailTruckId(truckId);
            return;
          }
          setMenu({ truckId, anchor });
        }}
        onExpand={(truckId) => setExpandedIds(new Set([truckId]))}
        onCollapse={(truckId) =>
          setExpandedIds((s) =>
            s.has(truckId) ? new Set() : new Set([truckId]),
          )
        }
        onHoverExpand={(truckId) => {
          setHoverExpandedId(truckId);
          // Only one card can be expanded at a time — hovering a different card
          // collapses any sticky/click-expanded card.
          setExpandedIds((s) => (s.has(truckId) ? s : new Set()));
        }}
        onHoverCollapse={(truckId) =>
          setHoverExpandedId((id) => (id === truckId ? null : id))
        }
        treatment={treatment}
        typefix={typefix}
        declutter={declutter}
        redLate={redLate}
        prismIcon={prismIcon}
        figmaCard={figmaCard}
        rightOverlay={
          figmaCard ? (
            <AssignmentPanel
              holdTrucks={holdTrucks}
              unassignedTrucks={unassignedTrucks}
              density={zoom}
              isDragging={drag.kind === "active"}
              draggingTruckId={drag.kind === "active" ? drag.truckId : null}
              draggingFromZone={panelDragOrigin}
              hoverZone={panelHoverZone}
              onStartDragFromPanel={startPanelDrag}
              treatment={treatment}
              typefix={typefix}
              declutter={declutter}
              redLate={redLate}
              prismIcon={prismIcon}
              figmaCard={figmaCard}
            />
          ) : null
        }
        />

        {/* Toast — sits just above the legend pill, aligned with plot center */}
        {toast && (
          <div
            className="fixed bottom-20 z-30 pointer-events-none -translate-x-1/2"
            style={{ left: plotCenterX != null ? plotCenterX : "50%" }}
          >
            <div className="bg-ink text-white text-body-md rounded-button shadow-drag px-4 py-2.5">
              {toast}
            </div>
          </div>
        )}

        {/* Centered floating legend pill */}
        <div
          className={"fixed z-20 pointer-events-none -translate-x-1/2 " + (legendAttached ? "bottom-0" : "bottom-6")}
          style={{ left: plotCenterX != null ? plotCenterX : "50%" }}
        >
          <div className={"pointer-events-auto bg-white border border-line shadow-drag flex items-center " + (legendAttached ? "rounded-t-button border-b-0 px-7 py-4 gap-8" : "rounded-button px-4 py-2.5 gap-6")}>
            {blockingMode ? (
              <p className="text-body-md-strong text-ink">
                Click and drag on the area you want to block
              </p>
            ) : (
              declutter ? (
                <>
                  <LegendSwatch color={STATUS_COLORS.departed.soft} ringColor={STATUS_COLORS.departed.strong} label="Departed" />
                  <LegendSwatch color={STATUS_COLORS.in_progress.soft} ringColor={STATUS_COLORS.in_progress.strong} label="In progress" />
                  <LegendSwatch color={STATUS_COLORS.scheduled.soft} ringColor={STATUS_COLORS.scheduled.strong} label="Scheduled" />
                  <LegendSwatch color="#FFF0ED" ringColor="#B71000" label="Blocked time" />
                </>
              ) : (
                <>
                  <LegendSwatch color="#00832D" label="Departed" />
                  <LegendSwatch color="#1537C7" label="Auto assigned" />
                  <LegendSwatch color="#6B21A8" label="Manually assigned" />
                  <LegendSwatch color="#949494" label="Blocked time" />
                </>
              )
            )}
          </div>
        </div>
      </div>

      {drag.kind === "active" && draggingTruck && (
        <div
          className="fixed z-40 pointer-events-none shadow-drag rounded-button"
          style={{
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
            width: drag.width,
            height: drag.height,
            transform: "rotate(-1deg)",
          }}
        >
          <TruckCard truck={draggingTruck} variant="scheduled" source={draggingSource} barStatus={draggingBarStatus} treatment={treatment} typefix={typefix} declutter={declutter} redLate={redLate} prismIcon={prismIcon} figmaCard={figmaCard} />
        </div>
      )}

      <PopoverMenu
        open={!!menu}
        anchorRect={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        items={[
          {
            id: "additional-info",
            label: "Additional info",
            icon: <Info className="size-6 text-ink" strokeWidth={1.75} />,
            onSelect: () => {
              if (menu) setDetailTruckId(menu.truckId);
              setMenu(null);
            },
          },
          // Only offer "Auto assign" when the card is manually overridden (blue).
          ...(menu && isManuallyOverridden(menu.truckId)
            ? [
                {
                  id: "auto-assign",
                  label: autoReassignLabel ? "Reset to recommended" : "Auto assign",
                  icon: <RotateCw className="size-6 text-ink" strokeWidth={1.75} />,
                  onSelect: () => handleClearOverride(menu.truckId),
                },
              ]
            : []),
          // Scheduled trucks can be moved to the side panel sections without dragging.
          // Departed and in-progress trucks can't be moved off the grid.
          ...(menu && !isTruckDeparted(menu.truckId) && !isTruckInProgress(menu.truckId)
            ? [
                {
                  id: "put-on-hold",
                  label: "Put on hold",
                  icon: <PrismPauseIcon className="size-6 text-ink" />,
                  onSelect: () => {
                    if (menu) moveTruckToPanel(menu.truckId, "hold");
                    setMenu(null);
                  },
                },
                {
                  id: "unassign",
                  label: "Unassign truck",
                  icon: <PrismCloseIcon className="size-6 text-ink" />,
                  onSelect: () => {
                    if (menu) moveTruckToPanel(menu.truckId, "unassigned");
                    setMenu(null);
                  },
                },
              ]
            : []),
        ]}
      />

      <TruckDetailSheet
        open={!!detailTruckId}
        truck={detailTruckId ? trucksById[detailTruckId] ?? null : null}
        dockLabel={(() => {
          if (!detailTruckId) return null;
          const a = assignments.find((x) => x.truckId === detailTruckId);
          if (!a) return null;
          return displayDocks.find((d) => d.id === a.dockId)?.label ?? null;
        })()}
        startMinutes={(() => {
          if (!detailTruckId) return null;
          const a = assignments.find((x) => x.truckId === detailTruckId);
          return a?.startMinutes ?? null;
        })()}
        onClose={() => setDetailTruckId(null)}
      />

      {(() => {
        if (!pendingMove) return null;
        const truck = trucksById[pendingMove.truckId];
        const verb = truck?.direction === "outbound" ? "loaded" : "unloaded";
        return (
          <ErrorModal
            open
            title={`This truck is already being ${verb}`}
            description="Are you sure you want to move it to a different dock?"
            cancelLabel="Cancel"
            confirmLabel="Confirm"
            onCancel={() => setPendingMove(null)}
            onConfirm={() => {
              const { truckId, toDockId, mode } = pendingMove;
              setPendingMove(null);
              if (mode === "reset") {
                // Reset to recommended: drop the manual override entirely
                // (the auto-assigned slot already has the right startMinutes).
                applyClearOverride(truckId);
                return;
              }
              // Confirming an in-progress move may still land on top of
              // another truck — chain into the collision modal if so.
              const colliderId = findCollider(truckId, toDockId);
              if (colliderId) {
                const snapshot = assignments;
                setPendingCollision({
                  truckId,
                  toDockId,
                  colliderTruckId: colliderId,
                  previousAssignments: snapshot,
                });
                applyMove(truckId, toDockId);
                return;
              }
              applyMove(truckId, toDockId);
            }}
          />
        );
      })()}

      {(() => {
        if (!pendingCollision) return null;
        const toLabel =
          docks.find((d) => d.id === pendingCollision.toDockId)?.label ?? "This dock";
        return (
          <ErrorModal
            open
            title={`${toLabel} already has a truck scheduled at this time`}
            description="This truck will be automatically reassigned to an available dock."
            cancelLabel="Cancel"
            confirmLabel="Confirm"
            onCancel={() => {
              setAssignments(pendingCollision.previousAssignments);
              setPendingCollision(null);
            }}
            onConfirm={() => {
              applyMoveWithDisplacement(
                pendingCollision.truckId,
                pendingCollision.toDockId,
                pendingCollision.colliderTruckId,
              );
              setPendingCollision(null);
            }}
          />
        );
      })()}

      {demoCollisionModalOpen && (
        <ErrorModal
          open
          hideCancel
          title="Dock 5 conflict detected"
          description="A truck in progress now overlaps with a scheduled truck. The scheduled truck will be reassigned to an available dock."
          confirmLabel="Okay"
          onCancel={() => {
            setDemoCollisionChoice("confirm");
            setDemoCollisionModalOpen(false);
          }}
          onConfirm={() => {
            setDemoCollisionChoice("confirm");
            setDemoCollisionModalOpen(false);
          }}
        />
      )}

      {(() => {
        if (!inProgressHoldError) return null;
        const description =
          inProgressHoldError.zone === "hold"
            ? "It cannot be placed on hold."
            : "It cannot be unassigned.";
        return (
          <ErrorModal
            open
            hideCancel
            title="This truck is in progress"
            description={description}
            confirmLabel="OK"
            onCancel={() => setInProgressHoldError(null)}
            onConfirm={() => setInProgressHoldError(null)}
          />
        );
      })()}

      {(() => {
        if (!pendingBlock) return null;
        return (
          <ErrorModal
            open
            title="Blocked time intersects with a scheduled truck"
            description="This truck will be automatically reassigned to an available dock."
            cancelLabel="Cancel"
            confirmLabel="Confirm"
            onCancel={() => {
              setBlocked((prev) => prev.filter((b) => b.id !== pendingBlock.previewBlockId));
              setPendingBlock(null);
            }}
            onConfirm={() => {
              const { draft, colliderTruckId, previewBlockId } = pendingBlock;
              const colliderTruck = trucksById[colliderTruckId];
              const newDockForCollider = findOpenDockForTruck(colliderTruckId, draft.dockId);
              // Promote the preview block to a permanent id.
              setBlocked((prev) =>
                prev.map((b) =>
                  b.id === previewBlockId ? { ...b, id: `blk-${Date.now()}` } : b,
                ),
              );
              if (colliderTruck && newDockForCollider) {
                setAssignments((prev) => {
                  const without = prev.filter((a) => a.truckId !== colliderTruckId);
                  return [
                    ...without,
                    {
                      truckId: colliderTruckId,
                      dockId: newDockForCollider,
                      startMinutes: colliderTruck.apptMinutes,
                      source: "manual",
                    },
                  ];
                });
              }
              setPendingBlock(null);
            }}
          />
        );
      })()}

      <DockSettingsModal
        open={dockSettingsOpen}
        onClose={() => setDockSettingsOpen(false)}
        initialTab={dockSettingsInitialTab}
        editLabel={legendAttached}
        docks={docks}
        priorityOrder={priorityOrder}
        receivingHours={receivingHours}
        shippingHours={shippingHours}
        onSave={(next) => {
          setDocks(next.docks);
          setPriorityOrder(next.priorityOrder);
          setReceivingHours(next.receivingHours);
          setShippingHours(next.shippingHours);
          // Clear manual overrides for docks that no longer exist or got deactivated
          setManualOverrides((prev) => {
            const activeIds = new Set(next.docks.filter((d) => d.active).map((d) => d.id));
            const out: Record<string, Assignment> = {};
            for (const [k, v] of Object.entries(prev)) {
              if (activeIds.has(v.dockId)) out[k] = v;
            }
            return out;
          });
        }}
      />
    </>
  );
}

function LegendSwatch({ color, ringColor, label }: { color: string; ringColor?: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-4 rounded"
        style={{ backgroundColor: color, border: ringColor ? `1.5px solid ${ringColor}` : undefined }}
      />
      <span className={cn("text-body-md text-ink")}>{label}</span>
    </div>
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatNextDayShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
