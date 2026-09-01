import { describe, expect, it } from "vitest";
import {
  AUDIT_MEASUREMENT_MATRIX,
  CANONICAL_COMPOSITION_COUNTS,
  PROMPT_MATRIX,
  measurementSlotsForAssessmentClass,
  assemblePromptPack,
  buildAuditReport,
  makeEvidenceExport,
  normalizeReportEvidence,
  promptQuestionSpecs,
  validatePromptPack,
  validateReportContent,
} from "./contracts";
import {
  REPORT_WRITING_STANDARD_VERSION,
  validateReportLanguage,
  validateReportLanguageRevision,
} from "./report-language";
import { businessBriefSchema, promptPackSchema } from "./types";
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

const prompts: AuditPrompt[] = AUDIT_MEASUREMENT_MATRIX.map((slot) => ({
  prompt_id: slot.id,
  category: slot.category,
  role: slot.generatorSlotDescription,
  branded: slot.auditedBrandIdentity === "required",
  question:
    slot.comparisonTargetIdentity === "required"
      ? `Which is better for need ${slot.order}: Nuave Test versus Test Competitor?`
      : slot.auditedBrandIdentity === "required"
        ? `What public information is available about Nuave Test for need ${slot.order}?`
        : `How should I choose an audit service for need ${slot.order}?`,
  rationale: "Represents the specified intent.",
  inputs_used: ["market_context"],
  review_status: "needs_human_review",
}));

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
  telemetry: [],
}));

function reportContent(): ReportContent {
  return {
    conclusion: "The observations contain findings that need review.",
    accuracy_status: "no_clear_issues",
    observed_competitors: [],
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
    details: prompts.map((prompt, index) => {
      const slot = AUDIT_MEASUREMENT_MATRIX.find(
        (candidate) => candidate.id === prompt.prompt_id,
      );
      if (!slot) throw new Error(`Missing matrix slot for ${prompt.prompt_id}`);
      return {
        prompt_id: prompt.prompt_id,
        run: "completed",
        appearance: index === 0 ? "mentioned" : "absent",
        recommendation:
          slot.reportAssessmentClass === "recommendation"
            ? "not_recommended"
            : "not_assessed",
        comparison: "not_observed",
        information: "not_assessed",
        finding: "Finding based on the response.",
        answer_excerpt: observations[index].raw_answer,
        evidence_note: "The answer supports this result.",
        source_urls: ["https://example.com"],
      };
    }),
  };
}

// The first verified field the fixed matrix allows for that question.
function allowedInput(index: number) {
  return [
    Object.keys(promptQuestionSpecs(brief)[index].allowed_context)[0],
  ] as (keyof BusinessBrief)[];
}

