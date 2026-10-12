import { APIError } from "openai";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AuditBudgetError } from "../audit/telemetry";
import { auditMode } from "../audit/deployment-gate";
import {
  createSpendLedger,
  SpendLedgerError,
  type SpendDb,
  type SpendLedger,
} from "./spend-ledger";

export const SPEND_DB_BINDING = "SPEND_DB";
export const DEFAULT_DAILY_SPEND_LIMIT_USD = 5;

/** Existing customer-facing "not available" copy (see /audit page). */
export const SPEND_UNAVAILABLE_MESSAGE = "Audit tidak tersedia saat ini.";

/** Refusal raised before a paid call is sent. It is an AuditBudgetError so the
 * existing route error handling shows the message without a provider call. */
export class SpendCapError extends AuditBudgetError {
  constructor(readonly reason: "limit_reached" | "unavailable") {
    super(SPEND_UNAVAILABLE_MESSAGE);
    this.name = "SpendCapError";
  }
}

/** Server-only daily limit. NUAVE_DAILY_SPEND_LIMIT_USD overrides the default;
 * an invalid value fails closed rather than falling back to a larger limit. */
export function dailySpendLimitUsd(): number {
  const raw = process.env.NUAVE_DAILY_SPEND_LIMIT_USD?.trim();
  if (!raw) return DEFAULT_DAILY_SPEND_LIMIT_USD;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0)
    throw new SpendCapError("unavailable");
  return value;
}

const ledgers = new WeakMap<object, SpendLedger>();

function bindingLedger(): SpendLedger {
  let db: unknown;
  try {
    db = (getCloudflareContext().env as unknown as Record<string, unknown>)[
      SPEND_DB_BINDING
    ];
  } catch {
    throw new SpendCapError("unavailable");
  }
  if (typeof db !== "object" || db === null || !("prepare" in db)) {
    throw new SpendCapError("unavailable");
  }
  let ledger = ledgers.get(db);
  if (!ledger) {
    ledger = createSpendLedger(db as SpendDb, {
      limitUsd: dailySpendLimitUsd(),
    });
    ledgers.set(db, ledger);
  }
  return ledger;
}

export type SpendReservation = { settle(actualUsd: number): Promise<void> };

/**
 * Call immediately before every paid provider request. Throws SpendCapError
 * (so the request is never sent) when the daily limit is reached or the ledger
 * is unavailable. Synthetic mode makes no paid calls and needs no ledger.
 * Live mode without the D1 binding fails closed.
 */
export async function reserveProviderSpend(input: {
  provider: string;
  stage: string;
  usd: number;
}): Promise<SpendReservation> {
  if (auditMode() !== "live") {
    return { settle: async () => {} };
  }
  try {
    const ledger = bindingLedger();
    return await ledger.reserve(input);
  } catch (error) {
    if (error instanceof SpendCapError) throw error;
    throw new SpendCapError(
      error instanceof SpendLedgerError ? error.code : "unavailable",
    );
  }
}

/**
 * An OpenAI SDK 4xx (400/401/403/404/429...) means the request was rejected
 * before any model ran, so it cost nothing: release the reservation. 5xx,
 * timeouts, network errors and aborts have unknown cost and stay held.
 */
export async function releaseIfRejectedUnrun(
  spend: SpendReservation,
  error: unknown,
) {
  if (
    error instanceof APIError &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408
  ) {
    await spend.settle(0);
  }
}
