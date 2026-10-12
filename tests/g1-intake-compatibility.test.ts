import { describe, expect, it } from "vitest";
import snapshots from "../src/lib/audit/fixtures/intake-g1-snapshots.json";
import { INTAKE_FIXTURES } from "../src/lib/intake/fixtures";
import { resolveJourneyPath } from "../src/lib/intake/navigation";
import { freezeLocalIntake } from "../src/lib/intake/local-questions";
import {
  createIntakeState,
  setCategoryCustom,
  setScopeAnswer,
  type IntakeState,
} from "../src/lib/intake/state";
import {
  parseQuestionFactsV3,
  isCurrentFactsResponse,
} from "../src/lib/audit/question-facts-v3";

const fixture = INTAKE_FIXTURES.F1;
const scopes = ["brand", "cabang", "produk"] as const;

function answered(scope: IntakeState["scope"] = "brand"): IntakeState {
  const seeded = setScopeAnswer(createIntakeState(fixture), {
    brand: "scope-whole-brand",
    cabang: "scope-branch",
    produk: "scope-product",
  }[scope]);
  return {
    ...setCategoryCustom(
      seeded,
      scope === "produk" ? "Langganan kopi bulanan" : "Kedai kopi",
    ),
    branch:
      scope === "cabang"
        ? {
            selectedId: "custom-branch",
            custom: [
              {
                id: "custom-branch",
                label: "Gerai Selatan",
                detail: "Jalan Melati 12, Jakarta Selatan",
                on: true,
              },
            ],
          }
        : { selectedId: null, custom: [] },
    product:
      scope === "produk"
        ? {
            selectedId: "custom-product",
            custom: [
              { id: "custom-product", label: "Langganan Kopi Sudut", on: true },
            ],
          }
        : { selectedId: null, custom: [] },
    offerings: scope === "produk" ? { onIds: [], custom: [] } : seeded.offerings,
    competitors: {
      keptIds: [],
      custom: ["Kedai Pagi", "Kedai Sore"],
      noDirect: false,
    },
    service: { onIds: ["service-location", "service-delivery"] },
    factVersion: 7,
  };
}

const wire = (v: unknown) => JSON.parse(JSON.stringify(v));

function freshSnapshot(scope: (typeof scopes)[number]) {
  return wire(
    freezeLocalIntake(
      answered(scope),
      fixture,
      resolveJourneyPath({ entry: "read", scope, brandNeedsFix: false }),
    ),
  );
}

describe("committed intake snapshots vs the real freezeLocalIntake serializer", () => {
  it.each([0, 1, 2])("snapshot %i equals fresh serializer output", (i) => {
    expect(freshSnapshot(scopes[i])).toEqual(wire(snapshots[i]));
  });
});

describe("fresh serializer output through the dormant adapter", () => {
  it.each([0, 1, 2])("projects fresh %i without fixture reuse", (i) => {
    const result = parseQuestionFactsV3({
      requestId: "compat-1",
      intake: freshSnapshot(scopes[i]),
    });
    expect(result.status).toBe("projected");
    if (result.status !== "projected") throw new Error(JSON.stringify(result));
    // The serializer's own review rows and fingerprint never enter the facts.
    expect(JSON.stringify(result.facts)).not.toContain("reviewRows");
    expect(result.facts.binding.factsFingerprint).toMatch(/^[a-f0-9]{64}$/);
    // Same request with a different facts revision is stale.
    expect(
      isCurrentFactsResponse(result.facts.binding, {
        ...result.facts.binding,
        factsRevision: 8,
      }),
    ).toBe(false);
  });
});
