/**
 * S2 foundation: a server-owned provider spend reservation ledger.
 *
 * This module is intentionally unused by the running application. Nothing
 * outside its own test imports it, no schema is executed automatically, and
 * no production database binding, getter, fallback or in-memory store is
 * provided. Provider integration, the Cloudflare D1 binding and live
 * enforcement are pending follow-up work, so this code does not yet protect
 * any dispatch or guarantee any cap.
 *
 * Semantics:
 * - Money is integer units only (1 USD = 100_000_000 units; see
 *   ./ledger-sql.ts). There is no floating-point arithmetic, no USD
 *   conversion helper and no environment-configurable limit.
 * - The daily limit is decided inside the authored conditional INSERT, so
 *   admission is one atomic database decision. There is no read-then-write
 *   admission path, and no client-supplied day, limit or history exists.
 * - `reserved_day_utc` is the UTC day of the server clock at reservation
 *   (admission) time. It is not evidence of when, or whether, a provider
 *   call was actually dispatched.
 * - A "duplicate" reserve result only reports that the operation id already
 *   exists with identical metadata. It is never permission to dispatch a
 *   provider call a second time.
 * - settle() records the trusted actual cost reported by the future server
 *   caller. actualUnits = 0 is accepted but is only honest when that caller
 *   holds proof the call was free; an unknown cost must go through
 *   markUncertain() instead, which keeps the full reservation held.
 * - A settled cost above its reservation is stored unchanged and the
 *   authored SQL permanently closes new admission until a separately
 *   approved, restricted reconciliation path exists. This slice exposes no
 *   reset, release, expiry, retention or manual-reconciliation API.
 * - Rows carry no business facts, prompts, contact data, credentials,
 *   access secrets or provider responses — only the bounded opaque
 *   provider_response_id used for idempotent settlement.
 * - Operation ids, stage, pricing version and reservation metadata are
 *   trusted input from the future server caller. This library is not
 *   authentication and is not dispatch prevention by itself.
 */
import {
  MARK_UNCERTAIN_SPEND_SQL,
  READ_SPEND_SQL,
  RESERVE_SPEND_SQL,
  SETTLE_SPEND_SQL,
} from "./ledger-sql";

/** Providers a reservation can be recorded against. */
export type Provider = "openai" | "cheaper-inference";

/** Audit stages a reservation can be recorded against. */
export type SpendStage = "extract" | "questions" | "observation" | "report";

/** Lifecycle status of a spend reservation row. */
export type SpendStatus = "reserved" | "uncertain" | "settled";

/** One stored reservation row, as returned by the authored SQL. */
export interface SpendReservation {
  operation_id: string;
  provider: Provider;
  stage: SpendStage;
  pricing_version: string;
  /** UTC day at reservation (admission) time, not dispatch time. */
  reserved_day_utc: string;
  created_at: string;
  reservation_units: number;
  status: SpendStatus;
  actual_units: number | null;
  provider_response_id: string | null;
  settled_at: string | null;
}

/** Values a D1-compatible statement accepts. */
export type SpendLedgerBindValue = string | number | null;

/** Minimal D1-compatible result envelope. */
export interface SpendLedgerAllResult<T> {
  success: boolean;
  results: T[];
}

/**
 * Minimal D1-compatible statement surface. The ledger never calls run(),
 * first() or raw(); conditional writes use RETURNING through all().
 */
export interface SpendLedgerStatement {
  bind(...values: SpendLedgerBindValue[]): SpendLedgerStatement;
  all<T>(): Promise<SpendLedgerAllResult<T>>;
}

/**
 * Minimal D1-compatible database surface. Callers hand the ledger a real,
 * already-migrated binding; the module never creates or migrates one.
 */
export interface SpendLedgerDatabase {
  prepare(sql: string): SpendLedgerStatement;
}

