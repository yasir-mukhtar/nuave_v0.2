import {
  MAX_HOLD_DAYS,
  OPEN_NEEDS_REFUND,
  OPEN_PAID_ORDER_FAILED,
  holdOrder,
} from "./retention";
import { savedReportEvidence } from "../audit/customer-evidence-export";
import { parseSavedPages } from "./pages";
import { applyRefund } from "../payments/apply";
import type { SpendDb, SpendStatement } from "../spending/spend-ledger";
import { newLinkSecret, sha256Hex } from "./link-secret";
import { isOrderNumber } from "./order-number";
import { parseOrderEmail } from "./order-email";
import { readyEmail, sendWithinAttempt, type MailSender } from "./mail";
import { readyEmailDetails } from "./ready-email-details";
import {
  emailHistory,
  ensureOrderNumber,
  getOrder,
  isOrderId,
  listQuestions,
  recordEmail,
  replaceLinkHashForSupport,
  switchLinkOff,
  type OrderRow,
} from "./store";

/**
 * The founder's support commands (spec 016 R-32):
 *
 *   npm run support -- resend <order>
 *   npm run support -- off <order>
 *   npm run support -- show <order> [--email]
 *
 * and, from spec 017 (R-24), where `<order>` is the internal order ID, the
 * order number (NV-7K3Q9P) or a Midtrans order_id (NV-7K3Q9P-2):
 *
 *   npm run support -- refunds
 *   npm run support -- refunded <transaction-id>
 *   npm run support -- close <midtrans-order-id> <unknown|unpaid>
 *
 * and, for the record cleanup (retention.ts):
 *
 *   npm run support -- hold <order> <days>   (0 releases the hold)
 *
 * and (founder decision 2026-10-25):
 *
 *   npm run support -- email <order> <new-email>
 *   npm run support -- norefund <order> <declined|delivered|settled>
 *
 * and, from spec 021 (A-08), the evidence JSON a two-source report no longer
 * offers as a download:
 *
 *   npm run support -- export <order>
 *
 * The logic lives here so tests can run it on a test database with a fake
 * sender (AC-17). `scripts/support.mjs` supplies the real database (through
 * `wrangler d1 execute`) and the real sender (the founder's Resend key from a
 * git-ignored file). There is no public admin endpoint.
 */

export type SupportDeps = {
  db: SpendDb;
  /** Made only when a command needs to send, after the order ID was checked. */
  makeSender: () => Promise<MailSender>;
  /** The fixed site address the private link is built on. */
  siteOrigin: string;
  now: () => Date;
  /** Pause between email tries (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
  out: (line: string) => void;
  /** Saves a file under `.local-evidence/` and returns where it went
   * (`export` only; the script writes it to disk, tests keep it in memory). */
  saveEvidence?: (fileName: string, text: string) => Promise<string>;
};

const UNITS_PER_USD = 100_000_000;
const usd = (units: number) => `USD ${(units / UNITS_PER_USD).toFixed(4)}`;

export const SUPPORT_USAGE =
  "Usage: npm run support -- <resend|off|show> <order-id|order-number|midtrans-order-id> [--email] [--local]\n" +
  "       npm run support -- refunds [--local]\n" +
  "       npm run support -- refunded <transaction-id> [--local]\n" +
  "       npm run support -- close <midtrans-order-id> <unknown|unpaid> [--local]\n" +
  "       npm run support -- hold <order-id|order-number|midtrans-order-id> <days, 0 releases> [--local]\n" +
  "       npm run support -- email <order-id|order-number|midtrans-order-id> <new-email> [--local]\n" +
  "       npm run support -- norefund <order-id|order-number|midtrans-order-id> <declined|delivered|settled> [--local]\n" +
  "       npm run support -- export <order-id|order-number|midtrans-order-id> [--local]";

const MIDTRANS_ORDER_ID = /^NV-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}-\d{1,3}$/;
const TRANSACTION_ID = /^[A-Za-z0-9_.-]{6,100}$/;

