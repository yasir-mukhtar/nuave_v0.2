import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  FIXTURES,
  beforeSpec018Fixture,
  type FixtureName,
} from "../../src/lib/report-pdf/fixtures.test-helper";
import {
  DARK_KINDS,
  reportPdfPages,
  type PageListInput,
} from "../../src/lib/report-pdf/page-list";
import { REPORT_TYPE_MIN } from "../../src/lib/report-pdf/type-roles";
import type { SavedReportData } from "../../src/lib/audit/customer-evidence-export";
import { grantAccess } from "./helpers";

/**
 * Spec 024 Part 1 (PR 1): the designed print page on each fixture, in the
 * local dev server, whose `dev` environment has the designed print on
 * (wrangler.jsonc, F-10). `/api/report` is answered with the fixture, as
 * the print code would open it; nothing is stored or sent anywhere.
 *
 * Checks AC-G1 (page size, count, labels), AC-G2 (boxes, empty pages, type
 * sizes), AC-F3 (Daftar isi targets, dark pages, back cover last), AC-F4
 * (ready waits for the fonts and stays unset when one fails), AC-F5 (fonts
 * embedded, none Type 3, no fallback), AC-F9 (a report saved before Spec
 * 018 keeps today's print), AC-F11 and the fixture thresholds (Limits).
 * `NUAVE_PDF_OUT=<dir>` also writes each fixture's PDF there.
 */

const CODE = "P".repeat(43);
const OUT = process.env.NUAVE_PDF_OUT;

async function openPrint(page: Page, data: SavedReportData) {
  await grantAccess(page);
  await page.route("**/api/report", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    }),
  );
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto(`/r/print#${CODE}`, { waitUntil: "networkidle" });
}

/** The fonts embedded in a PDF, read from its font dictionaries. */
function pdfFonts(pdf: Buffer) {
  const text = pdf.toString("latin1");
  return {
    type3: (text.match(/\/Subtype\s*\/Type3/g) ?? []).length,
    names: [
      ...new Set(
        [
          ...text.matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([A-Za-z0-9-]+)/g),
        ].map((m) => m[1]!),
      ),
    ],
    pages: (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length,
    boxes: [
      ...new Set(
        [...text.matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].map((m) =>
          m[1]!.trim(),
        ),
      ),
    ],
  };
}

const FONT_NAMES =
  /^(Newsreader16pt16pt-(Light|Regular)|Geist-(Regular|Medium|SemiBold)|GeistMono-Regular|RobotoCondensed-(Regular|Medium))$/;

const NAMES = Object.keys(FIXTURES) as FixtureName[];

