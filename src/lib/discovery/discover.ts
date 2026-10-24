/**
 * Spec 018 R-04 and R-09: the discovery run for one order. It turns the
 * confirmed services into phrases, asks DataForSEO for keyword suggestions,
 * autocomplete and "People also ask", and builds the pool (R-05..R-08).
 * Discovery has its own request (R-15) and its own budget (R-09).
 */
import type { DirectTenAuditContext } from "../audit/direct-ten-context-v2";
import { SpendCapError } from "../spending/provider-spend";
import { ORDER_STAGE_CAP_USD } from "../spending/spend-ledger";
import {
  callDataForSeo,
  DATAFORSEO_CALL_MAX_USD,
  type DataForSeoCall,
  type DataForSeoOutcome,
  type DataForSeoTransport,
} from "./dataforseo";
import { brandTokens, searchPhrase, type BrandInput } from "./phrase";
import {
  INDONESIA_LOCATION_CODE,
  searchPlaceName,
  type SearchPlace,
} from "./places";
import {
  buildDiscoveryPool,
  type DiscoveryHarvest,
  type DiscoveryPool,
} from "./pool";

export const DISCOVERY_TARGET_USD = 0.08;
/** R-09: per order, shared by both runs; the ledger enforces it across runs
 * and this run checks it before every attempt. */
export const DISCOVERY_HARD_STOP_USD = ORDER_STAGE_CAP_USD.discovery;
/** R-15: retries one discovery request may make in all, so its worst case
 * stays under 50 subrequests (AC-15). */
export const DISCOVERY_MAX_RETRIES = 2;
const MAX_PHRASES = 4;
const KEYWORD_LIMIT = 20;
const LANGUAGE = "id";

export function brandInputFor(context: DirectTenAuditContext): BrandInput {
  return {
    name: context.identity.name,
    aliases: context.identity.aliases,
    source: context.identity.source,
    category: context.category.value,
    place:
      context.searchPlace?.value.kind === "place"
        ? context.searchPlace.value.display
        : null,
  };
}

/** R-04a over the confirmed services: unique phrases, first four; the
 * category joins when fewer than two remain. */
export function discoveryPhrases(context: DirectTenAuditContext): string[] {
  const brand = brandInputFor(context);
  const phrases: string[] = [];
  for (const service of context.offerings.value) {
    const phrase = searchPhrase(service, brand);
    if (phrase && !phrases.includes(phrase)) phrases.push(phrase);
    if (phrases.length === MAX_PHRASES) break;
  }
  const category = context.category.value.trim().toLocaleLowerCase("id-ID");
  if (phrases.length < 2 && category && !phrases.includes(category))
    phrases.push(category);
  return phrases;
}

/** R-04: the "People also ask" seeds; with "Seluruh Indonesia" the place and
 * its "di" are left out. */
export function peopleAlsoAskSeeds(
  context: DirectTenAuditContext,
  phrases: readonly string[],
  place: SearchPlace,
): string[] {
  const category = context.category.value.trim().toLocaleLowerCase("id-ID");
  const name = searchPlaceName(place)?.toLocaleLowerCase("id-ID");
  return [
    name ? `${category} terbaik di ${name}` : `${category} terbaik`,
    `biaya ${phrases[0] ?? category}`,
  ];
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
    : [];
}

function latestMonth(
  keywordInfo: Record<string, unknown> | null,
): string | null {
  const months = list(keywordInfo?.monthly_searches)
    .map((m) => ({ year: Number(m.year), month: Number(m.month) }))
    .filter((m) => Number.isInteger(m.year) && Number.isInteger(m.month))
    .sort((a, b) => b.year - a.year || b.month - a.month);
  const top = months[0];
  return top ? `${top.year}-${String(top.month).padStart(2, "0")}` : null;
}

function keywordRow(item: Record<string, unknown>, keyword: string) {
  const info =
    typeof item.keyword_info === "object" && item.keyword_info !== null
      ? (item.keyword_info as Record<string, unknown>)
      : null;
  const intent =
    typeof item.search_intent_info === "object" && item.search_intent_info
      ? (item.search_intent_info as Record<string, unknown>).main_intent
      : null;
  return {
    text: keyword,
    volume: typeof info?.search_volume === "number" ? info.search_volume : null,
    dataMonth: latestMonth(info),
    intent: typeof intent === "string" ? intent : null,
  };
}

export type DiscoveryRun = {
  pool: DiscoveryPool;
  spentUsd: number;
  calls: number;
  /** Set when a credentials, access or balance problem was seen (R-14). */
  unavailable: boolean;
};

