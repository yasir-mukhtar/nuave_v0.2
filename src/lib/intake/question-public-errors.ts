import type { GlmPackProvenance, GlmQuestionsOutcome } from "./local-questions";

/** Public failures are a projection, not the internal evidence contract. */
export type QuestionPublicFailure = {
  status:
    "failed" | "validation_failed" | "invalid_request" | "correction_required";
  reason?: string;
  code?: string;
  detail?: string;
  error?: string;
  issues?: string[] | { field: string; code: string }[];
  questions?: string[];
  identitiesWithheld?: true;
  provenance?: GlmPackProvenance;
  providerContact?: "responded" | "sent" | "none";
  cost?: { billedUsd: number | null; available: boolean };
};
export type QuestionPublicOutcome =
  Extract<GlmQuestionsOutcome, { status: "ok" }> | QuestionPublicFailure;

const messages = {
  incomplete:
    "Penyusunan 10 pertanyaan belum selesai. Jawaban Anda tetap tersedia dalam sesi ini. Coba siapkan pertanyaan lagi.",
  provider:
    "Layanan pembuatan pertanyaan sedang mengalami kendala. Coba lagi nanti.",
  refusal:
    "Pertanyaan tidak dapat dibuat dari informasi ini. Periksa kembali informasi bisnis Anda.",
  unusable:
    "Respons pembuatan pertanyaan tidak dapat digunakan. Coba siapkan pertanyaan lagi.",
  provenance:
    "Asal respons pembuatan pertanyaan tidak dapat diverifikasi. Pertanyaan belum dapat digunakan.",
  validation:
    "Pertanyaan belum memenuhi persyaratan audit. Periksa kembali informasi bisnis Anda.",
  correction:
    "Konfirmasi bisnis belum dapat digunakan. Kembali ke ringkasan dan periksa pilihan Anda.",
  method: "Permintaan pembuatan pertanyaan tidak valid.",
  stale: "Versi konfirmasi bisnis ini sudah lama. Mulai audit baru.",
  frozen:
    "Permintaan pembuatan pertanyaan ini belum dapat dikirim. Periksa kembali konfirmasi Anda.",
  consumed:
    "Permintaan ini tidak dapat dikirim ulang. Tidak ada permintaan baru yang dikirim.",
  unavailable: "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
  interrupted:
    "Permintaan pembuatan pertanyaan terputus. Pertanyaan mungkin sudah dibuat dan mungkin sudah dikenai biaya, tetapi tidak diterima.",
  syntheticInterrupted:
    "Permintaan pembuatan pertanyaan terputus. Pertanyaan belum diterima.",
  disabled: "Audit tidak tersedia saat ini.",
  order:
    "Pesanan belum dibuat atau sudah berakhir. Kembali ke langkah pesanan dan coba lagi.",
  limited: "Terlalu banyak permintaan, coba lagi dalam beberapa menit.",
  rateUnavailable: "Perlindungan akses sedang tidak tersedia. Coba lagi nanti.",
} as const;
const reasons = {
  incomplete: "incomplete",
  provider_error: "provider",
  http_error: "provider",
  refusal: "refusal",
  malformed: "unusable",
  empty_text: "unusable",
  extraction_missing_marker: "unusable",
  extraction_duplicate_marker: "unusable",
  extraction_marker_order: "unusable",
  extraction_unexpected_preamble: "unusable",
  extraction_unexpected_line: "unusable",
  extraction_bad_numbering: "unusable",
  provenance: "provenance",
  attempt_not_frozen: "frozen",
  input_changed: "frozen",
  request_changed: "frozen",
  attempt_consumed: "consumed",
  live_credential_missing: "unavailable",
  evidence: "unavailable",
  transport: "interrupted",
  internal_error: "unavailable",
  spend_cap: "unavailable",
} as const;
/** Locally defined preflight codes plus the existing shared-gate codes. */
const codes = {
  INVALID_METHOD: "method",
  STALE_INTAKE: "stale",
  INVALID_INTAKE: "correction",
  AUDIT_DISABLED: "disabled",
  ORDER_REQUIRED: "order",
  RATE_LIMITED: "limited",
  RATE_LIMIT_UNAVAILABLE: "rateUnavailable",
  LIVE_CREDENTIALS_MISSING: "unavailable",
} as const;
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function key<T extends object>(map: T, value: unknown): keyof T | null {
  return typeof value === "string" && Object.hasOwn(map, value)
    ? (value as keyof T)
    : null;
}

/** Never consult detail/error/issues or infer transport from billing. */
export function questionRateLimitRefusal(value: unknown): boolean {
  const input = record(value);
  // These two established statusless wire bodies are application preflights.
  // A classified provider outcome must not be overridden by a stray code.
  return (
    input.status === undefined &&
    typeof input.error === "string" &&
    (input.code === "RATE_LIMITED" || input.code === "RATE_LIMIT_UNAVAILABLE")
  );
}

