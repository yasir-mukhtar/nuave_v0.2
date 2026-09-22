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
import { parseSourceInput } from "../audit/source-input";
import type { ExtractionDraft } from "../audit/types";

export const SMART_INTAKE_INPUT_VERSION =
  "nuave-local-intake-input-v2" as const;
export const SMART_INTAKE_STORAGE_KEY = "nuave.localIntake.v2" as const;

type Origin = "website" | "nuave" | "owner";
export type PreparedMeaning<T> = Readonly<{
  proposed: T | null;
  origin: "website" | "nuave";
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
  focus: "brand" | "produk" | "cabang";
  productTarget: string;
  locationName: string;
  locationAddress: string;
  category: string;
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
    throw new Error(
      "Informasi sensitif terdeteksi. Persiapan audit dihentikan; hubungi Nuave.",
    );
  }
  const areas = unique(draft.market_areas, 8);
  const reach = draft.market_reach || null;
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
    aliases: unique(draft.brand_name_variants, 12),
    focus: { proposed: "brand", origin: "nuave" },
    category: { proposed: draft.category.trim() || null, origin: "website" },
    offerings: {
      proposed: unique(draft.verified_offerings, 12),
      origin: "website",
    },
    serviceChannels: {
      proposed: [...new Set(draft.service_channels)],
      origin: "website",
    },
    marketReach: { proposed: reach, origin: "website" },
    marketAreas: { proposed: areas, origin: "website" },
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
  return {
    name: prepared.typedName,
    nameOrigin: "owner",
    focus: "brand",
    productTarget: "",
    locationName: "",
    locationAddress: "",
    category: prepared.category.proposed ?? "",
    offerings: prepared.offerings.proposed ?? [],
    serviceChannels: prepared.serviceChannels.proposed ?? [],
    marketReach: reach,
    marketAreas: selectedAreas,
    retainedBrandReach: reach,
    retainedBrandAreas: selectedAreas,
    targetCustomer: prepared.targetCustomer.proposed ?? "",
    customerNeeds: prepared.customerNeeds.proposed ?? [],
    decisionConsiderations: prepared.decisionConsiderations.proposed ?? [],
    comparatorMode: "unknown",
    comparatorNames: [],
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
    },
  };
}

/** The one clarification stage is reserved for missing category, offering,
 * or active focus target. Inline channel/reach/area choices stay on summary. */
export function requiredSmartGaps(selection: SmartSelection): string[] {
  const gaps: string[] = [];
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
  const namedComparators = unique(selection.comparatorNames, 5);
  const context: DirectTenAuditContext = {
    version: DIRECT_TEN_CONTEXT_VERSION,
    identity: {
      name: selection.name.trim(),
      source: prepared.canonicalSource,
      sourceOrigin: "owner",
      aliases: prepared.aliases,
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
