import {
  assertLiveAuditStageCredentials,
  newAuditEnabled,
} from "../audit/deployment-gate";
import {
  executeSyntheticLocalObservation,
  generateSyntheticLocalReport,
} from "../audit/local-direct-ten-audit";
import {
  liveExecuteAuditPrompt,
  liveGenerateReportContent,
} from "../audit/provider";
import { dailySpendLimitUsd, spendDatabase } from "../spending/provider-spend";
import { reconcileDueAttempts } from "../payments/check";
import { usdToUnits } from "../spending/spend-ledger";
import {
  midtransSettings,
  orderEnvironment,
  orderSpendLimitUsd,
  resendSettings,
  siteOrigin,
} from "./config";
import { fakeMailSender, resendMailSender, type MailSender } from "./mail";
import { runOrders, type RunSummary } from "./runner";
import type { OrderMode } from "./store";

export type CronResult =
  | { ran: true; outcomes: RunSummary["outcomes"] }
  | { ran: false; reason: string };

/**
 * R-15: what one cron run does. It reads only the Worker's own settings (the
 * same ones a web request sees). If a needed value or the database is missing,
 * off or unclear, it does nothing and says why. It runs only orders whose
 * stored mode and environment equal its own.
 *
 * `devTrigger` is for the local development trigger only: it allows a
 * non-production (local) environment and writes fake emails to the ignored
 * folder.
 */
export async function runScheduledOrders(
  options: { devTrigger?: boolean } = {},
): Promise<CronResult> {
  if (!newAuditEnabled()) return { ran: false, reason: "switch_off" };
  const rawMode = process.env.NUAVE_AUDIT_MODE?.trim();
  if (rawMode !== "live" && rawMode !== "synthetic") {
    return { ran: false, reason: "mode_unclear" };
  }
  const mode: OrderMode = rawMode;
  // Production is the only worker with a cron (R-14). Only the local
  // development trigger may run another environment (a local database).
  const environment = orderEnvironment();
  if (
    environment === null ||
    (environment !== "production" && options.devTrigger !== true)
  ) {
    return { ran: false, reason: "environment" };
  }
  const db = spendDatabase();
  if (!db) return { ran: false, reason: "database_missing" };
  const origin = siteOrigin();
  if (!origin) return { ran: false, reason: "site_missing" };

  let sender: MailSender | null;
  if (mode === "live") {
    try {
      assertLiveAuditStageCredentials("observations");
      dailySpendLimitUsd();
    } catch {
      return { ran: false, reason: "credentials_missing" };
    }
    // No Resend key or from address: no email can be accepted, so a live
    // order could never be delivered. Do nothing (R-15).
    const resend = resendSettings();
    if (!resend) return { ran: false, reason: "sender_missing" };
    sender = resendMailSender(resend);
  } else {
    sender = fakeMailSender({ writeLocalFile: options.devTrigger === true });
  }

  // R-14: reconciliation of payment attempts runs before the expiry sweep (which
  // is the first thing `runOrders` does), at most 2 attempts per run. S4c puts it
  // in the run's budget and lets it run while the emergency switch is off.
  const midtrans = mode === "live" ? midtransSettings() : null;
  if (midtrans) {
    try {
      await reconcileDueAttempts({
        db,
        now: new Date(),
        midtrans,
        limitUnits: usdToUnits(orderSpendLimitUsd()),
        dailyLimitUnits: usdToUnits(dailySpendLimitUsd()),
      });
    } catch {
      // A failing check never stops the audit steps.
    }
  }

  const { outcomes } = await runOrders({
    db,
    environment,
    mode,
    siteOrigin: origin,
    now: () => new Date(),
    execute:
      mode === "live"
        ? liveExecuteAuditPrompt
        : executeSyntheticLocalObservation,
    generateReport:
      mode === "live"
        ? liveGenerateReportContent
        : generateSyntheticLocalReport,
    sender,
  });
  return { ran: true, outcomes };
}
