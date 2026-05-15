import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Truck } from "../data/types";
import { TruckCard } from "./TruckCard";

interface Props {
  trucks: Truck[];
  onStartDrag: (truckId: string, e: React.PointerEvent) => void;
}

export function UnassignedRail({ trucks, onStartDrag }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dx: number) => {
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <section className="px-10 pt-5 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-body-lg-strong text-ink">{trucks.length} Unassigned trucks</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollBy(-260)}
            className="size-8 grid place-items-center rounded-button border border-line-strong bg-white hover:bg-surface-hovered"
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4 text-ink" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(260)}
            className="size-8 grid place-items-center rounded-button border border-line-strong bg-white hover:bg-surface-hovered"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4 text-ink" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto scrollbar-thin pb-2"
      >
        {trucks.map((t) => (
          <TruckCard
            key={t.id}
            truck={t}
            variant="rail"
            showMenu
            onPointerDown={(e) => onStartDrag(t.id, e)}
          />
        ))}
        {trucks.length === 0 && (
          <div className="text-body-md text-ink-subdued italic py-6">All trucks assigned for the day.</div>
        )}
      </div>
    </section>
  );
}
