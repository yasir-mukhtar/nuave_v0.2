-- Spec 021 B-08 (go-live of 2026-10-28): the pages Firecrawl read for a live
-- two-source order (src/lib/orders/pages.ts). Public business pages only,
-- with phone numbers and email addresses removed. The page text is dropped
-- when the report is saved (only the addresses stay), and the column is
-- cleared when the order is made anonymous (src/lib/orders/retention.ts).
ALTER TABLE orders ADD COLUMN pages_json TEXT;
