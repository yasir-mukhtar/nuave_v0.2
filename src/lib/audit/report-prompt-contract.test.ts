import { describe, expect, it } from "vitest";
import {
  reportAssessmentInstructions,
  reportPromptMeasurement,
  reportPromptMeasurements,
} from "./report-prompt-contract";
import {
  AUDIT_MEASUREMENT_MATRIX,
  REPORT_ASSESSMENT_CLASSES,
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

  it("projects report metadata for provider prompts without legacy categories", () => {
    const metadata = reportPromptMeasurements(
      AUDIT_MEASUREMENT_MATRIX.map((slot) => ({ prompt_id: slot.id })),
    );
    expect(metadata).toHaveLength(AUDIT_MEASUREMENT_MATRIX.length);
    metadata.forEach((item, index) => {
      const slot = AUDIT_MEASUREMENT_MATRIX[index];
      expect(item).toEqual({
        prompt_id: slot.id,
        canonical_category: slot.category,
        measurement_purpose: slot.measurementPurpose,
        customer_facing_label: slot.customerFacingLabel,
        report_assessment_class: slot.reportAssessmentClass,
      });
    });
  });

  it("rejects a prompt ID with no canonical measurement slot", () => {
    expect(() => reportPromptMeasurement("not-a-canonical-prompt")).toThrow(
      /does not map to a canonical measurement slot/i,
    );
  });
});
