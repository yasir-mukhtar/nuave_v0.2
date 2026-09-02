import { expect, test, type Page } from "@playwright/test";
import { buildAuditReport } from "../../src/lib/audit/contracts";
import {
  AUDIT_MEASUREMENT_MATRIX,
  CANONICAL_COMPOSITION_COUNTS,
} from "../../src/lib/audit/measurement-matrix";
import { goldenReportContent } from "../../src/lib/audit/fixtures/report-golden";
import { fixtureCallTelemetry } from "../../src/lib/audit/fixtures/telemetry";
import {
  buildDeterministicIndonesianPack,
  minimizeIndonesianBrief,
} from "../../src/lib/audit/questions-id";
import { INDONESIAN_AUDIT_REPORT_LABELS } from "../../src/lib/audit/report-language";
import type {
  AuditObservation,
  BusinessBrief,
  ExtractionDraft,
  PromptPack,
} from "../../src/lib/audit/types";
import { AUDIT_WORKFLOW_STORAGE_KEY } from "../../src/lib/audit/workflow-storage";
import { grantAccess } from "./helpers";

const SOURCE = "https://example.com/";
const SOURCE_B = "https://source-b.example/";

function identityPayload() {
  return {
    display_name: "Example Business",
    description: "Kedai kopi untuk bekerja dan bertemu.",
    canonical_url: SOURCE,
    icon_data_url: null,
    source_type: "website",
    confidence: true,
  };
}

function extractionDraft(
  overrides: Partial<ExtractionDraft> = {},
): ExtractionDraft {
  return {
    brand_name: "Example Business",
    entity_scope: "Seluruh brand Example Business",
    brand_type: "Kedai kopi",
    category: "Kedai kopi",
    market_context: "Bandung, Indonesia",
    target_customer: "Pekerja remote dan mahasiswa",
    official_sources: [SOURCE],
    verified_offerings: ["Kopi lokal", "Ruang kerja"],
    verified_customer_needs: ["Tempat untuk bekerja"],
    verified_decision_criteria: ["Lokasi", "Wi-Fi"],
    similar_businesses: [{ name: "Peer Coffee", source_url: "", origin: "ai" }],
    brand_name_variants: [],
    priority_offering: "Kopi lokal",
    conversion_action: "",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "Kopi lokal dan ruang kerja.",
    regulated_category_notes: "",
    evidence: [],
    warnings: [],
    ...overrides,
  };
}

function promptPackFor(brief: BusinessBrief): PromptPack {
  const questions = buildDeterministicIndonesianPack(
    minimizeIndonesianBrief(brief),
  );
  return {
    status: "draft_for_review",
    prompt_pack_version: "e1-postpayment-v1",
    language: "id-ID",
    target_product: "ChatGPT",
    brand: {
      brand_name: brief.brand_name,
      entity_scope: brief.entity_scope,
      brand_type: brief.brand_type,
      category: brief.category,
      market_context: brief.market_context,
      target_customer: brief.target_customer,
    },
    summary: {
      total_prompts: 10,
      unbranded_prompts: CANONICAL_COMPOSITION_COUNTS.unbranded,
      branded_prompts: CANONICAL_COMPOSITION_COUNTS.branded,
    },
    prompts: AUDIT_MEASUREMENT_MATRIX.map((slot, index) => ({
      prompt_id: slot.id,
      category: slot.category,
      role: slot.generatorSlotDescription,
      branded: slot.auditedBrandIdentity === "required",
      question: questions[index] ?? "Apa pilihan yang relevan untuk pelanggan?",
      rationale: slot.measurementPurpose,
      inputs_used: [...slot.allowedContextFields],
      review_status: "needs_human_review" as const,
    })),
    self_check: {
      ten_prompts: true,
      one_prompt_per_slot: true,
      canonical_composition: true,
      no_brand_leakage: true,
      verified_inputs_only: true,
      verified_competitor_only: true,
      single_entity_scope: true,
      category_safety_pass: true,
      independent_natural_questions: true,
    },
    warnings: [],
  };
}

