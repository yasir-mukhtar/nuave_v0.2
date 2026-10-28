import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUDIT_MODEL,
  reserveAuditCall,
  serverOwnedAuditBudget,
} from "../audit/telemetry";
import {
  createOrderWithHold,
  reserveOrderCall,
  SpendLedgerError,
  usdToUnits,
} from "../spending/spend-ledger";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";

// Spec 016 R-12: the peak hold of one order, from the real reservation code.
// These pin the numbers the PR reports: the largest single reservation is about
// USD 0.41 (a call with web search is reserved at the model's whole input
// window), and a normal order's actual cost is about USD 0.20 (the founder's
// figure; no live call was made here).

const reserve = (
  stage: "extract" | "observation" | "report",
  webSearch: boolean,
) =>
  reserveAuditCall({
    budget: serverOwnedAuditBudget(),
    stage,
    request: { input: "x".repeat(40_000) },
    requested_model: AUDIT_MODEL,
    has_web_search: webSearch,
  });

describe("what one order can hold (R-12)", () => {
  it("the largest single reservation is the website reading, about USD 0.41", () => {
    const extract = reserve("extract", true);
    const observation = reserve("observation", true);
    const report = reserve("report", false);
    expect(extract).toBeCloseTo(0.4076, 4);
    expect(observation).toBeCloseTo(0.3842, 4);
    expect(report).toBeLessThan(0.05);
    expect(Math.max(extract, observation, report)).toBe(extract);
  });

  it("peak hold: a normal order's cost (~0.20) plus the largest reservation (~0.41) is about USD 0.61, far inside the USD 2.00 limit", () => {
    const normalOrderCost = 0.2; // the founder's figure (spec 016 R-12)
    const peak = normalOrderCost + reserve("extract", true);
    expect(peak).toBeCloseTo(0.6076, 3);
    expect(peak).toBeLessThan(2);
  });

  describe("how many calls with unknown cost fit", () => {
    let dir: string;
    let d1: ReturnType<typeof openFileD1>;
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "nuave-limit-"));
      d1 = openFileD1(join(dir, "limit.sqlite"));
    });
    afterEach(() => {
      d1.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it("at USD 2.00, after ~0.20 of normal cost, four unknown-cost calls fit and the fifth is refused", async () => {
      const id = "a".repeat(32);
      await createOrderWithHold(
        d1.db,
        {
          id,
          orderNumber: "NV-AAAAAA",
          paymentKind: "test",
          email: "owner@example.com",
          businessName: "Toko",
          website: "https://example.com/",
          mode: "live",
          environment: "production",
          createdAt: new Date("2026-10-12T10:00:00Z"),
          expiresAt: new Date("2026-10-12T12:00:00Z"),
        },
        { limitUnits: usdToUnits(2), dailyLimitUnits: usdToUnits(5) },
      );
      d1.query(
        `UPDATE orders SET state = 'running' WHERE id = '${id}' RETURNING 1`,
      );
      const call = { orderId: id, provider: "openai", stage: "observation" };
      const settled = await reserveOrderCall(d1.db, { ...call, usd: 0.2 });
      await settled.settle(0.2);
      let unknown = 0;
      for (let i = 0; i < 10; i += 1) {
        try {
          await reserveOrderCall(d1.db, {
            ...call,
            usd: reserve("observation", true),
          });
          unknown += 1;
        } catch (error) {
          expect((error as SpendLedgerError).code).toBe("order_limit");
          break;
        }
      }
      expect(unknown).toBe(4);
    });
  });
});
