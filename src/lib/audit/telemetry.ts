import type { Response } from "openai/resources/responses/responses";
import {
  AUDIT_COST_LIMIT_USD,
  type AuditBudget,
  type AuditCallTelemetry,
} from "./types";
import { OBSERVATION_STAGE_MAX_CALLS } from "./retry";
import {
  isPricedOpenAIModel,
  OPENAI_MODEL_PRICES,
  type PricedOpenAIModel,
} from "./models";

export const AUDIT_PRICING_VERSION = "openai-standard-2026-08-01";
/** The model of every OpenAI call but step 3's (`OPENAI_AUDIT_MODEL`'s
 * default). The cost guard prices any row of `OPENAI_MODEL_PRICES`. */
export const AUDIT_MODEL = "gpt-5.6-luna";

const WEB_SEARCH_USD_PER_CALL = 0.01;

// Question generation is built in code from the verified brief, so the prompts
// stage has no provider call and no output allowance. The stage is retained so
// telemetry recorded before that correction still validates and prices.
//
// `max_tool_calls` is a REQUESTED cap sent to the OpenAI Responses API
// (`openai.ts`'s `max_tool_calls` request field); it is not a guaranteed
// server-side enforcement. A live run recorded `NUAVE-BRAND-VALIDATION-02`
// with 2 `web_search_call` items on a single attempt despite
// `observation.max_tool_calls: 1` (O-8, Phase 3 fix-round-2 adversarial
// review, 2026-08-18) — treat this as an advisory hint to the provider, not a
// hard ceiling. `recordCompletedAuditCall` (below) always counts the actual
// `web_search_call` items the provider returned and prices from that real
// count, so the cost ledger is correct even when the request-level cap is
// exceeded; only `reserveAuditCall`'s pre-call reservation assumes the cap
// held, which can very slightly under-reserve headroom for that one call.
//
// `extract.max_output_tokens` covers reasoning tokens, the web-search call, and
// the whole `extractionDraftSchema` object, which OpenAI structured outputs
// makes fully required — a truncated response parses to nothing and costs the
// founder the entire draft. The first live extraction against a real Indonesian
// business site ended `incomplete_details.reason: "max_output_tokens"` at the
// original 4,000 allowance, so it now matches the report stage at 16,000. The
// ceiling only bounds a runaway response (16,000 output tokens is USD 0.0288 at
// Luna long-context output pricing); every recorded call is still priced from
// real provider usage.
export const AUDIT_CALL_LIMITS = {
  extract: { max_output_tokens: 16_000, max_tool_calls: 1 },
  prompts: { max_output_tokens: 0, max_tool_calls: 0 },
  observation: { max_output_tokens: 3_000, max_tool_calls: 1 },
  report: { max_output_tokens: 16_000, max_tool_calls: 0 },
} as const;

export const AUDIT_STAGE_CALL_LIMITS = {
  // `docs/journey/03-business-facts.md` ("Model returns invalid or empty
  // structured output"): retry once when the cost and method stay within the
  // preparation allowance, then fall back to manual entry. Two is the ceiling
  // for that one retry, not an allowance for repeated extraction; the USD 5
  // per-session cap and `reserveAuditCall` still gate the second call.
  extract: 2,
  prompts: 0,
  // Spec 003 R-17/R-36: the observation stage must absorb the targeted 1+2
  // retry policy — 10 questions x 3 attempts (one initial + up to two
  // automatic technical retries per question) = 30. The USD 5 per-session
  // ceiling remains the binding cap; this ceiling only bounds call count.
  observation: OBSERVATION_STAGE_MAX_CALLS,
  report: 3,
} as const;

type AuditStage = AuditCallTelemetry["stage"];

export class AuditBudgetError extends Error {
  readonly status = 402;

  constructor(message: string) {
    super(message);
    this.name = "AuditBudgetError";
  }
}

export class AuditCallExecutionError extends Error {
  readonly status = 502;
  readonly telemetry: AuditCallTelemetry[];

