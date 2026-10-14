import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import {
  executeSyntheticLocalObservation,
  generateSyntheticLocalReport,
} from "../audit/local-direct-ten-audit";
import type { QuestionExecuteInput } from "../audit/retry";
import {
  createOrderWithHold,
  hasCapRoom,
  reserveOrderCall,
  reserveOrderHold,
  SpendLedgerError,
  usdToUnits,
} from "../spending/spend-ledger";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { resendMailSender } from "./mail";
import {
  isOrderNumber,
  newOrderNumber,
  ORDER_NUMBER_ALPHABET,
} from "./order-number";
import { runOrders, type RunnerDeps } from "./runner";
import {
  activeOrders,
  approveOrder,
  claimOrderLease,
  createOrder,
  ensureOrderNumber,
  getOrder,
  orderInState,
  orderMayRunPaidWork,
  type OrderRow,
} from "./store";
import {
  approve,
  intakeJson,
  makeOrder,
  makePaidOrder,
  T0,
  WIRE_PROMPTS,
} from "./orders.test-helper";

// Spec 017 S4a: the data foundations and the paid-only gate, on the real
// migrations, the real ledger code and the sqlite D1 helper. No network.

const LIMIT = usdToUnits(2);
const DAILY = usdToUnits(5);
const MIGRATION_5 = "0005_orders_prepared_reading.sql";

let dir: string;
let d1: ReturnType<typeof openFileD1>;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-s4a-"));
  d1 = openFileD1(join(dir, "s4a.sqlite"));
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const row = (id: string) =>
  d1.query<Record<string, unknown>>(
    `SELECT * FROM orders WHERE id = '${id}'`,
  )[0]!;
const holds = () =>
  d1.query<Record<string, unknown>>(
    "SELECT * FROM provider_spend WHERE kind = 'order_hold' ORDER BY created_at",
  );
const write = (sql: string, ...values: Array<string | number | null>) =>
  d1.db
    .prepare(sql)
    .bind(...values)
    .run();

let attemptCounter = 0;
/** An attempt row, written directly (S4b writes them for real). */
async function addAttempt(
  orderId: string,
  status = "open",
  windowEnd = "2026-10-12T11:00:00.000Z",
) {
  attemptCounter += 1;
  await write(
    `INSERT INTO payment_attempts
       (id, order_id, attempt_number, midtrans_order_id, window_start, window_end,
        status, created_at, updated_at)
     VALUES (?1, ?2, 1, ?3, ?4, ?5, ?6, ?4, ?4)`,
    `attempt-${attemptCounter}`,
    orderId,
    `NV-TEST${attemptCounter}-1`,
    T0.toISOString(),
    windowEnd,
    status,
  );
  return `attempt-${attemptCounter}`;
}

async function newOrder(
  paymentKind: "unpaid" | "test",
  options: {
    previousOrderId?: unknown;
    mode?: "live" | "synthetic";
    now?: Date;
    newOrderNumber?: () => string;
  } = {},
) {
  return createOrder(d1.db, {
    email: "owner@example.com",
    businessName: "Kopi Nuave",
    website: "https://kopinuave.example/",
    mode: options.mode ?? "live",
    environment: "production",
    paymentKind,
    limitUsd: 2,
    dailyLimitUsd: 5,
    previousOrderId: options.previousOrderId,
    now: options.now ?? T0,
    newOrderNumber: options.newOrderNumber,
  });
}

