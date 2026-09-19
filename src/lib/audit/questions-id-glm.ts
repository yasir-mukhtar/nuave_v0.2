/**
 * Dormant Spec 008 GLM prototype boundary (integration draft revision 3,
 * §§1/4a/8/9 — docs/drafts/glm-local-integration-2026-09-17/INTEGRATION_DRAFT.md).
 *
 * Pure functions only: no provider registration, no fetch, no route or UI
 * dispatch, no credentials, no storage service. Nothing here generates
 * replacement text — every failure is explicit and the caller retains the
 * supplied input/response for review ("preservation" means returning the
 * supplied data, not building an evidence service).
 *
 * Dormant slot-contract method: the named consumers are its test file, the
 * founder-only local adapter (glm-local.ts), the local pack store, and the
 * Spec 009 direct-ten module, which reuses its shared transport/provenance
 * mechanics without inheriting the slot contract.
 */
import {
  AUDIT_MEASUREMENT_MATRIX,
  CANONICAL_COMPOSITION_COUNTS,
} from "./measurement-matrix";
import type { QuestionFactsV3 } from "./question-facts-v3";
import {
  categoryComparisonFallbackName,
  classifyIndonesianQuestion,
  containsIndonesianComparisonIdentity,
  hasIndonesianComparisonRelation,
  INDONESIAN_DIAGNOSIS_PATTERN,
  INDONESIAN_HIGH_IMPACT_ADVICE_PATTERNS,
  INDONESIAN_PRIVATE_DATA_PATTERNS,
  INDONESIAN_PROVIDER_SAFETY_PATTERNS,
  mentionsIndonesianBrand,
  normalizeIndonesianIdentity,
  type IndonesianValidationRule,
  type MinimizedIndonesianBrief,
} from "./questions-id";
import {
  GLM_CONTEXT_HEADING,
  GLM_FOUNDER_AMENDMENT_2026_09_16,
  GLM_INSTRUCTION_HEAD,
  GLM_INSTRUCTION_MID,
  GLM_INSTRUCTION_TAIL,
} from "./questions-id-glm-instruction";

// ---------------------------------------------------------------------------
// Request contract (tested Cheaper Inference values — one bounded call)
// ---------------------------------------------------------------------------

export const INDONESIAN_QUESTION_GLM_ENDPOINT =
  "https://api.cheaperinference.com/v1/chat/completions" as const;
export const INDONESIAN_QUESTION_GLM_MODEL = "glm-5.3-flash" as const;
export const INDONESIAN_QUESTION_GLM_SYSTEM =
  "Cheaper Inference chat completions" as const;
export const INDONESIAN_QUESTION_GLM_MAX_OUTPUT_TOKENS = 4_096 as const;
export const INDONESIAN_QUESTION_GLM_REASONING_EFFORT = "low" as const;
export const INDONESIAN_QUESTION_GLM_INSTRUCTION_VERSION =
  "glm-writer-2026-09-17" as const;
/** Proposed client wait for the deferred transport only (attempt evidence:
 * provider-side 66.7 s / 53.3 s). This module performs no I/O. */
export const INDONESIAN_QUESTION_GLM_CLIENT_WAIT_MS = 180_000 as const;

// ---------------------------------------------------------------------------
// Instruction assembly — ten slot lines rendered from the matrix
// ---------------------------------------------------------------------------

/**
 * Slot-description overrides where the adapted instruction deliberately
 * departs from `generatorSlotDescription`:
 * - slot 3: "verified customer need" → "confirmed customer need" (the
 *   instruction's vocabulary is confirmed-input, not verified-review).
 * - slot 9: the closed relation marker set is rendered as curated example
 *   phrasing instead of a raw marker dump.
 */
const GLM_SLOT_DESCRIPTION_OVERRIDES: Record<string, string> = {
  "NUAVE-BRAND-SOLUTION-01":
    "Ask which category options fit a specific confirmed customer need without naming the audited business.",
  "NUAVE-BRAND-ACTION-01":
    "Compare the audited business with the supplied comparison target using an explicit comparison relation, such as ‘atau’, ‘dibandingkan’, ‘daripada’, ‘versus’, or ‘lebih … daripada’.",
};

/**
 * Per-slot overlay sentences appended after the description — the R-20/21/22
 * strengthenings recorded in the draft (C3): entity-level help in the
 * situation (slot 2), entity-seeking for the offering (slot 4), concrete
 * options compared (slot 6).
 */
