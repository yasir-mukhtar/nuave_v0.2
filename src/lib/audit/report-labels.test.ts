import { describe, expect, it } from "vitest";
import {
  INDONESIAN_REPORT_LABELS,
  INDONESIAN_RUN_STATUS_KEYS,
  INDONESIAN_RUN_STATUS_LABELS,
  indonesianCountLabel,
  indonesianHeadline,
  indonesianObservationRunStatus,
  indonesianRunStatusLabel,
} from "./report-labels";

// ---------------------------------------------------------------------------
// Deterministic Indonesian label translation (Spec 002 R-40, AC-26).
//
// VERIFICATION.md previously cited "report-labels.ts tests" as AC-26
// evidence while no such file existed (adversarial review Finding 8): the
// coverage lived inline in report-language-id.test.ts, and the module's real
// production callers were limited to the run-status labels. This file is the
// actual dedicated suite, and FixtureReportView.tsx now routes its "Tidak
// diuji", headline, and composition labels through this module instead of
// re-implementing them inline.
// ---------------------------------------------------------------------------

describe("deterministic Indonesian label translation (R-40, AC-26)", () => {
  it("returns the settled report labels verbatim", () => {
    expect(INDONESIAN_REPORT_LABELS.without_business_name).toBe(
      "Tanpa menyebut bisnis Anda",
    );
    expect(INDONESIAN_REPORT_LABELS.with_business_name).toBe(
      "Menyebut bisnis Anda",
    );
    expect(INDONESIAN_REPORT_LABELS.not_tested).toBe("Tidak diuji");
    expect(INDONESIAN_REPORT_LABELS.download_pdf).toBe("Download PDF");
  });

  it("formats headline and count from provided counts without recomputing evidence", () => {
    expect(indonesianHeadline(8)).toBe(
      "Bisnis Anda muncul di 8 dari 10 pertanyaan",
    );
    expect(indonesianCountLabel(8, 10)).toBe("8/10");
    expect(indonesianCountLabel(3, 5)).toBe("3/5");
    expect(indonesianCountLabel(0, 5)).toBe("0/5");
  });

  it("throws rather than inventing a label for an invalid mention count", () => {
    expect(() => indonesianHeadline(-1)).toThrow(
      /non-negative integer mention count/,
    );
    expect(() => indonesianHeadline(1.5)).toThrow(
      /non-negative integer mention count/,
    );
  });

  it("renders an empty denominator as Tidak diuji, never zero performance", () => {
    expect(indonesianCountLabel(0, 0)).toBe("Tidak diuji");
    expect(indonesianCountLabel(5, 0)).toBe("Tidak diuji");
    expect(indonesianCountLabel(2, -1)).toBe("Tidak diuji");
  });

  it("maps the run-status set to the settled labels", () => {
    expect(INDONESIAN_RUN_STATUS_KEYS).toEqual([
      "pending",
      "running",
      "retrying",
      "completed",
      "failed",
    ]);
    expect(INDONESIAN_RUN_STATUS_LABELS).toEqual({
      pending: "Menunggu",
      running: "Sedang diuji",
      retrying: "Mencoba kembali",
      completed: "Selesai",
      failed: "Belum berhasil diuji",
    });
    expect(indonesianRunStatusLabel("pending")).toBe("Menunggu");
    expect(indonesianRunStatusLabel("running")).toBe("Sedang diuji");
    expect(indonesianRunStatusLabel("retrying")).toBe("Mencoba kembali");
    expect(indonesianRunStatusLabel("completed")).toBe("Selesai");
    expect(indonesianRunStatusLabel("failed")).toBe("Belum berhasil diuji");
  });

  it("throws rather than inventing a label for an unknown run-status key", () => {
    expect(() =>
      indonesianRunStatusLabel(
        "unknown" as unknown as (typeof INDONESIAN_RUN_STATUS_KEYS)[number],
      ),
    ).toThrow(/Unknown Indonesian run status/);
  });

  it("translates recorded observation run statuses deterministically", () => {
    expect(indonesianObservationRunStatus("completed")).toBe("Selesai");
    expect(indonesianObservationRunStatus("failed")).toBe(
      "Belum berhasil diuji",
    );
  });
});
