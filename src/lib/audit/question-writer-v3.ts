/** Dormant Spec 008 R5 G2 writer contract (§4.1, §8.1). No runtime consumer:
 * no route, UI, storage, or provider dispatch imports this module. Requests
 * are constructed and parsed against injected transports or synthetic
 * fixtures only; there is no default live transport. */
import { z } from "zod";
import {
  AUDIT_MEASUREMENT_MATRIX,
  type CanonicalMeasurementSlot,
} from "./measurement-matrix";
import { OPENCODEGO_BASE_URL } from "./opencodego";
import type { QuestionFactsV3 } from "./question-facts-v3";
import {
  buildV3WriterContext,
  QUESTION_CONTEXT_VERSION,
} from "./question-context-v3";

// ---------------------------------------------------------------------------
// Contract versions (code-owned; bump with any meaningful change)
// ---------------------------------------------------------------------------

export const V3_WRITER_CONTRACT_VERSION = "nuave.question-writer.v3.1";
export const V3_RICH_INSTRUCTION_VERSION =
  "nuave.question-writer-instruction.v3.1-rich";
export const V3_SIMPLE_INSTRUCTION_VERSION =
  "nuave.question-writer-instruction.v3.1-simple";
export const V3_RICH_SCHEMA_VERSION = "nuave.question-schema.v3.1-rich";
export const V3_SIMPLE_SCHEMA_VERSION = "nuave.question-schema.v3.1-simple";
/** R5 §5.1: the compatible punctuation amendment applies to v3 paths only. */
export const V3_GUARD_POLICY = "compatible-008" as const;
export const V3_EVIDENCE_POLICY_VERSION = "nuave.question-evidence.v3";

export const V3_TEXT_MAX_CHARS = 700;
export const V3_CHOICE_MAX_CHARS = 140;
export const V3_DIMENSION_LABEL_MAX_CHARS = 80;
export const V3_MAX_DIMENSIONS = 8;
export const V3_MAX_CONTEXT_REFS = 3;
export const V3_MAX_DIMENSION_IDS = 3;

const UNNAMED_SLOTS = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) => slot.auditedBrandIdentity === "forbidden",
);
const NAMED_SLOTS = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) => slot.auditedBrandIdentity === "required",
);
export const V3_UNNAMED_SLOT_IDS = UNNAMED_SLOTS.map((slot) => slot.id);
export const V3_NAMED_SLOT_IDS = NAMED_SLOTS.map((slot) => slot.id);

/** Closed context-reference vocabulary for candidate `contextRefs`. Each ref
 * must name a permitted writer-context field or the market dimension list;
 * arbitrary strings are unresolved references. */
export const V3_CONTEXT_REF_FIELDS = [
  "category",
  "entityScope",
  "marketContext",
  "targetCustomer",
  "customerNeeds",
  "buyerConstraints",
  "accessConstraints",
  "offerings",
  "comparison",
  "categorySafety",
  "serviceChannels",
  "market.dimensions",
] as const;
export type V3ContextRef = (typeof V3_CONTEXT_REF_FIELDS)[number];

export const V3_ENTITY_TYPES = [
  "retailer",
  "service",
  "venue",
  "product",
  "platform",
  "professional",
] as const;
export type V3EntityType = (typeof V3_ENTITY_TYPES)[number];

export const V3_DIMENSION_PROVENANCES = [
  "confirmed_abstraction",
  "buyer_constraint",
  "category_inference",
] as const;
export type V3DimensionProvenance = (typeof V3_DIMENSION_PROVENANCES)[number];

// ---------------------------------------------------------------------------
// Structured response schemas (§4.1)
// ---------------------------------------------------------------------------

const dimensionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,24}$/),
  label: z.string().trim().min(1).max(V3_DIMENSION_LABEL_MAX_CHARS),
  provenance: z.enum(V3_DIMENSION_PROVENANCES),
});
const candidateSchema = z.object({
  choice: z.string().trim().min(1).max(V3_CHOICE_MAX_CHARS),
  // Provenance hints are optional: missing contextRefs/dimensionIds default
  // to empty and never reject an otherwise mechanically valid text (§8.3).
  contextRefs: z
    .array(z.string().trim().min(1).max(40))
    .max(V3_MAX_CONTEXT_REFS)
    .default([]),
  dimensionIds: z.array(z.string()).max(V3_MAX_DIMENSION_IDS).default([]),
  text: z.string().trim().min(1).max(V3_TEXT_MAX_CHARS),
});
const richResponseSchema = z
  .object({
    market: z.object({
      entityType: z.enum(V3_ENTITY_TYPES),
      category: z.string().trim().min(1).max(80),
      dimensions: z.array(dimensionSchema).max(V3_MAX_DIMENSIONS),
    }),
    unnamed: z
      .array(
        z.object({
          slotId: z.string(),
          primary: candidateSchema,
          reserve: candidateSchema,
        }),
      )
      .length(6),
    named: z
      .array(
        z.object({
          slotId: z.string(),
          text: z.string().trim().min(1).max(V3_TEXT_MAX_CHARS),
        }),
      )
      .length(4),
  })
  .strict();
