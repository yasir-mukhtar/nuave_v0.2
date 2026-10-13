import { expect as baseExpect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addAlias,
  addCompetitor,
  addConsideration,
  addCustomerNeed,
  brandScreen,
  chooseCompetitorMode,
  chooseFocus,
  confirmBrand,
  confirmFocus,
  confirmSummary,
  downloadEvidenceJson,
  editQuestion,
  ENTRY_INVALID_NOTICE,
  expectAuditDelivered,
  expectAuditRunning,
  expectBrandConfirm,
  expectCategoryScreen,
  expectCompetitorsScreen,
  expectCustomerNeedsScreen,
  expectDecisionConsiderationsScreen,
  expectDifferentiatorScreen,
  expectEmptyEntry,
  expectFocusScreen,
  expectLocationScreen,
  expectOfferingsScreen,
  expectPublicFactScreen,
  expectProductScreen,
  expectQuestionReview,
  expectServiceScreen,
  expectTargetCustomerScreen,
  expectTenQuestions,
  expectSummary,
  fillDifferentiator,
  fillEntry,
  fillPublicFact,
  fillTargetCustomer,
  INTAKE_SESSION_KEY,
  competitorsScreen,
  customerNeedsScreen,
  decisionConsiderationsScreen,
  differentiatorScreen,
  locationScreen,
  marketScreen,
  openAliasEditor,
  openAuditFromLanding,
  ORDER_EMAIL,
  ORDER_HEADING,
  orderScreen,
  pressLanjut,
  pressPeriksa,
  readingScreen,
  readyLinkFromMail,
  reportLocator,
  reviewRow,
  RICH_PREPARATION_DRAFT,
  runServerAuditToDelivery,
  savedReport,
  SENSITIVE_INPUT_NOTICE,
  startAudit,
  stubPreparationDraft,
  submitOrder,
  targetCustomerScreen,
  toggleConsideration,
  toggleCustomerNeed,
  throughDetailScreens,
  toQuestions,
  unavailableReport,
} from "../../../../tests/e2e/journey";

const expect = baseExpect.configure({ timeout: 10_000 });

export const FEATURES = [
  "audit-entry",
  "smart-intake-summary",
  "rich-preparation",
  "question-review",
  "audit-run",
  "report-link",
] as const;
export type Feature = (typeof FEATURES)[number];

export type Step = {
  index: number;
  name: string;
  url: string;
  screenshot: string;
  aria: string;
};

export type DriveContext = {
  /** The page the next `step` captures. A recipe may point it at another tab. */
  page: Page;
  dir: string;
  calls: Record<string, number>;
  steps: Step[];
  checks: string[];
  artifacts: Record<string, string>;
  /** Runs one user action, then captures a screenshot and ARIA snapshot. */
  step(name: string, action: () => Promise<void>): Promise<void>;
  /** Records an observed end state that the recipe asserted. */
  check(text: string): void;
  /** A new tab in the same browser session (same saved data), watched like
   * the first. */
  newTab(): Promise<Page>;
  /** A browser the customer has never used: no cookie, no saved data. */
  freshBrowserPage(): Promise<Page>;
};

export type DriveHooks = {
  newTab(): Promise<Page>;
  freshBrowserPage(): Promise<Page>;
};

export function createContext(
  page: Page,
  dir: string,
  calls: Record<string, number>,
  hooks: DriveHooks,
): DriveContext {
  const ctx: DriveContext = {
    page,
    dir,
    calls,
    steps: [],
    checks: [],
    artifacts: {},
    async step(name, action) {
      await action();
      const index = ctx.steps.length + 1;
      const base = `${String(index).padStart(2, "0")}-${name}`;
      const shown = ctx.page;
      await shown.screenshot({
        path: join(dir, `${base}.png`),
        fullPage: true,
      });
      await writeFile(
        join(dir, `${base}.aria.yml`),
        `${await shown.locator("body").ariaSnapshot()}\n`,
      );
      ctx.steps.push({
        index,
        name,
        // The address bar holds the private link secret; evidence never does.
        url: shown.url().replace(/#.*$/, "#<hidden>"),
        screenshot: `${base}.png`,
        aria: `${base}.aria.yml`,
      });
    },
    check(text) {
      ctx.checks.push(text);
    },
    newTab: hooks.newTab,
    freshBrowserPage: hooks.freshBrowserPage,
  };
  return ctx;
}

/** The intake progress is kept in the browser's local storage (spec 016 R-29). */
async function sessionValue(page: Page, key: string) {
  return page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k) ?? "null"),
    key,
  );
}

