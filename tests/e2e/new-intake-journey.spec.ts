import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  addAlias,
  addArea,
  addBranch,
  addCategory,
  addCompetitor,
  addConsideration,
  addCustomerNeed,
  addProduct,
  addTargetSheet,
  aliasChip,
  aliasInput,
  backToReview,
  BRAND_HEADING,
  cancelReviewSheet,
  categoryChoices,
  categoryScreen,
  chooseFocus,
  chooseReach,
  competitorInput,
  competitorRow,
  competitorsScreen,
  COMPLETE_GAPS,
  CONFIRM_SUMMARY,
  confirmBrand,
  confirmFocus,
  confirmSummary,
  considerationInput,
  considerationsGroup,
  continueToOrder,
  customerChips,
  CUSTOMER_NEEDS_HEADING,
  customerNeedsScreen,
  differentiatorInput,
  DIFFERENTIATOR_HEADING,
  differentiatorScreen,
  editBusinessFromReview,
  editFocusFromReview,
  editWebsiteFromReview,
  emailInput,
  entryScreen,
  expectBrandConfirm,
  expectCategoryScreen,
  expectCompetitorsScreen,
  expectConsiderationTextOnBackground,
  expectCustomerNeedsScreen,
  expectDifferentiatorScreen,
  expectEmptyEntry,
  expectFocusScreen,
  expectIntroBusiness,
  expectIntroReview,
  expectLocationScreen,
  expectMarketScreen,
  expectOfferingsScreen,
  expectOrderScreen,
  expectProductScreen,
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
  FOCUS_HEADING,
  focusScreen,
  INTAKE_SESSION_KEY,
  intakeSession,
  locationRow,
  locationScreen,
  marketScreen,
  needsGroup,
  openAliasEditor,
  openFocusTarget,
  openReviewSheet,
  ORDER_EMAIL,
  payButton,
  pressKembali,
  pressLanjut,
  pressMulai,
  pressPeriksa,
  productRow,
  productScreen,
  publicFactInput,
  publicFactToggle,
  removeAlias,
  renameBusiness,
  reviewConfirmation,
  reviewFact,
  reviewScreen,
  reviewSheet,
  RICH_PREPARATION_DRAFT,
  saveReviewSheet,
  saveTargetSheet,
  SENSITIVE_INPUT_NOTICE,
  serviceScreen,
  serviceTile,
  skipCompetitors,
  stubPreparationDraft,
  TARGET_CUSTOMER_HEADING,
  targetCustomerScreen,
  throughCompetitorContext,
  throughDetailScreens,
  toggleConsideration,
  toggleCustomerNeed,
  toSummary,
  useTestPass,
  websiteInput,
} from "./journey";

const richDraft = RICH_PREPARATION_DRAFT;

async function enter(page: Page, rich = true) {
  if (rich) await stubPreparationDraft(page, richDraft);
  await toSummary(page);
}

/** Entry → business found → paid reading → the focus screen (J11). */
async function toFocus(page: Page, rich = true) {
  if (rich) await stubPreparationDraft(page, richDraft);
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await confirmBrand(page);
}

/** The whole-brand Step 2 chain after the focus screen. */
const BRAND_CHAIN = [
  "category",
  "offerings",
  "target-customer",
  "customer-needs",
  "service",
  "market",
  "competitors",
  "differentiator",
] as const;

/** From the focus screen, `Lanjut` through the prepared screens to `stage`
 * (every rich answer is prepared, so no screen holds the chain back). */
async function lanjutTo(page: Page, stage: (typeof BRAND_CHAIN)[number]) {
  await expectFocusScreen(page);
  for (const next of BRAND_CHAIN) {
    await pressLanjut(page);
    await expect(page.locator(`[data-intake-screen="${next}"]`)).toBeVisible();
    if (next === stage) return;
  }
}

/** The context frozen into each question request, in request order. */
function questionContexts(page: Page) {
  const contexts: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/audit/glm-questions")
      contexts.push(
        (
          request.postDataJSON() as {
            intake: { context: Record<string, unknown> };
          }
        ).intake.context,
      );
  });
  return contexts;
}

/** No horizontal page scroll once the screen has settled (a new screen
 * slides in from the side for a moment). */
async function expectNoOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}

/** Nothing inside `box` reaches past its sides. A sheet is fixed to the
 * screen, so its overflow never widens the page; it is measured here. */
async function expectInside(box: Locator) {
  await expect
    .poll(() =>
      box.evaluate((root) => {
        const edge = root.getBoundingClientRect();
        return [...root.querySelectorAll("*")].every((element) => {
          const rect = element.getBoundingClientRect();
          // Visually hidden helpers are 1px boxes just off their parent.
          if (rect.width <= 1 || rect.height <= 1) return true;
          return rect.left >= edge.left - 0.5 && rect.right <= edge.right + 0.5;
        });
      }),
    )
    .toBe(true);
}

/** Focus is somewhere inside `container`. */
async function expectFocusWithin(container: Locator) {
  await expect
    .poll(() =>
      container.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
}

test("failed extraction keeps the validated identity and the order, and retries under the same order", async ({
  page,
}) => {
  const calls: string[] = [];
  const extractionBodies: Record<string, unknown>[] = [];
  const failedCall = {
    stage: "extract",
    attempt: 1,
    status: "failed",
    started_at: "2026-09-22T00:00:00.000Z",
    completed_at: "2026-09-22T00:00:01.000Z",
    latency_ms: 1000,
    requested_model: "fictional-model",
    returned_model: "fictional-model",
    response_id: "fictional-extract-failure",
    service_tier: "",
    usage: {
      input_tokens: 10,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 10,
    },
    web_search_calls: 0,
    accounted_cost_usd: 0.01,
    cost_basis: "provider_usage",
    pricing_version: "fictional",
    failure_reason: "transient",
  };
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/audit/"))
      calls.push(`${request.method()} ${path}`);
    if (path === "/api/audit/extract" && request.method() === "POST")
      extractionBodies.push(request.postDataJSON() as Record<string, unknown>);
  });
  await page.route("**/api/audit/identity?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        canonical_url: "https://kedai-fiksi.example/",
        display_name: "Kedai Fiksi",
        preparation_mode: "synthetic-local",
      }),
    }),
  );
  let failed = false;
  await page.route("**/api/audit/extract", (route) => {
    if (!failed) {
      failed = true;
      return route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Ekstraksi sementara gagal.",
          telemetry: [failedCall],
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        draft: richDraft,
        telemetry: [],
        preparation_mode: "synthetic-local",
      }),
    });
  });
  const extractCalls = () =>
    calls.filter((call) => call === "POST /api/audit/extract");
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await continueToOrder(page);
  // The payment starts the paid reading by itself; this one fails.
  await emailInput(page).fill(ORDER_EMAIL);
  await payButton(page).click();
  await expect(page.getByText("Ekstraksi sementara gagal.")).toBeVisible();
  await expectOrderScreen(page);
  const saved = await intakeSession(page);
  expect(saved.identity.canonicalUrl).toBe("https://kedai-fiksi.example/");
  expect(saved.preparationCalls).toMatchObject([failedCall]);
  // Spec 016 R-31: the email is never kept in the browser.
  expect(JSON.stringify(saved)).not.toContain(ORDER_EMAIL);
  const orderId = saved.order.id as string;
  // A failed reading waits for the customer's own Lanjut.
  await expect(
    page.getByRole("button", { name: "Lanjut", exact: true }),
  ).toBeEnabled();
  await page.waitForTimeout(1_000);
  expect(extractCalls()).toHaveLength(1);
  await page.reload();
  // The order is still open and paid: the order screen has no email field,
  // a reload never replays the reading, and `Lanjut` reads the website again
  // under the same order.
  await expectOrderScreen(page);
  await expect(emailInput(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lanjut", exact: true }),
  ).toBeEnabled();
  await page.waitForTimeout(1_000);
  expect(extractCalls()).toHaveLength(1);
  await pressLanjut(page);
  await expectIntroBusiness(page);
  await pressMulai(page);
  await expectFocusScreen(page);
  expect(
    calls.filter((call) => call === "GET /api/audit/identity"),
  ).toHaveLength(1);
  expect(extractCalls()).toHaveLength(2);
  // One order; the paid reading carries only its id (no budget, no website).
  expect(extractionBodies).toEqual([
    { order_id: orderId },
    { order_id: orderId },
  ]);
});

test("reload during question generation retains an unknown attempt and never auto-retries", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/audit/glm-questions")
      calls.push(request.method());
  });
  await enter(page);
  await page.route("**/api/audit/glm-questions", () => new Promise(() => {}));
  const started = page.waitForRequest("**/api/audit/glm-questions");
  await confirmSummary(page);
  await started;
  await page.reload();
  // The questions never arrived; asking again is only the owner's choice.
  await expect(
    page.getByRole("heading", { level: 1, name: "Pertanyaan belum diterima" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Coba siapkan pertanyaan", exact: true }),
  ).toBeVisible();
  const saved = await intakeSession(page);
  expect(saved.generationAttempts).toMatchObject([
    { outcome: "interrupted", execution: "unknown", cost_usd: null },
  ]);
  await page.waitForTimeout(1_000);
  expect(calls).toHaveLength(1);
});