describe("migration 0006 on a database that already has S3 rows (R-23)", () => {
  it("applies cleanly, gives every existing order a distinct order number, and keeps S3 orders legacy", async () => {
    const old = openFileD1(join(dir, "old.sqlite"), { upTo: MIGRATION_5 });
    // Rows exactly as S3 code wrote them (no S4 column named).
    for (let i = 1; i <= 120; i += 1) {
      const id = i.toString(16).padStart(32, "0");
      await old.db
        .prepare(
          `INSERT INTO orders
             (id, email, business_name, website, mode, environment, state, created_at, expires_at)
           VALUES (?1, 'owner@example.com', 'Kopi', 'https://example.com/', 'live',
                   'production', ?2, ?3, ?4)`,
        )
        .bind(
          id,
          i % 3 === 0 ? "delivered" : "open",
          "2026-10-12T10:00:00.000Z",
          "2026-10-12T12:00:00.000Z",
        )
        .run();
      await old.db
        .prepare(
          `INSERT INTO provider_spend
             (id, day, status, provider, stage, reserved_units, held_units, created_at, kind, order_id)
           VALUES (?1, '2026-10-12', 'reserved', 'nuave', 'order_hold', ?2, ?2, ?3, 'order_hold', ?4)`,
        )
        .bind(`hold-${i}`, LIMIT, "2026-10-12T10:00:00.000Z", id)
        .run();
    }
    // Some rows deleted: the rowids have gaps.
    old.query("DELETE FROM orders WHERE id LIKE '%0a' RETURNING 1");
    old.migrate();

    const orders = old.query<{
      order_number: string;
      payment_kind: string | null;
      paid_at: string | null;
      replaced_by: string | null;
    }>("SELECT * FROM orders");
    expect(orders.length).toBeGreaterThan(100);
    const numbers = orders.map((order) => order.order_number);
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const number of numbers) expect(isOrderNumber(number)).toBe(true);
    expect(
      orders.every(
        (order) =>
          order.payment_kind === null &&
          order.paid_at === null &&
          order.replaced_by === null,
      ),
    ).toBe(true);
    // Old hold rows are kept; the new ledger column defaults to "not a test".
    expect(
      old.query<{ test: number }>("SELECT test FROM provider_spend")[0]!.test,
    ).toBe(0);
    // The unique index is there.
    expect(() =>
      old.query(
        "INSERT INTO provider_spend (id, day, status, provider, stage, reserved_units, held_units, created_at, kind, order_id) VALUES ('dup', '2026-10-12', 'reserved', 'nuave', 'order_hold', 1, 1, 'x', 'order_hold', '" +
          "0".repeat(31) +
          "1') RETURNING 1",
      ),
    ).toThrow(/UNIQUE/);
    old.close();
  });

  it("creates every S4 table with no card, bank or wallet column", () => {
    const tables = d1
      .query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
      )
      .map((table) => table.name);
    for (const name of [
      "payment_attempts",
      "payment_transactions",
      "founder_notices",
      "payment_emails",
    ]) {
      expect(tables).toContain(name);
    }
    const columns = [
      "payment_attempts",
      "payment_transactions",
      "founder_notices",
      "payment_emails",
    ].flatMap((table) =>
      d1.query<{ name: string }>(`PRAGMA table_info(${table})`),
    );
    expect(
      columns.filter((column) =>
        /card|bank|wallet|account|va_number|phone|email/i.test(column.name),
      ),
    ).toEqual([]);
  });

  it("the payment attempt's Midtrans order_id and the notice key are unique", async () => {
    const id = await makeOrder(d1.db, { payment: "unpaid" });
    await addAttempt(id);
    await expect(
      write(
        `INSERT INTO payment_attempts
           (id, order_id, attempt_number, midtrans_order_id, window_start, window_end, created_at, updated_at)
         VALUES ('x', ?1, 2, 'NV-TEST1-1', 'a', 'b', 'a', 'a')`,
        id,
      ),
    ).rejects.toThrow(/UNIQUE/);
    const notice = `INSERT INTO founder_notices (id, kind, subject, created_at)
                    VALUES (?1, 'cap_80', '2026-10-12', 'now')`;
    await write(notice, "n1");
    await expect(write(notice, "n2")).rejects.toThrow(/UNIQUE/);
  });
});

