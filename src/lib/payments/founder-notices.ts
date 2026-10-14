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
      crypto.randomUUID(),
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
       WHERE id = ?1`,
    )
    .bind(
      row.id,
      result.accepted ? "sent" : "pending",
      result.accepted ? iso(deps.now) : null,
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
  const fresh = CAP_LEVELS.filter(
    (level) =>
      total * 100 >= level * input.dailyLimitUnits &&
      !seen.includes(`cap_${level}`),
  );
  if (fresh.length === 0) return [];
  const highest = fresh[fresh.length - 1];
  const at = iso(input.now);
  await db.batch(
    fresh.map((level) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO founder_notices
             (id, kind, subject, detail_json, status, sent_at, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        )
        .bind(
          crypto.randomUUID(),
          `cap_${level}`,
          day,
          JSON.stringify({
            level,
            day,
            spent_usd: usd(total),
            cap_usd: usd(input.dailyLimitUnits),
          }),
          level === highest ? "pending" : "sent",
          level === highest ? null : at,
          at,
        ),
    ),
  );
  return [...fresh];
}

/* --------------------------------- emails ---------------------------------- */

const RAISE_CAP =
  "To raise the cap, change NUAVE_DAILY_SPEND_LIMIT_USD in .github/workflows/ci.yml and deploy. A change made only in the Cloudflare dashboard is overwritten by the next deploy.";
const REFUND_DEADLINE =
  "Refund the customer within three business days (D3). Bank transfers are refunded by hand from the bank; ask the customer for the account number by support email.";

/** "99000.00" -> "Rp99.000". Anything else is shown as received. */
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
    case "chargeback":
      built = {
        subject: `Nuave: ${row.kind.replace("_", " ")}${order ? ` (${order})` : ""}`,
        lines: [
          `Midtrans reported a ${row.kind.replace("_", " ")} for transaction ${row.subject}. It was recorded; nothing else changed.`,
          order ? `Order number: ${order}.` : null,
          money,
          "Check the Midtrans dashboard and decide what to do.",
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
