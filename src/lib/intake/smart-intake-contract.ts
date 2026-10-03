import { z } from "zod";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  directTenContextSchema,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import {
  isSensitiveIntakeText,
  unsafePublicSource,
} from "../audit/sensitive-intake";
import {
  parseSourceInput,
  samePublicSourceHost,
  type ParsedSourceInput,
} from "../audit/source-input";
import {
  INTAKE_TEXT_RESTRICTED_MESSAGE,
  type ExtractionDraft,
} from "../audit/types";

export const SMART_INTAKE_INPUT_VERSION =
  "nuave-local-intake-input-v2" as const;
export const SMART_INTAKE_STORAGE_KEY = "nuave.localIntake.v8" as const;

type Origin = "website" | "nuave" | "owner";
export type PreparedMeaning<T> = Readonly<{
  proposed: T | null;
  origin: "website" | "nuave";
}>;

/** A location the business itself publishes (Spec 013 R-24). `sourceUrl` is
 * the public page on the business's own canonical source that publishes the
 * address — a location whose source cannot be attributed to that host is
 * dropped at preparation, never merely unlabeled (PR #98 M2, applied in J4). */
export type PreparedLocation = Readonly<{
  name: string;
  address: string;
  sourceUrl: string;
}>;

/** One Nuave category suggestion bound to one published offering. `offering`
 * repeats the offering's exact text so a suggestion cannot drift. */
export type PreparedOfferingCategory = Readonly<{
  offering: string;
  category: string;
}>;

export type PreparedUnderstanding = Readonly<{
  typedName: string;
  discoveredName: string | null;
  canonicalSource: string;
  aliases: string[];
  focus: PreparedMeaning<"brand">;
  category: PreparedMeaning<string>;
  offerings: PreparedMeaning<string[]>;
  serviceChannels: PreparedMeaning<
    DirectTenAuditContext["serviceChannels"]["value"]
  >;
  marketReach: PreparedMeaning<"sekitar" | "beberapa" | "seluruh" | "luar">;
  marketAreas: PreparedMeaning<string[]>;
  locations: PreparedMeaning<PreparedLocation[]>;
  categorySuggestions: PreparedMeaning<string[]>;
  offeringCategorySuggestions: PreparedMeaning<PreparedOfferingCategory[]>;
  targetCustomer: PreparedMeaning<string>;
  customerNeeds: PreparedMeaning<string[]>;
  decisionConsiderations: PreparedMeaning<string[]>;
  comparatorSuggestions: PreparedMeaning<string[]>;
  differentiator: PreparedMeaning<string>;
  sourceLinks: string[];
}>;

export type SmartSelection = {
  name: string;
  nameOrigin: Origin;
  /** Other names the business goes by (R-21/R-22): seeded from the
   * prepared `brand_name_variants`, owner-editable on the review, frozen as
   * `identity.aliases`. */
  aliases: string[];
  focus: "brand" | "produk" | "cabang";
  productTarget: string;
  locationName: string;
  locationAddress: string;
  category: string;
  /** How the current category was picked: the prepared main category, one of
   * the active focus's suggestions, or typed by the owner (R-05). */
  categoryKind: "main" | "suggestion" | "manual";
  offerings: string[];
  serviceChannels: DirectTenAuditContext["serviceChannels"]["value"];
  marketReach: "sekitar" | "beberapa" | "seluruh" | "luar" | "";
  marketAreas: string[];
  retainedBrandReach: "sekitar" | "beberapa" | "seluruh" | "luar" | "";
  retainedBrandAreas: string[];
  targetCustomer: string;
  customerNeeds: string[];
  decisionConsiderations: string[];
  comparatorMode: "unknown" | "named" | "category-alternatives";
  comparatorNames: string[];
  differentiator: string;
  publicFact: string;
  origins: Record<string, Origin>;
};

export type FrozenSmartIntake = {
  version: typeof SMART_INTAKE_INPUT_VERSION;
  factVersion: number;
  fingerprint: string;
  context: DirectTenAuditContext;
};

const frozenSchema = z
  .object({
    version: z.literal(SMART_INTAKE_INPUT_VERSION),
    factVersion: z.number().int().positive(),
    fingerprint: z.string().min(1).max(60_000),
    context: directTenContextSchema,
  })
  .strict();

