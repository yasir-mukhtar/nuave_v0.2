/**
 * Server-side spend ledger on Cloudflare D1 (plan S2, spec 016 per-order limit).
 *
 * Money is stored as integer units: 1 USD = 100,000,000 units.
 *
 * Live orders only (synthetic orders make no paid call and write no rows):
 *
 * - Making an order writes ONE ledger row of kind `order_hold` that holds the
 *   per-order limit against the daily cap of the creation day (UTC). The hold
 *   insert is one conditional statement that checks the day's total, so racing
 *   requests cannot jointly pass the cap. The order row and the hold row are
 *   one D1 batch, and the order row is only written when the hold row exists.
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

const DAILY_SUM = `(SELECT COALESCE(SUM(held_units), 0) FROM provider_spend WHERE day = ?2 AND kind != 'order_call')`;
const CALL_SUM = (id: string) =>
  `(SELECT COALESCE(SUM(held_units), 0) FROM provider_spend WHERE kind = 'order_call' AND order_id = ${id})`;
const HOLD_AMOUNT = (id: string) =>
  `(SELECT reserved_units FROM provider_spend WHERE kind = 'order_hold' AND order_id = ${id})`;

export type NewOrderRecord = {
  id: string;
  email: string;
  businessName: string;
  website: string;
  mode: "live" | "synthetic";
  environment: "production" | "preview";
  createdAt: Date;
  expiresAt: Date;
};

export type CreateOrderResult = "created" | "cap_full";

/**
 * R-08: write the order, and for a live order its hold, as one batch.
 * Synthetic orders hold nothing and write no ledger row.
 */
export async function createOrderWithHold(
  db: SpendDb,
  order: NewOrderRecord,
  hold: { limitUnits: number; dailyLimitUnits: number } | null,
): Promise<CreateOrderResult> {
  const created = order.createdAt.toISOString();
  const insertOrder = (guard: string) =>
    db
      .prepare(
        `INSERT INTO orders
           (id, email, business_name, website, mode, environment, state, created_at, expires_at)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, 'open', ?7, ?8 ${guard}`,
      )
      .bind(
        order.id,
        order.email,
        order.businessName,
        order.website,
        order.mode,
        order.environment,
        created,
        order.expiresAt.toISOString(),
      );
  if (!hold) {
    const [result] = await db.batch([insertOrder("")]);
    return result.meta?.changes === 1 ? "created" : "cap_full";
  }
  const holdInsert = db
    .prepare(
      `INSERT INTO provider_spend
         (id, day, status, provider, stage, reserved_units, held_units, created_at, kind, order_id)
       SELECT ?1, ?2, 'reserved', 'nuave', 'order_hold', ?3, ?3, ?4, 'order_hold', ?5
       WHERE ${DAILY_SUM} + ?3 <= ?6`,
    )
    .bind(
      crypto.randomUUID(),
      utcDay(order.createdAt),
      hold.limitUnits,
      created,
      order.id,
      hold.dailyLimitUnits,
    );
  const results = await db.batch([
    holdInsert,
    insertOrder(
      `WHERE EXISTS (SELECT 1 FROM provider_spend WHERE kind = 'order_hold' AND order_id = ?1)`,
    ),
  ]);
  return results[1]?.meta?.changes === 1 ? "created" : "cap_full";
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
  let changes: unknown;
  try {
    const result = await db
      .prepare(
        `INSERT INTO provider_spend
           (id, day, status, provider, stage, reserved_units, held_units, created_at, kind, order_id)
         SELECT ?1, ?2, 'reserved', ?3, ?4, ?5, ?5, ?6, 'order_call', ?7
         WHERE EXISTS (
                 SELECT 1 FROM orders
                 WHERE id = ?7 AND mode = 'live' AND state IN (${inList(states)})
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
                h.status AS hold_status
         FROM orders o
         LEFT JOIN provider_spend h ON h.kind = 'order_hold' AND h.order_id = o.id
         WHERE o.id = ?1`,
      )
      .bind(orderId)
      .first<{
        state: string;
        mode: string;
        deadline_at: string | null;
        hold_status: string | null;
      }>();
    if (
      !row ||
      row.mode !== "live" ||
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
         WHERE id = ?1 AND state IN (${inList(input.from)})`,
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
  ]);
  return results[0]?.meta?.changes === 1;
}
