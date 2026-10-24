import { describe, expect, it } from "vitest";
import {
  AUDIT_MODEL,
  AUDIT_STAGE_CALL_LIMITS,
  reserveAuditCall,
  serverOwnedAuditBudget,
} from "../audit/telemetry";
import { DATAFORSEO_CALL_MAX_USD } from "../discovery/dataforseo";
import { DISCOVERY_HARD_STOP_USD } from "../discovery/discover";
import { DEFAULT_ORDER_SPEND_LIMIT_USD } from "../orders/config";
import {
  MAX_ATTEMPTS_PER_QUESTION,
  MAX_DISCOVERY_RUNS,
  MAX_REPORT_ATTEMPTS,
} from "../orders/store";

// Spec 018 R-25, AC-15: the most one order can cost, summed from the maxima the
// code reserves before each paid call. The ledger also refuses any call past
// the order's USD 2.00 hold at run time; this test shows the design itself
// stays inside it. (runner-worst-case.test.ts is about database queries and
// outbound requests per run, not dollars.)

const QUESTIONS = 10;
const SOURCES = 2; // ChatGPT and Google
// The report prompt: the reading and ten ChatGPT answers. A long ChatGPT app
// answer is about 5,000 characters; 20,000 each is a generous upper bound.
const REPORT_PROMPT_CHARACTERS = 40_000 + QUESTIONS * 20_000;
// Each report attempt is the report call and, if needed, its language fix.
const CALLS_PER_REPORT_ATTEMPT = 2;

const reserve = (
  stage: "extract" | "report",
  webSearch: boolean,
  characters: number,
) =>
  reserveAuditCall({
    budget: serverOwnedAuditBudget(),
    stage,
    request: { input: "x".repeat(characters) },
    requested_model: AUDIT_MODEL,
    has_web_search: webSearch,
  });

function worstCase() {
  const discovery = MAX_DISCOVERY_RUNS * DISCOVERY_HARD_STOP_USD;
  const checks =
    QUESTIONS *
    SOURCES *
    MAX_ATTEMPTS_PER_QUESTION *
    Math.max(DATAFORSEO_CALL_MAX_USD.chatgpt, DATAFORSEO_CALL_MAX_USD.serp);
  // Today's reading: the website reading with web search, and its one retry.
  const reading =
    AUDIT_STAGE_CALL_LIMITS.extract * reserve("extract", true, 40_000);
  // The questions are built in code from the pool: no paid call.
  const questions = AUDIT_STAGE_CALL_LIMITS.prompts * 0;
  const report =
    MAX_REPORT_ATTEMPTS *
    CALLS_PER_REPORT_ATTEMPT *
    reserve("report", false, REPORT_PROMPT_CHARACTERS);
  return { discovery, checks, reading, questions, report };
}

describe("the most one order can cost (spec 018 R-25, AC-15)", () => {
  it("discovery is at most 2 runs × USD 0.12 and the checks 10 × 2 × 3 × USD 0.006", () => {
    const parts = worstCase();
    expect(parts.discovery).toBeCloseTo(0.24, 6);
    expect(parts.checks).toBeCloseTo(0.36, 6);
    expect(parts.questions).toBe(0);
  });

  it("with today's reading and report, the total stays at or under the USD 2.00 order hold", () => {
    const parts = worstCase();
    const total =
      parts.discovery +
      parts.checks +
      parts.reading +
      parts.questions +
      parts.report;
    // Measured when written: reading 0.8152, report 6 × 0.0672 = 0.4032,
    // total ≈ 1.82.
    expect(parts.reading).toBeCloseTo(0.8152, 3);
    expect(total).toBeLessThanOrEqual(2);
    expect(total).toBeLessThanOrEqual(DEFAULT_ORDER_SPEND_LIMIT_USD);
  });
});
