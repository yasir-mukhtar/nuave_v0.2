/** Dormant Spec 008 R5 G2 finalizer/fallback prototype (§4.2, §5, §8.1).
 * No runtime consumer: no route, UI, storage, or live provider dispatch
 * imports this module. It evaluates parsed rich/simple responses against the
 * G1 facts/context contract, the R5 P/M/C selection rules, and one shared
 * full-fallback budget. Exact fallback wording remains subject to the
 * packet's independent review; these tests prove mechanics only. */
import { createHash } from "node:crypto";
import {
  AUDIT_MEASUREMENT_MATRIX,
  measurementSlotForId,
  type CanonicalMeasurementSlot,
} from "./measurement-matrix";
import {
  categoryComparisonFallbackName,
  containsIndonesianComparisonIdentity,
  hasIndonesianComparisonRelationForIdentities,
  INDONESIAN_PRIVATE_DATA_PATTERNS,
  INDONESIAN_PROVIDER_SAFETY_PATTERNS,
  normalizeIndonesianIdentity,
} from "./questions-id";
import {
  hasForbiddenV3Identity,
  projectV3SlotContext,
} from "./question-context-v3";
import {
  parseQuestionFactsV3,
  type Correction,
  type QuestionFactsV3,
} from "./question-facts-v3";
import {
  buildV3ProviderBody,
  buildV3WriterRequest,
  parseV3RichResponse,
  parseV3SimpleResponse,
  V3_CONTEXT_REF_FIELDS,
  V3_EVIDENCE_POLICY_VERSION,
  V3_GUARD_POLICY,
  V3_RICH_INSTRUCTION_VERSION,
  V3_RICH_SCHEMA_VERSION,
  V3_SIMPLE_INSTRUCTION_VERSION,
  V3_SIMPLE_SCHEMA_VERSION,
  V3_WRITER_CONTRACT_VERSION,
  type V3Candidate,
  type V3CandidatePosition,
  type V3RichResponse,
  type V3SimpleResponse,
  type V3WriterVariant,
} from "./question-writer-v3";

export const V3_FINALIZER_VERSION = "nuave.question-finalizer.v3.1";
export const V3_SELECTOR_VERSION = "nuave.question-selector.v3.1";
export const V3_FALLBACK_VERSION = "nuave.question-fallback.v3.1";

const UNNAMED_SLOTS = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) => slot.auditedBrandIdentity === "forbidden",
);
const NAMED_SLOTS = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) => slot.auditedBrandIdentity === "required",
);
const UNNAMED_MIN_CHARS = 8;

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalize = (value: string) => normalizeIndonesianIdentity(value);
const compact = (value: string) => value.replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// Compatible-008 mechanical checks (R5 §5)
// ---------------------------------------------------------------------------

export type V3CheckRule =
  | "empty"
  | "unexecutable"
  | "length"
  | "question_form"
  | "identity_leakage"
  | "identity_requirement"
  | "competitor_leakage"
  | "comparison_relation"
  | "unsupported_premise"
  | "known_copy"
  | "private_data"
  | "high_impact_advice"
  | "provider_safety"
  | "references";

export type V3CheckIssue = {
  slotId: string;
  position: V3CandidatePosition | "named";
  rule: V3CheckRule;
};

/** §5.1: one question or direct request; natural terminal ?, ., ! or none.
 * At most one `?`, and when present it must end the trimmed text. */
function formIssue(text: string): boolean {
  const marks = text.match(/\?/g)?.length ?? 0;
  return marks > 1 || (marks === 1 && !text.trimEnd().endsWith("?"));
}

/** Asserted guarantee/outcome tokens remain blocked everywhere (§5.2). */
const V3_GUARANTEE_ASSERTION =
  /\b(?:dijamin|jaminan|dipastikan|pasti\s+(?:sembuh|berhasil|aman|untung))\b/i;
/** Comparative/superlative tokens: lawful as an open consumer preference in an
 * unnamed slot ("mana yang termurah"), still an unsupported premise when a
 * named (identity-required) slot attaches them to an entity. */
const V3_SUPERLATIVE =
  /\b(?:terbaik|teraman|termurah|terpercaya|terlaris|ternyaman|terlengkap|terpopuler|terunggul)\b|\bpaling\s+(?:baik|aman|murah|tepercaya|terpercaya|lengkap|populer|nyaman|bagus|unggul|cepat)\b|\b(?:nomor\s+?satu|number\s+?one|best|safest|most\s+trusted|top[- ]rated)\b/i;

/** Individualized high-impact advice stays blocked. The diagnosis tokens get
 * the §5.2 equipment distinction: diagnosing equipment damage is an ordinary
 * service-selection criterion; personal/mixed human diagnosis stays blocked. */
const V3_INDIVIDUAL_ADVICE =
  /\b(?:resep\s+obat|dosis|obat\s+(?:untuk|saya)|konsultasi\s+(?:medis|dokter|psikolog|hukum|pajak)|nasihat\s+(?:hukum|medis|keuangan)|perencanaan\s+keuangan\s+pribadi|klaim\s+asuransi|investasi\s+pribadi|somasi|gugatan)\b/i;
