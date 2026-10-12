import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createOrderWithHold,
  endOrder,
  reserveOrderCall,
  SpendLedgerError,
  usdToUnits,
  type NewOrderRecord,
  type SpendDb,
} from "./spend-ledger";
import { openFileD1 } from "./sqlite-d1.test-helper";

// Spec 016 R-08..R-13, AC-05..AC-09 against the real ledger code and the real
// migration files, on the sqlite D1 test helper.

const DAY1 = new Date("2026-10-12T10:00:00Z");
const DAY2 = new Date("2026-10-13T00:00:01Z");
const LIMIT = usdToUnits(2);
const DAILY = usdToUnits(5);
const call = { provider: "openai", stage: "observation" };

let dir: string;
let file: string;
let d1: ReturnType<typeof openFileD1>;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-spend-"));
  file = join(dir, "spend.sqlite");
  d1 = openFileD1(file);
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
});

let counter = 0;
function orderRecord(
  mode: "live" | "synthetic" = "live",
  at = DAY1,
): NewOrderRecord {
  counter += 1;
  return {
    id: counter.toString(16).padStart(32, "0"),
    email: "owner@example.com",
    businessName: "Toko Uji",
    website: "https://example.com/",
    mode,
    environment: "production",
    createdAt: at,
    expiresAt: new Date(at.getTime() + 2 * 3600_000),
  };
}

async function liveOrder(limit = LIMIT, daily = DAILY, at = DAY1) {
  const order = orderRecord("live", at);
  const result = await createOrderWithHold(d1.db, order, {
    limitUnits: limit,
    dailyLimitUnits: daily,
  });
  return { order, result };
}

const setState = (id: string, state: string) =>
  d1.query(
    `UPDATE orders SET state = '${state}' WHERE id = '${id}' RETURNING id`,
  );

async function refusal(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as SpendLedgerError;
  }
  return null;
}

const rows = (sql: string) => d1.query<Record<string, unknown>>(sql);

describe("order hold (R-08, AC-05)", () => {
  it("writes the order and one hold row of the limit, dated the UTC creation day", async () => {
    const { order, result } = await liveOrder();
    expect(result).toBe("created");
    expect(rows("SELECT state, mode FROM orders")).toEqual([
      { state: "open", mode: "live" },
    ]);
    expect(
      rows(
        "SELECT kind, order_id, day, held_units, reserved_units, status FROM provider_spend",
      ),
    ).toEqual([
      {
        kind: "order_hold",
        order_id: order.id,
        day: "2026-10-12",
        held_units: LIMIT,
        reserved_units: LIMIT,
        status: "reserved",
      },
    ]);
  });

  it("refuses with less room than one order limit and leaves the database unchanged", async () => {
    await liveOrder(LIMIT, DAILY);
    await liveOrder(LIMIT, DAILY);
    const before = JSON.stringify([
      rows("SELECT * FROM orders"),
      rows("SELECT * FROM provider_spend"),
    ]);
    const { result } = await liveOrder(LIMIT, DAILY); // 2 + 2 + 2 > 5
    expect(result).toBe("cap_full");
    expect(
      JSON.stringify([
        rows("SELECT * FROM orders"),
        rows("SELECT * FROM provider_spend"),
      ]),
    ).toBe(before);
  });

  it("counts other spend of the day, and frees the hold when the order ends", async () => {
    d1.query(
      `INSERT INTO provider_spend (id, day, status, provider, stage, reserved_units, held_units, created_at)
       VALUES ('old', '2026-10-12', 'settled', 'openai', 'x', 1, ${usdToUnits(3.5)}, 't') RETURNING id`,
    );
    expect((await liveOrder()).result).toBe("cap_full"); // 3.5 + 2 > 5
    d1.query("DELETE FROM provider_spend WHERE id = 'old' RETURNING id");
    const { order } = await liveOrder();
    await liveOrder();
    expect((await liveOrder()).result).toBe("cap_full");
    expect(
      await endOrder(d1.db, {
        orderId: order.id,
        from: ["open"],
        to: "expired",
        now: () => DAY1,
      }),
    ).toBe(true);
    expect((await liveOrder()).result).toBe("created");
  });

  it("makes no ledger row for a synthetic order", async () => {
    const result = await createOrderWithHold(
      d1.db,
      orderRecord("synthetic"),
      null,
    );
    expect(result).toBe("created");
    expect(rows("SELECT * FROM provider_spend")).toEqual([]);
    expect(rows("SELECT mode FROM orders")).toEqual([{ mode: "synthetic" }]);
  });

  it("racing orders never pass the daily cap", async () => {
    // Two connections to the same file stand in for two Worker isolates.
    const other = openFileD1(file);
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        createOrderWithHold((index % 2 ? other : d1).db, orderRecord(), {
          limitUnits: LIMIT,
          dailyLimitUnits: DAILY,
        }),
      ),
    );
    other.close();
    expect(results.filter((r) => r === "created")).toHaveLength(2);
    expect(d1.heldUnitsToday("2026-10-12")).toBe(2 * LIMIT);
    expect(rows("SELECT id FROM orders")).toHaveLength(2);
  });

  it("a crash between the order write and the hold write leaves neither", async () => {
    const order = orderRecord();
    // The order row fails (duplicate id) after the hold row was written in
    // the same batch: the whole batch rolls back.
    d1.query(
      `INSERT INTO orders (id, email, business_name, website, mode, environment, state, created_at, expires_at)
       VALUES ('${order.id}', 'e', 'n', 'w', 'live', 'production', 'open', 't', 't') RETURNING id`,
    );
    await expect(
      createOrderWithHold(d1.db, order, {
        limitUnits: LIMIT,
        dailyLimitUnits: DAILY,
      }),
    ).rejects.toThrow();
    expect(rows("SELECT * FROM provider_spend")).toEqual([]);
  });
});

