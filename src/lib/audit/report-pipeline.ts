import {
  buildAuditReport,
  normalizeReportEvidence,
  validateReportContent,
} from "./contracts";
import {
  assertLiveProviderCredentialsConfigured,
  isLiveProviderCall,
  liveGenerateReportContent,
} from "./provider";
import {
  canonicalLockedQuestionPack,
  lockedObservationBindingErrors,
} from "./locked-question-pack";
import { assertSafeComparisonBusinessUrls } from "./similar-businesses";
import { productionObservationMethodErrors } from "./production-observation-method";
import {
  exactReportExcerptErrors,
  repairExactReportExcerpts,
} from "./report-excerpt";
import { sanitizeUnsupportedReportPriorities } from "./report-priority";
import type {
  ReportDiagnosticCode,
  ReportFailureCode,
} from "./report-recovery";
import { sanitizeRecoverableReportQuality } from "./report-quality-repair";
import {
  validateReportLanguage,
  validateIndonesianReportLanguage,
  indonesianReportBuiltFieldErrors,
  INDONESIAN_AUDIT_REPORT_LABELS,
  validateReportLanguageRevision,
  validateIndonesianReportLanguageRevision,
} from "./report-language";
import type {
  AuditBudget,
  AuditCallTelemetry,
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
  ReportContent,
} from "./types";
import {
  AuditBudgetError,
  AuditCallExecutionError,
  effectiveAuditCarryoverCostUsd,
  summarizeAuditTelemetry,
} from "./telemetry";

export type ReportPipelineInput = {
  brief: BusinessBrief;
  prompts: AuditPrompt[];
  observations: AuditObservation[];
  safety_identifier: string;
  budget: AuditBudget;
  language?: "en" | "id";
};

function canonicalReportInput(input: ReportPipelineInput): ReportPipelineInput {
  assertSafeComparisonBusinessUrls(input.brief);
  return {
    ...input,
    prompts: canonicalLockedQuestionPack(input.prompts, input.brief).prompts,
  };
}

function uniqueDiagnostics(values: ReportDiagnosticCode[]) {
  return [...new Set(values)];
}

type DiagnosticTelemetry = AuditCallTelemetry & {
  report_diagnostics?: ReportDiagnosticCode[];
};

function annotateReportTelemetry(
  calls: AuditCallTelemetry[],
  diagnostics: ReportDiagnosticCode[],
): AuditCallTelemetry[] {
  const values = uniqueDiagnostics(diagnostics);
  if (!values.length) return calls;
  return calls.map((call) =>
    call.stage === "report"
      ? ({ ...call, report_diagnostics: values } as DiagnosticTelemetry)
      : call,
  );
}

/**
 * Spec 003 ten-of-ten gate. Evidence must correspond to the exact canonical
 * locked questions, not merely reuse a positional prompt id.
 */
export function assertReportGenerationGate(input: ReportPipelineInput): void {
  const canonical = canonicalReportInput(input);
  const { prompts, observations } = canonical;
  const errors: string[] = [];

  const lockedIds = prompts.map((prompt) => prompt.prompt_id);
  if (observations.length !== 10) {
    errors.push("A report requires exactly ten observations.");
  }

  const observationIds = observations.map(
    (observation) => observation.prompt_id,
  );
  const missing = lockedIds.filter((id) => !observationIds.includes(id));
  if (missing.length) {
    errors.push(
      `Missing evaluable observations for questions: ${missing.join(", ")}.`,
    );
  }
  const extra = observationIds.filter((id) => !lockedIds.includes(id));
  if (extra.length) {
    errors.push(
      `Observations do not match the locked questions: ${extra.join(", ")}.`,
    );
  }
  if (new Set(observationIds).size !== observationIds.length) {
    errors.push(
      "Report observations must contain one unique record per prompt_id.",
    );
  }

  errors.push(
    ...lockedObservationBindingErrors({
      prompts,
      observations,
      brief: canonical.brief,
    }),
  );

  const notEvaluable = observations.filter(
    (observation) =>
      observation.run_status !== "completed" ||
      !observation.raw_answer.trim() ||
      observation.telemetry.length === 0,
  );
  if (notEvaluable.length) {
    errors.push(
      `${notEvaluable.length} observation(s) are not evaluable: each must be completed, carry a usable answer, and retain attempt telemetry.`,
    );
  }

  errors.push(...productionObservationMethodErrors(observations));

  if (errors.length) {
    throw new ReportPipelineError(
      errors.join(" "),
      422,
      [],
      "REPORT_INTEGRITY_FAILURE",
      ["observation_gate_failure"],
    );
  }
}