const GLM_SLOT_OVERLAYS: Record<string, string> = {
  "NUAVE-BRAND-NEED-02":
    "The question must still ask for entity-level help in that situation, not generically when or why people need the category.",
  "NUAVE-BRAND-SOLUTION-02":
    "The consumer must be seeking a business, provider, store, or product that can satisfy it.",
  "NUAVE-BRAND-COMPARISON-02":
    "Invite concrete options to be identified and compared; do not merely teach how to compare.",
};

function glmSlotLine(slot: (typeof AUDIT_MEASUREMENT_MATRIX)[number]) {
  const description =
    GLM_SLOT_DESCRIPTION_OVERRIDES[slot.id] ?? slot.generatorSlotDescription;
  const overlay = GLM_SLOT_OVERLAYS[slot.id];
  return `${slot.order}. **${slot.category}** — ${description}${overlay ? ` ${overlay}` : ""}`;
}

/**
 * The adapted winning instruction (revision-3 specimen): static text plus
 * the ten slot lines rendered above. Assembled each call so the matrix —
 * not a copied string — stays the slot-contract authority.
 */
export function glmQuestionWriterInstructionV3() {
  const unnamed = AUDIT_MEASUREMENT_MATRIX.slice(0, 6)
    .map(glmSlotLine)
    .join("\n");
  const named = AUDIT_MEASUREMENT_MATRIX.slice(6).map(glmSlotLine).join("\n");
  return (
    GLM_INSTRUCTION_HEAD +
    unnamed +
    GLM_INSTRUCTION_MID +
    named +
    GLM_INSTRUCTION_TAIL
  );
}

// ---------------------------------------------------------------------------
// Request builder — exact proposed request body (pure)
// ---------------------------------------------------------------------------

/**
 * Build the exact chat-completions request for the adapted contract. The
 * writer context is serialized verbatim — the caller passes the real
 * `buildV3WriterContext` output; any review-only labels (e.g. a fixture
 * wrapper) are owned by the caller's context object, never asserted here.
 */
export function buildCheaperInferenceIndonesianQuestionRequest(
  writerContext: unknown,
) {
  return {
    model: INDONESIAN_QUESTION_GLM_MODEL,
    stream: false,
    max_tokens: INDONESIAN_QUESTION_GLM_MAX_OUTPUT_TOKENS,
    reasoning_effort: INDONESIAN_QUESTION_GLM_REASONING_EFFORT,
    messages: [
      {
        role: "user",
        content:
          glmQuestionWriterInstructionV3() +
          GLM_CONTEXT_HEADING +
          JSON.stringify(writerContext, null, 2) +
          "\n\n" +
          GLM_FOUNDER_AMENDMENT_2026_09_16,
      },
    ],
  } as const;
}

// ---------------------------------------------------------------------------
// Response-envelope assessment — explicit outcomes, input preserved verbatim
// ---------------------------------------------------------------------------

export type CheaperInferenceFailureReason =
  | "http_error"
  | "provider_error"
  | "malformed"
  | "refusal"
  | "empty_text"
  | "incomplete"
  | "provenance";

export type CheaperInferenceUsage = {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
};

