"use client";

import * as React from "react";
import { Radio, RadioGroup, Toggle } from "@base-ui/react";
import { IconCheck, IconPlus, IconX } from "@tabler/icons-react";
import styles from "./selection.module.css";

/**
 * Multi-select and removal chip (R-27). Pressed state is `aria-pressed`; a
 * selected removable chip shows the removal affordance inside the control.
 */
export function Chip({
  label,
  selected,
  onToggle,
  disabled,
  removable = true,
  selectedIndicator = "remove",
}: {
  label: string;
  selected: boolean;
  onToggle: (selected: boolean) => void;
  disabled?: boolean;
  removable?: boolean;
  selectedIndicator?: "remove" | "check";
}) {
  return (
    <Toggle
      pressed={selected}
      onPressedChange={(pressed) => onToggle(pressed)}
      disabled={disabled}
      className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
    >
      {selected && selectedIndicator === "check" ? (
        <IconCheck size={18} stroke={2.25} aria-hidden="true" />
      ) : null}
      <span className={styles.chipLabel}>{label}</span>
      {selected && removable && selectedIndicator === "remove" ? (
        <span className={styles.chipRemove} aria-hidden="true">
          <IconX size={14} stroke={1.6} />
        </span>
      ) : null}
    </Toggle>
  );
}

/** Named container for a chip group. */
export function ChipGroup({
  label,
  labelId,
  children,
}: {
  label?: string;
  labelId?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-labelledby={labelId}
      className={styles.chipList}
    >
      {children}
    </div>
  );
}

/** "+ Lainnya": a chip-shaped button that opens the typed escape hatch. */
export function AddChip({
  label,
  context,
  onClick,
  expanded,
  controls,
}: {
  label: string;
  /** Read after the label by screen readers when a screen has two adders
   * ("Lainnya (kebutuhan)"). */
  context?: string;
  onClick: () => void;
  expanded?: boolean;
  controls?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      className={`${styles.chip} ${styles.chipAdd}`}
    >
      <IconPlus size={18} stroke={1.75} aria-hidden="true" />
      <span className={styles.chipLabel}>{label}</span>
      {context ? <span className="sr-only"> ({context})</span> : null}
    </button>
  );
}

/**
 * Single-choice chips (J13): Base UI radio semantics in the chip look, with
 * the check showing on the chosen one.
 */
export function ChipRadioGroup({
  label,
  labelId,
  value,
  onValueChange,
  children,
}: {
  label?: string;
  labelId?: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      aria-label={label}
      aria-labelledby={labelId}
      className={styles.chipList}
    >
      {children}
    </RadioGroup>
  );
}

export function RadioChip({
  value,
  label,
  checked,
}: {
  value: string;
  label: string;
  /** Mirrors the group value so the check can render inside the chip. */
  checked: boolean;
}) {
  return (
    <Radio.Root
      value={value}
      className={`${styles.chip} ${checked ? styles.chipSelected : ""}`}
    >
      {checked ? (
        <IconCheck size={18} stroke={2.25} aria-hidden="true" />
      ) : null}
      <span className={styles.chipLabel}>{label}</span>
    </Radio.Root>
  );
}
