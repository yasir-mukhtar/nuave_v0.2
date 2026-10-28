import type { SpendDb } from "../spending/spend-ledger";
import type { OrderEnvironment, OrderMode } from "./store";

/**
 * Record lifetimes (Spec 016 Q3; privacy page section 9; founder decision
 * 2026-10-24 to delete on schedule). An order past its lifetime is made
 * anonymous, not deleted: the customer's email, business details, intake,
 * questions, answers, report and link go, and a bare row stays with the order
 * number, dates, state and payment links, so payment and cost records still
 * add up. Payment records themselves are never removed here (kept at least 24
 * months, longer where tax law asks).
 */
export const COMPLETED_KEEP_MONTHS = 12;
export const ENDED_KEEP_DAYS = 30;
export const SPEND_KEEP_MONTHS = 24;
/** Cleanup runs once an hour, in the cron run at this minute. */
export const RETENTION_MINUTE = 17;
export const MAX_PURGED_PER_RUN = 5;
export const MAX_SPEND_ROWS_PER_RUN = 200;
/** The longest a support hold may keep an order past its lifetime. */
export const MAX_HOLD_DAYS = 365;

const iso = (date: Date) => date.toISOString();

function monthsBefore(now: Date, months: number): Date {
  const date = new Date(now.getTime());
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

/**
 * An open refund case keeps the order: the cases the founder's `support
 * refunds` lists (a settled payment Nuave could not apply, a paid order that
 * failed and is not yet refunded, a payment closed with no final answer),
 * plus any payment attempt still open. The first two are the money cases,
 * which `support norefund` can close without a refund. Takes the order row's
 * alias `o`.
 */
/** A settled payment Nuave could not apply, not refunded and not closed
 * without a refund (`support norefund`). Takes the transaction alias `t`. */
export const OPEN_NEEDS_REFUND = `(t.outcome = 'needs_refund'
  AND t.refund_state != 'refunded'
  AND NOT EXISTS (SELECT 1 FROM refund_closures c
                  WHERE c.kind = 'payment' AND c.transaction_id = t.transaction_id))`;

/** A paid order that failed, its paying transaction neither refunded nor
 * charged back, and not closed without a refund. Takes the order alias `o`. */
export const OPEN_PAID_ORDER_FAILED = `(o.state = 'failed'
  AND o.payment_kind = 'midtrans'
  AND COALESCE((SELECT t.refund_state FROM payment_transactions t
                WHERE t.transaction_id = o.paid_transaction_id), 'none')
      NOT IN ('refunded', 'chargeback')
  AND NOT EXISTS (SELECT 1 FROM refund_closures c
                  WHERE c.kind = 'paid_order' AND c.order_id = o.id))`;

const OPEN_REFUND_CASE = `(
  EXISTS (SELECT 1 FROM payment_transactions t
          JOIN payment_attempts a ON a.id = t.attempt_id
          WHERE a.order_id = o.id AND ${OPEN_NEEDS_REFUND})
  OR ${OPEN_PAID_ORDER_FAILED}
  OR EXISTS (SELECT 1 FROM payment_attempts a
             WHERE a.order_id = o.id AND a.status IN ('open', 'closed_unknown'))
)`;

/**
 * The whole rule for "may be made anonymous now", on the order row `o`:
 * ?1 now, ?2 delivered-before, ?3 ended-before. The selection and the
 * anonymising write both use it, so an order that changed in between (a late
 * payment, a hold, a new lease) is left alone.
 */
const PURGE_ELIGIBLE = `o.purged_at IS NULL
  AND (o.lease_until IS NULL OR o.lease_until < ?1)
  AND (o.hold_until IS NULL OR o.hold_until < ?1)
  AND (
    (o.state = 'delivered' AND o.completed_at IS NOT NULL
       AND o.completed_at < ?2)
    OR (o.state IN ('failed', 'expired')
       AND COALESCE(o.ended_at, o.expires_at) < ?3)
  )
  AND NOT ${OPEN_REFUND_CASE}`;

function cutoffs(now: Date): [string, string, string] {
  return [
    iso(now),
    iso(monthsBefore(now, COMPLETED_KEEP_MONTHS)),
    iso(new Date(now.getTime() - ENDED_KEEP_DAYS * 86_400_000)),
  ];
}

/** Orders past their lifetime, not held, not leased, with no open refund. */
export async function ordersDueForPurge(
  db: SpendDb,
  input: {
    environment: OrderEnvironment;
    mode: OrderMode;
    now: Date;
    limit: number;
  },
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT o.id FROM orders o
       WHERE ${PURGE_ELIGIBLE}
         AND o.environment = ?4 AND o.mode = ?5
       ORDER BY COALESCE(o.completed_at, o.ended_at, o.expires_at)
       LIMIT ?6`,
    )
    .bind(...cutoffs(input.now), input.environment, input.mode, input.limit)
    .all<{ id: string }>();
  return results.map((row) => row.id);
}

/**
 * Makes one order anonymous in a single batch. The update repeats the whole
 * eligibility rule, so an order that changed since it was selected is left
 * alone; the deletes only remove rows of an order this batch purged. Returns
 * whether it purged.
 */
export async function purgeOrder(
  db: SpendDb,
  input: { orderId: string; now: Date },
): Promise<boolean> {
  const [now, completedBefore, endedBefore] = cutoffs(input.now);
  const [update] = await db.batch([
    db
      .prepare(
        `UPDATE orders AS o SET
           email = '', business_name = '', website = '',
           intake_json = NULL, prepared_json = NULL, discovery_json = NULL,
           discovery_key = NULL, questions_json = NULL, report_json = NULL,
           pages_json = NULL,
           link_hash = NULL, link_off = 1, meta_event_id = NULL,
           purged_at = ?1
         WHERE o.id = ?4 AND ${PURGE_ELIGIBLE}`,
      )
      .bind(now, completedBefore, endedBefore, input.orderId),
    ...[
      "order_questions",
      "order_emails",
      "payment_emails",
      // Spec 021 Part P: the PDF counts and print codes (no report data).
      "report_pdf_days",
      "report_print_tokens",
    ].map((table) =>
      db
        .prepare(
          `DELETE FROM ${table} WHERE order_id = ?1
             AND EXISTS (SELECT 1 FROM orders
                         WHERE id = ?1 AND purged_at = ?2)`,
        )
        .bind(input.orderId, now),
    ),
  ]);
  return (update?.meta?.changes ?? 0) > 0;
}

/** Settled cost records older than 24 months (no email; order ID and costs). */
export async function purgeOldSpendRows(
  db: SpendDb,
  input: { now: Date; limit: number },
): Promise<number> {
  const before = iso(monthsBefore(input.now, SPEND_KEEP_MONTHS));
  const result = await db
    .prepare(
      `DELETE FROM provider_spend WHERE id IN (
         SELECT id FROM provider_spend
         WHERE created_at < ?1 AND settled_at IS NOT NULL
         ORDER BY created_at LIMIT ?2)`,
    )
    .bind(before, input.limit)
    .run();
  return result.meta?.changes ?? 0;
}

/** Support: keep an order past its lifetime while a support case is open
 * (privacy page section 9). `days` 0 releases the hold. */
export async function holdOrder(
  db: SpendDb,
  input: { orderId: string; days: number; now: Date },
): Promise<string | null> {
  const until =
    input.days === 0
      ? null
      : iso(new Date(input.now.getTime() + input.days * 86_400_000));
  const result = await db
    .prepare(
      `UPDATE orders SET hold_until = ?2 WHERE id = ?1 AND purged_at IS NULL`,
    )
    .bind(input.orderId, until)
    .run();
  return (result.meta?.changes ?? 0) > 0 ? (until ?? "released") : null;
}
