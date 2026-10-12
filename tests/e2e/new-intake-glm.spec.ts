import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  confirmSummary,
  editQuestion,
  expectAuditDelivered,
  expectAuditRunning,
  expectBrandConfirm,
  expectOfferingsScreen,
  expectQuestionReview,
  expectTenQuestions,
  fillEntry,
  INTAKE_SESSION_KEY,
  intakeSession,
  ORDER_EMAIL,
  orderScreen,
  pressLanjut,
  pressPeriksa,
  RICH_PREPARATION_DRAFT,
  runRunnerOnce,
  startAudit,
  stubPreparationDraft,
  submitOrder,
  toQuestions,
  toSummary,
  trackApiCalls as track,
} from "./journey";

// Spec 016 S3a: the order flow in synthetic mode against the local D1 database,
// with the real routes, the real runner (started through the development
// trigger) and the fake mail sender. The report page and the private link are
// S3b. No provider is called and no email is sent.

const allowed = new Set([
  "/api/audit/identity",
  "/api/audit/extract",
  "/api/audit/glm-questions",
  "/api/orders",
  "/api/orders/status",
  "/api/orders/approve",
  "/api/dev/run-cron",
]);

const ACTIVE_ORDER_KEY = "nuave.activeOrder.v1";

test.beforeEach(async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      (url.pathname.startsWith("/api/") && !allowed.has(url.pathname))
    )
      return route.abort();
    return route.continue();
  });
});

/** Every key and value in both browser storages, as one string. */
async function allBrowserStorage(page: Page) {
  return page.evaluate(() =>
    JSON.stringify([
      Object.entries(localStorage),
      Object.entries(sessionStorage),
    ]),
  );
}

/** The fake sender's local files (spec 016 R-28), newest first. */
function sentMail(since: number) {
  const folder = join(process.cwd(), ".local-evidence", "test-mail");
  let names: string[] = [];
  try {
    names = readdirSync(folder);
  } catch {
    return [];
  }
  return names
    .map((name) => join(folder, name))
    .filter((path) => statSync(path).mtimeMs >= since)
    .map(
      (path) =>
        JSON.parse(readFileSync(path, "utf8")) as {
          to: string;
          subject: string;
          text: string;
        },
    );
}

test("URL to approval, close the tab, the server finishes the audit and emails the link", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const startedAt = Date.now() - 1_000;
  const calls = track(page);
  const statusBodies: string[] = [];
  page.on("response", async (response) => {
    if (new URL(response.url()).pathname === "/api/orders/status")
      statusBodies.push(await response.text().catch(() => ""));
  });
  await toQuestions(page);
  // AC-01: the free lookup came first; the order was made before any paid call.
  expect(calls["POST /api/orders"]).toBe(1);
  expect(calls["POST /api/audit/extract"]).toBe(1);
  expect(calls["POST /api/audit/glm-questions"]).toBe(1);
  const wording =
    "Pilihan kedai kopi apa yang cocok untuk pekerja di Indonesia?";
  await editQuestion(page, 1, wording);
  // AC-19: progress is kept in this browser, so a reload loses nothing.
  await page.reload();
  await expect(page.locator('[data-question-slot="1"]')).toContainText(wording);

  await startAudit(page);
  await expectAuditRunning(page);
  // R-31: the intake progress is gone once the audit starts; only the order id
  // stays, and the email was never stored.
  const stored = await page.evaluate(
    ([progress, order]) => ({
      progress: localStorage.getItem(progress),
      order: localStorage.getItem(order),
    }),
    [INTAKE_SESSION_KEY, ACTIVE_ORDER_KEY],
  );
  expect(stored.progress).toBeNull();
  expect(stored.order).toMatch(/^\{"orderId":"[0-9a-f]{32}"\}$/);
  expect(await allBrowserStorage(page)).not.toContain(ORDER_EMAIL);
  // The run and report routes of the old browser-driven audit are never used.
  expect(calls["POST /api/audit/run"]).toBeUndefined();
  expect(calls["POST /api/audit/report"]).toBeUndefined();
  expect(calls["POST /api/orders/approve"]).toBe(1);

  // Close the tab. A new tab in the same browser still shows the audit.
  await page.close();
  const reopened = await context.newPage();
  await reopened.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.pathname.startsWith("/api/") && !allowed.has(url.pathname)
      ? route.abort()
      : route.continue();
  });
  await reopened.goto("/audit");
  await expectAuditRunning(reopened);

  // The cron runs one audit step per order per run: ten questions, then the
  // report, then the email.
  const outcomes: string[] = [];
  for (let run = 0; run < 14; run += 1) {
    const result = await runRunnerOnce(reopened);
    expect(result.ran).toBe(true);
    outcomes.push(...(result.outcomes ?? []));
    if (outcomes.includes("delivered") || outcomes.includes("report_saved"))
      break;
  }
  expect(
    outcomes.filter((outcome) => outcome === "question_done"),
  ).toHaveLength(10);
  expect(outcomes).toContain("report_saved");

  await reopened.reload();
  await expectAuditDelivered(reopened);
  // R-31: the order has ended, so its id left the browser too.
  expect(
    await reopened.evaluate(
      (key) => localStorage.getItem(key),
      ACTIVE_ORDER_KEY,
    ),
  ).toBeNull();
  // The status answer never carries the email, the report or a link secret.
  expect(statusBodies.length).toBeGreaterThan(0);
  for (const body of statusBodies) {
    expect(body).not.toContain(ORDER_EMAIL);
    expect(body).not.toContain("/r#");
    expect(body).not.toContain("report");
  }
  // One ready email went to the fake mailbox, with the private link.
  const ready = sentMail(startedAt).filter(
    (mail) => mail.to === ORDER_EMAIL && /siap/.test(mail.subject),
  );
  expect(ready.length).toBeGreaterThanOrEqual(1);
  expect(ready[0]!.text).toMatch(/\/r#[A-Za-z0-9_-]{20,}/);
  expect(ready[0]!.text).toContain("Kedai Fiksi");
});

