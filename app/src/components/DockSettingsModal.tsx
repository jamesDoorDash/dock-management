import { useState, useRef, useEffect, useMemo, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  X,
  MoreHorizontal,
  Printer,
  Pencil,
  Trash2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronsUpDown,
  Truck,
  Check,
} from "lucide-react";
import type { Dock, DockEquipment, EquipmentType } from "../data/types";
import { EQUIPMENT_TYPES, DEFAULT_DOCK_EQUIPMENT } from "../data/types";
import { Tooltip } from "./Tooltip";
import { PopoverMenu, type PopoverSection } from "./PopoverMenu";
import { cn } from "../lib/cn";

function getEquipment(d: Dock): DockEquipment {
  return d.equipment ?? DEFAULT_DOCK_EQUIPMENT;
}
function equipmentEnabledCount(eq: DockEquipment): number {
  return EQUIPMENT_TYPES.reduce((n, t) => n + (eq[t.id] ? 1 : 0), 0);
}

type Tab = "manage" | "schedule" | "priority";

interface Hours {
  startMinutes: number;
  endMinutes: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  docks: Dock[];
  priorityOrder: string[];
  receivingHours: Hours;
  shippingHours: Hours;
  /** Save callback fired on Confirm with the next state. */
  onSave: (next: {
    docks: Dock[];
    priorityOrder: string[];
    receivingHours: Hours;
    shippingHours: Hours;
  }) => void;
  /** When true, labels the rename action as "Edit dock" instead. */
  editLabel?: boolean;
  /** Tab to show when the modal opens. Defaults to "manage". */
  initialTab?: Tab;
}

