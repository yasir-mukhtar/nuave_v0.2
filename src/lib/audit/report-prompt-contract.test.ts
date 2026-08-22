import { describe, expect, it } from "vitest";
import { reportAssessmentInstructions } from "./report-prompt-contract";

describe("report assessment prompt contract", () => {
  const instructions = reportAssessmentInstructions().join("\n");

  it("matches the validator's category-specific recommendation contract", () => {
    expect(instructions).toContain(
      "need_discovery, solution_discovery, or comparison",
    );
    expect(instructions).toContain("validation or action");
    expect(instructions).toContain("recommendation may be not_assessed");
  });

  it("requires actual comparison evidence and otherwise not_observed", () => {
    expect(instructions).toContain("only when the answer actually compares");
    expect(instructions).toContain("otherwise use not_observed");
  });

  it("allows information not_assessed on completed observations when no public fact was assessed", () => {
    expect(instructions).toContain(
      "otherwise information must be not_assessed, even though the observation completed successfully",
    );
  });

  it("does not reintroduce the contradictory completed-all-dimensions rule", () => {
    expect(instructions).not.toContain(
      "For every COMPLETED observation all three dimensions must be assessed",
    );
    expect(instructions).not.toContain(
      "not_assessed is reserved for FAILED tests only",
    );
  });
});
