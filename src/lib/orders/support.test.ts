import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { POST as reportPOST } from "../../app/api/report/route";
import {
  executeSyntheticLocalObservation,
  generateSyntheticLocalReport,
} from "../audit/local-direct-ten-audit";
import { reserveOrderCall } from "../spending/spend-ledger";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { runOrders, type RunnerDeps } from "./runner";
import {
  approve,
  makeOrder,
  mailbox,
  secretIn,
  T0,
} from "./orders.test-helper";
import {
  d1ThroughWrangler,
  runSupport,
  sqlLiteral,
  SUPPORT_USAGE,
  type SupportDeps,
} from "./support";

// Spec 016 R-32, AC-17, and the `show` part of AC-09: the support commands on a
// test database with a fake sender. The same logic runs in the founder's script
// against D1 through wrangler.

const EMAIL = "owner@example.com";
const SITE = "https://v2.nuave.test";
let dir: string;
let d1: ReturnType<typeof openFileD1>;
let clock: Date;
let fetchSpy: ReturnType<typeof vi.fn>;
let output: string[];
let sqlSeen: string[];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-support-"));
  d1 = openFileD1(join(dir, "support.sqlite"));
  clock = T0;
  output = [];
  sqlSeen = [];
  fetchSpy = vi.fn(async () => new Response("{}", { status: 500 }));
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  mocks.getCloudflareContext.mockReturnValue({
    env: {
      SPEND_DB: d1.db,
      REPORT_DATA_CALLER_RATE_LIMITER: {
        limit: async () => ({ success: true }),
      },
    },
  });
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mocks.getCloudflareContext.mockReset();
});

const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};

/** A delivered order (synthetic run), switched to `live` so `resend` may send
 * (the sender here is a fake mailbox). */
async function deliveredOrder(mode: "live" | "synthetic" = "live") {
  const id = await makeOrder(d1.db, { email: EMAIL, now: clock });
  await approve(d1.db, id, { now: clock });
  const mail = mailbox();
  const deps: RunnerDeps = {
    db: d1.db,
    environment: "production",
    mode: "synthetic",
    siteOrigin: SITE,
    now: () => clock,
    execute: async (input) => executeSyntheticLocalObservation(input),
    generateReport: async (...args) => generateSyntheticLocalReport(...args),
    sender: mail.sender,
  };
  for (let i = 0; i < 12; i += 1) {
    await runOrders(deps);
    advance(60_000);
  }
  if (mode === "live") {
    await d1.db
      .prepare(`UPDATE orders SET mode = 'live' WHERE id = '${id}'`)
      .bind()
      .run();
  }
  return { id, firstSecret: secretIn(mail.sent[0]!) };
}

function support(
  overrides: Partial<SupportDeps> & {
    sender?: ReturnType<typeof mailbox>;
  } = {},
) {
  const sender = overrides.sender ?? mailbox();
  const makeSender = vi.fn(async () => sender.sender);
  const deps: SupportDeps = {
    db: d1.db,
    makeSender,
    siteOrigin: SITE,
    now: () => clock,
    out: (line) => output.push(line),
    ...overrides,
  };
  return {
    sender,
    makeSender,
    run: (...args: string[]) => runSupport(args, deps),
  };
}

const openLink = (secret: string) =>
  reportPOST(
    new Request("https://nuave.test/api/report", {
      method: "POST",
      body: JSON.stringify({ secret }),
    }),
  );
const order = (id: string) =>
  d1.query<Record<string, unknown>>(
    `SELECT * FROM orders WHERE id = '${id}'`,
  )[0]!;

