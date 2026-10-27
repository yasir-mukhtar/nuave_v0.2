/**
 * The reading test (founder decision 2026-10-27, moved before G1): Firecrawl
 * reads the business's own site and the pages the AI answers cited most, so
 * the report writer can say what is on them ("the 'best clinics' list Google
 * cites is an attendance app's blog"), not only who AI named.
 *
 * Used by the report-writer test only (scripts/report-writer-test/); the
 * production writer reads no pages until the founder judges the test. Public
 * business pages only; phone numbers are removed from everything kept.
 */
import { stripPhoneNumbers } from "../checks/phones";
import { parseSourceInput } from "../audit/source-input";
import { urlDomain } from "../audit/two-source-report";

/** One page as the writer reads it. */
export type ReadPage = {
  url: string;
  domain: string;
  title: string;
  /** The business's own site, or a page an AI answer cited. */
  kind: "own" | "cited";
  /** The questions whose answers cited it (empty for the own site). */
  cited_in: string[];
  /** The page's main text as Markdown, phone numbers removed, cut at
   * `PAGE_TEXT_MAX_CHARS`. */
  text: string;
};

export const PAGE_TEXT_MAX_CHARS = 6_000;
/** Own-site pages: the address the audit started from, plus up to this many
 * of its pages found by the site map (prices, doctors, treatments, about). */
export const OWN_EXTRA_PAGES = 4;
export const CITED_PAGES = 10;

/** Never read: social profiles and personal posts, forums and Q&A sites
 * (people, not businesses), maps, search and link shorteners. Only public
 * business pages are read. */
const SKIPPED_HOSTS =
  /(^|\.)(instagram\.com|facebook\.com|fb\.com|tiktok\.com|x\.com|twitter\.com|threads\.net|youtube\.com|youtu\.be|wa\.me|linktr\.ee|reddit\.com|quora\.com|kaskus\.co\.id|google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|bing\.com|bit\.ly|s\.id)$/i;

/** Own-site pages worth reading, by words in their address or title. */
const USEFUL_OWN_PAGE =
  /harga|price|pricelist|biaya|tarif|promo|dokter|doctor|dr-|tim|team|treatment|perawatan|layanan|service|tentang|about|cabang|lokasi|location|branch/i;

export type CitedSource = { prompt_id: string; url: string };

function readable(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      !SKIPPED_HOSTS.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

/** The address without its fragment, so one page cited twice counts once. */
/** Tracking tags that change an address but not its page ("?utm_source=
 * chatgpt.com", which ChatGPT adds to links it cites). */
const TRACKING_PARAM = /^(?:utm_.+|gclid|fbclid|srsltid|mc_cid|mc_eid)$/i;

/** The address without its fragment or tracking tags, so one page cited
 * twice, with and without "?utm_source=chatgpt.com", is read once. */
function canonical(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()])
      if (TRACKING_PARAM.test(key)) parsed.searchParams.delete(key);
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * The cited pages to read: those cited by the most answers (both sources
 * together), then in order of first citation; never the business's own site
 * (read separately) or a skipped host.
 */
export function citedPagesToRead(
  sources: readonly CitedSource[],
  ownDomain: string | null,
  limit = CITED_PAGES,
): { url: string; cited_in: string[] }[] {
  const pages = new Map<string, Set<string>>();
  for (const source of sources) {
    if (!readable(source.url)) continue;
    const url = canonical(source.url);
    const domain = urlDomain(url);
    if (!domain || (ownDomain && domain === ownDomain)) continue;
    if (!pages.has(url)) pages.set(url, new Set());
    pages.get(url)!.add(source.prompt_id);
  }
  return [...pages.entries()]
    .map(([url, ids], order) => ({ url, cited_in: [...ids], order }))
    .sort((a, b) => b.cited_in.length - a.cited_in.length || a.order - b.order)
    .slice(0, limit)
    .map(({ url, cited_in }) => ({ url, cited_in }));
}

/** Own-site pages from the site map worth reading, best first. */
export function ownPagesToRead(
  start: string,
  mapped: readonly { url: string; title?: string }[],
  limit = OWN_EXTRA_PAGES,
): string[] {
  const home = canonical(start);
  const domain = urlDomain(home);
  const seen = new Set([home]);
  const out: string[] = [];
  for (const link of mapped) {
    const url = canonical(link.url);
    if (seen.has(url) || urlDomain(url) !== domain || !readable(url)) continue;
    if (!USEFUL_OWN_PAGE.test(`${url} ${link.title ?? ""}`)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= limit) break;
  }
  return out;
}

/** A page's text for the writer: phone numbers removed, images and blank
 * runs dropped, cut at the limit on a line end. */
