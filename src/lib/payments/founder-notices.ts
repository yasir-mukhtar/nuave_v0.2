import { escapeHtml, sendWithinAttempt, type MailSender } from "../orders/mail";
import { emailRetryDelayMs } from "../orders/store";
import type { SpendDb } from "../spending/spend-ledger";
import { utcDayOf } from "./notices";

/**
 * Founder notices, sending side (spec 017 R-21). The rows are written elsewhere
 * (web requests, apply.ts, the sweeps); only the cron sends them. A notice is
 * claimed in its row first and sent after, so overlapping cron runs never send
 * one twice. The email shows the order number, never the customer's email or
 * the internal order ID.
 */

/** Refund cases are retried until sent; the other kinds for 24 hours. */
export const REFUND_NOTICE_KINDS = [
  "paid_order_failed",
  "paid_not_started",
  "needs_refund",
  "payment_unknown",
] as const;
const OTHER_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
/** The claim outlasts one send (three tries) and expires if the run dies. */
const CLAIM_MS = 120_000;
const KINDS_SQL = REFUND_NOTICE_KINDS.map((kind) => `'${kind}'`).join(", ");

export type NoticeRow = {
  id: string;
  kind: string;
  subject: string;
  detail_json: string | null;
  attempts: number;
  created_at: string;
};

export const isRefundNotice = (kind: string) =>
  (REFUND_NOTICE_KINDS as readonly string[]).includes(kind);

const iso = (at: Date) => at.toISOString();

/** One refund-case notice and one other notice that are due, oldest first. A
 * failed send backs off like the S3 emails (2 minutes, doubling, to an hour).
 * One query. */
export async function dueFounderNotices(
  db: SpendDb,
  now: Date,
): Promise<NoticeRow[]> {
  const cutoff = (tries: number) =>
    iso(new Date(now.getTime() - emailRetryDelayMs(tries)));
  const due = `(status = 'pending' OR (status = 'claimed' AND claim_until <= ?1))
    AND (last_attempt_at IS NULL OR last_attempt_at <= CASE MIN(attempts, 6)
      WHEN 1 THEN ?3 WHEN 2 THEN ?4 WHEN 3 THEN ?5
      WHEN 4 THEN ?6 WHEN 5 THEN ?7 ELSE ?8 END)`;
  const columns = "id, kind, subject, detail_json, attempts, created_at";
  const { results } = await db
    .prepare(
      `SELECT * FROM (SELECT ${columns} FROM founder_notices
         WHERE kind IN (${KINDS_SQL}) AND ${due} ORDER BY created_at LIMIT 1)
       UNION ALL
       SELECT * FROM (SELECT ${columns} FROM founder_notices
         WHERE kind NOT IN (${KINDS_SQL}) AND created_at > ?2 AND ${due}
         ORDER BY created_at LIMIT 1)`,
    )
    .bind(
      iso(now),
      iso(new Date(now.getTime() - OTHER_RETRY_WINDOW_MS)),
      cutoff(1),
      cutoff(2),
      cutoff(3),
      cutoff(4),
      cutoff(5),
      cutoff(6),
    )
    .all<NoticeRow>();
  return results;
}

/** R-21: claim the row, send, then mark it sent (or give it back for a retry).
 * Null when another run holds or has sent it; otherwise whether Resend
 * accepted. */
export async function sendFounderNotice(
  deps: {
    db: SpendDb;
    sender: MailSender;
    to: string;
    now: Date;
    sleep?: (ms: number) => Promise<void>;
  },
  row: NoticeRow,
): Promise<boolean | null> {
  const { db } = deps;
  const owner = crypto.randomUUID();
  const claim = await db
    .prepare(
      `UPDATE founder_notices
       SET status = 'claimed', claim_owner = ?2, claim_until = ?3,
           attempts = attempts + 1, last_attempt_at = ?4
       WHERE id = ?1 AND attempts = ?5
         AND (status = 'pending' OR (status = 'claimed' AND claim_until <= ?4))`,
    )
    .bind(
      row.id,
      owner,
      iso(new Date(deps.now.getTime() + CLAIM_MS)),
      iso(deps.now),
      row.attempts,
    )
    .run();
  if (claim.meta?.changes !== 1) return null;
  const mail = noticeEmail(row);
  // The key is this notice's own random id and its try number: one try never
  // sends twice, and no order or customer detail is in it.
  const result = await sendWithinAttempt(
    deps.sender,
    {
      to: deps.to,
      ...mail,
      idempotencyKey: `nuave-notice-${row.id}-${row.attempts + 1}`,
    },
    { sleep: deps.sleep },
  );
  await db
    .prepare(
      `UPDATE founder_notices
       SET status = ?2, sent_at = ?3, claim_owner = NULL, claim_until = NULL
       WHERE id = ?1 AND claim_owner = ?4`,
    )
    .bind(
      row.id,
      result.accepted ? "sent" : "pending",
      result.accepted ? iso(deps.now) : null,
      owner,
    )
    .run();
  return result.accepted;
}

