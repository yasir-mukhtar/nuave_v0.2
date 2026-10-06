// Unwired decoder only. A candidate is not provider authentication, a verified
// quote or durable settlement. Null means uncertain billing, never zero cost.

export type GlmReceiptBinding = Readonly<{
  model: "glm-5.3-flash";
  ledgerRequestId: string;
}>;

export type GlmSettlementCandidate = Readonly<{
  provider: "cheaper-inference";
  model: "glm-5.3-flash";
  currency: "USD";
  provider_response_id: string;
  actual_units: number;
}>;

const MODEL = "glm-5.3-flash";
const UNITS_PER_USD = BigInt(100_000_000);
const MAX_LEDGER_UNITS = BigInt(Number.MAX_SAFE_INTEGER);
const UNIT_DECIMAL_PLACES = 8;
const NUMERIC_SOURCE = Symbol("original JSON number source");
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const DECIMAL_PATTERN = /^(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

type SourceReviver = (
  key: string,
  value: unknown,
  context?: { source?: string },
) => unknown;
type SourceAwareParse = (text: string, reviver: SourceReviver) => unknown;

function ownData(record: unknown, field: PropertyKey): unknown {
  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    return undefined;
  }
  const prototype = Object.getPrototypeOf(record);
  if (prototype !== Object.prototype && prototype !== null) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  return descriptor && Object.hasOwn(descriptor, "value")
    ? descriptor.value
    : undefined;
}

function ledgerIdentity(value: unknown): string | null {
  if (typeof value === "string") {
    return ID_PATTERN.test(value) ? value : null;
  }
  const source = ownData(value, NUMERIC_SOURCE);
  // Treat numeric ledger IDs as opaque integer text, not rounded JS numbers.
  return typeof source === "string" && /^[1-9]\d{0,127}$/.test(source)
    ? source
    : null;
}

function exactUsdUnits(source: string): bigint | null {
  const match = DECIMAL_PATTERN.exec(source);
  if (!match) return null;

  const fraction = match[2] ?? "";
  const coefficient = (match[1] + fraction).replace(/^0+/, "");
  if (!coefficient) return BigInt(0);
  const significant = coefficient.replace(/0+$/, "");
  const trailingZeros = coefficient.length - significant.length;
  const exponentText = match[3] ?? "0";
  const exponentMagnitude =
    exponentText.replace(/^[+-]/, "").replace(/^0+/, "") || "0";
  // No JS string can offset an exponent beyond its safe length range.
  if (exponentMagnitude.length > String(Number.MAX_SAFE_INTEGER).length) {
    return null;
  }
  const exponent =
    BigInt(exponentMagnitude) *
    (exponentText.startsWith("-") ? BigInt(-1) : BigInt(1));
  const power =
    exponent -
    BigInt(fraction.length) +
    BigInt(trailingZeros) +
    BigInt(UNIT_DECIMAL_PLACES);
  if (
    power < BigInt(0) ||
    BigInt(significant.length) + power >
      BigInt(MAX_LEDGER_UNITS.toString().length)
  ) {
    return null;
  }
  const units = BigInt(significant) * BigInt(10) ** power;
  return units <= MAX_LEDGER_UNITS ? units : null;
}

/**
 * Decode documented settled fields using JSON.parse semantics. The caller
 * still owns response provenance, operation/quote validation and storage.
 * Numeric fields require original lexemes; unsupported runtimes fail closed.
 */
export function parseGlmSettlementCandidate(
  rawBody: string,
  binding: GlmReceiptBinding,
): GlmSettlementCandidate | null {
  try {
    const expectedModel = ownData(binding, "model");
    const expectedId = ownData(binding, "ledgerRequestId");
    if (
      typeof rawBody !== "string" ||
      expectedModel !== MODEL ||
      typeof expectedId !== "string" ||
      !ID_PATTERN.test(expectedId)
    ) {
      return null;
    }

    const parseWithSource = JSON.parse as unknown as SourceAwareParse;
    const body = parseWithSource(rawBody, (key, value, context) => {
      if (
        typeof value === "number" &&
        (key === "billed_cost_usd" || key === "request_id")
      ) {
        return { [NUMERIC_SOURCE]: ownData(context, "source") };
      }
      return value;
    });
    if (ownData(body, "model") !== expectedModel) return null;

    const namespace = ownData(body, "cheaper_inference");
    const id = ledgerIdentity(ownData(namespace, "request_id"));
    if (id === null || id !== expectedId) return null;
    const billing = ownData(namespace, "billing");
    if (
      ownData(billing, "status") !== "settled" ||
      ownData(billing, "currency") !== "USD"
    ) {
      return null;
    }

    const amount = ownData(billing, "billed_cost_usd");
    const source =
      typeof amount === "string" ? amount : ownData(amount, NUMERIC_SOURCE);
    if (typeof source !== "string") return null;
    const units = exactUsdUnits(source);
    if (units === null) return null;

    const candidate: GlmSettlementCandidate = {
      provider: "cheaper-inference",
      model: MODEL,
      currency: "USD",
      provider_response_id: id,
      actual_units: Number(units),
    };
    return Object.freeze(candidate);
  } catch {
    return null;
  }
}
