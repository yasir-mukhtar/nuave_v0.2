import { createInitialExtractedAuditWorkflowState } from "@/lib/audit/workflow-storage";
import {
  buildDeterministicIndonesianPack,
  minimizeIndonesianBrief,
} from "@/lib/audit/questions-id";
import { AUDIT_MEASUREMENT_MATRIX } from "@/lib/audit/measurement-matrix";
import type { BusinessBrief, PromptPack } from "@/lib/audit/types";

/** Fictional presentation-only data. Never written to the workflow session. */
export function createDemoState() {
  const state = createInitialExtractedAuditWorkflowState({
    websiteUrl: "https://example.com/",
    draft: {
      brand_name: "Kopi Sudut",
      entity_scope: "Seluruh brand Kopi Sudut",
      brand_type: "Kedai kopi",
      category: "Kedai kopi",
      market_context: "Jakarta Selatan",
      target_customer: "Pekerja jarak jauh dan warga sekitar",
      official_sources: ["https://example.com/"],
      verified_offerings: [
        "Kopi susu",
        "Kopi hitam",
        "Makanan ringan",
        "Biji kopi",
      ],
      verified_customer_needs: ["Tempat bekerja", "Bertemu teman"],
      verified_decision_criteria: ["Suasana nyaman", "Lokasi mudah dijangkau"],
      similar_businesses: [
        { name: "Kopi Sebelah", source_url: "", origin: "ai" },
      ],
      brand_name_variants: [],
      priority_offering: "Kopi susu",
      conversion_action: "",
      customer_supplied_facts: ["Tersedia pilihan minuman tanpa kopi."],
      known_accuracy_questions: [],
      usp: "",
      regulated_category_notes: "",
      evidence: [],
      warnings: [],
    },
    telemetry: [],
  });
  return {
    ...state,
    brief: {
      ...state.brief,
      verified_competitor: { name: "Kopi Sebelah", scope: "", source_url: "" },
      customer_supplied_facts: ["Tersedia pilihan minuman tanpa kopi."],
    },
    meta: {
      ...state.meta,
      identityUnverified: false,
      comparisonStatus: "confirmed" as const,
    },
  };
}

export function createDemoPack(brief: BusinessBrief): PromptPack {
  const questions = buildDeterministicIndonesianPack(
    minimizeIndonesianBrief(brief),
  );
  return {
    status: "draft_for_review",
    prompt_pack_version: "fictional-intake-preview-v1",
    language: "id-ID",
    target_product: "ChatGPT",
    brand: {
      brand_name: brief.brand_name,
      entity_scope: brief.entity_scope,
      brand_type: brief.brand_type,
      category: brief.category,
      market_context: brief.market_context,
      target_customer: brief.target_customer,
    },
    summary: { total_prompts: 10, unbranded_prompts: 6, branded_prompts: 4 },
    prompts: AUDIT_MEASUREMENT_MATRIX.map((slot, index) => ({
      prompt_id: `NVA-ID-${String(slot.order).padStart(2, "0")}`,
      category: slot.category,
      role: "Contoh pratinjau",
      branded: slot.auditedBrandIdentity === "required",
      question: questions[index],
      rationale: "Contoh fiktif untuk memeriksa tampilan pertanyaan.",
      inputs_used: [],
      review_status: "needs_human_review",
    })),
    self_check: {
      ten_prompts: true,
      one_prompt_per_slot: true,
      canonical_composition: true,
      no_brand_leakage: true,
      verified_inputs_only: true,
      verified_competitor_only: true,
      single_entity_scope: true,
      category_safety_pass: true,
      independent_natural_questions: true,
    },
    warnings: [],
  };
}
