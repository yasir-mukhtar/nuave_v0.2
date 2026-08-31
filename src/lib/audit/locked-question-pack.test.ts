import { describe, expect, it } from "vitest";
import {
  canonicalLockedQuestionPack,
  designatedVariancePrompts,
  lockedObservationBindingErrors,
  variancePromptBindingErrors,
} from "./locked-question-pack";
import {
  AUDIT_MEASUREMENT_MATRIX,
  COMPATIBILITY_COMPOSITION_COUNTS,
  measurementSlotForPromptId,
} from "./measurement-matrix";
import {
  assertSafeComparisonBusinessUrls,
  isValidSimilarBusinessUrl,
  rebindSimilarBusinessUrl,
} from "./similar-businesses";
import type { AuditObservation, AuditPrompt, BusinessBrief } from "./types";

function brief(): BusinessBrief {
  return {
    brand_name: "Kopi Nuave",
    entity_scope: "Jakarta",
    brand_type: "coffee shop",
    category: "coffee shop",
    market_context: "Jakarta",
    target_customer: "coffee drinkers",
    official_sources: ["https://kopinuave.example/"],
    verified_offerings: ["coffee"],
    verified_customer_needs: ["find coffee"],
    verified_decision_criteria: ["location"],
    verified_competitor: { name: "", scope: "", source_url: "" },
    similar_businesses: [],
    brand_name_variants: ["Nuave Coffee"],
    priority_offering: "coffee",
    conversion_action: "visit the shop",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  };
}

function prompts(): AuditPrompt[] {
  return AUDIT_MEASUREMENT_MATRIX.map((slot) => {
    const branded = slot.legacyBranded;
    return {
      prompt_id: `NVA-ID-${String(slot.order).padStart(2, "0")}`,
      category: slot.legacyCategory,
      role: "test",
      branded,
      question: branded
        ? `Apa yang perlu diketahui tentang Kopi Nuave untuk keputusan ${slot.order}?`
        : `Apa pilihan coffee shop di Jakarta untuk kebutuhan ${slot.order}?`,
      rationale: "test",
      inputs_used: ["brand_name"],
      review_status: "needs_human_review",
    };
  });
}

function legacyCategoryFor(promptId: string) {
  const slot = measurementSlotForPromptId(promptId);
  if (!slot) throw new Error(`Unknown canonical prompt ID: ${promptId}`);
  return slot.legacyCategory;
}

function observation(prompt: AuditPrompt): AuditObservation {
  return {
    prompt_id: prompt.prompt_id,
    category: prompt.category,
    branded: prompt.branded,
    question: prompt.question,
    instruction_version: "neutral-id-v1",
    system: "OpenCode Go Responses API",
    requested_model: "gpt-5.6-luna",
    returned_model: "gpt-5.6-luna",
    response_id: `resp-${prompt.prompt_id}`,
    observed_at: "2026-08-23T00:00:00.000Z",
    raw_answer: "Jawaban.",
    sources: [],
    run_status: "completed",
    failure_reason: "",
    telemetry: [],
  };
}

