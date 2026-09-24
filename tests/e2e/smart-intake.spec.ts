import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("sensitive entry text retains the last safe draft without a provider request", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/audit/"))
      calls.push(request.url());
  });
  await page.goto("/audit");
  await page.getByRole("textbox", { name: "Nama bisnis" }).fill("Kedai Fiksi");
  await page
    .getByRole("textbox", { name: "URL website publik" })
    .fill("https://kedai-fiksi.example/?token=private");
  await expect(
    page.getByText("Informasi sensitif terdeteksi", { exact: false }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    sessionStorage.getItem("nuave.localIntake.v2"),
  );
  expect(saved).not.toContain("token=private");
  expect(saved).toContain("Kedai Fiksi");
  expect(calls).toEqual([]);
});

test("v2 synthetic intake reaches ten observations, report, JSON and print", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/audit/"))
      calls.push(`${request.method()} ${url.pathname}`);
  });
  await page.addInitScript(() => {
    (window as unknown as { __printCount: number }).__printCount = 0;
    window.print = () => {
      (window as unknown as { __printCount: number }).__printCount++;
    };
  });
  await page.goto("/audit");
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
  await page.reload();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  await page.getByRole("button", { name: "Mulai audit" }).click();
  await expect(page.locator('[data-local-audit-stage="done"]')).toBeVisible({
    timeout: 45_000,
  });
  const retained = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("nuave.localIntakeAudit.v2")!),
  );
  const report = page.locator("[data-direct-ten-report]");
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  for (let index = 1; index <= 10; index++) {
    const observation = retained.observations[index - 1];
    expect(observation.prompt_id).toBe(
      `NUAVE-DT-${String(index).padStart(2, "0")}`,
    );
    expect(await page.locator(`#report-question-${index}`).textContent()).toBe(
      observation.question,
    );
  }
  await page.emulateMedia({ media: "print" });
  for (const answer of await report.locator("[data-answer-body]").all())
    await expect(answer).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __printCount: number }).__printCount,
    ),
  ).toBe(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Unduh.*JSON/i }).click();
  const saved = await download;
  const evidence = JSON.parse(await readFile((await saved.path())!, "utf8"));
  expect(evidence.export_version).toBe("nuave-evidence-v5");
  expect(evidence.context).toMatchObject({
    version: "nuave-direct-ten-context-v2",
    identity: { name: "Kedai Fiksi" },
    category: { value: "kedai kopi", origin: "owner" },
    offerings: { value: ["kopi susu"], origin: "owner" },
    comparators: { value: { mode: "unknown" } },
  });
  expect(evidence).not.toHaveProperty("brief");
  expect(evidence.prompts).toHaveLength(10);
  expect(evidence.observations).toHaveLength(10);
  expect(evidence.report).toBeTruthy();
  expect(
    calls.filter((call) => call === "GET /api/audit/identity"),
  ).toHaveLength(1);
  expect(
    calls.filter((call) => call === "POST /api/audit/extract"),
  ).toHaveLength(1);
  expect(
    calls.filter((call) => call === "POST /api/audit/glm-questions"),
  ).toHaveLength(1);
  expect(calls.filter((call) => call === "POST /api/audit/run")).toHaveLength(
    1,
  );
  expect(
    calls.filter((call) => call === "POST /api/audit/report"),
  ).toHaveLength(1);
});
