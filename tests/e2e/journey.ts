import {
  expect as baseExpect,
  type Locator,
  type Page,
} from "@playwright/test";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ExtractionDraft } from "../../src/lib/audit/types";

/**
 * The one shared driver for the public audit journey (the v2 mobile journey,
 * Figma J01–J35). The e2e specs and the `verify-nuave` skill CLI
 * (`.agents/skills/verify-nuave/`) both import it, so every journey selector
 * lives here. Add a step here before writing it inline in a spec or in the
 * CLI.
 *
 * The timeout matches `expect.timeout` in `playwright.config.ts`, so the same
 * steps wait equally long inside and outside the Playwright test runner.
 */
const expect = baseExpect.configure({ timeout: 10_000 });

/** A page, or the part of it a step works in (a screen or an edit sheet).
 * While a sheet is open the page behind it is hidden from role queries, so a
 * page-wide query finds the sheet's controls. */
type Scope = Page | Locator;

/** Fictional business used by every synthetic journey. */
export const FICTIONAL_BUSINESS = {
  name: "Kedai Fiksi",
  url: "https://kedai-fiksi.example/",
} as const;

// J01: the `/audit` entry's headline and form.
export const ENTRY_HEADING = "Bisnis Anda disebut AI?";
export const WEBSITE_FIELD = "Website atau akun Instagram bisnis";
export const CHECK_BUSINESS = "Cek bisnis saya di AI";
// Spec 020: the clinic landing page at `/`. Its three website forms (hero,
// price receipt, closing) share these names; the hero's comes first.
export const LANDING_HEADING =
  "Pasien sekarang tanya AI dulu sebelum pilih klinik";
export const LANDING_FIELD = "Website atau Instagram klinik";
export const LANDING_CHECK = "Cek klinik saya di AI";
export const ENTRY_INVALID_NOTICE =
  "Masukkan satu website atau akun Instagram yang valid.";
/** Shown under the entry form while the server is not live. */
export const SYNTHETIC_LABEL =
  "Mode uji lokal menggunakan pengganti sintetis berlabel.";
// J02–J04: the free check.
export const LOOKUP_HEADING = "Sebentar, kami cari bisnis Anda";
export const LOOKUP_LONG_HEADING = "Masih membaca. Website Anda cukup lengkap.";
export const LOOKUP_WAY_OUT_HEADING = "Website Anda butuh waktu lebih lama";
export const CONTINUE_WITH_NAME = "Lanjut dengan nama ini";
export const LOOKUP_INTERRUPTED_NOTICE =
  "Pemeriksaan website sebelumnya terputus. Tekan Cek bisnis saya di AI untuk mencoba lagi.";
// J05–J08: business found, three steps, checkout.
export const BRAND_HEADING = "Kami menemukan bisnis Anda";
export const CONFIRM_BRAND = "Ya, ini bisnis saya";
export const STEPS_HEADING = "Tinggal 3 langkah";
export const TO_PAYMENT = "Lanjut ke pembayaran";
export const ORDER_HEADING = "Konfirmasi dan bayar";
export const ORDER_EMAIL_FIELD = "Email penerima laporan";
/** The email the synthetic journeys order with (never stored in the browser). */
export const ORDER_EMAIL = "pemilik@example.com";
// J09: the paid reading.
export const READING_HEADING = "Nuave sedang membaca website Anda";
export const READ_HEADING = "Website Anda sudah terbaca";
export const READING_INTERRUPTED_NOTICE =
  "Pembacaan website sebelumnya terputus. Isian Anda tetap tersimpan. Tekan Lanjut untuk membaca ulang.";
// J10/J24: the chapter covers.
export const INTRO_BUSINESS_HEADING = "Ceritakan bisnis Anda";
export const INTRO_REVIEW_HEADING = "Periksa, lalu jalankan audit";
// J11–J23: Step 2.
export const FOCUS_HEADING = "Apa yang ingin Anda audit?";
export const LOCATION_HEADING = "Cabang mana?";
export const PRODUCT_HEADING = "Produk mana?";
export const CATEGORY_HEADING =
  /^(Bisnis Anda|Lokasi ini|Produk atau layanan ini) biasanya disebut apa\?$/;
export const OFFERINGS_HEADING = "Apa saja yang Anda jual?";
export const TARGET_CUSTOMER_HEADING =
  "Siapa yang biasanya mencari bisnis Anda?";
export const CUSTOMER_NEEDS_HEADING = "Apa yang mereka cari saat memilih?";
export const SERVICE_HEADING = "Bagaimana pelanggan mendapatkannya?";
export const MARKET_HEADING = "Di mana pelanggan Anda berada?";
/** J20 when Nuave found businesses to compare, J21 when it found none. */
export const COMPETITORS_HEADING =
  /^(Siapa yang mungkin dibandingkan dengan Anda|Bisnis mana yang sering dibandingkan dengan Anda)\?$/;
export const SKIP_COMPETITORS =
  "Belum tahu? Lewati, kami bandingkan dengan bisnis sejenis.";
export const DIFFERENTIATOR_HEADING = "Apa yang membuat bisnis Anda berbeda?";
export const PUBLIC_FACT_TOGGLE = "Ada info yang sering salah ditulis AI?";
// J25/J26: the review and its edit sheets.
export const REVIEW_HEADING = "Ini profil yang akan Nuave pakai";
export const REVIEW_CONFIRMATION =
  "Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam pertanyaan audit.";
export const CONFIRM_SUMMARY = "Buat pertanyaan audit";
export const COMPLETE_GAPS = "Lengkapi yang perlu dipastikan";
/** After payment only the website is locked; the name can still be fixed. */
export const WEBSITE_LOCKED_NOTE = "Website sudah terkunci untuk pesanan ini.";
// J27/J27b/J28: the questions and the start sheet.
export const QUESTIONS_HEADING = "10 pertanyaan untuk AI";
export const RUN_AUDIT = "Jalankan audit";
export const START_SHEET = "Mulai audit sekarang?";
export const START_AUDIT = "Mulai audit sekarang";
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

