import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INDONESIAN_QUESTION_GEMINI_DEFAULT_MODEL,
  INDONESIAN_QUESTION_GEMINI_PRICING_VERSION,
  INDONESIAN_QUESTION_GEMINI_SYSTEM,
  INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS,
  INDONESIAN_QUESTION_OPENCODEGO_BASE_URL,
  INDONESIAN_QUESTION_OPENCODEGO_PRICING_VERSION,
  INDONESIAN_QUESTION_OPENCODEGO_SYSTEM,
  INDONESIAN_QUESTION_OPENAI_ENDPOINT,
  INDONESIAN_QUESTION_OPENAI_PRICING_VERSION,
  INDONESIAN_QUESTION_OPENAI_SYSTEM,
  INDONESIAN_QUESTION_PROVIDER_DEFAULT,
  INDONESIAN_QUESTION_STRINGS_GEMINI_SCHEMA,
  INDONESIAN_QUESTION_STRINGS_JSON_SCHEMA,
  INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME,
  INDONESIAN_QUESTION_WRITER_INSTRUCTION,
  buildGeminiIndonesianQuestionRequest,
  buildOpenAIIndonesianQuestionRequest,
  createIndonesianQuestionProvider,
  generateLiveIndonesianQuestionPack,
  indonesianQuestionGenerationMeta,
  indonesianQuestionProviderConfig,
  indonesianQuestionProviderName,
  liveIndonesianQuestionProviderName,
  type IndonesianFetch,
} from "./questions-id-provider";
import {
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  INDONESIAN_QUESTION_LANGUAGE,
  type MinimizedIndonesianBrief,
} from "./questions-id";

const brief: MinimizedIndonesianBrief = {
  brand_name: "Kopi Taman Senja",
  brand_name_variants: [],
  scope: "Dago, Bandung",
  category: "Kedai kopi",
  offerings: ["Kopi lokal", "Ruang kerja", "Makanan ringan"],
  customer_context:
    "Pekerja remote, mahasiswa, dan komunitas kecil di Bandung.",
  customer_needs: [
    "Tempat untuk bekerja atau bertemu dengan Wi-Fi, makanan, dan minuman.",
  ],
  decision_considerations: ["Lokasi, suasana, fasilitas, harga, dan jam buka."],
  differentiator:
    "Menggunakan kopi dari produsen lokal sekaligus menyediakan area untuk bekerja dan pertemuan kecil.",
  comparison_business: {
    name: "Kopi Ruang Pagi",
    scope: "Dago, Bandung",
    source_url: "https://kopiruangpagi.example",
  },
  known_accuracy_questions: [],
  conversion_action: "",
  official_source_urls: ["https://kopitamansenja.example"],
};

const ten = [
  "Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.",
  "Tempat rapat kecil di Bandung yang ada makanan, minuman, dan bisa dipakai kerja di mana ya?",
  "Kedai kopi apa aja di Dago yang cocok untuk WFC atau meeting?",
  "Di mana ada cafe yang menyediakan kopi lokal dan bisa untuk kerja atau WFC di Bandung?",
  "Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable, dan buka sampai malam.",
  "Bandingin Kopi Taman Senja vs Kopi Ruang Pagi untuk WFC dan meeting di Dago.",
  "Kopi Taman Senja bisa dipakai WFC atau kerja nggak ya? Kopi yang disediakan kopi apa?",
  "Di mana alamat Kopi Taman Senja? Buka jam berapa?",
  "Cariin kontak Kopi Taman Senja.",
  "Kopi Taman Senja ada parkiran mobil dan mushollanya nggak?",
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(respond: (url: string, init: RequestInit) => Response) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const stub = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, init: init ?? {} });
    return respond(url, init ?? {});
  };
  return { stub: stub as IndonesianFetch, calls };
}

