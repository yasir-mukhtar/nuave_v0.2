import { expect, test, type Page } from "@playwright/test";
import {
  brandScreen,
  categorySection,
  chooseFocus,
  confirmBrand,
  confirmFocus,
  confirmSummary,
  entryScreen,
  expectBrandConfirm,
  expectFocusScreen,
  expectLocationScreen,
  expectProductScreen,
  expectSummary,
  expectTenQuestions,
  fillEntry,
  focusScreen,
  INTAKE_SESSION_KEY,
  locationScreen,
  pressKembali,
  pressLanjut,
  pressPeriksa,
  productScreen,
  RICH_PREPARATION_DRAFT,
  SENSITIVE_INPUT_NOTICE,
  stubPreparationDraft,
  toSummary,
} from "./journey";

const richDraft = RICH_PREPARATION_DRAFT;

async function enter(page: Page, rich = true) {
  if (rich) await stubPreparationDraft(page, richDraft);
  await toSummary(page);
}

test("failed extraction keeps validated identity and forwards its call ledger on retry", async ({
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
  await expect(page.getByText("Ekstraksi sementara gagal.")).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(saved.identity.canonicalUrl).toBe("https://kedai-fiksi.example/");
  expect(saved.preparationCalls).toMatchObject([failedCall]);
  await page.reload();
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await confirmBrand(page);
  expect(
    calls.filter((call) => call === "GET /api/audit/identity"),
  ).toHaveLength(1);
  expect(
    calls.filter((call) => call === "POST /api/audit/extract"),
  ).toHaveLength(2);
  expect(
    (extractionBodies[1]!.budget as { calls: unknown[] }).calls,
  ).toMatchObject([failedCall]);
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
    (key) => JSON.parse(sessionStorage.getItem(key) ?? "{}"),
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
  const differentiator = page.getByRole("textbox", { name: /Pembeda bisnis/ });
  await differentiator.fill("Racikan kopi khas");
  await differentiator.fill("nomor rekening 12345");
  await expect(
    page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
  ).toBeVisible();
  await expect(differentiator).toHaveValue("Racikan kopi khas");
  const saved = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(saved.selection.differentiator).toBe("Racikan kopi khas");
  expect(JSON.stringify(saved)).not.toContain("nomor rekening");
});

test("every manually selected comparator stays visible, correctable and removable", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("radio", { name: "Bisnis yang saya pilih" }).check();
  await page
    .getByRole("textbox", { name: "Nama pembanding lain" })
    .fill("Kedai Baru");
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  const selected = page.getByRole("textbox", { name: "Pembanding terpilih 1" });
  await expect(selected).toHaveValue("Kedai Baru");
  await selected.fill("Kedai Pilihan");
  await confirmSummary(page);
  await expectTenQuestions(page);
  const frozen = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key) ?? "{}"),
    INTAKE_SESSION_KEY,
  );
  expect(frozen.frozen.context.comparators.value).toEqual({
    mode: "named",
    names: ["Kedai Pilihan"],
  });
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Pembanding terpilih 1" }),
  ).toHaveValue("Kedai Pilihan");
  await page
    .getByRole("button", { name: "Hapus pembanding Kedai Pilihan" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Pembanding terpilih 1" }),
  ).toHaveCount(0);
});

