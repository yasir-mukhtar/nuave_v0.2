import { expect, test, type Page } from "@playwright/test";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "../../src/lib/audit/source-handoff";
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

async function stubExtraction(page: Page) {
  let budgetCalls = 0;
  let extractCalls = 0;
  let requestedSource = "";

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

  test("valid input clears stale audit state and extracts exactly once after navigation", async ({
    page,
  }) => {
    const calls = await stubExtraction(page);
    await page.addInitScript(
      ({ workflowKey, varianceKey, failureKey }) => {
        window.sessionStorage.setItem(
          workflowKey,
          JSON.stringify({ websiteUrl: "https://stale.example", factsExtracted: true }),
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
    // React's development lifecycle can mount the side-effect-free budget
    // bootstrap more than once. The protected POST below is the operation that
    // must remain exactly-once.
    await expect.poll(calls.budgetCalls).toBeGreaterThanOrEqual(1);
    await expect.poll(calls.extractCalls).toBe(1);
    expect(calls.requestedSource()).toBe(SOURCE);
    await expect(
      page.getByRole("heading", {
        name: "Check the client brief before it shapes the audit.",
      }),
    ).toBeVisible();

    const handoff = await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
    );
    expect(handoff).toBeNull();

    await page.waitForTimeout(250);
    expect(calls.extractCalls()).toBe(1);
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
