import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  auditObservationSearchTool,
  auditModel,
  auditReasoningEffort,
  executeAuditPrompt,
  extractBusinessDraft,
  extractionDraftOrManualFallback,
  normalizeSourceTitle,
  observationInstructionText,
  structuredOutputOrThrow,
} from "./openai";
import {
  DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
  OBSERVATION_INSTRUCTION_VERSION_LEGACY_EN,
  OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
} from "./contracts";
import {
  auditObservationSchema,
  extractionDraftSchema,
  SOURCE_TITLE_MAX_LENGTH,
  sourceSchema,
  type AuditPrompt,
  type BusinessBrief,
} from "./types";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";

// Mock the OpenAI SDK so the live observation path can be exercised without a
// network call. vi.hoisted keeps the mocks reachable from the hoisted factory.
const { mockOpenAIClient, mockResponsesCreate, mockResponsesParse } =
  vi.hoisted(() => {
    const mockResponsesCreate = vi.fn();
    const mockResponsesParse = vi.fn();
    // Regular function (not an arrow) so `new OpenAI(...)` can construct it.
    const mockOpenAIClient = vi.fn(function () {
      return {
        responses: {
          create: mockResponsesCreate,
          parse: mockResponsesParse,
        },
      };
    });
    return { mockOpenAIClient, mockResponsesCreate, mockResponsesParse };
  });

vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();
  return { ...actual, default: mockOpenAIClient };
});

const originalReasoningEffort = process.env.OPENAI_AUDIT_REASONING_EFFORT;
const originalAuditModel = process.env.OPENAI_AUDIT_MODEL;

afterEach(() => {
  if (originalReasoningEffort === undefined) {
    delete process.env.OPENAI_AUDIT_REASONING_EFFORT;
  } else {
    process.env.OPENAI_AUDIT_REASONING_EFFORT = originalReasoningEffort;
  }
  if (originalAuditModel === undefined) {
    delete process.env.OPENAI_AUDIT_MODEL;
  } else {
    process.env.OPENAI_AUDIT_MODEL = originalAuditModel;
  }
});

describe("audit model", () => {
  it("uses the directly priced Luna model for the private cost-capped run", () => {
    delete process.env.OPENAI_AUDIT_MODEL;
    expect(auditModel()).toBe("gpt-5.6-luna");
  });
});

describe("audit reasoning effort", () => {
  it("preserves the stage default when no override is configured", () => {
    delete process.env.OPENAI_AUDIT_REASONING_EFFORT;
    expect(auditReasoningEffort("none")).toBe("none");
    expect(auditReasoningEffort("low")).toBe("low");
    expect(auditReasoningEffort("medium")).toBe("medium");
  });

  it("uses one valid override for every stage", () => {
    process.env.OPENAI_AUDIT_REASONING_EFFORT = "max";
    expect(auditReasoningEffort("low")).toBe("max");
    expect(auditReasoningEffort("medium")).toBe("max");
  });

  it("rejects an unsupported override before making an API request", () => {
    process.env.OPENAI_AUDIT_REASONING_EFFORT = "extra-high";
    expect(() => auditReasoningEffort("low")).toThrow(
      "OPENAI_AUDIT_REASONING_EFFORT must be one of",
    );
  });
});

describe("audit observation web search", () => {
  it("does not inject an unverified provider location", () => {
    expect(auditObservationSearchTool()).toEqual({
      type: "web_search",
      search_context_size: "medium",
    });
  });
});

