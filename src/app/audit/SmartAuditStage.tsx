"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconLoader2 } from "@tabler/icons-react";
import { AuditNotice } from "@/components/product/AuditNotice";
import AuditRunStep from "@/app/audit/AuditRunStep";
import ReportView from "@/app/audit/ReportView";
import {
  auditSessionProvenance,
  makeSmartCustomerEvidenceExport,
  promptsWithOriginals,
  type GenerationAttemptRecord,
} from "@/lib/audit/customer-evidence-export";
import { canonicalLockedDirectTenPack } from "@/lib/audit/locked-question-pack";
import {
  AuditRunEventParser,
  mergeObservation,
  type AuditRunEvent,
  type PromptRunStatus,
} from "@/lib/audit/stream";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "@/lib/audit/client-contract";
import { DIRECT_TEN_REPORT_CONTRACT_VERSION } from "@/lib/audit/direct-ten-context-v2";
import {
  classifyReportRecovery,
  isReportFailureCode,
  type ReportFailureCode,
} from "@/lib/audit/report-recovery";
import { isAbortError } from "@/lib/audit/workflow-operation-generation";
import { DIRECT_TEN_METHOD_VERSION } from "@/lib/intake/local-questions";
import {
  dedupeCalls,
  localAuditQuestionsKey,
  reportAttemptsUsed,
  reportRequestCalls,
} from "@/lib/intake/local-audit-session";
import {
  AUDIT_COST_LIMIT_USD,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditReport,
} from "@/lib/audit/types";
import type { RunUnfinishedState } from "./run-state";
import {
  readSmartAuditRecord,
  writeSmartAuditRecord,
  type SmartAuditRecord,
} from "@/lib/intake/smart-audit-session";
import {
  smartPackPrompts,
  type SmartQuestionPack,
} from "@/lib/intake/smart-session";
import type { FrozenSmartIntake } from "@/lib/intake/smart-intake-contract";
import type { DirectTenAuditContext } from "@/lib/audit/direct-ten-context-v2";

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
export default function SmartAuditStage({
  pack,
  input,
  autoStart,
  preparationCalls = [],
  preparationMode = null,
  generationAttempts = [],
  onExit,
  onRestart,
}: {
  pack: SmartQuestionPack;
  input: FrozenSmartIntake;
  autoStart: boolean;
  /** Identity/extraction boundary telemetry from this session's reading
   * phase — seeded into the record so every audit budget request carries
   * the session's full preparation history. */
  preparationCalls?: AuditCallTelemetry[];
  /** The boundary-reported preparation mode for this session. */
  preparationMode?: "synthetic-local" | "live" | null;
  /** Spec 010 R-06: the session's GLM generation-attempt ledger, carried
   * from the intake session record into the export totals (R-07). */
  generationAttempts?: GenerationAttemptRecord[];
  onExit: () => void;
  onRestart: () => void;
}) {
  const wirePrompts = smartPackPrompts(pack);
  const questionsKey = localAuditQuestionsKey(wirePrompts);
  const [record, setRecord] = useState<SmartAuditRecord | null>(() =>
    readSmartAuditRecord({
      fingerprint: input.fingerprint,
      prompts: wirePrompts,
      context: input.context,
    }),
  );
  const [statuses, setStatuses] = useState<Record<string, PromptRunStatus>>(
    () => initialStatuses(wirePrompts, record?.observations ?? []),
  );
  const [busy, setBusy] = useState<Busy>(null);
  const inFlightRef = useRef(false);
  const startedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const completed = (record?.observations ?? []).filter(
    (observation) => observation.run_status === "completed",
  ).length;

  const persist = (next: SmartAuditRecord) => {
    writeSmartAuditRecord(next);
    setRecord(next);
  };

  const callReport = async (
    working: SmartAuditRecord,
    context: DirectTenAuditContext,
  ) => {
    if (working.observations.length !== 10) return;
    if (
      !classifyReportRecovery(
        isReportFailureCode(working.reportFailure?.code)
          ? working.reportFailure.code
          : undefined,
        reportAttemptsUsed(working),
      ).can_retry
    ) {
      setBusy(null);
      return;
    }
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
          client_contract_version: DIRECT_TEN_REPORT_CONTRACT_VERSION,
          question_method: "direct-ten",
          context,
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
        setBusy(null);
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
      if (record && (completed === 10 || record.status === "report-failed")) {
        // A reload can leave a report attempt marked running. Saved completed
        // observations go straight to report recovery under the same ceiling,
        // without another budget read or run request.
        await callReport(record, record.context);
        return;
      }
      const context = input.context;
      let carryover = record?.carryoverReady
        ? record.carryoverCostUsd
        : undefined;
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
            context,
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
      let working: SmartAuditRecord = {
        ...baseRecord(record, "running"),
        context,
        safetyIdentifier: record?.safetyIdentifier ?? makeSafetyId(),
        carryoverCostUsd: carryover,
        carryoverReady: true,
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
            context,
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
        await callReport(working, context);
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
    prior: SmartAuditRecord | null,
    status: SmartAuditRecord["status"],
  ): SmartAuditRecord {
    return {
      version: 2,
      inputFingerprint: input.fingerprint,
      questionsKey,
      safetyIdentifier: prior?.safetyIdentifier ?? makeSafetyId(),
      carryoverCostUsd: prior?.carryoverCostUsd ?? 0,
      carryoverReady: prior?.carryoverReady ?? false,
      status,
      context: input.context,
      originals: pack.originals,
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

  const done = record?.status === "done" && record.report;
  const reportFailureCode = record?.reportFailure?.code;
  const reportRecovery =
    !busy &&
    !done &&
    record &&
    (completed === 10 || record.status === "report-failed")
      ? classifyReportRecovery(
          isReportFailureCode(reportFailureCode)
            ? reportFailureCode
            : undefined,
          // The bounded attempt counter — telemetry-less failures consume
          // the same allowance as calls that returned usage.
          reportAttemptsUsed(record),
        )
      : null;
  const interrupted =
    !busy &&
    !reportRecovery &&
    (record?.status === "interrupted" || record?.status === "running");
  const runUnfinished: RunUnfinishedState | null =
    !busy && !reportRecovery && record?.status === "unfinished"
      ? record.unfinished
      : null;
  const stage: string = done
    ? "done"
    : busy
      ? "running"
      : reportRecovery
        ? "report-failed"
        : interrupted
          ? "interrupted"
          : (record?.status ?? "start");
  const allCalls = [
    ...(record?.preparationCalls ?? []),
    ...(record?.runCalls ?? []),
    ...(record?.reportCalls ?? []),
  ];
  // The successful pack's generation provenance — only a real provider
  // transport counts its attempts as provider calls or surfaces the
  // generation record; a synthetic-stub or deterministic pack omits it
  // (Spec 010 R-07).
  const packGeneration =
    pack.provenance.transport === "cheaper-inference"
      ? {
          requested_model: pack.provenance.requestedModel,
          returned_model: pack.provenance.returnedModel,
          response_id: pack.provenance.responseId,
          transport: pack.provenance.transport,
          billed_cost_usd: pack.billedCostUsd,
          model_mismatch: pack.provenance.modelMismatch,
        }
      : null;
  const accounting = auditSessionProvenance({
    calls: allCalls,
    attempts: generationAttempts,
    generation: packGeneration,
  });
  const providerCalls = accounting.provider_calls;

  const downloadJson = () => {
    if (!record?.report) return;
    let locked: ReturnType<typeof canonicalLockedDirectTenPack>["prompts"];
    try {
      locked = canonicalLockedDirectTenPack(
        wirePrompts,
        record.context,
      ).prompts;
    } catch {
      return;
    }
    // Spec 010 R-07: the generated text rides alongside the exact approved
    // wording — `original_question`/`edited` indexed by the pack's locating
    // prompt_id; `question` stays the approved text.
    const originalByPromptId = new Map(
      wirePrompts.map((prompt, index) => [
        prompt.prompt_id,
        pack.originals[index] ?? prompt.question,
      ]),
    );
    const evidence = makeSmartCustomerEvidenceExport(
      record.context,
      promptsWithOriginals(locked, originalByPromptId),
      record.observations,
      record.report,
      {
        pack_method: DIRECT_TEN_METHOD_VERSION,
        pack_response_id: pack.provenance.responseId,
        report_context_version: input.context.version,
        question_method: "direct-ten",
        synthetic: providerCalls === 0,
        provider_calls: providerCalls,
        accounted_cost_usd: accounting.accounted_cost_usd,
        uncertain_attempts: accounting.uncertain_attempts,
        unknown_cost_attempts: accounting.unknown_cost_attempts,
        generation_attempts: accounting.generation_attempts,
        ...(accounting.generation ? { generation: accounting.generation } : {}),
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
          brief={record.context!}
          observations={record.observations}
          onDownloadJson={downloadJson}
          previewNotice={
            providerCalls === 0 ? (
              <AuditNotice tone="info" title="Audit lokal — jawaban sintetis">
                Laporan ini dihasilkan dari jawaban sintetis berlabel melalui
                jalur /api/audit/run + /api/audit/report yang sama. Ini
                membuktikan alurnya — bukan bukti visibilitas{" "}
                {input.context.identity.name}.
              </AuditNotice>
            ) : (
              <AuditNotice tone="info" title="Audit — panggilan provider nyata">
                Laporan ini dihasilkan dari {providerCalls} panggilan provider
                nyata melalui jalur audit yang sama. Estimasi aplikasi untuk
                biaya tercatat: USD {accounting.accounted_cost_usd.toFixed(4)}.
                {accounting.uncertain_attempts > 0 ||
                accounting.unknown_cost_attempts > 0 ? (
                  <>
                    {" "}
                    Tercatat {accounting.uncertain_attempts} percobaan pembuatan
                    pertanyaan dengan hasil tidak pasti dan{" "}
                    {accounting.unknown_cost_attempts} percobaan dengan biaya
                    tidak diketahui.
                  </>
                ) : null}
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
            {input.context.identity.name}. Audit berjalan selama halaman ini
            terbuka.
          </p>
          {preparationMode === "live" ? (
            <AuditNotice tone="info" title="Versi uji coba">
              Pertanyaan diuji lewat panggilan provider nyata; hasil berlaku
              untuk {input.context.identity.name} yang diuji saja.
            </AuditNotice>
          ) : (
            <AuditNotice tone="info" title="Audit lokal berlabel">
              Jawaban dan laporan memakai penyedia sintetis berlabel sampai izin
              live diberikan secara eksplisit. Ini membuktikan alurnya — bukan
              visibilitas {input.context.identity.name}.
            </AuditNotice>
          )}
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
              if (!(
                record &&
                reportRecovery?.can_retry &&
                !inFlightRef.current
              ))
                return;
              inFlightRef.current = true;
              void callReport(record!, record!.context).finally(() => {
                inFlightRef.current = false;
              });
            }}
          />
          {record?.status === "failed" && !busy && !reportRecovery ? (
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
