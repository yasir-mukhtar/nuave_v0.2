import type { BusinessBrief } from "./types";

// Indonesian question-generation boundary (Spec 002, R-29..R-37, AC-23,
// AC-24). This module is additive and versioned: it sits BESIDE the English
// deterministic path (src/lib/audit/questions.ts, "deterministic-v4-en") and
// is not wired into the live engine (that is Phase 3). It owns:
//
//   - the model-first provider interface (one bounded no-search call that
//     receives only the minimized confirmed brief and returns exactly ten
//     Indonesian question strings; the live call is implemented in
//     questions-id-provider.ts, Spec 003 work package A, and is exercised in
//     tests against a stubbed HTTP layer);
//   - deterministic parsing of a returned numbered list when provider-native
//     structured output is unavailable;
//   - a deterministic Indonesian fallback pack built from the confirmed facts
//     that cannot hard-fail;
//   - mechanical safety validation (identity leakage, unsupported premise,
//     distinctness, emptiness) and the narrow blocker list (R-35);
//   - dynamic name/no-name classification computed from the final question
//     text, never from the suggested matrix (R-34); and
//   - the persisted approved-pack record, replayable verbatim (R-33).
//
// The frozen Indonesian fixture pack (NVA-FIKTIF-001.questions.v1,
// docs/drafts/00-journey-fixtures.md) passes the same mechanical rules.

// ---------------------------------------------------------------------------
// Contract versions
// ---------------------------------------------------------------------------

/** Version of the Indonesian question-pack suggestion contract. */
export const INDONESIAN_QUESTION_PACK_VERSION = "indonesian-question-pack-v1";

/** Version of the persisted approved-pack record contract. */
export const INDONESIAN_QUESTION_RECORD_VERSION =
  "indonesian-question-pack-record-v1";

/**
 * Version of the canonical question-writer instruction (one authoritative
 * instruction source, matching the frozen fixture's `instruction_version`).
 */
export const INDONESIAN_QUESTION_INSTRUCTION_VERSION = "question-writer-v1";

export const INDONESIAN_QUESTION_LANGUAGE = "id-ID" as const;

/** The two final classification values and their settled customer labels. */
export const INDONESIAN_CLASSIFICATION_VALUES = [
  "tanpa_menyebut_bisnis_anda",
  "menyebut_bisnis_anda",
] as const;
export type IndonesianClassificationValue =
  (typeof INDONESIAN_CLASSIFICATION_VALUES)[number];

export const INDONESIAN_CLASSIFICATION_LABELS: Record<
  IndonesianClassificationValue,
  string
> = {
  tanpa_menyebut_bisnis_anda: "Tanpa menyebut bisnis Anda",
  menyebut_bisnis_anda: "Menyebut bisnis Anda",
};

/**
 * Light disclosure used only when the fallback materially affects the
 * customer's task (User Flow/04 — Resilient fallback). Provider errors, JSON
 * terminology, retry counts, and internal model names never reach the
 * customer; they stay in operational telemetry.
 */
export const INDONESIAN_FALLBACK_DISCLOSURE = {
  title: "Kami menyiapkan pertanyaan dasar",
  body: "Nuave belum dapat menyesuaikan seluruh pertanyaan secara otomatis. Anda tetap dapat mengubah pertanyaan mana pun sebelum audit dimulai.",
} as const;

/**
 * Provider input ceiling for the minimized brief. Bounds the confirmed brief
 * before any live call (Spec 003 work package A recalibrated the live
 * provider against its documented limits before paid calls were approved).
 */
export const INDONESIAN_PROVIDER_INPUT_LIMITS = {
  max_minimized_brief_chars: 12_000,
} as const;

// ---------------------------------------------------------------------------
// Minimized confirmed brief
// ---------------------------------------------------------------------------

/**
 * The only input the generation call may receive (R-29): a minimized
 * projection of the confirmed Business Facts. No email, payment information,
 * provider metadata, or sensitive free text. Official source URLs are
 * provenance signals only and are never copied into question text.
 */
export type MinimizedIndonesianBrief = {
  brand_name: string;
  brand_name_variants: string[];
  /** Exact branch, city, service area, or market scope. */
  scope: string;
  category: string;
  /** Up to three selected products or services. */
  offerings: string[];
  customer_context: string;
  customer_needs: string[];
  decision_considerations: string[];
  differentiator: string;
  comparison_business: {
    name: string;
    scope: string;
    source_url: string;
  } | null;
  known_accuracy_questions: string[];
  conversion_action: string;
  /** Provenance signals only; never question content. */
  official_source_urls: string[];
};

/**
 * Projection adapter from the existing verified English brief shape. The
 * Indonesian contract treats the comparison business as optional, so the
 * minimized brief carries `comparison_business: null` only when the source
 * value is unusable.
 */
