import { useEffect, useRef } from "react";
import { cn } from "../lib/cn";

export interface PopoverItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

interface Props {
  open: boolean;
  anchorRect: DOMRect | null;
  items: PopoverItem[];
  onClose: () => void;
}

export function PopoverMenu({ open, anchorRect, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Defer (and use capture) so we still catch the close-click even if a
    // descendant calls stopPropagation/preventDefault on pointerdown.
    const id = setTimeout(
      () => document.addEventListener("pointerdown", onDocPointerDown, true),
      0,
    );
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !anchorRect) return null;

  const top = anchorRect.bottom + 6;
  const left = Math.min(anchorRect.left, window.innerWidth - 280);

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 w-[240px] bg-white rounded-button shadow-drag border border-line py-2"
      style={{ top, left }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className={cn(
            "w-full flex items-center gap-4 min-h-[48px] px-4 text-left text-[16px] font-medium",
            item.disabled
              ? "text-icon-disabled cursor-not-allowed"
              : "text-ink hover:bg-surface-hovered",
          )}
        >
          {item.icon}
          <span className="flex-1 min-w-0 truncate">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
