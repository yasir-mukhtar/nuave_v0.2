-- Spec 021 Part P: the server-made report PDF. Neither table holds report
-- data, and both are deleted with the order (src/lib/orders/retention.ts).
--
-- report_pdf_days: PDFs made per report per UTC day, so one link cannot use
-- up the included Browser Run hours (P-02; at most 20 a day).
CREATE TABLE IF NOT EXISTS report_pdf_days (
  order_id TEXT NOT NULL REFERENCES orders(id),
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (order_id, day)
);

-- report_print_tokens: the single-use code Browser Run opens the report with
-- (`/r/print#<token>`), in place of the link secret, which never goes into a
-- URL Browser Run logs. Only the hash is kept; a code lasts 60 seconds and is
-- deleted when it is read.
CREATE TABLE IF NOT EXISTS report_print_tokens (
  token_hash TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS report_print_tokens_expiry
  ON report_print_tokens(expires_at);
