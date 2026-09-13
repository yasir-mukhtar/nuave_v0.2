import { describe, expect, it } from "vitest";
import fixture from "./fixtures/g2-evaluation-inputs.json";
import { measurementSlotForId } from "./measurement-matrix";
import { checkV3Candidate, checkV3Text } from "./question-finalize-v3";
import {
  parseV3RichResponse,
  checkV3ProviderSchemaCompatibility,
  V3_RICH_RESPONSE_JSON_SCHEMA,
  V3_SIMPLE_RESPONSE_JSON_SCHEMA,
  buildV3ProviderBody,
  buildV3WriterRequest,
} from "./question-writer-v3";
import { parseQuestionFactsV3 } from "./question-facts-v3";
import {
  assessG2AbsoluteResources,
  attemptUsable,
  businessWins,
  compareMatchedAttempt,
  evaluateG2HeldOutRetention,
  evaluateG2Pilot,
  g2EnvelopeFingerprint,
  g2ExecutionEvidenceDecision,
  G2_FROZEN_INPUT_MANIFEST,
  G2_HELD_OUT_SCHEDULE,
  G2_PILOT_INPUTS,
  G2_PILOT_SCHEDULE,
  G2_RELEASE_INPUTS,
  G2_RELEASE_SCHEDULES,
  G2_RESOURCE_LIMITS,
  G2_RUBRIC_RULES,
  G2_THRESHOLDS,
  G2_UNNAMED_PROPERTY_JUDGMENTS,
  G2_USAGE_ACCOUNTING,
  g2UsageCostUsd,
  G2_USABLE_PACK,
  validateG2AttemptSchedule,
  type G2AttemptRecord,
} from "./question-eval-g2";
import {
  attemptRecord,
  attributionRecord,
  g2InputIndex,
  missingAttemptRecord,
  passingJudgments,
  projectedFacts,
  richResponseOf,
} from "./question-v3-testkit";

const FIXTURE = fixture as { inputs: Record<string, unknown> };
const INPUTS = g2InputIndex(FIXTURE.inputs);

/** Pilot attempt records that satisfy the frozen schedule. */
function pilotAttempts(
  tweak?: (a: G2AttemptRecord) => G2AttemptRecord,
): G2AttemptRecord[] {
  return G2_PILOT_SCHEDULE.attempts.map((scheduled) => {
    const isSimple = scheduled.variant === "simple";
    const record = attemptRecord(scheduled, FIXTURE.inputs, {
      texts: isSimple ? passingJudgments(undefined, 2) : passingJudgments(),
      latencyMs: isSimple ? 7_000 : 8_000,
      usage: isSimple
        ? { inputTokens: 3_500, cachedInputTokens: 0, outputTokens: 300 }
        : { inputTokens: 4_000, cachedInputTokens: 0, outputTokens: 600 },
    });
    return tweak ? tweak(record) : record;
  });
}

function passingPilot() {
  return {
    attempts: pilotAttempts(),
    preferences: G2_PILOT_INPUTS.map((input) => ({
      inputId: input.inputId,
      better: "rich" as const,
    })),
    attribution: G2_PILOT_SCHEDULE.attempts
      .filter((a) => a.variant === "rich")
      .map((a) => attributionRecord(a.inputId, a.pass)),
    inputs: INPUTS,
  };
}

/** Held-out records satisfying the frozen H schedule: rich@3 vs simple@2 →
 * delta 1.0 ≥ 0.5, all usable. */
function heldOutAttempts(
  tweak?: (a: G2AttemptRecord) => G2AttemptRecord,
): G2AttemptRecord[] {
  return G2_HELD_OUT_SCHEDULE.map((scheduled) => {
    const isSimple = scheduled.variant === "simple";
    const record = attemptRecord(scheduled, FIXTURE.inputs, {
      texts: isSimple ? passingJudgments(undefined, 2) : passingJudgments(),
      latencyMs: isSimple ? 7_000 : 8_000,
    });
    return tweak ? tweak(record) : record;
  });
}

