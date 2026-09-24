import { isSensitiveIntakeText, unsafePublicSource } from "./sensitive-intake";
import {
  safeFetchPublicResource,
  SafeSourceFetchError,
  type SafeFetchOptions,
} from "./safe-source-fetch";
import {
  SOURCE_EXCERPT_RESTRICTED_MESSAGE,
  type PublicSourceData,
} from "./types";

export class SensitiveSourceExcerptError extends Error {
  constructor() {
    super(SOURCE_EXCERPT_RESTRICTED_MESSAGE);
  }
}

// A bounded static reader, not a DOM/browser: no resources, CSS or scripts run.
// Unknown entities stay literal rather than guessing a name or spelling.
const entities: Record<string, string> = {
  amp: "&",
  apos: "'",
  quot: '"',
  lt: "<",
  gt: ">",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  eacute: "é",
  Eacute: "É",
  egrave: "è",
  agrave: "à",
  aacute: "á",
  ouml: "ö",
  uuml: "ü",
  ntilde: "ñ",
  ccedil: "ç",
  euro: "€",
  pound: "£",
};
function decode(value: string) {
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi,
    (whole, entity: string) => {
      if (!entity.startsWith("#")) return entities[entity] ?? whole;
      const hex = entity[1]?.toLowerCase() === "x";
      const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return point > 0 &&
        point <= 0x10ffff &&
        !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point)
        : "�";
    },
  );
}
function attributes(tag: string) {
  const result = new Map<string, string>();
  const body = tag.replace(/^<\/?[\w:-]+/, "").replace(/\/?\s*>$/, "");
  for (const match of body.matchAll(
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
  )) {
    const name = match[1].toLowerCase();
    if (!result.has(name))
      result.set(name, decode(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return result;
}
const excludedTags = new Set([
  "head",
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "object",
  "embed",
  "svg",
  "canvas",
  "form",
  "nav",
  "header",
  "footer",
  "aside",
  "address",
  "button",
  "textarea",
  "select",
  "blockquote",
]);
const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const blockTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li"]);
const excludedLabel =
  /(?:^|[\s_-])(?:contact|kontak|whatsapp|chat|staff|team|profiles?|testimonials?|testimoni|reviews?|authors?|person|comments?|newsletter|social|navigation|cookie|sr-only|visually-hidden|hidden)(?:$|[\s_-])/i;
// Match the complete declaration, including decimal zero and !important, without
// mistaking nonzero values or other properties (e.g. stroke-opacity) for opacity.
const zeroOpacity =
  /(?:^|;)\s*opacity\s*:\s*[+-]?(?:0+(?:\.0+)?|\.0+)(?:e[+-]?\d+)?%?\s*(?:!\s*important\s*)?(?:;|$)/i;
type Block = {
  text: string;
  preferred: boolean;
  order: number;
  contact: boolean;
};
type Frame = {
  tag: string;
  excluded: boolean;
  preferred: boolean;
  block?: Block;
};

function screenBlock(text: string): boolean {
  // Remove only ordinary public contact patterns from the *screening copy*.
  // Credential URLs and long account/card/identity numbers still stop the run.
  let contact = false;
  const screened = text
    .replace(/https?:\/\/[^\s<>]+|www\.[^\s<>]+/gi, (url) => {
      if (unsafePublicSource(url)) throw new SensitiveSourceExcerptError();
      contact = true;
      return "";
    })
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, () => {
      contact = true;
      return "";
    })
    .replace(/(?:\+?\d[\d ()-]{6,}\d)/g, (number) => {
      const count = number.replace(/\D/g, "").length;
      if (count >= 8 && count <= 12) {
        contact = true;
        return "";
      }
      return number;
    });
  if (isSensitiveIntakeText(screened)) throw new SensitiveSourceExcerptError();
  return (
    contact ||
    /\b(?:hubungi|contact us|call us|whatsapp|telepon|e-?mail)\b/i.test(text)
  );
}

/** Literal visible heading/paragraph/list blocks, without business-specific keywords. */
export function selectSourceExcerpt(html: string): string | null {
  const stack: Frame[] = [];
  const blocks: Block[] = [];
  const currentBlock = () => stack.findLast((frame) => frame.block)?.block;
  // Quote-aware tag boundaries; comments and raw excluded elements never supply text.
  const tokens =
    /<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\/?[a-z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>|[^<]+|</gi;
  for (const match of html.matchAll(tokens)) {
    const token = match[0];
    if (token.startsWith("<!")) continue;
    const tagMatch = /^<(\/?)([\w:-]+)/.exec(token);
    if (!tagMatch) {
      if (!stack.at(-1)?.excluded) {
        const block = currentBlock();
        if (block) block.text += token;
      }
      continue;
    }
    const tag = tagMatch[2].toLowerCase();
    // HTML raw-text content may itself contain fake markup. Only its real closing
    // delimiter leaves the excluded element; never interpret its embedded tags.
    const raw = stack.at(-1)?.tag;
    if (
      raw &&
      ["script", "style", "textarea", "noscript"].includes(raw) &&
      !(tagMatch[1] && tag === raw)
    )
      continue;
    if (tagMatch[1]) {
      const index = stack.findLastIndex((frame) => frame.tag === tag);
      if (index >= 0) {
        stack.splice(index);
        const parentBlock = currentBlock();
        if (parentBlock && blockTags.has(tag)) parentBlock.text += " ";
      }
      continue;
    }
    // Account for common optional paragraph/list closing tags conservatively.
    if (["p", "li"].includes(tag) && stack.at(-1)?.tag === tag) stack.pop();
    const attrs = attributes(token);
    const parent = stack.at(-1);
    const labels = `${attrs.get("id") ?? ""} ${attrs.get("class") ?? ""} ${attrs.get("aria-label") ?? ""}`;
    const style = attrs.get("style") ?? "";
    const excluded = Boolean(
      parent?.excluded ||
      excludedTags.has(tag) ||
      attrs.has("hidden") ||
      attrs.has("inert") ||
      attrs.get("aria-hidden")?.toLowerCase() === "true" ||
      /^(navigation|contentinfo|form|dialog)$/i.test(attrs.get("role") ?? "") ||
      /\/(?:Person|Review)(?:$|\s)/i.test(attrs.get("itemtype") ?? "") ||
      excludedLabel.test(labels) ||
      /(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))/i.test(
        style,
      ) ||
      zeroOpacity.test(style),
    );
    const preferred = Boolean(
      parent?.preferred ||
      tag === "main" ||
      tag === "article" ||
      attrs.get("role") === "main",
    );
    if (/^(?:mailto:|tel:)/i.test(attrs.get("href") ?? "")) {
      for (const frame of stack) if (frame.block) frame.block.contact = true;
    }
    if (tag === "br" && !excluded) {
      const block = currentBlock();
      if (block) block.text += " ";
    }
    if (voidTags.has(tag)) continue;
    const frame: Frame = { tag, excluded, preferred };
    if (blockTags.has(tag) && !excluded) {
      // Keep nested paragraphs/lists inside the enclosing complete block.
      // Splitting them out would move a parent's trailing words ahead of its
      // children. Block boundaries supply whitespace, never reordered wording.
      const parentBlock = currentBlock();
      if (parentBlock) parentBlock.text += " ";
      else {
        frame.block = {
          text: "",
          preferred,
          order: blocks.length,
          contact: false,
        };
        blocks.push(frame.block);
      }
    }
    if (stack.length >= 256)
      throw new SafeSourceFetchError(
        "FETCH_FAILED",
        "Source nesting exceeds the static reader bound.",
      );
    stack.push(frame);
  }
  const eligible: Block[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const text = decode(block.text).replace(/\s+/g, " ").trim();
    if (!text) continue;
    // Screen every candidate, including oversized blocks beyond the eventual cap.
    const contact = screenBlock(text);
    if (contact || block.contact || seen.has(text)) continue;
    seen.add(text);
    eligible.push({ ...block, text });
  }
  const selected: Block[] = [];
  let length = 0;
  for (const block of [
    ...eligible.filter((item) => item.preferred),
    ...eligible.filter((item) => !item.preferred),
  ]) {
    const next =
      new TextEncoder().encode(block.text).byteLength +
      (selected.length ? 2 : 0);
    if (length + next > 8_000) continue;
    selected.push(block);
    length += next;
  }
  return (
    selected
      .sort((a, b) => a.order - b.order)
      .map((item) => item.text)
      .join("\n\n") || null
  );
}

/** One server-owned read. The returned text must remain in request memory only. */
export async function fetchWebsiteExcerpt(
  websiteUrl: string,
  options: Omit<SafeFetchOptions, "kind" | "htmlScope">,
): Promise<PublicSourceData | null> {
  if (unsafePublicSource(websiteUrl)) throw new SensitiveSourceExcerptError();
  const page = await safeFetchPublicResource(websiteUrl, {
    ...options,
    kind: "html",
    htmlScope: "document",
  });
  const domain = (url: string) => new URL(url).hostname.replace(/^www\./, "");
  if (domain(page.url) !== domain(websiteUrl))
    throw new SafeSourceFetchError("INVALID_REDIRECT", "Source host changed.");
  if (unsafePublicSource(page.url)) throw new SensitiveSourceExcerptError();
  let html: string;
  try {
    html = new TextDecoder("utf-8", { fatal: true }).decode(page.bytes);
  } catch {
    throw new SafeSourceFetchError(
      "FETCH_FAILED",
      "Source text is not valid UTF-8.",
    );
  }
  const text = selectSourceExcerpt(html);
  return text
    ? { source_url: page.url, retrieved_at: new Date().toISOString(), text }
    : null;
}
