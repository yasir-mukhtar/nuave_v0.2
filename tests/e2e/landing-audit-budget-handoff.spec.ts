import { expect, test } from "@playwright/test";
import { grantAccess } from "./helpers";

const SOURCE = "https://example.com/";
const BUDGET_WAIT_ERROR =
  "Tunggu pengendali biaya privat sebelum memulai audit.";

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

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test("landing handoff keeps the budget bootstrap wait state out of the UI", async ({
  page,
}) => {
  let releaseBudget: (() => void) | undefined;
  const budgetGate = new Promise<void>((resolve) => {
    releaseBudget = resolve;
  });

  await page.route("**/api/audit/extract", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await budgetGate;
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ draft: extractionDraft(), telemetry: [] }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto("/");
  const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
  await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await hero.getByRole("button", { name: "Lanjutkan audit" }).click();

  await expect(page).toHaveURL(/\/audit$/);
  await page.waitForTimeout(150);
  await expect(page.getByText(BUDGET_WAIT_ERROR)).toBeHidden();

  releaseBudget?.();
  await expect(
    page.getByRole("heading", {
      name: "Check the client brief before it shapes the audit.",
    }),
  ).toBeVisible();
});
