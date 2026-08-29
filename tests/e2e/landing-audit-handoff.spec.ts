import { expect, test, type Locator, type Page } from "@playwright/test";
import { AUDIT_WORKFLOW_STORAGE_KEY } from "../../src/lib/audit/workflow-storage";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
} from "../../src/lib/audit/variance";
import {
  expectNoHorizontalScroll,
  expectReadyReport,
  grantAccess,
  seedFixtureState,
  v3ReadyState,
} from "./helpers";

const SOURCE = "https://example.com/";

function extractionDraft() {
  return {
    brand_name: "Example Business",
    entity_scope: "Example Business",
    brand_type: "Business",
    category: "Coffee shop",
    market_context: "Indonesia",
    target_customer: "Customers",
    official_sources: [SOURCE],
    verified_offerings: ["Coffee"],
    verified_customer_needs: [],
    verified_decision_criteria: [],
    brand_name_variants: ["Example Business"],
    priority_offering: "Coffee",
    conversion_action: "Visit website",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    evidence: [],
    warnings: [],
  };
}

function promptPack() {
  const categories = [
    "need_discovery",
    "solution_discovery",
    "comparison",
    "validation",
    "action",
  ] as const;
  return {
    status: "draft_for_review",
    prompt_pack_version: "test-progressive-business-facts-v1",
    language: "id-ID",
    target_product: "ChatGPT",
    brand: {
      brand_name: "Example Business",
      entity_scope: "Example Business",
      brand_type: "Business",
      category: "Coffee shop",
      market_context: "Indonesia",
      target_customer: "Customers",
    },
    summary: {
      total_prompts: 10,
      unbranded_prompts: 5,
      branded_prompts: 5,
    },
    prompts: categories.flatMap((category, categoryIndex) =>
      [false, true].map((branded, pairIndex) => ({
        prompt_id: `q-${categoryIndex}-${pairIndex}`,
        category,
        role: "customer",
        branded,
        question: branded
          ? `Apakah Example Business cocok untuk kebutuhan ${categoryIndex + 1}?`
          : `Apa pilihan yang cocok untuk kebutuhan ${categoryIndex + 1}?`,
        rationale: "Test rationale",
        inputs_used: ["brand_name"],
        review_status: "needs_human_review",
      })),
    ),
    self_check: {
      ten_prompts: true,
      two_per_category: true,
      five_unbranded: true,
      five_branded: true,
      no_brand_leakage: true,
      verified_inputs_only: true,
      verified_competitor_only: true,
      single_entity_scope: true,
      category_safety_pass: true,
      independent_natural_questions: true,
    },
    warnings: [],
  };
}

async function stubExtraction(
  page: Page,
  options: { holdPost?: boolean } = {},
) {
  let budgetCalls = 0;
  let extractCalls = 0;
  let requestedSource = "";
  let releasePost: (() => void) | null = null;
  const postGate = options.holdPost
    ? new Promise<void>((resolve) => {
        releasePost = resolve;
      })
    : null;

  await page.route("**/api/audit/extract", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      budgetCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          limit_usd: 5,
          carryover_cost_usd: 0,
          calls: [],
        }),
      });
      return;
    }

    if (method === "POST") {
      extractCalls += 1;
      const request = route.request().postDataJSON() as { website_url?: string };
      requestedSource = request.website_url ?? "";
      if (postGate) await postGate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ draft: extractionDraft(), telemetry: [] }),
      });
      return;
    }

    await route.abort();
  });

  return {
    budgetCalls: () => budgetCalls,
    extractCalls: () => extractCalls,
    requestedSource: () => requestedSource,
    releasePost: () => releasePost?.(),
  };
}

async function stubPrompts(page: Page) {
  let requestBody: unknown = null;
  await page.route("**/api/audit/prompts", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ pack: promptPack(), telemetry: [] }),
    });
  });
  return { requestBody: () => requestBody };
}

async function expectTouchTarget(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  expect(box, `${label} should be rendered`).not.toBeNull();
  expect(Math.round(box?.width ?? 0), `${label} width`).toBeGreaterThanOrEqual(44);
  expect(Math.round(box?.height ?? 0), `${label} height`).toBeGreaterThanOrEqual(44);
}

