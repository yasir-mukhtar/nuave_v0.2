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
  const confirmedContext = await page.evaluate(
    () =>
      JSON.parse(sessionStorage.getItem("nuave.localIntake.v2")!).frozen
        .context,
  );
  expect(payloads[0]!.context).toEqual(confirmedContext);
  expect(beforeReload.context).toEqual(confirmedContext);
  expect(confirmedContext.market.value).toEqual({
    reach: "seluruh",
    areas: [],
  });
  expect(confirmedContext).not.toHaveProperty("targetCustomer");
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

// Spec 012 R-15/AC-16/AC-17: a retained-usefulness failure reads as the
// answers-only recovery — ten exact answers with provenance, the unfinished
// notice, no report controls — and one explicit report-only retry.
test("usefulness failure shows answers-only recovery; explicit retry finishes the report", async ({
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
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Laporan belum memenuhi syarat laporan.",
        code: "REPORT_USEFULNESS_FAILURE",
        telemetry: [],
        diagnostics: ["usefulness_minimum_not_met"],
      }),
    });
  });
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(
    page.locator('[data-local-audit-stage="report-failed"]'),
  ).toBeVisible({ timeout: 45_000 });

  // Required surface: the exact notice and all ten retained answers.
  const notice = page.getByRole("alert").filter({
    hasText: "Analisis Nuave belum selesai",
  });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(
    "Sepuluh jawaban model AI sudah tersimpan. Analisis belum memenuhi syarat laporan.",
  );
  await expect(page.locator("[data-report-answer]")).toHaveCount(10);
  await expect(
    page.locator('[data-report-answer="1"] [data-answer-body]'),
  ).not.toBeEmpty();
  await expect(
    page
      .locator('[data-report-answer="1"]')
      .getByRole("heading", { name: "Sumber yang tersimpan" }),
  ).toBeVisible();

  // Forbidden surface: no classification, findings, actions, scores or any
  // report-ready/export/print/PDF/JSON control.
  await expect(page.getByText("Penyebutan")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /PDF|JSON|Unduh|Cetak/i }),
  ).toHaveCount(0);
  await expect(page.getByText("Laporan siap")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Report contents" }),
  ).toHaveCount(0);

  // A reload restores the same state without another request.
  await page.reload();
  await expect(
    page.locator('[data-local-audit-stage="report-failed"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Coba buat laporan lagi" }),
  ).toBeVisible();
  expect(calls["POST /api/audit/report"]).toBe(1);
  expect(calls["POST /api/audit/run"]).toBe(1);

  // The explicit retry replays the retained observations — same payload —
  // and a supported report then replaces the recovery view.
  await page.getByRole("button", { name: "Coba buat laporan lagi" }).click();
  await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible({
    timeout: 45_000,
  });
  expect(calls["POST /api/audit/run"]).toBe(1);
  expect(calls["POST /api/audit/report"]).toBe(2);
  expect(payloads[1]!.observations).toEqual(payloads[0]!.observations);
  expect(payloads[1]!.context).toEqual(payloads[0]!.context);
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

test("Spec 012: retained Markdown answers, exact copy, references, reflow and one print tree", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const calls = track(page);
  const external: string[] = [];
  page.on("request", (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(request.url());
  });
  await page.addInitScript(() => {
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
  await toQuestions(page);
  expect(calls["POST /api/audit/run"]).toBeUndefined();
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible({
    timeout: 30_000,
  });
  // Replace only fictional retained presentation evidence. No new runtime
  // harness, provider send, schema field or request projection is introduced.
  const raw = await page.evaluate(() => {
    const key = "nuave.localIntakeAudit.v2";
    const saved = JSON.parse(sessionStorage.getItem(key)!);
    saved.observations.forEach(
      (
        o: { raw_answer: string; sources: { title: string; url: string }[] },
        i: number,
      ) => {
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
      },
    );
    saved.report.key_findings[0].evidence_prompt_ids = saved.observations
      .slice(0, 2)
      .map((o: { prompt_id: string }) => o.prompt_id);
    saved.report.priorities[0].evidence_prompt_ids = saved.observations
      .slice(0, 2)
      .map((o: { prompt_id: string }) => o.prompt_id);
    sessionStorage.setItem(key, JSON.stringify(saved));
    return saved.observations.map(
      (o: { question: string; raw_answer: string }) => ({
        question: o.question,
        answer: o.raw_answer,
      }),
    );
  });
  await page.reload();
  const report = page.locator("[data-direct-ten-report]");
  await expect(report).toBeVisible();
  for (const state of [null, {}, { nuaveLocalIntake: true }]) {
    await page.evaluate((state) => {
      window.dispatchEvent(new PopStateEvent("popstate", { state }));
    }, state);
    await expect(report).toBeVisible();
  }
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  for (let i = 1; i <= 10; i++) {
    expect(await page.locator(`#report-question-${i}`).textContent()).toBe(
      raw[i - 1].question,
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
    await page.evaluate(
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
  const snapshot = await page.evaluate(() =>
    sessionStorage.getItem("nuave.localIntakeAudit.v2"),
  );
  const contents = page.getByRole("navigation", { name: "Report contents" });
  async function checkContentsNavigation(directTen: boolean) {
    const requestsBefore = Object.entries(calls);
    const urlBefore = page.url();
    const historyLength = await page.evaluate(() => history.length);
    for (const activation of ["mouse", "keyboard"] as const) {
      for (const id of [
        "summary",
        "findings",
        "priorities",
        "detail",
        "method",
      ]) {
        const link = contents.locator(`a[href="#${id}"]`);
        const target = page.locator(`#${id}`);
        await expect(target).toHaveCount(1);
        if (activation === "mouse") {
          await link.click();
        } else {
          await link.focus();
          await page.keyboard.press("Enter");
        }
        await expect(
          page.locator('[data-local-audit-stage="done"]'),
        ).toBeVisible();
        await expect(report).toHaveCount(directTen ? 1 : 0);
        await expect(target).toBeFocused();
        await expect(
          target.getByRole("heading", { level: 2 }).first(),
        ).toBeInViewport();
        if (directTen) {
          expect(
            await target.evaluate((el) => getComputedStyle(el).outlineStyle),
          ).not.toBe("none");
          expect(
            await target.evaluate((el) =>
              parseFloat(getComputedStyle(el).outlineWidth),
            ),
          ).toBeGreaterThan(0);
        }
        expect(page.url()).toBe(urlBefore);
        expect(await page.evaluate(() => history.length)).toBe(historyLength);
        expect(Object.entries(calls)).toEqual(requestsBefore);
        expect(calls["POST /api/audit/run"]).toBe(1);
        expect(calls["POST /api/audit/report"]).toBe(1);
      }
    }
  }
  await checkContentsNavigation(true);
  // Spec 012 B1: final header and contents match the direct-ten body.
  await expect(contents.getByRole("link")).toHaveText([
    "Hasil singkat",
    "Jawaban model AI",
    "Analisis Nuave",
    "Yang dapat dilakukan",
    "Tentang audit ini",
  ]);
  const hero = page.locator("header#stage-5");
  await expect(hero).toContainText("AI Visibility Report");
  await expect(hero).not.toContainText("Dibuat oleh");
  const retainedTimes = (
    JSON.parse(snapshot!) as { observations: { observed_at: string }[] }
  ).observations.map((o) => o.observed_at);
  const earliest = [...retainedTimes].sort()[0];
  await expect(hero.locator("[data-report-header-facts] time")).toHaveAttribute(
    "datetime",
    earliest!,
  );
  await expect(hero.locator("[data-report-header-facts]")).toContainText(
    /Tanggal pengamatan.*UTC/,
  );
  await page
    .getByRole("button", { name: "Teks asli pertanyaan 1", exact: true })
    .click();
  expect(await page.locator("[data-raw-answer]").textContent()).toBe(
    raw[0].answer,
  );
  await page
    .getByRole("button", {
      name: "Salin pertanyaan dan jawaban 1",
      exact: true,
    })
    .click();
  const copied = await page.evaluate(
    () => (window as unknown as { __copiedAnswer: string }).__copiedAnswer,
  );
  expect(copied).toContain(raw[0].question);
  expect(copied).toContain(raw[0].answer);
  const reference = page
    .locator('#findings a[href="#report-question-2"]')
    .first();
  await reference.click();
  await expect(page.locator("#report-question-2")).toBeFocused();
  await reference.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#report-question-2")).toBeFocused();
  expect(
    await page
      .locator("#report-question-2")
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator("#summary").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`report-${width}.png`) });
    await page.locator("#report-question-1").scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`answer-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    document.body.style.zoom = "2";
  });
  await page.locator("#summary").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("report-200-percent.png") });
  await page.evaluate(() => {
    document.body.style.zoom = "";
  });
  expect(
    await page
      .getByRole("button", {
        name: "Salin pertanyaan dan jawaban 1",
        exact: true,
      })
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __printCalls: number }).__printCalls,
    ),
  ).toBe(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-raw-answer]")).toBeHidden();
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  for (const answer of await report.locator("[data-answer-body]").all())
    await expect(answer).toBeVisible();
  await page.pdf({
    path: info.outputPath("report-print-a4.pdf"),
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Unduh bukti JSON", exact: true })
    .click();
  const exported = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(
    exported.observations.map((o: { raw_answer: string }) => o.raw_answer),
  ).toEqual(raw.map((o: { answer: string }) => o.answer));
  const retained = JSON.parse(snapshot!);
  expect(exported.export_version).toBe("nuave-evidence-v5");
  expect(exported.context).toEqual(retained.context);
  expect(exported.context.market.value).toEqual({
    reach: "seluruh",
    areas: [],
  });
  expect(exported.context).not.toHaveProperty("targetCustomer");
  expect(exported).not.toHaveProperty("brief");
  expect(exported.report.provenance).toEqual(retained.report.provenance);
  expect(exported.report).not.toHaveProperty("operational_telemetry");
  expect(exported.observations[0]).not.toHaveProperty("telemetry");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("nuave.localIntakeAudit.v2"),
    ),
  ).toBe(snapshot);
  await page.reload();
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  await checkContentsNavigation(true);
  // Contents navigation adds no history entry: real browser Back still
  // returns to the approved questions and reopening uses the saved report.
  const requestsBeforeBack = Object.entries(calls);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
  ).toBeVisible();
  await expect(report).toHaveCount(0);
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  expect(Object.entries(calls)).toEqual(requestsBeforeBack);

  // Historical method routing/navigation is exercised at the component
  // boundary; held v1 sessions never regain public report delivery.
  expect(calls["POST /api/audit/run"]).toBe(1);
  expect(calls["POST /api/audit/report"]).toBe(1);
  expect(external).toEqual([]);
});
