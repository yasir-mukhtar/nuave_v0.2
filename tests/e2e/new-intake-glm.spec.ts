import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  confirmSummary,
  downloadEvidenceJson,
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
  readTestMail,
  readyLinkFromMail,
  reportLocator,
  RICH_PREPARATION_DRAFT,
  runRunnerOnce,
  runServerAuditToDelivery,
  savedReport,
  startAudit,
  stubPreparationDraft,
  submitOrder,
  toQuestions,
  toSummary,
  trackApiCalls as track,
  unavailableReport,
} from "./journey";

// Spec 016 S3a: the order flow in synthetic mode against the local D1 database,
// with the real routes, the real runner (started through the development
// trigger) and the fake mail sender; the private link opens the saved report
// page (S3b). No provider is called and no email is sent.

const allowed = new Set([
  "/api/audit/identity",
  "/api/audit/extract",
  "/api/audit/glm-questions",
  "/api/orders",
  "/api/orders/status",
  "/api/orders/approve",
  "/api/dev/run-cron",
  "/api/report",
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
  const ready = (await readTestMail(startedAt)).filter(
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

/** Approve the questions, let the server finish the audit (the cron through the
 * development trigger) and read the private link from the fake mailbox. */
async function deliveredLink(page: Page) {
  const startedAt = Date.now() - 1_000;
  await toQuestions(page);
  await startAudit(page);
  await expectAuditRunning(page);
  await runServerAuditToDelivery(page);
  return readyLinkFromMail(startedAt);
}

/** A browser the customer has never used: no cookie, no saved data. */
async function freshBrowserPage(
  browser: Browser,
  baseURL: string | undefined,
  width = 390,
) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width, height: 900 },
  });
  const page = await context.newPage();
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      (url.pathname.startsWith("/api/") && url.pathname !== "/api/report")
    )
      return route.abort();
    return route.continue();
  });
  return { context, page };
}

test("AC-14: the emailed link opens the same report in a fresh browser; private headers, no provider call, PDF and JSON work", async ({
  page,
  browser,
  baseURL,
}, info) => {
  test.setTimeout(240_000);
  const link = await deliveredLink(page);
  const { context, page: fresh } = await freshBrowserPage(browser, baseURL);
  const calls = track(fresh);
  await fresh.addInitScript(() => {
    (window as unknown as { __printCalls: number }).__printCalls = 0;
    window.print = () => {
      (window as unknown as { __printCalls: number }).__printCalls++;
    };
  });
  const response = await fresh.goto(link.path);
  // R-26: the page is not indexed, not cached and sends no Referer.
  expect(response?.status()).toBe(200);
  const headers = response!.headers();
  // `next dev` answers pages with no-cache; the built worker answers no-store
  // (scripts/test-workers.mjs checks the exact value).
  expect(headers["cache-control"]).toMatch(/no-store|no-cache/);
  expect(headers["x-robots-tag"]).toContain("noindex");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  await expect(fresh.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );

  await expect(savedReport(fresh)).toBeVisible({ timeout: 30_000 });
  const report = reportLocator(fresh);
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  await expect(fresh.locator("header#stage-5")).toContainText("Kedai Fiksi");
  // Nothing but the report-data call; no cookie and nothing saved in the browser.
  // (`next dev` runs an effect twice, so the count is not fixed here.)
  expect(Object.keys(calls)).toEqual(["POST /api/report"]);
  expect(await context.cookies()).toEqual([]);
  expect(await allBrowserStorage(fresh)).toBe("[[],[]]");
  // The secret never leaves the browser in a URL.
  const requestUrls: string[] = [];
  fresh.on("request", (request) => requestUrls.push(request.url()));
  await fresh.reload();
  await expect(savedReport(fresh)).toBeVisible();
  expect(requestUrls.join(" ")).not.toContain(link.secret);

  // The page's data answer has the same private headers.
  const data = await fresh.request.post("/api/report", {
    data: { secret: link.secret },
  });
  expect(data.status()).toBe(200);
  expect(data.headers()["cache-control"]).toBe("no-store");
  expect(data.headers()["x-robots-tag"]).toContain("noindex");
  expect(data.headers()["referrer-policy"]).toBe("no-referrer");

  // PDF is the browser's print, and JSON is the evidence download.
  await fresh
    .getByRole("button", { name: "Download PDF", exact: true })
    .click();
  expect(
    await fresh.evaluate(
      () => (window as unknown as { __printCalls: number }).__printCalls,
    ),
  ).toBe(1);
  await fresh.emulateMedia({ media: "print" });
  for (const answer of await report.locator("[data-answer-body]").all())
    await expect(answer).toBeVisible();
  await fresh.pdf({
    path: info.outputPath("saved-report-a4.pdf"),
    format: "A4",
    printBackground: true,
  });
  await fresh.emulateMedia({ media: "screen" });
  const { json: evidence } = await downloadEvidenceJson(fresh);
  expect(evidence.export_version).toBe("nuave-evidence-v5");
  expect(evidence.context).toMatchObject({
    version: "nuave-direct-ten-context-v2",
    identity: { name: "Kedai Fiksi" },
  });
  expect(evidence).not.toHaveProperty("brief");
  expect(evidence.prompts).toHaveLength(10);
  expect(evidence.observations).toHaveLength(10);
  expect(evidence.report).toBeTruthy();
  expect(evidence.report).not.toHaveProperty("operational_telemetry");
  expect(evidence.observations[0]).not.toHaveProperty("telemetry");
  // The email and the secret are not in the customer's export.
  expect(JSON.stringify(evidence)).not.toContain(ORDER_EMAIL);
  expect(JSON.stringify(evidence)).not.toContain(link.secret);
  await context.close();
});

