// S2 durable dispatch barrier tests. These mirror the parent-frozen offline
// proof cases on a REAL local node:sqlite database behind a minimal
// D1-shaped adapter — they are not D1, production or provider proof. All SQL,
// monetary values and fixtures come from the parent-authored artifacts; the
// primitive under test adds no storage setup, HTTP or pricing behavior of
// its own.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACQUIRE_DISPATCH_BARRIER_SQL,
  DISPATCH_BARRIER_SCHEMA,
  INITIALIZE_DISPATCH_BARRIER_SQL,
  MARK_DISPATCH_STARTED_SQL,
  READ_DISPATCH_BARRIER_SQL,
  READ_SPEND_SQL,
  RELEASE_ACCOUNTED_DISPATCH_SQL,
  RELEASE_UNSTARTED_DISPATCH_SQL,
  RESERVE_SPEND_SQL,
  SETTLE_DISPATCH_SQL,
  SPEND_LEDGER_SCHEMA,
} from "./ledger-sql";
import {
  ProviderDispatchBarrier,
  ProviderDispatchBarrierUnavailableError,
  type DispatchBarrierDatabase,
  type DispatchBarrierStatement,
} from "./dispatch-barrier";

// node:sqlite is a real Node 22 builtin but the installed @types/node@20 does
// not declare it; load it as a builtin through createRequire and give the
// used surface an explicit local shape.
interface SqliteStatement {
  all(...params: Array<string | number | null>): unknown[];
  run(...params: Array<string | number | null>): unknown;
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

const loadBuiltin = createRequire(import.meta.url);
const { DatabaseSync } = loadBuiltin("node:sqlite") as {
  DatabaseSync: new (path: string) => SqliteDatabase;
};

const UNAVAILABLE_MESSAGE = "Provider dispatch storage is unavailable.";

// D1-shaped adapter over a real local SQLite connection. `prepare` compiles
// eagerly so a missing table fails exactly like a bad remote response, and
// `all` keeps a real async boundary while statement errors reject.
class SqliteBarrierDatabase implements DispatchBarrierDatabase {
  constructor(private readonly sqlite: SqliteDatabase) {}

  prepare(query: string): DispatchBarrierStatement {
    const statement = this.sqlite.prepare(query);
    let bound: Array<string | number | null> = [];
    const adapter: DispatchBarrierStatement = {
      bind(...values: Array<string | number | null>) {
        bound = values;
        return adapter;
      },
      async all<T = unknown>() {
        await Promise.resolve();
        const results = statement.all(...bound) as T[];
        return { success: true, results };
      },
    };
    return adapter;
  }
}

// Recording stub used ONLY for boundary/negative cases: malformed D1-shaped
// responses, thrown storage errors and statement-wiring checks. Positive
// behavior is proven against the real SQLite adapter above.
type StubResult = { response: unknown } | { error: unknown };

class RecordingDatabase implements DispatchBarrierDatabase {
  readonly queries: string[] = [];
  readonly boundValues: Array<Array<string | number | null>> = [];
  private readonly queue: StubResult[];

  constructor(queue: StubResult[]) {
    this.queue = [...queue];
  }

