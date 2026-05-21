import { useRef } from "react";
import { ArrowDownRight, ArrowUpRight, GripVertical, Info, MoreHorizontal, TriangleAlert } from "lucide-react";
import type { Truck } from "../data/types";
import { formatTime, formatTrailer, getStatusLine } from "../lib/time";
import { CURRENT_TIME_MINUTES } from "../data/mock";
import { cn } from "../lib/cn";

type Variant = "rail" | "scheduled" | "compact";
type Source = "auto" | "manual" | "departed";

export type Treatment =
  | "default"
  | "v4"
  | "v5"
  | "v6"
  | "v7"
  | "v8"
  | "v9"
  | "v10"
  | "v11"
  | "v12"
  | "v13"
  | "v14"
  | "v15"
  | "v16"
  | "v17"
  | "v18"
  | "v19"
  | "v20"
  | "v21"
  | "v22"
  | "v23"
  | "v24"
  | "v25"
  | "v26"
  | "v27"
  | "v28"
  | "v29"
  | "v30"
  | "v31"
  | "v32"
  | "v33";

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
  /** Icon shown on the menu trigger button. Defaults to "more" (triple-dot). */
  menuVariant?: "more" | "info";
  /** Visual treatment for scheduled/compact appointment cards. Defaults to current style. */
  treatment?: Treatment;
  /** V34 Typefix: collapse load-type tag into the meta line and swap the
   *  apptMinutes label for a Departed/Arrived/ETA status line. */
  typefix?: boolean;
  /** V35 Declutter: hide direction arrows and partner-name underlines. */
  declutter?: boolean;
  /** V37: render the late triangle + bold-late counter in red. */
  redLate?: boolean;
  /** V39: replace the colored left strip with a colored GripVertical (prism) icon. */
  prismIcon?: boolean;
  /** V35: color status derived from the card's bar position vs the current-time line
   *  (departed = entirely past, in_progress = crossing now, scheduled = entirely future). */
  barStatus?: "scheduled" | "in_progress" | "departed";
}

const SOURCE_COLORS: Record<Source, { strong: string; soft: string; medium: string }> = {
  // `medium` = ~25% strong + 75% white, a richer pastel that still reads with ink text.
  auto: { strong: "#1537C7", soft: "#EEF1FC", medium: "#C4CDF1" },
  manual: { strong: "#6B21A8", soft: "#F4ECFB", medium: "#DAC8E9" },
  departed: { strong: "#00832D", soft: "#E7FBEF", medium: "#BFE0CB" },
};

// V35 Declutter: color the card by truck status instead of assignment source.
// Tokens sourced from Figma node 4359:94938 (Standardizing truck inbound/outbound).
export const STATUS_COLORS: Record<
  "scheduled" | "in_progress" | "departed",
  { strong: string; soft: string; medium: string; label: string }
> = {
  scheduled: { strong: "#111318", soft: "#E9EAEC", medium: "#D3D6D9", label: "Scheduled" },
  in_progress: { strong: "#784200", soft: "#FFF6D4", medium: "#F5E3A8", label: "In progress" },
  departed: { strong: "#00832D", soft: "#E7FBEF", medium: "#BFE0CB", label: "Departed" },
};

type Spec = {
  containerStyle: React.CSSProperties;
  textColor: string;
  subTextColor: string;
  leftBar?: {
    color: string;
    width: number;
    /** When set, the bar floats inside the card (rounded pill) instead of running flush to the edge. */
    inset?: { left: number; vertical: number; gap: number; radius: number };
  };
  topBar?: { color: string; height: number };
  tag: { bg: string; border: string; text: string };
  dot?: string;
  underline: string; // color for the partner-name underline (rgba string)
  /** Corner radius in px. Overrides the default rounded-button class. */
  radius?: number;
  /** Bold the partner-name title. */
  textBold?: boolean;
};

/**
 * V4–V14 are all iterations on the V5 base: soft tinted background, colored
 * left bar, black (ink) text. Each variant tweaks ONE dimension — bar width,
 * background fill, border presence, or corner radius — so we can compare them
 * side-by-side and pick a winner.
 *
 * Note: `radius` is applied per-card via Spec.radius so it overrides the
 * rounded-button class on the container.
 */
