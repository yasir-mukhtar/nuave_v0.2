import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { POST as discoveryPOST } from "../../app/api/audit/discovery/route";
import { POST as glmPOST } from "../../app/api/audit/glm-questions/route";
import { POST as approvePOST } from "../../app/api/orders/approve/route";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "../audit/client-contract";
import type { DirectTenAuditContext } from "../audit/direct-ten-context-v2";
import {
  smartFingerprint,
  SMART_INTAKE_INPUT_VERSION,
} from "../intake/smart-intake-contract";
import { getOrder } from "../orders/store";
import { CONTEXT, makeOrder } from "../orders/orders.test-helper";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { reserveOrderCall } from "../spending/spend-ledger";
import { questionPublicMessage } from "../intake/question-public-errors";
import { matchPlace } from "./places";
import { isProviderChoice, type QuestionOrigin } from "./question-rules";
import type { DiscoveryPool } from "./pool";

const allow = { limit: async () => ({ success: true }) };
let dir: string;
let d1: ReturnType<typeof openFileD1>;
let fetchSpy: ReturnType<typeof vi.fn>;

const surabaya = matchPlace("Surabaya")!;
const bandung = matchPlace("Bandung")!;

function dental(place = surabaya): DirectTenAuditContext {
  return {
    ...CONTEXT,
    category: { value: "klinik gigi", origin: "website" },
    offerings: {
      value: ["Behel (orthodonti)", "Implan gigi"],
      origin: "website",
    },
    market: {
      value: { reach: "sekitar", areas: [place.display] },
      origin: "website",
    },
    searchPlace: {
      value: { kind: "place", code: place.code, display: place.display },
      origin: "nuave",
    },
  };
}

function frozen(context: DirectTenAuditContext) {
  const record = {
    version: SMART_INTAKE_INPUT_VERSION,
    factVersion: 1,
    context,
  };
  return { ...record, fingerprint: smartFingerprint(record) };
}

const post = (path: string, body: unknown) =>
  new Request(`https://nuave.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-discovery-"));
  d1 = openFileD1(join(dir, "orders.sqlite"));
  mocks.getCloudflareContext.mockReturnValue({
    env: {
      SPEND_DB: d1.db,
      EXTRACT_CALLER_RATE_LIMITER: allow,
      GLM_CALLER_RATE_LIMITER: allow,
      ORDER_STATUS_CALLER_RATE_LIMITER: allow,
    },
  });
  fetchSpy = vi.fn(async () => new Response("{}", { status: 500 }));
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
  vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  vi.stubEnv("NUAVE_GLM_EVIDENCE_DIR", "");
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mocks.getCloudflareContext.mockReset();
});

async function savedOrder(id: string) {
  return (await getOrder(d1.db, id))!;
}

describe("discovery route (R-04, R-07, R-15)", () => {
  it("saves a pool once per set of inputs, runs again once on a change, then locks", async () => {
    const id = await makeOrder(d1.db, { now: new Date() });
    const first = await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(dental()) }),
    );
    expect(first.status).toBe(200);
    // Only whether search data was found; the pool never reaches the browser.
    expect(await first.json()).toEqual({
      status: "ok",
      searchData: true,
      locked: false,
    });
    const row = await savedOrder(id);
    expect(row.discovery_runs).toBe(1);
    const pool = JSON.parse(row.discovery_json!) as DiscoveryPool;
    expect(pool.synthetic).toBe(true);
    expect(pool.place).toMatchObject({ code: surabaya.code });

    await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(dental()) }),
    );
    expect((await savedOrder(id)).discovery_runs).toBe(1);

    const changed = await discoveryPOST(
      post("/api/audit/discovery", {
        order_id: id,
        intake: frozen(dental(bandung)),
      }),
    );
    expect((await changed.json()).locked).toBe(true);
    expect((await savedOrder(id)).discovery_runs).toBe(2);

    await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(dental()) }),
    );
    const locked = await savedOrder(id);
    expect(locked.discovery_runs).toBe(2);
    expect(JSON.parse(locked.discovery_json!).place.code).toBe(bandung.code);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses an intake without Kota untuk pencarian, or without an open order", async () => {
    const id = await makeOrder(d1.db, { now: new Date() });
    const legacy = await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(CONTEXT) }),
    );
    expect(legacy.status).toBe(400);
    const missing = await discoveryPOST(
      post("/api/audit/discovery", {
        order_id: "f".repeat(32),
        intake: frozen(dental()),
      }),
    );
    expect(missing.status).toBe(409);
  });
});

async function writeQuestions(id: string, context: DirectTenAuditContext) {
  const response = await glmPOST(
    post("/api/audit/glm-questions", {
      method: "direct-ten",
      order_id: id,
      intake: frozen(context),
    }),
  );
  return (await response.json()) as {
    status: string;
    questions: string[];
    origins?: QuestionOrigin[];
  };
}

const approveBody = (
  id: string,
  context: DirectTenAuditContext,
  questions: string[],
  originals: string[],
  extra: Record<string, unknown> = {},
) => ({
  order_id: id,
  client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
  question_method: "direct-ten",
  context,
  prompts: questions.map((question, index) => ({
    prompt_id: `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
    question,
    review_status: "needs_human_review",
  })),
  originals,
  ...extra,
});

