/**
 * Spec 018 R-12, R-14 and R-25: one paid check call. Unlike discovery, a
 * check is sent exactly once per attempt: the runner owns retries, so a retry
 * asks only the source that failed, in a later step (R-14).
 */
import {
  classifyDataForSeoStatus,
  DATAFORSEO_CALL_MAX_USD,
  DATAFORSEO_PATHS,
  DATAFORSEO_PROVIDER,
  readDataForSeoEnvelope,
  type DataForSeoOutcome,
  type DataForSeoTransport,
} from "../discovery/dataforseo";
import { reserveProviderSpend } from "../spending/provider-spend";

/** R-12: DataForSEO allows live scraper calls up to 120 seconds. */
export const CHATGPT_CHECK_TIMEOUT_MS = 150_000;
/** A live SERP call normally answers in seconds; the AI Overview loads late. */
export const GOOGLE_CHECK_TIMEOUT_MS = 120_000;

export type CheckSource = "chatgpt" | "google";

export type CheckSend = {
  outcome: DataForSeoOutcome;
  statusCode: number | null;
  /** `tasks[0].result[0]` when the task succeeded. */
  result: Record<string, unknown> | null;
  costUsd: number;
  /** DataForSEO's task id: the response id recorded with the evidence. */
  taskId: string;
  startedAt: Date;
  completedAt: Date;
  /** Timeout or network detail; never a secret. */
  transportError: string | null;
};

function taskId(json: unknown): string {
  const tasks = (json as { tasks?: unknown[] } | null)?.tasks;
  const id = Array.isArray(tasks)
    ? (tasks[0] as { id?: unknown } | undefined)?.id
    : undefined;
  return typeof id === "string" ? id : "";
}

/**
 * Reserves the call's fixed maximum (R-25), sends it once and settles to the
 * returned cost. A refusal (credentials, balance) ran nothing and costs
 * nothing; a timeout keeps its reservation, because its cost is unknown.
 * Throws SpendCapError, unsent, when the reservation is refused.
 */
export async function sendCheck(input: {
  source: CheckSource;
  body: Record<string, unknown>;
  transport: DataForSeoTransport;
  now: () => Date;
}): Promise<CheckSend> {
  const call = input.source === "chatgpt" ? "chatgpt" : "serp";
  const spend = await reserveProviderSpend({
    provider: DATAFORSEO_PROVIDER,
    stage: "observation",
    usd: DATAFORSEO_CALL_MAX_USD[call],
  });
  const startedAt = input.now();
  const envelope = await input.transport.send({
    path: DATAFORSEO_PATHS[call],
    body: input.body,
    timeoutMs:
      input.source === "chatgpt"
        ? CHATGPT_CHECK_TIMEOUT_MS
        : GOOGLE_CHECK_TIMEOUT_MS,
  });
  const completedAt = input.now();
  const read = readDataForSeoEnvelope(envelope);
  const outcome: DataForSeoOutcome = envelope.transportError
    ? "retry"
    : classifyDataForSeoStatus(read.statusCode);
  if (read.costUsd !== null) await spend.settle(read.costUsd);
  else if (outcome === "unavailable") await spend.settle(0);
  return {
    outcome,
    statusCode: read.statusCode,
    result: outcome === "ok" ? read.result : null,
    costUsd: read.costUsd ?? 0,
    taskId: taskId(envelope.json),
    startedAt,
    completedAt,
    transportError: envelope.transportError ?? null,
  };
}
