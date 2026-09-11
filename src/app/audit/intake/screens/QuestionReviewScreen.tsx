"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessBrief, PromptPack } from "@/lib/audit/types";
import type { ScopeKind } from "@/lib/audit/workflow-authority";
import {
  AUDIT_MEASUREMENT_MATRIX,
  measurementSlotForPromptId,
  type CanonicalMeasurementSlot,
} from "@/lib/audit/measurement-matrix";
import { INDONESIAN_PURPOSE_DRIFT_WARNING } from "@/lib/audit/questions-id";
import type { IndonesianValidationIssue } from "@/lib/audit/questions-id";
import { IntakeHeading, IntakeShell } from "../IntakeShell";
import { introducedQuestionEditIssues } from "../questionEditTransaction";
import styles from "../intake.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;

const GROUP_COPY = {
  unbranded: (brandName: string) =>
    `Menguji apakah ${brandName} muncul dan direkomendasikan dengan sendirinya. Nama brand tidak boleh ada di sini.`,
  branded:
    "Menguji apa yang model AI katakan saat brand Anda ditanyakan langsung. Hasilnya tidak dihitung sebagai penemuan spontan.",
} as const;

/**
 * The complete question review (recovery plan §6.3 S2): read-first cards,
 * editing revealed by Ubah, and the §6.5 save transaction refusing any newly
 * introduced validation issue at the card itself, in plain Indonesian.
 */
export function QuestionReviewScreen({
  pack,
  brief,
  scopeKind,
  busy,
  onEdit,
  onBack,
  onRun,
}: {
  pack: PromptPack;
  brief: BusinessBrief;
  scopeKind: ScopeKind;
  busy: Busy;
  onEdit: (index: number, value: string) => void;
  onBack: () => void;
  onRun: () => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [rejectedIssues, setRejectedIssues] = useState<
    IndonesianValidationIssue[] | null
  >(null);
  const [driftIndex, setDriftIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const promptsBySlot = new Map<
    string,
    { prompt: PromptPack["prompts"][number]; index: number }
  >();
  pack.prompts.forEach((prompt, index) => {
    const slot = measurementSlotForPromptId(prompt.prompt_id);
    if (slot) promptsBySlot.set(slot.id, { prompt, index });
  });

  const unbranded = AUDIT_MEASUREMENT_MATRIX.filter(
    (slot) => slot.auditedBrandIdentity === "forbidden",
  );
  const branded = AUDIT_MEASUREMENT_MATRIX.filter(
    (slot) => slot.auditedBrandIdentity === "required",
  );

  function startEditing(index: number, question: string) {
    setEditingIndex(index);
    setDraft(question);
    setRejectedIssues(null);
    setDriftIndex(null);
  }

  function cancelEditing() {
    setEditingIndex(null);
    setDraft("");
    setRejectedIssues(null);
  }

  function save() {
    if (editingIndex === null) return;
    const introduced = introducedQuestionEditIssues({
      brief,
      prompts: pack.prompts,
      index: editingIndex,
      draft,
    });
    if (introduced.length) {
      setRejectedIssues(introduced);
      textareaRef.current?.focus();
      return;
    }
    onEdit(editingIndex, draft);
    setDriftIndex(editingIndex);
    cancelEditing();
  }

  function renderGroup(
    title: string,
    count: number,
    description: string,
    slots: readonly CanonicalMeasurementSlot[],
  ) {
    return (
      <section className={styles.questionGroup}>
        <div className={styles.groupHeader}>
          <b className={styles.groupTitle}>{title}</b>
          <span className={styles.groupCount}>{count} pertanyaan</span>
        </div>
        <p className={styles.groupDescription}>{description}</p>
        {slots.map((slot) => {
          const entry = promptsBySlot.get(slot.id);
          if (!entry) return null;
          const { prompt, index } = entry;
          const editing = editingIndex === index;
          const textareaId = `audit-question-${index}`;
          return (
            <div key={slot.id} className={styles.questionCard}>
              <div className={styles.questionMeta}>
                <span>
                  {slot.order} · {slot.customerFacingLabel}
                </span>
                {!editing ? (
                  <button
                    type="button"
                    className={styles.editLink}
                    onClick={() => startEditing(index, prompt.question)}
                  >
                    Ubah
                  </button>
                ) : null}
              </div>
              {editing ? (
                <div>
                  <Textarea
                    id={textareaId}
                    ref={textareaRef}
                    rows={3}
                    aria-label={`Ubah pertanyaan ${slot.order}`}
                    value={draft}
                    autoFocus
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEditing();
                      }
                    }}
                  />
                  {rejectedIssues?.length ? (
                    <div
                      className={styles.questionError}
                      role="alert"
                      id={`${textareaId}-error`}
                    >
                      {rejectedIssues.map((issue) => (
                        <p key={`${issue.slot}|${issue.rule}`}>
                          {issue.message}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <div className={styles.questionActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={cancelEditing}
                    >
                      Batal
                    </Button>
                    <Button type="button" variant="default" onClick={save}>
                      Simpan
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={styles.questionText}>{prompt.question}</p>
                  {driftIndex === index ? (
                    <p className={styles.driftNote}>
                      {INDONESIAN_PURPOSE_DRIFT_WARNING}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <IntakeShell
      screen="questions"
      scopeKind={scopeKind}
      onBack={onBack}
      onNext={onRun}
      nextLabel="Jalankan audit"
      busy={Boolean(busy)}
    >
      <IntakeHeading
        screen="review"
        title="Periksa pertanyaan audit"
        lead={`Sepuluh pertanyaan ini akan diuji ke model AI, satu per satu. Pertanyaan tanpa nama brand tidak boleh mengarah ke ${brief.brand_name}.`}
      />

      {pack.warnings.length ? (
        <ul className={styles.warnings}>
          {pack.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {renderGroup(
        "Tanpa menyebut bisnis Anda",
        unbranded.length,
        GROUP_COPY.unbranded(brief.brand_name),
        unbranded,
      )}
      {renderGroup(
        "Menyebut bisnis Anda",
        branded.length,
        GROUP_COPY.branded,
        branded,
      )}
    </IntakeShell>
  );
}
