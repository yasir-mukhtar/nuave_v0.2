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
/** The own site's branch list (founder decision 2026-10-28): long enough
 * for a chain's whole list (Audy Dental's 60+ branches were cut at C). */
export const BRANCH_PAGE_TEXT_MAX_CHARS = 20_000;
/** Own-site pages: the address the audit started from, plus up to this many
 * of its pages found by the site map (prices, doctors, treatments, about). */
export const OWN_EXTRA_PAGES = 4;
export const CITED_PAGES = 10;

/** Never read: social profiles and personal posts, forums and Q&A sites
 * (people, not businesses), maps, search and link shorteners. Only public
 * business pages are read. */
const SKIPPED_HOSTS =
  /(^|\.)(instagram\.com|facebook\.com|fb\.com|tiktok\.com|x\.com|twitter\.com|threads\.net|youtube\.com|youtu\.be|wa\.me|linktr\.ee|reddit\.com|quora\.com|kaskus\.co\.id|google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|bing\.com|bit\.ly|s\.id)$/i;

/** Own-site pages never read: posts, news and their archives (a blog post
 * on hair loss says little about the clinic's branches or treatments),
 * sitemaps, search and files. */
const SKIPPED_OWN_PAGE =
  /\/(blog|blogs|artikel|article|articles|news|berita|post|posts|tag|tags|category|categories|kategori|author|search|cari|pencarian|feed|wp-content|careers?|karir|lowongan[^/]*)(\/|$)|\/\d{4}\/\d{2}\/|sitemap|\.(xml|pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?)$/i;

/** Kinds of own-site pages worth reading, most useful first, by words in
 * their address (or, failing that, their title). One page of each kind is
 * read before a second of any. */
const OWN_PAGE_KINDS = [
  // What the business offers.
  /layanan|service|treatment|perawatan|tindakan|produk|product|program|center|centre|poli|spesialis|specialt/i,
  // Where it is.
  /cabang|lokasi|location|branch|outlet|alamat|klinik-kami|our-clinic/i,
  // Who treats patients.
  // "tim" as a whole word: "testimoni" is not a team page.
  /dokter|doctor|(^|[/_-])(dr|tim|team|staff)([/_-]|$)/i,
  // What it costs.
  /harga|price|pricelist|biaya|tarif|promo/i,
  // The business itself.
  /tentang|about|profil|profile/i,
];

/** The kind of an own-site page (an index into `OWN_PAGE_KINDS`), or -1. */
function ownPageKind(url: string, title: string | undefined): number {
  const path = new URL(url).pathname;
  const byPath = OWN_PAGE_KINDS.findIndex((kind) => kind.test(path));
  return byPath >= 0 || !title
    ? byPath
    : OWN_PAGE_KINDS.findIndex((kind) => kind.test(title));
}

/** True for an own-site page about where the business is. */
export function isBranchPage(url: string): boolean {
  return ownPageKind(url, undefined) === 1;
}

/** Path depth: a list page ("/lokasi") before one of its items
 * ("/lokasi/jakarta"). */
function depth(url: string): number {
  return new URL(url).pathname.split("/").filter(Boolean).length;
}

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

/**
 * Own-site pages from the site map worth reading, best first: what the
 * business offers, where it is, who treats patients, what it costs, and
 * about the business. Within a kind the shallowest page comes first (a list
 * of branches before one branch), and every kind gets one page before any
 * gets a second. Posts, news and archives are never read.
 */
export function ownPagesToRead(
  start: string,
  mapped: readonly { url: string; title?: string }[],
  limit = OWN_EXTRA_PAGES,
): string[] {
  const home = canonical(start);
  const domain = urlDomain(home);
  const seen = new Set([home]);
  const byKind: string[][] = OWN_PAGE_KINDS.map(() => []);
  for (const link of mapped) {
    const url = canonical(link.url);
    if (seen.has(url) || urlDomain(url) !== domain || !readable(url)) continue;
    if (SKIPPED_OWN_PAGE.test(new URL(url).pathname)) continue;
    const kind = ownPageKind(url, link.title);
    if (kind < 0) continue;
    seen.add(url);
    byKind[kind]!.push(url);
  }
  // Stable: pages of the same depth keep the site map's order.
  byKind.forEach((urls) => urls.sort((a, b) => depth(a) - depth(b)));
  const out: string[] = [];
  for (let round = 0; out.length < limit; round += 1) {
    const picked = byKind.flatMap((urls) => urls[round] ?? []);
    if (!picked.length) break;
    out.push(...picked.slice(0, limit - out.length));
  }
  return out;
}

export const EMAIL_REMOVED = "[email dihapus]";
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi;

/** Phone numbers and email addresses removed: a page may name a person. */
export function withoutContacts(text: string): string {
  return stripPhoneNumbers(text).replace(EMAIL, EMAIL_REMOVED);
}

/** Lines that carry no content: a broken image's address, or a slider's
 * page number ("- 3"). */
const NOISE_LINE =
  /^(?:[-*]\s*\d{1,2}|\S*\.(?:webp|png|jpe?g|gif|svg|avif)\S*)$/i;

/** A line worth comparing for repeats: one with a link, or a long one.
 * Short lines repeat for good reasons (the same price for two treatments,
 * the brand name above each branch) and are kept. */
function repeatable(line: string): boolean {
  return /\]\(/.test(line) || line.length >= 40;
}

/** The lines every one of the own site's pages repeats: its menu, header
 * and footer (founder decision 2026-10-28: stripped before the cut, so the
 * cut keeps content). Only with three or more pages, so a list two pages
 * share (the services on the homepage and on /services) stays. */
