/**
 * Firecrawl reads the business's own site and the pages the AI answers cited
 * most, so the report writer can say what is on them ("the 'best clinics'
 * list Google cites is an attendance app's blog"), not only who AI named.
 *
 * First built for the reading test (founder decision 2026-10-27); every live
 * two-source order reads its pages since the go-live of 2026-10-28 (Spec 021
 * B-08, the runner's pages step), and the report-writer test
 * (scripts/report-writer-test/) reads the same way. Public business pages
 * only; phone numbers and email addresses are removed from everything kept.
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

/** Tracking tags that change an address but not its page ("?utm_source=
 * chatgpt.com", which ChatGPT adds to links it cites). */
const TRACKING_PARAM = /^(?:utm_.+|gclid|fbclid|srsltid|mc_cid|mc_eid)$/i;

/** The address without its fragment or tracking tags, so one page cited
 * twice, with and without "?utm_source=chatgpt.com", is read once. */
function canonical(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    // The raw query, filtered as it was written: rebuilding it would change
    // the encoding of what stays ("%20" to "+").
    const kept = parsed.search
      .slice(1)
      .split("&")
      .filter((part) => {
        const name = part.split("=")[0] ?? "";
        let decoded = name;
        try {
          decoded = decodeURIComponent(name);
        } catch {
          // keep the name as written
        }
        return part !== "" && !TRACKING_PARAM.test(decoded);
      });
    parsed.search = kept.length ? `?${kept.join("&")}` : "";
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

export const EMAIL_REMOVED = "[email dihapus]";
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi;

/** Phone numbers and email addresses removed: a page may name a person. */
export function withoutContacts(text: string): string {
  return stripPhoneNumbers(text).replace(EMAIL, EMAIL_REMOVED);
}

/** A page's text for the writer: phone numbers and email addresses removed,
 * images and blank runs dropped, cut at the limit on a line end. */
export function pageText(markdown: string, max = PAGE_TEXT_MAX_CHARS): string {
  const clean = withoutContacts(markdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = cut.lastIndexOf("\n");
  return `${cut.slice(0, end > max * 0.6 ? end : max).trim()}\n…`;
}

/** Firecrawl itself cannot serve: a bad key (401), no credits (402), or too
 * many requests (429) after its waits. The reading stops; the pages already
 * read are kept. Anything else (a 403 for a site Firecrawl does not read, a
 * 5xx, a timeout) is one unread page. */
export class FirecrawlUnavailable extends Error {
  constructor(readonly status: number) {
    super(`Firecrawl answered ${status}; the reading stopped.`);
    this.name = "FirecrawlUnavailable";
  }
}

/** One reading's whole time, every request and every wait included. */
export const READ_DEADLINE_MS = 150_000;
/** Pages read at once: Firecrawl's limit on this account's plan. */
export const READ_CONCURRENCY = 2;
/** One request's own time limit (and again for each retry). */
const REQUEST_TIMEOUT_MS = 90_000;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", stop);
      resolve();
    }, ms);
    const stop = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    signal?.addEventListener("abort", stop, { once: true });
  });

/** A request's signal: its own time limit, and the reading's deadline. */
function requestSignal(deadline?: AbortSignal): AbortSignal {
  const own = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return deadline ? AbortSignal.any([deadline, own]) : own;
}

/**
 * A fetch that waits out Firecrawl's rate limit (429) instead of giving up:
 * up to three waits, each as long as Firecrawl asks (Retry-After) or 30
 * seconds, at most 70. Any other answer, and a fourth 429, go to the reader
 * unchanged. With a deadline, a wait never runs past it (the request then
 * fails as aborted, one unread page), and each retry keeps the deadline with
 * a fresh request time limit.
 */
export function patientFetch(
  fetchImpl: typeof fetch = fetch,
  wait: (ms: number, signal?: AbortSignal) => Promise<void> = sleep,
  deadline?: AbortSignal,
): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; ; attempt += 1) {
      const response = await fetchImpl(input, init);
      if (response.status !== 429 || attempt === 3) return response;
      const asked = Number(response.headers.get("retry-after"));
      await wait(Math.min(asked > 0 ? asked * 1000 : 30_000, 70_000), deadline);
      if (init?.signal) init = { ...init, signal: requestSignal(deadline) };
    }
  };
}

/** A fetch that makes at most `limit` requests (retries included); past it,
 * a request fails unsent, so the page is unread. */
