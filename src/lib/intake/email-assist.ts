/**
 * J08: small helpers for typing the report email on a phone. Nothing here
 * checks that an address exists; they only save taps and catch the common
 * misspellings of the big mail domains. The email never leaves this page
 * except in the order request (spec 016 R-31).
 */

const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.id",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
] as const;

/** Misspelled domain → intended domain (exact matches only). */
const DOMAIN_TYPOS: Readonly<Record<string, string>> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.co.od": "yahoo.co.id",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
};

/**
 * "Maksud Anda pemilik@gmail.com?": the corrected address when the domain is
 * a known misspelling, otherwise null.
 */
export function emailTypoSuggestion(value: string): string | null {
  const trimmed = value.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return null;
  const domain = trimmed.slice(at + 1).toLowerCase();
  const fixed = DOMAIN_TYPOS[domain];
  return fixed ? `${trimmed.slice(0, at)}@${fixed}` : null;
}

/**
 * One-tap completions for the accessory bar: before the "@" the most common
 * domain; after it, the common domains the typed part could still become.
 * Returns the full address each chip would write, with the chip's label.
 */
export function emailCompletions(
  value: string,
  limit = 2,
): { label: string; value: string }[] {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return [];
  const at = trimmed.indexOf("@");
  if (at < 0)
    return COMMON_DOMAINS.slice(0, limit).map((domain) => ({
      label: `@${domain}`,
      value: `${trimmed}@${domain}`,
    }));
  if (at === 0 || trimmed.indexOf("@", at + 1) >= 0) return [];
  const local = trimmed.slice(0, at);
  const typed = trimmed.slice(at + 1).toLowerCase();
  if (COMMON_DOMAINS.includes(typed as (typeof COMMON_DOMAINS)[number]))
    return [];
  return COMMON_DOMAINS.filter((domain) => domain.startsWith(typed))
    .slice(0, limit)
    .map((domain) => ({ label: `@${domain}`, value: `${local}@${domain}` }));
}
