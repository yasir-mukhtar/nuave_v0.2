import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

vi.mock("@/lib/audit/source-excerpt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/audit/source-excerpt")>()),
  fetchWebsiteExcerpt: async () => null,
}));

import { hashSafetyIdentifier } from "../audit/openai";
import { orderSafetyIdentifier } from "./config";
import { POST as createPOST } from "../../app/api/orders/route";
import { POST as statusPOST } from "../../app/api/orders/status/route";
import { POST as approvePOST } from "../../app/api/orders/approve/route";
import { POST as runPOST } from "../../app/api/audit/run/route";
import { POST as reportPOST } from "../../app/api/audit/report/route";
import { POST as extractPOST } from "../../app/api/audit/extract/route";
import { POST as glmPOST } from "../../app/api/audit/glm-questions/route";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "../audit/client-contract";
import {
  smartFingerprint,
  SMART_INTAKE_INPUT_VERSION,
} from "../intake/smart-intake-contract";
import { usdToUnits } from "../spending/spend-ledger";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import {
  CONTEXT,
  ORIGINALS,
  WIRE_PROMPTS,
  makeOrder,
} from "./orders.test-helper";

// Spec 016 AC-01..AC-05 at the route level: the real routes and the real
// ledger on the sqlite D1 helper. The paid provider is a fetch spy that fails
// the test if it is reached when it must not be.

const UNAVAILABLE = "Audit tidak tersedia saat ini.";
const allow = { limit: async () => ({ success: true }) };

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let fetchSpy: ReturnType<typeof vi.fn>;
let limiters: Record<string, unknown>;

