import {
  createOrderWithHold,
  endOrder,
  usdToUnits,
  type CreateOrderResult,
  type OrderState,
  type SpendDb,
} from "../spending/spend-ledger";
import {
  isOrderNumberCollision,
  newOrderNumber as makeOrderNumber,
} from "./order-number";

/**
 * D1 access for orders (spec 016). Every state change is one conditional
 * statement or one batch, so two runners or two requests cannot both win.
 * Times are ISO-8601 UTC text, which compares correctly as text.
 */

export const ORDER_OPEN_MS = 2 * 60 * 60 * 1000; // Q2: 2 hours
export const ORDER_DEADLINE_MS = 24 * 60 * 60 * 1000; // D2: start + 24 hours
/** Spec 017 R-11/R-13: a paid order waits this long, from payment, for its
 * questions to be approved. */
export const ORDER_PAID_MS = 7 * 24 * 60 * 60 * 1000;
export const FAILURE_EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000; // R-25
/** Email retries back off: after the first failed attempt wait 2 minutes, then
 * 4, 8, 16 and 32, and at most 60 minutes between attempts from then on. */
export const EMAIL_RETRY_BASE_MS = 2 * 60 * 1000;
export const EMAIL_RETRY_MAX_MS = 60 * 60 * 1000;
export function emailRetryDelayMs(failedAttempts: number): number {
  if (failedAttempts <= 0) return 0;
  return Math.min(
    EMAIL_RETRY_BASE_MS * 2 ** (failedAttempts - 1),
    EMAIL_RETRY_MAX_MS,
  );
}
export const MAX_ATTEMPTS_PER_QUESTION = 3; // R-19, as retry.ts
export const MAX_REPORT_ATTEMPTS = 3; // R-19, as classifyReportRecovery

export type OrderMode = "live" | "synthetic";
export type OrderEnvironment = "production" | "preview";

/** Spec 017 R-23. NULL in the database means `legacy`: made by S3 code. */
export type PaymentKind = "unpaid" | "test" | "midtrans" | "simulated";

export const ORDER_ID_PATTERN = /^[0-9a-f]{32}$/;

/** R-02: 128 random bits, made by the server. */
export function newOrderId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function isOrderId(value: unknown): value is string {
  return typeof value === "string" && ORDER_ID_PATTERN.test(value);
}

export type OrderRow = {
  id: string;
  email: string;
  business_name: string;
  website: string;
  mode: OrderMode;
  environment: OrderEnvironment;
  state: OrderState;
  created_at: string;
  expires_at: string;
  started_at: string | null;
  deadline_at: string | null;
  intake_json: string | null;
  lease_owner: string | null;
  lease_until: string | null;
  report_json: string | null;
  completed_at: string | null;
  report_attempts: number;
  prepared_json: string | null;
  link_hash: string | null;
  link_expires_at: string | null;
  link_off: number;
  ended_at: string | null;
  failure_code: string | null;
  overrun: number;
  /** Spec 017 (migration 6). */
  order_number: string | null;
  paid_at: string | null;
  /** NULL = legacy (R-23). */
  payment_kind: PaymentKind | null;
  replaced_by: string | null;
  paid_attempt_id: string | null;
  paid_transaction_id: string | null;
  refunded_at: string | null;
};

/** R-18: SQL for "this order may run paid work": paid through Midtrans, a
 * founder test pass, legacy (NULL), or the synthetic-mode simulated payment (in
 * a synthetic order only), and not replaced. An `unpaid` order never passes. */
export const PAID_GATE_SQL = `(payment_kind IS NULL
  OR payment_kind IN ('midtrans', 'test')
  OR (payment_kind = 'simulated' AND mode = 'synthetic'))
  AND replaced_by IS NULL`;

/** R-18: the same rule on a row already read. */
export function orderMayRunPaidWork(
  order: Pick<OrderRow, "payment_kind" | "mode" | "replaced_by">,
): boolean {
  if (order.replaced_by !== null) return false;
  switch (order.payment_kind) {
    case null:
    case "midtrans":
    case "test":
      return true;
    case "simulated":
      return order.mode === "synthetic";
    default:
      return false;
  }
}

const ACTIVE_STATES = `'running', 'reporting'`;
const iso = (at: Date) => at.toISOString();