/** Returns the process exit code: 0 done, 1 refused or failed, 2 bad usage. */
export async function runSupport(
  args: readonly string[],
  deps: SupportDeps,
): Promise<number> {
  const flags = args.filter((arg) => arg.startsWith("--"));
  const words = args.filter((arg) => !arg.startsWith("--"));
  const [command, reference, second, ...extra] = words;
  const allowed = command === "show" ? ["--email"] : [];
  const shape: Record<string, number> = {
    resend: 1,
    off: 1,
    show: 1,
    refunds: 0,
    refunded: 1,
    close: 2,
    hold: 2,
    email: 2,
    norefund: 2,
    export: 1,
  };
  const given = [reference, second].filter((word) => word !== undefined).length;
  if (
    !(command !== undefined && command in shape) ||
    given !== shape[command] ||
    extra.length > 0 ||
    flags.some((flag) => !allowed.includes(flag))
  ) {
    deps.out(SUPPORT_USAGE);
    return 2;
  }
  if (command === "refunds") return refunds(deps);
  if (command === "refunded") return refunded(deps, reference!);
  if (command === "close") return closeAttempt(deps, reference!, second!);
  // Checked before anything else: a bad reference reaches no database and no
  // sender.
  if (
    !isOrderId(reference) &&
    !isOrderNumber(reference) &&
    !MIDTRANS_ORDER_ID.test(reference ?? "")
  ) {
    deps.out(
      "Give the order as its 32-character order ID, its order number (NV-XXXXXX) or a Midtrans order_id (NV-XXXXXX-1).",
    );
    return 2;
  }
  const order = await findOrder(deps.db, reference!);
  if (!order) {
    deps.out("No order with that ID or number.");
    return 1;
  }
  if (command === "off") return off(deps, order);
  if (command === "hold") return hold(deps, order, second!);
  if (command === "email") return changeEmail(deps, order, second!);
  if (command === "norefund") return closeWithoutRefund(deps, order, second!);
  if (command === "export") return exportEvidence(deps, order);
  if (command === "show") {
    return show(deps, order, flags.includes("--email"));
  }
  return resend(deps, order);
}

/** R-24: the internal ID, the order number or a Midtrans order_id finds the
 * order. The number only finds it (D7); it proves nothing. */
async function findOrder(db: SpendDb, reference: string) {
  if (isOrderId(reference)) return getOrder(db, reference);
  const row = isOrderNumber(reference)
    ? await db
        .prepare("SELECT id FROM orders WHERE order_number = ?1")
        .bind(reference)
        .first<{ id: string }>()
    : await db
        .prepare(
          `SELECT order_id AS id FROM payment_attempts WHERE midtrans_order_id = ?1`,
        )
        .bind(reference)
        .first<{ id: string }>();
  return row ? getOrder(db, row.id) : null;
}

/** Spec 021 A-08: the evidence JSON of a saved report, built the way the report
 * page builds its download, from the same saved rows the report-data route
 * reads. It holds the customer's answers, so it goes to the git-ignored
 * `.local-evidence/` folder and is never printed. */
async function exportEvidence(
  deps: SupportDeps,
  order: OrderRow,
): Promise<number> {
  if (!order.report_json || !order.intake_json) {
    deps.out("This order has no saved report. Nothing to export.");
    return 1;
  }
  if (!deps.saveEvidence) {
    deps.out("This support run cannot save files.");
    return 1;
  }
  const intake = JSON.parse(order.intake_json) as {
    context: Parameters<typeof savedReportEvidence>[0]["context"];
    prompts: Parameters<typeof savedReportEvidence>[0]["prompts"];
    originals?: string[];
  };
  const questions = await listQuestions(deps.db, order.id);
  const evidence = savedReportEvidence({
    report: JSON.parse(order.report_json),
    context: intake.context,
    prompts: intake.prompts,
    originals: intake.originals ?? [],
    observations: questions.flatMap((question) =>
      question.observation_json ? [JSON.parse(question.observation_json)] : [],
    ),
    synthetic: order.mode === "synthetic",
  });
  const name = order.order_number ?? order.id;
  const path = await deps.saveEvidence(
    `${name}-evidence.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  deps.out(
    `Saved the evidence of ${name} to ${path}. It holds the customer's answers: share it only with them and delete it when done.`,
  );
  return 0;
}

/** Privacy page section 9: keeps the order past its lifetime while a support
 * case is open. The hourly cleanup skips it until the hold ends. */
