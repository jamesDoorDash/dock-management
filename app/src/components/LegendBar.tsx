import { Minus, Plus, Pause, Pencil } from "lucide-react";

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
          <Pause className="size-5" />
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
