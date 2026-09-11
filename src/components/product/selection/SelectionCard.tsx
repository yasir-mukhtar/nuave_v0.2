"use client";

import * as React from "react";
import { Radio, RadioGroup } from "@base-ui/react";
import styles from "./selection.module.css";

/**
 * Single-choice shell for selection cards and rows (R-27). Composition sits on
 * Base UI's radio group so arrow-key movement, ARIA `radiogroup`/`radio`
 * roles, and `aria-checked` state come from the primitive.
 */
export function SelectionGroup({
  value,
  onValueChange,
  label,
  labelId,
  name,
  disabled,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible group name when no visible heading id exists. */
  label?: string;
  /** Id of a visible heading that names the group. */
  labelId?: string;
  name?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      disabled={disabled}
      name={name}
      aria-label={label}
      aria-labelledby={labelId}
      className={styles.group}
    >
      {children}
    </RadioGroup>
  );
}

export function SelectionCard({
  value,
  title,
  description,
  icon,
  disabled,
  id,
}: {
  value: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <Radio.Root
      value={value}
      disabled={disabled}
      className={styles.card}
      id={id}
    >
      {icon ? (
        <span className={styles.cardIcon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.cardBody}>
        <span className={styles.cardTitle}>{title}</span>
        {description ? (
          <span className={styles.cardDescription}>{description}</span>
        ) : null}
      </span>
    </Radio.Root>
  );
}