/**
 * Thrown when the ledger cannot get a trustworthy answer from storage, the
 * server clock, or a returned row: thrown driver errors, missing/false-
 * success/malformed results, unexpected row counts and invalid rows all map
 * here. Driver detail is deliberately not forwarded, because it can carry
 * provider or schema text that must not cross this boundary.
 */
export class SpendLedgerUnavailableError extends Error {
  constructor(message = "provider spend ledger unavailable") {
    super(message);
    this.name = "SpendLedgerUnavailableError";
  }
}

/**
 * Thrown when a mutation conflicts with recorded truth: an operation id
 * replayed with different metadata, a settlement that disagrees with the
 * stored settlement, or a write against an operation id that does not exist.
 */
export class SpendLedgerConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpendLedgerConflictError";
  }
}

/** Input for reserve(); every field is trusted server-side metadata. */
export interface ReserveSpendInput {
  operationId: string;
  provider: Provider;
  stage: SpendStage;
  pricingVersion: string;
  /** Integer units, > 0 and <= Number.MAX_SAFE_INTEGER. */
  reservationUnits: number;
}

/** Input for settle(); actualUnits is trusted proof-based cost. */
export interface SettleSpendInput {
  operationId: string;
  /** Integer units, >= 0. 0 requires trusted free-call proof. */
  actualUnits: number;
  providerResponseId?: string | null;
}

/**
 * reserve() outcome. "reserved" means a new row was inserted under the daily
 * limit; it says nothing about whether a later dispatch should run — that is
 * the caller's decision, and "duplicate" is never such permission. "denied"
 * means the conditional insert admitted nothing.
 */
export type ReserveSpendResult =
  | { status: "reserved"; reservation: SpendReservation }
  | { status: "duplicate"; reservation: SpendReservation }
  | { status: "denied" };

const PROVIDERS: readonly Provider[] = ["openai", "cheaper-inference"];
const SPEND_STAGES: readonly SpendStage[] = [
  "extract",
  "questions",
  "observation",
  "report",
];
const SPEND_STATUSES: readonly SpendStatus[] = [
  "reserved",
  "uncertain",
  "settled",
];
const METADATA_ID_MAX_LENGTH = 128;
const PROVIDER_RESPONSE_ID_MAX_LENGTH = 256;
const UTC_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function requireBoundedId(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim().length === 0 ||
    value.length > maxLength
  ) {
    throw new TypeError(
      `${field} must be a non-blank string of at most ${maxLength} characters`,
    );
  }
  return value;
}

function requireProvider(value: unknown): Provider {
  if (typeof value !== "string" || !PROVIDERS.includes(value as Provider)) {
    throw new TypeError("provider must be one of: openai, cheaper-inference");
  }
  return value as Provider;
}

function requireSpendStage(value: unknown): SpendStage {
  if (
    typeof value !== "string" ||
    !SPEND_STAGES.includes(value as SpendStage)
  ) {
    throw new TypeError(
      "stage must be one of: extract, questions, observation, report",
    );
  }
  return value as SpendStage;
}

function requireUnits(value: unknown, field: string, minimum: number): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    throw new TypeError(
      `${field} must be a safe integer of at least ${minimum} units`,
    );
  }
  return value;
}

function requireResponseId(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return requireBoundedId(
    value,
    "providerResponseId",
    PROVIDER_RESPONSE_ID_MAX_LENGTH,
  );
}

