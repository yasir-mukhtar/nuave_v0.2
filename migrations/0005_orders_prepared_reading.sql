-- Migration 5: the prepared website reading, saved on the order the first time
-- it succeeds (spec 016 R-08), so a repeated request never pays for it twice.
-- Nullable: nothing the old worker uses changes.

ALTER TABLE orders ADD COLUMN prepared_json TEXT;
