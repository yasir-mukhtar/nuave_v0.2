-- Migration 1: the S2 daily spend ledger, exactly as the old
-- create-on-first-use code made it, so a new database matches an old one.
CREATE TABLE IF NOT EXISTS provider_spend (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  stage TEXT NOT NULL,
  reserved_units INTEGER NOT NULL,
  held_units INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  settled_at TEXT
);

CREATE INDEX IF NOT EXISTS provider_spend_day ON provider_spend(day);
