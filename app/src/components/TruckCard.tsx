import { useRef } from "react";
import { ArrowDownRight, ArrowUpRight, GripVertical, MoreHorizontal } from "lucide-react";
import type { Truck } from "../data/types";
import { formatTime, formatTrailer } from "../lib/time";
import { cn } from "../lib/cn";

type Variant = "rail" | "scheduled" | "compact";
type Source = "auto" | "manual";

interface Props {
  truck: Truck;
  onPointerDown?: (e: React.PointerEvent) => void;
  variant?: Variant;
  source?: Source;
  showMenu?: boolean;
  /** Compact-only: click on the underlined origin → expand. */
  onExpand?: () => void;
  /** Scheduled-only: click on the underlined title → collapse back to compact (inline-expanded cards). */
  onCollapse?: () => void;
  /** Render the ... menu and report its trigger rect when clicked. */
  onMenuOpen?: (anchor: DOMRect) => void;
}

const SOURCE_STYLES: Record<Source, { border: string; bg: string }> = {
  auto: { border: "border-sched-auto", bg: "bg-sched-auto-bg" },
  manual: { border: "border-sched-manual", bg: "bg-sched-manual-bg" },
};

export function TruckCard({
  truck,
  onPointerDown,
  variant = "rail",
  source,
  showMenu,
  onExpand,
  onCollapse,
  onMenuOpen,
}: Props) {
  const DirectionIcon = truck.direction === "inbound" ? ArrowDownRight : ArrowUpRight;
  const directionLabel = truck.direction === "inbound" ? "Inbound truck" : "Outbound truck";
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // === Compact: short pill, direction arrow + origin underlined ===
  if (variant === "compact") {
    const styles = source ? SOURCE_STYLES[source] : SOURCE_STYLES.auto;
    return (
      <div
        onPointerDown={onPointerDown}
        className={cn(
          "group h-full w-full flex items-stretch px-2 rounded-button overflow-hidden border-2 cursor-grab active:cursor-grabbing touch-none",
          styles.border,
          styles.bg,
        )}
      >
        <button
          type="button"
          onClick={onExpand}
          className="flex-1 min-w-0 flex items-center self-center text-left text-body-md font-medium text-ink"
        >
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 border-b border-ink/40 hover:border-ink">
            <DirectionIcon className="size-3.5 shrink-0" />
            <span className="truncate">{truck.partner}</span>
          </span>
        </button>
      </div>
    );
  }

  // === Scheduled (full card on grid): tinted bg + colored border ===
  if (variant === "scheduled") {
    const styles = source ? SOURCE_STYLES[source] : SOURCE_STYLES.auto;
    // Always show the arrival time — that's where the card sits on the X-axis.
    const arrivalLabel = "arrival";
    return (
      <div
        onPointerDown={onPointerDown}
        className={cn(
          "group relative flex flex-col gap-1 h-full w-full rounded-button border-2 shadow-card overflow-hidden cursor-grab active:cursor-grabbing touch-none px-2 pt-0.5 pb-1",
          styles.border,
          styles.bg,
        )}
      >
        {/* Title row: arrow + underlined partner + ... menu */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={onCollapse}
            disabled={!onCollapse}
            className="flex-1 min-w-0 flex items-center text-left text-body-md font-medium text-ink disabled:cursor-default"
          >
            <span
              className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-1.5 border-b",
                onCollapse
                  ? "border-ink/40 hover:border-ink"
                  : "border-transparent",
              )}
            >
              <DirectionIcon className="size-3.5 shrink-0" />
              <span className="truncate">{truck.partner}</span>
            </span>
          </button>
          {showMenu && (
            <button
              ref={menuBtnRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rect = menuBtnRef.current?.getBoundingClientRect();
                if (rect) onMenuOpen?.(rect);
              }}
              className="shrink-0 size-6 grid place-items-center rounded hover:bg-black/5"
              aria-label="More options"
            >
              <MoreHorizontal className="size-4 text-icon-subdued" />
            </button>
          )}
        </div>

        <p className="text-[12px] text-ink-subdued truncate">
          {formatTime(truck.apptMinutes)} {arrivalLabel}
        </p>
        <p className="text-[12px] text-ink-subdued truncate">
          {formatTrailer(truck.trailerSize, truck.parcelCount)}
        </p>
        <span className="inline-flex self-start max-w-full items-center px-2 h-5 rounded-tag bg-white border border-line-strong text-body-sm-strong text-ink whitespace-nowrap overflow-hidden">
          <span className="truncate">
            {truck.loadType === "floor" ? "Floor loaded" : "Palletized"}
          </span>
        </span>
      </div>
    );
  }

  // === Rail (V1 unassigned trucks): white bg, neutral border ===
  return (
    <div className="group relative flex items-stretch bg-white border border-line-strong rounded-button shadow-card overflow-hidden min-w-[230px] shrink-0">
      <button
        type="button"
        onPointerDown={onPointerDown}
        className="flex items-center px-1 py-2 cursor-grab active:cursor-grabbing touch-none text-icon-subdued hover:text-ink"
        aria-label={`Drag ${truck.partner}`}
      >
        <GripVertical className="size-5" />
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-2 px-3 py-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-body-md font-medium text-ink truncate">
            {formatTime(truck.apptMinutes)}・{truck.partner}
          </p>
          <p className="flex items-center gap-1 text-[11.5px] text-ink-subdued">
            <DirectionIcon className="size-3.5" />
            {directionLabel}
          </p>
          <p className="text-[11.5px] text-ink-subdued">{formatTrailer(truck.trailerSize, truck.parcelCount)}</p>
        </div>
        <span className="inline-flex w-fit items-center px-2 h-5 rounded-tag bg-line text-body-sm-strong text-ink">
          {truck.loadType === "floor" ? "Floor loaded" : "Palletized"}
        </span>
      </div>

      {showMenu && (
        <button
          ref={menuBtnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const rect = menuBtnRef.current?.getBoundingClientRect();
            if (rect) onMenuOpen?.(rect);
          }}
          className="self-start m-2 size-8 grid place-items-center rounded-button border border-line-strong bg-white hover:bg-surface-hovered"
          aria-label="More options"
        >
          <MoreHorizontal className="size-4 text-icon-subdued" />
        </button>
      )}
    </div>
  );
}