async function hold(
  deps: SupportDeps,
  order: OrderRow,
  daysText: string,
): Promise<number> {
  const days = /^\d{1,3}$/.test(daysText) ? Number(daysText) : NaN;
  if (!(days >= 0 && days <= MAX_HOLD_DAYS)) {
    deps.out(`Give the hold in days, 0 to ${MAX_HOLD_DAYS} (0 releases it).`);
    return 2;
  }
  const until = await holdOrder(deps.db, {
    orderId: order.id,
    days,
    now: deps.now(),
  });
  if (until === null) {
    deps.out("This order was already made anonymous. Nothing to hold.");
    return 1;
  }
  deps.out(
    until === "released"
      ? "The hold is released. The order follows its normal lifetime again."
      : `The order is kept until ${until}. The hourly cleanup skips it until then.`,
  );
  return 0;
}

async function off(deps: SupportDeps, order: OrderRow): Promise<number> {
  await switchLinkOff(deps.db, order.id);
  deps.out(
    `The link is switched off. The order stays ${order.state}. The report page now shows "not available".`,
  );
  return 0;
}

async function resend(
  deps: SupportDeps,
  order: OrderRow,
  readySender?: MailSender,
): Promise<number> {
  if (order.mode !== "live") {
    deps.out("Synthetic orders never send real email. Nothing was sent.");
    return 1;
  }
  if (!order.report_json) {
    deps.out("This order has no saved report, so there is no link to send.");
    return 1;
  }
  // The sender comes first: a missing key file must not cost the customer the
  // working link.
  const sender = readySender ?? (await deps.makeSender());
  const secret = newLinkSecret();
  const linkHash = await sha256Hex(secret);
  // A new secret replaces the stored hash in one write: the old link stops
  // first (D4). It never changes the saved report.
  const replaced = await replaceLinkHashForSupport(deps.db, {
    orderId: order.id,
    linkHash,
    now: deps.now(),
  });
  if (!replaced) {
    deps.out("The 12-month link period has ended. Nothing was sent.");
    return 1;
  }
  const history = await emailHistory(deps.db, {
    orderId: order.id,
    kind: "ready",
  });
  // R-03: the key names the order number, never the internal order ID. An order
  // made by S3 code gets its number now (R-23).
  const orderNumber = await ensureOrderNumber(deps.db, order);
  const idempotencyKey = `nuave-order-${orderNumber}-ready-${history.next}-${linkHash.slice(0, 12)}`;
  const mail = readyEmail({
    businessName: order.business_name,
    link: `${deps.siteOrigin}/r#${secret}`,
    orderNumber,
    ...(await readyEmailDetails(deps.db, order)),
  });
  // Always to the address saved on the order; there is no way to name another.
  const result = await sendWithinAttempt(
    sender,
    { to: order.email, ...mail, idempotencyKey },
    { sleep: deps.sleep },
  );
  await recordEmail(deps.db, {
    orderId: order.id,
    kind: "ready",
    attempt: history.next,
    idempotencyKey,
    accepted: result.accepted,
    // Only a plain id is written into SQL text.
    messageId:
      result.messageId && /^[A-Za-z0-9_-]{1,100}$/.test(result.messageId)
        ? result.messageId
        : null,
    now: deps.now(),
  });
  if (!result.accepted) {
    deps.out(
      "Resend did not accept the email. The old link is already stopped. Run resend again.",
    );
    return 1;
  }
  deps.out(
    "A new link was sent to the email on the order. The old link no longer works.",
  );
  return 0;
}

/** A mistyped order email (FAQ; terms section 10). The founder first checks
 * the payment receipt or the Midtrans transaction number. The new address
 * replaces the old one; when the report is saved, the old link stops in that
 * same write and a new one goes to the new address only. Nothing is ever sent
 * to the old address by this command. */
