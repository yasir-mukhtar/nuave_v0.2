export type ParsedSourceInput =
  | { sourceType: "website"; normalizedUrl: string }
  | { sourceType: "instagram"; normalizedUrl: string };

export const INVALID_SOURCE_INPUT_MESSAGE =
  "Masukkan URL situs web resmi atau akun Instagram yang valid.";

const MAX_SOURCE_LENGTH = 2000;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const HTTP_SCHEME = /^https?:\/\//i;
const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const HANDLE_PATTERN = /^@([a-zA-Z0-9._]{1,30})$/;
const INSTAGRAM_HANDLE_PATTERN = /^[a-zA-Z0-9._]{1,30}$/;
const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);
const INSTAGRAM_NON_PROFILE_ROOTS = new Set([
  "accounts",
  "about",
  "developer",
  "direct",
  "explore",
  "p",
  "reel",
  "reels",
  "stories",
  "tv",
]);
const GOOGLE_REGIONAL_SECOND_LEVELS = new Set(["co", "com"]);

function hasPlausiblePublicHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253 || !hostname.includes(".")) {
    return false;
  }
  const labels = hostname.split(".");
  if (labels.some((label) => !HOST_LABEL.test(label))) return false;
  const topLevel = labels.at(-1) || "";
  return (
    /^[a-z]{2,63}$/i.test(topLevel) || /^xn--[a-z0-9-]{2,59}$/i.test(topLevel)
  );
}

function hostnameLabelsWithoutOptionalWww(hostname: string) {
  const labels = hostname.toLowerCase().split(".");
  return labels[0] === "www" ? labels.slice(1) : labels;
}

/**
 * Recognizes Google-owned regional host shapes without treating an arbitrary
 * hostname that merely contains the word "google" as Google. Supported forms:
 * google.<tld>, google.co.<cc>, google.com.<cc>, and optional leading www.
 */
function isRegionalGoogleHost(hostname: string): boolean {
  const labels = hostnameLabelsWithoutOptionalWww(hostname);
  if (labels[0] !== "google") return false;
  if (labels.length === 2) return true;
  return (
    labels.length === 3 &&
    GOOGLE_REGIONAL_SECOND_LEVELS.has(labels[1]) &&
    /^[a-z]{2}$/i.test(labels[2])
  );
}

function isMapsGoogleHost(hostname: string): boolean {
  const labels = hostnameLabelsWithoutOptionalWww(hostname);
  if (labels[0] !== "maps") return false;
  return isRegionalGoogleHost(labels.slice(1).join("."));
}

function isGoogleBusinessOrMapsUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "maps.app.goo.gl" || host === "g.page" || host === "goo.gl") {
    return true;
  }
  if (isMapsGoogleHost(host)) return true;
  return isRegionalGoogleHost(host) && /^\/maps(?:\/|$)/i.test(url.pathname);
}

/**
 * Shared public HTTP(S) URL boundary for intake and comparison-source checks.
 * It preserves normal website paths/query strings while rejecting credentials,
 * unsupported schemes, and hostnames that the previous server policy did not
 * treat as public websites.
 */
export function parsePublicHttpUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_SOURCE_LENGTH || /\s/.test(trimmed)) {
    return null;
  }
  if (ANY_SCHEME.test(trimmed) && !HTTP_SCHEME.test(trimmed)) return null;

  const candidate = HTTP_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      !hasPlausiblePublicHostname(parsed.hostname)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function instagramProfile(url: URL): ParsedSourceInput | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const handle = segments[0];
  if (
    !INSTAGRAM_HANDLE_PATTERN.test(handle) ||
    INSTAGRAM_NON_PROFILE_ROOTS.has(handle.toLowerCase())
  ) {
    return null;
  }
  return {
    sourceType: "instagram",
    normalizedUrl: `https://instagram.com/${handle}`,
  };
}

/**
 * Canonical source policy shared by the landing/audit UI and extraction route.
 * The approved current intake supports ordinary public websites and Instagram
 * account/profile URLs. Instagram content paths are never reinterpreted as an
 * account. Google Business Profile/Maps is deliberately rejected until a real
 * extraction/provenance contract exists.
 */
export function parseSourceInput(value: string): ParsedSourceInput | null {
  const raw = value.trim();
  if (!raw || raw.length > MAX_SOURCE_LENGTH) return null;

  const handleMatch = raw.match(HANDLE_PATTERN);
  if (handleMatch) {
    return {
      sourceType: "instagram",
      normalizedUrl: `https://instagram.com/${handleMatch[1]}`,
    };
  }

  const url = parsePublicHttpUrl(raw);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  if (INSTAGRAM_HOSTS.has(host)) return instagramProfile(url);
  if (isGoogleBusinessOrMapsUrl(url)) return null;

  return { sourceType: "website", normalizedUrl: url.toString() };
}
