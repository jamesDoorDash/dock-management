import { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  ListOrdered,
  MoreHorizontal,
  Printer,
  Pencil,
  Trash2,
  Plus,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import type { Dock } from "../data/types";
import { Tooltip } from "./Tooltip";
import { PopoverMenu, type PopoverItem } from "./PopoverMenu";
import { cn } from "../lib/cn";

type Tab = "manage" | "priority" | "schedule";

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
}

export function DockSettingsModal({
  open,
  onClose,
  docks: docksProp,
  priorityOrder: priorityOrderProp,
  receivingHours: receivingHoursProp,
  shippingHours: shippingHoursProp,
  onSave,
}: Props) {
  const [tab, setTab] = useState<Tab>("manage");
  // Local draft state
  const [docks, setDocks] = useState<Dock[]>(docksProp);
  const [priorityOrder, setPriorityOrder] = useState<string[]>(priorityOrderProp);
  const [rearranging, setRearranging] = useState(false);
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
      <div className="relative z-10 w-[640px] max-w-[92vw] h-[80vh] min-h-[560px] max-h-[800px] bg-white rounded-card shadow-drag flex flex-col">
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
              (addingDock || rearranging) && "opacity-40 pointer-events-none",
            )}
            aria-disabled={addingDock || rearranging || undefined}
          >
            <TabButton active={tab === "manage"} onClick={() => setTab("manage")}>
              Manage docks
            </TabButton>
            <TabButton active={tab === "priority"} onClick={() => setTab("priority")}>
              Dock priority
            </TabButton>
            <TabButton active={tab === "schedule"} onClick={() => setTab("schedule")}>
              Dock schedule
            </TabButton>
          </div>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-2">
          {tab === "manage" && (
            <ManageDocksTab
              docks={docks}
              activeCount={activeCount}
              rearranging={rearranging}
              setRearranging={setRearranging}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              startRename={startRename}
              commitRename={commitRename}
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
          {tab === "priority" && (
            <DockPriorityTab docks={docks} priorityOrder={priorityOrder} reorder={reorderPriority} />
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
            disabled={addingDock || rearranging}
            className={cn(
              "h-10 px-4 rounded-button text-body-md-strong",
              addingDock || rearranging
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
        items={dockMenuItems({
          onPrint: () => {
            /* prototype no-op */
          },
          onRename: () => {
            if (!menu) return;
            const d = docks.find((x) => x.id === menu.dockId);
            if (d) startRename(d);
          },
          onDelete: () => menu && handleDelete(menu.dockId),
        })}
      />
    </div>
  );
}

function dockMenuItems({
  onPrint,
  onRename,
  onDelete,
}: {
  onPrint: () => void;
  onRename: () => void;
  onDelete: () => void;
}): PopoverItem[] {
  return [
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
      id: "delete",
      label: "Delete dock",
      icon: <Trash2 className="size-5 text-ink" strokeWidth={1.75} />,
      onSelect: onDelete,
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
  renamingId,
  renameValue,
  setRenameValue,
  startRename,
  commitRename,
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
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  startRename: (d: Dock) => void;
  commitRename: () => void;
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
  const listRef = useRef<HTMLUListElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (dragIdx == null) return;
    const onMove = (e: PointerEvent) => {
      const list = listRef.current;
      if (!list) return;
      const items = Array.from(list.children) as HTMLElement[];
      let bestIdx = dragIdx;
      let bestDist = Infinity;
      for (let i = 0; i < items.length; i++) {
        const r = items[i].getBoundingClientRect();
        const dist = Math.abs(e.clientY - (r.top + r.height / 2));
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      if (bestIdx !== dragIdx) {
        reorder(dragIdx, bestIdx);
        setDragIdx(bestIdx);
      }
    };
    const onUp = () => setDragIdx(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragIdx, reorder]);

  return (
    <div className="pt-1">
      <div
        className={cn(
          "flex items-center justify-between py-3 sticky top-0 bg-white z-10 -mx-2 px-2 border-b border-line",
          addingDock && "opacity-40 pointer-events-none",
        )}
      >
        <p className="text-body-md-strong text-ink">
          {rearranging ? "Drag to rearrange dock order" : `${activeCount} active docks`}
        </p>
        {rearranging ? (
          <button
            type="button"
            onClick={() => setRearranging(false)}
            className="h-9 px-3 rounded-button bg-ink text-body-sm-strong text-white hover:opacity-90"
          >
            Done rearranging
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setRearranging(true)}
            className="h-9 px-3 rounded-button border border-line-strong bg-white text-body-sm-strong text-ink hover:bg-surface-hovered inline-flex items-center gap-1.5"
          >
            <ListOrdered className="size-4" />
            Rearrange docks
          </button>
        )}
      </div>

      <ul
        ref={listRef}
        className={cn("py-1", addingDock && "opacity-40 pointer-events-none")}
      >
        {docks.map((d, idx) => (
          <ManageDockRow
            key={d.id}
            dock={d}
            rearranging={rearranging}
            isDragging={idx === dragIdx}
            isRenaming={renamingId === d.id}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            commitRename={commitRename}
            onToggle={() => onToggle(d.id)}
            onMenuOpen={(rect) => onMenuOpen(d.id, rect)}
            onDragStart={
              rearranging
                ? (e) => {
                    setDragIdx(idx);
                    e.preventDefault();
                  }
                : undefined
            }
          />
        ))}
      </ul>

      {addingDock ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-body-md-strong text-ink">Dock</span>
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
          <button
            type="button"
            onClick={cancelAddDock}
            className="h-10 px-4 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startAddDock}
          className="mt-3 inline-flex items-center gap-1.5 text-body-md-strong text-ink hover:text-ink-subdued"
        >
          <Plus className="size-4" />
          Add dock
        </button>
      )}
    </div>
  );
}

function ManageDockRow({
  dock,
  rearranging,
  isDragging,
  isRenaming,
  renameValue,
  setRenameValue,
  commitRename,
  onToggle,
  onMenuOpen,
  onDragStart,
}: {
  dock: Dock;
  rearranging: boolean;
  isDragging: boolean;
  isRenaming: boolean;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  onToggle: () => void;
  onMenuOpen: (rect: DOMRect) => void;
  onDragStart?: (e: React.PointerEvent) => void;
}) {
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const shortcode = dock.uuid.slice(0, 4);
  return (
    <li
      className={cn(
        "flex items-center gap-3 py-2 border-b border-line last:border-b-0 select-none",
        isDragging && "bg-surface-hovered shadow-card relative z-10",
      )}
    >
      {rearranging ? (
        <button
          type="button"
          aria-label={`Drag ${dock.label}`}
          onPointerDown={onDragStart}
          className="cursor-grab active:cursor-grabbing touch-none text-icon-subdued hover:text-ink"
        >
          <SixDotGrip className="size-4" />
        </button>
      ) : (
        <Switch checked={dock.active} onChange={onToggle} disabled={rearranging} />
      )}
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") commitRename();
          }}
          className="h-8 px-2 rounded-button border border-line-strong bg-white text-body-md-strong text-ink w-32 focus:outline-none focus:border-ink"
        />
      ) : (
        <p className="text-body-md-strong text-ink">{dock.label}</p>
      )}
      <Tooltip label={dock.uuid}>
        <span className="text-body-sm text-ink-subdued underline decoration-dotted decoration-ink-subdued underline-offset-2 cursor-default">
          {shortcode}
        </span>
      </Tooltip>
      {!rearranging && (
        <div className="ml-auto flex items-center gap-1">
          <button
            ref={menuBtnRef}
            type="button"
            aria-label={`${dock.label} options`}
            onClick={(e) => {
              e.stopPropagation();
              const rect = menuBtnRef.current?.getBoundingClientRect();
              if (rect) onMenuOpen(rect);
            }}
            className="size-7 grid place-items-center rounded-button hover:bg-surface-hovered"
          >
            <MoreHorizontal className="size-5 text-icon-subdued" />
          </button>
        </div>
      )}
    </li>
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
  const listRef = useRef<HTMLUListElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Global pointer move/up while a row is being dragged
  useEffect(() => {
    if (dragIdx == null) return;
    const onMove = (e: PointerEvent) => {
      const list = listRef.current;
      if (!list) return;
      const items = Array.from(list.children) as HTMLElement[];
      // Find the row whose vertical midpoint is closest to the cursor
      let bestIdx = dragIdx;
      let bestDist = Infinity;
      for (let i = 0; i < items.length; i++) {
        const r = items[i].getBoundingClientRect();
        const dist = Math.abs(e.clientY - (r.top + r.height / 2));
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      if (bestIdx !== dragIdx) {
        reorder(dragIdx, bestIdx);
        setDragIdx(bestIdx);
      }
    };
    const onUp = () => setDragIdx(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragIdx, reorder]);

  return (
    <div className="pt-1">
      <div className="py-3 sticky top-0 bg-white z-10 -mx-2 px-2 border-b border-line">
        <p className="text-body-md-strong text-ink">Drag to assign priority</p>
        <p className="text-body-sm text-ink-subdued">
          Docks at the top of the list will be auto-assigned trucks first
        </p>
      </div>
      <ul ref={listRef} className="py-1">
        {priorityOrder.map((dockId, idx) => {
          const d = docksById[dockId];
          if (!d) return null;
          const isDragging = idx === dragIdx;
          return (
            <li
              key={d.id}
              className={cn(
                "flex items-center gap-4 py-3 border-b border-line last:border-b-0 select-none",
                isDragging && "bg-surface-hovered shadow-card relative z-10",
              )}
            >
              <button
                type="button"
                aria-label={`Drag ${d.label}`}
                onPointerDown={(e) => {
                  setDragIdx(idx);
                  e.preventDefault();
                }}
                className="cursor-grab active:cursor-grabbing touch-none text-icon-subdued hover:text-ink"
              >
                <SixDotGrip className="size-4" />
              </button>
              <p className="text-body-md-strong text-ink w-20 shrink-0">{d.label}</p>
              <span className="text-body-md text-ink-subdued">Priority {idx + 1}</span>
            </li>
          );
        })}
      </ul>
    </div>
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
    <div className="pt-4 space-y-6">
      <HoursSection
        title="Receiving hours"
        subtitle="Hours trucks can be unloaded at this facility"
        hours={recv}
        onChange={setRecv}
      />
      <HoursSection
        title="Shipping hours"
        subtitle="Hours trucks can be loaded at this facility"
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