async function changeEmail(
  deps: SupportDeps,
  order: OrderRow,
  emailText: string,
): Promise<number> {
  const email = parseOrderEmail(emailText);
  if (!email) {
    deps.out("That is not one valid email address. Nothing changed.");
    return 2;
  }
  if (order.purged_at) {
    deps.out("This order was already made anonymous. Nothing changed.");
    return 1;
  }
  if (order.mode !== "live") {
    deps.out("Synthetic orders have no real email. Nothing changed.");
    return 1;
  }
  // Only a paid order (or the founder's test pass, or one made before
  // payment existed): an unpaid order has no receipt to check.
  if (!order.paid_at && order.payment_kind && order.payment_kind !== "test") {
    deps.out(
      "This order is not paid, so there is no receipt to check. The customer can start again with the right email. Nothing changed.",
    );
    return 1;
  }
  const now = deps.now().toISOString();
  if (email.toLowerCase() !== order.email.toLowerCase()) {
    // The sender comes first, as in resend: a missing key file changes nothing.
    const sender = order.report_json ? await deps.makeSender() : undefined;
    // One write: the new address, and the old link switched off when there
    // is a report, so a failure after it never leaves the old link working.
    // Not while the runner holds the order (it may be sending the ready
    // email). The address goes in as bytes, so the wrangler path writes a
    // hex literal, never readable text (R-32, changed 2026-10-25).
    const changed = await deps.db
      .prepare(
        `UPDATE orders SET email = CAST(?2 AS TEXT), email_changed_at = ?3,
           link_off = CASE WHEN report_json IS NOT NULL THEN 1 ELSE link_off END
         WHERE id = ?1 AND purged_at IS NULL
           AND (lease_owner IS NULL OR lease_until <= ?3)
         RETURNING id`,
      )
      .bind(order.id, new TextEncoder().encode(email), now)
      .first<{ id: string }>();
    if (!changed) {
      deps.out(
        "The order is being worked on right now. Nothing changed; try again in a minute.",
      );
      return 1;
    }
    deps.out("The email on the order is changed.");
    return sendAfterEmailChange(deps, order.id, sender);
  }
  if (!order.report_json) {
    deps.out("That is already the email on the order. Nothing changed.");
    return 1;
  }
  // The same address again: finish an earlier run that stopped before the
  // new link went out.
  deps.out("That is already the email on the order. A new link goes to it.");
  return sendAfterEmailChange(deps, order.id, undefined);
}

/** After the address changed: the order is read again, so a report saved
 * while the command ran also gets a new link at the new address. */
async function sendAfterEmailChange(
  deps: SupportDeps,
  orderId: string,
  sender: MailSender | undefined,
): Promise<number> {
  const fresh = await getOrder(deps.db, orderId);
  if (!fresh) return 1;
  if (!fresh.report_json) {
    deps.out(
      fresh.state === "failed" || fresh.state === "expired"
        ? "The order has no saved report, so no link was sent."
        : "The report is not ready yet. Its email will go to the new address.",
    );
    return 0;
  }
  return resend(deps, fresh, sender ?? (await deps.makeSender()));
}

const CLOSE_REASONS = ["declined", "delivered", "settled"] as const;

/** Open refund cases closed without a refund (founder decision 2026-10-25):
 * the customer declined it in writing, got the full report another way, or
 * the money already went back outside these records. Each case open now is
 * closed on its own (a settled payment that could not be applied, by its
 * transaction; a paid order that failed, by the order), so a payment that
 * arrives later is a new case and is listed again. A case with no final
 * payment answer is closed with `close` instead. */
async function closeWithoutRefund(
  deps: SupportDeps,
  order: OrderRow,
  reason: string,
): Promise<number> {
  if (!(CLOSE_REASONS as readonly string[]).includes(reason)) {
    deps.out(`Give the reason: ${CLOSE_REASONS.join(", ")}.`);
    return 2;
  }
  const at = deps.now().toISOString();
  const { results: payments } = await deps.db
    .prepare(
      `SELECT t.transaction_id FROM payment_transactions t
       JOIN payment_attempts a ON a.id = t.attempt_id
       WHERE a.order_id = ?1 AND ${OPEN_NEEDS_REFUND}`,
    )
    .bind(order.id)
    .all<{ transaction_id: string }>();
  const paidOrder = await deps.db
    .prepare(
      `SELECT 1 AS open FROM orders o WHERE o.id = ?1 AND ${OPEN_PAID_ORDER_FAILED}`,
    )
    .bind(order.id)
    .first<{ open: number }>();
  const writes = [
    ...payments.map((row) =>
      deps.db
        .prepare(
          `INSERT INTO refund_closures (order_id, kind, transaction_id, reason, closed_at)
           VALUES (?1, 'payment', ?2, ?3, ?4)`,
        )
        .bind(order.id, row.transaction_id, reason, at),
    ),
    ...(paidOrder
      ? [
          deps.db
            .prepare(
              `INSERT INTO refund_closures (order_id, kind, transaction_id, reason, closed_at)
               VALUES (?1, 'paid_order', '', ?2, ?3)`,
            )
            .bind(order.id, reason, at),
        ]
      : []),
  ];
  if (writes.length === 0) {
    deps.out(
      "This order has no open refund case for money taken (a payment with no final answer is closed with close). Nothing changed.",
    );
    return 1;
  }
  await deps.db.batch(writes);
  deps.out(
    `${writes.length === 1 ? "The refund case is" : `${writes.length} refund cases are`} closed without a refund (${reason}). Off the refunds list; a payment that arrives later is listed again.`,
  );
  return 0;
}

