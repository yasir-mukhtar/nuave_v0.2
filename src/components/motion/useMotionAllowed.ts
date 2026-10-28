"use client";

import { useSyncExternalStore } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return () => {};
  const query = window.matchMedia(REDUCE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** A browser that cannot report the preference stays still. */
function motionAllowed() {
  return (
    typeof window.matchMedia === "function" &&
    !window.matchMedia(REDUCE_QUERY).matches
  );
}

/**
 * True when spatial motion may play: the browser can report the
 * reduced-motion preference and the person has not asked for less motion.
 * The server render and hydration always start still.
 */
export function useMotionAllowed(): boolean {
  return useSyncExternalStore(subscribe, motionAllowed, () => false);
}

/** The same answer outside React (event handlers, async flows). */
export function motionAllowedNow(): boolean {
  return typeof window !== "undefined" && motionAllowed();
}

/**
 * Holds an async flow for a short beat so a finishing animation can be seen
 * (a tick landing, chips dropping in). With reduced motion it does not wait.
 */
export function pauseForMotion(ms: number): Promise<void> {
  if (!motionAllowedNow()) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
