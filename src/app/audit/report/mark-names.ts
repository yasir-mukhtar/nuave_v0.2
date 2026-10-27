/**
 * A rehype step that wraps the business's own names in `<mark>` inside an
 * answer, so the owner finds them fast (J33). It only adds marks around the
 * observed text; the words themselves are never changed. Code stays as it is.
 */
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

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

export function markNames(names: readonly string[]) {
  return () => (tree: HastNode) => {
    const split = (text: string): HastNode[] => {
      const parts: HastNode[] = [];
      let last = 0;
      for (const { start, end } of findNames(text, names)) {
        if (start > last)
          parts.push({ type: "text", value: text.slice(last, start) });
        parts.push({
          type: "element",
          tagName: "mark",
          properties: {},
          children: [{ type: "text", value: text.slice(start, end) }],
        });
        last = end;
      }
      if (!parts.length) return [{ type: "text", value: text }];
      if (last < text.length)
        parts.push({ type: "text", value: text.slice(last) });
      return parts;
    };
    const visit = (node: HastNode) => {
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        if (child.type === "element") {
          if (child.tagName !== "code" && child.tagName !== "pre") visit(child);
          return [child];
        }
        return child.type === "text" && child.value
          ? split(child.value)
          : [child];
      });
    };
    visit(tree);
  };
}
