import { describe, expect, it } from "vitest";
import type { GlmQuestionsOutcome } from "./local-questions";
import {
  projectQuestionOutcome,
  questionPublicCost,
  questionPublicMessage,
  questionPreflightError,
  questionUnexpectedError,
  questionRateLimitRefusal,
} from "./question-public-errors";

const unavailable =
  "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.";
const unusable =
  "Respons pembuatan pertanyaan tidak dapat digunakan. Coba siapkan pertanyaan lagi.";
const interrupted =
  "Permintaan pembuatan pertanyaan terputus. Pertanyaan mungkin sudah dibuat, tetapi belum diterima.";
const synthetic =
  "Permintaan pembuatan pertanyaan terputus. Pertanyaan belum diterima.";
const provenance = {
  requestId: "local-glm-mock-a1",
  method: "direct-ten" as const,
  requestedModel: "glm-5.3-flash",
  returnedModel: "MOCK_ONLY_MODEL",
  responseId: "MOCK_ONLY_RESPONSE",
  modelMismatch: true,
  transport: "cheaper-inference" as const,
};
function failure(
  reason = "provider_error",
  cost: number | null = null,
): GlmQuestionsOutcome {
  return {
    status: "failed",
    reason,
    detail: "MOCK_ONLY_DETAIL",
    provenance,
    providerContact: "responded",
    cost: { billedUsd: cost, available: cost !== null },
    diagnostics: {
      usage: null,
      httpStatus: 503,
      finishReason: "other",
      instructionVersion: "MOCK_ONLY_DIAGNOSTIC",
    },
  };
}
describe("PR121 pure public projection", () => {
  it("recognizes only the two established statusless rate-limit wire codes", () => {
    for (const code of ["RATE_LIMITED", "RATE_LIMIT_UNAVAILABLE"]) {
      expect(
        questionRateLimitRefusal({ error: "application error", code }),
      ).toBe(true);
      expect(
        questionRateLimitRefusal({
          status: "validation_failed",
          error: "application error",
          code,
        }),
      ).toBe(false);
    }
    for (const value of [
      null,
      {},
      { error: "MOCK_ONLY", code: "MOCK_ONLY_UNKNOWN" },
      { error: "MOCK_ONLY", code: "RATE_LIMITED_EXTRA" },
      { error: "MOCK_ONLY", status: 503 },
      { code: "RATE_LIMITED" },
    ])
      expect(questionRateLimitRefusal(value)).toBe(false);
  });
  it.each([0.004, 0, null])(
    "withholds validation provenance without dropping settled cost %s",
    (billedUsd) => {
      const internal: GlmQuestionsOutcome = {
        status: "validation_failed",
        questions: ["MOCK_ONLY_QUESTION"],
        issues: ["MOCK_ONLY_ISSUE"],
        provenance: {
          ...provenance,
          requestId: "MOCK_ONLY_INVALID_REQUEST_ID",
        },
        cost: { billedUsd, available: billedUsd !== null },
      };
      const before = JSON.stringify(internal);
      const publicJson = JSON.stringify(projectQuestionOutcome(internal));
      expect(publicJson).not.toContain("MOCK_ONLY");
      expect(JSON.parse(publicJson)).not.toHaveProperty("provenance");
      expect(JSON.parse(publicJson)).toMatchObject({
        status: "validation_failed",
        identitiesWithheld: true,
        questions: [],
        cost: { billedUsd, available: billedUsd !== null },
      });
      expect(JSON.stringify(internal)).toBe(before);
    },
  );

  it.each([
    [
      "incomplete",
      "Penyusunan 10 pertanyaan belum selesai. Jawaban Anda tetap tersedia dalam sesi ini. Coba siapkan pertanyaan lagi.",
    ],
    [
      "provider_error",
      "Layanan pembuatan pertanyaan sedang mengalami kendala. Coba lagi nanti.",
    ],
    [
      "http_error",
      "Layanan pembuatan pertanyaan sedang mengalami kendala. Coba lagi nanti.",
    ],
    [
      "refusal",
      "Pertanyaan tidak dapat dibuat dari informasi ini. Periksa kembali informasi bisnis Anda.",
    ],
    ["malformed", unusable],
    ["empty_text", unusable],
    ["extraction_missing_marker", unusable],
    ["extraction_duplicate_marker", unusable],
    ["extraction_marker_order", unusable],
    ["extraction_unexpected_preamble", unusable],
    ["extraction_unexpected_line", unusable],
    ["extraction_bad_numbering", unusable],
    [
      "provenance",
      "Asal respons pembuatan pertanyaan tidak dapat diverifikasi. Pertanyaan belum dapat digunakan.",
    ],
    [
      "attempt_not_frozen",
      "Permintaan pembuatan pertanyaan ini belum dapat dikirim. Periksa kembali konfirmasi Anda.",
    ],
    [
      "input_changed",
      "Permintaan pembuatan pertanyaan ini belum dapat dikirim. Periksa kembali konfirmasi Anda.",
    ],
    [
      "request_changed",
      "Permintaan pembuatan pertanyaan ini belum dapat dikirim. Periksa kembali konfirmasi Anda.",
    ],
    [
      "attempt_consumed",
      "Permintaan ini tidak dapat dikirim ulang. Tidak ada permintaan baru yang dikirim.",
    ],
    ["live_credential_missing", unavailable],
    ["evidence", unavailable],
    ["internal_error", unavailable],
    ["MOCK_ONLY_UNKNOWN", unavailable],
    ["extraction_MOCK_ONLY", unavailable],
    ["__proto__", unavailable],
    ["constructor", unavailable],
  ])("uses only the defined map for %s", (reason, message) => {
    const internal = failure(reason);
    const before = JSON.stringify(internal);
    const projected = projectQuestionOutcome(internal);
    expect(questionPublicMessage(projected)).toBe(message);
    expect(JSON.stringify(projected)).not.toContain("MOCK_ONLY");
    expect(JSON.stringify(internal)).toBe(before);
    expect(projected).toMatchObject({
      identitiesWithheld: true,
      provenance: {
        returnedModel: null,
        responseId: null,
        modelMismatch: true,
      },
    });
    if (
      reason === "MOCK_ONLY_UNKNOWN" ||
      reason === "extraction_MOCK_ONLY" ||
      reason === "__proto__" ||
      reason === "constructor"
    )
      expect(projected).toHaveProperty("reason", "internal_error");
  });
  it.each([null, 0, 0.003])("retains separately validated cost %s", (cost) => {
    expect(
      projectQuestionOutcome(failure("provider_error", cost)),
    ).toHaveProperty("cost", { billedUsd: cost, available: cost !== null });
  });
  it.each(["0", -1, NaN, Infinity, true])(
    "never coerces or settles invalid cost %s",
    (billedUsd) => {
      expect(
        questionPublicCost({ cost: { billedUsd, available: true } }),
      ).toBeUndefined();
    },
  );
  it("withholds hostile values in fields reserved for fixed application provenance", () => {
    const internal = failure();
    if (internal.status !== "failed") throw new Error("fixture");
    internal.provenance = {
      ...provenance,
      requestId: "MOCK_ONLY_NOT_SERVER_GENERATED",
      requestedModel: "MOCK_ONLY_NOT_FIXED",
    };
    const projected = projectQuestionOutcome(internal);
    expect(JSON.stringify(projected)).not.toContain("MOCK_ONLY");
    expect(internal.provenance.requestedModel).toBe("MOCK_ONLY_NOT_FIXED");
    expect(projected).toHaveProperty("providerContact", "responded");
  });
  it("keeps transport presentation independent of cost and current props when transport is known", () => {
    for (const reason of ["transport", "evidence"])
      for (const live of [true, false, undefined])
        for (const billedUsd of [null, 0, 0.01]) {
          for (const transport of ["cheaper-inference", "synthetic-stub"])
            expect(
              questionPublicMessage(
                {
                  status: "failed",
                  reason,
                  providerContact: "sent",
                  provenance: { transport },
                  cost: { billedUsd },
                },
                live,
              ),
            ).toBe(transport === "synthetic-stub" ? synthetic : interrupted);
        }
    expect(
      questionPublicMessage({ status: "failed", reason: "transport" }, false),
    ).toBe(synthetic);
    expect(
      questionPublicMessage({ status: "failed", reason: "transport" }),
    ).toBe(interrupted);
  });
  it.each([
    ["INVALID_METHOD", "Permintaan pembuatan pertanyaan tidak valid."],
    [
      "STALE_INTAKE",
      "Versi konfirmasi bisnis ini sudah lama. Mulai audit baru.",
    ],
    [
      "INVALID_INTAKE",
      "Konfirmasi bisnis belum dapat digunakan. Kembali ke ringkasan dan periksa pilihan Anda.",
    ],
    ["AUDIT_DISABLED", "Audit tidak tersedia saat ini."],
    [
      "RATE_LIMITED",
      "Terlalu banyak permintaan, coba lagi dalam beberapa menit.",
    ],
    [
      "RATE_LIMIT_UNAVAILABLE",
      "Perlindungan akses sedang tidak tersedia. Coba lagi nanti.",
    ],
    ["LIVE_CREDENTIALS_MISSING", unavailable],
  ] as const)("keeps fixed preflight %s", (code, message) => {
    const result = questionPreflightError(code);
    expect(result).toMatchObject({
      code,
      providerContact: "none",
      error: message,
    });
    expect(
      questionPublicMessage({
        ...result,
        detail: "MOCK_ONLY",
        error: "MOCK_ONLY",
        issues: ["MOCK_ONLY"],
      }),
    ).toBe(message);
    expect(result).not.toHaveProperty("cost");
  });
  it("redacts rejected content/sections and only retains defined correction locations", () => {
    const invalid = projectQuestionOutcome({
      status: "validation_failed",
      questions: ["MOCK_ONLY_QUESTION"],
      issues: ["MOCK_ONLY_ISSUE"],
      examination: {
        marketInterpretation: "MOCK_ONLY_EXAM",
        selfCritique: "MOCK_ONLY_CRITIQUE",
        intentLabels: ["MOCK_ONLY_LABEL"],
      },
      provenance,
      cost: { billedUsd: 0, available: true },
    });
    expect(JSON.stringify(invalid)).not.toContain("MOCK_ONLY");
    expect(invalid).toMatchObject({
      status: "validation_failed",
      questions: [],
      issues: [
        "Pertanyaan belum memenuhi persyaratan audit. Periksa kembali informasi bisnis Anda.",
      ],
      identitiesWithheld: true,
    });
    const correction = projectQuestionOutcome({
      status: "correction_required",
      issues: [
        { field: "confirmed", code: "unsafe", target: "MOCK_ONLY_TARGET" },
        { field: "MOCK_ONLY_FIELD", code: "unsafe", target: null },
        { field: "identity", code: "MOCK_ONLY_CODE", target: null },
      ],
    });
    expect(correction).toHaveProperty("issues", [
      { field: "confirmed", code: "unsafe" },
    ]);
    expect(JSON.stringify(correction)).not.toContain("MOCK_ONLY");
  });
  it("keeps unknown response uncertainty without invented billing or contact", () => {
    expect(questionUnexpectedError()).toEqual({
      status: "failed",
      reason: "internal_error",
      error: unavailable,
    });
    expect(
      questionPublicMessage({ code: "MOCK_ONLY_UNKNOWN", error: "MOCK_ONLY" }),
    ).toBe(unavailable);
    expect(questionPublicMessage(null)).toBe(unavailable);
    expect(
      questionPublicMessage({ status: "invalid_request", detail: "MOCK_ONLY" }),
    ).toBe(
      "Konfirmasi bisnis belum dapat digunakan. Kembali ke ringkasan dan periksa pilihan Anda.",
    );
  });
});
