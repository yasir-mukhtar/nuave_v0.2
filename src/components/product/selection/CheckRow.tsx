"use client";

import * as React from "react";
import { Checkbox } from "@base-ui/react";
import { IconCheck } from "@tabler/icons-react";
import styles from "./selection.module.css";

/** The column the rows sit in, named by a heading or a label. */
export function CheckList({
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
      className={styles.checkList}
    >
      {children}
    </div>
  );
}

/**
 * One item of a found list that can be ticked with others (J20): the whole
 * row is the checkbox, so the target is the full width. Base UI supplies the
 * `checkbox` role, `aria-checked` and Space handling.
 */
export function CheckRow({
  label,
  sub,
  tag,
  avatar,
  checked,
  onCheckedChange,
}: {
  label: string;
  sub?: string;
  /** A provenance pill under the name ("Saran Nuave", "Dari Anda"). */
  tag?: string;
  /** Initials shown in the round mark on the left. */
  avatar?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const detailId = React.useId();
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
      className={styles.checkRow}
      aria-label={label}
      aria-describedby={sub || tag ? detailId : undefined}
    >
      {avatar ? (
        <span className={styles.checkAvatar} aria-hidden="true">
          {avatar}
        </span>
      ) : null}
      <span className={styles.checkBody}>
        <span className={styles.checkTitle}>{label}</span>
        {sub || tag ? (
          <span id={detailId} className="contents">
            {sub ? <span className={styles.checkSub}>{sub}</span> : null}
            {tag ? <small className={styles.rowMeta}>{tag}</small> : null}
          </span>
        ) : null}
      </span>
      <span className={styles.checkBox} aria-hidden="true">
        {checked ? <IconCheck size={16} stroke={2.5} /> : null}
      </span>
    </Checkbox.Root>
  );
}