  constructor(message: string, telemetry: AuditCallTelemetry[]) {
    super(message);
    this.name = "AuditCallExecutionError";
    this.telemetry = telemetry;
  }
}

function roundedUsd(value: number) {
  return Math.round(value * 100_000_000) / 100_000_000;
}

export function configuredAuditCarryoverCostUsd() {
  const raw = process.env.OPENAI_AUDIT_CARRYOVER_COST_USD?.trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > AUDIT_COST_LIMIT_USD) {
    throw new AuditBudgetError(
      `OPENAI_AUDIT_CARRYOVER_COST_USD must be between 0 and ${AUDIT_COST_LIMIT_USD}.`,
    );
  }
  return roundedUsd(value);
}

/**
 * The budget every paid route must use. The browser's `budget.calls` and
 * `carryover_cost_usd` are NOT trusted: a client that posts `calls: []` would
 * restore full headroom, so routes ignore them and start from this empty
 * budget. What it bounds is only the calls made inside one request. The real
 * spend cap is the server-side daily ledger (`src/lib/spending`), which
 * `reserveProviderSpend` checks before every paid provider call.
 */
export function serverOwnedAuditBudget(): AuditBudget {
  return { limit_usd: AUDIT_COST_LIMIT_USD, carryover_cost_usd: 0, calls: [] };
}

/**
 * Floor on the carryover from server configuration only
 * (`OPENAI_AUDIT_CARRYOVER_COST_USD`); the carryover a client reports does not
 * lower or raise what the server decides from.
 */
export function effectiveAuditCarryoverCostUsd(budget: AuditBudget) {
  return Math.max(budget.carryover_cost_usd, configuredAuditCarryoverCostUsd());
}

function tokenCost(
  model: PricedOpenAIModel,
  inputTokens: number,
  cachedInputTokens: number,
  cacheWriteInputTokens: number,
  outputTokens: number,
) {
  const prices = OPENAI_MODEL_PRICES[model];
  const rate =
    inputTokens > prices.long_context_threshold ? prices.long : prices.short;
  const ordinaryInputTokens = Math.max(
    0,
    inputTokens - cachedInputTokens - cacheWriteInputTokens,
  );

  return (
    (ordinaryInputTokens * rate.input +
      cachedInputTokens * rate.cached_input +
      cacheWriteInputTokens * rate.cache_write_input +
      outputTokens * rate.output) /
    1_000_000
  );
}

function requestInputTokenUpperBound(request: unknown) {
  return new TextEncoder().encode(JSON.stringify(request)).length;
}

/**
 * The checks every report-stage reservation shares, whatever the provider:
 * the stage still makes paid calls, has calls left, and the call's reserved
 * cost fits the request's audit budget. Throws `AuditBudgetError` otherwise.
 */
export function checkAuditBudget(input: {
  budget: AuditBudget;
  stage: AuditStage;
  reservedCost: number;
}) {
  if (AUDIT_STAGE_CALL_LIMITS[input.stage] === 0) {
    throw new AuditBudgetError(
      `The ${input.stage} stage no longer makes a paid provider call in the private audit.`,
    );
  }
  const stageCalls = input.budget.calls.filter(
    (call) => call.stage === input.stage,
  ).length;
  if (stageCalls >= AUDIT_STAGE_CALL_LIMITS[input.stage]) {
    throw new AuditBudgetError(
      `The ${input.stage} stage has reached its ${AUDIT_STAGE_CALL_LIMITS[input.stage]}-call private audit limit.`,
    );
  }
  const accounted =
    effectiveAuditCarryoverCostUsd(input.budget) +
    input.budget.calls.reduce(
      (total, call) => total + call.accounted_cost_usd,
      0,
    );

  if (accounted + input.reservedCost > input.budget.limit_usd) {
    throw new AuditBudgetError(
      `The next ${input.stage} call could exceed the USD ${input.budget.limit_usd.toFixed(2)} audit limit. USD ${accounted.toFixed(4)} is already accounted for and USD ${input.reservedCost.toFixed(4)} must be reserved.`,
    );
  }
}

