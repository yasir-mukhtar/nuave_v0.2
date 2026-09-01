import { describe, expect, it } from "vitest";
import {
  reportAssessmentInstructions,
  reportPromptMeasurement,
  reportPromptMeasurements,
} from "./report-prompt-contract";
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
