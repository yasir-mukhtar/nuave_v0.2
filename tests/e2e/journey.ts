import { expect as baseExpect, type Page } from "@playwright/test";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ExtractionDraft } from "../../src/lib/audit/types";

/**
 * The one shared driver for the public audit journey. The e2e specs and the
 * `verify-nuave` skill CLI (`.agents/skills/verify-nuave/`) both import it, so
 * every journey selector lives here. Add a step here before writing it inline
 * in a spec or in the CLI.
 *
 * The timeout matches `expect.timeout` in `playwright.config.ts`, so the same
 * steps wait equally long inside and outside the Playwright test runner.
 */
const expect = baseExpect.configure({ timeout: 10_000 });

/** Fictional business used by every synthetic journey. */
export const FICTIONAL_BUSINESS = {
  name: "Kedai Fiksi",
  url: "https://kedai-fiksi.example/",
} as const;

export const CONFIRM_SUMMARY = "Sudah sesuai — buat pertanyaan audit";
export const REVIEW_HEADING = "Ini yang akan Nuave audit";
export const CONFIRM_BRAND = "Lanjut";
export const BRAND_HEADING = "Ini brand yang ingin Anda audit?";
export const FOCUS_HEADING = "Apa yang ingin Anda audit?";
export const LOCATION_HEADING = "Cabang mana yang ingin diaudit?";
export const PRODUCT_HEADING = "Produk atau layanan mana?";
export const CATEGORY_HEADING =
  /^(Bisnis Anda|Lokasi ini|Produk atau layanan ini) biasanya disebut apa\?$/;
export const OFFERINGS_HEADING = /^(Apakah ini|Apa saja) yang Anda tawarkan\?$/;
export const SERVICE_HEADING =
  "Bagaimana pelanggan mendapatkan yang Anda tawarkan?";
export const MARKET_HEADING = "Di mana pelanggan Anda berada?";
export const CUSTOMER_NEEDS_HEADING =
  "Kenapa pelanggan biasanya mencari yang seperti ini?";
export const TARGET_CUSTOMER_HEADING = "Siapa pelanggan utama Anda?";
export const DECISION_CONSIDERATIONS_HEADING =
  "Apa yang dipertimbangkan pelanggan saat memilih?";
export const COMPETITORS_HEADING = "Ini yang mungkin dibandingkan dengan Anda";
export const DIFFERENTIATOR_HEADING = "Apa yang membedakan bisnis Anda?";
export const PUBLIC_FACT_HEADING =
  "Apa yang tidak boleh salah dipahami tentang brand Anda?";
export const READING_HEADING = "Sebentar, Nuave sedang membaca";
export const ORDER_HEADING = "Ringkasan pesanan";
/** The email the synthetic journeys order with (never stored in the browser). */
export const ORDER_EMAIL = "pemilik@example.com";
export const READING_INTERRUPTED_NOTICE =
  "Pembacaan sumber sebelumnya terputus. Isian Anda tetap tersimpan — tekan Periksa untuk membaca ulang.";
/** Mirrors `SMART_INTAKE_STORAGE_KEY` in `src/lib/intake/smart-intake-contract.ts`. */
export const INTAKE_SESSION_KEY = "nuave.localIntake.v9";
export const SENSITIVE_INPUT_NOTICE =
  "Persiapan audit belum dapat dilanjutkan. Ada teks yang mungkin berisi informasi sensitif. Gunakan hanya informasi publik tentang brand Anda, tanpa data pribadi atau akses akun.";

/** Counts every same-origin `/api/*` request as `"<METHOD> <path>"`. */
export function trackApiCalls(page: Page): Record<string, number> {
  const calls: Record<string, number> = {};
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/"))
      calls[`${request.method()} ${path}`] =
        (calls[`${request.method()} ${path}`] ?? 0) + 1;
  });
  return calls;
}

export const ENTRY_INVALID_NOTICE =
  "Isi nama bisnis dan satu URL website publik yang valid.";

/**
 * Spec 013 R-29: the labelled rich test preparation. Fictional business only —
 * every prepared field is filled, including the J3 additions (published
 * locations, whole-brand category suggestions, one suggestion per offering)
 * and the J6 customer-needs and competitor suggestions.
 * It is synthetic fixture data served through the stubbed extract route; it
 * proves UI/state handling, never live extraction quality. The default
 * synthetic preparation ("no facts extracted") is unchanged.
 */
