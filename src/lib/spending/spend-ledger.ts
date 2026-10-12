/**
 * Server-side daily spend ledger on Cloudflare D1 (plan S2).
 *
 * Every paid provider call first reserves its upper-bound cost with ONE
 * conditional INSERT that checks today's (UTC) total in the same statement, so
 * racing requests cannot jointly exceed the limit. After the call, the row is
 * settled to the actual cost. A call whose cost is unknown (failure, dropped
 * connection) is never settled and keeps its whole reservation held.
 *
 * Money is stored as integer units: 1 USD = 100,000,000 units.
 */

/** The slice of a D1 database this ledger uses. */
export interface SpendDb {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
}

export const SPEND_UNITS_PER_USD = 100_000_000;

export function usdToUnits(usd: number): number {
  // Round away float noise first, then round up so a reservation never
  // understates the cost.
  return Math.ceil(Math.round(usd * 1e12) / 1e4);
}

export class SpendLedgerError extends Error {
  constructor(
    readonly code: "limit_reached" | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "SpendLedgerError";
  }
}

export type SpendLedger = ReturnType<typeof createSpendLedger>;

export function createSpendLedger(
  db: SpendDb,
  options: { limitUsd: number; now?: () => Date },
) {
  const limitUnits = usdToUnits(options.limitUsd);
  const now = options.now ?? (() => new Date());
  let ready: Promise<void> | null = null;

  function ensureTable() {
    ready ??= (async () => {
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS provider_spend (
            id TEXT PRIMARY KEY,
            day TEXT NOT NULL,
            status TEXT NOT NULL,
            provider TEXT NOT NULL,
            stage TEXT NOT NULL,
            reserved_units INTEGER NOT NULL,
            held_units INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            settled_at TEXT
          )`,
        )
        .bind()
        .run();
      await db
        .prepare(
          "CREATE INDEX IF NOT EXISTS provider_spend_day ON provider_spend(day)",
        )
        .bind()
        .run();
    })().catch((error) => {
      ready = null;
      throw error;
    });
    return ready;
  }

  return {
    /** Reserve `usd` against today's limit, or throw SpendLedgerError. */
    async reserve(input: { provider: string; stage: string; usd: number }) {
      const id = crypto.randomUUID();
      const at = now();
      const units = usdToUnits(input.usd);
      let changes: unknown;
      try {
        await ensureTable();
        const result = await db
          .prepare(
            `INSERT INTO provider_spend
               (id, day, status, provider, stage, reserved_units, held_units, created_at)
             SELECT ?1, ?2, 'reserved', ?3, ?4, ?5, ?5, ?6
             WHERE (SELECT COALESCE(SUM(held_units), 0) FROM provider_spend WHERE day = ?2) + ?5 <= ?7`,
          )
          .bind(
            id,
            at.toISOString().slice(0, 10),
            input.provider,
            input.stage,
            units,
            at.toISOString(),
            limitUnits,
          )
          .run();
        changes = result.meta?.changes;
      } catch {
        throw new SpendLedgerError("unavailable", "spend ledger unavailable");
      }
      if (changes === 0) {
        throw new SpendLedgerError(
          "limit_reached",
          "daily spend limit reached",
        );
      }
      if (changes !== 1) {
        throw new SpendLedgerError("unavailable", "spend ledger unavailable");
      }
      return {
        /** Replace the reservation with the actual cost. Best effort: if this
         * fails the full reservation simply stays held (the safe direction). */
        async settle(actualUsd: number) {
          try {
            await db
              .prepare(
                `UPDATE provider_spend SET status = 'settled', held_units = ?2, settled_at = ?3
                 WHERE id = ?1 AND status = 'reserved'`,
              )
              .bind(id, usdToUnits(actualUsd), now().toISOString())
              .run();
          } catch {
            // keep the reservation held
          }
        },
      };
    },
  };
}
