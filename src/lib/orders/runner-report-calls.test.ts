import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));
// Each step asks for the report and then its language fix (two provider calls)
// and fails with a provider error, so the order is retried.
vi.mock("../audit/report-pipeline", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../audit/report-pipeline")>()),
  assertReportGenerationGate: () => {},
  createValidatedAuditReport: async (
    input: unknown,
    generate: (...args: unknown[]) => Promise<unknown>,
  ) => {
    await generate(input);
    await generate(input, { draft: {}, violations: [] });
    const { AuditCallExecutionError } = await import("../audit/telemetry");
    throw new AuditCallExecutionError("upstream", []);
  },
}));

import { executeSyntheticLocalObservation } from "../audit/local-direct-ten-audit";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { runOrders, type RunnerDeps } from "./runner";
import { approve, makeOrder, T0 } from "./orders.test-helper";

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let clock: Date;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-calls-"));
  d1 = openFileD1(join(dir, "calls.sqlite"));
  clock = T0;
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

// Spec 016 R-19: an order makes at most three report provider calls in all. A
// language fix is a report call, counted in D1 before it is sent.
describe("the report call ceiling counts calls, not steps", () => {
  it("two failing steps that each ask for a language fix make three report calls in all, never a fourth, and the order fails", async () => {
    const calls = { report: 0 };
    const deps: RunnerDeps = {
      db: d1.db,
      environment: "production",
      mode: "synthetic",
      siteOrigin: "https://v2.nuave.test",
      now: () => clock,
      execute: async (input) => executeSyntheticLocalObservation(input),
      generateReport: (async () => {
        calls.report += 1;
        return {};
      }) as unknown as RunnerDeps["generateReport"],
      sender: async () => ({ accepted: true }),
      sleep: async () => {},
    };
    const id = await makeOrder(d1.db, { now: clock });
    await approve(d1.db, id, { now: clock });
    const row = () =>
      d1.query<{
        state: string;
        report_attempts: number;
        failure_code: string;
      }>(
        `SELECT state, report_attempts, failure_code FROM orders WHERE id = '${id}'`,
      )[0]!;
    for (let i = 0; i < 25 && row().state !== "failed"; i += 1) {
      await runOrders(deps);
      clock = new Date(clock.getTime() + 60_000);
    }
    expect(row().state).toBe("failed");
    expect(row().failure_code).toBe("report_limit_exhausted");
    expect(row().report_attempts).toBe(3);
    expect(calls.report).toBe(3); // step 1: report + fix; step 2: report only
    // Later runs never call the provider again.
    for (let i = 0; i < 3; i += 1) {
      await runOrders(deps);
      clock = new Date(clock.getTime() + 60_000);
    }
    expect(calls.report).toBe(3);
  });
});
