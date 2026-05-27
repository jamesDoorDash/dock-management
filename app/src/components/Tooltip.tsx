import { useState, useRef, useLayoutEffect, type ReactNode } from "react";
import { cn } from "../lib/cn";

interface Props {
  /** Tooltip body text. */
  label: string;
  /** Trigger element. */
  children: ReactNode;
  /** Where the tail anchors relative to the trigger.
   *  - "center" (default): pill centered above trigger, tail centered.
   *  - "bottom-right": pill above trigger and aligned to its right edge, tail at
   *    the pill's bottom-right corner. Use when the trigger is near the right
   *    edge of the viewport / a container so the pill stays inside the bounds.
   */
  anchor?: "center" | "bottom-right";
  /** When true, the default tooltip wraps text at ~240px instead of staying on one line.
   *  Use for longer descriptions (e.g. column-header tooltips). */
  wide?: boolean;
}

/**
 * Simple controlled tooltip that appears on hover/focus above its trigger.
 * Black floating pill matching the Prism tooltip spec.
 */
export function Tooltip({ label, children, anchor = "center", wide = false }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  // For the bottom-right variant we render with position: fixed so the tooltip
  // escapes any ancestor with overflow: hidden / overflow: auto (e.g. the
  // panel itself, the table container). Track the trigger's viewport-space
  // bounding rect while the tooltip is open and recompute on scroll/resize.
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = wrapperRef.current;
      if (el) setTriggerRect(el.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      className="relative inline-flex"
    >
      {children}
      {open &&
        (anchor === "bottom-right" ? (
          triggerRect && (
            <span
              role="tooltip"
              className="pointer-events-none z-50"
              style={{
                position: "fixed",
                // Right-align tooltip to the trigger's right edge
                right: window.innerWidth - triggerRect.right,
                // Sit above the trigger with 8px gap
                bottom: window.innerHeight - triggerRect.top + 8,
                filter: "drop-shadow(0 4px 8px rgba(25,25,25,0.2))",
              }}
            >
              <span
                className="block bg-ink text-white"
                style={{
                  padding: 8,
                  borderRadius: 8,
                  fontFamily:
                    "var(--font-dd-norms, 'DD Norms', system-ui, sans-serif)",
                  fontWeight: 500,
                  fontSize: 14,
                  lineHeight: "20px",
                  letterSpacing: "-0.01px",
                  maxWidth: 192,
                  width: "max-content",
                }}
              >
                {label}
              </span>
              {/* Tail — bottom-right corner, pointing down */}
              <span
                className="absolute"
                style={{
                  right: 4,
                  top: "100%",
                  marginTop: -1,
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "7px solid #191919",
                }}
              />
            </span>
          )
        ) : (
          triggerRect && (
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none z-50 px-2.5 py-1 rounded-button bg-ink text-white text-body-sm shadow-drag",
                wide ? "leading-snug whitespace-normal" : "whitespace-nowrap",
              )}
              style={{
                position: "fixed",
                display: wide ? "block" : undefined,
                left: triggerRect.left + triggerRect.width / 2,
                bottom: window.innerHeight - triggerRect.top + 8,
                transform: "translateX(-50%)",
                width: wide ? "max-content" : undefined,
                maxWidth: wide ? 240 : undefined,
              }}
            >
              {label}
              <span
                className="absolute left-1/2 top-full -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "5px solid #111318",
                }}
              />
            </span>
          )
        ))}
    </span>
  );
}
