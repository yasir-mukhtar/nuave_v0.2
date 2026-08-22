import { describe, expect, it } from "vitest";
import { classifyReportRecovery } from "./report-recovery";

describe("report recovery classification", () => {
  it("allows a transient retry only while the report budget has headroom", () => {
    expect(classifyReportRecovery("REPORT_TRANSIENT_FAILURE", 2, 3)).toEqual({
      kind: "retryable",
      can_retry: true,
    });
    expect(classifyReportRecovery("REPORT_TRANSIENT_FAILURE", 3, 3)).toEqual({
      kind: "terminal_limit",
      can_retry: false,
    });
  });

  it("never offers a paid reroll for deterministic integrity failure", () => {
    expect(classifyReportRecovery("REPORT_INTEGRITY_FAILURE", 1, 3)).toEqual({
      kind: "terminal_integrity",
      can_retry: false,
    });
  });

  it("treats explicit report-stage exhaustion as terminal", () => {
    expect(classifyReportRecovery("REPORT_LIMIT_EXHAUSTED", 1, 3)).toEqual({
      kind: "terminal_limit",
      can_retry: false,
    });
  });
});
