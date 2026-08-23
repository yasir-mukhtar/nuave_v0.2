import { describe, expect, it } from "vitest";
import { exactReportExcerptErrors } from "./report-excerpt";
import type { AuditObservation, ReportContent } from "./types";

const observation = {
  prompt_id: "NVA-ID-01",
  run_status: "completed",
  raw_answer: "Baris pertama.\n\nBaris kedua tetap persis.",
} as AuditObservation;

function content(answer_excerpt: string) {
  return {
    details: [{ prompt_id: "NVA-ID-01", answer_excerpt }],
  } as ReportContent;
}

describe("exact report excerpt boundary", () => {
  it("accepts a true exact substring including original newlines", () => {
    expect(
      exactReportExcerptErrors(
        content("Baris pertama.\n\nBaris kedua tetap persis."),
        [observation],
      ),
    ).toEqual([]);
  });

  it("rejects whitespace-normalized text that is not verbatim", () => {
    expect(
      exactReportExcerptErrors(
        content("Baris pertama. Baris kedua tetap persis."),
        [observation],
      ),
    ).toEqual([
      "NVA-ID-01 has an answer excerpt that is not copied exactly from the raw response.",
    ]);
  });
});