export type CheaperInferenceAssessment =
  | {
      ok: true;
      assistantText: string;
      requestedModel: string;
      /** Verified nonblank — part of provenance. */
      returnedModel: string;
      responseId: string;
      usage: CheaperInferenceUsage | null;
      billedCostUsd: number | null;
    }
  | {
      ok: false;
      reason: CheaperInferenceFailureReason;
      detail: string;
      requestedModel: string;
      returnedModel: string | null;
      responseId: string | null;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Settled billing from a Cheaper Inference envelope body. The provider
 * returns `billed_cost_usd` as a JSON number OR as a decimal string — the
 * 2026-09-18 accepted receipt carried `"0.000496"` and the earlier number-only
 * read reported `null` for a real settled cost. Both representations parse
 * to the settled amount; malformed, negative, non-finite or empty values
 * stay `null`. The raw body is never altered.
 */
export function cheaperInferenceBilledCostUsd(body: unknown): number | null {
  const billing =
    isRecord(body) && isRecord(body.cheaper_inference)
      ? body.cheaper_inference.billing
      : null;
  if (!isRecord(billing)) return null;
  const value = billing.billed_cost_usd;
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

/**
 * Assess a chat-completions response envelope from supplied status/body
 * data. Both model identifiers are preserved verbatim; the returned-model
 * check is strict equality against the requested model — the
 * `zai/glm-5.3-flash` namespaced form observed once is a PENDING alias
 * decision, and this function never strips prefixes. No retry, no fallback,
 * no storage — the caller keeps the raw body as evidence.
 */
export function assessCheaperInferenceIndonesianResponse(input: {
  httpStatus: number;
  body: unknown;
  requestedModel?: string;
}): CheaperInferenceAssessment {
  const requestedModel = input.requestedModel ?? INDONESIAN_QUESTION_GLM_MODEL;
  const body = isRecord(input.body) ? input.body : null;
  const returnedModel =
    body && typeof body.model === "string" ? body.model : null;
  const responseId = body && typeof body.id === "string" ? body.id : null;
  const fail = (
    reason: CheaperInferenceFailureReason,
    detail: string,
  ): CheaperInferenceAssessment => ({
    ok: false,
    reason,
    detail,
    requestedModel,
    returnedModel,
    responseId,
  });

  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return fail("http_error", `HTTP ${input.httpStatus}`);
  }
  if (!body) {
    return fail("malformed", "response body is not a JSON object");
  }
  if (body.error) {
    return fail(
      "provider_error",
      isRecord(body.error) && typeof body.error.message === "string"
        ? body.error.message
        : "provider error field present",
    );
  }

  const choice = Array.isArray(body.choices) ? body.choices[0] : undefined;
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return fail("malformed", "no choices[0].message in response body");
  }
  const message = choice.message;
  if (typeof message.refusal === "string" && message.refusal.trim()) {
    return fail("refusal", message.refusal);
  }
  const finishReason =
    typeof choice.finish_reason === "string" ? choice.finish_reason : null;
  if (finishReason !== "stop") {
    return fail("incomplete", `finish_reason: ${finishReason ?? "missing"}`);
  }
  const text = typeof message.content === "string" ? message.content : "";
  if (!text.trim()) {
    return fail("empty_text", "assistant text missing or empty");
  }
  if (!returnedModel) {
    return fail("provenance", "returned model identifier missing");
  }
  if (returnedModel !== requestedModel) {
    return fail(
      "provenance",
      `returned model "${returnedModel}" !== requested "${requestedModel}" (alias acceptance pending — identifiers preserved verbatim)`,
    );
  }
  if (!responseId || !responseId.trim()) {
    return fail("provenance", "response id missing or blank");
  }

  const usage = isRecord(body.usage)
    ? {
        prompt_tokens:
          typeof body.usage.prompt_tokens === "number"
            ? body.usage.prompt_tokens
            : null,
        completion_tokens:
          typeof body.usage.completion_tokens === "number"
            ? body.usage.completion_tokens
            : null,
        total_tokens:
          typeof body.usage.total_tokens === "number"
            ? body.usage.total_tokens
            : null,
      }
    : null;
  const billedCostUsd = cheaperInferenceBilledCostUsd(body);

  return {
    ok: true,
    assistantText: text,
    requestedModel,
    returnedModel,
    responseId,
    usage,
    billedCostUsd,
  };
}

// ---------------------------------------------------------------------------
// Strict three-section extractor (draft §4a — never silently drops text)
// ---------------------------------------------------------------------------

export const GLM_SECTION_MARKERS = {
  marketInterpretation: "## 1. Market interpretation",
  slotQuestions: "## 2. Slot questions",
  selfCritique: "## 3. Self-critique",
} as const;

export type GlmExtractionFailure =
  | "missing_marker"
  | "duplicate_marker"
  | "marker_order"
  | "unexpected_preamble"
  | "unexpected_line"
  | "bad_numbering";

export type GlmExtractionResult =
  | { ok: true; questions: string[] }
  | { ok: false; reason: GlmExtractionFailure; detail: string };

const NUMBERED_ITEM = /^\s*(\d{1,2})[.)]\s+(\S.*)$/;
const INTENT_LABEL = /^\s*Intent pattern\s*:\s*\S/;

/**
 * Extract exactly the ten slot questions from the three-section response.
 * Markers must appear once each and in order; inside the `## 2.` span only
 * blank lines, numbered question lines 1–10 in canonical order, and each
 * question's single optional `Intent pattern:` label line are accepted.
 * Anything else — wrapped continuations, prose, stray numbers — rejects the
 * whole extraction; a malformed item is never shortened into a question.
 * Sections 1 and 3 are never read into question text.
 */
