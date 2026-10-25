-- Founder support commands (decision 2026-10-25).
-- email_changed_at: when `npm run support -- email` last replaced a mistyped
-- order email (after the founder checked the payment receipt or transaction
-- number).
ALTER TABLE orders ADD COLUMN email_changed_at TEXT;

-- A refund case the founder closed without a refund (`npm run support --
-- norefund`), one row per case open at that moment: kind 'payment' is a
-- settled payment that could not be applied (by its transaction), kind
-- 'paid_order' is a paid order that failed (transaction_id ''). A payment
-- that arrives later is a new case. Reasons: declined (the customer said in
-- writing they want no refund), delivered (the customer got the full report
-- another way), settled (the money already went back outside these records).
CREATE TABLE IF NOT EXISTS refund_closures (
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('payment', 'paid_order')),
  transaction_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('declined', 'delivered', 'settled')),
  closed_at TEXT NOT NULL,
  PRIMARY KEY (order_id, kind, transaction_id)
);
