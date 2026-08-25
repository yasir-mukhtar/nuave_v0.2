/**
 * Deterministic Indonesian label translation (Spec 002 R-40, AC-26).
 *
 * These constants and functions translate recorded facts and statuses into
 * the settled Indonesian labels. They are pure formatters: they take
 * already code-derived counts, denominators, and status keys and return the
 * settled strings. They NEVER recompute, reinterpret, or re-derive evidence
 * (no counting appearances, no reading observations, no re-classification).
 *
 * An empty denominator renders "Tidak diuji", never a zero performance
 * claim (R-28, R-41).
 */

export const INDONESIAN_REPORT_LABELS = {
  without_business_name: "Tanpa menyebut bisnis Anda",
  with_business_name: "Menyebut bisnis Anda",
  headline_template: "Bisnis Anda muncul di {count} dari 10 pertanyaan",
  count_template: "{count}/{denominator}",
  not_tested: "Tidak diuji",
  /** Browser print dialog; customers may choose Save as PDF there. */
  download_pdf: "Cetak / simpan PDF",
} as const;

export const INDONESIAN_RUN_STATUS_KEYS = [
  "pending",
  "running",
  "retrying",
  "completed",
  "failed",
] as const;

export type IndonesianRunStatusKey =
  (typeof INDONESIAN_RUN_STATUS_KEYS)[number];

export const INDONESIAN_RUN_STATUS_LABELS: Record<
  IndonesianRunStatusKey,
  string
> = {
  pending: "Menunggu",
  running: "Sedang diuji",
  retrying: "Mencoba kembali",
  completed: "Selesai",
  failed: "Belum berhasil diuji",
};

export function indonesianHeadline(mentionedCount: number): string {
  if (!Number.isInteger(mentionedCount) || mentionedCount < 0) {
    throw new Error(
      "indonesianHeadline requires a non-negative integer mention count.",
    );
  }
  return INDONESIAN_REPORT_LABELS.headline_template.replace(
    "{count}",
    String(mentionedCount),
  );
}

export function indonesianCountLabel(
  count: number,
  denominator: number,
): string {
  if (denominator <= 0) return INDONESIAN_REPORT_LABELS.not_tested;
  return INDONESIAN_REPORT_LABELS.count_template
    .replace("{count}", String(count))
    .replace("{denominator}", String(denominator));
}

export function indonesianMeasureLabel(
  assessed: number,
  ready: (assessed: number) => string,
): string {
  if (assessed <= 0) return INDONESIAN_REPORT_LABELS.not_tested;
  return ready(assessed);
}

export function indonesianRunStatusLabel(
  status: IndonesianRunStatusKey,
): string {
  const label = INDONESIAN_RUN_STATUS_LABELS[status];
  if (!label) {
    throw new Error(`Unknown Indonesian run status: ${String(status)}.`);
  }
  return label;
}

export function indonesianObservationRunStatus(
  run: "completed" | "failed",
): string {
  return run === "completed"
    ? INDONESIAN_RUN_STATUS_LABELS.completed
    : INDONESIAN_RUN_STATUS_LABELS.failed;
}