const V3_DIAGNOSIS = /\b(?:diagnosa|diagnosis|mendiagnosis)\b/i;
const V3_EQUIPMENT_CONTEXT =
  /\b(?:ac|kulkas|mesin|mobil|motor|laptop|komputer|perangkat|device|printer|cctv|elektronik|gadget|handphone|hp|tv|kipas|pompa|genset|kendaraan|sparepart)\b/i;
const V3_PERSON_CONTEXT =
  /\b(?:saya|pribadi|pasien|keluarga|anak|istri|suami|ibu|bayi|badan|tubuh|kesehatan|mental|jiwa|hamil)\b/i;

/** Digit-bearing tokens are the mechanical marker for copied target prices or
 * specifications. Sources that may lawfully appear as consumer *preferences*
 * (buyer constraints, customer needs) never feed this set — that is the §5.2
 * distinction between a confirmed constraint and a copied target claim. */
function copySpecTokens(facts: QuestionFactsV3): Set<string> {
  const sources = [
    ...facts.offerings,
    ...facts.safeFacts.map((fact) => fact.text),
    facts.entityScope.name,
    facts.entityScope.address,
    facts.entityScope.detail,
    facts.businessType,
    facts.marketContext.description,
  ].filter((value): value is string => Boolean(value));
  return new Set(
    sources
      .flatMap((value) => normalize(value).split(/\s+/))
      .filter((token) => token.length >= 2 && /\d/.test(token)),
  );
}

/** Verbatim copy of a buyer-supplied free-text fact (which has no writer
 * permission) of four or more normalized tokens. */
function copiedSafeFact(text: string, facts: QuestionFactsV3): boolean {
  const normalizedText = ` ${normalize(text)} `;
  return facts.safeFacts.some((fact) => {
    const normalized = normalize(fact.text);
    return (
      normalized.split(/\s+/).length >= 4 &&
      normalizedText.includes(` ${normalized} `)
    );
  });
}

/**
 * The compatible-008 mechanical check for one final text in one slot. This is
 * the evaluation-time candidate gate; it does not change the shipped v2
 * writer or shared validation. Consumer preferences are not assertions about
 * the audited business, so superlatives pass unnamed slots; guaranteed-outcome
 * assertions and named-slot superlatives remain rejected.
 */
export function checkV3Text(
  text: string,
  slot: CanonicalMeasurementSlot,
  facts: QuestionFactsV3,
): V3CheckRule[] {
  const rules: V3CheckRule[] = [];
  const issue = (rule: V3CheckRule) => rules.push(rule);

  const trimmed = text.trim();
  if (!trimmed) {
    issue("empty");
    return rules;
  }
  if (trimmed.length > 700) issue("length");
  if (compact(trimmed).length < UNNAMED_MIN_CHARS) issue("unexecutable");
  if (formIssue(trimmed)) issue("question_form");

  // Identity: forbidden values in unnamed slots, required values in named.
  const brandRequired = slot.auditedBrandIdentity === "required";
  const brandMentioned = [
    facts.identity.brand,
    ...facts.identity.aliases,
    ...facts.identity.sourceSignals,
  ]
    .filter(Boolean)
    .some((identity) => containsIndonesianComparisonIdentity(text, identity));
  if (brandRequired && !brandMentioned) issue("identity_requirement");
  if (hasForbiddenV3Identity(text, facts, slot)) issue("identity_leakage");

  const comparatorMentioned = facts.identity.comparators.some((identity) =>
    containsIndonesianComparisonIdentity(text, identity),
  );
  if (slot.comparisonTargetIdentity === "forbidden" && comparatorMentioned)
    issue("competitor_leakage");
  if (slot.comparisonTargetIdentity === "required") {
    const comparisonName =
      facts.comparison.kind === "unresolved"
        ? categoryComparisonFallbackName(facts.category)
        : (facts.comparison.name ?? "");
    if (!comparisonName) issue("identity_requirement");
    else if (
      !hasIndonesianComparisonRelationForIdentities(
        text,
        [facts.identity.brand, ...facts.identity.aliases],
        comparisonName,
      )
    )
      issue("comparison_relation");
  }

  // Premise policy (§5.2): preference vs assertion.
  if (V3_GUARANTEE_ASSERTION.test(trimmed)) issue("unsupported_premise");
  if (brandRequired && V3_SUPERLATIVE.test(trimmed))
    issue("unsupported_premise");

  // Copied target material in unnamed slots only (named slots may
  // legitimately check confirmed facts about the audited business).
  if (!brandRequired) {
    const tokens = new Set(normalize(trimmed).split(/\s+/));
    if ([...copySpecTokens(facts)].some((token) => tokens.has(token)))
      issue("known_copy");
    if (copiedSafeFact(trimmed, facts)) issue("known_copy");
  }

  if (INDONESIAN_PRIVATE_DATA_PATTERNS.some((p) => p.test(trimmed)))
    issue("private_data");
  if (V3_INDIVIDUAL_ADVICE.test(trimmed)) issue("high_impact_advice");
  if (
    V3_DIAGNOSIS.test(trimmed) &&
    !(V3_EQUIPMENT_CONTEXT.test(trimmed) && !V3_PERSON_CONTEXT.test(trimmed))
  )
    issue("high_impact_advice");
  if (INDONESIAN_PROVIDER_SAFETY_PATTERNS.some((p) => p.test(trimmed)))
    issue("provider_safety");

  return rules;
}

