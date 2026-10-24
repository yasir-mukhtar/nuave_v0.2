// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_PASS_STORAGE_KEY } from "./test-pass";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "../audit/source-handoff";
import historicalPair from "../../../tests/spec011-v1-records.json";
import {
  extractionDraftSchema,
  INTAKE_TEXT_RESTRICTED_MESSAGE,
} from "../audit/types";
import { LOCAL_INTAKE_STORAGE_KEY } from "./local-session";
import { LOCAL_AUDIT_STORAGE_KEY } from "./local-audit-session";
import {
  prepareUnderstanding,
  initialSmartSelection,
  SMART_INTAKE_STORAGE_KEY,
} from "./smart-intake-contract";
import SmartIntakeJourney from "./SmartIntakeJourney";
import {
  ACTIVE_ORDER_STORAGE_KEY,
  freshSmartSession,
  parseSmartSession,
} from "./smart-session";
import { projectQuestionOutcome } from "./question-public-errors";

beforeEach(() => {
  window.sessionStorage.clear();
  // Spec 017 R-20: these journeys run on a founder test pass (no payment); the
  // paid screens have their own tests in payment-journey.test.tsx.
  window.sessionStorage.setItem(TEST_PASS_STORAGE_KEY, "test-code");
  window.localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const lanjut = () =>
  fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
const kembali = () =>
  fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
// J10/J24: the chapter covers move on with "Mulai".
const mulai = () =>
  fireEvent.click(screen.getByRole("button", { name: "Mulai" }));

// J20 when Nuave found suggestions, J21 when it found none.
const COMPETITORS_HEADING =
  /^(Siapa yang mungkin|Bisnis mana yang sering) dibandingkan dengan Anda\?$/;

// J14–J25 detail chain between the category screen and the review. A cabang
// focus skips the market screen.
async function fromOfferings(focus: "brand" | "cabang" | "produk" = "brand") {
  await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
  lanjut();
  await screen.findByRole("heading", {
    name: "Siapa yang biasanya mencari bisnis Anda?",
  });
  lanjut();
  await screen.findByRole("heading", {
    name: "Apa yang mereka cari saat memilih?",
  });
  lanjut();
  await screen.findByRole("heading", {
    name: "Bagaimana pelanggan mendapatkannya?",
  });
  lanjut();
  if (focus !== "cabang") {
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
  }
  await afterMarket();
}

async function afterMarket() {
  await screen.findByRole("heading", { name: COMPETITORS_HEADING });
  lanjut();
  await screen.findByRole("heading", {
    name: "Apa yang membuat bisnis Anda berbeda?",
  });
  lanjut();
  await throughReviewCover();
}

/** J24 → J25: the Step 3 cover, then the review. */
async function throughReviewCover() {
  await screen.findByRole("heading", { name: "Periksa, lalu jalankan audit" });
  mulai();
  await screen.findByRole("heading", {
    name: "Ini profil yang akan Nuave pakai",
  });
}

async function throughDetails(focus: "brand" | "cabang" | "produk" = "brand") {
  await screen.findByRole("heading", { name: /biasanya disebut apa\?/ });
  lanjut();
  await fromOfferings(focus);
}

/** J05 → J06 → J07: the found business is confirmed, the three steps are
 * shown, and the order screen opens. */
async function toOrder() {
  await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
  fireEvent.click(screen.getByRole("button", { name: "Ya, ini bisnis saya" }));
  await screen.findByRole("heading", { name: "Tinggal 3 langkah" });
  fireEvent.click(screen.getByRole("button", { name: "Lanjut ke pembayaran" }));
}

/** Spec 016/017: the order screen. The email is typed and `Lanjut` (a test
 * pass needs no payment) makes the order; the paid reading then starts by
 * itself. */
async function passOrder(email = "pemilik@example.com") {
  await screen.findByRole("heading", { name: "Konfirmasi dan bayar" });
  fireEvent.change(screen.getByRole("textbox", { name: /Email/ }), {
    target: { value: email },
  });
  lanjut();
}

/** J10 → J11: the Step 2 cover after the paid reading, then the focus. */
async function startStepTwo() {
  await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
  mulai();
  await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
}

async function throughBrand() {
  await toOrder();
  await passOrder();
  await startStepTwo();
  lanjut();
  await throughDetails();
}

/** J25: the read-back value (dd) of one review fact, by its label (dt). */
const fact = (label: string) =>
  screen.getByText(label, { selector: "dt" }).nextElementSibling as HTMLElement;

const REVIEW_CONFIRMATION =
  "Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam pertanyaan audit.";

/** Spec 018 AC-01: when no place could be pre-filled, the owner picks one
 * ("Seluruh Indonesia" here) in the "Kota untuk pencarian" sheet. */
function ensureSearchPlace() {
  if (!screen.queryByText(/Perlu dipastikan:.*Kota untuk pencarian/)) return;
  fireEvent.click(
    screen.getByRole("button", { name: "Ubah Kota untuk pencarian" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Seluruh Indonesia" }));
  fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
}
/** J25: the owner's tick, which unlocks "Buat pertanyaan audit". */
const tickReview = () => {
  ensureSearchPlace();
  const box = screen.getByRole("checkbox", { name: REVIEW_CONFIRMATION });
  if (box.getAttribute("aria-checked") !== "true") fireEvent.click(box);
};

const buatPertanyaan = () =>
  screen.getByRole("button", { name: "Buat pertanyaan audit" });

/** J26: one review section's edit sheet ("Ubah Bisnis" etc.). */
async function openSheet(section: "Bisnis" | "Calon pelanggan" | "Pembanding") {
  fireEvent.click(screen.getByRole("button", { name: `Ubah ${section}` }));
  return screen.findByRole("dialog", { name: `Ubah ${section}` });
}

/** The sheet header's Simpan (an add sheet also has a hidden submit). */
const sheetSave = (sheet: HTMLElement) =>
  within(sheet).getAllByRole("button", { name: "Simpan" })[0]!;

/** Simpan or Batal, then wait until the sheet has gone. */
async function closeSheet(sheet: HTMLElement, action: "Simpan" | "Batal") {
  fireEvent.click(
    action === "Simpan"
      ? sheetSave(sheet)
      : within(sheet).getByRole("button", { name: "Batal" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

/** A chip adder: type into its field and press the Tambah beside it. */
function addThrough(field: string, value: string) {
  const input = screen.getByRole("textbox", {
    name: field,
  }) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  fireEvent.click(
    within(screen.getByRole("group", { name: field })).getByRole("button", {
      name: "Tambah",
    }),
  );
  return input;
}

/** J05b: the "Nama bisnis" sheet of the found business. */
async function renameBusiness(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Ubah nama" }));
  const sheet = await screen.findByRole("dialog", { name: "Nama bisnis" });
  fireEvent.change(
    within(sheet).getByRole("textbox", { name: "Nama bisnis" }),
    { target: { value: name } },
  );
  fireEvent.click(within(sheet).getByRole("button", { name: "Simpan" }));
  return sheet;
}

const draft = {
  brand_name: "Kedai Fiksi",
  entity_scope: "",
  brand_type: "",
  category: "kedai kopi",
  market_context: "",
  service_channels: ["on_premise"],
  market_reach: "sekitar",
  market_areas: ["Bandung"],
  target_customer: "pekerja sekitar",
  official_sources: ["https://kedai-fiksi.example/"],
  verified_offerings: ["kopi susu", "roti"],
  verified_customer_needs: ["minuman dekat kantor"],
  verified_decision_criteria: ["lokasi"],
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "",
  conversion_action: "",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  evidence: [],
  warnings: [],
};

describe("smart blank intake", () => {
  it.each([
    "rate429",
    "rate503",
    "unknown500",
    "unknown503",
    "validation_positive",
    "validation_zero",
    "validation_unavailable",
    "malformed_ok_missing_questions",
    "malformed_ok_invalid_provenance",
    "malformed_ok_canonical",
    "valid_ok",
  ])(
    "PR121 accounting correction %s preserves truthful history",
    async (kind) => {
      const prepared = prepareUnderstanding({
        draft: extractionDraftSchema.parse(draft),
        typedName: "Kedai Fiksi",
        discoveredName: null,
        canonicalSource: "https://kedai-fiksi.example/",
      });
      const base = initialSmartSelection(prepared);
      const selection = {
        ...base,
        targetCustomer: "pekerja sekitar",
        decisionConsiderations: ["lokasi", "harga"],
        differentiator: "kopi segar",
        origins: {
          ...base.origins,
          targetCustomer: "owner" as const,
          decisionConsiderations: "owner" as const,
          differentiator: "owner" as const,
        },
      };
      const history = [
        {
          started_at: "2026-10-01T00:00:00.000Z",
          outcome: "failed",
          execution: "confirmed",
          cost_usd: 0.001,
        },
        {
          started_at: "2026-10-02T00:00:00.000Z",
          outcome: "interrupted",
          execution: "unknown",
          cost_usd: null,
        },
      ];
      window.localStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify({
          ...freshSmartSession(),
          savedAt: new Date().toISOString(),
          stage: "summary",
          prepared,
          selection,
          generationAttempts: history,
        }),
      );
      const provenance = {
        requestId: "accepted-server-id",
        method: "direct-ten" as const,
        requestedModel: "glm-5.3-flash",
        returnedModel: "zai/glm-5.3-flash",
        responseId: "accepted-response-id",
        modelMismatch: true,
        transport: "cheaper-inference" as const,
      };
      const questions = Array.from(
        { length: 10 },
        (_, i) => `Pilihan kedai kopi apa di Bandung untuk kebutuhan ${i + 1}?`,
      );
      const validation = kind.startsWith("validation_");
      const rate = kind.startsWith("rate");
      const valid = kind === "valid_ok";
      const cost =
        kind === "validation_positive"
          ? 0.004
          : kind === "validation_zero"
            ? 0
            : null;
      const payload = validation
        ? projectQuestionOutcome({
            status: "validation_failed",
            questions: ["MOCK_ONLY_REJECTED"],
            issues: ["MOCK_ONLY_ISSUE"],
            examination: {
              marketInterpretation: "MOCK_ONLY_EXAM",
              selfCritique: "MOCK_ONLY_CRITIQUE",
              intentLabels: ["MOCK_ONLY_LABEL"],
            },
            provenance: {
              ...provenance,
              requestId: "MOCK_ONLY_INVALID_REQUEST_ID",
              returnedModel: "MOCK_ONLY_MODEL_ID",
              responseId: "MOCK_ONLY_RESPONSE_ID",
            },
            cost: { billedUsd: cost, available: cost !== null },
          })
        : rate
          ? {
              error:
                kind === "rate429"
                  ? "Terlalu banyak permintaan, coba lagi dalam beberapa menit."
                  : "Perlindungan akses sedang tidak tersedia. Coba lagi nanti.",
              code:
                kind === "rate429" ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE",
            }
          : kind.startsWith("unknown")
            ? { error: "MOCK_ONLY_EXCEPTION", code: "MOCK_ONLY_UNKNOWN" }
            : {
                status: "ok",
                provenance:
                  kind === "malformed_ok_missing_questions" ||
                  kind === "malformed_ok_invalid_provenance"
                    ? {}
                    : provenance,
                cost: { billedUsd: 0, available: true },
                ...(kind === "malformed_ok_missing_questions"
                  ? {}
                  : {
                      questions:
                        kind === "malformed_ok_canonical"
                          ? ["", ...questions.slice(1)]
                          : questions,
                    }),
              };
      if (validation) {
        const serialized = JSON.stringify(payload);
        expect(serialized).not.toContain("MOCK_ONLY");
        expect(JSON.parse(serialized)).not.toHaveProperty("provenance");
        expect(JSON.parse(serialized)).toMatchObject({
          status: "validation_failed",
          questions: [],
          identitiesWithheld: true,
          cost: { billedUsd: cost, available: cost !== null },
        });
      }
      const requests: unknown[] = [];
      const fetchMock = vi.fn(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          expect(String(url)).toBe("/api/audit/glm-questions");
          requests.push(JSON.parse(String(init?.body)));
          return Response.json(payload, {
            status:
              kind === "rate429"
                ? 429
                : kind === "rate503" || kind === "unknown503"
                  ? 503
                  : kind === "unknown500"
                    ? 500
                    : 200,
          });
        },
      );
      vi.stubGlobal("fetch", fetchMock);
      render(<SmartIntakeJourney live={true} />);
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      tickReview();
      const confirm = buatPertanyaan();
      fireEvent.click(confirm);
      fireEvent.click(confirm);
      if (valid)
        await screen.findByRole("heading", {
          name: "10 pertanyaan untuk AI",
        });
      else {
        const alert = await screen.findByRole("alert");
        expect(alert.textContent).toBe(
          rate
            ? (payload as { error: string }).error
            : validation
              ? "Pertanyaan belum memenuhi persyaratan audit. Periksa kembali informasi bisnis Anda."
              : "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
        );
        // J27: without a pack there is nothing to run.
        expect(
          screen.queryByRole("button", { name: "Jalankan audit" }),
        ).toBeNull();
        expect(
          screen.queryByRole("button", { name: "Mulai audit sekarang" }),
        ).toBeNull();
      }
      const saved = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      )!;
      expect(saved.generationAttempts.slice(0, history.length)).toEqual(
        history,
      );
      expect(saved.generationAttempts).toHaveLength(
        rate ? history.length : history.length + 1,
      );
      if (!rate)
        expect(saved.generationAttempts.at(-1)).toMatchObject({
          outcome: validation ? "failed" : valid ? "succeeded" : "interrupted",
          execution: validation || valid ? "confirmed" : "unknown",
          cost_usd: validation ? cost : valid ? 0 : null,
        });
      expect(saved.selection).toEqual(selection);
      if (valid) {
        expect(saved.pack!.provenance).toEqual(provenance);
        expect(saved.pack!.approved).toEqual(questions);
      } else {
        expect(saved.pack).toBeNull();
        expect(
          window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
        ).not.toMatch(/MOCK_ONLY|identitiesWithheld/);
      }
      cleanup();
      render(<SmartIntakeJourney live={true} />);
      if (valid)
        await screen.findByRole("heading", {
          name: "10 pertanyaan untuk AI",
        });
      else
        await screen.findByRole("button", { name: "Coba siapkan pertanyaan" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        parseSmartSession(
          window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
        )!.generationAttempts,
      ).toEqual(saved.generationAttempts);
      if (!valid) {
        const retry = screen.getByRole("button", {
          name: "Coba siapkan pertanyaan",
        });
        fireEvent.click(retry);
        fireEvent.click(retry);
        await screen.findByRole("alert");
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(requests[1]).toEqual(requests[0]);
        expect(
          parseSmartSession(
            window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
          )!.frozen,
        ).toEqual(saved.frozen);
      }
    },
  );

  it.each([
    [
      "provider_error",
      "Layanan pembuatan pertanyaan sedang mengalami kendala. Coba lagi nanti.",
      0.004,
    ],
    [
      "http_error",
      "Layanan pembuatan pertanyaan sedang mengalami kendala. Coba lagi nanti.",
      0,
    ],
    [
      "refusal",
      "Pertanyaan tidak dapat dibuat dari informasi ini. Periksa kembali informasi bisnis Anda.",
      null,
    ],
    [
      "extraction_unexpected_line",
      "Respons pembuatan pertanyaan tidak dapat digunakan. Coba siapkan pertanyaan lagi.",
      null,
    ],
    [
      "provenance",
      "Asal respons pembuatan pertanyaan tidak dapat diverifikasi. Pertanyaan belum dapat digunakan.",
      null,
    ],
    [
      "validation_failed",
      "Pertanyaan belum memenuhi persyaratan audit. Periksa kembali informasi bisnis Anda.",
      0,
    ],
    [
      "correction_required",
      "Konfirmasi bisnis belum dapat digunakan. Kembali ke ringkasan dan periksa pilihan Anda.",
      null,
    ],
    [
      "preflight",
      "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
      null,
    ],
    [
      "unknown",
      "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
      null,
    ],
    [
      "missing_status",
      "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
      null,
    ],
    [
      "missing_provenance",
      "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
      null,
    ],
    [
      "connection_live",
      "Permintaan pembuatan pertanyaan terputus. Pertanyaan mungkin sudah dibuat dan mungkin sudah dikenai biaya, tetapi tidak diterima.",
      null,
    ],
    [
      "connection_synthetic",
      "Permintaan pembuatan pertanyaan terputus. Pertanyaan belum diterima.",
      null,
    ],
    [
      "no_json",
      "Permintaan pembuatan pertanyaan terputus. Pertanyaan mungkin sudah dibuat dan mungkin sudah dikenai biaya, tetapi tidak diterima.",
      null,
    ],
    [
      "internal_error",
      "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
      null,
    ],
  ] as const)(
    "PR121 defensive alert/accounting %s ignores MOCK_ONLY text",
    async (kind, message, cost) => {
      const prepared = prepareUnderstanding({
        draft: extractionDraftSchema.parse(draft),
        typedName: "Kedai Fiksi",
        discoveredName: null,
        canonicalSource: "https://kedai-fiksi.example/",
      });
      const base = initialSmartSelection(prepared);
      const selection = {
        ...base,
        targetCustomer: "pekerja sekitar",
        decisionConsiderations: ["lokasi", "harga"],
        differentiator: "kopi segar",
        origins: {
          ...base.origins,
          targetCustomer: "owner" as const,
          decisionConsiderations: "owner" as const,
          differentiator: "owner" as const,
        },
      };
      window.localStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify({
          ...freshSmartSession(),
          savedAt: new Date().toISOString(),
          stage: "summary",
          prepared,
          selection,
        }),
      );
      const requests: unknown[] = [];
      const fetchMock = vi.fn(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          expect(String(url)).toBe("/api/audit/glm-questions");
          requests.push(JSON.parse(String(init?.body)));
          if (kind.startsWith("connection"))
            throw new Error("MOCK_ONLY_CLIENT_EXCEPTION");
          if (kind === "no_json")
            return new Response("MOCK_ONLY_INVALID_JSON", { status: 502 });
          const status =
            kind === "validation_failed" || kind === "correction_required"
              ? kind
              : kind === "missing_status"
                ? undefined
                : kind === "unknown"
                  ? "MOCK_ONLY_STATUS"
                  : kind === "missing_provenance"
                    ? "ok"
                    : "failed";
          return Response.json(
            {
              status,
              reason: kind,
              code:
                kind === "preflight" ? "LIVE_CREDENTIALS_MISSING" : undefined,
              detail: "MOCK_ONLY_DETAIL",
              error: "MOCK_ONLY_ERROR",
              issues: ["MOCK_ONLY_ISSUES"],
              questions: ["MOCK_ONLY_REJECTED"],
              ...(kind === "internal_error" || kind === "missing_provenance"
                ? {}
                : {
                    provenance: {
                      requestId: "mock",
                      method: "direct-ten",
                      requestedModel: "glm-5.3-flash",
                      returnedModel: "MOCK_ONLY_MODEL",
                      responseId: "MOCK_ONLY_RESPONSE",
                      modelMismatch: true,
                      transport: "cheaper-inference",
                    },
                  }),
              providerContact:
                kind === "preflight"
                  ? "none"
                  : kind === "internal_error" ||
                      kind.startsWith("missing") ||
                      kind === "unknown"
                    ? undefined
                    : "responded",
              cost: { billedUsd: cost, available: cost !== null },
              identitiesWithheld: true,
            },
            {
              status:
                kind === "internal_error"
                  ? 500
                  : kind === "preflight"
                    ? 503
                    : 200,
            },
          );
        },
      );
      vi.stubGlobal("fetch", fetchMock);
      const live = kind !== "connection_synthetic";
      render(<SmartIntakeJourney live={live} />);
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      tickReview();
      const confirm = buatPertanyaan();
      fireEvent.click(confirm);
      fireEvent.click(confirm);
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toBe(message);
      expect(document.body.textContent).not.toContain("MOCK_ONLY");
      const saved = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      )!;
      expect(saved.pack).toBeNull();
      expect(saved.selection).toEqual(selection);
      expect(saved.frozen!.context.targetCustomer!.value).toBe(
        selection.targetCustomer,
      );
      expect(saved.frozen!.context.decisionConsiderations!.value).toEqual(
        selection.decisionConsiderations,
      );
      expect(saved.frozen!.context.differentiator!.value).toBe(
        selection.differentiator,
      );
      expect(
        screen.queryByRole("button", { name: "Jalankan audit" }),
      ).toBeNull();
      const noWork = kind === "preflight" || kind === "correction_required";
      const uncertain =
        kind === "unknown" ||
        kind.startsWith("missing") ||
        kind.startsWith("connection") ||
        kind === "no_json" ||
        kind === "internal_error";
      expect(saved.generationAttempts).toHaveLength(noWork ? 0 : 1);
      if (!noWork)
        expect(saved.generationAttempts[0]).toMatchObject({
          outcome: uncertain ? "interrupted" : "failed",
          execution: uncertain ? "unknown" : "confirmed",
          cost_usd: uncertain ? null : cost,
        });
      const raw = window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
      expect(raw).not.toMatch(/MOCK_ONLY|identitiesWithheld/);
      cleanup();
      render(<SmartIntakeJourney live={live} />);
      const retry = await screen.findByRole("button", {
        name: "Coba siapkan pertanyaan",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        parseSmartSession(
          window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
        )!.generationAttempts,
      ).toEqual(saved.generationAttempts);
      fireEvent.click(retry);
      fireEvent.click(retry);
      await screen.findByRole("alert");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(requests[1]).toEqual(requests[0]);
    },
  );

  it("maps incomplete by structured reason and preserves frozen JQ context on explicit retry (R-30)", async () => {
    const prepared = prepareUnderstanding({
      draft: extractionDraftSchema.parse(draft),
      typedName: "Kedai Fiksi",
      discoveredName: null,
      canonicalSource: "https://kedai-fiksi.example/",
    });
    const base = initialSmartSelection(prepared);
    const selection = {
      ...base,
      targetCustomer: "pekerja sekitar",
      decisionConsiderations: ["lokasi", "harga"],
      differentiator: "kopi segar",
      origins: {
        ...base.origins,
        targetCustomer: "owner" as const,
        decisionConsiderations: "owner" as const,
        differentiator: "owner" as const,
      },
    };
    window.localStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({
        ...freshSmartSession(),
        savedAt: new Date().toISOString(),
        stage: "summary",
        prepared,
        selection,
      }),
    );
    const requests: unknown[] = [];
    const fetchMock = vi.fn(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        expect(String(url)).toBe("/api/audit/glm-questions");
        requests.push(JSON.parse(String(init?.body)));
        const provenance = {
          requestId: "mock",
          method: "direct-ten",
          requestedModel: "glm-5.3-flash",
          returnedModel: "glm-5.3-flash",
          responseId: "mock",
          modelMismatch: false,
          transport: "synthetic-stub",
        };
        return Response.json(
          requests.length === 1
            ? {
                status: "failed",
                reason: "incomplete",
                detail: "arbitrary provider prose; not a length substring",
                providerContact: "responded",
                provenance,
                diagnostics: {
                  httpStatus: 200,
                  finishReason: "length",
                  usage: {
                    prompt_tokens: 0,
                    completion_tokens: 20,
                    total_tokens: null,
                  },
                  instructionVersion: "glm-direct-ten-2026-09-18-concise-v1",
                },
                cost: { billedUsd: null, available: false },
              }
            : {
                status: "ok",
                questions: Array.from(
                  { length: 10 },
                  (_, i) =>
                    `Pilihan kedai kopi apa di Bandung untuk kebutuhan ${i + 1}?`,
                ),
                provenance,
                cost: { billedUsd: null, available: false },
              },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SmartIntakeJourney live={true} />);
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    tickReview();
    const confirm = buatPertanyaan();
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(
      screen.queryByRole("button", { name: "Coba siapkan pertanyaan" }),
    ).toBeNull();
    expect(
      screen.queryByText(
        "Mencoba lagi mengirim permintaan baru dan dapat menambah biaya penggunaan AI.",
      ),
    ).toBeNull();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "Penyusunan 10 pertanyaan belum selesai. Jawaban Anda tetap tersedia dalam sesi ini. Coba siapkan pertanyaan lagi.",
    );
    expect(alert.textContent).not.toMatch(/finish_reason|provider prose/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const failed = parseSmartSession(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
    )!;
    expect(failed.pack).toBeNull();
    expect(screen.queryByRole("button", { name: "Jalankan audit" })).toBeNull();
    expect(failed.generationAttempts).toHaveLength(1);
    expect(
      screen.getByText(
        "Mencoba lagi mengirim permintaan baru dan dapat menambah biaya penggunaan AI.",
      ),
    ).toBeDefined();
    expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).not.toMatch(
      /diagnostics|instructionVersion|finishReason|prompt_tokens/,
    );
    cleanup();
    render(<SmartIntakeJourney live={true} />);
    const retry = await screen.findByRole("button", {
      name: "Coba siapkan pertanyaan",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(
        "Mencoba lagi mengirim permintaan baru dan dapat menambah biaya penggunaan AI.",
      ),
    ).not.toBeNull();
    fireEvent.click(retry);
    fireEvent.click(retry);
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requests[1]).toEqual(requests[0]);
    const recovered = parseSmartSession(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
    )!;
    expect(recovered.frozen).toEqual(failed.frozen);
    expect(recovered.selection).toEqual(selection);
    expect(recovered.generationAttempts).toHaveLength(2);
    expect(recovered.pack!.approved).toHaveLength(10);
    expect(recovered.stage).toBe("questions");
    expect(
      screen.getByRole("button", { name: "Jalankan audit" }),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Coba siapkan pertanyaan" }),
    ).toBeNull();
    expect(
      screen.queryByText(
        "Mencoba lagi mengirim permintaan baru dan dapat menambah biaya penggunaan AI.",
      ),
    ).toBeNull();
  });

  it.each([
    [true, true, null, "responded"],
    [false, false, 0, "responded"],
    [false, true, null, "responded"],
    [true, false, 0, "responded"],
    [true, true, null, "interrupted"],
    [false, false, null, "interrupted"],
  ] as const)(
    "prospective retry notice uses current mode %s → %s with cost %s and %s (R-30)",
    async (initialLive, currentLive, cost, contact) => {
      const prepared = prepareUnderstanding({
        draft: extractionDraftSchema.parse(draft),
        typedName: "Kedai Fiksi",
        discoveredName: null,
        canonicalSource: "https://kedai-fiksi.example/",
      });
      window.localStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify({
          ...freshSmartSession(),
          savedAt: new Date().toISOString(),
          stage: "summary",
          prepared,
          selection: initialSmartSelection(prepared),
        }),
      );
      const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
        expect(String(url)).toBe("/api/audit/glm-questions");
        if (contact === "interrupted") throw new Error("mock dropped response");
        return Response.json({
          status: "failed",
          reason: "incomplete",
          detail: "mock",
          providerContact: "responded",
          cost: { billedUsd: cost, available: cost !== null },
          provenance: {
            requestId: "mock",
            method: "direct-ten",
            requestedModel: "glm-5.3-flash",
            returnedModel: "glm-5.3-flash",
            responseId: "mock",
            modelMismatch: false,
            // Deliberately unlike the current presentation: never classify history from props.
            transport: initialLive ? "synthetic-stub" : "cheaper-inference",
          },
        });
      });
      vi.stubGlobal("fetch", fetchMock);
      const notice =
        "Mencoba lagi mengirim permintaan baru dan dapat menambah biaya penggunaan AI.";
      render(<SmartIntakeJourney live={initialLive} />);
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      tickReview();
      fireEvent.click(buatPertanyaan());
      await screen.findByRole("alert");
      expect(
        screen.getByRole("button", { name: "Coba siapkan pertanyaan" }),
      ).toBeDefined();
      expect(screen.queryByText(notice) !== null).toBe(initialLive);
      const saved = window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
      const session = parseSmartSession(saved)!;
      expect(session.generationAttempts).toHaveLength(1);
      expect(session.generationAttempts[0]).toMatchObject({
        outcome: contact === "interrupted" ? "interrupted" : "failed",
        execution: contact === "interrupted" ? "unknown" : "confirmed",
        cost_usd: cost,
      });
      if (contact === "interrupted")
        expect(screen.getByRole("alert").textContent).toBe(
          initialLive
            ? "Permintaan pembuatan pertanyaan terputus. Pertanyaan mungkin sudah dibuat dan mungkin sudah dikenai biaya, tetapi tidak diterima."
            : "Permintaan pembuatan pertanyaan terputus. Pertanyaan belum diterima.",
        );
      cleanup();
      render(<SmartIntakeJourney live={currentLive} />);
      await screen.findByRole("button", { name: "Coba siapkan pertanyaan" });
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByText(notice) !== null).toBe(currentLive);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBe(saved);
      expect(saved).not.toMatch(
        /diagnostics|instructionVersion|finishReason|prompt_tokens/,
      );
    },
  );

  it("demonstrates the existing live/synthetic failed-attempt persistence collision (R-30 fence dependency)", async () => {
    const seededAt = new Date().toISOString(); // before the date is mocked
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue(
      "2026-10-04T00:00:00.000Z",
    );
    const prepared = prepareUnderstanding({
      draft: extractionDraftSchema.parse(draft),
      typedName: "Kedai Fiksi",
      discoveredName: null,
      canonicalSource: "https://kedai-fiksi.example/",
    });
    const seed = {
      ...freshSmartSession(),
      savedAt: seededAt,
      stage: "summary",
      prepared,
      selection: initialSmartSelection(prepared),
    };
    const snapshots: unknown[] = [];
    for (const transport of ["synthetic-stub", "cheaper-inference"]) {
      cleanup();
      window.sessionStorage.clear();
      window.sessionStorage.setItem(TEST_PASS_STORAGE_KEY, "test-code");
      window.localStorage.clear();
      window.localStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify(seed),
      );
      vi.stubGlobal("fetch", async (url: RequestInfo | URL) => {
        expect(String(url)).toBe("/api/audit/glm-questions");
        return Response.json({
          status: "failed",
          reason: "incomplete",
          detail: "mock",
          providerContact: "responded",
          cost: { billedUsd: null, available: false },
          provenance: {
            requestId: "mock",
            method: "direct-ten",
            requestedModel: "glm-5.3-flash",
            returnedModel: "glm-5.3-flash",
            responseId: "mock",
            modelMismatch: false,
            transport,
          },
        });
      });
      render(<SmartIntakeJourney live={true} />);
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      tickReview();
      fireEvent.click(buatPertanyaan());
      await screen.findByRole("alert");
      snapshots.push(
        JSON.parse(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!),
      );
    }
    expect(snapshots[0]).toEqual(snapshots[1]);
  });
  it("uses one explicit inspection and one confirmation to reach ten questions with exact v2 context", async () => {
    const requests: { url: string; body: Record<string, unknown> | null }[] =
      [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({
          url,
          body: init?.body
            ? (JSON.parse(String(init.body)) as Record<string, unknown>)
            : null,
        });
        if (url.startsWith("/api/audit/identity"))
          return Response.json({
            canonical_url: "https://kedai-fiksi.example/",
            display_name: "Kedai Fiksi",
            preparation_mode: "synthetic-local",
          });
        if (url === "/api/orders")
          return Response.json({ order_id: ORDER_ID, state: "open" });
        if (url === "/api/audit/extract")
          return Response.json({
            draft,
            telemetry: [],
            preparation_mode: "synthetic-local",
          });
        if (url === "/api/audit/glm-questions")
          return Response.json({
            status: "ok",
            questions: Array.from(
              { length: 10 },
              (_, index) =>
                `Pilihan kedai kopi apa di Bandung untuk kebutuhan ${index + 1}?`,
            ),
            provenance: {
              requestId: "fictional",
              method: "direct-ten",
              requestedModel: "synthetic",
              returnedModel: "synthetic",
              responseId: "fictional-response",
              modelMismatch: false,
              transport: "synthetic-stub",
            },
            cost: { billedUsd: null, available: false },
          });
        throw new Error(`Unexpected request ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SmartIntakeJourney live={false} />);
    // J01: the website is the only thing typed; the name comes from the site.
    fireEvent.change(
      await screen.findByRole("textbox", {
        name: "Website atau akun Instagram bisnis",
      }),
      { target: { value: "https://kedai-fiksi.example/" } },
    );
    const inspect = screen.getByRole("button", {
      name: "Cek bisnis saya di AI",
    });
    fireEvent.click(inspect);
    fireEvent.click(inspect);
    await throughBrand();
    // Spec 016 R-01/AC-01: the free lookup, then the order, and only then the
    // paid reading, which carries only the order id.
    expect(requests.map((item) => item.url)).toEqual([
      "/api/audit/identity?source=https%3A%2F%2Fkedai-fiksi.example%2F",
      "/api/orders",
      "/api/audit/extract",
    ]);
    expect(requests[1]!.body).toEqual({
      email: "pemilik@example.com",
      business_name: "Kedai Fiksi",
      website: "https://kedai-fiksi.example/",
      test_pass_code: "test-code",
    });
    expect(requests[2]!.body).toEqual({ order_id: ORDER_ID });
    // The review reads the focus back; Nuave's own proposal stays marked as
    // such in the session (the screens show "Saran Nuave").
    expect(fact("Fokus audit").textContent).toBe("Seluruh brand");
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))!
        .selection!.origins.focus,
    ).toBe("nuave");
    tickReview();
    const confirm = buatPertanyaan();
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(
      await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" }),
    ).toBeTruthy();
    // Spec 018 R-15: discovery runs in its own request, just before the
    // questions, for the same order and the same confirmed intake.
    expect(requests).toHaveLength(5);
    expect(requests[3]!.url).toBe("/api/audit/discovery");
    expect(requests[3]!.body).toEqual({
      order_id: ORDER_ID,
      intake: requests[4]!.body!.intake,
    });
    const sent = requests[4]!.body!;
    expect(sent.order_id).toBe(ORDER_ID);
    expect(sent).not.toHaveProperty("brief");
    expect(sent.intake).toMatchObject({
      version: "nuave-local-intake-input-v2",
      context: {
        category: { value: "kedai kopi", origin: "website" },
        market: {
          value: { reach: "sekitar", areas: ["Bandung"] },
          origin: "website",
        },
        comparators: { value: { mode: "unknown" } },
      },
    });
    expect(
      screen.getAllByRole("button", { name: /Ubah pertanyaan/ }),
    ).toHaveLength(10);
    expect(
      JSON.parse(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}"),
    ).toMatchObject({ version: 9, stage: "questions" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
  });

  it("holds a literal started v1 pair without changing its bytes or calling a provider", async () => {
    window.sessionStorage.setItem(
      LOCAL_INTAKE_STORAGE_KEY,
      historicalPair.intake,
    );
    window.sessionStorage.setItem(
      LOCAL_AUDIT_STORAGE_KEY,
      historicalPair.audit,
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SmartIntakeJourney live={false} />);
    expect(
      await screen.findByRole("heading", {
        name: "Audit lama tersimpan di sesi ini",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Unduh|Lanjutkan audit|Coba lagi/ }),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(LOCAL_INTAKE_STORAGE_KEY)).toBe(
      historicalPair.intake,
    );
    expect(window.sessionStorage.getItem(LOCAL_AUDIT_STORAGE_KEY)).toBe(
      historicalPair.audit,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mulai audit baru" }));
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    expect(window.sessionStorage.getItem(LOCAL_AUDIT_STORAGE_KEY)).toBe(
      historicalPair.audit,
    );
  });
});

const ORDER_ID = "0123456789abcdef0123456789abcdef";

const questionsResponse = () =>
  Response.json({
    status: "ok",
    questions: Array.from(
      { length: 10 },
      (_, index) => `Pertanyaan fiksi nomor ${index + 1}?`,
    ),
    provenance: {
      requestId: "fictional",
      method: "direct-ten",
      requestedModel: "synthetic",
      returnedModel: "synthetic",
      responseId: "fictional-response",
      modelMismatch: false,
      transport: "synthetic-stub",
    },
    cost: { billedUsd: null, available: false },
  });

function stubPreparation(
  options: {
    holdIdentity?: Promise<void>;
    holdExtract?: Promise<void>;
    draft?: Record<string, unknown>;
  } = {},
) {
  const calls: string[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url.startsWith("/api/audit/identity") ? "identity" : url);
    if (url.startsWith("/api/audit/identity")) {
      if (options.holdIdentity) await options.holdIdentity;
      return Response.json({
        canonical_url: "https://kedai-fiksi.example/",
        display_name: "Kedai Fiksi",
        preparation_mode: "synthetic-local",
      });
    }
    if (url === "/api/orders")
      return Response.json({ order_id: ORDER_ID, state: "open" });
    if (url === "/api/orders/status")
      return Response.json({
        state: "open",
        payment: { state: "not_required" },
        completed: 0,
        total: 10,
        questions: [],
      });
    if (url === "/api/audit/extract") {
      if (options.holdExtract) await options.holdExtract;
      return Response.json({
        draft: options.draft ?? draft,
        telemetry: [],
        preparation_mode: "synthetic-local",
      });
    }
    if (url === "/api/audit/glm-questions") return questionsResponse();
    throw new Error(`Unexpected request ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

/** J01: the website is the only thing typed; the name is read from the site. */
async function fillAndPeriksa(source = "https://kedai-fiksi.example/") {
  fireEvent.change(
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    }),
    { target: { value: source } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
  );
}

const websiteField = () =>
  screen.getByRole("textbox", {
    name: "Website atau akun Instagram bisnis",
  }) as HTMLInputElement;

describe("Spec 013 J2 screen frame", () => {
  it("focuses the entry heading on arrival and keeps entry free of flow chrome", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    const heading = await screen.findByRole("heading", {
      name: "Bisnis Anda disebut AI?",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    // J01 carries no step progress and no Kembali/Lanjut nav.
    expect(screen.queryByRole("img", { name: /Langkah / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lanjut" })).toBeNull();
  });

  it("shows the free lookup, then the brand check, the order screen and the labelled paid reading in turn", async () => {
    let releaseLookup!: () => void;
    const holdIdentity = new Promise<void>(
      (resolve) => (releaseLookup = resolve),
    );
    let release!: () => void;
    const holdExtract = new Promise<void>((resolve) => (release = resolve));
    const { calls } = stubPreparation({ holdIdentity, holdExtract });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    // J02: the free lookup. No AI reading, and no order yet.
    const lookup = await screen.findByRole("region", {
      name: "Pemeriksaan bisnis",
    });
    expect(lookup.getAttribute("data-intake-screen")).toBe("reading");
    expect(
      screen.getByRole("heading", { name: "Sebentar, kami cari bisnis Anda" }),
    ).toBeTruthy();
    expect(screen.queryByText("Nuave sedang membaca website Anda")).toBeNull();
    // Nothing moves forward while the check runs: the forward action waits,
    // disabled; only the ways back (which cancel the check) and help work.
    expect(
      (
        screen.getByRole("button", {
          name: "Ya, ini bisnis saya",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      screen
        .getAllByRole("button")
        .filter((button) => !(button as HTMLButtonElement).disabled)
        .map(
          (button) => button.getAttribute("aria-label") ?? button.textContent,
        ),
    ).toEqual(["Halaman sebelumnya", "Bantuan", "Kembali"]);
    releaseLookup();
    // J05: only what the free lookup found. Still no paid call.
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    expect(calls).toEqual(["identity"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Ya, ini bisnis saya" }),
    );
    // J06, then J07: the order, with an email field. A test pass has no
    // price and no payment.
    await screen.findByRole("heading", { name: "Tinggal 3 langkah" });
    fireEvent.click(
      screen.getByRole("button", { name: "Lanjut ke pembayaran" }),
    );
    await screen.findByRole("heading", { name: "Konfirmasi dan bayar" });
    expect(calls).toEqual(["identity"]);
    expect(screen.getByRole("textbox", { name: /Email/ })).toBeTruthy();
    expect(screen.queryByText(/Rp|IDR|USD/i)).toBeNull();
    // A missing or bad email makes no order.
    lanjut();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "alamat email yang valid",
    );
    expect(calls).toEqual(["identity"]);
    await passOrder();
    // J09: the paid reading, under the order, starts by itself.
    const reading = await screen.findByRole("region", {
      name: "Pembacaan website",
    });
    expect(reading.getAttribute("data-intake-screen")).toBe("reading");
    expect(
      screen.getByRole("heading", {
        name: "Nuave sedang membaca website Anda",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Pembayaran diterima")).toBeTruthy();
    expect(screen.getByText("Yang sudah kami temukan")).toBeTruthy();
    // Spec 013 R-07: synthetic mode stays visibly labelled while it reads.
    const labelledWhileReading =
      screen.queryByText(
        "Mode uji lokal menggunakan pengganti sintetis berlabel.",
      ) !== null;
    // No navigation or submit affordance while the read is in flight.
    expect(screen.queryByRole("button")).toBeNull();
    release();
    // The journey moves on by itself to the Step 2 cover.
    await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
    expect(calls).toEqual(["identity", "/api/orders", "/api/audit/extract"]);
    expect(
      labelledWhileReading,
      "R-07: the paid reading shows the synthetic-mode label",
    ).toBe(true);
  });

  it("brand check shows typed name and website, corrects inline, and keeps sensitive text out", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    const card = await screen.findByRole("article", {
      name: "Bisnis yang ditemukan",
    });
    // J05: the name read from the website, and its address.
    expect(card.textContent).toContain("Kedai Fiksi");
    expect(card.textContent).toContain("kedai-fiksi.example");
    // Step progress marks step 1 of 3 on the brand check.
    expect(screen.getByRole("img", { name: "Langkah 1 dari 3" })).toBeTruthy();
    // J05b: the name is corrected in the "Nama bisnis" sheet.
    await renameBusiness("Kedai Fiksi Baru");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(card.textContent).toContain("Kedai Fiksi Baru");
    const sheet = await renameBusiness("nomor rekening 12345");
    // The refused name keeps the sheet open, and nothing sensitive is kept.
    expect(screen.getByRole("dialog", { name: "Nama bisnis" })).toBe(sheet);
    expect(card.textContent).toContain("Kedai Fiksi Baru");
    expect(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
    // The owner is told why while the sheet is still open.
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
  });

  it("Kembali on the brand check returns to a filled entry; the same source adds no call", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    const source = (await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    })) as HTMLInputElement;
    expect(source.value).toBe("https://kedai-fiksi.example/");
    fireEvent.click(
      screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
    );
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    expect(
      screen.getByRole("article", { name: "Bisnis yang ditemukan" })
        .textContent,
    ).toContain("Kedai Fiksi");
    expect(calls).toEqual(["identity"]);
  });

  it("a marked browser Back walks the flow one screen at a time and ignores foreign entries", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    // review → review cover → differentiator → competitors → market →
    // service → customer needs → target customer → offerings → category →
    // focus → business cover → brand → entry via marked pops.
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Periksa, lalu jalankan audit",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Apa yang membuat bisnis Anda berbeda?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", { name: COMPETITORS_HEADING });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Siapa yang biasanya mencari bisnis Anda?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    fireEvent.popState(window, { state: { otherNavigation: true } });
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
  });

  it("a reload during the free lookup restores a filled entry with the interruption note and no replay", async () => {
    let release!: () => void;
    const holdIdentity = new Promise<void>((resolve) => (release = resolve));
    const { fetchMock } = stubPreparation({ holdIdentity });
    const first = render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await waitFor(() =>
      expect(
        JSON.parse(
          window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
        ).stage,
      ).toBe("reading"),
    );
    const callsSoFar = fetchMock.mock.calls.length;
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    const source = (await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    })) as HTMLInputElement;
    expect(source.value).toBe("https://kedai-fiksi.example/");
    expect(
      screen.getByText(
        "Pemeriksaan website sebelumnya terputus. Tekan Cek bisnis saya di AI untuk mencoba lagi.",
      ),
    ).toBeTruthy();
    // The interrupted read is never replayed on its own.
    expect(fetchMock).toHaveBeenCalledTimes(callsSoFar);
    release();
  });

  it("a reload during the paid reading returns to the order screen on the same order, with no replay and no new order", async () => {
    let release!: () => void;
    const holdExtract = new Promise<void>((resolve) => (release = resolve));
    const { fetchMock, calls } = stubPreparation({ holdExtract });
    const first = render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await toOrder();
    await passOrder();
    await screen.findByRole("heading", {
      name: "Nuave sedang membaca website Anda",
    });
    const callsSoFar = fetchMock.mock.calls.length;
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", { name: "Konfirmasi dan bayar" });
    expect(
      screen.getByText(
        "Pembacaan website sebelumnya terputus. Isian Anda tetap tersimpan. Tekan Lanjut untuk membaca ulang.",
      ),
    ).toBeTruthy();
    // The saved order is kept: no email field, and the email is not stored.
    expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull();
    expect(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("pemilik@example.com");
    // The interrupted read is never replayed on its own: the only new request
    // is the status check of the saved order.
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledTimes(callsSoFar + 1),
    );
    expect(calls.at(-1)).toBe("/api/orders/status");
    release();
    // J09: an interrupted reading does not restart by itself, even once the
    // status check has told the page that no payment is needed; it waits
    // for the owner's own Lanjut.
    await screen.findByRole("button", { name: "Lanjut" });
    await expect(
      screen.findByRole(
        "heading",
        { name: "Nuave sedang membaca website Anda" },
        { timeout: 200 },
      ),
    ).rejects.toThrow();
    expect(calls.filter((call) => call === "/api/audit/extract")).toHaveLength(
      1,
    );
    // An explicit Lanjut reads again under the SAME order.
    lanjut();
    await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
    expect(calls.filter((call) => call === "/api/orders")).toHaveLength(1);
    expect(calls.filter((call) => call === "/api/audit/extract")).toHaveLength(
      2,
    );
  });

  it("a stored pre-bump session restarts safely at an empty entry", async () => {
    window.sessionStorage.setItem(
      "nuave.localIntake.v3",
      JSON.stringify({
        version: 3,
        stage: "summary",
        entry: { name: "Kedai Lama", source: "https://lama.example/" },
        identity: null,
        prepared: {},
        selection: {},
        confirmedSelection: null,
        frozen: null,
        pack: null,
        preparationCalls: [],
        preparationMode: null,
        generationAttempts: [],
      }),
    );
    // A stale version under the current key is rejected the same way.
    window.localStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({ version: 5, stage: "entry" }),
    );
    // A v8 record under its own key is simply never read (JQ bumped to v9).
    window.sessionStorage.setItem(
      "nuave.localIntake.v8",
      JSON.stringify({ version: 8, stage: "summary" }),
    );
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    const source = (await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    })) as HTMLInputElement;
    expect(source.value).toBe("");
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)),
    ).toBeNull();
  });

  it("a corrupt stored selection at a later stage restarts at entry instead of crashing", async () => {
    window.localStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({
        version: 9,
        stage: "brand",
        entry: { name: "Kedai Lama", source: "https://lama.example/" },
        identity: null,
        prepared: {},
        selection: {},
        confirmedSelection: null,
        frozen: null,
        pack: null,
        preparationCalls: [],
        preparationMode: null,
        generationAttempts: [],
      }),
    );
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)),
    ).toBeNull();
  });

  // J7/R-26: a v9 record carries a valid "Nama lain" list and the retained
  // JQ prepared meanings on the working selection and the last confirmed
  // selection; anything else restarts.
  const storedPrepared = {
    typedName: "Kedai Lama",
    discoveredName: null,
    canonicalSource: "https://lama.example/",
    aliases: ["Kedai Lama Pusat"],
    locations: { proposed: [], origin: "website" },
    categorySuggestions: { proposed: [], origin: "nuave" },
    offeringCategorySuggestions: { proposed: [], origin: "nuave" },
    targetCustomer: { proposed: null, origin: "nuave" },
    decisionConsiderations: { proposed: [], origin: "nuave" },
    differentiator: { proposed: null, origin: "nuave" },
    sourceLinks: [],
  };
  const storedSelection = {
    name: "Kedai Lama",
    nameOrigin: "owner",
    aliases: ["Kedai Lama Pusat"],
    focus: "brand",
    productTarget: "",
    locationName: "",
    locationAddress: "",
    category: "kedai kopi",
    categoryKind: "main",
    offerings: ["kopi"],
    serviceChannels: ["on_premise"],
    marketReach: "sekitar",
    marketAreas: ["Bandung"],
    retainedBrandReach: "sekitar",
    retainedBrandAreas: ["Bandung"],
    targetCustomer: "",
    customerNeeds: [],
    decisionConsiderations: [],
    comparatorMode: "unknown",
    comparatorNames: [],
    differentiator: "",
    publicFact: "",
    origins: { aliases: "website" },
  };
  const storedSession = (overrides: Record<string, unknown> = {}) => ({
    version: 9,
    savedAt: new Date().toISOString(),
    stage: "summary",
    entry: { name: "Kedai Lama", source: "https://lama.example/" },
    identity: null,
    prepared: storedPrepared,
    selection: storedSelection,
    confirmedSelection: null,
    frozen: null,
    pack: null,
    preparationCalls: [],
    preparationMode: "synthetic-local",
    generationAttempts: [],
    ...overrides,
  });

  it.each<[string, unknown]>([
    ["a missing list", { aliases: undefined }],
    ["a non-array", { aliases: "Kedai Lama" }],
    ["a blank entry", { aliases: ["  "] }],
    ["a non-string entry", { aliases: [42] }],
    ["an overlong entry", { aliases: ["x".repeat(161)] }],
    ["a trimmed duplicate", { aliases: ["Sama", " sama "] }],
    [
      "a thirteenth entry",
      { aliases: Array.from({ length: 13 }, (_, i) => `Alias ${i + 1}`) },
    ],
  ])(
    "a stored session with %s in selection.aliases restarts at entry",
    async (_label, patch) => {
      window.localStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify(
          storedSession({
            selection: {
              ...storedSelection,
              ...(patch as Record<string, unknown>),
            },
          }),
        ),
      );
      render(<SmartIntakeJourney live={false} />);
      await screen.findByRole("textbox", {
        name: "Website atau akun Instagram bisnis",
      });
      expect(
        parseSmartSession(
          window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
        ),
      ).toBeNull();
    },
  );

  it("rejects a malformed confirmedSelection alias list the same way", () => {
    window.localStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify(
        storedSession({
          confirmedSelection: { ...storedSelection, aliases: "bukan array" },
        }),
      ),
    );
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)),
    ).toBeNull();
  });

  it("restores a valid v9 review and its stored aliases without a call", async () => {
    const { fetchMock } = stubPreparation();
    window.localStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify(storedSession()),
    );
    render(<SmartIntakeJourney live={false} />);
    const heading = await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(
      document
        .querySelector('[data-intake-screen="review"]')
        ?.getAttribute("data-smart-summary"),
    ).toBe("ready");
    // The stored aliases are read back with the name, still from the website.
    expect(fact("Nama").textContent).toContain(
      "Juga disebut: Kedai Lama Pusat",
    );
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))!
        .selection!.origins.aliases,
    ).toBe("website");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a name-only edit at entry keeps later answers and spends no call", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    // J26: a category typed in the Bisnis sheet is the owner's own answer.
    let sheet = await openSheet("Bisnis");
    fireEvent.click(within(sheet).getByRole("button", { name: "Lainnya" }));
    addThrough("Kategori lain", "kafe fiksi");
    await closeSheet(sheet, "Simpan");
    expect(fact("Disebut sebagai").textContent).toBe("kafe fiksi");
    // J7: the review keeps a separate website action; the same website,
    // checked again, reuses preparation and returns through the brand check,
    // where the name alone is corrected.
    sheet = await openSheet("Bisnis");
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Ganti website" }),
    );
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    expect(websiteField().value).toBe("https://kedai-fiksi.example/");
    fireEvent.click(
      screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
    );
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    await renameBusiness("Kedai Fiksi Baru");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(calls).toEqual(["identity", "/api/orders", "/api/audit/extract"]);
    lanjut();
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    expect(fact("Disebut sebagai").textContent).toBe("kafe fiksi");
    expect(
      screen.getByRole("region", { name: "Bisnis" }).textContent,
    ).toContain("Kedai Fiksi Baru");
  });

  it("re-offers the website's discovered name when a name-only edit makes it differ", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    const card = await screen.findByRole("article", {
      name: "Bisnis yang ditemukan",
    });
    // J05: one name, read from the website; there is no typed name to pick
    // against, so no name options.
    expect(screen.queryByRole("radio")).toBeNull();
    expect(card.textContent).toContain("Kedai Fiksi");
    await renameBusiness("Kedai Fiksi Baru");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(card.textContent).toContain("Kedai Fiksi Baru");
    // The owner's name is used; the website's own name is kept beside it.
    const renamed = parseSmartSession(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
    )!;
    expect(renamed.brand).toEqual({
      name: "Kedai Fiksi Baru",
      origin: "owner",
    });
    expect(renamed.identity!.displayName).toBe("Kedai Fiksi");
    // The name-only path back through the entry spends no new call.
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
    );
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    expect(
      screen.getByRole("article", { name: "Bisnis yang ditemukan" })
        .textContent,
    ).toContain("Kedai Fiksi Baru");
    expect(calls).toEqual(["identity"]);
    // After the paid reading the website's name stays on record next to the
    // owner's, never silently dropped.
    await toOrder();
    await passOrder();
    await startStepTwo();
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))!
        .prepared,
    ).toMatchObject({
      typedName: "Kedai Fiksi Baru",
      discoveredName: "Kedai Fiksi",
    });
  });

  it("merges the website option when a name-only edit lands on the discovered name", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    await renameBusiness("Kopi X");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByRole("article", { name: "Bisnis yang ditemukan" })
        .textContent,
    ).toContain("Kopi X");
    // Back on the website's own name, the two names are one again.
    await renameBusiness("Kedai Fiksi");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("radio")).toBeNull();
    // The review must not show a duplicated name either — the row is
    // read-back only (J7), so the merged name appears once as text.
    await toOrder();
    await passOrder();
    await startStepTwo();
    lanjut();
    await throughDetails();
    const business = within(screen.getByRole("region", { name: "Bisnis" }));
    expect(business.queryByRole("radio")).toBeNull();
    expect(business.getByText("Kedai Fiksi")).toBeTruthy();
    expect(fact("Nama").textContent).toBe("Kedai Fiksi");
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))!
        .prepared!.discoveredName,
    ).toBeNull();
  });

  it("moves focus to the question-review heading when the pack lands", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    tickReview();
    fireEvent.click(buatPertanyaan());
    const heading = await screen.findByRole("heading", {
      name: "10 pertanyaan untuk AI",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });
});

