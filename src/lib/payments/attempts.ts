import { capRoomSql, type SpendDb } from "../spending/spend-ledger";
import {
  getOrder,
  type OrderEnvironment,
  type OrderMode,
  type OrderRow,
} from "../orders/store";
import { PAYMENT_WINDOW_MINUTES } from "./midtrans";

/**
 * Payment attempts (spec 017 R-04, R-05, R-06). One row per Snap payment started
 * for an order. An attempt is `open` from its start until it has a final answer;
 * an open attempt counts against the daily cap (R-10) and stops the order from
 * ending (R-07).
 */

export type AttemptStatus =
  | "open"
  | "paid"
  | "needs_refund"
  | "finally_unpaid"
  | "closed_unknown"
  | "void";

export type AttemptRow = {
  id: string;
  order_id: string;
  attempt_number: number;
  midtrans_order_id: string;
  window_start: string;
  window_end: string;
  snap_token: string | null;
  redirect_url: string | null;
  status: AttemptStatus;
  last_status: string | null;
  payment_method: string | null;
  amount: string | null;
  currency: string | null;
  refund_state: string;
  last_checked_at: string | null;
  check_failed_at: string | null;
  final_at: string | null;
  created_at: string;
  updated_at: string;
};

export const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_MINUTES * 60 * 1000;
/** R-06: after the window, 30 minutes of grace... */
export const PAYMENT_GRACE_MS = 30 * 60 * 1000;
/** ...and a further 60 minutes before "finally unpaid". */
export const PAYMENT_FINAL_WAIT_MS = 60 * 60 * 1000;
/** R-06/R-14: no final answer 7 days after the window: closed as unknown. */
export const PAYMENT_UNKNOWN_CLOSE_MS = 7 * 24 * 60 * 60 * 1000;

const iso = (at: Date) => at.toISOString();
/** SQLite's spelling of an ISO time plus an offset, in the same text format. */
const ISO_FORMAT = `'%Y-%m-%dT%H:%M:%fZ'`;

export async function attemptByMidtransOrderId(
  db: SpendDb,
  midtransOrderId: string,
): Promise<AttemptRow | null> {
  return db
    .prepare("SELECT * FROM payment_attempts WHERE midtrans_order_id = ?1")
    .bind(midtransOrderId)
    .first<AttemptRow>();
}

export async function attemptById(
  db: SpendDb,
  id: string,
): Promise<AttemptRow | null> {
  return db
    .prepare("SELECT * FROM payment_attempts WHERE id = ?1")
    .bind(id)
    .first<AttemptRow>();
}

export async function openAttemptForOrder(
  db: SpendDb,
  orderId: string,
): Promise<AttemptRow | null> {
  return db
    .prepare(
      "SELECT * FROM payment_attempts WHERE order_id = ?1 AND status = 'open'",
    )
    .bind(orderId)
    .first<AttemptRow>();
}

export type StartResult =
  | { result: "started"; attempt: AttemptRow }
  /** R-10: no room for one more order limit. */
  | { result: "cap_full" }
  /** R-06: the order already has an open attempt (its page, if Snap answered). */
  | { result: "attempt_open"; redirectUrl: string | null }
  /** Not a payable order: unknown, ended, paid, test pass, legacy, replaced, or
   * a settled payment already needs a refund (R-12: never ask to pay again). */
  | { result: "refused" };

/**
 * R-05: the start-payment write. ONE batch: the attempt row is inserted only if
 * the order is open, unpaid, not replaced, not ended, has no open or settled
 * attempt, AND the cap has room (R-10, `capRoomSql` inside the insert, so racing
 * starts cannot both pass); the order's end time is pushed out to the window end
 * plus the grace (R-07) in the same batch. The Midtrans `order_id` is the order
 * number plus the attempt number (R-03).
 */