describe("the order number (R-01, R-02, R-23)", () => {
  it("is NV- and 6 characters without look-alike letters", () => {
    expect(ORDER_NUMBER_ALPHABET).toHaveLength(31);
    expect(ORDER_NUMBER_ALPHABET).not.toMatch(/[01ILO]/);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i += 1) {
      const number = newOrderNumber();
      expect(isOrderNumber(number)).toBe(true);
      seen.add(number.slice(3));
    }
    // Every character is used somewhere in 12000 draws.
    expect(new Set([...seen].join("")).size).toBe(31);
    expect(isOrderNumber("NV-7K3Q9P")).toBe(true);
    expect(isOrderNumber("NV-7K3Q9O")).toBe(false);
    expect(isOrderNumber("nv-7k3q9p")).toBe(false);
  });

  it("every order made gets one at creation", async () => {
    const { orderId, orderNumber } = await newOrder("unpaid");
    expect(row(orderId).order_number).toBe(orderNumber);
    expect(isOrderNumber(orderNumber)).toBe(true);
  });

  it("a collision with an existing number is retried through the unique index", async () => {
    const first = await newOrder("unpaid");
    const drawn: string[] = [];
    const queue = [first.orderNumber, first.orderNumber, "NV-ZZZZZZ"];
    const second = await newOrder("unpaid", {
      newOrderNumber: () => {
        const next = queue.shift()!;
        drawn.push(next);
        return next;
      },
    });
    expect(drawn).toEqual([first.orderNumber, first.orderNumber, "NV-ZZZZZZ"]);
    expect(second.orderNumber).toBe("NV-ZZZZZZ");
    expect(row(second.orderId).order_number).toBe("NV-ZZZZZZ");
    // The failed tries left no half-written order or hold behind.
    expect(d1.query("SELECT id FROM orders")).toHaveLength(2);
  });

  it("a test pass whose number collides leaves no orphan hold behind", async () => {
    const first = await newOrder("unpaid");
    const queue = [first.orderNumber, "NV-YYYYYY"];
    const second = await newOrder("test", {
      newOrderNumber: () => queue.shift()!,
    });
    expect(second.result).toBe("created");
    expect(holds()).toHaveLength(1);
  });

  it("gives up after five collisions instead of looping", async () => {
    const first = await newOrder("unpaid");
    await expect(
      newOrder("unpaid", { newOrderNumber: () => first.orderNumber }),
    ).rejects.toThrow(/UNIQUE/);
  });

  it("an order made by S3 code gets a number before its next email, and keeps it", async () => {
    const id = await makeOrder(d1.db, { payment: "legacy" });
    d1.query(
      `UPDATE orders SET order_number = NULL WHERE id = '${id}' RETURNING 1`,
    );
    const legacy = (await getOrder(d1.db, id))!;
    expect(legacy.order_number).toBeNull();
    const number = await ensureOrderNumber(d1.db, legacy);
    expect(isOrderNumber(number)).toBe(true);
    expect(row(id).order_number).toBe(number);
    // Asked again, from the old copy, it returns the same number.
    expect(await ensureOrderNumber(d1.db, legacy)).toBe(number);
  });

  it("retries a collision when giving a legacy order its number", async () => {
    const taken = (await newOrder("unpaid")).orderNumber;
    const id = await makeOrder(d1.db, { payment: "legacy" });
    d1.query(
      `UPDATE orders SET order_number = NULL WHERE id = '${id}' RETURNING 1`,
    );
    const queue = [taken, "NV-XXXXXX"];
    expect(
      await ensureOrderNumber(d1.db, { id, order_number: null }, () =>
        queue.shift()!,
      ),
    ).toBe("NV-XXXXXX");
  });

  it("is not an order ID: no lookup by number works through the order store", async () => {
    const { orderNumber } = await newOrder("unpaid");
    expect(await getOrder(d1.db, orderNumber)).toBeNull();
    expect(
      await orderInState(d1.db, {
        orderId: orderNumber,
        environment: "production",
        mode: "live",
        states: ["open"],
        now: T0,
      }),
    ).toBeNull();
  });
});

