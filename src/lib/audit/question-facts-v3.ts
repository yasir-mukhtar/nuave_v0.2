/** Pure facts projection. The v1 parser remains for historical callers;
 * the v2 branch projects exact confirmed direct-ten context. */
import { createHash } from "node:crypto";
import { z } from "zod";
import { businessBriefSchema } from "./types";
import { parseSourceInput } from "./source-input";
import { isSensitiveIntakeText } from "./sensitive-intake";
export { isSensitiveIntakeText } from "./sensitive-intake";
import {
  directTenContextSchema,
  type DirectTenAuditContext,
} from "./direct-ten-context-v2";
import {
  categoryComparisonFallbackName,
  normalizeIndonesianIdentity,
} from "./questions-id";

export const FACTS_PROJECTION_VERSION = "nuave.question-facts.v3.1";
export const FACTS_PROJECTION_VERSION_V2 = "nuave.question-facts.v3.2";
const text = z.string().trim().max(1000);
const list = z.array(text).max(20);
const channel = z.enum(["on_premise", "on_customer", "delivery", "online"]);
const entityType = z.enum([
  "retailer",
  "service",
  "venue",
  "product",
  "platform",
  "professional",
]);
const scope = z.object({
  kind: z.enum(["whole-brand", "branch", "offering", "unknown"]),
  name: text.nullable(),
  address: text.nullable(),
  // Confirmed non-address target detail (e.g. a product variant). Branch
  // addresses stay in `address`, separate from market context.
  detail: text.nullable().default(null),
});
const market = z.object({
  reach: z
    .enum(["local", "selected-areas", "national", "international"])
    .nullable(),
  areas: list,
});
/** Optional confirmed metadata seam, not active on any endpoint. No default role. */
const contextSchema = z.object({
  entityScope: scope.optional(),
  entityType: entityType.optional(),
  businessType: text.optional(),
  marketContext: market.optional(),
  serviceChannels: z.array(channel).max(4).optional(),
  // The R5 §3.2 approved shared subset: confirmed general access/fulfilment
  // constraints only. Never offerings, needs, identifiers, or claims.
  accessConstraints: list.optional(),
});
const localSchema = z.object({
  version: z.literal("nuave-local-intake-input-v1"),
  factVersion: z.number().int().nonnegative(),
  // UI fingerprint and reviewRows deliberately never parsed or echoed.
  confirmed: z.object({
    brand: z.object({ name: text, primarySource: text }),
    scope: z.enum(["brand", "cabang", "produk"]),
    target: z.object({ name: text, detail: text }).nullable(),
    category: text,
    offerings: list,
    customerReasons: list,
    serviceChannels: z.array(z.object({ channel })).max(4),
    market: z.object({
      reach: z.enum(["sekitar", "beberapa", "seluruh", "luar"]),
      areas: list,
    }),
    comparators: z.object({
      mode: z.enum(["named", "category-alternatives"]),
      names: list,
    }),
    publicFact: text,
  }),
});
// Recognize missing/empty required business facts as correction outcomes here.
// The production businessBriefSchema and endpoint remain unchanged.
const legacySchema = businessBriefSchema.extend({
  brand_name: text.default(""),
  entity_scope: text.default(""),
  brand_type: text.default(""),
  category: text.default(""),
  market_context: text.default(""),
  target_customer: text.default(""),
  verified_offerings: list.default([]),
  verified_customer_needs: list.default([]),
  verified_decision_criteria: list.default([]),
  official_sources: list.default([]),
  verified_competitor: z
    .object({
      name: text.default(""),
      scope: text.default(""),
      source_url: text.default(""),
    })
    .default({ name: "", scope: "", source_url: "" }),
});
const bindingSchema = z.object({
  requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
});
const requestSchema = z.union([
  bindingSchema.extend({
    intake: localSchema,
    factsContext: contextSchema.optional(),
  }),
  bindingSchema.extend({
    brief: legacySchema,
    factsRevision: z.number().int().nonnegative(),
    factsContext: contextSchema.optional(),
  }),
]);
export type FactsBinding = {
  requestId: string;
  factsRevision: number;
  factsFingerprint: string;
};
export type Correction = {
  field: string;
  code: "missing" | "conflict" | "unsafe" | "invalid_source";
  target: string | null;
};
export type QuestionFactsV3 = {
  version: typeof FACTS_PROJECTION_VERSION | typeof FACTS_PROJECTION_VERSION_V2;
  confirmedOrigins?: Record<string, "website" | "nuave" | "owner">;
  binding: FactsBinding;
  identity: {
    brand: string;
    aliases: string[];
    targets: string[];
    comparators: string[];
    /** Guard-only website signals (host/path, never URLs in writer context). */
    sourceSignals: string[];
  };
  entityScope: z.infer<typeof scope>;
  category: string;
  businessType: string | null;
  entityType: z.infer<typeof entityType> | null;
  offerings: string[];
  targetCustomer: string | null;
  customerNeeds: string[];
  differentiator?: string | null;
  buyerConstraints: {
    text: string;
    provenance: "buyer_constraint";
    permission: "legacy-criteria" | "confirmed-consideration";
    origin?: "website" | "nuave" | "owner";
  }[];
  /** Confirmed general access/fulfilment constraints, shared to every slot
   * under R5 §3.2. Empty when nothing was confirmed for this subset. */
  accessConstraints: {
    text: string;
    provenance: "buyer_constraint";
  }[];
  marketContext: z.infer<typeof market> & { description: string | null };
  serviceChannels: z.infer<typeof channel>[] | null;
  comparison: {
    kind: "named" | "category-alternatives" | "unresolved";
    name: string | null;
  };
  categorySafety: string | null;
  safeFacts: { text: string; provenance: "buyer_supplied" }[];
};

