import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { POST as reportPOST } from "../../app/api/report/route";
import { POST as statusPOST } from "../../app/api/orders/status/route";
import {
  executeSyntheticLocalObservation,
  generateSyntheticLocalReport,
} from "../audit/local-direct-ten-audit";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { newLinkSecret } from "./config";
import { EMAIL_RETRY_MAX_MS } from "./store";
import { runOrders, type RunnerDeps } from "./runner";
import {
  approve,
  makeOrder,
  mailbox,
  secretIn,
  T0,
} from "./orders.test-helper";

// Spec 016 R-24..R-28, AC-14, AC-15, AC-16, AC-18: the real report-data route,
// the real runner and ledger on the sqlite D1 helper, a fake paid provider and a
// fake mailbox. No network.

const EMAIL = "owner@example.com";
let dir: string;
let d1: ReturnType<typeof openFileD1>;
let clock: Date;
let fetchSpy: ReturnType<typeof vi.fn>;
let logs: string[];
let providerInputs: string[];
let limiterCalls: number;
let limiterAllows: () => boolean;

function bind() {
  mocks.getCloudflareContext.mockReturnValue({
    env: {
      SPEND_DB: d1.db,
      REPORT_DATA_CALLER_RATE_LIMITER: {
        limit: async () => {
          limiterCalls += 1;
          return { success: limiterAllows() };
        },
      },
      ORDER_STATUS_CALLER_RATE_LIMITER: {
        limit: async () => ({ success: true }),
      },
    },
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-link-"));
  d1 = openFileD1(join(dir, "link.sqlite"));
  clock = T0;
  limiterCalls = 0;
  limiterAllows = () => true;
  providerInputs = [];
  logs = [];
  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, method).mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
  }
  fetchSpy = vi.fn(async () => new Response("{}", { status: 500 }));
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
  vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
  bind();
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mocks.getCloudflareContext.mockReset();
});

function deps(overrides: Partial<RunnerDeps> = {}) {
  const mail = mailbox();
  const reports = { n: 0 };
  const value: RunnerDeps = {
    db: d1.db,
    environment: "production",
    mode: "synthetic",
    siteOrigin: "https://v2.nuave.test",
    now: () => clock,
    execute: async (input) => {
      providerInputs.push(JSON.stringify(input));
      return executeSyntheticLocalObservation(input);
    },
    generateReport: async (...args) => {
      providerInputs.push(JSON.stringify(args));
      reports.n += 1;
      return generateSyntheticLocalReport(...args);
    },
    sender: mail.sender,
    sleep: async () => {},
    ...overrides,
  };
  return { ...value, mail, reports };
}

async function deliveredOrder(d = deps()) {
  const id = await makeOrder(d1.db, { email: EMAIL, now: clock });
  await approve(d1.db, id, { now: clock });
  for (let i = 0; i < 12; i += 1) {
    await runOrders(d);
    clock = new Date(clock.getTime() + 60_000);
  }
  return id;
}

const row = (id: string) =>
  d1.query<Record<string, unknown>>(
    `SELECT * FROM orders WHERE id = '${id}'`,
  )[0]!;

const openLink = (secret: unknown, headers: Record<string, string> = {}) =>
  reportPOST(
    new Request("https://nuave.test/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ secret }),
    }),
  );

