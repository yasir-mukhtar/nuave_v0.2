import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INDONESIAN_QUESTION_GEMINI_DEFAULT_MODEL,
  INDONESIAN_QUESTION_GEMINI_PRICING_VERSION,
  INDONESIAN_QUESTION_GEMINI_SYSTEM,
  INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS,
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
  type IndonesianFetch,
} from "./questions-id-provider";
import {
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  INDONESIAN_QUESTION_LANGUAGE,
  generateIndonesianQuestionPack,
  type MinimizedIndonesianBrief,
} from "./questions-id";

// ---------------------------------------------------------------------------
// Fixture context: the same fictional brief the boundary tests use
// (NVA-FIKTIF-001, Kopi Taman Senja).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HTTP-stub helpers (no live network may occur in tests)
// ---------------------------------------------------------------------------

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

const openAIStructuredBody = {
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

// ---------------------------------------------------------------------------
// Environment hygiene
// ---------------------------------------------------------------------------

const originalEnv = {
  NUAVE_QUESTION_PROVIDER: process.env.NUAVE_QUESTION_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_AUDIT_MODEL: process.env.OPENAI_AUDIT_MODEL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_AUDIT_MODEL: process.env.GEMINI_AUDIT_MODEL,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Provider configuration (Spec 003 R-07..R-10)
// ---------------------------------------------------------------------------

describe("question-writer provider configuration", () => {
  it("defaults to the OpenAI Responses API with GPT-5.6 Luna when unset", () => {
    delete process.env.NUAVE_QUESTION_PROVIDER;
    expect(indonesianQuestionProviderName()).toBe(
      INDONESIAN_QUESTION_PROVIDER_DEFAULT,
    );
    const config = indonesianQuestionProviderConfig();
    expect(config).toEqual({
      name: "openai",
      system: INDONESIAN_QUESTION_OPENAI_SYSTEM,
      requested_model: "gpt-5.6-luna",
      pricing_version: INDONESIAN_QUESTION_OPENAI_PRICING_VERSION,
    });
    expect(config.system).toBe("OpenAI Responses API");
  });

  it("honors OPENAI_AUDIT_MODEL for the OpenAI path", () => {
    process.env.OPENAI_AUDIT_MODEL = "gpt-5.6-luna-2026-08";
    const config = indonesianQuestionProviderConfig();
    expect(config.requested_model).toBe("gpt-5.6-luna-2026-08");
  });

  it("selects Gemini 3.5 Flash-Lite with NUAVE_QUESTION_PROVIDER=gemini", () => {
    process.env.NUAVE_QUESTION_PROVIDER = "gemini";
    expect(indonesianQuestionProviderName()).toBe("gemini");
    const config = indonesianQuestionProviderConfig();
    expect(config).toEqual({
      name: "gemini",
      system: INDONESIAN_QUESTION_GEMINI_SYSTEM,
      requested_model: INDONESIAN_QUESTION_GEMINI_DEFAULT_MODEL,
      pricing_version: INDONESIAN_QUESTION_GEMINI_PRICING_VERSION,
    });
    expect(config.system).toBe("Google Gemini API");
    expect(config.requested_model).toBe("gemini-3.5-flash-lite");
  });

  it("honors GEMINI_AUDIT_MODEL for the Gemini path", () => {
    process.env.NUAVE_QUESTION_PROVIDER = "gemini";
    process.env.GEMINI_AUDIT_MODEL = "gemini-3.5-flash-lite-2026-08";
    expect(indonesianQuestionProviderConfig().requested_model).toBe(
      "gemini-3.5-flash-lite-2026-08",
    );
  });

  it("accepts an explicit openai value and case-insensitive input", () => {
    process.env.NUAVE_QUESTION_PROVIDER = " OpenAI ";
    expect(indonesianQuestionProviderName()).toBe("openai");
  });

  it("rejects an unrecognized NUAVE_QUESTION_PROVIDER before any call", () => {
    process.env.NUAVE_QUESTION_PROVIDER = "groq";
    expect(() => indonesianQuestionProviderName()).toThrow(
      'Unrecognized NUAVE_QUESTION_PROVIDER="groq"',
    );
    expect(() => indonesianQuestionProviderConfig()).toThrow(
      'Valid values are "openai" or "gemini"',
    );
  });

  it("resolves generation provenance meta from the environment", () => {
    delete process.env.NUAVE_QUESTION_PROVIDER;
    delete process.env.OPENAI_AUDIT_MODEL;
    expect(indonesianQuestionGenerationMeta()).toEqual({
      system: "OpenAI Responses API",
      requested_model: "gpt-5.6-luna",
      pricing_version: INDONESIAN_QUESTION_OPENAI_PRICING_VERSION,
    });
    process.env.NUAVE_QUESTION_PROVIDER = "gemini";
    expect(indonesianQuestionGenerationMeta()).toEqual({
      system: "Google Gemini API",
      requested_model: "gemini-3.5-flash-lite",
      pricing_version: INDONESIAN_QUESTION_GEMINI_PRICING_VERSION,
    });
  });
});

// ---------------------------------------------------------------------------
// Versioned instruction (question-writer-v1)
// ---------------------------------------------------------------------------

describe("versioned question-writer instruction", () => {
  it("pairs the canonical instruction with question-writer-v1 and id-ID", () => {
    expect(INDONESIAN_QUESTION_INSTRUCTION_VERSION).toBe("question-writer-v1");
    expect(INDONESIAN_QUESTION_LANGUAGE).toBe("id-ID");
  });

  it("preserves the User Flow/04 generation substance", () => {
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
      "Write exactly ten independent questions in the assigned order",
    );
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
      "Write natural Indonesian appropriate to the category and audience",
    );
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
      "without the audited business name",
    );
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
      "compare it with relevant alternatives without inventing a name",
    );
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
      "do not write as if that fact is already true",
    );
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
      "Do not include answers, explanations, rationales, citations, scores, findings, or marketing claims",
    );
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
      "Return only the ten questions in the required output format",
    );
  });
});

