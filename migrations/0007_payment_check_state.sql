-- Migration 7 (spec 017 S4b): when the last Midtrans status check of an attempt
-- could not be answered (error, wrong key, timeout). NULL means the last check
-- was answered, or none was made. Lets the page say "Status pembayaran belum
-- dapat diperiksa" (R-06, R-14) without asking Midtrans on every poll.
ALTER TABLE payment_attempts ADD COLUMN check_failed_at TEXT;

-- R-08: a signed notification Nuave cannot use is "recorded, ignored": its
-- order_id is unknown, or the Get Status answer is for another order_id. Only
-- Midtrans identifiers and a status word, no personal data. Unique per
-- transaction and reason, so repeats and retries cannot grow it.
CREATE TABLE IF NOT EXISTS payment_ignored_notifications (
  transaction_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unknown_order', 'order_mismatch')),
  midtrans_order_id TEXT,
  transaction_status TEXT,
  received_at TEXT NOT NULL,
  PRIMARY KEY (transaction_id, reason)
);
