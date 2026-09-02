"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { IconArrowUp, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { customerAuditErrorMessage } from "@/lib/audit/customer-error";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "@/lib/audit/source-handoff";
import { parseSourceInput } from "@/lib/audit/source-input";
import styles from "./SourceHero.module.css";
import backdropStyles from "./SourceHeroBackdrop.module.css";

const AUDIT_BUDGET_WAIT_ERROR = customerAuditErrorMessage("bootstrap");

export default function SourceHero({
  initialValue,
  extracting,
  error,
  onExtract,
  exiting,
  showLogo = true,
  autoFocus = true,
  consumeHandoff = true,
  contentClassName = "",
  backdropClassName = "",
  backdropOverlay = null,
  heading = "Saat customer minta rekomendasi ke ChatGPT, apakah brand Anda disebut?",
  subheading = "Cek brand Anda di hasil pencarian AI sekarang.",
  submitLabel = "Lanjutkan audit",
}: {
  initialValue: string;
  extracting: boolean;
  error: string;
  onExtract: (normalizedUrl: string, fromApprovedHandoff?: boolean) => void;
  exiting: boolean;
  showLogo?: boolean;
  autoFocus?: boolean;
  consumeHandoff?: boolean;
  contentClassName?: string;
  backdropClassName?: string;
  backdropOverlay?: ReactNode;
  heading?: string;
  subheading?: string;
  submitLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const value = draft ?? initialValue;
  const parsed = useMemo(() => parseSourceInput(value), [value]);
  const hasValue = Boolean(value.trim());

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!consumeHandoff || typeof window === "undefined") return;

    const handoff = window.sessionStorage.getItem(
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
    );
    if (!handoff) return;

    const handoffSource = parseSourceInput(handoff);
    if (!handoffSource) {
      window.sessionStorage.removeItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY);
      return;
    }

    // Once extraction really starts, consume the handoff immediately. A later
    // provider/network failure therefore cannot replay automatically on refresh;
    // the visible URL remains available for an explicit manual retry.
    if (extracting) {
      window.sessionStorage.removeItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY);
      return;
    }

    // The audit workflow may mount before its server-side budget bootstrap has
    // completed. Retry only that known non-provider state; any other error stays
    // manual and cannot trigger a hidden repeat request.
    if (error && error !== AUDIT_BUDGET_WAIT_ERROR) return;

    // Defer the handoff-driven React updates out of the effect body. This keeps
    // the effect focused on synchronizing session storage while preserving the
    // submitted source in the input during the budget-readiness handoff.
    const timer = window.setTimeout(() => {
      setDraft((current) => current ?? handoffSource.normalizedUrl);
      onExtract(handoffSource.normalizedUrl, true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [consumeHandoff, error, extracting, onExtract]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!hasValue || extracting) return;

    if (!parsed) {
      setLocalError(
        "Masukkan link website resmi atau akun Instagram yang valid.",
      );
      inputRef.current?.focus();
      return;
    }

    setLocalError("");
    onExtract(parsed.normalizedUrl);
  }

  return (
    <div
      className={`audit-source-hero ${styles.heroStage} ${exiting ? styles.heroExiting : ""}`}
    >
      <div
        className={`${styles.skyField} ${backdropStyles.localBackdrop} ${backdropClassName}`}
        aria-hidden="true"
      >
        <span className={styles.skyFade} />
      </div>

      {backdropOverlay}

      <div className={`${styles.heroContent} ${contentClassName}`}>
        {showLogo ? (
          <div className={styles.heroBrand}>
            <Image
              src="/logo-nuave.svg"
              className={styles.heroLogo}
              alt="Nuave logo"
              width={32}
              height={32}
              priority
            />
            <span className={`${styles.heroLogoText} type-heading-sm`}>
              Nuave
            </span>
          </div>
        ) : null}

        <h1 className={`${styles.heroHeading} type-display`}>{heading}</h1>
        <p className={`${styles.heroSubheading} type-copy-lg`}>{subheading}</p>

        <form onSubmit={handleSubmit} className={styles.heroForm} noValidate>
          <Field className="w-full">
            <div
              className={`${styles.heroInputBar} ${extracting ? styles.heroInputLoading : ""}`}
              onClick={() => inputRef.current?.focus()}
            >
              <Input
                ref={inputRef}
                type="text"
                inputMode="url"
                className={`${styles.heroInput} type-copy`}
                value={value}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setLocalError("");
                }}
                placeholder="https://bisnisanda.com"
                aria-label="Website atau akun Instagram"
                aria-describedby="source-hint source-error"
                aria-invalid={localError || error ? true : undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={extracting}
              />

              <Button
                type="submit"
                variant="default"
                size="icon"
                className={styles.heroSubmit}
                disabled={!hasValue || extracting}
                aria-label={submitLabel}
                aria-busy={extracting}
              >
                {extracting ? (
                  <IconLoader2
                    size={18}
                    stroke={2}
                    className={`${styles.heroSpinner} animate-spin`}
                    aria-hidden="true"
                  />
                ) : (
                  <IconArrowUp size={18} stroke={2.25} aria-hidden="true" />
                )}
              </Button>
            </div>

            <FieldDescription
              id="source-hint"
              className={`${styles.heroHint} type-copy-sm`}
            >
              Masukkan URL website atau akun Instagram resmi bisnis Anda.
            </FieldDescription>

            <p
              id="source-error"
              className={`${styles.heroError} type-copy-sm ${localError || error ? styles.heroErrorVisible : ""}`}
              role={localError || error ? "alert" : undefined}
            >
              {localError || error || " "}
            </p>
          </Field>
        </form>
      </div>
    </div>
  );
}