export function minimizeIndonesianBrief(
  brief: BusinessBrief,
): MinimizedIndonesianBrief {
  const comparisonName = brief.verified_competitor.name.trim();
  return {
    brand_name: brief.brand_name,
    brand_name_variants: brief.brand_name_variants,
    scope: brief.entity_scope.trim() || brief.market_context,
    category: brief.category,
    offerings: [
      ...(brief.priority_offering.trim() ? [brief.priority_offering] : []),
      ...brief.verified_offerings,
    ]
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 3),
    customer_context: brief.target_customer,
    customer_needs: brief.verified_customer_needs,
    decision_considerations: brief.verified_decision_criteria,
    differentiator: brief.usp,
    comparison_business:
      comparisonName && brief.verified_competitor.source_url
        ? {
            name: comparisonName,
            scope: brief.verified_competitor.scope,
            source_url: brief.verified_competitor.source_url,
          }
        : null,
    known_accuracy_questions: brief.known_accuracy_questions,
    conversion_action: brief.conversion_action,
    official_source_urls: brief.official_sources,
  };
}

// ---------------------------------------------------------------------------
// Provider interface (model-first, no search)
// ---------------------------------------------------------------------------

/**
 * The minimal model-output contract (R-30): exactly ten Indonesian question
 * strings in assigned order. The model does not repeat the brief, generate
 * rationales, classify its own output, or populate report fields.
 *
 * Providers without native structured output return `kind: "text"`; the
 * boundary then deterministically parses the numbered list. The live provider
 * implementation lives in questions-id-provider.ts (Spec 003 work package A);
 * its HTTP layer is stubbed in tests, never called live.
 */
export type IndonesianProviderOutput =
  { kind: "structured"; questions: string[] } | { kind: "text"; text: string };

export interface IndonesianQuestionProvider {
  /** One bounded, no-search generation call. */
  generate(brief: MinimizedIndonesianBrief): Promise<IndonesianProviderOutput>;
}

/** Provenance recorded on the generation record (filled by the caller from
 * questions-id-provider.ts configuration for the live path). */
export type IndonesianGenerationMeta = {
  system?: string;
  requested_model?: string;
  returned_model?: string;
  pricing_version?: string;
};

export type IndonesianGenerationOptions = {
  generationMeta?: IndonesianGenerationMeta;
  /** Injectable clock for deterministic tests. */
  now?: () => string;
};

/** The canonical request payload shape for Phase 3 wiring. */
export function buildIndonesianGenerationRequest(
  brief: MinimizedIndonesianBrief,
) {
  return {
    language: INDONESIAN_QUESTION_LANGUAGE,
    instruction_version: INDONESIAN_QUESTION_INSTRUCTION_VERSION,
    web_search: false,
    brief,
  } as const;
}

// ---------------------------------------------------------------------------
// Text helpers (shared with validation and classification)
// ---------------------------------------------------------------------------

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function phraseId(value: string) {
  return normalizeWhitespace(value)
    .replace(/\?/g, "")
    .replace(/[.,;:!]+$/, "")
    .trim();
}

function normalizeId(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

/** Brand identities as normalized whole tokens (length >= 3 to stay specific). */
function brandIdentitySignals(brief: MinimizedIndonesianBrief) {
  return [brief.brand_name, ...brief.brand_name_variants]
    .map(normalizeId)
    .filter((value) => value.length >= 3);
}

function containsIdentityToken(text: string, identity: string) {
  const normalizedIdentity = normalizeId(identity);
  if (!normalizedIdentity) return false;
  return ` ${normalizeId(text)} `.includes(` ${normalizedIdentity} `);
}

/** True when the question text names the audited business or a known variant. */
export function mentionsIndonesianBrand(
  text: string,
  brief: MinimizedIndonesianBrief,
) {
  return brandIdentitySignals(brief).some((signal) =>
    containsIdentityToken(text, signal),
  );
}

/**
 * Dynamic name/no-name classification (R-34): computed in code from the final
 * question text, never from the suggested matrix.
 */
export function classifyIndonesianQuestion(
  text: string,
  brief: MinimizedIndonesianBrief,
): IndonesianClassificationValue {
  return mentionsIndonesianBrand(text, brief)
    ? "menyebut_bisnis_anda"
    : "tanpa_menyebut_bisnis_anda";
}

// ---------------------------------------------------------------------------
// Deterministic numbered-list parsing
// ---------------------------------------------------------------------------

/**
 * Deterministically parses an exact numbered list (one question per item,
 * numbers 1..10 in order). Wrapped lines continue the current item. Returns
 * null on any deviation (missing/wrong numbers, fewer or more than ten,
 * empty items, or non-list preamble) so the caller falls back.
 */
export function parseNumberedIndonesianQuestions(
  text: string,
): string[] | null {
  const items: string[] = [];
  let expected = 1;
  let current: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^(\d{1,2})[.)]\s*(.*)$/);
    if (match && Number(match[1]) === expected && match[2].trim()) {
      if (current !== null) items.push(current);
      current = match[2].trim();
      expected += 1;
      continue;
    }
    if (current !== null) {
      current = `${current} ${line}`.replace(/\s+/g, " ").trim();
      continue;
    }
    // Text before the first numbered item is not a recoverable numbered list.
    return null;
  }
  if (current !== null) items.push(current);
  if (items.length !== 10) return null;
  if (items.some((question) => !question.trim())) return null;
  return items;
}