export function pageText(markdown: string, max = PAGE_TEXT_MAX_CHARS): string {
  const clean = stripPhoneNumbers(markdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = cut.lastIndexOf("\n");
  return `${cut.slice(0, end > max * 0.6 ? end : max).trim()}\n…`;
}

/** Firecrawl itself cannot serve (a bad key, no credits, too many requests,
 * an outage): the reading stops, and nothing is kept, so a later run reads
 * again instead of writing "with pages" from no pages. */
export class FirecrawlUnavailable extends Error {
  constructor(readonly status: number) {
    super(`Firecrawl answered ${status}; no pages were kept.`);
    this.name = "FirecrawlUnavailable";
  }
}

/** What the reader needs from Firecrawl (a real client or a test double). */
export type PageFetcher = {
  scrape(url: string): Promise<{ title: string; markdown: string } | null>;
  map(url: string): Promise<{ url: string; title?: string }[]>;
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";

/** Firecrawl's scrape and map endpoints (v2), read from Indonesia. A page
 * that fails or is empty gives null; a failed map gives no pages. */
export function firecrawlFetcher(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): PageFetcher {
  const post = async (path: string, body: unknown) => {
    const response = await fetchImpl(`${FIRECRAWL}/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    }).catch(() => null);
    // A failed request or a page Firecrawl could not read is one unread
    // page; Firecrawl being unable to serve at all stops the reading.
    if (!response) return null;
    if (
      [401, 402, 403, 429].includes(response.status) ||
      response.status >= 500
    )
      throw new FirecrawlUnavailable(response.status);
    if (!response.ok) return null;
    return (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
  };
  return {
    async scrape(url) {
      const json = await post("scrape", {
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 60_000,
        location: { country: "ID", languages: ["id-ID"] },
        // The plain proxy: one credit per page, never the dearer kinds.
        proxy: "basic",
        blockAds: true,
        removeBase64Images: true,
      });
      const data = json?.success
        ? (json.data as {
            markdown?: string;
            metadata?: { title?: string; statusCode?: number };
          })
        : null;
      const status = data?.metadata?.statusCode ?? 200;
      if (
        typeof data?.markdown !== "string" ||
        !data.markdown.trim() ||
        status >= 400
      )
        return null;
      const title = data.metadata?.title;
      return {
        title: typeof title === "string" ? title : "",
        markdown: data.markdown,
      };
    },
    async map(url) {
      const json = await post("map", { url, limit: 200 });
      return json?.success && Array.isArray(json.links)
        ? (json.links as { url: string; title?: string }[]).filter(
            (link) => typeof link?.url === "string",
          )
        : [];
    },
  };
}

/** The most Firecrawl requests one order makes: one site map, the own start
 * page and its useful pages, and the cited pages. */
export const MAX_REQUESTS_PER_ORDER = 1 + 1 + OWN_EXTRA_PAGES + CITED_PAGES;

/**
 * Reads the business's own site (its start page and up to four useful pages
 * from the site map) and the ten pages the answers cited most, at most
 * `MAX_REQUESTS_PER_ORDER` requests. Pages that cannot be read are left out;
 * the result says which. Throws `FirecrawlUnavailable` when Firecrawl cannot
 * serve at all.
 */
export async function readPagesForReport(input: {
  /** The address the audit started from, as the owner gave it ("klinik.id",
   * a full address or an Instagram profile, which is not read). */
  ownSite: string | null;
  sources: readonly CitedSource[];
  fetcher: PageFetcher;
}): Promise<{ pages: ReadPage[]; unread: string[] }> {
  const parsed = input.ownSite ? parseSourceInput(input.ownSite) : null;
  const own =
    parsed?.sourceType === "website" && readable(parsed.normalizedUrl)
      ? canonical(parsed.normalizedUrl)
      : null;
  const ownDomain = own ? urlDomain(own) : null;
  const ownUrls = own
    ? [own, ...ownPagesToRead(own, await input.fetcher.map(own))]
    : [];
  const cited = citedPagesToRead(input.sources, ownDomain);
  const wanted = [
    ...ownUrls.map((url) => ({ url, kind: "own" as const, cited_in: [] })),
    ...cited.map((page) => ({ ...page, kind: "cited" as const })),
  ];
  const pages: ReadPage[] = [];
  const unread: string[] = [];
  for (const page of wanted) {
    const read = await input.fetcher.scrape(page.url);
    const text = read ? pageText(read.markdown) : "";
    if (!text) {
      unread.push(page.url);
      continue;
    }
    pages.push({
      url: page.url,
      domain: urlDomain(page.url) ?? "",
      title: stripPhoneNumbers(String(read!.title ?? "")).slice(0, 200),
      kind: page.kind,
      cited_in: page.cited_in,
      text,
    });
  }
  return { pages, unread };
}
