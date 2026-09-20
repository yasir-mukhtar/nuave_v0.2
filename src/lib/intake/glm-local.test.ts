/**
 * Focused offline tests for the founder-only local GLM preparation adapter.
 * All responses are synthetic fixtures or injected transports — no fetch, no
 * credentials, no provider call. The live transport is exercised only through
 * a throwing fetch stub to prove its failure is reported, never retried.
 */
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INTAKE_FIXTURES } from "./fixtures";
import { resolveJourneyPath } from "./navigation";
import { freezeLocalIntake } from "./local-questions";
import { createIntakeState, setScopeAnswer } from "./state";
import { auditMode, newAuditEnabled } from "../audit/deployment-gate";
import {
  createSyntheticGlmTransport,
  freezeGlmLiveAttempt,
  glmLiveAuthorized,
  liveGlmTransport,
  prepareGlmQuestionsForIntake,
  type GlmQuestionTransport,
} from "./glm-local";

const fixture = INTAKE_FIXTURES.GLM;

function frozenLaundry() {
  const state = setScopeAnswer(createIntakeState(fixture), "scope-whole-brand");
  return freezeLocalIntake(
    state,
    fixture,
    resolveJourneyPath({
      entry: "read",
      scope: state.scope,
      brandNeedsFix: false,
    }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("newAuditEnabled / auditMode / glmLiveAuthorized (Spec 010 R-01/R-02)", () => {
  it("the switch is off by default and no longer tied to the build mode", () => {
    expect(newAuditEnabled()).toBe(false);
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
    expect(newAuditEnabled()).toBe(true);
    // The deployment switch governs — production is reachable when it is on.
    vi.stubEnv("NODE_ENV", "production");
    expect(newAuditEnabled()).toBe(true);
  });

  it("auditMode defaults to synthetic and selects live only on the exact value", () => {
    expect(auditMode()).toBe("synthetic");
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    expect(auditMode()).toBe("live");
    vi.stubEnv("NUAVE_AUDIT_MODE", "canonical");
    expect(auditMode()).toBe("synthetic");
    vi.stubEnv("NUAVE_AUDIT_MODE", "Live");
    expect(auditMode()).toBe("synthetic");
  });

  it("live send requires live mode and a server credential", () => {
    expect(glmLiveAuthorized()).toBe(false);
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    expect(glmLiveAuthorized()).toBe(false);
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "test-key");
    expect(glmLiveAuthorized()).toBe(true);
    // Live mode works the same in a production build — no NODE_ENV gate.
    vi.stubEnv("NODE_ENV", "production");
    expect(glmLiveAuthorized()).toBe(true);
  });
});

describe("prepareGlmQuestionsForIntake", () => {
  it("keeps the mismatch verdict while leaving the text inspectable", async () => {
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
      stubBehavior: "mismatch",
    });
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.provenance.modelMismatch).toBe(true);
    expect(outcome.provenance.requestedModel).toBe("glm-5.3-flash");
    expect(outcome.provenance.returnedModel).toBe("zai/glm-5.3-flash");
    expect(outcome.questions).toHaveLength(10);
  });

  it("reports a timeout as a transport failure without retry", async () => {
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
      stubBehavior: "timeout",
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toBe("transport");
    expect(outcome.detail).toContain("synthetic timeout");
  });

  it("rejects an intake record whose fingerprint no longer matches", async () => {
    const intake = frozenLaundry();
    const tampered = {
      ...intake,
      confirmed: { ...intake.confirmed, category: "Bengkel motor" },
    };
    const outcome = await prepareGlmQuestionsForIntake({
      intake: tampered,
    });
    expect(outcome.status).toBe("invalid_request");
  });

  it("returns missing/invalid facts for correction instead of inventing them", async () => {
    const intake = frozenLaundry();
    const corrupted = JSON.parse(JSON.stringify(intake)) as typeof intake;
    corrupted.confirmed.comparators = { mode: "named", names: [] };
    corrupted.fingerprint = JSON.stringify({
      confirmed: corrupted.confirmed,
      reviewRows: corrupted.reviewRows,
    });
    const outcome = await prepareGlmQuestionsForIntake({
      intake: corrupted,
    });
    expect(outcome.status).toBe("correction_required");
    if (outcome.status !== "correction_required") return;
    expect(outcome.issues.map((issue) => issue.field)).toContain("comparison");
  });

  it("surfaces a provider error envelope as failure, not a pack", async () => {
    const failing: GlmQuestionTransport = {
      kind: "synthetic-stub",
      call: async () => ({
        httpStatus: 200,
        body: { error: { message: "synthetic provider error" } },
      }),
    };
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
      transport: failing,
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toBe("provider_error");
  });
});

