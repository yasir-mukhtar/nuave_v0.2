import { ORDER_PAID_MS, getOrder, type OrderRow } from "../orders/store";
import {
  endOrder,
  orderHoldStatement,
  type SpendDb,
} from "../spending/spend-ledger";
import {
  attemptById,
  attemptByMidtransOrderId,
  type AttemptRow,
} from "./attempts";
import {
  ORDER_CURRENCY,
  ORDER_GROSS_AMOUNT_TEXT,
  type MidtransStatus,
} from "./midtrans";
import { noticeStatement, utcDayOf } from "./notices";

/**
 * Apply one Midtrans status answer (spec 017 R-09, R-11, R-12, R-15). One
 * function for the notification, the status recovery and the cron, so the same
 * answer always has the same effect and a repeat changes nothing.
 */

export type ApplyDeps = {
  db: SpendDb;
  now: Date;
  /** `NUAVE_ORDER_SPEND_LIMIT_USD` in units: the hold a paid order reserves. */
  limitUnits: number;
  dailyLimitUnits: number;
};

export type ApplyResult =
  /** No stored attempt has this `order_id`: nothing changes (R-08). */
  | "unknown_order"
  /** The order is now paid (R-11). */
  | "paid"
  /** Already applied: nothing changed. */
  | "duplicate"
  /** A settled transaction that cannot be applied (R-12). */
  | "needs_refund"
  /** A refund, partial refund or chargeback was recorded (R-15). */
  | "refund_recorded"
  /** Any other status: recorded only. */
  | "recorded";

/** Final answers that never took money. A `refund` or `chargeback` answer counts
 * too: the money went back, so the try holds nothing (technical choice, R-06). */
export const UNPAID_WORDS = ["expire", "cancel", "deny", "failure"] as const;
/** One place to change how `partial_chargeback` is read (the spec is silent; the
 * founder is being asked). For now it is a partial refund: recorded, a founder
 * notice of kind `partial_chargeback`, nothing else. It never ends the order. */
const PARTIAL_CHARGEBACK_AS = "partial_refund" as const;
const REFUND_WORDS: Record<
  string,
  "refunded" | "partial_refund" | "chargeback"
> = {
  refund: "refunded",
  partial_refund: "partial_refund",
  chargeback: "chargeback",
  partial_chargeback: PARTIAL_CHARGEBACK_AS,
};

/** R-06/R-09: has the transaction been settled (money taken)? `settlement`, or
 * `capture` with `fraud_status` `accept`. */
function settledWord(status: MidtransStatus): boolean {
  return (
    status.transaction_status === "settlement" ||
    (status.transaction_status === "capture" &&
      status.fraud_status === "accept")
  );
}

/** R-09: settled, a `fraud_status` (when present) of `accept`, `99000.00`, IDR. */
export function meetsPaidRule(status: MidtransStatus): boolean {
  return (
    settledWord(status) &&
    (status.fraud_status === null || status.fraud_status === "accept") &&
    status.gross_amount === ORDER_GROSS_AMOUNT_TEXT &&
    status.currency === ORDER_CURRENCY
  );
}

export function isFinalNotPaid(word: string): boolean {
  return (
    (UNPAID_WORDS as readonly string[]).includes(word) || word in REFUND_WORDS
  );
}