/** The v2 writer projection reads only selected, customer-confirmed meanings.
 * No required legacy brief or category/market fallback is constructed. */
export function projectQuestionFactsV2(input: {
  context: DirectTenAuditContext;
  factVersion: number;
}): FactsResult {
  const parsed = directTenContextSchema.safeParse(input.context);
  if (
    !parsed.success ||
    !Number.isInteger(input.factVersion) ||
    input.factVersion < 1
  ) {
    return { status: "INVALID_REQUEST", issues: [{ code: "invalid_shape" }] };
  }
  const context = parsed.data;
  const focus = context.focus.value;
  const source = parseSourceInput(context.identity.source);
  if (!source)
    return {
      status: "INPUT_CORRECTION_REQUIRED",
      issues: [
        { field: "identity", code: "invalid_source", target: "identity" },
      ],
    };
  const activeText = [
    context.identity.name,
    ...context.identity.aliases,
    focus.kind === "brand" ? "" : focus.name,
    focus.kind === "cabang" ? focus.address : "",
    context.category.value,
    ...context.offerings.value,
    ...(context.market?.value.areas ?? []),
    context.targetCustomer?.value ?? "",
    ...(context.customerNeeds?.value ?? []),
    ...(context.decisionConsiderations?.value ?? []),
    ...(context.comparators.value.mode === "named"
      ? context.comparators.value.names
      : []),
    context.differentiator?.value ?? "",
    context.publicFact?.value ?? "",
  ];
  if (activeText.some((value) => value && unsafe(value))) {
    return {
      status: "INPUT_CORRECTION_REQUIRED",
      issues: [{ field: "confirmed", code: "unsafe", target: "summary" }],
    };
  }
  const sourceUrl = new URL(source.normalizedUrl);
  const market = context.market?.value;
  const categoryTokens = new Set(
    normalizeIndonesianIdentity(context.category.value).split(" "),
  );
  const brandTokens = normalizeIndonesianIdentity(context.identity.name)
    .split(" ")
    .filter((token) => token.length > 3 && !categoryTokens.has(token));
  const identifying = (value: string) =>
    brandTokens.some((token) =>
      normalizeIndonesianIdentity(value).split(" ").includes(token),
    );
  const names =
    context.comparators.value.mode === "named"
      ? context.comparators.value.names
      : [];
  const facts: QuestionFactsV3 = {
    version: FACTS_PROJECTION_VERSION_V2,
    confirmedOrigins: {
      identity: context.identity.origin,
      source: context.identity.sourceOrigin,
      focus: context.focus.origin,
      category: context.category.origin,
      offerings: context.offerings.origin,
      serviceChannels: context.serviceChannels.origin,
      ...(context.market ? { market: context.market.origin } : {}),
      ...(context.targetCustomer
        ? { targetCustomer: context.targetCustomer.origin }
        : {}),
      ...(context.customerNeeds
        ? { customerNeeds: context.customerNeeds.origin }
        : {}),
      ...(context.decisionConsiderations
        ? { decisionConsiderations: context.decisionConsiderations.origin }
        : {}),
      comparators: context.comparators.origin,
      ...(context.differentiator
        ? { differentiator: context.differentiator.origin }
        : {}),
      ...(context.publicFact ? { publicFact: context.publicFact.origin } : {}),
    },
    binding: {
      requestId: "local-glm-prepare",
      factsRevision: input.factVersion,
      factsFingerprint: hash({ context, factVersion: input.factVersion }),
    },
    identity: {
      brand: context.identity.name,
      aliases: context.identity.aliases,
      targets: unique([
        ...(focus.kind === "cabang" ? [focus.name] : []),
        ...(focus.kind === "produk" && identifying(focus.name)
          ? [focus.name]
          : []),
        ...context.offerings.value.filter(identifying),
      ]),
      comparators: names,
      sourceSignals: unique([
        `${sourceUrl.hostname}${sourceUrl.pathname}`.replace(/\/+$/, ""),
        sourceUrl.hostname.replace(/^www\./, ""),
      ]),
    },
    entityScope: {
      kind:
        focus.kind === "brand"
          ? "whole-brand"
          : focus.kind === "produk"
            ? "offering"
            : "branch",
      name: focus.kind === "brand" ? null : focus.name,
      address: focus.kind === "cabang" ? focus.address : null,
      detail: null,
    },
    category: context.category.value,
    businessType: null,
    entityType: null,
    offerings: context.offerings.value,
    targetCustomer: context.targetCustomer?.value ?? null,
    customerNeeds: context.customerNeeds?.value ?? [],
    differentiator: context.differentiator?.value ?? null,
    buyerConstraints: (context.decisionConsiderations?.value ?? []).map(
      (text) => ({
        text,
        provenance: "buyer_constraint" as const,
        permission: "confirmed-consideration" as const,
        origin: context.decisionConsiderations!.origin,
      }),
    ),
    accessConstraints: [],
    marketContext: {
      reach: market
        ? (
            {
              sekitar: "local",
              beberapa: "selected-areas",
              seluruh: "national",
              luar: "international",
            } as const
          )[market.reach]
        : null,
      areas: market?.areas ?? [],
      description: null,
    },
    serviceChannels: context.serviceChannels.value,
    comparison:
      context.comparators.value.mode === "category-alternatives"
        ? { kind: "category-alternatives", name: null }
        : names.length === 1
          ? { kind: "named", name: names[0] }
          : { kind: "unresolved", name: null },
    categorySafety: null,
    safeFacts: context.publicFact
      ? [{ text: context.publicFact.value, provenance: "buyer_supplied" }]
      : [],
  };
  return {
    status: "projected",
    facts,
    limitations: [
      "competitive_role_unknown",
      ...(facts.comparison.kind === "unresolved"
        ? ["comparison_relation_unresolved" as const]
        : []),
    ],
  };
}
export type FactsResult =
  | { status: "INVALID_REQUEST"; issues: { code: "invalid_shape" }[] }
  | { status: "INPUT_CORRECTION_REQUIRED"; issues: Correction[] }
  | {
      status: "projected";
      facts: QuestionFactsV3;
      limitations: (
        "competitive_role_unknown" | "comparison_relation_unresolved"
      )[];
    };

