import { NextResponse } from "next/server";
import { newAuditEnabled } from "@/lib/audit/deployment-gate";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import {
  orderNotFoundResponse,
  orderRuntime,
  orderUnavailableResponse,
} from "@/lib/orders/http";
import { midtransSettings, orderSpendLimitUsd } from "@/lib/orders/config";
import { getOrder, isOrderId, orderStatus } from "@/lib/orders/store";
import { paymentView } from "@/lib/payments/attempts";
import { recoverOrderPayment } from "@/lib/payments/check";
import { dailySpendLimitUsd } from "@/lib/spending/provider-spend";
import { usdToUnits } from "@/lib/spending/spend-ledger";

export const runtime = "nodejs";

/**
 * Spec 016 R-21: the tab asks for its order's progress. The order id is in the
 * body, never the URL. The answer is the state and question progress only:
 * never the report, the email or the link secret.
 *
 * Spec 017 R-14: the answer also has `payment` (see `PaymentView`), and an order
 * with an open payment attempt makes the server ask Midtrans Get Status, at most
 * once per attempt per 30 seconds. Nothing else in the request is read: a return
 * URL's status words are ignored. The order id is never returned.
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
    // R-14: status recovery. Best effort: it never fails the answer.
    const midtrans = server.mode === "live" ? midtransSettings() : null;
    const known = isOrderId(body?.order_id)
      ? await getOrder(server.db, body.order_id)
      : null;
    // The order must exist in this environment before Midtrans is asked.
    if (
      midtrans &&
      known &&
      known.environment === server.environment &&
      known.mode === server.mode
    ) {
      try {
        await recoverOrderPayment(
          {
            db: server.db,
            now: new Date(),
            midtrans,
            // One poll never holds the page for long.
            timeBudgetMs: 12_000,
            limitUnits: usdToUnits(orderSpendLimitUsd()),
            dailyLimitUnits: usdToUnits(dailySpendLimitUsd()),
          },
          known.id,
        );
      } catch {
        // Invalid limits: the stored state is still shown.
      }
    }
    const now = new Date();
    const status = await orderStatus(server.db, {
      orderId: body?.order_id,
      environment: server.environment,
      now,
    });
    if (!status) return orderNotFoundResponse();
    const order = await getOrder(server.db, body?.order_id as string);
    const payment = order
      ? await paymentView(server.db, order, now)
      : undefined;
    // `paused` tells a tab that new work is switched off for now (it is only
    // waiting; nothing is lost). Read-only: this route never starts paid work.
    return NextResponse.json(
      { ...status, payment, ...(newAuditEnabled() ? {} : { paused: true }) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return orderUnavailableResponse();
  }
}
