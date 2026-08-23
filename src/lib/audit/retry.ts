import type {
  AuditBudget,
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
} from "./types";

export const MAX_ATTEMPTS_PER_QUESTION = 3;
export const MAX_AUTOMATIC_RETRIES_PER_QUESTION = 2;
export const OBSERVATION_STAGE_MAX_CALLS = 10 * MAX_ATTEMPTS_PER_QUESTION;

export type SafeFailureCategory =
  "rate_limited" | "temporary" | "empty_or_unusable" | "non_retryable";

export const RETRY_BACKOFF_MS: Record<
  Exclude<SafeFailureCategory, "non_retryable">,
  readonly [number, number]
> = {
  rate_limited: [10_000, 20_000],
  temporary: [2_000, 5_000],
  empty_or_unusable: [1_000, 3_000],
};

export const MAX_RETRY_BACKOFF_MS = 20_000;

export function retryBackoffMs(
  category: Exclude<SafeFailureCategory, "non_retryable">,
  retryNumber: number,
): number {
  const schedule = RETRY_BACKOFF_MS[category];
  const index = Math.max(0, Math.min(retryNumber, schedule.length) - 1);
  return Math.min(schedule[index], MAX_RETRY_BACKOFF_MS);
}

const NON_RETRYABLE_FAILURE_PATTERNS = [
  /audit limit/,
  /private audit limit/,
  /cost guard supports only/,
  /did not return usage/,
  /only standard default pricing is allowed/,
  /no longer makes a paid provider call/,
  /Unrecognized NUAVE_PROVIDER/,
  /cannot be retried within this request/,
];

export type ObservationClassification = {
  evaluable: boolean;
  category: SafeFailureCategory;
};

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

  return { evaluable: false, category: "empty_or_unusable" };
}

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
  attempt: number;
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
  signal?: AbortSignal;
};

function abortReason(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new DOMException("Audit operation aborted", "AbortError");
}

export function throwIfAuditAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortReason(signal);
}

const defaultSleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(abortReason(signal!));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

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

function combineAttemptTelemetry(
  finalObservation: AuditObservation,
  attempts: ObservationAttempt[],
): AuditObservation {
  return {
    ...finalObservation,
    telemetry: attempts.flatMap((attempt) => attempt.observation.telemetry),
  };
}

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
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
  signal?: AbortSignal;
}): Promise<QuestionRunOutcome> {
  const sleep = input.sleep ?? defaultSleep;
  const now = input.now ?? Date.now;
  const attempts: ObservationAttempt[] = [];
  let budget = input.budget;
  let lastObservation: AuditObservation | null = null;
  let lastCategory: SafeFailureCategory = "temporary";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_QUESTION; attempt += 1) {
    throwIfAuditAborted(input.signal);
    const automatic = attempt > 1;
    input.onAttemptStarted?.(attempt, automatic);
    const startedAt = now();
    const rawObservation = await input.execute({
      prompt: input.prompt,
      brief: input.brief,
      safety_identifier: input.safety_identifier,
      budget,
      signal: input.signal,
    });
    throwIfAuditAborted(input.signal);
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
    await sleep(backoffMs, input.signal);
  }

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
