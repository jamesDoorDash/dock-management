import { useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Minus, Plus, Settings } from "lucide-react";

function PrismPlus16({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 14V9H2C1.44772 9 1 8.55228 1 8C1 7.44772 1.44772 7 2 7H7V2C7 1.44772 7.44772 1 8 1C8.55228 1 9 1.44772 9 2V7H14C14.5523 7 15 7.44772 15 8C15 8.55228 14.5523 9 14 9H9V14C9 14.5523 8.55228 15 8 15C7.44772 15 7 14.5523 7 14Z" fill="currentColor"/>
    </svg>
  );
}

function PrismEditLine16({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10.5026 1.28548C11.6664 0.121795 13.5528 0.121864 14.7165 1.28548C15.8802 2.4492 15.8802 4.33562 14.7165 5.49934L5.12173 15.094C4.80292 15.4128 4.37046 15.5921 3.91959 15.5921H2.11002C1.17113 15.5921 0.409821 14.8308 0.409821 13.8919V12.0823C0.409821 11.6314 0.589054 11.199 0.907868 10.8802L10.5026 1.28548ZM2.40982 12.2063V13.5921H3.79556L11.195 6.19173L9.80923 4.80599L2.40982 12.2063ZM13.3024 1.69954C12.9197 1.31697 12.2993 1.3169 11.9167 1.69954L11.2233 2.39192L12.609 3.77767L13.3024 3.08528C13.6851 2.70261 13.6851 2.08222 13.3024 1.69954Z" fill="currentColor"/>
    </svg>
  );
}
import { formatDateLabel } from "../lib/time";
import { cn } from "../lib/cn";
import { SingleDatePicker } from "./SingleDatePicker";

interface Hours {
  startMinutes: number;
  endMinutes: number;
}

interface Props {
  dateIso: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onSetDate: (iso: string) => void;
  zoom: "compact" | "expanded";
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** V40: render zoom controls as a Prism Button Toggle Group instead of two separate buttons. */
  toggleZoom?: boolean;
  blockingMode: boolean;
  onEnterBlockingMode: () => void;
  onExitBlockingMode: () => void;
  onDockSettings?: () => void;
  onEditHours?: () => void;
  receivingHours: Hours;
  shippingHours: Hours;
}

function HoursRow({ label, range, onEdit }: { label: string; range: { startMinutes: number; endMinutes: number }; onEdit?: () => void }) {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = ((h + 11) % 12) + 1;
    return `${hour12}:00 ${period}`;
  };
  return (
    <>
      <span className="text-body-md text-ink-subdued">{label}</span>
      <span className="text-body-md font-medium text-ink justify-self-end">
        {fmt(range.startMinutes)} – {fmt(range.endMinutes)}
      </span>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label.replace(/:$/, "").toLowerCase()}`}
        className="grid size-4 place-items-center text-ink hover:opacity-70 justify-self-end"
      >
        <PrismEditLine16 className="size-4" />
      </button>
    </>
  );
}

export function PageHeaderV2({
  dateIso,
  onPrevDay,
  onNextDay,
  onToday,
  onSetDate,
  zoom,
  onZoomIn,
  onZoomOut,
  toggleZoom,
  blockingMode,
  onEnterBlockingMode,
  onExitBlockingMode,
  onDockSettings,
  onEditHours,
  receivingHours,
  shippingHours,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const zoomOutDisabled = zoom === "compact";
  const zoomInDisabled = zoom === "expanded";

  return (
    <div className="px-10 pt-8 pb-4">
      <div className="flex items-center justify-between gap-8">
        <div className="min-w-0">
          <h1 className="text-display-lg text-ink">Dock management</h1>
          <p className="text-body-lg text-ink-subdued">
            Plan dock assignments for scheduled trucks
          </p>
        </div>
        <div className="grid grid-cols-[auto_auto_auto] items-center gap-x-[4px] gap-y-[5px]">
          <HoursRow label="Receiving hours:" range={receivingHours} onEdit={onEditHours} />
          <HoursRow label="Shipping hours:" range={shippingHours} onEdit={onEditHours} />
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
          <div className="relative">
            <button
              ref={dateBtnRef}
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              className={cn(
                "h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered",
                pickerOpen && "border-ink",
              )}
            >
              <Calendar className="size-5 text-ink" />
              {formatDateLabel(dateIso)}
            </button>
            {pickerOpen && (
              <SingleDatePicker
                value={dateIso}
                onChange={onSetDate}
                onClose={() => setPickerOpen(false)}
                anchorRef={dateBtnRef}
              />
            )}
          </div>
          <button
            type="button"
            onClick={onNextDay}
            className="size-10 grid place-items-center rounded-button border border-line-strong bg-white hover:bg-surface-hovered"
            aria-label="Next day"
          >
            <ChevronRight className="size-5 text-ink" />
          </button>

          <div className="w-4" />

          {toggleZoom ? (
            <div className="inline-flex items-center justify-center bg-white border border-line-strong rounded-button shrink-0">
              <button
                type="button"
                onClick={onZoomOut}
                aria-pressed={zoom === "compact"}
                style={zoom === "compact" ? { outline: "2px solid #111318", outlineOffset: "-1px" } : undefined}
                className={cn(
                  "h-10 px-3 py-1 inline-flex items-center justify-center gap-1 rounded-button text-body-md-strong whitespace-nowrap shrink-0 relative",
                  zoom === "compact" ? "text-ink z-10" : "text-ink-subdued",
                )}
              >
                <Minus className="size-5" />
                Zoom out
              </button>
              <button
                type="button"
                onClick={onZoomIn}
                aria-pressed={zoom === "expanded"}
                style={zoom === "expanded" ? { outline: "2px solid #111318", outlineOffset: "-1px" } : undefined}
                className={cn(
                  "h-10 px-3 py-1 inline-flex items-center justify-center gap-1 rounded-button text-body-md-strong whitespace-nowrap shrink-0 relative",
                  zoom === "expanded" ? "text-ink z-10" : "text-ink-subdued",
                )}
              >
                Zoom in
                <Plus className="size-5" />
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
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
                <PrismPlus16 className="size-4" />
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
