import {
  buildAuditReport,
  normalizeReportEvidence,
  REPORT_SYNTHESIS_PROMPT_VERSION_V2,
  validateReportContent,
} from "./contracts";
import {
  assertLiveProviderCredentialsConfigured,
  isLiveProviderCall,
  liveGenerateReportContent,
} from "./provider";
import {
  lockedObservationBindingErrors,
  lockedQuestionPackForMethod,
  type AuditQuestionMethod,
} from "./locked-question-pack";
import {
  isHistoricalPromptPack,
  type HistoricalPromptPackId,
} from "./measurement-matrix";
import { assertSafeComparisonBusinessUrls } from "./similar-businesses";
import { productionObservationMethodErrors } from "./production-observation-method";
import {
  exactReportExcerptErrors,
  repairExactReportExcerpts,
} from "./report-excerpt";
import {
  selectCodeOwnedNonCorrectiveAction,
  isExactCodeOwnedNonCorrectiveAction,
} from "./report-noncorrective";
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
  contextIdentityGuard,
  isDirectTenAuditContext,
  subjectNamedComparators,
  type AuditSubject,
} from "./direct-ten-context-v2";
import {
  AuditBudgetError,
  AuditCallExecutionError,
  effectiveAuditCarryoverCostUsd,
  summarizeAuditTelemetry,
} from "./telemetry";
import {
  minimizeIndonesianBrief,
  validateCanonicalIndonesianQuestionPack,
} from "./questions-id";
import { validateDirectTenQuestions } from "./questions-id-direct-ten";
import { SYNTHETIC_LOCAL_FIXTURE_SYSTEM } from "./types";

export type ReportPipelineInput = {
  brief: AuditSubject;
  prompts: AuditPrompt[];
  observations: AuditObservation[];
  safety_identifier: string;
  budget: AuditBudget;
  language?: "en" | "id";
  /** Internal replay marker for one of the two immutable historical fixtures. */
  historical_fixture_id?: HistoricalPromptPackId;
  /** Explicit question-method selector. Never inferred — the server record
   * carries it and an absent value means the historical canonical method. */
  question_method?: AuditQuestionMethod;
  /** Server-internal flag for the labeled founder-local fixture path. Never
   * part of the wire schema: when set, every observation must be labeled
   * synthetic-local-fixture, so the flag proves labeling rather than
   * laundering unlabeled evidence past the production-method check. */
  allow_synthetic_evidence?: boolean;
};

