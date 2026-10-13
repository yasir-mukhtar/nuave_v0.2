-- Migration 2: order rows in the spend ledger (spec 016 R-08..R-10).
-- Both columns are safe for the old worker, which runs between this migration
-- and the deploy: it never names them, so `kind` takes its default.
--   kind: 'daily' (S2 rows), 'order_hold' (one per live order) or
--         'order_call' (one per paid call of an order).
ALTER TABLE provider_spend ADD COLUMN kind TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE provider_spend ADD COLUMN order_id TEXT;

CREATE INDEX IF NOT EXISTS provider_spend_order ON provider_spend(order_id);