async function submitLanding(page: Page) {
  const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
  await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await hero.getByRole("button", { name: "Lanjutkan audit" }).click();
  await expect(page).toHaveURL(/\/audit$/);
  await expect(page.getByRole("heading", { name: "Brand Anda", level: 1 })).toBeVisible();
}

async function next(page: Page) {
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
}

async function goToMarket(page: Page) {
  await next(page);
  await expect(page.getByRole("heading", { name: "Produk atau layanan", level: 1 })).toBeVisible();
  await next(page);
  await expect(page.getByRole("heading", { name: "Calon pelanggan", level: 1 })).toBeVisible();
  await next(page);
  await expect(page.getByRole("heading", { name: "Pasar dan bisnis serupa", level: 1 })).toBeVisible();
}

async function goToReview(page: Page) {
  await goToMarket(page);
  await next(page);
  await expect(page.getByRole("heading", { name: "Konteks utama sudah siap", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Lanjutkan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Detail tambahan", level: 1 })).toBeVisible();
  await next(page);
  await expect(page.getByRole("heading", { name: "Periksa dan konfirmasi", level: 1 })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test.describe("landing audit hero handoff", () => {
  test("landing stays side-effect free until the user submits", async ({ page }) => {
    let auditRequests = 0;
    await page.route("**/api/audit/**", async (route) => {
      auditRequests += 1;
      await route.abort();
    });

    await page.goto("/");
    const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
    await expect(
      hero.getByRole("heading", {
        name: "Saat customer minta rekomendasi ke ChatGPT, apakah brand Anda disebut?",
      }),
    ).toBeVisible();
    await expect(hero.getByPlaceholder("https://bisnisanda.com")).toBeVisible();
    expect(auditRequests).toBe(0);
  });

  test("invalid input stays on the landing and makes no audit request", async ({
    page,
  }) => {
    let auditRequests = 0;
    await page.route("**/api/audit/**", async (route) => {
      auditRequests += 1;
      await route.abort();
    });

    await page.goto("/");
    const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
    await hero.getByPlaceholder("https://bisnisanda.com").fill("not a website");
    await hero.getByRole("button", { name: "Lanjutkan audit" }).click();

    await expect(
      hero.getByText(
        "Masukkan link website resmi atau akun Instagram yang valid.",
      ),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/");
    expect(auditRequests).toBe(0);
  });

  test("valid submission remains on landing while extraction is pending", async ({
    page,
  }) => {
    const calls = await stubExtraction(page, { holdPost: true });

    await page.goto("/");
    const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
    const input = hero.getByPlaceholder("https://bisnisanda.com");
    const submit = hero.getByRole("button", { name: "Lanjutkan audit" });
    await input.fill("example.com");
    await submit.click();

    await expect.poll(calls.extractCalls).toBe(1);
    expect(calls.requestedSource()).toBe(SOURCE);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(hero).toBeVisible();
    await expect(input).toBeDisabled();
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("heading", { name: "Brand Anda" })).toHaveCount(0);
    expect(calls.extractCalls()).toBe(1);

    calls.releasePost();
    await expect(page).toHaveURL(/\/audit$/);
  });

  test("successful extraction enters the progressive populated brief without re-extracting", async ({
    page,
  }) => {
    const calls = await stubExtraction(page);

    await page.goto("/");
    await submitLanding(page);

    const brandNameInput = page.getByRole("textbox", { name: "Nama brand*" });
    await expect(brandNameInput).toHaveValue("Example Business");
    await expect(page.getByRole("textbox", { name: "Kategori*" })).toHaveValue(
      "Coffee shop",
    );
    await brandNameInput.fill("Edited Example Business");
    await next(page);
    await expect(page.getByRole("textbox", { name: "Produk atau layanan*" })).toHaveValue(
      "Coffee",
    );
    await page.getByRole("button", { name: "Kembali" }).click();
    await expect(brandNameInput).toHaveValue("Edited Example Business");

    expect(calls.extractCalls()).toBe(1);
    await page.waitForTimeout(300);
    expect(calls.extractCalls()).toBe(1);
  });

  test("a stale saved audit cannot win over a new landing extraction", async ({
    page,
  }) => {
    const calls = await stubExtraction(page);
    await page.addInitScript(
      ({ workflowKey, varianceKey, failureKey }) => {
        window.sessionStorage.setItem(
          workflowKey,
          JSON.stringify({
            websiteUrl: "https://stale.example/",
            brief: {
              brand_name: "Stale Business",
              entity_scope: "Stale Business",
              brand_type: "Business",
              category: "Old category",
              market_context: "Old market",
              target_customer: "Old customers",
              official_sources: ["https://stale.example/"],
              verified_offerings: ["Old offering"],
              verified_customer_needs: [],
              verified_decision_criteria: [],
              verified_competitor: { name: "", scope: "", source_url: "" },
              similar_businesses: [],
              brand_name_variants: [],
              priority_offering: "",
              conversion_action: "",
              customer_supplied_facts: [],
              known_accuracy_questions: [],
              usp: "",
              regulated_category_notes: "",
              language: "en-US",
              agency_name: "",
              agency_logo_data_url: "",
            },
            factsExtracted: true,
            factsConfirmed: false,
            factsCustomerOwned: false,
            extraction: null,
            promptPack: null,
            observations: [],
            report: null,
            setupTelemetry: [],
            executionStarted: false,
            postReportBudgetCalls: [],
            reportFailureCode: null,
          }),
        );
        window.sessionStorage.setItem(varianceKey, JSON.stringify({ stale: true }));
        window.sessionStorage.setItem(failureKey, JSON.stringify({ stale: true }));
      },
      {
        workflowKey: AUDIT_WORKFLOW_STORAGE_KEY,
        varianceKey: VARIANCE_STORAGE_KEY,
        failureKey: VARIANCE_FAILURE_STORAGE_KEY,
      },
    );

    await page.goto("/");
    await submitLanding(page);
    const brandNameInput = page.getByRole("textbox", { name: "Nama brand*" });
    await expect(brandNameInput).toHaveValue("Example Business");
    await expect(brandNameInput).not.toHaveValue("Stale Business");
    expect(calls.extractCalls()).toBe(1);

    const staleVariance = await page.evaluate(
      ({ varianceKey, failureKey }) => ({
        variance: window.sessionStorage.getItem(varianceKey),
        failure: window.sessionStorage.getItem(failureKey),
      }),
      {
        varianceKey: VARIANCE_STORAGE_KEY,
        failureKey: VARIANCE_FAILURE_STORAGE_KEY,
      },
    );
    expect(staleVariance).toEqual({ variance: null, failure: null });
  });

  for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1280, height: 800 },
  ]) {
    test(`hero and landing remain horizontally contained at ${viewport.name} width`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
      await expect(hero).toBeVisible();
      await expectNoHorizontalScroll(page);
      await hero
        .getByRole("heading", {
          name: "Saat customer minta rekomendasi ke ChatGPT, apakah brand Anda disebut?",
        })
        .scrollIntoViewIfNeeded();
      await expectNoHorizontalScroll(page);
      await page
        .getByRole("heading", { name: "Pertanyaan umum" })
        .scrollIntoViewIfNeeded();
      await expectNoHorizontalScroll(page);
    });
  }
});

test.describe("progressive business facts", () => {
  test("validates each required step and focuses the first invalid field", async ({ page }) => {
    await stubExtraction(page);
    await page.goto("/");
    await submitLanding(page);

    const brand = page.getByRole("textbox", { name: "Nama brand*" });
    await brand.fill("");
    await next(page);
    await expect(page.getByRole("heading", { name: "Brand Anda", level: 1 })).toBeVisible();
    await expect(brand).toBeFocused();
    await expect(page.getByText("Masukkan nama brand yang valid.")).toBeVisible();

    await brand.fill("Example Business");
    await next(page);
    const offerings = page.getByRole("textbox", { name: "Produk atau layanan*" });
    await offerings.fill("");
    await next(page);
    await expect(page.getByRole("heading", { name: "Produk atau layanan", level: 1 })).toBeVisible();
    await expect(offerings).toBeFocused();

    await offerings.fill("Coffee");
    await next(page);
    const target = page.getByRole("textbox", { name: "Calon pelanggan*" });
    await target.fill("");
    await next(page);
    await expect(page.getByRole("heading", { name: "Calon pelanggan", level: 1 })).toBeVisible();
    await expect(target).toBeFocused();

    await target.fill("Customers");
    await next(page);
    const market = page.getByRole("textbox", { name: "Pasar atau lokasi*" });
    await market.fill("");
    await next(page);
    await expect(page.getByRole("heading", { name: "Pasar dan bisnis serupa", level: 1 })).toBeVisible();
    await expect(market).toBeFocused();

    await market.fill("Indonesia");
    const sources = page.getByRole("textbox", { name: "Sumber resmi*" });
    await sources.fill("not-a-url");
    await next(page);
    await expect(sources).toBeFocused();

    await sources.fill(SOURCE);
    await page.getByRole("button", { name: "Tambah bisnis serupa" }).click();
    const similar = page.getByRole("textbox", { name: "URL bisnis serupa 1" });
    await similar.fill("not-a-business-url");
    await next(page);
    await expect(similar).toBeFocused();
    await expect(
      page.getByText(
        "Masukkan URL website, profil Instagram, atau Google Maps yang valid.",
      ).first(),
    ).toBeVisible();
  });

  test("commits newline-list edits immediately and preserves milestone back behavior", async ({ page }) => {
    await stubExtraction(page);
    await page.goto("/");
    await submitLanding(page);

    await next(page);
    const offerings = page.getByRole("textbox", { name: "Produk atau layanan*" });
    await offerings.fill("Coffee\nTea terakhir");
    await next(page);
    await expect(page.getByRole("heading", { name: "Calon pelanggan", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Kembali" }).click();
    await expect(offerings).toHaveValue("Coffee\nTea terakhir");

    await next(page);
    await next(page);
    const sources = page.getByRole("textbox", { name: "Sumber resmi*" });
    await sources.fill(`${SOURCE}\nhttps://example.org/final`);
    await next(page);
    await expect(page.getByRole("heading", { name: "Konteks utama sudah siap", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Kembali" }).click();
    await expect(sources).toHaveValue(`${SOURCE}\nhttps://example.org/final`);

    await next(page);
    await page.getByRole("button", { name: "Lanjutkan", exact: true }).click();
    const variants = page.getByRole("textbox", { name: "Nama brand lain" });
    await variants.fill("Example Business\nFinal Alias");
    await page.getByRole("button", { name: "Kembali" }).click();
    await expect(page.getByRole("heading", { name: "Pasar dan bisnis serupa", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Konteks utama sudah siap" })).toHaveCount(0);

    await next(page);
    await page.getByRole("button", { name: "Lanjutkan", exact: true }).click();
    await expect(variants).toHaveValue("Example Business\nFinal Alias");
    await next(page);
    await expect(page.getByRole("heading", { name: "Periksa dan konfirmasi", level: 1 })).toBeVisible();
    await expect(page.getByText("Final Alias")).toBeVisible();
  });

  test("review edits return directly to review and final request keeps the existing brief contract", async ({ page }) => {
    await stubExtraction(page);
    const prompts = await stubPrompts(page);
    await page.goto("/");
    await submitLanding(page);
    await goToReview(page);

    const reviewOffer = page
      .getByRole("heading", { name: "Produk atau layanan", level: 2 })
      .locator("xpath=ancestor::section[1]");
    await reviewOffer.getByRole("button", { name: "Ubah" }).click();
    await expect(page.getByRole("heading", { name: "Produk atau layanan", level: 1 })).toBeVisible();
    await page.getByRole("textbox", { name: "Produk atau layanan prioritas" }).fill(
      "Edited priority",
    );
    await next(page);
    await expect(page.getByRole("heading", { name: "Periksa dan konfirmasi", level: 1 })).toBeVisible();
    await expect(page.getByText("Prioritas: Edited priority")).toBeVisible();

    const branding = page.getByRole("button", { name: "Branding laporan — opsional" });
    await branding.click();
    await page.locator("#agency-logo").setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(page.getByAltText("Logo laporan yang diunggah")).toBeVisible();

    const reviewBrand = page
      .getByRole("heading", { name: "Brand", level: 2 })
      .locator("xpath=ancestor::section[1]");
    await reviewBrand.getByRole("button", { name: "Ubah" }).click();
    await page.getByRole("textbox", { name: "Nama brand*" }).fill("Edited Final Brand");
    await next(page);
    await expect(page.getByRole("heading", { name: "Periksa dan konfirmasi", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Branding laporan — opsional" }).click();
    await expect(page.getByAltText("Logo laporan yang diunggah")).toBeVisible();

    const finalAction = page.getByRole("button", { name: "Buat pertanyaan audit" });
    await expect(finalAction).toBeDisabled();
    await page.getByLabel(
      "Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam pertanyaan audit.",
    ).check();
    await expect(finalAction).toBeEnabled();
    await finalAction.click();

    await expect(
      page.getByRole("heading", {
        name: "Review the ten questions before you run the audit.",
      }),
    ).toBeVisible();
    const request = prompts.requestBody() as { brief?: Record<string, unknown> };
    expect(Object.keys(request)).toEqual(["brief"]);
    expect(request.brief).toMatchObject({
      brand_name: "Edited Final Brand",
      priority_offering: "Edited priority",
      language: "en-US",
    });
    expect(request.brief).not.toHaveProperty("businessFactsScreen");
    expect(request.brief).not.toHaveProperty("returnToReview");
  });

  test("refresh preserves canonical facts and restarts at the first internal step", async ({ page }) => {
    await stubExtraction(page);
    await page.goto("/");
    await submitLanding(page);
    await page.getByRole("textbox", { name: "Nama brand*" }).fill("Persisted Brand");
    await goToMarket(page);
    await expect(page.getByRole("heading", { name: "Pasar dan bisnis serupa", level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Brand Anda", level: 1 })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Nama brand*" })).toHaveValue(
      "Persisted Brand",
    );
  });

  test("mobile progressive screens remain contained and actions are reachable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stubExtraction(page);
    await page.goto("/");
    await submitLanding(page);

    await expectNoHorizontalScroll(page);
    await expect(page.getByText("1 dari 6")).toBeVisible();
    await expectTouchTarget(
      page.getByRole("button", { name: "Lanjut", exact: true }),
      "business facts next",
    );
    await next(page);
    await expectNoHorizontalScroll(page);
    await expect(page.getByText("2 dari 6")).toBeVisible();
    await expectTouchTarget(
      page.getByRole("button", { name: "Kembali" }),
      "business facts back",
    );
  });
});

test.describe("mobile touch target policy", () => {
  test("migrated live controls expose approximately 44px hit areas", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const calls = await stubExtraction(page);

    await page.goto("/");
    const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
    await expectTouchTarget(
      hero.getByRole("button", { name: "Lanjutkan audit" }),
      "source submit",
    );
    await expectTouchTarget(
      page.locator('[data-slot="accordion-trigger"]').first(),
      "FAQ disclosure",
    );

    const menuTrigger = page.getByRole("button", { name: "Buka menu" });
    await expectTouchTarget(menuTrigger, "mobile menu trigger");
    await menuTrigger.click();
    const sheetClose = page.getByRole("button", { name: "Close" });
    await expect(sheetClose).toBeVisible();
    await expectTouchTarget(sheetClose, "Sheet close");
    await page.keyboard.press("Escape");
    await expect(sheetClose).toHaveCount(0);

    await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await hero.getByRole("button", { name: "Lanjutkan audit" }).click();
    await expect(page).toHaveURL(/audit$/);
    await expect(page.getByRole("heading", { name: "Brand Anda", level: 1 })).toBeVisible();
    await expectTouchTarget(
      page.getByRole("button", { name: "Lanjut", exact: true }),
      "progressive facts action",
    );

    await goToMarket(page);
    await page.getByRole("button", { name: "Tambah bisnis serupa" }).click();
    await expectTouchTarget(
      page.getByRole("button", { name: "Hapus bisnis serupa 1" }),
      "similar-business remove",
    );
    expect(calls.extractCalls()).toBe(1);
  });

  test("fixture and report actions remain touch-sized on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    seedFixtureState(page, v3ReadyState());
    await page.goto("/audit/fixture");
    await expectReadyReport(page);

    await expectTouchTarget(
      page.getByRole("button", { name: "Download PDF" }).first(),
      "fixture PDF action",
    );
    await expectTouchTarget(
      page.getByRole("button", { name: "Unduh JSON" }),
      "report JSON action",
    );
    await expectTouchTarget(
      page.getByRole("button", { name: "Mulai ulang" }).first(),
      "fixture restart action",
    );

    await page.goto("/audit/spec004");
    await expectTouchTarget(
      page.getByRole("button", { name: "kopitamansenja.example" }),
      "Spec004 example action",
    );
  });
});
