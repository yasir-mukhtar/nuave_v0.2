import { expect, test, type Page } from "@playwright/test";
import {
  LANDING_CHECK,
  LANDING_FIELD,
  LANDING_HEADING,
  landingHero,
  landingInput,
} from "./journey";

/**
 * Spec 019: the clinic landing page at `/`. Section order, no sideways
 * scrolling, the menu, the clinic-type and report tabs, the FAQ, the sticky
 * bar and the website forms' error. The forms' handoff to `/audit` is
 * covered by audit-entry.spec.ts.
 */

const SECTION_HEADINGS = [
  "Makin banyak pasien pilih dokter lewat AI",
  "Di jawaban AI, tidak ada halaman dua",
  "Kami tanya AI persis seperti pasien Anda",
  "Lihat apa kata AI tentang klinik Anda",
  "Bisa dipercaya, bisa ditindaklanjuti",
  "Yang Anda dapat dari satu audit",
  "Yang sering ditanyakan",
  "Cek klinik Anda sebelum pasien berikutnya bertanya",
];

const stickyBar = (page: Page) => page.locator("[data-sticky-bar]");

async function scrollToForm(page: Page, index: number) {
  await page
    .locator("[data-source-form]")
    .nth(index)
    .evaluate((form) => form.scrollIntoView({ block: "center" }));
}

test.describe("on a laptop", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
  });

  test("shows every section in order, with three website forms (AC-01)", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: LANDING_HEADING }),
    ).toBeVisible();
    const headings = await page
      .getByRole("heading", { level: 2 })
      .allTextContents();
    expect(headings.map((text) => text.replace(/\s+/g, " ").trim())).toEqual(
      SECTION_HEADINGS,
    );
    await expect(
      page.getByRole("textbox", { name: LANDING_FIELD, exact: true }),
    ).toHaveCount(3);
  });

  test("the menu links scroll to their sections (AC-04)", async ({ page }) => {
    const menu = page
      .getByRole("banner")
      .getByRole("navigation", { name: "Bagian halaman" });
    for (const [label, id] of [
      ["Cara kerja", "cara-kerja"],
      ["Laporan", "laporan"],
      ["Harga", "harga"],
      ["FAQ", "faq"],
    ]) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await menu.getByRole("link", { name: label, exact: true }).click();
      await expect(page.locator(`#${id} h2`)).toBeInViewport();
      await expect(page.locator(`#${id} h2`)).toBeFocused();
    }
  });

  test("the clinic-type tabs change the example, by pointer and keyboard (AC-05)", async ({
    page,
  }) => {
    const tabs = page.getByRole("tablist", { name: "Jenis klinik" });
    await expect(
      page.getByText(/^Ada klinik kecantikan di Jakarta/),
    ).toBeVisible();
    await tabs.getByRole("tab", { name: "Gigi" }).click();
    await expect(tabs.getByRole("tab", { name: "Gigi" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText(/^Ada klinik gigi di Jakarta/)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Kulit" })).toBeFocused();
    await expect(page.getByText(/^Ada klinik kulit di Jakarta/)).toBeVisible();
  });

  test("the report tabs switch the example report, by pointer and arrow keys (AC-06)", async ({
    page,
  }) => {
    const tabs = page.getByRole("tablist", { name: "Isi laporan" });
    await expect(tabs).toHaveAttribute("aria-orientation", "vertical");
    await tabs.getByRole("tab", { name: /^Jawaban AI/ }).click();
    await expect(
      page.getByText("klinik kecantikan terdekat jakarta selatan"),
    ).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByText("Klinik lain yang disebut", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByText("Topik yang belum menyebut Anda", { exact: true }),
    ).toBeVisible();
  });

  test("the FAQ opens one answer at a time and keeps every answer in the HTML (AC-07)", async ({
    page,
    request,
  }) => {
    const first = page.getByRole("button", {
      name: "Bagaimana cara klinik muncul di Google AI Overview?",
    });
    const second = page.getByRole("button", { name: "Bedanya dengan SEO?" });
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await expect(second).toHaveAttribute("aria-expanded", "false");
    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(first).toHaveAttribute("aria-expanded", "false");
    // The server's HTML already holds the closed answers.
    const html = await (await request.get("/")).text();
    for (const words of [
      "Tujuannya mirip, tempatnya beda.",
      "Satu audit untuk satu kota",
      "Rp12.450 untuk setiap pemeriksaan yang gagal",
    ]) {
      expect(html).toContain(words);
    }
  });

  test("the sticky bar appears past the hero form and hides at every form (AC-08)", async ({
    page,
  }) => {
    await expect(stickyBar(page)).not.toHaveAttribute("data-shown");
    await page.locator("#laporan").scrollIntoViewIfNeeded();
    await expect(stickyBar(page)).toHaveAttribute("data-shown");
    await scrollToForm(page, 1);
    await expect(stickyBar(page)).not.toHaveAttribute("data-shown");
    await page.locator("#faq").scrollIntoViewIfNeeded();
    await expect(stickyBar(page)).toHaveAttribute("data-shown");
    await scrollToForm(page, 2);
    await expect(stickyBar(page)).not.toHaveAttribute("data-shown");
    await page.locator("#faq").scrollIntoViewIfNeeded();
    await stickyBar(page)
      .getByRole("link", { name: "Cek klinik saya", exact: true })
      .click();
    await expect(landingInput(page)).toBeFocused();
  });

  test("an invalid entry shows the error, refocuses the field and stays (AC-03)", async ({
    page,
  }) => {
    const field = landingInput(page);
    await field.fill("bukan alamat");
    await landingHero(page)
      .getByRole("button", { name: LANDING_CHECK, exact: true })
      .click();
    await expect(
      page.getByText("Masukkan satu website atau akun Instagram yang valid."),
    ).toBeVisible();
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("a menu link closes the sheet and lands on its section (AC-04)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Buka menu", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await sheet.getByRole("link", { name: "Harga", exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator("#harga h2")).toBeInViewport();
    await expect(page.locator("#harga h2")).toBeFocused();
  });

  test("the report tabs are a segmented control with arrow keys (AC-06)", async ({
    page,
  }) => {
    const tabs = page.getByRole("tablist", { name: "Isi laporan" });
    await expect(tabs).not.toHaveAttribute("aria-orientation", "vertical");
    await tabs.getByRole("tab", { name: "Skor" }).click();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Jawaban AI" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.locator("#laporan p").filter({
        hasText:
          "Jawaban utuh ChatGPT dan Google AI Overview beserta sumbernya.",
      }),
    ).toBeVisible();
  });

  test("the sticky bar sits at the bottom once the hero form is gone (AC-08)", async ({
    page,
  }) => {
    await page.locator("#cara-kerja").scrollIntoViewIfNeeded();
    await expect(stickyBar(page)).toHaveAttribute("data-shown");
    // The bar slides up into place; measure it once the slide has finished.
    await stickyBar(page).evaluate(async (bar) => {
      await Promise.all(bar.getAnimations().map((slide) => slide.finished));
    });
    const box = await stickyBar(page).boundingBox();
    expect(box && box.y + box.height).toBeCloseTo(844, -1);
  });
});

test("no width from 320 to 1920 scrolls sideways (AC-01)", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `${width}px wide`).toBeLessThanOrEqual(0);
  }
});
