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
  V3_FINALIZER_VERSION,
  V3_FALLBACK_VERSION,
  V3_SELECTOR_VERSION,
  type V3Origin,
} from "./question-finalize-v3";
import {
  V3_GUARD_POLICY,
  V3_OPENCODEGO_TRANSPORT,
  V3_PROPOSED_EVALUATION_SETTINGS,
  V3_RICH_INSTRUCTION_VERSION,
  V3_RICH_SCHEMA_VERSION,
  V3_SIMPLE_INSTRUCTION_VERSION,
  V3_SIMPLE_SCHEMA_VERSION,
  V3_WRITER_CONTRACT_VERSION,
  type V3RequestSettings,
} from "./question-writer-v3";

export const G2_EVAL_PACKET_VERSION = "nuave.g2-evaluation-packet.v6";
export const G2_DECISION_POLICY_VERSION = "nuave.g2-decision-policy.v6";
export const G2_RUBRIC_VERSION = "nuave.g2-review-rubric.v2";
export const G2_FROZEN_INPUTS_VERSION = "nuave.g2-frozen-inputs.v2";
export const G2_USAGE_ACCOUNTING_VERSION = "nuave.g2-usage-accounting.v2";

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
    {
      inputId: "D1",
      businessKey: "dev-ac-service",
      set: "development",
      envelopeSha256:
        "051092d0638450cf95a2dfc51d1e0f4a0276a4a9a2ffd4bcb5de355b1fa5edb2",
    },
    {
      inputId: "D2",
      businessKey: "dev-coffee-venue",
      set: "development",
      envelopeSha256:
        "db89ce5bd17955e3ed6a6630bc50d2c3925eb6a53aee3712799be0811cb70473",
    },
    {
      inputId: "D3",
      businessKey: "dev-laptop-retail",
      set: "development",
      envelopeSha256:
        "7a0df0746b2210efc3b3d932896e891563ac9acb38ee4bd5587e5a412c958f37",
    },
    {
      inputId: "D4",
      businessKey: "dev-product-brand",
      set: "development",
      envelopeSha256:
        "9dd48da5d4f24009e0182e19937e30a831f0274a4d7878c651bcd58bcf4aad7a",
    },
    {
      inputId: "D5",
      businessKey: "dev-b2b-saas",
      set: "development",
      envelopeSha256:
        "e886b9879398aa4d45d909138df4c4872637b0667f12ab9033566995ce48aabd",
    },
    {
      inputId: "D6",
      businessKey: "dev-professional",
      set: "development",
      envelopeSha256:
        "ac1ee1b75fd15ed2a4003c1fb707dd5bf6930a7b07102cf283b753e6c53415c4",
    },
    {
      inputId: "D7",
      businessKey: "dev-regulated-dental",
      set: "development",
      envelopeSha256:
        "9180008b95466c13097f632adedd20c0f3b4c286d7ed4fc9fe6cb7cc00a3312b",
    },
    {
      inputId: "D8",
      businessKey: "dev-sparse-product",
      set: "development",
      envelopeSha256:
        "03bbe58116937b52a2c1fe86c1da260b3c64209b21e3f735e75db410fa12d926",
    },
    {
      inputId: "H1",
      businessKey: "heldout-branch-service",
      set: "held_out",
      envelopeSha256:
        "31ab8c47651ac576948393a94878e9e1261a5ff403422d0f7d5a082db87b6eeb",
    },
    {
      inputId: "H2",
      businessKey: "heldout-limited-retail",
      set: "held_out",
      envelopeSha256:
        "36022442cdfc2121255f4163f5ae27cfa8d9d9966762b912eb9db81362850508",
    },
    {
      inputId: "H3",
      businessKey: "heldout-remote-pro",
      set: "held_out",
      envelopeSha256:
        "712deb78745b747b754bf5e4bf0d669b433049f234e87e188a4ce04d96a2e375",
    },
    {
      inputId: "H4",
      businessKey: "heldout-regulated-sparse",
      set: "held_out",
      envelopeSha256:
        "248fd2cc64f267449bdb456ab5026685d822784a16b9b9a0ce3eea0b57f00a28",
    },
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
  /** The v1 held-out envelopes were retired from untouched held-out status:
   * their deterministic fallback forms were rendered during the independent
   * re-review (correction and review artifacts, 2026-09-13), which counts as
   * output exposure under §8.2's retirement clause even though no provider
   * outputs were generated. They remain development/regression evidence only;
   * v2 freezes fresh envelopes of the same four approved archetypes, and no
   * fallback/model output was generated or inspected for the fresh inputs. */
  retiredInputs: [
    {
      inputId: "H1",
      retiredEnvelopeSha256:
        "b22a4aeabd63a55d2279582c209cb155adbb00321f28ebfaefbecaec6ff627a8",
      retiredAt: "2026-09-13",
      reason:
        "fallback forms rendered during independent re-review; retained as development/regression evidence only",
    },
    {
      inputId: "H2",
      retiredEnvelopeSha256:
        "4e4dc43f40701d7cb9e17fd7bd3851277f9d6239eaadbfc1d367a889e4e05043",
      retiredAt: "2026-09-13",
      reason:
        "fallback forms rendered during independent re-review; retained as development/regression evidence only",
    },
    {
      inputId: "H3",
      retiredEnvelopeSha256:
        "6441fdacc587f085e4728aa9bc9a7e944154b872378eba3e16330e5d61294099",
      retiredAt: "2026-09-13",
      reason:
        "fallback forms rendered during independent re-review; retained as development/regression evidence only",
    },
    {
      inputId: "H4",
      retiredEnvelopeSha256:
        "55beb88e219e8ce62a0043cce0358fc942c62d8cf0b275501d323f3d53facf57",
      retiredAt: "2026-09-13",
      reason:
        "fallback forms rendered during independent re-review; retained as development/regression evidence only",
    },
  ],
} as const;

/** SHA-256 over the canonical JSON of one frozen envelope — the value an
 * attempt record must carry as `inputFingerprint`. */
export function g2EnvelopeFingerprint(envelope: unknown): string {
  return createHash("sha256").update(JSON.stringify(envelope)).digest("hex");
}

/** The R5 hash convention shared with the finalizer's evidence record:
 * per-text `SHA-256([slotId, text])` and pack `SHA-256([factsFingerprint,
 * [[slotId, text]…]])` in canonical slot order. These bind judgments to the
 * exact captured final texts — an arbitrary nonempty string never verifies. */
export function g2TextFingerprint(slotId: string, text: string): string {
  return createHash("sha256")
    .update(JSON.stringify([slotId, text]))
    .digest("hex");
}
export function g2PackFingerprint(
  factsFingerprint: string,
  finalTexts: string[],
): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        factsFingerprint,
        CANONICAL_SLOT_IDS.map((slotId, i) => [slotId, finalTexts[i]]),
      ]),
    )
    .digest("hex");
}

/** Cross-check the fixture against the manifest: every frozen input's
 * declared envelope hash must equal `g2EnvelopeFingerprint` of the committed
 * envelope, and each pilot alias must resolve to the same envelope its
 * development target does. This is what makes the input set frozen — a
 * fixture edit that changes a hash without updating the manifest fails
 * here, so an attempt cannot silently bind to an unrecorded envelope. */
