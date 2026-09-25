import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  reportAssessmentInstructions,
  reportContentInstructions,
  reportPriorityCountInstruction,
  reportPromptMeasurement,
  reportPromptMeasurements,
} from "./report-prompt-contract";
import {
  REPORT_CONTENT_MAX_ITEMS,
  reportContentSchema,
  reportSynthesisSchema,
} from "./types";
import {
  AUDIT_MEASUREMENT_MATRIX,
  COMPARISON_RELATION_MARKERS,
  REPORT_ASSESSMENT_CLASSES,
  measurementSlotForOrder,
} from "./measurement-matrix";

describe("report assessment prompt contract", () => {
  const instructions = reportAssessmentInstructions().join("\n");

  it("derives every slot's report meaning from the canonical matrix", () => {
    AUDIT_MEASUREMENT_MATRIX.forEach((slot) => {
      expect(instructions).toContain(slot.id);
      expect(instructions).toContain(slot.category);
      expect(instructions).toContain(slot.customerFacingLabel);
      expect(instructions).toContain(slot.measurementPurpose);
      expect(instructions).toContain(slot.reportAssessmentClass);
      expect(instructions).toContain(slot.generatorSlotDescription);
    });
    expect(instructions).toContain("Slot 1");
    expect(instructions).toContain("Slot 10");
    expect(instructions).not.toContain("need_discovery");
    expect(instructions).not.toContain("solution_discovery");
    expect(instructions).not.toContain("validation or action");
  });

  it("defines all matrix-owned assessment paths", () => {
    REPORT_ASSESSMENT_CLASSES.forEach((assessmentClass) => {
      expect(instructions).toContain(`${assessmentClass} assessment path`);
    });
    expect(instructions).toContain("only when the answer actually compares");
    expect(instructions).toContain("otherwise use not_observed");
    expect(instructions).toContain("otherwise use not_assessed");
  });

  it("projects one canonical metadata object for provider prompts", () => {
    const metadata = reportPromptMeasurements(
      AUDIT_MEASUREMENT_MATRIX.map((slot) => ({ prompt_id: slot.id })),
    );
    expect(metadata).toHaveLength(AUDIT_MEASUREMENT_MATRIX.length);
    metadata.forEach((item, index) => {
      const slot = AUDIT_MEASUREMENT_MATRIX[index];
      const expected = {
        prompt_id: slot.id,
        category: slot.category,
        audited_brand_identity: slot.auditedBrandIdentity,
        comparison_target_identity: slot.comparisonTargetIdentity,
        measurement_purpose: slot.measurementPurpose,
        customer_facing_label: slot.customerFacingLabel,
        report_assessment_class: slot.reportAssessmentClass,
        generator_slot_description: slot.generatorSlotDescription,
        allowed_context_fields: [...slot.allowedContextFields],
      };
      if ("comparisonRelationMarkers" in slot) {
        expect(item).toEqual({
          ...expected,
          comparison_relation_markers: slot.comparisonRelationMarkers,
        });
      } else {
        expect(item).toEqual(expected);
      }
    });
  });

  it("exposes the closed relation markers only on canonical slot 9", () => {
    const slotFor = (order: number) => {
      const slot = measurementSlotForOrder(order);
      if (!slot) throw new Error(`Missing matrix slot ${order}`);
      return slot;
    };
    expect(reportPromptMeasurement(slotFor(9).id)).toMatchObject({
      category: "direct_comparison",
      audited_brand_identity: "required",
      comparison_target_identity: "required",
      customer_facing_label: "Perbandingan langsung",
      report_assessment_class: "comparison",
      comparison_relation_markers: COMPARISON_RELATION_MARKERS,
    });
    expect(reportPromptMeasurement(slotFor(6).id)).not.toHaveProperty(
      "comparison_relation_markers",
    );
    expect(reportPromptMeasurement(slotFor(8).id)).toMatchObject({
      category: "explicit_recommendation",
      report_assessment_class: "recommendation",
    });
    expect(reportPromptMeasurement(slotFor(10).id)).toMatchObject({
      category: "fit_misfit",
      report_assessment_class: "recommendation",
    });
  });

  it("rejects a prompt ID with no canonical measurement slot", () => {
    expect(() => reportPromptMeasurement("not-a-canonical-prompt")).toThrow(
      /does not map to a canonical measurement slot/i,
    );
  });
});

