import type {
  AuditBudget,
  AuditCallTelemetry,
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
} from "./types";
import type { AuditRunEvent } from "./stream";
import {
  MAX_ATTEMPTS_PER_QUESTION,
  MAX_AUTOMATIC_RETRIES_PER_QUESTION,
  OBSERVATION_STAGE_MAX_CALLS,
  runQuestionWithRetry,
  type ObservationAttempt,
  type QuestionExecuteInput,
} from "./retry";

export type RunEmit = (event: AuditRunEvent) => void;

export type AuditRunSummary = {
  /** Terminal observations in locked question order (evaluable or exhausted). */
  observations: AuditObservation[];
  /** Every persisted attempt per prompt, keyed by prompt_id (R-20). */
  attemptsByPrompt: Record<string, ObservationAttempt[]>;
  /** Questions that exhausted automatic technical recovery (R-19). */
  failed_prompt_ids: string[];
  /** Set when the run stopped early on a non-retryable failure (e.g. cost ceiling). */
  stop_message: string;
};

/**
 * Executes the ten locked questions sequentially (R-21) under the 1+2 retry
 * contract (R-17) and applies the ten-of-ten gate (R-19): `run_completed` is
 * emitted only with ten evaluable observations; otherwise `run_unfinished`
 * records the state and no partial report exists. Completed observations are
 * never rerun; every attempt is persisted on the observation's telemetry.
 */
export async function runAuditObservations(input: {
  prompts: AuditPrompt[];
  brief: BusinessBrief;
  safety_identifier: string;
  budget: AuditBudget;
  execute: (input: QuestionExecuteInput) => Promise<AuditObservation>;
  emit: RunEmit;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}): Promise<AuditRunSummary> {
  const { prompts, brief, safety_identifier, budget, execute, emit } = input;
  if (prompts.length !== 10) {
    throw new Error(
      `A live audit runs exactly ten questions; received ${prompts.length}.`,
    );
  }

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

  for (let index = 0; index < prompts.length; index += 1) {
    const prompt = prompts[index];
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
    });

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
        // Cost ceiling or guard condition: stop safely; further questions
        // would fail identically without adding evidence (R-36).
        stopMessage = outcome.failure_reason;
        break;
      }
    }
  }

  const completed = observations.filter(
    (observation) => observation.run_status === "completed",
  ).length;

  if (completed === 10) {
    emit({ type: "run_completed", observations });
  } else {
    emit({
      type: "run_unfinished",
      completed,
      failed_prompt_ids: failedPromptIds,
      message:
        stopMessage ||
        "Ten evaluable observations could not be reached within the automatic recovery allowance.",
    });
  }

  return {
    observations,
    attemptsByPrompt,
    failed_prompt_ids: failedPromptIds,
    stop_message: stopMessage,
  };
}