describe("questions from the pool and approval (R-07, R-10, R-11, AC-04, AC-05, AC-19)", () => {
  it("writes grounded questions with server-owned origins and saves them on the order", async () => {
    const id = await makeOrder(d1.db, { now: new Date() });
    const context = dental();
    await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(context) }),
    );
    const outcome = await writeQuestions(id, context);
    expect(outcome.status).toBe("ok");
    expect(outcome.origins).toHaveLength(10);
    expect(
      outcome.origins!.some((origin) => origin.label === "dicari_di_google"),
    ).toBe(true);
    const providers = outcome.questions.filter(isProviderChoice);
    expect(providers.length).toBeGreaterThanOrEqual(7);
    for (const question of providers)
      expect(question.toLowerCase()).toContain("surabaya");
    const saved = JSON.parse((await savedOrder(id)).questions_json!);
    expect(saved).toMatchObject({ mode: "grounded" });
    expect(saved.questions).toEqual(outcome.questions);

    const approved = await approvePOST(
      post(
        "/api/orders/approve",
        approveBody(id, context, outcome.questions, outcome.questions, {
          question_origins: outcome.origins,
        }),
      ),
    );
    expect(approved.status).toBe(200);
    const intake = JSON.parse((await savedOrder(id)).intake_json!);
    expect(intake.question_origins).toEqual(outcome.origins);
  });

  it("rejects a label or number changed in the browser, and an edit that drops the place", async () => {
    const id = await makeOrder(d1.db, { now: new Date() });
    const context = dental();
    await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(context) }),
    );
    const outcome = await writeQuestions(id, context);
    const forged = outcome.origins!.map((origin, index) =>
      index === 0 ? { ...origin, volume: 99_999 } : origin,
    );
    const forgedResponse = await approvePOST(
      post(
        "/api/orders/approve",
        approveBody(id, context, outcome.questions, outcome.questions, {
          question_origins: forged,
        }),
      ),
    );
    expect(forgedResponse.status).toBe(422);
    const slot = outcome.questions.findIndex(isProviderChoice);
    const edited = [...outcome.questions];
    edited[slot] = "Rekomendasi klinik behel gigi terbaik yang dekat?";
    const dropped = await approvePOST(
      post(
        "/api/orders/approve",
        approveBody(id, context, edited, outcome.questions),
      ),
    );
    expect(dropped.status).toBe(422);
    expect((await dropped.json()).error).toContain(
      "Sebutkan kota Surabaya di pertanyaan ini.",
    );
    expect((await savedOrder(id)).state).toBe("open");
  });

  it("marks an edit Diubah oleh Anda and keeps the number only with the topic words", async () => {
    const id = await makeOrder(d1.db, { now: new Date() });
    const context = dental();
    await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(context) }),
    );
    const outcome = await writeQuestions(id, context);
    const slot = outcome.origins!.findIndex(
      (origin, index) =>
        origin.volume !== null && isProviderChoice(outcome.questions[index]!),
    );
    const edited = [...outcome.questions];
    edited[slot] = `${edited[slot]!.replace(/\?$/, "")} yang ramah?`;
    const response = await approvePOST(
      post(
        "/api/orders/approve",
        approveBody(id, context, edited, outcome.questions),
      ),
    );
    expect(response.status).toBe(200);
    const origins = JSON.parse((await savedOrder(id)).intake_json!)
      .question_origins as QuestionOrigin[];
    expect(origins[slot]).toMatchObject({
      label: "diubah_oleh_anda",
      originalTopic: outcome.origins![slot]!.topic,
      volume: outcome.origins![slot]!.volume,
    });
  });

  it("falls back to the business facts when discovery found nothing (AC-05)", async () => {
    const id = await makeOrder(d1.db, { now: new Date() });
    const context = dental();
    const outcome = await writeQuestions(id, context);
    expect(outcome.status).toBe("ok");
    expect(
      outcome.origins!.every(
        (origin) => origin.label === "disusun_dari_profil",
      ),
    ).toBe(true);
    expect(JSON.parse((await savedOrder(id)).questions_json!).mode).toBe(
      "fallback",
    );
  });
});