describe("prepareGlmQuestionsForIntake — direct-ten method (Spec 009)", () => {
  it("returns ten unnamed texts, preserved inspection sections, and direct-ten provenance", async () => {
    const intake = frozenLaundry();
    const seen: unknown[] = [];
    const counting: GlmQuestionTransport = {
      kind: "synthetic-stub",
      call: async (body) => {
        seen.push(body);
        const factsResult = await import("../audit/question-facts-v3").then(
          ({ parseQuestionFactsV3 }) =>
            parseQuestionFactsV3({
              requestId: "probe",
              intake: {
                version: intake.version,
                factVersion: intake.factVersion,
                confirmed: intake.confirmed,
              },
            }),
        );
        if (factsResult.status !== "projected")
          throw new Error("facts did not project");
        return createSyntheticGlmTransport({
          facts: factsResult.facts,
        }).call(body);
      },
    };
    const outcome = await prepareGlmQuestionsForIntake({
      intake,
      transport: counting,
    });
    expect(seen).toHaveLength(1);
    const request = seen[0] as {
      model: string;
      reasoning_effort: string;
      max_tokens: number;
      messages: { role: string; content: string }[];
    };
    expect(request.model).toBe("glm-5.3-flash");
    expect(request.reasoning_effort).toBe("low");
    expect(request.max_tokens).toBe(4096);
    // The direct-ten contract: adapted source body + amendments + one brief.
    expect(request.messages[0].content).toContain(
      "Then generate **10 consumer questions**.",
    );
    expect(request.messages[0].content).toContain("## 2. Candidate questions");
    expect(request.messages[0].content).toContain("Nama: Laundry Ceria");
    expect(request.messages[0].content).toContain(
      "no minimum number of distinct needs",
    );
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.questions).toHaveLength(10);
    // Every synthetic text stays unnamed — never the audited identity.
    expect(
      outcome.questions.every(
        (question) => !question.includes("Laundry Ceria"),
      ),
    ).toBe(true);
    expect(outcome.provenance).toMatchObject({
      requestedModel: "glm-5.3-flash",
      returnedModel: "glm-5.3-flash",
      modelMismatch: false,
      transport: "synthetic-stub",
    });
    // Provider-side sections are preserved verbatim for inspection.
    expect(outcome.examination?.marketInterpretation).toContain("sintetis");
    expect(outcome.examination?.selfCritique).toContain("sintetis");
    expect(outcome.examination?.intentLabels).toHaveLength(10);
    expect(outcome.cost).toEqual({ billedUsd: null, available: false });
  });

  it("reports malformed direct-ten output as a truthful failure without retry", async () => {
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
      stubBehavior: "malformed",
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toBe("extraction_missing_marker");
    expect(outcome.detail).toContain("## 2.");
    expect(outcome.provenance.method).toBe("direct-ten");
  });

  it("a returned-but-invalid direct-ten pack keeps the texts for inspection", async () => {
    const named: GlmQuestionTransport = {
      kind: "synthetic-stub",
      call: async () => ({
        httpStatus: 200,
        body: {
          id: "chatcmpl-stub-named",
          model: "glm-5.3-flash",
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: [
                  "## 1. Market interpretation",
                  "",
                  "Sintetis.",
                  "",
                  "## 2. Candidate questions",
                  "",
                  ...Array.from(
                    { length: 10 },
                    (_, i) => `${i + 1}. Laundry Ceria paling murah kan?`,
                  ),
                  "",
                  "## 3. Self-critique",
                  "",
                  "Sintetis.",
                ].join("\n"),
              },
            },
          ],
        },
      }),
    };
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
      transport: named,
    });
    expect(outcome.status).toBe("validation_failed");
    if (outcome.status !== "validation_failed") return;
    expect(outcome.questions).toHaveLength(10);
    // Every position is unnamed in this method — all ten flag the same rule.
    expect(outcome.issues.length).toBeGreaterThanOrEqual(10);
    expect(outcome.issues[0]).toContain("tidak boleh menyebut bisnis Anda");
  });
});

