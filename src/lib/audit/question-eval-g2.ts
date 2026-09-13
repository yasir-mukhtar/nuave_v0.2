/** Dormant Spec 008 R5 G2 frozen evaluation packet and decision policy (§8).
 * No runtime consumer: no route, UI, storage, or live provider dispatch
 * imports this module. Every limit, threshold, rubric rule, and selection
 * rule needed by a future separately authorized G2P pilot and G6 release
 * comparison is frozen here so neither needs invented parameters. Nothing
 * in this file authorizes a provider call, a merge, or production
 * activation. */
import { createHash } from "node:crypto";
import { AUDIT_MEASUREMENT_MATRIX } from "./measurement-matrix";
import {
  V3_PROPOSED_EVALUATION_SETTINGS,
  type V3RequestSettings,
} from "./question-writer-v3";
import {
  V3_FALLBACK_VERSION,
  V3_SELECTOR_VERSION,
} from "./question-finalize-v3";

export const G2_EVAL_PACKET_VERSION = "nuave.g2-evaluation-packet.v2";
export const G2_DECISION_POLICY_VERSION = "nuave.g2-decision-policy.v2";
export const G2_RUBRIC_VERSION = "nuave.g2-review-rubric.v2";
export const G2_FROZEN_INPUTS_VERSION = "nuave.g2-frozen-inputs.v1";
export const G2_USAGE_ACCOUNTING_VERSION = "nuave.g2-usage-accounting.v1";

const UNNAMED_SLOT_IDS = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) => slot.auditedBrandIdentity === "forbidden",
).map((slot) => slot.id);
const NAMED_SLOT_IDS = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) => slot.auditedBrandIdentity === "required",
).map((slot) => slot.id);
const CANONICAL_SLOT_IDS = [...UNNAMED_SLOT_IDS, ...NAMED_SLOT_IDS];
const EPS = 1e-9;

// ---------------------------------------------------------------------------
// §8.1 — G2P pilot: four sufficient businesses + preselected AC repeat,
// five rich + five new simple-control attempts, at most ten primary calls.
//
// The four pilot inputs intentionally reuse development-set envelopes
// (D1/D3/D5/D8): pilot/tuning evidence is development evidence. Held-out
// inputs H1–H4 are never used for pilot or tuning output.
// ---------------------------------------------------------------------------

export const G2_PILOT_INPUTS = [
  {
    inputId: "G2P-AC",
    businessKey: "pilot-ac",
    brief: "local AC service with approved home visits",
    /** Intentional pilot/development overlap: the pilot AC envelope is D1's. */
    developmentInputId: "D1",
    scheduledRepeat: true,
  },
  {
    inputId: "G2P-RETAIL",
    businessKey: "pilot-laptop-retail",
    brief: "multi-brand laptop retailer",
    developmentInputId: "D3",
    scheduledRepeat: false,
  },
  {
    inputId: "G2P-B2B",
    businessKey: "pilot-b2b-saas",
    brief: "B2B SaaS",
    developmentInputId: "D5",
    scheduledRepeat: false,
  },
  {
    inputId: "G2P-SPARSE",
    businessKey: "pilot-sparse-product",
    brief: "sparse sufficient consumer-product scope",
    developmentInputId: "D8",
    scheduledRepeat: false,
  },
] as const;

export type G2ScheduledAttempt = {
  inputId: string;
  variant: "rich" | "simple" | "v2";
  pass: 1 | 2;
};

/** Predeclared interleaved order (reduces temporal provider effects): per
 * input, rich then simple, inputs in listed order, the AC repeat pair after
 * all first passes. 5 rich + 5 simple = 10 scheduled primary calls; a
 * structurally invalid pack is the recorded outcome — there is no rerun
 * headroom. */
export const G2_PILOT_SCHEDULE: {
  attempts: G2ScheduledAttempt[];
  maxPrimaryCalls: number;
} = {
  attempts: [
    { inputId: "G2P-AC", variant: "rich", pass: 1 },
    { inputId: "G2P-AC", variant: "simple", pass: 1 },
    { inputId: "G2P-RETAIL", variant: "rich", pass: 1 },
    { inputId: "G2P-RETAIL", variant: "simple", pass: 1 },
    { inputId: "G2P-B2B", variant: "rich", pass: 1 },
    { inputId: "G2P-B2B", variant: "simple", pass: 1 },
    { inputId: "G2P-SPARSE", variant: "rich", pass: 1 },
    { inputId: "G2P-SPARSE", variant: "simple", pass: 1 },
    { inputId: "G2P-AC", variant: "rich", pass: 2 },
    { inputId: "G2P-AC", variant: "simple", pass: 2 },
  ],
  maxPrimaryCalls: 10,
};

// ---------------------------------------------------------------------------
// §8.2 — G6 release allocation: D1–D8 development + H1–H4 held out,
// repeats D1/D3/D5/H1 chosen before output, ≤32 new primary calls.
// ---------------------------------------------------------------------------

export const G2_RELEASE_INPUTS = {
  development: [
    { inputId: "D1", brief: "local AC" },
    { inputId: "D2", brief: "venue/café" },
    { inputId: "D3", brief: "multi-brand retail" },
    { inputId: "D4", brief: "consumer product/brand" },
    { inputId: "D5", brief: "B2B/SaaS" },
    { inputId: "D6", brief: "professional service" },
    { inputId: "D7", brief: "safe regulated discovery" },
    { inputId: "D8", brief: "sparse sufficient scope" },
  ],
  heldOut: [
    { inputId: "H1", brief: "one location of a multi-location service" },
    { inputId: "H2", brief: "retail with limited fulfilment/reach" },
    { inputId: "H3", brief: "remote B2B/professional" },
    { inputId: "H4", brief: "different regulated category, sparse facts" },
  ],
  /** Chosen before any output: second attempts for D1, D3, D5, H1. */
  repeats: ["D1", "D3", "D5", "H1"],
} as const;

const ALL_RELEASE_INPUTS = [
  ...G2_RELEASE_INPUTS.development.map((i) => i.inputId),
  ...G2_RELEASE_INPUTS.heldOut.map((i) => i.inputId),
];

/** Exact §8.2 call allocation and interleaved request order for either
 * approved production-contract outcome. Prior captures replace scheduled
 * calls only on exact input/provider/settings/instruction/schema/request-
 * version matches with a complete attempt history; previously viewed
 * captures never replace fresh held-out evidence. */
