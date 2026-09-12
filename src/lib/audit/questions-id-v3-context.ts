import { createHash } from "node:crypto";
import type { z } from "zod";
import type { BusinessBrief } from "./types";
import {
  measurementSlotForOrder,
  type CanonicalMeasurementSlot,
  type ReportAssessmentClass,
} from "./measurement-matrix";
import {
  FIELD_OWNERSHIP,
  inferScopeSelection,
  type IntakeScreen,
} from "./workflow-authority";
import { parseSourceInput } from "./source-input";
import {
  normalizeIndonesianIdentity,
  INDONESIAN_PRIVATE_DATA_PATTERNS,
} from "./questions-id";

// Spec 008 G1 — dormant facts/context layer (R5 §3.1, §3.2, §6.1).
//
// This module is INERT: nothing in the live generation path imports it. The
// production writer still consumes the lossy v2 projection
// (`minimizeIndonesianBrief` in questions-id.ts), which §3.1 forbids reusing
// for v3. What lands here:
//
//   - `projectV3ConfirmedFacts`: the one canonical pure adapter from the
//     confirmed `BusinessBrief` handoff to the §3.1 v3 representation
//     (separate `entityScope`, market `entityType`, typed `buyerConstraints`,
//     structured `marketContext`, optional `serviceChannels`, confirmed
//     comparator, safe facts, and an identity registry that is never
//     automatically wording material);
//   - `effectiveV3Context`: the single versioned §3.2 context map —
//     effectiveV3Context(slot) = safe legacy allowlist(slot) ∪ shared context
//     ∪ explicit slot additions — which later derives both instruction
//     permissions and diagnostics (no parallel handwritten allowlist);
//   - facts revision/fingerprint binding: `v3FactsFingerprint` derives the
//     facts fingerprint from the versioned canonical adapter (R5 §4.3), so a
//     fact change invalidates suggestions while excluded non-facts (logo,
//     agency fields, raw source URLs) cannot churn the revision; and
//   - §6.1 / Review-5 F-01 correction classification: which demonstrated fact
//     deficiencies map to `INPUT_CORRECTION_REQUIRED`, and which intake screen
//     each correction targets in BOTH renderers (the existing markup and the
//     recovered intake surface navigate by the same `IntakeScreen` value).
//
// Boundary rules honoured here:
//   - absence never supplies a default area or channel;
//   - contact/payment data, raw HTML, source-only URLs, and sensitive free
//     text never enter the projection's writer-context surface;
//   - `measurement-matrix.ts` `allowedContextFields` remains the sole v2/v3
//     legacy-allowlist authority and is read, never modified.

// ---------------------------------------------------------------------------
// Contract versions
// ---------------------------------------------------------------------------

/** Version of the §3.1 facts adapter projection. Fingerprints live inside
 * this version's domain. */
export const V3_FACTS_ADAPTER_VERSION = "nuave.question-facts.v3" as const;

/** Version of the §3.2 effective-context map. */
export const V3_CONTEXT_MAP_VERSION = "nuave.question-context.v3" as const;

// ---------------------------------------------------------------------------
// §3.1 confirmed-facts representation
// ---------------------------------------------------------------------------

/**
 * The market's competitive answer level (§3.1): which kind of entity a
 * satisfactory answer should name. Derived conservatively from the confirmed
 * category/business type; `unknown` when the text gives no defensible level —
 * the adapter never invents one.
 */
export const V3_ENTITY_TYPES = [
  "retailer",
  "service",
  "venue",
  "product",
  "platform",
  "professional",
  "unknown",
] as const;
export type V3EntityType = (typeof V3_ENTITY_TYPES)[number];

/**
 * One audited-entity scope, preserved separately from identity (§3.1).
 * `value` carries the confirmed branch/location label or the audited
 * offering's name; it stays empty for a whole-brand scope so the brand name
 * lives only in the identity registry.
 */
export type V3EntityScope = {
  kind: "whole_brand" | "single_location" | "offering";
  value: string;
};

/**
 * A typed buyer constraint (§3.1). `provenance` separates confirmed
 * abstractions (approved decision criteria) from consumer preferences and
 * category inference; the latter two do not originate in this adapter — later
 * stages may add them — but the type admits them so provenance can never be
 * flattened away. `accessFulfilment` marks the safe general access/fulfilment
 * subset that §3.2 shares with every slot.
 */
