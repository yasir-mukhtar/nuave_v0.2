import type { Response } from "openai/resources/responses/responses";
import {
  AUDIT_COST_LIMIT_USD,
  type AuditBudget,
  type AuditCallTelemetry,
} from "./types";

export const AUDIT_PRICING_VERSION = "openai-standard-2026-08-01";
export const AUDIT_MODEL = "gpt-5.6-luna";

// Official OpenAI standard pricing and model limits observed 2026-08-01:
// https://developers.openai.com/api/docs/pricing
// https://developers.openai.com/api/docs/models/gpt-5.6-luna
const LUNA_MAX_INPUT_TOKENS = 922_000;
const LONG_CONTEXT_THRESHOLD = 272_000;
const WEB_SEARCH_USD_PER_CALL = 0.01;

const PRICING = {
  short: {
    input: 0.2,
    cached_input: 0.02,
    cache_write_input: 0.25,
    output: 1.2,
  },
  long: {
    input: 0.4,
    cached_input: 0.04,
    cache_write_input: 0.5,
    output: 1.8,
  },
} as const;

// Question generation is built in code from the verified brief, so the prompts
// stage has no provider call and no output allowance. The stage is retained so
// telemetry recorded before that correction still validates and prices.
export const AUDIT_CALL_LIMITS = {
  extract: { max_output_tokens: 4_000, max_tool_calls: 1 },
  prompts: { max_output_tokens: 0, max_tool_calls: 0 },
  observation: { max_output_tokens: 3_000, max_tool_calls: 1 },
  report: { max_output_tokens: 16_000, max_tool_calls: 0 },
} as const;

export const AUDIT_STAGE_CALL_LIMITS = {
  extract: 1,
  prompts: 0,
  observation: 10,
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

export function effectiveAuditCarryoverCostUsd(budget: AuditBudget) {
  return Math.max(budget.carryover_cost_usd, configuredAuditCarryoverCostUsd());
}

function tokenCost(
  inputTokens: number,
  cachedInputTokens: number,
  cacheWriteInputTokens: number,
  outputTokens: number,
) {
  const rate =
    inputTokens > LONG_CONTEXT_THRESHOLD ? PRICING.long : PRICING.short;
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

export function reserveAuditCall(input: {
  budget: AuditBudget;
  stage: AuditStage;
  request: unknown;
  requested_model: string;
  has_web_search: boolean;
}) {
  if (input.requested_model !== AUDIT_MODEL) {
    throw new AuditBudgetError(
      `The private cost guard supports only ${AUDIT_MODEL}; received ${input.requested_model}.`,
    );
  }
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
  const limits = AUDIT_CALL_LIMITS[input.stage];
  const inputTokenUpperBound = input.has_web_search
    ? LUNA_MAX_INPUT_TOKENS
    : requestInputTokenUpperBound(input.request);
  const reservedCost = roundedUsd(
    tokenCost(inputTokenUpperBound, 0, 0, limits.max_output_tokens) +
      (input.has_web_search ? WEB_SEARCH_USD_PER_CALL : 0),
  );
  const accounted =
    effectiveAuditCarryoverCostUsd(input.budget) +
    input.budget.calls.reduce(
      (total, call) => total + call.accounted_cost_usd,
      0,
    );

  if (accounted + reservedCost > input.budget.limit_usd) {
    throw new AuditBudgetError(
      `The next ${input.stage} call could exceed the USD ${input.budget.limit_usd.toFixed(2)} audit limit. USD ${accounted.toFixed(4)} is already accounted for and USD ${reservedCost.toFixed(4)} must be reserved.`,
    );
  }

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
  if (input.response.model !== AUDIT_MODEL) {
    throw new AuditBudgetError(
      `OpenAI returned ${input.response.model}, but the cost guard is pinned to ${AUDIT_MODEL}.`,
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