describe("liveGlmTransport", () => {
  it("makes exactly one fetch to the pinned endpoint and reports a thrown failure honestly", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: unknown) => {
      calls.push(String(url));
      throw new Error("no network in this test");
    });
    const envelope = await liveGlmTransport.call({ model: "glm-5.3-flash" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("cheaper");
    expect(envelope.httpStatus).toBe(0);
    expect(envelope.transportError).toContain("no network");
    vi.unstubAllGlobals();
  });
});

describe("B3 — mismatch never masks a missing or blank response ID", () => {
  const stubResponse = (body: unknown): GlmQuestionTransport => ({
    kind: "synthetic-stub",
    call: async () => ({ httpStatus: 200, body }),
  });
  // An otherwise well-formed sectioned ten-question envelope — only the
  // envelope fields under test vary. The brand-named texts keep the pack
  // inspectable but invalid under the direct-ten unnamed rule.
  const sectionedBody = (over: Record<string, unknown>) => ({
    id: "chatcmpl-x",
    model: "glm-5.3-flash",
    choices: [
      {
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: [
            "## 1. Market interpretation",
            "",
            "Interpretasi.",
            "",
            "## 2. Candidate questions",
            "",
            ...Array.from(
              { length: 10 },
              (_, i) => `${i + 1}. Laundry Ceria paling murah kan?`,
            ),
            "",
            "## 3. Self-critique",
            "",
            "Kritik.",
          ].join("\n"),
        },
      },
    ],
    ...over,
  });

  it.each([undefined, "", "   "])(
    "mismatch + id %j stays a provenance failure",
    async (id) => {
      const body = sectionedBody({ model: "zai/glm-5.3-flash" });
      if (id === undefined) delete (body as Record<string, unknown>).id;
      else body.id = id;
      const outcome = await prepareGlmQuestionsForIntake({
        intake: frozenLaundry(),
        transport: stubResponse(body),
      });
      expect(outcome.status).toBe("failed");
      if (outcome.status !== "failed") return;
      expect(outcome.reason).toBe("provenance");
      expect(outcome.provenance.modelMismatch).toBe(true);
    },
  );

  it("mismatch + valid id keeps the mismatch verdict and stays inspectable", async () => {
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
      transport: stubResponse(
        sectionedBody({
          id: "chatcmpl-independent",
          model: "zai/glm-5.3-flash",
        }),
      ),
    });
    // The texts are inspectable (validation_failed with the ten texts, since
    // the sectioned stubs do not meet the v3 rules) — never hard-failed on
    // provenance; the mismatch verdict is preserved verbatim.
    expect(outcome.status).toBe("validation_failed");
    if (outcome.status !== "validation_failed") return;
    expect(outcome.questions).toHaveLength(10);
    expect(outcome.provenance.modelMismatch).toBe(true);
    expect(outcome.provenance.returnedModel).toBe("zai/glm-5.3-flash");
    expect(outcome.provenance.responseId).toBe("chatcmpl-independent");
  });
});