/** Headless Chromium cannot show the print dialog; count the call instead. */
async function countPrintCalls(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __verifyPrintCalls: number }).__verifyPrintCalls =
      0;
    window.print = () => {
      (window as unknown as { __verifyPrintCalls: number })
        .__verifyPrintCalls++;
    };
  });
  return () =>
    page.evaluate(
      () =>
        (window as unknown as { __verifyPrintCalls: number })
          .__verifyPrintCalls,
    );
}

async function auditEntry(ctx: DriveContext) {
  const { page } = ctx;
  await ctx.step("landing", async () => {
    await page.goto("/");
  });
  await ctx.step("landing-cta-to-brand", async () => {
    await openAuditFromLanding(page);
    await expect(brandScreen(page)).toBeVisible({ timeout: 30_000 });
    await expect(brandScreen(page)).toContainText("example.com");
  });
  expect(ctx.calls).toEqual({ "GET /api/audit/identity": 1 });
  ctx.check(
    "Landing CTA `Cek bisnis saya di AI` looks the website up once and opens /audit on the brand check",
  );
  await ctx.step("direct-audit-empty-entry", async () => {
    // A fresh visitor: no journey saved from the hero step.
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto("/audit");
    await expectEmptyEntry(page);
  });
  ctx.check("/audit opened directly shows an empty entry step");
  await ctx.step("empty-submit-rejected", async () => {
    await pressPeriksa(page);
    await expect(
      page.getByRole("alert").filter({ hasText: ENTRY_INVALID_NOTICE }),
    ).toBeVisible();
  });
  ctx.check(`Periksa with empty fields shows "${ENTRY_INVALID_NOTICE}"`);
  await ctx.step("invalid-url-rejected", async () => {
    await fillEntry(page, { url: "bukan alamat web" });
    await pressPeriksa(page);
    await expect(
      page.getByRole("alert").filter({ hasText: ENTRY_INVALID_NOTICE }),
    ).toBeVisible();
  });
  ctx.check("Periksa with a non-URL source shows the same validation alert");
  await ctx.step("sensitive-url-blocked", async () => {
    await fillEntry(page, {
      url: "https://kedai-fiksi.example/?token=private",
    });
    await expect(
      page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
    ).toBeVisible();
  });
  const saved = JSON.stringify(await sessionValue(page, INTAKE_SESSION_KEY));
  expect(saved).not.toContain("token=private");
  expect(saved).toContain("Kedai Fiksi");
  ctx.check(
    "A token-like URL shows the sensitive-input notice and is not saved",
  );
  expect(ctx.calls).toEqual({ "GET /api/audit/identity": 1 });
  ctx.check(
    "No /api request beyond the hero's one lookup was made during entry and validation",
  );
}

