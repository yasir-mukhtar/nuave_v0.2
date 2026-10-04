// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import historicalPair from "../../../tests/spec011-v1-records.json";
import { extractionDraftSchema } from "../audit/types";
import { LOCAL_INTAKE_STORAGE_KEY } from "./local-session";
import { LOCAL_AUDIT_STORAGE_KEY } from "./local-audit-session";
import {
  prepareUnderstanding,
  initialSmartSelection,
  SMART_INTAKE_STORAGE_KEY,
} from "./smart-intake-contract";
import SmartIntakeJourney from "./SmartIntakeJourney";
import { freshSmartSession, parseSmartSession } from "./smart-session";
import { projectQuestionOutcome } from "./question-public-errors";

beforeEach(() => {
  window.sessionStorage.clear();
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

// J5–JQ detail chain between the target screens and the summary. A cabang
// focus skips the market screen.
async function fromOfferings(focus: "brand" | "cabang" | "produk" = "brand") {
  await screen.findByRole("heading", {
    name: /^(Apakah ini|Apa saja) yang Anda tawarkan\?$/,
  });
  lanjut();
  await screen.findByRole("heading", { name: "Siapa pelanggan utama Anda?" });
  lanjut();
  await screen.findByRole("heading", {
    name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
  });
  lanjut();
  await screen.findByRole("heading", {
    name: "Apa yang dipertimbangkan pelanggan saat memilih?",
  });
  lanjut();
  await screen.findByRole("heading", {
    name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
  });
  lanjut();
  if (focus !== "cabang") {
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
  }
  await screen.findByRole("heading", {
    name: "Ini yang mungkin dibandingkan dengan Anda",
  });
  lanjut();
  await screen.findByRole("heading", {
    name: "Apa yang membedakan bisnis Anda?",
  });
  lanjut();
  await screen.findByRole("heading", {
    name: "Apa yang tidak boleh salah dipahami tentang brand Anda?",
  });
  lanjut();
  await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
}

async function afterMarket() {
  await screen.findByRole("heading", {
    name: "Ini yang mungkin dibandingkan dengan Anda",
  });
  lanjut();
  await screen.findByRole("heading", {
    name: "Apa yang membedakan bisnis Anda?",
  });
  lanjut();
  await screen.findByRole("heading", {
    name: "Apa yang tidak boleh salah dipahami tentang brand Anda?",
  });
  lanjut();
  await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
}

async function throughDetails(focus: "brand" | "cabang" | "produk" = "brand") {
  await screen.findByRole("heading", { name: /biasanya disebut apa\?/ });
  lanjut();
  await fromOfferings(focus);
}

async function throughBrand() {
  await screen.findByRole("heading", {
    name: "Ini brand yang ingin Anda audit?",
  });
  lanjut();
  await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
  lanjut();
  await throughDetails();
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
      window.sessionStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify({
          ...freshSmartSession(),
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
      const confirm = await screen.findByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      });
      fireEvent.click(confirm);
      fireEvent.click(confirm);
      if (valid)
        await screen.findByRole("heading", {
          name: "Periksa pertanyaan audit",
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
        expect(
          screen.queryByRole("button", { name: "Mulai audit" }),
        ).toBeNull();
      }
      const saved = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
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
          window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
        ).not.toMatch(/MOCK_ONLY|identitiesWithheld/);
      }
      cleanup();
      render(<SmartIntakeJourney live={true} />);
      if (valid)
        await screen.findByRole("heading", {
          name: "Periksa pertanyaan audit",
        });
      else
        await screen.findByRole("button", { name: "Coba siapkan pertanyaan" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        parseSmartSession(
          window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
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
            window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
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
      window.sessionStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify({
          ...freshSmartSession(),
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
      const confirm = await screen.findByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      });
      fireEvent.click(confirm);
      fireEvent.click(confirm);
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toBe(message);
      expect(document.body.textContent).not.toContain("MOCK_ONLY");
      const saved = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
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
      expect(screen.queryByRole("button", { name: "Mulai audit" })).toBeNull();
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
      const raw = window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
      expect(raw).not.toMatch(/MOCK_ONLY|identitiesWithheld/);
      cleanup();
      render(<SmartIntakeJourney live={live} />);
      const retry = await screen.findByRole("button", {
        name: "Coba siapkan pertanyaan",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        parseSmartSession(
          window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
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
    window.sessionStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({
        ...freshSmartSession(),
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
    const confirm = await screen.findByRole("button", {
      name: "Sudah sesuai — buat pertanyaan audit",
    });
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
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
    )!;
    expect(failed.pack).toBeNull();
    expect(screen.queryByRole("button", { name: "Mulai audit" })).toBeNull();
    expect(failed.generationAttempts).toHaveLength(1);
    expect(
      screen.getByText(
        "Mencoba lagi mengirim permintaan baru dan dapat menambah biaya penggunaan AI.",
      ),
    ).toBeDefined();
    expect(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)).not.toMatch(
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
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requests[1]).toEqual(requests[0]);
    const recovered = parseSmartSession(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
    )!;
    expect(recovered.frozen).toEqual(failed.frozen);
    expect(recovered.selection).toEqual(selection);
    expect(recovered.generationAttempts).toHaveLength(2);
    expect(recovered.pack!.approved).toHaveLength(10);
    expect(recovered.stage).toBe("questions");
    expect(screen.getByRole("button", { name: "Mulai audit" })).toBeDefined();
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
      window.sessionStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify({
          ...freshSmartSession(),
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
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Sudah sesuai — buat pertanyaan audit",
        }),
      );
      await screen.findByRole("alert");
      expect(
        screen.getByRole("button", { name: "Coba siapkan pertanyaan" }),
      ).toBeDefined();
      expect(screen.queryByText(notice) !== null).toBe(initialLive);
      const saved = window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
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
      expect(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBe(
        saved,
      );
      expect(saved).not.toMatch(
        /diagnostics|instructionVersion|finishReason|prompt_tokens/,
      );
    },
  );

  it("demonstrates the existing live/synthetic failed-attempt persistence collision (R-30 fence dependency)", async () => {
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
      stage: "summary",
      prepared,
      selection: initialSmartSelection(prepared),
    };
    const snapshots: unknown[] = [];
    for (const transport of ["synthetic-stub", "cheaper-inference"]) {
      cleanup();
      window.sessionStorage.clear();
      window.sessionStorage.setItem(
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
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Sudah sesuai — buat pertanyaan audit",
        }),
      );
      await screen.findByRole("alert");
      snapshots.push(
        JSON.parse(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)!),
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
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
      target: { value: "Kedai Fiksi" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "URL website publik" }),
      { target: { value: "https://kedai-fiksi.example/" } },
    );
    const inspect = screen.getByRole("button", { name: "Periksa" });
    fireEvent.click(inspect);
    fireEvent.click(inspect);
    await throughBrand();
    expect(requests.map((item) => item.url)).toEqual([
      "/api/audit/identity?source=https%3A%2F%2Fkedai-fiksi.example%2F",
      "/api/audit/extract",
    ]);
    expect(
      screen.getByRole("region", { name: "Fokus audit" }).textContent,
    ).toContain("Brand secara keseluruhan");
    expect(
      screen.getByRole("region", { name: "Fokus audit" }).textContent,
    ).toContain("Saran Nuave");
    const confirm = screen.getByRole("button", {
      name: "Sudah sesuai — buat pertanyaan audit",
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(
      await screen.findByRole("heading", { name: "Periksa pertanyaan audit" }),
    ).toBeTruthy();
    expect(requests).toHaveLength(3);
    const sent = requests[2]!.body!;
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
      JSON.parse(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
      ),
    ).toMatchObject({ version: 9, stage: "questions" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
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
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect(window.sessionStorage.getItem(LOCAL_AUDIT_STORAGE_KEY)).toBe(
      historicalPair.audit,
    );
  });
});

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
    holdExtract?: Promise<void>;
    draft?: Record<string, unknown>;
  } = {},
) {
  const calls: string[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url.startsWith("/api/audit/identity") ? "identity" : url);
    if (url.startsWith("/api/audit/identity"))
      return Response.json({
        canonical_url: "https://kedai-fiksi.example/",
        display_name: "Kedai Fiksi",
        preparation_mode: "synthetic-local",
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

async function fillAndPeriksa() {
  await screen.findByRole("textbox", { name: "Nama bisnis" });
  fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
    target: { value: "Kedai Fiksi" },
  });
  fireEvent.change(
    screen.getByRole("textbox", { name: "URL website publik" }),
    {
      target: { value: "https://kedai-fiksi.example/" },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
}

describe("Spec 013 J2 screen frame", () => {
  it("focuses the entry heading on arrival and keeps entry free of flow chrome", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    const heading = await screen.findByRole("heading", {
      name: "Periksa visibilitas bisnis Anda",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    // Screens 1–2 carry no chapter progress and no Kembali/Lanjut nav.
    expect(screen.queryByRole("img", { name: /Bab / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lanjut" })).toBeNull();
  });

  it("shows the labelled reading screen while preparation is in flight, then the brand check", async () => {
    let release!: () => void;
    const holdExtract = new Promise<void>((resolve) => (release = resolve));
    stubPreparation({ holdExtract });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    const reading = await screen.findByRole("region", {
      name: "Pembacaan sumber",
    });
    expect(reading.getAttribute("data-intake-screen")).toBe("reading");
    expect(
      screen.getByRole("heading", { name: "Sebentar, Nuave sedang membaca" }),
    ).toBeTruthy();
    expect(screen.getByText("Membaca sumber Anda")).toBeTruthy();
    expect(screen.getByText("Menemukan produk dan lokasi")).toBeTruthy();
    expect(
      screen.getByText("Memperkirakan pelanggan dan pembanding"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Mode uji lokal menggunakan pengganti sintetis berlabel.",
      ),
    ).toBeTruthy();
    // No navigation or submit affordance while the read is in flight.
    expect(screen.queryByRole("button")).toBeNull();
    release();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
  });

  it("brand check shows typed name and website, corrects inline, and keeps sensitive text out", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    const card = await screen.findByRole("article", {
      name: "Brand yang ditemukan",
    });
    expect(card.textContent).toContain("Kedai Fiksi");
    expect(card.textContent).toContain("https://kedai-fiksi.example/");
    // Chapter progress marks bab 1 of 4 on the brand check.
    expect(screen.getByRole("img", { name: "Bab 1 dari 4" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ubah nama" }));
    const field = screen.getByRole("textbox", { name: "Nama brand" });
    fireEvent.change(field, { target: { value: "Kedai Fiksi Baru" } });
    expect(card.textContent).toContain("Kedai Fiksi Baru");
    fireEvent.change(field, { target: { value: "nomor rekening 12345" } });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(card.textContent).toContain("Kedai Fiksi Baru");
    expect(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
  });

  it("Kembali on the brand check returns to a filled entry; the same source adds no call", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    const name = await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect((name as HTMLInputElement).value).toBe("Kedai Fiksi");
    expect(
      (
        screen.getByRole("textbox", {
          name: "URL website publik",
        }) as HTMLInputElement
      ).value,
    ).toBe("https://kedai-fiksi.example/");
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
  });

  it("a marked browser Back walks the flow one screen at a time and ignores foreign entries", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    // summary → public fact → differentiator → competitors → market →
    // service → considerations → customer needs → target customer →
    // offerings → category → focus → brand → entry via marked pops.
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Apa yang tidak boleh salah dipahami tentang brand Anda?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Apa yang membedakan bisnis Anda?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Ini yang mungkin dibandingkan dengan Anda",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Siapa pelanggan utama Anda?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.popState(window, { state: { otherNavigation: true } });
    await screen.findByRole("textbox", { name: "Nama bisnis" });
  });

  it("a reload during reading restores a filled entry with the interruption note and no replay", async () => {
    let release!: () => void;
    const holdExtract = new Promise<void>((resolve) => (release = resolve));
    const { fetchMock } = stubPreparation({ holdExtract });
    const first = render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await waitFor(() =>
      expect(
        JSON.parse(
          window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
        ).stage,
      ).toBe("reading"),
    );
    const callsSoFar = fetchMock.mock.calls.length;
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    const name = await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect((name as HTMLInputElement).value).toBe("Kedai Fiksi");
    expect(
      (
        screen.getByRole("textbox", {
          name: "URL website publik",
        }) as HTMLInputElement
      ).value,
    ).toBe("https://kedai-fiksi.example/");
    expect(
      screen.getByText(
        "Pembacaan sumber sebelumnya terputus. Isian Anda tetap tersimpan — tekan Periksa untuk membaca ulang.",
      ),
    ).toBeTruthy();
    // The interrupted read is never replayed on its own.
    expect(fetchMock).toHaveBeenCalledTimes(callsSoFar);
    release();
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
    window.sessionStorage.setItem(
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
    const name = await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect((name as HTMLInputElement).value).toBe("");
    expect(
      parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      ),
    ).toBeNull();
  });

  it("a corrupt stored selection at a later stage restarts at entry instead of crashing", async () => {
    window.sessionStorage.setItem(
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
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect(
      parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      ),
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
      window.sessionStorage.setItem(
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
      await screen.findByRole("textbox", { name: "Nama bisnis" });
      expect(
        parseSmartSession(
          window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
        ),
      ).toBeNull();
    },
  );

  it("rejects a malformed confirmedSelection alias list the same way", () => {
    window.sessionStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify(
        storedSession({
          confirmedSelection: { ...storedSelection, aliases: "bukan array" },
        }),
      ),
    );
    expect(
      parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      ),
    ).toBeNull();
  });

  it("restores a valid v9 review and its stored aliases without a call", async () => {
    const { fetchMock } = stubPreparation();
    window.sessionStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify(storedSession()),
    );
    render(<SmartIntakeJourney live={false} />);
    const heading = await screen.findByRole("heading", {
      name: "Ini yang akan Nuave audit",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(
      document
        .querySelector('[data-intake-screen="review"]')
        ?.getAttribute("data-smart-summary"),
    ).toBe("ready");
    const row = within(screen.getByRole("region", { name: "Nama lain" }));
    expect(row.getByText("Kedai Lama Pusat")).toBeTruthy();
    expect(row.getByText("Dari website Anda")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a name-only edit at entry keeps later answers and spends no call", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    // The summary's category row opens the dedicated screen; a typed
    // category is the owner's own answer.
    fireEvent.click(
      within(screen.getByRole("region", { name: "Kategori" })).getByRole(
        "button",
        { name: "Ubah" },
      ),
    );
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Tulis kategori sendiri" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Kategori" }), {
      target: { value: "kafe fiksi" },
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    // J7: the review keeps a separate website action; a same-source
    // name-only edit reuses preparation and returns through the brand check.
    fireEvent.click(
      within(screen.getByRole("region", { name: "Bisnis" })).getByRole(
        "button",
        { name: "Ubah website" },
      ),
    );
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
      target: { value: "Kedai Fiksi Baru" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    expect(
      screen.getByRole("region", { name: "Kategori" }).textContent,
    ).toContain("kafe fiksi");
    expect(
      screen.getByRole("region", { name: "Bisnis" }).textContent,
    ).toContain("Kedai Fiksi Baru");
  });

  it("re-offers the website's discovered name when a name-only edit makes it differ", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    const group = () => screen.getByRole("radiogroup", { name: "Nama bisnis" });
    // Typed name equals the discovered name: only the owner option shows.
    expect(within(group()).getAllByRole("radio")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Nama bisnis" }),
      { target: { value: "Kedai Fiksi Baru" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    const options = within(group())
      .getAllByRole("radio")
      .map((radio) => radio.closest("label")!.textContent);
    expect(options).toHaveLength(2);
    expect(options[0]).toContain("Kedai Fiksi Baru");
    expect(options[0]).toContain("Dari Anda");
    expect(options[1]).toContain("Kedai Fiksi");
    expect(options[1]).toContain("Dari website Anda");
    // The name-only path still spends no new preparation call.
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
  });

  it("merges the website option when a name-only edit lands on the discovered name", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
      target: { value: "Kopi X" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "URL website publik" }),
      { target: { value: "https://kedai-fiksi.example/" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    const group = () => screen.getByRole("radiogroup", { name: "Nama bisnis" });
    expect(within(group()).getAllByRole("radio")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Nama bisnis" }),
      { target: { value: "Kedai Fiksi" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    expect(within(group()).getAllByRole("radio")).toHaveLength(1);
    // The review must not show a duplicated name either — the row is
    // read-back only now (J7), so the merged name appears once as text.
    lanjut();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    lanjut();
    await throughDetails();
    const business = within(screen.getByRole("region", { name: "Bisnis" }));
    expect(business.queryByRole("radio")).toBeNull();
    expect(business.getByText("Kedai Fiksi")).toBeTruthy();
  });

  it("moves focus to the question-review heading when the pack lands", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    );
    const heading = await screen.findByRole("heading", {
      name: "Periksa pertanyaan audit",
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
  await screen.findByRole("heading", {
    name: "Ini brand yang ingin Anda audit?",
  });
  fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
  await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
}

const focusRow = () =>
  within(screen.getByRole("region", { name: "Fokus audit" }));

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
    const whole = screen.getByRole("radio", {
      name: /Brand secara keseluruhan/,
    });
    expect(whole.getAttribute("aria-checked")).toBe("true");
    expect(whole.textContent).toContain("Saran Nuave");
    expect(
      screen
        .getByRole("radio", { name: /Satu lokasi/ })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    ).toBeTruthy();
    // Chapter progress marks bab 2 of 4 on the focus screen.
    expect(screen.getByRole("img", { name: "Bab 2 dari 4" })).toBeTruthy();
    lanjut();
    await throughDetails();
    expect(focusRow().getByText("Brand secara keseluruhan")).toBeTruthy();
    // Screen navigation spends no extra preparation call.
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
  });

  it("the location screen lists host-screened published rows and blocks Lanjut until complete", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    const dago = screen.getByRole("radio", { name: /Kedai Fiksi Dago/ });
    const cimahi = screen.getByRole("radio", { name: /Kedai Fiksi Cimahi/ });
    expect(dago.textContent).toContain("Jl. Fiksi Raya No. 10, Bandung");
    expect(dago.textContent).toContain("Dari website Anda");
    // A www.-equivalent page still counts as published by the business.
    expect(cimahi.textContent).toContain("Dari website Anda");
    fireEvent.click(cimahi);
    expect(cimahi.getAttribute("aria-checked")).toBe("true");
    lanjut();
    await throughDetails("cabang");
    expect(focusRow().getByText("Satu lokasi")).toBeTruthy();
    expect(focusRow().getByText(/Kedai Fiksi Cimahi/)).toBeTruthy();
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
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
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah lokasi lain" }));
    const lanjut = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjut).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("textbox", { name: "Nama lokasi" }), {
      target: { value: "Gerai Fiksi" },
    });
    expect(lanjut).toHaveProperty("disabled", true);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Alamat atau area" }),
      {
        target: { value: "Jl. Fiksi 40, Bandung" },
      },
    );
    expect(lanjut).toHaveProperty("disabled", false);
    // The completed manual entry shows as its own owner-labelled choice.
    const manual = screen.getByRole("radio", { name: /Gerai Fiksi/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Dari Anda");
  });

  it("the product screen lists offerings and accepts a typed target", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    const lanjut = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjut).toHaveProperty("disabled", true);
    const roti = screen.getByRole("radio", { name: /roti/ });
    expect(roti.textContent).toContain("Dari website Anda");
    fireEvent.click(roti);
    expect(roti.getAttribute("aria-checked")).toBe("true");
    // A typed replacement becomes the owner's answer.
    fireEvent.click(
      screen.getByRole("button", { name: "Tambah produk atau layanan lain" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nama produk atau layanan" }),
      { target: { value: "paket rapat" } },
    );
    const manual = screen.getByRole("radio", { name: /paket rapat/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Dari Anda");
    expect(roti.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(lanjut);
    await throughDetails("produk");
    expect(focusRow().getByText(/paket rapat/)).toBeTruthy();
  });

  it("offers the manual location link when no usable published location exists", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    expect(screen.queryByRole("radio", { name: /Satu lokasi/ })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Isi lokasi secara manual" }),
    );
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    // With no published list the manual form is shown directly.
    expect(screen.getByRole("textbox", { name: "Nama lokasi" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Nama lokasi" }), {
      target: { value: "Gerai Satu" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Alamat atau area" }),
      {
        target: { value: "Jl. Fiksi 1" },
      },
    );
    lanjut();
    await throughDetails("cabang");
    expect(focusRow().getByText(/Gerai Satu/)).toBeTruthy();
  });

  it("keeps a summary-opened focus edit returning to the summary", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    // In-flow Kembali returns to the summary this edit came from.
    kembali();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
  });

  it("walks back through the target screens one stage at a time", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    // location → focus → brand via in-flow Kembali.
    kembali();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    expect(
      screen
        .getByRole("radio", { name: /Satu lokasi/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    kembali();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    // A location focus steps back through J6/JQ but skips market.
    lanjut();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    lanjut();
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    lanjut();
    await throughDetails("cabang");
    kembali();
    await screen.findByRole("heading", {
      name: "Apa yang tidak boleh salah dipahami tentang brand Anda?",
    });
    kembali();
    await screen.findByRole("heading", {
      name: "Apa yang membedakan bisnis Anda?",
    });
    kembali();
    await screen.findByRole("heading", {
      name: "Ini yang mungkin dibandingkan dengan Anda",
    });
    kembali();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    kembali();
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    kembali();
    await screen.findByRole("heading", {
      name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    });
    kembali();
    await screen.findByRole("heading", { name: "Siapa pelanggan utama Anda?" });
  });

  it("restores the location stage and its answers after a reload", async () => {
    stubPreparation({ draft: j4Draft });
    const first = render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah lokasi lain" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nama lokasi" }), {
      target: { value: "Gerai Reload" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Alamat atau area" }),
      {
        target: { value: "Jl. Muat Ulang 7" },
      },
    );
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    expect(
      (screen.getByRole("textbox", { name: "Nama lokasi" }) as HTMLInputElement)
        .value,
    ).toBe("Gerai Reload");
    expect(
      (
        screen.getByRole("textbox", {
          name: "Alamat atau area",
        }) as HTMLInputElement
      ).value,
    ).toBe("Jl. Muat Ulang 7");
  });

  it("clears an incompatible target when the focus changes (R-05)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    lanjut();
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    lanjut();
    await throughDetails("cabang");
    // Re-open focus from the summary and switch to product: the location
    // target no longer applies.
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.locationName).toBe("");
    expect(saved.selection.locationAddress).toBe("");
    expect(saved.selection.productTarget).toBe("");
  });

  it("keeps sensitive manual target text out of the selection", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Tambah produk atau layanan lain" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nama produk atau layanan" }),
      { target: { value: "paket rapat" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nama produk atau layanan" }),
      { target: { value: "nomor rekening 12345" } },
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
  });

  it("a summary-opened focus screen exits back only with a complete target (B1)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    // Switch to a product focus, then Kembali must not reach the summary —
    // it would read back a focus with no target and no field to fill one.
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    kembali();
    await screen.findByRole("heading", { name: "Produk atau layanan mana?" });
    // Completing the detour's target walks the remaining chain — the
    // category checkpoint, the read-only catalogue, service, market — and
    // lands back on the summary.
    fireEvent.click(
      screen.getByRole("button", { name: "Tambah produk atau layanan lain" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nama produk atau layanan" }),
      { target: { value: "paket rapat" } },
    );
    lanjut();
    await throughDetails("produk");
    expect(focusRow().getByText(/paket rapat/)).toBeTruthy();
  });

  it("a summary-opened focus screen detours Kembali through an unready location target (B1)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    kembali();
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    // The detour consumes the return marker: backing out of the target
    // screen resumes the ordinary focus → brand → entry chain.
    kembali();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    kembali();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
  });

  it("keeps the Satu lokasi card visible while cabang is the stored answer (B2)", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    expect(screen.queryByRole("radio", { name: /Satu lokasi/ })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Isi lokasi secara manual" }),
    );
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Nama lokasi" }), {
      target: { value: "Gerai Satu" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Alamat atau area" }),
      { target: { value: "Jl. Fiksi 1" } },
    );
    // Back to the focus screen: the stored cabang answer stays a visible,
    // checked card even though no published locations exist (R-02).
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    const card = screen.getByRole("radio", { name: /Satu lokasi/ });
    expect(card.getAttribute("aria-checked")).toBe("true");
  });

  it("the manual location form starts empty over a published pick (M1)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tambah lokasi lain" }));
    const name = screen.getByRole("textbox", {
      name: "Nama lokasi",
    }) as HTMLInputElement;
    const address = screen.getByRole("textbox", {
      name: "Alamat atau area",
    }) as HTMLInputElement;
    // A picked published row is not a draft — the form opens empty instead
    // of pre-filling the published values the owner is about to overwrite.
    expect(name.value).toBe("");
    expect(address.value).toBe("");
    fireEvent.change(name, { target: { value: "Gerai Baru" } });
    expect(name.value).toBe("Gerai Baru");
    expect(address.value).toBe("");
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.locationName).toBe("Gerai Baru");
    expect(saved.selection.locationAddress).toBe("");
  });

  it("keeps typed text whole across a transient match with a published offering (P2)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", { name: "Produk atau layanan mana?" });
    fireEvent.click(
      screen.getByRole("button", { name: "Tambah produk atau layanan lain" }),
    );
    const input = screen.getByRole("textbox", {
      name: "Nama produk atau layanan",
    }) as HTMLInputElement;
    // "kopi susu" is a published offering — the draft must not blank when
    // the owner types through it on the way to a longer name.
    typeChars(input, "kopi susu premium");
    expect(input.value).toBe("kopi susu premium");
    const manual = screen.getByRole("radio", { name: /kopi susu premium/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Dari Anda");
  });

  it("keeps the location name across a transient match with a published row (P2)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah lokasi lain" }));
    const name = screen.getByRole("textbox", {
      name: "Nama lokasi",
    }) as HTMLInputElement;
    const address = screen.getByRole("textbox", {
      name: "Alamat atau area",
    }) as HTMLInputElement;
    typeChars(name, "Kedai Fiksi Dago");
    // Mid-typing the pair equals the published row at
    // "Jl. Fiksi Raya No. 10, Bandung" — the name must survive the match.
    typeChars(address, "Jl. Fiksi Raya No. 10, Bandung Wetan");
    expect(name.value).toBe("Kedai Fiksi Dago");
    expect(address.value).toBe("Jl. Fiksi Raya No. 10, Bandung Wetan");
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
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
      expect(suggestion.textContent).toContain("Saran Nuave");
      const session = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(session?.selection).toMatchObject({
        category: "kedai kopi",
        categoryKind: "suggestion",
        origins: { category: "nuave" },
      });
      lanjut();
      await fromOfferings();
      expect(
        screen.getByRole("region", { name: "Kategori" }).textContent,
      ).toContain("Saran Nuave");
    },
  );

  it.each([
    [
      "produk",
      /Satu produk atau layanan/,
      "Produk atau layanan mana?",
      /kopi susu/,
      /roti/,
    ],
    [
      "cabang",
      /Satu lokasi/,
      "Cabang mana yang ingin diaudit?",
      /Kedai Fiksi Dago/,
      /Kedai Fiksi Cimahi/,
    ],
  ] as const)(
    "keeps an existing %s target editable from the summary",
    async (focus, scope, heading, first, replacement) => {
      stubPreparation({ draft: j5Draft });
      render(<SmartIntakeJourney live={false} />);
      await toFocusScreen();
      fireEvent.click(screen.getByRole("radio", { name: scope }));
      lanjut();
      await screen.findByRole("heading", { name: heading });
      fireEvent.click(screen.getByRole("radio", { name: first }));
      lanjut();
      await throughDetails(focus);
      fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
      await screen.findByRole("heading", {
        name: "Apa yang ingin Anda audit?",
      });
      lanjut();
      await screen.findByRole("heading", { name: heading });
      fireEvent.click(screen.getByRole("radio", { name: replacement }));
      lanjut();
      await screen.findByRole("heading", { name: /biasanya disebut apa\?/ });
      lanjut();
      await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
      expect(focusRow().getByText(replacement)).toBeTruthy();
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
    expect(
      within(group).getByRole("radio", { name: /kedai kopi/ }).textContent,
    ).toContain("Dari website Anda");
    const kafe = within(group).getByRole("radio", { name: /kafe/ });
    expect(kafe.textContent).toContain("Saran Nuave");
    fireEvent.click(kafe);
    expect(kafe.textContent).toContain("Dari Anda");
    fireEvent.click(
      screen.getByRole("button", { name: "Tulis kategori sendiri" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Kategori" }), {
      target: { value: "kedai kopi" },
    });
    expect(
      within(group).getByRole("radio", { name: /kedai kopi/ }).textContent,
    ).toContain("Dari Anda");
    lanjut();
    await fromOfferings();
    expect(
      screen.getByRole("region", { name: "Kategori" }).textContent,
    ).toContain("Dari Anda");
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
    fireEvent.click(
      within(screen.getByRole("region", { name: "Jangkauan pasar" })).getByRole(
        "button",
        { name: "Ubah" },
      ),
    );
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    const add = (value: string) => {
      fireEvent.change(
        screen.getByRole("textbox", { name: "Tambah area lain" }),
        { target: { value } },
      );
      fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    };
    add(" bandung ");
    add("Denpasar");
    add("DENPASAR");
    expect(
      parseSmartSession(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.selection?.marketAreas,
    ).toEqual([...areas, "Denpasar"]);
    expect(screen.queryByRole("alert")).toBeNull();
    add("Semarang");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "paling banyak 8",
    );
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
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
    // category — one card; "kafe" is the second suggestion.
    expect(radios).toHaveLength(2);
    const kafe = within(group).getByRole("radio", { name: /kafe/ });
    expect(kafe.textContent).toContain("Saran Nuave");
    expect(
      within(group)
        .getByRole("radio", { name: /kedai kopi/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(kafe);
    expect(kafe.getAttribute("aria-checked")).toBe("true");
    lanjut();
    await fromOfferings();
    const row = screen.getByRole("region", { name: "Kategori" });
    expect(row.textContent).toContain("kafe");
    expect(row.textContent).toContain("Dari Anda");
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
    const main = within(group).getByRole("radio", { name: /warung kopi/ });
    expect(main.textContent).toContain("Dari website Anda");
    expect(main.getAttribute("aria-checked")).toBe("true");
  });

  it("keeps an owner-typed category across a focus change (R-05)", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Tulis kategori sendiri" }),
    );
    const input = screen.getByRole("textbox", {
      name: "Kategori",
    }) as HTMLInputElement;
    // Char-by-char: at "kafe" the draft transiently equals a suggestion card;
    // typing must continue on the owner's own text.
    typeChars(input, "kafe hijau");
    expect(input.value).toBe("kafe hijau");
    lanjut();
    await fromOfferings();
    // Switch focus to a product target that carries its own suggestion: an
    // owner-entered category still wins over every suggestion (R-05).
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    // The category checkpoint is shown because the focus changed; the typed
    // value stays selected as the owner's own card.
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    const card = screen.getByRole("radio", { name: /kafe hijau/ });
    expect(card.getAttribute("aria-checked")).toBe("true");
    expect(card.textContent).toContain("Dari Anda");
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
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
    expect(
      screen.getByRole("region", { name: "Kategori" }).textContent,
    ).toContain("kafe");
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
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
    expect(productSuggestion.textContent).toContain("Saran Nuave");
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    expect(
      screen.getByRole("region", { name: "Kategori" }).textContent,
    ).toContain("minuman kopi siap tutup");
  });

  it("an unchanged focus edit exits the detour straight back to the summary", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    // Nothing changed: Lanjut returns to the review without re-walking the
    // detail screens.
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
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
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    const websiteGroup = screen.getByRole("group", {
      name: "Dari website Anda",
    });
    expect(
      within(websiteGroup)
        .getByRole("button", { name: /kopi susu/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // Deselect a prepared offering, then add an owner one.
    fireEvent.click(within(websiteGroup).getByRole("button", { name: /roti/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Penawaran lain" }), {
      target: { value: "es teh" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    const ownerGroup = screen.getByRole("group", { name: "Dari Anda" });
    expect(
      within(ownerGroup)
        .getByRole("button", { name: /es teh/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // Typing a prepared name selects the existing chip instead of
    // duplicating it.
    fireEvent.change(screen.getByRole("textbox", { name: "Penawaran lain" }), {
      target: { value: "Kopi Susu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect(
      within(websiteGroup).getAllByRole("button", { name: /kopi susu/i }),
    ).toHaveLength(1);
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa pelanggan utama Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
    await afterMarket();
    expect(
      screen.getByRole("region", { name: "Produk dan layanan" }).textContent,
    ).toContain("kopi susu, es teh");
  });

  it("shows the catalogue read-only under a product focus (R-14)", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa saja yang Anda tawarkan?",
    });
    const catalogue = screen.getByRole("list", {
      name: "Katalog penawaran",
    });
    expect(catalogue.textContent).toContain("kopi susu");
    expect(catalogue.textContent).toContain("Fokus audit");
    expect(catalogue.textContent).toContain("roti");
    // Read-only context: no toggles on the catalogue screen.
    expect(within(catalogue).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa pelanggan utama Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
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
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa pelanggan utama Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    // Nothing prepared: every card starts unchecked and Lanjut stays gated.
    const lanjutButton = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjutButton).toHaveProperty("disabled", true);
    expect(
      screen.getByText("Pilih setidaknya satu cara layanan."),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Digunakan secara online/ }),
    );
    expect(lanjutButton).toHaveProperty("disabled", false);
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
    await afterMarket();
    expect(
      screen.getByRole("region", { name: "Cara layanan" }).textContent,
    ).toContain("Digunakan secara online");
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
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa pelanggan utama Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    // No prepared reach — Lanjut is disabled until one is chosen.
    const lanjutButton = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjutButton).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("radio", { name: /Beberapa area/ }));
    const areas = screen.getByRole("group", { name: "Kota atau area" });
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
      fireEvent.click(within(areas).getByRole("button", { name }));
    }
    expect(lanjutButton).toHaveProperty("disabled", false);
    // A ninth area is refused with a visible block, not a silent drop.
    fireEvent.change(
      screen.getByRole("textbox", { name: "Tambah area lain" }),
      { target: { value: "Area 9" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "paling banyak 8",
    );
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.marketAreas).toHaveLength(8);
    expect(saved.selection.marketAreas).not.toContain("Area 9");
    // sekitar keeps exactly one: a second chip replaces the first.
    fireEvent.click(screen.getByRole("radio", { name: /Sekitar satu area/ }));
    expect(lanjutButton).toHaveProperty("disabled", true);
    fireEvent.click(within(areas).getByRole("button", { name: "Area 1" }));
    expect(lanjutButton).toHaveProperty("disabled", false);
    fireEvent.click(within(areas).getByRole("button", { name: "Area 2" }));
    const savedAfterSwitch = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(savedAfterSwitch.selection.marketAreas).toEqual(["Area 2"]);
    lanjut();
    await afterMarket();
    expect(
      screen.getByRole("region", { name: "Jangkauan pasar" }).textContent,
    ).toContain("Sekitar bisnis");
    expect(
      screen.getByRole("region", { name: "Jangkauan pasar" }).textContent,
    ).toContain("Area 2");
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
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Lokasi ini biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa pelanggan utama Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    lanjut();
    // Cabang focus skips market but still walks the J6 optional screens.
    await afterMarket();
    expect(
      screen.queryByRole("heading", {
        name: "Di mana pelanggan Anda berada?",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Jangkauan pasar" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    );
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
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
    fireEvent.click(
      within(
        screen.getByRole("region", { name: "Produk dan layanan" }),
      ).getByRole("button", { name: "Ubah" }),
    );
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    // Kembali exits the detour to the summary without touching the answer.
    kembali();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    fireEvent.click(
      within(
        screen.getByRole("region", { name: "Produk dan layanan" }),
      ).getByRole("button", { name: "Ubah" }),
    );
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    fireEvent.click(screen.getByRole("button", { name: /roti/ }));
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    expect(
      screen.getByRole("region", { name: "Produk dan layanan" }).textContent,
    ).toContain("kopi susu");
    expect(
      screen.getByRole("region", { name: "Produk dan layanan" }).textContent,
    ).not.toContain("roti");
  });

  it("the product summary edit reopens the product target and updates it", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa saja yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Siapa pelanggan utama Anda?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
    await afterMarket();

    const row = screen.getByRole("region", { name: "Produk dan layanan" });
    expect(row.textContent).toContain("kopi susu");
    fireEvent.click(within(row).getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /roti/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    expect(
      screen.getByRole("region", { name: "Produk dan layanan" }).textContent,
    ).toContain("roti");
    expect(
      screen.getByRole("region", { name: "Produk dan layanan" }).textContent,
    ).not.toContain("kopi susu");
  });

  it.each(["footer Kembali", "marked browser popstate"])(
    "a product summary edit returns to the summary through %s",
    async (backNavigation) => {
      stubPreparation({ draft: j5Draft });
      render(<SmartIntakeJourney live={false} />);
      await toFocusScreen();
      fireEvent.click(
        screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
      );
      lanjut();
      await screen.findByRole("heading", {
        name: "Produk atau layanan mana?",
      });
      fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
      lanjut();
      await screen.findByRole("heading", {
        name: "Produk atau layanan ini biasanya disebut apa?",
      });
      lanjut();
      await screen.findByRole("heading", {
        name: "Apa saja yang Anda tawarkan?",
      });
      lanjut();
      await screen.findByRole("heading", {
        name: "Siapa pelanggan utama Anda?",
      });
      lanjut();
      await screen.findByRole("heading", {
        name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
      });
      lanjut();
      await screen.findByRole("heading", {
        name: "Apa yang dipertimbangkan pelanggan saat memilih?",
      });
      lanjut();
      await screen.findByRole("heading", {
        name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
      });
      lanjut();
      await screen.findByRole("heading", {
        name: "Di mana pelanggan Anda berada?",
      });
      lanjut();
      await afterMarket();

      const row = screen.getByRole("region", { name: "Produk dan layanan" });
      fireEvent.click(within(row).getByRole("button", { name: "Ubah" }));
      await screen.findByRole("heading", {
        name: "Produk atau layanan mana?",
      });
      const editing = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(editing?.editReturn).toBe("summary");
      expect(editing?.editBaseline).toBeUndefined();
      expect(editing?.selection?.productTarget).toBe("kopi susu");

      if (backNavigation === "footer Kembali") {
        kembali();
      } else {
        fireEvent.popState(window, { state: { nuaveIntake: true } });
      }

      await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
      expect(
        screen.getByRole("region", { name: "Produk dan layanan" }).textContent,
      ).toContain("kopi susu");
      const returned = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
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
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
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
    fireEvent.click(
      screen.getByRole("button", { name: "Tulis kategori sendiri" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Kategori" }), {
      target: { value: "nomor rekening 12345" },
    });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
    lanjut();
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Penawaran lain" }), {
      target: { value: "nomor rekening 12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.offerings).not.toContain("nomor rekening 12345");
  });
});

describe("Spec 013 J7 final review", () => {
  const aliasDraft = {
    ...draft,
    brand_name_variants: ["Kedai Fiksi Pusat", "KopiFiksi"],
  };
  const namaLain = () =>
    within(screen.getByRole("region", { name: "Nama lain" }));
  const aliasInput = () =>
    screen.getByRole("textbox", { name: "Nama lain baru" }) as HTMLInputElement;
  const addAlias = (value: string) => {
    fireEvent.change(aliasInput(), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah" }));
  };
  const confirm = () =>
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    );
  const savedSession = () =>
    parseSmartSession(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY));

  it("reads the business name back without inline name controls", async () => {
    stubPreparation({ draft: aliasDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    const heading = await screen.findByRole("heading", {
      name: "Ini yang akan Nuave audit",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(
      document
        .querySelector('[data-intake-screen="review"]')
        ?.getAttribute("data-smart-summary"),
    ).toBe("ready");
    const business = within(screen.getByRole("region", { name: "Bisnis" }));
    // The review is read-back only — name corrections route to the brand
    // check, website changes to the entry (J7/R-21).
    expect(business.queryByRole("radio")).toBeNull();
    expect(business.getByText("Kedai Fiksi")).toBeTruthy();
    expect(business.getByText(/kedai-fiksi\.example/)).toBeTruthy();
    expect(business.getByRole("button", { name: "Ubah" })).toBeTruthy();
    expect(business.getByRole("button", { name: "Ubah website" })).toBeTruthy();
    // Prepared aliases arrive with their website provenance.
    expect(namaLain().getByText("Kedai Fiksi Pusat, KopiFiksi")).toBeTruthy();
    expect(namaLain().getByText("Dari website Anda")).toBeTruthy();
  });

  it.each(["Lanjut", "footer Kembali", "marked browser popstate"])(
    "a review brand edit returns through %s with the marker consumed",
    async (wayBack) => {
      const { calls } = stubPreparation();
      render(<SmartIntakeJourney live={false} />);
      await fillAndPeriksa();
      await throughBrand();
      fireEvent.click(
        within(screen.getByRole("region", { name: "Bisnis" })).getByRole(
          "button",
          { name: "Ubah" },
        ),
      );
      await screen.findByRole("heading", {
        name: "Ini brand yang ingin Anda audit?",
      });
      expect(savedSession()).toMatchObject({ editReturn: "summary" });
      // Correcting the name on the existing brand check spends no calls.
      fireEvent.click(screen.getByRole("button", { name: "Ubah nama" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Nama brand" }), {
        target: { value: "Kedai Fiksi Baru" },
      });
      if (wayBack === "Lanjut") lanjut();
      else if (wayBack === "footer Kembali") kembali();
      else fireEvent.popState(window, { state: { nuaveIntake: true } });
      await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
      const stored = savedSession();
      expect(stored?.stage).toBe("summary");
      // Consumed markers are dropped from the stored session entirely.
      expect(stored?.editReturn).toBeUndefined();
      expect(stored?.editBaseline).toBeUndefined();
      expect(
        screen.getByRole("region", { name: "Bisnis" }).textContent,
      ).toContain("Kedai Fiksi Baru");
      expect(calls).toEqual(["identity", "/api/audit/extract"]);
    },
  );

  it("edits Nama lain inline, marks the owner change and persists it over a reload", async () => {
    stubPreparation({ draft: aliasDraft });
    const mounted = render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
    addAlias("Kedai Fiksi Baru");
    expect(aliasInput().value).toBe("");
    expect(savedSession()?.selection?.aliases).toEqual([
      "Kedai Fiksi Pusat",
      "KopiFiksi",
      "Kedai Fiksi Baru",
    ]);
    expect(savedSession()?.selection?.origins.aliases).toBe("owner");
    // A reload restores the review with the committed list.
    mounted.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
    const group = () => namaLain().getByRole("group", { name: "Nama lain" });
    // Removing a chip drops exactly that alias.
    fireEvent.click(within(group()).getByRole("button", { name: /KopiFiksi/ }));
    expect(savedSession()?.selection?.aliases).toEqual([
      "Kedai Fiksi Pusat",
      "Kedai Fiksi Baru",
    ]);
    // An emptied list is valid and shows no provenance badge (J6 rule).
    fireEvent.click(
      within(group()).getByRole("button", { name: /Kedai Fiksi Pusat/ }),
    );
    fireEvent.click(
      within(group()).getByRole("button", { name: /Kedai Fiksi Baru/ }),
    );
    expect(namaLain().getByText("Belum diisi")).toBeTruthy();
    expect(namaLain().queryByText(/Dari |Saran Nuave/)).toBeNull();
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
      fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
      addAlias(value);
      expect((await screen.findByRole("alert")).textContent).toContain(message);
      // The refused draft stays in the AddLine for a one-stroke fix.
      expect(aliasInput().value).toBe(value);
      expect(savedSession()?.selection?.aliases).toEqual([
        "Kedai Fiksi Pusat",
        "KopiFiksi",
      ]);
      fireEvent.change(aliasInput(), { target: { value: "Nama Ketiga" } });
      fireEvent.click(screen.getByRole("button", { name: "Tambah" }));
      expect(aliasInput().value).toBe("");
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
    fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
    addAlias("Varian Ke-13");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Pilih paling banyak 12 nama lain.",
    );
    expect(aliasInput().value).toBe("Varian Ke-13");
    expect(savedSession()?.selection?.aliases).toEqual(twelve);
  });

  it("keeps a sensitive alias out of selection, storage and any request", async () => {
    const { calls, fetchMock } = stubPreparation({ draft: aliasDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
    addAlias("nomor rekening 12345");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    // The rejected draft stays; nothing unsafe is committed or stored.
    expect(aliasInput().value).toBe("nomor rekening 12345");
    expect(savedSession()?.selection?.aliases).toEqual([
      "Kedai Fiksi Pusat",
      "KopiFiksi",
    ]);
    expect(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
    ).not.toContain("nomor rekening");
    // Editing alone never asks for questions; a later explicit confirm sends
    // only the last safe list.
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
    confirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
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
    fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
    addAlias("Alias Pemilik");
    fireEvent.click(
      within(screen.getByRole("region", { name: "Bisnis" })).getByRole(
        "button",
        { name: "Ubah website" },
      ),
    );
    const name = await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.change(name, { target: { value: "Kedai Fiksi Baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    // No preparation call, and every answer — aliases included — is retained.
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
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
    fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
    addAlias("Kedai Fiksi Baru");
    fireEvent.click(
      within(screen.getByRole("region", { name: "Bisnis" })).getByRole(
        "button",
        { name: "Ubah website" },
      ),
    );
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect(savedSession()).toMatchObject({
      stage: "entry",
      editReturn: "summary",
    });
    // Typing a different URL resets on input change, not on submit.
    fireEvent.change(
      screen.getByRole("textbox", { name: "URL website publik" }),
      { target: { value: "https://kedai-baru.example/" } },
    );
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
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    lanjut();
    // The marker is gone: the flow walks the normal chain, not the review.
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    expect(calls).toEqual([
      "identity",
      "/api/audit/extract",
      "identity",
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
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    // Reach the gap state through a restored session: the service screen
    // gates Lanjut, so a normal walk cannot leave serviceChannels empty.
    const stored = savedSession()!;
    mounted.unmount();
    window.sessionStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({
        ...stored,
        selection: { ...stored.selection, serviceChannels: [] },
      }),
    );
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    expect(screen.getByText(/Perlu dipastikan: Cara layanan/)).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    ).toBeNull();
    // The CTA opens the owning screen directly, marked to return here.
    fireEvent.click(
      screen.getByRole("button", { name: "Lengkapi yang perlu dipastikan" }),
    );
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    expect(savedSession()?.editReturn).toBe("summary");
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Di lokasi bisnis Anda/ }),
    );
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    expect(
      screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    ).toBeTruthy();
  });

  it("confirms once, reuses the pack unchanged, regenerates on an alias edit and restores on cancel", async () => {
    const { fetchMock } = stubPreparation({ draft: aliasDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
    addAlias("Kedai Fiksi Baru");
    const glmCalls = () =>
      fetchMock.mock.calls.filter(
        (call) => call[0] === "/api/audit/glm-questions",
      );
    // A rapid double press: the first click moves the journey off the review,
    // so the second dispatch lands on the detached button and no-ops.
    const confirmButton = screen.getByRole("button", {
      name: "Sudah sesuai — buat pertanyaan audit",
    });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(glmCalls()).toHaveLength(1);
    expect(
      JSON.parse(String(glmCalls()[0]?.[1]?.body)).intake.context.identity
        .aliases,
    ).toEqual(["Kedai Fiksi Pusat", "KopiFiksi", "Kedai Fiksi Baru"]);
    // An unchanged return reuses the pack — no new request.
    const backToReview = () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Kembali ke informasi bisnis" }),
      );
    backToReview();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    confirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(glmCalls()).toHaveLength(1);
    // An alias change freezes a different context and generates a new pack.
    backToReview();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
    fireEvent.click(
      within(namaLain().getByRole("group", { name: "Nama lain" })).getByRole(
        "button",
        { name: /KopiFiksi/ },
      ),
    );
    confirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(glmCalls()).toHaveLength(2);
    expect(
      JSON.parse(String(glmCalls()[1]?.[1]?.body)).intake.context.identity
        .aliases,
    ).toEqual(["Kedai Fiksi Pusat", "Kedai Fiksi Baru"]);
    // A further edit cancelled from the review restores the confirmed list.
    backToReview();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    fireEvent.click(namaLain().getByRole("button", { name: "Ubah" }));
    addAlias("Draft Tidak Jadi");
    fireEvent.click(screen.getByRole("button", { name: "Batalkan perubahan" }));
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
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
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    expect(namaLain().getByText("KopiFiksi")).toBeTruthy();
    expect(savedSession()?.stage).toBe("summary");
    expect(calls).toEqual(["identity", "/api/audit/extract"]);

    confirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(calls).toEqual([
      "identity",
      "/api/audit/extract",
      "/api/audit/glm-questions",
    ]);
  });

  it.each(["footer Kembali", "marked browser popstate"])(
    "corrects an empty business name after %s returns to review",
    async (wayBack) => {
      const { calls } = stubPreparation({ draft: aliasDraft });
      render(<SmartIntakeJourney live={false} />);
      await fillAndPeriksa();
      await throughBrand();
      const originalSelection = savedSession()?.selection;
      expect(originalSelection).toBeTruthy();

      fireEvent.click(
        within(screen.getByRole("region", { name: "Bisnis" })).getByRole(
          "button",
          { name: "Ubah" },
        ),
      );
      await screen.findByRole("heading", {
        name: "Ini brand yang ingin Anda audit?",
      });
      fireEvent.click(screen.getByRole("button", { name: "Ubah nama" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Nama brand" }), {
        target: { value: "   " },
      });
      if (wayBack === "footer Kembali") kembali();
      else fireEvent.popState(window, { state: { nuaveIntake: true } });
      await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
      expect(screen.getByText(/Perlu dipastikan: Nama bisnis/)).toBeTruthy();
      expect(
        screen.queryByRole("button", {
          name: "Sudah sesuai — buat pertanyaan audit",
        }),
      ).toBeNull();

      fireEvent.click(
        screen.getByRole("button", { name: "Lengkapi yang perlu dipastikan" }),
      );
      await screen.findByRole("heading", {
        name: "Ini brand yang ingin Anda audit?",
      });
      fireEvent.change(screen.getByRole("textbox", { name: "Nama brand" }), {
        target: { value: "Kedai Fiksi Benar" },
      });
      lanjut();
      await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
      expect(savedSession()?.selection).toEqual({
        ...originalSelection,
        name: "Kedai Fiksi Benar",
        nameOrigin: "owner",
      });
      expect(savedSession()?.editReturn).toBeUndefined();
      expect(
        screen.getByRole("button", {
          name: "Sudah sesuai — buat pertanyaan audit",
        }),
      ).toBeTruthy();
      expect(calls).toEqual(["identity", "/api/audit/extract"]);
    },
  );
});

const jqDraft = {
  ...j5Draft,
  target_customer: "pekerja sekitar",
  verified_decision_criteria: ["lokasi"],
  usp: "Racikan kopi rumahan fiktif",
};

const jqRows = [
  ["Pelanggan sasaran", "Siapa pelanggan utama Anda?"],
  ["Pertimbangan pembeli", "Apa yang dipertimbangkan pelanggan saat memilih?"],
  ["Pembeda bisnis", "Apa yang membedakan bisnis Anda?"],
] as const;

const jqRow = (name: string) => within(screen.getByRole("region", { name }));

const jqEdit = (name: string) =>
  fireEvent.click(jqRow(name).getByRole("button", { name: "Ubah" }));

const jqSession = () =>
  parseSmartSession(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY));

const jqConfirm = () =>
  fireEvent.click(
    screen.getByRole("button", {
      name: "Sudah sesuai — buat pertanyaan audit",
    }),
  );

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
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    lanjut();
    await screen.findByRole("heading", { name: /biasanya disebut apa\?$/ });
    lanjut();
    await screen.findByRole("heading", { name: /yang Anda tawarkan\?$/ });
    lanjut();
    const target = await screen.findByRole("heading", {
      name: "Siapa pelanggan utama Anda?",
    });
    await waitFor(() => expect(document.activeElement).toBe(target));
    expect(
      (screen.getByRole("button", { name: "Lanjut" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    lanjut();
    await screen.findByRole("heading", {
      name: "Kenapa pelanggan biasanya mencari yang seperti ini?",
    });
    lanjut();
    const considerations = await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    await waitFor(() => expect(document.activeElement).toBe(considerations));
    expect(screen.queryByRole("group", { name: "Saran Nuave" })).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Lanjut" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Ini yang mungkin dibandingkan dengan Anda",
    });
    lanjut();
    const differentiator = await screen.findByRole("heading", {
      name: "Apa yang membedakan bisnis Anda?",
    });
    await waitFor(() => expect(document.activeElement).toBe(differentiator));
    expect(
      (screen.getByRole("button", { name: "Lanjut" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa yang tidak boleh salah dipahami tentang brand Anda?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    for (const row of [
      "Pelanggan sasaran",
      "Pertimbangan pembeli",
      "Pembeda bisnis",
    ]) {
      expect(jqRow(row).getByText("Belum diisi.")).toBeTruthy();
      expect(jqRow(row).queryByText("Saran Nuave")).toBeNull();
      expect(jqRow(row).queryByText("Dari Anda")).toBeNull();
      expect(jqRow(row).queryByText("Dari website Anda")).toBeNull();
    }
    jqConfirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
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
    await throughBrand();
    expect(
      jqRow("Pelanggan sasaran").getByText("pekerja sekitar"),
    ).toBeTruthy();
    expect(jqRow("Pelanggan sasaran").getByText("Saran Nuave")).toBeTruthy();
    expect(jqRow("Pertimbangan pembeli").getByText("lokasi")).toBeTruthy();
    expect(jqRow("Pertimbangan pembeli").getByText("Saran Nuave")).toBeTruthy();
    expect(
      jqRow("Pembeda bisnis").getByText("Racikan kopi rumahan fiktif"),
    ).toBeTruthy();
    expect(jqRow("Pembeda bisnis").getByText("Saran Nuave")).toBeTruthy();
    jqEdit("Pelanggan sasaran");
    await screen.findByRole("heading", { name: "Siapa pelanggan utama Anda?" });
    expect(
      (
        screen.getByRole("textbox", {
          name: /Pelanggan sasaran/,
        }) as HTMLInputElement
      ).value,
    ).toBe("pekerja sekitar");
    expect(screen.getByText("Saran Nuave")).toBeTruthy();
    kembali();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pertimbangan pembeli");
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    expect(
      within(screen.getByRole("group", { name: "Saran Nuave" }))
        .getByRole("button", { name: "lokasi" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    kembali();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pembeda bisnis");
    await screen.findByRole("heading", {
      name: "Apa yang membedakan bisnis Anda?",
    });
    expect(
      (
        screen.getByRole("textbox", {
          name: /Pembeda bisnis/,
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Racikan kopi rumahan fiktif");
    expect(screen.getByText("Saran Nuave")).toBeTruthy();
    kembali();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqConfirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(calls).toEqual([
      "identity",
      "/api/audit/extract",
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
    jqEdit("Pelanggan sasaran");
    await screen.findByRole("heading", { name: "Siapa pelanggan utama Anda?" });
    fireEvent.change(
      screen.getByRole("textbox", { name: /Pelanggan sasaran/ }),
      { target: { value: "keluarga sekitar" } },
    );
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pertimbangan pembeli");
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    fireEvent.click(screen.getByRole("button", { name: "lokasi" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Pertimbangan pembeli lain" }),
      { target: { value: "jam buka" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Tambah" }));
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pembeda bisnis");
    await screen.findByRole("heading", {
      name: "Apa yang membedakan bisnis Anda?",
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Pembeda bisnis/ }), {
      target: { value: "Pilihan roti rumahan fiktif" },
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqConfirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
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
    await fillAndPeriksa();
    await throughBrand();
    jqEdit("Pertimbangan pembeli");
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    const input = screen.getByRole("textbox", {
      name: "Pertimbangan pembeli lain",
    }) as HTMLInputElement;
    const tambah = () => screen.getByRole("button", { name: "Tambah" });
    const lokasi = screen.getByRole("button", { name: "lokasi" });
    fireEvent.click(lokasi);
    expect(lokasi.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(lokasi);
    expect(lokasi.getAttribute("aria-pressed")).toBe("true");
    // Enter commits an owner consideration.
    fireEvent.change(input, { target: { value: "jam buka" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("");
    const ownerChip = within(
      screen.getByRole("group", { name: "Dari Anda" }),
    ).getByRole("button", { name: "jam buka" });
    expect(ownerChip.getAttribute("aria-pressed")).toBe("true");
    // A trimmed case-insensitive duplicate is refused; the draft stays.
    fireEvent.change(input, { target: { value: "  JAM BUKA " } });
    fireEvent.click(tambah());
    expect((await screen.findByRole("alert")).textContent).toContain(
      "sudah dipilih",
    );
    expect(input.value).toBe("  JAM BUKA ");
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
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(input.value).toBe("nomor rekening 12345");
    expect(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
    // Removing an owner chip is one click.
    fireEvent.click(
      within(screen.getByRole("group", { name: "Dari Anda" })).getByRole(
        "button",
        { name: "jam buka" },
      ),
    );
    expect(
      within(screen.getByRole("group", { name: "Dari Anda" })).queryByRole(
        "button",
        { name: "jam buka" },
      ),
    ).toBeNull();
    expect(jqSession()?.selection?.decisionConsiderations).toEqual([
      "lokasi",
      "x".repeat(300),
    ]);
  });

  it("shows the current consideration error after privacy and duplicate refusals", async () => {
    const { fetchMock } = stubPreparation({ draft: jqDraft });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    jqEdit("Pertimbangan pembeli");
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    const input = screen.getByRole("textbox", {
      name: "Pertimbangan pembeli lain",
    }) as HTMLInputElement;
    const enter = (value: string) => {
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: "Enter" });
    };
    enter("jam buka");
    expect(input.value).toBe("");
    // A sensitive draft is refused: privacy notice, draft kept, nothing stored.
    enter("nomor rekening 12345");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(input.value).toBe("nomor rekening 12345");
    expect(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
    // A current safe duplicate shows its own message, not the stale privacy one.
    enter("  JAM BUKA ");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Pertimbangan ini sudah dipilih.",
    );
    expect(input.value).toBe("  JAM BUKA ");
    expect(jqSession()?.selection?.decisionConsiderations).toEqual([
      "lokasi",
      "jam buka",
    ]);
    // Sensitive again: the privacy notice supersedes the duplicate message.
    enter("nomor rekening 12345");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    // A 301-character safe draft shows the length correction instead.
    enter("y".repeat(301));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "300 karakter",
    );
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
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqConfirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
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
    await fillAndPeriksa();
    await throughBrand();
    jqEdit("Pertimbangan pembeli");
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    const input = screen.getByRole("textbox", {
      name: "Pertimbangan pembeli lain",
    }) as HTMLInputElement;
    const tambah = () => screen.getByRole("button", { name: "Tambah" });
    fireEvent.change(input, { target: { value: "Ke-13" } });
    fireEvent.click(tambah());
    expect((await screen.findByRole("alert")).textContent).toContain(
      "paling banyak 12",
    );
    expect(input.value).toBe("Ke-13");
    expect(jqSession()?.selection?.decisionConsiderations).toHaveLength(12);
    // Freeing a slot lets the owner value in.
    fireEvent.click(screen.getByRole("button", { name: "Pertimbangan 1" }));
    fireEvent.click(tambah());
    expect(input.value).toBe("");
    expect(jqSession()?.selection?.decisionConsiderations).toContain("Ke-13");
    expect(jqSession()?.selection?.decisionConsiderations).toHaveLength(12);
  });

  for (const [row, heading] of jqRows)
    it.each(["Lanjut", "footer Kembali", "marked browser popstate"])(
      `the ${row} edit returns to the review through %s`,
      async (wayBack) => {
        const { calls } = stubPreparation({ draft: jqDraft });
        render(<SmartIntakeJourney live={false} />);
        await fillAndPeriksa();
        await throughBrand();
        jqEdit(row);
        await screen.findByRole("heading", { name: heading });
        const editing = jqSession();
        expect(editing?.editReturn).toBe("summary");
        expect(editing?.editBaseline).toBeUndefined();
        if (wayBack === "Lanjut") lanjut();
        else if (wayBack === "footer Kembali") kembali();
        else fireEvent.popState(window, { state: { nuaveIntake: true } });
        await screen.findByRole("heading", {
          name: "Ini yang akan Nuave audit",
        });
        const returned = jqSession();
        expect(returned?.editReturn).toBeUndefined();
        expect(returned?.editBaseline).toBeUndefined();
        // Prepared answers survive the detour; no preparation repeated.
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
        expect(calls).toEqual(["identity", "/api/audit/extract"]);
      },
    );

  for (const [row, heading] of jqRows)
    it(`a reload restores the ${row} screen with its answers and heading focus`, async () => {
      stubPreparation({ draft: jqDraft });
      const first = render(<SmartIntakeJourney live={false} />);
      await fillAndPeriksa();
      await throughBrand();
      jqEdit(row);
      await screen.findByRole("heading", { name: heading });
      first.unmount();
      render(<SmartIntakeJourney live={false} />);
      const restored = await screen.findByRole("heading", { name: heading });
      await waitFor(() => expect(document.activeElement).toBe(restored));
      if (row === "Pelanggan sasaran")
        expect(
          (
            screen.getByRole("textbox", {
              name: /Pelanggan sasaran/,
            }) as HTMLInputElement
          ).value,
        ).toBe("pekerja sekitar");
      else if (row === "Pertimbangan pembeli")
        expect(
          within(screen.getByRole("group", { name: "Saran Nuave" }))
            .getByRole("button", { name: "lokasi" })
            .getAttribute("aria-pressed"),
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
      window.sessionStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify({ ...jqStored(), ...patch }),
      );
      stubPreparation();
      render(<SmartIntakeJourney live={false} />);
      const name = (await screen.findByRole("textbox", {
        name: "Nama bisnis",
      })) as HTMLInputElement;
      expect(name.value).toBe("");
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
    jqEdit("Pelanggan sasaran");
    await screen.findByRole("heading", { name: "Siapa pelanggan utama Anda?" });
    fireEvent.change(
      screen.getByRole("textbox", { name: /Pelanggan sasaran/ }),
      { target: { value: "keluarga sekitar" } },
    );
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pertimbangan pembeli");
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    fireEvent.click(screen.getByRole("button", { name: "lokasi" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Pertimbangan pembeli lain" }),
      { target: { value: "jam buka" } },
    );
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Pertimbangan pembeli lain" }),
      { key: "Enter" },
    );
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pembeda bisnis");
    await screen.findByRole("heading", {
      name: "Apa yang membedakan bisnis Anda?",
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Pembeda bisnis/ }), {
      target: { value: "Pilihan roti rumahan fiktif" },
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    // A name-only edit on the same source preserves the JQ answers.
    fireEvent.click(
      jqRow("Bisnis").getByRole("button", { name: "Ubah website" }),
    );
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
      target: { value: "Kedai Fiksi Cabang" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
    expect(jqSession()?.selection).toMatchObject({
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
    fireEvent.click(
      jqRow("Bisnis").getByRole("button", { name: "Ubah website" }),
    );
    await screen.findByRole("textbox", { name: "URL website publik" });
    fireEvent.change(
      screen.getByRole("textbox", { name: "URL website publik" }),
      { target: { value: "https://kedai-baru.example/" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    expect(calls).toEqual([
      "identity",
      "/api/audit/extract",
      "identity",
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
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    const glmCalls = () =>
      fetchMock.mock.calls.filter(
        (call) => call[0] === "/api/audit/glm-questions",
      );
    expect(glmCalls()).toHaveLength(1);
    const backToReview = () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Kembali ke informasi bisnis" }),
      );
    backToReview();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqConfirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(glmCalls()).toHaveLength(1);
    // A changed JQ meaning invalidates pack reuse.
    backToReview();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pembeda bisnis");
    await screen.findByRole("heading", {
      name: "Apa yang membedakan bisnis Anda?",
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Pembeda bisnis/ }), {
      target: { value: "Pilihan roti rumahan fiktif" },
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqConfirm();
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(glmCalls()).toHaveLength(2);
    expect(
      JSON.parse(String(glmCalls()[1]?.[1]?.body)).intake.context
        .differentiator,
    ).toEqual({ value: "Pilihan roti rumahan fiktif", origin: "owner" });
    // Cancelling a further edit restores the confirmed answers and the pack.
    backToReview();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pelanggan sasaran");
    await screen.findByRole("heading", { name: "Siapa pelanggan utama Anda?" });
    fireEvent.change(
      screen.getByRole("textbox", { name: /Pelanggan sasaran/ }),
      { target: { value: "wisatawan" } },
    );
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pertimbangan pembeli");
    await screen.findByRole("heading", {
      name: "Apa yang dipertimbangkan pelanggan saat memilih?",
    });
    fireEvent.click(screen.getByRole("button", { name: "lokasi" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Pertimbangan pembeli lain" }),
      { target: { value: "jam buka" } },
    );
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Pertimbangan pembeli lain" }),
      { key: "Enter" },
    );
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    jqEdit("Pembeda bisnis");
    await screen.findByRole("heading", {
      name: "Apa yang membedakan bisnis Anda?",
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Pembeda bisnis/ }), {
      target: { value: "Pembeda sementara fiktif" },
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang akan Nuave audit" });
    expect(jqSession()?.selection).toMatchObject({
      targetCustomer: "wisatawan",
      decisionConsiderations: ["jam buka"],
      differentiator: "Pembeda sementara fiktif",
    });
    fireEvent.click(screen.getByRole("button", { name: "Batalkan perubahan" }));
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
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