/** R-07: one rule for "the order's end time has passed". `expires_at` is the end
 * time: created + 2 hours; pushed out to the attempt's window end + grace when a
 * payment attempt starts; paid time + 7 days once paid (R-11, R-13). An order
 * with an open payment attempt never ends. `now` is a SQL parameter (`?2`). */
export const orderPastEndSql = (now: string) =>
  `(expires_at <= ${now} AND NOT EXISTS (SELECT 1 FROM payment_attempts a
                                         WHERE a.order_id = orders.id AND a.status = 'open'))`;

/** R-07 on a row already read. */
export async function orderPastEnd(
  db: SpendDb,
  order: Pick<OrderRow, "id" | "state" | "expires_at">,
  now: Date,
): Promise<boolean> {
  if (order.state !== "open" || order.expires_at > iso(now)) return false;
  return !(await hasOpenAttempt(db, order.id));
}

export async function hasOpenAttempt(
  db: SpendDb,
  orderId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT 1 AS open FROM payment_attempts WHERE order_id = ?1 AND status = 'open' LIMIT 1",
    )
    .bind(orderId)
    .first<{ open: number }>();
  return row !== null;
}

export async function getOrder(
  db: SpendDb,
  orderId: string,
): Promise<OrderRow | null> {
  if (!isOrderId(orderId)) return null;
  return db
    .prepare("SELECT * FROM orders WHERE id = ?1")
    .bind(orderId)
    .first<OrderRow>();
}

/** R-03: a paid route's gate. The order must exist in this environment and
 * mode, and be in one of the states the call allows. */
export async function orderInState(
  db: SpendDb,
  input: {
    orderId: unknown;
    environment: OrderEnvironment;
    mode: OrderMode;
    states: readonly OrderState[];
    now: Date;
  },
): Promise<OrderRow | null> {
  if (!isOrderId(input.orderId)) return null;
  const order = await getOrder(db, input.orderId);
  if (
    !order ||
    order.environment !== input.environment ||
    order.mode !== input.mode ||
    !input.states.includes(order.state) ||
    // R-18: an unpaid or replaced order is refused like a missing one.
    !orderMayRunPaidWork(order)
  ) {
    return null;
  }
  // An open order past its end time is as good as expired (R-22, R-07).
  if (await orderPastEnd(db, order, input.now)) return null;
  return order;
}

/** How many times a new order number is drawn when the unique index says it is
 * taken (R-01). 31^6 numbers make even one retry very unlikely. */
const ORDER_NUMBER_TRIES = 5;

/**
 * Spec 017: make one order. `unpaid` (the customer's order) holds nothing
 * (R-10, AC-10); `test` (the founder test pass, R-20) reserves its hold now,
 * live mode only and only if the daily cap has room. The order number is made
 * here, and a collision with an existing one is retried (R-01). With
 * `previousOrderId` the older order is replaced in the same write (R-19): the
 * result is "previous_active" when it is paid, has an open payment attempt or
 * (Q14) an attempt closed as unknown.
 */
export async function createOrder(
  db: SpendDb,
  input: {
    email: string;
    businessName: string;
    website: string;
    mode: OrderMode;
    environment: OrderEnvironment;
    paymentKind: "unpaid" | "test";
    /** The test pass's hold, against the daily cap (R-08, R-10). */
    limitUsd: number;
    dailyLimitUsd: number;
    previousOrderId?: unknown;
    now: Date;
    /** Tests only: where order numbers come from. */
    newOrderNumber?: () => string;
  },
): Promise<{
  result: CreateOrderResult;
  orderId: string;
  orderNumber: string;
  /** With "previous_active": why the older order could not be replaced. */
  previousState?: "paid" | "payment_open" | "payment_unknown";
}> {
  const orderId = newOrderId();
  const draw = input.newOrderNumber ?? makeOrderNumber;
  for (let tries = 1; ; tries += 1) {
    const orderNumber = draw();
    try {
      const result = await createOrderWithHold(
        db,
        {
          id: orderId,
          orderNumber,
          paymentKind: input.paymentKind,
          email: input.email,
          businessName: input.businessName,
          website: input.website,
          mode: input.mode,
          environment: input.environment,
          createdAt: input.now,
          expiresAt: new Date(input.now.getTime() + ORDER_OPEN_MS),
          ...(isOrderId(input.previousOrderId)
            ? { replacing: { orderId: input.previousOrderId } }
            : {}),
        },
        input.paymentKind === "test" && input.mode === "live"
          ? {
              limitUnits: usdToUnits(input.limitUsd),
              dailyLimitUnits: usdToUnits(input.dailyLimitUsd),
            }
          : null,
      );
      return {
        result,
        orderId,
        orderNumber,
        ...(result === "previous_active"
          ? {
              previousState: await previousOrderState(
                db,
                input.previousOrderId as string,
              ),
            }
          : {}),
      };
    } catch (error) {
      if (!isOrderNumberCollision(error) || tries >= ORDER_NUMBER_TRIES) {
        throw error;
      }
    }
  }
}

