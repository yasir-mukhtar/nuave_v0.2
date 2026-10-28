import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  extractDraft: null as null | ((...args: unknown[]) => Promise<unknown>),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

// The real reading unless a test installs its own (to count paid readings).
vi.mock("@/lib/audit/provider", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/audit/provider")>();
  return {
    ...original,
    liveExtractBusinessDraft: (
      ...args: Parameters<typeof original.liveExtractBusinessDraft>
    ) =>
      mocks.extractDraft
        ? mocks.extractDraft(...args)
        : original.liveExtractBusinessDraft(...args),
  };
});
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
import { runSupport } from "./support";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import {
  CONTEXT,
  ORIGINALS,
  WIRE_PROMPTS,
  makeOrder,
  makePaidOrder,
} from "./orders.test-helper";

// Spec 016 AC-01..AC-05 at the route level: the real routes and the real
// ledger on the sqlite D1 helper. The paid provider is a fetch spy that fails
// the test if it is reached when it must not be.

const UNAVAILABLE = "Audit tidak tersedia saat ini.";
const TEST_CODE = "test-pass-code-of-at-least-24-chars";
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
  mocks.extractDraft = null;
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
  // Spec 017 R-17/R-20: the settings a founder test pass needs.
  vi.stubEnv("NUAVE_TEST_PASS_CODE", TEST_CODE);
  vi.stubEnv("MIDTRANS_SERVER_KEY", "SB-Mid-server-offline-key");
  vi.stubEnv("MIDTRANS_IS_PRODUCTION", "false");
  vi.stubEnv("NUAVE_FOUNDER_ALERT_EMAIL", "hello@nuave.test");
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
// A founder test pass: the order is made with payment kind `test`, which holds
// at creation and may run, as S3 orders did (spec 017 R-20).
const createTest = (body: Record<string, unknown> = {}, headers = {}) =>
  create({ test_pass_code: TEST_CODE, ...body }, headers);
const orders = () => d1.query<Record<string, unknown>>("SELECT * FROM orders");
const ledger = () =>
  d1.query<Record<string, unknown>>("SELECT * FROM provider_spend");