// ---------------------------------------------------------------------------
// OpenAI request builder (exact payload shape)
// ---------------------------------------------------------------------------

describe("OpenAI question-generation request builder", () => {
  it("builds the exact bounded no-search payload", () => {
    const request = buildOpenAIIndonesianQuestionRequest(brief, "gpt-5.6-luna");
    expect(request).toEqual({
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
      store: false,
      service_tier: "default",
      max_output_tokens: INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS,
      text: {
        format: {
          type: "json_schema",
          name: INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME,
          schema: INDONESIAN_QUESTION_STRINGS_JSON_SCHEMA,
          strict: true,
        },
        verbosity: "low",
      },
      input: [
        {
          role: "developer",
          content: INDONESIAN_QUESTION_WRITER_INSTRUCTION,
        },
        { role: "user", content: JSON.stringify(brief) },
      ],
    });
    // No web search and no tool plumbing of any kind.
    expect(request).not.toHaveProperty("tools");
    expect(request).not.toHaveProperty("tool_choice");
    expect(request).not.toHaveProperty("include");
  });

  it("uses the minimal ten-strings output schema", () => {
    expect(INDONESIAN_QUESTION_STRINGS_JSON_SCHEMA).toEqual({
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: { type: "string" },
          minItems: 10,
          maxItems: 10,
        },
      },
      required: ["questions"],
      additionalProperties: false,
    });
  });

  it("sends only the minimized confirmed brief — no email, payment, or metadata", () => {
    const request = buildOpenAIIndonesianQuestionRequest(brief, "gpt-5.6-luna");
    const userContent = request.input[1].content;
    expect(userContent).toBe(JSON.stringify(brief));
    const serialized = JSON.stringify(request);
    expect(serialized).not.toMatch(/email|payment|password|agency|ktp/i);
    expect(serialized).toContain("official_source_urls");
  });
});

// ---------------------------------------------------------------------------
// OpenAI provider over a stubbed HTTP layer
// ---------------------------------------------------------------------------

