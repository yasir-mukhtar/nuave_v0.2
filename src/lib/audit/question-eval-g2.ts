/** Dormant Spec 008 R5 G2 frozen evaluation packet and decision policy (§8).
 * No runtime consumer: no route, UI, storage, or live provider dispatch
 * imports this module. Every limit, threshold, rubric rule, and selection
 * rule needed by a future separately authorized G2P pilot and G6 release
 * comparison is frozen here so neither needs invented parameters. Nothing
 * in this file authorizes a provider call, a merge, or production
 * activation. */
import {
  V3_PROPOSED_EVALUATION_SETTINGS,
  type V3RequestSettings,
} from "./question-writer-v3";
import {
  V3_FALLBACK_VERSION,
  V3_SELECTOR_VERSION,
} from "./question-finalize-v3";

export const G2_EVAL_PACKET_VERSION = "nuave.g2-evaluation-packet.v1";
export const G2_DECISION_POLICY_VERSION = "nuave.g2-decision-policy.v1";
export const G2_RUBRIC_VERSION = "nuave.g2-review-rubric.v1";

// ---------------------------------------------------------------------------
// §8.1 — G2P pilot: four sufficient businesses + preselected AC repeat,
// five rich + five new simple-control attempts, at most ten primary calls.
// ---------------------------------------------------------------------------

/** The four sufficient pilot inputs are fictional businesses to be prepared
 * at G2P from these frozen briefs — no external business findings. AC is the
 * predeclared repeat input, chosen before any output. */
export const G2_PILOT_INPUTS = [
  {
    inputId: "G2P-AC",
    businessKey: "pilot-ac",
    brief: "local AC service with approved home visits",
    scheduledRepeat: true,
  },
  {
    inputId: "G2P-RETAIL",
    businessKey: "pilot-laptop-retail",
    brief: "multi-brand laptop retailer",
    scheduledRepeat: false,
  },
  {
    inputId: "G2P-B2B",
    businessKey: "pilot-b2b-saas",
    brief: "B2B SaaS",
    scheduledRepeat: false,
  },
  {
    inputId: "G2P-SPARSE",
    businessKey: "pilot-sparse-product",
    brief: "sparse sufficient consumer-product scope",
    scheduledRepeat: false,
  },
] as const;

/** Predeclared interleaved order (reduces temporal provider effects):
 * per input, rich then simple, inputs in listed order, the AC repeat pair
 * after all first passes. 5 rich + 5 simple = 10 scheduled primary calls. */
export const G2_PILOT_SCHEDULE = {
  requestOrder: [
    "G2P-AC:rich",
    "G2P-AC:simple",
    "G2P-RETAIL:rich",
    "G2P-RETAIL:simple",
    "G2P-B2B:rich",
    "G2P-B2B:simple",
    "G2P-SPARSE:rich",
    "G2P-SPARSE:simple",
    "G2P-AC:rich:repeat",
    "G2P-AC:simple:repeat",
  ],
  richAttempts: 5,
  simpleAttempts: 5,
  maxPrimaryCalls: 10,
  /** §8.1 uses the whole cap; the one-per-run structural rerun allowance
   * (§8.2 accounting) has no spare request here — a structurally invalid
   * §8.1 pack is itself the recorded outcome. */
  structuralRerunAllowance: 0,
} as const;

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

/** Exact §8.2 call allocation for either approved production-contract
 * outcome. Prior captures replace scheduled calls only on exact
 * input/provider/settings/instruction/schema/request-version matches with a
 * complete attempt history; previously viewed captures never replace fresh
 * held-out evidence. */
export const G2_RELEASE_ALLOCATION = {
  richSelected: {
    selectedV3: "D1–D8 + H1–H4 + repeats D1/D3/D5/H1 = 16",
    actualV2: "D1–D8 + repeats D1/D3/D5 = 11",
    newSimpleControl: "H1–H4 + H1 repeat = 5",
    maxNewPrimaryCalls: 32,
  },
  simpleSelectedByAmendment: {
    selectedV3: "D1–D8 + H1–H4 + repeats D1/D3/D5/H1 = 16",
    actualV2: "D1–D8 + H1–H4 + repeats D1/D3/D5/H1 = 16",
    newSimpleControl: "none — selected v3 already is the simple contract",
    maxNewPrimaryCalls: 32,
  },
} as const;

// ---------------------------------------------------------------------------
// Provider/settings, limits, and cost ceilings (proposed; not a grant to
// spend). §B.4/§B.5: preserve OpenCode Go + gpt-5.6-luna + low reasoning +
// no search; equal rich/simple caps.
// ---------------------------------------------------------------------------

