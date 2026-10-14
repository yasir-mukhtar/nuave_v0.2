import { applyRefund } from "../payments/apply";
import type { SpendDb, SpendStatement } from "../spending/spend-ledger";
import { newLinkSecret, sha256Hex } from "./link-secret";
import { isOrderNumber } from "./order-number";
import { readyEmail, sendWithinAttempt, type MailSender } from "./mail";
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
};

const UNITS_PER_USD = 100_000_000;
const usd = (units: number) => `USD ${(units / UNITS_PER_USD).toFixed(4)}`;

export const SUPPORT_USAGE =
  "Usage: npm run support -- <resend|off|show> <order-id|order-number|midtrans-order-id> [--email] [--local]\n" +
  "       npm run support -- refunds [--local]\n" +
  "       npm run support -- refunded <transaction-id> [--local]\n" +
  "       npm run support -- close <midtrans-order-id> <unknown|unpaid> [--local]";

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

async function off(deps: SupportDeps, order: OrderRow): Promise<number> {
  await switchLinkOff(deps.db, order.id);
  deps.out(
    `The link is switched off. The order stays ${order.state}. The report page now shows "not available".`,
  );
  return 0;
}

async function resend(deps: SupportDeps, order: OrderRow): Promise<number> {
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
  const sender = await deps.makeSender();
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
       WHERE t.outcome = 'needs_refund' AND t.refund_state != 'refunded'
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
       WHERE o.state = 'failed' AND o.payment_kind = 'midtrans'
         AND COALESCE((SELECT t.refund_state FROM payment_transactions t
                       WHERE t.transaction_id = o.paid_transaction_id), 'none')
             NOT IN ('refunded', 'chargeback')
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
  if (total > 0) deps.out("Refund within three business days (D3).");
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
 * email address (it has an `@`) or any other free text cannot pass, so no
 * email can ever reach SQL text (R-32). */
const PLAIN_TOKEN = /^[A-Za-z0-9_.:+\- ]{0,200}$/;

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string" && PLAIN_TOKEN.test(value)) {
    return `'${value}'`;
  }
  throw new Error("support: a value is not a plain token and was not used");
}

/**
 * A D1-shaped database that sends each statement through `execute` (the CLI
 * runs `wrangler d1 execute`, which cannot bind values), with every value
 * written into the SQL as a plain token. `batch` sends its statements together
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
