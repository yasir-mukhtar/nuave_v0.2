import { NextResponse } from "next/server";
import { runScheduledOrders } from "@/lib/orders/cron";

export const runtime = "nodejs";

/** The same key `worker.mjs` presents on a cron run. It is random per isolate
 * and kept in the isolate's globals, so a web request cannot know it. */
const INTERNAL_KEY = Symbol.for("nuave.internal-call-token");

/**
 * Spec 016 R-15: the cron trigger runs through the same handler as a web
 * request, so it sees the same settings, bindings and database. Anything
 * without the isolate's own key gets a plain 404.
 */
export async function POST(request: Request) {
  const key = (globalThis as Record<symbol, unknown>)[INTERNAL_KEY];
  if (
    typeof key !== "string" ||
    request.headers.get("x-nuave-internal") !== key
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(await runScheduledOrders());
}