export const G2_EVALUATION_SETTINGS: V3RequestSettings =
  V3_PROPOSED_EVALUATION_SETTINGS;

/** Frozen numerical limits. Token ceilings are exact; USD ceilings are
 * proposed bounds derived from the token caps and an explicitly labelled
 * assumed blended rate — they must be re-checked against the actual
 * OpenCode Go invoice basis at G2P before any spend. Assumed rate (labelled
 * assumption, not a measured price): USD 25 per 1M blended tokens. */
export const G2_RESOURCE_LIMITS = {
  perAttemptMaxOutputTokens: 4096,
  perAttemptTimeoutMs: 60_000,
  perAttemptEstMaxTokens: 6_500,
  assumedBlendedUsdPer1MTokens: 25,
  perAttemptCostCeilingUsd: 0.2,
  pilotTotalCostCeilingUsd: 2.5,
  releaseNewCallsCostCeilingUsd: 7.0,
  meanLatencyCeilingMs: 30_000,
  p95LatencyCeilingMs: 60_000,
  /** Maximum permitted incremental mean for rich versus simple. */
  richVsSimpleMaxCostRatio: 2.0,
  richVsSimpleMaxLatencyRatio: 1.5,
  automaticRetries: 0,
  concurrency: 1,
  liveCustomerDispatch: "none — all evaluation traffic is offline/held-out",
} as const;

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
  scale: [0, 1, 2, 3] as const,
} as const;

export const G2_NATURALNESS_SCALE = {
  0: "implausible — no real consumer would write this",
  1: "needs rewriting — meaning recoverable but phrasing fails",
  2: "plausible with minor issues — usable after light editing",
  3: "natural and clear — ships as written",
} as const;

export const G2_RUBRIC_RULES = {
  naturalnessPerText:
    "score every text 0-3 on the naturalness scale; judge the text as written",
  standaloneRequestPerText:
    "flag each text that cannot be read alone as a consumer request (missing referent, template echo, or hidden premise)",
  inputAdherencePerText:
    "flag each text that contradicts or invents beyond the confirmed projection shown to the reviewer",
  terminalMarkNotRequired:
    "a question mark is not required; an equivalent direct request scores identically to its interrogative form",
  recommendationOpportunity:
    "record whether at least one unnamed text has an implicit recommendation opportunity (its satisfying answer names businesses)",
  packPreference:
    "after scoring both packs, record one judgment: A better, B better, or indistinguishable",
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
  distinctDecisionsMin: 6,
  naturalnessMinPerText: 2,
  namedPurposeIntact: true,
  implicitRecommendationMin: 1,
  /** Fallback texts may be used inside a usable pack; a fallback never
   * counts as successful serialization (writer contribution is scored
   * separately), and missing packs score all texts invalid. */
  serializationSeparateFromUsability: true,
} as const;

export const G2_THRESHOLDS = {
  /** §8.1 Decision A. */
  pilotSerializationCompleteMin: 5,
  pilotUsablePacksMin: 5,
  pilotMaterialWinBusinessesMin: 2,
  /** §8.2 held-out retention. */
  heldOutMaterialWinBusinessesMin: 2,
  materialWinDeltaMin: 0.3,
  /** §8.2 writer contribution. */
  releaseStructurallyCompleteMin: 15,
  releaseModelWrittenUnnamedMinPerPack: 5,
  releaseModelWrittenPacksMin: 14,
  releaseFullFallbackMax: 2,
  /** Blinded preference, pooled over both-usable inputs: strictly more rich. */
  preferenceMargin: "strict",
} as const;

// ---------------------------------------------------------------------------
// Evaluation records
// ---------------------------------------------------------------------------

export type G2AttemptStatus =
  | "completed"
  | "generation_temporarily_unavailable"
  | "input_correction_required"
  | "invalid_request";

export type G2TextJudgment = {
  slotId: string;
  naturalness: number | null;
  standalone: boolean;
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
  variant: "rich" | "simple";
  pass: 1 | 2;
  status: G2AttemptStatus;
  /** Structured response parsed to the schema without truncation. Fallback
   * or missing packs are not serialization successes. */
  serializationComplete: boolean;
  /** The whole final pack arrived through the shared full-fallback budget. */
  fullFallback: boolean;
  texts?: G2TextJudgment[];
  distinctUnnamedDecisions: number;
  implicitRecommendationCount: number;
  namedPurposeIntact: boolean;
  latencyMs?: number;
  costUsd?: number;
  outputTokens?: number;
};

