/**
 * Freeze integrity: fixture and instruction files must match their manifest
 * hashes (any edit silently breaks every later run), fixture 1 is marked
 * development and the other two held-out and fictional, and the condition B
 * input projection cannot carry facts the condition A projection does not.
 */
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  FIXTURES_DIR,
  INSTRUCTIONS_DIR,
} from "../src/experiment-config";
import {
  fixtureIdsForRole,
  listFixtureIds,
  loadConditionBInstruction,
  loadConditionASnapshot,
  loadFixture,
} from "../src/loaders";
import { sha256Hex } from "../src/loaders";
import {
  buyerBriefStringValues,
  conditionAInput,
  conditionAValuePool,
  conditionBInput,
} from "../src/briefs";

describe("experiment freeze", () => {
  it("lists exactly three fixtures with the intended roles", () => {
    expect(listFixtureIds()).toEqual([
      "fixture-1-kopi-sudut",
      "fixture-2-kopi-bukit-biru",
      "fixture-3-laundry-segar-kilat",
    ]);
    expect(fixtureIdsForRole("development")).toEqual(["fixture-1-kopi-sudut"]);
    expect(fixtureIdsForRole("held-out")).toEqual([
      "fixture-2-kopi-bukit-biru",
      "fixture-3-laundry-segar-kilat",
    ]);
  });

  it("keeps every fixture file byte-identical to its frozen hash", () => {
    for (const fixtureId of listFixtureIds()) {
      const fixture = loadFixture(fixtureId); // loader itself refuses mismatches
      const file = readFileSync(
        path.join(FIXTURES_DIR, `${fixtureId}.json`),
        "utf8",
      );
      expect(sha256Hex(file), fixtureId).toBe(fixture.sha256);
      expect(fixture.version).toBe(1);
    }
  });

  it("marks fixture 1 development and fixtures 2-3 held-out fiction", () => {
    const dev = loadFixture("fixture-1-kopi-sudut");
    expect(dev.role).toBe("development");
    expect(dev.fictional).toBe(false);
    expect(dev.absent_context).toEqual(
      expect.arrayContaining(["comparison_business", "differentiator"]),
    );
    for (const fixtureId of fixtureIdsForRole("held-out")) {
      const fixture = loadFixture(fixtureId);
      expect(fixture.fictional, fixtureId).toBe(true);
      expect(fixture.role).toBe("held-out");
      expect(fixture.absent_context).toContain("comparison_business");
    }
  });

  it("freezes the B instruction and records the A snapshot", () => {
    const instruction = loadConditionBInstruction();
    expect(instruction.version).toBe("condition-b-v1");
    expect(instruction.text).toContain("exactly ten standalone requests");
    expect(instruction.text).toContain("compare_alternatives");
    // The frozen hash covers the file bytes (JSON wrapper included), so the
    // loader refuses to run after ANY edit to the file.
    const fileBytes = readFileSync(
      path.join(INSTRUCTIONS_DIR, "condition-b-v1.json"),
      "utf8",
    );
    expect(sha256Hex(fileBytes)).toBe(instruction.sha256);

    const snapshot = loadConditionASnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.instruction_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("freezes the revised B v2 instruction with a distinct hash", () => {
    // condition-b-v2 is the calibration revision; it must exist, match its
    // manifest hash, carry the calibration guidance, and differ from v1.
    const v2 = loadConditionBInstruction("condition-b-v2");
    const v1 = loadConditionBInstruction("condition-b-v1");
    expect(v2.version).toBe("condition-b-v2");
    expect(v2.instruction_id).toBe("condition-b-v2");
    expect(v2.sha256).not.toBe(v1.sha256);
    const fileBytes = readFileSync(
      path.join(INSTRUCTIONS_DIR, "condition-b-v2.json"),
      "utf8",
    );
    expect(sha256Hex(fileBytes)).toBe(v2.sha256);
    expect(v2.text).toContain("enak ngga");
    expect(v2.text).toContain("cariin laundry di Bekasi yang harganya jelas");
    expect(v2.text).toContain("ada review negatif ngga");
    // Kept multi-criteria direction must not be banned by the revision.
    expect(v2.text).toContain("WiFi cepat, colokan dekat meja");
  });

  it("keeps the B buyer brief free of held-out facts and sample questions", () => {
    // The B instruction must not embed facts from the held-out fixtures.
    const instruction = loadConditionBInstruction();
    for (const fixtureId of fixtureIdsForRole("held-out")) {
      const fixture = loadFixture(fixtureId);
      expect(
        instruction.text,
        `B instruction must not leak ${fixture.business.brand_name}`,
      ).not.toContain(fixture.business.brand_name);
      expect(instruction.text).not.toContain(fixture.business.entity_scope);
    }
  });
});

describe("condition B input projection", () => {
  beforeEach(() => {
    // No live env is needed for pure projection tests.
  });
  afterEach(() => {});

  it("draws every B value from the condition A projection and no more", () => {
    for (const fixtureId of listFixtureIds()) {
      const fixture = loadFixture(fixtureId);
      const minimized = conditionAInput(fixture.business);
      const buyerBrief = conditionBInput(fixture.business);
      const pool = new Set(conditionAValuePool(minimized));
      for (const value of buyerBriefStringValues(buyerBrief)) {
        expect(pool.has(value), `${fixtureId}: "${value}" not in A projection`).toBe(true);
      }
    }
  });

  it("drops provenance-only and accuracy-caveat fields from the B brief", () => {
    const fixture = loadFixture("fixture-1-kopi-sudut");
    const buyerBrief = conditionBInput(fixture.business);
    const serialized = JSON.stringify(buyerBrief);
    expect(serialized).not.toContain("official_source_urls");
    expect(serialized).not.toContain("known_accuracy_questions");
    expect(serialized).not.toContain("source_url");
    expect(buyerBrief.business_name).toBe("Kopi Sudut");
    expect(buyerBrief.market_scope).toBe("Depok");
    expect(buyerBrief.category).toBe("Kedai kopi susu (chain lokal)");
    expect(buyerBrief.customer_needs).toEqual(["Ngopi enak dekat kantor"]);
  });
});
