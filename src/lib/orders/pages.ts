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

/** What `orders.pages_json` holds.
 * - `reading`: a reading started (`tries` counts them); a run that died
 *   mid-read leaves it, and the next run tries again, at most twice.
 * - `read`: the reading finished (with any number of pages).
 * - `partial`: Firecrawl stopped it (401, 402, or 429 after its waits); the
 *   pages read before are kept.
 * - `gave_up`: two tries never finished; the report goes on without pages.
 * - `no_key`: no Firecrawl key is set; no reading was tried.
 * Once the report is saved, the page text is dropped and only the addresses
 * stay (`urls`). */
export type SavedPages =
  | { status: "reading"; tries: number }
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
    (saved.status === "reading" && saved.tries < MAX_READING_TRIES)
  );
}

/** The pages the writer reads: none until a reading finished. */
export function pagesForWriter(saved: SavedPages | null): ReadPage[] {
  return saved && (saved.status === "read" || saved.status === "partial")
    ? saved.pages
    : [];
}

/** What stays once the report is saved: the addresses, not the text. */
export function addressesOnly(saved: SavedPages | null): SavedPages | null {
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
  fetchImpl?: typeof fetch;
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
  deadlineMs?: number;
}): Promise<PagesRead & { requests: number }> {
  const deadline = AbortSignal.timeout(input.deadlineMs ?? READ_DEADLINE_MS);
  const capped = cappedFetch(input.fetchImpl ?? fetch, MAX_FIRECRAWL_REQUESTS);
  const read = await readPagesForReport({
    ownSite: input.ownSite,
    sources: input.sources,
    fetcher: firecrawlFetcher(
      input.apiKey,
      patientFetch(capped, input.wait, deadline),
      deadline,
    ),
    concurrency: READ_CONCURRENCY,
  });
  return { ...read, requests: capped.sent() };
}
