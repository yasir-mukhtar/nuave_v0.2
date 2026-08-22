"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@heroui/react";
import { IconArrowUp } from "@tabler/icons-react";
import { parseSourceInput } from "@/lib/audit/source-input";
import styles from "./SourceHero.module.css";

export default function SourceHero({
  initialValue,
  extracting,
  error,
  onExtract,
  exiting,
}: {
  initialValue: string;
  extracting: boolean;
  error: string;
  onExtract: (normalizedUrl: string) => void;
  exiting: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const value = draft ?? initialValue;
  const parsed = useMemo(() => parseSourceInput(value), [value]);
  const hasValue = Boolean(value.trim());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!hasValue || extracting) return;

    if (!parsed) {
      setLocalError(
        "Masukkan link website, akun Instagram, atau Google Business Profile yang valid.",
      );
      inputRef.current?.focus();
      return;
    }

    setLocalError("");
    onExtract(parsed.normalizedUrl);
  }

  return (
    <div className={`${styles.heroStage} ${exiting ? styles.heroExiting : ""}`}>
      <div className={styles.skyField} aria-hidden="true">
        <span className={styles.skyFade} />
      </div>

      <div className={styles.heroContent}>
        <Image
          src="/logo-nuave-horizontal.png"
          className={styles.heroLogo}
          alt="Nuave"
          width={152}
          height={48}
          priority
        />

        <h1 className={styles.heroHeading}>Ayo mulai audit brand Anda</h1>

        <form onSubmit={handleSubmit} className={styles.heroForm} noValidate>
          <div
            className={`${styles.heroInputBar} ${extracting ? styles.heroInputLoading : ""}`}
            onClick={() => inputRef.current?.focus()}
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="url"
              className={styles.heroInput}
              value={value}
              onChange={(event) => {
                setDraft(event.target.value);
                setLocalError("");
              }}
              placeholder="https://bisnisanda.com"
              aria-label="Website, akun Instagram, atau Google Business Profile"
              aria-describedby="source-hint source-error"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={extracting}
            />

            <button
              type="submit"
              className={styles.heroSubmit}
              disabled={!hasValue || extracting}
              aria-label="Lanjutkan audit"
            >
              {extracting ? (
                <Spinner size="sm" className={styles.heroSpinner} />
              ) : (
                <IconArrowUp size={18} stroke={2.25} />
              )}
            </button>
          </div>

          <p id="source-hint" className={styles.heroHint}>
            Masukkan URL website, akun instagram, atau Google Business Profile
            bisnis Anda.
          </p>

          <p
            id="source-error"
            className={`${styles.heroError} ${localError || error ? styles.heroErrorVisible : ""}`}
            role={localError || error ? "alert" : undefined}
          >
            {localError || error || " "}
          </p>
        </form>
      </div>
    </div>
  );
}