export const G2_RELEASE_SCHEDULES = {
  richSelected: {
    attempts: [
      ...ALL_RELEASE_INPUTS.flatMap((inputId): G2ScheduledAttempt[] => {
        const heldOut = inputId.startsWith("H");
        return heldOut
          ? [
              { inputId, variant: "rich", pass: 1 },
              { inputId, variant: "simple", pass: 1 },
            ]
          : [
              { inputId, variant: "rich", pass: 1 },
              { inputId, variant: "v2", pass: 1 },
            ];
      }),
      ...["D1", "D3", "D5"].flatMap((inputId): G2ScheduledAttempt[] => [
        { inputId, variant: "rich", pass: 2 },
        { inputId, variant: "v2", pass: 2 },
      ]),
      { inputId: "H1", variant: "rich", pass: 2 },
      { inputId: "H1", variant: "simple", pass: 2 },
    ],
    counts: { selectedV3: 16, actualV2: 11, newSimpleControl: 5 },
    maxNewPrimaryCalls: 32,
  },
  simpleSelectedByAmendment: {
    attempts: [
      ...ALL_RELEASE_INPUTS.flatMap((inputId): G2ScheduledAttempt[] => [
        { inputId, variant: "simple", pass: 1 },
        { inputId, variant: "v2", pass: 1 },
      ]),
      ...["D1", "D3", "D5", "H1"].flatMap((inputId): G2ScheduledAttempt[] => [
        { inputId, variant: "simple", pass: 2 },
        { inputId, variant: "v2", pass: 2 },
      ]),
    ],
    counts: { selectedV3: 16, actualV2: 16, newSimpleControl: 0 },
    maxNewPrimaryCalls: 32,
  },
} as const;

// ---------------------------------------------------------------------------
// Frozen executable inputs (F4): the committed fixture carries the exact
// fictional sufficient-facts envelopes; attempts bind to envelope hashes.
// ---------------------------------------------------------------------------

export const G2_FROZEN_INPUT_MANIFEST = {
  version: G2_FROZEN_INPUTS_VERSION,
  fixturePath: "src/lib/audit/fixtures/g2-evaluation-inputs.json",
  inputs: [
    { inputId: "D1", businessKey: "dev-ac-service", set: "development" },
    { inputId: "D2", businessKey: "dev-coffee-venue", set: "development" },
    { inputId: "D3", businessKey: "dev-laptop-retail", set: "development" },
    { inputId: "D4", businessKey: "dev-product-brand", set: "development" },
    { inputId: "D5", businessKey: "dev-b2b-saas", set: "development" },
    { inputId: "D6", businessKey: "dev-professional", set: "development" },
    { inputId: "D7", businessKey: "dev-regulated-dental", set: "development" },
    { inputId: "D8", businessKey: "dev-sparse-product", set: "development" },
    { inputId: "H1", businessKey: "heldout-branch-service", set: "held_out" },
    { inputId: "H2", businessKey: "heldout-limited-retail", set: "held_out" },
    { inputId: "H3", businessKey: "heldout-remote-pro", set: "held_out" },
    { inputId: "H4", businessKey: "heldout-regulated-sparse", set: "held_out" },
    // Pilot inputs intentionally reuse development envelopes; their business
    // keys stay pilot-scoped so pilot wins never count as development wins.
    { inputId: "G2P-AC", businessKey: "pilot-ac", set: "pilot" },
    { inputId: "G2P-RETAIL", businessKey: "pilot-laptop-retail", set: "pilot" },
    { inputId: "G2P-B2B", businessKey: "pilot-b2b-saas", set: "pilot" },
    {
      inputId: "G2P-SPARSE",
      businessKey: "pilot-sparse-product",
      set: "pilot",
    },
  ],
  /** Pilot inputId → the development envelope it reuses. */
  pilotEnvelopeAliases: {
    "G2P-AC": "D1",
    "G2P-RETAIL": "D3",
    "G2P-B2B": "D5",
    "G2P-SPARSE": "D8",
  },
} as const;

/** SHA-256 over the canonical JSON of one frozen envelope — the value an
 * attempt record must carry as `inputFingerprint`. */
export function g2EnvelopeFingerprint(envelope: unknown): string {
  return createHash("sha256").update(JSON.stringify(envelope)).digest("hex");
}

// ---------------------------------------------------------------------------
// Provider/settings, limits, and usage-accounting ceilings (proposed; not a
// grant to spend). §B.4/§B.5: preserve OpenCode Go + gpt-5.6-luna + low
// reasoning + no search; equal rich/simple caps.
// ---------------------------------------------------------------------------

export const G2_EVALUATION_SETTINGS: V3RequestSettings =
  V3_PROPOSED_EVALUATION_SETTINGS;

/**
 * Usage-accounting rates for the frozen evaluation, observed 2026-09-13 from
 * the official OpenCode Go usage-limits documentation
 * (https://opencode.ai/v2/docs/console/go), GPT 5.6 Luna ≤272K-token tier:
 * $0.20/1M input, $0.02/1M cached-read, $0.25/1M cached-write, $1.20/1M
 * output. These are subscription usage-allowance dollars, not cash spend —
 * Go accounts bill a fixed subscription and these values measure allowance
 * consumption; any balance-fallback spending is an account setting this
 * packet neither infers nor changes.
 */
export const G2_USAGE_ACCOUNTING = {
  version: G2_USAGE_ACCOUNTING_VERSION,
  basis:
    "subscription usage-allowance accounting under OpenCode Go, not cash spend; balance fallback is an account setting neither inferred nor changed here",
  rateSource:
    "https://opencode.ai/v2/docs/console/go — Usage limits table, observed 2026-09-13",
  observedAt: "2026-09-13",
  model: "gpt-5.6-luna",
  contextTier: "≤272K tokens",
  inputUsdPer1MTokens: 0.2,
  cachedReadUsdPer1MTokens: 0.02,
  cachedWriteUsdPer1MTokens: 0.25,
  outputUsdPer1MTokens: 1.2,
} as const;

/** Usage-accounted dollars for one attempt under the frozen accounting. */
export function g2UsageCostUsd(usage: {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}): number {
  return (
    (usage.inputTokens * G2_USAGE_ACCOUNTING.inputUsdPer1MTokens +
      usage.cachedInputTokens * G2_USAGE_ACCOUNTING.cachedReadUsdPer1MTokens +
      usage.outputTokens * G2_USAGE_ACCOUNTING.outputUsdPer1MTokens) /
    1_000_000
  );
}

/** Frozen numerical limits. Token ceilings are exact; USD ceilings are
 * usage-allowance bounds derived from the frozen input-token bound and the
 * dated rate source above. Input bound: the complete serialized request
 * (instruction + projected writer context + schema) for the largest frozen
 * input measures well under 28,000 characters; a conservative 2.5
 * chars/token bound gives ≤11,200 tokens — frozen at 12,000. Per-attempt
 * usage bound: 12,000×$0.20 + 4,096×$1.20 per 1M ≈ $0.0073 → a $0.02 ceiling
 * leaves ≈2.7× headroom. */
export const G2_RESOURCE_LIMITS = {
  perAttemptMaxOutputTokens: 4096,
  perAttemptTimeoutMs: 60_000,
  maxSerializedRequestChars: 28_000,
  maxEstimatedInputTokens: 12_000,
  perAttemptUsageCeilingUsd: 0.02,
  pilotTotalUsageCeilingUsd: 0.2,
  releaseNewCallsUsageCeilingUsd: 0.64,
  meanLatencyCeilingMs: 30_000,
  p95LatencyCeilingMs: 60_000,
  /** Maximum permitted incremental mean for rich versus simple. */
  richVsSimpleMaxCostRatio: 2.0,
  richVsSimpleMaxLatencyRatio: 1.5,
  automaticRetries: 0,
  concurrency: 1,
  liveCustomerDispatch: "none — all evaluation traffic is offline/held-out",
} as const;

