import {
  PAYMENT_FINAL_WAIT_MS,
  PAYMENT_GRACE_MS,
  PAYMENT_UNKNOWN_CLOSE_MS,
  attemptById,
  openAttemptForOrder,
  type AttemptRow,
} from "./attempts";
import { applyStatus, isFinalNotPaid, type ApplyDeps } from "./apply";
import { getStatus, type MidtransConfig, type StatusAnswer } from "./midtrans";
import { recordFounderNotice } from "./notices";

/**
 * Status recovery and reconciliation (spec 017 R-06, R-14). One function checks
 * one attempt: the page's status check and the cron both use it.
 */

export type CheckDeps = ApplyDeps & {
  midtrans: MidtransConfig;
  /** A page poll's limit on total Midtrans time (real clock). Once it is spent,
   * no more calls are made and the check counts as unavailable. */
  timeBudgetMs?: number;
  /** The cron's per-run meter (R-23): does this many more units still fit? Absent
   * for a page poll. When it says no, the check stops and is tried again next run. */
  hasRoom?: (units: number) => boolean;
};

/** R-23: the meter units one Midtrans answer can cost at most (the call, applying
 * it with the refund path, and marking the transaction checked), the queries a
 * check still makes after its last answer, and the ones it makes first (the
 * claim and the list of transactions). */
export const RECONCILE_ASK_UNITS = 11;
export const RECONCILE_AFTER_UNITS = 6;
export const RECONCILE_ATTEMPT_UNITS = 2;

/** R-14: at most one Midtrans check per attempt per 30 seconds. */
export const CHECK_MIN_GAP_MS = 30_000;
const MAX_TRANSACTIONS_PER_CHECK = 5;
const HOUR_MS = 60 * 60 * 1000;
/** R-14: no final answer this long after the window: the founder is told. */
export const PAYMENT_UNKNOWN_NOTICE_MS = 24 * HOUR_MS;

const iso = (at: Date) => at.toISOString();
const after = (isoTime: string, ms: number) =>
  new Date(new Date(isoTime).getTime() + ms);

export type CheckResult =
  /** Another check ran in the last 30 seconds, or the attempt is not open. */
  | "skipped"
  /** Asked Midtrans; every answer was readable. */
  | "answered"
  /** At least one call failed: the attempt stays open (R-06). */
  | "unavailable";