describe("B1 — single authorized live attempt", () => {
  const liveEnv = () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  };
  const spyTransport = (seen: unknown[], body: unknown) => {
    const transport: GlmQuestionTransport = {
      kind: "cheaper-inference",
      call: async (request) => {
        seen.push(request);
        return { httpStatus: 200, body, rawBody: JSON.stringify(body) };
      },
    };
    return transport;
  };
  const okBody = {
    id: "chatcmpl-live",
    model: "glm-5.3-flash",
    choices: [
      {
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: [
            "## 1. Market interpretation",
            "",
            "Interpretasi.",
            "",
            "## 2. Candidate questions",
            "",
            "1. a?",
            "2. b?",
            "3. c?",
            "4. d?",
            "5. e?",
            "6. f?",
            "7. g?",
            "8. h?",
            "9. i?",
            "10. j?",
            "",
            "## 3. Self-critique",
            "",
            "Kritik.",
          ].join("\n"),
        },
      },
    ],
  };

  it("authorized live without its key stops — no send, no stub fallback", async () => {
    liveEnv();
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "");
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toBe("live_credential_missing");
    expect(outcome.detail).toContain("CHEAPERINFERENCE_API_KEY");
  });

  it("sends once against frozen artifacts, then consumes — concurrent, retry and post-timeout reuse all stop", async () => {
    liveEnv();
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "test-key");
    const dir = mkdtempSync(join(tmpdir(), "glm-evidence-"));
    const intake = frozenLaundry();
    const frozen = await freezeGlmLiveAttempt({
      intake,
      evidenceDir: dir,
    });
    expect(frozen.status).toBe("frozen");
    expect(readdirSync(dir).sort()).toEqual([
      "frozen-intake.json",
      "frozen-intake.sha256",
      "frozen-request.json",
      "frozen-request.sha256",
    ]);
    const seen: unknown[] = [];
    const transport = spyTransport(seen, okBody);
    // Two concurrent attempts race the atomic consume — exactly one sends.
    const [first, second] = await Promise.all([
      prepareGlmQuestionsForIntake({
        intake,
        transport,
        evidenceDir: dir,
      }),
      prepareGlmQuestionsForIntake({
        intake,
        transport,
        evidenceDir: dir,
      }),
    ]);
    expect(seen).toHaveLength(1);
    const consumed = [first, second].find(
      (outcome) =>
        outcome.status === "failed" && outcome.reason === "attempt_consumed",
    );
    expect(consumed).toBeDefined();
    // An explicit later retry is another call but never another send.
    const again = await prepareGlmQuestionsForIntake({
      intake,
      transport,
      evidenceDir: dir,
    });
    expect(again.status).toBe("failed");
    if (again.status !== "failed") return;
    expect(again.reason).toBe("attempt_consumed");
    expect(seen).toHaveLength(1);
  });

  it("a post-timeout retry cannot send again", async () => {
    liveEnv();
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "test-key");
    const dir = mkdtempSync(join(tmpdir(), "glm-evidence-"));
    const intake = frozenLaundry();
    await freezeGlmLiveAttempt({
      intake,
      evidenceDir: dir,
    });
    const seen: unknown[] = [];
    const timingOut: GlmQuestionTransport = {
      kind: "cheaper-inference",
      call: async (request) => {
        seen.push(request);
        return {
          httpStatus: 0,
          body: null,
          transportError: "The operation timed out.",
        };
      },
    };
    const first = await prepareGlmQuestionsForIntake({
      intake,
      transport: timingOut,
      evidenceDir: dir,
    });
    expect(first.status).toBe("failed");
    const retry = await prepareGlmQuestionsForIntake({
      intake,
      transport: timingOut,
      evidenceDir: dir,
    });
    expect(seen).toHaveLength(1);
    expect(retry.status).toBe("failed");
    if (retry.status !== "failed") return;
    expect(retry.reason).toBe("attempt_consumed");
  });

  it("a changed intake or missing artifacts never reaches the transport", async () => {
    liveEnv();
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "test-key");
    const dir = mkdtempSync(join(tmpdir(), "glm-evidence-"));
    const intake = frozenLaundry();
    const seen: unknown[] = [];
    const transport = spyTransport(seen, okBody);
    // No frozen artifacts at all.
    const missing = await prepareGlmQuestionsForIntake({
      intake,
      transport,
      evidenceDir: dir,
    });
    expect(missing.status).toBe("failed");
    if (missing.status !== "failed") throw new Error("expected failed");
    expect(missing.reason).toBe("attempt_not_frozen");
    // Frozen for a different intake, then called with this one.
    const other = JSON.parse(JSON.stringify(intake)) as typeof intake;
    other.confirmed.publicFact = "Fakta berbeda.";
    other.fingerprint = JSON.stringify({
      confirmed: other.confirmed,
      reviewRows: other.reviewRows,
    });
    await freezeGlmLiveAttempt({
      intake: other,
      evidenceDir: dir,
    });
    const changed = await prepareGlmQuestionsForIntake({
      intake,
      transport,
      evidenceDir: dir,
    });
    expect(changed.status).toBe("failed");
    if (changed.status !== "failed") throw new Error("expected failed");
    expect(changed.reason).toBe("input_changed");
    expect(seen).toHaveLength(0);
  });

  it("preserves raw response bytes and the outcome in owner-only evidence", async () => {
    liveEnv();
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "test-key");
    const dir = mkdtempSync(join(tmpdir(), "glm-evidence-"));
    const intake = frozenLaundry();
    await freezeGlmLiveAttempt({
      intake,
      evidenceDir: dir,
    });
    const seen: unknown[] = [];
    const transport = spyTransport(seen, { note: "non-JSON-able" });
    await prepareGlmQuestionsForIntake({
      intake,
      transport,
      evidenceDir: dir,
    });
    const files = readdirSync(dir).filter((f) => f.startsWith("response-"));
    const bodyFile = files.find((f) => f.endsWith(".body.txt"))!;
    const outcomeFile = files.find((f) => f.endsWith(".outcome.json"))!;
    expect(readFileSync(join(dir, bodyFile), "utf8")).toBe(
      JSON.stringify({ note: "non-JSON-able" }),
    );
    const outcome = JSON.parse(
      readFileSync(join(dir, outcomeFile), "utf8"),
    ) as { httpStatus: number; bodyPreserved: boolean };
    expect(outcome.httpStatus).toBe(200);
    expect(outcome.bodyPreserved).toBe(true);
    expect(statSync(join(dir, bodyFile)).mode & 0o777).toBe(0o600);
    expect(statSync(join(dir, outcomeFile)).mode & 0o777).toBe(0o600);
  });
});

describe("R-06 — providerContact and billed cost on failed outcomes", () => {
  it("marks a transport failure as 'sent' — provider execution unknown", async () => {
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
      stubBehavior: "timeout",
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.providerContact).toBe("sent");
  });

  it("marks a failed provider HTTP response as 'responded' and keeps its settled cost", async () => {
    const failing: GlmQuestionTransport = {
      kind: "cheaper-inference",
      call: async () => ({
        httpStatus: 500,
        body: {
          cheaper_inference: { billing: { billed_cost_usd: "0.000496" } },
        },
      }),
    };
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
      transport: failing,
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toBe("http_error");
    expect(outcome.providerContact).toBe("responded");
    expect(outcome.cost).toEqual({ billedUsd: 0.000496, available: true });
  });

  it("marks pre-send refusals as 'none' — credential gate sends nothing", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "");
    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toBe("live_credential_missing");
    expect(outcome.providerContact).toBe("none");
  });
});