function specFor(
  treatment: Treatment,
  source: Source,
  statusPalette?: { strong: string; soft: string; medium: string },
): Spec {
  const c = statusPalette ?? SOURCE_COLORS[source];
  const ink = "#111318";
  const subInk = "#6C707A";
  const white = "#FFFFFF";

  // Common base mirroring V5.
  const base: Spec = {
    containerStyle: { backgroundColor: c.soft, border: "none" },
    textColor: ink,
    subTextColor: subInk,
    leftBar: { color: c.strong, width: 4 },
    tag: { bg: white, border: "#D3D6D9", text: ink },
    underline: "rgba(17,19,24,0.4)",
    radius: 8,
  };

  switch (treatment) {
    case "v4":
      // Bar width 2px (thin)
      return { ...base, leftBar: { color: c.strong, width: 2 } };
    case "v5":
      // Baseline — 4px bar, soft bg, no border, 8px radius
      return base;
    case "v6":
      // Bar width 6px (thick)
      return { ...base, leftBar: { color: c.strong, width: 6 } };
    case "v7":
      // No bg fill — left bar on white
      return {
        ...base,
        containerStyle: { backgroundColor: white, border: "none" },
      };
    case "v8":
      // White bg + 1px neutral border (no fill, with outline)
      return {
        ...base,
        containerStyle: { backgroundColor: white, border: "1px solid #D3D6D9" },
      };
    case "v9":
      // Soft bg + 1px colored border (fill + colored outline)
      return {
        ...base,
        containerStyle: { backgroundColor: c.soft, border: `1px solid ${c.strong}` },
      };
    case "v10":
      // Sharp corners (radius 0)
      return { ...base, radius: 0 };
    case "v11":
      // V10 (sharp corners) + 1px neutral border
      return {
        ...base,
        containerStyle: { backgroundColor: c.soft, border: "1px solid #D3D6D9" },
        radius: 0,
      };
    case "v12":
      // Large radius (12px / card)
      return { ...base, radius: 12 };
    case "v13":
      // Pill radius — fully rounded ends
      return { ...base, radius: 9999 };
    case "v14":
      // Outline only — no fill, 1px neutral border, 8px radius
      return {
        ...base,
        containerStyle: { backgroundColor: "transparent", border: "1px solid #D3D6D9" },
      };
    case "v15":
      // Inset bar (rounded pill), sharp card corners
      return {
        ...base,
        radius: 0,
        leftBar: {
          color: c.strong,
          width: 3,
          inset: { left: 4, vertical: 4, gap: 4, radius: 2 },
        },
      };
    case "v16":
      // Inset bar, 8px card corners (baseline radius)
      return {
        ...base,
        leftBar: {
          color: c.strong,
          width: 3,
          inset: { left: 4, vertical: 4, gap: 4, radius: 2 },
        },
      };
    case "v17":
      // Inset bar, 8px corners + 1px neutral border
      return {
        ...base,
        containerStyle: { backgroundColor: c.soft, border: "1px solid #D3D6D9" },
        leftBar: {
          color: c.strong,
          width: 3,
          inset: { left: 4, vertical: 4, gap: 4, radius: 2 },
        },
      };
    case "v18":
      // Inset bar, thicker (4px) and more inset (6px gap)
      return {
        ...base,
        leftBar: {
          color: c.strong,
          width: 4,
          inset: { left: 6, vertical: 4, gap: 6, radius: 3 },
        },
      };
    case "v19":
      // Solid medium-saturation bg, no border, no left bar, ink text, 8px corners
      return {
        ...base,
        containerStyle: { backgroundColor: c.medium, border: "none" },
        leftBar: undefined,
      };
    case "v20":
      // V16 (inset bar, 8px corners) but bar + content shifted 2px right
      return {
        ...base,
        leftBar: {
          color: c.strong,
          width: 3,
          inset: { left: 6, vertical: 4, gap: 6, radius: 2 },
        },
      };
    case "v21":
      // V18 (thick inset bar) on white bg with a thin colored border
      return {
        ...base,
        containerStyle: { backgroundColor: "#FFFFFF", border: `1px solid ${c.strong}` },
        leftBar: {
          color: c.strong,
          width: 4,
          inset: { left: 6, vertical: 4, gap: 6, radius: 3 },
        },
      };
    case "v22":
      // V21 but with a very minimal grey border (no colored border)
      return {
        ...base,
        containerStyle: { backgroundColor: "#FFFFFF", border: "1px solid #E9EAEC" },
        leftBar: {
          color: c.strong,
          width: 4,
          inset: { left: 6, vertical: 4, gap: 6, radius: 3 },
        },
      };
    case "v23":
      // V14 exactly but with a white fill (instead of transparent)
      return {
        ...base,
        containerStyle: { backgroundColor: "#FFFFFF", border: "1px solid #D3D6D9" },
      };
    case "v24":
      // Fantastical-style full color block: saturated bg + white text, no bar
      return {
        ...base,
        containerStyle: { backgroundColor: c.strong, border: "none" },
        textColor: white,
        subTextColor: "rgba(255,255,255,0.78)",
        leftBar: undefined,
        tag: { bg: "rgba(255,255,255,0.18)", border: "rgba(255,255,255,0.35)", text: white },
        underline: "rgba(255,255,255,0.5)",
      };
    case "v25":
      // Apple Calendar tinted: medium pastel bg + colored bold text, no bar
      return {
        ...base,
        containerStyle: { backgroundColor: c.medium, border: "none" },
        textColor: c.strong,
        subTextColor: c.strong,
        leftBar: undefined,
        textBold: true,
        tag: { bg: white, border: c.strong, text: c.strong },
        underline: c.strong,
      };
    case "v26":
      // Notion-minimal: white bg + colored dot prefix + colored text + grey border
      return {
        ...base,
        containerStyle: { backgroundColor: white, border: "1px solid #E9EAEC" },
        textColor: c.strong,
        subTextColor: subInk,
        leftBar: undefined,
        dot: c.strong,
        tag: { bg: c.soft, border: "#D3D6D9", text: c.strong },
        underline: c.strong,
      };
    case "v27":
      // Outlook bold-bar: white bg + 8px thick flush colored left bar
      return {
        ...base,
        containerStyle: { backgroundColor: white, border: "none" },
        leftBar: { color: c.strong, width: 8 },
      };
    case "v28":
      // Halo: soft bg + colored cast shadow (no border, no bar)
      return {
        ...base,
        containerStyle: {
          backgroundColor: c.soft,
          border: "none",
          boxShadow: `0 2px 10px ${c.strong}33`,
        },
        leftBar: { color: c.strong, width: 4 },
      };
    case "v29":
      // Diagonal medium→white gradient + ink text + thin bar
      return {
        ...base,
        containerStyle: {
          backgroundImage: `linear-gradient(135deg, ${c.medium} 0%, ${white} 80%)`,
          border: "none",
        },
        leftBar: { color: c.strong, width: 3 },
      };
    case "v30":
      // Top accent: white bg + 4px colored top bar + minimal grey border
      return {
        ...base,
        containerStyle: { backgroundColor: white, border: "1px solid #E9EAEC" },
        leftBar: undefined,
        topBar: { color: c.strong, height: 4 },
      };
    case "v31":
      // Dark theme: ink bg + inset colored bar + white text
      return {
        ...base,
        containerStyle: { backgroundColor: ink, border: "none" },
        textColor: white,
        subTextColor: "rgba(255,255,255,0.6)",
        leftBar: {
          color: c.strong,
          width: 3,
          inset: { left: 4, vertical: 4, gap: 4, radius: 2 },
        },
        tag: { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.3)", text: white },
        underline: "rgba(255,255,255,0.5)",
      };
    case "v32":
      // Stacked card: white bg + hard offset colored shadow (sticker / layered look)
      return {
        ...base,
        containerStyle: {
          backgroundColor: white,
          border: "1px solid #D3D6D9",
          boxShadow: `3px 3px 0 ${c.strong}`,
        },
        leftBar: undefined,
      };
    case "v33":
      // Pill block: saturated bg + white text + fully rounded ends, no bar
      return {
        ...base,
        containerStyle: { backgroundColor: c.strong, border: "none" },
        textColor: white,
        subTextColor: "rgba(255,255,255,0.78)",
        leftBar: undefined,
        radius: 9999,
        tag: { bg: "rgba(255,255,255,0.18)", border: "rgba(255,255,255,0.35)", text: white },
        underline: "rgba(255,255,255,0.5)",
      };
    case "default":
    default:
      // Current style: 2px colored border + soft bg + ink text (no left bar)
      return {
        containerStyle: { backgroundColor: c.soft, border: `2px solid ${c.strong}` },
        textColor: ink,
        subTextColor: subInk,
        tag: { bg: white, border: "#D3D6D9", text: ink },
        underline: "rgba(17,19,24,0.4)",
        radius: 8,
      };
  }
}

