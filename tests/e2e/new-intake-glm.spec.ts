import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

/**
 * Spec 010 R-08: the public `/audit` journey in `synthetic` mode. The
 * `?fixture=`/`?glm=1`/`?glm-stub=` harness parameters exist only for this
 * offline suite — the server runs with NUAVE_NEW_AUDIT_ENABLED and
 * NUAVE_AUDIT_MODE=synthetic, so every boundary answers with the labeled
 * synthetic substitute. No real provider call happens anywhere in this spec.
 */
const shell = (page: Page) => page.locator("[data-new-intake-shell]");
const primary = (page: Page) =>
  page.locator("footer").getByRole("button").last();
const GLM_ROUTE = "/api/audit/glm-questions";
/** The continuous direct-ten flow travels these real boundaries; every one
 * answers with the labeled local substitute in this offline environment. */
const AUDIT_ROUTES = new Set([
  GLM_ROUTE,
  "/api/audit/identity",
  "/api/audit/extract",
  "/api/audit/run",
  "/api/audit/report",
]);

test.beforeEach(async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Same external isolation as the deterministic spec; only the founder-local
  // audit boundaries are reachable, all on their synthetic substitutes.
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      (url.pathname.startsWith("/api/") && !AUDIT_ROUTES.has(url.pathname))
    )
      return route.abort();
    return route.continue();
  });
});

/** Request counts per "METHOD path" — proves one preparation request, one
 * run stream and one report call, with no silent or duplicate sends. */
function trackRequests(page: Page) {
  const requests = new Map<string, number>();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (!path.startsWith("/api/")) return;
    const key = `${request.method()} ${path}`;
    requests.set(key, (requests.get(key) ?? 0) + 1);
  });
  return requests;
}

/** Every GLM fixture screen arrives pre-confirmed; only scope needs a tap. */
async function toReview(page: Page, suffix: string) {
  await page.goto(`/audit${suffix}`);
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-brand");
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-scope");
  await page.getByRole("radio", { name: "Brand secara keseluruhan" }).click();
  await primary(page).click();
  for (let count = 0; count < 12; count++) {
    const state = await shell(page).getAttribute("data-new-intake-shell");
    if (state === "s-review") return;
    await primary(page).click();
  }
  throw new Error("did not reach s-review");
}