describe("an unpaid order holds nothing; the hold moves (R-10, R-11, AC-10)", () => {
  it("an unpaid live order writes no ledger row, however full the day is", async () => {
    const { result, orderId } = await newOrder("unpaid");
    expect(result).toBe("created");
    expect(holds()).toEqual([]);
    expect(d1.heldUnitsToday("2026-10-12")).toBe(0);
    expect(row(orderId)).toMatchObject({
      payment_kind: "unpaid",
      state: "open",
      expires_at: "2026-10-12T12:00:00.000Z", // the 2-hour unstarted rule
    });
  });

  it("a live test pass reserves its hold at creation, marked test, on the creation day", async () => {
    const { result, orderId } = await newOrder("test");
    expect(result).toBe("created");
    expect(holds()).toMatchObject([
      {
        order_id: orderId,
        day: "2026-10-12",
        reserved_units: LIMIT,
        test: 1,
        status: "reserved",
      },
    ]);
  });

  it("a synthetic test pass holds nothing", async () => {
    await newOrder("test", { mode: "synthetic" });
    expect(holds()).toEqual([]);
  });

  describe("the cap-room rule counts open attempts of any order and day", () => {
    it("today's total + one limit per open attempt + one for this order must fit the cap", async () => {
      const q = { now: T0, limitUnits: LIMIT, dailyLimitUnits: DAILY };
      expect(await hasCapRoom(d1.db, q)).toBe(true);
      const a = await makeOrder(d1.db, { payment: "unpaid" });
      await addAttempt(a); // 2 + 2 <= 5
      expect(await hasCapRoom(d1.db, q)).toBe(true);
      const b = await makeOrder(d1.db, { payment: "unpaid" });
      await addAttempt(b); // 4 + 2 > 5
      expect(await hasCapRoom(d1.db, q)).toBe(false);
    });

    it("an attempt that is not open does not count", async () => {
      const q = { now: T0, limitUnits: LIMIT, dailyLimitUnits: DAILY };
      const ids = [];
      for (const status of [
        "paid",
        "needs_refund",
        "finally_unpaid",
        "closed_unknown",
        "void",
      ]) {
        const id = await makeOrder(d1.db, { payment: "unpaid" });
        await addAttempt(id, status);
        ids.push(id);
      }
      expect(await hasCapRoom(d1.db, q)).toBe(true);
    });

    it("an attempt that started on an earlier day still counts today", async () => {
      const id = await makeOrder(d1.db, {
        payment: "unpaid",
        now: new Date("2026-10-11T23:50:00Z"),
      });
      await addAttempt(id, "open", "2026-10-12T00:50:00.000Z");
      await addAttempt(await makeOrder(d1.db, { payment: "unpaid" }), "open");
      expect(
        await hasCapRoom(d1.db, {
          now: new Date("2026-10-12T01:00:00Z"),
          limitUnits: LIMIT,
          dailyLimitUnits: DAILY,
        }),
      ).toBe(false);
    });

    it("counts today's holds and settled rows too", async () => {
      await newOrder("test");
      await newOrder("test"); // 4 held
      expect(
        await hasCapRoom(d1.db, {
          now: T0,
          limitUnits: LIMIT,
          dailyLimitUnits: DAILY,
        }),
      ).toBe(false);
      expect(
        await hasCapRoom(d1.db, {
          now: new Date("2026-10-13T00:00:01Z"), // tomorrow is empty
          limitUnits: LIMIT,
          dailyLimitUnits: DAILY,
        }),
      ).toBe(true);
    });

    it("a test pass is refused at creation when open attempts leave no room, and nothing is written", async () => {
      await addAttempt(await makeOrder(d1.db, { payment: "unpaid" }));
      await addAttempt(await makeOrder(d1.db, { payment: "unpaid" }));
      const before = JSON.stringify(d1.query("SELECT id FROM orders"));
      const { result } = await newOrder("test");
      expect(result).toBe("cap_full");
      expect(JSON.stringify(d1.query("SELECT id FROM orders"))).toBe(before);
      expect(holds()).toEqual([]);
    });
  });

  describe("the hold primitive for mark-paid and the test pass (R-11)", () => {
    const hold = (
      orderId: string,
      options: {
        now?: Date;
        daily?: number | null;
        test?: boolean;
      } = {},
    ) =>
      reserveOrderHold(d1.db, {
        orderId,
        now: options.now ?? T0,
        limitUnits: LIMIT,
        dailyLimitUnits: options.daily === undefined ? null : options.daily,
        test: options.test ?? false,
      });

    it("reserves once per order, on the UTC day of the given time", async () => {
      const id = await makeOrder(d1.db, { mode: "live", payment: "unpaid" });
      const payment = new Date("2026-10-14T00:00:05Z");
      expect(await hold(id, { now: payment })).toBe("reserved");
      expect(await hold(id, { now: payment })).toBe("already_held");
      expect(await hold(id, { now: T0, daily: DAILY })).toBe("already_held");
      expect(holds()).toMatchObject([
        { order_id: id, day: "2026-10-14", reserved_units: LIMIT, test: 0 },
      ]);
    });

    it("without the cap check it reserves even when the cap is full (the customer has paid)", async () => {
      await newOrder("test");
      await newOrder("test"); // 4 of 5 held
      const id = await makeOrder(d1.db, { mode: "live", payment: "unpaid" });
      expect(await hold(id)).toBe("reserved");
      expect(d1.heldUnitsToday("2026-10-12")).toBe(usdToUnits(6));
    });

    it("with the cap check it refuses when there is no room, and writes nothing", async () => {
      await newOrder("test");
      await newOrder("test");
      const id = await makeOrder(d1.db, { mode: "live", payment: "unpaid" });
      expect(await hold(id, { daily: DAILY, test: true })).toBe("cap_full");
      expect(holds()).toHaveLength(2);
    });

    it("with the cap check it counts open attempts of other orders", async () => {
      const id = await makeOrder(d1.db, { mode: "live", payment: "unpaid" });
      await addAttempt(await makeOrder(d1.db, { payment: "unpaid" }));
      await addAttempt(await makeOrder(d1.db, { payment: "unpaid" }));
      expect(await hold(id, { daily: DAILY })).toBe("cap_full");
      d1.query("UPDATE payment_attempts SET status = 'void' RETURNING 1");
      expect(await hold(id, { daily: DAILY, test: true })).toBe("reserved");
      expect(holds()[0]).toMatchObject({ test: 1 });
    });

    it("refuses a synthetic order, an unknown order and an ended order", async () => {
      const synthetic = await makeOrder(d1.db, { payment: "unpaid" });
      expect(await hold(synthetic)).toBe("order_refused");
      expect(await hold("e".repeat(32))).toBe("order_refused");
      const ended = await makeOrder(d1.db, { mode: "live", payment: "unpaid" });
      d1.query(
        `UPDATE orders SET state = 'expired' WHERE id = '${ended}' RETURNING 1`,
      );
      expect(await hold(ended)).toBe("order_refused");
      expect(holds()).toEqual([]);
    });

    it("the unique index stops a second hold row for one order, even a raw insert", async () => {
      const id = await makeOrder(d1.db, { mode: "live", payment: "paid" });
      await expect(
        write(
          `INSERT INTO provider_spend
             (id, day, status, provider, stage, reserved_units, held_units, created_at, kind, order_id)
           VALUES ('again', '2026-10-12', 'reserved', 'nuave', 'order_hold', 1, 1, 'x', 'order_hold', ?1)`,
          id,
        ),
      ).rejects.toThrow(/UNIQUE/);
    });
  });
});

