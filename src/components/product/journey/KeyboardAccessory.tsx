"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { cn } from "@/lib/utils";
import { BOTTOM_BAR_HEIGHT_VAR } from "./JourneyBars";

const COARSE_QUERY = "(pointer: coarse)";

/**
 * Inside a sheet the bar stays in the sheet, under its field: a bar floated
 * over the page would sit outside the modal sheet, where a tap counts as a
 * tap outside and closes it.
 */
export const KeyboardAccessoryInline = createContext(false);

function subscribeCoarse(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return () => {};
  const query = window.matchMedia(COARSE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on touch-first devices, where an on-screen keyboard covers the page. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribeCoarse,
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia(COARSE_QUERY).matches,
    () => false,
  );
}

/** How far the on-screen keyboard pushes into the layout viewport, in px. */
function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const update = () =>
      setInset(
        Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop),
      );
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [active]);
  return active ? inset : 0;
}

/**
 * True while `open`, and for the rest of a press that began while it was:
 * a press elsewhere takes focus (closing the bar) before its click lands,
 * and an inline bar leaving at once would move what is under the pointer,
 * so the click would be lost.
 */
function useOpenThroughPress(open: boolean): boolean {
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (!open && !pressed) return;
    const down = () => setPressed(true);
    // After the press's own click, which follows its pointerup.
    const up = () => window.setTimeout(() => setPressed(false), 0);
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
    };
  }, [open, pressed]);
  return open || pressed;
}

/** Taps on the bar's buttons must not take focus from the field (which
 * would close the phone keyboard, or hide the bar on a desktop). */
function keepFieldFocus(event: React.PointerEvent | React.MouseEvent) {
  if ((event.target as HTMLElement).closest("button")) event.preventDefault();
}

/**
 * The bar that rides on top of the phone keyboard (J08, J15, J19b, J21,
 * J23): one-tap completions on the left, the next action on the right. On a
 * device without an on-screen keyboard the same content sits under the field
 * instead, so nothing depends on touch.
 */
export function KeyboardAccessory({
  open,
  children,
  label,
  className,
}: {
  open: boolean;
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const inline = useContext(KeyboardAccessoryInline);
  const coarse = useCoarsePointer() && !inline;
  const animate = useMotionAllowed();
  const inset = useKeyboardInset(open && coarse);
  const shownInline = useOpenThroughPress(open && !coarse);
  if (!coarse)
    return shownInline ? (
      <div
        role="group"
        aria-label={label}
        className={cn("flex min-w-0 items-center gap-2", className)}
        onPointerDown={keepFieldFocus}
        onMouseDown={keepFieldFocus}
      >
        {children}
      </div>
    ) : null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          role="group"
          aria-label={label}
          className={cn(
            "fixed inset-x-0 z-40 mx-auto flex min-h-16 w-full max-w-[480px] items-center gap-2 border-t border-line-200 bg-white px-4 py-2.5",
            className,
          )}
          // Above the keyboard; with no on-screen keyboard (a tablet with a
          // keyboard case) it floats just above the bottom bar, whatever
          // that bar's height, so it never covers the bar's action.
          style={{
            bottom:
              inset > 0
                ? inset
                : `var(${BOTTOM_BAR_HEIGHT_VAR}, calc(84px + env(safe-area-inset-bottom, 0px)))`,
          }}
          initial={animate ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={animate ? { opacity: 0, y: 12 } : { opacity: 0 }}
          transition={SPRING_SETTLE}
          onPointerDown={keepFieldFocus}
          onMouseDown={keepFieldFocus}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
