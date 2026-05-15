import { AlertTriangle, X } from "lucide-react";
import type { Truck } from "../data/types";
import { formatDateLabel, formatTime } from "../lib/time";

interface Props {
  open: boolean;
  truck: Truck | null;
  /** Date the user dropped onto. */
  droppedDateIso: string;
  onCancel: () => void;
  onMoveAppointment: () => void;
  onKeepAppointment: () => void;
}

export function ConflictModal({
  open,
  truck,
  droppedDateIso,
  onCancel,
  onMoveAppointment,
  onKeepAppointment,
}: Props) {
  if (!open || !truck) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onCancel} />
      <div className="relative z-10 w-[480px] max-w-[90vw] bg-white rounded-card shadow-drag border border-line">
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="size-10 grid place-items-center rounded-full bg-negative-bg">
              <AlertTriangle className="size-5 text-negative" />
            </div>
            <div>
              <h2 className="text-title-md text-ink">Appointment day mismatch</h2>
              <p className="mt-1 text-body-md text-ink-subdued">
                <span className="font-semibold text-ink">{truck.partner}</span> is scheduled for{" "}
                <span className="font-semibold text-ink">
                  {formatDateLabel(truck.dateIso)} at {formatTime(truck.apptMinutes)}
                </span>
                , but you dropped it on{" "}
                <span className="font-semibold text-ink">{formatDateLabel(droppedDateIso)}</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="size-8 grid place-items-center rounded-button hover:bg-surface-hovered"
            aria-label="Close"
          >
            <X className="size-5 text-icon-subdued" />
          </button>
        </div>

        <div className="px-6 pb-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-3 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onKeepAppointment}
            className="h-10 px-3 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
          >
            Keep original day
          </button>
          <button
            type="button"
            onClick={onMoveAppointment}
            className="h-10 px-3 rounded-button bg-ink text-body-md-strong text-white hover:opacity-90"
          >
            Move appointment to {formatDateLabel(droppedDateIso)}
          </button>
        </div>
      </div>
    </div>
  );
}