// ---------------------------------------------------------------------------
// Deterministic Indonesian fallback (cannot hard-fail)
// ---------------------------------------------------------------------------

export const INDONESIAN_SLOT_CATEGORIES = [
  "need_discovery",
  "need_discovery",
  "solution_discovery",
  "solution_discovery",
  "comparison",
  "comparison",
  "validation",
  "validation",
  "action",
  "action",
] as const;
export type IndonesianSlotCategory =
  (typeof INDONESIAN_SLOT_CATEGORIES)[number];

/** Code-owned slot semantics: the ten slot ids, their coverage role, and the
 * default suggestion's name/no-name posture. The model authors only the ten
 * strings; code owns this metadata (User Flow/04 — Minimal model-output
 * contract). */
export const INDONESIAN_SLOT_MATRIX: readonly {
  order: number;
  suggested_category: IndonesianSlotCategory;
  default_branded: boolean;
}[] = INDONESIAN_SLOT_CATEGORIES.map((suggested_category, index) => ({
  order: index + 1,
  suggested_category,
  default_branded: index >= 5,
}));

/**
 * A value may be used in an unbranded fallback question only when it cannot
 * reveal the audited business: no brand name or variant, no comparison
 * business name, no link, and no domain-like token.
 */
function safeUnbrandedValue(value: string, brief: MinimizedIndonesianBrief) {
  const candidate = phraseId(value);
  if (!candidate) return "";
  if (/https?:\/\//i.test(candidate)) return "";
  if (/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/i.test(candidate)) return "";
  const signals = [
    ...brandIdentitySignals(brief),
    ...(brief.comparison_business
      ? [normalizeId(brief.comparison_business.name)]
      : []),
  ].filter(Boolean);
  const haystack = ` ${normalizeId(candidate)} `;
  if (signals.some((signal) => haystack.includes(` ${signal} `))) return "";
  return candidate;
}

function firstSafe(
  candidates: string[],
  brief: MinimizedIndonesianBrief,
  fallback: string,
) {
  for (const candidate of candidates) {
    const safe = safeUnbrandedValue(candidate, brief);
    if (safe) return safe;
  }
  return fallback;
}

/**
 * One guaranteed-safe deterministic Indonesian question for a slot. Used both
 * by the full fallback pack and as the "safe slot fallback before display"
 * repair for a leaking or premise-asserting suggested question (Spec 002
 * failure-and-recovery matrix). Every slot's template skeleton is unique, so
 * a full fallback pack is distinct by construction. Branded slots may name
 * the audited business; slots 1-5 and 7-10 never name the comparison
 * business, which is used only in slot 6 (comparison).
 */
export function deterministicIndonesianQuestion(
  brief: MinimizedIndonesianBrief,
  slot: number,
): string {
  const category = safeUnbrandedValue(brief.category, brief);
  const scope = safeUnbrandedValue(brief.scope, brief);
  const customer = safeUnbrandedValue(brief.customer_context, brief);
  const needs = [
    ...brief.customer_needs,
    ...brief.decision_considerations,
    ...brief.known_accuracy_questions,
  ];
  const offering = firstSafe(
    [brief.offerings[0] ?? "", brief.offerings[1] ?? "", brief.category],
    brief,
    "",
  );
  const secondOffering = firstSafe(
    [brief.offerings[1] ?? "", brief.offerings[0] ?? "", brief.category],
    brief,
    "",
  );
  const action = safeUnbrandedValue(brief.conversion_action, brief);
  const brand = phraseId(brief.brand_name) || brief.brand_name;
  const competitor = brief.comparison_business
    ? phraseId(brief.comparison_business.name)
    : "";
  const customerPart = customer ? ` untuk ${customer}` : "";
  const inScopePart = scope ? ` di ${scope}` : "";
  const needPart = firstSafe(needs, brief, "") || category;

  switch (slot) {
    case 1:
      return category
        ? `Ada rekomendasi ${category}${inScopePart}${customerPart}?`
        : "Saya butuh bantuan untuk menemukan pilihan yang cocok.";
    case 2:
      return needPart
        ? `Saya cari ${needPart}${inScopePart}${customerPart}.`
        : "Rekomendasikan tempat yang cocok untuk kebutuhan saya.";
    case 3:
      return category
        ? `${category} apa saja yang tersedia${inScopePart}${customerPart}?`
        : "Tempat seperti apa yang cocok untuk kebutuhan saya?";
    case 4:
      return offering
        ? `Di mana ada ${offering}${inScopePart}${customerPart}?`
        : "Di mana saya bisa menemukan pilihan yang cocok?";
    case 5:
      return category
        ? `Bandingkan pilihan ${category}${inScopePart}${customerPart}.`
        : "Bandingkan pilihan yang tersedia untuk kebutuhan saya.";
    case 6:
      return competitor
        ? `Bandingkan ${brand} dengan ${competitor}${customerPart}${inScopePart}.`
        : `Bandingkan ${brand} dengan pilihan lain yang serupa${inScopePart}.`;
    case 7:
      return `Apa saja yang disediakan ${brand}${customerPart}?`;
    case 8:
      return scope
        ? `Di mana alamat ${brand}${inScopePart}? Buka jam berapa?`
        : `Di mana alamat ${brand}? Buka jam berapa?`;
    case 9:
      return action
        ? `Bagaimana cara ${action} dengan ${brand}?`
        : `Bagaimana cara menghubungi ${brand}?`;
    case 10:
      return secondOffering || offering
        ? `${brand} menyediakan ${secondOffering || offering}${customerPart}?`
        : `Apa yang perlu saya ketahui sebelum memilih ${brand}?`;
    default:
      return `Apa yang perlu saya ketahui sebelum memilih ${brand}?`;
  }
}

/**
 * The deterministic Indonesian fallback pack (R-31): ten questions in assigned
 * order, built from the confirmed facts, guaranteed to never hard-fail. Every
 * slot has a value-free ultimate template when every brief field is unusable.
 */
export function buildDeterministicIndonesianPack(
  brief: MinimizedIndonesianBrief,
): string[] {
  return INDONESIAN_SLOT_MATRIX.map((slot) =>
    deterministicIndonesianQuestion(brief, slot.order),
  );
}

// ---------------------------------------------------------------------------
// Mechanical safety validation
// ---------------------------------------------------------------------------

export type IndonesianValidationRule =
  | "count"
  | "empty"
  | "unexecutable"
  | "identity_leakage"
  | "competitor_leakage"
  | "unsupported_premise"
  | "distinctness";

export type IndonesianValidationIssue = {
  /** 1-based slot, or null for whole-pack issues (count). */
  slot: number | null;
  rule: IndonesianValidationRule;
  message: string;
};

const INDONESIAN_UNSUPPORTED_PREMISE_PATTERNS = [
  /\b(?:terbaik|teraman|termurah|terpercaya|terlaris|ternyaman|terlengkap|terpopuler)\b/i,
  /\bpaling\s+(?:baik|aman|murah|tepercaya|terpercaya|lengkap|populer|nyaman|bagus)\b/i,
  /\b(?:nomor\s+?satu|number\s+?one)\b/i,
  /\b(?:best|safest|most\s+trusted|top[- ]rated)\b/i,
  /\b(?:dijamin|jaminan|dipastikan)\b/i,
];

const INDONESIAN_UNEXECUTABLE_MIN_LENGTH = 8;

/**
 * Mechanical safety rules (R-37): identity leakage in the five default
 * unbranded slots, unsupported-premise wording, distinctness, and
 * emptiness/unexecutability. The comparison business may be named only in
 * slot 6. Returns every issue found; callers decide repair vs fallback.
 */
export function validateIndonesianQuestionPack(
  questions: string[],
  brief: MinimizedIndonesianBrief,
): IndonesianValidationIssue[] {
  const issues: IndonesianValidationIssue[] = [];
  if (questions.length !== INDONESIAN_SLOT_MATRIX.length) {
    issues.push({
      slot: null,
      rule: "count",
      message: `The Indonesian question pack must contain exactly ${INDONESIAN_SLOT_MATRIX.length} questions, received ${questions.length}.`,
    });
    return issues;
  }

  const brandSignals = brandIdentitySignals(brief);
  const competitorSignal = brief.comparison_business
    ? normalizeId(brief.comparison_business.name)
    : "";

  questions.forEach((question, index) => {
    const slot = index + 1;
    const normalized = normalizeWhitespace(question);
    if (!normalized) {
      issues.push({
        slot,
        rule: "empty",
        message: `Question ${slot} is empty.`,
      });
      return;
    }
    if (normalized.length < INDONESIAN_UNEXECUTABLE_MIN_LENGTH) {
      issues.push({
        slot,
        rule: "unexecutable",
        message: `Question ${slot} is too short to be executed as a standalone question.`,
      });
    }

    // Identity leakage: the five default unbranded slots must not reveal the
    // audited business name or a known variant.
    if (
      slot <= 5 &&
      brandSignals.some((signal) => containsIdentityToken(question, signal))
    ) {
      issues.push({
        slot,
        rule: "identity_leakage",
        message: `Question ${slot} reveals the audited business name or one of its known variants.`,
      });
    }

    // The comparison business may be named only in the designated comparison
    // slot (6).
    if (
      competitorSignal &&
      slot !== 6 &&
      ` ${normalizeId(question)} `.includes(` ${competitorSignal} `)
    ) {
      issues.push({
        slot,
        rule: "competitor_leakage",
        message: `Question ${slot} reveals the comparison business outside the designated comparison question.`,
      });
    }

    if (
      INDONESIAN_UNSUPPORTED_PREMISE_PATTERNS.some((pattern) =>
        pattern.test(question),
      )
    ) {
      issues.push({
        slot,
        rule: "unsupported_premise",
        message: `Question ${slot} assumes an unconfirmed fact as true or asserts an unsupported claim.`,
      });
    }
  });

  const seen = new Set<string>();
  questions.forEach((question, index) => {
    const normalized = normalizeId(question);
    if (seen.has(normalized)) {
      issues.push({
        slot: index + 1,
        rule: "distinctness",
        message: `Question ${index + 1} duplicates another question.`,
      });
    } else {
      seen.add(normalized);
    }
  });

  return issues;
}

/**
 * Safe slot fallback: replaces every suggested question that breaks a
 * mechanical safety rule (or duplicates another) with the deterministic
 * question for that slot. Returns null only when repair cannot recover ten
 * distinct questions, in which case the caller uses the full fallback pack.
 */
export function repairIndonesianSuggestion(
  questions: string[],
  brief: MinimizedIndonesianBrief,
): { questions: string[]; originals: string[]; warnings: string[] } | null {
  if (questions.length !== INDONESIAN_SLOT_MATRIX.length) return null;
  const issues = validateIndonesianQuestionPack(questions, brief);
  const repairSlots = new Set(
    issues
      .filter((issue) => issue.slot !== null)
      .map((issue) => issue.slot as number),
  );
  const seen = new Set<string>();
  questions.forEach((question, index) => {
    const normalized = normalizeId(question);
    if (seen.has(normalized)) repairSlots.add(index + 1);
    else seen.add(normalized);
  });
  if (repairSlots.size === 0) {
    return { questions, originals: questions, warnings: [] };
  }

  const originals = questions.slice();
  const repaired = questions.map((question, index) =>
    repairSlots.has(index + 1)
      ? deterministicIndonesianQuestion(brief, index + 1)
      : question,
  );
  if (new Set(repaired.map(normalizeId)).size !== repaired.length) return null;

  const warnings = [...new Set(repairSlots)].map(
    (slot) => `slot_safety_repair:${slot}`,
  );
  return { questions: repaired, originals, warnings };
}

// ---------------------------------------------------------------------------
// Narrow blocker list (R-35)
// ---------------------------------------------------------------------------

const INDONESIAN_PRIVATE_DATA_PATTERNS = [
  /\b(?:\+?62[\s-]?|0)8[0-9][\s-]?[0-9]{6,10}\b/,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  /\b\d{16}\b/,
  /\b(?:nomor\s+(?:ktp|rekening|kartu|paspor)|nomer\s+ktp)\b/i,
];

const INDONESIAN_HIGH_IMPACT_ADVICE_PATTERNS = [
  /\b(?:diagnosa|diagnosis|resep\s+obat|dosis|obat\s+(?:untuk|saya)|konsultasi\s+(?:medis|dokter|psikolog|hukum|pajak)|nasihat\s+(?:hukum|medis|keuangan)|perencanaan\s+keuangan\s+pribadi|klaim\s+asuransi|investasi\s+pribadi|somasi|gugatan)\b/i,
];

const INDONESIAN_PROVIDER_SAFETY_PATTERNS = [
  /\b(?:review\s+palsu|ulasan\s+palsu|manipulasi\s+peringkat|naikkan\s+peringkat|peringkat\s+palsu|jual\s+obat\s+terlarang|judi\s+online|eksploitasi\s+anak|pornografi)\b/i,
  /\b(?:fake\s+review|manipulate\s+ranking|boost\s+ranking|fabricated\s+review)\b/i,
];

const INDONESIAN_STOPWORDS = new Set([
  "di",
  "ke",
  "dan",
  "yang",
  "untuk",
  "dari",
  "dengan",
  "pada",
  "apa",
  "saya",
  "ini",
  "itu",
  "atau",
  "ya",
  "aja",
  "nggak",
  "ga",
  "gak",
  "kok",
  "kan",
  "sih",
  "deh",
]);

/**
 * Customer-decision concept stems. A question that uses none of the brief's
 * confirmed-fact vocabulary but still speaks the customer-decision language
 * (requesting options, comparing choices, checking the named business, or
 * deciding what to do next) counts as related (R-35: "unrelated to the
 * audited business or its customer decision"). True off-topic content shares
 * neither vocabulary and is blocked.
 */
const INDONESIAN_DECISION_CONCEPT_PATTERNS = [
  /^rekomendasi/,
  /^pilihan/,
  /^kebutuhan/,
  /^cocok/,
  /^tersedia/,
  /^tempat/,
  /^banding/,
  /^kontak/,
  /^alamat/,
  /^layanan/,
  /^bisnis/,
  /^menghubungi/,
  /^cari/,
  /^beli/,
  /^harga/,
];

function questionTokens(text: string) {
  return normalizeId(text)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !INDONESIAN_STOPWORDS.has(token));
}

