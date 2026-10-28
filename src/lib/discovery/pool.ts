/**
 * Spec 018 R-05..R-08: from what discovery collected to the saved pool of
 * usable topics and real wordings. Pure code, so the same rules run in the
 * route, in tests and in synthetic mode.
 */
import {
  brandTokens,
  categorySubjectWord,
  containsBrand,
  coreWords,
  genericWordsFor,
  type BrandInput,
} from "./phrase";
import {
  otherPlaceIn,
  PLACES,
  searchPlaceName,
  type SearchPlace,
} from "./places";
import {
  containsAllWords,
  hasWordSequence,
  normalizedText,
  words,
} from "./text";

export const POOL_VERSION = "nuave-discovery-pool-v1" as const;

/** Words that make a text off-topic for a clinic service (R-05a).
 * Founder-editable. */
export const OUT_OF_DOMAIN_WORDS: readonly string[] = [
  "bra",
  "belt",
  "sabuk",
  "celana",
  "baju",
  "kaos",
  "sepatu",
  "obat",
  "salep",
  "apotek",
  "apotik",
  "icd",
  "sikat",
  "pasta",
  "jual",
  "beli",
  "shopee",
  "tokopedia",
  "lazada",
  "diy",
  "sendiri",
  "alami",
  "rumahan",
  "tanpa",
];

const CONTEXT_WORDS: readonly string[] = [
  "klinik",
  "dokter",
  "drg",
  "dr",
  "treatment",
  "perawatan",
  "terapi",
  "tindakan",
  "pasang",
  "pemasangan",
  "harga",
  "biaya",
  "tarif",
  "murah",
  "terbaik",
  "rekomendasi",
  "terdekat",
];

const MIN_TOPIC_VOLUME = 10;
const MAX_WORDING_CHARS = 120;
const THIN_TOPICS = 6;
const THIN_WORDINGS = 5;

/** Where a real wording came from. Keywords and autocomplete are shown as
 * "Dicari di Google"; "People also ask" as "Orang lain juga bertanya". */
export type WordingOrigin = "keyword" | "autocomplete" | "people_also_ask";

export type PoolTopic = {
  text: string;
  phrase: string;
  volume: number;
  /** Latest month in `monthly_searches`, "YYYY-MM"; null when absent. */
  dataMonth: string | null;
  core: string[];
  /** DataForSEO's search intent, kept for information only (R-05b). */
  intent: string | null;
};

export type PoolWording = {
  origin: WordingOrigin;
  text: string;
  topic: string | null;
  volume: number | null;
  dataMonth: string | null;
};

export type DiscoveryPool = {
  version: typeof POOL_VERSION;
  place: SearchPlace;
  phrases: string[];
  topics: PoolTopic[];
  wordings: PoolWording[];
  /** Distinctive words of business names seen during discovery (names only). */
  businessNames: string[];
  thin: boolean;
  /** Set when discovery stopped early (budget, provider error). */
  incomplete: boolean;
  synthetic: boolean;
  createdAt: string;
};

/** Raw material from the discovery calls (R-04), already reduced to the
 * fields Nuave keeps. */
export type DiscoveryHarvest = {
  keywords: {
    phrase: string;
    text: string;
    volume: number | null;
    dataMonth: string | null;
    intent: string | null;
  }[];
  autocomplete: string[];
  peopleAlsoAsk: string[];
  businessNamesSeen: string[];
};

export type PoolContext = {
  brand: BrandInput;
  place: SearchPlace;
  phrases: string[];
};

/** R-05a: relevant when it contains a phrase's core words and is the phrase
 * itself (optionally plus the place) or carries a context word, and holds no
 * out-of-domain word. */
export function isRelevant(text: string, context: PoolContext): boolean {
  const tokens = words(text);
  if (OUT_OF_DOMAIN_WORDS.some((word) => tokens.includes(word))) return false;
  const placeName = searchPlaceName(context.place);
  const contextWords = new Set(
    [
      ...CONTEXT_WORDS,
      ...words(context.brand.category),
      categorySubjectWord(context.brand.category),
      ...(placeName ? words(placeName) : []),
    ].filter((word): word is string => Boolean(word)),
  );
  const key = normalizedText(text);
  return context.phrases.some(
    (phrase) =>
      containsAllWords(text, coreWords(phrase, context.brand.category)) &&
      (key === normalizedText(phrase) ||
        (placeName !== null &&
          key === normalizedText(`${phrase} ${placeName}`)) ||
        tokens.some((word) => contextWords.has(word))),
  );
}

/** R-05b: the distinctive words of business names seen during discovery —
 * each name minus generic words, place names and the phrases' words. */