/** Timeout/retry/sampling/session ownership pins so a later operator does not
 * invent them. These declare the evaluation contract only — the constants do
 * not themselves enforce transport behavior. */
export const G2_TRANSPORT_OWNERSHIP = {
  timeout:
    "the evaluation transport owns the 60s AbortSignal; the constant is a budget declaration, not transport enforcement",
  retries:
    "no SDK/transport retries; a failed attempt is the recorded outcome, manual re-attempt is a new scheduled attempt",
  sampling:
    "temperature/top_p are omitted from the request; provider defaults apply",
  sessionHeaders: "Authorization bearer only; no session-affinity headers",
} as const;

/** The one global rich selection policy supplying Decision A (R5 §4.2).
 * P/M/C attribution is derived for evidence only — never a per-business
 * selector choice. */
export const G2_SELECTION_POLICY = "default" as const;

// ---------------------------------------------------------------------------
// Blinded review procedure, rubric, and usable-pack definition (§8.4 rules)
// ---------------------------------------------------------------------------

export const G2_BLINDING = {
  unit: "one input; two anonymized packs labeled A and B",
  assignment:
    "per-input coin flip by the evaluation operator before any review begins; the implementer never judges final quality",
  reviewerSees:
    "the confirmed business projection (the same writer-context projection both variants used) plus ten texts per pack",
  reviewerNeverSees:
    "variant labels, request/response metadata, market dimensions, contextRefs, guard outcomes, costs, or latency",
  independence:
    "reviewer identity is blinded from variant identity; writer hints (choice/dimensionIds/contextRefs) stay separate from independent text judgments",
  sequencing:
    "the independent reviewer judges every §2.1 property and the naturalness score for each text before any pack-level preference; the founder adjudicates disagreements",
  scale: [0, 1, 2, 3] as const,
} as const;

export const G2_NATURALNESS_SCALE = {
  0: "implausible — no real consumer would write this",
  1: "needs rewriting — meaning recoverable but phrasing fails",
  2: "plausible with minor issues — usable after light editing",
  3: "natural and clear — ships as written",
} as const;

/** The independent §2.1 judgments required for every unnamed text (F2). Each
 * is a separate decision recorded against the exact text. */
export const G2_UNNAMED_PROPERTY_JUDGMENTS = [
  "commercialChoice",
  "entityDemand",
  "roleScopeFit",
  "fairOpenness",
  "singleUnderstandableRequest",
  "criteriaDiscipline",
] as const;

export const G2_RUBRIC_RULES = {
  naturalnessPerText:
    "score every text 0-3 on the naturalness scale; judge the text as written",
  commercialChoice:
    "the text expresses a plausible commercial choice — find, choose, buy, hire, visit, obtain, shortlist, or compare something entities compete to provide",
  entityDemand:
    "a satisfactory answer needs concrete relevant entities; generic advice with optional business examples fails",
  roleScopeFit:
    "the text matches the confirmed competitive role and offering scope — the correct answer level (brands of a product, clinics for a service), not a wrong-level entity class",
  fairOpenness:
    "an ordinary suitable peer could satisfy the request; no audited-business fingerprint (exact prices, slogans, proprietary features, unnecessary location precision)",
  singleUnderstandableRequest:
    "one independently understandable plausible Indonesian question or direct request; terminal punctuation is not required",
  criteriaDiscipline:
    "zero to three material criteria (normally one to three); no personas, corporate phrasing, or paraphrase stuffing",
  inputAdherencePerText:
    "flag each text that contradicts or invents beyond the confirmed projection shown to the reviewer",
  terminalMarkNotRequired:
    "a question mark is not required; an equivalent direct request scores identically to its interrogative form",
  implicitOpportunity:
    "count unnamed texts whose satisfying answer would implicitly name or shortlist businesses — the recommendation opportunity exists without needing an explicit recommendation formula",
  namedPurposes:
    "each named text preserves its measurement purpose (brand fit, direct recommendation, direct comparison, fit/misfit) with the required identity",
  packPreference:
    "after all per-text judgments, record one judgment: A better, B better, or indistinguishable",
  distinctDecisions:
    "record the count of materially distinct consumer decisions among the six unnamed texts",
  /** Frozen labelled examples distinguishing a material gain from a
   * label-only change. Synthetic: these define the rule, not evidence. */
  materialGainExample:
    "C changes 'Kedai kopi mana yang cocok?' into 'Saat perlu tempat rapat santai, kedai kopi mana yang bisa dipesan mendadak?' — a materially different consumer decision on a mechanically valid M text",
  labelOnlyExample:
    "C attaches a different dimension label or dimensionId to the same final wording as M — a metadata-only change that earns no credit",
} as const;

export const G2_USABLE_PACK = {
  mechanical:
    "all ten texts pass the compatible-008 mechanical checks and occupy the canonical slots/purposes",
  unnamedProperties: G2_UNNAMED_PROPERTY_JUDGMENTS,
  distinctDecisionsMin: 6,
  naturalnessMinPerText: 2,
  namedPurposeIntact: true,
  implicitRecommendationMin: 1,
  /** Fallback texts may be used inside a usable pack; a fallback never
   * counts as successful serialization (writer contribution is scored
   * separately), and missing packs score all texts zero. */
  serializationSeparateFromUsability: true,
} as const;

export const G2_THRESHOLDS = {
  /** §8.1 Decision A. */
  pilotSerializationCompleteMin: 5,
  pilotUsablePacksMin: 5,
  pilotMaterialWinBusinessesMin: 2,
  /** §8.2 held-out retention. */
  heldOutMaterialWinBusinessesMin: 2,
  materialWinDeltaMin: 0.5,
  /** §8.2 writer contribution. */
  releaseStructurallyCompleteMin: 15,
  releaseModelWrittenUnnamedMinPerPack: 5,
  releaseModelWrittenPacksMin: 14,
  releaseFullFallbackMax: 2,
  /** Blinded preference, pooled over both-usable inputs: strictly more rich. */
  preferenceMargin: "strict",
} as const;

// ---------------------------------------------------------------------------
// Evaluation records (F2)
// ---------------------------------------------------------------------------

export type G2AttemptStatus =
  | "completed"
  | "generation_temporarily_unavailable"
  | "input_correction_required"
  | "invalid_request";

/** The independent per-text judgment record. Every unnamed text carries the
 * six §2.1 property decisions plus naturalness; named texts carry
 * naturalness, adherence, purpose, and flag records. */
