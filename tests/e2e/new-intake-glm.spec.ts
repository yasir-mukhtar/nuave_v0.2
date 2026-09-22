import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const allowed = new Set([
  "/api/audit/identity",
  "/api/audit/extract",
  "/api/audit/glm-questions",
  "/api/audit/run",
  "/api/audit/report",
]);
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

function track(page: Page) {
  const calls: Record<string, number> = {};
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/"))
      calls[`${request.method()} ${path}`] =
        (calls[`${request.method()} ${path}`] ?? 0) + 1;
  });
  return calls;
}

async function toQuestions(page: Page, suffix = "") {
  await page.goto(`/audit${suffix}`);
  await page.getByRole("textbox", { name: "Nama bisnis" }).fill("Kedai Fiksi");
  await page
    .getByRole("textbox", { name: "URL website publik" })
    .fill("https://kedai-fiksi.example/");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ini yang Nuave pahami." }),
  ).toBeVisible();
  const category = page.locator(
    'section[aria-label="Kategori dan penawaran utama"]',
  );
  await category.getByRole("button", { name: "Ubah" }).click();
  await category.getByRole("textbox", { name: "Kategori" }).fill("kedai kopi");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .fill("kopi susu");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .press("Enter");
  await page.getByRole("checkbox", { name: "Di lokasi bisnis Anda" }).click();
  await page.getByRole("button", { name: "Seluruh Indonesia" }).click();
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
  ).toBeVisible();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
}

test("edited questions and exact v2 context survive reload through report", async ({
  page,
}) => {
  const calls = track(page);
  const payloads: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (
      ["/api/audit/run", "/api/audit/report"].includes(
        new URL(request.url()).pathname,
      )
    )
      payloads.push(request.postDataJSON() as Record<string, unknown>);
  });
  await toQuestions(page);
  const wording =
    "Pilihan kedai kopi apa yang cocok untuk pekerja di Indonesia?";
  await page
    .getByRole("button", { name: "Ubah pertanyaan 1", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Pertanyaan 1" }).fill(wording);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.reload();
  await expect(page.locator('[data-question-slot="1"]')).toContainText(wording);
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible({
    timeout: 45_000,
  });
  async function exportJson() {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Unduh bukti JSON" }).click();
    const saved = await download;
    return JSON.parse(await readFile((await saved.path())!, "utf8")) as Record<
      string,
      unknown
    >;
  }
  const beforeReload = await exportJson();
  expect(beforeReload.prompts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        question: wording,
        edited: true,
        original_question: expect.any(String),
      }),
    ]),
  );
  await page.reload();
  await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible();
  const afterReload = await exportJson();
  const stable = (value: Record<string, unknown>) => {
    const { exported_at: _exportedAt, ...rest } = value;
    return rest;
  };
  expect(stable(afterReload)).toEqual(stable(beforeReload));
  expect(payloads).toHaveLength(2);
  expect(payloads[0]).toMatchObject({
    client_contract_version: "live-audit-stream-v2",
    context: { version: "nuave-direct-ten-context-v2" },
  });
  expect(payloads[1]).toMatchObject({
    client_contract_version: "live-audit-report-v2",
    context: payloads[0]!.context,
  });
  expect(payloads[0]).not.toHaveProperty("brief");
  expect(payloads[1]).not.toHaveProperty("brief");
  expect(calls["GET /api/audit/identity"]).toBe(1);
  expect(calls["POST /api/audit/extract"]).toBe(1);
  expect(calls["POST /api/audit/glm-questions"]).toBe(1);
  expect(calls["POST /api/audit/run"]).toBe(1);
  expect(calls["POST /api/audit/report"]).toBe(1);
});

