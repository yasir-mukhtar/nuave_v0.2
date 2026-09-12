/** Spec 008 R5 §3.2: one map for dormant writer permissions and diagnostics. */
import {
  AUDIT_MEASUREMENT_MATRIX,
  type CanonicalMeasurementSlot,
} from "./measurement-matrix";
import { containsIndonesianComparisonIdentity } from "./questions-id";
import type { BusinessBrief } from "./types";
import type { QuestionFactsV3 } from "./question-facts-v3";

export const QUESTION_CONTEXT_VERSION = "nuave.question-context.v3.1";
type ContextField =
  | "category"
  | "marketContext"
  | "targetCustomer"
  | "customerNeeds"
  | "buyerConstraints"
  | "offerings"
  | "identity"
  | "entityScope"
  | "comparison"
  | "categorySafety"
  | "serviceChannels";
const LEGACY_FIELDS: Partial<Record<keyof BusinessBrief, ContextField>> = {
  category: "category",
  market_context: "marketContext",
  target_customer: "targetCustomer",
  verified_customer_needs: "customerNeeds",
  verified_decision_criteria: "buyerConstraints",
  verified_offerings: "offerings",
  priority_offering: "offerings",
  brand_name: "identity",
  entity_scope: "entityScope",
  verified_competitor: "comparison",
  regulated_category_notes: "categorySafety",
  // official_sources deliberately has no writer mapping.
};
const SHARED: ContextField[] = [
  "entityScope",
  "marketContext",
  "serviceChannels",
];
export const V3_CONTEXT_MAP = AUDIT_MEASUREMENT_MATRIX.map((slot) => ({
  slotId: slot.id,
  fields: [
    ...new Set<ContextField>([
      ...slot.allowedContextFields.flatMap((field) =>
        LEGACY_FIELDS[field] ? [LEGACY_FIELDS[field]!] : [],
      ),
      ...SHARED,
      ...(slot.category === "need_fit" ? ["customerNeeds" as const] : []),
    ]),
  ],
  auditedBrandIdentity: slot.auditedBrandIdentity,
  comparisonTargetIdentity: slot.comparisonTargetIdentity,
}));

export function forbiddenV3Identities(
  facts: QuestionFactsV3,
  slot: CanonicalMeasurementSlot,
) {
  return [
    ...(slot.auditedBrandIdentity === "forbidden"
      ? [
          facts.identity.brand,
          ...facts.identity.aliases,
          ...facts.identity.targets,
        ]
      : []),
    ...(slot.comparisonTargetIdentity === "forbidden"
      ? facts.identity.comparators
      : []),
  ];
}

/** This guard remains necessary even when the writer sees per-slot projections:
 * a single generation call can see the identities in named slots too. */
export function hasForbiddenV3Identity(
  value: string,
  facts: QuestionFactsV3,
  slot: CanonicalMeasurementSlot,
) {
  return forbiddenV3Identities(facts, slot).some((identity) =>
    containsIndonesianComparisonIdentity(value, identity),
  );
}

function withoutForbidden(
  value: unknown,
  facts: QuestionFactsV3,
  slot: CanonicalMeasurementSlot,
): unknown {
  if (typeof value === "string")
    return hasForbiddenV3Identity(value, facts, slot) ? null : value;
  if (Array.isArray(value))
    return value
      .map((v) => withoutForbidden(v, facts, slot))
      .filter((v) => v !== null);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        withoutForbidden(v, facts, slot),
      ]),
    );
  return value;
}

export function projectV3SlotContext(facts: QuestionFactsV3, slotId: string) {
  const slot = AUDIT_MEASUREMENT_MATRIX.find((s) => s.id === slotId);
  const permission = V3_CONTEXT_MAP.find((s) => s.slotId === slotId);
  if (!slot || !permission) throw new Error("Unknown canonical slot");
  const values: Record<ContextField, unknown> = {
    category: facts.category,
    marketContext: facts.marketContext,
    targetCustomer: facts.targetCustomer,
    customerNeeds: facts.customerNeeds,
    buyerConstraints: facts.buyerConstraints,
    offerings: facts.offerings,
    identity:
      slot.auditedBrandIdentity === "required"
        ? { brand: facts.identity.brand, aliases: facts.identity.aliases }
        : null,
    entityScope:
      slot.auditedBrandIdentity === "required"
        ? facts.entityScope
        : { kind: facts.entityScope.kind },
    comparison:
      slot.comparisonTargetIdentity === "required" ? facts.comparison : null,
    categorySafety: facts.categorySafety,
    serviceChannels: facts.serviceChannels,
  };
  return {
    slotId,
    contextVersion: QUESTION_CONTEXT_VERSION,
    // Role and safety constrain interpretation, never supply an inferred role.
    entityType: facts.entityType,
    safetyRestrictions: withoutForbidden(facts.categorySafety, facts, slot),
    safetyPolicy: {
      personalOrRegulatedRecords: "forbidden",
      individualizedHighImpactAdvice: "forbidden",
      serviceQualityClaims: "forbidden",
    },
    businessType: withoutForbidden(facts.businessType, facts, slot),
    context: Object.fromEntries(
      permission.fields.map((field) => [
        field,
        withoutForbidden(values[field], facts, slot),
      ]),
    ),
    permissions: permission,
  };
}

/** Both instruction rendering and diagnostics consume this result; no second
 * handwritten allowlist. It is internal writer input, never observation input. */
export function buildV3WriterContext(facts: QuestionFactsV3) {
  return {
    projectionVersion: facts.version,
    contextVersion: QUESTION_CONTEXT_VERSION,
    slots: AUDIT_MEASUREMENT_MATRIX.map((slot) =>
      projectV3SlotContext(facts, slot.id),
    ),
  };
}
