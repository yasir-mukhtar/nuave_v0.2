import { z } from "zod";
import { parseSourceInput } from "./source-input";
import { unsafeConfirmedContext } from "./sensitive-intake";
import type { MinimizedIndonesianBrief } from "./questions-id";
import type { BusinessBrief } from "./types";

export const DIRECT_TEN_CONTEXT_VERSION =
  "nuave-direct-ten-context-v2" as const;
export const DIRECT_TEN_RUN_CONTRACT_VERSION = "live-audit-stream-v2" as const;
export const DIRECT_TEN_REPORT_CONTRACT_VERSION =
  "live-audit-report-v2" as const;

const origin = z.enum(["website", "nuave", "owner"]);
const value = (limit: number) => z.string().trim().min(1).max(limit);
const meaning = <T extends z.ZodType>(schema: T) =>
  z.object({ value: schema, origin }).strict();
const source = z
  .url()
  .max(2_000)
  .refine((url) => Boolean(parseSourceInput(url)), "Unsupported public source");

export const directTenContextSchema = z
  .object({
    version: z.literal(DIRECT_TEN_CONTEXT_VERSION),
    identity: z
      .object({
        name: value(160),
        source,
        sourceOrigin: z.literal("owner"),
        aliases: z.array(value(160)).max(12),
        origin,
      })
      .strict(),
    focus: meaning(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("brand") }).strict(),
        z.object({ kind: z.literal("produk"), name: value(300) }).strict(),
        z
          .object({
            kind: z.literal("cabang"),
            name: value(300),
            address: value(500),
          })
          .strict(),
      ]),
    ),
    category: meaning(value(200)),
    offerings: meaning(z.array(value(300)).min(1).max(12)),
    serviceChannels: meaning(
      z
        .array(z.enum(["on_premise", "on_customer", "delivery", "online"]))
        .min(1)
        .max(4),
    ),
    market: meaning(
      z
        .object({
          reach: z.enum(["sekitar", "beberapa", "seluruh", "luar"]),
          areas: z.array(value(160)).max(8),
        })
        .strict(),
    ).nullable(),
    targetCustomer: meaning(value(500)).optional(),
    customerNeeds: meaning(z.array(value(300)).min(1).max(12)).optional(),
    decisionConsiderations: meaning(
      z.array(value(300)).min(1).max(12),
    ).optional(),
    comparators: meaning(
      z.discriminatedUnion("mode", [
        z
          .object({
            mode: z.literal("named"),
            names: z.array(value(160)).min(1).max(5),
          })
          .strict(),
        z.object({ mode: z.literal("category-alternatives") }).strict(),
        z.object({ mode: z.literal("unknown") }).strict(),
      ]),
    ),
    differentiator: meaning(value(1_000)).optional(),
    publicFact: meaning(value(500)).optional(),
  })
  .strict()
  .superRefine((context, issue) => {
    if (unsafeConfirmedContext(context)) {
      issue.addIssue({
        code: "custom",
        message: "Sensitive information is not allowed in audit context.",
      });
    }
    const focus = context.focus.value;
    const market = context.market?.value;
    if (focus.kind === "cabang" && market !== undefined) {
      issue.addIssue({
        code: "custom",
        message: "Location focus has no brand market coverage.",
      });
    }
    if (focus.kind !== "cabang" && !market) {
      issue.addIssue({ code: "custom", message: "Market reach is required." });
    }
    if (market?.reach === "sekitar" && market.areas.length !== 1) {
      issue.addIssue({
        code: "custom",
        message: "Local reach requires one area.",
      });
    }
    if (market?.reach === "beberapa" && market.areas.length < 1) {
      issue.addIssue({
        code: "custom",
        message: "Multi-area reach requires an area.",
      });
    }
    if (
      market &&
      ["seluruh", "luar"].includes(market.reach) &&
      market.areas.length
    ) {
      issue.addIssue({
        code: "custom",
        message: "Broad reach has no active areas.",
      });
    }
    if (
      focus.kind === "produk" &&
      (context.offerings.value.length !== 1 ||
        context.offerings.value[0] !== focus.name)
    ) {
      issue.addIssue({
        code: "custom",
        message: "Product focus must use its selected offering only.",
      });
    }
  });

export type DirectTenAuditContext = z.infer<typeof directTenContextSchema>;
export type AuditSubject = BusinessBrief | DirectTenAuditContext;

export function isDirectTenAuditContext(
  value: unknown,
): value is DirectTenAuditContext {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as { version?: unknown }).version === DIRECT_TEN_CONTEXT_VERSION,
  );
}

export function contextBrandName(context: DirectTenAuditContext): string {
  return context.identity.name;
}

export function subjectBrandName(subject: AuditSubject): string {
  return isDirectTenAuditContext(subject)
    ? subject.identity.name
    : subject.brand_name;
}

export function subjectAliases(subject: AuditSubject): string[] {
  return isDirectTenAuditContext(subject)
    ? subject.identity.aliases
    : subject.brand_name_variants;
}

export function subjectNamedComparators(subject: AuditSubject): string[] {
  return isDirectTenAuditContext(subject)
    ? contextNamedComparators(subject)
    : [subject.verified_competitor.name].filter(Boolean);
}

export function contextNamedComparators(
  context: DirectTenAuditContext,
): string[] {
  return context.comparators.value.mode === "named"
    ? context.comparators.value.names
    : [];
}

export function contextMarketLabel(context: DirectTenAuditContext): string {
  const market = context.market?.value;
  if (!market) return "";
  if (market.reach === "seluruh") return "seluruh Indonesia";
  if (market.reach === "luar") return "Indonesia dan luar negeri";
  return market.areas.join(", ");
}

/** Identity-only adapter for the existing question text guard. Empty optional
 * guard fields are intentionally absent facts, never a report/model brief. */
export function contextIdentityGuard(
  context: DirectTenAuditContext,
): MinimizedIndonesianBrief {
  const source = parseSourceInput(context.identity.source);
  return {
    brand_name: context.identity.name,
    brand_name_variants: context.identity.aliases,
    scope:
      context.focus.value.kind === "brand"
        ? context.identity.name
        : context.focus.value.name,
    category: context.category.value,
    offerings: context.offerings.value,
    customer_needs: [],
    customer_context: "",
    decision_considerations: [],
    differentiator: "",
    comparison_business: null,
    known_accuracy_questions: [],
    conversion_action: "",
    official_source_urls: source ? [source.normalizedUrl] : [],
  };
}

/** The report prompt receives the exact confirmation and each field's
 * authority. No v1 verified-brief minimums are synthesized here. */
export function contextForReportModel(context: DirectTenAuditContext) {
  return {
    context_version: context.version,
    authority_note:
      "Customer-confirmed selections. website means prepared from the supplied public source; nuave means a Nuave suggestion; owner means supplied or corrected by the customer. Confirmation does not independently verify a claim.",
    confirmed_context: context,
  };
}
