export const SIMULATED_PAYMENT_SUCCESS_EVENT =
  "simulated_payment_succeeded" as const;

export const PREPAYMENT_EXTRACTION_BLOCKED_MESSAGE =
  "Mulai dari halaman utama untuk melihat pratinjau identitas dan menyelesaikan simulasi pembayaran.";

export function canStartPostPaymentExtraction(input: {
  paymentSucceeded: boolean;
  fromApprovedHandoff: boolean;
}) {
  return input.paymentSucceeded || input.fromApprovedHandoff;
}
