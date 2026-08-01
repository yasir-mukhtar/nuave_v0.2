import { describe, expect, it } from "vitest";
import {
  PROMPT_MATRIX,
  buildAuditReport,
  validatePromptPack,
  validateReportContent,
} from "./contracts";
import type {
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
  ReportContent,
} from "./types";

const brief: BusinessBrief = {
  brand_name: "Nuave Test",
  entity_scope: "Nuave Test Indonesia",
  brand_type: "B2B service",
  category: "audit visibilitas AI",
  market_context: "Indonesia",
  target_customer: "agency pemasaran",
  official_sources: ["https://example.com"],
  verified_offerings: ["audit visibilitas AI"],
  verified_customer_needs: [
    "memeriksa rekomendasi AI",
    "memeriksa akurasi informasi",
  ],
  verified_decision_criteria: [
    "bukti yang dapat diperiksa",
    "laporan yang dapat dibagikan",
  ],
  verified_competitor: {
    name: "Kompetitor Test",
    scope: "Indonesia",
    source_url: "https://competitor.example.com",
  },
  brand_name_variants: ["Nuave"],
  priority_offering: "audit visibilitas AI",
  conversion_action: "minta audit",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "id-ID",
  agency_name: "",
  agency_logo_data_url: "",
};

const prompts: AuditPrompt[] = PROMPT_MATRIX.map(
  ([prompt_id, category, branded, role], index) => ({
    prompt_id,
    category,
    role,
    branded,
    question: branded
      ? `Apa informasi publik tentang Nuave Test untuk kebutuhan ${index + 1}?`
      : `Bagaimana memilih layanan audit untuk kebutuhan ${index + 1}?`,
    rationale: "Mewakili intent yang ditentukan.",
    inputs_used: ["market_context"],
    review_status: "needs_human_review",
  }),
);

const observations: AuditObservation[] = prompts.map((prompt, index) => ({
  prompt_id: prompt.prompt_id,
  category: prompt.category,
  branded: prompt.branded,
  question: prompt.question,
  system: "OpenAI Responses API",
  requested_model: "gpt-5.6",
  returned_model: "gpt-5.6-sol",
  response_id: `resp_${index}`,
  observed_at: "2026-07-31T10:00:00.000Z",
  raw_answer:
    index === 0
      ? "Nuave Test dapat dipertimbangkan."
      : "Jawaban tidak menyebut brand audit.",
  sources: [{ url: "https://example.com", title: "Example" }],
  run_status: "completed",
  failure_reason: "",
}));

function reportContent(): ReportContent {
  return {
    conclusion: "Hasil pengujian menunjukkan temuan yang perlu diperiksa.",
    accuracy_status: "perlu_diperbaiki",
    key_findings: [
      {
        title: "Temuan",
        explanation: "Penjelasan",
        evidence_prompt_ids: [prompts[0].prompt_id],
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "kerjakan_lebih_dulu",
        action: "Perjelas informasi resmi",
        why: "Informasi perlu diverifikasi.",
        basis: "Jawaban pengujian",
        owner: "marketing",
        done_when: "Informasi resmi konsisten.",
        evidence_prompt_ids: [prompts[0].prompt_id],
        caveat: "Tidak menjamin rekomendasi.",
      },
    ],
    details: prompts.map((prompt, index) => ({
      prompt_id: prompt.prompt_id,
      status: index === 0 ? "mentioned_not_recommended" : "did_not_appear",
      finding: "Temuan berdasarkan jawaban.",
      answer_excerpt: observations[index].raw_answer,
      evidence_note: "Diperiksa dari observasi.",
      source_urls: ["https://example.com"],
    })),
    methodology_note: "Sepuluh pertanyaan diuji secara independen.",
  };
}

describe("prompt-pack contract", () => {
  it("accepts the exact Intent-5 matrix", () => {
    expect(validatePromptPack(prompts, brief)).toEqual([]);
  });

  it("blocks brand leakage in an unbranded question", () => {
    const leaked = prompts.map((prompt, index) =>
      index === 0 ? { ...prompt, question: "Apakah Nuave bagus?" } : prompt,
    );
    expect(validatePromptPack(leaked, brief).join(" ")).toContain(
      "membocorkan",
    );
  });
});

describe("report evidence guardrails", () => {
  it("accepts report details that trace to the retained observations", () => {
    expect(validateReportContent(reportContent(), observations, brief)).toEqual(
      [],
    );
  });

  it("rejects a visibility claim without a literal brand mention", () => {
    const content = reportContent();
    content.details[1].status = "appeared_as_recommendation";
    expect(
      validateReportContent(content, observations, brief).join(" "),
    ).toContain("tanpa penyebutan brand");
  });

  it("derives counts from detail statuses rather than model-supplied totals", () => {
    const report = buildAuditReport(reportContent(), observations);
    expect(report.counts).toEqual({
      unbranded_recommended: 0,
      unbranded_mentioned: 1,
      unbranded_total: 5,
      branded_recognized: 0,
      branded_total: 5,
      failed: 0,
    });
    expect(report.system_label).toContain("gpt-5.6-sol");
  });
});
