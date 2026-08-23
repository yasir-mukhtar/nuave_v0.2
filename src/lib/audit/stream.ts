import { z } from "zod";
import { auditObservationSchema, type AuditObservation } from "./types";

export const runAttemptRecordSchema = z.object({
  attempt: z.number().int().min(1).max(3),
  automatic: z.boolean(),
  started_at: z.string(),
  status: z.enum(["completed", "failed"]),
  failure_reason: z.string().optional(),
  accounted_cost_usd: z.number().nonnegative().optional(),
});

export const runAttemptsByPromptSchema = z.record(
  z.string(),
  z.array(runAttemptRecordSchema),
);

export const auditRunEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_started"),
    total: z.literal(10),
    max_attempts_per_question: z.number().int().min(1).max(3).default(3),
    max_automatic_retries: z.number().int().min(0).max(2).default(2),
    observation_stage_max_calls: z.number().int().min(10).default(30),
  }),
  z.object({
    type: z.literal("prompt_started"),
    index: z.number().int().min(0).max(9),
    prompt_id: z.string(),
    attempt: z.number().int().min(1).max(3).default(1),
    is_retry: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("attempt_started"),
    index: z.number().int().min(0).max(9),
    prompt_id: z.string(),
    attempt: z.number().int().min(2).max(3),
    automatic: z.literal(true),
  }),
  z.object({
    type: z.literal("prompt_retrying"),
    index: z.number().int().min(0).max(9),
    prompt_id: z.string(),
    attempt: z.number().int().min(1).max(2),
    next_attempt: z.number().int().min(2).max(3),
    backoff_ms: z.number().int().nonnegative(),
    failure_reason: z.string(),
  }),
  z.object({
    type: z.literal("prompt_completed"),
    index: z.number().int().min(0).max(9),
    attempt: z.number().int().min(1).max(3).default(1),
    observation: auditObservationSchema,
  }),
  z.object({
    type: z.literal("prompt_failed"),
    index: z.number().int().min(0).max(9),
    prompt_id: z.string(),
    attempts: z.number().int().min(1).max(3),
    failure_reason: z.string(),
  }),
  z.object({
    type: z.literal("run_completed"),
    observations: z.array(auditObservationSchema).length(10),
    attempts_by_prompt: runAttemptsByPromptSchema.optional(),
    stop_message: z.string().optional(),
  }),
  z.object({
    type: z.literal("run_unfinished"),
    completed: z.number().int().min(0).max(9),
    failed_prompt_ids: z.array(z.string()),
    message: z.string().min(1),
    observations: z.array(auditObservationSchema).optional(),
    attempts_by_prompt: runAttemptsByPromptSchema.optional(),
    stop_message: z.string().optional(),
  }),
  z.object({ type: z.literal("fatal_error"), message: z.string().min(1) }),
]);

export type AuditRunEvent = z.infer<typeof auditRunEventSchema>;

export function encodeAuditRunEvent(event: AuditRunEvent) {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Incremental NDJSON parser with transactional delivery.
 *
 * A malformed later line must not erase valid events that were already parsed
 * from the same network chunk. `push` therefore returns the valid prefix and
 * stores the first parse failure as a terminal error. The next `push` or
 * `finish` surfaces that error before any later bytes can be accepted.
 */
export class AuditRunEventParser {
  private buffer = "";
  private terminalError: unknown = null;

  private throwTerminalError(): never {
    const error = this.terminalError;
    this.terminalError = null;
    this.buffer = "";
    throw error;
  }

  push(chunk: string): AuditRunEvent[] {
    if (this.terminalError) this.throwTerminalError();
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    const events: AuditRunEvent[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        events.push(auditRunEventSchema.parse(JSON.parse(line)));
      } catch (error) {
        this.terminalError = error;
        this.buffer = "";
        break;
      }
    }
    return events;
  }

  finish(): AuditRunEvent[] {
    if (this.terminalError) this.throwTerminalError();
    const finalLine = this.buffer.trim();
    this.buffer = "";
    return finalLine ? [auditRunEventSchema.parse(JSON.parse(finalLine))] : [];
  }
}

export type PromptRunStatus =
  "pending" | "running" | "retrying" | "completed" | "failed";

export function mergeObservation(
  observations: AuditObservation[],
  observation: AuditObservation,
) {
  const next = observations.filter(
    (item) => item.prompt_id !== observation.prompt_id,
  );
  next.push(observation);
  return next;
}

export async function runWithConcurrency<T, R>(input: {
  items: T[];
  limit: number;
  onStart: (item: T, index: number) => void;
  work: (item: T, index: number) => Promise<R>;
  onComplete: (result: R, index: number) => void;
}) {
  const results = new Array<R>(input.items.length);
  let next = 0;

  async function worker() {
    while (next < input.items.length) {
      const index = next++;
      const item = input.items[index];
      input.onStart(item, index);
      const result = await input.work(item, index);
      results[index] = result;
      input.onComplete(result, index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(input.limit, input.items.length) }, worker),
  );
  return results;
}

export function deriveAuditStep(input: {
  hasReport: boolean;
  executionStarted: boolean;
  hasPromptPack: boolean;
  factsExtracted: boolean;
}) {
  if (input.hasReport) return 4;
  if (input.executionStarted) return 3;
  if (input.hasPromptPack) return 2;
  if (input.factsExtracted) return 1;
  return 0;
}
