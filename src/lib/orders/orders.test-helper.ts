import { lockedQuestionPackForMethod } from "../audit/locked-question-pack";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import type { MailMessage, MailSender } from "./mail";
import {
  approveOrder,
  createOrder,
  ORDER_PAID_MS,
  type OrderEnvironment,
  type OrderMode,
} from "./store";
import { reserveOrderHold, usdToUnits } from "../spending/spend-ledger";
import type { SpendDb } from "../spending/spend-ledger";

/** Shared fixtures for the order tests (offline, sqlite D1 helper). */

export const T0 = new Date("2026-10-12T10:00:00.000Z");

export const CONTEXT: DirectTenAuditContext = {
  version: DIRECT_TEN_CONTEXT_VERSION,
  identity: {
    name: "Kopi Nuave",
    source: "https://kopinuave.example/",
    sourceOrigin: "owner",
    aliases: ["Nuave Coffee"],
    origin: "owner",
  },
  focus: { value: { kind: "brand" }, origin: "nuave" },
  category: { value: "kedai kopi", origin: "website" },
  offerings: { value: ["kopi"], origin: "website" },
  serviceChannels: { value: ["on_premise"], origin: "website" },
  market: {
    value: { reach: "sekitar", areas: ["Jakarta"] },
    origin: "website",
  },
  comparators: { value: { mode: "unknown" }, origin: "nuave" },
};

export const WIRE_PROMPTS = Array.from({ length: 10 }, (_, index) => ({
  prompt_id: `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
  question: `Apa pilihan coffee shop di Jakarta untuk kebutuhan ${index + 1}?`,
  review_status: "needs_human_review" as const,
}));

export const ORIGINALS = WIRE_PROMPTS.map((prompt) => prompt.question);

export function intakeJson(): string {
  return JSON.stringify({
    context: CONTEXT,
    prompts: lockedQuestionPackForMethod({
      prompts: WIRE_PROMPTS,
      brief: CONTEXT,
      questionMethod: "direct-ten",
    }).prompts,
    originals: ORIGINALS,
  });
}

/** How a test order is paid for (spec 017 R-23):
 *
 * - `test` (the default): a founder test pass made by the real creation code.
 *   It behaves like an S3 order: its hold is reserved at creation (live), it
 *   ends after 2 hours unstarted, and it may run. Most S3 tests use this.
 * - `unpaid`: the customer's order before payment; holds nothing, may not run.
 * - `paid`: an order paid through Midtrans. The columns are set directly (no
 *   fake Midtrans is needed): kind `midtrans`, the paid time, an end time 7 days
 *   later (R-11), and, live, its hold on the day of payment even if the cap is
 *   full.
 * - `simulated`: the same as `paid`, with the synthetic-mode simulated kind.
 * - `legacy`: an order made by S3 code: no payment kind, hold at creation.
 */
export type TestOrderPayment =
  "test" | "unpaid" | "paid" | "simulated" | "legacy";

/** Make an `open` order. Live orders that hold (test, paid, simulated, legacy)
 * hold `limitUsd` against `dailyLimitUsd`. */
export async function makeOrder(
  db: SpendDb,
  options: {
    mode?: OrderMode;
    environment?: OrderEnvironment;
    email?: string;
    limitUsd?: number;
    dailyLimitUsd?: number;
    now?: Date;
    payment?: TestOrderPayment;
    previousOrderId?: unknown;
  } = {},
) {
  const payment = options.payment ?? "test";
  const mode = options.mode ?? "synthetic";
  const now = options.now ?? T0;
  const limitUsd = options.limitUsd ?? 2;
  const dailyLimitUsd = options.dailyLimitUsd ?? 5;
  const { result, orderId } = await createOrder(db, {
    email: options.email ?? "owner@example.com",
    businessName: "Kopi Nuave",
    website: "https://kopinuave.example/",
    mode,
    environment: options.environment ?? "production",
    // A paid order is made unpaid (holding nothing) and then paid below.
    paymentKind:
      payment === "unpaid" || payment === "paid" || payment === "simulated"
        ? "unpaid"
        : "test",
    limitUsd,
    dailyLimitUsd,
    previousOrderId: options.previousOrderId,
    now,
  });
  if (result !== "created") throw new Error("test order was not created");
  if (payment === "legacy") {
    await db
      .prepare("UPDATE orders SET payment_kind = NULL WHERE id = ?1")
      .bind(orderId)
      .run();
    await db
      .prepare("UPDATE provider_spend SET test = 0 WHERE order_id = ?1")
      .bind(orderId)
      .run();
  }
  if (payment === "paid" || payment === "simulated") {
    await markPaidForTest(db, orderId, {
      kind: payment === "paid" ? "midtrans" : "simulated",
      mode,
      limitUsd,
      now,
    });
  }
  return orderId;
}

/** A paid order, for tests that need one: the same as
 * `makeOrder(db, { payment: "paid" })`. */
export const makePaidOrder = (
  db: SpendDb,
  options: Parameters<typeof makeOrder>[1] = {},
) => makeOrder(db, { ...options, payment: "paid" });

/** Set the paid columns directly (no Midtrans) and, for a live order, reserve
 * its hold on the UTC day of `now` with no cap check, as R-11 does. */
export async function markPaidForTest(
  db: SpendDb,
  orderId: string,
  options: {
    kind?: "midtrans" | "simulated";
    mode?: OrderMode;
    limitUsd?: number;
    now?: Date;
  } = {},
) {
  const now = options.now ?? T0;
  await db
    .prepare(
      `UPDATE orders SET payment_kind = ?2, paid_at = ?3, expires_at = ?4
       WHERE id = ?1`,
    )
    .bind(
      orderId,
      options.kind ?? "midtrans",
      now.toISOString(),
      new Date(now.getTime() + ORDER_PAID_MS).toISOString(),
    )
    .run();
  if ((options.mode ?? "synthetic") === "live") {
    await reserveOrderHold(db, {
      orderId,
      now,
      limitUnits: usdToUnits(options.limitUsd ?? 2),
      dailyLimitUnits: null,
      test: false,
    });
  }
}

/** Approve the ten questions: the order becomes `running` (R-17). */
export async function approve(
  db: SpendDb,
  orderId: string,
  options: {
    mode?: OrderMode;
    environment?: OrderEnvironment;
    now?: Date;
  } = {},
) {
  const approved = await approveOrder(db, {
    orderId,
    environment: options.environment ?? "production",
    mode: options.mode ?? "synthetic",
    intakeJson: intakeJson(),
    businessName: CONTEXT.identity.name,
    promptIds: WIRE_PROMPTS.map((prompt) => prompt.prompt_id),
    now: options.now ?? T0,
  });
  if (!approved) throw new Error("test order was not approved");
}

/** Spec 018: a context confirmed with a search place (Surabaya). */
export const TWO_SOURCE_CONTEXT: DirectTenAuditContext = {
  ...CONTEXT,
  identity: { ...CONTEXT.identity, aliases: ["Nuave Coffee"] },
  searchPlace: {
    value: { kind: "place", code: 1007715, display: "Surabaya" },
    origin: "owner",
  },
};

export const TWO_SOURCE_PROMPTS = Array.from({ length: 10 }, (_, index) => ({
  prompt_id: `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
  question: `Coffee shop terbaik di Surabaya untuk kebutuhan ${index + 1}?`,
  review_status: "needs_human_review" as const,
}));

