/**
 * Spec 018: the DataForSEO client used by discovery (PR 1). One task per live
 * request, HTTP Basic auth with server secrets, every paid call reserved in
 * the spend ledger first (R-25), status codes per R-14.
 *
 * DATAFORSEO_BASE_URL may point at the free sandbox
 * (https://sandbox.dataforseo.com/v3) for development; it returns fixed
 * sample data, so it proves wiring, never question quality.
 */
import { reserveProviderSpend } from "../spending/provider-spend";

export const DATAFORSEO_PROVIDER = "dataforseo" as const;
const DEFAULT_BASE_URL = "https://api.dataforseo.com/v3";
/** Discovery calls are small; live SERP calls normally answer in seconds. */
export const DISCOVERY_CALL_TIMEOUT_MS = 30_000;

/** Fixed per-call reservations (R-25), in USD. */
export const DATAFORSEO_CALL_MAX_USD = {
  serp: 0.006,
  chatgpt: 0.006,
  keywordSuggestions: 0.015,
  autocomplete: 0.004,
} as const;

export type DataForSeoCall = keyof typeof DATAFORSEO_CALL_MAX_USD;

export const DATAFORSEO_PATHS: Readonly<Record<DataForSeoCall, string>> = {
  serp: "/serp/google/organic/live/advanced",
  chatgpt: "/ai_optimization/chat_gpt/llm_scraper/live/advanced",
  keywordSuggestions: "/dataforseo_labs/google/keyword_suggestions/live",
  autocomplete: "/serp/google/autocomplete/live/advanced",
};

/** What a status code means for Nuave (R-14). */
export type DataForSeoOutcome =
  "ok" | "no_results" | "retry" | "unavailable" | "failed";

const RETRY_CODES = new Set([40202, 40209, 50000, 50301, 50303, 50401]);
/** Credentials, access, balance or cost limit: no retry, founder notice. */
const UNAVAILABLE_CODES = new Set([40100, 40104, 40200, 40201, 40203, 40210]);

export function classifyDataForSeoStatus(
  code: number | null,
): DataForSeoOutcome {
  if (code === 20000) return "ok";
  if (code === 40102) return "no_results";
  if (code !== null && RETRY_CODES.has(code)) return "retry";
  if (code !== null && UNAVAILABLE_CODES.has(code)) return "unavailable";
  return "failed";
}

export function dataForSeoCredentialsPresent(): boolean {
  return Boolean(
    process.env.DATAFORSEO_LOGIN?.trim() &&
    process.env.DATAFORSEO_PASSWORD?.trim(),
  );
}

/** One request as sent: the path and the single task body. */
export type DataForSeoRequest = { path: string; body: Record<string, unknown> };

export type DataForSeoEnvelope = {
  httpStatus: number;
  json: unknown;
  /** Transport failure detail (timeout, network); never a secret. */
  transportError?: string;
};

export type DataForSeoTransport = {
  kind: "live" | "synthetic" | "test";
  send: (request: DataForSeoRequest) => Promise<DataForSeoEnvelope>;
};

export const liveDataForSeoTransport: DataForSeoTransport = {
  kind: "live",
  send: async ({ path, body }) => {
    const base = process.env.DATAFORSEO_BASE_URL?.trim() || DEFAULT_BASE_URL;
    const auth = btoa(
      `${process.env.DATAFORSEO_LOGIN ?? ""}:${process.env.DATAFORSEO_PASSWORD ?? ""}`,
    );
    try {
      const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          authorization: `Basic ${auth}`,
          "content-type": "application/json",
        },
        body: JSON.stringify([body]),
        signal: AbortSignal.timeout(DISCOVERY_CALL_TIMEOUT_MS),
        redirect: "manual",
      });
      const json = await response.json().catch(() => null);
      return { httpStatus: response.status, json };
    } catch (error) {
      return {
        httpStatus: 0,
        json: null,
        transportError:
          error instanceof Error ? error.message : "request failed",
      };
    }
  },
};

export type DataForSeoResult = {
  outcome: DataForSeoOutcome;
  statusCode: number | null;
  /** `tasks[0].result[0]` when the task succeeded. */
  result: Record<string, unknown> | null;
  costUsd: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Reads the task status and cost from a DataForSEO envelope. */
export function readDataForSeoEnvelope(envelope: DataForSeoEnvelope): {
  statusCode: number | null;
  costUsd: number | null;
  result: Record<string, unknown> | null;
} {
  const top = record(envelope.json);
  const tasks = Array.isArray(top?.tasks) ? top.tasks : [];
  const task = record(tasks[0]);
  const statusCode =
    typeof task?.status_code === "number"
      ? task.status_code
      : typeof top?.status_code === "number"
        ? top.status_code
        : null;
  const cost =
    typeof task?.cost === "number"
      ? task.cost
      : typeof top?.cost === "number"
        ? top.cost
        : null;
  const results = Array.isArray(task?.result) ? task.result : [];
  return { statusCode, costUsd: cost, result: record(results[0]) };
}

/** True when any text in the request body contains one of the words (R-02). */
export function requestContainsWords(
  request: DataForSeoRequest,
  forbidden: readonly string[],
): boolean {
  if (!forbidden.length) return false;
  const texts = Object.values(request.body).filter(
    (value): value is string => typeof value === "string",
  );
  return texts.some((text) => {
    const present = new Set(
      text.toLocaleLowerCase("id-ID").split(/[^\p{L}\p{N}]+/u),
    );
    return forbidden.some((word) => present.has(word));
  });
}

/**
 * One paid DataForSEO task: reserve its maximum, send once (a retryable
 * status is sent once more), settle to the returned cost. A request that
 * would carry a brand word is never sent (R-02).
 */
export async function callDataForSeo(input: {
  call: DataForSeoCall;
  body: Record<string, unknown>;
  stage: string;
  transport: DataForSeoTransport;
  forbiddenWords: readonly string[];
}): Promise<DataForSeoResult> {
  const request: DataForSeoRequest = {
    path: DATAFORSEO_PATHS[input.call],
    body: input.body,
  };
  if (requestContainsWords(request, input.forbiddenWords))
    return { outcome: "failed", statusCode: null, result: null, costUsd: 0 };
  let costUsd = 0;
  let last: DataForSeoResult | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const spend = await reserveProviderSpend({
      provider: DATAFORSEO_PROVIDER,
      stage: input.stage,
      usd: DATAFORSEO_CALL_MAX_USD[input.call],
    });
    const envelope = await input.transport.send(request);
    const read = readDataForSeoEnvelope(envelope);
    const outcome = envelope.transportError
      ? "retry"
      : classifyDataForSeoStatus(read.statusCode);
    // A returned cost settles the call. A refusal (credentials, balance) ran
    // nothing and costs nothing; an unknown outcome stays held.
    if (read.costUsd !== null) await spend.settle(read.costUsd);
    else if (outcome === "unavailable") await spend.settle(0);
    costUsd += read.costUsd ?? 0;
    last = {
      outcome,
      statusCode: read.statusCode,
      result: outcome === "ok" ? read.result : null,
      costUsd,
    };
    if (outcome !== "retry") break;
  }
  return last!;
}