export async function startAttempt(
  db: SpendDb,
  input: {
    orderId: string;
    environment: OrderEnvironment;
    mode: OrderMode;
    now: Date;
    limitUnits: number;
    dailyLimitUnits: number;
  },
): Promise<StartResult> {
  const id = crypto.randomUUID();
  const now = iso(input.now);
  const windowEnd = iso(new Date(input.now.getTime() + PAYMENT_WINDOW_MS));
  const day = now.slice(0, 10);
  let changed = false;
  try {
    const results = await db.batch([
      db
        .prepare(
          `INSERT INTO payment_attempts
             (id, order_id, attempt_number, midtrans_order_id, window_start,
              window_end, status, created_at, updated_at)
           SELECT ?1, o.id, n.next, o.order_number || '-' || n.next, ?2, ?3,
                  'open', ?2, ?2
           FROM orders o,
                (SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next
                 FROM payment_attempts WHERE order_id = ?4) n
           WHERE o.id = ?4 AND o.environment = ?5 AND o.mode = ?6
             AND o.state = 'open' AND o.payment_kind = 'unpaid'
             AND o.replaced_by IS NULL AND o.paid_at IS NULL
             AND o.order_number IS NOT NULL AND o.expires_at > ?2
             AND NOT EXISTS (SELECT 1 FROM payment_attempts a
                             WHERE a.order_id = o.id
                               AND (a.status IN ('open', 'needs_refund', 'paid')
                                    OR a.refund_state = 'needs_refund'))
             AND ${capRoomSql({ day: "?9", limitUnits: "?7", dailyLimitUnits: "?8" })}`,
        )
        .bind(
          id,
          now,
          windowEnd,
          input.orderId,
          input.environment,
          input.mode,
          input.limitUnits,
          input.dailyLimitUnits,
          day,
        ),
      // R-07: the order ends no earlier than the window end plus the grace.
      db
        .prepare(
          `UPDATE orders
           SET expires_at = MAX(expires_at, strftime(${ISO_FORMAT}, ?2, '+30 minutes'))
           WHERE id = ?3 AND EXISTS (SELECT 1 FROM payment_attempts WHERE id = ?1)`,
        )
        .bind(id, windowEnd, input.orderId),
    ]);
    changed = results[0]?.meta?.changes === 1;
  } catch (error) {
    // Only the unique (order, attempt number) index means another start won the
    // race. Any other error (the database) is not "cap full": it goes up and
    // the route answers "unavailable".
    if (!/UNIQUE constraint/i.test(String((error as Error)?.message))) {
      throw error;
    }
    changed = false;
  }
  if (changed) {
    const attempt = await attemptById(db, id);
    if (attempt) return { result: "started", attempt };
  }
  return classifyRefusedStart(db, input);
}

async function classifyRefusedStart(
  db: SpendDb,
  input: {
    orderId: string;
    environment: OrderEnvironment;
    mode: OrderMode;
    now: Date;
  },
): Promise<StartResult> {
  const order = await getOrder(db, input.orderId);
  if (
    !order ||
    order.environment !== input.environment ||
    order.mode !== input.mode ||
    order.state !== "open" ||
    order.payment_kind !== "unpaid" ||
    order.replaced_by !== null ||
    order.paid_at !== null
  ) {
    return { result: "refused" };
  }
  const open = await openAttemptForOrder(db, order.id);
  if (open) return { result: "attempt_open", redirectUrl: open.redirect_url };
  const settled = await db
    .prepare(
      `SELECT 1 AS x FROM payment_attempts WHERE order_id = ?1
         AND (status IN ('needs_refund', 'paid') OR refund_state = 'needs_refund')`,
    )
    .bind(order.id)
    .first();
  if (settled || order.expires_at <= iso(input.now)) {
    return { result: "refused" };
  }
  return { result: "cap_full" };
}

/** R-05: Snap answered; keep the token and the redirect URL. */
export async function saveSnapResult(
  db: SpendDb,
  input: { attemptId: string; token: string; redirectUrl: string; now: Date },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE payment_attempts
       SET snap_token = ?2, redirect_url = ?3, updated_at = ?4
       WHERE id = ?1 AND status = 'open'`,
    )
    .bind(input.attemptId, input.token, input.redirectUrl, iso(input.now))
    .run();
  return result.meta?.changes === 1;
}

/** R-05: Snap failed. The attempt is void: it holds no cap and blocks nothing,
 * and the order's end time goes back to what the void attempt had pushed out
 * (created + 2 hours, or the last real attempt's window end plus the grace). */
export async function voidAttempt(
  db: SpendDb,
  input: { attemptId: string; orderId: string; now: Date },
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE payment_attempts SET status = 'void', final_at = ?2, updated_at = ?2
         WHERE id = ?1 AND status = 'open' AND redirect_url IS NULL`,
      )
      .bind(input.attemptId, iso(input.now)),
    db
      .prepare(
        `UPDATE orders
         SET expires_at = MAX(
           strftime(${ISO_FORMAT}, created_at, '+2 hours'),
           COALESCE((SELECT strftime(${ISO_FORMAT}, MAX(window_end), '+30 minutes')
                     FROM payment_attempts
                     WHERE order_id = orders.id AND status != 'void'), ''))
         WHERE id = ?1 AND payment_kind = 'unpaid' AND state = 'open'
           AND EXISTS (SELECT 1 FROM payment_attempts WHERE id = ?2 AND status = 'void')`,
      )
      .bind(input.orderId, input.attemptId),
  ]);
}