export const RICH_PREPARATION_DRAFT = {
  brand_name: "Kedai Fiksi",
  entity_scope: "Kedai Fiksi — kedai kopi di Bandung",
  brand_type: "kedai kopi",
  category: "kedai kopi",
  market_context: "Narasi pasar bukan data terstruktur",
  service_channels: ["on_premise", "delivery"],
  market_reach: "beberapa",
  market_areas: ["Bandung", "Cimahi"],
  published_locations: [
    {
      name: "Kedai Fiksi Dago",
      address: "Jl. Fiksi Raya No. 10, Bandung",
      source_url: "https://kedai-fiksi.example/lokasi",
    },
    {
      name: "Kedai Fiksi Cimahi",
      address: "Jl. Contoh Fiksi No. 2, Cimahi",
      source_url: "https://kedai-fiksi.example/lokasi",
    },
  ],
  category_suggestions: ["kedai kopi", "kafe", "warung minuman"],
  offering_category_suggestions: [
    { offering: "kopi susu", category: "minuman kopi siap minum" },
    { offering: "roti", category: "roti dan camilan" },
  ],
  target_customer: "pekerja kantoran sekitar",
  official_sources: ["https://kedai-fiksi.example/"],
  verified_offerings: ["kopi susu", "roti"],
  verified_customer_needs: ["minuman dekat kantor"],
  verified_decision_criteria: ["lokasi"],
  similar_businesses: [
    {
      name: "Kedai Tetangga",
      source_url: "https://kedai-tetangga.example/",
    },
  ],
  brand_name_variants: ["Kedai Fiksi Bandung"],
  priority_offering: "",
  conversion_action: "",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "Racikan kopi rumahan fiktif",
  regulated_category_notes: "",
  evidence: [
    {
      field: "published_locations",
      value: "Kedai Fiksi Dago",
      source_url: "https://kedai-fiksi.example/lokasi",
      note: "Halaman lokasi fiksi.",
    },
    {
      field: "verified_offerings",
      value: "kopi susu",
      source_url: "https://kedai-fiksi.example/menu",
      note: "Menu fiksi.",
    },
  ],
  warnings: [],
} satisfies ExtractionDraft;

/**
 * Serves `draft` through the identity and extract routes for the synthetic
 * journey. Pass `RICH_PREPARATION_DRAFT` for the labelled rich preparation.
 * The routes are stubbed, not skipped: request counts still apply.
 */
export async function stubPreparationDraft(page: Page, draft: ExtractionDraft) {
  await page.route("**/api/audit/identity?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        canonical_url: FICTIONAL_BUSINESS.url,
        display_name: FICTIONAL_BUSINESS.name,
        preparation_mode: "synthetic-local",
      }),
    }),
  );
  await page.route("**/api/audit/extract", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        draft,
        telemetry: [],
        preparation_mode: "synthetic-local",
      }),
    }),
  );
}

export function landingHero(page: Page) {
  return page.getByRole("region", { name: "Mulai audit visibilitas AI" });
}

/** Landing hero call-to-action → `/audit`. Expects to start on `/`. */
export async function openAuditFromLanding(
  page: Page,
  website = "example.com",
) {
  const hero = landingHero(page);
  await expect(
    hero.getByRole("heading", { name: "Cek bisnis Anda di AI" }),
  ).toBeVisible();
  await hero.getByPlaceholder("https://bisnisanda.com").fill(website);
  await hero.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
  // The dev server compiles /audit on its first visit; on a cold CI runner
  // that can take longer than the default 10 s expect timeout.
  await expect(page).toHaveURL(/\/audit$/, { timeout: 30_000 });
}

export function entryScreen(page: Page) {
  return page.locator('[data-intake-screen="entry"]');
}

export function readingScreen(page: Page) {
  return page.locator('[data-intake-screen="reading"]');
}

export function brandScreen(page: Page) {
  return page.locator('[data-intake-screen="brand"]');
}

export function orderScreen(page: Page) {
  return page.locator('[data-intake-screen="order"]');
}

