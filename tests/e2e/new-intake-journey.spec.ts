import { expect, test, type Page } from "@playwright/test";
import {
  addAlias,
  addCompetitor,
  addCustomerNeed,
  aliasInput,
  brandScreen,
  categoryScreen,
  chooseCompetitorMode,
  chooseFocus,
  confirmBrand,
  confirmFocus,
  CONFIRM_SUMMARY,
  confirmSummary,
  editBusinessFromReview,
  editWebsiteFromReview,
  entryScreen,
  expectBrandConfirm,
  expectCategoryScreen,
  expectCompetitorsScreen,
  expectCustomerNeedsScreen,
  expectFocusScreen,
  expectLocationScreen,
  expectMarketScreen,
  expectOfferingsScreen,
  expectProductScreen,
  expectPublicFactScreen,
  expectServiceScreen,
  expectSummary,
  expectTargetCustomerScreen,
  expectDecisionConsiderationsScreen,
  expectDifferentiatorScreen,
  expectTenQuestions,
  fillEntry,
  fillPublicFact,
  focusScreen,
  intakeSession,
  INTAKE_SESSION_KEY,
  locationScreen,
  ORDER_EMAIL,
  orderScreen,
  marketScreen,
  openAliasEditor,
  pressKembali,
  pressLanjut,
  pressPeriksa,
  productScreen,
  competitorsScreen,
  customerNeedsScreen,
  decisionConsiderationsScreen,
  differentiatorScreen,
  publicFactScreen,
  targetCustomerScreen,
  addConsideration,
  considerationInput,
  differentiatorInput,
  fillDifferentiator,
  fillTargetCustomer,
  targetCustomerInput,
  toggleConsideration,
  expectConsiderationTextOnBackground,
  removeAlias,
  reviewRow,
  reviewScreen,
  REVIEW_HEADING,
  RICH_PREPARATION_DRAFT,
  SENSITIVE_INPUT_NOTICE,
  serviceScreen,
  stubPreparationDraft,
  submitOrder,
  throughDetailScreens,
  throughCompetitorContext,
  toggleCustomerNeed,
  toSummary,
} from "./journey";

const richDraft = RICH_PREPARATION_DRAFT;

async function enter(page: Page, rich = true) {
  if (rich) await stubPreparationDraft(page, richDraft);
  await toSummary(page);
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
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await pressLanjut(page);
  await submitOrder(page);
  await expect(page.getByText("Ekstraksi sementara gagal.")).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(saved.identity.canonicalUrl).toBe("https://kedai-fiksi.example/");
  expect(saved.preparationCalls).toMatchObject([failedCall]);
  // Spec 016 R-31: the email is never kept in the browser.
  expect(JSON.stringify(saved)).not.toContain(ORDER_EMAIL);
  const orderId = saved.order.id as string;
  await page.reload();
  // The order is still open: the order screen has no email field, and `Lanjut`
  // reads the website again under the same order.
  await expect(orderScreen(page)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Email/ })).toHaveCount(0);
  await pressLanjut(page);
  await expectFocusScreen(page);
  expect(
    calls.filter((call) => call === "GET /api/audit/identity"),
  ).toHaveLength(1);
  expect(
    calls.filter((call) => call === "POST /api/audit/extract"),
  ).toHaveLength(2);
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
  await expect(
    page.getByRole("heading", { name: "Siapkan pertanyaan audit" }),
  ).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(saved.generationAttempts).toMatchObject([
    { outcome: "interrupted", execution: "unknown", cost_usd: null },
  ]);
  expect(calls).toHaveLength(1);
});

