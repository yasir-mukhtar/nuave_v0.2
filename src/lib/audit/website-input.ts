import { INVALID_SOURCE_INPUT_MESSAGE, parseSourceInput } from "./source-input";

export const INVALID_WEBSITE_INPUT_MESSAGE = INVALID_SOURCE_INPUT_MESSAGE;

export type WebsiteInputNormalization =
  { ok: true; url: string } | { ok: false; error: string };

/**
 * Compatibility adapter for callers that specifically require a website.
 * Source intake and the extraction route use parseSourceInput directly so the
 * client and server make one canonical decision for website/Instagram input.
 */
export function normalizeWebsiteInput(
  value: string,
): WebsiteInputNormalization {
  const parsed = parseSourceInput(value);
  if (!parsed || parsed.sourceType !== "website") {
    return { ok: false, error: INVALID_WEBSITE_INPUT_MESSAGE };
  }
  return { ok: true, url: parsed.normalizedUrl };
}
