import { useEffect, useState } from "react";

/**
 * Prism "Toast" component (Figma node 163:32300) — a brief, fleeting message
 * stating the outcome of an action, with a trailing Undo action.
 *
 * Visual spec mirrors the Figma component:
 *  - background comp/color/toast/background  #191919
 *  - radius   comp/border-radius/toast       8px
 *  - elevation usage/elevation/4             0 4px 16px rgba(25,25,25,0.2)
 *  - padding  usage/space medium / small     16px / 12px, gap 8px
 *  - message  body/medium                    16px / 22px / 500
 *  - Undo     label/medium/strong            16px / 22px / 700
 *
 * Slides up from the bottom on appear and slides back down on dismiss. Auto-
 * dismisses after `duration` ms unless the user clicks Undo first.
 */
export function ToastUndo({
  message,
  onUndo,
  onDismiss,
  duration = 4000,
}: {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}) {
  // Drives the slide transform: starts off-screen (below), animates in, then
  // back out before the parent unmounts us.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const timer = window.setTimeout(close, duration);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slide down, then tell the parent to remove us once the transition lands.
  function close() {
    setShown(false);
    window.setTimeout(onDismiss, 240);
  }

  return (
    <div
      className={
        "transition-transform duration-300 ease-out will-change-transform " +
        (shown ? "translate-y-0" : "translate-y-[calc(100%+5rem)]")
      }
    >
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-button px-4 py-3"
        style={{
          backgroundColor: "#191919",
          boxShadow: "0px 4px 16px rgba(25, 25, 25, 0.2)",
        }}
      >
        <div className="flex min-h-[24px] flex-col justify-center">
          <p className="whitespace-nowrap text-body-lg text-white">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onUndo();
            close();
          }}
          className="whitespace-nowrap text-body-lg-strong text-white"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