export function focusScreen(page: Page) {
  return page.locator('[data-intake-screen="focus"]');
}

export function locationScreen(page: Page) {
  return page.locator('[data-intake-screen="location"]');
}

export function productScreen(page: Page) {
  return page.locator('[data-intake-screen="product"]');
}

export function categoryScreen(page: Page) {
  return page.locator('[data-intake-screen="category"]');
}

export function offeringsScreen(page: Page) {
  return page.locator('[data-intake-screen="offerings"]');
}

export function serviceScreen(page: Page) {
  return page.locator('[data-intake-screen="service"]');
}

export function marketScreen(page: Page) {
  return page.locator('[data-intake-screen="market"]');
}

export function targetCustomerScreen(page: Page) {
  return page.locator('[data-intake-screen="target-customer"]');
}

export function customerNeedsScreen(page: Page) {
  return page.locator('[data-intake-screen="customer-needs"]');
}

export function decisionConsiderationsScreen(page: Page) {
  return page.locator('[data-intake-screen="decision-considerations"]');
}

export function competitorsScreen(page: Page) {
  return page.locator('[data-intake-screen="competitors"]');
}

export function differentiatorScreen(page: Page) {
  return page.locator('[data-intake-screen="differentiator"]');
}

export function publicFactScreen(page: Page) {
  return page.locator('[data-intake-screen="public-fact"]');
}

export async function expectFocusScreen(page: Page) {
  await expect(focusScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: FOCUS_HEADING }),
  ).toBeVisible();
}

export async function expectLocationScreen(page: Page) {
  await expect(locationScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: LOCATION_HEADING }),
  ).toBeVisible();
}

export async function expectProductScreen(page: Page) {
  await expect(productScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: PRODUCT_HEADING }),
  ).toBeVisible();
}

export async function expectCategoryScreen(page: Page) {
  await expect(categoryScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: CATEGORY_HEADING }),
  ).toBeVisible();
}

export async function expectOfferingsScreen(page: Page) {
  await expect(offeringsScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: OFFERINGS_HEADING }),
  ).toBeVisible();
}

export async function expectServiceScreen(page: Page) {
  await expect(serviceScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: SERVICE_HEADING }),
  ).toBeVisible();
}

export async function expectMarketScreen(page: Page) {
  await expect(marketScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: MARKET_HEADING }),
  ).toBeVisible();
}

export async function expectTargetCustomerScreen(page: Page) {
  await expect(targetCustomerScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: TARGET_CUSTOMER_HEADING }),
  ).toBeVisible();
}

export async function expectCustomerNeedsScreen(page: Page) {
  await expect(customerNeedsScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: CUSTOMER_NEEDS_HEADING }),
  ).toBeVisible();
}

export async function expectDecisionConsiderationsScreen(page: Page) {
  await expect(decisionConsiderationsScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: DECISION_CONSIDERATIONS_HEADING }),
  ).toBeVisible();
}

export async function expectCompetitorsScreen(page: Page) {
  await expect(competitorsScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: COMPETITORS_HEADING }),
  ).toBeVisible();
}

export async function expectDifferentiatorScreen(page: Page) {
  await expect(differentiatorScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: DIFFERENTIATOR_HEADING }),
  ).toBeVisible();
}

export async function expectPublicFactScreen(page: Page) {
  await expect(publicFactScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: PUBLIC_FACT_HEADING }),
  ).toBeVisible();
}

export async function toggleCustomerNeed(page: Page, name: string) {
  await customerNeedsScreen(page).getByRole("button", { name }).click();
}

export async function addCustomerNeed(page: Page, name: string) {
  await customerNeedsScreen(page)
    .getByRole("textbox", { name: "Kebutuhan pelanggan lain" })
    .fill(name);
  await customerNeedsScreen(page)
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
}

/** The `Pelanggan sasaran` textbox on the target-customer screen. */
export function targetCustomerInput(page: Page) {
  return targetCustomerScreen(page).getByRole("textbox", {
    name: /Pelanggan sasaran/,
  });
}

export async function fillTargetCustomer(page: Page, value: string) {
  await targetCustomerInput(page).fill(value);
}

