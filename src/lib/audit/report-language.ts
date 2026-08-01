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
    "Copy answer_excerpt exactly from raw_answer. Do not paraphrase it, add quotation marks, or add an ellipsis.",
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
      status: detail.status,
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
