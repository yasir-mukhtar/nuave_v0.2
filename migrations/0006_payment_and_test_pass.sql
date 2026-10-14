-- Migration 6: everything spec 017 (S4) stores, in one migration so the later
-- S4 slices need no other. Additive only: nothing the S3 worker uses changes,
-- so the S3 worker keeps running between this migration and the deploy (R-23
-- rollout). "Paid" is a column, not a new state, so the `orders` state check is
-- not rebuilt. No card, bank or wallet detail is stored anywhere (R-04).

-- ---------------------------------------------------------------- orders ----
-- R-01: the short order number. A unique INDEX, not a UNIQUE column: SQLite
-- cannot add a UNIQUE column. NULLs are allowed (an order made by S3 code in
-- the gap before the deploy has none until its next email gives it one).
ALTER TABLE orders ADD COLUMN order_number TEXT;
-- R-11: when the order was marked paid (Nuave's clock at that write).
ALTER TABLE orders ADD COLUMN paid_at TEXT;
-- R-23: NULL means "legacy": made by S3 code, allowed to finish as in S3.
--   unpaid    - waiting for payment; holds nothing, runs nothing (R-18)
--   test      - founder test pass (R-20)
--   midtrans  - paid through Midtrans (R-11)
--   simulated - the labeled synthetic-mode payment (R-17); counts as paid in
--               synthetic mode only
ALTER TABLE orders ADD COLUMN payment_kind TEXT CHECK (
  payment_kind IN ('unpaid', 'test', 'midtrans', 'simulated')
);
-- R-19: the newer order that replaced this unpaid one.
ALTER TABLE orders ADD COLUMN replaced_by TEXT;
-- R-11: the attempt (payment_attempts.id) and the Midtrans transaction_id that
-- paid the order.
ALTER TABLE orders ADD COLUMN paid_attempt_id TEXT;
ALTER TABLE orders ADD COLUMN paid_transaction_id TEXT;
-- R-15: when a full refund of the paying transaction was recorded. The order
-- ends as `failed` with failure_code 'refunded' only if it was not yet
-- approved; after approval this is only a record.
ALTER TABLE orders ADD COLUMN refunded_at TEXT;

-- Existing orders get an order number now (R-23). A permutation of the rowid
-- over 31^6 (the multiplier is coprime to 31), so the numbers are distinct and
-- the unique index below cannot fail. 31-character alphabet: no 0, 1, I, L, O.
UPDATE orders SET order_number = (
  SELECT 'NV-'
    || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (n / 28629151) % 31 + 1, 1)
    || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (n / 923521) % 31 + 1, 1)
    || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (n / 29791) % 31 + 1, 1)
    || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (n / 961) % 31 + 1, 1)
    || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (n / 31) % 31 + 1, 1)
    || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', n % 31 + 1, 1)
  FROM (SELECT (orders.rowid * 104729) % 887503681 AS n)
)
WHERE order_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number ON orders(order_number);

-- ---------------------------------------------------------- provider_spend --
-- R-20: rows of a founder test pass order are marked.
ALTER TABLE provider_spend ADD COLUMN test INTEGER NOT NULL DEFAULT 0;
-- R-11: one hold row per order, whoever writes it.
CREATE UNIQUE INDEX IF NOT EXISTS provider_spend_order_hold
  ON provider_spend(order_id) WHERE kind = 'order_hold';

-- -------------------------------------------------------- payment attempts --
-- R-04. One row per Snap payment started for an order. Kept at least 24 months
-- and not removed with the order (D1).
CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  -- Order number + "-" + attempt number, e.g. NV-7K3Q9P-2 (R-03).
  midtrans_order_id TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  snap_token TEXT,
  redirect_url TEXT,
  -- open: can still take money (R-06). The others are final answers.
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN (
      'open', 'paid', 'needs_refund', 'finally_unpaid', 'closed_unknown', 'void'
    )
  ),
  -- The last Midtrans transaction_status seen (a status word, nothing more).
  last_status TEXT,
  payment_method TEXT,
  -- As received from Midtrans, for example '99000.00' and 'IDR' (R-09).
  amount TEXT,
  currency TEXT,
  refund_state TEXT NOT NULL DEFAULT 'none' CHECK (
    refund_state IN (
      'none', 'needs_refund', 'refunded', 'partial_refund', 'chargeback'
    )
  ),
  -- The last time Nuave asked Midtrans Get Status for this attempt: the
  -- 30-second limit and the cron schedule of R-14.
  last_checked_at TEXT,
  -- When it stopped being open.
  final_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_midtrans_order
  ON payment_attempts(midtrans_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_order_number
  ON payment_attempts(order_id, attempt_number);
-- The cap check counts open attempts of every order (R-10); reconciliation
-- walks open attempts by the end of their window (R-14).
CREATE INDEX IF NOT EXISTS payment_attempts_status
  ON payment_attempts(status, window_end);

-- ------------------------------------------------------ payment transactions --
-- R-04/R-12/R-15. One row per Midtrans transaction_id seen for an attempt (one
-- Snap order_id can have several tries), with its own status and refund state.
CREATE TABLE IF NOT EXISTS payment_transactions (
  transaction_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  -- The last Midtrans transaction_status and fraud_status seen.
  midtrans_status TEXT NOT NULL,
  fraud_status TEXT,
  payment_method TEXT,
  amount TEXT,
  currency TEXT,
  -- What Nuave did with it: pending (not settled), paid (R-11, it paid the
  -- order), needs_refund (R-12, settled but not applied), not_settled (a final
  -- deny, cancel, expire or failure).
  outcome TEXT NOT NULL DEFAULT 'pending' CHECK (
    outcome IN ('pending', 'paid', 'needs_refund', 'not_settled')
  ),
  -- Refund state per transaction (R-15). A full refund closes a needs_refund
  -- case; for the paying transaction it also ends or records on the order.
  refund_state TEXT NOT NULL DEFAULT 'none' CHECK (
    refund_state IN ('none', 'refunded', 'partial_refund', 'chargeback')
  ),
  refunded_at TEXT,
  -- Where the refund was learned from: the Midtrans notification or Get Status
  -- ('midtrans'), or the founder's support command ('support').
  refund_source TEXT CHECK (refund_source IN ('midtrans', 'support')),
  first_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS payment_transactions_attempt
  ON payment_transactions(attempt_id);

-- ------------------------------------------------------- founder notices ----
-- R-21. Daily kinds use the UTC day as `subject`; kinds about one order or
-- transaction use a stable key (the order number, the Midtrans order_id or the
-- transaction_id, never the internal order ID), so they are never repeated on a
-- later day. The unique key makes a notice exist once; it is claimed before it
-- is sent, so overlapping cron runs never send it twice.
CREATE TABLE IF NOT EXISTS founder_notices (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  -- Facts the email needs (levels, amount, method, order number). Never a
  -- card, bank or wallet detail, a key, or the internal order ID.
  detail_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'claimed', 'sent')
  ),
  claim_owner TEXT,
  claim_until TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS founder_notices_key
  ON founder_notices(kind, subject);
CREATE INDEX IF NOT EXISTS founder_notices_status ON founder_notices(status);

-- ---------------------------------------------------- payment-received sends --
-- R-22. Its own table instead of rebuilding the `order_emails.kind` check (a
-- table rebuild is risky on a live database). Same shape as order_emails: one
-- row per send attempt, each with its own idempotency key.
CREATE TABLE IF NOT EXISTS payment_emails (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('accepted', 'failed')),
  provider_message_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS payment_emails_order ON payment_emails(order_id);
