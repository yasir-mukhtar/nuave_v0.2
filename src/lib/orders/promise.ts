/** The delivery promise, word for word. The order screen and the
 * payment-received email both use it. Kept apart from the mail code so the
 * browser bundle takes only these lines.
 *
 * Spec 018 R-23: the support-first wording proposed in the spec. The founder
 * approves the exact words in PR 2 (Q-1); until then this is the proposal. */
export const DELIVERY_PROMISE =
  "Laporan biasanya siap dalam 15 menit setelah Anda menyetujui pertanyaan, paling lama 24 jam. Jika ada bagian yang gagal diperiksa, tim kami membantu menyelesaikannya; jika tidak dapat diselesaikan, kami kembalikan uang Anda.";

/** Spec 018 R-23: what the audit checks, named on the order preview and
 * checkout. */
export const AUDIT_SOURCES_TEXT = "ChatGPT dan Google AI Overview";