export type G2TextJudgment = {
  slotId: string;
  /** SHA-256 of the exact final text — binds the judgment to the text. */
  textFingerprint: string;
  naturalness: number;
  /** §2.1 properties — required on unnamed texts, recorded on all texts. */
  commercialChoice: boolean;
  entityDemand: boolean;
  roleScopeFit: boolean;
  fairOpenness: boolean;
  singleUnderstandableRequest: boolean;
  criteriaDiscipline: boolean;
  adheresInput: boolean;
  /** The selected text carried a flagged safety/privacy/identity mechanical
   * issue — structurally impossible; recorded as a regression check. */
  selectedTextFlagged: boolean;
  /** True when the exact provider wording survived into the final pack
   * (harmless formatting aside); substituted or paraphrased repairs do not
   * qualify as model-written. */
  modelWritten: boolean;
};

/** One provider attempt's evaluation record. The first attempt on an input
 * is pass 1; a scheduled repeat is pass 2. Pilot/tuning inputs are never
 * held-out evidence. */
export type G2AttemptRecord = {
  inputId: string;
  /** Two attempts on one business share this key — they count once. */
  businessKey: string;
  set: "pilot" | "development" | "held_out";
  variant: "rich" | "simple" | "v2";
  pass: 1 | 2;
  status: G2AttemptStatus;
  /** Structured response parsed to the schema without truncation. Fallback
   * or missing packs are not serialization successes. */
  serializationComplete: boolean;
  /** The whole final pack arrived through the shared full-fallback budget. */
  fullFallback: boolean;
  /** SHA-256 of the frozen input envelope — binds the attempt to the exact
   * scheduled input. */
  inputFingerprint: string;
  /** Fingerprint of the projected facts used for this attempt. */
  factsFingerprint: string;
  /** SHA-256 of the final pack, when one exists. */
  packFingerprint: string | null;
  /** Per-text independent judgments; null when no final pack exists. */
  texts: G2TextJudgment[] | null;
  distinctUnnamedDecisions: number;
  /** Unnamed texts whose satisfying answer implicitly names businesses —
   * without needing an explicit recommendation formula. */
  implicitOpportunityWithoutFormula: number;
  namedPurposeIntact: boolean;
  /** Provider-reported usage. null only when nothing was ever sent; a sent
   * attempt that returned no telemetry fails resource accounting rather
   * than passing silently. */
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  } | null;
  /** Attempt latency including failures and timeouts; required for every
   * scheduled attempt that was attempted. */
  latencyMs: number | null;
};

/** §8.1 P/M/C attribution derived offline from each rich response, bound to
 * the exact attempt and the exact portfolio fingerprints it produced. One
 * global selection policy supplies Decision A; this is evidence, never a
 * per-business selector. */
export type G2Attribution = {
  inputId: string;
  businessKey: string;
  pass: 1 | 2;
  variant: "rich";
  /** Pack fingerprints for the P/M/C portfolios of this attempt. */
  packFingerprints: { P: string | null; M: string | null; C: string | null };
  /** Slots where P could not keep a valid primary but M kept original text
   * (mechanical rescue or avoided fallback). */
  pToMRescuedSlots: number;
  /** True when M's final text regressed versus P on any rescued slot. */
  mCausedFinalRegression: boolean;
  /** M produced a mechanically valid pack — the precondition for any
   * C-over-M wording/decision gain to count. */
  mMechanicallyValid: boolean;
  /** Independently reviewed material consumer-decision/wording gains of C
   * over a mechanically valid M. Label-only changes do not count. */
  cOverMMaterialGains: number;
  /** Reviewed C–M differences that were label-only; recorded so the
   * distinction is auditable, never credited. */
  cOverMLabelOnlyChanges: number;
  /** True when C regressed the final text versus M. */
  cCausedFinalRegression: boolean;
};

export type G2PreferenceRecord = {
  inputId: string;
  better: "rich" | "simple" | "indistinguishable";
};

// ---------------------------------------------------------------------------
// Record validation (F2)
// ---------------------------------------------------------------------------

const attemptKey = (a: { inputId: string; variant: string; pass: number }) =>
  `${a.inputId}:${a.variant}:${a.pass}`;

/** Validate one judgment list: exactly the ten canonical slot IDs in
 * canonical order, bounded integer scores, all required semantics present.
 * Unknown or malformed required judgments never pass. */
export function validateG2TextJudgments(
  texts: G2TextJudgment[] | null,
): string[] {
  const errors: string[] = [];
  if (texts === null) return errors; // missing pack is legal — scored zero
  if (!Array.isArray(texts) || texts.length !== CANONICAL_SLOT_IDS.length) {
    errors.push(
      `judgments must contain exactly ${CANONICAL_SLOT_IDS.length} texts, found ${texts?.length ?? "none"}`,
    );
    return errors;
  }
  texts.forEach((t, i) => {
    if (t.slotId !== CANONICAL_SLOT_IDS[i])
      errors.push(
        `judgment ${i} slotId "${t.slotId}" must be "${CANONICAL_SLOT_IDS[i]}" in canonical order`,
      );
    if (
      !Number.isInteger(t.naturalness) ||
      t.naturalness < 0 ||
      t.naturalness > 3
    )
      errors.push(`judgment ${t.slotId}: naturalness must be an integer 0-3`);
    if (typeof t.textFingerprint !== "string" || !t.textFingerprint)
      errors.push(`judgment ${t.slotId}: missing text fingerprint`);
    for (const flag of [
      "commercialChoice",
      "entityDemand",
      "roleScopeFit",
      "fairOpenness",
      "singleUnderstandableRequest",
      "criteriaDiscipline",
      "adheresInput",
      "selectedTextFlagged",
      "modelWritten",
    ] as const)
      if (typeof t[flag] !== "boolean")
        errors.push(`judgment ${t.slotId}: ${flag} must be a boolean`);
  });
  return errors;
}

/** Validate one attempt record's envelope semantics (bounds, fingerprints,
 * and judgment completeness). */