/** §8.1 P/M/C attribution derived offline from each rich response. */
export type G2Attribution = {
  inputId: string;
  /** Slots where P could not keep a valid primary but M kept original text
   * (mechanical rescue or avoided fallback). */
  pToMRescuedSlots: number;
  /** True when M's final text regressed versus P on any rescued slot. */
  mCausedFinalRegression: boolean;
  /** Independently reviewed material consumer-decision/wording gains of C
   * over a mechanically valid M. Label-only changes do not count. */
  cOverMMaterialGains: number;
  /** True when C regressed the final text versus M. */
  cCausedFinalRegression: boolean;
};

export type G2PreferenceRecord = {
  inputId: string;
  better: "rich" | "simple" | "indistinguishable";
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;

export function attemptUsable(a: G2AttemptRecord): boolean {
  if (a.status !== "completed" || !a.texts || a.texts.length !== 10)
    return false;
  return (
    a.distinctUnnamedDecisions >= G2_USABLE_PACK.distinctDecisionsMin &&
    a.implicitRecommendationCount >= G2_USABLE_PACK.implicitRecommendationMin &&
    a.namedPurposeIntact &&
    a.texts.every(
      (t) =>
        !t.selectedTextFlagged &&
        t.standalone &&
        t.adheresInput &&
        t.naturalness !== null &&
        t.naturalness >= G2_USABLE_PACK.naturalnessMinPerText,
    )
  );
}

export function meanNaturalness(a: G2AttemptRecord): number | null {
  return mean(
    (a.texts ?? [])
      .map((t) => t.naturalness)
      .filter((n): n is number => n !== null),
  );
}

/** The frozen comparison rule for one matched pair of packs on one
 * business: group by business over its scheduled attempts, pool means.
 * A material win needs the delta at or above the frozen boundary; a pair
 * regresses when the pooled simple mean exceeds the pooled rich mean.
 * Boundary comparison uses an epsilon only to absorb IEEE-754 noise. */
export function comparePairedAttempts(
  rich: G2AttemptRecord[],
  simple: G2AttemptRecord[],
): { delta: number | null; materialWin: boolean; regression: boolean } {
  const richMean = mean(
    rich.map(meanNaturalness).filter((n): n is number => n !== null),
  );
  const simpleMean = mean(
    simple.map(meanNaturalness).filter((n): n is number => n !== null),
  );
  const delta =
    richMean !== null && simpleMean !== null ? richMean - simpleMean : null;
  return {
    delta,
    materialWin:
      delta !== null &&
      delta >= G2_THRESHOLDS.materialWinDeltaMin - 1e-9 &&
      rich.every(attemptUsable) &&
      simple.every(attemptUsable),
    regression: delta !== null && delta < -1e-9,
  };
}

// ---------------------------------------------------------------------------
// §8.1 — Decision A (whole contract) and Decision B (components)
// ---------------------------------------------------------------------------

export function evaluateG2Pilot(input: {
  attempts: G2AttemptRecord[];
  preferences: G2PreferenceRecord[];
  attribution: G2Attribution[];
  /** Reviewed flag: a C–M change was judged a material wording/decision
   * gain rather than a label-only change, on a mechanically valid M. */
  reviewedMaterialGains: Record<string, number>;
  observedCosts?: { meanRichCostUsd?: number; meanSimpleCostUsd?: number };
  observedLatency?: { meanRichMs?: number; meanSimpleMs?: number };
}): {
  decisionA: boolean;
  reservesRetained: boolean;
  coverageRetained: boolean;
  metrics: Record<string, number | null>;
  failures: string[];
} {
  const failures: string[] = [];
  const first = input.attempts.filter((a) => a.set === "pilot");
  const richAttempts = first.filter((a) => a.variant === "rich");

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
  const wins = [...pilotBusinesses].filter((key) => {
    const rich = richAttempts.filter((a) => a.businessKey === key);
    const simple = first.filter(
      (a) => a.businessKey === key && a.variant === "simple",
    );
    return comparePairedAttempts(rich, simple).materialWin;
  }).length;
  if (wins < G2_THRESHOLDS.pilotMaterialWinBusinessesMin)
    failures.push(
      `distinct pilot material wins ${wins} < ${G2_THRESHOLDS.pilotMaterialWinBusinessesMin}`,
    );

  const mc = input.observedCosts;
  const ml = input.observedLatency;
  if (
    mc?.meanRichCostUsd !== undefined &&
    mc.meanRichCostUsd > G2_RESOURCE_LIMITS.perAttemptCostCeilingUsd
  )
    failures.push("rich mean cost exceeds the per-attempt ceiling");
  if (
    mc?.meanRichCostUsd !== undefined &&
    mc?.meanSimpleCostUsd !== undefined &&
    mc.meanRichCostUsd >
      mc.meanSimpleCostUsd * G2_RESOURCE_LIMITS.richVsSimpleMaxCostRatio
  )
    failures.push("rich mean cost exceeds the frozen 2× simple bound");
  if (
    ml?.meanRichMs !== undefined &&
    ml.meanRichMs > G2_RESOURCE_LIMITS.meanLatencyCeilingMs
  )
    failures.push("rich mean latency exceeds the absolute ceiling");
  if (
    ml?.meanRichMs !== undefined &&
    ml?.meanSimpleMs !== undefined &&
    ml.meanRichMs >
      ml.meanSimpleMs * G2_RESOURCE_LIMITS.richVsSimpleMaxLatencyRatio
  )
    failures.push("rich mean latency exceeds the frozen 1.5× simple bound");

  const decisionA = failures.length === 0;

  // Decision B: reserves need ≥1 M–P mechanical rescue without regression;
  // coverage needs ≥1 reviewed material gain on a mechanically valid M.
  // Mechanical rescue alone cannot justify coverage; label-only C–M changes
  // earn nothing.
  const rescued = input.attribution.reduce((n, a) => n + a.pToMRescuedSlots, 0);
  const rescueRegression = input.attribution.some(
    (a) => a.mCausedFinalRegression,
  );
  const materialGains = input.attribution.reduce(
    (n, a) => n + (input.reviewedMaterialGains[a.inputId] ?? 0),
    0,
  );
  const coverageRegression = input.attribution.some(
    (a) => a.cCausedFinalRegression,
  );
  const reservesRetained = rescued >= 1 && !rescueRegression;
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
    },
    failures,
  };
}