export function DockSettingsModal({
  open,
  onClose,
  docks: docksProp,
  priorityOrder: priorityOrderProp,
  receivingHours: receivingHoursProp,
  shippingHours: shippingHoursProp,
  onSave,
  initialTab = "manage",
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);
  // Local draft state
  const [docks, setDocks] = useState<Dock[]>(docksProp);
  const [priorityOrder, setPriorityOrder] = useState<string[]>(priorityOrderProp);
  const [rearranging, setRearranging] = useState(false);
  const [prioritizing, setPrioritizing] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [recv, setRecv] = useState<Hours>(receivingHoursProp);
  const [ship, setShip] = useState<Hours>(shippingHoursProp);
  const [menu, setMenu] = useState<{ dockId: string; anchor: DOMRect } | null>(null);
  // Inline "Add dock" form
  const [addingDock, setAddingDock] = useState(false);
  const [addDockValue, setAddDockValue] = useState("");

  const nextDockNumber = useMemo(() => {
    let max = 0;
    for (const d of docks) {
      const m = d.label.match(/(\d+)/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return Math.max(max + 1, docks.length + 1);
  }, [docks]);

  if (!open) return null;

  const activeCount = docks.filter((d) => d.active).length;

  const handleConfirm = () => {
    onSave({ docks, priorityOrder, receivingHours: recv, shippingHours: ship });
    onClose();
  };

  const handleToggle = (id: string) =>
    setDocks((prev) => prev.map((d) => (d.id === id ? { ...d, active: !d.active } : d)));

  const handleDelete = (id: string) => {
    setDocks((prev) => prev.filter((d) => d.id !== id));
    setPriorityOrder((prev) => prev.filter((pid) => pid !== id));
  };

  const toggleEquipment = (dockId: string, type: EquipmentType) => {
    setDocks((prev) =>
      prev.map((d) => {
        if (d.id !== dockId) return d;
        const current = getEquipment(d);
        return { ...d, equipment: { ...current, [type]: !current[type] } };
      }),
    );
  };

  const startRename = (d: Dock) => {
    setRenamingId(d.id);
    setRenameValue(d.label);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) {
      setDocks((prev) => prev.map((d) => (d.id === renamingId ? { ...d, label: trimmed } : d)));
    }
    setRenamingId(null);
  };

  const cancelRename = () => setRenamingId(null);

  const startAddDock = () => {
    setAddDockValue(`${nextDockNumber}`);
    setAddingDock(true);
  };

  const commitAddDock = () => {
    const value = addDockValue.trim();
    if (!value) return;
    // Bare numbers/short codes become "Dock <value>"; if the user typed a full
    // name (e.g. "Loading Bay A"), keep it as entered.
    const label = /^\S+$/.test(value) && !/^dock\s/i.test(value) ? `Dock ${value}` : value;
    const id = `dock-${Date.now()}`;
    setDocks((prev) => [
      ...prev,
      {
        id,
        label,
        uuid:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 6)}`,
        active: true,
      },
    ]);
    setPriorityOrder((prev) => [...prev, id]);
    setAddingDock(false);
    setAddDockValue("");
  };

  const cancelAddDock = () => {
    setAddingDock(false);
    setAddDockValue("");
  };

  const reorderDocks = (fromIdx: number, toIdx: number) => {
    setDocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const reorderPriority = (fromIdx: number, toIdx: number) => {
    setPriorityOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dock-settings-title"
    >
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative z-10 w-[832px] max-w-[92vw] h-[80vh] min-h-[560px] max-h-[800px] bg-white rounded-card shadow-drag flex flex-col">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 size-8 grid place-items-center rounded-button hover:bg-surface-hovered"
        >
          <X className="size-5 text-icon-subdued" />
        </button>

        {/* Header */}
        <div className="px-8 pt-7 pb-4">
          <h2 id="dock-settings-title" className="text-title-md text-ink">
            Dock settings
          </h2>
          {/* Tabs */}
          <div
            className={cn(
              "mt-5 inline-flex w-full items-center rounded-button border border-line-hovered bg-white",
              (addingDock || rearranging || prioritizing || renamingId) && "opacity-40 pointer-events-none",
            )}
            aria-disabled={addingDock || rearranging || prioritizing || !!renamingId || undefined}
          >
            <TabButton active={tab === "manage"} onClick={() => setTab("manage")}>
              Manage docks
            </TabButton>
            <TabButton active={tab === "schedule"} onClick={() => setTab("schedule")}>
              Dock schedule
            </TabButton>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 px-8 flex flex-col">
          {tab === "manage" && (
            <ManageDocksTab
              docks={docks}
              activeCount={activeCount}
              rearranging={rearranging}
              setRearranging={setRearranging}
              prioritizing={prioritizing}
              setPrioritizing={setPrioritizing}
              priorityOrder={priorityOrder}
              reorderPriority={reorderPriority}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              startRename={startRename}
              commitRename={commitRename}
              cancelRename={cancelRename}
              onToggle={handleToggle}
              onDelete={handleDelete}
              reorder={reorderDocks}
              onMenuOpen={(dockId, anchor) => setMenu({ dockId, anchor })}
              addingDock={addingDock}
              addDockValue={addDockValue}
              setAddDockValue={setAddDockValue}
              startAddDock={startAddDock}
              commitAddDock={commitAddDock}
              cancelAddDock={cancelAddDock}
            />
          )}
          {tab === "schedule" && (
            <DockScheduleTab recv={recv} setRecv={setRecv} ship={ship} setShip={setShip} />
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-line flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={addingDock || rearranging || prioritizing || !!renamingId}
            className={cn(
              "h-10 px-4 rounded-button text-body-md-strong",
              addingDock || rearranging || prioritizing || renamingId
                ? "bg-surface-strong text-icon-disabled cursor-not-allowed"
                : "bg-ink text-white hover:opacity-90",
            )}
          >
            Save
          </button>
        </div>
      </div>

      <PopoverMenu
        open={!!menu}
        anchorRect={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        sections={
          menu
            ? dockMenuSections({
                equipment: getEquipment(
                  docks.find((x) => x.id === menu.dockId) ?? docks[0],
                ),
                onToggleEquipment: (type) => toggleEquipment(menu.dockId, type),
                onPrint: () => {
                  /* prototype no-op */
                },
                onRename: () => {
                  const d = docks.find((x) => x.id === menu.dockId);
                  if (d) startRename(d);
                },
                onRearrangePosition: () => {
                  setTab("manage");
                  setRearranging(true);
                },
                onEditPriority: () => {
                  setTab("manage");
                  setPrioritizing(true);
                },
                onDelete: () => handleDelete(menu.dockId),
              })
            : []
        }
      />
    </div>
  );
}

function dockMenuSections({
  equipment,
  onToggleEquipment,
  onPrint,
  onRename,
  onRearrangePosition,
  onEditPriority,
  onDelete,
}: {
  equipment: DockEquipment;
  onToggleEquipment: (type: EquipmentType) => void;
  onPrint: () => void;
  onRename: () => void;
  onRearrangePosition: () => void;
  onEditPriority: () => void;
  onDelete: () => void;
}): PopoverSection[] {
  return [
    {
      id: "equipment",
      title: "Equipment eligibility",
      items: EQUIPMENT_TYPES.map((t) => ({
        id: `equipment-${t.id}`,
        label: t.label,
        variant: "switch" as const,
        checked: equipment[t.id],
        onToggle: () => onToggleEquipment(t.id),
      })),
    },
    {
      id: "actions",
      title: "Options",
      items: [
        {
          id: "print",
          label: "Print dock QR",
          icon: <Printer className="size-5 text-ink" strokeWidth={1.75} />,
          onSelect: onPrint,
        },
        {
          id: "rename",
          label: "Rename dock",
          icon: <Pencil className="size-5 text-ink" strokeWidth={1.75} />,
          onSelect: onRename,
        },
        {
          id: "rearrange-position",
          label: "Rearrange dock position",
          icon: <PrismList24 className="size-5 text-ink" />,
          onSelect: onRearrangePosition,
        },
        {
          id: "edit-priority",
          label: "Rearrange dock priority",
          icon: <PrismSortIcon className="size-5 text-ink" />,
          onSelect: onEditPriority,
        },
        {
          id: "delete",
          label: "Delete dock",
          icon: <Trash2 className="size-5 text-ink" strokeWidth={1.75} />,
          onSelect: onDelete,
        },
      ],
    },
  ];
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative -my-px flex-1 h-10 rounded-button text-body-md-strong transition-colors first:-ml-px last:-mr-px",
        active
          ? "z-10 bg-white text-ink ring-2 ring-inset ring-ink"
          : "text-ink-subdued hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

// ============================================================
// Manage docks tab
// ============================================================
function ManageDocksTab({
  docks,
  activeCount,
  rearranging,
  setRearranging,
  prioritizing,
  setPrioritizing,
  priorityOrder,
  reorderPriority,
  renamingId,
  renameValue,
  setRenameValue,
  startRename,
  commitRename,
  cancelRename,
  onToggle,
  onDelete: _onDelete,
  reorder,
  onMenuOpen,
  addingDock,
  addDockValue,
  setAddDockValue,
  startAddDock,
  commitAddDock,
  cancelAddDock,
}: {
  docks: Dock[];
  activeCount: number;
  rearranging: boolean;
  setRearranging: (v: boolean) => void;
  prioritizing: boolean;
  setPrioritizing: (v: boolean) => void;
  priorityOrder: string[];
  reorderPriority: (from: number, to: number) => void;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  startRename: (d: Dock) => void;
  commitRename: () => void;
  cancelRename: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  reorder: (from: number, to: number) => void;
  onMenuOpen: (dockId: string, anchor: DOMRect) => void;
  addingDock: boolean;
  addDockValue: string;
  setAddDockValue: (v: string) => void;
  startAddDock: () => void;
  commitAddDock: () => void;
  cancelAddDock: () => void;
}) {
  void startRename;
  const containerRef = useRef<HTMLDivElement>(null);
  const REARRANGE_ROW_H = 56;
  const [sortBy, setSortBy] = useState<"position" | "priority">("position");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
// @ts-expect-error sort handler kept for reference — wire back up to re-enable column sorting
const onSortClick = (next: "position" | "priority") => {
    if (next === sortBy) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(next);
      setSortDir("desc");
    }
  };
  const [drag, setDrag] = useState<{
    id: string;
    pointerOffset: number;
    cursorY: number;
    containerTop: number;
  } | null>(null);

  // Active mode for the drag overlay
  const mode: "list" | "rearrange" | "priority" = prioritizing
    ? "priority"
    : rearranging
      ? "rearrange"
      : "list";

  const docksById = useMemo(
    () => Object.fromEntries(docks.map((d) => [d.id, d])),
    [docks],
  );
  const sortedDocks: Dock[] = useMemo(() => {
    const base: Dock[] =
      sortBy === "priority"
        ? (priorityOrder.map((id) => docksById[id]).filter(Boolean) as Dock[])
        : docks;
    return sortDir === "asc" ? [...base].reverse() : base;
  }, [sortBy, sortDir, docks, priorityOrder, docksById]);
  // The ordered list of dock objects shown in the overlay (matches whichever
  // ordering the active mode is editing).
  const overlayDocks: Dock[] = useMemo(() => {
    if (mode === "priority") {
      return priorityOrder.map((id) => docksById[id]).filter(Boolean) as Dock[];
    }
    return docks;
  }, [mode, docks, priorityOrder, docksById]);
  const overlayReorder =
    mode === "priority" ? reorderPriority : reorder;

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const draggedTop = e.clientY - drag.pointerOffset - drag.containerTop;
      const targetIdx = Math.max(
        0,
        Math.min(overlayDocks.length - 1, Math.round(draggedTop / REARRANGE_ROW_H)),
      );
      const currentIdx = overlayDocks.findIndex((d) => d.id === drag.id);
      if (currentIdx !== -1 && targetIdx !== currentIdx) {
        overlayReorder(currentIdx, targetIdx);
      }
      setDrag((d) => (d ? { ...d, cursorY: e.clientY } : d));
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, overlayDocks, overlayReorder]);

  const isRenaming = !!renamingId;
  const lockUI = addingDock || isRenaming;
  return (
    <div className="pt-1 flex-1 min-h-0 flex flex-col">
      <div
        className={cn(
          "flex items-center justify-between py-3 bg-white",
          lockUI && "pointer-events-none",
        )}
      >
        {mode === "rearrange" ? (
          <div className={cn(lockUI && "opacity-40")}>
            <p className="text-body-md-strong text-ink">Drag to rearrange dock position</p>
            <p className="text-body-sm text-ink-subdued">
              Position should match how docks are arranged in the warehouse
            </p>
          </div>
        ) : mode === "priority" ? (
          <div className={cn(lockUI && "opacity-40")}>
            <p className="text-body-md-strong text-ink">Drag to assign priority</p>
            <p className="text-body-sm text-ink-subdued">
              Docks at the top of the list will be auto-assigned trucks first
            </p>
          </div>
        ) : (
          <p className={cn("text-body-lg-strong text-ink", lockUI && "opacity-40")}>
            {`${activeCount} active docks`}
          </p>
        )}
        {mode === "rearrange" ? (
          <button
            type="button"
            onClick={() => setRearranging(false)}
            className={cn(
              "h-9 px-3 rounded-button bg-ink text-body-sm-strong text-white hover:opacity-90",
              lockUI && "opacity-40",
            )}
          >
            Done rearranging
          </button>
        ) : mode === "priority" ? (
          <button
            type="button"
            onClick={() => setPrioritizing(false)}
            className={cn(
              "h-9 px-3 rounded-button bg-ink text-body-sm-strong text-white hover:opacity-90",
              lockUI && "opacity-40",
            )}
          >
            Done prioritizing
          </button>
        ) : null
        /* List-level triple-dot button intentionally omitted. To restore, add
           a useRef<HTMLButtonElement>, useState for open + anchor DOMRect, render
           a MoreHorizontal button here, and mount a <PopoverMenu> with items:
           Print all dock QR, Rearrange dock position (setRearranging(true)),
           Rearrange dock priority (setPrioritizing(true)).
        */}
      </div>

      {mode !== "list" ? (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden mt-2 -mx-2 px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className={cn("flex gap-3", addingDock && "opacity-40 pointer-events-none")}>
        <div
          className="flex flex-col shrink-0"
          aria-hidden
          style={{ height: overlayDocks.length * REARRANGE_ROW_H }}
        >
          {overlayDocks.map((_, idx) => (
            <div
              key={idx}
              style={{ height: 48, marginBottom: REARRANGE_ROW_H - 48 }}
              className="w-6 flex items-center justify-start text-body-md text-ink-subdued tabular-nums"
            >
              {mode === "priority" ? priorityLabel(idx) : idx + 1}
            </div>
          ))}
        </div>
        <div
          ref={containerRef}
          className="relative flex-1"
          style={{ height: overlayDocks.length * REARRANGE_ROW_H }}
        >
          {overlayDocks.map((d, idx) => {
            const isDragging = drag?.id === d.id;
            const y = isDragging
              ? drag.cursorY - drag.pointerOffset - drag.containerTop
              : idx * REARRANGE_ROW_H;
            const shortcode = d.uuid.slice(0, 4);
            return (
              <div
                key={d.id}
                onPointerDown={(e) => {
                  const container = containerRef.current;
                  if (!container) return;
                  const row = e.currentTarget;
                  setDrag({
                    id: d.id,
                    pointerOffset: e.clientY - row.getBoundingClientRect().top,
                    cursorY: e.clientY,
                    containerTop: container.getBoundingClientRect().top,
                  });
                  e.preventDefault();
                }}
                style={{
                  transform: `translate3d(0, ${y}px, 0)${isDragging ? " scale(1.02)" : ""}`,
                  transition: isDragging
                    ? "none"
                    : "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 200ms ease",
                  zIndex: isDragging ? 20 : 1,
                }}
                className={cn(
                  "absolute inset-x-0 h-12 flex items-center gap-4 px-4 rounded-card bg-white select-none cursor-grab active:cursor-grabbing touch-none",
                  isDragging ? "border-2 border-ink shadow-drag" : "border border-line",
                )}
              >
                <SixDotGrip className="size-4 text-icon-subdued" />
                <p className="text-body-md-strong text-ink">{d.label}</p>
                <Tooltip label={d.uuid}>
                  <span className="text-body-sm text-ink-subdued underline decoration-dotted decoration-ink-subdued underline-offset-2 cursor-default">
                    {shortcode}
                  </span>
                </Tooltip>
              </div>
            );
          })}
        </div>
        </div>
        </div>
      ) : (
        <>
        {/* Static header strip — stays put while body scrolls */}
        <div
          className={cn(
            "mt-2 rounded-t-card border border-b-0 border-line-hovered bg-[#fafafa] overflow-hidden",
            addingDock && "opacity-40 pointer-events-none",
          )}
        >
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              {isRenaming ? (
                <col />
              ) : (
                <>
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                </>
              )}
            </colgroup>
            <thead>
              <tr>
                {isRenaming ? (
                  <th className="border-b border-line px-4 py-3 text-left text-body-sm-strong text-ink">
                    Dock name
                  </th>
                ) : (
                  <>
                    <th className="border-b border-line px-3 pl-4 py-3 text-left text-body-sm-strong text-ink">
                      <HeaderLabel label="Active" tooltip="Toggle to take this dock out of service. Inactive docks won't accept new truck assignments." />
                    </th>
                    <th className="border-b border-line px-3 py-3 text-left text-body-sm-strong text-ink">
                      <HeaderLabel
                        label="Dock name"
                        tooltip="Should match how docks are named and arranged in the facility."
                      />
                    </th>
                    <th className="border-b border-line px-3 py-3 text-left text-body-sm-strong text-ink">
                      <HeaderLabel
                        label="Dock priority"
                        tooltip="Ranking that determines which dock doors are filled first when trucks are auto-assigned."
                      />
                    </th>
                    <th className="border-b border-line px-3 py-3 text-left text-body-sm-strong text-ink">
                      <HeaderLabel label="Dock ID" tooltip="Unique identifier for this dock." />
                    </th>
                    <th className="border-b border-line px-3 py-3 text-left text-body-sm-strong text-ink whitespace-nowrap">
                      <HeaderLabel label="Equipment eligibility" tooltip="Equipment types this dock can't accept. Trucks with ineligible equipment types won't be auto-assigned." />
                    </th>
                    <th className="border-b border-line px-3 pr-4 py-3 text-right text-body-sm-strong text-ink">Actions</th>
                  </>
                )}
              </tr>
            </thead>
          </table>
        </div>
        {/* Scrolling body + Add dock — scrollbar hidden, frame above/below stays still */}
        <div
          className="flex-1 min-h-0 overflow-y-auto flex flex-col pb-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div
            className={cn(
              "shrink-0 rounded-b-card border border-t-0 border-line-hovered bg-white overflow-hidden",
              addingDock && "opacity-40 pointer-events-none",
            )}
          >
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                {isRenaming ? (
                  <col />
                ) : (
                  <>
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                  </>
                )}
              </colgroup>
              <tbody>
                {sortedDocks.map((d, idx) => (
                  <ManageDockRow
                    key={d.id}
                    dock={d}
                    priority={priorityLabel(priorityOrder.indexOf(d.id))}
                    isLast={idx === sortedDocks.length - 1}
                    isRenaming={renamingId === d.id}
                    hideExtraColumns={isRenaming}
                    nameOnly={isRenaming}
                    dimmed={isRenaming && renamingId !== d.id}
                    renameValue={renameValue}
                    setRenameValue={setRenameValue}
                    commitRename={commitRename}
                    cancelRename={cancelRename}
                    onToggle={() => onToggle(d.id)}
                    onMenuOpen={(rect) => onMenuOpen(d.id, rect)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {isRenaming ? null : addingDock ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-body-md-strong text-ink mr-1">Dock</span>
              <input
                autoFocus
                value={addDockValue}
                onChange={(e) => setAddDockValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitAddDock();
                  if (e.key === "Escape") cancelAddDock();
                }}
                className="h-10 px-3 rounded-button border border-line-strong bg-white text-body-md-strong text-ink w-40 focus:outline-none focus:border-ink"
              />
              <button
                type="button"
                onClick={cancelAddDock}
                className="h-10 px-4 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitAddDock}
                disabled={!addDockValue.trim()}
                className={cn(
                  "h-10 px-4 rounded-button text-body-md-strong",
                  addDockValue.trim()
                    ? "bg-ink text-white hover:opacity-90"
                    : "bg-surface-strong text-icon-disabled cursor-not-allowed",
                )}
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startAddDock}
              disabled={isRenaming}
              className={cn(
                "mt-3 self-start shrink-0 h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered",
                isRenaming && "opacity-40 pointer-events-none",
              )}
            >
              <PrismPlus16 className="size-4" />
              Add dock
            </button>
          )}
        </div>
        </>
      )}
    </div>
  );
}

function priorityLabel(idx: number): string {
  const n = idx + 1;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function HeaderLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Tooltip label={tooltip} wide>
      <span className="underline decoration-dotted decoration-ink-subdued underline-offset-4 cursor-help">
        {label}
      </span>
    </Tooltip>
  );
}

// @ts-expect-error sortable header kept for reference — re-add to a column to re-enable sorting
function SortableHeaderLabel({
  label,
  tooltip,
  active,
  dir,
}: {
  label: string;
  tooltip: string;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Tooltip label={tooltip} wide>
        <span className="underline decoration-dotted decoration-ink-subdued underline-offset-4">
          {label}
        </span>
      </Tooltip>
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="size-3.5 text-ink" strokeWidth={2.5} />
        ) : (
          <ArrowDown className="size-3.5 text-ink" strokeWidth={2.5} />
        )
      ) : (
        <ChevronsUpDown className="size-3.5 text-icon-subdued" strokeWidth={2} />
      )}
    </span>
  );
}

function ManageDockRow({
  dock,
  priority,
  isLast,
  isRenaming,
  hideExtraColumns,
  nameOnly,
  dimmed,
  renameValue,
  setRenameValue,
  commitRename,
  cancelRename,
  onToggle,
  onMenuOpen,
}: {
  dock: Dock;
  priority: string;
  isLast: boolean;
  isRenaming: boolean;
  hideExtraColumns: boolean;
  nameOnly?: boolean;
  dimmed: boolean;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  cancelRename: () => void;
  onToggle: () => void;
  onMenuOpen: (rect: DOMRect) => void;
}) {
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const shortcode = dock.uuid.slice(0, 4);
  const equipment = getEquipment(dock);
  const enabled = equipmentEnabledCount(equipment);
  const total = EQUIPMENT_TYPES.length;
  const tdBorder = isLast ? "" : "border-b border-line";
  const tdBase = "px-3 py-3 text-body-md text-ink align-middle";
  return (
    <tr className={cn("select-none", dimmed && "opacity-40 pointer-events-none")}>
      {!nameOnly && (
        <td className={cn(tdBase, tdBorder)}>
          <Switch checked={dock.active} onChange={onToggle} />
        </td>
      )}
      <td className={cn(tdBase, tdBorder, nameOnly && "pl-4")}>
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") cancelRename();
              }}
              className="h-10 px-3 rounded-button border border-line-strong bg-white text-body-md-strong text-ink w-40 focus:outline-none focus:border-ink"
            />
            {nameOnly && (
              <>
                <button
                  type="button"
                  onClick={cancelRename}
                  className="h-10 px-4 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commitRename}
                  disabled={!renameValue.trim()}
                  className={cn(
                    "h-10 px-4 rounded-button text-body-md-strong",
                    renameValue.trim()
                      ? "bg-ink text-white hover:opacity-90"
                      : "bg-surface-strong text-icon-disabled cursor-not-allowed",
                  )}
                >
                  Save
                </button>
              </>
            )}
          </div>
        ) : (
          <span className="text-body-md-strong text-ink">{dock.label}</span>
        )}
      </td>
      {!hideExtraColumns && (
        <>
          <td className={cn(tdBase, tdBorder)}>
            <span className="text-body-md-strong text-ink">{priority}</span>
          </td>
          <td className={cn(tdBase, tdBorder)}>
            <Tooltip label={dock.uuid}>
              <span className="text-body-sm text-ink underline decoration-dotted decoration-ink-subdued underline-offset-2 cursor-default">
                {shortcode}
              </span>
            </Tooltip>
          </td>
          <td className={cn(tdBase, tdBorder)}>
            <EquipmentTooltip equipment={equipment}>
              <span className="inline-flex items-center gap-1.5 text-body-sm text-ink underline decoration-dotted decoration-ink-subdued underline-offset-2 cursor-default">
                <Truck className="size-4" strokeWidth={1.75} />
                {enabled} of {total}
              </span>
            </EquipmentTooltip>
          </td>
          <td className={cn(tdBase, tdBorder, "text-right")}>
            <button
              ref={menuBtnRef}
              type="button"
              aria-label={`${dock.label} options`}
              onClick={(e) => {
                e.stopPropagation();
                const rect = menuBtnRef.current?.getBoundingClientRect();
                if (rect) onMenuOpen(rect);
              }}
              className="size-7 inline-grid place-items-center rounded-button hover:bg-surface-hovered"
            >
              <MoreHorizontal className="size-5 text-icon" />
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

/**
 * Rich tooltip showing eligible equipment as a checklist. Mirrors the styling
 * of the simple Tooltip component but supports multi-line ReactNode content.
 */
function EquipmentTooltip({
  equipment,
  children,
}: {
  equipment: DockEquipment;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const tt = tooltipRef.current;
    const w = tt?.offsetWidth ?? 240;
    const h = tt?.offsetHeight ?? 160;
    const above = tr.top - h - 8;
    const below = tr.bottom + 8;
    const top = above < 8 ? below : above;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, tr.left + tr.width / 2 - w / 2));
    setPos({ left, top });
  }, [open]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="relative inline-flex"
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="pointer-events-none fixed z-[100] px-3 py-2 rounded-button bg-ink text-white text-body-sm shadow-drag min-w-[220px]"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
          >
            <span className="block text-body-sm-strong mb-1">Eligible equipment</span>
            <span className="block space-y-0.5">
              {EQUIPMENT_TYPES.map((t) => {
                const on = equipment[t.id];
                return (
                  <span key={t.id} className="flex items-center gap-2 whitespace-nowrap">
                    {on ? (
                      <Check className="size-4 shrink-0" strokeWidth={2} />
                    ) : (
                      <X className="size-4 shrink-0" strokeWidth={2} />
                    )}
                    <span className={cn(!on && "text-[#d6d6d6]")}>{t.label}</span>
                  </span>
                );
              })}
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={cn(
        "relative w-9 h-5 rounded-tag transition-colors shrink-0",
        checked ? "bg-ink" : "bg-line-strong",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white transition-all",
          checked ? "left-[18px]" : "left-0.5",
        )}
      />
    </button>
  );
}

// ============================================================
// Dock priority tab
// ============================================================
// @ts-expect-error unused legacy component, kept for reference
function DockPriorityTab({
  docks,
  priorityOrder,
  reorder,
}: {
  docks: Dock[];
  priorityOrder: string[];
  reorder: (from: number, to: number) => void;
}) {
  const docksById = useMemo(() => Object.fromEntries(docks.map((d) => [d.id, d])), [docks]);
  const containerRef = useRef<HTMLDivElement>(null);
  const ROW_H = 56; // card height + gap (px)
  const [drag, setDrag] = useState<{
    id: string;
    pointerOffset: number; // cursorY - row.top at pickup
    cursorY: number;
    containerTop: number;
  } | null>(null);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const draggedTop = e.clientY - drag.pointerOffset - drag.containerTop;
      const targetIdx = Math.max(
        0,
        Math.min(priorityOrder.length - 1, Math.round(draggedTop / ROW_H)),
      );
      const currentIdx = priorityOrder.indexOf(drag.id);
      if (currentIdx !== -1 && targetIdx !== currentIdx) {
        reorder(currentIdx, targetIdx);
      }
      setDrag((d) => (d ? { ...d, cursorY: e.clientY } : d));
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, priorityOrder, reorder]);

  return (
    <div className="pt-1 flex-1 min-h-0 flex flex-col overflow-y-auto -mx-2 px-2">
      <div className="py-3 sticky top-0 bg-white z-10">
        <p className="text-body-md-strong text-ink">Drag to assign priority</p>
        <p className="text-body-sm text-ink-subdued">
          Docks at the top of the list will be auto-assigned trucks first
        </p>
      </div>
      <div className="mt-3 flex gap-3">
        {/* Priority number column — static slots, never moves */}
        <div
          className="flex flex-col shrink-0"
          aria-hidden
          style={{ height: priorityOrder.length * ROW_H }}
        >
          {priorityOrder.map((_, idx) => (
            <div
              key={idx}
              style={{ height: 48, marginBottom: ROW_H - 48 }}
              className="w-6 flex items-center justify-start text-body-md text-ink-subdued tabular-nums"
            >
              {idx + 1}
            </div>
          ))}
        </div>
        <div
          ref={containerRef}
          className="relative flex-1"
          style={{ height: priorityOrder.length * ROW_H }}
        >
          {priorityOrder.map((dockId, idx) => {
            const d = docksById[dockId];
            if (!d) return null;
            const isDragging = drag?.id === d.id;
            const y = isDragging
              ? drag.cursorY - drag.pointerOffset - drag.containerTop
              : idx * ROW_H;
            return (
              <div
                key={d.id}
                data-row
                onPointerDown={(e) => {
                  const container = containerRef.current;
                  if (!container) return;
                  const row = e.currentTarget;
                  setDrag({
                    id: d.id,
                    pointerOffset: e.clientY - row.getBoundingClientRect().top,
                    cursorY: e.clientY,
                    containerTop: container.getBoundingClientRect().top,
                  });
                  e.preventDefault();
                }}
                style={{
                  transform: `translate3d(0, ${y}px, 0)${isDragging ? " scale(1.02)" : ""}`,
                  transition: isDragging
                    ? "none"
                    : "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 200ms ease",
                  zIndex: isDragging ? 20 : 1,
                }}
                className={cn(
                  "absolute inset-x-0 h-12 flex items-center gap-4 px-4 rounded-card bg-white select-none cursor-grab active:cursor-grabbing touch-none",
                  isDragging ? "border-2 border-ink shadow-drag" : "border border-line",
                )}
              >
                <SixDotGrip className="size-4 text-icon-subdued" />
                <p className="text-body-md-strong text-ink">{d.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Prism 16/plus icon. */
function PrismPlus16({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M7 14V9H2C1.44772 9 1 8.55228 1 8C1 7.44772 1.44772 7 2 7H7V2C7 1.44772 7.44772 1 8 1C8.55228 1 9 1.44772 9 2V7H14C14.5523 7 15 7.44772 15 8C15 8.55228 14.5523 9 14 9H9V14C9 14.5523 8.55228 15 8 15C7.44772 15 7 14.5523 7 14Z" fill="currentColor" />
    </svg>
  );
}

/** Prism 24/list icon — bulleted list (3 rows, dot + line). Paths from Figma node 124:99221 (24/list). */
function PrismList24({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <g transform="translate(2.5 4.5)">
        <path d="M1.5 12C2.32843 12 3 12.6716 3 13.5C2.99993 14.3284 2.32839 15 1.5 15C0.671726 14.9999 6.59509e-05 14.3283 0 13.5C0 12.6717 0.671685 12.0001 1.5 12Z" />
        <path d="M18.5 12.5C19.0523 12.5 19.5 12.9477 19.5 13.5C19.5 14.0523 19.0523 14.5 18.5 14.5H6.5C5.94783 14.4999 5.5 14.0522 5.5 13.5C5.5 12.9478 5.94783 12.5001 6.5 12.5H18.5Z" />
        <path d="M1.5 6C2.32843 6 3 6.67157 3 7.5C2.99993 8.32837 2.32839 9 1.5 9C0.671726 8.99987 6.59509e-05 8.32829 0 7.5C0 6.67165 0.671685 6.00013 1.5 6Z" />
        <path d="M18.5 6.5C19.0523 6.5 19.5 6.94772 19.5 7.5C19.5 8.05228 19.0523 8.5 18.5 8.5H6.5C5.94783 8.49987 5.5 8.0522 5.5 7.5C5.5 6.9478 5.94783 6.50013 6.5 6.5H18.5Z" />
        <path d="M1.5 0C2.32843 0 3 0.671573 3 1.5C2.99993 2.32837 2.32839 3 1.5 3C0.671726 2.99987 6.59509e-05 2.32829 0 1.5C0 0.671654 0.671685 0.000131938 1.5 0Z" />
        <path d="M18.5 0.5C19.0523 0.5 19.5 0.947715 19.5 1.5C19.4999 2.05223 19.0522 2.5 18.5 2.5H6.5C5.94787 2.49987 5.50007 2.05215 5.5 1.5C5.5 0.947797 5.94783 0.500132 6.5 0.5H18.5Z" />
      </g>
    </svg>
  );
}

/** Prism 24/sort icon — two arrows, up and down. Path traced from Figma node 4404:100696. */
function PrismSortIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 23 17.1714"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M16.4999 1.08579C16.4999 0.533502 16.9476 0.0857865 17.4999 0.0857865C18.0522 0.0857865 18.4999 0.533502 18.4999 1.08579V14.1717L21.2929 11.3788C21.6834 10.9882 22.3164 10.9882 22.7069 11.3788C23.0974 11.7693 23.0974 12.4023 22.7069 12.7928L18.9139 16.5858C18.1329 17.3666 16.8668 17.3666 16.0858 16.5858L12.2929 12.7928C11.9024 12.4023 11.9024 11.7693 12.2929 11.3788C12.6834 10.9882 13.3164 10.9882 13.7069 11.3788L16.4999 14.1717V1.08579ZM4.49989 16.0858V2.99985L1.70692 5.79282C1.31641 6.18324 0.683361 6.18324 0.292856 5.79282C-0.0976436 5.40232 -0.0975934 4.76929 0.292856 4.37876L4.08582 0.585786C4.86687 -0.195263 6.1329 -0.195261 6.91395 0.585786L10.7069 4.37876C11.0974 4.76929 11.0974 5.40232 10.7069 5.79282C10.3164 6.18324 9.68336 6.18324 9.29286 5.79282L6.49989 2.99985V16.0858C6.49981 16.638 6.05212 17.0858 5.49989 17.0858C4.94765 17.0858 4.49997 16.638 4.49989 16.0858Z" />
    </svg>
  );
}

/** 6-dot drag handle (2 columns × 3 rows) matching the Figma design. */
function SixDotGrip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <circle cx="6" cy="3.5" r="1.25" />
      <circle cx="10" cy="3.5" r="1.25" />
      <circle cx="6" cy="8" r="1.25" />
      <circle cx="10" cy="8" r="1.25" />
      <circle cx="6" cy="12.5" r="1.25" />
      <circle cx="10" cy="12.5" r="1.25" />
    </svg>
  );
}

// ============================================================
// Dock schedule tab
// ============================================================
function DockScheduleTab({
  recv,
  setRecv,
  ship,
  setShip,
}: {
  recv: Hours;
  setRecv: (h: Hours) => void;
  ship: Hours;
  setShip: (h: Hours) => void;
}) {
  return (
    <div className="pt-4 space-y-6 flex-1 min-h-0 overflow-y-auto">
      <HoursSection
        title="Receiving hours"
        subtitle="Hours inbound trucks can be auto-assigned to a dock"
        hours={recv}
        onChange={setRecv}
      />
      <HoursSection
        title="Shipping hours"
        subtitle="Hours outbound trucks can be auto-assigned to a dock"
        hours={ship}
        onChange={setShip}
      />
    </div>
  );
}

function HoursSection({
  title,
  subtitle,
  hours,
  onChange,
}: {
  title: string;
  subtitle: string;
  hours: Hours;
  onChange: (h: Hours) => void;
}) {
  return (
    <div>
      <p className="text-body-md-strong text-ink">{title}</p>
      <p className="text-body-sm text-ink-subdued mb-3">{subtitle}</p>
      <div className="flex items-center gap-3">
        <TimeDropdown
          value={hours.startMinutes}
          onChange={(v) => onChange({ ...hours, startMinutes: v })}
          // Start must be strictly before end; the 30-min step keeps them apart.
          max={hours.endMinutes - 30}
        />
        <ArrowRight className="size-5 text-icon-subdued shrink-0" />
        <TimeDropdown
          value={hours.endMinutes}
          onChange={(v) => onChange({ ...hours, endMinutes: v })}
          // End must be strictly after start.
          min={hours.startMinutes + 30}
        />
      </div>
    </div>
  );
}

function fmtTimeOfDay(m: number): string {
  const wrapped = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${mm.toString().padStart(2, "0")} ${period}`;
}

/**
 * Time dropdown styled to match the rest of the popover UI.
 * 30-minute increments. `min`/`max` (inclusive) gate which values can be picked
 * so the user can't pick a start ≥ end (or vice versa).
 */
function TimeDropdown({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const out: number[] = [];
    for (let m = 0; m <= 24 * 60; m += 30) {
      if (min !== undefined && m < min) continue;
      if (max !== undefined && m > max) continue;
      out.push(m);
    }
    return out;
  }, [min, max]);

  // Click outside / Escape closes the dropdown
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const id = setTimeout(
      () => document.addEventListener("pointerdown", onDown, true),
      0,
    );
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-scroll current value into view when the list opens
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-time="${value}"]`);
    el?.scrollIntoView({ block: "center" });
  }, [open, value]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "h-10 min-w-[140px] px-3 inline-flex items-center justify-between gap-2 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered",
          open && "border-ink",
        )}
      >
        <span>{fmtTimeOfDay(value)}</span>
        <ChevronDown className={cn("size-4 text-icon-subdued transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white rounded-button border border-line shadow-drag py-1"
        >
          {options.map((m) => {
            const selected = m === value;
            return (
              <button
                key={m}
                type="button"
                role="option"
                aria-selected={selected}
                data-time={m}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-body-md",
                  selected
                    ? "bg-surface-hovered text-ink font-semibold"
                    : "text-ink hover:bg-surface-hovered",
                )}
              >
                {fmtTimeOfDay(m)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
