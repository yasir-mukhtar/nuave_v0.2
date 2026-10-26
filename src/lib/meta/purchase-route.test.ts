import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { POST as purchasePOST } from "../../app/api/meta/purchase/route";
import { PRIVACY_VERSION } from "../legal";
import { sha256Hex } from "../orders/link-secret";
import { makeOrder } from "../orders/orders.test-helper";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { META_GRAPH_VERSION } from "./conversions";

// Spec 021 at the route level: the real route, the real order store and a
// fake Meta address. No test calls Meta.

const PIXEL_ID = "890453577390181";
const TOKEN = "offline-test-meta-token-021";
const IP = "203.0.113.7";
const USER_AGENT = "TestBrowser/1.0 (Nuave AC-03)";
const FBP = "fb.1.1700000000000.123456789";
const FBC = "fb.1.1700000000000.AbCdEfGh";
const allow = { limit: async () => ({ success: true }) };
const deny = { limit: async () => ({ success: false }) };

type MetaCall = { url: string; form: URLSearchParams };
let dir: string;
let d1: ReturnType<typeof openFileD1>;
let calls: MetaCall[];
let metaAnswer: () => Promise<Response>;
let logs: string[];
let limiter: unknown;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-meta-"));
  d1 = openFileD1(join(dir, "meta.sqlite"));
  limiter = allow;
  mocks.getCloudflareContext.mockImplementation(() => ({
    env: { SPEND_DB: d1.db, ORDER_STATUS_CALLER_RATE_LIMITER: limiter },
  }));
  calls = [];
  metaAnswer = async () => new Response('{"events_received":1}');
  vi.stubGlobal("fetch", async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, form: new URLSearchParams(String(init?.body ?? "")) });
    if (!url.startsWith("https://graph.facebook.com/")) {
      throw new Error(`unexpected fetch ${url}`);
    }
    const signal = init?.signal;
    return await new Promise<Response>((resolve, reject) => {
      signal?.addEventListener("abort", () => reject(signal.reason));
      void metaAnswer().then(resolve, reject);
    });
  });
  logs = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
  }
  vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  vi.stubEnv("NUAVE_SITE_URL", "https://v2.nuave.test");
  vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", PIXEL_ID);
  vi.stubEnv("META_CAPI_ACCESS_TOKEN", TOKEN);
  vi.stubEnv("META_CAPI_TEST_EVENT_CODE", "");
  vi.stubEnv("MIDTRANS_SERVER_KEY", "offline-test-midtrans-key");
  vi.stubEnv("MIDTRANS_IS_PRODUCTION", "true");
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.getCloudflareContext.mockReset();
});