function passingHeldOut() {
  return { attempts: heldOutAttempts(), inputs: INPUTS };
}

describe("frozen packet shape", () => {
  it("freezes the §8.1 pilot set: four businesses + AC repeat, ≤10 calls", () => {
    expect(G2_PILOT_INPUTS).toHaveLength(4);
    expect(
      G2_PILOT_INPUTS.filter((i) => i.scheduledRepeat).map((i) => i.inputId),
    ).toEqual(["G2P-AC"]);
    expect(G2_PILOT_SCHEDULE.attempts).toHaveLength(10);
    expect(
      G2_PILOT_SCHEDULE.attempts.filter((a) => a.variant === "rich"),
    ).toHaveLength(5);
    expect(
      G2_PILOT_SCHEDULE.attempts.filter((a) => a.variant === "simple"),
    ).toHaveLength(5);
    expect(G2_PILOT_SCHEDULE.maxPrimaryCalls).toBe(10);
  });

  it("freezes the §8.2 interleaved schedules for both approved outcomes", () => {
    expect(G2_RELEASE_INPUTS.development).toHaveLength(8);
    expect(G2_RELEASE_INPUTS.heldOut).toHaveLength(4);
    expect(G2_RELEASE_INPUTS.repeats).toEqual(["D1", "D3", "D5", "H1"]);
    const rich = G2_RELEASE_SCHEDULES.richSelected;
    expect(rich.attempts).toHaveLength(32);
    expect(rich.attempts.filter((a) => a.variant === "rich")).toHaveLength(16);
    expect(rich.attempts.filter((a) => a.variant === "v2")).toHaveLength(11);
    expect(rich.attempts.filter((a) => a.variant === "simple")).toHaveLength(5);
    const simple = G2_RELEASE_SCHEDULES.simpleSelectedByAmendment;
    expect(simple.attempts).toHaveLength(32);
    expect(simple.attempts.filter((a) => a.variant === "simple")).toHaveLength(
      16,
    );
    expect(simple.attempts.filter((a) => a.variant === "v2")).toHaveLength(16);
    expect(G2_HELD_OUT_SCHEDULE).toHaveLength(10);
  });

  it("freezes every proposed numerical limit — no TBD values", () => {
    expect(G2_RESOURCE_LIMITS.perAttemptMaxOutputTokens).toBe(4096);
    expect(G2_RESOURCE_LIMITS.perAttemptTimeoutMs).toBe(60_000);
    expect(G2_RESOURCE_LIMITS.automaticRetries).toBe(0);
    expect(G2_RESOURCE_LIMITS.richVsSimpleMaxCostRatio).toBe(2.0);
    expect(G2_RESOURCE_LIMITS.richVsSimpleMaxLatencyRatio).toBe(1.5);
    expect(G2_THRESHOLDS.materialWinDeltaMin).toBe(0.5);
    expect(G2_THRESHOLDS.heldOutMaterialWinBusinessesMin).toBe(2);
    expect(G2_USABLE_PACK.distinctDecisionsMin).toBe(6);
    // The dated rate source is the official OpenCode Go usage table, not an
    // assumed blended price.
    expect(G2_USAGE_ACCOUNTING.observedAt).toBe("2026-09-13");
    expect(G2_USAGE_ACCOUNTING.rateSource).toContain("opencode.ai");
    expect(G2_USAGE_ACCOUNTING.inputUsdPer1MTokens).toBe(0.2);
    expect(G2_USAGE_ACCOUNTING.outputUsdPer1MTokens).toBe(1.2);
  });
});