function observationsFor(prompts: PromptPack["prompts"]): AuditObservation[] {
  return prompts.map((prompt, index) => {
    const responseId = `e1-postpayment-observation-${index + 1}`;
    return {
      prompt_id: prompt.prompt_id,
      category: prompt.category,
      branded: prompt.branded,
      question: prompt.question,
      instruction_version: "neutral-response-v1",
      system: "OpenAI Responses API",
      requested_model: "fixture-model",
      returned_model: "fixture-model",
      response_id: responseId,
      observed_at: "2026-09-01T00:00:00.000Z",
      raw_answer: prompt.branded
        ? "Example Business disebut dalam jawaban contoh."
        : "Beberapa pilihan kategori disebut dalam jawaban contoh.",
      sources: [],
      run_status: "completed",
      failure_reason: "",
      telemetry: [
        fixtureCallTelemetry({
          stage: "observation",
          requested_model: "fixture-model",
          returned_model: "fixture-model",
          response_id: responseId,
          web_search_calls: 1,
        }),
      ],
    };
  });
}

async function stubFullJourneyApis(
  page: Page,
  {
    withSuggestion = true,
    extractionDraftFor,
  }: {
    withSuggestion?: boolean;
    extractionDraftFor?: (source: string) => ExtractionDraft;
  } = {},
) {
  let identityCalls = 0;
  const extractionRequests: Record<string, unknown>[] = [];
  const promptRequests: Record<string, unknown>[] = [];
  const runRequests: Record<string, unknown>[] = [];
  const reportRequests: Record<string, unknown>[] = [];
  const varianceRequests: Record<string, unknown>[] = [];

  await page.route("**/api/audit/identity*", async (route) => {
    identityCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 75));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(identityPayload()),
    });
  });

  await page.route("**/api/audit/extract", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          limit_usd: 5,
          carryover_cost_usd: 0,
          calls: [],
        }),
      });
      return;
    }
    const request = route.request().postDataJSON() as Record<string, unknown>;
    extractionRequests.push(request);
    const requestedSource = String(request.website_url ?? "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        draft:
          extractionDraftFor?.(requestedSource) ??
          extractionDraft({
            similar_businesses: withSuggestion
              ? [{ name: "Peer Coffee", source_url: "", origin: "ai" }]
              : [],
          }),
        telemetry: [],
      }),
    });
  });

  await page.route("**/api/audit/prompts", async (route) => {
    const request = route.request().postDataJSON() as { brief: BusinessBrief };
    promptRequests.push(request as unknown as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        pack: promptPackFor(request.brief),
        telemetry: [],
      }),
    });
  });

  await page.route("**/api/audit/run", async (route) => {
    const request = route.request().postDataJSON() as {
      prompts: PromptPack["prompts"];
    };
    runRequests.push(request as unknown as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${JSON.stringify({
        type: "run_completed",
        observations: observationsFor(request.prompts),
      })}\n`,
    });
  });

  await page.route("**/api/audit/report", async (route) => {
    const request = route.request().postDataJSON() as {
      observations: AuditObservation[];
    };
    reportRequests.push(request as unknown as Record<string, unknown>);
    const responseId = "e1-postpayment-report";
    const report = buildAuditReport(
      goldenReportContent(),
      request.observations,
      {
        requested_model: "fixture-model",
        returned_model: "fixture-model",
        response_id: responseId,
        initial_response_id: responseId,
        call_count: 1,
        language_retry_performed: false,
        language_retry_violations: [],
      },
      INDONESIAN_AUDIT_REPORT_LABELS,
    );
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        report,
        telemetry: [
          fixtureCallTelemetry({ stage: "report", response_id: responseId }),
        ],
      }),
    });
  });

  await page.route("**/api/audit/variance", async (route) => {
    const request = route.request().postDataJSON() as {
      prompts: PromptPack["prompts"];
      run_key: string;
    };
    varianceRequests.push(request as unknown as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        variance: {
          run_key: request.run_key,
          created_at: "2026-09-01T00:00:00.000Z",
          prompt_ids: request.prompts.map((prompt) => prompt.prompt_id),
          observations: [],
          complete: true,
        },
        budget: { limit_usd: 5, carryover_cost_usd: 0, calls: [] },
      }),
    });
  });

  return {
    identityCalls: () => identityCalls,
    extractionRequests,
    promptRequests,
    runRequests,
    reportRequests,
    varianceRequests,
  };
}

async function readWorkflow(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(window.sessionStorage.getItem(key) || "null"),
    AUDIT_WORKFLOW_STORAGE_KEY,
  );
}

async function completeV2Payment(page: Page) {
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
    .click();
  await page.getByLabel("Email penerima laporan*").fill("owner@example.com");
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await page
    .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pembayaran simulasi selesai" }),
  ).toBeVisible();
}

async function completeEditedBriefToReview(page: Page) {
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByLabel("Satu cabang atau lokasi").check();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByLabel("Nama cabang atau lokasi*").fill("Dago");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByLabel("Target pelanggan*").fill("Pekerja remote di Bandung");
  await page.getByLabel("Kebutuhan pelanggan*").fill("Tempat tenang untuk WFC");
  await page.getByLabel("Pertimbangan keputusan*").fill("Lokasi dan Wi-Fi");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByLabel("Konteks pasar*").fill("Bandung, Indonesia");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByRole("button", { name: "Terima saran Nuave" }).click();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Tambahkan fakta opsional." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Tinjau informasi brand Anda sebelum membuat pertanyaan.",
    }),
  ).toBeVisible();
}

async function completePrePaymentEntry(page: Page, path: "/" | "/audit/v2") {
  await page.goto(path);
  await page.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
  await expect(
    page.getByRole("heading", { name: "Membaca identitas bisnis" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
    .click();
  await page.getByLabel("Email penerima laporan*").fill("owner@example.com");
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await page
    .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Memproses simulasi pembayaran" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pembayaran simulasi selesai" }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test("/audit/v2 continues through every applicable post-payment screen and sends the final reviewed inputs to the audit", async ({
  page,
}) => {
  const calls = await stubFullJourneyApis(page);
  await page.goto("/audit/v2");
  await page.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
  await expect(
    page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
    .click();
  await page.getByLabel("Email penerima laporan*").fill("owner@example.com");
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await page
    .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pembayaran simulasi selesai" }),
  ).toBeVisible();
  expect(calls.extractionRequests).toHaveLength(0);

  await page.getByRole("button", { name: "Mulai persiapan audit" }).click();
  await expect(
    page.getByRole("heading", { name: "Periksa brief brand Anda." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kembali ke sumber" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Kembali" })).toHaveCount(0);
  const intakeNavigation = page.getByRole("navigation", {
    name: "Progres persiapan audit",
  });
  await expect(intakeNavigation).toBeVisible();
  await expect(intakeNavigation).toContainText("Bab 1 dari 4");
  await expect(
    intakeNavigation.locator("[data-chapter='0']"),
  ).toHaveAttribute("aria-current", "step");
  await expect(
    intakeNavigation.getByRole("button", { name: "Kembali" }),
  ).toHaveCount(0);
  const firstNextButton = intakeNavigation.getByRole("button", {
    name: "Lanjut",
  });
  const firstNextBox = await firstNextButton.boundingBox();
  expect(firstNextBox).not.toBeNull();
  expect(Math.round(firstNextBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
  await expect.poll(() => calls.extractionRequests.length).toBe(1);

  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Tentukan cakupan audit." }),
  ).toBeVisible();
  await page.getByLabel("Satu cabang atau lokasi").check();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Lengkapi cabang atau lokasi." }),
  ).toBeVisible();
  await expect(intakeNavigation).toContainText("Bab 1 dari 4");
  const conditionalBackButton = intakeNavigation.getByRole("button", {
    name: "Kembali",
  });
  const conditionalNextButton = intakeNavigation.getByRole("button", {
    name: "Lanjut",
  });
  for (const button of [conditionalBackButton, conditionalNextButton]) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
  }
  await conditionalBackButton.focus();
  await expect(conditionalBackButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Tentukan cakupan audit." }),
  ).toBeVisible();
  await intakeNavigation.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Lengkapi cabang atau lokasi." }),
  ).toBeVisible();
  await page.getByLabel("Nama cabang atau lokasi*").fill("Dago");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Pilih kategori brand." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Pilih produk atau layanan yang diverifikasi.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Kenali pelanggan dan alasannya." }),
  ).toBeVisible();
  await expect(intakeNavigation).toContainText("Bab 2 dari 4");
  await expect(
    intakeNavigation.locator("[data-chapter='1']"),
  ).toHaveAttribute("aria-current", "step");
  await page.getByLabel("Target pelanggan*").fill("Pekerja remote di Bandung");
  await page.getByLabel("Kebutuhan pelanggan*").fill("Tempat tenang untuk WFC");
  await page.getByLabel("Pertimbangan keputusan*").fill("Lokasi dan Wi-Fi");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Jelaskan konteks pasar." }),
  ).toBeVisible();
  await expect(intakeNavigation).toContainText("Bab 3 dari 4");
  await expect(
    intakeNavigation.locator("[data-chapter='2']"),
  ).toHaveAttribute("aria-current", "step");
  await page.getByLabel("Konteks pasar*").fill("Bandung, Indonesia");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Pilih bisnis pembanding yang realistis.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Terima saran Nuave" }).click();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Tambahkan fakta opsional." }),
  ).toBeVisible();
  await expect(intakeNavigation).toContainText("Bab 4 dari 4");
  await expect(
    intakeNavigation.locator("[data-chapter='3']"),
  ).toHaveAttribute("aria-current", "step");
  await page
    .getByLabel("Differentiator (opsional)")
    .fill("Kopi lokal pilihan.");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Tinjau informasi brand Anda sebelum membuat pertanyaan.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Konfirmasi fakta dan buat 10 pertanyaan" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
  ).toBeVisible();
  await expect(
    page.getByText("Tanpa menyebut bisnis Anda", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Menyebut bisnis Anda", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Jalankan audit" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Semua pengamatan selesai. Laporan sedang dibuat.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Example Business" }),
  ).toBeVisible({ timeout: 20_000 });

  expect(calls.identityCalls()).toBe(1);
  expect(calls.extractionRequests).toHaveLength(1);
  expect(calls.promptRequests).toHaveLength(1);
  expect(calls.runRequests).toHaveLength(1);
  expect(calls.reportRequests).toHaveLength(1);
  expect(calls.varianceRequests).toHaveLength(1);
  expect(calls.promptRequests[0]?.brief).toMatchObject({
    entity_scope: "Cabang: Dago",
    target_customer: "Pekerja remote di Bandung",
    verified_competitor: { name: "Peer Coffee" },
  });
  expect(calls.runRequests[0]?.prompts).toHaveLength(10);
  expect(calls.reportRequests[0]?.observations).toHaveLength(10);
});

test("chapter navigation respects the conditional product path", async ({
  page,
}) => {
  const calls = await stubFullJourneyApis(page);
  await page.goto("/audit/v2");
  await page.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
  await expect(
    page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
  ).toBeVisible();
  await completeV2Payment(page);
  await page.getByRole("button", { name: "Mulai persiapan audit" }).click();
  await expect(
    page.getByRole("heading", { name: "Periksa brief brand Anda." }),
  ).toBeVisible();
  await expect.poll(() => calls.extractionRequests.length).toBe(1);

  const intakeNavigation = page.getByRole("navigation", {
    name: "Progres persiapan audit",
  });
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Tentukan cakupan audit." }),
  ).toBeVisible();
  await page.getByLabel("Satu produk atau layanan").check();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Lengkapi produk atau layanan." }),
  ).toBeVisible();
  await expect(intakeNavigation).toContainText("Bab 1 dari 4");
  const conditionalBackButton = intakeNavigation.getByRole("button", {
    name: "Kembali",
  });
  const conditionalNextButton = intakeNavigation.getByRole("button", {
    name: "Lanjut",
  });
  for (const button of [conditionalBackButton, conditionalNextButton]) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
  }
  await conditionalBackButton.focus();
  await expect(conditionalBackButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Tentukan cakupan audit." }),
  ).toBeVisible();
  await intakeNavigation.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Lengkapi produk atau layanan." }),
  ).toBeVisible();

  await page.getByLabel("Nama produk atau layanan*").fill("Kopi botol");
  await intakeNavigation.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Pilih kategori brand." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lengkapi cabang atau lokasi." }),
  ).toHaveCount(0);
  expect((await readWorkflow(page)).brief.entity_scope).toBe("Produk: Kopi botol");
});

test("the real landing entry reaches the completed report journey", async ({
  page,
}) => {
  const calls = await stubFullJourneyApis(page);
  await completePrePaymentEntry(page, "/");
  expect(calls.extractionRequests).toHaveLength(0);

  await page.getByRole("button", { name: "Mulai persiapan audit" }).click();
  await expect(
    page.getByRole("heading", { name: "Periksa brief brand Anda." }),
  ).toBeVisible();
  await expect.poll(() => calls.extractionRequests.length).toBe(1);
  await completeEditedBriefToReview(page);
  await page
    .getByRole("button", { name: "Konfirmasi fakta dan buat 10 pertanyaan" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Jalankan audit" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Semua pengamatan selesai. Laporan sedang dibuat.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Example Business" }),
  ).toBeVisible({ timeout: 20_000 });

  expect(calls.identityCalls()).toBe(1);
  expect(calls.extractionRequests).toHaveLength(1);
  expect(calls.promptRequests).toHaveLength(1);
  expect(calls.runRequests).toHaveLength(1);
  expect(calls.reportRequests).toHaveLength(1);
  expect(calls.varianceRequests).toHaveLength(1);
});

test("source correction replaces one source version and preserves customer-owned context", async ({
  page,
}) => {
  const calls = await stubFullJourneyApis(page, {
    extractionDraftFor: (source) =>
      source === SOURCE_B
        ? extractionDraft({
            brand_name: "Provider B Name",
            entity_scope: "Seluruh brand Provider B Name",
            brand_type: "Software company from source B",
            category: "Software platform",
            market_context: "Provider B market",
            target_customer: "Provider B customer profile",
            official_sources: [SOURCE_B],
            verified_offerings: ["B SaaS offer"],
            verified_customer_needs: ["B customer need"],
            verified_decision_criteria: ["B decision criterion"],
            similar_businesses: [
              { name: "Source B Suggestion", source_url: "", origin: "ai" },
            ],
            usp: "B differentiator",
          })
        : extractionDraft(),
  });

  await page.goto("/audit/v2");
  await page.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
  await expect(
    page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
  ).toBeVisible();
  await completeV2Payment(page);
  expect(calls.extractionRequests).toHaveLength(0);

  await page.getByRole("button", { name: "Mulai persiapan audit" }).click();
  await expect(
    page.getByRole("heading", { name: "Periksa brief brand Anda." }),
  ).toBeVisible();
  await expect.poll(() => calls.extractionRequests.length).toBe(1);
  await completeEditedBriefToReview(page);

  for (const heading of [
    "Tambahkan fakta opsional.",
    "Pilih bisnis pembanding yang realistis.",
    "Jelaskan konteks pasar.",
    "Kenali pelanggan dan alasannya.",
    "Pilih produk atau layanan yang diverifikasi.",
    "Pilih kategori brand.",
    "Lengkapi cabang atau lokasi.",
    "Tentukan cakupan audit.",
    "Periksa brief brand Anda.",
  ]) {
    await page.getByRole("button", { name: "Kembali" }).first().click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  await page
    .getByRole("button", { name: "Bukan, ganti brand atau sumber" })
    .click();
  await page
    .getByLabel("Website atau profil Instagram baru (opsional)")
    .fill(SOURCE_B);
  await page.getByLabel("Nama brand yang benar*").fill("Customer B Name");
  await page.getByRole("button", { name: "Baca ulang sumber" }).click();
  await expect(
    page.getByRole("heading", { name: "Periksa brief brand Anda." }),
  ).toBeVisible();
  await expect.poll(() => calls.extractionRequests.length).toBe(2);

  expect(calls.extractionRequests[0]).toMatchObject({
    website_url: SOURCE,
    brand_name: "",
  });
  expect(calls.extractionRequests[1]).toMatchObject({
    website_url: SOURCE_B,
    brand_name: "Customer B Name",
  });
  const saved = await readWorkflow(page);
  expect(saved.websiteUrl).toBe(SOURCE_B);
  expect(saved.extractedSourceUrl).toBe(SOURCE_B);
  expect(saved.brief.official_sources).toEqual([SOURCE_B]);
  expect(saved.brief.brand_name).toBe("Customer B Name");
  expect(saved.brief.entity_scope).toBe("Cabang: Dago");
  expect(saved.brief.target_customer).toBe("Pekerja remote di Bandung");
  expect(saved.brief.market_context).toBe("Bandung, Indonesia");
  expect(saved.brief.brand_type).toBe("Software company from source B");
  expect(saved.brief.category).toBe("Software platform");
  expect(saved.brief.verified_offerings).toEqual(["B SaaS offer"]);
  expect(saved.brief.priority_offering).toBe("B SaaS offer");
  expect(saved.brief.conversion_action).toBe(
    "Minta demo atau hubungi bisnis melalui sumber resmi.",
  );
  expect(saved.brief.verified_competitor).toEqual({
    name: "Peer Coffee",
    scope: "",
    source_url: "",
  });
  expect(saved.meta.comparisonStatus).toBe("needs_reconfirmation");
  expect(JSON.stringify(saved.brief)).not.toContain(SOURCE);

  for (const heading of [
    "Tentukan cakupan audit.",
    "Lengkapi cabang atau lokasi.",
    "Pilih kategori brand.",
    "Pilih produk atau layanan yang diverifikasi.",
    "Kenali pelanggan dan alasannya.",
    "Jelaskan konteks pasar.",
    "Pilih bisnis pembanding yang realistis.",
  ]) {
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: "Konfirmasi ulang target sebelumnya" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Konfirmasi target sebelumnya" })
    .click();
  await expect.poll(() => calls.extractionRequests.length).toBe(2);
  expect((await readWorkflow(page)).meta.comparisonStatus).toBe("confirmed");
});

test("the comparison fallback is explicit, URL-free, and reaches slot 9", async ({
  page,
}) => {
  const calls = await stubFullJourneyApis(page, { withSuggestion: false });
  await page.goto("/audit/v2");
  await page.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
    .click();
  await page.getByLabel("Email penerima laporan*").fill("owner@example.com");
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await page
    .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
    .click();
  await page.getByRole("button", { name: "Mulai persiapan audit" }).click();
  await expect(
    page.getByRole("heading", { name: "Periksa brief brand Anda." }),
  ).toBeVisible();

  for (const heading of [
    "Tentukan cakupan audit.",
    "Pilih kategori brand.",
    "Pilih produk atau layanan yang diverifikasi.",
    "Kenali pelanggan dan alasannya.",
    "Jelaskan konteks pasar.",
    "Pilih bisnis pembanding yang realistis.",
  ]) {
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  await expect(
    page.getByText("alternatif lain di kategori Kedai kopi", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Peer Coffee", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Gunakan alternatif kategori" })
    .click();
  await expect(
    page.getByText("alternatif lain di kategori Kedai kopi", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(
    page.getByRole("heading", { name: "Tambahkan fakta opsional." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page
    .getByRole("button", { name: "Konfirmasi fakta dan buat 10 pertanyaan" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
  ).toBeVisible();

  const promptRequest = calls.promptRequests[0] as {
    brief: BusinessBrief;
  };
  expect(promptRequest.brief.verified_competitor).toEqual({
    name: "alternatif lain di kategori Kedai kopi",
    scope: "",
    source_url: "",
  });
  await expect(page.getByLabel("Pertanyaan 9")).toHaveValue(
    /alternatif lain di kategori Kedai kopi/,
  );
});