async function show(
  deps: SupportDeps,
  order: OrderRow,
  withEmail: boolean,
): Promise<number> {
  const line = (label: string, value: unknown) =>
    deps.out(`${label}: ${value ?? "-"}`);
  line("Order", order.id);
  line("Order number", order.order_number);
  line("Payment kind", order.payment_kind ?? "legacy (made before payment)");
  line("State", order.state);
  line("Mode", `${order.mode}, ${order.environment}`);
  line("Business", order.business_name);
  line("Website", order.website);
  line("Email", withEmail ? order.email : "hidden (add --email to show)");
  line("Created", order.created_at);
  line("Started", order.started_at);
  line("Deadline", order.deadline_at);
  line("Report saved", order.completed_at);
  line("Ended", order.ended_at);
  line("Failure code", order.failure_code);
  const linkState = !order.link_hash
    ? "none yet"
    : order.link_off
      ? "switched off"
      : order.link_expires_at &&
          order.link_expires_at <= deps.now().toISOString()
        ? "expired"
        : `active until ${order.link_expires_at}`;
  line("Link", linkState);
  // Spec 021 B-08: what the pages step read (addresses only, never the text).
  if (order.pages_json) line("Pages read", pagesSummary(order.pages_json));
  if (order.purged_at) line("Made anonymous", order.purged_at);
  if (order.hold_until) line("Kept until (support hold)", order.hold_until);
  if (order.email_changed_at) line("Email changed", order.email_changed_at);
  const { results: closures } = await deps.db
    .prepare(
      `SELECT kind, transaction_id, reason, closed_at FROM refund_closures
       WHERE order_id = ?1 ORDER BY closed_at`,
    )
    .bind(order.id)
    .all<{
      kind: string;
      transaction_id: string;
      reason: string;
      closed_at: string;
    }>();
  for (const closure of closures)
    line(
      "Refund case closed without refund",
      `${closure.kind === "payment" ? `transaction ${closure.transaction_id}` : "paid order"}, ${closure.reason}, ${closure.closed_at}`,
    );
  await showPayments(deps, order);

  const ledger = await deps.db
    .prepare(
      `SELECT
         (SELECT reserved_units FROM provider_spend
            WHERE kind = 'order_hold' AND order_id = ?1) AS hold,
         (SELECT COALESCE(SUM(held_units), 0) FROM provider_spend
            WHERE kind = 'order_call' AND order_id = ?1) AS calls,
         (SELECT COUNT(*) FROM provider_spend
            WHERE kind = 'order_call' AND order_id = ?1) AS call_rows`,
    )
    .bind(order.id)
    .first<{ hold: number | null; calls: number; call_rows: number }>();
  if (ledger?.hold === null || ledger?.hold === undefined) {
    deps.out("Cost: none held (synthetic order, or no hold)");
  } else {
    deps.out(
      `Cost: ${usd(ledger.calls)} over ${ledger.call_rows} calls; hold ${usd(ledger.hold)}`,
    );
  }
  if (order.overrun || (ledger?.hold != null && ledger.calls > ledger.hold)) {
    deps.out("OVERRUN: the cost passed the order's hold.");
  }

  const { results: sends } = await deps.db
    .prepare(
      `SELECT kind, attempt, result, created_at FROM order_emails WHERE order_id = ?1
       UNION ALL
       SELECT 'payment' AS kind, attempt, result, created_at FROM payment_emails
       WHERE order_id = ?1 ORDER BY created_at, attempt`,
    )
    .bind(order.id)
    .all<{
      kind: string;
      attempt: number;
      result: string;
      created_at: string;
    }>();
  deps.out(`Emails sent: ${sends.length}`);
  for (const send of sends) {
    deps.out(
      `  ${send.kind} #${send.attempt} ${send.result} ${send.created_at}`,
    );
  }

  const questions = await listQuestions(deps.db, order.id);
  deps.out(`Saved answers: ${questions.length} questions`);
  for (const question of questions) {
    deps.out(
      `  ${question.prompt_id} ${question.status}, attempts ${question.attempts}${question.last_failure ? `, last failure ${question.last_failure}` : ""}`,
    );
    if (question.observation_json) {
      const saved = JSON.parse(question.observation_json) as {
        question?: string;
        raw_answer?: string;
      };
      deps.out(`    Question: ${saved.question ?? "-"}`);
      deps.out(`    Answer: ${saved.raw_answer ?? "-"}`);
    }
  }
  return 0;
}