describe("frozen executable inputs (F4)", () => {
  it("all twelve frozen envelopes project through the G1 adapter", () => {
    for (const entry of G2_FROZEN_INPUT_MANIFEST.inputs.filter(
      (i) => i.set !== "pilot",
    )) {
      const result = parseQuestionFactsV3(FIXTURE.inputs[entry.inputId]);
      expect(result.status).toBe("projected");
    }
  });

  it("pilot inputs intentionally reuse development envelopes", () => {
    for (const pilot of G2_PILOT_INPUTS)
      expect(FIXTURE.inputs[pilot.developmentInputId]).toBeTruthy();
  });

  it("an attempt bound to a different envelope hash is rejected", () => {
    const scheduled = G2_PILOT_SCHEDULE.attempts[0];
    const record = attemptRecord(scheduled, FIXTURE.inputs, {
      inputFingerprint: g2EnvelopeFingerprint({ tampered: true }),
    });
    const errors = validateG2AttemptSchedule([scheduled], [record], INPUTS);
    expect(errors.some((e) => e.includes("envelope hash"))).toBe(true);
  });

  it("serialized writer requests stay under the frozen input bound", () => {
    for (const entry of G2_FROZEN_INPUT_MANIFEST.inputs.filter(
      (i) => i.set !== "pilot",
    )) {
      const projected = parseQuestionFactsV3(FIXTURE.inputs[entry.inputId]);
      expect(projected.status).toBe("projected");
      if (projected.status !== "projected") continue;
      const body = buildV3ProviderBody(
        buildV3WriterRequest(projected.facts, "rich"),
      );
      expect(JSON.stringify(body).length).toBeLessThanOrEqual(
        G2_RESOURCE_LIMITS.maxSerializedRequestChars,
      );
    }
  });
});

describe("attempt/judgment validation (F2)", () => {
  it("rejects missing, duplicate, extra, and mismatched scheduled records", () => {
    const good = pilotAttempts();
    expect(
      validateG2AttemptSchedule(G2_PILOT_SCHEDULE.attempts, good, INPUTS),
    ).toEqual([]);

    const missing = good.slice(1);
    expect(
      validateG2AttemptSchedule(
        G2_PILOT_SCHEDULE.attempts,
        missing,
        INPUTS,
      ).some((e) => e.includes("missing scheduled attempt")),
    ).toBe(true);

    const duplicate = [...good, good[0]];
    expect(
      validateG2AttemptSchedule(
        G2_PILOT_SCHEDULE.attempts,
        duplicate,
        INPUTS,
      ).some((e) => e.includes("duplicate attempt record")),
    ).toBe(true);

    const extra = [
      ...good,
      attemptRecord(
        { inputId: "G2P-B2B", variant: "rich", pass: 2 },
        FIXTURE.inputs,
      ),
    ];
    expect(
      validateG2AttemptSchedule(G2_PILOT_SCHEDULE.attempts, extra, INPUTS).some(
        (e) => e.includes("extra unscheduled attempt"),
      ),
    ).toBe(true);

    const mismatched = good.map((a, i) =>
      i === 0 ? { ...a, businessKey: "wrong-business" } : a,
    );
    expect(
      validateG2AttemptSchedule(
        G2_PILOT_SCHEDULE.attempts,
        mismatched,
        INPUTS,
      ).some((e) => e.includes("businessKey")),
    ).toBe(true);
  });

  it("attemptUsable rejects ten judgments with duplicate slot IDs", () => {
    const texts = passingJudgments();
    texts[1] = { ...texts[1], slotId: texts[0].slotId };
    const record = attemptRecord(
      { inputId: "G2P-AC", variant: "rich", pass: 1 },
      FIXTURE.inputs,
      { texts },
    );
    expect(attemptUsable(record)).toBe(false);
  });

  it("unknown or out-of-bounds required judgments never pass", () => {
    const scheduled = { inputId: "G2P-AC", variant: "rich", pass: 1 } as const;
    const badScore = attemptRecord(scheduled, FIXTURE.inputs, {
      texts: passingJudgments().map((t, i) =>
        i === 0 ? { ...t, naturalness: 4 } : t,
      ),
    });
    expect(attemptUsable(badScore)).toBe(false);
    const missingFlag = attemptRecord(scheduled, FIXTURE.inputs, {
      texts: passingJudgments().map((t, i) =>
        i === 0 ? ({ ...t, commercialChoice: undefined } as never) : t,
      ),
    });
    expect(attemptUsable(missingFlag)).toBe(false);
  });

  it("a missing pack scores zero and is unusable", () => {
    const missing = missingAttemptRecord(
      { inputId: "G2P-AC", variant: "simple", pass: 1 },
      FIXTURE.inputs,
    );
    expect(attemptUsable(missing)).toBe(false);
    const pair = compareMatchedAttempt(
      attemptRecord(
        { inputId: "G2P-AC", variant: "rich", pass: 1 },
        FIXTURE.inputs,
      ),
      missing,
    );
    expect(pair.simpleUsable).toBe(false);
    expect(pair.materialWin).toBe(true); // usable rich + unusable simple
  });
});

