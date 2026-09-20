/**
 * Spec 010 R-05 / AC-05: with NUAVE_GLM_EVIDENCE_DIR unset a live GLM send
 * must not touch the filesystem — the frozen-attempt gate, the
 * attempt.consumed consume and the response-body evidence writes are all
 * skipped. Every node:fs/promises entry point the adapter imports is mocked
 * to throw, and the send still proceeds against a stubbed fetch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(async () => {
    throw new Error("filesystem access is forbidden on this path");
  }),
  open: vi.fn(async () => {
    throw new Error("filesystem access is forbidden on this path");
  }),
  readFile: vi.fn(async () => {
    throw new Error("filesystem access is forbidden on this path");
  }),
  writeFile: vi.fn(async () => {
    throw new Error("filesystem access is forbidden on this path");
  }),
}));

import { parseQuestionFactsV3 } from "../audit/question-facts-v3";
import { INTAKE_FIXTURES } from "./fixtures";
import { resolveJourneyPath } from "./navigation";
import { freezeLocalIntake } from "./local-questions";
import { createIntakeState, setScopeAnswer } from "./state";
import {
  createSyntheticGlmTransport,
  prepareGlmQuestionsForIntake,
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

describe("R-05 — live GLM send with NUAVE_GLM_EVIDENCE_DIR unset", () => {
  beforeEach(() => {
    delete process.env.NUAVE_GLM_EVIDENCE_DIR;
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends once through the live transport while every fs entry point throws", async () => {
    const intake = frozenLaundry();
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: unknown) => {
      calls.push(String(url));
      const factsResult = parseQuestionFactsV3({
        requestId: "probe",
        intake: {
          version: intake.version,
          factVersion: intake.factVersion,
          confirmed: intake.confirmed,
        },
      });
      if (factsResult.status !== "projected") {
        throw new Error("facts did not project");
      }
      // A well-formed provider body for the direct-ten method — the same
      // shape the labeled stub produces, now riding the live transport.
      const envelope = await createSyntheticGlmTransport({
        facts: factsResult.facts,
      }).call({});
      return {
        status: 200,
        text: async () => JSON.stringify(envelope.body),
      };
    });

    const outcome = await prepareGlmQuestionsForIntake({
      intake,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("cheaper");
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.questions).toHaveLength(10);
    expect(outcome.provenance.transport).toBe("cheaper-inference");
  });

  it("still requires the GLM credential — no send, no stub fallback", async () => {
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const outcome = await prepareGlmQuestionsForIntake({
      intake: frozenLaundry(),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toBe("live_credential_missing");
    expect(outcome.detail).toContain("CHEAPERINFERENCE_API_KEY");
    expect(outcome.detail).toContain("question generation");
  });
});
