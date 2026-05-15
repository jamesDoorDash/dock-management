import { Calendar, ChevronLeft, ChevronRight, Sparkles, Info } from "lucide-react";
import { FACILITY } from "../data/mock";
import { formatDateLabel } from "../lib/time";
import { cn } from "../lib/cn";

interface Props {
  dateIso: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  autoAssign: boolean;
  onToggleAutoAssign: () => void;
}

function HoursRow({ label, range }: { label: string; range: { startMinutes: number; endMinutes: number } }) {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = ((h + 11) % 12) + 1;
    return `${hour12}:00 ${period}`;
  };
  return (
    <div className="flex items-center gap-2 text-body-md">
      <span className="text-ink-subdued">{label}</span>
      <span className="font-medium text-ink">
        {fmt(range.startMinutes)} → {fmt(range.endMinutes)}
      </span>
    </div>
  );
}

export function PageHeader({
  dateIso,
  onPrevDay,
  onNextDay,
  onToday,
  autoAssign,
  onToggleAutoAssign,
}: Props) {
  return (
    <div className="px-10 pt-8 pb-4 border-b border-line">
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <h1 className="text-display-lg text-ink">Dock management</h1>
          <p className="mt-2 text-body-md text-ink-subdued">
            Drag trucks to assign and adjust schedule
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <HoursRow label="Receiving hours:" range={FACILITY.receivingHours} />
          <HoursRow label="Shipping hours:" range={FACILITY.shippingHours} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToday}
            className="h-10 px-3 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onPrevDay}
            className="size-10 grid place-items-center rounded-button border border-line-strong bg-white hover:bg-surface-hovered"
            aria-label="Previous day"
          >
            <ChevronLeft className="size-5 text-ink" />
          </button>
          <button
            type="button"
            className="h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
          >
            <Calendar className="size-5 text-ink" />
            {formatDateLabel(dateIso)}
          </button>
          <button
            type="button"
            onClick={onNextDay}
            className="size-10 grid place-items-center rounded-button border border-line-strong bg-white hover:bg-surface-hovered"
            aria-label="Next day"
          >
            <ChevronRight className="size-5 text-ink" />
          </button>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <Sparkles className="size-5 text-ink" />
          <span className="inline-flex items-center gap-2 text-body-lg-strong text-ink">
            Automatically assign
            <Info className="size-4 text-icon-subdued" />
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autoAssign}
            onClick={onToggleAutoAssign}
            className={cn(
              "relative w-[51px] h-[31px] rounded-tag transition-colors",
              autoAssign ? "bg-ink" : "bg-line-strong",
            )}
          >
            <span
              className={cn(
                "absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_1px_4px_rgba(25,25,25,0.2)] transition-all",
                autoAssign ? "left-[22px]" : "left-[2px]",
              )}
            />
          </button>
        </label>
      </div>
    </div>
  );
}