export async function applyStatus(
  deps: ApplyDeps,
  status: MidtransStatus,
): Promise<ApplyResult> {
  const { db, now } = deps;
  const attempt = await attemptByMidtransOrderId(db, status.order_id);
  if (!attempt) return "unknown_order";
  const stamp = now.toISOString();
  const refundState = REFUND_WORDS[status.transaction_status];
  const settled = settledWord(status);
  await db
    .prepare(
      `INSERT INTO payment_transactions
         (transaction_id, attempt_id, midtrans_status, fraud_status, payment_method,
          amount, currency, outcome, first_seen_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
       ON CONFLICT(transaction_id) DO UPDATE SET
         midtrans_status = excluded.midtrans_status,
         fraud_status = excluded.fraud_status,
         payment_method = COALESCE(excluded.payment_method, payment_method),
         amount = excluded.amount, currency = excluded.currency,
         outcome = CASE WHEN payment_transactions.outcome IN ('pending', 'not_settled')
                        THEN excluded.outcome ELSE payment_transactions.outcome END,
         updated_at = excluded.updated_at
       WHERE payment_transactions.midtrans_status != excluded.midtrans_status
          OR payment_transactions.fraud_status IS NOT excluded.fraud_status
          OR payment_transactions.amount IS NOT excluded.amount
          OR payment_transactions.currency IS NOT excluded.currency`,
    )
    .bind(
      status.transaction_id,
      attempt.id,
      status.transaction_status,
      status.fraud_status,
      status.payment_type,
      status.gross_amount,
      status.currency,
      isFinalNotPaid(status.transaction_status) ? "not_settled" : "pending",
      stamp,
    )
    .run();
  const transaction = await db
    .prepare(
      "SELECT outcome, refund_state FROM payment_transactions WHERE transaction_id = ?1",
    )
    .bind(status.transaction_id)
    .first<{ outcome: string; refund_state: string }>();
  if (!transaction) throw new Error("transaction row missing");

  if (refundState) {
    return applyRefund(
      deps,
      status.transaction_id,
      refundState,
      "midtrans",
      status.transaction_status === "partial_chargeback"
        ? "partial_chargeback"
        : undefined,
    );
  }
  if (settled) {
    if (
      transaction.outcome === "paid" ||
      transaction.outcome === "needs_refund"
    ) {
      return "duplicate";
    }
    return applySettled(deps, attempt, status);
  }
  // Not settled (pending, challenge, deny, cancel, expire, failure): the status
  // word only changes the message; the attempt stays open (R-06).
  await touchAttempt(deps, attempt.id, status);
  return "recorded";
}

/** Keep the last status word, method, amount and currency on the attempt. */
async function touchAttempt(
  deps: ApplyDeps,
  attemptId: string,
  status: MidtransStatus,
): Promise<void> {
  await deps.db
    .prepare(
      `UPDATE payment_attempts
       SET last_status = ?2, payment_method = COALESCE(?3, payment_method),
           amount = COALESCE(?4, amount), currency = COALESCE(?5, currency),
           updated_at = ?6
       WHERE id = ?1 AND status != 'paid'`,
    )
    .bind(
      attemptId,
      status.transaction_status,
      status.payment_type,
      status.gross_amount,
      status.currency,
      deps.now.toISOString(),
    )
    .run();
}

async function applySettled(
  deps: ApplyDeps,
  attempt: AttemptRow,
  status: MidtransStatus,
): Promise<ApplyResult> {
  const { db, now } = deps;
  const stamp = now.toISOString();
  const order = await getOrder(db, attempt.order_id);
  if (order && meetsPaidRule(status)) {
    // R-11: ONE write marks the order paid. It needs an unpaid, unreplaced,
    // live order that is open or has expired (a late payment revives it). The
    // hold goes on the UTC day of payment even if the cap is now full, and is
    // written only if this write changed the order.
    const paidEnd = new Date(now.getTime() + ORDER_PAID_MS).toISOString();
    const results = await db.batch([
      db
        .prepare(
          `UPDATE orders
           SET payment_kind = 'midtrans', paid_at = ?2, paid_attempt_id = ?3,
               paid_transaction_id = ?4, state = 'open', expires_at = ?5,
               ended_at = NULL, failure_code = NULL
           WHERE id = ?1 AND payment_kind = 'unpaid' AND replaced_by IS NULL
             AND paid_at IS NULL AND mode = 'live'
             AND state IN ('open', 'expired')`,
        )
        .bind(order.id, stamp, attempt.id, status.transaction_id, paidEnd),
      orderHoldStatement(db, {
        orderId: order.id,
        now,
        limitUnits: deps.limitUnits,
        dailyLimitUnits: null,
        test: false,
        paidTransactionId: status.transaction_id,
      }),
      db
        .prepare(
          `UPDATE payment_attempts
           SET status = 'paid', last_status = ?4, payment_method = COALESCE(?5, payment_method),
               amount = ?6, currency = ?7, final_at = COALESCE(final_at, ?3), updated_at = ?3
           WHERE id = ?1 AND EXISTS (SELECT 1 FROM orders
                                     WHERE id = ?2 AND paid_transaction_id = ?8)`,
        )
        .bind(
          attempt.id,
          order.id,
          stamp,
          status.transaction_status,
          status.payment_type,
          status.gross_amount,
          status.currency,
          status.transaction_id,
        ),
      db
        .prepare(
          `UPDATE payment_transactions SET outcome = 'paid', updated_at = ?3
           WHERE transaction_id = ?1 AND EXISTS (SELECT 1 FROM orders
                                                 WHERE id = ?2 AND paid_transaction_id = ?1)`,
        )
        .bind(status.transaction_id, order.id, stamp),
      // R-10: a payment confirmed after its attempt stopped being open is not in
      // the cap count. If its hold now passes the cap, the notice is written in
      // this same batch, and only when this batch marked the order paid.
      ...(attempt.status !== "open" && order.mode === "live"
        ? [
            noticeStatement(
              db,
              {
                kind: "late_payment_over_cap",
                subject: status.transaction_id,
                detail: {
                  order_number: order.order_number,
                  midtrans_order_id: status.order_id,
                  amount: status.gross_amount,
                  method: status.payment_type,
                },
                now,
              },
              {
                sql: `EXISTS (SELECT 1 FROM orders WHERE id = ?6 AND paid_transaction_id = ?7)
                  AND (SELECT COALESCE(SUM(held_units), 0) FROM provider_spend
                       WHERE day = ?8 AND kind != 'order_call')
                    + (SELECT COUNT(*) FROM payment_attempts WHERE status = 'open') * ?9
                      > ?10`,
                values: [
                  order.id,
                  status.transaction_id,
                  utcDayOf(now),
                  deps.limitUnits,
                  deps.dailyLimitUnits,
                ],
              },
            ),
          ]
        : []),
    ]);
    if (results[0]?.meta?.changes === 1) {
      return "paid";
    }
    // Another copy of the same notification may have won the race.
    const again = await db
      .prepare(
        "SELECT outcome FROM payment_transactions WHERE transaction_id = ?1",
      )
      .bind(status.transaction_id)
      .first<{ outcome: string }>();
    if (again?.outcome === "paid") return "duplicate";
  }
  return markNeedsRefund(deps, attempt, order, status);
}

