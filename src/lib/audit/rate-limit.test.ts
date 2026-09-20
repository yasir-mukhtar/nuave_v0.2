import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUDIT_REPORT_CALLER_RATE_LIMITER,
  AUDIT_RUN_CALLER_RATE_LIMITER,
  EXTRACT_CALLER_RATE_LIMITER,
  GLM_CALLER_RATE_LIMITER,
  IDENTITY_CALLER_RATE_LIMITER,
  IDENTITY_DESTINATION_RATE_LIMITER,
} from "./rate-limit";
import { SafeSourceFetchError } from "./safe-source-fetch";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  fetchSourceIdentity: vi.fn(),
  assertConfigured: vi.fn(),
  extract: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

vi.mock("@/lib/audit/source-identity", () => ({
  fetchSourceIdentity: mocks.fetchSourceIdentity,
}));

vi.mock("@/lib/audit/provider", () => ({
  assertLiveProviderCredentialsConfigured: mocks.assertConfigured,
  liveExtractBusinessDraft: mocks.extract,
}));

import { GET as identityGET } from "../../app/api/audit/identity/route";
import { GET as extractGET } from "../../app/api/audit/extract/route";
import { POST as extractPOST } from "../../app/api/audit/extract/route";
import { POST as glmQuestionsPOST } from "../../app/api/audit/glm-questions/route";
import { POST as runPOST } from "../../app/api/audit/run/route";
import { POST as reportPOST } from "../../app/api/audit/report/route";

function rateLimiter(success = true) {
  return { limit: vi.fn(async () => ({ success })) };
}

function setCloudflareBindings(bindings: {
  identityCaller?: ReturnType<typeof rateLimiter>;
  identityDestination?: ReturnType<typeof rateLimiter>;
  extractCaller?: ReturnType<typeof rateLimiter>;
  glmCaller?: ReturnType<typeof rateLimiter>;
  runCaller?: ReturnType<typeof rateLimiter>;
  reportCaller?: ReturnType<typeof rateLimiter>;
}) {
  mocks.getCloudflareContext.mockReturnValue({
    env: {
      [IDENTITY_CALLER_RATE_LIMITER]: bindings.identityCaller,
      [IDENTITY_DESTINATION_RATE_LIMITER]: bindings.identityDestination,
      [EXTRACT_CALLER_RATE_LIMITER]: bindings.extractCaller,
      [GLM_CALLER_RATE_LIMITER]: bindings.glmCaller,
      [AUDIT_RUN_CALLER_RATE_LIMITER]: bindings.runCaller,
      [AUDIT_REPORT_CALLER_RATE_LIMITER]: bindings.reportCaller,
    },
  });
}

