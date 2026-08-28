"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@heroui/react";
import { IconArrowUp } from "@tabler/icons-react";
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
}: {
  initialValue: string;
  extracting: boolean;
  error: string;
  onExtract: (normalizedUrl: string) => void;
  exiting: boolean;
  showLogo?: boolean;
  autoFocus?: boolean;
  consumeHandoff?: boolean;
  contentClassName?: string;
  backdropClassName?: string;
  backdropOverlay?: ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");
  const [handoffInProgress, setHandoffInProgress] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const value = draft ?? initialValue;
  const parsed = useMemo(() => parseSourceInput(value), [value]);
  const hasValue = Boolean(value.trim());
  const visibleError =
    localError ||
    (handoffInProgress && error === AUDIT_BUDGET_WAIT_ERROR ? "" : error);

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

    // Defer the handoff-driven React updates out of the effect body. Mark the
    // handoff pending in the same batch as extraction so the known budget wait
    // state never renders as a user-facing error while the bootstrap catches up.
    const timer = window.setTimeout(() => {
      setHandoffInProgress(true);
      setDraft((current) => current ?? handoffSource.normalizedUrl);
      onExtract(handoffSource.normalizedUrl);
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
          <Image
            src="/logo-nuave-horizontal.png"
            className={styles.heroLogo}
            alt="Nuave"
            width={152}
            height={48}
            priority
          />
        ) : null}

        <h1 className={styles.heroHeading}>
          Saat customer minta rekomendasi ke ChatGPT, apakah brand Anda disebut?
        </h1>
        <p className={styles.heroSubheading}>
          Cek brand Anda di hasil pencarian AI sekarang.
        </p>

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
              aria-label="Website atau akun Instagram"
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
              aria-busy={extracting}
            >
              {extracting ? (
                <Spinner size="sm" className={styles.heroSpinner} />
              ) : (
                <IconArrowUp size={18} stroke={2.25} />
              )}
            </button>
          </div>

          <p
            id="source-hint"
            className={styles.heroHint}
            style={{
              color: "#ffffff",
              textShadow: "0 1px 6px rgba(0, 30, 80, 0.2)",
            }}
          >
            Masukkan URL website atau akun Instagram resmi bisnis Anda.
          </p>

          <p
            id="source-error"
            className={`${styles.heroError} ${visibleError ? styles.heroErrorVisible : ""}`}
            role={visibleError ? "alert" : undefined}
          >
            {visibleError || " "}
          </p>
        </form>
      </div>
    </div>
  );
}
