"use client";

import * as React from "react";
import { Radio, RadioGroup, Toggle } from "@base-ui/react";
import styles from "./selection.module.css";

/** The 2 x 2 grid the tiles sit in. */
export function TileGrid({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className={styles.tileGrid}>
      {children}
    </div>
  );
}

/** Multi-select tile (J18): pressed state is `aria-pressed`. */
export function ToggleTile({
  label,
  icon,
  pressed,
  onPressedChange,
}: {
  label: string;
  icon: React.ReactNode;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={(next) => onPressedChange(next)}
      className={styles.tile}
    >
      <span className={styles.tileIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.tileLabel}>{label}</span>
    </Toggle>
  );
}

/** Single-choice tiles (J19) on Base UI's radio group. */
export function RadioTileGroup({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      aria-label={label}
      className={styles.tileGrid}
    >
      {children}
    </RadioGroup>
  );
}

export function RadioTile({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Radio.Root value={value} className={styles.tile}>
      <span className={styles.tileIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.tileLabel}>{label}</span>
    </Radio.Root>
  );
}
