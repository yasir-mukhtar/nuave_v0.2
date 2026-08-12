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
import {
  fixtureJourneyContext,
  questionClassExplanations,
  questionPackIsBalanced,
} from "./adapter";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
} from "../audit/fixtures/report-golden";

function stateAt(
  overrides: Partial<FixtureJourneyState> = {},
): FixtureJourneyState {
  return { ...freshFixtureJourneyState(), ...overrides };
}

describe("fixture journey storage key", () => {
  it("is versioned and separate from the live audit workflow keys", () => {
    expect(FIXTURE_JOURNEY_STORAGE_KEY).toBe("nuave.fixtureJourney.v2");
    expect(FIXTURE_JOURNEY_STORAGE_KEY).not.toBe("nuave.audit.workflow.v3");
    expect(FIXTURE_JOURNEY_STORAGE_KEY).not.toBe("nuave.audit.session.v1");
  });

  it("declares the full phase-1 path in order", () => {
    expect(fixtureJourneyStages).toEqual([
      "draft",
      "facts",
      "questions",
      "summary",
      "paid",
      "processing",
      "ready",
    ]);
  });
});

describe("validateFixtureJourneyState — forward progression", () => {
  it("accepts a fresh valid state", () => {
    const state = freshFixtureJourneyState();
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts confirmed facts before questions", () => {
    const state = stateAt({ stage: "facts", factsConfirmed: true });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the approved-question state before the summary", () => {
    const state = stateAt({
      stage: "questions",
      factsConfirmed: true,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the scope summary after approval", () => {
    const state = stateAt({
      stage: "summary",
      factsConfirmed: true,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the simulated-paid state after checkout", () => {
    const state = stateAt({
      stage: "paid",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts a persisted mid-run processing state", () => {
    const state = stateAt({
      stage: "processing",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 2,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the terminal ready state", () => {
    const state = stateAt({
      stage: "ready",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 3,
      processingCompleted: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts the terminal ready state with a failed fixture construction", () => {
    const state = stateAt({
      stage: "ready",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 3,
      processingCompleted: true,
      reportConstructionFailed: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("accepts backward navigation that preserves confirmations", () => {
    const state = stateAt({
      stage: "draft",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });
});

describe("validateFixtureJourneyState — rejection", () => {
  it("rejects a missing state", () => {
    expect(validateFixtureJourneyState(null)).toBeNull();
    expect(validateFixtureJourneyState(undefined)).toBeNull();
    expect(validateFixtureJourneyState("draft")).toBeNull();
  });

  it("rejects a stale or incompatible version", () => {
    const state = {
      ...freshFixtureJourneyState(),
      version: FIXTURE_JOURNEY_STATE_VERSION + 1,
    };
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects a Chunk-1 state shape (missing new flags)", () => {
    const chunk1Shape = {
      version: 1,
      stage: "questions",
      factsConfirmed: true,
      questionsApproved: true,
    };
    expect(validateFixtureJourneyState(chunk1Shape)).toBeNull();
  });

  it("rejects an unknown stage", () => {
    const state = { ...freshFixtureJourneyState(), stage: "paid" };
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects non-boolean confirmation flags", () => {
    expect(
      validateFixtureJourneyState({
        ...freshFixtureJourneyState(),
        factsConfirmed: "yes",
      }),
    ).toBeNull();
    expect(
      validateFixtureJourneyState({
        ...freshFixtureJourneyState(),
        checkoutComplete: 1,
      }),
    ).toBeNull();
    expect(
      validateFixtureJourneyState({
        ...freshFixtureJourneyState(),
        processingCompleted: "done",
      }),
    ).toBeNull();
  });

  it("rejects a question approval without confirmed facts", () => {
    const state = stateAt({
      stage: "questions",
      factsConfirmed: false,
      questionsApproved: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects checkout without confirmed facts", () => {
    const state = stateAt({
      stage: "paid",
      factsConfirmed: false,
      questionsApproved: true,
      checkoutComplete: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects checkout without an approved question pack", () => {
    const state = stateAt({
      stage: "paid",
      factsConfirmed: true,
      questionsApproved: false,
      checkoutComplete: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the questions screen before facts are confirmed", () => {
    const state = stateAt({
      stage: "questions",
      factsConfirmed: false,
      questionsApproved: false,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the summary without an approved question pack", () => {
    const state = stateAt({
      stage: "summary",
      factsConfirmed: true,
      questionsApproved: false,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the simulated-paid stage without checkout", () => {
    const state = stateAt({
      stage: "paid",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: false,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects processing without checkout", () => {
    const state = stateAt({
      stage: "processing",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: false,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects the ready stage without a completed run", () => {
    const state = stateAt({
      stage: "ready",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingCompleted: false,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects a completed run that has not landed on ready", () => {
    const state = stateAt({
      stage: "processing",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingCompleted: true,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects an out-of-range processing stage", () => {
    for (const processingStage of [-1, 4, 1.5, Number.NaN]) {
      const state = stateAt({
        stage: "processing",
        factsConfirmed: true,
        questionsApproved: true,
        checkoutComplete: true,
        processingStage,
      });
      expect(validateFixtureJourneyState(state)).toBeNull();
    }
  });

  it("rejects a started run without completed simulated checkout", () => {
    const state = stateAt({
      stage: "processing",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: false,
      processingStage: 2,
    });
    expect(validateFixtureJourneyState(state)).toBeNull();
  });

  it("rejects a started run outside processing or the ready destination", () => {
    for (const stage of ["summary", "paid", "questions", "facts", "draft"]) {
      const state = stateAt({
        stage: stage as FixtureJourneyState["stage"],
        factsConfirmed: true,
        questionsApproved: true,
        checkoutComplete: true,
        processingStage: 1,
      });
      expect(validateFixtureJourneyState(state)).toBeNull();
    }
  });

  it("accepts a fresh run at stage zero after checkout", () => {
    const state = stateAt({
      stage: "processing",
      factsConfirmed: true,
      questionsApproved: true,
      checkoutComplete: true,
      processingStage: 0,
    });
    expect(validateFixtureJourneyState(state)).toEqual(state);
  });

  it("rejects a construction failure away from the ready destination", () => {
    const state = stateAt({
      stage: "summary",
      factsConfirmed: true,
      questionsApproved: true,
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
      stage: "draft",
    };
    expect(validateFixtureJourneyState(partial)).toBeNull();
  });
});

describe("fixture journey adapter", () => {
  it("derives business identity from goldenBrief without a second fixture", () => {
    expect(fixtureJourneyContext.business.name).toBe(goldenBrief.brand_name);
    expect(fixtureJourneyContext.business.entityScope).toBe(
      goldenBrief.entity_scope,
    );
    expect(fixtureJourneyContext.business.category).toBe(goldenBrief.category);
    expect(fixtureJourneyContext.business.marketContext).toBe(
      goldenBrief.market_context,
    );
    expect(fixtureJourneyContext.business.targetCustomer).toBe(
      goldenBrief.target_customer,
    );
    expect(fixtureJourneyContext.business.priorityOffering).toBe(
      goldenBrief.priority_offering,
    );
    expect(fixtureJourneyContext.business.officialSources).toEqual(
      goldenBrief.official_sources,
    );
    expect(fixtureJourneyContext.business.nameVariants).toEqual(
      goldenBrief.brand_name_variants,
    );
    expect(fixtureJourneyContext.business.competitor.name).toBe(
      goldenBrief.verified_competitor.name,
    );
    expect(fixtureJourneyContext.business.competitor.scope).toBe(
      goldenBrief.verified_competitor.scope,
    );
    expect(fixtureJourneyContext.business.accuracyQuestions).toEqual(
      goldenBrief.known_accuracy_questions,
    );
  });

  it("keeps all ten questions in the fixture's original order", () => {
    expect(fixtureJourneyContext.questions.all.map((q) => q.prompt_id)).toEqual(
      goldenPrompts.map((q) => q.prompt_id),
    );
    expect(fixtureJourneyContext.questions.all.map((q) => q.question)).toEqual(
      goldenPrompts.map((q) => q.question),
    );
    expect(fixtureJourneyContext.questions.all).toHaveLength(10);
  });

  it("splits exactly five unbranded and five branded questions", () => {
    expect(questionPackIsBalanced()).toBe(true);
    expect(fixtureJourneyContext.questions.unbranded).toHaveLength(5);
    expect(fixtureJourneyContext.questions.branded).toHaveLength(5);
    expect(
      fixtureJourneyContext.questions.unbranded.every((q) => !q.branded),
    ).toBe(true);
    expect(
      fixtureJourneyContext.questions.branded.every((q) => q.branded),
    ).toBe(true);
  });

  it("explains both question classes in plain language", () => {
    expect(questionClassExplanations.unbranded.label).toBe(
      "Discovery questions",
    );
    expect(questionClassExplanations.branded.label).toBe(
      "Named-business questions",
    );
    expect(
      questionClassExplanations.unbranded.detail.includes(
        goldenBrief.brand_name,
      ),
    ).toBe(true);
    expect(
      questionClassExplanations.branded.detail.includes(goldenBrief.brand_name),
    ).toBe(true);
  });

  it("keeps the fictional contact context on the reserved .example domain", () => {
    expect(fixtureJourneyContext.contact.email.endsWith(".example")).toBe(true);
    expect(fixtureJourneyContext.contact.website).toBe(
      goldenBrief.official_sources[0],
    );
  });

  it("derives the order-summary question count from the golden prompts", () => {
    expect(fixtureJourneyContext.summary.questionCount).toBe(
      goldenPrompts.length,
    );
    expect(fixtureJourneyContext.summary.questionCount).toBe(10);
    expect(fixtureJourneyContext.summary.questionCount).toBe(
      fixtureJourneyContext.questions.all.length,
    );
  });

  it("derives the order-summary execution surface from the golden observations", () => {
    const systems = new Set(
      goldenObservations.map((observation) => observation.system),
    );
    expect(systems.size).toBe(1);
    expect(fixtureJourneyContext.summary.executionSurface.system).toBe(
      goldenObservations[0]?.system,
    );
    expect(fixtureJourneyContext.summary.executionSurface.system).toBe(
      "OpenAI Responses API",
    );
  });

  it("derives the order-summary model names from the golden observations", () => {
    const expectedModels = [
      ...new Set(
        goldenObservations
          .map((observation) => observation.requested_model)
          .filter(Boolean),
      ),
    ];
    expect(fixtureJourneyContext.summary.executionSurface.models).toEqual(
      expectedModels,
    );
    expect(fixtureJourneyContext.summary.executionSurface.models).toContain(
      "fixture-requested-model",
    );
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
  ];

  it("contains no audit API call in any fixture journey source", () => {
    for (const source of fixtureJourneySources) {
      const content = readFileSync(source, "utf8");
      expect(content).not.toContain("/api/audit");
      expect(content).not.toMatch(/\bfetch\s*\(/);
    }
  });
});
