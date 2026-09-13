import { describe, expect, it } from "vitest";
import fixture from "./fixtures/g2-evaluation-inputs.json";
import { measurementSlotForId } from "./measurement-matrix";
import { checkV3Candidate, checkV3Text } from "./question-finalize-v3";
import {
  OPENCODEGO_BASE_URL,
  OPENCODEGO_SESSION_HEADER,
  OPENCODEGO_USER_AGENT,
  opencodeGoTransportHeaders,
} from "./opencodego";
import {
  parseV3RichResponse,
  checkV3ProviderSchemaCompatibility,
  V3_OPENCODEGO_TRANSPORT,
  V3_PROPOSED_EVALUATION_SETTINGS,
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
  evaluateG2Release,
  g2EnvelopeFingerprint,
  g2ExecutionEvidenceDecision,
  G2_EVALUATION_SETTINGS,
  G2_FROZEN_INPUT_MANIFEST,
  G2_HELD_OUT_SCHEDULE,
  G2_PILOT_INPUTS,
  G2_PILOT_SCHEDULE,
  G2_RELEASE_INPUTS,
  G2_RELEASE_SCHEDULES,
  G2_RESOURCE_LIMITS,
  G2_RUBRIC_RULES,
  G2_SELECTION_POLICY,
  G2_THRESHOLDS,
  G2_TRANSPORT_OWNERSHIP,
  G2_UNNAMED_PROPERTY_JUDGMENTS,
  G2_USAGE_ACCOUNTING,
  g2UsageCostUsd,
  g2UsageIsValid,
  g2TextFingerprint,
  G2_USABLE_PACK,
  G2_VERSION_PINS,
  meanAllNaturalness,
  validateG2AttemptSchedule,
  validateG2Attribution,
  validateG2FrozenInputs,
  type G2AttemptRecord,
} from "./question-eval-g2";
import {
  attemptRecord,
  attributionRecord,
  g2Hash,
  g2InputIndex,
  g2V3AttemptVersions,
  missingAttemptRecord,
  passingJudgments,
  projectedFacts,
  richResponseOf,
  V3_SIMPLE_VALID_QUESTIONS,
} from "./question-v3-testkit";

const FIXTURE = fixture as { inputs: Record<string, unknown> };
const INPUTS = g2InputIndex(FIXTURE.inputs);

const SIMPLE_USAGE = {
  inputTokens: 3_500,
  cachedReadInputTokens: 0,
  cachedWriteInputTokens: 0,
  outputTokens: 300,
} as const;
const RICH_USAGE = {
  inputTokens: 4_000,
  cachedReadInputTokens: 0,
  cachedWriteInputTokens: 0,
  outputTokens: 600,
} as const;

/** Pilot attempt records that satisfy the frozen schedule. */
function pilotAttempts(
  tweak?: (a: G2AttemptRecord) => G2AttemptRecord,
): G2AttemptRecord[] {
  return G2_PILOT_SCHEDULE.attempts.map((scheduled) => {
    const isSimple = scheduled.variant === "simple";
    const record = attemptRecord(scheduled, INPUTS, {
      naturalness: isSimple ? 2 : 3,
      latencyMs: isSimple ? 7_000 : 8_000,
      usage: isSimple ? { ...SIMPLE_USAGE } : { ...RICH_USAGE },
    });
    return tweak ? tweak(record) : record;
  });
}

function passingPilot() {
  const attempts = pilotAttempts();
  return {
    attempts,
    preferences: G2_PILOT_INPUTS.map((input) => ({
      inputId: input.inputId,
      better: "rich" as const,
    })),
    attribution: attempts
      .filter((a) => a.variant === "rich")
      .map((a) => attributionRecord(a)),
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
    const record = attemptRecord(scheduled, INPUTS, {
      naturalness: isSimple ? 2 : 3,
      latencyMs: isSimple ? 7_000 : 8_000,
    });
    return tweak ? tweak(record) : record;
  });
}

function passingHeldOut() {
  return { attempts: heldOutAttempts(), inputs: INPUTS };
}

/** Release records for one allocation: selected v3 at naturalness 3, actual
 * v2 controls at 2 — every paired input's v3 mean clears the frozen
 * non-worse rule. */
function releaseAttempts(
  allocation: keyof typeof G2_RELEASE_SCHEDULES,
  tweak?: (a: G2AttemptRecord) => G2AttemptRecord,
): G2AttemptRecord[] {
  const selectedVariant = allocation === "richSelected" ? "rich" : "simple";
  return G2_RELEASE_SCHEDULES[allocation].attempts.map((scheduled) => {
    const record = attemptRecord(scheduled, INPUTS, {
      naturalness:
        scheduled.variant === selectedVariant
          ? 3
          : scheduled.variant === "v2"
            ? 2
            : 2,
      latencyMs: scheduled.variant === "v2" ? 6_000 : 8_000,
    });
    return tweak ? tweak(record) : record;
  });
}