describe("replacing an order (R-19)", () => {
  it("an unpaid open order is marked replaced and ended in the same write", async () => {
    const old = await newOrder("unpaid");
    const next = await newOrder("unpaid", { previousOrderId: old.orderId });
    expect(next.result).toBe("created");
    expect(row(old.orderId)).toMatchObject({
      replaced_by: next.orderId,
      state: "expired",
      ended_at: T0.toISOString(),
    });
    expect(row(next.orderId)).toMatchObject({
      state: "open",
      replaced_by: null,
    });
    // A replaced order may not run any paid work.
    expect(orderMayRunPaidWork(row(old.orderId) as unknown as OrderRow)).toBe(
      false,
    );
  });

  it("an unpaid order that has already expired is also marked replaced", async () => {
    const old = await newOrder("unpaid");
    d1.query(
      `UPDATE orders SET state = 'expired', ended_at = 'x' WHERE id = '${old.orderId}' RETURNING 1`,
    );
    const next = await newOrder("unpaid", {
      previousOrderId: old.orderId,
      now: new Date("2026-10-12T15:00:00Z"),
    });
    expect(row(old.orderId).replaced_by).toBe(next.orderId);
    expect(row(old.orderId).ended_at).toBe("x"); // not rewritten
  });

  it("an unpaid order whose attempts are all final is replaced", async () => {
    const old = await newOrder("unpaid");
    await addAttempt(old.orderId, "finally_unpaid");
    const next = await newOrder("unpaid", { previousOrderId: old.orderId });
    expect(next.result).toBe("created");
    expect(row(old.orderId).replaced_by).toBe(next.orderId);
  });

  it.each([
    ["midtrans", "paid"],
    ["simulated", "paid"],
  ] as const)(
    "a %s paid order is never replaced: nothing is written and the answer says it is paid",
    async (kind, expected) => {
      const old = await newOrder("unpaid");
      d1.query(
        `UPDATE orders SET payment_kind = '${kind}' WHERE id = '${old.orderId}' RETURNING 1`,
      );
      const before = JSON.stringify(d1.query("SELECT * FROM orders"));
      const next = await newOrder("unpaid", { previousOrderId: old.orderId });
      expect(next.result).toBe("previous_active");
      expect(next.previousState).toBe(expected);
      expect(JSON.stringify(d1.query("SELECT * FROM orders"))).toBe(before);
    },
  );

  it("an order with an open attempt is never replaced, and is not ended", async () => {
    const old = await newOrder("unpaid");
    await addAttempt(old.orderId, "open");
    const before = JSON.stringify(d1.query("SELECT * FROM orders"));
    const next = await newOrder("unpaid", { previousOrderId: old.orderId });
    expect(next.result).toBe("previous_active");
    expect(next.previousState).toBe("payment_open");
    expect(JSON.stringify(d1.query("SELECT * FROM orders"))).toBe(before);
    expect(row(old.orderId).state).toBe("open");
  });

  it("the refusal is decided inside the same write: an attempt that opens after the checks but before the batch still stops the replacement", async () => {
    const old = await newOrder("unpaid");
    // A racing start-payment request lands its attempt just before the batch.
    const racing = {
      prepare: d1.db.prepare,
      batch: async (statements: Parameters<typeof d1.db.batch>[0]) => {
        await addAttempt(old.orderId, "open");
        return d1.db.batch(statements);
      },
    };
    const result = await createOrderWithHold(
      racing,
      {
        id: "c".repeat(32),
        orderNumber: "NV-RACE22",
        paymentKind: "unpaid",
        email: "owner@example.com",
        businessName: "Kopi",
        website: "https://kopinuave.example/",
        mode: "live",
        environment: "production",
        createdAt: T0,
        expiresAt: new Date(T0.getTime() + 7_200_000),
        replacing: { orderId: old.orderId },
      },
      null,
    );
    expect(result).toBe("previous_active");
    expect(row(old.orderId)).toMatchObject({
      state: "open",
      replaced_by: null,
    });
    expect(d1.query("SELECT id FROM orders")).toHaveLength(1);
  });

  it("replacing a test-pass order whose calls passed its hold flags the overrun, as ending it does", async () => {
    const old = await makeOrder(d1.db, { mode: "live", payment: "test" });
    await write(
      `INSERT INTO provider_spend
         (id, day, status, provider, stage, reserved_units, held_units, created_at, kind, order_id, test)
       VALUES ('over', '2026-10-12', 'settled', 'openai', 'observation', ?2, ?2, 'x', 'order_call', ?1, 1)`,
      old,
      LIMIT + 1,
    );
    d1.query(
      `UPDATE orders SET lease_owner = 'x', lease_until = 'y' WHERE id = '${old}' RETURNING 1`,
    );
    expect(row(old).overrun).toBe(0);
    const next = await newOrder("unpaid", { previousOrderId: old });
    expect(next.result).toBe("created");
    expect(row(old)).toMatchObject({
      state: "expired",
      overrun: 1,
      lease_owner: null,
      lease_until: null,
    });
  });

  it("a test-pass or legacy order that is still open is ended and its hold returns", async () => {
    for (const payment of ["test", "legacy"] as const) {
      const old = await makeOrder(d1.db, { mode: "live", payment });
      const before = d1.heldUnitsToday("2026-10-12");
      const next = await newOrder("unpaid", { previousOrderId: old });
      expect(next.result).toBe("created");
      expect(row(old)).toMatchObject({ state: "expired", replaced_by: null });
      expect(d1.heldUnitsToday("2026-10-12")).toBe(before - LIMIT);
    }
  });

  it("a test-pass or legacy order that has started or ended is left alone", async () => {
    for (const payment of ["test", "legacy"] as const) {
      const running = await makeOrder(d1.db, { payment });
      await approve(d1.db, running);
      const done = await makeOrder(d1.db, { payment });
      d1.query(
        `UPDATE orders SET state = 'delivered' WHERE id = '${done}' RETURNING 1`,
      );
      for (const old of [running, done]) {
        const state = row(old).state;
        const next = await newOrder("unpaid", {
          previousOrderId: old,
          mode: "synthetic",
        });
        expect(next.result).toBe("created");
        expect(row(old).state).toBe(state);
        expect(row(old).replaced_by).toBeNull();
      }
    }
  });

  it("an unknown or other-environment order is ignored and the new order is made", async () => {
    const preview = await makeOrder(d1.db, {
      payment: "unpaid",
      environment: "preview",
    });
    for (const previousOrderId of ["a".repeat(32), preview, "nope", 7, null]) {
      expect((await newOrder("unpaid", { previousOrderId })).result).toBe(
        "created",
      );
    }
    expect(row(preview)).toMatchObject({ state: "open", replaced_by: null });
  });

  it("a test pass that finds no room leaves the older unpaid order untouched", async () => {
    await newOrder("test");
    await newOrder("test"); // 4 of 5 held
    const old = await newOrder("unpaid");
    const next = await newOrder("test", { previousOrderId: old.orderId });
    expect(next.result).toBe("cap_full");
    expect(row(old.orderId)).toMatchObject({
      state: "open",
      replaced_by: null,
    });
  });

  it("a replaced order frees the room a new test pass needs when it was a test order", async () => {
    const a = await newOrder("test");
    await newOrder("test"); // 4 of 5 held
    expect((await newOrder("test")).result).toBe("cap_full");
    expect(
      (await newOrder("test", { previousOrderId: a.orderId })).result,
    ).toBe("created");
  });
});

