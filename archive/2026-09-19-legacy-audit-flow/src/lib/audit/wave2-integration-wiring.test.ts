import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Wave 2 cross-lane integration wiring", () => {
  it("uses the customer-safe evidence projection from the real audit workflow", () => {
    const workflow = source("src/app/audit/AuditWorkflow.tsx");

    expect(workflow).toContain("makeCustomerEvidenceExport");
    expect(workflow).toContain("const evidence = makeCustomerEvidenceExport(");
    expect(workflow).not.toContain("const evidence = makeEvidenceExport(");
    expect(workflow).toContain("customerAuditErrorMessage");
  });

  it("keeps customer-owned fact preservation and Wave 1 invalidation in the reconciled workflow", () => {
    const workflow = source("src/app/audit/AuditWorkflow.tsx");

    expect(workflow).toContain("factsCustomerOwned");
    expect(workflow).toContain("PRESERVED_FACTS_WARNING");
    expect(workflow).toContain(
      'operationGeneration.invalidate("Business facts changed")',
    );
    expect(workflow).toContain('operationGeneration.begin("prompts")');
    expect(workflow).toContain('operationGeneration.begin("run")');
    expect(workflow).toContain('operationGeneration.begin("report")');
    expect(workflow).toContain('operationGeneration.begin("variance")');
  });

  it("keeps website/Instagram-only source truth while using the local audit backdrop", () => {
    const hero = source("src/app/audit/SourceHero.tsx");
    const backdrop = source("src/app/audit/SourceHeroBackdrop.module.css");

    expect(hero).toContain("Website atau akun Instagram");
    expect(hero).toContain("localBackdrop");
    expect(hero).not.toContain("Google Business Profile");
    expect(backdrop).not.toContain("http://");
    expect(backdrop).not.toContain("https://");
  });
});