describe("order calls past the deadline (R-23)", () => {
  const DEADLINE = new Date("2026-10-13T10:00:00.000Z");
  const setState = (id: string, state: string) =>
    d1.query(
      `UPDATE orders SET state = '${state}', deadline_at = '${DEADLINE.toISOString()}' WHERE id = '${id}' RETURNING 1`,
    );

  it("a report call is allowed one second before the deadline and refused from the deadline on", async () => {
    const { order } = await liveOrder();
    setState(order.id, "reporting");
    const report = { ...call, stage: "report", orderId: order.id, usd: 0.04 };
    await reserveOrderCall(d1.db, {
      ...report,
      now: () => new Date(DEADLINE.getTime() - 1000),
    });
    // The language-fix call, after the deadline passed during the first call.
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, { ...report, now: () => DEADLINE }),
        )
      )?.code,
    ).toBe("order_refused");
    expect(
      d1.query("SELECT id FROM provider_spend WHERE kind = 'order_call'"),
    ).toHaveLength(1);
  });

  it("a question call reserved after the deadline is refused", async () => {
    const { order } = await liveOrder();
    setState(order.id, "running");
    const question = { ...call, orderId: order.id, usd: 0.1 };
    await reserveOrderCall(d1.db, {
      ...question,
      now: () => new Date(DEADLINE.getTime() - 1000),
    });
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, {
            ...question,
            now: () => new Date(DEADLINE.getTime() + 1000),
          }),
        )
      )?.code,
    ).toBe("order_refused");
  });
});