  prepare(query: string): DispatchBarrierStatement {
    this.queries.push(query);
    const statement: DispatchBarrierStatement = {
      bind: (...values: Array<string | number | null>) => {
        this.boundValues.push(values);
        return statement;
      },
      all: async <T = unknown>(): Promise<{
        success?: boolean;
        results?: T[];
        error?: string;
      }> => {
        await Promise.resolve();
        const next = this.queue.shift();
        if (next === undefined) {
          return { success: true, results: [] };
        }
        if ("error" in next) {
          throw next.error;
        }
        return next.response as {
          success?: boolean;
          results?: T[];
          error?: string;
        };
      },
    };
    return statement;
  }
}

// Parent-authorized fixture literals. The injected failure trigger lives only
// inside a test-owned connection; the legacy insert seeds a single unsettled
// historical row for the initialization-refusal case.
const INJECT_SETTLEMENT_FAILURE_SQL = `
CREATE TEMP TABLE injected_failure (enabled INTEGER NOT NULL);
INSERT INTO injected_failure VALUES (1);
CREATE TEMP TRIGGER block_settle BEFORE UPDATE ON nuave_provider_spend WHEN NEW.status='settled' AND (SELECT enabled FROM injected_failure)=1 BEGIN SELECT RAISE(ABORT,'synthetic settlement storage failure'); END;
`;

const LEGACY_UNSETTLED_INSERT_SQL = `
INSERT INTO nuave_provider_spend (operation_id,provider,stage,pricing_version,reserved_day_utc,created_at,reservation_units,status) VALUES ('legacy','openai','observation','barrier-test',?, ?,40000000,'uncertain');
`;

const PROVIDER = "openai";
const STAGE = "observation";
const PRICING_VERSION = "barrier-test";

// Parent-authorized fixture clock lookup: read the database UTC day once per
// fresh database so reserve/settle bindings match the engine's own day.
// This is a test fixture lookup, never a production query.
const databaseUtcDay = (sqlite: SqliteDatabase): string => {
  const rows = sqlite.prepare("SELECT date('now') AS day").all() as Array<{
    day: string;
  }>;
  return rows[0].day;
};

const nextUtcDay = (day: string): string => {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const provisionStorage = (sqlite: SqliteDatabase): void => {
  sqlite.exec(SPEND_LEDGER_SCHEMA);
  sqlite.exec(DISPATCH_BARRIER_SCHEMA);
};

const initializeBarrier = (sqlite: SqliteDatabase): unknown[] =>
  sqlite.prepare(INITIALIZE_DISPATCH_BARRIER_SQL).all();

interface Fixture {
  sqlite: SqliteDatabase;
  database: SqliteBarrierDatabase;
  barrier: ProviderDispatchBarrier;
  day: string;
  reserveIso: string;
  settleIso: string;
}

const createFixture = (): Fixture => {
  const sqlite = new DatabaseSync(":memory:");
  provisionStorage(sqlite);
  expect(initializeBarrier(sqlite)).toHaveLength(1);
  const day = databaseUtcDay(sqlite);
  const database = new SqliteBarrierDatabase(sqlite);
  return {
    sqlite,
    database,
    barrier: new ProviderDispatchBarrier(database),
    day,
    reserveIso: `${day}T10:00:00.000Z`,
    settleIso: `${day}T10:01:00.000Z`,
  };
};

const runFixtureQuery = async (
  database: DispatchBarrierDatabase,
  sql: string,
  values: Array<string | number | null>,
): Promise<unknown[]> => {
  const response = await database
    .prepare(sql)
    .bind(...values)
    .all();
  if (response.success !== true || !Array.isArray(response.results)) {
    throw new Error("fixture query failed");
  }
  return response.results;
};

// Original ten reserve bindings: operation, provider, stage, pricing, day,
// captured ISO time, amount, amount, day, amount.
const reserveSpend = (
  database: DispatchBarrierDatabase,
  operationId: string,
  units: number,
  day: string,
  createdAt: string,
): Promise<unknown[]> =>
  runFixtureQuery(database, RESERVE_SPEND_SQL, [
    operationId,
    PROVIDER,
    STAGE,
    PRICING_VERSION,
    day,
    createdAt,
    units,
    units,
    day,
    units,
  ]);

const markDispatchStarted = (
  database: DispatchBarrierDatabase,
  operationId: string,
): Promise<unknown[]> =>
  runFixtureQuery(database, MARK_DISPATCH_STARTED_SQL, [operationId]);

const settleDispatch = (
  database: DispatchBarrierDatabase,
  operationId: string,
  actualUnits: number,
  responseId: string,
  settledAt: string,
): Promise<unknown[]> =>
  runFixtureQuery(database, SETTLE_DISPATCH_SQL, [
    actualUnits,
    responseId,
    settledAt,
    operationId,
  ]);

const readSpend = async (
  database: DispatchBarrierDatabase,
  operationId: string,
): Promise<Record<string, unknown>[]> =>
  (await runFixtureQuery(database, READ_SPEND_SQL, [operationId])) as Record<
    string,
    unknown
  >[];

describe("missing initialized barrier", () => {
  it("denies reservation and read while the singleton row is absent", async () => {
    const sqlite = new DatabaseSync(":memory:");
    provisionStorage(sqlite);
    const day = databaseUtcDay(sqlite);
    const database = new SqliteBarrierDatabase(sqlite);
    const barrier = new ProviderDispatchBarrier(database);

    expect(
      await reserveSpend(
        database,
        "operation-a",
        1,
        day,
        `${day}T10:00:00.000Z`,
      ),
    ).toHaveLength(0);
    await expect(barrier.read()).rejects.toBeInstanceOf(
      ProviderDispatchBarrierUnavailableError,
    );
    await expect(barrier.acquire("operation-a")).rejects.toBeInstanceOf(
      ProviderDispatchBarrierUnavailableError,
    );
    sqlite.close();
  });

  it("runs no SQL from the constructor even when storage is missing", () => {
    let prepares = 0;
    const missing: DispatchBarrierDatabase = {
      prepare(): DispatchBarrierStatement {
        prepares += 1;
        throw new Error("storage missing");
      },
    };
    const barrier = new ProviderDispatchBarrier(missing);
    expect(barrier).toBeInstanceOf(ProviderDispatchBarrier);
    expect(prepares).toBe(0);
  });
});

describe("exclusive acquisition and dispatch start", () => {
  it("grants only one new acquisition and blocks every other path", async () => {
    const f = createFixture();
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: null,
    });

    expect(
      await reserveSpend(
        f.database,
        "operation-a",
        40_000_000,
        f.day,
        f.reserveIso,
      ),
    ).toHaveLength(1);
    expect(
      await reserveSpend(
        f.database,
        "operation-b",
        60_000_000,
        f.day,
        f.reserveIso,
      ),
    ).toHaveLength(1);

    await expect(f.barrier.acquire("operation-a")).resolves.toBe(true);
    // A matching ownership readback is never a new grant.
    await expect(f.barrier.acquire("operation-a")).resolves.toBe(false);
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: "operation-a",
    });
    await expect(f.barrier.acquire("operation-b")).resolves.toBe(false);

    expect(await markDispatchStarted(f.database, "operation-b")).toHaveLength(
      0,
    );
    expect(await markDispatchStarted(f.database, "operation-a")).toHaveLength(
      1,
    );
    expect((await readSpend(f.database, "operation-a"))[0]).toMatchObject({
      status: "uncertain",
      reservation_units: 40_000_000,
      actual_units: null,
    });
    // A duplicate start mark cannot authorize another dispatch.
    expect(await markDispatchStarted(f.database, "operation-a")).toHaveLength(
      0,
    );
    // An owner past dispatch start is no longer unstarted.
    await expect(f.barrier.releaseUnstarted("operation-a")).resolves.toBe(
      false,
    );
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: "operation-a",
    });
    // No new reservation fits while an owner is active.
    expect(
      await reserveSpend(f.database, "operation-c", 1, f.day, f.reserveIso),
    ).toHaveLength(0);
    f.sqlite.close();
  });
});