export function extractIndonesianSlotQuestions(
  text: string,
): GlmExtractionResult {
  const lines = text.split("\n");
  const markerAt = (needle: string) =>
    lines.reduce<number[]>(
      (acc, line, i) => (line.trim() === needle ? [...acc, i] : acc),
      [],
    );
  const m1 = markerAt(GLM_SECTION_MARKERS.marketInterpretation);
  const m2 = markerAt(GLM_SECTION_MARKERS.slotQuestions);
  const m3 = markerAt(GLM_SECTION_MARKERS.selfCritique);
  for (const [name, hits] of [
    ["## 1.", m1],
    ["## 2.", m2],
    ["## 3.", m3],
  ] as const) {
    if (hits.length === 0)
      return {
        ok: false,
        reason: "missing_marker",
        detail: `no ${name} marker line`,
      };
    if (hits.length > 1)
      return {
        ok: false,
        reason: "duplicate_marker",
        detail: `${hits.length} ${name} marker lines`,
      };
  }
  if (!(m1[0]! < m2[0]! && m2[0]! < m3[0]!)) {
    return {
      ok: false,
      reason: "marker_order",
      detail: "section markers out of order",
    };
  }
  if (lines.slice(0, m1[0]).some((line) => line.trim())) {
    return {
      ok: false,
      reason: "unexpected_preamble",
      detail: "non-blank text before ## 1.",
    };
  }

  const questions: string[] = [];
  const seen: number[] = [];
  let previousWasQuestion = false;
  for (const line of lines.slice(m2[0]! + 1, m3[0])) {
    if (!line.trim()) {
      previousWasQuestion = false;
      continue;
    }
    const numbered = line.match(NUMBERED_ITEM);
    if (numbered) {
      seen.push(Number(numbered[1]));
      questions.push(numbered[2]!.trim());
      previousWasQuestion = true;
      continue;
    }
    if (INTENT_LABEL.test(line) && previousWasQuestion) {
      previousWasQuestion = false;
      continue;
    }
    return {
      ok: false,
      reason: "unexpected_line",
      detail: `line inside "## 2." span is not a numbered question, blank, or intent label: ${line.slice(0, 60)}`,
    };
  }
  if (seen.length !== 10 || seen.some((n, i) => n !== i + 1)) {
    return {
      ok: false,
      reason: "bad_numbering",
      detail: `numbered items must be exactly 1–10 in order; got [${seen.join(", ")}]`,
    };
  }
  return { ok: true, questions };
}

// ---------------------------------------------------------------------------
// GLM-scoped validation (draft §8 — R5 §§5.1–5.2 forms, retained protections)
// ---------------------------------------------------------------------------

/**
 * Preference-asking superlatives are allowed in unnamed slots (R5 §5.2:
 * "a requested preference is not a claim that the audited business
 * satisfies it"). They are rejected only when attached to a specific named
 * entity (audited business or comparator) — the asserted-premise case.
 */
const V3_SUPERLATIVE_PATTERNS = [
  /\b(?:terbaik|teraman|termurah|terpercaya|terlaris|ternyaman|terlengkap|terpopuler)\b/i,
  /\bpaling\s+(?:baik|aman|murah|tepercaya|terpercaya|lengkap|populer|nyaman|bagus)\b/i,
  /\b(?:nomor\s+?satu|number\s+?one)\b/i,
  /\b(?:best|safest|most\s+trusted|top[- ]rated)\b/i,
];

/** Guarantee tokens stay rejected everywhere in v3 — a conservative
 * retention under R5 §5.2's "reject / retain conservative handling"
 * column, not a claim that these can never be legitimate asks. */
const V3_GUARANTEE_PATTERNS = [/\b(?:dijamin|jaminan|dipastikan)\b/i];

/** Clause splitter for the premise-attachment check — the smallest
 * grammatical unit the open-question and entity-superlative tests reason
 * over. Diagnosis scoping deliberately reasons over the whole question
 * instead: punctuation must not reset medical context. */