describe("making an order (R-01, R-02, R-06, AC-01)", () => {
  it("makes one open unpaid order for a listed email: server-made id, order number, server-set mode and environment, no hold (R-01, R-10, R-23, AC-10)", async () => {
    const response = await create();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.order_id).toMatch(/^[0-9a-f]{32}$/); // 128 bits
    expect(body.state).toBe("open");
    expect(JSON.stringify(body)).not.toContain("example.com");
    // The order number is not shown before payment.
    expect(JSON.stringify(body)).not.toContain("NV-");
    const [row] = orders();
    expect(row).toMatchObject({
      id: body.order_id,
      email: "owner@example.com",
      business_name: "Kopi Nuave",
      website: "https://kopinuave.example/",
      mode: "live",
      environment: "production",
      state: "open",
      payment_kind: "unpaid",
      paid_at: null,
      replaced_by: null,
    });
    expect(row.order_number).toMatch(/^NV-[23456789A-HJKMNP-Z]{6}$/);
    // AC-10: an unpaid order holds nothing.
    expect(ledger()).toEqual([]);
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
  it.each(["lots", "-1", "NaN", "0", "50.01"])(
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
    expect((await createTest()).status).toBe(503); // default limit 5.00 > 1.50
    vi.stubEnv("NUAVE_ORDER_SPEND_LIMIT_USD", "1.5");
    expect((await createTest()).status).toBe(200);
  });

  it("a test pass defaults to USD 5.00 and holds exactly the configured limit", async () => {
    await createTest();
    vi.stubEnv("NUAVE_ORDER_SPEND_LIMIT_USD", "1.25");
    await createTest();
    expect(ledger().map((row) => row.held_units)).toEqual([
      usdToUnits(5),
      usdToUnits(1.25),
    ]);
  });

  it("with less room in the daily cap than one limit, refuses and leaves the database unchanged", async () => {
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "12");
    expect((await createTest()).status).toBe(200);
    expect((await createTest()).status).toBe(200);
    const before = JSON.stringify([orders(), ledger()]);
    const response = await createTest(); // 5 + 5 + 5 > 12
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
    // S5 adds started_at so a reloaded page can tell when the audit passed
    // the 15-minute promise; it carries no email, report or secret.
    expect(Object.keys(json).sort()).toEqual([
      "completed",
      "payment",
      "questions",
      "started_at",
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

describe("the paid website reading is made once per order (R-08)", () => {
  it("a repeated extract request for the same open order returns the saved reading with no provider call", async () => {
    const created = await (await createTest()).json();
    const reading = { draft: { name: "Kopi Nuave" }, telemetry: [] };
    mocks.extractDraft = vi.fn(async () => reading);
    const ask = () =>
      extractPOST(post("/api/audit/extract", { order_id: created.order_id }));
    const first = await ask();
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(mocks.extractDraft).toHaveBeenCalledTimes(1);
    expect(
      (orders()[0] as { prepared_json: string | null }).prepared_json,
    ).toBeTruthy();
    const second = await ask();
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(firstBody);
    expect(mocks.extractDraft).toHaveBeenCalledTimes(1); // no second reading
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a failed reading is not saved, so a later request may try again", async () => {
    const created = await (await createTest()).json();
    mocks.extractDraft = vi.fn(async () => {
      throw new Error("provider down");
    });
    const failed = await extractPOST(
      post("/api/audit/extract", { order_id: created.order_id }),
    );
    expect(failed.status).toBeGreaterThanOrEqual(400);
    expect(
      (orders()[0] as { prepared_json: string | null }).prepared_json,
    ).toBeNull();
  });
});

describe("a replacement order expires the test or legacy order it replaces (R-19)", () => {
  it("expires the old open test-pass order and returns its hold in the same request", async () => {
    const first = await (await createTest()).json();
    expect(ledger().map((row) => row.status)).toEqual(["reserved"]);
    const second = await createTest({ previous_order_id: first.order_id });
    expect(second.status).toBe(200);
    const states = Object.fromEntries(
      orders().map((row) => [row.id, row.state]),
    );
    expect(states[first.order_id]).toBe("expired");
    expect(states[(await second.json()).order_id]).toBe("open");
    // The old hold is settled to nothing: only the new order holds the cap.
    expect(d1.heldUnitsToday(new Date().toISOString().slice(0, 10))).toBe(
      usdToUnits(5),
    );
  });

  it("frees the room the new test pass needs when the cap would otherwise be full", async () => {
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "12");
    const a = await (await createTest()).json();
    await createTest(); // two orders hold 10 of 12
    expect((await createTest()).status).toBe(503);
    expect((await createTest({ previous_order_id: a.order_id })).status).toBe(
      200,
    );
  });

  it("ignores an order that is not open, one of another environment, an unknown or a malformed id", async () => {
    vi.stubEnv("NUAVE_ORDER_SPEND_LIMIT_USD", "0.5");
    const running = await makeOrder(d1.db, {
      mode: "live",
      limitUsd: 0.1,
      now: new Date(),
    });
    d1.query(
      `UPDATE orders SET state = 'running' WHERE id = '${running}' RETURNING 1`,
    );
    const preview = await makeOrder(d1.db, {
      mode: "live",
      environment: "preview",
      limitUsd: 0.1,
      now: new Date(),
    });
    for (const previous_order_id of [
      running,
      preview,
      "f".repeat(32),
      "nope",
      42,
      null,
    ]) {
      expect((await createTest({ previous_order_id })).status).toBe(200);
    }
    const byId = Object.fromEntries(orders().map((row) => [row.id, row.state]));
    expect(byId[running]).toBe("running");
    expect(byId[preview]).toBe("open");
  });
});

describe("the emergency switch (R-15)", () => {
  it("keeps the status answer going while the switch is off, and still refuses new work", async () => {
    const created = await (await create()).json();
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "false");
    const status = await statusPOST(
      post("/api/orders/status", { order_id: created.order_id }),
    );
    expect(status.status).toBe(200);
    const answer = await status.json();
    expect(answer.state).toBe("open");
    expect(answer.paused).toBe(true); // waiting, nothing lost
    // New orders and paid work stay off.
    expect((await create()).status).not.toBe(200);
    expect(
      (
        await extractPOST(
          post("/api/audit/extract", { order_id: created.order_id }),
        )
      ).status,
    ).not.toBe(200);
  });
});

describe("the founder test pass, server side (R-16, R-17, R-20, AC-17)", () => {
  const SECRET_PATTERN = /test-pass-code/;

  it("a right code, a listed email and the settings make a test order: kind test, hold reserved and marked, 2-hour rule", async () => {
    const response = await createTest();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ order_id: expect.any(String), state: "open" });
    expect(JSON.stringify(body)).not.toMatch(SECRET_PATTERN);
    const [row] = orders();
    expect(row).toMatchObject({
      payment_kind: "test",
      state: "open",
      paid_at: null,
    });
    expect(
      Date.parse(String(row.expires_at)) - Date.parse(String(row.created_at)),
    ).toBe(2 * 3600_000);
    expect(ledger()).toMatchObject([
      { kind: "order_hold", order_id: body.order_id, test: 1 },
    ]);
    // The code is kept nowhere: not in D1, not echoed.
    expect(JSON.stringify([orders(), ledger()])).not.toMatch(SECRET_PATTERN);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never logs or echoes the code, for a right or a wrong one", async () => {
    const logs: string[] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      });
    }
    const right = await createTest();
    const wrong = await create({
      test_pass_code: "wrong-code-wrong-code-wrong-code",
    });
    expect(logs.join("\n")).not.toMatch(SECRET_PATTERN);
    expect(logs.join("\n")).not.toContain("wrong-code");
    expect(JSON.stringify(await wrong.json())).not.toContain("wrong-code");
    expect(JSON.stringify(await right.json())).not.toMatch(SECRET_PATTERN);
    vi.restoreAllMocks();
  });

  it("every refusal gives the same neutral answer as any refused order", async () => {
    const neutral = await create({ email: "stranger@example.com" });
    const expected = { status: neutral.status, body: await neutral.json() };
    expect(expected.status).toBe(503);
    expect(JSON.stringify(expected.body)).toContain(UNAVAILABLE);
    const refusals: Array<[string, () => Promise<Response>]> = [
      ["a wrong code", () => create({ test_pass_code: "x".repeat(40) })],
      ["an empty code", () => create({ test_pass_code: "" })],
      ["a code that is not text", () => create({ test_pass_code: 12345 })],
      ["a null code", () => create({ test_pass_code: null })],
      [
        "an unlisted email with the right code",
        () => createTest({ email: "stranger@example.com" }),
      ],
      [
        "a secret under 24 characters",
        async () => {
          vi.stubEnv("NUAVE_TEST_PASS_CODE", "x".repeat(23));
          return create({ test_pass_code: "x".repeat(23) });
        },
      ],
      [
        "no secret at all",
        async () => {
          vi.stubEnv("NUAVE_TEST_PASS_CODE", "");
          return create({ test_pass_code: "" });
        },
      ],
      [
        "a missing Midtrans key",
        async () => {
          vi.stubEnv("MIDTRANS_SERVER_KEY", "");
          return createTest();
        },
      ],
      [
        "a missing production switch",
        async () => {
          vi.stubEnv("MIDTRANS_IS_PRODUCTION", "");
          return createTest();
        },
      ],
      [
        "a production switch that is not true or false",
        async () => {
          vi.stubEnv("MIDTRANS_IS_PRODUCTION", "yes");
          return createTest();
        },
      ],
      [
        "a missing alert address",
        async () => {
          vi.stubEnv("NUAVE_FOUNDER_ALERT_EMAIL", "");
          return createTest();
        },
      ],
    ];
    for (const [name, attempt] of refusals) {
      // Each case starts from the full set of settings again.
      vi.stubEnv("NUAVE_TEST_PASS_CODE", TEST_CODE);
      vi.stubEnv("MIDTRANS_SERVER_KEY", "SB-Mid-server-offline-key");
      vi.stubEnv("MIDTRANS_IS_PRODUCTION", "false");
      vi.stubEnv("NUAVE_FOUNDER_ALERT_EMAIL", "hello@nuave.test");
      const response = await attempt();
      expect(response.status, name).toBe(expected.status);
      expect(await response.json(), name).toEqual(expected.body);
    }
    expect(orders()).toEqual([]);
    expect(ledger()).toEqual([]);
  });

  it("a secret of exactly 24 characters is enough", async () => {
    vi.stubEnv("NUAVE_TEST_PASS_CODE", "y".repeat(24));
    expect((await create({ test_pass_code: "y".repeat(24) })).status).toBe(200);
    expect(orders()[0]).toMatchObject({ payment_kind: "test" });
  });

  it("a wrong code never falls back to a normal order", async () => {
    expect((await create({ test_pass_code: "wrong" })).status).toBe(503);
    expect(orders()).toEqual([]);
  });

  it("wrong codes share the order rate limit with every other request", async () => {
    let calls = 0;
    bind({
      ORDER_CREATE_CALLER_RATE_LIMITER: {
        limit: async () => {
          calls += 1;
          return { success: calls <= 2 };
        },
      },
    });
    expect((await create({ test_pass_code: "a".repeat(30) })).status).toBe(503);
    expect((await create({ test_pass_code: "b".repeat(30) })).status).toBe(503);
    // The third caller is limited whatever it sends. A test-pass request gets
    // the same neutral answer as any refusal (AC-17); an ordinary order still
    // gets 429.
    const limitedTest = await createTest();
    expect(limitedTest.status).toBe(503);
    expect(await limitedTest.json()).toEqual({
      error: UNAVAILABLE,
      code: "ORDER_UNAVAILABLE",
    });
    expect((await create()).status).toBe(429);
    expect(calls).toBe(4);
    expect(orders()).toEqual([]);
  });

  it("is refused with the same answer when the cap has no room, counting open attempts (R-10)", async () => {
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "12");
    await createTest();
    await createTest(); // 10 of 12 held
    const full = await createTest();
    expect(full.status).toBe(503);
    expect(JSON.stringify(await full.json())).toContain(UNAVAILABLE);
    expect(orders()).toHaveLength(2);
    // Room again once one is ended; then open attempts take it back.
    d1.query("UPDATE orders SET state = 'expired' WHERE rowid = 1 RETURNING 1");
    d1.query(
      "UPDATE provider_spend SET status = 'settled', held_units = 0 WHERE rowid = 1 RETURNING 1",
    );
    const unpaid = await makeOrder(d1.db, { payment: "unpaid" });
    d1.query(
      `INSERT INTO payment_attempts (id, order_id, attempt_number, midtrans_order_id, window_start, window_end, created_at, updated_at)
       VALUES ('a1', '${unpaid}', 1, 'NV-AAAAAA-1', 'x', 'y', 'x', 'x') RETURNING 1`,
    );
    expect((await createTest()).status).toBe(503); // 5 held + 5 open + 5 > 12
    d1.query("UPDATE payment_attempts SET status = 'void' RETURNING 1");
    expect((await createTest()).status).toBe(200);
  });

  it("the founder email list still applies in live mode, to the test pass too (R-16)", async () => {
    vi.stubEnv("NUAVE_ORDER_EMAIL_ALLOWLIST", "");
    expect((await createTest()).status).toBe(503);
    expect(orders()).toEqual([]);
  });

  it("in synthetic mode a test pass needs the code but no Midtrans settings, and writes no ledger row", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    vi.stubEnv("NUAVE_FOUNDER_ALERT_EMAIL", "");
    expect((await createTest()).status).toBe(200);
    expect(orders()[0]).toMatchObject({
      payment_kind: "test",
      mode: "synthetic",
    });
    expect(ledger()).toEqual([]);
    expect((await create({ test_pass_code: "nope" })).status).toBe(503);
  });

  it("an ordinary order needs no test-pass or Midtrans settings", async () => {
    vi.stubEnv("NUAVE_TEST_PASS_CODE", "");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    vi.stubEnv("MIDTRANS_IS_PRODUCTION", "");
    vi.stubEnv("NUAVE_FOUNDER_ALERT_EMAIL", "");
    expect((await create()).status).toBe(200);
    expect(orders()[0]).toMatchObject({ payment_kind: "unpaid" });
  });
});

