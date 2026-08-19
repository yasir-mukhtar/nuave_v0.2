import type {
  AuditBudget,
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
} from "./types";

/**
 * Spec 003 R-17 retry contract: one initial attempt plus up to two automatic
 * technical retries per question, targeted to the failed question, using the
 * same locked configuration (exact question, provider, model, instruction
 * version, language, location, search configuration, method version), with
 * bounded backoff appropriate to the safe failure category. A valid result is
 * never rerun; retrying stops as soon as one evaluable response is saved.
 * Every attempt is persisted (R-20) on the final observation's telemetry.
 */

/** One initial attempt plus up to two automatic technical retries (R-17). */
export const MAX_ATTEMPTS_PER_QUESTION = 3;
export const MAX_AUTOMATIC_RETRIES_PER_QUESTION = 2;

/**
 * Retry-aware observation stage ceiling: 10 questions x 3 attempts = 30.
 * `AUDIT_STAGE_CALL_LIMITS.observation` must equal this value (R-36); the
 * USD 5 per-session ceiling remains the binding cap.
 */
export const OBSERVATION_STAGE_MAX_CALLS = 10 * MAX_ATTEMPTS_PER_QUESTION; // 30

export type SafeFailureCategory =
  "rate_limited" | "temporary" | "empty_or_unusable" | "non_retryable";

/**
 * Bounded backoff per safe failure category, indexed by retry number
 * (1 = first automatic retry, 2 = second automatic retry).
 */
export const RETRY_BACKOFF_MS: Record<
  Exclude<SafeFailureCategory, "non_retryable">,
  readonly [number, number]
> = {
  rate_limited: [10_000, 20_000],
  temporary: [2_000, 5_000],
  empty_or_unusable: [1_000, 3_000],
};

/** Hard upper bound for any single retry backoff. */
export const MAX_RETRY_BACKOFF_MS = 20_000;

export function retryBackoffMs(
  category: Exclude<SafeFailureCategory, "non_retryable">,
  retryNumber: number,
): number {
  const schedule = RETRY_BACKOFF_MS[category];
  const index = Math.max(0, Math.min(retryNumber, schedule.length) - 1);
  return Math.min(schedule[index], MAX_RETRY_BACKOFF_MS);
}

/**
 * Failures that retrying cannot fix: the private cost guard (R-36), a pinned
 * model or tier mismatch, or missing configuration. Retrying these would
 * repeat the identical pre-flight failure without adding evidence.
 */
const NON_RETRYABLE_FAILURE_PATTERNS = [
  /audit limit/,
  /private audit limit/,
  /cost guard supports only/,
  /did not return usage/,
  /only standard default pricing is allowed/,
  /no longer makes a paid provider call/,
  /Unrecognized NUAVE_PROVIDER/,
  // A free-tier PER-DAY cap (Groq TPD, OpenRouter free-models-per-day) cannot
  // clear inside a run. Without this it matched the generic /quota/ rule below
  // and every one of the ten questions burned its full backoff schedule before
  // failing anyway. Both provider modules already fail fast on it; this makes
  // the orchestrator stop re-asking too.
  /cannot be retried within this request/,
];

export type ObservationClassification = {
  evaluable: boolean;
  /** Meaningful only when `evaluable` is false (R-18 safe failure category). */
  category: SafeFailureCategory;
};

/**
 * Classifies a returned observation as evaluable or as a failed test with a
 * safe failure category (R-18). A substantive response — including a
 * substantive refusal with a usable answer, uncertainty, conflicting or
 * absent public information — is evaluable and is never retried for a more
 * favorable result. A provider or policy refusal with no usable answer, an
 * empty response, or a truncated response that cannot be evaluated is a
 * failed test that receives targeted same-method recovery.
 */
export function classifyObservationFailure(
  observation: AuditObservation,
): ObservationClassification {
  const hasUsableAnswer = observation.raw_answer.trim().length > 0;

  if (observation.run_status === "completed" && hasUsableAnswer) {
    return { evaluable: true, category: "temporary" };
  }

  if (observation.run_status === "failed") {
    const reason = observation.failure_reason || "";
    if (
      NON_RETRYABLE_FAILURE_PATTERNS.some((pattern) => pattern.test(reason))
    ) {
      return { evaluable: false, category: "non_retryable" };
    }
    if (/rate limit|429|quota/i.test(reason)) {
      return { evaluable: false, category: "rate_limited" };
    }
    return { evaluable: false, category: "temporary" };
  }

  // run_status "completed" with no usable answer: the provider call finished
  // but blocked, truncated, or returned nothing usable.
  return { evaluable: false, category: "empty_or_unusable" };
}

/**
 * Rewrites a provider-level block (completed HTTP call, no usable answer)
 * into a failed test so it is never counted as evaluable (R-18).
 */
export function markObservationFailed(
  observation: AuditObservation,
  failureReason: string,
): AuditObservation {
  if (observation.run_status === "failed") return observation;
  return {
    ...observation,
    run_status: "failed",
    failure_reason: failureReason,
  };
}

/** A short, safe explanation of why a completed provider call had no usable answer. */
export function failedTestReason(observation: AuditObservation): string {
  const diag = observation.telemetry[observation.telemetry.length - 1] ?? null;
  if (diag?.refusal_present === true) {
    return "Provider or policy refusal with no usable answer.";
  }
  if (diag?.provider_status === "incomplete") {
    return "Incomplete provider response with no usable answer.";
  }
  return "The provider returned no usable answer.";
}

export type ObservationAttempt = {
  /** Attempt order within the question (1 = initial, 2-3 = automatic retries). */
  attempt: number;
  /** Whether the attempt was an automatic retry (attempt > 1). */
  automatic: boolean;
  started_at: string;
  observation: AuditObservation;
};