describe("live discovery spend (R-25, AC-13)", () => {
  it("stops sending when the order's own limit is reached, keeping what it had", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("DATAFORSEO_LOGIN", "offline-login");
    vi.stubEnv("DATAFORSEO_PASSWORD", "offline-password");
    const id = await makeOrder(d1.db, {
      mode: "live",
      now: new Date(),
      limitUsd: 0.02,
    });
    fetchSpy.mockImplementation(async () =>
      Response.json({
        status_code: 20000,
        tasks: [{ status_code: 20000, cost: 0.006, result: [{ items: [] }] }],
      }),
    );
    const response = await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(dental()) }),
    );
    expect(response.status).toBe(200);
    const calls = fetchSpy.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    expect(calls).toBeLessThan(10);
    const pool = JSON.parse((await savedOrder(id)).discovery_json!);
    expect(pool.incomplete).toBe(true);
    for (const [url, init] of fetchSpy.mock.calls as [string, RequestInit][]) {
      expect(url).toMatch(/^https:\/\/api\.dataforseo\.com\/v3\//);
      expect(String(init.body).toLowerCase()).not.toMatch(/nuave|kopinuave/);
    }
  });
});

/** Counts D1 round trips the way a Worker pays for them: each statement run
 * and each batch is one subrequest. */
function countingDb(db: typeof d1.db) {
  let count = 0;
  const wrap = (statement: object): object =>
    new Proxy(statement, {
      get(target, property) {
        const value = Reflect.get(target, property) as unknown;
        if (typeof value !== "function") return value;
        if (property === "bind")
          return (...args: unknown[]) =>
            wrap((value as (...a: unknown[]) => object).apply(target, args));
        if (["run", "first", "all", "raw"].includes(String(property)))
          return (...args: unknown[]) => {
            count += 1;
            return (value as (...a: unknown[]) => unknown).apply(target, args);
          };
        return (value as (...a: unknown[]) => unknown).bind(target);
      },
    });
  const counted = new Proxy(db, {
    get(target, property) {
      const value = Reflect.get(target, property) as unknown;
      if (property === "prepare")
        return (sql: string) =>
          wrap((value as (sql: string) => object).call(target, sql));
      if (property === "batch")
        return (statements: unknown[]) => {
          count += 1;
          return (value as (s: unknown[]) => unknown).call(target, statements);
        };
      return typeof value === "function"
        ? (value as (...a: unknown[]) => unknown).bind(target)
        : value;
    },
  });
  return { db: counted, count: () => count };
}

