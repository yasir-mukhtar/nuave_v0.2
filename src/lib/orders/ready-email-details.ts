import {
  contextMarketLabel,
  isDirectTenAuditContext,
  type AuditSubject,
} from "../audit/direct-ten-context-v2";
import type { SpendDb } from "../spending/spend-ledger";
import { listQuestions, type OrderRow } from "./store";

/**
 * What the ready email says about the audit (J31): where it looked and when
 * the answers were observed. Read from what the order already saved; a value
 * that cannot be read is left out of the email, never guessed.
 */
export async function readyEmailDetails(
  db: SpendDb,
  order: OrderRow,
): Promise<{ scope: string | null; observedAt: string | null }> {
  let scope: string | null = null;
  try {
    const intake = JSON.parse(order.intake_json ?? "null") as {
      context?: AuditSubject;
    } | null;
    const context = intake?.context;
    if (context && isDirectTenAuditContext(context)) {
      const focus = context.focus.value;
      scope =
        focus.kind === "brand"
          ? contextMarketLabel(context) || null
          : focus.name;
    }
  } catch {
    scope = null;
  }
  let observedAt: string | null = null;
  try {
    const times = (await listQuestions(db, order.id))
      .flatMap((row) => {
        if (!row.observation_json) return [];
        const value = (
          JSON.parse(row.observation_json) as { observed_at?: unknown }
        ).observed_at;
        return typeof value === "string" && !Number.isNaN(Date.parse(value))
          ? [value]
          : [];
      })
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    observedAt = times[0] ?? null;
  } catch {
    observedAt = null;
  }
  return { scope, observedAt };
}
