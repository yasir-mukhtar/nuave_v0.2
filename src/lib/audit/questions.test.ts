import { describe, expect, it } from "vitest";
import { buildPromptPack, deterministicQuestionDrafts } from "./questions";
import {
  PROMPT_MATRIX,
  buildAuditReport,
  makeEvidenceExport,
  promptQuestionSpecs,
  validatePromptPack,
} from "./contracts";
import {
  AUDIT_CALL_LIMITS,
  AUDIT_MODEL,
  AUDIT_STAGE_CALL_LIMITS,
  reserveAuditCall,
} from "./telemetry";
import { fixtureBudget } from "./fixtures/telemetry";
import {
  promptPackSchema,
  type AuditObservation,
  type BusinessBrief,
  type ReportContent,
} from "./types";

const brief: BusinessBrief = {
  brand_name: "Nuave Test",
  entity_scope: "Nuave Test Indonesia",
  brand_type: "B2B service",
  category: "AI visibility audit",
  market_context: "Indonesia",
  target_customer: "marketing agency",
  official_sources: ["https://example.com"],
  verified_offerings: ["one-time visibility audit", "evidence export"],
  verified_customer_needs: [
    "checking how AI answers describe a client",
    "sharing evidence with a client",
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
  priority_offering: "one-time visibility audit",
  conversion_action: "request an audit",
  customer_supplied_facts: [],
  known_accuracy_questions: ["its published service coverage"],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

const minimalBrief: BusinessBrief = {
  ...brief,
  verified_customer_needs: [],
  verified_decision_criteria: [],
  known_accuracy_questions: [],
  priority_offering: "",
  conversion_action: "",
  verified_offerings: ["equipment servicing"],
};

describe("deterministic question generation", () => {
  it("builds the pack without a provider call or any budget movement", async () => {
    const openai = await import("./openai");
    const budget = { ...fixtureBudget };

    delete process.env.OPENAI_API_KEY;
    expect(buildPromptPack(brief).prompts).toHaveLength(10);
    expect(budget).toEqual(fixtureBudget);
    expect(Object.keys(openai)).not.toContain("generatePromptPack");
    expect(AUDIT_STAGE_CALL_LIMITS.prompts).toBe(0);
    expect(AUDIT_CALL_LIMITS.prompts.max_output_tokens).toBe(0);
    expect(() =>
      reserveAuditCall({
        budget: fixtureBudget,
        stage: "prompts",
        request: {},
        requested_model: AUDIT_MODEL,
        has_web_search: false,
      }),
    ).toThrow("no longer makes a paid provider call");
  });

  it("keeps the exact matrix order, IDs, categories, and roles", () => {
    const pack = buildPromptPack(brief);

    expect(pack.prompts.map((prompt) => prompt.prompt_id)).toEqual(
      PROMPT_MATRIX.map(([id]) => id),
    );
    pack.prompts.forEach((prompt, index) => {
      expect(prompt.category).toBe(PROMPT_MATRIX[index][1]);
      expect(prompt.branded).toBe(PROMPT_MATRIX[index][2]);
      expect(prompt.role).toBe(PROMPT_MATRIX[index][3]);
      expect(prompt.review_status).toBe("needs_human_review");
    });
  });

  it("keeps two questions per Intent-5 category and five branded questions", () => {
    const pack = buildPromptPack(brief);
    const counts = new Map<string, number>();
    pack.prompts.forEach((prompt) =>
      counts.set(prompt.category, (counts.get(prompt.category) ?? 0) + 1),
    );

    expect([...counts.values()]).toEqual([2, 2, 2, 2, 2]);
    expect(pack.prompts.filter((prompt) => prompt.branded)).toHaveLength(5);
    expect(pack.prompts.filter((prompt) => !prompt.branded)).toHaveLength(5);
  });

  it("keeps the brand, its variants, domains, and links out of unbranded questions", () => {
    const leaky: BusinessBrief = {
      ...brief,
      priority_offering: "Nuave Test Pro",
      verified_offerings: ["nuave-test.example.com plan", "Nuave audit"],
      verified_customer_needs: ["choosing Nuave", "sharing evidence"],
    };
    const pack = buildPromptPack(leaky);

    pack.prompts
      .filter((prompt) => !prompt.branded)
      .forEach((prompt) => {
        const question = prompt.question.toLocaleLowerCase("en-US");
        expect(question).not.toContain("nuave");
        expect(question).not.toContain("http");
        expect(question).not.toContain(".com");
      });
    expect(validatePromptPack(pack.prompts, leaky)).toEqual([]);
  });

  it("names the verified competitor only in the designated comparison question", () => {
    const pack = buildPromptPack(brief);
    const naming = pack.prompts.filter((prompt) =>
      prompt.question.includes(brief.verified_competitor.name),
    );

    expect(naming.map((prompt) => prompt.prompt_id)).toEqual([
      "NUAVE-BRAND-COMPARISON-02",
    ]);
    expect(naming[0].inputs_used).toContain("verified_competitor");
  });

  it("records only verified brief fields that its own wording used", () => {
    const specs = promptQuestionSpecs(brief);
    const drafts = deterministicQuestionDrafts(brief);

    drafts.forEach((questionDraft, index) => {
      expect(questionDraft.inputs_used.length).toBeGreaterThan(0);
      questionDraft.inputs_used.forEach((field) => {
        expect(Object.keys(specs[index].allowed_context)).toContain(field);
        const value = brief[field];
        expect(Array.isArray(value) ? value.length > 0 : Boolean(value)).toBe(
          true,
        );
      });
    });
    expect(drafts[0].inputs_used).not.toContain("brand_name");
    expect(buildPromptPack(brief).prompts[0].rationale).toContain(
      "Built from verified customer needs, market context.",
    );
  });

  it("writes distinct, non-empty, single-request questions", () => {
    [brief, minimalBrief].forEach((input) => {
      const questions = buildPromptPack(input).prompts.map(
        (prompt) => prompt.question,
      );

      expect(new Set(questions).size).toBe(10);
      questions.forEach((question) => {
        expect(question.trim().length).toBeGreaterThan(10);
        expect(question.trim().endsWith("?")).toBe(true);
        expect(question.match(/\?/g)).toHaveLength(1);
      });
    });
  });

  it("produces the same pack twice from the same verified brief", () => {
    expect(buildPromptPack(brief).prompts).toEqual(
      buildPromptPack(brief).prompts,
    );
  });

  it("rejects an unsupported premise carried in from the brief", () => {
    expect(() =>
      buildPromptPack({ ...brief, category: "safest money transfer" }),
    ).toThrow("unsupported premise");
  });

  it("fails closed when a required brief field reveals the brand", () => {
    expect(() =>
      buildPromptPack({ ...brief, category: "Nuave visibility audit" }),
    ).toThrow("reveals the brand");
  });

  it("builds a valid pack from a brief with only the required fields", () => {
    const pack = buildPromptPack(minimalBrief);

    expect(validatePromptPack(pack.prompts, minimalBrief)).toEqual([]);
    expect(promptPackSchema.parse(pack)).toEqual(pack);
  });

  it("returns the full PromptPack the workflow and report already consume", () => {
    const pack = buildPromptPack(brief);

    expect(promptPackSchema.parse(pack)).toEqual(pack);
    expect(pack).toMatchObject({
      status: "draft_for_review",
      prompt_pack_version: "deterministic-v4-en",
      language: "en-US",
      target_product: "ChatGPT",
      summary: { total_prompts: 10, unbranded_prompts: 5, branded_prompts: 5 },
      warnings: [],
    });
    expect(pack.brand).toEqual({
      brand_name: brief.brand_name,
      entity_scope: brief.entity_scope,
      brand_type: brief.brand_type,
      category: brief.category,
      market_context: brief.market_context,
      target_customer: brief.target_customer,
    });
    expect(Object.values(pack.self_check).every(Boolean)).toBe(true);
  });

  it("stays compatible with the observation runner, report, and evidence export", () => {
    const pack = buildPromptPack(brief);
    const observations: AuditObservation[] = pack.prompts.map(
      (prompt, index) => ({
        prompt_id: prompt.prompt_id,
        category: prompt.category,
        branded: prompt.branded,
        question: prompt.question,
        system: "OpenAI Responses API",
        requested_model: AUDIT_MODEL,
        returned_model: AUDIT_MODEL,
        response_id: `resp_${index}`,
        observed_at: "2026-08-02T00:00:00.000Z",
        raw_answer: "The answer does not name the business.",
        sources: [],
        run_status: "completed",
        failure_reason: "",
        telemetry: [],
      }),
    );
    const content: ReportContent = {
      conclusion: "The tested answers did not name the business.",
      accuracy_status: "could_not_assess",
      observed_competitors: [],
      key_findings: [
        {
          title: "Not named",
          explanation: "The tested answers did not name the business.",
          evidence_prompt_ids: [pack.prompts[0].prompt_id],
        },
      ],
      priorities: [
        {
          order: 1,
          timing: "do_first",
          action: "Publish clearer public details",
          why: "The tested answers did not name the business.",
          basis: "Tested answers",
          owner: "marketing",
          done_when: "The public details are published.",
          evidence_prompt_ids: [pack.prompts[0].prompt_id],
          caveat: "This does not promise a recommendation.",
        },
      ],
      details: pack.prompts.map((prompt) => ({
        prompt_id: prompt.prompt_id,
        run: "completed" as const,
        appearance: "absent" as const,
        recommendation: "not_recommended" as const,
        comparison: "not_observed" as const,
        information: "not_assessed" as const,
        finding: "The business did not appear in this answer.",
        answer_excerpt: "The answer does not name the business.",
        evidence_note: "The answer does not name the business.",
        source_urls: [],
      })),
    };
    const report = buildAuditReport(content, observations);

    expect(report.provenance.prompt_contract_version).toBe(
      "deterministic-v4-en",
    );
    expect(report.counts).toMatchObject({
      unbranded_total: 5,
      branded_total: 5,
      failed: 0,
    });
    expect(
      makeEvidenceExport(brief, pack.prompts, observations, report).prompts,
    ).toEqual(pack.prompts);
  });
});
