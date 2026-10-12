import { NextResponse } from "next/server";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import { sha256Hex } from "@/lib/orders/config";
import { orderRuntime } from "@/lib/orders/http";
import { reportForLink } from "@/lib/orders/store";

export const runtime = "nodejs";

/** R-26/R-27: the page, its data and every answer are kept out of search, out
 * of caches and out of the Referer header. */
const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
} as const;

export const REPORT_UNAVAILABLE_MESSAGE = "Laporan ini tidak tersedia.";

/** One response for a wrong, expired or switched-off secret (R-27): the same
 * status, headers and body, so the three cannot be told apart. */
function neutral() {
  return NextResponse.json(
    { error: REPORT_UNAVAILABLE_MESSAGE, code: "REPORT_UNAVAILABLE" },
    { status: 404, headers: PRIVATE_HEADERS },
  );
}

/** The server cannot look (no database, or it failed). It does not depend on
 * the secret, so it tells a caller nothing about one. */
function unavailable() {
  return NextResponse.json(
    { error: "Laporan belum bisa dibuka sekarang.", code: "REPORT_TRY_LATER" },
    { status: 503, headers: PRIVATE_HEADERS },
  );
}

/** The secret as the link makes it: 24 random bytes, URL-safe base64. */
const SECRET_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/**
 * Spec 016 R-26/R-27: the report page POSTs the link secret (from the URL
 * fragment, never in a URL the server sees) and gets the saved report. No login,
 * no provider call. The route is rate-limited per IP.
 */
export async function POST(request: Request) {
  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.reportDataCaller,
  );
  if (rateLimited) {
    for (const [key, value] of Object.entries(PRIVATE_HEADERS)) {
      rateLimited.headers.set(key, value);
    }
    return rateLimited;
  }

  const body = (await request.json().catch(() => null)) as {
    secret?: unknown;
  } | null;
  const secret = body?.secret;
  if (typeof secret !== "string" || !SECRET_PATTERN.test(secret)) {
    return neutral();
  }
  const server = orderRuntime();
  if (!server) return unavailable();

  let saved: Awaited<ReturnType<typeof reportForLink>>;
  try {
    saved = await reportForLink(server.db, {
      linkHash: await sha256Hex(secret),
      environment: server.environment,
      now: new Date(),
    });
  } catch {
    return unavailable();
  }
  if (!saved) return neutral();

  try {
    const intake = JSON.parse(saved.intake_json) as {
      context: unknown;
      prompts: unknown;
      originals?: unknown;
    };
    return NextResponse.json(
      {
        report: JSON.parse(saved.report_json),
        context: intake.context,
        prompts: intake.prompts,
        originals: intake.originals ?? [],
        observations: saved.observations.map((item) => JSON.parse(item)),
        synthetic: saved.mode === "synthetic",
      },
      { headers: PRIVATE_HEADERS },
    );
  } catch {
    return neutral();
  }
}
