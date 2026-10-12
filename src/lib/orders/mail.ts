/**
 * Order emails (spec 016 R-25, R-28). S3a has the sender interface, the draft
 * wording and the FAKE sender; the real Resend sender is S3b.
 *
 * Synthetic mode never calls Resend: it uses the fake sender, which accepts
 * every message without a network call. In local development only
 * (`NODE_ENV === "development"`), it also writes each message to the ignored
 * folder `.local-evidence/test-mail/` so tests can read the link. It never
 * serves the message over HTTP.
 */

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Covers only retries of ONE attempt, with the same body (R-25). */
  idempotencyKey: string;
};

export type MailResult = { accepted: boolean; messageId?: string };

export type MailSender = (message: MailMessage) => Promise<MailResult>;

/**
 * TEMPORARY (S3a): there is no real sender until S3b, so no live order could
 * ever be delivered. While this is false, POST /api/orders refuses live orders
 * and the cron returns `sender_missing`. S3b: set this to true (or delete it
 * and both checks) when the Resend sender lands.
 */
export const REAL_SENDER_AVAILABLE: boolean = false;

const SUPPORT_EMAIL = "support@nuave.ai";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Draft wording; S5 finalizes. The business name is escaped in the HTML. */
export function readyEmail(input: { businessName: string; link: string }) {
  const text = `Laporan audit untuk ${input.businessName} sudah siap: ${input.link}. Siapa pun yang memegang link ini bisa membuka laporan, jadi jangan teruskan. Link berlaku 12 bulan. Bantuan: ${SUPPORT_EMAIL}.`;
  const html = `<p>Laporan audit untuk ${escapeHtml(input.businessName)} sudah siap: <a href="${escapeHtml(input.link)}">${escapeHtml(input.link)}</a>.</p><p>Siapa pun yang memegang link ini bisa membuka laporan, jadi jangan teruskan. Link berlaku 12 bulan. Bantuan: ${SUPPORT_EMAIL}.</p>`;
  return { subject: "Laporan audit Nuave Anda sudah siap", text, html };
}

export function failureEmail(input: { businessName: string }) {
  const text = `Audit untuk ${input.businessName} belum bisa diselesaikan. Kami akan menghubungi Anda dalam 1 hari kerja. Bantuan: ${SUPPORT_EMAIL}.`;
  const html = `<p>Audit untuk ${escapeHtml(input.businessName)} belum bisa diselesaikan. Kami akan menghubungi Anda dalam 1 hari kerja. Bantuan: ${SUPPORT_EMAIL}.</p>`;
  return { subject: "Audit Nuave Anda belum bisa diselesaikan", text, html };
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

/** R-25: a failed send inside ONE attempt is retried with the same key and the
 * same body, so one attempt never sends twice. A later attempt is a new call. */
export async function sendWithinAttempt(
  sender: MailSender,
  message: MailMessage,
  tries = 3,
): Promise<MailResult> {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const result = await sender(message);
      if (result.accepted) return result;
    } catch {
      // try again with the same key
    }
  }
  return { accepted: false };
}
