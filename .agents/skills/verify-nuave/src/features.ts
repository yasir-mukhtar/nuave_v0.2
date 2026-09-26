import { expect as baseExpect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  auditStage,
  completeSyntheticSummary,
  confirmSummary,
  downloadEvidenceJson,
  editQuestion,
  ENTRY_INVALID_NOTICE,
  expectAuditDone,
  expectEmptyEntry,
  expectQuestionReview,
  expectSummary,
  expectTenQuestions,
  fillEntry,
  injectUsefulnessFailureOnce,
  openAuditFromLanding,
  pressPeriksa,
  reportLocator,
  SENSITIVE_INPUT_NOTICE,
  startAudit,
  toQuestions,
} from "../../../../tests/e2e/journey";

const expect = baseExpect.configure({ timeout: 10_000 });

export const FEATURES = [
  "audit-entry",
  "smart-intake-summary",
  "question-review",
  "audit-run",
  "report-and-recovery",
] as const;
export type Feature = (typeof FEATURES)[number];
export const INJECTIONS = { "report-and-recovery": ["usefulness-failure"] };

export type Step = {
  index: number;
  name: string;
  url: string;
  screenshot: string;
  aria: string;
};

export type DriveContext = {
  page: Page;
  dir: string;
  calls: Record<string, number>;
  steps: Step[];
  checks: string[];
  artifacts: Record<string, string>;
  /** Runs one user action, then captures a screenshot and ARIA snapshot. */
  step(name: string, action: () => Promise<void>): Promise<void>;
  /** Records an observed end state that the recipe asserted. */
  check(text: string): void;
};

export function createContext(
  page: Page,
  dir: string,
  calls: Record<string, number>,
): DriveContext {
  const ctx: DriveContext = {
    page,
    dir,
    calls,
    steps: [],
    checks: [],
    artifacts: {},
    async step(name, action) {
      await action();
      const index = ctx.steps.length + 1;
      const base = `${String(index).padStart(2, "0")}-${name}`;
      await page.screenshot({ path: join(dir, `${base}.png`), fullPage: true });
      await writeFile(
        join(dir, `${base}.aria.yml`),
        `${await page.locator("body").ariaSnapshot()}\n`,
      );
      ctx.steps.push({
        index,
        name,
        url: page.url(),
        screenshot: `${base}.png`,
        aria: `${base}.aria.yml`,
      });
    },
    check(text) {
      ctx.checks.push(text);
    },
  };
  return ctx;
}

async function sessionValue(page: Page, key: string) {
  return page.evaluate(
    (k) => JSON.parse(sessionStorage.getItem(k) ?? "null"),
    key,
  );
}

/** Headless Chromium cannot show the print dialog; count the call instead. */
async function countPrintCalls(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __verifyPrintCalls: number }).__verifyPrintCalls =
      0;
    window.print = () => {
      (window as unknown as { __verifyPrintCalls: number })
        .__verifyPrintCalls++;
    };
  });
  return () =>
    page.evaluate(
      () =>
        (window as unknown as { __verifyPrintCalls: number })
          .__verifyPrintCalls,
    );
}

async function auditEntry(ctx: DriveContext) {
  const { page } = ctx;
  await ctx.step("landing", async () => {
    await page.goto("/");
  });
  await ctx.step("landing-cta-to-audit", async () => {
    await openAuditFromLanding(page);
    await expectEmptyEntry(page);
  });
  ctx.check(
    "Landing CTA `Cek bisnis saya di AI` opens /audit on an empty entry step",
  );
  await ctx.step("empty-submit-rejected", async () => {
    await pressPeriksa(page);
    await expect(
      page.getByRole("alert").filter({ hasText: ENTRY_INVALID_NOTICE }),
    ).toBeVisible();
  });
  ctx.check(`Periksa with empty fields shows "${ENTRY_INVALID_NOTICE}"`);
  await ctx.step("invalid-url-rejected", async () => {
    await fillEntry(page, { url: "bukan alamat web" });
    await pressPeriksa(page);
    await expect(
      page.getByRole("alert").filter({ hasText: ENTRY_INVALID_NOTICE }),
    ).toBeVisible();
  });
  ctx.check("Periksa with a non-URL source shows the same validation alert");
  await ctx.step("sensitive-url-blocked", async () => {
    await fillEntry(page, {
      url: "https://kedai-fiksi.example/?token=private",
    });
    await expect(
      page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
    ).toBeVisible();
  });
  const saved = JSON.stringify(
    await sessionValue(page, "nuave.localIntake.v2"),
  );
  expect(saved).not.toContain("token=private");
  expect(saved).toContain("Kedai Fiksi");
  ctx.check(
    "A token-like URL shows the sensitive-input notice and is not saved",
  );
  expect(ctx.calls).toEqual({});
  ctx.check("No /api request was made during entry and validation");
}