describe("one discovery request's worst case (R-09, R-15, AC-15)", () => {
  it("stays under 50 subrequests and USD 0.12 when every call asks to retry", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("DATAFORSEO_LOGIN", "offline-login");
    vi.stubEnv("DATAFORSEO_PASSWORD", "offline-password");
    const id = await makeOrder(d1.db, { mode: "live", now: new Date() });
    const counted = countingDb(d1.db);
    const limiter = vi.fn(async () => ({ success: true }));
    mocks.getCloudflareContext.mockReturnValue({
      env: {
        SPEND_DB: counted.db,
        EXTRACT_CALLER_RATE_LIMITER: { limit: limiter },
        GLM_CALLER_RATE_LIMITER: { limit: limiter },
        ORDER_STATUS_CALLER_RATE_LIMITER: { limit: limiter },
      },
    });
    // 50000: DataForSEO asks to try again; it charged nothing.
    fetchSpy.mockImplementation(async () =>
      Response.json({
        status_code: 20000,
        tasks: [{ status_code: 50000, cost: 0, result: null }],
      }),
    );
    const response = await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(dental()) }),
    );
    expect(response.status).toBe(200);
    const outbound = fetchSpy.mock.calls.length;
    const subrequests = counted.count() + outbound + limiter.mock.calls.length;
    // Ten calls and at most DISCOVERY_MAX_RETRIES (2) retries in all.
    expect(outbound).toBeLessThanOrEqual(12);
    expect(subrequests).toBeLessThan(50);
    const [held] = d1.query<{ units: number }>(
      `SELECT COALESCE(SUM(reserved_units), 0) AS units FROM provider_spend
         WHERE kind = 'order_call' AND order_id = ? AND stage = 'discovery'`,
      id,
    );
    expect(held.units / 100_000_000).toBeLessThanOrEqual(0.12 + 1e-9);
  });

  it("counts every attempt against the hard stop, so a second run only has what is left", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("DATAFORSEO_LOGIN", "offline-login");
    vi.stubEnv("DATAFORSEO_PASSWORD", "offline-password");
    const id = await makeOrder(d1.db, { mode: "live", now: new Date() });
    // Unknown cost (a timeout): every reservation stays held at its maximum.
    fetchSpy.mockImplementation(async () => {
      throw new Error("timeout");
    });
    await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(dental()) }),
    );
    const first = fetchSpy.mock.calls.length;
    await discoveryPOST(
      post("/api/audit/discovery", {
        order_id: id,
        intake: frozen(dental(bandung)),
      }),
    );
    const [held] = d1.query<{ units: number }>(
      `SELECT COALESCE(SUM(held_units), 0) AS units FROM provider_spend
         WHERE kind = 'order_call' AND order_id = ? AND stage = 'discovery'`,
      id,
    );
    expect(first).toBeLessThanOrEqual(12);
    expect(held.units / 100_000_000).toBeLessThanOrEqual(0.12 + 1e-9);
  });
});

describe("discovery refused by DataForSEO (R-14, R-21, N-7)", () => {
  it("a balance or credentials refusal raises one dataforseo_unavailable notice and sends nothing more", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("DATAFORSEO_LOGIN", "offline-login");
    vi.stubEnv("DATAFORSEO_PASSWORD", "offline-password");
    const id = await makeOrder(d1.db, { mode: "live", now: new Date() });
    // 40200: payment required (balance).
    fetchSpy.mockImplementation(async () =>
      Response.json({
        status_code: 40200,
        tasks: [{ status_code: 40200, cost: 0, result: null }],
      }),
    );
    const response = await discoveryPOST(
      post("/api/audit/discovery", { order_id: id, intake: frozen(dental()) }),
    );
    expect(response.status).toBe(200);
    expect(fetchSpy.mock.calls.length).toBe(1);
    expect(
      d1.query<{ kind: string }>(
        "SELECT kind FROM founder_notices WHERE kind = 'dataforseo_unavailable'",
      ),
    ).toHaveLength(1);
  });
});

describe("the question-writing limit (N-18)", () => {
  it("a spent question-writing limit tells the customer to email support and notifies the founder once", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("NUAVE_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
    vi.stubEnv("OPENAI_AUDIT_CARRYOVER_COST_USD", "0");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
    const id = await makeOrder(d1.db, { mode: "live", now: new Date() });
    for (let call = 0; call < 5; call += 1)
      await reserveOrderCall(d1.db, {
        orderId: id,
        provider: "cheaper-inference",
        stage: "questions",
        usd: 0.05,
        now: () => new Date(),
      });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await glmPOST(
        post("/api/audit/glm-questions", {
          method: "direct-ten",
          order_id: id,
          intake: frozen(CONTEXT),
        }),
      );
      const body = (await response.json()) as { reason?: string };
      expect(body.reason).toBe("order_question_limit");
      expect(questionPublicMessage(body, true)).toBe(
        "Pertanyaan untuk pesanan ini belum dapat dibuat lagi. Email support@nuave.ai, kami bantu menyelesaikannya.",
      );
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(
      d1.query<{ kind: string }>(
        "SELECT kind FROM founder_notices WHERE kind = 'questions_limit'",
      ),
    ).toHaveLength(1);
  });
});
