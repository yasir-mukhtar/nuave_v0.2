import { NextResponse } from "next/server";
import { midtransSettings, orderSpendLimitUsd } from "@/lib/orders/config";
import { orderRuntime } from "@/lib/orders/http";
import { applyStatus } from "@/lib/payments/apply";
import { attemptByMidtransOrderId } from "@/lib/payments/attempts";
import { getStatus, notificationSignatureValid } from "@/lib/payments/midtrans";
import { recordFounderNotice, utcDayOf } from "@/lib/payments/notices";
import { dailySpendLimitUsd } from "@/lib/spending/provider-spend";
import { usdToUnits } from "@/lib/spending/spend-ledger";

export const runtime = "nodejs";

const handled = () => NextResponse.json({ ok: true });
// Midtrans retries a 503 four times over about two hours (docs.midtrans.com).
const retryLater = () => NextResponse.json({ ok: false }, { status: 503 });

/**
 * Spec 017 R-08: Midtrans' HTTP notification. It works while the emergency
 * switch is off (it only records payments and starts no AI work), so there is no
 * switch check here, and no caller rate limit: the signature is the gate.
 *
 * 1. The signature (SHA-512 of order_id, status_code, gross_amount and the server
 *    key, as received). A bad signature or a missing key: 503 and one
 *    `notification_rejected` notice per UTC day (a wrong key on Nuave's side must
 *    not drop real payments silently).
 * 2. A good signature with an `order_id` Nuave does not know: 200, nothing changes.
 * 3. Get Status for the notification's `transaction_id`; the decision comes only
 *    from that answer (R-09). Midtrans or the database failing: 503.
 *
 * Nothing is logged: no email, key, signature or internal order ID.
 */
export async function POST(request: Request) {
  try {
    const notification = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const server = orderRuntime();
    // Synthetic mode never calls Midtrans (R-17).
    if (!server || server.mode !== "live") return retryLater();
    const midtrans = midtransSettings();
    const valid =
      midtrans !== null &&
      notification !== null &&
      typeof notification === "object" &&
      (await notificationSignatureValid(midtrans.serverKey, notification));
    if (!midtrans || !valid || !notification) {
      const now = new Date();
      await recordFounderNotice(server.db, {
        kind: "notification_rejected",
        subject: utcDayOf(now),
        detail: { reason: midtrans ? "bad_signature" : "server_key_missing" },
        now,
      });
      return retryLater();
    }
    const orderId = notification.order_id as string;
    const transactionId = notification.transaction_id;
    if (
      typeof transactionId !== "string" ||
      !transactionId ||
      !(await attemptByMidtransOrderId(server.db, orderId))
    ) {
      // Signed, but not a payment Nuave knows: recorded nowhere, ignored.
      return handled();
    }
    const answer = await getStatus(midtrans, transactionId);
    if (answer.kind !== "found") return retryLater();
    // A mismatch that remains after the check is ignored.
    if (answer.status.order_id !== orderId) return handled();
    await applyStatus(
      {
        db: server.db,
        now: new Date(),
        limitUnits: usdToUnits(orderSpendLimitUsd()),
        dailyLimitUnits: usdToUnits(dailySpendLimitUsd()),
      },
      answer.status,
    );
    return handled();
  } catch {
    return retryLater();
  }
}
