import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "./client-contract";
import { AuditRunEventParser } from "./stream";
import {
  AUDIT_COST_LIMIT_USD,
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditPrompt,
  type BusinessBrief,
} from "./types";

const providerMocks = vi.hoisted(() => ({
  assertLiveProviderCredentialsConfigured: vi.fn(),
  liveExecuteAuditPrompt: vi.fn(),
  liveGenerateReportContent: vi.fn(),
  isLiveProviderCall: vi.fn(() => false),
}));

vi.mock("@/lib/audit/provider", () => providerMocks);

import { POST as runPOST } from "../../app/api/audit/run/route";
import { POST as reportPOST } from "../../app/api/audit/report/route";

const DIRECT_TEN_IDS = Array.from(
  { length: 10 },
  (_, index) => `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
);

function brief(): BusinessBrief {
  return {
    brand_name: "Kopi Nuave",
    entity_scope: "Jakarta",
    brand_type: "coffee shop",
    category: "coffee shop",
    market_context: "Jakarta",
    target_customer: "coffee drinkers",
    official_sources: ["https://kopinuave.example/"],
    verified_offerings: ["coffee"],
    verified_customer_needs: ["find coffee"],
    verified_decision_criteria: ["location"],
    verified_competitor: {
      name: "Kedai Lain",
      scope: "Jakarta",
      source_url: "https://kedailain.example/",
    },
    similar_businesses: [],
    brand_name_variants: ["Nuave Coffee"],
    priority_offering: "coffee",
    conversion_action: "visit the shop",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  };
}

function wirePrompts() {
  return DIRECT_TEN_IDS.map((prompt_id, index) => ({
    prompt_id,
    question: `Apa pilihan coffee shop di Jakarta untuk kebutuhan ${index + 1}?`,
    review_status: "needs_human_review" as const,
  }));
}

function syntheticCall(promptId: string): AuditCallTelemetry {
  const at = "2026-09-18T00:00:00.000Z";
  return {
    stage: "observation",
    attempt: 1,
    status: "completed",
    started_at: at,
    completed_at: at,
    latency_ms: 0,
    requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    response_id: `synthetic-local-${promptId}`,
    service_tier: "none",
    usage: {
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
    },
    web_search_calls: 0,
    accounted_cost_usd: 0,
    cost_basis: "provider_usage",
    pricing_version: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    failure_reason: "",
    provider_status: "synthetic",
    incomplete_reason: "",
    output_text_present: true,
    refusal_present: false,
  };
}

function syntheticObservation(prompt: {
  prompt_id: string;
  question: string;
}): AuditObservation {
  return {
    prompt_id: prompt.prompt_id,
    category: "unassigned",
    branded: false,
    question: prompt.question,
    system: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    response_id: `synthetic-local-${prompt.prompt_id}`,
    observed_at: "2026-09-18T00:00:00.000Z",
    raw_answer:
      "[SINTETIS] Jawaban contoh untuk pengujian alur lokal; bukan respons model.",
    sources: [],
    run_status: "completed",
    failure_reason: "",
    telemetry: [syntheticCall(prompt.prompt_id)],
  };
}

const RUN_BODY = () => ({
  client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
  question_method: "direct-ten",
  brief: brief(),
  prompts: wirePrompts(),
  safety_identifier: "local-direct-ten-fixture",
  budget: { limit_usd: AUDIT_COST_LIMIT_USD, carryover_cost_usd: 0, calls: [] },
  resume_observations: [],
});

describe("POST /api/audit/run direct-ten local substitutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NUAVE_GLM_LOCAL_EXPERIMENT = "1";
    delete process.env.NUAVE_AUDIT_LIVE_AUTHORIZED;
  });

  it("runs the real boundary with the labeled substitute — zero credentials or live calls", async () => {
    const response = await runPOST(
      new Request("https://nuave.test/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RUN_BODY()),
      }),
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    const parser = new AuditRunEventParser();
    const events = parser.push(text);
    const completed = events.find((event) => event.type === "run_completed");
    expect(completed?.type).toBe("run_completed");
    const observations =
      completed?.type === "run_completed" ? completed.observations : [];
    expect(observations).toHaveLength(10);
    expect(
      observations.every(
        (observation) => observation.system === SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
      ),
    ).toBe(true);
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).not.toHaveBeenCalled();
    expect(providerMocks.liveExecuteAuditPrompt).not.toHaveBeenCalled();
  });

  it("still 404s when the local experiment flag is off — zero calls", async () => {
    delete process.env.NUAVE_GLM_LOCAL_EXPERIMENT;
    const response = await runPOST(
      new Request("https://nuave.test/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RUN_BODY()),
      }),
    );
    expect(response.status).toBe(404);
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).not.toHaveBeenCalled();
    expect(providerMocks.liveExecuteAuditPrompt).not.toHaveBeenCalled();
  });
});

describe("POST /api/audit/report direct-ten local substitutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NUAVE_GLM_LOCAL_EXPERIMENT = "1";
    delete process.env.NUAVE_AUDIT_LIVE_AUTHORIZED;
  });

  it("synthesizes through the real pipeline with the labeled substitute", async () => {
    const prompts = wirePrompts();
    const observations = prompts.map((prompt) =>
      syntheticObservation(prompt as AuditPrompt),
    );
    const response = await reportPOST(
      new Request("https://nuave.test/api/audit/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
          question_method: "direct-ten",
          brief: brief(),
          prompts,
          observations,
          safety_identifier: "local-direct-ten-fixture",
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: 0,
            calls: observations.flatMap((o) => o.telemetry),
          },
        }),
      }),
    );
    const payload = (await response.json()) as {
      report?: {
        provenance: { question_method?: string; system_label?: string };
        measures: { recommendation: { recommended: number; assessed: number } };
      };
      error?: string;
    };
    expect(response.status).toBe(200);
    expect(payload.report?.provenance.question_method).toBe("direct-ten");
    // Ten completed synthetic answers, no real judgment — honestly 0/10.
    expect(payload.report?.measures.recommendation).toEqual({
      recommended: 0,
      assessed: 10,
    });
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).not.toHaveBeenCalled();
    expect(providerMocks.liveGenerateReportContent).not.toHaveBeenCalled();
  });

  it("still 404s when the local experiment flag is off — zero calls", async () => {
    delete process.env.NUAVE_GLM_LOCAL_EXPERIMENT;
    const response = await reportPOST(
      new Request("https://nuave.test/api/audit/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
          question_method: "direct-ten",
          brief: brief(),
          prompts: wirePrompts(),
          observations: [],
          safety_identifier: "local-direct-ten-fixture",
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: 0,
            calls: [],
          },
        }),
      }),
    );
    expect(response.status).toBe(404);
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).not.toHaveBeenCalled();
    expect(providerMocks.liveGenerateReportContent).not.toHaveBeenCalled();
  });
});

describe("POST /api/audit/run resume evidence gates (Spec 009 resume fix)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NUAVE_GLM_LOCAL_EXPERIMENT = "1";
    delete process.env.NUAVE_AUDIT_LIVE_AUTHORIZED;
  });

  function runRequest(resumeObservations: AuditObservation[]) {
    return runPOST(
      new Request("https://nuave.test/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...RUN_BODY(),
          resume_observations: resumeObservations,
        }),
      }),
    );
  }

  it("substitute mode resumes labeled synthetic observations and runs the rest", async () => {
    const prompts = wirePrompts();
    const resumed = prompts
      .slice(0, 3)
      .map((prompt) => syntheticObservation(prompt as AuditPrompt));
    const response = await runRequest(resumed);
    expect(response.status).toBe(200);
    const text = await response.text();
    const events = new AuditRunEventParser().push(text);
    const completed = events.find((event) => event.type === "run_completed");
    expect(completed?.type).toBe("run_completed");
    const observations =
      completed?.type === "run_completed" ? completed.observations : [];
    expect(observations).toHaveLength(10);
    // The three resumed observations are echoed, not re-executed.
    expect(
      observations.slice(0, 3).map((observation) => observation.response_id),
    ).toEqual(resumed.map((observation) => observation.response_id));
    expect(providerMocks.liveExecuteAuditPrompt).not.toHaveBeenCalled();
  });

  it("substitute mode rejects resume observations claiming another system", async () => {
    const prompts = wirePrompts();
    const foreign = {
      ...syntheticObservation(prompts[0] as AuditPrompt),
      system: "OpenCode Go Responses API" as const,
      requested_model: "gpt-5.6-luna",
      returned_model: "gpt-5.6-luna",
    };
    const response = await runRequest([foreign]);
    expect(response.status).toBe(422);
    expect(providerMocks.liveExecuteAuditPrompt).not.toHaveBeenCalled();
  });

  it("flag off 404s even with a resume payload — zero provider work", async () => {
    delete process.env.NUAVE_GLM_LOCAL_EXPERIMENT;
    const prompts = wirePrompts();
    const response = await runRequest([
      syntheticObservation(prompts[0] as AuditPrompt),
    ]);
    expect(response.status).toBe(404);
  });
});