describe("website extraction fallback", () => {
  const input = {
    website_url: "https://example.com",
    brand_name: "Founder supplied brand",
    market_context: "Founder supplied market",
    category: "Founder supplied category",
  };

  it("opens a manual brief when a completed response has no parsed output", () => {
    const draft = extractionDraftOrManualFallback(input, {
      status: "completed",
      incomplete_details: null,
      output: [],
      output_parsed: null,
    });

    expect(draft).toMatchObject({
      brand_name: input.brand_name,
      market_context: input.market_context,
      category: input.category,
      official_sources: [input.website_url],
      evidence: [],
    });
    expect(draft.verified_offerings).toEqual([]);
    expect(draft.warnings.join(" ")).toContain(
      "completed without a usable structured draft",
    );
    expect(draft.warnings.join(" ")).toContain(
      "No extracted business facts were retained",
    );
    expect(extractionDraftSchema.parse(draft)).toEqual(draft);
  });

  it("explains an output-limit completion without retrying or retaining partial content", () => {
    const draft = extractionDraftOrManualFallback(input, {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [],
      output_parsed: null,
    });

    expect(draft.warnings[0]).toContain("reached its output limit");
    expect(draft.evidence).toEqual([]);
    expect(draft.entity_scope).toBe("");
    expect(draft.target_customer).toBe("");
  });

  it("returns a valid parsed draft unchanged", () => {
    const parsed = extractionDraftOrManualFallback(input, {
      status: "completed",
      incomplete_details: null,
      output: [],
      output_parsed: {
        brand_name: "Extracted brand",
        entity_scope: "Extracted entity",
        brand_type: "Extracted type",
        category: "Extracted category",
        market_context: "Extracted market",
        target_customer: "Extracted customer",
        official_sources: [input.website_url],
        verified_offerings: ["Extracted offer"],
        verified_customer_needs: [],
        verified_decision_criteria: [],
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
    });

    expect(parsed.brand_name).toBe("Extracted brand");
    expect(parsed.verified_offerings).toEqual(["Extracted offer"]);
    expect(parsed.warnings).toEqual([]);
  });
});

describe("live website extraction", () => {
  const input = {
    website_url: "https://klinikgigisehat.example",
    brand_name: "Klinik Gigi Sehat",
    market_context: "Depok, Jawa Barat",
    category: "klinik gigi",
    safety_identifier: "fixture-user-123",
    budget: fixtureBudget,
  };

  function extractionResponse(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      model: "gpt-5.6-luna",
      id: "resp_extract",
      status: "completed",
      service_tier: "default",
      incomplete_details: null,
      output: [],
      output_parsed: null,
      usage: {
        input_tokens: 900,
        input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        output_tokens: 1_200,
        output_tokens_details: { reasoning_tokens: 200 },
        total_tokens: 2_100,
      },
      ...overrides,
    };
  }

  const parsedDraft = {
    brand_name: "Klinik Gigi Sehat",
    entity_scope: "Klinik Gigi Sehat di Depok",
    brand_type: "klinik gigi",
    category: "klinik gigi",
    market_context: "Depok, Jawa Barat",
    target_customer: "Keluarga di Depok",
    official_sources: ["https://klinikgigisehat.example"],
    verified_offerings: ["Perawatan gigi umum"],
    verified_customer_needs: [],
    verified_decision_criteria: [],
    brand_name_variants: [],
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    evidence: [],
    warnings: [],
  };

  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-dummy-key");
    delete process.env.OPENAI_AUDIT_MODEL;
    mockResponsesParse.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bounds the drafted lists so a rich website cannot overrun the allowance", async () => {
    mockResponsesParse.mockResolvedValue(
      extractionResponse({ output_parsed: parsedDraft }),
    );

    await extractBusinessDraft(input);

    const request = mockResponsesParse.mock.calls[0][0];
    expect(request.max_output_tokens).toBe(16_000);
    expect(request.input[0].content).toContain(
      "Return at most eight items in any list.",
    );
    expect(request.input[0].content).toContain(
      "Return at most twelve evidence records",
    );
    expect(request.input[0].content).not.toContain("previous attempt");
  });

  it("carries an unverified identity into extraction without treating it as confirmed", async () => {
    mockResponsesParse.mockResolvedValue(
      extractionResponse({ output_parsed: parsedDraft }),
    );

    await extractBusinessDraft({ ...input, identity_unverified: true });

    const request = mockResponsesParse.mock.calls[0][0];
    expect(request.input[0].content).toContain(
      "The supplied brand name is unverified.",
    );
    expect(JSON.parse(request.input[1].content)).toMatchObject({
      supplied_brand_name_unverified: true,
    });
  });

  it("retries once with a stricter brevity instruction after an output-limit truncation", async () => {
    // `docs/journey/03-business-facts.md`: an empty structured output is retried
    // once within the preparation allowance before manual entry.
    mockResponsesParse
      .mockResolvedValueOnce(
        extractionResponse({
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
        }),
      )
      .mockResolvedValueOnce(
        extractionResponse({
          id: "resp_extract_retry",
          output_parsed: parsedDraft,
        }),
      );

    const result = await extractBusinessDraft(input);

    expect(mockResponsesParse).toHaveBeenCalledTimes(2);
    expect(mockResponsesParse.mock.calls[1][0].input[0].content).toContain(
      "The previous attempt ran past its output limit.",
    );
    expect(result.draft.warnings).toEqual([]);
    expect(result.draft.entity_scope).toBe("Klinik Gigi Sehat di Depok");
    expect(result.response_id).toBe("resp_extract_retry");
    expect(result.telemetry).toHaveLength(2);
    expect(result.telemetry.map((call) => call.attempt)).toEqual([1, 2]);
  });

  it("opens the manual brief when the single retry also returns nothing usable", async () => {
    mockResponsesParse.mockResolvedValue(
      extractionResponse({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
      }),
    );

    const result = await extractBusinessDraft(input);

    expect(mockResponsesParse).toHaveBeenCalledTimes(2);
    expect(result.draft.warnings[0]).toContain("reached its output limit");
    expect(result.draft.warnings[1]).toContain("retried the automatic");
    expect(result.draft.warnings[2]).toContain(
      "No extracted business facts were retained",
    );
    expect(extractionDraftSchema.parse(result.draft)).toEqual(result.draft);
  });

  it("keeps the first attempt's diagnosis when the retry itself fails", async () => {
    mockResponsesParse
      .mockResolvedValueOnce(extractionResponse())
      .mockRejectedValueOnce(new Error("simulated provider timeout"));

    const result = await extractBusinessDraft(input);

    expect(result.draft.warnings[0]).toContain(
      "completed without a usable structured draft",
    );
    expect(result.telemetry).toHaveLength(2);
    expect(result.telemetry[1].status).toBe("failed");
    expect(result.telemetry[1].failure_reason).toBe(
      "simulated provider timeout",
    );
  });

  it("does not retry a first attempt that failed outright", async () => {
    mockResponsesParse.mockRejectedValue(new Error("simulated provider 500"));

    await expect(extractBusinessDraft(input)).rejects.toThrow(
      "simulated provider 500",
    );
    expect(mockResponsesParse).toHaveBeenCalledTimes(1);
  });

  it("falls back to the manual brief instead of retrying past the cost ceiling", async () => {
    // The first attempt fits the remaining headroom; its own recorded spend
    // then leaves too little for the ~USD 0.41 a second extract call reserves.
    mockResponsesParse.mockResolvedValue(
      extractionResponse({
        usage: {
          input_tokens: 300_000,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
          output_tokens: 16_000,
          output_tokens_details: { reasoning_tokens: 2_000 },
          total_tokens: 316_000,
        },
      }),
    );

    const result = await extractBusinessDraft({
      ...input,
      budget: {
        ...fixtureBudget,
        calls: [fixtureCallTelemetry({ accounted_cost_usd: 4.45 })],
      },
    });

    expect(mockResponsesParse).toHaveBeenCalledTimes(1);
    expect(result.draft.warnings.join(" ")).not.toContain(
      "retried the automatic",
    );
    expect(result.telemetry).toHaveLength(1);
  });
});