describe("replacing an order through the route (R-19, AC-13 server parts)", () => {
  const attempt = (orderId: string, status: string) =>
    d1.query(
      `INSERT INTO payment_attempts (id, order_id, attempt_number, midtrans_order_id, window_start, window_end, status, created_at, updated_at)
       VALUES ('a-${orderId.slice(0, 4)}', '${orderId}', 1, 'NV-${orderId.slice(0, 6).toUpperCase().replace(/[0-9]/g, "A")}-1', 'x', 'y', '${status}', 'x', 'x') RETURNING 1`,
    );

  it("an unpaid order is marked replaced by the new one, and ended", async () => {
    const first = await (await create()).json();
    const second = await create({ previous_order_id: first.order_id });
    expect(second.status).toBe(200);
    const next = await second.json();
    const byId = Object.fromEntries(orders().map((row) => [row.id, row]));
    expect(byId[first.order_id]).toMatchObject({
      state: "expired",
      replaced_by: next.order_id,
    });
    expect(byId[next.order_id]).toMatchObject({
      state: "open",
      replaced_by: null,
      payment_kind: "unpaid",
    });
  });

  it("a paid order is not replaced: 409 PREVIOUS_ORDER_ACTIVE with previous_state paid, and nothing is written", async () => {
    const paid = await makePaidOrder(d1.db, { mode: "live", now: new Date() });
    const before = JSON.stringify([orders(), ledger()]);
    const response = await create({ previous_order_id: paid });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "Pesanan sebelumnya sudah dibayar atau sedang menunggu pembayaran.",
      code: "PREVIOUS_ORDER_ACTIVE",
      previous_state: "paid",
    });
    expect(JSON.stringify([orders(), ledger()])).toBe(before);
  });

  it("an order with an open payment attempt is not replaced: previous_state payment_open, and it stays open", async () => {
    const first = await (await create()).json();
    attempt(first.order_id, "open");
    const response = await create({ previous_order_id: first.order_id });
    expect(response.status).toBe(409);
    expect((await response.json()).previous_state).toBe("payment_open");
    expect(orders()).toHaveLength(1);
    expect(orders()[0]).toMatchObject({ state: "open", replaced_by: null });
  });

  it("an order with an attempt closed as unknown is not replaced (Q14): previous_state payment_unknown, nothing written", async () => {
    const first = await (await create()).json();
    attempt(first.order_id, "closed_unknown");
    const before = JSON.stringify([orders(), ledger()]);
    const response = await create({ previous_order_id: first.order_id });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "Pembayaran pesanan sebelumnya belum dapat dipastikan. Hubungi support@nuave.ai.",
      code: "PREVIOUS_ORDER_ACTIVE",
      previous_state: "payment_unknown",
    });
    expect(JSON.stringify([orders(), ledger()])).toBe(before);
  });

  it("after support closes the unknown attempt as unpaid the order is replaced again (Q14)", async () => {
    const first = await (await create()).json();
    attempt(first.order_id, "closed_unknown");
    expect((await create({ previous_order_id: first.order_id })).status).toBe(
      409,
    );
    const midtransId = `NV-${first.order_id
      .slice(0, 6)
      .toUpperCase()
      .replace(/[0-9]/g, "A")}-1`;
    const code = await runSupport(["close", midtransId, "unpaid"], {
      db: d1.db,
      makeSender: async () => {
        throw new Error("no email expected");
      },
      siteOrigin: "https://nuave.test",
      now: () => new Date(),
      out: () => {},
    });
    expect(code).toBe(0);
    const response = await create({ previous_order_id: first.order_id });
    expect(response.status).toBe(200);
    expect(orders().find((row) => row.id === first.order_id)?.replaced_by).toBe(
      (await response.json()).order_id,
    );
  });

  it("once the attempt is final the order is replaced, even though it expired", async () => {
    const first = await (await create()).json();
    attempt(first.order_id, "finally_unpaid");
    d1.query(
      `UPDATE orders SET state = 'expired' WHERE id = '${first.order_id}' RETURNING 1`,
    );
    const response = await create({ previous_order_id: first.order_id });
    expect(response.status).toBe(200);
    expect(orders().find((row) => row.id === first.order_id)?.replaced_by).toBe(
      (await response.json()).order_id,
    );
  });

  it("an unknown id is ignored and the new order is made", async () => {
    expect((await create({ previous_order_id: "a".repeat(32) })).status).toBe(
      200,
    );
    expect(orders()).toHaveLength(1);
  });
});