test("a sensitive optional edit retains the last safe summary value", async ({
  page,
}) => {
  await enter(page);
  // J26: the differentiator is edited in the review's Pembanding sheet.
  const sheet = await openReviewSheet(page, "Pembanding");
  const differentiator = differentiatorInput(sheet);
  await differentiator.fill("Racikan kopi khas");
  await differentiator.fill("nomor rekening 12345");
  await expect(
    sheet.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
  ).toBeVisible();
  await expect(differentiator).toHaveValue("Racikan kopi khas");
  // Nothing is saved before Simpan, and the sensitive text never is.
  let saved = await intakeSession(page);
  expect(saved.selection.differentiator).toBe("Racikan kopi rumahan fiktif");
  expect(JSON.stringify(saved)).not.toContain("nomor rekening");
  await saveReviewSheet(page, "Pembanding");
  await expect(reviewFact(page, "Yang membedakan Anda")).toHaveText(
    "Racikan kopi khas",
  );
  saved = await intakeSession(page);
  expect(saved.selection.differentiator).toBe("Racikan kopi khas");
  expect(JSON.stringify(saved)).not.toContain("nomor rekening");
});

test("every manually selected comparator stays visible, correctable and removable", async ({
  page,
}) => {
  await enter(page, false);
  // Nothing was found to compare with: the sheet opens on the typing field.
  let sheet = await openReviewSheet(page, "Pembanding");
  await addCompetitor(sheet, "Kedai Baru");
  await addCompetitor(sheet, "Kedai Samping");
  for (const name of ["Kedai Baru", "Kedai Samping"]) {
    await expect(competitorRow(sheet, name)).toBeChecked();
    await expect(competitorRow(sheet, name)).toHaveAccessibleDescription(
      "Dari Anda",
    );
  }
  // A typed duplicate (any case or spacing) is the same business, never a
  // second row.
  await addCompetitor(sheet, " kedai SAMPing ");
  await expect(competitorInput(sheet)).toHaveValue("");
  await expect(sheet.getByRole("checkbox")).toHaveCount(2);
  // A wrong name is corrected by unticking it — it stays on screen, one tap
  // from undo — and adding the right one.
  await competitorRow(sheet, "Kedai Baru").click();
  await expect(competitorRow(sheet, "Kedai Baru")).not.toBeChecked();
  await addCompetitor(sheet, "Kedai Pilihan");
  await expect(competitorRow(sheet, "Kedai Pilihan")).toBeChecked();
  await expect(
    sheet.getByRole("button", { name: "Simpan", exact: true }),
  ).toBeEnabled();
  await saveReviewSheet(page, "Pembanding");
  await expect(reviewFact(page, "Bisnis pembanding")).toHaveText(
    "Kedai Samping, Kedai Pilihan",
  );
  await confirmSummary(page);
  await expectTenQuestions(page);
  const frozen = await intakeSession(page);
  expect(frozen.frozen.context.comparators.value).toEqual({
    mode: "named",
    names: ["Kedai Samping", "Kedai Pilihan"],
  });
  await backToReview(page);
  sheet = await openReviewSheet(page, "Pembanding");
  await expect(competitorRow(sheet, "Kedai Samping")).toBeChecked();
  await expect(competitorRow(sheet, "Kedai Pilihan")).toBeChecked();
  await competitorRow(sheet, "Kedai Pilihan").click();
  await expect(competitorRow(sheet, "Kedai Samping")).toBeChecked();
  await competitorRow(sheet, "Kedai Samping").click();
  await expect(sheet.getByRole("checkbox", { checked: true })).toHaveCount(0);
  // R-18: with every name unticked "named" stays chosen, so Simpan waits for
  // a name or another choice; "Belum tahu" is picked on purpose.
  await expect(
    sheet.getByRole("button", { name: "Simpan", exact: true }),
  ).toBeDisabled();
  await sheet.getByRole("button", { name: "Belum tahu", exact: true }).click();
  await saveReviewSheet(page, "Pembanding");
  expect((await intakeSession(page)).selection).toMatchObject({
    comparatorMode: "unknown",
    comparatorNames: [],
  });
  await expect(reviewFact(page, "Bisnis pembanding")).toHaveText(
    "Belum tahu. Nuave membandingkan dengan bisnis sejenis.",
  );
});

test("rich reading reaches one review and question review without more typing", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/audit/"))
      calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await enter(page);
  await expectSummary(page);
  // The prepared profile reads back in the review's facts.
  await expect(reviewFact(page, "Nama")).toHaveText(
    "Kedai FiksiJuga disebut: Kedai Fiksi Bandung",
  );
  await expect(reviewFact(page, "Website")).toHaveText("kedai-fiksi.example");
  await expect(reviewFact(page, "Fokus audit")).toHaveText("Seluruh brand");
  await expect(reviewFact(page, "Disebut sebagai")).toHaveText("kedai kopi");
  await expect(reviewFact(page, "Menjual")).toHaveText("kopi susu, roti");
  await expect(reviewFact(page, "Cara mendapatkan")).toHaveText(
    "datang ke tempat, dikirim",
  );
  await expect(reviewFact(page, "Area")).toHaveText("Bandung, Cimahi");
  // The review states no source; the prepared answers keep theirs: the alias
  // from the website, the focus as Nuave's proposal.
  expect((await intakeSession(page)).selection.origins).toMatchObject({
    aliases: "website",
    focus: "nuave",
    serviceChannels: "website",
    market: "website",
  });
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(calls).toEqual([
    "GET /api/audit/identity",
    "POST /api/audit/extract",
    "POST /api/audit/glm-questions",
  ]);
  await backToReview(page);
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(
    calls.filter((call) => call === "POST /api/audit/glm-questions"),
  ).toHaveLength(1);
});

test("the labelled rich preparation carries locations and category suggestions into the session and survives a reload", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/audit/"))
      calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await enter(page);
  const prepared = (await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}").prepared,
    INTAKE_SESSION_KEY,
  )) as {
    locations: { proposed: unknown[]; origin: string };
    categorySuggestions: { proposed: unknown[]; origin: string };
    offeringCategorySuggestions: { proposed: unknown[]; origin: string };
  };
  expect(prepared.locations).toEqual({
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
  expect(prepared.categorySuggestions).toEqual({
    proposed: ["kedai kopi", "kafe", "warung minuman"],
    origin: "nuave",
  });
  expect(prepared.offeringCategorySuggestions).toEqual({
    proposed: [
      { offering: "kopi susu", category: "minuman kopi siap minum" },
      { offering: "roti", category: "roti dan camilan" },
    ],
    origin: "nuave",
  });
  await page.reload();
  await expectSummary(page);
  const restored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}").prepared,
    INTAKE_SESSION_KEY,
  );
  expect(restored).toEqual(prepared);
  await confirmSummary(page);
  await expectTenQuestions(page);
  // One extraction, one question call: the added prepared fields spend nothing.
  expect(calls).toEqual([
    "GET /api/audit/identity",
    "POST /api/audit/extract",
    "POST /api/audit/glm-questions",
  ]);
});

test("a session stored under a previous intake version restarts at an empty entry", async ({
  page,
}) => {
  await page.addInitScript((currentKey) => {
    localStorage.setItem(
      "nuave.localIntake.v3",
      JSON.stringify({
        version: 3,
        stage: "summary",
        entry: { name: "Kedai Lama", source: "https://lama.example/" },
        identity: null,
        prepared: { typedName: "Kedai Lama" },
        selection: { name: "Kedai Lama", nameOrigin: "owner" },
        confirmedSelection: null,
        frozen: null,
        pack: null,
        preparationCalls: [],
        preparationMode: null,
        generationAttempts: [],
      }),
    );
    // A v7 record under its own key is never read either — the previous
    // intake version is not opened at all.
    localStorage.setItem(
      "nuave.localIntake.v7",
      JSON.stringify({
        version: 7,
        stage: "summary",
        entry: { name: "Kedai Ketujuh", source: "https://tujuh.example/" },
        identity: null,
        prepared: { typedName: "Kedai Ketujuh" },
        selection: { name: "Kedai Ketujuh", nameOrigin: "owner" },
        confirmedSelection: null,
        frozen: null,
        pack: null,
        preparationCalls: [],
        preparationMode: null,
        generationAttempts: [],
      }),
    );
    // A well-formed v4 record under its own key is never read: the current
    // key is v9, and older keys are simply not looked at.
    localStorage.setItem(
      "nuave.localIntake.v4",
      JSON.stringify({
        version: 4,
        stage: "summary",
        entry: { name: "Kedai Usang", source: "https://usang.example/" },
        identity: null,
        prepared: {
          typedName: "Kedai Usang",
          discoveredName: null,
          canonicalSource: "https://usang.example/",
          aliases: [],
          focus: { proposed: "brand", origin: "nuave" },
          category: { proposed: "kedai", origin: "website" },
          offerings: { proposed: ["kopi"], origin: "website" },
          serviceChannels: { proposed: ["on_premise"], origin: "website" },
          marketReach: { proposed: "sekitar", origin: "website" },
          marketAreas: { proposed: ["Bandung"], origin: "website" },
          locations: { proposed: [], origin: "website" },
          categorySuggestions: { proposed: [], origin: "nuave" },
          offeringCategorySuggestions: { proposed: [], origin: "nuave" },
          targetCustomer: { proposed: null, origin: "nuave" },
          customerNeeds: { proposed: [], origin: "nuave" },
          decisionConsiderations: { proposed: [], origin: "nuave" },
          comparatorSuggestions: { proposed: [], origin: "nuave" },
          differentiator: { proposed: null, origin: "nuave" },
          sourceLinks: [],
        },
        selection: { name: "Kedai Usang", nameOrigin: "owner" },
        confirmedSelection: null,
        frozen: null,
        pack: null,
        preparationCalls: [],
        preparationMode: null,
        generationAttempts: [],
      }),
    );
    // A stale-version record under the current v9 key is just as unreadable —
    // it must restart at entry rather than mix old and new shape.
    localStorage.setItem(
      currentKey,
      JSON.stringify({
        version: 4,
        stage: "summary",
        entry: { name: "Kedai Usang", source: "https://usang.example/" },
        identity: null,
        prepared: { typedName: "Kedai Usang" },
        selection: { name: "Kedai Usang", nameOrigin: "owner" },
        confirmedSelection: null,
        frozen: null,
        pack: null,
        preparationCalls: [],
        preparationMode: null,
        generationAttempts: [],
      }),
    );
  }, INTAKE_SESSION_KEY);
  await stubPreparationDraft(page, richDraft);
  await page.goto("/audit");
  // The pre-bump session is rejected: the entry restores empty, not the stale
  // "Kedai Lama" values.
  await expectEmptyEntry(page);
  for (const stale of ["Kedai Lama", "Kedai Ketujuh", "Kedai Usang"])
    await expect(page.getByText(stale)).toHaveCount(0);
  await fillWebsite(page, "https://kedai-fiksi.example/");
  await pressPeriksa(page);
  await expectBrandConfirm(page);
});

