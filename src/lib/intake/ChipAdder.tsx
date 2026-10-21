"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { AddChip } from "@/components/product/selection/Chip";
import { FloatingField } from "@/components/product/journey/FloatingField";
import { KeyboardAccessory } from "@/components/product/journey/KeyboardAccessory";

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
  const [focused, setFocused] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const items = splitList(draft, splitOnComma);
  const suggestions = suggestionsFor ? suggestionsFor(draft) : [];
  useEffect(() => {
    if (open && !alwaysOpen) field.current?.focus();
    // Only when the person opens it, not on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const add = (values: string[]) => {
    if (!values.length) return;
    if (onAdd(values)) setDraft("");
    field.current?.focus();
  };
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
      className="grid w-full gap-3"
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
          if (!draft.trim() && !alwaysOpen) setOpen(false);
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
          suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="type-label-lg h-10 shrink-0 rounded-chip border border-line-300 bg-white px-[18px] text-ink-900 transition-transform active:scale-[0.96]"
              onClick={() => add([suggestion])}
            >
              {suggestion}
            </button>
          ))
        ) : (
          <p
            className="type-copy-sm m-0 min-w-0 flex-1 truncate text-ink-600"
            aria-live="polite"
          >
            {items.length
              ? `${items.length} akan ditambahkan: ${items.join(", ")}`
              : "Enter untuk menambah. Bisa lebih dari satu."}
          </p>
        )}
        {suggestions.length ? <span className="flex-1" /> : null}
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