/* ------------------------------- cap alerts -------------------------------- */

const CAP_LEVELS = [80, 90, 100] as const;
const UNITS_PER_USD = 100_000_000;
const usd = (units: number) => (units / UNITS_PER_USD).toFixed(2);

/**
 * R-21: today's cap total (holds plus settled daily rows) against the cap.
 * Records `cap_80`, `cap_90` and `cap_100` the first time each is reached that
 * UTC day. When several are new at once the highest is the one to send and the
 * lower ones are recorded as already sent (one email). One query, and one more
 * only when a level is new. Returns the levels recorded.
 */
export async function recordCapAlerts(
  db: SpendDb,
  input: { now: Date; dailyLimitUnits: number },
): Promise<number[]> {
  const day = utcDayOf(input.now);
  const row = await db
    .prepare(
      `SELECT
         (SELECT COALESCE(SUM(held_units), 0) FROM provider_spend
            WHERE day = ?1 AND kind != 'order_call') AS total,
         (SELECT group_concat(kind) FROM founder_notices
            WHERE subject = ?1 AND kind IN ('cap_80', 'cap_90', 'cap_100')) AS seen`,
    )
    .bind(day)
    .first<{ total: number; seen: string | null }>();
  const total = row?.total ?? 0;
  const seen = (row?.seen ?? "").split(",");
  const reached = CAP_LEVELS.filter(
    (level) => total * 100 >= level * input.dailyLimitUnits,
  );
  const highest = reached[reached.length - 1];
  const fresh = reached.filter((level) => !seen.includes(`cap_${level}`));
  // Nothing new, or only a level below one already recorded.
  if (highest === undefined || !fresh.includes(highest)) return [];
  const at = iso(input.now);
  const detail = (level: number) =>
    JSON.stringify({
      level,
      day,
      spent_usd: usd(total),
      cap_usd: usd(input.dailyLimitUnits),
    });
  // Only the highest level is ever pending for the day (one email). A lower
  // level is written as sent, or, if an overlapping run left it pending, set to
  // sent, so two runs can never leave two levels to send.
  await db.batch(
    reached.map((level) =>
      db
        .prepare(
          level === highest
            ? `INSERT OR IGNORE INTO founder_notices
                 (id, kind, subject, detail_json, status, created_at)
               VALUES (?1, ?2, ?3, ?4, 'pending', ?5)`
            : `INSERT INTO founder_notices
                 (id, kind, subject, detail_json, status, sent_at, created_at)
               VALUES (?1, ?2, ?3, ?4, 'sent', ?5, ?5)
               ON CONFLICT(kind, subject) DO UPDATE SET
                 status = 'sent', sent_at = excluded.sent_at
               WHERE founder_notices.status = 'pending'`,
        )
        .bind(crypto.randomUUID(), `cap_${level}`, day, detail(level), at),
    ),
  );
  return [...fresh];
}

/* --------------------------------- emails ---------------------------------- */

const RAISE_CAP =
  "To raise the cap, change NUAVE_DAILY_SPEND_LIMIT_USD in .github/workflows/ci.yml and deploy. A change made only in the Cloudflare dashboard is overwritten by the next deploy.";
const REFUND_DEADLINE =
  "Refund the customer within three business days (D3). Bank transfers are refunded by hand from the bank; ask the customer for the account number by support email.";

/** "249000.00" -> "Rp249.000". Anything else is shown as received. */
function rupiah(amount: unknown): string {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0
    ? `Rp${Math.round(value).toLocaleString("id-ID")}`
    : String(amount ?? "-");
}