function releaseAttributionFor(attempts: G2AttemptRecord[]) {
  return attempts
    .filter((a) => a.variant === "rich")
    .map((a) => attributionRecord(a));
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
    expect(G2_RESOURCE_LIMITS.concurrency).toBe(1);
    expect(G2_RESOURCE_LIMITS.richVsSimpleMaxCostRatio).toBe(2.0);
    expect(G2_RESOURCE_LIMITS.richVsSimpleMaxLatencyRatio).toBe(1.5);
    expect(G2_RESOURCE_LIMITS.meanGenerationUsageCeilingUsd).toBe(
      G2_RESOURCE_LIMITS.perAttemptUsageCeilingUsd,
    );
    expect(G2_THRESHOLDS.materialWinDeltaMin).toBe(0.5);
    expect(G2_THRESHOLDS.heldOutMaterialWinBusinessesMin).toBe(2);
    expect(G2_USABLE_PACK.distinctDecisionsMin).toBe(6);
    // The dated rate source is the official OpenCode Go usage table, not an
    // assumed blended price.
    expect(G2_USAGE_ACCOUNTING.observedAt).toBe("2026-09-13");
    expect(G2_USAGE_ACCOUNTING.rateSource).toContain("opencode.ai");
    expect(G2_USAGE_ACCOUNTING.inputUsdPer1MTokens).toBe(0.2);
    expect(G2_USAGE_ACCOUNTING.cachedReadUsdPer1MTokens).toBe(0.02);
    expect(G2_USAGE_ACCOUNTING.cachedWriteUsdPer1MTokens).toBe(0.25);
    expect(G2_USAGE_ACCOUNTING.outputUsdPer1MTokens).toBe(1.2);
  });

  it("pins the changed contract identities at v3.2/v3 packets", () => {
    expect(G2_VERSION_PINS.writerContract).toContain("v3.2");
    expect(G2_VERSION_PINS.richInstruction).toContain("v3.2");
    expect(G2_VERSION_PINS.fallback).toContain("v3.2");
    expect(G2_VERSION_PINS.selector).toContain("v3.2");
    expect(G2_VERSION_PINS.frozenInputs).toBe("nuave.g2-frozen-inputs.v2");
    expect(G2_VERSION_PINS.usageAccounting).toBe(
      "nuave.g2-usage-accounting.v2",
    );
  });
});