/** One discovery run. Never throws for provider problems: what was collected
 * is kept and R-08 decides whether the pool is thin. */
export async function runDiscovery(input: {
  context: DirectTenAuditContext;
  place: SearchPlace;
  transport: DataForSeoTransport;
  now?: Date;
}): Promise<DiscoveryRun> {
  const { context, place, transport } = input;
  const brand = brandInputFor(context);
  const forbidden = brandTokens(brand);
  const phrases = discoveryPhrases(context);
  const googleLocation =
    place.kind === "place" ? place.code : INDONESIA_LOCATION_CODE;
  const placeName = searchPlaceName(place)?.toLocaleLowerCase("id-ID") ?? null;
  const harvest: DiscoveryHarvest = {
    keywords: [],
    autocomplete: [],
    peopleAlsoAsk: [],
    businessNamesSeen: [],
  };
  let spentUsd = 0;
  let reservedUsd = 0;
  let calls = 0;
  let retriesLeft = DISCOVERY_MAX_RETRIES;
  let incomplete = false;
  let unavailable = false;

  // R-09 hard stop: every attempt, the retry included, counts its maximum,
  // and no attempt starts whose maximum could pass the stop.
  const beforeAttempt = (call: DataForSeoCall) => (attempt: number) => {
    if (attempt > 1 && retriesLeft <= 0) return false;
    if (reservedUsd + DATAFORSEO_CALL_MAX_USD[call] > DISCOVERY_HARD_STOP_USD) {
      incomplete = true;
      return false;
    }
    if (attempt > 1) retriesLeft -= 1;
    reservedUsd += DATAFORSEO_CALL_MAX_USD[call];
    calls += 1;
    return true;
  };

  const send = async (
    call: DataForSeoCall,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> => {
    if (incomplete) return null;
    let outcome: DataForSeoOutcome;
    try {
      const result = await callDataForSeo({
        call,
        body,
        stage: "discovery",
        transport,
        forbiddenWords: forbidden,
        beforeAttempt: beforeAttempt(call),
      });
      spentUsd += result.costUsd;
      outcome = result.outcome;
      if (outcome === "ok") return result.result;
    } catch (error) {
      if (!(error instanceof SpendCapError)) throw error;
      // AC-13: the cap refused the call before it was sent.
      incomplete = true;
      return null;
    }
    if (outcome === "unavailable") {
      unavailable = true;
      incomplete = true;
    }
    return null;
  };

  // "People also ask" first: the same pages give the business names seen.
  for (const seed of peopleAlsoAskSeeds(context, phrases, place)) {
    const result = await send("serp", {
      keyword: seed,
      location_code: googleLocation,
      language_code: LANGUAGE,
      device: "mobile",
      people_also_ask_click_depth: 1,
      load_async_ai_overview: false,
    });
    for (const item of list(result?.items)) {
      if (item.type === "people_also_ask")
        for (const element of list(item.items))
          if (typeof element.title === "string")
            harvest.peopleAlsoAsk.push(element.title);
      if (item.type === "local_pack" && typeof item.title === "string")
        harvest.businessNamesSeen.push(item.title);
      if (item.type === "organic" && typeof item.website_name === "string")
        harvest.businessNamesSeen.push(item.website_name);
    }
  }
  for (const phrase of phrases) {
    const result = await send("keywordSuggestions", {
      keyword: phrase,
      location_code: INDONESIA_LOCATION_CODE,
      language_code: LANGUAGE,
      include_seed_keyword: true,
      limit: KEYWORD_LIMIT,
      order_by: ["keyword_info.search_volume,desc"],
    });
    const seed =
      typeof result?.seed_keyword_data === "object" && result.seed_keyword_data
        ? (result.seed_keyword_data as Record<string, unknown>)
        : null;
    if (seed) harvest.keywords.push({ phrase, ...keywordRow(seed, phrase) });
    for (const item of list(result?.items))
      if (typeof item.keyword === "string")
        harvest.keywords.push({ phrase, ...keywordRow(item, item.keyword) });
  }
  for (const phrase of phrases) {
    const result = await send("autocomplete", {
      keyword: placeName ? `${phrase} ${placeName}` : phrase,
      location_code: googleLocation,
      language_code: LANGUAGE,
    });
    for (const item of list(result?.items))
      if (typeof item.suggestion === "string")
        harvest.autocomplete.push(item.suggestion);
  }

  return {
    pool: buildDiscoveryPool(
      harvest,
      { brand, place, phrases },
      {
        incomplete,
        synthetic: transport.kind === "synthetic",
        now: input.now ?? new Date(),
      },
    ),
    spentUsd,
    calls,
    unavailable,
  };
}