function isCustomerDecisionToken(token: string) {
  return INDONESIAN_DECISION_CONCEPT_PATTERNS.some((pattern) =>
    pattern.test(token),
  );
}

function briefGroundingTokens(brief: MinimizedIndonesianBrief) {
  return new Set(
    [
      brief.brand_name,
      ...brief.brand_name_variants,
      brief.scope,
      brief.category,
      ...brief.offerings,
      brief.customer_context,
      ...brief.customer_needs,
      ...brief.decision_considerations,
      brief.differentiator,
      brief.comparison_business?.name ?? "",
      brief.conversion_action,
    ].flatMap(questionTokens),
  );
}

function providerInputLimitIssues(brief: MinimizedIndonesianBrief) {
  const serialized = JSON.stringify(brief);
  if (
    serialized.length >
    INDONESIAN_PROVIDER_INPUT_LIMITS.max_minimized_brief_chars
  ) {
    return [
      `The confirmed brief exceeds the provider input limit (${serialized.length} characters, limit ${INDONESIAN_PROVIDER_INPUT_LIMITS.max_minimized_brief_chars}).`,
    ];
  }
  return [];
}

/**
 * The narrow blocker list (R-35): approval is blocked ONLY for an empty or
 * unexecutable question, provider input limits, private or sensitive personal
 * data, disallowed individualized high-impact advice, content unrelated to
 * the audited business or its customer decision, and content the provider
 * cannot lawfully or safely process. Informal wording, English terms, changed
 * intent, unknown-fact investigations, and 5/5-balance changes never block.
 */