test("reload during an interrupted run requires explicit resume", async ({
  page,
}) => {
  const calls = track(page);
  await toQuestions(page);
  await page.route("**/api/audit/run", () => new Promise(() => {}));
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(
    page.locator('[data-local-audit-stage="running"]'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('[data-local-audit-stage="interrupted"]'),
  ).toBeVisible();
  expect(calls["POST /api/audit/run"]).toBe(1);
  await page.unroute("**/api/audit/run");
  await page.getByRole("button", { name: "Lanjutkan audit" }).click();
  await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible({
    timeout: 45_000,
  });
  expect(calls["POST /api/audit/run"]).toBe(2);
  expect(calls["POST /api/audit/report"]).toBe(1);
});

test("partial run resumes three saved observations with exact context", async ({
  page,
}) => {
  const payloads: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/audit/run")
      payloads.push(request.postDataJSON() as Record<string, unknown>);
  });
  await toQuestions(page);
  await page.route("**/api/audit/run", async (route) => {
    const response = await route.fetch();
    const lines = (await response.text()).split("\n").filter(Boolean);
    const done = lines
      .map((line, index) =>
        (JSON.parse(line) as { type: string }).type === "prompt_completed"
          ? index
          : -1,
      )
      .filter((index) => index >= 0);
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${lines.slice(0, done[2]! + 1).join("\n")}\n`,
    });
  });
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(
    page.locator('[data-local-audit-stage="interrupted"]'),
  ).toBeVisible({ timeout: 45_000 });
  await page.reload();
  await page.unroute("**/api/audit/run");
  await page.getByRole("button", { name: "Lanjutkan audit" }).click();
  await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible({
    timeout: 45_000,
  });
  expect(payloads).toHaveLength(2);
  expect(payloads[1]!.resume_observations).toHaveLength(3);
  expect(payloads[1]!.context).toEqual(payloads[0]!.context);
});

test("failed report allows a report-only retry with saved observations and ledger", async ({
  page,
}) => {
  const calls = track(page);
  const payloads: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/audit/report")
      payloads.push(request.postDataJSON() as Record<string, unknown>);
  });
  await toQuestions(page);
  let failed = false;
  await page.route("**/api/audit/report", (route) => {
    if (failed) return route.fallback();
    failed = true;
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Laporan belum dapat dibuat.",
        code: "REPORT_TRANSIENT_FAILURE",
        telemetry: [],
      }),
    });
  });
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(
    page.locator('[data-local-audit-stage="report-failed"]'),
  ).toBeVisible({ timeout: 45_000 });
  await page.reload();
  expect(calls["POST /api/audit/report"]).toBe(1);
  await page.getByRole("button", { name: "Coba buat laporan lagi" }).click();
  await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible({
    timeout: 45_000,
  });
  expect(calls["POST /api/audit/run"]).toBe(1);
  expect(calls["POST /api/audit/report"]).toBe(2);
  expect(payloads[1]!.context).toEqual(payloads[0]!.context);
  expect(
    (payloads[1]!.budget as { calls: { stage: string }[] }).calls.filter(
      (call) => call.stage === "observation",
    ),
  ).toHaveLength(10);
});

test("Back and audit start obey the three-attempt report ceiling without rerunning observations", async ({
  page,
}) => {
  const calls = track(page);
  await toQuestions(page);
  await page.route("**/api/audit/report", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Laporan belum dapat dibuat.",
        code: "REPORT_TRANSIENT_FAILURE",
        telemetry: [],
      }),
    }),
  );
  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.getByRole("button", { name: "Mulai audit" }).click();
    await expect(
      page.locator('[data-local-audit-stage="report-failed"]'),
    ).toBeVisible({ timeout: 45_000 });
    expect(calls["POST /api/audit/report"]).toBe(Math.min(attempt, 3));
    expect(calls["POST /api/audit/run"]).toBe(1);
    if (attempt < 4) {
      await page.getByRole("button", { name: "Kembali ke pertanyaan" }).click();
      await expect(
        page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
      ).toBeVisible();
    }
  }
});

for (const unresolvedAttempt of [1, 3]) {
  test(`reload during unresolved report attempt ${unresolvedAttempt} restores report-only recovery`, async ({
    page,
  }) => {
    const calls = track(page);
    await toQuestions(page);
    let reportAttempt = 0;
    await page.route("**/api/audit/report", (route) => {
      reportAttempt++;
      if (reportAttempt === unresolvedAttempt) return new Promise(() => {});
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Laporan belum dapat dibuat.",
          code: "REPORT_TRANSIENT_FAILURE",
          telemetry: [],
        }),
      });
    });
    await page.getByRole("button", { name: "Mulai audit" }).click();
    for (let attempt = 1; attempt < unresolvedAttempt; attempt++) {
      await expect(
        page.locator('[data-local-audit-stage="report-failed"]'),
      ).toBeVisible({ timeout: 45_000 });
      await page
        .getByRole("button", { name: "Coba buat laporan lagi" })
        .click();
    }
    await expect
      .poll(() => calls["POST /api/audit/report"])
      .toBe(unresolvedAttempt);
    const saved = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("nuave.localIntakeAudit.v2")!),
    );
    expect(saved).toMatchObject({
      status: "running",
      reportCallAttempts: unresolvedAttempt,
      report: null,
    });
    expect(saved.observations).toHaveLength(10);
    expect(saved.observations).toEqual(
      Array.from({ length: 10 }, () =>
        expect.objectContaining({ run_status: "completed" }),
      ),
    );

    // A graceful reload may finish the old fetch's rejection handler. Restore
    // the actual in-flight snapshot before hydration to cover a reload that
    // terminates the document before that handler can persist a failure.
    await page.addInitScript((inFlight) => {
      sessionStorage.setItem(
        "nuave.localIntakeAudit.v2",
        JSON.stringify(inFlight),
      );
    }, saved);
    await page.reload();
    await expect(
      page.locator('[data-local-audit-stage="report-failed"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Lanjutkan audit" }),
    ).toHaveCount(0);
    expect(calls["POST /api/audit/run"]).toBe(1);
    expect(calls["POST /api/audit/report"]).toBe(unresolvedAttempt);
    expect(
      await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem("nuave.localIntakeAudit.v2")!),
      ),
    ).toEqual(saved);

    if (unresolvedAttempt === 3) {
      await expect(
        page.getByText("Batas pembuatan laporan tercapai"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Coba buat laporan lagi" }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Kembali ke pertanyaan" }).click();
      await page.getByRole("button", { name: "Mulai audit" }).click();
      await expect(
        page.getByText("Batas pembuatan laporan tercapai"),
      ).toBeVisible();
      expect(calls["POST /api/audit/report"]).toBe(3);
    } else {
      await page.unroute("**/api/audit/report");
      const request = page.waitForRequest("**/api/audit/report");
      await page
        .getByRole("button", { name: "Coba buat laporan lagi" })
        .click();
      const retry = (await request).postDataJSON();
      expect(retry.context).toEqual(saved.context);
      expect(retry.observations).toEqual(saved.observations);
      expect(retry.budget.calls).toEqual([
        ...saved.preparationCalls,
        ...saved.runCalls,
        ...saved.reportCalls,
      ]);
      await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible(
        {
          timeout: 45_000,
        },
      );
      expect(calls["POST /api/audit/report"]).toBe(2);
    }
    expect(calls["POST /api/audit/run"]).toBe(1);
    expect(calls["GET /api/audit/extract"]).toBe(1);
  });
}

test("unfinished run does not request a report", async ({ page }) => {
  const calls = track(page);
  await toQuestions(page);
  await page.route("**/api/audit/run", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${JSON.stringify({ type: "run_unfinished", completed: 8, failed_prompt_ids: ["NUAVE-DT-09", "NUAVE-DT-10"], message: "Dua pertanyaan belum selesai." })}\n`,
    }),
  );
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(
    page.locator('[data-local-audit-stage="unfinished"]'),
  ).toBeVisible({ timeout: 45_000 });
  expect(calls["POST /api/audit/report"]).toBeUndefined();
});

