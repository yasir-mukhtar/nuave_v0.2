import {
  buildAuditReport,
  normalizeReportEvidence,
  validateReportContent,
} from "./contracts";
import { generateReportContent } from "./provider";
import {
  validateReportLanguage,
  validateReportLanguageRevision,
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
};

export type ReportGenerator = typeof generateReportContent;

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
  generate: ReportGenerator = generateReportContent,
): Promise<AuditReport> {
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

  const languageErrors = validateReportLanguage(content);
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
      ...validateReportLanguageRevision(original, content),
      ...validateReportContent(content, input.observations, input.brief),
      ...validateReportLanguage(content),
    ];
    if (retryErrors.length) {
      throw new ReportPipelineError(retryErrors.join(" "), 422, reportCalls);
    }
  }

  return buildAuditReport(content, input.observations, {
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
  });
}