async function previousOrderState(
  db: SpendDb,
  orderId: string,
): Promise<"paid" | "payment_open" | "payment_unknown"> {
  const row = await db
    .prepare(
      `SELECT payment_kind,
              EXISTS (SELECT 1 FROM payment_attempts
                      WHERE order_id = ?1 AND status = 'closed_unknown') AS unknown
       FROM orders WHERE id = ?1`,
    )
    .bind(orderId)
    .first<{ payment_kind: PaymentKind | null; unknown: number }>();
  if (row?.payment_kind === "midtrans" || row?.payment_kind === "simulated") {
    return "paid";
  }
  // Q14: only an attempt still closed as unknown says so; anything else (an
  // open attempt, or one that changed since the refusal) stays "payment_open".
  return row?.unknown ? "payment_unknown" : "payment_open";
}

/** R-23: an order made by S3 code has no number. Give it one before its next
 * email (the S3 ready and failure emails do). Returns the order's number,
 * whoever wrote it; a collision with another order's number draws again. */
export async function ensureOrderNumber(
  db: SpendDb,
  order: Pick<OrderRow, "id" | "order_number">,
  draw: () => string = makeOrderNumber,
): Promise<string> {
  if (order.order_number) return order.order_number;
  for (let tries = 1; ; tries += 1) {
    const candidate = draw();
    try {
      const result = await db
        .prepare(
          `UPDATE orders SET order_number = ?2
           WHERE id = ?1 AND order_number IS NULL`,
        )
        .bind(order.id, candidate)
        .run();
      if (result.meta?.changes === 1) return candidate;
      // Another run gave it a number first: use that one.
      const row = await db
        .prepare("SELECT order_number FROM orders WHERE id = ?1")
        .bind(order.id)
        .first<{ order_number: string | null }>();
      if (row?.order_number) return row.order_number;
      throw new Error("order number could not be assigned");
    } catch (error) {
      if (!isOrderNumberCollision(error) || tries >= ORDER_NUMBER_TRIES) {
        throw error;
      }
    }
  }
}

export type OrderQuestionRow = {
  order_id: string;
  prompt_id: string;
  position: number;
  status: "pending" | "done" | "exhausted";
  attempts: number;
  claim_owner: string | null;
  claim_until: string | null;
  next_attempt_at: string | null;
  last_failure: string | null;
  attempts_json: string;
  observation_json: string | null;
};

/**
 * R-17: move the order to `running` and save, unchanged from then on, the
 * confirmed business details, the approved and original questions, the start
 * time (the D2 clock) and the deadline. One batch; only an `open` order that
 * has not passed its time, and that is paid, a test pass or legacy (R-18), can
 * be approved.
 */
export async function approveOrder(
  db: SpendDb,
  input: {
    orderId: string;
    environment: OrderEnvironment;
    mode: OrderMode;
    intakeJson: string;
    businessName: string;
    promptIds: readonly string[];
    now: Date;
  },
): Promise<boolean> {
  const startedAt = iso(input.now);
  const deadlineAt = iso(new Date(input.now.getTime() + ORDER_DEADLINE_MS));
  const results = await db.batch([
    db
      .prepare(
        `UPDATE orders
         SET state = 'running', started_at = ?2, deadline_at = ?3,
             intake_json = ?4, business_name = ?5
         WHERE id = ?1 AND state = 'open' AND NOT ${orderPastEndSql("?2")}
           AND environment = ?6 AND mode = ?7 AND ${PAID_GATE_SQL}`,
      )
      .bind(
        input.orderId,
        startedAt,
        deadlineAt,
        input.intakeJson,
        input.businessName,
        input.environment,
        input.mode,
      ),
    ...input.promptIds.map((promptId, position) =>
      db
        .prepare(
          `INSERT INTO order_questions (order_id, prompt_id, position)
           SELECT ?1, ?2, ?3
           WHERE EXISTS (SELECT 1 FROM orders
                         WHERE id = ?1 AND state = 'running' AND started_at = ?4)`,
        )
        .bind(input.orderId, promptId, position, startedAt),
    ),
  ]);
  return results[0]?.meta?.changes === 1;
}