/**
 * Until the page next loads, its `fetch` calls to `path` still reach the
 * server but their answers never reach the page: a slow server, as the page
 * sees it. A reload then drops the wait the way a customer's browser drops a
 * request in flight. A never-answered `page.route` cannot stand in here:
 * Chromium fails a held route as soon as the page starts to reload, so the
 * page's own error handling runs first, which a real slow request never
 * causes.
 */
export async function holdAnswers(page: Page, path: string) {
  await page.evaluate((held) => {
    const send = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        location.href,
      );
      const answer = send(input, init);
      if (url.pathname !== held) return answer;
      answer.catch(() => {});
      return new Promise<Response>(() => {});
    };
  }, path);
}

/* ───────────────────────────── screens ───────────────────────────── */

function intakeScreen(page: Page, name: string) {
  return page.locator(`[data-intake-screen="${name}"]`);
}

export function entryScreen(page: Page) {
  return intakeScreen(page, "entry");
}

/** The free check (J02–J04) and the paid reading (J09) share this marker. */
export function readingScreen(page: Page) {
  return intakeScreen(page, "reading");
}

/** J09: the paid reading, the one ember-toned screen. */
export function paidReadingScreen(page: Page) {
  return page.locator(
    '[data-journey-tone="ember"] [data-intake-screen="reading"]',
  );
}

export function brandScreen(page: Page) {
  return intakeScreen(page, "brand");
}

export function stepsScreen(page: Page) {
  return intakeScreen(page, "steps");
}

export function orderScreen(page: Page) {
  return intakeScreen(page, "order");
}

export function introBusinessScreen(page: Page) {
  return intakeScreen(page, "intro-business");
}

export function introReviewScreen(page: Page) {
  return intakeScreen(page, "intro-review");
}

export function focusScreen(page: Page) {
  return intakeScreen(page, "focus");
}

export function locationScreen(page: Page) {
  return intakeScreen(page, "location");
}

export function productScreen(page: Page) {
  return intakeScreen(page, "product");
}

export function categoryScreen(page: Page) {
  return intakeScreen(page, "category");
}

export function offeringsScreen(page: Page) {
  return intakeScreen(page, "offerings");
}

export function serviceScreen(page: Page) {
  return intakeScreen(page, "service");
}

export function marketScreen(page: Page) {
  return intakeScreen(page, "market");
}

export function targetCustomerScreen(page: Page) {
  return intakeScreen(page, "target-customer");
}

/** J17: what customers need and what they compare, on one screen. */
export function customerNeedsScreen(page: Page) {
  return intakeScreen(page, "customer-needs");
}

export function competitorsScreen(page: Page) {
  return intakeScreen(page, "competitors");
}

/** J22/J23: the differentiator, with the often-wrong public fact folded in. */
export function differentiatorScreen(page: Page) {
  return intakeScreen(page, "differentiator");
}

/** J25: the final review (internal stage stays `summary`). */
export function reviewScreen(page: Page) {
  return intakeScreen(page, "review");
}

/** J27: the ten questions. */
export function questionsScreen(page: Page) {
  return intakeScreen(page, "s-questions");
}

/** The fixed bottom bar (the journey's only `<footer>`). */
export function bottomBar(page: Page) {
  return page.getByRole("contentinfo");
}

async function expectScreen(
  page: Page,
  screen: Locator,
  heading: string | RegExp,
  level = 1,
) {
  await expect(screen).toBeVisible();
  await expect(
    page.getByRole("heading", { level, name: heading, exact: true }),
  ).toBeVisible();
}

export async function expectStepsScreen(page: Page) {
  await expectScreen(page, stepsScreen(page), STEPS_HEADING);
}

export async function expectOrderScreen(page: Page) {
  // The heading is visually hidden; the top bar shows the same title.
  await expectScreen(page, orderScreen(page), ORDER_HEADING);
}

/** The Step 2 cover (J10). The paid reading before it pauses on what it
 * found, so it may take a few seconds to arrive. */
export async function expectIntroBusiness(page: Page, timeout = 20_000) {
  await expect(introBusinessScreen(page)).toBeVisible({ timeout });
  await expect(
    page.getByRole("heading", { level: 1, name: INTRO_BUSINESS_HEADING }),
  ).toBeVisible();
}

/** The Step 3 cover (J24). */
export async function expectIntroReview(page: Page) {
  await expectScreen(page, introReviewScreen(page), INTRO_REVIEW_HEADING);
}

export async function expectFocusScreen(page: Page) {
  await expectScreen(page, focusScreen(page), FOCUS_HEADING);
}

export async function expectLocationScreen(page: Page) {
  await expectScreen(page, locationScreen(page), LOCATION_HEADING, 2);
}

export async function expectProductScreen(page: Page) {
  await expectScreen(page, productScreen(page), PRODUCT_HEADING, 2);
}

export async function expectCategoryScreen(page: Page) {
  await expectScreen(page, categoryScreen(page), CATEGORY_HEADING);
}

export async function expectOfferingsScreen(page: Page) {
  await expectScreen(page, offeringsScreen(page), OFFERINGS_HEADING);
}

export async function expectServiceScreen(page: Page) {
  await expectScreen(page, serviceScreen(page), SERVICE_HEADING);
}

export async function expectMarketScreen(page: Page) {
  await expectScreen(page, marketScreen(page), MARKET_HEADING);
}

export async function expectTargetCustomerScreen(page: Page) {
  await expectScreen(page, targetCustomerScreen(page), TARGET_CUSTOMER_HEADING);
}

export async function expectCustomerNeedsScreen(page: Page) {
  await expectScreen(page, customerNeedsScreen(page), CUSTOMER_NEEDS_HEADING);
}

export async function expectCompetitorsScreen(page: Page) {
  await expectScreen(page, competitorsScreen(page), COMPETITORS_HEADING);
}

