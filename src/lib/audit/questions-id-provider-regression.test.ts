import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INDONESIAN_QUESTION_WRITER_INSTRUCTION,
  buildGeminiIndonesianQuestionRequest,
  buildOpenAIIndonesianQuestionRequest,
  createIndonesianQuestionProvider,
  parseOpenAIIndonesianResponse,
  type IndonesianFetch,
} from "./questions-id-provider";
import type { MinimizedIndonesianBrief } from "./questions-id";

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

function responsesBody(content: Record<string, unknown>) {
  return {
    status: "completed",
    output: [
      {
        type: "message",
        content: [content],
      },
    ],
  };
}

const structuredResponsesBody = responsesBody({
  type: "output_text",
  text: JSON.stringify({ questions: ten }),
  parsed: { questions: ten },
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("question-writer contract regressions", () => {
  it("pins the exact bounded no-search Responses request", () => {
    const request = buildOpenAIIndonesianQuestionRequest(brief, "gpt-5.6-luna");

    expect(request).toEqual({
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
      store: false,
      service_tier: "default",
      max_output_tokens: 2_048,
      text: {
        format: {
          type: "json_schema",
          name: "nuave_indonesian_questions",
          schema: {
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
          },
          strict: true,
        },
        verbosity: "low",
      },
      input: [
        {
          role: "developer",
          content: INDONESIAN_QUESTION_WRITER_INSTRUCTION,
        },
        {
          role: "user",
          content: JSON.stringify(brief),
        },
      ],
    });
    expect(request).not.toHaveProperty("tools");
    expect(request).not.toHaveProperty("tool_choice");
    expect(request).not.toHaveProperty("include");
  });

  it("preserves the substantive question-writer methodology invariants", () => {
    const instruction = INDONESIAN_QUESTION_WRITER_INSTRUCTION;

    expect(instruction).toContain(
      "Write exactly ten independent questions in the assigned order",
    );
    expect(instruction).toContain(
      "Write natural Indonesian appropriate to the category and audience",
    );
    expect(instruction).toContain("without the audited business name");
    expect(instruction).toContain(
      "compare the audited business with the supplied comparison business",
    );
    expect(instruction).toContain(
      "compare it with relevant alternatives without inventing a name",
    );
    expect(instruction).toContain(
      "You may ask whether an unknown public fact is true",
    );
    expect(instruction).toContain(
      "do not write as if that fact is already true",
    );
    expect(instruction).toContain("Do not include answers");
    expect(instruction).toContain("explanations");
    expect(instruction).toContain("rationales");
    expect(instruction).toContain("citations");
    expect(instruction).toContain("scores");
    expect(instruction).toContain("findings");
    expect(instruction).toContain("marketing claims");
    expect(instruction).toContain(
      "Return only the ten questions in the required output format",
    );
  });
});

describe("shared Responses-compatible parser regressions", () => {
  it("accepts structured parsed output", () => {
    expect(parseOpenAIIndonesianResponse(structuredResponsesBody)).toEqual({
      kind: "structured",
      questions: ten,
    });
  });

  it("accepts JSON-encoded structured output_text when parsed is absent", () => {
    expect(
      parseOpenAIIndonesianResponse(
        responsesBody({
          type: "output_text",
          text: JSON.stringify({ questions: ten }),
        }),
      ),
    ).toEqual({ kind: "structured", questions: ten });
  });

  it("returns ordinary output_text for deterministic downstream parsing", () => {
    const text = ten
      .map((question, index) => `${index + 1}. ${question}`)
      .join("\n");

    expect(
      parseOpenAIIndonesianResponse(
        responsesBody({ type: "output_text", text }),
      ),
    ).toEqual({ kind: "text", text });
  });

  it("does not accept wrong-count structured output", () => {
    const wrongCountText = JSON.stringify({ questions: ten.slice(0, 9) });

    expect(
      parseOpenAIIndonesianResponse(
        responsesBody({
          type: "output_text",
          text: wrongCountText,
          parsed: { questions: ten.slice(0, 9) },
        }),
      ),
    ).toEqual({ kind: "text", text: wrongCountText });
  });

  it("throws on refusals", () => {
    expect(() =>
      parseOpenAIIndonesianResponse(
        responsesBody({ type: "refusal", refusal: "No" }),
      ),
    ).toThrow("Responses API refused the question-generation request");
  });

  it("throws on incomplete status", () => {
    expect(() =>
      parseOpenAIIndonesianResponse({ status: "incomplete", output: [] }),
    ).toThrow("provider status incomplete");
  });

  it("surfaces a provider error object", () => {
    expect(() =>
      parseOpenAIIndonesianResponse({
        status: "completed",
        error: { message: "Provider rejected schema" },
        output: [],
      }),
    ).toThrow(
      "Responses API question generation failed: Provider rejected schema",
    );
  });
});

describe("Responses-compatible HTTP regressions", () => {
  it("posts the exact OpenCode Go request and headers", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "test-opencode-key");
    vi.stubEnv("OPENAI_BASE_URL", "https://opencode.ai/zen/go/v1");
    vi.stubEnv("OPENAI_AUDIT_MODEL", "gpt-5.6-luna");
    const { stub, calls } = stubFetch(() =>
      jsonResponse(structuredResponsesBody),
    );

    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).resolves.toEqual({ kind: "structured", questions: ten });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: "https://opencode.ai/zen/go/v1/responses",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-opencode-key",
        },
      },
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual(
      buildOpenAIIndonesianQuestionRequest(brief, "gpt-5.6-luna"),
    );
  });

  it("surfaces an OpenCode Go HTTP error message", async () => {
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

  it("does not fetch when the Responses-compatible credential is missing", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "");
    const { stub, calls } = stubFetch(() =>
      jsonResponse(structuredResponsesBody),
    );

    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).rejects.toThrow("OPENCODEGO_API_KEY is not configured");
    expect(calls).toHaveLength(0);
  });

  it("uses global fetch when no HTTP implementation is injected", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "test-opencode-key");
    const { stub, calls } = stubFetch(() =>
      jsonResponse(structuredResponsesBody),
    );
    vi.stubGlobal("fetch", stub);

    await expect(
      createIndonesianQuestionProvider().generate(brief),
    ).resolves.toEqual({ kind: "structured", questions: ten });
    expect(calls).toHaveLength(1);
  });
});