type AttemptLine = {
  id: string;
  midtrans_order_id: string;
  status: string;
  last_status: string | null;
  payment_method: string | null;
  amount: string | null;
  currency: string | null;
  refund_state: string;
  window_end: string;
};
type TransactionLine = {
  transaction_id: string;
  midtrans_status: string;
  outcome: string;
  refund_state: string;
  refund_source: string | null;
  payment_method: string | null;
  amount: string | null;
};

/** One line about the order's pages: the reading's status and counts. */
export function pagesSummary(json: string): string {
  const saved = parseSavedPages(json);
  if (!saved) return "unreadable";
  switch (saved.status) {
    case "read":
    case "partial":
      return `${saved.status}, ${saved.pages.length} read, ${saved.unread.length} unread, ${saved.requests} Firecrawl requests${saved.stopped ? `, stopped by ${saved.stopped}` : ""}`;
    case "kept_addresses":
      return `${saved.read}, ${saved.urls.length} read, ${saved.unread.length} unread (report saved; addresses only)`;
    case "reading":
    case "gave_up":
      return `${saved.status}, try ${saved.tries}`;
    case "no_key":
      return "not read (no Firecrawl key)";
    case "own_read":
      return `own site read at step 3, ${saved.own.pages.length} read, ${saved.own.unread.length} unread, ${saved.own.requests} Firecrawl requests${saved.own.stopped ? `, stopped by ${saved.own.stopped}` : ""}`;
  }
}

/** R-24: payment kind and paid time (`show` already prints the kind), and every
 * attempt with its transactions: status, refund and needs-refund states. */
async function showPayments(deps: SupportDeps, order: OrderRow) {
  const line = (label: string, value: unknown) =>
    deps.out(`${label}: ${value ?? "-"}`);
  line("Test pass", order.payment_kind === "test" ? "yes (test)" : "no");
  line("Paid", order.paid_at);
  line("Paid by transaction", order.paid_transaction_id);
  line("Refunded", order.refunded_at);
  if (order.replaced_by) line("Replaced by order", order.replaced_by);
  const { results: attempts } = await deps.db
    .prepare(
      `SELECT id, midtrans_order_id, status, last_status, payment_method, amount,
              currency, refund_state, window_end
       FROM payment_attempts WHERE order_id = ?1 ORDER BY attempt_number`,
    )
    .bind(order.id)
    .all<AttemptLine>();
  deps.out(`Payment attempts: ${attempts.length}`);
  for (const attempt of attempts) {
    deps.out(
      `  ${attempt.midtrans_order_id} ${attempt.status}, last status ${attempt.last_status ?? "-"}, ${attempt.payment_method ?? "-"}, ${attempt.amount ?? "-"} ${attempt.currency ?? ""}, refund ${attempt.refund_state}, window ended ${attempt.window_end}`,
    );
    const { results: transactions } = await deps.db
      .prepare(
        `SELECT transaction_id, midtrans_status, outcome, refund_state,
                refund_source, payment_method, amount
         FROM payment_transactions WHERE attempt_id = ?1 ORDER BY first_seen_at`,
      )
      .bind(attempt.id)
      .all<TransactionLine>();
    for (const t of transactions) {
      deps.out(
        `    transaction ${t.transaction_id}: ${t.midtrans_status}, ${t.outcome}${t.outcome === "needs_refund" && t.refund_state !== "refunded" ? " (NEEDS REFUND)" : ""}, refund ${t.refund_state}${t.refund_source ? ` (${t.refund_source})` : ""}, ${t.payment_method ?? "-"}, ${t.amount ?? "-"}`,
      );
    }
  }
}