describe("structured output failures", () => {
  it("explains the provider completion state without retaining its content", () => {
    expect(() =>
      structuredOutputOrThrow(null, "Report generation", {
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output: [],
      }),
    ).toThrow(
      "Report generation did not return usable structured data. Provider status: incomplete; incomplete reason: max_output_tokens; no output text was returned.",
    );
  });

  it("returns a parsed value unchanged", () => {
    expect(
      structuredOutputOrThrow({ ok: true }, "Report generation", {
        status: "completed",
        incomplete_details: null,
        output: [],
      }),
    ).toEqual({ ok: true });
  });
});

describe("audit source titles", () => {
  it("preserves a provider title that fits the observation contract", () => {
    expect(
      normalizeSourceTitle("  Example source title  ", "https://example.com"),
    ).toBe("Example source title");
  });

  it("shortens an overlong provider title without changing its URL", () => {
    const url = "https://example.com/source";
    const title = "Source title ".repeat(40);
    const normalized = { url, title: normalizeSourceTitle(title, url) };

    expect(normalized.title.length).toBeLessThanOrEqual(
      SOURCE_TITLE_MAX_LENGTH,
    );
    expect(normalized.title.endsWith("…")).toBe(true);
    expect(normalized.url).toBe(url);
    expect(sourceSchema.parse(normalized)).toEqual(normalized);
  });

  it("uses a contract-safe display title when a long URL has no title", () => {
    const url = `https://example.com/?query=${"a".repeat(400)}`;
    const normalized = { url, title: normalizeSourceTitle(undefined, url) };

    expect(normalized.title.length).toBeLessThanOrEqual(
      SOURCE_TITLE_MAX_LENGTH,
    );
    expect(sourceSchema.parse(normalized).url).toBe(url);
  });
});