function canonicalReportInput(input: ReportPipelineInput): ReportPipelineInput {
  if (!isDirectTenAuditContext(input.brief)) {
    assertSafeComparisonBusinessUrls(input.brief);
  }
  return {
    ...input,
    prompts: lockedQuestionPackForMethod({
      prompts: input.prompts,
      brief: input.brief,
      questionMethod: input.question_method ?? "canonical",
      historicalFixtureId: input.historical_fixture_id,
    }).prompts,
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
      historicalFixtureId: canonical.historical_fixture_id,
      questionMethod: canonical.question_method,
    }),
  );
  const questionMethod = canonical.question_method ?? "canonical";
  if (questionMethod === "direct-ten") {
    const minimized = isDirectTenAuditContext(canonical.brief)
      ? contextIdentityGuard(canonical.brief)
      : minimizeIndonesianBrief(canonical.brief);
    errors.push(
      ...validateDirectTenQuestions(
        prompts.map((prompt) => prompt.question),
        {
          brief: minimized,
          comparators: subjectNamedComparators(canonical.brief),
        },
      ).map((issue) => issue.message),
    );
  } else if (
    !isHistoricalPromptPack(prompts, canonical.historical_fixture_id)
  ) {
    if (isDirectTenAuditContext(canonical.brief)) {
      throw new ReportPipelineError(
        "V2 context requires direct-ten questions.",
      );
    }
    errors.push(
      ...validateCanonicalIndonesianQuestionPack(
        prompts.map((prompt) => prompt.question),
        minimizeIndonesianBrief(canonical.brief),
      ).map((issue) => issue.message),
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

  if (canonical.allow_synthetic_evidence === true) {
    const unlabeled = observations.filter(
      (observation) => observation.system !== SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    );
    if (unlabeled.length) {
      errors.push(
        `Synthetic-evidence mode requires every observation to be labeled ${SYNTHETIC_LOCAL_FIXTURE_SYSTEM}; ${unlabeled.length} observation(s) claim another system.`,
      );
    }
  } else {
    errors.push(...productionObservationMethodErrors(observations));
  }

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
type LegacyReportGenerator = (
  input: Omit<ReportPipelineInput, "brief"> & { brief: BusinessBrief },
  revision?: { draft: ReportContent; violations: string[] },
) => ReturnType<ReportGenerator>;
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
    input.historical_fixture_id,
    input.question_method,
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
    input.historical_fixture_id,
    input.question_method,
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
    input.historical_fixture_id,
    input.question_method,
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

export function createValidatedAuditReport(
  input: Omit<ReportPipelineInput, "brief"> & { brief: BusinessBrief },
  generate: LegacyReportGenerator,
  onSuccessTelemetry?: ReportTelemetrySink,
): Promise<AuditReport>;
export function createValidatedAuditReport(
  input: ReportPipelineInput,
  generate?: ReportGenerator,
  onSuccessTelemetry?: ReportTelemetrySink,
): Promise<AuditReport>;
export async function createValidatedAuditReport(
  input: ReportPipelineInput,
  generate: ReportGenerator | LegacyReportGenerator = liveGenerateReportContent,
  onSuccessTelemetry?: ReportTelemetrySink,
): Promise<AuditReport> {
  const generateForBoundInput = generate as ReportGenerator;
  const lockedInput = canonicalReportInput(input);
  if (isLiveProviderCall(generate)) {
    assertLiveProviderCredentialsConfigured();
  }
  assertReportGenerationGate(lockedInput);
  const initial = await generateForBoundInput(lockedInput);
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
    lockedInput.historical_fixture_id,
    lockedInput.question_method,
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
    // Spec 012 R-13: direct-ten permits an empty priorities list in the
    // language-only retry draft; findings still need at least one item.
    const retryShapeIsRepresentable =
      original.key_findings.length > 0 &&
      (original.priorities.length > 0 ||
        lockedInput.question_method === "direct-ten");
    let retrySucceeded = false;

    if (!retryShapeIsRepresentable) {
      diagnostics.add("language_warning");
    } else {
      try {
        final = await generateForBoundInput(
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
          lockedInput.historical_fixture_id,
          lockedInput.question_method,
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

  // Spec 012 R-13/R-14 (B2), direct-ten only. After normalization, repair and
  // any permitted language-only revision: when no corrective action survives,
  // code may insert at most one eligible non-corrective P/V action — never as
  // filler beside a supported action. The inserted text is checked locally
  // against the unchanged writing contract (no extra model call), and the
  // finished report still requires one supported finding and one action.
  if (
    lockedInput.question_method === "direct-ten" &&
    content.priorities.length === 0
  ) {
    const candidate = selectCodeOwnedNonCorrectiveAction({
      content,
      observations: lockedInput.observations,
      historicalFixtureId: lockedInput.historical_fixture_id,
      questionMethod: lockedInput.question_method,
    });
    if (candidate) {
      const withCandidate = { ...content, priorities: [candidate] };
      const baselineErrors = new Set(languageErrorsFor(lockedInput, content));
      const templateErrors = languageErrorsFor(
        lockedInput,
        withCandidate,
      ).filter((error) => !baselineErrors.has(error));
      if (
        templateErrors.length ||
        !isExactCodeOwnedNonCorrectiveAction(candidate, {
          content,
          observations: lockedInput.observations,
          historicalFixtureId: lockedInput.historical_fixture_id,
          questionMethod: lockedInput.question_method,
        })
      ) {
        throw new ReportPipelineError(
          [
            "The code-owned non-corrective action failed local validation.",
            ...templateErrors,
          ].join(" "),
          422,
          reportCalls,
          "REPORT_INTEGRITY_FAILURE",
          [...diagnostics, "unrecoverable_report_failure"],
        );
      }
      content = withCandidate;
      diagnostics.add("noncorrective_action_inserted");
    }
  }

  if (
    lockedInput.question_method === "direct-ten" &&
    (content.key_findings.length === 0 || content.priorities.length === 0)
  ) {
    throw new ReportPipelineError(
      "Report analysis did not produce a supported finding and a supported action, so no finished report is returned.",
      422,
      reportCalls,
      "REPORT_USEFULNESS_FAILURE",
      [...diagnostics, "usefulness_minimum_not_met"],
    );
  }

  const annotatedReportCalls = annotateReportTelemetry(reportCalls, [
    ...diagnostics,
  ]);
  const report = buildAuditReport(
    content,
    lockedInput.observations,
    {
      requested_model: final.requested_model,
      ...(isDirectTenAuditContext(lockedInput.brief)
        ? { report_prompt_version: REPORT_SYNTHESIS_PROMPT_VERSION_V2 }
        : {}),
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
    lockedInput.historical_fixture_id,
    lockedInput.question_method,
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
