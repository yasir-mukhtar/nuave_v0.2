"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconLoader2, IconRefresh } from "@tabler/icons-react";
import { AuditNotice } from "@/components/product/AuditNotice";
import { AuditProgress } from "@/components/product/AuditProgress";
import { INDONESIAN_RUN_STATUS_LABELS } from "@/lib/audit/report-labels";
import { measurementSlotForPromptId } from "@/lib/audit/measurement-matrix";
import type { ReportRecoveryState } from "@/lib/audit/report-recovery";
import type { PromptRunStatus } from "@/lib/audit/stream";
import type { AuditObservation, PromptPack } from "@/lib/audit/types";
import { type RunUnfinishedState } from "./AuditStages";
import styles from "./audit.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;

export default function AuditRunStep({
  pack,
  statuses,
  observations,
  busy,
  interrupted,
  runUnfinished,
  reportRecovery,
  onRetryReport,
}: {
  pack: PromptPack;
  statuses: Record<string, PromptRunStatus>;
  observations: AuditObservation[];
  busy: Busy;
  interrupted: boolean;
  runUnfinished: RunUnfinishedState | null;
  reportRecovery: ReportRecoveryState | null;
  onRetryReport: () => void;
}) {
  const completed = observations.filter(
    (item) => item.run_status === "completed",
  ).length;
  const reporting = busy === "report";
  const reportMissing = !busy && completed === 10;

  return (
    <section className={`${styles.workspace} ${styles.workspaceFocused}`}>
      <header className={styles.stageIntro} tabIndex={-1} id="stage-4">
        <p className={styles.stageMeta}>
          Langkah 4 dari 4 <span aria-hidden="true">·</span> Jalankan audit
        </p>
        <h1>
          {reporting
            ? "Semua pengamatan selesai. Laporan sedang dibuat."
            : "Menjalankan sepuluh pertanyaan audit."}
        </h1>
        <p>
          Status ini berasal dari jawaban server. Gangguan teknis dapat dicoba
          kembali hingga dua kali untuk setiap pertanyaan. Pengamatan yang
          selesai tidak diulang. Halaman harus tetap terbuka karena audit tidak
          berjalan di latar belakang.
        </p>
      </header>

      {runUnfinished ? (
        <AuditNotice title="Audit belum dapat diselesaikan" tone="danger">
          {runUnfinished.completed} dari 10 pertanyaan telah diperiksa.{" "}
          {runUnfinished.failedPromptIds.length} pertanyaan tidak berhasil
          dipulihkan secara otomatis. Laporan tidak dibuat sebelum 10 dari 10
          pengamatan dapat dinilai. Pengamatan dan percobaan yang selesai tetap
          tersimpan dan tidak diulang. Minta bantuan Nuave untuk melanjutkan
          pertanyaan yang gagal.
        </AuditNotice>
      ) : interrupted && completed > 0 ? (
        <AuditNotice title="Audit terhenti" tone="danger">
          Audit berjalan selama halaman ini terbuka. {completed} dari 10
          pengamatan tersimpan di sesi ini dan tidak diulang. Audit tidak
          dilanjutkan di latar belakang. Laporan tidak dibuat sebelum 10 dari 10
          pengamatan dapat dinilai.
        </AuditNotice>
      ) : null}

      <section
        className={styles.runSection}
        aria-label="Hasil pengamatan audit"
      >
        <AuditProgress completed={completed} reporting={reporting} />

        <div className={styles.runList}>
          {pack.prompts.map((prompt, index) => {
            const status = statuses[prompt.prompt_id] ?? "pending";
            const measurementSlot = measurementSlotForPromptId(
              prompt.prompt_id,
            );
            const statusVariant =
              status === "failed"
                ? "destructive"
                : status === "pending"
                  ? "outline"
                  : "secondary";
            const statusClassName =
              status === "completed"
                ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]"
                : status === "running" || status === "retrying"
                  ? "border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]"
                  : undefined;
            return (
              <div className={styles.runRow} key={prompt.prompt_id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>
                    {measurementSlot?.customerFacingLabel ?? "Pertanyaan"}
                  </strong>
                  <small>{prompt.question}</small>
                </div>
                <Badge variant={statusVariant} className={statusClassName}>
                  {status === "running" || status === "retrying" ? (
                    <IconLoader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  {INDONESIAN_RUN_STATUS_LABELS[status]}
                </Badge>
              </div>
            );
          })}
        </div>

        {reportMissing && reportRecovery?.kind === "retryable" ? (
          <div className={`${styles.actionRow} ${styles.runRecovery}`}>
            <p>
              Semua 10 observasi tersimpan. Pembuatan laporan mengalami gangguan
              sementara dan masih memiliki jatah panggilan untuk satu percobaan
              lagi.
            </p>
            <Button
              variant="default"
              onClick={onRetryReport}
              disabled={!reportRecovery.can_retry}
            >
              <IconRefresh /> Coba buat laporan lagi
            </Button>
          </div>
        ) : null}

        {reportMissing && reportRecovery?.kind === "terminal_integrity" ? (
          <AuditNotice title="Laporan gagal pemeriksaan bukti" tone="danger">
            Semua 10 observasi tetap tersimpan. Nuave menemukan pelanggaran
            integritas yang tidak aman diperbaiki dengan reroll model, jadi
            tidak ada panggilan laporan berbayar tambahan yang ditawarkan.
          </AuditNotice>
        ) : null}

        {reportMissing && reportRecovery?.kind === "terminal_limit" ? (
          <AuditNotice title="Batas pembuatan laporan tercapai" tone="danger">
            Semua 10 observasi tetap tersimpan, tetapi batas biaya atau batas
            tiga panggilan tahap laporan untuk sesi privat ini sudah tercapai.
            Tidak ada percobaan lain yang dapat dijalankan.
          </AuditNotice>
        ) : null}

        {reportMissing && !reportRecovery ? (
          <AuditNotice title="Laporan belum tersedia">
            Semua 10 observasi tetap tersimpan, tetapi status kegagalan laporan
            tidak dapat dipastikan dengan aman. Nuave tidak akan menawarkan
            reroll berbayar tanpa klasifikasi kegagalan.
          </AuditNotice>
        ) : null}
      </section>
    </section>
  );
}