describe("versioned neutral observation instruction (Spec 003 R-14)", () => {
  const brief: BusinessBrief = {
    brand_name: "Klinik Gigi Sehat",
    entity_scope: "Klinik Gigi Sehat di Depok",
    brand_type: "klinik gigi",
    category: "klinik gigi",
    market_context: "Depok, Jawa Barat",
    target_customer: "RAHASIA-TARGET-PELANGGAN",
    official_sources: ["https://klinikgigisehat.example"],
    verified_offerings: ["RAHASIA-LAYANAN-UNGULAN"],
    verified_customer_needs: [],
    verified_decision_criteria: [],
    verified_competitor: {
      name: "Klinik Gigi Lain",
      scope: "Depok",
      source_url: "https://klinikgigilain.example",
    },
    brand_name_variants: [],
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  };

  const prompt: AuditPrompt = {
    prompt_id: "NUAVE-BRAND-VALIDATION-01",
    category: "validation",
    role: "Verify an important public fact",
    branded: true,
    question: "Apakah Klinik Gigi Sehat buka pada akhir pekan di Depok?",
    rationale: "Validasi fakta publik yang penting.",
    inputs_used: ["brand_name"],
    review_status: "needs_human_review",
  };

  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-dummy-key");
    delete process.env.OPENAI_AUDIT_MODEL;
    mockResponsesCreate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults the live observation path to the neutral Indonesian instruction", () => {
    expect(DEFAULT_OBSERVATION_INSTRUCTION_VERSION).toBe(
      OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
    );
    const text = observationInstructionText(
      DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
    );
    expect(text).toContain(
      "Jawab pertanyaan pengguna secara alami dalam Bahasa Indonesia.",
    );
    expect(text).toContain("Gunakan pencarian web.");
    expect(text).toContain(
      "Jangan membahas Nuave, audit, skor, metodologi, atau cara pertanyaan dibuat.",
    );
    expect(text).toContain("Jangan mengutamakan bisnis tertentu.");
    expect(text).toContain(
      "Jika informasi publik tidak lengkap atau berbeda, jelaskan ketidakpastiannya.",
    );
    expect(text).not.toContain(
      "Answer the user's question naturally in English",
    );
  });

  it("keeps the legacy English instruction available under its own version", () => {
    const legacy = observationInstructionText(
      OBSERVATION_INSTRUCTION_VERSION_LEGACY_EN,
    );
    expect(legacy).toContain(
      "Answer the user's question naturally in English as a standalone customer query.",
    );
    expect(legacy).not.toContain("Bahasa Indonesia");
  });

  it("sends only the Indonesian instruction and the exact locked question on the live path", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text:
        "Klinik Gigi Sehat di Depok buka pada akhir pekan mulai pukul 09.00.",
      model: "gpt-5.6-luna",
      id: "resp_live_instruction_test",
      created_at: 1_752_000_000,
      output: [
        {
          type: "web_search_call",
          id: "ws_call_1",
          action: {
            type: "search",
            sources: [
              {
                type: "url",
                url: "https://klinikgigisehat.example/jadwal",
                title: "Klinik Gigi Sehat — Jadwal",
              },
            ],
          },
        },
        {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "Klinik Gigi Sehat di Depok buka pada akhir pekan mulai pukul 09.00.",
              annotations: [],
            },
          ],
        },
      ],
      status: "completed",
      service_tier: "default",
      usage: {
        input_tokens: 120,
        input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        output_tokens: 40,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 160,
      },
    });

    const observation = await executeAuditPrompt({
      prompt,
      brief,
      safety_identifier: "fixture-user-123",
      budget: fixtureBudget,
    });

    expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
    const request = mockResponsesCreate.mock.calls[0][0];
    expect(request.input).toHaveLength(2);
    expect(request.input[0]).toEqual({
      role: "developer",
      content: observationInstructionText(
        DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
      ),
    });
    expect(request.input[1]).toEqual({
      role: "user",
      content: prompt.question,
    });
    // No business brief and no secret context reach the provider (R-15).
    const serialized = JSON.stringify(request);
    expect(serialized).not.toContain("RAHASIA-TARGET-PELANGGAN");
    expect(serialized).not.toContain("RAHASIA-LAYANAN-UNGULAN");
    expect(serialized).not.toContain("verified_offerings");

    expect(observation.run_status).toBe("completed");
    expect(observation.instruction_version).toBe(
      OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
    );
    expect(auditObservationSchema.safeParse(observation).success).toBe(true);
  });

  it("records the instruction version on a failed live attempt too", async () => {
    mockResponsesCreate.mockRejectedValue(
      new Error("simulated provider timeout"),
    );

    const observation = await executeAuditPrompt({
      prompt,
      brief,
      safety_identifier: "fixture-user-123",
      budget: fixtureBudget,
    });

    expect(observation.run_status).toBe("failed");
    expect(observation.instruction_version).toBe(
      OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
    );
    expect(auditObservationSchema.safeParse(observation).success).toBe(true);
  });

  it("treats a completed response without executed web search as a retryable technical failure", async () => {
    // Spec 003 R-16/R-18: web search is required for every observation. A
    // response that never executed the search tool is NOT an evaluable
    // non-appearance — it is a technical failure the 1+2 retry policy reruns.
    mockResponsesCreate.mockResolvedValue({
      output_text: "Klinik Gigi Sehat buka di Depok pada akhir pekan.",
      model: "gpt-5.6-luna",
      id: "resp_no_search",
      created_at: 1_752_000_000,
      output: [
        {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "Klinik Gigi Sehat buka di Depok pada akhir pekan.",
              annotations: [],
            },
          ],
        },
      ],
      status: "completed",
      service_tier: "default",
      usage: {
        input_tokens: 120,
        input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        output_tokens: 40,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 160,
      },
    });

    const observation = await executeAuditPrompt({
      prompt,
      brief,
      safety_identifier: "fixture-user-123",
      budget: fixtureBudget,
    });

    expect(observation.run_status).toBe("failed");
    expect(observation.failure_reason).toContain("web search did not execute");
    expect(observation.sources).toEqual([]);
    expect(auditObservationSchema.safeParse(observation).success).toBe(true);
  });
});
