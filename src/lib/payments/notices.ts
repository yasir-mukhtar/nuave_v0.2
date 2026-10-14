import type { SpendDb, SpendStatement } from "../spending/spend-ledger";

/**
 * R-21: a founder notice is one row, unique by (kind, subject). Daily kinds use
 * the UTC day as the subject; kinds about one order or transaction use a stable
 * key that is never the internal order ID (the order number, the Midtrans
 * order_id or the transaction_id). S4b only records the row; the cron sends it
 * (S4c). Writing the same notice again changes nothing.
 */
export type NoticeInput = {
  kind: string;
  subject: string;
  /** Facts the email needs. Never a key, a signature, an email address or the
   * internal order ID. */
  detail?: Record<string, string | number | null>;
  now: Date;
};

export const utcDayOf = (at: Date) => at.toISOString().slice(0, 10);

/** The insert as a statement, so it can ride in the batch that caused it. `guard`
 * is an optional SQL condition with its own parameters, numbered from `?6`. */
export function noticeStatement(
  db: SpendDb,
  input: NoticeInput,
  guard?: { sql: string; values: unknown[] },
): SpendStatement {
  return db
    .prepare(
      `INSERT OR IGNORE INTO founder_notices
         (id, kind, subject, detail_json, status, created_at)
       SELECT ?1, ?2, ?3, ?4, 'pending', ?5
       WHERE ${guard?.sql ?? "1 = 1"}`,
    )
    .bind(
      crypto.randomUUID(),
      input.kind,
      input.subject,
      input.detail ? JSON.stringify(input.detail) : null,
      input.now.toISOString(),
      ...(guard?.values ?? []),
    );
}

/** True when this call wrote the row (it was the first). */
export async function recordFounderNotice(
  db: SpendDb,
  input: NoticeInput,
): Promise<boolean> {
  const result = await noticeStatement(db, input).run();
  return result.meta?.changes === 1;
}

/**
 * R-21: the founder notice for a paid, non-test order that ended `failed`:
 * `paid_not_started` for the 7-day sweep (R-13), `paid_order_failed` for any
 * other code. It rides in the batch that ends the order and writes only if the
 * order is now `failed` with this code, was paid through Midtrans (a real payment: never the
 * labeled simulated one, a test pass or a legacy order) and has a number.
 * The facts are read in SQL (one statement, no extra query); the subject is the
 * order number, never the internal order ID.
 */
export function orderFailedNoticeStatement(
  db: SpendDb,
  input: { orderId: string; code: string; amount: string; now: Date },
): SpendStatement {
  return db
    .prepare(
      `INSERT OR IGNORE INTO founder_notices
         (id, kind, subject, detail_json, status, created_at)
       SELECT ?1, CASE WHEN ?3 = 'paid_not_started' THEN 'paid_not_started'
                       ELSE 'paid_order_failed' END,
              o.order_number,
              json_object('order_number', o.order_number, 'amount', ?4,
                'method', COALESCE((SELECT a.payment_method FROM payment_attempts a
                                    WHERE a.id = o.paid_attempt_id), o.payment_kind),
                'reason', ?3),
              'pending', ?5
       FROM orders o
       WHERE o.id = ?2 AND o.state = 'failed' AND o.failure_code = ?3
         AND o.payment_kind = 'midtrans'
         AND o.order_number IS NOT NULL`,
    )
    .bind(
      crypto.randomUUID(),
      input.orderId,
      input.code,
      input.amount,
      input.now.toISOString(),
    );
}