export type QuestionRunOutcome =
  | {
      status: "evaluable";
      observation: AuditObservation;
      attempts: ObservationAttempt[];
      retry_count: number;
    }
  | {
      status: "exhausted";
      observation: AuditObservation;
      attempts: ObservationAttempt[];
      retry_count: number;
      failure_reason: string;
      failure_category: SafeFailureCategory;
    };

export type QuestionExecuteInput = {
  prompt: AuditPrompt;
  brief: BusinessBrief;
  safety_identifier: string;
  budget: AuditBudget;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Records the actual attempt order on the attempt's telemetry (R-20). */
function stampTelemetryAttempt(
  observation: AuditObservation,
  attempt: number,
): AuditObservation {
  return {
    ...observation,
    telemetry: observation.telemetry.map((call) => ({
      ...call,
      attempt,
      automatic: attempt > 1,
    })),
  };
}

/** Records the safe failure category on a failed attempt's telemetry (R-20). */
function stampTelemetryFailureCategory(
  observation: AuditObservation,
  category: SafeFailureCategory,
): AuditObservation {
  if (observation.run_status !== "failed") return observation;
  return {
    ...observation,
    telemetry: observation.telemetry.map((call) => ({
      ...call,
      safe_failure_category: category,
    })),
  };
}

/**
 * The final observation carries the complete attempt trail: every attempt's
 * telemetry (status, timestamps, cost, diagnostics) so the evidence export
 * and the report budget reflect exactly what occurred (R-20, R-30, R-36).
 */
function combineAttemptTelemetry(
  finalObservation: AuditObservation,
  attempts: ObservationAttempt[],
): AuditObservation {
  return {
    ...finalObservation,
    telemetry: attempts.flatMap((attempt) => attempt.observation.telemetry),
  };
}

/**
 * Runs one locked question under the 1+2 retry contract:
 *
 * 1. Persist every attempt (R-20).
 * 2. Retry only technically failed questions under the same locked
 *    configuration (R-17).
 * 3. Use bounded backoff appropriate to the safe failure category.
 * 4. Allow up to two automatic retries after the initial attempt.
 * 5. Stop as soon as one evaluable response is saved; never rerun a valid
 *    result.
 *
 * `budget` is carried forward attempt by attempt so per-attempt cost is
 * accounted server-side (R-36); non-retryable failures (e.g. the USD 5
 * ceiling) exhaust immediately.
 */
export async function runQuestionWithRetry(input: {
  prompt: AuditPrompt;
  brief: BusinessBrief;
  safety_identifier: string;
  budget: AuditBudget;
  execute: (input: QuestionExecuteInput) => Promise<AuditObservation>;
  onAttemptStarted?: (attempt: number, automatic: boolean) => void;
  onRetryScheduled?: (info: {
    attempt: number;
    next_attempt: number;
    backoff_ms: number;
    failure_reason: string;
    failure_category: SafeFailureCategory;
  }) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}): Promise<QuestionRunOutcome> {
  const sleep = input.sleep ?? defaultSleep;
  const now = input.now ?? Date.now;
  const attempts: ObservationAttempt[] = [];
  let budget = input.budget;
  let lastObservation: AuditObservation | null = null;
  let lastCategory: SafeFailureCategory = "temporary";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_QUESTION; attempt += 1) {
    const automatic = attempt > 1;
    input.onAttemptStarted?.(attempt, automatic);
    const startedAt = now();
    const rawObservation = await input.execute({
      prompt: input.prompt,
      brief: input.brief,
      safety_identifier: input.safety_identifier,
      budget,
    });
    const classification = classifyObservationFailure(rawObservation);
    const persisted = stampTelemetryFailureCategory(
      stampTelemetryAttempt(
        classification.evaluable || rawObservation.run_status === "failed"
          ? rawObservation
          : markObservationFailed(
              rawObservation,
              failedTestReason(rawObservation),
            ),
        attempt,
      ),
      classification.category,
    );
    attempts.push({
      attempt,
      automatic,
      started_at: new Date(startedAt).toISOString(),
      observation: persisted,
    });
    budget = { ...budget, calls: [...budget.calls, ...persisted.telemetry] };
    lastObservation = persisted;
    lastCategory = classification.category;

    if (classification.evaluable) {
      return {
        status: "evaluable",
        observation: combineAttemptTelemetry(persisted, attempts),
        attempts,
        retry_count: attempt - 1,
      };
    }

    if (
      classification.category === "non_retryable" ||
      attempt === MAX_ATTEMPTS_PER_QUESTION
    ) {
      return {
        status: "exhausted",
        observation: combineAttemptTelemetry(persisted, attempts),
        attempts,
        retry_count: attempt - 1,
        failure_reason: persisted.failure_reason,
        failure_category: classification.category,
      };
    }

    const backoffMs = retryBackoffMs(classification.category, attempt);
    input.onRetryScheduled?.({
      attempt,
      next_attempt: attempt + 1,
      backoff_ms: backoffMs,
      failure_reason: persisted.failure_reason,
      failure_category: classification.category,
    });
    await sleep(backoffMs);
  }

  // Unreachable: the loop returns on every terminal path. Kept only to
  // satisfy the type system.
  const finalObservation = combineAttemptTelemetry(
    lastObservation as AuditObservation,
    attempts,
  );
  return {
    status: "exhausted",
    observation: finalObservation,
    attempts,
    retry_count: MAX_AUTOMATIC_RETRIES_PER_QUESTION,
    failure_reason: finalObservation.failure_reason,
    failure_category: lastCategory,
  };
}
