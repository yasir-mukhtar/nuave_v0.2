import { afterEach, describe, expect, it, vi } from "vitest";
import { generatedSuggestionGuardIssues } from "./question-suggestion-guards";
import { buildLiveIndonesianPromptPack } from "./questions-id-live";
import {
  buildDeterministicIndonesianPack,
  minimizeIndonesianBrief,
} from "./questions-id";
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

const minimizedBrief = minimizeIndonesianBrief(brief);
const validQuestions = buildDeterministicIndonesianPack(minimizedBrief);

const clearlyEnglishQuestions = [
  "Which coffee shop options are recommended near Depok?",
  "What situation makes customers look for coffee shops near Depok?",
  "Which coffee shop options are suitable for customer needs near Depok?",
  "Where can I find milk coffee for customers near Depok?",
  "Which coffee shops should I compare for a shortlist near Depok?",
  "How can I compare unnamed coffee shop options near Depok?",
  "Does Kopi Taman Senja fit a customer need near Depok?",
  "Would you recommend Kopi Taman Senja for customers in Depok?",
  "How does Kopi Taman Senja compare with Kopi Pesaing in Depok?",
  "Who does Kopi Taman Senja suit, who may it not suit, and what are the trade-offs?",
];

function mixedLanguagePack(englishCount: number) {
  return clearlyEnglishQuestions.map((question, index) =>
    index < englishCount ? question : validQuestions[index],
  );
}

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
        content: [{ type: "output_text", text: JSON.stringify({ questions }) }],
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

  it("detects an advertised default outside the canonical composition", () => {
    const unbalanced = validQuestions.slice();
    unbalanced[0] = "Apakah Kopi Taman Senja cocok untuk ngopi di Depok?";
    expect(
      validQuestions.filter((question) => question.includes(brief.brand_name)),
    ).toHaveLength(4);
    expect(
      generatedSuggestionGuardIssues(
        unbalanced,
        minimizeIndonesianBrief(brief),
      ),
    ).toContain("default_composition_not_canonical");
  });

  it("rejects a fully clearly-English model default", () => {
    expect(
      generatedSuggestionGuardIssues(
        clearlyEnglishQuestions,
        minimizeIndonesianBrief(brief),
      ),
    ).toContain("clearly_non_indonesian_output");
  });

  it("rejects the Wave 3 seven-English / three-Indonesian reproduction", () => {
    const issues = generatedSuggestionGuardIssues(
      mixedLanguagePack(7),
      minimizeIndonesianBrief(brief),
    );
    expect(issues).toContain("clearly_non_indonesian_output");
    expect(issues).not.toContain("default_composition_not_canonical");
  });

  it("enforces the adopted majority boundary at six clearly-English questions", () => {
    const issues = generatedSuggestionGuardIssues(
      mixedLanguagePack(6),
      minimizeIndonesianBrief(brief),
    );
    expect(issues).toContain("clearly_non_indonesian_output");
    expect(issues).not.toContain("default_composition_not_canonical");
  });

  it("does not classify a five-English / five-Indonesian default as majority-English", () => {
    const issues = generatedSuggestionGuardIssues(
      mixedLanguagePack(5),
      minimizeIndonesianBrief(brief),
    );
    expect(issues).not.toContain("clearly_non_indonesian_output");
    expect(issues).not.toContain("default_composition_not_canonical");
  });

  it("detects compact or punctuation-mutated competitor leakage outside slot 6", () => {
    const leaking = validQuestions.slice();
    leaking[1] =
      "Ada pilihan seperti Kopi-Pesaing untuk tempat ngopi di Depok?";
    expect(
      generatedSuggestionGuardIssues(leaking, minimizeIndonesianBrief(brief)),
    ).toContain("compact_competitor_leakage:2");
  });

  it("repairs the unsafe slot before display and records truthful provenance", async () => {
    stubMethod();
    const unbalanced = validQuestions.slice();
    unbalanced[0] = "Apakah Kopi Taman Senja cocok untuk ngopi di Depok?";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(providerBody(unbalanced)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const result = await buildLiveIndonesianPromptPack({ brief });
    expect(result.generation.source).toBe("model");
    expect(result.generation.warnings).toContain("slot_safety_repair:1");
    expect(result.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 6,
      menyebut_bisnis_anda: 4,
    });
    expect(
      result.pack.prompts.every(
        (prompt) =>
          prompt.inputs_used.length === 1 &&
          prompt.inputs_used[0] === "confirmed_business_facts",
      ),
    ).toBe(true);
  });

  it("never returns a majority-English provider pack as successful id-ID model output", async () => {
    stubMethod();
    const badGeneratedPack = mixedLanguagePack(7);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(providerBody(badGeneratedPack)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const result = await buildLiveIndonesianPromptPack({ brief });
    expect(result.pack.language).toBe("id-ID");
    expect(result.generation.source).toBe("fallback");
    expect(result.generation.warnings).toContain(
      "clearly_non_indonesian_output",
    );
    expect(result.pack.prompts.map((prompt) => prompt.question)).not.toEqual(
      badGeneratedPack,
    );
  });
});