export async function expectDifferentiatorScreen(page: Page) {
  await expectScreen(page, differentiatorScreen(page), DIFFERENTIATOR_HEADING);
}

/* ───────────────────────────── bars ───────────────────────────── */

/** The bottom bar's `Lanjut` (Step 2 screens, a prepared brand check, an
 * order that needs no payment or is paid). */
export async function pressLanjut(page: Page) {
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
}

/** The bottom bar's `Kembali`. */
export async function pressKembali(page: Page) {
  await page.getByRole("button", { name: "Kembali", exact: true }).click();
}

/** A chapter cover's `Mulai` (J10, J24). */
export async function pressMulai(page: Page) {
  await page.getByRole("button", { name: "Mulai", exact: true }).click();
}

/** The top bar's round back button (Step 1 and checkout). */
export function backButton(page: Page) {
  return page.getByRole("button", { name: "Halaman sebelumnya", exact: true });
}

/* ───────────────────────── J01–J05: entry and free check ───────────────────────── */

/** The `/audit` entry's website field. */
export function websiteInput(page: Page) {
  return page.getByRole("textbox", { name: WEBSITE_FIELD, exact: true });
}

/** The landing hero (its region is named by the page's headline). */
export function landingHero(page: Page) {
  return page.getByRole("region", { name: LANDING_HEADING });
}

/** The landing hero's website field (the first of the page's three). */
export function landingInput(page: Page) {
  return landingHero(page).getByRole("textbox", {
    name: LANDING_FIELD,
    exact: true,
  });
}

/** Landing hero form → `/audit`. Expects to start on `/`. The website goes
 * along through this tab's session storage and `/audit` starts the free
 * check at once. */
export async function openAuditFromLanding(
  page: Page,
  website = "example.com",
) {
  await expect(
    page.getByRole("heading", { level: 1, name: LANDING_HEADING }),
  ).toBeVisible();
  await landingInput(page).fill(website);
  await landingHero(page)
    .getByRole("button", { name: LANDING_CHECK, exact: true })
    .click();
  // The dev server compiles /audit on its first visit; on a cold CI runner
  // that can take longer than the default 10 s expect timeout.
  await expect(page).toHaveURL(/\/audit$/, { timeout: 30_000 });
}

/** The entry step is showing, its heading focused, with the website field
 * empty. */
export async function expectEmptyEntry(page: Page) {
  await expect(entryScreen(page)).toBeVisible();
  const heading = page.getByRole("heading", { level: 1, name: ENTRY_HEADING });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(websiteInput(page)).toHaveValue("");
}

/** Types into the entry's website field (no navigation). */
export async function fillWebsite(page: Page, url: string) {
  await entryScreen(page)
    .getByRole("textbox", { name: WEBSITE_FIELD, exact: true })
    .fill(url);
}

/** Opens `/audit` and fills the website field. Does not press the check. The
 * business name is read from the website on the next step. */
export async function fillEntry(
  page: Page,
  {
    suffix = "",
    url = FICTIONAL_BUSINESS.url as string,
  }: { suffix?: string; url?: string } = {},
) {
  await page.goto(`/audit${suffix}`);
  await fillWebsite(page, url);
}

/** The entry's `Cek bisnis saya di AI`: the free check (J02). */
export async function pressPeriksa(page: Page) {
  await entryScreen(page)
    .getByRole("button", { name: CHECK_BUSINESS, exact: true })
    .click();
}

/** The business-found screen (J05) is showing with the business name card. */
export async function expectBrandConfirm(
  page: Page,
  name: string = FICTIONAL_BUSINESS.name,
) {
  await expect(brandScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: BRAND_HEADING }),
  ).toBeVisible();
  await expect(
    brandScreen(page).getByRole("heading", { level: 2, name, exact: true }),
  ).toBeVisible();
}

/** J05: "Bukan bisnis Anda?" → `Ganti tautan bisnis` returns to the entry
 * with the website kept for correction. */
export async function changeBusinessLink(page: Page) {
  await brandScreen(page)
    .getByRole("button", { name: "Ganti tautan bisnis", exact: true })
    .click();
  await expect(entryScreen(page)).toBeVisible();
}