/** R-12: a settled transaction that cannot be applied. Stored as "needs refund"
 * on its transaction and attempt, and the founder notice goes in the same batch.
 * It only acts if this transaction has not already paid the order. */
async function markNeedsRefund(
  deps: ApplyDeps,
  attempt: AttemptRow,
  order: OrderRow | null,
  status: MidtransStatus,
): Promise<ApplyResult> {
  const { db, now } = deps;
  const stamp = now.toISOString();
  const amountOk =
    status.gross_amount === ORDER_GROSS_AMOUNT_TEXT &&
    status.currency === ORDER_CURRENCY;
  const reason = !meetsPaidRule(status)
    ? amountOk
      ? "fraud_status_not_accept"
      : "wrong_amount_or_currency"
    : !order
      ? "order_missing"
      : order.payment_kind === "midtrans" || order.payment_kind === "simulated"
        ? "order_already_paid"
        : order.replaced_by
          ? "order_replaced"
          : order.payment_kind === "test"
            ? "test_pass_order"
            : "order_ended";
  const settledNow = `EXISTS (SELECT 1 FROM payment_transactions
                              WHERE transaction_id = ?1 AND outcome = 'needs_refund')`;
  const results = await db.batch([
    db
      .prepare(
        `UPDATE payment_transactions SET outcome = 'needs_refund', updated_at = ?2
         WHERE transaction_id = ?1 AND outcome IN ('pending', 'not_settled')
           AND NOT EXISTS (SELECT 1 FROM orders WHERE paid_transaction_id = ?1)`,
      )
      .bind(status.transaction_id, stamp),
    db
      .prepare(
        `UPDATE payment_attempts
         SET refund_state = 'needs_refund',
             status = CASE WHEN status = 'paid' THEN 'paid' ELSE 'needs_refund' END,
             final_at = COALESCE(final_at, ?3),
             last_status = ?4, payment_method = COALESCE(?5, payment_method),
             amount = ?6, currency = ?7, updated_at = ?3
         WHERE id = ?2 AND ${settledNow}`,
      )
      .bind(
        status.transaction_id,
        attempt.id,
        stamp,
        status.transaction_status,
        status.payment_type,
        status.gross_amount,
        status.currency,
      ),
    noticeStatement(
      db,
      {
        kind: "needs_refund",
        subject: status.transaction_id,
        detail: {
          order_number: order?.order_number ?? null,
          midtrans_order_id: status.order_id,
          amount: status.gross_amount,
          currency: status.currency,
          method: status.payment_type,
          reason,
        },
        now,
      },
      {
        sql: `EXISTS (SELECT 1 FROM payment_transactions
                      WHERE transaction_id = ?6 AND outcome = 'needs_refund')`,
        values: [status.transaction_id],
      },
    ),
  ]);
  return results[0]?.meta?.changes === 1 ? "needs_refund" : "duplicate";
}