export async function listQuestions(
  db: SpendDb,
  orderId: string,
): Promise<OrderQuestionRow[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM order_questions WHERE order_id = ?1 ORDER BY position",
    )
    .bind(orderId)
    .all<OrderQuestionRow>();
  return results;
}

export type QuestionProgress =
  "pending" | "running" | "retrying" | "completed" | "failed";

/** R-21: what the tab may see: the state and question progress only. Never
 * the report, the email or the link secret. */
export type OrderStatus = {
  state: OrderState;
  completed: number;
  total: number;
  questions: Array<{ prompt_id: string; status: QuestionProgress }>;
};

export async function orderStatus(
  db: SpendDb,
  input: { orderId: unknown; environment: OrderEnvironment; now: Date },
): Promise<OrderStatus | null> {
  if (!isOrderId(input.orderId)) return null;
  const order = await getOrder(db, input.orderId);
  if (!order || order.environment !== input.environment) return null;
  const questions = order.started_at ? await listQuestions(db, order.id) : [];
  const now = iso(input.now);
  const mapped = questions.map((question) => ({
    prompt_id: question.prompt_id,
    status: (question.status === "done"
      ? "completed"
      : question.status === "exhausted"
        ? "failed"
        : question.claim_until && question.claim_until > now
          ? "running"
          : question.attempts > 0
            ? "retrying"
            : "pending") as QuestionProgress,
  }));
  return {
    // An open order past its end time reads as expired even before the cron
    // settles it, so a returning customer is sent back to the order screen. An
    // order with an open payment attempt never does (R-07): its `payment` shows
    // "checking".
    state: (await orderPastEnd(db, order, input.now)) ? "expired" : order.state,
    completed: mapped.filter((item) => item.status === "completed").length,
    total: 10,
    questions: mapped,
  };
}

/* ---------------------------- runner statements --------------------------- */

export async function expireOpenOrders(
  db: SpendDb,
  input: {
    environment: OrderEnvironment;
    mode: OrderMode;
    now: Date;
    limit: number;
  },
): Promise<string[]> {
  const ids = await orderIds(
    db,
    `SELECT id FROM orders WHERE state = 'open' AND paid_at IS NULL AND ${orderPastEndSql("?1")}
       AND environment = ?2 AND mode = ?3 ORDER BY expires_at LIMIT ?4`,
    [iso(input.now), input.environment, input.mode, input.limit],
  );
  const expired: string[] = [];
  for (const id of ids) {
    if (
      await endOrder(db, {
        orderId: id,
        from: ["open"],
        to: "expired",
        // R-07: re-checked inside the ending write itself.
        onlyIfUnpaidPastEnd: true,
        now: () => input.now,
      })
    ) {
      expired.push(id);
    }
  }
  return expired;
}

export async function ordersPastDeadline(
  db: SpendDb,
  input: {
    environment: OrderEnvironment;
    mode: OrderMode;
    now: Date;
    limit: number;
  },
): Promise<string[]> {
  return orderIds(
    db,
    // An order another run holds (for example while it sends the ready email)
    // is not failed under it; the sweep comes back once the lease is free.
    `SELECT id FROM orders WHERE state IN (${ACTIVE_STATES}) AND deadline_at <= ?1
       AND environment = ?2 AND mode = ?3
       AND (lease_owner IS NULL OR lease_until <= ?1)
     ORDER BY created_at LIMIT ?4`,
    [iso(input.now), input.environment, input.mode, input.limit],
  );
}

