import { describe, expect, it } from "vitest";
import { measurementSlotForId } from "./measurement-matrix";
import { checkV3Candidate, checkV3Text } from "./question-finalize-v3";
import { parseV3RichResponse } from "./question-writer-v3";
import {
  evaluateG2HeldOutRetention,
  evaluateG2Pilot,
  G2_PILOT_INPUTS,
  G2_PILOT_SCHEDULE,
  G2_RELEASE_ALLOCATION,
  G2_RELEASE_INPUTS,
  G2_RESOURCE_LIMITS,
  G2_RUBRIC_RULES,
  G2_THRESHOLDS,
  G2_USABLE_PACK,
  type G2AttemptRecord,
} from "./question-eval-g2";
import { projectedFacts, richResponseOf } from "./question-v3-testkit";

const ALL_SLOT_IDS = [
  "NUAVE-BRAND-NEED-01",
  "NUAVE-BRAND-NEED-02",
  "NUAVE-BRAND-SOLUTION-01",
  "NUAVE-BRAND-SOLUTION-02",
  "NUAVE-BRAND-COMPARISON-01",
  "NUAVE-BRAND-COMPARISON-02",
  "NUAVE-BRAND-VALIDATION-01",
  "NUAVE-BRAND-VALIDATION-02",
  "NUAVE-BRAND-ACTION-01",
  "NUAVE-BRAND-ACTION-02",
];

function textsAt(score: number) {
  return ALL_SLOT_IDS.map((slotId) => ({
    slotId,
    naturalness: score,
    standalone: true,
    adheresInput: true,
    selectedTextFlagged: false,
    modelWritten: true,
  }));
}

/** 7 texts at 3 + 3 at 2 → mean 2.7, usable. */
function texts27() {
  return textsAt(3).map((t, i) => ({ ...t, naturalness: i < 7 ? 3 : 2 }));
}

function attempt(opts: Partial<G2AttemptRecord>): G2AttemptRecord {
  return {
    inputId: "X1",
    businessKey: "biz-x1",
    set: "pilot",
    variant: "rich",
    pass: 1,
    status: "completed",
    serializationComplete: true,
    fullFallback: false,
    texts: textsAt(3),
    distinctUnnamedDecisions: 6,
    implicitRecommendationCount: 1,
    namedPurposeIntact: true,
    latencyMs: 1000,
    costUsd: 0.05,
    ...opts,
  };
}

/** A passing §8.1 pilot: 4 businesses × (rich@3.0, simple@2.7) plus the
 * predeclared AC repeat pair → 5 rich + 5 simple attempts. */
function passingPilot() {
  const attempts: G2AttemptRecord[] = [];
  for (const input of G2_PILOT_INPUTS) {
    attempts.push(
      attempt({
        inputId: input.inputId,
        businessKey: input.businessKey,
      }),
      attempt({
        inputId: input.inputId,
        businessKey: input.businessKey,
        variant: "simple",
        texts: texts27(),
        latencyMs: 900,
      }),
    );
    if (input.scheduledRepeat)
      attempts.push(
        attempt({
          inputId: input.inputId,
          businessKey: input.businessKey,
          pass: 2,
        }),
        attempt({
          inputId: input.inputId,
          businessKey: input.businessKey,
          variant: "simple",
          pass: 2,
          texts: texts27(),
          latencyMs: 900,
        }),
      );
  }
  return {
    attempts,
    preferences: G2_PILOT_INPUTS.map((input) => ({
      inputId: input.inputId,
      better: "rich" as const,
    })),
    attribution: G2_PILOT_INPUTS.map((input) => ({
      inputId: input.inputId,
      pToMRescuedSlots: 1,
      mCausedFinalRegression: false,
      cOverMMaterialGains: 0,
      cCausedFinalRegression: false,
    })),
    reviewedMaterialGains: { "G2P-AC": 1 } as Record<string, number>,
    observedCosts: { meanRichCostUsd: 0.05, meanSimpleCostUsd: 0.03 },
    observedLatency: { meanRichMs: 1000, meanSimpleMs: 900 },
  };
}

/** A passing §8.2 held-out set: H1–H4 each with rich@3.0 vs simple@2.7
 * (delta exactly 0.3 — the frozen material-win boundary) plus the H1 repeat. */
