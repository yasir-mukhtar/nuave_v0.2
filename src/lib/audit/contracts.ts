import type {
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
  ReportContent,
} from "./types";
import { REPORT_WRITING_STANDARD_VERSION } from "./report-language";

export const PROMPT_CONTRACT_VERSION = "draft-v2-en";

export const PROMPT_MATRIX = [
  [
    "NUAVE-BRAND-NEED-01",
    "need_discovery",
    false,
    "Explore one verified need without naming a brand",
  ],
  [
    "NUAVE-BRAND-NEED-02",
    "need_discovery",
    false,
    "Explore a different verified need without naming a brand",
  ],
  [
    "NUAVE-BRAND-SOLUTION-01",
    "solution_discovery",
    false,
    "Find relevant category options in the market context",
  ],
  [
    "NUAVE-BRAND-SOLUTION-02",
    "solution_discovery",
    false,
    "Find options for one verified offering or use case",
  ],
  [
    "NUAVE-BRAND-COMPARISON-01",
    "comparison",
    false,
    "Compare unnamed category options using verified criteria",
  ],
  [
    "NUAVE-BRAND-COMPARISON-02",
    "comparison",
    true,
    "Compare the brand with one verified competitor",
  ],
  [
    "NUAVE-BRAND-VALIDATION-01",
    "validation",
    true,
    "Verify category fit, offering, or an important public fact",
  ],
  [
    "NUAVE-BRAND-VALIDATION-02",
    "validation",
    true,
    "Verify identity, scope, market, or information consistency",
  ],
  [
    "NUAVE-BRAND-ACTION-01",
    "action",
    true,
    "Ask about a practical next step or access path",
  ],
  [
    "NUAVE-BRAND-ACTION-02",
    "action",
    true,
    "Ask about another verified decision or conversion detail",
  ],
] as const;

