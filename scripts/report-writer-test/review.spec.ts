/**
 * Shows each report of the test B review pack (run.spec.ts) on the real
 * report page, /r, and saves what the browser prints as a PDF:
 * .local-evidence/report-writer-test/review/<order>/Laporan <letter>.pdf, and
 * preview/<order>.pdf for the delivered report before the pack exists.
 *
 *   npx vitest run --config vitest.live-provider.config.ts scripts/report-writer-test/review.spec.ts
 *
 * It starts the app locally (next dev) and answers the page's report request
 * with the saved file, so no link, database or provider is used. Every page is
 * also checked for writer names. CHROMIUM_PATH points at a browser when
 * Playwright's own is not installed.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, it } from "vitest";
import { EVIDENCE_DIR } from "./harness";

const PORT = 3417;
const ORIGIN = `http://localhost:${PORT}`;

function pages(): { file: string; pdf: string }[] {
  const out: { file: string; pdf: string }[] = [];
  const preview = join(EVIDENCE_DIR, "preview");
  if (existsSync(preview))
    for (const name of readdirSync(preview).filter((n) => n.endsWith(".json")))
      out.push({
        file: join(preview, name),
        pdf: join(preview, name.replace(/\.json$/, ".pdf")),
      });
  const review = join(EVIDENCE_DIR, "review");
  if (existsSync(review))
    for (const order of readdirSync(review))
      for (const name of readdirSync(join(review, order)).filter((n) =>
        n.endsWith(".json"),
      ))
        out.push({
          file: join(review, order, name),
          pdf: join(
            review,
            order,
            `Laporan ${name.replace(/\.json$/, "")}.pdf`,
          ),
        });
  return out;
}

let server: ChildProcess;
let browser: Browser;
// next dev rewrites tsconfig.json; it is put back as it was afterwards.
const tsconfig = readFileSync("tsconfig.json", "utf8");

beforeAll(async () => {
  // Its own process group, so stopping it also stops the next server npx
  // starts under it.
  server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    stdio: "ignore",
    detached: true,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  for (let i = 0; i < 120; i += 1) {
    try {
      if ((await fetch(`${ORIGIN}/r`)).ok) break;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
}, 180_000);

afterAll(async () => {
  await browser?.close();
  if (server?.pid) process.kill(-server.pid, "SIGTERM");
  writeFileSync("tsconfig.json", tsconfig);
});

it.skipIf(pages().length === 0)(
  "every review report renders on the report page, names no writer, and prints",
  { timeout: 30 * 60 * 1000 },
  async () => {
    for (const { file, pdf } of pages()) {
      const body = readFileSync(file, "utf8");
      const page = await browser.newPage({
        viewport: { width: 420, height: 900 },
      });
      await page.route("**/api/report", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body }),
      );
      await page.goto(`${ORIGIN}/r#${"x".repeat(43)}`);
      await page.waitForLoadState("networkidle");
      await expect
        .poll(() => page.locator("main").innerText(), { timeout: 60_000 })
        .toMatch(/ChatGPT/);
      const text = await page.locator("body").innerText();
      expect(text, file).not.toMatch(
        /gpt-5\.6|\bluna\b|claude|sonnet|haiku|anthropic/i,
      );
      await page.emulateMedia({ media: "print" });
      await page.pdf({ path: pdf, format: "A4", printBackground: true });
      await page.close();
      console.log(`printed ${pdf}`);
    }
  },
);
