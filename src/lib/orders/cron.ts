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
import { usdToUnits } from "../spending/spend-ledger";
import {
  founderAlertEmail,
  midtransSettings,
  orderEnvironment,
  orderSpendLimitUsd,
  resendSettings,
  siteOrigin,
} from "./config";
import { fakeMailSender, resendMailSender, type MailSender } from "./mail";
import {
  dataForSeoCredentialsPresent,
  liveDataForSeoTransport,
} from "../discovery/dataforseo";
import { sendCheck, type CheckSend } from "../checks/send";
import { syntheticCheckSend } from "../checks/synthetic";
import { runOrders, type RunSummary } from "./runner";
import type { OrderMode } from "./store";

type AuditSkipped = "switch_off" | "credentials_missing" | "sender_missing";

export type CronResult =
  | {
      ran: true;
      outcomes: RunSummary["outcomes"];
      /** Present when only the tasks that make no AI call ran (R-23). */
      auditSkipped?: AuditSkipped;
    }
  | { ran: false; reason: string };

/**
 * R-15: what one cron run does. It reads only the Worker's own settings (the
 * same ones a web request sees). If the mode, environment, database or site
 * address is missing or unclear, it does nothing and says why. It runs only
 * orders whose stored mode and environment equal its own.
 *
 * Spec 017 R-23: the tasks that make no AI call (reconciliation, sweeps, payment
 * emails, founder notices) also run while the emergency switch is off or the AI
 * settings or the mail sender are missing; only audit steps stop, and the
 * result says which.
 *
 * `devTrigger` is for the local development trigger only: it allows a
 * non-production (local) environment and writes fake emails to the ignored
 * folder.
 */
export async function runScheduledOrders(
  options: { devTrigger?: boolean } = {},
): Promise<CronResult> {
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

  let auditSkipped: AuditSkipped | undefined;
  if (!newAuditEnabled()) auditSkipped = "switch_off";
  let limits: { limitUnits: number; dailyLimitUnits: number } | null = null;
  try {
    limits = {
      limitUnits: usdToUnits(orderSpendLimitUsd()),
      dailyLimitUnits: usdToUnits(dailySpendLimitUsd()),
    };
  } catch {
    // No valid cap settings: no reconciliation (it applies payments) and no
    // cap alerts.
  }
  let sender: MailSender | null;
  if (mode === "live") {
    try {
      assertLiveAuditStageCredentials("observations");
      dailySpendLimitUsd();
    } catch {
      auditSkipped ??= "credentials_missing";
    }
    // No Resend key or from address: no email can be accepted, so a live
    // order could never be delivered. No audit step runs (R-15); the tasks
    // that need no email still do.
    const resend = resendSettings();
    if (!resend) auditSkipped ??= "sender_missing";
    sender = resend ? resendMailSender(resend) : null;
  } else {
    sender = fakeMailSender({ writeLocalFile: options.devTrigger === true });
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
    // Spec 018: ChatGPT and Google checks through DataForSEO (live), or the
    // labelled synthetic answers. Without credentials a live check is refused
    // unsent, as DataForSEO would refuse it (R-14, R-21).
    checks: {
      send: (input) => {
        const now = new Date();
        if (mode !== "live")
          return Promise.resolve(syntheticCheckSend({ ...input, now }));
        if (!dataForSeoCredentialsPresent())
          return Promise.resolve(credentialsMissing(now));
        return sendCheck({
          source: input.source,
          body: input.body,
          transport: liveDataForSeoTransport,
          now: () => new Date(),
        });
      },
    },
    sender,
    auditEnabled: auditSkipped === undefined,
    // The notices and the payment email need only the database and Resend; the
    // cap settings matter only to reconciliation and cap alerts (R-23).
    payments: {
      midtrans: mode === "live" && limits ? midtransSettings() : null,
      limitUnits: limits?.limitUnits ?? null,
      dailyLimitUnits: limits?.dailyLimitUnits ?? null,
      founderEmail: founderAlertEmail(),
    },
  });
  return auditSkipped
    ? { ran: true, outcomes, auditSkipped }
    : { ran: true, outcomes };
}

/** A live check without DataForSEO credentials: refused, nothing sent. */
function credentialsMissing(at: Date): CheckSend {
  return {
    outcome: "unavailable",
    statusCode: 40100,
    result: null,
    costUsd: 0,
    taskId: "",
    startedAt: at,
    completedAt: at,
    transportError: null,
  };
}
