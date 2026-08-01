import { describe, expect, it } from "vitest";
import {
  PROMPT_MATRIX,
  buildAuditReport,
  makeEvidenceExport,
  validatePromptPack,
  validateReportContent,
} from "./contracts";
import {
  REPORT_WRITING_STANDARD_VERSION,
  validateReportLanguage,
  validateReportLanguageRevision,
} from "./report-language";
import { businessBriefSchema } from "./types";
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
  category: "AI visibility audit",
  market_context: "Indonesia",
  target_customer: "marketing agency",
  official_sources: ["https://example.com"],
  verified_offerings: ["AI visibility audit"],
  verified_customer_needs: [
    "review AI recommendations",
    "check information accuracy",
  ],
  verified_decision_criteria: [
    "reviewable evidence",
    "a report that can be shared",
  ],
  verified_competitor: {
    name: "Test Competitor",
    scope: "Indonesia",
    source_url: "https://competitor.example.com",
  },
  brand_name_variants: ["Nuave"],
  priority_offering: "AI visibility audit",
  conversion_action: "request an audit",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
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
      ? `What public information is available about Nuave Test for need ${index + 1}?`
      : `How should I choose an audit service for need ${index + 1}?`,
    rationale: "Represents the specified intent.",
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
      ? "Nuave Test may be worth considering."
      : "The response does not name the audit brand.",
  sources: [{ url: "https://example.com", title: "Example" }],
  run_status: "completed",
  failure_reason: "",
}));

function reportContent(): ReportContent {
  return {
    conclusion: "The observations contain findings that need review.",
    accuracy_status: "needs_correction",
    key_findings: [
      {
        title: "Finding",
        explanation: "Explanation",
        evidence_prompt_ids: [prompts[0].prompt_id],
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "do_first",
        action: "Clarify the official information",
        why: "The information needs verification.",
        basis: "Observation response",
        owner: "marketing",
        done_when: "Official information is consistent.",
        evidence_prompt_ids: [prompts[0].prompt_id],
        caveat: "This does not guarantee a recommendation.",
      },
    ],
    details: prompts.map((prompt, index) => ({
      prompt_id: prompt.prompt_id,
      status: index === 0 ? "mentioned_not_recommended" : "did_not_appear",
      finding: "Finding based on the response.",
      answer_excerpt: observations[index].raw_answer,
      evidence_note: "The answer supports this result.",
      source_urls: ["https://example.com"],
    })),
  };
}

describe("prompt-pack contract", () => {
  it("accepts a brief without customer needs or decision criteria", () => {
    expect(
      businessBriefSchema.safeParse({
        ...brief,
        verified_customer_needs: [],
        verified_decision_criteria: [],
      }).success,
    ).toBe(true);
  });

  it("accepts the exact Intent-5 matrix", () => {
    expect(validatePromptPack(prompts, brief)).toEqual([]);
  });

  it("blocks brand leakage in an unbranded question", () => {
    const leaked = prompts.map((prompt, index) =>
      index === 0 ? { ...prompt, question: "Is Nuave good?" } : prompt,
    );
    expect(validatePromptPack(leaked, brief).join(" ")).toContain(
      "reveals the brand",
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
    ).toContain("raw response does not name it");
  });

  it("rejects an excerpt that was not copied from the raw answer", () => {
    const content = reportContent();
    content.details[0].answer_excerpt = "A rewritten version of the answer.";
    expect(
      validateReportContent(content, observations, brief).join(" "),
    ).toContain("not copied exactly");
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
    expect(report.report_version).toBe("nuave-report-v2");
    expect(report.writing_standard_version).toBe(
      REPORT_WRITING_STANDARD_VERSION,
    );
    expect(
      makeEvidenceExport(brief, prompts, observations, report).export_version,
    ).toBe("nuave-evidence-v2");
  });
});

describe("plain-language report contract", () => {
  it("accepts concise customer-facing copy", () => {
    expect(validateReportLanguage(reportContent())).toEqual([]);
  });

  it("rejects copy over a section word budget", () => {
    const content = reportContent();
    content.conclusion = `${Array.from({ length: 61 }, () => "clear").join(" ")}.`;
    expect(validateReportLanguage(content).join(" ")).toContain(
      "the limit is 60",
    );
  });

  it("rejects technical audit jargon in customer-facing copy", () => {
    const content = reportContent();
    content.key_findings[0].explanation =
      "The retained observation supports this finding.";
    expect(validateReportLanguage(content).join(" ")).toContain(
      "retained observation",
    );
  });

  it("rejects a sentence over the sentence limit", () => {
    const content = reportContent();
    content.key_findings[0].explanation = `${Array.from(
      { length: 26 },
      () => "clear",
    ).join(" ")}.`;
    expect(validateReportLanguage(content).join(" ")).toContain(
      "sentence 1 has 26 words",
    );
  });

  it("prevents a language retry from changing protected evidence", () => {
    const original = reportContent();
    const revision = structuredClone(original);
    revision.details[0].answer_excerpt = "Changed evidence";
    expect(
      validateReportLanguageRevision(original, revision).join(" "),
    ).toContain("protected classifications or evidence");
  });
});
