import { NextResponse } from "next/server";

/** R-26/R-27: the page, its data and every answer are kept out of search, out
 * of caches and out of the Referer header. */
export const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
} as const;

export const REPORT_UNAVAILABLE_MESSAGE = "Laporan ini tidak tersedia.";

/** One response for a wrong, expired or switched-off secret (R-27): the same
 * status, headers and body, so the three cannot be told apart. */
export function neutral() {
  return NextResponse.json(
    { error: REPORT_UNAVAILABLE_MESSAGE, code: "REPORT_UNAVAILABLE" },
    { status: 404, headers: PRIVATE_HEADERS },
  );
}

/** The server cannot look (no database, or it failed). It does not depend on
 * the secret, so it tells a caller nothing about one. */
export function unavailable() {
  return NextResponse.json(
    { error: "Laporan belum bisa dibuka sekarang.", code: "REPORT_TRY_LATER" },
    { status: 503, headers: PRIVATE_HEADERS },
  );
}

/** The secret as the link makes it: 24 random bytes, URL-safe base64. */
export const SECRET_PATTERN = /^[A-Za-z0-9_-]{32}$/;