describe("prompt-pack contract", () => {
  it("rejects a brief without customer needs or decision criteria", () => {
    expect(
      businessBriefSchema.safeParse({
        ...brief,
        verified_customer_needs: [],
        verified_decision_criteria: [],
      }).success,
    ).toBe(false);
  });

  it("accepts the exact canonical ten-slot matrix", () => {
    expect(validatePromptPack(prompts, brief)).toEqual([]);
  });

  it("assembles the full review pack from ten code-owned question drafts", () => {
    const drafts = prompts.map((prompt, index) => ({
      question: prompt.question,
      inputs_used: allowedInput(index),
    }));
    const pack = assemblePromptPack(drafts, brief);

    expect(pack.prompt_pack_version).toBe("deterministic-v4-en");
    expect(pack.prompts).toHaveLength(10);
    expect(pack.prompts[0]).toMatchObject({
      prompt_id: PROMPT_MATRIX[0][0],
      category: PROMPT_MATRIX[0][1],
      branded: PROMPT_MATRIX[0][2],
      role: PROMPT_MATRIX[0][3],
      question: drafts[0].question,
      rationale: `${PROMPT_MATRIX[0][3]}. Built from verified ${allowedInput(0)[0]}.`,
      inputs_used: allowedInput(0),
      review_status: "needs_human_review",
    });
    expect(pack.summary).toEqual({
      total_prompts: 10,
      unbranded_prompts: 6,
      branded_prompts: 4,
    });
    expect(Object.values(pack.self_check).every(Boolean)).toBe(true);
    expect(validatePromptPack(pack.prompts, brief)).toEqual([]);
    expect(promptPackSchema.parse(pack)).toEqual(pack);
  });

  it("rejects a question that used an input outside its matrix scope", () => {
    const drafts = prompts.map((prompt, index) => ({
      question: prompt.question,
      inputs_used: index === 0 ? ["brand_name" as const] : allowedInput(index),
    }));

    expect(() => assemblePromptPack(drafts, brief)).toThrow(
      "used unverified or out-of-scope input brand_name",
    );
  });

  it("rejects an assembly that does not contain ten questions", () => {
    expect(() =>
      assemblePromptPack(
        prompts.slice(0, 9).map((prompt, index) => ({
          question: prompt.question,
          inputs_used: allowedInput(index),
        })),
        brief,
      ),
    ).toThrow("expected 10 questions and received 9");
  });

  it("limits competitor context to the designated branded comparison", () => {
    const specs = promptQuestionSpecs(brief);
    const withCompetitor = specs.filter((spec) =>
      Object.hasOwn(spec.allowed_context, "verified_competitor"),
    );

    expect(withCompetitor).toHaveLength(1);
    expect(withCompetitor[0].prompt_id).toBe("NUAVE-BRAND-ACTION-01");
    expect(Object.hasOwn(specs[0].allowed_context, "brand_name")).toBe(false);
  });

  it("rejects brand leakage during deterministic assembly", () => {
    expect(() =>
      assemblePromptPack(
        prompts.map((prompt, index) => ({
          question: index === 0 ? "Is Nuave Test suitable?" : prompt.question,
          inputs_used: allowedInput(index),
        })),
        brief,
      ),
    ).toThrow("reveals the brand");
  });

  it("blocks brand leakage in an unbranded question", () => {
    const leaked = prompts.map((prompt, index) =>
      index === 0 ? { ...prompt, question: "Is Nuave good?" } : prompt,
    );
    expect(validatePromptPack(leaked, brief).join(" ")).toContain(
      "reveals the brand",
    );
  });

  it("blocks competitor leakage outside the designated comparison question", () => {
    const leaked = prompts.map((prompt, index) =>
      index === 0
        ? { ...prompt, question: "Should I choose Test Competitor?" }
        : prompt,
    );
    expect(validatePromptPack(leaked, brief).join(" ")).toContain(
      "reveals the competitor",
    );
  });

  it("blocks duplicate questions and unsupported premises", () => {
    const invalid = prompts.map((prompt, index) => {
      if (index === 1) return { ...prompt, question: prompts[0].question };
      if (index === 2)
        return { ...prompt, question: "What is the best audit service?" };
      return prompt;
    });
    const errors = validatePromptPack(invalid, brief).join(" ");

    expect(errors).toContain("must be distinct");
    expect(errors).toContain("unsupported premise");
  });

  it("rejects the old 5/5 composition in the supported validator", () => {
    const oldComposition = prompts.map((prompt, index) =>
      index === 0
        ? {
            ...prompt,
            branded: true,
            question: "Apakah Nuave Test cocok untuk pelanggan?",
          }
        : prompt,
    );
    expect(validatePromptPack(oldComposition, brief)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("4 branded and 6 unbranded"),
      ]),
    );
  });

  it("rejects slot 9 when both identities lack a closed relation", () => {
    const withoutRelation = prompts.map((prompt, index) =>
      index === 8
        ? {
            ...prompt,
            question:
              "Are Nuave Test and Test Competitor open more than 8 hours?",
          }
        : prompt,
    );
    expect(validatePromptPack(withoutRelation, brief)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("valid comparison relation"),
      ]),
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
    content.details[1].appearance = "mentioned";
    content.details[1].recommendation = "recommended";
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

  it("derives counts from separate detail dimensions", () => {
    const report = buildAuditReport(reportContent(), observations, {
      requested_model: "gpt-5.6",
      returned_model: "gpt-5.6-sol",
      response_id: "resp_report",
    });
    expect(report.counts).toEqual({
      unbranded_recommended: 0,
      unbranded_mentioned: 1,
      unbranded_total: CANONICAL_COMPOSITION_COUNTS.unbranded,
      branded_recognized: 0,
      branded_total: CANONICAL_COMPOSITION_COUNTS.branded,
      failed: 0,
    });
    expect(report.measures).toEqual({
      overall: { appeared: 1, total: AUDIT_MEASUREMENT_MATRIX.length },
      unbranded: {
        appeared: 1,
        total: CANONICAL_COMPOSITION_COUNTS.unbranded,
      },
      branded: {
        appeared: 0,
        total: CANONICAL_COMPOSITION_COUNTS.branded,
      },
      // One question the brand appeared in, judged not_recommended: the nine
      // absent questions are outside every assessed denominator, not inside
      // recommendation's and outside the other two (R3-3).
      recommendation: { recommended: 0, assessed: 1 },
      comparison: { client_preferred: 0, assessed: 0 },
      information: { confirmed: 0, incomplete: 0, conflicting: 0, assessed: 0 },
    });
    expect(report.system_label).toContain("gpt-5.6-sol");
    expect(report.facts.discovery.recommendation_label).toBe(
      `Recommended in 0 of ${
        measurementSlotsForAssessmentClass("recommendation").filter(
          (slot) => slot.auditedBrandIdentity === "forbidden",
        ).length
      } questions without the business name.`,
    );
    expect(report.facts.recognition.label).toBe(
      `Recognized in 0 of ${CANONICAL_COMPOSITION_COUNTS.branded} questions that named the business.`,
    );
    expect(report.facts.coverage.label).toBe("10 of 10 questions completed.");
    expect(report.method_summary).toContain(
      "A mention is not a recommendation",
    );
    expect(report.report_version).toBe("nuave-report-v3");
    expect(report.provenance).toEqual({
      report_prompt_version: "report-synthesis-v4",
      prompt_contract_version: "deterministic-v4-en",
      requested_report_model: "gpt-5.6",
      returned_report_model: "gpt-5.6-sol",
      report_response_id: "resp_report",
      initial_report_response_id: "resp_report",
      report_call_count: 1,
      language_retry_performed: false,
      language_retry_violations: [],
    });
    expect(report.writing_standard_version).toBe(
      REPORT_WRITING_STANDARD_VERSION,
    );
    expect(
      makeEvidenceExport(brief, prompts, observations, report).export_version,
    ).toBe("nuave-evidence-v4");
  });

  it("normalizes each detail through its matrix-owned assessment class", () => {
    const visibleObservations = observations.map((observation) => ({
      ...observation,
      raw_answer: "Nuave Test appears in this synthetic answer.",
    }));
    const content = reportContent();
    content.details = content.details.map((detail) => ({
      ...detail,
      appearance: "mentioned",
      recommendation: "recommended",
      comparison: "client_preferred",
      information: "confirmed",
    }));

    const normalized = normalizeReportEvidence(
      content,
      visibleObservations,
      brief,
    );
    normalized.details.forEach((detail) => {
      const slot = AUDIT_MEASUREMENT_MATRIX.find(
        (candidate) => candidate.id === detail.prompt_id,
      );
      if (!slot)
        throw new Error(`Missing canonical slot for ${detail.prompt_id}`);
      expect(detail.appearance).toBe("mentioned");
      expect(detail.recommendation).toBe(
        slot.reportAssessmentClass === "recommendation"
          ? "recommended"
          : "not_assessed",
      );
      expect(detail.comparison).toBe(
        slot.reportAssessmentClass === "comparison"
          ? "client_preferred"
          : "not_observed",
      );
      expect(detail.information).toBe(
        slot.reportAssessmentClass === "information"
          ? "confirmed"
          : "not_assessed",
      );
    });
  });

  // -------------------------------------------------------------------------
  // R3-1 / R3-3 / R3-7 (Phase 3 fix-round-3 adversarial review).
  //
  // The round-2 regression test used a fixture with
  // `unbranded_recommended: 0, unbranded_mentioned: 1`, under which the buggy
  // numerator and the fixed one are the same number — reverting the fix left
  // the suite green. This fixture is the shape the live Sozo run actually
  // produced: recommended unbranded questions AND a mentioned-but-not-
  // recommended one, plus one deliberately un-normalized detail
  // (absent + recommended) that `buildAuditReport` must not count as an
  // appearance, since it is exported and callable without
  // `normalizeReportEvidence`.
  // -------------------------------------------------------------------------
  const mixedObservations: AuditObservation[] = observations.map(
    (observation, index) => ({
      ...observation,
      raw_answer: [0, 1, 2, 4, 5].includes(index)
        ? "Nuave Test is one option worth considering."
        : "The response does not name the audit brand.",
    }),
  );

  function mixedReportContent(): ReportContent {
    const dimensions = [
      // Matrix slots 1-5 are the unbranded compatibility projection.
      {
        appearance: "mentioned",
        recommendation: "recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
      {
        appearance: "mentioned",
        recommendation: "not_assessed",
        comparison: "not_observed",
        information: "not_assessed",
      },
      {
        appearance: "mentioned",
        recommendation: "not_recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
      // Absent, yet carrying an information judgment: only reachable when
      // buildAuditReport is called without normalizeReportEvidence.
      {
        appearance: "absent",
        recommendation: "recommended",
        comparison: "not_observed",
        information: "confirmed",
      },
      {
        appearance: "mentioned",
        recommendation: "not_assessed",
        comparison: "not_observed",
        information: "not_assessed",
      },
      {
        appearance: "mentioned",
        recommendation: "not_assessed",
        comparison: "client_preferred",
        information: "not_assessed",
      },
      {
        appearance: "absent",
        recommendation: "not_recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
      {
        appearance: "absent",
        recommendation: "not_recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
      {
        appearance: "absent",
        recommendation: "not_recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
      {
        appearance: "absent",
        recommendation: "not_recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
    ] as const;
    const base = reportContent();
    return {
      ...base,
      details: base.details.map((detail, index) => ({
        ...detail,
        ...dimensions[index],
        answer_excerpt: mixedObservations[index].raw_answer,
      })),
    };
  }

  it("counts appearances, not recommendation status, in measures.*.appeared (N-1/R3-7)", () => {
    const report = buildAuditReport(mixedReportContent(), mixedObservations);

    // The absent-but-recommended detail must not count as a recommendation.
    expect(report.counts.unbranded_recommended).toBe(1);
    expect(report.counts.unbranded_mentioned).toBe(2);
    expect(report.measures.unbranded.appeared).toBe(5);
    expect(report.measures.unbranded.appeared).not.toBe(
      report.counts.unbranded_mentioned,
    );
    expect(report.measures.unbranded.appeared).not.toBe(
      report.counts.unbranded_recommended + report.counts.unbranded_mentioned,
    );
    expect(report.measures.branded.appeared).toBe(0);
    expect(report.measures.overall.appeared).toBe(5);
    expect(report.measures.overall.total).toBe(AUDIT_MEASUREMENT_MATRIX.length);
  });

  it("applies one eligibility rule — appeared and judged — to all three assessed denominators (R3-3)", () => {
    const report = buildAuditReport(mixedReportContent(), mixedObservations);

    // Five details have appearance "mentioned" (0, 1, 2, 4, 5). Matrix slots
    // 1, 3, and 5 use recommendation assessment; slot 6 uses comparison.
    // The absent-but-judged details stay outside every denominator.
    expect(report.measures.recommendation).toEqual({
      recommended: 1,
      assessed: 2,
    });
    expect(report.measures.comparison).toEqual({
      client_preferred: 1,
      assessed: 1,
    });
    expect(report.measures.information).toEqual({
      confirmed: 0,
      incomplete: 0,
      conflicting: 0,
      assessed: 0,
    });
    // Every assessed denominator is at most the appeared count; none of them
    // can exceed it, which is what "0 dari 10 yang dinilai" next to "Tidak
    // diuji" meant before the fix.
    const appeared = report.measures.overall.appeared;
    expect(report.measures.recommendation.assessed).toBeLessThanOrEqual(
      appeared,
    );
    expect(report.measures.comparison.assessed).toBeLessThanOrEqual(appeared);
    expect(report.measures.information.assessed).toBeLessThanOrEqual(appeared);
  });

  it("produces identical facts and method copy from identical evidence", () => {
    const first = buildAuditReport(reportContent(), observations);
    const second = buildAuditReport(reportContent(), observations);

    expect(first.facts).toEqual(second.facts);
    expect(first.method_summary).toBe(second.method_summary);
  });

  it("exports v3 facts and provenance while omitting a device-local logo", () => {
    const report = buildAuditReport(reportContent(), observations, {
      requested_model: "requested-report-model",
      returned_model: "returned-report-model",
      response_id: "report-response",
      call_count: 2,
      language_retry_performed: true,
      language_retry_violations: ["Synthetic writing violation."],
    });
    const exported = makeEvidenceExport(
      {
        ...brief,
        agency_logo_data_url: "data:image/png;base64,ZmFrZQ==",
      },
      prompts,
      observations,
      report,
    );

    expect(exported.export_version).toBe("nuave-evidence-v4");
    expect(exported.brief.agency_logo_data_url).toBe(
      "[device-local logo omitted]",
    );
    expect(exported.report.facts).toEqual(report.facts);
    expect(exported.report.provenance).toEqual(report.provenance);
    expect(exported.observations).toEqual(observations);
  });

  it.each([
    ["a permanent ranking", "Nuave Test is permanently ranked number 1."],
    [
      "consumer app equivalence",
      "This is the same as the consumer ChatGPT app.",
    ],
    ["a guarantee", "This action guarantees future recommendations."],
    ["lost revenue", "The missing mention is costing sales."],
    ["unsupported causation", "The result was caused by weak website copy."],
  ])("rejects %s in model-authored report copy", (_label, claim) => {
    const content = reportContent();
    content.conclusion = claim;

    expect(validateReportContent(content, observations, brief)).not.toEqual([]);
  });

  it("allows an explicit no-guarantee limitation", () => {
    const content = reportContent();
    content.priorities[0].caveat = "Results are not guaranteed.";

    expect(validateReportContent(content, observations, brief)).toEqual([]);
  });

  it("rejects a recommendation without a visible brand appearance", () => {
    const content = reportContent();
    content.details[7].recommendation = "recommended";

    expect(
      validateReportContent(content, observations, brief).join(" "),
    ).toContain("raw response does not name the brand");
  });

  it("rejects a global accuracy conclusion that contradicts detail facts", () => {
    const content = reportContent();
    content.details[3].information = "conflicting";

    expect(
      validateReportContent(content, observations, brief).join(" "),
    ).toContain("Accuracy status says no clear issues");
  });
});

describe("report system-label and disclosure provenance", () => {
  it("names the OpenAI system when observations came from OpenAI", () => {
    const report = buildAuditReport(reportContent(), observations, {
      requested_model: "gpt-5.6",
      returned_model: "gpt-5.6-sol",
      response_id: "resp_report",
    });
    expect(report.system_label).toContain("OpenAI Responses API");
    expect(report.method_summary).toContain("OpenAI Responses API");
    expect(
      makeEvidenceExport(brief, prompts, observations, report).disclosure,
    ).toContain("OpenAI Responses API");
  });

  it("names Groq + Tavily when observations came from Groq and never says OpenAI", () => {
    const groqObservations = observations.map((observation) => ({
      ...observation,
      system: "Groq + Tavily" as const,
      requested_model: "llama-3.3-70b-versatile",
      returned_model: "llama-3.3-70b-versatile",
    }));
    const report = buildAuditReport(reportContent(), groqObservations, {
      requested_model: "llama-3.3-70b-versatile",
      returned_model: "llama-3.3-70b-versatile",
      response_id: "resp_groq",
    });
    expect(report.system_label).toContain("Groq + Tavily");
    expect(report.system_label).not.toContain("OpenAI");
    expect(report.method_summary).toContain("Groq + Tavily");
    expect(report.method_summary).not.toContain("OpenAI");
    const disclosure = makeEvidenceExport(
      brief,
      prompts,
      groqObservations,
      report,
    ).disclosure;
    expect(disclosure).toContain("Groq + Tavily");
    expect(disclosure).not.toContain("OpenAI");
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

  it("prevents a language retry from changing a result dimension", () => {
    const original = reportContent();
    const revision = structuredClone(original);
    revision.details[0].recommendation = "recommended";
    expect(
      validateReportLanguageRevision(original, revision).join(" "),
    ).toContain("protected classifications or evidence");
  });
});