describe("post-dispatch settlement storage failure", () => {
  it("keeps the global barrier and the honest uncertain ledger", async () => {
    const f = createFixture();
    expect(
      await reserveSpend(
        f.database,
        "operation-a",
        40_000_000,
        f.day,
        f.reserveIso,
      ),
    ).toHaveLength(1);
    expect(
      await reserveSpend(
        f.database,
        "operation-b",
        60_000_000,
        f.day,
        f.reserveIso,
      ),
    ).toHaveLength(1);
    await expect(f.barrier.acquire("operation-a")).resolves.toBe(true);
    expect(await markDispatchStarted(f.database, "operation-a")).toHaveLength(
      1,
    );

    f.sqlite.exec(INJECT_SETTLEMENT_FAILURE_SQL);
    await expect(
      settleDispatch(
        f.database,
        "operation-a",
        60_000_000,
        "overrun-receipt",
        f.settleIso,
      ),
    ).rejects.toThrow();

    await expect(f.barrier.releaseAccounted("operation-a")).resolves.toBe(
      false,
    );
    await expect(f.barrier.acquire("operation-b")).resolves.toBe(false);
    expect(await markDispatchStarted(f.database, "operation-b")).toHaveLength(
      0,
    );
    expect(
      await reserveSpend(f.database, "operation-c", 1, f.day, f.reserveIso),
    ).toHaveLength(0);

    const rows = await readSpend(f.database, "operation-a");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: "uncertain",
      reservation_units: 40_000_000,
      actual_units: null,
      provider_response_id: null,
    });
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: "operation-a",
    });
    f.sqlite.close();
  });
});

