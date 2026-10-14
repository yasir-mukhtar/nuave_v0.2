/**
 * Server-side spend ledger on Cloudflare D1 (plan S2, spec 016 per-order limit).
 *
 * Money is stored as integer units: 1 USD = 100,000,000 units.
 *
 * Live orders only (synthetic orders make no paid call and write no rows):
 *
 * - An order holds ONE ledger row of kind `order_hold` that holds the per-order
 *   limit against the daily cap of the day it was reserved (UTC). Spec 017: an
 *   `unpaid` order holds nothing. The hold is reserved when the order is marked
 *   paid (on the UTC day of payment, even if the cap is now full) or, for a
 *   founder test pass, when the order is created and only if the cap has room
 *   (R-10). A unique index allows one hold row per order (R-11). The cap check
 *   is one conditional statement over the day's total and the open payment
 *   attempts, so racing requests cannot jointly pass the cap. For a test pass
 *   the order row and the hold row are one D1 batch, and the order row is only
 *   written when the hold row exists.
 * - Every paid call for an order first writes a row of kind `order_call` with
 *   its upper-bound cost. It is ONE conditional insert that succeeds only if
 *   the order's hold is not settled, the order is in a state that allows the
 *   call, and the order's call total plus this reservation fits inside the
 *   amount in the order's own hold row. `order_call` rows are left out of the
 *   daily sum, so nothing counts twice and no later day's cap stops the order.
 * - After the call a row is settled to the actual cost. A call whose cost is
 *   unknown (failure, dropped connection) is never settled and keeps its whole
 *   reservation held.
 * - When the order ends, one batch changes its state and settles the hold row
 *   to the sum of its call rows; the rest returns to the creation day's cap.
 */

/** A statement bound to its values: the slice of a D1 prepared statement used. */
export interface SpendStatement {
  run(): Promise<{ meta?: { changes?: number } }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

/** The slice of a D1 database this ledger uses. */
export interface SpendDb {
  prepare(sql: string): { bind(...values: unknown[]): SpendStatement };
  /** All statements in one transaction: all are applied or none are. */
  batch(
    statements: SpendStatement[],
  ): Promise<Array<{ meta?: { changes?: number } }>>;
}

export const SPEND_UNITS_PER_USD = 100_000_000;

export function usdToUnits(usd: number): number {
  // Round away float noise first, then round up so a reservation never
  // understates the cost.
  return Math.ceil(Math.round(usd * 1e12) / 1e4);
}

export type SpendLedgerErrorCode =
  | "limit_reached"
  | "unavailable"
  /** The order's own hold would be passed. */
  | "order_limit"
  /** No such order, wrong state for this call, or the hold is settled. */
  | "order_refused";

export class SpendLedgerError extends Error {
  constructor(
    readonly code: SpendLedgerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SpendLedgerError";
  }
}

export const TERMINAL_ORDER_STATES = [
  "delivered",
  "failed",
  "expired",
] as const;
export type OrderState =
  "open" | "running" | "reporting" | (typeof TERMINAL_ORDER_STATES)[number];

/** R-03: the order states in which each paid call is allowed. Question
 * writing is the browser's call; observations and the report are the
 * runner's. */
export const ORDER_STAGE_STATES: Record<string, readonly OrderState[]> = {
  extract: ["open"],
  questions: ["open"],
  observation: ["running"],
  report: ["reporting"],
};

/** Literal SQL list from a constant array (never from user input). */
function inList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(", ");
}

const utcDay = (at: Date) => at.toISOString().slice(0, 10);

const DAILY_SUM = (day: string) =>
  `(SELECT COALESCE(SUM(held_units), 0) FROM provider_spend WHERE day = ${day} AND kind != 'order_call')`;
const CALL_SUM = (id: string) =>
  `(SELECT COALESCE(SUM(held_units), 0) FROM provider_spend WHERE kind = 'order_call' AND order_id = ${id})`;
const HOLD_AMOUNT = (id: string) =>
  `(SELECT reserved_units FROM provider_spend WHERE kind = 'order_hold' AND order_id = ${id})`;

