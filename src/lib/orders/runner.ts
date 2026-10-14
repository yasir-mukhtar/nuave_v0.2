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
import {
  endOrder,
  type OrderState,
  type SpendDb,
} from "../spending/spend-ledger";
import { reconcileDueAttempts } from "../payments/check";
import {
  dueFounderNotices,
  isRefundNotice,
  recordCapAlerts,
  sendFounderNotice,
  type NoticeRow,
} from "../payments/founder-notices";
import type { MidtransConfig } from "../payments/midtrans";
import { ORDER_GROSS_AMOUNT_TEXT } from "../payments/midtrans";
import { orderFailedNoticeStatement } from "../payments/notices";
import {
  duePaymentEmail,
  sendPaymentEmail,
  type DuePaymentEmail,
} from "../payments/payment-email";
import {
  failureEmail,
  readyEmail,
  sendWithinAttempt,
  type MailSender,
} from "./mail";
import { newLinkSecret, orderSafetyIdentifier, sha256Hex } from "./config";
import {
  activeOrders,
  claimOrderLease,
  claimQuestion,
  claimReportAttempt,
  emailBackingOff,
  emailHistory,
  ensureOrderNumber,
  exhaustSpentQuestions,
  expireOpenOrders,
  failedOrdersNeedingEmail,
  getOrder,
  listQuestions,
  moveToReporting,
  ordersPastDeadline,
  paidNotStartedOrders,
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
  /** Pause between email tries (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
  /** Null when no sender is configured: no email can be accepted. */
  sender: MailSender | null;
  runBudgetMs?: number;
  /** Spec 017 R-23: false when the emergency switch is off or the AI settings
   * are missing. Only audit steps (and the deadline sweep, which needs them)
   * stop; every other task still runs. Default true. */
  auditEnabled?: boolean;
  /** Spec 017 tasks that need settings. Absent: no reconciliation, no cap
   * alerts, no founder notices. */
  payments?: {
    /** Null in synthetic mode or when the key is missing: no reconciliation. */
    midtrans: MidtransConfig | null;
    limitUnits: number;
    dailyLimitUnits: number;
    /** Null: no founder notice can be sent. */
    founderEmail: string | null;
  };
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
  | "failure_email"
  | "reconciled"
  | "paid_not_started"
  | "payment_email"
  | "notice";

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

/** Per run limits. Cloudflare Free counts D1 queries as subrequests, 50 per
 * invocation shared with outbound requests (paid provider calls and Resend
 * sends). A run therefore keeps a meter of D1 queries plus outbound requests
 * and starts a piece of work only if its measured worst typical cost still
 * fits under RUN_UNIT_LIMIT (40, a margin under 50). Measured in
 * runner-worst-case.test.ts.
 *
 * Spec 017 R-23: Cloudflare's limits pages (read 2026-10-14) list "Subrequests per
 * invocation" (Free 50, Paid 10,000) and "Subrequests to internal services"
 * (Free 1,000, Paid default 10,000) but do not say which one D1 queries count
 * toward, so separate counting is not confirmed and the 40-unit meter stays. */
export const MAX_ORDERS_PER_RUN = 2;
export const MAX_EXPIRED_PER_RUN = 3;
export const MAX_FAILURE_EMAILS_PER_RUN = 1;
export const MAX_DEADLINE_FAILURES_PER_RUN = 1;
export const RUN_UNIT_LIMIT = 40;
/** Each piece of work, in D1 queries + outbound requests (with a small margin):
 * an expiry; a deadline failure with its failure email (three tries); a
 * question step with its paid call; an email-only retry of a ready email; a
 * report step with up to two paid calls and the ready email; one failure-email
 * retry (three tries). */
export const RUN_COST = {
  expiry: 2,
  deadline: 12,
  question: 18,
  light: 9,
  heavy: 27,
  retry: 7,
  /** One payment-received email (getting its number, three tries, the record). */
  paymentEmail: 6,
  /** One founder notice (the claim, three tries, the mark). */
  notice: 6,
} as const;
/** R-23: reconciliation may spend the meter up to here; the rest is kept for
 * the fixed queries that follow it (about 8) so the run still fits. */
export const RECONCILE_UNIT_LIMIT = RUN_UNIT_LIMIT - 8;
/** R-23: a payment email or notice that is due and has existed this long has
 * already waited a run (runs are a minute apart): it goes before audit steps. */
export const RUN_INTERVAL_MS = 60_000;

/** The same dependencies, counting every D1 query and outbound request. */
function metered(deps: RunnerDeps, meter: { n: number }): RunnerDeps {
  type Bound = ReturnType<ReturnType<RunnerDeps["db"]["prepare"]>["bind"]>;
  const raw = new WeakMap<object, Bound>();
  const wrap = (statement: Bound): Bound => {
    const wrapped = {
      run: () => (meter.n++, statement.run()),
      first: <T>() => (meter.n++, statement.first<T>()),
      all: <T>() => (meter.n++, statement.all<T>()),
    } as Bound;
    raw.set(wrapped, statement);
    return wrapped;
  };
  return {
    ...deps,
    db: {
      prepare: (sql) => ({
        bind: (...values) => wrap(deps.db.prepare(sql).bind(...values)),
      }),
      batch: (statements) => {
        meter.n += 1;
        return deps.db.batch(statements.map((item) => raw.get(item) ?? item));
      },
    },
    payments: deps.payments && {
      ...deps.payments,
      midtrans: deps.payments.midtrans && {
        ...deps.payments.midtrans,
        fetch: (...args: Parameters<typeof fetch>) => {
          meter.n += 1;
          return (deps.payments!.midtrans!.fetch ?? fetch)(...args);
        },
      },
    },
    sender: deps.sender
      ? (message) => {
          meter.n += 1;
          return deps.sender!(message);
        }
      : null,
    execute: (input) => {
      meter.n += 1;
      return deps.execute(input);
    },
    generateReport: ((...args: Parameters<RunnerDeps["generateReport"]>) => {
      meter.n += 1;
      return deps.generateReport(...args);
    }) as RunnerDeps["generateReport"],
  };
}

export async function runOrders(input: RunnerDeps): Promise<RunSummary> {
  const outcomes: StepOutcome[] = [];
  const meter = { n: 0 };
  const deps = metered(input, meter);
  const fits = (cost: number) => meter.n + cost <= RUN_UNIT_LIMIT;
  const startedAt = deps.now().getTime();
  const budgetMs = deps.runBudgetMs ?? RUN_BUDGET_MS;
  const owner = crypto.randomUUID();
  const scope = { environment: deps.environment, mode: deps.mode };
  const failedNow = new Set<string>();
  const audit = deps.auditEnabled !== false;
  const payments = deps.payments;

  // R-14, R-23: reconciliation comes first (at most 2 attempts), inside the
  // run's meter. It runs with the emergency switch off too.
  if (payments?.midtrans) {
    try {
      const checked = await reconcileDueAttempts({
        db: deps.db,
        now: deps.now(),
        midtrans: payments.midtrans,
        limitUnits: payments.limitUnits,
        dailyLimitUnits: payments.dailyLimitUnits,
        hasRoom: (units) => meter.n + units <= RECONCILE_UNIT_LIMIT,
      });
      outcomes.push(
        ...Array.from({ length: checked }, (): StepOutcome => "reconciled"),
      );
    } catch {
      // A failing check never stops the rest of the run.
    }
  }

  // R-22: an `open` order past its time becomes `expired`, which settles it.
  const expired = await expireOpenOrders(deps.db, {
    ...scope,
    now: deps.now(),
    limit: Math.min(
      MAX_EXPIRED_PER_RUN,
      Math.floor((RUN_UNIT_LIMIT - meter.n) / RUN_COST.expiry),
    ),
  });
  outcomes.push(...expired.map((): StepOutcome => "expired"));

  // R-13: a paid order whose questions were not approved within 7 days becomes
  // `failed` (code paid_not_started): hold returned, failure email, founder notice.
  for (const id of await paidNotStartedOrders(deps.db, {
    ...scope,
    now: deps.now(),
    limit: 1,
  })) {
    if (!fits(RUN_COST.deadline)) break; // it comes back on a later run
    if (await failOrder(deps, id, "paid_not_started", ["open"])) {
      failedNow.add(id);
      outcomes.push("paid_not_started");
    }
  }

  // R-23: at the deadline an order not yet delivered becomes `failed` (once)
  // and sends the failure email.
  for (const id of audit
    ? await ordersPastDeadline(deps.db, {
        ...scope,
        now: deps.now(),
        limit: MAX_DEADLINE_FAILURES_PER_RUN,
      })
    : []) {
    if (!fits(RUN_COST.deadline)) break; // it comes back on a later run
    if (await failOrder(deps, id, "deadline")) {
      failedNow.add(id);
      outcomes.push("failed_deadline");
    }
  }

  // R-21: the day's cap use, then what is due to send. A payment email or a
  // refund notice that already waited a run goes before the audit steps.
  const founderEmail = payments?.founderEmail ?? null;
  if (founderEmail && payments && deps.mode === "live") {
    await recordCapAlerts(deps.db, {
      now: deps.now(),
      dailyLimitUnits: payments.dailyLimitUnits,
    });
  }
  let email: DuePaymentEmail | null = deps.sender
    ? await duePaymentEmail(deps.db, { ...scope, now: deps.now() })
    : null;
  let notices: NoticeRow[] =
    deps.sender && founderEmail
      ? await dueFounderNotices(deps.db, deps.now())
      : [];
  const waited = (at: string) =>
    deps.now().getTime() - new Date(at).getTime() >= RUN_INTERVAL_MS;
  const sendEmail = async () => {
    if (!email || !deps.sender || !fits(RUN_COST.paymentEmail)) return;
    const due = email;
    email = null;
    try {
      if (
        await sendPaymentEmail(
          {
            db: deps.db,
            sender: deps.sender,
            now: deps.now(),
            sleep: deps.sleep,
          },
          due,
        )
      ) {
        outcomes.push("payment_email");
      }
    } catch {
      // Tried again on a later run; never stops the audit steps.
    }
  };
  const sendNotice = async (row: NoticeRow | undefined) => {
    if (!row || !deps.sender || !founderEmail || !fits(RUN_COST.notice)) return;
    notices = notices.filter((item) => item.id !== row.id);
    try {
      const sent = await sendFounderNotice(
        {
          db: deps.db,
          sender: deps.sender,
          to: founderEmail,
          now: deps.now(),
          sleep: deps.sleep,
        },
        row,
      );
      if (sent) outcomes.push("notice");
    } catch {
      // Tried again on a later run; never stops the audit steps.
    }
  };
  const refundNotice = () => notices.find((row) => isRefundNotice(row.kind));
  const otherNotice = () => notices.find((row) => !isRefundNotice(row.kind));
  if (email && waited(email.paid_at)) await sendEmail();
  const firstRefund = refundNotice();
  if (firstRefund && waited(firstRefund.created_at))
    await sendNotice(firstRefund);

  // The room kept for one payment email and one refund notice that are due but
  // have not waited yet. The first audit step needs only to fit on its own (a
  // report step is 27 of 40); later ones must leave this room (R-23).
  let reserve = 0;
  if (email) reserve += RUN_COST.paymentEmail;
  if (refundNotice()) reserve += RUN_COST.notice;
  let stepsStarted = 0;

  for (const id of audit
    ? await activeOrders(deps.db, {
        ...scope,
        now: deps.now(),
        limit: MAX_ORDERS_PER_RUN,
      })
    : []) {
    const order = await getOrder(deps.db, id);
    if (
      !order ||
      order.mode !== deps.mode ||
      order.environment !== deps.environment
    ) {
      continue;
    }
    // Start a step only if its cost still fits the run's meter; a heavy report
    // step goes first on a later run (rotation by last step).
    const cost =
      order.state === "running"
        ? RUN_COST.question
        : order.report_json
          ? RUN_COST.light
          : RUN_COST.heavy;
    if (!fits(stepsStarted === 0 ? cost : cost + reserve)) {
      outcomes.push("waiting");
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
    stepsStarted += 1;
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

  // R-23: then the emails and notices that had not waited yet.
  await sendEmail();
  await sendNotice(refundNotice());
  await sendNotice(otherNotice());

  // R-25: the failure email is retried for 24 hours after the failure.
  for (const id of await failedOrdersNeedingEmail(deps.db, {
    ...scope,
    now: deps.now(),
    limit: MAX_FAILURE_EMAILS_PER_RUN,
  })) {
    if (failedNow.has(id)) continue;
    if (!fits(RUN_COST.retry)) break;
    if (await sendFailureEmail(deps, id)) outcomes.push("failure_email");
  }
  return { outcomes };
}

/** Becoming `failed` happens once and sends the failure email. A paid order
 * (not a test pass, not a legacy order) that fails also records one founder
 * notice in the same write (R-21): `paid_not_started` for the 7-day sweep,
 * `paid_order_failed` for any other code. */
async function failOrder(
  deps: RunnerDeps,
  orderId: string,
  code: string,
  from: readonly OrderState[] = ["running", "reporting"],
): Promise<boolean> {
  const ended = await endOrder(deps.db, {
    orderId,
    from,
    to: "failed",
    failureCode: code,
    // No accepted ready email: a link that may have got through stops working.
    clearUndeliveredLink: true,
    now: deps.now,
    alsoRun: [
      orderFailedNoticeStatement(deps.db, {
        orderId,
        code,
        amount: ORDER_GROSS_AMOUNT_TEXT,
        now: deps.now(),
      }),
    ],
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
  const history = await emailHistory(deps.db, { orderId, kind: "failure" });
  // Retries back off; the cron's retry list already leaves out orders that
  // are still waiting, so this only guards a direct call.
  if (emailBackingOff(history, deps.now())) return false;
  const attempt = history.next;
  // R-03: the key names the order number, never the internal order ID. An order
  // made by S3 code gets its number now (R-23).
  const orderNumber = await ensureOrderNumber(deps.db, order);
  const idempotencyKey = `nuave-order-${orderNumber}-failure-${attempt}`;
  const mail = failureEmail({
    businessName: order.business_name,
    orderNumber,
  });
  const result = await sendWithinAttempt(
    deps.sender,
    { to: order.email, ...mail, idempotencyKey },
    { sleep: deps.sleep },
  );
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
            // The language fix is a report provider call too (R-19): count it
            // in D1 before it is sent, so an order makes at most three report
            // calls in all, however the steps split them.
            const counted = await claimReportAttempt(deps.db, {
              orderId: order.id,
              owner,
            });
            if (counted === null) {
              throw new AuditBudgetError("The report call ceiling is reached.");
            }
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
    // Send the ready email now; `delivered` needs Resend to accept it. A
    // failure here (for example a database error) never touches the saved
    // report: the next run retries through the report_json path.
    try {
      const fresh = await getOrder(deps.db, order.id);
      if (fresh) await readyEmailStep(deps, fresh);
    } catch {
      // retried on the next run
    }
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
  // The calls made so far, as D1 counts them (a language fix counts as one).
  const latest = await getOrder(deps.db, order.id);
  const recovery = classifyReportRecovery(
    code,
    latest?.report_attempts ?? attempt,
  );
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
  // Retries back off, and a waiting retry makes no new secret: the stored
  // link stays as it is until a real send happens.
  const history = await emailHistory(deps.db, {
    orderId: order.id,
    kind: "ready",
  });
  // An accepted ready email already exists (for example the founder resent it
  // by hand): the link is out, so only `delivered` is left. No second email.
  if (history.accepted > 0) {
    const finished = await endOrder(deps.db, {
      orderId: order.id,
      from: ["reporting"],
      to: "delivered",
      now: deps.now,
    });
    return finished ? "delivered" : "skipped";
  }
  if (emailBackingOff(history, deps.now())) return "email_pending";
  const secret = newLinkSecret();
  const linkHash = await sha256Hex(secret);
  const replaced = await replaceLinkHash(deps.db, {
    orderId: order.id,
    linkHash,
  });
  if (!replaced) return "email_pending"; // link switched off, or order moved on
  const attempt = history.next;
  // R-03: the order number, never the internal order ID (R-23: an order made by
  // S3 code gets its number now).
  const orderNumber = await ensureOrderNumber(deps.db, order);
  // The key names this secret: if a crash lost the record of an accepted send,
  // the next try has another secret and so another key, and is never refused
  // by Resend as the same key with a different body.
  const idempotencyKey = `nuave-order-${orderNumber}-ready-${attempt}-${linkHash.slice(0, 12)}`;
  const mail = readyEmail({
    businessName: order.business_name,
    link: `${deps.siteOrigin}/r#${secret}`,
    orderNumber,
  });
  const result = await sendWithinAttempt(
    deps.sender,
    { to: order.email, ...mail, idempotencyKey },
    { sleep: deps.sleep },
  );
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
