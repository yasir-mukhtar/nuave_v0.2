-- Founder support commands (decision 2026-10-25).
-- email_changed_at: when `npm run support -- email` last replaced a mistyped
-- order email (after the founder checked the payment receipt or transaction
-- number).
ALTER TABLE orders ADD COLUMN email_changed_at TEXT;

-- A refund case the founder closed without a refund, with the reason:
-- declined (the customer said in writing they want no refund), delivered (the
-- customer got the full report another way), settled (the money already went
-- back outside these records, for example a chargeback Midtrans never
-- reported). The order then leaves `npm run support -- refunds` and the
-- hourly cleanup can reach it.
CREATE TABLE IF NOT EXISTS refund_closures (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  reason TEXT NOT NULL CHECK (reason IN ('declined', 'delivered', 'settled')),
  closed_at TEXT NOT NULL
);
