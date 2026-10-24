import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AUDIT_CLIENT_CONTRACT_VERSION,
  AUDIT_CLIENT_UPDATE_REQUIRED_CODE,
  AUDIT_CLIENT_UPDATE_REQUIRED_MESSAGE,
  isCurrentAuditClientContract,
} from "@/lib/audit/client-contract";
import { auditSwitchResponse } from "@/lib/audit/deployment-gate";
import {
  contextIdentityGuard,
  contextNamedComparators,
  directTenContextSchema,
} from "@/lib/audit/direct-ten-context-v2";
import { parseSourceInput } from "@/lib/audit/source-input";
import { lockedQuestionPackForMethod } from "@/lib/audit/locked-question-pack";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import { validateDirectTenQuestions } from "@/lib/audit/questions-id-direct-ten";
import {
  orderNotFoundResponse,
  orderRuntime,
  orderUnavailableResponse,
} from "@/lib/orders/http";
import {
  approveOrder,
  getOrder,
  isOrderId,
  orderMayRunPaidWork,
  type OrderRow,
} from "@/lib/orders/store";
import { brandInputFor } from "@/lib/discovery/discover";
import {
  contextSearchPlace,
  parseSavedPool,
} from "@/lib/discovery/order-discovery";
import {
  originsForApproved,
  validateSearchGroundedPack,
  type QuestionOrigin,
} from "@/lib/discovery/question-rules";
import type { DirectTenAuditContext } from "@/lib/audit/direct-ten-context-v2";

export const runtime = "nodejs";

const promptSchema = z.object({
  prompt_id: z.string(),
  question: z.string().trim().min(1).max(700),
  review_status: z.literal("needs_human_review"),
});

const approveSchema = z
  .object({
    order_id: z.string(),
    client_contract_version: z.literal(AUDIT_CLIENT_CONTRACT_VERSION),
    question_method: z.literal("direct-ten"),
    context: directTenContextSchema,
    prompts: z.array(promptSchema).length(10),
    /** The wording the question writer produced, before the owner's edits. */
    originals: z.array(z.string().trim().min(1).max(700)).length(10),
    /** Spec 018: the origins the browser showed. Only compared with the
     * server's own (R-07, AC-04); never trusted. */
    question_origins: z.array(z.unknown()).length(10).optional(),
  })
  .strict();

type SavedQuestions = {
  mode: "grounded" | "fallback";
  questions: string[];
  origins: QuestionOrigin[];
};

/** Spec 018 R-07, R-11 and R-11a: the server derives each approved
 * question's origin from what it saved when the questions were written, and
 * runs the search checks on the approved texts. Returns the origins, or the
 * issue messages. */
function searchGroundedApproval(
  order: OrderRow,
  context: DirectTenAuditContext,
  approved: string[],
  shown: unknown[] | undefined,
): { origins: QuestionOrigin[] } | { errors: string[] } | null {
  const place = contextSearchPlace(context);
  if (!place) return null;
  let saved: SavedQuestions | null = null;
  try {
    saved = order.questions_json
      ? (JSON.parse(order.questions_json) as SavedQuestions)
      : null;
  } catch {
    saved = null;
  }
  if (!saved || saved.questions?.length !== 10 || saved.origins?.length !== 10)
    return { errors: ["Buat ulang pertanyaan audit, lalu coba lagi."] };
  const origins = originsForApproved({
    approved,
    generated: saved.questions,
    generatedOrigins: saved.origins,
  });
  if (shown && JSON.stringify(shown) !== JSON.stringify(origins))
    return { errors: ["Asal pertanyaan tidak sesuai. Muat ulang halaman."] };
  const pool = parseSavedPool(order.discovery_json);
  const issues = validateSearchGroundedPack({
    questions: approved,
    origins,
    place,
    pool: saved.mode === "fallback" && pool ? { ...pool, thin: true } : pool,
    brand: brandInputFor(context),
    allowEdited: true,
  });
  return issues.length
    ? { errors: [...new Set(issues.map((issue) => issue.message))] }
    : { origins };
}

