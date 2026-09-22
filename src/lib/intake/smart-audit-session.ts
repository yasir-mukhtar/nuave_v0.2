import { z } from "zod";
import {
  auditCallTelemetrySchema,
  auditObservationSchema,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditReport,
} from "../audit/types";
import {
  directTenContextSchema,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import type { LocalAuditStatus } from "./local-audit-session";
import { localAuditQuestionsKey } from "./local-audit-session";

export const SMART_AUDIT_STORAGE_KEY = "nuave.localIntakeAudit.v2" as const;
export const SMART_AUDIT_RECORD_VERSION = 2 as const;

export type SmartAuditRecord = {
  version: typeof SMART_AUDIT_RECORD_VERSION;
  inputFingerprint: string;
  questionsKey: string;
  originals: string[];
  context: DirectTenAuditContext;
  safetyIdentifier: string;
  carryoverCostUsd: number;
  carryoverReady: boolean;
  status: LocalAuditStatus;
  preparationCalls: AuditCallTelemetry[];
  preparationMode: "synthetic-local" | "live" | null;
  observations: AuditObservation[];
  runCalls: AuditCallTelemetry[];
  reportCalls: AuditCallTelemetry[];
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

const schema = z
  .object({
    version: z.literal(SMART_AUDIT_RECORD_VERSION),
    inputFingerprint: z.string().min(1).max(60_000),
    questionsKey: z.string().min(2).max(20_000),
    originals: z.array(z.string().min(1).max(700)).length(10),
    context: directTenContextSchema,
    safetyIdentifier: z.string().min(8).max(64),
    carryoverCostUsd: z.number().nonnegative().max(5),
    carryoverReady: z.boolean(),
    status: z.enum([
      "running",
      "interrupted",
      "unfinished",
      "report-failed",
      "failed",
      "done",
    ]),
    preparationCalls: z.array(auditCallTelemetrySchema).max(10),
    preparationMode: z.enum(["synthetic-local", "live"]).nullable(),
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

export function readSmartAuditRecord(input: {
  fingerprint: string;
  prompts: readonly { prompt_id: string; question: string }[];
  context: DirectTenAuditContext;
}): SmartAuditRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SMART_AUDIT_STORAGE_KEY);
  if (!raw || raw.length > 800_000) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const record = parsed.data;
    if (
      record.inputFingerprint !== input.fingerprint ||
      record.questionsKey !== localAuditQuestionsKey(input.prompts) ||
      JSON.stringify(record.context) !== JSON.stringify(input.context)
    )
      return null;
    if (
      (record.status === "done" || record.status === "report-failed") &&
      !record.carryoverReady
    )
      return null;
    return { ...record, report: (record.report ?? null) as AuditReport | null };
  } catch {
    return null;
  }
}

export function writeSmartAuditRecord(record: SmartAuditRecord): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    SMART_AUDIT_STORAGE_KEY,
    JSON.stringify(record),
  );
}

export function smartReportRetryAllowed(
  record: SmartAuditRecord | null,
  inFlight: boolean,
  canRetry: boolean,
): boolean {
  return Boolean(
    record && record.status === "report-failed" && !inFlight && canRetry,
  );
}