describe("order calls (R-09, AC-06, AC-07)", () => {
  it("is refused with no order, an unknown order, or a state that does not allow it", async () => {
    const { order } = await liveOrder();
    const unknown = "f".repeat(32);
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, { ...call, orderId: unknown, usd: 0.1 }),
        )
      )?.code,
    ).toBe("order_refused");
    // `open` allows reading and question writing, not observations.
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.1 }),
        )
      )?.code,
    ).toBe("order_refused");
    await reserveOrderCall(d1.db, {
      ...call,
      stage: "extract",
      orderId: order.id,
      usd: 0.1,
    });
    await reserveOrderCall(d1.db, {
      ...call,
      stage: "questions",
      orderId: order.id,
      usd: 0.1,
    });
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, {
            ...call,
            stage: "report",
            orderId: order.id,
            usd: 0.1,
          }),
        )
      )?.code,
    ).toBe("order_refused");
    setState(order.id, "running");
    await reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.1 });
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, {
            ...call,
            stage: "extract",
            orderId: order.id,
            usd: 0.1,
          }),
        )
      )?.code,
    ).toBe("order_refused");
    setState(order.id, "reporting");
    await reserveOrderCall(d1.db, {
      ...call,
      stage: "report",
      orderId: order.id,
      usd: 0.1,
    });
    setState(order.id, "failed");
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, {
            ...call,
            stage: "report",
            orderId: order.id,
            usd: 0.1,
          }),
        )
      )?.code,
    ).toBe("order_refused");
  });

  it("is refused for a synthetic order (no hold exists)", async () => {
    const order = orderRecord("synthetic");
    await createOrderWithHold(d1.db, order, null);
    setState(order.id, "running");
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.1 }),
        )
      )?.code,
    ).toBe("order_refused");
  });

  it("is not sent when it would pass the order's own hold, even if a higher limit is set later", async () => {
    const { order } = await liveOrder(usdToUnits(1)); // this order holds 1.00
    setState(order.id, "running");
    // The setting is now USD 5; the order still holds only its own 1.00.
    await reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.4 });
    await reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.4 });
    const error = await refusal(
      reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.4 }),
    );
    expect(error?.code).toBe("order_limit");
    // A smaller call that still fits is admitted: the limit is exact.
    await reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.2 });
    expect(
      rows(
        "SELECT SUM(held_units) AS n FROM provider_spend WHERE kind = 'order_call'",
      )[0].n,
    ).toBe(usdToUnits(1));
  });

  it("settling a call to its actual cost frees the unused reservation; an unsettled call stays held", async () => {
    const { order } = await liveOrder(usdToUnits(1));
    setState(order.id, "running");
    const first = await reserveOrderCall(d1.db, {
      ...call,
      orderId: order.id,
      usd: 0.6,
    });
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.6 }),
        )
      )?.code,
    ).toBe("order_limit");
    await first.settle(0.1);
    await reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.6 }); // never settled
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.6 }),
        )
      )?.code,
    ).toBe("order_limit");
  });

  it("finishes within its hold when other spend fills the daily cap and when the UTC day changes", async () => {
    const { order } = await liveOrder();
    setState(order.id, "running");
    // Other spend fills what is left of the daily cap.
    d1.query(
      `INSERT INTO provider_spend (id, day, status, provider, stage, reserved_units, held_units, created_at)
       VALUES ('fill', '2026-10-12', 'reserved', 'openai', 'x', 1, ${DAILY - LIMIT}, 't') RETURNING id`,
    );
    expect(d1.heldUnitsToday("2026-10-12")).toBe(DAILY);
    await reserveOrderCall(d1.db, {
      ...call,
      orderId: order.id,
      usd: 0.5,
      now: () => DAY1,
    });
    // The UTC day changes mid-run: the new day's total is not touched.
    await reserveOrderCall(d1.db, {
      ...call,
      orderId: order.id,
      usd: 0.5,
      now: () => DAY2,
    });
    expect(d1.heldUnitsToday("2026-10-13")).toBe(0);
    expect(d1.heldUnitsToday("2026-10-12")).toBe(DAILY); // hold + fill, calls not counted twice
    expect(
      rows(
        "SELECT day FROM provider_spend WHERE kind = 'order_call' ORDER BY day",
      ).map((r) => r.day),
    ).toEqual(["2026-10-12", "2026-10-13"]);
  });

  it("racing calls never pass the hold", async () => {
    const { order } = await liveOrder(usdToUnits(1));
    setState(order.id, "running");
    const other = openFileD1(file);
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, index) =>
        reserveOrderCall((index % 2 ? other : d1).db, {
          ...call,
          orderId: order.id,
          usd: 0.1,
        }),
      ),
    );
    other.close();
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
  });

  it("fails closed as unavailable when the database errors", async () => {
    const broken: SpendDb = {
      prepare() {
        throw new Error("D1 down");
      },
      async batch() {
        throw new Error("D1 down");
      },
    };
    expect(
      (
        await refusal(
          reserveOrderCall(broken, {
            ...call,
            orderId: "a".repeat(32),
            usd: 0.1,
          }),
        )
      )?.code,
    ).toBe("unavailable");
  });
});