const unsafe = isSensitiveIntakeText;

/** Bounded mechanical vocabulary for the R5 §3.2 shared subset: safe general
 * access/fulfilment constraints. It is not a semantic classifier; criteria
 * without a marker keep their original legacy-slot permission only. */
const SHARED_ACCESS_MARKERS = [
  "akses",
  "kursi roda",
  "aksesibilitas",
  "wheelchair",
  "accessibility",
  "accessible",
  "parkir",
  "parking",
  "antar",
  "pengiriman",
  "delivery",
  "deliver",
  "ambil",
  "pickup",
  "pick up",
  "takeaway",
  "take away",
  "bawa pulang",
  "ke rumah",
  "datang ke rumah",
  "kunjungan rumah",
  "home visit",
  "online",
  "daring",
  "remote",
  "virtual",
  "janji temu",
  "appointment",
  "reservasi",
  "reservation",
  "booking",
  "jam buka",
  "opening hours",
];
function isSharedAccessConstraint(value: string) {
  const normalized = ` ${normalizeIndonesianIdentity(value)} `;
  return SHARED_ACCESS_MARKERS.some((marker) =>
    normalized.includes(` ${normalizeIndonesianIdentity(marker)} `),
  );
}
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Pure parse+projection. Caller supplies confirmed facts, never preparation drafts.
 * It does not grant confirmation or execution authority to arbitrary JSON.
 */