/** R-10 as one SQL condition, for a conditional insert: today's cap total, plus
 * one order limit for every open payment attempt of any order (counted across
 * all days), plus one order limit for the order being admitted, is within the
 * daily cap. The three arguments are SQL parameters (for example `?2`). */
export function capRoomSql(parameters: {
  day: string;
  limitUnits: string;
  dailyLimitUnits: string;
}): string {
  return `(${DAILY_SUM(parameters.day)}
    + (SELECT COUNT(*) FROM payment_attempts WHERE status = 'open') * ${parameters.limitUnits}
    + ${parameters.limitUnits} <= ${parameters.dailyLimitUnits})`;
}

/** R-10: is there room for one more order limit today? One query. Only the
 * tests use it, to read the cap. The start route does not call it: the attempt
 * insert carries `capRoomSql` itself, so two racing requests cannot both pass. */
export async function hasCapRoom(
  db: SpendDb,
  input: { now: Date; limitUnits: number; dailyLimitUnits: number },
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT ${capRoomSql({ day: "?1", limitUnits: "?2", dailyLimitUnits: "?3" })} AS room`,
    )
    .bind(utcDay(input.now), input.limitUnits, input.dailyLimitUnits)
    .first<{ room: number }>();
  return row?.room === 1;
}

const TERMINAL_STATES_SQL = inList(TERMINAL_ORDER_STATES);

/**
 * R-11: the statement that reserves one order's hold on the UTC day of `now`.
 * It writes nothing when the order already has a hold (once per order), is not
 * a live order, or has ended. With `dailyLimitUnits` it also writes nothing
 * unless the cap has room (R-10: the test pass); with `null` it ignores the cap
 * (a paid customer's hold, even if the cap is now full). `test` marks the row
 * (R-20). For a batch that also marks the order paid or revives it, put this
 * statement AFTER the order update, so it sees the order's new state.
 */
export function orderHoldStatement(
  db: SpendDb,
  input: {
    orderId: string;
    now: Date;
    limitUnits: number;
    dailyLimitUnits: number | null;
    test: boolean;
    /** Only when the order was just marked paid by this transaction (R-11), so
     * a batch whose mark-paid write did nothing writes no hold. */
    paidTransactionId?: string;
  },
): SpendStatement {
  return db
    .prepare(
      `INSERT INTO provider_spend
         (id, day, status, provider, stage, reserved_units, held_units, created_at, kind, order_id, test)
       SELECT ?1, ?2, 'reserved', 'nuave', 'order_hold', ?3, ?3, ?4, 'order_hold', ?5, ?6
       WHERE EXISTS (SELECT 1 FROM orders
                     WHERE id = ?5 AND mode = 'live'
                       AND state NOT IN (${TERMINAL_STATES_SQL}))
         AND NOT EXISTS (SELECT 1 FROM provider_spend
                         WHERE kind = 'order_hold' AND order_id = ?5)
         AND (?7 IS NULL OR ${capRoomSql({ day: "?2", limitUnits: "?3", dailyLimitUnits: "?7" })})
         AND (?8 IS NULL OR EXISTS (SELECT 1 FROM orders
                                    WHERE id = ?5 AND paid_transaction_id = ?8))`,
    )
    .bind(
      crypto.randomUUID(),
      utcDay(input.now),
      input.limitUnits,
      input.now.toISOString(),
      input.orderId,
      input.test ? 1 : 0,
      input.dailyLimitUnits,
      input.paidTransactionId ?? null,
    );
}

export type OrderHoldResult =
  /** The hold row was written. */
  | "reserved"
  /** The order already had its hold: nothing changed. */
  | "already_held"
  /** The cap check was asked for and there is no room. */
  | "cap_full"
  /** No such live order, or it has ended. */
  | "order_refused";

/** `orderHoldStatement` run on its own, with the reason for a no-op. */
export async function reserveOrderHold(
  db: SpendDb,
  input: Parameters<typeof orderHoldStatement>[1],
): Promise<OrderHoldResult> {
  const result = await orderHoldStatement(db, input).run();
  if (result.meta?.changes === 1) return "reserved";
  const row = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM provider_spend
            WHERE kind = 'order_hold' AND order_id = ?1) AS held,
         (SELECT COUNT(*) FROM orders
            WHERE id = ?1 AND mode = 'live'
              AND state NOT IN (${TERMINAL_STATES_SQL})) AS live`,
    )
    .bind(input.orderId)
    .first<{ held: number; live: number }>();
  if (row?.held) return "already_held";
  return row?.live ? "cap_full" : "order_refused";
}