export function smartFingerprint(
  input: Pick<FrozenSmartIntake, "factVersion" | "context">,
) {
  return JSON.stringify({
    factVersion: input.factVersion,
    context: input.context,
  });
}

export function parseFrozenSmartIntake(
  value: unknown,
): FrozenSmartIntake | null {
  const parsed = frozenSchema.safeParse(value);
  return parsed.success &&
    parsed.data.fingerprint === smartFingerprint(parsed.data)
    ? parsed.data
    : null;
}

function unique(values: string[], limit: number) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLocaleLowerCase("id-ID");
      if (!value || seen.has(key) || seen.size >= limit) return false;
      seen.add(key);
      return true;
    });
}

/** Source URLs are public inputs, but credential-like text in their path or
 * query is never retained with the intake. */
export function unsafeSmartSource(value: string): boolean {
  return unsafePublicSource(value);
}

export function unsafeSmartName(value: string): boolean {
  return isSensitiveIntakeText(value);
}

export function unsafeSmartSelection(selection: SmartSelection): boolean {
  return [
    selection.name,
    selection.productTarget,
    selection.locationName,
    selection.locationAddress,
    selection.category,
    ...selection.offerings,
    ...selection.marketAreas,
    selection.targetCustomer,
    ...selection.customerNeeds,
    ...selection.decisionConsiderations,
    ...selection.comparatorNames,
    ...selection.aliases,
    selection.differentiator,
    selection.publicFact,
  ].some((value) => value && isSensitiveIntakeText(value));
}

function immutable<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}

/** One extraction response becomes immutable proposals; market prose never
 * supplies structured reach, areas, or service channels. */
