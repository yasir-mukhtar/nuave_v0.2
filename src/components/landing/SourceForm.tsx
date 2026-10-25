"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2, IconWorld } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "@/lib/audit/source-handoff";
import { parseSourceInput } from "@/lib/audit/source-input";
import { cn } from "@/lib/utils";
import styles from "./SourceForm.module.css";

export const SOURCE_FIELD_LABEL = "Website atau Instagram klinik";
export const SOURCE_BUTTON_LABEL = "Cek klinik saya di AI";
const INVALID_SOURCE = "Masukkan satu website atau akun Instagram yang valid.";

/**
 * One website or Instagram address, handed to `/audit`, which starts the
 * free check at once. The hero, the price receipt and the closing section
 * each show one (Spec 019 R-04: the same code as the old landing form).
 *
 * `auto` is two lines on a phone and one joined pill from 768px; `stacked`
 * stays two lines (the price receipt).
 */
export function SourceForm({
  layout = "auto",
  inputId,
  className,
}: {
  layout?: "auto" | "stacked";
  inputId?: string;
  className?: string;
}) {
  const router = useRouter();
  const generatedId = useId();
  const id = inputId ?? `source-${generatedId}`;
  const errorId = `${id}-error`;
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const start = () => {
    const parsed = parseSourceInput(source);
    if (!parsed) {
      setError(INVALID_SOURCE);
      input.current?.focus();
      return;
    }
    setError(null);
    setLeaving(true);
    try {
      // `/audit` reads this once and starts the free check right away.
      window.sessionStorage.setItem(
        AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
        parsed.normalizedUrl,
      );
    } catch {
      // Storage blocked: `/audit` asks for the website again.
    }
    router.push("/audit");
  };

  // `data-source-form`: the sticky bar hides while any of these is on screen.
  return (
    <form
      noValidate
      data-source-form
      className={cn(
        styles.form,
        layout === "auto" ? styles.auto : styles.stacked,
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <div className={styles.shell}>
        <label className={styles.field} htmlFor={id}>
          <IconWorld
            className={styles.globe}
            size={20}
            stroke={1.75}
            aria-hidden="true"
          />
          <span className="sr-only">{SOURCE_FIELD_LABEL}</span>
          <input
            ref={input}
            id={id}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              if (error) setError(null);
            }}
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={2_000}
            placeholder={SOURCE_FIELD_LABEL}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={styles.input}
          />
        </label>
        <Button
          type="submit"
          variant="commit"
          className={styles.button}
          disabled={leaving}
          aria-busy={leaving || undefined}
        >
          {leaving ? (
            <IconLoader2
              className={cn("animate-spin", styles.spinner)}
              aria-hidden="true"
            />
          ) : null}
          {SOURCE_BUTTON_LABEL}
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