export type NewOrderRecord = {
  id: string;
  /** R-01: made by the server, unique through the index. */
  orderNumber: string;
  /** R-23: S4 code always sets one. `unpaid` holds nothing; `test` is the
   * founder test pass. */
  paymentKind: "unpaid" | "test";
  email: string;
  businessName: string;
  website: string;
  mode: "live" | "synthetic";
  environment: "production" | "preview";
  createdAt: Date;
  expiresAt: Date;
  /** R-19: the older order this one replaces, if any. */
  replacing?: { orderId: string };
};

export type CreateOrderResult =
  /** The order was written. */
  | "created"
  /** A test pass that found no room in the daily cap (R-10). */
  | "cap_full"
  /** R-19: the replaced order is paid or has an open or unknown payment
   * attempt, so nothing was written. */
  | "previous_active";

/** R-19: an older order that cannot be replaced: paid (kind midtrans or
 * simulated) or with an open payment attempt. Q14: also one with an attempt
 * closed as unknown (R-06) until support closes it as unpaid. `p` is the older
 * order's alias. */
const PREVIOUS_ACTIVE = `(p.payment_kind IN ('midtrans', 'simulated')
  OR EXISTS (SELECT 1 FROM payment_attempts a
             WHERE a.order_id = p.id AND a.status IN ('open', 'closed_unknown')))`;

/**
 * Write the order, and for a test pass its hold, as one batch (R-08, R-10,
 * R-20). A hold is written only when `hold` is given; the caller gives one for
 * a live test pass and never for an `unpaid` order (AC-10). The hold insert
 * checks the cap with open attempts counted (R-10), and the order row is only
 * written when the hold row exists. Synthetic orders write no ledger row.
 *
 * R-19, in the same batch: with `replacing`, an older `unpaid` order is marked
 * replaced and, if still open, ended; an older test-pass or legacy order that is
 * still open is ended first and its hold returns (as S3 did), so the room it
 * frees counts for the new order; anything else started or ended is left alone.
 * If the older order is paid, has an open attempt or an attempt closed as
 * unknown (Q14), the new order is not written at all ("previous_active").
 */
export async function createOrderWithHold(
  db: SpendDb,
  order: NewOrderRecord,
  hold: { limitUnits: number; dailyLimitUnits: number } | null,
): Promise<CreateOrderResult> {
  const created = order.createdAt.toISOString();
  const previous = order.replacing?.orderId ?? null;
  const guards: string[] = [];
  if (hold) {
    guards.push(
      `EXISTS (SELECT 1 FROM provider_spend WHERE kind = 'order_hold' AND order_id = ?1)`,
    );
  }
  if (previous) {
    guards.push(
      `NOT EXISTS (SELECT 1 FROM orders p
                   WHERE p.id = ?11 AND p.environment = ?8 AND ${PREVIOUS_ACTIVE})`,
    );
  }
  const insertOrder = db
    .prepare(
      `INSERT INTO orders
         (id, order_number, payment_kind, email, business_name, website, mode,
          environment, state, created_at, expires_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'open', ?9, ?10
       ${guards.length ? `WHERE ${guards.join(" AND ")}` : ""}`,
    )
    .bind(
      order.id,
      order.orderNumber,
      order.paymentKind,
      order.email,
      order.businessName,
      order.website,
      order.mode,
      order.environment,
      created,
      order.expiresAt.toISOString(),
      ...(previous ? [previous] : []),
    );
  const statements: SpendStatement[] = [];
  if (previous) statements.push(...releaseStatements(db, order, previous));
  if (hold) {
    statements.push(
      db
        .prepare(
          `INSERT INTO provider_spend
             (id, day, status, provider, stage, reserved_units, held_units, created_at, kind, order_id, test)
           SELECT ?1, ?2, 'reserved', 'nuave', 'order_hold', ?3, ?3, ?4, 'order_hold', ?5, ?7
           WHERE ${capRoomSql({ day: "?2", limitUnits: "?3", dailyLimitUnits: "?6" })}
             ${
               previous
                 ? `AND NOT EXISTS (SELECT 1 FROM orders p
                                    WHERE p.id = ?8 AND p.environment = ?9 AND ${PREVIOUS_ACTIVE})`
                 : ""
             }`,
        )
        .bind(
          crypto.randomUUID(),
          utcDay(order.createdAt),
          hold.limitUnits,
          created,
          order.id,
          hold.dailyLimitUnits,
          order.paymentKind === "test" ? 1 : 0,
          ...(previous ? [previous, order.environment] : []),
        ),
    );
  }
  const orderIndex = statements.length;
  statements.push(insertOrder);
  if (previous) {
    statements.push(...retireUnpaidStatements(db, order, previous));
  }
  const results = await db.batch(statements);
  if (results[orderIndex]?.meta?.changes === 1) return "created";
  if (previous && (await previousIsActive(db, previous, order.environment))) {
    return "previous_active";
  }
  return "cap_full";
}

