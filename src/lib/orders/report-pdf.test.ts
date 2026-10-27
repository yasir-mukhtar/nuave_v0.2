import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { POST as pdfPOST } from "../../app/api/report/pdf/route";
import { POST as reportPOST } from "../../app/api/report/route";
import { pdfFileName } from "../../app/audit/report/report-pdf";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { newLinkSecret, sha256Hex } from "./config";
import { makeOrder, T0 } from "./orders.test-helper";
import {
  PDF_DAILY_CAP,
  escapeHtml,
  fileNamePart,
  pdfContentDisposition,
  pdfFooterTemplate,
} from "./report-pdf";

// Spec 021 Part P (P-01..P-05, AC-P1 offline part, AC-P2): the real PDF and
// report-data routes on the sqlite D1 helper, with a fake Browser Run binding.
// The real Browser Run is checked on the PR preview.

const NAME = `Klinik "Ayu" & <Co> / Bandung`;
const PDF_BYTES = "%PDF-1.7 fake";

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let logs: string[];
let browserCalls: Array<{ action: string; options: Record<string, unknown> }>;
let browserAnswer: () => Promise<Response>;
let pdfLimiterAllows: () => boolean;
let withBrowser: boolean;

function bind() {
  mocks.getCloudflareContext.mockReturnValue({
    env: {
      SPEND_DB: d1.db,
      REPORT_DATA_CALLER_RATE_LIMITER: {
        limit: async () => ({ success: true }),
      },
      REPORT_PDF_CALLER_RATE_LIMITER: {
        limit: async () => ({ success: pdfLimiterAllows() }),
      },
      ...(withBrowser
        ? {
            BROWSER: {
              quickAction: async (
                action: string,
                options: Record<string, unknown>,
              ) => {
                browserCalls.push({ action, options });
                return browserAnswer();
              },
            },
          }
        : {}),
    },
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-pdf-"));
  d1 = openFileD1(join(dir, "pdf.sqlite"));
  logs = [];
  browserCalls = [];
  browserAnswer = async () =>
    new Response(PDF_BYTES, {
      headers: {
        "Content-Type": "application/pdf",
        "X-Browser-Ms-Used": "4321",
      },
    });
  pdfLimiterAllows = () => true;
  withBrowser = true;
  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, method).mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
  }
  vi.useFakeTimers({ now: T0, toFake: ["Date"] });
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  vi.stubEnv("NUAVE_SITE_URL", "https://v2.nuave.test");
  bind();
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  mocks.getCloudflareContext.mockReset();
});

/** A delivered order with a saved report and a working link. */
async function reportOrder(report: object = { two_source: { questions: [] } }) {
  const id = await makeOrder(d1.db, { now: T0 });
  const secret = newLinkSecret();
  await d1.db
    .prepare(
      `UPDATE orders SET report_json = ?2, intake_json = ?3, link_hash = ?4,
         link_off = 0, link_expires_at = '2099-01-01T00:00:00.000Z',
         state = 'delivered'
       WHERE id = ?1`,
    )
    .bind(
      id,
      JSON.stringify(report),
      JSON.stringify({ context: { identity: { name: NAME } }, prompts: [] }),
      await sha256Hex(secret),
    )
    .run();
  return { id, secret };
}