describe("Gemini testing-provider regressions", () => {
  it("honors the Gemini model override", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    vi.stubEnv("GEMINI_AUDIT_MODEL", "gemini-question-writer-test");
    const { stub, calls } = stubFetch(() =>
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ questions: ten }) }],
            },
          },
        ],
      }),
    );

    await createIndonesianQuestionProvider(stub).generate(brief);

    expect(calls[0].url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-question-writer-test:generateContent",
    );
  });

  it("pins the exact bounded no-search Gemini request and emitted HTTP body", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    vi.stubEnv("GEMINI_AUDIT_MODEL", "gemini-3.5-flash-lite");
    const expectedRequest = {
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      body: {
        systemInstruction: {
          parts: [{ text: INDONESIAN_QUESTION_WRITER_INSTRUCTION }],
        },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(brief) }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2_048,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              questions: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
            required: ["questions"],
          },
        },
        tools: [],
      },
    };
    expect(
      buildGeminiIndonesianQuestionRequest(brief, "gemini-3.5-flash-lite"),
    ).toEqual(expectedRequest);

    const { stub, calls } = stubFetch(() =>
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ questions: ten }) }],
            },
          },
        ],
      }),
    );
    await createIndonesianQuestionProvider(stub).generate(brief);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: expectedRequest.url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": "test-gemini-key",
        },
      },
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual(
      expectedRequest.body,
    );
  });

  it("returns unparseable Gemini text for deterministic fallback parsing", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    const { stub } = stubFetch(() =>
      jsonResponse({
        candidates: [
          { content: { parts: [{ text: "bukan daftar bernomor" }] } },
        ],
      }),
    );

    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).resolves.toEqual({ kind: "text", text: "bukan daftar bernomor" });
  });

  it("surfaces a Gemini provider error object", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    const { stub } = stubFetch(() =>
      jsonResponse({
        error: {
          message: "API key not valid",
          status: "INVALID_ARGUMENT",
        },
      }),
    );

    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).rejects.toThrow(
      "Gemini question generation failed: API key not valid (INVALID_ARGUMENT)",
    );
  });

  it("surfaces a Gemini HTTP error", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    const { stub } = stubFetch(() =>
      jsonResponse({ error: { message: "Internal error" } }, 500),
    );

    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).rejects.toThrow("Gemini question generation failed: Internal error");
  });

  it("does not fetch when the Gemini credential is missing", async () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    const { stub, calls } = stubFetch(() => jsonResponse({}));

    await expect(
      createIndonesianQuestionProvider(stub).generate(brief),
    ).rejects.toThrow("GEMINI_API_KEY is not configured");
    expect(calls).toHaveLength(0);
  });
});
