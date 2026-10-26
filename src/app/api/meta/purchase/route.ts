import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import {
  sendServerPurchase,
  type PurchaseOutcome,
} from "@/lib/meta/conversions";

export const runtime = "nodejs";

/**
 * Spec 021: the paying customer's browser asks for the server Purchase when
 * it shows the paid screen, only after Allow. The answer is always `204` with
 * no body, whatever happened with Meta (R-12); the only other answers are the
 * shared per-IP limit's own (R-15). One log line per call, with the outcome
 * code only (R-14).
 */
export async function POST(request: Request) {
  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.orderStatusCaller,
  );
  if (rateLimited) return rateLimited;
  const body = await request.json().catch(() => null);
  let outcome: PurchaseOutcome;
  try {
    outcome = await sendServerPurchase(request, body);
  } catch {
    outcome = "error";
  }
  console.info(JSON.stringify({ event: "meta_purchase", outcome }));
  return new Response(null, { status: 204 });
}
