import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { directTenContextSchema } from "../audit/direct-ten-context-v2";
import { INDONESIAN_QUESTION_GLM_MODEL } from "../audit/questions-id-glm";
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

/** Runs the writer with every reply ending as `finish` with `content`. */
async function write(finish: string, content: string) {
  let calls = 0;
  const transport: GlmQuestionTransport = {
    kind: "cheaper-inference",
    async call() {
      calls += 1;
      return {
        httpStatus: 200,
        body: {
          id: `chatcmpl-test-${calls}`,
          model: INDONESIAN_QUESTION_GLM_MODEL,
          choices: [
            { finish_reason: finish, message: { role: "assistant", content } },
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
  return { outcome, calls };
}

describe("question writer tries", () => {
  it("tries a cut-off reply again, and records only its finish code", async () => {
    const { outcome, calls } = await write("length", `1. ${SECRET_QUESTION}`);
    expect(outcome.status).toBe("failed");
    expect(calls).toBe(3);
    const cutOff = { status: "failed", reason: "incomplete", finish: "length" };
    expect(outcome.tries).toEqual([
      { mode: "grounded", ...cutOff },
      { mode: "grounded", ...cutOff },
      { mode: "fallback", ...cutOff },
    ]);
  });

  it("never records a reply's text, even when the failure quotes it", async () => {
    const { outcome } = await write(
      "stop",
      [
        "## 1. Market interpretation",
        "",
        "Klinik kecantikan.",
        "",
        "## 2. Candidate questions",
        "",
        SECRET_QUESTION,
        "",
        "## 3. Self-critique",
        "",
        "Tidak ada.",
      ].join("\n"),
    );
    // The failure itself quotes the line, so the test would see a leak.
    expect(JSON.stringify(outcome)).toContain("skin booster");
    expect(outcome.tries!.length).toBeGreaterThan(0);
    expect(JSON.stringify(outcome.tries)).not.toContain("skin booster");
  });

  // 2026-10-29 (NV-8XAPUF): three failed checks left only
  // "validation_failed", so the cause needed the order's saved data.
  it("records which checks failed, never the questions", async () => {
    const { outcome } = await write(
      "stop",
      [
        "## 1. Market interpretation",
        "",
        "Klinik kecantikan.",
        "",
        "## 2. Candidate questions",
        "",
        ...Array.from(
          { length: 10 },
          (_, i) => `${i + 1}. Klinik skin booster nomor ${i + 1} di Jakarta?`,
        ),
        "",
        "## 3. Self-critique",
        "",
        "Tidak ada.",
      ].join("\n"),
    );
    expect(outcome.status).toBe("validation_failed");
    expect(outcome.tries).toHaveLength(3);
    for (const entry of outcome.tries!) {
      expect(entry.status).toBe("validation_failed");
      expect(entry.checks).toContain(
        "Pertanyaan ini menyebut kota. Hapus nama kotanya.",
      );
    }
    expect(JSON.stringify(outcome.tries)).not.toContain("skin booster");
  });
});
