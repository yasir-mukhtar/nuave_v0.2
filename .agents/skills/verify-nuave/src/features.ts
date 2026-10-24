import { expect as baseExpect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addAlias,
  addCompetitor,
  addConsideration,
  addCustomerNeed,
  addProduct,
  brandScreen,
  changeBusinessLink,
  competitorRow,
  competitorsScreen,
  confirmBrand,
  confirmFocus,
  confirmSummary,
  considerationsGroup,
  continueToOrder,
  customerChips,
  customerNeedsScreen,
  differentiatorInput,
  differentiatorScreen,
  downloadEvidenceJson,
  downloadPdfButtons,
  editFocusFromReview,
  editQuestion,
  emailInput,
  ENTRY_INVALID_NOTICE,
  expectAuditDelivered,
  expectAuditRunning,
  expectBrandConfirm,
  expectCategoryScreen,
  expectCompetitorsScreen,
  expectCustomerNeedsScreen,
  expectDifferentiatorScreen,
  expectEmptyEntry,
  expectIntroBusiness,
  expectIntroReview,
  expectOfferingsScreen,
  expectOrderSummaryPrice,
  expectQuestionReview,
  expectServiceScreen,
  expectSummary,
  expectTargetCustomerScreen,
  expectTenQuestions,
  FICTIONAL_BUSINESS,
  fillDifferentiator,
  fillEntry,
  fillPublicFact,
  fillTargetCustomer,
  fillWebsite,
  focusCard,
  focusScreen,
  INTAKE_SESSION_KEY,
  locationRow,
  locationScreen,
  LOOKUP_HEADING,
  marketScreen,
  needsGroup,
  openAliasEditor,
  openAuditFromLanding,
  openFocusTarget,
  openStartSheet,
  ORDER_EMAIL,
  paidReadingScreen,
  payOrder,
  pressLanjut,
  pressMulai,
  pressPeriksa,
  READ_HEADING,
  READING_HEADING,
  readingScreen,
  readyLinkFromMail,
  reportLocator,
  reviewFact,
  RICH_PREPARATION_DRAFT,
  runServerAuditToDelivery,
  saveReviewSheet,
  savedReport,
  SENSITIVE_INPUT_NOTICE,
  START_AUDIT,
  stubPreparationDraft,
  SYNTHETIC_LABEL,
  targetCustomerScreen,
  throughDetailScreens,
  toggleConsideration,
  toggleCustomerNeed,
  toQuestions,
  unavailableReport,
  websiteInput,
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

/** The paid-path request counts, without the free saved-order status checks
 * (a reload asks the server whether the saved order is still open). */
function journeyCalls(ctx: { calls: Record<string, number> }) {
  return Object.fromEntries(
    Object.entries(ctx.calls).filter(
      ([key]) => key !== "POST /api/orders/status",
    ),
  );
}

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
  await ctx.step("audit-entry-empty", async () => {
    await page.goto("/audit");
    await expectEmptyEntry(page);
    await expect(
      page.getByText(SYNTHETIC_LABEL, { exact: true }),
    ).toBeVisible();
  });
  ctx.check(
    "`/audit` opens on the empty website step (J01) with its heading focused and the synthetic-mode label",
  );
  await ctx.step("empty-submit-rejected", async () => {
    await pressPeriksa(page);
    await expect(
      page.getByRole("alert").filter({ hasText: ENTRY_INVALID_NOTICE }),
    ).toBeVisible();
  });
  ctx.check(
    `\`Cek bisnis saya di AI\` with the field empty shows "${ENTRY_INVALID_NOTICE}"`,
  );
  await ctx.step("invalid-url-rejected", async () => {
    await fillWebsite(page, "bukan alamat web");
    await pressPeriksa(page);
    await expect(
      page.getByRole("alert").filter({ hasText: ENTRY_INVALID_NOTICE }),
    ).toBeVisible();
  });
  ctx.check("A non-URL website shows the same validation alert");
  await ctx.step("sensitive-url-blocked", async () => {
    await fillWebsite(page, FICTIONAL_BUSINESS.url);
    await fillWebsite(page, "https://kedai-fiksi.example/?token=private");
    await expect(
      page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
    ).toBeVisible();
    await expect(websiteInput(page)).toHaveValue(FICTIONAL_BUSINESS.url);
  });
  const saved = JSON.stringify(await sessionValue(page, INTAKE_SESSION_KEY));
  expect(saved).not.toContain("token=private");
  expect(saved).toContain("kedai-fiksi.example");
  ctx.check(
    "A token-like URL shows the sensitive-input notice; the field and the saved session keep the last safe website",
  );
  expect(ctx.calls).toEqual({});
  ctx.check("No /api request was made during entry and validation");
  await ctx.step("landing", async () => {
    await page.goto("/");
  });
  await ctx.step("landing-cta-to-audit", async () => {
    await openAuditFromLanding(page);
    // J02 → J05: `/audit` checks the handed-over website at once.
    await expectBrandConfirm(page, "Example");
  });
  ctx.check(
    'The landing website form (`Cek bisnis saya di AI`) opens /audit, which checks `example.com` at once and shows "Kami menemukan bisnis Anda" with the name read from the website ("Example")',
  );
  expect(ctx.calls).toEqual({ "GET /api/audit/identity": 1 });
  ctx.check(
    "The landing hand-over made exactly one free `GET /api/audit/identity`, and nothing else",
  );
  await ctx.step("change-business-link", async () => {
    await changeBusinessLink(page);
    await expect(websiteInput(page)).toHaveValue("https://example.com/");
  });
  ctx.check(
    "`Ganti tautan bisnis` returns to the entry with the website kept for correction",
  );
}