async function smartIntakeSummary(ctx: DriveContext) {
  const { page } = ctx;
  await ctx.step("entry-filled", async () => {
    await fillEntry(page);
  });
  await ctx.step("summary", async () => {
    await pressPeriksa(page);
    await expectSummary(page);
  });
  ctx.check('`Periksa` reaches "Ini yang Nuave pahami."');
  await ctx.step("summary-rows-edited", async () => {
    await completeSyntheticSummary(page);
  });
  await ctx.step("focus-one-offering", async () => {
    await page
      .getByRole("button", { name: "Satu produk atau layanan" })
      .click();
    // Synthetic reading proposes no offerings, so there is no radio to pick;
    // the user types the name instead.
    await page
      .getByRole("textbox", { name: "Nama lain bila tidak ada dalam pilihan" })
      .fill("kopi susu");
  });
  await ctx.step("questions-created", async () => {
    await confirmSummary(page);
    await expectQuestionReview(page);
    await expectTenQuestions(page);
  });
  const intake = await sessionValue(page, "nuave.localIntake.v2");
  expect(intake.frozen.context).toMatchObject({
    category: { value: "kedai kopi", origin: "owner" },
    focus: { value: { kind: "produk", name: "kopi susu" } },
    market: { value: { reach: "seluruh" } },
  });
  ctx.check(
    "Frozen context keeps the edited category, the one-offering focus and nationwide reach",
  );
  expect(ctx.calls).toEqual({
    "GET /api/audit/identity": 1,
    "POST /api/audit/extract": 1,
    "POST /api/audit/glm-questions": 1,
  });
  ctx.check("Exactly one identity, one extract and one question request");
}

async function questionReview(ctx: DriveContext) {
  const { page } = ctx;
  const wording = "Kedai kopi apa yang cocok untuk pekerja di Indonesia?";
  await ctx.step("question-review", async () => {
    await toQuestions(page);
  });
  await ctx.step("question-1-edited", async () => {
    await editQuestion(page, 1, wording);
    await expect(page.locator('[data-question-slot="1"]')).toContainText(
      wording,
    );
  });
  await ctx.step("edit-survives-reload", async () => {
    await page.reload();
    await expectTenQuestions(page);
    await expect(page.locator('[data-question-slot="1"]')).toContainText(
      wording,
    );
  });
  ctx.check("An edited question keeps its wording after a reload");
  await ctx.step("audit-started", async () => {
    await startAudit(page);
    await expect(
      auditStage(page, "running").or(auditStage(page, "done")),
    ).toBeVisible();
  });
  ctx.check("`Mulai audit` leaves the review and starts the audit");
  await expectAuditDone(page);
  const audit = await sessionValue(page, "nuave.localIntakeAudit.v2");
  expect(audit.observations[0].question).toBe(wording);
  ctx.check("The started audit uses the edited wording for question 1");
}

async function auditRun(ctx: DriveContext) {
  const { page } = ctx;
  await ctx.step("question-review", async () => {
    await toQuestions(page);
  });
  await ctx.step("audit-done", async () => {
    await startAudit(page);
    await expectAuditDone(page);
  });
  const report = reportLocator(page);
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  const audit = await sessionValue(page, "nuave.localIntakeAudit.v2");
  expect(audit.observations).toHaveLength(10);
  audit.observations.forEach((o: { prompt_id: string }, i: number) =>
    expect(o.prompt_id).toBe(`NUAVE-DT-${String(i + 1).padStart(2, "0")}`),
  );
  ctx.check("Ten observations NUAVE-DT-01…10 are saved and ten answers show");
  await expect(
    page.getByText("Audit lokal — jawaban sintetis", { exact: true }),
  ).toBeVisible();
  ctx.check('The report carries the "Audit lokal — jawaban sintetis" notice');
  await ctx.step("after-reload", async () => {
    await page.reload();
    await expectAuditDone(page);
  });
  expect(ctx.calls["POST /api/audit/run"]).toBe(1);
  expect(ctx.calls["POST /api/audit/report"]).toBe(1);
  ctx.check(
    "A reload shows the saved report with no second run or report request",
  );
}

