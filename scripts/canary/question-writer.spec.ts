/**
 * LIVE canary for the question writer (GLM-5.3-flash via Cheaper Inference).
 *
 * On 2026-10-26 every paid order with a search city failed to get its ten
 * questions, for reasons no offline test could see: the provider's hosts
 * started thinking longer and ran out of room (finish_reason "length"), and
 * the provider moved the billed cost to a field Nuave did not read, so each
 * call's $0.05 hold was never settled. This runs the real grounded writer
 * once, against today's provider, and fails when either drifts back:
 *
 * - the writer returns ten questions;
 * - every call ends with finish_reason "stop", using less than half of
 *   INDONESIAN_QUESTION_GLM_MAX_OUTPUT_TOKENS (an early warning, well before
 *   a cut-off);
 * - every call's billed cost is readable, and no spend hold is left open.
 *
 * Costs about $0.01 a run. Needs CHEAPERINFERENCE_API_KEY. Run with:
 *
 *   npm run test:canary:questions
 */
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { CONTEXT, makeOrder } from "../../src/lib/orders/orders.test-helper";
import { openFileD1 } from "../../src/lib/spending/sqlite-d1.test-helper";
import { withOrderSpend } from "../../src/lib/spending/provider-spend";
import {
  directTenContextSchema,
  type DirectTenAuditContext,
} from "../../src/lib/audit/direct-ten-context-v2";
import {
  cheaperInferenceBilledCostUsd,
  INDONESIAN_QUESTION_GLM_MAX_OUTPUT_TOKENS,
} from "../../src/lib/audit/questions-id-glm";
import {
  liveGlmTransport,
  type GlmQuestionTransport,
} from "../../src/lib/intake/glm-local";
import {
  SMART_INTAKE_INPUT_VERSION,
  smartFingerprint,
} from "../../src/lib/intake/smart-intake-contract";
import { prepareSearchGroundedQuestions } from "../../src/lib/discovery/questions";

const place = { kind: "indonesia", code: 2360 } as const;

// A clinic whose name holds a generic word ("Skin") that is also in its
// services: the case that once blocked every question about skin boosters.
const context = directTenContextSchema.parse({
  ...CONTEXT,
  identity: {
    name: "Sozo Skin Clinic",
    source: "https://sozoskinclinic.com/",
    sourceOrigin: "owner",
    aliases: ["SOZO"],
    origin: "owner",
  },
  category: { value: "klinik kecantikan", origin: "website" },
  offerings: {
    value: [
      "Skin Booster",
      "Botox Treatment",
      "Laser Treatment",
      "Facial Treatment",
    ],
    origin: "website",
  },
  market: { value: { reach: "seluruh", areas: [] }, origin: "website" },
  customerNeeds: {
    value: ["Masalah kulit dan wajah", "Jerawat dan bekas luka"],
    origin: "website",
  },
  searchPlace: { value: place, origin: "owner" },
} satisfies DirectTenAuditContext);

// The search pool saved for that clinic on 2026-10-26 (public keyword
// volumes only).
const pool = JSON.parse(
  readFileSync(join(__dirname, "fixtures/skin-clinic-pool.json"), "utf8"),
);

it.skipIf(!process.env.CHEAPERINFERENCE_API_KEY)(
  "the live question writer finishes with room to spare, and its cost is settled",
  async () => {
    const d1 = openFileD1(
      join(mkdtempSync(join(tmpdir(), "canary-")), "spend.sqlite"),
    );
    mocks.getCloudflareContext.mockReturnValue({ env: { SPEND_DB: d1.db } });
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "5");
    const orderId = await makeOrder(d1.db, { now: new Date() });

    const record = {
      version: SMART_INTAKE_INPUT_VERSION,
      factVersion: 1,
      context,
    };
    const intake = { ...record, fingerprint: smartFingerprint(record) };

    const calls: {
      finish: unknown;
      completionTokens: number;
      cost: number | null;
    }[] = [];
    const transport: GlmQuestionTransport = {
      kind: "cheaper-inference",
      async call(body) {
        const envelope = await liveGlmTransport.call(body);
        const reply = envelope.body as {
          choices?: { finish_reason?: unknown }[];
          usage?: { completion_tokens?: number };
        } | null;
        calls.push({
          finish: reply?.choices?.[0]?.finish_reason,
          completionTokens: reply?.usage?.completion_tokens ?? Infinity,
          cost: cheaperInferenceBilledCostUsd(envelope.body),
        });
        return envelope;
      },
    };

    const outcome = await withOrderSpend({ db: d1.db, orderId }, () =>
      prepareSearchGroundedQuestions({
        intake,
        context,
        pool,
        place,
        transport,
      }),
    );
    console.info(
      JSON.stringify({ status: outcome.status, tries: outcome.tries, calls }),
    );

    expect(outcome.status).toBe("ok");
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.finish).toBe("stop");
      expect(call.completionTokens).toBeLessThan(
        INDONESIAN_QUESTION_GLM_MAX_OUTPUT_TOKENS / 2,
      );
      expect(call.cost).not.toBeNull();
    }
    const open = await d1.db
      .prepare(
        "SELECT COUNT(*) AS n FROM provider_spend WHERE status = 'reserved'",
      )
      .bind()
      .first<{ n: number }>();
    expect(open?.n).toBe(0);
  },
  600_000,
);
