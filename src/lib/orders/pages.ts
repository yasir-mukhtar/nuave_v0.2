/**
 * Spec 021 B-08 (go-live of 2026-10-28): the pages Firecrawl reads for a live
 * two-source order before its report is written. The runner's pages step
 * reads them once and saves them in `orders.pages_json`; the report step
 * gives them to the writer. The report-writer test reads its orders' pages
 * with the same sources and the same reader.
 */
import type { GoogleCheck } from "../checks/google";
import type { AuditObservation } from "../audit/types";
import {
  cappedFetch,
  firecrawlFetcher,
  MAX_FIRECRAWL_REQUESTS,
  patientFetch,
  READ_CONCURRENCY,
  READ_DEADLINE_MS,
  readPagesForReport,
  type CitedSource,
  type PagesRead,
  type ReadPage,
} from "../reading/page-reader";
import type { OrderQuestionRow } from "./store";

/** The business's own pages, read at the paid website reading (step 3),
 * before the order runs (founder decision 2026-10-28). */
export type OwnPages = {
  pages: ReadPage[];
  unread: string[];
  stopped?: number;
  requests: number;
};

/** What `orders.pages_json` holds.
 * - `own_read`: the own site was read at step 3; the pages step reads only
 *   the cited pages and adds them.
 * - `reading`: a reading started (`tries` counts them); a run that died
 *   mid-read leaves it, and the next run tries again, at most twice. It
 *   keeps the step 3 pages (`own`), if any.
 * - `read`: the reading finished (with any number of pages).
 * - `partial`: Firecrawl stopped it (401, 402, or 429 after its waits); the
 *   pages read before are kept.
 * - `gave_up`: two tries never finished; the report goes on without pages.
 * - `no_key`: no Firecrawl key is set; no reading was tried.
 * Once the report is saved, the page text is dropped and only the addresses
 * stay (`urls`). */
export type SavedPages =
  | { status: "own_read"; own: OwnPages }
  | { status: "reading"; tries: number; own?: OwnPages }
  | {
      status: "read" | "partial";
      tries: number;
      pages: ReadPage[];
      unread: string[];
      stopped?: number;
      requests: number;
    }
  | { status: "gave_up"; tries: number }
  | { status: "no_key" }
  | {
      status: "kept_addresses";
      read: "read" | "partial";
      urls: string[];
      unread: string[];
    };

/** A reading is tried at most this many times. */
export const MAX_READING_TRIES = 2;

export function parseSavedPages(json: string | null): SavedPages | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as SavedPages;
    return value && typeof value === "object" && "status" in value
      ? value
      : null;
  } catch {
    return null;
  }
}

/** True when the order still needs its pages read before the report. */
export function pagesPending(saved: SavedPages | null): boolean {
  return (
    saved === null ||
    saved.status === "own_read" ||
    (saved.status === "reading" && saved.tries < MAX_READING_TRIES)
  );
}

/** The step 3 pages an order's pages step builds on, if any. */
export function ownPagesSaved(saved: SavedPages | null): OwnPages | null {
  return saved?.status === "own_read" || saved?.status === "reading"
    ? (saved.own ?? null)
    : null;
}

/** The pages the writer reads: none until a reading finished. */
export function pagesForWriter(saved: SavedPages | null): ReadPage[] {
  return saved && (saved.status === "read" || saved.status === "partial")
    ? saved.pages
    : [];
}

/** What stays once the report is saved: the addresses, not the text. */
export function addressesOnly(saved: SavedPages | null): SavedPages | null {
  const own = ownPagesSaved(saved);
  // A report written with no pages step (the OpenAI writer) still drops the
  // step 3 page text.
  if (own)
    return {
      status: "kept_addresses",
      read: own.stopped === undefined ? "read" : "partial",
      urls: own.pages.map((page) => page.url),
      unread: own.unread,
    };
  if (!saved || (saved.status !== "read" && saved.status !== "partial"))
    return saved;
  return {
    status: "kept_addresses",
    read: saved.status,
    urls: saved.pages.map((page) => page.url),
    unread: saved.unread,
  };
}

/** The pages an order's answers cited: every completed ChatGPT answer's
 * sources and every Google summary's references, with their question. */
export function orderCitedSources(
  rows: readonly OrderQuestionRow[],
): CitedSource[] {
  return rows.flatMap((row) => {
    const observation = row.observation_json
      ? (JSON.parse(row.observation_json) as AuditObservation)
      : null;
    const check =
      row.g_status === "done" && row.g_result_json
        ? (JSON.parse(row.g_result_json) as GoogleCheck)
        : null;
    return [
      ...(observation?.run_status === "completed"
        ? observation.sources.map((source) => ({
            prompt_id: row.prompt_id,
            url: source.url,
          }))
        : []),
      ...(check?.outcome === "summary"
        ? check.references.map((reference) => ({
            prompt_id: row.prompt_id,
            url: reference.url,
          }))
        : []),
    ];
  });
}

/** The address the audit started from, as the owner gave it. */
export function orderOwnSite(intake: { context: unknown }): string | null {
  const context = intake.context as { identity?: { source?: string } };
  return context.identity?.source ?? null;
}

/** One live reading: two pages at a time, at most `MAX_FIRECRAWL_REQUESTS`
 * requests (429 retries included), all inside one `READ_DEADLINE_MS`
 * deadline. */
export async function readPagesLive(input: {
  apiKey: string;
  ownSite: string | null;
  sources: readonly CitedSource[];
  /** False when the own site was read at step 3. */
  readOwn?: boolean;
  fetchImpl?: typeof fetch;
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
  deadlineMs?: number;
}): Promise<PagesRead & { requests: number }> {
  const deadline = AbortSignal.timeout(input.deadlineMs ?? READ_DEADLINE_MS);
  const capped = cappedFetch(input.fetchImpl ?? fetch, MAX_FIRECRAWL_REQUESTS);
  const read = await readPagesForReport({
    ownSite: input.ownSite,
    sources: input.sources,
    readOwn: input.readOwn,
    fetcher: firecrawlFetcher(
      input.apiKey,
      patientFetch(capped, input.wait, deadline),
      deadline,
    ),
    concurrency: READ_CONCURRENCY,
  });
  return { ...read, requests: capped.sent() };
}

/** The paid website reading (step 3, founder decision 2026-10-28): the own
 * site's start page and its useful pages, read as soon as the order is
 * paid, for the reading and later for the report. Null when no Firecrawl
 * key is set, the address is not a website, or no page could be read; the
 * reading then goes on as before. */
export async function readOwnSiteLive(input: {
  apiKey: string | undefined;
  website: string;
  fetchImpl?: typeof fetch;
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
}): Promise<OwnPages | null> {
  const apiKey = input.apiKey?.trim();
  if (!apiKey) return null;
  const read = await readPagesLive({
    apiKey,
    ownSite: input.website,
    sources: [],
    fetchImpl: input.fetchImpl,
    wait: input.wait,
  }).catch(() => null);
  if (!read?.pages.length) return null;
  return {
    pages: read.pages,
    unread: read.unread,
    ...(read.stopped === undefined ? {} : { stopped: read.stopped }),
    requests: read.requests,
  };
}
