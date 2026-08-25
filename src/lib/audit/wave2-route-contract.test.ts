import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "./client-contract";
import { fixtureCallTelemetry } from "./fixtures/telemetry";
import type { AuditObservation, BusinessBrief } from "./types";

const providerMocks = vi.hoisted(() => ({
  assertConfigured: vi.fn(),
  extract: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/lib/audit/provider", () => ({
  assertLiveProviderCredentialsConfigured: providerMocks.assertConfigured,
  liveExtractBusinessDraft: providerMocks.extract,
  liveExecuteAuditPrompt: providerMocks.execute,
  isLiveProviderCall: () => false,
}));

import { POST as extractPOST } from "../../app/api/audit/extract/route";
import { POST as promptsPOST } from "../../app/api/audit/prompts/route";
import { POST as runPOST } from "../../app/api/audit/run/route";

const WEBSITE = "https://klinikgigisehat.example";
const BRAND = "Klinik Gigi Sehat";
const questions = [
  "Di mana saya bisa menemukan klinik gigi terdekat di Depok untuk scaling?",
  "Klinik gigi mana di sekitar Margonda yang bisa menangani tambal gigi?",
  "Apa saja pilihan klinik gigi di area Margonda yang menyediakan behel dan scaling?",
  "Berapa jam buka klinik gigi di Depok dan bagaimana cara reservasinya?",
  "Bagaimana perbandingan klinik gigi di Margonda dari segi lokasi dan harga?",
  `Apakah ${BRAND} menyediakan scaling gigi di cabang Margonda?`,
  `Berapa jam operasional ${BRAND}?`,
  `Bagaimana cara reservasi di ${BRAND} melalui WhatsApp?`,
  `Apakah ${BRAND} melayani perawatan behel untuk anak?`,
  `Apa saja layanan unggulan ${BRAND} untuk tambal gigi?`,
];

const extractionDraft = {
  brand_name: BRAND,
  entity_scope: "Cabang Margonda, Kota Depok",
  brand_type: "Klinik gigi",
  category: "Klinik gigi",
  market_context: "Kota Depok, Jawa Barat, Indonesia",
  target_customer: "Warga Depok yang mencari klinik gigi terjangkau.",
  official_sources: [WEBSITE],
  verified_offerings: ["scaling gigi", "behel gigi", "tambal gigi"],
  verified_customer_needs: ["klinik gigi terdekat", "harga terjangkau"],
  verified_decision_criteria: ["lokasi", "harga", "jam buka"],
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "scaling gigi",
  conversion_action: "reservasi via WhatsApp",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "Layanan kesehatan gigi.",
  evidence: [],
  warnings: [],
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function questionProviderBody() {
  return {
    id: "resp_wave2_route_prompts",
    model: "gpt-5.6-luna",
    status: "completed",
    usage: { input_tokens: 100, output_tokens: 100, total_tokens: 200 },
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify({ questions }) }],
      },
    ],
  };
}

function stubProtectedQuestionMethod() {
  vi.stubEnv("NUAVE_PROVIDER", "opencodego");
  vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
  vi.stubEnv("OPENCODEGO_API_KEY", "offline-test-key");
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
  vi.stubEnv("OPENAI_BASE_URL", "https://opencode.ai/zen/go/v1");
  vi.stubEnv("OPENAI_AUDIT_MODEL", "gpt-5.6-luna");
  vi.stubEnv("OPENAI_AUDIT_REASONING_EFFORT", "low");
  vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "0");
}