export function validateG2AttemptRecord(
  record: G2AttemptRecord,
  inputIndex: Record<string, { envelopeSha256: string }>,
): string[] {
  const errors = validateG2TextJudgments(record.texts);
  const manifestEntry = G2_FROZEN_INPUT_MANIFEST.inputs.find(
    (entry) => entry.inputId === record.inputId,
  );
  if (!manifestEntry)
    errors.push(`attempt ${attemptKey(record)} uses an unfrozen inputId`);
  else {
    if (record.businessKey !== manifestEntry.businessKey)
      errors.push(
        `attempt ${attemptKey(record)} businessKey "${record.businessKey}" mismatches the frozen "${manifestEntry.businessKey}"`,
      );
    if (record.set !== manifestEntry.set)
      errors.push(
        `attempt ${attemptKey(record)} set "${record.set}" mismatches the frozen "${manifestEntry.set}"`,
      );
  }
  const expected = inputIndex[record.inputId];
  if (!expected)
    errors.push(
      `attempt ${attemptKey(record)} has no frozen envelope to bind against`,
    );
  else if (record.inputFingerprint !== expected.envelopeSha256)
    errors.push(
      `attempt ${attemptKey(record)} inputFingerprint does not match the frozen envelope hash`,
    );
  if (typeof record.factsFingerprint !== "string" || !record.factsFingerprint)
    errors.push(`attempt ${attemptKey(record)} missing factsFingerprint`);
  if (
    record.status === "completed" &&
    (!record.packFingerprint || !record.texts)
  )
    errors.push(
      `completed attempt ${attemptKey(record)} must carry a pack fingerprint and text judgments`,
    );
  if (
    !Number.isInteger(record.distinctUnnamedDecisions) ||
    record.distinctUnnamedDecisions < 0 ||
    record.distinctUnnamedDecisions > 6
  )
    errors.push(
      `attempt ${attemptKey(record)} invalid distinctUnnamedDecisions`,
    );
  if (
    !Number.isInteger(record.implicitOpportunityWithoutFormula) ||
    record.implicitOpportunityWithoutFormula < 0 ||
    record.implicitOpportunityWithoutFormula > 6
  )
    errors.push(
      `attempt ${attemptKey(record)} invalid implicitOpportunityWithoutFormula`,
    );
  if (typeof record.namedPurposeIntact !== "boolean")
    errors.push(`attempt ${attemptKey(record)} invalid namedPurposeIntact`);
  if (
    record.latencyMs !== null &&
    (!Number.isFinite(record.latencyMs) || record.latencyMs < 0)
  )
    errors.push(`attempt ${attemptKey(record)} non-finite latencyMs`);
  if (record.usage !== null) {
    for (const key of [
      "inputTokens",
      "cachedInputTokens",
      "outputTokens",
    ] as const) {
      const value = record.usage[key];
      if (!Number.isFinite(value) || value < 0)
        errors.push(`attempt ${attemptKey(record)} non-finite usage.${key}`);
    }
  }
  return errors;
}

/** Reconcile evaluation records to the frozen input/variant/pass schedule:
 * exactly the expected set, no missing, duplicates, extras, or mismatched
 * business/set bindings (F2). */
export function validateG2AttemptSchedule(
  expected: readonly G2ScheduledAttempt[],
  records: G2AttemptRecord[],
  inputIndex: Record<string, { envelopeSha256: string }>,
): string[] {
  const errors: string[] = [];
  const seen = new Map<string, G2AttemptRecord>();
  for (const record of records) {
    const key = attemptKey(record);
    if (seen.has(key)) errors.push(`duplicate attempt record for ${key}`);
    else seen.set(key, record);
    errors.push(...validateG2AttemptRecord(record, inputIndex));
  }
  const expectedKeys = new Set(expected.map(attemptKey));
  for (const key of expectedKeys)
    if (!seen.has(key)) errors.push(`missing scheduled attempt ${key}`);
  for (const key of seen.keys())
    if (!expectedKeys.has(key))
      errors.push(`extra unscheduled attempt record ${key}`);
  return errors;
}

// ---------------------------------------------------------------------------
// Usability and comparison rule (F1)
// ---------------------------------------------------------------------------

/**
 * §8 usable pack: all structural/identity/slot/purpose/safety requirements
 * pass; every unnamed text satisfies §2.1; six materially distinct consumer
 * decisions; every text scores ≥2; named purposes intact; ≥1 implicit
 * recommendation opportunity (without an explicit recommendation formula).
 * A pack whose judgments are malformed or missing is not usable.
 */
export function attemptUsable(a: G2AttemptRecord): boolean {
  if (a.status !== "completed" || !a.texts) return false;
  if (validateG2TextJudgments(a.texts).length) return false;
  const unnamed = a.texts.slice(0, UNNAMED_SLOT_IDS.length);
  const named = a.texts.slice(UNNAMED_SLOT_IDS.length);
  return (
    a.namedPurposeIntact &&
    a.distinctUnnamedDecisions === 6 &&
    a.implicitOpportunityWithoutFormula >=
      G2_USABLE_PACK.implicitRecommendationMin &&
    unnamed.every(
      (t) =>
        t.naturalness >= G2_USABLE_PACK.naturalnessMinPerText &&
        t.commercialChoice &&
        t.entityDemand &&
        t.roleScopeFit &&
        t.fairOpenness &&
        t.singleUnderstandableRequest &&
        t.criteriaDiscipline &&
        t.adheresInput &&
        !t.selectedTextFlagged,
    ) &&
    named.every(
      (t) =>
        t.naturalness >= G2_USABLE_PACK.naturalnessMinPerText &&
        t.adheresInput &&
        !t.selectedTextFlagged,
    )
  );
}

/** Mean over the six unnamed naturalness scores only. A missing or
 * non-completed pack scores zero — there is no neutral mean. Named quality
 * belongs to pack usability and the separate all-ten v2 comparison; it can
 * never supply rich/simple wins. */
export function meanUnnamedNaturalness(a: G2AttemptRecord): number {
  if (a.status !== "completed" || !a.texts) return 0;
  const unnamed = a.texts.slice(0, UNNAMED_SLOT_IDS.length);
  if (unnamed.length !== UNNAMED_SLOT_IDS.length) return 0;
  return (
    unnamed.reduce((sum, t) => sum + t.naturalness, 0) / UNNAMED_SLOT_IDS.length
  );
}

/**
 * The frozen comparison rule for one matched attempt pair — the same frozen
 * input, the same pass. A material win requires a usable rich pack plus an
 * unusable simple pack, or an unnamed-naturalness advantage of at least 0.5
 * with all required properties intact. Any pair where the simple unnamed
 * mean exceeds the rich unnamed mean is a non-regression failure for that
 * business.
 */
export function compareMatchedAttempt(
  rich: G2AttemptRecord,
  simple: G2AttemptRecord,
): {
  richUnnamedMean: number;
  simpleUnnamedMean: number;
  delta: number;
  richUsable: boolean;
  simpleUsable: boolean;
  materialWin: boolean;
  regression: boolean;
} {
  const richMean = meanUnnamedNaturalness(rich);
  const simpleMean = meanUnnamedNaturalness(simple);
  const richUsable = attemptUsable(rich);
  const simpleUsable = attemptUsable(simple);
  const delta = richMean - simpleMean;
  return {
    richUnnamedMean: richMean,
    simpleUnnamedMean: simpleMean,
    delta,
    richUsable,
    simpleUsable,
    materialWin:
      richUsable &&
      (!simpleUsable || delta >= G2_THRESHOLDS.materialWinDeltaMin - EPS),
    regression: simpleMean > richMean + EPS,
  };
}

/** A business counts once: it wins when at least one of its scheduled
 * attempt pairs is a material win and no pair regresses. A repeat that
 * regresses prevents the business from counting at all. */