const responsesStructuredBody = {
  status: "completed",
  output: [
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: JSON.stringify({ questions: ten }),
          parsed: { questions: ten },
        },
      ],
    },
  ],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("question-writer provider configuration", () => {
  it("defaults to OpenCode Go with GPT-5.6 Luna", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "");
    vi.stubEnv("OPENAI_AUDIT_MODEL", "");
    expect(INDONESIAN_QUESTION_PROVIDER_DEFAULT).toBe("opencodego");
    expect(indonesianQuestionProviderName()).toBe("opencodego");
    expect(indonesianQuestionProviderConfig()).toEqual({
      name: "opencodego",
      system: INDONESIAN_QUESTION_OPENCODEGO_SYSTEM,
      requested_model: "gpt-5.6-luna",
      pricing_version: INDONESIAN_QUESTION_OPENCODEGO_PRICING_VERSION,
    });
  });

  it("honors OPENAI_AUDIT_MODEL for OpenCode Go", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENAI_AUDIT_MODEL", "gpt-5.6-luna-2026-08");
    expect(indonesianQuestionProviderConfig().requested_model).toBe(
      "gpt-5.6-luna-2026-08",
    );
  });

  it("keeps direct OpenAI available for non-production testing", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "openai");
    expect(indonesianQuestionProviderConfig()).toEqual({
      name: "openai",
      system: INDONESIAN_QUESTION_OPENAI_SYSTEM,
      requested_model: "gpt-5.6-luna",
      pricing_version: INDONESIAN_QUESTION_OPENAI_PRICING_VERSION,
    });
  });

  it("keeps Gemini available for non-production testing", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    expect(indonesianQuestionProviderConfig()).toEqual({
      name: "gemini",
      system: INDONESIAN_QUESTION_GEMINI_SYSTEM,
      requested_model: INDONESIAN_QUESTION_GEMINI_DEFAULT_MODEL,
      pricing_version: INDONESIAN_QUESTION_GEMINI_PRICING_VERSION,
    });
  });

  it("rejects an unrecognized provider", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "groq");
    expect(() => indonesianQuestionProviderName()).toThrow(
      'Unrecognized NUAVE_QUESTION_PROVIDER="groq"',
    );
    expect(() => indonesianQuestionProviderConfig()).toThrow(/Valid values/);
  });

  it("records OpenCode Go provenance by default", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "");
    vi.stubEnv("OPENAI_AUDIT_MODEL", "");
    expect(indonesianQuestionGenerationMeta()).toEqual({
      system: "OpenCode Go Responses API",
      requested_model: "gpt-5.6-luna",
      pricing_version: INDONESIAN_QUESTION_OPENCODEGO_PRICING_VERSION,
    });
  });

  it("locks the protected live question path to OpenCode Go", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    expect(liveIndonesianQuestionProviderName()).toBe("opencodego");

    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "openai");
    expect(() => liveIndonesianQuestionProviderName()).toThrow(/testing-only/);
  });
});

describe("versioned question-writer request", () => {
  it("pairs the canonical instruction with question-writer-v1 and id-ID", () => {
    expect(INDONESIAN_QUESTION_INSTRUCTION_VERSION).toBe("question-writer-v1");
    expect(INDONESIAN_QUESTION_LANGUAGE).toBe("id-ID");
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
      "Write exactly ten independent questions in the assigned order",
    );
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
      "Write natural Indonesian appropriate to the category and audience",
    );
  });

  it("builds the bounded no-search Responses API payload", () => {
    const request = buildOpenAIIndonesianQuestionRequest(brief, "gpt-5.6-luna");
    expect(request.model).toBe("gpt-5.6-luna");
    expect(request.reasoning).toEqual({ effort: "low" });
    expect(request.max_output_tokens).toBe(
      INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS,
    );
    expect(request.text.format.schema).toEqual(
      INDONESIAN_QUESTION_STRINGS_JSON_SCHEMA,
    );
    expect(request.text.format.name).toBe(
      INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME,
    );
    expect(request).not.toHaveProperty("tools");
    expect(request).not.toHaveProperty("tool_choice");
    expect(request.input[1].content).toBe(JSON.stringify(brief));
    expect(JSON.stringify(request)).not.toMatch(/email|payment|password|ktp/i);
  });

  it("builds the bounded no-search Gemini payload", () => {
    const request = buildGeminiIndonesianQuestionRequest(
      brief,
      "gemini-3.5-flash-lite",
    );
    expect(request.body.generationConfig.responseSchema).toEqual(
      INDONESIAN_QUESTION_STRINGS_GEMINI_SCHEMA,
    );
    expect(request.body.tools).toEqual([]);
  });
});