describe("settling an order (R-10, R-11, AC-08, AC-09)", () => {
  async function runningOrderWithCalls() {
    const { order } = await liveOrder();
    setState(order.id, "running");
    const a = await reserveOrderCall(d1.db, {
      ...call,
      orderId: order.id,
      usd: 0.3,
      now: () => DAY1,
    });
    await a.settle(0.2);
    await reserveOrderCall(d1.db, {
      ...call,
      orderId: order.id,
      usd: 0.4,
      now: () => DAY1,
    }); // unknown cost, stays held
    return order;
  }

  it("settles the hold to the sum of its calls and returns the rest to the creation day's cap", async () => {
    const order = await runningOrderWithCalls();
    expect(d1.heldUnitsToday("2026-10-12")).toBe(LIMIT);
    expect(
      await endOrder(d1.db, {
        orderId: order.id,
        from: ["running", "reporting"],
        to: "delivered",
        now: () => DAY2,
      }),
    ).toBe(true);
    const sum = usdToUnits(0.2) + usdToUnits(0.4);
    expect(
      rows(
        "SELECT status, held_units FROM provider_spend WHERE kind = 'order_hold'",
      ),
    ).toEqual([{ status: "settled", held_units: sum }]);
    expect(d1.heldUnitsToday("2026-10-12")).toBe(sum);
    expect(rows("SELECT state, ended_at FROM orders")[0].state).toBe(
      "delivered",
    );
  });

  it("ends only once, from an allowed state", async () => {
    const order = await runningOrderWithCalls();
    expect(
      await endOrder(d1.db, {
        orderId: order.id,
        from: ["running"],
        to: "failed",
        failureCode: "deadline",
        now: () => DAY1,
      }),
    ).toBe(true);
    expect(
      await endOrder(d1.db, {
        orderId: order.id,
        from: ["running"],
        to: "delivered",
        now: () => DAY1,
      }),
    ).toBe(false);
    expect(rows("SELECT state, failure_code FROM orders")).toEqual([
      { state: "failed", failure_code: "deadline" },
    ]);
  });

  it("refuses a call insert after the hold is settled", async () => {
    const order = await runningOrderWithCalls();
    await endOrder(d1.db, {
      orderId: order.id,
      from: ["running"],
      to: "failed",
      now: () => DAY1,
    });
    setState(order.id, "running"); // even if the state were wrong, the settled hold refuses
    expect(
      (
        await refusal(
          reserveOrderCall(d1.db, { ...call, orderId: order.id, usd: 0.01 }),
        )
      )?.code,
    ).toBe("order_refused");
  });

  it("a call that finishes after the order ended keeps the settled hold equal to its calls", async () => {
    const { order } = await liveOrder();
    setState(order.id, "running");
    const late = await reserveOrderCall(d1.db, {
      ...call,
      orderId: order.id,
      usd: 0.5,
      now: () => DAY1,
    });
    await endOrder(d1.db, {
      orderId: order.id,
      from: ["running"],
      to: "failed",
      now: () => DAY1,
    });
    expect(
      rows("SELECT held_units FROM provider_spend WHERE kind = 'order_hold'")[0]
        .held_units,
    ).toBe(usdToUnits(0.5));
    await late.settle(0.1);
    expect(
      rows("SELECT held_units FROM provider_spend WHERE kind = 'order_hold'")[0]
        .held_units,
    ).toBe(usdToUnits(0.1));
  });

  it("a crash between the state change and the hold settlement leaves neither", async () => {
    const order = await runningOrderWithCalls();
    const crashing: SpendDb = {
      prepare: (sql) => d1.db.prepare(sql),
      batch: (statements) =>
        d1.db.batch([
          statements[0],
          // The hold statement never runs: a failing statement stands in for
          // the crash and rolls the whole batch back.
          d1.db.prepare("INSERT INTO orders (id) VALUES ('boom')").bind(),
        ]),
    };
    await expect(
      endOrder(crashing, {
        orderId: order.id,
        from: ["running"],
        to: "failed",
        now: () => DAY1,
      }),
    ).rejects.toThrow();
    expect(rows("SELECT state FROM orders")[0].state).toBe("running");
    expect(
      rows("SELECT status FROM provider_spend WHERE kind = 'order_hold'")[0]
        .status,
    ).toBe("reserved");
  });

  it("flags an order whose actual cost passes its hold (R-11)", async () => {
    const { order } = await liveOrder(usdToUnits(1));
    setState(order.id, "running");
    const big = await reserveOrderCall(d1.db, {
      ...call,
      orderId: order.id,
      usd: 0.9,
    });
    expect(rows("SELECT overrun FROM orders")[0].overrun).toBe(0);
    await big.settle(1.3); // the provider charged more than the reservation
    expect(rows("SELECT overrun FROM orders")[0].overrun).toBe(1);
  });
});

describe("migrations (R-13)", () => {
  it("migration 1 matches today's provider_spend columns, and the old worker's insert still works after the later ones", () => {
    const old = openFileD1(join(dir, "old.sqlite"), {
      upTo: "0001_provider_spend.sql",
    });
    const columns = old
      .query<{ name: string }>(
        "SELECT name FROM pragma_table_info('provider_spend')",
      )
      .map((row) => row.name);
    expect(columns).toEqual([
      "id",
      "day",
      "status",
      "provider",
      "stage",
      "reserved_units",
      "held_units",
      "created_at",
      "settled_at",
    ]);
    // A row written by the old worker, then the later migrations.
    old.query(
      `INSERT INTO provider_spend (id, day, status, provider, stage, reserved_units, held_units, created_at)
       VALUES ('old', '2026-10-12', 'settled', 'openai', 'x', 5, 5, 't') RETURNING id`,
    );
    old.migrate();
    expect(
      old.query("SELECT kind, order_id, held_units FROM provider_spend"),
    ).toEqual([{ kind: "daily", order_id: null, held_units: 5 }]);
    // The old worker's insert (no new columns named) still works.
    old.query(
      `INSERT INTO provider_spend (id, day, status, provider, stage, reserved_units, held_units, created_at)
       VALUES ('old2', '2026-10-12', 'reserved', 'openai', 'x', 7, 7, 't') RETURNING id`,
    );
    expect(old.heldUnitsToday("2026-10-12")).toBe(12);
    old.close();
  });

  it("a restart does not reapply migrations", () => {
    d1.close();
    d1 = openFileD1(file);
    expect(
      d1.query("SELECT name FROM d1_migrations ORDER BY name").length,
    ).toBeGreaterThanOrEqual(3);
  });
});