export function businessWins(
  businessKey: string,
  attempts: G2AttemptRecord[],
): { wins: boolean; pairs: ReturnType<typeof compareMatchedAttempt>[] } {
  const list = attempts.filter((a) => a.businessKey === businessKey);
  const passes = [...new Set(list.map((a) => a.pass))].sort();
  const pairs = passes
    .map((pass) => {
      const rich = list.find((a) => a.pass === pass && a.variant === "rich");
      const simple = list.find(
        (a) => a.pass === pass && a.variant === "simple",
      );
      return rich && simple ? compareMatchedAttempt(rich, simple) : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
  return {
    wins: pairs.some((p) => p.materialWin) && pairs.every((p) => !p.regression),
    pairs,
  };
}

// ---------------------------------------------------------------------------
// Resource accounting (F3): computed from complete attempt records —
// failures and timeouts included — never from optional unchecked summaries.
// ---------------------------------------------------------------------------

export type G2ResourceAssessment = {
  ok: boolean;
  failures: string[];
  metrics: {
    attempts: number;
    meanLatencyMs: number | null;
    p95LatencyMs: number | null;
    meanCostUsd: number | null;
    totalCostUsd: number | null;
    maxOutputTokens: number;
  };
};

/** Nearest-rank p95: sorted[ceil(0.95·n) − 1]. */
function nearestRankP95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(0.95 * sorted.length) - 1)];
}

/** Absolute limits over a set of attempts: per-attempt token/latency/usage
 * bounds, mean and nearest-rank-p95 latency, and the aggregate ceiling. */
export function assessG2AbsoluteResources(
  attempts: G2AttemptRecord[],
  totalUsageCeilingUsd: number,
): G2ResourceAssessment {
  const failures: string[] = [];
  const latencies: number[] = [];
  const costs: number[] = [];
  let maxOutputTokens = 0;
  attempts.forEach((a) => {
    const key = attemptKey(a);
    if (a.latencyMs === null || !Number.isFinite(a.latencyMs)) {
      failures.push(`attempt ${key} is missing required latency telemetry`);
    } else {
      latencies.push(a.latencyMs);
      if (a.latencyMs > G2_RESOURCE_LIMITS.perAttemptTimeoutMs)
        failures.push(
          `attempt ${key} latency ${a.latencyMs}ms exceeds the ${G2_RESOURCE_LIMITS.perAttemptTimeoutMs}ms timeout ceiling`,
        );
    }
    if (!a.usage) {
      failures.push(`attempt ${key} is missing required token telemetry`);
    } else {
      if (a.usage.outputTokens > G2_RESOURCE_LIMITS.perAttemptMaxOutputTokens)
        failures.push(
          `attempt ${key} output tokens ${a.usage.outputTokens} exceed the ${G2_RESOURCE_LIMITS.perAttemptMaxOutputTokens} cap`,
        );
      if (a.usage.inputTokens > G2_RESOURCE_LIMITS.maxEstimatedInputTokens)
        failures.push(
          `attempt ${key} input tokens ${a.usage.inputTokens} exceed the frozen ${G2_RESOURCE_LIMITS.maxEstimatedInputTokens} bound`,
        );
      const cost = g2UsageCostUsd(a.usage);
      costs.push(cost);
      maxOutputTokens = Math.max(maxOutputTokens, a.usage.outputTokens);
      if (cost > G2_RESOURCE_LIMITS.perAttemptUsageCeilingUsd)
        failures.push(
          `attempt ${key} usage $${cost.toFixed(4)} exceeds the $${G2_RESOURCE_LIMITS.perAttemptUsageCeilingUsd} per-attempt ceiling`,
        );
    }
  });
  const meanLatency = latencies.length
    ? latencies.reduce((s, v) => s + v, 0) / latencies.length
    : null;
  const p95 = latencies.length ? nearestRankP95(latencies) : null;
  const meanCost = costs.length
    ? costs.reduce((s, v) => s + v, 0) / costs.length
    : null;
  const totalCost = costs.length ? costs.reduce((s, v) => s + v, 0) : null;
  if (
    meanLatency !== null &&
    meanLatency > G2_RESOURCE_LIMITS.meanLatencyCeilingMs
  )
    failures.push(
      `mean latency ${Math.round(meanLatency)}ms exceeds the ${G2_RESOURCE_LIMITS.meanLatencyCeilingMs}ms ceiling`,
    );
  if (p95 !== null && p95 > G2_RESOURCE_LIMITS.p95LatencyCeilingMs)
    failures.push(
      `p95 latency ${Math.round(p95)}ms exceeds the ${G2_RESOURCE_LIMITS.p95LatencyCeilingMs}ms ceiling`,
    );
  if (totalCost !== null && totalCost > totalUsageCeilingUsd)
    failures.push(
      `total usage $${totalCost.toFixed(4)} exceeds the $${totalUsageCeilingUsd} aggregate ceiling`,
    );
  return {
    ok: failures.length === 0,
    failures,
    metrics: {
      attempts: attempts.length,
      meanLatencyMs: meanLatency,
      p95LatencyMs: p95,
      meanCostUsd: meanCost,
      totalCostUsd: totalCost,
      maxOutputTokens,
    },
  };
}

/** Incremental limits over the matched rich/simple attempt set: the
 * permitted rich-over-simple mean usage and latency ratios. */