const j4Draft = {
  ...draft,
  published_locations: [
    {
      name: "Kedai Fiksi Dago",
      address: "Jl. Fiksi Raya No. 10, Bandung",
      source_url: "https://kedai-fiksi.example/lokasi",
    },
    {
      name: "Kedai Fiksi Cimahi",
      address: "Jl. Contoh Fiksi No. 2, Cimahi",
      source_url: "https://www.kedai-fiksi.example/lokasi",
    },
  ],
};

async function toFocusScreen() {
  await fillAndPeriksa();
  await toOrder();
  await passOrder();
  await startStepTwo();
}

/**
 * J11 by keyboard: an arrow key only selects a focus card (Lanjut then opens
 * its list), like the old pick-then-Lanjut. A tap opens the list at once; that
 * is checked on its own in the focus-card test.
 */
async function selectFocus(card: RegExp) {
  const radios = within(
    screen.getByRole("radiogroup", { name: "Fokus audit" }),
  ).getAllByRole("radio");
  const index = radios.findIndex((radio) => card.test(radio.textContent ?? ""));
  const target = radios[index]!;
  if (target.getAttribute("aria-checked") === "true") return;
  const from = radios[index === 0 ? 1 : index - 1]!;
  // Focus first, so the group knows where the arrow key starts from.
  act(() => from.focus());
  fireEvent.keyDown(from, { key: index === 0 ? "ArrowUp" : "ArrowDown" });
  await waitFor(() => expect(target.getAttribute("aria-checked")).toBe("true"));
}