export function validateG2FrozenInputs(
  envelopes: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  const resolved = new Map<string, string>();
  for (const entry of G2_FROZEN_INPUT_MANIFEST.inputs) {
    if (entry.set === "pilot") continue;
    const envelope = envelopes[entry.inputId];
    if (!envelope) {
      errors.push(`frozen input ${entry.inputId} has no committed envelope`);
      continue;
    }
    const hash = g2EnvelopeFingerprint(envelope);
    resolved.set(entry.inputId, hash);
    if (hash !== entry.envelopeSha256)
      errors.push(
        `frozen input ${entry.inputId} envelope hashes to ${hash}, not the manifest's ${entry.envelopeSha256}`,
      );
  }
  const aliases = G2_FROZEN_INPUT_MANIFEST.pilotEnvelopeAliases as Record<
    string,
    string
  >;
  for (const [pilotId, developmentId] of Object.entries(aliases)) {
    const envelope = envelopes[developmentId];
    if (!envelope) {
      errors.push(
        `pilot input ${pilotId} aliases missing envelope ${developmentId}`,
      );
      continue;
    }
    const hash = g2EnvelopeFingerprint(envelope);
    if (resolved.get(developmentId) !== hash)
      errors.push(`pilot input ${pilotId} alias resolution is inconsistent`);
  }
  return errors;
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

/** Usage counters as the accepted telemetry normalization defines them:
 * `inputTokens` is total input; the cached-read and cache-write portions are
 * separately priced and subtracted to get the ordinary (full-rate) input —
 * matching `telemetry.ts`, never charging cached tokens twice. */
export type G2Usage = {
  inputTokens: number;
  cachedReadInputTokens: number;
  cachedWriteInputTokens: number;
  outputTokens: number;
};

/** True when the counters are nonnegative finite integers with consistent
 * totals — cached portions can never exceed total input. */
export function g2UsageIsValid(usage: G2Usage | null): boolean {
  if (!usage) return false;
  const counters = [
    usage.inputTokens,
    usage.cachedReadInputTokens,
    usage.cachedWriteInputTokens,
    usage.outputTokens,
  ];
  if (
    counters.some((v) => !Number.isFinite(v) || v < 0 || !Number.isInteger(v))
  )
    return false;
  return (
    usage.cachedReadInputTokens + usage.cachedWriteInputTokens <=
    usage.inputTokens
  );
}

/** Usage-accounted dollars for one attempt under the frozen accounting. */
export function g2UsageCostUsd(usage: G2Usage): number {
  const ordinaryInputTokens = Math.max(
    0,
    usage.inputTokens -
      usage.cachedReadInputTokens -
      usage.cachedWriteInputTokens,
  );
  return (
    (ordinaryInputTokens * G2_USAGE_ACCOUNTING.inputUsdPer1MTokens +
      usage.cachedReadInputTokens *
        G2_USAGE_ACCOUNTING.cachedReadUsdPer1MTokens +
      usage.cachedWriteInputTokens *
        G2_USAGE_ACCOUNTING.cachedWriteUsdPer1MTokens +
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
  /** Mean generation-cost ceiling over the selected-v3 sample, set equal to
   * the frozen per-attempt ceiling — the defensible bound for a mean that
   * must hold attempt-by-attempt anyway. */
  meanGenerationUsageCeilingUsd: 0.02,
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
  sessionHeaders:
    "accepted OpenCode Go transport — Authorization bearer, application/json, x-opencode-session with a fresh random ID per one-shot call, and User-Agent nuave-audit/1.0, emitted by the code-owned opencodeGoTransportHeaders helper",
} as const;

/** The one global rich selection policy supplying Decision A (R5 §4.2).
 * P/M/C attribution is derived for evidence only — never a per-business
 * selector choice. */
export const G2_SELECTION_POLICY = "default" as const;

/** The canonical request configuration a v3 attempt must declare it ran
 * under: provider/model, schema mode, output cap, timeout, retry/sampling
 * posture, the accepted transport contract, and the exact
 * instruction/schema identities — the settings object itself plus the
 * variant pins. Credentials are never part of this record (the transport
 * contract names the bearer scheme, not a key). A small canonical record;
 * the attempt binds to it by hash. */
export const G2_V3_REQUEST_CONFIG = {
  rich: {
    settings: G2_EVALUATION_SETTINGS,
    transport: V3_OPENCODEGO_TRANSPORT,
    instructionVersion: V3_RICH_INSTRUCTION_VERSION,
    schemaVersion: V3_RICH_SCHEMA_VERSION,
    contractVersion: V3_WRITER_CONTRACT_VERSION,
    selectionPolicy: G2_SELECTION_POLICY,
  },
  simple: {
    settings: G2_EVALUATION_SETTINGS,
    transport: V3_OPENCODEGO_TRANSPORT,
    instructionVersion: V3_SIMPLE_INSTRUCTION_VERSION,
    schemaVersion: V3_SIMPLE_SCHEMA_VERSION,
    contractVersion: V3_WRITER_CONTRACT_VERSION,
    selectionPolicy: "primary",
  },
} as const;

/** SHA-256 over the canonical JSON of the variant's frozen request
 * configuration — the value a v3 attempt must carry as
 * `requestConfigFingerprint`. */
export function g2RequestConfigFingerprint(variant: "rich" | "simple"): string {
  return createHash("sha256")
    .update(JSON.stringify(G2_V3_REQUEST_CONFIG[variant]))
    .digest("hex");
}

/** The component-evidence requirements bound to the adopted configuration —
 * derived from the same code-owned frozen request/selection configuration
 * (`G2_V3_REQUEST_CONFIG` / `g2RequestConfigFingerprint`) the attempt
 * records are validated against, never from a caller flag. The frozen rich
 * contract's schema carries a required reserve on every unnamed slot, so
 * reserves are always a retained component under `richSelected`; a
 * `retainedComponents` declaration contradicting this is rejected rather
 * than trusted. Coverage is retainable only through the §8.1
 * independently-justified C–M alternative when the adopted release
 * declares it. */
export const G2_ADOPTED_COMPONENT_REQUIREMENTS = {
  reserves: true,
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
  /** The exact final pack texts in canonical slot order — the capture every
   * pack/text fingerprint must resolve to. Null when no final pack exists. */
  finalTexts: string[] | null;
  /** Per-text independent judgments; null when no final pack exists. */
  texts: G2TextJudgment[] | null;
  /** Per-slot origin of each final text in canonical order — the recorded
   * mechanical outcome of the attempt's selection. Null when no final pack
   * exists. */
  finalOrigins: V3Origin[] | null;
  /** The selection policy this attempt ran under. The selected rich contract
   * is always the one frozen policy (G2_SELECTION_POLICY); simple v3 runs
   * primary-only; v2 keeps its actual recorded policy. */
  selectionPolicy: "primary" | "default" | "coverage" | "v2-actual";
  /** SHA-256 of the canonical request configuration the attempt ran under —
   * provider/model, sampling omission, schema mode, output cap, timeout,
   * transport contract, and instruction/schema identities. v3 attempts must
   * equal the frozen `g2RequestConfigFingerprint(variant)`; a v2 attempt
   * records the fingerprint of its actual recorded configuration. Never
   * contains credentials. */
  requestConfigFingerprint: string;
  /** SHA-256 of the complete parsed source response the attempt finalized —
   * emitted by the same pure derivation that produces the P/M/C replay. The
   * selected M pack alone cannot identify the source: the selector discards
   * unused reserves and metadata, so two different responses can produce an
   * identical M. Rich attempts record the fingerprint of their parsed
   * response or an explicit `null` when no usable source response exists
   * (timeout/provider/parse failure); simple and v2 attempts record `null`.
   * A null source can still land on the established shared fallback
   * outcome, but earns no replay or component credit. */
  sourceResponseFingerprint: string | null;
  /** Exact instruction/schema/guard/selector/fallback/finalizer versions the
   * attempt ran under; v3 attempts must equal the frozen pins exactly, so an
   * old rejected candidate cannot masquerade as a matching capture. */
  versions: Record<string, string>;
  distinctUnnamedDecisions: number;
  /** Unnamed texts whose satisfying answer implicitly names businesses —
   * without needing an explicit recommendation formula. */
  implicitOpportunityWithoutFormula: number;
  namedPurposeIntact: boolean;
  /** Provider-reported usage. null only when nothing was ever sent; a sent
   * attempt that returned no telemetry fails resource accounting rather
   * than passing silently. */
  usage: G2Usage | null;
  /** Attempt latency including failures and timeouts; required for every
   * scheduled attempt that was attempted. */
  latencyMs: number | null;
};

/** One replayed portfolio captured offline from a single rich response:
 * the exact canonical final texts, each slot's recorded origin, and the
 * pack fingerprint that must resolve to those texts under the attempt's
 * facts fingerprint. This is the smallest capture representation that lets
 * P, M, and C claims resolve to the same rich response — a hash alone could
 * not prove which texts/origins produced it. */
export type G2PortfolioCapture = {
  /** Must equal g2PackFingerprint(attempt.factsFingerprint, finalTexts). */
  packFingerprint: string;
  finalTexts: string[];
  origins: V3Origin[];
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
  /** The P/M/C replay captures of this attempt's response. M is the
   * recorded selection under the frozen policy, so its texts and origins
   * must equal the attempt's own capture exactly; P and C resolve against
   * these captures — a null, unrelated, identical, or merely relabelled
   * portfolio earns no component credit. */
  captures: {
    P: G2PortfolioCapture | null;
    M: G2PortfolioCapture | null;
    C: G2PortfolioCapture | null;
  };
  /** The recorded offline P/M/C replay of this attempt's response —
   * `deriveV3Attribution` output under identical guards/fallbacks and the
   * same request configuration. `sourceResponseFingerprint` is emitted by
   * the derivation from the complete parsed response and must equal the
   * attempt's recorded source identity: an identical M selection does not
   * identify the source response, so the replay binds by this fingerprint
   * instead. Every non-null capture must equal the corresponding replay
   * portfolio exactly. Required whenever a P or C capture is recorded or a
   * rescue/gain is claimed — a hash alone proves text consistency, not
   * that an arbitrary or empty portfolio was produced by that replay. */
  replay?: {
    P: G2PortfolioCapture | null;
    M: G2PortfolioCapture | null;
    C: G2PortfolioCapture | null;
    sourceResponseFingerprint: string | null;
  };
  /** Exact slot IDs where P could not keep a valid primary but M kept
   * original text (mechanical rescue or avoided fallback). */
  pToMRescuedSlots: string[];
  /** True when M's final text regressed versus P on any rescued slot. */
  mCausedFinalRegression: boolean;
  /** M produced a mechanically valid pack — the precondition for any
   * C-over-M wording/decision gain to count. */
  mMechanicallyValid: boolean;
  /** Independently reviewed material consumer-decision/wording gains of C
   * over a mechanically valid M, each bound to the exact slot, the two
   * distinct final texts, and the independent review record — kept separate
   * from writer hints. Identical final wording with only metadata changes
   * produces identical fingerprints and is rejected. */
  cOverMMaterialGains: {
    slotId: string;
    mTextFingerprint: string;
    cTextFingerprint: string;
    /** Reference to the independent review record for this exact gain. */
    reviewRef: string;
  }[];
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

/** Every origin the integrated finalizer can record (V3Origin). */
const G2_FINAL_ORIGINS: readonly string[] = [
  "primary",
  "reserve",
  "slot_fallback",
  "full_fallback",
];

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

/** The frozen per-variant version/policy pins every v3 attempt must carry —
 * instruction and schema differ per variant; selector/fallback/finalizer are
 * shared. Exact equality keeps a rejected candidate from masquerading as a
 * matching capture under stale version labels. */
const G2_V3_ATTEMPT_PINS = {
  rich: {
    instruction: V3_RICH_INSTRUCTION_VERSION,
    schema: V3_RICH_SCHEMA_VERSION,
    guardPolicy: V3_GUARD_POLICY,
    selector: V3_SELECTOR_VERSION,
    fallback: V3_FALLBACK_VERSION,
    finalizer: V3_FINALIZER_VERSION,
  },
  simple: {
    instruction: V3_SIMPLE_INSTRUCTION_VERSION,
    schema: V3_SIMPLE_SCHEMA_VERSION,
    guardPolicy: V3_GUARD_POLICY,
    selector: V3_SELECTOR_VERSION,
    fallback: V3_FALLBACK_VERSION,
    finalizer: V3_FINALIZER_VERSION,
  },
} as const;

/** Validate one attempt record's envelope semantics (bounds, fingerprints,
 * judgment completeness) and resolve its bindings against the frozen input
 * index: the envelope hash, the canonical projected-facts fingerprint, and
 * the exact captured final texts/pack under the R5 hash convention. */
export function validateG2AttemptRecord(
  record: G2AttemptRecord,
  inputIndex: Record<
    string,
    { envelopeSha256: string; factsFingerprint: string }
  >,
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
  else {
    if (record.inputFingerprint !== expected.envelopeSha256)
      errors.push(
        `attempt ${attemptKey(record)} inputFingerprint does not match the frozen envelope hash`,
      );
    // The facts fingerprint must be the canonical G1 projection of the exact
    // frozen envelope — the index carries the resolved value, so an
    // arbitrary string never verifies.
    if (record.factsFingerprint !== expected.factsFingerprint)
      errors.push(
        `attempt ${attemptKey(record)} factsFingerprint does not match the canonical projection of the frozen envelope`,
      );
  }
  if (typeof record.factsFingerprint !== "string" || !record.factsFingerprint)
    errors.push(`attempt ${attemptKey(record)} missing factsFingerprint`);

  // Exact policy/version binding: a v3 attempt must declare the one frozen
  // selection policy and the exact version pins it ran under.
  if (record.variant === "rich" || record.variant === "simple") {
    const pins = G2_V3_ATTEMPT_PINS[record.variant];
    const expectedPolicy =
      record.variant === "rich" ? G2_SELECTION_POLICY : "primary";
    if (record.selectionPolicy !== expectedPolicy)
      errors.push(
        `attempt ${attemptKey(record)} selectionPolicy "${record.selectionPolicy}" must be the frozen "${expectedPolicy}"`,
      );
    for (const [key, pin] of Object.entries(pins))
      if (record.versions?.[key] !== pin)
        errors.push(
          `attempt ${attemptKey(record)} versions.${key} "${record.versions?.[key] ?? "missing"}" must equal the frozen "${pin}"`,
        );
  } else if (
    typeof record.versions?.writer !== "string" ||
    !record.versions.writer
  )
    errors.push(
      `attempt ${attemptKey(record)} must record the actual v2 writer identity in versions.writer`,
    );

  // Text/pack binding: when a final pack exists, every judgment fingerprint
  // and the pack fingerprint must resolve to the exact captured texts.
  const hasPack = record.finalTexts !== null;
  if (record.status === "completed" && (!hasPack || !record.texts))
    errors.push(
      `completed attempt ${attemptKey(record)} must carry finalTexts, a pack fingerprint, and text judgments`,
    );
  if (record.status !== "completed" && (hasPack || record.packFingerprint))
    errors.push(
      `non-completed attempt ${attemptKey(record)} cannot carry final texts or a pack fingerprint`,
    );
  // Origins are the recorded mechanical outcome of the same selection —
  // required exactly when a final pack exists, in canonical order, and
  // internally consistent with every recorded contribution counter:
  // full fallback is all-or-nothing (a partial full_fallback list is not
  // a finalization outcome), named slots and the simple contract carry
  // no reserves, and substituted fallback text is never model-written.
  if (hasPack) {
    const origins = record.finalOrigins;
    if (
      !origins ||
      origins.length !== CANONICAL_SLOT_IDS.length ||
      origins.some((origin) => !G2_FINAL_ORIGINS.includes(origin))
    )
      errors.push(
        `attempt ${attemptKey(record)} must record exactly ${CANONICAL_SLOT_IDS.length} canonical final origins`,
      );
    else {
      const anyFull = origins.includes("full_fallback");
      if (anyFull && !origins.every((o) => o === "full_fallback"))
        errors.push(
          `attempt ${attemptKey(record)} mixes full_fallback with other origins — full fallback is all-or-nothing`,
        );
      if (record.fullFallback !== origins.every((o) => o === "full_fallback"))
        errors.push(
          `attempt ${attemptKey(record)} fullFallback flag contradicts the recorded origins`,
        );
      origins.forEach((origin, i) => {
        if (origin === "reserve" && i >= UNNAMED_SLOT_IDS.length)
          errors.push(
            `attempt ${attemptKey(record)} records a reserve origin on named slot ${CANONICAL_SLOT_IDS[i]} — named slots carry no reserves`,
          );
        if (origin === "reserve" && record.variant === "simple")
          errors.push(
            `attempt ${attemptKey(record)} records a reserve origin under the simple contract, which has no reserves`,
          );
      });
      // Substituted/paraphrased repairs do not qualify as model-written
      // (§8.2.3): the judgment's flag must agree with the origin.
      for (const [i, judgment] of (record.texts ?? []).entries()) {
        if (i >= origins.length) break;
        const modelOrigin =
          origins[i] === "primary" || origins[i] === "reserve";
        if (judgment.modelWritten !== modelOrigin)
          errors.push(
            `attempt ${attemptKey(record)} judgment ${judgment.slotId} modelWritten=${judgment.modelWritten} contradicts the recorded ${origins[i]} origin`,
          );
      }
    }
  } else if (record.finalOrigins !== null)
    errors.push(
      `attempt ${attemptKey(record)} cannot carry final origins without a final pack`,
    );
  if (!hasPack && record.fullFallback)
    errors.push(
      `attempt ${attemptKey(record)} claims fullFallback without a final pack`,
    );
  // Source-response identity (R5 §8.1 P/M/C binding): a rich attempt records
  // the fingerprint of the complete parsed response — emitted by the same
  // pure derivation the replay comes from — or an explicit null when no
  // usable source exists. A null source can still land on the shared
  // fallback outcome, but model-selected origins or a serialization success
  // without a source are contradictions.
  if (record.variant === "rich") {
    const source = record.sourceResponseFingerprint;
    if (source !== null && (typeof source !== "string" || source.length === 0))
      errors.push(
        `attempt ${attemptKey(record)} must record the source-response fingerprint of the complete parsed response, or an explicit null when no usable source response exists`,
      );
    else if (source === null) {
      if (record.serializationComplete)
        errors.push(
          `attempt ${attemptKey(record)} claims serializationComplete without a source-response identity`,
        );
      if (
        hasPack &&
        record.finalOrigins?.some((origin) => origin !== "full_fallback")
      )
        errors.push(
          `attempt ${attemptKey(record)} records model-selected origins but no source-response identity — a pack without a source can only be the shared fallback outcome`,
        );
    } else if (!record.serializationComplete)
      errors.push(
        `attempt ${attemptKey(record)} records a source-response fingerprint without serializationComplete — the fingerprint is of the parsed response, which cannot exist when parsing failed`,
      );
  } else if (record.sourceResponseFingerprint !== null)
    errors.push(
      `attempt ${attemptKey(record)} cannot carry a source-response fingerprint — only rich attempts have a rich source response`,
    );
  // Request-configuration binding: v3 attempts run under the one frozen
  // canonical configuration; a v2 record carries its actual recorded hash.
  if (record.variant === "rich" || record.variant === "simple") {
    if (
      record.requestConfigFingerprint !==
      g2RequestConfigFingerprint(record.variant)
    )
      errors.push(
        `attempt ${attemptKey(record)} requestConfigFingerprint does not equal the frozen ${record.variant} request configuration`,
      );
  } else if (
    typeof record.requestConfigFingerprint !== "string" ||
    !record.requestConfigFingerprint
  )
    errors.push(
      `attempt ${attemptKey(record)} must record its actual request configuration fingerprint`,
    );
  if (hasPack) {
    const texts = record.finalTexts!;
    if (texts.length !== CANONICAL_SLOT_IDS.length)
      errors.push(
        `attempt ${attemptKey(record)} finalTexts must contain exactly ${CANONICAL_SLOT_IDS.length} texts in canonical order`,
      );
    else {
      if (
        record.packFingerprint !==
        g2PackFingerprint(record.factsFingerprint, texts)
      )
        errors.push(
          `attempt ${attemptKey(record)} packFingerprint does not resolve to the captured final pack`,
        );
      for (const [i, judgment] of (record.texts ?? []).entries()) {
        if (
          judgment.slotId === CANONICAL_SLOT_IDS[i] &&
          judgment.textFingerprint !==
            g2TextFingerprint(judgment.slotId, texts[i])
        )
          errors.push(
            `attempt ${attemptKey(record)} judgment ${judgment.slotId} textFingerprint does not resolve to the captured final text`,
          );
      }
    }
  }
  if (record.status === "completed" && !record.packFingerprint)
    errors.push(
      `completed attempt ${attemptKey(record)} must carry a pack fingerprint`,
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
  if (record.usage !== null && !g2UsageIsValid(record.usage))
    errors.push(
      `attempt ${attemptKey(record)} invalid usage counters (nonnegative finite integers; cached portions cannot exceed total input)`,
    );
  return errors;
}

/** Reconcile evaluation records to the frozen input/variant/pass schedule:
 * exactly the expected set, no missing, duplicates, extras, or mismatched
 * business/set bindings (F2). */
export function validateG2AttemptSchedule(
  expected: readonly G2ScheduledAttempt[],
  records: G2AttemptRecord[],
  inputIndex: Record<
    string,
    { envelopeSha256: string; factsFingerprint: string }
  >,
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

/** Reconcile P/M/C attribution rows to the scheduled rich attempts exactly:
 * one row per scheduled rich input/pass, matching business/variant/pass, and
 * every portfolio fingerprint resolving to that same attempt's captures —
 * M equals the recorded pack under the frozen policy; a null or unrelated
 * portfolio earns no credit. Returns the valid rows separately so no
 * component credit is granted from invalid rows. */
export function validateG2Attribution(
  rows: G2Attribution[],
  expectedRich: readonly G2ScheduledAttempt[],
  attempts: G2AttemptRecord[],
): { errors: string[]; valid: G2Attribution[] } {
  const errors: string[] = [];
  const seen = new Map<string, G2Attribution>();
  const valid: G2Attribution[] = [];
  // Attribution binds to the exact scheduled RICH attempt — input, variant,
  // and pass. An interleaved simple or v2 record at the same input/pass is a
  // different key and can never overwrite or shadow the rich attempt.
  const attemptByKey = new Map<string, G2AttemptRecord>(
    attempts.map((a) => [attemptKey(a), a] as const),
  );
  const textAt = (capture: G2PortfolioCapture, slotId: string) =>
    capture.finalTexts[
      (CANONICAL_SLOT_IDS as readonly string[]).indexOf(slotId)
    ];
  const originAt = (capture: G2PortfolioCapture, slotId: string) =>
    capture.origins[(CANONICAL_SLOT_IDS as readonly string[]).indexOf(slotId)];
  for (const row of rows) {
    const key = attemptKey({
      inputId: row.inputId,
      variant: row.variant,
      pass: row.pass,
    });
    if (seen.has(key)) {
      errors.push(`duplicate P/M/C attribution for ${key}`);
      continue;
    }
    seen.set(key, row);
    const rowErrors: string[] = [];
    const scheduled = expectedRich.find(
      (a) =>
        a.inputId === row.inputId &&
        a.pass === row.pass &&
        a.variant === "rich",
    );
    if (!scheduled)
      rowErrors.push(
        `unscheduled P/M/C attribution for ${key} (no scheduled rich attempt)`,
      );
    if (row.variant !== "rich")
      rowErrors.push(`attribution ${key} must carry variant "rich"`);
    const attempt = attemptByKey.get(key);
    if (!attempt)
      rowErrors.push(
        `attribution ${key} has no recorded rich attempt to bind against`,
      );
    else if (row.businessKey !== attempt.businessKey)
      rowErrors.push(
        `attribution ${key} businessKey "${row.businessKey}" mismatches the attempt's "${attempt.businessKey}"`,
      );
    // Every non-null capture must be structurally valid — canonical
    // lengths/order, allowed origins with policy/slot compatibility (P
    // never uses reserves; named slots never carry reserves; full
    // fallback is all-or-nothing), nonempty final texts — and resolve to
    // this attempt's facts: the pack fingerprint is recomputed over the
    // captured texts so an unrelated or fabricated portfolio never
    // verifies.
    const captureErrors = (
      label: string,
      policy: "P" | "M" | "C",
      capture: G2PortfolioCapture,
    ) => {
      if (
        capture.finalTexts.length !== CANONICAL_SLOT_IDS.length ||
        capture.origins.length !== CANONICAL_SLOT_IDS.length
      ) {
        rowErrors.push(
          `attribution ${key} ${label} ${policy} must carry exactly ${CANONICAL_SLOT_IDS.length} final texts and origins in canonical order`,
        );
        return;
      }
      capture.origins.forEach((origin, i) => {
        if (!G2_FINAL_ORIGINS.includes(origin))
          rowErrors.push(
            `attribution ${key} ${label} ${policy} records "${origin}" on ${CANONICAL_SLOT_IDS[i]} — not a finalization origin`,
          );
        else if (origin === "reserve" && i >= UNNAMED_SLOT_IDS.length)
          rowErrors.push(
            `attribution ${key} ${label} ${policy} records a reserve origin on named slot ${CANONICAL_SLOT_IDS[i]} — named slots carry no reserves`,
          );
        else if (origin === "reserve" && policy === "P")
          rowErrors.push(
            `attribution ${key} ${label} P records a reserve origin on ${CANONICAL_SLOT_IDS[i]} — the primary-only portfolio never selects reserves`,
          );
      });
      if (
        capture.origins.includes("full_fallback") &&
        !capture.origins.every((o) => o === "full_fallback")
      )
        rowErrors.push(
          `attribution ${key} ${label} ${policy} mixes full_fallback with other origins — full fallback is all-or-nothing`,
        );
      if (capture.finalTexts.some((text) => !text?.trim()))
        rowErrors.push(
          `attribution ${key} ${label} ${policy} carries an empty final text — an incomplete portfolio is not a finished replay capture`,
        );
      if (
        attempt &&
        capture.packFingerprint !==
          g2PackFingerprint(attempt.factsFingerprint, capture.finalTexts)
      )
        rowErrors.push(
          `attribution ${key} ${label} ${policy} pack fingerprint does not resolve to the captured texts under this attempt's facts`,
        );
    };
    for (const policy of ["P", "M", "C"] as const) {
      const capture = row.captures[policy];
      if (capture) captureErrors("capture", policy, capture);
    }
    // Replay resolution: P and C captures and every component claim must
    // resolve to the recorded offline P/M/C replay of this same response
    // (deriveV3Attribution under identical guards/fallbacks). replay.M
    // equalling the attempt's recorded pack anchors the replay to this
    // response; each non-null capture must equal its replay portfolio
    // exactly — a self-consistent hash cannot invent a replay.
    const needsReplay =
      row.captures.P !== null ||
      row.captures.C !== null ||
      row.pToMRescuedSlots.length > 0 ||
      row.cOverMMaterialGains.length > 0 ||
      row.cOverMLabelOnlyChanges > 0;
    if (needsReplay && !row.replay)
      rowErrors.push(
        `attribution ${key} records P/C captures or component claims without the recorded offline P/M/C replay they must resolve against`,
      );
    if (row.replay) {
      // Source-response identity: the replay's derivation-emitted
      // fingerprint of the complete parsed response must equal the
      // attempt's recorded identity. Identical M output is not proof — the
      // selector discards unused reserves and metadata, so a different
      // response's replay cannot stand in for this attempt's.
      const replaySource = row.replay.sourceResponseFingerprint;
      if (
        replaySource !== null &&
        (typeof replaySource !== "string" || replaySource.length === 0)
      )
        rowErrors.push(
          `attribution ${key} replay must record the source-response fingerprint emitted by the derivation, or an explicit null`,
        );
      else if (attempt && replaySource !== attempt.sourceResponseFingerprint)
        rowErrors.push(
          `attribution ${key} replay resolves to a different source response than this attempt recorded — an identical M selection does not establish the same source`,
        );
      for (const policy of ["P", "M", "C"] as const) {
        const replay = row.replay[policy];
        if (replay) captureErrors("replay", policy, replay);
      }
      if (attempt?.finalTexts) {
        if (!row.replay.M)
          rowErrors.push(
            `attribution ${key} replay lacks the M portfolio for an attempt with a recorded pack`,
          );
        else if (
          row.replay.M.packFingerprint !== attempt.packFingerprint ||
          row.replay.M.finalTexts.some(
            (text, i) => text !== attempt.finalTexts![i],
          ) ||
          row.replay.M.origins.some(
            (origin, i) => origin !== attempt.finalOrigins?.[i],
          )
        )
          rowErrors.push(
            `attribution ${key} replay M does not equal the attempt's recorded pack — the replay is not of this response`,
          );
      } else if (row.replay.M !== null)
        rowErrors.push(
          `attribution ${key} replay claims an M portfolio for an attempt with no pack`,
        );
      for (const policy of ["P", "M", "C"] as const) {
        const capture = row.captures[policy];
        if (!capture) continue;
        const replay = row.replay[policy];
        if (!replay)
          rowErrors.push(
            `attribution ${key} capture ${policy} has no corresponding replay portfolio`,
          );
        else if (
          capture.packFingerprint !== replay.packFingerprint ||
          capture.finalTexts.some((text, i) => text !== replay.finalTexts[i]) ||
          capture.origins.some((origin, i) => origin !== replay.origins[i])
        )
          rowErrors.push(
            `attribution ${key} capture ${policy} does not equal the recorded replay portfolio`,
          );
      }
    }
    // Honest absence: an attempt that recorded no usable source response
    // (timeout/provider/parse failure) still lands on the established
    // shared fallback outcome, but its row can never earn replay or
    // component credit.
    if (
      attempt?.sourceResponseFingerprint === null &&
      (row.pToMRescuedSlots.length > 0 ||
        row.cOverMMaterialGains.length > 0 ||
        row.cOverMLabelOnlyChanges > 0)
    )
      rowErrors.push(
        `attribution ${key} claims component credit on an attempt that recorded no usable source response — the shared fallback outcome earns no replay credit`,
      );
    // M is the recorded selection under the frozen policy — its captured
    // texts and origins must equal the attempt's own record exactly. An
    // attempt with no pack admits no M portfolio.
    if (attempt?.finalTexts) {
      if (!row.captures.M)
        rowErrors.push(
          `attribution ${key} lacks the M capture for an attempt with a recorded pack`,
        );
      else if (
        row.captures.M.packFingerprint !== attempt.packFingerprint ||
        row.captures.M.finalTexts.some(
          (text, i) => text !== attempt.finalTexts![i],
        ) ||
        row.captures.M.origins.some(
          (origin, i) => origin !== attempt.finalOrigins?.[i],
        )
      )
        rowErrors.push(
          `attribution ${key} M capture does not equal the attempt's recorded final texts, origins, and pack fingerprint`,
        );
    } else if (row.captures.M !== null)
      rowErrors.push(
        `attribution ${key} claims an M capture for an attempt with no pack`,
      );
    // A completed capture from the integrated finalizer is mechanically
    // valid by construction; mMechanicallyValid is exactly "M exists".
    if (row.mMechanicallyValid !== (row.captures.M !== null))
      rowErrors.push(
        `attribution ${key} mMechanicallyValid must equal the presence of the M capture`,
      );
    // Rescued slots: exact canonical unnamed slot IDs, unique, and each one
    // must resolve to the recorded P-to-M difference — under the P capture
    // the slot lost its original text (slot/full fallback) while under M it
    // kept an original candidate (primary or reserve). A null P or a slot
    // where both kept the same text earns no credit.
    const rescued = new Set<string>();
    for (const slotId of row.pToMRescuedSlots) {
      if (!(UNNAMED_SLOT_IDS as readonly string[]).includes(slotId)) {
        rowErrors.push(`attribution ${key} rescued non-unnamed slot ${slotId}`);
        continue;
      }
      if (rescued.has(slotId)) {
        rowErrors.push(`attribution ${key} duplicates rescued slot ${slotId}`);
        continue;
      }
      rescued.add(slotId);
      const { P, M } = row.captures;
      const mKeptOriginal =
        M &&
        (originAt(M, slotId) === "primary" ||
          originAt(M, slotId) === "reserve");
      const pLostOriginal =
        P &&
        (originAt(P, slotId) === "slot_fallback" ||
          originAt(P, slotId) === "full_fallback");
      if (
        !P ||
        !M ||
        !mKeptOriginal ||
        !pLostOriginal ||
        textAt(P, slotId) === textAt(M, slotId)
      )
        rowErrors.push(
          `attribution ${key} rescued slot ${slotId} does not resolve to a recorded P-to-M difference (P fell back while M kept original text)`,
        );
    }
    // Material gains: exact slot binding, each fingerprint resolved to the
    // actual M/C captured texts (identical wording produces identical
    // fingerprints and is rejected), and a required independent review
    // reference.
    for (const gain of row.cOverMMaterialGains) {
      if (!(UNNAMED_SLOT_IDS as readonly string[]).includes(gain.slotId))
        rowErrors.push(
          `attribution ${key} material gain on non-unnamed slot ${gain.slotId}`,
        );
      if (!gain.mTextFingerprint || !gain.cTextFingerprint)
        rowErrors.push(
          `attribution ${key} material gain on ${gain.slotId} lacks the exact M/C text fingerprints`,
        );
      else if (gain.mTextFingerprint === gain.cTextFingerprint)
        rowErrors.push(
          `attribution ${key} material gain on ${gain.slotId} has identical M/C final wording — a label-only change earns no credit`,
        );
      else {
        const { M, C } = row.captures;
        if (
          M &&
          C &&
          (UNNAMED_SLOT_IDS as readonly string[]).includes(gain.slotId)
        ) {
          if (
            gain.mTextFingerprint !==
            g2TextFingerprint(gain.slotId, textAt(M, gain.slotId))
          )
            rowErrors.push(
              `attribution ${key} material gain on ${gain.slotId} M fingerprint does not resolve to the captured M text`,
            );
          if (
            gain.cTextFingerprint !==
            g2TextFingerprint(gain.slotId, textAt(C, gain.slotId))
          )
            rowErrors.push(
              `attribution ${key} material gain on ${gain.slotId} C fingerprint does not resolve to the captured C text`,
            );
        }
      }
      if (!gain.reviewRef?.trim())
        rowErrors.push(
          `attribution ${key} material gain on ${gain.slotId} lacks an independent review reference`,
        );
    }
    if (row.cOverMMaterialGains.length) {
      if (!row.mMechanicallyValid)
        rowErrors.push(
          `attribution ${key} claims material gains on a mechanically invalid M`,
        );
      if (!row.captures.C)
        rowErrors.push(
          `attribution ${key} claims material gains without a C portfolio`,
        );
    }
    if (rowErrors.length) errors.push(...rowErrors);
    else valid.push(row);
  }
  for (const scheduled of expectedRich)
    if (
      !seen.has(
        attemptKey({
          inputId: scheduled.inputId,
          variant: "rich",
          pass: scheduled.pass,
        }),
      )
    )
      errors.push(
        `missing P/M/C attribution for rich attempt ${scheduled.inputId} pass ${scheduled.pass}`,
      );
  return { errors, valid };
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

/** Mean naturalness over all ten texts — the §8.2 v2-comparison measure,
 * grouped per frozen input over its scheduled repeats. A missing or
 * non-completed pack scores zero. */
export function meanAllNaturalness(a: G2AttemptRecord): number {
  if (a.status !== "completed" || !a.texts) return 0;
  if (a.texts.length !== CANONICAL_SLOT_IDS.length) return 0;
  return a.texts.reduce((sum, t) => sum + t.naturalness, 0) / a.texts.length;
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
 * bounds, mean and nearest-rank-p95 latency, the frozen mean-generation-cost
 * ceiling, and the aggregate ceiling when one is supplied. Pass `null` for
 * the aggregate ceiling when the sample is a variant/selected-v3 subset
 * whose total is governed by the pooled ceiling instead. */
export function assessG2AbsoluteResources(
  attempts: G2AttemptRecord[],
  totalUsageCeilingUsd: number | null,
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
    if (!a.usage || !g2UsageIsValid(a.usage)) {
      failures.push(
        `attempt ${key} is missing required token telemetry or has invalid counters`,
      );
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
  if (
    meanCost !== null &&
    meanCost > G2_RESOURCE_LIMITS.meanGenerationUsageCeilingUsd
  )
    failures.push(
      `mean usage $${meanCost.toFixed(4)} exceeds the $${G2_RESOURCE_LIMITS.meanGenerationUsageCeilingUsd} mean-generation-cost ceiling`,
    );
  if (
    totalUsageCeilingUsd !== null &&
    totalCost !== null &&
    totalCost > totalUsageCeilingUsd
  )
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
      if (!a.usage || !g2UsageIsValid(a.usage)) {
        failures.push(
          `attempt ${attemptKey(a)} is missing required token telemetry or has invalid counters`,
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
  /** Frozen input index: inputId → envelope hash + canonical projected-facts
   * fingerprint. */
  inputs: Record<string, { envelopeSha256: string; factsFingerprint: string }>;
}): {
  /** Decision A's quality result over the records present. */
  decisionA: boolean;
  reservesRetained: boolean;
  coverageRetained: boolean;
  /** Every required record present and valid — schedule, fingerprints,
   * preferences, attribution. Missing/invalid required evidence prevents
   * `retain` even when the quality calculation itself passes. */
  evidenceComplete: boolean;
  /** The overall pilot retain for the frozen M rich contract: Decision A's
   * quality result AND complete valid evidence AND Decision B's reserves
   * benefit. A alone cannot retain a contract whose reserves component fails
   * B — that outcome is `amendment_required`, never a silently adopted
   * reserves-free request. */
  retain: boolean;
  /** The honest combined outcome:
   * - "retain": A passed, evidence complete, reserves demonstrated benefit.
   * - "amendment_required": A passed and evidence is complete but the
   *   frozen contract's reserves component shows no benefit — a
   *   reserves-free or coverage contract is a different contract needing
   *   its own evaluation, not an automatic outcome.
   * - "not_retained": A failed or required evidence is missing/invalid. */
  outcome: "retain" | "amendment_required" | "not_retained";
  metrics: Record<string, number | null>;
  failures: string[];
} {
  const failures: string[] = [];
  const evidenceErrors: string[] = [];

  evidenceErrors.push(
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
      evidenceErrors.push(
        `missing blinded pack-preference record for ${scheduled.inputId}`,
      );
    else if (count > 1)
      evidenceErrors.push(
        `duplicate blinded pack-preference records for ${scheduled.inputId}`,
      );
    prefSeen.delete(scheduled.inputId);
  }
  for (const extra of prefSeen.keys())
    evidenceErrors.push(
      `pack-preference record for unscheduled input ${extra}`,
    );

  const richAttempts = input.attempts.filter((a) => a.variant === "rich");
  const simpleAttempts = input.attempts.filter((a) => a.variant === "simple");

  // Decision A quality gates over the records present.
  const qualityFailures: string[] = [];

  // Serialization: all five scheduled rich responses complete without
  // truncation. Fallback never counts as serialization success.
  const serializationComplete = richAttempts.filter(
    (a) => a.serializationComplete,
  ).length;
  if (serializationComplete < G2_THRESHOLDS.pilotSerializationCompleteMin)
    qualityFailures.push(
      `rich serialization ${serializationComplete} < ${G2_THRESHOLDS.pilotSerializationCompleteMin}`,
    );

  // Usable packs are counted per attempt (4 businesses + the AC repeat = 5
  // scheduled rich packs); material wins count distinct businesses.
  const usablePacks = richAttempts.filter(attemptUsable).length;
  if (usablePacks < G2_THRESHOLDS.pilotUsablePacksMin)
    qualityFailures.push(
      `usable rich packs ${usablePacks} < ${G2_THRESHOLDS.pilotUsablePacksMin}`,
    );

  const pilotBusinesses = new Set(richAttempts.map((a) => a.businessKey));
  const businessResults = [...pilotBusinesses].map((key) =>
    businessWins(key, input.attempts),
  );
  const wins = businessResults.filter((r) => r.wins).length;
  if (wins < G2_THRESHOLDS.pilotMaterialWinBusinessesMin)
    qualityFailures.push(
      `distinct pilot material wins ${wins} < ${G2_THRESHOLDS.pilotMaterialWinBusinessesMin}`,
    );
  // Non-regression is per matched attempt, not per business mean: any pair
  // where simple's unnamed mean exceeds rich's fails Decision A outright.
  const regressions = businessResults.filter((r) =>
    r.pairs.some((p) => p.regression),
  ).length;
  if (regressions > 0)
    qualityFailures.push(
      `${regressions} pilot businesses show pair-level naturalness regression`,
    );

  // Absolute resource statistics are enforced per variant — a slow rich
  // sample cannot hide inside the pooled mean — plus the pooled aggregate
  // ceiling over all scheduled attempts including failures.
  const richAbsolute = assessG2AbsoluteResources(richAttempts, null);
  const simpleAbsolute = assessG2AbsoluteResources(simpleAttempts, null);
  const pooled = assessG2AbsoluteResources(
    input.attempts,
    G2_RESOURCE_LIMITS.pilotTotalUsageCeilingUsd,
  );
  const incremental = assessG2IncrementalResources(
    richAttempts,
    simpleAttempts,
  );
  qualityFailures.push(
    ...richAbsolute.failures.map((f) => `rich: ${f}`),
    ...simpleAbsolute.failures.map((f) => `simple: ${f}`),
    ...pooled.failures,
    ...incremental.failures,
  );

  const decisionA = qualityFailures.length === 0;

  // Decision B keeps the two components separate and applies R5 §8.1's
  // approved alternatives exactly: reserves are supported by ≥1 recorded
  // M–P mechanical rescue/avoided fallback without final-text regression
  // OR by an independently justified C–M benefit — each benefit route is
  // gated on its own regression. Coverage requires ≥1 independently
  // reviewed material gain on a mechanically valid M with no C regression;
  // mechanical rescue alone cannot justify coverage, and label-only C–M
  // changes earn nothing. Attribution rows reconcile exactly to the
  // scheduled rich attempts; only valid rows earn credit.
  const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
    (a) => a.variant === "rich",
  );
  const attribution = validateG2Attribution(
    input.attribution,
    expectedRich,
    input.attempts,
  );
  evidenceErrors.push(...attribution.errors);
  const rescued = attribution.valid.reduce(
    (n, a) => n + a.pToMRescuedSlots.length,
    0,
  );
  const rescueRegression = attribution.valid.some(
    (a) => a.mCausedFinalRegression,
  );
  // Only gains on a mechanically valid M count.
  const materialGains = attribution.valid.reduce(
    (n, a) => n + (a.mMechanicallyValid ? a.cOverMMaterialGains.length : 0),
    0,
  );
  const coverageRegression = attribution.valid.some(
    (a) => a.cCausedFinalRegression,
  );
  const rescueSupported = rescued >= 1 && !rescueRegression;
  const gainSupported = materialGains >= 1 && !coverageRegression;
  const reservesRetained = rescueSupported || gainSupported;
  const coverageRetained = gainSupported;

  const evidenceComplete = evidenceErrors.length === 0;
  failures.push(...evidenceErrors, ...qualityFailures);

  const retain = decisionA && evidenceComplete && reservesRetained;
  const outcome = retain
    ? ("retain" as const)
    : decisionA && evidenceComplete
      ? ("amendment_required" as const)
      : ("not_retained" as const);

  return {
    decisionA,
    reservesRetained,
    coverageRetained,
    evidenceComplete,
    retain,
    outcome,
    metrics: {
      richAttempts: richAttempts.length,
      serializationComplete,
      usablePacks,
      distinctPilotWins: wins,
      pToMRescuedSlots: rescued,
      cOverMMaterialGains: materialGains,
      richMeanLatencyMs: richAbsolute.metrics.meanLatencyMs,
      simpleMeanLatencyMs: simpleAbsolute.metrics.meanLatencyMs,
      meanLatencyMs: pooled.metrics.meanLatencyMs,
      p95LatencyMs: pooled.metrics.p95LatencyMs,
      totalCostUsd: pooled.metrics.totalCostUsd,
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
  inputs: Record<string, { envelopeSha256: string; factsFingerprint: string }>;
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
 * for one allocation (§8.2): exact schedule reconciliation, all 16
 * selected-v3 packs usable, per-input v2 naturalness comparison over all ten
 * texts, the frozen writer-contribution thresholds, §8.2.5 mandatory
 * regression/attribution evidence, absolute resource limits over all
 * scheduled attempts, and the selected-v3 sample's own mean/p95/mean-cost
 * ceilings — distinct from the five-pair held-out incremental comparison in
 * `evaluateG2HeldOutRetention`. Mandatory §8.2.5 inputs that are absent are
 * listed as missing evidence and the result cannot pass. The G6
 * browser/history/rollback and v2-baseline checks remain separately
 * evaluated later; this function implements the offline decision math only. */
export function evaluateG2Release(input: {
  attempts: G2AttemptRecord[];
  allocation: keyof typeof G2_RELEASE_SCHEDULES;
  inputs: Record<string, { envelopeSha256: string; factsFingerprint: string }>;
  /** §8.2.5 mandatory replay evidence: the matching pilot captures rerun
   * through the integrated finalizers. Absent → release cannot pass. */
  pilotReplay?: {
    /** Decision A (and the no-regression quality result for a simple
     * amendment) preserved on replay. */
    decisionAPreserved: boolean;
    /** Decision B preserved on replay — required when rich is retained;
     * null for the simple allocation (removed components have no
     * attribution gate). */
    decisionBPreserved: boolean | null;
    /** The components the adopted rich configuration actually retains —
     * reserves are part of the frozen M contract and cannot be declared
     * away (`G2_ADOPTED_COMPONENT_REQUIREMENTS`); coverage is retained
     * only when the pilot's Decision B kept it and is declared here.
     * Absent → reserves only; never a silent per-business switch to C. */
    retainedComponents?: { reserves: boolean; coverage: boolean };
  };
  /** §8.2.5 release P/M/C attribution on the scheduled rich captures —
   * mandatory when rich is retained. */
  releaseAttribution?: G2Attribution[];
}): {
  pass: boolean;
  /** §8.2.5 mandatory evidence absent from the input. */
  missingMandatoryEvidence: string[];
  metrics: Record<string, number | null>;
  failures: string[];
} {
  const failures: string[] = [];
  const missingMandatoryEvidence: string[] = [];
  const releaseComponentMetrics = { rescuedSlots: 0, materialGains: 0 };
  const schedule = G2_RELEASE_SCHEDULES[input.allocation];
  failures.push(
    ...validateG2AttemptSchedule(
      schedule.attempts,
      input.attempts,
      input.inputs,
    ),
  );

  const selectedVariant =
    input.allocation === "richSelected" ? "rich" : "simple";
  const v3Attempts = input.attempts.filter(
    (a) => a.variant === selectedVariant,
  );

  // §8.2.1 absolute quality: all 16 selected-v3 attempts produce usable
  // final packs under bounded recovery — usable outside winning inputs is
  // not optional.
  const unusableSelected = v3Attempts.filter((a) => !attemptUsable(a));
  if (unusableSelected.length)
    failures.push(
      `${unusableSelected.length} of ${schedule.counts.selectedV3} selected-v3 packs are not usable`,
    );

  // §8.2.2 v2 comparison: mean naturalness across all ten texts, grouped by
  // each frozen input over its scheduled repeats — selected v3 non-worse
  // than matching actual v2 on every paired input. Rich pairs D1–D8 over
  // their scheduled repeats; the simple allocation pairs all 16. Held-out
  // rich attempts have no v2 pairs — absolute quality still applies.
  const pairedInputIds = [
    ...new Set(
      schedule.attempts.filter((a) => a.variant === "v2").map((a) => a.inputId),
    ),
  ];
  let v2ComparisonsChecked = 0;
  for (const inputId of pairedInputIds) {
    const v3Group = input.attempts.filter(
      (a) => a.inputId === inputId && a.variant === selectedVariant,
    );
    const v2Group = input.attempts.filter(
      (a) => a.inputId === inputId && a.variant === "v2",
    );
    if (!v3Group.length || !v2Group.length) {
      failures.push(
        `v2 comparison for ${inputId} lacks a scheduled v3/v2 pair`,
      );
      continue;
    }
    const v3Mean =
      v3Group.reduce((s, a) => s + meanAllNaturalness(a), 0) / v3Group.length;
    const v2Mean =
      v2Group.reduce((s, a) => s + meanAllNaturalness(a), 0) / v2Group.length;
    v2ComparisonsChecked += 1;
    if (v3Mean < v2Mean - EPS)
      failures.push(
        `selected-v3 mean naturalness ${v3Mean.toFixed(3)} on ${inputId} is worse than v2's ${v2Mean.toFixed(3)}`,
      );
  }

  // §8.2.3 writer contribution.
  const structurallyComplete = v3Attempts.filter(
    (a) => a.serializationComplete,
  ).length;
  if (structurallyComplete < G2_THRESHOLDS.releaseStructurallyCompleteMin)
    failures.push(
      `selected-v3 structurally complete packs ${structurallyComplete} < ${G2_THRESHOLDS.releaseStructurallyCompleteMin}`,
    );
  // Contribution counters derive from the recorded finalization origins —
  // substituted fallback text never counts as model-written (§8.2.3), and
  // contradictory origin/flag records are already rejected above.
  const modelWrittenPacks = v3Attempts.filter(
    (a) =>
      a.finalOrigins !== null &&
      a.finalOrigins
        .slice(0, UNNAMED_SLOT_IDS.length)
        .filter((o) => o === "primary" || o === "reserve").length >=
        G2_THRESHOLDS.releaseModelWrittenUnnamedMinPerPack,
  ).length;
  if (modelWrittenPacks < G2_THRESHOLDS.releaseModelWrittenPacksMin)
    failures.push(
      `packs with ≥${G2_THRESHOLDS.releaseModelWrittenUnnamedMinPerPack} model-written unnamed texts ${modelWrittenPacks} < ${G2_THRESHOLDS.releaseModelWrittenPacksMin}`,
    );
  const fullFallbacks = v3Attempts.filter(
    (a) =>
      a.finalOrigins !== null &&
      a.finalOrigins.every((o) => o === "full_fallback"),
  ).length;
  if (fullFallbacks > G2_THRESHOLDS.releaseFullFallbackMax)
    failures.push(
      `full-fallback packs ${fullFallbacks} exceed the frozen maximum ${G2_THRESHOLDS.releaseFullFallbackMax}`,
    );

  // §8.2.5 regression and attribution — mandatory gates, not optional.
  if (!input.pilotReplay)
    missingMandatoryEvidence.push(
      "pilotReplay — matching pilot captures rerun through integrated finalizers (§8.2.5)",
    );
  else {
    if (!input.pilotReplay.decisionAPreserved)
      failures.push(
        "pilot replay does not preserve Decision A (or the simple-allocation quality result)",
      );
    if (
      input.allocation === "richSelected" &&
      !input.pilotReplay.decisionBPreserved
    )
      failures.push(
        "pilot replay does not preserve Decision B for the retained rich contract",
      );
  }
  if (input.allocation === "richSelected") {
    if (!input.releaseAttribution)
      missingMandatoryEvidence.push(
        "releaseAttribution — release P/M/C attribution on scheduled rich captures (§8.2.5)",
      );
    else {
      const expectedRich = schedule.attempts.filter(
        (a) => a.variant === "rich",
      );
      const attribution = validateG2Attribution(
        input.releaseAttribution,
        expectedRich,
        input.attempts,
      );
      failures.push(...attribution.errors);
      // §8.2.5: benefit without regression for each component actually
      // retained under the adopted configuration — an unretained
      // component's regression is recorded, never an automatic failure,
      // and reserve-only rescue cannot retain coverage. Each benefit
      // route is gated on its own regression (R5 §8.1 alternatives: an
      // M–P rescue OR an independently justified C–M benefit supports
      // reserves; only a reviewed C–M gain supports coverage).
      //
      // The requirements derive from the same code-owned adopted
      // request/selection configuration the attempts are validated
      // against — the frozen rich contract carries a required reserve on
      // every unnamed slot, so reserves evidence can never be declared
      // away. Coverage is retained only when the pilot's Decision B kept
      // it and is declared here; a declaration of `reserves: false` (or
      // a declaration that omits reserves) is incompatible with the
      // recorded configuration and is rejected, never silently trusted.
      const declaredComponents = input.pilotReplay?.retainedComponents;
      const retained = {
        reserves: G2_ADOPTED_COMPONENT_REQUIREMENTS.reserves,
        coverage: declaredComponents?.coverage === true,
      };
      if (
        declaredComponents !== undefined &&
        declaredComponents.reserves !==
          G2_ADOPTED_COMPONENT_REQUIREMENTS.reserves
      )
        failures.push(
          "pilot replay retainedComponents declares reserves not retained — the adopted rich request contract is reserve-bearing, so the declaration cannot remove the required reserves evidence",
        );
      const rescued = attribution.valid.reduce(
        (n, a) => n + a.pToMRescuedSlots.length,
        0,
      );
      const rescueRegression = attribution.valid.some(
        (a) => a.mCausedFinalRegression,
      );
      const materialGains = attribution.valid.reduce(
        (n, a) => n + (a.mMechanicallyValid ? a.cOverMMaterialGains.length : 0),
        0,
      );
      const coverageRegression = attribution.valid.some(
        (a) => a.cCausedFinalRegression,
      );
      releaseComponentMetrics.rescuedSlots = rescued;
      releaseComponentMetrics.materialGains = materialGains;
      const rescueSupported = rescued >= 1 && !rescueRegression;
      const gainSupported = materialGains >= 1 && !coverageRegression;
      if (retained.reserves && !rescueSupported && !gainSupported)
        failures.push(
          "release attribution shows no relevant benefit for the retained reserves component (≥1 recorded M–P rescue or ≥1 independently justified C–M gain, each without regression on its route, required)",
        );
      if (retained.coverage && !gainSupported)
        failures.push(
          "release attribution shows no relevant C-over-M benefit for the retained coverage component (≥1 independently reviewed material gain on mechanically valid M without a C-caused regression required)",
        );
    }
  }

  // §8.2.7 resources: absolute limits over every scheduled attempt
  // (failures, timeouts, and recovery latency included), plus the selected-v3
  // sample's own mean/p95/mean-cost ceilings — the sample cannot hide inside
  // pooled controls. The held-out incremental ratios stay in
  // `evaluateG2HeldOutRetention`.
  const absolute = assessG2AbsoluteResources(
    input.attempts,
    G2_RESOURCE_LIMITS.releaseNewCallsUsageCeilingUsd,
  );
  const selectedSample = assessG2AbsoluteResources(v3Attempts, null);
  failures.push(
    ...absolute.failures,
    ...selectedSample.failures.map((f) => `selected-v3: ${f}`),
  );

  return {
    pass: failures.length === 0 && missingMandatoryEvidence.length === 0,
    missingMandatoryEvidence,
    metrics: {
      attempts: input.attempts.length,
      selectedV3Attempts: v3Attempts.length,
      usableSelectedV3: v3Attempts.length - unusableSelected.length,
      v2ComparisonsChecked,
      structurallyComplete,
      modelWrittenPacks,
      fullFallbacks,
      pToMRescuedSlots: releaseComponentMetrics.rescuedSlots,
      cOverMMaterialGains: releaseComponentMetrics.materialGains,
      meanLatencyMs: absolute.metrics.meanLatencyMs,
      p95LatencyMs: absolute.metrics.p95LatencyMs,
      totalCostUsd: absolute.metrics.totalCostUsd,
      selectedV3MeanLatencyMs: selectedSample.metrics.meanLatencyMs,
      selectedV3P95LatencyMs: selectedSample.metrics.p95LatencyMs,
      selectedV3MeanCostUsd: selectedSample.metrics.meanCostUsd,
    },
    failures,
  };
}

/** Version/identity pins so the evaluation's configuration is reproducible. */
export const G2_VERSION_PINS = {
  writerContract: V3_WRITER_CONTRACT_VERSION,
  richInstruction: V3_RICH_INSTRUCTION_VERSION,
  simpleInstruction: V3_SIMPLE_INSTRUCTION_VERSION,
  richSchema: V3_RICH_SCHEMA_VERSION,
  simpleSchema: V3_SIMPLE_SCHEMA_VERSION,
  guardPolicy: V3_GUARD_POLICY,
  selector: V3_SELECTOR_VERSION,
  fallback: V3_FALLBACK_VERSION,
  finalizer: V3_FINALIZER_VERSION,
  packet: G2_EVAL_PACKET_VERSION,
  decisionPolicy: G2_DECISION_POLICY_VERSION,
  rubric: G2_RUBRIC_VERSION,
  frozenInputs: G2_FROZEN_INPUTS_VERSION,
  usageAccounting: G2_USAGE_ACCOUNTING_VERSION,
} as const;
