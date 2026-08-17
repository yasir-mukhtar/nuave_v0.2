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

/** Settled report labels, verbatim (VOICE-v2-candidate.md §2, §7.4; R-25). */
export const INDONESIAN_REPORT_LABELS = {
  /** Composition label for questions that do not name the business. */
  without_business_name: "Tanpa menyebut bisnis Anda",
  /** Composition label for questions that name the business. */
  with_business_name: "Menyebut bisnis Anda",
  /**
   * Headline template: "Bisnis Anda muncul di X dari 10 pertanyaan".
   * `{count}` is replaced with the provided, already computed mention count.
   */
  headline_template: "Bisnis Anda muncul di {count} dari 10 pertanyaan",
  /** Count template: "X/10" (e.g. "4/10"). */
  count_template: "{count}/{denominator}",
  /** Empty-denominator label; never zero performance. */
  not_tested: "Tidak diuji",
  /** Primary report action (settled; kept in English). */
  download_pdf: "Download PDF",
} as const;

/** The run-status set (R-40): Menunggu / Sedang diuji / Mencoba kembali / Selesai / Belum berhasil diuji. */
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

/**
 * Settled headline from a code-derived mention count:
 * "Bisnis Anda muncul di 8 dari 10 pertanyaan".
 */
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

/**
 * Settled count label from code-derived dimensions ("8/10", "3/5"). An empty
 * denominator (zero or negative) renders "Tidak diuji", never "0/0" and never
 * a zero performance claim.
 */
export function indonesianCountLabel(
  count: number,
  denominator: number,
): string {
  if (denominator <= 0) return INDONESIAN_REPORT_LABELS.not_tested;
  return INDONESIAN_REPORT_LABELS.count_template
    .replace("{count}", String(count))
    .replace("{denominator}", String(denominator));
}

/** Settled label for a run-status key; throws on an unknown key rather than inventing a label. */
export function indonesianRunStatusLabel(
  status: IndonesianRunStatusKey,
): string {
  const label = INDONESIAN_RUN_STATUS_LABELS[status];
  if (!label) {
    throw new Error(`Unknown Indonesian run status: ${String(status)}.`);
  }
  return label;
}

/**
 * Settled label for a recorded observation run status: "completed" →
 * "Selesai", "failed" → "Belum berhasil diuji". Translates the recorded fact
 * deterministically; it does not recompute anything.
 */
export function indonesianObservationRunStatus(
  run: "completed" | "failed",
): string {
  return run === "completed"
    ? INDONESIAN_RUN_STATUS_LABELS.completed
    : INDONESIAN_RUN_STATUS_LABELS.failed;
}
