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

/** R-23: the meter units one Midtrans answer can cost (the call and applying
 * it, refund path excepted), and one check's own fixed queries. */
export const RECONCILE_ASK_UNITS = 8;
export const RECONCILE_ATTEMPT_UNITS = 7;

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
  // R-06: the final answer asks every known transaction. The bounded list (oldest
  // update first) is only for the recovery path before that.
  const known = await db
    .prepare(
      `SELECT transaction_id FROM payment_transactions WHERE attempt_id = ?1
       ORDER BY updated_at LIMIT ?2`,
    )
    .bind(attempt.id, finalTime ? -1 : MAX_TRANSACTIONS_PER_CHECK)
    .all<{ transaction_id: string }>();
  const ids = known.results.map((row) => row.transaction_id);
  // Q12 = A: always ask by order_id too, so a paying second try whose
  // notification was lost is found at once (the answer is the latest try).

  let failed = false;
  let outOfRoom = false;
  let orderIdAnswer: StatusAnswer | null = null;
  const startedMs = Date.now();
  const ask = async (id: string): Promise<StatusAnswer> => {
    if (outOfRoom || (deps.hasRoom && !deps.hasRoom(RECONCILE_ASK_UNITS))) {
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
      } else {
        failed = true;
      }
    } else if (answer.kind === "error") {
      failed = true;
    }
    return answer;
  };
  for (const id of ids) await ask(id);
  orderIdAnswer = await ask(attempt.midtrans_order_id);

  if (outOfRoom) {
    // R-23: the run's meter is spent. Nothing was decided; make the attempt due
    // again at once, so the next run (oldest due first) takes it.
    await db
      .prepare(
        "UPDATE payment_attempts SET last_checked_at = NULL WHERE id = ?1",
      )
      .bind(attempt.id)
      .run();
    return "unavailable";
  }
  await db
    .prepare("UPDATE payment_attempts SET check_failed_at = ?2 WHERE id = ?1")
    .bind(attempt.id, failed ? iso(now) : null)
    .run();

  const current = await attemptById(db, attempt.id);
  if (!current || current.status !== "open")
    return failed ? "unavailable" : "answered";

  // R-06 finally unpaid: Midtrans answered for every known transaction and for
  // the order_id with expire, cancel, deny, failure or "not found", and no
  // transaction is settled or still pending.
  if (finalTime && !failed && orderIdAnswer) {
    const states = await db
      .prepare(
        "SELECT midtrans_status FROM payment_transactions WHERE attempt_id = ?1",
      )
      .bind(attempt.id)
      .all<{ midtrans_status: string }>();
    const orderIdFinal =
      orderIdAnswer.kind === "not_found" ||
      (orderIdAnswer.kind === "found" &&
        isFinalNotPaid(orderIdAnswer.status.transaction_status));
    if (
      orderIdFinal &&
      states.results.every((row) => isFinalNotPaid(row.midtrans_status))
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
  return failed ? "unavailable" : "answered";
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
         AND COALESCE(last_checked_at, '') <= CASE
           WHEN window_end > ?2 THEN ?5
           WHEN window_end > ?3 THEN ?6
           ELSE ?7 END
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
    )
    .all<AttemptRow>();
  let checked = 0;
  for (const attempt of results) {
    if (
      deps.hasRoom &&
      !deps.hasRoom(RECONCILE_ATTEMPT_UNITS + RECONCILE_ASK_UNITS)
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