const askPdf = (body: unknown, url = "https://v2.nuave.test/api/report/pdf") =>
  pdfPOST(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const readReport = (body: unknown) =>
  reportPOST(
    new Request("https://v2.nuave.test/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

async function seen(response: Response) {
  return {
    status: response.status,
    headers: [...response.headers.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    body: await response.text(),
  };
}

/** The print code inside the address Browser Run was given. */
function printCode(call = browserCalls.at(-1)!) {
  const url = new URL(String(call.options.url));
  return { url, code: url.hash.slice(1) };
}

describe("Unduh PDF makes the PDF with Browser Run (P-01, AC-P1)", () => {
  it("asks Browser Run for an A4 print of /r/print with the footer, and returns a private download", async () => {
    const { secret } = await reportOrder();
    const response = await askPdf({ secret });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(PDF_BYTES);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("content-disposition")).toBe(
      pdfContentDisposition(NAME),
    );

    expect(browserCalls).toHaveLength(1);
    const { action, options } = browserCalls[0]!;
    expect(action).toBe("pdf");
    const { url, code } = printCode();
    expect(url.origin).toBe("https://v2.nuave.test");
    expect(url.pathname).toBe("/r/print");
    expect(url.search).toBe("");
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(options).toMatchObject({
      gotoOptions: { waitUntil: "networkidle0" },
      waitForSelector: { selector: '[data-saved-report="ready"]' },
      pdfOptions: {
        format: "a4",
        printBackground: true,
        displayHeaderFooter: true,
        footerTemplate: pdfFooterTemplate(NAME),
      },
    });
  });

  it("logs the browser time as a number, and nothing about the report or its link", async () => {
    const { secret } = await reportOrder();
    await askPdf({ secret });
    const { code } = printCode();
    expect(logs).toEqual([
      JSON.stringify({ event: "report_pdf", status: "ok", browser_ms: 4321 }),
    ]);
    const all = logs.join("\n");
    for (const text of [secret, code, "Ayu", "/r/print", "nuave.test"])
      expect(all).not.toContain(text);
  });
});

describe("the link secret never goes into a URL (P-02, AC-P2)", () => {
  it("Browser Run gets a single-use print code, not the secret", async () => {
    const { secret } = await reportOrder();
    await askPdf({ secret });
    const { url, code } = printCode();
    expect(JSON.stringify(browserCalls)).not.toContain(secret);
    expect(code).not.toBe(secret);
    // Only the code's hash is stored, and never the secret.
    const rows = d1.query<{ token_hash: string }>(
      "SELECT token_hash FROM report_print_tokens",
    );
    expect(rows).toEqual([{ token_hash: await sha256Hex(code) }]);
    expect(JSON.stringify(rows)).not.toContain(code);
    expect(url.href).not.toContain(secret);
  });

  it("the print code opens the saved report once; a second read, or one after 60 seconds, gets the standard answer", async () => {
    const { secret } = await reportOrder();
    await askPdf({ secret });
    const first = printCode().code;
    const opened = await readReport({ print_token: first });
    expect(opened.status).toBe(200);
    expect(((await opened.json()) as { report: object }).report).toEqual({
      two_source: { questions: [] },
    });
    const neutral = await seen(await readReport({ secret: newLinkSecret() }));
    expect(await seen(await readReport({ print_token: first }))).toEqual(
      neutral,
    );

    await askPdf({ secret });
    const late = printCode().code;
    vi.setSystemTime(new Date(T0.getTime() + 60_000));
    expect(await seen(await readReport({ print_token: late }))).toEqual(
      neutral,
    );
  });

  it("a print code stops working when the link is switched off", async () => {
    const { id, secret } = await reportOrder();
    await askPdf({ secret });
    await d1.db
      .prepare("UPDATE orders SET link_off = 1 WHERE id = ?1")
      .bind(id)
      .run();
    expect((await readReport({ print_token: printCode().code })).status).toBe(
      404,
    );
  });

  it("a wrong, malformed or switched-off secret gets the report route's standard answer, and Browser Run is not called", async () => {
    const { id, secret } = await reportOrder();
    const neutral = await seen(await readReport({ secret: newLinkSecret() }));
    for (const body of [
      { secret: newLinkSecret() },
      { secret: "short" },
      { secret: 12345 },
      {},
      "not json",
      // A print code is not accepted here.
      { print_token: "x".repeat(43) },
    ])
      expect(await seen(await askPdf(body))).toEqual(neutral);
    await d1.db
      .prepare("UPDATE orders SET link_off = 1 WHERE id = ?1")
      .bind(id)
      .run();
    expect(await seen(await askPdf({ secret }))).toEqual(neutral);
    expect(browserCalls).toHaveLength(0);
    expect(d1.query("SELECT * FROM report_print_tokens")).toEqual([]);
  });
});

describe("limits (P-02)", () => {
  it("its own per-caller limit answers 429 with the private headers", async () => {
    const { secret } = await reportOrder();
    pdfLimiterAllows = () => false;
    const response = await askPdf({ secret });
    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(browserCalls).toHaveLength(0);
  });

  it(`at most ${PDF_DAILY_CAP} PDFs per report per UTC day; the next day starts again`, async () => {
    const { secret } = await reportOrder();
    const other = await reportOrder();
    for (let i = 0; i < PDF_DAILY_CAP; i += 1)
      expect((await askPdf({ secret })).status).toBe(200);
    const capped = await askPdf({ secret });
    expect(capped.status).toBe(429);
    expect(((await capped.json()) as { code: string }).code).toBe(
      "pdf_daily_limit",
    );
    expect(browserCalls).toHaveLength(PDF_DAILY_CAP);
    // Another report is not affected.
    expect((await askPdf({ secret: other.secret })).status).toBe(200);
    vi.setSystemTime(new Date("2026-10-13T00:00:01.000Z"));
    expect((await askPdf({ secret })).status).toBe(200);
    // Yesterday's counts are cleared.
    expect(
      d1.query<{ day: string }>("SELECT DISTINCT day FROM report_pdf_days"),
    ).toEqual([{ day: "2026-10-13" }]);
  });
});

describe("when there is no server PDF (P-05)", () => {
  it("without Browser Run the answer is pdf_unavailable (the page prints)", async () => {
    const { secret } = await reportOrder();
    withBrowser = false;
    bind();
    const response = await askPdf({ secret });
    expect(response.status).toBe(501);
    expect(((await response.json()) as { code: string }).code).toBe(
      "pdf_unavailable",
    );
    expect(d1.query("SELECT * FROM report_pdf_days")).toEqual([]);
  });

  it("without Browser Run a wrong secret still gets the standard answer", async () => {
    await reportOrder();
    const neutral = await seen(await readReport({ secret: newLinkSecret() }));
    withBrowser = false;
    bind();
    expect(await seen(await askPdf({ secret: newLinkSecret() }))).toEqual(
      neutral,
    );
  });

  it("a long name with an emoji at the cut still downloads (the header is made before Browser Run)", async () => {
    const id = await makeOrder(d1.db, { now: T0 });
    const secret = newLinkSecret();
    const name = `${"K".repeat(79)}😀 Klinik`;
    await d1.db
      .prepare(
        `UPDATE orders SET report_json = '{"two_source":{}}', intake_json = ?2,
           link_hash = ?3, link_off = 0,
           link_expires_at = '2099-01-01T00:00:00.000Z'
         WHERE id = ?1`,
      )
      .bind(
        id,
        JSON.stringify({ context: { identity: { name } }, prompts: [] }),
        await sha256Hex(secret),
      )
      .run();
    const response = await askPdf({ secret });
    expect(response.status).toBe(200);
    expect(pdfFileName(response.headers.get("content-disposition"))).toBe(
      `Laporan-Nuave-${"K".repeat(79)}😀.pdf`,
    );
  });

  it("a report saved before Spec 018 keeps the browser's print", async () => {
    const { secret } = await reportOrder({ report_version: "nuave-report-v3" });
    const response = await askPdf({ secret });
    expect(response.status).toBe(501);
    expect(browserCalls).toHaveLength(0);
  });

  it("a Browser Run failure answers pdf_failed and logs only its status", async () => {
    const { secret } = await reportOrder();
    browserAnswer = async () =>
      new Response("timeout waiting for selector", {
        status: 422,
        headers: { "X-Browser-Ms-Used": "20500" },
      });
    const failed = await askPdf({ secret });
    expect(failed.status).toBe(502);
    expect(((await failed.json()) as { code: string }).code).toBe("pdf_failed");
    expect(logs).toEqual([
      JSON.stringify({
        event: "report_pdf",
        status: "browser_failed",
        http: 422,
        browser_ms: 20500,
      }),
    ]);
    browserAnswer = async () => {
      throw new Error(`boom ${secret}`);
    };
    expect((await askPdf({ secret })).status).toBe(502);
    expect(logs.join("\n")).not.toContain(secret);
  });

  it("a PR preview, which has no fixed site address, prints its own address", async () => {
    vi.stubEnv("NUAVE_ENVIRONMENT", "preview");
    vi.stubEnv("NUAVE_SITE_URL", "");
    const id = await makeOrder(d1.db, { now: T0, environment: "preview" });
    const secret = newLinkSecret();
    await d1.db
      .prepare(
        `UPDATE orders SET report_json = '{"two_source":{}}', intake_json = '{}',
           link_hash = ?2, link_off = 0,
           link_expires_at = '2099-01-01T00:00:00.000Z'
         WHERE id = ?1`,
      )
      .bind(id, await sha256Hex(secret))
      .run();
    const response = await askPdf(
      { secret },
      "https://nuave-pr-9.example.workers.dev/api/report/pdf",
    );
    expect(response.status).toBe(200);
    expect(printCode().url.origin).toBe(
      "https://nuave-pr-9.example.workers.dev",
    );
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="Laporan-Nuave.pdf"; filename*=UTF-8''Laporan-Nuave.pdf`,
    );
  });
});

describe("footer and file name", () => {
  it("escapes the business name in the footer and keeps the page numbers", () => {
    const footer = pdfFooterTemplate(`<img src=x onerror=alert(1)> & "Ayu"`);
    expect(footer).not.toContain("<img");
    expect(footer).toContain(
      "Nuave · Laporan Visibilitas AI · &lt;img src=x onerror=alert(1)&gt; &amp; &quot;Ayu&quot;",
    );
    expect(footer).toContain('<span class="pageNumber"></span>');
    expect(footer).toContain('<span class="totalPages"></span>');
    expect(escapeHtml(`'`)).toBe("&#39;");
  });

  it("names the file Laporan-Nuave-<business>.pdf, encoded, with a plain fallback", () => {
    expect(fileNamePart(NAME)).toBe("Klinik-Ayu-&-Co-Bandung");
    expect(fileNamePart("  Klinik\u0000 Gigi\n\tSehat  ")).toBe(
      "Klinik-Gigi-Sehat",
    );
    expect(fileNamePart("../..")).toBe("");
    // Whole characters only: no half emoji, no lone surrogate.
    expect(fileNamePart(`${"a".repeat(79)}😀😀`)).toBe(`${"a".repeat(79)}😀`);
    expect(() =>
      pdfContentDisposition(`Klinik \uD83D Ayu ${"x".repeat(90)}`),
    ).not.toThrow();
    const header = pdfContentDisposition("Klinik Ayu (Bandung)");
    expect(header).toBe(
      `attachment; filename="Laporan-Nuave.pdf"; filename*=UTF-8''Laporan-Nuave-Klinik-Ayu-%28Bandung%29.pdf`,
    );
    // The page reads the same name back.
    expect(pdfFileName(header)).toBe("Laporan-Nuave-Klinik-Ayu-(Bandung).pdf");
    expect(pdfFileName(pdfContentDisposition("Klinik Céline"))).toBe(
      "Laporan-Nuave-Klinik-Céline.pdf",
    );
    expect(pdfFileName(null)).toBe("Laporan-Nuave.pdf");
  });
});
