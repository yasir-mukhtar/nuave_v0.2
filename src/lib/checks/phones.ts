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

/** N-20: in a link's path only an Indonesian mobile number counts (08… or
 * 628…, 10 to 13 digits): article IDs such as kompas.com's "080000565" stay. */
const MOBILE_IN_PATH = /(?:^|\D)(?:\+?62|0)8\d{8,11}(?!\d)/;
/** N-25: the same number written with separators ("0812-3456-7890",
 * "62-812-3456-7890", "+62 812 3456 7890"). */
const MOBILE_SPACED_IN_PATH =
  /(?:^|[^\d])((?:\+?62[-.\s]?|0)8\d{1,4}(?:[-.\s]\d{2,5}){1,4})(?!\d)/g;

function mobileInPath(path: string): boolean {
  if (MOBILE_IN_PATH.test(path)) return true;
  return [...path.matchAll(MOBILE_SPACED_IN_PATH)].some((match) =>
    /^(?:62|0)8\d{8,11}$/.test(match[1]!.replace(/\D/g, "")),
  );
}

const MESSAGING_HOSTS = /(^|\.)(wa\.me|whatsapp\.com|wa\.link)$/i;

/**
 * N-5: a cited link can carry a phone number (wa.me/62…, tel:, ?phone=…).
 * Messaging links are dropped; any other link that still holds a phone-like
 * run of digits loses its query and fragment, and is dropped when its path
 * holds one too. Returns null when the link cannot be kept.
 */
export function phoneSafeUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/i.test(parsed.protocol)) return null;
  if (MESSAGING_HOSTS.test(parsed.hostname)) return null;
  const decoded = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  if (mobileInPath(decoded(parsed.pathname))) return null;
  if (
    containsPhoneNumber(decoded(parsed.search)) ||
    containsPhoneNumber(decoded(parsed.hash))
  ) {
    parsed.search = "";
    parsed.hash = "";
  }
  return parsed.toString();
}
