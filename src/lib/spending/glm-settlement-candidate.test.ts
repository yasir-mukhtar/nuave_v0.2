import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseGlmSettlementCandidate,
  type GlmReceiptBinding,
} from "./glm-settlement-candidate";

const binding: GlmReceiptBinding = {
  model: "glm-5.3-flash",
  ledgerRequestId: "4812",
};

function rawBody(amount: unknown = "0.012345", requestId: unknown = 4812) {
  return JSON.stringify({
    model: "glm-5.3-flash",
    cheaper_inference: {
      request_id: requestId,
      billing: {
        status: "settled",
        currency: "USD",
        billed_cost_usd: amount,
      },
    },
  });
}

const monetaryCases: Array<{ amount: string; expected: number | null }> = [
  { amount: "0.012345", expected: 1234500 },
  { amount: "0", expected: 0 },
  { amount: "1", expected: 100000000 },
  { amount: "2.00", expected: 200000000 },
  { amount: "0.1000000000", expected: 10000000 },
  { amount: "1e-8", expected: 1 },
  { amount: "1.2345e-2", expected: 1234500 },
  { amount: "90071992.54740991", expected: 9007199254740991 },
  { amount: "90071992.54740992", expected: null },
  { amount: "90071993", expected: null },
  { amount: "0.000000001", expected: null },
  { amount: "1e-9", expected: null },
  { amount: "1e309", expected: null },
  { amount: "1e-9999", expected: null },
  { amount: "0e99999999999999999999999999", expected: 0 },
  { amount: "-1", expected: null },
  { amount: "-0", expected: null },
  { amount: "+1", expected: null },
  { amount: " 0.1 ", expected: null },
  { amount: "0x10", expected: null },
  { amount: "NaN", expected: null },
  { amount: "Infinity", expected: null },
  { amount: "", expected: null },
  { amount: "01", expected: null },
  { amount: "1.", expected: null },
  { amount: ".1", expected: null },
];

afterEach(() => vi.restoreAllMocks());