/** Reference check on a structured candidate (references already resolve
 * post-parse, but candidates may be constructed elsewhere — §4.2 step 3). */
export function checkV3Candidate(
  candidate: V3Candidate,
  slot: CanonicalMeasurementSlot,
  facts: QuestionFactsV3,
  market: V3RichResponse["market"],
): V3CheckRule[] {
  const rules = checkV3Text(candidate.text, slot, facts);
  const dimensionIds = new Set(market.dimensions.map((d) => d.id));
  if (
    candidate.dimensionIds.some((id) => !dimensionIds.has(id)) ||
    candidate.contextRefs.some(
      (ref) => !V3_CONTEXT_REF_FIELDS.includes(ref as never),
    )
  )
    rules.push("references");
  return rules;
}

// ---------------------------------------------------------------------------
// Reviewed deterministic v3 fallback (recommendation-eligible, slot-safe)
// ---------------------------------------------------------------------------

function safeValue(
  value: string | null | undefined,
  facts: QuestionFactsV3,
  slot: CanonicalMeasurementSlot,
) {
  const trimmed = value?.trim() ?? "";
  return trimmed && !hasForbiddenV3Identity(trimmed, facts, slot)
    ? trimmed
    : "";
}

/** Channel → natural consumer phrasing. Uses only confirmed safe channels. */
function channelPhrase(facts: QuestionFactsV3) {
  const phrases: Record<string, string> = {
    on_customer: "yang bisa datang ke lokasi saya",
    delivery: "yang bisa mengirim ke pelanggan",
    online: "yang bisa dipesan online",
    on_premise: "",
  };
  return (
    (facts.serviceChannels ?? [])
      .map((channel) => phrases[channel] ?? "")
      .find(Boolean) ?? ""
  );
}

/**
 * One reviewed deterministic fallback text per slot: entity-seeking forms
 * built only from safe market inputs. A reviewed per-slot override may supply
 * a category-specific form; overrides are checked like any other text, so an
 * unsafe reviewed form can never pass silently.
 */
export function v3SlotFallback(
  facts: QuestionFactsV3,
  slot: CanonicalMeasurementSlot,
  reviewed?: string,
): string {
  if (reviewed?.trim()) return compact(reviewed);
  const category =
    safeValue(facts.category, facts, slot) || "pilihan yang tersedia";
  const area = facts.marketContext.areas.find((a) => safeValue(a, facts, slot));
  const inScope = area ? ` di ${area}` : "";
  const need =
    facts.customerNeeds.find((n) => safeValue(n, facts, slot)) ??
    facts.buyerConstraints.find((c) => safeValue(c.text, facts, slot))?.text ??
    "";
  const needPart = need || "kebutuhan pelanggan";
  const offering =
    facts.offerings.find((o) => safeValue(o, facts, slot)) || category;
  const channel = channelPhrase(facts);
  const brand = compact(facts.identity.brand);
  const comparison =
    facts.comparison.kind === "unresolved"
      ? categoryComparisonFallbackName(facts.category || "ini")
      : (facts.comparison.name ??
        categoryComparisonFallbackName(facts.category || "ini"));

  switch (slot.category) {
    case "category_recommendation":
      return `${category} apa saja yang layak dipertimbangkan${inScope}?`;
    case "situation":
      return `Saat ${need ? `membutuhkan ${need}` : `membutuhkan ${category}`}, ${category} mana yang bisa membantu${inScope}?`;
    case "need_fit":
      return `Untuk ${needPart}, ${category} apa yang cocok${inScope}?`;
    case "offering_use_case":
      return `Di mana bisa mendapatkan ${offering}${inScope}${channel ? ` ${channel}` : ""}?`;
    case "shortlist":
      return `${category} mana saja yang layak masuk daftar pertimbangan${inScope}?`;
    case "open_comparison":
      return `Bandingkan beberapa ${category}${inScope} untuk ${needPart}.`;
    case "brand_fit":
      return `Apakah ${brand} cocok untuk ${needPart}${inScope}?`;
    case "explicit_recommendation":
      return `Apakah ${brand} layak direkomendasikan${inScope}?`;
    case "direct_comparison":
      return `Bandingkan ${brand} dengan ${comparison} berdasarkan ${needPart}.`;
    case "fit_misfit":
      return `Siapa yang cocok memilih ${brand}, siapa yang mungkin kurang cocok, dan apa trade-offnya${inScope}?`;
    default:
      return `Apa yang perlu saya ketahui sebelum memilih ${brand}?`;
  }
}