export function indonesianPackBlockers(
  questions: string[],
  brief: MinimizedIndonesianBrief,
): string[] {
  const blockers: string[] = [];
  questions.forEach((question, index) => {
    const slot = index + 1;
    const normalized = normalizeWhitespace(question);
    if (!normalized || normalized.length < INDONESIAN_UNEXECUTABLE_MIN_LENGTH) {
      blockers.push(
        `Question ${slot} is empty or cannot be executed as a standalone question.`,
      );
      return;
    }
    if (
      INDONESIAN_PRIVATE_DATA_PATTERNS.some((pattern) => pattern.test(question))
    ) {
      blockers.push(
        `Question ${slot} requests or exposes private or sensitive personal data.`,
      );
    }
    if (
      INDONESIAN_HIGH_IMPACT_ADVICE_PATTERNS.some((pattern) =>
        pattern.test(question),
      )
    ) {
      blockers.push(
        `Question ${slot} asks for individualized high-impact advice that Nuave does not provide.`,
      );
    }
    if (
      INDONESIAN_PROVIDER_SAFETY_PATTERNS.some((pattern) =>
        pattern.test(question),
      )
    ) {
      blockers.push(
        `Question ${slot} asks the provider to do something it cannot lawfully or safely process.`,
      );
    }
    const tokens = questionTokens(question);
    if (
      tokens.length > 0 &&
      !tokens.some(
        (token) =>
          briefGroundingTokens(brief).has(token) ||
          isCustomerDecisionToken(token),
      )
    ) {
      blockers.push(
        `Question ${slot} is unrelated to the audited business or its customer decision.`,
      );
    }
  });
  blockers.push(...providerInputLimitIssues(brief));
  return blockers;
}

