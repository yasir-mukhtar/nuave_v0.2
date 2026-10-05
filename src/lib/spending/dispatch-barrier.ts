// S2 durable dispatch barrier primitive (offline-tested, no HTTP).
//
// The barrier is one `nuave_provider_dispatch` row (`singleton = 1`) shared by
// every paid transport stage. This class only reads, acquires and releases
// ownership through the parent-authored statements in `./ledger-sql`; it does
// not send HTTP, mark a dispatch start, settle cost, interpret money, cache
// ownership, run timers or leases, poll, clear stale owners or initialize
// storage. Operation ids are server-owned caller inputs, not HTTP authority.

import {
  ACQUIRE_DISPATCH_BARRIER_SQL,
  READ_DISPATCH_BARRIER_SQL,
  RELEASE_ACCOUNTED_DISPATCH_SQL,
  RELEASE_UNSTARTED_DISPATCH_SQL,
} from "./ledger-sql";

// Minimal D1-shaped database surface. The runtime binding (D1 or a test
// adapter over a real local database) must satisfy exactly this surface.
export interface DispatchBarrierStatement {
  bind(...values: Array<string | number | null>): DispatchBarrierStatement;
  all<T = unknown>(): Promise<{
    success?: boolean;
    results?: T[];
    error?: string;
  }>;
}

export interface DispatchBarrierDatabase {
  prepare(query: string): DispatchBarrierStatement;
}

// Storage unavailability is reported with one generic message so original
// driver errors, SQL text or secrets never leak through this primitive.
export class ProviderDispatchBarrierUnavailableError extends Error {
  constructor() {
    super("Provider dispatch storage is unavailable.");
    this.name = "ProviderDispatchBarrierUnavailableError";
  }
}

const INVALID_OPERATION_ID_MESSAGE =
  "Operation id must be a nonblank string of 1 to 128 characters without leading or trailing whitespace.";

const isValidOperationId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length >= 1 &&
  value.length <= 128 &&
  value.trim() === value &&
  value.trim().length > 0;

// Caller ids are validated with a generic TypeError (the id is never echoed)
// before any statement is prepared.
function assertValidOperationId(
  operationId: unknown,
): asserts operationId is string {
  if (!isValidOperationId(operationId)) {
    throw new TypeError(INVALID_OPERATION_ID_MESSAGE);
  }
}

// A barrier row must be a plain object with singleton strictly equal to the
// number 1 and an own `operation_id` that is either null or a valid id.
// No coercion: wrong types, missing fields or throwing getters are
// unavailable storage, never an idle barrier.
const parseBarrierRow = (
  row: unknown,
): { singleton: 1; operation_id: string | null } => {
  try {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new ProviderDispatchBarrierUnavailableError();
    }
    if ((row as { singleton?: unknown }).singleton !== 1) {
      throw new ProviderDispatchBarrierUnavailableError();
    }
    if (!Object.hasOwn(row, "operation_id")) {
      throw new ProviderDispatchBarrierUnavailableError();
    }
    const owner = (row as { operation_id?: unknown }).operation_id;
    if (owner !== null && !isValidOperationId(owner)) {
      throw new ProviderDispatchBarrierUnavailableError();
    }
    return { singleton: 1, operation_id: owner };
  } catch (error) {
    if (error instanceof ProviderDispatchBarrierUnavailableError) {
      throw error;
    }
    // Getter/proxy failures and any other malformed access sanitize the same.
    throw new ProviderDispatchBarrierUnavailableError();
  }
};

export class ProviderDispatchBarrier {
  private readonly database: DispatchBarrierDatabase;

  // No SQL runs in the constructor.
  constructor(database: DispatchBarrierDatabase) {
    this.database = database;
  }

  async read(): Promise<{ singleton: 1; operation_id: string | null }> {
    const results = await this.execute(READ_DISPATCH_BARRIER_SQL, []);
    if (results.length !== 1) {
      throw new ProviderDispatchBarrierUnavailableError();
    }
    return parseBarrierRow(results[0]);
  }

  async acquire(operationId: string): Promise<boolean> {
    assertValidOperationId(operationId);
    const results = await this.execute(ACQUIRE_DISPATCH_BARRIER_SQL, [
      operationId,
    ]);
    return this.finishMutation(results, (row) => row === operationId);
  }

  async releaseAccounted(operationId: string): Promise<boolean> {
    assertValidOperationId(operationId);
    const results = await this.execute(RELEASE_ACCOUNTED_DISPATCH_SQL, [
      operationId,
    ]);
    return this.finishMutation(results, (row) => row === null);
  }

  async releaseUnstarted(operationId: string): Promise<boolean> {
    assertValidOperationId(operationId);
    const results = await this.execute(RELEASE_UNSTARTED_DISPATCH_SQL, [
      operationId,
    ]);
    return this.finishMutation(results, (row) => row === null);
  }

  private async execute(
    sql: string,
    values: ReadonlyArray<string | number | null>,
  ): Promise<unknown[]> {
    try {
      const response: unknown = await this.database
        .prepare(sql)
        .bind(...values)
        .all();
      if (typeof response !== "object" || response === null) {
        throw new ProviderDispatchBarrierUnavailableError();
      }
      if (
        (response as { success?: unknown }).success !== true ||
        !Array.isArray((response as { results?: unknown }).results)
      ) {
        throw new ProviderDispatchBarrierUnavailableError();
      }
      return (response as { results: unknown[] }).results;
    } catch (error) {
      if (error instanceof ProviderDispatchBarrierUnavailableError) {
        throw error;
      }
      throw new ProviderDispatchBarrierUnavailableError();
    }
  }

  // A mutation conveys ownership only through a NEW matching RETURNING row.
  // Zero returned rows means the durable state refused the mutation: strictly
  // re-read the singleton and report false even when the readback owner
  // matches the request — a matching readback never grants anything.
  private async finishMutation(
    results: unknown[],
    ownerMatches: (owner: string | null) => boolean,
  ): Promise<boolean> {
    if (results.length === 0) {
      await this.read();
      return false;
    }
    if (results.length !== 1) {
      throw new ProviderDispatchBarrierUnavailableError();
    }
    const row = parseBarrierRow(results[0]);
    if (!ownerMatches(row.operation_id)) {
      throw new ProviderDispatchBarrierUnavailableError();
    }
    return true;
  }
}
