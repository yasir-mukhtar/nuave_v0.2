import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUDIT_COST_LIMIT_USD,
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
} from "./types";

/**
 * Spec 009 continuous-flow correction: the founder-local reading phase no
 * longer names its transport. `local_mode=auto` lets the SERVER pick —
 * the real source fetch / extraction only under the explicit live
 * authorization, the labeled substitute otherwise. `local_mode=synthetic`
 * pins the substitute even when authorized. Anything else fails closed.
 * All provider/source-fetch functions are mocked — zero network, zero
 * credentials, zero provider calls in this file.
 */

const providerMocks = vi.hoisted(() => ({
  assertLiveProviderCredentialsConfigured: vi.fn(),
  liveExtractBusinessDraft: vi.fn(),
}));

vi.mock("@/lib/audit/provider", () => providerMocks);

const sourceMocks = vi.hoisted(() => ({
  fetchSourceIdentity: vi.fn(),
}));

vi.mock("@/lib/audit/source-identity", () => sourceMocks);

import { GET as identityGET } from "../../app/api/audit/identity/route";
import { POST as extractPOST } from "../../app/api/audit/extract/route";

const SOURCE = "https://batiklaras.example";

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

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NUAVE_GLM_LOCAL_EXPERIMENT = "1";
  delete process.env.NUAVE_AUDIT_LIVE_AUTHORIZED;
  sourceMocks.fetchSourceIdentity.mockResolvedValue(liveIdentity());
  providerMocks.liveExtractBusinessDraft.mockResolvedValue(liveDraft());
});

describe("GET /api/audit/identity local_mode dispatch", () => {
  it("auto without live authorization serves the labeled substitute", async () => {
    const response = await identityGET(identityRequest("auto"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("synthetic-local");
    expect(data.substitute).toBe(SYNTHETIC_LOCAL_FIXTURE_SYSTEM);
    expect(data.confidence).toBe(false);
    expect(sourceMocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });

  it("auto with live authorization fetches the real source once", async () => {
    process.env.NUAVE_AUDIT_LIVE_AUTHORIZED = "1";
    const response = await identityGET(identityRequest("auto"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("live");
    expect(data.display_name).toBe("Batik Laras Official");
    expect(sourceMocks.fetchSourceIdentity).toHaveBeenCalledTimes(1);
  });

  it("synthetic pins the substitute even when live is authorized", async () => {
    process.env.NUAVE_AUDIT_LIVE_AUTHORIZED = "1";
    const response = await identityGET(identityRequest("synthetic"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("synthetic-local");
    expect(sourceMocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });

  it("unknown mode and missing flag fail closed before any fetch", async () => {
    const bad = await identityGET(identityRequest("bogus"));
    expect(bad.status).toBe(404);
    delete process.env.NUAVE_GLM_LOCAL_EXPERIMENT;
    const noFlag = await identityGET(identityRequest("auto"));
    expect(noFlag.status).toBe(404);
    expect(sourceMocks.fetchSourceIdentity).not.toHaveBeenCalled();
  });
});

describe("POST /api/audit/extract local_mode dispatch", () => {
  it("auto without live authorization returns the labeled substitute draft", async () => {
    const response = await extractPOST(extractRequest("auto"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("synthetic-local");
    expect(data.returned_model).toBe(SYNTHETIC_LOCAL_FIXTURE_SYSTEM);
    expect(data.draft.verified_offerings).toHaveLength(0);
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

  it("auto with live authorization runs the real extraction once", async () => {
    process.env.NUAVE_AUDIT_LIVE_AUTHORIZED = "1";
    const response = await extractPOST(extractRequest("auto"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("live");
    expect(data.draft.category).toBe("Batik tulis");
    expect(data.draft.verified_offerings).toContain("Kain batik tulis");
    expect(data.telemetry).toHaveLength(1);
    expect(data.telemetry[0].requested_model).toBe("gpt-5.6-luna");
    expect(providerMocks.liveExtractBusinessDraft).toHaveBeenCalledTimes(1);
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).toHaveBeenCalled();
  });

  it("synthetic pins the substitute even when live is authorized", async () => {
    process.env.NUAVE_AUDIT_LIVE_AUTHORIZED = "1";
    const response = await extractPOST(extractRequest("synthetic"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBe("synthetic-local");
    expect(providerMocks.liveExtractBusinessDraft).not.toHaveBeenCalled();
  });

  it("auto + authorized + missing credentials stops, never falls back", async () => {
    process.env.NUAVE_AUDIT_LIVE_AUTHORIZED = "1";
    providerMocks.assertLiveProviderCredentialsConfigured.mockImplementation(
      () => {
        throw new Error("OPENCODEGO_API_KEY is not configured");
      },
    );
    const response = await extractPOST(extractRequest("auto"));
    expect(response.status).not.toBe(200);
    const data = await response.json();
    expect(data.preparation_mode).toBeUndefined();
    expect(providerMocks.liveExtractBusinessDraft).not.toHaveBeenCalled();
  });

  it("unknown mode and missing flag fail closed before any provider work", async () => {
    const bad = await extractPOST(extractRequest("bogus"));
    expect(bad.status).toBe(404);
    delete process.env.NUAVE_GLM_LOCAL_EXPERIMENT;
    const noFlag = await extractPOST(extractRequest("auto"));
    expect(noFlag.status).toBe(404);
    expect(providerMocks.liveExtractBusinessDraft).not.toHaveBeenCalled();
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).not.toHaveBeenCalled();
  });
});
