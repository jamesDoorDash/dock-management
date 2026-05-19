import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { TODAY_ISO } from "../data/mock";

interface Props {
  /** Currently-selected date as ISO yyyy-mm-dd. */
  value: string;
  onChange: (iso: string) => void;
  onClose: () => void;
  /** Anchor button — clicks inside it should NOT close the popover (the toggle handles that). */
  anchorRef: React.RefObject<HTMLElement | null>;
}

function fromIso(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthName(d: Date) {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function buildMonthGrid(monthStart: Date) {
  // 6 rows × 7 cols, starting on Monday
  const first = new Date(monthStart);
  const dayOfWeek = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - dayOfWeek);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export function SingleDatePicker({ value, onChange, onClose, anchorRef }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedDate = useMemo(() => fromIso(value), [value]);
  const todayDate = useMemo(() => fromIso(TODAY_ISO), []);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(selectedDate));

  // Click-away + Escape
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
  }, [onClose, anchorRef]);

  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 z-50 mt-2 w-[320px] rounded-card border border-line-hovered bg-white p-4 shadow-drag"
    >
      {/* Month header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-button text-icon-subdued hover:bg-surface-hovered hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="text-body-md-strong text-ink">{monthName(viewMonth)}</div>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-button text-icon-subdued hover:bg-surface-hovered hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7 text-center text-body-sm text-ink-subdued">
        {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d) => {
          const inMonth = d.getMonth() === viewMonth.getMonth();
          const isToday = isSameDay(d, todayDate);
          const isSelected = isSameDay(d, selectedDate);

          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => {
                onChange(toIso(d));
                onClose();
              }}
              className={cn(
                "relative flex h-9 items-center justify-center rounded-button text-body-md outline-none transition-colors",
                !inMonth && "text-ink-subdued/60",
                inMonth && !isSelected && "text-ink",
                isSelected && "bg-ink font-bold text-white",
                isToday && !isSelected && "ring-1 ring-inset ring-ink",
                !isSelected && "hover:bg-surface-hovered",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