describe("resend (AC-17)", () => {
  it("makes the old link fail and the new one work, to the same address, without changing the report or the state", async () => {
    const { id, firstSecret } = await deliveredOrder();
    expect((await openLink(firstSecret)).status).toBe(200);
    const reportBefore = order(id).report_json;
    const s = support();
    expect(await s.run("resend", id)).toBe(0);
    expect(s.sender.sent).toHaveLength(1);
    const mail = s.sender.sent[0]!;
    expect(mail.to).toBe(EMAIL);
    expect(mail.text).toContain(`${SITE}/r#`);
    const newSecret = secretIn(mail);
    expect(newSecret).not.toBe(firstSecret);
    expect((await openLink(firstSecret)).status).toBe(404);
    expect((await openLink(newSecret)).status).toBe(200);
    expect(order(id).report_json).toBe(reportBefore);
    expect(order(id).state).toBe("delivered");
    // A new idempotency key per send, and a send record.
    expect(mail.idempotencyKey).toBe(`nuave-order-${id}-ready-2`);
    expect(
      d1.query("SELECT attempt, result FROM order_emails ORDER BY attempt"),
    ).toEqual([
      { attempt: 1, result: "accepted" },
      { attempt: 2, result: "accepted" },
    ]);
    // The secret is never printed, and neither is the address.
    const printed = output.join("\n");
    expect(printed).not.toContain(newSecret);
    expect(printed).not.toContain(EMAIL);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a send Resend does not accept still stops the old link, says so, and leaves a failed record", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const s = support({ sender: mailbox(() => false) });
    expect(await s.run("resend", id)).toBe(1);
    expect(output.join("\n")).toContain("did not accept");
    expect((await openLink(firstSecret)).status).toBe(404);
    expect(
      d1
        .query("SELECT attempt, result FROM order_emails ORDER BY attempt")
        .at(-1),
    ).toEqual({ attempt: 2, result: "failed" });
  });

  it("an unknown or badly formed order ID sends nothing and makes no sender", async () => {
    await deliveredOrder();
    const s = support();
    for (const bad of [
      "",
      "abc",
      "F".repeat(32),
      "g".repeat(32),
      `${"a".repeat(31)}'`,
      "a".repeat(33),
      "x' OR '1'='1",
    ]) {
      expect(await s.run("resend", bad), bad).toBe(2);
    }
    expect(await s.run("resend", "f".repeat(32))).toBe(1); // well formed, unknown
    expect(output.join("\n")).toContain("No order with that ID.");
    expect(s.sender.sent).toEqual([]);
    expect(s.makeSender).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses unknown commands, extra arguments and flags, and takes no address", async () => {
    const { id } = await deliveredOrder();
    const s = support();
    for (const args of [
      ["send", id],
      ["resend"],
      [],
      ["resend", id, "other@example.com"],
      ["resend", id, "--to=other@example.com"],
      ["off", id, "--email"],
    ]) {
      expect(await s.run(...args), args.join(" ")).toBe(2);
    }
    expect(output).toContain(SUPPORT_USAGE);
    expect(s.sender.sent).toEqual([]);
  });

  it("sends nothing for a synthetic order, an order with no saved report, or a link period that ended", async () => {
    const synthetic = await deliveredOrder("synthetic");
    const s = support();
    expect(await s.run("resend", synthetic.id)).toBe(1);
    expect(output.at(-1)).toContain("Synthetic orders never send real email");

    const open = await makeOrder(d1.db, { mode: "live", now: clock });
    expect(await s.run("resend", open)).toBe(1);
    expect(output.at(-1)).toContain("no saved report");

    const live = await deliveredOrder("live");
    await d1.db
      .prepare(
        `UPDATE orders SET link_expires_at = '2026-10-12T00:00:00.000Z' WHERE id = '${live.id}'`,
      )
      .bind()
      .run();
    expect(await s.run("resend", live.id)).toBe(1);
    expect(output.at(-1)).toContain("12-month");
    expect(s.sender.sent).toEqual([]);
  });

  it("an accepted resend on an order whose ready email never got through lets the runner finish delivery with no second email", async () => {
    const id = await makeOrder(d1.db, { email: EMAIL, now: clock });
    await approve(d1.db, id, { now: clock });
    const failing = mailbox(() => false);
    const deps: RunnerDeps = {
      db: d1.db,
      environment: "production",
      mode: "synthetic",
      siteOrigin: SITE,
      now: () => clock,
      execute: async (input) => executeSyntheticLocalObservation(input),
      generateReport: async (...args) => generateSyntheticLocalReport(...args),
      sender: failing.sender,
    };
    for (let i = 0; i < 12; i += 1) {
      await runOrders(deps);
      advance(60_000);
    }
    expect(order(id).state).toBe("reporting");
    await d1.db
      .prepare(`UPDATE orders SET mode = 'live' WHERE id = '${id}'`)
      .bind()
      .run();
    const s = support();
    expect(await s.run("resend", id)).toBe(0);
    const sentBefore = failing.sent.length;
    await d1.db
      .prepare(`UPDATE orders SET mode = 'synthetic' WHERE id = '${id}'`)
      .bind()
      .run();
    advance(2 * 3600_000);
    await runOrders(deps);
    expect(order(id).state).toBe("delivered");
    expect(failing.sent).toHaveLength(sentBefore); // no second email
    expect((await openLink(secretIn(s.sender.sent[0]!))).status).toBe(200);
  });
});