const toClauses = (value: string) =>
  value
    .split(/[.,;:!?\n]+/)
    .map((clause) => clause.trim())
    .filter(Boolean);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Bounded open-question forms, bound to the named claim itself — position
 * alone is not enough. A clause asks rather than asserts only when:
 *  - a polar/preference opener directly addresses the entity ("Apakah X
 *    paling murah?", "Apa X termurah?", "Mending X …?"), optionally after a
 *    discourse connector — an opener addressing something else ("Apa
 *    kelebihan X yang paling murah?", "Apa yang membuat X paling murah?")
 *    presupposes or redirects the claim and stays restricted; or
 *  - an interrogative confirmation tag closes the claim clause ("X paling
 *    murah nggak?", "… atau tidak?"). Only inherently interrogative tags
 *    count — "betul"/"bener" can affirm a claim declaratively ("klaim itu
 *    betul."), so they are not tags here.
 * Mid-clause markers ("untuk cucian apa saja", "dan nggak ribet") and
 * presupposing framings ("kenapa", "siapa", "bagaimana") never open the
 * clause; unrecognized forms keep conservative premise handling. The
 * entity-bound opener is assembled per validation call in
 * `validateIndonesianQuestionPackV3`. */
const V3_OPEN_CLAIM_OPENER_HEAD =
  /^(?:(?:jadi|nah|terus|trus|lalu|sebenarnya)\s+)?(?:apakah|apa|mending)\s+/i;
const V3_OPEN_CLAIM_TAG = /\b(?:nggak|gak|kan|tidak)\s*$/i;

/**
 * v3 retains the shared high-impact list minus the bare diagnosis token,
 * which becomes an equipment-positive exception. The exception requires a
 * bounded relationship between the diagnosis token and an equipment
 * subject — an equipment noun anywhere in the question is not enough
 * ("diagnosis kondisi ini lewat HP" names a delivery channel, not the
 * diagnosed subject). Supported relationships:
 *  - diagnosis applied to equipment: "diagnosis laptop (saya)",
 *    "diagnosis pada mesin", "diagnosis kerusakan (pada) AC";
 *  - equipment needing diagnosis: "laptop saya (perlu) diagnosis";
 *  - a service domain establishing the equipment: "servis AC … diagnosis
 *    kerusakan".
 * Medical context anywhere in the question overrides the exception — "Untuk
 * kanker saya, di mana tempat diagnosis…" stays blocked across the comma —
 * a person named as the diagnosis subject ("diagnosis saya") stays
 * restricted, and unresolved subjects keep conservative handling per
 * R5 §5.2. Ownership alone is not medical context ("diagnosis laptop
 * saya").
 */
const V3_DIAGNOSIS_TOKEN = /\bdiagnos\w*\b/i;
const V3_MEDICAL_CONTEXT_TERMS =
  /\b(?:pasien|kanker|penyakit|kesehatan|medis|dokter|jiwa|mental|psikolog\w*|psikiater|tubuh|gejala|klinik|rumah\s+sakit|sakit|terapi|demam|nyeri|luka|obat)\b/i;
const V3_EQUIPMENT_SUBJECT =
  "(?:laptop|komputer|notebook|pc|hp|handphone|ponsel|tablet|gadget|motor|mobil|kendaraan|sepeda|ac|kulkas|lemari\\s+es|mesin|tv|televisi|printer|kipas|elektronik|kamera|speaker|oven|microwave|jam\\s+tangan|sepatu|sparepart|perangkat)";
const V3_EQUIPMENT_DAMAGE_TERMS =
  "(?:kerusakan|masalah|gangguan|penyebab|kebocoran|keretakan|error|eror)";
const V3_BOUND_EQUIPMENT_PATTERNS = [
  // "diagnosis <equip>", "diagnosis pada <equip>",
  // "diagnosis <kerusakan/masalah/…> (pada|di|untuk) <equip>"
  new RegExp(
    `\\bdiagnos\\w*\\s+(?:(?:pada|untuk|atas|terhadap|kepada)\\s+)?(?:${V3_EQUIPMENT_DAMAGE_TERMS}\\s+(?:(?:pada|di|untuk|atas)\\s+)?)?${V3_EQUIPMENT_SUBJECT}\\b`,
    "i",
  ),
  // "<equip> (nya|saya|…) (perlu|butuh|…) diagnosis" — the equipment is
  // the subject needing the diagnosis.
  new RegExp(
    `\\b${V3_EQUIPMENT_SUBJECT}\\b\\s+(?:(?:nya|saya|kami|itu|ini|tersebut)\\s+)?(?:(?:perlu|butuh|harus|minta|mau|pengen|pengin)\\s+)?diagnos`,
    "i",
  ),
  // "servis <equip> … diagnosis …" — a service domain binds the equipment
  // as the diagnosed subject within the clause.
  new RegExp(
    `\\b(?:servis|service|reparasi|perbaikan|bengkel)\\s+${V3_EQUIPMENT_SUBJECT}\\b[^?.,;:!\n]*\\bdiagnos`,
    "i",
  ),
];
const V3_PERSONAL_DIAGNOSIS_SUBJECT =
  /\bdiagnos\w*\s+(?:saya|aku|kami|kita|diri|pasien|orang|pelanggan|anak|istri|suami|ibu|bapak|orangtua|badan|tubuh)\b/i;
const V3_HIGH_IMPACT_ADVICE_PATTERNS = [
  ...INDONESIAN_HIGH_IMPACT_ADVICE_PATTERNS.filter(
    (pattern) => pattern !== INDONESIAN_DIAGNOSIS_PATTERN,
  ),
];

/** v3 keeps the v2 rule names and adds the restored safety boundary rules.
 * The v2 union itself is unchanged. */
export type GlmValidationRule =
  | IndonesianValidationRule
  | "private_data"
  | "high_impact_advice"
  | "provider_safety";

export type GlmValidationIssue = {
  slot: number | null;
  rule: GlmValidationRule;
  message: string;
};

const GLM_UNEXECUTABLE_MIN_LENGTH = 8;
const GLM_MAX_QUESTION_LENGTH = 700;

/** Adapt the facts projection to the minimized-brief shape the existing
 * predicates consume — targets count as audited identity; the
 * category-alternatives fallback keeps its fallback-target semantics. */
export function minimizedBriefFromQuestionFacts(
  facts: QuestionFactsV3,
): MinimizedIndonesianBrief {
  return {
    brand_name: facts.identity.brand,
    brand_name_variants: [...facts.identity.aliases, ...facts.identity.targets],
    scope: facts.entityScope.name ?? "",
    category: facts.category,
    offerings: facts.offerings.slice(0, 3),
    customer_context: facts.targetCustomer ?? "",
    customer_needs: facts.customerNeeds,
    decision_considerations: facts.buyerConstraints.map((c) => c.text),
    differentiator: "",
    comparison_business: facts.comparison.name
      ? { name: facts.comparison.name, scope: "", source_url: "" }
      : null,
    known_accuracy_questions: [],
    conversion_action: "",
    official_source_urls: facts.identity.sourceSignals,
  };
}

/**
 * The GLM-compatible validator. Same mechanical protections as the shipped
 * validator — count, nonempty, min/max length, identity, comparator,
 * comparison relation, composition, distinctness — with the R5 §5.1 form
 * rule and §5.2 preference/assertion split. No naturalness classifier, no
 * sentence counting, no semantic edit gate: semantic quality stays an
 * exact-text review question. v2 behavior is untouched.
 */
export function validateIndonesianQuestionPackV3(
  questions: string[],
  facts: QuestionFactsV3,
): GlmValidationIssue[] {
  const issues: GlmValidationIssue[] = [];
  if (questions.length !== AUDIT_MEASUREMENT_MATRIX.length) {
    issues.push({
      slot: null,
      rule: "count",
      message: `The canonical Indonesian question pack must contain exactly ${AUDIT_MEASUREMENT_MATRIX.length} questions, received ${questions.length}.`,
    });
    return issues;
  }

  const brief = minimizedBriefFromQuestionFacts(facts);
  // Same comparison-target resolution as v2: a named target, else the
  // canonical category-alternatives phrase the writer is shown for slot 9.
  const comparisonTarget =
    brief.comparison_business?.name.trim() ||
    categoryComparisonFallbackName(brief.category || "ini");
  const classifications = questions.map((question) =>
    classifyIndonesianQuestion(question, brief),
  );
  const auditedAndComparators = [
    facts.identity.brand,
    ...facts.identity.aliases,
    ...facts.identity.targets,
    ...facts.identity.comparators,
  ];
  /** The opener form must address the named entity directly — the opener
   * head followed immediately by a known identity. */
  const openClaimOpener = new RegExp(
    `${V3_OPEN_CLAIM_OPENER_HEAD.source}(?:${auditedAndComparators
      .map((identity) => identity.trim())
      .filter(Boolean)
      .map((identity) =>
        identity.split(/\s+/).map(escapeRegExp).join("[^a-zA-Z0-9]+"),
      )
      .join("|")})\\b`,
    "i",
  );
  const isOpenClaimClause = (clause: string) =>
    openClaimOpener.test(clause) || V3_OPEN_CLAIM_TAG.test(clause);

  /** R5 §5.2 attachment test: a superlative becomes an asserted premise only
   * when a specific named entity shares a clause with it and that clause is
   * not a bounded open-question form bound to the claim. A preference stated
   * in one clause ("…yang paling murah.") followed by a fit question naming
   * the business does not assert that the business satisfies it, and a
   * clause that asks whether the named claim holds ("Apakah X paling
   * murah?", "X paling murah nggak?") stays open. Declarative attachment —
   * including clauses whose opener/tag does not address the claim ("Apa
   * kelebihan X yang paling murah?", "…klaim itu betul.") — is the
   * asserted-premise case. */
  const assertsEntityPremise = (question: string) =>
    toClauses(question).some(
      (clause) =>
        !isOpenClaimClause(clause) &&
        V3_SUPERLATIVE_PATTERNS.some((pattern) => pattern.test(clause)) &&
        auditedAndComparators.some((identity) =>
          containsIndonesianComparisonIdentity(clause, identity),
        ),
    );

  questions.forEach((question, index) => {
    const slot = AUDIT_MEASUREMENT_MATRIX[index];
    if (!slot) return;
    const normalized = question.replace(/\s+/g, " ").trim();
    if (!normalized) {
      issues.push({
        slot: slot.order,
        rule: "empty",
        message: `Pertanyaan ${slot.order} tidak boleh kosong.`,
      });
      return;
    }
    if (question.trim().length > GLM_MAX_QUESTION_LENGTH) {
      issues.push({
        slot: slot.order,
        rule: "length",
        message: `Pertanyaan ${slot.order} tidak boleh lebih dari 700 karakter.`,
      });
    }
    if (normalized.length < GLM_UNEXECUTABLE_MIN_LENGTH) {
      issues.push({
        slot: slot.order,
        rule: "unexecutable",
        message: `Pertanyaan ${slot.order} terlalu singkat untuk dijalankan sebagai pertanyaan mandiri.`,
      });
    }
    // R5 §5.1: terminal `?` optional; >1 `?` rejected; a single `?` must be
    // terminal after trimming. No grammar or sentence-count gate.
    const questionMarks = (question.match(/\?/g) ?? []).length;
    if (
      questionMarks > 1 ||
      (questionMarks === 1 && !normalized.endsWith("?"))
    ) {
      issues.push({
        slot: slot.order,
        rule: "question_form",
        message: `Pertanyaan ${slot.order} harus berupa satu permintaan; tanda tanya tidak wajib, tetapi jika ada harus tepat satu di akhir.`,
      });
    }

    // Identity protections — same mechanics as v2, facts-scoped. The brief
    // adapter folds targets into variants and source signals into domains, so
    // mentionsIndonesianBrand covers the full audited-identity set; the
    // comparator side checks every confirmed comparator (v2 checked only the
    // designated target and skipped the check entirely on fallback targets —
    // v3's comparators list is authoritative either way).
    const brandMentioned = mentionsIndonesianBrand(question, brief);
    if (slot.auditedBrandIdentity === "forbidden" && brandMentioned) {
      issues.push({
        slot: slot.order,
        rule: "identity_leakage",
        message: `Pertanyaan ${slot.order} tidak boleh menyebut bisnis Anda.`,
      });
    }
    const comparatorMentioned = facts.identity.comparators.some((comparator) =>
      containsIndonesianComparisonIdentity(question, comparator),
    );
    if (slot.comparisonTargetIdentity === "forbidden" && comparatorMentioned) {
      issues.push({
        slot: slot.order,
        rule: "competitor_leakage",
        message: `Pertanyaan ${slot.order} tidak boleh menyebut bisnis pembanding.`,
      });
    }
    if (
      slot.auditedBrandIdentity === "required" &&
      !mentionsIndonesianBrand(question, brief)
    ) {
      issues.push({
        slot: slot.order,
        rule: "identity_requirement",
        message: `Pertanyaan ${slot.order} harus menyebut bisnis Anda.`,
      });
    }
    // For a named target this is the supplied comparator name; for
    // category-alternatives it is the canonical alternatives phrase — either
    // way the slot-9 question must carry it, exactly as v2 requires.
    if (
      slot.comparisonTargetIdentity === "required" &&
      !containsIndonesianComparisonIdentity(question, comparisonTarget)
    ) {
      issues.push({
        slot: slot.order,
        rule: "identity_requirement",
        message: `Pertanyaan ${slot.order} harus menyebut bisnis pembanding.`,
      });
    }

    // The closed-marker relation predicate, unmodified: it already binds the
    // canonical alternatives phrase when no named target exists.
    if (
      "comparisonRelationMarkers" in slot &&
      !hasIndonesianComparisonRelation(question, brief)
    ) {
      issues.push({
        slot: slot.order,
        rule: "comparison_relation",
        message: `Pertanyaan ${slot.order} harus membandingkan bisnis Anda dengan bisnis pembanding.`,
      });
    }

    // R5 §5.2: open preference asks allowed; asserted premises and
    // guarantee tokens rejected.
    if (V3_GUARANTEE_PATTERNS.some((pattern) => pattern.test(question))) {
      issues.push({
        slot: slot.order,
        rule: "unsupported_premise",
        message: `Pertanyaan ${slot.order} tidak boleh menganggap fakta yang belum dikonfirmasi sebagai benar.`,
      });
    } else if (assertsEntityPremise(question)) {
      issues.push({
        slot: slot.order,
        rule: "unsupported_premise",
        message: `Pertanyaan ${slot.order} tidak boleh menganggap fakta yang belum dikonfirmasi sebagai benar.`,
      });
    }

    // Restored safety boundary (I1): the same private-data, high-impact and
    // provider-safety protections the shipped blocker list applies — the v3
    // validator is this prototype's only validation boundary.
    if (
      INDONESIAN_PRIVATE_DATA_PATTERNS.some((pattern) => pattern.test(question))
    ) {
      issues.push({
        slot: slot.order,
        rule: "private_data",
        message: `Question ${slot.order} requests or exposes private or sensitive personal data.`,
      });
    }
    // Diagnosis is restricted unless a bounded construction establishes the
    // equipment as the diagnosed subject — and medical context anywhere in
    // the question or a person named as the subject overrides it.
    if (
      V3_HIGH_IMPACT_ADVICE_PATTERNS.some((pattern) =>
        pattern.test(question),
      ) ||
      (V3_DIAGNOSIS_TOKEN.test(question) &&
        (V3_MEDICAL_CONTEXT_TERMS.test(question) ||
          V3_PERSONAL_DIAGNOSIS_SUBJECT.test(question) ||
          !V3_BOUND_EQUIPMENT_PATTERNS.some((pattern) =>
            pattern.test(question),
          )))
    ) {
      issues.push({
        slot: slot.order,
        rule: "high_impact_advice",
        message: `Question ${slot.order} asks for individualized high-impact advice that Nuave does not provide.`,
      });
    }
    if (
      INDONESIAN_PROVIDER_SAFETY_PATTERNS.some((pattern) =>
        pattern.test(question),
      )
    ) {
      issues.push({
        slot: slot.order,
        rule: "provider_safety",
        message: `Question ${slot.order} asks the provider to do something it cannot lawfully or safely process.`,
      });
    }
  });

  const actualUnbranded = classifications.filter(
    (classification) => classification === "tanpa_menyebut_bisnis_anda",
  ).length;
  if (actualUnbranded !== CANONICAL_COMPOSITION_COUNTS.unbranded) {
    issues.push({
      slot: null,
      rule: "composition",
      message: `Paket pertanyaan harus berisi ${CANONICAL_COMPOSITION_COUNTS.unbranded} pertanyaan tanpa nama dan ${CANONICAL_COMPOSITION_COUNTS.branded} pertanyaan yang menyebut bisnis.`,
    });
  }

  const seen = new Set<string>();
  questions.forEach((question, index) => {
    const normalized = normalizeIndonesianIdentity(question);
    if (seen.has(normalized)) {
      issues.push({
        slot: index + 1,
        rule: "distinctness",
        message:
          "Pertanyaan ini sama dengan pertanyaan lain dalam paket. Setiap pertanyaan harus berbeda.",
      });
    } else {
      seen.add(normalized);
    }
  });

  return issues;
}