export type V3BuyerConstraint = {
  value: string;
  provenance:
    "confirmed_abstraction" | "consumer_preference" | "category_inference";
  accessFulfilment: boolean;
};

/** Market, reach, and served areas kept as one separate object (§3.1). */
export type V3MarketContext = {
  /** The confirmed market/reach description (`market_context`). */
  description: string;
  /** Structured served areas from the optional facts seam; [] when unknown. */
  servedAreas: string[];
};

/** The confirmed comparison target and its slot-9 binding. `sourceUrl` is
 * provenance for local validation only — it is never writer context (R-31). */
export type V3Comparator = {
  name: string;
  scope: string;
  sourceUrl: string;
};

/**
 * The §3.1 projection of one confirmed `BusinessBrief`. Everything the writer
 * may draw on flows from this record; fields listed only for provenance or
 * guarding (identity signals, target signals, customer-supplied free text)
 * are present here but are never permitted into writer context by the §3.2
 * map.
 */
export type ConfirmedV3Facts = {
  adapterVersion: typeof V3_FACTS_ADAPTER_VERSION;
  /** Identity registry: identifiers are not automatically allowed in
   * unnamed wording. `sourceHosts` are normalized provenance signals
   * (scheme/credentials stripped), never raw URLs. */
  identity: {
    primaryName: string;
    aliases: string[];
    sourceHosts: string[];
  };
  entityScope: V3EntityScope;
  category: string;
  businessType: string;
  entityType: V3EntityType;
  offerings: string[];
  priorityOffering: string;
  targetCustomer: string;
  customerNeeds: string[];
  buyerConstraints: V3BuyerConstraint[];
  marketContext: V3MarketContext;
  /** Approved fulfilment/service channels, preserved separately from
   * geography. Empty when the optional facts seam is absent — never
   * defaulted. */
  serviceChannels: string[];
  /** The confirmed comparator for slot 9; null when the brief carries only
   * the category-level fallback name form. Unconfirmed similar-business
   * proposals are excluded. */
  comparator: V3Comparator | null;
  /** Regulated-category safety context. */
  categorySafety: { regulated: boolean; notes: string };
  /** Target-specific signals retained locally for fingerprint/diff guards;
   * never permitted into writer context (§2.1 openness / R-08). */
  targetSignals: { differentiator: string; conversionAction: string };
  /** Customer-supplied free text, provenance-labelled. Entries matching the
   * private-data patterns are dropped entirely — only the count is kept. */
  customerFacts: { value: string; provenance: "customer_supplied" }[];
  excludedSensitiveFacts: number;
};

// ---------------------------------------------------------------------------
// Projection helpers
// ---------------------------------------------------------------------------

const ENTITY_TYPE_MARKERS: readonly (readonly [V3EntityType, RegExp])[] = [
  // Order is precedence: the first matching level wins.
  [
    "professional",
    /(klinik|dokter|gigi|bidan|apoteker|konsultan|akuntan|akuntansi|advokat|pengacara|hukum|legal|notaris|arsitek|psikolog|terapis|pajak|asuransi|keuangan)/,
  ],
  [
    "platform",
    /(saas|software|aplikasi|platform|teknologi|digital|\bapp\b|sistem informasi)/,
  ],
  [
    "retailer",
    /(toko|retail|ritel|minimarket|swalayan|dealer|butik|distro|ecommerce|e-commerce|marketplace|pet ?shop|kelontong)/,
  ],
  [
    "venue",
    /(kedai|kafe|cafe|resto|restoran|warung|rumah makan|warkop|coffee|gym|fitness|studio|coworking|ruang kerja|hotel|penginapan|barbershop|barber|salon|spa|bengkel|wisma)/,
  ],
  [
    "service",
    /(jasa|servis|service|cuci|laundry|cleaning|reparasi|perbaikan|instalasi|pasang|pindahan|ekspedisi|logistik|kurir|travel|foto|fotografi|katering|catering|sewa|rental|desain|event)/,
  ],
  [
    "product",
    /(produk|brand|merek|skincare|kosmetik|makanan kemasan|minuman kemasan|fashion|pakaian|sepatu|aksesori|furnitur|elektronik|gadget|suplemen)/,
  ],
];