describe("accepted transport contract (R1)", () => {
  it("the declared settings pin the accepted OpenCode Go method — not authorization_only", () => {
    const settings = G2_EVALUATION_SETTINGS;
    expect(settings.provider).toBe("opencodego");
    expect(settings.endpoint).toBe(`${OPENCODEGO_BASE_URL}/responses`);
    expect(settings.model).toBe("gpt-5.6-luna");
    expect(settings.reasoningEffort).toBe("low");
    expect(settings.store).toBe(false);
    expect(settings.verbosity).toBe("low");
    expect(settings.search).toBe(false);
    expect(settings.schemaMode).toBe("json_schema_strict");
    expect(settings.maxOutputTokens).toBe(4_096);
    expect(settings.timeoutMs).toBe(60_000);
    expect(settings.retries).toBe(0);
    expect(settings.sampling).toEqual({
      temperature: "omitted",
      topP: "omitted",
    });
    // The corrected declaration: the accepted transport emits the session
    // and user-agent headers — never "authorization_only".
    expect(settings.sessionHeaders).toBe("opencodego_transport");
    expect(G2_EVALUATION_SETTINGS).toBe(V3_PROPOSED_EVALUATION_SETTINGS);
    // The serialized body carries no sampling keys and no search tool.
    const projected = parseQuestionFactsV3(FIXTURE.inputs.D1);
    if (projected.status !== "projected") throw new Error("D1 must project");
    const body = buildV3ProviderBody(
      buildV3WriterRequest(projected.facts, "rich"),
    );
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("top_p");
    expect(body).not.toHaveProperty("tools");
    expect(body.max_output_tokens).toBe(4_096);
    expect(body.text.format.strict).toBe(true);
  });

  it("the declared transport contract matches the code-owned helper exactly", () => {
    // Offline assertion only — no provider call. The helper every accepted
    // transport uses emits a fresh random session ID plus the user agent.
    const a = opencodeGoTransportHeaders();
    const b = opencodeGoTransportHeaders();
    expect(a[OPENCODEGO_SESSION_HEADER]).toBeTruthy();
    expect(b[OPENCODEGO_SESSION_HEADER]).toBeTruthy();
    expect(a[OPENCODEGO_SESSION_HEADER]).not.toBe(b[OPENCODEGO_SESSION_HEADER]);
    expect(a["User-Agent"]).toBe(OPENCODEGO_USER_AGENT);

    expect(V3_OPENCODEGO_TRANSPORT.sessionHeader).toBe(
      OPENCODEGO_SESSION_HEADER,
    );
    expect(V3_OPENCODEGO_TRANSPORT.userAgent).toBe(OPENCODEGO_USER_AGENT);
    expect(V3_OPENCODEGO_TRANSPORT.contentType).toBe("application/json");
    expect(V3_OPENCODEGO_TRANSPORT.authorization).toMatch(/bearer/i);
    expect(V3_OPENCODEGO_TRANSPORT.sessionId).toBe("fresh_random_per_call");
    expect(V3_OPENCODEGO_TRANSPORT.headersHelper).toBe(
      "opencodeGoTransportHeaders",
    );
    // The transport-ownership prose names the same requirements so packet,
    // settings, and helper cannot drift silently.
    expect(G2_TRANSPORT_OWNERSHIP.sessionHeaders).toContain(
      OPENCODEGO_SESSION_HEADER,
    );
    expect(G2_TRANSPORT_OWNERSHIP.sessionHeaders).toContain(
      OPENCODEGO_USER_AGENT,
    );
    expect(G2_TRANSPORT_OWNERSHIP.timeout).toContain("AbortSignal");
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

  it("the committed fixture hashes exactly to the manifest's declared values", () => {
    expect(validateG2FrozenInputs(FIXTURE.inputs)).toEqual([]);
    // A drifted envelope fails the cross-check instead of silently rebinding.
    const drifted = {
      ...FIXTURE.inputs,
      D1: { ...(FIXTURE.inputs.D1 as object), tampered: true },
    };
    expect(validateG2FrozenInputs(drifted).some((e) => e.includes("D1"))).toBe(
      true,
    );
  });

  it("the v1 held-out envelopes are retired with their recorded hashes", () => {
    const retired = G2_FROZEN_INPUT_MANIFEST.retiredInputs;
    expect(retired.map((r) => r.inputId)).toEqual(["H1", "H2", "H3", "H4"]);
    // The retired hashes no longer match the committed fresh envelopes —
    // the old exposed forms cannot masquerade as current held-out inputs.
    for (const r of retired)
      expect(g2EnvelopeFingerprint(FIXTURE.inputs[r.inputId])).not.toBe(
        r.retiredEnvelopeSha256,
      );
  });

  it("pilot inputs intentionally reuse development envelopes", () => {
    for (const pilot of G2_PILOT_INPUTS)
      expect(FIXTURE.inputs[pilot.developmentInputId]).toBeTruthy();
    expect(INPUTS["G2P-AC"].envelopeSha256).toBe(INPUTS.D1.envelopeSha256);
    expect(INPUTS["G2P-AC"].factsFingerprint).toBe(INPUTS.D1.factsFingerprint);
  });

  it("an attempt bound to a different envelope hash is rejected", () => {
    const scheduled = G2_PILOT_SCHEDULE.attempts[0];
    const record = attemptRecord(scheduled, INPUTS, {
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
      attemptRecord({ inputId: "G2P-B2B", variant: "rich", pass: 2 }, INPUTS),
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

  it("an arbitrary nonempty fingerprint string never verifies (R2)", () => {
    const scheduled = G2_PILOT_SCHEDULE.attempts[0];
    const badFacts = attemptRecord(scheduled, INPUTS, {
      factsFingerprint: "arbitrary-facts-string",
    });
    expect(
      validateG2AttemptSchedule([scheduled], [badFacts], INPUTS).some((e) =>
        e.includes("factsFingerprint"),
      ),
    ).toBe(true);
    const badPack = attemptRecord(scheduled, INPUTS, {
      packFingerprint: "arbitrary-pack-string",
    });
    expect(
      validateG2AttemptSchedule([scheduled], [badPack], INPUTS).some((e) =>
        e.includes("packFingerprint"),
      ),
    ).toBe(true);
    const wrongTexts = attemptRecord(scheduled, INPUTS, {
      finalTexts: [...V3_SIMPLE_VALID_QUESTIONS],
    });
    // A judgment fingerprint that does not resolve to the captured text.
    wrongTexts.texts![0].textFingerprint = g2Hash("not the text");
    expect(
      validateG2AttemptSchedule([scheduled], [wrongTexts], INPUTS).some((e) =>
        e.includes("textFingerprint"),
      ),
    ).toBe(true);
  });

  it("a mismatched selection policy or stale version pin is rejected (R2)", () => {
    const scheduled = { inputId: "G2P-AC", variant: "rich", pass: 1 } as const;
    const wrongPolicy = attemptRecord(scheduled, INPUTS, {
      selectionPolicy: "coverage",
    });
    expect(
      validateG2AttemptSchedule([scheduled], [wrongPolicy], INPUTS).some(
        (e) => e.includes("selectionPolicy") && e.includes(G2_SELECTION_POLICY),
      ),
    ).toBe(true);

    const stale = attemptRecord(scheduled, INPUTS, {
      versions: {
        ...g2V3AttemptVersions("rich"),
        instruction: "nuave.question-writer-instruction.v3.1-rich",
      },
    });
    expect(
      validateG2AttemptSchedule([scheduled], [stale], INPUTS).some((e) =>
        e.includes("versions.instruction"),
      ),
    ).toBe(true);

    const simpleWrongPolicy = attemptRecord(
      { inputId: "G2P-AC", variant: "simple", pass: 1 },
      INPUTS,
      { selectionPolicy: "default" },
    );
    expect(
      validateG2AttemptSchedule(
        [{ inputId: "G2P-AC", variant: "simple", pass: 1 }],
        [simpleWrongPolicy],
        INPUTS,
      ).some((e) => e.includes("selectionPolicy")),
    ).toBe(true);
  });

  it("attemptUsable rejects ten judgments with duplicate slot IDs", () => {
    const texts = passingJudgments();
    texts[1] = { ...texts[1], slotId: texts[0].slotId };
    const record = attemptRecord(
      { inputId: "G2P-AC", variant: "rich", pass: 1 },
      INPUTS,
      { texts },
    );
    expect(attemptUsable(record)).toBe(false);
  });

  it("unknown or out-of-bounds required judgments never pass", () => {
    const scheduled = { inputId: "G2P-AC", variant: "rich", pass: 1 } as const;
    const badScore = attemptRecord(scheduled, INPUTS, {
      texts: passingJudgments().map((t, i) =>
        i === 0 ? { ...t, naturalness: 4 } : t,
      ),
    });
    expect(attemptUsable(badScore)).toBe(false);
    const missingFlag = attemptRecord(scheduled, INPUTS, {
      texts: passingJudgments().map((t, i) =>
        i === 0 ? ({ ...t, commercialChoice: undefined } as never) : t,
      ),
    });
    expect(attemptUsable(missingFlag)).toBe(false);
  });

  it("a missing pack scores zero and is unusable", () => {
    const missing = missingAttemptRecord(
      { inputId: "G2P-AC", variant: "simple", pass: 1 },
      INPUTS,
    );
    expect(attemptUsable(missing)).toBe(false);
    expect(meanAllNaturalness(missing)).toBe(0);
    const pair = compareMatchedAttempt(
      attemptRecord({ inputId: "G2P-AC", variant: "rich", pass: 1 }, INPUTS),
      missing,
    );
    expect(pair.simpleUsable).toBe(false);
    expect(pair.materialWin).toBe(true); // usable rich + unusable simple
  });
});

describe("P/M/C attribution reconciliation (R2)", () => {
  it("valid rows reconcile exactly to the scheduled rich attempts", () => {
    const attempts = pilotAttempts();
    const rows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) => attributionRecord(a));
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const result = validateG2Attribution(rows, expectedRich, attempts);
    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(5);
  });

  it("rejects missing, duplicate, extra, and unscheduled rows", () => {
    const attempts = pilotAttempts();
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const rows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) => attributionRecord(a));

    const missing = validateG2Attribution(
      rows.slice(1),
      expectedRich,
      attempts,
    );
    expect(missing.errors.some((e) => e.includes("missing P/M/C"))).toBe(true);

    const dup = validateG2Attribution(
      [...rows, rows[0]],
      expectedRich,
      attempts,
    );
    expect(dup.errors.some((e) => e.includes("duplicate P/M/C"))).toBe(true);

    const unscheduled = validateG2Attribution(
      [
        ...rows,
        attributionRecord(attempts[0], {
          inputId: "G2P-B2B",
          pass: 2,
        }),
      ],
      expectedRich,
      attempts,
    );
    expect(
      unscheduled.errors.some((e) => e.includes("unscheduled P/M/C")),
    ).toBe(true);
  });

  it("a nonexistent or mismatched M portfolio earns no credit", () => {
    const attempts = pilotAttempts();
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const rows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) => attributionRecord(a));
    // M must equal the attempt's recorded pack fingerprint.
    rows[0].packFingerprints.M = g2Hash("a different pack");
    const res = validateG2Attribution(rows, expectedRich, attempts);
    expect(res.errors.some((e) => e.includes("M portfolio fingerprint"))).toBe(
      true,
    );
    expect(res.valid).toHaveLength(4); // the invalid row earns nothing

    const noPackRows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) =>
        attributionRecord(a, {
          packFingerprints: { P: g2Hash("p"), M: null, C: null },
          pToMRescuedSlots: ["NUAVE-BRAND-NEED-01"],
        }),
      );
    const noPack = validateG2Attribution(noPackRows, expectedRich, attempts);
    expect(
      noPack.errors.some((e) => e.includes("without an M portfolio")),
    ).toBe(true);
  });

  it("identical final wording with only metadata changes earns nothing", () => {
    const attempts = pilotAttempts();
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const attempt = attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-AC" && a.pass === 1,
    )!;
    const sameText = attempt.finalTexts![0];
    const rows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) =>
        a === attempt
          ? attributionRecord(a, {
              cOverMMaterialGains: [
                {
                  slotId: "NUAVE-BRAND-NEED-01",
                  // Label-only: the C text fingerprint is identical to M's.
                  mTextFingerprint: g2TextFingerprint(
                    "NUAVE-BRAND-NEED-01",
                    sameText,
                  ),
                  cTextFingerprint: g2TextFingerprint(
                    "NUAVE-BRAND-NEED-01",
                    sameText,
                  ),
                  reviewRef: "review-record-1",
                },
              ],
            })
          : attributionRecord(a),
      );
    const res = validateG2Attribution(rows, expectedRich, attempts);
    expect(
      res.errors.some((e) => e.includes("identical M/C final wording")),
    ).toBe(true);
  });

  it("material gains need exact slots, distinct texts, and a review reference", () => {
    const attempts = pilotAttempts();
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const attempt = attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-AC" && a.pass === 1,
    )!;
    const rows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) =>
        a === attempt
          ? attributionRecord(a, {
              cOverMMaterialGains: [
                {
                  slotId: "NUAVE-BRAND-VALIDATION-01", // named — not creditable
                  mTextFingerprint: g2Hash("m-text"),
                  cTextFingerprint: g2Hash("c-text"),
                  reviewRef: "review-1",
                },
                {
                  slotId: "NUAVE-BRAND-SOLUTION-01",
                  mTextFingerprint: g2Hash("m-text-2"),
                  cTextFingerprint: g2Hash("c-text-2"),
                  reviewRef: "   ", // blank review reference
                },
              ],
            })
          : attributionRecord(a),
      );
    const res = validateG2Attribution(rows, expectedRich, attempts);
    expect(res.errors.some((e) => e.includes("non-unnamed slot"))).toBe(true);
    expect(
      res.errors.some((e) => e.includes("independent review reference")),
    ).toBe(true);
  });

  it("rescue claims are bound to exact unnamed slot IDs", () => {
    const attempts = pilotAttempts();
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const attempt = attempts.find((a) => a.variant === "rich")!;
    const rows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) =>
        a === attempt
          ? attributionRecord(a, {
              pToMRescuedSlots: [
                "NUAVE-BRAND-VALIDATION-01",
                "NUAVE-BRAND-NEED-01",
                "NUAVE-BRAND-NEED-01", // duplicate
              ],
            })
          : attributionRecord(a),
      );
    const res = validateG2Attribution(rows, expectedRich, attempts);
    expect(res.errors.some((e) => e.includes("rescued non-unnamed slot"))).toBe(
      true,
    );
    expect(res.errors.some((e) => e.includes("duplicates rescued slot"))).toBe(
      true,
    );
  });
});

