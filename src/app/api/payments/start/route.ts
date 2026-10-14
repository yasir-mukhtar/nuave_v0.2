import { NextResponse } from "next/server";
import {
  auditLiveCredentialsResponse,
  auditSwitchResponse,
} from "@/lib/audit/deployment-gate";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import {
  emailOnAllowlist,
  midtransSettings,
  orderSpendLimitUsd,
  paymentSettingsReady,
  siteOrigin,
} from "@/lib/orders/config";
import {
  orderModeIsExplicit,
  orderNotFoundResponse,
  orderRuntime,
  orderUnavailableResponse,
} from "@/lib/orders/http";
import { getOrder, isOrderId, type OrderEnvironment } from "@/lib/orders/store";
import { applySimulatedPayment } from "@/lib/payments/apply";
import {
  saveSnapResult,
  startAttempt,
  voidAttempt,
} from "@/lib/payments/attempts";
import { createSnapTransaction } from "@/lib/payments/midtrans";
import { recordFounderNotice, utcDayOf } from "@/lib/payments/notices";
import { dailySpendLimitUsd } from "@/lib/spending/provider-spend";
import { usdToUnits, type SpendDb } from "@/lib/spending/spend-ledger";

export const runtime = "nodejs";

export const CAP_FULL_MESSAGE =
  "Kuota audit sedang penuh. Coba lagi dalam beberapa jam.";
export const PAYMENT_START_FAILED_MESSAGE = "Pembayaran belum bisa dimulai.";

/**
 * R-17 (AC-20, AC-24): the simulated payment, synthetic mode only. The answer
 * is `{ simulated: true }` and no redirect: the page then asks the status like
 * any return from Midtrans. An order that is not unpaid and open (a test pass,
 * an ended or replaced order) cannot be paid; one already simulated-paid
 * answers the same again.
 */
async function simulatedPayment(
  db: SpendDb,
  environment: OrderEnvironment,
  orderId: unknown,
) {
  if (!isOrderId(orderId)) return orderNotFoundResponse();
  const order = await getOrder(db, orderId).catch(() => null);
  if (
    !order ||
    order.environment !== environment ||
    order.mode !== "synthetic"
  ) {
    return orderNotFoundResponse();
  }
  try {
    const paid =
      order.payment_kind === "simulated" ||
      (await applySimulatedPayment(db, order.id, new Date()));
    if (paid) return NextResponse.json({ simulated: true });
  } catch {
    return orderUnavailableResponse();
  }
  return NextResponse.json(
    {
      error: "Pesanan ini tidak dapat dibayar.",
      code: "PAYMENT_NOT_AVAILABLE",
    },
    { status: 409 },
  );
}

/**
 * Spec 017 R-05: start a Midtrans payment for one unpaid order. The body is the
 * order's id only. Checks, in order: emergency switch, rate limit, the founder's
 * email list (R-16), Midtrans and alert settings (R-17), the order itself (open,
 * unpaid, not a test pass, legacy or replaced order, no open attempt, not ended),
 * then the cap check and the attempt row as ONE write (R-10). Then Snap. The
 * answer is the Snap redirect URL and nothing else. Any card, bank or wallet
 * detail stays with Midtrans.
 */
export async function POST(request: Request) {
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;
  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.paymentStartCaller,
  );
  if (rateLimited) return rateLimited;
  if (!orderModeIsExplicit()) return orderUnavailableResponse();
  const credentialsError = auditLiveCredentialsResponse("order");
  if (credentialsError) return credentialsError;

  const body = (await request.json().catch(() => null)) as {
    order_id?: unknown;
  } | null;
  const server = orderRuntime();
  if (!server) return orderUnavailableResponse();
  // R-17: no payment starts without the server key, the production switch and
  // the alert address (fail closed). Synthetic mode never calls Midtrans: it
  // uses the labeled simulated payment instead.
  if (server.mode === "synthetic") {
    return simulatedPayment(server.db, server.environment, body?.order_id);
  }
  const midtrans = midtransSettings();
  const origin = siteOrigin();
  if (!paymentSettingsReady(server.mode) || !midtrans || !origin) {
    return orderUnavailableResponse();
  }
  if (!isOrderId(body?.order_id)) return orderNotFoundResponse();
  const order = await getOrder(server.db, body.order_id).catch(() => null);
  if (
    !order ||
    order.environment !== server.environment ||
    order.mode !== server.mode
  ) {
    return orderNotFoundResponse();
  }
  // R-16: the founder's list always applies in S4.
  if (!emailOnAllowlist(order.email)) return orderUnavailableResponse();

  let limitUsd: number;
  let dailyLimitUsd: number;
  try {
    limitUsd = orderSpendLimitUsd();
    dailyLimitUsd = dailySpendLimitUsd();
  } catch {
    return orderUnavailableResponse();
  }

  const now = new Date();
  try {
    const started = await startAttempt(server.db, {
      orderId: order.id,
      environment: server.environment,
      mode: server.mode,
      now,
      limitUnits: usdToUnits(limitUsd),
      dailyLimitUnits: usdToUnits(dailyLimitUsd),
    });
    if (started.result === "cap_full") {
      // R-21: one `cap_full` notice per UTC day; the cron sends it.
      await recordFounderNotice(server.db, {
        kind: "cap_full",
        subject: utcDayOf(now),
        now,
      });
      return NextResponse.json(
        { error: CAP_FULL_MESSAGE, code: "CAP_FULL" },
        { status: 409 },
      );
    }
    if (started.result === "attempt_open") {
      // R-06: no second attempt; "Lihat cara bayar" is the same Midtrans page.
      return NextResponse.json(
        {
          error: "Pembayaran untuk pesanan ini sedang berjalan.",
          code: "PAYMENT_ALREADY_OPEN",
          ...(started.redirectUrl ? { redirect_url: started.redirectUrl } : {}),
        },
        { status: 409 },
      );
    }
    if (started.result === "refused") {
      return NextResponse.json(
        {
          error: "Pesanan ini tidak dapat dibayar.",
          code: "PAYMENT_NOT_AVAILABLE",
        },
        { status: 409 },
      );
    }
    const snap = await createSnapTransaction(midtrans, {
      orderId: started.attempt.midtrans_order_id,
      email: order.email,
      siteOrigin: origin,
      now,
    });
    const saved =
      snap !== null &&
      (await saveSnapResult(server.db, {
        attemptId: started.attempt.id,
        token: snap.token,
        redirectUrl: snap.redirectUrl,
        now,
      }).catch(() => false));
    if (!snap || !saved) {
      // R-05: the attempt is void: it holds no cap and blocks nothing.
      await voidAttempt(server.db, {
        attemptId: started.attempt.id,
        orderId: order.id,
        now: new Date(),
      }).catch(() => {});
      return NextResponse.json(
        { error: PAYMENT_START_FAILED_MESSAGE, code: "PAYMENT_START_FAILED" },
        { status: 502 },
      );
    }
    return NextResponse.json({ redirect_url: snap.redirectUrl });
  } catch {
    return orderUnavailableResponse();
  }
}
