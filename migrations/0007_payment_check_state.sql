-- Migration 7 (spec 017 S4b): when the last Midtrans status check of an attempt
-- could not be answered (error, wrong key, timeout). NULL means the last check
-- was answered, or none was made. Lets the page say "Status pembayaran belum
-- dapat diperiksa" (R-06, R-14) without asking Midtrans on every poll.
ALTER TABLE payment_attempts ADD COLUMN check_failed_at TEXT;
