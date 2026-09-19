"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconLoader2 } from "@tabler/icons-react";
import { AuditNotice } from "@/components/product/AuditNotice";
import AuditRunStep from "@/app/audit/AuditRunStep";
import ReportView from "@/app/audit/ReportView";
import { makeCustomerEvidenceExport } from "@/lib/audit/customer-evidence-export";
import { canonicalLockedDirectTenPack } from "@/lib/audit/locked-question-pack";
import {
  AuditRunEventParser,
  mergeObservation,
  type AuditRunEvent,
  type PromptRunStatus,
} from "@/lib/audit/stream";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "@/lib/audit/client-contract";
import {
  classifyReportRecovery,
  isReportFailureCode,
  type ReportFailureCode,
} from "@/lib/audit/report-recovery";
import { isAbortError } from "@/lib/audit/workflow-operation-generation";
import {
  DIRECT_TEN_METHOD_VERSION,
  sessionConfirmedBrief,
  type FrozenLocalIntake,
  type LocalQuestionPack,
} from "@/lib/intake/local-questions";
import {
  dedupeCalls,
  localAuditQuestionsKey,
  readLocalAuditRecord,
  reportAttemptsUsed,
  reportRequestCalls,
  reportRetryAllowed,
  writeLocalAuditRecord,
  type LocalAuditRecord,
} from "@/lib/intake/local-audit-session";
import {
  AUDIT_COST_LIMIT_USD,
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditReport,
  type BusinessBrief,
} from "@/lib/audit/types";
import type { RunUnfinishedState } from "./AuditStages";

type Busy = "run" | "report" | null;

class LocalReportError extends Error {
  readonly code: ReportFailureCode | null;
  readonly telemetry: AuditCallTelemetry[];
  constructor(
    message: string,
    code: ReportFailureCode | null,
    telemetry: AuditCallTelemetry[],
  ) {
    super(message);
    this.name = "LocalReportError";
    this.code = code;
    this.telemetry = telemetry;
  }
}

function initialStatuses(
  prompts: readonly { prompt_id: string }[],
  observations: AuditObservation[],
) {
  const statuses: Record<string, PromptRunStatus> = {};
  prompts.forEach((prompt) => {
    statuses[prompt.prompt_id] = "pending";
  });
  observations.forEach((observation) => {
    statuses[observation.prompt_id] = observation.run_status;
  });
  return statuses;
}

/**
 * The fresh-session audit stage (Spec 009 continuous flow). It carries the
 * current session's confirmed facts and the exact approved direct-ten texts
 * through the real /api/audit/run and /api/audit/report boundaries — the
 * same lock, orchestration and validated report the canonical path uses.
 * In local mode those boundaries run the labeled synthetic substitutes; a
 * live run is the identical flow after explicit authorization.
 *
 * Captured progress persists in its own session key: Back/reload never
 * replays a paid stage, an interrupted attempt resumes completed
 * observations, and a stale record for different facts or wording is
 * discarded. Mount, reload and Back perform zero provider calls on their
 * own; execution starts only from an explicit action.
 */
