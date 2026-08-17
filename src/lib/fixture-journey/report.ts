/**
 * Fixture-backed example report construction.
 *
 * The example report is built through the existing audited report contracts:
 * the frozen Indonesian evidence is projected (see `adapter.ts`), normalized
 * against the retained observations, validated against the report contract,
 * checked against the candidate Indonesian writing calibration
 * (`validateIndonesianReportLanguage`, read-only use), and then assembled
 * with `buildAuditReport`. No model or provider is ever called, no live audit
 * API boundary is touched, and no fixture evidence is changed.
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
import { indonesianReportLanguageErrors } from "../audit/report-language";
import {
  kopiTamanSenjaBrief,
  kopiTamanSenjaMethod,
  kopiTamanSenjaObservations,
  kopiTamanSenjaPrompts,
  kopiTamanSenjaReportContent,
} from "./adapter";
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
 * Constructs the evidence-faithful example report from the frozen Kopi Taman
 * Senja chain. Deterministic except for the report's generated timestamp,
 * which is set by the existing report builder.
 */
export function constructFixtureReport(
  options: ConstructFixtureReportOptions = {},
): AuditReport {
  if (options.forceFailure) {
    throw new FixtureJourneyReportError(
      "Pembuatan laporan contoh gagal (konfigurasi pengujian).",
    );
  }
  const content = normalizeReportEvidence(
    kopiTamanSenjaReportContent(),
    kopiTamanSenjaObservations,
    kopiTamanSenjaBrief,
  );
  const errors = validateReportContent(
    content,
    kopiTamanSenjaObservations,
    kopiTamanSenjaBrief,
  );
  if (errors.length > 0) {
    throw new FixtureJourneyReportError(errors.join(" "));
  }
  // Candidate Indonesian writing calibration (Spec 002 R-38/AC-25), applied
  // to Nuave-authored fields only. Exact evidence is passed as exempt
  // surfaces so questions, excerpts, names, and source titles stay verbatim
  // (R-27). The calibration is founder-review-pending; this guard uses only
  // its hard ceiling (25 words per sentence), never its advisory targets.
  const indonesianErrors = indonesianReportLanguageErrors(content, {
    questions: kopiTamanSenjaPrompts.map((prompt) => prompt.question),
    answer_excerpts: content.details.map((detail) => detail.answer_excerpt),
    business_names: [
      kopiTamanSenjaBrief.brand_name,
      kopiTamanSenjaBrief.verified_competitor.name,
    ],
    source_titles: kopiTamanSenjaObservations
      .flatMap((observation) =>
        observation.sources.map((source) => source.title),
      )
      .filter(Boolean),
    official_terms: [
      kopiTamanSenjaMethod.system,
      kopiTamanSenjaMethod.requestedModel,
      kopiTamanSenjaMethod.returnedModel,
      kopiTamanSenjaMethod.questionGeneration.system,
      kopiTamanSenjaMethod.questionGeneration.model,
      kopiTamanSenjaMethod.methodVersion,
      "AI Visibility Report",
    ],
  });
  if (indonesianErrors.length > 0) {
    throw new FixtureJourneyReportError(indonesianErrors.join(" "));
  }
  const report = buildAuditReport(content, kopiTamanSenjaObservations, {
    requested_model: kopiTamanSenjaMethod.requestedModel,
    returned_model: kopiTamanSenjaMethod.returnedModel,
    response_id: "fixture-report-response",
  });
  // The fixture report's authored fields are Indonesian and are validated
  // against the candidate Indonesian calibration above, so the report is
  // labelled with the Indonesian writing standard rather than the English
  // runtime default the live builder writes (additive Spec 002 R-38).
  return { ...report, writing_standard_version: "plain-id-v1" };
}

/**
 * The evidence export offered by the existing report contract, built from
 * the same projected brief, prompts, observations, and report objects shown
 * on screen and printed.
 */
export function buildFixtureEvidenceExport(report: AuditReport) {
  return makeEvidenceExport(
    kopiTamanSenjaBrief,
    kopiTamanSenjaPrompts,
    kopiTamanSenjaObservations,
    report,
  );
}
