/**
 * Shared HTTP plumbing for the experiment runners: an instrumented fetch
 * wrapper (records calls, attempts, rejections and timeouts), usage/identity
 * extraction from Responses API bodies, and guarded live-run entry points.
 * Mirrors the existing evaluation tooling
 * (src/lib/audit/questions-id-live.ts, scripts/eval) without touching it.
 */
import {
  INDONESIAN_QUESTION_OPENCODEGO_SYSTEM,
} from "../../../src/lib/audit/questions-id-provider";
import {
  LIVE_ENV_FLAG,
  OPENCODEGO_CREDENTIAL_VAR,
  RESPONSES_ENDPOINT,
  requestTimeoutMs,
} from "./experiment-config";

export type CapturedCall = {
  url: string;
  /** HTTP status; 0 when the request never completed (rejection/timeout). */
  status: number;
  started_at_ms: number;
  completed_at_ms: number;
  latency_ms: number;
  body: unknown;
  error?: string;
};

export type CapturingFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type InstrumentedFetch = {
  fetcher: CapturingFetch;
  calls: CapturedCall[];
  attempts: () => number;
};

/** Wraps a fetcher (defaults to the global fetch), recording every attempt —
 * including rejections and aborts, which are captured and re-thrown so the
 * caller can record the unresolved attempt without retrying. */
export function instrumentedFetch(fetcher?: CapturingFetch): InstrumentedFetch {
  const original: CapturingFetch =
    fetcher ?? ((input, init) => globalThis.fetch(input, init));
  const calls: CapturedCall[] = [];
  let attemptCount = 0;
  const wrapped: CapturingFetch = async (input, init) => {
    attemptCount += 1;
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input);
    const startedAt = Date.now();
    try {
      const res = await original(input, init);
      const body = await res
        .clone()
        .json()
        .catch(() => ({}));
      calls.push({
        url,
        status: res.status,
        started_at_ms: startedAt,
        completed_at_ms: Date.now(),
        latency_ms: Date.now() - startedAt,
        body,
      });
      return res;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Fetch failed without details.";
      calls.push({
        url,
        status: 0,
        started_at_ms: startedAt,
        completed_at_ms: Date.now(),
        latency_ms: Date.now() - startedAt,
        body: {},
        error: message,
      });
      throw error;
    }
  };
  return { fetcher: wrapped, calls, attempts: () => attemptCount };
}

export type ResponsesUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  model: string;
  response_id: string;
};

export function extractResponsesUsage(body: unknown): ResponsesUsage | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const usage = record.usage as
    | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
    | undefined;
  if (!usage) return null;
  return {
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    total_tokens: usage.total_tokens ?? 0,
    model: typeof record.model === "string" ? record.model : "",
    response_id: typeof record.id === "string" ? record.id : "",
  };
}

export function providerErrorMessage(body: unknown): string {
  if (typeof body !== "object" || body === null) return "";
  const record = body as Record<string, unknown>;
  const error = record.error as { message?: string } | undefined;
  return typeof error?.message === "string" ? error.message : "";
}

export function providerSystemLabel(): string {
  return INDONESIAN_QUESTION_OPENCODEGO_SYSTEM;
}

/** Refuses to run unless the live flag is set and the credential exists.
 * Called BEFORE any fetch so an accidental run makes zero provider calls. */
export function assertLiveRunAllowed(): void {
  if (process.env[LIVE_ENV_FLAG] !== "1") {
    throw new Error(
      `Live generation refused: set ${LIVE_ENV_FLAG}=1 to run a scheduled paid ` +
        `generation. Offline verification never calls a provider.`,
    );
  }
  if (!process.env[OPENCODEGO_CREDENTIAL_VAR]?.trim()) {
    throw new Error(
      `${OPENCODEGO_CREDENTIAL_VAR} is not configured; the experiment fails closed before any provider call.`,
    );
  }
}

/** One bounded, no-retry Responses API call. Failures reject; callers record
 * the unresolved attempt instead of retrying. */
export async function postResponses(
  payload: Record<string, unknown>,
  fetcher: CapturingFetch,
): Promise<{ body: unknown; http_status: number }> {
  const timeoutMs = requestTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetcher(RESPONSES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env[OPENCODEGO_CREDENTIAL_VAR] ?? ""}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as unknown;
    return { body, http_status: res.status };
  } finally {
    clearTimeout(timer);
  }
}
