import { NextResponse } from "next/server";
import { newAuditEnabled } from "@/lib/audit/deployment-gate";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import {
  orderNotFoundResponse,
  orderRuntime,
  orderUnavailableResponse,
} from "@/lib/orders/http";
import { orderStatus } from "@/lib/orders/store";

export const runtime = "nodejs";

/**
 * Spec 016 R-21: the tab asks for its order's progress. The order id is in the
 * body, never the URL. The answer is the state and question progress only:
 * never the report, the email or the link secret.
 */
export async function POST(request: Request) {
  // Read-only and paid-work-free, so it keeps answering while the emergency
  // switch is off: an open audit tab keeps waiting and keeps its order id.
  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.orderStatusCaller,
  );
  if (rateLimited) return rateLimited;

  const body = (await request.json().catch(() => null)) as {
    order_id?: unknown;
  } | null;
  const server = orderRuntime();
  if (!server) return orderUnavailableResponse();
  try {
    const status = await orderStatus(server.db, {
      orderId: body?.order_id,
      environment: server.environment,
      now: new Date(),
    });
    if (!status) return orderNotFoundResponse();
    // `paused` tells a tab that new work is switched off for now (it is only
    // waiting; nothing is lost). Read-only: this route never starts paid work.
    return NextResponse.json(
      { ...status, ...(newAuditEnabled() ? {} : { paused: true }) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return orderUnavailableResponse();
  }
}
