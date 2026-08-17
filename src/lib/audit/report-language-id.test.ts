import { describe, expect, it } from "vitest";
import {
  INDONESIAN_CALIBRATION_FOUNDER_REVIEW_PENDING,
  INDONESIAN_REPORT_LANGUAGE_CALIBRATION,
  INDONESIAN_REPORT_WRITING_STANDARD_VERSION,
  REPORT_WRITING_STANDARD_VERSION,
  REPORT_WRITING_STANDARD_VERSIONS,
  indonesianReportLanguageErrors,
  validateIndonesianReportLanguage,
  validateIndonesianReportLanguageRevision,
  validateReportLanguage,
} from "./report-language";
import {
  INDONESIAN_REPORT_LABELS,
  INDONESIAN_RUN_STATUS_KEYS,
  INDONESIAN_RUN_STATUS_LABELS,
  indonesianCountLabel,
  indonesianHeadline,
  indonesianObservationRunStatus,
  indonesianRunStatusLabel,
} from "./report-labels";
import type { ReportContent } from "./types";

const PROMPT_IDS = Array.from(
  { length: 10 },
  (_, index) => `prompt-${index + 1}`,
);

function reportContent(): ReportContent {
  return {
    conclusion:
      "Observasi menunjukkan temuan yang perlu ditinjau lebih lanjut.",
    accuracy_status: "no_clear_issues",
    observed_competitors: [],
    key_findings: [
      {
        title: "Temuan utama",
        explanation:
          "Penjelasan singkat tentang temuan yang paling penting ini.",
        evidence_prompt_ids: [PROMPT_IDS[0]],
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "do_first",
        action: "Perbarui informasi resmi bisnis Anda",
        why: "Informasi yang tersimpan perlu diverifikasi lagi.",
        basis: "Dari jawaban observasi yang tersimpan.",
        owner: "marketing",
        done_when: "Informasi resmi sudah konsisten dan benar.",
        evidence_prompt_ids: [PROMPT_IDS[0]],
        caveat: "Ini bukan jaminan rekomendasi dari model AI.",
      },
    ],
    details: PROMPT_IDS.map((prompt_id) => ({
      prompt_id,
      run: "completed" as const,
      appearance: "absent" as const,
      recommendation: "not_recommended" as const,
      comparison: "not_observed" as const,
      information: "not_assessed" as const,
      finding: "Bisnis Anda tidak muncul dalam jawaban ini.",
      answer_excerpt: "Jawaban yang tersimpan tidak menyebutkan bisnis Anda.",
      evidence_note: "Jawaban yang tersimpan tidak menyebut bisnis Anda.",
      source_urls: ["https://example.com"],
    })),
  };
}

function sentenceOf(length: number, word = "jelas") {
  return `${Array.from({ length }, () => word).join(" ")}.`;
}