test("rich reading reaches one summary and question review without more typing", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/audit/"))
      calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await enter(page);
  await expect(page.locator('[data-smart-summary="ready"]')).toBeVisible();
  const focusRow = page.locator('section[aria-label="Fokus audit"]');
  await expect(focusRow).toContainText("Brand secara keseluruhan");
  await expect(focusRow).toContainText("Saran Nuave");
  await expect(
    page.getByRole("checkbox", { name: "Di lokasi bisnis Anda" }),
  ).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Bandung" })).toBeChecked();
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
    (key) => JSON.parse(sessionStorage.getItem(key) ?? "{}").prepared,
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
    (key) => JSON.parse(sessionStorage.getItem(key) ?? "{}").prepared,
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
  await page.addInitScript((v5Key) => {
    sessionStorage.setItem(
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
    // A well-formed v4 record under its own key is never read: the current
    // key is v5, and older keys are simply not looked at.
    sessionStorage.setItem(
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
    // A stale-version record under the current v5 key is just as unreadable —
    // it must restart at entry rather than mix old and new shape.
    sessionStorage.setItem(
      v5Key,
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

test("partial extraction opens one clarification while channel and reach stay on summary", async ({
  page,
}) => {
  await enter(page, false);
  await expect(page.locator('[data-smart-summary="ready"]')).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lengkapi yang perlu dipastikan" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Di lokasi bisnis Anda" }).click();
  await page.getByRole("button", { name: "Seluruh Indonesia" }).click();
  await page
    .getByRole("button", { name: "Lengkapi yang perlu dipastikan" })
    .click();
  await expect(page.locator('[data-smart-summary="clarify"]')).toBeVisible();
  const category = categorySection(page);
  await category.getByRole("textbox", { name: "Kategori" }).fill("kedai kopi");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .fill("kopi susu");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .press("Enter");
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
  await expectSummary(page);
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
  const category = categorySection(page);
  await category.getByRole("button", { name: "Ubah" }).click();
  await category.getByRole("textbox", { name: "Kategori" }).fill("warung kopi");
  await page.getByRole("button", { name: "Batalkan perubahan" }).click();
  await expectTenQuestions(page);
  expect(questions).toHaveLength(1);
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  await category.getByRole("button", { name: "Ubah" }).click();
  await category.getByRole("textbox", { name: "Kategori" }).fill("warung kopi");
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
  await page.getByRole("button", { name: "Ubah nama atau website" }).click();
  await expect(entryScreen(page)).toBeVisible();
  expect(calls).toHaveLength(2);
  await page
    .getByRole("textbox", { name: "Nama bisnis" })
    .fill("Kedai Fiksi Baru");
  await pressPeriksa(page);
  // Name-only correction returns to the brand check without a new read.
  await expectBrandConfirm(page, "Kedai Fiksi Baru");
  expect(calls).toHaveLength(2);
  // A website change invalidates preparation: `Periksa` reads the source again.
  await page.getByRole("button", { name: "Kembali", exact: true }).click();
  await expect(entryScreen(page)).toBeVisible();
  await page
    .getByRole("textbox", { name: "URL website publik" })
    .fill("https://fiksi-lain.example/");
  await pressPeriksa(page);
  await expect(brandScreen(page)).toBeVisible();
  expect(calls).toHaveLength(4);
  await confirmBrand(page);
  await confirmFocus(page);
  await expect(page.locator('[data-smart-summary="ready"]')).toBeVisible();
});

test("named comparators require selection; alternatives carry no company names", async ({
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
  await page.getByRole("radio", { name: "Bisnis yang saya pilih" }).click();
  await page.getByRole("checkbox", { name: "Kedai Tetangga" }).click();
  await page
    .getByRole("textbox", { name: "Nama pembanding lain" })
    .fill("Warung Fiksi");
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
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
    .getByRole("radio", { name: /Tidak ada pembanding langsung/ })
    .click();
  await confirmSummary(page);
  await expectTenQuestions(page);
  expect(contexts[1]).toMatchObject({
    comparators: { value: { mode: "category-alternatives" } },
  });
  expect(
    (contexts[1]!.comparators as { value: Record<string, unknown> }).value,
  ).not.toHaveProperty("names");
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
      "POST /api/audit/extract",
    ]);
    // Whole-brand continues straight to the summary.
    await chooseFocus(page, "Brand secara keseluruhan");
    await pressLanjut(page);
    await expectSummary(page);
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
    await expectSummary(page);
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
    await expectSummary(page);
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
    await expectSummary(page);
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
    await expectSummary(page);
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
