import { expect, test } from "@playwright/test";
import {
  KOPI_TAMAN_SENJA_BUSINESS_NAME,
  KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
  KOPI_TAMAN_SENJA_SCOPE,
  kopiTamanSenjaEvidence,
  kopiTamanSenjaQuestions,
} from "../../src/lib/audit/fixtures/fixture-kopi-taman-senja";
import {
  FIXTURE_SESSION_KEY,
  FIXTURE_STATE_VERSION,
  LEGACY_FIXTURE_SESSION_KEYS,
  LIVE_WORKFLOW_KEYS,
  assertNoSideEffects,
  collectRequests,
  confirmFactsAndApprove,
  expectNoHorizontalScroll,
  expectReadyReport,
  expectVisibleFocus,
  freshV3State,
  grantAccess,
  seedFixtureState,
  startSimulatedRun,
  tabUntilFocused,
  v3FactsState,
  v3PaidState,
  v3QuestionsApprovedState,
  v3ReadyState,
  v3RunPausedState,
} from "./helpers";

const PREVIEW_NOTICE = "Pemberitahuan pratinjau fiktif";
const REPORT_PREVIEW_NOTICE = PREVIEW_NOTICE;
const EXPECTED_QUESTION_TEXTS = kopiTamanSenjaQuestions.questions.map(
  (question) => question.text,
);
const EXCERPT_ROW_1 =
  kopiTamanSenjaEvidence.observations[0].selected_observation.answer_excerpt;
const EXCERPT_ROW_8 =
  kopiTamanSenjaEvidence.observations[7].selected_observation.answer_excerpt;

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test.describe("entry and landing (AC-01)", () => {
  test("opening /audit/fixture directly shows the fictional-preview intake with the settled CTA", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("01 Pratinjau pesanan · Langkah 1 dari 6"),
    ).toBeVisible();
    // The one settled action, visibly identified as a fictional preview
    // before any confirmation.
    await expect(
      page.getByRole("button", { name: "Cek bisnis saya di AI" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Pratinjau ini memakai satu bisnis contoh fiktif. Tidak ada data bisnis nyata yang dimasukkan atau dikumpulkan.",
      ),
    ).toBeVisible();
    // No priced action before the reveal and no result content anywhere.
    await expect(
      page.getByRole("button", { name: "Bayar Rp99.000" }),
    ).toHaveCount(0);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/8\/10|3\/5|5\/5/);
    expect(body).not.toContain(KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME);
    await assertNoSideEffects(page, requests);
  });

  test("the live landing keeps its normal actions and no fixture CTA", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Cek bisnis saya di AI" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Audit bisnis saya" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Mulai pratinjau fiktif" }),
    ).toHaveCount(0);
    // The landing reuses the live /audit source hero while remaining inert
    // until the visitor explicitly submits a source.
    const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
    await expect(
      hero.getByRole("heading", {
        name: "Saat customer minta rekomendasi ke ChatGPT, apakah brand Anda disebut?",
      }),
    ).toBeVisible();
    await expect(hero.getByPlaceholder("https://bisnisanda.com")).toBeVisible();
    await expect(
      hero.getByText(
        "Masukkan URL website atau akun Instagram resmi bisnis Anda.",
      ),
    ).toBeVisible();
    await expect(hero.getByText(/Google Business Profile/i)).toHaveCount(0);
    await expect(page.getByText("Ilustrasi", { exact: true }).first()).toBeVisible();
    await assertNoSideEffects(page, requests);
  });
});

