import { Minus, Plus, Pencil } from "lucide-react";

function PrismPlus16({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 14V9H2C1.44772 9 1 8.55228 1 8C1 7.44772 1.44772 7 2 7H7V2C7 1.44772 7.44772 1 8 1C8.55228 1 9 1.44772 9 2V7H14C14.5523 7 15 7.44772 15 8C15 8.55228 14.5523 9 14 9H9V14C9 14.5523 8.55228 15 8 15C7.44772 15 7 14.5523 7 14Z" fill="currentColor"/>
    </svg>
  );
}

interface Props {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onAddBlocked?: () => void;
  onEditDock?: () => void;
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-4 rounded" style={{ backgroundColor: color }} />
      <span className="text-body-md text-ink">{label}</span>
    </div>
  );
}

export function LegendBar({ onZoomIn, onZoomOut, onAddBlocked, onEditDock }: Props) {
  return (
    <div className="px-10 py-3 border-y border-line bg-white flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Swatch color="#00832D" label="Automatically scheduled" />
        <Swatch color="#1537C7" label="Manual override" />
        <Swatch color="#949494" label="Blocked time" />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onZoomOut}
          className="h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
        >
          <Minus className="size-5" />
          Zoom out
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className="h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
        >
          Zoom in
          <Plus className="size-5" />
        </button>
        <button
          type="button"
          onClick={onAddBlocked}
          className="h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
        >
          <PrismPlus16 className="size-4" />
          Add blocked time
        </button>
        <button
          type="button"
          onClick={onEditDock}
          className="h-10 px-3 inline-flex items-center gap-1 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
        >
          <Pencil className="size-5" />
          Edit dock
        </button>
      </div>
    </div>
  );
}
