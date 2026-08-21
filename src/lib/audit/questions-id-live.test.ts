import { afterEach, describe, expect, it, vi } from "vitest";
import type { BusinessBrief } from "./types";
import { buildLiveIndonesianPromptPack } from "./questions-id-live";
import { promptPackSchema } from "./types";

const BRAND = "Klinik Gigi Sehat";

const dentalBrief: BusinessBrief = {
  brand_name: BRAND,
  entity_scope: "Cabang Margonda, Kota Depok",
  brand_type: "Klinik gigi",
  category: "Klinik gigi",
  market_context: "Kota Depok, Jawa Barat, Indonesia",
  target_customer: "Warga Depok yang mencari klinik gigi terjangkau.",
  official_sources: ["https://klinikgigisehat.example"],
  verified_offerings: ["scaling gigi", "behel gigi", "tambal gigi"],
  verified_customer_needs: ["klinik gigi terdekat", "harga terjangkau"],
  verified_decision_criteria: ["lokasi", "harga", "jam buka"],
  verified_competitor: {
    name: "Klinik Gigi Lain",
    scope: "Margonda",
    source_url: "https://klinikgigilain.example",
  },
  brand_name_variants: [],
  priority_offering: "scaling gigi",
  conversion_action: "reservasi via WhatsApp",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "Layanan kesehatan gigi.",
  language: "en-US",
  agency_name: "Nuave",
  agency_logo_data_url: "",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function tenQuestions(): string[] {
  return [
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
}

const responsesBody = {
  id: "resp_live_prompts",
  model: "gpt-5.6-luna",
  status: "completed",
  usage: { input_tokens: 1_000, output_tokens: 500, total_tokens: 1_500 },
  output: [
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: JSON.stringify({ questions: tenQuestions() }),
        },
      ],
    },
  ],
};

describe("live Indonesian prompt generation (Spec 003 work package A route path)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("generates through OpenCode Go with server-side accounting and provenance", async () => {
    vi.stubEnv("OPENCODEGO_API_KEY", "test-dummy-key");
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENAI_BASE_URL", "https://opencode.ai/zen/go/v1");
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse(responsesBody),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await buildLiveIndonesianPromptPack({ brief: dentalBrief });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestUrl).toBe("https://opencode.ai/zen/go/v1/responses");
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.tools).toBeUndefined();

    expect(result.generation.source).toBe("model");
    expect(result.generation.language).toBe("id-ID");
    expect(result.generation.system).toBe("OpenCode Go Responses API");
    expect(result.pack.language).toBe("id-ID");
    expect(result.pack.prompts).toHaveLength(10);
    expect(new Set(result.pack.prompts.map((p) => p.prompt_id)).size).toBe(10);
    expect(result.pack.prompts.filter((p) => p.branded)).toHaveLength(5);
    expect(result.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 5,
      menyebut_bisnis_anda: 5,
    });
    expect(promptPackSchema.safeParse(result.pack).success).toBe(true);

    expect(result.telemetry).toHaveLength(1);
    const call = result.telemetry[0];
    expect(call.stage).toBe("prompts");
    expect(call.status).toBe("completed");
    expect(call.usage.input_tokens).toBe(1_000);
    expect(call.accounted_cost_usd).toBeGreaterThan(0);
    expect(call.cost_basis).toBe("provider_usage");
    expect(call.returned_model).toBe("gpt-5.6-luna");
    expect(result.budget.calls).toHaveLength(1);
    expect(result.budget.limit_usd).toBe(5);
  });

  it("falls back to the deterministic Indonesian pack on provider failure and records a failed call", async () => {
    vi.stubEnv("OPENCODEGO_API_KEY", "test-dummy-key");
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { message: "provider boom" } }, 500),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await buildLiveIndonesianPromptPack({ brief: dentalBrief });

    expect(result.generation.source).toBe("fallback");
    expect(result.generation.warnings).toContain("fallback_used");
    expect(result.pack.prompts).toHaveLength(10);
    expect(result.pack.prompts.filter((p) => p.branded)).toHaveLength(5);
    expect(promptPackSchema.safeParse(result.pack).success).toBe(true);
    expect(result.telemetry[0].status).toBe("failed");
    expect(result.telemetry[0].accounted_cost_usd).toBe(0);
    expect(result.telemetry[0].failure_reason).toContain("fallback");
    expect(result.budget.calls).toHaveLength(1);
  });
});
