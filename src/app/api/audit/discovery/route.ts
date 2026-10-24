import { NextResponse } from "next/server";
import { auditSwitchResponse } from "@/lib/audit/deployment-gate";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import {
  contextSearchPlace,
  discoverForOrder,
} from "@/lib/discovery/order-discovery";
import { parseFrozenSmartIntake } from "@/lib/intake/smart-intake-contract";
import { orderRuntime } from "@/lib/orders/http";
import { orderInState } from "@/lib/orders/store";

export const runtime = "nodejs";

/**
 * Spec 018 R-04, R-07 and R-15: search discovery for one open, paid order, in
 * its own request before the questions are written. The pool stays on the
 * server; the browser only learns whether search data was found. Provider
 * problems never fail the request: the pool is kept as collected and question
 * writing takes the R-08 fallback when it is thin.
 */
export async function POST(request: Request) {
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;
  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.extractCaller,
  );
  if (rateLimited) return rateLimited;

  const body = (await request.json().catch(() => null)) as {
    order_id?: unknown;
    intake?: unknown;
  } | null;
  const frozen = parseFrozenSmartIntake(body?.intake);
  const place = frozen ? contextSearchPlace(frozen.context) : null;
  if (!frozen || !place) {
    return NextResponse.json(
      {
        error: "Periksa data audit yang dikirim dan coba lagi.",
        code: "INVALID_REQUEST",
      },
      { status: 400 },
    );
  }
  const server = orderRuntime();
  const order = server
    ? await orderInState(server.db, {
        orderId: body?.order_id,
        environment: server.environment,
        mode: server.mode,
        states: ["open"],
        now: new Date(),
      })
    : null;
  if (!server || !order) {
    return NextResponse.json(
      { error: "Pesanan ini tidak dapat dilanjutkan.", code: "ORDER_REQUIRED" },
      { status: 409 },
    );
  }
  try {
    const outcome = await discoverForOrder({
      db: server.db,
      order,
      context: frozen.context,
      place,
    });
    return NextResponse.json({
      status: "ok",
      searchData: !outcome.pool.thin,
      locked: outcome.locked,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Pencarian data belum berhasil. Coba lagi.",
        code: "DISCOVERY_FAILED",
      },
      { status: 500 },
    );
  }
}
