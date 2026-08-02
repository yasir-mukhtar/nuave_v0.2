import {
  AUDIT_COST_LIMIT_USD,
  type AuditBudget,
  type AuditCallTelemetry,
} from "../types";
import { AUDIT_PRICING_VERSION } from "../telemetry";

export const fixtureBudget: AuditBudget = {
  limit_usd: AUDIT_COST_LIMIT_USD,
  carryover_cost_usd: 0,
  calls: [],
};

export function fixtureCallTelemetry(
  overrides: Partial<AuditCallTelemetry> = {},
): AuditCallTelemetry {
  return {
    stage: "report",
    attempt: 1,
    status: "completed",
    started_at: "2026-08-01T00:00:00.000Z",
    completed_at: "2026-08-01T00:00:01.000Z",
    latency_ms: 1_000,
    requested_model: "gpt-5.6-luna",
    returned_model: "gpt-5.6-luna",
    response_id: "resp_fixture",
    service_tier: "default",
    usage: {
      input_tokens: 1_000,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 500,
      reasoning_output_tokens: 100,
      total_tokens: 1_500,
    },
    web_search_calls: 0,
    accounted_cost_usd: 0.0008,
    cost_basis: "provider_usage",
    pricing_version: AUDIT_PRICING_VERSION,
    failure_reason: "",
    provider_status: "completed",
    incomplete_reason: "",
    output_text_present: true,
    refusal_present: false,
    ...overrides,
  };
}