export function reserveAuditCall(input: {
  budget: AuditBudget;
  stage: AuditStage;
  request: unknown;
  requested_model: string;
  has_web_search: boolean;
}) {
  const model = input.requested_model;
  if (!isPricedOpenAIModel(model)) {
    throw new AuditBudgetError(
      `The private cost guard has no price for ${model}; priced models: ${Object.keys(OPENAI_MODEL_PRICES).join(", ")}.`,
    );
  }
  const limits = AUDIT_CALL_LIMITS[input.stage];
  const inputTokenUpperBound = input.has_web_search
    ? OPENAI_MODEL_PRICES[model].max_input_tokens
    : requestInputTokenUpperBound(input.request);
  const reservedCost = roundedUsd(
    tokenCost(model, inputTokenUpperBound, 0, 0, limits.max_output_tokens) +
      (input.has_web_search ? WEB_SEARCH_USD_PER_CALL : 0),
  );
  checkAuditBudget({
    budget: input.budget,
    stage: input.stage,
    reservedCost,
  });
  return reservedCost;
}

function responseUsage(response: Response) {
  const usage = response.usage;
  if (!usage) {
    throw new AuditBudgetError(
      "OpenAI did not return usage for a completed audit call.",
    );
  }
  const inputDetails = usage.input_tokens_details;
  const outputDetails = usage.output_tokens_details;
  const cacheWriteTokens =
    inputDetails && "cache_write_tokens" in inputDetails
      ? Number(inputDetails.cache_write_tokens || 0)
      : 0;

  return {
    input_tokens: usage.input_tokens,
    cached_input_tokens: inputDetails?.cached_tokens || 0,
    cache_write_input_tokens: cacheWriteTokens,
    output_tokens: usage.output_tokens,
    reasoning_output_tokens: outputDetails?.reasoning_tokens || 0,
    total_tokens: usage.total_tokens,
  };
}

export type ProviderCompletionDiagnostics = {
  provider_status: string;
  incomplete_reason: string;
  output_text_present: boolean;
  refusal_present: boolean;
};

/**
 * Records how a provider response ended so a structured-output failure can be
 * attributed later. It keeps only the provider's own status enums and two
 * shape flags; no provider-authored text is retained.
 */
export function providerCompletionDiagnostics(
  response: Pick<Response, "status" | "incomplete_details" | "output">,
): ProviderCompletionDiagnostics {
  let output_text_present = false;
  let refusal_present = false;
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content) {
      if (content.type === "output_text" && content.text) {
        output_text_present = true;
      }
      if (content.type === "refusal") refusal_present = true;
    }
  }
  return {
    provider_status: response.status || "",
    incomplete_reason: response.incomplete_details?.reason || "",
    output_text_present,
    refusal_present,
  };
}

/**
 * A short, safe explanation of why a parsed structured response was empty.
 * The OpenAI SDK returns `output_parsed: null` whenever the response status is
 * not `completed`, or no output text message was returned.
 */
export function structuredOutputFailureDetail(
  diagnostics: ProviderCompletionDiagnostics,
) {
  const parts: string[] = [];
  if (diagnostics.provider_status) {
    parts.push(`Provider status: ${diagnostics.provider_status}`);
  }
  if (diagnostics.incomplete_reason) {
    parts.push(`incomplete reason: ${diagnostics.incomplete_reason}`);
  }
  if (diagnostics.refusal_present) {
    parts.push("the response was a refusal");
  } else if (!diagnostics.output_text_present) {
    parts.push("no output text was returned");
  }
  return parts.length ? `${parts.join("; ")}.` : "";
}

