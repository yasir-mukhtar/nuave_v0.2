import { makeEvidenceExport } from "./contracts";
import type { DirectTenAuditContext } from "./direct-ten-context-v2";
import {
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditPrompt,
  type AuditReport,
  type BusinessBrief,
} from "./types";

/** Spec 010 R-06: one GLM question-generation attempt as the browser
 * session records it (`nuave.localIntake.v1 → generation_attempts`).
 * `execution: "confirmed"` means a response reached the browser after the
 * provider stage ran — success or HTTP failure; `"unknown"` means the
 * response never arrived (interrupted, or the transport was invoked but
 * returned nothing) so provider execution cannot be asserted. */
export type GenerationAttemptRecord = {
  started_at: string;
  outcome: "succeeded" | "failed" | "interrupted";
  execution: "confirmed" | "unknown";
  cost_usd: number | null;
};

/** Spec 010 R-07: the successful pack's GLM generation record, projected to
 * the export's snake_case provenance shape. */
export type GenerationProvenance = {
  requested_model: string;
  returned_model: string | null;
  response_id: string | null;
  transport: string;
  billed_cost_usd: number | null;
  model_mismatch: boolean;
};

/**
 * Spec 010 R-07 provenance totals for the session audit export.
 *
 * - `provider_calls` counts confirmed real calls only: non-synthetic
 *   preparation/run/report telemetry (the existing allCalls counting, minus
 *   synthetic fixture entries) plus GLM attempts whose execution is
 *   "confirmed" — and only when the session's generation ran over the real
 *   provider transport (`generation` non-null), so labeled synthetic-stub
 *   attempts never inflate the count. Requests rejected before provider
 *   work (switch off, method 400, rate-limit 429) record no attempt, so they
 *   always contribute zero calls and zero cost.
 * - `uncertain_attempts` counts attempts whose execution is "unknown" — an
 *   uncertain call is never silently folded into or dropped from the
 *   confirmed total.
 * - `accounted_cost_usd` sums `accounted_cost_usd` over every
 *   preparation/run/report call record plus every known GLM attempt cost;
 *   `unknown_cost_attempts` counts attempts whose cost is null.
 */
export function auditSessionProvenance(input: {
  /** Preparation, observation and report call records for the session. */
  calls: AuditCallTelemetry[];
  /** The session's generation-attempt ledger (R-06). */
  attempts: readonly GenerationAttemptRecord[];
  /** The successful pack's generation provenance when it came from the real
   * provider transport; null for synthetic-stub or deterministic packs. */
  generation: GenerationProvenance | null;
}): {
  generation?: GenerationProvenance;
  generation_attempts: GenerationAttemptRecord[];
  provider_calls: number;
  uncertain_attempts: number;
  accounted_cost_usd: number;
  unknown_cost_attempts: number;
} {
  const stageCalls = input.calls.filter(
    (call) => call.requested_model !== SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  ).length;
  const confirmedAttempts = input.attempts.filter(
    (attempt) => attempt.execution === "confirmed",
  ).length;
  const accounted =
    input.calls.reduce((sum, call) => sum + call.accounted_cost_usd, 0) +
    input.attempts.reduce((sum, attempt) => sum + (attempt.cost_usd ?? 0), 0);
  return {
    ...(input.generation ? { generation: input.generation } : {}),
    generation_attempts: [...input.attempts],
    provider_calls:
      stageCalls + (input.generation === null ? 0 : confirmedAttempts),
    uncertain_attempts: input.attempts.filter(
      (attempt) => attempt.execution === "unknown",
    ).length,
    // Rounded to 6 decimals — binary float noise never reaches the export.
    accounted_cost_usd: Math.round(accounted * 1e6) / 1e6,
    unknown_cost_attempts: input.attempts.filter(
      (attempt) => attempt.cost_usd === null,
    ).length,
  };
}

/** Spec 010 R-07: each exported prompt keeps the exact approved text in
 * `question` and gains `original_question` (the generated text) plus
 * `edited`, indexed by the pack's locating prompt_id. A prompt with no
 * recorded original keeps its own text and is not marked edited. */
export function promptsWithOriginals(
  prompts: readonly AuditPrompt[],
  originalByPromptId: ReadonlyMap<string, string>,
): (AuditPrompt & { original_question: string; edited: boolean })[] {
  return prompts.map((prompt) => {
    const original = originalByPromptId.get(prompt.prompt_id);
    return {
      ...prompt,
      original_question: original ?? prompt.question,
      edited: original !== undefined && original !== prompt.question,
    };
  });
}

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
  provenance?: Record<string, unknown>,
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
    ...(provenance ? { provenance } : {}),
    observations: customerObservations,
    report: validatedReport,
  };
}

/** New sessions export the saved confirmed meaning, without a compatibility brief. */
export function makeSmartCustomerEvidenceExport(
  context: DirectTenAuditContext,
  prompts: AuditPrompt[],
  observations: AuditObservation[],
  report: AuditReport,
  provenance?: Record<string, unknown>,
) {
  const evidence = makeEvidenceExport(context, prompts, observations, report);
  const {
    facts: _facts,
    counts: _counts,
    operational_telemetry: _telemetry,
    ...validatedReport
  } = evidence.report;
  return {
    export_version: "nuave-evidence-v5" as const,
    exported_at: evidence.exported_at,
    disclosure: evidence.disclosure,
    context,
    prompts,
    observations: evidence.observations.map(
      ({
        failure_reason: _failureReason,
        telemetry: _observationTelemetry,
        ...observation
      }) => observation,
    ),
    report: validatedReport,
    ...(provenance ? { provenance } : {}),
  };
}