test("GLM path: confirmed fictional business → ten questions → edit → approved audit → report → downloads", async ({
  page,
}, info) => {
  const requests = trackRequests(page);
  // Spy the print control before app scripts run — the product PDF is the
  // browser print output of the report page.
  await page.addInitScript(() => {
    (window as unknown as { __printCalls: number }).__printCalls = 0;
    window.print = () => {
      (window as unknown as { __printCalls: number }).__printCalls += 1;
    };
  });
  await toReview(page, "?fixture=GLM&glm=1");
  await primary(page).click();
  await expect(
    page.getByRole("heading", {
      name: "Periksa pertanyaan audit",
      exact: true,
    }),
  ).toBeVisible();
  // Exactly one request per attempt; the labeled stub served it.
  expect(requests.get(`POST ${GLM_ROUTE}`)).toBe(1);
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  await expect(page.locator("[data-glm-provenance]")).toContainText(
    "respons sintetis berlabel",
  );
  await expect(page.locator("[data-glm-provenance]")).toContainText(
    "Biaya: tidak tersedia",
  );
  await shot(page, info, "glm-questions");

  // Founder-style multi-sentence edit saves under the v3 punctuation rule.
  const wording =
    "Lagi cari laundry kiloan buat rutinitas keluarga. Yang bisa antar-jemput di Jakarta Selatan lebih enak dipakai.";
  await page
    .getByRole("button", { name: "Ubah pertanyaan 1", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Pertanyaan 1", exact: true })
    .fill(wording);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.locator('[data-question-slot="1"]')).toContainText(wording);
  await expect(page.locator('[data-question-slot="1"]')).toContainText(
    "diubah",
  );

  // Back and refresh preserve the saved edit; no extra request is issued.
  await page.locator("footer").getByRole("button", { name: "Kembali" }).click();
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-review",
  );
  await primary(page).click();
  await expect(page.locator('[data-question-slot="1"]')).toContainText(wording);
  await page.reload();
  await expect(page.locator('[data-question-slot="1"]')).toContainText(wording);
  // B2: the generated original survives restore — the edit marker persists.
  await expect(page.locator('[data-question-slot="1"]')).toContainText(
    "diubah",
  );
  expect(requests.get(`POST ${GLM_ROUTE}`)).toBe(1);

  // The explicit approval click IS the audit start: the same session, facts
  // and exact wording flow into the real run/report boundaries — no handoff
  // screen and no other business's pack.
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "audit");
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "done",
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Laundry Ceria", exact: true }),
  ).toBeVisible();
  // The labeled substitute is displayed as such — never as real visibility.
  await expect(
    page.getByRole("heading", { name: "Audit lokal — jawaban sintetis" }),
  ).toBeVisible();
  await shot(page, info, "glm-audit-report");

  // The exact approved wording traveled the run boundary unchanged.
  expect(requests.get("GET /api/audit/extract")).toBe(1);
  expect(requests.get("POST /api/audit/run")).toBe(1);
  expect(requests.get("POST /api/audit/report")).toBe(1);

  // JSON download is the current session's evidence export.
  const pendingJson = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Unduh bukti JSON", exact: true })
    .click();
  const evidence = JSON.parse(
    await readFile((await (await pendingJson).path())!, "utf8"),
  );
  expect(evidence.observations).toHaveLength(10);
  expect(evidence.report).toBeTruthy();
  expect(evidence.provenance).toMatchObject({
    question_method: "direct-ten",
    synthetic: true,
    provider_calls: 0,
  });
  expect(evidence.prompts[0].question).toBe(wording);

  // PDF control fires the print path; capture the real print output.
  await page
    .getByRole("button", { name: "Cetak / simpan PDF", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __printCalls: number }).__printCalls,
    ),
  ).toBe(1);
  await page.pdf({ path: info.outputPath("glm-audit-report.pdf") });

  // Reload restores the finished report — the paid stages are never replayed.
  await page.reload();
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "done",
  );
  await expect(
    page.getByRole("heading", { name: "Laundry Ceria", exact: true }),
  ).toBeVisible();
  expect(requests.get("POST /api/audit/run")).toBe(1);
  expect(requests.get("POST /api/audit/report")).toBe(1);

  // Back returns to the approved questions; the edit is still there.
  await page
    .getByRole("button", { name: "Kembali ke pertanyaan", exact: true })
    .click();
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-questions",
  );
  await expect(page.locator('[data-question-slot="1"]')).toContainText(wording);
  await shot(page, info, "glm-after-audit-back");

  // Return-and-continue: approving again reopens the saved report — the
  // paid stages are never replayed and the finished record is never cleared.
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "audit");
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "done",
  );
  await expect(
    page.getByRole("heading", { name: "Laundry Ceria", exact: true }),
  ).toBeVisible();
  expect(requests.get("GET /api/audit/extract")).toBe(1);
  expect(requests.get("POST /api/audit/run")).toBe(1);
  expect(requests.get("POST /api/audit/report")).toBe(1);
});