describe("the paid-only gate (R-18, AC-04)", () => {
  const stateOf = (
    payment_kind: OrderRow["payment_kind"],
    mode: OrderRow["mode"] = "synthetic",
    replaced_by: string | null = null,
  ) => orderMayRunPaidWork({ payment_kind, mode, replaced_by });

  it("lets through only paid, test, legacy and (synthetic only) simulated orders that are not replaced", () => {
    expect(stateOf("unpaid")).toBe(false);
    expect(stateOf("unpaid", "live")).toBe(false);
    expect(stateOf("midtrans", "live")).toBe(true);
    expect(stateOf("test", "live")).toBe(true);
    expect(stateOf(null, "live")).toBe(true);
    expect(stateOf("simulated", "synthetic")).toBe(true);
    expect(stateOf("simulated", "live")).toBe(false);
    expect(stateOf("midtrans", "live", "f".repeat(32))).toBe(false);
  });

  const paymentKinds = [
    ["unpaid", false],
    ["test", true],
    ["paid", true],
    ["simulated", true],
    ["legacy", true],
  ] as const;

  it.each(paymentKinds)(
    "an open %s synthetic order: orderInState and approveOrder agree (%s)",
    async (payment, allowed) => {
      const id = await makeOrder(d1.db, { payment });
      const found = await orderInState(d1.db, {
        orderId: id,
        environment: "production",
        mode: "synthetic",
        states: ["open"],
        now: T0,
      });
      expect(found !== null).toBe(allowed);
      const approved = await approveOrder(d1.db, {
        orderId: id,
        environment: "production",
        mode: "synthetic",
        intakeJson: intakeJson(),
        businessName: "Kopi Nuave",
        promptIds: WIRE_PROMPTS.map((prompt) => prompt.prompt_id),
        now: T0,
      });
      expect(approved).toBe(allowed);
      // A refused approval writes nothing: no state change, no question rows.
      if (!allowed) {
        expect(row(id).state).toBe("open");
        expect(d1.query("SELECT * FROM order_questions")).toEqual([]);
      }
    },
  );

  it("a simulated order is refused in live mode, with no ledger row", async () => {
    const id = await makeOrder(d1.db, { mode: "live", payment: "unpaid" });
    d1.query(
      `UPDATE orders SET payment_kind = 'simulated' WHERE id = '${id}' RETURNING 1`,
    );
    expect(
      await orderInState(d1.db, {
        orderId: id,
        environment: "production",
        mode: "live",
        states: ["open"],
        now: T0,
      }),
    ).toBeNull();
    expect(holds()).toEqual([]);
  });

  it("a replaced order is refused even if it was marked paid by mistake", async () => {
    const id = await makeOrder(d1.db, { payment: "paid" });
    d1.query(
      `UPDATE orders SET replaced_by = '${"b".repeat(32)}' WHERE id = '${id}' RETURNING 1`,
    );
    expect(
      await orderInState(d1.db, {
        orderId: id,
        environment: "production",
        mode: "synthetic",
        states: ["open"],
        now: T0,
      }),
    ).toBeNull();
  });

  it("the cron's audit steps skip an unpaid order that somehow runs, and write no ledger row", async () => {
    const unpaid = await makeOrder(d1.db, { payment: "unpaid" });
    // The approve write itself refuses an unpaid order...
    await expect(approve(d1.db, unpaid)).rejects.toThrow("not approved");
    expect(row(unpaid).state).toBe("open");
    // ...so force the state the cron's gate must still stop.
    d1.query(
      `UPDATE orders SET state = 'running', started_at = '${T0.toISOString()}', deadline_at = '2026-10-13T10:00:00.000Z' WHERE id = '${unpaid}' RETURNING 1`,
    );
    expect(
      await activeOrders(d1.db, {
        environment: "production",
        mode: "synthetic",
        now: T0,
        limit: 5,
      }),
    ).toEqual([]);
    expect(
      await claimOrderLease(d1.db, {
        orderId: unpaid,
        owner: "x",
        now: T0,
        leaseMs: 60_000,
      }),
    ).toBe(false);
    const executed: string[] = [];
    const summary = await runOrders({
      db: d1.db,
      environment: "production",
      mode: "synthetic",
      siteOrigin: "https://v2.nuave.test",
      now: () => T0,
      execute: async (input: QuestionExecuteInput) => {
        executed.push(input.prompt.prompt_id);
        return executeSyntheticLocalObservation(input);
      },
      generateReport: generateSyntheticLocalReport,
      sender: null,
    });
    expect(executed).toEqual([]);
    expect(summary.outcomes).toEqual([]);
    expect(holds()).toEqual([]);
  });

  it("a live call for an unpaid order is refused by the ledger and writes no row, even if a hold row exists", async () => {
    const id = await makeOrder(d1.db, { mode: "live", payment: "unpaid" });
    await reserveOrderHold(d1.db, {
      orderId: id,
      now: T0,
      limitUnits: LIMIT,
      dailyLimitUnits: null,
      test: false,
    });
    d1.query(
      `UPDATE orders SET state = 'running', started_at = '${T0.toISOString()}', deadline_at = '2026-10-13T10:00:00.000Z' WHERE id = '${id}' RETURNING 1`,
    );
    await expect(
      reserveOrderCall(d1.db, {
        orderId: id,
        provider: "openai",
        stage: "observation",
        usd: 0.1,
        now: () => T0,
      }),
    ).rejects.toMatchObject({ code: "order_refused" });
    expect(
      d1.query("SELECT * FROM provider_spend WHERE kind = 'order_call'"),
    ).toEqual([]);
  });

  it("call rows of a test-pass order are marked test; a paid order's are not (R-20)", async () => {
    const test = await makeOrder(d1.db, { mode: "live", payment: "test" });
    const paid = await makePaidOrder(d1.db, { mode: "live" });
    for (const id of [test, paid]) await approve(d1.db, id, { mode: "live" });
    for (const id of [test, paid]) {
      await reserveOrderCall(d1.db, {
        orderId: id,
        provider: "openai",
        stage: "observation",
        usd: 0.1,
        now: () => T0,
      });
    }
    const calls = d1.query<{ order_id: string; test: number }>(
      "SELECT order_id, test FROM provider_spend WHERE kind = 'order_call'",
    );
    expect(Object.fromEntries(calls.map((c) => [c.order_id, c.test]))).toEqual({
      [test]: 1,
      [paid]: 0,
    });
    expect(holds().map((hold) => [hold.order_id, hold.test])).toEqual(
      expect.arrayContaining([
        [test, 1],
        [paid, 0],
      ]),
    );
  });
});

