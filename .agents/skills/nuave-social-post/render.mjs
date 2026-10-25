// Render every <section class="slide" id="s1..sN"> in <post-folder>/carousel.html
// to <post-folder>/slide-N.png at 1080x1350, plus overview.png (all slides at
// half size) for review. Run: node render.mjs <post-folder>
import path from "node:path";

async function loadChromium() {
  for (const name of ["playwright", "@playwright/test"]) {
    try {
      return (await import(name)).chromium;
    } catch {}
  }
  throw new Error("Playwright not found: run npm ci in the checkout first.");
}

(async () => {
  const dir = path.resolve(process.argv[2] || ".");
  // CHROMIUM_PATH: use an installed browser when Playwright's own is missing.
  const browser = await (
    await loadChromium()
  ).launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1500 },
  });
  await page.goto("file://" + path.join(dir, "carousel.html"));
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.evaluate(() => document.fonts.check("600 40px Geist")))) {
    console.warn(
      "Warning: Geist did not load (no internet?); slides use a fallback font.",
    );
  }
  const slides = await page.locator("section.slide").count();
  for (let i = 1; i <= slides; i++) {
    const file = path.join(dir, `slide-${i}.png`);
    await page.locator(`#s${i}`).screenshot({ path: file });
    console.log(file);
  }
  // Overview: the finished PNGs at half size, three per row.
  const imgs = Array.from(
    { length: slides },
    (_, i) => `<img src="slide-${i + 1}.png">`,
  ).join("");
  const style =
    "body{margin:0;padding:20px;background:#ccc;display:grid;grid-template-columns:repeat(3,540px);gap:20px;width:max-content;height:max-content}" +
    "img{width:540px;display:block}";
  await page.setContent(
    `<!doctype html><base href="file://${dir}/"><style>${style}</style>${imgs}`,
    { waitUntil: "load" },
  );
  await page
    .locator("body")
    .screenshot({ path: path.join(dir, "overview.png") });
  console.log(path.join(dir, "overview.png"));
  await browser.close();
})();
