/**
 * Order emails (spec 016 R-25, R-28). The sender interface, the draft wording,
 * the real Resend sender (live mode) and the fake sender (synthetic mode).
 *
 * Synthetic mode never calls Resend: it uses the fake sender, which accepts
 * every message without a network call. In local development only
 * (`NODE_ENV === "development"`), it also writes each message to the ignored
 * folder `.local-evidence/test-mail/` so tests can read the link. It never
 * serves the message over HTTP.
 */

import { DELIVERY_PROMISE } from "./promise";

export { DELIVERY_PROMISE };

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Covers only retries of ONE attempt, with the same body (R-25). */
  idempotencyKey: string;
};

export type MailResult = {
  accepted: boolean;
  messageId?: string;
  /** Resend asked us to wait (429 with Retry-After), in milliseconds. */
  retryAfterMs?: number;
};

export type MailSender = (message: MailMessage) => Promise<MailResult>;

const SUPPORT_EMAIL = "support@nuave.ai";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Draft wording; S5 finalizes. The business name is escaped in the HTML. The
 * order number (spec 017 R-01) is in every customer email. */
export function readyEmail(input: {
  businessName: string;
  link: string;
  orderNumber: string;
}) {
  const text = `Laporan audit untuk ${input.businessName} sudah siap: ${input.link}. Siapa pun yang memegang link ini bisa membuka laporan, jadi jangan teruskan. Link berlaku 12 bulan. Nomor pesanan: ${input.orderNumber}. Bantuan: ${SUPPORT_EMAIL}.`;
  const html = `<p>Laporan audit untuk ${escapeHtml(input.businessName)} sudah siap: <a href="${escapeHtml(input.link)}">${escapeHtml(input.link)}</a>.</p><p>Siapa pun yang memegang link ini bisa membuka laporan, jadi jangan teruskan. Link berlaku 12 bulan.</p><p>Nomor pesanan: ${escapeHtml(input.orderNumber)}. Bantuan: ${SUPPORT_EMAIL}.</p>`;
  return { subject: "Laporan audit Nuave Anda sudah siap", text, html };
}

export function failureEmail(input: {
  businessName: string;
  orderNumber: string;
}) {
  const text = `Audit untuk ${input.businessName} belum bisa diselesaikan. Kami akan menghubungi Anda dalam 1 hari kerja. Nomor pesanan: ${input.orderNumber}. Bantuan: ${SUPPORT_EMAIL}.`;
  const html = `<p>Audit untuk ${escapeHtml(input.businessName)} belum bisa diselesaikan. Kami akan menghubungi Anda dalam 1 hari kerja. Nomor pesanan: ${escapeHtml(input.orderNumber)}. Bantuan: ${SUPPORT_EMAIL}.</p>`;
  return { subject: "Audit Nuave Anda belum bisa diselesaikan", text, html };
}

/** R-22: the payment-received email. It has no link and no secret; it names the
 * business, the order number, the amount, the promise and the browser line. */
export function paymentReceivedEmail(input: {
  businessName: string;
  orderNumber: string;
}) {
  const text = `Pembayaran Rp99.000 untuk audit ${input.businessName} sudah kami terima. Nomor pesanan: ${input.orderNumber}. ${DELIVERY_PROMISE} Lanjutkan di browser yang sama untuk mengisi data bisnis Anda. Bantuan: ${SUPPORT_EMAIL}.`;
  const html = `<p>Pembayaran Rp99.000 untuk audit ${escapeHtml(input.businessName)} sudah kami terima.</p><p>Nomor pesanan: ${escapeHtml(input.orderNumber)}.</p><p>${DELIVERY_PROMISE}</p><p>Lanjutkan di browser yang sama untuk mengisi data bisnis Anda.</p><p>Bantuan: ${SUPPORT_EMAIL}.</p>`;
  return { subject: "Pembayaran Nuave Anda sudah diterima", text, html };
}

export const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10_000;

/**
 * The real sender (live mode): Resend's HTTP API through `fetch`, no new
 * dependency. The idempotency key goes in the `Idempotency-Key` header, so a
 * retry of ONE attempt with the same body never sends twice (R-25). Resend sets
 * open and click tracking per domain, not per email, so the domain setting
 * (founder action Q5) is what turns it off. The key never appears in a thrown
 * message or a log line.
 */
export function resendMailSender(config: {
  apiKey: string;
  from: string;
  fetchImpl?: typeof fetch;
}): MailSender {
  return async (message) => {
    const send = config.fetchImpl ?? fetch;
    const response = await send(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    if (!response.ok) {
      const seconds = Number(response.headers.get("retry-after"));
      return response.status === 429 && Number.isFinite(seconds) && seconds > 0
        ? { accepted: false, retryAfterMs: seconds * 1000 }
        : { accepted: false };
    }
    const body = (await response.json().catch(() => null)) as {
      id?: unknown;
    } | null;
    return typeof body?.id === "string" && body.id
      ? { accepted: true, messageId: body.id }
      : { accepted: false };
  };
}

/** The synthetic-mode sender. Accepts every message; never touches the network. */
export function fakeMailSender(
  options: { writeLocalFile?: boolean } = {},
): MailSender {
  return async (message) => {
    // `process.env.NODE_ENV` is fixed at build time, so a production build
    // contains no file writing at all.
    if (options.writeLocalFile && process.env.NODE_ENV === "development") {
      const { mkdir, writeFile } = await import("node:fs/promises");
      const folder = ".local-evidence/test-mail";
      await mkdir(folder, { recursive: true });
      await writeFile(
        `${folder}/${Date.now()}-${message.idempotencyKey.replace(/[^a-z0-9-]/gi, "_")}.json`,
        JSON.stringify(message, null, 2),
      );
    }
    return { accepted: true, messageId: `fake-${message.idempotencyKey}` };
  };
}

/** The wait between two tries inside one attempt grows (0.5 s, 1 s) and obeys
 * Resend's Retry-After, but never passes this cap, so a cron run stays inside
 * its time budget. */
export const RETRY_BASE_WAIT_MS = 500;
export const RETRY_MAX_WAIT_MS = 3_000;

export function retryWaitMs(afterTry: number, retryAfterMs?: number): number {
  return Math.min(
    Math.max(RETRY_BASE_WAIT_MS * 2 ** (afterTry - 1), retryAfterMs ?? 0),
    RETRY_MAX_WAIT_MS,
  );
}

const realSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** R-25: a failed send inside ONE attempt is retried with the same key and the
 * same body, so one attempt never sends twice. A later attempt is a new call. */
export async function sendWithinAttempt(
  sender: MailSender,
  message: MailMessage,
  options: { tries?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<MailResult> {
  const tries = options.tries ?? 3;
  const sleep = options.sleep ?? realSleep;
  let retryAfterMs: number | undefined;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    if (attempt > 1) await sleep(retryWaitMs(attempt - 1, retryAfterMs));
    retryAfterMs = undefined;
    try {
      const result = await sender(message);
      if (result.accepted) return result;
      retryAfterMs = result.retryAfterMs;
    } catch {
      // try again with the same key
    }
  }
  return { accepted: false };
}
