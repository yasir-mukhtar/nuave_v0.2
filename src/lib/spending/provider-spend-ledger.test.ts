/**
 * ProviderSpendLedger proofs against a real SQLite file via node:sqlite.
 *
 * The fixture uses two independently opened DatabaseSync connections to one
 * temp file owned by this test, and a D1-compatible adapter whose all() is a
 * real async turn — a read-then-write implementation would interleave and
 * over-admit here. No fake database is used for the persistence or admission
 * proofs, and the module's own SQL is never executed outside these calls:
 * the schema is applied by the fixture only, mirroring a pre-migrated D1.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  MARK_UNCERTAIN_SPEND_SQL,
  READ_SPEND_SQL,
  RESERVE_SPEND_SQL,
  SETTLE_SPEND_SQL,
  SPEND_LEDGER_SCHEMA,
} from "./ledger-sql";
import {
  ProviderSpendLedger,
  SpendLedgerConflictError,
  SpendLedgerUnavailableError,
  type ReserveSpendInput,
  type SettleSpendInput,
  type SpendLedgerAllResult,
  type SpendLedgerBindValue,
  type SpendLedgerDatabase,
  type SpendLedgerStatement,
  type SpendReservation,
} from "./provider-spend-ledger";

// node:sqlite ships no @types/node 20 declarations, so it is loaded through
// createRequire behind small explicit structural types (no any).
interface SqliteStatementSync {
  all(...params: SpendLedgerBindValue[]): unknown[];
  run(...params: SpendLedgerBindValue[]): { changes: number | bigint };
}
interface SqliteDatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatementSync;
  close(): void;
}
interface NodeSqliteModule {
  DatabaseSync: new (path: string) => SqliteDatabaseSync;
}
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as NodeSqliteModule;

const DAY1 = "2026-10-04";
const DAY1_ISO = "2026-10-04T10:00:00.000Z";
const DAY1_LATER_ISO = "2026-10-04T11:00:00.000Z";
const DAY2 = "2026-10-05";
const DAY2_ISO = "2026-10-05T09:00:00.000Z";

const at =
  (iso: string): (() => Date) =>
  () =>
    new Date(iso);

/** A real async turn before each statement executes. */
class SyncSqliteStatement implements SpendLedgerStatement {
  private constructor(
    private readonly statement: SqliteStatementSync,
    private readonly params: readonly SpendLedgerBindValue[],
  ) {}

  static unbound(statement: SqliteStatementSync): SyncSqliteStatement {
    return new SyncSqliteStatement(statement, []);
  }

  bind(...values: SpendLedgerBindValue[]): SpendLedgerStatement {
    return new SyncSqliteStatement(this.statement, values);
  }

  async all<T>(): Promise<SpendLedgerAllResult<T>> {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    return {
      success: true,
      results: this.statement.all(...this.params) as T[],
    };
  }
}

function toLedgerDatabase(raw: SqliteDatabaseSync): SpendLedgerDatabase {
  return {
    prepare(sql: string): SpendLedgerStatement {
      return SyncSqliteStatement.unbound(raw.prepare(sql));
    },
  };
}

const tempDirs: string[] = [];
const openDatabases: SqliteDatabaseSync[] = [];

afterEach(() => {
  while (openDatabases.length > 0) {
    const db = openDatabases.pop();
    try {
      db?.close();
    } catch {
      // Already closed inside the test that owns it.
    }
  }
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function newDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "nuave-s2-ledger-"));
  tempDirs.push(dir);
  return join(dir, "spend.db");
}

function openRawDatabase(path: string): SqliteDatabaseSync {
  const raw = new DatabaseSync(path);
  raw.exec("PRAGMA busy_timeout = 5000;");
  raw.exec(SPEND_LEDGER_SCHEMA);
  openDatabases.push(raw);
  return raw;
}

function reserveInput(
  operationId: string,
  reservationUnits: number,
  overrides: Partial<ReserveSpendInput> = {},
): ReserveSpendInput {
  return {
    operationId,
    provider: "openai",
    stage: "extract",
    pricingVersion: "pricing-v1",
    reservationUnits,
    ...overrides,
  };
}

function rawRows(raw: SqliteDatabaseSync, operationId: string): unknown[] {
  return raw.prepare(READ_SPEND_SQL).all(operationId);
}

