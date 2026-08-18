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
      status: "founder-approved-2026-08-17; amended 2026-08-18",
      // Floor removed by founder decision 2026-08-18: the real Indonesian
      // house style runs shorter than the original 12-word floor even in
      // explanatory prose, so only the 20-word ceiling is guidance now.
      sentence_target_min_words: null,
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

  it("reports over-20-word sentences as advisory warnings, with no floor (founder decision 2026-08-18)", () => {
    // Over the 20-word ceiling, under the 25-word hard ceiling: warning only.
    const overTarget = reportContent();
    overTarget.conclusion = sentenceOf(22);
    const overResult = validateIndonesianReportLanguage(overTarget);
    expect(overResult.errors).toEqual([]);
    expect(overResult.warnings.join(" ")).toContain(
      "target is 20 words or fewer",
    );

    // A short sentence is no longer flagged at all: the floor was removed.
    const short = reportContent();
    short.conclusion = "Terlalu pendek.";
    const shortResult = validateIndonesianReportLanguage(short);
    expect(shortResult.errors).toEqual([]);
    expect(shortResult.warnings).toEqual([]);

    // At or under the 20-word ceiling: neither error nor warning.
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

  it("does not split a sentence on a decimal-like period, such as Indonesian 24-hour time notation (adversarial review Finding 7)", () => {
    // Before the fix, "Buka pukul 08.00 dan tutup pukul 21.00." shredded
    // into three fragments ("Buka pukul 08.", "00 dan tutup pukul 21.",
    // "00."), producing spurious "sentence 2" / "sentence 3" warnings from a
    // one-word dangling fragment like "00." — the exact defect the review
    // reproduced ("sentence 5 has 1 words").
    const content = reportContent();
    content.key_findings[0].explanation =
      "Buka pukul 08.00 dan tutup pukul 21.00.";
    const result = validateIndonesianReportLanguage(content);
    expect(result.errors).toEqual([]);
    const findingMessages = [...result.errors, ...result.warnings].filter(
      (message) => message.startsWith("Finding 1 explanation"),
    );
    expect(
      findingMessages.some((message) => message.includes("sentence 2")),
    ).toBe(false);
    expect(
      findingMessages.some((message) => message.includes("sentence 3")),
    ).toBe(false);
  });

  it("carries the customer-facing jargon check over from plain-en-v1 (adversarial review Finding 7)", () => {
    const content = reportContent();
    content.conclusion = "Ini adalah execution surface yang perlu diperiksa.";
    const result = validateIndonesianReportLanguage(content);
    expect(result.errors.join(" ")).toContain(
      "technical wording: execution surface",
    );
    expect(indonesianReportLanguageErrors(content).join(" ")).toContain(
      "execution surface",
    );
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
