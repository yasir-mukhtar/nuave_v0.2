import type { BusinessBrief, SimilarBusiness } from "./types";

export const MAX_SIMILAR_BUSINESSES = 5;

function hasExplicitScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function parsedHttpUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = hasExplicitScheme(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isCredentialBearingHttpUrl(value: string) {
  const parsed = parsedHttpUrl(value);
  return Boolean(parsed && (parsed.username || parsed.password));
}

export function normalizeSimilarBusinessUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = parsedHttpUrl(trimmed);
  if (!parsed || parsed.username || parsed.password) return "";
  parsed.hash = "";
  return parsed.toString();
}

export function isValidSimilarBusinessUrl(value: string) {
  const normalized = normalizeSimilarBusinessUrl(value);
  if (!normalized) return false;
  const parsed = parsedHttpUrl(normalized);
  return Boolean(parsed && !parsed.username && !parsed.password);
}

export function similarBusinessDisplayName(value: string) {
  if (!isValidSimilarBusinessUrl(value)) return "";
  const parsed = new URL(normalizeSimilarBusinessUrl(value));
  const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    return handle ? `@${handle}` : "";
  }
  if (
    hostname === "maps.app.goo.gl" ||
    hostname === "goo.gl" ||
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
      verified_competitor: {
        name: "",
        scope: "",
        source_url: "",
      },
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
