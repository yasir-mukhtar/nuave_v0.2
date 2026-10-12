import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Spec 016 R-04: the browser-driven audit run is gone. Approving the ten
 * questions (`/api/orders/approve`) and the server-side runner replace it, so
 * this route refuses every request before reading anything or calling a
 * provider.
 */
export function POST() {
  return NextResponse.json(
    { error: "Gone", code: "AUDIT_ROUTE_RETIRED" },
    { status: 410 },
  );
}
