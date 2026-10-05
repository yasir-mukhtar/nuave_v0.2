// S2 durable dispatch barrier SQL (parent-authored literals only).
// Reuse V2 constants, ledger schema and read-by-operation query only.
// The barrier-aware reserve, settle and dispatch statements below replace
// the unguarded V2 counterparts; no alternate bypass export exists. Nothing
// here initializes storage, sends HTTP or interprets pricing at request time.

export const UNITS_PER_USD = 100_000_000;
export const DAILY_LIMIT_UNITS = 100_000_000;
export const MAX_SAFE_UNITS = 9_007_199_254_740_991;

export const SPEND_LEDGER_SCHEMA = `
CREATE TABLE IF NOT EXISTS nuave_provider_spend (
  operation_id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'cheaper-inference')),
  stage TEXT NOT NULL CHECK (stage IN ('extract', 'questions', 'observation', 'report')),
  pricing_version TEXT NOT NULL,
  reserved_day_utc TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reservation_units INTEGER NOT NULL
    CHECK (typeof(reservation_units) = 'integer' AND reservation_units > 0
      AND reservation_units <= 9007199254740991),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'uncertain', 'settled')),
  actual_units INTEGER
    CHECK (actual_units IS NULL OR
      (typeof(actual_units) = 'integer' AND actual_units >= 0
        AND actual_units <= 9007199254740991)),
  provider_response_id TEXT,
  settled_at TEXT,
  accounted_day_utc TEXT,
  CHECK (
    (status = 'settled' AND actual_units IS NOT NULL AND settled_at IS NOT NULL
      AND accounted_day_utc IS NOT NULL
      AND typeof(accounted_day_utc) = 'text'
      AND length(accounted_day_utc) = 10
      AND date(accounted_day_utc) IS NOT NULL
      AND date(accounted_day_utc) = accounted_day_utc
      AND accounted_day_utc >= substr(settled_at, 1, 10))
    OR
    (status IN ('reserved', 'uncertain') AND actual_units IS NULL
      AND settled_at IS NULL AND provider_response_id IS NULL
      AND accounted_day_utc IS NULL)
  ),
  UNIQUE (provider, provider_response_id)
);
`;

export const DISPATCH_BARRIER_SCHEMA = `
CREATE TABLE IF NOT EXISTS nuave_provider_dispatch (
  singleton INTEGER PRIMARY KEY NOT NULL CHECK (singleton = 1),
  operation_id TEXT UNIQUE,
  CHECK (operation_id IS NULL OR
    (typeof(operation_id) = 'text' AND length(operation_id) > 0)),
  FOREIGN KEY (operation_id) REFERENCES nuave_provider_spend(operation_id)
);
`;

// Manual setup only. Never invent an idle barrier over unsettled legacy work.
export const INITIALIZE_DISPATCH_BARRIER_SQL = `
INSERT INTO nuave_provider_dispatch (singleton, operation_id)
SELECT 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM nuave_provider_spend
  WHERE status IN ('reserved', 'uncertain')
    OR (status = 'settled'
      AND (accounted_day_utc IS NULL OR actual_units > reservation_units))
)
ON CONFLICT(singleton) DO NOTHING
RETURNING *;
`;

// Original ten reserve bindings. Missing or occupied barrier fails closed.
export const RESERVE_SPEND_SQL = `
INSERT INTO nuave_provider_spend (
  operation_id, provider, stage, pricing_version, reserved_day_utc,
  created_at, reservation_units, status
)
SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, 'reserved'
WHERE ?8 <= 100000000
  AND date('now') IS NOT NULL
  AND date(?9) = ?9
  AND EXISTS (
    SELECT 1 FROM nuave_provider_dispatch
    WHERE singleton = 1 AND operation_id IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM nuave_provider_spend
    WHERE status = 'settled' AND actual_units > reservation_units
  )
  AND COALESCE((
    SELECT SUM(
      CASE WHEN status = 'settled' THEN actual_units ELSE reservation_units END
    )
    FROM nuave_provider_spend
    WHERE status IN ('reserved', 'uncertain')
      OR (status = 'settled'
        AND accounted_day_utc >= min(date('now'), ?9))
  ), 0) <= 100000000 - ?10
ON CONFLICT(operation_id) DO NOTHING
RETURNING *;
`;

export const READ_SPEND_SQL = `
SELECT * FROM nuave_provider_spend WHERE operation_id = ?;
`;

export const READ_DISPATCH_BARRIER_SQL = `
SELECT singleton, operation_id
FROM nuave_provider_dispatch WHERE singleton = 1;
`;

// Bind operationId. Only a new successful UPDATE conveys ownership.
export const ACQUIRE_DISPATCH_BARRIER_SQL = `
UPDATE nuave_provider_dispatch SET operation_id = ?1
WHERE singleton = 1 AND operation_id IS NULL
  AND EXISTS (
    SELECT 1 FROM nuave_provider_spend
    WHERE operation_id = ?1 AND status = 'reserved'
  )
  AND NOT EXISTS (
    SELECT 1 FROM nuave_provider_spend
    WHERE status = 'settled' AND actual_units > reservation_units
  )
RETURNING *;
`;

// Bind operationId. Persist possible liability before calling the provider.
// Only a new matching RETURNING row may authorize the one HTTP attempt.
export const MARK_DISPATCH_STARTED_SQL = `
UPDATE nuave_provider_spend SET status = 'uncertain'
WHERE operation_id = ?1 AND status = 'reserved'
  AND EXISTS (
    SELECT 1 FROM nuave_provider_dispatch
    WHERE singleton = 1 AND operation_id = ?1
  )
RETURNING *;
`;

// Bind actualUnits, responseId, captured ISO time, operationId.
// A provider receipt can settle only the active dispatch owner.
export const SETTLE_DISPATCH_SQL = `
UPDATE nuave_provider_spend
SET status = 'settled', actual_units = ?1, provider_response_id = ?2,
    settled_at = ?3,
    accounted_day_utc = max(date('now'), substr(?3, 1, 10))
WHERE operation_id = ?4 AND status = 'uncertain'
  AND date('now') IS NOT NULL
  AND date(substr(?3, 1, 10)) = substr(?3, 1, 10)
  AND EXISTS (
    SELECT 1 FROM nuave_provider_dispatch
    WHERE singleton = 1 AND operation_id = ?4
  )
RETURNING *;
`;

// Bind operationId. Receipt must be durably stored and within its hold.
// Failure or overrun leaves ownership intact, including across restarts.
export const RELEASE_ACCOUNTED_DISPATCH_SQL = `
UPDATE nuave_provider_dispatch SET operation_id = NULL
WHERE singleton = 1 AND operation_id = ?1
  AND EXISTS (
    SELECT 1 FROM nuave_provider_spend
    WHERE operation_id = ?1 AND status = 'settled'
      AND actual_units <= reservation_units
  )
  AND NOT EXISTS (
    SELECT 1 FROM nuave_provider_spend
    WHERE status = 'settled' AND actual_units > reservation_units
  )
RETURNING *;
`;

// Bind operationId. Called only by the newly acknowledged owner BEFORE
// MARK_DISPATCH_STARTED, with locally proven zero provider contact.
export const RELEASE_UNSTARTED_DISPATCH_SQL = `
UPDATE nuave_provider_dispatch SET operation_id = NULL
WHERE singleton = 1 AND operation_id = ?1
  AND EXISTS (
    SELECT 1 FROM nuave_provider_spend
    WHERE operation_id = ?1 AND status = 'reserved'
  )
RETURNING *;
`;