async function reportAndDownloads(ctx: DriveContext) {
  const { page } = ctx;
  const printCalls = await countPrintCalls(page);
  await ctx.step("question-review", async () => {
    await toQuestions(page);
  });
  await ctx.step("report", async () => {
    await startAudit(page);
    await expectAuditDone(page);
    await expect(reportLocator(page)).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Report contents" }),
    ).toBeVisible();
  });
  await ctx.step("download-pdf-pressed", async () => {
    await page
      .getByRole("button", { name: "Download PDF", exact: true })
      .click();
    expect(await printCalls()).toBe(1);
  });
  ctx.check(
    "`Download PDF` opens the browser print dialog once (window.print)",
  );
  await page.emulateMedia({ media: "print" });
  for (const answer of await reportLocator(page)
    .locator("[data-answer-body]")
    .all())
    await expect(answer).toBeVisible();
  const pdf = await page.pdf({
    path: join(ctx.dir, "report-a4.headless.pdf"),
    format: "A4",
    printBackground: true,
  });
  ctx.artifacts.pdf = "report-a4.headless.pdf";
  ctx.artifacts.pdfLabel = "headless, not native print";
  ctx.artifacts.pdfPages = String(
    (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length,
  );
  await page.emulateMedia({ media: "screen" });
  ctx.check("All ten answers are visible in print media; A4 PDF saved");
  const { download, json } = await downloadEvidenceJson(page);
  await download.saveAs(join(ctx.dir, "download-evidence.json"));
  ctx.artifacts.json = "download-evidence.json";
  ctx.artifacts.jsonSuggestedName = download.suggestedFilename();
  expect(json.export_version).toBe("nuave-evidence-v5");
  expect(json.observations).toHaveLength(10);
  expect(json.report).toBeTruthy();
  ctx.check(
    "`Unduh bukti JSON` downloads nuave-evidence-v5 with ten observations and a report",
  );
  expect(ctx.calls["POST /api/audit/run"]).toBe(1);
  expect(ctx.calls["POST /api/audit/report"]).toBe(1);
}

async function answersOnlyRecovery(ctx: DriveContext) {
  const { page } = ctx;
  await ctx.step("question-review", async () => {
    await toQuestions(page);
  });
  await injectUsefulnessFailureOnce(page);
  ctx.check(
    "FAULT INJECTED: first POST /api/audit/report answered with a fake 422 REPORT_USEFULNESS_FAILURE",
  );
  await ctx.step("answers-only-recovery", async () => {
    await startAudit(page);
    await expect(auditStage(page, "report-failed")).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Analisis Nuave belum selesai" }),
    ).toBeVisible();
    await expect(page.locator("[data-report-answer]")).toHaveCount(10);
    await expect(
      page.getByRole("button", { name: /PDF|JSON|Unduh|Cetak/i }),
    ).toHaveCount(0);
  });
  ctx.check(
    "Recovery shows the notice and ten answers, and no PDF/JSON controls",
  );
  await ctx.step("recovery-after-reload", async () => {
    await page.reload();
    await expect(auditStage(page, "report-failed")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Coba buat laporan lagi" }),
    ).toBeVisible();
  });
  expect(ctx.calls["POST /api/audit/report"]).toBe(1);
  ctx.check("A reload restores recovery without another report request");
  await ctx.step("retry-finishes-report", async () => {
    await page.getByRole("button", { name: "Coba buat laporan lagi" }).click();
    await expectAuditDone(page);
  });
  expect(ctx.calls["POST /api/audit/run"]).toBe(1);
  expect(ctx.calls["POST /api/audit/report"]).toBe(2);
  ctx.check("The explicit retry finishes the report with no second run");
}

export function recipe(feature: Feature, inject?: string) {
  if (
    inject &&
    !INJECTIONS[feature as keyof typeof INJECTIONS]?.includes(inject)
  )
    throw new Error(`No injection "${inject}" for ${feature}.`);
  switch (feature) {
    case "audit-entry":
      return auditEntry;
    case "smart-intake-summary":
      return smartIntakeSummary;
    case "question-review":
      return questionReview;
    case "audit-run":
      return auditRun;
    case "report-and-recovery":
      return inject ? answersOnlyRecovery : reportAndDownloads;
  }
}
