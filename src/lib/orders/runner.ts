import type { AuditSubject } from "../audit/direct-ten-context-v2";
import {
  OBSERVATION_CALL_TIMEOUT_MS,
  REPORT_CALL_TIMEOUT_MS,
} from "../audit/call-timeouts";
import {
  assertReportGenerationGate,
  createValidatedAuditReport,
  ReportPipelineError,
  type ReportGenerator,
} from "../audit/report-pipeline";
import {
  classifyReportRecovery,
  type ReportFailureCode,
} from "../audit/report-recovery";
import {
  classifyObservationFailure,
  markObservationFailed,
  failedTestReason,
  retryBackoffMs,
  stampTelemetryAttempt,
  stampTelemetryFailureCategory,
  MAX_ATTEMPTS_PER_QUESTION,
  type QuestionExecuteInput,
} from "../audit/retry";
import {
  AuditBudgetError,
  AuditCallExecutionError,
  serverOwnedAuditBudget,
} from "../audit/telemetry";
import type {
  AuditCallTelemetry,
  AuditObservation,
  AuditPrompt,
} from "../audit/types";
import { SpendCapError, withOrderSpend } from "../spending/provider-spend";
import { endOrder, type SpendDb } from "../spending/spend-ledger";
import {
  failureEmail,
  readyEmail,
  sendWithinAttempt,
  type MailSender,
} from "./mail";
import { orderSafetyIdentifier, sha256Hex } from "./config";
import {
  activeOrders,
  claimOrderLease,
  claimQuestion,
  claimReportAttempt,
  exhaustSpentQuestions,
  expireOpenOrders,
  failedOrdersNeedingEmail,
  getOrder,
  listQuestions,
  moveToReporting,
  nextEmailAttempt,
  ordersPastDeadline,
  recordEmail,
  refundReportAttempt,
  releaseOrderLease,
  renewOrderLease,
  replaceLinkHash,
  saveQuestionDone,
  saveQuestionFailure,
  saveReport,
  type OrderEnvironment,
  type OrderMode,
  type OrderRow,
} from "./store";

/**
 * The server-side audit runner (spec 016 R-15..R-23). A cron trigger calls
 * `runOrders` every minute. Each run does at most ONE audit step per order (one
 * question attempt, or one report run including its language fix) and stops
 * starting new work when the time budget would be passed (R-16). Everything that
 * must survive a restart is in D1; nothing is kept in memory between runs.
 */

/** A question step is one provider call; a report step is up to two (the
 * report and its language fix). The margin covers D1 writes around the call. */
const STEP_MARGIN_MS = 15_000;
export const OBSERVATION_STEP_MS = OBSERVATION_CALL_TIMEOUT_MS + STEP_MARGIN_MS;
export const REPORT_STEP_MS = 2 * REPORT_CALL_TIMEOUT_MS + STEP_MARGIN_MS;
/** The lease and the question claim last longer than the call timeout (R-18). */
const LEASE_SLACK_MS = 30_000;
/** No new step starts unless it can finish inside this budget. */
export const RUN_BUDGET_MS = 300_000;

export type RunnerDeps = {
  db: SpendDb;
  /** Only orders of this environment and mode are ever touched (R-15). */
  environment: OrderEnvironment;
  mode: OrderMode;
  /** The fixed site address of this environment, for the private link. */
  siteOrigin: string;
  now: () => Date;
  /** One observation call. Throws or returns a failed observation on failure. */
  execute: (input: QuestionExecuteInput) => Promise<AuditObservation>;
  generateReport: ReportGenerator;
  /** Null when no sender is configured: no email can be accepted. */
  sender: MailSender | null;
  runBudgetMs?: number;
};

export type StepOutcome =
  | "expired"
  | "failed_deadline"
  | "waiting"
  | "skipped"
  | "question_done"
  | "question_retry"
  | "question_failed"
  | "to_reporting"
  | "report_saved"
  | "report_retry"
  | "report_failed"
  | "delivered"
  | "email_pending"
  | "failed"
  | "failure_email";

export type RunSummary = {
  /** One entry per thing done. No ids, emails or secrets. */
  outcomes: StepOutcome[];
};

type Intake = {
  context: AuditSubject;
  prompts: AuditPrompt[];
};

