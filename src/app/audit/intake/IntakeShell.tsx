"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  IconArrowLeft,
  IconArrowRight,
  IconLoader2,
} from "@tabler/icons-react";
import {
  INTAKE_CHAPTER_LABELS,
  intakeChapterFor,
  intakeScreenSequence,
  type IntakeScreen,
  type ScopeKind,
} from "@/lib/audit/workflow-authority";
import styles from "./intake.module.css";

/**
 * The recovered intake frame (recovery plan §6.3 S2): one 560px column, one
 * chapter progress bar, and one Kembali/Lanjut pair, fixed to the bottom.
 */
export function IntakeShell({
  screen,
  scopeKind,
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
  const sequence = intakeScreenSequence(scopeKind);
  const chapter =
    screen === "questions"
      ? INTAKE_CHAPTER_LABELS.length - 1
      : intakeChapterFor(screen);
  const chapterScreens: readonly string[] =
    screen === "questions"
      ? ["questions"]
      : sequence.filter((candidate) => intakeChapterFor(candidate) === chapter);
  const position = chapterScreens.indexOf(screen);
  const currentProgress =
    position >= 0 ? ((position + 1) / chapterScreens.length) * 100 : 0;

  return (
    <div className={styles.frame}>
      <div className={styles.column}>
        <div className={styles.stage}>{children}</div>
      </div>
      <nav className={styles.bottomNav} aria-label="Navigasi persiapan audit">
        <ol className={styles.progress} aria-label="Progres persiapan audit">
          {INTAKE_CHAPTER_LABELS.map((label, index) => {
            const fill =
              index < chapter ? 100 : index === chapter ? currentProgress : 0;
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
        <div className={styles.actions}>
          {showBack ? (
            <Button variant="ghost" type="button" onClick={onBack}>
              <IconArrowLeft /> Kembali
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}
          <Button
            variant="default"
            type="button"
            onClick={onNext}
            disabled={busy}
          >
            {busy ? (
              <IconLoader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <IconArrowRight />
            )}
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
      <p className={styles.kicker}>
        {INTAKE_CHAPTER_LABELS[intakeChapterFor(screen)]}
      </p>
      <h1 className={styles.title}>
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
