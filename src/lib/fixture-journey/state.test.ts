import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  FIXTURE_JOURNEY_STATE_VERSION,
  FIXTURE_JOURNEY_STORAGE_KEY,
  fixtureJourneyStages,
  freshFixtureJourneyState,
  validateFixtureJourneyState,
  type FixtureJourneyState,
} from "./state";

function stateAt(
  overrides: Partial<FixtureJourneyState> = {},
): FixtureJourneyState {
  return { ...freshFixtureJourneyState(), ...overrides };
}

describe("fixture journey storage key", () => {
  it("is versioned, separate from the live audit workflow keys, and v3", () => {
    expect(FIXTURE_JOURNEY_STORAGE_KEY).toBe("nuave.fixtureJourney.v3");
    expect(FIXTURE_JOURNEY_STORAGE_KEY).not.toBe("nuave.audit.workflow.v3");
    expect(FIXTURE_JOURNEY_STORAGE_KEY).not.toBe("nuave.audit.session.v1");
  });

  it("declares the canonical six-step path in order (R-20)", () => {
    expect(fixtureJourneyStages).toEqual([
      "preview",
      "payment",
      "facts",
      "questions",
      "run",
      "ready",
    ]);
  });
});

describe("validateFixtureJourneyState — forward progression (R-23 gates)", () => {
  it("accepts a fresh valid state at the order preview", () => {
    const state = freshFixtureJourneyState();
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the simulated-payment screen before completion", () => {
    const state = stateAt({ stage: "payment" });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the simulated-paid confirmation state", () => {
    const state = stateAt({ stage: "payment", simulatedPaid: true });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts facts after the simulated payment", () => {
    const state = stateAt({ stage: "facts", simulatedPaid: true });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts confirmed facts before the questions screen", () => {
    const state = stateAt({
      stage: "facts",
      simulatedPaid: true,
      factsConfirmed: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the questions screen after fact confirmation", () => {
    const state = stateAt({
      stage: "questions",
      simulatedPaid: true,
      factsConfirmed: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts an approved question pack before the run", () => {
    const state = stateAt({
      stage: "questions",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the run screen before the explicit run action", () => {
    const state = stateAt({
      stage: "run",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
      runStarted: false,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts a just-started run at stage zero", () => {
    const state = stateAt({
      stage: "run",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
      runStarted: true,
      processingStage: 0,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts a persisted mid-run processing state", () => {
    const state = stateAt({
      stage: "run",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
      runStarted: true,
      processingStage: 2,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the terminal ready state", () => {
    const state = stateAt({
      stage: "ready",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
      runStarted: true,
      processingStage: 3,
      processingCompleted: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the terminal ready state with a failed fixture construction", () => {
    const state = stateAt({
      stage: "ready",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
      runStarted: true,
      processingStage: 3,
      processingCompleted: true,
      reportConstructionFailed: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts backward navigation before the run that preserves confirmations", () => {
    // Back to the preview after payment and fact confirmation.
    const backToPreview = stateAt({
      stage: "preview",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(backToPreview)).toEqual(backToPreview);
    // Back to the simulated payment after it completed.
    const backToPayment = stateAt({ stage: "payment", simulatedPaid: true });
    expect(validateFixtureJourneyState(backToPayment)).toEqual(backToPayment);
    // Back to facts after the question pack was approved.
    const backToFacts = stateAt({
      stage: "facts",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(backToFacts)).toEqual(backToFacts);
  });
});

describe("validateFixtureJourneyState — rejection", () => {
  it("rejects a missing state", () => {
    expect(validateFixtureJourneyState(null)).toBeNull();
    expect(validateFixtureJourneyState(undefined)).toBeNull();
    expect(validateFixtureJourneyState("preview")).toBeNull();
  });

  it("rejects a stale or incompatible version", () => {
    const state = {
      ...freshFixtureJourneyState(),
      version: FIXTURE_JOURNEY_STATE_VERSION + 1,
    };
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects a stored v2 shape (Spec 001 order) as stale", () => {
    // The v2 state used draft/facts/questions/summary/paid/processing/ready
    // with checkoutComplete; it must be rejected as a whole and reset.
    const v2Shape = {
      version: 2,
      stage: "summary",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 0,
      processingCompleted: false,
      reportConstructionFailed: false,
    };
    expect(validateFixtureJourneyState(v2Shape)).toBeNull();
  });

  it("rejects a stored v1 shape as stale", () => {
    const v1Shape = {
      version: 1,
      stage: "questions",
      factsConfirmed: true,
      questionsApproved: true,
    };
    expect(validateFixtureJourneyState(v1Shape)).toBeNull();
  });

  it("rejects an unknown stage", () => {
    const state = { ...freshFixtureJourneyState(), stage: "summary" };
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects non-boolean confirmation flags", () => {
    expect(
      validateFixtureJourneyState({
        ...freshFixtureJourneyState(),
        simulatedPaid: "yes",
      }),
    ).toBeNull();
    expect(
      validateFixtureJourneyState({
        ...freshFixtureJourneyState(),
        factsConfirmed: 1,
      }),
    ).toBeNull();
    expect(
      validateFixtureJourneyState({
        ...freshFixtureJourneyState(),
        runStarted: "done",
      }),
    ).toBeNull();
  });

  it("rejects facts before the simulated payment", () => {
    const state = stateAt({ stage: "facts", simulatedPaid: false });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the questions screen before the simulated payment", () => {
    const state = stateAt({
      stage: "questions",
      simulatedPaid: false,
      factsConfirmed: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the questions screen before facts are confirmed", () => {
    const state = stateAt({
      stage: "questions",
      simulatedPaid: true,
      factsConfirmed: false,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects a question approval without confirmed facts", () => {
    const state = stateAt({
      stage: "questions",
      simulatedPaid: true,
      factsConfirmed: false,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the run screen without an approved question pack", () => {
    const state = stateAt({
      stage: "run",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: false,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the run screen without confirmed facts", () => {
    const state = stateAt({
      stage: "run",
      simulatedPaid: true,
      factsConfirmed: false,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the run screen without the simulated payment", () => {
    const state = stateAt({
      stage: "run",
      simulatedPaid: false,
      factsConfirmed: true,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the ready stage without a completed run", () => {
    const state = stateAt({
      stage: "ready",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
      processingCompleted: false,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects a completed run that has not landed on ready", () => {
    const state = stateAt({
      stage: "run",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
      runStarted: true,
      processingCompleted: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects an out-of-range processing stage", () => {
    for (const processingStage of [-1, 4, 1.5, Number.NaN]) {
      const state = stateAt({
        stage: "run",
        simulatedPaid: true,
        factsConfirmed: true,
        questionsApproved: true,
        runStarted: true,
        processingStage,
      });
      expect(validateFixtureJourneyState(state)).toBeNull();
    }
  });

  it("rejects a started run without the explicit run action", () => {
    const state = stateAt({
      stage: "run",
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
      runStarted: false,
      processingStage: 2,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects a started run without the simulated payment", () => {
    const state = stateAt({
      stage: "run",
      simulatedPaid: false,
      factsConfirmed: true,
      questionsApproved: true,
      runStarted: true,
      processingStage: 2,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the run action away from the run and ready destinations", () => {
    for (const stage of ["preview", "payment", "facts", "questions"]) {
      const state = stateAt({
        stage: stage as FixtureJourneyState["stage"],
        simulatedPaid: true,
        factsConfirmed: true,
        questionsApproved: true,
        runStarted: true,
      });
      expect(validateFixtureJourneyState(state)).toBeNull();
    }
  });

  it("rejects a started run outside the run and ready destinations", () => {
    for (const stage of ["preview", "payment", "facts", "questions"]) {
      const state = stateAt({
        stage: stage as FixtureJourneyState["stage"],
        simulatedPaid: true,
        factsConfirmed: true,
        questionsApproved: true,
        runStarted: true,
        processingStage: 1,
      });
      expect(validateFixtureJourneyState(state)).toBeNull();
    }
  });

  it("rejects a construction failure away from the ready destination", () => {
    const state = stateAt({
      stage: "questions",
      simulatedPaid: true,
      factsConfirmed: true,
      reportConstructionFailed: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects missing fields", () => {
    const missingVersion = {
      ...freshFixtureJourneyState(),
    } as Partial<FixtureJourneyState>;
    delete missingVersion.version;
    expect(validateFixtureJourneyState(missingVersion)).toBeNull();
    const partial = {
      version: FIXTURE_JOURNEY_STATE_VERSION,
      stage: "preview",
    };
    expect(validateFixtureJourneyState(partial)).toBeNull();
    const missingRunStarted = {
      ...freshFixtureJourneyState(),
    } as Partial<FixtureJourneyState>;
    delete missingRunStarted.runStarted;
    expect(validateFixtureJourneyState(missingRunStarted)).toBeNull();
  });
});

describe("fixture journey side-effect boundary", () => {
  const fixtureJourneySources = [
    new URL("./config.ts", import.meta.url),
    new URL("./state.ts", import.meta.url),
    new URL("./adapter.ts", import.meta.url),
    new URL("./processing.ts", import.meta.url),
    new URL("./report.ts", import.meta.url),
    new URL("../../../src/app/audit/fixture/page.tsx", import.meta.url),
    new URL(
      "../../../src/app/audit/fixture/FixtureJourney.tsx",
      import.meta.url,
    ),
    new URL(
      "../../../src/app/audit/fixture/FixtureReportView.tsx",
      import.meta.url,
    ),
  ];

  it("contains no audit API call in any fixture journey source", () => {
    for (const source of fixtureJourneySources) {
      const content = readFileSync(source, "utf8");
      expect(content).not.toContain("/api/audit");
      expect(content).not.toMatch(/\bfetch\s*\(/);
    }
  });
});
