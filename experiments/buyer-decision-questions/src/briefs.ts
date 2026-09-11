/**
 * Input projection for both conditions.
 *
 * Condition A receives the real minimized confirmed brief produced by
 * `minimizeIndonesianBrief` (the actual production input projection).
 * Condition B receives a normalized buyer brief whose values are drawn ONLY
 * from that same projection — fields that are provenance signals
 * (official_source_urls), accuracy caveats (known_accuracy_questions), or
 * comparison source URLs are dropped, and empty fields are omitted. B never
 * receives facts that A did not receive.
 */
import type { BusinessBrief } from "../../../src/lib/audit/types";
import {
  minimizeIndonesianBrief,
  type MinimizedIndonesianBrief,
} from "../../../src/lib/audit/questions-id";
import type { ExperimentBusiness } from "./loaders";

export type BuyerBrief = {
  business_name: string;
  market_scope: string;
  category: string;
  business_name_variants?: string[];
  offerings?: string[];
  customer_context?: string;
  customer_needs: string[];
  decision_considerations?: string[];
  differentiator?: string;
  conversion_action?: string;
  comparison_business?: { name: string; scope: string };
};

const STRING_ARRAY_FIELDS = [
  "offerings",
  "customer_needs",
  "decision_considerations",
] as const;

/** The production projection for condition A (kept as the single source). */
export function conditionAInput(
  business: ExperimentBusiness,
): MinimizedIndonesianBrief {
  return minimizeIndonesianBrief(business as BusinessBrief);
}

function nonEmptyItems(items: string[] | undefined): string[] | undefined {
  if (!items) return undefined;
  const filtered = items.map((item) => item.trim()).filter(Boolean);
  return filtered.length ? filtered : undefined;
}

/**
 * Normalized buyer brief for condition B. Structural guarantee: every
 * non-empty string value in the buyer brief equals a value in the condition A
 * projection, so B cannot receive additional facts.
 */
export function conditionBInput(
  business: ExperimentBusiness,
): BuyerBrief {
  const minimized = conditionAInput(business);
  const brief: BuyerBrief = {
    business_name: minimized.brand_name,
    market_scope: minimized.scope,
    category: minimized.category,
    customer_needs: nonEmptyItems(minimized.customer_needs) ?? [],
  };
  const variants = nonEmptyItems(minimized.brand_name_variants);
  if (variants) brief.business_name_variants = variants;
  const offerings = nonEmptyItems(minimized.offerings);
  if (offerings) brief.offerings = offerings;
  const context = minimized.customer_context.trim();
  if (context) brief.customer_context = context;
  const considerations = nonEmptyItems(minimized.decision_considerations);
  if (considerations) brief.decision_considerations = considerations;
  const differentiator = minimized.differentiator.trim();
  if (differentiator) brief.differentiator = differentiator;
  const conversion = minimized.conversion_action.trim();
  if (conversion) brief.conversion_action = conversion;
  if (minimized.comparison_business?.name.trim()) {
    brief.comparison_business = {
      name: minimized.comparison_business.name,
      scope: minimized.comparison_business.scope,
    };
  }
  return brief;
}

/** Every non-empty string value in a BuyerBrief, for equality assertions. */
export function buyerBriefStringValues(brief: BuyerBrief): string[] {
  const values: string[] = [brief.business_name, brief.market_scope, brief.category];
  for (const key of STRING_ARRAY_FIELDS) {
    const items = brief[key];
    if (items) values.push(...items.map((item) => item.trim()).filter(Boolean));
  }
  if (brief.business_name_variants) {
    values.push(
      ...brief.business_name_variants.map((item) => item.trim()).filter(Boolean),
    );
  }
  if (brief.customer_context) values.push(brief.customer_context);
  if (brief.differentiator) values.push(brief.differentiator);
  if (brief.conversion_action) values.push(brief.conversion_action);
  if (brief.comparison_business) {
    values.push(brief.comparison_business.name, brief.comparison_business.scope);
  }
  return values.map((value) => value.trim()).filter(Boolean);
}

/** The subset of the condition A projection that B is allowed to reference. */
export function conditionAValuePool(
  minimized: MinimizedIndonesianBrief,
): string[] {
  const values: string[] = [
    minimized.brand_name,
    minimized.scope,
    minimized.category,
  ];
  for (const list of [
    minimized.brand_name_variants,
    minimized.offerings,
    minimized.customer_needs,
    minimized.decision_considerations,
  ]) {
    values.push(...list.map((item) => item.trim()).filter(Boolean));
  }
  if (minimized.customer_context.trim()) values.push(minimized.customer_context);
  if (minimized.differentiator.trim()) values.push(minimized.differentiator);
  if (minimized.conversion_action.trim()) {
    values.push(minimized.conversion_action);
  }
  if (minimized.comparison_business?.name.trim()) {
    values.push(
      minimized.comparison_business.name,
      minimized.comparison_business.scope,
    );
  }
  return values.map((value) => value.trim()).filter(Boolean);
}