export async function checkAttempt(
  deps: CheckDeps,
  attempt: AttemptRow,
): Promise<CheckResult> {
  const { db, now } = deps;
  // The claim is one conditional write, so two callers never both ask.
  const claim = await db
    .prepare(
      `UPDATE payment_attempts SET last_checked_at = ?2
       WHERE id = ?1 AND status = 'open'
         AND (last_checked_at IS NULL OR last_checked_at <= ?3)`,
    )
    .bind(attempt.id, iso(now), iso(new Date(now.getTime() - CHECK_MIN_GAP_MS)))
    .run();
  if (claim.meta?.changes !== 1) return "skipped";

  // R-06: after the window, the grace and the further wait, the final answer
  // needs every known transaction and the order_id. DANA answers by
  // transaction_id only, so "not found" by order_id proves nothing before then.
  const finalFrom = after(
    attempt.window_end,
    PAYMENT_GRACE_MS + PAYMENT_FINAL_WAIT_MS,
  );
  const finalTime = now.getTime() >= finalFrom.getTime();
  // R-06: the final answer asks every known transaction, oldest-checked first.
  // A transaction already checked since the final time with a final-not-paid
  // answer is not asked again, so a decision can build up over several runs
  // when a run's meter allows only some asks (R-23). Before the final time the
  // bounded list (oldest update first) is only for the recovery path.
  const known = await db
    .prepare(
      `SELECT transaction_id, midtrans_status, checked_at FROM payment_transactions
       WHERE attempt_id = ?1 ORDER BY COALESCE(checked_at, ''), updated_at`,
    )
    .bind(attempt.id)
    .all<{
      transaction_id: string;
      midtrans_status: string;
      checked_at: string | null;
    }>();
  const finalFromIso = iso(finalFrom);
  const askedSinceFinal = (row: {
    midtrans_status: string;
    checked_at: string | null;
  }) =>
    row.checked_at !== null &&
    row.checked_at >= finalFromIso &&
    isFinalNotPaid(row.midtrans_status);
  const ids = (
    finalTime
      ? known.results.filter((row) => !askedSinceFinal(row))
      : known.results.slice(0, MAX_TRANSACTIONS_PER_CHECK)
  ).map((row) => row.transaction_id);

  let failed = false;
  let outOfRoom = false;
  let orderIdAnswer: StatusAnswer | null = null;
  const startedMs = Date.now();
  const ask = async (id: string): Promise<StatusAnswer> => {
    if (
      outOfRoom ||
      (deps.hasRoom &&
        !deps.hasRoom(RECONCILE_ASK_UNITS + RECONCILE_AFTER_UNITS))
    ) {
      outOfRoom = true;
      return { kind: "error" };
    }
    let timeoutMs = deps.midtrans.timeoutMs;
    if (deps.timeBudgetMs !== undefined) {
      const left = deps.timeBudgetMs - (Date.now() - startedMs);
      if (left <= 0) {
        failed = true;
        return { kind: "error" };
      }
      timeoutMs = Math.min(left, timeoutMs ?? left);
    }
    const answer = await getStatus({ ...deps.midtrans, timeoutMs }, id);
    if (answer.kind === "found") {
      // The answer must be for this attempt (never apply another order's).
      if (answer.status.order_id === attempt.midtrans_order_id) {
        await applyStatus(deps, answer.status);
        if (finalTime && id === answer.status.transaction_id) {
          await db
            .prepare(
              "UPDATE payment_transactions SET checked_at = ?2 WHERE transaction_id = ?1",
            )
            .bind(id, iso(now))
            .run();
        }
      } else {
        failed = true;
      }
    } else if (answer.kind === "error") {
      failed = true;
    }
    return answer;
  };
  // Q12 = A: the order_id first, every check, so a paying second try whose
  // notification was lost is found at once (the answer is the latest try).
  orderIdAnswer = await ask(attempt.midtrans_order_id);
  for (const id of ids) await ask(id);

  // R-23: when the run's meter ran out, nothing more is decided now, but the
  // attempt keeps its normal schedule (so it never takes every run) and the
  // time-based notice and close below still apply (they need no answer).
  if (!outOfRoom) {
    await db
      .prepare("UPDATE payment_attempts SET check_failed_at = ?2 WHERE id = ?1")
      .bind(attempt.id, failed ? iso(now) : null)
      .run();
  }

  const current = await attemptById(db, attempt.id);
  if (!current || current.status !== "open")
    return failed || outOfRoom ? "unavailable" : "answered";

  // R-06 finally unpaid: Midtrans answered for every known transaction and for
  // the order_id with expire, cancel, deny, failure or "not found", and no
  // transaction is settled or still pending.
  if (finalTime && !failed && !outOfRoom && orderIdAnswer) {
    const states = await db
      .prepare(
        "SELECT midtrans_status, checked_at FROM payment_transactions WHERE attempt_id = ?1",
      )
      .bind(attempt.id)
      .all<{ midtrans_status: string; checked_at: string | null }>();
    const orderIdFinal =
      orderIdAnswer.kind === "not_found" ||
      (orderIdAnswer.kind === "found" &&
        isFinalNotPaid(orderIdAnswer.status.transaction_status));
    if (
      orderIdFinal &&
      // Every known transaction was asked since the final time (maybe over
      // several runs) and none is settled or pending.
      states.results.every(askedSinceFinal)
    ) {
      await db
        .prepare(
          `UPDATE payment_attempts SET status = 'finally_unpaid', final_at = ?2, updated_at = ?2
           WHERE id = ?1 AND status = 'open'`,
        )
        .bind(attempt.id, iso(now))
        .run();
      return "answered";
    }
  }

  // R-14: no final answer 24 hours after the window: tell the founder (once).
  if (
    now.getTime() >=
    after(current.window_end, PAYMENT_UNKNOWN_NOTICE_MS).getTime()
  ) {
    await recordFounderNotice(db, {
      kind: "payment_unknown",
      subject: current.midtrans_order_id,
      detail: {
        order_number: current.midtrans_order_id.replace(/-\d+$/, ""),
        midtrans_order_id: current.midtrans_order_id,
        method: current.payment_method,
        amount: current.amount,
      },
      now,
    });
  }
  // R-06: no final answer 7 days after the window: closed as unknown. It stops
  // counting against the cap and stays on the refund list.
  if (
    now.getTime() >=
    after(current.window_end, PAYMENT_UNKNOWN_CLOSE_MS).getTime()
  ) {
    await db
      .prepare(
        `UPDATE payment_attempts SET status = 'closed_unknown', final_at = ?2, updated_at = ?2
         WHERE id = ?1 AND status = 'open'`,
      )
      .bind(attempt.id, iso(now))
      .run();
  }
  return failed || outOfRoom ? "unavailable" : "answered";
}