describe("Spec 012 B1 — report count bounds (AC-11)", () => {
  const finding = (n: number) => ({
    title: `Temuan ${n}`,
    explanation: `Penjelasan ${n}`,
    evidence_prompt_ids: ["NUAVE-DT-01"],
  });
  const priority = (order: number) => ({
    order,
    timing: "do_next" as const,
    action: `Tindakan ${order}`,
    why: "Alasan",
    basis: "Dasar",
    owner: "marketing" as const,
    done_when: "Selesai bila terlihat",
    evidence_prompt_ids: ["NUAVE-DT-01"],
    caveat: "Batasan",
  });
  const synthesis = (
    findings: number,
    priorities: number,
    lastOrder?: number,
  ) => ({
    conclusion: "Kesimpulan",
    accuracy_status: "no_clear_issues" as const,
    key_findings: Array.from({ length: findings }, (_, i) => finding(i + 1)),
    priorities: Array.from({ length: priorities }, (_, i) =>
      priority(i === priorities - 1 && lastOrder ? lastOrder : i + 1),
    ),
    assessments: Array.from({ length: 10 }, (_, i) => ({
      prompt_id: `NUAVE-DT-${String(i + 1).padStart(2, "0")}`,
      recommendation: "not_assessed" as const,
      comparison: "not_assessed" as const,
      information: "not_assessed" as const,
    })),
  });

  it("keeps three supported items as three without padding", () => {
    const parsed = reportSynthesisSchema.parse(synthesis(3, 3));
    expect(parsed.key_findings).toHaveLength(3);
    expect(parsed.priorities).toHaveLength(3);
  });

  it("accepts ten findings, ten priorities and priority order ten", () => {
    expect(REPORT_CONTENT_MAX_ITEMS).toBe(10);
    expect(reportSynthesisSchema.safeParse(synthesis(10, 10)).success).toBe(
      true,
    );
    expect(
      reportContentSchema.shape.priorities.safeParse(
        Array.from({ length: 10 }, (_, i) => priority(i + 1)),
      ).success,
    ).toBe(true);
  });

  it("rejects eleven items and priority order eleven in shared schemas", () => {
    expect(reportSynthesisSchema.safeParse(synthesis(11, 1)).success).toBe(
      false,
    );
    expect(reportSynthesisSchema.safeParse(synthesis(1, 11)).success).toBe(
      false,
    );
    expect(reportSynthesisSchema.safeParse(synthesis(1, 1, 11)).success).toBe(
      false,
    );
    expect(
      reportContentSchema.shape.key_findings.safeParse(
        Array.from({ length: 11 }, (_, i) => finding(i + 1)),
      ).success,
    ).toBe(false);
  });

  it("keeps zero findings and zero priorities invalid at B1 synthesis", () => {
    expect(reportSynthesisSchema.safeParse(synthesis(0, 1)).success).toBe(
      false,
    );
    expect(reportSynthesisSchema.safeParse(synthesis(1, 0)).success).toBe(
      false,
    );
  });

  it("derives the same bounds into the OpenAI structured-output schema", () => {
    const format = zodTextFormat(reportSynthesisSchema, "nuave_audit_report");
    const text = JSON.stringify(format.schema);
    expect(text).not.toMatch(/"maxItems":5\b/);
    expect(text).toMatch(/"maxItems":10\b/);
    expect(text).toMatch(/"maximum":10\b/);
  });
});

describe("Spec 012 B1 — direct-ten content instructions (AC-12)", () => {
  const direct = reportContentInstructions("direct-ten").join("\n");

  it("adds evidence-led, non-padding guidance only for direct-ten", () => {
    expect(direct).toContain("between one and ten key findings");
    expect(direct).toContain("Three supported, distinct items stay three");
    expect(direct).toContain("never pad with generic advice");
    for (const field of ["why", "basis", "owner", "done_when", "caveat"])
      expect(direct).toContain(field);
    expect(direct).toContain("evidence_prompt_ids");
    expect(direct).toContain(
      "Non-appearance alone does not show a missing page",
    );
    expect(direct).toContain("not independently verified fact");
    expect(direct).toContain("late caveats");
    expect(reportContentInstructions()).toEqual([]);
    expect(reportContentInstructions("canonical")).toEqual([]);
  });

  it("does not advertise a B2 non-corrective exception", () => {
    expect(direct).not.toMatch(
      /template|no observed gap|without a gap|zero priorities/i,
    );
  });

  it("replaces only the count sentence and keeps the observed-gap clause", () => {
    const historical =
      "Return no more than five priorities. Each priority must address a supplied failed result.";
    expect(reportPriorityCountInstruction("canonical", historical)).toBe(
      historical,
    );
    expect(reportPriorityCountInstruction(undefined, historical)).toBe(
      historical,
    );
    expect(reportPriorityCountInstruction("direct-ten", historical)).toBe(
      "Return no more than ten key findings and no more than ten priorities. Each priority must address a supplied failed result.",
    );
    expect(() =>
      reportPriorityCountInstruction("direct-ten", "Return up to five."),
    ).toThrow(/template/);
  });
});
