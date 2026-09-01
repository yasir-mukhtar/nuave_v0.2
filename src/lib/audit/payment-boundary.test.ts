import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canStartPostPaymentExtraction } from "./payment-boundary";

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("C1 payment boundary", () => {
  it.each([
    {
      paymentSucceeded: false,
      fromApprovedHandoff: false,
      expected: false,
    },
    {
      paymentSucceeded: true,
      fromApprovedHandoff: false,
      expected: true,
    },
    {
      paymentSucceeded: false,
      fromApprovedHandoff: true,
      expected: true,
    },
  ])(
    "allows post-payment extraction only after the simulated-success handoff",
    ({ paymentSucceeded, fromApprovedHandoff, expected }) => {
      expect(
        canStartPostPaymentExtraction({
          paymentSucceeded,
          fromApprovedHandoff,
        }),
      ).toBe(expected);
    },
  );

  it("keeps the supported landing architecture identity-only", () => {
    const landing = source("src/components/LandingAuditHero.tsx");
    const workflow = source("src/app/audit/AuditWorkflow.tsx");

    expect(landing).toContain("/api/audit/identity");
    expect(landing).toContain("AUDIT_SOURCE_HANDOFF_STORAGE_KEY");
    expect(landing).not.toContain("/api/audit/extract");
    expect(landing).not.toContain("createInitialExtractedAuditWorkflowState");
    expect(landing).not.toContain("factsExtracted");
    expect(landing).not.toContain("landing-extracted");

    expect(workflow).toContain("/api/audit/extract");
    expect(workflow).toContain("submitSourceCorrection");
    expect(workflow).toContain("fromApprovedHandoff");
  });

  it("retires the legacy landing-extracted route behavior", () => {
    expect(source("src/app/audit/AuditEntryShell.tsx")).not.toContain(
      "landing-extracted",
    );
    expect(source("src/app/audit/page.tsx")).not.toContain("landing-extracted");
  });
});
