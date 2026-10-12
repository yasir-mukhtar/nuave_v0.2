-- Migration 4: fair rotation between orders (spec 016 R-15). The time each
-- order last had an audit step claimed, so a cron run that handles only a few
-- orders takes the longest-waiting ones first. Nullable: an order never
-- stepped sorts first. Nothing the old worker uses changes.

ALTER TABLE orders ADD COLUMN last_step_at TEXT;