export function questionPublicMessage(value: unknown, live?: boolean): string {
  const input = record(value);
  const code = key(codes, input.code);
  if (code) return messages[codes[code]];
  if (input.status === "validation_failed") return messages.validation;
  if (
    input.status === "correction_required" ||
    input.status === "invalid_request"
  )
    return messages.correction;
  const reason = input.status === "failed" ? key(reasons, input.reason) : null;
  if (!reason) return messages.unavailable;
  if (
    reason === "transport" ||
    (reason === "evidence" && input.providerContact === "sent")
  ) {
    const transport = record(input.provenance).transport;
    const synthetic =
      transport === "synthetic-stub" ||
      (transport !== "cheaper-inference" && live === false);
    return synthetic ? messages.syntheticInterrupted : messages.interrupted;
  }
  return messages[reasons[reason]];
}

/** Only settled numeric amounts or explicitly unavailable cost cross the seam. */
export function questionPublicCost(
  value: unknown,
): QuestionPublicFailure["cost"] {
  const cost = record(record(value).cost);
  if (cost.available === false && cost.billedUsd === null)
    return { billedUsd: null, available: false };
  if (
    cost.available === true &&
    typeof cost.billedUsd === "number" &&
    Number.isFinite(cost.billedUsd) &&
    cost.billedUsd >= 0
  )
    return { billedUsd: cost.billedUsd, available: true };
  return undefined;
}

/** Preflight bodies are constructed locally; helper prose is never forwarded. */
export function questionPreflightError(
  code: keyof typeof codes,
): QuestionPublicFailure {
  return {
    status:
      code === "INVALID_METHOD" ||
      code === "STALE_INTAKE" ||
      code === "INVALID_INTAKE"
        ? "invalid_request"
        : "failed",
    code,
    error: messages[codes[code]],
    providerContact: "none",
  };
}
export function questionUnexpectedError(): QuestionPublicFailure {
  return {
    status: "failed",
    reason: "internal_error",
    error: messages.unavailable,
  };
}

const correctionFields = new Set([
  "identity",
  "identityAliases",
  "entityScope",
  "category",
  "offerings",
  "customerNeeds",
  "buyerConstraints",
  "accessConstraints",
  "targetCustomer",
  "marketContext",
  "comparison",
  "businessType",
  "safeFacts",
  "serviceChannels",
  "confirmed",
]);
const correctionCodes = new Set([
  "missing",
  "conflict",
  "unsafe",
  "invalid_source",
]);
export function projectQuestionOutcome(
  outcome: GlmQuestionsOutcome,
): QuestionPublicOutcome {
  if (outcome.status === "ok") return outcome;
  if (outcome.status === "invalid_request")
    return {
      status: outcome.status,
      detail: messages.correction,
      providerContact: "none",
    };
  if (outcome.status === "correction_required")
    return {
      status: outcome.status,
      detail: messages.correction,
      providerContact: "none",
      issues: outcome.issues
        .filter(
          (issue) =>
            correctionFields.has(issue.field) &&
            correctionCodes.has(issue.code),
        )
        .map((issue) => ({ field: issue.field, code: issue.code })),
    };
  const p = outcome.provenance;
  const provenance: GlmPackProvenance | undefined =
    p.method === "direct-ten" &&
    p.requestedModel === "glm-5.3-flash" &&
    /^local-glm-[a-z0-9]+-[a-z0-9]{0,6}$/.test(p.requestId) &&
    typeof p.modelMismatch === "boolean" &&
    (p.transport === "cheaper-inference" || p.transport === "synthetic-stub")
      ? {
          requestId: p.requestId,
          method: p.method,
          requestedModel: p.requestedModel,
          returnedModel: null,
          responseId: null,
          modelMismatch: p.modelMismatch,
          transport: p.transport,
        }
      : undefined;
  const cost = questionPublicCost(outcome);
  if (outcome.status === "validation_failed")
    return {
      status: outcome.status,
      questions: [],
      issues: [messages.validation],
      provenance,
      identitiesWithheld: true,
      ...(cost ? { cost } : {}),
    };
  const reason = key(reasons, outcome.reason) ?? "internal_error";
  return {
    status: "failed",
    reason,
    detail: questionPublicMessage({
      status: "failed",
      reason,
      providerContact: outcome.providerContact,
      provenance,
    }),
    provenance,
    identitiesWithheld: true,
    ...(outcome.providerContact === "responded" ||
    outcome.providerContact === "sent" ||
    outcome.providerContact === "none"
      ? { providerContact: outcome.providerContact }
      : {}),
    ...(cost ? { cost } : {}),
  };
}
