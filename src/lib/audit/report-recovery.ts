export type ReportFailureCode =
  | "REPORT_TRANSIENT_FAILURE"
  | "REPORT_INTEGRITY_FAILURE"
  | "REPORT_STAGE_LIMIT_EXHAUSTED";

export type ReportRecoveryState = {
  kind: "retryable" | "terminal_integrity" | "terminal_limit";
  can_retry: boolean;
};

/**
 * Baseline helper mirroring the current UI behavior before the reliability
 * fix: any missing report is treated as retryable while calls remain.
 */
export function classifyReportRecovery(
  _code: ReportFailureCode | undefined,
  reportCalls: number,
  reportCallLimit = 3,
): ReportRecoveryState {
  return {
    kind: reportCalls < reportCallLimit ? "retryable" : "terminal_limit",
    can_retry: reportCalls < reportCallLimit,
  };
}