/** J11 itself (the J12 list screens repeat its heading). */
const focusScreen = () =>
  screen.findByRole("radiogroup", { name: "Fokus audit" });

/** J26: "Ganti fokus audit" in the Bisnis sheet opens the focus screen as a
 * detour that returns to the review. */
async function editFocus() {
  const sheet = await openSheet("Bisnis");
  fireEvent.click(
    within(sheet).getByRole("button", { name: "Ganti fokus audit" }),
  );
  await focusScreen();
}

/** J12b: a branch the owner adds in the "Tambah cabang" sheet. */
async function addBranch(name: string, address: string) {
  fireEvent.click(screen.getByRole("button", { name: "Tambah cabang" }));
  const sheet = await screen.findByRole("dialog", { name: "Tambah cabang" });
  fireEvent.change(
    within(sheet).getByRole("textbox", { name: "Nama cabang" }),
    { target: { value: name } },
  );
  fireEvent.change(
    within(sheet).getByRole("textbox", { name: "Alamat cabang" }),
    { target: { value: address } },
  );
  await closeSheet(sheet, "Simpan");
}

/** J12b: a product the owner adds in the "Tambah produk" sheet. */
async function addProduct(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Tambah produk" }));
  const sheet = await screen.findByRole("dialog", { name: "Tambah produk" });
  fireEvent.change(
    within(sheet).getByRole("textbox", { name: "Nama produk atau layanan" }),
    { target: { value: name } },
  );
  await closeSheet(sheet, "Simpan");
}

const lanjutButton = () =>
  screen.getByRole("button", { name: "Lanjut" }) as HTMLButtonElement;

// Types one character at a time — bulk fireEvent.change skips the
// intermediate values a real keystroke sequence passes through.
const typeChars = (input: HTMLInputElement, text: string) => {
  for (const ch of text) {
    fireEvent.change(input, { target: { value: input.value + ch } });
  }
};

