import type {
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
  PromptPack,
  ReportContent,
  ReportSynthesis,
} from "./types";
import { REPORT_WRITING_STANDARD_VERSION } from "./report-language";
import { summarizeAuditTelemetry } from "./telemetry";

export const PROMPT_CONTRACT_VERSION = "deterministic-v4-en";
export const REPORT_SYNTHESIS_PROMPT_VERSION = "report-synthesis-v4";

/**
 * Versioned neutral observation instructions (Spec 003 R-14).
 *
 * The live observation path (OpenAI Responses API) sends the settled
 * Indonesian instruction (`neutral-response-v1`, matching the frozen fixture's
 * method record) and records the version on every observation. The legacy
 * English instruction (`observation-instruction-en-v1`) stays available for
 * the paths and tests that pin it; it is not used for live observations.
 */
export const OBSERVATION_INSTRUCTION_VERSION_LEGACY_EN =
  "observation-instruction-en-v1" as const;
export const OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID =
  "neutral-response-v1" as const;

export const OBSERVATION_INSTRUCTION_VERSIONS = [
  OBSERVATION_INSTRUCTION_VERSION_LEGACY_EN,
  OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
] as const;

export type ObservationInstructionVersion =
  (typeof OBSERVATION_INSTRUCTION_VERSIONS)[number];

/** The instruction the live observation path sends and records by default. */
export const DEFAULT_OBSERVATION_INSTRUCTION_VERSION: ObservationInstructionVersion =
  OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID;

export type ReportCallProvenance = {
  requested_model: string;
  returned_model: string;
  response_id: string;
  initial_response_id?: string;
  call_count?: number;
  language_retry_performed?: boolean;
  language_retry_violations?: string[];
  operational_telemetry?: AuditReport["operational_telemetry"];
  /** Overrides PROMPT_CONTRACT_VERSION when the report was built from a
   * differently versioned prompt pack (e.g. the Indonesian question-writer
   * contract, additive Spec 002). Defaults to the English deterministic
   * contract version, unchanged from prior behavior. */
  prompt_contract_version?: string;
};

/**
 * The Nuave-authored sentences `buildAuditReport` computes itself — the
 * method summary and the six facts labels — as an injectable language pack.
 * Defaults to `ENGLISH_AUDIT_REPORT_LABELS`, which reproduces the exact
 * strings this module has always produced, so every existing caller is
 * unaffected. A caller building a non-English report (e.g. the Indonesian
 * fixture path) supplies its own pack instead of leaving these fields to
 * default to English prose (adversarial review Finding 2 / AC-21 / R-26).
 */
export type AuditReportLabelPack = {
  /** `failed` is the raw could-not-be-tested count for this subset — each
   * pack renders its own "N could not be tested" suffix so that context can
   * never leak through in the wrong language (adversarial review Finding 2). */
  discoveryRecommendedLabel: (
    recommended: number,
    total: number,
    failed: number,
  ) => string;
  discoveryMentionLabel: (
    mentioned: number,
    total: number,
    failed: number,
  ) => string;
  recognitionLabel: (recognized: number, total: number, failed: number) => string;
  comparisonLabel: (
    clientPreferred: number,
    total: number,
    competitorPreferred: number,
  ) => string;
  informationLabel: (
    confirmed: number,
    incomplete: number,
    conflicting: number,
  ) => string;
  coverageLabel: (completed: number, total: number, failed: number) => string;
  methodSummary: (context: {
    totalQuestions: number;
    /** Provider/system name(s), e.g. "OpenAI Responses API". Never a full
     * "with web search" sentence — each pack composes its own phrasing. */
    systemPart: string;
    /** " - model, model2" (empty when no model was recorded). */
    modelPart: string;
    unbrandedTotal: number;
    brandedTotal: number;
    coverageLabel: string;
  }) => string;
};

function englishFailedContext(failed: number) {
  return failed ? `; ${failed} ${plural(failed, "question")} could not be tested.` : ".";
}

