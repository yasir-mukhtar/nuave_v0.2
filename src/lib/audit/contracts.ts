import type {
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
  PromptPack,
  ReportContent,
  ReportSynthesis,
} from "./types";
import {
  isDirectTenAuditContext,
  subjectAliases,
  subjectBrandName,
  subjectNamedComparators,
  type AuditSubject,
} from "./direct-ten-context-v2";
import { REPORT_WRITING_STANDARD_VERSION } from "./report-language";
import { summarizeAuditTelemetry } from "./telemetry";
import {
  hasIndonesianComparisonRelation,
  isCategoryComparisonFallback,
  minimizeIndonesianBrief,
} from "./questions-id";
import {
  AUDIT_MEASUREMENT_MATRIX,
  CANONICAL_COMPOSITION_COUNTS,
  measurementSlotForPromptId,
  reportMeasurementSemantics,
  type HistoricalPromptPackId,
  type ReportAssessmentClass,
} from "./measurement-matrix";
import type { AuditQuestionMethod } from "./locked-question-pack";

/**
 * Every report-assessment path a prompt is eligible for under its method.
 * Canonical prompts resolve to exactly their matrix slot's class; direct-ten
 * prompts have no slots — every dimension is judged from the actual answer
 * (still appearance-gated downstream). An unknown or missing prompt resolves
 * to no classes at all, which fails closed rather than inventing a path.
 */
export function reportAssessmentClassesFor(input: {
  promptId: string;
  observation?: AuditObservation;
  historicalFixtureId?: HistoricalPromptPackId;
  questionMethod?: AuditQuestionMethod;
}): ReportAssessmentClass[] {
  if (input.questionMethod === "direct-ten") {
    return ["recommendation", "comparison", "information"];
  }
  const slot = measurementSlotForPromptId(input.promptId);
  if (!slot || !input.observation) return [];
  return [
    reportMeasurementSemantics(
      slot,
      input.observation.category,
      input.observation.branded,
      input.historicalFixtureId,
    ).reportAssessmentClass,
  ];
}

export {
  AUDIT_MEASUREMENT_MATRIX,
  CANONICAL_COMPOSITION_COUNTS,
  COMPARISON_RELATION_MARKERS,
  IDENTITY_POLICIES,
  PROMPT_MATRIX,
  REPORT_ASSESSMENT_CLASSES,
  measurementSlotForId,
  measurementSlotForOrder,
  measurementSlotForPromptId,
  measurementSlotsForAssessmentClass,
} from "./measurement-matrix";

export const PROMPT_CONTRACT_VERSION = "deterministic-v4-en";
export const REPORT_SYNTHESIS_PROMPT_VERSION = "report-synthesis-v4";
export const REPORT_SYNTHESIS_PROMPT_VERSION_V2 = "report-synthesis-v5-context";

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
  report_prompt_version?: string;
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
  /** Stamped onto `AuditReport.writing_standard_version`. Each pack owns its
   * own version so the stamp always matches the language it actually wrote
   * (adversarial review Finding O-2: the live route stamped `plain-en-v1` on
   * Indonesian reports because this used to be a single module-level
   * constant instead of a per-pack value). */
  writingStandardVersion: AuditReport["writing_standard_version"];
  /** Default for `AuditReport.provenance.prompt_contract_version`, unless a
   * caller overrides it via `ReportCallProvenance.prompt_contract_version`. */
  promptContractVersion: string;
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
  recognitionLabel: (
    recognized: number,
    total: number,
    failed: number,
  ) => string;
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
    /** Whether the retained evidence actually executed web search. A labeled
     * synthetic run did not, and the summary must not claim it did. */
    webSearchExecuted: boolean;
  }) => string;
};

function englishFailedContext(failed: number) {
  return failed
    ? `; ${failed} ${plural(failed, "question")} could not be tested.`
    : ".";
}