describe("a paid order runs past a full daily cap, never past its own limit (AC-09)", () => {
  it("its calls are not stopped by the cap that filled after payment, and are stopped at its own limit", async () => {
    // Today's cap: two test passes hold 4 of 5, then a paid order pays with no
    // cap check: 6 of 5 held.
    await newOrder("test");
    await newOrder("test");
    const paid = await makePaidOrder(d1.db, { mode: "live" });
    expect(d1.heldUnitsToday("2026-10-12")).toBe(usdToUnits(6));
    await approve(d1.db, paid, { mode: "live" });
    const call = (usd: number) =>
      reserveOrderCall(d1.db, {
        orderId: paid,
        provider: "openai",
        stage: "observation",
        usd,
        now: () => T0,
      });
    // 1.9 of its 2.00 fits although the day is over its cap...
    await call(0.95);
    await call(0.95);
    // ...and the call that would pass the order's own limit is refused unsent.
    const refused = await call(0.2).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(SpendLedgerError);
    expect((refused as SpendLedgerError).code).toBe("order_limit");
    expect(
      d1.query("SELECT * FROM provider_spend WHERE kind = 'order_call'"),
    ).toHaveLength(2);
  });
});

describe("the internal order ID stays inside Nuave (R-03, AC-06 for the S3 paths)", () => {
  it("never reaches an email, an idempotency key, a Resend request, a provider input or a log line", async () => {
    const logs: string[] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      });
    }
    // Everything the order sends out, as text.
    const outgoing: string[] = [];
    const resendRequests = vi.fn(async (url: unknown, init?: RequestInit) => {
      outgoing.push(
        JSON.stringify({
          url: String(url),
          headers: init?.headers,
          body: String(init?.body),
        }),
      );
      return new Response(JSON.stringify({ id: "re_1" }), { status: 200 });
    });
    const sender = resendMailSender({
      apiKey: "offline-key",
      from: "Nuave <laporan@nuave.test>",
      fetchImpl: resendRequests as unknown as typeof fetch,
    });

    const ids: string[] = [];
    // Delivered through the ready email, and failed through the failure email,
    // for a paid order, a test pass and a legacy order with no number yet.
    for (const payment of ["paid", "test", "legacy"] as const) {
      const id = await makeOrder(d1.db, { payment });
      ids.push(id);
      if (payment === "legacy") {
        d1.query(
          `UPDATE orders SET order_number = NULL WHERE id = '${id}' RETURNING 1`,
        );
      }
      await approve(d1.db, id);
    }
    const failing = await makeOrder(d1.db, { payment: "paid" });
    ids.push(failing);
    await approve(d1.db, failing);
    d1.query(
      `UPDATE orders SET deadline_at = '${T0.toISOString()}' WHERE id = '${failing}' RETURNING 1`,
    );

    let clock = T0;
    const seen: unknown[] = [];
    const deps: RunnerDeps = {
      db: d1.db,
      environment: "production",
      mode: "synthetic",
      siteOrigin: "https://v2.nuave.test",
      now: () => clock,
      execute: async (input) => {
        seen.push(input);
        return executeSyntheticLocalObservation(input);
      },
      generateReport: async (...args) => {
        seen.push(args);
        return generateSyntheticLocalReport(...args);
      },
      sender,
      sleep: async () => {},
    };
    for (let i = 0; i < 40; i += 1) {
      await runOrders(deps);
      clock = new Date(clock.getTime() + 60_000);
    }
    expect(
      d1.query("SELECT id FROM orders WHERE state = 'delivered'").length,
    ).toBe(3);
    expect(row(failing).state).toBe("failed");
    expect(resendRequests.mock.calls.length).toBeGreaterThanOrEqual(4);
    // The legacy order was given a number before its email.
    for (const id of ids)
      expect(isOrderNumber(row(id).order_number)).toBe(true);

    const everything = JSON.stringify([outgoing, seen, logs]);
    for (const id of ids) expect(everything).not.toContain(id);
    // The keys name the order number.
    const keys = outgoing.map(
      (request) =>
        (JSON.parse(request) as { headers: Record<string, string> }).headers[
          "Idempotency-Key"
        ],
    );
    for (const key of keys) {
      expect(key).toMatch(/^nuave-order-NV-[23456789A-HJKMNP-Z]{6}-/);
    }
    // And every customer email shows the order number.
    for (const request of outgoing) {
      const body = JSON.parse(
        (JSON.parse(request) as { body: string }).body,
      ) as {
        text: string;
      };
      expect(body.text).toMatch(/Nomor pesanan: NV-[23456789A-HJKMNP-Z]{6}/);
    }
  });
});
