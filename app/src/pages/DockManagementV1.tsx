import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { PageHeader } from "../components/PageHeader";
import { UnassignedRail } from "../components/UnassignedRail";
import { LegendBar } from "../components/LegendBar";
import { ScheduleGrid, type ScheduleGridHandle } from "../components/ScheduleGrid";
import { TruckCard } from "../components/TruckCard";
import { ConflictModal } from "../components/ConflictModal";
import {
  ASSIGNMENTS as INITIAL_ASSIGNMENTS,
  BLOCKED_SLOTS,
  DOCKS,
  TODAY_ISO,
  TRUCKS,
} from "../data/mock";
import type { Assignment, Truck } from "../data/types";

type DragState =
  | { kind: "idle" }
  | {
      kind: "active";
      truckId: string;
      x: number;
      y: number;
      offsetX: number;
      offsetY: number;
      fromAssignment: Assignment | null;
    };

export function DockManagementV1() {
  const [dateIso, setDateIso] = useState<string>(TODAY_ISO);
  const [autoAssign, setAutoAssign] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });
  const [hoverSlot, setHoverSlot] = useState<{ dockId: string; startMinutes: number } | null>(null);
  const [pendingDrop, setPendingDrop] = useState<
    | null
    | {
        truck: Truck;
        slot: { dockId: string; startMinutes: number };
        fromAssignment: Assignment | null;
      }
  >(null);

  const gridRef = useRef<ScheduleGridHandle>(null);
  const trucksById = useMemo<Record<string, Truck>>(
    () => Object.fromEntries(TRUCKS.map((t) => [t.id, t])),
    [],
  );

  const assignedIds = useMemo(() => new Set(assignments.map((a) => a.truckId)), [assignments]);
  const unassignedTrucks = useMemo(
    () => TRUCKS.filter((t) => !assignedIds.has(t.id)),
    [assignedIds],
  );

  const startDrag = useCallback(
    (truckId: string, e: React.PointerEvent) => {
      const target = e.currentTarget as HTMLElement;
      const cardEl = target.closest(".group") as HTMLElement | null;
      const rect = (cardEl ?? target).getBoundingClientRect();
      const fromAssignment = assignments.find((a) => a.truckId === truckId) ?? null;
      setDrag({
        kind: "active",
        truckId,
        x: e.clientX,
        y: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        fromAssignment,
      });
      document.body.classList.add("dragging");
      e.preventDefault();
    },
    [assignments],
  );

  useEffect(() => {
    if (drag.kind !== "active") return;

    const onMove = (e: PointerEvent) => {
      setDrag((d) => (d.kind === "active" ? { ...d, x: e.clientX, y: e.clientY } : d));
      const hit = gridRef.current?.hitTest(e.clientX, e.clientY);
      const truck = trucksById[drag.truckId];
      // Lock X to the truck's appointment time — only Y (dock) can change.
      setHoverSlot(hit && truck ? { dockId: hit.dockId, startMinutes: truck.apptMinutes } : null);
    };

    const onUp = (e: PointerEvent) => {
      const hit = gridRef.current?.hitTest(e.clientX, e.clientY) ?? null;
      const current = drag;
      document.body.classList.remove("dragging");
      setHoverSlot(null);
      setDrag({ kind: "idle" });

      if (!hit) {
        if (current.fromAssignment) {
          setAssignments((prev) => prev.filter((a) => a.truckId !== current.truckId));
        }
        return;
      }

      const truck = trucksById[current.truckId];
      if (!truck) return;

      // Lock X to the truck's appointment time — drag can only change dock.
      const lockedSlot = { dockId: hit.dockId, startMinutes: truck.apptMinutes };

      if (truck.dateIso !== dateIso) {
        setPendingDrop({
          truck,
          slot: lockedSlot,
          fromAssignment: current.fromAssignment,
        });
        return;
      }

      commitAssignment(current.truckId, lockedSlot.dockId, lockedSlot.startMinutes, "manual");
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, trucksById, dateIso]);

  const commitAssignment = (
    truckId: string,
    dockId: string,
    startMinutes: number,
    source: Assignment["source"],
  ) => {
    setAssignments((prev) => {
      const without = prev.filter((a) => a.truckId !== truckId);
      return [...without, { truckId, dockId, startMinutes, source }];
    });
  };

  const handleMoveAppointment = () => {
    if (!pendingDrop) return;
    const t = pendingDrop.truck;
    t.dateIso = dateIso;
    commitAssignment(t.id, pendingDrop.slot.dockId, pendingDrop.slot.startMinutes, "manual");
    setPendingDrop(null);
  };

  const handleKeepAppointment = () => {
    if (pendingDrop?.fromAssignment) {
      setAssignments((prev) => prev.filter((a) => a.truckId !== pendingDrop.truck.id));
    }
    setPendingDrop(null);
  };

  const handleCancel = () => {
    if (pendingDrop?.fromAssignment) {
      const fa = pendingDrop.fromAssignment;
      setAssignments((prev) => {
        const without = prev.filter((a) => a.truckId !== fa.truckId);
        return [...without, fa];
      });
    }
    setPendingDrop(null);
  };

  const draggingTruck = drag.kind === "active" ? trucksById[drag.truckId] : null;

  return (
    <>
      <PageHeader
        dateIso={dateIso}
        onPrevDay={() => setDateIso(shiftDate(dateIso, -1))}
        onNextDay={() => setDateIso(shiftDate(dateIso, 1))}
        onToday={() => setDateIso(TODAY_ISO)}
        autoAssign={autoAssign}
        onToggleAutoAssign={() => setAutoAssign((v) => !v)}
      />
      <UnassignedRail trucks={unassignedTrucks} onStartDrag={startDrag} />
      <LegendBar />
      <ScheduleGrid
        ref={gridRef}
        docks={DOCKS}
        trucksById={trucksById}
        assignments={assignments}
        blocked={BLOCKED_SLOTS}
        onStartDrag={startDrag}
        draggingTruckId={drag.kind === "active" ? drag.truckId : null}
        hoverSlot={hoverSlot}
      />

      {drag.kind === "active" && draggingTruck && (
        <div
          className="fixed z-40 pointer-events-none shadow-drag rounded-button"
          style={{
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
            width: 260,
            transform: "rotate(-1deg)",
          }}
        >
          <TruckCard truck={draggingTruck} variant="scheduled" source="manual" />
        </div>
      )}

      <ConflictModal
        open={!!pendingDrop}
        truck={pendingDrop?.truck ?? null}
        droppedDateIso={dateIso}
        onCancel={handleCancel}
        onMoveAppointment={handleMoveAppointment}
        onKeepAppointment={handleKeepAppointment}
      />
    </>
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