export const ENGLISH_AUDIT_REPORT_LABELS: AuditReportLabelPack = {
  writingStandardVersion: REPORT_WRITING_STANDARD_VERSION,
  promptContractVersion: PROMPT_CONTRACT_VERSION,
  discoveryRecommendedLabel: (recommended, total, failed) =>
    `Recommended in ${recommended} of ${total} questions without the business name${englishFailedContext(failed)}`,
  discoveryMentionLabel: (mentioned, total, failed) =>
    `Named without recommendation in ${mentioned} of ${total} questions without the business name${englishFailedContext(failed)}`,
  recognitionLabel: (recognized, total, failed) =>
    `Recognized in ${recognized} of ${total} questions that named the business${englishFailedContext(failed)}`,
  comparisonLabel: (clientPreferred, total, competitorPreferred) =>
    `Client preferred in ${clientPreferred} of ${total} assessed comparison questions; competitor preferred in ${competitorPreferred}.`,
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
    webSearchExecuted,
  }) =>
    `We tested ${totalQuestions} questions one at a time through ${systemPart}${modelPart}${webSearchExecuted ? " with web search" : " without web search"}. ${unbrandedTotal} questions did not name the business in the question. ${brandedTotal} questions named the business. ${coverageLabel} A mention is not a recommendation, and a failed test is not a negative result.`,
};

