import { describe, expect, it } from "vitest";
import {
  buildDeterministicIndonesianPack,
  minimizeIndonesianBrief,
  validateCanonicalIndonesianQuestionPack,
} from "@/lib/audit/questions-id";
import { AUDIT_MEASUREMENT_MATRIX } from "@/lib/audit/measurement-matrix";
import type { BusinessBrief, PromptPack } from "@/lib/audit/types";
import { introducedQuestionEditIssues } from "./questionEditTransaction";

const brief: BusinessBrief = {
  brand_name: "Kopi Sudut",
  entity_scope: "Seluruh brand Kopi Sudut",
  brand_type: "Kedai kopi",
  category: "Kedai kopi",
  market_context: "Jakarta Selatan",
  target_customer: "Pekerja kantoran di sekitar kantor",
  official_sources: ["https://kopisudut.id/"],
  verified_offerings: ["Kopi susu"],
  verified_customer_needs: ["Tempat kerja nyaman"],
  verified_decision_criteria: ["Harga masuk akal"],
  verified_competitor: {
    name: "Kopi Sebelah",
    scope: "",
    source_url: "",
  },
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "Kopi susu",
  conversion_action: "",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

function basePrompts(): PromptPack["prompts"] {
  const questions = buildDeterministicIndonesianPack(
    minimizeIndonesianBrief(brief),
  );
  return questions.map((question, index) => ({
    prompt_id: `NVA-ID-${String(index + 1).padStart(2, "0")}`,
    category: AUDIT_MEASUREMENT_MATRIX[index].category,
    role: "test role",
    branded:
      AUDIT_MEASUREMENT_MATRIX[index].auditedBrandIdentity === "required",
    question,
    rationale: "test rationale",
    inputs_used: ["brand_name"],
    review_status: "needs_human_review" as const,
  }));
}

describe("introducedQuestionEditIssues", () => {
  it("starts from a valid deterministic pack", () => {
    expect(
      validateCanonicalIndonesianQuestionPack(
        basePrompts().map((prompt) => prompt.question),
        minimizeIndonesianBrief(brief),
      ),
    ).toEqual([]);
  });

  it("accepts a clean edit without introducing issues", () => {
    const introduced = introducedQuestionEditIssues({
      brief,
      prompts: basePrompts(),
      index: 0,
      draft:
        "Untuk pekerja kantoran, kedai kopi apa yang cocok di Jakarta Selatan?",
    });
    expect(introduced).toEqual([]);
  });

  it("blocks a forbidden brand mention on an unnamed slot", () => {
    const introduced = introducedQuestionEditIssues({
      brief,
      prompts: basePrompts(),
      index: 0,
      draft: "Apa saja rekomendasi Kopi Sudut di Jakarta Selatan?",
    });
    expect(introduced.map((issue) => issue.rule)).toContain("identity_leakage");
  });

  it("blocks a duplicate of another slot's question even though the validator blames the later slot", () => {
    const prompts = basePrompts();
    const introduced = introducedQuestionEditIssues({
      brief,
      prompts,
      index: 0,
      draft: prompts[4].question,
    });
    const distinctness = introduced.find(
      (issue) => issue.rule === "distinctness",
    );
    expect(distinctness).toBeDefined();
    expect(distinctness?.slot).toBe(5);
    expect(distinctness?.message).toBe(
      "Pertanyaan ini sama dengan pertanyaan lain dalam paket. Setiap pertanyaan harus berbeda.",
    );
  });

  it("blocks an edit that breaks the 6/4 composition", () => {
    const prompts = basePrompts();
    const introduced = introducedQuestionEditIssues({
      brief,
      prompts,
      index: 6,
      draft: prompts[0].question,
    });
    const composition = introduced.find(
      (issue) => issue.rule === "composition",
    );
    expect(composition).toBeDefined();
    expect(composition?.slot).toBeNull();
  });

  it("does not block on issues the pack already carried", () => {
    const prompts = basePrompts();
    prompts[0] = { ...prompts[0], question: prompts[1].question };
    const introduced = introducedQuestionEditIssues({
      brief,
      prompts,
      index: 9,
      draft:
        "Siapa yang cocok memilih Kopi Sudut, siapa yang kurang cocok, dan apa trade-offnya?",
    });
    expect(introduced).toEqual([]);
  });
});
