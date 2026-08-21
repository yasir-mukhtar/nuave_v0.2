import { describe, expect, it } from "vitest";
import { goldenPrompts } from "./fixtures/report-golden";
import {
  createVarianceFailureRecord,
  selectVariancePrompts,
  varianceRunKeyForReport,
} from "./variance";
import type { AuditReport } from "./types";

describe("variance workflow helpers", () => {
  it("selects exactly two stable, unique questions from the locked ten", () => {
    const first = selectVariancePrompts(goldenPrompts);
    const second = selectVariancePrompts(goldenPrompts);

    expect(first).toHaveLength(2);
    expect(first.map((prompt) => prompt.prompt_id)).toEqual(
      second.map((prompt) => prompt.prompt_id),
    );
    expect(new Set(first.map((prompt) => prompt.prompt_id)).size).toBe(2);
    expect(first[0].branded).toBe(false);
    expect(first[1].branded).toBe(true);

    const lockedIds = new Set(goldenPrompts.map((prompt) => prompt.prompt_id));
    expect(first.every((prompt) => lockedIds.has(prompt.prompt_id))).toBe(true);
  });

  it("rejects selection from anything other than the unique locked ten", () => {
    expect(() => selectVariancePrompts(goldenPrompts.slice(0, 9))).toThrow(
      /ten unique questions/,
    );
    expect(() =>
      selectVariancePrompts([
        ...goldenPrompts.slice(0, 9),
        goldenPrompts[0],
      ]),
    ).toThrow(/ten unique questions/);
  });

  it("uses the report response id as the stable variance run key", () => {
    const report = {
      provenance: { report_response_id: "resp_stable_report_123" },
    } as AuditReport;
    expect(varianceRunKeyForReport(report)).toBe("resp_stable_report_123");
    expect(varianceRunKeyForReport(report)).toBe("resp_stable_report_123");
  });

  it(
    "records browser-level variance failure separately without observations",
    () => {
      const record = createVarianceFailureRecord({
        run_key: "resp_report_123",
        prompt_ids: [goldenPrompts[0].prompt_id, goldenPrompts[5].prompt_id],
        incomplete_reason: "Synthetic variance route failure.",
        now: () => "2026-08-21T00:00:00.000Z",
      });

      expect(record).toEqual({
        run_key: "resp_report_123",
        created_at: "2026-08-21T00:00:00.000Z",
        prompt_ids: [goldenPrompts[0].prompt_id, goldenPrompts[5].prompt_id],
        complete: false,
        incomplete_reason: "Synthetic variance route failure.",
      });
      expect(record).not.toHaveProperty("observations");
    },
  );
});