const ask = (
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) =>
  purchasePOST(
    new Request("https://v2.nuave.test/api/meta/purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": IP,
        "User-Agent": USER_AGENT,
        Cookie: `_fbp=${FBP}; other=1; _fbc=${FBC}`,
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
const askFor = (orderId: string, extra: Record<string, unknown> = {}) =>
  ask({ order_id: orderId, consent_version: PRIVACY_VERSION, ...extra });
const order = (id: string) =>
  d1.query<Record<string, unknown>>(
    "SELECT * FROM orders WHERE id = ?",
    id,
  )[0]!;
const paidOrder = (options: Parameters<typeof makeOrder>[1] = {}) =>
  makeOrder(d1.db, {
    mode: "live",
    payment: "paid",
    now: new Date(),
    ...options,
  });
const outcomes = () =>
  logs
    .filter((line) => line.includes('"meta_purchase"'))
    .map((line) => JSON.parse(line).outcome);
/** Every stored value in every table, as one text. */
function everythingStored(): string {
  const tables = d1.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  );
  return JSON.stringify(
    tables.map(({ name }) => d1.query(`SELECT * FROM "${name}"`)),
  );
}

describe("Spec 021: the server Purchase route", () => {
  it("sends one Purchase with exactly the R-03 fields, and answers 204 with no body (AC-03)", async () => {
    const id = await paidOrder();
    await d1.db
      .prepare("UPDATE orders SET email = ' Name@Example.COM ' WHERE id = ?1")
      .bind(id)
      .run();
    const before = Math.floor(Date.now() / 1000);
    const response = await askFor(id);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");

    expect(calls).toHaveLength(1);
    const { url, form } = calls[0]!;
    expect(url).toBe(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${PIXEL_ID}/events`,
    );
    // The token is a form field, never in the address (R-18).
    expect(url).not.toContain(TOKEN);
    expect(form.get("access_token")).toBe(TOKEN);
    expect(form.has("test_event_code")).toBe(false);
    expect([...form.keys()].sort()).toEqual(["access_token", "data"]);

    const data = JSON.parse(form.get("data")!);
    expect(data).toHaveLength(1);
    const event = data[0];
    expect(Object.keys(event).sort()).toEqual(
      [
        "action_source",
        "custom_data",
        "event_id",
        "event_name",
        "event_source_url",
        "event_time",
        "user_data",
      ].sort(),
    );
    expect(event).toMatchObject({
      event_name: "Purchase",
      event_id: order(id).meta_event_id,
      action_source: "website",
      event_source_url: "https://v2.nuave.test/audit",
      custom_data: { value: 249000, currency: "IDR" },
    });
    expect(event.event_time).toBeGreaterThanOrEqual(before);
    expect(event.user_data).toEqual({
      em: [await sha256Hex("name@example.com")],
      client_ip_address: IP,
      client_user_agent: USER_AGENT,
      fbp: FBP,
      fbc: FBC,
    });

    // Never who or what the order is.
    const sent = url + form.toString() + JSON.stringify(event);
    const row = order(id);
    for (const secret of [
      String(row.order_number),
      id,
      "name@example.com",
      "Name@Example.COM",
      String(row.business_name),
      String(row.website),
    ]) {
      expect(sent).not.toContain(secret);
    }
    expect(row).toMatchObject({
      meta_consent_version: PRIVACY_VERSION,
      meta_outcome: "sent",
    });
    expect(row.meta_sent_at).toBeTruthy();
    expect(outcomes()).toEqual(["sent"]);
  });

  it("leaves out a Meta cookie the browser does not have", async () => {
    const id = await paidOrder();
    await askFor(id, {});
    await d1.db
      .prepare("UPDATE orders SET meta_sent_at = NULL WHERE id = ?1")
      .bind(id)
      .run();
    await ask(
      { order_id: id, consent_version: PRIVACY_VERSION },
      { Cookie: "other=1" },
    );
    const userData = JSON.parse(calls[1]!.form.get("data")!)[0].user_data;
    expect(userData).not.toHaveProperty("fbp");
    expect(userData).not.toHaveProperty("fbc");
  });

  it("stores and logs no IP address, browser type, cookie code, email hash or token (AC-04)", async () => {
    const id = await paidOrder({ email: "owner@example.com" });
    await askFor(id);
    expect(calls).toHaveLength(1);
    const hash = await sha256Hex("owner@example.com");
    const stored = everythingStored();
    const logged = logs.join("\n");
    for (const secret of [IP, USER_AGENT, FBP, FBC, hash, TOKEN]) {
      expect(stored).not.toContain(secret);
      expect(logged).not.toContain(secret);
    }
    expect(logged).not.toContain("owner@example.com");
    // One line per call, with the outcome code only (R-14).
    expect(logs).toEqual([
      JSON.stringify({ event: "meta_purchase", outcome: "sent" }),
    ]);
  });

  it("sends nothing without the token or the Pixel ID, as in a preview (AC-01)", async () => {
    const id = await paidOrder();
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "");
    expect((await askFor(id)).status).toBe(204);
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", TOKEN);
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "");
    expect((await askFor(id)).status).toBe(204);
    expect(calls).toHaveLength(0);
    expect(outcomes()).toEqual(["off", "off"]);
    expect(order(id).meta_sent_at).toBeNull();
  });

  it("sends nothing without consent under the current privacy version (AC-02, R-05)", async () => {
    const id = await paidOrder();
    for (const consent of [undefined, "1.3", "yes", 1.4]) {
      const response = await ask({ order_id: id, consent_version: consent });
      expect(response.status).toBe(204);
    }
    expect(calls).toHaveLength(0);
    expect(outcomes()).toEqual(Array(4).fill("no_consent"));
  });

  it("sends nothing for a test pass, unpaid, legacy, another environment's order, an order with no code, or a bad id (AC-02, R-06)", async () => {
    const ids = [
      await makeOrder(d1.db, {
        mode: "live",
        payment: "test",
        now: new Date(),
      }),
      await makeOrder(d1.db, {
        mode: "live",
        payment: "unpaid",
        now: new Date(),
      }),
      await makeOrder(d1.db, {
        mode: "live",
        payment: "legacy",
        now: new Date(),
      }),
      await paidOrder({ environment: "preview" }),
    ];
    const noCode = await paidOrder();
    await d1.db
      .prepare("UPDATE orders SET meta_event_id = NULL WHERE id = ?1")
      .bind(noCode)
      .run();
    for (const id of [...ids, noCode, "not-an-order", "f".repeat(32)]) {
      expect((await askFor(id)).status).toBe(204);
    }
    expect(calls).toHaveLength(0);
    expect(outcomes()).toEqual(Array(7).fill("skipped"));
  });

  it("sends nothing in synthetic mode, also for a simulated payment (AC-02)", async () => {
    vi.stubEnv("NUAVE_ENVIRONMENT", "preview");
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    const id = await makeOrder(d1.db, {
      mode: "synthetic",
      environment: "preview",
      payment: "simulated",
      now: new Date(),
    });
    expect(order(id).meta_event_id).toBeTruthy();
    await askFor(id);
    expect(calls).toHaveLength(0);
    expect(outcomes()).toEqual(["skipped"]);
  });

  it("in the Midtrans sandbox sends only with a Test Events code, and then always with it (AC-02, AC-03, R-06, R-17)", async () => {
    vi.stubEnv("MIDTRANS_IS_PRODUCTION", "false");
    const id = await paidOrder();
    await askFor(id);
    expect(calls).toHaveLength(0);
    expect(order(id).meta_sent_at).toBeNull();

    vi.stubEnv("META_CAPI_TEST_EVENT_CODE", "TEST12345");
    await askFor(id);
    expect(calls).toHaveLength(1);
    const form = calls[0]!.form;
    expect(form.getAll("test_event_code")).toEqual(["TEST12345"]);
    expect(form.get("data")).not.toContain("TEST12345");
    expect(outcomes()).toEqual(["sandbox", "sent"]);
  });

  it("sends once per order: a reload, a second tab or two calls at once send nothing more (AC-05, R-10)", async () => {
    const id = await paidOrder();
    const answers = await Promise.all([askFor(id), askFor(id), askFor(id)]);
    expect(answers.map((answer) => answer.status)).toEqual([204, 204, 204]);
    await askFor(id);
    expect(calls).toHaveLength(1);
    expect(outcomes().sort()).toEqual(
      ["already_sent", "already_sent", "already_sent", "sent"].sort(),
    );
  });

  it("a Meta error is recorded once and never retried, even on a later visit (AC-06, R-12, Q-5)", async () => {
    metaAnswer = async () => new Response("{}", { status: 500 });
    const id = await paidOrder();
    expect((await askFor(id)).status).toBe(204);
    expect((await askFor(id)).status).toBe(204);
    expect(calls).toHaveLength(1);
    expect(order(id).meta_outcome).toBe("meta_500");
    expect(outcomes()).toEqual(["meta_500", "already_sent"]);
  });

  it("gives a slow Meta 3 seconds, then records a timeout and answers (AC-06)", async () => {
    metaAnswer = () => new Promise<Response>(() => undefined);
    const id = await paidOrder();
    const started = Date.now();
    const response = await askFor(id);
    const took = Date.now() - started;
    expect(response.status).toBe(204);
    expect(took).toBeGreaterThanOrEqual(2900);
    expect(took).toBeLessThan(3500);
    expect(order(id).meta_outcome).toBe("timeout");
  }, 10_000);

  it("a network failure is 'error', and the answer is still 204", async () => {
    metaAnswer = async () => {
      throw new TypeError("fetch failed");
    };
    const id = await paidOrder();
    expect((await askFor(id)).status).toBe(204);
    expect(order(id).meta_outcome).toBe("error");
  });

  it("uses the shared per-IP limit: when it trips, its own 429 answer and no send (R-15)", async () => {
    limiter = deny;
    const id = await paidOrder();
    const response = await askFor(id);
    expect(response.status).toBe(429);
    expect(calls).toHaveLength(0);
    // R-14: still exactly one line, with the outcome code only.
    expect(outcomes()).toEqual(["rate_limited"]);
    expect(order(id).meta_sent_at).toBeNull();
  });

  it("sends nothing without the visitor's IP address or browser type", async () => {
    const id = await paidOrder();
    await askFor(id, {});
    await d1.db
      .prepare("UPDATE orders SET meta_sent_at = NULL WHERE id = ?1")
      .bind(id)
      .run();
    calls = [];
    logs.length = 0;
    await ask(
      { order_id: id, consent_version: PRIVACY_VERSION },
      { "User-Agent": "" },
    );
    expect(calls).toHaveLength(0);
    expect(outcomes()).toEqual(["skipped"]);
  });
});
