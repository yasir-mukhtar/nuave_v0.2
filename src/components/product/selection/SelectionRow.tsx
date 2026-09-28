"use client";

import * as React from "react";
import { Radio } from "@base-ui/react";
import styles from "./selection.module.css";

/**
 * One choice inside a detected list (R-27). Radio semantics come from
 * Base UI; compose it with `SelectionGroup`.
 */
export function SelectionRow({
  value,
  title,
  description,
  meta,
  disabled,
}: {
  value: string;
  title: string;
  description?: string;
  /** Small muted provenance note (e.g. an origin label) under the title. */
  meta?: string;
  disabled?: boolean;
}) {
  return (
    <Radio.Root value={value} disabled={disabled} className={styles.row}>
      <span className={styles.rowDot} aria-hidden="true" />
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{title}</span>
        {description ? (
          <span className={styles.rowDescription}>{description}</span>
        ) : null}
        {meta ? <small className={styles.rowMeta}>{meta}</small> : null}
      </span>
    </Radio.Root>
  );
}