describe("comparison rule (F1)", () => {
  it("compares unnamed texts only, per matched attempt, at the 0.5 boundary", () => {
    const rich = attemptRecord(
      { inputId: "G2P-AC", variant: "rich", pass: 1 },
      FIXTURE.inputs,
    );
    // Integer-scale boundary: simple unnamed [3,3,3,2,2,2] → mean 2.5,
    // delta exactly 0.5 → material win.
    const simpleAt = attemptRecord(
      { inputId: "G2P-AC", variant: "simple", pass: 1 },
      FIXTURE.inputs,
      {
        texts: passingJudgments().map((t, i) =>
          i < 6 ? { ...t, naturalness: i < 3 ? 3 : 2 } : t,
        ),
      },
    );
    const pair = compareMatchedAttempt(rich, simpleAt);
    expect(pair.simpleUnnamedMean).toBeCloseTo(2.5);
    expect(pair.materialWin).toBe(true);

    // simple unnamed [3,3,3,3,2,2] → mean 2.667 → delta 0.333 → no win,
    // no regression.
    const simpleBelow = attemptRecord(
      { inputId: "G2P-AC", variant: "simple", pass: 1 },
      FIXTURE.inputs,
      {
        texts: passingJudgments().map((t, i) =>
          i < 6 ? { ...t, naturalness: i < 4 ? 3 : 2 } : t,
        ),
      },
    );
    const pairBelow = compareMatchedAttempt(rich, simpleBelow);
    expect(pairBelow.delta).toBeLessThan(0.5);
    expect(pairBelow.materialWin).toBe(false);
    expect(pairBelow.regression).toBe(false);
  });

  it("named-only improvements cannot supply a rich win", () => {
    const rich = attemptRecord(
      { inputId: "G2P-AC", variant: "rich", pass: 1 },
      FIXTURE.inputs,
      {
        // Unnamed texts tie at 2 while named texts are perfect — the named
        // advantage cannot manufacture an unnamed naturalness win.
        texts: passingJudgments(undefined, 3).map((t, i) =>
          i < 6 ? { ...t, naturalness: 2 } : t,
        ),
      },
    );
    const simple = attemptRecord(
      { inputId: "G2P-AC", variant: "simple", pass: 1 },
      FIXTURE.inputs,
      { texts: passingJudgments(undefined, 2) },
    );
    const pair = compareMatchedAttempt(rich, simple);
    expect(pair.delta).toBe(0);
    expect(pair.materialWin).toBe(false);
  });

  it("a repeat regression prevents the business from counting", () => {
    const attempts = pilotAttempts();
    // AC pass 1: rich@3 wins (simple@2). AC pass 2: rich@2 regresses vs
    // simple@3 — the repeat regression voids the business's earlier win.
    for (const a of attempts) {
      if (a.inputId === "G2P-AC" && a.pass === 2)
        a.texts =
          a.variant === "simple"
            ? passingJudgments(undefined, 3)
            : passingJudgments(undefined, 2);
    }
    const result = businessWins("pilot-ac", attempts);
    expect(result.wins).toBe(false);
    expect(result.pairs).toHaveLength(2);
    expect(result.pairs[1].regression).toBe(true);
  });

  it("a complete pilot with a regressing non-winning business fails Decision A", () => {
    const pilot = passingPilot();
    for (const a of pilot.attempts) {
      if (a.inputId === "G2P-RETAIL") {
        if (a.variant === "simple") a.texts = passingJudgments(undefined, 3);
        else a.texts = passingJudgments(undefined, 2);
      }
    }
    const result = evaluateG2Pilot(pilot);
    expect(result.decisionA).toBe(false);
    expect(result.metrics.distinctPilotWins).toBe(3);
    expect(result.failures.some((f) => f.includes("regression"))).toBe(true);
  });
});