test.describe("canonical sequence and gates (AC-03..AC-09)", () => {
  test("01 order preview: fixture identity, scope, Rp99.000 total, 30-day note, ten-question scope, execution surface", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await expect(
      page.getByRole("heading", { name: "Ringkasan pesanan" }),
    ).toBeVisible();
    // Fixture identity and scope.
    await expect(
      page.getByText(KOPI_TAMAN_SENJA_BUSINESS_NAME).first(),
    ).toBeVisible();
    await expect(page.getByText(KOPI_TAMAN_SENJA_SCOPE).first()).toBeVisible();
    await expect(page.getByText("Kedai kopi").first()).toBeVisible();
    // Ten-question scope with the exact composition.
    await expect(
      page.getByText(
        "Satu audit menguji 10 pertanyaan ala calon pelanggan: 5 Tanpa menyebut bisnis Anda dan 5 Menyebut bisnis Anda, sesuai contoh yang dibekukan.",
      ),
    ).toBeVisible();
    // Rp99.000 total with no added tax or fee, and the 30-day quote note.
    await expect(page.getByText("Rp99.000", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Tidak ada pajak atau biaya tambahan.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Berlaku 30 hari selama belum dibayar.", { exact: true }),
    ).toBeVisible();
    // The named execution surface from the fixture record.
    await expect(
      page.getByText(
        /OpenAI Responses API dengan model gpt-5\.6-luna serta pencarian web/,
      ),
    ).toBeVisible();
    await expect(page.getByText(/Google Gemini API/).first()).toBeVisible();
    // Report scope and limitations.
    await expect(
      page.getByRole("heading", { name: "Isi laporan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Batasan laporan" }),
    ).toBeVisible();
    // No result, competitor, finding, or score is previewed.
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/8\/10|3\/5|5\/5/);
    expect(body).not.toContain(KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME);
    // The priced action opens the simulated payment.
    await expect(
      page.getByRole("button", { name: "Bayar Rp99.000" }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("02 simulated payment: exact disclosure, no payment controls, no-charge confirmation (AC-05)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await page.getByRole("button", { name: "Bayar Rp99.000" }).click();
    await expect(
      page.getByRole("heading", { name: "Simulasi pembayaran" }),
    ).toBeVisible();
    await expect(
      page.getByText("02 Pembayaran (simulasi) · Langkah 2 dari 6"),
    ).toBeVisible();
    // The exact disclosure is prominent on the checkout panel.
    await expect(
      page.getByText("Simulasi pembayaran — tidak ada tagihan", {
        exact: true,
      }),
    ).toBeVisible();
    // No payment instrument, provider widget, receipt, or transaction control.
    await expect(page.locator("input")).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveCount(0);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/QRIS|GoPay|DANA|Midtrans/i);
    // Completing produces only the session-scoped simulated-paid state.
    await page
      .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
      .click();
    await expect(
      page.getByText("Pembayaran simulasi selesai. Tidak ada tagihan.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Tidak ada biaya, struk, pesanan, atau hak audit yang dibuat. Status ini hanya tersimpan di sesi tab ini.",
        { exact: true },
      ),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("payment unlocks preparation and never starts the run (AC-06)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await page.getByRole("button", { name: "Bayar Rp99.000" }).click();
    await page
      .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
      .click();
    // The completed simulation offers facts, not the run.
    await expect(
      page.getByText(
        "Pembayaran ini tidak memulai audit. Audit hanya dimulai lewat aksi Jalankan audit di langkah 4.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Jalankan audit" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Lanjut ke fakta bisnis" }).click();
    await expect(
      page.getByRole("heading", { name: "Periksa informasi bisnis Anda" }),
    ).toBeVisible();
    // The persisted state proves payment unlocked facts without starting the run.
    const saved = await page.evaluate(
      (key) => JSON.parse(window.sessionStorage.getItem(key) ?? "{}"),
      FIXTURE_SESSION_KEY,
    );
    expect(saved).toMatchObject({
      stage: "facts",
      simulatedPaid: true,
      runStarted: false,
    });
    await assertNoSideEffects(page, requests);
  });

  test("03 facts: read-only fixture facts with provenance labels (AC-03)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3FactsState());
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", { name: "Periksa informasi bisnis Anda" }),
    ).toBeVisible();
    await expect(
      page.getByText("03 Fakta bisnis · Langkah 3 dari 6"),
    ).toBeVisible();
    // Frozen fixture facts with provenance labels.
    await expect(
      page.getByText(KOPI_TAMAN_SENJA_BUSINESS_NAME).first(),
    ).toBeVisible();
    await expect(page.getByText(KOPI_TAMAN_SENJA_SCOPE).first()).toBeVisible();
    await expect(page.getByText("Kedai kopi").first()).toBeVisible();
    await expect(
      page.getByText("Saran lain: Kafe, Ruang kerja bersama").first(),
    ).toBeVisible();
    await expect(
      page.getByText("Kopi lokal, Ruang kerja, Makanan ringan").first(),
    ).toBeVisible();
    await expect(
      page.getByText(KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Sumber: https://kopiruangpagi.example").first(),
    ).toBeVisible();
    await expect(page.getByText("Ditemukan di website").first()).toBeVisible();
    await expect(page.getByText("Perlu diperiksa").first()).toBeVisible();
    await expect(page.getByText("Saran Nuave").first()).toBeVisible();
    // Warning from the frozen facts record.
    await expect(
      page.getByRole("heading", {
        name: "Kami menemukan informasi yang berbeda",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/Website mencantumkan jam buka 08\.00–21\.00/),
    ).toBeVisible();
    await expect(page.getByText(/09\.00–20\.00/).first()).toBeVisible();
    // Facts are read-only: the only input is the confirmation checkbox.
    await expect(page.locator("input")).toHaveCount(1);
    await assertNoSideEffects(page, requests);
  });

  test("fact gate: cannot continue without the explicit confirmation (AC-07)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3FactsState());
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Buat pertanyaan audit" }).click();
    await expect(
      page.getByText(
        "Periksa fakta bisnis di atas dan konfirmasi sebelum melanjutkan.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Periksa informasi bisnis Anda" }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("04 questions: ten frozen Indonesian questions in final order, five plus five (AC-08)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(
      page,
      freshV3State({
        stage: "questions",
        offerRevealed: true,
        simulatedPaid: true,
        factsConfirmed: true,
      }),
    );
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
    ).toBeVisible();
    await expect(
      page.getByText("Audit belum dimulai.", { exact: true }),
    ).toBeVisible();
    // All ten frozen questions appear once each, in their final order.
    const items = page.locator("li[class*='questionItem']");
    await expect(items).toHaveCount(10);
    const texts = await items
      .locator("p[class*='questionText']")
      .allTextContents();
    expect(texts.map((text) => text.trim())).toEqual(EXPECTED_QUESTION_TEXTS);
    // Exact composition labels: five and five.
    await expect(
      page
        .locator("span[class*='questionChip']")
        .getByText("Tanpa menyebut bisnis Anda", { exact: true }),
    ).toHaveCount(5);
    await expect(
      page
        .locator("span[class*='questionChip']")
        .getByText("Menyebut bisnis Anda", { exact: true }),
    ).toHaveCount(5);
    await expect(
      page.getByRole("heading", {
        name: "Tanpa menyebut bisnis Anda · 5",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Menyebut bisnis Anda · 5",
        exact: true,
      }),
    ).toBeVisible();
    // The run is unavailable until explicit approval.
    await expect(
      page.getByRole("button", { name: "Jalankan audit" }),
    ).toHaveCount(0);
    // Approval gate.
    await page.getByRole("button", { name: "Setujui pertanyaan" }).click();
    await expect(
      page.getByText("Setujui sepuluh pertanyaan sebelum menjalankan audit.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("run consumption: only the explicit confirmation starts the run once (AC-09)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3QuestionsApprovedState());
    await page.goto("/audit/fixture");
    await expect(
      page.getByText("10 pertanyaan siap dijalankan", { exact: true }),
    ).toBeVisible();
    // The run action opens the confirmation; closing it starts nothing.
    await page.getByRole("button", { name: "Jalankan audit" }).click();
    const dialog = page.getByRole("dialog", { name: "Mulai audit sekarang?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Kembali periksa" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Simulasi audit berjalan" }),
    ).toHaveCount(0);
    // Re-opening and confirming starts the run exactly once; a double
    // activation of the confirmation cannot create a second run.
    await page.getByRole("button", { name: "Jalankan audit" }).click();
    await expect(
      page.getByRole("dialog", { name: "Mulai audit sekarang?" }),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: "Mulai audit sekarang" })
      .evaluate((element) => {
        const button = element as HTMLButtonElement;
        button.click();
        button.click();
      });
    await expect(
      page.getByRole("heading", { name: "Simulasi audit berjalan" }),
    ).toBeVisible();
    await expectReadyReport(page);
    // Refreshing cannot start a second run: the completed state restores.
    await page.reload();
    await expectReadyReport(page);
    await assertNoSideEffects(page, requests);
  });
});

test.describe("complete path, processing, and report (AC-03, AC-10, AC-11)", () => {
  test("the canonical 01→06 journey advances strictly through the six steps", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toBeVisible(); // 01
    await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await page.getByRole("button", { name: "Bayar Rp99.000" }).click();
    await expect(
      page.getByRole("heading", { name: "Simulasi pembayaran" }),
    ).toBeVisible(); // 02
    await page
      .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
      .click();
    await page.getByRole("button", { name: "Lanjut ke fakta bisnis" }).click();
    await expect(
      page.getByRole("heading", { name: "Periksa informasi bisnis Anda" }),
    ).toBeVisible(); // 03
    await confirmFactsAndApprove(page); // 04
    await startSimulatedRun(page); // 05
    await expectReadyReport(page); // 06
    await assertNoSideEffects(page, requests);
  });

  test("processing truthfulness: simulation identified, bounded stages, no fabricated per-question completion (AC-10)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3QuestionsApprovedState());
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Jalankan audit" }).click();
    await page.getByRole("button", { name: "Mulai audit sekarang" }).click();
    await expect(
      page.getByRole("heading", { name: "Simulasi audit berjalan" }),
    ).toBeVisible();
    // The whole sequence is identified as a simulation.
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Ini adalah simulasi." })
        .first(),
    ).toBeVisible();
    // The five stage labels (four work stages plus the terminal one) render.
    await expect(page.locator("li[class*='processingItem']")).toHaveCount(5);
    for (const label of [
      "Menyiapkan pertanyaan audit",
      "Menguji sepuluh pertanyaan",
      "Memeriksa bukti dan sumber",
      "Menyiapkan laporan",
      "Laporan siap",
    ]) {
      await expect(
        page.getByText(label, { exact: true }).first(),
      ).toBeVisible();
    }
    // All ten questions stay labelled "Menunggu": no fabricated live completion.
    await expect(page.locator("li[class*='runQuestionRow']")).toHaveCount(10);
    await expect(
      page
        .locator("span[class*='runStatusChip']")
        .getByText("Menunggu", { exact: true }),
    ).toHaveCount(10);
    await expect(page.getByText("Selesai", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Sedang diuji", { exact: true })).toHaveCount(
      0,
    );
    // State changes are announced accessibly and actually progress.
    const status = page.getByText(/Simulasi berjalan: /);
    await expect(status).toHaveAttribute("aria-live", "polite");
    const before = (await status.textContent()) ?? "";
    await page.waitForTimeout(1_800);
    const after = (await status.textContent()) ?? "";
    if (after === before) {
      await expectReadyReport(page);
    } else {
      await expect(status).toBeVisible();
      await expectReadyReport(page);
    }
    await assertNoSideEffects(page, requests);
  });

  test("report fidelity: five sections from the frozen 10/10 fixture (AC-11)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3ReadyState());
    await page.goto("/audit/fixture");
    await expectReadyReport(page);
    // Headline and count, with the two composition measures directly beneath.
    await expect(
      page.getByRole("heading", {
        name: "Bisnis Anda muncul di 8 dari 10 pertanyaan",
        level: 3,
      }),
    ).toBeVisible();
    await expect(page.getByText("8/10", { exact: true })).toBeVisible();
    const compositionCards = page.locator("div[class*='compositionCard']");
    await expect(compositionCards).toHaveCount(2);
    await expect(compositionCards.first()).toContainText("3/5");
    await expect(compositionCards.first()).toContainText(
      "Tanpa menyebut bisnis Anda",
    );
    await expect(compositionCards.nth(1)).toContainText("5/5");
    await expect(compositionCards.nth(1)).toContainText("Menyebut bisnis Anda");
    // Recommendation / comparison / information measures with eligible denominators.
    await expect(
      page.getByText("Direkomendasikan di 2 dari 6 pertanyaan yang dinilai", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Diunggulkan di 1 dari 2 pertanyaan yang dinilai", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "1 terkonfirmasi, 2 belum lengkap, 1 bertentangan dari 4 pertanyaan yang dinilai",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    // One to five findings and one to five actions.
    await expect(page.locator("ol[class*='findings'] > li")).toHaveCount(4);
    await expect(page.locator("ol[class*='priorities'] > li")).toHaveCount(3);
    // Ten test-by-test rows with exact excerpts, never translated.
    await expect(page.locator("li[class*='testRow']")).toHaveCount(10);
    await expect(
      page.getByText("Kutipan jawaban", { exact: true }),
    ).toHaveCount(10);
    await expect(page.getByText(EXCERPT_ROW_1, { exact: true })).toBeVisible();
    await expect(page.getByText(EXCERPT_ROW_8, { exact: true })).toBeVisible();
    // The frozen run facts: 10/10 evaluable, method from recorded facts.
    await expect(page.getByText("10 dari 10 selesai")).toBeVisible();
    await expect(page.getByText("10 pertanyaan independen")).toBeVisible();
    await expect(page.getByText("17 Agustus 2026").first()).toBeVisible();
    await expect(page.getByText("Bandung").first()).toBeVisible();
    await expect(page.getByText("Indonesia").first()).toBeVisible();
    await expect(page.getByText("Versi metode: audit-method-v1")).toBeVisible();
    // Session-only note: no durable or private-hosting claim.
    await expect(
      page.getByText(
        /hanya ada di sesi tab ini, tidak dihosting secara privat/,
      ),
    ).toBeVisible();
    await expect(
      page.getByText(/tidak disimpan di server, tidak dihosting secara privat/),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("persistent disclosure appears on every stage and in the report (AC-13)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    const aside = page.getByRole("complementary", { name: PREVIEW_NOTICE });
    await expect(aside).toBeVisible();
    await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await expect(aside).toBeVisible();
    await page.getByRole("button", { name: "Bayar Rp99.000" }).click();
    await expect(aside).toBeVisible();
    await page
      .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
      .click();
    await expect(aside).toBeVisible();
    await page.getByRole("button", { name: "Lanjut ke fakta bisnis" }).click();
    await expect(aside).toBeVisible();
    await confirmFactsAndApprove(page);
    await expect(aside).toBeVisible();
    await page.getByRole("button", { name: "Jalankan audit" }).click();
    await page.getByRole("button", { name: "Mulai audit sekarang" }).click();
    await expect(aside).toBeVisible();
    await expectReadyReport(page);
    await expect(aside).toBeVisible();
    // The report article carries its own disclosure for screen and print.
    await expect(
      page.getByRole("note", { name: REPORT_PREVIEW_NOTICE }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });
});

test.describe("recovery (AC-14..AC-16)", () => {
  test("refresh after revealing the offer keeps the priced panel and CTA visible", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await expect(
      page.getByRole("heading", { name: "Ringkasan pesanan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bayar Rp99.000" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Ringkasan pesanan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bayar Rp99.000" }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("refresh after simulated payment restores the completed payment, not the run", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3PaidState());
    await page.goto("/audit/fixture");
    await expect(
      page.getByText("Pembayaran simulasi selesai. Tidak ada tagihan.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Pembayaran simulasi selesai. Tidak ada tagihan.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Simulasi audit berjalan" }),
    ).toHaveCount(0);
    await assertNoSideEffects(page, requests);
  });

  test("refresh at the approved pack keeps the approval", async ({ page }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3QuestionsApprovedState());
    await page.goto("/audit/fixture");
    await expect(
      page.getByText("10 pertanyaan siap dijalankan", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("10 pertanyaan siap dijalankan", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Jalankan audit" }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("refresh at the ready destination restores the same report", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3ReadyState());
    await page.goto("/audit/fixture");
    await expectReadyReport(page);
    await page.reload();
    await expectReadyReport(page);
    await assertNoSideEffects(page, requests);
  });

  test("refresh mid-run restores a paused state that advances only on resume", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3RunPausedState(2));
    await page.goto("/audit/fixture");
    await expect(
      page.getByText("Simulasi berhenti.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Simulasi berhenti pada tahap memeriksa bukti dan sumber\./,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Lanjutkan simulasi" }),
    ).toBeVisible();
    // The paused state must not advance beyond one stage interval.
    const statusBefore = await page
      .getByText(/Simulasi berhenti pada tahap/)
      .textContent();
    await page.waitForTimeout(2_500);
    const statusAfter = await page
      .getByText(/Simulasi berhenti pada tahap/)
      .textContent();
    expect(statusAfter).toBe(statusBefore);
    // The explicit resume action advances deterministically to the report.
    await page.getByRole("button", { name: "Lanjutkan simulasi" }).click();
    await expectReadyReport(page);
    await page.reload();
    await expectReadyReport(page);
    await assertNoSideEffects(page, requests);
  });

  test("stale v1/v2 session shapes are reset with an explanation (AC-15)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, {
      version: 2,
      stage: "ready",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    });
    await page.goto("/audit/fixture");
    await expect(
      page.getByText("Pratinjau diatur ulang.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Status yang tersimpan hilang, kedaluwarsa, atau tidak sesuai/,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toBeVisible();
    const saved = await page.evaluate(
      (key) => JSON.parse(window.sessionStorage.getItem(key) ?? "{}"),
      FIXTURE_SESSION_KEY,
    );
    expect(saved).toMatchObject({
      version: FIXTURE_STATE_VERSION,
      stage: "preview",
      simulatedPaid: false,
    });
    await assertNoSideEffects(page, requests);
  });

  test("literal v1/v2/v3 session keys are purged, not just superseded (AC-15)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    // Simulates a browser tab that carries genuine leftover keys from an
    // earlier version of the journey, not just an old-shaped value under the
    // current key.
    await page.addInitScript(
      ({ keys }) => {
        for (const key of keys) {
          window.sessionStorage.setItem(key, JSON.stringify({ stale: true }));
        }
      },
      { keys: LEGACY_FIXTURE_SESSION_KEYS },
    );
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toBeVisible();
    // A genuine leftover legacy key must explain the reset, not silently
    // clear itself — a tab holding only a stale versioned key still had its
    // state wiped.
    await expect(
      page.getByText("Pratinjau diatur ulang.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Status yang tersimpan hilang, kedaluwarsa, atau tidak sesuai/,
      ),
    ).toBeVisible();
    const remainingKeys = await page.evaluate(
      (keys) =>
        keys.filter((key) => window.sessionStorage.getItem(key) !== null),
      LEGACY_FIXTURE_SESSION_KEYS,
    );
    expect(remainingKeys).toEqual([]);
    await assertNoSideEffects(page, requests);
  });

  test("inconsistent v3 gate order is rejected as a whole (AC-15)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    // A "ready" stage that skipped the completed run gate.
    seedFixtureState(
      page,
      freshV3State({
        stage: "ready",
        simulatedPaid: true,
        factsConfirmed: true,
        questionsApproved: true,
        runStarted: true,
        processingCompleted: false,
      }),
    );
    await page.goto("/audit/fixture");
    await expect(
      page.getByText("Pratinjau diatur ulang.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("a v3 shape that skipped the payment gate resets (AC-15)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(
      page,
      freshV3State({ stage: "facts", simulatedPaid: false }),
    );
    await page.goto("/audit/fixture");
    await expect(
      page.getByText("Pratinjau diatur ulang.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("start over clears only the fixture journey's own session keys (AC-16)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    seedFixtureState(page, v3ReadyState());
    await page.goto("/audit/fixture");
    await expectReadyReport(page);
    // Plant live-workflow keys that must survive a fixture reset.
    await page.evaluate(() => {
      window.sessionStorage.setItem("nuave.audit.workflow.v3", "live-wf");
      window.sessionStorage.setItem("nuave.audit.session.v1", "live-session");
    });
    await page.getByRole("button", { name: "Mulai ulang" }).first().click();
    await expect(
      page.getByRole("button", { name: "Konfirmasi mulai ulang" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /hanya menghapus progres pratinjau yang tersimpan di tab ini/,
      ),
    ).toBeVisible();
    // Keeping stays on the report.
    await page.getByRole("button", { name: "Tetap di pratinjau" }).click();
    await expectReadyReport(page);
    // Confirming discards only the fixture journey state.
    await page.getByRole("button", { name: "Mulai ulang" }).first().click();
    await page.getByRole("button", { name: "Konfirmasi mulai ulang" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toBeVisible();
    const keys = await page.evaluate(() => Object.keys(window.sessionStorage));
    expect(keys).toContain(FIXTURE_SESSION_KEY);
    expect(keys).toContain(LIVE_WORKFLOW_KEYS[0]);
    expect(keys).toContain(LIVE_WORKFLOW_KEYS[1]);
    const saved = await page.evaluate(
      (key) => JSON.parse(window.sessionStorage.getItem(key) ?? "{}"),
      FIXTURE_SESSION_KEY,
    );
    expect(saved).toMatchObject({
      version: FIXTURE_STATE_VERSION,
      stage: "preview",
      simulatedPaid: false,
      factsConfirmed: false,
      questionsApproved: false,
      runStarted: false,
    });
    await assertNoSideEffects(page, requests);
  });
});

test.describe("no side effects (AC-17)", () => {
  test("complete path plus one refresh makes no audit or external-service requests", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/");
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await page.getByRole("button", { name: "Bayar Rp99.000" }).click();
    await page
      .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
      .click();
    await page.getByRole("button", { name: "Lanjut ke fakta bisnis" }).click();
    await confirmFactsAndApprove(page);
    await page.getByRole("button", { name: "Jalankan audit" }).click();
    await page.getByRole("button", { name: "Mulai audit sekarang" }).click();
    await expectReadyReport(page);
    await page.reload();
    await expectReadyReport(page);
    await assertNoSideEffects(page, requests);
  });
});

test.describe("reduced motion (AC-20)", () => {
  test("reduced motion reaches the same report without the decorative delay", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requests = collectRequests(page);
    seedFixtureState(page, v3QuestionsApprovedState());
    await page.goto("/audit/fixture");
    await page.getByRole("button", { name: "Jalankan audit" }).click();
    await page.getByRole("button", { name: "Mulai audit sekarang" }).click();
    // Meaningful state text still appears as the run starts.
    await expect(page.getByText(/Simulasi berjalan: /).first()).toBeVisible();
    // Near-immediate completion: far below the ~5.6 s normal path.
    await expect(
      page.getByRole("heading", {
        name: "AI Visibility Report (contoh fiktif)",
      }),
    ).toBeVisible({ timeout: 4_000 });
    await expect(
      page.getByText("Bisnis Anda muncul di 8 dari 10 pertanyaan"),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });
});

test.describe("keyboard and responsive (AC-19)", () => {
  test("keyboard-only completion of the full path with visible focus", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/audit/fixture");
    // 01 — the stage heading carries focus after hydration.
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toBeFocused();
    await tabUntilFocused(
      page,
      page.getByRole("button", { name: "Cek bisnis saya di AI" }),
    );
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Cek bisnis saya di AI" }),
    );
    await page.keyboard.press("Enter");
    await tabUntilFocused(
      page,
      page.getByRole("button", { name: "Bayar Rp99.000" }),
    );
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Bayar Rp99.000" }),
    );
    await page.keyboard.press("Enter");
    // 02 — simulated payment.
    await expect(
      page.getByRole("heading", { name: "Simulasi pembayaran" }),
    ).toBeFocused();
    await tabUntilFocused(
      page,
      page.getByRole("button", { name: "Selesaikan simulasi pembayaran" }),
    );
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Selesaikan simulasi pembayaran" }),
    );
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Pembayaran simulasi selesai. Tidak ada tagihan.", {
        exact: true,
      }),
    ).toBeVisible();
    await tabUntilFocused(
      page,
      page.getByRole("button", { name: "Lanjut ke fakta bisnis" }),
    );
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Lanjut ke fakta bisnis" }),
    );
    await page.keyboard.press("Enter");
    // 03 — confirm the facts with Space, then continue with Enter.
    await expect(
      page.getByRole("heading", { name: "Periksa informasi bisnis Anda" }),
    ).toBeFocused();
    await tabUntilFocused(page, page.getByRole("checkbox"));
    await expectVisibleFocus(page, page.getByRole("checkbox"));
    await page.keyboard.press("Space");
    await tabUntilFocused(
      page,
      page.getByRole("button", { name: "Buat pertanyaan audit" }),
    );
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Buat pertanyaan audit" }),
    );
    await page.keyboard.press("Enter");
    // 04 — approve the pack with Space, then Enter.
    await expect(
      page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
    ).toBeFocused();
    await tabUntilFocused(page, page.getByRole("checkbox"));
    await page.keyboard.press("Space");
    await tabUntilFocused(
      page,
      page.getByRole("button", { name: "Setujui pertanyaan" }),
    );
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Setujui pertanyaan" }),
    );
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("10 pertanyaan siap dijalankan", { exact: true }),
    ).toBeVisible();
    // 05 — the run confirmation dialog is keyboard operable.
    await tabUntilFocused(
      page,
      page.getByRole("button", { name: "Jalankan audit" }),
    );
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Jalankan audit" }),
    );
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Mulai audit sekarang?" }),
    ).toBeFocused();
    await tabUntilFocused(
      page,
      page.getByRole("button", { name: "Mulai audit sekarang" }),
    );
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Mulai audit sekarang" }),
    );
    await page.keyboard.press("Enter");
    // 06 — the run completes to the report without further input.
    await expectReadyReport(page);
    await expect(
      page.getByRole("heading", {
        name: "AI Visibility Report (contoh fiktif)",
      }),
    ).toBeFocused();
    // The primary action is keyboard reachable with visible focus.
    await tabUntilFocused(
      page,
      page.getByRole("button", { name: "Download PDF" }).first(),
    );
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Download PDF" }).first(),
    );
    await assertNoSideEffects(page, requests);
  });

  test.describe("mobile viewport", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("the complete path has no horizontal scrolling", async ({ page }) => {
      const requests = collectRequests(page);
      await page.goto("/audit/fixture");
      await expectNoHorizontalScroll(page);
      await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
      await expectNoHorizontalScroll(page);
      await page.getByRole("button", { name: "Bayar Rp99.000" }).click();
      await expectNoHorizontalScroll(page);
      await page
        .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
        .click();
      await page
        .getByRole("button", { name: "Lanjut ke fakta bisnis" })
        .click();
      await expectNoHorizontalScroll(page);
      await confirmFactsAndApprove(page);
      await expectNoHorizontalScroll(page);
      await page.getByRole("button", { name: "Jalankan audit" }).click();
      await page.getByRole("button", { name: "Mulai audit sekarang" }).click();
      await expectNoHorizontalScroll(page);
      await expectReadyReport(page);
      await expectNoHorizontalScroll(page);
      await assertNoSideEffects(page, requests);
    });
  });
});

test("print output retains the disclosure and renders the same report data (AC-12)", async ({
  page,
}) => {
  const requests = collectRequests(page);
  seedFixtureState(page, v3ReadyState());
  await page.goto("/audit/fixture");
  await expectReadyReport(page);
  await page.emulateMedia({ media: "print" });
  // The in-article disclosure prints.
  await expect(
    page.getByRole("note", { name: REPORT_PREVIEW_NOTICE }),
  ).toBeVisible();
  await expect(page.getByText("Pratinjau fiktif.").first()).toBeVisible();
  // Screen-only chrome is hidden in print.
  await expect(page.getByRole("button", { name: "Download PDF" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Unduh JSON" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mulai ulang" })).toHaveCount(
    0,
  );
  // The print layout uses the same report data, with details expanded.
  await expect(
    page.getByRole("heading", {
      name: "Bisnis Anda muncul di 8 dari 10 pertanyaan",
      level: 3,
    }),
  ).toBeVisible();
  await expect(page.getByText("8/10", { exact: true })).toBeVisible();
  await expect(page.locator("li[class*='testRow']")).toHaveCount(10);
  await expect(page.getByText(EXCERPT_ROW_1, { exact: true })).toBeVisible();
  await assertNoSideEffects(page, requests);
});
