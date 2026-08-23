import { makeEvidenceExport } from "./contracts";
import type {
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
} from "./types";

/**
 * The runtime report retains legacy `facts`/`counts` for backwards-compatible
 * internal consumers. Customer exports deliberately expose only the validated
 * eligible-denominator `measures` projection so JSON, screen, and print do not
 * present competing answers for the same metric.
 */
export function makeCustomerEvidenceExport(
  brief: BusinessBrief,
  prompts: AuditPrompt[],
  observations: AuditObservation[],
  report: AuditReport,
) {
  const evidence = makeEvidenceExport(brief, prompts, observations, report);
  const { facts: _legacyFacts, counts: _legacyCounts, ...validatedReport } =
    evidence.report;
  return {
    ...evidence,
    report: validatedReport,
  };
}
