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
import { exactReportExcerptErrors } from "./report-excerpt";
import { sanitizeUnsupportedReportPriorities } from "./report-priority";
import type { ReportFailureCode } from "./report-recovery";
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
    throw new ReportPipelineError(errors.join(" "), 422, []);
  }
}

export type ReportGenerator = typeof liveGenerateReportContent;
export type ReportTelemetrySink = (calls: AuditCallTelemetry[]) => void;

export class ReportPipelineError extends Error {
  readonly status: number;
  readonly telemetry: AuditCallTelemetry[];
  readonly code: ReportFailureCode;

  constructor(
    message: string,
    status = 422,
    telemetry: AuditCallTelemetry[] = [],
    code: ReportFailureCode = "REPORT_INTEGRITY_FAILURE",
  ) {
    super(message);
    this.name = "ReportPipelineError";
    this.status = status;
    this.telemetry = telemetry;
    this.code = code;
  }
}

function normalizeAndContainPriorities(
  rawContent: ReportContent,
  input: ReportPipelineInput,
  reportCalls: AuditCallTelemetry[],
) {
  const exactExcerptErrors = exactReportExcerptErrors(
    rawContent,
    input.observations,
  );
  if (exactExcerptErrors.length) {
    throw new ReportPipelineError(
      exactExcerptErrors.join(" "),
      422,
      reportCalls,
      "REPORT_INTEGRITY_FAILURE",
    );
  }
  const normalized = normalizeReportEvidence(
    rawContent,
    input.observations,
    input.brief,
  );
  const sanitized = sanitizeUnsupportedReportPriorities(
    normalized,
    input.observations,
    input.brief,
  );
  if (!sanitized.content.priorities.length) {
    throw new ReportPipelineError(
      "Report evidence review found no supported corrective priority. No action was fabricated and no automatic reroll was attempted.",
      422,
      reportCalls,
    );
  }
  return sanitized.content;
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
  let content = normalizeAndContainPriorities(
    initial.content,
    lockedInput,
    reportCalls,
  );
  let callCount = 1;
  let retryViolations: string[] = [];

  const evidenceErrors = validateReportContent(
    content,
    lockedInput.observations,
    lockedInput.brief,
  );
  if (evidenceErrors.length) {
    throw new ReportPipelineError(evidenceErrors.join(" "), 422, reportCalls);
  }

  const isIndonesian = lockedInput.language === "id";
  const languageErrors = isIndonesian
    ? validateIndonesianReportLanguage(content).errors
    : validateReportLanguage(content);
  if (languageErrors.length) {
    retryViolations = languageErrors;
    const original = content;
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
    } catch (error) {
      if (error instanceof AuditCallExecutionError) {
        throw new ReportPipelineError(
          error.message,
          error.status,
          [...reportCalls, ...error.telemetry],
          "REPORT_TRANSIENT_FAILURE",
        );
      }
      if (error instanceof AuditBudgetError) {
        throw new ReportPipelineError(
          error.message,
          error.status,
          reportCalls,
          "REPORT_LIMIT_EXHAUSTED",
        );
      }
      throw error;
    }
    reportCalls.push(...final.telemetry);
    callCount += 1;
    content = normalizeAndContainPriorities(
      final.content,
      lockedInput,
      reportCalls,
    );
    const retryErrors = [
      ...(isIndonesian
        ? validateIndonesianReportLanguageRevision(original, content)
        : validateReportLanguageRevision(original, content)),
      ...validateReportContent(
        content,
        lockedInput.observations,
        lockedInput.brief,
      ),
      ...(isIndonesian
        ? validateIndonesianReportLanguage(content).errors
        : validateReportLanguage(content)),
    ];
    if (retryErrors.length) {
      throw new ReportPipelineError(retryErrors.join(" "), 422, reportCalls);
    }
  }

  const report = buildAuditReport(
    content,
    lockedInput.observations,
    {
      requested_model: final.requested_model,
      returned_model: final.returned_model,
      response_id: final.response_id,
      initial_response_id: initial.response_id,
      call_count: callCount,
      language_retry_performed: callCount === 2,
      language_retry_violations: retryViolations,
      operational_telemetry: summarizeAuditTelemetry(
        [...lockedInput.budget.calls, ...reportCalls],
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
        reportCalls,
      );
    }
  }
  onSuccessTelemetry?.([...reportCalls]);
  return report;
}
