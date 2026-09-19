import { NextResponse } from "next/server";
import {
  glmExperimentEnabled,
  parseGlmQuestionMethod,
  prepareGlmQuestionsForIntake,
} from "@/lib/intake/glm-local";

export const runtime = "nodejs";

/**
 * Founder-only local GLM question experiment (handoff 2026-09-17; Spec 009
 * direct-ten method added 2026-09-18). Returns 404 unless
 * NUAVE_GLM_LOCAL_EXPERIMENT is set on a non-production server — deployed
 * production can never reach it. The default transport is the labeled
 * synthetic stub; a live provider request additionally requires
 * NUAVE_GLM_LIVE_AUTHORIZED plus a server-side credential. `method` is
 * explicit — an unknown method fails before any provider work. Nothing about
 * the request or response is logged here; the raw envelope stays server-side.
 */
export async function POST(request: Request) {
  if (!glmExperimentEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("intake" in body)) {
    return NextResponse.json(
      {
        status: "invalid_request",
        detail: "body must carry the confirmed frozen intake record",
      },
      { status: 400 },
    );
  }
  const record = body as Record<string, unknown>;
  // The approved Spec 009 method is the default the local UI requests; the
  // dormant slot method stays reachable only when named explicitly. An
  // unrecognized method fails here, before any transport work.
  const method =
    record.method === undefined
      ? "direct-ten"
      : parseGlmQuestionMethod(record.method);
  if (!method) {
    return NextResponse.json(
      {
        status: "invalid_request",
        detail:
          'unknown question-generation method — expected "direct-ten" or "glm-slots"',
      },
      { status: 400 },
    );
  }
  const outcome = await prepareGlmQuestionsForIntake({
    intake: record.intake,
    method,
    stubBehavior: record.stubBehavior,
  });
  return NextResponse.json(outcome);
}