export function siteChrome(markdowns: readonly string[]): Set<string> {
  if (markdowns.length < 3) return new Set();
  const sets = markdowns.map(
    (markdown) =>
      new Set(
        markdown
          .split("\n")
          .map((line) => line.trim())
          .filter(repeatable),
      ),
  );
  return new Set(
    [...sets[0]!].filter((line) => sets.every((set) => set.has(line))),
  );
}

/** A link worth only its label: a map, a WhatsApp chat, or any address
 * over 100 characters. Sozo's branch list ran past its cut on its map
 * links (founder decision 2026-10-28). */
const LABEL_ONLY_LINK =
  /^(?:www\.)?(?:google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com|api\.whatsapp\.com|wa\.me|wa\.link)/i;
/** A markdown link, not an image; its address may hold one pair of
 * brackets, as a map search for "AEON (3-23AB)" does. */
const LINK = /(?<!!)\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/g;
const LONG_URL = /https?:\/\/\S{90,}/g;

function shortLinks(line: string): string {
  return line
    .replace(LINK, (whole, label: string, url: string) =>
      url.length > 100 || LABEL_ONLY_LINK.test(url.replace(/^https?:\/\//, ""))
        ? label
        : whole,
    )
    .replace(LONG_URL, "")
    .trim();
}

/** A phone form's country list ("- Belarus (Беларусь)+375"), dropped when a
 * page has five or more: Audy's chat form filled its branch page's cut. */
const DIALING_CODE_ITEM = /^[-*]\s+\S.*\+\d{1,4}$/;

/** A page's text for the writer: phone numbers and email addresses removed;
 * images, noise lines, the site's menu (`chrome`), a phone form's country
 * list and repeats of a linked or long line dropped; map, chat and long
 * links cut to their label; blank runs closed; cut at the limit on a line
 * end. */
export function pageText(
  markdown: string,
  max = PAGE_TEXT_MAX_CHARS,
  chrome: ReadonlySet<string> = new Set(),
): string {
  const lines = markdown.split("\n");
  const dialingCodes =
    lines.filter((raw) => DIALING_CODE_ITEM.test(raw.trim())).length >= 5;
  const seen = new Set<string>();
  const kept = lines.flatMap((raw) => {
    const line = raw.trim();
    if (!line) return [raw];
    if (NOISE_LINE.test(line) || chrome.has(line)) return [];
    if (dialingCodes && DIALING_CODE_ITEM.test(line)) return [];
    const short = shortLinks(line);
    if (!short) return [];
    if (repeatable(line)) {
      if (seen.has(short)) return [];
      seen.add(short);
    }
    return [raw.replace(line, () => short)];
  });
  const clean = withoutContacts(kept.join("\n"))
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
/** Links one site map may return. */
export const MAP_LIMIT = 5_000;

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
      // The map lists sitemap entries first, so a blog of a few hundred
      // posts filled a 200-link map and hid every treatment and branch
      // page (sozoskinclinic.com, 2026-10-28). One map is one credit at any
      // limit.
      const json = await post("map", { url, limit: MAP_LIMIT });
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
  /** False when the own site was already read (at the paid website reading,
   * step 3): only the cited pages are read, still never the own site's. */
  readOwn?: boolean;
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
  const readOwn = input.readOwn !== false;
  let mapped: { url: string; title?: string }[] = [];
  if (own && readOwn)
    mapped = await input.fetcher.map(own).catch((e) => (stop(e), []));
  const ownUrls = own && readOwn ? [own, ...ownPagesToRead(own, mapped)] : [];
  const cited = citedPagesToRead(input.sources, ownDomain);
  const wanted = [
    ...ownUrls.map((url) => ({ url, kind: "own" as const, cited_in: [] })),
    ...cited.map((page) => ({ ...page, kind: "cited" as const })),
  ];
  const results: (ReadPage | null)[] = wanted.map(() => null);
  const raw: ({ title: string; markdown: string } | null)[] = wanted.map(
    () => null,
  );
  let next = 0;
  const worker = async () => {
    while (stopped === undefined && next < wanted.length) {
      const index = next++;
      const page = wanted[index]!;
      const read = await input.fetcher.scrape(page.url).catch((e) => {
        stop(e);
        return null;
      });
      if (read?.markdown.trim()) raw[index] = read;
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, input.concurrency ?? 1) }, worker),
  );
  // The own site's menu is found across its pages, so the text is made only
  // once every page is read.
  const chrome = siteChrome(
    wanted.flatMap((page, i) =>
      page.kind === "own" && raw[i] ? [raw[i]!.markdown] : [],
    ),
  );
  wanted.forEach((page, i) => {
    const read = raw[i];
    if (!read) return;
    const own = page.kind === "own";
    const text = pageText(
      read.markdown,
      own && isBranchPage(page.url)
        ? BRANCH_PAGE_TEXT_MAX_CHARS
        : PAGE_TEXT_MAX_CHARS,
      own ? chrome : undefined,
    );
    if (!text) return;
    results[i] = {
      url: page.url,
      domain: urlDomain(page.url) ?? "",
      title: withoutContacts(String(read.title ?? "")).slice(0, 200),
      kind: page.kind,
      cited_in: page.cited_in,
      text,
    };
  });
  return {
    pages: results.filter((page): page is ReadPage => page !== null),
    unread: wanted.flatMap((page, i) => (results[i] ? [] : [page.url])),
    ...(stopped === undefined ? {} : { stopped }),
  };
}