function parseDetail(json: string | null): Record<string, unknown> {
  try {
    const value = JSON.parse(json ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

/** The founder's email for one notice: what happened, the order number when
 * there is one, the amount and method, and the action (R-21). */
export function noticeEmail(
  row: Pick<NoticeRow, "kind" | "subject" | "detail_json">,
) {
  const d = parseDetail(row.detail_json);
  const order = d.order_number ? String(d.order_number) : null;
  const money = d.amount
    ? `Amount: ${rupiah(d.amount)}. Payment method: ${d.method ?? "unknown"}.`
    : null;
  const reason = d.reason ? `Reason: ${String(d.reason)}.` : null;
  const refundCase = (what: string) => ({
    subject: `Nuave: ${what}${order ? ` (${order})` : ""}`,
    lines: [
      `${what}.`,
      order ? `Order number: ${order}.` : null,
      d.midtrans_order_id ? `Midtrans order_id: ${d.midtrans_order_id}.` : null,
      money,
      reason,
      REFUND_DEADLINE,
    ],
  });
  const cap = (what: string, spent?: string) => ({
    subject: `Nuave: ${what}`,
    lines: [`${what}.`, spent ?? null, RAISE_CAP],
  });
  const spent = `Spent so far on UTC day ${d.day ?? row.subject}: USD ${d.spent_usd ?? "?"} of USD ${d.cap_usd ?? "?"} (holds plus settled calls).`;
  let built: { subject: string; lines: (string | null)[] };
  switch (row.kind) {
    case "cap_80":
    case "cap_90":
    case "cap_100":
      built = cap(`Daily spending cap at ${row.kind.slice(4)}%`, spent);
      break;
    case "cap_full":
      built = cap(
        `A customer was turned away: the daily cap has no room (UTC day ${row.subject})`,
      );
      break;
    case "notification_rejected":
      built = {
        subject: "Nuave: a Midtrans notification was rejected",
        lines: [
          `A Midtrans notification was rejected on UTC day ${row.subject} (${d.reason ?? "bad signature or missing server key"}). Nuave answered 503; Midtrans retries four times over about two hours.`,
          "Check that MIDTRANS_SERVER_KEY is set correctly in the deploy secrets. Real payments are not applied until the key is right.",
        ],
      };
      break;
    case "paid_order_failed":
      built = refundCase("A paid order failed during the audit");
      break;
    case "paid_not_started":
      built = refundCase(
        "A paid order was not started within 7 days and has ended",
      );
      break;
    case "needs_refund":
      built = refundCase("A payment was received that cannot be applied");
      built.lines.push(`Transaction: ${row.subject}.`);
      break;
    case "payment_unknown":
      built = refundCase(
        "A payment attempt has no final answer from Midtrans after 24 hours",
      );
      built.lines.push(
        "Check the attempt in the Midtrans dashboard. If it was never paid: npm run support -- close <midtrans-order-id> unpaid.",
      );
      break;
    case "late_payment_over_cap":
      built = cap(
        `A payment arrived after its attempt closed and pushed the day past the cap${order ? ` (${order})` : ""}`,
        [order ? `Order number: ${order}.` : null, money]
          .filter(Boolean)
          .join(" "),
      );
      break;
    case "partial_refund":
    case "partial_chargeback":
    case "chargeback": {
      // R-15: a chargeback of the paying transaction before approval ends the
      // order as refunded; otherwise it is only recorded.
      const result =
        d.order_ended === "yes"
          ? "The order was ended as refunded and no audit work will run."
          : d.order_ended === "no" && row.kind !== "partial_refund"
            ? "It was only recorded; the order was not ended (already approved, or this transaction did not pay it)."
            : "It was recorded; nothing else changed.";
      built = {
        subject: `Nuave: ${row.kind.replace("_", " ")}${order ? ` (${order})` : ""}`,
        lines: [
          `Midtrans reported a ${row.kind.replace("_", " ")} for transaction ${row.subject}. ${result}`,
          order ? `Order number: ${order}.` : null,
          money,
          "Check the Midtrans dashboard and decide what to do. If the case may run long, keep the order from the record cleanup with: npm run support -- hold <order> <days>.",
        ],
      };
      break;
    }
    case "checks_failed":
      // Spec 018 R-21/R-21a: a delivered order with failed checks. The
      // customer saw "Minta bantuan"; nothing is refunded unless support
      // cannot provide the missing results.
      built = {
        subject: `Nuave: a delivered report has failed checks${order ? ` (${order})` : ""}`,
        lines: [
          'A report was delivered with checks that could not be completed. The customer sees "Tidak dapat diuji" and "Minta bantuan" for them.',
          order ? `Order number: ${order}.` : null,
          d.failed ? `Failed checks: ${String(d.failed)}.` : null,
          "Reply to the customer's support email within one business day. You may run the failed checks again by hand and email the results to the order email. Refund only if they cannot be provided.",
        ],
      };
      break;
    case "questions_limit":
      // Spec 018 N-18: the order's question-writing limit is spent.
      built = {
        subject: `Nuave: an order cannot get its questions${order ? ` (${order})` : ""}`,
        lines: [
          "An order reached its question-writing limit, so the customer cannot write the ten questions again. The screen tells them to email support@nuave.ai.",
          order ? `Order number: ${order}.` : null,
          "Reply within one business day. Help the customer by hand, or refund if it cannot be resolved.",
        ],
      };
      break;
    case "dataforseo_unavailable":
      // Spec 018 R-21/R-22: credentials, access, balance or cost limit.
      built = {
        subject: "Nuave: DataForSEO is unavailable",
        lines: [
          `DataForSEO refused a request on UTC day ${row.subject}${d.status_code ? ` (status ${String(d.status_code)})` : ""}${d.balance_usd !== undefined && d.balance_usd !== null ? `; balance USD ${String(d.balance_usd)}` : ""}.`,
          "New payments are refused until it works again (the balance must be at least USD 2.00). Paid orders continue; their failed checks show Minta bantuan.",
          "Check DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in the deploy secrets and top up the DataForSEO balance.",
        ],
      };
      break;
    default:
      built = {
        subject: `Nuave: ${row.kind}`,
        lines: [`${row.kind}: ${row.subject}`],
      };
  }
  const lines = built.lines.filter((line): line is string => Boolean(line));
  return {
    subject: built.subject,
    text: lines.join("\n"),
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join(""),
  };
}
