import type { ParsedSourceInput } from "./source-input";
import {
  SafeSourceFetchError,
  bytesToDataUrl,
  safeFetchPublicResource,
  type SafeFetchOptions,
} from "./safe-source-fetch";

export interface SourceIdentity {
  display_name: string;
  description: string;
  canonical_url: string;
  icon_data_url: string | null;
  source_type: ParsedSourceInput["sourceType"];
  confidence: boolean;
}

export type SourceIdentityFetchOptions = Omit<SafeFetchOptions, "kind">;

export interface ParsedSourceMetadata {
  displayName: string;
  description: string;
  iconHref: string | null;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(x[\da-f]+|\d+);?/gi, (_match, digits: string) => {
      const radix = digits.toLowerCase().startsWith("x") ? 16 : 10;
      const number = Number.parseInt(
        radix === 16 ? digits.slice(1) : digits,
        radix,
      );
      return Number.isInteger(number) && number >= 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : "";
    })
    .replace(/&([a-z][a-z\d]+);?/gi, (match, name: string) => {
      return NAMED_ENTITIES[name.toLowerCase()] ?? match;
    });
}

function cleanText(value: string | undefined): string {
  if (!value) return "";
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function findTags(html: string, tagName: string): string[] {
  const lowerHtml = html.toLowerCase();
  const opening = `<${tagName.toLowerCase()}`;
  const tags: string[] = [];
  let searchFrom = 0;

  while (searchFrom < html.length) {
    const start = lowerHtml.indexOf(opening, searchFrom);
    if (start < 0) break;

    const afterName = lowerHtml[start + opening.length];
    if (
      afterName === "/" ||
      (afterName !== undefined && !/[\s/>]/.test(afterName))
    ) {
      searchFrom = start + opening.length;
      continue;
    }

    let quote: '"' | "'" | null = null;
    let end = start + opening.length;
    for (; end < html.length; end += 1) {
      const character = html[end];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        tags.push(html.slice(start, end + 1));
        searchFrom = end + 1;
        break;
      }
    }

    if (end >= html.length) break;
  }

  return tags;
}

function headHtml(html: string): string {
  const opening = findTags(html, "head")[0];
  if (!opening) return html;

  const openingEnd = html.indexOf(opening) + opening.length;
  const closingMatch = /<\/head\s*>/i.exec(html.slice(openingEnd));
  if (!closingMatch) return html.slice(openingEnd);
  return html.slice(openingEnd, openingEnd + closingMatch.index);
}

function parseAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const firstSpace = tag.search(/\s/);
  if (firstSpace < 0) return attributes;

  const attributeText = tag.slice(firstSpace);
  const pattern =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of attributeText.matchAll(pattern)) {
    const name = match[1]?.toLowerCase();
    if (!name) continue;
    attributes.set(name, match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function firstMetadataValue(
  metadata: Map<string, string>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = cleanText(metadata.get(key));
    if (value) return value;
  }
  return "";
}

function metadataMaps(html: string) {
  const metadata = new Map<string, string>();
  for (const tag of findTags(headHtml(html), "meta")) {
    const attributes = parseAttributes(tag);
    const key = cleanText(
      attributes.get("property") ?? attributes.get("name"),
    ).toLowerCase();
    const content = attributes.get("content");
    if (key && content !== undefined && !metadata.has(key)) {
      metadata.set(key, content);
    }
  }
  return metadata;
}

function titleValue(html: string): string {
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(
    headHtml(html),
  );
  return cleanText(titleMatch?.[1]);
}

function iconValue(html: string): string | null {
  for (const tag of findTags(headHtml(html), "link")) {
    const attributes = parseAttributes(tag);
    const rel = (attributes.get("rel") ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const href = cleanText(attributes.get("href"));
    if (rel.includes("icon") && href) return href;
  }
  return null;
}

export function parseSourceMetadata(
  html: string,
  sourceType: ParsedSourceInput["sourceType"],
): ParsedSourceMetadata {
  const metadata = metadataMaps(html);
  const ogTitle = firstMetadataValue(metadata, "og:title");

  if (sourceType === "instagram") {
    const marker = ogTitle.indexOf(" (@");
    return {
      displayName: cleanText(marker >= 0 ? ogTitle.slice(0, marker) : ogTitle),
      description: "",
      iconHref: iconValue(html),
    };
  }

  return {
    displayName:
      firstMetadataValue(metadata, "og:site_name", "og:title") ||
      titleValue(html),
    description: firstMetadataValue(metadata, "og:description", "description"),
    iconHref: iconValue(html),
  };
}

function isRateLimitFailure(error: unknown): boolean {
  return (
    error instanceof SafeSourceFetchError &&
    (error.code === "RATE_LIMITED" || error.code === "RATE_LIMIT_UNAVAILABLE")
  );
}

async function inlineIcon(
  pageUrl: string,
  iconHref: string | null,
  options: SourceIdentityFetchOptions,
): Promise<string | null> {
  const href = iconHref || "/favicon.ico";
  let iconUrl: URL;
  try {
    iconUrl = new URL(href, pageUrl);
  } catch {
    return null;
  }

  try {
    const icon = await safeFetchPublicResource(iconUrl, {
      ...options,
      kind: "image",
    });
    return bytesToDataUrl(icon.bytes, icon.contentType);
  } catch (error) {
    if (isRateLimitFailure(error)) throw error;
    return null;
  }
}

export async function fetchSourceIdentity(
  source: ParsedSourceInput,
  options: SourceIdentityFetchOptions,
): Promise<SourceIdentity> {
  const page = await safeFetchPublicResource(source.normalizedUrl, {
    ...options,
    kind: "html",
  });
  const metadata = parseSourceMetadata(
    new TextDecoder().decode(page.bytes),
    source.sourceType,
  );
  const displayName = metadata.displayName;

  return {
    display_name: displayName,
    description: metadata.description,
    canonical_url: page.url,
    icon_data_url: await inlineIcon(page.url, metadata.iconHref, options),
    source_type: source.sourceType,
    confidence: Boolean(displayName),
  };
}
