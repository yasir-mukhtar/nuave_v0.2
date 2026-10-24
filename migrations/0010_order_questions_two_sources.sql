-- Migration 10 (Spec 018 R-12..R-17): each approved question is asked to the
-- ChatGPT app and to Google. The existing columns keep the ChatGPT check; the
-- g_ columns hold the Google check. A NULL g_status marks an order approved
-- before Spec 018 (one source); nothing the old worker reads changes.

ALTER TABLE order_questions ADD COLUMN g_status TEXT CHECK (
  g_status IS NULL OR g_status IN ('pending', 'done', 'exhausted')
);
ALTER TABLE order_questions ADD COLUMN g_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE order_questions ADD COLUMN g_next_attempt_at TEXT;
ALTER TABLE order_questions ADD COLUMN g_last_failure TEXT;
-- R-17: an AI Overview element without text is retried once, then "not shown".
ALTER TABLE order_questions ADD COLUMN g_empty INTEGER NOT NULL DEFAULT 0;
-- The saved Google result (AI Overview text and references only; R-28).
ALTER TABLE order_questions ADD COLUMN g_result_json TEXT;
-- R-16: the code-decided facts of the ChatGPT answer ("named", place).
ALTER TABLE order_questions ADD COLUMN c_facts_json TEXT;
