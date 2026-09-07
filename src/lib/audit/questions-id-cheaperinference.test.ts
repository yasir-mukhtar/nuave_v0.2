import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLiveIndonesianPromptPack } from "./questions-id-live";
import {
  INDONESIAN_QUESTION_CHEAPERINFERENCE_ENDPOINT,
  INDONESIAN_QUESTION_CHEAPERINFERENCE_PRICING_VERSION,
  INDONESIAN_QUESTION_WRITER_INSTRUCTION,
  createIndonesianQuestionProvider,
  generateLiveIndonesianQuestionPack,
  liveIndonesianQuestionProviderName,
} from "./questions-id-provider";
import {
  buildDeterministicIndonesianPack,
  minimizeIndonesianBrief,
} from "./questions-id";
import {
  assertLiveProviderCredentialsConfigured,
  liveAuditProvider,
} from "./provider";
import { PRODUCTION_OBSERVATION_REQUESTED_MODEL } from "./production-observation-method";
import { promptPackSchema, type BusinessBrief } from "./types";

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

const minimized = minimizeIndonesianBrief(dentalBrief);
const questions = buildDeterministicIndonesianPack(minimized);
const completion = {
  id: "chatcmpl_question_writer",
  model: "glm-5.3-flash",
  choices: [
    {
      finish_reason: "stop",
      message: { content: JSON.stringify({ questions }) },
    },
  ],
  usage: {
    prompt_tokens: 1_000,
    completion_tokens: 500,
    total_tokens: 1_500,
    prompt_tokens_details: { cached_tokens: 100 },
    completion_tokens_details: { reasoning_tokens: 200 },
  },
};

