"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { flushSync } from "react-dom";

/**
 * Text typed into an open "+ Lainnya" field but not added yet. The keyboard
 * bar promises it ("2 akan ditambahkan"), so `Lanjut` and `Simpan` add it
 * first, through the same limits and privacy stop, instead of dropping it.
 */
export type PendingAdds = Set<() => boolean>;

export const PendingAddsContext = createContext<PendingAdds | null>(null);

/** Registers this field's "add what is typed" with the screen or sheet. The
 * function returns false when the text was refused (its message shows). */
export function usePendingAdd(add: () => boolean) {
  const registry = useContext(PendingAddsContext);
  const latest = useRef(add);
  // Layout effect: a flush that re-rendered the screen hands the next
  // field's flush its fresh props before it runs.
  useLayoutEffect(() => {
    latest.current = add;
  });
  useEffect(() => {
    if (!registry) return;
    const run = () => latest.current();
    registry.add(run);
    return () => {
      registry.delete(run);
    };
  }, [registry]);
}

/**
 * Adds every pending text, one field at a time with the screen re-rendered in
 * between, so two fields on one screen never write over each other. False
 * when one was refused: the screen stays, with that field's message.
 */
export function flushPendingAdds(registry: PendingAdds): boolean {
  for (const add of [...registry]) {
    let added = true;
    flushSync(() => {
      added = add();
    });
    if (!added) return false;
  }
  return true;
}
