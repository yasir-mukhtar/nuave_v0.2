import { createRequire } from "node:module";
import type { SpendDb } from "./spend-ledger";

// @types/node here predates node:sqlite, so load it untyped and describe the
// small slice used.
type Row = Record<string, unknown>;
type Statement = {
  run(...values: (string | number | null)[]): { changes: number | bigint };
  get(...values: (string | number | null)[]): Row | undefined;
};
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => {
    prepare(sql: string): Statement;
    close(): void;
  };
};

/** Offline stand-in for a D1 binding, backed by a real SQLite FILE so a
 * "restart" is: close it, open the same path again. Test use only. */
export function openFileD1(path: string) {
  const sqlite = new DatabaseSync(path);
  const db: SpendDb = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              const result = statement.run(
                ...(values as (string | number | null)[]),
              );
              return { meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  };
  return {
    db,
    heldUnitsToday(day: string) {
      const row = sqlite
        .prepare(
          "SELECT COALESCE(SUM(held_units), 0) AS total FROM provider_spend WHERE day = ?",
        )
        .get(day) as { total: number };
      return Number(row.total);
    },
    close() {
      sqlite.close();
    },
  };
}