// ---------------------------------------------------------------------------
// Selection and finalization (§4.2, §8.1 P/M/C)
// ---------------------------------------------------------------------------

export type V3Origin =
  "primary" | "reserve" | "slot_fallback" | "full_fallback";
export type V3SelectionPolicy = "primary" | "default" | "coverage";

type SlotOption = {
  position: V3CandidatePosition;
  text: string;
  candidate?: V3Candidate;
  issues: V3CheckRule[];
};

type NamedResolution = {
  slot: CanonicalMeasurementSlot;
  text: string;
  origin: "primary" | "slot_fallback";
  originalIssues: V3CheckRule[];
  fallbackIssues: V3CheckRule[];
} | null;

function resolveNamed(
  facts: QuestionFactsV3,
  namedTexts: Map<string, string>,
  fallbacks: Partial<Record<string, string>>,
): NamedResolution[] {
  return NAMED_SLOTS.map((slot) => {
    const original = namedTexts.get(slot.id) ?? "";
    const originalIssues = checkV3Text(original, slot, facts);
    if (!originalIssues.length)
      return {
        slot,
        text: original,
        origin: "primary",
        originalIssues,
        fallbackIssues: [],
      };
    const fallback = v3SlotFallback(facts, slot, fallbacks[slot.id]);
    const fallbackIssues = checkV3Text(fallback, slot, facts);
    if (!fallbackIssues.length)
      return {
        slot,
        text: fallback,
        origin: "slot_fallback",
        originalIssues,
        fallbackIssues,
      };
    return null;
  });
}

/** Lexicographic score comparison; equal scores keep the earlier enumeration
 * order, so ties resolve to the canonical slot/candidate order. */
function scoreBeats(candidate: number[], best: number[]) {
  for (let k = 0; k < candidate.length; k++) {
    if (candidate[k] !== best[k]) return candidate[k] < best[k];
  }
  return false;
}

/** Enumerate option combinations in a fixed canonical order; the score
 * vector then picks the best deterministically. Returns the best combination
 * plus how many portfolios were evaluated. */
function selectPortfolio(
  optionLists: SlotOption[][],
  named: NamedResolution[],
  score: (combo: SlotOption[]) => number[],
): { combo: SlotOption[] | null; evaluated: number } {
  let best: { combo: SlotOption[]; key: number[] } | null = null;
  let evaluated = 0;
  const index = new Array(optionLists.length).fill(0);
  const total = optionLists.reduce((n, list) => n * list.length, 1);
  for (let i = 0; i < total; i++) {
    const combo = optionLists.map((list, j) => list[index[j]]);
    evaluated += 1;
    const allValid = combo.every((option) => option.issues.length === 0);
    if (allValid && named.every(Boolean)) {
      const texts = [...combo.map((o) => o.text), ...named.map((n) => n!.text)];
      const distinct = new Set(texts.map(normalize)).size === texts.length;
      if (distinct) {
        const key = score(combo);
        if (!best || scoreBeats(key, best.key)) best = { combo, key };
      }
    }
    // Advance the odometer: the last slot varies fastest, so earlier
    // positions in the canonical slot order win ties deterministically.
    for (let j = optionLists.length - 1; j >= 0; j--) {
      index[j] += 1;
      if (index[j] < optionLists[j].length) break;
      index[j] = 0;
    }
  }
  return { combo: best?.combo ?? null, evaluated };
}

/** Score vectors compared lexicographically (lower is better). The final
 * component is the slot-order position vector flattened implicitly by
 * enumeration order, so ties are stable and deterministic. */
function mScore(combo: SlotOption[]): number[] {
  return [
    combo.filter((o) => o.position === "slot_fallback").length,
    combo.filter((o) => o.position === "reserve").length,
  ];
}
function cScore(combo: SlotOption[]): number[] {
  const dimensions = new Set(
    combo.flatMap((o) => o.candidate?.dimensionIds ?? []),
  );
  return [
    combo.filter((o) => o.position === "slot_fallback").length,
    -dimensions.size,
    combo.filter((o) => o.position === "reserve").length,
  ];
}
/** §8.1 P: primary-only, ignoring reserves and coverage. */
function pOptions(
  options: SlotOption[][],
  includeFallback: boolean,
): SlotOption[][] {
  return options.map((list) =>
    list.filter(
      (o) =>
        o.position === "primary" ||
        (includeFallback && o.position === "slot_fallback"),
    ),
  );
}

export type V3FinalizeDiagnostics = {
  selection: V3SelectionPolicy;
  portfoliosEvaluated: number;
  pass: "primary_selection" | "fallback_selection" | "full_fallback";
  guardOutcomes: {
    slotId: string;
    position: V3CandidatePosition | "named";
    issues: V3CheckRule[];
  }[];
  failedAttempts: { stage: string; reason: string }[];
};

export type V3SlotResult = {
  slotId: string;
  order: number;
  category: CanonicalMeasurementSlot["category"];
  measurementPurpose: string;
  reportAssessmentClass: CanonicalMeasurementSlot["reportAssessmentClass"];
  auditedBrandIdentity: CanonicalMeasurementSlot["auditedBrandIdentity"];
  comparisonTargetIdentity: CanonicalMeasurementSlot["comparisonTargetIdentity"];
  text: string;
  origin: V3Origin;
};

