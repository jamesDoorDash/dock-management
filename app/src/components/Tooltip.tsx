import { useState, useRef, type ReactNode } from "react";

interface Props {
  /** Tooltip body text. */
  label: string;
  /** Trigger element. */
  children: ReactNode;
}

/**
 * Simple controlled tooltip that appears on hover/focus above its trigger.
 * Renders as a black floating pill with a downward-pointing tail.
 */
export function Tooltip({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

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
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 pointer-events-none z-50 px-2.5 py-1 rounded-button bg-ink text-white text-body-sm whitespace-nowrap shadow-drag"
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
      )}
    </span>
  );
}
