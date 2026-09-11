"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "./selection.module.css";

/**
 * The typed escape hatch under cards, rows, and chips (R-27). Committing
 * clears the draft; the button stays disabled until there is a value.
 */
export function AddLine({
  inputLabel,
  placeholder,
  buttonLabel = "Tambah",
  onCommit,
  disabled,
  id,
}: {
  inputLabel: string;
  placeholder?: string;
  buttonLabel?: string;
  onCommit: (value: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [draft, setDraft] = React.useState("");

  function commit() {
    const value = draft.trim();
    if (!value) return;
    onCommit(value);
    setDraft("");
  }

  return (
    <div className={styles.addLine}>
      <Input
        id={id}
        aria-label={inputLabel}
        placeholder={placeholder}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        className={styles.addLineInput}
      />
      <Button
        type="button"
        variant="outline"
        onClick={commit}
        disabled={disabled || !draft.trim()}
        className={styles.addLineButton}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
