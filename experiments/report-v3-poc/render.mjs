// Prints the Report v3 proofs of concept to PDF and takes layout screenshots.
//
// Run from the repository root, after build.py:
//     node experiments/report-v3-poc/render.mjs
//
// For each dist/ultima-<x>.local.html it writes:
//     dist/Laporan-Ultima-<X>.pdf     A4, every fold opened, page numbers
//     dist/shots/<x>-phone.png        390 px wide, first screen
//     dist/shots/<x>-desktop.png      1280 px wide, first screen
//     dist/shots/<x>-full-*.png       full-page captures for review
// It fails if the page logs an error. The page loads Geist from Google Fonts;
// without network it falls back to the system font.

import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, "dist");
const SHOTS = join(DIST, "shots");
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
let failed = false;

for (const key of ["a", "b"]) {
  const file = join(DIST, `ultima-${key}.local.html`);
  if (!existsSync(file)) {
    console.log(`[${key}] not built, skipped`);
    continue;
  }
  const url = pathToFileURL(file).href;
  const errors = [];

  for (const [name, viewport, full] of [
    ["phone", { width: 390, height: 844 }, false],
    ["desktop", { width: 1280, height: 900 }, false],
    ["full-phone", { width: 390, height: 844 }, true],
    ["full-desktop", { width: 1280, height: 900 }, true],
  ]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) errors.push(`${name}: page is ${overflow}px wider than the screen`);
    await page.screenshot({ path: join(SHOTS, `${key}-${name}.png`), fullPage: full });
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  page.on("pageerror", (e) => errors.push(`print: ${e.message}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__expandForPrint && window.__expandForPrint());
  await page.emulateMedia({ media: "print" });
  const pdf = join(DIST, `Laporan-Ultima-${key.toUpperCase()}.pdf`);
  const footer = await page.evaluate(() =>
    `Nuave · Laporan Visibilitas AI · ${DATA.meta.clinic} · ${DATA.meta.poc_label}`.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]),
  );
  await page.pdf({
    path: pdf,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font:8px Helvetica,Arial,sans-serif;color:#6b6a85;padding:0 14mm;display:flex;justify-content:space-between"><span>${footer}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" }, // same as the page's @page rule
  });
  await page.close();

  if (errors.length) {
    failed = true;
    console.log(`[${key}] ${errors.length} problem(s):`);
    for (const e of errors) console.log("  -", e);
  } else {
    console.log(`[${key}] PDF and screenshots written, no page errors`);
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