function makeObservation(
  prompt: {
    prompt_id: string;
    category: AuditObservation["category"];
    branded: boolean;
    question: string;
  },
  index: number,
): AuditObservation {
  const responseId = `resp_wave2_route_observation_${index + 1}`;
  return {
    prompt_id: prompt.prompt_id,
    category: prompt.category,
    branded: prompt.branded,
    question: prompt.question,
    instruction_version: "neutral-response-v1",
    system: "OpenCode Go Responses API",
    requested_model: "gpt-5.6-luna",
    returned_model: "gpt-5.6-luna",
    response_id: responseId,
    observed_at: "2026-08-23T00:00:00.000Z",
    raw_answer: `${prompt.question} Jawaban offline yang dapat dievaluasi.`,
    sources: [],
    run_status: "completed",
    failure_reason: "",
    telemetry: [
      fixtureCallTelemetry({
        stage: "observation",
        response_id: responseId,
        requested_model: "gpt-5.6-luna",
        returned_model: "gpt-5.6-luna",
        web_search_calls: 1,
      }),
    ],
  };
}

describe("Wave 2 real route contract (K-09)", () => {
  beforeEach(() => {
    stubProtectedQuestionMethod();
    providerMocks.assertConfigured.mockReset();
    providerMocks.extract.mockReset();
    providerMocks.execute.mockReset();
    providerMocks.extract.mockResolvedValue({
      draft: extractionDraft,
      telemetry: [],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(questionProviderBody())),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reaches the real prompts boundary then sends its reviewed canonical pack to the accepted run route", async () => {
    const extractResponse = await extractPOST(
      new Request("http://localhost/api/audit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: WEBSITE,
          brand_name: "",
          market_context: "",
          category: "",
          safety_identifier: "wave2-route-test",
          budget: { limit_usd: 5, carryover_cost_usd: 0, calls: [] },
        }),
      }),
    );
    expect(extractResponse.status).toBe(200);
    const extracted = await extractResponse.json();
    expect(extracted.draft.brand_name).toBe(BRAND);

    const confirmedBrief: BusinessBrief = {
      ...extracted.draft,
      official_sources: [WEBSITE],
      verified_competitor: {
        name: "Klinik Gigi Lain",
        scope: "Margonda, Depok",
        source_url: "https://klinikgigilain.example",
      },
      language: "en-US",
      agency_name: "",
      agency_logo_data_url: "",
    };

    const promptsResponse = await promptsPOST(
      new Request("http://localhost/api/audit/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: confirmedBrief }),
      }),
    );
    expect(promptsResponse.status).toBe(200);
    const generated = await promptsResponse.json();
    expect(generated.pack.prompts).toHaveLength(10);
    expect(generated.pack.summary).toEqual({
      total_prompts: 10,
      unbranded_prompts: 5,
      branded_prompts: 5,
    });

    // This is the explicit review handoff: the run receives the exact pack
    // returned by /api/audit/prompts, not a seeded or reconstructed substitute.
    const reviewedPrompts = generated.pack.prompts.map(
      (prompt: Record<string, unknown>) => ({ ...prompt }),
    );
    expect(
      reviewedPrompts.map((prompt: { question: string }) => prompt.question),
    ).toEqual(
      generated.pack.prompts.map(
        (prompt: { question: string }) => prompt.question,
      ),
    );

    const budgetCallCounts: number[] = [];
    providerMocks.execute.mockImplementation(async (input) => {
      budgetCallCounts.push(input.budget.calls.length);
      return makeObservation(
        input.prompt,
        providerMocks.execute.mock.calls.length - 1,
      );
    });

    const runResponse = await runPOST(
      new Request("http://localhost/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
          brief: confirmedBrief,
          prompts: reviewedPrompts,
          safety_identifier: "wave2-route-test",
          budget: {
            limit_usd: 5,
            carryover_cost_usd: 0,
            calls: generated.telemetry,
          },
          resume_observations: [],
        }),
      }),
    );

    expect(runResponse.status).toBe(200);
    const stream = await runResponse.text();
    expect(stream).toContain('"type":"run_completed"');
    expect(providerMocks.execute).toHaveBeenCalledTimes(10);
    expect(
      providerMocks.execute.mock.calls.map(([input]) => input.prompt.question),
    ).toEqual(
      reviewedPrompts.map((prompt: { question: string }) => prompt.question),
    );
    expect(budgetCallCounts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