function parseIntake(order: OrderRow): Intake | null {
  try {
    const value = JSON.parse(order.intake_json ?? "null") as Partial<Intake>;
    return value &&
      value.context &&
      Array.isArray(value.prompts) &&
      value.prompts.length === 10
      ? (value as Intake)
      : null;
  } catch {
    return null;
  }
}

const iso = (at: Date) => at.toISOString();

export { orderSafetyIdentifier, sha256Hex };

/** Per run, so one cron run stays under the Free plan's 50 D1 queries
 * (measured in runner.test.ts "one run with every cap reached"). */
export const MAX_ORDERS_PER_RUN = 2;
export const MAX_EXPIRED_PER_RUN = 5;

export async function runOrders(deps: RunnerDeps): Promise<RunSummary> {
  const outcomes: StepOutcome[] = [];
  const startedAt = deps.now().getTime();
  const budgetMs = deps.runBudgetMs ?? RUN_BUDGET_MS;
  const owner = crypto.randomUUID();
  const scope = { environment: deps.environment, mode: deps.mode };
  const failedNow = new Set<string>();

  // R-22: an `open` order past its time becomes `expired`, which settles it.
  const expired = await expireOpenOrders(deps.db, {
    ...scope,
    now: deps.now(),
    limit: MAX_EXPIRED_PER_RUN,
  });
  outcomes.push(...expired.map((): StepOutcome => "expired"));

  // R-23: at the deadline an order not yet delivered becomes `failed` (once)
  // and sends the failure email.
  for (const id of await ordersPastDeadline(deps.db, {
    ...scope,
    now: deps.now(),
    limit: MAX_ORDERS_PER_RUN,
  })) {
    if (await failOrder(deps, id, "deadline")) {
      failedNow.add(id);
      outcomes.push("failed_deadline");
    }
  }

  for (const id of await activeOrders(deps.db, {
    ...scope,
    limit: MAX_ORDERS_PER_RUN,
  })) {
    const order = await getOrder(deps.db, id);
    if (
      !order ||
      order.mode !== deps.mode ||
      order.environment !== deps.environment
    ) {
      continue;
    }
    const stepMs =
      order.state === "reporting" ? REPORT_STEP_MS : OBSERVATION_STEP_MS;
    if (deps.now().getTime() - startedAt + stepMs > budgetMs) {
      outcomes.push("waiting");
      continue;
    }
    if (
      !(await claimOrderLease(deps.db, {
        orderId: id,
        owner,
        now: deps.now(),
        leaseMs: stepMs + LEASE_SLACK_MS,
      }))
    ) {
      outcomes.push("skipped"); // another runner has it
      continue;
    }
    try {
      // Read the order again now that the lease is ours: another runner may have
      // moved it on between the first read and the claim.
      const current = await getOrder(deps.db, id);
      if (
        !current ||
        current.mode !== deps.mode ||
        current.environment !== deps.environment ||
        (current.state !== "running" && current.state !== "reporting")
      ) {
        outcomes.push("skipped");
        continue;
      }
      const outcome =
        current.state === "running"
          ? await questionStep(deps, current, owner, stepMs)
          : await reportStep(deps, current, owner, stepMs);
      if (
        outcome === "failed" ||
        outcome === "question_failed" ||
        outcome === "report_failed"
      ) {
        failedNow.add(id); // its failure email was just attempted
      }
      outcomes.push(outcome);
    } finally {
      await releaseOrderLease(deps.db, { orderId: id, owner }).catch(() => {});
    }
  }

  // R-25: the failure email is retried for 24 hours after the failure.
  for (const id of await failedOrdersNeedingEmail(deps.db, {
    ...scope,
    now: deps.now(),
    limit: MAX_ORDERS_PER_RUN,
  })) {
    if (failedNow.has(id)) continue;
    if (await sendFailureEmail(deps, id)) outcomes.push("failure_email");
  }
  return { outcomes };
}

/** Becoming `failed` happens once and sends the failure email. */
async function failOrder(
  deps: RunnerDeps,
  orderId: string,
  code: string,
): Promise<boolean> {
  const ended = await endOrder(deps.db, {
    orderId,
    from: ["running", "reporting"],
    to: "failed",
    failureCode: code,
    now: deps.now,
  });
  if (ended) await sendFailureEmail(deps, orderId);
  return ended;
}