describe("reopened snapshot persistence", () => {
  it("retains the owner across connections and never hides a stored overrun", async () => {
    // Own temp file under the git-ignored local evidence folder; the file is
    // intentionally preserved as run evidence and never deleted by the test.
    const dir = resolve(".local-evidence/s2-dispatch-barrier");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `reopen-${Date.now()}-${process.pid}.sqlite`);

    const first = new DatabaseSync(path);
    provisionStorage(first);
    expect(initializeBarrier(first)).toHaveLength(1);
    const firstDay = databaseUtcDay(first);
    const firstDb = new SqliteBarrierDatabase(first);
    const firstBarrier = new ProviderDispatchBarrier(firstDb);
    expect(
      await reserveSpend(
        firstDb,
        "operation-a",
        40_000_000,
        firstDay,
        `${firstDay}T10:00:00.000Z`,
      ),
    ).toHaveLength(1);
    expect(
      await reserveSpend(
        firstDb,
        "operation-b",
        60_000_000,
        firstDay,
        `${firstDay}T10:00:00.000Z`,
      ),
    ).toHaveLength(1);
    await expect(firstBarrier.acquire("operation-a")).resolves.toBe(true);
    expect(await markDispatchStarted(firstDb, "operation-a")).toHaveLength(1);
    first.exec(INJECT_SETTLEMENT_FAILURE_SQL);
    await expect(
      settleDispatch(
        firstDb,
        "operation-a",
        60_000_000,
        "overrun-receipt",
        `${firstDay}T10:01:00.000Z`,
      ),
    ).rejects.toThrow();
    first.close();

    // Fresh connection over the same snapshot file. Schema/init are NOT
    // re-executed over existing data.
    const sqlite = new DatabaseSync(path);
    const day = databaseUtcDay(sqlite);
    const database = new SqliteBarrierDatabase(sqlite);
    const barrier = new ProviderDispatchBarrier(database);

    await expect(barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: "operation-a",
    });
    await expect(barrier.acquire("operation-b")).resolves.toBe(false);
    expect(
      await reserveSpend(
        database,
        "operation-c",
        1,
        day,
        `${day}T10:00:00.000Z`,
      ),
    ).toHaveLength(0);

    // The TEMP trigger did not persist: the same settlement now lands and
    // stores the real 60m overrun honestly against the 40m hold.
    expect(
      await settleDispatch(
        database,
        "operation-a",
        60_000_000,
        "overrun-receipt",
        `${day}T10:01:00.000Z`,
      ),
    ).toHaveLength(1);
    const spend = await readSpend(database, "operation-a");
    expect(spend[0]).toMatchObject({
      status: "settled",
      actual_units: 60_000_000,
      reservation_units: 40_000_000,
      provider_response_id: "overrun-receipt",
    });

    // An overrun cannot unlock the barrier.
    await expect(barrier.releaseAccounted("operation-a")).resolves.toBe(false);
    await expect(barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: "operation-a",
    });

    // Even next-UTC-day metadata cannot hide the recorded overrun.
    const tomorrow = nextUtcDay(day);
    expect(
      await reserveSpend(
        database,
        "operation-d",
        1,
        tomorrow,
        `${tomorrow}T10:00:00.000Z`,
      ),
    ).toHaveLength(0);
    expect(await markDispatchStarted(database, "operation-b")).toHaveLength(0);
    sqlite.close();
  });
});

describe("accounted release within hold", () => {
  it("unlocks after an under-hold settlement and fits exactly the remainder", async () => {
    const f = createFixture();
    expect(
      await reserveSpend(
        f.database,
        "operation-a",
        40_000_000,
        f.day,
        f.reserveIso,
      ),
    ).toHaveLength(1);
    await expect(f.barrier.acquire("operation-a")).resolves.toBe(true);
    expect(await markDispatchStarted(f.database, "operation-a")).toHaveLength(
      1,
    );
    expect(
      await settleDispatch(
        f.database,
        "operation-a",
        20_000_000,
        "safe-receipt",
        f.settleIso,
      ),
    ).toHaveLength(1);

    // A wrong-owner release is refused and writes no NULL owner.
    await expect(f.barrier.releaseAccounted("operation-b")).resolves.toBe(
      false,
    );
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: "operation-a",
    });
    expect((await readSpend(f.database, "operation-a"))[0]).toMatchObject({
      status: "settled",
      actual_units: 20_000_000,
    });

    await expect(f.barrier.releaseAccounted("operation-a")).resolves.toBe(true);
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: null,
    });
    // Unlocking changes no stored cost.
    expect((await readSpend(f.database, "operation-a"))[0]).toMatchObject({
      status: "settled",
      actual_units: 20_000_000,
      reservation_units: 40_000_000,
    });

    // Settled 20m counts, so an 80m hold fills the day exactly.
    expect(
      await reserveSpend(
        f.database,
        "operation-c",
        80_000_000,
        f.day,
        f.reserveIso,
      ),
    ).toHaveLength(1);
    expect(
      await reserveSpend(f.database, "operation-d", 1, f.day, f.reserveIso),
    ).toHaveLength(0);
    f.sqlite.close();
  });
});

