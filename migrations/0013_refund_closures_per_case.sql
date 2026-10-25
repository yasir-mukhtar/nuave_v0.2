-- Refund closures are kept per case, not per order (review of the support
-- commands, 2026-10-25): one row per case open when `npm run support --
-- norefund` ran. kind 'payment' is a settled payment that could not be
-- applied (by its transaction); kind 'paid_order' is a paid order that failed
-- (transaction_id ''). A payment that arrives later is a new case. 0012's
-- per-order table was never used (the command shipped with this shape), so it
-- is replaced; it is empty everywhere.
DROP TABLE IF EXISTS refund_closures;
CREATE TABLE refund_closures (
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('payment', 'paid_order')),
  transaction_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('declined', 'delivered', 'settled')),
  closed_at TEXT NOT NULL,
  PRIMARY KEY (order_id, kind, transaction_id)
);
