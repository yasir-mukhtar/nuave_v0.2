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
 * An open refund case keeps the order: the same three cases the founder's
 * `support refunds` lists (a settled payment Nuave could not apply, a paid
 * order that failed and is not yet refunded, and a payment with no final
 * answer). Takes the order row's alias `o`.
 */
const OPEN_REFUND_CASE = `(
  EXISTS (SELECT 1 FROM payment_transactions t
          JOIN payment_attempts a ON a.id = t.attempt_id
          WHERE a.order_id = o.id AND t.outcome = 'needs_refund'
            AND t.refund_state != 'refunded')
  OR (o.state = 'failed' AND o.payment_kind = 'midtrans'
      AND COALESCE((SELECT t.refund_state FROM payment_transactions t
                    WHERE t.transaction_id = o.paid_transaction_id), 'none')
          NOT IN ('refunded', 'chargeback'))
  OR EXISTS (SELECT 1 FROM payment_attempts a
             WHERE a.order_id = o.id AND a.status IN ('open', 'closed_unknown'))
)`;

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
  const now = iso(input.now);
  const completedBefore = iso(monthsBefore(input.now, COMPLETED_KEEP_MONTHS));
  const endedBefore = iso(
    new Date(input.now.getTime() - ENDED_KEEP_DAYS * 86_400_000),
  );
  const { results } = await db
    .prepare(
      `SELECT o.id FROM orders o
       WHERE o.environment = ?1 AND o.mode = ?2 AND o.purged_at IS NULL
         AND (o.lease_until IS NULL OR o.lease_until < ?3)
         AND (o.hold_until IS NULL OR o.hold_until < ?3)
         AND (
           (o.state = 'delivered' AND o.completed_at IS NOT NULL
              AND o.completed_at < ?4)
           OR (o.state IN ('failed', 'expired')
              AND COALESCE(o.ended_at, o.expires_at) < ?5)
         )
         AND NOT ${OPEN_REFUND_CASE}
       ORDER BY COALESCE(o.completed_at, o.ended_at, o.expires_at)
       LIMIT ?6`,
    )
    .bind(
      input.environment,
      input.mode,
      now,
      completedBefore,
      endedBefore,
      input.limit,
    )
    .all<{ id: string }>();
  return results.map((row) => row.id);
}

/**
 * Makes one order anonymous in a single batch. The update re-checks the hold,
 * the lease and that it was not purged already, so a support hold or a run
 * that claimed the order in between wins; the deletes only remove rows of an
 * order this batch purged. Returns whether it purged.
 */
export async function purgeOrder(
  db: SpendDb,
  input: { orderId: string; now: Date },
): Promise<boolean> {
  const now = iso(input.now);
  const [update] = await db.batch([
    db
      .prepare(
        `UPDATE orders SET
           email = '', business_name = '', website = '',
           intake_json = NULL, prepared_json = NULL, discovery_json = NULL,
           discovery_key = NULL, questions_json = NULL, report_json = NULL,
           link_hash = NULL, link_off = 1, purged_at = ?2
         WHERE id = ?1 AND purged_at IS NULL
           AND (lease_until IS NULL OR lease_until < ?2)
           AND (hold_until IS NULL OR hold_until < ?2)`,
      )
      .bind(input.orderId, now),
    ...["order_questions", "order_emails", "payment_emails"].map((table) =>
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