describe("unstarted release", () => {
  it("unlocks an owner before dispatch start while its full hold stays", async () => {
    const f = createFixture();
    expect(
      await reserveSpend(
        f.database,
        "operation-a",
        40_000_000,
        f.day,
        f.reserveIso,
      ),
    ).toHaveLength(1);
    await expect(f.barrier.acquire("operation-a")).resolves.toBe(true);

    await expect(f.barrier.releaseUnstarted("operation-b")).resolves.toBe(
      false,
    );
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: "operation-a",
    });
    await expect(f.barrier.releaseUnstarted("operation-a")).resolves.toBe(true);
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: null,
    });

    // The released operation's full reservation still counts.
    expect((await readSpend(f.database, "operation-a"))[0]).toMatchObject({
      status: "reserved",
      reservation_units: 40_000_000,
      actual_units: null,
    });
    // 60m fits exactly against the retained 40m hold; +1m is denied.
    expect(
      await reserveSpend(
        f.database,
        "operation-b",
        60_000_000,
        f.day,
        f.reserveIso,
      ),
    ).toHaveLength(1);
    expect(
      await reserveSpend(f.database, "operation-c", 1, f.day, f.reserveIso),
    ).toHaveLength(0);

    // Once a dispatch start is marked, unstarted release can never apply.
    await expect(f.barrier.acquire("operation-b")).resolves.toBe(true);
    expect(await markDispatchStarted(f.database, "operation-b")).toHaveLength(
      1,
    );
    await expect(f.barrier.releaseUnstarted("operation-b")).resolves.toBe(
      false,
    );
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: "operation-b",
    });
    f.sqlite.close();
  });
});

describe("manual initialization", () => {
  it("never rewrites an existing owner", async () => {
    const f = createFixture();
    expect(
      await reserveSpend(
        f.database,
        "operation-a",
        40_000_000,
        f.day,
        f.reserveIso,
      ),
    ).toHaveLength(1);
    await expect(f.barrier.acquire("operation-a")).resolves.toBe(true);
    expect(initializeBarrier(f.sqlite)).toHaveLength(0);
    await expect(f.barrier.read()).resolves.toEqual({
      singleton: 1,
      operation_id: "operation-a",
    });
    f.sqlite.close();
  });

  it("refuses to initialize over unsettled legacy work", async () => {
    const sqlite = new DatabaseSync(":memory:");
    sqlite.exec(SPEND_LEDGER_SCHEMA);
    const database = new SqliteBarrierDatabase(sqlite);
    const day = databaseUtcDay(sqlite);

    // With the barrier table absent a reservation cannot even be attempted.
    await expect(
      reserveSpend(database, "operation-a", 1, day, `${day}T10:00:00.000Z`),
    ).rejects.toThrow();

    // Parent-authorized fixture: one legacy unsettled row.
    sqlite
      .prepare(LEGACY_UNSETTLED_INSERT_SQL)
      .run(day, `${day}T10:00:00.000Z`);
    sqlite.exec(DISPATCH_BARRIER_SCHEMA);
    expect(initializeBarrier(sqlite)).toHaveLength(0);

    const barrier = new ProviderDispatchBarrier(database);
    await expect(barrier.read()).rejects.toBeInstanceOf(
      ProviderDispatchBarrierUnavailableError,
    );
    expect(
      await reserveSpend(
        database,
        "operation-a",
        1,
        day,
        `${day}T10:00:00.000Z`,
      ),
    ).toHaveLength(0);
    sqlite.close();
  });
});

