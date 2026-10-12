-- Migration 3: orders, their ten question results and their email sends
-- (spec 016 R-02, R-17..R-25). Only new tables: nothing the old worker uses
-- changes. Times are ISO-8601 UTC text.

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  website TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('live', 'synthetic')),
  environment TEXT NOT NULL CHECK (environment IN ('production', 'preview')),
  state TEXT NOT NULL CHECK (
    state IN ('open', 'running', 'reporting', 'delivered', 'failed', 'expired')
  ),
  created_at TEXT NOT NULL,
  -- An order still `open` after this time becomes `expired` (R-22).
  expires_at TEXT NOT NULL,
  -- Set once, when the questions are approved (R-17).
  started_at TEXT,
  deadline_at TEXT,
  -- Confirmed business details plus the ten approved questions and their
  -- original wording, unchanged after approval (R-17).
  intake_json TEXT,
  -- One runner at a time (R-18).
  lease_owner TEXT,
  lease_until TEXT,
  -- The saved report never changes (R-20). completed_at is the moment it was
  -- saved: the start of the 12-month clock (R-23).
  report_json TEXT,
  completed_at TEXT,
  report_attempts INTEGER NOT NULL DEFAULT 0,
  -- Private link: only a hash is kept (R-24).
  link_hash TEXT,
  link_expires_at TEXT,
  link_off INTEGER NOT NULL DEFAULT 0,
  ended_at TEXT,
  failure_code TEXT,
  -- 1 when the order's cost passed its hold (R-11).
  overrun INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS orders_state ON orders(state, environment, mode);

CREATE TABLE IF NOT EXISTS order_questions (
  order_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'done', 'exhausted')
  ),
  -- Counted when the question is claimed, so a call cut off mid-flight
  -- still counts as one attempt (R-19).
  attempts INTEGER NOT NULL DEFAULT 0,
  claim_owner TEXT,
  claim_until TEXT,
  next_attempt_at TEXT,
  last_failure TEXT,
  -- Telemetry of earlier failed attempts, merged into the saved result.
  attempts_json TEXT NOT NULL DEFAULT '[]',
  observation_json TEXT,
  PRIMARY KEY (order_id, prompt_id)
);

CREATE TABLE IF NOT EXISTS order_emails (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('ready', 'failure')),
  attempt INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('accepted', 'failed')),
  provider_message_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS order_emails_order ON order_emails(order_id, kind);
