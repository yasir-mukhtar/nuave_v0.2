import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SpendDb } from "../spending/spend-ledger";
import { siteOrigin } from "./config";
import type { OrderEnvironment } from "./store";

/**
 * Spec 021 Part P: the server-made report PDF. Browser Run opens the report
 * page with a single-use print code (never the link secret, which would show
 * in Browser Run's list of target URLs) and prints it.
 */

/** P-02: at most this many PDFs per report per UTC day. */
export const PDF_DAILY_CAP = 20;
/** A print code works once, within this time. */
export const PRINT_TOKEN_TTL_MS = 60_000;
/** The print code: 32 random bytes, URL-safe base64, 43 characters. */
export const PRINT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
/** The element the report page shows once the report is drawn. */
export const PRINT_READY_SELECTOR = '[data-saved-report="ready"]';

const iso = (at: Date) => at.toISOString();

export function newPrintToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/** Counts one PDF for the report today. False when today's cap is reached
 * (the count then stays at the cap). Older days are cleared on the way. */
export async function countPdf(
  db: SpendDb,
  input: { orderId: string; now: Date },
): Promise<boolean> {
  const day = iso(input.now).slice(0, 10);
  await db
    .prepare("DELETE FROM report_pdf_days WHERE day < ?1")
    .bind(day)
    .run();
  const row = await db
    .prepare(
      `INSERT INTO report_pdf_days (order_id, day, count) VALUES (?1, ?2, 1)
       ON CONFLICT (order_id, day) DO UPDATE SET count = count + 1
         WHERE count < ?3
       RETURNING count`,
    )
    .bind(input.orderId, day, PDF_DAILY_CAP)
    .first<{ count: number }>();
  return row !== null;
}

/** A new print code for the report; only its hash is kept. Expired codes are
 * cleared on the way. */
export async function issuePrintToken(
  db: SpendDb,
  input: {
    orderId: string;
    now: Date;
    hash: (value: string) => Promise<string>;
  },
): Promise<string> {
  await db
    .prepare("DELETE FROM report_print_tokens WHERE expires_at <= ?1")
    .bind(iso(input.now))
    .run();
  const token = newPrintToken();
  await db
    .prepare(
      `INSERT INTO report_print_tokens (token_hash, order_id, expires_at)
       VALUES (?1, ?2, ?3)`,
    )
    .bind(
      await input.hash(token),
      input.orderId,
      iso(new Date(input.now.getTime() + PRINT_TOKEN_TTL_MS)),
    )
    .run();
  return token;
}

/** Spends a print code: the order it was made for, or null when it is
 * unknown, expired or already used. Deleted in the same write, so a code
 * read from a log afterwards opens nothing. */
export async function spendPrintToken(
  db: SpendDb,
  input: { tokenHash: string; now: Date },
): Promise<string | null> {
  const row = await db
    .prepare(
      `DELETE FROM report_print_tokens
       WHERE token_hash = ?1 AND expires_at > ?2
       RETURNING order_id`,
    )
    .bind(input.tokenHash, iso(input.now))
    .first<{ order_id: string }>();
  return row?.order_id ?? null;
}

/** The Browser Run binding's PDF Quick Action. */
export type PdfBrowser = {
  quickAction(
    action: "pdf",
    options: Record<string, unknown>,
  ): Promise<Response>;
};

/** Browser Run, when this deployment has it (production and PR previews).
 * Local development and the offline tests do not (P-05). */
export function pdfBrowser(): PdfBrowser | null {
  try {
    const value = (
      getCloudflareContext().env as unknown as Record<string, unknown>
    ).BROWSER;
    return typeof value === "object" &&
      value !== null &&
      "quickAction" in value &&
      typeof value.quickAction === "function"
      ? (value as PdfBrowser)
      : null;
  } catch {
    return null;
  }
}

/** The address Browser Run opens: the fixed site address in production; a
 * PR preview has none, so its own address (requests reach this Worker only
 * on its own hostnames). */
export function printOrigin(
  request: Request,
  environment: OrderEnvironment,
): string | null {
  const fixed = siteOrigin();
  if (fixed || environment === "production") return fixed;
  const url = new URL(request.url);
  return url.protocol === "https:" ? url.origin : null;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}

/** The footer on every page (Spec 021 "PDF"): brand, report and business on
 * the left, "n / total" on the right. Chrome draws it outside the page, with
 * no web fonts, so it is styled inline. */
export function pdfFooterTemplate(name: string): string {
  return (
    '<div style="width:100%;box-sizing:border-box;padding:0 14mm;display:flex;justify-content:space-between;gap:8mm;' +
    'font-family:Helvetica,Arial,sans-serif;font-size:8px;line-height:1.4;color:#6b6b6b">' +
    `<span>Nuave · Laporan Visibilitas AI · ${escapeHtml(name)}</span>` +
    '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span>' +
    "</div>"
  );
}

/** The business name as part of a file name: no path, quote or control
 * characters, spaces as dashes, at most 80 characters (whole characters, so
 * an emoji is never cut in half). */
export function fileNamePart(name: string): string {
  const cleaned = name
    .normalize("NFC")
    // A lone surrogate cannot be percent-encoded.
    .replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      "",
    )
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, "")
    .trim()
    .replace(/ /g, "-")
    .replace(/-+/g, "-");
  return Array.from(cleaned)
    .slice(0, 80)
    .join("")
    .replace(/^[-.]+|[-.]+$/g, "");
}

/** `Laporan-Nuave-<business>.pdf`, with a plain ASCII fallback for browsers
 * that skip `filename*` (RFC 6266). */
export function pdfContentDisposition(name: string): string {
  const part = fileNamePart(name);
  const full = part ? `Laporan-Nuave-${part}.pdf` : "Laporan-Nuave.pdf";
  const encoded = encodeURIComponent(full).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="Laporan-Nuave.pdf"; filename*=UTF-8''${encoded}`;
}

/** What Browser Run is asked for: the print page, A4, the print layout with
 * its backgrounds, the footer, and the wait for the report to be drawn. */
export function pdfRequest(input: { url: string; name: string }) {
  return {
    url: input.url,
    gotoOptions: { waitUntil: "networkidle0", timeout: 30_000 },
    waitForSelector: { selector: PRINT_READY_SELECTOR, timeout: 20_000 },
    pdfOptions: {
      format: "a4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: pdfFooterTemplate(input.name),
      margin: { top: "14mm", right: "14mm", bottom: "16mm", left: "14mm" },
    },
  };
}