test("AC-15: a wrong or missing secret shows the same plain not-available page, with the same private answer", async ({
  browser,
  baseURL,
}) => {
  const { context, page } = await freshBrowserPage(browser, baseURL);
  const calls = track(page);
  const wrong = "B".repeat(32);
  const seen: Array<{ status: number; body: string; headers: string }> = [];
  for (const path of ["/r", "/r#short", `/r#${wrong}`]) {
    await page.goto("about:blank"); // a hash-only change would not reload
    const response = await page.goto(path);
    expect(response?.headers()["cache-control"]).toMatch(/no-store|no-cache/);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(unavailableReport(page)).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Laporan ini tidak tersedia." }),
    ).toBeVisible();
    // No business name, no reason, no report.
    await expect(page.locator("main")).toHaveText(
      "Laporan ini tidak tersedia.",
    );
    await expect(page.locator("[data-direct-ten-report]")).toHaveCount(0);
  }
  for (const secret of [wrong, "C".repeat(32), "short", ""]) {
    const answer = await page.request.post("/api/report", { data: { secret } });
    const headers = answer.headers();
    seen.push({
      status: answer.status(),
      body: await answer.text(),
      headers: JSON.stringify([
        headers["cache-control"],
        headers["x-robots-tag"],
        headers["referrer-policy"],
        headers["content-type"],
      ]),
    });
  }
  expect(seen[0]!.status).toBe(404);
  for (const other of seen) expect(other).toEqual(seen[0]);
  expect(Object.keys(calls)).toEqual(["POST /api/report"]);
  await context.close();
});

