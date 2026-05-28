import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

export interface PopoverItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Defaults to "button". When "switch", renders a toggle on the right. */
  variant?: "button" | "switch";
  /** Button-variant click handler. */
  onSelect?: () => void;
  /** Switch-variant state. */
  checked?: boolean;
  /** Switch-variant toggle handler. */
  onToggle?: () => void;
}

export interface PopoverSection {
  id: string;
  title?: string;
  items: PopoverItem[];
}

interface Props {
  open: boolean;
  anchorRect: DOMRect | null;
  /** Flat items list (single section). */
  items?: PopoverItem[];
  /** Grouped sections. Takes precedence over `items` when provided. */
  sections?: PopoverSection[];
  onClose: () => void;
}

export function PopoverMenu({ open, anchorRect, items, sections, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRect || !ref.current) {
      setPos(null);
      return;
    }
    const margin = 8;
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popW = ref.current.offsetWidth;
    const popH = ref.current.offsetHeight;

    let left = anchorRect.right + gap;
    if (left + popW + margin > vw) {
      left = anchorRect.left - gap - popW;
    }
    if (left < margin) left = margin;

    let top = anchorRect.top;
    if (top + popH + margin > vh) {
      top = vh - popH - margin;
    }
    if (top < margin) top = margin;

    setPos({ top, left });
  }, [open, anchorRect]);

  if (!open || !anchorRect) return null;

  const renderedSections: PopoverSection[] = sections
    ? sections
    : [{ id: "default", items: items ?? [] }];

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 w-[280px] bg-white rounded-button shadow-drag border border-line py-2"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {renderedSections.map((section, sIdx) => (
        <div
          key={section.id}
          className={cn(sIdx > 0 && "mt-1 pt-1 border-t border-line")}
        >
          {section.title && (
            <div className="px-4 pt-1 pb-1 text-body-sm-strong text-ink-subdued uppercase tracking-wide">
              {section.title}
            </div>
          )}
          {section.items.map((item) => {
            const isSwitch = item.variant === "switch";
            const onClick = () => {
              if (item.disabled) return;
              if (isSwitch) {
                item.onToggle?.();
                return;
              }
              item.onSelect?.();
              onClose();
            };
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={onClick}
                className={cn(
                  "w-full flex items-center gap-4 min-h-[48px] px-4 text-left text-[16px] font-medium",
                  item.disabled
                    ? "text-icon-disabled cursor-not-allowed"
                    : "text-ink hover:bg-surface-hovered",
                )}
              >
                <span className="w-9 shrink-0 flex items-center justify-center">
                  {isSwitch ? (
                    <span
                      aria-hidden
                      className={cn(
                        "relative w-9 h-5 rounded-tag transition-colors shrink-0",
                        item.checked ? "bg-ink" : "bg-line-strong",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 size-4 rounded-full bg-white transition-all",
                          item.checked ? "left-[18px]" : "left-0.5",
                        )}
                      />
                    </span>
                  ) : (
                    item.icon
                  )}
                </span>
                <span className="flex-1 min-w-0 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