for (const name of NAMES) {
  test(`designed print: ${name}`, async ({ page }) => {
    const data = FIXTURES[name]();
    const expected = reportPdfPages(data.report as PageListInput).pages;
    const started = Date.now();
    await openPrint(page, data);
    await page.waitForSelector('[data-saved-report="ready"]', {
      timeout: 20_000,
    });
    const readyMs = Date.now() - started;

    const seen = await page.evaluate((minimums) => {
      const pages = [
        ...document.querySelectorAll<HTMLElement>("[data-pdf-page]"),
      ];
      const problems: string[] = [];
      for (const pageEl of pages) {
        const box = pageEl.getBoundingClientRect();
        if (Math.round(box.width) !== 1440 || Math.round(box.height) !== 810)
          problems.push(
            `page ${pageEl.dataset.pdfPage} is ${box.width}x${box.height}`,
          );
        if (!pageEl.innerText.trim())
          problems.push(`page ${pageEl.dataset.pdfPage} is empty`);
        for (const el of pageEl.querySelectorAll<HTMLElement | SVGElement>(
          "*",
        )) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (
            r.left < box.left - 0.5 ||
            r.top < box.top - 0.5 ||
            r.right > box.right + 0.5 ||
            r.bottom > box.bottom + 0.5
          )
            problems.push(
              `page ${pageEl.dataset.pdfPage}: <${el.tagName.toLowerCase()} class="${el.getAttribute("class")}"> outside its page`,
            );
          if (
            el instanceof HTMLElement &&
            el.scrollHeight > el.clientHeight + 1 &&
            getComputedStyle(el).overflow !== "visible"
          )
            problems.push(
              `page ${pageEl.dataset.pdfPage}: <${el.tagName.toLowerCase()}> overflows`,
            );
          const role = el.getAttribute("data-type");
          if (role) {
            const size = parseFloat(getComputedStyle(el).fontSize);
            const min = (minimums as Record<string, number>)[role];
            if (min === undefined) problems.push(`unknown type role ${role}`);
            else if (size < min)
              problems.push(
                `page ${pageEl.dataset.pdfPage}: ${role} at ${size}px < ${min}px`,
              );
          }
          // Every visible text sits inside an element with a type role.
          for (const node of el.childNodes)
            if (
              node.nodeType === 3 &&
              node.textContent!.trim() &&
              !el.closest("[data-type]")
            )
              problems.push(
                `page ${pageEl.dataset.pdfPage}: text "${node.textContent!.trim().slice(0, 30)}" has no type role`,
              );
        }
      }
      return {
        problems,
        pages: pages.map((p) => ({
          number: Number(p.dataset.pdfPage),
          kind: p.dataset.kind!,
          section: p.dataset.section!,
          label: p.dataset.label!,
          dark: p.dataset.dark === "true",
        })),
        rows: [
          ...document.querySelectorAll<HTMLElement>("[data-contents-row]"),
        ].map((r) => ({
          row: r.dataset.contentsRow!,
          target: Number(r.dataset.target),
        })),
        buttons: document.querySelectorAll("button, [role=button]").length,
      };
    }, REPORT_TYPE_MIN);

    expect(seen.problems).toEqual([]);
    // AC-G1: the page count and labels equal the page list.
    expect(seen.pages.map((p) => [p.kind, p.section, p.label])).toEqual(
      expected.map((p) => [p.kind, p.section, p.label]),
    );
    // AC-F3: dark pages, back cover last, Daftar isi targets.
    for (const p of seen.pages)
      expect(p.dark).toBe(DARK_KINDS.has(p.kind as never));
    expect(seen.pages.at(-1)!.kind).toBe("sampul_belakang");
    for (const row of seen.rows) {
      const target = seen.pages[row.target - 1]!;
      if (row.row === "cara_membaca" || row.row === "ringkasan")
        expect(target.kind).toBe(row.row);
      else expect([target.kind, target.section]).toEqual(["divider", row.row]);
    }
    // AC-F11: a divider only for a section with a page.
    for (const p of seen.pages.filter((x) => x.kind === "divider"))
      expect(seen.pages[p.number]!.section).toBe(p.section);
    // G-09: no button in the PDF.
    expect(seen.buttons).toBe(0);

    // The pdfOptions of designedPdfRequest (F-03, unit-tested in
    // report-pdf.test.ts).
    const printStarted = Date.now();
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    const printMs = Date.now() - printStarted;
    const fonts = pdfFonts(pdf);
    // AC-G1: 1440 x 810 CSS px is 1080 x 607.92 pt.
    expect(fonts.pages).toBe(expected.length);
    expect(fonts.boxes).toEqual(["0 0 1080 607.92"]);
    // AC-F5: embedded fonts, none Type 3, no fallback.
    expect(fonts.type3).toBe(0);
    expect(fonts.names.length).toBeGreaterThan(0);
    for (const font of fonts.names) expect(font).toMatch(FONT_NAMES);
    // Limits: at most 10 s and 3 MB on every fixture.
    expect(readyMs + printMs).toBeLessThan(10_000);
    expect(pdf.length).toBeLessThan(3 * 1024 * 1024);
    if (OUT) {
      mkdirSync(OUT, { recursive: true });
      writeFileSync(join(OUT, `${name}.pdf`), pdf);
      writeFileSync(
        join(OUT, `${name}.json`),
        JSON.stringify(
          {
            pages: fonts.pages,
            ready_ms: readyMs,
            print_ms: printMs,
            bytes: pdf.length,
            fonts: fonts.names,
          },
          null,
          1,
        ),
      );
    }
  });
}

test("the ready marker stays unset while a PDF font fails to load (F-08, AC-F4)", async ({
  page,
}) => {
  // The font files fail, as if they could not be fetched (next/font serves
  // them from /_next/static/media/).
  await page.route(/\/_next\/static\/media\/.*\.woff2/, (route) =>
    route.abort(),
  );
  await openPrint(page, FIXTURES.typical());
  await expect(page.locator("[data-pdf-fonts]")).toHaveAttribute(
    "data-pdf-fonts",
    "failed",
    {
      timeout: 15_000,
    },
  );
  await expect(page.locator('[data-saved-report="ready"]')).toHaveCount(0);
});

test("a report saved before Spec 018 keeps today's print (AC-F9)", async ({
  page,
}) => {
  await openPrint(page, beforeSpec018Fixture());
  await page.waitForSelector('[data-saved-report="ready"]');
  await expect(page.locator("[data-pdf-page]")).toHaveCount(0);
  await expect(
    page.locator("main[data-saved-report=ready] .report-pdf"),
  ).toHaveCount(0);
});
