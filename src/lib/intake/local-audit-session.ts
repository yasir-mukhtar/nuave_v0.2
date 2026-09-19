import { z } from "zod";
import {
  auditCallTelemetrySchema,
  auditObservationSchema,
  businessBriefSchema,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditReport,
  type BusinessBrief,
} from "../audit/types";
import type { ReportRecoveryState } from "../audit/report-recovery";

/**
 * The current session's audit record — a separate local-only key from the
 * intake session. It exists so Back/reload can show captured observations and
 * the finished report without replaying a run, and so an interrupted attempt
 * resumes its completed observations instead of paying for them again.
 *
 * The record is bound to the exact frozen intake fingerprint and the exact
 * approved question texts; a stale record for different facts or wording is
 * discarded, never resumed.
 */
export const LOCAL_AUDIT_STORAGE_KEY = "nuave.localIntakeAudit.v1";

export type LocalAuditStatus =
  /** An attempt began; captured progress may be partial. */
  | "running"
  /** The stream ended early or the fetch aborted — progress is captured. */
  | "interrupted"
  /** The server emitted run_unfinished; failed prompts stay honest. */
  | "unfinished"
  /** All ten observations completed; the report call failed. */
  | "report-failed"
  /** A fatal error before the run could complete. */
  | "failed"
  | "done";

export type LocalAuditRecord = {
  version: 1;
  /** Frozen-intake fingerprint — binds the record to confirmed facts. */
  inputFingerprint: string;
  /** JSON.stringify of ordered [prompt_id, question] pairs — binds wording. */
  questionsKey: string;
  safetyIdentifier: string;
  carryoverCostUsd: number;
  status: LocalAuditStatus;
  /** Set once the run begins; null only on pre-run failures. */
  brief: BusinessBrief | null;
  /** Identity/extraction boundary telemetry from the reading phase — the
   * session's preparation history, folded into every audit budget call. */
  preparationCalls: AuditCallTelemetry[];
  /** Which preparation path served the session — explicit provenance from
   * the boundary responses, carried into the evidence export. */
  preparationMode: "synthetic-local" | "live" | null;
  /** Observations captured so far — completed ones are resumable. */
  observations: AuditObservation[];
  /** Folded run telemetry carried into the report budget. */
  runCalls: AuditCallTelemetry[];
  /** Successful report-stage telemetry (retry ceiling + export). */
  reportCalls: AuditCallTelemetry[];
  /** Report POST attempts made — feeds the shared recovery ceiling. */
  reportCallAttempts: number;
  report: AuditReport | null;
  unfinished: {
    completed: number;
    failedPromptIds: string[];
    message: string;
  } | null;
  reportFailure: { code: string | null; message: string } | null;
  error: string | null;
};

const recordSchema = z
  .object({
    version: z.literal(1),
    inputFingerprint: z.string().min(1).max(4_000),
    questionsKey: z.string().min(2).max(20_000),
    safetyIdentifier: z.string().min(8).max(64),
    carryoverCostUsd: z.number().nonnegative().max(5),
    status: z.enum([
      "running",
      "interrupted",
      "unfinished",
      "report-failed",
      "failed",
      "done",
    ]),
    brief: businessBriefSchema.nullable(),
    preparationCalls: z.array(auditCallTelemetrySchema).max(10).default([]),
    preparationMode: z
      .enum(["synthetic-local", "live"])
      .nullable()
      .default(null),
    observations: z.array(auditObservationSchema).max(10),
    runCalls: z.array(auditCallTelemetrySchema).max(40),
    reportCalls: z.array(auditCallTelemetrySchema).max(10),
    reportCallAttempts: z.number().int().nonnegative().max(10),
    report: z.unknown(),
    unfinished: z
      .object({
        completed: z.number().int().min(0).max(10),
        failedPromptIds: z.array(z.string()).max(10),
        message: z.string().max(2_000),
      })
      .nullable(),
    reportFailure: z
      .object({
        code: z.string().max(80).nullable(),
        message: z.string().max(2_000),
      })
      .nullable(),
    error: z.string().max(2_000).nullable(),
  })
  .strict();

/** A record is only meaningful while it binds this exact intake and wording. */
export function localAuditQuestionsKey(
  prompts: readonly { prompt_id: string; question: string }[],
): string {
  return JSON.stringify(prompts.map((p) => [p.prompt_id, p.question]));
}

export function readLocalAuditRecord(
  inputFingerprint: string,
  questionsKey: string,
): LocalAuditRecord | null {
  if (typeof window === "undefined") return null;
  const saved = window.sessionStorage.getItem(LOCAL_AUDIT_STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = recordSchema.safeParse(JSON.parse(saved));
    if (!parsed.success) {
      window.sessionStorage.removeItem(LOCAL_AUDIT_STORAGE_KEY);
      return null;
    }
    const record = parsed.data;
    if (
      record.inputFingerprint !== inputFingerprint ||
      record.questionsKey !== questionsKey
    ) {
      // Different facts or wording — the stored result is not this audit's.
      return null;
    }
    return {
      ...record,
      report: (record.report ?? null) as AuditReport | null,
    };
  } catch {
    return null;
  }
}

export function writeLocalAuditRecord(record: LocalAuditRecord): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      LOCAL_AUDIT_STORAGE_KEY,
      JSON.stringify(record),
    );
  } catch {
    // Persistence is best-effort; the in-memory state still governs this run.
  }
}

export function clearLocalAuditRecord(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LOCAL_AUDIT_STORAGE_KEY);
  } catch {
    // Ignore storage failures on clear.
  }
}

export function dedupeCalls(calls: AuditCallTelemetry[]): AuditCallTelemetry[] {
  const seen = new Set<string>();
  return calls.filter((call) => {
    const key =
      call.response_id || `${call.stage}:${call.attempt}:${call.started_at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Every known stage call for the report request's budget ledger —
 * preparation, observation and prior report history, deduplicated. Prior
 * report-attempt telemetry must reach the next report request so recorded
 * spend is forwarded, not just observed calls. */
export function reportRequestCalls(
  record: Pick<
    LocalAuditRecord,
    "preparationCalls" | "runCalls" | "reportCalls"
  >,
): AuditCallTelemetry[] {
  return dedupeCalls([
    ...record.preparationCalls,
    ...record.runCalls,
    ...record.reportCalls,
  ]);
}

/** The bounded report-attempt counter the shared recovery ceiling reads.
 * Every POST attempt counts — telemetry or not — so a failure that returns
 * no telemetry still consumes the same allowance. This is the session's
 * client-side ledger, not a supplier billing cap. */
export function reportAttemptsUsed(
  record: Pick<LocalAuditRecord, "reportCallAttempts" | "reportCalls">,
): number {
  return Math.max(record.reportCallAttempts, record.reportCalls.length);
}

/** Synchronous pre-submit guard for the direct report-retry action — a
 * repeated click between the check and the fetch can never overlap: the
 * caller sets its in-flight flag before the request leaves. */
export function reportRetryAllowed(input: {
  record: LocalAuditRecord | null;
  recovery: ReportRecoveryState | null;
  inFlight: boolean;
}): boolean {
  return (
    !input.inFlight &&
    input.record !== null &&
    input.record.brief !== null &&
    input.recovery?.can_retry === true
  );
}
