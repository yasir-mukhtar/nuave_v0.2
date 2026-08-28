"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconLoader2, IconRefresh } from "@tabler/icons-react";
import { AuditNotice } from "@/components/product/AuditNotice";
import { AuditProgress } from "@/components/product/AuditProgress";
import { INDONESIAN_RUN_STATUS_LABELS } from "@/lib/audit/report-labels";
import type { ReportRecoveryState } from "@/lib/audit/report-recovery";
import type { PromptRunStatus } from "@/lib/audit/stream";
import type { AuditObservation, PromptPack } from "@/lib/audit/types";
import { categoryLabels, type RunUnfinishedState } from "./AuditStages";
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
          Step 4 of 4 <span aria-hidden="true">·</span> Run audit
        </p>
        <h1>
          {reporting
            ? "All observations are complete. Creating the report…"
            : "Collecting ten independent observations."}
        </h1>
        <p>
          This progress comes from live server responses. Technical failures
          retry automatically up to two more times per question under the same
          locked method; completed observations are never rerun, and failed
          attempts remain in the evidence. The browser must stay open: closing
          the tab stops the run, with no continuation in the background.
        </p>
      </header>

      {runUnfinished ? (
        <AuditNotice title="The audit could not be completed" tone="danger">
          {runUnfinished.completed} of 10 questions were evaluated.{" "}
          {runUnfinished.failedPromptIds.length} question
          {runUnfinished.failedPromptIds.length === 1 ? "" : "s"} exhausted
          automatic technical recovery and is marked &ldquo;not yet tested
          successfully&rdquo; below. Nuave delivers ten tests and ten tests
          only, so no report is created before 10/10 evaluable observations and
          no partial report exists. Every completed observation and every
          attempt remains preserved and is not rerun. Ask for help:
          founder-assisted recovery may retry only the affected questions under
          the locked method.
        </AuditNotice>
      ) : interrupted && completed > 0 ? (
        <AuditNotice title="The audit was interrupted" tone="danger">
          The audit runs while this page stays open: the browser must remain
          open during the run, and closing the tab stops it. {completed} of 10
          observations were saved and are preserved in this session; they are
          not rerun. This phase does not continue in the background, and no
          report is created before 10/10 evaluable observations.
        </AuditNotice>
      ) : null}

      <section className={styles.runSection} aria-label="Audit observations">
        <AuditProgress completed={completed} reporting={reporting} />

        <div className={styles.runList}>
          {pack.prompts.map((prompt, index) => {
            const status = statuses[prompt.prompt_id] ?? "pending";
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
                  <strong>{categoryLabels[prompt.category]}</strong>
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
