import { Info } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { TruckCard, type Treatment } from "./TruckCard";
import type { Truck } from "../data/types";

export const HOLD_DOCK_ID = "__hold__";
export const UNASSIGNED_DOCK_ID = "__unassigned__";

type Zone = "hold" | "unassigned";

interface Props {
  holdTrucks: Truck[];
  unassignedTrucks: Truck[];
  density: "compact" | "expanded";
  /** Drag-active state — when true, sections show dashed drop affordance instead of cards. */
  isDragging: boolean;
  /** ID of the truck being dragged (used to suppress its card from the list during drag). */
  draggingTruckId: string | null;
  /** Source list of the dragged truck, if it originated in the panel. Used so the
   *  origin section keeps showing its cards (minus the dragging one) rather than the
   *  full drop-affordance state. */
  draggingFromZone: Zone | null;
  /** Hovered drop zone during drag (drives the highlighted state of the dashed target). */
  hoverZone: Zone | null;
  onStartDragFromPanel: (truckId: string, zone: Zone, e: React.PointerEvent) => void;
  /** Forwarded TruckCard props so panel cards match grid cards. */
  treatment?: Treatment;
  typefix?: boolean;
  declutter?: boolean;
  redLate?: boolean;
  prismIcon?: boolean;
  figmaCard?: boolean;
  v41Card?: boolean;
}

const HOLD_TOOLTIP =
  "A place to que up trucks when dock doors are full. Drag to rearrange.";
const UNASSIGNED_TOOLTIP =
  "Trucks that haven't been assigned a dock door yet. Ordered by appointment time.";

// HOUR_WIDTH must match ScheduleGrid's DENSITY constants so panel-card widths
// scale the same way the grid bars do.
const HOUR_WIDTH = { compact: 165, expanded: 440 } as const;
const PANEL_CONTENT_WIDTH = 234; // 282px panel - 24px padding x2

export function AssignmentPanel({
  holdTrucks,
  unassignedTrucks,
  density,
  isDragging,
  draggingTruckId,
  draggingFromZone,
  hoverZone,
  onStartDragFromPanel,
  treatment,
  typefix,
  declutter,
  redLate,
  prismIcon,
  figmaCard,
  v41Card,
}: Props) {
  // Per-section visibility: each section appears only when it has items OR a
  // drag is in progress (so the drop affordance shows even for empty sections).
  // The panel itself is hidden when both sections are hidden.
  const holdVisible = isDragging || holdTrucks.length > 0;
  const unassignedVisible = isDragging || unassignedTrucks.length > 0;
  if (!holdVisible && !unassignedVisible) return null;

  return (
    <aside
      className="absolute top-0 right-0 bottom-0 z-30 flex flex-col bg-white overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        width: 282,
        // Reduced top padding so the "On hold" heading sits closer to the top
        // edge of the panel — designer call.
        padding: "12px 24px 24px 24px",
        gap: 40,
        boxShadow: "-4px 0 16px rgba(25,25,25,0.12)",
      }}
    >
      {holdVisible && (
        <Section
          zone="hold"
          title="On hold"
          tooltip={HOLD_TOOLTIP}
          trucks={holdTrucks}
          density={density}
          isDragging={isDragging}
          draggingFromZone={draggingFromZone}
          draggingTruckId={draggingTruckId}
          hoverZone={hoverZone}
          onStartDragFromPanel={onStartDragFromPanel}
          treatment={treatment}
          typefix={typefix}
          declutter={declutter}
          redLate={redLate}
          prismIcon={prismIcon}
          figmaCard={figmaCard}
          v41Card={v41Card}
        />
      )}
      {unassignedVisible && (
        <Section
          zone="unassigned"
          title="Unassigned"
          tooltip={UNASSIGNED_TOOLTIP}
          trucks={unassignedTrucks}
          density={density}
          isDragging={isDragging}
          draggingFromZone={draggingFromZone}
          draggingTruckId={draggingTruckId}
          hoverZone={hoverZone}
          onStartDragFromPanel={onStartDragFromPanel}
          treatment={treatment}
          typefix={typefix}
          declutter={declutter}
          redLate={redLate}
          prismIcon={prismIcon}
          figmaCard={figmaCard}
          v41Card={v41Card}
        />
      )}
    </aside>
  );
}