export class IndonesianApprovalBlockedError extends Error {
  constructor(public readonly blockers: string[]) {
    super(`Question pack approval is blocked: ${blockers.join(" ")}`);
    this.name = "IndonesianApprovalBlockedError";
  }
}

// ---------------------------------------------------------------------------
// Suggestion, edits, approval, persistence, and replay
// ---------------------------------------------------------------------------

export type IndonesianQuestionItem = {
  order: number;
  /** Final question text (customer-visible). */
  text: string;
  final_classification: IndonesianClassificationValue;
  /** The text the generator originally suggested for this slot. */
  original_suggestion: string;
  suggested_category: IndonesianSlotCategory;
  edited: boolean;
};

export type IndonesianClassificationSummary = {
  total: number;
  tanpa_menyebut_bisnis_anda: number;
  menyebut_bisnis_anda: number;
};

export type IndonesianGenerationRecord = {
  system: string;
  requested_model: string;
  returned_model: string;
  instruction_version: string;
  generated_at: string;
  fallback_used: boolean;
  telemetry: {
    latency_ms: number;
    input_tokens: number;
    output_tokens: number;
    accounted_cost_usd: number;
    cost_basis: string;
    pricing_version: string;
  } | null;
};

export type IndonesianQuestionPackSuggestion = {
  pack_version: string;
  language: "id-ID";
  questions: IndonesianQuestionItem[];
  classification_summary: IndonesianClassificationSummary;
  generation: IndonesianGenerationRecord;
  /** "model" | "parsed" | "fallback" — the path that produced the suggestion. */
  source: "model" | "parsed" | "fallback";
  /** Machine warnings: "fallback_used", "slot_safety_repair:<slot>". */
  warnings: string[];
  /** Customer edit history, carried through to the approved record (R-33). */
  edit_record: IndonesianEditRecordEntry[];
};

