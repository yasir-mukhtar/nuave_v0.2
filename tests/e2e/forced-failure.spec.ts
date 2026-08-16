import { expect, test } from "@playwright/test";
import {
  assertNoSideEffects,
  collectRequests,
  freshPaidState,
  grantAccess,
  seedFixtureState,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function reachTerminalFailure(page: import("@playwright/test").Page) {
  seedFixtureState(page, freshPaidState());
  await page.goto("/audit/fixture");
  await page.getByRole("button", { name: "Start the simulated run" }).click();
  await expect(
    page.getByRole("heading", {
      name: "The example report could not be built",
    }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe("forced construction failure (preview enabled + server-forced failure)", () => {
  test("the terminal failure state is truthful: no success representations", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await reachTerminalFailure(page);
    const body = await page.locator("body").innerText();
    // The failure is explained and honest about the live boundary.
    await expect(
      page.getByText(/no example report became ready/),
    ).toBeVisible();
    await expect(page.getByText(/No live audit call was made/)).toBeVisible();
    // No completed-run summary, no "Report ready" check, no report article.
    expect(body).not.toContain("Simulated run completed");
    expect(body).not.toContain("Report ready");
    expect(body).not.toContain("AI Visibility Report");
    // No download controls and no report-exists claim.
    await expect(
      page.getByRole("button", { name: "Download PDF" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Download JSON" }),
    ).toHaveCount(0);
    expect(body).not.toContain("This example report exists only");
    // Retry and start over remain available.
    await expect(
      page.getByRole("button", { name: "Retry building the example report" }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("a failed retry produces perceivable alert feedback", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await reachTerminalFailure(page);
    await page
      .getByRole("button", { name: "Retry building the example report" })
      .click();
    const alert = page.getByText(
      /The retry failed: the local fixture construction still cannot build/,
    );
    await expect(alert).toBeVisible();
    await expect(alert).toBeFocused();
    // Still the terminal failure state, never a report.
    await expect(
      page.getByRole("heading", {
        name: "The example report could not be built",
      }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("start over from the terminal failure requires confirmation", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await reachTerminalFailure(page);
    // The failure panel's own Start over (not the header one) must still
    // require confirmation before discarding progress.
    await page
      .getByLabel("The example report could not be built")
      .getByRole("button", { name: "Start over" })
      .click();
    await expect(
      page.getByRole("button", { name: "Confirm start over" }),
    ).toBeVisible();
    // Nothing was discarded: keeping the preview stays on the failure state.
    await page.getByRole("button", { name: "Keep preview" }).click();
    await expect(
      page.getByRole("heading", {
        name: "The example report could not be built",
      }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });
});