describe("operation id validation", () => {
  const invalidIds: unknown[] = [
    0,
    1,
    -1,
    12.5,
    null,
    undefined,
    true,
    {},
    [],
    "",
    " ",
    "   ",
    "\t\n",
    " padded",
    "padded ",
    "\toperational\t",
    "a".repeat(129),
  ];

  it("rejects invalid ids with a generic TypeError before any prepare", async () => {
    const stub = new RecordingDatabase([]);
    const barrier = new ProviderDispatchBarrier(stub);
    for (const id of invalidIds) {
      const cast = id as string;
      await expect(barrier.acquire(cast)).rejects.toBeInstanceOf(TypeError);
      await expect(barrier.releaseAccounted(cast)).rejects.toBeInstanceOf(
        TypeError,
      );
      await expect(barrier.releaseUnstarted(cast)).rejects.toBeInstanceOf(
        TypeError,
      );
    }
    expect(stub.queries).toHaveLength(0);
    expect(stub.boundValues).toHaveLength(0);
  });

  it("never echoes the offending id in the error message", async () => {
    const stub = new RecordingDatabase([]);
    const barrier = new ProviderDispatchBarrier(stub);
    const id = " padded-secret-id ";
    const caught = await barrier.acquire(id).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(TypeError);
    expect((caught as Error).message).not.toContain("padded-secret-id");
  });

  it("permits a 128-character id through to the acquire statement", async () => {
    const id = "o".repeat(128);
    const stub = new RecordingDatabase([
      {
        response: {
          success: true,
          results: [{ singleton: 1, operation_id: id }],
        },
      },
    ]);
    const barrier = new ProviderDispatchBarrier(stub);
    await expect(barrier.acquire(id)).resolves.toBe(true);
    expect(stub.queries).toEqual([ACQUIRE_DISPATCH_BARRIER_SQL]);
    expect(stub.boundValues).toEqual([[id]]);
  });
});