function countRows(raw: SqliteDatabaseSync, operationId: string): number {
  const rows = raw
    .prepare(
      "SELECT COUNT(*) AS n FROM nuave_provider_spend WHERE operation_id = ?",
    )
    .all(operationId) as { n: number }[];
  return rows[0].n;
}

async function expectUnavailable(
  promise: Promise<unknown>,
): Promise<SpendLedgerUnavailableError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SpendLedgerUnavailableError);
    return error as SpendLedgerUnavailableError;
  }
  throw new Error("expected SpendLedgerUnavailableError, promise resolved");
}

/** A database whose every statement.all() follows the given behavior. */
function stubDatabase(
  behave: () => Promise<SpendLedgerAllResult<never>>,
): SpendLedgerDatabase {
  const statement: SpendLedgerStatement = {
    bind: () => statement,
    all: <T>() => behave() as Promise<SpendLedgerAllResult<T>>,
  };
  return { prepare: () => statement };
}

const SECRET_DETAIL = "marker-provider-secret-7f3a";

describe("ProviderSpendLedger on real SQLite", () => {
  it("admits exactly one of two concurrent reservations reaching the daily limit, in integer units", async () => {
    const path = newDbPath();
    const rawA = openRawDatabase(path);
    const rawB = openRawDatabase(path);
    const ledgerA = new ProviderSpendLedger(
      toLedgerDatabase(rawA),
      at(DAY1_ISO),
    );
    const ledgerB = new ProviderSpendLedger(
      toLedgerDatabase(rawB),
      at(DAY1_ISO),
    );

    await ledgerA.reserve(reserveInput("op-seed", 60000000));
    const seeded = await ledgerA.settle({
      operationId: "op-seed",
      actualUnits: 60000000,
      providerResponseId: "resp-seed",
    });
    expect(seeded.status).toBe("settled");

    const [first, second] = await Promise.all([
      ledgerA.reserve(reserveInput("op-a", 40000000)),
      ledgerB.reserve(reserveInput("op-b", 40000000)),
    ]);
    expect([first.status, second.status].sort()).toEqual([
      "denied",
      "reserved",
    ]);

    const winner = first.status === "reserved" ? first : second;
    if (winner.status !== "reserved") {
      throw new Error("expected one admitted reservation");
    }
    expect(winner.reservation.reservation_units).toBe(40000000);
    expect(Number.isSafeInteger(winner.reservation.reservation_units)).toBe(
      true,
    );

    await expect(ledgerB.reserve(reserveInput("op-c", 1))).resolves.toEqual({
      status: "denied",
    });
  });

  it("keeps admission closed across close/reopen and preserves original metadata", async () => {
    const path = newDbPath();
    const raw1 = openRawDatabase(path);
    const ledger1 = new ProviderSpendLedger(
      toLedgerDatabase(raw1),
      at(DAY1_ISO),
    );
    await ledger1.reserve(reserveInput("op-seed", 60000000));
    await ledger1.settle({ operationId: "op-seed", actualUnits: 60000000 });
    const held = await ledger1.reserve(reserveInput("op-hold", 40000000));
    expect(held.status).toBe("reserved");
    raw1.close();

    const raw2 = openRawDatabase(path);
    const ledger2 = new ProviderSpendLedger(
      toLedgerDatabase(raw2),
      at(DAY1_ISO),
    );
    await expect(ledger2.reserve(reserveInput("op-new", 1))).resolves.toEqual({
      status: "denied",
    });

    const original = await ledger2.get("op-hold");
    expect(original).not.toBeNull();
    expect(original?.provider).toBe("openai");
    expect(original?.stage).toBe("extract");
    expect(original?.pricing_version).toBe("pricing-v1");
    expect(original?.reservation_units).toBe(40000000);
    expect(original?.reserved_day_utc).toBe(DAY1);
    expect(original?.created_at).toBe(DAY1_ISO);
    expect(original?.status).toBe("reserved");
    expect(original?.actual_units).toBeNull();
  });

  it("releases settled cost on a new UTC day but carries reserved and uncertain holds", async () => {
    const path = newDbPath();
    const raw1 = openRawDatabase(path);
    const ledger1 = new ProviderSpendLedger(
      toLedgerDatabase(raw1),
      at(DAY1_ISO),
    );
    await ledger1.reserve(reserveInput("op-seed", 60000000));
    await ledger1.settle({ operationId: "op-seed", actualUnits: 60000000 });
    await ledger1.reserve(reserveInput("op-r", 20000000));
    await ledger1.reserve(reserveInput("op-u", 20000000));
    const uncertain = await ledger1.markUncertain("op-u");
    expect(uncertain.status).toBe("uncertain");
    raw1.close();

    const raw2 = openRawDatabase(path);
    const ledger2 = new ProviderSpendLedger(
      toLedgerDatabase(raw2),
      at(DAY2_ISO),
    );
    // Prior-day settled 60M is released; 40M unresolved holds remain, so a
    // 60M reservation reaches the limit exactly and one more unit is denied.
    const day2 = await ledger2.reserve(reserveInput("op-day2", 60000000));
    expect(day2.status).toBe("reserved");
    if (day2.status === "reserved") {
      expect(day2.reservation.reserved_day_utc).toBe(DAY2);
    }
    await expect(ledger2.reserve(reserveInput("op-extra", 1))).resolves.toEqual(
      { status: "denied" },
    );

    const stillReserved = await ledger2.get("op-r");
    const stillUncertain = await ledger2.get("op-u");
    expect(stillReserved?.status).toBe("reserved");
    expect(stillReserved?.reserved_day_utc).toBe(DAY1);
    expect(stillUncertain?.status).toBe("uncertain");
    expect(stillUncertain?.reserved_day_utc).toBe(DAY1);
  });

  it("returns duplicate for an identical replay and conflict for changed metadata", async () => {
    const raw = openRawDatabase(newDbPath());
    const ledger = new ProviderSpendLedger(toLedgerDatabase(raw), at(DAY1_ISO));
    const base = reserveInput("op-x", 10000000);
    expect((await ledger.reserve(base)).status).toBe("reserved");

    const repeat = await ledger.reserve(base);
    expect(repeat.status).toBe("duplicate");
    expect(countRows(raw, "op-x")).toBe(1);

    const nextDay = new ProviderSpendLedger(
      toLedgerDatabase(raw),
      at(DAY2_ISO),
    );
    const repeatDay2 = await nextDay.reserve(base);
    expect(repeatDay2.status).toBe("duplicate");
    if (repeatDay2.status === "duplicate") {
      expect(repeatDay2.reservation.reserved_day_utc).toBe(DAY1);
      expect(repeatDay2.reservation.created_at).toBe(DAY1_ISO);
    }
    expect(countRows(raw, "op-x")).toBe(1);

    for (const changed of [
      reserveInput("op-x", 10000000, { provider: "cheaper-inference" }),
      reserveInput("op-x", 10000000, { stage: "report" }),
      reserveInput("op-x", 10000000, { pricingVersion: "pricing-v2" }),
      reserveInput("op-x", 11000000),
    ]) {
      await expect(nextDay.reserve(changed)).rejects.toBeInstanceOf(
        SpendLedgerConflictError,
      );
    }
    expect(countRows(raw, "op-x")).toBe(1);
  });

  it("settles honestly, frees real headroom, and fails closed on duplicate response ids", async () => {
    const raw = openRawDatabase(newDbPath());
    const ledger = new ProviderSpendLedger(toLedgerDatabase(raw), at(DAY1_ISO));

    await ledger.reserve(reserveInput("op-a", 80000000));
    const settled = await ledger.settle({
      operationId: "op-a",
      actualUnits: 40000000,
      providerResponseId: "resp-a",
    });
    expect(settled.status).toBe("settled");
    expect(settled.actual_units).toBe(40000000);
    expect(settled.provider_response_id).toBe("resp-a");
    expect(settled.settled_at).toBe(DAY1_ISO);

    // The freed 40M is real same-day headroom: 40 settled + 60 reserved = 100.
    expect((await ledger.reserve(reserveInput("op-b", 60000000))).status).toBe(
      "reserved",
    );
    await expect(ledger.reserve(reserveInput("op-c", 1))).resolves.toEqual({
      status: "denied",
    });

    // Identical settlement is idempotent and keeps the first settled_at.
    const again = await ledger.settle({
      operationId: "op-a",
      actualUnits: 40000000,
      providerResponseId: "resp-a",
    });
    expect(again.settled_at).toBe(DAY1_ISO);
    expect(again.actual_units).toBe(40000000);

    // Conflicting settlement never overwrites.
    await expect(
      ledger.settle({
        operationId: "op-a",
        actualUnits: 41000000,
        providerResponseId: "resp-a",
      }),
    ).rejects.toBeInstanceOf(SpendLedgerConflictError);
    await expect(
      ledger.settle({
        operationId: "op-a",
        actualUnits: 40000000,
        providerResponseId: "resp-z",
      }),
    ).rejects.toBeInstanceOf(SpendLedgerConflictError);

    // The same provider + response id on a second operation fails closed on
    // the UNIQUE constraint, and the second hold keeps its liability.
    await expectUnavailable(
      ledger.settle({
        operationId: "op-b",
        actualUnits: 30000000,
        providerResponseId: "resp-a",
      }),
    );
    const opB = await ledger.get("op-b");
    expect(opB?.status).toBe("reserved");
    expect(opB?.reservation_units).toBe(60000000);

    const settledB = await ledger.settle({
      operationId: "op-b",
      actualUnits: 30000000,
      providerResponseId: "resp-b",
    });
    expect(settledB.status).toBe("settled");

    // A different provider namespace may reuse the same response id.
    await ledger.reserve(
      reserveInput("op-d", 10000000, { provider: "cheaper-inference" }),
    );
    const settledD = await ledger.settle({
      operationId: "op-d",
      actualUnits: 10000000,
      providerResponseId: "resp-a",
    });
    expect(settledD.status).toBe("settled");
    expect(settledD.provider_response_id).toBe("resp-a");
  });

  it("records over-reservation cost unchanged and latches admission across UTC rollover", async () => {
    const path = newDbPath();
    const raw1 = openRawDatabase(path);
    const ledger1 = new ProviderSpendLedger(
      toLedgerDatabase(raw1),
      at(DAY1_ISO),
    );
    await ledger1.reserve(reserveInput("op-x", 10000000));
    const settled = await ledger1.settle({
      operationId: "op-x",
      actualUnits: 60000000,
    });
    expect(settled.actual_units).toBe(60000000);

    await expect(ledger1.reserve(reserveInput("op-y", 1))).resolves.toEqual({
      status: "denied",
    });
    raw1.close();

    const raw2 = openRawDatabase(path);
    const ledger2 = new ProviderSpendLedger(
      toLedgerDatabase(raw2),
      at(DAY2_ISO),
    );
    await expect(ledger2.reserve(reserveInput("op-z", 1))).resolves.toEqual({
      status: "denied",
    });
    const kept = await ledger2.get("op-x");
    expect(kept?.actual_units).toBe(60000000);
  });

  it("keeps a full hold under markUncertain and never reverts or frees it", async () => {
    const raw = openRawDatabase(newDbPath());
    const ledger = new ProviderSpendLedger(toLedgerDatabase(raw), at(DAY1_ISO));
    await ledger.reserve(reserveInput("op-u", 30000000));
    const uncertain = await ledger.markUncertain("op-u");
    expect(uncertain.status).toBe("uncertain");

    // The whole 30M hold still counts: 30 + 71 exceeds, 30 + 70 fits exactly.
    await expect(
      ledger.reserve(reserveInput("op-x", 71000000)),
    ).resolves.toEqual({ status: "denied" });
    expect((await ledger.reserve(reserveInput("op-x", 70000000))).status).toBe(
      "reserved",
    );

    const repeated = await ledger.markUncertain("op-u");
    expect(repeated.status).toBe("uncertain");
    expect(repeated.created_at).toBe(DAY1_ISO);

    const settled = await ledger.settle({
      operationId: "op-u",
      actualUnits: 25000000,
      providerResponseId: "resp-u",
    });
    expect(settled.status).toBe("settled");

    const afterSettle = await ledger.markUncertain("op-u");
    expect(afterSettle.status).toBe("settled");
    expect(afterSettle.actual_units).toBe(25000000);
    expect(afterSettle.settled_at).toBe(DAY1_ISO);
  });

  it("rejects invalid money, ids and metadata with TypeError before any SQL", async () => {
    const raw = openRawDatabase(newDbPath());
    const real = toLedgerDatabase(raw);
    let prepareCalls = 0;
    const counting: SpendLedgerDatabase = {
      prepare: (sql) => {
        prepareCalls += 1;
        return real.prepare(sql);
      },
    };
    const ledger = new ProviderSpendLedger(counting, at(DAY1_ISO));
    const base = reserveInput("op-valid", 1000000);

    const badReserve = (overrides: Record<string, unknown>) =>
      ({ ...base, ...overrides }) as unknown as ReserveSpendInput;

    for (const badUnits of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      await expect(
        ledger.reserve(badReserve({ reservationUnits: badUnits })),
      ).rejects.toBeInstanceOf(TypeError);
    }
    for (const badId of ["", "   ", "x".repeat(129), 42, null]) {
      await expect(
        ledger.reserve(badReserve({ operationId: badId })),
      ).rejects.toBeInstanceOf(TypeError);
    }
    await expect(
      ledger.reserve(badReserve({ provider: "gemini" })),
    ).rejects.toBeInstanceOf(TypeError);
    await expect(
      ledger.reserve(badReserve({ provider: "OPENAI" })),
    ).rejects.toBeInstanceOf(TypeError);
    await expect(
      ledger.reserve(badReserve({ stage: "checkout" })),
    ).rejects.toBeInstanceOf(TypeError);
    for (const badVersion of ["", "  ", "v".repeat(129)]) {
      await expect(
        ledger.reserve(badReserve({ pricingVersion: badVersion })),
      ).rejects.toBeInstanceOf(TypeError);
    }

    const badSettle = (overrides: Record<string, unknown>) =>
      ({
        operationId: "op-valid",
        ...overrides,
      }) as unknown as SettleSpendInput;

    for (const badActual of [
      -1,
      0.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      await expect(
        ledger.settle(badSettle({ actualUnits: badActual })),
      ).rejects.toBeInstanceOf(TypeError);
    }
    for (const badResponseId of ["", "   ", "r".repeat(257), 7]) {
      await expect(
        ledger.settle(
          badSettle({ actualUnits: 1, providerResponseId: badResponseId }),
        ),
      ).rejects.toBeInstanceOf(TypeError);
    }
    for (const badId of ["", "  ", "i".repeat(129)]) {
      await expect(ledger.get(badId)).rejects.toBeInstanceOf(TypeError);
      await expect(ledger.markUncertain(badId)).rejects.toBeInstanceOf(
        TypeError,
      );
    }

    expect(prepareCalls).toBe(0);

    // Sanity: valid input does reach SQL, so the counter was wired.
    expect((await ledger.reserve(base)).status).toBe("reserved");
    expect(prepareCalls).toBeGreaterThan(0);

    // actualUnits = 0 is structurally allowed (trusted proof is the caller's).
    const zero = await ledger.settle({
      operationId: "op-valid",
      actualUnits: 0,
    });
    expect(zero.actual_units).toBe(0);
  });

  it("fails closed on an invalid server clock", async () => {
    const raw = openRawDatabase(newDbPath());
    const db = toLedgerDatabase(raw);
    const invalidDate = new ProviderSpendLedger(db, () => new Date("garbage"));
    await expect(
      invalidDate.reserve(reserveInput("op-c", 1)),
    ).rejects.toBeInstanceOf(SpendLedgerUnavailableError);
    await expect(
      invalidDate.settle({ operationId: "op-c", actualUnits: 1 }),
    ).rejects.toBeInstanceOf(SpendLedgerUnavailableError);

    const throwing = new ProviderSpendLedger(db, () => {
      throw new Error("clock exploded");
    });
    await expect(
      throwing.reserve(reserveInput("op-c", 1)),
    ).rejects.toBeInstanceOf(SpendLedgerUnavailableError);

    const nonDate = new ProviderSpendLedger(
      db,
      () => DAY1_ISO as unknown as Date,
    );
    await expect(
      nonDate.reserve(reserveInput("op-c", 1)),
    ).rejects.toBeInstanceOf(SpendLedgerUnavailableError);
  });

  it("maps thrown, false-success and malformed storage results to unavailable without leaking detail", async () => {
    const raw = openRawDatabase(newDbPath());
    const real = toLedgerDatabase(raw);

    const prepareThrows: SpendLedgerDatabase = {
      prepare: () => {
        throw new Error(SECRET_DETAIL);
      },
    };
    const l1 = new ProviderSpendLedger(prepareThrows, at(DAY1_ISO));
    const e1 = await expectUnavailable(l1.reserve(reserveInput("op", 1)));
    expect(e1.message).not.toContain(SECRET_DETAIL);
    expect(String(e1)).not.toContain(SECRET_DETAIL);
    expect((e1 as { cause?: unknown }).cause).toBeUndefined();

    const allRejects = stubDatabase(() =>
      Promise.reject(new Error(SECRET_DETAIL)),
    );
    const e2 = await expectUnavailable(
      new ProviderSpendLedger(allRejects, at(DAY1_ISO)).reserve(
        reserveInput("op", 1),
      ),
    );
    expect(e2.message).not.toContain(SECRET_DETAIL);

    const falseSuccess = stubDatabase(() =>
      Promise.resolve({ success: false, results: [] }),
    );
    await expectUnavailable(
      new ProviderSpendLedger(falseSuccess, at(DAY1_ISO)).reserve(
        reserveInput("op", 1),
      ),
    );

    const missingResults = stubDatabase(() =>
      Promise.resolve({
        success: true,
        results: undefined as unknown as never[],
      }),
    );
    await expectUnavailable(
      new ProviderSpendLedger(missingResults, at(DAY1_ISO)).reserve(
        reserveInput("op", 1),
      ),
    );

    const malformedRow = stubDatabase(() =>
      Promise.resolve({
        success: true,
        results: [
          { operation_id: 42, status: "reserved" },
        ] as unknown as never[],
      }),
    );
    await expectUnavailable(
      new ProviderSpendLedger(malformedRow, at(DAY1_ISO)).reserve(
        reserveInput("op", 1),
      ),
    );

    // A read that returns more than the one row the key allows is
    // unavailable, never a phantom duplicate or denial.
    const honest = new ProviderSpendLedger(real, at(DAY1_ISO));
    await honest.reserve(reserveInput("op-multi", 1000));
    const twoRows: SpendLedgerDatabase = {
      prepare: (sql) =>
        sql === READ_SPEND_SQL
          ? {
              bind: () => ({
                bind: () => {
                  throw new Error("rebind unsupported");
                },
                all: <T>() =>
                  Promise.resolve({
                    success: true,
                    results: [
                      ...rawRows(raw, "op-multi"),
                      ...rawRows(raw, "op-multi"),
                    ] as T[],
                  }),
              }),
              all: <T>() =>
                Promise.resolve({ success: true, results: [] as T[] }),
            }
          : real.prepare(sql),
    };
    await expectUnavailable(
      new ProviderSpendLedger(twoRows, at(DAY1_ISO)).get("op-multi"),
    );
  });

  it("a failed settle write leaves the original hold, and missing ids conflict", async () => {
    const raw = openRawDatabase(newDbPath());
    const real = toLedgerDatabase(raw);
    const ledger = new ProviderSpendLedger(real, at(DAY1_ISO));
    await ledger.reserve(reserveInput("op-hold", 1000000));

    const sabotaged: SpendLedgerDatabase = {
      prepare: (sql) =>
        sql === SETTLE_SPEND_SQL
          ? stubDatabase(() =>
              Promise.reject(new Error(SECRET_DETAIL)),
            ).prepare(sql)
          : real.prepare(sql),
    };
    const failing = new ProviderSpendLedger(sabotaged, at(DAY1_LATER_ISO));
    const err = await expectUnavailable(
      failing.settle({ operationId: "op-hold", actualUnits: 500 }),
    );
    expect(err.message).not.toContain(SECRET_DETAIL);

    const stillHeld = await ledger.get("op-hold");
    expect(stillHeld?.status).toBe("reserved");
    expect(stillHeld?.actual_units).toBeNull();
    expect(stillHeld?.provider_response_id).toBeNull();

    await expect(
      ledger.settle({ operationId: "op-missing", actualUnits: 1 }),
    ).rejects.toBeInstanceOf(SpendLedgerConflictError);
    await expect(ledger.markUncertain("op-missing")).rejects.toBeInstanceOf(
      SpendLedgerConflictError,
    );
    await expect(ledger.get("op-missing")).resolves.toBeNull();
  });

  it("runs no SQL at construction and never creates schema or a database by itself", async () => {
    let prepareCalls = 0;
    const counting: SpendLedgerDatabase = {
      prepare: () => {
        prepareCalls += 1;
        return stubDatabase(() =>
          Promise.resolve({ success: true, results: [] }),
        ).prepare("unused");
      },
    };
    const ledger = new ProviderSpendLedger(counting, at(DAY1_ISO));
    expect(ledger).toBeInstanceOf(ProviderSpendLedger);
    expect(prepareCalls).toBe(0);
  });
});

/** A statement whose all() resolves a fixed D1-shaped result every time. */
function fixedRowsStatement(rows: unknown[]): SpendLedgerStatement {
  const statement: SpendLedgerStatement = {
    bind: () => statement,
    all: <T>() => Promise.resolve({ success: true, results: rows as T[] }),
  };
  return statement;
}

/**
 * Wraps the real database so specific authored statements return chosen
 * (valid-looking but untrusted) rows while everything else stays real. This
 * simulates an inconsistent store without faking the persistence proofs.
 */
function withCanned(
  real: SpendLedgerDatabase,
  canned: Partial<Record<string, unknown[]>>,
): SpendLedgerDatabase {
  return {
    prepare: (sql) =>
      sql in canned ? fixedRowsStatement(canned[sql] ?? []) : real.prepare(sql),
  };
}

interface SpendFixtureRows {
  real: SpendLedgerDatabase;
  raw: SqliteDatabaseSync;
  reserved: SpendReservation;
  uncertain: SpendReservation;
  settled: SpendReservation;
}

/** Real SQLite writes produce the valid rows the stubs then misattribute. */
async function seededRows(path: string): Promise<SpendFixtureRows> {
  const raw = openRawDatabase(path);
  const real = toLedgerDatabase(raw);
  const ledger = new ProviderSpendLedger(real, at(DAY1_ISO));
  await ledger.reserve(reserveInput("op-res", 1000000));
  await ledger.reserve(reserveInput("op-unc", 1000000));
  await ledger.markUncertain("op-unc");
  await ledger.reserve(reserveInput("op-set", 1000000));
  await ledger.settle({
    operationId: "op-set",
    actualUnits: 500000,
    providerResponseId: "resp-set",
  });
  return {
    real,
    raw,
    reserved: rawRows(raw, "op-res")[0] as SpendReservation,
    uncertain: rawRows(raw, "op-unc")[0] as SpendReservation,
    settled: rawRows(raw, "op-set")[0] as SpendReservation,
  };
}

describe("request binding on returned rows", () => {
  it("get() and the duplicate fallback refuse a valid row of another operation", async () => {
    const path = newDbPath();
    const { real, reserved } = await seededRows(path);

    const foreignRead = withCanned(real, {
      [READ_SPEND_SQL]: [reserved],
    });
    await expectUnavailable(
      new ProviderSpendLedger(foreignRead, at(DAY1_ISO)).get("op-other"),
    );

    // An unadmitted insert followed by a read of someone else's valid row
    // must never be reported as this operation's duplicate.
    const foreignFallback = withCanned(real, {
      [RESERVE_SPEND_SQL]: [],
      [READ_SPEND_SQL]: [reserved],
    });
    await expectUnavailable(
      new ProviderSpendLedger(foreignFallback, at(DAY1_ISO)).reserve(
        reserveInput("op-other", 1000000),
      ),
    );
  });

  it("reserve() refuses a valid-looking RETURNING row that does not match the request", async () => {
    const path = newDbPath();
    const { real, reserved, settled } = await seededRows(path);
    const request = reserveInput("op-res", 1000000);

    const wrongRows: Record<string, SpendReservation> = {
      "wrong operation id": { ...reserved, operation_id: "op-other" },
      "wrong provider": { ...reserved, provider: "cheaper-inference" },
      "wrong stage": { ...reserved, stage: "report" },
      "wrong pricing version": {
        ...reserved,
        pricing_version: "pricing-v9",
      },
      "wrong reservation units": { ...reserved, reservation_units: 2 },
      "wrong reservation day": { ...reserved, reserved_day_utc: DAY2 },
      "wrong created_at": { ...reserved, created_at: DAY1_LATER_ISO },
      "settled not reserved": settled,
    };
    for (const [label, row] of Object.entries(wrongRows)) {
      const db = withCanned(real, { [RESERVE_SPEND_SQL]: [row] });
      const ledger = new ProviderSpendLedger(db, at(DAY1_ISO));
      const result = await ledger.reserve(request).then(
        () => `resolved:${label}`,
        (error: unknown) => error,
      );
      expect(result, label).toBeInstanceOf(SpendLedgerUnavailableError);
    }
  });

  it("settle() refuses a valid-looking RETURNING row that does not match the request", async () => {
    const path = newDbPath();
    const { real, reserved, uncertain, settled } = await seededRows(path);
    const request = {
      operationId: "op-set",
      actualUnits: 500000,
      providerResponseId: "resp-set",
    };

    const wrongRows: Record<string, SpendReservation> = {
      "wrong operation id": { ...settled, operation_id: "op-other" },
      "still reserved": reserved,
      "still uncertain": uncertain,
      "wrong actual units": { ...settled, actual_units: 600000 },
      "wrong response id": {
        ...settled,
        provider_response_id: "resp-other",
      },
      "wrong settled_at": { ...settled, settled_at: DAY1_LATER_ISO },
    };
    for (const [label, row] of Object.entries(wrongRows)) {
      const db = withCanned(real, { [SETTLE_SPEND_SQL]: [row] });
      const ledger = new ProviderSpendLedger(db, at(DAY1_ISO));
      const result = await ledger.settle(request).then(
        () => `resolved:${label}`,
        (error: unknown) => error,
      );
      expect(result, label).toBeInstanceOf(SpendLedgerUnavailableError);
    }
  });

  it("markUncertain() refuses a valid-looking RETURNING row that does not match the request", async () => {
    const path = newDbPath();
    const { real, reserved, settled } = await seededRows(path);

    for (const [label, row] of Object.entries({
      "wrong operation id": { ...reserved, operation_id: "op-other" },
      "still reserved": reserved,
      "settled for this op": { ...settled, operation_id: "op-res" },
    })) {
      const db = withCanned(real, { [MARK_UNCERTAIN_SPEND_SQL]: [row] });
      const ledger = new ProviderSpendLedger(db, at(DAY1_ISO));
      const result = await ledger.markUncertain("op-res").then(
        () => `resolved:${label}`,
        (error: unknown) => error,
      );
      expect(result, label).toBeInstanceOf(SpendLedgerUnavailableError);
    }
  });

  it("an idempotent settle retry returns the original settled_at across clocks and reopen", async () => {
    const path = newDbPath();
    const raw = openRawDatabase(path);
    const ledger1 = new ProviderSpendLedger(
      toLedgerDatabase(raw),
      at(DAY1_ISO),
    );
    await ledger1.reserve(reserveInput("op-t", 1000000));
    const first = await ledger1.settle({
      operationId: "op-t",
      actualUnits: 400000,
      providerResponseId: "resp-t",
    });
    expect(first.settled_at).toBe(DAY1_ISO);

    // Identical retry under a later same-day clock: no rewrite of the row.
    const later = new ProviderSpendLedger(
      toLedgerDatabase(raw),
      at(DAY1_LATER_ISO),
    );
    const retry = await later.settle({
      operationId: "op-t",
      actualUnits: 400000,
      providerResponseId: "resp-t",
    });
    expect(retry).toEqual(first);
    expect(retry.settled_at).toBe(DAY1_ISO);
    raw.close();

    // After reopen on a new UTC day the stored row is still the original.
    const raw2 = openRawDatabase(path);
    const day2 = new ProviderSpendLedger(toLedgerDatabase(raw2), at(DAY2_ISO));
    const retryDay2 = await day2.settle({
      operationId: "op-t",
      actualUnits: 400000,
      providerResponseId: "resp-t",
    });
    expect(retryDay2).toEqual(first);
    expect(retryDay2.settled_at).toBe(DAY1_ISO);

    // A conflicting retry neither overwrites nor alters the stored row.
    await expect(
      day2.settle({
        operationId: "op-t",
        actualUnits: 410000,
        providerResponseId: "resp-t",
      }),
    ).rejects.toBeInstanceOf(SpendLedgerConflictError);
    const stored = await day2.get("op-t");
    expect(stored).toEqual(first);
    expect(stored?.settled_at).toBe(DAY1_ISO);
  });
});