function bind(overrides: Record<string, unknown> = {}) {
  mocks.getCloudflareContext.mockReturnValue({
    env: { SPEND_DB: d1.db, ...limiters, ...overrides },
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-orders-"));
  d1 = openFileD1(join(dir, "orders.sqlite"));
  limiters = {
    ORDER_CREATE_CALLER_RATE_LIMITER: allow,
    ORDER_STATUS_CALLER_RATE_LIMITER: allow,
    EXTRACT_CALLER_RATE_LIMITER: allow,
    GLM_CALLER_RATE_LIMITER: allow,
    IDENTITY_DESTINATION_RATE_LIMITER: allow,
  };
  bind();
  fetchSpy = vi.fn(async () => new Response("{}", { status: 500 }));
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
  vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  vi.stubEnv("NUAVE_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
  vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
  vi.stubEnv("OPENAI_AUDIT_CARRYOVER_COST_USD", "0");
  vi.stubEnv("NUAVE_GLM_EVIDENCE_DIR", "");
  vi.stubEnv(
    "NUAVE_ORDER_EMAIL_ALLOWLIST",
    "Owner@Example.com, other@example.com",
  );
  vi.stubEnv("RESEND_API_KEY", "offline-test-resend-key");
  vi.stubEnv("NUAVE_MAIL_FROM", "Nuave <laporan@nuave.test>");
  vi.stubEnv("NUAVE_ORDER_SPEND_LIMIT_USD", "");
  vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "");
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mocks.getCloudflareContext.mockReset();
});

const post = (
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Request(`https://nuave.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const create = (body: Record<string, unknown> = {}, headers = {}) =>
  createPOST(
    post(
      "/api/orders",
      {
        email: "owner@example.com",
        business_name: "Kopi Nuave",
        website: "https://kopinuave.example/",
        ...body,
      },
      headers,
    ),
  );
const orders = () => d1.query<Record<string, unknown>>("SELECT * FROM orders");
const ledger = () =>
  d1.query<Record<string, unknown>>("SELECT * FROM provider_spend");

describe("making an order (R-01, R-02, R-06, AC-01)", () => {
  it("makes one open order for a listed email: server-made id, server-set mode and environment, a hold row", async () => {
    const response = await create();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.order_id).toMatch(/^[0-9a-f]{32}$/); // 128 bits
    expect(body.state).toBe("open");
    expect(JSON.stringify(body)).not.toContain("example.com");
    const [row] = orders();
    expect(row).toMatchObject({
      id: body.order_id,
      email: "owner@example.com",
      business_name: "Kopi Nuave",
      website: "https://kopinuave.example/",
      mode: "live",
      environment: "production",
      state: "open",
    });
    expect(ledger()).toHaveLength(1);
    expect(ledger()[0]).toMatchObject({
      kind: "order_hold",
      order_id: body.order_id,
    });
    expect(fetchSpy).not.toHaveBeenCalled(); // no paid call by making an order
  });

  it("matches the email list without case, after trimming", async () => {
    expect((await create({ email: "  OWNER@example.COM " })).status).toBe(200);
  });

  it.each([
    ["missing", {}],
    ["empty", { email: "" }],
    ["not an email", { email: "owner" }],
    ["two emails", { email: "a@example.com,b@example.com" }],
    ["a script", { email: "<script>@example.com" }],
  ])("a %s email makes no order", async (_name, body) => {
    const response = await create({ email: undefined, ...body });
    expect(response.status).toBe(400);
    expect(orders()).toEqual([]);
    expect(ledger()).toEqual([]);
  });

  it("an email not on the list makes no order and shows the unavailable copy", async () => {
    const response = await create({ email: "stranger@example.com" });
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).toContain(UNAVAILABLE);
    expect(orders()).toEqual([]);
    expect(ledger()).toEqual([]);
  });

  it("an empty or missing list allows no live order, and looks the same as a full cap", async () => {
    vi.stubEnv("NUAVE_ORDER_EMAIL_ALLOWLIST", "");
    const empty = await create();
    expect(empty.status).toBe(503);
    vi.unstubAllEnvs();
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("NUAVE_ENVIRONMENT", "production");
    vi.stubEnv("NUAVE_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
    const missing = await create();
    expect(missing.status).toBe(503);
    expect(await missing.json()).toEqual(await empty.json());
    expect(orders()).toEqual([]);
  });

  it("without a Resend key or from address, a live order is refused with the usual answer, even for a listed email", async () => {
    for (const name of ["RESEND_API_KEY", "NUAVE_MAIL_FROM"]) {
      vi.stubEnv(name, "");
      const response = await create();
      expect(response.status, name).toBe(503);
      expect(JSON.stringify(await response.json())).toContain(UNAVAILABLE);
      expect(orders()).toEqual([]);
      expect(ledger()).toEqual([]);
      vi.stubEnv("RESEND_API_KEY", "offline-test-resend-key");
      vi.stubEnv("NUAVE_MAIL_FROM", "Nuave <laporan@nuave.test>");
    }
    vi.stubEnv("RESEND_API_KEY", "");
    const response = await create();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).toContain(UNAVAILABLE);
    expect(orders()).toEqual([]);
    expect(ledger()).toEqual([]);
    // Synthetic orders are not affected.
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    expect((await create()).status).toBe(200);
  });

  it("on production, a missing or mistyped mode makes no order; only live or synthetic does", async () => {
    for (const value of ["", "Live", "synthetik", "true", " "]) {
      vi.stubEnv("NUAVE_AUDIT_MODE", value);
      const response = await create();
      expect(response.status, `mode "${value}"`).toBe(503);
      expect(JSON.stringify(await response.json())).toContain(UNAVAILABLE);
    }
    expect(orders()).toEqual([]);
    vi.stubEnv("NUAVE_AUDIT_MODE", " synthetic ");
    expect((await create()).status).toBe(200);
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    expect((await create({ email: "other@example.com" })).status).toBe(200);
  });

  it("synthetic mode has no list, writes no ledger row and never needs credentials", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    vi.stubEnv("NUAVE_ORDER_EMAIL_ALLOWLIST", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await create({ email: "anyone@example.com" });
    expect(response.status).toBe(200);
    expect(orders()[0]).toMatchObject({ mode: "synthetic" });
    expect(ledger()).toEqual([]);
  });

  it("ignores a mode, environment, state, cost or time sent by the browser", async () => {
    const response = await create({
      mode: "synthetic",
      environment: "preview",
      state: "running",
      cost: 0,
      created_at: "2000-01-01T00:00:00Z",
      expires_at: "2999-01-01T00:00:00Z",
    });
    expect(response.status).toBe(200);
    const [row] = orders();
    expect(row).toMatchObject({
      mode: "live",
      environment: "production",
      state: "open",
    });
    expect(String(row.created_at).startsWith("2000")).toBe(false);
    expect(String(row.expires_at).startsWith("2999")).toBe(false);
  });

  it("rejects an invalid website or a missing business name", async () => {
    expect((await create({ website: "not a url" })).status).toBe(400);
    expect((await create({ business_name: "  " })).status).toBe(400);
    expect(orders()).toEqual([]);
  });

  it("answers 404 when the audit switch is off, before reading anything", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "false");
    expect((await create()).status).toBe(404);
    expect(orders()).toEqual([]);
  });

  it("makes no order when the environment or the database is not set up", async () => {
    vi.stubEnv("NUAVE_ENVIRONMENT", "");
    expect((await create()).status).toBe(503);
    vi.stubEnv("NUAVE_ENVIRONMENT", "production");
    bind({ SPEND_DB: undefined });
    expect((await create()).status).toBe(503);
    expect(orders()).toEqual([]);
  });
});

describe("rate limit and no stored IP (R-05, AC-03)", () => {
  it("refuses order creation past the per-IP limit", async () => {
    const seen: string[] = [];
    let n = 0;
    bind({
      ORDER_CREATE_CALLER_RATE_LIMITER: {
        limit: async ({ key }: { key: string }) => {
          seen.push(key);
          n += 1;
          return { success: n <= 2 };
        },
      },
    });
    expect(
      (await create({}, { "CF-Connecting-IP": "203.0.113.9" })).status,
    ).toBe(200);
    expect(
      (await create({}, { "CF-Connecting-IP": "203.0.113.9" })).status,
    ).toBe(200);
    const limited = await create({}, { "CF-Connecting-IP": "203.0.113.9" });
    expect(limited.status).toBe(429);
    expect(orders()).toHaveLength(2);
    expect(seen).toEqual(["203.0.113.9", "203.0.113.9", "203.0.113.9"]);
  });

  it("stores no IP address anywhere in D1", async () => {
    await create(
      {},
      { "CF-Connecting-IP": "203.0.113.77", "X-Forwarded-For": "198.51.100.5" },
    );
    const dump = JSON.stringify([
      orders(),
      ledger(),
      d1.query("SELECT * FROM order_questions"),
      d1.query("SELECT * FROM order_emails"),
    ]);
    expect(dump).not.toContain("203.0.113.77");
    expect(dump).not.toContain("198.51.100.5");
  });

  it("fails closed with 503 in production when the limiter binding is missing", async () => {
    bind({ ORDER_CREATE_CALLER_RATE_LIMITER: undefined });
    expect((await create()).status).toBe(503);
    expect(orders()).toEqual([]);
  });
});

describe("the per-order limit setting (R-07, AC-04) and the daily cap (R-08, AC-05)", () => {
  it.each(["lots", "-1", "NaN", "0", "5.01"])(
    "an invalid limit %s makes no order and no hold",
    async (value) => {
      vi.stubEnv("NUAVE_ORDER_SPEND_LIMIT_USD", value);
      const response = await create();
      expect(response.status).toBe(503);
      expect(JSON.stringify(await response.json())).toContain(UNAVAILABLE);
      expect(orders()).toEqual([]);
      expect(ledger()).toEqual([]);
    },
  );

  it("a limit above the daily cap fails closed, whatever the cap is", async () => {
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "1.5");
    expect((await create()).status).toBe(503); // default limit 2.00 > 1.50
    vi.stubEnv("NUAVE_ORDER_SPEND_LIMIT_USD", "1.5");
    expect((await create()).status).toBe(200);
  });

  it("defaults to USD 2.00 and holds exactly the configured limit", async () => {
    await create();
    vi.stubEnv("NUAVE_ORDER_SPEND_LIMIT_USD", "1.25");
    await create();
    expect(ledger().map((row) => row.held_units)).toEqual([
      usdToUnits(2),
      usdToUnits(1.25),
    ]);
  });

  it("with less room in the daily cap than one limit, refuses and leaves the database unchanged", async () => {
    expect((await create()).status).toBe(200);
    expect((await create()).status).toBe(200);
    const before = JSON.stringify([orders(), ledger()]);
    const response = await create(); // 2 + 2 + 2 > 5
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).toContain(UNAVAILABLE);
    expect(JSON.stringify([orders(), ledger()])).toBe(before);
  });
});

describe("paid routes need an order (R-03, R-04, AC-02)", () => {
  const extract = (body: unknown) =>
    extractPOST(post("/api/audit/extract", body));
  const glm = (body: Record<string, unknown>) => {
    const base = {
      version: SMART_INTAKE_INPUT_VERSION,
      factVersion: 1,
      context: CONTEXT,
    };
    return glmPOST(
      post("/api/audit/glm-questions", {
        method: "direct-ten",
        intake: { ...base, fingerprint: smartFingerprint(base) },
        ...body,
      }),
    );
  };
  async function openOrder() {
    return makeOrder(d1.db, { mode: "live", now: new Date() });
  }

  it("refuses with no order, an unknown order, a malformed id or a wrong state, with no provider call", async () => {
    const running = await openOrder();
    d1.query(
      `UPDATE orders SET state = 'running' WHERE id = '${running}' RETURNING 1`,
    );
    for (const order_id of [undefined, "f".repeat(32), "nope", running]) {
      const e = await extract({ order_id });
      expect(e.status).toBe(409);
      expect((await e.json()).code).toBe("ORDER_REQUIRED");
      const g = await glm({ order_id });
      expect(g.status).toBe(409);
      expect((await g.json()).code).toBe("ORDER_REQUIRED");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(
      d1.query("SELECT * FROM provider_spend WHERE kind = 'order_call'"),
    ).toEqual([]);
  });

  it("refuses an order of another environment or mode", async () => {
    const preview = await makeOrder(d1.db, {
      mode: "live",
      environment: "preview",
      now: new Date(),
    });
    const synthetic = await makeOrder(d1.db, {
      mode: "synthetic",
      now: new Date(),
    });
    expect((await extract({ order_id: preview })).status).toBe(409);
    expect((await extract({ order_id: synthetic })).status).toBe(409);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses an open order past its time", async () => {
    const id = await makeOrder(d1.db, {
      mode: "live",
      now: new Date(Date.now() - 3 * 3600_000),
    });
    expect((await extract({ order_id: id })).status).toBe(409);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reads the website saved on the order and ignores browser-sent website, budget, observations, costs and identity", async () => {
    const id = await openOrder();
    const response = await extract({
      order_id: id,
      website_url: "https://attacker.example/",
      brand_name: "Someone Else",
      safety_identifier: "owner@example.com",
      budget: { limit_usd: 5, carryover_cost_usd: 4.99, calls: [] },
      observations: [{ prompt_id: "x" }],
      resume_observations: [{ prompt_id: "x" }],
      cost: 0,
    });
    // The fake provider failed (HTTP 500): the call was made once, for the order.
    expect(response.status).toBeGreaterThanOrEqual(400);
    const requests = fetchSpy.mock.calls.map(([url, init]) => ({
      url: String(url),
      body: String((init as RequestInit | undefined)?.body ?? ""),
    }));
    const provider = requests.filter((r) => r.url.includes("/responses"));
    expect(
      provider.length,
      `status ${response.status}, urls ${requests.map((r) => r.url).join(" ")}`,
    ).toBeGreaterThanOrEqual(1);
    for (const { body } of provider) {
      expect(body).not.toContain("attacker.example");
      expect(body).not.toContain("Someone Else");
      expect(body).not.toContain("owner@example.com");
      expect(body).toContain("kopinuave.example"); // the order's own website
      // R-04: the safety identifier comes from the order id, never the email.
      const sent = JSON.parse(body).safety_identifier as string;
      expect(sent).toBe(hashSafetyIdentifier(await orderSafetyIdentifier(id)));
      expect(sent).not.toBe(hashSafetyIdentifier(`nuave-order-${id}`));
      expect(body).not.toContain(id);
    }
    const calls = d1.query(
      "SELECT order_id, stage FROM provider_spend WHERE kind = 'order_call'",
    );
    expect(calls).toEqual([{ order_id: id, stage: "extract" }]);
  });

  it("question writing for an open order runs inside the order's own limit", async () => {
    const id = await openOrder();
    const response = await glm({ order_id: id });
    expect(response.status).not.toBe(409);
    const rows = d1.query<{ order_id: string; stage: string }>(
      "SELECT order_id, stage FROM provider_spend WHERE kind = 'order_call'",
    );
    for (const row of rows)
      expect(row).toEqual({ order_id: id, stage: "questions" });
  });

  it("/api/audit/run and /api/audit/report refuse every request", async () => {
    const id = await openOrder();
    for (const route of [runPOST, reportPOST]) {
      for (const body of [
        {},
        { order_id: id },
        {
          question_method: "direct-ten",
          context: CONTEXT,
          prompts: WIRE_PROMPTS,
        },
      ]) {
        const response = await route();
        expect(response.status).toBe(410);
        void body;
      }
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("approving the ten questions (R-17)", () => {
  const body = (id: string, extra: Record<string, unknown> = {}) => ({
    order_id: id,
    client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
    question_method: "direct-ten",
    context: CONTEXT,
    prompts: WIRE_PROMPTS,
    originals: ORIGINALS,
    ...extra,
  });
  const approve = (b: unknown) => approvePOST(post("/api/orders/approve", b));

  it("moves an open order to running and saves details, ten questions, start time and a 24-hour deadline once", async () => {
    const id = await makeOrder(d1.db, { mode: "live", now: new Date() });
    const response = await approve(body(id));
    expect(response.status).toBe(200);
    expect((await response.json()).state).toBe("running");
    const [row] = orders();
    expect(row.state).toBe("running");
    const saved = JSON.parse(String(row.intake_json));
    expect(saved.originals).toEqual(ORIGINALS);
    expect(saved.prompts).toHaveLength(10);
    expect(saved.context.identity.name).toBe("Kopi Nuave");
    const start = Date.parse(String(row.started_at));
    expect(Date.parse(String(row.deadline_at)) - start).toBe(24 * 3600_000);
    expect(d1.query("SELECT status FROM order_questions")).toHaveLength(10);
    // Approving again changes nothing.
    const before = JSON.stringify(orders());
    expect(
      (await approve(body(id, { originals: ORIGINALS.map((q) => q + "!") })))
        .status,
    ).toBe(200);
    expect(JSON.stringify(orders())).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses to approve questions made for another website, and changes nothing", async () => {
    const id = await makeOrder(d1.db, { mode: "live", now: new Date() });
    const other = {
      ...CONTEXT,
      identity: { ...CONTEXT.identity, source: "https://attacker.example/" },
    };
    const response = await approve(body(id, { context: other }));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("ORDER_STATE");
    expect(orders()[0].state).toBe("open");
    expect(d1.query("SELECT * FROM order_questions")).toEqual([]);
    // The same website written differently still matches the order.
    const same = {
      ...CONTEXT,
      identity: { ...CONTEXT.identity, source: "https://KopiNuave.example" },
    };
    expect((await approve(body(id, { context: same }))).status).toBe(200);
  });

  it("runs today's checks first and changes nothing when one fails", async () => {
    const id = await makeOrder(d1.db, { mode: "live", now: new Date() });
    const stale = await approve(body(id, { client_contract_version: "old" }));
    expect(stale.status).toBe(409);
    const short = await approve(
      body(id, { prompts: WIRE_PROMPTS.slice(0, 9) }),
    );
    expect(short.status).toBe(400);
    const wrongOrder = await approve(
      body(id, { prompts: [...WIRE_PROMPTS].reverse() }),
    );
    expect(wrongOrder.status).toBe(422);
    expect(orders()[0].state).toBe("open");
    expect(d1.query("SELECT * FROM order_questions")).toEqual([]);
  });

  it("refuses an unknown order, an expired order and an order of another environment", async () => {
    expect((await approve(body("f".repeat(32)))).status).toBe(404);
    const old = await makeOrder(d1.db, {
      mode: "live",
      now: new Date(Date.now() - 3 * 3600_000),
    });
    expect((await approve(body(old))).status).toBe(409);
    const preview = await makeOrder(d1.db, {
      mode: "live",
      environment: "preview",
      now: new Date(),
    });
    expect((await approve(body(preview))).status).toBe(404);
    expect(orders().filter((row) => row.state === "running")).toEqual([]);
  });
});

describe("order status (R-21)", () => {
  const status = (id: unknown) =>
    statusPOST(post("/api/orders/status", { order_id: id }));

  it("returns the state and progress only, never the email, the report or a link secret", async () => {
    const id = await makeOrder(d1.db, { mode: "live", now: new Date() });
    d1.query(
      `UPDATE orders SET report_json = '{"secretreport":1}', link_hash = 'abc', state = 'delivered' WHERE id = '${id}' RETURNING 1`,
    );
    const response = await status(id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const json = await response.json();
    expect(Object.keys(json).sort()).toEqual([
      "completed",
      "questions",
      "state",
      "total",
    ]);
    const text = JSON.stringify(json);
    for (const forbidden of [
      "example.com",
      "secretreport",
      "abc",
      "link",
      "Kopi",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("answers 404 for an unknown, malformed or other-environment id", async () => {
    const preview = await makeOrder(d1.db, {
      mode: "live",
      environment: "preview",
      now: new Date(),
    });
    for (const id of ["f".repeat(32), "nope", undefined, preview]) {
      expect((await status(id)).status).toBe(404);
    }
  });

  it("reports an open order past its time as expired", async () => {
    const id = await makeOrder(d1.db, {
      now: new Date(Date.now() - 3 * 3600_000),
    });
    expect((await (await status(id)).json()).state).toBe("expired");
  });
});
