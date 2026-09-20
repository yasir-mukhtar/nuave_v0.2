import { describe, expect, it } from "vitest";
import {
  FIXTURE_PROCESSING_REDUCED_MOTION_MS,
  FIXTURE_PROCESSING_STAGE_MS,
  FIXTURE_PROCESSING_WORK_STAGE_COUNT,
  fixtureProcessingStages,
  fixtureRunStatusLabelOrder,
  fixtureRunStatusLabels,
  isWorkStage,
  processingStageDurationMs,
} from "./processing";

describe("fixture processing simulation", () => {
  it("defines the customer-meaningful Indonesian stages in the required order", () => {
    expect(fixtureProcessingStages.map((stage) => stage.label)).toEqual([
      "Menyiapkan pertanyaan audit",
      "Menguji sepuluh pertanyaan",
      "Memeriksa bukti dan sumber",
      "Menyiapkan laporan",
      "Laporan siap",
    ]);
  });

  it("keeps the terminal stage last and the four work stages first", () => {
    expect(fixtureProcessingStages).toHaveLength(5);
    expect(fixtureProcessingStages[4].id).toBe("ready");
    expect(fixtureProcessingStages[4].label).toBe("Laporan siap");
    expect(FIXTURE_PROCESSING_WORK_STAGE_COUNT).toBe(4);
    expect(
      fixtureProcessingStages
        .slice(0, FIXTURE_PROCESSING_WORK_STAGE_COUNT)
        .every((stage) => stage.id !== "ready"),
    ).toBe(true);
  });

  it("treats only persisted work stages as valid", () => {
    expect(isWorkStage(0)).toBe(true);
    expect(isWorkStage(1)).toBe(true);
    expect(isWorkStage(2)).toBe(true);
    expect(isWorkStage(3)).toBe(true);
    expect(isWorkStage(4)).toBe(false);
    expect(isWorkStage(-1)).toBe(false);
    expect(isWorkStage(1.5)).toBe(false);
    expect(isWorkStage(Number.NaN)).toBe(false);
  });

  it("is bounded and deterministic, with reduced motion much shorter", () => {
    expect(processingStageDurationMs(false)).toBe(FIXTURE_PROCESSING_STAGE_MS);
    expect(processingStageDurationMs(true)).toBe(
      FIXTURE_PROCESSING_REDUCED_MOTION_MS,
    );
    expect(FIXTURE_PROCESSING_REDUCED_MOTION_MS).toBeLessThan(
      FIXTURE_PROCESSING_STAGE_MS,
    );
    // The complete normal path stays under a few seconds: four work stages.
    expect(
      FIXTURE_PROCESSING_STAGE_MS * FIXTURE_PROCESSING_WORK_STAGE_COUNT,
    ).toBeLessThan(6_000);
  });
});

describe("run-status labels (R-40)", () => {
  it("carries the settled Indonesian run-status set exactly", () => {
    expect(fixtureRunStatusLabels).toEqual({
      waiting: "Menunggu",
      testing: "Sedang diuji",
      retrying: "Mencoba kembali",
      done: "Selesai",
      notTested: "Belum berhasil diuji",
    });
  });

  it("lists the five labels in the settled order", () => {
    expect(fixtureRunStatusLabelOrder).toEqual([
      "Menunggu",
      "Sedang diuji",
      "Mencoba kembali",
      "Selesai",
      "Belum berhasil diuji",
    ]);
  });
});
