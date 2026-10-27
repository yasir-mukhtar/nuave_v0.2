/**
 * Spec 021 C-01: what ChatGPT's and Google's own pages showed about each
 * business they listed: name, website (or Instagram), rating and review count,
 * when present. Fields come from DataForSEO's published response schemas
 * (checked 2026-10-27): ChatGPT `chat_gpt_local_businesses` items (`title`,
 * `url`, `rating.value`, `rating.rating_max`, `reviews_count`) and Google
 * `local_pack` (`title`, `url`, `rating.value`, `rating.rating_max`,
 * `rating.votes_count`) and `organic` (`website_name`, `url`). Never a phone
 * number or an address (Spec 018 R-28).
 */
import { SOURCE_TITLE_MAX_LENGTH } from "../audit/types";
import { phoneSafeUrl, stripPhoneNumbers } from "./phones";

export type BusinessListing = {
  name: string;
  /** The business's own address on the web, from the provider; null when
   * none was given or it carried a phone number. */
  website: string | null;
  rating: { value: number; max: number } | null;
  reviews: number | null;
  /** ChatGPT showed it as a business card: its own pick for the question. */
  card: boolean;
};

type Json = Record<string, unknown>;
const record = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null;
const list = (value: unknown): Json[] =>
  Array.isArray(value)
    ? value.flatMap((item): Json[] => {
        const entry = record(item);
        return entry ? [entry] : [];
      })
    : [];
const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

/** A provider address, kept only as plain http(s) with no phone number in
 * it (wa.me and similar are refused). */
export function listingWebsite(value: unknown): string | null {
  const url = text(value).trim();
  if (!/^https?:\/\//i.test(url) || url.length > 2_000) return null;
  return phoneSafeUrl(url);
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/** A rating out of its maximum (5 when the provider says "Max5" or gives
 * none); anything else is dropped. */
export function listingRating(value: unknown): BusinessListing["rating"] {
  const rating = record(value);
  const score = rating?.value;
  const max =
    typeof rating?.rating_max === "number" && rating.rating_max > 0
      ? rating.rating_max
      : 5;
  return typeof score === "number" && score > 0 && score <= max
    ? { value: score, max }
    : null;
}

function listingName(value: unknown): string {
  return stripPhoneNumbers(text(value).trim()).slice(
    0,
    SOURCE_TITLE_MAX_LENGTH,
  );
}

/** ChatGPT's business cards, in the order shown. */
export function chatgptListings(result: Json): BusinessListing[] {
  return list(result.items)
    .filter((item) => item.type === "chat_gpt_local_businesses")
    .flatMap((item) => list(item.items))
    .flatMap((card): BusinessListing[] => {
      const name = listingName(card.title);
      if (!name) return [];
      const rating = listingRating(card.rating);
      return [
        {
          name,
          website: listingWebsite(card.url),
          rating,
          reviews:
            count(card.reviews_count) ??
            (rating ? count(record(card.rating)?.votes_count) : null),
          card: true,
        },
      ];
    })
    .slice(0, 20);
}

/** Google's map results and organic results for the given names (those its
 * AI Overview names; see `googleBusinesses`). Map results carry a rating. */
export function googleListings(
  result: Json,
  names: readonly string[],
): BusinessListing[] {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const found = new Map<string, BusinessListing>();
  for (const item of list(result.items)) {
    const local = item.type === "local_pack";
    if (!local && item.type !== "organic") continue;
    const name = listingName(local ? item.title : item.website_name);
    const key = name.toLowerCase();
    if (!name || !wanted.has(key) || found.has(key)) continue;
    const rating = local ? listingRating(item.rating) : null;
    found.set(key, {
      name,
      website: listingWebsite(item.url),
      rating,
      reviews: rating ? count(record(item.rating)?.votes_count) : null,
      card: false,
    });
  }
  return [...found.values()];
}
