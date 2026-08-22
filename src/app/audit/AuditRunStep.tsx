"use client";

import { Alert, Button, Chip, ProgressBar, Spinner } from "@heroui/react";
import { IconRefresh } from "@tabler/icons-react";
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
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>The audit could not be completed</Alert.Title>
            <Alert.Description>
              {runUnfinished.completed} of 10 questions were evaluated.{" "}
              {runUnfinished.failedPromptIds.length} question
              {runUnfinished.failedPromptIds.length === 1 ? "" : "s"} exhausted
              automatic technical recovery and is marked &ldquo;not yet tested
              successfully&rdquo; below. Nuave delivers ten tests and ten tests
              only, so no report is created before 10/10 evaluable observations
              and no partial report exists. Every completed observation and
              every attempt remains preserved and is not rerun. Ask for help:
              founder-assisted recovery may retry only the affected questions
              under the locked method.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : interrupted && completed > 0 ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>The audit was interrupted</Alert.Title>
            <Alert.Description>
              The audit runs while this page stays open: the browser must remain
              open during the run, and closing the tab stops it. {completed} of
              10 observations were saved and are preserved in this session; they
              are not rerun. This phase does not continue in the background, and
              no report is created before 10/10 evaluable observations.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <section className={styles.runSection} aria-label="Audit observations">
        <ProgressBar
          aria-label={reporting ? "Creating report" : "Audit progress"}
          value={completed}
          maxValue={10}
          isIndeterminate={reporting}
          color={reporting ? "accent" : "success"}
        >
          <ProgressBar.Output>
            {reporting ? "Creating report" : `${completed} of 10 complete`}
          </ProgressBar.Output>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>

        <div className={styles.runList}>
          {pack.prompts.map((prompt, index) => {
            const status = statuses[prompt.prompt_id] ?? "pending";
            const observation = observations.find(
              (item) => item.prompt_id === prompt.prompt_id,
            );
            const color =
              status === "failed"
                ? "danger"
                : status === "completed"
                  ? "success"
                  : status === "running" || status === "retrying"
                    ? "accent"
                    : "default";
            return (
              <div className={styles.runRow} key={prompt.prompt_id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{categoryLabels[prompt.category]}</strong>
                  <small>{prompt.question}</small>
                  {observation?.failure_reason ? (
                    <small className={styles.failure}>
                      {observation.failure_reason}
                    </small>
                  ) : null}
                </div>
                <Chip color={color} variant="soft" size="sm">
                  {status === "running" || status === "retrying" ? (
                    <Spinner size="sm" />
                  ) : null}
                  {INDONESIAN_RUN_STATUS_LABELS[status]}
                </Chip>
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
              variant="primary"
              onPress={onRetryReport}
              isDisabled={!reportRecovery.can_retry}
            >
              <IconRefresh /> Coba buat laporan lagi
            </Button>
          </div>
        ) : null}

        {reportMissing && reportRecovery?.kind === "terminal_integrity" ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Laporan gagal pemeriksaan bukti</Alert.Title>
              <Alert.Description>
                Semua 10 observasi tetap tersimpan. Nuave menemukan pelanggaran
                integritas yang tidak aman diperbaiki dengan reroll model, jadi
                tidak ada panggilan laporan berbayar tambahan yang ditawarkan.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {reportMissing && reportRecovery?.kind === "terminal_limit" ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Batas pembuatan laporan tercapai</Alert.Title>
              <Alert.Description>
                Semua 10 observasi tetap tersimpan, tetapi batas biaya atau
                batas tiga panggilan tahap laporan untuk sesi privat ini sudah
                tercapai. Tidak ada percobaan lain yang dapat dijalankan.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {reportMissing && !reportRecovery ? (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Laporan belum tersedia</Alert.Title>
              <Alert.Description>
                Semua 10 observasi tetap tersimpan, tetapi status kegagalan
                laporan tidak dapat dipastikan dengan aman. Nuave tidak akan
                menawarkan reroll berbayar tanpa klasifikasi kegagalan.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </section>
    </section>
  );
}
