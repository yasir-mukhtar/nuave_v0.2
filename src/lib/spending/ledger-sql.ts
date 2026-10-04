// Pac-authored SQL and money constants for the approved unused S2 foundation.
// USD amounts enter this module as integer units, never browser cost history.
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
  CHECK (
    (status = 'settled' AND actual_units IS NOT NULL AND settled_at IS NOT NULL)
    OR
    (status IN ('reserved', 'uncertain') AND actual_units IS NULL
      AND settled_at IS NULL AND provider_response_id IS NULL)
  ),
  UNIQUE (provider, provider_response_id)
);
`;

// Bind: operationId, provider, stage, pricingVersion, UTC day, ISO time,
// reservationUnits, reservationUnits, UTC day, reservationUnits.
// A conditional insert is the admission decision, not a preceding read.
export const RESERVE_SPEND_SQL = `
INSERT INTO nuave_provider_spend (
  operation_id, provider, stage, pricing_version, reserved_day_utc,
  created_at, reservation_units, status
)
SELECT ?, ?, ?, ?, ?, ?, ?, 'reserved'
WHERE ? <= 100000000
  AND NOT EXISTS (
    SELECT 1 FROM nuave_provider_spend
    WHERE status = 'settled' AND actual_units > reservation_units
  )
  AND COALESCE((
    SELECT SUM(
      CASE WHEN status = 'settled' THEN actual_units ELSE reservation_units END
    )
    FROM nuave_provider_spend
    WHERE reserved_day_utc = ? OR status IN ('reserved', 'uncertain')
  ), 0) <= 100000000 - ?
ON CONFLICT(operation_id) DO NOTHING
RETURNING *;
`;

// Bind: operationId. Readback must never authorize a second dispatch.
export const READ_SPEND_SQL = `
SELECT * FROM nuave_provider_spend WHERE operation_id = ?;
`;

// Bind: actualUnits, providerResponseId (or null), ISO time, operationId.
// An over-reservation result is retained, not clamped; it closes admission.
export const SETTLE_SPEND_SQL = `
UPDATE nuave_provider_spend
SET status = 'settled', actual_units = ?, provider_response_id = ?, settled_at = ?
WHERE operation_id = ? AND status IN ('reserved', 'uncertain')
RETURNING *;
`;

// Bind: operationId. Uncertain and undispatched holds have no automatic expiry.
export const MARK_UNCERTAIN_SPEND_SQL = `
UPDATE nuave_provider_spend
SET status = 'uncertain'
WHERE operation_id = ? AND status = 'reserved'
RETURNING *;
`;
