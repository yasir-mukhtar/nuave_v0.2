"use client";

import { IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { AuditNotice } from "@/components/product/AuditNotice";
import type { AnswerPresentation } from "@/lib/audit/report-presentation";
import { ReportAnswer } from "./ReportAnswer";
import styles from "./report-body.module.css";

/**
 * Spec 012 R-15: the answers-only recovery reader. It shows the ten retained
 * questions and complete answers with their sources and observation
 * provenance, the unfinished-analysis notice, per-answer copy, and one
 * explicit report retry. No finding, action, classification, comparator,
 * measure, conclusion, report-ready control, or export callback is rendered —
 * the record carries no report at all in this state.
 */
export function AnswersOnlyRecovery({
  answers,
  canRetry,
  limitReached,
  onRetry,
}: {
  answers: AnswerPresentation[];
  /** Whether an explicit report retry is still permitted under the existing
   * report-attempt and cost ceilings. */
  canRetry: boolean;
  /** True when the ceiling is exhausted — keeps the answers readable while
   * explaining why no further attempt can run. */
  limitReached: boolean;
  onRetry: () => void;
}) {
  return (
    <div className={styles.body} data-answers-only-recovery>
      <AuditNotice title="Analisis Nuave belum selesai" tone="warning">
        Sepuluh jawaban model AI sudah tersimpan. Analisis belum memenuhi syarat
        laporan. Anda dapat membaca dan menyalin jawaban di bawah.
      </AuditNotice>
      <section className={styles.section}>
        <h2 className="type-heading-md">Jawaban model AI</h2>
        <p className={styles.supporting}>
          Pertanyaan dan jawaban lengkap ditampilkan sesuai urutan pengujian.
          Teks jawaban adalah bukti yang diamati, bukan pendapat Nuave.
        </p>
        {answers.map((answer) => (
          <ReportAnswer key={answer.id} answer={answer} />
        ))}
      </section>
      <div className={styles.controls}>
        {/* The retained report-retry label and the existing disabled/limit
            explanation, unchanged (R-15). */}
        {limitReached ? (
          <AuditNotice title="Batas pembuatan laporan tercapai" tone="danger">
            Semua 10 observasi tetap tersimpan, tetapi batas biaya atau batas
            tiga panggilan tahap laporan untuk sesi privat ini sudah tercapai.
            Tidak ada percobaan lain yang dapat dijalankan.
          </AuditNotice>
        ) : null}
        <Button
          type="button"
          variant="default"
          onClick={onRetry}
          disabled={!canRetry}
        >
          <IconRefresh aria-hidden="true" /> Coba buat laporan lagi
        </Button>
      </div>
    </div>
  );
}
