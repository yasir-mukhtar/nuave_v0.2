import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SpendDb } from "./spend-ledger";

// @types/node here predates node:sqlite, so load it untyped and describe the
// small slice used.
type Row = Record<string, unknown>;
type SqlValue = string | number | null;
type Statement = {
  run(...values: SqlValue[]): { changes: number | bigint };
  get(...values: SqlValue[]): Row | undefined;
  all(...values: SqlValue[]): Row[];
};
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
  };
};

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

/** Apply every `migrations/*.sql` file not yet applied, in name order, like
 * `wrangler d1 migrations apply`. The test database is therefore built by
 * the same files production uses. */
function applyMigrations(
  sqlite: { exec(sql: string): void; prepare(sql: string): Statement },
  upTo?: string,
) {
  sqlite.exec(
    "CREATE TABLE IF NOT EXISTS d1_migrations (name TEXT PRIMARY KEY)",
  );
  const applied = new Set(
    sqlite
      .prepare("SELECT name FROM d1_migrations")
      .all()
      .map((row) => String(row.name)),
  );
  for (const name of readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    if (upTo && name > upTo) break;
    if (applied.has(name)) continue;
    sqlite.exec(readFileSync(join(MIGRATIONS_DIR, name), "utf8"));
    sqlite.prepare("INSERT INTO d1_migrations (name) VALUES (?)").run(name);
  }
}

/** Offline stand-in for a D1 binding, backed by a real SQLite FILE so a
 * "restart" is: close it, open the same path again. Test use only.
 *
 * `batch` runs its statements in one transaction and rolls all of them back
 * if one throws, like D1. */
export function openFileD1(
  path: string,
  options: { migrate?: boolean; upTo?: string } = {},
) {
  const sqlite = new DatabaseSync(path);
  if (options.migrate !== false) applyMigrations(sqlite, options.upTo);
  type Bound = {
    run(): Promise<{ meta: { changes: number } }>;
    first<T = Row>(): Promise<T | null>;
    all<T = Row>(): Promise<{ results: T[] }>;
    runSync(): { meta: { changes: number } };
  };
  const db: SpendDb & {
    prepare(sql: string): { bind(...values: unknown[]): Bound };
  } = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...values: unknown[]): Bound {
          const params = values as SqlValue[];
          const runSync = () => ({
            meta: { changes: Number(statement.run(...params).changes) },
          });
          return {
            runSync,
            async run() {
              return runSync();
            },
            async first<T = Row>() {
              return (statement.get(...params) as T | undefined) ?? null;
            },
            async all<T = Row>() {
              return { results: statement.all(...params) as T[] };
            },
          };
        },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) =>
          (statement as unknown as Bound).runSync(),
        );
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return {
    db,
    heldUnitsToday(day: string) {
      const row = sqlite
        .prepare(
          "SELECT COALESCE(SUM(held_units), 0) AS total FROM provider_spend WHERE day = ? AND kind != 'order_call'",
        )
        .get(day) as { total: number };
      return Number(row.total);
    },
    /** Direct read for assertions. */
    query<T = Row>(sql: string, ...values: SqlValue[]): T[] {
      return sqlite.prepare(sql).all(...values) as T[];
    },
    /** Apply the remaining migrations (used to test an upgrade). */
    migrate() {
      applyMigrations(sqlite);
    },
    close() {
      sqlite.close();
    },
  };
}
