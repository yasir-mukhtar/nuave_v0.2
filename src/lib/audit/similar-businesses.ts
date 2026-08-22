import type { BusinessBrief, SimilarBusiness } from "./types";

export const MAX_SIMILAR_BUSINESSES = 5;

function hasExplicitScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

export function normalizeSimilarBusinessUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = hasExplicitScheme(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return trimmed;
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function isValidSimilarBusinessUrl(value: string) {
  const normalized = normalizeSimilarBusinessUrl(value);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
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