/** Status, headers and body: what a caller can tell apart (R-27). */
async function seen(response: Response) {
  return {
    status: response.status,
    headers: [...response.headers.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    body: await response.text(),
  };
}

describe("a completed audit and its private link (AC-14)", () => {
  it("sends one ready email; its link opens the saved report with no login and no provider call", async () => {
    const d = deps();
    const id = await deliveredOrder(d);
    expect(row(id).state).toBe("delivered");
    const ready = d.mail.sent.filter((m) => m.subject.includes("siap"));
    expect(ready).toHaveLength(1);
    expect(ready[0]!.to).toBe(EMAIL);
    const secret = secretIn(ready[0]!);
    expect(ready[0]!.text).toContain(`https://v2.nuave.test/r#${secret}`);
    expect(secret).toMatch(/^[A-Za-z0-9_-]{32}$/); // 24 random bytes = 192 bits
    // Only the hash is stored.
    expect(row(id).link_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row(id))).not.toContain(secret);

    const providerBefore = providerInputs.length;
    // A fresh caller: no cookie, no header, only the secret in the body.
    const response = await openLink(secret);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const saved = (await response.json()) as {
      report: { report_version: string };
      context: { identity: { name: string } };
      observations: unknown[];
      prompts: unknown[];
      originals: string[];
      synthetic: boolean;
    };
    expect(saved.report.report_version).toBe("nuave-report-v3");
    expect(saved.context.identity.name).toBe("Kopi Nuave");
    expect(saved.observations).toHaveLength(10);
    expect(saved.prompts).toHaveLength(10);
    expect(saved.originals).toHaveLength(10);
    expect(saved.synthetic).toBe(true);
    // The same saved report, never rewritten.
    expect(JSON.stringify(saved.report)).toBe(
      JSON.stringify(JSON.parse(String(row(id).report_json))),
    );
    // No provider call, no Resend call, no new email, from the page opening.
    expect(providerInputs).toHaveLength(providerBefore);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(d.mail.sent).toHaveLength(1);
  });

  it("the page's answer never carries the email or the hash; the status answer never carries the report, the email or the secret", async () => {
    const d = deps();
    const id = await deliveredOrder(d);
    const secret = secretIn(d.mail.sent[0]!);
    const text = await (await openLink(secret)).text();
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain(String(row(id).link_hash));
    const status = await statusPOST(
      new Request("https://nuave.test/api/orders/status", {
        method: "POST",
        body: JSON.stringify({ order_id: id }),
      }),
    );
    const statusText = await status.text();
    expect(JSON.parse(statusText).state).toBe("delivered");
    expect(statusText).not.toContain(EMAIL);
    expect(statusText).not.toContain(secret);
    expect(statusText).not.toContain("/r#");
    expect(statusText).not.toContain("report");
  });

  it("the order is delivered only after the send is accepted", async () => {
    let accept = false;
    const d = deps({ sender: mailbox(() => accept).sender });
    const id = await deliveredOrder(d);
    expect(row(id).state).toBe("reporting");
    accept = true;
    clock = new Date(clock.getTime() + EMAIL_RETRY_MAX_MS + 1000);
    await runOrders(d);
    expect(row(id).state).toBe("delivered");
  });
});

describe("a link that does not work gives one neutral answer (AC-15)", () => {
  it("a random, malformed, expired or switched-off secret: identical status, headers and body, with no business data and no provider call", async () => {
    const d = deps();
    const id = await deliveredOrder(d);
    const good = secretIn(d.mail.sent[0]!);
    const providerBefore = providerInputs.length;

    const random = await seen(await openLink(newLinkSecret()));
    const malformed = [
      await seen(await openLink("short")),
      await seen(await openLink(12345)),
      await seen(await openLink(undefined)),
      await seen(await openLink(`${good}x`)),
      await seen(
        await reportPOST(
          new Request("https://nuave.test/api/report", {
            method: "POST",
            body: "not json",
          }),
        ),
      ),
    ];
    await d1.db
      .prepare(
        `UPDATE orders SET link_expires_at = '2026-10-12T00:00:00.000Z' WHERE id = '${id}'`,
      )
      .bind()
      .run();
    const expired = await seen(await openLink(good));
    await d1.db
      .prepare(
        `UPDATE orders SET link_expires_at = '2099-01-01T00:00:00.000Z', link_off = 1 WHERE id = '${id}'`,
      )
      .bind()
      .run();
    const off = await seen(await openLink(good));

    expect(random.status).toBe(404);
    for (const other of [...malformed, expired, off]) {
      expect(other).toEqual(random);
    }
    expect(random.body).toContain("Laporan ini tidak tersedia.");
    expect(random.body).not.toContain("Kopi Nuave");
    const headers = new Map(random.headers);
    expect(headers.get("cache-control")).toBe("no-store");
    expect(headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
    expect(providerInputs).toHaveLength(providerBefore);
    expect(fetchSpy).not.toHaveBeenCalled();
    // The state never changed: only the link did.
    expect(row(id).state).toBe("delivered");
  });

  it("the report-data route is rate-limited per caller, and the limited answer is private too", async () => {
    const d = deps();
    await deliveredOrder(d);
    const good = secretIn(d.mail.sent[0]!);
    limiterAllows = () => false;
    const limited = await openLink(good);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("cache-control")).toBe("no-store");
    expect(limited.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(limited.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await limited.text()).not.toContain("Kopi Nuave");
    expect(limiterCalls).toBe(1);
    // A wrong secret is limited the same way: the limiter comes first.
    expect((await openLink(newLinkSecret())).status).toBe(429);
    limiterAllows = () => true;
    expect((await openLink(good)).status).toBe(200);
  });

  it("a missing limiter binding in production fails closed (503), never open", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.getCloudflareContext.mockReturnValue({ env: { SPEND_DB: d1.db } });
    expect((await openLink(newLinkSecret())).status).toBe(503);
  });

  it("an order of another environment is never opened", async () => {
    const d = deps();
    await deliveredOrder(d);
    const good = secretIn(d.mail.sent[0]!);
    vi.stubEnv("NUAVE_ENVIRONMENT", "preview");
    expect((await openLink(good)).status).toBe(404);
  });
});