/** R-19, as S3 did: a still-open test-pass or legacy order ends now and its hold
 * goes back to the daily cap, BEFORE the new order's own cap check, so the room
 * it frees counts. A started or ended one is left alone. These kinds can never
 * have an open payment attempt, so this never ends an order the new one may not
 * replace. */
function releaseStatements(
  db: SpendDb,
  order: NewOrderRecord,
  previous: string,
): SpendStatement[] {
  const at = order.createdAt.toISOString();
  return [
    db
      .prepare(
        `UPDATE orders SET state = 'expired', ended_at = ?3,
             lease_owner = NULL, lease_until = NULL,
             overrun = CASE
               WHEN ${CALL_SUM("?1")} > COALESCE(${HOLD_AMOUNT("?1")}, 0) THEN 1
               ELSE overrun END
         WHERE id = ?1 AND environment = ?2 AND state = 'open'
           AND (payment_kind IS NULL OR payment_kind = 'test')`,
      )
      .bind(previous, order.environment, at),
    db
      .prepare(
        `UPDATE provider_spend
         SET status = 'settled', held_units = ${CALL_SUM("?1")}, settled_at = ?3
         WHERE kind = 'order_hold' AND order_id = ?1 AND status = 'reserved'
           AND EXISTS (SELECT 1 FROM orders
                       WHERE id = ?1 AND environment = ?2
                         AND state IN (${TERMINAL_STATES_SQL}))`,
      )
      .bind(previous, order.environment, at),
  ];
}

/** R-19: an `unpaid` older order with no open attempt is marked replaced (also
 * when it has already expired, so a late payment on it becomes "needs refund")
 * and, if still open, ended. Both writes need the new order row to exist, so a
 * refused new order leaves the old one untouched. An unpaid order holds
 * nothing, so there is no hold to settle. */
function retireUnpaidStatements(
  db: SpendDb,
  order: NewOrderRecord,
  previous: string,
): SpendStatement[] {
  const at = order.createdAt.toISOString();
  const newExists = `EXISTS (SELECT 1 FROM orders WHERE id = ?1)`;
  return [
    db
      .prepare(
        `UPDATE orders SET replaced_by = ?1
         WHERE id = ?2 AND environment = ?3 AND payment_kind = 'unpaid'
           AND replaced_by IS NULL AND ${newExists}
           AND NOT EXISTS (SELECT 1 FROM payment_attempts a
                           WHERE a.order_id = ?2 AND a.status = 'open')`,
      )
      .bind(order.id, previous, order.environment),
    db
      .prepare(
        `UPDATE orders SET state = 'expired', ended_at = ?4
         WHERE id = ?2 AND environment = ?3 AND state = 'open'
           AND payment_kind = 'unpaid' AND replaced_by = ?1`,
      )
      .bind(order.id, previous, order.environment, at),
  ];
}

