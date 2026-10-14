import type { SpendDb } from "../spending/spend-ledger";
import { newLinkSecret, sha256Hex } from "./link-secret";
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
 *   npm run support -- resend <order-id>
 *   npm run support -- off <order-id>
 *   npm run support -- show <order-id> [--email]
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
  "Usage: npm run support -- <resend|off|show> <order-id> [--email] [--local]";

/** Returns the process exit code: 0 done, 1 refused or failed, 2 bad usage. */
export async function runSupport(
  args: readonly string[],
  deps: SupportDeps,
): Promise<number> {
  const flags = args.filter((arg) => arg.startsWith("--"));
  const words = args.filter((arg) => !arg.startsWith("--"));
  const [command, orderId, ...extra] = words;
  const allowed = command === "show" ? ["--email"] : [];
  if (
    !["resend", "off", "show"].includes(command ?? "") ||
    extra.length > 0 ||
    flags.some((flag) => !allowed.includes(flag))
  ) {
    deps.out(SUPPORT_USAGE);
    return 2;
  }
  // Checked before anything else: a bad ID reaches no database and no sender.
  if (!isOrderId(orderId)) {
    deps.out("The order ID must be exactly 32 lowercase hex characters.");
    return 2;
  }
  const order = await getOrder(deps.db, orderId);
  if (!order) {
    deps.out("No order with that ID.");
    return 1;
  }
  if (command === "off") return off(deps, order);
  if (command === "show") {
    return show(deps, order, flags.includes("--email"));
  }
  return resend(deps, order);
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
      `SELECT kind, attempt, result, created_at FROM order_emails
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
 * written into the SQL as a plain token. `batch` is not available: no support
 * command needs one.
 */
export function d1ThroughWrangler(
  execute: (sql: string) => Promise<WranglerResult[]>,
): SpendDb {
  const statement = (sql: string, values: unknown[]) => {
    const text = sql.replace(/\?(\d+)/g, (_, index: string) =>
      sqlLiteral(values[Number(index) - 1]),
    );
    return {
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
    batch: async () => {
      throw new Error("support: batch is not available");
    },
  };
}
