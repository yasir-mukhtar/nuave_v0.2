// Spec 004 R-03: classify the hero intake value as a website or an Instagram
// account and normalize it to a full http(s):// URL, because the server
// extraction contract only accepts full URLs (`extractionRequestSchema`).

export type ParsedSourceInput =
  | { sourceType: "website"; normalizedUrl: string }
  | { sourceType: "instagram"; normalizedUrl: string };

const MAX_SOURCE_LENGTH = 2000;
const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);
const HANDLE_PATTERN = /^@([a-zA-Z0-9._]{1,30})$/;

function hasPlausibleDomain(value: string): boolean {
  if (value.includes(" ") || value.includes("/")) return false;
  if (!value.includes(".")) return false;
  const tld = value.split(".").pop() ?? "";
  return tld.length >= 2;
}

function instagramUrl(handle: string): ParsedSourceInput {
  return {
    sourceType: "instagram",
    normalizedUrl: `https://instagram.com/${handle}`,
  };
}

export function parseSourceInput(value: string): ParsedSourceInput | null {
  const raw = value.trim();
  if (!raw || raw.length > MAX_SOURCE_LENGTH) return null;

  const handleMatch = raw.match(HANDLE_PATTERN);
  if (handleMatch) return instagramUrl(handleMatch[1]);

  const hasScheme = /^https?:\/\//i.test(raw);
  const candidate = hasScheme ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  if (INSTAGRAM_HOSTS.has(host)) {
    const handle = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!handle) return null;
    return instagramUrl(handle);
  }

  if (!hasScheme && !hasPlausibleDomain(url.hostname)) return null;

  return { sourceType: "website", normalizedUrl: url.toString() };
}
