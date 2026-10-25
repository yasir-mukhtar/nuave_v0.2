"use client";

import { useSyncExternalStore } from "react";

/**
 * True when the viewport is at least `px` wide. The server render and
 * hydration start narrow (the phone layout); the answer updates after.
 */
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia(query).matches,
    () => false,
  );
}
