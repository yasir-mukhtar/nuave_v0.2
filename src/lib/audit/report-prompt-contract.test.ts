import { describe, expect, it } from "vitest";
import {
  reportAssessmentInstructions,
  reportPromptMeasurement,
  reportPromptMeasurements,
} from "./report-prompt-contract";
import {
  AUDIT_MEASUREMENT_MATRIX,
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
      expect(instructions).toContain(slot.compatibilityCustomerFacingLabel);
      expect(instructions).toContain(slot.compatibilityMeasurementPurpose);
      expect(instructions).toContain(slot.compatibilityReportAssessmentClass);
    });
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

  it("projects explicit canonical and compatibility metadata for provider prompts", () => {
    const metadata = reportPromptMeasurements(
      AUDIT_MEASUREMENT_MATRIX.map((slot) => ({ prompt_id: slot.id })),
    );
    expect(metadata).toHaveLength(AUDIT_MEASUREMENT_MATRIX.length);
    metadata.forEach((item, index) => {
      const slot = AUDIT_MEASUREMENT_MATRIX[index];
      expect(item).toEqual({
        prompt_id: slot.id,
        canonical_category: slot.category,
        canonical_measurement_purpose: slot.measurementPurpose,
        canonical_customer_facing_label: slot.customerFacingLabel,
        canonical_report_assessment_class: slot.reportAssessmentClass,
        measurement_purpose: slot.compatibilityMeasurementPurpose,
        customer_facing_label: slot.compatibilityCustomerFacingLabel,
        report_assessment_class: slot.compatibilityReportAssessmentClass,
        generator_slot_description: slot.compatibilityMeasurementPurpose,
        compatibility_customer_facing_label:
          slot.compatibilityCustomerFacingLabel,
        compatibility_measurement_purpose: slot.compatibilityMeasurementPurpose,
        compatibility_report_assessment_class:
          slot.compatibilityReportAssessmentClass,
        compatibility_category: slot.legacyCategory,
        compatibility_audited_brand_identity: slot.legacyAuditedBrandIdentity,
        compatibility_comparison_target_identity:
          slot.legacyComparisonTargetIdentity,
        compatibility_role: slot.legacyRole,
        compatibility_allowed_context_fields: [
          ...slot.legacyAllowedContextFields,
        ],
      });
    });
  });

  it("keeps pre-A3 report meaning separate from canonical target meaning", () => {
    const expected = new Map(
      [6, 8, 9, 10].map((order) => {
        const slot = measurementSlotForOrder(order);
        if (!slot) throw new Error(`Missing matrix slot ${order}`);
        return [slot.id, slot] as const;
      }),
    );
    expected.forEach((slot, promptId) => {
      const metadata = reportPromptMeasurement(promptId);
      expect(metadata.compatibility_report_assessment_class).toBe(
        slot.compatibilityReportAssessmentClass,
      );
      expect(metadata.compatibility_customer_facing_label).toBe(
        slot.compatibilityCustomerFacingLabel,
      );
      expect(metadata.compatibility_measurement_purpose).toBe(
        slot.compatibilityMeasurementPurpose,
      );
      expect(metadata.canonical_report_assessment_class).toBe(
        slot.reportAssessmentClass,
      );
    });
    const slotFor = (order: number) => {
      const slot = measurementSlotForOrder(order);
      if (!slot) throw new Error(`Missing matrix slot ${order}`);
      return slot;
    };
    expect(reportPromptMeasurement(slotFor(6).id)).toMatchObject({
      compatibility_category: "comparison",
      compatibility_audited_brand_identity: "required",
      compatibility_comparison_target_identity: "required",
      compatibility_customer_facing_label: "Perbandingan",
      compatibility_report_assessment_class: "comparison",
    });
    expect(reportPromptMeasurement(slotFor(8).id)).toMatchObject({
      compatibility_customer_facing_label: "Fakta bisnis",
      compatibility_report_assessment_class: "information",
    });
    expect(reportPromptMeasurement(slotFor(9).id)).toMatchObject({
      compatibility_customer_facing_label: "Langkah berikutnya",
      compatibility_report_assessment_class: "information",
    });
    expect(reportPromptMeasurement(slotFor(10).id)).toMatchObject({
      compatibility_customer_facing_label: "Langkah berikutnya",
      compatibility_report_assessment_class: "information",
    });
  });

  it("rejects a prompt ID with no canonical measurement slot", () => {
    expect(() => reportPromptMeasurement("not-a-canonical-prompt")).toThrow(
      /does not map to a canonical measurement slot/i,
    );
  });
});
