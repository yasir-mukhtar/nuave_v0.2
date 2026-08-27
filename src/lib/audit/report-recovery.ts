export const REPORT_FAILURE_CODES = [
  "REPORT_TRANSIENT_FAILURE",
  "REPORT_INTEGRITY_FAILURE",
  "REPORT_LIMIT_EXHAUSTED",
] as const;

export type ReportFailureCode = (typeof REPORT_FAILURE_CODES)[number];

export const REPORT_DIAGNOSTIC_CODES = [
  "observation_gate_failure",
  "excerpt_repaired",
  "invalid_source_removed",
  "unsupported_competitor_removed",
  "unsupported_priority_removed",
  "language_warning",
  "prohibited_claim_removed",
  "minimum_report_fallback_used",
  "unrecoverable_report_failure",
] as const;

export type ReportDiagnosticCode = (typeof REPORT_DIAGNOSTIC_CODES)[number];

export type ReportRecoveryState = {
  kind: "retryable" | "terminal_integrity" | "terminal_limit";
  can_retry: boolean;
};

export function isReportFailureCode(
  value: unknown,
): value is ReportFailureCode {
  return REPORT_FAILURE_CODES.some((code) => code === value);
}

/**
 * Pure UI recovery classification. Deterministic evidence failures never
 * invite another paid synthesis call. Provider/transport failures may retry
 * only while the report-stage call ceiling still has headroom.
 */
export function classifyReportRecovery(
  code: ReportFailureCode | undefined,
  reportCalls: number,
  reportCallLimit = 3,
): ReportRecoveryState {
  if (code === "REPORT_INTEGRITY_FAILURE") {
    return { kind: "terminal_integrity", can_retry: false };
  }
  if (code === "REPORT_LIMIT_EXHAUSTED" || reportCalls >= reportCallLimit) {
    return { kind: "terminal_limit", can_retry: false };
  }
  return { kind: "retryable", can_retry: true };
}