function Section({
  zone,
  title,
  tooltip,
  trucks,
  density,
  isDragging,
  draggingFromZone,
  draggingTruckId,
  hoverZone,
  onStartDragFromPanel,
  treatment,
  typefix,
  declutter,
  redLate,
  prismIcon,
  figmaCard,
  v41Card,
}: {
  zone: Zone;
  title: string;
  tooltip: string;
  trucks: Truck[];
  density: "compact" | "expanded";
  isDragging: boolean;
  draggingFromZone: Zone | null;
  draggingTruckId: string | null;
  hoverZone: Zone | null;
  onStartDragFromPanel: (truckId: string, zone: Zone, e: React.PointerEvent) => void;
  treatment?: Treatment;
  typefix?: boolean;
  declutter?: boolean;
  redLate?: boolean;
  prismIcon?: boolean;
  figmaCard?: boolean;
  v41Card?: boolean;
}) {
  // Show the dashed drop affordance when a drag is in progress AND this is not
  // the origin zone. The origin zone keeps showing its list (minus the dragging
  // card) so the user can drop back where they started without confusion.
  const showDropAffordance = isDragging && draggingFromZone !== zone;
  const visibleTrucks = trucks.filter((t) => t.id !== draggingTruckId);

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          style={{
            fontFamily:
              "var(--font-dd-norms, 'DD Norms', system-ui, sans-serif)",
            fontWeight: 700,
            fontSize: 18,
            lineHeight: "24px",
            letterSpacing: "-0.01px",
            color: "#191919",
          }}
        >
          {title} ({trucks.length})
        </h2>
        <Tooltip label={tooltip} anchor="bottom-right">
          <span
            className="inline-flex items-center justify-center"
            tabIndex={0}
            aria-label={`${title} info`}
            style={{ color: "#606060", cursor: "help" }}
          >
            <Info className="size-4" strokeWidth={1.75} />
          </span>
        </Tooltip>
      </div>

      {/* Body */}
      {showDropAffordance ? (
        <div
          data-drop-zone={zone}
          className="flex items-center justify-center rounded-[8px]"
          style={{
            height: 112,
            border: `2px dashed ${hoverZone === zone ? "#191919" : "#d6d6d6"}`,
            backgroundColor: hoverZone === zone ? "#f7f7f7" : "#ffffff",
            transition: "background-color 80ms ease, border-color 80ms ease",
            gap: 8,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 5v14M5 12h14"
              stroke="#191919"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              fontFamily:
                "var(--font-dd-norms, 'DD Norms', system-ui, sans-serif)",
              fontWeight: 700,
              fontSize: 14,
              lineHeight: "20px",
              color: "#191919",
            }}
          >
            Add to {zone === "hold" ? "on hold" : "unassigned"}
          </span>
        </div>
      ) : zone === "hold" ? (
        // On hold uses absolute positioning + transform transitions so the items
        // smoothly slide between slots while the user drags one of them — same
        // technique as the priority-list reorder in DockSettingsModal.
        (() => {
          const cardHeight = density === "expanded" ? (v41Card ? 94 : 74) : 32;
          const rowStride = cardHeight + 8;
          const containerHeight = Math.max(
            cardHeight,
            trucks.length * rowStride - 8,
          );
          return (
            <div
              data-drop-zone="hold"
              style={{ position: "relative", height: containerHeight }}
            >
              {trucks.map((truck, idx) => {
                const isThisDragging = truck.id === draggingTruckId;
                // In expanded zoom, panel cards all fill the panel width so the
                // list reads as a tidy column. In compact zoom they keep their
                // natural duration-scaled widths so floor-loaded vs palletized
                // is visually distinguishable.
                const naturalWidth =
                  (truck.durationMinutes / 60) * HOUR_WIDTH[density];
                const width =
                  density === "expanded"
                    ? PANEL_CONTENT_WIDTH
                    : Math.min(naturalWidth, PANEL_CONTENT_WIDTH);
                return (
                  <div
                    key={truck.id}
                    data-panel-truck-id={truck.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width,
                      height: cardHeight,
                      transform: `translate3d(0, ${idx * rowStride}px, 0)`,
                      transition: isThisDragging
                        ? "none"
                        : "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                      // Hide the source card while a floating preview is shown
                      // — but keep it in the DOM so its slot reserves height
                      // and the reorder math stays consistent.
                      opacity: isThisDragging ? 0 : 1,
                      zIndex: isThisDragging ? 2 : 1,
                    }}
                  >
                    <TruckCard
                      truck={truck}
                      variant={density === "expanded" ? "scheduled" : "compact"}
                      source="manual"
                      barStatus="scheduled"
                      onPointerDown={(e) =>
                        onStartDragFromPanel(truck.id, "hold", e)
                      }
                      treatment={treatment}
                      typefix={typefix}
                      declutter={declutter}
                      redLate={redLate}
                      prismIcon={prismIcon}
                      figmaCard={figmaCard}
                      v41Card={v41Card}
                    />
                  </div>
                );
              })}
            </div>
          );
        })()
      ) : (
        <div data-drop-zone={zone} className="flex flex-col" style={{ gap: 8, minHeight: 32 }}>
          {visibleTrucks.map((truck) => {
            // In compact zoom, card width mirrors the grid bar — duration ×
            // hour-width — so floor-loaded vs palletized is visible at a glance.
            // In expanded zoom, all cards fill the panel for a tidy column.
            const naturalWidth =
              (truck.durationMinutes / 60) * HOUR_WIDTH[density];
            const width =
              density === "expanded"
                ? PANEL_CONTENT_WIDTH
                : Math.min(naturalWidth, PANEL_CONTENT_WIDTH);
            return (
              <div
                key={truck.id}
                data-panel-truck-id={truck.id}
                style={{
                  height: density === "expanded" ? (v41Card ? 94 : 74) : 32,
                  width,
                }}
              >
                <TruckCard
                  truck={truck}
                  variant={density === "expanded" ? "scheduled" : "compact"}
                  source="manual"
                  // Force the neutral "scheduled" palette — a truck on the panel
                  // is by definition not in-progress and not departed, so we
                  // don't want the yellow/green treatments to leak through from
                  // the truck's stored status.
                  barStatus="scheduled"
                  onPointerDown={(e) =>
                    onStartDragFromPanel(truck.id, zone, e)
                  }
                  treatment={treatment}
                  typefix={typefix}
                  declutter={declutter}
                  redLate={redLate}
                  prismIcon={prismIcon}
                  figmaCard={figmaCard}
                  v41Card={v41Card}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
