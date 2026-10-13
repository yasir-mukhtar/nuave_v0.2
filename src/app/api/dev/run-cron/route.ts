import { NextResponse } from "next/server";
import { auditMode } from "@/lib/audit/deployment-gate";

export const runtime = "nodejs";

/**
 * Spec 016 R-33: local development and tests start the runner here. The
 * trigger exists only when NODE_ENV is `development` and the mode is
 * synthetic; a production build answers 404 to it.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development" || auditMode() !== "synthetic") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { runScheduledOrders } = await import("@/lib/orders/cron");
  return NextResponse.json(await runScheduledOrders({ devTrigger: true }));
}