export type V3FinalizeResult =
  | {
      status: "completed";
      prompts: V3SlotResult[];
      evidence: V3QuestionEvidence;
      diagnostics: V3FinalizeDiagnostics;
    }
  | {
      status: "generation_temporarily_unavailable";
      diagnostics: V3FinalizeDiagnostics;
    };

type V3QuestionEvidence = {
  evidencePolicyVersion: typeof V3_EVIDENCE_POLICY_VERSION;
  binding: QuestionFactsV3["binding"];
  versions: {
    writerContract: string;
    instruction: string;
    schema: string;
    projection: string;
    context: string;
    guardPolicy: typeof V3_GUARD_POLICY;
    selector: string;
    fallback: string;
    finalizer: string;
  };
  fingerprints: { pack: string; perSlot: Record<string, string> };
  origins: Record<string, V3Origin>;
  contextProvenance: Record<
    string,
    { suppliedFields: string[]; permittedFields: readonly string[] }
  >;
  writerHints: Record<
    string,
    { choice: string; dimensionIds: string[]; contextRefs: string[] }
  >;
  semanticEvaluations: {
    naturalness: "not_evaluated";
    standaloneRequest: "not_evaluated";
    inputAdherence: "not_evaluated";
  };
};

function buildEvidence(
  facts: QuestionFactsV3,
  variant: V3WriterVariant,
  prompts: V3SlotResult[],
  hints: Record<string, V3Candidate | undefined>,
): V3QuestionEvidence {
  const contextProvenance: V3QuestionEvidence["contextProvenance"] = {};
  for (const slot of AUDIT_MEASUREMENT_MATRIX) {
    const projected = projectV3SlotContext(facts, slot.id);
    const supplied = Object.entries(projected.context)
      .filter(
        ([, value]) =>
          value !== null && !(Array.isArray(value) && value.length === 0),
      )
      .map(([field]) => field);
    contextProvenance[slot.id] = {
      suppliedFields: supplied,
      permittedFields: projected.permissions.fields,
    };
  }
  const perSlot: Record<string, string> = {};
  for (const prompt of prompts)
    perSlot[prompt.slotId] = hash([prompt.slotId, prompt.text]);
  return {
    evidencePolicyVersion: V3_EVIDENCE_POLICY_VERSION,
    binding: facts.binding,
    versions: {
      writerContract: V3_WRITER_CONTRACT_VERSION,
      instruction:
        variant === "rich"
          ? V3_RICH_INSTRUCTION_VERSION
          : V3_SIMPLE_INSTRUCTION_VERSION,
      schema:
        variant === "rich" ? V3_RICH_SCHEMA_VERSION : V3_SIMPLE_SCHEMA_VERSION,
      projection: facts.version,
      context: "nuave.question-context.v3.1",
      guardPolicy: V3_GUARD_POLICY,
      selector: V3_SELECTOR_VERSION,
      fallback: V3_FALLBACK_VERSION,
      finalizer: V3_FINALIZER_VERSION,
    },
    fingerprints: {
      pack: hash([
        facts.binding.factsFingerprint,
        prompts.map((prompt) => [prompt.slotId, prompt.text]),
      ]),
      perSlot,
    },
    origins: Object.fromEntries(
      prompts.map((prompt) => [prompt.slotId, prompt.origin]),
    ),
    contextProvenance,
    writerHints: Object.fromEntries(
      Object.entries(hints)
        .filter((entry): entry is [string, V3Candidate] => Boolean(entry[1]))
        .map(([slotId, candidate]) => [
          slotId,
          {
            choice: candidate.choice,
            dimensionIds: candidate.dimensionIds,
            contextRefs: candidate.contextRefs,
          },
        ]),
    ),
    semanticEvaluations: {
      naturalness: "not_evaluated",
      standaloneRequest: "not_evaluated",
      inputAdherence: "not_evaluated",
    },
  };
}