describe("positive controls", () => {
  it("passes Decision A and both Decision B components when all frozen conditions hold", () => {
    const pilot = passingPilot();
    // Give one attribution a rescue and one a reviewed material gain so both
    // Decision B components can retain.
    pilot.attribution[0].pToMRescuedSlots = 1;
    pilot.attribution[1].cOverMMaterialGains = 1;
    const result = evaluateG2Pilot(pilot);
    expect(result.failures).toEqual([]);
    expect(result.decisionA).toBe(true);
    expect(result.reservesRetained).toBe(true);
    expect(result.coverageRetained).toBe(true);
    expect(result.metrics.distinctPilotWins).toBe(4);
    expect(result.metrics.usablePacks).toBe(5);
  });

  it("retains rich on the held-out set when all scheduled records satisfy the rule", () => {
    const result = evaluateG2HeldOutRetention(passingHeldOut());
    expect(result.failures).toEqual([]);
    expect(result.retain).toBe(true);
    expect(result.metrics.heldOutBusinesses).toBe(4);
    expect(result.metrics.materialWinBusinesses).toBe(4);
  });
});

describe("§8.3 frozen counterexamples", () => {
  it("1. a rich self-rescue cannot overcome a simple tie (Decision A fails)", () => {
    const pilot = passingPilot();
    for (const a of pilot.attempts)
      if (a.variant === "simple") a.texts = passingJudgments(undefined, 3);
    for (const a of pilot.attribution) a.pToMRescuedSlots = 1;
    const result = evaluateG2Pilot(pilot);
    expect(result.metrics.pToMRescuedSlots).toBe(5);
    expect(result.decisionA).toBe(false);
    expect(result.failures.some((f) => f.includes("material wins"))).toBe(true);
  });

  it("2. metadata-only coverage earns no retention (Decision B)", () => {
    const pilot = passingPilot();
    for (const a of pilot.attribution) {
      a.pToMRescuedSlots = 1;
      a.cOverMLabelOnlyChanges = 2;
    }
    const result = evaluateG2Pilot(pilot);
    expect(result.decisionA).toBe(true);
    expect(result.reservesRetained).toBe(true); // M–P rescue supports reserves
    expect(result.coverageRetained).toBe(false); // label-only earns nothing
  });

  it("2b. C–M benefit without M–P rescue still supports reserves", () => {
    const pilot = passingPilot();
    for (const a of pilot.attribution) a.cOverMMaterialGains = 0;
    pilot.attribution[2].cOverMMaterialGains = 1;
    const result = evaluateG2Pilot(pilot);
    expect(result.reservesRetained).toBe(true);
    expect(result.coverageRetained).toBe(true);
  });

  it("2c. C–M gains on a mechanically invalid M do not count", () => {
    const pilot = passingPilot();
    pilot.attribution[0].mMechanicallyValid = false;
    pilot.attribution[0].cOverMMaterialGains = 3;
    const result = evaluateG2Pilot(pilot);
    expect(result.coverageRetained).toBe(false);
    expect(result.reservesRetained).toBe(false);
  });

  it("3. pilot wins cannot override a failed held-out comparison", () => {
    const held = passingHeldOut();
    for (const a of held.attempts)
      if (a.variant === "simple") a.texts = passingJudgments(undefined, 3);
    const result = evaluateG2HeldOutRetention(held);
    expect(result.retain).toBe(false);
    expect(result.metrics.heldOutBusinesses).toBe(4);
    expect(result.metrics.materialWinBusinesses).toBe(0);
  });

  it("4. two wins on H1 count as one business, not two", () => {
    const held = passingHeldOut();
    for (const a of held.attempts)
      if (a.variant === "simple" && a.inputId !== "H1")
        a.texts = passingJudgments(undefined, 3);
    const result = evaluateG2HeldOutRetention(held);
    expect(result.metrics.heldOutBusinesses).toBe(4);
    expect(result.metrics.materialWinBusinesses).toBe(1);
    expect(result.retain).toBe(false);
  });

  it("4b. held-out retention cannot pass with only H2/H3 records", () => {
    const held = passingHeldOut();
    held.attempts = held.attempts.filter(
      (a) => a.inputId === "H2" || a.inputId === "H3",
    );
    const result = evaluateG2HeldOutRetention(held);
    expect(result.retain).toBe(false);
    expect(
      result.failures.some((f) => f.includes("missing scheduled attempt")),
    ).toBe(true);
  });

  it("5. an equivalent direct request is not semantically penalized", () => {
    const facts = projectedFacts();
    expect(G2_RUBRIC_RULES.terminalMarkNotRequired).toContain("not required");
    expect(
      checkV3Text(
        "Bandingkan beberapa kedai kopi untuk tempat nugas.",
        measurementSlotForId("NUAVE-BRAND-COMPARISON-02")!,
        facts,
      ),
    ).toEqual([]);
    expect(
      checkV3Text(
        "Rekomendasikan kedai kopi untuk nugas",
        measurementSlotForId("NUAVE-BRAND-NEED-01")!,
        facts,
      ),
    ).toEqual([]);
    expect(
      checkV3Text(
        "Kedai kopi mana? Di mana lagi?",
        measurementSlotForId("NUAVE-BRAND-NEED-01")!,
        facts,
      ),
    ).toContain("question_form");
  });

  it("6. missing execution evidence stays executable with unknown provenance", () => {
    // Mechanically valid + missing execution evidence → executable, unknown
    // provenance. The structure is never relaxed to satisfy this.
    expect(
      g2ExecutionEvidenceDecision({
        mechanicallyValid: true,
        executionEvidencePresent: false,
      }),
    ).toEqual({ executable: true, provenance: "unknown" });
    expect(
      g2ExecutionEvidenceDecision({
        mechanicallyValid: false,
        executionEvidencePresent: false,
      }),
    ).toEqual({ executable: false, provenance: "unknown" });
    expect(
      g2ExecutionEvidenceDecision({
        mechanicallyValid: true,
        executionEvidencePresent: true,
      }),
    ).toEqual({ executable: true, provenance: "structured_response" });
  });

  it("6b. missing required provenance arrays are structural failures; explicit empty arrays are valid", () => {
    const response = richResponseOf();
    const raw = JSON.parse(JSON.stringify(response));
    delete raw.unnamed[0].primary.contextRefs;
    expect(parseV3RichResponse(raw).ok).toBe(false);

    const raw2 = JSON.parse(JSON.stringify(response));
    raw2.unnamed[0].primary.contextRefs = [];
    raw2.unnamed[0].primary.dimensionIds = [];
    const parsed = parseV3RichResponse(raw2);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const facts = projectedFacts();
    expect(
      checkV3Candidate(
        parsed.response.unnamed[0].primary,
        measurementSlotForId("NUAVE-BRAND-NEED-01")!,
        facts,
        parsed.response.market,
      ),
    ).toEqual([]);
  });
});