function isRealUtcDay(value: string): boolean {
  if (!UTC_DAY_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isIsoTimestamp(value: string): boolean {
  return (
    UTC_DAY_PATTERN.test(value.slice(0, 10)) && !Number.isNaN(Date.parse(value))
  );
}

/**
 * Returns a structurally trustworthy row or throws unavailable. A malformed
 * row must never be mistaken for a cap denial or a safe read.
 */
function toSpendReservation(value: unknown): SpendReservation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SpendLedgerUnavailableError();
  }
  const row = value as Record<string, unknown>;
  const operationId = row.operation_id;
  const provider = row.provider;
  const stage = row.stage;
  const pricingVersion = row.pricing_version;
  const reservedDayUtc = row.reserved_day_utc;
  const createdAt = row.created_at;
  const reservationUnits = row.reservation_units;
  const status = row.status;
  const actualUnits = row.actual_units;
  const providerResponseId = row.provider_response_id;
  const settledAt = row.settled_at;

  const stringField = (field: unknown, maxLength: number): field is string =>
    typeof field === "string" &&
    field.length > 0 &&
    field.trim().length > 0 &&
    field.length <= maxLength;

  if (!stringField(operationId, METADATA_ID_MAX_LENGTH)) {
    throw new SpendLedgerUnavailableError();
  }
  if (
    typeof provider !== "string" ||
    !PROVIDERS.includes(provider as Provider)
  ) {
    throw new SpendLedgerUnavailableError();
  }
  if (
    typeof stage !== "string" ||
    !SPEND_STAGES.includes(stage as SpendStage)
  ) {
    throw new SpendLedgerUnavailableError();
  }
  if (!stringField(pricingVersion, METADATA_ID_MAX_LENGTH)) {
    throw new SpendLedgerUnavailableError();
  }
  if (typeof reservedDayUtc !== "string" || !isRealUtcDay(reservedDayUtc)) {
    throw new SpendLedgerUnavailableError();
  }
  if (typeof createdAt !== "string" || !isIsoTimestamp(createdAt)) {
    throw new SpendLedgerUnavailableError();
  }
  if (
    typeof reservationUnits !== "number" ||
    !Number.isSafeInteger(reservationUnits) ||
    reservationUnits <= 0
  ) {
    throw new SpendLedgerUnavailableError();
  }
  if (
    typeof status !== "string" ||
    !SPEND_STATUSES.includes(status as SpendStatus)
  ) {
    throw new SpendLedgerUnavailableError();
  }

  if (status === "settled") {
    const actualOk =
      typeof actualUnits === "number" &&
      Number.isSafeInteger(actualUnits) &&
      actualUnits >= 0;
    const settledAtOk =
      typeof settledAt === "string" && isIsoTimestamp(settledAt);
    const responseOk =
      providerResponseId === null ||
      stringField(providerResponseId, PROVIDER_RESPONSE_ID_MAX_LENGTH);
    if (!actualOk || !settledAtOk || !responseOk) {
      throw new SpendLedgerUnavailableError();
    }
  } else if (
    actualUnits !== null ||
    providerResponseId !== null ||
    settledAt !== null
  ) {
    throw new SpendLedgerUnavailableError();
  }

  return {
    operation_id: operationId,
    provider: provider as Provider,
    stage: stage as SpendStage,
    pricing_version: pricingVersion,
    reserved_day_utc: reservedDayUtc,
    created_at: createdAt,
    reservation_units: reservationUnits,
    status: status as SpendStatus,
    actual_units: actualUnits as number | null,
    provider_response_id: providerResponseId as string | null,
    settled_at: settledAt as string | null,
  };
}

/**
 * Structurally validates a returned row, then requires it to prove the
 * request it claims to answer. An inconsistent store returning a valid row
 * for another operation, lifecycle status or metadata fails closed as
 * unavailable — never as reserved, duplicate, denied or settled evidence.
 */
function expectMatchingRow(
  value: unknown,
  matches: (row: SpendReservation) => boolean,
): SpendReservation {
  const row = toSpendReservation(value);
  if (!matches(row)) {
    throw new SpendLedgerUnavailableError();
  }
  return row;
}

export class ProviderSpendLedger {
  private readonly database: SpendLedgerDatabase;
  private readonly clock: () => Date;

