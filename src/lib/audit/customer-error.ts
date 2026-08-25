export type AuditCustomerStage =
  "bootstrap" | "extract" | "prompts" | "run" | "report" | "variance";

const CODE_MESSAGES: Record<string, string> = {
  INVALID_SOURCE_INPUT:
    "Masukkan URL website resmi atau akun Instagram yang valid, lalu coba lagi.",
  INVALID_REQUEST:
    "Data audit belum lengkap atau tidak valid. Periksa isian Anda lalu coba lagi.",
  REPORT_LIMIT_EXHAUSTED:
    "Laporan belum dapat dibuat lagi pada sesi ini. Mulai audit baru bila Anda ingin mencoba kembali.",
  REPORT_INTEGRITY_FAILURE:
    "Laporan belum dapat dibuat karena bukti audit belum memenuhi pemeriksaan kualitas.",
  REPORT_TRANSIENT_FAILURE:
    "Laporan belum dapat dibuat. Coba lagi dari hasil audit yang sudah tersedia.",
};

const STAGE_MESSAGES: Record<AuditCustomerStage, string> = {
  bootstrap: "Audit belum siap dimulai. Muat ulang halaman dan coba lagi.",
  extract:
    "Sumber bisnis belum dapat dianalisis. Periksa sumber lalu coba lagi.",
  prompts: "Pertanyaan audit belum dapat dibuat. Coba lagi.",
  run: "Audit terhenti sebelum selesai. Coba lanjutkan dari hasil yang sudah tersimpan.",
  report: "Laporan belum dapat dibuat dari hasil audit ini. Coba lagi.",
  variance:
    "Laporan sudah selesai, tetapi pengukuran variasi belum dapat diselesaikan.",
};

/**
 * Customer-facing copy is intentionally finite. Callers may retain a raw
 * Error/AuditRequestError plus telemetry internally, but must never render its
 * provider/transport-authored message directly.
 */
export function customerAuditErrorMessage(
  stage: AuditCustomerStage,
  code?: string,
): string {
  return (code && CODE_MESSAGES[code]) || STAGE_MESSAGES[stage];
}
