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

const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** "18 Oktober 2026 (UTC)": the day in the report's own time zone. */
export function observedOnText(value: string): string | null {
  const date = new Date(value);
  // The report's header shows its times in UTC and names the zone (Spec 012
  // R-12); the email gives the same day, named the same way.
  return Number.isNaN(date.getTime())
    ? null
    : `${new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)} (UTC)`;
}

/**
 * J31: the report-ready email. It names the business and the day the answers
 * were observed, has one action ("Buka laporan"), says where Download PDF is,
 * and carries the privacy note, the 12-month link life, the snapshot note and
 * one help route. The pictures come from the site itself and every line still
 * reads without them. The business name is escaped in the HTML; the order
 * number (spec 017 R-01) is in every customer email.
 */
export function readyEmail(input: {
  businessName: string;
  link: string;
  orderNumber: string;
  /** The audited location or area ("Kedai Fiksi Dago", "Bandung, Cimahi"). */
  scope?: string | null;
  /** When the first answer was observed (ISO time). */
  observedAt?: string | null;
}) {
  const observedOn = input.observedAt ? observedOnText(input.observedAt) : null;
  // "Kedai Fiksi Dago" under "Kedai Fiksi" reads as "Kedai Fiksi, Dago".
  const name = input.businessName.trim();
  const rawScope = input.scope?.trim() ?? "";
  const scope = rawScope
    .toLocaleLowerCase("id-ID")
    .startsWith(`${name.toLocaleLowerCase("id-ID")} `)
    ? rawScope.slice(name.length).trim()
    : rawScope;
  const about = `AI Visibility Report untuk ${input.businessName}${
    scope &&
    scope.toLocaleLowerCase("id-ID") !== name.toLocaleLowerCase("id-ID")
      ? `, ${scope}`
      : ""
  }.${observedOn ? ` Jawaban diamati pada ${observedOn}.` : ""}`;
  const text = [
    "Laporan Anda sudah siap.",
    about,
    `Buka laporan: ${input.link}`,
    "Di halaman laporan, pilih Download PDF untuk menyimpan versi PDF.",
    "Link ini pribadi: siapa pun yang memegang link ini bisa membuka laporan, jadi jangan teruskan email ini. Link berlaku 12 bulan.",
    "Laporan ini merekam jawaban model AI untuk 10 pertanyaan pada satu waktu. Jawaban dapat berubah.",
    `Ada masalah dengan laporan? Balas email ini atau tulis ke ${SUPPORT_EMAIL}.`,
    `Nomor pesanan: ${input.orderNumber}`,
  ].join("\n\n");
  let origin = "";
  try {
    origin = new URL(input.link).origin;
  } catch {
    // No pictures without a site address; the words carry the email.
  }
  const href = escapeHtml(input.link);
  const muted = `margin:0;font-family:${EMAIL_FONT};font-size:13px;line-height:19px;color:#57534e;`;
  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Laporan Anda sudah siap</title></head>
<body style="margin:0;padding:0;background:#fafaf9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e7e5e4;border-radius:20px;">
<tr><td style="padding:24px 24px 0;">${
    origin
      ? `<img src="${escapeHtml(origin)}/v2/email/nuave-logo.png" width="79" height="22" alt="Nuave" style="display:block;border:0;">`
      : `<p style="margin:0;font-family:${EMAIL_FONT};font-size:18px;font-weight:600;color:#1c1917;">Nuave</p>`
  }</td></tr>
${
  origin
    ? `<tr><td style="padding:20px 24px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ea;border-radius:16px;"><tr><td align="center" style="padding:6px;"><img src="${escapeHtml(origin)}/v2/email/kedai-busy.jpg" width="220" height="156" alt="" style="display:block;border:0;"></td></tr></table></td></tr>`
    : ""
}
<tr><td style="padding:22px 24px 0;"><h1 style="margin:0;font-family:${EMAIL_FONT};font-size:24px;line-height:30px;font-weight:600;color:#1c1917;">Laporan Anda sudah siap</h1>
<p style="margin:10px 0 0;font-family:${EMAIL_FONT};font-size:16px;line-height:24px;color:#57534e;">${escapeHtml(about)}</p></td></tr>
<tr><td style="padding:22px 24px 0;"><a href="${href}" style="display:block;background:#d4420b;border-radius:14px;padding:17px 24px;font-family:${EMAIL_FONT};font-size:18px;line-height:22px;font-weight:600;color:#ffffff;text-align:center;text-decoration:none;">Buka laporan</a>
<p style="${muted}margin-top:12px;text-align:center;color:#78716c;">Di halaman laporan, pilih Download PDF untuk menyimpan versi PDF.</p></td></tr>
<tr><td style="padding:20px 24px 0;"><div style="height:1px;background:#e7e5e4;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
<tr><td style="padding:16px 24px 0;"><p style="${muted}">Link ini pribadi: siapa pun yang memegang link ini bisa membuka laporan, jadi jangan teruskan email ini. Link berlaku 12 bulan.</p>
<p style="${muted}margin-top:10px;">Laporan ini merekam jawaban model AI untuk 10 pertanyaan pada satu waktu. Jawaban dapat berubah.</p></td></tr>
<tr><td style="padding:16px 24px 0;"><div style="height:1px;background:#e7e5e4;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
<tr><td style="padding:16px 24px 24px;"><p style="${muted}color:#78716c;">Ada masalah dengan laporan? Balas email ini atau tulis ke <a href="mailto:${SUPPORT_EMAIL}" style="color:#1c1917;">${SUPPORT_EMAIL}</a>.</p>
<p style="margin:10px 0 0;font-family:ui-monospace, Menlo, Consolas, monospace;font-size:12px;line-height:16px;color:#78716c;">No. pesanan ${escapeHtml(input.orderNumber)}</p>
<p style="${muted}margin-top:14px;font-size:12px;color:#78716c;">Jika tombol tidak bisa dibuka, salin link ini: <span style="word-break:break-all;">${href}</span></p></td></tr>
</table></td></tr></table></body></html>`;
  return {
    subject: `AI Visibility Report untuk ${input.businessName} sudah siap`,
    text,
    html,
  };
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
