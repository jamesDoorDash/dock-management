import { X } from "lucide-react";
import type { ReactNode } from "react";

export type ConfirmTone = "default" | "destructive";

interface Props {
  open: boolean;
  title: string;
  /** Body text — string or ReactNode for inline emphasis. */
  description: ReactNode;
  /** When true, the Cancel button is hidden — modal becomes a single-action acknowledgement. */
  hideCancel?: boolean;
  cancelLabel?: string;
  confirmLabel?: string;
  /** "destructive" paints the Confirm button red for irreversible / dangerous actions. */
  confirmTone?: ConfirmTone;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Standard error / confirmation modal matching the Sword app design.
 *  - 465px white card, soft shadow, dark overlay
 *  - Close (X) in its own top row
 *  - Display-lg title, body-lg supporting copy
 *  - Footer with top border; Cancel + Confirm right-aligned
 */
export function ErrorModal({
  open,
  title,
  description,
  hideCancel = false,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  confirmTone = "default",
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  const confirmClasses =
    confirmTone === "destructive"
      ? "bg-negative text-white hover:opacity-90"
      : "bg-ink text-white hover:opacity-90";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "#19191980" }}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        className="relative z-10 w-[560px] max-w-[90vw] overflow-hidden rounded-card bg-white"
        style={{ boxShadow: "0 6px 20px 0 rgba(25,25,25,0.2)" }}
      >
        <div className="flex items-center justify-end px-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="size-10 grid place-items-center rounded hover:bg-surface-hovered"
          >
            <X className="size-6 text-icon" strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-4 pb-6 flex flex-col gap-2 break-words">
          <h2
            id="error-modal-title"
            className="text-display-lg text-ink"
            style={{ fontFamily: '"TT Norms", Inter, sans-serif' }}
          >
            {title}
          </h2>
          <p className="text-body-lg text-ink-subdued">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line bg-white p-4">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-10 px-3 rounded-button border border-line-strong bg-white text-body-md-strong text-ink hover:bg-surface-hovered"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`h-10 px-3 rounded-button text-body-md-strong ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
