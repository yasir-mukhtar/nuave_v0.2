import { expect, test, type Page } from "@playwright/test";
import {
  FICTIONAL_BUSINESS,
  LANDING_CHECK,
  LANDING_FIELD,
  LANDING_HEADING,
  landingHero,
  landingInput,
} from "./journey";

/**
 * Spec 019: the clinic landing page at `/`. Section order, no sideways
 * scrolling, the menu, the clinic-type and report tabs, the FAQ, the sticky
 * bar, the resume banner and the website forms. The hero form's handoff to
 * `/audit` is covered in depth by audit-entry.spec.ts.
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
    // AC-10: nothing links to the founder's test pass.
    await expect(page.locator('a[href*="/uji"]')).toHaveCount(0);
  });

  test("a saved audit is offered above the headline (AC-09)", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "nuave.activeOrder.v1",
        JSON.stringify({ orderId: "0".repeat(32) }),
      ),
    );
    await page.goto("/");
    const banner = page.getByRole("link", {
      name: "Audit Anda sedang berjalan",
    });
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("href", "/audit");
    const bannerBox = await banner.boundingBox();
    const titleBox = await page
      .getByRole("heading", { level: 1, name: LANDING_HEADING })
      .boundingBox();
    expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(titleBox!.y);
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
    // Keyboard focus leaves the plus/minus mark at the row's end.
    const mark = second.locator('[aria-hidden="true"]').first();
    const markX = (await mark.boundingBox())?.x;
    await first.focus();
    await page.keyboard.press("Tab");
    await expect(second).toBeFocused();
    expect((await mark.boundingBox())?.x).toBe(markX);
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

  test("keyboard focus stays clear of the top sticky bar (R-05)", async ({
    page,
  }) => {
    const previous = page.getByRole("button", { name: "Bedanya dengan SEO?" });
    const next = page.getByRole("button", {
      name: "Bisa cek sendiri di ChatGPT?",
    });
    // Leave the previous question just above the screen's top edge.
    await next.evaluate((question) =>
      window.scrollBy(0, question.getBoundingClientRect().top - 4),
    );
    await next.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(previous).toBeFocused();
    // From 768px the bar is 65px tall at the top.
    expect((await previous.boundingBox())?.y).toBeGreaterThanOrEqual(65);
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

  for (const [index, form] of [
    [1, "price receipt"],
    [2, "closing"],
  ] as const) {
    test(`the ${form} form refuses an invalid entry and hands a valid one to /audit (AC-02, AC-03)`, async ({
      page,
    }) => {
      const scope = page.locator("[data-source-form]").nth(index);
      const field = scope.getByRole("textbox", {
        name: LANDING_FIELD,
        exact: true,
      });
      const check = scope.getByRole("button", {
        name: LANDING_CHECK,
        exact: true,
      });
      await field.fill("bukan alamat");
      await check.click();
      await expect(
        scope.getByText(
          "Masukkan satu website atau akun Instagram yang valid.",
        ),
      ).toBeVisible();
      await expect(field).toBeFocused();
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(page).toHaveURL(/\/$/);
      await field.fill(FICTIONAL_BUSINESS.url);
      await check.click();
      await expect(page).toHaveURL(/\/audit$/);
    });
  }
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

  test("widening past 1024px closes the sheet and focuses the laptop menu (AC-04)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.getByRole("button", { name: "Buka menu", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await expect(sheet).toBeVisible();
    // A tablet turned sideways: the menu button hides from 1024px.
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(sheet).toHaveCount(0);
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: "Cara kerja", exact: true }),
    ).toBeFocused();
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

  test("keyboard focus stays clear of the bottom sticky bar (R-05)", async ({
    page,
  }) => {
    const previous = page.getByRole("button", { name: "Bedanya dengan SEO?" });
    const next = page.getByRole("button", {
      name: "Bisa cek sendiri di ChatGPT?",
    });
    // Leave the next question just below the screen's bottom edge.
    await previous.evaluate((question) =>
      window.scrollBy(
        0,
        question.getBoundingClientRect().bottom - window.innerHeight + 4,
      ),
    );
    await previous.focus();
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
    // On a phone the bar is 69px tall at the bottom.
    const box = await next.boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(844 - 69);
  });
});

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("every FAQ answer and every view of the example report shows", async ({
    page,
  }) => {
    await page.goto("/");
    const questions = page.locator("[data-landing-faq] h3");
    const answers = page.locator("[data-landing-faq] [role='region']");
    await expect(questions).not.toHaveCount(0);
    await expect(answers).toHaveCount(await questions.count());
    for (const answer of await answers.all()) {
      await expect(answer).toBeVisible();
    }
    const views = page.locator("[data-report-views] [role='tabpanel']");
    await expect(views).toHaveCount(4);
    for (const view of await views.all()) {
      await expect(view).toBeVisible();
    }
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