export function completedCallTelemetry(input: {
  stage: AuditStage;
  attempt?: number;
  started_at_ms: number;
  requested_model: string;
  response: Response;
}): AuditCallTelemetry {
  const completedAt = Date.now();
  const model = input.response.model;
  if (model !== input.requested_model || !isPricedOpenAIModel(model)) {
    throw new AuditBudgetError(
      `OpenAI returned ${model}, but the cost guard is pinned to the requested ${input.requested_model}.`,
    );
  }
  if (
    input.response.service_tier &&
    input.response.service_tier !== "default"
  ) {
    throw new AuditBudgetError(
      `OpenAI returned service tier ${input.response.service_tier}; only standard default pricing is allowed.`,
    );
  }
  const usage = responseUsage(input.response);
  const webSearchCalls = input.response.output.filter(
    (item) => item.type === "web_search_call",
  ).length;
  const accountedCost = roundedUsd(
    tokenCost(
      model,
      usage.input_tokens,
      usage.cached_input_tokens,
      usage.cache_write_input_tokens,
      usage.output_tokens,
    ) +
      webSearchCalls * WEB_SEARCH_USD_PER_CALL,
  );

  return {
    stage: input.stage,
    attempt: input.attempt || 1,
    status: "completed",
    started_at: new Date(input.started_at_ms).toISOString(),
    completed_at: new Date(completedAt).toISOString(),
    latency_ms: Math.max(0, completedAt - input.started_at_ms),
    requested_model: input.requested_model,
    returned_model: input.response.model,
    response_id: input.response.id,
    service_tier: input.response.service_tier || "default",
    usage,
    web_search_calls: webSearchCalls,
    accounted_cost_usd: accountedCost,
    cost_basis: "provider_usage",
    pricing_version: AUDIT_PRICING_VERSION,
    failure_reason: "",
    ...providerCompletionDiagnostics(input.response),
  };
}

export function failedCallTelemetry(input: {
  stage: AuditStage;
  attempt?: number;
  started_at_ms: number;
  requested_model: string;
  reserved_cost_usd: number;
  error: unknown;
}): AuditCallTelemetry {
  const completedAt = Date.now();
  return {
    stage: input.stage,
    attempt: input.attempt || 1,
    status: "failed",
    started_at: new Date(input.started_at_ms).toISOString(),
    completed_at: new Date(completedAt).toISOString(),
    latency_ms: Math.max(0, completedAt - input.started_at_ms),
    requested_model: input.requested_model,
    returned_model: "",
    response_id: "",
    service_tier: "default",
    usage: {
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
    },
    web_search_calls: 0,
    accounted_cost_usd: input.reserved_cost_usd,
    cost_basis: "preflight_reservation",
    pricing_version: AUDIT_PRICING_VERSION,
    failure_reason:
      input.error instanceof Error
        ? input.error.message
        : "The request failed without further details.",
    provider_status: "",
    incomplete_reason: "",
    output_text_present: false,
    refusal_present: false,
  };
}

export function summarizeAuditTelemetry(
  calls: AuditCallTelemetry[],
  limitUsd = AUDIT_COST_LIMIT_USD,
  carryoverCostUsd = 0,
) {
  const totals = calls.reduce(
    (summary, call) => {
      summary.failed_call_count += call.status === "failed" ? 1 : 0;
      summary.latency_ms += call.latency_ms;
      summary.input_tokens += call.usage.input_tokens;
      summary.cached_input_tokens += call.usage.cached_input_tokens;
      summary.cache_write_input_tokens += call.usage.cache_write_input_tokens;
      summary.output_tokens += call.usage.output_tokens;
      summary.reasoning_output_tokens += call.usage.reasoning_output_tokens;
      summary.total_tokens += call.usage.total_tokens;
      summary.web_search_calls += call.web_search_calls;
      summary.accounted_cost_usd += call.accounted_cost_usd;
      return summary;
    },
    {
      failed_call_count: 0,
      latency_ms: 0,
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
      web_search_calls: 0,
      accounted_cost_usd: 0,
    },
  );

  return {
    pricing_version: AUDIT_PRICING_VERSION,
    cost_limit_usd: limitUsd,
    carryover_cost_usd: roundedUsd(carryoverCostUsd),
    call_count: calls.length,
    ...totals,
    accounted_cost_usd: roundedUsd(
      carryoverCostUsd + totals.accounted_cost_usd,
    ),
    calls,
  };
}
