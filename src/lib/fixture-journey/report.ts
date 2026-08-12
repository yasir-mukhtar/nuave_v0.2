/**
 * Fixture-backed example report construction.
 *
 * The example report is built through the existing audited report contracts:
 * the golden content is normalized against the retained fixture observations,
 * validated against the report contract, and then assembled with
 * `buildAuditReport`. No model or provider is ever called, no live audit API
 * boundary is touched, and no fixture evidence is changed.
 *
 * The construction-failure path is injectable for local testing
 * (`NUAVE_FIXTURE_FORCE_REPORT_FAILURE`, a server-only setting). It is never
 * customer-selectable, and failure never falls back to a live API.
 */
import {
  buildAuditReport,
  makeEvidenceExport,
  normalizeReportEvidence,
  validateReportContent,
} from "../audit/contracts";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "../audit/fixtures/report-golden";
import type { AuditReport } from "../audit/types";

/** Terminal example-preview error for fixture or report construction failures. */
export class FixtureJourneyReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FixtureJourneyReportError";
  }
}

export type ConstructFixtureReportOptions = {
  /**
   * Test-only failure injection, driven by the server-side
   * `NUAVE_FIXTURE_FORCE_REPORT_FAILURE` configuration. Clients can never
   * select this path.
   */
  forceFailure?: boolean;
};

/**
 * Constructs the evidence-faithful example report from the golden fixture.
 * Deterministic except for the report's generated timestamp, which is set by
 * the existing report builder.
 */
export function constructFixtureReport(
  options: ConstructFixtureReportOptions = {},
): AuditReport {
  if (options.forceFailure) {
    throw new FixtureJourneyReportError(
      "Example report construction failed (test configuration).",
    );
  }
  const content = normalizeReportEvidence(
    goldenReportContent(),
    goldenObservations,
    goldenBrief,
  );
  const errors = validateReportContent(
    content,
    goldenObservations,
    goldenBrief,
  );
  if (errors.length > 0) {
    throw new FixtureJourneyReportError(errors.join(" "));
  }
  return buildAuditReport(content, goldenObservations, {
    requested_model: goldenObservations[0]?.requested_model ?? "not recorded",
    returned_model: goldenObservations[0]?.returned_model ?? "not recorded",
    response_id: "fixture-report-response",
  });
}

/**
 * The evidence export offered by the existing report view, built from the
 * same brief, prompts, observations, and report objects shown on screen and
 * printed.
 */
export function buildFixtureEvidenceExport(report: AuditReport) {
  return makeEvidenceExport(
    goldenBrief,
    goldenPrompts,
    goldenObservations,
    report,
  );
}