function passingHeldOut() {
  const attempts: G2AttemptRecord[] = [];
  for (const input of G2_RELEASE_INPUTS.heldOut) {
    attempts.push(
      attempt({
        inputId: input.inputId,
        businessKey: `biz-${input.inputId.toLowerCase()}`,
        set: "held_out",
      }),
      attempt({
        inputId: input.inputId,
        businessKey: `biz-${input.inputId.toLowerCase()}`,
        set: "held_out",
        variant: "simple",
        texts: texts27(),
        latencyMs: 900,
      }),
    );
  }
  // H1's scheduled repeat: pooled with the first pass, same business.
  attempts.push(
    attempt({
      inputId: "H1",
      businessKey: "biz-h1",
      set: "held_out",
      pass: 2,
    }),
    attempt({
      inputId: "H1",
      businessKey: "biz-h1",
      set: "held_out",
      variant: "simple",
      pass: 2,
      texts: texts27(),
      latencyMs: 900,
    }),
  );
  return {
    attempts,
    preferences: G2_RELEASE_INPUTS.heldOut.map((input) => ({
      inputId: input.inputId,
      better: "rich" as const,
    })),
    observedCosts: { meanRichCostUsd: 0.05, meanSimpleCostUsd: 0.03 },
    observedLatency: { meanRichMs: 1000, meanSimpleMs: 900 },
  };
}

describe("frozen packet shape", () => {
  it("freezes the §8.1 pilot set: four businesses + AC repeat, ≤10 calls", () => {
    expect(G2_PILOT_INPUTS).toHaveLength(4);
    expect(
      G2_PILOT_INPUTS.filter((i) => i.scheduledRepeat).map((i) => i.inputId),
    ).toEqual(["G2P-AC"]);
    expect(G2_PILOT_SCHEDULE.requestOrder).toHaveLength(10);
    expect(G2_PILOT_SCHEDULE.maxPrimaryCalls).toBe(10);
    expect(
      G2_PILOT_SCHEDULE.richAttempts + G2_PILOT_SCHEDULE.simpleAttempts,
    ).toBeLessThanOrEqual(G2_PILOT_SCHEDULE.maxPrimaryCalls);
  });

  it("freezes the §8.2 coverage and 32-call allocation for both outcomes", () => {
    expect(G2_RELEASE_INPUTS.development).toHaveLength(8);
    expect(G2_RELEASE_INPUTS.heldOut).toHaveLength(4);
    expect(G2_RELEASE_INPUTS.repeats).toEqual(["D1", "D3", "D5", "H1"]);
    expect(G2_RELEASE_ALLOCATION.richSelected.maxNewPrimaryCalls).toBe(32);
    expect(
      G2_RELEASE_ALLOCATION.simpleSelectedByAmendment.maxNewPrimaryCalls,
    ).toBe(32);
    // The frozen numbers sum: 16 v3 + 11 v2 + 5 simple = 32.
    expect(16 + 11 + 5).toBe(32);
  });

  it("freezes every proposed numerical limit — no TBD values", () => {
    expect(G2_RESOURCE_LIMITS.perAttemptMaxOutputTokens).toBe(4096);
    expect(G2_RESOURCE_LIMITS.automaticRetries).toBe(0);
    expect(G2_RESOURCE_LIMITS.richVsSimpleMaxCostRatio).toBe(2.0);
    expect(G2_RESOURCE_LIMITS.richVsSimpleMaxLatencyRatio).toBe(1.5);
    expect(G2_RESOURCE_LIMITS.pilotTotalCostCeilingUsd).toBe(2.5);
    expect(G2_RESOURCE_LIMITS.releaseNewCallsCostCeilingUsd).toBe(7.0);
    expect(G2_THRESHOLDS.materialWinDeltaMin).toBe(0.3);
    expect(G2_THRESHOLDS.heldOutMaterialWinBusinessesMin).toBe(2);
    expect(G2_USABLE_PACK.distinctDecisionsMin).toBe(6);
  });
});