/** R-13: paid orders whose questions were not approved within 7 days of payment
 * (`expires_at` is paid time + 7 days, R-11). A founder test pass is never in
 * this list: it keeps the 2-hour rule. */
export async function paidNotStartedOrders(
  db: SpendDb,
  input: {
    environment: OrderEnvironment;
    mode: OrderMode;
    now: Date;
    limit: number;
  },
): Promise<string[]> {
  return orderIds(
    db,
    `SELECT id FROM orders
     WHERE state = 'open' AND payment_kind IN ('midtrans', 'simulated')
       AND paid_at IS NOT NULL AND expires_at <= ?1
       AND environment = ?2 AND mode = ?3 ORDER BY expires_at LIMIT ?4`,
    [iso(input.now), input.environment, input.mode, input.limit],
  );
}

export async function activeOrders(
  db: SpendDb,
  input: {
    environment: OrderEnvironment;
    mode: OrderMode;
    now: Date;
    limit: number;
  },
): Promise<string[]> {
  // Orders past their deadline never get another paid step (they are failed
  // by `ordersPastDeadline`), and an order another runner holds is skipped so
  // it cannot take a slot. The longest-waiting order goes first (never-stepped
  // first), so a few slow orders cannot hold the slots for ever.
  return orderIds(
    db,
    `SELECT id FROM orders WHERE state IN (${ACTIVE_STATES})
       AND environment = ?1 AND mode = ?2
       AND ${PAID_GATE_SQL}
       AND deadline_at > ?3
       AND (lease_owner IS NULL OR lease_until <= ?3)
     ORDER BY last_step_at IS NOT NULL, last_step_at, created_at LIMIT ?4`,
    [input.environment, input.mode, iso(input.now), input.limit],
  );
}

/** Failed orders whose failure email is not yet accepted, within 24 hours of
 * the failure (R-25), and whose last attempt is old enough: attempts back off
 * (2, 4, 8, 16, 32, then 60 minutes). The due test is in SQL (one cutoff time
 * per number of tries), so waiting orders never fill the limit. The order that
 * waited longest since its last attempt goes first, so one failing email cannot
 * block the others. */
export async function failedOrdersNeedingEmail(
  db: SpendDb,
  input: {
    environment: OrderEnvironment;
    mode: OrderMode;
    now: Date;
    limit: number;
  },
): Promise<string[]> {
  const cutoff = (tries: number) =>
    iso(new Date(input.now.getTime() - emailRetryDelayMs(tries)));
  return orderIds(
    db,
    `SELECT id FROM (
       SELECT id, ended_at,
         (SELECT COUNT(*) FROM order_emails e
           WHERE e.order_id = orders.id AND e.kind = 'failure') AS tries,
         (SELECT MAX(e.created_at) FROM order_emails e
           WHERE e.order_id = orders.id AND e.kind = 'failure') AS last_at
       FROM orders
       WHERE state = 'failed' AND environment = ?1 AND mode = ?2 AND ended_at > ?3
         -- R-15: a refund ended this order; the customer already has their money.
         AND (failure_code IS NULL OR failure_code != 'refunded')
         AND NOT EXISTS (SELECT 1 FROM order_emails e
                         WHERE e.order_id = orders.id AND e.kind = 'failure'
                           AND e.result = 'accepted'))
     WHERE last_at IS NULL OR last_at <= CASE MIN(tries, 6)
       WHEN 1 THEN ?5 WHEN 2 THEN ?6 WHEN 3 THEN ?7
       WHEN 4 THEN ?8 WHEN 5 THEN ?9 ELSE ?10 END
     ORDER BY last_at IS NOT NULL, last_at, ended_at
     LIMIT ?4`,
    [
      input.environment,
      input.mode,
      iso(new Date(input.now.getTime() - FAILURE_EMAIL_WINDOW_MS)),
      input.limit,
      cutoff(1),
      cutoff(2),
      cutoff(3),
      cutoff(4),
      cutoff(5),
      cutoff(6),
    ],
  );
}

async function orderIds(
  db: SpendDb,
  sql: string,
  values: unknown[],
): Promise<string[]> {
  const { results } = await db
    .prepare(sql)
    .bind(...values)
    .all<{ id: string }>();
  return results.map((row) => row.id);
}