test("entered business: identity/extraction boundaries → buyer facts → approved audit → report", async ({
  page,
}, info) => {
  const requests = trackRequests(page);
  const reportBodies: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/audit/report"
    )
      reportBodies.push(request.postDataJSON() as Record<string, unknown>);
  });
  await page.addInitScript(() => {
    (window as unknown as { __printCalls: number }).__printCalls = 0;
    window.print = () => {
      (window as unknown as { __printCalls: number }).__printCalls += 1;
    };
  });
  // Spec 010 R-08: the public entry opens on the empty business step — the
  // entered business goes straight through the real identity/extraction
  // boundaries, answered by labeled substitutes in this suite.
  await page.goto("/audit?glm=1");
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-brand-fix",
  );
  await page
    .getByRole("textbox", { name: "Nama brand", exact: true })
    .fill("Batik Laras");
  await page
    .getByRole("textbox", { name: "Sumber bisnis", exact: true })
    .fill("https://batiklaras.example");
  await primary(page).click();
  // The entered business — not the fixture — is now the active context.
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-brand");
  await expect(
    page.getByRole("heading", { name: "Batik Laras", exact: true }),
  ).toBeVisible();
  expect(requests.get("GET /api/audit/identity")).toBe(1);
  expect(requests.get("POST /api/audit/extract")).toBe(1);

  // The substitute draft carries no invented facts: every context screen is
  // answered by the buyer.
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-scope");
  await page.getByRole("radio", { name: "Brand secara keseluruhan" }).click();
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-category",
  );
  await page
    .getByRole("textbox", { name: "Tulis kategori sendiri", exact: true })
    .fill("Batik tulis");
  await page.getByRole("button", { name: "Pakai", exact: true }).click();
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-offerings",
  );
  await page
    .getByRole("textbox", { name: "Produk atau layanan", exact: true })
    .fill("Kain batik tulis");
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await primary(page).click();
  // Remaining screens: customers optional, service + market + competitors.
  for (let count = 0; count < 10; count++) {
    const state = await shell(page).getAttribute("data-new-intake-shell");
    if (state === "s-review") break;
    if (state === "s-service") await page.getByRole("checkbox").first().click();
    if (state === "s-market")
      await page.getByRole("radio", { name: "Seluruh Indonesia" }).click();
    if (state === "s-competitors")
      await page
        .getByRole("checkbox", {
          name: "Tidak ada pesaing langsung yang saya tahu",
          exact: true,
        })
        .click();
    await primary(page).click();
  }
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-review",
  );
  await shot(page, info, "entered-review");

  // Questions: one experimental request, then edit + explicit approval.
  await primary(page).click();
  await expect(
    page.getByRole("heading", {
      name: "Periksa pertanyaan audit",
      exact: true,
    }),
  ).toBeVisible();
  expect(requests.get(`POST ${GLM_ROUTE}`)).toBe(1);
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  const wording =
    "Rekomendasi penjahit batik tulis untuk seragam kantor di seluruh Indonesia apa ya?";
  await page
    .getByRole("button", { name: "Ubah pertanyaan 1", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Pertanyaan 1", exact: true })
    .fill(wording);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();

  // Approve → audit runs the entered business's exact wording to the report.
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "audit");
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "done",
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Batik Laras", exact: true }),
  ).toBeVisible();
  expect(requests.get("POST /api/audit/run")).toBe(1);
  expect(requests.get("POST /api/audit/report")).toBe(1);

  // The report request carried the session's whole ledger — the substitute
  // preparation call from the reading phase plus the ten observation calls.
  const reportBody = reportBodies.at(-1);
  const ledgerStages = new Set(
    ((reportBody?.budget as { calls?: { stage: string }[] })?.calls ?? []).map(
      (call) => call.stage,
    ),
  );
  expect(ledgerStages.has("extract")).toBe(true);
  expect(ledgerStages.has("observation")).toBe(true);

  const pendingJson = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Unduh bukti JSON", exact: true })
    .click();
  const jsonDownload = await pendingJson;
  await jsonDownload.saveAs(info.outputPath("entered-business-evidence.json"));
  const evidence = JSON.parse(
    await readFile(info.outputPath("entered-business-evidence.json"), "utf8"),
  );
  expect(evidence.observations).toHaveLength(10);
  expect(evidence.brief.brand_name).toBe("Batik Laras");
  expect(evidence.provenance).toMatchObject({
    question_method: "direct-ten",
    synthetic: true,
    preparation_mode: "synthetic-local",
  });
  expect(evidence.prompts[0].question).toBe(wording);

  // The normal product controls produce this session's artifacts: the PDF
  // control fires the print path and the current report page is captured.
  await page
    .getByRole("button", { name: "Cetak / simpan PDF", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __printCalls: number }).__printCalls,
    ),
  ).toBe(1);
  await page.pdf({ path: info.outputPath("entered-business-report.pdf") });
  await shot(page, info, "entered-report");
});

test("an interrupted run restores its captured state and resumes without replaying", async ({
  page,
}) => {
  const requests = trackRequests(page);
  await toReview(page, "?fixture=GLM&glm=1");
  await primary(page).click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);

  // Hold the run stream: the attempt stays "running" until the page dies.
  await page.route("**/api/audit/run", () => new Promise(() => {}));
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "audit");
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "running",
  );
  await page.reload();

  // The interrupted state is shown honestly — nothing silently finished.
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "interrupted",
  );
  await expect(
    page.getByRole("button", { name: "Lanjutkan audit", exact: true }),
  ).toBeVisible();

  // Resume runs the same boundaries; completed work is never repurchased.
  await page.unroute("**/api/audit/run");
  await page
    .getByRole("button", { name: "Lanjutkan audit", exact: true })
    .click();
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "done",
    { timeout: 30_000 },
  );
  expect(requests.get("POST /api/audit/run")).toBe(2);
  expect(requests.get("POST /api/audit/report")).toBe(1);
});

