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
  resendSettings,
} from "@/lib/orders/config";
import {
  orderModeIsExplicit,
  orderRuntime,
  orderUnavailableResponse,
} from "@/lib/orders/http";
import { createOrder, expireSupersededOrder } from "@/lib/orders/store";
import { dailySpendLimitUsd } from "@/lib/spending/provider-spend";

export const runtime = "nodejs";

/**
 * Spec 016 R-01/R-02/R-05/R-06/R-08: make one order. The server picks the
 * mode, the environment, the id and every time; the browser sends only the
 * email, the business name and the website from the free lookup. Nothing here
 * calls a paid provider, and the email goes only to D1.
 */
export async function POST(request: Request) {
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;

  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.orderCreateCaller,
  );
  if (rateLimited) return rateLimited;

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
    // A replacement order (the website or brand changed): the old one, if it is
    // still open, expires first so its hold returns to the daily cap.
    await expireSupersededOrder(server.db, {
      orderId: record.previous_order_id,
      environment: server.environment,
      now: new Date(),
    }).catch(() => false);
    const { result, orderId } = await createOrder(server.db, {
      email,
      businessName,
      website: source.normalizedUrl,
      mode: server.mode,
      environment: server.environment,
      limitUsd,
      dailyLimitUsd,
      now: new Date(),
    });
    if (result !== "created") return orderUnavailableResponse();
    return NextResponse.json({ order_id: orderId, state: "open" });
  } catch {
    return orderUnavailableResponse();
  }
}