/** R-18: claim the order with an owner token and a lease that expires. */
export async function claimOrderLease(
  db: SpendDb,
  input: { orderId: string; owner: string; now: Date; leaseMs: number },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE orders SET lease_owner = ?2, lease_until = ?3, last_step_at = ?4
       WHERE id = ?1 AND state IN (${ACTIVE_STATES})
         AND ${PAID_GATE_SQL}
         AND deadline_at > ?4
         AND (lease_owner IS NULL OR lease_until <= ?4)`,
    )
    .bind(
      input.orderId,
      input.owner,
      iso(new Date(input.now.getTime() + input.leaseMs)),
      iso(input.now),
    )
    .run();
  return result.meta?.changes === 1;
}

/** Renew before each question claim and each paid call; false means stop. */
export async function renewOrderLease(
  db: SpendDb,
  input: { orderId: string; owner: string; now: Date; leaseMs: number },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE orders SET lease_until = ?3
       WHERE id = ?1 AND lease_owner = ?2 AND state IN (${ACTIVE_STATES})
         AND (deadline_at IS NULL OR deadline_at > ?4)`,
    )
    .bind(
      input.orderId,
      input.owner,
      iso(new Date(input.now.getTime() + input.leaseMs)),
      iso(input.now),
    )
    .run();
  return result.meta?.changes === 1;
}

export async function releaseOrderLease(
  db: SpendDb,
  input: { orderId: string; owner: string },
): Promise<void> {
  await db
    .prepare(
      `UPDATE orders SET lease_owner = NULL, lease_until = NULL
       WHERE id = ?1 AND lease_owner = ?2`,
    )
    .bind(input.orderId, input.owner)
    .run();
}

/** R-18/R-19: claim one question. The attempt is counted now, so a call cut
 * off mid-flight still counts. Returns the new attempt number, or null. */
export async function claimQuestion(
  db: SpendDb,
  input: {
    orderId: string;
    promptId: string;
    owner: string;
    now: Date;
    claimMs: number;
  },
): Promise<number | null> {
  const row = await db
    .prepare(
      `UPDATE order_questions
       SET claim_owner = ?3, claim_until = ?4, attempts = attempts + 1
       WHERE order_id = ?1 AND prompt_id = ?2 AND status = 'pending'
         AND attempts < ${MAX_ATTEMPTS_PER_QUESTION}
         AND (claim_owner IS NULL OR claim_until <= ?5)
         AND (next_attempt_at IS NULL OR next_attempt_at <= ?5)
         AND EXISTS (SELECT 1 FROM orders
                     WHERE id = ?1 AND state = 'running' AND lease_owner = ?3)
       RETURNING attempts`,
    )
    .bind(
      input.orderId,
      input.promptId,
      input.owner,
      iso(new Date(input.now.getTime() + input.claimMs)),
      iso(input.now),
    )
    .first<{ attempts: number }>();
  return row ? row.attempts : null;
}

export async function saveQuestionDone(
  db: SpendDb,
  input: {
    orderId: string;
    promptId: string;
    owner: string;
    observationJson: string;
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE order_questions
       SET status = 'done', observation_json = ?4, last_failure = NULL,
           claim_owner = NULL, claim_until = NULL
       WHERE order_id = ?1 AND prompt_id = ?2 AND claim_owner = ?3
         AND status = 'pending'`,
    )
    .bind(input.orderId, input.promptId, input.owner, input.observationJson)
    .run();
  return result.meta?.changes === 1;
}

/** An attempt that did not give a usable answer: back to `pending` after a
 * backoff, or `exhausted` when no attempt is left or the failure is final. */
export async function saveQuestionFailure(
  db: SpendDb,
  input: {
    orderId: string;
    promptId: string;
    owner: string;
    exhausted: boolean;
    nextAttemptAt: Date | null;
    failure: string;
    attemptsJson: string;
    /** Nothing was sent (the ledger was unavailable): give the attempt back. */
    refund?: boolean;
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE order_questions
       SET status = ?4, next_attempt_at = ?5, last_failure = ?6, attempts_json = ?7,
           attempts = attempts - ?8, claim_owner = NULL, claim_until = NULL
       WHERE order_id = ?1 AND prompt_id = ?2 AND claim_owner = ?3
         AND status = 'pending'`,
    )
    .bind(
      input.orderId,
      input.promptId,
      input.owner,
      input.exhausted ? "exhausted" : "pending",
      input.nextAttemptAt ? iso(input.nextAttemptAt) : null,
      input.failure,
      input.attemptsJson,
      input.refund ? 1 : 0,
    )
    .run();
  return result.meta?.changes === 1;
}