async function previousIsActive(
  db: SpendDb,
  previous: string,
  environment: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS active FROM orders p
       WHERE p.id = ?1 AND p.environment = ?2 AND ${PREVIOUS_ACTIVE}`,
    )
    .bind(previous, environment)
    .first<{ active: number }>();
  return row?.active === 1;
}

export type OrderCallReservation = {
  /** Replace the reservation with the actual cost. Best effort: if this
   * fails the full reservation simply stays held (the safe direction). */
  settle(actualUsd: number): Promise<void>;
};

/** R-09: reserve one paid call against an order, or throw SpendLedgerError. */
export async function reserveOrderCall(
  db: SpendDb,
  input: {
    orderId: string;
    provider: string;
    stage: string;
    usd: number;
    now?: () => Date;
  },
): Promise<OrderCallReservation> {
  const now = input.now ?? (() => new Date());
  const states = ORDER_STAGE_STATES[input.stage];
  if (!states) {
    throw new SpendLedgerError("order_refused", "stage not allowed for orders");
  }
  const id = crypto.randomUUID();
  const at = now();
  const units = usdToUnits(input.usd);
  // R-18: the insert below needs a paid, test-pass or legacy order (an unpaid
  // order has no hold either), and R-20: a test-pass order's rows are marked.
  let changes: unknown;
  try {
    const result = await db
      .prepare(
        `INSERT INTO provider_spend
           (id, day, status, provider, stage, reserved_units, held_units, created_at, kind, order_id, test)
         SELECT ?1, ?2, 'reserved', ?3, ?4, ?5, ?5, ?6, 'order_call', ?7,
                COALESCE((SELECT 1 FROM orders WHERE id = ?7 AND payment_kind = 'test'), 0)
         WHERE EXISTS (
                 SELECT 1 FROM orders
                 WHERE id = ?7 AND mode = 'live' AND state IN (${inList(states)})
                   AND (payment_kind IS NULL OR payment_kind IN ('midtrans', 'test'))
                   AND (deadline_at IS NULL OR deadline_at > ?6))
           AND EXISTS (
                 SELECT 1 FROM provider_spend
                 WHERE kind = 'order_hold' AND order_id = ?7 AND status = 'reserved')
           AND ${CALL_SUM("?7")} + ?5 <= ${HOLD_AMOUNT("?7")}`,
      )
      .bind(
        id,
        utcDay(at),
        input.provider,
        input.stage,
        units,
        at.toISOString(),
        input.orderId,
      )
      .run();
    changes = result.meta?.changes;
  } catch {
    throw new SpendLedgerError("unavailable", "spend ledger unavailable");
  }
  if (changes === 0) {
    throw new SpendLedgerError(
      await classifyOrderRefusal(db, input.orderId, states, at),
      "order call refused",
    );
  }
  if (changes !== 1) {
    throw new SpendLedgerError("unavailable", "spend ledger unavailable");
  }
  return {
    async settle(actualUsd: number) {
      try {
        await db.batch([
          db
            .prepare(
              `UPDATE provider_spend SET status = 'settled', held_units = ?2, settled_at = ?3
               WHERE id = ?1 AND status = 'reserved'`,
            )
            .bind(id, usdToUnits(actualUsd), now().toISOString()),
          // R-11: a call may cost more than its reservation. Flag the order
          // when its total passes its hold.
          db
            .prepare(
              `UPDATE orders SET overrun = 1
               WHERE id = ?1 AND ${CALL_SUM("?1")} > COALESCE(${HOLD_AMOUNT("?1")}, 0)`,
            )
            .bind(input.orderId),
          // A call that finishes after the order ended keeps the settled
          // hold equal to the sum of its calls.
          db
            .prepare(
              `UPDATE provider_spend SET held_units = ${CALL_SUM("?1")}
               WHERE kind = 'order_hold' AND order_id = ?1 AND status = 'settled'`,
            )
            .bind(input.orderId),
        ]);
      } catch {
        // keep the reservation held
      }
    },
  };
}

async function classifyOrderRefusal(
  db: SpendDb,
  orderId: string,
  allowed: readonly OrderState[],
  at: Date,
): Promise<SpendLedgerErrorCode> {
  try {
    const row = await db
      .prepare(
        `SELECT o.state AS state, o.mode AS mode, o.deadline_at AS deadline_at,
                o.payment_kind AS payment_kind, h.status AS hold_status
         FROM orders o
         LEFT JOIN provider_spend h ON h.kind = 'order_hold' AND h.order_id = o.id
         WHERE o.id = ?1`,
      )
      .bind(orderId)
      .first<{
        state: string;
        mode: string;
        deadline_at: string | null;
        payment_kind: string | null;
        hold_status: string | null;
      }>();
    if (
      !row ||
      row.mode !== "live" ||
      (row.payment_kind !== null &&
        row.payment_kind !== "midtrans" &&
        row.payment_kind !== "test") ||
      !allowed.includes(row.state as OrderState) ||
      row.hold_status !== "reserved" ||
      // Past its deadline no more paid calls are allowed.
      (row.deadline_at !== null && row.deadline_at <= at.toISOString())
    ) {
      return "order_refused";
    }
    return "order_limit";
  } catch {
    return "unavailable";
  }
}

/**
 * R-10: end an order in one batch. The state changes only from one of the
 * `from` states (so it happens once), and for a live order the hold row is
 * settled to the sum of its call rows. Returns true when this call ended it.
 */
export async function endOrder(
  db: SpendDb,
  input: {
    orderId: string;
    from: readonly OrderState[];
    to: (typeof TERMINAL_ORDER_STATES)[number];
    failureCode?: string;
    /** For `failed`: in the same batch, clear a link hash whose ready email
     * was never accepted (spec 016 R-24). */
    clearUndeliveredLink?: boolean;
    /** R-07: the unpaid-order ending. The write re-checks, in the same
     * statement, that the order is still unpaid, its end time has passed and no
     * payment attempt is open, so a payment applied a moment earlier is never
     * undone. */
    onlyIfUnpaidPastEnd?: boolean;
    /** Statements that ride in the same batch after the ending write (for
     * example a founder notice, R-21). Each must guard itself on the order's
     * new state. */
    alsoRun?: SpendStatement[];
    now?: () => Date;
  },
): Promise<boolean> {
  const at = (input.now ?? (() => new Date()))().toISOString();
  const results = await db.batch([
    db
      .prepare(
        `UPDATE orders
         SET state = ?2, ended_at = ?3, failure_code = ?4,
             lease_owner = NULL, lease_until = NULL,
             overrun = CASE
               WHEN ${CALL_SUM("?1")} > COALESCE(${HOLD_AMOUNT("?1")}, 0) THEN 1
               ELSE overrun END
         WHERE id = ?1 AND state IN (${inList(input.from)})
           ${
             input.onlyIfUnpaidPastEnd
               ? `AND paid_at IS NULL AND expires_at <= ?3
                  AND NOT EXISTS (SELECT 1 FROM payment_attempts a
                                  WHERE a.order_id = ?1 AND a.status = 'open')`
               : ""
           }`,
      )
      .bind(input.orderId, input.to, at, input.failureCode ?? null),
    db
      .prepare(
        `UPDATE provider_spend
         SET status = 'settled', held_units = ${CALL_SUM("?1")}, settled_at = ?2
         WHERE kind = 'order_hold' AND order_id = ?1 AND status = 'reserved'
           AND EXISTS (SELECT 1 FROM orders
                       WHERE id = ?1 AND state IN (${inList(TERMINAL_ORDER_STATES)}))`,
      )
      .bind(input.orderId, at),
    ...(input.clearUndeliveredLink
      ? [
          db
            .prepare(
              `UPDATE orders SET link_hash = NULL
               WHERE id = ?1 AND state = 'failed' AND link_hash IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM order_emails e
                                 WHERE e.order_id = ?1 AND e.kind = 'ready'
                                   AND e.result = 'accepted')`,
            )
            .bind(input.orderId),
        ]
      : []),
    ...(input.alsoRun ?? []),
  ]);
  return results[0]?.meta?.changes === 1;
}