async function smartIntakeSummary(ctx: DriveContext) {
  const { page } = ctx;
  await ctx.step("entry-filled", async () => {
    await fillEntry(page);
    await expect(
      page.getByText(SYNTHETIC_LABEL, { exact: true }),
    ).toBeVisible();
  });
  await ctx.step("free-check-to-business-found", async () => {
    // A short same-origin delay keeps the free check (J02) up long enough to
    // verify it; the answer itself stays the real synthetic route answer.
    await page.route("**/api/audit/identity?**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await pressPeriksa(page);
    await expect(readingScreen(page)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: LOOKUP_HEADING }),
    ).toBeVisible();
    await expectBrandConfirm(page);
    await expect(brandScreen(page)).toContainText("kedai-fiksi.example");
    await expect(
      page.getByRole("button", { name: "Kembali", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Ya, ini bisnis saya", exact: true }),
    ).toBeEnabled();
  });
  ctx.check(
    '`Cek bisnis saya di AI` shows the free check "Sebentar, kami cari bisnis Anda", then "Kami menemukan bisnis Anda" with the name read from the website, the source, Kembali and `Ya, ini bisnis saya`',
  );
  await ctx.step("steps-payment-reading-to-focus", async () => {
    await confirmBrand(page);
    // The synthetic reading publishes no branches, so the branch card names
    // none; whole brand is Nuave's labelled proposal.
    await expect(focusCard(page, "Satu cabang")).toBeVisible();
    await expect(focusCard(page, "Satu cabang")).not.toContainText("misalnya");
    await expect(
      focusScreen(page).getByText("Saran Nuave", { exact: true }),
    ).toBeVisible();
  });
  ctx.check(
    '`Ya, ini bisnis saya` → "Tinggal 3 langkah" → checkout → simulated payment; the paid reading starts by itself, and the Step 2 cover\'s `Mulai` opens "Apa yang ingin Anda audit?" with the labelled whole-brand suggestion',
  );
  await ctx.step("detail-screens", async () => {
    // Whole-brand `Lanjut` lands on the category screen; the synthetic
    // reading found nothing, so each gated screen takes the smallest owner
    // answer before the chain reaches the Step 3 cover and the review.
    await confirmFocus(page);
    await throughDetailScreens(page);
  });
  ctx.check(
    "Category, offerings, service and market each gate Lanjut; target customer, needs and considerations (one screen), competitors and the differentiator with its folded public fact stay optional; the Step 3 cover's `Mulai` opens the review",
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
    "Empty optional answers, empty aliases and the unknown comparator default persist",
  );
  await ctx.step("focus-one-offering", async () => {
    // The review's Bisnis sheet re-opens the focus screen; a product focus
    // turns the offerings into read-only context, so this runs after the
    // owner-filled first pass.
    await editFocusFromReview(page);
    await openFocusTarget(page, "Satu produk");
    // The synthetic reading proposes no products: the owner adds the target.
    await addProduct(page, "kopi susu");
    await pressLanjut(page);
    // The changed focus passes the category checkpoint, whose Lanjut then
    // exits the detour straight back to the review.
    await expectCategoryScreen(page);
    await pressLanjut(page);
    await expectSummary(page);
    await expect(reviewFact(page, "Fokus audit")).toHaveText(
      "Satu produk: kopi susu",
    );
  });
  ctx.check(
    "`Ganti fokus audit` in the review's Bisnis sheet re-opens the focus screen; the product list takes an added target (`Tambah produk`) and the detour returns to the review",
  );
  await ctx.step("questions-created", async () => {
    await confirmSummary(page);
    await expectQuestionReview(page);
    await expectTenQuestions(page);
  });
  ctx.check(
    '`Buat pertanyaan audit` stays disabled until the confirmation is ticked, then "10 pertanyaan untuk AI" shows ten questions',
  );
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
    "Frozen context keeps unknown competitors and omits empty optional values alongside the typed category, product focus and nationwide reach",
  );
  expect(journeyCalls(ctx)).toEqual({
    "GET /api/audit/identity": 1,
    "POST /api/orders": 1,
    "POST /api/payments/start": 1,
    "POST /api/audit/extract": 1,
    // Spec 018: the search-data request that the questions are chosen from.
    "POST /api/audit/discovery": 1,
    "POST /api/audit/glm-questions": 1,
  });
  ctx.check(
    "Exactly one identity, one order, one simulated payment, one extract, one discovery and one question request",
  );
}