async function sendFailureEmail(
  deps: RunnerDeps,
  orderId: string,
): Promise<boolean> {
  const order = await getOrder(deps.db, orderId);
  if (!order || !deps.sender) return false;
  const attempt = await nextEmailAttempt(deps.db, { orderId, kind: "failure" });
  const idempotencyKey = `nuave-order-${orderId}-failure-${attempt}`;
  const mail = failureEmail({ businessName: order.business_name });
  const result = await sendWithinAttempt(deps.sender, {
    to: order.email,
    ...mail,
    idempotencyKey,
  });
  await recordEmail(deps.db, {
    orderId,
    kind: "failure",
    attempt,
    idempotencyKey,
    accepted: result.accepted,
    messageId: result.messageId ?? null,
    now: deps.now(),
  });
  return result.accepted;
}

/* --------------------------------- questions ------------------------------- */

async function questionStep(
  deps: RunnerDeps,
  order: OrderRow,
  owner: string,
  stepMs: number,
): Promise<StepOutcome> {
  const intake = parseIntake(order);
  if (!intake) {
    await failOrder(deps, order.id, "intake_invalid");
    return "failed";
  }
  await exhaustSpentQuestions(deps.db, { orderId: order.id, now: deps.now() });
  const questions = await listQuestions(deps.db, order.id);
  // R-23: an order that cannot finish (attempts used) becomes `failed`.
  if (questions.some((question) => question.status === "exhausted")) {
    await failOrder(deps, order.id, "question_failed");
    return "question_failed";
  }
  // R-20: after ten saved results the order moves to `reporting`.
  if (questions.every((question) => question.status === "done")) {
    return (await moveToReporting(deps.db, order.id))
      ? "to_reporting"
      : "skipped";
  }
  const nowIso = iso(deps.now());
  const next = questions.find(
    (question) =>
      question.status === "pending" &&
      question.attempts < MAX_ATTEMPTS_PER_QUESTION &&
      (!question.claim_until || question.claim_until <= nowIso) &&
      (!question.next_attempt_at || question.next_attempt_at <= nowIso),
  );
  if (!next) return "waiting";
  const prompt = intake.prompts.find(
    (item) => item.prompt_id === next.prompt_id,
  );
  if (!prompt) {
    await failOrder(deps, order.id, "intake_invalid");
    return "failed";
  }

  const leaseMs = stepMs + LEASE_SLACK_MS;
  // R-18: renew before each question claim and each paid call; stop if it fails.
  if (
    !(await renewOrderLease(deps.db, {
      orderId: order.id,
      owner,
      now: deps.now(),
      leaseMs,
    }))
  ) {
    return "skipped";
  }
  const attempt = await claimQuestion(deps.db, {
    orderId: order.id,
    promptId: next.prompt_id,
    owner,
    now: deps.now(),
    claimMs: stepMs + LEASE_SLACK_MS,
  });
  if (attempt === null) return "skipped";
  if (
    !(await renewOrderLease(deps.db, {
      orderId: order.id,
      owner,
      now: deps.now(),
      leaseMs,
    }))
  ) {
    return "skipped";
  }

  const safetyIdentifier = await orderSafetyIdentifier(order.id);
  let observation: AuditObservation;
  try {
    observation = await withOrderSpend(
      { db: deps.db, orderId: order.id, now: deps.now },
      () =>
        deps.execute({
          prompt,
          brief: intake.context,
          safety_identifier: safetyIdentifier,
          // The browser's budget is never used; the order's hold decides (R-09).
          budget: serverOwnedAuditBudget(),
          signal: AbortSignal.timeout(OBSERVATION_CALL_TIMEOUT_MS),
        }),
    );
  } catch (error) {
    if (error instanceof SpendCapError) {
      if (error.reason === "order_limit") {
        // R-09/AC-06: the next call would pass the hold. It was not sent.
        await saveQuestionFailure(deps.db, {
          orderId: order.id,
          promptId: next.prompt_id,
          owner,
          exhausted: true,
          nextAttemptAt: null,
          failure: "order_limit",
          attemptsJson: next.attempts_json,
        });
        await failOrder(deps, order.id, "order_limit");
        return "failed";
      }
      if (error.reason === "order_refused") return "skipped";
      // The ledger was unavailable or the day's cap is full: nothing was sent,
      // so the attempt is given back and tried again on a later run.
      await saveQuestionFailure(deps.db, {
        orderId: order.id,
        promptId: next.prompt_id,
        owner,
        exhausted: false,
        nextAttemptAt: null,
        failure: "ledger_unavailable",
        attemptsJson: next.attempts_json,
        refund: true,
      });
      return "question_retry";
    }
    // Any other throw is one failed attempt: its cost, if any, stays held.
    observation = failedObservation(prompt, error);
  }

  const classification = classifyObservationFailure(observation);
  if (classification.evaluable) {
    const stamped = stampTelemetryAttempt(observation, attempt);
    const earlier = JSON.parse(next.attempts_json) as AuditCallTelemetry[];
    const saved = await saveQuestionDone(deps.db, {
      orderId: order.id,
      promptId: next.prompt_id,
      owner,
      observationJson: JSON.stringify({
        ...stamped,
        telemetry: [...earlier, ...stamped.telemetry],
      }),
    });
    if (!saved) return "skipped";
    await moveToReporting(deps.db, order.id);
    return "question_done";
  }

  const failed = stampTelemetryFailureCategory(
    stampTelemetryAttempt(
      observation.run_status === "failed"
        ? observation
        : markObservationFailed(observation, failedTestReason(observation)),
      attempt,
    ),
    classification.category,
  );
  const exhausted =
    classification.category === "non_retryable" ||
    attempt >= MAX_ATTEMPTS_PER_QUESTION;
  const earlier = JSON.parse(next.attempts_json) as AuditCallTelemetry[];
  await saveQuestionFailure(deps.db, {
    orderId: order.id,
    promptId: next.prompt_id,
    owner,
    exhausted,
    nextAttemptAt:
      !exhausted && classification.category !== "non_retryable"
        ? new Date(
            deps.now().getTime() +
              retryBackoffMs(classification.category, attempt),
          )
        : null,
    failure: classification.category,
    attemptsJson: JSON.stringify([...earlier, ...failed.telemetry]),
  });
  if (exhausted) {
    await failOrder(deps, order.id, "question_failed");
    return "question_failed";
  }
  return "question_retry";
}

