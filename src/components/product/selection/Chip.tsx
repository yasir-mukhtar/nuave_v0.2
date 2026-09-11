"use client";

import * as React from "react";
import { Toggle } from "@base-ui/react";
import { IconX } from "@tabler/icons-react";
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
}: {
  label: string;
  selected: boolean;
  onToggle: (selected: boolean) => void;
  disabled?: boolean;
  removable?: boolean;
}) {
  return (
    <Toggle
      pressed={selected}
      onPressedChange={(pressed) => onToggle(pressed)}
      disabled={disabled}
      className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
    >
      <span className={styles.chipLabel}>{label}</span>
      {selected && removable ? (
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
