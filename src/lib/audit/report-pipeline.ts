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
 * telemetry). No partial report exists. It is applied at the live route
 * boundary AND unconditionally inside `createValidatedAuditReport`, so the
 * script and direct-library callers cannot buy synthesis for a partial
 * evidence set either (R3-6). The Phase-1 golden fixture (9 completed + 1
 * failed) stays a protected pre-gate record for `buildAuditReport` and the
 * gate's own rejection tests; anything driven through the pipeline supplies
 * a ten-of-ten evidence set.
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

  if (errors.length) {
    // No provider call has been made: the rejection carries no telemetry.
    throw new ReportPipelineError(errors.join(" "), 422, []);
  }
}

export type ReportGenerator = typeof liveGenerateReportContent;

export class ReportPipelineError extends Error {
  readonly status: number;
  readonly telemetry: AuditCallTelemetry[];

  constructor(
    message: string,
    status = 422,
    telemetry: AuditCallTelemetry[] = [],
  ) {
    super(message);
    this.name = "ReportPipelineError";
    this.status = status;
    this.telemetry = telemetry;
  }
}

export async function createValidatedAuditReport(
  input: ReportPipelineInput,
  generate: ReportGenerator = liveGenerateReportContent,
): Promise<AuditReport> {
  // R3-5: fail closed on a missing production credential before synthesis,
  // on the script path as well as the route path.
  if (isLiveProviderCall(generate)) {
    assertLiveProviderCredentialsConfigured();
  }
  // Keep this invariant at the pipeline boundary as well as the HTTP route.
  // Scripts and future callers must not be able to spend on synthesis for a
  // partial evidence set. R3-6 (Phase 3 fix-round-3 adversarial review): this
  // was conditional on `language === "id"`, which left direct library callers
  // on the English path able to buy a report from partial evidence — the
  // comment above claimed otherwise. It is unconditional now.
  assertReportGenerationGate(input);
  const initial = await generate(input);
  const reportCalls: AuditCallTelemetry[] = [...initial.telemetry];
  let final = initial;
  let content = normalizeReportEvidence(
    initial.content,
    input.observations,
    input.brief,
  );
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
        throw new ReportPipelineError(error.message, error.status, [
          ...reportCalls,
          ...error.telemetry,
        ]);
      }
      if (error instanceof AuditBudgetError) {
        throw new ReportPipelineError(error.message, error.status, reportCalls);
      }
      throw error;
    }
    reportCalls.push(...final.telemetry);
    callCount += 1;
    content = normalizeReportEvidence(
      final.content,
      input.observations,
      input.brief,
    );
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
  return report;
}