export default function LocalAuditStage({
  pack,
  input,
  autoStart,
  preparationCalls = [],
  preparationMode = null,
  onExit,
  onRestart,
}: {
  pack: LocalQuestionPack;
  input: FrozenLocalIntake;
  autoStart: boolean;
  /** Identity/extraction boundary telemetry from this session's reading
   * phase — seeded into the record so every audit budget request carries
   * the session's full preparation history. */
  preparationCalls?: AuditCallTelemetry[];
  /** The boundary-reported preparation mode for this session. */
  preparationMode?: "synthetic-local" | "live" | null;
  onExit: () => void;
  onRestart: () => void;
}) {
  const wirePrompts = pack.promptPack.prompts.map((prompt) => ({
    prompt_id: prompt.prompt_id,
    question: prompt.question,
    review_status: "needs_human_review" as const,
  }));
  const questionsKey = localAuditQuestionsKey(wirePrompts);
  const [record, setRecord] = useState<LocalAuditRecord | null>(() =>
    readLocalAuditRecord(input.fingerprint, questionsKey),
  );
  const [statuses, setStatuses] = useState<Record<string, PromptRunStatus>>(
    () => initialStatuses(wirePrompts, record?.observations ?? []),
  );
  const [busy, setBusy] = useState<Busy>(null);
  const inFlightRef = useRef(false);
  const startedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  const persist = (next: LocalAuditRecord) => {
    writeLocalAuditRecord(next);
    setRecord(next);
  };

  const buildBrief = (): BusinessBrief | null => {
    try {
      return sessionConfirmedBrief(input.confirmed);
    } catch {
      return null;
    }
  };

  const callReport = async (
    working: LocalAuditRecord,
    brief: BusinessBrief,
  ) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy("report");
    working = {
      ...working,
      status: "running",
      reportCallAttempts: working.reportCallAttempts + 1,
      reportFailure: null,
      error: null,
    };
    persist(working);
    try {
      const response = await fetch("/api/audit/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
          question_method: "direct-ten",
          brief,
          prompts: wirePrompts,
          observations: working.observations,
          safety_identifier: working.safetyIdentifier,
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: working.carryoverCostUsd,
            // The full session ledger: preparation, observation and prior
            // report attempts — recorded spend is forwarded on every retry.
            calls: reportRequestCalls(working),
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        report?: AuditReport;
        telemetry?: AuditCallTelemetry[];
        error?: string;
        code?: string;
      };
      if (!response.ok || !data.report) {
        throw new LocalReportError(
          data.error || "Laporan belum dapat dibuat.",
          isReportFailureCode(data.code) ? data.code : null,
          Array.isArray(data.telemetry) ? data.telemetry : [],
        );
      }
      working = {
        ...working,
        status: "done",
        report: data.report,
        reportCalls: dedupeCalls([
          ...working.reportCalls,
          ...(data.telemetry ?? []),
        ]),
        reportFailure: null,
        error: null,
      };
      persist(working);
      setBusy(null);
    } catch (cause) {
      if (controller.signal.aborted || isAbortError(cause)) {
        working = {
          ...working,
          status: "report-failed",
          reportFailure: {
            code: null,
            message: "Pembuatan laporan terhenti.",
          },
        };
        persist(working);
        return;
      }
      const code = cause instanceof LocalReportError ? cause.code : null;
      const telemetry =
        cause instanceof LocalReportError ? cause.telemetry : [];
      working = {
        ...working,
        status: "report-failed",
        reportCalls: dedupeCalls([...working.reportCalls, ...telemetry]),
        reportFailure: {
          code,
          message:
            cause instanceof Error
              ? cause.message
              : "Laporan belum dapat dibuat.",
        },
      };
      persist(working);
      setBusy(null);
    }
  };

  /** One explicit attempt = one run POST (+ one report POST when all ten
   * land). Completed observations in the record always resume; nothing is
   * paid for twice. No client-side retry loop exists anywhere here. A
   * finished audit is never replayed — re-entry reopens the saved report. */
  const execute = async () => {
    if (inFlightRef.current || record?.status === "done") return;
    inFlightRef.current = true;
    try {
      const brief = buildBrief();
      if (!brief) {
        const failed = baseRecord(record, "failed");
        persist({
          ...failed,
          error:
            "Informasi bisnis tidak dapat disiapkan untuk audit. Kembali dan konfirmasi fakta.",
        });
        return;
      }
      let carryover = record?.carryoverCostUsd;
      if (carryover === undefined) {
        try {
          const res = await fetch("/api/audit/extract");
          const data = (await res.json().catch(() => ({}))) as {
            carryover_cost_usd?: number;
            error?: string;
          };
          if (!res.ok) {
            throw new Error(data.error || "Pengendali biaya tidak tersedia.");
          }
          carryover =
            typeof data.carryover_cost_usd === "number"
              ? data.carryover_cost_usd
              : 0;
        } catch (cause) {
          persist({
            ...baseRecord(record, "failed"),
            brief,
            error:
              cause instanceof Error
                ? cause.message
                : "Pengendali biaya tidak tersedia.",
          });
          return;
        }
      }
      const resumeObservations = (record?.observations ?? []).filter(
        (observation) => observation.run_status === "completed",
      );
      let working: LocalAuditRecord = {
        ...baseRecord(record, "running"),
        brief,
        safetyIdentifier: record?.safetyIdentifier ?? makeSafetyId(),
        carryoverCostUsd: carryover,
        observations: resumeObservations,
        runCalls: dedupeCalls([
          ...(record?.runCalls ?? []),
          ...resumeObservations.flatMap(
            (observation) => observation.telemetry ?? [],
          ),
        ]),
      };
      persist(working);
      setStatuses(initialStatuses(wirePrompts, resumeObservations));
      const controller = new AbortController();
      controllerRef.current = controller;
      setBusy("run");

      let runCompleted = false;
      /** True only when the server gave a definitive refusal — HTTP error or
       * a completed-but-short observation set. Transport aborts and early
       * stream ends leave the outcome unknown: that is an interruption, not
       * a failure, and the captured state must say so. */
      let serverRejected = false;
      let unfinished: RunUnfinishedState | null = null;
      const handleEvent = (event: AuditRunEvent) => {
        if (
          event.type === "prompt_started" ||
          event.type === "attempt_started"
        ) {
          setStatuses((statuses) => ({
            ...statuses,
            [event.prompt_id]: "running",
          }));
        } else if (event.type === "prompt_retrying") {
          setStatuses((statuses) => ({
            ...statuses,
            [event.prompt_id]: "retrying",
          }));
        } else if (event.type === "prompt_completed") {
          working = {
            ...working,
            observations: mergeObservation(
              working.observations,
              event.observation,
            ),
            runCalls: dedupeCalls([
              ...working.runCalls,
              ...(event.observation.telemetry ?? []),
            ]),
          };
          persist(working);
          setStatuses((statuses) => ({
            ...statuses,
            [event.observation.prompt_id]: event.observation.run_status,
          }));
        } else if (event.type === "prompt_failed") {
          setStatuses((statuses) => ({
            ...statuses,
            [event.prompt_id]: "failed",
          }));
        } else if (event.type === "run_completed") {
          runCompleted = true;
          working = { ...working, observations: event.observations };
          persist(working);
        } else if (event.type === "run_unfinished") {
          unfinished = {
            completed: event.completed,
            failedPromptIds: event.failed_prompt_ids,
            message: event.message,
          };
          if (event.observations?.length) {
            working = { ...working, observations: event.observations };
            persist(working);
          }
        } else if (event.type === "fatal_error") {
          serverRejected = true;
          throw new Error(event.message);
        }
      };
      try {
        const response = await fetch("/api/audit/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
            question_method: "direct-ten",
            brief,
            prompts: wirePrompts,
            safety_identifier: working.safetyIdentifier,
            budget: {
              limit_usd: AUDIT_COST_LIMIT_USD,
              carryover_cost_usd: working.carryoverCostUsd,
              // Preparation spend from the reading phase rides the same
              // session ledger; deduped with the run history on resume.
              calls: dedupeCalls([
                ...working.preparationCalls,
                ...working.runCalls,
              ]),
            },
            resume_observations: resumeObservations,
          }),
        });
        if (!response.ok) {
          serverRejected = true;
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            data.error || "Audit tidak dapat dijalankan. Coba lagi.",
          );
        }
        if (!response.body) throw new Error("Aliran audit tidak tersedia.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser = new AuditRunEventParser();
        while (true) {
          const { value, done } = await reader.read();
          for (const event of parser.push(
            decoder.decode(value, { stream: !done }),
          )) {
            handleEvent(event);
          }
          if (done) break;
        }
        for (const event of parser.finish()) handleEvent(event);
        if (!runCompleted && !unfinished) {
          throw new Error("Aliran audit berakhir sebelum selesai.");
        }
        if (unfinished) {
          working = { ...working, status: "unfinished", unfinished };
          persist(working);
          setBusy(null);
          return;
        }
        if (working.observations.length !== 10) {
          serverRejected = true;
          throw new Error("Hasil pengamatan tidak lengkap.");
        }
        await callReport(working, brief);
      } catch (cause) {
        if (controller.signal.aborted || isAbortError(cause)) {
          // Exited mid-run — captured progress is already persisted; mark the
          // interruption explicitly so the next mount can offer a resume.
          persist({ ...working, status: "interrupted", error: null });
          return;
        }
        const hadProgress =
          working.observations.length > 0 || resumeObservations.length > 0;
        working = {
          ...working,
          // A definitive server refusal or a short completed set is a
          // failure; a transport/stream end with an unknown outcome —
          // including a reload — is an interruption, progress or not.
          status: hadProgress || !serverRejected ? "interrupted" : "failed",
          error:
            cause instanceof Error
              ? cause.message
              : "Audit tidak dapat dijalankan.",
        };
        persist(working);
        setBusy(null);
      }
    } finally {
      inFlightRef.current = false;
    }
  };

  function baseRecord(
    prior: LocalAuditRecord | null,
    status: LocalAuditRecord["status"],
  ): LocalAuditRecord {
    return {
      version: 1,
      inputFingerprint: input.fingerprint,
      questionsKey,
      safetyIdentifier: prior?.safetyIdentifier ?? makeSafetyId(),
      carryoverCostUsd: prior?.carryoverCostUsd ?? 0,
      status,
      brief: prior?.brief ?? null,
      preparationCalls: prior?.preparationCalls ?? preparationCalls,
      preparationMode: prior?.preparationMode ?? preparationMode,
      observations: prior?.observations ?? [],
      runCalls: prior?.runCalls ?? [],
      reportCalls: prior?.reportCalls ?? [],
      reportCallAttempts: prior?.reportCallAttempts ?? 0,
      report: null,
      unfinished: null,
      reportFailure: null,
      error: null,
    };
  }

  // Mount only ever reads the record — execution starts solely from the
  // explicit autoStart action or a button below.
  useEffect(() => {
    if (!autoStart || startedRef.current) return;
    startedRef.current = true;
    void execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  const done = record?.status === "done" && record.report && record.brief;
  const completed = (record?.observations ?? []).filter(
    (observation) => observation.run_status === "completed",
  ).length;
  const interrupted =
    !busy && (record?.status === "interrupted" || record?.status === "running");
  const runUnfinished: RunUnfinishedState | null =
    !busy && record?.status === "unfinished" ? record.unfinished : null;
  const reportFailureCode = record?.reportFailure?.code;
  const reportRecovery =
    !busy && record?.status === "report-failed"
      ? classifyReportRecovery(
          isReportFailureCode(reportFailureCode)
            ? reportFailureCode
            : undefined,
          // The bounded attempt counter — telemetry-less failures consume
          // the same allowance as calls that returned usage.
          reportAttemptsUsed(record),
        )
      : null;
  const stage: string = done
    ? "done"
    : busy
      ? "running"
      : interrupted
        ? "interrupted"
        : (record?.status ?? "start");
  const allCalls = [
    ...(record?.preparationCalls ?? []),
    ...(record?.runCalls ?? []),
    ...(record?.reportCalls ?? []),
  ];
  const providerCalls = allCalls.filter(
    (call) => call.requested_model !== SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  ).length;

  const downloadJson = () => {
    if (!record?.report || !record.brief) return;
    let locked: ReturnType<typeof canonicalLockedDirectTenPack>["prompts"];
    try {
      locked = canonicalLockedDirectTenPack(wirePrompts, record.brief).prompts;
    } catch {
      return;
    }
    const evidence = makeCustomerEvidenceExport(
      record.brief,
      locked,
      record.observations,
      record.report,
      {
        pack_method: DIRECT_TEN_METHOD_VERSION,
        pack_response_id:
          pack.generation.kind === "glm-direct-ten-local" ||
          pack.generation.kind === "glm-experimental-local"
            ? pack.generation.provenance.responseId
            : null,
        question_method: "direct-ten",
        synthetic: providerCalls === 0,
        provider_calls: providerCalls,
        preparation_mode: record.preparationMode,
      },
    );
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(evidence, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "nuave-local-audit-evidence.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (done) {
    return (
      <div className="grid gap-4" data-local-audit-stage="done">
        <ReportView
          report={record.report!}
          brief={record.brief!}
          observations={record.observations}
          onDownloadJson={downloadJson}
          previewNotice={
            providerCalls === 0 ? (
              <AuditNotice tone="info" title="Audit lokal — jawaban sintetis">
                Laporan ini dihasilkan dari jawaban sintetis berlabel melalui
                jalur /api/audit/run + /api/audit/report yang sama. Ini
                membuktikan alurnya — bukan bukti visibilitas{" "}
                {input.confirmed.brand.name}.
              </AuditNotice>
            ) : (
              <AuditNotice tone="info" title="Audit lokal — panggilan nyata">
                Laporan ini dihasilkan dari {providerCalls} panggilan provider
                nyata melalui jalur audit yang sama, atas izin eksplisit
                pendiri.
              </AuditNotice>
            )
          }
        />
        <div className="flex flex-wrap gap-2 px-6 print:hidden">
          <Button variant="ghost" onClick={onExit}>
            Kembali ke pertanyaan
          </Button>
          <Button variant="outline" onClick={onRestart}>
            Uji perjalanan baru
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4" data-local-audit-stage={stage}>
      {!record && !busy ? (
        <section className="grid gap-4" aria-label="Mulai audit">
          <h1 className="type-heading-lg">Jalankan audit</h1>
          <p className="type-copy">
            Sepuluh pertanyaan yang Anda setujui siap dijalankan untuk{" "}
            {input.confirmed.brand.name}. Audit berjalan selama halaman ini
            terbuka.
          </p>
          <AuditNotice tone="info" title="Audit lokal berlabel">
            Jawaban dan laporan memakai penyedia sintetis berlabel sampai izin
            live diberikan secara eksplisit. Ini membuktikan alurnya — bukan
            visibilitas {input.confirmed.brand.name}.
          </AuditNotice>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void execute()} data-local-audit-run="start">
              Mulai audit
            </Button>
            <Button variant="ghost" onClick={onExit}>
              Kembali ke pertanyaan
            </Button>
          </div>
        </section>
      ) : (
        <>
          <AuditRunStep
            pack={{ prompts: wirePrompts }}
            statuses={statuses}
            observations={record?.observations ?? []}
            busy={busy}
            interrupted={interrupted && completed > 0}
            runUnfinished={runUnfinished}
            reportRecovery={reportRecovery}
            onRetryReport={() => {
              // Synchronous pre-submit guard: the in-flight flag goes up
              // before the request leaves, so repeated clicks cannot overlap.
              if (
                !reportRetryAllowed({
                  record,
                  recovery: reportRecovery,
                  inFlight: inFlightRef.current,
                })
              )
                return;
              inFlightRef.current = true;
              void callReport(record!, record!.brief!).finally(() => {
                inFlightRef.current = false;
              });
            }}
          />
          {record?.status === "failed" && !busy ? (
            <div className="grid gap-3">
              {record.error ? (
                <p role="alert" className="type-copy text-destructive">
                  {record.error}
                </p>
              ) : null}
              <div>
                <Button
                  onClick={() => void execute()}
                  data-local-audit-run="retry"
                >
                  Coba lagi
                </Button>
              </div>
            </div>
          ) : null}
          {interrupted ? (
            <div className="grid gap-3">
              {record?.error ? (
                <p role="alert" className="type-copy text-destructive">
                  {record.error}
                </p>
              ) : null}
              <div>
                <Button
                  onClick={() => void execute()}
                  data-local-audit-run="resume"
                >
                  {busy === "run" ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : null}
                  Lanjutkan audit
                </Button>
              </div>
            </div>
          ) : null}
          <div>
            <Button variant="ghost" onClick={onExit}>
              Kembali ke pertanyaan
            </Button>
          </div>
        </>
      )}
      {busy ? (
        <p className="type-copy-sm text-muted-foreground">
          {busy === "run"
            ? "Audit sedang berjalan — menutup halaman menghentikan kemajuan tampilan; pengamatan yang selesai tetap tersimpan."
            : "Laporan sedang dibuat."}
        </p>
      ) : null}
    </div>
  );
}

function makeSafetyId(): string {
  return `local-${crypto.randomUUID()}`;
}
