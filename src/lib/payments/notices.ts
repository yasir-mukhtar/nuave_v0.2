import type { SpendDb, SpendStatement } from "../spending/spend-ledger";

/**
 * R-21: a founder notice is one row, unique by (kind, subject). Daily kinds use
 * the UTC day as the subject; kinds about one order or transaction use a stable
 * key that is never the internal order ID (the order number, the Midtrans
 * order_id or the transaction_id). S4b only records the row; the cron sends it
 * (S4c). Writing the same notice again changes nothing.
 */
export type NoticeInput = {
  kind: string;
  subject: string;
  /** Facts the email needs. Never a key, a signature, an email address or the
   * internal order ID. */
  detail?: Record<string, string | number | null>;
  now: Date;
};

export const utcDayOf = (at: Date) => at.toISOString().slice(0, 10);

/** The insert as a statement, so it can ride in the batch that caused it. `guard`
 * is an optional SQL condition with its own parameters, numbered from `?6`. */
export function noticeStatement(
  db: SpendDb,
  input: NoticeInput,
  guard?: { sql: string; values: unknown[] },
): SpendStatement {
  return db
    .prepare(
      `INSERT OR IGNORE INTO founder_notices
         (id, kind, subject, detail_json, status, created_at)
       SELECT ?1, ?2, ?3, ?4, 'pending', ?5
       WHERE ${guard?.sql ?? "1 = 1"}`,
    )
    .bind(
      crypto.randomUUID(),
      input.kind,
      input.subject,
      input.detail ? JSON.stringify(input.detail) : null,
      input.now.toISOString(),
      ...(guard?.values ?? []),
    );
}

/** True when this call wrote the row (it was the first). */
export async function recordFounderNotice(
  db: SpendDb,
  input: NoticeInput,
): Promise<boolean> {
  const result = await noticeStatement(db, input).run();
  return result.meta?.changes === 1;
}
