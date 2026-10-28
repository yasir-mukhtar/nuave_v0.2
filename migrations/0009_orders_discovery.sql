-- Migration 9 (Spec 018 R-07): the search pool discovery built for an order,
-- how many times discovery ran (at most twice), the inputs it ran on, and the
-- ten questions the writer returned with their server-owned origins. Nullable
-- or defaulted: nothing the old worker uses changes.

ALTER TABLE orders ADD COLUMN discovery_json TEXT;
ALTER TABLE orders ADD COLUMN discovery_key TEXT;
ALTER TABLE orders ADD COLUMN discovery_runs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN questions_json TEXT;