describe("storage boundary validation", () => {
  const methods: Array<{
    name: "read" | "acquire" | "releaseAccounted" | "releaseUnstarted";
    sql: string;
    call: (barrier: ProviderDispatchBarrier) => Promise<unknown>;
  }> = [
    {
      name: "read",
      sql: READ_DISPATCH_BARRIER_SQL,
      call: (b) => b.read(),
    },
    {
      name: "acquire",
      sql: ACQUIRE_DISPATCH_BARRIER_SQL,
      call: (b) => b.acquire("operation-a"),
    },
    {
      name: "releaseAccounted",
      sql: RELEASE_ACCOUNTED_DISPATCH_SQL,
      call: (b) => b.releaseAccounted("operation-a"),
    },
    {
      name: "releaseUnstarted",
      sql: RELEASE_UNSTARTED_DISPATCH_SQL,
      call: (b) => b.releaseUnstarted("operation-a"),
    },
  ];

  for (const method of methods) {
    it(`${method.name} uses its own statement and maps failure to unavailable`, async () => {
      const stub = new RecordingDatabase([
        { response: { success: false, error: "secret storage detail" } },
      ]);
      const barrier = new ProviderDispatchBarrier(stub);
      const caught = await method.call(barrier).catch((e: unknown) => e);
      expect(caught).toBeInstanceOf(ProviderDispatchBarrierUnavailableError);
      expect((caught as Error).message).toBe(UNAVAILABLE_MESSAGE);
      expect((caught as Error).message).not.toContain("secret");
      expect(stub.queries).toEqual([method.sql]);
      if (method.name !== "read") {
        expect(stub.boundValues).toEqual([["operation-a"]]);
      }
    });

    it(`${method.name} sanitizes a thrown storage result`, async () => {
      const stub = new RecordingDatabase([
        { error: new Error("secret driver failure") },
      ]);
      const barrier = new ProviderDispatchBarrier(stub);
      const caught = await method.call(barrier).catch((e: unknown) => e);
      expect(caught).toBeInstanceOf(ProviderDispatchBarrierUnavailableError);
      expect((caught as Error).message).toBe(UNAVAILABLE_MESSAGE);
    });
  }

  const malformedReadResponses: Array<[string, unknown]> = [
    ["missing results", { success: true }],
    ["results not an array", { success: true, results: { singleton: 1 } }],
    [
      "more than one row",
      {
        success: true,
        results: [
          { singleton: 1, operation_id: null },
          { singleton: 1, operation_id: null },
        ],
      },
    ],
    [
      "singleton as string",
      { success: true, results: [{ singleton: "1", operation_id: null }] },
    ],
    [
      "singleton zero",
      { success: true, results: [{ singleton: 0, operation_id: null }] },
    ],
    ["missing owner field", { success: true, results: [{ singleton: 1 }] }],
    [
      "undefined owner",
      { success: true, results: [{ singleton: 1, operation_id: undefined }] },
    ],
    [
      "blank owner",
      { success: true, results: [{ singleton: 1, operation_id: "   " }] },
    ],
    [
      "numeric owner",
      { success: true, results: [{ singleton: 1, operation_id: 42 }] },
    ],
    [
      "overlong owner",
      {
        success: true,
        results: [{ singleton: 1, operation_id: "a".repeat(129) }],
      },
    ],
    ["non-object row", { success: true, results: [42] }],
    ["array row", { success: true, results: [[1, null]] }],
    ["null row", { success: true, results: [null] }],
    [
      "throwing owner getter",
      {
        success: true,
        results: [
          {
            singleton: 1,
            get operation_id(): string {
              throw new Error("secret getter detail");
            },
          },
        ],
      },
    ],
    [
      "throwing results getter",
      {
        success: true,
        get results(): unknown {
          throw new Error("secret results detail");
        },
      },
    ],
    ["non-object response", 42],
    ["null response", null],
  ];

  for (const [label, response] of malformedReadResponses) {
    it(`read rejects malformed storage: ${label}`, async () => {
      const stub = new RecordingDatabase([{ response }]);
      const barrier = new ProviderDispatchBarrier(stub);
      const caught = await barrier.read().catch((e: unknown) => e);
      expect(caught).toBeInstanceOf(ProviderDispatchBarrierUnavailableError);
      expect((caught as Error).message).toBe(UNAVAILABLE_MESSAGE);
    });
  }

  it("rejects a contradictory acquire row instead of granting", async () => {
    for (const owner of ["operation-b", null]) {
      const stub = new RecordingDatabase([
        {
          response: {
            success: true,
            results: [{ singleton: 1, operation_id: owner }],
          },
        },
      ]);
      const barrier = new ProviderDispatchBarrier(stub);
      await expect(barrier.acquire("operation-a")).rejects.toBeInstanceOf(
        ProviderDispatchBarrierUnavailableError,
      );
    }
  });

  it("rejects a release row that still carries an owner", async () => {
    for (const method of ["releaseAccounted", "releaseUnstarted"] as const) {
      const stub = new RecordingDatabase([
        {
          response: {
            success: true,
            results: [{ singleton: 1, operation_id: "operation-a" }],
          },
        },
      ]);
      const barrier = new ProviderDispatchBarrier(stub);
      await expect(barrier[method]("operation-a")).rejects.toBeInstanceOf(
        ProviderDispatchBarrierUnavailableError,
      );
    }
  });

  it("rejects more than one returned mutation row", async () => {
    const stub = new RecordingDatabase([
      {
        response: {
          success: true,
          results: [
            { singleton: 1, operation_id: "operation-a" },
            { singleton: 1, operation_id: "operation-a" },
          ],
        },
      },
    ]);
    const barrier = new ProviderDispatchBarrier(stub);
    await expect(barrier.acquire("operation-a")).rejects.toBeInstanceOf(
      ProviderDispatchBarrierUnavailableError,
    );
  });

  it("returns false on zero returned rows even when the readback owner matches", async () => {
    const stub = new RecordingDatabase([
      { response: { success: true, results: [] } },
      {
        response: {
          success: true,
          results: [{ singleton: 1, operation_id: "operation-a" }],
        },
      },
    ]);
    const barrier = new ProviderDispatchBarrier(stub);
    await expect(barrier.acquire("operation-a")).resolves.toBe(false);
    expect(stub.queries).toEqual([
      ACQUIRE_DISPATCH_BARRIER_SQL,
      READ_DISPATCH_BARRIER_SQL,
    ]);
  });

  it("never turns a lost acknowledgement after an apparent write into a grant", async () => {
    const stub = new RecordingDatabase([
      { error: new Error("connection lost after update") },
    ]);
    const barrier = new ProviderDispatchBarrier(stub);
    await expect(barrier.acquire("operation-a")).rejects.toBeInstanceOf(
      ProviderDispatchBarrierUnavailableError,
    );
  });
});
