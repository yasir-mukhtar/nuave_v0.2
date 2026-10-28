import {
  paymentReceivedEmail,
  sendWithinAttempt,
  type MailSender,
} from "../orders/mail";
import {
  emailRetryDelayMs,
  ensureOrderNumber,
  FAILURE_EMAIL_WINDOW_MS,
  type OrderEnvironment,
  type OrderMode,
} from "../orders/store";
import type { SpendDb } from "../spending/spend-ledger";

/**
 * The payment-received email (spec 017 R-22). Sent by the cron, never by the
 * notification route. Due = an order paid (Midtrans or the labeled simulated
 * payment) with no accepted send yet. Each send attempt has its own idempotency
 * key built from the order number (never the internal order ID, R-03); a retry
 * inside one attempt keeps it, a later attempt has a new one, as in S3.
 */

export type DuePaymentEmail = {
  id: string;
  order_number: string | null;
  business_name: string;
  email: string;
  paid_at: string;
  /** The sends so far (the next attempt is `last_attempt + 1`). */
  last_attempt: number;
};

const iso = (at: Date) => at.toISOString();

/** The paid order whose email waited longest. A failed send backs off like the
 * S3 emails, and the email is dropped 24 hours after payment (the same span as
 * the failure email). An order a refund already ended gets none. One query. */
export async function duePaymentEmail(
  db: SpendDb,
  input: {
    environment: OrderEnvironment;
    mode: OrderMode;
    now: Date;
  },
): Promise<DuePaymentEmail | null> {
  const cutoff = (tries: number) =>
    iso(new Date(input.now.getTime() - emailRetryDelayMs(tries)));
  return db
    .prepare(
      `SELECT id, order_number, business_name, email, paid_at, last_attempt FROM (
         SELECT o.id, o.order_number, o.business_name, o.email, o.paid_at,
           (SELECT COUNT(*) FROM payment_emails e WHERE e.order_id = o.id) AS tries,
           (SELECT COALESCE(MAX(e.attempt), 0) FROM payment_emails e
             WHERE e.order_id = o.id) AS last_attempt,
           (SELECT MAX(e.created_at) FROM payment_emails e
             WHERE e.order_id = o.id) AS last_at
         FROM orders o
         WHERE o.payment_kind IN ('midtrans', 'simulated') AND o.paid_at > ?3
           AND o.environment = ?1 AND o.mode = ?2
           AND (o.failure_code IS NULL OR o.failure_code != 'refunded')
           AND NOT EXISTS (SELECT 1 FROM payment_emails e
                           WHERE e.order_id = o.id AND e.result = 'accepted'))
       WHERE last_at IS NULL OR last_at <= CASE MIN(tries, 6)
         WHEN 1 THEN ?4 WHEN 2 THEN ?5 WHEN 3 THEN ?6
         WHEN 4 THEN ?7 WHEN 5 THEN ?8 ELSE ?9 END
       ORDER BY paid_at LIMIT 1`,
    )
    .bind(
      input.environment,
      input.mode,
      iso(new Date(input.now.getTime() - FAILURE_EMAIL_WINDOW_MS)),
      cutoff(1),
      cutoff(2),
      cutoff(3),
      cutoff(4),
      cutoff(5),
      cutoff(6),
    )
    .first<DuePaymentEmail>();
}

/** Send one attempt and record it. Returns whether Resend accepted. */
export async function sendPaymentEmail(
  deps: {
    db: SpendDb;
    sender: MailSender;
    now: Date;
    sleep?: (ms: number) => Promise<void>;
  },
  due: DuePaymentEmail,
): Promise<boolean> {
  const { db } = deps;
  // R-23: an order made by S3 code gets its number before its next email.
  const orderNumber = await ensureOrderNumber(db, due);
  const attempt = due.last_attempt + 1;
  const idempotencyKey = `nuave-order-${orderNumber}-payment-${attempt}`;
  const mail = paymentReceivedEmail({
    businessName: due.business_name,
    orderNumber,
  });
  const result = await sendWithinAttempt(
    deps.sender,
    { to: due.email, ...mail, idempotencyKey },
    { sleep: deps.sleep },
  );
  await db
    .prepare(
      `INSERT INTO payment_emails
         (id, order_id, attempt, idempotency_key, result, provider_message_id, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      crypto.randomUUID(),
      due.id,
      attempt,
      idempotencyKey,
      result.accepted ? "accepted" : "failed",
      result.messageId ?? null,
      iso(deps.now),
    )
    .run();
  return result.accepted;
}