test("Spec 012 on the saved report: retained Markdown answers, exact copy, references, reflow and one print tree", async ({
  page,
  browser,
  baseURL,
}, info) => {
  test.setTimeout(240_000);
  const link = await deliveredLink(page);
  const { context, page: fresh } = await freshBrowserPage(
    browser,
    baseURL,
    1440,
  );
  const calls = track(fresh);
  const external: string[] = [];
  fresh.on("request", (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(request.url());
  });
  await fresh.addInitScript(() => {
    Object.assign(window, { __printCalls: 0, __copiedAnswer: "" });
    window.print = () => {
      (window as unknown as { __printCalls: number }).__printCalls++;
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { __copiedAnswer: string }).__copiedAnswer =
            text;
        },
      },
    });
  });
  // Replace only fictional retained presentation evidence in the saved
  // report's answer (as it arrives in the browser). No server data, provider
  // send, schema field or request projection changes.
  type Saved = {
    context: unknown;
    observations: Array<{
      prompt_id: string;
      question: string;
      raw_answer: string;
      observed_at: string;
      sources: Array<{ title: string; url: string }>;
    }>;
    report: {
      provenance: unknown;
      key_findings: Array<{ evidence_prompt_ids: string[] }>;
      priorities: Array<{ evidence_prompt_ids: string[] }>;
    };
  };
  let retained: Saved | null = null;
  await fresh.route("**/api/report", async (route) => {
    const original = await route.fetch();
    const saved = (await original.json()) as Saved;
    saved.observations.forEach((o, i) => {
      o.raw_answer =
        `AWAL-JAWABAN-${i + 1}. Ya.\r\n\r\n## Keterangan lengkap ${i + 1}\r\n\r\nCafé  lokal — dua  spasi tetap dalam teks asli.\r\n\r\n` +
        (i === 0
          ? Array.from(
              { length: 12 },
              (_, n) =>
                `Paragraf ${n + 1}: Ini jawaban fiktif yang panjang untuk memeriksa pergantian halaman. Informasi ini memerlukan pemeriksaan sumber dan tidak membuktikan kualitas layanan.\r\n\r\n`,
            ).join("") +
            "| Layanan | Batasan |\r\n| --- | --- |\r\n| Contoh | " +
            "https://source.example/" +
            "panjang".repeat(28) +
            " |\r\n\r\n- satu\r\n  - anak pertama\r\n  - anak kedua\r\n- [x] penanda selesai\r\n- [ ] penanda belum selesai\r\n\r\n```text\r\nhttps://source.example/kode\r\n```\r\n\r\n[Label sumber](https://source.example/)\r\n\r\n![Gambar](https://source.example/tracker.png)\r\n\r\n<script>window.__unsafeReport = true</script>\r\n\r\n"
          : "") +
        `Namun, batas akhir jawaban ${i + 1} harus dibaca. AKHIR-JAWABAN-${i + 1}.`;
      o.sources = [
        { title: "Sumber fiktif tersimpan", url: "https://source.example/" },
      ];
    });
    const firstTwo = saved.observations.slice(0, 2).map((o) => o.prompt_id);
    saved.report.key_findings[0]!.evidence_prompt_ids = firstTwo;
    saved.report.priorities[0]!.evidence_prompt_ids = firstTwo;
    retained = saved;
    await route.fulfill({ response: original, json: saved });
  });
  await fresh.goto(link.path);
  const report = reportLocator(fresh);
  await expect(report).toBeVisible({ timeout: 30_000 });
  const patched = retained as Saved | null;
  expect(patched).not.toBeNull();
  const raw = patched!.observations.map((o) => ({
    question: o.question,
    answer: o.raw_answer,
  }));
  for (const state of [null, {}, { nuaveLocalIntake: true }]) {
    await fresh.evaluate((state) => {
      window.dispatchEvent(new PopStateEvent("popstate", { state }));
    }, state);
    await expect(report).toBeVisible();
  }
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  for (let i = 1; i <= 10; i++) {
    expect(await fresh.locator(`#report-question-${i}`).textContent()).toBe(
      raw[i - 1]!.question,
    );
    await expect(
      report.locator(`[data-report-answer="${i}"] [data-answer-body]`),
    ).toContainText(`AKHIR-JAWABAN-${i}.`);
  }
  await expect(
    report.locator(
      "[data-answer-body] a, [data-answer-body] img, [data-answer-body] input, [data-answer-body] script, [data-answer-body] [id]",
    ),
  ).toHaveCount(0);
  expect(
    await fresh.evaluate(
      () => (window as unknown as { __unsafeReport?: boolean }).__unsafeReport,
    ),
  ).toBeUndefined();
  const source = report
    .getByRole("link", { name: /Sumber fiktif tersimpan/ })
    .first();
  await expect(source).toHaveAttribute("href", "https://source.example/");
  await expect(source).toHaveAttribute("rel", "noopener noreferrer");
  await expect(source).toHaveAttribute("referrerpolicy", "no-referrer");
  expect(external).toEqual([]);

  const contents = fresh.getByRole("navigation", { name: "Report contents" });
  async function checkContentsNavigation() {
    const requestsBefore = Object.entries(calls);
    const urlBefore = fresh.url();
    const historyLength = await fresh.evaluate(() => history.length);
    for (const activation of ["mouse", "keyboard"] as const) {
      for (const id of [
        "summary",
        "findings",
        "priorities",
        "detail",
        "method",
      ]) {
        const anchor = contents.locator(`a[href="#${id}"]`);
        const target = fresh.locator(`#${id}`);
        await expect(target).toHaveCount(1);
        if (activation === "mouse") {
          await anchor.click();
        } else {
          await anchor.focus();
          await fresh.keyboard.press("Enter");
        }
        await expect(savedReport(fresh)).toBeVisible();
        await expect(report).toHaveCount(1);
        await expect(target).toBeFocused();
        await expect(
          target.getByRole("heading", { level: 2 }).first(),
        ).toBeInViewport();
        expect(
          await target.evaluate((el) => getComputedStyle(el).outlineStyle),
        ).not.toBe("none");
        expect(
          await target.evaluate((el) =>
            parseFloat(getComputedStyle(el).outlineWidth),
          ),
        ).toBeGreaterThan(0);
        expect(fresh.url()).toBe(urlBefore); // the secret stays in the address
        expect(await fresh.evaluate(() => history.length)).toBe(historyLength);
        expect(Object.entries(calls)).toEqual(requestsBefore);
      }
    }
  }
  await checkContentsNavigation();
  // Spec 012 B1: final header and contents match the direct-ten body.
  await expect(contents.getByRole("link")).toHaveText([
    "Hasil singkat",
    "Jawaban model AI",
    "Analisis Nuave",
    "Yang dapat dilakukan",
    "Tentang audit ini",
  ]);
  const hero = fresh.locator("header#stage-5");
  await expect(hero).toContainText("AI Visibility Report");
  await expect(hero).not.toContainText("Dibuat oleh");
  const earliest = patched!.observations.map((o) => o.observed_at).sort()[0];
  await expect(hero.locator("[data-report-header-facts] time")).toHaveAttribute(
    "datetime",
    earliest!,
  );
  await expect(hero.locator("[data-report-header-facts]")).toContainText(
    /Tanggal pengamatan.*UTC/,
  );
  await fresh
    .getByRole("button", { name: "Teks asli pertanyaan 1", exact: true })
    .click();
  expect(await fresh.locator("[data-raw-answer]").textContent()).toBe(
    raw[0]!.answer,
  );
  await fresh
    .getByRole("button", {
      name: "Salin pertanyaan dan jawaban 1",
      exact: true,
    })
    .click();
  const copied = await fresh.evaluate(
    () => (window as unknown as { __copiedAnswer: string }).__copiedAnswer,
  );
  expect(copied).toContain(raw[0]!.question);
  expect(copied).toContain(raw[0]!.answer);
  const reference = fresh
    .locator('#findings a[href="#report-question-2"]')
    .first();
  await reference.click();
  await expect(fresh.locator("#report-question-2")).toBeFocused();
  await reference.focus();
  await fresh.keyboard.press("Enter");
  await expect(fresh.locator("#report-question-2")).toBeFocused();
  expect(
    await fresh
      .locator("#report-question-2")
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  for (const width of [1440, 390, 320]) {
    await fresh.setViewportSize({ width, height: 900 });
    await fresh.locator("#summary").scrollIntoViewIfNeeded();
    expect(
      await fresh.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await fresh.screenshot({ path: info.outputPath(`report-${width}.png`) });
    await fresh.locator("#report-question-1").scrollIntoViewIfNeeded();
    await fresh.screenshot({ path: info.outputPath(`answer-${width}.png`) });
  }
  await fresh.setViewportSize({ width: 1440, height: 1000 });
  await fresh.evaluate(() => {
    document.body.style.zoom = "2";
  });
  await fresh.locator("#summary").scrollIntoViewIfNeeded();
  expect(
    await fresh.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await fresh.screenshot({ path: info.outputPath("report-200-percent.png") });
  await fresh.evaluate(() => {
    document.body.style.zoom = "";
  });
  expect(
    await fresh
      .getByRole("button", {
        name: "Salin pertanyaan dan jawaban 1",
        exact: true,
      })
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  // One print tree: the PDF button prints once, and every answer shows in print.
  await fresh
    .getByRole("button", { name: "Download PDF", exact: true })
    .click();
  expect(
    await fresh.evaluate(
      () => (window as unknown as { __printCalls: number }).__printCalls,
    ),
  ).toBe(1);
  await fresh.emulateMedia({ media: "print" });
  await expect(fresh.locator("[data-raw-answer]")).toBeHidden();
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  for (const answer of await report.locator("[data-answer-body]").all())
    await expect(answer).toBeVisible();
  await fresh.pdf({
    path: info.outputPath("report-print-a4.pdf"),
    format: "A4",
    printBackground: true,
  });
  await fresh.emulateMedia({ media: "screen" });
  const { json: exported } = await downloadEvidenceJson(fresh);
  expect(
    exported.observations.map((o: { raw_answer: string }) => o.raw_answer),
  ).toEqual(raw.map((o) => o.answer));
  expect(exported.export_version).toBe("nuave-evidence-v5");
  expect(exported.context).toEqual(patched!.context);
  expect(exported.context).not.toHaveProperty("targetCustomer");
  expect(exported).not.toHaveProperty("brief");
  expect(exported.report.provenance).toEqual(patched!.report.provenance);
  expect(exported.report).not.toHaveProperty("operational_telemetry");
  expect(exported.observations[0]).not.toHaveProperty("telemetry");
  await fresh.reload();
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  await checkContentsNavigation();
  expect(external).toEqual([]);
  // Opening the report asked only the report-data route, every time.
  expect(Object.keys(calls)).toEqual(["POST /api/report"]);
  await context.close();
});