test("a required answer left open routes the summary CTA to its owning screen", async ({
  page,
}) => {
  // The synthetic reading finds nothing, and a branch focus never asks for
  // the market.
  await toFocus(page, false);
  await openFocusTarget(page, "Satu cabang");
  await addBranch(page, "Kedai Fiksi Pusat", "Jl. Fiksi 1, Bandung");
  await pressLanjut(page);
  await throughDetailScreens(page);
  await expect(reviewFact(page, "Area")).toHaveCount(0);
  await expect(reviewConfirmation(page)).toBeVisible();
  // Moving the audit back to the whole brand leaves the market unanswered:
  // the summary then offers the single completion CTA instead of confirming.
  await editFocusFromReview(page);
  await chooseFocus(page, "Seluruh brand");
  await confirmFocus(page);
  await pressLanjut(page);
  await expectSummary(page);
  await expect(
    page.getByText("Perlu dipastikan: Jangkauan pasar.", { exact: true }),
  ).toBeVisible();
  await expect(reviewFact(page, "Area")).toHaveText("Perlu dipastikan");
  await expect(
    page.getByRole("button", { name: CONFIRM_SUMMARY, exact: true }),
  ).toHaveCount(0);
  await expect(reviewConfirmation(page)).toHaveCount(0);
  // The CTA opens the owning screen marked to return: answering it and
  // pressing Lanjut lands straight back on the review.
  await page.getByRole("button", { name: COMPLETE_GAPS, exact: true }).click();
  await expectMarketScreen(page);
  await chooseReach(marketScreen(page), "Seluruh Indonesia");
  await pressLanjut(page);
  await expectSummary(page);
  await expect(reviewFact(page, "Area")).toHaveText("Seluruh Indonesia");
  await confirmSummary(page);
  await expectTenQuestions(page);
});

test("product and location choices freeze only their active meaning", async ({
  page,
}) => {
  const contexts = questionContexts(page);
  // First pass: pick the product focus on its own list.
  await toFocus(page);
  await openFocusTarget(page, "Satu produk");
  await productRow(page, "roti").click();
  await pressLanjut(page);
  // Product focus chains through the detail screens; its offering list is
  // read-only catalogue context and the market screen still applies.
  await throughDetailScreens(page);
  await expect(reviewFact(page, "Fokus audit")).toHaveText("Satu produk: roti");
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts[0]).toMatchObject({
    focus: { value: { kind: "produk", name: "roti" } },
    offerings: { value: ["roti"] },
  });
  // Changing the focus from the review re-opens the focus screen; switching
  // to a branch clears the product target and freezes only the cabang
  // meaning.
  await backToReview(page);
  await editFocusFromReview(page);
  await openFocusTarget(page, "Satu cabang");
  await addBranch(page, "Cabang Timur", "Jl. Contoh 12");
  await pressLanjut(page);
  // The focus change makes the detour pass the category checkpoint, whose
  // Lanjut then exits straight back to the review.
  await expectCategoryScreen(page);
  await pressLanjut(page);
  await expectSummary(page);
  await expect(reviewFact(page, "Fokus audit")).toHaveText(
    "Satu cabang: Cabang TimurJl. Contoh 12",
  );
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts[1]).toMatchObject({
    focus: {
      value: { kind: "cabang", name: "Cabang Timur", address: "Jl. Contoh 12" },
    },
    offerings: { value: ["kopi susu", "roti"] },
    market: null,
  });
});

test("material correction invalidates the old questions; cancel keeps the committed pack", async ({
  page,
}) => {
  const questions: unknown[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/audit/glm-questions")
      questions.push(request.postDataJSON());
  });
  await enter(page);
  await confirmSummary(page);
  await expectTenQuestions(page);
  await backToReview(page);
  // J26: the category is corrected in the Bisnis sheet.
  const editCategory = async () => {
    const sheet = await openReviewSheet(page, "Bisnis");
    await addCategory(sheet, "warung kopi");
    await expect(
      categoryChoices(sheet).getByRole("radio", {
        name: "warung kopi",
        exact: true,
      }),
    ).toBeChecked();
    await saveReviewSheet(page, "Bisnis");
    await expect(reviewFact(page, "Disebut sebagai")).toHaveText("warung kopi");
  };
  await editCategory();
  await page.getByRole("button", { name: "Batalkan perubahan" }).click();
  await expectTenQuestions(page);
  expect(questions).toHaveLength(1);
  await backToReview(page);
  await expect(reviewFact(page, "Disebut sebagai")).toHaveText("kedai kopi");
  await editCategory();
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(questions).toHaveLength(2);
  expect(
    (questions[1] as { intake: { factVersion: number } }).intake.factVersion,
  ).toBe(2);
});

test("a name-only edit reuses the reading; changing the website reads again", async ({
  page,
}) => {
  // A test-pass order: these steps change the website or the business, which a
  // PAID order locks (spec 017 R-19; see payment-screens.spec.ts).
  await useTestPass(page);
  const calls: string[] = [];
  page.on("request", (request) => {
    if (
      ["/api/audit/identity", "/api/audit/extract"].includes(
        new URL(request.url()).pathname,
      )
    )
      calls.push(new URL(request.url()).pathname);
  });
  await enter(page, false);
  expect(calls).toHaveLength(2);
  // `Ubah nama` in the Bisnis sheet opens the business check, whose name
  // sheet corrects the name without a new read.
  await editBusinessFromReview(page);
  await expectBrandConfirm(page);
  await renameBusiness(page, "Kedai Fiksi Baru");
  await expectBrandConfirm(page, "Kedai Fiksi Baru");
  expect(calls).toHaveLength(2);
  // The brand screen's Lanjut returns to the review through the marker.
  await pressLanjut(page);
  await expectSummary(page);
  await expect(reviewFact(page, "Nama")).toHaveText("Kedai Fiksi Baru");
  // Checking the same website again reuses the lookup and the reading.
  await editWebsiteFromReview(page);
  await expect(entryScreen(page)).toBeVisible();
  await expect(websiteInput(page)).toHaveValue(FICTIONAL_BUSINESS.url);
  await pressPeriksa(page);
  await expectBrandConfirm(page, "Kedai Fiksi Baru");
  expect(calls).toHaveLength(2);
  await pressLanjut(page);
  await expectSummary(page);
  // A website change invalidates preparation: the check reads the source again.
  await editWebsiteFromReview(page);
  await expect(entryScreen(page)).toBeVisible();
  await fillWebsite(page, "https://fiksi-lain.example/");
  await pressPeriksa(page);
  await expectBrandConfirm(page, "Fiksi Lain");
  // The new website is looked up for free; the paid reading waits for a new
  // order (spec 016 R-01).
  expect(calls).toHaveLength(3);
  await confirmBrand(page);
  expect(calls).toHaveLength(4);
  await confirmFocus(page);
  await throughDetailScreens(page);
  await expect(page.locator('[data-smart-summary="ready"]')).toBeVisible();
});

