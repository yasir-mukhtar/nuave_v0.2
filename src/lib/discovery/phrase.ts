/**
 * Spec 018 R-04a: turning a confirmed service into one search phrase, the
 * customer's brand tokens (R-02) and a phrase's core words.
 */
import { PLACES } from "./places";
import { words } from "./text";

/** Generic words never treated as brand tokens (R-04a step 3). The category's
 * own words are added per business. Founder-editable. */
export const GENERIC_BUSINESS_WORDS: readonly string[] = [
  "klinik",
  "clinic",
  "skin",
  "beauty",
  "aesthetic",
  "aesthetics",
  "estetika",
  "dental",
  "dentist",
  "gigi",
  "kecantikan",
  "care",
  "center",
  "centre",
  "health",
  "medika",
  "medical",
  "fisioterapi",
  "physio",
  "physiotherapy",
];

const FILLER_WORDS = new Set([
  "layanan",
  "paket",
  "promo",
  "dan",
  "untuk",
  "di",
  "treatment",
  "perawatan",
]);
const UNIT_WORDS = new Set(["ml", "cc", "g", "gr", "kg", "unit", "sesi", "x"]);
const MAX_PHRASE_WORDS = 4;

export type BrandInput = {
  name: string;
  aliases: readonly string[];
  /** The business website, e.g. "https://sozoskinclinic.com/". */
  source: string;
  category: string;
};

export function genericWordsFor(category: string): Set<string> {
  return new Set([...GENERIC_BUSINESS_WORDS, ...words(category)]);
}

/** The domain label: "sozoskinclinic" for https://www.sozoskinclinic.com/. */
export function domainLabel(source: string): string | null {
  try {
    const host = new URL(source).hostname.replace(/^www\./, "");
    return host.split(".")[0] || null;
  } catch {
    return null;
  }
}

/** Words of the R-03 place list ("bandung", "jakarta", "selatan"). */
const PLACE_LIST_WORDS = new Set(
  PLACES.flatMap((place) => words(place.display)),
);

/** R-02 / R-04a: the words of the name, aliases and domain label, minus
 * generic words. Aliases "Sozo Skin Clinic" and "Sozo Beauty Clinic" give
 * "sozo".
 *
 * Place names are left out too, as R-05b does for other businesses' names:
 * an alias such as "Kedai Fiksi Bandung" must not make "Bandung" a brand word,
 * or every question naming the search place (R-10a) would be rejected as
 * naming the business. The business's own distinctive words stay. */
export function brandTokens(input: BrandInput): string[] {
  const generic = genericWordsFor(input.category);
  const label = domainLabel(input.source);
  return [
    ...new Set(
      [input.name, ...input.aliases, ...(label ? [label] : [])].flatMap(words),
    ),
  ].filter((word) => !generic.has(word) && !PLACE_LIST_WORDS.has(word));
}

/** The category's subject word: its last word after removing "klinik"
 * ("klinik gigi" → "gigi"); null when nothing is left. */
export function categorySubjectWord(category: string): string | null {
  return (
    words(category)
      .filter((word) => word !== "klinik")
      .at(-1) ?? null
  );
}

/** R-04a steps 1–6; null when nothing remains (the service is skipped). */
export function searchPhrase(
  service: string,
  brand: BrandInput,
): string | null {
  const tokens = new Set(brandTokens(brand));
  const cleaned = service
    .toLocaleLowerCase("id-ID")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/-/g, " ")
    .replace(/[0-9]/g, " ")
    .replace(/[^\p{L}\s]/gu, " ");
  let kept = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (word) =>
        !UNIT_WORDS.has(word) && !tokens.has(word) && !FILLER_WORDS.has(word),
    )
    .slice(0, MAX_PHRASE_WORDS);
  if (!kept.length) return null;
  const subject = categorySubjectWord(brand.category);
  if (kept.length === 1 && subject && !kept.includes(subject))
    kept = [...kept, subject];
  return kept.join(" ");
}

/** A phrase's core words: its words minus "klinik" and the category's subject
 * word, unless that would leave none. */
export function coreWords(phrase: string, category: string): string[] {
  const subject = categorySubjectWord(category);
  const all = words(phrase);
  const core = all.filter((word) => word !== "klinik" && word !== subject);
  return core.length ? core : all;
}

/** True when `text` contains a brand token, the full name or an alias. */
export function containsBrand(text: string, brand: BrandInput): boolean {
  const present = new Set(words(text));
  return brandTokens(brand).some((token) => present.has(token));
}