function classificationSummary(
  questions: IndonesianQuestionItem[],
): IndonesianClassificationSummary {
  const tanpa = questions.filter(
    (item) => item.final_classification === "tanpa_menyebut_bisnis_anda",
  ).length;
  return {
    total: questions.length,
    tanpa_menyebut_bisnis_anda: tanpa,
    menyebut_bisnis_anda: questions.length - tanpa,
  };
}

function toQuestionItems(
  texts: string[],
  originals: string[],
  brief: MinimizedIndonesianBrief,
): IndonesianQuestionItem[] {
  return texts.map((text, index) => ({
    order: index + 1,
    text,
    final_classification: classifyIndonesianQuestion(text, brief),
    original_suggestion: originals[index],
    suggested_category: INDONESIAN_SLOT_MATRIX[index].suggested_category,
    edited: false,
  }));
}

/**
 * The generation boundary (R-29..R-31, AC-23). One bounded no-search call,
 * deterministic numbered-list parsing when structured output is unavailable,
 * mechanical validation with safe-slot repair, and the deterministic
 * Indonesian fallback on any provider or format failure. Never hard-fails the
 * order: the fallback pack is guaranteed to build.
 */
export async function generateIndonesianQuestionPack(
  brief: MinimizedIndonesianBrief,
  provider: IndonesianQuestionProvider,
  options: IndonesianGenerationOptions = {},
): Promise<IndonesianQuestionPackSuggestion> {
  const now = options.now ?? (() => new Date().toISOString());
  const meta = options.generationMeta ?? {};
  const build = (
    source: "model" | "parsed" | "fallback",
    questions: string[],
    originals: string[],
    warnings: string[],
  ): IndonesianQuestionPackSuggestion => {
    const items = toQuestionItems(questions, originals, brief);
    return {
      pack_version: INDONESIAN_QUESTION_PACK_VERSION,
      language: INDONESIAN_QUESTION_LANGUAGE,
      questions: items,
      classification_summary: classificationSummary(items),
      generation: {
        system: meta.system ?? "not recorded",
        requested_model: meta.requested_model ?? "not recorded",
        returned_model: meta.returned_model ?? "not recorded",
        instruction_version: INDONESIAN_QUESTION_INSTRUCTION_VERSION,
        generated_at: now(),
        fallback_used: source === "fallback",
        telemetry: null,
      },
      source,
      warnings,
      edit_record: [],
    };
  };

  let questions: string[] | null = null;
  let originals: string[] | null = null;
  let source: "model" | "parsed" | "fallback" = "fallback";
  const warnings: string[] = [];

  try {
    const output = await provider.generate(brief);
    if (output.kind === "structured") {
      const candidate = output.questions
        .map((question) => normalizeWhitespace(question))
        .filter(Boolean);
      if (candidate.length === INDONESIAN_SLOT_MATRIX.length) {
        questions = candidate;
        originals = candidate;
        source = "model";
      }
    } else {
      const parsed = parseNumberedIndonesianQuestions(output.text);
      if (parsed) {
        questions = parsed;
        originals = parsed;
        source = "parsed";
      }
    }
  } catch {
    // Provider failure: fall through to the deterministic Indonesian fallback.
  }

  if (source !== "fallback" && questions && originals) {
    const repaired = repairIndonesianSuggestion(questions, brief);
    if (repaired) {
      questions = repaired.questions;
      originals = repaired.originals;
      warnings.push(...repaired.warnings);
    } else {
      questions = null;
      originals = null;
      source = "fallback";
    }
  }

  if (source === "fallback" || !questions || !originals) {
    source = "fallback";
    questions = buildDeterministicIndonesianPack(brief);
    originals = questions;
    warnings.push("fallback_used");
  }

  return build(source, questions, originals, [...new Set(warnings)]);
}

export type IndonesianQuestionEdit = {
  order: number;
  new_text: string;
};

