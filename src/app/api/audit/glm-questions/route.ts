import { NextResponse } from "next/server";
import {
  auditLiveCredentialsResponse,
  auditSwitchResponse,
} from "@/lib/audit/deployment-gate";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import { orderRuntime } from "@/lib/orders/http";
import { orderInState, saveGeneratedQuestions } from "@/lib/orders/store";
import { withOrderSpend } from "@/lib/spending/provider-spend";
import type { SpendDb } from "@/lib/spending/spend-ledger";
import { recordFounderNotice } from "@/lib/payments/notices";
import { prepareGlmQuestionsForIntake } from "@/lib/intake/glm-local";
import {
  parseFrozenSmartIntake,
  SMART_INTAKE_INPUT_VERSION,
} from "@/lib/intake/smart-intake-contract";
import {
  contextSearchPlace,
  parseSavedPool,
} from "@/lib/discovery/order-discovery";
import { prepareSearchGroundedQuestions } from "@/lib/discovery/questions";
import {
  projectQuestionOutcome,
  questionPreflightError,
  questionUnexpectedError,
} from "@/lib/intake/question-public-errors";

export const runtime = "nodejs";

/**
 * GLM question generation for the public audit journey (Spec 010). Check
 * order per R-02b: the NUAVE_NEW_AUDIT_ENABLED switch answers 404 before the
 * body is read; `method` accepts only "direct-ten" (the dormant "glm-slots"
 * and anything else are 400); the GLM caller-IP rate limiter runs next; then
 * live-mode credentials. In synthetic mode the labeled stub transport runs;
 * in live mode a missing credential stops the stage without falling back.
 * Spec 016 R-03: question writing is a paid call, so it needs an `open` order
 * of this environment and mode (`order_id` in the body); without one nothing is
 * sent. The call runs inside the order's own spend limit. Nothing about the
 * request or response is logged here; the raw envelope stays server-side.
 */
export async function POST(request: Request) {
  try {
    const switchedOff = auditSwitchResponse();
    if (switchedOff)
      return NextResponse.json(questionPreflightError("AUDIT_DISABLED"), {
        status: switchedOff.status,
      });

    const body = await request.json().catch(() => null);
    const record =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : null;
    // Method acceptance runs before any further body validation or provider
    // work. The approved Spec 009 method is the only one the public route
    // serves; "glm-slots" and unknown values are rejected outright.
    if (record?.method !== "direct-ten") {
      return NextResponse.json(questionPreflightError("INVALID_METHOD"), {
        status: 400,
      });
    }
    const rateLimited = await enforceAuditCallerRateLimit(
      request,
      (bindings) => bindings.glmCaller,
    );
    if (rateLimited) {
      const projected = questionPreflightError(
        rateLimited.status === 429 ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE",
      );
      return NextResponse.json(
        { error: projected.error, code: projected.code },
        { status: rateLimited.status },
      );
    }

    const credentialsError = auditLiveCredentialsResponse(
      "question generation",
    );
    if (credentialsError)
      return NextResponse.json(
        questionPreflightError("LIVE_CREDENTIALS_MISSING"),
        { status: credentialsError.status },
      );

    if (
      record?.intake &&
      typeof record.intake === "object" &&
      (record.intake as { version?: unknown }).version !==
        SMART_INTAKE_INPUT_VERSION
    ) {
      return NextResponse.json(questionPreflightError("STALE_INTAKE"), {
        status: 409,
      });
    }

    if (!record || !("intake" in record)) {
      return NextResponse.json(questionPreflightError("INVALID_INTAKE"), {
        status: 400,
      });
    }

    const server = orderRuntime();
    const now = new Date();
    const order = server
      ? await orderInState(server.db, {
          orderId: record.order_id,
          environment: server.environment,
          mode: server.mode,
          states: ["open"],
          now,
        })
      : null;
    if (!server || !order) {
      return NextResponse.json(questionPreflightError("ORDER_REQUIRED"), {
        status: 409,
      });
    }

    // Spec 018: an intake with "Kota untuk pencarian" is written from the
    // saved search pool (R-10) or the fallback (R-08); the questions and their
    // server-owned origins are saved on the order for approval (R-07).
    const frozen = parseFrozenSmartIntake(record.intake);
    const place = frozen ? contextSearchPlace(frozen.context) : null;
    if (frozen && place) {
      const grounded = await withOrderSpend(
        { db: server.db, orderId: order.id },
        () =>
          prepareSearchGroundedQuestions({
            intake: record.intake,
            context: frozen.context,
            pool: parseSavedPool(order.discovery_json),
            place,
            stubBehavior: record.stubBehavior,
          }),
      );
      await noticeQuestionLimit(server.db, order, grounded, now);
      logQuestionOutcome(order, grounded);
      if (grounded.status === "ok" && grounded.origins)
        await saveGeneratedQuestions(server.db, {
          orderId: order.id,
          questionsJson: JSON.stringify({
            mode: grounded.mode,
            questions: grounded.questions,
            origins: grounded.origins,
          }),
        });
      // The per-call record is for the log only, never the browser.
      const { tries: _tries, ...answer } = grounded;
      void _tries;
      return NextResponse.json(projectQuestionOutcome(answer));
    }
    const outcome = await withOrderSpend(
      { db: server.db, orderId: order.id },
      () =>
        prepareGlmQuestionsForIntake({
          intake: record.intake,
          stubBehavior: record.stubBehavior,
        }),
    );
    await noticeQuestionLimit(server.db, order, outcome, now);
    logQuestionOutcome(order, outcome);
    return NextResponse.json(projectQuestionOutcome(outcome));
  } catch {
    // Execution may already have started: never fabricate no work or zero cost.
    return NextResponse.json(questionUnexpectedError(), { status: 500 });
  }
}

/** N-18: a paid order that reached its question-writing limit cannot get
 * questions without help; the founder hears once per order. */
async function noticeQuestionLimit(
  db: SpendDb,
  order: { id: string; order_number: string | null },
  outcome: { status: string; reason?: string },
  now: Date,
) {
  if (outcome.status !== "failed" || outcome.reason !== "order_question_limit")
    return;
  await recordFounderNotice(db, {
    kind: "questions_limit",
    subject: order.order_number ?? order.id,
    detail: { order_number: order.order_number },
    now,
  }).catch(() => false);
}

/** One line per question-writing request in the Worker log (Cloudflare
 * observability), so a failure's cause is on record: on 2026-10-26 three
 * failed requests left only "incomplete", and finding "finish_reason:
 * length" took a live replay. It carries the order number, how each call
 * ended and why, as codes only: never a detail text (it can quote the
 * model's questions), the intake or the email. */
function logQuestionOutcome(
  order: { order_number: string | null },
  outcome: {
    status: string;
    reason?: string;
    mode?: string;
    tries?: unknown[];
  },
) {
  const line = JSON.stringify({
    event: "question_writing",
    order: order.order_number,
    status: outcome.status,
    ...(outcome.mode ? { mode: outcome.mode } : {}),
    ...(outcome.reason ? { reason: outcome.reason } : {}),
    ...(outcome.tries ? { tries: outcome.tries } : {}),
  });
  if (outcome.status === "ok") console.info(line);
  else console.warn(line);
}