/** R-14: the page asked about an order. If it has an open attempt, ask Midtrans
 * (at most once per attempt per 30 seconds). Never throws: the status answer
 * must still come back. */
export async function recoverOrderPayment(
  deps: CheckDeps,
  orderId: string,
): Promise<void> {
  try {
    const attempt = await openAttemptForOrder(deps.db, orderId);
    if (attempt) await checkAttempt(deps, attempt);
  } catch {
    // The page still gets the stored state.
  }
}

/** R-14: the cron's reconciliation. Picks the open attempts whose window has
 * ended and that are due (every 10 minutes for the first 2 hours after the
 * window end, then hourly, daily after 24 hours), oldest due first, at most
 * `limit` (2) per run. One failing attempt never stops the next. Returns how
 * many it checked. */
export async function reconcileDueAttempts(
  deps: CheckDeps,
  limit = 2,
): Promise<number> {
  const at = (ms: number) => iso(new Date(deps.now.getTime() - ms));
  const { results } = await deps.db
    .prepare(
      `SELECT * FROM payment_attempts
       WHERE status = 'open' AND window_end <= ?1
         AND (
           COALESCE(last_checked_at, '') <= CASE
             WHEN window_end > ?2 THEN ?5
             WHEN window_end > ?3 THEN ?6
             ELSE ?7 END
           -- R-14/R-06: the 24-hour notice and the 7-day close come at the
           -- first run after those times, not a day after the last check.
           OR (window_end <= ?3 AND COALESCE(last_checked_at, '') <
             strftime('%Y-%m-%dT%H:%M:%fZ', window_end, '+24 hours'))
           OR (window_end <= ?8 AND COALESCE(last_checked_at, '') <
             strftime('%Y-%m-%dT%H:%M:%fZ', window_end, '+7 days'))
         )
       ORDER BY COALESCE(last_checked_at, window_end) LIMIT ?4`,
    )
    .bind(
      iso(deps.now),
      at(2 * HOUR_MS),
      at(24 * HOUR_MS),
      limit,
      at(10 * 60 * 1000),
      at(HOUR_MS),
      at(24 * HOUR_MS),
      at(7 * 24 * HOUR_MS),
    )
    .all<AttemptRow>();
  let checked = 0;
  for (const attempt of results) {
    if (
      deps.hasRoom &&
      !deps.hasRoom(
        RECONCILE_ATTEMPT_UNITS + RECONCILE_ASK_UNITS + RECONCILE_AFTER_UNITS,
      )
    ) {
      break; // the rest are due again next run
    }
    try {
      if ((await checkAttempt(deps, attempt)) !== "skipped") checked += 1;
    } catch {
      // The next due attempt still gets its turn; this one is due again later.
    }
  }
  return checked;
}
