-- Record lifetimes (privacy page section 9; founder decision 2026-10-24).
-- purged_at: when the order was made anonymous by the hourly cleanup.
-- hold_until: a support hold keeps the order past its lifetime while a
-- support case is open (`npm run support -- hold`).
ALTER TABLE orders ADD COLUMN purged_at TEXT;
ALTER TABLE orders ADD COLUMN hold_until TEXT;