/** Toggles one chip on the decision-considerations screen (prepared or owner). */
export async function toggleConsideration(page: Page, name: string) {
  await decisionConsiderationsScreen(page)
    .getByRole("button", { name })
    .click();
}

/** The `Pertimbangan pembeli lain` draft input on the considerations screen. */
export function considerationInput(page: Page) {
  return decisionConsiderationsScreen(page).getByRole("textbox", {
    name: "Pertimbangan pembeli lain",
  });
}

/** Commits an owner consideration through the screen's `Tambah` button. */
export async function addConsideration(page: Page, name: string) {
  await considerationInput(page).fill(name);
  await decisionConsiderationsScreen(page)
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
}

/** Fills the consideration draft without committing — used for refused adds. */
export async function draftConsideration(page: Page, name: string) {
  await considerationInput(page).fill(name);
}

/**
 * Asserts every glyph rectangle of a selected consideration chip sits inside
 * the chip's painted shape (its box minus the uniform corner radius), not
 * merely inside the document width.
 */
export async function expectConsiderationTextOnBackground(
  page: Page,
  value: string,
) {
  const chip = decisionConsiderationsScreen(page).getByRole("button", {
    name: value,
    exact: true,
  });
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  expect(
    await chip.evaluate((element) => {
      const text = element.querySelector("span")?.firstChild;
      if (!(text instanceof Text) || !text.length) return false;
      const box = element.getBoundingClientRect();
      const radius = Math.min(
        parseFloat(getComputedStyle(element).borderTopLeftRadius),
        box.width / 2,
        box.height / 2,
      );
      if (!Number.isFinite(radius)) return false;
      const inside = (x: number, y: number) => {
        if (x < box.left || x > box.right || y < box.top || y > box.bottom)
          return false;
        const cx = Math.max(box.left + radius, Math.min(x, box.right - radius));
        const cy = Math.max(box.top + radius, Math.min(y, box.bottom - radius));
        return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
      };
      const range = document.createRange();
      for (let index = 0; index < text.length; index += 1) {
        range.setStart(text, index);
        range.setEnd(text, index + 1);
        for (const rect of Array.from(range.getClientRects())) {
          if (
            !inside(rect.left + 1, rect.top + 1) ||
            !inside(rect.right - 1, rect.top + 1) ||
            !inside(rect.left + 1, rect.bottom - 1) ||
            !inside(rect.right - 1, rect.bottom - 1)
          )
            return false;
        }
      }
      return true;
    }),
  ).toBe(true);
}

/** The `Pembeda bisnis` textarea on the differentiator screen. */
export function differentiatorInput(page: Page) {
  return differentiatorScreen(page).getByRole("textbox", {
    name: /Pembeda bisnis/,
  });
}

export async function fillDifferentiator(page: Page, value: string) {
  await differentiatorInput(page).fill(value);
}

export async function chooseCompetitorMode(
  page: Page,
  mode:
    "Bisnis yang saya pilih" | "Tidak ada pembanding langsung" | "Belum tahu",
) {
  await competitorsScreen(page).getByRole("radio", { name: mode }).click();
}

export async function addCompetitor(page: Page, name: string) {
  await competitorsScreen(page)
    .getByRole("textbox", { name: "Nama pembanding lain" })
    .fill(name);
  await competitorsScreen(page)
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
}

export async function fillPublicFact(page: Page, value: string) {
  await publicFactScreen(page).getByRole("textbox").fill(value);
}

/** The frame footer's `Lanjut` (brand, focus, location, product stages). */
export async function pressLanjut(page: Page) {
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
}

/** The frame footer's `Kembali`. */
export async function pressKembali(page: Page) {
  await page.getByRole("button", { name: "Kembali", exact: true }).click();
}

/** Focus screen: pick one of the three focus cards. */
export async function chooseFocus(
  page: Page,
  name: "Brand secara keseluruhan" | "Satu lokasi" | "Satu produk atau layanan",
) {
  await focusScreen(page).getByRole("radio", { name }).click();
}

/** The entry step is showing with both fields empty. */
export async function expectEmptyEntry(page: Page) {
  await expect(entryScreen(page)).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Nama bisnis", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "URL website publik", exact: true }),
  ).toHaveValue("");
}