describe("D1 route rate limits", () => {
  beforeEach(() => {
    mocks.getCloudflareContext.mockReset();
    mocks.fetchSourceIdentity.mockReset();
    mocks.assertConfigured.mockReset();
    mocks.extract.mockReset();
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "1");
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("applies the identity caller-IP limiter and returns identity only", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
    const identityCaller = rateLimiter();
    const identityDestination = rateLimiter();
    setCloudflareBindings({ identityCaller, identityDestination });
    mocks.fetchSourceIdentity.mockResolvedValue({
      display_name: "Kopi Taman Senja",
      description: "Kedai kopi",
      canonical_url: "https://kopi.example/",
      icon_data_url: "data:image/png;base64,AQ==",
      source_type: "website",
      confidence: true,
    });

    const response = await identityGET(
      new Request(
        "https://nuave.test/api/audit/identity?source=https%3A%2F%2Fkopi.example%2F",
        { headers: { "CF-Connecting-IP": "203.0.113.8" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      display_name: "Kopi Taman Senja",
      description: "Kedai kopi",
      canonical_url: "https://kopi.example/",
      icon_data_url: "data:image/png;base64,AQ==",
      source_type: "website",
      confidence: true,
      preparation_mode: "live",
    });
    expect(identityCaller.limit).toHaveBeenCalledWith({ key: "203.0.113.8" });
    expect(mocks.fetchSourceIdentity).toHaveBeenCalledTimes(1);
    // Live mode asserts the stage credentials before the fetch.
    expect(mocks.assertConfigured).toHaveBeenCalledTimes(1);
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("maps an HTTP source failure to the customer-safe identity error", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
    setCloudflareBindings({
      identityCaller: rateLimiter(),
      identityDestination: rateLimiter(),
    });
    mocks.fetchSourceIdentity.mockRejectedValue(
      new SafeSourceFetchError("HTTP_ERROR", "403 Forbidden"),
    );

    const response = await identityGET(
      new Request(
        "https://nuave.test/api/audit/identity?source=https%3A%2F%2Fkopi.example%2F",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error:
        "Kami tidak dapat membaca sumber publik ini. Periksa URL dan coba lagi.",
      code: "SOURCE_UNAVAILABLE",
    });
    expect(JSON.stringify(body)).not.toContain("403 Forbidden");
  });

  it("stops identity before source work when its caller-IP limiter refuses", async () => {
    const identityCaller = rateLimiter(false);
    setCloudflareBindings({
      identityCaller,
      identityDestination: rateLimiter(),
    });

    const response = await identityGET(
      new Request(
        "https://nuave.test/api/audit/identity?source=https%3A%2F%2Fkopi.example%2F",
        { headers: { "CF-Connecting-IP": "203.0.113.9" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toMatchObject({ code: "RATE_LIMITED" });
    expect(String(body.error)).not.toContain("internal");
    expect(mocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });

  it("rejects unsupported identity sources before any identity fetch", async () => {
    setCloudflareBindings({
      identityCaller: rateLimiter(),
      identityDestination: rateLimiter(),
    });

    const response = await identityGET(
      new Request(
        "https://nuave.test/api/audit/identity?source=ftp%3A%2F%2Fkopi.example",
        { headers: { "CF-Connecting-IP": "203.0.113.10" } },
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });

  it("applies the extraction caller-IP limiter before request/provider work", async () => {
    const extractCaller = rateLimiter();
    setCloudflareBindings({ extractCaller });

    const response = await extractPOST(
      new Request("https://nuave.test/api/audit/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "198.51.100.12",
        },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(extractCaller.limit).toHaveBeenCalledWith({ key: "198.51.100.12" });
    expect(mocks.assertConfigured).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("also limits the extraction budget bootstrap by caller IP", async () => {
    const extractCaller = rateLimiter();
    setCloudflareBindings({ extractCaller });

    const response = await extractGET(
      new Request("https://nuave.test/api/audit/extract", {
        headers: { "CF-Connecting-IP": "198.51.100.14" },
      }),
    );

    expect(response.status).toBe(200);
    expect(extractCaller.limit).toHaveBeenCalledWith({ key: "198.51.100.14" });
  });

  it("returns a plain Indonesian error when extraction caller limit refuses", async () => {
    const extractCaller = rateLimiter(false);
    setCloudflareBindings({ extractCaller });

    const response = await extractPOST(
      new Request("https://nuave.test/api/audit/extract", {
        method: "POST",
        headers: { "CF-Connecting-IP": "198.51.100.13" },
        body: "not inspected",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toMatchObject({ code: "RATE_LIMITED" });
    expect(String(body.error)).not.toContain("not inspected");
    expect(mocks.assertConfigured).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("returns unavailable protection when the caller limiter throws in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const identityCaller = {
      limit: vi.fn().mockRejectedValue(new Error("binding unavailable")),
    };
    setCloudflareBindings({
      identityCaller,
      identityDestination: rateLimiter(),
    });

    const response = await identityGET(
      new Request(
        "https://nuave.test/api/audit/identity?source=https%3A%2F%2Fkopi.example%2F",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" });
    expect(mocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });

  it("returns unavailable protection when the extraction caller limiter throws in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const extractCaller = {
      limit: vi.fn().mockRejectedValue(new Error("binding unavailable")),
    };
    setCloudflareBindings({ extractCaller });

    const response = await extractPOST(
      new Request("https://nuave.test/api/audit/extract", {
        method: "POST",
        headers: { "CF-Connecting-IP": "198.51.100.15" },
        body: "not inspected",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" });
    expect(mocks.assertConfigured).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("fails closed in production when an identity binding is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const identityCaller = rateLimiter();
    setCloudflareBindings({ identityCaller });

    const response = await identityGET(
      new Request(
        "https://nuave.test/api/audit/identity?source=https%3A%2F%2Fkopi.example%2F",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" });
    expect(identityCaller.limit).not.toHaveBeenCalled();
    expect(mocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });

  it("fails closed in production when the extraction caller binding is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    setCloudflareBindings({});

    const response = await extractPOST(
      new Request("https://nuave.test/api/audit/extract", {
        method: "POST",
        body: "not inspected",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" });
    expect(mocks.assertConfigured).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("fails closed in production when the Worker request context is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.getCloudflareContext.mockImplementation(() => {
      throw new Error("request context unavailable");
    });

    const response = await identityGET(
      new Request(
        "https://nuave.test/api/audit/identity?source=https%3A%2F%2Fkopi.example%2F",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "Perlindungan akses sedang tidak tersedia. Coba lagi nanti.",
      code: "RATE_LIMIT_UNAVAILABLE",
    });
    expect(mocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });
});

describe("Spec 010 R-03 paid-stage caller limiters", () => {
  beforeEach(() => {
    mocks.getCloudflareContext.mockReset();
    mocks.fetchSourceIdentity.mockReset();
    mocks.assertConfigured.mockReset();
    mocks.extract.mockReset();
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "1");
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function jsonPost(path: string, body: unknown, ip: string) {
    return new Request(`https://nuave.test${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": ip,
      },
      body: JSON.stringify(body),
    });
  }

  it("limits glm-questions by caller IP with the Indonesian message", async () => {
    const glmCaller = rateLimiter(false);
    setCloudflareBindings({ glmCaller });

    const response = await glmQuestionsPOST(
      jsonPost(
        "/api/audit/glm-questions",
        { method: "direct-ten" },
        "203.0.113.60",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: "Terlalu banyak permintaan, coba lagi dalam beberapa menit.",
      code: "RATE_LIMITED",
    });
    expect(glmCaller.limit).toHaveBeenCalledWith({ key: "203.0.113.60" });
  });

  it("limits run by caller IP before any provider work", async () => {
    const runCaller = rateLimiter(false);
    setCloudflareBindings({ runCaller });

    const response = await runPOST(
      jsonPost(
        "/api/audit/run",
        { question_method: "direct-ten" },
        "203.0.113.61",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: "Terlalu banyak permintaan, coba lagi dalam beberapa menit.",
      code: "RATE_LIMITED",
    });
    expect(runCaller.limit).toHaveBeenCalledWith({ key: "203.0.113.61" });
  });

  it("limits report by caller IP before any provider work", async () => {
    const reportCaller = rateLimiter(false);
    setCloudflareBindings({ reportCaller });

    const response = await reportPOST(
      jsonPost(
        "/api/audit/report",
        { question_method: "direct-ten" },
        "203.0.113.62",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: "Terlalu banyak permintaan, coba lagi dalam beberapa menit.",
      code: "RATE_LIMITED",
    });
    expect(reportCaller.limit).toHaveBeenCalledWith({ key: "203.0.113.62" });
  });

  it("method rejection precedes the limiter — a legacy method never consumes quota", async () => {
    const runCaller = rateLimiter(false);
    setCloudflareBindings({ runCaller });

    const response = await runPOST(
      jsonPost(
        "/api/audit/run",
        { question_method: "canonical" },
        "203.0.113.63",
      ),
    );

    expect(response.status).toBe(400);
    expect(runCaller.limit).not.toHaveBeenCalled();
  });

  it.each([
    ["glm-questions", { method: "direct-ten" }, "glmCaller"],
    ["run", { question_method: "direct-ten" }, "runCaller"],
    ["report", { question_method: "direct-ten" }, "reportCaller"],
  ] as const)(
    "fails closed with 503 when the %s binding is missing",
    async (path, body, bindingName) => {
      setCloudflareBindings({});

      const response = await {
        "glm-questions": glmQuestionsPOST,
        run: runPOST,
        report: reportPOST,
      }[path](jsonPost(`/api/audit/${path}`, body, "203.0.113.64"));

      expect(response.status).toBe(503);
      const payload = await response.json();
      expect(payload).toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" });
      void bindingName;
    },
  );

  it("fails closed with 503 in production when the Worker context is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.getCloudflareContext.mockImplementation(() => {
      throw new Error("request context unavailable");
    });

    const response = await runPOST(
      jsonPost(
        "/api/audit/run",
        { question_method: "direct-ten" },
        "203.0.113.65",
      ),
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" });
  });

  it("is a no-op outside production when no Worker context exists", async () => {
    mocks.getCloudflareContext.mockImplementation(() => {
      throw new Error("request context unavailable");
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    // The request reaches the route's own validation — the limiter did not
    // interfere and no provider fetch happened.
    const response = await glmQuestionsPOST(
      jsonPost("/api/audit/glm-questions", { method: "direct-ten" }, ""),
    );

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
