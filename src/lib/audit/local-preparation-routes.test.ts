import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUDIT_COST_LIMIT_USD,
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
} from "./types";

/**
 * Spec 010 preparation routes: NUAVE_NEW_AUDIT_ENABLED gates identity and
 * extract (404 before anything else), and the server-selected
 * NUAVE_AUDIT_MODE picks the execution path — "synthetic" serves the labeled
 * substitutes, "live" runs the real fetch/extraction and requires the
 * provider credentials plus CHEAPERINFERENCE_API_KEY, stopping with a stage
 * error when any is missing. A legacy `local_mode` request parameter can no
 * longer change the mode. All provider/source-fetch functions are mocked —
 * zero network, zero credentials, zero provider calls in this file.
 */

const providerMocks = vi.hoisted(() => ({
  liveAuditProvider: vi.fn(() => "openai"),
  assertLiveProviderCredentialsConfigured: vi.fn(),
  liveExtractBusinessDraft: vi.fn(),
}));

vi.mock("@/lib/audit/provider", () => providerMocks);
vi.mock("@/lib/audit/source-excerpt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./source-excerpt")>()),
  fetchWebsiteExcerpt: vi.fn(async () => null),
}));

const sourceMocks = vi.hoisted(() => ({
  fetchSourceIdentity: vi.fn(),
}));

vi.mock("@/lib/audit/source-identity", () => sourceMocks);

import { GET as identityGET } from "../../app/api/audit/identity/route";
import { POST as questionsPOST } from "../../app/api/audit/glm-questions/route";
import * as gates from "./deployment-gate";
import * as limiter from "./rate-limit";
import * as questions from "../intake/glm-local";
import { fetchWebsiteExcerpt } from "./source-excerpt";
import {
  GET as extractGET,
  POST as extractPOST,
} from "../../app/api/audit/extract/route";

const SOURCE = "https://batiklaras.example";

describe("PR121 question-only fixed preflights and ordering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    providerMocks.assertLiveProviderCredentialsConfigured.mockReset();
    vi.unstubAllGlobals();
  });
  it.each([
    ["switch", 404, "AUDIT_DISABLED", "Audit tidak tersedia saat ini."],
    [
      "method",
      400,
      "INVALID_METHOD",
      "Permintaan pembuatan pertanyaan tidak valid.",
    ],
    [
      "limited",
      429,
      "RATE_LIMITED",
      "Terlalu banyak permintaan, coba lagi dalam beberapa menit.",
    ],
    [
      "limit_unavailable",
      503,
      "RATE_LIMIT_UNAVAILABLE",
      "Perlindungan akses sedang tidak tersedia. Coba lagi nanti.",
    ],
    [
      "credentials",
      503,
      "LIVE_CREDENTIALS_MISSING",
      "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
    ],
    [
      "stale",
      409,
      "STALE_INTAKE",
      "Versi konfirmasi bisnis ini sudah lama. Mulai audit baru.",
    ],
    [
      "missing",
      400,
      "INVALID_INTAKE",
      "Konfirmasi bisnis belum dapat digunakan. Kembali ke ringkasan dan periksa pilihan Anda.",
    ],
  ] as const)(
    "reconstructs %s without forwarding helper prose",
    async (kind, status, code, message) => {
      const hostile = () =>
        Response.json(
          {
            error: "MOCK_ONLY_GATE_PROSE",
            detail: "MOCK_ONLY_DETAIL",
            arbitrary: "MOCK_ONLY_EXTRA",
            code: "MOCK_ONLY_UNKNOWN",
          },
          { status },
        );
      const switched = vi
        .spyOn(gates, "auditSwitchResponse")
        .mockReturnValue(
          kind === "switch"
            ? (hostile() as ReturnType<typeof gates.auditSwitchResponse>)
            : null,
        );
      const rate = vi
        .spyOn(limiter, "enforceAuditCallerRateLimit")
        .mockResolvedValue(
          kind === "limited" || kind === "limit_unavailable"
            ? (hostile() as Awaited<
                ReturnType<typeof limiter.enforceAuditCallerRateLimit>
              >)
            : null,
        );
      const credentials = vi
        .spyOn(gates, "auditLiveCredentialsResponse")
        .mockReturnValue(
          kind === "credentials"
            ? (hostile() as ReturnType<
                typeof gates.auditLiveCredentialsResponse
              >)
            : null,
        );
      const adapter = vi.spyOn(questions, "prepareGlmQuestionsForIntake");
      const fetchSpy = vi.fn(() => {
        throw new Error("MOCK_ONLY_NETWORK_FORBIDDEN");
      });
      vi.stubGlobal("fetch", fetchSpy);
      const request = new Request(
        "https://nuave.test/api/audit/glm-questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: kind === "method" ? "MOCK_ONLY_METHOD" : "direct-ten",
            ...(kind === "stale"
              ? { intake: { version: "MOCK_ONLY_STALE" } }
              : {}),
          }),
        },
      );
      const json = vi.spyOn(request, "json");
      const response = await questionsPOST(request);
      expect(response.status).toBe(status);
      const text = await response.text();
      expect(text).not.toContain("MOCK_ONLY");
      expect(JSON.parse(text)).toEqual(
        kind === "limited" || kind === "limit_unavailable"
          ? { error: message, code }
          : {
              status:
                kind === "method" || kind === "stale" || kind === "missing"
                  ? "invalid_request"
                  : "failed",
              code,
              error: message,
              providerContact: "none",
            },
      );
      expect(switched).toHaveBeenCalledTimes(1);
      expect(json).toHaveBeenCalledTimes(kind === "switch" ? 0 : 1);
      expect(rate).toHaveBeenCalledTimes(
        kind === "switch" || kind === "method" ? 0 : 1,
      );
      expect(credentials).toHaveBeenCalledTimes(
        kind === "switch" ||
          kind === "method" ||
          kind === "limited" ||
          kind === "limit_unavailable"
          ? 0
          : 1,
      );
      if (credentials.mock.calls.length)
        expect(rate.mock.invocationCallOrder[0]).toBeLessThan(
          credentials.mock.invocationCallOrder[0]!,
        );
      expect(adapter).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );
});

