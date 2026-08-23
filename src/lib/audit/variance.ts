/**
 * Spec 003 R-22 — Variance measurement.
 *
 * After the main 10/10 run completes, 2–3 designated questions are re-asked
 * separately, one independent observation each, under the same locked method.
 * Repeats are recorded as variance measurement only: they never change the
 * reported count, any denominator, any finding, or any action, and they are
 * not shown as additional observations in the test-by-test rows.
 */

import { productionObservationMethodErrors } from "./production-observation-method";
import type { AuditObservation, AuditPrompt, AuditReport } from "./types";

export const VARIANCE_STORAGE_KEY = "nuave.audit.variance.v1";
export const VARIANCE_FAILURE_STORAGE_KEY = "nuave.audit.variance.failure.v1";

export const VARIANCE_MIN_QUESTIONS = 2;
export const VARIANCE_MAX_QUESTIONS = 3;

export type VarianceRecord = {
  run_key: string;
  created_at: string;
  prompt_ids: string[];
  observations: AuditObservation[];
  complete: boolean;
  incomplete_reason?: string;
};

export type VarianceFailureRecord = {
  run_key: string;
  created_at: string;
  prompt_ids: string[];
  complete: false;
  incomplete_reason: string;
};

export function validateVarianceRequest(input: {
  prompt_ids: string[];
}): string[] {
  const errors: string[] = [];
  if (
    input.prompt_ids.length < VARIANCE_MIN_QUESTIONS ||
    input.prompt_ids.length > VARIANCE_MAX_QUESTIONS
  ) {
    errors.push(
      `Variance re-ask requires ${VARIANCE_MIN_QUESTIONS}–${VARIANCE_MAX_QUESTIONS} designated questions; received ${input.prompt_ids.length}.`,
    );
  }
  if (new Set(input.prompt_ids).size !== input.prompt_ids.length) {
    errors.push("Variance prompt_ids must be unique.");
  }
  return errors;
}

export function selectVariancePrompts(prompts: AuditPrompt[]): AuditPrompt[] {
  const lockedIds = prompts.map((prompt) => prompt.prompt_id);
  if (prompts.length !== 10 || new Set(lockedIds).size !== prompts.length) {
    throw new Error(
      "Variance selection requires the ten unique questions from the locked prompt pack.",
    );
  }

  const selected: AuditPrompt[] = [];
  const firstUnbranded = prompts.find((prompt) => !prompt.branded);
  const firstBranded = prompts.find((prompt) => prompt.branded);
  if (firstUnbranded) selected.push(firstUnbranded);
  if (
    firstBranded &&
    !selected.some((prompt) => prompt.prompt_id === firstBranded.prompt_id)
  ) {
    selected.push(firstBranded);
  }
  for (const prompt of prompts) {
    if (selected.length >= VARIANCE_MIN_QUESTIONS) break;
    if (!selected.some((item) => item.prompt_id === prompt.prompt_id)) {
      selected.push(prompt);
    }
  }

  const errors = validateVarianceRequest({
    prompt_ids: selected.map((prompt) => prompt.prompt_id),
  });
  if (errors.length) throw new Error(errors.join(" "));
  return selected;
}

export function varianceRunKeyForReport(
  report: Pick<AuditReport, "provenance">,
): string {
  const runKey = report.provenance.report_response_id.trim();
  if (!runKey || runKey.length > 200) {
    throw new Error("The report does not contain a valid variance run key.");
  }
  return runKey;
}

export function createVarianceFailureRecord(input: {
  run_key: string;
  prompt_ids: string[];
  incomplete_reason: string;
  now?: () => string;
}): VarianceFailureRecord {
  const errors = validateVarianceRequest({ prompt_ids: input.prompt_ids });
  if (errors.length) throw new Error(errors.join(" "));
  const incompleteReason = input.incomplete_reason.trim();
  if (!incompleteReason) {
    throw new Error("A failed variance re-ask requires an incomplete reason.");
  }
  return {
    run_key: input.run_key,
    created_at: (input.now ?? (() => new Date().toISOString()))(),
    prompt_ids: [...input.prompt_ids],
    complete: false,
    incomplete_reason: incompleteReason,
  };
}

export function createVarianceRecord(input: {
  run_key: string;
  prompt_ids: string[];
  observations: AuditObservation[];
  incomplete_reason?: string;
}): VarianceRecord {
  const validation = validateVarianceRequest({ prompt_ids: input.prompt_ids });
  if (validation.length) {
    throw new Error(validation.join(" "));
  }

  const observedIds = input.observations.map((observation) => observation.prompt_id);
  const missing = input.prompt_ids.filter((id) => !observedIds.includes(id));
  const extra = observedIds.filter((id) => !input.prompt_ids.includes(id));
  const duplicates = observedIds.filter(
    (id, index) => observedIds.indexOf(id) !== index,
  );
  if (missing.length || extra.length || duplicates.length) {
    throw new Error(
      `Variance observations must match the designated prompt_ids exactly. Missing: ${missing.join(", ") || "none"}; extra: ${[...new Set(extra)].join(", ") || "none"}; duplicates: ${[...new Set(duplicates)].join(", ") || "none"}.`,
    );
  }

  // Completeness uses the same positive production-attempt invariant as the
  // main report/resume boundaries. Telemetry merely existing is insufficient:
  // failed-only, wrong-stage, wrong-method, mismatched-response, or zero-search
  // evidence must never be labeled a complete variance measurement.
  const evidenceErrors = productionObservationMethodErrors(input.observations);
  const complete =
    input.observations.length === input.prompt_ids.length &&
    input.observations.every(
      (observation) => observation.run_status === "completed",
    ) &&
    evidenceErrors.length === 0 &&
    !input.incomplete_reason;
  const incompleteReason =
    input.incomplete_reason?.trim() ||
    (evidenceErrors.length
      ? `Variance evidence failed the protected-attempt invariant: ${evidenceErrors.join(" ")}`
      : !complete
        ? "Variance re-ask did not produce a completed protected observation for every designated question."
        : "");

  return {
    run_key: input.run_key,
    created_at: new Date().toISOString(),
    prompt_ids: [...input.prompt_ids],
    observations: [...input.observations],
    complete,
    ...(incompleteReason ? { incomplete_reason: incompleteReason } : {}),
  };
}

export function assertVarianceNotBlended(input: {
  mainObservations: AuditObservation[];
  variance: VarianceRecord;
}): void {
  if (input.mainObservations.length > 10) {
    throw new Error(
      "Variance observations must never be blended into the main 10/10 observation set.",
    );
  }
}