function deriveV3EntityType(brief: BusinessBrief): V3EntityType {
  const haystack = normalizeIndonesianIdentity(
    `${brief.brand_type} ${brief.category}`,
  );
  for (const [entityType, pattern] of ENTITY_TYPE_MARKERS) {
    if (pattern.test(haystack)) return entityType;
  }
  return "unknown";
}

/**
 * Whether the confirmed facts know any locality at all: a single-location
 * scope, at least one structured served area, or a market description that
 * names a place rather than a generic reach statement. This is a conservative
 * sufficiency signal — it never converts absence into a guessed area.
 */
const GENERIC_REACH_TERMS = new Set([
  "nasional",
  "indonesia",
  "seluruh indonesia",
  "seindonesia",
  "seluruh indonesia raya",
  "online",
  "online di indonesia",
  "online saja",
  "daring",
  "digital",
  "remote",
  "global",
  "internasional",
  "semua wilayah",
  "seluruh wilayah",
]);

function marketDescriptionIsLocal(description: string) {
  const normalized = normalizeIndonesianIdentity(description);
  return Boolean(normalized) && !GENERIC_REACH_TERMS.has(normalized);
}

/**
 * Access/fulfilment markers for the §3.2 shared layer: only constraints that
 * describe how a customer reaches or receives the offering (visit, home
 * service, delivery, booking, hours, coverage) are shared with every slot.
 * Everything else stays behind the legacy allowlist. Permission-only — this
 * widens supplied context, never what output may claim.
 */
const ACCESS_FULFILMENT_MARKERS = [
  "rumah",
  "home",
  "datang",
  "kunjung",
  "antar",
  "delivery",
  "jemput",
  "pickup",
  "booking",
  "pesan",
  "online",
  "jam buka",
  "jam operasional",
  "area",
  "layanan",
  "lokasi",
  "akses",
  "parkir",
  "cod",
] as const;

function isAccessFulfilmentConstraint(value: string) {
  const normalized = ` ${normalizeIndonesianIdentity(value)} `;
  return ACCESS_FULFILMENT_MARKERS.some((marker) =>
    normalized.includes(` ${marker} `),
  );
}

/** Channels that only make sense when a served locality is known. */
const LOCALITY_CHANNEL_MARKERS = [
  "rumah",
  "home",
  "datang",
  "kunjung",
  "antar",
  "delivery",
  "jemput",
  "tempat pelanggan",
  "lokasi pelanggan",
] as const;

function channelRequiresLocality(channel: string) {
  const normalized = ` ${normalizeIndonesianIdentity(channel)} `;
  return LOCALITY_CHANNEL_MARKERS.some((marker) =>
    normalized.includes(` ${marker} `),
  );
}

