import { expect, test, type Page } from "@playwright/test";
import { AUDIT_WORKFLOW_STORAGE_KEY } from "../../src/lib/audit/workflow-storage";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
} from "../../src/lib/audit/variance";
import { expectNoHorizontalScroll, grantAccess } from "./helpers";

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
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toHaveCount(0);
    expect(calls.extractCalls()).toBe(1);

    calls.releasePost();
    await expect(page).toHaveURL(/\/audit$/);
  });

  test("successful extraction navigates once to a populated editable brief without re-extracting", async ({
    page,
  }) => {
    const calls = await stubExtraction(page);

    await page.goto("/");
    const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
    await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await hero.getByRole("button", { name: "Lanjutkan audit" }).click();

    await expect(page).toHaveURL(/\/audit$/);
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Brand name")).toHaveValue("Example Business");
    await expect(page.getByLabel("Category")).toHaveValue("Coffee shop");
    await expect(page.getByLabel("Market or location")).toHaveValue("Indonesia");
    await expect(page.getByLabel("Target customer")).toHaveValue("Customers");
    await expect(page.getByLabel("Products or services")).toHaveValue("Coffee");

    await page.getByLabel("Brand name").fill("Edited Example Business");
    await expect(page.getByLabel("Brand name")).toHaveValue(
      "Edited Example Business",
    );

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
    const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
    await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await hero.getByRole("button", { name: "Lanjutkan audit" }).click();

    await expect(page).toHaveURL(/\/audit$/);
    await expect(page.getByLabel("Brand name")).toHaveValue("Example Business");
    await expect(page.getByLabel("Brand name")).not.toHaveValue("Stale Business");
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
