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

// Anything crossing the storage boundary must be a plain JSON-shaped record:
// a non-null, non-array object whose prototype is Object.prototype or null.
// Required fields must exist as OWN DATA properties — they are captured once
// through property descriptors, so accessor fields are rejected without
// invoking their getters and no live field can change under validation
// (class instances, inherited fields and accessor rows are all refused).
// Proxy traps that throw surface as sanitized unavailability.
const captureOwnDataFields = (
  record: unknown,
  fields: ReadonlyArray<string>,
): Record<string, unknown> => {
  try {
    if (
      typeof record !== "object" ||
      record === null ||
      Array.isArray(record)
    ) {
      throw new ProviderDispatchBarrierUnavailableError();
    }
    const prototype = Object.getPrototypeOf(record);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ProviderDispatchBarrierUnavailableError();
    }
    const captured: Record<string, unknown> = {};
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(record, field);
      if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) {
        throw new ProviderDispatchBarrierUnavailableError();
      }
      captured[field] = descriptor.value;
    }
    return captured;
  } catch (error) {
    if (error instanceof ProviderDispatchBarrierUnavailableError) {
      throw error;
    }
    throw new ProviderDispatchBarrierUnavailableError();
  }
};

// A barrier row must carry own data singleton strictly equal to the number 1
// and own data `operation_id` that is either null or a valid id. No coercion.
const parseBarrierRow = (
  row: unknown,
): { singleton: 1; operation_id: string | null } => {
  const captured = captureOwnDataFields(row, ["singleton", "operation_id"]);
  if (captured.singleton !== 1) {
    throw new ProviderDispatchBarrierUnavailableError();
  }
  const owner = captured.operation_id;
  if (owner !== null && !isValidOperationId(owner)) {
    throw new ProviderDispatchBarrierUnavailableError();
  }
  return { singleton: 1, operation_id: owner };
};

export class ProviderDispatchBarrier {
  private readonly database: DispatchBarrierDatabase;

  // No SQL runs in the constructor.
  constructor(database: DispatchBarrierDatabase) {
    this.database = database;
  }

  async read(): Promise<{ singleton: 1; operation_id: string | null }> {
    const results = await this.execute(READ_DISPATCH_BARRIER_SQL, []);
    try {
      if (results.length !== 1) {
        throw new ProviderDispatchBarrierUnavailableError();
      }
      return parseBarrierRow(results[0]);
    } catch (error) {
      if (error instanceof ProviderDispatchBarrierUnavailableError) {
        throw error;
      }
      throw new ProviderDispatchBarrierUnavailableError();
    }
  }

  async acquire(operationId: string): Promise<boolean> {
    assertValidOperationId(operationId);
    const results = await this.execute(ACQUIRE_DISPATCH_BARRIER_SQL, [
      operationId,
    ]);
    return this.finishMutation(results, (owner) => owner === operationId);
  }

  async releaseAccounted(operationId: string): Promise<boolean> {
    assertValidOperationId(operationId);
    const results = await this.execute(RELEASE_ACCOUNTED_DISPATCH_SQL, [
      operationId,
    ]);
    return this.finishMutation(results, (owner) => owner === null);
  }

  async releaseUnstarted(operationId: string): Promise<boolean> {
    assertValidOperationId(operationId);
    const results = await this.execute(RELEASE_UNSTARTED_DISPATCH_SQL, [
      operationId,
    ]);
    return this.finishMutation(results, (owner) => owner === null);
  }

  private async execute(
    sql: string,
    values: ReadonlyArray<string | number | null>,
  ): Promise<unknown[]> {
    let copied: unknown[];
    try {
      const response: unknown = await this.database
        .prepare(sql)
        .bind(...values)
        .all();
      const captured = captureOwnDataFields(response, ["success", "results"]);
      if (captured.success !== true || !Array.isArray(captured.results)) {
        throw new ProviderDispatchBarrierUnavailableError();
      }
      // One copy through the array itself consumes any proxy length/index
      // traps here, inside the sanitized boundary, and yields a stable
      // ordinary array. Sparse holes survive and fail row parsing later.
      copied = Array.prototype.slice.call(captured.results);
    } catch (error) {
      if (error instanceof ProviderDispatchBarrierUnavailableError) {
        throw error;
      }
      throw new ProviderDispatchBarrierUnavailableError();
    }
    return copied;
  }

  // A mutation conveys ownership only through a NEW matching RETURNING row.
  // Zero returned rows means the durable state refused the mutation: strictly
  // re-read the singleton and report false even when the readback owner
  // matches the request — a matching readback never grants anything.
  private async finishMutation(
    results: unknown[],
    ownerMatches: (owner: string | null) => boolean,
  ): Promise<boolean> {
    try {
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
    } catch (error) {
      if (error instanceof ProviderDispatchBarrierUnavailableError) {
        throw error;
      }
      throw new ProviderDispatchBarrierUnavailableError();
    }
  }
}