export function cappedFetch(
  fetchImpl: typeof fetch,
  limit: number,
): typeof fetch & { sent(): number } {
  let sent = 0;
  const capped = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (sent >= limit) throw new Error("Firecrawl request limit reached.");
    sent += 1;
    return fetchImpl(input, init);
  }) as typeof fetch & { sent(): number };
  capped.sent = () => sent;
  return capped;
}

/** What the reader needs from Firecrawl (a real client or a test double). */
export type PageFetcher = {
  scrape(url: string): Promise<{ title: string; markdown: string } | null>;
  map(url: string): Promise<{ url: string; title?: string }[]>;
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";

/** Firecrawl's scrape and map endpoints (v2), read from Indonesia. A page
 * that fails or is empty gives null; a failed map gives no pages. With a
 * deadline, every request stops at it. */
export function firecrawlFetcher(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  deadline?: AbortSignal,
): PageFetcher {
  const post = async (path: string, body: unknown) => {
    const response = await fetchImpl(`${FIRECRAWL}/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: requestSignal(deadline),
    }).catch(() => null);
    // A failed request or a page Firecrawl could not read is one unread
    // page; Firecrawl being unable to serve at all stops the reading.
    if (!response) return null;
    if ([401, 402, 429].includes(response.status))
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

/** The most pages one reading asks for: one site map, the own start page and
 * its useful pages, and the cited pages. */
export const MAX_REQUESTS_PER_ORDER = 1 + 1 + OWN_EXTRA_PAGES + CITED_PAGES;
/** The most Firecrawl requests one reading makes, retries after a 429
 * included (`cappedFetch`). */
export const MAX_FIRECRAWL_REQUESTS = 24;

export type PagesRead = {
  pages: ReadPage[];
  unread: string[];
  /** Set when Firecrawl stopped the reading (401, 402, or 429 after its
   * waits); the pages read before it are kept. */
  stopped?: number;
};

/**
 * Reads the business's own site (its start page and up to four useful pages
 * from the site map) and the ten pages the answers cited most, two at a time
 * (`concurrency`), in that order of importance. Pages that cannot be read
 * are left out; the result says which. When Firecrawl stops the reading
 * (`FirecrawlUnavailable`), the pages read so far are kept, the rest are
 * unread, and `stopped` gives Firecrawl's status.
 */
export async function readPagesForReport(input: {
  /** The address the audit started from, as the owner gave it ("klinik.id",
   * a full address or an Instagram profile, which is not read). */
  ownSite: string | null;
  sources: readonly CitedSource[];
  fetcher: PageFetcher;
  concurrency?: number;
}): Promise<PagesRead> {
  const parsed = input.ownSite ? parseSourceInput(input.ownSite) : null;
  const own =
    parsed?.sourceType === "website" && readable(parsed.normalizedUrl)
      ? canonical(parsed.normalizedUrl)
      : null;
  const ownDomain = own ? urlDomain(own) : null;
  let stopped: number | undefined;
  const stop = (error: unknown) => {
    if (!(error instanceof FirecrawlUnavailable)) throw error;
    stopped ??= error.status;
  };
  let mapped: { url: string; title?: string }[] = [];
  if (own) mapped = await input.fetcher.map(own).catch((e) => (stop(e), []));
  const ownUrls = own ? [own, ...ownPagesToRead(own, mapped)] : [];
  const cited = citedPagesToRead(input.sources, ownDomain);
  const wanted = [
    ...ownUrls.map((url) => ({ url, kind: "own" as const, cited_in: [] })),
    ...cited.map((page) => ({ ...page, kind: "cited" as const })),
  ];
  const results: (ReadPage | null)[] = wanted.map(() => null);
  let next = 0;
  const worker = async () => {
    while (stopped === undefined && next < wanted.length) {
      const index = next++;
      const page = wanted[index]!;
      const read = await input.fetcher.scrape(page.url).catch((e) => {
        stop(e);
        return null;
      });
      const text = read ? pageText(read.markdown) : "";
      if (!text) continue;
      results[index] = {
        url: page.url,
        domain: urlDomain(page.url) ?? "",
        title: withoutContacts(String(read!.title ?? "")).slice(0, 200),
        kind: page.kind,
        cited_in: page.cited_in,
        text,
      };
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, input.concurrency ?? 1) }, worker),
  );
  return {
    pages: results.filter((page): page is ReadPage => page !== null),
    unread: wanted.flatMap((page, i) => (results[i] ? [] : [page.url])),
    ...(stopped === undefined ? {} : { stopped }),
  };
}
