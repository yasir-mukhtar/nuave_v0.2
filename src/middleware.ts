import { NextResponse, type NextRequest } from "next/server";

/**
 * Access gate for the paid audit surface.
 *
 * `/` stays public. `/audit/*` and `/api/audit/*` require the httpOnly
 * `nuave_access` cookie to match `NUAVE_ACCESS_CODE` (server-only; never
 * exposed to the client). API requests that fail the gate get a 401 before
 * any route handler runs, so no provider call is ever made.
 *
 * Fail-closed: when `NUAVE_ACCESS_CODE` is unset, nothing matches.
 *
 * NOTE: this uses the deprecated `middleware.ts` (Edge) convention on purpose.
 * Next.js 16 renamed it to `proxy.ts`, but proxy always runs on the Node.js
 * runtime, which the OpenNext Cloudflare adapter does not support yet
 * ("Node.js middleware is not currently supported"). Edge middleware works on
 * Cloudflare Workers/Pages. Revert to `proxy.ts` once OpenNext supports it.
 */
const ACCESS_COOKIE = "nuave_access";

export function middleware(request: NextRequest) {
  const expected = process.env.NUAVE_ACCESS_CODE;
  const cookie = request.cookies.get(ACCESS_COOKIE)?.value;

  if (expected && cookie === expected) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/audit")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessUrl = new URL("/access", request.url);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/audit/:path*", "/api/audit/:path*"],
};