function failedObservation(
  prompt: AuditPrompt,
  error: unknown,
): AuditObservation {
  return {
    prompt_id: prompt.prompt_id,
    category: prompt.category,
    branded: prompt.branded,
    question: prompt.question,
    instruction_version: "",
    system: "",
    requested_model: "",
    returned_model: "",
    response_id: "",
    observed_at: new Date().toISOString(),
    raw_answer: "",
    sources: [],
    run_status: "failed",
    failure_reason:
      error instanceof Error ? error.message : "The request failed.",
    telemetry: [],
  } as unknown as AuditObservation;
}

/* ---------------------------------- report -------------------------------- */

async function reportStep(
  deps: RunnerDeps,
  order: OrderRow,
  owner: string,
  stepMs: number,
): Promise<StepOutcome> {
  // The saved report never changes: once it exists, only the email is left.
  if (order.report_json) return readyEmailStep(deps, order);

  const intake = parseIntake(order);
  if (!intake) {
    await failOrder(deps, order.id, "intake_invalid");
    return "failed";
  }
  const leaseMs = stepMs + LEASE_SLACK_MS;
  const attempt = await claimReportAttempt(deps.db, {
    orderId: order.id,
    owner,
  });
  if (attempt === null) {
    // No attempt could be claimed: either none is left (R-19, checked from D1:
    // final) or the report was saved or the order moved on since it was read.
    const latest = await getOrder(deps.db, order.id);
    if (latest?.state === "reporting" && latest.report_json) {
      return readyEmailStep(deps, latest);
    }
    if (latest?.state !== "reporting") return "skipped";
    await failOrder(deps, order.id, "report_limit");
    return "report_failed";
  }
  if (
    !(await renewOrderLease(deps.db, {
      orderId: order.id,
      owner,
      now: deps.now(),
      leaseMs,
    }))
  ) {
    return "skipped";
  }

  const rows = await listQuestions(deps.db, order.id);
  const observations = rows.flatMap((row) =>
    row.observation_json
      ? [JSON.parse(row.observation_json) as AuditObservation]
      : [],
  );
  const input = {
    brief: intake.context,
    prompts: intake.prompts,
    observations,
    safety_identifier: await orderSafetyIdentifier(order.id),
    budget: serverOwnedAuditBudget(),
    language: "id" as const,
    question_method: "direct-ten" as const,
    // Server-internal: the labeled synthetic substitute's evidence is admitted
    // only in synthetic mode, never by request.
    ...(deps.mode === "synthetic" ? { allow_synthetic_evidence: true } : {}),
  };

  let code: ReportFailureCode;
  try {
    assertReportGenerationGate(input);
    const report = await withOrderSpend(
      { db: deps.db, orderId: order.id, now: deps.now },
      () =>
        createValidatedAuditReport(input, async (...args) => {
          // R-18: the language-fix call is a second provider call; renew the
          // lease first so it cannot run on a lease that has lapsed.
          if (args[1] !== undefined) {
            const renewed = await renewOrderLease(deps.db, {
              orderId: order.id,
              owner,
              now: deps.now(),
              leaseMs,
            });
            if (!renewed) throw new SpendCapError("order_refused");
          }
          return deps.generateReport(...args);
        }),
    );
    const saved = await saveReport(deps.db, {
      orderId: order.id,
      owner,
      reportJson: JSON.stringify(report),
      now: deps.now(),
    });
    if (!saved) return "skipped";
    // Send the ready email now; `delivered` needs Resend to accept it.
    const fresh = await getOrder(deps.db, order.id);
    if (fresh) await readyEmailStep(deps, fresh);
    return "report_saved";
  } catch (error) {
    if (error instanceof SpendCapError) {
      if (error.reason === "order_limit") {
        await failOrder(deps, order.id, "order_limit");
        return "report_failed";
      }
      if (error.reason === "order_refused") return "skipped";
      // Nothing was sent: give the attempt back and try again on a later run.
      await refundReportAttempt(deps.db, { orderId: order.id, owner });
      return "report_retry";
    } else if (error instanceof ReportPipelineError) {
      code = error.code;
    } else if (error instanceof AuditCallExecutionError) {
      code = "REPORT_TRANSIENT_FAILURE";
    } else if (error instanceof AuditBudgetError) {
      code = "REPORT_LIMIT_EXHAUSTED";
    } else {
      code = "REPORT_INTEGRITY_FAILURE";
    }
  }
  // R-19: `classifyReportRecovery` decides, with the attempts stored in D1.
  const recovery = classifyReportRecovery(code, attempt);
  if (!recovery.can_retry) {
    await failOrder(deps, order.id, code.toLowerCase());
    return "report_failed";
  }
  return "report_retry";
}