function hasPromptContextValue(value: BusinessBrief[keyof BusinessBrief]) {
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

export function promptQuestionSpecs(brief: BusinessBrief) {
  return AUDIT_MEASUREMENT_MATRIX.map((slot) => {
    const allowed_context = Object.fromEntries(
      slot.allowedContextFields
        .map((field) => [field, brief[field]] as const)
        .filter(([, value]) => hasPromptContextValue(value)),
    );
    return {
      prompt_id: slot.id,
      category: slot.category,
      branded: slot.auditedBrandIdentity === "required",
      role: slot.generatorSlotDescription,
      allowed_context,
      audited_brand_identity: slot.auditedBrandIdentity,
      comparison_target_identity: slot.comparisonTargetIdentity,
      measurement_purpose: slot.measurementPurpose,
      customer_facing_label: slot.customerFacingLabel,
      report_assessment_class: slot.reportAssessmentClass,
      generator_slot_description: slot.generatorSlotDescription,
    };
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

  const slotMetadataMatch = prompts.every(
    (prompt, index) =>
      prompt.category === AUDIT_MEASUREMENT_MATRIX[index]?.category,
  );

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
      unbranded_prompts: CANONICAL_COMPOSITION_COUNTS.unbranded,
      branded_prompts: CANONICAL_COMPOSITION_COUNTS.branded,
    },
    prompts,
    self_check: {
      ten_prompts: true,
      one_prompt_per_slot: slotMetadataMatch,
      canonical_composition:
        prompts.filter((prompt) => !prompt.branded).length ===
          CANONICAL_COMPOSITION_COUNTS.unbranded &&
        prompts.filter((prompt) => prompt.branded).length ===
          CANONICAL_COMPOSITION_COUNTS.branded,
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

const DETAIL_COPY = {
  en: {
    failed: {
      finding: "This question could not be completed.",
      evidence_note: "No answer was available to assess.",
    },
    absent: {
      finding: (brand: string) => `${brand} did not appear in this answer.`,
      evidence_note: "The retained answer does not name the business.",
    },
    competitor_preferred: {
      finding: "The answer preferred another option in this comparison.",
      evidence_note:
        "The retained answer names the business and states the preference.",
    },
    client_preferred: {
      finding: "The answer preferred the business in this comparison.",
      evidence_note:
        "The retained answer names the business and states the preference.",
    },
    conflicting: {
      finding: "The answer reported conflicting business information.",
      evidence_note:
        "The retained answer identifies the conflicting information.",
    },
    incomplete: {
      finding: "The answer found incomplete business information.",
      evidence_note: "The retained answer identifies the missing information.",
    },
    recommended: {
      finding: "The answer named and recommended the business.",
      evidence_note: "The retained answer contains the recommendation.",
    },
    mentioned_not_recommended: {
      finding: "The answer named the business without recommending it.",
      evidence_note: "The retained answer contains the business mention.",
    },
  },
  // plain-id-v1 house style, matching the founder-approved fixture copy
  // (fixture-journey/adapter.ts detailCopyFor).
  id: {
    failed: {
      finding: "Pertanyaan ini tidak dapat diuji.",
      evidence_note: "Tidak ada jawaban yang bisa dinilai.",
    },
    absent: {
      finding: (brand: string) => `${brand} tidak muncul dalam jawaban ini.`,
      evidence_note: "Jawaban yang disimpan tidak menyebut bisnis.",
    },
    competitor_preferred: {
      finding: "Jawaban mengunggulkan pilihan lain dalam perbandingan ini.",
      evidence_note:
        "Jawaban yang disimpan menyebut bisnis dan menyatakan pilihan itu.",
    },
    client_preferred: {
      finding: "Jawaban mengunggulkan bisnis dalam perbandingan ini.",
      evidence_note:
        "Jawaban yang disimpan menyebut bisnis dan menyatakan pilihan itu.",
    },
    conflicting: {
      finding: "Jawaban melaporkan informasi bisnis yang bertentangan.",
      evidence_note:
        "Jawaban yang disimpan memuat informasi yang saling bertentangan.",
    },
    incomplete: {
      finding: "Jawaban menemukan informasi bisnis yang belum lengkap.",
      evidence_note:
        "Jawaban yang disimpan memuat informasi yang belum lengkap.",
    },
    recommended: {
      finding: "Jawaban menyebut dan merekomendasikan bisnis.",
      evidence_note: "Jawaban yang disimpan memuat rekomendasi untuk bisnis.",
    },
    mentioned_not_recommended: {
      finding: "Jawaban menyebut bisnis tanpa merekomendasikannya.",
      evidence_note: "Jawaban yang disimpan memuat penyebutan bisnis.",
    },
  },
} as const;

function deterministicDetailCopy(input: {
  observation: AuditObservation;
  brief: AuditSubject;
  assessment: ReportSynthesis["assessments"][number];
  language?: "en" | "id";
}) {
  const copy = input.language === "id" ? DETAIL_COPY.id : DETAIL_COPY.en;
  if (input.observation.run_status === "failed") {
    return { ...copy.failed };
  }
  const appeared = containsIdentity(input.observation.raw_answer, [
    subjectBrandName(input.brief),
    ...subjectAliases(input.brief),
  ]);
  if (!appeared) {
    return {
      finding: copy.absent.finding(subjectBrandName(input.brief)),
      evidence_note: copy.absent.evidence_note,
    };
  }
  if (input.assessment.comparison === "competitor_preferred") {
    return { ...copy.competitor_preferred };
  }
  if (input.assessment.comparison === "client_preferred") {
    return { ...copy.client_preferred };
  }
  if (input.assessment.information === "conflicting") {
    return { ...copy.conflicting };
  }
  if (input.assessment.information === "incomplete") {
    return { ...copy.incomplete };
  }
  if (input.assessment.recommendation === "recommended") {
    return { ...copy.recommended };
  }
  return { ...copy.mentioned_not_recommended };
}

export function assembleReportContent(
  synthesis: ReportSynthesis,
  observations: AuditObservation[],
  brief: AuditSubject,
  historicalFixtureId?: HistoricalPromptPackId,
  questionMethod?: AuditQuestionMethod,
  language?: "en" | "id",
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
      ...deterministicDetailCopy({ observation, brief, assessment, language }),
      answer_excerpt: exactAnswerExcerpt(observation.raw_answer),
      source_urls: observation.sources.map((source) => source.url),
    };
  });
  const observedCompetitors = subjectNamedComparators(brief).flatMap((name) => {
    const evidence_prompt_ids = observations
      .filter((observation) => containsIdentity(observation.raw_answer, [name]))
      .map((observation) => observation.prompt_id);
    return evidence_prompt_ids.length
      ? [{ name, relationship: "mentioned" as const, evidence_prompt_ids }]
      : [];
  });

  return normalizeReportEvidence(
    {
      conclusion: synthesis.conclusion,
      accuracy_status: synthesis.accuracy_status,
      key_findings: synthesis.key_findings,
      priorities: synthesis.priorities,
      observed_competitors: observedCompetitors,
      details,
    },
    observations,
    brief,
    historicalFixtureId,
    questionMethod,
  );
}

export function normalizeReportEvidence(
  content: ReportContent,
  observations: AuditObservation[],
  brief: AuditSubject,
  historicalFixtureId?: HistoricalPromptPackId,
  questionMethod?: AuditQuestionMethod,
): ReportContent {
  const observationByPrompt = new Map(
    observations.map((observation) => [observation.prompt_id, observation]),
  );
  const clientIdentities = [subjectBrandName(brief), ...subjectAliases(brief)];
  const details = content.details.map((detail) => {
    const observation = observationByPrompt.get(detail.prompt_id);
    if (!observation) return detail;
    const assessmentClasses = reportAssessmentClassesFor({
      promptId: detail.prompt_id,
      observation,
      historicalFixtureId,
      questionMethod,
    });
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
        run === "failed" ||
        !assessmentClasses.includes("recommendation") ||
        // Canonical semantics gate every dimension on a visible appearance.
        // Direct-ten (R-07) reports appearance and explicit recommendation
        // separately across evaluable answers: an absent answer can still be
        // judged not_recommended, while a "recommended" claim without the
        // brand visible stays impossible and is withheld as not_assessed.
        (appearance !== "mentioned" &&
          (questionMethod !== "direct-ten" ||
            detail.recommendation === "recommended"))
          ? "not_assessed"
          : detail.recommendation,
      comparison:
        run === "failed"
          ? "not_assessed"
          : !assessmentClasses.includes("comparison") ||
              appearance !== "mentioned"
            ? "not_observed"
            : detail.comparison,
      information:
        run === "failed" ||
        !assessmentClasses.includes("information") ||
        appearance !== "mentioned"
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
      (competitor) =>
        !containsIdentity(competitor.name, clientIdentities) &&
        (!isDirectTenAuditContext(brief) ||
          subjectNamedComparators(brief).some(
            (name) => normalize(name) === normalize(competitor.name),
          )),
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

  AUDIT_MEASUREMENT_MATRIX.forEach((slot) => {
    const prompt = prompts[slot.order - 1];
    if (!prompt) return;
    if (prompt.prompt_id !== slot.id)
      errors.push(`Question ${slot.order} has the wrong ID.`);
    if (prompt.category !== slot.category)
      errors.push(`${slot.id} has the wrong category.`);
    if (prompt.branded !== (slot.auditedBrandIdentity === "required"))
      errors.push(`${slot.id} has the wrong branded status.`);
    if (prompt.role !== slot.generatorSlotDescription)
      errors.push(`${slot.id} has the wrong role.`);
    if (!prompt.question.trim())
      errors.push(`${slot.id} has an empty question.`);
  });

  const brandSignals = [brief.brand_name, ...brief.brand_name_variants]
    .map(normalize)
    .filter((value) => value.length >= 3);
  const minimizedBrief = minimizeIndonesianBrief(brief);
  prompts.forEach((prompt, index) => {
    const slot = AUDIT_MEASUREMENT_MATRIX[index];
    if (!slot) return;
    const brandRequired = slot.auditedBrandIdentity === "required";
    const brandMentioned = containsIdentity(prompt.question, [
      brief.brand_name,
      ...brief.brand_name_variants,
    ]);
    if (!brandRequired) {
      const question = normalize(prompt.question);
      if (brandSignals.some((signal) => question.includes(signal))) {
        errors.push(
          `${prompt.prompt_id} reveals the brand name or one of its variants.`,
        );
      }
    }
    if (brandRequired && !brandMentioned) {
      errors.push(`${prompt.prompt_id} must mention the audited business.`);
    }
  });

  const competitorSignal = normalize(brief.verified_competitor.name);
  const comparisonFallback =
    isCategoryComparisonFallback(minimizedBrief) ||
    !minimizedBrief.comparison_business?.name.trim();
  prompts.forEach((prompt, index) => {
    const slot = AUDIT_MEASUREMENT_MATRIX[index];
    if (!slot) return;
    if (slot.comparisonTargetIdentity === "forbidden") {
      if (
        !comparisonFallback &&
        competitorSignal.length >= 3 &&
        normalize(prompt.question).includes(competitorSignal)
      ) {
        errors.push(
          `${prompt.prompt_id} reveals the competitor outside the designated comparison question.`,
        );
      }
    } else if (
      competitorSignal.length >= 3 &&
      !normalize(prompt.question).includes(competitorSignal)
    ) {
      errors.push(`${prompt.prompt_id} must mention the comparison target.`);
    }
    if (
      slot.category === "direct_comparison" &&
      !hasIndonesianComparisonRelation(prompt.question, minimizedBrief)
    ) {
      errors.push(
        `${prompt.prompt_id} must contain a valid comparison relation.`,
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

  if (
    prompts.filter((prompt) => !prompt.branded).length !==
      CANONICAL_COMPOSITION_COUNTS.unbranded ||
    prompts.filter((prompt) => prompt.branded).length !==
      CANONICAL_COMPOSITION_COUNTS.branded
  ) {
    errors.push(
      `The audit must contain ${CANONICAL_COMPOSITION_COUNTS.branded} branded and ${CANONICAL_COMPOSITION_COUNTS.unbranded} unbranded questions.`,
    );
  }
  return errors;
}

export function validateReportContent(
  content: ReportContent,
  observations: AuditObservation[],
  brief: AuditSubject,
  historicalFixtureId?: HistoricalPromptPackId,
  questionMethod?: AuditQuestionMethod,
): string[] {
  const errors: string[] = [];
  errors.push(...prohibitedClaimErrors(content));
  const promptIds = new Set(observations.map((item) => item.prompt_id));
  const assessmentClassesByPrompt = new Map(
    observations.map((observation) => {
      const classes = reportAssessmentClassesFor({
        promptId: observation.prompt_id,
        observation,
        historicalFixtureId,
        questionMethod,
      });
      if (questionMethod !== "direct-ten" && !classes.length) {
        errors.push(
          `Observation ${observation.prompt_id} does not map to a canonical measurement slot.`,
        );
      }
      return [observation.prompt_id, classes] as const;
    }),
  );
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
  const brandSignals = [
    subjectBrandName(brief),
    ...subjectAliases(brief),
  ].filter(Boolean);
  content.details.forEach((detail, index) => {
    if (!promptIds.has(detail.prompt_id))
      errors.push(`Unknown detailed finding: ${detail.prompt_id}.`);
    const observation = observations.find(
      (item) => item.prompt_id === detail.prompt_id,
    );
    if (!observation) return;
    const assessmentClasses =
      assessmentClassesByPrompt.get(detail.prompt_id) ?? [];
    if (detail.prompt_id !== observations[index]?.prompt_id) {
      errors.push(`Detailed findings are out of order at ${detail.prompt_id}.`);
    }
    if (detail.run !== observation.run_status) {
      errors.push(
        `${detail.prompt_id} report run status does not match the retained observation.`,
      );
    }
    // Each method owns the assessment paths a prompt is eligible for; the
    // appearance/answer integrity checks below apply to every method.
    if (observation.run_status === "completed") {
      if (
        !assessmentClasses.includes("recommendation") &&
        detail.recommendation !== "not_assessed"
      ) {
        errors.push(
          `${detail.prompt_id} carries recommendation semantics outside its report assessment path.`,
        );
      }
      if (
        !assessmentClasses.includes("comparison") &&
        detail.comparison !== "not_observed"
      ) {
        errors.push(
          `${detail.prompt_id} carries comparison semantics outside its report assessment path.`,
        );
      }
      if (
        !assessmentClasses.includes("information") &&
        detail.information !== "not_assessed"
      ) {
        errors.push(
          `${detail.prompt_id} carries information semantics outside its report assessment path.`,
        );
      }
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
      const classes = reportAssessmentClassesFor({
        promptId,
        observation,
        historicalFixtureId,
        questionMethod,
      });
      return (
        detail.run === "failed" ||
        detail.appearance === "absent" ||
        detail.information === "incomplete" ||
        detail.information === "conflicting" ||
        detail.comparison === "competitor_preferred" ||
        (!observation.branded &&
          classes.includes("recommendation") &&
          detail.recommendation === "not_recommended")
      );
    });
    if (!hasObservedGap) {
      errors.push(`Priority ${priority.order} is not tied to an observed gap.`);
    }
  });

  const clientIdentities = [subjectBrandName(brief), ...subjectAliases(brief)];
  content.observed_competitors.forEach((competitor) => {
    if (
      isDirectTenAuditContext(brief) &&
      !subjectNamedComparators(brief).some(
        (name) => normalize(name) === normalize(competitor.name),
      )
    ) {
      errors.push(`Observed competitor ${competitor.name} was not confirmed.`);
    }
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
  const informationResults = content.details
    .filter((detail) => {
      const observation = observations.find(
        (item) => item.prompt_id === detail.prompt_id,
      );
      return (
        observation !== undefined &&
        reportAssessmentClassesFor({
          promptId: detail.prompt_id,
          observation,
          historicalFixtureId,
          questionMethod,
        }).includes("information")
      );
    })
    .map((detail) => detail.information);
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
    ...new Set(
      completed
        .map((item) => item.returned_model)
        .filter((model) => model && !systems.includes(model)),
    ),
  ];
  return {
    systemPart: systems.length ? systems.join(" and ") : "model unavailable",
    modelPart: models.length ? ` - ${models.join(", ")}` : "",
  };
}

/** Whether the retained evidence actually executed a web search. */
function webSearchExecuted(observations: AuditObservation[]): boolean {
  return observations.some(
    (observation) =>
      observation.run_status === "completed" &&
      observation.telemetry.some((call) => call.web_search_calls > 0),
  );
}

function deriveSystemLabel(observations: AuditObservation[]): string {
  const { systemPart, modelPart } = deriveSystemParts(observations);
  return `${systemPart}${modelPart}${webSearchExecuted(observations) ? " with web search" : ""}`;
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
  historicalFixtureId?: HistoricalPromptPackId,
  questionMethod?: AuditQuestionMethod,
): AuditReport {
  const details = new Map(
    content.details.map((detail) => [detail.prompt_id, detail]),
  );
  const detailFor = (id: string) => details.get(id);
  const records = observations.map((observation) => {
    const assessmentClasses = reportAssessmentClassesFor({
      promptId: observation.prompt_id,
      observation,
      historicalFixtureId,
      questionMethod,
    });
    if (questionMethod !== "direct-ten" && !assessmentClasses.length) {
      throw new Error(
        `Observation ${observation.prompt_id} does not map to a canonical measurement slot.`,
      );
    }
    return {
      observation,
      assessmentClasses,
      detail: detailFor(observation.prompt_id),
    };
  });
  const completed = records.filter(
    ({ observation }) => observation.run_status === "completed",
  );
  const unbranded = records.filter(({ observation }) => !observation.branded);
  const branded = records.filter(({ observation }) => observation.branded);
  const completedUnbranded = unbranded.filter(
    ({ observation }) => observation.run_status === "completed",
  );
  const completedBranded = branded.filter(
    ({ observation }) => observation.run_status === "completed",
  );
  const discoveryRecords = unbranded.filter(({ assessmentClasses }) =>
    assessmentClasses.includes("recommendation"),
  );

  const failed = observations.length - completed.length;
  const brandedFailed = branded.length - completedBranded.length;
  const discoveryFailed = discoveryRecords.filter(
    ({ observation }) => observation.run_status === "failed",
  ).length;
  const unbrandedRecommended = discoveryRecords.filter(
    ({ observation, detail }) =>
      observation.run_status === "completed" &&
      detail?.appearance === "mentioned" &&
      detail.recommendation === "recommended",
  ).length;
  const unbrandedMentioned = discoveryRecords.filter(
    ({ observation, detail }) =>
      observation.run_status === "completed" &&
      detail?.appearance === "mentioned" &&
      detail.recommendation !== "recommended",
  ).length;
  const unbrandedAbsent = discoveryRecords.filter(
    ({ observation, detail }) =>
      observation.run_status === "completed" && detail?.appearance === "absent",
  ).length;
  const brandedRecognized = completedBranded.filter(
    ({ detail }) => detail?.appearance === "mentioned",
  ).length;
  // R3-7 (Phase 3 fix-round-3 adversarial review): "appeared" is
  // appearance === "mentioned", read directly, exactly as the fixture
  // reference does (`fixture-journey/adapter.ts`). Deriving it as
  // `unbrandedRecommended + unbrandedMentioned` only matched that definition
  // because `normalizeReportEvidence` forces absent → not_recommended two
  // files away; `buildAuditReport` is exported and is called with
  // un-normalized content by tests, where a detail carrying
  // { appearance: "absent", recommendation: "recommended" } would have
  // overstated the headline.
  const unbrandedAppeared = completedUnbranded.filter(
    ({ detail }) => detail?.appearance === "mentioned",
  ).length;
  // AC-17 eligibility (R3-3, Phase 3 fix-round-3 adversarial review): a
  // dimension is "assessed" only when the brand APPEARED and the dimension
  // was judged. The same rule applies to all three dimensions. Before this,
  // recommendation alone counted `not_recommended` as assessed, which swept
  // in every absent question (`normalizeReportEvidence` forces absent →
  // not_recommended / not_observed / not_assessed) and produced a report
  // that read "0 of 10 pertanyaan yang dinilai" on one line and "Tidak
  // diuji" on the next two for the same nine questions.
  const assessableRecords = records.filter(
    ({ detail }) => detail?.appearance === "mentioned",
  );
  // R-07: direct-ten reports explicit recommendations across all evaluable
  // answers — appearance is a separate observed fact, not a pre-filter that
  // hides "not recommended" outcomes. The denominator is every completed,
  // eligible answer: a not_assessed outcome is an honest assessment result
  // and must not silently shrink it. Canonical keeps the appearance-gated
  // denominator so historical numbers stay comparable.
  const recommendationRecords =
    questionMethod === "direct-ten"
      ? records.filter(
          ({ observation }) => observation.run_status === "completed",
        )
      : assessableRecords;
  const recommendationAssessed = recommendationRecords.filter(
    ({ detail, assessmentClasses }) =>
      assessmentClasses.includes("recommendation") &&
      (questionMethod === "direct-ten" ||
        (["recommended", "not_recommended"] as const).includes(
          detail?.recommendation as "recommended" | "not_recommended",
        )),
  );
  const comparisonAssessed = assessableRecords.filter(
    ({ detail, assessmentClasses }) =>
      assessmentClasses.includes("comparison") &&
      (
        [
          "client_preferred",
          "competitor_preferred",
          "compared_no_preference",
        ] as const
      ).includes(
        detail?.comparison as
          | "client_preferred"
          | "competitor_preferred"
          | "compared_no_preference",
      ),
  );
  const informationAssessed = assessableRecords.filter(
    ({ detail, assessmentClasses }) =>
      assessmentClasses.includes("information") &&
      (["confirmed", "incomplete", "conflicting"] as const).includes(
        detail?.information as "confirmed" | "incomplete" | "conflicting",
      ),
  );
  const countComparison = (
    value: ReportContent["details"][number]["comparison"],
  ) =>
    comparisonAssessed.filter((record) => record.detail?.comparison === value)
      .length;
  const countInformation = (
    value: ReportContent["details"][number]["information"],
  ) =>
    informationAssessed.filter((record) => record.detail?.information === value)
      .length;
  const measures: AuditReport["measures"] = {
    overall: {
      appeared: unbrandedAppeared + brandedRecognized,
      total: observations.length,
    },
    unbranded: {
      appeared: unbrandedAppeared,
      total: unbranded.length,
    },
    branded: {
      appeared: brandedRecognized,
      total: branded.length,
    },
    recommendation: {
      recommended: recommendationAssessed.filter(
        (record) => record.detail?.recommendation === "recommended",
      ).length,
      assessed: recommendationAssessed.length,
    },
    comparison: {
      client_preferred: comparisonAssessed.filter(
        (record) => record.detail?.comparison === "client_preferred",
      ).length,
      assessed: comparisonAssessed.length,
    },
    information: {
      // Numerators read from the same eligible set as the denominator, as
      // recommendation and comparison above already do (R3-3).
      confirmed: informationAssessed.filter(
        (record) => record.detail?.information === "confirmed",
      ).length,
      incomplete: informationAssessed.filter(
        (record) => record.detail?.information === "incomplete",
      ).length,
      conflicting: informationAssessed.filter(
        (record) => record.detail?.information === "conflicting",
      ).length,
      assessed: informationAssessed.length,
    },
  };
  const { systemPart, modelPart } = deriveSystemParts(observations);
  const systemLabel = deriveSystemLabel(observations);
  const facts: AuditReport["facts"] = {
    discovery: {
      recommended: unbrandedRecommended,
      mentioned_not_recommended: unbrandedMentioned,
      absent: unbrandedAbsent,
      completed: discoveryRecords.filter(
        ({ observation }) => observation.run_status === "completed",
      ).length,
      total: discoveryRecords.length,
      failed: discoveryFailed,
      recommendation_label: labels.discoveryRecommendedLabel(
        unbrandedRecommended,
        discoveryRecords.length,
        discoveryFailed,
      ),
      mention_label: labels.discoveryMentionLabel(
        unbrandedMentioned,
        discoveryRecords.length,
        discoveryFailed,
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
        comparisonAssessed.length,
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
      label: labels.coverageLabel(
        completed.length,
        observations.length,
        failed,
      ),
    },
  };
  const methodSummary = labels.methodSummary({
    totalQuestions: observations.length,
    systemPart,
    modelPart,
    unbrandedTotal: unbranded.length,
    brandedTotal: branded.length,
    coverageLabel: facts.coverage.label,
    webSearchExecuted: webSearchExecuted(observations),
  });

  return {
    ...content,
    report_version: "nuave-report-v3",
    writing_standard_version: labels.writingStandardVersion,
    generated_at: new Date().toISOString(),
    system_label: systemLabel,
    provenance: {
      report_prompt_version:
        reportCall.report_prompt_version ?? REPORT_SYNTHESIS_PROMPT_VERSION,
      prompt_contract_version:
        reportCall.prompt_contract_version ?? labels.promptContractVersion,
      question_method: questionMethod,
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
    measures,
    operational_telemetry:
      reportCall.operational_telemetry ?? summarizeAuditTelemetry([]),
  };
}

type EvidenceEnvelope = {
  export_version: string;
  exported_at: string;
  disclosure: string;
  prompts: AuditPrompt[];
  observations: AuditObservation[];
  report: AuditReport;
};

export function makeEvidenceExport(
  brief: BusinessBrief,
  prompts: AuditPrompt[],
  observations: AuditObservation[],
  report: AuditReport,
): EvidenceEnvelope & { brief: BusinessBrief };
export function makeEvidenceExport(
  brief: Extract<AuditSubject, { version: "nuave-direct-ten-context-v2" }>,
  prompts: AuditPrompt[],
  observations: AuditObservation[],
  report: AuditReport,
): EvidenceEnvelope & {
  context: Extract<AuditSubject, { version: "nuave-direct-ten-context-v2" }>;
};
export function makeEvidenceExport(
  brief: AuditSubject,
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
  const v2 = isDirectTenAuditContext(brief);
  return {
    export_version: v2 ? "nuave-evidence-v5" : "nuave-evidence-v4",
    exported_at: new Date().toISOString(),
    disclosure: `Observations come from ${systemName} and do not exactly reproduce the consumer ChatGPT interface.`,
    ...(v2
      ? { context: brief }
      : {
          brief: {
            ...brief,
            agency_logo_data_url: brief.agency_logo_data_url
              ? "[device-local logo omitted]"
              : "",
          },
        }),
    prompts,
    observations,
    report,
  };
}