/** Opens `/audit` and fills the entry step. Does not press `Periksa`. */
export async function fillEntry(
  page: Page,
  {
    suffix = "",
    name = FICTIONAL_BUSINESS.name as string,
    url = FICTIONAL_BUSINESS.url as string,
  } = {},
) {
  await page.goto(`/audit${suffix}`);
  await page.getByRole("textbox", { name: "Nama bisnis" }).fill(name);
  await page.getByRole("textbox", { name: "URL website publik" }).fill(url);
}

export async function pressPeriksa(page: Page) {
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
}

/** The J7 final review (internal stage stays `summary`). */
export function reviewScreen(page: Page) {
  return page.locator('[data-intake-screen="review"]');
}

/** One labelled read-back row on the review (Bisnis, Nama lain, …). */
export function reviewRow(page: Page, name: string) {
  return reviewScreen(page).getByRole("region", { name, exact: true });
}

export async function expectSummary(page: Page) {
  await expect(reviewScreen(page)).toBeVisible();
  await expect(reviewScreen(page)).toHaveAttribute(
    "data-smart-summary",
    "ready",
  );
  await expect(
    page.getByRole("heading", { name: REVIEW_HEADING }),
  ).toBeVisible();
}

/** Review Bisnis row: `Ubah` opens the brand check for a name correction. */
export async function editBusinessFromReview(page: Page) {
  await reviewRow(page, "Bisnis")
    .getByRole("button", { name: "Ubah", exact: true })
    .click();
}

/** Review Bisnis row: `Ubah website` opens the entry source fields. */
export async function editWebsiteFromReview(page: Page) {
  await reviewRow(page, "Bisnis")
    .getByRole("button", { name: "Ubah website", exact: true })
    .click();
}

/** The `Nama lain` row's `Ubah` opens the inline alias editor. */
export async function openAliasEditor(page: Page, keyboard = false) {
  const button = reviewRow(page, "Nama lain").getByRole("button", {
    name: "Ubah",
    exact: true,
  });
  if (keyboard) {
    await button.focus();
    await button.press("Enter");
  } else await button.click();
}

export function aliasInput(page: Page) {
  return reviewRow(page, "Nama lain").getByRole("textbox", {
    name: "Nama lain baru",
  });
}

/** Types an alias into the editor and commits it with the Tambah button. */
export async function addAlias(page: Page, value: string) {
  await aliasInput(page).fill(value);
  await reviewRow(page, "Nama lain")
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
}

/** Removes a committed alias by pressing its selected chip. */
export async function removeAlias(
  page: Page,
  name: string | RegExp,
  keyboard = false,
) {
  const chip = reviewRow(page, "Nama lain").getByRole("button", { name });
  if (keyboard) {
    await chip.focus();
    await chip.press("Enter");
  } else await chip.click();
}

/** Reads the stored v9 intake session. Spec 016 R-29: the intake progress is
 * kept in the browser's local storage, so it survives a closed tab. */
export async function intakeSession(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
}

/** The brand-confirm screen is showing with the business name card. */
export async function expectBrandConfirm(
  page: Page,
  name: string = FICTIONAL_BUSINESS.name,
) {
  await expect(brandScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: BRAND_HEADING }),
  ).toBeVisible();
  await expect(brandScreen(page)).toContainText(name);
}

/** Screen 3a: type the email and press `Lanjut`. The order is made and the
 * paid reading (screen 3b) runs. */
export async function submitOrder(page: Page, email: string = ORDER_EMAIL) {
  await expect(orderScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: ORDER_HEADING }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: /Email/ }).fill(email);
  await pressLanjut(page);
}

/** Brand confirm → `Lanjut` → order screen → email → `Lanjut` → the focus
 * screen. (A saved, still-open order skips the order screen's email field.) */
export async function confirmBrand(page: Page, email: string = ORDER_EMAIL) {
  await page.getByRole("button", { name: CONFIRM_BRAND, exact: true }).click();
  await page
    .locator('[data-intake-screen="order"], [data-intake-screen="focus"]')
    .first()
    .waitFor();
  if (await orderScreen(page).isVisible()) await submitOrder(page, email);
  await expectFocusScreen(page);
}