test("a partially captured run resumes its saved observations through the boundary", async ({
  page,
}) => {
  const requests = trackRequests(page);
  const runBodies: { resume_observations?: { system: string }[] }[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/audit/run"
    )
      runBodies.push(
        request.postDataJSON() as {
          resume_observations?: { system: string }[];
        },
      );
  });
  await toReview(page, "?fixture=GLM&glm=1");
  await primary(page).click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);

  // First attempt: relay the real substitute stream but truncate it after
  // three captured observations — the captured work must survive intact.
  await page.route("**/api/audit/run", async (route) => {
    const response = await route.fetch();
    const lines = (await response.text()).split("\n").filter(Boolean);
    const completedAt = lines
      .map((line, index) => {
        try {
          return (JSON.parse(line) as { type: string }).type ===
            "prompt_completed"
            ? index
            : -1;
        } catch {
          return -1;
        }
      })
      .filter((index) => index >= 0);
    const cut = completedAt[2];
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${lines.slice(0, cut + 1).join("\n")}\n`,
    });
  });
  await primary(page).click();
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "interrupted",
    { timeout: 30_000 },
  );

  // Reload: the bound record — including captured observations — restores.
  await page.reload();
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "interrupted",
  );
  await expect(
    page.getByRole("button", { name: "Lanjutkan audit", exact: true }),
  ).toBeVisible();

  // Resume sends the saved labeled observations through the real boundary —
  // the substitute path accepts its own labeled evidence and runs the rest.
  await page.unroute("**/api/audit/run");
  await page
    .getByRole("button", { name: "Lanjutkan audit", exact: true })
    .click();
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "done",
    { timeout: 30_000 },
  );
  const resumeBody = runBodies.at(-1);
  expect(resumeBody?.resume_observations?.length).toBe(3);
  expect(
    resumeBody?.resume_observations?.every(
      (observation) => observation.system === "synthetic-local-fixture",
    ),
  ).toBe(true);
  expect(requests.get("POST /api/audit/run")).toBe(2);
  expect(requests.get("POST /api/audit/report")).toBe(1);
});

test("a failed report call offers the same-session retry, not a new audit", async ({
  page,
}) => {
  const requests = trackRequests(page);
  const reportBodies: { budget?: { calls?: { stage: string }[] } }[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/audit/report"
    )
      reportBodies.push(
        request.postDataJSON() as {
          budget?: { calls?: { stage: string }[] };
        },
      );
  });
  await toReview(page, "?fixture=GLM&glm=1");
  await primary(page).click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);

  let failed = false;
  await page.route("**/api/audit/report", async (route) => {
    if (!failed) {
      failed = true;
      // A telemetry-less failure still consumes one bounded attempt.
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Laporan belum dapat dibuat.",
          code: "REPORT_TRANSIENT_FAILURE",
          telemetry: [],
        }),
      });
    }
    // Hold the retry briefly — an unguarded repeated click would overlap.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return route.fallback();
  });
  await primary(page).click();
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "report-failed",
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("button", { name: "Coba buat laporan lagi", exact: true }),
  ).toBeVisible();

  // A repeated activation in the same tick can never send a second request —
  // the pre-submit guard is synchronous (the button also unmounts once the
  // retry is in flight, so even slower repeats cannot reach the handler).
  await page
    .getByRole("button", { name: "Coba buat laporan lagi", exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "done",
    { timeout: 30_000 },
  );
  expect(requests.get("POST /api/audit/run")).toBe(1);
  expect(requests.get("POST /api/audit/report")).toBe(2);
  // The retry forwarded the session ledger — the ten observation calls — so
  // recorded spend follows every attempt; the telemetry-less failure added
  // none but consumed its bounded allowance.
  const retryBody = reportBodies.at(-1);
  expect(
    retryBody?.budget?.calls?.filter((call) => call.stage === "observation"),
  ).toHaveLength(10);
});

test("an unfinished run reports honestly and keeps captured progress", async ({
  page,
}) => {
  const requests = trackRequests(page);
  await toReview(page, "?fixture=GLM&glm=1");
  await primary(page).click();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
  await page.route("**/api/audit/run", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${JSON.stringify({
        type: "run_unfinished",
        completed: 8,
        failed_prompt_ids: ["NUAVE-DT-09", "NUAVE-DT-10"],
        message: "Dua pertanyaan tidak dapat dipulihkan secara otomatis.",
      })}\n`,
    }),
  );
  await primary(page).click();
  await expect(page.locator("[data-local-audit-stage]")).toHaveAttribute(
    "data-local-audit-stage",
    "unfinished",
    { timeout: 30_000 },
  );
  await expect(
    page.getByText("belum dapat diselesaikan", { exact: false }),
  ).toBeVisible();
  // No report call is made before ten evaluable observations exist.
  expect(requests.get("POST /api/audit/report")).toBeUndefined();
});

test("GLM stub failures are truthful and never silently retried", async ({
  page,
}) => {
  // Clearing via evaluate races the app's own save-on-unload; the init script
  // clears before hydration on every load in this test only.
  await page.addInitScript(() => sessionStorage.clear());
  for (const [behavior, expected] of [
    ["timeout", "transport"],
    ["malformed", "extraction"],
  ] as const) {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === GLM_ROUTE)
        requests.push(request.url());
    });
    await toReview(page, `?fixture=GLM&glm=1&glm-stub=${behavior}`);
    await primary(page).click();
    await expect(shell(page).getByRole("alert")).toBeVisible();
    await expect(shell(page).getByRole("alert")).toContainText(expected);
    await expect(page.locator("[data-question-slot]")).toHaveCount(0);
    // One attempt made one request; nothing retried silently.
    expect(requests).toHaveLength(1);
  }
});

async function shot(
  page: Page,
  info: { outputPath: (n: string) => string },
  name: string,
) {
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
}