function liveIdentity() {
  return {
    display_name: "Batik Laras Official",
    description: "real fetched description",
    canonical_url: "https://batiklaras.example/",
    icon_data_url: null,
    source_type: "website",
    confidence: true,
  };
}

function liveCall(): AuditCallTelemetry {
  const at = "2026-09-19T00:00:00.000Z";
  return {
    stage: "extract",
    attempt: 1,
    status: "completed",
    started_at: at,
    completed_at: at,
    latency_ms: 1200,
    requested_model: "gpt-5.6-luna",
    returned_model: "gpt-5.6-luna",
    response_id: "live-extract-1",
    service_tier: "default",
    usage: {
      input_tokens: 3000,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 800,
      reasoning_output_tokens: 0,
      total_tokens: 3800,
    },
    web_search_calls: 0,
    accounted_cost_usd: 0.002,
    cost_basis: "provider_usage",
    pricing_version: "luna-2026-08",
    failure_reason: "",
    provider_status: "completed",
    incomplete_reason: "",
    output_text_present: true,
    refusal_present: false,
  };
}

function liveDraft() {
  return {
    draft: {
      brand_name: "Batik Laras",
      entity_scope: "",
      brand_type: "",
      category: "Batik tulis",
      market_context: "",
      target_customer: "",
      official_sources: ["https://batiklaras.example/"],
      verified_offerings: ["Kain batik tulis"],
      verified_customer_needs: [],
      verified_decision_criteria: [],
      published_locations: [
        {
          name: "Galeri Batik Laras",
          address: "Jl. Fiksi Batik No. 3, Pekalongan",
          source_url: "https://batiklaras.example/lokasi",
        },
      ],
      category_suggestions: ["batik tulis", "galeri batik"],
      offering_category_suggestions: [
        { offering: "Kain batik tulis", category: "kain tradisional" },
      ],
      similar_businesses: [],
      brand_name_variants: [],
      priority_offering: "",
      conversion_action: "",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "",
      regulated_category_notes: "",
      evidence: [],
      warnings: [],
    },
    returned_model: "gpt-5.6-luna",
    response_id: "live-extract-1",
    telemetry: [liveCall()],
  };
}

function extractBody(localMode?: string) {
  return {
    website_url: SOURCE,
    brand_name: "Batik Laras",
    market_context: "",
    category: "",
    identity_unverified: true,
    safety_identifier: "local-test-preparation",
    budget: {
      limit_usd: AUDIT_COST_LIMIT_USD,
      carryover_cost_usd: 0,
      calls: [],
    },
    ...(localMode !== undefined ? { local_mode: localMode } : {}),
  };
}

function extractRequest(localMode?: string) {
  return new Request("https://nuave.test/api/audit/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(extractBody(localMode)),
  });
}

function identityRequest(localMode?: string) {
  const suffix = localMode !== undefined ? `&local_mode=${localMode}` : "";
  return new Request(
    `https://nuave.test/api/audit/identity?source=${encodeURIComponent(SOURCE)}${suffix}`,
  );
}

function liveMode() {
  vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  vi.stubEnv("CHEAPERINFERENCE_API_KEY", "test-key");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "1");
  vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
  vi.stubEnv("CHEAPERINFERENCE_API_KEY", "");
  sourceMocks.fetchSourceIdentity.mockResolvedValue(liveIdentity());
  providerMocks.liveExtractBusinessDraft.mockResolvedValue(liveDraft());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/audit/identity server-selected mode", () => {
  it("switch off answers 404 before any fetch", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "");
    const response = await identityGET(identityRequest());
    expect(response.status).toBe(404);
    expect(sourceMocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });

  it("synthetic mode serves the labeled substitute", async () => {
    const response = await identityGET(identityRequest());
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("synthetic-local");
    expect(data.substitute).toBe(SYNTHETIC_LOCAL_FIXTURE_SYSTEM);
    expect(data.confidence).toBe(false);
    expect(sourceMocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });

  it("live mode fetches the real source once", async () => {
    liveMode();
    const response = await identityGET(identityRequest());
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("live");
    expect(data.display_name).toBe("Batik Laras Official");
    expect(sourceMocks.fetchSourceIdentity).toHaveBeenCalledTimes(1);
  });

  it("a local_mode parameter cannot change the server-selected mode", async () => {
    liveMode();
    // Legacy "synthetic" request parameter is ignored — the server mode wins.
    const response = await identityGET(identityRequest("synthetic"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("live");
    expect(sourceMocks.fetchSourceIdentity).toHaveBeenCalledTimes(1);
  });

  it("live mode with a missing credential stops the stage — no fetch", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "");
    const response = await identityGET(identityRequest());
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.code).toBe("LIVE_CREDENTIALS_MISSING");
    expect(String(data.error)).toContain("identity");
    expect(sourceMocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });
});

