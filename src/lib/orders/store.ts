import {
  createOrderWithHold,
  endOrder,
  usdToUnits,
  type CreateOrderResult,
  type OrderState,
  type SpendDb,
} from "../spending/spend-ledger";

/**
 * D1 access for orders (spec 016). Every state change is one conditional
 * statement or one batch, so two runners or two requests cannot both win.
 * Times are ISO-8601 UTC text, which compares correctly as text.
 */

export const ORDER_OPEN_MS = 2 * 60 * 60 * 1000; // Q2: 2 hours
export const ORDER_DEADLINE_MS = 24 * 60 * 60 * 1000; // D2: start + 24 hours
export const FAILURE_EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000; // R-25
export const MAX_ATTEMPTS_PER_QUESTION = 3; // R-19, as retry.ts
export const MAX_REPORT_ATTEMPTS = 3; // R-19, as classifyReportRecovery

export type OrderMode = "live" | "synthetic";
export type OrderEnvironment = "production" | "preview";

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
  link_hash: string | null;
  link_expires_at: string | null;
  link_off: number;
  ended_at: string | null;
  failure_code: string | null;
  overrun: number;
};

const ACTIVE_STATES = `'running', 'reporting'`;
const iso = (at: Date) => at.toISOString();

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
    !input.states.includes(order.state)
  ) {
    return null;
  }
  // An open order past its time is as good as expired (R-22).
  if (order.state === "open" && order.expires_at <= iso(input.now)) return null;
  return order;
}

export async function createOrder(
  db: SpendDb,
  input: {
    email: string;
    businessName: string;
    website: string;
    mode: OrderMode;
    environment: OrderEnvironment;
    /** Live orders: the limit held against the daily cap (R-08). */
    limitUsd: number;
    dailyLimitUsd: number;
    now: Date;
  },
): Promise<{ result: CreateOrderResult; orderId: string }> {
  const orderId = newOrderId();
  const result = await createOrderWithHold(
    db,
    {
      id: orderId,
      email: input.email,
      businessName: input.businessName,
      website: input.website,
      mode: input.mode,
      environment: input.environment,
      createdAt: input.now,
      expiresAt: new Date(input.now.getTime() + ORDER_OPEN_MS),
    },
    input.mode === "live"
      ? {
          limitUnits: usdToUnits(input.limitUsd),
          dailyLimitUnits: usdToUnits(input.dailyLimitUsd),
        }
      : null,
  );
  return { result, orderId };
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
 * has not passed its time can be approved.
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
         WHERE id = ?1 AND state = 'open' AND expires_at > ?2
           AND environment = ?6 AND mode = ?7`,
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
    // An open order past its time reads as expired even before the cron
    // settles it, so a returning customer is sent back to the order screen.
    state:
      order.state === "open" && order.expires_at <= now
        ? "expired"
        : order.state,
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
    `SELECT id FROM orders WHERE state = 'open' AND expires_at <= ?1
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
    `SELECT id FROM orders WHERE state IN (${ACTIVE_STATES}) AND deadline_at <= ?1
       AND environment = ?2 AND mode = ?3 ORDER BY created_at LIMIT ?4`,
    [iso(input.now), input.environment, input.mode, input.limit],
  );
}

export async function activeOrders(
  db: SpendDb,
  input: { environment: OrderEnvironment; mode: OrderMode; limit: number },
): Promise<string[]> {
  return orderIds(
    db,
    `SELECT id FROM orders WHERE state IN (${ACTIVE_STATES})
       AND environment = ?1 AND mode = ?2 ORDER BY created_at LIMIT ?3`,
    [input.environment, input.mode, input.limit],
  );
}

/** Failed orders whose failure email is not yet accepted, within 24 hours of
 * the failure (R-25). */
export async function failedOrdersNeedingEmail(
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
     WHERE state = 'failed' AND environment = ?1 AND mode = ?2 AND ended_at > ?3
       AND NOT EXISTS (SELECT 1 FROM order_emails e
                       WHERE e.order_id = orders.id AND e.kind = 'failure'
                         AND e.result = 'accepted')
     ORDER BY ended_at LIMIT ?4`,
    [
      input.environment,
      input.mode,
      iso(new Date(input.now.getTime() - FAILURE_EMAIL_WINDOW_MS)),
      input.limit,
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
      `UPDATE orders SET lease_owner = ?2, lease_until = ?3
       WHERE id = ?1 AND state IN (${ACTIVE_STATES})
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
       WHERE id = ?1 AND lease_owner = ?2 AND state IN (${ACTIVE_STATES})`,
    )
    .bind(
      input.orderId,
      input.owner,
      iso(new Date(input.now.getTime() + input.leaseMs)),
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

export async function nextEmailAttempt(
  db: SpendDb,
  input: { orderId: string; kind: "ready" | "failure" },
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(MAX(attempt), 0) + 1 AS next FROM order_emails
       WHERE order_id = ?1 AND kind = ?2`,
    )
    .bind(input.orderId, input.kind)
    .first<{ next: number }>();
  return row?.next ?? 1;
}