describe("resource accounting (F3)", () => {
  it("computes usage-allowance cost from the dated rates", () => {
    expect(
      g2UsageCostUsd({
        inputTokens: 12_000,
        cachedInputTokens: 0,
        outputTokens: 4_096,
      }),
    ).toBeCloseTo(0.0073, 3);
  });

  it("fails on missing telemetry, over-limit tokens, latency, and totals", () => {
    const base = pilotAttempts();
    const missingUsage = base.map((a, i) =>
      i === 0 ? { ...a, usage: null } : a,
    );
    expect(
      assessG2AbsoluteResources(missingUsage, 1).failures.some((f) =>
        f.includes("token telemetry"),
      ),
    ).toBe(true);

    const overTokens = base.map((a, i) =>
      i === 0
        ? {
            ...a,
            usage: { ...a.usage!, outputTokens: 5000 },
          }
        : a,
    );
    expect(
      assessG2AbsoluteResources(overTokens, 1).failures.some((f) =>
        f.includes("output tokens"),
      ),
    ).toBe(true);

    const timeout = base.map((a, i) =>
      i === 0 ? { ...a, latencyMs: 61_000 } : a,
    );
    const res = assessG2AbsoluteResources(timeout, 1);
    expect(res.failures.some((f) => f.includes("timeout ceiling"))).toBe(true);
    // The failed/timeout attempt still counts in latency statistics.
    expect(res.metrics.p95LatencyMs).toBe(61_000);

    const tiny = assessG2AbsoluteResources(base, 0.0001);
    expect(tiny.failures.some((f) => f.includes("aggregate ceiling"))).toBe(
      true,
    );
  });

  it("a transport-failed attempt still owes telemetry — unknown cannot pass", () => {
    const attempts = pilotAttempts();
    attempts[0] = {
      ...attempts[0],
      status: "generation_temporarily_unavailable",
      texts: null,
      latencyMs: null,
      usage: null,
    };
    const res = assessG2AbsoluteResources(attempts, 10);
    expect(res.failures.some((f) => f.includes("latency telemetry"))).toBe(
      true,
    );
    expect(res.failures.some((f) => f.includes("token telemetry"))).toBe(true);
  });

  it("incremental bounds compare matched rich/simple means", () => {
    const pilot = passingPilot();
    for (const a of pilot.attempts)
      if (a.variant === "rich") a.latencyMs = 14_000; // 2× simple mean
    const result = evaluateG2Pilot(pilot);
    expect(
      result.failures.some((f) => f.includes("1.5") || f.includes("latency")),
    ).toBe(true);
    expect(result.decisionA).toBe(false);
  });
});

