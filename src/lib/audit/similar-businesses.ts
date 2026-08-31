import type { BusinessBrief, SimilarBusiness } from "./types";
import { parsePublicHttpUrl, parseSourceInput } from "./source-input";

export const MAX_SIMILAR_BUSINESSES = 5;
export const INVALID_SIMILAR_BUSINESS_URL_MESSAGE =
  "Masukkan URL website, profil Instagram, atau Google Maps yang valid.";

function rawHttpUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function isInstagramHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "instagram.com" || host === "www.instagram.com";
}

function parsedComparisonUrl(value: string): URL | null {
  const parsed = parsePublicHttpUrl(value);
  if (!parsed) return null;
  if (isInstagramHost(parsed.hostname)) {
    const source = parseSourceInput(value);
    return source?.sourceType === "instagram"
      ? new URL(source.normalizedUrl)
      : null;
  }
  return parsed;
}

export function isCredentialBearingHttpUrl(value: string) {
  const parsed = rawHttpUrl(value);
  return Boolean(parsed && (parsed.username || parsed.password));
}

/**
 * Normalize safe valid URLs, but preserve malformed/unsafe USER text so the
 * editor can display it and let the user correct it. Provider-bound code must
 * call assertSafeComparisonBusinessUrls before using these values.
 */
export function normalizeSimilarBusinessUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = parsedComparisonUrl(trimmed);
  if (!parsed) return trimmed;
  parsed.hash = "";
  return parsed.toString();
}

export function isValidSimilarBusinessUrl(value: string) {
  return Boolean(parsedComparisonUrl(value));
}

export function similarBusinessDisplayName(value: string) {
  const parsed = parsedComparisonUrl(value);
  if (!parsed) return "";
  const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (hostname === "instagram.com") {
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    return handle ? `@${handle}` : "";
  }
  if (
    hostname === "maps.app.goo.gl" ||
    hostname === "goo.gl" ||
    hostname === "g.page" ||
    hostname === "google.com" ||
    hostname.endsWith(".google.com") ||
    hostname.endsWith(".google.co.id")
  ) {
    return "";
  }
  return hostname;
}

/**
 * Editing a suggested URL creates a new user-supplied identity. Never retain
 * an AI-suggested name from the old URL and silently bind it to the new source.
 */
export function rebindSimilarBusinessUrl(
  business: SimilarBusiness,
  sourceUrl: string,
): SimilarBusiness {
  const current = normalizeSimilarBusinessUrl(business.source_url);
  const next = normalizeSimilarBusinessUrl(sourceUrl);
  if (current && next && current === next) return business;
  return {
    source_url: sourceUrl,
    origin: "user",
  };
}

export function assertSafeComparisonBusinessUrls(brief: BusinessBrief): void {
  const urls = [
    brief.verified_competitor.source_url,
    ...(brief.similar_businesses ?? []).map((business) => business.source_url),
  ].filter(Boolean);

  if (urls.some(isCredentialBearingHttpUrl)) {
    throw new Error(
      "Comparison-business URLs must not contain embedded username or password credentials.",
    );
  }
  if (urls.some((url) => !isValidSimilarBusinessUrl(url))) {
    throw new Error(
      "Comparison-business URLs must be valid public HTTP or HTTPS URLs before provider execution.",
    );
  }
}

export function normalizeSimilarBusinesses(
  businesses: SimilarBusiness[] = [],
): SimilarBusiness[] {
  const normalized: SimilarBusiness[] = [];
  const seen = new Set<string>();
  for (const business of businesses) {
    const sourceUrl = normalizeSimilarBusinessUrl(business.source_url);
    if (!sourceUrl) continue;
    const key = sourceUrl.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      source_url: sourceUrl,
      ...(business.name?.trim() ? { name: business.name.trim() } : {}),
      ...(business.origin ? { origin: business.origin } : {}),
    });
    if (normalized.length >= MAX_SIMILAR_BUSINESSES) break;
  }
  return normalized;
}

export function sanitizeAiSimilarBusinesses(
  businesses: SimilarBusiness[] = [],
) {
  return normalizeSimilarBusinesses(
    businesses.map((business) => ({
      ...business,
      origin: "ai" as const,
    })),
  ).filter((business) => isValidSimilarBusinessUrl(business.source_url));
}

export function withPrimarySimilarBusiness(
  brief: BusinessBrief,
): BusinessBrief {
  assertSafeComparisonBusinessUrls(brief);
  if (brief.similar_businesses === undefined) return brief;
  const similarBusinesses = normalizeSimilarBusinesses(
    brief.similar_businesses,
  );
  const primary = similarBusinesses.find((business) =>
    isValidSimilarBusinessUrl(business.source_url),
  );
  if (!primary) {
    return {
      ...brief,
      similar_businesses: similarBusinesses,
    };
  }
  return {
    ...brief,
    similar_businesses: similarBusinesses,
    verified_competitor: {
      name:
        primary.name?.trim() || similarBusinessDisplayName(primary.source_url),
      scope: "",
      source_url: primary.source_url,
    },
  };
}