describe("OpenAI provider over a stubbed HTTP layer", () => {
  it("returns structured questions and posts the exact request", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { stub, calls } = stubFetch(() => jsonResponse(openAIStructuredBody));
    const provider = createIndonesianQuestionProvider(stub);

    await expect(provider.generate(brief)).resolves.toEqual({
      kind: "structured",
      questions: ten,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(INDONESIAN_QUESTION_OPENAI_ENDPOINT);
    expect(calls[0].init.method).toBe("POST");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(String(calls[0].init.body))).toEqual(
      buildOpenAIIndonesianQuestionRequest(brief, "gpt-5.6-luna"),
    );
  });

  it("falls back to text when structured output is missing", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { stub } = stubFetch(() =>
      jsonResponse({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: ten.join("\n") }],
          },
        ],
      }),
    );
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).resolves.toEqual({
      kind: "text",
      text: ten.join("\n"),
    });
  });

  it("parses JSON-encoded structured output from text when parsed is absent", async () => {
    // Observed live 2026-08-17: gpt-5.6-luna returned the schema object as a
    // JSON string in output_text.text with NO parsed field. The parser must
    // accept that form instead of degrading to the numbered-list text path.
    process.env.OPENAI_API_KEY = "test-key";
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
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).resolves.toEqual({
      kind: "structured",
      questions: ten,
    });
  });

  it("falls to text when structured output has the wrong count", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { stub } = stubFetch(() =>
      jsonResponse({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ questions: ten.slice(0, 9) }),
                parsed: { questions: ten.slice(0, 9) },
              },
            ],
          },
        ],
      }),
    );
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).resolves.toEqual({
      kind: "text",
      text: JSON.stringify({ questions: ten.slice(0, 9) }),
    });
  });

  it("throws on a refusal so the boundary falls back", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { stub } = stubFetch(() =>
      jsonResponse({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "I cannot help." }],
          },
        ],
      }),
    );
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).rejects.toThrow(
      "OpenAI refused the question-generation request",
    );
  });

  it("throws on an incomplete provider status", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { stub } = stubFetch(() =>
      jsonResponse({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output: [],
      }),
    );
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).rejects.toThrow(
      "provider status incomplete",
    );
  });

  it("throws on an HTTP error with the provider message", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { stub } = stubFetch(() =>
      jsonResponse({ error: { message: "Rate limit exceeded" } }, 429),
    );
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).rejects.toThrow(
      "OpenAI question generation failed: Rate limit exceeded",
    );
  });

  it("throws before fetching when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const { stub, calls } = stubFetch(() => jsonResponse(openAIStructuredBody));
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).rejects.toThrow(
      "OPENAI_API_KEY is not configured",
    );
    expect(calls).toHaveLength(0);
  });

  it("uses the global fetch when none is injected", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { stub, calls } = stubFetch(() => jsonResponse(openAIStructuredBody));
    vi.stubGlobal("fetch", stub);
    const provider = createIndonesianQuestionProvider();
    await expect(provider.generate(brief)).resolves.toEqual({
      kind: "structured",
      questions: ten,
    });
    expect(calls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Gemini request builder and provider (evaluation candidate, Spec 003 R-07)
// ---------------------------------------------------------------------------

describe("Gemini question-generation request builder", () => {
  it("builds the exact bounded no-search generateContent request", () => {
    const request = buildGeminiIndonesianQuestionRequest(
      brief,
      "gemini-3.5-flash-lite",
    );
    expect(request.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    );
    expect(request.body.systemInstruction).toEqual({
      parts: [{ text: INDONESIAN_QUESTION_WRITER_INSTRUCTION }],
    });
    expect(request.body.contents).toEqual([
      { role: "user", parts: [{ text: JSON.stringify(brief) }] },
    ]);
    expect(request.body.generationConfig).toEqual({
      temperature: 0.2,
      maxOutputTokens: INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseSchema: INDONESIAN_QUESTION_STRINGS_GEMINI_SCHEMA,
    });
    // No search tools on the question-writer call.
    expect(request.body.tools).toEqual([]);
    expect(JSON.stringify(request.body)).not.toMatch(
      /email|payment|password|agency|ktp/i,
    );
  });

  it("uses the minimal ten-strings Gemini schema", () => {
    expect(INDONESIAN_QUESTION_STRINGS_GEMINI_SCHEMA).toEqual({
      type: "OBJECT",
      properties: {
        questions: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["questions"],
    });
  });
});

describe("Gemini provider over a stubbed HTTP layer", () => {
  it("returns structured questions and posts the exact request", async () => {
    process.env.NUAVE_QUESTION_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";
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
    const provider = createIndonesianQuestionProvider(stub);

    await expect(provider.generate(brief)).resolves.toEqual({
      kind: "structured",
      questions: ten,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    );
    expect(calls[0].init.method).toBe("POST");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("test-gemini-key");
    expect(JSON.parse(String(calls[0].init.body))).toEqual(
      buildGeminiIndonesianQuestionRequest(brief, "gemini-3.5-flash-lite").body,
    );
  });

  it("returns unparseable text for deterministic numbered-list parsing", async () => {
    process.env.NUAVE_QUESTION_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const { stub } = stubFetch(() =>
      jsonResponse({
        candidates: [
          { content: { parts: [{ text: "bukan daftar bernomor" }] } },
        ],
      }),
    );
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).resolves.toEqual({
      kind: "text",
      text: "bukan daftar bernomor",
    });
  });

  it("throws on a provider error object", async () => {
    process.env.NUAVE_QUESTION_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const { stub } = stubFetch(() =>
      jsonResponse({
        error: { message: "API key not valid", status: "INVALID_ARGUMENT" },
      }),
    );
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).rejects.toThrow(
      "Gemini question generation failed: API key not valid (INVALID_ARGUMENT)",
    );
  });

  it("throws on an HTTP error", async () => {
    process.env.NUAVE_QUESTION_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const { stub } = stubFetch(() =>
      jsonResponse({ error: { message: "Internal error" } }, 500),
    );
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).rejects.toThrow("Internal error");
  });

  it("throws before fetching when GEMINI_API_KEY is missing", async () => {
    process.env.NUAVE_QUESTION_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;
    const { stub, calls } = stubFetch(() =>
      jsonResponse({
        candidates: [{ content: { parts: [{ text: "{}" }] } }],
      }),
    );
    const provider = createIndonesianQuestionProvider(stub);
    await expect(provider.generate(brief)).rejects.toThrow(
      "GEMINI_API_KEY is not configured",
    );
    expect(calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Live wiring through the generation boundary (Spec 003 work package A)
// ---------------------------------------------------------------------------

describe("live wiring through the Indonesian generation boundary", () => {
  it("produces a model-sourced pack through the boundary with a stubbed HTTP layer", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { stub } = stubFetch(() => jsonResponse(openAIStructuredBody));
    const provider = createIndonesianQuestionProvider(stub);
    const suggestion = await generateIndonesianQuestionPack(brief, provider, {
      generationMeta: {
        system: "OpenAI Responses API",
        requested_model: "gpt-5.6-luna",
      },
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
      system: "OpenAI Responses API",
      requested_model: "gpt-5.6-luna",
      instruction_version: INDONESIAN_QUESTION_INSTRUCTION_VERSION,
      fallback_used: false,
    });
  });

  it("generateLiveIndonesianQuestionPack fills provenance from the environment", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.NUAVE_QUESTION_PROVIDER;
    delete process.env.OPENAI_AUDIT_MODEL;
    const { stub } = stubFetch(() => jsonResponse(openAIStructuredBody));
    const suggestion = await generateLiveIndonesianQuestionPack(brief, {
      fetch: stub,
      now: () => "2026-08-17T03:00:00.000Z",
    });

    expect(suggestion.source).toBe("model");
    expect(suggestion.generation).toMatchObject({
      system: "OpenAI Responses API",
      requested_model: "gpt-5.6-luna",
      instruction_version: "question-writer-v1",
      generated_at: "2026-08-17T03:00:00.000Z",
      fallback_used: false,
    });
  });

  it("falls back to the deterministic Indonesian pack when the provider fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";
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