describe("Indonesian report-language calibration (plain-id-v1, founder-approved)", () => {
  it("is a versioned standard settled by founder approval (R-38 gate cleared)", () => {
    expect(INDONESIAN_REPORT_WRITING_STANDARD_VERSION).toBe("plain-id-v1");
    expect(REPORT_WRITING_STANDARD_VERSIONS).toEqual([
      "plain-en-v1",
      "plain-id-v1",
    ]);
    expect(INDONESIAN_CALIBRATION_FOUNDER_REVIEW_PENDING).toBe(false);
    expect(INDONESIAN_REPORT_LANGUAGE_CALIBRATION).toMatchObject({
      writing_standard_version: "plain-id-v1",
      status: "founder-approved-2026-08-17",
      sentence_target_min_words: 12,
      sentence_target_max_words: 20,
      sentence_hard_ceiling_words: 25,
      field_word_limits: null,
    });
  });

  it("keeps the plain-en-v1 standard untouched", () => {
    expect(REPORT_WRITING_STANDARD_VERSION).toBe("plain-en-v1");
    expect(validateReportLanguage(reportContent())).toEqual([]);
  });

  it("applies the candidate ceiling to Nuave-authored fields only", () => {
    const content = reportContent();
    content.conclusion = sentenceOf(26);
    const result = validateIndonesianReportLanguage(content);
    expect(result.errors.join(" ")).toContain("ceiling is 25");

    // The same >25-word text in a non-authored surface (exact excerpt) is
    // never measured: answer_excerpt is retained evidence, not Nuave copy.
    const excerptOnly = reportContent();
    excerptOnly.details[0].answer_excerpt = sentenceOf(40, "kutipan");
    expect(validateIndonesianReportLanguage(excerptOnly).errors).toEqual([]);
  });

  it("exempts exact evidence verbatim in authored fields", () => {
    const longExcerpt = sentenceOf(30, "kutipan");

    // Whole-field exemption: an authored field that IS the exact excerpt.
    const wholeField = reportContent();
    wholeField.details[0].answer_excerpt = longExcerpt;
    wholeField.details[0].finding = longExcerpt;
    expect(validateIndonesianReportLanguage(wholeField).errors).toEqual([]);

    // Per-sentence exemption: a short lead-in plus the verbatim excerpt.
    const mixed = reportContent();
    mixed.details[0].answer_excerpt = longExcerpt;
    mixed.details[0].finding = `Temuan singkat. ${longExcerpt}`;
    expect(validateIndonesianReportLanguage(mixed).errors).toEqual([]);

    // Caller-provided question surface is exempt too.
    const longQuestion = `${Array.from({ length: 30 }, (_, i) => `tanya${i}`).join(" ")}?`;
    const withQuestion = reportContent();
    withQuestion.details[0].finding = longQuestion;
    expect(
      validateIndonesianReportLanguage(withQuestion, {
        questions: [longQuestion],
      }).errors,
    ).toEqual([]);

    // A long sentence that is NOT exact evidence still fails.
    const notEvidence = reportContent();
    notEvidence.details[0].finding = sentenceOf(26);
    expect(validateIndonesianReportLanguage(notEvidence).errors).not.toEqual(
      [],
    );
    expect(indonesianReportLanguageErrors(notEvidence).join(" ")).toContain(
      "ceiling is 25",
    );
  });

  it("reports the 12-20 target range as advisory warnings, not failures", () => {
    // Over target, under ceiling: warning only.
    const overTarget = reportContent();
    overTarget.conclusion = sentenceOf(22);
    const overResult = validateIndonesianReportLanguage(overTarget);
    expect(overResult.errors).toEqual([]);
    expect(overResult.warnings.join(" ")).toContain("target range is 12-20");

    // Below target: warning only.
    const belowTarget = reportContent();
    belowTarget.conclusion = "Terlalu pendek.";
    const belowResult = validateIndonesianReportLanguage(belowTarget);
    expect(belowResult.errors).toEqual([]);
    expect(belowResult.warnings.join(" ")).toContain("target range is 12-20");

    // Inside the target range: the measured sentence is neither error nor warning.
    const inRange = reportContent();
    inRange.conclusion = sentenceOf(15);
    const inRangeResult = validateIndonesianReportLanguage(inRange);
    expect(inRangeResult.errors).toEqual([]);
    expect(
      inRangeResult.warnings.some((warning) =>
        warning.startsWith("Conclusion"),
      ),
    ).toBe(false);
  });

  it("retains language-only retry protection for the Indonesian calibration", () => {
    const original = reportContent();

    const excerptChange = structuredClone(original);
    excerptChange.details[0].answer_excerpt = "Changed evidence";
    expect(
      validateIndonesianReportLanguageRevision(original, excerptChange).join(
        " ",
      ),
    ).toContain("protected classifications or evidence");

    const sourceChange = structuredClone(original);
    sourceChange.details[0].source_urls = ["https://changed.example"];
    expect(
      validateIndonesianReportLanguageRevision(original, sourceChange),
    ).not.toEqual([]);

    const idChange = structuredClone(original);
    idChange.details[0].prompt_id = "prompt-99";
    expect(
      validateIndonesianReportLanguageRevision(original, idChange),
    ).not.toEqual([]);

    const classificationChange = structuredClone(original);
    classificationChange.details[0].recommendation = "recommended";
    expect(
      validateIndonesianReportLanguageRevision(original, classificationChange),
    ).not.toEqual([]);

    // A language-only change stays clean.
    const languageOnly = structuredClone(original);
    languageOnly.conclusion =
      "Kesimpulan ditulis ulang dengan bahasa yang lebih ringkas dan jelas.";
    expect(
      validateIndonesianReportLanguageRevision(original, languageOnly),
    ).toEqual([]);
  });
});

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

  it("translates recorded observation run statuses deterministically", () => {
    expect(indonesianObservationRunStatus("completed")).toBe("Selesai");
    expect(indonesianObservationRunStatus("failed")).toBe(
      "Belum berhasil diuji",
    );
  });
});
