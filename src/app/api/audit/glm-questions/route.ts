import { NextResponse } from "next/server";
import {
  auditLiveCredentialsResponse,
  auditSwitchResponse,
} from "@/lib/audit/deployment-gate";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import { prepareGlmQuestionsForIntake } from "@/lib/intake/glm-local";
import { SMART_INTAKE_INPUT_VERSION } from "@/lib/intake/smart-intake-contract";

export const runtime = "nodejs";

/**
 * GLM question generation for the public audit journey (Spec 010). Check
 * order per R-02b: the NUAVE_NEW_AUDIT_ENABLED switch answers 404 before the
 * body is read; `method` accepts only "direct-ten" (the dormant "glm-slots"
 * and anything else are 400); the GLM caller-IP rate limiter runs next; then
 * live-mode credentials. In synthetic mode the labeled stub transport runs;
 * in live mode a missing credential stops the stage without falling back.
 * Nothing about the request or response is logged here; the raw envelope
 * stays server-side.
 */
export async function POST(request: Request) {
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;

  const body = await request.json().catch(() => null);
  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  // Method acceptance runs before any further body validation or provider
  // work. The approved Spec 009 method is the only one the public route
  // serves; "glm-slots" and unknown values are rejected outright.
  if (record?.method !== "direct-ten") {
    return NextResponse.json(
      {
        status: "invalid_request",
        detail: 'unknown question-generation method — expected "direct-ten"',
      },
      { status: 400 },
    );
  }
  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.glmCaller,
  );
  if (rateLimited) return rateLimited;

  const credentialsError = auditLiveCredentialsResponse("question generation");
  if (credentialsError) return credentialsError;

  if (
    record?.intake &&
    typeof record.intake === "object" &&
    (record.intake as { version?: unknown }).version !==
      SMART_INTAKE_INPUT_VERSION
  ) {
    return NextResponse.json(
      {
        status: "invalid_request",
        detail: "Versi konfirmasi bisnis ini sudah lama. Mulai audit baru.",
      },
      { status: 409 },
    );
  }

  if (!record || !("intake" in record)) {
    return NextResponse.json(
      {
        status: "invalid_request",
        detail: "body must carry the confirmed frozen intake record",
      },
      { status: 400 },
    );
  }

  const outcome = await prepareGlmQuestionsForIntake({
    intake: record.intake,
    stubBehavior: record.stubBehavior,
  });
  return NextResponse.json(outcome);
}
