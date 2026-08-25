import { makeEvidenceExport } from "./contracts";
import type {
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
} from "./types";

/**
 * The runtime evidence record keeps legacy metrics and operational diagnostics
 * for internal/debug consumers. Customer exports expose the validated
 * eligible-denominator report plus the observable evidence itself, without
 * internal call telemetry or provider failure diagnostics.
 */
export function makeCustomerEvidenceExport(
  brief: BusinessBrief,
  prompts: AuditPrompt[],
  observations: AuditObservation[],
  report: AuditReport,
) {
  const evidence = makeEvidenceExport(brief, prompts, observations, report);
  const {
    facts: _legacyFacts,
    counts: _legacyCounts,
    operational_telemetry: _operationalTelemetry,
    ...validatedReport
  } = evidence.report;
  const customerObservations = evidence.observations.map(
    ({
      failure_reason: _failureReason,
      telemetry: _telemetry,
      ...observation
    }) => observation,
  );

  return {
    ...evidence,
    observations: customerObservations,
    report: validatedReport,
  };
}
