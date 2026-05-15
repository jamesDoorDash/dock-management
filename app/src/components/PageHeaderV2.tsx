import { Calendar, ChevronLeft, ChevronRight, Minus, Plus, Pause, Settings } from "lucide-react";
import { formatDateLabel } from "../lib/time";
import { cn } from "../lib/cn";

interface Hours {
  startMinutes: number;
  endMinutes: number;
}

interface Props {
  dateIso: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  zoom: "compact" | "expanded";
  onZoomIn: () => void;
  onZoomOut: () => void;
  blockingMode: boolean;
  onEnterBlockingMode: () => void;
  onExitBlockingMode: () => void;
  onDockSettings?: () => void;
  receivingHours: Hours;
  shippingHours: Hours;
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

export function PageHeaderV2({
  dateIso,
  onPrevDay,
  onNextDay,
  onToday,
  zoom,
  onZoomIn,
  onZoomOut,
  blockingMode,
  onEnterBlockingMode,
  onExitBlockingMode,
  onDockSettings,
  receivingHours,
  shippingHours,
}: Props) {
  const zoomOutDisabled = zoom === "compact";
  const zoomInDisabled = zoom === "expanded";

  return (
    <div className="px-10 pt-8 pb-4">
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <h1 className="text-display-lg text-ink">Dock management</h1>
          <p className="mt-2 text-body-md text-ink-subdued">
            Drag trucks to adjust schedule
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <HoursRow label="Receiving hours:" range={receivingHours} />
          <HoursRow label="Shipping hours:" range={shippingHours} />
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

          <div className="w-px h-6 bg-line mx-2" />

          <button
            type="button"
            onClick={onZoomOut}
            disabled={zoomOutDisabled}
            className={cn(
              "h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong",
              zoomOutDisabled ? "text-icon-disabled cursor-not-allowed" : "text-ink hover:bg-surface-hovered",
            )}
          >
            <Minus className="size-5" />
            Zoom out
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            disabled={zoomInDisabled}
            className={cn(
              "h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong",
              zoomInDisabled ? "text-icon-disabled cursor-not-allowed" : "text-ink hover:bg-surface-hovered",
            )}
          >
            Zoom in
            <Plus className="size-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {blockingMode ? (
            <button
              type="button"
              onClick={onExitBlockingMode}
              className="h-10 px-4 inline-flex items-center gap-1 rounded-button bg-ink text-body-md-strong text-white hover:opacity-90"
            >
              Finished blocking time
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onEnterBlockingMode}
                className="h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
              >
                <Pause className="size-5" />
                Add blocked time
              </button>
              <button
                type="button"
                onClick={onDockSettings}
                className="h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
              >
                <Settings className="size-5" />
                Dock settings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
