import { expect, test, type Page } from "@playwright/test";

const richDraft = {
  brand_name: "Kedai Fiksi",
  entity_scope: "",
  brand_type: "",
  category: "kedai kopi",
  market_context: "Narasi pasar bukan data terstruktur",
  service_channels: ["on_premise", "delivery"],
  market_reach: "sekitar",
  market_areas: ["Bandung"],
  target_customer: "pekerja sekitar",
  official_sources: ["https://kedai-fiksi.example/"],
  verified_offerings: ["kopi susu", "roti"],
  verified_customer_needs: ["minuman dekat kantor"],
  verified_decision_criteria: ["lokasi"],
  similar_businesses: [{ name: "Kedai Tetangga" }],
  brand_name_variants: [],
  priority_offering: "",
  conversion_action: "",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  evidence: [],
  warnings: [],
};

async function enter(page: Page, rich = true) {
  if (rich) {
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
    await page.route("**/api/audit/extract", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draft: richDraft,
          telemetry: [],
          preparation_mode: "synthetic-local",
        }),
      }),
    );
  }
  await page.goto("/audit");
  await page.getByRole("textbox", { name: "Nama bisnis" }).fill("Kedai Fiksi");
  await page
    .getByRole("textbox", { name: "URL website publik" })
    .fill("https://kedai-fiksi.example/");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ini yang Nuave pahami." }),
  ).toBeVisible();
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
  await page.goto("/audit");
  await page.getByRole("textbox", { name: "Nama bisnis" }).fill("Kedai Fiksi");
  await page
    .getByRole("textbox", { name: "URL website publik" })
    .fill("https://kedai-fiksi.example/");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await expect(page.getByText("Ekstraksi sementara gagal.")).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("nuave.localIntake.v2") ?? "{}"),
  );
  expect(saved.identity.canonicalUrl).toBe("https://kedai-fiksi.example/");
  expect(saved.preparationCalls).toMatchObject([failedCall]);
  await page.reload();
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ini yang Nuave pahami." }),
  ).toBeVisible();
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
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await started;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Siapkan pertanyaan audit" }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("nuave.localIntake.v2") ?? "{}"),
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
    page.getByText("Informasi sensitif terdeteksi", { exact: false }),
  ).toBeVisible();
  await expect(differentiator).toHaveValue("Racikan kopi khas");
  const saved = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("nuave.localIntake.v2") ?? "{}"),
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
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  const frozen = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("nuave.localIntake.v2") ?? "{}"),
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
  await expect(
    page.getByRole("button", { name: "Brand secara keseluruhan" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("checkbox", { name: "Di lokasi bisnis Anda" }),
  ).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Bandung" })).toBeChecked();
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  expect(calls).toEqual([
    "GET /api/audit/identity",
    "POST /api/audit/extract",
    "POST /api/audit/glm-questions",
  ]);
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  expect(
    calls.filter((call) => call === "POST /api/audit/glm-questions"),
  ).toHaveLength(1);
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
  const category = page.locator(
    'section[aria-label="Kategori dan penawaran utama"]',
  );
  await category.getByRole("textbox", { name: "Kategori" }).fill("kedai kopi");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .fill("kopi susu");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .press("Enter");
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
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
  await enter(page);
  await page.getByRole("button", { name: "Satu produk atau layanan" }).click();
  await page.getByRole("radio", { name: "roti" }).click();
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  expect(contexts[0]).toMatchObject({
    focus: { value: { kind: "produk", name: "roti" } },
    offerings: { value: ["roti"] },
  });
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  await page.getByRole("button", { name: "Satu lokasi" }).click();
  await page.getByRole("textbox", { name: "Nama lokasi" }).fill("Cabang Timur");
  await page
    .getByRole("textbox", { name: "Alamat lokasi" })
    .fill("Jl. Contoh 12");
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
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
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  const category = page.locator(
    'section[aria-label="Kategori dan penawaran utama"]',
  );
  await category.getByRole("button", { name: "Ubah" }).click();
  await category.getByRole("textbox", { name: "Kategori" }).fill("warung kopi");
  await page.getByRole("button", { name: "Batalkan perubahan" }).click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  expect(questions).toHaveLength(1);
  await page
    .getByRole("button", { name: "Kembali ke informasi bisnis" })
    .click();
  await category.getByRole("button", { name: "Ubah" }).click();
  await category.getByRole("textbox", { name: "Kategori" }).fill("warung kopi");
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  expect(questions).toHaveLength(2);
  expect(
    (questions[1] as { intake: { factVersion: number } }).intake.factVersion,
  ).toBe(2);
});

test("identity correction requires explicit Periksa and a new reading", async ({
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
  await expect(page.locator('[data-intake-screen="entry"]')).toBeVisible();
  expect(calls).toHaveLength(2);
  await page
    .getByRole("textbox", { name: "Nama bisnis" })
    .fill("Kedai Fiksi Baru");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ini yang Nuave pahami." }),
  ).toBeVisible();
  expect(calls).toHaveLength(4);
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
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
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
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  expect(contexts[1]).toMatchObject({
    comparators: { value: { mode: "category-alternatives" } },
  });
  expect(
    (contexts[1]!.comparators as { value: Record<string, unknown> }).value,
  ).not.toHaveProperty("names");
});
