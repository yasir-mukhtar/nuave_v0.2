/**
 * Spec 018 R-12 and R-28: phone numbers in answers are third-party data. They
 * are removed before an answer is saved, so they never reach the report, the
 * browser, the JSON export or the report-writing prompt.
 */

export const PHONE_REMOVED = "[nomor telepon dihapus]";

/** A run of digits with the separators phone numbers use. */
const CANDIDATE = /(?:\+\s?)?\(?\d[\d\s().-]{6,}\d/g;

function looksLikePhone(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  // Indonesian numbers start with 0 or the country code 62; a leading "+"
  // marks any international number. Prices ("1.200.000") and years do not.
  return (
    candidate.trim().startsWith("+") ||
    digits.startsWith("0") ||
    digits.startsWith("62")
  );
}

/** Replaces every phone number in the text. */
export function stripPhoneNumbers(text: string): string {
  return text.replace(CANDIDATE, (match) =>
    looksLikePhone(match) ? PHONE_REMOVED : match,
  );
}

/** True when the text still holds something that looks like a phone number. */
export function containsPhoneNumber(text: string): boolean {
  return [...text.matchAll(CANDIDATE)].some(([match]) => looksLikePhone(match));
}
