/**
 * The private link's secret and its hash (spec 016 R-24). No imports, so the
 * founder's support script can bundle it without the web framework.
 */

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** At least 128 random bits (R-24): 24 bytes, URL-safe base64, 32 characters. */
export function newLinkSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