/**
 * Spec 013 R-29: the labelled rich fictional preparation, served through the
 * stubbed identity/extract routes. This drive proves UI and session handling
 * of the J3 prepared values and the customer screens (J16, J17 with needs and
 * considerations, J20, J22 with the folded public fact) — never live
 * extraction quality. The default synthetic preparation ("no facts
 * extracted") stays the other feature's path and is unchanged.
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
    // The fixture publishes two branches on the canonical host: the branch
    // list names them, stated once as found on the website.
    await openFocusTarget(page, "Satu cabang");
    await expect(locationScreen(page)).toContainText("Ditemukan di website");
    for (const name of ["Kedai Fiksi Dago", "Kedai Fiksi Cimahi"])
      await expect(locationRow(page, new RegExp(`^${name}`))).toBeVisible();
    await locationRow(page, /^Kedai Fiksi Dago/).click();
    await pressLanjut(page);
    // Category and offerings keep their prepared picks; a branch focus
    // skips market. The customer screens show the prepared meanings, then
    // take the owner's edits.
    await expectCategoryScreen(page);
    await pressLanjut(page);
    await expectOfferingsScreen(page);
    await pressLanjut(page);
    await expectTargetCustomerScreen(page);
    const target = targetCustomerScreen(page);
    await expect(target).toContainText("Saran Nuave");
    await expect(
      customerChips(target).getByRole("button", {
        name: "pekerja kantoran sekitar",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await fillTargetCustomer(target, "keluarga sekitar");
    await pressLanjut(page);
    await expectCustomerNeedsScreen(page);
    const needs = customerNeedsScreen(page);
    await expect(
      needsGroup(needs).getByRole("button", {
        name: "minuman dekat kantor",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await toggleCustomerNeed(needs, "minuman dekat kantor");
    await toggleCustomerNeed(needs, "minuman dekat kantor");
    await addCustomerNeed(needs, "sarapan sebelum kerja");
    const lokasi = considerationsGroup(needs).getByRole("button", {
      name: "lokasi",
      exact: true,
    });
    await expect(lokasi).toHaveAttribute("aria-pressed", "true");
    await toggleConsideration(needs, "lokasi");
    await expect(lokasi).toHaveAttribute("aria-pressed", "false");
    await addConsideration(needs, "jam buka");
    await pressLanjut(page);
    await expectServiceScreen(page);
    await pressLanjut(page);
    await expectCompetitorsScreen(page);
    const competitors = competitorsScreen(page);
    const prepared = competitorRow(competitors, "Kedai Tetangga");
    await expect(prepared).toBeChecked();
    await expect(prepared).toHaveAccessibleDescription("Saran Nuave");
    await addCompetitor(competitors, "Warung Fiksi");
    await pressLanjut(page);
    await expectDifferentiatorScreen(page);
    const differentiator = differentiatorScreen(page);
    await expect(
      differentiator.getByText("Saran Nuave", { exact: true }),
    ).toBeVisible();
    await expect(differentiatorInput(differentiator)).toHaveValue(
      "Racikan kopi rumahan fiktif",
    );
    await fillDifferentiator(differentiator, "Pilihan roti rumahan fiktif");
    await fillPublicFact(
      differentiator,
      "Buka setiap hari sampai pukul 21.00.",
    );
    await pressLanjut(page);
    await expect(marketScreen(page)).toHaveCount(0);
    await expectIntroReview(page);
    await pressMulai(page);
    await expectSummary(page);
  });
  ctx.check(
    "The rich fixture offers published branches stated once as `Ditemukan di website`, shows the prepared customer meanings with their Nuave label, accepts the owner's edits on J16, J17 (needs and considerations), J20 and J22 (with the folded public fact), and skips market for a branch focus",
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
    "Prepared customer meanings carry their `nuave` origin in the stored session",
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
    const name = reviewFact(page, "Nama");
    // The fixture publishes one brand variant; the owner adds a second in
    // the review's Bisnis sheet.
    await expect(name).toContainText("Juga disebut: Kedai Fiksi Bandung");
    await openAliasEditor(page);
    await addAlias(page, "Kedai Fiksi Pusat");
    await saveReviewSheet(page, "Bisnis");
    await expect(name).toContainText(
      "Juga disebut: Kedai Fiksi Bandung, Kedai Fiksi Pusat",
    );
  });
  ctx.check(
    "The Bisnis sheet keeps the prepared website alias and saves one owner alias with `Simpan`",
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
    "The owner's customer answers and the edited aliases freeze with exact values and origins, and confirmation produces ten questions",
  );
  expect(journeyCalls(ctx)).toEqual({
    "GET /api/audit/identity": 1,
    "POST /api/orders": 1,
    "POST /api/payments/start": 1,
    "POST /api/audit/extract": 1,
    // Spec 018: the search-data request that the questions are chosen from.
    "POST /api/audit/discovery": 1,
    "POST /api/audit/glm-questions": 1,
  });
  ctx.check(
    "Exactly one identity, one order, one simulated payment, one extract, one discovery and one question request (the free saved-order status checks are not counted)",
  );
}

/**
 * Spec 016 AC-20: the whole path, in synthetic mode against the local
 * database. The customer types a website, confirms the business found by
 * the free check, sees the three steps and checkout, pays with the labelled
 * simulated payment (the paid reading then starts by itself), answers the
 * intake and approves ten questions in the start sheet. The server runs the
 * audit, so the tab is closed and reopened. The cron is started through the
 * development trigger (it stands in for the one-minute cron). The report
 * opens only from the emailed link, in a browser with no cookies and no
 * saved data.
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
    "The business found (free lookup only) is reached with no order and no paid request",
  );
  await ctx.step("order-summary", async () => {
    await continueToOrder(page);
    await expectOrderSummaryPrice(page);
    await expect(emailInput(page)).toBeVisible();
  });
  expect(ctx.calls).toEqual({ "GET /api/audit/identity": 1 });
  ctx.check(
    '"Tinggal 3 langkah" then checkout ("Konfirmasi dan bayar"): AI Visibility Report, Total Rp249.000, "Sekali bayar…", the delivery promise, the email field, and in the bottom bar `Bayar Rp249.000` over the Terms and Privacy consent; still no order and no paid request',
  );
  let orderNumber = "";
  await ctx.step("simulated-payment-paid-reading", async () => {
    // A short same-origin delay keeps the paid reading (J09) up long enough
    // to see it reading; the answer itself stays the real synthetic answer.
    await page.route("**/api/audit/extract", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    orderNumber = await payOrder(page);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: new RegExp(`^(${READING_HEADING}|${READ_HEADING})$`),
      }),
    ).toBeVisible();
    await expect(paidReadingScreen(page)).toContainText(
      "Yang sudah kami temukan",
    );
  });
  ctx.check(
    `The labelled simulated payment (no Midtrans) leads straight to the paid reading, "Pembayaran diterima · ${orderNumber}", with no Lanjut pressed`,
  );
  await ctx.step("reading-done-cover", async () => {
    await expectIntroBusiness(page);
  });
  expect(ctx.calls["POST /api/orders"]).toBe(1);
  expect(ctx.calls["POST /api/payments/start"]).toBe(1);
  expect(ctx.calls["POST /api/audit/extract"]).toBe(1);
  ctx.check(
    'The paid reading ran once by itself, under the same single order, then the Step 2 cover "Ceritakan bisnis Anda" shows',
  );
  await ctx.step("intake-to-questions", async () => {
    await pressMulai(page);
    await confirmFocus(page);
    await throughDetailScreens(page);
    await confirmSummary(page);
    await expectQuestionReview(page);
    await expectTenQuestions(page);
  });
  await ctx.step("start-sheet", async () => {
    await openStartSheet(page);
  });
  expect(ctx.calls["POST /api/orders/approve"]).toBeUndefined();
  ctx.check(
    '`Jalankan audit` opens "Mulai audit sekarang?" and approves nothing by itself',
  );
  await ctx.step("audit-started", async () => {
    await page.getByRole("button", { name: START_AUDIT, exact: true }).click();
    await expectAuditRunning(page);
  });
  ctx.check(
    '`Mulai audit sekarang` shows "Anda boleh menutup halaman ini. Audit akan tetap berjalan, dan link laporan dikirim ke email Anda."',
  );
  expect(ctx.calls["POST /api/orders/approve"]).toBe(1);
  expect(ctx.calls["POST /api/audit/run"]).toBeUndefined();
  expect(ctx.calls["POST /api/audit/report"]).toBeUndefined();
  ctx.check(
    "One approval; the retired browser-driven /api/audit/run and /api/audit/report were never called",
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
    // N-11: no reload. The page's own status poll (every 5 s) shows the
    // delivered state and then clears the saved order (Spec 016 R-31); a
    // reload racing that poll could land on the entry screen.
    await expectAuditDelivered(ctx.page, 30_000);
  });
  ctx.check(
    'The server ran ten questions and the report; the tab says "Laporan Anda sudah siap" (and does not show the report)',
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
  // Spec 018 R-11a: an edit keeps the rules (at least 7 questions about
  // choosing a place), so the edited question stays one.
  const wording = "Rekomendasi kedai kopi yang cocok untuk pekerja kantoran?";
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
  await ctx.step("start-sheet", async () => {
    await openStartSheet(page);
  });
  await ctx.step("audit-started", async () => {
    await page.getByRole("button", { name: START_AUDIT, exact: true }).click();
    await expectAuditRunning(page);
  });
  ctx.check(
    "`Jalankan audit` opens the start sheet; `Mulai audit sekarang` approves the questions and shows that the audit runs on the server",
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
  // Spec 018 (AC-16): ChatGPT and Google AI Overview per question. The
  // synthetic run fails question 7's ChatGPT check every time, shows an empty
  // AI Overview twice for question 3 and none for question 5.
  await expect(
    report.locator('[data-source-answer="chatgpt"] [data-answer-body]'),
  ).toHaveCount(9);
  await expect(report.locator("[data-source-card]")).toHaveCount(2);
  await expect(report.locator("[data-failed-slot]")).toHaveCount(1);
  await expect(
    report.locator('[data-report-answer="7"] [data-failed-slot]'),
  ).toContainText("Tidak dapat diuji");
  await expect(
    report
      .locator('[data-report-answer="7"]')
      .getByRole("link", { name: "Minta bantuan" }),
  ).toHaveAttribute("href", /^mailto:support@nuave\.ai\?subject=/);
  await expect(report.locator("[data-not-shown]")).toHaveCount(2);
  await expect(report.locator("[data-failed-count]")).toContainText(
    "1 pemeriksaan tidak dapat diuji",
  );
  ctx.check(
    "The saved report shows both sources per question: nine ChatGPT answers, question 7's failed check as Tidak dapat diuji with Minta bantuan, and no AI Overview for questions 3 (empty twice) and 5",
  );
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
    // The report has two: in the top bar and under the report.
    await expect(downloadPdfButtons(fresh)).toHaveCount(2);
    await downloadPdfButtons(fresh).first().click();
    expect(await printCalls()).toBe(1);
    await downloadPdfButtons(fresh).last().click();
    expect(await printCalls()).toBe(2);
  });
  ctx.check(
    "Each `Download PDF` (top bar and under the report) opens the browser print dialog once (window.print)",
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
  ctx.check("Every answer is visible in print media; A4 PDF saved");
  const { download, json } = await downloadEvidenceJson(fresh);
  await download.saveAs(join(ctx.dir, "download-evidence.json"));
  ctx.artifacts.json = "download-evidence.json";
  ctx.artifacts.jsonSuggestedName = download.suggestedFilename();
  expect(json.export_version).toBe("nuave-evidence-two-source-v1");
  expect(json.observations).toHaveLength(10);
  expect(json.report).toBeTruthy();
  expect(JSON.stringify(json)).not.toContain(ORDER_EMAIL);
  ctx.check(
    "`Unduh bukti JSON` downloads nuave-evidence-two-source-v1 with ten observations and a report, and no email",
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
