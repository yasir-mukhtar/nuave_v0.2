"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * True when the viewport is at least `px` wide. The server render and
 * hydration start narrow (the phone layout); the answer updates after.
 */
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  // One subscription per query, not one per render.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia(query).matches,
    () => false,
  );
}