/** A pending question whose attempts are all used (for example the third
 * attempt was cut off) can never finish: mark it exhausted. */
export async function exhaustSpentQuestions(
  db: SpendDb,
  input: { orderId: string; now: Date },
): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE order_questions SET status = 'exhausted'
       WHERE order_id = ?1 AND status = 'pending'
         AND attempts >= ${MAX_ATTEMPTS_PER_QUESTION}
         AND (claim_owner IS NULL OR claim_until <= ?2)`,
    )
    .bind(input.orderId, iso(input.now))
    .run();
  return result.meta?.changes ?? 0;
}

/** R-20: after ten saved results the order moves to `reporting`. */
export async function moveToReporting(
  db: SpendDb,
  orderId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE orders SET state = 'reporting'
       WHERE id = ?1 AND state = 'running'
         AND (SELECT COUNT(*) FROM order_questions
              WHERE order_id = ?1 AND status = 'done') = 10`,
    )
    .bind(orderId)
    .run();
  return result.meta?.changes === 1;
}

/** R-19: report attempts are stored in D1 and checked from there. Returns the
 * attempt number, or null when none is left. */
export async function claimReportAttempt(
  db: SpendDb,
  input: { orderId: string; owner: string },
): Promise<number | null> {
  const row = await db
    .prepare(
      `UPDATE orders SET report_attempts = report_attempts + 1
       WHERE id = ?1 AND state = 'reporting' AND lease_owner = ?2
         AND report_json IS NULL AND report_attempts < ${MAX_REPORT_ATTEMPTS}
       RETURNING report_attempts`,
    )
    .bind(input.orderId, input.owner)
    .first<{ report_attempts: number }>();
  return row ? row.report_attempts : null;
}

/** Nothing was sent (the ledger was unavailable): give the attempt back. */
export async function refundReportAttempt(
  db: SpendDb,
  input: { orderId: string; owner: string },
): Promise<void> {
  await db
    .prepare(
      `UPDATE orders SET report_attempts = report_attempts - 1
       WHERE id = ?1 AND lease_owner = ?2 AND report_attempts > 0`,
    )
    .bind(input.orderId, input.owner)
    .run();
}

/** R-20: the saved report never changes. `completed_at` is the moment it is
 * saved (R-23); the link works 12 months after it. */
export async function saveReport(
  db: SpendDb,
  input: { orderId: string; owner: string; reportJson: string; now: Date },
): Promise<boolean> {
  const completed = new Date(input.now);
  const linkEnds = new Date(completed);
  linkEnds.setUTCMonth(linkEnds.getUTCMonth() + 12);
  const result = await db
    .prepare(
      `UPDATE orders SET report_json = ?3, completed_at = ?4, link_expires_at = ?5
       WHERE id = ?1 AND state = 'reporting' AND lease_owner = ?2
         AND report_json IS NULL`,
    )
    .bind(
      input.orderId,
      input.owner,
      input.reportJson,
      iso(completed),
      iso(linkEnds),
    )
    .run();
  return result.meta?.changes === 1;
}

/** R-24: each send of the ready email makes a new secret and replaces the
 * stored hash in the same write. Only the hash is stored. */