export function prepareUnderstanding(input: {
  typedName: string;
  discoveredName: string | null;
  canonicalSource: string;
  draft: ExtractionDraft;
}): PreparedUnderstanding {
  const source = parseSourceInput(input.canonicalSource);
  if (!source || !input.typedName.trim())
    throw new Error("Nama dan sumber bisnis belum valid.");
  const draft = input.draft;
  // The route payload is boundary JSON: defend the J3 lists the same way the
  // optional similar_businesses list is defended, so a stale or malformed
  // draft cannot throw inside a `.map`.
  const publishedLocations = Array.isArray(draft.published_locations)
    ? draft.published_locations
    : [];
  const categorySuggestions = Array.isArray(draft.category_suggestions)
    ? draft.category_suggestions
    : [];
  const offeringCategorySuggestions = Array.isArray(
    draft.offering_category_suggestions,
  )
    ? draft.offering_category_suggestions
    : [];
  const preparedText = [
    input.typedName,
    input.discoveredName ?? "",
    draft.category,
    ...draft.verified_offerings,
    draft.target_customer,
    ...draft.verified_customer_needs,
    ...draft.verified_decision_criteria,
    ...(draft.similar_businesses ?? []).map((item) => item.name ?? ""),
    ...draft.brand_name_variants,
    draft.usp,
    ...draft.market_areas,
  ];
  if (
    preparedText.some((value) => value && isSensitiveIntakeText(value)) ||
    unsafeSmartSource(source.normalizedUrl) ||
    draft.evidence.some((item) => unsafeSmartSource(item.source_url))
  ) {
    throw new Error(INTAKE_TEXT_RESTRICTED_MESSAGE);
  }
  // Spec 013 J3/R-25: the new extracted lists screen per item — a branch
  // address that also prints a phone/WhatsApp number, an email or a link
  // drops only that location, never the whole reading. Nothing from a
  // dropped item is stored.
  const safeLocations = publishedLocations.filter(
    (item) =>
      !(typeof item?.name === "string" && isSensitiveIntakeText(item.name)) &&
      !(
        typeof item?.address === "string" && isSensitiveIntakeText(item.address)
      ) &&
      !(
        typeof item?.source_url === "string" &&
        unsafeSmartSource(item.source_url)
      ),
  );
  const safeCategorySuggestions = categorySuggestions.filter(
    (item) => typeof item === "string" && !isSensitiveIntakeText(item),
  );
  const safeOfferingSuggestions = offeringCategorySuggestions.filter(
    (item) =>
      !(
        typeof item?.offering === "string" &&
        isSensitiveIntakeText(item.offering)
      ) &&
      !(
        typeof item?.category === "string" &&
        isSensitiveIntakeText(item.category)
      ),
  );
  const areas = unique(draft.market_areas, 8);
  const reach = draft.market_reach || null;
  const offerings = unique(draft.verified_offerings, 12);
  const seenLocations = new Set<string>();
  const locations = safeLocations
    .flatMap((item) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const address =
        typeof item?.address === "string" ? item.address.trim() : "";
      if (!name || !address) return [];
      const itemSource = parseSourceInput(
        typeof item.source_url === "string" ? item.source_url : "",
      );
      // PR #98 M2, applied in J4: a location counts as published by the
      // business only when the page that carries its address sits on the
      // canonical source host. A foreign host, an unparsable URL, or no URL
      // drops the location entirely — the check runs before dedupe so a
      // discarded row cannot consume another row's slot.
      if (!itemSource || !locationPublishedOnCanonical(source, itemSource))
        return [];
      const key = `${name.toLocaleLowerCase("id-ID")}::${address.toLocaleLowerCase("id-ID")}`;
      if (seenLocations.has(key) || seenLocations.size >= 8) return [];
      seenLocations.add(key);
      return [{ name, address, sourceUrl: itemSource.normalizedUrl }];
    })
    .slice(0, 8);
  // A suggestion binds to its offering by repeating the offering's text; an
  // entry whose offering is not in the prepared list is dropped, and only the
  // first suggestion per offering survives (Spec 013 R-24).
  const offeringKey = (value: string) =>
    value.trim().toLocaleLowerCase("id-ID");
  const seenOfferings = new Set<string>();
  const perOffering = safeOfferingSuggestions.flatMap((item) => {
    const category =
      typeof item?.category === "string" ? item.category.trim() : "";
    const match = offerings.find(
      (offering) =>
        offeringKey(offering) ===
        offeringKey(typeof item?.offering === "string" ? item.offering : ""),
    );
    if (!match || !category || seenOfferings.has(offeringKey(match))) return [];
    seenOfferings.add(offeringKey(match));
    return [{ offering: match, category }];
  });
  const sourceLinks = unique(
    draft.evidence
      .map((item) => item.source_url)
      .filter((url) => Boolean(parseSourceInput(url))),
    12,
  );
  return immutable({
    typedName: input.typedName.trim(),
    discoveredName:
      input.discoveredName?.trim() &&
      input.discoveredName.trim() !== input.typedName.trim()
        ? input.discoveredName.trim()
        : null,
    canonicalSource: source.normalizedUrl,
    aliases: unique(
      draft.brand_name_variants.filter((alias) => alias.trim().length <= 160),
      12,
    ),
    focus: { proposed: "brand", origin: "nuave" },
    category: { proposed: draft.category.trim() || null, origin: "website" },
    offerings: {
      proposed: offerings,
      origin: "website",
    },
    serviceChannels: {
      proposed: [...new Set(draft.service_channels)],
      origin: "website",
    },
    marketReach: { proposed: reach, origin: "website" },
    marketAreas: { proposed: areas, origin: "website" },
    // Published locations are website facts; the category suggestions are
    // Nuave's own proposals — they may never wear the "Dari website Anda"
    // label (Spec 013 R-24). The prepared main category keeps its label.
    locations: { proposed: locations, origin: "website" },
    categorySuggestions: {
      proposed: unique(safeCategorySuggestions, 3),
      origin: "nuave",
    },
    offeringCategorySuggestions: {
      proposed: perOffering,
      origin: "nuave",
    },
    targetCustomer: {
      proposed: draft.target_customer.trim() || null,
      origin: "nuave",
    },
    customerNeeds: {
      proposed: unique(draft.verified_customer_needs, 12),
      origin: "nuave",
    },
    decisionConsiderations: {
      proposed: unique(draft.verified_decision_criteria, 12),
      origin: "nuave",
    },
    comparatorSuggestions: {
      proposed: unique(
        (draft.similar_businesses ?? []).map((item) => item.name ?? ""),
        5,
      ),
      origin: "nuave",
    },
    differentiator: { proposed: draft.usp.trim() || null, origin: "nuave" },
    sourceLinks,
  });
}

/**
 * Spec 013 J4 (PR #98 M2): a published location may wear `Dari website Anda`
 * only when the page publishing its address lives on the business's own
 * canonical source host — `www.` equivalence allowed, subdomains and
 * lookalikes rejected. When the canonical source is an Instagram profile the
 * check is stricter: every post shares the instagram.com host, so only the
 * profile URL itself qualifies.
 */
