import { describe, expect, it } from "vitest";
import fixture from "./fixtures/g2-evaluation-inputs.json";
import { measurementSlotForId } from "./measurement-matrix";
import {
  checkV3Candidate,
  checkV3Text,
  deriveV3Attribution,
} from "./question-finalize-v3";
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
  g2RequestConfigFingerprint,
  g2UsageCostUsd,
  g2UsageIsValid,
  g2TextFingerprint,
  G2_USABLE_PACK,
  G2_VERSION_PINS,
  meanAllNaturalness,
  validateG2AttemptRecord,
  validateG2AttemptSchedule,
  validateG2Attribution,
  validateG2FrozenInputs,
  type G2AttemptRecord,
} from "./question-eval-g2";
import {
  attemptRecord,
  attributionRecord,
  gainAttribution,
  g2Hash,
  g2InputIndex,
  g2V3AttemptVersions,
  missingAttemptRecord,
  passingJudgments,
  portfolioCapture,
  projectedFacts,
  rescueAttribution,
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

/** Release attribution with one genuine recorded P-to-M rescue on the first
 * rich attempt — the minimum retained-reserves benefit. */
function releaseAttributionWithRescue(attempts: G2AttemptRecord[]) {
  return attempts
    .filter((a) => a.variant === "rich")
    .map((a, i) =>
      i === 0
        ? rescueAttribution(
            a,
            "NUAVE-BRAND-NEED-01",
            "Kedai kopi apa saja yang layak dipertimbangkan di Jakarta Selatan?",
          )
        : attributionRecord(a),
    );
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

  it("pins the changed contract identities at v3.4/v6 packets", () => {
    expect(G2_VERSION_PINS.writerContract).toContain("v3.2");
    expect(G2_VERSION_PINS.richInstruction).toContain("v3.2");
    expect(G2_VERSION_PINS.fallback).toContain("v3.4");
    expect(G2_VERSION_PINS.selector).toContain("v3.4");
    expect(G2_VERSION_PINS.frozenInputs).toBe("nuave.g2-frozen-inputs.v2");
    expect(G2_VERSION_PINS.packet).toBe("nuave.g2-evaluation-packet.v6");
    expect(G2_VERSION_PINS.decisionPolicy).toBe("nuave.g2-decision-policy.v6");
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

  it("a v3 attempt must bind to the frozen request configuration (T1)", () => {
    const attempt = attemptRecord(
      { inputId: "G2P-AC", variant: "rich", pass: 1 },
      INPUTS,
    );
    expect(validateG2AttemptRecord(attempt, INPUTS)).toEqual([]);
    // A wrong request configuration — different model/cap/sampling posture —
    // fails the binding even when every other pin is correct.
    const wrongConfig = {
      ...attempt,
      requestConfigFingerprint: g2Hash("a-different-request-config"),
    };
    expect(
      validateG2AttemptRecord(wrongConfig, INPUTS).some((e) =>
        e.includes("requestConfigFingerprint"),
      ),
    ).toBe(true);
    // The frozen fingerprint itself is stable and variant-scoped.
    expect(g2RequestConfigFingerprint("rich")).not.toBe(
      g2RequestConfigFingerprint("simple"),
    );
    expect(attempt.requestConfigFingerprint).toBe(
      g2RequestConfigFingerprint("rich"),
    );
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

  it("contradictory origins, fallback flags, and model-written judgments never validate (T1b)", () => {
    // Ten full_fallback origins, fullFallback false, ten model-written
    // judgments — the counters must agree with the recorded finalization
    // or the record is rejected, never silently reconciled.
    const record = attemptRecord(
      { inputId: "G2P-B2B", variant: "rich", pass: 1 },
      INPUTS,
      { finalOrigins: Array(10).fill("full_fallback") },
    );
    const errors = validateG2AttemptRecord(record, INPUTS);
    expect(
      errors.some((e) => e.includes("fullFallback flag contradicts")),
    ).toBe(true);
    expect(
      errors.filter((e) => e.includes("modelWritten")).length,
    ).toBeGreaterThanOrEqual(10);
    // Reserve origins under the simple contract or on a named slot are
    // not finalization outcomes either.
    const simpleReserve = attemptRecord(
      { inputId: "G2P-AC", variant: "simple", pass: 1 },
      INPUTS,
      {
        finalOrigins: [...Array(9).fill("primary"), "reserve"] as never,
      },
    );
    const simpleErrors = validateG2AttemptRecord(simpleReserve, INPUTS);
    expect(simpleErrors.some((e) => e.includes("simple contract"))).toBe(true);
    expect(simpleErrors.some((e) => e.includes("named slot"))).toBe(true);
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
    // An M capture whose texts are not the attempt's recorded final texts
    // fails the exact M binding.
    const attempt0 = attempts.find((a) => a.variant === "rich")!;
    rows[0].captures.M = portfolioCapture(attempt0, [
      ...attempt0.finalTexts!.slice(0, 9),
      "Teks lain yang tidak terekam?",
    ]);
    const res = validateG2Attribution(rows, expectedRich, attempts);
    expect(res.errors.some((e) => e.includes("M capture"))).toBe(true);
    expect(res.valid).toHaveLength(4); // the invalid row earns nothing

    const noPackRows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) =>
        attributionRecord(a, {
          captures: { P: null, M: null, C: null },
          mMechanicallyValid: false,
          pToMRescuedSlots: ["NUAVE-BRAND-NEED-01"],
        }),
      );
    const noPack = validateG2Attribution(noPackRows, expectedRich, attempts);
    expect(noPack.errors.some((e) => e.includes("P-to-M difference"))).toBe(
      true,
    );
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
    // The surviving claim still fails: the default identical P/M captures
    // record no P-to-M difference on that slot.
    expect(res.errors.some((e) => e.includes("P-to-M difference"))).toBe(true);
  });

  it("an interleaved simple record can never overwrite the rich attempt (T1)", () => {
    // The counterexample: a simple record at the same input/pass used to
    // shadow the rich record because the lookup key dropped the variant.
    const attempts = pilotAttempts();
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const rows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) =>
        rescueAttribution(
          a,
          "NUAVE-BRAND-NEED-01",
          "Kedai kopi apa saja yang layak dipertimbangkan di Jakarta Selatan?",
        ),
      );
    // Order invariance: interleaving simple/v2 records before the rich ones
    // changes nothing — the row binds by input+variant+pass.
    const interleaved = [...attempts].sort((a, b) =>
      a.variant === "simple" ? -1 : b.variant === "simple" ? 1 : 0,
    );
    const res = validateG2Attribution(rows, expectedRich, interleaved);
    expect(res.errors).toEqual([]);
    expect(res.valid).toHaveLength(5);

    // A missing-pack simple record at the same input/pass never makes an
    // existing rich M disappear.
    const withMissingSimple = [
      ...attempts.filter(
        (a) => !(a.variant === "simple" && a.inputId === "G2P-AC"),
      ),
      missingAttemptRecord(
        { inputId: "G2P-AC", variant: "simple", pass: 1 },
        INPUTS,
      ),
    ];
    const res2 = validateG2Attribution(rows, expectedRich, withMissingSimple);
    expect(res2.errors).toEqual([]);
    expect(res2.valid).toHaveLength(5);
  });

  it("an attribution row cannot bind to a different variant's texts (T1)", () => {
    // The row's M capture must equal the RICH attempt's recorded texts —
    // presenting the simple attempt's pack under the same input/pass fails.
    const attempts = pilotAttempts((a) =>
      a.variant === "simple" && a.inputId === "G2P-AC" && a.pass === 1
        ? attemptRecord(
            { inputId: "G2P-AC", variant: "simple", pass: 1 },
            INPUTS,
            {
              finalTexts: [
                "Sederhana satu?",
                "Sederhana dua?",
                "Sederhana tiga?",
                "Sederhana empat?",
                "Sederhana lima?",
                "Sederhana enam?",
                "Apakah Kopi Sudut cocok untuk sederhana tujuh?",
                "Apakah Kopi Sudut layak direkomendasikan untuk sederhana delapan?",
                "Bandingkan Kopi Sudut dengan Kedai Pagi untuk sederhana sembilan.",
                "Siapa yang cocok memilih Kopi Sudut untuk sederhana sepuluh?",
              ],
            },
          )
        : a,
    );
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const simpleAttempt = attempts.find(
      (a) => a.variant === "simple" && a.inputId === "G2P-AC" && a.pass === 1,
    )!;
    const rows = attempts
      .filter((a) => a.variant === "rich")
      .map((a) => attributionRecord(a));
    // Swap the AC row's M capture for the SIMPLE variant's texts — the exact
    // variant binding rejects it.
    const acRow = rows.find((r) => r.inputId === "G2P-AC" && r.pass === 1)!;
    acRow.captures.M = portfolioCapture(
      simpleAttempt,
      simpleAttempt.finalTexts!,
      simpleAttempt.finalOrigins ?? undefined,
    );
    const res = validateG2Attribution(rows, expectedRich, attempts);
    expect(res.errors.some((e) => e.includes("M capture"))).toBe(true);
    expect(res.valid).toHaveLength(4);
  });

  it("rejects unknown origins, reserves in P or named slots, and partial full fallback in captures (T1b)", () => {
    const attempts = pilotAttempts();
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const attempt = attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-B2B",
    )!;
    // P capture carrying a made-up origin string — a hash over consistent
    // text cannot launder it into reserve credit.
    const unknownOrigin = attributionRecord(attempt);
    unknownOrigin.captures.P = {
      ...portfolioCapture(attempt, attempt.finalTexts!),
      origins: Array.from({ length: 10 }, (_, i) =>
        i === 0 ? "unknown-origin" : "primary",
      ) as never,
    };
    unknownOrigin.replay!.P = unknownOrigin.captures.P;
    unknownOrigin.pToMRescuedSlots = ["NUAVE-BRAND-NEED-01"];
    // P claims a reserve origin — the primary-only portfolio never selects
    // reserves, so this is not a replay outcome.
    const pReserve = attributionRecord(attempt);
    pReserve.captures.P = {
      ...portfolioCapture(attempt, attempt.finalTexts!),
      origins: Array.from({ length: 10 }, (_, i) =>
        i === 1 ? "reserve" : "primary",
      ) as never,
    };
    pReserve.replay!.P = pReserve.captures.P;
    // A named slot claims a reserve origin — named slots carry none.
    const namedReserve = attributionRecord(attempt);
    namedReserve.captures.M = {
      ...portfolioCapture(attempt, attempt.finalTexts!),
      origins: Array.from({ length: 10 }, (_, i) =>
        i === 6 ? "reserve" : "primary",
      ) as never,
    };
    namedReserve.replay!.M = namedReserve.captures.M;
    // Full fallback mixed with ordinary origins — never a finalization.
    const partialFull = attributionRecord(attempt);
    partialFull.captures.M = {
      ...portfolioCapture(attempt, attempt.finalTexts!),
      origins: Array.from({ length: 10 }, (_, i) =>
        i < 3 ? "full_fallback" : "primary",
      ) as never,
    };
    partialFull.replay!.M = partialFull.captures.M;
    for (const [row, fragment] of [
      [unknownOrigin, "not a finalization origin"],
      [pReserve, "never selects reserves"],
      [namedReserve, "named slots carry no reserves"],
      [partialFull, "all-or-nothing"],
    ] as const) {
      const res = validateG2Attribution([row], [expectedRich[1]], attempts);
      expect(
        res.errors.some((e) => e.includes(fragment)),
        fragment,
      ).toBe(true);
      expect(res.valid).toHaveLength(0);
    }
  });

  it("rejects an empty claimed-improved text even with a self-consistent hash (T1b)", () => {
    // A recomputed hash proves only text consistency — an empty portfolio
    // entry was never a finished replay capture and earns no coverage.
    const attempts = pilotAttempts();
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const attempt = attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-B2B",
    )!;
    const row = attributionRecord(attempt);
    const cTexts = [...attempt.finalTexts!];
    cTexts[0] = "";
    row.captures.C = portfolioCapture(attempt, cTexts);
    row.replay!.C = row.captures.C;
    row.cOverMMaterialGains = [
      {
        slotId: "NUAVE-BRAND-NEED-01",
        mTextFingerprint: g2TextFingerprint(
          "NUAVE-BRAND-NEED-01",
          attempt.finalTexts![0],
        ),
        cTextFingerprint: g2TextFingerprint("NUAVE-BRAND-NEED-01", ""),
        reviewRef: "review-empty",
      },
    ];
    const res = validateG2Attribution([row], [expectedRich[1]], attempts);
    expect(res.errors.some((e) => e.includes("empty final text"))).toBe(true);
    expect(res.valid).toHaveLength(0);
  });

  it("requires the recorded offline replay for every capture and claim (T1b)", () => {
    const attempts = pilotAttempts();
    const expectedRich = G2_PILOT_SCHEDULE.attempts.filter(
      (a) => a.variant === "rich",
    );
    const attempt = attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-B2B",
    )!;
    // A rescue claim without any replay record cannot resolve to a real
    // P-to-M difference of this response.
    const noReplay = attributionRecord(attempt);
    delete noReplay.replay;
    noReplay.pToMRescuedSlots = ["NUAVE-BRAND-NEED-01"];
    // A capture that is not what the replay produced — internally
    // consistent hash, wrong provenance.
    const foreign = attributionRecord(attempt);
    foreign.captures.P = portfolioCapture(attempt, [
      ...attempt.finalTexts!.slice(0, 9),
      "Teks yang tidak berasal dari replay ini?",
    ]);
    // A replay whose M is not this response's recorded pack.
    const wrongResponse = attributionRecord(attempt);
    wrongResponse.replay = {
      ...wrongResponse.replay!,
      M: portfolioCapture(attempt, [
        "Respons lain sama sekali?",
        ...attempt.finalTexts!.slice(1),
      ]),
    };
    for (const [row, fragment] of [
      [noReplay, "without the recorded offline P/M/C replay"],
      [foreign, "does not equal the recorded replay portfolio"],
      [wrongResponse, "replay is not of this response"],
    ] as const) {
      const res = validateG2Attribution([row], [expectedRich[1]], attempts);
      expect(
        res.errors.some((e) => e.includes(fragment)),
        fragment,
      ).toBe(true);
      expect(res.valid).toHaveLength(0);
    }
  });

  it("accepts a row built from a real deriveV3Attribution replay of the recorded response (T1b/E1)", () => {
    // A genuine rich response on the frozen D2 development input: slot 1's
    // primary leaks the audited identity so P must substitute, while M
    // keeps the reserve — a real rescue the replay itself produces. The
    // attempt binds to D2's own frozen facts/envelope fingerprints and
    // passes the full attempt validator, not just the row validator.
    const projected = parseQuestionFactsV3(FIXTURE.inputs.D2);
    if (projected.status !== "projected") throw new Error("D2 projection");
    const facts = projected.facts;
    const response = richResponseOf(
      {
        "NUAVE-BRAND-NEED-01": {
          primary: "Kopi Sudut enak?",
          reserve:
            "Kedai kopi mana yang cocok untuk bekerja di Jakarta Selatan?",
        },
      },
      {
        "NUAVE-BRAND-ACTION-01":
          "Bandingkan Kopi Sudut dengan Kopi Pagi untuk tempat nugas.",
      },
    );
    response.market.category = facts.category;
    const parsed = parseV3RichResponse(response);
    if (!parsed.ok) throw new Error("fixture should parse");
    const derived = deriveV3Attribution(facts, parsed.response);
    expect(derived.M.status).toBe("completed");
    expect(derived.C.status).toBe("completed");
    if (derived.P.status !== "completed" || derived.M.status !== "completed")
      return;
    const mResult = derived.M;
    const mTexts = mResult.prompts.map((prompt) => prompt.text);
    const mOrigins = mResult.prompts.map((prompt) => prompt.origin);
    // P substituted slot 1; M kept its reserve — the real P-to-M rescue.
    expect(mOrigins[0]).toBe("reserve");
    expect(derived.P.prompts[0].origin).toBe("slot_fallback");
    const scheduled = {
      inputId: "D2",
      variant: "rich" as const,
      pass: 1 as const,
    };
    const attempt = attemptRecord(scheduled, INPUTS, {
      // The replay ran under D2's projected facts and produced this
      // response — the attempt records D2's own facts fingerprint (the
      // index default) and the source identity the derivation emitted.
      sourceResponseFingerprint: derived.sourceFingerprint,
      finalTexts: mTexts,
      finalOrigins: mOrigins,
      texts: mTexts.map((text, i) => ({
        slotId: mResult.prompts[i].slotId,
        textFingerprint: g2TextFingerprint(mResult.prompts[i].slotId, text),
        naturalness: 3,
        commercialChoice: true,
        entityDemand: true,
        roleScopeFit: true,
        fairOpenness: true,
        singleUnderstandableRequest: true,
        criteriaDiscipline: true,
        adheresInput: true,
        selectedTextFlagged: false,
        modelWritten: mOrigins[i] === "primary" || mOrigins[i] === "reserve",
      })),
    });
    expect(validateG2AttemptRecord(attempt, INPUTS)).toEqual([]);
    const row = attributionRecord(attempt, {
      captures: derived.captures,
      replay: derived.replay,
    });
    row.pToMRescuedSlots = ["NUAVE-BRAND-NEED-01"];
    const res = validateG2Attribution([row], [scheduled], [attempt]);
    expect(res.errors).toEqual([]);
    expect(res.valid).toHaveLength(1);
  });

  it("rejects a foreign replay whose M is identical but whose source response differs (E1)", () => {
    // Two real offline derivations on frozen D2 facts: B changes one unused
    // reserve (with a valid dimension), so both responses select the same M
    // but different C. B's replay bound to A's attempt can no longer pass —
    // the derivation-emitted source identity does not match the recorded
    // attempt's, and the claimed gain earns zero credit.
    const projected = parseQuestionFactsV3(FIXTURE.inputs.D2);
    if (projected.status !== "projected") throw new Error("D2 projection");
    const facts = projected.facts;
    const responseA = richResponseOf(
      {},
      {
        "NUAVE-BRAND-ACTION-01":
          "Bandingkan Kopi Sudut dengan Kopi Pagi untuk tempat nugas.",
      },
    );
    responseA.market.category = facts.category;
    const responseB = JSON.parse(JSON.stringify(responseA));
    responseB.unnamed[0].reserve.text =
      "Kedai kopi mana yang layak dipertimbangkan berdasarkan harga di Jakarta Selatan?";
    responseB.unnamed[0].reserve.dimensionIds = ["harga"];
    const parsedA = parseV3RichResponse(responseA);
    const parsedB = parseV3RichResponse(responseB);
    if (!parsedA.ok || !parsedB.ok) throw new Error("fixtures should parse");
    const A = deriveV3Attribution(facts, parsedA.response);
    const B = deriveV3Attribution(facts, parsedB.response);
    if (!A.captures.M || !B.captures.M || !A.captures.C || !B.captures.C)
      throw new Error("expected complete offline captures");
    // The defect's precondition: identical M, different source and C.
    expect(A.captures.M).toEqual(B.captures.M);
    expect(A.captures.C).not.toEqual(B.captures.C);
    expect(A.sourceFingerprint).not.toBe(B.sourceFingerprint);
    const scheduled = {
      inputId: "D2",
      variant: "rich" as const,
      pass: 1 as const,
    };
    const attemptA = attemptRecord(scheduled, INPUTS, {
      sourceResponseFingerprint: A.sourceFingerprint,
      finalTexts: A.captures.M.finalTexts,
      finalOrigins: A.captures.M.origins,
    });
    attemptA.texts!.forEach((judgment, i) => {
      judgment.modelWritten = ["primary", "reserve"].includes(
        attemptA.finalOrigins![i],
      );
    });
    expect(validateG2AttemptRecord(attemptA, INPUTS)).toEqual([]);
    // A's own replay validates cleanly with zero gains.
    const rowA = attributionRecord(attemptA, {
      captures: A.captures,
      replay: A.replay,
    });
    const correct = validateG2Attribution([rowA], [scheduled], [attemptA]);
    expect(correct.errors).toEqual([]);
    expect(
      correct.valid.reduce((n, r) => n + r.cOverMMaterialGains.length, 0),
    ).toBe(0);
    // B's captures and B's replay cannot masquerade as A's replay: the
    // claimed reviewed C gain resolves to no valid row.
    const mixed = attributionRecord(attemptA, {
      captures: B.captures,
      replay: B.replay,
      cOverMMaterialGains: [
        {
          slotId: "NUAVE-BRAND-NEED-01",
          mTextFingerprint: g2TextFingerprint(
            "NUAVE-BRAND-NEED-01",
            A.captures.M.finalTexts[0],
          ),
          cTextFingerprint: g2TextFingerprint(
            "NUAVE-BRAND-NEED-01",
            B.captures.C.finalTexts[0],
          ),
          reviewRef: "synthetic-review-of-response-B",
        },
      ],
    });
    const foreign = validateG2Attribution([mixed], [scheduled], [attemptA]);
    expect(
      foreign.errors.some((e) => e.includes("different source response")),
    ).toBe(true);
    expect(foreign.valid).toHaveLength(0);
  });

  it("records honest absence: no usable source keeps the shared fallback outcome but earns no credit (E1)", () => {
    // A rich attempt whose source response was unusable (timeout/parse
    // failure): the record carries an explicit null source identity and a
    // consistent all-full-fallback pack. An attribution row bound to it may
    // record the observed fallback portfolios but cannot claim rescue or
    // gain credit — and a replay claiming a source mismatches.
    const scheduled = {
      inputId: "G2P-AC",
      variant: "rich" as const,
      pass: 1 as const,
    };
    const attempt = attemptRecord(scheduled, INPUTS, {
      sourceResponseFingerprint: null,
      serializationComplete: false,
      finalOrigins: Array(10).fill("full_fallback") as never,
      fullFallback: true,
      texts: passingJudgments().map((judgment) => ({
        ...judgment,
        modelWritten: false,
      })),
    });
    expect(validateG2AttemptRecord(attempt, INPUTS)).toEqual([]);
    const claimed = attributionRecord(attempt);
    claimed.pToMRescuedSlots = ["NUAVE-BRAND-NEED-01"];
    const res = validateG2Attribution([claimed], [scheduled], [attempt]);
    expect(
      res.errors.some((e) => e.includes("no usable source response")),
    ).toBe(true);
    expect(res.valid).toHaveLength(0);
    // A replay that invents a source identity the attempt never recorded
    // mismatches the recorded null as well.
    const invented = attributionRecord(attempt);
    invented.replay!.sourceResponseFingerprint = g2Hash("invented-source");
    const res2 = validateG2Attribution([invented], [scheduled], [attempt]);
    expect(
      res2.errors.some((e) => e.includes("different source response")),
    ).toBe(true);
    expect(res2.valid).toHaveLength(0);
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
        return rescueAttribution(
          acAttempt,
          "NUAVE-BRAND-NEED-01",
          "Kedai kopi apa saja yang layak dipertimbangkan di Jakarta Selatan?",
        );
      if (row.inputId === "G2P-RETAIL")
        return gainAttribution(
          retailAttempt,
          "NUAVE-BRAND-NEED-02",
          "Saat perlu tempat rapat santai, kedai kopi mana yang bisa dipesan mendadak?",
          "independent-review-1",
        );
      return row;
    });
    const result = evaluateG2Pilot(pilot);
    expect(result.failures).toEqual([]);
    expect(result.decisionA).toBe(true);
    expect(result.evidenceComplete).toBe(true);
    expect(result.retain).toBe(true);
    expect(result.outcome).toBe("retain");
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
    expect(result.outcome).toBe("not_retained");
    expect(result.reservesRetained).toBe(false);
    expect(result.coverageRetained).toBe(false);
  });

  it("an invalid attribution row grants no component credit (R2)", () => {
    const pilot = passingPilot();
    // One row claims a C–M gain but its M capture texts are not the
    // attempt's recorded final texts — the row is invalid and earns nothing.
    pilot.attribution = pilot.attribution.map((row, i) =>
      i === 0
        ? {
            ...row,
            captures: {
              ...row.captures,
              M: portfolioCapture(
                pilot.attempts.find(
                  (a) =>
                    a.variant === "rich" &&
                    a.inputId === row.inputId &&
                    a.pass === row.pass,
                )!,
                [...V3_SIMPLE_VALID_QUESTIONS.slice(0, 9), "Teks lain?"],
              ),
            },
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
    pilot.attribution = pilot.attribution.map((row) =>
      rescueAttribution(
        pilot.attempts.find(
          (a) =>
            a.variant === "rich" &&
            a.inputId === row.inputId &&
            a.pass === row.pass,
        )!,
        "NUAVE-BRAND-NEED-01",
        "Kedai kopi apa saja yang layak dipertimbangkan di Jakarta Selatan?",
      ),
    );
    const result = evaluateG2Pilot(pilot);
    expect(result.metrics.pToMRescuedSlots).toBe(5);
    expect(result.decisionA).toBe(false);
    expect(result.failures.some((f) => f.includes("material wins"))).toBe(true);
  });

  it("2. metadata-only coverage earns no retention (Decision B)", () => {
    const pilot = passingPilot();
    pilot.attribution = pilot.attribution.map((row) => ({
      ...rescueAttribution(
        pilot.attempts.find(
          (a) =>
            a.variant === "rich" &&
            a.inputId === row.inputId &&
            a.pass === row.pass,
        )!,
        "NUAVE-BRAND-NEED-01",
        "Kedai kopi apa saja yang layak dipertimbangkan di Jakarta Selatan?",
      ),
      cOverMLabelOnlyChanges: 2,
    }));
    const result = evaluateG2Pilot(pilot);
    expect(result.decisionA).toBe(true);
    expect(result.reservesRetained).toBe(true); // M–P rescue supports reserves
    expect(result.coverageRetained).toBe(false); // label-only earns nothing
  });

  it("2b. an independently justified C–M gain supports reserves under R5's explicit alternative — even with no M–P rescue", () => {
    // R5 §8.1: reserves require "≥1 M–P mechanical rescue/avoided
    // fallback without final-text regression, OR independently justified
    // C–M benefit". One reviewed gain on mechanically valid M without
    // regression is an approved benefit route for reserves and coverage.
    const pilot = passingPilot();
    const attempt = pilot.attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-B2B",
    )!;
    pilot.attribution = pilot.attribution.map((row) =>
      row.inputId === "G2P-B2B"
        ? gainAttribution(
            attempt,
            "NUAVE-BRAND-NEED-01",
            "Saat perlu tempat rapat santai, kedai kopi mana yang bisa dipesan mendadak?",
            "review-2",
          )
        : row,
    );
    const result = evaluateG2Pilot(pilot);
    expect(result.decisionA).toBe(true);
    expect(result.evidenceComplete).toBe(true);
    expect(result.coverageRetained).toBe(true);
    expect(result.reservesRetained).toBe(true);
    expect(result.retain).toBe(true);
    expect(result.outcome).toBe("retain");
  });

  it("2c. C–M gains on a mechanically invalid M do not count", () => {
    const pilot = passingPilot();
    const attempt = pilot.attempts.find(
      (a) => a.variant === "rich" && a.inputId === "G2P-AC" && a.pass === 1,
    )!;
    pilot.attribution = pilot.attribution.map((row) =>
      row.inputId === "G2P-AC" && row.pass === 1
        ? {
            ...attributionRecord(attempt, {
              // M is absent while the attempt has a pack — the row is
              // inconsistent and invalid before any gain is examined.
              captures: { P: null, M: null, C: row.captures.C },
              mMechanicallyValid: false,
            }),
            cOverMMaterialGains: [
              {
                slotId: "NUAVE-BRAND-NEED-01",
                mTextFingerprint: g2Hash("m"),
                cTextFingerprint: g2Hash("c"),
                reviewRef: "review-3",
              },
            ],
          }
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
      releaseAttribution: releaseAttributionWithRescue(attempts),
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
      releaseAttribution: releaseAttributionWithRescue(attempts),
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
    expect(result.failures.some((f) => f.includes("reserves component"))).toBe(
      true,
    );
  });

  it("independently reviewed C–M gains support the retained reserves component at release (R5 §8.1 alternative)", () => {
    // Every row shows a reviewed C–M gain but zero P-to-M rescues — under
    // R5's explicit alternative the gain route is a relevant benefit for
    // reserves, so release attribution passes for the retained component.
    const attempts = releaseAttempts("richSelected");
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: true },
      releaseAttribution: attempts
        .filter((a) => a.variant === "rich")
        .map((a) =>
          gainAttribution(
            a,
            "NUAVE-BRAND-NEED-02",
            "Saat perlu tempat rapat santai, kedai kopi mana yang bisa dipesan mendadak?",
            "release-review-1",
          ),
        ),
    });
    expect(result.pass).toBe(true);
    expect(result.metrics.cOverMMaterialGains).toBe(16);
  });

  it("reserve-only rescue cannot retain coverage at release; an unretained component's regression is recorded, not automatic failure", () => {
    // Retained coverage requires the reviewed-gain route — a rescue-only
    // attribution fails it. When coverage was never retained (the default
    // under the M contract), a C regression is a recorded finding, not a
    // release failure.
    const attempts = releaseAttempts("richSelected");
    const rescueOnly = (a: (typeof attempts)[number]) =>
      rescueAttribution(
        a,
        "NUAVE-BRAND-NEED-02",
        "Teks fallback primer yang tidak lagi sejalan dengan konteks.",
      );
    const coverageRetained = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: {
        decisionAPreserved: true,
        decisionBPreserved: true,
        retainedComponents: { reserves: true, coverage: true },
      },
      releaseAttribution: attempts
        .filter((a) => a.variant === "rich")
        .map(rescueOnly),
    });
    expect(coverageRetained.pass).toBe(false);
    expect(
      coverageRetained.failures.some((f) => f.includes("coverage component")),
    ).toBe(true);
    const cRegressed = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: {
        decisionAPreserved: true,
        decisionBPreserved: true,
        retainedComponents: { reserves: true, coverage: false },
      },
      releaseAttribution: attempts
        .filter((a) => a.variant === "rich")
        .map((a) => ({ ...rescueOnly(a), cCausedFinalRegression: true })),
    });
    expect(cRegressed.pass).toBe(true);
  });

  it("caller flags cannot remove the frozen rich contract's required evidence (E2)", () => {
    // A complete rich release with zero component benefit: declaring
    // reserves not retained is incompatible with the adopted reserve-
    // bearing request contract — the declaration is rejected and the
    // required reserves evidence still fails. Omission is no downgrade
    // either: the requirement derives from the recorded configuration.
    const attempts = releaseAttempts("richSelected");
    const zeroBenefit = {
      attempts,
      allocation: "richSelected" as const,
      inputs: INPUTS,
      releaseAttribution: releaseAttributionFor(attempts),
    };
    for (const retainedComponents of [
      { reserves: false, coverage: false },
      { reserves: false, coverage: true },
      { coverage: true } as never,
    ]) {
      const result = evaluateG2Release({
        ...zeroBenefit,
        pilotReplay: {
          decisionAPreserved: true,
          decisionBPreserved: true,
          retainedComponents,
        },
      });
      expect(result.pass).toBe(false);
      expect(
        result.failures.some((f) => f.includes("retainedComponents")),
      ).toBe(true);
      expect(
        result.failures.some((f) => f.includes("reserves component")),
      ).toBe(true);
    }
    // The consistent reserves-only declaration keeps working: with one
    // genuine recorded rescue the same release passes.
    const rescued = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: {
        decisionAPreserved: true,
        decisionBPreserved: true,
        retainedComponents: { reserves: true, coverage: false },
      },
      releaseAttribution: releaseAttributionWithRescue(attempts),
    });
    expect(rescued.pass).toBe(true);
  });

  it("fallback-substituted packs count as fallback, never model-written (T1b)", () => {
    // Fifteen all-full-fallback packs plus one mixed-origin pack: the
    // counters derive from recorded origins, so this can never read as
    // sixteen model-written packs and zero full fallbacks — and a
    // partially-fallback origin list is not a finalization outcome at all.
    let richIndex = 0;
    const attempts = releaseAttempts("richSelected", (a) => {
      if (a.variant !== "rich") return a;
      richIndex += 1;
      if (richIndex <= 15)
        return {
          ...a,
          finalOrigins: Array(10).fill("full_fallback") as never,
          fullFallback: true,
          texts: a.texts!.map((j) => ({ ...j, modelWritten: false })),
        };
      return {
        ...a,
        finalOrigins: ["full_fallback", ...Array(9).fill("primary")] as never,
        texts: a.texts!.map((j, i) => ({
          ...j,
          modelWritten: i !== 0,
        })),
      };
    });
    const result = evaluateG2Release({
      attempts,
      allocation: "richSelected",
      inputs: INPUTS,
      pilotReplay: { decisionAPreserved: true, decisionBPreserved: true },
      releaseAttribution: releaseAttributionWithRescue(attempts),
    });
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("model-written"))).toBe(true);
    expect(result.failures.some((f) => f.includes("full-fallback"))).toBe(true);
    expect(result.failures.some((f) => f.includes("all-or-nothing"))).toBe(
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
      releaseAttribution: releaseAttributionWithRescue(attempts),
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