/** J05b: `Ubah nama` opens the name sheet; `Simpan` keeps the new name. */
export async function renameBusiness(page: Page, name: string) {
  await brandScreen(page)
    .getByRole("button", { name: "Ubah nama", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Nama bisnis", exact: true });
  await expect(sheet).toBeVisible();
  await sheet
    .getByRole("textbox", { name: "Nama bisnis", exact: true })
    .fill(name);
  await sheet.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(sheet).toHaveCount(0);
}

/* ───────────────────────── J06–J10: steps, checkout, paid reading ───────────────────────── */

/** Spec 017: the price, the button and the copy of the checkout (J07). */
export const PAY_BUTTON = "Bayar Rp249.000";
export const PAID_HEADING = "Pembayaran diterima";
export const ORDER_PRICE_NOTE =
  "Sekali bayar. Tanpa pajak atau biaya tambahan dari Nuave.";
/** The consent line under the pay button, in the bottom bar. */
export const PAY_CONSENT =
  "Dengan membayar, Anda menyetujui Syarat dan Ketentuan serta Kebijakan Privasi.";
/** Q5, word for word: mirrors `DELIVERY_PROMISE` in `src/lib/orders/promise.ts`. */
export const ORDER_DELIVERY_PROMISE =
  "Laporan siap dalam 30 menit setelah audit dimulai. Jika ada bagian yang gagal diperiksa, tim kami membantu menyelesaikannya. Jika tetap tidak bisa, Anda mendapat pengembalian dana sebagian, sesuai jumlah pemeriksaan yang gagal.";
/** The code `/uji` keeps in session storage (the e2e server's own test code). */
export const E2E_TEST_PASS_CODE = "e2e-test-pass-code-not-a-secret-0001";
/** Mirrors `TEST_PASS_STORAGE_KEY` in `src/lib/intake/test-pass.ts`. */
export const TEST_PASS_SESSION_KEY = "nuave.testPass.v1";

/** J05 → J06 → J07: `Ya, ini bisnis saya`, the three steps, then
 * `Lanjut ke pembayaran` opens checkout. Nothing is ordered on the way. */
export async function continueToOrder(page: Page) {
  await page.getByRole("button", { name: CONFIRM_BRAND, exact: true }).click();
  await expectStepsScreen(page);
  await page.getByRole("button", { name: TO_PAYMENT, exact: true }).click();
  await expectOrderScreen(page);
}

export function emailInput(page: Page) {
  return orderScreen(page).getByRole("textbox", {
    name: ORDER_EMAIL_FIELD,
    exact: true,
  });
}

export function payButton(page: Page) {
  return page.getByRole("button", { name: PAY_BUTTON, exact: true });
}

/** The checkout shows what is bought and its price, the delivery promise,
 * and — in the bottom bar — the pay button over the Terms and Privacy
 * consent (spec 017 Experience 2, J07). */
export async function expectOrderSummaryPrice(
  page: Page,
  businessName: string = FICTIONAL_BUSINESS.name,
) {
  const card = orderScreen(page).getByRole("article", {
    name: "Ringkasan pesanan",
  });
  await expect(card.getByText("AI Visibility Report")).toBeVisible();
  await expect(
    card.getByText(`${businessName} · 10 pertanyaan`, { exact: true }),
  ).toBeVisible();
  await expect(card.getByText("Total", { exact: true })).toBeVisible();
  await expect(card.getByText("Rp249.000", { exact: true })).toBeVisible();
  await expect(card.getByText(ORDER_PRICE_NOTE, { exact: true })).toBeVisible();
  await expect(
    card.getByText(ORDER_DELIVERY_PROMISE, { exact: true }),
  ).toBeVisible();
  const bar = bottomBar(page);
  await expect(bar.getByRole("button", { name: PAY_BUTTON })).toBeVisible();
  await expect(bar).toContainText(PAY_CONSENT);
  await expect(
    bar.getByRole("link", { name: "Syarat dan Ketentuan" }),
  ).toHaveAttribute("href", "/terms");
  await expect(
    bar.getByRole("link", { name: "Kebijakan Privasi" }),
  ).toHaveAttribute("href", "/privacy");
}

/** J07/J08 → J09: type the email and press the pay button. In synthetic mode
 * the labelled simulated payment pays at once and the paid reading then
 * starts by itself: J09 says "Pembayaran diterima" with the order number.
 * Returns that order number. */
export async function payOrder(page: Page, email: string = ORDER_EMAIL) {
  await expectOrderScreen(page);
  await emailInput(page).fill(email);
  await payButton(page).click();
  const reading = paidReadingScreen(page);
  await expect(reading).toBeVisible({ timeout: 15_000 });
  // The whole pill: "Pembayaran diterima · NV-…" (its parts wrap apart on a
  // narrow phone, so they are separate elements).
  const paid = reading.locator("p", { hasText: PAID_HEADING });
  await expect(paid).toContainText(/NV-[A-Z0-9]{6}/);
  const number = (await paid.textContent())?.match(/NV-[A-Z0-9]{6}/)?.[0];
  expect(number).toBeTruthy();
  return number!;
}

/** Checkout onwards: pay (see `payOrder`), or — for a tab that holds the
 * founder test code (`useTestPass`), or a paid order whose reading must run
 * again — type the email if asked and press `Lanjut`. Waits until checkout
 * has moved on: to the paid reading (J09, then the Step 2 cover by itself),
 * or — when saved progress continues on a replacement order (spec 016 R-30)
 * — straight back to where the customer was. */
export async function submitOrder(page: Page, email: string = ORDER_EMAIL) {
  await expectOrderScreen(page);
  const lanjut = page.getByRole("button", { name: "Lanjut", exact: true });
  await expect(payButton(page).or(lanjut).first()).toBeVisible();
  if (await payButton(page).isVisible()) {
    await payOrder(page, email);
  } else {
    if (await emailInput(page).isVisible()) await emailInput(page).fill(email);
    await lanjut.click();
  }
  await expect(orderScreen(page)).toHaveCount(0, { timeout: 15_000 });
}

/** This tab is the founder's: the code is in session storage before the page
 * loads, exactly as `/uji` leaves it. No payment, and the order is not locked
 * by a payment. */
export async function useTestPass(page: Page) {
  await page.addInitScript(([key, code]) => sessionStorage.setItem(key, code), [
    TEST_PASS_SESSION_KEY,
    E2E_TEST_PASS_CODE,
  ] as const);
}

/** The business check to the focus screen. A newly found business (J05):
 * `Ya, ini bisnis saya` → three steps → checkout → pay (see `submitOrder`)
 * → paid reading → cover. A brand check that already has its reading
 * (reached again by `Kembali`): `Lanjut` → cover. Then the cover's `Mulai`. */
export async function confirmBrand(page: Page, email: string = ORDER_EMAIL) {
  const found = page.getByRole("button", { name: CONFIRM_BRAND, exact: true });
  const lanjut = page.getByRole("button", { name: "Lanjut", exact: true });
  await expect(found.or(lanjut).first()).toBeVisible();
  if (await found.isVisible()) {
    await continueToOrder(page);
    await submitOrder(page, email);
  } else await lanjut.click();
  await expectIntroBusiness(page);
  await pressMulai(page);
  await expectFocusScreen(page);
}

/* ───────────────────────── J11–J12: focus and target ───────────────────────── */

export type FocusChoice = "Seluruh brand" | "Satu cabang" | "Satu produk";

/** One of the three focus cards (the radio's name also holds its line). */
export function focusCard(page: Page, name: FocusChoice) {
  return focusScreen(page).getByRole("radio", {
    name: new RegExp(`^${name}\\b`),
  });
}

/** Focus screen: pick one of the three focus cards. */
export async function chooseFocus(page: Page, name: FocusChoice) {
  await focusCard(page, name).click();
}

/** Focus screen → `Lanjut` → the category screen. */
export async function confirmFocus(page: Page) {
  await pressLanjut(page);
  await expectCategoryScreen(page);
}

/**
 * J11 → J12: pick a branch or product focus and reach its list. The design
 * opens the list on the tap itself (asserted on its own by the J4 focus
 * test); when the tap leaves the focus screen in place, `Lanjut` opens it,
 * so every other journey still reaches the list.
 */
export async function openFocusTarget(
  page: Page,
  name: "Satu cabang" | "Satu produk",
) {
  await chooseFocus(page, name);
  const target = name === "Satu cabang" ? "location" : "product";
  // The click handler saves the stage before the click resolves.
  if ((await intakeSession(page)).stage !== target) await pressLanjut(page);
  if (target === "location") await expectLocationScreen(page);
  else await expectProductScreen(page);
}

/** A row of the branch list (J12); its name also holds the address. */
export function locationRow(page: Page, name: string | RegExp) {
  return locationScreen(page).getByRole("radio", { name });
}

/** A row of the product list (J12). */
export function productRow(page: Page, name: string | RegExp) {
  return productScreen(page).getByRole("radio", { name });
}

/** The J12b add sheet of the location or product screen. */
export function addTargetSheet(page: Page, kind: "cabang" | "produk") {
  return page.getByRole("dialog", {
    name: kind === "cabang" ? "Tambah cabang" : "Tambah produk",
    exact: true,
  });
}

/** Saves an open add sheet (its header `Simpan`, not the hidden submit). */
export async function saveTargetSheet(sheet: Locator) {
  await sheet
    .getByRole("button", { name: "Simpan", exact: true })
    .first()
    .click();
  await expect(sheet).toHaveCount(0);
}

/** Location screen: `Tambah cabang`, both fields, `Simpan`. */
export async function addBranch(page: Page, name: string, address: string) {
  await locationScreen(page)
    .getByRole("button", { name: "Tambah cabang", exact: true })
    .click();
  const sheet = addTargetSheet(page, "cabang");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("textbox", { name: "Nama cabang" }).fill(name);
  await sheet.getByRole("textbox", { name: "Alamat cabang" }).fill(address);
  await saveTargetSheet(sheet);
}

/** Product screen: `Tambah produk`, the name, `Simpan`. */
export async function addProduct(page: Page, name: string) {
  await productScreen(page)
    .getByRole("button", { name: "Tambah produk", exact: true })
    .click();
  const sheet = addTargetSheet(page, "produk");
  await expect(sheet).toBeVisible();
  await sheet
    .getByRole("textbox", { name: "Nama produk atau layanan" })
    .fill(name);
  await saveTargetSheet(sheet);
}

/* ───────────────────────── J13–J19: business details ───────────────────────── */

/** J13: the single-choice category chips. */
export function categoryChoices(scope: Scope) {
  return scope.getByRole("radiogroup", { name: "Pilihan kategori" });
}

/** J13: `+ Lainnya` (unless the field is open already), type, Enter. */
export async function addCategory(scope: Scope, value: string) {
  const field = scope.getByRole("textbox", { name: "Kategori lain" });
  if (!(await field.isVisible()))
    await scope.getByRole("button", { name: "Lainnya", exact: true }).click();
  await field.fill(value);
  await field.press("Enter");
}

/** J14: the always-open `Produk atau layanan lain` field, Enter adds. */
export async function addOffering(scope: Scope, value: string) {
  const field = scope.getByRole("textbox", {
    name: "Produk atau layanan lain",
  });
  await field.fill(value);
  await field.press("Enter");
}

/** J18: one of the four service tiles (`Datang ke tempat`, `Dikirim`,
 * `Anda yang datang`, `Online`). */
export function serviceTile(scope: Scope, name: string) {
  return scope
    .getByRole("group", {
      name: "Cara pelanggan mendapatkan yang Anda tawarkan",
    })
    .getByRole("button", { name, exact: true });
}

/** J19: one of the four reach tiles. */
export async function chooseReach(
  scope: Scope,
  name: "Satu area" | "Beberapa area" | "Seluruh Indonesia" | "Luar negeri",
) {
  await scope.getByRole("radio", { name, exact: true }).click();
}

/** J19b: `Tambah kota` (unless open), type the area, Enter. */
export async function addArea(scope: Scope, value: string) {
  const field = scope.getByRole("textbox", { name: "Kota atau area" });
  if (!(await field.isVisible()))
    await scope
      .getByRole("button", { name: "Tambah kota", exact: true })
      .click();
  await field.fill(value);
  await field.press("Enter");
}

/**
 * Walks Step 2 from the category screen to the review. Prepared values are
 * already selected, so `Lanjut` is enough; when the synthetic reading found
 * nothing, each gated screen gets the smallest owner answer instead: a typed
 * category, one added offering, the on-premise tile, nationwide reach.
 * A location focus skips the market screen entirely.
 */
export async function throughDetailScreens(page: Page) {
  const lanjut = page.getByRole("button", { name: "Lanjut", exact: true });
  await expectCategoryScreen(page);
  if (await lanjut.isDisabled())
    await addCategory(categoryScreen(page), "kedai kopi");
  await pressLanjut(page);
  await expectOfferingsScreen(page);
  if (await lanjut.isDisabled())
    await addOffering(offeringsScreen(page), "kopi susu");
  await pressLanjut(page);
  await expectTargetCustomerScreen(page);
  await pressLanjut(page);
  await expectCustomerNeedsScreen(page);
  await pressLanjut(page);
  await expectServiceScreen(page);
  if (await lanjut.isDisabled())
    await serviceTile(serviceScreen(page), "Datang ke tempat").click();
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
      await chooseReach(marketScreen(page), "Seluruh Indonesia");
    await pressLanjut(page);
  }
  await throughCompetitorContext(page);
}

/** Walks the comparison screens after market (or a location-focus service):
 * competitors, the differentiator, the Step 3 cover, then the review. */
export async function throughCompetitorContext(page: Page) {
  await expectCompetitorsScreen(page);
  await pressLanjut(page);
  await expectDifferentiatorScreen(page);
  await pressLanjut(page);
  await expectIntroReview(page);
  await pressMulai(page);
  await expectSummary(page);
}

/* ───────────────────────── J16–J23: customers and comparison ───────────────────────── */

/** J16: the customer-type chips (toggle buttons). */
export function customerChips(scope: Scope) {
  return scope.getByRole("group", { name: "Jenis pelanggan", exact: true });
}

/** J16: `Tambah lainnya` (unless open), type, Enter. */
export async function addTargetCustomer(scope: Scope, value: string) {
  const field = scope.getByRole("textbox", { name: "Pelanggan lain" });
  if (!(await field.isVisible()))
    await scope
      .getByRole("button", { name: "Tambah lainnya", exact: true })
      .click();
  await field.fill(value);
  await field.press("Enter");
}

/** J16: the stored target customer becomes exactly `value` — every ticked
 * chip is unticked, then `value` is added as the one phrase. */
export async function fillTargetCustomer(scope: Scope, value: string) {
  const chips = customerChips(scope);
  const ticked = await chips
    .locator('button[aria-pressed="true"]')
    .allTextContents();
  for (const name of ticked) {
    const chip = chips.getByRole("button", { name: name.trim(), exact: true });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
  }
  await addTargetCustomer(scope, value);
}

/** J17: the "Mereka butuh…" chips. */
export function needsGroup(scope: Scope) {
  return scope.getByRole("group", { name: "Mereka butuh…", exact: true });
}

/** J17: the "Mereka membandingkan…" chips. */
export function considerationsGroup(scope: Scope) {
  return scope.getByRole("group", {
    name: "Mereka membandingkan…",
    exact: true,
  });
}

export async function toggleCustomerNeed(scope: Scope, name: string) {
  await needsGroup(scope).getByRole("button", { name, exact: true }).click();
}

/** The typed field of a `+ Lainnya` adder and its `Tambah` button. */
async function addThroughAdder(
  scope: Scope,
  opener: string,
  field: string,
  value: string,
) {
  const input = scope.getByRole("textbox", { name: field, exact: true });
  if (!(await input.isVisible()))
    await scope.getByRole("button", { name: opener, exact: true }).click();
  await input.fill(value);
  await scope
    .getByRole("group", { name: field, exact: true })
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
}

/** J17: `Lainnya (kebutuhan)` opens `Kebutuhan pelanggan lain`; `Tambah`. */
export async function addCustomerNeed(scope: Scope, name: string) {
  await addThroughAdder(
    scope,
    "Lainnya (kebutuhan)",
    "Kebutuhan pelanggan lain",
    name,
  );
}

/** Toggles one consideration chip (prepared, common or owner). */
export async function toggleConsideration(scope: Scope, name: string) {
  await considerationsGroup(scope)
    .getByRole("button", { name, exact: true })
    .click();
}

/** The `Pertimbangan pembeli lain` field (open it with
 * `Lainnya (pertimbangan)` first). */
export function considerationInput(scope: Scope) {
  return scope.getByRole("textbox", {
    name: "Pertimbangan pembeli lain",
    exact: true,
  });
}

/** Commits an owner consideration through the adder's `Tambah` button. */
export async function addConsideration(scope: Scope, name: string) {
  await addThroughAdder(
    scope,
    "Lainnya (pertimbangan)",
    "Pertimbangan pembeli lain",
    name,
  );
}

/** Fills the consideration draft without committing — used for refused adds. */
export async function draftConsideration(scope: Scope, name: string) {
  const input = considerationInput(scope);
  if (!(await input.isVisible()))
    await scope
      .getByRole("button", { name: "Lainnya (pertimbangan)", exact: true })
      .click();
  await input.fill(name);
}

/**
 * Asserts every glyph rectangle of a selected consideration chip sits inside
 * the chip's painted shape (its box minus the uniform corner radius), not
 * merely inside the document width.
 */
export async function expectConsiderationTextOnBackground(
  scope: Scope,
  value: string,
) {
  const chip = considerationsGroup(scope).getByRole("button", {
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

/** J20: one business to compare with, a checkbox row named by the business. */
export function competitorRow(scope: Scope, name: string) {
  return scope.getByRole("checkbox", { name, exact: true });
}

/** The `Nama atau website bisnis` field (open it with `Tambah pembanding`). */
export function competitorInput(scope: Scope) {
  return scope.getByRole("textbox", {
    name: "Nama atau website bisnis",
    exact: true,
  });
}

/** J20/J21: `Tambah pembanding` (unless open), type, `Tambah`. A refused
 * name stays in the field for correction. */
export async function addCompetitor(scope: Scope, name: string) {
  await addThroughAdder(
    scope,
    "Tambah pembanding",
    "Nama atau website bisnis",
    name,
  );
}

/** J20/J21: "Belum tahu? Lewati…" stores "not sure" and moves on. */
export async function skipCompetitors(page: Page) {
  await competitorsScreen(page)
    .getByRole("button", { name: SKIP_COMPETITORS, exact: true })
    .click();
}

/** J22: the `Pembeda bisnis` textarea. */
export function differentiatorInput(scope: Scope) {
  return scope.getByRole("textbox", { name: /^Pembeda bisnis/ });
}

export async function fillDifferentiator(scope: Scope, value: string) {
  await differentiatorInput(scope).fill(value);
}

/** J22: the fold "Ada info yang sering salah ditulis AI?". */
export function publicFactToggle(scope: Scope) {
  return scope.getByRole("button", {
    name: new RegExp(`^${PUBLIC_FACT_TOGGLE.replace("?", "\\?")}`),
  });
}

/** J22: the `Info yang benar` textarea inside the fold. */
export function publicFactInput(scope: Scope) {
  return scope.getByRole("textbox", { name: /^Info yang benar/ });
}

/** Opens the public-fact fold unless it is open already. */
export async function openPublicFact(scope: Scope) {
  const toggle = publicFactToggle(scope);
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click();
  await expect(publicFactInput(scope)).toBeVisible();
}

export async function fillPublicFact(scope: Scope, value: string) {
  await openPublicFact(scope);
  await publicFactInput(scope).fill(value);
}

/* ───────────────────────── J25/J26: review and edit sheets ───────────────────────── */

export type ReviewSection = "Bisnis" | "Calon pelanggan" | "Pembanding";

/** One of the review's three sections, named by its heading. */
export function reviewSection(page: Page, section: ReviewSection) {
  return reviewScreen(page).getByRole("region", {
    name: section,
    exact: true,
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The read-back value (`dd`) of one review fact (`dt`): Nama, Website,
 * Fokus audit, Disebut sebagai, Menjual, Siapa, Mereka butuh, Mereka
 * membandingkan, Cara mendapatkan, Area, Bisnis pembanding, Yang membedakan
 * Anda, Info yang sering salah. */
export function reviewFact(page: Page, label: string) {
  return reviewScreen(page)
    .getByRole("term")
    .filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

export async function expectSummary(page: Page) {
  await expect(reviewScreen(page)).toBeVisible();
  await expect(reviewScreen(page)).toHaveAttribute(
    "data-smart-summary",
    "ready",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: REVIEW_HEADING }),
  ).toBeVisible();
}

/** The edit sheet (J26) of one review section. */
export function reviewSheet(page: Page, section: ReviewSection) {
  return page.getByRole("dialog", { name: `Ubah ${section}`, exact: true });
}

/** `Ubah <section>` opens that section's sheet. */
export async function openReviewSheet(
  page: Page,
  section: ReviewSection,
  keyboard = false,
) {
  const button = reviewScreen(page).getByRole("button", {
    name: `Ubah ${section}`,
    exact: true,
  });
  if (keyboard) {
    await button.focus();
    await button.press("Enter");
  } else await button.click();
  const sheet = reviewSheet(page, section);
  await expect(sheet).toBeVisible();
  return sheet;
}

/** `Simpan` applies the sheet's edits to the profile. */
export async function saveReviewSheet(page: Page, section: ReviewSection) {
  const sheet = reviewSheet(page, section);
  await sheet.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(sheet).toHaveCount(0);
}

/** `Batal` drops the sheet's edits. */
export async function cancelReviewSheet(page: Page, section: ReviewSection) {
  const sheet = reviewSheet(page, section);
  await sheet.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(sheet).toHaveCount(0);
}

/** Bisnis sheet: `Ubah nama` opens the brand check for a name correction. */
export async function editBusinessFromReview(page: Page) {
  const sheet = await openReviewSheet(page, "Bisnis");
  await sheet.getByRole("button", { name: "Ubah nama", exact: true }).click();
  await expect(sheet).toHaveCount(0);
}

/** Bisnis sheet: `Ganti website` opens the entry with the website kept. */
export async function editWebsiteFromReview(page: Page) {
  const sheet = await openReviewSheet(page, "Bisnis");
  await sheet
    .getByRole("button", { name: "Ganti website", exact: true })
    .click();
  await expect(sheet).toHaveCount(0);
}

/** Bisnis sheet: `Ganti fokus audit` opens the focus screen; its chain then
 * returns to the review. */
export async function editFocusFromReview(page: Page) {
  const sheet = await openReviewSheet(page, "Bisnis");
  await sheet
    .getByRole("button", { name: "Ganti fokus audit", exact: true })
    .click();
  await expect(sheet).toHaveCount(0);
  await expectFocusScreen(page);
}

/** The Bisnis sheet's `Nama lain baru` field. */
export function aliasInput(page: Page) {
  return reviewSheet(page, "Bisnis").getByRole("textbox", {
    name: "Nama lain baru",
    exact: true,
  });
}

/** Opens the Bisnis sheet and its `Tambah nama lain` field. */
export async function openAliasEditor(page: Page, keyboard = false) {
  const sheet = await openReviewSheet(page, "Bisnis", keyboard);
  const add = sheet.getByRole("button", {
    name: "Tambah nama lain",
    exact: true,
  });
  if (keyboard) {
    await add.focus();
    await add.press("Enter");
  } else await add.click();
  await expect(aliasInput(page)).toBeVisible();
}

/** Types an alias and commits it with the field's `Tambah` button. */
export async function addAlias(page: Page, value: string) {
  const sheet = reviewSheet(page, "Bisnis");
  if (!(await aliasInput(page).isVisible()))
    await sheet
      .getByRole("button", { name: "Tambah nama lain", exact: true })
      .click();
  await aliasInput(page).fill(value);
  await sheet
    .getByRole("group", { name: "Nama lain baru", exact: true })
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
}

/** A committed alias chip in the Bisnis sheet. */
export function aliasChip(page: Page, name: string | RegExp) {
  return reviewSheet(page, "Bisnis")
    .getByRole("group", { name: "Nama lain", exact: true })
    .getByRole("button", { name });
}

/** Removes a committed alias by pressing its selected chip. */
export async function removeAlias(
  page: Page,
  name: string | RegExp,
  keyboard = false,
) {
  const chip = aliasChip(page, name);
  if (keyboard) {
    await chip.focus();
    await chip.press("Enter");
  } else await chip.click();
  await expect(chip).toHaveCount(0);
}

/** The review's confirmation tick (J25). */
export function reviewConfirmation(page: Page) {
  return reviewScreen(page).getByRole("checkbox", {
    name: REVIEW_CONFIRMATION,
    exact: true,
  });
}

/** Spec 018 AC-01: when no place could be pre-filled, picks "Seluruh
 * Indonesia" in the "Kota untuk pencarian" sheet. */
export async function ensureSearchPlace(page: Page) {
  const gap = reviewScreen(page).getByText(
    /Perlu dipastikan:.*Kota untuk pencarian/,
  );
  if (!(await gap.count())) return;
  await page
    .getByRole("button", { name: "Ubah Kota untuk pencarian", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Ubah Kota untuk pencarian" });
  await sheet
    .getByRole("button", { name: "Seluruh Indonesia", exact: true })
    .click();
  await sheet.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(sheet).toHaveCount(0);
}

/** Ticks the confirmation (the button stays disabled until then) and presses
 * `Buat pertanyaan audit`. */
export async function confirmSummary(page: Page) {
  await ensureSearchPlace(page);
  const box = reviewConfirmation(page);
  const create = page.getByRole("button", {
    name: CONFIRM_SUMMARY,
    exact: true,
  });
  if ((await box.getAttribute("aria-checked")) !== "true") {
    await expect(create).toBeDisabled();
    await box.click();
  }
  await expect(box).toBeChecked();
  await expect(create).toBeEnabled();
  await create.click();
}

/** Reads the stored v9 intake session. Spec 016 R-29: the intake progress is
 * kept in the browser's local storage, so it survives a closed tab. */
export async function intakeSession(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
}

/* ───────────────────────── J27/J28: questions ───────────────────────── */

export async function expectQuestionReview(page: Page) {
  await expect(
    page.getByRole("heading", { level: 1, name: QUESTIONS_HEADING }),
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

/** The questions' bottom-bar `Kembali` returns to the review. */
export async function backToReview(page: Page) {
  await pressKembali(page);
  await expectSummary(page);
}

/** J28: `Ubah pertanyaan N` opens the sheet; `Simpan` keeps the wording. */
export async function editQuestion(page: Page, slot: number, wording: string) {
  await page
    .getByRole("button", { name: `Ubah pertanyaan ${slot}`, exact: true })
    .click();
  const sheet = page.getByRole("dialog", {
    name: `Ubah pertanyaan ${slot}`,
    exact: true,
  });
  await expect(sheet).toBeVisible();
  await sheet
    .getByRole("textbox", { name: `Pertanyaan ${slot}`, exact: true })
    .fill(wording);
  await sheet.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(sheet).toHaveCount(0);
}

/** The J27b start sheet. */
export function startSheet(page: Page) {
  return page.getByRole("dialog", { name: START_SHEET, exact: true });
}

/** `Jalankan audit` opens the start sheet; nothing is approved yet. */
export async function openStartSheet(page: Page) {
  await page.getByRole("button", { name: RUN_AUDIT, exact: true }).click();
  await expect(startSheet(page)).toBeVisible();
  return startSheet(page);
}

/** Approving the ten questions saves them on the server (spec 016 R-17): the
 * start sheet's `Mulai audit sekarang` confirms it (J27b). */
export async function startAudit(page: Page) {
  const sheet = await openStartSheet(page);
  await sheet.getByRole("button", { name: START_AUDIT, exact: true }).click();
}

/** Entry → website check → business found → pay → paid reading → focus →
 * details → summary. */
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

/* ───────────────────────── J29/J30: the server audit ───────────────────────── */

/** Screens J29 and J30: the server-side audit's progress and result. */
export function auditStage(page: Page, stage: string) {
  return page.locator(`[data-order-stage="${stage}"]`);
}

export const CLOSE_OK_NOTE =
  "Anda boleh menutup halaman ini. Audit akan tetap berjalan, dan link laporan dikirim ke email Anda.";
export const DELIVERED_HEADING = "Laporan Anda sudah siap";

/** The audit is running on the server and the tab says it may be closed. */
export async function expectAuditRunning(page: Page, timeout = 15_000) {
  await expect(
    page.locator(
      '[data-order-stage="running"], [data-order-stage="reporting"]',
    ),
  ).toBeVisible({ timeout });
  await expect(page.locator('[data-order-note="close-ok"]')).toHaveText(
    CLOSE_OK_NOTE,
  );
}

/** J30: the report is ready and was emailed. The tab never shows the report
 * itself. */
export async function expectAuditDelivered(page: Page, timeout = 45_000) {
  await expect(auditStage(page, "delivered")).toBeVisible({ timeout });
  await expect(
    page.getByRole("heading", { level: 1, name: DELIVERED_HEADING }),
  ).toBeVisible();
  await expect(reportLocator(page)).toHaveCount(0);
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

/** The report's `Unduh PDF` buttons: the top bar's first, the one at the end
 * of the report second (Spec 021). */
export function downloadPdfButtons(page: Page) {
  return page.getByRole("button", { name: "Unduh PDF", exact: true });
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
 * page's order is delivered: ten questions (with the synthetic retries of
 * Spec 018), then the report and its ready email. Spec 018 R-15 lets two
 * orders step in one run, so the order is followed by the id the page holds,
 * not by the first saved report of any order. */
export async function runServerAuditToDelivery(
  page: Page,
  maxRuns = 20,
): Promise<string[]> {
  const stored = await page.evaluate(() =>
    localStorage.getItem("nuave.activeOrder.v1"),
  );
  const orderId = (JSON.parse(stored ?? "{}") as { orderId?: string }).orderId;
  expect(orderId).toMatch(/^[0-9a-f]{32}$/);
  const outcomes: string[] = [];
  for (let run = 0; run < maxRuns; run += 1) {
    const result = await runRunnerOnce(page);
    expect(result.ran).toBe(true);
    outcomes.push(...(result.outcomes ?? []));
    const status = await page.request.post("/api/orders/status", {
      data: { order_id: orderId },
    });
    if (((await status.json()) as { state?: string }).state === "delivered")
      return outcomes;
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