describe("OpenCode Go question provider over a stubbed HTTP layer", () => {
  it("uses the OpenCode Go endpoint and credential", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "test-opencode-key");
    vi.stubEnv("OPENAI_BASE_URL", INDONESIAN_QUESTION_OPENCODEGO_BASE_URL);
    const { stub, calls } = stubFetch(() =>
      jsonResponse(responsesStructuredBody),
    );
    const provider = createIndonesianQuestionProvider(stub);

    await expect(provider.generate(brief)).resolves.toEqual({
      kind: "structured",
      questions: ten,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      `${INDONESIAN_QUESTION_OPENCODEGO_BASE_URL}/responses`,
    );
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-opencode-key");
    expect(JSON.parse(String(calls[0].init.body))).toEqual(
      buildOpenAIIndonesianQuestionRequest(brief, "gpt-5.6-luna"),
    );
  });

  it("defaults the OpenCode Go endpoint when OPENAI_BASE_URL is blank", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "test-opencode-key");
    vi.stubEnv("OPENAI_BASE_URL", "");
    const { stub, calls } = stubFetch(() =>
      jsonResponse(responsesStructuredBody),
    );
    await createIndonesianQuestionProvider(stub).generate(brief);
    expect(calls[0].url).toBe(
      `${INDONESIAN_QUESTION_OPENCODEGO_BASE_URL}/responses`,
    );
  });

  it("fails before fetching when OPENCODEGO_API_KEY is missing", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "");
    const { stub, calls } = stubFetch(() =>
      jsonResponse(responsesStructuredBody),
    );
    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).rejects.toThrow("OPENCODEGO_API_KEY is not configured");
    expect(calls).toHaveLength(0);
  });

  it("surfaces an OpenCode Go HTTP error", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "test-opencode-key");
    const { stub } = stubFetch(() =>
      jsonResponse({ error: { message: "Rate limit exceeded" } }, 429),
    );
    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).rejects.toThrow(
      "OpenCode Go question generation failed: Rate limit exceeded",
    );
  });
});

describe("direct OpenAI testing provider", () => {
  it("uses api.openai.com and OPENAI_API_KEY when explicitly selected", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const { stub, calls } = stubFetch(() =>
      jsonResponse(responsesStructuredBody),
    );
    await createIndonesianQuestionProvider(stub).generate(brief);
    expect(calls[0].url).toBe(INDONESIAN_QUESTION_OPENAI_ENDPOINT);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-openai-key");
  });

  it("accepts JSON-encoded structured output when parsed is absent", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const { stub } = stubFetch(() =>
      jsonResponse({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ questions: ten }),
              },
            ],
          },
        ],
      }),
    );
    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).resolves.toEqual({
      kind: "structured",
      questions: ten,
    });
  });

  it("rejects refusals and incomplete responses", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const refusal = stubFetch(() =>
      jsonResponse({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "No" }],
          },
        ],
      }),
    );
    await expect(
      createIndonesianQuestionProvider(refusal.stub).generate(brief),
    ).rejects.toThrow("Responses API refused the question-generation request");

    const incomplete = stubFetch(() =>
      jsonResponse({ status: "incomplete", output: [] }),
    );
    await expect(
      createIndonesianQuestionProvider(incomplete.stub).generate(brief),
    ).rejects.toThrow("provider status incomplete");
  });
});

describe("Gemini testing provider", () => {
  it("uses the Gemini key and request shape when explicitly selected", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    const { stub, calls } = stubFetch(() =>
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ questions: ten }) }],
            },
            finishReason: "STOP",
          },
        ],
      }),
    );
    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).resolves.toEqual({
      kind: "structured",
      questions: ten,
    });
    expect(calls[0].url).toContain("generativelanguage.googleapis.com");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("test-gemini-key");
  });

  it("fails before fetching when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    const { stub, calls } = stubFetch(() => jsonResponse({}));
    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).rejects.toThrow("GEMINI_API_KEY is not configured");
    expect(calls).toHaveLength(0);
  });
});

describe("live wiring through the Indonesian generation boundary", () => {
  it("produces a model-sourced OpenCode Go pack with provenance", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "test-opencode-key");
    vi.stubEnv("OPENAI_AUDIT_MODEL", "");
    const { stub } = stubFetch(() => jsonResponse(responsesStructuredBody));

    const suggestion = await generateLiveIndonesianQuestionPack(brief, {
      fetch: stub,
      now: () => "2026-08-21T00:00:00.000Z",
    });

    expect(suggestion.source).toBe("model");
    expect(suggestion.warnings).toEqual([]);
    expect(suggestion.questions.map((item) => item.text)).toEqual(ten);
    expect(suggestion.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 5,
      menyebut_bisnis_anda: 5,
    });
    expect(suggestion.generation).toMatchObject({
      system: "OpenCode Go Responses API",
      requested_model: "gpt-5.6-luna",
      instruction_version: "question-writer-v1",
      generated_at: "2026-08-21T00:00:00.000Z",
      fallback_used: false,
    });
  });

  it("falls back deterministically when OpenCode Go fails", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "test-opencode-key");
    const { stub } = stubFetch(() => {
      throw new Error("network down");
    });
    const suggestion = await generateLiveIndonesianQuestionPack(brief, {
      fetch: stub,
    });
    expect(suggestion.source).toBe("fallback");
    expect(suggestion.generation.fallback_used).toBe(true);
    expect(suggestion.warnings).toContain("fallback_used");
    expect(suggestion.questions).toHaveLength(10);
  });
});