describe("the paid-only gate at every paid route (R-18, AC-04)", () => {
  const extract = (body: unknown) =>
    extractPOST(post("/api/audit/extract", body));
  const glm = (order_id: unknown) => {
    const base = {
      version: SMART_INTAKE_INPUT_VERSION,
      factVersion: 1,
      context: CONTEXT,
    };
    return glmPOST(
      post("/api/audit/glm-questions", {
        method: "direct-ten",
        intake: { ...base, fingerprint: smartFingerprint(base) },
        order_id,
      }),
    );
  };
  const approveBody = (order_id: string) => ({
    order_id,
    client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
    question_method: "direct-ten",
    context: CONTEXT,
    prompts: WIRE_PROMPTS,
    originals: ORIGINALS,
  });
  const noLedgerRow = () =>
    expect(
      d1.query("SELECT * FROM provider_spend WHERE kind = 'order_call'"),
    ).toEqual([]);

  it("refuses an unpaid order at extract, question writing and approval, with no provider call and no ledger row", async () => {
    const created = await (await create()).json();
    const missing = await extract({ order_id: "f".repeat(32) });
    const missingBody = await missing.json();
    const refused = await extract({ order_id: created.order_id });
    expect(refused.status).toBe(409);
    // The same neutral answer as an order that does not exist.
    expect(await refused.json()).toEqual(missingBody);
    const refusedGlm = await glm(created.order_id);
    expect(refusedGlm.status).toBe(409);
    expect(await refusedGlm.json()).toEqual(
      await (await glm("f".repeat(32))).json(),
    );
    const refusedApprove = await approvePOST(
      post("/api/orders/approve", approveBody(created.order_id)),
    );
    expect(refusedApprove.status).toBe(409);
    expect((await refusedApprove.json()).code).toBe("ORDER_STATE");
    expect(orders()[0]).toMatchObject({ state: "open", started_at: null });
    expect(d1.query("SELECT * FROM order_questions")).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    noLedgerRow();
    expect(ledger()).toEqual([]);
  });

  it("refuses a replaced order the same way", async () => {
    const first = await (await create()).json();
    await create({ previous_order_id: first.order_id });
    expect((await extract({ order_id: first.order_id })).status).toBe(409);
    expect((await glm(first.order_id)).status).toBe(409);
    expect(
      (
        await approvePOST(
          post("/api/orders/approve", approveBody(first.order_id)),
        )
      ).status,
    ).toBe(409);
    expect(fetchSpy).not.toHaveBeenCalled();
    noLedgerRow();
  });

  it("lets a paid order through (the reading, the questions and the approval)", async () => {
    const paid = await makePaidOrder(d1.db, { mode: "live", now: new Date() });
    mocks.extractDraft = vi.fn(async () => ({ draft: {}, telemetry: [] }));
    expect((await extract({ order_id: paid })).status).toBe(200);
    expect(mocks.extractDraft).toHaveBeenCalledTimes(1);
    expect(
      (await approvePOST(post("/api/orders/approve", approveBody(paid))))
        .status,
    ).toBe(200);
    expect(orders()[0]).toMatchObject({ state: "running" });
  });

  it("lets a test-pass and a legacy order through", async () => {
    mocks.extractDraft = vi.fn(async () => ({ draft: {}, telemetry: [] }));
    for (const payment of ["test", "legacy"] as const) {
      const id = await makeOrder(d1.db, {
        mode: "live",
        payment,
        now: new Date(),
        limitUsd: 0.5,
      });
      expect((await extract({ order_id: id })).status, payment).toBe(200);
    }
  });

  it("the simulated payment counts as paid in synthetic mode only", async () => {
    const live = await makeOrder(d1.db, {
      mode: "live",
      payment: "simulated",
      now: new Date(),
    });
    expect((await extract({ order_id: live })).status).toBe(409);
    expect(
      (await approvePOST(post("/api/orders/approve", approveBody(live))))
        .status,
    ).toBe(409);
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    const synthetic = await makeOrder(d1.db, {
      mode: "synthetic",
      payment: "simulated",
      now: new Date(),
    });
    expect((await extract({ order_id: synthetic })).status).toBe(200);
    expect(
      (await approvePOST(post("/api/orders/approve", approveBody(synthetic))))
        .status,
    ).toBe(200);
  });

  it("an order number is not an order ID anywhere", async () => {
    await createTest();
    const number = String(orders()[0]!.order_number);
    expect(number).toMatch(/^NV-/);
    expect((await extract({ order_id: number })).status).toBe(409);
    expect((await glm(number)).status).toBe(409);
    expect(
      (await approvePOST(post("/api/orders/approve", approveBody(number))))
        .status,
    ).toBe(400);
    const status = await statusPOST(
      post("/api/orders/status", { order_id: number }),
    );
    expect(status.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
