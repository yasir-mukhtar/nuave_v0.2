/**
 * Spec 018 R-16: whether an answer names the business is decided by code when
 * the answer is saved, never by the report-writing model.
 *
 * The answer text includes the visible text of links (and, for ChatGPT, the
 * local-business cards and tables), and excludes link addresses and the
 * sources list. A name found only in link addresses or the sources list is
 * "dipakai sebagai sumber" and is not counted as named. The matching mirrors
 * the report contracts' identity check, so the code-built Google facts and the
 * ChatGPT details agree.
 */

export type NamedOutcome = "named" | "source_only" | "absent";

/** The customer text for a source-only outcome (VOICE §7.4). */
export const SOURCE_ONLY_TEXT = "dipakai sebagai sumber";

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

/** Link text stays; link addresses, bare URLs and bare domains go. */
export function visibleAnswerText(value: string): string {
  return value
    .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/gi, " ");
}

/** The link addresses inside markdown (`[text](url)` and bare URLs). */
export function linkAddresses(value: string): string[] {
  const inLinks = [...value.matchAll(/\]\((https?:\/\/[^)\s]+)\)/gi)].map(
    (match) => match[1],
  );
  const bare = [...value.matchAll(/https?:\/\/[^\s)\]]+/gi)].map(
    (match) => match[0],
  );
  return [...new Set([...inLinks, ...bare])];
}

function wordMatch(text: string, names: readonly string[]): boolean {
  const haystack = ` ${normalize(text)} `;
  return names.some((name) => {
    const needle = normalize(name);
    return needle.length > 0 && haystack.includes(` ${needle} `);
  });
}

/** A name written without spaces inside an address ("sozoskinclinic.com"). */
function compactMatch(address: string, names: readonly string[]): boolean {
  const compact = address.toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "");
  return names.some((name) => {
    const needle = name.toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "");
    return needle.length >= 3 && compact.includes(needle);
  });
}

export function namedOutcome(input: {
  /** The answer as saved (markdown). */
  text: string;
  /** The sources list: titles and addresses. */
  sources: readonly { url: string; title: string }[];
  /** The business name and its confirmed aliases. */
  names: readonly string[];
}): NamedOutcome {
  const names = input.names.filter((name) => name.trim());
  if (!names.length) return "absent";
  if (wordMatch(visibleAnswerText(input.text), names)) return "named";
  const addresses = [
    ...linkAddresses(input.text),
    ...input.sources.map((source) => source.url),
  ];
  if (
    addresses.some((address) => compactMatch(address, names)) ||
    input.sources.some((source) => wordMatch(source.title, names))
  )
    return "source_only";
  return "absent";
}
