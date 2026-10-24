/** Spec 018 whole-word text helpers shared by discovery and question rules.
 * Matching is on lowercase words split on anything that is not a letter or a
 * digit, so "bagaimana" never contains the word "mana". */

export function words(text: string | null | undefined): string[] {
  return (text ?? "")
    .toLocaleLowerCase("id-ID")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Lowercase, single-spaced words: the key for de-duplication and exact
 * matches (R-05, R-08, R-11). */
export function normalizedText(text: string | null | undefined): string {
  return words(text).join(" ");
}

/** True when `sequence` appears as consecutive whole words in `text`. */
export function hasWordSequence(
  text: string | readonly string[],
  sequence: string | readonly string[],
): boolean {
  const haystack = typeof text === "string" ? words(text) : text;
  const needle = typeof sequence === "string" ? words(sequence) : sequence;
  if (!needle.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((word, j) => haystack[i + j] === word)) return true;
  }
  return false;
}

/** True when every word of `required` appears somewhere in `text`. */
export function containsAllWords(
  text: string,
  required: readonly string[],
): boolean {
  const present = new Set(words(text));
  return required.every((word) => present.has(word));
}