describe("off (AC-17)", () => {
  it("gives the neutral page and keeps the order state; a later resend switches it on with a new secret", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const s = support();
    expect(await s.run("off", id)).toBe(0);
    expect(order(id).state).toBe("delivered");
    expect(order(id).link_off).toBe(1);
    const off = await openLink(firstSecret);
    const random = await openLink("A".repeat(32));
    expect(off.status).toBe(404);
    expect(await off.text()).toBe(await random.text());
    expect(s.sender.sent).toEqual([]);
    // Off again is harmless.
    expect(await s.run("off", id)).toBe(0);
    // An explicit resend is the only way back on, and the old secret stays dead.
    expect(await s.run("resend", id)).toBe(0);
    expect((await openLink(firstSecret)).status).toBe(404);
    expect((await openLink(secretIn(s.sender.sent[0]!))).status).toBe(200);
  });
});

describe("show (AC-17, AC-09)", () => {
  it("hides the email unless asked, shows state, times, costs, saved answers and never a secret or hash", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const s = support();
    expect(await s.run("show", id)).toBe(0);
    let printed = output.join("\n");
    expect(printed).not.toContain(EMAIL);
    expect(printed).toContain("hidden (add --email to show)");
    expect(printed).toContain("State: delivered");
    expect(printed).toContain("Saved answers: 10 questions");
    expect(printed).toContain("NUAVE-DT-01 done");
    expect(printed).toContain("Answer: ");
    expect(printed).toContain("Emails sent: 1");
    expect(printed).toContain("ready #1 accepted");
    expect(printed).toMatch(/Link: active until /);
    expect(printed).not.toContain(firstSecret);
    expect(printed).not.toContain(String(order(id).link_hash));
    expect(printed).not.toContain("OVERRUN");

    output.length = 0;
    expect(await s.run("show", id, "--email")).toBe(0);
    printed = output.join("\n");
    expect(printed).toContain(`Email: ${EMAIL}`);
    expect(printed).not.toContain(firstSecret);
    expect(printed).not.toContain(String(order(id).link_hash));
    expect(s.makeSender).not.toHaveBeenCalled();
  });

  it("flags an order whose actual cost passed its hold, and shows the costs (AC-09)", async () => {
    const live = await makeOrder(d1.db, {
      mode: "live",
      limitUsd: 1,
      dailyLimitUsd: 5,
      now: clock,
    });
    await approve(d1.db, live, { mode: "live", now: clock });
    const big = await reserveOrderCall(d1.db, {
      orderId: live,
      provider: "openai",
      stage: "observation",
      usd: 0.9,
      now: () => clock,
    });
    await big.settle(1.3); // the provider charged more than the hold
    const s = support();
    await s.run("show", live);
    const printed = output.join("\n");
    expect(printed).toContain("OVERRUN: the cost passed the order's hold.");
    expect(printed).toContain("Cost: USD 1.3000 over 1 calls; hold USD 1.0000");
    expect(printed).toContain("Mode: live, production");
  });

  it("an order that never cost anything shows no hold", async () => {
    const { id } = await deliveredOrder("synthetic");
    const s = support();
    await s.run("show", id);
    expect(output.join("\n")).toContain("Cost: none held");
  });
});

describe("the database through wrangler", () => {
  it("writes only plain tokens into SQL text: an email can never reach it", () => {
    expect(sqlLiteral("abc123")).toBe("'abc123'");
    expect(sqlLiteral("2026-10-12T10:00:00.000Z")).toBe(
      "'2026-10-12T10:00:00.000Z'",
    );
    expect(sqlLiteral(null)).toBe("NULL");
    expect(sqlLiteral(7)).toBe("7");
    for (const bad of [
      EMAIL,
      "a'b",
      "x; DROP TABLE orders",
      "a\nb",
      'Kopi "Nuave"',
    ]) {
      expect(() => sqlLiteral(bad), bad).toThrow();
    }
  });

  it("the whole resend flow, sent through a statement runner, never has the email or the secret in SQL text", async () => {
    const { id } = await deliveredOrder();
    // A runner that records each statement and runs it on the test database.
    const execute = async (sql: string) => {
      sqlSeen.push(sql);
      const statement = d1.db.prepare(sql).bind();
      if (/^\s*select/i.test(sql)) {
        const { results } = await statement.all();
        return [{ results }];
      }
      return [{ meta: (await statement.run()).meta }];
    };
    const s = support({ db: d1ThroughWrangler(execute) });
    expect(await s.run("resend", id)).toBe(0);
    const newSecret = secretIn(s.sender.sent[0]!);
    expect(await s.run("show", id, "--email")).toBe(0);
    expect(sqlSeen.length).toBeGreaterThan(3);
    for (const sql of sqlSeen) {
      expect(sql).not.toContain(EMAIL);
      expect(sql).not.toContain(newSecret);
      expect(sql).not.toContain("@");
    }
    expect(sqlSeen.some((sql) => sql.includes(id))).toBe(true);
    // The command made a real change through that path.
    expect((await openLink(newSecret)).status).toBe(200);
    expect(output.join("\n")).toContain(`Email: ${EMAIL}`);
  });
});