describe("a new link replaces the old one (AC-16)", () => {
  it("retries inside one attempt reuse key, secret and body; a later attempt has a new key and a new secret, and only the newest link works", async () => {
    let accept = false;
    const mail = mailbox(() => accept);
    const d = deps({ sender: mail.sender });
    const id = await deliveredOrder(d);
    const reportsBefore = d.reports.n;
    const first = mail.sent.filter((m) => m.subject.includes("siap"));
    expect(first).toHaveLength(3); // three tries inside attempt 1
    expect(new Set(first.map((m) => m.idempotencyKey)).size).toBe(1);
    const secret1 = secretIn(first[0]!);
    expect(new Set(first.map(secretIn))).toEqual(new Set([secret1]));
    // The first attempt was not accepted, so the order is not delivered; the
    // link it carried is the stored one for now.
    expect(row(id).state).toBe("reporting");
    expect((await openLink(secret1)).status).toBe(200);

    accept = true;
    clock = new Date(clock.getTime() + EMAIL_RETRY_MAX_MS + 1000);
    await runOrders(d);
    const all = mail.sent.filter((m) => m.subject.includes("siap"));
    expect(all).toHaveLength(4);
    const second = all[3]!;
    expect(second.idempotencyKey).not.toBe(first[0]!.idempotencyKey);
    const secret2 = secretIn(second);
    expect(secret2).not.toBe(secret1);
    // Only the newest link works.
    expect((await openLink(secret1)).status).toBe(404);
    expect((await openLink(secret2)).status).toBe(200);
    // Each attempt left a send record, and the audit and report did not rerun.
    expect(
      d1.query("SELECT attempt, result FROM order_emails ORDER BY attempt"),
    ).toEqual([
      { attempt: 1, result: "failed" },
      { attempt: 2, result: "accepted" },
    ]);
    expect(d.reports.n).toBe(reportsBefore);
    expect(fetchSpy).not.toHaveBeenCalled(); // synthetic mode never calls Resend
    expect(row(id).state).toBe("delivered");
  });
});

describe("no email or secret reaches a provider, a log line or analytics (AC-18)", () => {
  it("the paid provider's inputs and every console line leave out the email and the link secret", async () => {
    const d = deps();
    const id = await deliveredOrder(d);
    const secret = secretIn(d.mail.sent[0]!);
    await openLink(secret);
    await openLink(newLinkSecret());
    expect(providerInputs.length).toBeGreaterThanOrEqual(11);
    for (const body of providerInputs) {
      expect(body).not.toContain(EMAIL);
      expect(body).not.toContain(secret);
      expect(body).not.toContain(id); // the safety id is hashed (R-04)
    }
    for (const line of logs) {
      expect(line).not.toContain(EMAIL);
      expect(line).not.toContain(secret);
    }
    // No analytics call: nothing used `fetch`.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