describe("provider schema compatibility (F5)", () => {
  it("both frozen response schemas satisfy the strict-shape check", () => {
    expect(
      checkV3ProviderSchemaCompatibility(V3_RICH_RESPONSE_JSON_SCHEMA),
    ).toEqual([]);
    expect(
      checkV3ProviderSchemaCompatibility(V3_SIMPLE_RESPONSE_JSON_SCHEMA),
    ).toEqual([]);
  });

  it("the check flags missing required coverage and unresolvable refs", () => {
    const broken = {
      type: "object",
      properties: { a: { type: "string" }, b: { $ref: "#/$defs/missing" } },
      required: ["a"],
      additionalProperties: false,
    };
    const issues = checkV3ProviderSchemaCompatibility(broken);
    expect(issues.some((i) => i.includes("required"))).toBe(true);
    expect(issues.some((i) => i.includes("unresolvable"))).toBe(true);
  });
});

describe("release schedule integrity (F4)", () => {
  it("release records reconcile exactly — extras and omissions are rejected", () => {
    const schedule = G2_RELEASE_SCHEDULES.richSelected.attempts;
    const records = schedule.map((s) =>
      attemptRecord(s, FIXTURE.inputs, {
        texts:
          s.variant === "simple"
            ? passingJudgments(undefined, 2)
            : passingJudgments(),
      }),
    );
    expect(validateG2AttemptSchedule(schedule, records, INPUTS)).toEqual([]);
    // A duplicate D1 rich record is rejected.
    const dup = [...records, { ...records[0] }];
    expect(
      validateG2AttemptSchedule(schedule, dup, INPUTS).some((e) =>
        e.includes("duplicate"),
      ),
    ).toBe(true);
  });
});

describe("rubric completeness (F2)", () => {
  it("freezes the six §2.1 property judgments for every unnamed text", () => {
    expect(G2_UNNAMED_PROPERTY_JUDGMENTS).toEqual([
      "commercialChoice",
      "entityDemand",
      "roleScopeFit",
      "fairOpenness",
      "singleUnderstandableRequest",
      "criteriaDiscipline",
    ]);
    // The implicit-opportunity condition keeps its no-explicit-formula
    // qualification.
    expect(G2_RUBRIC_RULES.implicitOpportunity).toContain(
      "without needing an explicit recommendation formula",
    );
  });
});
