export const INVALID_WEBSITE_INPUT_MESSAGE =
  "Masukkan alamat situs web yang valid, misalnya masryef.com.";

export type WebsiteInputNormalization =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Baseline helper mirroring the current client behavior before the reliability
 * fix: surrounding whitespace is trimmed, but a bare domain is not normalized.
 * The fail-first regression commit replaces this behavior in the fix commit.
 */
export function normalizeWebsiteInput(
  value: string,
): WebsiteInputNormalization {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: INVALID_WEBSITE_INPUT_MESSAGE };
  return { ok: true, url: trimmed };
}
