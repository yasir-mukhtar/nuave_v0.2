import type { ReportContent } from "./types";

export const REPORT_WRITING_STANDARD_VERSION = "plain-en-v1" as const;

export const REPORT_WORD_LIMITS = {
  conclusion: 60,
  key_finding_title: 12,
  key_finding_explanation: 35,
  priority_action: 24,
  priority_why: 25,
  priority_basis: 25,
  priority_done_when: 25,
  priority_caveat: 18,
  detail_finding: 30,
  detail_evidence_note: 24,
} as const;

export const REPORT_MAX_SENTENCE_WORDS = 25;

const CUSTOMER_FACING_JARGON = [
  "api observation",
  "branded question",
  "causal evidence",
  "consumer chatgpt equivalence",
  "execution surface",
  "point-in-time",
  "retained observation",
  "unbranded question",
] as const;

type AuthoredField = {
  label: string;
  value: string;
  wordLimit: number;
};

export function countWords(value: string) {
  return (
    value.match(/[\p{L}\p{N}]+(?:[\u2019'-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  );
}

function sentences(value: string) {
  return (
    value.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()) ?? []
  );
}

function authoredFields(content: ReportContent): AuthoredField[] {
  return [
    {
      label: "Conclusion",
      value: content.conclusion,
      wordLimit: REPORT_WORD_LIMITS.conclusion,
    },
    ...content.key_findings.flatMap((finding, index) => [
      {
        label: `Finding ${index + 1} title`,
        value: finding.title,
        wordLimit: REPORT_WORD_LIMITS.key_finding_title,
      },
      {
        label: `Finding ${index + 1} explanation`,
        value: finding.explanation,
        wordLimit: REPORT_WORD_LIMITS.key_finding_explanation,
      },
    ]),
    ...content.priorities.flatMap((priority, index) => [
      {
        label: `Priority ${index + 1} action`,
        value: priority.action,
        wordLimit: REPORT_WORD_LIMITS.priority_action,
      },
      {
        label: `Priority ${index + 1} reason`,
        value: priority.why,
        wordLimit: REPORT_WORD_LIMITS.priority_why,
      },
      {
        label: `Priority ${index + 1} evidence`,
        value: priority.basis,
        wordLimit: REPORT_WORD_LIMITS.priority_basis,
      },
      {
        label: `Priority ${index + 1} completion check`,
        value: priority.done_when,
        wordLimit: REPORT_WORD_LIMITS.priority_done_when,
      },
      {
        label: `Priority ${index + 1} caveat`,
        value: priority.caveat,
        wordLimit: REPORT_WORD_LIMITS.priority_caveat,
      },
    ]),
    ...content.details.flatMap((detail, index) => [
      {
        label: `Test ${index + 1} finding`,
        value: detail.finding,
        wordLimit: REPORT_WORD_LIMITS.detail_finding,
      },
      {
        label: `Test ${index + 1} meaning`,
        value: detail.evidence_note,
        wordLimit: REPORT_WORD_LIMITS.detail_evidence_note,
      },
    ]),
  ];
}

export function reportWritingInstructions() {
  const limits = REPORT_WORD_LIMITS;
  return [
    `Follow Nuave writing standard ${REPORT_WRITING_STANDARD_VERSION}.`,
    "Write for a non-technical business owner or small-brand founder.",
    "Put the result or requested action first. Put supporting detail after it.",
    "Use common words, active voice, one main idea per sentence, and no filler.",
    `Keep every sentence to ${REPORT_MAX_SENTENCE_WORDS} words or fewer.`,
    "Do not use API observation, branded question, causal evidence, consumer ChatGPT equivalence, execution surface, point-in-time, retained observation, or unbranded question in customer-facing fields.",
    `Maximum words: conclusion ${limits.conclusion}; finding title ${limits.key_finding_title}; finding explanation ${limits.key_finding_explanation}; priority action ${limits.priority_action}; priority reason ${limits.priority_why}; priority evidence ${limits.priority_basis}; completion check ${limits.priority_done_when}; caveat ${limits.priority_caveat}; detailed finding ${limits.detail_finding}; detailed meaning ${limits.detail_evidence_note}.`,
    "Do not write excerpts, source links, run state, or visible-brand appearance; Nuave derives those fields from retained evidence.",
    "Do not write method copy. The report page creates the method section from recorded facts.",
  ];
}

export function validateReportLanguage(content: ReportContent): string[] {
  const errors: string[] = [];

  for (const field of authoredFields(content)) {
    const words = countWords(field.value);
    if (words > field.wordLimit) {
      errors.push(
        `${field.label} has ${words} words; the limit is ${field.wordLimit}.`,
      );
    }

    sentences(field.value).forEach((sentence, index) => {
      const sentenceWords = countWords(sentence);
      if (sentenceWords > REPORT_MAX_SENTENCE_WORDS) {
        errors.push(
          `${field.label} sentence ${index + 1} has ${sentenceWords} words; the limit is ${REPORT_MAX_SENTENCE_WORDS}.`,
        );
      }
    });

    const normalized = field.value.toLocaleLowerCase("en-US");
    CUSTOMER_FACING_JARGON.forEach((term) => {
      if (normalized.includes(term)) {
        errors.push(`${field.label} uses technical wording: ${term}.`);
      }
    });
  }

  return errors;
}

function protectedReportShape(content: ReportContent) {
  return {
    accuracy_status: content.accuracy_status,
    observed_competitors: content.observed_competitors,
    key_findings: content.key_findings.map((finding) => ({
      evidence_prompt_ids: finding.evidence_prompt_ids,
    })),
    priorities: content.priorities.map((priority) => ({
      order: priority.order,
      timing: priority.timing,
      owner: priority.owner,
      evidence_prompt_ids: priority.evidence_prompt_ids,
    })),
    details: content.details.map((detail) => ({
      prompt_id: detail.prompt_id,
      run: detail.run,
      appearance: detail.appearance,
      recommendation: detail.recommendation,
      comparison: detail.comparison,
      information: detail.information,
      answer_excerpt: detail.answer_excerpt,
      source_urls: detail.source_urls,
    })),
  };
}

export function validateReportLanguageRevision(
  original: ReportContent,
  revision: ReportContent,
): string[] {
  if (
    JSON.stringify(protectedReportShape(original)) !==
    JSON.stringify(protectedReportShape(revision))
  ) {
    return [
      "The language revision changed protected classifications or evidence.",
    ];
  }
  return [];
}

// ============================================================================
// Indonesian writing-standard calibration (Spec 002 R-38, R-39, R-40)
// ============================================================================
//
// CANDIDATE CALIBRATION — PENDING FOUNDER REVIEW.
//
// The values below are CANDIDATES encoded from docs/drafts/VOICE-v2-candidate.md
// §5 (sentence-length rules) and the existing runtime ceiling. Spec 002 open
// question 2 and docs/AUDIT.md ("Plain-language writing standard") require a
// dedicated product-language review session (the R-38 human gate) before an
// Indonesian writing contract is settled; the calibration values themselves
// are not set by the spec. Until that session clears, nothing here is approved
// calibration: a fixture or report must not be claimed to pass a settled
// Indonesian contract on these candidate values alone, and this calibration is
// NOT wired into the live engine path (plain-en-v1 stays the runtime default).

export const INDONESIAN_REPORT_WRITING_STANDARD_VERSION =
  "plain-id-v1" as const;

export const REPORT_WRITING_STANDARD_VERSIONS = [
  REPORT_WRITING_STANDARD_VERSION,
  INDONESIAN_REPORT_WRITING_STANDARD_VERSION,
] as const;

export type ReportWritingStandardVersion =
  (typeof REPORT_WRITING_STANDARD_VERSIONS)[number];

/**
 * Whether the Indonesian calibration still awaits the founder language-session
 * gate (Spec 002 open question 2 / AC-25). Settled to false by founder
 * approval on 2026-08-17; the values in
 * INDONESIAN_REPORT_LANGUAGE_CALIBRATION are the settled calibration.
 */
export const INDONESIAN_CALIBRATION_FOUNDER_REVIEW_PENDING = false as const;

export const INDONESIAN_REPORT_LANGUAGE_CALIBRATION = {
  writing_standard_version: INDONESIAN_REPORT_WRITING_STANDARD_VERSION,
  // Settled by founder approval 2026-08-17 (Spec 002 AC-25 language gate).
  status: "founder-approved-2026-08-17",
  // VOICE-v2-candidate.md §5: "Target 12–20 words for Nuave-authored
  // explanatory sentences." Founder-approved bounds, checked as advisory
  // warnings below.
  sentence_target_min_words: 12,
  sentence_target_max_words: 20,
  // VOICE-v2-candidate.md §5: "25 words is the hard ceiling in validated
  // report fields" — the same ceiling the plain-en-v1 runtime enforces. A
  // sentence over this ceiling is a hard error in Nuave-authored fields.
  sentence_hard_ceiling_words: REPORT_MAX_SENTENCE_WORDS,
  // The voice candidate explicitly does not set field-level word totals
  // ("those belong in the runtime report-language Indonesian contract").
  // Founder approved no field totals on 2026-08-17; none are invented.
  field_word_limits: null,
  // Exact evidence — tested questions, answer excerpts, business and
  // competitor names, source titles, official terms, dates, models — is
  // exempt from prose-length limits and copied verbatim (R-27, §5).
  scope: "Nuave-authored fields only; exact evidence exempt",
} as const;

/**
 * Exact-evidence surfaces that are exempt from prose-length limits. These are
 * copied verbatim, never translated or paraphrased (Spec 002 R-27). Callers
 * pass the surfaces their report context holds (questions, sources, official
 * terms); answer excerpts and observed-competitor names are derived from the
 * ReportContent itself.
 */
export type IndonesianExactEvidenceSurfaces = {
  questions: string[];
  answer_excerpts: string[];
  business_names: string[];
  source_titles: string[];
  official_terms: string[];
};

export type IndonesianReportLanguageResult = {
  /** Hard failures: a sentence over the candidate ceiling in a Nuave-authored field. */
  errors: string[];
  /** Advisory signals: a Nuave-authored sentence outside the 12–20 candidate target range. */
  warnings: string[];
};

function normalizeExact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function contentExactEvidenceSurfaces(content: ReportContent): string[] {
  return [
    ...content.details.map((detail) => detail.answer_excerpt),
    ...content.observed_competitors.map((competitor) => competitor.name),
  ].filter((value) => Boolean(value.trim()));
}

function isExactEvidence(value: string, surfaces: string[]): boolean {
  const normalized = normalizeExact(value);
  if (!normalized) return false;
  return surfaces.some((surface) => normalizeExact(surface) === normalized);
}

/**
 * Machine-checkable Indonesian calibration (candidate values; see the
 * founder-review-pending note above). Applies the candidate sentence target
 * (12–20 words) and hard ceiling (25 words) to Nuave-authored fields only.
 * Exact evidence — questions, answer excerpts, business and competitor
 * names, source titles, official terms — is exempt: a field or sentence that
 * is verbatim exact evidence is not measured against prose-length limits.
 */
export function validateIndonesianReportLanguage(
  content: ReportContent,
  exactEvidence: Partial<IndonesianExactEvidenceSurfaces> = {},
): IndonesianReportLanguageResult {
  const calibration = INDONESIAN_REPORT_LANGUAGE_CALIBRATION;
  const surfaces = [
    ...contentExactEvidenceSurfaces(content),
    ...(exactEvidence.questions ?? []),
    ...(exactEvidence.answer_excerpts ?? []),
    ...(exactEvidence.business_names ?? []),
    ...(exactEvidence.source_titles ?? []),
    ...(exactEvidence.official_terms ?? []),
  ].filter((value) => Boolean(value.trim()));

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of authoredFields(content)) {
    if (isExactEvidence(field.value, surfaces)) continue;
    sentences(field.value).forEach((sentence, index) => {
      if (isExactEvidence(sentence, surfaces)) return;
      const wordCount = countWords(sentence);
      if (wordCount > calibration.sentence_hard_ceiling_words) {
        errors.push(
          `${field.label} sentence ${index + 1} has ${wordCount} words; the Indonesian ceiling is ${calibration.sentence_hard_ceiling_words}.`,
        );
      } else if (
        wordCount < calibration.sentence_target_min_words ||
        wordCount > calibration.sentence_target_max_words
      ) {
        warnings.push(
          `${field.label} sentence ${index + 1} has ${wordCount} words; the Indonesian target range is ${calibration.sentence_target_min_words}-${calibration.sentence_target_max_words}.`,
        );
      }
    });
  }

  return { errors, warnings };
}

/** Hard-failure errors only; advisory target warnings are discarded. */
export function indonesianReportLanguageErrors(
  content: ReportContent,
  exactEvidence?: Partial<IndonesianExactEvidenceSurfaces>,
): string[] {
  return validateIndonesianReportLanguage(content, exactEvidence).errors;
}

/**
 * Language-only retry protection for the Indonesian calibration (Spec 002
 * R-39). The same protected report-shape check that guards plain-en-v1 is
 * retained: a language-only retry may change only Nuave-authored language. It
 * cannot change classifications, evidence IDs, sources, answer excerpts, run
 * facts, or method copy.
 */
export function validateIndonesianReportLanguageRevision(
  original: ReportContent,
  revision: ReportContent,
): string[] {
  return validateReportLanguageRevision(original, revision);
}
