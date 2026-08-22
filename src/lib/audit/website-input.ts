export const INVALID_WEBSITE_INPUT_MESSAGE =
  "Masukkan alamat situs web yang valid, misalnya masryef.com.";

export type WebsiteInputNormalization =
  { ok: true; url: string } | { ok: false; error: string };

const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const HTTP_SCHEME = /^https?:\/\//i;
const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function safePublicHostname(hostname: string) {
  if (!hostname || hostname.length > 253 || !hostname.includes("."))
    return false;
  const labels = hostname.split(".");
  if (labels.some((label) => !HOST_LABEL.test(label))) return false;
  const topLevel = labels.at(-1) || "";
  return (
    /^[a-z]{2,63}$/i.test(topLevel) || /^xn--[a-z0-9-]{2,59}$/i.test(topLevel)
  );
}

/**
 * Normalizes only inputs that already look like a website. Bare public domains
 * get an https:// scheme; valid http(s) URLs are preserved verbatim after
 * surrounding whitespace is removed. Arbitrary text, handles, credentials,
 * private/local hostnames, whitespace, and unsupported schemes are rejected.
 */
export function normalizeWebsiteInput(
  value: string,
): WebsiteInputNormalization {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed) || trimmed.startsWith("@")) {
    return { ok: false, error: INVALID_WEBSITE_INPUT_MESSAGE };
  }
  if (ANY_SCHEME.test(trimmed) && !HTTP_SCHEME.test(trimmed)) {
    return { ok: false, error: INVALID_WEBSITE_INPUT_MESSAGE };
  }

  const candidate = HTTP_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      !safePublicHostname(parsed.hostname)
    ) {
      return { ok: false, error: INVALID_WEBSITE_INPUT_MESSAGE };
    }
    return { ok: true, url: candidate };
  } catch {
    return { ok: false, error: INVALID_WEBSITE_INPUT_MESSAGE };
  }
}