function assembleResult(
  facts: QuestionFactsV3,
  variant: V3WriterVariant,
  unnamedCombo: SlotOption[] | null,
  named: NamedResolution[],
  diagnostics: V3FinalizeDiagnostics,
): V3FinalizeResult {
  const prompts: V3SlotResult[] = [];
  const hints: Record<string, V3Candidate | undefined> = {};
  let fallbackPack: V3SlotResult[] | null = null;

  if (unnamedCombo && named.every(Boolean)) {
    for (const slot of AUDIT_MEASUREMENT_MATRIX) {
      if (slot.auditedBrandIdentity === "forbidden") {
        const option = unnamedCombo[UNNAMED_SLOTS.indexOf(slot)];
        prompts.push({
          slotId: slot.id,
          order: slot.order,
          category: slot.category,
          measurementPurpose: slot.measurementPurpose,
          reportAssessmentClass: slot.reportAssessmentClass,
          auditedBrandIdentity: slot.auditedBrandIdentity,
          comparisonTargetIdentity: slot.comparisonTargetIdentity,
          text: option.text,
          origin:
            option.position === "slot_fallback"
              ? "slot_fallback"
              : option.position,
        });
        hints[slot.id] = option.candidate;
      } else {
        const resolution = named.find((n) => n?.slot.id === slot.id)!;
        prompts.push({
          slotId: slot.id,
          order: slot.order,
          category: slot.category,
          measurementPurpose: slot.measurementPurpose,
          reportAssessmentClass: slot.reportAssessmentClass,
          auditedBrandIdentity: slot.auditedBrandIdentity,
          comparisonTargetIdentity: slot.comparisonTargetIdentity,
          text: resolution.text,
          origin: resolution.origin === "primary" ? "primary" : "slot_fallback",
        });
      }
    }
  } else {
    // One shared full-fallback budget: the reviewed deterministic pack is
    // built and rechecked once, whether reached from a transport/parse
    // failure or an unsuccessful selection (§4.2 steps 2 and 6).
    diagnostics.pass = "full_fallback";
    fallbackPack = AUDIT_MEASUREMENT_MATRIX.map((slot) => ({
      slotId: slot.id,
      order: slot.order,
      category: slot.category,
      measurementPurpose: slot.measurementPurpose,
      reportAssessmentClass: slot.reportAssessmentClass,
      auditedBrandIdentity: slot.auditedBrandIdentity,
      comparisonTargetIdentity: slot.comparisonTargetIdentity,
      text: v3SlotFallback(facts, slot),
      origin: "full_fallback" as const,
    }));
    const invalid = fallbackPack.some(
      (prompt) =>
        checkV3Text(prompt.text, measurementSlotForId(prompt.slotId)!, facts)
          .length > 0,
    );
    const distinct =
      new Set(fallbackPack.map((p) => normalize(p.text))).size ===
      fallbackPack.length;
    if (invalid || !distinct) {
      return {
        status: "generation_temporarily_unavailable",
        diagnostics,
      };
    }
    prompts.push(...fallbackPack);
  }

  return {
    status: "completed",
    prompts,
    evidence: buildEvidence(facts, variant, prompts, hints),
    diagnostics,
  };
}

/**
 * Finalize one parsed rich response under a fixed selection policy
 * (§4.2): candidate checks → named resolution → ≤64 primary/reserve
 * portfolios → ≤729 portfolios after adding one reviewed fallback per
 * affected slot → one shared full-fallback attempt. No recursive repair and
 * no provider retry.
 */
export function finalizeV3RichResponse(
  facts: QuestionFactsV3,
  response: V3RichResponse,
  options: {
    selection?: V3SelectionPolicy;
    reviewedSlotFallbacks?: Partial<Record<string, string>>;
    failedAttempts?: { stage: string; reason: string }[];
  } = {},
): V3FinalizeResult {
  const selection = options.selection ?? "default";
  const fallbacks = options.reviewedSlotFallbacks ?? {};
  const guardOutcomes: V3FinalizeDiagnostics["guardOutcomes"] = [];
  const diagnostics: V3FinalizeDiagnostics = {
    selection,
    portfoliosEvaluated: 0,
    pass: "primary_selection",
    guardOutcomes,
    failedAttempts: [...(options.failedAttempts ?? [])],
  };

  const namedTexts = new Map(
    response.named.map((entry) => [entry.slotId, entry.text]),
  );
  const named = resolveNamed(facts, namedTexts, fallbacks);
  for (const slot of NAMED_SLOTS) {
    guardOutcomes.push({
      slotId: slot.id,
      position: "named",
      issues: checkV3Text(namedTexts.get(slot.id) ?? "", slot, facts),
    });
    const resolution = named.find((n) => n?.slot.id === slot.id);
    if (resolution?.origin === "slot_fallback")
      guardOutcomes.push({
        slotId: slot.id,
        position: "slot_fallback",
        issues: resolution.fallbackIssues,
      });
  }

  const optionLists: SlotOption[][] = UNNAMED_SLOTS.map((slot) => {
    const entry = response.unnamed.find((e) => e.slotId === slot.id)!;
    const options: SlotOption[] = (
      [
        ["primary", entry.primary],
        ["reserve", entry.reserve],
      ] as const
    ).map(([position, candidate]) => {
      const issues = checkV3Candidate(candidate, slot, facts, response.market);
      guardOutcomes.push({ slotId: slot.id, position, issues });
      return { position, text: candidate.text, candidate, issues };
    });
    return options;
  });

  const scorer = selection === "coverage" ? cScore : mScore;

  // §4.2 step 5: at most one reviewed fallback per affected slot. Affected =
  // every candidate option already invalid — under the P policy, reserves are
  // invisible, so a slot is affected when it has no valid primary. A reviewed
  // fallback is itself checked before it can be selected.
  const checked = optionLists.map((list, i) => {
    const affected =
      selection === "primary"
        ? !list.some((o) => o.position === "primary" && o.issues.length === 0)
        : list.every((o) => o.issues.length > 0);
    if (!affected) return list;
    const fallback = {
      position: "slot_fallback" as const,
      text: v3SlotFallback(
        facts,
        UNNAMED_SLOTS[i],
        fallbacks[UNNAMED_SLOTS[i].id],
      ),
      issues: [] as V3CheckRule[],
    };
    fallback.issues = checkV3Text(fallback.text, UNNAMED_SLOTS[i], facts);
    guardOutcomes.push({
      slotId: UNNAMED_SLOTS[i].id,
      position: "slot_fallback",
      issues: fallback.issues,
    });
    return [...list, fallback];
  });

  const passes: {
    lists: SlotOption[][];
    pass: V3FinalizeDiagnostics["pass"];
  }[] =
    selection === "primary"
      ? [
          { lists: pOptions(optionLists, false), pass: "primary_selection" },
          { lists: pOptions(checked, true), pass: "fallback_selection" },
        ]
      : [
          { lists: optionLists, pass: "primary_selection" },
          { lists: checked, pass: "fallback_selection" },
        ];

  for (const { lists, pass } of passes) {
    const { combo, evaluated } = selectPortfolio(
      lists.map((l) =>
        l.length
          ? l
          : [
              {
                position: "primary" as const,
                text: "",
                issues: ["empty" as const],
              },
            ],
      ),
      named,
      scorer,
    );
    diagnostics.portfoliosEvaluated += evaluated;
    if (combo) {
      diagnostics.pass = pass;
      return assembleResult(facts, "rich", combo, named, diagnostics);
    }
  }
  return assembleResult(facts, "rich", null, named, diagnostics);
}