/** Focus screen → `Lanjut` → the category screen. */
export async function confirmFocus(page: Page) {
  await pressLanjut(page);
  await expectCategoryScreen(page);
}

/**
 * Walks the detail screens to the summary. Prepared values are
 * already selected, so `Lanjut` is enough; when the synthetic reading found
 * nothing, each gated screen gets the smallest owner answer instead: a typed
 * category, one added offering, the on-premise channel, nationwide reach.
 * A location focus skips the market screen entirely.
 */
export async function throughDetailScreens(page: Page) {
  const lanjut = page.getByRole("button", { name: "Lanjut", exact: true });
  await expectCategoryScreen(page);
  if (await lanjut.isDisabled()) {
    const input = categoryScreen(page).getByRole("textbox", {
      name: "Kategori",
    });
    if (!(await input.isVisible()))
      await categoryScreen(page)
        .getByRole("button", { name: "Tulis kategori sendiri" })
        .click();
    await input.fill("kedai kopi");
  }
  await pressLanjut(page);
  await expectOfferingsScreen(page);
  if (await lanjut.isDisabled()) {
    const input = offeringsScreen(page).getByRole("textbox", {
      name: "Penawaran lain",
    });
    await input.fill("kopi susu");
    await input.press("Enter");
  }
  await pressLanjut(page);
  await expectTargetCustomerScreen(page);
  await pressLanjut(page);
  await expectCustomerNeedsScreen(page);
  await pressLanjut(page);
  await expectDecisionConsiderationsScreen(page);
  await pressLanjut(page);
  await expectServiceScreen(page);
  if (await lanjut.isDisabled())
    await serviceScreen(page)
      .getByRole("checkbox", { name: "Di lokasi bisnis Anda" })
      .click();
  await pressLanjut(page);
  // A location focus audits no market: service hops to competitors.
  await page
    .locator(
      '[data-intake-screen="market"], [data-intake-screen="competitors"]',
    )
    .first()
    .waitFor();
  if (await marketScreen(page).isVisible()) {
    if (await lanjut.isDisabled())
      await marketScreen(page)
        .getByRole("radio", { name: "Seluruh Indonesia" })
        .click();
    await pressLanjut(page);
  }
  await throughCompetitorContext(page);
}

/** Walks the optional customer screens after market or a location-focus service. */
export async function throughCompetitorContext(page: Page) {
  await expectCompetitorsScreen(page);
  await pressLanjut(page);
  await expectDifferentiatorScreen(page);
  await pressLanjut(page);
  await expectPublicFactScreen(page);
  await pressLanjut(page);
  await expectSummary(page);
}

/** Entry → `Periksa` → reading → brand confirm → focus → details → summary. */
export async function toSummary(
  page: Page,
  entry: Parameters<typeof fillEntry>[1] = {},
) {
  await fillEntry(page, entry);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await confirmBrand(page);
  await confirmFocus(page);
  await throughDetailScreens(page);
}

export async function confirmSummary(page: Page) {
  await page.getByRole("button", { name: CONFIRM_SUMMARY }).click();
}

export async function expectQuestionReview(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
  ).toBeVisible();
}

export async function expectTenQuestions(page: Page) {
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
}

/** Entry → detail screens → summary → ten reviewable questions. */
export async function toQuestions(page: Page, suffix = "") {
  await toSummary(page, { suffix });
  await confirmSummary(page);
  await expectQuestionReview(page);
  await expectTenQuestions(page);
}

export async function editQuestion(page: Page, slot: number, wording: string) {
  await page
    .getByRole("button", { name: `Ubah pertanyaan ${slot}`, exact: true })
    .click();
  await page.getByRole("textbox", { name: `Pertanyaan ${slot}` }).fill(wording);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
}

/** Approving the ten questions saves them on the server (spec 016 R-17). */
export async function startAudit(page: Page) {
  await page.getByRole("button", { name: "Mulai audit" }).click();
}

/** Screens 15 and 15a: the server-side audit's progress and result. */
export function auditStage(page: Page, stage: string) {
  return page.locator(`[data-order-stage="${stage}"]`);
}

export const CLOSE_OK_NOTE =
  "Anda boleh menutup halaman ini. Kami akan mengirim link laporan ke email Anda.";

