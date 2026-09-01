import { expect, test, type Page } from "@playwright/test";
import { createInitialExtractedAuditWorkflowState } from "../../src/lib/audit/workflow-storage";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
} from "../../src/lib/audit/workflow-storage";
import { createWorkflowMeta } from "../../src/lib/audit/workflow-authority";
import { grantAccess } from "./helpers";

const SOURCE = "https://example.com/";

function draft(overrides: Record<string, unknown> = {}) {
  return {
    brand_name: "Example Business",
    entity_scope: "Seluruh brand Example Business",
    brand_type: "Business",
    category: "Coffee shop",
    market_context: "Indonesia",
    target_customer: "Customers",
    official_sources: [SOURCE],
    verified_offerings: ["Coffee"],
    verified_customer_needs: ["A place to work"],
    verified_decision_criteria: ["Location"],
    similar_businesses: [
      { name: "Peer Coffee", source_url: "", origin: "ai" as const },
    ],
    brand_name_variants: [],
    priority_offering: "Coffee",
    conversion_action: "ignored",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    evidence: [],
    warnings: [],
    ...overrides,
  };
}

async function seed(page: Page, state: unknown) {
  await page.addInitScript(
    ({ workflowKey, sessionKey, stateValue }) => {
      window.sessionStorage.setItem(workflowKey, stateValue);
      window.sessionStorage.setItem(sessionKey, "b1-e2e-session-123456");
    },
    {
      workflowKey: AUDIT_WORKFLOW_STORAGE_KEY,
      sessionKey: AUDIT_SESSION_STORAGE_KEY,
      stateValue: JSON.stringify(state),
    },
  );
  await page.route("**/api/audit/extract", async (route) => {
    if (route.request().method() !== "GET") {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ limit_usd: 5, carryover_cost_usd: 0, calls: [] }),
    });
  });
}

async function readWorkflow(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(window.sessionStorage.getItem(key) || "null"),
    AUDIT_WORKFLOW_STORAGE_KEY,
  );
}

