-- Migration 8 (spec 017 S4c): when Get Status last answered for a transaction.
-- The final answer (R-06) needs every known transaction asked after the wait; a
-- run's meter (R-23) may allow only some of them, so the check builds up over
-- several runs and decides from the stored statuses once all were asked.
ALTER TABLE payment_transactions ADD COLUMN checked_at TEXT;
