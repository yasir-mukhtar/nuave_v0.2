import { lockedQuestionPackForMethod } from "../audit/locked-question-pack";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import type { MailMessage, MailSender } from "./mail";
import {
  approveOrder,
  createOrder,
  type OrderEnvironment,
  type OrderMode,
} from "./store";
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

/** Make an `open` order. Live orders hold `limitUsd` against `dailyLimitUsd`. */
export async function makeOrder(
  db: SpendDb,
  options: {
    mode?: OrderMode;
    environment?: OrderEnvironment;
    email?: string;
    limitUsd?: number;
    dailyLimitUsd?: number;
    now?: Date;
  } = {},
) {
  const { result, orderId } = await createOrder(db, {
    email: options.email ?? "owner@example.com",
    businessName: "Kopi Nuave",
    website: "https://kopinuave.example/",
    mode: options.mode ?? "synthetic",
    environment: options.environment ?? "production",
    limitUsd: options.limitUsd ?? 2,
    dailyLimitUsd: options.dailyLimitUsd ?? 5,
    now: options.now ?? T0,
  });
  if (result !== "created") throw new Error("test order was not created");
  return orderId;
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