test("prepared competitor names are editable; alternatives carry no company names", async ({
  page,
}) => {
  const contexts = questionContexts(page);
  await enter(page);
  await expect(reviewFact(page, "Bisnis pembanding")).toHaveText(
    "Kedai Tetangga",
  );
  const beforeEdit = await intakeSession(page);
  expect(beforeEdit.selection.comparatorMode).toBe("named");
  expect(beforeEdit.selection.comparatorNames).toEqual(["Kedai Tetangga"]);
  let sheet = await openReviewSheet(page, "Pembanding");
  await expect(competitorRow(sheet, "Kedai Tetangga")).toBeChecked();
  await expect(
    competitorRow(sheet, "Kedai Tetangga"),
  ).toHaveAccessibleDescription("Saran Nuave");
  await addCompetitor(sheet, "Warung Fiksi");
  await expect(competitorRow(sheet, "Warung Fiksi")).toBeChecked();
  await saveReviewSheet(page, "Pembanding");
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts[0]).toMatchObject({
    comparators: {
      value: { mode: "named", names: ["Kedai Tetangga", "Warung Fiksi"] },
      origin: "owner",
    },
  });
  await backToReview(page);
  // R-18: unticking every name keeps "named", so Simpan waits for a name or
  // another choice; "Tidak ada pembanding langsung" freezes as itself and
  // names no company.
  sheet = await openReviewSheet(page, "Pembanding");
  await competitorRow(sheet, "Kedai Tetangga").click();
  await competitorRow(sheet, "Warung Fiksi").click();
  await expect(
    sheet.getByRole("button", { name: "Simpan", exact: true }),
  ).toBeDisabled();
  await sheet
    .getByRole("button", { name: "Tidak ada pembanding langsung", exact: true })
    .click();
  await saveReviewSheet(page, "Pembanding");
  await expect(reviewFact(page, "Bisnis pembanding")).toHaveText(
    "Tidak ada pembanding langsung. Nuave membandingkan dengan bisnis sejenis.",
  );
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts[1]).toMatchObject({
    comparators: { value: { mode: "category-alternatives" } },
  });
  expect(
    (contexts[1]!.comparators as { value: Record<string, unknown> }).value,
  ).not.toHaveProperty("names");
});

test("empty optional screens keep no needs or facts and unknown competitors", async ({
  page,
}) => {
  await enter(page, false);
  for (const [label, value] of [
    ["Siapa", "Belum diisi"],
    ["Mereka butuh", "Belum diisi"],
    ["Mereka membandingkan", "Belum diisi"],
    [
      "Bisnis pembanding",
      "Belum tahu. Nuave membandingkan dengan bisnis sejenis.",
    ],
    ["Yang membedakan Anda", "Belum diisi"],
    ["Info yang sering salah", "Tidak ada"],
  ] as const)
    await expect(reviewFact(page, label)).toHaveText(value);
  const saved = await intakeSession(page);
  expect(saved.selection).toMatchObject({
    targetCustomer: "",
    customerNeeds: [],
    decisionConsiderations: [],
    comparatorMode: "unknown",
    comparatorNames: [],
    differentiator: "",
    publicFact: "",
  });
});