describe("canonical locked question pack", () => {
  it("keeps the compatibility pack at the matrix-derived 5/5 split", () => {
    const pack = prompts();
    expect(pack).toHaveLength(AUDIT_MEASUREMENT_MATRIX.length);
    expect(pack.filter((prompt) => prompt.branded)).toHaveLength(
      COMPATIBILITY_COMPOSITION_COUNTS.branded,
    );
    expect(pack.filter((prompt) => !prompt.branded)).toHaveLength(
      COMPATIBILITY_COMPOSITION_COUNTS.unbranded,
    );
  });

  it("rejects duplicate prompt IDs at the pre-execution lock boundary", () => {
    const pack = prompts();
    pack[9] = { ...pack[9], prompt_id: pack[0].prompt_id };
    expect(() => canonicalLockedQuestionPack(pack, brief())).toThrow(
      /must be unique/i,
    );
  });

  it("rejects a pack whose canonical prompt IDs are reordered", () => {
    const pack = prompts();
    [pack[0], pack[1]] = [pack[1], pack[0]];
    expect(() => canonicalLockedQuestionPack(pack, brief())).toThrow(
      /canonical slot order/i,
    );
  });

  it("overrides a tampered slot 1 category from the code-owned slot", () => {
    const pack = prompts();
    pack[0] = { ...pack[0], category: "action" };
    const canonical = canonicalLockedQuestionPack(pack, brief()).prompts;
    expect(canonical[0].category).toBe(
      legacyCategoryFor(canonical[0].prompt_id),
    );
  });

  it("overrides a tampered slot 7 category from the code-owned slot", () => {
    const pack = prompts();
    pack[6] = { ...pack[6], category: "comparison" };
    const canonical = canonicalLockedQuestionPack(pack, brief()).prompts;
    expect(canonical[6].category).toBe(
      legacyCategoryFor(canonical[6].prompt_id),
    );
  });

  it("recomputes branded independently of the code-owned slot category", () => {
    const pack = prompts();
    pack[0] = {
      ...pack[0],
      category: "action",
      branded: false,
      question: "Apakah Kopi Nuave cocok untuk rapat pagi di Jakarta?",
    };
    pack[5] = {
      ...pack[5],
      category: "need_discovery",
      branded: true,
      question: "Apa pilihan coffee shop dekat kantor di Jakarta?",
    };
    const canonical = canonicalLockedQuestionPack(pack, brief()).prompts;
    expect(canonical[0]).toMatchObject({
      category: legacyCategoryFor(canonical[0].prompt_id),
      branded: true,
    });
    expect(canonical[5]).toMatchObject({
      category: legacyCategoryFor(canonical[5].prompt_id),
      branded: false,
    });
  });

  it("canonicalizes variance designation after edits", () => {
    const pack = prompts();
    pack[0] = {
      ...pack[0],
      branded: false,
      question: "Apakah Kopi Nuave cocok untuk rapat pagi di Jakarta?",
    };
    pack[5] = {
      ...pack[5],
      branded: true,
      question: "Apa pilihan coffee shop dekat kantor di Jakarta?",
    };
    const ids = designatedVariancePrompts(pack, brief()).map(
      (prompt) => prompt.prompt_id,
    );
    expect(ids).toEqual(["NVA-ID-02", "NVA-ID-01"]);
  });

  it("canonicalizes tampered categories for variance designation and binding", () => {
    const pack = prompts();
    pack[0] = { ...pack[0], category: "action" };
    pack[5] = { ...pack[5], category: "validation" };

    const designated = designatedVariancePrompts(pack, brief());
    expect(
      designated.map((prompt) => ({
        prompt_id: prompt.prompt_id,
        category: prompt.category,
      })),
    ).toEqual([
      {
        prompt_id: "NVA-ID-01",
        category: legacyCategoryFor("NVA-ID-01"),
      },
      {
        prompt_id: "NVA-ID-06",
        category: legacyCategoryFor("NVA-ID-06"),
      },
    ]);

    const requested = designated.map((prompt) => ({
      ...prompt,
      category: "action" as const,
    }));
    expect(
      variancePromptBindingErrors({
        locked_prompts: pack,
        requested_prompts: requested,
        brief: brief(),
      }),
    ).toEqual([]);
  });

  it("rejects a resumed observation whose ID points at different question text", () => {
    const pack = canonicalLockedQuestionPack(prompts(), brief()).prompts;
    const mismatched = observation(pack[0]);
    mismatched.question = "Pertanyaan lain dengan ID yang sama";
    expect(
      lockedObservationBindingErrors({
        prompts: pack,
        observations: [mismatched],
        brief: brief(),
      }),
    ).toContain(
      `${pack[0].prompt_id}: observation question does not match the exact locked question.`,
    );
  });

  it("rejects an observation with a wrong category despite exact ID and text", () => {
    const pack = canonicalLockedQuestionPack(prompts(), brief()).prompts;
    const mismatched = observation(pack[0]);
    mismatched.category = "action";
    expect(
      lockedObservationBindingErrors({
        prompts: pack,
        observations: [mismatched],
        brief: brief(),
      }),
    ).toContain(
      `${pack[0].prompt_id}: observation category does not match the locked question.`,
    );
  });

  it("accepts an observation using the canonical slot category", () => {
    const pack = canonicalLockedQuestionPack(prompts(), brief()).prompts;
    expect(
      lockedObservationBindingErrors({
        prompts: pack,
        observations: [observation(pack[0])],
        brief: brief(),
      }),
    ).toEqual([]);
  });

  it("accepts only the exact designated variance subset", () => {
    const pack = canonicalLockedQuestionPack(prompts(), brief()).prompts;
    const designated = designatedVariancePrompts(pack, brief());
    expect(
      variancePromptBindingErrors({
        locked_prompts: pack,
        requested_prompts: designated,
        brief: brief(),
      }),
    ).toEqual([]);

    const arbitrary = [pack[1], pack[6]];
    expect(
      variancePromptBindingErrors({
        locked_prompts: pack,
        requested_prompts: arbitrary,
        brief: brief(),
      }).length,
    ).toBeGreaterThan(0);
  });
});

describe("comparison-business identity boundary", () => {
  it("clears an AI name when its source URL is edited", () => {
    const changed = rebindSimilarBusinessUrl(
      {
        name: "Business A",
        source_url: "https://business-a.example/",
        origin: "ai",
      },
      "https://business-b.example/",
    );
    expect(changed).toEqual({
      source_url: "https://business-b.example/",
      origin: "user",
    });
  });

  it("rejects credential-bearing comparison URLs before provider-bound use", () => {
    expect(
      isValidSimilarBusinessUrl("https://user:secret@example.com/path"),
    ).toBe(false);
    const unsafe = brief();
    unsafe.verified_competitor = {
      name: "Unsafe",
      scope: "",
      source_url: "https://user:secret@example.com/path",
    };
    expect(() => assertSafeComparisonBusinessUrls(unsafe)).toThrow(
      /must not contain embedded username or password credentials/i,
    );
  });
});
