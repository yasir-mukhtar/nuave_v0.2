import { expect as baseExpect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
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
export const CONFIRM_BRAND = "Lanjut";
export const BRAND_HEADING = "Ini brand yang ingin Anda audit?";
export const READING_HEADING = "Sebentar, Nuave sedang membaca";
export const READING_INTERRUPTED_NOTICE =
  "Pembacaan sumber sebelumnya terputus. Isian Anda tetap tersimpan — tekan Periksa untuk membaca ulang.";
/** Mirrors `SMART_INTAKE_STORAGE_KEY` in `src/lib/intake/smart-intake-contract.ts`. */
export const INTAKE_SESSION_KEY = "nuave.localIntake.v4";
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
 * locations, whole-brand category suggestions, one suggestion per offering).
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
  await expect(page).toHaveURL(/\/audit$/);
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

export async function expectSummary(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Ini yang Nuave pahami." }),
  ).toBeVisible();
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

/** Brand confirm → `Lanjut` (in the frame footer) → the summary. */
export async function confirmBrand(page: Page) {
  await page.getByRole("button", { name: CONFIRM_BRAND, exact: true }).click();
  await expectSummary(page);
}

/** Entry → `Periksa` → reading → brand confirm → summary. */
export async function toSummary(
  page: Page,
  entry: Parameters<typeof fillEntry>[1] = {},
) {
  await fillEntry(page, entry);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await confirmBrand(page);
}

export function categorySection(page: Page) {
  return page.locator('section[aria-label="Kategori dan penawaran utama"]');
}

/**
 * The smallest summary edit that lets the synthetic reading continue: a
 * category, one offering, the on-premise channel, and nationwide reach.
 */
export async function completeSyntheticSummary(page: Page) {
  const category = categorySection(page);
  await category.getByRole("button", { name: "Ubah" }).click();
  await category.getByRole("textbox", { name: "Kategori" }).fill("kedai kopi");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .fill("kopi susu");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .press("Enter");
  await page.getByRole("checkbox", { name: "Di lokasi bisnis Anda" }).click();
  await page.getByRole("button", { name: "Seluruh Indonesia" }).click();
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

/** Entry → summary → completed summary → ten reviewable questions. */
export async function toQuestions(page: Page, suffix = "") {
  await toSummary(page, { suffix });
  await completeSyntheticSummary(page);
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

export async function startAudit(page: Page) {
  await page.getByRole("button", { name: "Mulai audit" }).click();
}

export function auditStage(page: Page, stage: string) {
  return page.locator(`[data-local-audit-stage="${stage}"]`);
}

export async function expectAuditDone(page: Page, timeout = 45_000) {
  await expect(auditStage(page, "done")).toBeVisible({ timeout });
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

/**
 * Fault injection, not a user path: answers the first `/api/audit/report`
 * with the 422 `REPORT_USEFULNESS_FAILURE` that opens answers-only recovery,
 * then lets later report requests through. Synthetic mode never produces
 * this failure on its own.
 */
export async function injectUsefulnessFailureOnce(page: Page) {
  let failed = false;
  await page.route("**/api/audit/report", (route) => {
    if (failed) return route.fallback();
    failed = true;
    return route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Laporan belum memenuhi syarat laporan.",
        code: "REPORT_USEFULNESS_FAILURE",
        telemetry: [],
        diagnostics: ["usefulness_minimum_not_met"],
      }),
    });
  });
}