function dedupeTrimmed(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

/** Normalized provenance key for an official source: scheme and credentials
 * stripped, host plus distinguishing path kept (mirrors the v2 domain-signal
 * semantics without carrying a raw URL). */
function sourceIdentityKey(url: string): string {
  const normalized = parseSourceInput(url)?.normalizedUrl ?? "";
  return normalized
    .replace(/^https?:\/\/[^/]*@/i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

function isSensitiveFactText(value: string) {
  return INDONESIAN_PRIVATE_DATA_PATTERNS.some((pattern) =>
    pattern.test(value),
  );
}

/**
 * §3.1's one canonical facts adapter. Pure: same confirmed brief in, same v3
 * facts out. Reads the optional facts seam (`service_areas`,
 * `service_channels`) when present and leaves it absent otherwise.
 */
export function projectV3ConfirmedFacts(
  brief: BusinessBrief,
): ConfirmedV3Facts {
  const scope = inferScopeSelection(brief.brand_name, brief.entity_scope);
  const entityScope: V3EntityScope =
    scope.scopeKind === "branch"
      ? { kind: "single_location", value: scope.scopeValue }
      : scope.scopeKind === "product"
        ? { kind: "offering", value: scope.scopeValue }
        : { kind: "whole_brand", value: "" };

  const comparisonName = brief.verified_competitor.name.trim();

  const customerFacts = brief.customer_supplied_facts
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    adapterVersion: V3_FACTS_ADAPTER_VERSION,
    identity: {
      primaryName: brief.brand_name.trim(),
      aliases: dedupeTrimmed(brief.brand_name_variants),
      sourceHosts: dedupeTrimmed(brief.official_sources.map(sourceIdentityKey)),
    },
    entityScope,
    category: brief.category.trim(),
    businessType: brief.brand_type.trim(),
    entityType: deriveV3EntityType(brief),
    offerings: dedupeTrimmed(brief.verified_offerings),
    priorityOffering: brief.priority_offering.trim(),
    targetCustomer: brief.target_customer.trim(),
    customerNeeds: dedupeTrimmed(brief.verified_customer_needs),
    buyerConstraints: dedupeTrimmed(brief.verified_decision_criteria).map(
      (value) => ({
        value,
        provenance: "confirmed_abstraction" as const,
        accessFulfilment: isAccessFulfilmentConstraint(value),
      }),
    ),
    marketContext: {
      description: brief.market_context.trim(),
      servedAreas: dedupeTrimmed(brief.service_areas ?? []),
    },
    serviceChannels: dedupeTrimmed(brief.service_channels ?? []),
    comparator: comparisonName
      ? {
          name: comparisonName,
          scope: brief.verified_competitor.scope.trim(),
          sourceUrl: brief.verified_competitor.source_url.trim(),
        }
      : null,
    categorySafety: {
      regulated: Boolean(brief.regulated_category_notes.trim()),
      notes: brief.regulated_category_notes.trim(),
    },
    targetSignals: {
      differentiator: brief.usp.trim(),
      conversionAction: brief.conversion_action.trim(),
    },
    customerFacts: customerFacts
      .filter((value) => !isSensitiveFactText(value))
      .map((value) => ({ value, provenance: "customer_supplied" as const })),
    excludedSensitiveFacts:
      customerFacts.length -
      customerFacts.filter((value) => !isSensitiveFactText(value)).length,
  };
}

// ---------------------------------------------------------------------------
// Facts revision / fingerprint binding (§3.1, §4.3)
// ---------------------------------------------------------------------------

function canonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [
          key,
          canonicalJsonValue((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

/** Canonical serialization of the versioned adapter output. */
export function canonicalV3FactsJson(facts: ConfirmedV3Facts): string {
  return JSON.stringify(canonicalJsonValue(facts));
}

/**
 * The facts fingerprint (R5 §4.3): SHA-256 of the canonical UTF-8 adapter
 * output. Any confirmed-fact change — including an offering, need, channel,
 * area, comparator, or customer-fact change — produces a new revision;
 * changes to excluded non-facts (logo, agency fields, source URL detail)
 * cannot. Suggestion fingerprints bind to this revision downstream.
 */
export function v3FactsFingerprint(brief: BusinessBrief): string {
  return createHash("sha256")
    .update(canonicalV3FactsJson(projectV3ConfirmedFacts(brief)), "utf8")
    .digest("hex");
}

/** True when two confirmed briefs project to different facts revisions. */
export function v3FactsRevisionChanged(
  before: BusinessBrief,
  after: BusinessBrief,
): boolean {
  return v3FactsFingerprint(before) !== v3FactsFingerprint(after);
}

// ---------------------------------------------------------------------------
// §3.2 effectiveV3Context — the single versioned context map
// ---------------------------------------------------------------------------

/**
 * The v3 writer-context field vocabulary. `identity`, `entityScope`, … are
 * logical context fields, not brief keys; the map below gives each legacy
 * allowlist entry its v3 home.
 */
export const V3_CONTEXT_FIELDS = [
  "identity",
  "entityScope",
  "category",
  "businessType",
  "entityType",
  "offerings",
  "priorityOffering",
  "targetCustomer",
  "customerNeeds",
  "buyerConstraints",
  "marketContext",
  "serviceChannels",
  "comparator",
  "categorySafety",
] as const;
export type V3ContextField = (typeof V3_CONTEXT_FIELDS)[number];

/**
 * §3.2 "safe legacy allowlist": each `allowedContextFields` entry mapped to
 * its v3 field. `null` means the fact never becomes writer context —
 * unconfirmed proposals, derived defaults, target signals, arbitrary free
 * text, and raw URLs are excluded here, and permission to see a field is
 * never permission to copy its value (§3.2).
 */
const LEGACY_FIELD_TO_V3: Record<keyof BusinessBrief, V3ContextField | null> = {
  brand_name: "identity",
  entity_scope: "entityScope",
  brand_type: "businessType",
  category: "category",
  market_context: "marketContext",
  target_customer: "targetCustomer",
  official_sources: "identity",
  verified_offerings: "offerings",
  verified_customer_needs: "customerNeeds",
  verified_decision_criteria: "buyerConstraints",
  verified_competitor: "comparator",
  similar_businesses: null,
  brand_name_variants: "identity",
  priority_offering: "priorityOffering",
  conversion_action: null,
  customer_supplied_facts: null,
  known_accuracy_questions: null,
  usp: null,
  regulated_category_notes: "categorySafety",
  service_areas: null,
  service_channels: null,
  language: null,
  agency_name: null,
  agency_logo_data_url: null,
};

/**
 * §3.2 shared layer for slots 1–10: confirmed scope, market/reach/areas,
 * approved channels, and the safe general access/fulfilment subset of buyer
 * constraints. `buyerConstraints` appears here as a filtered projection —
 * only `accessFulfilment` entries are shared.
 */
const SHARED_V3_FIELDS: readonly V3ContextField[] = [
  "entityScope",
  "marketContext",
  "serviceChannels",
  "buyerConstraints",
];

/**
 * §3.2 explicit slot additions. Slot 2's "occasion" content is already its
 * legacy allowlist plus shared context (including confirmed locality and
 * channel), so it needs no additional field. Slot 3 alone adds the approved
 * `customerNeeds`; slots 1 and 4–10 add nothing.
 */
const SLOT_V3_ADDITIONS: Readonly<Record<number, readonly V3ContextField[]>> = {
  3: ["customerNeeds"],
};

/** The §3.2 overriding denials — applied over every slot's context. */
export const V3_CONTEXT_DENIALS = [
  "unnamed_identity_leakage",
  "unauthorized_comparator",
  "sensitive_data",
  "unsupported_premise",
  "target_fingerprinting",
  "category_safety",
] as const;
export type V3ContextDenial = (typeof V3_CONTEXT_DENIALS)[number];

export type V3ContextLayer = "legacy" | "shared" | "slot";

export type V3ContextItem = {
  field: V3ContextField;
  /** Which §3.2 layers permit this field for the slot. */
  layers: V3ContextLayer[];
  /** Whether the confirmed facts actually supply a value. */
  supplied: boolean;
  /** The supplied value (absent when `supplied` is false). */
  value?: unknown;
};

/**
 * One slot's effective writer context plus the matrix-owned restrictions that
 * travel with it. `category`, `reportAssessmentClass`, and the identity
 * policies are read from the canonical matrix — this map derives permissions
 * and diagnostics, never slot semantics.
 */
export type V3SlotContext = {
  mapVersion: typeof V3_CONTEXT_MAP_VERSION;
  slotId: string;
  order: number;
  category: CanonicalMeasurementSlot["category"];
  reportAssessmentClass: ReportAssessmentClass;
  auditedBrandIdentity: CanonicalMeasurementSlot["auditedBrandIdentity"];
  comparisonTargetIdentity: CanonicalMeasurementSlot["comparisonTargetIdentity"];
  denials: readonly V3ContextDenial[];
  items: V3ContextItem[];
};

function fieldSuppliedValue(
  facts: ConfirmedV3Facts,
  field: V3ContextField,
  viaLegacyAllowlist: boolean,
): { supplied: boolean; value?: unknown } {
  switch (field) {
    case "identity": {
      const value = facts.identity;
      return {
        supplied: Boolean(value.primaryName),
        value: {
          primaryName: value.primaryName,
          aliases: value.aliases,
          sourceHosts: value.sourceHosts,
        },
      };
    }
    case "entityScope":
      return { supplied: true, value: facts.entityScope };
    case "category":
      return { supplied: Boolean(facts.category), value: facts.category };
    case "businessType":
      return {
        supplied: Boolean(facts.businessType),
        value: facts.businessType,
      };
    case "entityType":
      return {
        supplied: facts.entityType !== "unknown",
        value: facts.entityType,
      };
    case "offerings":
      return {
        supplied: facts.offerings.length > 0,
        value: facts.offerings,
      };
    case "priorityOffering":
      return {
        supplied: Boolean(facts.priorityOffering),
        value: facts.priorityOffering,
      };
    case "targetCustomer":
      return {
        supplied: Boolean(facts.targetCustomer),
        value: facts.targetCustomer,
      };
    case "customerNeeds":
      return {
        supplied: facts.customerNeeds.length > 0,
        value: facts.customerNeeds,
      };
    case "buyerConstraints": {
      // The legacy allowlist sees every confirmed constraint; the shared
      // layer sees only the safe access/fulfilment subset (§3.2).
      const constraints = viaLegacyAllowlist
        ? facts.buyerConstraints
        : facts.buyerConstraints.filter(
            (constraint) => constraint.accessFulfilment,
          );
      return { supplied: constraints.length > 0, value: constraints };
    }
    case "marketContext":
      return {
        supplied:
          Boolean(facts.marketContext.description) ||
          facts.marketContext.servedAreas.length > 0,
        value: facts.marketContext,
      };
    case "serviceChannels":
      return {
        supplied: facts.serviceChannels.length > 0,
        value: facts.serviceChannels,
      };
    case "comparator":
      return {
        supplied: Boolean(facts.comparator),
        // R-31: the comparator's source URL stays local for provenance and is
        // never writer context.
        value: facts.comparator
          ? { name: facts.comparator.name, scope: facts.comparator.scope }
          : undefined,
      };
    case "categorySafety":
      return {
        supplied: Boolean(facts.categorySafety.notes),
        value: facts.categorySafety,
      };
  }
}

/**
 * §3.2: `effectiveV3Context(slot) = safe legacy allowlist(slot) ∪ shared
 * context ∪ explicit slot additions`, with the overriding denials recorded
 * alongside. Pure and dormant — nothing in production calls this yet.
 */
export function effectiveV3Context(
  facts: ConfirmedV3Facts,
  slotOrder: number,
): V3SlotContext {
  const slot = measurementSlotForOrder(slotOrder);
  if (!slot) {
    throw new Error(`No canonical measurement slot for order ${slotOrder}.`);
  }

  const layersByField = new Map<V3ContextField, Set<V3ContextLayer>>();
  const permit = (field: V3ContextField | null, layer: V3ContextLayer) => {
    if (!field) return;
    const layers = layersByField.get(field) ?? new Set<V3ContextLayer>();
    layers.add(layer);
    layersByField.set(field, layers);
  };

  for (const legacyField of slot.allowedContextFields) {
    permit(LEGACY_FIELD_TO_V3[legacyField], "legacy");
  }
  for (const field of SHARED_V3_FIELDS) {
    permit(field, "shared");
  }
  for (const field of SLOT_V3_ADDITIONS[slot.order] ?? []) {
    permit(field, "slot");
  }

  const items = [...layersByField.entries()].map(([field, layers]) => {
    const { supplied, value } = fieldSuppliedValue(
      facts,
      field,
      layers.has("legacy"),
    );
    return {
      field,
      layers: [...layers],
      supplied,
      ...(supplied ? { value } : {}),
    };
  });

  return {
    mapVersion: V3_CONTEXT_MAP_VERSION,
    slotId: slot.id,
    order: slot.order,
    category: slot.category,
    reportAssessmentClass: slot.reportAssessmentClass,
    auditedBrandIdentity: slot.auditedBrandIdentity,
    comparisonTargetIdentity: slot.comparisonTargetIdentity,
    denials: V3_CONTEXT_DENIALS,
    items,
  };
}

// ---------------------------------------------------------------------------
// §6.1 correction outcomes and Review-5 F-01 parse classification
// ---------------------------------------------------------------------------

export const V3_INPUT_CORRECTION_REQUIRED =
  "INPUT_CORRECTION_REQUIRED" as const;

/**
 * A §6.1 correction target: the existing fact-edit destination for one
 * demonstrated deficiency. `screen` is the shared `IntakeScreen` vocabulary —
 * the existing renderer navigates there via `showIntakeIssue`, and the
 * recovered intake surface via `onNavigateToScreen`, so one target serves
 * both renderers.
 */
export type V3CorrectionTarget = {
  field: string;
  screen: IntakeScreen;
  message: string;
};

const CORRECTION_MESSAGES: Record<string, string> = {
  brand_name: "Isi nama brand Anda.",
  official_sources:
    "Periksa sumber resmi: gunakan website publik atau profil Instagram yang valid.",
  entity_scope: "Pilih cakupan audit.",
  scopeValue: "Isi nama cabang atau produk yang akan diaudit.",
  brand_type: "Isi jenis brand.",
  category: "Pilih atau isi kategori brand.",
  market_context:
    "Isi konteks pasar, misalnya kota, area layanan, atau cakupan online.",
  target_customer: "Isi pelanggan yang ingin dipahami.",
  verified_customer_needs: "Tambahkan setidaknya satu kebutuhan pelanggan.",
  verified_decision_criteria:
    "Tambahkan setidaknya satu pertimbangan keputusan.",
  verified_offerings: "Tambahkan setidaknya satu produk atau layanan.",
  verified_competitor:
    "Konfirmasi satu bisnis pembanding atau alternatif kategori.",
  brand_name_variants:
    "Periksa nama brand lain atau kosongkan baris yang tidak digunakan.",
  usp: "Periksa differentiator tambahan atau hapus isian yang terlalu panjang.",
  customer_supplied_facts:
    "Periksa fakta tambahan atau hapus isian yang terlalu panjang.",
};

/**
 * The existing edit destination for a brief field, shared by both renderers.
 * Derived/not-collected fields without their own screen route to `review`,
 * whose readback links to the owning screen.
 */
export function v3CorrectionScreen(field: string): IntakeScreen {
  const rootField = field.split(".")[0] as keyof BusinessBrief;
  return FIELD_OWNERSHIP[rootField]?.screen ?? "review";
}

function correctionTarget(field: string, screen?: IntakeScreen) {
  return {
    field,
    screen: screen ?? v3CorrectionScreen(field),
    message:
      CORRECTION_MESSAGES[field] ??
      CORRECTION_MESSAGES[field.split(".")[0]] ??
      "Periksa kembali informasi di layar ini.",
  };
}

export type V3FactsDeficiencyKind =
  | "missing_offerings"
  | "scope_offering_conflict"
  | "role_scope_conflict"
  | "missing_locality";

export type V3FactsDeficiency = V3CorrectionTarget & {
  outcome: typeof V3_INPUT_CORRECTION_REQUIRED;
  kind: V3FactsDeficiencyKind;
};

function offeringCoversScope(offerings: string[], scopeValue: string) {
  const needle = normalizeIndonesianIdentity(scopeValue);
  if (!needle) return false;
  return offerings.some((offering) => {
    const normalized = normalizeIndonesianIdentity(offering);
    return (
      normalized === needle ||
      normalized.includes(needle) ||
      needle.includes(normalized)
    );
  });
}

function v3LocalityKnown(facts: ConfirmedV3Facts) {
  return (
    (facts.entityScope.kind === "single_location" &&
      Boolean(facts.entityScope.value)) ||
    facts.marketContext.servedAreas.length > 0 ||
    marketDescriptionIsLocal(facts.marketContext.description)
  );
}

/**
 * §6.1 `INPUT_CORRECTION_REQUIRED` detection on the projected facts: the
 * demonstrated missing/conflicting facts necessary for the confirmed scope or
 * a safe meaningful pack. Sparse optional context (absent areas/channels) is
 * never an input error by itself — absence stays unknown. Detected cases:
 *
 * - `missing_offerings`: one-offering scope with no confirmed offering;
 * - `scope_offering_conflict`: an offering-scope value no confirmed offering
 *   covers (the audited product is not among the confirmed facts);
 * - `role_scope_conflict`: a single-location scope on a product-level entity
 *   (a product has no branch);
 * - `missing_locality`: a confirmed home-visit/delivery channel or a
 *   local-service/venue entity type with no known locality anywhere.
 */
export function v3FactsDeficiencies(
  facts: ConfirmedV3Facts,
): V3FactsDeficiency[] {
  const deficiencies: V3FactsDeficiency[] = [];

  if (facts.entityScope.kind === "offering") {
    if (facts.offerings.length === 0) {
      deficiencies.push({
        outcome: V3_INPUT_CORRECTION_REQUIRED,
        kind: "missing_offerings",
        ...correctionTarget("verified_offerings", "offerings"),
      });
    } else if (
      facts.entityScope.value &&
      !offeringCoversScope(facts.offerings, facts.entityScope.value)
    ) {
      deficiencies.push({
        outcome: V3_INPUT_CORRECTION_REQUIRED,
        kind: "scope_offering_conflict",
        field: "scopeValue",
        screen: "product",
        message:
          "Produk yang diaudit tidak ada dalam daftar produk atau layanan yang dikonfirmasi.",
      });
    }
  }

  if (
    facts.entityScope.kind === "single_location" &&
    facts.entityType === "product"
  ) {
    deficiencies.push({
      outcome: V3_INPUT_CORRECTION_REQUIRED,
      kind: "role_scope_conflict",
      field: "entity_scope",
      screen: "scope",
      message:
        "Cakupan satu lokasi tidak cocok untuk entitas berbasis produk. Periksa cakupan audit.",
    });
  }

  const requiresLocality =
    facts.entityType === "venue" ||
    facts.entityType === "service" ||
    facts.serviceChannels.some(channelRequiresLocality);
  if (requiresLocality && !v3LocalityKnown(facts)) {
    deficiencies.push({
      outcome: V3_INPUT_CORRECTION_REQUIRED,
      kind: "missing_locality",
      ...correctionTarget("market_context", "market"),
    });
  }

  return deficiencies;
}

// ---------------------------------------------------------------------------
// Review-5 F-01: correctable fact deficiency versus malformed transport
// ---------------------------------------------------------------------------

export type V3PromptsRequestClassification =
  | {
      outcome: typeof V3_INPUT_CORRECTION_REQUIRED;
      targets: V3CorrectionTarget[];
    }
  | { outcome: "malformed_request" };

/**
 * Zod codes a customer can correct through the existing fact-edit screens:
 * blank/oversized text, missing array entries, malformed URLs, and failed
 * refinements. `invalid_type`, `invalid_value` (e.g. the `language` literal),
 * and everything else are malformed transport — the route's existing generic
 * failure stays in force.
 */
const CORRECTABLE_ISSUE_CODES = new Set([
  "too_small",
  "too_big",
  "invalid_format",
  "custom",
]);

function correctableFieldName(path: PropertyKey[]): string | null {
  // Route schema is `{ brief: businessBriefSchema }` — paths arrive as
  // ["brief", <field>, ...nested] — but a bare `businessBriefSchema` parse
  // produces [<field>, ...nested]; accept both.
  const index = path[0] === "brief" ? 1 : 0;
  const root = path[index];
  if (typeof root !== "string" || !(root in FIELD_OWNERSHIP)) return null;
  const nested = path[index + 1];
  return typeof nested === "string" ? `${root}.${nested}` : root;
}

/**
 * F-01's classification, mapped at G1 for the G5 wiring: a `{ brief }` parse
 * failure where every issue is a blank/missing/invalid fact the customer can
 * correct becomes `INPUT_CORRECTION_REQUIRED` with existing edit destinations;
 * anything else (wrong types, missing `brief`, wrong literal) remains the
 * generic malformed-request failure. Never synthesizes placeholder facts.
 */
export function classifyPromptsBriefParseFailure(
  error: z.ZodError,
): V3PromptsRequestClassification {
  if (!error.issues.length) return { outcome: "malformed_request" };

  const targets: V3CorrectionTarget[] = [];
  const seen = new Set<string>();
  for (const issue of error.issues) {
    const field = correctableFieldName(issue.path);
    if (!field || !CORRECTABLE_ISSUE_CODES.has(issue.code)) {
      return { outcome: "malformed_request" };
    }
    if (!seen.has(field)) {
      seen.add(field);
      targets.push(correctionTarget(field));
    }
  }
  return { outcome: V3_INPUT_CORRECTION_REQUIRED, targets };
}
