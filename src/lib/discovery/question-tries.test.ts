import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { directTenContextSchema } from "../audit/direct-ten-context-v2";
import type { GlmQuestionTransport } from "../intake/glm-local";
import {
  SMART_INTAKE_INPUT_VERSION,
  smartFingerprint,
} from "../intake/smart-intake-contract";
import { CONTEXT, makeOrder } from "../orders/orders.test-helper";
import { withOrderSpend } from "../spending/provider-spend";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { prepareSearchGroundedQuestions } from "./questions";

// 2026-10-26: replies cut off ("length") ended the request after one call and
// left no cause on record. A cut-off reply is now tried again, and the log
// record keeps the finish code but never the reply's text.

const place = { kind: "indonesia", code: 2360 } as const;
const context = directTenContextSchema.parse({
  ...CONTEXT,
  searchPlace: { value: place, origin: "owner" },
});
const pool = JSON.parse(
  readFileSync(
    join(__dirname, "../../../scripts/canary/fixtures/skin-clinic-pool.json"),
    "utf8",
  ),
);
const SECRET_QUESTION = "Klinik skin booster mana yang paling bagus?";

let db: ReturnType<typeof openFileD1>["db"];
beforeEach(() => {
  db = openFileD1(join(mkdtempSync(join(tmpdir(), "tries-")), "s.sqlite")).db;
  mocks.getCloudflareContext.mockReturnValue({ env: { SPEND_DB: db } });
  vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "5");
});

describe("question writer tries", () => {
  it("tries a cut-off reply again, and records only its finish code", async () => {
    let calls = 0;
    const transport: GlmQuestionTransport = {
      kind: "cheaper-inference",
      async call() {
        calls += 1;
        return {
          httpStatus: 200,
          body: {
            model: "glm-5.3-flash",
            choices: [
              {
                finish_reason: "length",
                message: {
                  role: "assistant",
                  content: `1. ${SECRET_QUESTION}`,
                },
              },
            ],
            usage: { cost: 0.001 },
          },
        };
      },
    };
    const record = {
      version: SMART_INTAKE_INPUT_VERSION,
      factVersion: 1,
      context,
    };
    const orderId = await makeOrder(db, { now: new Date() });
    const outcome = await withOrderSpend({ db, orderId }, () =>
      prepareSearchGroundedQuestions({
        intake: { ...record, fingerprint: smartFingerprint(record) },
        context,
        pool,
        place,
        transport,
      }),
    );

    expect(outcome.status).toBe("failed");
    expect(calls).toBe(3);
    expect(outcome.tries).toEqual([
      {
        mode: "grounded",
        status: "failed",
        reason: "incomplete",
        finish: "length",
      },
      {
        mode: "grounded",
        status: "failed",
        reason: "incomplete",
        finish: "length",
      },
      {
        mode: "fallback",
        status: "failed",
        reason: "incomplete",
        finish: "length",
      },
    ]);
    expect(JSON.stringify(outcome.tries)).not.toContain("skin booster");
  });
});