test("a reload at an intake screen continues at the same screen with the same answers and no paid step repeated", async ({
  page,
}) => {
  const calls = track(page);
  // A labelled rich reading, so every detail screen already has its answers.
  await stubPreparationDraft(page, RICH_PREPARATION_DRAFT);
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await submitOrder(page);
  await expect(page.locator('[data-intake-screen="focus"]')).toBeVisible();
  await pressLanjut(page); // category
  await pressLanjut(page); // offerings
  await expectOfferingsScreen(page);
  const before = { ...calls };
  const sessionBefore = await intakeSession(page);
  await page.reload();
  await expectOfferingsScreen(page);
  const sessionAfter = await intakeSession(page);
  expect(sessionAfter.selection).toEqual(sessionBefore.selection);
  expect(sessionAfter.order).toEqual(sessionBefore.order);
  // Only the free saved-order check ran; no paid call, no new order.
  expect(calls["POST /api/audit/extract"]).toBe(
    before["POST /api/audit/extract"],
  );
  expect(calls["POST /api/audit/glm-questions"]).toBeUndefined();
  expect(calls["POST /api/orders"]).toBe(1);
  expect(await allBrowserStorage(page)).not.toContain(ORDER_EMAIL);
});

test("an ended order sends the customer back to the order screen; a new order continues with the answers and no new paid call", async ({
  page,
}) => {
  const calls = track(page);
  await toSummary(page);
  const sessionBefore = await intakeSession(page);
  // The server says the saved order has ended (an order not approved within 2
  // hours expires).
  await page.route("**/api/orders/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        state: "expired",
        completed: 0,
        total: 10,
        questions: [],
      }),
    }),
  );
  await page.reload();
  await expect(orderScreen(page)).toBeVisible();
  await expect(
    page.getByText("Pesanan Anda sudah berakhir.", { exact: false }),
  ).toBeVisible();
  // The email is asked again; nothing paid has run.
  await page.unroute("**/api/orders/status");
  await submitOrder(page);
  await expect(page.locator('[data-smart-summary="ready"]')).toBeVisible();
  const sessionAfter = await intakeSession(page);
  expect(sessionAfter.selection).toEqual(sessionBefore.selection);
  expect(sessionAfter.order.id).not.toBe(sessionBefore.order.id);
  expect(calls["POST /api/orders"]).toBe(2);
  expect(calls["POST /api/audit/extract"]).toBe(1); // the reading is not repeated
  expect(calls["POST /api/audit/glm-questions"]).toBeUndefined();
  await confirmSummary(page);
  await expectQuestionReview(page);
  await expectTenQuestions(page);
  expect(calls["POST /api/audit/glm-questions"]).toBe(1);
});

test("intake progress saved more than 7 days ago is removed", async ({
  page,
}) => {
  await fillEntry(page);
  const stale = await intakeSession(page);
  expect(stale.entry.name).toBe("Kedai Fiksi");
  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    saved.savedAt = new Date(Date.now() - 8 * 24 * 3600_000).toISOString();
    localStorage.setItem(key, JSON.stringify(saved));
  }, INTAKE_SESSION_KEY);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Nama bisnis", exact: true }),
  ).toHaveValue("");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), INTAKE_SESSION_KEY),
  ).toBeNull();
});

test("question-writing failure is visible and never silently retried", async ({
  page,
}) => {
  const calls = track(page);
  await toSummary(page, { suffix: "?glm-stub=timeout" });
  await confirmSummary(page);
  // Next's empty route announcer also has role="alert"; match the failure notice.
  const safeFailure =
    "Permintaan pembuatan pertanyaan terputus. Pertanyaan belum diterima.";
  const failureAlert = page.getByRole("alert").filter({ hasText: safeFailure });
  await expect(failureAlert).toBeVisible();
  await expect(failureAlert).toHaveText(safeFailure);
  await expect(
    page.getByRole("alert").filter({ hasText: "synthetic timeout" }),
  ).toHaveCount(0);
  await expect(page.locator("[data-question-slot]")).toHaveCount(0);
  expect(calls["POST /api/audit/glm-questions"]).toBe(1);
  expect(calls["POST /api/orders/approve"]).toBeUndefined();
});