describe("POST /api/audit/extract server-selected mode", () => {
  it("switch off answers 404 before body parsing or provider work", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "");
    const response = await extractPOST(extractRequest());
    expect(response.status).toBe(404);
    expect(providerMocks.liveExtractBusinessDraft).not.toHaveBeenCalled();
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).not.toHaveBeenCalled();
  });

  it("switch off answers 404 on the budget read as well", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "");
    const response = await extractGET(
      new Request("https://nuave.test/api/audit/extract"),
    );
    expect(response.status).toBe(404);
  });

  it("synthetic mode returns the labeled substitute draft", async () => {
    const response = await extractPOST(extractRequest());
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("synthetic-local");
    expect(data.returned_model).toBe(SYNTHETIC_LOCAL_FIXTURE_SYSTEM);
    expect(data.draft.verified_offerings).toHaveLength(0);
    // Spec 013 J3/R-24: the labeled substitute never invents the new fields.
    expect(data.draft.published_locations).toEqual([]);
    expect(data.draft.category_suggestions).toEqual([]);
    expect(data.draft.offering_category_suggestions).toEqual([]);
    expect(data.warnings?.length ?? data.draft.warnings.length).toBeGreaterThan(
      0,
    );
    expect(data.telemetry).toHaveLength(1);
    expect(data.telemetry[0].requested_model).toBe(
      SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    );
    expect(providerMocks.liveExtractBusinessDraft).not.toHaveBeenCalled();
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).not.toHaveBeenCalled();
  });

  it("a legacy local_mode field cannot pin the substitute in live mode", async () => {
    liveMode();
    const response = await extractPOST(extractRequest("synthetic"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("live");
    expect(providerMocks.liveExtractBusinessDraft).toHaveBeenCalledTimes(1);
  });

  it("live mode runs the real extraction once", async () => {
    liveMode();
    const response = await extractPOST(extractRequest());
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("live");
    expect(data.draft.category).toBe("Batik tulis");
    expect(data.draft.verified_offerings).toContain("Kain batik tulis");
    // Spec 013 J3/R-24 additions pass through the live boundary unchanged.
    expect(data.draft.published_locations).toEqual([
      {
        name: "Galeri Batik Laras",
        address: "Jl. Fiksi Batik No. 3, Pekalongan",
        source_url: "https://batiklaras.example/lokasi",
      },
    ]);
    expect(data.draft.category_suggestions).toEqual([
      "batik tulis",
      "galeri batik",
    ]);
    expect(data.draft.offering_category_suggestions).toEqual([
      { offering: "Kain batik tulis", category: "kain tradisional" },
    ]);
    expect(data.telemetry).toHaveLength(1);
    expect(data.telemetry[0].requested_model).toBe("gpt-5.6-luna");
    expect(providerMocks.liveExtractBusinessDraft).toHaveBeenCalledTimes(1);
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).toHaveBeenCalled();
  });

  it.each(["gemini", "groq", "openrouter"])(
    "testing-only %s does not claim to consume an excerpt",
    async (provider) => {
      liveMode();
      providerMocks.liveAuditProvider.mockReturnValueOnce(provider);
      const response = await extractPOST(extractRequest());
      expect(response.status).toBe(200);
      expect((await response.json()).source_excerpt_status).toBe(
        "not-attempted",
      );
      expect(fetchWebsiteExcerpt).not.toHaveBeenCalled();
      expect(
        providerMocks.liveExtractBusinessDraft.mock.calls[0][0],
      ).not.toHaveProperty("public_source_data");
    },
  );

  it("live mode + missing credentials stops, never falls back", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "");
    const response = await extractPOST(extractRequest());
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.preparation_mode).toBeUndefined();
    expect(String(data.error)).toContain("extraction");
    expect(providerMocks.liveExtractBusinessDraft).not.toHaveBeenCalled();
  });

  it("live mode + missing provider credential stops naming the stage", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "test-key");
    providerMocks.assertLiveProviderCredentialsConfigured.mockImplementation(
      () => {
        throw new Error("OPENCODEGO_API_KEY is not configured");
      },
    );
    const response = await extractPOST(extractRequest());
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(String(data.error)).toContain("extraction");
    expect(providerMocks.liveExtractBusinessDraft).not.toHaveBeenCalled();
  });
});