/**
 * R-15: a refund, partial refund or chargeback of one transaction. Used for the
 * Midtrans answer and for the support command (an outside refund names the
 * transaction and has the same effect, source "support").
 *
 * - Full refund (or chargeback) of the transaction that paid the order, before
 *   the questions are approved: the order ends `failed` with code `refunded`
 *   (hold settled, no AI work, no failure email). After approval: recorded only.
 * - Refund of a "needs refund" transaction closes only that case.
 * - Partial refund and chargeback also send a founder notice.
 * The order ends first, the transaction row last, so a crash in between is
 * finished by the next copy of the same answer.
 */
export async function applyRefund(
  deps: ApplyDeps,
  transactionId: string,
  state: "refunded" | "partial_refund" | "chargeback",
  source: "midtrans" | "support",
  noticeKind?: string,
): Promise<ApplyResult> {
  const { db, now } = deps;
  const stamp = now.toISOString();
  const transaction = await db
    .prepare(
      `SELECT t.outcome, t.refund_state, t.attempt_id, t.amount, t.payment_method
       FROM payment_transactions t WHERE t.transaction_id = ?1`,
    )
    .bind(transactionId)
    .first<{
      outcome: string;
      refund_state: string;
      attempt_id: string;
      amount: string | null;
      payment_method: string | null;
    }>();
  if (!transaction) return "unknown_order";
  if (
    transaction.refund_state === state ||
    transaction.refund_state === "refunded"
  ) {
    return "duplicate";
  }
  const attempt = await attemptById(db, transaction.attempt_id);
  const order = attempt ? await getOrder(db, attempt.order_id) : null;
  const full = state === "refunded" || state === "chargeback";
  if (
    order &&
    full &&
    transaction.outcome === "paid" &&
    order.paid_transaction_id === transactionId
  ) {
    await endOrder(db, {
      orderId: order.id,
      from: ["open"],
      to: "failed",
      failureCode: "refunded",
      now: () => now,
    });
    await db
      .prepare(
        "UPDATE orders SET refunded_at = COALESCE(refunded_at, ?2) WHERE id = ?1",
      )
      .bind(order.id, stamp)
      .run();
  }
  await db.batch([
    db
      .prepare(
        `UPDATE payment_transactions
         SET refund_state = ?2, refunded_at = ?3, refund_source = ?4, updated_at = ?3
         WHERE transaction_id = ?1`,
      )
      .bind(transactionId, state, stamp, source),
    // The attempt's own state: the paying transaction's, or a closed case.
    transaction.outcome === "needs_refund"
      ? db
          .prepare(
            `UPDATE payment_attempts SET refund_state = 'refunded', updated_at = ?2
             WHERE id = ?1 AND ?3 = 'refunded' AND NOT EXISTS (
               SELECT 1 FROM payment_transactions t
               WHERE t.attempt_id = ?1 AND t.outcome = 'needs_refund'
                 AND t.refund_state != 'refunded')`,
          )
          .bind(transaction.attempt_id, stamp, state)
      : db
          .prepare(
            `UPDATE payment_attempts SET refund_state = ?2, updated_at = ?3
             WHERE id = ?1 AND ?4 = 1`,
          )
          .bind(
            transaction.attempt_id,
            state,
            stamp,
            transaction.outcome === "paid" ? 1 : 0,
          ),
    ...(state === "refunded"
      ? []
      : [
          noticeStatement(db, {
            kind: noticeKind ?? state,
            subject: transactionId,
            detail: {
              order_number: order?.order_number ?? null,
              midtrans_order_id: attempt?.midtrans_order_id ?? null,
              amount: transaction.amount,
              method: transaction.payment_method,
            },
            now,
          }),
        ]),
  ]);
  return "refund_recorded";
}
