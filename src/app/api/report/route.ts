import { NextResponse } from "next/server";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import { sha256Hex } from "@/lib/orders/config";
import { orderRuntime } from "@/lib/orders/http";
import { PRINT_TOKEN_PATTERN, spendPrintToken } from "@/lib/orders/report-pdf";
import {
  PRIVATE_HEADERS,
  SECRET_PATTERN,
  neutral,
  unavailable,
} from "@/lib/orders/report-route";
import { reportForLink, reportForOrder } from "@/lib/orders/store";

export const runtime = "nodejs";

/**
 * Spec 016 R-26/R-27: the report page POSTs the link secret (from the URL
 * fragment, never in a URL the server sees) and gets the saved report. No login,
 * no provider call. The route is rate-limited per IP.
 *
 * Spec 021 P-02: Browser Run's print page sends a single-use print code
 * (`print_token`) instead; it is spent on this read, so it opens the report
 * once.
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
    print_token?: unknown;
  } | null;
  const secret = body?.secret;
  const printToken = body?.print_token;
  const bySecret = typeof secret === "string" && SECRET_PATTERN.test(secret);
  const byPrintToken =
    !bySecret &&
    typeof printToken === "string" &&
    PRINT_TOKEN_PATTERN.test(printToken);
  if (!bySecret && !byPrintToken) return neutral();
  const server = orderRuntime();
  if (!server) return unavailable();

  let saved: Awaited<ReturnType<typeof reportForLink>>;
  try {
    const now = new Date();
    if (bySecret) {
      saved = await reportForLink(server.db, {
        linkHash: await sha256Hex(secret),
        environment: server.environment,
        now,
      });
    } else {
      const orderId = await spendPrintToken(server.db, {
        tokenHash: await sha256Hex(printToken as string),
        now,
      });
      saved = orderId
        ? await reportForOrder(server.db, {
            orderId,
            environment: server.environment,
            now,
          })
        : null;
    }
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
