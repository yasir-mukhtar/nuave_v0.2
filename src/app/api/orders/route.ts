import { NextResponse } from "next/server";
import {
  auditLiveCredentialsResponse,
  auditSwitchResponse,
} from "@/lib/audit/deployment-gate";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import { isSensitiveIntakeText } from "@/lib/audit/sensitive-intake";
import {
  INVALID_SOURCE_INPUT_MESSAGE,
  parseSourceInput,
} from "@/lib/audit/source-input";
import {
  emailOnAllowlist,
  orderSpendLimitUsd,
  parseOrderEmail,
  paymentSettingsReady,
  resendSettings,
  testPassCodeMatches,
} from "@/lib/orders/config";
import {
  orderModeIsExplicit,
  orderRuntime,
  orderUnavailableResponse,
} from "@/lib/orders/http";
import { createOrder, isOrderId, type PaymentKind } from "@/lib/orders/store";
import { dailySpendLimitUsd } from "@/lib/spending/provider-spend";

export const runtime = "nodejs";

/**
 * Spec 016 R-01/R-02/R-05/R-06/R-08 and spec 017: make one order. The server
 * picks the mode, the environment, the id, the order number, the payment kind
 * and every time; the browser sends only the email, the business name and the
 * website from the free lookup, plus two optional fields:
 *
 * - `previous_order_id` (R-19): the order this one replaces. Replaced only if it
 *   is unpaid, not a test pass and has no open payment attempt. If it is paid or
 *   has an open attempt nothing is made and the answer is 409
 *   `PREVIOUS_ORDER_ACTIVE` with `previous_state` "paid" or "payment_open" (the
 *   page then shows the old order's state, never a new order).
 * - `test_pass_code` (R-20): the founder test pass. A right code, with a listed
 *   email and the payment settings in place, makes an order with payment kind
 *   `test`. Every other case (wrong code, no or short secret, missing settings,
 *   unlisted email, a full cap) gets the same neutral answer as any refused
 *   order. The code is never logged or echoed.
 *
 * The order starts `unpaid` and holds nothing (R-10, AC-10). Nothing here calls a
 * paid provider, and the email goes only to D1.
 */
export async function POST(request: Request) {
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;

  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.orderCreateCaller,
  );
  if (rateLimited) {
    // AC-17: a limited request that carries a test-pass code gets the same
    // neutral answer as every other refused test pass. The body is read from a
    // copy and never kept or logged.
    const limitedBody = (await request
      .clone()
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    return limitedBody &&
      typeof limitedBody === "object" &&
      limitedBody.test_pass_code !== undefined
      ? orderUnavailableResponse()
      : rateLimited;
  }

  // In production the mode must be set on purpose: a missing or mistyped
  // NUAVE_AUDIT_MODE makes no order (it would otherwise fall back to synthetic).
  if (!orderModeIsExplicit()) return orderUnavailableResponse();

  const credentialsError = auditLiveCredentialsResponse("order");
  if (credentialsError) return credentialsError;

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const record =
    body && typeof body === "object" && !Array.isArray(body) ? body : {};

  const email = parseOrderEmail(record.email);
  if (!email) {
    return NextResponse.json(
      {
        error: "Masukkan satu alamat email yang valid.",
        code: "INVALID_EMAIL",
      },
      { status: 400 },
    );
  }
  const source = parseSourceInput(
    typeof record.website === "string" ? record.website : "",
  );
  const businessName =
    typeof record.business_name === "string" ? record.business_name.trim() : "";
  if (
    !source ||
    !businessName ||
    businessName.length > 160 ||
    isSensitiveIntakeText(businessName)
  ) {
    return NextResponse.json(
      { error: INVALID_SOURCE_INPUT_MESSAGE, code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const server = orderRuntime();
  if (!server) return orderUnavailableResponse();
  // A live order that could never be emailed must not be taken (and must not
  // hold part of the daily cap): same "not available" answer as a full cap.
  if (server.mode === "live" && !resendSettings()) {
    return orderUnavailableResponse();
  }
  // R-06: live orders only for the founder's list until S4.
  if (server.mode === "live" && !emailOnAllowlist(email)) {
    return orderUnavailableResponse();
  }
  // R-20: a request that carries a code is a test-pass request. It is refused
  // like any other refused order unless the code, the settings and the founder
  // list all agree; it never falls back to a normal order.
  let paymentKind: Extract<PaymentKind, "unpaid" | "test"> = "unpaid";
  if (record.test_pass_code !== undefined) {
    const codeOk = await testPassCodeMatches(record.test_pass_code);
    if (!codeOk || !paymentSettingsReady(server.mode)) {
      return orderUnavailableResponse();
    }
    paymentKind = "test";
  }
  let limitUsd: number;
  let dailyLimitUsd: number;
  try {
    // R-07: an invalid limit fails closed.
    limitUsd = orderSpendLimitUsd();
    dailyLimitUsd = dailySpendLimitUsd();
  } catch {
    return orderUnavailableResponse();
  }

  try {
    // R-19: a replacement order retires the old one in the same write.
    const { result, orderId, previousState } = await createOrder(server.db, {
      email,
      businessName,
      website: source.normalizedUrl,
      mode: server.mode,
      environment: server.environment,
      paymentKind,
      limitUsd,
      dailyLimitUsd,
      previousOrderId: isOrderId(record.previous_order_id)
        ? record.previous_order_id
        : undefined,
      now: new Date(),
    });
    if (result === "previous_active") {
      return NextResponse.json(
        {
          error:
            "Pesanan sebelumnya sudah dibayar atau sedang menunggu pembayaran.",
          code: "PREVIOUS_ORDER_ACTIVE",
          previous_state: previousState,
        },
        { status: 409 },
      );
    }
    if (result !== "created") return orderUnavailableResponse();
    return NextResponse.json({ order_id: orderId, state: "open" });
  } catch {
    return orderUnavailableResponse();
  }
}
