"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconLoader2 } from "@tabler/icons-react";
import {
  INTAKE_CHAPTER_LABELS,
  intakeChapterFor,
  type IntakeScreen,
  type ScopeKind,
} from "@/lib/audit/workflow-authority";
import styles from "./intake.module.css";

/**
 * September 5 approved frame: wordmark, chapter progress, one question,
 * and a persistent footer. The controller's legacy header stays outside it.
 */
export function IntakeShell({
  screen,
  onBack,
  onNext,
  nextLabel = "Lanjut",
  showBack = true,
  busy = false,
  children,
}: {
  /** The active intake screen; the question review passes "questions". */
  screen: IntakeScreen | "questions";
  scopeKind: ScopeKind;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  showBack?: boolean;
  busy?: boolean;
  children: React.ReactNode;
}) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const chapter =
    screen === "questions"
      ? INTAKE_CHAPTER_LABELS.length - 1
      : intakeChapterFor(screen);
  React.useEffect(() => {
    stageRef.current?.querySelector("h1")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  return (
    <div className={styles.frame}>
      <div className={styles.column}>
        <header className={styles.masthead}>
          <Link className={styles.wordmark} href="/" aria-label="Nuave">
            nuave
          </Link>
          <ol className={styles.progress} aria-label="Progres persiapan audit">
            {INTAKE_CHAPTER_LABELS.map((label, index) => {
              const fill = index <= chapter ? 100 : 0;
              return (
                <li
                  key={label}
                  aria-current={index === chapter ? "step" : undefined}
                  className={styles.progressStep}
                >
                  <span className={styles.progressTrack} aria-hidden="true">
                    <span
                      className={styles.progressFill}
                      style={{ width: `${fill}%` }}
                    />
                  </span>
                  <span className="sr-only">
                    Bab {index + 1}: {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </header>
        <div className={styles.stage} ref={stageRef}>
          {children}
        </div>
      </div>
      <nav className={styles.bottomNav} aria-label="Navigasi persiapan audit">
        <div className={styles.actions}>
          {showBack ? (
            <Button
              className={styles.backAction}
              variant="ghost"
              type="button"
              onClick={onBack}
              disabled={busy}
            >
              Kembali
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}
          <Button
            variant="default"
            type="button"
            onClick={onNext}
            disabled={busy}
            className={`${styles.primaryAction} ${screen === "review" ? styles.reviewAction : ""}`}
          >
            {busy ? (
              <IconLoader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            {nextLabel}
          </Button>
        </div>
      </nav>
    </div>
  );
}

/** One customer-facing question as the screen heading, per the prototype. */
export function IntakeHeading({
  screen,
  title,
  lead,
  optional = false,
}: {
  screen: IntakeScreen;
  title: string;
  lead?: string;
  optional?: boolean;
}) {
  return (
    <header className={styles.heading}>
      <h1
        id={`intake-${screen}-heading`}
        className={styles.title}
        tabIndex={-1}
      >
        {title}
        {optional ? (
          <span className={styles.optionalBadge}>Opsional</span>
        ) : null}
      </h1>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
    </header>
  );
}

/** Inline field error with alert semantics. */
export function IntakeFieldError({
  id,
  message,
}: {
  id?: string;
  message?: string;
}) {
  return message ? (
    <p id={id} className={styles.fieldError} role="alert">
      {message}
    </p>
  ) : null;
}