  /**
   * The database must already carry the authored schema; the clock is
   * server-owned and injectable only so tests can control UTC day boundaries.
   */
  constructor(
    database: SpendLedgerDatabase,
    clock: () => Date = () => new Date(),
  ) {
    if (
      typeof database !== "object" ||
      database === null ||
      typeof database.prepare !== "function"
    ) {
      throw new TypeError("database must provide prepare(sql)");
    }
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function returning a Date");
    }
    this.database = database;
    this.clock = clock;
  }

  /** One server-clock reading per call; invalid clocks fail closed. */
  private serverNow(): { iso: string; dayUtc: string } {
    let value: unknown;
    try {
      value = this.clock();
    } catch {
      throw new SpendLedgerUnavailableError();
    }
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new SpendLedgerUnavailableError();
    }
    const iso = value.toISOString();
    return { iso, dayUtc: iso.slice(0, 10) };
  }

  /**
   * Executes one authored statement. Any thrown driver error, missing or
   * false-success or malformed result maps to unavailable without leaking
   * the original error text.
   */
  private async query<T>(
    sql: string,
    params: readonly SpendLedgerBindValue[],
  ): Promise<T[]> {
    let outcome: SpendLedgerAllResult<T>;
    try {
      outcome = await this.database
        .prepare(sql)
        .bind(...params)
        .all<T>();
    } catch {
      throw new SpendLedgerUnavailableError();
    }
    if (
      outcome === null ||
      typeof outcome !== "object" ||
      outcome.success !== true ||
      !Array.isArray(outcome.results)
    ) {
      throw new SpendLedgerUnavailableError();
    }
    return outcome.results;
  }

  private async readByOperationId(
    operationId: string,
  ): Promise<SpendReservation | null> {
    const rows = await this.query<unknown>(READ_SPEND_SQL, [operationId]);
    if (rows.length > 1) {
      // The primary key guarantees one row; more means the result is not
      // trustworthy enough to classify as a denial or a duplicate.
      throw new SpendLedgerUnavailableError();
    }
    if (rows.length === 0) {
      return null;
    }
    return expectMatchingRow(
      rows[0],
      (row) => row.operation_id === operationId,
    );
  }

  /**
   * Attempts one conditional insert for the operation's reservation. The
   * authored SQL decides admission atomically; on no inserted row the stored
   * row distinguishes an identical replay (duplicate, never a second grant)
   * from a metadata conflict and from genuine cap denial.
   */
  async reserve(input: ReserveSpendInput): Promise<ReserveSpendResult> {
    const args = input as Partial<ReserveSpendInput> | null | undefined;
    const operationId = requireBoundedId(
      args?.operationId,
      "operationId",
      METADATA_ID_MAX_LENGTH,
    );
    const provider = requireProvider(args?.provider);
    const stage = requireSpendStage(args?.stage);
    const pricingVersion = requireBoundedId(
      args?.pricingVersion,
      "pricingVersion",
      METADATA_ID_MAX_LENGTH,
    );
    const reservationUnits = requireUnits(
      args?.reservationUnits,
      "reservationUnits",
      1,
    );

    const { iso, dayUtc } = this.serverNow();
    const rows = await this.query<unknown>(RESERVE_SPEND_SQL, [
      operationId,
      provider,
      stage,
      pricingVersion,
      dayUtc,
      iso,
      reservationUnits,
      reservationUnits,
      dayUtc,
      reservationUnits,
    ]);
    if (rows.length > 1) {
      throw new SpendLedgerUnavailableError();
    }
    if (rows.length === 1) {
      return {
        status: "reserved",
        reservation: expectMatchingRow(
          rows[0],
          (row) =>
            row.operation_id === operationId &&
            row.provider === provider &&
            row.stage === stage &&
            row.pricing_version === pricingVersion &&
            row.reservation_units === reservationUnits &&
            row.status === "reserved" &&
            row.reserved_day_utc === dayUtc &&
            row.created_at === iso,
        ),
      };
    }

    const existing = await this.readByOperationId(operationId);
    if (existing === null) {
      return { status: "denied" };
    }
    if (
      existing.provider === provider &&
      existing.stage === stage &&
      existing.pricing_version === pricingVersion &&
      existing.reservation_units === reservationUnits
    ) {
      // An identical replay reports the original row unchanged. The original
      // day, timestamp and status are preserved; this is never a second grant.
      return { status: "duplicate", reservation: existing };
    }
    throw new SpendLedgerConflictError(
      "provider spend operation already exists with different metadata",
    );
  }

  /** Reads one reservation by operation id; null when none exists. */
  async get(operationId: string): Promise<SpendReservation | null> {
    return this.readByOperationId(
      requireBoundedId(operationId, "operationId", METADATA_ID_MAX_LENGTH),
    );
  }

  /**
   * Records the trusted actual cost for a hold. A repeat with identical
   * actual units and response id is idempotent and keeps the first
   * settled_at; any disagreement is a conflict and never overwrites. A
   * (provider, provider_response_id) pair already used by another operation
   * fails closed on the schema's UNIQUE constraint and leaves the second
   * hold unchanged.
   */
  async settle(input: SettleSpendInput): Promise<SpendReservation> {
    const args = input as Partial<SettleSpendInput> | null | undefined;
    const operationId = requireBoundedId(
      args?.operationId,
      "operationId",
      METADATA_ID_MAX_LENGTH,
    );
    const actualUnits = requireUnits(args?.actualUnits, "actualUnits", 0);
    const providerResponseId = requireResponseId(args?.providerResponseId);

    const { iso } = this.serverNow();
    const rows = await this.query<unknown>(SETTLE_SPEND_SQL, [
      actualUnits,
      providerResponseId,
      iso,
      operationId,
    ]);
    if (rows.length > 1) {
      throw new SpendLedgerUnavailableError();
    }
    if (rows.length === 1) {
      return expectMatchingRow(
        rows[0],
        (row) =>
          row.operation_id === operationId &&
          row.status === "settled" &&
          row.actual_units === actualUnits &&
          row.provider_response_id === providerResponseId &&
          row.settled_at === iso,
      );
    }

    const existing = await this.readByOperationId(operationId);
    if (existing === null) {
      throw new SpendLedgerConflictError(
        "cannot settle an unknown spend operation",
      );
    }
    if (existing.status === "settled") {
      if (
        existing.actual_units === actualUnits &&
        existing.provider_response_id === providerResponseId
      ) {
        return existing;
      }
      throw new SpendLedgerConflictError(
        "conflicting settlement for spend operation",
      );
    }
    // The row is still updatable, yet the conditional update matched nothing.
    // An inconsistent storage state must fail closed, not silently retry.
    throw new SpendLedgerUnavailableError();
  }

  /**
   * Moves a reserved hold to uncertain while keeping its full liability.
   * An existing uncertain or settled row is returned unchanged — this never
   * reverts a settlement and never frees a hold.
   */
  async markUncertain(operationId: string): Promise<SpendReservation> {
    const id = requireBoundedId(
      operationId,
      "operationId",
      METADATA_ID_MAX_LENGTH,
    );
    const rows = await this.query<unknown>(MARK_UNCERTAIN_SPEND_SQL, [id]);
    if (rows.length > 1) {
      throw new SpendLedgerUnavailableError();
    }
    if (rows.length === 1) {
      return expectMatchingRow(
        rows[0],
        (row) => row.operation_id === id && row.status === "uncertain",
      );
    }

    const existing = await this.readByOperationId(id);
    if (existing === null) {
      throw new SpendLedgerConflictError(
        "cannot mark an unknown spend operation uncertain",
      );
    }
    if (existing.status === "uncertain" || existing.status === "settled") {
      return existing;
    }
    // A reserved row should have been updated; anything else is inconsistent.
    throw new SpendLedgerUnavailableError();
  }
}
