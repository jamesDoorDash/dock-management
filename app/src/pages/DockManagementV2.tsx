import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { RotateCw, Info } from "lucide-react";
import { PageHeaderV2 } from "../components/PageHeaderV2";
import { ScheduleGrid, type ScheduleGridHandle } from "../components/ScheduleGrid";
import { TruckCard } from "../components/TruckCard";
import { PopoverMenu } from "../components/PopoverMenu";
import { DockSettingsModal } from "../components/DockSettingsModal";
import { BLOCKED_SLOTS, DOCKS, FACILITY, TODAY_ISO, TRUCKS } from "../data/mock";
import type { Assignment, BlockedSlot, Dock, Truck } from "../data/types";
import { autoAssignAll } from "../lib/autoAssign";
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
      fromAssignment: Assignment;
    }
  | {
      kind: "active";
      truckId: string;
      x: number;
      y: number;
      offsetX: number;
      offsetY: number;
      fromAssignment: Assignment;
    };

const DRAG_THRESHOLD = 5; // pixels

export function DockManagementV2() {
  const [dateIso, setDateIso] = useState<string>(TODAY_ISO);
  const [zoom, setZoom] = useState<"compact" | "expanded">("compact");
  const [blockingMode, setBlockingMode] = useState(false);
  const [dockSettingsOpen, setDockSettingsOpen] = useState(false);
  const [docks, setDocks] = useState<Dock[]>(DOCKS);
  const [receivingHours, setReceivingHours] = useState(FACILITY.receivingHours);
  const [shippingHours, setShippingHours] = useState(FACILITY.shippingHours);
  const [blocked, setBlocked] = useState<BlockedSlot[]>(BLOCKED_SLOTS);
  /** Manual overrides keyed by truckId. These override the auto-assigned slot for that truck. */
  const [manualOverrides, setManualOverrides] = useState<Record<string, Assignment>>({});
  /** Cards the user clicked to inline-expand from compact mode. */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });
  const [hoverSlot, setHoverSlot] = useState<{ dockId: string; startMinutes: number } | null>(null);
  const [menu, setMenu] = useState<{ truckId: string; anchor: DOMRect } | null>(null);

  const gridRef = useRef<ScheduleGridHandle>(null);
  const trucksById = useMemo<Record<string, Truck>>(
    () => Object.fromEntries(TRUCKS.map((t) => [t.id, t])),
    [],
  );

  // Trucks visible on the schedule for the current viewing date
  const trucksForDate = useMemo(() => TRUCKS.filter((t) => t.dateIso === dateIso), [dateIso]);
  // Only active docks are shown on the schedule
  const activeDocks = useMemo(() => docks.filter((d) => d.active), [docks]);
  // Auto-assignment layout for the current date — recomputed when date or blocked slots change
  const autoForDate = useMemo(
    () => autoAssignAll(trucksForDate, activeDocks, blocked),
    [trucksForDate, activeDocks, blocked],
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
      return expandedIds.has(truckId) ? "scheduled" : "compact";
    },
    [zoom, expandedIds],
  );

  const startDrag = useCallback(
    (truckId: string, e: React.PointerEvent) => {
      // Don't initiate drag from the ... menu button — that's a click-only target.
      const target = e.target as HTMLElement;
      if (target.closest('button[aria-label="More options"]')) return;

      const cardEl = (e.currentTarget as HTMLElement).closest(".group") as HTMLElement | null;
      const rect = (cardEl ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
      const fromAssignment = assignments.find((a) => a.truckId === truckId);
      if (!fromAssignment) return;
      // Start in 'pending' — we don't commit to a drag until pointer moves past threshold.
      // This lets simple clicks (e.g. on the underline to expand) still work.
      setDrag({
        kind: "pending",
        truckId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        fromAssignment,
      });
    },
    [assignments],
  );

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
      const pastThreshold =
        drag.kind === "active" ||
        (drag.kind === "pending" &&
          Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) >= DRAG_THRESHOLD);
      if (pastThreshold && truck) {
        const hit = gridRef.current?.hitTest(e.clientX, e.clientY);
        setHoverSlot(hit ? { dockId: hit.dockId, startMinutes: truck.apptMinutes } : null);
      }
    };

    const onUp = (e: PointerEvent) => {
      const wasActive = drag.kind === "active";
      const current = drag;
      document.body.classList.remove("dragging");
      setHoverSlot(null);
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

      const hit = gridRef.current?.hitTest(e.clientX, e.clientY) ?? null;
      const truck = trucksById[current.truckId];
      if (!hit || !truck) return;

      setAssignments((prev) => {
        const without = prev.filter((a) => a.truckId !== current.truckId);
        return [
          ...without,
          { truckId: current.truckId, dockId: hit.dockId, startMinutes: truck.apptMinutes, source: "manual" },
        ];
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, trucksById]);

  const handleClearOverride = (truckId: string) => {
    const original = autoById[truckId];
    if (!original) return;
    setAssignments((prev) => {
      const without = prev.filter((a) => a.truckId !== truckId);
      return [...without, original];
    });
  };

  const isManuallyOverridden = (truckId: string) => {
    const cur = assignments.find((a) => a.truckId === truckId);
    return cur?.source === "manual";
  };

  const draggingTruck = drag.kind === "active" ? trucksById[drag.truckId] : null;

  return (
    <>
      <PageHeaderV2
        dateIso={dateIso}
        onPrevDay={() => setDateIso(shiftDate(dateIso, -1))}
        onNextDay={() => setDateIso(shiftDate(dateIso, 1))}
        onToday={() => setDateIso(TODAY_ISO)}
        zoom={zoom}
        onZoomIn={() => setZoom("expanded")}
        onZoomOut={() => setZoom("compact")}
        blockingMode={blockingMode}
        onEnterBlockingMode={() => setBlockingMode(true)}
        onExitBlockingMode={() => setBlockingMode(false)}
        onDockSettings={() => setDockSettingsOpen(true)}
      />

      <div className="relative flex-1 min-h-0 flex flex-col">
        <ScheduleGrid
        ref={gridRef}
        docks={activeDocks}
        trucksById={trucksById}
        assignments={assignments}
        blocked={blocked}
        density={zoom}
        blockingMode={blockingMode}
        showCurrentTime={dateIso === TODAY_ISO}
        onCreateBlock={(d) =>
          setBlocked((prev) => [
            ...prev,
            { id: `blk-${Date.now()}`, dateIso, ...d },
          ])
        }
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
        variantByTruckId={variantByTruckId}
        showMenu
        onMenuOpen={(truckId, anchor) => setMenu({ truckId, anchor })}
        onExpand={(truckId) =>
          setExpandedIds((s) => {
            const next = new Set(s);
            next.add(truckId);
            return next;
          })
        }
        onCollapse={(truckId) =>
          setExpandedIds((s) => {
            const next = new Set(s);
            next.delete(truckId);
            return next;
          })
        }
        />

        {/* Centered floating legend pill */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="pointer-events-auto bg-white rounded-button border border-line shadow-drag px-4 py-2.5 flex items-center gap-6">
            {blockingMode ? (
              <p className="text-body-md-strong text-ink">
                Click and drag on the area you want to block
              </p>
            ) : (
              <>
                <LegendSwatch color="#00832D" label="Automatically assigned" />
                <LegendSwatch color="#1537C7" label="Manually overridden" />
                <LegendSwatch color="#949494" label="Blocked time" />
              </>
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
            width: 300,
            height: 132,
            transform: "rotate(-1deg)",
          }}
        >
          <TruckCard truck={draggingTruck} variant="scheduled" source="manual" />
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
              /* no-op for prototype */
            },
          },
          // Only offer "Auto assign" when the card is manually overridden (blue).
          ...(menu && isManuallyOverridden(menu.truckId)
            ? [
                {
                  id: "auto-assign",
                  label: "Auto assign",
                  icon: <RotateCw className="size-6 text-ink" strokeWidth={1.75} />,
                  onSelect: () => handleClearOverride(menu.truckId),
                },
              ]
            : []),
        ]}
      />

      <DockSettingsModal
        open={dockSettingsOpen}
        onClose={() => setDockSettingsOpen(false)}
        docks={docks}
        receivingHours={receivingHours}
        shippingHours={shippingHours}
        onSave={(next) => {
          setDocks(next.docks);
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

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-4 rounded" style={{ backgroundColor: color }} />
      <span className={cn("text-body-md text-ink")}>{label}</span>
    </div>
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