export function assessG2IncrementalResources(
  richAttempts: G2AttemptRecord[],
  simpleAttempts: G2AttemptRecord[],
): G2ResourceAssessment {
  const failures: string[] = [];
  const costsOf = (list: G2AttemptRecord[]) => {
    const costs: number[] = [];
    for (const a of list) {
      if (!a.usage) {
        failures.push(
          `attempt ${attemptKey(a)} is missing required token telemetry`,
        );
        continue;
      }
      costs.push(g2UsageCostUsd(a.usage));
    }
    return costs;
  };
  const latenciesOf = (list: G2AttemptRecord[]) => {
    const latencies: number[] = [];
    for (const a of list) {
      if (a.latencyMs === null || !Number.isFinite(a.latencyMs)) {
        failures.push(
          `attempt ${attemptKey(a)} is missing required latency telemetry`,
        );
        continue;
      }
      latencies.push(a.latencyMs);
    }
    return latencies;
  };
  const richCosts = costsOf(richAttempts);
  const simpleCosts = costsOf(simpleAttempts);
  const richLat = latenciesOf(richAttempts);
  const simpleLat = latenciesOf(simpleAttempts);
  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
  const meanRichCost = mean(richCosts);
  const meanSimpleCost = mean(simpleCosts);
  const meanRichLatency = mean(richLat);
  const meanSimpleLatency = mean(simpleLat);
  if (
    meanRichCost !== null &&
    meanSimpleCost !== null &&
    meanRichCost > meanSimpleCost * G2_RESOURCE_LIMITS.richVsSimpleMaxCostRatio
  )
    failures.push(
      `rich mean usage exceeds the frozen ${G2_RESOURCE_LIMITS.richVsSimpleMaxCostRatio}× simple bound`,
    );
  if (
    meanRichLatency !== null &&
    meanSimpleLatency !== null &&
    meanRichLatency >
      meanSimpleLatency * G2_RESOURCE_LIMITS.richVsSimpleMaxLatencyRatio
  )
    failures.push(
      `rich mean latency exceeds the frozen ${G2_RESOURCE_LIMITS.richVsSimpleMaxLatencyRatio}× simple bound`,
    );
  return {
    ok: failures.length === 0,
    failures,
    metrics: {
      attempts: richAttempts.length + simpleAttempts.length,
      meanLatencyMs: meanRichLatency,
      p95LatencyMs: null,
      meanCostUsd: meanRichCost,
      totalCostUsd:
        richCosts.length + simpleCosts.length
          ? [...richCosts, ...simpleCosts].reduce((s, v) => s + v, 0)
          : null,
      maxOutputTokens: Math.max(
        0,
        ...[...richAttempts, ...simpleAttempts].map(
          (a) => a.usage?.outputTokens ?? 0,
        ),
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// §8.3 — missing execution evidence is a dormant decision-policy check only
// ---------------------------------------------------------------------------

/**
 * §8.3 counterexample 6: a mechanically valid pack whose execution evidence
 * (structured response, selection record) is missing stays executable but
 * records unknown provenance — missing evidence never relaxes structure.
 * This is a small dormant decision-policy check; it does not weaken
 * generation and implements no wire transport.
 */
export function g2ExecutionEvidenceDecision(input: {
  mechanicallyValid: boolean;
  executionEvidencePresent: boolean;
}): { executable: boolean; provenance: "structured_response" | "unknown" } {
  if (!input.mechanicallyValid)
    return { executable: false, provenance: "unknown" };
  return input.executionEvidencePresent
    ? { executable: true, provenance: "structured_response" }
    : { executable: true, provenance: "unknown" };
}

// ---------------------------------------------------------------------------
// §8.1 — Decision A (whole contract) and Decision B (components)
// ---------------------------------------------------------------------------

export function evaluateG2Pilot(input: {
  attempts: G2AttemptRecord[];
  preferences: G2PreferenceRecord[];
  attribution: G2Attribution[];
  /** Frozen input envelopes keyed by inputId (envelopeSha256 of each). */
  inputs: Record<string, { envelopeSha256: string }>;
}): {
  decisionA: boolean;
  reservesRetained: boolean;
  coverageRetained: boolean;
  metrics: Record<string, number | null>;
  failures: string[];
} {
  const failures: string[] = [];

  failures.push(
    ...validateG2AttemptSchedule(
      G2_PILOT_SCHEDULE.attempts,
      input.attempts,
      input.inputs,
    ),
  );

  // One blinded pack preference per pilot input — complete evidence means
  // the preference record is present, not implied (F2). A preference is only
  // judgeable when both packs are usable; the record still must exist.
  const prefSeen = new Map<string, number>();
  for (const p of input.preferences)
    prefSeen.set(p.inputId, (prefSeen.get(p.inputId) ?? 0) + 1);
  for (const scheduled of G2_PILOT_INPUTS) {
    const count = prefSeen.get(scheduled.inputId) ?? 0;
    if (count === 0)
      failures.push(
        `missing blinded pack-preference record for ${scheduled.inputId}`,
      );
    else if (count > 1)
      failures.push(
        `duplicate blinded pack-preference records for ${scheduled.inputId}`,
      );
    prefSeen.delete(scheduled.inputId);
  }
  for (const extra of prefSeen.keys())
    failures.push(`pack-preference record for unscheduled input ${extra}`);

  const richAttempts = input.attempts.filter((a) => a.variant === "rich");
  const simpleAttempts = input.attempts.filter((a) => a.variant === "simple");

  // Serialization: all five scheduled rich responses complete without
  // truncation. Fallback never counts as serialization success.
  const serializationComplete = richAttempts.filter(
    (a) => a.serializationComplete,
  ).length;
  if (serializationComplete < G2_THRESHOLDS.pilotSerializationCompleteMin)
    failures.push(
      `rich serialization ${serializationComplete} < ${G2_THRESHOLDS.pilotSerializationCompleteMin}`,
    );

  // Usable packs are counted per attempt (4 businesses + the AC repeat = 5
  // scheduled rich packs); material wins count distinct businesses.
  const usablePacks = richAttempts.filter(attemptUsable).length;
  if (usablePacks < G2_THRESHOLDS.pilotUsablePacksMin)
    failures.push(
      `usable rich packs ${usablePacks} < ${G2_THRESHOLDS.pilotUsablePacksMin}`,
    );

  const pilotBusinesses = new Set(richAttempts.map((a) => a.businessKey));
  const businessResults = [...pilotBusinesses].map((key) =>
    businessWins(key, input.attempts),
  );
  const wins = businessResults.filter((r) => r.wins).length;
  if (wins < G2_THRESHOLDS.pilotMaterialWinBusinessesMin)
    failures.push(
      `distinct pilot material wins ${wins} < ${G2_THRESHOLDS.pilotMaterialWinBusinessesMin}`,
    );
  // Non-regression is per matched attempt, not per business mean: any pair
  // where simple's unnamed mean exceeds rich's fails Decision A outright.
  const regressions = businessResults.filter((r) =>
    r.pairs.some((p) => p.regression),
  ).length;
  if (regressions > 0)
    failures.push(
      `${regressions} pilot businesses show pair-level naturalness regression`,
    );

  const absolute = assessG2AbsoluteResources(
    input.attempts,
    G2_RESOURCE_LIMITS.pilotTotalUsageCeilingUsd,
  );
  const incremental = assessG2IncrementalResources(
    richAttempts,
    simpleAttempts,
  );
  failures.push(...absolute.failures, ...incremental.failures);

  const decisionA = failures.length === 0;

  // Decision B: reserves need ≥1 M–P mechanical rescue without regression OR
  // an independently justified C–M benefit; coverage additionally requires
  // ≥1 reviewed material gain on a mechanically valid M. Mechanical rescue
  // alone cannot justify coverage; label-only C–M changes earn nothing.
  const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
    (a) => a.variant === "rich",
  );
  const attributionKeys = new Set(
    input.attribution.map((a) => `${a.inputId}:${a.pass}`),
  );
  for (const scheduled of expectedRich)
    if (!attributionKeys.has(`${scheduled.inputId}:${scheduled.pass}`))
      failures.push(
        `missing P/M/C attribution for rich attempt ${scheduled.inputId} pass ${scheduled.pass}`,
      );
  const rescued = input.attribution.reduce((n, a) => n + a.pToMRescuedSlots, 0);
  const rescueRegression = input.attribution.some(
    (a) => a.mCausedFinalRegression,
  );
  // Only gains on a mechanically valid M count.
  const materialGains = input.attribution.reduce(
    (n, a) => n + (a.mMechanicallyValid ? a.cOverMMaterialGains : 0),
    0,
  );
  const coverageRegression = input.attribution.some(
    (a) => a.cCausedFinalRegression,
  );
  const reservesRetained =
    (rescued >= 1 && !rescueRegression) ||
    (materialGains >= 1 && !coverageRegression);
  const coverageRetained = materialGains >= 1 && !coverageRegression;

  return {
    decisionA,
    reservesRetained,
    coverageRetained,
    metrics: {
      richAttempts: richAttempts.length,
      serializationComplete,
      usablePacks,
      distinctPilotWins: wins,
      pToMRescuedSlots: rescued,
      cOverMMaterialGains: materialGains,
      meanLatencyMs: absolute.metrics.meanLatencyMs,
      p95LatencyMs: absolute.metrics.p95LatencyMs,
      totalCostUsd: absolute.metrics.totalCostUsd,
    },
    failures,
  };
}

// ---------------------------------------------------------------------------
// §8.2 — held-out retention (release gate portion frozen at G2)
// ---------------------------------------------------------------------------

export const G2_HELD_OUT_SCHEDULE: G2ScheduledAttempt[] = [
  ...G2_RELEASE_INPUTS.heldOut.flatMap((input): G2ScheduledAttempt[] => [
    { inputId: input.inputId, variant: "rich", pass: 1 },
    { inputId: input.inputId, variant: "simple", pass: 1 },
  ]),
  { inputId: "H1", variant: "rich", pass: 2 },
  { inputId: "H1", variant: "simple", pass: 2 },
];

export function evaluateG2HeldOutRetention(input: {
  attempts: G2AttemptRecord[];
  inputs: Record<string, { envelopeSha256: string }>;
}): {
  retain: boolean;
  metrics: Record<string, number | null>;
  failures: string[];
} {
  const failures: string[] = [];

  failures.push(
    ...validateG2AttemptSchedule(
      G2_HELD_OUT_SCHEDULE,
      input.attempts,
      input.inputs,
    ),
  );

  const heldOut = input.attempts;
  const richAttempts = heldOut.filter((a) => a.variant === "rich");
  const simpleAttempts = heldOut.filter((a) => a.variant === "simple");

  // All scheduled rich packs must be usable — usable outside winning
  // businesses is not optional.
  const unusableRich = richAttempts.filter((a) => !attemptUsable(a));
  if (unusableRich.length)
    failures.push(
      `${unusableRich.length} scheduled held-out rich packs are not usable`,
    );

  const businesses = new Set(heldOut.map((a) => a.businessKey));
  const results = [...businesses].map((key) => businessWins(key, heldOut));
  const wins = results.filter((r) => r.wins).length;
  const regressions = results.filter((r) =>
    r.pairs.some((p) => p.regression),
  ).length;

  if (wins < G2_THRESHOLDS.heldOutMaterialWinBusinessesMin)
    failures.push(
      `distinct held-out material wins ${wins} < ${G2_THRESHOLDS.heldOutMaterialWinBusinessesMin}`,
    );
  if (regressions > 0)
    failures.push(
      `${regressions} held-out businesses show pair-level naturalness regression`,
    );

  const flaggedSelected = heldOut
    .flatMap((a) => a.texts ?? [])
    .filter((t) => t.selectedTextFlagged).length;
  if (flaggedSelected > 0)
    failures.push(
      `${flaggedSelected} selected held-out texts carried a flagged safety/privacy/identity issue`,
    );

  const incremental = assessG2IncrementalResources(
    richAttempts,
    simpleAttempts,
  );
  failures.push(...incremental.failures);

  return {
    retain: failures.length === 0,
    metrics: {
      heldOutBusinesses: businesses.size,
      heldOutAttempts: heldOut.length,
      materialWinBusinesses: wins,
      businessesWithRegressions: regressions,
      flaggedSelected,
    },
    failures,
  };
}

// ---------------------------------------------------------------------------
// §8.2 — release writer-contribution and overall resource accounting
// ---------------------------------------------------------------------------

/** The release-level decision checks over the complete scheduled record set
 * for one allocation: exact schedule reconciliation, absolute resource
 * limits over all attempts (failures and fallbacks included), and the
 * frozen writer-contribution thresholds. Held-out matched increments stay
 * in `evaluateG2HeldOutRetention` — this is the overall selected-v3 sample. */
export function evaluateG2Release(input: {
  attempts: G2AttemptRecord[];
  allocation: keyof typeof G2_RELEASE_SCHEDULES;
  inputs: Record<string, { envelopeSha256: string }>;
}): {
  pass: boolean;
  metrics: Record<string, number | null>;
  failures: string[];
} {
  const failures: string[] = [];
  const schedule = G2_RELEASE_SCHEDULES[input.allocation];
  failures.push(
    ...validateG2AttemptSchedule(
      schedule.attempts,
      input.attempts,
      input.inputs,
    ),
  );

  const v3Attempts = input.attempts.filter(
    (a) =>
      a.variant === (input.allocation === "richSelected" ? "rich" : "simple"),
  );
  const structurallyComplete = v3Attempts.filter(
    (a) => a.serializationComplete,
  ).length;
  if (structurallyComplete < G2_THRESHOLDS.releaseStructurallyCompleteMin)
    failures.push(
      `selected-v3 structurally complete packs ${structurallyComplete} < ${G2_THRESHOLDS.releaseStructurallyCompleteMin}`,
    );
  const modelWrittenPacks = v3Attempts.filter(
    (a) =>
      a.texts !== null &&
      a.texts.slice(0, UNNAMED_SLOT_IDS.length).filter((t) => t.modelWritten)
        .length >= G2_THRESHOLDS.releaseModelWrittenUnnamedMinPerPack,
  ).length;
  if (modelWrittenPacks < G2_THRESHOLDS.releaseModelWrittenPacksMin)
    failures.push(
      `packs with ≥${G2_THRESHOLDS.releaseModelWrittenUnnamedMinPerPack} model-written unnamed texts ${modelWrittenPacks} < ${G2_THRESHOLDS.releaseModelWrittenPacksMin}`,
    );
  const fullFallbacks = v3Attempts.filter((a) => a.fullFallback).length;
  if (fullFallbacks > G2_THRESHOLDS.releaseFullFallbackMax)
    failures.push(
      `full-fallback packs ${fullFallbacks} exceed the frozen maximum ${G2_THRESHOLDS.releaseFullFallbackMax}`,
    );

  const absolute = assessG2AbsoluteResources(
    input.attempts,
    G2_RESOURCE_LIMITS.releaseNewCallsUsageCeilingUsd,
  );
  failures.push(...absolute.failures);

  return {
    pass: failures.length === 0,
    metrics: {
      attempts: input.attempts.length,
      structurallyComplete,
      modelWrittenPacks,
      fullFallbacks,
      meanLatencyMs: absolute.metrics.meanLatencyMs,
      p95LatencyMs: absolute.metrics.p95LatencyMs,
      totalCostUsd: absolute.metrics.totalCostUsd,
    },
    failures,
  };
}

/** Version/identity pins so the pilot's configuration hash is reproducible. */
export const G2_VERSION_PINS = {
  selector: V3_SELECTOR_VERSION,
  fallback: V3_FALLBACK_VERSION,
  packet: G2_EVAL_PACKET_VERSION,
  decisionPolicy: G2_DECISION_POLICY_VERSION,
  rubric: G2_RUBRIC_VERSION,
  frozenInputs: G2_FROZEN_INPUTS_VERSION,
  usageAccounting: G2_USAGE_ACCOUNTING_VERSION,
} as const;