export type ReportGenerator = typeof liveGenerateReportContent;
export type ReportTelemetrySink = (calls: AuditCallTelemetry[]) => void;

export class ReportPipelineError extends Error {
  readonly status: number;
  readonly telemetry: AuditCallTelemetry[];
  readonly code: ReportFailureCode;
  readonly diagnostics: ReportDiagnosticCode[];

  constructor(
    message: string,
    status = 422,
    telemetry: AuditCallTelemetry[] = [],
    code: ReportFailureCode = "REPORT_INTEGRITY_FAILURE",
    diagnostics: ReportDiagnosticCode[] = ["unrecoverable_report_failure"],
  ) {
    super(message);
    this.name = "ReportPipelineError";
    this.status = status;
    this.diagnostics = uniqueDiagnostics(diagnostics);
    this.telemetry = annotateReportTelemetry(telemetry, this.diagnostics);
    this.code = code;
  }
}

type RepairedReportContent = {
  content: ReportContent;
  diagnostics: ReportDiagnosticCode[];
};

function normalizeAndRepairReport(
  rawContent: ReportContent,
  input: ReportPipelineInput,
  reportCalls: AuditCallTelemetry[],
): RepairedReportContent {
  const diagnostics = new Set<ReportDiagnosticCode>();
  const normalized = normalizeReportEvidence(
    rawContent,
    input.observations,
    input.brief,
  );

  const rawSources = rawContent.details.reduce(
    (count, detail) => count + detail.source_urls.length,
    0,
  );
  const normalizedSources = normalized.details.reduce(
    (count, detail) => count + detail.source_urls.length,
    0,
  );
  if (normalizedSources < rawSources) diagnostics.add("invalid_source_removed");

  const rawCompetitorEvidence = rawContent.observed_competitors.reduce(
    (count, competitor) => count + competitor.evidence_prompt_ids.length,
    0,
  );
  const normalizedCompetitorEvidence = normalized.observed_competitors.reduce(
    (count, competitor) => count + competitor.evidence_prompt_ids.length,
    0,
  );
  if (
    normalized.observed_competitors.length <
      rawContent.observed_competitors.length ||
    normalizedCompetitorEvidence < rawCompetitorEvidence
  ) {
    diagnostics.add("unsupported_competitor_removed");
  }

  const excerptRepair = repairExactReportExcerpts(
    normalized,
    input.observations,
  );
  if (excerptRepair.repaired_prompt_ids.length) {
    diagnostics.add("excerpt_repaired");
  }

  const priorityRepair = sanitizeUnsupportedReportPriorities(
    excerptRepair.content,
    input.observations,
    input.brief,
  );
  if (priorityRepair.removed_orders.length) {
    diagnostics.add("unsupported_priority_removed");
    if (!priorityRepair.content.priorities.length) {
      diagnostics.add("minimum_report_fallback_used");
    }
  }

  const qualityRepair = sanitizeRecoverableReportQuality(
    priorityRepair.content,
    input.observations,
    input.brief,
    input.language,
  );
  qualityRepair.diagnostics.forEach((diagnostic) =>
    diagnostics.add(diagnostic),
  );

  const exactExcerptErrors = exactReportExcerptErrors(
    qualityRepair.content,
    input.observations,
  );
  if (exactExcerptErrors.length) {
    throw new ReportPipelineError(
      exactExcerptErrors.join(" "),
      422,
      reportCalls,
      "REPORT_INTEGRITY_FAILURE",
      [...diagnostics, "unrecoverable_report_failure"],
    );
  }

  return {
    content: qualityRepair.content,
    diagnostics: [...diagnostics],
  };
}

function languageErrorsFor(input: ReportPipelineInput, content: ReportContent) {
  return input.language === "id"
    ? validateIndonesianReportLanguage(content).errors
    : validateReportLanguage(content);
}