test("GLM failure is visible and never silently retried", async ({ page }) => {
  const calls = track(page);
  await page.goto("/audit?glm-stub=timeout");
  await page.getByRole("textbox", { name: "Nama bisnis" }).fill("Kedai Fiksi");
  await page
    .getByRole("textbox", { name: "URL website publik" })
    .fill("https://kedai-fiksi.example/");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ini yang Nuave pahami." }),
  ).toBeVisible();
  const category = page.locator(
    'section[aria-label="Kategori dan penawaran utama"]',
  );
  await category.getByRole("button", { name: "Ubah" }).click();
  await category.getByRole("textbox", { name: "Kategori" }).fill("kedai kopi");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .fill("kopi susu");
  await category
    .getByRole("textbox", { name: "Penawaran lain" })
    .press("Enter");
  await page.getByRole("checkbox", { name: "Di lokasi bisnis Anda" }).click();
  await page.getByRole("button", { name: "Seluruh Indonesia" }).click();
  await page
    .getByRole("button", { name: "Sudah sesuai — buat pertanyaan audit" })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("[data-question-slot]")).toHaveCount(0);
  expect(calls["POST /api/audit/glm-questions"]).toBe(1);
});

test("a failed budget read is fetched again before an explicit audit retry", async ({
  page,
}) => {
  const calls = track(page);
  await toQuestions(page);
  let failed = false;
  await page.route("**/api/audit/extract", (route) => {
    if (route.request().method() !== "GET" || failed) return route.fallback();
    failed = true;
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Pengendali biaya tidak tersedia." }),
    });
  });
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(page.locator('[data-local-audit-stage="failed"]')).toBeVisible();
  expect(calls["POST /api/audit/run"]).toBeUndefined();
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible({
    timeout: 45_000,
  });
  expect(calls["GET /api/audit/extract"]).toBe(2);
  expect(calls["POST /api/audit/run"]).toBe(1);
});