/** R-23/R-24: each send of the ready email makes a new link secret and
 * replaces the stored hash in the same write; `delivered` follows only when the
 * sender has accepted the email. */
async function readyEmailStep(
  deps: RunnerDeps,
  order: OrderRow,
): Promise<StepOutcome> {
  if (!deps.sender) return "email_pending";
  const secret = linkSecret();
  const replaced = await replaceLinkHash(deps.db, {
    orderId: order.id,
    linkHash: await sha256Hex(secret),
  });
  if (!replaced) return "email_pending"; // link switched off, or order moved on
  const attempt = await nextEmailAttempt(deps.db, {
    orderId: order.id,
    kind: "ready",
  });
  const idempotencyKey = `nuave-order-${order.id}-ready-${attempt}`;
  const mail = readyEmail({
    businessName: order.business_name,
    link: `${deps.siteOrigin}/r#${secret}`,
  });
  const result = await sendWithinAttempt(deps.sender, {
    to: order.email,
    ...mail,
    idempotencyKey,
  });
  await recordEmail(deps.db, {
    orderId: order.id,
    kind: "ready",
    attempt,
    idempotencyKey,
    accepted: result.accepted,
    messageId: result.messageId ?? null,
    now: deps.now(),
  });
  if (!result.accepted) return "email_pending";
  const delivered = await endOrder(deps.db, {
    orderId: order.id,
    from: ["reporting"],
    to: "delivered",
    now: deps.now,
  });
  return delivered ? "delivered" : "skipped";
}

/** At least 128 random bits (R-24): 24 bytes, URL-safe. */
function linkSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