/** The audit is running on the server and the tab says it may be closed. */
export async function expectAuditRunning(page: Page, timeout = 15_000) {
  await expect(
    page.locator(
      '[data-order-stage="running"], [data-order-stage="reporting"]',
    ),
  ).toBeVisible({ timeout });
  await expect(page.getByText(CLOSE_OK_NOTE)).toBeVisible();
}

/** Screen 15a: the report is ready and was emailed. The tab never shows the
 * report itself. */
export async function expectAuditDelivered(page: Page, timeout = 45_000) {
  await expect(auditStage(page, "delivered")).toBeVisible({ timeout });
  await expect(
    page.getByText("Laporan Anda sudah siap dan kami kirim ke email Anda."),
  ).toBeVisible();
}

/**
 * Local tests only: runs one cron pass through the development trigger
 * (spec 016 R-33). The trigger exists only under `next dev` in synthetic mode.
 */
export async function runRunnerOnce(page: Page) {
  const response = await page.request.post("/api/dev/run-cron");
  expect(response.status()).toBe(200);
  return (await response.json()) as { ran: boolean; outcomes?: string[] };
}

export function reportLocator(page: Page) {
  return page.locator("[data-direct-ten-report]");
}

/** Presses the JSON export button and returns the parsed download. */
export async function downloadEvidenceJson(
  page: Page,
  name: string | RegExp = "Unduh bukti JSON",
) {
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name, exact: typeof name === "string" })
    .click();
  const saved = await download;
  const text = await readFile((await saved.path())!, "utf8");
  return { download: saved, text, json: JSON.parse(text) };
}

/** The ready email the fake sender wrote (spec 016 R-28). */
export type TestMail = { to: string; subject: string; text: string };

/** The fake sender's local files, written only in local development to the
 * ignored folder `.local-evidence/test-mail/`, newest last. */
export async function readTestMail(since: number): Promise<TestMail[]> {
  const folder = join(process.cwd(), ".local-evidence", "test-mail");
  let names: string[] = [];
  try {
    names = await readdir(folder);
  } catch {
    return [];
  }
  const found: Array<{ at: number; mail: TestMail }> = [];
  for (const name of names) {
    const path = join(folder, name);
    const info = await stat(path);
    if (info.mtimeMs < since) continue;
    found.push({
      at: info.mtimeMs,
      mail: JSON.parse(await readFile(path, "utf8")) as TestMail,
    });
  }
  return found.sort((a, b) => a.at - b.at).map((item) => item.mail);
}

/** The private link inside the newest ready email to `to`, as a path with its
 * fragment (`/r#secret`) so it opens on whatever address the test server has. */
export async function readyLinkFromMail(
  since: number,
  to: string = ORDER_EMAIL,
): Promise<{ path: string; secret: string; mail: TestMail }> {
  const ready = (await readTestMail(since)).filter(
    (mail) => mail.to === to && /siap/.test(mail.subject),
  );
  const mail = ready.at(-1);
  const secret = mail ? /\/r#([A-Za-z0-9_-]+)/.exec(mail.text)?.[1] : undefined;
  if (!mail || !secret) throw new Error("no ready email with a link was found");
  return { path: `/r#${secret}`, secret, mail };
}

/** Local tests only: runs the cron through the development trigger until the
 * ready email has gone out (ten questions, then the report). */
export async function runServerAuditToDelivery(
  page: Page,
  maxRuns = 16,
): Promise<string[]> {
  const outcomes: string[] = [];
  for (let run = 0; run < maxRuns; run += 1) {
    const result = await runRunnerOnce(page);
    expect(result.ran).toBe(true);
    outcomes.push(...(result.outcomes ?? []));
    if (outcomes.includes("report_saved")) return outcomes;
  }
  throw new Error(`the audit did not reach a saved report in ${maxRuns} runs`);
}

/** The saved report page (spec 016 R-26) once it has opened a valid link. */
export function savedReport(page: Page) {
  return page.locator('[data-saved-report="ready"]');
}

/** The "not available" page for a link that does not work (R-27). */
export function unavailableReport(page: Page) {
  return page.locator('[data-saved-report="unavailable"]');
}