/** The server-owned origins saved at approval (R-07): a real search for the
 * first question, a phrased topic for the rest. */
export const TWO_SOURCE_ORIGINS = TWO_SOURCE_PROMPTS.map((_, index) =>
  index === 0
    ? {
        label: "dicari_di_google" as const,
        topic: "coffee shop surabaya",
        volume: 2_400,
        dataMonth: "2026-09",
        core: ["coffee", "shop"],
      }
    : {
        label: "disusun_dari_topik" as const,
        topic: "coffee shop",
        volume: 12_100 - index * 100,
        dataMonth: "2026-09",
        core: ["coffee", "shop"],
      },
);

export function twoSourceIntakeJson(
  options: {
    origins?: unknown[];
    questionMode?: "grounded" | "fallback";
    category?: string;
  } = {},
): string {
  return JSON.stringify({
    context: options.category
      ? {
          ...TWO_SOURCE_CONTEXT,
          category: { value: options.category, origin: "owner" },
        }
      : TWO_SOURCE_CONTEXT,
    prompts: lockedQuestionPackForMethod({
      prompts: TWO_SOURCE_PROMPTS,
      brief: TWO_SOURCE_CONTEXT,
      questionMethod: "direct-ten",
    }).prompts,
    originals: TWO_SOURCE_PROMPTS.map((prompt) => prompt.question),
    question_origins: options.origins ?? TWO_SOURCE_ORIGINS,
    ...(options.questionMode ? { question_mode: options.questionMode } : {}),
    checks: "chatgpt-google-v1",
  });
}

/** Approve a Spec 018 order: both sources, Google from Surabaya. */
export async function approveTwoSource(
  db: SpendDb,
  orderId: string,
  options: {
    mode?: OrderMode;
    now?: Date;
    origins?: unknown[];
    questionMode?: "grounded" | "fallback";
    category?: string;
  } = {},
) {
  const approved = await approveOrder(db, {
    orderId,
    environment: "production",
    mode: options.mode ?? "synthetic",
    intakeJson: twoSourceIntakeJson({
      origins: options.origins,
      questionMode: options.questionMode,
      category: options.category,
    }),
    businessName: TWO_SOURCE_CONTEXT.identity.name,
    promptIds: TWO_SOURCE_PROMPTS.map((prompt) => prompt.prompt_id),
    now: options.now ?? T0,
    twoSource: true,
  });
  if (!approved) throw new Error("test order was not approved");
}

export function mailbox(
  behaviour: (message: MailMessage, call: number) => boolean = () => true,
) {
  const sent: MailMessage[] = [];
  let calls = 0;
  const sender: MailSender = async (message) => {
    calls += 1;
    sent.push(message);
    return behaviour(message, calls)
      ? { accepted: true, messageId: `m${calls}` }
      : { accepted: false };
  };
  return { sender, sent };
}

/** The private-link secret inside a ready email. */
export function secretIn(message: MailMessage): string {
  const match = /\/r#([A-Za-z0-9_-]+)/.exec(message.text);
  if (!match) throw new Error("no link in the email");
  return match[1];
}
