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
import { productionObservationMethodErrors } from "./production-observation-method";
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

/**
 * Spec 003 R-19 ten-of-ten gate, enforced on the protected live path BEFORE
 * any provider call: report generation begins only when all ten locked
 * questions (unique prompt ids) each have exactly one evaluable, structurally
 * valid observation (run_status completed, non-empty answer, attempt
 * telemetry), all produced by the current protected production observation
 * method. No partial or mixed-method report exists. It is applied at the live
 * route boundary AND unconditionally inside `createValidatedAuditReport`, so
 * script and direct-library callers cannot bypass it either.
 */
export function assertReportGenerationGate(input: ReportPipelineInput): void {
  const { prompts, observations } = input;
  const errors: string[] = [];

  const lockedIds = prompts.map((prompt) => prompt.prompt_id);
  if (lockedIds.length !== 10) {
    errors.push("A report requires exactly ten locked questions.");
  } else if (new Set(lockedIds).size !== lockedIds.length) {
    errors.push("The locked questions must be unique.");
  }

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
  if (isLiveProviderCall(generate)) {
    assertLiveProviderCredentialsConfigured();
  }
  assertReportGenerationGate(input);
  const initial = await generate(input);
  const reportCalls: AuditCallTelemetry[] = [...initial.telemetry];
  let final = initial;
  let content = normalizeAndContainPriorities(initial.content, input, reportCalls);
  let callCount = 1;
  let retryViolations: string[] = [];

  const evidenceErrors = validateReportContent(
    content,
    input.observations,
    input.brief,
  );
  if (evidenceErrors.length) {
    throw new ReportPipelineError(evidenceErrors.join(" "), 422, reportCalls);
  }

  const isIndonesian = input.language === "id";
  const languageErrors = isIndonesian
    ? validateIndonesianReportLanguage(content).errors
    : validateReportLanguage(content);
  if (languageErrors.length) {
    retryViolations = languageErrors;
    const original = content;
    try {
      final = await generate(
        {
          ...input,
          budget: {
            ...input.budget,
            calls: [...input.budget.calls, ...reportCalls],
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
    content = normalizeAndContainPriorities(final.content, input, reportCalls);
    const retryErrors = [
      ...(isIndonesian
        ? validateIndonesianReportLanguageRevision(original, content)
        : validateReportLanguageRevision(original, content)),
      ...validateReportContent(content, input.observations, input.brief),
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
    input.observations,
    {
      requested_model: final.requested_model,
      returned_model: final.returned_model,
      response_id: final.response_id,
      initial_response_id: initial.response_id,
      call_count: callCount,
      language_retry_performed: callCount === 2,
      language_retry_violations: retryViolations,
      operational_telemetry: summarizeAuditTelemetry(
        [...input.budget.calls, ...reportCalls],
        input.budget.limit_usd,
        effectiveAuditCarryoverCostUsd(input.budget),
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