/** R-21, R-24: every open refund case. */
async function refunds(deps: SupportDeps): Promise<number> {
  type Row = Record<string, string | null>;
  const { results: needs } = await deps.db
    .prepare(
      `SELECT t.transaction_id, a.midtrans_order_id, o.order_number, t.amount,
              t.payment_method
       FROM payment_transactions t
       JOIN payment_attempts a ON a.id = t.attempt_id
       JOIN orders o ON o.id = a.order_id
       WHERE ${OPEN_NEEDS_REFUND}
       ORDER BY t.first_seen_at`,
    )
    .bind()
    .all<Row>();
  // A paid order that ended failed (after payment, or not started in 7 days)
  // whose paying transaction is not recorded as refunded. It is judged by the
  // transaction, so a refund that stopped half way (the order ended, the
  // transaction row not written) is still listed. A chargeback already
  // returned the money (R-15). A synthetic payment took no money.
  const { results: failed } = await deps.db
    .prepare(
      `SELECT o.order_number, o.failure_code, o.paid_transaction_id, o.ended_at,
              (SELECT t.amount FROM payment_transactions t
               WHERE t.transaction_id = o.paid_transaction_id) AS amount
       FROM orders o
       WHERE ${OPEN_PAID_ORDER_FAILED}
       ORDER BY o.ended_at`,
    )
    .bind()
    .all<Row>();
  const { results: unknown } = await deps.db
    .prepare(
      `SELECT a.midtrans_order_id, a.status, a.window_end, a.payment_method
       FROM payment_attempts a
       WHERE a.status = 'closed_unknown'
          OR (a.status = 'open' AND EXISTS (SELECT 1 FROM founder_notices n
                WHERE n.kind = 'payment_unknown' AND n.subject = a.midtrans_order_id))
       ORDER BY a.window_end`,
    )
    .bind()
    .all<Row>();
  const total = needs.length + failed.length + unknown.length;
  deps.out(`Open refund cases: ${total}`);
  for (const row of needs) {
    deps.out(
      `  NEEDS REFUND ${row.order_number ?? "-"} (${row.midtrans_order_id}): transaction ${row.transaction_id}, ${row.amount ?? "-"}, ${row.payment_method ?? "-"}. After refunding: npm run support -- refunded ${row.transaction_id}`,
    );
  }
  for (const row of failed) {
    deps.out(
      `  PAID ORDER ENDED (${row.failure_code ?? "-"}) ${row.order_number ?? "-"}: ended ${row.ended_at}, paid by transaction ${row.paid_transaction_id ?? "-"}, ${row.amount ?? "-"}. After refunding: npm run support -- refunded ${row.paid_transaction_id}`,
    );
  }
  for (const row of unknown) {
    deps.out(
      `  NO FINAL ANSWER ${row.midtrans_order_id} (${row.status}): window ended ${row.window_end}, ${row.payment_method ?? "-"}. Check the Midtrans dashboard; if never paid: npm run support -- close ${row.midtrans_order_id} unpaid`,
    );
  }
  if (total > 0)
    deps.out(
      "Refund within three business days (D3). A case settled without a refund: npm run support -- norefund <order> <declined|delivered|settled>",
    );
  return 0;
}

/** R-15, R-24: a refund made outside Midtrans (for example a bank transfer, Q9).
 * It names the transaction and has the same effect as a Midtrans `refund` of it. */
async function refunded(
  deps: SupportDeps,
  transactionId: string,
): Promise<number> {
  if (!TRANSACTION_ID.test(transactionId)) {
    deps.out("That is not a Midtrans transaction ID.");
    return 2;
  }
  let result: Awaited<ReturnType<typeof applyRefund>>;
  try {
    result = await applyRefund(
      // The refund path never uses the limits.
      { db: deps.db, now: deps.now(), limitUnits: 0, dailyLimitUnits: 0 },
      transactionId,
      "refunded",
      "support",
    );
  } catch {
    // The writes go one command at a time through wrangler. The order is ended
    // first and the transaction row last, and `refunds` judges by the
    // transaction row, so a half-done run stays listed and a repeat finishes it.
    deps.out(
      "The refund could not be fully recorded (the database did not answer). It is safe to run the same command again; `refunds` still lists the case until it is done.",
    );
    return 1;
  }
  if (result === "unknown_order") {
    deps.out("No transaction with that ID.");
    return 1;
  }
  deps.out(
    result === "duplicate"
      ? "That transaction was already recorded as refunded. Nothing changed."
      : "The refund is recorded for that transaction. If it paid an order that was not yet approved, the order now ends as refunded.",
  );
  return 0;
}