export function distinctiveBusinessNames(
  names: readonly string[],
  context: PoolContext,
): string[] {
  const skip = new Set([
    ...genericWordsFor(context.brand.category),
    ...PLACES.flatMap((place) => words(place.display)),
    ...context.phrases.flatMap(words),
  ]);
  return [
    ...new Set(
      names
        .map((name) =>
          words(name)
            .filter((word) => !skip.has(word))
            .join(" "),
        )
        .filter(Boolean),
    ),
  ];
}

const DOCTOR_NAME = /(?:^|[^\p{L}])(?:dr|drg)\.\s*\p{L}{2,}/iu;

/** R-05b / R-11: the business name a text contains, or null. "dr." and
 * "drg." count only with the dot and a following name; bare "drg" stays a
 * context word. */
export function namedBusiness(
  text: string,
  businessNames: readonly string[],
): string | null {
  const hit = businessNames.find((name) => hasWordSequence(text, name));
  if (hit) return hit;
  return DOCTOR_NAME.test(text) ? "dr./drg." : null;
}

/** Why a text is not counted, or null when it may be used. */
function rejection(
  text: string,
  context: PoolContext,
  businessNames: readonly string[],
): string | null {
  if (containsBrand(text, context.brand)) return "brand";
  if (namedBusiness(text, businessNames)) return "business";
  if (otherPlaceIn(text, context.place)) return "other_place";
  if (!isRelevant(text, context)) return "not_relevant";
  return null;
}

const PLACE_DEPENDENT: readonly string[][] = [
  ["terdekat"],
  ["dekat", "sini"],
  ["di", "sekitar"],
  ["near", "me"],
];

export function isPlaceDependent(text: string): boolean {
  return PLACE_DEPENDENT.some((sequence) => hasWordSequence(text, sequence));
}

/** R-05..R-08: builds the saved pool from the harvest. */
export function buildDiscoveryPool(
  harvest: DiscoveryHarvest,
  context: PoolContext,
  meta: { incomplete: boolean; synthetic: boolean; now: Date },
): DiscoveryPool {
  const businessNames = distinctiveBusinessNames(
    harvest.businessNamesSeen,
    context,
  );
  const topics: PoolTopic[] = [];
  const seenTopics = new Set<string>();
  for (const keyword of harvest.keywords) {
    const key = normalizedText(keyword.text);
    const core = coreWords(keyword.phrase, context.brand.category);
    if (!key || seenTopics.has(key)) continue;
    if (!containsAllWords(keyword.text, core)) continue;
    if ((keyword.volume ?? 0) < MIN_TOPIC_VOLUME) continue;
    if (rejection(keyword.text, context, businessNames)) continue;
    seenTopics.add(key);
    topics.push({
      text: keyword.text,
      phrase: keyword.phrase,
      volume: keyword.volume as number,
      dataMonth: keyword.dataMonth,
      core: coreWords(keyword.text, context.brand.category),
      intent: keyword.intent,
    });
  }

  const candidates: { origin: WordingOrigin; text: string }[] = [
    ...topics.map((topic) => ({
      origin: "keyword" as const,
      text: topic.text,
    })),
    ...harvest.autocomplete.map((text) => ({
      origin: "autocomplete" as const,
      text,
    })),
    ...harvest.peopleAlsoAsk.map((text) => ({
      origin: "people_also_ask" as const,
      text,
    })),
  ];
  const wordings: PoolWording[] = [];
  const seenWordings = new Set<string>();
  for (const candidate of candidates) {
    const text = candidate.text.trim();
    const key = normalizedText(text);
    if (!key || seenWordings.has(key)) continue;
    seenWordings.add(key);
    if (text.length > MAX_WORDING_CHARS) continue;
    if (rejection(text, context, businessNames)) continue;
    if (context.place.kind === "indonesia" && isPlaceDependent(text)) continue;
    const topic = topicFor(text, topics);
    wordings.push({
      origin: candidate.origin,
      text,
      topic: topic?.text ?? null,
      volume: topic?.volume ?? null,
      dataMonth: topic?.dataMonth ?? null,
    });
  }
  // Keyword wordings are the topics themselves; R-08 counts the others.
  const countedReal = wordings.filter((w) => w.origin !== "keyword").length;
  return {
    version: POOL_VERSION,
    place: context.place,
    phrases: context.phrases,
    topics,
    wordings,
    businessNames,
    thin: topics.length < THIN_TOPICS && countedReal < THIN_WORDINGS,
    incomplete: meta.incomplete,
    synthetic: meta.synthetic,
    createdAt: meta.now.toISOString(),
  };
}

/** R-06: the longest usable topic whose core words the text contains. */
export function topicFor(
  text: string,
  topics: readonly PoolTopic[],
): PoolTopic | null {
  return (
    topics
      .filter((topic) => containsAllWords(text, topic.core))
      .sort((a, b) => b.text.length - a.text.length)[0] ?? null
  );
}

/** The brand tokens a request must never carry (R-02), for request checks. */
export function forbiddenRequestTokens(brand: BrandInput): string[] {
  return brandTokens(brand);
}