export type IndonesianEditRecordEntry = {
  order: number;
  from: string;
  to: string;
  edited_at: string;
};

/**
 * Applies customer edits to a suggestion (R-34). Classification is recomputed
 * from the final text, counts update immediately, the suggested category and
 * original suggestion are preserved, and every edit is recorded. Ordinary
 * edits — including balance changes — never block; only the narrow blocker
 * list can block approval.
 */
export function applyIndonesianQuestionEdits(
  suggestion: IndonesianQuestionPackSuggestion,
  brief: MinimizedIndonesianBrief,
  edits: IndonesianQuestionEdit[],
  options: { now?: () => string } = {},
): IndonesianQuestionPackSuggestion {
  if (edits.length === 0) return suggestion;
  const now = options.now ?? (() => new Date().toISOString());
  const questions = suggestion.questions.map((item) => ({ ...item }));
  const editRecord: IndonesianEditRecordEntry[] = [...suggestion.edit_record];
  edits.forEach((edit) => {
    const item = questions.find((candidate) => candidate.order === edit.order);
    if (!item) return;
    const from = item.text;
    const to = normalizeWhitespace(edit.new_text);
    if (!to || to === from) return;
    item.text = to;
    item.edited = true;
    item.final_classification = classifyIndonesianQuestion(to, brief);
    editRecord.push({ order: edit.order, from, to, edited_at: now() });
  });
  return {
    ...suggestion,
    questions,
    classification_summary: classificationSummary(questions),
    edit_record: editRecord,
  };
}

export type IndonesianApprovalContext = {
  /** Immutable pack identity, e.g. "NVA-FIKTIF-001.questions.v1". */
  pack_version_id: string;
  order_reference: string;
  fact_version_id: string;
  approved_at?: string;
  /** Machine warning keys acknowledged by the customer (defaults to the
   * suggestion's warnings). */
  warnings_acknowledged?: string[];
};

/**
 * The persisted approved-pack record (R-33, AC-24): ordered ten strings, edit
 * record, final classification, provenance (provider/model/instruction
 * version), warnings, and approval timestamp — replayable verbatim.
 */
export type IndonesianQuestionPackRecord = {
  pack_record_version: string;
  pack_version_id: string;
  order_reference: string;
  fact_version_id: string;
  status: "questions_approved";
  language: "id-ID";
  generation: IndonesianGenerationRecord;
  questions: IndonesianQuestionItem[];
  edit_record: IndonesianEditRecordEntry[];
  classification_summary: IndonesianClassificationSummary;
  warnings_acknowledged: string[];
  approval: {
    approved: boolean;
    approved_at: string;
  };
  lock: {
    locked: boolean;
    consumed: boolean;
    started_at: string | null;
  };
};

/** In-memory approved-pack store (Phase 2; durable persistence is Phase 3/4). */
const approvedPackStore = new Map<string, IndonesianQuestionPackRecord>();

/**
 * Approves the exact final pack and persists it. Fails closed (throws) only
 * when a narrow blocker is present — approval is a human step, not a
 * generation call, so failing closed here cannot hard-fail an order.
 */
export function approveIndonesianQuestionPack(
  suggestion: IndonesianQuestionPackSuggestion,
  brief: MinimizedIndonesianBrief,
  context: IndonesianApprovalContext,
): IndonesianQuestionPackRecord {
  const blockers = indonesianPackBlockers(
    suggestion.questions.map((item) => item.text),
    brief,
  );
  if (blockers.length > 0) {
    throw new IndonesianApprovalBlockedError(blockers);
  }
  const record: IndonesianQuestionPackRecord = {
    pack_record_version: INDONESIAN_QUESTION_RECORD_VERSION,
    pack_version_id: context.pack_version_id,
    order_reference: context.order_reference,
    fact_version_id: context.fact_version_id,
    status: "questions_approved",
    language: INDONESIAN_QUESTION_LANGUAGE,
    generation: suggestion.generation,
    questions: suggestion.questions.map((item) => ({ ...item })),
    edit_record: suggestion.edit_record.map((entry) => ({ ...entry })),
    classification_summary: { ...suggestion.classification_summary },
    warnings_acknowledged: context.warnings_acknowledged ?? suggestion.warnings,
    approval: {
      approved: true,
      approved_at: context.approved_at ?? new Date().toISOString(),
    },
    lock: { locked: false, consumed: false, started_at: null },
  };
  approvedPackStore.set(record.pack_version_id, record);
  return record;
}

/**
 * Replays the exact persisted pack verbatim for a comparable re-check (R-33).
 * Returns null when the pack version is unknown.
 */
export function replayIndonesianQuestionPack(
  packVersionId: string,
): IndonesianQuestionPackRecord | null {
  const record = approvedPackStore.get(packVersionId);
  return record
    ? { ...record, questions: record.questions.map((item) => ({ ...item })) }
    : null;
}