function locationPublishedOnCanonical(
  canonical: ParsedSourceInput,
  itemSource: ParsedSourceInput,
): boolean {
  if (
    canonical.sourceType === "instagram" ||
    itemSource.sourceType === "instagram"
  ) {
    return (
      canonical.sourceType === "instagram" &&
      itemSource.sourceType === "instagram" &&
      canonical.normalizedUrl.toLocaleLowerCase("id-ID") ===
        itemSource.normalizedUrl.toLocaleLowerCase("id-ID")
    );
  }
  return samePublicSourceHost(
    canonical.normalizedUrl,
    itemSource.normalizedUrl,
  );
}

/**
 * The prepared locations the J4 screens may list as `Dari website Anda`. The
 * preparation boundary already host-screens them; this re-check keeps a
 * restored or hand-edited session record from displaying a foreign page
 * under the website label, and drops malformed rows outright.
 */
export function usablePublishedLocations(
  prepared: PreparedUnderstanding,
): PreparedLocation[] {
  const canonical = parseSourceInput(prepared.canonicalSource);
  if (!canonical) return [];
  return (prepared.locations.proposed ?? []).filter((item) => {
    if (
      typeof item?.name !== "string" ||
      typeof item?.address !== "string" ||
      typeof item?.sourceUrl !== "string"
    )
      return false;
    const itemSource = parseSourceInput(item.sourceUrl);
    return Boolean(
      itemSource && locationPublishedOnCanonical(canonical, itemSource),
    );
  });
}

/** Case-insensitive text match for deduping category options (R-13). */
function sameCategoryText(a: string, b: string): boolean {
  return (
    a.trim().toLocaleLowerCase("id-ID") === b.trim().toLocaleLowerCase("id-ID")
  );
}

/**
 * The category suggestions that fit the active focus (R-13/R-24): a product
 * focus uses the suggestion bound to the selected offering, while brand and
 * location focuses share the whole-brand suggestions (location focus uses
 * the whole-brand list — founder, 2026-09-27).
 */
export function categorySuggestionsFor(
  prepared: PreparedUnderstanding,
  selection: Pick<SmartSelection, "focus" | "productTarget">,
): string[] {
  if (selection.focus === "produk") {
    const key = selection.productTarget.trim().toLocaleLowerCase("id-ID");
    const entry = (prepared.offeringCategorySuggestions.proposed ?? []).find(
      (item) => item.offering.trim().toLocaleLowerCase("id-ID") === key,
    );
    return key && entry ? [entry.category] : [];
  }
  return prepared.categorySuggestions.proposed ?? [];
}

/**
 * R-05: after the focus — or the product target — changes, the category is
 * re-resolved. A category the owner typed (`manual`) stays selected; a
 * suggestion stays only while the new focus also suggests it; otherwise the
 * new focus's first suggestion is pre-selected (`Saran Nuave`), or the
 * prepared main category when that focus has none.
 */
export function syncSmartCategory(
  prepared: PreparedUnderstanding,
  selection: SmartSelection,
): SmartSelection {
  const suggestions = categorySuggestionsFor(prepared, selection);
  const current = selection.category.trim();
  if (selection.categoryKind === "manual" && current) return selection;
  if (current && suggestions.some((item) => sameCategoryText(item, current)))
    return selection;
  if (suggestions.length)
    return {
      ...selection,
      category: suggestions[0]!,
      categoryKind: "suggestion",
      origins: { ...selection.origins, category: "nuave" },
    };
  const main = prepared.category.proposed?.trim() ?? "";
  if (main)
    return {
      ...selection,
      category: prepared.category.proposed!,
      categoryKind: "main",
      origins: { ...selection.origins, category: "website" },
    };
  return { ...selection, category: "", categoryKind: "manual" };
}

/**
 * Focus selection (R-05/R-10): switching focus clears the target fields that
 * no longer apply, while the whole-brand market answers are retained across
 * a cabang detour so returning to brand restores them unchanged. The category
 * is re-resolved for the new focus (AC-16).
 */