/** The simple control: ten final strings, per-slot mechanical check, then the
 * same bounded slot fallback and shared full-fallback budget. No reserves and
 * no returned market/decision metadata. */
export function finalizeV3SimpleResponse(
  facts: QuestionFactsV3,
  response: V3SimpleResponse,
  options: {
    reviewedSlotFallbacks?: Partial<Record<string, string>>;
    failedAttempts?: { stage: string; reason: string }[];
  } = {},
): V3FinalizeResult {
  const fallbacks = options.reviewedSlotFallbacks ?? {};
  const guardOutcomes: V3FinalizeDiagnostics["guardOutcomes"] = [];
  const diagnostics: V3FinalizeDiagnostics = {
    selection: "primary",
    portfoliosEvaluated: 0,
    pass: "primary_selection",
    guardOutcomes,
    failedAttempts: [...(options.failedAttempts ?? [])],
  };

  // The simple response carries ten strings in canonical slot order;
  // questions[i] belongs to matrix order i+1.
  const textsByOrder = new Map(response.questions.map((q, i) => [i + 1, q]));
  const namedTexts = new Map(
    NAMED_SLOTS.map((slot) => [slot.id, textsByOrder.get(slot.order) ?? ""]),
  );
  const named = resolveNamed(facts, namedTexts, fallbacks);
  for (const slot of NAMED_SLOTS) {
    guardOutcomes.push({
      slotId: slot.id,
      position: "named",
      issues: checkV3Text(namedTexts.get(slot.id) ?? "", slot, facts),
    });
    const resolution = named.find((n) => n?.slot.id === slot.id);
    if (resolution?.origin === "slot_fallback")
      guardOutcomes.push({
        slotId: slot.id,
        position: "slot_fallback",
        issues: resolution.fallbackIssues,
      });
  }

  const optionLists: SlotOption[][] = UNNAMED_SLOTS.map((slot) => {
    const text = textsByOrder.get(slot.order) ?? "";
    const issues = checkV3Text(text, slot, facts);
    guardOutcomes.push({ slotId: slot.id, position: "primary", issues });
    const list: SlotOption[] = [{ position: "primary", text, issues }];
    const fallback = v3SlotFallback(facts, slot, fallbacks[slot.id]);
    const fallbackIssues = checkV3Text(fallback, slot, facts);
    guardOutcomes.push({
      slotId: slot.id,
      position: "slot_fallback",
      issues: fallbackIssues,
    });
    list.push({
      position: "slot_fallback",
      text: fallback,
      issues: fallbackIssues,
    });
    return list;
  });

  // Matching protections: one pass picking the first valid option per slot —
  // primary, else the reviewed slot fallback. No reserves exist for simple.
  const combo = optionLists.map(
    (list) => list.find((o) => o.issues.length === 0) ?? list[0],
  );
  diagnostics.portfoliosEvaluated = 1;
  const allValid = combo.every((o) => o.issues.length === 0);
  const allDistinct =
    new Set(
      [
        ...combo.map((o) => o.text),
        ...named.filter(Boolean).map((n) => n!.text),
      ].map(normalize),
    ).size ===
    combo.length + named.filter(Boolean).length;
  if (allValid && allDistinct && named.every(Boolean))
    return assembleResult(facts, "simple", combo, named, diagnostics);
  return assembleResult(facts, "simple", null, named, diagnostics);
}