describe("Spec 013 J4 focus and target screens", () => {
  it("offers the three focus cards with the Nuave label on whole brand, then lands on the summary", async () => {
    const { calls } = stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    const whole = screen.getByRole("radio", { name: /Seluruh brand/ });
    expect(whole.getAttribute("aria-checked")).toBe("true");
    // Nuave's proposal is labelled once, on the screen.
    expect(screen.getByText("Saran Nuave")).toBeTruthy();
    expect(screen.getByText("sudah dipilih. Ganti jika perlu.")).toBeTruthy();
    expect(
      screen
        .getByRole("radio", { name: /Satu cabang/ })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(screen.getByRole("radio", { name: /Satu produk/ })).toBeTruthy();
    // Step progress marks Step 2 of 3 on the focus screen.
    expect(screen.getByRole("img", { name: "Langkah 2 dari 3" })).toBeTruthy();
    lanjut();
    await throughDetails();
    expect(fact("Fokus audit").textContent).toBe("Seluruh brand");
    // Screen navigation spends no extra preparation call.
    expect(calls).toEqual(["identity", "/api/orders", "/api/audit/extract"]);
    // J11: tapping "Satu cabang" or "Satu produk" opens its list at once.
    await editFocus();
    fireEvent.click(screen.getByRole("radio", { name: /Satu cabang/ }));
    await screen.findByRole("heading", { name: "Cabang mana?" });
    kembali();
    await focusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu produk/ }));
    await screen.findByRole("heading", { name: "Produk mana?" });
  });

  it("the location screen lists host-screened published rows and blocks Lanjut until complete", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    // Nothing is picked yet: Lanjut waits.
    expect(lanjutButton().disabled).toBe(true);
    const dago = screen.getByRole("radio", { name: /Kedai Fiksi Dago/ });
    const cimahi = screen.getByRole("radio", { name: /Kedai Fiksi Cimahi/ });
    expect(dago.textContent).toContain("Jl. Fiksi Raya No. 10, Bandung");
    // A www.-equivalent page still counts as published by the business; the
    // screen says once that the rows come from the website.
    expect(cimahi.textContent).toContain("Jl. Contoh Fiksi No. 2, Cimahi");
    expect(screen.getAllByText("Ditemukan di website")).toHaveLength(1);
    fireEvent.click(cimahi);
    expect(cimahi.getAttribute("aria-checked")).toBe("true");
    expect(lanjutButton().disabled).toBe(false);
    lanjut();
    await throughDetails("cabang");
    expect(fact("Fokus audit").textContent).toContain(
      "Satu cabang: Kedai Fiksi Cimahi",
    );
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection).toMatchObject({
      focus: "cabang",
      locationName: "Kedai Fiksi Cimahi",
      locationAddress: "Jl. Contoh Fiksi No. 2, Cimahi",
    });
    expect(saved.selection.origins.focus).toBe("owner");
  });

  it("blocks Lanjut on a manual location until name and address are both filled", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    const forward = lanjutButton();
    expect(forward).toHaveProperty("disabled", true);
    // J12b: an added branch needs both its name and its address.
    fireEvent.click(screen.getByRole("button", { name: "Tambah cabang" }));
    const sheet = await screen.findByRole("dialog", { name: "Tambah cabang" });
    const save = sheetSave(sheet);
    expect(save).toHaveProperty("disabled", true);
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: "Nama cabang" }),
      { target: { value: "Gerai Fiksi" } },
    );
    expect(save).toHaveProperty("disabled", true);
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: "Alamat cabang" }),
      { target: { value: "Jl. Fiksi 40, Bandung" } },
    );
    expect(save).toHaveProperty("disabled", false);
    expect(forward).toHaveProperty("disabled", true);
    await closeSheet(sheet, "Simpan");
    expect(forward).toHaveProperty("disabled", false);
    // The completed manual entry shows as its own owner-labelled choice.
    const manual = screen.getByRole("radio", { name: /Gerai Fiksi/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Dari Anda");
  });

  it("the product screen lists offerings and accepts a typed target", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu produk/);
    lanjut();
    await screen.findByRole("heading", { name: "Produk mana?" });
    const forward = lanjutButton();
    expect(forward).toHaveProperty("disabled", true);
    const roti = screen.getByRole("radio", { name: /roti/ });
    // The offerings come from the website, said once on the screen.
    expect(screen.getAllByText("Ditemukan di website")).toHaveLength(1);
    fireEvent.click(roti);
    expect(roti.getAttribute("aria-checked")).toBe("true");
    // A typed replacement becomes the owner's answer.
    await addProduct("paket rapat");
    const manual = screen.getByRole("radio", { name: /paket rapat/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Dari Anda");
    expect(roti.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(forward);
    await throughDetails("produk");
    expect(fact("Fokus audit").textContent).toContain("paket rapat");
  });

  it("offers the manual location link when no usable published location exists", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    // The branch card is offered even with no published location.
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    // With no published list the screen says so and offers the add sheet.
    expect(screen.queryByRole("radio")).toBeNull();
    expect(
      screen.getByText(
        "Kami belum menemukan cabang di website Anda. Tambahkan cabang yang ingin diaudit.",
      ),
    ).toBeTruthy();
    await addBranch("Gerai Satu", "Jl. Fiksi 1");
    lanjut();
    await throughDetails("cabang");
    expect(fact("Fokus audit").textContent).toContain("Gerai Satu");
  });

  it("keeps a summary-opened focus edit returning to the summary", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    await editFocus();
    // In-flow Kembali returns to the review this edit came from.
    kembali();
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
  });

  it("walks back through the target screens one stage at a time", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    // location → focus → business cover → brand via in-flow Kembali.
    kembali();
    await focusScreen();
    expect(
      screen
        .getByRole("radio", { name: /Satu cabang/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    kembali();
    await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
    kembali();
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    // A location focus steps back through the customer screens but skips
    // market.
    lanjut();
    await startStepTwo();
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    lanjut();
    await throughDetails("cabang");
    // The review has no Kembali of its own (its bar holds the one forward
    // action); a marked browser Back steps to its cover.
    expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Periksa, lalu jalankan audit",
    });
    kembali();
    await screen.findByRole("heading", {
      name: "Apa yang membuat bisnis Anda berbeda?",
    });
    kembali();
    await screen.findByRole("heading", { name: COMPETITORS_HEADING });
    kembali();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    kembali();
    await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    kembali();
    await screen.findByRole("heading", {
      name: "Siapa yang biasanya mencari bisnis Anda?",
    });
  });

  it("restores the location stage and its answers after a reload", async () => {
    stubPreparation({ draft: j4Draft });
    const first = render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    await addBranch("Gerai Reload", "Jl. Muat Ulang 7");
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", { name: "Cabang mana?" });
    const manual = screen.getByRole("radio", { name: /Gerai Reload/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Jl. Muat Ulang 7");
    expect(manual.textContent).toContain("Dari Anda");
  });

  it("clears an incompatible target when the focus changes (R-05)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    lanjut();
    await throughDetails("cabang");
    // Re-open focus from the review and switch to product: the location
    // target no longer applies.
    await editFocus();
    await selectFocus(/Satu produk/);
    lanjut();
    await screen.findByRole("heading", { name: "Produk mana?" });
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.locationName).toBe("");
    expect(saved.selection.locationAddress).toBe("");
    expect(saved.selection.productTarget).toBe("");
  });

  it("keeps sensitive manual target text out of the selection", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu produk/);
    lanjut();
    await screen.findByRole("heading", { name: "Produk mana?" });
    fireEvent.click(screen.getByRole("button", { name: "Tambah produk" }));
    const sheet = await screen.findByRole("dialog", { name: "Tambah produk" });
    const field = within(sheet).getByRole("textbox", {
      name: "Nama produk atau layanan",
    });
    fireEvent.change(field, { target: { value: "paket rapat" } });
    fireEvent.change(field, { target: { value: "nomor rekening 12345" } });
    await closeSheet(sheet, "Simpan");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
    // Nothing was taken as the target.
    expect(
      JSON.parse(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}")
        .selection.productTarget,
    ).toBe("");
  });

  it("a summary-opened focus screen exits back only with a complete target (B1)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    // Switch to a product focus, then Kembali must not reach the review —
    // it would read back a focus with no target and no field to fill one.
    await editFocus();
    await selectFocus(/Satu produk/);
    kembali();
    await screen.findByRole("heading", { name: "Produk mana?" });
    // Completing the detour's target walks the remaining chain — the
    // category checkpoint, the read-only catalogue, the customer screens —
    // and lands back on the review.
    await addProduct("paket rapat");
    lanjut();
    await throughDetails("produk");
    expect(fact("Fokus audit").textContent).toContain("paket rapat");
  });

  it("a summary-opened focus screen detours Kembali through an unready location target (B1)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    await editFocus();
    await selectFocus(/Satu cabang/);
    kembali();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    // The detour consumes the return marker: backing out of the target
    // screen resumes the ordinary focus → cover → brand chain.
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.editReturn,
    ).toBeUndefined();
    kembali();
    await focusScreen();
    kembali();
    await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
    kembali();
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
  });

  it("keeps the Satu lokasi card visible while cabang is the stored answer (B2)", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    // The branch card stays offered without any published location.
    expect(screen.getByRole("radio", { name: /Satu cabang/ })).toBeTruthy();
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    await addBranch("Gerai Satu", "Jl. Fiksi 1");
    // Back to the focus screen: the stored cabang answer stays a visible,
    // checked card even though no published locations exist (R-02).
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    await focusScreen();
    const card = screen.getByRole("radio", { name: /Satu cabang/ });
    expect(card.getAttribute("aria-checked")).toBe("true");
  });

  it("the manual location form starts empty over a published pick (M1)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tambah cabang" }));
    const sheet = await screen.findByRole("dialog", { name: "Tambah cabang" });
    const name = within(sheet).getByRole("textbox", {
      name: "Nama cabang",
    }) as HTMLInputElement;
    const address = within(sheet).getByRole("textbox", {
      name: "Alamat cabang",
    }) as HTMLInputElement;
    // A picked published row is not a draft — the sheet opens empty instead
    // of pre-filling the published values the owner is about to overwrite.
    expect(name.value).toBe("");
    expect(address.value).toBe("");
    fireEvent.change(name, { target: { value: "Gerai Baru" } });
    expect(name.value).toBe("Gerai Baru");
    expect(address.value).toBe("");
    // The sheet is a draft: the published pick stays the stored answer until
    // Simpan, which waits for both fields.
    expect(sheetSave(sheet)).toHaveProperty("disabled", true);
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.locationName).toBe("Kedai Fiksi Dago");
    expect(saved.selection.locationAddress).toBe(
      "Jl. Fiksi Raya No. 10, Bandung",
    );
    await closeSheet(sheet, "Batal");
    expect(
      screen
        .getByRole("radio", { name: /Kedai Fiksi Dago/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("keeps typed text whole across a transient match with a published offering (P2)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu produk/);
    lanjut();
    await screen.findByRole("heading", { name: "Produk mana?" });
    fireEvent.click(screen.getByRole("button", { name: "Tambah produk" }));
    const sheet = await screen.findByRole("dialog", { name: "Tambah produk" });
    const input = within(sheet).getByRole("textbox", {
      name: "Nama produk atau layanan",
    }) as HTMLInputElement;
    // "kopi susu" is a published offering — the draft must not blank when
    // the owner types through it on the way to a longer name.
    typeChars(input, "kopi susu premium");
    expect(input.value).toBe("kopi susu premium");
    await closeSheet(sheet, "Simpan");
    const manual = screen.getByRole("radio", { name: /kopi susu premium/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Dari Anda");
  });

  it("keeps the location name across a transient match with a published row (P2)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    fireEvent.click(screen.getByRole("button", { name: "Tambah cabang" }));
    const sheet = await screen.findByRole("dialog", { name: "Tambah cabang" });
    const name = within(sheet).getByRole("textbox", {
      name: "Nama cabang",
    }) as HTMLInputElement;
    const address = within(sheet).getByRole("textbox", {
      name: "Alamat cabang",
    }) as HTMLInputElement;
    typeChars(name, "Kedai Fiksi Dago");
    // Mid-typing the pair equals the published row at
    // "Jl. Fiksi Raya No. 10, Bandung" — the name must survive the match.
    typeChars(address, "Jl. Fiksi Raya No. 10, Bandung Wetan");
    expect(name.value).toBe("Kedai Fiksi Dago");
    expect(address.value).toBe("Jl. Fiksi Raya No. 10, Bandung Wetan");
    await closeSheet(sheet, "Simpan");
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.locationName).toBe("Kedai Fiksi Dago");
    expect(saved.selection.locationAddress).toBe(
      "Jl. Fiksi Raya No. 10, Bandung Wetan",
    );
  });
});

const j5Draft = {
  ...j4Draft,
  category_suggestions: ["kedai kopi", "kafe"],
  offering_category_suggestions: [
    { offering: "kopi susu", category: "minuman kopi siap tutup" },
  ],
};

const currentSelection = () =>
  parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))!
    .selection!;