const simpleResponseSchema = z
  .object({
    questions: z
      .array(z.string().trim().min(1).max(V3_TEXT_MAX_CHARS))
      .length(10),
  })
  .strict();

export type V3Candidate = z.infer<typeof candidateSchema>;
export type V3RichResponse = z.infer<typeof richResponseSchema>;
export type V3SimpleResponse = z.infer<typeof simpleResponseSchema>;

/** Structural parse result: schema validity plus canonical slot/reference
 * resolution. A malformed required structure invalidates the whole response;
 * it is never partially trusted. */
export type V3ParseResult =
  | { ok: true; response: V3RichResponse }
  | {
      ok: false;
      failure:
        | "invalid_json"
        | "schema_violation"
        | "missing_or_duplicate_slots"
        | "unresolved_references";
      detail: string;
    };

/** Deterministic candidate ordering inside a slot. */
export type V3CandidatePosition = "primary" | "reserve" | "slot_fallback";

function slotCoverageFailure(
  value: V3RichResponse,
): Extract<V3ParseResult, { ok: false }> | null {
  const unnamedIds = value.unnamed.map((entry) => entry.slotId);
  const namedIds = value.named.map((entry) => entry.slotId);
  const coverageOk = (expected: readonly string[], actual: string[]) =>
    actual.length === expected.length &&
    new Set(actual).size === expected.length &&
    expected.every((id) => actual.includes(id));
  if (!coverageOk(V3_UNNAMED_SLOT_IDS, unnamedIds))
    return {
      ok: false,
      failure: "missing_or_duplicate_slots",
      detail:
        "unnamed candidates must cover the six canonical unnamed slots once each",
    };
  if (!coverageOk(V3_NAMED_SLOT_IDS, namedIds))
    return {
      ok: false,
      failure: "missing_or_duplicate_slots",
      detail: "named texts must cover the four canonical named slots once each",
    };
  const dimensionIds = new Set(value.market.dimensions.map((d) => d.id));
  if (dimensionIds.size !== value.market.dimensions.length)
    return {
      ok: false,
      failure: "unresolved_references",
      detail: "market dimension IDs must be unique",
    };
  for (const entry of value.unnamed) {
    for (const candidate of [entry.primary, entry.reserve]) {
      if (
        candidate.dimensionIds.some((id) => !dimensionIds.has(id)) ||
        candidate.contextRefs.some(
          (ref) => !V3_CONTEXT_REF_FIELDS.includes(ref as V3ContextRef),
        )
      )
        return {
          ok: false,
          failure: "unresolved_references",
          detail: `candidate for ${entry.slotId} references an unknown dimension or context field`,
        };
    }
  }
  return null;
}

/**
 * Parses a rich structured response value (already-decoded JSON from an
 * injected transport or synthetic fixture). Rejects malformed structure,
 * non-canonical slot coverage, and unresolved references; a structurally
 * valid candidate may still be rejected individually by the finalizer's
 * mechanical checks.
 */
export function parseV3RichResponse(value: unknown): V3ParseResult {
  const parsed = richResponseSchema.safeParse(value);
  if (!parsed.success)
    return {
      ok: false,
      failure: "schema_violation",
      detail: parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    };
  const coverage = slotCoverageFailure(parsed.data);
  if (coverage) return coverage;
  return { ok: true, response: parsed.data };
}

export type V3SimpleParseResult =
  | { ok: true; response: V3SimpleResponse }
  | { ok: false; failure: "schema_violation"; detail: string };

/** The simple control returns ten final strings in canonical slot order —
 * no market/decision metadata and no reserves (§8.1). */
export function parseV3SimpleResponse(value: unknown): V3SimpleParseResult {
  const parsed = simpleResponseSchema.safeParse(value);
  if (!parsed.success)
    return {
      ok: false,
      failure: "schema_violation",
      detail: parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    };
  return { ok: true, response: parsed.data };
}

// ---------------------------------------------------------------------------
// Versioned writer instruction (one source; both variants share the semantic
// core — §8.1 requires identical confirmed projection and intent/form/
// identity/safety/context instructions)
// ---------------------------------------------------------------------------

function slotLine(slot: CanonicalMeasurementSlot) {
  const brandRule =
    slot.auditedBrandIdentity === "required"
      ? "name the audited business"
      : "never name or hint at the audited business, its identifying offerings, or its official domains";
  const targetRule =
    slot.comparisonTargetIdentity === "required"
      ? "name the supplied comparison target and use an explicit comparison relation"
      : "never name the comparison target";
  return `Slot ${slot.order} (${slot.id}, ${slot.category}): ${slot.measurementPurpose}. ${slot.generatorSlotDescription} You must ${brandRule}; you must ${targetRule}.`;
}

