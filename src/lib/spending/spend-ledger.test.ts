import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSpendLedger,
  SpendLedgerError,
  usdToUnits,
  type SpendDb,
} from "./spend-ledger";
import { openFileD1 } from "./sqlite-d1.test-helper";

const DAY1 = new Date("2026-10-12T10:00:00Z");
const DAY2 = new Date("2026-10-13T00:00:01Z");
const call = { provider: "openai", stage: "observation" };

let dir: string;
let file: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-spend-"));
  file = join(dir, "spend.sqlite");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

async function refusal(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as SpendLedgerError;
  }
  return null;
}

describe("spend ledger", () => {
  it("blocks new work once the daily limit would be passed", async () => {
    const d1 = openFileD1(file);
    const ledger = createSpendLedger(d1.db, { limitUsd: 0.1, now: () => DAY1 });
    await ledger.reserve({ ...call, usd: 0.04 });
    await ledger.reserve({ ...call, usd: 0.04 });
    const error = await refusal(ledger.reserve({ ...call, usd: 0.04 }));
    expect(error?.code).toBe("limit_reached");
    // A smaller call that still fits is admitted: the limit is exact.
    await ledger.reserve({ ...call, usd: 0.02 });
    expect(d1.heldUnitsToday("2026-10-12")).toBe(usdToUnits(0.1));
    d1.close();
  });

  it("settling to the actual cost frees the unused reservation", async () => {
    const d1 = openFileD1(file);
    const ledger = createSpendLedger(d1.db, { limitUsd: 0.1, now: () => DAY1 });
    const first = await ledger.reserve({ ...call, usd: 0.08 });
    expect((await refusal(ledger.reserve({ ...call, usd: 0.05 })))?.code).toBe(
      "limit_reached",
    );
    await first.settle(0.01);
    await ledger.reserve({ ...call, usd: 0.05 });
    expect(d1.heldUnitsToday("2026-10-12")).toBe(usdToUnits(0.06));
    d1.close();
  });

  it("an unsettled (failed or unknown-cost) call keeps its full reservation held", async () => {
    const d1 = openFileD1(file);
    const ledger = createSpendLedger(d1.db, { limitUsd: 0.1, now: () => DAY1 });
    await ledger.reserve({ ...call, usd: 0.08 }); // never settled
    expect((await refusal(ledger.reserve({ ...call, usd: 0.05 })))?.code).toBe(
      "limit_reached",
    );
    d1.close();
  });

  it("keeps blocking after a restart (file reopened, fresh ledger)", async () => {
    const before = openFileD1(file);
    const ledger = createSpendLedger(before.db, {
      limitUsd: 0.1,
      now: () => DAY1,
    });
    const spent = await ledger.reserve({ ...call, usd: 0.09 });
    await spent.settle(0.09);
    before.close();

    const after = openFileD1(file);
    const restarted = createSpendLedger(after.db, {
      limitUsd: 0.1,
      now: () => DAY1,
    });
    expect(
      (await refusal(restarted.reserve({ ...call, usd: 0.05 })))?.code,
    ).toBe("limit_reached");
    await restarted.reserve({ ...call, usd: 0.01 });
    after.close();
  });

  it("racing reservations never exceed the limit", async () => {
    // Two connections to the same file stand in for two Worker isolates.
    const a = openFileD1(file);
    const b = openFileD1(file);
    const ledgers = [a, b].map((d1) =>
      createSpendLedger(d1.db, { limitUsd: 0.1, now: () => DAY1 }),
    );
    const results = await Promise.allSettled(
      Array.from({ length: 30 }, (_, index) =>
        ledgers[index % 2].reserve({ ...call, usd: 0.01 }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    expect(a.heldUnitsToday("2026-10-12")).toBe(usdToUnits(0.1));
    a.close();
    b.close();
  });

  it("starts a fresh budget on the next UTC day", async () => {
    const d1 = openFileD1(file);
    let clock = DAY1;
    const ledger = createSpendLedger(d1.db, {
      limitUsd: 0.1,
      now: () => clock,
    });
    await ledger.reserve({ ...call, usd: 0.1 });
    expect((await refusal(ledger.reserve({ ...call, usd: 0.01 })))?.code).toBe(
      "limit_reached",
    );
    clock = DAY2;
    await ledger.reserve({ ...call, usd: 0.1 });
    d1.close();
  });

  it("fails closed as unavailable when the database errors", async () => {
    const broken: SpendDb = {
      prepare() {
        throw new Error("D1 down");
      },
    };
    const ledger = createSpendLedger(broken, { limitUsd: 10 });
    expect((await refusal(ledger.reserve({ ...call, usd: 0.01 })))?.code).toBe(
      "unavailable",
    );
  });

  it("never understates a reservation", () => {
    expect(usdToUnits(0.4076)).toBe(40_760_000);
    expect(usdToUnits(0.000496)).toBe(49_600);
    expect(usdToUnits(0.123456789)).toBe(12_345_679);
  });
});
