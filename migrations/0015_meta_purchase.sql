-- Spec 022: the server Purchase event (Meta Conversions API).
-- meta_event_id: a random code made in the write that records the payment
-- (R-07), shared by the browser Pixel and the server so Meta counts the
-- purchase once. Cleared when the order is made anonymous (R-21).
-- meta_sent_at, meta_consent_version, meta_outcome: when the one send was
-- tried, the privacy-page version the visitor agreed under, and the outcome
-- code (R-13). Never the IP address, browser type, cookie codes or email.
ALTER TABLE orders ADD COLUMN meta_event_id TEXT;
ALTER TABLE orders ADD COLUMN meta_sent_at TEXT;
ALTER TABLE orders ADD COLUMN meta_consent_version TEXT;
ALTER TABLE orders ADD COLUMN meta_outcome TEXT;
