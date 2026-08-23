import { describe, expect, it } from "vitest";
import { AuditOperationGeneration } from "./workflow-operation-generation";

describe("AuditOperationGeneration", () => {
  it.each(["prompts", "run", "report", "variance"] as const)(
    "reset invalidates delayed %s work before it can commit",
    (kind) => {
      const lifecycle = new AuditOperationGeneration();
      const operation = lifecycle.begin(kind);
      expect(lifecycle.isCurrent(operation)).toBe(true);
      lifecycle.invalidate("start over");
      expect(operation.signal.aborted).toBe(true);
      expect(lifecycle.isCurrent(operation)).toBe(false);
    },
  );

  it("a late old response cannot repopulate a newer workflow generation", () => {
    const lifecycle = new AuditOperationGeneration();
    const oldPrompts = lifecycle.begin("prompts");
    lifecycle.invalidate("new workflow");
    const newPrompts = lifecycle.begin("prompts");

    expect(lifecycle.isCurrent(oldPrompts)).toBe(false);
    expect(lifecycle.isCurrent(newPrompts)).toBe(true);
  });

  it("starting the same operation again aborts the obsolete request", () => {
    const lifecycle = new AuditOperationGeneration();
    const first = lifecycle.begin("run");
    const second = lifecycle.begin("run");
    expect(first.signal.aborted).toBe(true);
    expect(lifecycle.isCurrent(first)).toBe(false);
    expect(lifecycle.isCurrent(second)).toBe(true);
  });

  it("a stale terminal run event cannot authorize a report after reset", () => {
    const lifecycle = new AuditOperationGeneration();
    const run = lifecycle.begin("run");
    lifecycle.invalidate("start over");
    const mayGenerateReport = lifecycle.isCurrent(run);
    expect(mayGenerateReport).toBe(false);
  });
});
