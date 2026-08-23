import { afterEach, describe, expect, it, vi } from "vitest";
import { generatedSuggestionGuardIssues } from "./question-suggestion-guards";
import { buildLiveIndonesianPromptPack } from "./questions-id-live";
import { minimizeIndonesianBrief } from "./questions-id";
import type { BusinessBrief } from "./types";

const brief: BusinessBrief = {
  brand_name: "Kopi Taman Senja",
  entity_scope: "Depok",
  brand_type: "Kedai kopi",
  category: "Kedai kopi",
  market_context: "Depok",
  target_customer: "Warga Depok yang mencari tempat ngopi",
  official_sources: ["https://kopitamansenja.example"],
  verified_offerings: ["kopi susu", "manual brew"],
  verified_customer_needs: ["tempat ngopi"],
  verified_decision_criteria: ["lokasi", "jam buka"],
  verified_competitor: {
    name: "Kopi Pesaing",
    scope: "Depok",
    source_url: "https://kopipesaing.example",
  },
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "kopi susu",
  conversion_action: "datang ke kedai",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

const validQuestions = [
  "Ada rekomendasi kedai kopi di Depok?",
  "Saya cari tempat ngopi yang nyaman di Depok.",
  "Kedai kopi apa saja yang tersedia di Depok?",
  "Di mana ada kopi susu di Depok?",
  "Bandingkan pilihan kedai kopi di Depok.",
  "Bandingkan Kopi Taman Senja dengan Kopi Pesaing di Depok.",
  "Apa saja yang disediakan Kopi Taman Senja?",
  "Di mana alamat Kopi Taman Senja dan buka jam berapa?",
  "Bagaimana cara datang ke Kopi Taman Senja?",
  "Apakah Kopi Taman Senja menyediakan manual brew?",
];

function stubMethod() {
  vi.stubEnv("OPENCODEGO_API_KEY", "test-dummy-key");
  vi.stubEnv("OPENAI_API_KEY", "test-compatibility-key");
  vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
  vi.stubEnv("OPENAI_BASE_URL", "https://opencode.ai/zen/go/v1");
  vi.stubEnv("OPENAI_AUDIT_MODEL", "gpt-5.6-luna");
  vi.stubEnv("OPENAI_AUDIT_REASONING_EFFORT", "low");
}

function providerBody(questions: string[]) {
  return {
    id: "resp_wave2_prompts",
    model: "gpt-5.6-luna",
    status: "completed",
    usage: { input_tokens: 100, output_tokens: 100, total_tokens: 200 },
    output: [
      {
        type: "message",
        content: [
          { type: "output_text", text: JSON.stringify({ questions }) },
        ],
      },
    ],
  };
}

describe("Wave 2 generated suggestion guards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("accepts a valid default suggestion without inventing a warning", () => {
    expect(
      generatedSuggestionGuardIssues(
        validQuestions,
        minimizeIndonesianBrief(brief),
      ),
    ).toEqual([]);
  });

  it("detects an advertised default that is not actually 5/5", () => {
    const unbalanced = validQuestions.slice();
    unbalanced[0] = "Apakah Kopi Taman Senja cocok untuk ngopi di Depok?";
    expect(
      generatedSuggestionGuardIssues(unbalanced, minimizeIndonesianBrief(brief)),
    ).toContain("default_composition_not_five_five");
  });

  it("detects clearly non-Indonesian model output", () => {
    const english = [
      "What coffee shop is recommended near Depok?",
      "Where can I find coffee with a quiet place?",
      "Which coffee shops are available for customers in Depok?",
      "Where can I get milk coffee near Depok?",
      "How do I compare coffee shop options in Depok?",
      "How does Kopi Taman Senja compare with Kopi Pesaing?",
      "What does Kopi Taman Senja offer for customers?",
      "Where is Kopi Taman Senja and when is it open?",
      "How can I visit Kopi Taman Senja?",
      "Does Kopi Taman Senja offer manual brew?",
    ];
    expect(
      generatedSuggestionGuardIssues(english, minimizeIndonesianBrief(brief)),
    ).toContain("clearly_non_indonesian_output");
  });

  it("detects compact or punctuation-mutated competitor leakage outside slot 6", () => {
    const leaking = validQuestions.slice();
    leaking[1] = "Ada pilihan seperti Kopi-Pesaing untuk tempat ngopi di Depok?";
    expect(
      generatedSuggestionGuardIssues(leaking, minimizeIndonesianBrief(brief)),
    ).toContain("compact_competitor_leakage:2");
  });

  it("falls back before display when model output breaks the default composition and records truthful provenance", async () => {
    stubMethod();
    const unbalanced = validQuestions.slice();
    unbalanced[0] = "Apakah Kopi Taman Senja cocok untuk ngopi di Depok?";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(providerBody(unbalanced)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await buildLiveIndonesianPromptPack({ brief });
    expect(result.generation.source).toBe("fallback");
    expect(result.generation.warnings).toContain(
      "default_composition_not_five_five",
    );
    expect(result.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 5,
      menyebut_bisnis_anda: 5,
    });
    expect(
      result.pack.prompts.every(
        (prompt) =>
          prompt.inputs_used.length === 1 &&
          prompt.inputs_used[0] === "confirmed_business_facts",
      ),
    ).toBe(true);
  });
});