// ---------------------------------------------------------------------------
// §8.2 — held-out retention (release gate portion frozen at G2)
// ---------------------------------------------------------------------------

export function evaluateG2HeldOutRetention(input: {
  attempts: G2AttemptRecord[];
  preferences: G2PreferenceRecord[];
  observedCosts?: { meanRichCostUsd?: number; meanSimpleCostUsd?: number };
  observedLatency?: { meanRichMs?: number; meanSimpleMs?: number };
}): {
  retain: boolean;
  metrics: Record<string, number | null>;
  failures: string[];
} {
  const failures: string[] = [];
  const heldOut = input.attempts.filter((a) => a.set === "held_out");

  // Group all attempts by business: H1's repeat is the same business.
  const byBusiness = new Map<string, G2AttemptRecord[]>();
  for (const a of heldOut) {
    const list = byBusiness.get(a.businessKey) ?? [];
    list.push(a);
    byBusiness.set(a.businessKey, list);
  }

  const pairs = [...byBusiness.entries()].map(([businessKey, list]) => ({
    businessKey,
    ...comparePairedAttempts(
      list.filter((a) => a.variant === "rich"),
      list.filter((a) => a.variant === "simple"),
    ),
  }));
  const wins = pairs.filter((p) => p.materialWin).length;
  const regressions = pairs.filter((p) => p.regression).length;

  if (wins < G2_THRESHOLDS.heldOutMaterialWinBusinessesMin)
    failures.push(
      `distinct held-out material wins ${wins} < ${G2_THRESHOLDS.heldOutMaterialWinBusinessesMin}`,
    );
  if (regressions > 0)
    failures.push(`${regressions} held-out pair-level naturalness regressions`);

  const flaggedSelected = heldOut
    .flatMap((a) => a.texts ?? [])
    .filter((t) => t.selectedTextFlagged).length;
  if (flaggedSelected > 0)
    failures.push(
      `${flaggedSelected} selected held-out texts carried a flagged safety/privacy/identity issue`,
    );

  const mc = input.observedCosts;
  const ml = input.observedLatency;
  if (
    mc?.meanRichCostUsd !== undefined &&
    mc?.meanSimpleCostUsd !== undefined &&
    mc.meanRichCostUsd >
      mc.meanSimpleCostUsd * G2_RESOURCE_LIMITS.richVsSimpleMaxCostRatio
  )
    failures.push("rich held-out mean cost exceeds the frozen 2× bound");
  if (
    ml?.meanRichMs !== undefined &&
    ml?.meanSimpleMs !== undefined &&
    ml.meanRichMs >
      ml.meanSimpleMs * G2_RESOURCE_LIMITS.richVsSimpleMaxLatencyRatio
  )
    failures.push("rich held-out mean latency exceeds the frozen 1.5× bound");

  return {
    retain: failures.length === 0,
    metrics: {
      heldOutBusinesses: byBusiness.size,
      heldOutAttempts: heldOut.length,
      materialWinBusinesses: wins,
      pairRegressions: regressions,
      flaggedSelected,
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
} as const;