/* ------------------------------ what the page sees ------------------------- */

/**
 * The payment part of the order status answer (R-14, Experience 5-8). `state`:
 *
 * - `not_required`: a test-pass or legacy order. No payment.
 * - `unpaid`: no live attempt; the order summary offers Bayar.
 * - `waiting`: open attempt inside the 60-minute window. "Menunggu pembayaran"
 *   with `redirect_url` for "Lihat cara bayar".
 * - `try_failed`: open attempt inside the window, and the last try was denied,
 *   cancelled, failed or expired (`last_try`). Honest message, `redirect_url`.
 * - `checking`: open attempt, window ended. "Kami sedang memeriksa pembayaran
 *   Anda", Cek lagi, no new payment.
 * - `cannot_check`: as `checking`, but Midtrans could not answer the last check.
 *   "Status pembayaran belum dapat diperiksa", Cek lagi.
 * - `unpaid_final`: finally unpaid. "Coba bayar lagi" (a replacement order).
 * - `closed_unknown`: no final answer after 7 days; `order_number` and support.
 * - `needs_refund`: a settled payment that could not be applied; `order_number`
 *   and support. Never asked to pay again.
 * - `paid`: paid (also while running and after delivery); `order_number`.
 * - `paid_ended`: paid but the order ended (expired, failed): `order_number` and
 *   "Hubungi support@nuave.ai"; never a new payment (Experience 8).
 * - `refunded`: the paying transaction was fully refunded before approval.
 */
export type PaymentView = {
  state:
    | "not_required"
    | "unpaid"
    | "waiting"
    | "try_failed"
    | "checking"
    | "cannot_check"
    | "unpaid_final"
    | "closed_unknown"
    | "needs_refund"
    | "paid"
    | "paid_ended"
    | "refunded";
  order_number?: string;
  redirect_url?: string;
  last_try?: "denied" | "cancelled" | "failed" | "expired";
};

const LAST_TRY: Record<string, NonNullable<PaymentView["last_try"]>> = {
  deny: "denied",
  cancel: "cancelled",
  failure: "failed",
  expire: "expired",
};

export async function paymentView(
  db: SpendDb,
  order: OrderRow,
  now: Date,
): Promise<PaymentView> {
  const kind = order.payment_kind;
  if (kind === null || kind === "test") return { state: "not_required" };
  const number = order.order_number ? { order_number: order.order_number } : {};
  if (kind === "midtrans" || kind === "simulated") {
    if (order.failure_code === "refunded")
      return { state: "refunded", ...number };
    const ended =
      order.state === "expired" ||
      order.state === "failed" ||
      (order.state === "open" && order.expires_at <= iso(now));
    return { state: ended ? "paid_ended" : "paid", ...number };
  }
  const latest = await db
    .prepare(
      `SELECT * FROM payment_attempts WHERE order_id = ?1 AND status != 'void'
       ORDER BY attempt_number DESC LIMIT 1`,
    )
    .bind(order.id)
    .first<AttemptRow>();
  if (!latest) return { state: "unpaid" };
  const link = latest.redirect_url ? { redirect_url: latest.redirect_url } : {};
  switch (latest.status) {
    case "open": {
      if (latest.window_end > iso(now)) {
        const lastTry = LAST_TRY[latest.last_status ?? ""];
        return lastTry
          ? { state: "try_failed", last_try: lastTry, ...link }
          : { state: "waiting", ...link };
      }
      return { state: latest.check_failed_at ? "cannot_check" : "checking" };
    }
    case "finally_unpaid":
      return { state: "unpaid_final" };
    case "closed_unknown":
      return { state: "closed_unknown", ...number };
    case "needs_refund":
      return { state: "needs_refund", ...number };
    default:
      return { state: "unpaid" };
  }
}