export function TruckCard({
  truck,
  onPointerDown,
  variant = "rail",
  source,
  showMenu,
  onExpand,
  onCollapse,
  onMenuOpen,
  menuVariant = "more",
  treatment = "default",
  typefix = false,
  declutter = false,
  redLate = false,
  prismIcon = false,
  barStatus,
}: Props) {
  const lateColor = redLate ? "#B71000" : "#111318";
  const DirectionIcon = truck.direction === "inbound" ? ArrowDownRight : ArrowUpRight;
  const directionLabel = truck.direction === "inbound" ? "Inbound truck" : "Outbound truck";
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const isLate =
    getStatusLine(truck, CURRENT_TIME_MINUTES, source === "departed").late !== "";

  // V35: color cards by where their bar sits relative to the current-time line.
  // `barStatus` is computed by the grid (which owns the bar layout). When it's
  // missing (e.g. drag preview / rail), fall back to the truck's stored status.
  const statusPalette = declutter
    ? STATUS_COLORS[
        (barStatus ??
          (truck.status === "in_progress" || truck.status === "departed"
            ? truck.status
            : "scheduled")) as "scheduled" | "in_progress" | "departed"
      ]
    : undefined;

  // === Compact: short pill, direction arrow + origin underlined ===
  if (variant === "compact") {
    const spec = specFor(treatment, source ?? "auto", statusPalette);
    const compactInset = spec.leftBar?.inset;
    return (
      <div
        onPointerDown={onPointerDown}
        className={cn(
          "group relative h-full w-full flex items-stretch overflow-hidden cursor-grab active:cursor-grabbing touch-none",
        )}
        style={{ ...spec.containerStyle, borderRadius: spec.radius ?? 8 }}
      >
        {spec.leftBar && prismIcon && (
          <span
            aria-hidden
            className="shrink-0 self-start h-8 flex items-center justify-center"
            style={{
              width: (compactInset?.left ?? 0) + 16 + (compactInset?.gap ?? 0),
              color: spec.leftBar.color,
            }}
          >
            <GripVertical className="size-4" strokeWidth={2.25} />
          </span>
        )}
        {spec.leftBar && !prismIcon && !compactInset && (
          <span
            aria-hidden
            className="shrink-0"
            style={{ width: spec.leftBar.width, backgroundColor: spec.leftBar.color }}
          />
        )}
        {spec.leftBar && !prismIcon && compactInset && (
          <>
            <span
              aria-hidden
              className="shrink-0"
              style={{ width: compactInset.left + spec.leftBar.width + compactInset.gap }}
            />
            <span
              aria-hidden
              className="absolute"
              style={{
                left: compactInset.left,
                top: compactInset.vertical,
                bottom: compactInset.vertical,
                width: spec.leftBar.width,
                borderRadius: compactInset.radius,
                backgroundColor: spec.leftBar.color,
              }}
            />
          </>
        )}
        {spec.topBar && (
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0"
            style={{ height: spec.topBar.height, backgroundColor: spec.topBar.color }}
          />
        )}
        <button
          type="button"
          onClick={onExpand}
          className={cn(
            "flex-1 min-w-0 flex items-center self-center text-left text-body-md font-medium pr-2",
            compactInset ? "pl-0" : "pl-2",
          )}
          style={{ color: spec.textColor, fontWeight: spec.textBold ? 700 : undefined }}
        >
          <span
            className={cn("inline-flex min-w-0 max-w-full items-center gap-1 hover:opacity-100", !declutter && "border-b")}
            style={{ borderColor: declutter ? undefined : spec.underline }}
          >
            {spec.dot && (
              <span
                aria-hidden
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: spec.dot }}
              />
            )}
            {!declutter && <DirectionIcon className="size-3.5 shrink-0" />}
            {isLate && (
              <TriangleAlert
                className="size-3.5 shrink-0"
                style={{ color: lateColor }}
                aria-label="Late"
              />
            )}
            <span className="truncate">{truck.partner}</span>
          </span>
        </button>
      </div>
    );
  }

  // === Scheduled (full card on grid): tinted bg + colored border ===
  if (variant === "scheduled") {
    const spec = specFor(treatment, source ?? "auto", statusPalette);
    const arrivalLabel = "arrival";
    return (
      <div
        onPointerDown={onPointerDown}
        className={cn(
          "group relative flex h-full w-full shadow-card overflow-hidden cursor-grab active:cursor-grabbing touch-none",
        )}
        style={{ ...spec.containerStyle, borderRadius: spec.radius ?? 8 }}
      >
        {(() => {
          const inset = spec.leftBar?.inset;
          if (!spec.leftBar) return null;
          if (prismIcon) {
            return (
              <span
                aria-hidden
                className="shrink-0 self-start flex items-start justify-center pt-1.5"
                style={{
                  width: (inset?.left ?? 0) + 16 + (inset?.gap ?? 0),
                  color: spec.leftBar.color,
                }}
              >
                <GripVertical className="size-4" strokeWidth={2.25} />
              </span>
            );
          }
          if (!inset) {
            return (
              <span
                aria-hidden
                className="shrink-0"
                style={{ width: spec.leftBar.width, backgroundColor: spec.leftBar.color }}
              />
            );
          }
          return (
            <>
              <span
                aria-hidden
                className="shrink-0"
                style={{ width: inset.left + spec.leftBar.width + inset.gap }}
              />
              <span
                aria-hidden
                className="absolute"
                style={{
                  left: inset.left,
                  top: inset.vertical,
                  bottom: inset.vertical,
                  width: spec.leftBar.width,
                  borderRadius: inset.radius,
                  backgroundColor: spec.leftBar.color,
                }}
              />
            </>
          );
        })()}
        {spec.topBar && (
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0"
            style={{ height: spec.topBar.height, backgroundColor: spec.topBar.color }}
          />
        )}
        <div
          className={cn(
            "flex-1 min-w-0 flex flex-col gap-1 pr-2 pt-0.5 pb-1",
            spec.leftBar?.inset ? "pl-0" : "pl-2",
          )}
          style={{ paddingTop: spec.topBar ? spec.topBar.height + 2 : undefined }}
        >
          {/* Title row: arrow + underlined partner + ... menu */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={onCollapse}
              disabled={!onCollapse}
              className="flex-1 min-w-0 flex items-center text-left text-body-md font-medium disabled:cursor-default"
              style={{ color: spec.textColor, fontWeight: spec.textBold ? 700 : undefined }}
            >
              <span
                className={cn("inline-flex min-w-0 max-w-full items-center gap-1", !declutter && "border-b")}
                style={{ borderColor: declutter ? undefined : (onCollapse ? spec.underline : "transparent") }}
              >
                {spec.dot && (
                  <span
                    aria-hidden
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: spec.dot }}
                  />
                )}
                {!declutter && <DirectionIcon className="size-3.5 shrink-0" />}
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
                style={{ color: spec.subTextColor }}
                aria-label={menuVariant === "info" ? "Additional info" : "More options"}
              >
                {menuVariant === "info" ? (
                  <Info className="size-4" />
                ) : (
                  <MoreHorizontal className="size-4" />
                )}
              </button>
            )}
          </div>

          {typefix ? (
            <>
              <p className="text-body-sm truncate" style={{ color: spec.subTextColor }}>
                {(() => {
                  const s = getStatusLine(truck, CURRENT_TIME_MINUTES, source === "departed");
                  return (
                    <>
                      {s.primary}
                      {s.late && (
                        <>
                          {" · "}
                          <TriangleAlert
                            className="inline size-3.5 align-[-2px] mr-1"
                            style={{ color: lateColor }}
                            aria-label="Late"
                          />
                          <span className="font-bold" style={{ color: lateColor }}>{s.late}</span>
                        </>
                      )}
                    </>
                  );
                })()}
              </p>
              <p className="text-body-sm truncate" style={{ color: spec.subTextColor }}>
                {formatTrailer(truck.trailerSize, truck.parcelCount)}
                {" · "}
                {truck.loadType === "floor" ? "Floor loaded" : "Palletized"}
              </p>
            </>
          ) : (
            <>
              <p className="text-body-sm truncate" style={{ color: spec.subTextColor }}>
                {formatTime(truck.apptMinutes)} {arrivalLabel}
              </p>
              <p className="text-body-sm truncate" style={{ color: spec.subTextColor }}>
                {formatTrailer(truck.trailerSize, truck.parcelCount)}
              </p>
              <span
                className="inline-flex self-start max-w-full items-center px-2 h-5 rounded-tag text-body-sm-strong whitespace-nowrap overflow-hidden"
                style={{
                  backgroundColor: spec.tag.bg,
                  border: `1px solid ${spec.tag.border}`,
                  color: spec.tag.text,
                }}
              >
                <span className="truncate">
                  {truck.loadType === "floor" ? "Floor loaded" : "Palletized"}
                </span>
              </span>
            </>
          )}
        </div>
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
