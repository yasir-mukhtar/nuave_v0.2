/**
 * Where a business's names occur in a text (Spec 021): the report highlights
 * them, and code counts the answers that name each business with the same
 * rule, whether the counts are saved with the report (Part C) or derived when
 * an older report is opened (Part A).
 */
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type NameMatch = { name: string; start: number; end: number };

/**
 * Where the given names occur in a text: whole words, any case, longest name
 * first, so "Erha" inside "Erha Clinic" is one match, never two. `name` is
 * the given spelling. Names shorter than three characters are ignored.
 */
export function findNames(text: string, names: readonly string[]): NameMatch[] {
  const wanted = [...new Set(names.map((name) => name.trim()))]
    .filter((name) => name.length >= 3)
    .sort((a, b) => b.length - a.length);
  if (!wanted.length || !text) return [];
  const byLower = new Map(wanted.map((name) => [name.toLowerCase(), name]));
  const pattern = new RegExp(wanted.map(escape).join("|"), "giu");
  const found: NameMatch[] = [];
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    const end = start + match[0].length;
    // Whole words only: "Fiksi" never marks inside "Fiksional".
    if (
      WORD_CHARACTER.test(text.charAt(start - 1)) ||
      WORD_CHARACTER.test(text.charAt(end))
    )
      continue;
    found.push({
      name: byLower.get(match[0].toLowerCase()) ?? match[0],
      start,
      end,
    });
  }
  return found;
}