describe("Spec 013 J5 business-detail screens", () => {
  it.each(["", "   "])(
    "preselects a Nuave suggestion when the main category is %j",
    async (category) => {
      stubPreparation({ draft: { ...j5Draft, category } });
      render(<SmartIntakeJourney live={false} />);
      await toFocusScreen();
      lanjut();
      await screen.findByRole("heading", {
        name: "Bisnis Anda biasanya disebut apa?",
      });
      const suggestion = screen.getByRole("radio", { name: /kedai kopi/ });
      expect(suggestion.getAttribute("aria-checked")).toBe("true");
      // The chosen word's source is said once, under the choices.
      expect(screen.getByText("Saran Nuave")).toBeTruthy();
      const session = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(session?.selection).toMatchObject({
        category: "kedai kopi",
        categoryKind: "suggestion",
        origins: { category: "nuave" },
      });
      lanjut();
      await fromOfferings();
      expect(fact("Disebut sebagai").textContent).toBe("kedai kopi");
      expect(currentSelection().origins.category).toBe("nuave");
    },
  );

  it.each([
    ["produk", /Satu produk/, "Produk mana?", /kopi susu/, /roti/],
    [
      "cabang",
      /Satu cabang/,
      "Cabang mana?",
      /Kedai Fiksi Dago/,
      /Kedai Fiksi Cimahi/,
    ],
  ] as const)(
    "keeps an existing %s target editable from the summary",
    async (focus, scope, heading, first, replacement) => {
      stubPreparation({ draft: j5Draft });
      render(<SmartIntakeJourney live={false} />);
      await toFocusScreen();
      await selectFocus(scope);
      lanjut();
      await screen.findByRole("heading", { name: heading });
      fireEvent.click(screen.getByRole("radio", { name: first }));
      lanjut();
      await throughDetails(focus);
      await editFocus();
      lanjut();
      await screen.findByRole("heading", { name: heading });
      fireEvent.click(screen.getByRole("radio", { name: replacement }));
      lanjut();
      await screen.findByRole("heading", { name: /biasanya disebut apa\?/ });
      lanjut();
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      expect(fact("Fokus audit").textContent).toMatch(replacement);
    },
  );

  it("keeps the selected category's source through overlapping suggestions and owner edits", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    const group = screen.getByRole("radiogroup", { name: "Pilihan kategori" });
    // "kedai kopi" is the website's own category (and a Nuave suggestion).
    expect(
      within(group)
        .getByRole("radio", { name: /kedai kopi/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(screen.getByText("Ditemukan di website")).toBeTruthy();
    const kafe = within(group).getByRole("radio", { name: /kafe/ });
    fireEvent.click(kafe);
    expect(kafe.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Dari Anda")).toBeTruthy();
    // Typing a word that is also a suggestion keeps the owner as its source.
    fireEvent.click(screen.getByRole("button", { name: "Lainnya" }));
    addThrough("Kategori lain", "kedai kopi");
    expect(
      within(group)
        .getByRole("radio", { name: /kedai kopi/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(screen.getByText("Dari Anda")).toBeTruthy();
    expect(screen.queryByText("Ditemukan di website")).toBeNull();
    lanjut();
    await fromOfferings();
    expect(fact("Disebut sebagai").textContent).toBe("kedai kopi");
    expect(currentSelection()).toMatchObject({
      category: "kedai kopi",
      categoryKind: "manual",
      origins: { category: "owner" },
    });
  });

  it("does not spend an area slot when an already-selected area is added again", async () => {
    const areas = [
      "Bandung",
      "Jakarta",
      "Bogor",
      "Depok",
      "Bekasi",
      "Surabaya",
      "Medan",
    ];
    stubPreparation({
      draft: { ...j5Draft, market_reach: "beberapa", market_areas: areas },
    });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    // J26: the areas are edited in the Calon pelanggan sheet.
    const sheet = await openSheet("Calon pelanggan");
    fireEvent.click(within(sheet).getByRole("button", { name: "Tambah kota" }));
    const add = (value: string) => addThrough("Kota atau area", value);
    const chosen = () =>
      within(within(sheet).getByRole("group", { name: "Area mana saja?" }))
        .getAllByRole("button", { pressed: true })
        .map((chip) => chip.textContent);
    add(" bandung ");
    add("Denpasar");
    add("DENPASAR");
    expect(chosen()).toEqual([...areas, "Denpasar"]);
    expect(screen.queryByRole("alert")).toBeNull();
    add("Semarang");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "paling banyak 8",
    );
    expect(chosen()).toEqual([...areas, "Denpasar"]);
    await closeSheet(sheet, "Simpan");
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.selection?.marketAreas,
    ).toEqual([...areas, "Denpasar"]);
    expect(fact("Area").textContent).toBe([...areas, "Denpasar"].join(", "));
  });

  it("the category screen labels Nuave suggestions and keeps the website category as its own card", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    const group = screen.getByRole("radiogroup", { name: "Pilihan kategori" });
    const radios = within(group).getAllByRole("radio");
    // "kedai kopi" is both a Nuave suggestion and the prepared website
    // category — one chip; "kafe" is the second suggestion.
    expect(radios).toHaveLength(2);
    expect(
      within(group)
        .getByRole("radio", { name: /kedai kopi/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(screen.getByText("Ditemukan di website")).toBeTruthy();
    const kafe = within(group).getByRole("radio", { name: /kafe/ });
    fireEvent.click(kafe);
    expect(kafe.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Dari Anda")).toBeTruthy();
    lanjut();
    await fromOfferings();
    expect(fact("Disebut sebagai").textContent).toBe("kafe");
    expect(currentSelection().origins.category).toBe("owner");
  });

  it("shows the website category beside Nuave suggestions when they differ", async () => {
    stubPreparation({
      draft: { ...j5Draft, category: "warung kopi" },
    });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    const group = screen.getByRole("radiogroup", { name: "Pilihan kategori" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    const main = within(group).getByRole("radio", { name: /warung kopi/ });
    expect(main.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Ditemukan di website")).toBeTruthy();
  });

  it("keeps an owner-typed category across a focus change (R-05)", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Lainnya" }));
    const input = screen.getByRole("textbox", {
      name: "Kategori lain",
    }) as HTMLInputElement;
    // Char-by-char: at "kafe" the draft transiently equals a suggestion chip;
    // typing must continue on the owner's own text.
    typeChars(input, "kafe hijau");
    expect(input.value).toBe("kafe hijau");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(
      screen
        .getByRole("radio", { name: /kafe hijau/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    lanjut();
    await fromOfferings();
    // Switch focus to a product target that carries its own suggestion: an
    // owner-entered category still wins over every suggestion (R-05).
    await editFocus();
    await selectFocus(/Satu produk/);
    lanjut();
    await screen.findByRole("heading", { name: "Produk mana?" });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    // The category checkpoint is shown because the focus changed; the typed
    // value stays selected as the owner's own chip.
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    const card = screen.getByRole("radio", { name: /kafe hijau/ });
    expect(card.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Dari Anda")).toBeTruthy();
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.category).toBe("kafe hijau");
    expect(saved.selection.categoryKind).toBe("manual");
    expect(saved.selection.origins.category).toBe("owner");
  });

  it("replaces an old-focus suggestion with the product's suggestion (R-05)", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: "Pilihan kategori" }),
      ).getByRole("radio", { name: /^kafe/ }),
    );
    lanjut();
    await fromOfferings();
    expect(fact("Disebut sebagai").textContent).toBe("kafe");
    await editFocus();
    await selectFocus(/Satu produk/);
    lanjut();
    await screen.findByRole("heading", { name: "Produk mana?" });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    // The changed focus re-resolves the category: "kafe" is not a product
    // suggestion, so the target's suggestion is pre-selected (R-05).
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    const group = screen.getByRole("radiogroup", { name: "Pilihan kategori" });
    expect(within(group).queryByRole("radio", { name: /kafe$/i })).toBeNull();
    const productSuggestion = within(group).getByRole("radio", {
      name: /minuman kopi siap tutup/,
    });
    expect(productSuggestion.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Saran Nuave")).toBeTruthy();
    lanjut();
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    expect(fact("Disebut sebagai").textContent).toBe("minuman kopi siap tutup");
  });

  it("an unchanged focus edit exits the detour straight back to the summary", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    await editFocus();
    // Nothing changed: Lanjut returns to the review without re-walking the
    // detail screens.
    lanjut();
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
  });

  it("the offerings screen keeps prepared chips labelled, adds manual items, and updates the row", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    // The website's offerings arrive selected, said once to come from it.
    expect(screen.getByText("Ditemukan di website")).toBeTruthy();
    const chips = () =>
      within(screen.getByRole("group", { name: "Produk dan layanan" }));
    expect(
      chips()
        .getByRole("button", { name: "kopi susu" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // Deselect a prepared offering, then add an owner one.
    fireEvent.click(chips().getByRole("button", { name: "roti" }));
    expect(
      chips()
        .getByRole("button", { name: "roti" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    addThrough("Produk atau layanan lain", "es teh");
    expect(
      chips()
        .getByRole("button", { name: "es teh" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // Typing a prepared name selects the existing chip instead of
    // duplicating it.
    addThrough("Produk atau layanan lain", "Kopi Susu");
    expect(chips().getAllByRole("button", { name: /kopi susu/i })).toHaveLength(
      1,
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa yang biasanya mencari bisnis Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
    await afterMarket();
    expect(fact("Menjual").textContent).toBe("kopi susu, es teh");
  });

  it("shows the catalogue read-only under a product focus (R-14)", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu produk/);
    lanjut();
    await screen.findByRole("heading", { name: "Produk mana?" });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    const catalogue = screen.getByRole("list", {
      name: "Katalog penawaran",
    });
    expect(catalogue.textContent).toContain("kopi susu");
    expect(catalogue.textContent).toContain("Fokus audit");
    expect(catalogue.textContent).toContain("roti");
    // Read-only context: no toggles and no field on the catalogue screen.
    expect(within(catalogue).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(
      screen.queryByRole("group", { name: "Produk dan layanan" }),
    ).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa yang biasanya mencari bisnis Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
  });

  it("the service screen requires at least one channel and keeps the pick", async () => {
    stubPreparation({ draft: { ...j5Draft, service_channels: [] } });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa yang biasanya mencari bisnis Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    // Nothing prepared: every tile starts off and Lanjut stays gated.
    const lanjutButton = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjutButton).toHaveProperty("disabled", true);
    expect(screen.getByText("Pilih setidaknya satu cara.")).toBeTruthy();
    expect(
      within(
        screen.getByRole("group", {
          name: "Cara pelanggan mendapatkan yang Anda tawarkan",
        }),
      ).queryAllByRole("button", { pressed: true }),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Online" }));
    expect(lanjutButton).toHaveProperty("disabled", false);
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
    await afterMarket();
    expect(fact("Cara mendapatkan").textContent).toBe("online");
    expect(currentSelection().serviceChannels).toEqual(["online"]);
  });

  it("the market screen enforces exactly one area for sekitar and caps several at eight", async () => {
    stubPreparation({
      draft: {
        ...j5Draft,
        market_reach: "",
        market_areas: [
          "Area 1",
          "Area 2",
          "Area 3",
          "Area 4",
          "Area 5",
          "Area 6",
          "Area 7",
          "Area 8",
        ],
      },
    });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa yang biasanya mencari bisnis Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    // No prepared reach — Lanjut is disabled until one is chosen.
    const lanjutButton = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjutButton).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("radio", { name: "Beberapa area" }));
    const areas = () =>
      within(screen.getByRole("group", { name: /^Area mana/ }));
    for (const name of [
      "Area 1",
      "Area 2",
      "Area 3",
      "Area 4",
      "Area 5",
      "Area 6",
      "Area 7",
      "Area 8",
    ]) {
      fireEvent.click(areas().getByRole("button", { name }));
    }
    expect(lanjutButton).toHaveProperty("disabled", false);
    // A ninth area is refused with a visible block, not a silent drop.
    fireEvent.click(screen.getByRole("button", { name: "Tambah kota" }));
    addThrough("Kota atau area", "Area 9");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "paling banyak 8",
    );
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.marketAreas).toHaveLength(8);
    expect(saved.selection.marketAreas).not.toContain("Area 9");
    // "Satu area" keeps exactly one: a second chip replaces the first.
    fireEvent.click(screen.getByRole("radio", { name: "Satu area" }));
    expect(lanjutButton).toHaveProperty("disabled", true);
    fireEvent.click(areas().getByRole("button", { name: "Area 1" }));
    expect(lanjutButton).toHaveProperty("disabled", false);
    fireEvent.click(areas().getByRole("button", { name: "Area 2" }));
    const savedAfterSwitch = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(savedAfterSwitch.selection.marketAreas).toEqual(["Area 2"]);
    lanjut();
    await afterMarket();
    expect(currentSelection().marketReach).toBe("sekitar");
    expect(fact("Area").textContent).toBe("Area 2");
  });

  it("a location focus never shows the market screen and freezes market null", async () => {
    const requests: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith("/api/audit/identity"))
          return Response.json({
            canonical_url: "https://kedai-fiksi.example/",
            display_name: "Kedai Fiksi",
            preparation_mode: "synthetic-local",
          });
        if (url === "/api/orders")
          return Response.json({ order_id: ORDER_ID, state: "open" });
        if (url === "/api/audit/extract")
          return Response.json({
            draft: j5Draft,
            telemetry: [],
            preparation_mode: "synthetic-local",
          });
        if (url === "/api/audit/glm-questions") {
          requests.push(JSON.parse(String(init?.body)));
          return questionsResponse();
        }
        throw new Error(`Unexpected request ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await toOrder();
    await passOrder();
    await startStepTwo();
    await selectFocus(/Satu cabang/);
    lanjut();
    await screen.findByRole("heading", { name: "Cabang mana?" });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Lokasi ini biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa yang biasanya mencari bisnis Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    lanjut();
    // Cabang focus skips market but still walks the optional screens.
    await afterMarket();
    expect(
      screen.queryByRole("heading", {
        name: "Di mana pelanggan Anda berada?",
      }),
    ).toBeNull();
    expect(screen.queryByText("Area", { selector: "dt" })).toBeNull();
    tickReview();
    fireEvent.click(buatPertanyaan());
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    const sent = requests[0]!;
    expect(sent.intake).toMatchObject({
      context: {
        focus: { value: { kind: "cabang" } },
        market: null,
        serviceChannels: { value: ["on_premise"], origin: "website" },
      },
    });
  });

  it("summary Ubah opens the owning screen and Lanjut returns to the summary", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    // J26: the review's Ubah opens the section's sheet; Batal leaves the
    // review without touching the answer.
    const offering = (sheet: HTMLElement, name: string) =>
      within(
        within(sheet).getByRole("group", { name: "Produk dan layanan" }),
      ).getByRole("button", { name });
    let sheet = await openSheet("Bisnis");
    fireEvent.click(offering(sheet, "roti"));
    expect(offering(sheet, "roti").getAttribute("aria-pressed")).toBe("false");
    await closeSheet(sheet, "Batal");
    expect(fact("Menjual").textContent).toBe("kopi susu, roti");
    expect(currentSelection().offerings).toEqual(["kopi susu", "roti"]);
    // Simpan applies the change in place.
    sheet = await openSheet("Bisnis");
    fireEvent.click(offering(sheet, "roti"));
    await closeSheet(sheet, "Simpan");
    expect(fact("Menjual").textContent).toBe("kopi susu");
    expect(fact("Menjual").textContent).not.toContain("roti");
    expect(currentSelection().offerings).toEqual(["kopi susu"]);
  });

  it("the product summary edit reopens the product target and updates it", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    await selectFocus(/Satu produk/);
    lanjut();
    await screen.findByRole("heading", { name: "Produk mana?" });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    lanjut();
    await fromOfferings("produk");

    expect(fact("Menjual").textContent).toBe("kopi susu");
    // Under a product focus the Bisnis sheet has no catalogue; the product
    // itself is changed through "Ganti fokus audit".
    const sheet = await openSheet("Bisnis");
    expect(within(sheet).queryByText("Menjual")).toBeNull();
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Ganti fokus audit" }),
    );
    await focusScreen();
    lanjut();
    await screen.findByRole("heading", { name: "Produk mana?" });
    fireEvent.click(screen.getByRole("radio", { name: /roti/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    expect(fact("Menjual").textContent).toBe("roti");
    expect(fact("Menjual").textContent).not.toContain("kopi susu");
  });

  it.each(["footer Kembali", "marked browser popstate"])(
    "a product summary edit returns to the summary through %s",
    async (backNavigation) => {
      stubPreparation({ draft: j5Draft });
      render(<SmartIntakeJourney live={false} />);
      await toFocusScreen();
      await selectFocus(/Satu produk/);
      lanjut();
      await screen.findByRole("heading", { name: "Produk mana?" });
      fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
      lanjut();
      await screen.findByRole("heading", {
        name: "Produk atau layanan ini biasanya disebut apa?",
      });
      lanjut();
      await fromOfferings("produk");

      // The product is edited through the focus detour (J26).
      await editFocus();
      lanjut();
      await screen.findByRole("heading", { name: "Produk mana?" });
      const editing = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(editing?.editReturn).toBe("summary");
      // The detour records the confirmed focus and category (R-05).
      expect(editing?.editBaseline).toEqual({
        focus: "produk",
        category: "minuman kopi siap tutup",
      });
      expect(editing?.selection?.productTarget).toBe("kopi susu");

      const back = () =>
        backNavigation === "footer Kembali"
          ? kembali()
          : fireEvent.popState(window, { state: { nuaveIntake: true } });
      // Back steps to the focus screen, whose untouched detour then exits
      // to the review.
      back();
      await focusScreen();
      back();

      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      expect(fact("Menjual").textContent).toBe("kopi susu");
      const returned = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(returned?.stage).toBe("summary");
      expect(returned?.selection?.productTarget).toBe("kopi susu");
      expect(returned?.editReturn).toBeUndefined();
      expect(returned?.editBaseline).toBeUndefined();
    },
  );

  it("restores a mid-detail screen and its answers after a reload", async () => {
    stubPreparation({ draft: j5Draft });
    const first = render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: "Pilihan kategori" }),
      ).getByRole("radio", { name: /^kafe/ }),
    );
    lanjut();
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.stage).toBe("offerings");
    expect(saved.selection.category).toBe("kafe");
    expect(saved.selection.categoryKind).toBe("suggestion");
  });

  it("blocks sensitive text on the new detail inputs without persisting it", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Lainnya" }));
    const category = addThrough("Kategori lain", "nomor rekening 12345");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    // The refused text stays in the field for correction, never in storage.
    expect(category.value).toBe("nomor rekening 12345");
    expect(currentSelection().category).toBe("kedai kopi");
    expect(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
    lanjut();
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    const offering = addThrough(
      "Produk atau layanan lain",
      "nomor rekening 12345",
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(offering.value).toBe("nomor rekening 12345");
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.offerings).not.toContain("nomor rekening 12345");
    expect(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
  });
});

describe("Spec 013 J7 final review", () => {
  const aliasDraft = {
    ...draft,
    brand_name_variants: ["Kedai Fiksi Pusat", "KopiFiksi"],
  };
  // J26: "Nama lain" lives in the Bisnis sheet.
  const aliasChips = (sheet: HTMLElement) =>
    within(sheet)
      .getAllByRole("group", { name: "Nama lain" })
      .flatMap((group) => within(group).getAllByRole("button"))
      .map((chip) => chip.textContent);
  const aliasChip = (sheet: HTMLElement, name: string) =>
    within(within(sheet).getByRole("group", { name: "Nama lain" })).getByRole(
      "button",
      { name },
    );
  const aliasInput = () =>
    screen.getByRole("textbox", { name: "Nama lain baru" }) as HTMLInputElement;
  const addAlias = (value: string) => {
    if (!screen.queryByRole("textbox", { name: "Nama lain baru" }))
      fireEvent.click(screen.getByRole("button", { name: "Tambah nama lain" }));
    return addThrough("Nama lain baru", value);
  };
  const confirm = () => {
    tickReview();
    fireEvent.click(buatPertanyaan());
  };
  const savedSession = () =>
    parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY));

  it("reads the business name back without inline name controls", async () => {
    stubPreparation({ draft: aliasDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    const heading = await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(
      document
        .querySelector('[data-intake-screen="review"]')
        ?.getAttribute("data-smart-summary"),
    ).toBe("ready");
    const business = within(screen.getByRole("region", { name: "Bisnis" }));
    // The review is read-back only — name corrections route to the brand
    // check, website changes to the entry, both from the Bisnis sheet
    // (J7/R-21).
    expect(business.queryByRole("radio")).toBeNull();
    expect(business.queryByRole("textbox")).toBeNull();
    expect(business.getByText("Kedai Fiksi")).toBeTruthy();
    expect(business.getByText(/kedai-fiksi\.example/)).toBeTruthy();
    // Prepared aliases arrive with the name and keep their website origin.
    expect(fact("Nama").textContent).toContain(
      "Juga disebut: Kedai Fiksi Pusat, KopiFiksi",
    );
    expect(savedSession()?.selection?.origins.aliases).toBe("website");
    expect(business.getByRole("button", { name: "Ubah Bisnis" })).toBeTruthy();
    const sheet = await openSheet("Bisnis");
    expect(
      within(sheet).getByRole("button", { name: "Ubah nama" }),
    ).toBeTruthy();
    expect(
      within(sheet).getByRole("button", { name: "Ganti website" }),
    ).toBeTruthy();
  });

  it.each(["Lanjut", "footer Kembali", "marked browser popstate"])(
    "a review brand edit returns through %s with the marker consumed",
    async (wayBack) => {
      const { calls } = stubPreparation();
      render(<SmartIntakeJourney live={false} />);
      await fillAndPeriksa();
      await throughBrand();
      fireEvent.click(
        within(await openSheet("Bisnis")).getByRole("button", {
          name: "Ubah nama",
        }),
      );
      await screen.findByRole("heading", {
        name: "Kami menemukan bisnis Anda",
      });
      expect(savedSession()).toMatchObject({ editReturn: "summary" });
      // Correcting the name on the existing brand check spends no calls.
      await renameBusiness("Kedai Fiksi Baru");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      if (wayBack === "Lanjut") lanjut();
      else if (wayBack === "footer Kembali") kembali();
      else fireEvent.popState(window, { state: { nuaveIntake: true } });
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      const stored = savedSession();
      expect(stored?.stage).toBe("summary");
      // Consumed markers are dropped from the stored session entirely.
      expect(stored?.editReturn).toBeUndefined();
      expect(stored?.editBaseline).toBeUndefined();
      expect(
        screen.getByRole("region", { name: "Bisnis" }).textContent,
      ).toContain("Kedai Fiksi Baru");
      expect(calls).toEqual(["identity", "/api/orders", "/api/audit/extract"]);
    },
  );

  it("edits Nama lain inline, marks the owner change and persists it over a reload", async () => {
    stubPreparation({ draft: aliasDraft });
    const mounted = render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    let sheet = await openSheet("Bisnis");
    addAlias("Kedai Fiksi Baru");
    expect(aliasInput().value).toBe("");
    expect(aliasChips(sheet)).toEqual([
      "Kedai Fiksi Pusat",
      "KopiFiksi",
      "Kedai Fiksi Baru",
    ]);
    // J26: the sheet applies on Simpan.
    expect(savedSession()?.selection?.aliases).toEqual([
      "Kedai Fiksi Pusat",
      "KopiFiksi",
    ]);
    await closeSheet(sheet, "Simpan");
    expect(savedSession()?.selection?.aliases).toEqual([
      "Kedai Fiksi Pusat",
      "KopiFiksi",
      "Kedai Fiksi Baru",
    ]);
    expect(savedSession()?.selection?.origins.aliases).toBe("owner");
    // A reload restores the review with the committed list.
    mounted.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    expect(fact("Nama").textContent).toContain(
      "Juga disebut: Kedai Fiksi Pusat, KopiFiksi, Kedai Fiksi Baru",
    );
    // Removing a chip drops exactly that alias.
    sheet = await openSheet("Bisnis");
    fireEvent.click(aliasChip(sheet, "KopiFiksi"));
    await closeSheet(sheet, "Simpan");
    expect(savedSession()?.selection?.aliases).toEqual([
      "Kedai Fiksi Pusat",
      "Kedai Fiksi Baru",
    ]);
    // An emptied list is valid and leaves just the name (J6 rule).
    sheet = await openSheet("Bisnis");
    fireEvent.click(aliasChip(sheet, "Kedai Fiksi Pusat"));
    fireEvent.click(aliasChip(sheet, "Kedai Fiksi Baru"));
    expect(
      within(sheet).queryByRole("group", { name: "Nama lain" }),
    ).toBeNull();
    await closeSheet(sheet, "Simpan");
    expect(fact("Nama").textContent).toBe("Kedai Fiksi");
    expect(savedSession()?.selection?.aliases).toEqual([]);
  });

  it.each<[string, string, string]>([
    ["a duplicate", " kedai fiksi pusat ", "Nama lain ini sudah ada."],
    [
      "an overlong",
      "x".repeat(161),
      "Setiap nama lain paling panjang 160 karakter.",
    ],
  ])(
    "rejects %s alias, keeps the draft, and accepts the correction",
    async (_label, value, message) => {
      stubPreparation({ draft: aliasDraft });
      render(<SmartIntakeJourney live={false} />);
      await fillAndPeriksa();
      await throughBrand();
      const sheet = await openSheet("Bisnis");
      addAlias(value);
      expect((await screen.findByRole("alert")).textContent).toContain(message);
      // The refused draft stays in the field for a one-stroke fix.
      expect(aliasInput().value).toBe(value);
      expect(aliasChips(sheet)).toEqual(["Kedai Fiksi Pusat", "KopiFiksi"]);
      addThrough("Nama lain baru", "Nama Ketiga");
      expect(aliasInput().value).toBe("");
      expect(screen.queryByRole("alert")).toBeNull();
      await closeSheet(sheet, "Simpan");
      expect(savedSession()?.selection?.aliases).toEqual([
        "Kedai Fiksi Pusat",
        "KopiFiksi",
        "Nama Ketiga",
      ]);
    },
  );

  it("refuses a thirteenth alias while keeping the committed twelve", async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `Varian ${i + 1}`);
    stubPreparation({ draft: { ...draft, brand_name_variants: twelve } });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    const sheet = await openSheet("Bisnis");
    addAlias("Varian Ke-13");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Pilih paling banyak 12 nama lain.",
    );
    expect(aliasInput().value).toBe("Varian Ke-13");
    expect(aliasChips(sheet)).toEqual(twelve);
    await closeSheet(sheet, "Simpan");
    expect(savedSession()?.selection?.aliases).toEqual(twelve);
  });

  it("keeps a sensitive alias out of selection, storage and any request", async () => {
    const { calls, fetchMock } = stubPreparation({ draft: aliasDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    const sheet = await openSheet("Bisnis");
    addAlias("nomor rekening 12345");
    // The shared privacy message shows inside the sheet.
    expect((await within(sheet).findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    // The rejected draft stays; nothing unsafe enters the sheet's list.
    expect(aliasInput().value).toBe("nomor rekening 12345");
    expect(aliasChips(sheet)).toEqual(["Kedai Fiksi Pusat", "KopiFiksi"]);
    await closeSheet(sheet, "Simpan");
    expect(savedSession()?.selection?.aliases).toEqual([
      "Kedai Fiksi Pusat",
      "KopiFiksi",
    ]);
    expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).not.toContain(
      "nomor rekening",
    );
    // Editing alone never asks for questions; a later explicit confirm sends
    // only the last safe list.
    expect(calls).toEqual(["identity", "/api/orders", "/api/audit/extract"]);
    confirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    const questionRequest = fetchMock.mock.calls.find(
      (call) => call[0] === "/api/audit/glm-questions",
    );
    expect(
      JSON.parse(String(questionRequest?.[1]?.body)).intake.context.identity
        .aliases,
    ).toEqual(["Kedai Fiksi Pusat", "KopiFiksi"]);
  });

  it("keeps aliases and later answers on a same-source name edit", async () => {
    const { calls } = stubPreparation({ draft: aliasDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    let sheet = await openSheet("Bisnis");
    addAlias("Alias Pemilik");
    await closeSheet(sheet, "Simpan");
    sheet = await openSheet("Bisnis");
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Ganti website" }),
    );
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    // The same website again: the lookup is reused, and the name alone is
    // corrected on the brand check.
    fireEvent.click(
      screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
    );
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    await renameBusiness("Kedai Fiksi Baru");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    lanjut();
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    // No preparation call, and every answer — aliases included — is retained.
    expect(calls).toEqual(["identity", "/api/orders", "/api/audit/extract"]);
    expect(savedSession()?.selection).toMatchObject({
      name: "Kedai Fiksi Baru",
      aliases: ["Kedai Fiksi Pusat", "KopiFiksi", "Alias Pemilik"],
    });
  });

  it("a changed website clears markers and resets preparation state", async () => {
    const { calls } = stubPreparation({ draft: aliasDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    // An owner alias on the review proves the reset drops edited state.
    let sheet = await openSheet("Bisnis");
    addAlias("Kedai Fiksi Baru");
    await closeSheet(sheet, "Simpan");
    sheet = await openSheet("Bisnis");
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Ganti website" }),
    );
    const source = await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    expect(savedSession()).toMatchObject({
      stage: "entry",
      editReturn: "summary",
    });
    // Typing a different URL resets on input change, not on submit.
    fireEvent.change(source, {
      target: { value: "https://kedai-baru.example/" },
    });
    const stored = savedSession();
    expect(stored).toMatchObject({
      prepared: null,
      selection: null,
      confirmedSelection: null,
      frozen: null,
      pack: null,
    });
    expect(stored?.editReturn).toBeUndefined();
    expect(stored?.editBaseline).toBeUndefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
    );
    // A new website starts a new order (R-01) before the paid reading.
    await toOrder();
    await passOrder();
    // The marker is gone: the flow walks the normal chain, not the review.
    await startStepTwo();
    expect(calls).toEqual([
      "identity",
      "/api/orders",
      "/api/audit/extract",
      "identity",
      "/api/orders",
      "/api/audit/extract",
    ]);
    // The owner alias is gone: the fresh selection re-seeds from preparation.
    const afterReset = savedSession();
    expect(afterReset?.selection?.aliases).toEqual([
      "Kedai Fiksi Pusat",
      "KopiFiksi",
    ]);
    expect(afterReset?.selection?.origins?.aliases).toBe("website");
  });

  it("routes a missing required answer to its owning screen and back", async () => {
    stubPreparation();
    const mounted = render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    // Reach the gap state through a restored session: the service screen
    // gates Lanjut, so a normal walk cannot leave serviceChannels empty.
    const stored = savedSession()!;
    mounted.unmount();
    window.localStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({
        ...stored,
        selection: { ...stored.selection, serviceChannels: [] },
      }),
    );
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    expect(screen.getByText(/Perlu dipastikan: Cara layanan/)).toBeTruthy();
    // Nothing to confirm while a required answer is missing.
    expect(
      screen.queryByRole("button", { name: "Buat pertanyaan audit" }),
    ).toBeNull();
    expect(
      screen.queryByRole("checkbox", { name: REVIEW_CONFIRMATION }),
    ).toBeNull();
    // The CTA opens the owning screen directly, marked to return here.
    fireEvent.click(
      screen.getByRole("button", { name: "Lengkapi yang perlu dipastikan" }),
    );
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    expect(savedSession()?.editReturn).toBe("summary");
    fireEvent.click(screen.getByRole("button", { name: "Datang ke tempat" }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    expect(buatPertanyaan()).toBeTruthy();
    expect(screen.queryByText(/Perlu dipastikan:/)).toBeNull();
  });

  it("confirms once, reuses the pack unchanged, regenerates on an alias edit and restores on cancel", async () => {
    const { fetchMock } = stubPreparation({ draft: aliasDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    let sheet = await openSheet("Bisnis");
    addAlias("Kedai Fiksi Baru");
    await closeSheet(sheet, "Simpan");
    const glmCalls = () =>
      fetchMock.mock.calls.filter(
        (call) => call[0] === "/api/audit/glm-questions",
      );
    // A rapid double press: the first click moves the journey off the review,
    // so the second dispatch lands on the detached button and no-ops.
    tickReview();
    const confirmButton = buatPertanyaan();
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(glmCalls()).toHaveLength(1);
    expect(
      JSON.parse(String(glmCalls()[0]?.[1]?.body)).intake.context.identity
        .aliases,
    ).toEqual(["Kedai Fiksi Pusat", "KopiFiksi", "Kedai Fiksi Baru"]);
    // An unchanged return reuses the pack — no new request.
    const backToReview = async () => {
      kembali();
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
    };
    await backToReview();
    confirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(glmCalls()).toHaveLength(1);
    // An alias change freezes a different context and generates a new pack.
    await backToReview();
    sheet = await openSheet("Bisnis");
    fireEvent.click(aliasChip(sheet, "KopiFiksi"));
    await closeSheet(sheet, "Simpan");
    confirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(glmCalls()).toHaveLength(2);
    expect(
      JSON.parse(String(glmCalls()[1]?.[1]?.body)).intake.context.identity
        .aliases,
    ).toEqual(["Kedai Fiksi Pusat", "Kedai Fiksi Baru"]);
    // A further edit cancelled from the review restores the confirmed list.
    await backToReview();
    sheet = await openSheet("Bisnis");
    addAlias("Draft Tidak Jadi");
    await closeSheet(sheet, "Simpan");
    fireEvent.click(screen.getByRole("button", { name: "Batalkan perubahan" }));
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(glmCalls()).toHaveLength(2);
    expect(savedSession()?.selection?.aliases).toEqual([
      "Kedai Fiksi Pusat",
      "Kedai Fiksi Baru",
    ]);
  });

  it("restores review when extraction includes an overlong alias", async () => {
    const { calls } = stubPreparation({
      draft: {
        ...aliasDraft,
        brand_name_variants: ["x".repeat(161), "KopiFiksi"],
      },
    });
    const mounted = render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    expect(savedSession()?.selection?.aliases).toEqual(["KopiFiksi"]);

    mounted.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    expect(fact("Nama").textContent).toContain("Juga disebut: KopiFiksi");
    expect(savedSession()?.stage).toBe("summary");
    // The restored session checks its saved order once (R-30), nothing paid.
    await waitFor(() =>
      expect(calls).toEqual([
        "identity",
        "/api/orders",
        "/api/audit/extract",
        "/api/orders/status",
      ]),
    );

    confirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(calls).toEqual([
      "identity",
      "/api/orders",
      "/api/audit/extract",
      "/api/orders/status",
      "/api/audit/discovery",
      "/api/audit/glm-questions",
    ]);
  });

  it.each(["footer Kembali", "marked browser popstate"])(
    "corrects an empty business name after %s returns to review",
    async (wayBack) => {
      const { calls } = stubPreparation({ draft: aliasDraft });
      const mounted = render(<SmartIntakeJourney live={false} />);
      await fillAndPeriksa();
      await throughBrand();
      const originalSelection = savedSession()?.selection;
      expect(originalSelection).toBeTruthy();

      fireEvent.click(
        within(await openSheet("Bisnis")).getByRole("button", {
          name: "Ubah nama",
        }),
      );
      await screen.findByRole("heading", {
        name: "Kami menemukan bisnis Anda",
      });
      // J05b refuses a blank name: Simpan stays off and the name is kept.
      fireEvent.click(screen.getByRole("button", { name: "Ubah nama" }));
      const sheet = await screen.findByRole("dialog", { name: "Nama bisnis" });
      fireEvent.change(
        within(sheet).getByRole("textbox", { name: "Nama bisnis" }),
        { target: { value: "   " } },
      );
      expect(
        within(sheet).getByRole("button", { name: "Simpan" }),
      ).toHaveProperty("disabled", true);
      await closeSheet(sheet, "Batal");
      if (wayBack === "footer Kembali") kembali();
      else fireEvent.popState(window, { state: { nuaveIntake: true } });
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      expect(savedSession()?.selection).toEqual(originalSelection);
      expect(savedSession()?.editReturn).toBeUndefined();
      expect(screen.queryByText(/Perlu dipastikan: Nama bisnis/)).toBeNull();

      // A name that is blank anyway (an older saved session) is a gap the
      // review routes to the brand check and back.
      const stored = savedSession()!;
      mounted.unmount();
      window.localStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify({
          ...stored,
          selection: { ...stored.selection, name: "   " },
        }),
      );
      render(<SmartIntakeJourney live={false} />);
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      expect(screen.getByText(/Perlu dipastikan: Nama bisnis/)).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: "Buat pertanyaan audit" }),
      ).toBeNull();

      fireEvent.click(
        screen.getByRole("button", { name: "Lengkapi yang perlu dipastikan" }),
      );
      await screen.findByRole("heading", {
        name: "Kami menemukan bisnis Anda",
      });
      await renameBusiness("Kedai Fiksi Benar");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      lanjut();
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
      expect(savedSession()?.selection).toEqual({
        ...originalSelection,
        name: "Kedai Fiksi Benar",
        nameOrigin: "owner",
      });
      expect(savedSession()?.editReturn).toBeUndefined();
      expect(buatPertanyaan()).toBeTruthy();
      // Only the restored session's order check was added; nothing paid.
      expect(calls).toEqual([
        "identity",
        "/api/orders",
        "/api/audit/extract",
        "/api/orders/status",
      ]);
    },
  );
});

const jqDraft = {
  ...j5Draft,
  target_customer: "pekerja sekitar",
  verified_decision_criteria: ["lokasi"],
  usp: "Racikan kopi rumahan fiktif",
};

// The three JQ answers: their old row name, the J25 fact that reads each one
// back, the J26 sheet that edits it, and the screen that asks it in the flow.
const jqRows = [
  [
    "Pelanggan sasaran",
    "Siapa",
    "Calon pelanggan",
    "Siapa yang biasanya mencari bisnis Anda?",
  ],
  [
    "Pertimbangan pembeli",
    "Mereka membandingkan",
    "Calon pelanggan",
    "Apa yang mereka cari saat memilih?",
  ],
  [
    "Pembeda bisnis",
    "Yang membedakan Anda",
    "Pembanding",
    "Apa yang membuat bisnis Anda berbeda?",
  ],
] as const;

// J17's second group of chips (what customers compare).
const REASONS = "Mereka membandingkan…";
// Its "+ Lainnya" chip, told apart from the needs one by "(pertimbangan)"
// (jsdom drops the space a browser keeps before the bracket).
const OTHER_REASON = /^Lainnya ?\(pertimbangan\)$/;

/** A chip in a named chip group, on a screen or inside a sheet. */
const chipIn = (container: HTMLElement, group: string, name: string) =>
  within(within(container).getByRole("group", { name: group })).getByRole(
    "button",
    { name },
  );

const jqSession = () =>
  parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY));

const jqConfirm = () => {
  tickReview();
  fireEvent.click(buatPertanyaan());
};

/** Changes one JQ answer inside its open review sheet. */
const jqChange = (row: string, sheet: HTMLElement) => {
  if (row === "Pelanggan sasaran")
    fireEvent.click(chipIn(sheet, "Jenis pelanggan", "pekerja sekitar"));
  else if (row === "Pertimbangan pembeli")
    fireEvent.click(chipIn(sheet, REASONS, "lokasi"));
  else
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: /Pembeda bisnis/ }),
      { target: { value: "Pembeda sementara fiktif" } },
    );
};

const jqQuestionBodies = (
  fetchMock: ReturnType<typeof stubPreparation>["fetchMock"],
) =>
  fetchMock.mock.calls
    .filter((call) => call[0] === "/api/audit/glm-questions")
    .map(
      (call) =>
        (
          JSON.parse(String(call[1]?.body)) as {
            intake: { context: Record<string, unknown> };
          }
        ).intake.context,
    );

// Step 2 under a whole-brand focus, from J11 to J22.
const BRAND_CHAIN: (string | RegExp)[] = [
  "Apa yang ingin Anda audit?",
  "Bisnis Anda biasanya disebut apa?",
  "Apa saja yang Anda jual?",
  "Siapa yang biasanya mencari bisnis Anda?",
  "Apa yang mereka cari saat memilih?",
  "Bagaimana pelanggan mendapatkannya?",
  "Di mana pelanggan Anda berada?",
  COMPETITORS_HEADING,
  "Apa yang membuat bisnis Anda berbeda?",
];

/** Lanjut along the whole-brand chain, from the screen shown to `heading`. */
async function walkTo(heading: string) {
  let at = BRAND_CHAIN.findIndex(
    (name) => screen.queryByRole("heading", { name }) !== null,
  );
  const to = BRAND_CHAIN.indexOf(heading);
  if (at < 0 || to < at) throw new Error(`No way on to ${heading}`);
  while (at < to) {
    lanjut();
    at += 1;
    await screen.findByRole("heading", { name: BRAND_CHAIN[at]! });
  }
}

/** J17 in the flow, after the paid reading. */
async function toCustomerNeeds() {
  await fillAndPeriksa();
  await toOrder();
  await passOrder();
  await startStepTwo();
  await walkTo("Apa yang mereka cari saat memilih?");
}

describe("Spec 013 JQ customer screens", () => {
  it("walks the three screens in order, keeps empty Continue free, and omits empty meanings", async () => {
    const { fetchMock } = stubPreparation({
      draft: {
        ...j5Draft,
        target_customer: "",
        verified_decision_criteria: [],
        usp: "",
      },
    });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await toOrder();
    await passOrder();
    await startStepTwo();
    lanjut();
    await screen.findByRole("heading", { name: /biasanya disebut apa\?$/ });
    lanjut();
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    lanjut();
    const target = await screen.findByRole("heading", {
      name: "Siapa yang biasanya mencari bisnis Anda?",
    });
    await waitFor(() => expect(document.activeElement).toBe(target));
    // Nothing prepared: no customer type is ticked or labelled, and Lanjut
    // stays free.
    expect(
      within(
        screen.getByRole("group", { name: "Jenis pelanggan" }),
      ).queryAllByRole("button", { pressed: true }),
    ).toHaveLength(0);
    expect(screen.queryByText("Saran Nuave")).toBeNull();
    expect(lanjutButton().disabled).toBe(false);
    lanjut();
    const considerations = await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    await waitFor(() => expect(document.activeElement).toBe(considerations));
    // No consideration was prepared: the common reasons wait, none ticked.
    expect(
      within(screen.getByRole("group", { name: REASONS })).queryAllByRole(
        "button",
        { pressed: true },
      ),
    ).toHaveLength(0);
    expect(lanjutButton().disabled).toBe(false);
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
    await screen.findByRole("heading", { name: COMPETITORS_HEADING });
    lanjut();
    const differentiator = await screen.findByRole("heading", {
      name: "Apa yang membuat bisnis Anda berbeda?",
    });
    await waitFor(() => expect(document.activeElement).toBe(differentiator));
    expect(
      (
        screen.getByRole("textbox", {
          name: /Pembeda bisnis/,
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("");
    expect(screen.queryByText("Saran Nuave")).toBeNull();
    expect(lanjutButton().disabled).toBe(false);
    lanjut();
    await throughReviewCover();
    for (const [, label] of jqRows)
      expect(fact(label).textContent).toBe("Belum diisi");
    jqConfirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    const [context] = jqQuestionBodies(fetchMock);
    expect(context).not.toHaveProperty("targetCustomer");
    expect(context).not.toHaveProperty("decisionConsiderations");
    expect(context).not.toHaveProperty("differentiator");
    expect(context).toHaveProperty("customerNeeds");
  });

  it("shows prepared meanings selected with their Nuave label and freezes them unchanged", async () => {
    const { calls, fetchMock } = stubPreparation({ draft: jqDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await toOrder();
    await passOrder();
    await startStepTwo();
    // Each screen arrives with Nuave's proposal selected and labelled.
    await walkTo("Siapa yang biasanya mencari bisnis Anda?");
    expect(
      chipIn(document.body, "Jenis pelanggan", "pekerja sekitar").getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(screen.getByText("Saran Nuave")).toBeTruthy();
    await walkTo("Apa yang mereka cari saat memilih?");
    expect(
      chipIn(document.body, REASONS, "lokasi").getAttribute("aria-pressed"),
    ).toBe("true");
    await walkTo("Apa yang membuat bisnis Anda berbeda?");
    expect(
      (
        screen.getByRole("textbox", {
          name: /Pembeda bisnis/,
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Racikan kopi rumahan fiktif");
    expect(screen.getByText("Saran Nuave")).toBeTruthy();
    lanjut();
    await throughReviewCover();
    // The review reads them back; the sheets keep them selected.
    expect(fact("Siapa").textContent).toBe("pekerja sekitar");
    expect(fact("Mereka membandingkan").textContent).toBe("lokasi");
    expect(fact("Yang membedakan Anda").textContent).toBe(
      "Racikan kopi rumahan fiktif",
    );
    let sheet = await openSheet("Calon pelanggan");
    expect(
      chipIn(sheet, "Jenis pelanggan", "pekerja sekitar").getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(chipIn(sheet, REASONS, "lokasi").getAttribute("aria-pressed")).toBe(
      "true",
    );
    await closeSheet(sheet, "Batal");
    sheet = await openSheet("Pembanding");
    expect(
      (
        within(sheet).getByRole("textbox", {
          name: /Pembeda bisnis/,
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Racikan kopi rumahan fiktif");
    expect(within(sheet).getByText("Saran Nuave")).toBeTruthy();
    await closeSheet(sheet, "Batal");
    jqConfirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(calls).toEqual([
      "identity",
      "/api/orders",
      "/api/audit/extract",
      "/api/audit/discovery",
      "/api/audit/glm-questions",
    ]);
    const [context] = jqQuestionBodies(fetchMock);
    expect(context.targetCustomer).toEqual({
      value: "pekerja sekitar",
      origin: "nuave",
    });
    expect(context.decisionConsiderations).toEqual({
      value: ["lokasi"],
      origin: "nuave",
    });
    expect(context.differentiator).toEqual({
      value: "Racikan kopi rumahan fiktif",
      origin: "nuave",
    });
  });

  it("freezes exact owner edits with owner origin while keeping the rest of the context", async () => {
    const { fetchMock } = stubPreparation({ draft: jqDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    let sheet = await openSheet("Calon pelanggan");
    fireEvent.click(chipIn(sheet, "Jenis pelanggan", "pekerja sekitar"));
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Tambah lainnya" }),
    );
    addThrough("Pelanggan lain", "keluarga sekitar");
    fireEvent.click(chipIn(sheet, REASONS, "lokasi"));
    fireEvent.click(chipIn(sheet, REASONS, "jam buka"));
    await closeSheet(sheet, "Simpan");
    sheet = await openSheet("Pembanding");
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: /Pembeda bisnis/ }),
      { target: { value: "Pilihan roti rumahan fiktif" } },
    );
    await closeSheet(sheet, "Simpan");
    jqConfirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    const [context] = jqQuestionBodies(fetchMock);
    expect(context.targetCustomer).toEqual({
      value: "keluarga sekitar",
      origin: "owner",
    });
    expect(context.decisionConsiderations).toEqual({
      value: ["jam buka"],
      origin: "owner",
    });
    expect(context.differentiator).toEqual({
      value: "Pilihan roti rumahan fiktif",
      origin: "owner",
    });
    expect(context.customerNeeds).toEqual({
      value: ["minuman dekat kantor"],
      origin: "nuave",
    });
    expect(context.category).toEqual({
      value: "kedai kopi",
      origin: "website",
    });
    expect(context.comparators).toEqual({
      value: { mode: "unknown" },
      origin: "nuave",
    });
  });

  it("enforces chips, Enter, duplicates, length and the privacy stop on considerations", async () => {
    stubPreparation({ draft: jqDraft });
    render(<SmartIntakeJourney live={false} />);
    await toCustomerNeeds();
    const reasons = () => within(screen.getByRole("group", { name: REASONS }));
    fireEvent.click(screen.getByRole("button", { name: OTHER_REASON }));
    const input = screen.getByRole("textbox", {
      name: "Pertimbangan pembeli lain",
    }) as HTMLInputElement;
    const tambah = () =>
      within(
        screen.getByRole("group", { name: "Pertimbangan pembeli lain" }),
      ).getByRole("button", { name: "Tambah" });
    const lokasi = reasons().getByRole("button", { name: "lokasi" });
    fireEvent.click(lokasi);
    expect(lokasi.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(lokasi);
    expect(lokasi.getAttribute("aria-pressed")).toBe("true");
    // Enter commits a typed consideration; one that names a chip on screen
    // switches that chip on.
    fireEvent.change(input, { target: { value: "jam buka" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("");
    expect(
      reasons()
        .getByRole("button", { name: "jam buka" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // A trimmed case-insensitive duplicate is never stored twice: it is the
    // chip already on.
    fireEvent.change(input, { target: { value: "  JAM BUKA " } });
    fireEvent.click(tambah());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      reasons().getAllByRole("button", { name: /jam buka/i }),
    ).toHaveLength(1);
    expect(jqSession()?.selection?.decisionConsiderations).toEqual([
      "lokasi",
      "jam buka",
    ]);
    // 300 characters accepted; 301 refused with the draft kept.
    fireEvent.change(input, { target: { value: "x".repeat(300) } });
    fireEvent.click(tambah());
    expect(input.value).toBe("");
    expect(jqSession()?.selection?.decisionConsiderations).toHaveLength(3);
    fireEvent.change(input, { target: { value: "y".repeat(301) } });
    fireEvent.click(tambah());
    expect((await screen.findByRole("alert")).textContent).toContain(
      "300 karakter",
    );
    expect(input.value).toBe("y".repeat(301));
    expect(jqSession()?.selection?.decisionConsiderations).toHaveLength(3);
    // A sensitive draft stays in the input but never reaches the session.
    fireEvent.change(input, { target: { value: "nomor rekening 12345" } });
    fireEvent.click(tambah());
    const alertsAtPrivacyStop = screen
      .queryAllByRole("alert")
      .map((alert) => alert.textContent);
    expect(alertsAtPrivacyStop).toContain(INTAKE_TEXT_RESTRICTED_MESSAGE);
    expect(input.value).toBe("nomor rekening 12345");
    expect(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
    // Switching a chip off is one click.
    fireEvent.click(reasons().getByRole("button", { name: "jam buka" }));
    expect(
      reasons()
        .getByRole("button", { name: "jam buka" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(jqSession()?.selection?.decisionConsiderations).toEqual([
      "lokasi",
      "x".repeat(300),
    ]);
    // The privacy stop was the one message shown: the earlier length
    // correction no longer applied to the new draft.
    expect(alertsAtPrivacyStop).toEqual([INTAKE_TEXT_RESTRICTED_MESSAGE]);
  });

  it("shows the current consideration error after privacy and duplicate refusals", async () => {
    const { fetchMock } = stubPreparation({ draft: jqDraft });
    render(<SmartIntakeJourney live={false} />);
    await toCustomerNeeds();
    fireEvent.click(screen.getByRole("button", { name: OTHER_REASON }));
    const input = screen.getByRole("textbox", {
      name: "Pertimbangan pembeli lain",
    }) as HTMLInputElement;
    const enter = (value: string) => {
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: "Enter" });
    };
    const alerts = () =>
      screen.queryAllByRole("alert").map((alert) => alert.textContent);
    enter("jam buka");
    expect(input.value).toBe("");
    // A sensitive draft is refused: privacy notice, draft kept, nothing stored.
    enter("nomor rekening 12345");
    expect(alerts()).toEqual([INTAKE_TEXT_RESTRICTED_MESSAGE]);
    expect(input.value).toBe("nomor rekening 12345");
    expect(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
    // A current safe duplicate is the chip already on: nothing is added, and
    // the stale privacy notice goes.
    enter("  JAM BUKA ");
    expect(alerts()).toEqual([]);
    expect(input.value).toBe("");
    expect(jqSession()?.selection?.decisionConsiderations).toEqual([
      "lokasi",
      "jam buka",
    ]);
    // Sensitive again: the privacy notice is back.
    enter("nomor rekening 12345");
    expect(alerts()).toEqual([INTAKE_TEXT_RESTRICTED_MESSAGE]);
    // A 301-character safe draft shows the length correction instead.
    enter("y".repeat(301));
    expect(alerts()).toEqual([
      "Setiap pertimbangan paling panjang 300 karakter.",
    ]);
    expect(input.value).toBe("y".repeat(301));
    // An accepted value clears the alert and the draft.
    enter("jam tutup");
    expect(input.value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(jqSession()?.selection?.decisionConsiderations).toEqual([
      "lokasi",
      "jam buka",
      "jam tutup",
    ]);
    await walkTo("Apa yang membuat bisnis Anda berbeda?");
    lanjut();
    await throughReviewCover();
    jqConfirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    const [context] = jqQuestionBodies(fetchMock);
    expect(context.decisionConsiderations).toEqual({
      value: ["lokasi", "jam buka", "jam tutup"],
      origin: "owner",
    });
    expect(JSON.stringify(context)).not.toContain("nomor rekening");
  });

  it("accepts a twelfth consideration and refuses a thirteenth", async () => {
    stubPreparation({
      draft: {
        ...jqDraft,
        verified_decision_criteria: Array.from(
          { length: 12 },
          (_, index) => `Pertimbangan ${index + 1}`,
        ),
      },
    });
    render(<SmartIntakeJourney live={false} />);
    await toCustomerNeeds();
    fireEvent.click(screen.getByRole("button", { name: OTHER_REASON }));
    const input = addThrough("Pertimbangan pembeli lain", "Ke-13");
    const tambah = () =>
      within(
        screen.getByRole("group", { name: "Pertimbangan pembeli lain" }),
      ).getByRole("button", { name: "Tambah" });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "paling banyak 12",
    );
    expect(input.value).toBe("Ke-13");
    expect(jqSession()?.selection?.decisionConsiderations).toHaveLength(12);
    // Freeing a slot lets the owner value in.
    fireEvent.click(chipIn(document.body, REASONS, "Pertimbangan 1"));
    fireEvent.click(tambah());
    expect(input.value).toBe("");
    expect(jqSession()?.selection?.decisionConsiderations).toContain("Ke-13");
    expect(jqSession()?.selection?.decisionConsiderations).toHaveLength(12);
  });

  for (const [row, , sheetName] of jqRows)
    it.each(["Lanjut", "footer Kembali", "marked browser popstate"])(
      `the ${row} edit returns to the review through %s`,
      async (wayBack) => {
        const { calls } = stubPreparation({ draft: jqDraft });
        render(<SmartIntakeJourney live={false} />);
        await fillAndPeriksa();
        await throughBrand();
        // J26: the answer is edited in a sheet on the review itself, so no
        // detour marker is set.
        const sheet = await openSheet(sheetName);
        const editing = jqSession();
        expect(editing?.stage).toBe("summary");
        expect(editing?.editReturn).toBeUndefined();
        expect(editing?.editBaseline).toBeUndefined();
        if (wayBack === "Lanjut") {
          // Simpan with nothing changed keeps the prepared answer as it is.
          await closeSheet(sheet, "Simpan");
        } else {
          // An unsaved change is dropped when the sheet is left another way.
          jqChange(row, sheet);
          if (wayBack === "footer Kembali") await closeSheet(sheet, "Batal");
          else {
            // A browser Back leaves the review for its cover, and the sheet
            // with it.
            fireEvent.popState(window, { state: { nuaveIntake: true } });
            await screen.findByRole("heading", {
              name: "Periksa, lalu jalankan audit",
            });
            mulai();
          }
        }
        await screen.findByRole("heading", {
          name: "Ini profil yang akan Nuave pakai",
        });
        const returned = jqSession();
        expect(returned?.stage).toBe("summary");
        expect(returned?.editReturn).toBeUndefined();
        expect(returned?.editBaseline).toBeUndefined();
        // Prepared answers survive the edit; no preparation repeated.
        expect(returned?.selection).toMatchObject({
          targetCustomer: "pekerja sekitar",
          decisionConsiderations: ["lokasi"],
          differentiator: "Racikan kopi rumahan fiktif",
          origins: {
            targetCustomer: "nuave",
            decisionConsiderations: "nuave",
            differentiator: "nuave",
          },
        });
        expect(calls).toEqual([
          "identity",
          "/api/orders",
          "/api/audit/extract",
        ]);
      },
    );

  for (const [row, , , heading] of jqRows)
    it(`a reload restores the ${row} screen with its answers and heading focus`, async () => {
      stubPreparation({ draft: jqDraft });
      const first = render(<SmartIntakeJourney live={false} />);
      await fillAndPeriksa();
      await toOrder();
      await passOrder();
      await startStepTwo();
      // The review edits in sheets (J26); the screen itself is in the flow.
      await walkTo(heading);
      first.unmount();
      render(<SmartIntakeJourney live={false} />);
      const restored = await screen.findByRole("heading", { name: heading });
      await waitFor(() => expect(document.activeElement).toBe(restored));
      if (row === "Pelanggan sasaran")
        expect(
          chipIn(
            document.body,
            "Jenis pelanggan",
            "pekerja sekitar",
          ).getAttribute("aria-pressed"),
        ).toBe("true");
      else if (row === "Pertimbangan pembeli")
        expect(
          chipIn(document.body, REASONS, "lokasi").getAttribute("aria-pressed"),
        ).toBe("true");
      else
        expect(
          (
            screen.getByRole("textbox", {
              name: /Pembeda bisnis/,
            }) as HTMLTextAreaElement
          ).value,
        ).toBe("Racikan kopi rumahan fiktif");
    });

  const jqStored = () => ({
    version: 9,
    stage: "summary",
    entry: { name: "Kedai Lama", source: "https://lama.example/" },
    identity: null,
    prepared: {
      typedName: "Kedai Lama",
      discoveredName: null,
      canonicalSource: "https://lama.example/",
      aliases: [],
      locations: { proposed: [], origin: "website" },
      categorySuggestions: { proposed: [], origin: "nuave" },
      offeringCategorySuggestions: { proposed: [], origin: "nuave" },
      targetCustomer: { proposed: null, origin: "nuave" },
      decisionConsiderations: { proposed: [], origin: "nuave" },
      differentiator: { proposed: null, origin: "nuave" },
      sourceLinks: [],
    },
    selection: {
      name: "Kedai Lama",
      nameOrigin: "owner",
      aliases: [],
      focus: "brand",
      productTarget: "",
      locationName: "",
      locationAddress: "",
      category: "kedai kopi",
      categoryKind: "main",
      offerings: ["kopi"],
      serviceChannels: ["on_premise"],
      marketReach: "sekitar",
      marketAreas: ["Bandung"],
      retainedBrandReach: "sekitar",
      retainedBrandAreas: ["Bandung"],
      targetCustomer: "",
      customerNeeds: [],
      decisionConsiderations: [],
      comparatorMode: "unknown",
      comparatorNames: [],
      differentiator: "",
      publicFact: "",
      origins: {},
    },
    confirmedSelection: null,
    frozen: null,
    pack: null,
    preparationCalls: [],
    preparationMode: "synthetic-local",
    generationAttempts: [],
  });

  it.each([
    ["a v8 record under the v9 key", { version: 8 }],
    [
      "a selection missing targetCustomer",
      {
        selection: { ...jqStored().selection, targetCustomer: undefined },
      },
    ],
    [
      "non-string considerations",
      {
        selection: {
          ...jqStored().selection,
          decisionConsiderations: [3],
        },
      },
    ],
    [
      "an invalid targetCustomer origin",
      {
        selection: {
          ...jqStored().selection,
          origins: { targetCustomer: "robot" },
        },
      },
    ],
    [
      "a malformed prepared targetCustomer",
      {
        prepared: { ...jqStored().prepared, targetCustomer: 5 },
      },
    ],
    [
      "a malformed prepared decisionConsiderations",
      {
        prepared: {
          ...jqStored().prepared,
          decisionConsiderations: { proposed: [3], origin: "nuave" },
        },
      },
    ],
  ])(
    "rejects %s and restarts safely at the empty entry",
    async (_label, patch) => {
      window.localStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify({ ...jqStored(), ...patch }),
      );
      stubPreparation();
      render(<SmartIntakeJourney live={false} />);
      const source = (await screen.findByRole("textbox", {
        name: "Website atau akun Instagram bisnis",
      })) as HTMLInputElement;
      expect(source.value).toBe("");
      expect(jqSession()).toBeNull();
    },
  );

  // JQ parser coverage: every malformed meaning type must fail closed on both
  // the working and the confirmed selection, and on the prepared record —
  // including coercible non-strings like `origin: ["owner"]`.
  const jqMalformedRows: [string, Record<string, unknown>][] = (
    ["selection", "confirmedSelection"] as const
  ).flatMap((slot) => {
    const base = jqStored().selection;
    return [
      [
        `a ${slot} with a non-string targetCustomer`,
        { [slot]: { ...base, targetCustomer: 4 } },
      ],
      [
        `a ${slot} with non-string considerations`,
        { [slot]: { ...base, decisionConsiderations: [3] } },
      ],
      [
        `a ${slot} with a non-string differentiator`,
        { [slot]: { ...base, differentiator: {} } },
      ],
      [
        `a ${slot} with an array targetCustomer origin`,
        { [slot]: { ...base, origins: { targetCustomer: ["owner"] } } },
      ],
      [
        `a ${slot} with an array considerations origin`,
        { [slot]: { ...base, origins: { decisionConsiderations: ["owner"] } } },
      ],
      [
        `a ${slot} with an array differentiator origin`,
        { [slot]: { ...base, origins: { differentiator: ["owner"] } } },
      ],
    ];
  });
  for (const field of [
    "targetCustomer",
    "decisionConsiderations",
    "differentiator",
  ] as const) {
    const badProposed =
      field === "decisionConsiderations"
        ? { proposed: [3], origin: "nuave" }
        : { proposed: 5, origin: "nuave" };
    jqMalformedRows.push(
      [
        `a prepared record missing ${field}`,
        { prepared: { ...jqStored().prepared, [field]: undefined } },
      ],
      [
        `a prepared ${field} with a bad proposed type`,
        { prepared: { ...jqStored().prepared, [field]: badProposed } },
      ],
      [
        `a prepared ${field} with an array origin`,
        {
          prepared: {
            ...jqStored().prepared,
            [field]: { proposed: null, origin: ["nuave"] },
          },
        },
      ],
    );
  }
  it.each(jqMalformedRows)("the parser rejects %s", (_label, patch) => {
    expect(
      parseSmartSession(JSON.stringify({ ...jqStored(), ...patch })),
    ).toBeNull();
  });

  it("parses long prepared meanings unchanged", () => {
    const parsed = parseSmartSession(
      JSON.stringify({
        ...jqStored(),
        prepared: {
          ...jqStored().prepared,
          targetCustomer: { proposed: "x".repeat(501), origin: "website" },
          decisionConsiderations: {
            proposed: ["x".repeat(301)],
            origin: "nuave",
          },
          differentiator: { proposed: "x".repeat(1001), origin: "website" },
        },
      }),
    );
    expect(parsed?.prepared?.targetCustomer.proposed).toBe("x".repeat(501));
    expect(parsed?.prepared?.decisionConsiderations.proposed).toEqual([
      "x".repeat(301),
    ]);
    expect(parsed?.prepared?.differentiator.proposed).toBe("x".repeat(1001));
  });

  it("keeps the JQ answers on a same-source name edit and reseeds them on a website change", async () => {
    const { calls } = stubPreparation({ draft: jqDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    let sheet = await openSheet("Calon pelanggan");
    fireEvent.click(chipIn(sheet, "Jenis pelanggan", "pekerja sekitar"));
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Tambah lainnya" }),
    );
    addThrough("Pelanggan lain", "keluarga sekitar");
    fireEvent.click(chipIn(sheet, REASONS, "lokasi"));
    fireEvent.click(chipIn(sheet, REASONS, "jam buka"));
    await closeSheet(sheet, "Simpan");
    sheet = await openSheet("Pembanding");
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: /Pembeda bisnis/ }),
      { target: { value: "Pilihan roti rumahan fiktif" } },
    );
    await closeSheet(sheet, "Simpan");
    // A name-only edit on the same source preserves the JQ answers.
    sheet = await openSheet("Bisnis");
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Ganti website" }),
    );
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
    );
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    await renameBusiness("Kedai Fiksi Cabang");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    lanjut();
    await screen.findByRole("heading", {
      name: "Ini profil yang akan Nuave pakai",
    });
    expect(calls).toEqual(["identity", "/api/orders", "/api/audit/extract"]);
    expect(jqSession()?.selection).toMatchObject({
      name: "Kedai Fiksi Cabang",
      targetCustomer: "keluarga sekitar",
      decisionConsiderations: ["jam buka"],
      differentiator: "Pilihan roti rumahan fiktif",
      origins: {
        targetCustomer: "owner",
        decisionConsiderations: "owner",
        differentiator: "owner",
      },
    });
    // A changed website prepares fresh meanings with their own provenance.
    sheet = await openSheet("Bisnis");
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Ganti website" }),
    );
    fireEvent.change(
      await screen.findByRole("textbox", {
        name: "Website atau akun Instagram bisnis",
      }),
      { target: { value: "https://kedai-baru.example/" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
    );
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    // The new website is looked up for free; no order or paid reading yet.
    expect(calls).toEqual([
      "identity",
      "/api/orders",
      "/api/audit/extract",
      "identity",
    ]);
    await toOrder();
    await passOrder();
    await startStepTwo();
    expect(calls).toEqual([
      "identity",
      "/api/orders",
      "/api/audit/extract",
      "identity",
      "/api/orders",
      "/api/audit/extract",
    ]);
    expect(jqSession()?.selection).toMatchObject({
      targetCustomer: "pekerja sekitar",
      decisionConsiderations: ["lokasi"],
      differentiator: "Racikan kopi rumahan fiktif",
      origins: {
        targetCustomer: "nuave",
        decisionConsiderations: "nuave",
        differentiator: "nuave",
      },
    });
  });

  it("reuses the pack on an unchanged return, regenerates on a JQ edit, and restores on cancel", async () => {
    const { fetchMock } = stubPreparation({ draft: jqDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    jqConfirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    const glmCalls = () =>
      fetchMock.mock.calls.filter(
        (call) => call[0] === "/api/audit/glm-questions",
      );
    expect(glmCalls()).toHaveLength(1);
    const backToReview = async () => {
      kembali();
      await screen.findByRole("heading", {
        name: "Ini profil yang akan Nuave pakai",
      });
    };
    await backToReview();
    jqConfirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(glmCalls()).toHaveLength(1);
    // A changed JQ meaning invalidates pack reuse.
    await backToReview();
    let sheet = await openSheet("Pembanding");
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: /Pembeda bisnis/ }),
      { target: { value: "Pilihan roti rumahan fiktif" } },
    );
    await closeSheet(sheet, "Simpan");
    jqConfirm();
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(glmCalls()).toHaveLength(2);
    expect(
      JSON.parse(String(glmCalls()[1]?.[1]?.body)).intake.context
        .differentiator,
    ).toEqual({ value: "Pilihan roti rumahan fiktif", origin: "owner" });
    // Cancelling a further edit restores the confirmed answers and the pack.
    await backToReview();
    sheet = await openSheet("Calon pelanggan");
    fireEvent.click(chipIn(sheet, "Jenis pelanggan", "pekerja sekitar"));
    fireEvent.click(chipIn(sheet, "Jenis pelanggan", "wisatawan"));
    fireEvent.click(chipIn(sheet, REASONS, "lokasi"));
    fireEvent.click(chipIn(sheet, REASONS, "jam buka"));
    await closeSheet(sheet, "Simpan");
    sheet = await openSheet("Pembanding");
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: /Pembeda bisnis/ }),
      { target: { value: "Pembeda sementara fiktif" } },
    );
    await closeSheet(sheet, "Simpan");
    expect(jqSession()?.selection).toMatchObject({
      targetCustomer: "wisatawan",
      decisionConsiderations: ["jam buka"],
      differentiator: "Pembeda sementara fiktif",
    });
    fireEvent.click(screen.getByRole("button", { name: "Batalkan perubahan" }));
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(glmCalls()).toHaveLength(2);
    expect(jqSession()?.selection).toMatchObject({
      targetCustomer: "pekerja sekitar",
      decisionConsiderations: ["lokasi"],
      differentiator: "Pilihan roti rumahan fiktif",
      origins: {
        targetCustomer: "nuave",
        decisionConsiderations: "nuave",
        differentiator: "owner",
      },
    });
    expect(jqSession()?.frozen?.context).toMatchObject({
      targetCustomer: { value: "pekerja sekitar", origin: "nuave" },
      decisionConsiderations: { value: ["lokasi"], origin: "nuave" },
      differentiator: {
        value: "Pilihan roti rumahan fiktif",
        origin: "owner",
      },
    });
  });
});

describe("independent review, round 1", () => {
  const KEDAI = "https://kedai-fiksi.example/";
  const savedOrder = (paid: boolean) =>
    JSON.stringify({
      ...freshSmartSession(),
      stage: "order",
      entry: { name: "", source: KEDAI },
      identity: {
        inputName: "Kedai Fiksi",
        inputSource: KEDAI,
        canonicalUrl: KEDAI,
        displayName: "Kedai Fiksi",
        preparationMode: "synthetic-local",
      },
      brand: { name: "Kedai Fiksi", origin: "website" },
      order: {
        id: ORDER_ID,
        website: KEDAI,
        name: "Kedai Fiksi",
        ...(paid ? { paid: true } : {}),
      },
      savedAt: new Date().toISOString(),
    });
  /** The order's status and the free check of another website. */
  function stubSavedOrder(payment: string, state = "open") {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input: RequestInfo | URL) => {
        const url = String(input);
        calls.push(url);
        if (url === "/api/orders/status")
          return Response.json({
            state,
            payment: { state: payment },
            completed: state === "delivered" ? 10 : 0,
            total: 10,
            questions: Array.from({ length: 10 }, (_, index) => ({
              prompt_id: `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
              status: state === "delivered" ? "completed" : "pending",
            })),
          });
        if (url.startsWith("/api/audit/identity"))
          return Response.json({
            canonical_url: "https://toko-lain.example/",
            display_name: "Toko Lain",
            preparation_mode: "synthetic-local",
          });
        if (url === "/api/audit/extract") return new Promise(() => {});
        if (url === "/api/payments/start") return new Promise(() => {});
        throw new Error(`Unexpected request ${url}`);
      }),
    );
    return calls;
  }

  /** Holds the saved order's status answer until `answer` releases it. */
  function stubHeldStatus() {
    const calls: string[] = [];
    let release: (payment: string) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input: RequestInfo | URL) => {
        const url = String(input);
        calls.push(url);
        if (url === "/api/orders/status")
          return new Promise<Response>((resolve) => {
            release = (payment) =>
              resolve(
                Response.json({
                  state: "open",
                  payment: { state: payment },
                  completed: 0,
                  total: 10,
                  questions: [],
                }),
              );
          });
        // A paid order's reading starts by itself (J09); it never answers here.
        if (url === "/api/audit/extract") return new Promise(() => {});
        throw new Error(`Unexpected request ${url}`);
      }),
    );
    return { calls, answer: (payment: string) => release(payment) };
  }

  it("offers Periksa only once the saved order's answer is in, and never for an order that turns out paid", async () => {
    window.localStorage.setItem(SMART_INTAKE_STORAGE_KEY, savedOrder(false));
    window.sessionStorage.setItem(
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
      "toko-lain.example",
    );
    const server = stubHeldStatus();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByText(
      /Website toko-lain\.example belum diperiksa, karena pesanan untuk Kedai Fiksi masih tersimpan/,
    );
    await waitFor(() => expect(server.calls).toContain("/api/orders/status"));
    // R-19: while the answer is out the order may be paid, so nothing on the
    // notice can replace it; it can only be dismissed.
    expect(
      screen.queryByRole("button", { name: "Periksa toko-lain.example" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Lanjutkan pesanan Kedai Fiksi" }),
    ).toBeTruthy();
    await act(async () => server.answer("paid"));
    await screen.findByText(
      /Website toko-lain\.example belum diperiksa\. Pesanan untuk Kedai Fiksi sudah dibayar atau sedang dibayar/,
    );
    expect(
      screen.queryByRole("button", { name: "Periksa toko-lain.example" }),
    ).toBeNull();
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.order,
    ).toMatchObject({ id: ORDER_ID, paid: true });
    // The typed website was never checked.
    expect(
      server.calls.some((url) => url.startsWith("/api/audit/identity")),
    ).toBe(false);
  });

  it("offers Periksa once the saved order's answer says it is still unpaid", async () => {
    window.localStorage.setItem(SMART_INTAKE_STORAGE_KEY, savedOrder(false));
    window.sessionStorage.setItem(
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
      "toko-lain.example",
    );
    const server = stubHeldStatus();
    render(<SmartIntakeJourney live={false} />);
    await waitFor(() => expect(server.calls).toContain("/api/orders/status"));
    expect(
      screen.queryByRole("button", { name: "Periksa toko-lain.example" }),
    ).toBeNull();
    await act(async () => server.answer("unpaid"));
    expect(
      await screen.findByRole("button", { name: "Periksa toko-lain.example" }),
    ).toBeTruthy();
  });

  it("says a website typed on the landing page was not checked while an order is saved, and checks it on request", async () => {
    window.localStorage.setItem(SMART_INTAKE_STORAGE_KEY, savedOrder(false));
    window.sessionStorage.setItem(
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
      "toko-lain.example",
    );
    const calls = stubSavedOrder("unpaid");
    render(<SmartIntakeJourney live={false} />);
    const notice = await screen.findByText(
      /Website toko-lain\.example belum diperiksa, karena pesanan untuk Kedai Fiksi masih tersimpan/,
    );
    expect(notice.closest("[role=status]")).not.toBeNull();
    await waitFor(() => expect(calls).toContain("/api/orders/status"));
    expect(calls.some((url) => url.startsWith("/api/audit/identity"))).toBe(
      false,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Periksa toko-lain.example" }),
    );
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    expect(
      calls.filter((url) => url.startsWith("/api/audit/identity")),
    ).toEqual([
      `/api/audit/identity?source=${encodeURIComponent("https://toko-lain.example/")}`,
    ]);
    const saved = parseSmartSession(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
    )!;
    // The old order is retired by the next one (R-19).
    expect(saved.order).toBeNull();
    expect(saved.supersededOrder).toBe(ORDER_ID);
    expect(screen.queryByText(/belum diperiksa/)).toBeNull();
  });

  it("keeps a paid order and says the typed website was not checked, with no way to switch", async () => {
    window.localStorage.setItem(SMART_INTAKE_STORAGE_KEY, savedOrder(true));
    window.sessionStorage.setItem(
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
      "toko-lain.example",
    );
    const calls = stubSavedOrder("paid");
    render(<SmartIntakeJourney live={false} />);
    await screen.findByText(
      /Website toko-lain\.example belum diperiksa\. Pesanan untuk Kedai Fiksi sudah dibayar atau sedang dibayar/,
    );
    expect(
      screen.queryByRole("button", { name: "Periksa toko-lain.example" }),
    ).toBeNull();
    expect(calls.some((url) => url.startsWith("/api/audit/identity"))).toBe(
      false,
    );
    fireEvent.click(screen.getByRole("button", { name: "Tutup" }));
    expect(screen.queryByText(/belum diperiksa/)).toBeNull();
  });

  it("drops the notice once the owner moves on with the saved order", async () => {
    window.localStorage.setItem(SMART_INTAKE_STORAGE_KEY, savedOrder(false));
    window.sessionStorage.setItem(
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
      "toko-lain.example",
    );
    stubSavedOrder("unpaid");
    render(<SmartIntakeJourney live={false} />);
    await screen.findByText(/Website toko-lain\.example belum diperiksa/);
    fireEvent.click(screen.getByRole("button", { name: "Halaman sebelumnya" }));
    await screen.findByRole("heading", { name: "Tinggal 3 langkah" });
    expect(screen.queryByText(/belum diperiksa/)).toBeNull();
  });

  it("pressing Bayar for the saved order drops the notice", async () => {
    window.localStorage.setItem(SMART_INTAKE_STORAGE_KEY, savedOrder(false));
    window.sessionStorage.setItem(
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
      "toko-lain.example",
    );
    const calls = stubSavedOrder("unpaid");
    render(<SmartIntakeJourney live={false} />);
    await screen.findByText(/Website toko-lain\.example belum diperiksa/);
    fireEvent.click(
      await screen.findByRole("button", { name: "Bayar Rp99.000" }),
    );
    await waitFor(() => expect(calls).toContain("/api/payments/start"));
    expect(screen.queryByText(/belum diperiksa/)).toBeNull();
  });

  it("an ended unpaid order still says the typed website was not checked, and checks it on request", async () => {
    window.localStorage.setItem(SMART_INTAKE_STORAGE_KEY, savedOrder(false));
    window.sessionStorage.setItem(
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
      "toko-lain.example",
    );
    const calls = stubSavedOrder("unpaid", "expired");
    render(<SmartIntakeJourney live={false} />);
    await screen.findByText(
      /Website toko-lain\.example belum diperiksa, karena audit untuk Kedai Fiksi masih tersimpan/,
    );
    expect(calls.some((url) => url.startsWith("/api/audit/identity"))).toBe(
      false,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Periksa toko-lain.example" }),
    );
    await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
    expect(
      calls.filter((url) => url.startsWith("/api/audit/identity")),
    ).toHaveLength(1);
  });

  it("an audit in this browser keeps its page, says the typed website was not checked, and keeps it for the next audit", async () => {
    window.localStorage.setItem(
      ACTIVE_ORDER_STORAGE_KEY,
      JSON.stringify({ orderId: ORDER_ID }),
    );
    window.sessionStorage.setItem(
      AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
      "toko-lain.example",
    );
    const calls = stubSavedOrder("paid", "delivered");
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", { name: "Laporan Anda sudah siap" });
    expect(
      screen.getByText(
        "Website toko-lain.example belum diperiksa, karena browser ini masih menampilkan audit sebelumnya.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Periksa toko-lain.example" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mulai audit baru" }));
    const field = await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    // Waiting in the field, not checked until the owner asks.
    expect((field as HTMLInputElement).value).toBe(
      "https://toko-lain.example/",
    );
    expect(screen.queryByText(/belum diperiksa/)).toBeNull();
    expect(calls.some((url) => url.startsWith("/api/audit/identity"))).toBe(
      false,
    );
  });

  it("continuing with a name on J04 says the website is read after payment, and J05 then claims nothing was read", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      stubPreparation({ holdIdentity: new Promise(() => {}) });
      render(<SmartIntakeJourney live={false} />);
      await fillAndPeriksa();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000);
      });
      await screen.findByRole("heading", {
        name: "Website Anda butuh waktu lebih lama",
      });
      expect(
        screen.getByText(
          "Anda bisa lanjut sekarang dengan nama bisnis Anda. Website Anda kami baca lengkap setelah pembayaran.",
        ),
      ).toBeTruthy();
      expect(screen.queryByText(/di belakang layar/)).toBeNull();
      fireEvent.click(
        screen.getByRole("button", { name: "Lanjut dengan nama ini" }),
      );
      await screen.findByRole("heading", { name: "Tinggal 3 langkah" });
      fireEvent.click(
        screen.getByRole("button", { name: "Halaman sebelumnya" }),
      );
      await screen.findByRole("heading", { name: "Bisnis yang akan diaudit" });
      expect(screen.queryByText(/Ini yang kami baca dari website/)).toBeNull();
      expect(
        parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
          ?.identity?.guessed,
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("adds text typed into an open add field on Lanjut, one field after another", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", { name: /biasanya disebut apa\?/ });
    lanjut();
    await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Produk atau layanan lain" }),
      { target: { value: "matcha, es teh" } },
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa yang biasanya mencari bisnis Anda?",
    });
    expect(currentSelection().offerings).toEqual(
      expect.arrayContaining(["matcha", "es teh"]),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    fireEvent.click(
      screen.getByRole("button", { name: /^Lainnya ?\(kebutuhan\)$/ }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Kebutuhan pelanggan lain" }),
      { target: { value: "tempat rapat" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: /^Lainnya ?\(pertimbangan\)$/ }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Pertimbangan pembeli lain" }),
      { target: { value: "parkir luas" } },
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    // Both fields' text arrived; neither wrote over the other.
    expect(currentSelection().customerNeeds).toContain("tempat rapat");
    expect(currentSelection().decisionConsiderations).toContain("parkir luas");
  });

  it("text refused once is left behind on Lanjut; new refused text keeps the screen", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    for (const heading of [
      "Apa yang ingin Anda audit?",
      "Bisnis Anda biasanya disebut apa?",
      "Apa saja yang Anda jual?",
      "Siapa yang biasanya mencari bisnis Anda?",
    ]) {
      await screen.findByRole("heading", { name: heading });
      lanjut();
    }
    await screen.findByRole("heading", {
      name: "Apa yang mereka cari saat memilih?",
    });
    fireEvent.click(
      screen.getByRole("button", { name: /^Lainnya ?\(kebutuhan\)$/ }),
    );
    const tooLong = "x".repeat(301);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Kebutuhan pelanggan lain" }),
      { target: { value: tooLong } },
    );
    lanjut();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Setiap kebutuhan paling panjang 300 karakter.",
    );
    expect(
      screen.getByRole("heading", {
        name: "Apa yang mereka cari saat memilih?",
      }),
    ).toBeTruthy();
    expect(
      within(
        screen.getByRole("group", { name: "Kebutuhan pelanggan lain" }),
      ).getByText(/^Belum ditambahkan:/),
    ).toBeTruthy();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkannya?",
    });
    expect(currentSelection().customerNeeds).not.toContain(tooLong);
  });

  it("the review sheet's Simpan adds text still typed in its add field", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    const sheet = await openSheet("Calon pelanggan");
    fireEvent.click(
      within(sheet).getByRole("button", { name: /^Lainnya ?\(kebutuhan\)$/ }),
    );
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: "Kebutuhan pelanggan lain" }),
      { target: { value: "tempat rapat" } },
    );
    await closeSheet(sheet, "Simpan");
    expect(currentSelection().customerNeeds).toContain("tempat rapat");
  });

  it("a reload during the found pause opens the Step 2 cover without reading again", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await toOrder();
    await passOrder();
    await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
    const statusBefore = calls.filter(
      (url) => url === "/api/orders/status",
    ).length;
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!,
    );
    // The reading is saved with the stage still "reading" during J09's pause.
    window.localStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({ ...saved, stage: "reading" }),
    );
    cleanup();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
    expect(screen.queryByText(/sebelumnya terputus/)).toBeNull();
    // The returning page asks about the order, and reads nothing again.
    await waitFor(() =>
      expect(calls.filter((url) => url === "/api/orders/status").length).toBe(
        statusBefore + 1,
      ),
    );
    expect(calls.filter((url) => url === "/api/audit/extract")).toHaveLength(1);
  });

  it("the question editor will not save a question that duplicates another", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    tickReview();
    fireEvent.click(buatPertanyaan());
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    fireEvent.click(screen.getByRole("button", { name: "Ubah pertanyaan 3" }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: "Pertanyaan 3" }),
      { target: { value: "Pertanyaan fiksi nomor 5?" } },
    );
    fireEvent.click(sheetSave(sheet));
    expect((await within(sheet).findByRole("alert")).textContent).toContain(
      "sama dengan pertanyaan lain",
    );
    expect(screen.getByRole("dialog")).toBe(sheet);
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.pack?.approved[2],
    ).toBe("Pertanyaan fiksi nomor 3?");
  });

  it("R-18: unticking the last name keeps 'named' and blocks Lanjut; 'Tidak ada pembanding langsung' freezes as itself", async () => {
    stubPreparation({
      draft: { ...draft, similar_businesses: [{ name: "Kopi Tetangga" }] },
    });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", { name: /biasanya disebut apa\?/ });
    lanjut();
    for (const heading of [
      "Apa saja yang Anda jual?",
      "Siapa yang biasanya mencari bisnis Anda?",
      "Apa yang mereka cari saat memilih?",
      "Bagaimana pelanggan mendapatkannya?",
      "Di mana pelanggan Anda berada?",
    ]) {
      await screen.findByRole("heading", { name: heading });
      lanjut();
    }
    await screen.findByRole("heading", {
      name: "Siapa yang mungkin dibandingkan dengan Anda?",
    });
    const row = screen.getByRole("checkbox", { name: /Kopi Tetangga/ });
    if (row.getAttribute("aria-checked") === "true") fireEvent.click(row);
    await waitFor(() => expect(lanjutButton().disabled).toBe(true));
    expect(currentSelection()).toMatchObject({
      comparatorMode: "named",
      comparatorNames: [],
    });
    expect(
      screen.getByText(
        "Centang atau tulis satu nama, atau pilih salah satu pilihan di bawah.",
      ),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Tidak ada pembanding langsung? Lewati juga.",
      }),
    );
    await screen.findByRole("heading", {
      name: "Apa yang membuat bisnis Anda berbeda?",
    });
    expect(currentSelection()).toMatchObject({
      comparatorMode: "category-alternatives",
      comparatorNames: [],
    });
    lanjut();
    await throughReviewCover();
    expect(fact("Bisnis pembanding").textContent).toContain(
      "Tidak ada pembanding langsung",
    );
    tickReview();
    fireEvent.click(buatPertanyaan());
    await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.frozen?.context.comparators,
    ).toMatchObject({ value: { mode: "category-alternatives" } });
  });
});
