import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUDIT_MODEL,
  AUDIT_STAGE_CALL_LIMITS,
  reserveAuditCall,
  serverOwnedAuditBudget,
} from "../audit/telemetry";
import { DATAFORSEO_CALL_MAX_USD } from "../discovery/dataforseo";
import { DISCOVERY_HARD_STOP_USD } from "../discovery/discover";
import { DEFAULT_ORDER_SPEND_LIMIT_USD } from "../orders/config";
import { makeOrder } from "../orders/orders.test-helper";
import {
  MAX_ATTEMPTS_PER_QUESTION,
  MAX_REPORT_ATTEMPTS,
} from "../orders/store";
import { openFileD1 } from "./sqlite-d1.test-helper";
import {
  ORDER_STAGE_CAP_USD,
  reserveOrderCall,
  SpendLedgerError,
} from "./spend-ledger";

// Spec 018 R-25, AC-15: the most one order can cost, summed from the maxima the
// code reserves before each paid call. The ledger also refuses any call past
// the order's USD 2.00 hold at run time; this test shows the design itself
// stays inside it. (runner-worst-case.test.ts is about database queries and
// outbound requests per run, not dollars.)

const QUESTIONS = 10;
const SOURCES = 2; // ChatGPT and Google
// The report prompt: the reading, ten ChatGPT answers and the code-built
// Google facts (R-28). A long ChatGPT app answer is about 5,000 characters;
// 20,000 each is a generous upper bound. The Google facts are at most ten
// domains and a few flags per question.
const REPORT_PROMPT_CHARACTERS =
  40_000 + QUESTIONS * 20_000 + QUESTIONS * 1_200;
// Each report attempt is the report call and, if needed, its one revision
// (language or source wording).
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
  // R-09: one ceiling per order, shared by both discovery runs and counting
  // every attempt, retries included; the ledger enforces it.
  const discovery = ORDER_STAGE_CAP_USD.discovery!;
  const checks =
    QUESTIONS *
    SOURCES *
    MAX_ATTEMPTS_PER_QUESTION *
    Math.max(DATAFORSEO_CALL_MAX_USD.chatgpt, DATAFORSEO_CALL_MAX_USD.serp);
  // Today's reading: the website reading with web search, and its one retry.
  const reading =
    AUDIT_STAGE_CALL_LIMITS.extract * reserve("extract", true, 40_000);
  // Question writing is a paid Cheaper Inference call (USD 0.05 reserved
  // each; up to three per request: grounded, grounded again, fallback). The
  // ledger's per-order ceiling bounds every request together.
  const questions = ORDER_STAGE_CAP_USD.questions!;
  const report =
    MAX_REPORT_ATTEMPTS *
    CALLS_PER_REPORT_ATTEMPT *
    reserve("report", false, REPORT_PROMPT_CHARACTERS);
  return { discovery, checks, reading, questions, report };
}

describe("the most one order can cost (spec 018 R-25, AC-15)", () => {
  it("discovery is one USD 0.12 ceiling per order, questions USD 0.25, the checks 10 × 2 × 3 × USD 0.006", () => {
    const parts = worstCase();
    expect(DISCOVERY_HARD_STOP_USD).toBe(ORDER_STAGE_CAP_USD.discovery);
    expect(parts.discovery).toBeCloseTo(0.12, 6);
    expect(parts.questions).toBeCloseTo(0.25, 6);
    expect(parts.checks).toBeCloseTo(0.36, 6);
  });

  it("with today's reading and report, the total stays at or under the USD 2.00 order hold", () => {
    const parts = worstCase();
    const total =
      parts.discovery +
      parts.checks +
      parts.reading +
      parts.questions +
      parts.report;
    // Measured when written: reading 0.8152, report 6 × ≈0.069, total ≈ 1.96.
    expect(parts.reading).toBeCloseTo(0.8152, 3);
    expect(total).toBeLessThanOrEqual(2);
    expect(total).toBeLessThanOrEqual(DEFAULT_ORDER_SPEND_LIMIT_USD);
  });
});

describe("the ledger enforces the per-order stage ceilings (R-09, R-25)", () => {
  let dir: string;
  let d1: ReturnType<typeof openFileD1>;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nuave-stage-cap-"));
    d1 = openFileD1(join(dir, "orders.sqlite"));
  });
  afterEach(() => {
    d1.close();
    rmSync(dir, { recursive: true, force: true });
  });

  async function reserveUntilRefused(
    orderId: string,
    stage: string,
    usd: number,
  ) {
    let reserved = 0;
    for (let call = 0; call < 100; call += 1) {
      try {
        await reserveOrderCall(d1.db, {
          orderId,
          provider: "test",
          stage,
          usd,
          now: () => new Date(),
        });
        reserved += usd;
      } catch (error) {
        expect(error).toBeInstanceOf(SpendLedgerError);
        expect((error as SpendLedgerError).code).toBe("order_limit");
        return reserved;
      }
    }
    throw new Error("never refused");
  }

  it("discovery attempts stop at USD 0.12 for the whole order, retries and second runs included", async () => {
    const orderId = await makeOrder(d1.db, { mode: "live", now: new Date() });
    const reserved = await reserveUntilRefused(
      orderId,
      "discovery",
      DATAFORSEO_CALL_MAX_USD.keywordSuggestions,
    );
    expect(reserved).toBeLessThanOrEqual(0.12 + 1e-9);
    expect(reserved).toBeGreaterThan(0.12 - 0.015 - 1e-9);
  });

  it("question writing stops at USD 0.25 for the whole order: five calls of USD 0.05", async () => {
    const orderId = await makeOrder(d1.db, { mode: "live", now: new Date() });
    const reserved = await reserveUntilRefused(orderId, "questions", 0.05);
    expect(reserved).toBeCloseTo(0.25, 6);
  });

  it("a stage without a ceiling is limited only by the order hold", async () => {
    const orderId = await makeOrder(d1.db, {
      mode: "live",
      now: new Date(),
      limitUsd: 0.5,
    });
    const reserved = await reserveUntilRefused(orderId, "extract", 0.1);
    expect(reserved).toBeCloseTo(0.5, 6);
  });
});
