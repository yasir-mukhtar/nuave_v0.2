import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXTRACT_CALLER_RATE_LIMITER,
  IDENTITY_CALLER_RATE_LIMITER,
  IDENTITY_DESTINATION_RATE_LIMITER,
} from "./rate-limit";

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

function rateLimiter(success = true) {
  return { limit: vi.fn(async () => ({ success })) };
}

function setCloudflareBindings(bindings: {
  identityCaller?: ReturnType<typeof rateLimiter>;
  identityDestination?: ReturnType<typeof rateLimiter>;
  extractCaller?: ReturnType<typeof rateLimiter>;
}) {
  mocks.getCloudflareContext.mockReturnValue({
    env: {
      [IDENTITY_CALLER_RATE_LIMITER]: bindings.identityCaller,
      [IDENTITY_DESTINATION_RATE_LIMITER]: bindings.identityDestination,
      [EXTRACT_CALLER_RATE_LIMITER]: bindings.extractCaller,
    },
  });
}

describe("D1 route rate limits", () => {
  beforeEach(() => {
    mocks.getCloudflareContext.mockReset();
    mocks.fetchSourceIdentity.mockReset();
    mocks.assertConfigured.mockReset();
    mocks.extract.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("applies the identity caller-IP limiter and returns identity only", async () => {
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
    });
    expect(identityCaller.limit).toHaveBeenCalledWith({ key: "203.0.113.8" });
    expect(mocks.fetchSourceIdentity).toHaveBeenCalledTimes(1);
    expect(mocks.assertConfigured).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
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