async function goToComparison(page: Page) {
  for (const heading of [
    "Tentukan cakupan audit.",
    "Pilih kategori brand.",
    "Jelaskan konteks pasar.",
    "Kenali pelanggan dan alasannya.",
    "Pilih produk atau layanan yang diverifikasi.",
  ]) {
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Pilih bisnis pembanding yang realistis.",
    }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test.describe("B1 workflow authority", () => {
  test("preserves branch scope and customer edits through one replacement extraction", async ({
    page,
  }) => {
    const initialState = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft({
        entity_scope: "Seluruh brand Example Business",
      }),
      telemetry: [],
    });
    const sourceB = "https://source-b.example/";
    const extractionRequests: Record<string, unknown>[] = [];
    await seed(page, initialState);
    await page.route("**/api/audit/extract", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      extractionRequests.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draft: draft({
            brand_name: "Provider B Name",
            entity_scope: "Seluruh brand Provider B Name",
            brand_type: "Software company from source B",
            category: "Software platform",
            market_context: "Provider B market",
            target_customer: "Provider B customer profile",
            official_sources: [sourceB],
            verified_offerings: ["B SaaS offer"],
            verified_customer_needs: ["B customer need"],
            verified_decision_criteria: ["B decision criterion"],
            similar_businesses: [
              { name: "Source B Suggestion", source_url: "", origin: "ai" },
            ],
            usp: "B differentiator",
          }),
          telemetry: [],
        }),
      });
    });

    await page.goto("/audit");
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Tentukan cakupan audit." }),
    ).toBeVisible();
    await page.getByLabel("Satu cabang atau lokasi").check();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Lengkapi cabang atau lokasi." }),
    ).toBeVisible();
    await page.getByLabel("Nama cabang atau lokasi*").fill("Dago");
    await expect
      .poll(async () => (await readWorkflow(page)).brief.entity_scope)
      .toBe("Cabang: Dago");

    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Pilih kategori brand." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Jelaskan konteks pasar." }),
    ).toBeVisible();
    await page.getByLabel("Market or location*").fill("Bandung, Indonesia");
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Kenali pelanggan dan alasannya." }),
    ).toBeVisible();
    await page
      .getByLabel("Target customer*")
      .fill("Pelanggan yang bekerja malam hari");
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Pilih produk atau layanan yang diverifikasi.",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Pilih bisnis pembanding yang realistis.",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Terima saran Nuave" }).click();
    let saved = await readWorkflow(page);
    expect(saved.brief.verified_competitor.name).toBe("Peer Coffee");

    for (const heading of [
      "Pilih produk atau layanan yang diverifikasi.",
      "Kenali pelanggan dan alasannya.",
      "Jelaskan konteks pasar.",
      "Pilih kategori brand.",
      "Lengkapi cabang atau lokasi.",
      "Tentukan cakupan audit.",
      "Check the client brief before it shapes the audit.",
    ]) {
      await page.getByRole("button", { name: "Kembali" }).first().click();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    await page
      .getByRole("button", { name: "Bukan, ganti brand atau sumber" })
      .click();
    await page
      .getByLabel("Website atau profil Instagram baru (opsional)")
      .fill(sourceB);
    await page.getByLabel("Nama brand yang benar*").fill("Customer B Name");
    await page.getByRole("button", { name: "Baca ulang sumber" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toBeVisible();

    expect(extractionRequests).toHaveLength(1);
    expect(extractionRequests[0]).toMatchObject({
      website_url: sourceB,
      brand_name: "Customer B Name",
      identity_unverified: false,
    });
    saved = await readWorkflow(page);
    expect(saved.extractedSourceUrl).toBe(sourceB);
    expect(saved.brief.official_sources).toEqual([sourceB]);
    expect(saved.extraction.brand_name).toBe("Provider B Name");
    expect(saved.brief.entity_scope).toBe("Cabang: Dago");
    expect(saved.meta.scopeKind).toBe("branch");
    expect(saved.meta.scopeValue).toBe("Dago");
    expect(saved.brief.brand_name).toBe("Customer B Name");
    expect(saved.brief.target_customer).toBe(
      "Pelanggan yang bekerja malam hari",
    );
    expect(saved.brief.market_context).toBe("Bandung, Indonesia");
    expect(saved.brief.brand_type).toBe("Software company from source B");
    expect(saved.brief.category).toBe("Software platform");
    expect(saved.brief.verified_offerings).toEqual(["B SaaS offer"]);
    expect(saved.brief.priority_offering).toBe("B SaaS offer");
    expect(saved.brief.conversion_action).toBe(
      "Minta demo atau hubungi bisnis melalui sumber resmi.",
    );
    expect(saved.brief.verified_competitor).toEqual({
      name: "Peer Coffee",
      scope: "",
      source_url: "",
    });
    expect(saved.meta.comparisonStatus).toBe("needs_reconfirmation");
    expect(saved.meta.preservedCustomerFields).toEqual(
      expect.arrayContaining([
        "brand_name",
        "entity_scope",
        "market_context",
        "target_customer",
        "verified_competitor",
      ]),
    );

    await page
      .getByRole("button", { name: "Bukan, ganti brand atau sumber" })
      .click();
    await page.getByRole("button", { name: "Baca ulang sumber" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toBeVisible();
    expect(extractionRequests).toHaveLength(1);

    for (const heading of [
      "Tentukan cakupan audit.",
      "Lengkapi cabang atau lokasi.",
      "Pilih kategori brand.",
      "Jelaskan konteks pasar.",
      "Kenali pelanggan dan alasannya.",
      "Pilih produk atau layanan yang diverifikasi.",
      "Pilih bisnis pembanding yang realistis.",
    ]) {
      await page.getByRole("button", { name: "Lanjut" }).click();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    await expect(
      page.getByRole("heading", { name: "Konfirmasi ulang target sebelumnya" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nama bisnis pembanding*")).toHaveValue(
      "Peer Coffee",
    );
    await page
      .getByRole("button", { name: "Konfirmasi target sebelumnya" })
      .click();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Tambahkan fakta opsional." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Tinjau brief sebelum membuat pertanyaan.",
      }),
    ).toBeVisible();
    const preservedNotice = page
      .getByRole("alert")
      .filter({ hasText: "Nilai yang dipertahankan dari sumber sebelumnya" });
    await expect(preservedNotice).toBeVisible();
    await expect(preservedNotice).toContainText("Cakupan audit");
    await expect(preservedNotice).toContainText("Cabang: Dago");
    await expect(preservedNotice).toContainText(
      "Pelanggan yang bekerja malam hari",
    );
    await expect(preservedNotice).toContainText("Peer Coffee");
  });

  test("re-extracts once for a corrected source and preserves the corrected name", async ({
    page,
  }) => {
    const initialState = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft(),
      telemetry: [],
    });
    const state = {
      ...initialState,
      meta: {
        ...initialState.meta,
        intakeScreen: "source-correction" as const,
      },
    };
    const extractionRequests: Record<string, unknown>[] = [];
    await seed(page, state);
    await page.route("**/api/audit/extract", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      extractionRequests.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draft: draft({
            brand_name: "Provider Name That Must Not Win",
            official_sources: ["https://new.example/"],
          }),
          telemetry: [],
        }),
      });
    });

    await page.goto("/audit");
    await expect(
      page.getByRole("heading", { name: "Perbaiki sumber dan nama brand." }),
    ).toBeVisible();
    await page
      .getByLabel("Website atau profil Instagram baru (opsional)")
      .fill("https://new.example/");
    await page
      .getByLabel("Nama brand yang benar*")
      .fill("Customer Corrected Name");
    await page.getByRole("button", { name: "Baca ulang sumber" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toBeVisible();

    expect(extractionRequests).toHaveLength(1);
    expect(extractionRequests[0]).toMatchObject({
      website_url: "https://new.example/",
      brand_name: "Customer Corrected Name",
      identity_unverified: false,
    });
    const saved = await readWorkflow(page);
    expect(saved.websiteUrl).toBe("https://new.example/");
    expect(saved.extractedSourceUrl).toBe("https://new.example/");
    expect(saved.brief.brand_name).toBe("Customer Corrected Name");
    expect(saved.brief.official_sources).toContain("https://new.example/");
    expect(saved.meta.identityUnverified).toBe(false);
  });

  test("does not re-extract when only the confirmed name changes", async ({
    page,
  }) => {
    const initialState = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft(),
      telemetry: [],
    });
    const state = {
      ...initialState,
      meta: {
        ...initialState.meta,
        intakeScreen: "source-correction" as const,
      },
    };
    let postCount = 0;
    page.on("request", (request) => {
      if (
        request.url().endsWith("/api/audit/extract") &&
        request.method() === "POST"
      ) {
        postCount += 1;
      }
    });
    await seed(page, state);
    await page.goto("/audit");
    await expect(
      page.getByRole("heading", { name: "Perbaiki sumber dan nama brand." }),
    ).toBeVisible();
    await page
      .getByLabel("Nama brand yang benar*")
      .fill("Name Only Correction");
    await page.getByRole("button", { name: "Baca ulang sumber" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toBeVisible();
    expect(postCount).toBe(0);
    const saved = await readWorkflow(page);
    expect(saved.brief.brand_name).toBe("Name Only Correction");
    expect(saved.extractedSourceUrl).toBe(SOURCE);
  });

  test("does not persist the first similar business until explicit acceptance", async ({
    page,
  }) => {
    const state = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft(),
      telemetry: [],
    });
    await seed(page, state);
    await page.goto("/audit");
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toBeVisible();
    await goToComparison(page);

    let saved = await readWorkflow(page);
    expect(saved.brief.verified_competitor).toEqual({
      name: "",
      scope: "",
      source_url: "",
    });
    expect(saved.meta.comparisonStatus).toBe("pending");
    await page.getByRole("button", { name: "Terima saran Nuave" }).click();
    saved = await readWorkflow(page);
    expect(saved.brief.verified_competitor).toEqual({
      name: "Peer Coffee",
      scope: "",
      source_url: "",
    });
    expect(saved.meta.comparisonStatus).toBe("confirmed");
  });

  test("changing scope kind clears stale branch value, offerings, and market context", async ({
    page,
  }) => {
    const state = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft({
        entity_scope: "Cabang: Dago",
        market_context: "Dago, Bandung",
      }),
      telemetry: [],
    });
    await seed(page, state);
    await page.goto("/audit");
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Tentukan cakupan audit." }),
    ).toBeVisible();
    await page.getByLabel("Satu produk atau layanan").check();
    let saved = await readWorkflow(page);
    expect(saved.meta.scopeKind).toBe("product");
    expect(saved.brief.entity_scope).toBe("Produk:");
    expect(saved.brief.entity_scope).not.toContain("Dago");
    expect(saved.brief.verified_offerings).toEqual([]);
    expect(saved.brief.market_context).toBe("");
    expect(saved.meta.marketInvalidated).toBe(true);

    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Lengkapi produk atau layanan." }),
    ).toBeVisible();
    await page.getByLabel("Nama produk atau layanan*").fill("Kopi susu");
    saved = await readWorkflow(page);
    expect(saved.brief.entity_scope).toBe("Produk: Kopi susu");
    expect(saved.brief.entity_scope).not.toContain("Dago");
  });

  test("explains every relevant AI-owned extraction miss on its owning screen", async ({
    page,
  }) => {
    const state = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft({
        brand_type: "",
        category: "",
        market_context: "",
        target_customer: "",
        verified_offerings: [],
        verified_customer_needs: [],
        verified_decision_criteria: [],
        usp: "",
        entity_scope: "Seluruh brand Example Business",
      }),
      telemetry: [],
    });
    await seed(page, state);
    await page.goto("/audit");
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByText(
        "Nuave belum menemukan jenis brand dari sumber ini. Isi nilai yang benar untuk melanjutkan.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.getByLabel("Jenis brand*").fill("Business");
    await page.getByRole("button", { name: "Lanjut" }).click();

    await expect(
      page.getByText(
        "Nuave belum menemukan kategori dari sumber ini. Isi kategori yang benar untuk melanjutkan.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.getByLabel("Category*").fill("Coffee shop");
    await page.getByRole("button", { name: "Lanjut" }).click();

    await expect(
      page.getByText(
        "Nuave belum menemukan konteks pasar dari sumber ini. Isi konteks pasar yang benar untuk melanjutkan.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.getByLabel("Market or location*").fill("Indonesia");
    await page.getByRole("button", { name: "Lanjut" }).click();

    await expect(
      page.getByText(
        "Nuave belum menemukan target pelanggan dari sumber ini. Isi nilai yang benar untuk melanjutkan.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Nuave belum menemukan kebutuhan pelanggan dari sumber ini. Isi setidaknya satu kebutuhan untuk melanjutkan.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Nuave belum menemukan pertimbangan keputusan dari sumber ini. Isi setidaknya satu pertimbangan untuk melanjutkan.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.getByLabel("Target customer*").fill("Customers");
    await page.getByLabel("Customer needs*").fill("A place to work");
    await page.getByLabel("Decision criteria*").fill("Location");
    await page.getByRole("button", { name: "Lanjut" }).click();

    await expect(
      page.getByText(
        "Nuave belum menemukan produk atau layanan dari sumber ini. Isi setidaknya satu produk atau layanan untuk melanjutkan.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.getByLabel("Products or services*").fill("Coffee");
    await page.getByRole("button", { name: "Lanjut" }).click();
    await page
      .getByRole("button", { name: "Gunakan alternatif kategori" })
      .click();
    await page.getByRole("button", { name: "Lanjut" }).click();

    await expect(
      page.getByText(
        "Nuave belum menemukan differentiator dari sumber ini. Isi nilai yang benar atau biarkan kosong karena bidang ini opsional.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Nuave belum menemukan fakta tambahan dari sumber ini.", {
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test("keeps Next actionable and focuses an invalid market field", async ({
    page,
  }) => {
    const initialState = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft({ market_context: "" }),
      telemetry: [],
    });
    await seed(page, {
      ...initialState,
      meta: { ...initialState.meta, intakeScreen: "market" as const },
    });
    await page.goto("/audit");
    const marketInput = page.getByLabel("Market or location*");
    await expect(marketInput).toBeVisible();
    const next = page.getByRole("button", { name: "Lanjut" });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(
      page.getByRole("heading", { name: "Jelaskan konteks pasar." }),
    ).toBeVisible();
    await expect(page.locator("#market-context-error")).toHaveText(
      "Isi konteks pasar, misalnya nasional atau online di Indonesia.",
    );
    await expect(marketInput).toBeFocused();
  });

  test("routes a final-review market error back to its owner and focuses it", async ({
    page,
  }) => {
    const initialState = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft({ market_context: "" }),
      telemetry: [],
    });
    await seed(page, {
      ...initialState,
      meta: { ...initialState.meta, intakeScreen: "review" as const },
    });
    await page.goto("/audit");
    await expect(
      page.getByRole("heading", {
        name: "Tinjau brief sebelum membuat pertanyaan.",
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Konfirmasi fakta dan buat 10 pertanyaan" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Jelaskan konteks pasar." }),
    ).toBeVisible();
    await expect(page.getByLabel("Market or location*")).toBeFocused();
  });

  test("routes a persisted missing official source to a focusable correction control", async ({
    page,
  }) => {
    const initialState = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft(),
      telemetry: [],
    });
    await seed(page, {
      ...initialState,
      brief: { ...initialState.brief, official_sources: [] },
      meta: { ...initialState.meta, intakeScreen: "review" as const },
    });
    await page.goto("/audit");
    await page
      .getByRole("button", { name: "Konfirmasi fakta dan buat 10 pertanyaan" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Perbaiki sumber dan nama brand." }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Website atau profil Instagram baru (opsional)"),
    ).toBeFocused();
    await expect(page.locator("#source-correction-source-error")).toHaveText(
      "Tambahkan satu sumber resmi yang dapat dibuka.",
    );
  });

  test("routes a persisted comparison-scope error to its focused field", async ({
    page,
  }) => {
    const initialState = createInitialExtractedAuditWorkflowState({
      websiteUrl: SOURCE,
      draft: draft(),
      telemetry: [],
    });
    const brief = {
      ...initialState.brief,
      verified_competitor: {
        name: "Peer Coffee",
        scope: "x".repeat(301),
        source_url: "",
      },
    };
    await seed(page, {
      ...initialState,
      brief,
      meta: createWorkflowMeta(brief, {
        intakeScreen: "review",
        comparisonStatus: "confirmed",
        identityUnverified: false,
      }),
    });
    await page.goto("/audit");
    await page
      .getByRole("button", { name: "Konfirmasi fakta dan buat 10 pertanyaan" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Pilih bisnis pembanding yang realistis.",
      }),
    ).toBeVisible();
    await expect(page.locator("#comparison-scope-error")).toHaveText(
      "Periksa cakupan bisnis pembanding atau kosongkan jika tidak diperlukan.",
    );
    await expect(page.getByLabel("Cakupan pembanding")).toBeFocused();
  });
});
