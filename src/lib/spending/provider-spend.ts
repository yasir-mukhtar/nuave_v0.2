import { AsyncLocalStorage } from "node:async_hooks";
import { APIError } from "openai";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AuditBudgetError } from "../audit/telemetry";
import { auditMode } from "../audit/deployment-gate";
import {
  reserveOrderCall,
  SpendLedgerError,
  type SpendDb,
} from "./spend-ledger";

export const SPEND_DB_BINDING = "SPEND_DB";
export const DEFAULT_DAILY_SPEND_LIMIT_USD = 5;

/** Existing customer-facing "not available" copy (see /audit page). */
export const SPEND_UNAVAILABLE_MESSAGE = "Audit tidak tersedia saat ini.";

/** Refusal raised before a paid call is sent. It is an AuditBudgetError so the
 * existing route error handling shows the message without a provider call.
 * `order_limit`: the order's own hold would be passed. `order_refused`: no such
 * order, wrong state for the call, or the hold is already settled. */
export class SpendCapError extends AuditBudgetError {
  constructor(
    readonly reason:
      "limit_reached" | "unavailable" | "order_limit" | "order_refused",
  ) {
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

/** The D1 binding the ledger and orders live in, or null when the request has
 * no Worker context or no binding. */
export function spendDatabase(): SpendDb | null {
  try {
    const db = (
      getCloudflareContext().env as unknown as Record<string, unknown>
    )[SPEND_DB_BINDING];
    return typeof db === "object" &&
      db !== null &&
      "prepare" in db &&
      "batch" in db
      ? (db as SpendDb)
      : null;
  } catch {
    return null;
  }
}

/** The order a paid call runs for (R-03). Every paid call in live mode is
 * made inside `withOrderSpend`; outside it the call is refused unsent. */
type OrderSpendScope = { db: SpendDb; orderId: string; now?: () => Date };
const orderScope = new AsyncLocalStorage<OrderSpendScope>();

export function withOrderSpend<T>(
  scope: OrderSpendScope,
  run: () => Promise<T>,
): Promise<T> {
  return orderScope.run(scope, run);
}

export type SpendReservation = { settle(actualUsd: number): Promise<void> };

/**
 * Call immediately before every paid provider request. Throws SpendCapError
 * (so the request is never sent) when there is no order, the order's state does
 * not allow the call, its own limit would be passed, or the ledger is
 * unavailable. Synthetic mode makes no paid calls and needs no ledger.
 */
export async function reserveProviderSpend(input: {
  provider: string;
  stage: string;
  usd: number;
}): Promise<SpendReservation> {
  if (auditMode() !== "live") {
    return { settle: async () => {} };
  }
  const scope = orderScope.getStore();
  if (!scope) throw new SpendCapError("order_refused");
  try {
    return await reserveOrderCall(scope.db, {
      orderId: scope.orderId,
      now: scope.now,
      ...input,
    });
  } catch (error) {
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
