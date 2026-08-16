import { expect, test } from "@playwright/test";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
} from "../../src/lib/audit/fixtures/report-golden";
import {
  FIXTURE_SESSION_KEY,
  LIVE_WORKFLOW_KEYS,
  assertNoSideEffects,
  collectRequests,
  confirmFactsAndApprove,
  expectReadyReport,
  grantAccess,
  seedFixtureState,
  simulatePaymentAndStartRun,
} from "./helpers";

const PREVIEW_NOTICE = "Fictional preview notice";

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test.describe("landing (fixture CTA removed)", () => {
  test("landing shows no fixture CTA; the gated fixture route stays reachable directly", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/");
    // Founder decision: the landing CTA was removed — LP-remote landing is
    // as-is; the fixture entry will be re-added later.
    await expect(
      page.getByRole("link", { name: "Mulai pratinjau fiktif" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Audit brand Anda — Gratis" }).first(),
    ).toBeVisible();
    // The fixture route itself stays intact and gated.
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", {
        name: "Start with the fixed example business",
      }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });
});

test.describe("fixture identity and gates", () => {
  test("shows the exact golden fixture identity on the facts screen", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, {
      version: 2,
      stage: "facts",
      factsConfirmed: false,
      questionsApproved: false,
      checkoutComplete: false,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", {
        name: "Review the example facts before continuing",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(goldenBrief.brand_name, { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(goldenBrief.entity_scope, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(goldenBrief.category, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(goldenBrief.market_context, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(goldenBrief.target_customer, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(goldenBrief.priority_offering, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(goldenBrief.official_sources[0], { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        new RegExp(
          `${goldenBrief.verified_competitor.name} \\(${goldenBrief.verified_competitor.scope}\\)`,
        ),
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Source: https://meridian.example"),
    ).toBeVisible();
    await expect(
      page.getByText(goldenBrief.known_accuracy_questions[0], { exact: true }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("fact gate: cannot continue without the explicit confirmation", async ({
    page,
  }) => {
    seedFixtureState(page, {
      version: 2,
      stage: "facts",
      factsConfirmed: false,
      questionsApproved: false,
      checkoutComplete: false,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await page
      .getByRole("button", { name: "Continue to the ten questions" })
      .click();
    await expect(
      page.getByText(
        "Review the example facts above and confirm them before continuing.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Review the example facts before continuing",
      }),
    ).toBeVisible();
  });

  test("question gate: all ten questions in original order, five plus five", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, {
      version: 2,
      stage: "questions",
      factsConfirmed: true,
      questionsApproved: false,
      checkoutComplete: false,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", { name: "Review the ten example questions" }),
    ).toBeVisible();
    const items = page.locator('[class*="questionItem"]');
    await expect(items).toHaveCount(10);
    const texts = await items
      .locator('[class*="questionText"]')
      .allTextContents();
    expect(texts.map((text) => text.trim())).toEqual(
      goldenPrompts.map((prompt) => prompt.question),
    );
    await expect(
      page.getByText("Discovery — without the business name"),
    ).toHaveCount(5);
    await expect(
      page.getByText("Named business — with the business name"),
    ).toHaveCount(5);
    await assertNoSideEffects(page, requests);
  });

  test("approval gate: cannot lock the pack without explicit approval", async ({
    page,
  }) => {
    seedFixtureState(page, {
      version: 2,
      stage: "questions",
      factsConfirmed: true,
      questionsApproved: false,
      checkoutComplete: false,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await page
      .getByRole("button", { name: "Approve the question pack" })
      .click();
    await expect(
      page.getByText(
        "Approve the ten example questions before locking the pack.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Review the ten example questions" }),
    ).toBeVisible();
  });
});

test.describe("scope summary and simulated checkout", () => {
  test("scope summary derives from the fixture, shows the disclosure, and has no price or payment controls", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, {
      version: 2,
      stage: "summary",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: false,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", { name: "Review the example scope" }),
    ).toBeVisible();
    await expect(page.getByText(goldenBrief.entity_scope)).toBeVisible();
    await expect(
      page.getByText(
        "10 approved questions — 5 discovery and 5 named-business",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        /OpenAI Responses API surface recorded in the golden fixture/,
      ),
    ).toBeVisible();
    await expect(
      page.getByText(/fictional model names \(fixture-requested-model\)/),
    ).toBeVisible();
    await expect(page.getByText(/not a real audit result/)).toBeVisible();
    await expect(
      page.getByText("Simulasi pembayaran — tidak ada tagihan."),
    ).toBeVisible();
    await expect(
      page.getByText("Simulated payment — no charge."),
    ).toBeVisible();
    await expect(page.getByText(/This preview shows no price/)).toBeVisible();
    // No payment controls and no numeric price anywhere on the screen.
    await expect(page.locator("input")).toHaveCount(0);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/Rp\s?\d|USD\s?\d|\$\s?\d/);
    await assertNoSideEffects(page, requests);
  });
});

test.describe("complete fixture path", () => {
  test("landing to report with deterministic simulated processing", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    await page
      .getByRole("button", { name: "Start the example preview" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Review the example facts before continuing",
      }),
    ).toBeVisible();
    await confirmFactsAndApprove(page);
    await expect(
      page.getByRole("heading", { name: "Review the example scope" }),
    ).toBeVisible();
    await simulatePaymentAndStartRun(page);
    // All four work stages appear in order during the bounded run.
    for (const stageLabel of [
      "Preparing the verified example brief",
      "Running the ten example questions",
      "Checking evidence and sources",
      "Preparing the example report",
    ]) {
      await expect(page.getByText(stageLabel).first()).toBeVisible();
    }
    await expectReadyReport(page);
    await assertNoSideEffects(page, requests);
  });

  test("report fidelity: five sections, ten details, nine completed and one failed", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, {
      version: 2,
      stage: "paid",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Start the simulated run" }).click();
    await expectReadyReport(page);
    // Five canonical sections.
    for (const section of [
      "Main Result",
      "Key Findings",
      "What to Do Next",
      "Test-by-Test Results",
      "How This Audit Works",
    ]) {
      await expect(
        page.getByRole("heading", { name: section, level: 2 }),
      ).toBeVisible();
    }
    // Ten details on screen, exactly one failed.
    const screenDetails = page.locator('[class*="detailsScreen"]');
    await expect(
      screenDetails.locator('[class*="detailDisclosure"]'),
    ).toHaveCount(10);
    await expect(screenDetails.getByText("Test could not run")).toHaveCount(1);
    const failedButton = page.getByRole("button", {
      name: /NUAVE-BRAND-COMPARISON-01/,
    });
    await expect(failedButton).toContainText("Test could not run");
    // Counts and denominators match the report contract.
    await expect(
      page.getByText(
        "Recommended in 1 of 5 discovery questions; 1 question could not be tested.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Recognized in 5 of 5 brand questions.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "9 of 10 questions completed; 1 question could not be tested.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    // The golden conclusion is preserved verbatim (scoped to the screen
    // details; the print variant duplicates the question text).
    await expect(
      page
        .locator('[class*="detailsScreen"]')
        .getByText(goldenObservations[4].question),
    ).toHaveCount(1);
    await assertNoSideEffects(page, requests);
  });

  test("persistent preview disclosure appears on every stage", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    const notice = page.getByRole("complementary", { name: PREVIEW_NOTICE });
    await expect(notice).toBeVisible();
    await page
      .getByRole("button", { name: "Start the example preview" })
      .click();
    await expect(notice).toBeVisible();
    await confirmFactsAndApprove(page);
    await expect(notice).toBeVisible();
    await page
      .getByRole("button", { name: "Simulate payment — no charge" })
      .click();
    await expect(notice).toBeVisible();
    await page.getByRole("button", { name: "Start the simulated run" }).click();
    await expect(notice).toBeVisible();
    await expectReadyReport(page);
    await expect(notice).toBeVisible();
    // The report article carries its own notice for screen and print.
    await expect(
      page.getByRole("note", { name: PREVIEW_NOTICE }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });
});

test.describe("recovery", () => {
  test("refresh at the ready destination restores the same report", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, {
      version: 2,
      stage: "paid",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Start the simulated run" }).click();
    await expectReadyReport(page);
    await page.reload();
    await expectReadyReport(page);
    await assertNoSideEffects(page, requests);
  });

  test("invalid stored state is cleared with an explanation", async ({
    page,
  }) => {
    seedFixtureState(page, { version: 1, stage: "ready" });
    await page.goto("/audit/fixture");
    await expect(
      page.getByText(/The saved preview state was missing, stale, or invalid/),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Start with the fixed example business",
      }),
    ).toBeVisible();
  });

  test("start over clears only the fixture journey state", async ({ page }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, {
      version: 2,
      stage: "paid",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Start the simulated run" }).click();
    await expectReadyReport(page);
    await page.getByRole("button", { name: "Start over" }).click();
    await expect(
      page.getByRole("button", { name: "Confirm start over" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm start over" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Start with the fixed example business",
      }),
    ).toBeVisible();
    const keys = await page.evaluate(() => Object.keys(window.sessionStorage));
    expect(keys).toContain(FIXTURE_SESSION_KEY);
    expect(keys).not.toContain(LIVE_WORKFLOW_KEYS[0]);
    expect(keys).not.toContain(LIVE_WORKFLOW_KEYS[1]);
    const saved = await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      FIXTURE_SESSION_KEY,
    );
    expect(JSON.parse(saved ?? "{}")).toMatchObject({
      version: 2,
      stage: "draft",
      factsConfirmed: false,
      questionsApproved: false,
      checkoutComplete: false,
    });
    await assertNoSideEffects(page, requests);
  });

  test("refresh mid-processing stays paused beyond the stage interval and resumes only on Resume", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, {
      version: 2,
      stage: "paid",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Start the simulated run" }).click();
    // Wait for the first work stage to be visible, then interrupt with a refresh.
    await expect(
      page.getByText("Simulation status: running the ten example questions."),
    ).toBeVisible({ timeout: 10_000 });
    await page.reload();
    // The restored run is paused and states that the simulation stopped.
    await expect(page.getByText(/Simulation status: paused at /)).toBeVisible();
    await expect(page.getByText("The simulation stopped.")).toBeVisible();
    await expect(
      page.getByText("paused", { exact: true }).first(),
    ).toBeVisible();
    // The paused stage must not advance during longer than one 1.4s stage.
    const statusBefore = await page
      .getByText(/Simulation status:/)
      .textContent();
    await page.waitForTimeout(2_500);
    const statusAfter = await page
      .getByText(/Simulation status:/)
      .textContent();
    expect(statusAfter).toBe(statusBefore);
    // Resume advances deterministically to the report.
    await page.getByRole("button", { name: "Resume simulated run" }).click();
    await expectReadyReport(page);
    await assertNoSideEffects(page, requests);
  });

  test("start over from paused processing requires confirmation", async ({
    page,
  }) => {
    seedFixtureState(page, {
      version: 2,
      stage: "processing",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 2,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await expect(page.getByText("The simulation stopped.")).toBeVisible();
    const startOverButtons = page.getByRole("button", { name: "Start over" });
    await expect(startOverButtons).toHaveCount(2); // header + paused screen
    await startOverButtons.last().click();
    await expect(
      page.getByRole("button", { name: "Confirm start over" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Simulated processing" }),
    ).toBeVisible();
  });
});

test.describe("reduced motion and keyboard", () => {
  test("reduced motion reaches the same report without the staged delay", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requests = collectRequests(page);
    seedFixtureState(page, {
      version: 2,
      stage: "paid",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Start the simulated run" }).click();
    // Near-immediate completion: far below the ~5.6s normal path.
    await expect(
      page.getByRole("heading", { name: "Example report — fictional preview" }),
    ).toBeVisible({ timeout: 4_000 });
    // Meaningful state text is retained as the static run summary.
    await expect(page.getByText("Simulated run completed")).toBeVisible();
    await expect(page.getByText("Report ready")).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("keyboard-only completion of the full path with visible focus", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    const pressEnterOnFocused = async () => {
      await page.keyboard.press("Enter");
    };

    // Intake -> facts: focus sits on the stage heading, Tab reaches the action.
    await expect(
      page.getByRole("heading", {
        name: "Start with the fixed example business",
      }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    const startButton = page.getByRole("button", {
      name: "Start the example preview",
    });
    await expect(startButton).toBeFocused();
    await expectVisibleFocus(page, startButton);
    await pressEnterOnFocused();

    // Facts: confirm the checkbox with Space and continue with Enter.
    await expect(
      page.getByRole("heading", {
        name: "Review the example facts before continuing",
      }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("checkbox")).toBeFocused();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    const continueButton = page.getByRole("button", {
      name: "Continue to the ten questions",
    });
    await expect(continueButton).toBeFocused();
    await expectVisibleFocus(page, continueButton);
    await pressEnterOnFocused();

    // Questions: approve the pack with Space and Enter.
    await expect(
      page.getByRole("heading", { name: "Review the ten example questions" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("checkbox")).toBeFocused();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    const approveButton = page.getByRole("button", {
      name: "Approve the question pack",
    });
    await expect(approveButton).toBeFocused();
    await expectVisibleFocus(page, approveButton);
    await pressEnterOnFocused();

    // Summary: simulate payment.
    await expect(
      page.getByRole("heading", { name: "Review the example scope" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    const payButton = page.getByRole("button", {
      name: "Simulate payment — no charge",
    });
    await expect(payButton).toBeFocused();
    await expectVisibleFocus(page, payButton);
    await pressEnterOnFocused();

    // Paid: start the simulated run.
    await expect(
      page.getByRole("heading", { name: "Simulated payment complete" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    const runButton = page.getByRole("button", {
      name: "Start the simulated run",
    });
    await expect(runButton).toBeFocused();
    await expectVisibleFocus(page, runButton);
    await pressEnterOnFocused();

    // The run completes to the report without further input.
    await expectReadyReport(page);
    await assertNoSideEffects(page, requests);
  });
});

test.describe("responsive and print", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile viewport: the complete path has no horizontal scrolling", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    await expectNoHorizontalScroll(page);
    await page
      .getByRole("button", { name: "Start the example preview" })
      .click();
    await confirmFactsAndApprove(page);
    await expectNoHorizontalScroll(page);
    await page
      .getByRole("button", { name: "Simulate payment — no charge" })
      .click();
    await page.getByRole("button", { name: "Start the simulated run" }).click();
    await expectReadyReport(page);
    await expectNoHorizontalScroll(page);
    await assertNoSideEffects(page, requests);
  });
});

test("print output retains the preview disclosure and expands the details", async ({
  page,
}) => {
  const requests = collectRequests(page);
  seedFixtureState(page, {
    version: 2,
    stage: "paid",
    factsConfirmed: true,
    questionsApproved: true,
    checkoutComplete: true,
    processingStage: 0,
    processingCompleted: false,
    reportConstructionFailed: false,
  });
  await page.goto("/audit/fixture");
  await page.getByRole("button", { name: "Start the simulated run" }).click();
  await expectReadyReport(page);
  await page.emulateMedia({ media: "print" });
  // The in-article disclosure prints; the screen toolbar does not.
  await expect(page.getByRole("note", { name: PREVIEW_NOTICE })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start over" })).toBeHidden();
  // The print variant of all ten details is expanded in print media.
  await expect(page.locator("section[class*='printDetail']")).toHaveCount(10);
  await assertNoSideEffects(page, requests);
});

async function expectVisibleFocus(
  page: import("@playwright/test").Page,
  locator: import("@playwright/test").Locator,
): Promise<void> {
  await expect(locator).toBeFocused();
  const outline = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return `${style.outlineStyle} ${style.outlineWidth}`;
  });
  expect(outline).not.toMatch(/^none/);
}

async function expectNoHorizontalScroll(page: import("@playwright/test").Page) {
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(fits).toBe(true);
}