test("a sensitive optional edit retains the last safe summary value", async ({
  page,
}) => {
  await enter(page);
  await page
    .locator('section[aria-label="Pembeda bisnis"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectDifferentiatorScreen(page);
  const differentiator = differentiatorScreen(page).getByRole("textbox", {
    name: /Pembeda bisnis/,
  });
  await differentiator.fill("Racikan kopi khas");
  await differentiator.fill("nomor rekening 12345");
  await expect(
    page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
  ).toBeVisible();
  await expect(differentiator).toHaveValue("Racikan kopi khas");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(saved.selection.differentiator).toBe("Racikan kopi khas");
  expect(JSON.stringify(saved)).not.toContain("nomor rekening");
});

test("every manually selected comparator stays visible, correctable and removable", async ({
  page,
}) => {
  await enter(page, false);
  await page
    .locator('section[aria-label="Bisnis pembanding"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectCompetitorsScreen(page);
  await chooseCompetitorMode(page, "Bisnis yang saya pilih");
  await addCompetitor(page, "Kedai Baru");
  await addCompetitor(page, "Kedai Samping");
  const selected = page.getByRole("textbox", { name: "Pembanding terpilih 1" });
  const otherSelected = page.getByRole("textbox", {
    name: "Pembanding terpilih 2",
  });
  await expect(selected).toHaveValue("Kedai Baru");
  await expect(otherSelected).toHaveValue("Kedai Samping");
  await selected.fill(" kedai SAMPing ");
  await expect(selected).toHaveAttribute("aria-invalid", "true");
  const duplicateErrorId = await selected.getAttribute("aria-describedby");
  expect(duplicateErrorId).toBeTruthy();
  await expect(page.locator(`#${duplicateErrorId}`)).toContainText(
    "Nama pembanding sudah dipakai",
  );
  await expect(page.getByRole("button", { name: "Lanjut" })).toBeDisabled();
  await selected.fill("Kedai Pilihan");
  await expect(selected).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Lanjut" })).toBeEnabled();
  await pressLanjut(page);
  await expectSummary(page);
  await confirmSummary(page);
  await expectTenQuestions(page);
  const frozen = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(frozen.frozen.context.comparators.value).toEqual({
    mode: "named",
    names: ["Kedai Pilihan", "Kedai Samping"],
  });
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  await expectSummary(page);
  await page
    .locator('section[aria-label="Bisnis pembanding"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectCompetitorsScreen(page);
  await expect(
    page.getByRole("textbox", { name: "Pembanding terpilih 1" }),
  ).toHaveValue("Kedai Pilihan");
  await page
    .getByRole("button", { name: "Hapus pembanding Kedai Pilihan" })
    .click();
  const remaining = page.getByRole("textbox", {
    name: "Pembanding terpilih 1",
  });
  await expect(remaining).toHaveValue("Kedai Samping");
  await page
    .getByRole("button", { name: "Hapus pembanding Kedai Samping" })
    .click();
  await expect(remaining).toHaveCount(0);
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
  await expect(reviewScreen(page)).toBeVisible();
  await expect(reviewScreen(page)).toHaveAttribute(
    "data-smart-summary",
    "ready",
  );
  await expect(
    page.getByRole("heading", { name: REVIEW_HEADING }),
  ).toBeVisible();
  // The business name reads back with no inline name controls; the prepared
  // alias keeps its website provenance.
  await expect(reviewRow(page, "Bisnis")).toContainText("Kedai Fiksi");
  const aliasRow = reviewRow(page, "Nama lain");
  await expect(aliasRow).toContainText("Kedai Fiksi Bandung");
  await expect(aliasRow).toContainText("Dari website Anda");
  const focusRow = page.locator('section[aria-label="Fokus audit"]');
  await expect(focusRow).toContainText("Brand secara keseluruhan");
  await expect(focusRow).toContainText("Saran Nuave");
  await expect(
    page.locator('section[aria-label="Cara layanan"]'),
  ).toContainText("Di lokasi bisnis Anda");
  const marketRow = page.locator('section[aria-label="Jangkauan pasar"]');
  await expect(marketRow).toContainText("Beberapa area");
  await expect(marketRow).toContainText("Bandung");
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(calls).toEqual([
    "GET /api/audit/identity",
    "POST /api/audit/extract",
    "POST /api/audit/glm-questions",
  ]);
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
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
  await expect(page.getByRole("textbox", { name: "Nama bisnis" })).toHaveValue(
    "",
  );
  await page.getByRole("textbox", { name: "Nama bisnis" }).fill("Kedai Fiksi");
  await page
    .getByRole("textbox", { name: "URL website publik" })
    .fill("https://kedai-fiksi.example/");
  await pressPeriksa(page);
  await expectBrandConfirm(page);
});

test("a cleared detail row routes the summary CTA to its owning screen", async ({
  page,
}) => {
  await enter(page, false);
  await expect(page.locator('[data-smart-summary="ready"]')).toBeVisible();
  // Clearing a required answer through its own screen leaves a gap; the
  // summary then offers the single completion CTA instead of confirming.
  await page
    .locator('section[aria-label="Kategori"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectCategoryScreen(page);
  await page.getByRole("textbox", { name: "Kategori" }).fill("");
  await pressKembali(page);
  await expectSummary(page);
  await expect(page.getByText(/Perlu dipastikan: Kategori/)).toBeVisible();
  await expect(page.getByRole("button", { name: CONFIRM_SUMMARY })).toHaveCount(
    0,
  );
  // The CTA opens the owning detail screen marked to return: filling the
  // gap and pressing Lanjut lands straight back on the review.
  await page
    .getByRole("button", { name: "Lengkapi yang perlu dipastikan" })
    .click();
  await expectCategoryScreen(page);
  await page.getByRole("textbox", { name: "Kategori" }).fill("kedai kopi");
  await pressLanjut(page);
  await expectSummary(page);
  await confirmSummary(page);
  await expectTenQuestions(page);
});

test("product and location choices freeze only their active meaning", async ({
  page,
}) => {
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
  // First pass: pick the product focus on its dedicated screens.
  await stubPreparationDraft(page, richDraft);
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await confirmBrand(page);
  await chooseFocus(page, "Satu produk atau layanan");
  await pressLanjut(page);
  await expectProductScreen(page);
  await productScreen(page).getByRole("radio", { name: "roti" }).click();
  await pressLanjut(page);
  // Product focus chains through the detail screens; its offering list is
  // read-only catalogue context and the market screen still applies.
  await throughDetailScreens(page);
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts[0]).toMatchObject({
    focus: { value: { kind: "produk", name: "roti" } },
    offerings: { value: ["roti"] },
  });
  // Editing the summary's focus row re-opens the focus screen; switching to a
  // location clears the product target and freezes only the cabang meaning.
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  const focusRow = page.locator('section[aria-label="Fokus audit"]');
  await focusRow.getByRole("button", { name: "Ubah" }).click();
  await expectFocusScreen(page);
  await chooseFocus(page, "Satu lokasi");
  await pressLanjut(page);
  await expectLocationScreen(page);
  await locationScreen(page)
    .getByRole("button", { name: "Tambah lokasi lain" })
    .click();
  await locationScreen(page)
    .getByRole("textbox", { name: "Nama lokasi" })
    .fill("Cabang Timur");
  await locationScreen(page)
    .getByRole("textbox", { name: "Alamat atau area" })
    .fill("Jl. Contoh 12");
  await pressLanjut(page);
  // The focus change makes the detour pass the category checkpoint, whose
  // Lanjut then exits straight back to the review.
  await expectCategoryScreen(page);
  await pressLanjut(page);
  await expectSummary(page);
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
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  const categoryRow = page.locator('section[aria-label="Kategori"]');
  const editCategory = async () => {
    await categoryRow.getByRole("button", { name: "Ubah" }).click();
    await expectCategoryScreen(page);
    const input = categoryScreen(page).getByRole("textbox", {
      name: "Kategori",
    });
    if (!(await input.isVisible()))
      await categoryScreen(page)
        .getByRole("button", { name: "Tulis kategori sendiri" })
        .click();
    await input.fill("warung kopi");
    await pressKembali(page);
    await expectSummary(page);
  };
  await editCategory();
  await page.getByRole("button", { name: "Batalkan perubahan" }).click();
  await expectTenQuestions(page);
  expect(questions).toHaveLength(1);
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
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
  // `Ubah website` on the Bisnis row opens the entry source fields.
  await editWebsiteFromReview(page);
  await expect(entryScreen(page)).toBeVisible();
  expect(calls).toHaveLength(2);
  await page
    .getByRole("textbox", { name: "Nama bisnis" })
    .fill("Kedai Fiksi Baru");
  await pressPeriksa(page);
  // Name-only correction returns to the brand check without a new read.
  await expectBrandConfirm(page, "Kedai Fiksi Baru");
  expect(calls).toHaveLength(2);
  // The brand screen's Lanjut returns to the review through the marker.
  await pressLanjut(page);
  await expectSummary(page);
  // A website change invalidates preparation: `Periksa` reads the source again.
  await editWebsiteFromReview(page);
  await expect(entryScreen(page)).toBeVisible();
  await page
    .getByRole("textbox", { name: "URL website publik" })
    .fill("https://fiksi-lain.example/");
  await pressPeriksa(page);
  await expect(brandScreen(page)).toBeVisible();
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
  await enter(page);
  const competitorRow = page.locator('section[aria-label="Bisnis pembanding"]');
  await expect(competitorRow).toContainText("Kedai Tetangga");
  const beforeEdit = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(beforeEdit.selection.comparatorMode).toBe("named");
  expect(beforeEdit.selection.comparatorNames).toEqual(["Kedai Tetangga"]);
  await competitorRow.getByRole("button", { name: "Ubah" }).click();
  await expectCompetitorsScreen(page);
  await expect(
    competitorsScreen(page).getByRole("textbox", {
      name: "Pembanding terpilih 1",
    }),
  ).toHaveValue("Kedai Tetangga");
  await addCompetitor(page, "Warung Fiksi");
  await pressLanjut(page);
  await expectSummary(page);
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts[0]).toMatchObject({
    comparators: {
      value: { mode: "named", names: ["Kedai Tetangga", "Warung Fiksi"] },
      origin: "owner",
    },
  });
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  await page
    .locator('section[aria-label="Bisnis pembanding"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectCompetitorsScreen(page);
  await chooseCompetitorMode(page, "Tidak ada pembanding langsung");
  await pressLanjut(page);
  await expectSummary(page);
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
  await expect(
    page.locator('section[aria-label="Pelanggan sasaran"]'),
  ).toContainText("Belum diisi");
  await expect(
    page.locator('section[aria-label="Kebutuhan pelanggan"]'),
  ).toContainText("Belum diisi");
  await expect(
    page.locator('section[aria-label="Pertimbangan pembeli"]'),
  ).toContainText("Belum diisi");
  await expect(
    page.locator('section[aria-label="Bisnis pembanding"]'),
  ).toContainText("Belum tahu");
  await expect(
    page.locator('section[aria-label="Pembeda bisnis"]'),
  ).toContainText("Belum diisi");
  await expect(
    page.locator('section[aria-label="Fakta publik tambahan"]'),
  ).toContainText("Belum diisi");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
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
  await enter(page);
  await page
    .locator('section[aria-label="Kebutuhan pelanggan"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectCustomerNeedsScreen(page);
  await expect(customerNeedsScreen(page)).toContainText("Saran Nuave");
  const preparedNeed = customerNeedsScreen(page).getByRole("button", {
    name: "minuman dekat kantor",
  });
  await expect(preparedNeed).toHaveAttribute("aria-pressed", "true");
  await toggleCustomerNeed(page, "minuman dekat kantor");
  await addCustomerNeed(page, "pesanan untuk rapat pagi");
  await expect(
    customerNeedsScreen(page).getByRole("button", {
      name: "pesanan untuk rapat pagi",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await pressLanjut(page);
  await expectSummary(page);

  await page
    .locator('section[aria-label="Bisnis pembanding"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectCompetitorsScreen(page);
  await expect(competitorsScreen(page)).toContainText("Saran Nuave");
  await competitorsScreen(page)
    .getByRole("button", { name: "Kedai Tetangga", exact: true })
    .click();
  await expect(
    competitorsScreen(page).getByText(/Tambahkan nama pembanding/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Lanjut" })).toBeDisabled();
  for (const name of [
    "Pembanding satu",
    "Pembanding dua",
    "Pembanding tiga",
    "Pembanding empat",
    "Pembanding lima",
  ]) {
    await addCompetitor(page, name);
  }
  await addCompetitor(page, "Pembanding enam");
  await expect(competitorsScreen(page).getByRole("alert")).toContainText(
    "paling banyak 5",
  );
  const addition = competitorsScreen(page).getByRole("textbox", {
    name: "Nama pembanding lain",
  });
  await expect(addition).toHaveValue("Pembanding enam");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(saved.selection.comparatorNames).toEqual([
    "Pembanding satu",
    "Pembanding dua",
    "Pembanding tiga",
    "Pembanding empat",
    "Pembanding lima",
  ]);
  await competitorsScreen(page)
    .getByRole("button", { name: "Hapus pembanding Pembanding lima" })
    .click();
  await expect(addition).toHaveValue("Pembanding enam");
  await competitorsScreen(page)
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
  await expect(addition).toHaveValue("");
  const retried = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(retried.selection.comparatorNames).toEqual([
    "Pembanding satu",
    "Pembanding dua",
    "Pembanding tiga",
    "Pembanding empat",
    "Pembanding enam",
  ]);
  await expect(page.getByRole("button", { name: "Lanjut" })).toBeEnabled();
  await chooseCompetitorMode(page, "Belum tahu");
  await pressLanjut(page);
  await expectSummary(page);
  await page
    .locator('section[aria-label="Fakta publik tambahan"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectPublicFactScreen(page);
  await fillPublicFact(page, "Buka setiap hari sampai pukul 21.00.");
  await pressLanjut(page);
  await expectSummary(page);
});

test("JQ customer screens keep prepared provenance, take owner edits, and hold at 320px", async ({
  page,
}, testInfo) => {
  const shots = testInfo.outputPath("jq-320px");
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
  await enter(page);
  await page.setViewportSize({ width: 320, height: 720 });
  // The read-back rows show the prepared meanings with their Nuave label.
  for (const [row, value] of [
    ["Pelanggan sasaran", "pekerja kantoran sekitar"],
    ["Pertimbangan pembeli", "lokasi"],
    ["Pembeda bisnis", "Racikan kopi rumahan fiktif"],
  ] as const) {
    const section = page.locator(`section[aria-label="${row}"]`);
    await expect(section).toContainText(value);
    await expect(section).toContainText("Saran Nuave");
    await expect(section.getByRole("button", { name: "Ubah" })).toBeEnabled();
  }
  // Target customer: prepared value selected, owner edit returns to review.
  await page
    .locator('section[aria-label="Pelanggan sasaran"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectTargetCustomerScreen(page);
  await expect(targetCustomerScreen(page)).toContainText("Saran Nuave");
  await fillTargetCustomer(page, "keluarga sekitar");
  await pressLanjut(page);
  await expectSummary(page);
  // Buyer considerations: prepared chip selected, owner edit wins.
  await page
    .locator('section[aria-label="Pertimbangan pembeli"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectDecisionConsiderationsScreen(page);
  await expect(decisionConsiderationsScreen(page)).toContainText("Saran Nuave");
  await expect(
    decisionConsiderationsScreen(page).getByRole("button", { name: "lokasi" }),
  ).toHaveAttribute("aria-pressed", "true");
  await toggleConsideration(page, "lokasi");
  await addConsideration(page, "jam buka");
  // An unbroken 300-character consideration fits the 320px layout and its
  // glyphs stay on the chip's painted background.
  await addConsideration(page, "x".repeat(300));
  await decisionConsiderationsScreen(page).screenshot({
    path: `${shots}/decision-considerations-320px.png`,
  });
  await decisionConsiderationsScreen(page)
    .getByRole("button", { name: "jam buka", exact: true })
    .screenshot({ path: `${shots}/chip-singleline.png` });
  await decisionConsiderationsScreen(page)
    .getByRole("button", { name: "x".repeat(300), exact: true })
    .screenshot({ path: `${shots}/chip-tall-300.png` });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expectConsiderationTextOnBackground(page, "x".repeat(300));
  await pressLanjut(page);
  await expectSummary(page);
  // Differentiator: prepared value selected, owner edit returns to review.
  await page
    .locator('section[aria-label="Pembeda bisnis"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await expectDifferentiatorScreen(page);
  await expect(differentiatorScreen(page)).toContainText("Saran Nuave");
  await fillDifferentiator(page, "Pilihan roti rumahan fiktif");
  await pressLanjut(page);
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
  await enter(page);
  await page.setViewportSize({ width: 320, height: 720 });
  const shots = testInfo.outputPath("jq-keyboard");
  const kembali = page.getByRole("button", { name: "Kembali", exact: true });
  const lanjut = page.getByRole("button", { name: "Lanjut", exact: true });
  // Test entry may focus the row's Ubah programmatically; every changed-screen
  // action after that is keyboard only.
  const openRowByKeyboard = async (row: string, heading: string) => {
    await page
      .locator(`section[aria-label="${row}"]`)
      .getByRole("button", { name: "Ubah" })
      .focus();
    await page.keyboard.press("Enter");
    const head = page.getByRole("heading", { name: heading });
    await expect(head).toBeVisible();
    await expect(head).toBeFocused();
  };

  // Target customer: keyboard edit, reload, keyboard return to the review.
  await openRowByKeyboard("Pelanggan sasaran", "Siapa pelanggan utama Anda?");
  await page.keyboard.press("Tab");
  await expect(targetCustomerInput(page)).toBeFocused();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("keluarga sekitar");
  await page.reload();
  await expectTargetCustomerScreen(page);
  await expect(targetCustomerInput(page)).toHaveValue("keluarga sekitar");
  await expect(targetCustomerScreen(page)).toContainText("Dari Anda");
  await expect(
    page.getByRole("heading", { name: "Siapa pelanggan utama Anda?" }),
  ).toBeFocused();
  await page.screenshot({
    path: `${shots}/target-customer.png`,
    fullPage: true,
  });
  await page.keyboard.press("Tab");
  await expect(targetCustomerInput(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(kembali).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(lanjut).toBeFocused();
  await page.keyboard.press("Enter");
  await expectSummary(page);

  // Buyer considerations: prepared chip toggled off, owner value committed and
  // removed by Space, then re-committed from a focused input — all keyboard.
  await openRowByKeyboard(
    "Pertimbangan pembeli",
    "Apa yang dipertimbangkan pelanggan saat memilih?",
  );
  const lokasiChip = decisionConsiderationsScreen(page).getByRole("button", {
    name: "lokasi",
  });
  const ownerChip = decisionConsiderationsScreen(page).getByRole("button", {
    name: "jam buka",
  });
  await page.keyboard.press("Tab");
  await expect(lokasiChip).toBeFocused();
  await page.keyboard.press("Space");
  await expect(lokasiChip).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Tab");
  await expect(considerationInput(page)).toBeFocused();
  await page.keyboard.type("jam buka");
  await page.keyboard.press("Enter");
  await expect(considerationInput(page)).toHaveValue("");
  await expect(ownerChip).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Shift+Tab");
  await expect(ownerChip).toBeFocused();
  await page.keyboard.press("Space");
  await expect(ownerChip).toHaveCount(0);
  await considerationInput(page).focus();
  await page.keyboard.type("jam buka");
  await page.keyboard.press("Enter");
  await expect(considerationInput(page)).toHaveValue("");
  await expect(ownerChip).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expectDecisionConsiderationsScreen(page);
  await expect(
    page.getByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    }),
  ).toBeFocused();
  await expect(lokasiChip).toHaveAttribute("aria-pressed", "false");
  await expect(ownerChip).toHaveAttribute("aria-pressed", "true");
  await expect(decisionConsiderationsScreen(page)).toContainText("Dari Anda");
  await page.screenshot({
    path: `${shots}/decision-considerations.png`,
    fullPage: true,
  });
  await page.keyboard.press("Tab");
  await expect(lokasiChip).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(ownerChip).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(considerationInput(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(kembali).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(lanjut).toBeFocused();
  await page.keyboard.press("Enter");
  await expectSummary(page);

  // Differentiator: keyboard edit, reload, keyboard return to the review.
  await openRowByKeyboard("Pembeda bisnis", "Apa yang membedakan bisnis Anda?");
  await page.keyboard.press("Tab");
  await expect(differentiatorInput(page)).toBeFocused();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Pilihan roti rumahan fiktif");
  await page.reload();
  await expectDifferentiatorScreen(page);
  await expect(differentiatorInput(page)).toHaveValue(
    "Pilihan roti rumahan fiktif",
  );
  await expect(differentiatorScreen(page)).toContainText("Dari Anda");
  await expect(
    page.getByRole("heading", { name: "Apa yang membedakan bisnis Anda?" }),
  ).toBeFocused();
  await page.screenshot({
    path: `${shots}/differentiator.png`,
    fullPage: true,
  });
  await page.keyboard.press("Tab");
  await expect(differentiatorInput(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(kembali).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(lanjut).toBeFocused();
  await page.keyboard.press("Enter");
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

test("J6 and JQ edits return to the summary by Continue, footer Back, and browser Back", async ({
  page,
}) => {
  await enter(page);
  await page.setViewportSize({ width: 320, height: 720 });
  const stages = [
    {
      row: "Pelanggan sasaran",
      expectScreen: expectTargetCustomerScreen,
      heading: "Siapa pelanggan utama Anda?",
    },
    {
      row: "Kebutuhan pelanggan",
      expectScreen: expectCustomerNeedsScreen,
      heading: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    },
    {
      row: "Pertimbangan pembeli",
      expectScreen: expectDecisionConsiderationsScreen,
      heading: "Apa yang dipertimbangkan pelanggan saat memilih?",
    },
    {
      row: "Bisnis pembanding",
      expectScreen: expectCompetitorsScreen,
      heading: "Ini yang mungkin dibandingkan dengan Anda",
    },
    {
      row: "Pembeda bisnis",
      expectScreen: expectDifferentiatorScreen,
      heading: "Apa yang membedakan bisnis Anda?",
    },
    {
      row: "Fakta publik tambahan",
      expectScreen: expectPublicFactScreen,
      heading: "Apa yang tidak boleh salah dipahami tentang brand Anda?",
    },
  ] as const;
  for (const stage of stages) {
    for (const back of ["continue", "footer", "browser"] as const) {
      await page
        .locator(`section[aria-label="${stage.row}"]`)
        .getByRole("button", { name: "Ubah" })
        .click();
      await stage.expectScreen(page);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.activeElement?.textContent?.trim() ?? "",
          ),
        )
        .toContain(stage.heading);
      await page.keyboard.press("Tab");
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.tagName ?? ""))
        .not.toBe("H1");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (back === "continue") await pressLanjut(page);
      else if (back === "footer") await pressKembali(page);
      else await page.goBack();
      await expectSummary(page);
    }
  }
});

test("each J6 screen restores its value after a reload", async ({ page }) => {
  await enter(page);
  await page
    .locator('section[aria-label="Kebutuhan pelanggan"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await addCustomerNeed(page, "pilihan sarapan ringan");
  await page.reload();
  await expectCustomerNeedsScreen(page);
  await expect(
    customerNeedsScreen(page).getByRole("button", {
      name: "pilihan sarapan ringan",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await pressKembali(page);
  await expectSummary(page);

  await page
    .locator('section[aria-label="Bisnis pembanding"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await addCompetitor(page, "Kedai Samping");
  await page.reload();
  await expectCompetitorsScreen(page);
  await expect(
    competitorsScreen(page).getByRole("textbox", {
      name: "Pembanding terpilih 2",
    }),
  ).toHaveValue("Kedai Samping");
  await pressKembali(page);
  await expectSummary(page);

  await page
    .locator('section[aria-label="Fakta publik tambahan"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await fillPublicFact(page, "Menyediakan area duduk di lantai dua.");
  await page.reload();
  await expectPublicFactScreen(page);
  await expect(publicFactScreen(page).getByRole("textbox")).toHaveValue(
    "Menyediakan area duduk di lantai dua.",
  );
  await pressKembali(page);
  await expectSummary(page);
});

test("unsafe public facts retain the safe value and frozen R20 context", async ({
  page,
}) => {
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
  await enter(page);
  await page
    .locator('section[aria-label="Fakta publik tambahan"]')
    .getByRole("button", { name: "Ubah" })
    .click();
  await fillPublicFact(page, "Buka setiap hari sampai pukul 21.00.");
  await fillPublicFact(page, "nomor rekening 12345");
  await expect(
    page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
  ).toBeVisible();
  await expect(publicFactScreen(page).getByRole("textbox")).toHaveValue(
    "Buka setiap hari sampai pukul 21.00.",
  );
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(saved.selection.publicFact).toBe(
    "Buka setiap hari sampai pukul 21.00.",
  );
  expect(JSON.stringify(saved)).not.toContain("nomor rekening");
  await pressLanjut(page);
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
    const calls: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/api/")) calls.push(`${request.method()} ${path}`);
    });
    await stubPreparationDraft(page, richDraft);
    await fillEntry(page);
    await pressPeriksa(page);
    await expectBrandConfirm(page);
    await confirmBrand(page);
    const wholeBrand = focusScreen(page).getByRole("radio", {
      name: "Brand secara keseluruhan",
    });
    await expect(wholeBrand).toBeChecked();
    await expect(
      focusScreen(page).getByRole("radio", { name: "Satu lokasi" }),
    ).toBeVisible();
    await expect(
      focusScreen(page).getByRole("radio", {
        name: "Satu produk atau layanan",
      }),
    ).toBeVisible();
    await expect(
      focusScreen(page).getByText("Saran Nuave", { exact: true }),
    ).toBeVisible();
    // Radio-group keyboard support: ArrowDown moves the checked choice.
    await wholeBrand.focus();
    await page.keyboard.press("ArrowDown");
    await expect(
      focusScreen(page).getByRole("radio", { name: "Satu lokasi" }),
    ).toBeChecked();
    // Kembali returns to the brand check with its answer intact.
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
    await chooseFocus(page, "Brand secara keseluruhan");
    await pressLanjut(page);
    await throughDetailScreens(page);
  });

  test("one location picks a published row carrying Dari website Anda", async ({
    page,
  }) => {
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
    await stubPreparationDraft(page, richDraft);
    await fillEntry(page);
    await pressPeriksa(page);
    await confirmBrand(page);
    await chooseFocus(page, "Satu lokasi");
    await pressLanjut(page);
    await expectLocationScreen(page);
    const published = locationScreen(page).getByRole("radio", {
      name: /Kedai Fiksi Cimahi/,
    });
    await expect(published).toContainText("Dari website Anda");
    await published.click();
    await pressLanjut(page);
    await throughDetailScreens(page);
    const focusRow = page.locator('section[aria-label="Fokus audit"]');
    await expect(focusRow).toContainText("Satu lokasi");
    await expect(focusRow).toContainText("Kedai Fiksi Cimahi");
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
    await stubPreparationDraft(page, richDraft);
    await fillEntry(page);
    await pressPeriksa(page);
    await confirmBrand(page);
    await chooseFocus(page, "Satu lokasi");
    await pressLanjut(page);
    await expectLocationScreen(page);
    await locationScreen(page)
      .getByRole("button", { name: "Tambah lokasi lain" })
      .click();
    const lanjut = page.getByRole("button", { name: "Lanjut", exact: true });
    const name = locationScreen(page).getByRole("textbox", {
      name: "Nama lokasi",
    });
    const address = locationScreen(page).getByRole("textbox", {
      name: "Alamat atau area",
    });
    await name.fill("Cabang Baru");
    await expect(lanjut).toBeDisabled();
    await address.fill("Jl. Fiksi 40");
    await expect(lanjut).toBeEnabled();
    await page.reload();
    await expectLocationScreen(page);
    await expect(
      locationScreen(page).getByRole("textbox", { name: "Nama lokasi" }),
    ).toHaveValue("Cabang Baru");
    await expect(
      locationScreen(page).getByRole("textbox", { name: "Alamat atau area" }),
    ).toHaveValue("Jl. Fiksi 40");
    await pressLanjut(page);
    await throughDetailScreens(page);
  });

  test("a product target typed by hand carries Dari Anda and survives a reload", async ({
    page,
  }) => {
    await stubPreparationDraft(page, richDraft);
    await fillEntry(page);
    await pressPeriksa(page);
    await confirmBrand(page);
    await chooseFocus(page, "Satu produk atau layanan");
    await pressLanjut(page);
    await expectProductScreen(page);
    await expect(
      productScreen(page).getByRole("radio", { name: "kopi susu" }),
    ).toContainText("Dari website Anda");
    await productScreen(page)
      .getByRole("button", { name: "Tambah produk atau layanan lain" })
      .click();
    await productScreen(page)
      .getByRole("textbox", { name: "Nama produk atau layanan" })
      .fill("paket rapat");
    await expect(
      productScreen(page).getByRole("radio", { name: /paket rapat/ }),
    ).toContainText("Dari Anda");
    await page.reload();
    await expectProductScreen(page);
    await pressLanjut(page);
    await throughDetailScreens(page);
    const focusRow = page.locator('section[aria-label="Fokus audit"]');
    await expect(focusRow).toContainText("Satu produk atau layanan");
    await expect(focusRow).toContainText("paket rapat");
  });

  test("manual typing survives a transient match with a published row", async ({
    page,
  }) => {
    await stubPreparationDraft(page, richDraft);
    await fillEntry(page);
    await pressPeriksa(page);
    await confirmBrand(page);
    await chooseFocus(page, "Satu lokasi");
    await pressLanjut(page);
    await expectLocationScreen(page);
    await locationScreen(page)
      .getByRole("button", { name: "Tambah lokasi lain" })
      .click();
    const name = locationScreen(page).getByRole("textbox", {
      name: "Nama lokasi",
    });
    const address = locationScreen(page).getByRole("textbox", {
      name: "Alamat atau area",
    });
    await name.pressSequentially("Kedai Fiksi Dago");
    // Mid-typing the pair equals the published row at
    // "Jl. Fiksi Raya No. 10, Bandung" — the name must survive the match.
    await address.pressSequentially("Jl. Fiksi Raya No. 10, Bandung Wetan");
    await expect(name).toHaveValue("Kedai Fiksi Dago");
    await expect(address).toHaveValue("Jl. Fiksi Raya No. 10, Bandung Wetan");

    await pressKembali(page);
    await expectFocusScreen(page);
    await chooseFocus(page, "Satu produk atau layanan");
    await pressLanjut(page);
    await expectProductScreen(page);
    await productScreen(page)
      .getByRole("button", { name: "Tambah produk atau layanan lain" })
      .click();
    const product = productScreen(page).getByRole("textbox", {
      name: "Nama produk atau layanan",
    });
    // "kopi susu" is a published offering — typing through it must keep
    // the draft instead of collapsing to the suffix after the match.
    await product.pressSequentially("kopi susu premium");
    await expect(product).toHaveValue("kopi susu premium");
    await expect(
      productScreen(page).getByRole("radio", { name: /kopi susu premium/ }),
    ).toContainText("Dari Anda");
  });

  test("locations whose source page lives off the business host are never offered", async ({
    page,
  }) => {
    // Every published location points at a foreign host (M2): the cabang card
    // disappears and only the manual link leads to the location screen.
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
    await fillEntry(page);
    await pressPeriksa(page);
    await confirmBrand(page);
    await expect(
      focusScreen(page).getByRole("radio", { name: "Satu lokasi" }),
    ).toHaveCount(0);
    await focusScreen(page)
      .getByRole("button", { name: "Isi lokasi secara manual" })
      .click();
    await expectLocationScreen(page);
    await locationScreen(page)
      .getByRole("textbox", { name: "Nama lokasi" })
      .fill("Satu-satunya gerai");
    await locationScreen(page)
      .getByRole("textbox", { name: "Alamat atau area" })
      .fill("Jl. Fiksi 1, Bandung");
    await pressLanjut(page);
    await throughDetailScreens(page);
  });

  test("Ubah on the summary focus row re-opens the focus screen and Kembali returns to the summary", async ({
    page,
  }) => {
    await enter(page);
    const focusRow = page.locator('section[aria-label="Fokus audit"]');
    await focusRow.getByRole("button", { name: "Ubah" }).click();
    await expectFocusScreen(page);
    await pressKembali(page);
    await expectSummary(page);
    // The read-back row still reports the unchanged whole-brand focus.
    await expect(focusRow).toContainText("Brand secara keseluruhan");
  });

  test("the focus and location screens hold within a 320px viewport", async ({
    page,
  }) => {
    const noOverflow = async () =>
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    await stubPreparationDraft(page, richDraft);
    await page.setViewportSize({ width: 320, height: 720 });
    await fillEntry(page);
    await pressPeriksa(page);
    await confirmBrand(page);
    await expectFocusScreen(page);
    await noOverflow();
    await chooseFocus(page, "Satu lokasi");
    await pressLanjut(page);
    await expectLocationScreen(page);
    await noOverflow();
    await locationScreen(page)
      .getByRole("button", { name: "Tambah lokasi lain" })
      .click();
    await noOverflow();
  });
});

test.describe("J5 business-detail screens", () => {
  test("the category screen labels Nuave suggestions and keeps a typed pick", async ({
    page,
  }) => {
    await stubPreparationDraft(page, richDraft);
    await fillEntry(page);
    await pressPeriksa(page);
    await confirmBrand(page);
    await pressLanjut(page);
    await expectCategoryScreen(page);
    const group = categoryScreen(page).getByRole("radiogroup", {
      name: "Pilihan kategori",
    });
    // An overlapping suggestion keeps the selected website value's origin.
    const kedaiKopi = group.getByRole("radio", { name: /kedai kopi/ });
    await expect(kedaiKopi).toContainText("Dari website Anda");
    await expect(kedaiKopi).toBeChecked();
    await expect(group.getByRole("radio", { name: /^kafe/ })).toBeVisible();
    // Typing over the prepared pick replaces it with a `Dari Anda` card.
    await categoryScreen(page)
      .getByRole("button", { name: "Tulis kategori sendiri" })
      .click();
    await categoryScreen(page)
      .getByRole("textbox", { name: "Kategori" })
      .fill("rumah makan keluarga");
    const own = group.getByRole("radio", { name: /rumah makan keluarga/ });
    await expect(own).toBeChecked();
    await expect(own).toContainText("Dari Anda");
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
    await fillEntry(page);
    await pressPeriksa(page);
    await confirmBrand(page);
    await pressLanjut(page);
    // Prepared values keep every detail screen's Lanjut enabled.
    await pressLanjut(page);
    await expectOfferingsScreen(page);
    await pressLanjut(page);
    await expectTargetCustomerScreen(page);
    await pressLanjut(page);
    await expectCustomerNeedsScreen(page);
    await pressLanjut(page);
    await expectDecisionConsiderationsScreen(page);
    await pressLanjut(page);
    await expectServiceScreen(page);
    await pressLanjut(page);
    await expectMarketScreen(page);
    // All eight prepared areas sit selected; typing a ninth is refused with a
    // visible block while Lanjut stays enabled for the valid set.
    const areaInput = marketScreen(page).getByRole("textbox", {
      name: "Tambah area lain",
    });
    await areaInput.fill("Denpasar");
    await marketScreen(page).getByRole("button", { name: "Tambahkan" }).click();
    await expect(areaInput).toHaveValue("Denpasar");
    await expect(marketScreen(page).getByRole("alert")).toContainText(
      "dibatasi paling banyak 8",
    );
    await pressLanjut(page);
    await throughCompetitorContext(page);
    await expect(
      page.locator('section[aria-label="Jangkauan pasar"]'),
    ).toContainText("Makassar");
  });

  test("the service screen keeps multiple channels and the detail screens hold at 320px", async ({
    page,
  }) => {
    const noOverflow = async () =>
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    await stubPreparationDraft(page, richDraft);
    await page.setViewportSize({ width: 320, height: 720 });
    await fillEntry(page);
    await pressPeriksa(page);
    await confirmBrand(page);
    await pressLanjut(page);
    await expectCategoryScreen(page);
    await noOverflow();
    await pressLanjut(page);
    await expectOfferingsScreen(page);
    await noOverflow();
    await pressLanjut(page);
    await expectTargetCustomerScreen(page);
    await noOverflow();
    await pressLanjut(page);
    await expectCustomerNeedsScreen(page);
    await noOverflow();
    await pressLanjut(page);
    await expectDecisionConsiderationsScreen(page);
    await noOverflow();
    await pressLanjut(page);
    await expectServiceScreen(page);
    await noOverflow();
    // A second channel stacks on the prepared pick.
    await serviceScreen(page)
      .getByRole("checkbox", { name: "Digunakan secara online" })
      .click();
    await pressLanjut(page);
    await expectMarketScreen(page);
    await noOverflow();
    await pressLanjut(page);
    await throughCompetitorContext(page);
    const serviceRow = page.locator('section[aria-label="Cara layanan"]');
    await expect(serviceRow).toContainText("Di lokasi bisnis Anda");
    await expect(serviceRow).toContainText("Dikirim ke pelanggan");
    await expect(serviceRow).toContainText("Digunakan secara online");
    await expect(serviceRow).toContainText("Dari Anda");
  });
});

test.describe("J7 review and Nama lain aliases", () => {
  test("the Bisnis row returns brand edits by Lanjut, Kembali, and browser Back", async ({
    page,
  }) => {
    await enter(page);
    for (const back of ["lanjut", "footer", "browser"] as const) {
      await editBusinessFromReview(page);
      await expectBrandConfirm(page);
      if (back === "lanjut") await pressLanjut(page);
      else if (back === "footer") await pressKembali(page);
      else await page.goBack();
      await expectSummary(page);
    }
    // `Ubah website` opens the entry fields with the current answers kept.
    await editWebsiteFromReview(page);
    await expect(entryScreen(page)).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "URL website publik" }),
    ).toHaveValue("https://kedai-fiksi.example/");
    await expect(
      page.getByRole("textbox", { name: "Nama bisnis" }),
    ).toHaveValue("Kedai Fiksi");
  });

  test("aliases add and remove individually and persist over a reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await enter(page);
    const row = reviewRow(page, "Nama lain");
    await expect(row).toContainText("Kedai Fiksi Bandung");
    await expect(row).toContainText("Dari website Anda");
    await openAliasEditor(page, true);
    await expect(aliasInput(page)).toBeFocused();
    // Enter commits an addition through the same AddLine acceptance seam.
    await aliasInput(page).fill("Kedai Fiksi Pusat");
    await aliasInput(page).press("Enter");
    await expect(row).toContainText("Kedai Fiksi Pusat");
    await expect(aliasInput(page)).toHaveValue("");
    await addAlias(page, "KopiFiksi");
    await expect(row).toContainText("KopiFiksi");
    await expect(row).toContainText("Dari Anda");
    let saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual([
      "Kedai Fiksi Bandung",
      "Kedai Fiksi Pusat",
      "KopiFiksi",
    ]);
    expect(saved.selection.origins.aliases).toBe("owner");
    const boundaryAlias = "A".repeat(160);
    await addAlias(page, boundaryAlias);
    expect((await intakeSession(page)).selection.aliases).toContain(
      boundaryAlias,
    );
    // The 320px review and open editor stay inside the viewport, 160-char
    // chip included.
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await removeAlias(page, boundaryAlias);
    await page.reload();
    await expectSummary(page);
    saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual([
      "Kedai Fiksi Bandung",
      "Kedai Fiksi Pusat",
      "KopiFiksi",
    ]);
    await openAliasEditor(page);
    await removeAlias(page, /KopiFiksi/, true);
    saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual([
      "Kedai Fiksi Bandung",
      "Kedai Fiksi Pusat",
    ]);
    // Removing every alias is valid; the provenance badge hides.
    await removeAlias(page, /Kedai Fiksi Bandung/);
    await removeAlias(page, /Kedai Fiksi Pusat/);
    await expect(row).toContainText("Belum diisi");
    await expect(row).not.toContainText("Dari Anda");
    saved = await intakeSession(page);
    expect(saved.selection.aliases).toEqual([]);
  });

  test("invalid aliases are refused with the draft kept for a retry", async ({
    page,
  }) => {
    await enter(page);
    await openAliasEditor(page);
    // Trimmed case-insensitive duplicates are refused with the draft kept.
    await addAlias(page, "  kedai fiksi bandung ");
    await expect(reviewScreen(page).getByRole("alert")).toContainText(
      "sudah ada",
    );
    await expect(aliasInput(page)).toHaveValue("  kedai fiksi bandung ");
    // Overlong names are refused the same way.
    const longName = `Nama lain ${"sangat ".repeat(30)}`;
    await addAlias(page, longName);
    await expect(reviewScreen(page).getByRole("alert")).toContainText(
      "160 karakter",
    );
    await expect(aliasInput(page)).toHaveValue(longName);
    // The rejected draft corrects in place and commits.
    await addAlias(page, "Kedai Fiksi Pusat");
    await expect(aliasInput(page)).toHaveValue("");
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
    await expect(reviewScreen(page).getByRole("alert")).toContainText(
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
      page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
    ).toBeVisible();
    // The refused draft stays; the committed list and session stay safe.
    await expect(aliasInput(page)).toHaveValue("nomor rekening 12345");
    const saved = await intakeSession(page);
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
    // The Bisnis row carries the source, and `Lihat sumber` lists the links.
    await expect(reviewRow(page, "Bisnis")).toContainText(
      "kedai-fiksi.example",
    );
    await reviewScreen(page)
      .getByRole("button", { name: "Lihat sumber" })
      .click();
    await expect(
      reviewScreen(page)
        .getByRole("link", { name: /kedai-fiksi\.example/ })
        .first(),
    ).toBeVisible();
    await openAliasEditor(page);
    await addAlias(page, "Kedai Fiksi Pusat");
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