export async function replaceLinkHash(
  db: SpendDb,
  input: { orderId: string; linkHash: string },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE orders SET link_hash = ?2
       WHERE id = ?1 AND state = 'reporting' AND report_json IS NOT NULL
         AND link_off = 0`,
    )
    .bind(input.orderId, input.linkHash)
    .run();
  return result.meta?.changes === 1;
}

export async function recordEmail(
  db: SpendDb,
  input: {
    orderId: string;
    kind: "ready" | "failure";
    attempt: number;
    idempotencyKey: string;
    accepted: boolean;
    messageId: string | null;
    now: Date;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO order_emails
         (id, order_id, kind, attempt, idempotency_key, result, provider_message_id, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      crypto.randomUUID(),
      input.orderId,
      input.kind,
      input.attempt,
      input.idempotencyKey,
      input.accepted ? "accepted" : "failed",
      input.messageId,
      iso(input.now),
    )
    .run();
}

/** The sends so far for one kind of email: the next attempt number, and when
 * the last attempt was made and how many failed, so a retry can back off. */
export async function emailHistory(
  db: SpendDb,
  input: { orderId: string; kind: "ready" | "failure" },
): Promise<{
  next: number;
  failed: number;
  accepted: number;
  lastAt: Date | null;
}> {
  const row = await db
    .prepare(
      `SELECT COALESCE(MAX(attempt), 0) + 1 AS next,
              COALESCE(SUM(result = 'failed'), 0) AS failed,
              COALESCE(SUM(result = 'accepted'), 0) AS accepted,
              MAX(created_at) AS last_at
       FROM order_emails WHERE order_id = ?1 AND kind = ?2`,
    )
    .bind(input.orderId, input.kind)
    .first<{
      next: number;
      failed: number;
      accepted: number;
      last_at: string | null;
    }>();
  return {
    next: row?.next ?? 1,
    failed: row?.failed ?? 0,
    accepted: row?.accepted ?? 0,
    lastAt: row?.last_at ? new Date(row.last_at) : null,
  };
}

/** True when the last failed attempt is too recent for another one (backoff). */
export function emailBackingOff(
  history: { failed: number; lastAt: Date | null },
  now: Date,
): boolean {
  return (
    history.lastAt !== null &&
    history.lastAt.getTime() + emailRetryDelayMs(history.failed) > now.getTime()
  );
}

/** R-24/R-26: the saved report behind a link secret. Only the secret's hash is
 * compared. A wrong, expired or switched-off secret all give null, so the
 * caller cannot tell them apart. No provider is involved. */
export async function reportForLink(
  db: SpendDb,
  input: { linkHash: string; environment: OrderEnvironment; now: Date },
): Promise<{
  report_json: string;
  intake_json: string;
  observations: string[];
  mode: OrderMode;
} | null> {
  const order = await db
    .prepare(
      `SELECT id, report_json, intake_json, mode FROM orders
       WHERE link_hash = ?1 AND link_off = 0 AND report_json IS NOT NULL
         AND link_expires_at > ?2 AND environment = ?3`,
    )
    .bind(input.linkHash, iso(input.now), input.environment)
    .first<{
      id: string;
      report_json: string;
      intake_json: string;
      mode: OrderMode;
    }>();
  if (!order) return null;
  const questions = await listQuestions(db, order.id);
  return {
    report_json: order.report_json,
    intake_json: order.intake_json,
    observations: questions.flatMap((question) =>
      question.observation_json ? [question.observation_json] : [],
    ),
    mode: order.mode,
  };
}

/** R-32 `off`: the link stops working; the order state does not change. */
export async function switchLinkOff(
  db: SpendDb,
  orderId: string,
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE orders SET link_off = 1 WHERE id = ?1")
    .bind(orderId)
    .run();
  return result.meta?.changes === 1;
}

/** R-32 `resend`: a new secret replaces the stored hash, in the same write, for
 * any order with a saved report (also one already delivered or failed). A link
 * the founder switched off is switched on again by an explicit resend: the old
 * secret stays dead either way. */
export async function replaceLinkHashForSupport(
  db: SpendDb,
  input: { orderId: string; linkHash: string; now: Date },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE orders SET link_hash = ?2, link_off = 0
       WHERE id = ?1 AND report_json IS NOT NULL AND link_expires_at > ?3`,
    )
    .bind(input.orderId, input.linkHash, iso(input.now))
    .run();
  return result.meta?.changes === 1;
}

/** Spec 016 R-08: the prepared website reading is saved on the order the first
 * time it succeeds, so a repeated request never pays for it again. */
export async function savePreparedReading(
  db: SpendDb,
  input: { orderId: string; preparedJson: string },
): Promise<void> {
  await db
    .prepare(
      `UPDATE orders SET prepared_json = ?2
       WHERE id = ?1 AND state = 'open' AND prepared_json IS NULL`,
    )
    .bind(input.orderId, input.preparedJson)
    .run();
}