export function selectSmartFocus(
  prepared: PreparedUnderstanding,
  selection: SmartSelection,
  focus: SmartSelection["focus"],
): SmartSelection {
  if (focus === selection.focus) return selection;
  const retainedBrandReach =
    selection.focus === "cabang"
      ? selection.retainedBrandReach
      : selection.marketReach;
  const retainedBrandAreas =
    selection.focus === "cabang"
      ? selection.retainedBrandAreas
      : selection.marketAreas;
  return syncSmartCategory(prepared, {
    ...selection,
    focus,
    productTarget: focus === "produk" ? selection.productTarget : "",
    locationName: focus === "cabang" ? selection.locationName : "",
    locationAddress: focus === "cabang" ? selection.locationAddress : "",
    marketReach: focus === "cabang" ? "" : retainedBrandReach,
    marketAreas: focus === "cabang" ? [] : retainedBrandAreas,
    retainedBrandReach,
    retainedBrandAreas,
    origins: { ...selection.origins, focus: "owner" },
  });
}

/** R-03/R-11: the location screen's Lanjut requires both name and address. */
export function smartLocationReady(selection: SmartSelection): boolean {
  return Boolean(
    selection.locationName.trim() && selection.locationAddress.trim(),
  );
}

/** R-03/R-12: the product screen's Lanjut requires the typed/picked target. */
export function smartProductReady(selection: SmartSelection): boolean {
  return Boolean(selection.productTarget.trim());
}

/** R-03/R-13: the category screen's Lanjut requires a non-empty category. */
export function smartCategoryReady(selection: SmartSelection): boolean {
  return Boolean(selection.category.trim());
}

/** R-03/R-15: the service screen's Lanjut requires at least one channel. */
export function smartServiceReady(selection: SmartSelection): boolean {
  return selection.serviceChannels.length > 0;
}

export function smartComparatorsReady(selection: SmartSelection): boolean {
  if (selection.comparatorMode !== "named") return true;
  const names = selection.comparatorNames.map((name) =>
    name.trim().toLocaleLowerCase("id-ID"),
  );
  return (
    names.length > 0 &&
    names.length <= 5 &&
    names.every(Boolean) &&
    new Set(names).size === names.length
  );
}

/**
 * R-03/R-16: the market screen's Lanjut requires a reach; `sekitar` needs
 * exactly one area, `beberapa` needs one to eight, and a list past the cap
 * blocks instead of silently shrinking.
 */
export function smartMarketReady(selection: SmartSelection): boolean {
  if (selection.focus === "cabang") return true;
  if (selection.marketReach === "sekitar")
    return selection.marketAreas.length === 1;
  if (selection.marketReach === "beberapa")
    return (
      selection.marketAreas.length >= 1 && selection.marketAreas.length <= 8
    );
  return Boolean(selection.marketReach);
}

/**
 * The detail screen that owns the first still-missing meaning, in journey
 * order — the summary's gap CTA opens it and the normal chain walks forward
 * from there.
 */
export function firstSmartGapStage(
  selection: SmartSelection,
):
  | "brand"
  | "location"
  | "product"
  | "category"
  | "offerings"
  | "service"
  | "market"
  | "competitors"
  | null {
  if (!selection.name.trim()) return "brand";
  if (selection.focus === "cabang" && !smartLocationReady(selection))
    return "location";
  if (selection.focus === "produk" && !smartProductReady(selection))
    return "product";
  if (!smartCategoryReady(selection)) return "category";
  if (selection.focus !== "produk" && !selection.offerings.length)
    return "offerings";
  if (!smartServiceReady(selection)) return "service";
  if (selection.focus !== "cabang" && !smartMarketReady(selection))
    return "market";
  if (!smartComparatorsReady(selection)) return "competitors";
  return null;
}

/** R-22: a valid "Nama lain" list is empty or holds up to twelve distinct
 * non-blank names of at most 160 characters (trimmed, case-insensitive). */
