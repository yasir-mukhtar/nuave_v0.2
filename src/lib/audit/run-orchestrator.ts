import type {
  AuditBudget,
  AuditCallTelemetry,
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
} from "./types";
import type { AuditRunEvent } from "./stream";
import {
  assertLiveProviderCredentialsConfigured,
  isLiveProviderCall,
} from "./provider";
import { productionObservationMethodErrors } from "./production-observation-method";
import {
  MAX_ATTEMPTS_PER_QUESTION,
  MAX_AUTOMATIC_RETRIES_PER_QUESTION,
  OBSERVATION_STAGE_MAX_CALLS,
  runQuestionWithRetry,
  throwIfAuditAborted,
  type ObservationAttempt,
  type QuestionExecuteInput,
} from "./retry";

export type RunEmit = (event: AuditRunEvent) => void;

export type AuditRunSummary = {
  observations: AuditObservation[];
  attemptsByPrompt: Record<string, ObservationAttempt[]>;
  failed_prompt_ids: string[];
  stop_message: string;
};

export async function runAuditObservations(input: {
  prompts: AuditPrompt[];
  brief: BusinessBrief;
  safety_identifier: string;
  budget: AuditBudget;
  execute: (input: QuestionExecuteInput) => Promise<AuditObservation>;
  emit: RunEmit;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
  resume?: { observations: AuditObservation[] };
  signal?: AbortSignal;
}): Promise<AuditRunSummary> {
  const { prompts, brief, safety_identifier, budget, execute, emit, resume } =
    input;
  throwIfAuditAborted(input.signal);

  const resumedObservations = resume?.observations ?? [];
  const resumeMethodErrors = productionObservationMethodErrors(
    resumedObservations.filter(
      (observation) => observation.run_status === "completed",
    ),
  );
  if (resumeMethodErrors.length) {
    throw new Error(
      `Resume observations do not match the current protected production observation method. ${resumeMethodErrors.join(" ")}`,
    );
  }
  if (isLiveProviderCall(execute)) {
    assertLiveProviderCredentialsConfigured();
  }
  if (prompts.length !== 10) {
    throw new Error(
      `A live audit runs exactly ten questions; received ${prompts.length}.`,
    );
  }

  throwIfAuditAborted(input.signal);
  emit({
    type: "run_started",
    total: 10,
    max_attempts_per_question: MAX_ATTEMPTS_PER_QUESTION,
    max_automatic_retries: MAX_AUTOMATIC_RETRIES_PER_QUESTION,
    observation_stage_max_calls: OBSERVATION_STAGE_MAX_CALLS,
  });

  const observations: AuditObservation[] = [];
  const attemptsByPrompt: Record<string, ObservationAttempt[]> = {};
  const failedPromptIds: string[] = [];
  let runCalls: AuditCallTelemetry[] = [...budget.calls];
  let stopMessage = "";

  const resumedByPromptId = new Map<string, AuditObservation>();
  for (const observation of resumedObservations) {
    if (observation.run_status === "completed") {
      resumedByPromptId.set(observation.prompt_id, observation);
    }
  }

  for (let index = 0; index < prompts.length; index += 1) {
    throwIfAuditAborted(input.signal);
    const prompt = prompts[index];
    const resumed = resumedByPromptId.get(prompt.prompt_id);

    if (resumed) {
      const attempts = resumed.telemetry.map((call, attemptIndex) => ({
        attempt: call.attempt ?? attemptIndex + 1,
        automatic: call.automatic ?? (call.attempt ?? attemptIndex + 1) > 1,
        started_at: call.started_at,
        observation: { ...resumed, telemetry: [call] },
      }));
      attemptsByPrompt[prompt.prompt_id] = attempts;
      observations.push(resumed);
      throwIfAuditAborted(input.signal);
      emit({
        type: "prompt_completed",
        index,
        attempt: Math.max(1, attempts.length),
        observation: resumed,
      });
      continue;
    }

    emit({
      type: "prompt_started",
      index,
      prompt_id: prompt.prompt_id,
      attempt: 1,
      is_retry: false,
    });

    const outcome = await runQuestionWithRetry({
      prompt,
      brief,
      safety_identifier,
      budget: { ...budget, calls: runCalls },
      execute,
      onAttemptStarted: (attempt, automatic) => {
        throwIfAuditAborted(input.signal);
        if (!automatic) return;
        emit({
          type: "attempt_started",
          index,
          prompt_id: prompt.prompt_id,
          attempt,
          automatic: true,
        });
      },
      onRetryScheduled: (info) => {
        throwIfAuditAborted(input.signal);
        emit({
          type: "prompt_retrying",
          index,
          prompt_id: prompt.prompt_id,
          attempt: info.attempt,
          next_attempt: info.next_attempt,
          backoff_ms: info.backoff_ms,
          failure_reason: info.failure_reason,
        });
      },
      sleep: input.sleep,
      now: input.now,
      signal: input.signal,
    });

    throwIfAuditAborted(input.signal);
    runCalls = [...runCalls, ...outcome.observation.telemetry];
    attemptsByPrompt[prompt.prompt_id] = outcome.attempts;
    observations.push(outcome.observation);
    emit({
      type: "prompt_completed",
      index,
      attempt: outcome.attempts.length,
      observation: outcome.observation,
    });

    if (outcome.status === "exhausted") {
      failedPromptIds.push(prompt.prompt_id);
      emit({
        type: "prompt_failed",
        index,
        prompt_id: prompt.prompt_id,
        attempts: outcome.attempts.length,
        failure_reason: outcome.failure_reason,
      });
      if (outcome.failure_category === "non_retryable") {
        stopMessage = outcome.failure_reason;
        break;
      }
    }
  }

  throwIfAuditAborted(input.signal);
  const completed = observations.filter(
    (observation) => observation.run_status === "completed",
  ).length;

  const attemptsByPromptRecord: Record<
    string,
    Array<{
      attempt: number;
      automatic: boolean;
      started_at: string;
      status: "completed" | "failed";
      failure_reason?: string;
      accounted_cost_usd?: number;
    }>
  > = {};
  for (const [promptId, attempts] of Object.entries(attemptsByPrompt)) {
    attemptsByPromptRecord[promptId] = attempts.map((attempt) => ({
      attempt: attempt.attempt,
      automatic: attempt.automatic,
      started_at: attempt.started_at,
      status: attempt.observation.run_status,
      failure_reason: attempt.observation.failure_reason || undefined,
      accounted_cost_usd:
        attempt.observation.telemetry.length > 0
          ? attempt.observation.telemetry.reduce(
              (sum, call) => sum + call.accounted_cost_usd,
              0,
            )
          : undefined,
    }));
  }
  const attemptsPayload =
    Object.keys(attemptsByPromptRecord).length > 0
      ? attemptsByPromptRecord
      : undefined;

  if (completed === 10) {
    emit({
      type: "run_completed",
      observations,
      attempts_by_prompt: attemptsPayload,
      stop_message: stopMessage || undefined,
    });
  } else {
    emit({
      type: "run_unfinished",
      completed,
      failed_prompt_ids: failedPromptIds,
      message:
        stopMessage ||
        "Ten evaluable observations could not be reached within the automatic recovery allowance.",
      observations,
      attempts_by_prompt: attemptsPayload,
      stop_message: stopMessage || undefined,
    });
  }

  return {
    observations,
    attemptsByPrompt,
    failed_prompt_ids: failedPromptIds,
    stop_message: stopMessage,
  };
}
