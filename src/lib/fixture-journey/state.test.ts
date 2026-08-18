import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  FIXTURE_JOURNEY_STATE_VERSION,
  FIXTURE_JOURNEY_STORAGE_KEY,
  LEGACY_FIXTURE_JOURNEY_STORAGE_KEYS,
  fixtureJourneyStages,
  freshFixtureJourneyState,
  loadFixtureJourneyState,
  validateFixtureJourneyState,
  type FixtureJourneyState,
} from "./state";

/** Minimal sessionStorage stub; this suite runs with no DOM environment. */
class FakeSessionStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function stubWindowWithSessionStorage(): FakeSessionStorage {
  const storage = new FakeSessionStorage();
  vi.stubGlobal("window", { sessionStorage: storage });
  return storage;
}

function stateAt(
  overrides: Partial<FixtureJourneyState> = {},
): FixtureJourneyState {
  return { ...freshFixtureJourneyState(), ...overrides };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadFixtureJourneyState — reset reporting (regression: legacy purge must not silently reset)", () => {
  it("reports reset:true when only a legacy key was present (nothing valid to restore)", () => {
    const storage = stubWindowWithSessionStorage();
    storage.setItem(
      LEGACY_FIXTURE_JOURNEY_STORAGE_KEYS[2],
      JSON.stringify({ stale: true }),
    );
    const result = loadFixtureJourneyState();
    expect(result.reset).toBe(true);
    expect(result.state).toEqual(freshFixtureJourneyState());
    expect(storage.getItem(LEGACY_FIXTURE_JOURNEY_STORAGE_KEYS[2])).toBeNull();
  });

  it("reports reset:false when a valid current-version state sits alongside a stray legacy key", () => {
    const storage = stubWindowWithSessionStorage();
    storage.setItem(
      LEGACY_FIXTURE_JOURNEY_STORAGE_KEYS[2],
      JSON.stringify({ stale: true }),
    );
    const validState = { ...freshFixtureJourneyState(), offerRevealed: true };
    storage.setItem(FIXTURE_JOURNEY_STORAGE_KEY, JSON.stringify(validState));
    const result = loadFixtureJourneyState();
    expect(result.reset).toBe(false);
    expect(result.state).toEqual(validState);
    expect(storage.getItem(LEGACY_FIXTURE_JOURNEY_STORAGE_KEYS[2])).toBeNull();
  });

  it("reports reset:true when the current-version value is corrupt, with no legacy key present", () => {
    const storage = stubWindowWithSessionStorage();
    storage.setItem(FIXTURE_JOURNEY_STORAGE_KEY, "not json");
    const result = loadFixtureJourneyState();
    expect(result.reset).toBe(true);
    expect(result.state).toEqual(freshFixtureJourneyState());
  });

  it("reports reset:false when no key of any version is present", () => {
    stubWindowWithSessionStorage();
    const result = loadFixtureJourneyState();
    expect(result.reset).toBe(false);
    expect(result.state).toEqual(freshFixtureJourneyState());
  });
});

describe("fixture journey storage key", () => {
  it("is versioned, separate from the live audit workflow keys, and v4", () => {
    expect(FIXTURE_JOURNEY_STORAGE_KEY).toBe("nuave.fixtureJourney.v4");
    expect(FIXTURE_JOURNEY_STORAGE_KEY).not.toBe("nuave.audit.workflow.v3");
    expect(FIXTURE_JOURNEY_STORAGE_KEY).not.toBe("nuave.audit.session.v1");
    expect(LEGACY_FIXTURE_JOURNEY_STORAGE_KEYS).toEqual([
      "nuave.fixtureJourney.v1",
      "nuave.fixtureJourney.v2",
      "nuave.fixtureJourney.v3",
    ]);
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

  it("accepts a revealed offer before the simulated payment", () => {
    const state = stateAt({ offerRevealed: true });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the simulated-payment screen before completion", () => {
    const state = stateAt({ stage: "payment", offerRevealed: true });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the simulated-paid confirmation state", () => {
    const state = stateAt({
      stage: "payment",
      offerRevealed: true,
      simulatedPaid: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts facts after the simulated payment", () => {
    const state = stateAt({
      stage: "facts",
      offerRevealed: true,
      simulatedPaid: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts confirmed facts before the questions screen", () => {
    const state = stateAt({
      stage: "facts",
      offerRevealed: true,
      simulatedPaid: true,
      factsConfirmed: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the questions screen after fact confirmation", () => {
    const state = stateAt({
      stage: "questions",
      offerRevealed: true,
      simulatedPaid: true,
      factsConfirmed: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts an approved question pack before the run", () => {
    const state = stateAt({
      stage: "questions",
      offerRevealed: true,
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the run screen before the explicit run action", () => {
    const state = stateAt({
      stage: "run",
      offerRevealed: true,
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
      offerRevealed: true,
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
      offerRevealed: true,
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
      offerRevealed: true,
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
      offerRevealed: true,
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
      offerRevealed: true,
      simulatedPaid: true,
      factsConfirmed: true,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(backToPreview)).toEqual(backToPreview);
    // Back to the simulated payment after it completed.
    const backToPayment = stateAt({
      stage: "payment",
      offerRevealed: true,
      simulatedPaid: true,
    });
    expect(validateFixtureJourneyState(backToPayment)).toEqual(backToPayment);
    // Back to facts after the question pack was approved.
    const backToFacts = stateAt({
      stage: "facts",
      offerRevealed: true,
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

  it("rejects a non-boolean offerRevealed", () => {
    expect(
      validateFixtureJourneyState({
        ...freshFixtureJourneyState(),
        offerRevealed: "yes",
      }),
    ).toBeNull();
  });

  it("rejects a missing offerRevealed field", () => {
    const missingOfferRevealed = {
      ...freshFixtureJourneyState(),
    } as Partial<FixtureJourneyState>;
    delete missingOfferRevealed.offerRevealed;
    expect(validateFixtureJourneyState(missingOfferRevealed)).toBeNull();
  });

  it("rejects a simulated payment without a revealed offer", () => {
    const state = stateAt({
      stage: "payment",
      offerRevealed: false,
      simulatedPaid: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
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

  it("rejects a question approval flag at an earlier stage than the stage rule itself would catch (adversarial review Finding 1)", () => {
    // The stage rule only requires factsConfirmed once stage reaches
    // "questions"/"run"/"ready". Without a converse gate check, a crafted
    // session can carry questionsApproved:true while still on "facts" with
    // factsConfirmed:false, and the stage-only rule never sees it.
    const state = stateAt({
      stage: "facts",
      offerRevealed: true,
      simulatedPaid: true,
      factsConfirmed: false,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects confirmed facts without the simulated payment, at an earlier stage than the stage rule itself would catch", () => {
    const state = stateAt({
      stage: "payment",
      offerRevealed: true,
      simulatedPaid: false,
      factsConfirmed: true,
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
