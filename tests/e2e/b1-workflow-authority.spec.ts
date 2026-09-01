import { expect, test, type Page } from "@playwright/test";
import { createInitialExtractedAuditWorkflowState } from "../../src/lib/audit/workflow-storage";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
} from "../../src/lib/audit/workflow-storage";
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
});
