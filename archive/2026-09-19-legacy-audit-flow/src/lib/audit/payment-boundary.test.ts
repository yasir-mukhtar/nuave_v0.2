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

  it("keeps the public landing hero free of the identity/payment journey (Spec 010 R-08)", () => {
    const landing = source("src/components/LandingAuditHero.tsx");
    const prepayment = source("src/components/AuditPrePaymentJourney.tsx");
    const workflow = source("src/app/audit/AuditWorkflow.tsx");

    // The hero is a call-to-action into the gated /audit intake — it no
    // longer embeds the identity/checkout journey or calls its boundaries.
    // The legacy files remain until the archive block but the public page
    // never routes through them.
    expect(landing).not.toContain("AuditPrePaymentJourney");
    expect(landing).not.toContain("/api/audit/identity");
    expect(landing).not.toContain("AUDIT_SOURCE_HANDOFF_STORAGE_KEY");
    expect(landing).toContain('"/audit"');
    expect(prepayment).toContain("/api/audit/identity");
    expect(prepayment).toContain("AUDIT_SOURCE_HANDOFF_STORAGE_KEY");
    expect(prepayment).not.toContain("/api/audit/extract");
    expect(prepayment).not.toContain(
      "createInitialExtractedAuditWorkflowState",
    );
    expect(prepayment).not.toContain("factsExtracted");
    expect(prepayment).not.toContain("landing-extracted");

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