function normalize(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function validatePromptPack(
  prompts: AuditPrompt[],
  brief: BusinessBrief,
) {
  const errors: string[] = [];
  if (prompts.length !== 10)
    errors.push("The audit must contain exactly 10 questions.");

  PROMPT_MATRIX.forEach(([id, category, branded, role], index) => {
    const prompt = prompts[index];
    if (!prompt) return;
    if (prompt.prompt_id !== id)
      errors.push(`Question ${index + 1} has the wrong ID.`);
    if (prompt.category !== category)
      errors.push(`${id} has the wrong category.`);
    if (prompt.branded !== branded)
      errors.push(`${id} has the wrong branded status.`);
    if (prompt.role !== role) errors.push(`${id} has the wrong role.`);
    if (!prompt.question.trim()) errors.push(`${id} has an empty question.`);
  });

  const brandSignals = [brief.brand_name, ...brief.brand_name_variants]
    .map(normalize)
    .filter((value) => value.length >= 3);
  prompts
    .filter((prompt) => !prompt.branded)
    .forEach((prompt) => {
      const question = normalize(prompt.question);
      if (brandSignals.some((signal) => question.includes(signal))) {
        errors.push(
          `${prompt.prompt_id} reveals the brand name or one of its variants.`,
        );
      }
    });

  const counts = new Map<string, number>();
  prompts.forEach((prompt) =>
    counts.set(prompt.category, (counts.get(prompt.category) ?? 0) + 1),
  );
  for (const category of [
    "need_discovery",
    "solution_discovery",
    "comparison",
    "validation",
    "action",
  ]) {
    if (counts.get(category) !== 2)
      errors.push(`The ${category} category must contain two questions.`);
  }
  if (prompts.filter((prompt) => prompt.branded).length !== 5) {
    errors.push(
      "The audit must contain five branded and five unbranded questions.",
    );
  }
  return errors;
}

export function validateReportContent(
  content: ReportContent,
  observations: AuditObservation[],
  brief: BusinessBrief,
): string[] {
  const errors: string[] = [];
  const promptIds = new Set(observations.map((item) => item.prompt_id));
  const validateIds = (ids: string[], label: string) => {
    ids.forEach((id) => {
      if (!promptIds.has(id))
        errors.push(`${label} references an unknown question: ${id}.`);
    });
  };
  content.key_findings.forEach((finding) =>
    validateIds(finding.evidence_prompt_ids, "Finding"),
  );
  content.priorities.forEach((priority) =>
    validateIds(priority.evidence_prompt_ids, "Priority"),
  );
  if (
    new Set(content.details.map((detail) => detail.prompt_id)).size !==
    observations.length
  ) {
    errors.push("Each question must have exactly one detailed finding.");
  }
  const brandSignals = [brief.brand_name, ...brief.brand_name_variants]
    .map(normalize)
    .filter(Boolean);
  content.details.forEach((detail, index) => {
    if (!promptIds.has(detail.prompt_id))
      errors.push(`Unknown detailed finding: ${detail.prompt_id}.`);
    const observation = observations.find(
      (item) => item.prompt_id === detail.prompt_id,
    );
    if (!observation) return;
    if (detail.prompt_id !== observations[index]?.prompt_id) {
      errors.push(`Detailed findings are out of order at ${detail.prompt_id}.`);
    }
    if (
      observation.run_status === "failed" &&
      detail.status !== "could_not_be_tested"
    ) {
      errors.push(
        `${detail.prompt_id} failed but was not marked could_not_be_tested.`,
      );
    }
    const claimsBrandAppeared = [
      "appeared_as_recommendation",
      "mentioned_not_recommended",
      "incomplete_information",
      "conflicting_information",
    ].includes(detail.status);
    const normalizedAnswer = normalize(observation.raw_answer);
    if (
      claimsBrandAppeared &&
      !brandSignals.some((signal) => normalizedAnswer.includes(signal))
    ) {
      errors.push(
        `${detail.prompt_id} claims the brand appeared, but the raw response does not name it.`,
      );
    }
    const permittedSources = new Set(
      observation.sources.map((source) => source.url),
    );
    detail.source_urls.forEach((url) => {
      if (!permittedSources.has(url))
        errors.push(
          `${detail.prompt_id} uses a source that is not attached to the observation.`,
        );
    });
    const normalizedExcerpt = normalizeWhitespace(detail.answer_excerpt);
    const normalizedRawAnswer = normalizeWhitespace(observation.raw_answer);
    if (
      observation.run_status === "completed" &&
      normalizedRawAnswer &&
      !normalizedExcerpt
    ) {
      errors.push(`${detail.prompt_id} is missing an exact answer excerpt.`);
    } else if (
      normalizedExcerpt &&
      !normalizedRawAnswer.includes(normalizedExcerpt)
    ) {
      errors.push(
        `${detail.prompt_id} has an answer excerpt that is not copied exactly from the raw response.`,
      );
    }
  });
  return errors;
}

export function buildAuditReport(
  content: ReportContent,
  observations: AuditObservation[],
): AuditReport {
  const details = new Map(
    content.details.map((detail) => [detail.prompt_id, detail]),
  );
  const completed = observations.filter(
    (item) => item.run_status === "completed",
  );
  const unbranded = completed.filter((item) => !item.branded);
  const branded = completed.filter((item) => item.branded);
  const statusFor = (id: string) => details.get(id)?.status;
  const recognized = new Set([
    "appeared_as_recommendation",
    "mentioned_not_recommended",
    "incomplete_information",
    "conflicting_information",
  ]);
  const returnedModels = [
    ...new Set(completed.map((item) => item.returned_model).filter(Boolean)),
  ];

  return {
    ...content,
    report_version: "nuave-report-v2",
    writing_standard_version: REPORT_WRITING_STANDARD_VERSION,
    generated_at: new Date().toISOString(),
    system_label: `OpenAI Responses API - ${returnedModels.join(", ") || "model unavailable"} with web search`,
    counts: {
      unbranded_recommended: unbranded.filter(
        (item) => statusFor(item.prompt_id) === "appeared_as_recommendation",
      ).length,
      unbranded_mentioned: unbranded.filter(
        (item) => statusFor(item.prompt_id) === "mentioned_not_recommended",
      ).length,
      unbranded_total: unbranded.length,
      branded_recognized: branded.filter((item) =>
        recognized.has(statusFor(item.prompt_id) ?? ""),
      ).length,
      branded_total: branded.length,
      failed: observations.filter((item) => item.run_status === "failed")
        .length,
    },
  };
}

export function makeEvidenceExport(
  brief: BusinessBrief,
  prompts: AuditPrompt[],
  observations: AuditObservation[],
  report: AuditReport,
) {
  return {
    export_version: "nuave-evidence-v2",
    exported_at: new Date().toISOString(),
    disclosure:
      "Observations come from the OpenAI Responses API and do not exactly reproduce the consumer ChatGPT interface.",
    brief: {
      ...brief,
      agency_logo_data_url: brief.agency_logo_data_url
        ? "[device-local logo omitted]"
        : "",
    },
    prompts,
    observations,
    report,
  };
}
