"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import {
  IconArrowRight,
  IconBrandInstagram,
  IconLink,
  IconSearch,
} from "@tabler/icons-react";
import { parseSourceInput } from "@/lib/audit/source-input";
import styles from "./spec004.module.css";

const EXAMPLES = [
  { label: "kopitamansenja.example", value: "kopitamansenja.example" },
  { label: "@kopitamansenja", value: "@kopitamansenja" },
];

const HINT_INVALID =
  "Tambahkan link situs atau nama Instagram, contoh: kopitamansenja.example atau @kopitamansenja.";

export default function Spec004Hero({
  initialValue,
  extracting,
  error,
  onExtract,
}: {
  initialValue: string;
  extracting: boolean;
  error: string;
  onExtract: (normalizedUrl: string) => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const [shake, setShake] = useState(false);
  const [phase, setPhase] = useState<"idle" | "scanning">("idle");
  const [typedAfterError, setTypedAfterError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = parseSourceInput(draft);
  const shownError = error && !typedAfterError ? error : "";
  const showScan = phase === "scanning" && !(error && !extracting);

  useEffect(() => {
    if (!showScan) inputRef.current?.focus();
  }, [showScan]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value);
    setTypedAfterError(true);
  }

  function handleExample(value: string) {
    setDraft(value);
    setTypedAfterError(true);
    inputRef.current?.focus();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed) {
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
      return;
    }
    setTypedAfterError(false);
    setPhase("scanning");
    onExtract(parsed.normalizedUrl);
  }

  const typeLabel =
    parsed?.sourceType === "instagram" ? "Instagram" : "Situs web";

  return (
    <div className={styles.hero}>
      <form className={styles.heroStage} onSubmit={handleSubmit} noValidate>
        <header className={styles.heroIntro}>
          <h1>Bisnis apa yang ingin Anda periksa lewat AI?</h1>
          <p>
            Tempel link situs web atau nama Instagram. Kami susun analisisnya —
            tanpa perlu daftar.
          </p>
        </header>

        {showScan ? (
          <div className={styles.heroScan} aria-live="polite" role="status">
            <div className={styles.heroCard}>
              <span className={styles.scanLine} aria-hidden="true" />
              <span className={styles.heroCardGlyph} aria-hidden="true">
                {parsed?.sourceType === "instagram" ? (
                  <IconBrandInstagram />
                ) : (
                  <IconLink />
                )}
              </span>
              <span className={styles.heroCardUrl}>
                {parsed?.normalizedUrl}
              </span>
              <span className={styles.heroCardType}>{typeLabel}</span>
            </div>
            <ol className={styles.heroStatus}>
              <li>Membaca sumber publik…</li>
              <li>Mencari nama, logo, dan deskripsi…</li>
              <li>Menyusun draf ringkasan…</li>
            </ol>
          </div>
        ) : (
          <>
            <div className={styles.heroFieldWrap}>
              <div
                className={styles.heroField}
                data-shake={shake ? "true" : undefined}
              >
                <span
                  className={styles.heroChip}
                  data-visible={parsed ? "true" : undefined}
                >
                  {parsed?.sourceType === "instagram" ? (
                    <IconBrandInstagram aria-hidden="true" />
                  ) : parsed?.sourceType === "website" ? (
                    <IconLink aria-hidden="true" />
                  ) : (
                    <IconSearch aria-hidden="true" />
                  )}
                  {parsed ? (
                    <span className={styles.heroChipLabel}>{typeLabel}</span>
                  ) : null}
                </span>
                <input
                  ref={inputRef}
                  className={styles.heroInput}
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Situs web atau nama Instagram"
                  placeholder="Tempel link atau nama akun"
                  value={draft}
                  onChange={handleChange}
                />
              </div>
            </div>

            {parsed ? (
              <div className={styles.heroSubmitWrap}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isDisabled={extracting}
                >
                  {extracting ? <Spinner size="sm" /> : <IconArrowRight />}
                  {parsed.sourceType === "instagram"
                    ? "Analisis akun ini"
                    : "Analisis situs ini"}
                </Button>
              </div>
            ) : null}

            <p
              className={styles.heroHint}
              data-kind={shownError ? "error" : "hint"}
              aria-live="polite"
            >
              {shownError || (shake ? HINT_INVALID : "")}
            </p>

            <ul className={styles.heroExamples}>
              <li>
                <span>Coba contoh:</span>
              </li>
              {EXAMPLES.map((example) => (
                <li key={example.value}>
                  <button
                    type="button"
                    className={styles.heroExample}
                    onClick={() => handleExample(example.value)}
                  >
                    {example.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </form>

      <p className={styles.heroReassurance}>
        Hanya informasi publik dari situs web atau Instagram resmi.
      </p>
    </div>
  );
}