export async function createValidatedAuditReport(
  input: ReportPipelineInput,
  generate: ReportGenerator = liveGenerateReportContent,
  onSuccessTelemetry?: ReportTelemetrySink,
): Promise<AuditReport> {
  const lockedInput = canonicalReportInput(input);
  if (isLiveProviderCall(generate)) {
    assertLiveProviderCredentialsConfigured();
  }
  assertReportGenerationGate(lockedInput);
  const initial = await generate(lockedInput);
  const reportCalls: AuditCallTelemetry[] = [...initial.telemetry];
  let final = initial;
  let repaired = normalizeAndRepairReport(
    initial.content,
    lockedInput,
    reportCalls,
  );
  let content = repaired.content;
  const diagnostics = new Set<ReportDiagnosticCode>(repaired.diagnostics);
  let callCount = 1;
  let retryViolations: string[] = [];

  const evidenceErrors = validateReportContent(
    content,
    lockedInput.observations,
    lockedInput.brief,
  );
  if (evidenceErrors.length) {
    throw new ReportPipelineError(
      evidenceErrors.join(" "),
      422,
      reportCalls,
      "REPORT_INTEGRITY_FAILURE",
      [...diagnostics, "unrecoverable_report_failure"],
    );
  }

  const isIndonesian = lockedInput.language === "id";
  const languageErrors = languageErrorsFor(lockedInput, content);
  if (languageErrors.length) {
    retryViolations = languageErrors;
    const original = content;
    const retryShapeIsRepresentable =
      original.key_findings.length > 0 && original.priorities.length > 0;
    let retrySucceeded = false;

    if (!retryShapeIsRepresentable) {
      diagnostics.add("language_warning");
    } else {
      try {
        final = await generate(
          {
            ...lockedInput,
            budget: {
              ...lockedInput.budget,
              calls: [...lockedInput.budget.calls, ...reportCalls],
            },
          },
          {
            draft: original,
            violations: languageErrors,
          },
        );
        reportCalls.push(...final.telemetry);
        callCount += 1;
        retrySucceeded = true;
      } catch (error) {
        if (error instanceof AuditCallExecutionError) {
          reportCalls.push(...error.telemetry);
          if (error.telemetry.length) callCount += 1;
        } else if (!(error instanceof AuditBudgetError)) {
          // The first draft already passed evidence integrity. A failure in the
          // optional style-only revision must not erase that paid audit result.
        }
        diagnostics.add("language_warning");
      }
    }

    if (retrySucceeded) {
      repaired = normalizeAndRepairReport(
        final.content,
        lockedInput,
        reportCalls,
      );
      repaired.diagnostics.forEach((diagnostic) => diagnostics.add(diagnostic));
      content = repaired.content;

      const retryIntegrityErrors = [
        ...(isIndonesian
          ? validateIndonesianReportLanguageRevision(original, content)
          : validateReportLanguageRevision(original, content)),
        ...validateReportContent(
          content,
          lockedInput.observations,
          lockedInput.brief,
        ),
      ];
      if (retryIntegrityErrors.length) {
        throw new ReportPipelineError(
          retryIntegrityErrors.join(" "),
          422,
          reportCalls,
          "REPORT_INTEGRITY_FAILURE",
          [...diagnostics, "unrecoverable_report_failure"],
        );
      }

      const finalLanguageErrors = languageErrorsFor(lockedInput, content);
      if (finalLanguageErrors.length) diagnostics.add("language_warning");
    }
  }

  const annotatedReportCalls = annotateReportTelemetry(reportCalls, [
    ...diagnostics,
  ]);
  const report = buildAuditReport(
    content,
    lockedInput.observations,
    {
      requested_model: final.requested_model,
      returned_model: final.returned_model,
      response_id: final.response_id,
      initial_response_id: initial.response_id,
      call_count: callCount,
      language_retry_performed: callCount > 1,
      language_retry_violations: retryViolations,
      operational_telemetry: summarizeAuditTelemetry(
        [...lockedInput.budget.calls, ...annotatedReportCalls],
        lockedInput.budget.limit_usd,
        effectiveAuditCarryoverCostUsd(lockedInput.budget),
      ),
    },
    isIndonesian ? INDONESIAN_AUDIT_REPORT_LABELS : undefined,
  );
  if (isIndonesian) {
    const builtFieldErrors = indonesianReportBuiltFieldErrors(report);
    if (builtFieldErrors.length) {
      throw new ReportPipelineError(
        builtFieldErrors.join(" "),
        422,
        annotatedReportCalls,
        "REPORT_INTEGRITY_FAILURE",
        [...diagnostics, "unrecoverable_report_failure"],
      );
    }
  }
  onSuccessTelemetry?.(annotatedReportCalls);
  return report;
}
