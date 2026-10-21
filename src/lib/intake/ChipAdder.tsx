"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { AddChip } from "@/components/product/selection/Chip";
import { FloatingField } from "@/components/product/journey/FloatingField";
import { KeyboardAccessory } from "@/components/product/journey/KeyboardAccessory";
import { usePendingAdd } from "./pending-adds";

/** "matcha, es teh" → ["matcha", "es teh"]: trimmed, distinct, non-empty. */
export function splitList(value: string, onComma = true): string[] {
  const seen = new Set<string>();
  return (onComma ? value.split(/[,\n]/) : [value])
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLocaleLowerCase("id-ID");
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * The typed escape hatch behind "+ Lainnya" (J14/J15, J17, J19b): a chip that
 * opens one field. A pasted list splits on commas; Enter or "Tambah" adds and
 * keeps the field open for more. On a phone the keyboard bar previews what
 * will be added, or offers one-tap suggestions so spelling never matters.
 */
export function ChipAdder({
  addLabel,
  addContext,
  fieldLabel,
  placeholder,
  hint,
  onAdd,
  suggestionsFor,
  splitOnComma = true,
  maxLength = 300,
  error,
  startOpen = false,
  variant = "chip",
  accessoryExtra,
}: {
  addLabel: string;
  /** Tells two adders on one screen apart for screen readers. */
  addContext?: string;
  fieldLabel: string;
  placeholder?: string;
  hint?: ReactNode;
  /** Adds the items; false keeps the draft for correction. */
  onAdd: (items: string[]) => boolean;
  /** One-tap completions for the typed text (J19b). */
  suggestionsFor?: (draft: string) => string[];
  splitOnComma?: boolean;
  maxLength?: number;
  error?: string | null;
  /** Open from the start (J21: nothing was found to tick). Arrival still
   * focuses the screen heading (R-27); the field waits for a tap. */
  startOpen?: boolean;
  /** Show the field itself instead of the "+" chip (J14: one box). */
  variant?: "chip" | "field";
  /** Extra end-of-bar control (J21 "Lewati"). */
  accessoryExtra?: ReactNode;
}) {
  const animate = useMotionAllowed();
  const alwaysOpen = variant === "field" || startOpen;
  const [open, setOpen] = useState(alwaysOpen);
  const [draft, setDraft] = useState("");
  // The text the last add refused (a limit or the privacy stop); it stays in
  // the field for correction until it is changed.
  const [refused, setRefused] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const items = splitList(draft, splitOnComma);
  const wasRefused = refused !== null && refused === draft;
  const suggestions = suggestionsFor ? suggestionsFor(draft) : [];
  useEffect(() => {
    if (open && !alwaysOpen) field.current?.focus();
    // Only when the person opens it, not on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // A press elsewhere takes focus from the empty field before its click
  // lands. Folding at once would move what is under the finger (a short
  // sheet shrinks from the top), and the click would be lost, so the field
  // folds once the press is over.
  const pressing = useRef(false);
  useEffect(() => {
    if (!open || alwaysOpen) return;
    const down = () => {
      pressing.current = true;
    };
    const up = () => {
      pressing.current = false;
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
    };
  }, [open, alwaysOpen]);
  const foldWhenLeft = () => {
    const fold = () =>
      window.setTimeout(() => {
        if (
          document.activeElement !== field.current &&
          !field.current?.value.trim()
        )
          setOpen(false);
      }, 0);
    if (!pressing.current) {
      fold();
      return;
    }
    const released = () => {
      document.removeEventListener("pointerup", released, true);
      document.removeEventListener("pointercancel", released, true);
      fold();
    };
    document.addEventListener("pointerup", released, true);
    document.addEventListener("pointercancel", released, true);
  };
  const add = (values: string[]) => {
    if (!values.length) return;
    if (onAdd(values)) setDraft("");
    else setRefused(draft);
    field.current?.focus();
  };
  // `Lanjut` or `Simpan` adds what the bar says will be added. Text the
  // person already saw refused is left behind (its message was shown); new
  // text that is refused now keeps the screen, with its message.
  usePendingAdd(() => {
    if (!items.length || wasRefused) return true;
    if (!onAdd(items)) {
      setRefused(draft);
      return false;
    }
    setDraft("");
    return true;
  });
  if (!open)
    return (
      <AddChip
        label={addLabel}
        context={addContext}
        expanded={false}
        controls={panelId}
        onClick={() => setOpen(true)}
      />
    );
  return (
    <motion.div
      id={panelId}
      // The bar's one-line hint must not widen the column on a narrow phone.
      className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-3"
      initial={animate ? { opacity: 0, y: -4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_SETTLE}
    >
      <FloatingField
        ref={field}
        label={fieldLabel}
        value={draft}
        placeholder={placeholder}
        maxLength={maxLength * 4}
        autoComplete="off"
        enterKeyHint="done"
        error={error}
        hint={hint}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (!draft.trim() && !alwaysOpen) foldWhenLeft();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add(items);
          }
          if (event.key === "Escape" && !draft && !alwaysOpen) setOpen(false);
        }}
      />
      <KeyboardAccessory open={focused || Boolean(draft)} label={fieldLabel}>
        {suggestions.length ? (
          // J19b: the suggestions scroll sideways in the room they have, so
          // Tambah stays on screen however many there are.
          <div className="-my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="type-label-lg h-10 shrink-0 rounded-chip border border-line-300 bg-white px-[18px] text-ink-900 transition-transform active:scale-[0.96]"
                onClick={() => add([suggestion])}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          <p
            className="type-copy-sm m-0 min-w-0 flex-1 truncate text-ink-600"
            aria-live="polite"
          >
            {!items.length
              ? "Enter untuk menambah. Bisa lebih dari satu."
              : wasRefused
                ? `Belum ditambahkan: ${items.join(", ")}`
                : `${items.length} akan ditambahkan: ${items.join(", ")}`}
          </p>
        )}
        {accessoryExtra}
        <Button
          type="button"
          variant="ink"
          size="touch"
          disabled={!items.length}
          onClick={() => add(items)}
        >
          Tambah
        </Button>
      </KeyboardAccessory>
    </motion.div>
  );
}