/**
 * Spec 016 R-17: approving the ten questions. Today's checks from the old run
 * route come first (question pack lock, identity guard, direct-ten question
 * validation); then ONE batch moves the order to `running` and saves, unchanged
 * from then on, the confirmed business details, the approved and original
 * questions, the start time and the deadline. This is the browser's last paid-
 * path step: the cron runs the audit. It makes no provider call itself.
 */
export async function POST(request: Request) {
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;
  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.orderStatusCaller,
  );
  if (rateLimited) return rateLimited;

  const raw = (await request.json().catch(() => null)) as unknown;
  const clientVersion =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>).client_contract_version
      : undefined;
  if (!isCurrentAuditClientContract(clientVersion)) {
    return NextResponse.json(
      {
        error: AUDIT_CLIENT_UPDATE_REQUIRED_MESSAGE,
        code: AUDIT_CLIENT_UPDATE_REQUIRED_CODE,
      },
      { status: 409 },
    );
  }
  const parsed = approveSchema.safeParse(raw);
  if (!parsed.success || !isOrderId(parsed.data.order_id)) {
    return NextResponse.json(
      {
        error: "Periksa data audit yang dikirim dan coba lagi.",
        code: "INVALID_REQUEST",
      },
      { status: 400 },
    );
  }
  const input = parsed.data;

  let locked;
  try {
    locked = lockedQuestionPackForMethod({
      prompts: input.prompts,
      brief: input.context,
      questionMethod: "direct-ten",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Periksa pertanyaan audit dan coba lagi.",
      },
      { status: 422 },
    );
  }
  const questionErrors = validateDirectTenQuestions(
    locked.prompts.map((prompt) => prompt.question),
    {
      brief: contextIdentityGuard(input.context),
      comparators: contextNamedComparators(input.context),
    },
  );
  if (questionErrors.length) {
    return NextResponse.json(
      { error: questionErrors.map((issue) => issue.message).join(" ") },
      { status: 422 },
    );
  }

  const server = orderRuntime();
  if (!server) return orderUnavailableResponse();
  try {
    const now = new Date();
    const order = await getOrder(server.db, input.order_id);
    if (
      !order ||
      order.environment !== server.environment ||
      order.mode !== server.mode
    ) {
      return orderNotFoundResponse();
    }
    // The reading and the questions must be for the website this order was
    // made for (the free lookup's address), never another one.
    if (
      parseSourceInput(input.context.identity.source)?.normalizedUrl !==
      order.website
    ) {
      return NextResponse.json(
        { error: "Pesanan ini tidak dapat dilanjutkan.", code: "ORDER_STATE" },
        { status: 409 },
      );
    }
    // R-18: an unpaid or replaced order is refused with the same answer as an
    // order that cannot continue, before anything is written.
    if (!orderMayRunPaidWork(order)) {
      return NextResponse.json(
        { error: "Pesanan ini tidak dapat dilanjutkan.", code: "ORDER_STATE" },
        { status: 409 },
      );
    }
    const search = searchGroundedApproval(
      order,
      input.context,
      locked.prompts.map((prompt) => prompt.question),
      input.question_origins,
    );
    if (search && "errors" in search) {
      return NextResponse.json(
        { error: search.errors.join(" "), code: "QUESTION_RULES" },
        { status: 422 },
      );
    }
    // Approving twice is harmless: the saved questions never change.
    if (order.state !== "open") {
      return order.started_at
        ? NextResponse.json({ state: order.state })
        : NextResponse.json(
            {
              error: "Pesanan ini tidak dapat dilanjutkan.",
              code: "ORDER_STATE",
            },
            { status: 409 },
          );
    }
    const approved = await approveOrder(server.db, {
      orderId: order.id,
      environment: server.environment,
      mode: server.mode,
      businessName: input.context.identity.name,
      promptIds: locked.prompts.map((prompt) => prompt.prompt_id),
      intakeJson: JSON.stringify({
        context: input.context,
        prompts: locked.prompts,
        originals: input.originals,
        ...(search ? { question_origins: search.origins } : {}),
      }),
      now,
    });
    if (!approved) {
      return NextResponse.json(
        { error: "Pesanan ini tidak dapat dilanjutkan.", code: "ORDER_STATE" },
        { status: 409 },
      );
    }
    return NextResponse.json({ state: "running" });
  } catch {
    return orderUnavailableResponse();
  }
}
