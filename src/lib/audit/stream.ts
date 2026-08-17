import { z } from "zod";
import { auditObservationSchema, type AuditObservation } from "./types";

export const auditRunEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_started"),
    total: z.literal(10),
    // Spec 003 R-17/R-36: the retry policy and the retry-aware observation
    // stage ceiling are recorded on the run record so the method can reflect
    // exactly what the run was allowed to do. Optional fields keep older
    // events wire-compatible.
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
  }),
  z.object({
    type: z.literal("run_unfinished"),
    completed: z.number().int().min(0).max(9),
    failed_prompt_ids: z.array(z.string()),
    message: z.string().min(1),
  }),
  z.object({ type: z.literal("fatal_error"), message: z.string().min(1) }),
]);

export type AuditRunEvent = z.infer<typeof auditRunEventSchema>;

export function encodeAuditRunEvent(event: AuditRunEvent) {
  return `${JSON.stringify(event)}\n`;
}

export class AuditRunEventParser {
  private buffer = "";

  push(chunk: string): AuditRunEvent[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    return lines
      .filter((line) => line.trim())
      .map((line) => auditRunEventSchema.parse(JSON.parse(line)));
  }

  finish(): AuditRunEvent[] {
    const finalLine = this.buffer.trim();
    this.buffer = "";
    return finalLine ? [auditRunEventSchema.parse(JSON.parse(finalLine))] : [];
  }
}

/**
 * Settled run-status keys (report-labels.ts): pending -> Menunggu, running ->
 * Sedang diuji, retrying -> Mencoba kembali, completed -> Selesai, failed ->
 * Belum berhasil diuji.
 */
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