const SHARED_SEMANTIC_INSTRUCTION = [
  "You write Indonesian questions or direct requests that a plausible prospective customer would ask an AI assistant while choosing where to buy, whom to hire, what brand to use, or which business fits their needs.",
  "Every unnamed slot (1-6) must express one concrete commercial choice whose satisfying answer names relevant businesses, providers, stores, products, brands, platforms, or professionals. A question that can be fully answered with generic advice, troubleshooting, or explanation fails this task even when it is grammatical.",
  "Keep each unnamed request competitively open: an ordinary suitable peer must be a possible answer, and the audited business must not be uniquely fingerprinted by exact prices, slogans, proprietary features, or unnecessary location precision. Consumer preferences are allowed; asserting that a specific business satisfies them is not.",
  "Write natural Indonesian for the category and audience. A question or a direct request is equally acceptable; use natural terminal punctuation (?, ., !) or none. Do not force slang, and do not translate English templates.",
  "Ask about unknown public facts as open questions; never present an unconfirmed price, stock, facility, policy, certification, availability, outcome, or reputation as already true. Do not request or assume personal, medical, financial, or otherwise regulated individual data.",
  "Use zero to three material decision criteria per question. Do not invent personas, corporate phrasing, or six paraphrases of one decision.",
  "Follow the confirmed business context exactly. Do not invent entity facts. The supplied context already withholds identifying values from unnamed slots; do not attempt to reconstruct them.",
];

export const V3_RICH_WRITER_INSTRUCTION = [
  ...SHARED_SEMANTIC_INSTRUCTION,
  "Return one compact market object, then primary and reserve candidates for the six unnamed slots, then one final text for each named slot — sixteen texts total.",
  "The market object names the confirmed category and competitive entity type plus at most eight ordinary decision dimensions a customer in this market actually weighs. Label each dimension in at most 80 characters and record its provenance: confirmed_abstraction for a confirmed input abstraction, buyer_constraint for a confirmed buyer constraint, or category_inference for an ordinary category-level inference. Dimensions are consumer decision criteria, never claims that any business has them.",
  "Each unnamed candidate records a choice description of at most 140 characters, at most three context references from the permitted vocabulary, zero to three market dimension IDs, and the final question or request text.",
  "Reserve candidates must express a materially different consumer decision for the same slot, not a rewording of the primary.",
  ...AUDIT_MEASUREMENT_MATRIX.map(slotLine),
  "Return only the structured response. No answers, rationales, predicted results, or marketing claims.",
].join("\n");

export const V3_SIMPLE_WRITER_INSTRUCTION = [
  ...SHARED_SEMANTIC_INSTRUCTION,
  "Return exactly ten final question or request strings in the canonical slot order — six unnamed texts then four named texts. No market object, decision metadata, reserves, or explanations.",
  ...AUDIT_MEASUREMENT_MATRIX.map(slotLine),
  "Return only the ten strings. No answers, rationales, predicted results, or marketing claims.",
].join("\n");

// ---------------------------------------------------------------------------
// Request construction (dormant; evaluated offline against injected transports)
// ---------------------------------------------------------------------------

export type V3WriterVariant = "rich" | "simple";

export type V3RequestSettings = {
  provider: "opencodego";
  endpoint: string;
  model: string;
  reasoningEffort: "low";
  serviceTier: "default";
  store: false;
  verbosity: "low";
  /** No web search on any generation call. */
  search: false;
  schemaMode: "json_schema_strict";
  maxOutputTokens: number;
  /** Proposed evaluation-side per-attempt timeout; the inspected v2 fetch has
   * none. Frozen in the evaluation packet; live defaults stay unchanged. */
  timeoutMs: number;
  /** Automatic SDK/transport retries stay disabled; every attempt counts. */
  retries: 0;
};

/** The evaluation-packet settings; not a grant to spend and not a live
 * default. `question-eval-g2.ts` freezes the authoritative record. */
export const V3_PROPOSED_EVALUATION_SETTINGS: V3RequestSettings = {
  provider: "opencodego",
  endpoint: `${OPENCODEGO_BASE_URL}/responses`,
  model: "gpt-5.6-luna",
  reasoningEffort: "low",
  serviceTier: "default",
  store: false,
  verbosity: "low",
  search: false,
  schemaMode: "json_schema_strict",
  // Equal cap for both variants so rich/simple stay comparable and simple
  // truncation is observable under the same contract. See the G2 packet.
  maxOutputTokens: 4_096,
  timeoutMs: 60_000,
  retries: 0,
};