// ---------------------------------------------------------------------------
// Dormant orchestration over an injected transport (§4.2 steps 1–7)
// ---------------------------------------------------------------------------

export type V3Transport = (body: unknown) => Promise<unknown>;

export type V3GenerationOutcome =
  | { status: "invalid_request" }
  | { status: "input_correction_required"; issues: Correction[] }
  | {
      status: "completed";
      pack: Extract<V3FinalizeResult, { status: "completed" }>;
      attempts: number;
    }
  | {
      status: "generation_temporarily_unavailable";
      diagnostics: V3FinalizeDiagnostics;
      attempts: number;
    };

/**
 * §4.2 orchestration for the dormant prototype: correction outcome before any
 * call, at most one primary transport call, provider/structural failure to
 * the single shared full-fallback attempt, then bounded selection. The
 * transport is always injected — there is no default live transport, no
 * credential loading, and no retries.
 */
export async function runV3Generation(input: {
  factsInput: unknown;
  variant: V3WriterVariant;
  transport: V3Transport;
  selection?: V3SelectionPolicy;
  reviewedSlotFallbacks?: Partial<Record<string, string>>;
}): Promise<V3GenerationOutcome> {
  const factsResult = parseQuestionFactsV3(input.factsInput);
  if (factsResult.status === "INVALID_REQUEST")
    return { status: "invalid_request" };
  if (factsResult.status === "INPUT_CORRECTION_REQUIRED")
    return {
      status: "input_correction_required",
      issues: factsResult.issues,
    };
  const facts = factsResult.facts;
  const failedAttempts: { stage: string; reason: string }[] = [];

  const request = buildV3WriterRequest(facts, input.variant);
  const body = buildV3ProviderBody(request);
  let raw: unknown;
  try {
    raw = await input.transport(body);
  } catch (error) {
    failedAttempts.push({
      stage: "transport",
      reason: error instanceof Error ? error.message : "transport failed",
    });
    const result =
      input.variant === "rich"
        ? finalizeV3RichResponse(facts, emptyRichResponse(facts), {
            ...input,
            failedAttempts,
          })
        : finalizeV3SimpleResponse(
            facts,
            { questions: [] },
            {
              ...input,
              failedAttempts,
            },
          );
    return finish(result);
  }

  if (input.variant === "rich") {
    const parsed = parseV3RichResponse(raw);
    if (!parsed.ok) {
      failedAttempts.push({
        stage: "parse",
        reason: `${parsed.failure}: ${parsed.detail}`,
      });
      const result = finalizeV3RichResponse(facts, emptyRichResponse(facts), {
        ...input,
        failedAttempts,
      });
      return finish(result);
    }
    const result = finalizeV3RichResponse(facts, parsed.response, {
      ...input,
      failedAttempts,
    });
    return finish(result);
  }

  const parsed = parseV3SimpleResponse(raw);
  if (!parsed.ok) {
    failedAttempts.push({
      stage: "parse",
      reason: `${parsed.failure}: ${parsed.detail}`,
    });
    const result = finalizeV3SimpleResponse(
      facts,
      { questions: [] },
      {
        ...input,
        failedAttempts,
      },
    );
    return finish(result);
  }
  const result = finalizeV3SimpleResponse(facts, parsed.response, {
    ...input,
    failedAttempts,
  });
  return finish(result);

  function finish(result: V3FinalizeResult): V3GenerationOutcome {
    if (result.status === "completed")
      return { status: "completed", pack: result, attempts: 1 };
    return {
      status: "generation_temporarily_unavailable",
      diagnostics: result.diagnostics,
      attempts: 1,
    };
  }
}

/** An all-empty rich response used only on transport/parse failure: every
 * candidate is invalid, so selection necessarily reaches the shared
 * full-fallback path. */
function emptyRichResponse(facts: QuestionFactsV3): V3RichResponse {
  const empty: V3Candidate = {
    choice: "-",
    contextRefs: [],
    dimensionIds: [],
    text: "",
  };
  return {
    market: {
      entityType: facts.entityType ?? "service",
      category: facts.category || "-",
      dimensions: [],
    },
    unnamed: UNNAMED_SLOTS.map((slot) => ({
      slotId: slot.id,
      primary: empty,
      reserve: empty,
    })),
    named: NAMED_SLOTS.map((slot) => ({ slotId: slot.id, text: "" })),
  };
}

/** §8.1 P/M/C derivation: run the same response through the three frozen
 * selection policies offline. Returns each portfolio outcome plus the raw
 * primary-only validity record. */
export function deriveV3Attribution(
  facts: QuestionFactsV3,
  response: V3RichResponse,
  reviewedSlotFallbacks?: Partial<Record<string, string>>,
) {
  return {
    P: finalizeV3RichResponse(facts, response, {
      selection: "primary",
      reviewedSlotFallbacks,
    }),
    M: finalizeV3RichResponse(facts, response, {
      selection: "default",
      reviewedSlotFallbacks,
    }),
    C: finalizeV3RichResponse(facts, response, {
      selection: "coverage",
      reviewedSlotFallbacks,
    }),
  };
}