describe("positive controls", () => {
  it("passes Decision A and both Decision B components when all frozen conditions hold", () => {
    const result = evaluateG2Pilot(passingPilot());
    expect(result.failures).toEqual([]);
    expect(result.decisionA).toBe(true);
    expect(result.reservesRetained).toBe(true);
    expect(result.coverageRetained).toBe(true);
    expect(result.metrics.distinctPilotWins).toBe(4);
    expect(result.metrics.usablePacks).toBe(5);
  });

  it("retains rich on the held-out set at the 0.3 material-win boundary", () => {
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
    // Rich rescues one bad primary per attribution, but final quality and
    // reliability tie simple and rich costs more.
    for (const a of pilot.attempts)
      if (a.variant === "simple") a.texts = textsAt(3);
    pilot.observedCosts = { meanRichCostUsd: 0.09, meanSimpleCostUsd: 0.03 };
    const result = evaluateG2Pilot(pilot);
    expect(result.metrics.pToMRescuedSlots).toBe(4);
    expect(result.decisionA).toBe(false);
    expect(result.failures.some((f) => f.includes("material wins"))).toBe(true);
    expect(result.failures.some((f) => f.includes("cost"))).toBe(true);
  });

  it("2. metadata-only coverage earns no retention (Decision B)", () => {
    const pilot = passingPilot();
    // M repairs a defect on every input; C only changes dimension labels on
    // mechanically valid M — zero reviewed material gains.
    pilot.reviewedMaterialGains = {};
    const result = evaluateG2Pilot(pilot);
    expect(result.decisionA).toBe(true);
    // Reserves earn support from the M–P mechanical rescue.
    expect(result.reservesRetained).toBe(true);
    // Coverage earns nothing from label-only changes.
    expect(result.coverageRetained).toBe(false);
  });

  it("3. pilot wins cannot override a failed held-out comparison", () => {
    const held = passingHeldOut();
    // Held-out comparison ties everywhere — rich fails retention.
    for (const a of held.attempts)
      if (a.variant === "simple") a.texts = textsAt(3);
    // Pilot wins and a v2 edge sit in the same attempt list but are not
    // held-out evidence.
    held.attempts.push(
      attempt({
        inputId: "G2P-AC",
        businessKey: "pilot-ac",
        set: "pilot",
      }),
      attempt({
        inputId: "G2P-AC",
        businessKey: "pilot-ac",
        set: "pilot",
        variant: "simple",
        texts: textsAt(1),
      }),
    );
    const result = evaluateG2HeldOutRetention(held);
    expect(result.retain).toBe(false);
    expect(result.metrics.heldOutBusinesses).toBe(4);
    expect(result.metrics.materialWinBusinesses).toBe(0);
  });

  it("4. two wins on H1 count as one business, not two", () => {
    const held = passingHeldOut();
    // Rich wins H1 on both scheduled attempts; the other three pairs tie.
    for (const a of held.attempts)
      if (a.variant === "simple" && a.inputId !== "H1") a.texts = textsAt(3);
    const result = evaluateG2HeldOutRetention(held);
    expect(result.metrics.heldOutBusinesses).toBe(4);
    expect(result.metrics.materialWinBusinesses).toBe(1);
    expect(result.retain).toBe(false);
    expect(
      result.failures.some((f) => f.includes("held-out material wins")),
    ).toBe(true);
  });

  it("5. an equivalent direct request is not semantically penalized", () => {
    const facts = projectedFacts();
    // Rubric rule is frozen in the packet…
    expect(G2_RUBRIC_RULES.terminalMarkNotRequired).toContain("not required");
    // …and the compatible-008 form check accepts direct requests and
    // non-question punctuation.
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
    // A runaway multi-question text still fails the form check.
    expect(
      checkV3Text(
        "Kedai kopi mana? Di mana lagi?",
        measurementSlotForId("NUAVE-BRAND-NEED-01")!,
        facts,
      ),
    ).toContain("question_form");
  });

  it("6. missing provenance cannot reject otherwise mechanically valid text", () => {
    const facts = projectedFacts();
    const response = richResponseOf();
    const raw = JSON.parse(JSON.stringify(response));
    delete raw.unnamed[0].primary.contextRefs;
    delete raw.unnamed[0].primary.dimensionIds;
    const parsed = parseV3RichResponse(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const candidate = parsed.response.unnamed[0].primary;
    expect(
      checkV3Candidate(
        candidate,
        measurementSlotForId("NUAVE-BRAND-NEED-01")!,
        facts,
        parsed.response.market,
      ),
    ).toEqual([]);
    // Provenance absence is recorded, not punished: the candidate keeps its
    // normal selection eligibility.
    expect(candidate.contextRefs).toEqual([]);
    expect(candidate.dimensionIds).toEqual([]);
  });
});

describe("threshold boundaries", () => {
  it("a held-out material-win delta of exactly 0.3 counts; 0.2 does not", () => {
    const at = evaluateG2HeldOutRetention(passingHeldOut());
    expect(at.retain).toBe(true);
    const below = passingHeldOut();
    for (const a of below.attempts)
      if (a.variant === "simple")
        a.texts = textsAt(3).map((t, i) => ({
          ...t,
          naturalness: i < 8 ? 3 : 2,
        }));
    const res = evaluateG2HeldOutRetention(below);
    expect(res.retain).toBe(false);
    expect(res.metrics.materialWinBusinesses).toBe(0);
  });

  it("one pair-level regression fails retention even with two wins", () => {
    const held = passingHeldOut();
    // H4 regresses: simple beats rich.
    for (const a of held.attempts)
      if (a.variant === "simple" && a.inputId === "H4") a.texts = textsAt(3);
      else if (a.variant === "rich" && a.inputId === "H4") a.texts = textsAt(2);
    const result = evaluateG2HeldOutRetention(held);
    expect(result.metrics.materialWinBusinesses).toBe(3);
    expect(result.metrics.pairRegressions).toBe(1);
    expect(result.retain).toBe(false);
  });

  it("fewer than five complete serializations or usable packs fails Decision A", () => {
    const pilot = passingPilot();
    const repeat = pilot.attempts.find(
      (a) => a.variant === "rich" && a.pass === 2,
    )!;
    repeat.serializationComplete = false;
    const result = evaluateG2Pilot(pilot);
    expect(result.decisionA).toBe(false);
    expect(result.failures.some((f) => f.includes("serialization"))).toBe(true);
  });
});