/**
 * The versioned writer request: binding, instruction/schema versions, and the
 * per-slot projected writer context (the G1 context map — the only permission
 * source; no second allowlist). Role stays `factsContext`-sourced; an absent
 * entityType remains unknown to the writer.
 */
export function buildV3WriterRequest(
  facts: QuestionFactsV3,
  variant: V3WriterVariant,
) {
  return {
    contractVersion: V3_WRITER_CONTRACT_VERSION,
    instructionVersion:
      variant === "rich"
        ? V3_RICH_INSTRUCTION_VERSION
        : V3_SIMPLE_INSTRUCTION_VERSION,
    schemaVersion:
      variant === "rich" ? V3_RICH_SCHEMA_VERSION : V3_SIMPLE_SCHEMA_VERSION,
    guardPolicy: V3_GUARD_POLICY,
    contextVersion: QUESTION_CONTEXT_VERSION,
    binding: facts.binding,
    variant,
    instruction:
      variant === "rich"
        ? V3_RICH_WRITER_INSTRUCTION
        : V3_SIMPLE_WRITER_INSTRUCTION,
    writerContext: buildV3WriterContext(facts),
  };
}
export type V3WriterRequest = ReturnType<typeof buildV3WriterRequest>;

/**
 * The Responses-API-shaped body for one bounded no-search call under the
 * proposed evaluation settings. Mirrored from the v2 request shape; dormant —
 * nothing routes this to a provider in this task.
 */
export function buildV3ProviderBody(
  request: V3WriterRequest,
  settings: V3RequestSettings = V3_PROPOSED_EVALUATION_SETTINGS,
) {
  return {
    model: settings.model,
    reasoning: { effort: settings.reasoningEffort },
    store: settings.store,
    service_tier: settings.serviceTier,
    max_output_tokens: settings.maxOutputTokens,
    text: {
      format: {
        type: "json_schema" as const,
        name:
          request.variant === "rich"
            ? "nuave_question_pack_v3_rich"
            : "nuave_question_pack_v3_simple",
        // The deployed schema body is the JSON schema itself; versions are
        // carried in the request envelope, not inside the schema.
        schema:
          request.variant === "rich"
            ? V3_RICH_RESPONSE_JSON_SCHEMA
            : V3_SIMPLE_RESPONSE_JSON_SCHEMA,
        strict: true as const,
      },
      verbosity: settings.verbosity,
    },
    input: [
      { role: "developer" as const, content: request.instruction },
      {
        role: "user" as const,
        content: JSON.stringify({
          binding: request.binding,
          writerContext: request.writerContext,
        }),
      },
    ],
  };
}

/** Plain JSON-schema mirrors of the zod contracts for the provider body. */
export const V3_RICH_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    market: {
      type: "object",
      properties: {
        entityType: { type: "string", enum: [...V3_ENTITY_TYPES] },
        category: { type: "string", maxLength: 80 },
        dimensions: {
          type: "array",
          maxItems: V3_MAX_DIMENSIONS,
          items: {
            type: "object",
            properties: {
              id: { type: "string", pattern: "^[a-z0-9-]{1,24}$" },
              label: {
                type: "string",
                maxLength: V3_DIMENSION_LABEL_MAX_CHARS,
              },
              provenance: {
                type: "string",
                enum: [...V3_DIMENSION_PROVENANCES],
              },
            },
            required: ["id", "label", "provenance"],
            additionalProperties: false,
          },
        },
      },
      required: ["entityType", "category", "dimensions"],
      additionalProperties: false,
    },
    unnamed: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          slotId: { type: "string" },
          primary: { $ref: "#/$defs/candidate" },
          reserve: { $ref: "#/$defs/candidate" },
        },
        required: ["slotId", "primary", "reserve"],
        additionalProperties: false,
      },
    },
    named: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          slotId: { type: "string" },
          text: { type: "string", maxLength: V3_TEXT_MAX_CHARS },
        },
        required: ["slotId", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["market", "unnamed", "named"],
  additionalProperties: false,
  $defs: {
    candidate: {
      type: "object",
      properties: {
        choice: { type: "string", maxLength: V3_CHOICE_MAX_CHARS },
        contextRefs: {
          type: "array",
          maxItems: V3_MAX_CONTEXT_REFS,
          items: { type: "string", maxLength: 40 },
        },
        dimensionIds: {
          type: "array",
          maxItems: V3_MAX_DIMENSION_IDS,
          items: { type: "string" },
        },
        text: { type: "string", maxLength: V3_TEXT_MAX_CHARS },
      },
      required: ["choice", "text"],
      additionalProperties: false,
    },
  },
} as const;

export const V3_SIMPLE_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: { type: "string", maxLength: V3_TEXT_MAX_CHARS },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;