export function parseQuestionFactsV3(value: unknown): FactsResult {
  if (
    value &&
    typeof value === "object" &&
    "intake" in value &&
    "brief" in value
  )
    return { status: "INVALID_REQUEST", issues: [{ code: "invalid_shape" }] };
  const parsed = requestSchema.safeParse(value);
  if (!parsed.success)
    return { status: "INVALID_REQUEST", issues: [{ code: "invalid_shape" }] };
  const request = parsed.data;
  const local = "intake" in request;
  const context = request.factsContext;
  const issues: Correction[] = [];
  const targetFor = (field: string): string | null => {
    if (!local)
      return (
        (
          {
            identity: "brand_name",
            identityAliases: "brand-name-variants",
            entityScope: "entity_scope",
            category: "category",
            offerings: "verified_offerings",
            customerNeeds: "verified_customer_needs",
            buyerConstraints: "verified_decision_criteria",
            accessConstraints: "verified_decision_criteria",
            targetCustomer: "target_customer",
            marketContext: "market_context",
            comparison: "verified_competitor.name",
            businessType: "brand_type",
            safeFacts: "customer-supplied-facts",
          } as Record<string, string>
        )[field] ?? null
      );
    return (
      (
        {
          identity: "s-brand-fix",
          identityAliases: "s-brand-fix",
          entityScope:
            request.intake.confirmed.scope === "brand"
              ? "s-scope"
              : request.intake.confirmed.scope === "cabang"
                ? "s-branch"
                : "s-product",
          category: "s-category",
          offerings:
            request.intake.confirmed.scope === "produk"
              ? "s-product"
              : "s-offerings",
          customerNeeds: "s-customers",
          marketContext: "s-market",
          serviceChannels: "s-service",
          comparison: "s-competitors",
          safeFacts: "s-facts",
        } as Record<string, string>
      )[field] ?? null
    );
  };
  const issue = (
    field: string,
    code: Correction["code"],
    target?: string | null,
  ) =>
    issues.push({
      field,
      code,
      target:
        target !== undefined
          ? target
          : !local && code === "invalid_source"
            ? "official_sources"
            : local && field === "entityScope" && code === "conflict"
              ? "s-scope"
              : targetFor(field),
    });
  const clean = (value: string | null | undefined, field: string) => {
    if (!value) return null;
    if (unsafe(value)) {
      issue(field, "unsafe");
      return null;
    }
    return value;
  };
  const cleanList = (values: string[], field: string) =>
    unique(values.map((v) => clean(v, field) ?? ""));
  let facts: Omit<QuestionFactsV3, "binding">;
  let source: string;
  let sources: string[];
  let revision: number;
  if ("intake" in request) {
    const input = request.intake.confirmed;
    source = input.brand.primarySource;
    sources = [source];
    revision = request.intake.factVersion;
    const kind = (
      { brand: "whole-brand", cabang: "branch", produk: "offering" } as const
    )[input.scope];
    const activeTarget = input.scope === "brand" ? null : input.target;
    if (activeTarget && !activeTarget.name) issue("entityScope", "missing");
    if (input.scope !== "brand" && !activeTarget)
      issue("entityScope", "missing");
    if (input.scope === "cabang" && !activeTarget?.detail)
      issue("entityScope", "missing");
    const projectedScope = {
      kind,
      name: clean(activeTarget?.name, "entityScope"),
      // A branch's detail is its address; a product's detail is confirmed
      // product information. Both stay on the scope, never in marketContext.
      address:
        kind === "branch" ? clean(activeTarget?.detail, "entityScope") : null,
      detail:
        kind === "offering" ? clean(activeTarget?.detail, "entityScope") : null,
    };
    // An extension cannot replace a value the accepted UI explicitly confirmed.
    if (
      context?.entityScope &&
      (context.entityScope.kind !== kind ||
        context.entityScope.name !== (activeTarget?.name ?? null) ||
        context.entityScope.address !==
          (kind === "branch" ? (activeTarget?.detail ?? null) : null) ||
        (context.entityScope.detail ?? null) !==
          (kind === "offering" ? (activeTarget?.detail ?? null) : null))
    )
      issue("entityScope", "conflict");
    if (context?.marketContext) issue("marketContext", "conflict");
    if (context?.serviceChannels) issue("serviceChannels", "conflict");
    const areaBased =
      input.market.reach === "sekitar" || input.market.reach === "beberapa";
    const comparators = cleanList(input.comparators.names, "comparison");
    if (
      input.comparators.mode === "category-alternatives" &&
      comparators.length
    )
      issue("comparison", "conflict");
    if (input.comparators.mode === "named" && !comparators.length)
      issue("comparison", "missing");
    facts = {
      version: FACTS_PROJECTION_VERSION,
      identity: {
        brand: clean(input.brand.name, "identity") ?? "",
        aliases: [],
        // Filled below: only identifying target names are forbidden in
        // unnamed slots, so an ordinary product target stays usable.
        targets: [],
        comparators,
        sourceSignals: [],
      },
      entityScope: projectedScope,
      category: clean(input.category, "category") ?? "",
      businessType: clean(context?.businessType, "businessType"),
      entityType: context?.entityType ?? null,
      offerings: cleanList(
        kind === "offering"
          ? activeTarget
            ? [activeTarget.name]
            : []
          : input.offerings,
        "offerings",
      ),
      targetCustomer: null,
      customerNeeds: cleanList(input.customerReasons, "customerNeeds"),
      buyerConstraints: [],
      accessConstraints: cleanList(
        context?.accessConstraints ?? [],
        "accessConstraints",
      ).map((text) => ({ text, provenance: "buyer_constraint" as const })),
      marketContext: {
        reach: (
          {
            sekitar: "local",
            beberapa: "selected-areas",
            seluruh: "national",
            luar: "international",
          } as const
        )[input.market.reach],
        areas: areaBased ? cleanList(input.market.areas, "marketContext") : [],
        description: null,
      },
      serviceChannels: [
        ...new Set(input.serviceChannels.map((c) => c.channel)),
      ],
      comparison:
        input.comparators.mode === "category-alternatives"
          ? {
              kind: "category-alternatives",
              name: categoryComparisonFallbackName(input.category),
            }
          : comparators.length === 1
            ? { kind: "named", name: comparators[0] }
            : { kind: "unresolved", name: null },
      categorySafety: null,
      safeFacts: cleanList([input.publicFact], "safeFacts").map((text) => ({
        text,
        provenance: "buyer_supplied",
      })),
    };
    if (areaBased && !facts.marketContext.areas.length)
      issue("marketContext", "missing");
    // Optional unsafe free text does not enter any result, fingerprint or capture.
    // Later finalization may admit reviewed safe facts; G1 never copies fragments.
  } else {
    const input = request.brief;
    if (
      context?.businessType &&
      input.brand_type &&
      context.businessType !== input.brand_type
    )
      issue("businessType", "conflict");
    source = input.official_sources[0] ?? "";
    sources = input.official_sources;
    revision = request.factsRevision;
    const comparisonName = clean(input.verified_competitor.name, "comparison");
    const categoryAlternative =
      comparisonName === categoryComparisonFallbackName(input.category);
    facts = {
      version: FACTS_PROJECTION_VERSION,
      identity: {
        brand: clean(input.brand_name, "identity") ?? "",
        aliases: cleanList(input.brand_name_variants, "identityAliases"),
        targets: cleanList(
          context?.entityScope?.name && context.entityScope.kind !== "offering"
            ? [context.entityScope.name]
            : [],
          "entityScope",
        ),
        comparators: cleanList(
          [
            ...(categoryAlternative
              ? []
              : comparisonName
                ? [comparisonName]
                : []),
            ...(input.similar_businesses ?? []).flatMap((b) =>
              b.name ? [b.name] : [],
            ),
          ],
          "comparison",
        ),
        sourceSignals: [],
      },
      entityScope: context?.entityScope
        ? {
            kind: context.entityScope.kind,
            name: clean(context.entityScope.name, "entityScope"),
            address: clean(context.entityScope.address, "entityScope"),
            detail: clean(context.entityScope.detail, "entityScope"),
          }
        : {
            kind: "unknown",
            name: clean(input.entity_scope, "entityScope"),
            address: null,
            detail: null,
          },
      category: clean(input.category, "category") ?? "",
      businessType: clean(
        context?.businessType ?? input.brand_type,
        "businessType",
      ),
      entityType: context?.entityType ?? null,
      offerings: cleanList(
        [...input.verified_offerings, input.priority_offering],
        "offerings",
      ),
      targetCustomer: clean(input.target_customer, "targetCustomer"),
      customerNeeds: cleanList(input.verified_customer_needs, "customerNeeds"),
      buyerConstraints: cleanList(
        input.verified_decision_criteria,
        "buyerConstraints",
      ).map((text) => ({
        text,
        provenance: "buyer_constraint",
        permission: "legacy-criteria" as const,
      })),
      // §3.2 shared subset: the typed seam plus legacy criteria matching the
      // bounded access/fulfilment vocabulary. Arbitrary criteria are never
      // promoted out of their legacy slots.
      accessConstraints: cleanList(
        [
          ...(context?.accessConstraints ?? []),
          ...input.verified_decision_criteria.filter(isSharedAccessConstraint),
        ],
        "accessConstraints",
      ).map((text) => ({ text, provenance: "buyer_constraint" as const })),
      marketContext: {
        reach: context?.marketContext?.reach ?? null,
        areas:
          context?.marketContext?.reach === "national" ||
          context?.marketContext?.reach === "international"
            ? []
            : cleanList(context?.marketContext?.areas ?? [], "marketContext"),
        description: clean(input.market_context, "marketContext"),
      },
      serviceChannels: context?.serviceChannels
        ? [...new Set(context.serviceChannels)]
        : null,
      comparison: {
        kind: categoryAlternative ? "category-alternatives" : "named",
        name: comparisonName,
      },
      categorySafety: clean(input.regulated_category_notes, "categorySafety"),
      safeFacts: cleanList(input.customer_supplied_facts, "safeFacts").map(
        (text) => ({ text, provenance: "buyer_supplied" }),
      ),
    };
  }
  // Every confirmed source keeps a guard signal: website host/path signals stay
  // code-owned (never writer context); Instagram handles become aliases.
  for (const candidate of sources) {
    const parsedSource = parseSourceInput(candidate);
    if (!parsedSource) {
      issue("identity", "invalid_source");
      continue;
    }
    if (parsedSource.sourceType === "instagram") {
      const handle = new URL(parsedSource.normalizedUrl).pathname
        .split("/")
        .filter(Boolean)[0];
      // Source-derived values are screened like any retained value: a handle
      // that is really a phone number is a correctable source problem.
      if (handle) {
        if (unsafe(handle))
          issue(
            "identity",
            "unsafe",
            local ? "s-brand-fix" : "official_sources",
          );
        else
          facts.identity.aliases = unique([...facts.identity.aliases, handle]);
      }
      continue;
    }
    const url = new URL(parsedSource.normalizedUrl);
    const hostPath = `${url.hostname}${url.pathname}`.replace(/\/+$/, "");
    facts.identity.sourceSignals = unique([
      ...facts.identity.sourceSignals,
      hostPath,
      url.hostname.replace(/^www\./, ""),
    ]);
  }
  if (!sources.length) issue("identity", "invalid_source");
  // Known branded offerings are identity signals, not safe unnamed
  // abstractions. A branch name always identifies the audited location; a
  // product target is identifying only when it carries a distinctive brand
  // token, so an ordinary confirmed offering stays usable in unnamed context.
  const categoryTokens = new Set(
    normalizeIndonesianIdentity(facts.category).split(" "),
  );
  const distinctiveTokens = normalizeIndonesianIdentity(facts.identity.brand)
    .split(" ")
    .filter((token) => token.length > 3 && !categoryTokens.has(token));
  const carriesBrandToken = (value: string) => {
    const tokens = normalizeIndonesianIdentity(value).split(" ");
    return distinctiveTokens.some((token) => tokens.includes(token));
  };
  facts.identity.targets = unique([
    ...facts.identity.targets,
    ...(facts.entityScope.kind === "branch" && facts.entityScope.name
      ? [facts.entityScope.name]
      : []),
    ...(facts.entityScope.kind === "offering" &&
    facts.entityScope.name &&
    carriesBrandToken(facts.entityScope.name)
      ? [facts.entityScope.name]
      : []),
    ...facts.offerings.filter(carriesBrandToken),
  ]);
  if (!facts.identity.brand) issue("identity", "missing");
  if (!facts.category) issue("category", "missing");
  if (!facts.offerings.length) issue("offerings", "missing");
  if (facts.entityScope.kind === "unknown" && !facts.entityScope.name)
    issue("entityScope", "missing");
  if (facts.comparison.kind === "named" && !facts.comparison.name)
    issue("comparison", "missing");
  if (facts.entityScope.kind === "offering" && !facts.entityScope.name)
    issue("entityScope", "missing");
  if (
    facts.entityScope.kind === "branch" &&
    (!facts.entityScope.name || !facts.entityScope.address)
  )
    issue("entityScope", "missing");
  if (
    (facts.marketContext.reach === "local" ||
      facts.marketContext.reach === "selected-areas") &&
    !facts.marketContext.areas.length
  )
    issue("marketContext", "missing");
  if (facts.entityScope.kind === "branch" && facts.entityType === "product")
    issue("entityScope", "conflict");
  // Known absence of optional role/channels/needs is not a demonstrated error.
  if (issues.length)
    return {
      status: "INPUT_CORRECTION_REQUIRED",
      issues: issues.filter(
        (item, i) =>
          issues.findIndex(
            (other) => JSON.stringify(other) === JSON.stringify(item),
          ) === i,
      ),
    };
  const limitations: Extract<
    FactsResult,
    { status: "projected" }
  >["limitations"] = [];
  if (!facts.entityType) limitations.push("competitive_role_unknown");
  if (facts.comparison.kind === "unresolved")
    limitations.push("comparison_relation_unresolved");
  return {
    status: "projected",
    facts: {
      ...facts,
      binding: {
        requestId: request.requestId,
        factsRevision: revision,
        // Active meaning and source provenance stay bound: any confirmed
        // change — not just the caller's revision counters — invalidates
        // earlier suggestions. Cosmetic fields (agency name/logo) stay out.
        factsFingerprint: hash(
          "intake" in request
            ? {
                facts,
                source,
                optionalFact: request.intake.confirmed.publicFact,
              }
            : {
                facts,
                source,
                sources: request.brief.official_sources,
                comparator: request.brief.verified_competitor,
                similarBusinesses: request.brief.similar_businesses ?? [],
                optionalFact: [
                  request.brief.customer_supplied_facts,
                  request.brief.usp,
                ],
                unprojected: [
                  request.brief.conversion_action,
                  request.brief.known_accuracy_questions,
                ],
              },
        ),
      },
    },
    limitations,
  };
}

/** Policy revisions are intentionally not inputs: reconciliation must not
 * invalidate approved wording. Binding is checked again by future G5 callers. */
export function isCurrentFactsResponse(
  response: FactsBinding,
  current: FactsBinding,
) {
  return (
    response.requestId === current.requestId &&
    response.factsRevision === current.factsRevision &&
    response.factsFingerprint === current.factsFingerprint
  );
}