function mockCompletion(body: unknown = completion, status = 200) {
  const mock = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NUAVE_PROVIDER", "opencodego");
  vi.stubEnv("NUAVE_QUESTION_PROVIDER", "cheaperinference");
  vi.stubEnv("CHEAPERINFERENCE_API_KEY", "test-writer-key");
  vi.stubEnv("OPENCODEGO_API_KEY", "test-audit-key");
  vi.stubEnv("OPENAI_API_KEY", "test-audit-key");
  vi.stubEnv("OPENAI_BASE_URL", "https://opencode.ai/zen/go/v1");
  vi.stubEnv("OPENAI_AUDIT_MODEL", "gpt-5.6-luna");
  vi.stubEnv("OPENAI_AUDIT_REASONING_EFFORT", "low");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Cheaper Inference question writer with the existing GPT audit target", () => {
  it("uses one isolated Chat Completions request and preserves the audited system", async () => {
    const fetchMock = mockCompletion();
    const result = await buildLiveIndonesianPromptPack({
      brief: { ...dentalBrief, agency_name: "PRIVATE AGENCY VALUE" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(INDONESIAN_QUESTION_CHEAPERINFERENCE_ENDPOINT);
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer test-writer-key",
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.redirect).toBe("error");
    const request = JSON.parse(String(init?.body));
    expect(request).toMatchObject({
      model: "glm-5.3-flash",
      stream: false,
      reasoning_effort: "low",
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].content).toContain(
      INDONESIAN_QUESTION_WRITER_INSTRUCTION,
    );
    expect(request.messages[1]).toEqual({
      role: "user",
      content: JSON.stringify(minimized),
    });
    expect(String(init?.body)).not.toContain("PRIVATE AGENCY VALUE");
    expect(request).not.toHaveProperty("tools");
    expect(request).not.toHaveProperty("service_tier");
    expect(request).not.toHaveProperty("input");
    expect(result.generation).toMatchObject({
      source: "model",
      system: "Cheaper Inference Chat Completions API",
      requested_model: "glm-5.3-flash",
      instruction_version: "question-writer-v2",
    });
    expect(promptPackSchema.safeParse(result.pack).success).toBe(true);
    expect(result.pack.target_product).toBe("ChatGPT");
    expect(result.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 6,
      menyebut_bisnis_anda: 4,
    });
    expect(result.telemetry[0]).toMatchObject({
      status: "completed",
      requested_model: "glm-5.3-flash",
      returned_model: "glm-5.3-flash",
      response_id: completion.id,
      usage: {
        input_tokens: 1000,
        output_tokens: 500,
        cached_input_tokens: 100,
        reasoning_output_tokens: 200,
        total_tokens: 1500,
      },
      web_search_calls: 0,
      accounted_cost_usd: 0.0004,
      pricing_version: INDONESIAN_QUESTION_CHEAPERINFERENCE_PRICING_VERSION,
    });
    expect(result.budget.calls).toEqual(result.telemetry);
    expect(liveIndonesianQuestionProviderName()).toBe("cheaperinference");
    expect(liveAuditProvider()).toBe("opencodego");
    expect(PRODUCTION_OBSERVATION_REQUESTED_MODEL).toBe("gpt-5.6-luna");
    expect(() => assertLiveProviderCredentialsConfigured()).not.toThrow();
    expect(process.env.OPENAI_BASE_URL).toBe("https://opencode.ai/zen/go/v1");
    expect(process.env.OPENAI_API_KEY).toBe("test-audit-key");
    expect(process.env.OPENAI_AUDIT_MODEL).toBe("gpt-5.6-luna");
  });

  it("pins the writer endpoint and never borrows the audit credential", async () => {
    vi.stubEnv("OPENAI_BASE_URL", "https://example.invalid/v1");
    vi.stubEnv("OPENCODEGO_API_KEY", "");
    const fetchMock = mockCompletion();
    const result = await buildLiveIndonesianPromptPack({ brief: dentalBrief });
    expect(result.generation.source).toBe("model");
    expect(fetchMock.mock.calls[0][0]).toBe(
      INDONESIAN_QUESTION_CHEAPERINFERENCE_ENDPOINT,
    );
    expect(process.env.OPENAI_BASE_URL).toBe("https://example.invalid/v1");
    expect(process.env.OPENAI_API_KEY).toBe("test-audit-key");
  });

  it("fails before fetching when the new key is missing, including both live entry points", async () => {
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "  ");
    const fetchMock = mockCompletion();
    await expect(
      buildLiveIndonesianPromptPack({ brief: dentalBrief }),
    ).rejects.toThrow("CHEAPERINFERENCE_API_KEY is not configured");
    await expect(generateLiveIndonesianQuestionPack(minimized)).rejects.toThrow(
      "CHEAPERINFERENCE_API_KEY is not configured",
    );
    await expect(
      createIndonesianQuestionProvider().generate(minimized),
    ).rejects.toThrow("CHEAPERINFERENCE_API_KEY is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 429, 503])(
    "uses the deterministic fallback on HTTP %i without a second provider call",
    async (status) => {
      const fetchMock = mockCompletion(
        { error: { message: "Provider error" } },
        status,
      );
      const result = await buildLiveIndonesianPromptPack({
        brief: dentalBrief,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.generation.source).toBe("fallback");
      expect(result.generation.warnings).toContain("fallback_used");
      expect(result.telemetry[0]).toMatchObject({
        status: "failed",
        provider_status: String(status),
      });
    },
  );

  it.each([
    { ...completion, model: "gpt-5.6-luna" },
    { ...completion, model: "" },
    { ...completion, id: "" },
    { ...completion, usage: undefined },
    { ...completion, usage: { prompt_tokens: -1, completion_tokens: 500 } },
  ])("rejects incomplete or mismatched GLM provenance", async (body) => {
    mockCompletion(body);
    const result = await buildLiveIndonesianPromptPack({ brief: dentalBrief });
    expect(result.generation.source).toBe("fallback");
    expect(result.telemetry[0].status).toBe("failed");
  });

  it.each([
    {
      finish_reason: "length",
      message: { content: JSON.stringify({ questions }) },
    },
    { finish_reason: "content_filter", message: { content: "" } },
    { finish_reason: "stop", message: { refusal: "refused", content: "" } },
    {
      finish_reason: "stop",
      message: { content: null, reasoning_content: "hidden reasoning" },
    },
    {
      finish_reason: "stop",
      message: {
        content: JSON.stringify({ questions: questions.slice(0, 9) }),
      },
    },
  ])(
    "records unsuccessful output as fallback even with valid usage",
    async (choice) => {
      mockCompletion({ ...completion, choices: [choice] });
      const result = await buildLiveIndonesianPromptPack({
        brief: dentalBrief,
      });
      expect(result.generation.source).toBe("fallback");
      expect(result.telemetry[0]).toMatchObject({
        status: "failed",
        accounted_cost_usd: 0.0004,
      });
    },
  );

  it("retains numbered-list parsing when a route returns text", async () => {
    mockCompletion({
      ...completion,
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: questions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
          },
        },
      ],
    });
    const result = await buildLiveIndonesianPromptPack({ brief: dentalBrief });
    expect(result.generation.source).toBe("parsed");
    expect(result.telemetry[0].status).toBe("completed");
  });

  it("falls back after a bounded timeout without an automatic retry", async () => {
    const signal = AbortSignal.abort(
      new DOMException("Timeout", "TimeoutError"),
    );
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        init?.signal?.throwIfAborted();
        throw new Error("Expected the request to be aborted");
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await buildLiveIndonesianPromptPack({ brief: dentalBrief });
    expect(timeout).toHaveBeenCalledWith(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.generation.source).toBe("fallback");
    expect(result.telemetry[0].status).toBe("failed");
  });
});