describe("comparison rule (F1)", () => {
  it("compares unnamed texts only, per matched attempt, at the 0.5 boundary", () => {
    const rich = attemptRecord(
      { inputId: "G2P-AC", variant: "rich", pass: 1 },
      INPUTS,
    );
    // Integer-scale boundary: simple unnamed [3,3,3,2,2,2] → mean 2.5,
    // delta exactly 0.5 → material win.
    const simpleAt = attemptRecord(
      { inputId: "G2P-AC", variant: "simple", pass: 1 },
      INPUTS,
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
      INPUTS,
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
      INPUTS,
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
      INPUTS,
      { naturalness: 2 },
    );
    const pair = compareMatchedAttempt(rich, simple);
    expect(pair.delta).toBe(0);
    expect(pair.materialWin).toBe(false);
  });

  it("a repeat regression prevents the business from counting", () => {
    const attempts = pilotAttempts();
    // AC pass 1: rich@3 wins (simple@2). AC pass 2: rich@2 regresses vs
    // simple@3 — the repeat regression voids the business's earlier win.
    const adjusted = attempts.map((a) =>
      a.inputId === "G2P-AC" && a.pass === 2
        ? attemptRecord(
            { inputId: a.inputId, variant: a.variant, pass: a.pass },
            INPUTS,
            { naturalness: a.variant === "simple" ? 3 : 2 },
          )
        : a,
    );
    const result = businessWins("pilot-ac", adjusted);
    expect(result.wins).toBe(false);
    expect(result.pairs).toHaveLength(2);
    expect(result.pairs[1].regression).toBe(true);
  });

  it("a complete pilot with a regressing non-winning business fails Decision A", () => {
    const pilot = passingPilot();
    pilot.attempts = pilot.attempts.map((a) =>
      a.inputId === "G2P-RETAIL"
        ? attemptRecord(
            { inputId: a.inputId, variant: a.variant, pass: a.pass },
            INPUTS,
            { naturalness: a.variant === "simple" ? 3 : 2 },
          )
        : a,
    );
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
    const acAttempt = pilot.attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-AC" && a.pass === 1,
    )!;
    const retailAttempt = pilot.attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-RETAIL",
    )!;
    pilot.attribution = pilot.attribution.map((row) => {
      if (row.inputId === "G2P-AC" && row.pass === 1)
        return attributionRecord(acAttempt, {
          pToMRescuedSlots: ["NUAVE-BRAND-NEED-01"],
        });
      if (row.inputId === "G2P-RETAIL")
        return attributionRecord(retailAttempt, {
          cOverMMaterialGains: [
            {
              slotId: "NUAVE-BRAND-NEED-02",
              mTextFingerprint: g2Hash("m-final-wording"),
              cTextFingerprint: g2Hash("different-c-final-wording"),
              reviewRef: "independent-review-1",
            },
          ],
        });
      return row;
    });
    const result = evaluateG2Pilot(pilot);
    expect(result.failures).toEqual([]);
    expect(result.decisionA).toBe(true);
    expect(result.evidenceComplete).toBe(true);
    expect(result.retain).toBe(true);
    expect(result.reservesRetained).toBe(true);
    expect(result.coverageRetained).toBe(true);
    expect(result.metrics.distinctPilotWins).toBe(4);
    expect(result.metrics.usablePacks).toBe(5);
  });

  it("missing required evidence blocks retain even when Decision A's quality passes (R2)", () => {
    const pilot = passingPilot();
    pilot.preferences = []; // a required blinded record is absent
    pilot.attribution = []; // and the mandatory P/M/C attribution is absent
    const result = evaluateG2Pilot(pilot);
    // The quality calculation itself still passes on the records present.
    expect(result.decisionA).toBe(true);
    expect(result.evidenceComplete).toBe(false);
    // But the combined decision cannot pass — no "all gates passed" reading.
    expect(result.retain).toBe(false);
    expect(result.reservesRetained).toBe(false);
    expect(result.coverageRetained).toBe(false);
  });

  it("an invalid attribution row grants no component credit (R2)", () => {
    const pilot = passingPilot();
    // One row claims a C–M gain but its M fingerprint does not resolve to
    // the attempt's recorded pack — the row is invalid and earns nothing.
    pilot.attribution = pilot.attribution.map((row, i) =>
      i === 0
        ? {
            ...row,
            packFingerprints: { ...row.packFingerprints, M: g2Hash("other") },
            cOverMMaterialGains: [
              {
                slotId: "NUAVE-BRAND-NEED-01",
                mTextFingerprint: g2Hash("m"),
                cTextFingerprint: g2Hash("c"),
                reviewRef: "review-1",
              },
            ],
          }
        : row,
    );
    const result = evaluateG2Pilot(pilot);
    expect(result.evidenceComplete).toBe(false);
    expect(result.retain).toBe(false);
    expect(result.coverageRetained).toBe(false);
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
    pilot.attempts = pilot.attempts.map((a) =>
      a.variant === "simple"
        ? attemptRecord(
            { inputId: a.inputId, variant: "simple", pass: a.pass },
            INPUTS,
            { naturalness: 3 },
          )
        : a,
    );
    pilot.attribution = pilot.attribution.map((row) => ({
      ...row,
      pToMRescuedSlots: ["NUAVE-BRAND-NEED-01"],
    }));
    const result = evaluateG2Pilot(pilot);
    expect(result.metrics.pToMRescuedSlots).toBe(5);
    expect(result.decisionA).toBe(false);
    expect(result.failures.some((f) => f.includes("material wins"))).toBe(true);
  });

  it("2. metadata-only coverage earns no retention (Decision B)", () => {
    const pilot = passingPilot();
    pilot.attribution = pilot.attribution.map((row) => ({
      ...row,
      pToMRescuedSlots: ["NUAVE-BRAND-NEED-01"],
      cOverMLabelOnlyChanges: 2,
    }));
    const result = evaluateG2Pilot(pilot);
    expect(result.decisionA).toBe(true);
    expect(result.reservesRetained).toBe(true); // M–P rescue supports reserves
    expect(result.coverageRetained).toBe(false); // label-only earns nothing
  });

  it("2b. C–M benefit without M–P rescue still supports reserves", () => {
    const pilot = passingPilot();
    const attempt = pilot.attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-B2B",
    )!;
    pilot.attribution = pilot.attribution.map((row) =>
      row.inputId === "G2P-B2B"
        ? attributionRecord(attempt, {
            cOverMMaterialGains: [
              {
                slotId: "NUAVE-BRAND-NEED-01",
                mTextFingerprint: g2Hash("m-wording"),
                cTextFingerprint: g2Hash("c-wording"),
                reviewRef: "review-2",
              },
            ],
          })
        : row,
    );
    const result = evaluateG2Pilot(pilot);
    expect(result.reservesRetained).toBe(true);
    expect(result.coverageRetained).toBe(true);
  });

  it("2c. C–M gains on a mechanically invalid M do not count", () => {
    const pilot = passingPilot();
    const attempt = pilot.attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-AC" && a.pass === 1,
    )!;
    pilot.attribution = pilot.attribution.map((row) =>
      row.inputId === "G2P-AC" && row.pass === 1
        ? attributionRecord(attempt, {
            mMechanicallyValid: false,
            cOverMMaterialGains: [
              {
                slotId: "NUAVE-BRAND-NEED-01",
                mTextFingerprint: g2Hash("m"),
                cTextFingerprint: g2Hash("c"),
                reviewRef: "review-3",
              },
            ],
          })
        : row,
    );
    const result = evaluateG2Pilot(pilot);
    expect(result.coverageRetained).toBe(false);
    expect(result.reservesRetained).toBe(false);
  });

  it("3. pilot wins cannot override a failed held-out comparison", () => {
    const held = passingHeldOut();
    held.attempts = held.attempts.map((a) =>
      a.variant === "simple"
        ? attemptRecord(
            { inputId: a.inputId, variant: "simple", pass: a.pass },
            INPUTS,
            { naturalness: 3 },
          )
        : a,
    );
    const result = evaluateG2HeldOutRetention(held);
    expect(result.retain).toBe(false);
    expect(result.metrics.heldOutBusinesses).toBe(4);
    expect(result.metrics.materialWinBusinesses).toBe(0);
  });

  it("4. two wins on H1 count as one business, not two", () => {
    const held = passingHeldOut();
    held.attempts = held.attempts.map((a) =>
      a.variant === "simple" && a.inputId !== "H1"
        ? attemptRecord(
            { inputId: a.inputId, variant: "simple", pass: a.pass },
            INPUTS,
            { naturalness: 3 },
          )
        : a,
    );
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

describe("resource accounting (F3/R4)", () => {
  it("computes usage-allowance cost from the dated rates", () => {
    expect(
      g2UsageCostUsd({
        inputTokens: 12_000,
        cachedReadInputTokens: 0,
        cachedWriteInputTokens: 0,
        outputTokens: 4_096,
      }),
    ).toBeCloseTo(0.0073, 3);
  });

  it("prices cached-read and cache-write input separately — never double-charged", () => {
    // 4,000 fully cached-read tokens cost only the cached-read rate; the
    // same counter set charged at the full input rate would be a false
    // ratio under the incremental bound.
    const cached = g2UsageCostUsd({
      inputTokens: 4_000,
      cachedReadInputTokens: 4_000,
      cachedWriteInputTokens: 0,
      outputTokens: 600,
    });
    expect(cached).toBeCloseTo((4_000 * 0.02 + 600 * 1.2) / 1_000_000, 9);
    const uncached = g2UsageCostUsd({
      inputTokens: 4_000,
      cachedReadInputTokens: 0,
      cachedWriteInputTokens: 0,
      outputTokens: 600,
    });
    expect(cached).toBeLessThan(uncached);
    // Cache-write prices at its own rate; ordinary input excludes both
    // cached portions.
    const mixed = g2UsageCostUsd({
      inputTokens: 12_000,
      cachedReadInputTokens: 6_000,
      cachedWriteInputTokens: 2_000,
      outputTokens: 4_096,
    });
    expect(mixed).toBeCloseTo(
      (4_000 * 0.2 + 6_000 * 0.02 + 2_000 * 0.25 + 4_096 * 1.2) / 1_000_000,
      9,
    );
  });

  it("rejects nonfinite, non-integer, negative, and inconsistent usage counters", () => {
    expect(
      g2UsageIsValid({
        inputTokens: 4_000,
        cachedReadInputTokens: 3_000,
        cachedWriteInputTokens: 2_000, // cached portions exceed total input
        outputTokens: 600,
      }),
    ).toBe(false);
    expect(
      g2UsageIsValid({
        inputTokens: 4_000,
        cachedReadInputTokens: -1,
        cachedWriteInputTokens: 0,
        outputTokens: 600,
      }),
    ).toBe(false);
    expect(
      g2UsageIsValid({
        inputTokens: 4_000,
        cachedReadInputTokens: Number.NaN,
        cachedWriteInputTokens: 0,
        outputTokens: 600,
      }),
    ).toBe(false);
    expect(
      g2UsageIsValid({
        inputTokens: 4_000.5,
        cachedReadInputTokens: 0,
        cachedWriteInputTokens: 0,
        outputTokens: 600,
      }),
    ).toBe(false);
    expect(
      g2UsageIsValid({
        inputTokens: 4_000,
        cachedReadInputTokens: 0,
        cachedWriteInputTokens: 0,
        outputTokens: 600,
      }),
    ).toBe(true);
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
      finalTexts: null,
      packFingerprint: null,
      latencyMs: null,
      usage: null,
    };
    const res = assessG2AbsoluteResources(attempts, 10);
    expect(res.failures.some((f) => f.includes("latency telemetry"))).toBe(
      true,
    );
    expect(res.failures.some((f) => f.includes("token telemetry"))).toBe(true);
  });

  it("a 35s rich mean cannot hide inside a pooled 21s mean (sample dilution)", () => {
    const pilot = passingPilot();
    pilot.attempts = pilot.attempts.map((a) =>
      a.variant === "rich" ? { ...a, latencyMs: 35_000 } : a,
    );
    const pooled = pilot.attempts.map((a) => a.latencyMs!);
    expect(
      pooled.reduce((s, v) => s + v, 0) / pooled.length,
    ).toBeLessThanOrEqual(30_000); // pooled mean itself would pass
    const result = evaluateG2Pilot(pilot);
    expect(
      result.failures.some(
        (f) => f.includes("rich") && f.includes("mean latency"),
      ),
    ).toBe(true);
    expect(result.decisionA).toBe(false);
  });

  it("the mean-generation-cost ceiling applies to the sample mean", () => {
    // 80K input + 4,096 output ≈ $0.0209 per attempt — above the frozen
    // $0.02 ceiling that the mean bound shares. Both the per-attempt and the
    // mean-generation-cost failures must surface, and the metric reflects it.
    const costly = pilotAttempts().map((a) => ({
      ...a,
      usage: {
        inputTokens: 80_000,
        cachedReadInputTokens: 0,
        cachedWriteInputTokens: 0,
        outputTokens: 4_096,
      },
    }));
    const res = assessG2AbsoluteResources(costly, null);
    expect(res.failures.some((f) => f.includes("per-attempt"))).toBe(true);
    expect(res.failures.some((f) => f.includes("mean-generation-cost"))).toBe(
      true,
    );
    expect(res.metrics.meanCostUsd).toBeGreaterThan(0.02);
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

describe("release evaluator (R3)", () => {
  it("passes the rich-selected allocation when all §8.2 gates hold", () => {
    const attempts = releaseAttempts("richSelected");
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: true },
      releaseAttribution: releaseAttributionFor(attempts).map((row, i) =>
        i === 0 ? { ...row, pToMRescuedSlots: ["NUAVE-BRAND-NEED-01"] } : row,
      ),
    });
    expect(result.failures).toEqual([]);
    expect(result.missingMandatoryEvidence).toEqual([]);
    expect(result.pass).toBe(true);
    expect(result.metrics.usableSelectedV3).toBe(16);
    expect(result.metrics.v2ComparisonsChecked).toBe(8); // D1–D8 only
  });

  it("passes the simple-selected allocation with all 16 v2 pairs", () => {
    const attempts = releaseAttempts("simpleSelectedByAmendment");
    const result = evaluateG2Release({
      attempts,
      allocation: "simpleSelectedByAmendment",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: null },
    });
    expect(result.failures).toEqual([]);
    expect(result.pass).toBe(true);
    // Twelve paired inputs (D1–D8 + H1–H4 each carry v2 controls); repeats
    // group inside their input, not as extra comparisons.
    expect(result.metrics.v2ComparisonsChecked).toBe(12);
  });

  it("fails when any selected-v3 pack is not usable", () => {
    const attempts = releaseAttempts("richSelected", (a) =>
      a.variant === "rich" && a.inputId === "D2"
        ? { ...a, distinctUnnamedDecisions: 4 }
        : a,
    );
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: true },
      releaseAttribution: releaseAttributionFor(attempts),
    });
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("not usable"))).toBe(true);
  });

  it("fails when a selected-v3 input is below its actual v2 naturalness", () => {
    // D4's selected v3 at naturalness 2 is still usable — the v2 comparison
    // is the failing gate, not usability.
    const attempts = releaseAttempts("richSelected", (a) =>
      a.inputId === "D4"
        ? attemptRecord(
            { inputId: a.inputId, variant: a.variant, pass: a.pass },
            INPUTS,
            { naturalness: a.variant === "v2" ? 3 : 2 },
          )
        : a,
    );
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: true },
      releaseAttribution: releaseAttributionFor(attempts),
    });
    expect(result.pass).toBe(false);
    expect(
      result.failures.some((f) => f.includes("D4") && f.includes("worse")),
    ).toBe(true);
  });

  it("groups repeats per input — a v2 repeat mean counts, not a single pass", () => {
    // D1's selected v3 at 2 stays usable; v2 pass 1 ties at 2 but the
    // scheduled v2 repeat at 3 lifts D1's grouped v2 mean to 2.5 — the
    // per-input repeat grouping fails where a pass-1-only check would pass.
    const attempts = releaseAttempts("richSelected", (a) => {
      if (a.inputId !== "D1") return a;
      if (a.variant === "rich")
        return attemptRecord(
          { inputId: "D1", variant: "rich", pass: a.pass },
          INPUTS,
          { naturalness: 2 },
        );
      if (a.variant === "v2" && a.pass === 2)
        return attemptRecord(
          { inputId: "D1", variant: "v2", pass: 2 },
          INPUTS,
          { naturalness: 3 },
        );
      return a; // v2 pass 1 keeps naturalness 2 → ties alone
    });
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: true },
      releaseAttribution: releaseAttributionFor(attempts),
    });
    expect(result.pass).toBe(false);
    expect(
      result.failures.some((f) => f.includes("D1") && f.includes("worse")),
    ).toBe(true);
  });

  it("a missing selected-v3 pack is unusable and scores zero", () => {
    const attempts = releaseAttempts("richSelected", (a) =>
      a.variant === "rich" && a.inputId === "D3" && a.pass === 1
        ? missingAttemptRecord(
            { inputId: "D3", variant: "rich", pass: 1 },
            INPUTS,
          )
        : a,
    );
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: true },
      releaseAttribution: releaseAttributionFor(attempts),
    });
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("not usable"))).toBe(true);
    expect(result.failures.some((f) => f.includes("D3"))).toBe(true);
  });

  it("missing §8.2.5 mandatory evidence cannot emit a release acceptance", () => {
    const attempts = releaseAttempts("richSelected");
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      // pilotReplay and releaseAttribution absent
    });
    expect(result.pass).toBe(false);
    expect(
      result.missingMandatoryEvidence.some((e) => e.includes("pilotReplay")),
    ).toBe(true);
    expect(
      result.missingMandatoryEvidence.some((e) =>
        e.includes("releaseAttribution"),
      ),
    ).toBe(true);
  });

  it("a failed pilot replay blocks the release even with clean records", () => {
    const attempts = releaseAttempts("richSelected");
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: false, decisionBPreserved: true },
      releaseAttribution: releaseAttributionFor(attempts).map((row, i) =>
        i === 0 ? { ...row, pToMRescuedSlots: ["NUAVE-BRAND-NEED-01"] } : row,
      ),
    });
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("pilot replay"))).toBe(true);
  });

  it("release attribution with no observed component benefit fails", () => {
    const attempts = releaseAttempts("richSelected");
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: true },
      releaseAttribution: releaseAttributionFor(attempts), // all empty
    });
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("component benefit"))).toBe(
      true,
    );
  });

  it("selected-v3 sample statistics are enforced separately from pooled totals", () => {
    // Selected-v3 latency mean 40s violates the 30s mean ceiling even though
    // fast v2 controls keep the pooled mean low.
    const attempts = releaseAttempts("richSelected", (a) =>
      a.variant === "rich" ? { ...a, latencyMs: 40_000 } : a,
    );
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: true },
      releaseAttribution: releaseAttributionFor(attempts).map((row, i) =>
        i === 0 ? { ...row, pToMRescuedSlots: ["NUAVE-BRAND-NEED-01"] } : row,
      ),
    });
    expect(result.pass).toBe(false);
    expect(
      result.failures.some(
        (f) => f.includes("selected-v3") && f.includes("mean latency"),
      ),
    ).toBe(true);
    expect(result.metrics.selectedV3MeanLatencyMs).toBe(40_000);
    expect(result.metrics.selectedV3P95LatencyMs).toBe(40_000);
    expect(result.metrics.selectedV3MeanCostUsd).not.toBeNull();
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
      attemptRecord(s, INPUTS, {
        naturalness: s.variant === "simple" ? 2 : 3,
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