async function smartIntakeSummary(ctx: DriveContext) {
  const { page } = ctx;
  await ctx.step("entry-filled", async () => {
    await fillEntry(page);
  });
  await ctx.step("reading", async () => {
    // A short same-origin delay keeps the reading screen up long enough to
    // verify it; the response itself stays the real synthetic route answer.
    await page.route("**/api/audit/extract", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await pressPeriksa(page);
    await expect(readingScreen(page)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sebentar, Nuave sedang membaca" }),
    ).toBeVisible();
    await expect(
      page.getByText("Mode uji lokal menggunakan pengganti sintetis berlabel."),
    ).toBeVisible();
    await expectBrandConfirm(page);
    await expect(brandScreen(page)).toContainText("kedai-fiksi.example");
    await expect(
      page.getByRole("button", { name: "Kembali", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Lanjut", exact: true }),
    ).toBeVisible();
  });
  ctx.check(
    '`Periksa` shows the labelled reading screen, then the "Ini brand yang ingin Anda audit?" check with name, source and Kembali/Lanjut',
  );
  await ctx.step("brand-confirm-to-focus", async () => {
    await confirmBrand(page);
    // The synthetic reading publishes no locations, so the location scope is
    // a manual-entry link, not a card.
    await expect(page.getByRole("radio", { name: "Satu lokasi" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Isi lokasi secara manual" }),
    ).toBeVisible();
    await expect(page.getByText("Saran Nuave", { exact: true })).toBeVisible();
  });
  ctx.check(
    '`Lanjut` on the brand check reaches "Apa yang ingin Anda audit?" with the labelled whole-brand suggestion',
  );
  await ctx.step("detail-screens", async () => {
    // Whole-brand `Lanjut` lands on the category screen; the synthetic
    // reading found nothing, so each gated screen takes the smallest owner
    // answer before the chain reaches the summary.
    await confirmFocus(page);
    await throughDetailScreens(page);
  });
  ctx.check(
    "Category, offerings, service-channel and market screens each gate Lanjut; the JQ customer screens and J6 optional answers stay optional and competitors default to unknown",
  );
  const optionalSelection = await sessionValue(page, INTAKE_SESSION_KEY);
  expect(optionalSelection.selection).toMatchObject({
    aliases: [],
    targetCustomer: "",
    customerNeeds: [],
    decisionConsiderations: [],
    comparatorMode: "unknown",
    comparatorNames: [],
    differentiator: "",
    publicFact: "",
  });
  ctx.check(
    "Empty optional JQ and J6 answers, empty aliases and the unknown comparator default persist",
  );
  await ctx.step("focus-one-offering", async () => {
    // The focus row is read-back; `Ubah` re-opens the dedicated screens.
    // A product focus turns the offerings screen into read-only catalogue
    // context, so this step runs after the owner-filled first pass.
    await page
      .locator('section[aria-label="Fokus audit"]')
      .getByRole("button", { name: "Ubah" })
      .click();
    await expectFocusScreen(page);
    await chooseFocus(page, "Satu produk atau layanan");
    await pressLanjut(page);
    await expectProductScreen(page);
    // Synthetic reading proposes no offerings, so there is no radio to pick;
    // the owner types the product target instead.
    await page
      .getByRole("textbox", { name: "Nama produk atau layanan" })
      .fill("kopi susu");
    await pressLanjut(page);
    // The changed focus must pass the category checkpoint; its Lanjut then
    // exits the detour straight back to the review.
    await expectCategoryScreen(page);
    await pressLanjut(page);
    await expect(
      page
        .locator('section[aria-label="Fokus audit"]')
        .getByText("Satu produk atau layanan"),
    ).toBeVisible();
  });
  ctx.check(
    "`Ubah` on the read-back focus row re-opens the focus screen; the product target accepts the typed offering and the detour returns to the summary",
  );
  await ctx.step("questions-created", async () => {
    await confirmSummary(page);
    await expectQuestionReview(page);
    await expectTenQuestions(page);
  });
  const intake = await sessionValue(page, INTAKE_SESSION_KEY);
  expect(intake.frozen.context).toMatchObject({
    category: { value: "kedai kopi", origin: "owner" },
    focus: { value: { kind: "produk", name: "kopi susu" } },
    market: { value: { reach: "seluruh" } },
    comparators: { value: { mode: "unknown" }, origin: "nuave" },
  });
  expect(intake.frozen.context).not.toHaveProperty("targetCustomer");
  expect(intake.frozen.context).not.toHaveProperty("customerNeeds");
  expect(intake.frozen.context).not.toHaveProperty("decisionConsiderations");
  expect(intake.frozen.context).not.toHaveProperty("differentiator");
  expect(intake.frozen.context).not.toHaveProperty("publicFact");
  ctx.check(
    "Frozen context keeps unknown competitors and omits empty optional JQ/J6 values alongside the edited category, product focus and nationwide reach",
  );
  expect(ctx.calls).toEqual({
    "GET /api/audit/identity": 1,
    "POST /api/orders": 1,
    "POST /api/audit/extract": 1,
    "POST /api/audit/glm-questions": 1,
  });
  ctx.check(
    "Exactly one identity, one order, one extract and one question request",
  );
}

/**
 * Spec 013 R-29: the labelled rich fictional preparation, served through the
 * stubbed identity/extract routes. This drive proves UI and session handling
 * of the J3 prepared values, the J6 customer context and the JQ retained
 * customer-meaning screens — never live extraction quality. The default
 * synthetic preparation ("no facts extracted") stays the other feature's
 * path and is unchanged.
 */
async function richPreparation(ctx: DriveContext) {
  const { page } = ctx;
  await stubPreparationDraft(page, RICH_PREPARATION_DRAFT);
  await ctx.step("entry-filled", async () => {
    await fillEntry(page);
  });
  await ctx.step("rich-reading-to-location", async () => {
    await pressPeriksa(page);
    await expectBrandConfirm(page);
    await confirmBrand(page);
    // The fixture publishes two locations on the canonical host, so the
    // `Satu lokasi` card is offered.
    await chooseFocus(page, "Satu lokasi");
    await pressLanjut(page);
    await expectLocationScreen(page);
    for (const name of ["Kedai Fiksi Dago", "Kedai Fiksi Cimahi"]) {
      const row = locationScreen(page).getByRole("radio", { name });
      await expect(row).toBeVisible();
      await expect(row).toContainText("Dari website Anda");
    }
    await locationScreen(page)
      .getByRole("radio", { name: "Kedai Fiksi Dago" })
      .click();
    await pressLanjut(page);
    // Category and offerings still appear with prepared picks; a location
    // focus skips market. The JQ customer screens show prepared values with
    // their Nuave label, then take the specified owner edits.
    await expectCategoryScreen(page);
    await pressLanjut(page);
    await expectOfferingsScreen(page);
    await pressLanjut(page);
    await expectTargetCustomerScreen(page);
    await expect(targetCustomerScreen(page)).toContainText("Saran Nuave");
    await expect(
      targetCustomerScreen(page).getByRole("textbox", {
        name: /Pelanggan sasaran/,
      }),
    ).toHaveValue("pekerja kantoran sekitar");
    await fillTargetCustomer(page, "keluarga sekitar");
    await pressLanjut(page);
    await expectCustomerNeedsScreen(page);
    await expect(
      customerNeedsScreen(page).getByRole("button", {
        name: "minuman dekat kantor",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await toggleCustomerNeed(page, "minuman dekat kantor");
    await toggleCustomerNeed(page, "minuman dekat kantor");
    await addCustomerNeed(page, "sarapan sebelum kerja");
    await pressLanjut(page);
    await expectDecisionConsiderationsScreen(page);
    await expect(decisionConsiderationsScreen(page)).toContainText(
      "Saran Nuave",
    );
    await expect(
      decisionConsiderationsScreen(page).getByRole("button", {
        name: "lokasi",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await toggleConsideration(page, "lokasi");
    await addConsideration(page, "jam buka");
    await pressLanjut(page);
    await expectServiceScreen(page);
    await pressLanjut(page);
    await expectCompetitorsScreen(page);
    await expect(competitorsScreen(page)).toContainText("Saran Nuave");
    await expect(
      competitorsScreen(page).getByRole("radio", {
        name: "Bisnis yang saya pilih",
      }),
    ).toBeChecked();
    await chooseCompetitorMode(page, "Bisnis yang saya pilih");
    await addCompetitor(page, "Warung Fiksi");
    await pressLanjut(page);
    await expectDifferentiatorScreen(page);
    await expect(differentiatorScreen(page)).toContainText("Saran Nuave");
    await expect(
      differentiatorScreen(page).getByRole("textbox", {
        name: /Pembeda bisnis/,
      }),
    ).toHaveValue("Racikan kopi rumahan fiktif");
    await fillDifferentiator(page, "Pilihan roti rumahan fiktif");
    await pressLanjut(page);
    await expectPublicFactScreen(page);
    await fillPublicFact(page, "Buka setiap hari sampai pukul 21.00.");
    await pressLanjut(page);
    await expect(marketScreen(page)).toHaveCount(0);
    await expectSummary(page);
  });
  ctx.check(
    "The rich fixture offers published locations labelled `Dari website Anda`, shows the prepared JQ meanings with their Nuave label, accepts the owner JQ and J6 edits and skips market for a location focus",
  );
  const prepared = (
    (await sessionValue(page, INTAKE_SESSION_KEY)) as {
      prepared?: {
        locations?: { proposed: unknown; origin: string };
        categorySuggestions?: { proposed: unknown; origin: string };
        offeringCategorySuggestions?: { proposed: unknown; origin: string };
        targetCustomer?: { proposed: unknown; origin: string };
        decisionConsiderations?: { proposed: unknown; origin: string };
        differentiator?: { proposed: unknown; origin: string };
      };
    } | null
  )?.prepared;
  expect(prepared?.locations).toEqual({
    proposed: [
      {
        name: "Kedai Fiksi Dago",
        address: "Jl. Fiksi Raya No. 10, Bandung",
        sourceUrl: "https://kedai-fiksi.example/lokasi",
      },
      {
        name: "Kedai Fiksi Cimahi",
        address: "Jl. Contoh Fiksi No. 2, Cimahi",
        sourceUrl: "https://kedai-fiksi.example/lokasi",
      },
    ],
    origin: "website",
  });
  ctx.check(
    "Prepared session carries both published locations with origin `website`",
  );
  expect(prepared?.categorySuggestions).toEqual({
    proposed: ["kedai kopi", "kafe", "warung minuman"],
    origin: "nuave",
  });
  expect(prepared?.offeringCategorySuggestions).toEqual({
    proposed: [
      { offering: "kopi susu", category: "minuman kopi siap minum" },
      { offering: "roti", category: "roti dan camilan" },
    ],
    origin: "nuave",
  });
  ctx.check(
    "Whole-brand and per-offering category suggestions carry the `nuave` origin",
  );
  expect(prepared?.targetCustomer).toEqual({
    proposed: "pekerja kantoran sekitar",
    origin: "nuave",
  });
  expect(prepared?.decisionConsiderations).toEqual({
    proposed: ["lokasi"],
    origin: "nuave",
  });
  expect(prepared?.differentiator).toEqual({
    proposed: "Racikan kopi rumahan fiktif",
    origin: "nuave",
  });
  ctx.check(
    "Prepared JQ meanings carry their `nuave` origin in the stored session",
  );
  await ctx.step("summary-after-reload", async () => {
    await page.reload();
    await expectSummary(page);
  });
  const restored = (await sessionValue(page, INTAKE_SESSION_KEY)) as {
    prepared?: unknown;
  } | null;
  expect(restored?.prepared).toEqual(prepared);
  ctx.check("A reload restores the same prepared values — session version 9");
  await ctx.step("alias-edit", async () => {
    const row = reviewRow(page, "Nama lain");
    // The fixture publishes one brand variant; the owner adds a second.
    await expect(row).toContainText("Kedai Fiksi Bandung");
    await expect(row).toContainText("Dari website Anda");
    await openAliasEditor(page);
    await addAlias(page, "Kedai Fiksi Pusat");
    await expect(row).toContainText("Kedai Fiksi Pusat");
    await expect(row).toContainText("Dari Anda");
  });
  ctx.check(
    "`Nama lain` keeps the prepared website alias and accepts one owner alias",
  );
  await ctx.step("questions-created", async () => {
    await confirmSummary(page);
    await expectQuestionReview(page);
    await expectTenQuestions(page);
  });
  const confirmed = (await sessionValue(page, INTAKE_SESSION_KEY)) as {
    frozen?: { context?: Record<string, unknown> };
  } | null;
  expect(confirmed?.frozen?.context).toMatchObject({
    identity: {
      aliases: ["Kedai Fiksi Bandung", "Kedai Fiksi Pusat"],
    },
    focus: { value: { kind: "cabang", name: "Kedai Fiksi Dago" } },
    market: null,
    targetCustomer: { value: "keluarga sekitar", origin: "owner" },
    customerNeeds: {
      value: ["minuman dekat kantor", "sarapan sebelum kerja"],
      origin: "owner",
    },
    decisionConsiderations: { value: ["jam buka"], origin: "owner" },
    differentiator: {
      value: "Pilihan roti rumahan fiktif",
      origin: "owner",
    },
    comparators: {
      value: { mode: "named", names: ["Kedai Tetangga", "Warung Fiksi"] },
      origin: "owner",
    },
    publicFact: {
      value: "Buka setiap hari sampai pukul 21.00.",
      origin: "owner",
    },
  });
  ctx.check(
    "JQ and J6 owner answers and the edited aliases freeze with exact values and origins, and confirmation produces ten questions",
  );
  // A reload asks the server, for free, whether the saved order is still open.
  const paid = Object.fromEntries(
    Object.entries(ctx.calls).filter(
      ([key]) => key !== "POST /api/orders/status",
    ),
  );
  expect(paid).toEqual({
    "GET /api/audit/identity": 1,
    "POST /api/orders": 1,
    "POST /api/audit/extract": 1,
    "POST /api/audit/glm-questions": 1,
  });
  ctx.check(
    "Exactly one identity, one order, one extract and one question request (the free saved-order checks on reload are not counted)",
  );
}

/**
 * Spec 016 AC-20: the whole path, in synthetic mode against the local
 * database. The customer types a website, confirms the business (free lookup),
 * gives an email (order), waits for the paid reading (preparing), answers the
 * intake and approves ten questions. The server runs the audit, so the tab is
 * closed and reopened. The cron is started through the development trigger (it
 * stands in for the one-minute cron). The report opens only from the emailed
 * link, in a browser with no cookies and no saved data.
 */
async function deliverAudit(ctx: DriveContext) {
  const { page } = ctx;
  const startedAt = Date.now() - 1_000;
  await ctx.step("entry-filled", async () => {
    await fillEntry(page);
  });
  await ctx.step("brand-confirm", async () => {
    await pressPeriksa(page);
    await expectBrandConfirm(page);
  });
  expect(ctx.calls).toEqual({ "GET /api/audit/identity": 1 });
  ctx.check(
    "Brand confirm (free lookup only) is reached with no order and no paid request",
  );
  await ctx.step("order-summary", async () => {
    await pressLanjut(page);
    await expect(orderScreen(page)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: ORDER_HEADING }),
    ).toBeVisible();
  });
  expect(ctx.calls).toEqual({ "GET /api/audit/identity": 1 });
  ctx.check(
    "The order summary asks for an email; still no order and no paid request",
  );
  await ctx.step("order-made-preparing", async () => {
    // A short same-origin delay keeps the paid reading screen up long enough
    // to see it; the answer itself stays the real synthetic route answer.
    await page.route("**/api/audit/extract", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });
    await submitOrder(page);
    await expect(readingScreen(page)).toBeVisible();
  });
  await expectFocusScreen(page);
  expect(ctx.calls["POST /api/orders"]).toBe(1);
  expect(ctx.calls["POST /api/audit/extract"]).toBe(1);
  ctx.check(
    "`Lanjut` with an email makes one order, then the paid reading runs once",
  );
  await ctx.step("intake-to-questions", async () => {
    await confirmFocus(page);
    await throughDetailScreens(page);
    await confirmSummary(page);
    await expectQuestionReview(page);
    await expectTenQuestions(page);
  });
  await ctx.step("audit-started", async () => {
    await startAudit(page);
    await expectAuditRunning(page);
  });
  ctx.check(
    'Approving the questions shows "Anda boleh menutup halaman ini. Kami akan mengirim link laporan ke email Anda."',
  );
  expect(ctx.calls["POST /api/orders/approve"]).toBe(1);
  expect(ctx.calls["POST /api/audit/run"]).toBeUndefined();
  expect(ctx.calls["POST /api/audit/report"]).toBeUndefined();
  ctx.check(
    "The retired browser-driven /api/audit/run and /api/audit/report were never called",
  );
  await ctx.step("tab-closed-and-reopened", async () => {
    await page.close();
    ctx.page = await ctx.newTab();
    await ctx.page.goto("/audit");
    await expectAuditRunning(ctx.page);
  });
  ctx.check(
    "After the tab is closed, a new tab in the same browser still shows the running audit",
  );
  await ctx.step("server-finishes-audit", async () => {
    // Stands in for the production cron, one audit step per order per run.
    await runServerAuditToDelivery(ctx.page);
    await ctx.page.reload();
    await expectAuditDelivered(ctx.page);
  });
  ctx.check(
    "The server ran ten questions and the report, then the tab says the report was emailed (and does not show it)",
  );
  const link = await readyLinkFromMail(startedAt);
  ctx.check("The fake mailbox holds a ready email with a private link");
  return link;
}

async function openLinkInFreshBrowser(
  ctx: DriveContext,
  link: { path: string },
) {
  const fresh = await ctx.freshBrowserPage();
  await ctx.step("report-by-link", async () => {
    ctx.page = fresh;
    const response = await fresh.goto(link.path);
    const headers = response?.headers() ?? {};
    expect(headers["x-robots-tag"]).toContain("noindex");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["cache-control"]).toMatch(/no-store|no-cache/);
    await expect(savedReport(fresh)).toBeVisible({ timeout: 60_000 });
    await expect(reportLocator(fresh)).toBeVisible();
  });
  ctx.check(
    "The emailed link opens the report in a browser with no cookies; the page is noindex, not cached and sends no referrer",
  );
  return fresh;
}

async function questionReview(ctx: DriveContext) {
  const { page } = ctx;
  const wording = "Kedai kopi apa yang cocok untuk pekerja di Indonesia?";
  await ctx.step("question-review", async () => {
    await toQuestions(page);
  });
  await ctx.step("question-1-edited", async () => {
    await editQuestion(page, 1, wording);
    await expect(page.locator('[data-question-slot="1"]')).toContainText(
      wording,
    );
  });
  await ctx.step("edit-survives-reload", async () => {
    await page.reload();
    await expectTenQuestions(page);
    await expect(page.locator('[data-question-slot="1"]')).toContainText(
      wording,
    );
  });
  ctx.check("An edited question keeps its wording after a reload");
  const startedAt = Date.now() - 1_000;
  await ctx.step("audit-started", async () => {
    await startAudit(page);
    await expectAuditRunning(page);
  });
  ctx.check(
    "`Mulai audit` approves the questions and shows that the audit runs on the server",
  );
  await runServerAuditToDelivery(page);
  const link = await readyLinkFromMail(startedAt);
  const fresh = await openLinkInFreshBrowser(ctx, link);
  await expect(fresh.locator("#report-question-1")).toHaveText(wording);
  ctx.check("The saved report uses the edited wording for question 1");
}

async function auditRun(ctx: DriveContext) {
  const link = await deliverAudit(ctx);
  const fresh = await openLinkInFreshBrowser(ctx, link);
  const report = reportLocator(fresh);
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  ctx.check("The saved report shows ten answers");
  await expect(
    fresh.getByText("Audit uji — jawaban sintetis", { exact: true }),
  ).toBeVisible();
  ctx.check('The report carries the "Audit uji — jawaban sintetis" notice');
  await ctx.step("report-after-reload", async () => {
    await fresh.reload();
    await expect(savedReport(fresh)).toBeVisible();
  });
  expect(ctx.calls["POST /api/orders"]).toBe(1);
  expect(ctx.calls["POST /api/audit/run"]).toBeUndefined();
  expect(ctx.calls["POST /api/audit/report"]).toBeUndefined();
  ctx.check(
    "One order was made, and the retired audit and report routes were never called",
  );
}

async function reportLink(ctx: DriveContext) {
  const link = await deliverAudit(ctx);
  const fresh = await ctx.freshBrowserPage();
  const printCalls = await countPrintCalls(fresh);
  await ctx.step("report-by-link", async () => {
    ctx.page = fresh;
    const response = await fresh.goto(link.path);
    const headers = response?.headers() ?? {};
    expect(headers["x-robots-tag"]).toContain("noindex");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    await expect(savedReport(fresh)).toBeVisible({ timeout: 60_000 });
    await expect(
      fresh.getByRole("navigation", { name: "Report contents" }),
    ).toBeVisible();
  });
  ctx.check(
    "The emailed link opens the report in a browser with no cookies; the page is noindex and sends no referrer",
  );
  await ctx.step("download-pdf-pressed", async () => {
    await fresh
      .getByRole("button", { name: "Download PDF", exact: true })
      .click();
    expect(await printCalls()).toBe(1);
  });
  ctx.check(
    "`Download PDF` opens the browser print dialog once (window.print)",
  );
  await fresh.emulateMedia({ media: "print" });
  for (const answer of await reportLocator(fresh)
    .locator("[data-answer-body]")
    .all())
    await expect(answer).toBeVisible();
  const pdf = await fresh.pdf({
    path: join(ctx.dir, "report-a4.headless.pdf"),
    format: "A4",
    printBackground: true,
  });
  ctx.artifacts.pdf = "report-a4.headless.pdf";
  ctx.artifacts.pdfLabel = "headless, not native print";
  ctx.artifacts.pdfPages = String(
    (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length,
  );
  await fresh.emulateMedia({ media: "screen" });
  ctx.check("All ten answers are visible in print media; A4 PDF saved");
  const { download, json } = await downloadEvidenceJson(fresh);
  await download.saveAs(join(ctx.dir, "download-evidence.json"));
  ctx.artifacts.json = "download-evidence.json";
  ctx.artifacts.jsonSuggestedName = download.suggestedFilename();
  expect(json.export_version).toBe("nuave-evidence-v5");
  expect(json.observations).toHaveLength(10);
  expect(json.report).toBeTruthy();
  expect(JSON.stringify(json)).not.toContain(ORDER_EMAIL);
  ctx.check(
    "`Unduh bukti JSON` downloads nuave-evidence-v5 with ten observations and a report, and no email",
  );
  // A wrong secret gets the plain not-available page and nothing else.
  const wrong = await ctx.freshBrowserPage();
  await ctx.step("wrong-link-not-available", async () => {
    ctx.page = wrong;
    await wrong.goto(`/r#${"W".repeat(32)}`);
    await expect(unavailableReport(wrong)).toBeVisible({ timeout: 60_000 });
    await expect(wrong.locator("main")).toHaveText(
      "Laporan ini tidak tersedia.",
    );
  });
  ctx.check(
    'A wrong link shows only "Laporan ini tidak tersedia." with no business name or report',
  );
}

export function recipe(feature: Feature) {
  switch (feature) {
    case "audit-entry":
      return auditEntry;
    case "smart-intake-summary":
      return smartIntakeSummary;
    case "rich-preparation":
      return richPreparation;
    case "question-review":
      return questionReview;
    case "audit-run":
      return auditRun;
    case "report-link":
      return reportLink;
  }
}
