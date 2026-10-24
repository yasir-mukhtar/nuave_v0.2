/** The delivery promise, word for word. The order screen and the
 * payment-received email both use it. Kept apart from the mail code so the
 * browser bundle takes only these lines.
 *
 * Spec 018 R-23: the support-first wording. Yasir approved the delivery
 * sentence on 2026-10-24 (Q-1), matching the clinic landing page; the refund
 * sentence is unchanged. */
export const DELIVERY_PROMISE =
  "Laporan siap dalam 15 menit setelah audit dimulai. Jika ada bagian yang gagal diperiksa, tim kami membantu menyelesaikannya; jika tidak dapat diselesaikan, kami kembalikan uang Anda.";

/** Spec 018 R-23: what the audit checks, named on the order preview and
 * checkout. */
export const AUDIT_SOURCES_TEXT = "ChatGPT dan Google AI Overview";