describe("exact GLM settlement candidates (synthetic receipts only)", () => {
  for (const testCase of monetaryCases) {
    it(`decodes string amount ${JSON.stringify(testCase.amount)} without rounding`, () => {
      const result = parseGlmSettlementCandidate(
        rawBody(testCase.amount),
        binding,
      );
      if (testCase.expected === null) {
        expect(result).toBeNull();
      } else {
        expect(result).toEqual({
          provider: "cheaper-inference",
          model: "glm-5.3-flash",
          currency: "USD",
          provider_response_id: "4812",
          actual_units: testCase.expected,
        });
        expect(Object.isFrozen(result)).toBe(true);
      }
    });
  }

  for (const testCase of monetaryCases.filter((testCase) =>
    /^(0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(testCase.amount),
  )) {
    it(`uses original numeric JSON lexeme ${testCase.amount}, not a rounded Number`, () => {
      const raw = rawBody("REPLACE").replace('"REPLACE"', testCase.amount);
      const result = parseGlmSettlementCandidate(raw, binding);
      expect(result === null ? null : result.actual_units).toBe(
        testCase.expected,
      );
    });
  }

  it("does not turn numeric negative zero into a settled zero", () => {
    const raw = rawBody("REPLACE").replace('"REPLACE"', "-0");
    expect(parseGlmSettlementCandidate(raw, binding)).toBeNull();
  });

  it("preserves an opaque numeric ledger ID above JS safe integer precision", () => {
    const raw = rawBody().replace(
      '"request_id":4812',
      '"request_id":9007199254740993',
    );
    expect(
      parseGlmSettlementCandidate(raw, {
        ...binding,
        ledgerRequestId: "9007199254740993",
      }),
    ).toMatchObject({
      provider_response_id: "9007199254740993",
      actual_units: 1234500,
    });
    expect(parseGlmSettlementCandidate(raw, binding)).toBeNull();
  });

  it("rejects a fractional numeric ledger ID even if JS rounds it to an integer", () => {
    const raw = rawBody().replace(
      '"request_id":4812',
      '"request_id":4812.0000000000000001',
    );
    expect(parseGlmSettlementCandidate(raw, binding)).toBeNull();
  });

  it("binds to the namespaced ledger ID, not the model's response id", () => {
    const body = JSON.parse(rawBody());
    body.id = "4812";
    body.cheaper_inference.request_id = "another-ledger-id";
    expect(
      parseGlmSettlementCandidate(JSON.stringify(body), binding),
    ).toBeNull();
    delete body.cheaper_inference.request_id;
    expect(
      parseGlmSettlementCandidate(JSON.stringify(body), binding),
    ).toBeNull();
  });

  it("does not require usable text or token usage to preserve a settled cost", () => {
    expect(parseGlmSettlementCandidate(rawBody(), binding)?.actual_units).toBe(
      1234500,
    );
  });

  it("parsing is deterministic, not a replay or durable settlement guard", () => {
    expect(parseGlmSettlementCandidate(rawBody(), binding)).toEqual(
      parseGlmSettlementCandidate(rawBody(), binding),
    );
  });

  it("rejects nonsettled status, wrong currency/model, and mismatched identity", () => {
    for (const [field, values] of [
      ["status", ["failed", "pending", "SETTLED", null, undefined]],
      ["currency", ["IDR", "usd", null, undefined]],
    ] as const) {
      for (const value of values) {
        const body = JSON.parse(rawBody());
        body.cheaper_inference.billing[field] = value;
        expect(
          parseGlmSettlementCandidate(JSON.stringify(body), binding),
        ).toBeNull();
      }
    }
    for (const model of ["zai/glm-5.3-flash", "other-model", null, undefined]) {
      const body = JSON.parse(rawBody());
      body.model = model;
      expect(
        parseGlmSettlementCandidate(JSON.stringify(body), binding),
      ).toBeNull();
    }
    expect(
      parseGlmSettlementCandidate(rawBody("0.012345", "4813"), binding),
    ).toBeNull();
  });

  it("rejects missing or nonnumeric amounts rather than fabricating zero", () => {
    const missing = JSON.parse(rawBody());
    delete missing.cheaper_inference.billing.billed_cost_usd;
    expect(
      parseGlmSettlementCandidate(JSON.stringify(missing), binding),
    ).toBeNull();
    for (const amount of [null, false, {}, [], { source: "0" }]) {
      expect(parseGlmSettlementCandidate(rawBody(amount), binding)).toBeNull();
    }
    // JSON itself rejects nonstandard numeric tokens.
    expect(
      parseGlmSettlementCandidate(
        rawBody("REPLACE").replace('"REPLACE"', "NaN"),
        binding,
      ),
    ).toBeNull();
  });

  it("rejects malformed or incomplete envelopes", () => {
    for (const raw of [
      "",
      "{",
      "null",
      "[]",
      "42",
      "{}",
      '{"model":"glm-5.3-flash"}',
    ]) {
      expect(parseGlmSettlementCandidate(raw, binding)).toBeNull();
    }
    expect(
      parseGlmSettlementCandidate(null as unknown as string, binding),
    ).toBeNull();
  });

  it("requires plain own-data binding fields, without invoking getters", () => {
    let getterCalls = 0;
    const accessor = {
      model: "glm-5.3-flash",
      get ledgerRequestId() {
        getterCalls += 1;
        return "4812";
      },
    } as GlmReceiptBinding;
    expect(parseGlmSettlementCandidate(rawBody(), accessor)).toBeNull();
    expect(getterCalls).toBe(0);
    const inherited = Object.create(binding) as GlmReceiptBinding;
    expect(parseGlmSettlementCandidate(rawBody(), inherited)).toBeNull();
    const nullPrototype = Object.assign(
      Object.create(null),
      binding,
    ) as GlmReceiptBinding;
    expect(
      parseGlmSettlementCandidate(rawBody(), nullPrototype)?.actual_units,
    ).toBe(1234500);
  });

  it("rejects invalid caller binding rather than echoing or coercing it", () => {
    for (const value of [
      null,
      {},
      { model: "other", ledgerRequestId: "4812" },
      { model: "glm-5.3-flash", ledgerRequestId: " 4812 " },
      { model: "glm-5.3-flash", ledgerRequestId: 4812 },
      { model: "glm-5.3-flash", ledgerRequestId: "x".repeat(129) },
    ]) {
      expect(
        parseGlmSettlementCandidate(rawBody(), value as GlmReceiptBinding),
      ).toBeNull();
    }
  });

  it("returns uncertainty without inspecting a hostile thrown proxy", () => {
    let inspections = 0;
    const error = new Proxy(
      {},
      {
        getPrototypeOf() {
          inspections += 1;
          throw new Error("private synthetic detail");
        },
      },
    );
    const body = rawBody();
    const originalParse = JSON.parse;
    // Direct replacement: a vi.spyOn wrapper itself inspects thrown values.
    JSON.parse = () => {
      throw error;
    };
    try {
      expect(parseGlmSettlementCandidate(body, binding)).toBeNull();
    } finally {
      JSON.parse = originalParse;
    }
    expect(inspections).toBe(0);
  });

  it("fails numeric fields closed without reviver source, while string forms work", () => {
    const originalParse = JSON.parse;
    type LegacyReviver = (key: string, value: unknown) => unknown;
    vi.spyOn(JSON, "parse").mockImplementation((text, reviver) => {
      const legacy = reviver as unknown as LegacyReviver | undefined;
      return originalParse(
        text,
        legacy ? (key, value) => legacy(key, value) : undefined,
      );
    });
    expect(
      parseGlmSettlementCandidate(rawBody("0.012345", "4812"), binding)
        ?.actual_units,
    ).toBe(1234500);
    expect(
      parseGlmSettlementCandidate(rawBody(0.012345, "4812"), binding),
    ).toBeNull();
    expect(
      parseGlmSettlementCandidate(rawBody("0.012345", 4812), binding),
    ).toBeNull();
  });
});