export function smartAliasesReady(selection: SmartSelection): boolean {
  if (selection.aliases.length > 12) return false;
  const seen = new Set<string>();
  for (const alias of selection.aliases) {
    const trimmed = alias.trim();
    if (!trimmed || trimmed.length > 160) return false;
    const key = trimmed.toLocaleLowerCase("id-ID");
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

export function initialSmartSelection(
  prepared: PreparedUnderstanding,
): SmartSelection {
  const reach = prepared.marketReach.proposed ?? "";
  const areas = prepared.marketAreas.proposed ?? [];
  const selectedAreas =
    reach === "sekitar"
      ? areas.length === 1
        ? areas
        : []
      : reach === "beberapa"
        ? areas
        : [];
  const selection: SmartSelection = {
    name: prepared.typedName,
    nameOrigin: "owner",
    aliases: [...prepared.aliases],
    focus: "brand",
    productTarget: "",
    locationName: "",
    locationAddress: "",
    category: prepared.category.proposed ?? "",
    categoryKind: prepared.category.proposed?.trim() ? "main" : "manual",
    offerings: prepared.offerings.proposed ?? [],
    serviceChannels: prepared.serviceChannels.proposed ?? [],
    marketReach: reach,
    marketAreas: selectedAreas,
    retainedBrandReach: reach,
    retainedBrandAreas: selectedAreas,
    targetCustomer: prepared.targetCustomer.proposed ?? "",
    customerNeeds: prepared.customerNeeds.proposed ?? [],
    decisionConsiderations: prepared.decisionConsiderations.proposed ?? [],
    comparatorMode: prepared.comparatorSuggestions.proposed?.length
      ? "named"
      : "unknown",
    comparatorNames: prepared.comparatorSuggestions.proposed ?? [],
    differentiator: prepared.differentiator.proposed ?? "",
    publicFact: "",
    origins: {
      focus: "nuave",
      category: "website",
      offerings: "website",
      serviceChannels: "website",
      market: "website",
      targetCustomer: "nuave",
      customerNeeds: "nuave",
      decisionConsiderations: "nuave",
      comparators: "nuave",
      differentiator: "nuave",
      publicFact: "owner",
      aliases: "website",
    },
  };
  return selection.category.trim()
    ? selection
    : syncSmartCategory(prepared, selection);
}

/** Required meanings the review must route back to their owning screen. */
export function requiredSmartGaps(selection: SmartSelection): string[] {
  const gaps: string[] = [];
  if (!selection.name.trim()) gaps.push("Nama bisnis");
  if (!selection.category.trim()) gaps.push("Kategori");
  if (selection.focus !== "produk" && !selection.offerings.length)
    gaps.push("Produk atau layanan utama");
  if (selection.focus === "produk" && !selection.productTarget.trim())
    gaps.push("Produk atau layanan yang diaudit");
  if (
    selection.focus === "cabang" &&
    (!selection.locationName.trim() || !selection.locationAddress.trim())
  )
    gaps.push("Nama dan alamat lokasi");
  if (!selection.serviceChannels.length) gaps.push("Cara layanan");
  if (selection.focus !== "cabang" && !smartMarketReady(selection))
    gaps.push(selection.marketReach ? "Area layanan" : "Jangkauan pasar");
  if (!smartComparatorsReady(selection)) gaps.push("Bisnis pembanding");
  return gaps;
}

export function confirmSmartSelection(
  prepared: PreparedUnderstanding,
  selection: SmartSelection,
  factVersion: number,
): FrozenSmartIntake {
  const gaps = requiredSmartGaps(selection);
  if (gaps.length) throw new Error(`Lengkapi: ${gaps.join(", ")}.`);
  if (!selection.serviceChannels.length) throw new Error("Pilih cara layanan.");
  if (selection.focus !== "cabang" && !selection.marketReach)
    throw new Error("Pilih jangkauan pasar.");
  if (
    selection.focus !== "cabang" &&
    selection.marketReach === "sekitar" &&
    selection.marketAreas.length !== 1
  )
    throw new Error("Pilih satu area layanan.");
  if (
    selection.focus !== "cabang" &&
    selection.marketReach === "beberapa" &&
    !selection.marketAreas.length
  )
    throw new Error("Pilih area layanan.");
  // R-16: past the eight-area cap the market screen keeps the whole list and
  // blocks Lanjut — confirmation refuses rather than silently keeping eight.
  if (
    selection.focus !== "cabang" &&
    ["sekitar", "beberapa"].includes(selection.marketReach) &&
    selection.marketAreas.length > 8
  )
    throw new Error("Pilih paling banyak 8 area layanan.");
  // R-22: the confirmed "Nama lain" list freezes as-is — an invalid entry
  // (blank, overlong, duplicate, or a thirteenth) is rejected here instead
  // of silently dropped.
  if (!smartAliasesReady(selection))
    throw new Error(
      "Periksa nama lain: tanpa nama kosong atau duplikat, paling banyak 12 nama, masing-masing paling panjang 160 karakter.",
    );
  const origin = (key: string): Origin => selection.origins[key] ?? "owner";
  const optionalText = (value: string, key: string) =>
    value.trim() ? { value: value.trim(), origin: origin(key) } : undefined;
  const optionalList = (values: string[], key: string) =>
    values.length
      ? { value: unique(values, 12), origin: origin(key) }
      : undefined;
  const focusValue =
    selection.focus === "brand"
      ? { kind: "brand" as const }
      : selection.focus === "produk"
        ? { kind: "produk" as const, name: selection.productTarget.trim() }
        : {
            kind: "cabang" as const,
            name: selection.locationName.trim(),
            address: selection.locationAddress.trim(),
          };
  const offerings =
    selection.focus === "produk"
      ? [selection.productTarget.trim()]
      : unique(selection.offerings, 12);
  const namedComparators = selection.comparatorNames.map((name) => name.trim());
  const context: DirectTenAuditContext = {
    version: DIRECT_TEN_CONTEXT_VERSION,
    identity: {
      name: selection.name.trim(),
      source: prepared.canonicalSource,
      sourceOrigin: "owner",
      aliases: selection.aliases.map((alias) => alias.trim()),
      origin: selection.nameOrigin,
    },
    focus: { value: focusValue, origin: origin("focus") },
    category: { value: selection.category.trim(), origin: origin("category") },
    offerings: {
      value: offerings,
      origin:
        selection.focus === "produk" ? origin("focus") : origin("offerings"),
    },
    serviceChannels: {
      value: selection.serviceChannels,
      origin: origin("serviceChannels"),
    },
    market:
      selection.focus === "cabang"
        ? null
        : {
            value: {
              reach: selection.marketReach as NonNullable<
                DirectTenAuditContext["market"]
              >["value"]["reach"],
              areas: ["sekitar", "beberapa"].includes(selection.marketReach)
                ? unique(selection.marketAreas, 8)
                : [],
            },
            origin: origin("market"),
          },
    ...(optionalText(selection.targetCustomer, "targetCustomer")
      ? {
          targetCustomer: optionalText(
            selection.targetCustomer,
            "targetCustomer",
          ),
        }
      : {}),
    ...(optionalList(selection.customerNeeds, "customerNeeds")
      ? {
          customerNeeds: optionalList(selection.customerNeeds, "customerNeeds"),
        }
      : {}),
    ...(optionalList(selection.decisionConsiderations, "decisionConsiderations")
      ? {
          decisionConsiderations: optionalList(
            selection.decisionConsiderations,
            "decisionConsiderations",
          ),
        }
      : {}),
    comparators: {
      value:
        selection.comparatorMode === "named" && namedComparators.length
          ? { mode: "named", names: namedComparators }
          : selection.comparatorMode === "category-alternatives"
            ? { mode: "category-alternatives" }
            : { mode: "unknown" },
      origin: origin("comparators"),
    },
    ...(optionalText(selection.differentiator, "differentiator")
      ? {
          differentiator: optionalText(
            selection.differentiator,
            "differentiator",
          ),
        }
      : {}),
    ...(optionalText(selection.publicFact, "publicFact")
      ? { publicFact: optionalText(selection.publicFact, "publicFact") }
      : {}),
  } as DirectTenAuditContext;
  const parsed = directTenContextSchema.parse(context);
  const fields = [
    selection.name,
    selection.category,
    selection.productTarget,
    selection.locationName,
    selection.locationAddress,
    ...offerings,
    ...selection.marketAreas,
    ...selection.comparatorNames,
    ...selection.aliases,
    selection.targetCustomer,
    ...selection.customerNeeds,
    ...selection.decisionConsiderations,
    selection.differentiator,
    selection.publicFact,
  ];
  if (fields.some((value) => value && isSensitiveIntakeText(value))) {
    throw new Error("Informasi sensitif tidak dapat digunakan dalam audit.");
  }
  const frozen = {
    version: SMART_INTAKE_INPUT_VERSION,
    factVersion,
    context: parsed,
  };
  return immutable({ ...frozen, fingerprint: smartFingerprint(frozen) });
}