export const ENGLISH_AUDIT_REPORT_LABELS: AuditReportLabelPack = {
  discoveryRecommendedLabel: (recommended, total, failed) =>
    `Recommended in ${recommended} of ${total} discovery questions${englishFailedContext(failed)}`,
  discoveryMentionLabel: (mentioned, total, failed) =>
    `Named without recommendation in ${mentioned} of ${total} discovery questions${englishFailedContext(failed)}`,
  recognitionLabel: (recognized, total, failed) =>
    `Recognized in ${recognized} of ${total} brand questions${englishFailedContext(failed)}`,
  comparisonLabel: (clientPreferred, total, competitorPreferred) =>
    `Client preferred in ${clientPreferred} of ${total} questions; competitor preferred in ${competitorPreferred}.`,
  informationLabel: (confirmed, incomplete, conflicting) =>
    `${confirmed} confirmed, ${incomplete} incomplete, and ${conflicting} conflicting information results.`,
  coverageLabel: (completed, total, failed) =>
    failed
      ? `${completed} of ${total} questions completed; ${failed} ${plural(failed, "question")} could not be tested.`
      : `${completed} of ${total} questions completed.`,
  methodSummary: ({
    totalQuestions,
    systemPart,
    modelPart,
    unbrandedTotal,
    brandedTotal,
    coverageLabel,
  }) =>
    `We tested ${totalQuestions} questions one at a time through ${systemPart}${modelPart} with web search. ${unbrandedTotal} discovery questions did not name the business in the question. ${brandedTotal} direct checks named the business. ${coverageLabel} A mention is not a recommendation, and a failed test is not a negative result.`,
};

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

const PROMPT_INPUT_FIELD_MATRIX = [
  ["category", "market_context", "target_customer", "verified_customer_needs"],
  [
    "category",
    "target_customer",
    "verified_customer_needs",
    "verified_decision_criteria",
  ],
  ["category", "market_context", "target_customer"],
  ["category", "market_context", "verified_offerings", "priority_offering"],
  ["category", "market_context", "verified_decision_criteria"],
  [
    "brand_name",
    "entity_scope",
    "category",
    "market_context",
    "verified_competitor",
    "verified_decision_criteria",
  ],
  [
    "brand_name",
    "entity_scope",
    "category",
    "verified_offerings",
    "priority_offering",
  ],
  [
    "brand_name",
    "entity_scope",
    "market_context",
    "official_sources",
    "known_accuracy_questions",
    "regulated_category_notes",
  ],
  ["brand_name", "conversion_action", "official_sources"],
  [
    "brand_name",
    "priority_offering",
    "verified_decision_criteria",
    "conversion_action",
  ],
] as const satisfies readonly (readonly (keyof BusinessBrief)[])[];

