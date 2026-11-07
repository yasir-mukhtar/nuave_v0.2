// Step 0 spike: print the spike HTML in local Chromium, time it, and report
// which fixed-size content boxes overflow (text over its page budget).
// Usage (from the repository root, after npm ci):
//   node experiments/report-pdf-design/spike/measure.mjs <in.html> <out.pdf>
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

(async () => {
  const [input, output] = process.argv.slice(2);
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 810 },
  });
  const t0 = Date.now();
  await page.goto("file://" + path.resolve(input), { waitUntil: "load" });
  const loaded = Date.now();
  await page.waitForSelector('[data-saved-report="ready"]', { timeout: 20000 });
  const ready = Date.now();
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll(".pg")].flatMap((pg, i) => {
      const out = [];
      for (const el of pg.querySelectorAll(".content, .fx, .answer")) {
        if (
          el.scrollHeight > el.clientHeight + 1 ||
          el.scrollWidth > el.clientWidth + 1
        )
          out.push(
            `${String(i + 1).padStart(2, "0")} ${pg.dataset.label}: ${el.className} ${el.scrollHeight}>${el.clientHeight}`,
          );
      }
      return out;
    }),
  );
  const fonts = await page.evaluate(() =>
    [...document.fonts]
      .filter((f) => f.status === "loaded")
      .map((f) => `${f.family} ${f.style}`),
  );
  await page.pdf({
    path: output,
    preferCSSPageSize: true,
    printBackground: true,
  });
  const printed = Date.now();
  await browser.close();
  console.log(
    JSON.stringify(
      {
        load_ms: loaded - t0,
        ready_ms: ready - loaded,
        print_ms: printed - ready,
        pdf_kb: Math.round(fs.statSync(output).size / 1024),
        fonts_loaded: fonts,
        overflow,
      },
      null,
      1,
    ),
  );
})();