/** R-06, R-24: close an attempt that has no final answer, by its Midtrans
 * order_id: "unknown" (it stays on `refunds`) or "unpaid" (the founder checked
 * the Midtrans dashboard: it was never paid; it leaves `refunds`). */
async function closeAttempt(
  deps: SupportDeps,
  midtransOrderId: string,
  as: string,
): Promise<number> {
  if (
    !MIDTRANS_ORDER_ID.test(midtransOrderId) ||
    !["unknown", "unpaid"].includes(as)
  ) {
    deps.out(SUPPORT_USAGE);
    return 2;
  }
  const status = as === "unpaid" ? "finally_unpaid" : "closed_unknown";
  const at = deps.now().toISOString();
  // Only an attempt with no final answer. "unpaid" may also follow "unknown".
  const result = await deps.db
    .prepare(
      `UPDATE payment_attempts
       SET status = ?2, final_at = COALESCE(final_at, ?3), updated_at = ?3
       WHERE midtrans_order_id = ?1
         AND (status = 'open' OR (?2 = 'finally_unpaid' AND status = 'closed_unknown'))
         AND NOT EXISTS (SELECT 1 FROM payment_transactions t
                         WHERE t.attempt_id = payment_attempts.id
                           AND t.outcome IN ('paid', 'needs_refund'))`,
    )
    .bind(midtransOrderId, status, at)
    .run();
  if (result.meta?.changes !== 1) {
    deps.out(
      "No attempt with that order_id is open or closed as unknown (or it holds a settled payment: use refunded). Nothing changed.",
    );
    return 1;
  }
  deps.out(
    as === "unpaid"
      ? "The attempt is closed as unpaid. It no longer counts against the cap and is off the refunds list."
      : "The attempt is closed as unknown. It stays on the refunds list until it is closed as unpaid.",
  );
  return 0;
}

/* ---------------------- the database through wrangler --------------------- */

type WranglerResult = { results?: unknown[]; meta?: { changes?: number } };

/** Only plain tokens go into SQL text: ids, hashes, ISO times and numbers. An
 * email address (it has an `@`) or any other free text cannot pass as text.
 * The one email this script writes (`support email`) comes as bytes, written
 * as a hex literal, so no email reaches SQL text readably (R-32). */
const PLAIN_TOKEN = /^[A-Za-z0-9_.:+\- ]{0,200}$/;

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  // Bytes (an email the founder corrects) go in as a hex literal, never as
  // readable text.
  if (value instanceof Uint8Array) {
    return `X'${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")}'`;
  }
  if (typeof value === "string" && PLAIN_TOKEN.test(value)) {
    return `'${value}'`;
  }
  throw new Error("support: a value is not a plain token and was not used");
}

/**
 * A D1-shaped database that sends each statement through `execute` (the CLI
 * runs `wrangler d1 execute`, which cannot bind values), with every value
 * written into the SQL as a plain token or, for bytes, a hex literal. `batch` sends its statements together
 * in one command, in order (the refund command needs it).
 */
export function d1ThroughWrangler(
  execute: (sql: string) => Promise<WranglerResult[]>,
): SpendDb {
  const statement = (sql: string, values: unknown[]) => {
    const text = sql.replace(/\?(\d+)/g, (_, index: string) =>
      sqlLiteral(values[Number(index) - 1]),
    );
    return {
      text,
      async run() {
        const [result] = await execute(text);
        return { meta: result?.meta };
      },
      async first<T>() {
        const [result] = await execute(text);
        return ((result?.results ?? [])[0] ?? null) as T | null;
      },
      async all<T>() {
        const [result] = await execute(text);
        return { results: (result?.results ?? []) as T[] };
      },
    };
  };
  return {
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => statement(sql, values),
    }),
    batch: async (statements: SpendStatement[]) => {
      const texts = statements.map((item) => (item as { text?: string }).text);
      if (texts.some((text) => typeof text !== "string")) {
        throw new Error("support: batch needs statements made here");
      }
      const results = await execute(texts.join(";\n"));
      return statements.map((_, index) => ({ meta: results[index]?.meta }));
    },
  };
}