function hasPromptContextValue(value: BusinessBrief[keyof BusinessBrief]) {
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

export function promptQuestionSpecs(brief: BusinessBrief) {
  return PROMPT_MATRIX.map(([prompt_id, category, branded, role], index) => {
    const allowed_context = Object.fromEntries(
      PROMPT_INPUT_FIELD_MATRIX[index]
        .map((field) => [field, brief[field]] as const)
        .filter(([, value]) => hasPromptContextValue(value)),
    );
    return { prompt_id, category, branded, role, allowed_context };
  });
}

function briefFieldLabel(field: keyof BusinessBrief) {
  return field.replace(/^verified_/, "").replace(/_/g, " ");
}

export type PromptQuestionDraft = {
  question: string;
  inputs_used: (keyof BusinessBrief)[];
};

export function assemblePromptPack(
  drafts: PromptQuestionDraft[],
  brief: BusinessBrief,
): PromptPack {
  const specs = promptQuestionSpecs(brief);
  if (drafts.length !== specs.length) {
    throw new Error(
      `Question generation failed review: expected ${specs.length} questions and received ${drafts.length}.`,
    );
  }
  const prompts: AuditPrompt[] = specs.map((spec, index) => {
    const inputs_used = [...new Set(drafts[index].inputs_used)];
    const unexpected = inputs_used.filter(
      (field) => !Object.hasOwn(spec.allowed_context, field),
    );
    if (unexpected.length) {
      throw new Error(
        `Question generation failed review: ${spec.prompt_id} used unverified or out-of-scope input ${unexpected.join(", ")}.`,
      );
    }
    return {
      prompt_id: spec.prompt_id,
      category: spec.category,
      role: spec.role,
      branded: spec.branded,
      question: drafts[index].question,
      rationale: `${spec.role}. Built from verified ${inputs_used.map(briefFieldLabel).join(", ")}.`,
      inputs_used,
      review_status: "needs_human_review",
    };
  });
  const errors = validatePromptPack(prompts, brief);
  if (errors.length) {
    throw new Error(`Question generation failed review: ${errors.join(" ")}`);
  }

  return {
    status: "draft_for_review",
    prompt_pack_version: PROMPT_CONTRACT_VERSION,
    language: "en-US",
    target_product: "ChatGPT",
    brand: {
      brand_name: brief.brand_name,
      entity_scope: brief.entity_scope,
      brand_type: brief.brand_type,
      category: brief.category,
      market_context: brief.market_context,
      target_customer: brief.target_customer,
    },
    summary: {
      total_prompts: 10,
      unbranded_prompts: 5,
      branded_prompts: 5,
    },
    prompts,
    self_check: {
      ten_prompts: true,
      two_per_category: true,
      five_unbranded: true,
      five_branded: true,
      no_brand_leakage: true,
      verified_inputs_only: true,
      verified_competitor_only: true,
      single_entity_scope: true,
      category_safety_pass: true,
      independent_natural_questions: true,
    },
    warnings: [],
  };
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function visibleIdentityText(value: string) {
  return value
    .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/gi, " ");
}

function containsIdentity(value: string, identities: string[]) {
  const normalizedValue = ` ${normalize(visibleIdentityText(value))} `;
  return identities.some((identity) =>
    normalizedValue.includes(` ${normalize(identity)} `),
  );
}

function exactAnswerExcerpt(rawAnswer: string) {
  const answer = normalizeWhitespace(rawAnswer);
  if (!answer) return "";
  const firstSentence = answer.match(/^.*?[.!?](?:\s|$)/)?.[0].trim();
  if (firstSentence && firstSentence.length <= 320) return firstSentence;
  if (answer.length <= 320) return answer;
  const clipped = answer.slice(0, 320);
  const lastSpace = clipped.lastIndexOf(" ");
  return clipped.slice(0, lastSpace > 0 ? lastSpace : 320).trim();
}

function deterministicDetailCopy(input: {
  observation: AuditObservation;
  brief: BusinessBrief;
  assessment: ReportSynthesis["assessments"][number];
}) {
  if (input.observation.run_status === "failed") {
    return {
      finding: "This question could not be completed.",
      evidence_note: "No answer was available to assess.",
    };
  }
  const appeared = containsIdentity(input.observation.raw_answer, [
    input.brief.brand_name,
    ...input.brief.brand_name_variants,
  ]);
  if (!appeared) {
    return {
      finding: `${input.brief.brand_name} did not appear in this answer.`,
      evidence_note: "The retained answer does not name the business.",
    };
  }
  if (input.assessment.comparison === "competitor_preferred") {
    return {
      finding: "The answer preferred another option in this comparison.",
      evidence_note:
        "The retained answer names the business and states the preference.",
    };
  }
  if (input.assessment.comparison === "client_preferred") {
    return {
      finding: "The answer preferred the business in this comparison.",
      evidence_note:
        "The retained answer names the business and states the preference.",
    };
  }
  if (input.assessment.information === "conflicting") {
    return {
      finding: "The answer reported conflicting business information.",
      evidence_note:
        "The retained answer identifies the conflicting information.",
    };
  }
  if (input.assessment.information === "incomplete") {
    return {
      finding: "The answer found incomplete business information.",
      evidence_note: "The retained answer identifies the missing information.",
    };
  }
  if (input.assessment.recommendation === "recommended") {
    return {
      finding: "The answer named and recommended the business.",
      evidence_note: "The retained answer contains the recommendation.",
    };
  }
  return {
    finding: "The answer named the business without recommending it.",
    evidence_note: "The retained answer contains the business mention.",
  };
}

export function assembleReportContent(
  synthesis: ReportSynthesis,
  observations: AuditObservation[],
  brief: BusinessBrief,
): ReportContent {
  const promptIds = new Set(observations.map((item) => item.prompt_id));
  const assessmentIds = new Set(
    synthesis.assessments.map((item) => item.prompt_id),
  );
  if (
    assessmentIds.size !== observations.length ||
    synthesis.assessments.some((item) => !promptIds.has(item.prompt_id))
  ) {
    throw new Error(
      "Report synthesis must assess each retained question exactly once.",
    );
  }
  const assessmentByPrompt = new Map(
    synthesis.assessments.map((item) => [item.prompt_id, item]),
  );
  const details = observations.map((observation) => {
    const assessment = assessmentByPrompt.get(observation.prompt_id);
    if (!assessment) {
      throw new Error(`Report synthesis is missing ${observation.prompt_id}.`);
    }
    return {
      prompt_id: observation.prompt_id,
      run: observation.run_status,
      appearance: "not_assessed" as const,
      recommendation: assessment.recommendation,
      comparison: assessment.comparison,
      information: assessment.information,
      ...deterministicDetailCopy({ observation, brief, assessment }),
      answer_excerpt: exactAnswerExcerpt(observation.raw_answer),
      source_urls: observation.sources.map((source) => source.url),
    };
  });
  const competitorPromptIds = observations
    .filter((observation) =>
      containsIdentity(observation.raw_answer, [
        brief.verified_competitor.name,
      ]),
    )
    .map((observation) => observation.prompt_id);

  return normalizeReportEvidence(
    {
      conclusion: synthesis.conclusion,
      accuracy_status: synthesis.accuracy_status,
      key_findings: synthesis.key_findings,
      priorities: synthesis.priorities,
      observed_competitors: competitorPromptIds.length
        ? [
            {
              name: brief.verified_competitor.name,
              relationship: "mentioned",
              evidence_prompt_ids: competitorPromptIds,
            },
          ]
        : [],
      details,
    },
    observations,
    brief,
  );
}

export function normalizeReportEvidence(
  content: ReportContent,
  observations: AuditObservation[],
  brief: BusinessBrief,
): ReportContent {
  const observationByPrompt = new Map(
    observations.map((observation) => [observation.prompt_id, observation]),
  );
  const clientIdentities = [brief.brand_name, ...brief.brand_name_variants];
  const details = content.details.map((detail) => {
    const observation = observationByPrompt.get(detail.prompt_id);
    if (!observation) return detail;
    const run = observation.run_status;
    const appearance =
      run === "failed"
        ? "not_assessed"
        : containsIdentity(observation.raw_answer, clientIdentities)
          ? "mentioned"
          : "absent";
    const normalizedExcerpt = normalizeWhitespace(detail.answer_excerpt);
    const normalizedAnswer = normalizeWhitespace(observation.raw_answer);
    const answer_excerpt =
      normalizedExcerpt && normalizedAnswer.includes(normalizedExcerpt)
        ? detail.answer_excerpt
        : exactAnswerExcerpt(observation.raw_answer);
    const permittedSources = new Set(
      observation.sources.map((source) => source.url),
    );

    return {
      ...detail,
      run,
      appearance,
      recommendation:
        run === "failed"
          ? "not_assessed"
          : appearance === "absent"
            ? "not_recommended"
            : detail.recommendation,
      comparison:
        run === "failed"
          ? "not_assessed"
          : appearance === "absent"
            ? "not_observed"
            : detail.comparison,
      information:
        run === "failed" || appearance === "absent"
          ? "not_assessed"
          : detail.information,
      answer_excerpt,
      source_urls: detail.source_urls.filter((url) =>
        permittedSources.has(url),
      ),
    } as ReportContent["details"][number];
  });
  const detailByPrompt = new Map(
    details.map((detail) => [detail.prompt_id, detail]),
  );

  const observed_competitors = content.observed_competitors
    .filter(
      (competitor) => !containsIdentity(competitor.name, clientIdentities),
    )
    .map((competitor) => {
      const evidence_prompt_ids = [
        ...new Set(
          competitor.evidence_prompt_ids.filter((promptId) => {
            const observation = observationByPrompt.get(promptId);
            return Boolean(
              observation &&
              containsIdentity(observation.raw_answer, [competitor.name]),
            );
          }),
        ),
      ];
      const comparisonResults = evidence_prompt_ids.map(
        (promptId) => detailByPrompt.get(promptId)?.comparison,
      );
      const firstComparison = comparisonResults[0];
      const relationship =
        comparisonResults.length > 0 &&
        (firstComparison === "client_preferred" ||
          firstComparison === "competitor_preferred" ||
          firstComparison === "compared_no_preference") &&
        comparisonResults.every((comparison) => comparison === firstComparison)
          ? firstComparison
          : ("mentioned" as const);
      return { ...competitor, relationship, evidence_prompt_ids };
    })
    .filter((competitor) => competitor.evidence_prompt_ids.length > 0);

  return { ...content, observed_competitors, details };
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm;
}

function authoredReportFields(content: ReportContent) {
  return [
    ["Conclusion", content.conclusion],
    ...content.key_findings.flatMap((finding, index) => [
      [`Finding ${index + 1} title`, finding.title],
      [`Finding ${index + 1} explanation`, finding.explanation],
    ]),
    ...content.priorities.flatMap((priority, index) => [
      [`Priority ${index + 1} action`, priority.action],
      [`Priority ${index + 1} reason`, priority.why],
      [`Priority ${index + 1} basis`, priority.basis],
      [`Priority ${index + 1} completion check`, priority.done_when],
      [`Priority ${index + 1} caveat`, priority.caveat],
    ]),
    ...content.details.flatMap((detail, index) => [
      [`Detail ${index + 1} finding`, detail.finding],
      [`Detail ${index + 1} meaning`, detail.evidence_note],
    ]),
  ] as [string, string][];
}

function prohibitedClaimErrors(content: ReportContent) {
  const errors: string[] = [];
  authoredReportFields(content).forEach(([label, value]) => {
    const normalized = value.toLocaleLowerCase("en-US");
    const claims = [
      {
        name: "a permanent or number-one ranking",
        matches:
          /\b(?:number|no\.?)[ -]?1\b|\b(?:permanent(?:ly)?|always) rank|\btop-ranked\b/.test(
            normalized,
          ),
      },
      {
        name: "consumer ChatGPT equivalence",
        matches:
          /\b(?:same as|identical to|exactly reproduces?) (?:the )?(?:consumer )?chatgpt(?: app)?\b/.test(
            normalized,
          ),
      },
      {
        name: "a guaranteed outcome",
        matches:
          /\bguarantee(?:s|d)?\b/.test(normalized) &&
          !/\b(?:does not|do not|cannot|can't|no|without (?:a )?) guarantee\b/.test(
            normalized,
          ) &&
          !/\bnot guaranteed\b/.test(normalized),
      },
      {
        name: "lost revenue without evidence",
        matches:
          /\b(?:lost|losing|cost(?:s|ing)?) (?:revenue|sales|money|customers?)\b/.test(
            normalized,
          ),
      },
      {
        name: "unsupported causation",
        matches:
          /\bcaused by\b|\bwill (?:cause|increase|improve|boost|drive)\b/.test(
            normalized,
          ),
      },
    ];
    claims.forEach((claim) => {
      if (claim.matches) {
        errors.push(`${label} claims ${claim.name}.`);
      }
    });
  });
  return errors;
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

  const competitorSignal = normalize(brief.verified_competitor.name);
  prompts
    .filter((prompt) => prompt.prompt_id !== "NUAVE-BRAND-COMPARISON-02")
    .forEach((prompt) => {
      if (
        competitorSignal.length >= 3 &&
        normalize(prompt.question).includes(competitorSignal)
      ) {
        errors.push(
          `${prompt.prompt_id} reveals the competitor outside the designated comparison question.`,
        );
      }
    });

  const normalizedQuestions = prompts.map((prompt) =>
    normalize(prompt.question),
  );
  if (new Set(normalizedQuestions).size !== normalizedQuestions.length) {
    errors.push("The audit questions must be distinct.");
  }
  prompts.forEach((prompt) => {
    if (!prompt.question.trim().endsWith("?")) {
      errors.push(`${prompt.prompt_id} must be written as a question.`);
    }
    if ((prompt.question.match(/\?/g) ?? []).length !== 1) {
      errors.push(`${prompt.prompt_id} must contain one main request.`);
    }
    if (
      /\b(?:best|safest|most trusted|top[- ]rated|number one)\b/i.test(
        prompt.question,
      )
    ) {
      errors.push(`${prompt.prompt_id} contains an unsupported premise.`);
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
  errors.push(...prohibitedClaimErrors(content));
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
  content.observed_competitors.forEach((competitor) =>
    validateIds(competitor.evidence_prompt_ids, "Observed competitor"),
  );
  if (
    new Set(content.details.map((detail) => detail.prompt_id)).size !==
    observations.length
  ) {
    errors.push("Each question must have exactly one detailed finding.");
  }
  const brandSignals = [brief.brand_name, ...brief.brand_name_variants].filter(
    Boolean,
  );
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
    if (detail.run !== observation.run_status) {
      errors.push(
        `${detail.prompt_id} report run status does not match the retained observation.`,
      );
    }
    // Recommendation is a judgment dimension: need_discovery, solution_discovery,
    // and comparison questions ask the model to recommend or prefer something,
    // so a completed, mentioned answer there must carry a real judgment (the
    // Sozo live-run defect: the model returned not_assessed instead of an
    // actual recommendation). validation and action questions ask for a fact
    // or a next step, not a recommendation, so not_assessed is their honest
    // completed value.
    const recommendationOptional = ["validation", "action"].includes(
      observation.category,
    );
    if (
      observation.run_status === "completed" &&
      (detail.appearance === "not_assessed" ||
        (detail.recommendation === "not_assessed" && !recommendationOptional))
    ) {
      errors.push(
        `${detail.prompt_id} completed, so appearance and recommendation must be assessed.`,
      );
    }
    const visibleBrandAppeared = containsIdentity(
      observation.raw_answer,
      brandSignals,
    );
    if (detail.appearance === "mentioned" && !visibleBrandAppeared) {
      errors.push(
        `${detail.prompt_id} claims the brand appeared, but the raw response does not name it.`,
      );
    }
    if (
      observation.run_status === "completed" &&
      detail.appearance === "absent" &&
      visibleBrandAppeared
    ) {
      errors.push(
        `${detail.prompt_id} marks the brand absent, but the visible raw response names it.`,
      );
    }
    if (detail.recommendation === "recommended" && !visibleBrandAppeared) {
      errors.push(
        `${detail.prompt_id} claims a recommendation, but the visible raw response does not name the brand.`,
      );
    }
    if (
      detail.recommendation === "recommended" &&
      detail.appearance !== "mentioned"
    ) {
      errors.push(
        `${detail.prompt_id} claims a recommendation without a brand appearance.`,
      );
    }
    if (
      [
        "client_preferred",
        "competitor_preferred",
        "compared_no_preference",
      ].includes(detail.comparison) &&
      detail.appearance !== "mentioned"
    ) {
      errors.push(
        `${detail.prompt_id} claims a comparison without a brand appearance.`,
      );
    }
    if (
      ["confirmed", "incomplete", "conflicting"].includes(detail.information) &&
      detail.appearance !== "mentioned"
    ) {
      errors.push(
        `${detail.prompt_id} assesses brand information without a brand appearance.`,
      );
    }
    if (
      observation.run_status === "failed" &&
      (detail.appearance !== "not_assessed" ||
        detail.recommendation !== "not_assessed" ||
        detail.comparison !== "not_assessed" ||
        detail.information !== "not_assessed")
    ) {
      errors.push(
        `${detail.prompt_id} failed, so its result dimensions must be not_assessed.`,
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

  content.priorities.forEach((priority) => {
    const hasObservedGap = priority.evidence_prompt_ids.some((promptId) => {
      const detail = content.details.find(
        (item) => item.prompt_id === promptId,
      );
      const observation = observations.find(
        (item) => item.prompt_id === promptId,
      );
      if (!detail || !observation) return false;
      return (
        detail.run === "failed" ||
        detail.appearance === "absent" ||
        detail.information === "incomplete" ||
        detail.information === "conflicting" ||
        detail.comparison === "competitor_preferred" ||
        (!observation.branded && detail.recommendation === "not_recommended")
      );
    });
    if (!hasObservedGap) {
      errors.push(`Priority ${priority.order} is not tied to an observed gap.`);
    }
  });

  const clientIdentities = [brief.brand_name, ...brief.brand_name_variants];
  content.observed_competitors.forEach((competitor) => {
    if (containsIdentity(competitor.name, clientIdentities)) {
      errors.push(
        `Observed competitor ${competitor.name} duplicates the audited brand.`,
      );
    }
    competitor.evidence_prompt_ids.forEach((promptId) => {
      const observation = observations.find(
        (item) => item.prompt_id === promptId,
      );
      if (!observation) return;
      if (!containsIdentity(observation.raw_answer, [competitor.name])) {
        errors.push(
          `Observed competitor ${competitor.name} is not named in ${promptId}.`,
        );
      }
      const detail = content.details.find(
        (item) => item.prompt_id === promptId,
      );
      const expectedComparison =
        competitor.relationship === "mentioned"
          ? undefined
          : competitor.relationship;
      if (expectedComparison && detail?.comparison !== expectedComparison) {
        errors.push(
          `Observed competitor ${competitor.name} has a relationship that conflicts with ${promptId}.`,
        );
      }
    });
  });
  const informationResults = content.details.map(
    (detail) => detail.information,
  );
  if (
    content.accuracy_status === "no_clear_issues" &&
    informationResults.some((status) =>
      ["incomplete", "conflicting"].includes(status),
    )
  ) {
    errors.push(
      "Accuracy status says no clear issues despite an incomplete or conflicting information result.",
    );
  }
  if (
    content.accuracy_status === "needs_correction" &&
    !informationResults.includes("conflicting")
  ) {
    errors.push(
      "Accuracy status says needs correction without a conflicting information result.",
    );
  }
  return errors;
}

// Derive the human-readable name of an audit system from the value the provider
// actually recorded on each observation. This avoids hardcoding a system that
// contradicts the observations (e.g. reporting "OpenAI" when the data came from
// Groq + Tavily). The `system` enum in types.ts lists the only valid values.
function describeAuditSystem(system: string): string {
  switch (system) {
    case "OpenAI Responses API":
      return "OpenAI Responses API";
    case "Google Gemini API":
      return "Google Gemini API";
    case "Groq + Tavily":
      return "Groq + Tavily web search";
    default:
      return system || "unknown system";
  }
}

// Derive the system/model parts from the distinct systems present in the
// completed observations, in stable order. A run selects one provider per
// process, so this is normally a single value; if observations ever mix
// systems we list each rather than silently collapsing the distinction.
// Returned unjoined (not a final "with web search" sentence) so a label pack
// can compose its own localized phrasing around them (adversarial review
// Finding 2 / AC-21: the joined English suffix must not leak into a
// non-English method summary).
function deriveSystemParts(observations: AuditObservation[]): {
  systemPart: string;
  modelPart: string;
} {
  const completed = observations.filter(
    (item) => item.run_status === "completed",
  );
  const systems = [
    ...new Set(
      completed.map((item) => describeAuditSystem(item.system)).filter(Boolean),
    ),
  ];
  const models = [
    ...new Set(completed.map((item) => item.returned_model).filter(Boolean)),
  ];
  return {
    systemPart: systems.length ? systems.join(" and ") : "model unavailable",
    modelPart: models.length ? ` - ${models.join(", ")}` : "",
  };
}

function deriveSystemLabel(observations: AuditObservation[]): string {
  const { systemPart, modelPart } = deriveSystemParts(observations);
  return `${systemPart}${modelPart} with web search`;
}

export function buildAuditReport(
  content: ReportContent,
  observations: AuditObservation[],
  reportCall: ReportCallProvenance = {
    requested_model: "not recorded",
    returned_model: "not recorded",
    response_id: "not recorded",
  },
  labels: AuditReportLabelPack = ENGLISH_AUDIT_REPORT_LABELS,
): AuditReport {
  const details = new Map(
    content.details.map((detail) => [detail.prompt_id, detail]),
  );
  const completed = observations.filter(
    (item) => item.run_status === "completed",
  );
  const unbranded = observations.filter((item) => !item.branded);
  const branded = observations.filter((item) => item.branded);
  const completedUnbranded = unbranded.filter(
    (item) => item.run_status === "completed",
  );
  const completedBranded = branded.filter(
    (item) => item.run_status === "completed",
  );
  const detailFor = (id: string) => details.get(id);

  const failed = observations.length - completed.length;
  const unbrandedFailed = unbranded.length - completedUnbranded.length;
  const brandedFailed = branded.length - completedBranded.length;
  const unbrandedRecommended = completedUnbranded.filter(
    (item) => detailFor(item.prompt_id)?.recommendation === "recommended",
  ).length;
  const unbrandedMentioned = completedUnbranded.filter(
    (item) =>
      detailFor(item.prompt_id)?.appearance === "mentioned" &&
      detailFor(item.prompt_id)?.recommendation !== "recommended",
  ).length;
  const unbrandedAbsent = completedUnbranded.filter(
    (item) => detailFor(item.prompt_id)?.appearance === "absent",
  ).length;
  const brandedRecognized = completedBranded.filter(
    (item) => detailFor(item.prompt_id)?.appearance === "mentioned",
  ).length;
  const detailValues = [...details.values()];
  const countComparison = (
    value: ReportContent["details"][number]["comparison"],
  ) => detailValues.filter((detail) => detail.comparison === value).length;
  const countInformation = (
    value: ReportContent["details"][number]["information"],
  ) => detailValues.filter((detail) => detail.information === value).length;
  const { systemPart, modelPart } = deriveSystemParts(observations);
  const systemLabel = deriveSystemLabel(observations);
  const facts: AuditReport["facts"] = {
    discovery: {
      recommended: unbrandedRecommended,
      mentioned_not_recommended: unbrandedMentioned,
      absent: unbrandedAbsent,
      completed: completedUnbranded.length,
      total: unbranded.length,
      failed: unbrandedFailed,
      recommendation_label: labels.discoveryRecommendedLabel(
        unbrandedRecommended,
        unbranded.length,
        unbrandedFailed,
      ),
      mention_label: labels.discoveryMentionLabel(
        unbrandedMentioned,
        unbranded.length,
        unbrandedFailed,
      ),
    },
    recognition: {
      recognized: brandedRecognized,
      completed: completedBranded.length,
      total: branded.length,
      failed: brandedFailed,
      label: labels.recognitionLabel(
        brandedRecognized,
        branded.length,
        brandedFailed,
      ),
    },
    comparison: {
      client_preferred: countComparison("client_preferred"),
      competitor_preferred: countComparison("competitor_preferred"),
      compared_no_preference: countComparison("compared_no_preference"),
      label: labels.comparisonLabel(
        countComparison("client_preferred"),
        observations.length,
        countComparison("competitor_preferred"),
      ),
    },
    information: {
      confirmed: countInformation("confirmed"),
      incomplete: countInformation("incomplete"),
      conflicting: countInformation("conflicting"),
      label: labels.informationLabel(
        countInformation("confirmed"),
        countInformation("incomplete"),
        countInformation("conflicting"),
      ),
    },
    coverage: {
      completed: completed.length,
      total: observations.length,
      failed,
      label: labels.coverageLabel(completed.length, observations.length, failed),
    },
  };
  const methodSummary = labels.methodSummary({
    totalQuestions: observations.length,
    systemPart,
    modelPart,
    unbrandedTotal: unbranded.length,
    brandedTotal: branded.length,
    coverageLabel: facts.coverage.label,
  });

  return {
    ...content,
    report_version: "nuave-report-v3",
    writing_standard_version: REPORT_WRITING_STANDARD_VERSION,
    generated_at: new Date().toISOString(),
    system_label: systemLabel,
    provenance: {
      report_prompt_version: REPORT_SYNTHESIS_PROMPT_VERSION,
      prompt_contract_version:
        reportCall.prompt_contract_version ?? PROMPT_CONTRACT_VERSION,
      requested_report_model: reportCall.requested_model,
      returned_report_model: reportCall.returned_model,
      report_response_id: reportCall.response_id,
      initial_report_response_id:
        reportCall.initial_response_id ?? reportCall.response_id,
      report_call_count: reportCall.call_count ?? 1,
      language_retry_performed: reportCall.language_retry_performed ?? false,
      language_retry_violations: reportCall.language_retry_violations ?? [],
    },
    method_summary: methodSummary,
    facts,
    counts: {
      unbranded_recommended: unbrandedRecommended,
      unbranded_mentioned: unbrandedMentioned,
      unbranded_total: unbranded.length,
      branded_recognized: brandedRecognized,
      branded_total: branded.length,
      failed,
    },
    operational_telemetry:
      reportCall.operational_telemetry ?? summarizeAuditTelemetry([]),
  };
}

export function makeEvidenceExport(
  brief: BusinessBrief,
  prompts: AuditPrompt[],
  observations: AuditObservation[],
  report: AuditReport,
) {
  const systemName =
    observations.length === 0
      ? "the audit system"
      : describeAuditSystem(
          observations.find((item) => item.run_status === "completed")
            ?.system ?? observations[0].system,
        );
  return {
    export_version: "nuave-evidence-v4",
    exported_at: new Date().toISOString(),
    disclosure: `Observations come from ${systemName} and do not exactly reproduce the consumer ChatGPT interface.`,
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
