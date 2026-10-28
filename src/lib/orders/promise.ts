/** The delivery promise, word for word. The order screen and the
 * payment-received email both use it. Kept apart from the mail code so the
 * browser bundle takes only these lines.
 *
 * Spec 018 R-23: the support-first wording. Yasir approved the delivery
 * sentence on 2026-10-24 (Q-1), matching the clinic landing page; on
 * 2026-10-28 it became 30 minutes (Spec 021 PR 6b: pages read, Claude writer). S5
 * (founder, 2026-10-24): the refund clause says the refund is partial, by the
 * number of failed checks (Rp12.450 each, in the terms). */
export const DELIVERY_PROMISE =
  "Laporan siap dalam 30 menit setelah audit dimulai. Jika ada bagian yang gagal diperiksa, tim kami membantu menyelesaikannya. Jika tetap tidak bisa, Anda mendapat pengembalian dana sebagian, sesuai jumlah pemeriksaan yang gagal.";

/** Spec 018 R-23: what the audit checks, named on the order preview and
 * checkout. */
export const AUDIT_SOURCES_TEXT = "ChatGPT dan Google AI Overview";