test("J6 screens keep prepared provenance, optional edits, and competitor limits", async ({
  page,
}) => {
  await toFocus(page);
  await lanjutTo(page, "customer-needs");
  // J17: the prepared need is ticked; the owner unticks it and adds one.
  const needs = customerNeedsScreen(page);
  const preparedNeed = needsGroup(needs).getByRole("button", {
    name: "minuman dekat kantor",
    exact: true,
  });
  await expect(preparedNeed).toHaveAttribute("aria-pressed", "true");
  expect((await intakeSession(page)).selection.origins.customerNeeds).toBe(
    "nuave",
  );
  await toggleCustomerNeed(needs, "minuman dekat kantor");
  await expect(preparedNeed).toHaveAttribute("aria-pressed", "false");
  await addCustomerNeed(needs, "pesanan untuk rapat pagi");
  await expect(
    needsGroup(needs).getByRole("button", {
      name: "pesanan untuk rapat pagi",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  let saved = await intakeSession(page);
  expect(saved.selection.customerNeeds).toEqual(["pesanan untuk rapat pagi"]);
  expect(saved.selection.origins.customerNeeds).toBe("owner");
  await pressLanjut(page);
  await expectServiceScreen(page);
  await pressLanjut(page);
  await expectMarketScreen(page);
  await pressLanjut(page);

  // J20: the prepared business is ticked and labelled as Nuave's suggestion.
  await expectCompetitorsScreen(page);
  const competitors = competitorsScreen(page);
  const lanjut = page.getByRole("button", { name: "Lanjut", exact: true });
  const prepared = competitorRow(competitors, "Kedai Tetangga");
  await expect(prepared).toBeChecked();
  await expect(prepared).toHaveAccessibleDescription("Saran Nuave");
  // Unticking every name means "not sure"; Lanjut stays open.
  await prepared.click();
  await expect(prepared).not.toBeChecked();
  expect((await intakeSession(page)).selection).toMatchObject({
    comparatorMode: "unknown",
    comparatorNames: [],
  });
  await expect(lanjut).toBeEnabled();
  for (const name of [
    "Pembanding satu",
    "Pembanding dua",
    "Pembanding tiga",
    "Pembanding empat",
    "Pembanding lima",
  ]) {
    await addCompetitor(competitors, name);
  }
  // A sixth is refused, never truncated: the draft stays for a retry.
  await addCompetitor(competitors, "Pembanding enam");
  await expect(competitors.getByRole("alert")).toContainText("paling banyak 5");
  await expect(competitorInput(competitors)).toHaveValue("Pembanding enam");
  saved = await intakeSession(page);
  expect(saved.selection.comparatorNames).toEqual([
    "Pembanding satu",
    "Pembanding dua",
    "Pembanding tiga",
    "Pembanding empat",
    "Pembanding lima",
  ]);
  await competitorRow(competitors, "Pembanding lima").click();
  await expect(competitorInput(competitors)).toHaveValue("Pembanding enam");
  await competitors
    .getByRole("group", { name: "Nama atau website bisnis", exact: true })
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
  await expect(competitorInput(competitors)).toHaveValue("");
  const retried = await intakeSession(page);
  expect(retried.selection.comparatorNames).toEqual([
    "Pembanding satu",
    "Pembanding dua",
    "Pembanding tiga",
    "Pembanding empat",
    "Pembanding enam",
  ]);
  await expect(lanjut).toBeEnabled();
  // "Belum tahu? Lewati…" stores "not sure" with no names and moves on.
  await skipCompetitors(page);
  await expectDifferentiatorScreen(page);
  expect((await intakeSession(page)).selection).toMatchObject({
    comparatorMode: "unknown",
    comparatorNames: [],
  });

  // J22: the often-wrong public fact folds under the differentiator.
  await fillPublicFact(
    differentiatorScreen(page),
    "Buka setiap hari sampai pukul 21.00.",
  );
  await pressLanjut(page);
  await expectIntroReview(page);
  await pressMulai(page);
  await expectSummary(page);
  await expect(reviewFact(page, "Info yang sering salah")).toHaveText(
    "Buka setiap hari sampai pukul 21.00.",
  );
  await expect(reviewFact(page, "Bisnis pembanding")).toHaveText(
    "Belum tahu. Nuave membandingkan dengan bisnis sejenis.",
  );
});

test("JQ customer screens keep prepared provenance, take owner edits, and hold at 320px", async ({
  page,
}, testInfo) => {
  const shots = testInfo.outputPath("jq-320px");
  const contexts = questionContexts(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await toFocus(page);
  await lanjutTo(page, "target-customer");
  // J16: the prepared target customer is ticked and labelled as Nuave's.
  const target = targetCustomerScreen(page);
  await expect(
    customerChips(target).getByRole("button", {
      name: "pekerja kantoran sekitar",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(target).toContainText("Saran Nuave");
  await fillTargetCustomer(target, "keluarga sekitar");
  await expect(
    customerChips(target).getByRole("button", {
      name: "keluarga sekitar",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(target).not.toContainText("Saran Nuave");
  await expectNoOverflow(page);
  await pressLanjut(page);

  // J17: the prepared consideration is ticked; the owner's choice wins.
  await expectCustomerNeedsScreen(page);
  const needs = customerNeedsScreen(page);
  await expect(
    considerationsGroup(needs).getByRole("button", {
      name: "lokasi",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await toggleConsideration(needs, "lokasi");
  await addConsideration(needs, "jam buka");
  // An unbroken 300-character consideration fits the 320px layout and its
  // glyphs stay on the chip's painted background.
  await addConsideration(needs, "x".repeat(300));
  await needs.screenshot({ path: `${shots}/customer-needs-320px.png` });
  await considerationsGroup(needs)
    .getByRole("button", { name: "jam buka", exact: true })
    .screenshot({ path: `${shots}/chip-singleline.png` });
  await considerationsGroup(needs)
    .getByRole("button", { name: "x".repeat(300), exact: true })
    .screenshot({ path: `${shots}/chip-tall-300.png` });
  await expectNoOverflow(page);
  await expectConsiderationTextOnBackground(needs, "x".repeat(300));
  await pressLanjut(page);
  await expectServiceScreen(page);
  await pressLanjut(page);
  await expectMarketScreen(page);
  await pressLanjut(page);
  await expectCompetitorsScreen(page);
  await pressLanjut(page);

  // J22: the prepared differentiator carries Nuave's label until the owner
  // rewrites it.
  await expectDifferentiatorScreen(page);
  const differentiator = differentiatorScreen(page);
  await expect(differentiatorInput(differentiator)).toHaveValue(
    "Racikan kopi rumahan fiktif",
  );
  await expect(
    differentiator.getByText("Saran Nuave", { exact: true }),
  ).toBeVisible();
  await fillDifferentiator(differentiator, "Pilihan roti rumahan fiktif");
  await expect(
    differentiator.getByText("Saran Nuave", { exact: true }),
  ).toHaveCount(0);
  await expectNoOverflow(page);
  await pressLanjut(page);
  await expectIntroReview(page);
  await pressMulai(page);
  await expectSummary(page);
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts[0]).toMatchObject({
    targetCustomer: { value: "keluarga sekitar", origin: "owner" },
    decisionConsiderations: {
      value: ["jam buka", "x".repeat(300)],
      origin: "owner",
    },
    differentiator: {
      value: "Pilihan roti rumahan fiktif",
      origin: "owner",
    },
    customerNeeds: {
      value: ["minuman dekat kantor"],
      origin: "nuave",
    },
  });
});

test("JQ customer screens take keyboard-only edits that survive reload and freeze exactly", async ({
  page,
}, testInfo) => {
  const contexts = questionContexts(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await toFocus(page);
  await lanjutTo(page, "target-customer");
  const shots = testInfo.outputPath("jq-keyboard");
  const kembali = page.getByRole("button", { name: "Kembali", exact: true });
  const lanjut = page.getByRole("button", { name: "Lanjut", exact: true });
  /** Presses Tab (or Shift+Tab) until `target` has focus: keyboard only. */
  const tabTo = async (target: Locator, backwards = false) => {
    for (let step = 0; step < 30; step += 1) {
      if (
        await target.evaluate((element) => element === document.activeElement)
      )
        return;
      await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
    }
    await expect(target).toBeFocused();
  };
  /** Each screen arrives, and returns after a reload, with its heading focused. */
  const expectHeadingFocused = (name: string) =>
    expect(page.getByRole("heading", { level: 1, name })).toBeFocused();
  /** The bottom bar is the end of the tab order: Kembali, then Lanjut. */
  const lanjutByKeyboard = async () => {
    await tabTo(kembali);
    await page.keyboard.press("Tab");
    await expect(lanjut).toBeFocused();
    await page.keyboard.press("Enter");
  };

  // J16: the prepared chip off by Space, a typed customer added by Enter.
  await expectTargetCustomerScreen(page);
  await expectHeadingFocused(TARGET_CUSTOMER_HEADING);
  const target = targetCustomerScreen(page);
  const preparedCustomer = customerChips(target).getByRole("button", {
    name: "pekerja kantoran sekitar",
    exact: true,
  });
  const ownerCustomer = customerChips(target).getByRole("button", {
    name: "keluarga sekitar",
    exact: true,
  });
  await tabTo(preparedCustomer);
  await page.keyboard.press("Space");
  await expect(preparedCustomer).toHaveAttribute("aria-pressed", "false");
  await tabTo(
    target.getByRole("button", { name: "Tambah lainnya", exact: true }),
  );
  await page.keyboard.press("Enter");
  const customerField = target.getByRole("textbox", {
    name: "Pelanggan lain",
    exact: true,
  });
  await expect(customerField).toBeFocused();
  await page.keyboard.type("keluarga sekitar");
  await page.keyboard.press("Enter");
  await expect(customerField).toHaveValue("");
  await expect(ownerCustomer).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expectTargetCustomerScreen(page);
  await expectHeadingFocused(TARGET_CUSTOMER_HEADING);
  await expect(ownerCustomer).toHaveAttribute("aria-pressed", "true");
  await expect(preparedCustomer).toHaveAttribute("aria-pressed", "false");
  await expect(target).not.toContainText("Saran Nuave");
  expect((await intakeSession(page)).selection).toMatchObject({
    targetCustomer: "keluarga sekitar",
    origins: { targetCustomer: "owner" },
  });
  await page.screenshot({
    path: `${shots}/target-customer.png`,
    fullPage: true,
  });
  await lanjutByKeyboard();

  // J17: considerations toggled by Space; a typed one added by Enter, then
  // switched off again — it stays on screen until the screen closes.
  await expectCustomerNeedsScreen(page);
  await expectHeadingFocused(CUSTOMER_NEEDS_HEADING);
  const needs = customerNeedsScreen(page);
  const reasons = considerationsGroup(needs);
  const lokasi = reasons.getByRole("button", { name: "lokasi", exact: true });
  const jamBuka = reasons.getByRole("button", {
    name: "jam buka",
    exact: true,
  });
  const parkir = reasons.getByRole("button", {
    name: "parkir luas",
    exact: true,
  });
  await tabTo(lokasi);
  await page.keyboard.press("Space");
  await expect(lokasi).toHaveAttribute("aria-pressed", "false");
  await tabTo(jamBuka);
  await page.keyboard.press("Space");
  await expect(jamBuka).toHaveAttribute("aria-pressed", "true");
  await tabTo(
    needs.getByRole("button", { name: "Lainnya (pertimbangan)", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(considerationInput(needs)).toBeFocused();
  await page.keyboard.type("parkir luas");
  await page.keyboard.press("Enter");
  await expect(considerationInput(needs)).toHaveValue("");
  await expect(parkir).toHaveAttribute("aria-pressed", "true");
  await tabTo(parkir, true);
  await page.keyboard.press("Space");
  await expect(parkir).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expectCustomerNeedsScreen(page);
  await expectHeadingFocused(CUSTOMER_NEEDS_HEADING);
  await expect(lokasi).toHaveAttribute("aria-pressed", "false");
  await expect(jamBuka).toHaveAttribute("aria-pressed", "true");
  await expect(parkir).toHaveCount(0);
  expect((await intakeSession(page)).selection).toMatchObject({
    decisionConsiderations: ["jam buka"],
    origins: { decisionConsiderations: "owner" },
  });
  await page.screenshot({
    path: `${shots}/customer-needs.png`,
    fullPage: true,
  });
  await lanjutByKeyboard();

  // Service, market and competitors keep their prepared answers.
  await expectServiceScreen(page);
  await pressLanjut(page);
  await expectMarketScreen(page);
  await pressLanjut(page);
  await expectCompetitorsScreen(page);
  await pressLanjut(page);

  // J22: keyboard edit, reload, keyboard return.
  await expectDifferentiatorScreen(page);
  await expectHeadingFocused(DIFFERENTIATOR_HEADING);
  const differentiator = differentiatorScreen(page);
  await tabTo(differentiatorInput(differentiator));
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Pilihan roti rumahan fiktif");
  await page.reload();
  await expectDifferentiatorScreen(page);
  await expectHeadingFocused(DIFFERENTIATOR_HEADING);
  await expect(differentiatorInput(differentiator)).toHaveValue(
    "Pilihan roti rumahan fiktif",
  );
  await expect(
    differentiator.getByText("Saran Nuave", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `${shots}/differentiator.png`,
    fullPage: true,
  });
  await lanjutByKeyboard();
  await expectIntroReview(page);
  await pressMulai(page);
  await expectSummary(page);

  // One confirmation, one question request, exact frozen meanings.
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts).toHaveLength(1);
  expect(contexts[0]).toMatchObject({
    targetCustomer: { value: "keluarga sekitar", origin: "owner" },
    decisionConsiderations: { value: ["jam buka"], origin: "owner" },
    differentiator: {
      value: "Pilihan roti rumahan fiktif",
      origin: "owner",
    },
  });
});

test("review edits return to the summary: sheets by Simpan, Batal and Escape, the focus detour by Lanjut, Kembali and browser Back", async ({
  page,
}) => {
  await enter(page);
  await page.setViewportSize({ width: 320, height: 720 });
  const before = (await intakeSession(page)).selection;
  for (const section of ["Bisnis", "Calon pelanggan", "Pembanding"] as const) {
    for (const exit of ["simpan", "batal", "escape"] as const) {
      const trigger = reviewScreen(page).getByRole("button", {
        name: `Ubah ${section}`,
        exact: true,
      });
      const sheet = await openReviewSheet(page, section);
      // Focus moves into the sheet, and Tab keeps it there.
      await expectFocusWithin(sheet);
      await page.keyboard.press("Tab");
      await expectFocusWithin(sheet);
      await expectNoOverflow(page);
      await expectInside(sheet);
      if (exit === "simpan") await saveReviewSheet(page, section);
      else if (exit === "batal") await cancelReviewSheet(page, section);
      else {
        await page.keyboard.press("Escape");
        await expect(sheet).toHaveCount(0);
      }
      await expectSummary(page);
      await expect(trigger).toBeFocused();
    }
  }
  expect((await intakeSession(page)).selection).toEqual(before);
  // Batal drops an edit made in a sheet; Simpan applies it.
  let sheet = await openReviewSheet(page, "Calon pelanggan");
  await serviceTile(sheet, "Online").click();
  await expect(serviceTile(sheet, "Online")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await cancelReviewSheet(page, "Calon pelanggan");
  await expect(reviewFact(page, "Cara mendapatkan")).toHaveText(
    "datang ke tempat, dikirim",
  );
  expect((await intakeSession(page)).selection).toEqual(before);
  sheet = await openReviewSheet(page, "Calon pelanggan");
  await serviceTile(sheet, "Online").click();
  await saveReviewSheet(page, "Calon pelanggan");
  await expect(reviewFact(page, "Cara mendapatkan")).toHaveText(
    "datang ke tempat, dikirim, online",
  );
  expect((await intakeSession(page)).selection.serviceChannels).toEqual([
    "on_premise",
    "delivery",
    "online",
  ]);
  // The focus detour keeps its three ways back to the review.
  for (const back of ["continue", "footer", "browser"] as const) {
    await editFocusFromReview(page);
    await expect(
      page.getByRole("heading", { level: 1, name: FOCUS_HEADING }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.tagName ?? ""))
      .not.toBe("H1");
    await expectNoOverflow(page);
    if (back === "continue") await pressLanjut(page);
    else if (back === "footer") await pressKembali(page);
    else await page.goBack();
    await expectSummary(page);
    await expect(reviewFact(page, "Fokus audit")).toHaveText("Seluruh brand");
  }
});

test("each J6 screen restores its value after a reload", async ({ page }) => {
  /** Reloads with the saved stage rewritten, as progress saved on a screen
   * the v2 journey folded into a neighbour would be. */
  const reloadAtStage = async (stage: string) => {
    await page.evaluate(
      ([key, value]) => {
        const saved = JSON.parse(localStorage.getItem(key)!);
        saved.stage = value;
        localStorage.setItem(key, JSON.stringify(saved));
      },
      [INTAKE_SESSION_KEY, stage] as const,
    );
    await page.reload();
  };
  await toFocus(page);
  await lanjutTo(page, "customer-needs");
  await addCustomerNeed(customerNeedsScreen(page), "pilihan sarapan ringan");
  const need = needsGroup(customerNeedsScreen(page)).getByRole("button", {
    name: "pilihan sarapan ringan",
    exact: true,
  });
  await page.reload();
  await expectCustomerNeedsScreen(page);
  await expect(need).toHaveAttribute("aria-pressed", "true");
  // Progress saved on the former considerations screen reopens here.
  await reloadAtStage("decision-considerations");
  await expectCustomerNeedsScreen(page);
  await expect(need).toHaveAttribute("aria-pressed", "true");
  await pressLanjut(page);
  await expectServiceScreen(page);
  await pressLanjut(page);
  await expectMarketScreen(page);
  await pressLanjut(page);

  await expectCompetitorsScreen(page);
  await addCompetitor(competitorsScreen(page), "Kedai Samping");
  await page.reload();
  await expectCompetitorsScreen(page);
  await expect(
    competitorRow(competitorsScreen(page), "Kedai Tetangga"),
  ).toBeChecked();
  await expect(
    competitorRow(competitorsScreen(page), "Kedai Samping"),
  ).toBeChecked();
  await pressLanjut(page);

  await expectDifferentiatorScreen(page);
  await fillPublicFact(
    differentiatorScreen(page),
    "Menyediakan area duduk di lantai dua.",
  );
  await page.reload();
  await expectDifferentiatorScreen(page);
  // A saved fact opens its fold by itself.
  await expect(publicFactToggle(page)).toHaveAttribute("aria-expanded", "true");
  await expect(publicFactInput(page)).toHaveValue(
    "Menyediakan area duduk di lantai dua.",
  );
  // Progress saved on the former public-fact screen reopens here.
  await reloadAtStage("public-fact");
  await expectDifferentiatorScreen(page);
  await expect(publicFactInput(page)).toHaveValue(
    "Menyediakan area duduk di lantai dua.",
  );
  await pressLanjut(page);
  await expectIntroReview(page);
  await pressMulai(page);
  await expectSummary(page);
});

test("unsafe public facts retain the safe value and frozen R20 context", async ({
  page,
}) => {
  const contexts = questionContexts(page);
  await toFocus(page);
  await lanjutTo(page, "differentiator");
  await fillPublicFact(
    differentiatorScreen(page),
    "Buka setiap hari sampai pukul 21.00.",
  );
  await publicFactInput(page).fill("nomor rekening 12345");
  await expect(
    page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
  ).toBeVisible();
  await expect(publicFactInput(page)).toHaveValue(
    "Buka setiap hari sampai pukul 21.00.",
  );
  const saved = await intakeSession(page);
  expect(saved.selection.publicFact).toBe(
    "Buka setiap hari sampai pukul 21.00.",
  );
  expect(JSON.stringify(saved)).not.toContain("nomor rekening");
  await pressLanjut(page);
  await expectIntroReview(page);
  await pressMulai(page);
  await expectSummary(page);
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts[0]).toMatchObject({
    targetCustomer: { value: "pekerja kantoran sekitar", origin: "nuave" },
    customerNeeds: {
      value: ["minuman dekat kantor"],
      origin: "nuave",
    },
    decisionConsiderations: { value: ["lokasi"], origin: "nuave" },
    differentiator: {
      value: "Racikan kopi rumahan fiktif",
      origin: "nuave",
    },
    comparators: {
      value: { mode: "named", names: ["Kedai Tetangga"] },
    },
    publicFact: {
      value: "Buka setiap hari sampai pukul 21.00.",
      origin: "owner",
    },
  });
});

test.describe("J4 focus and target screens", () => {
  test("the focus screen offers the three scopes with honest labels and a keyboard-driven pick", async ({
    page,
  }) => {
    // A test-pass order: these steps change the website or the business, which a
    // PAID order locks (spec 017 R-19; see payment-screens.spec.ts).
    await useTestPass(page);
    const calls: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/api/")) calls.push(`${request.method()} ${path}`);
    });
    await toFocus(page);
    const wholeBrand = focusCard(page, "Seluruh brand");
    await expect(wholeBrand).toBeChecked();
    await expect(focusCard(page, "Satu cabang")).toBeVisible();
    await expect(focusCard(page, "Satu produk")).toBeVisible();
    // The published branches give the branch card its example.
    await expect(focusCard(page, "Satu cabang")).toContainText(
      "misalnya Kedai Fiksi Dago",
    );
    await expect(
      focusScreen(page).getByText("Saran Nuave", { exact: true }),
    ).toBeVisible();
    // Radio-group keyboard support: ArrowDown moves the checked choice and
    // stays on the screen.
    await wholeBrand.focus();
    await page.keyboard.press("ArrowDown");
    await expect(focusCard(page, "Satu cabang")).toBeChecked();
    await expectFocusScreen(page);
    // Kembali returns to the Step 2 cover, and from there to the business
    // check with its answer intact.
    await pressKembali(page);
    await expectIntroBusiness(page);
    await pressKembali(page);
    await expectBrandConfirm(page);
    await confirmBrand(page);
    // Screen navigation spends no extra preparation calls.
    expect(calls).toEqual([
      "GET /api/audit/identity",
      "POST /api/orders",
      "POST /api/audit/extract",
    ]);
    // Whole-brand continues through the detail screens to the summary.
    await chooseFocus(page, "Seluruh brand");
    await pressLanjut(page);
    await throughDetailScreens(page);
  });

  test("a tap on Satu cabang or Satu produk opens its list at once (J11 to J12)", async ({
    page,
  }) => {
    await toFocus(page);
    await chooseFocus(page, "Satu cabang");
    await expectLocationScreen(page);
    await pressKembali(page);
    await expectFocusScreen(page);
    await chooseFocus(page, "Satu produk");
    await expectProductScreen(page);
    // The chosen card above the list changes the focus again.
    await productScreen(page)
      .getByRole("button", { name: "Satu produk. Ganti fokus audit" })
      .click();
    await expectFocusScreen(page);
  });

  test("one location picks a published row labelled as found on the website", async ({
    page,
  }) => {
    const contexts = questionContexts(page);
    await toFocus(page);
    await openFocusTarget(page, "Satu cabang");
    // The business publishes both branches; the list says once where they
    // came from.
    await expect(locationScreen(page)).toContainText("Ditemukan di website");
    const published = locationRow(page, /^Kedai Fiksi Cimahi/);
    await expect(published).toContainText("Jl. Contoh Fiksi No. 2, Cimahi");
    await published.click();
    await expect(published).toBeChecked();
    await pressLanjut(page);
    await throughDetailScreens(page);
    await expect(reviewFact(page, "Fokus audit")).toHaveText(
      "Satu cabang: Kedai Fiksi CimahiJl. Contoh Fiksi No. 2, Cimahi",
    );
    await confirmSummary(page);
    await expectTenQuestions(page);
    expect(contexts[0]).toMatchObject({
      focus: {
        value: {
          kind: "cabang",
          name: "Kedai Fiksi Cimahi",
          address: "Jl. Contoh Fiksi No. 2, Cimahi",
        },
      },
      market: null,
    });
  });

  test("the location screen blocks Lanjut until name and address are filled, and a reload restores both", async ({
    page,
  }) => {
    await toFocus(page);
    await openFocusTarget(page, "Satu cabang");
    const lanjut = page.getByRole("button", { name: "Lanjut", exact: true });
    await expect(lanjut).toBeDisabled();
    await locationScreen(page)
      .getByRole("button", { name: "Tambah cabang", exact: true })
      .click();
    // J12b: the sheet saves only a branch with both a name and an address.
    const sheet = addTargetSheet(page, "cabang");
    await expect(sheet).toBeVisible();
    const save = sheet.getByRole("button", { name: "Simpan", exact: true });
    await sheet
      .getByRole("textbox", { name: "Nama cabang" })
      .fill("Cabang Baru");
    await expect(save.first()).toBeDisabled();
    await sheet
      .getByRole("textbox", { name: "Alamat cabang" })
      .fill("Jl. Fiksi 40");
    await expect(save.first()).toBeEnabled();
    await saveTargetSheet(sheet);
    const added = locationRow(page, /^Cabang Baru/);
    await expect(added).toBeChecked();
    await expect(added).toContainText("Jl. Fiksi 40");
    await expect(added).toContainText("Dari Anda");
    await expect(lanjut).toBeEnabled();
    await page.reload();
    await expectLocationScreen(page);
    await expect(locationRow(page, /^Cabang Baru/)).toBeChecked();
    await expect(locationRow(page, /^Cabang Baru/)).toContainText(
      "Jl. Fiksi 40",
    );
    await pressLanjut(page);
    await throughDetailScreens(page);
  });

  test("a product target typed by hand carries Dari Anda and survives a reload", async ({
    page,
  }) => {
    await toFocus(page);
    await openFocusTarget(page, "Satu produk");
    await expect(productRow(page, /^kopi susu$/)).toBeVisible();
    await expect(productScreen(page)).toContainText("Ditemukan di website");
    await addProduct(page, "paket rapat");
    const typed = productRow(page, /^paket rapat/);
    await expect(typed).toBeChecked();
    await expect(typed).toContainText("Dari Anda");
    await page.reload();
    await expectProductScreen(page);
    await expect(productRow(page, /^paket rapat/)).toBeChecked();
    await expect(productRow(page, /^paket rapat/)).toContainText("Dari Anda");
    await pressLanjut(page);
    await throughDetailScreens(page);
    await expect(reviewFact(page, "Fokus audit")).toHaveText(
      "Satu produk: paket rapat",
    );
  });

  test("manual typing survives a transient match with a published row", async ({
    page,
  }) => {
    await toFocus(page);
    await openFocusTarget(page, "Satu cabang");
    await locationScreen(page)
      .getByRole("button", { name: "Tambah cabang", exact: true })
      .click();
    const branchSheet = addTargetSheet(page, "cabang");
    const name = branchSheet.getByRole("textbox", { name: "Nama cabang" });
    const address = branchSheet.getByRole("textbox", { name: "Alamat cabang" });
    await name.pressSequentially("Kedai Fiksi Dago");
    // Mid-typing the pair equals the published row at
    // "Jl. Fiksi Raya No. 10, Bandung" — the name must survive the match.
    await address.pressSequentially("Jl. Fiksi Raya No. 10, Bandung Wetan");
    await expect(name).toHaveValue("Kedai Fiksi Dago");
    await expect(address).toHaveValue("Jl. Fiksi Raya No. 10, Bandung Wetan");
    await saveTargetSheet(branchSheet);
    const typedBranch = locationRow(page, /Bandung Wetan/);
    await expect(typedBranch).toBeChecked();
    await expect(typedBranch).toContainText("Dari Anda");
    await expect(
      locationRow(page, /^Kedai Fiksi Dago Jl\. Fiksi Raya No\. 10, Bandung$/),
    ).not.toBeChecked();

    await pressKembali(page);
    await expectFocusScreen(page);
    await openFocusTarget(page, "Satu produk");
    await productScreen(page)
      .getByRole("button", { name: "Tambah produk", exact: true })
      .click();
    const productSheet = addTargetSheet(page, "produk");
    const product = productSheet.getByRole("textbox", {
      name: "Nama produk atau layanan",
    });
    // "kopi susu" is a published offering — typing through it must keep
    // the draft instead of collapsing to the suffix after the match.
    await product.pressSequentially("kopi susu premium");
    await expect(product).toHaveValue("kopi susu premium");
    await saveTargetSheet(productSheet);
    const typedProduct = productRow(page, /^kopi susu premium/);
    await expect(typedProduct).toBeChecked();
    await expect(typedProduct).toContainText("Dari Anda");
    await expect(productRow(page, /^kopi susu$/)).not.toBeChecked();
  });

  test("locations whose source page lives off the business host are never offered", async ({
    page,
  }) => {
    // Every published location points at a foreign host (M2): no published
    // row, and only the owner's own branch leads on.
    await stubPreparationDraft(page, {
      ...richDraft,
      published_locations: [
        {
          name: "Kedai Fiksi Dago",
          address: "Jl. Fiksi Raya No. 10, Bandung",
          source_url: "https://aggregator.example/listing/kedai-fiksi",
        },
        {
          name: "Kedai Fiksi Cimahi",
          address: "Jl. Contoh Fiksi No. 2, Cimahi",
          source_url: "https://kedai-fiksi.example.evil.example/lokasi",
        },
      ],
    });
    await toFocus(page, false);
    await expect(focusCard(page, "Satu cabang")).not.toContainText(
      "Kedai Fiksi",
    );
    await openFocusTarget(page, "Satu cabang");
    await expect(locationScreen(page).getByRole("radio")).toHaveCount(0);
    await expect(locationScreen(page)).toContainText(
      "Kami belum menemukan cabang di website Anda.",
    );
    await expect(locationScreen(page)).not.toContainText(
      "Ditemukan di website",
    );
    await addBranch(page, "Satu-satunya gerai", "Jl. Fiksi 1, Bandung");
    await pressLanjut(page);
    await throughDetailScreens(page);
  });

  test("Ganti fokus audit on the summary re-opens the focus screen and Kembali returns to the summary", async ({
    page,
  }) => {
    await enter(page);
    await editFocusFromReview(page);
    await pressKembali(page);
    await expectSummary(page);
    // The review still reports the unchanged whole-brand focus.
    await expect(reviewFact(page, "Fokus audit")).toHaveText("Seluruh brand");
  });

  test("the focus and location screens hold within a 320px viewport", async ({
    page,
  }) => {
    await stubPreparationDraft(page, richDraft);
    await page.setViewportSize({ width: 320, height: 720 });
    await toFocus(page, false);
    await expectNoOverflow(page);
    await openFocusTarget(page, "Satu cabang");
    await expectNoOverflow(page);
    await locationScreen(page)
      .getByRole("button", { name: "Tambah cabang", exact: true })
      .click();
    await expect(addTargetSheet(page, "cabang")).toBeVisible();
    await expectNoOverflow(page);
    await expectInside(addTargetSheet(page, "cabang"));
  });
});

test.describe("J5 business-detail screens", () => {
  test("the category screen says where its pick came from and keeps a typed pick", async ({
    page,
  }) => {
    await toFocus(page);
    await confirmFocus(page);
    const choices = categoryChoices(categoryScreen(page));
    // The website's category is picked and its source stated once; Nuave's
    // other suggestions are one tap away.
    const kedaiKopi = choices.getByRole("radio", {
      name: "kedai kopi",
      exact: true,
    });
    await expect(kedaiKopi).toBeChecked();
    await expect(categoryScreen(page)).toContainText("Ditemukan di website");
    await expect(
      choices.getByRole("radio", { name: "kafe", exact: true }),
    ).toBeVisible();
    await expect(
      choices.getByRole("radio", { name: "warung minuman", exact: true }),
    ).toBeVisible();
    // Typing over the prepared pick replaces it with the owner's own word.
    await addCategory(categoryScreen(page), "rumah makan keluarga");
    const own = choices.getByRole("radio", {
      name: "rumah makan keluarga",
      exact: true,
    });
    await expect(own).toBeChecked();
    await expect(kedaiKopi).not.toBeChecked();
    await expect(categoryScreen(page)).toContainText("Dari Anda");
    expect((await intakeSession(page)).selection).toMatchObject({
      category: "rumah makan keluarga",
      origins: { category: "owner" },
    });
    await pressLanjut(page);
    await expectOfferingsScreen(page);
  });

  test("the market screen refuses a ninth area instead of truncating", async ({
    page,
  }) => {
    await stubPreparationDraft(page, {
      ...richDraft,
      market_reach: "beberapa",
      market_areas: [
        "Bandung",
        "Cimahi",
        "Bekasi",
        "Depok",
        "Bogor",
        "Solo",
        "Medan",
        "Makassar",
      ],
    });
    await toFocus(page, false);
    // Prepared values keep every detail screen's Lanjut enabled.
    await lanjutTo(page, "market");
    // All eight prepared areas sit selected; typing a ninth is refused with
    // a visible block while Lanjut stays enabled for the valid set.
    const market = marketScreen(page);
    await expect(
      market
        .getByRole("group", { name: "Area mana saja?", exact: true })
        .getByRole("button", { pressed: true }),
    ).toHaveCount(8);
    await addArea(market, "Denpasar");
    await expect(
      market.getByRole("textbox", { name: "Kota atau area" }),
    ).toHaveValue("Denpasar");
    await expect(market.getByRole("alert")).toContainText(
      "dibatasi paling banyak 8",
    );
    await expect(
      page.getByRole("button", { name: "Lanjut", exact: true }),
    ).toBeEnabled();
    await pressLanjut(page);
    await throughCompetitorContext(page);
    await expect(reviewFact(page, "Area")).toContainText("Makassar");
    await expect(reviewFact(page, "Area")).not.toContainText("Denpasar");
    expect((await intakeSession(page)).selection.marketAreas).toHaveLength(8);
  });

  test("the service screen keeps multiple channels and the detail screens hold at 320px", async ({
    page,
  }) => {
    await stubPreparationDraft(page, richDraft);
    await page.setViewportSize({ width: 320, height: 720 });
    await toFocus(page, false);
    await expectNoOverflow(page);
    for (const next of [
      "category",
      "offerings",
      "target-customer",
      "customer-needs",
      "service",
    ] as const) {
      await pressLanjut(page);
      await expect(
        page.locator(`[data-intake-screen="${next}"]`),
      ).toBeVisible();
      await expectNoOverflow(page);
    }
    // A third channel stacks on the two prepared picks.
    const service = serviceScreen(page);
    await serviceTile(service, "Online").click();
    for (const name of ["Datang ke tempat", "Dikirim", "Online"])
      await expect(serviceTile(service, name)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    await pressLanjut(page);
    await expectMarketScreen(page);
    await expectNoOverflow(page);
    await pressLanjut(page);
    await expectCompetitorsScreen(page);
    await expectNoOverflow(page);
    await pressLanjut(page);
    await expectDifferentiatorScreen(page);
    await expectNoOverflow(page);
    await pressLanjut(page);
    await expectIntroReview(page);
    await pressMulai(page);
    await expectSummary(page);
    await expect(reviewFact(page, "Cara mendapatkan")).toHaveText(
      "datang ke tempat, dikirim, online",
    );
    expect((await intakeSession(page)).selection).toMatchObject({
      serviceChannels: ["on_premise", "delivery", "online"],
      origins: { serviceChannels: "owner" },
    });
  });
});

test.describe("J7 review and Nama lain aliases", () => {
  test("the business name edit returns by Lanjut, Kembali, and browser Back", async ({
    page,
  }) => {
    // A test-pass order: these steps change the website or the business, which a
    // PAID order locks (spec 017 R-19; see payment-screens.spec.ts).
    await useTestPass(page);
    await enter(page);
    for (const back of ["lanjut", "footer", "browser"] as const) {
      await editBusinessFromReview(page);
      await expectBrandConfirm(page);
      await expect(
        page.getByRole("heading", { level: 1, name: BRAND_HEADING }),
      ).toBeFocused();
      if (back === "lanjut") await pressLanjut(page);
      else if (back === "footer") await pressKembali(page);
      else await page.goBack();
      await expectSummary(page);
    }
    // `Ganti website` opens the entry with the current website kept.
    await editWebsiteFromReview(page);
    await expect(entryScreen(page)).toBeVisible();
    await expect(websiteInput(page)).toHaveValue(
      "https://kedai-fiksi.example/",
    );
  });

  test("aliases add and remove individually and persist over a reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await enter(page);
    const name = reviewFact(page, "Nama");
    await expect(name).toContainText("Juga disebut: Kedai Fiksi Bandung");
    expect((await intakeSession(page)).selection.origins.aliases).toBe(
      "website",
    );
    await openAliasEditor(page, true);
    await expect(aliasInput(page)).toBeFocused();
    // Enter commits an addition through the same adder.
    await aliasInput(page).fill("Kedai Fiksi Pusat");
    await aliasInput(page).press("Enter");
    await expect(aliasChip(page, "Kedai Fiksi Pusat")).toBeVisible();
    await expect(aliasInput(page)).toHaveValue("");
    await addAlias(page, "KopiFiksi");
    await expect(aliasChip(page, "KopiFiksi")).toBeVisible();
    await saveReviewSheet(page, "Bisnis");
    await expect(name).toContainText(
      "Juga disebut: Kedai Fiksi Bandung, Kedai Fiksi Pusat, KopiFiksi",
    );
    let saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual([
      "Kedai Fiksi Bandung",
      "Kedai Fiksi Pusat",
      "KopiFiksi",
    ]);
    expect(saved.selection.origins.aliases).toBe("owner");
    const boundaryAlias = "A".repeat(160);
    await openAliasEditor(page);
    await addAlias(page, boundaryAlias);
    // The 320px sheet stays inside the viewport, 160-char chip included.
    await expect(aliasChip(page, boundaryAlias)).toBeVisible();
    await expectNoOverflow(page);
    await expectInside(reviewSheet(page, "Bisnis"));
    await saveReviewSheet(page, "Bisnis");
    expect((await intakeSession(page)).selection.aliases).toContain(
      boundaryAlias,
    );
    await expectNoOverflow(page);
    await openReviewSheet(page, "Bisnis");
    await removeAlias(page, boundaryAlias);
    await saveReviewSheet(page, "Bisnis");
    await page.reload();
    await expectSummary(page);
    saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual([
      "Kedai Fiksi Bandung",
      "Kedai Fiksi Pusat",
      "KopiFiksi",
    ]);
    await openReviewSheet(page, "Bisnis");
    await removeAlias(page, /KopiFiksi/, true);
    await saveReviewSheet(page, "Bisnis");
    saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual([
      "Kedai Fiksi Bandung",
      "Kedai Fiksi Pusat",
    ]);
    // Removing every alias is valid; the review then names no other name.
    await openReviewSheet(page, "Bisnis");
    await removeAlias(page, /Kedai Fiksi Bandung/);
    await removeAlias(page, /Kedai Fiksi Pusat/);
    await saveReviewSheet(page, "Bisnis");
    await expect(name).toHaveText("Kedai Fiksi");
    saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual([]);
  });

  test("invalid aliases are refused with the draft kept for a retry", async ({
    page,
  }) => {
    await enter(page);
    await openAliasEditor(page);
    const sheet = reviewSheet(page, "Bisnis");
    // Trimmed case-insensitive duplicates are refused with the draft kept.
    await addAlias(page, "  kedai fiksi bandung ");
    await expect(sheet.getByRole("alert")).toContainText("sudah ada");
    await expect(aliasInput(page)).toHaveValue("  kedai fiksi bandung ");
    // Overlong names are refused the same way.
    const longName = `Nama lain ${"sangat ".repeat(30)}`;
    await addAlias(page, longName);
    await expect(sheet.getByRole("alert")).toContainText("160 karakter");
    await expect(aliasInput(page)).toHaveValue(longName);
    // The rejected draft corrects in place and commits.
    await addAlias(page, "Kedai Fiksi Pusat");
    await expect(aliasInput(page)).toHaveValue("");
    await saveReviewSheet(page, "Bisnis");
    expect((await intakeSession(page)).selection.aliases).toEqual([
      "Kedai Fiksi Bandung",
      "Kedai Fiksi Pusat",
    ]);
  });

  test("a thirteenth alias is refused at the cap", async ({ page }) => {
    await stubPreparationDraft(page, {
      ...richDraft,
      brand_name_variants: Array.from(
        { length: 12 },
        (_, index) => `Varian ${index + 1}`,
      ),
    });
    await toSummary(page);
    await openAliasEditor(page);
    await addAlias(page, "Ketiga belas");
    await expect(reviewSheet(page, "Bisnis").getByRole("alert")).toContainText(
      "paling banyak 12",
    );
    await expect(aliasInput(page)).toHaveValue("Ketiga belas");
    expect((await intakeSession(page)).selection.aliases).toHaveLength(12);
  });

  test("a sensitive alias is refused through the privacy stop", async ({
    page,
  }) => {
    const questions: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/audit/glm-questions")
        questions.push("questions");
    });
    await enter(page);
    await openAliasEditor(page);
    await addAlias(page, "nomor rekening 12345");
    await expect(
      reviewSheet(page, "Bisnis").getByText(SENSITIVE_INPUT_NOTICE, {
        exact: true,
      }),
    ).toBeVisible();
    // The refused draft stays; the committed list and session stay safe.
    await expect(aliasInput(page)).toHaveValue("nomor rekening 12345");
    await expect(aliasChip(page, /nomor rekening/)).toHaveCount(0);
    let saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual(["Kedai Fiksi Bandung"]);
    expect(JSON.stringify(saved)).not.toContain("nomor rekening");
    // Simpan keeps only the safe list.
    await saveReviewSheet(page, "Bisnis");
    saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual(["Kedai Fiksi Bandung"]);
    expect(JSON.stringify(saved)).not.toContain("nomor rekening");
    // An edit alone never fires the question request.
    expect(questions).toHaveLength(0);
  });

  test("edited aliases freeze into the single question request with source links", async ({
    page,
  }) => {
    const contexts: { identity?: { aliases?: string[] } }[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/audit/glm-questions")
        contexts.push(
          (
            request.postDataJSON() as {
              intake: { context: { identity: { aliases: string[] } } };
            }
          ).intake.context,
        );
    });
    await enter(page);
    // The review names the website, and `Lihat sumber` lists the links.
    await expect(reviewFact(page, "Website")).toHaveText("kedai-fiksi.example");
    await reviewScreen(page)
      .getByRole("button", { name: /^Lihat sumber \(\d+\)$/ })
      .click();
    await expect(
      reviewScreen(page)
        .getByRole("link", { name: /kedai-fiksi\.example/ })
        .first(),
    ).toBeVisible();
    await openAliasEditor(page);
    await addAlias(page, "Kedai Fiksi Pusat");
    await saveReviewSheet(page, "Bisnis");
    await confirmSummary(page);
    await expectTenQuestions(page);
    expect(contexts).toHaveLength(1);
    expect(contexts[0]?.identity?.aliases).toEqual([
      "Kedai Fiksi Bandung",
      "Kedai Fiksi Pusat",
    ]);
    const saved = await intakeSession(page);
    expect(saved.frozen.context.identity.aliases).toEqual([
      "Kedai Fiksi Bandung",
      "Kedai Fiksi Pusat",
    ]);
  });
});
