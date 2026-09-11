/**
 * EXPLICIT LIVE RUN — B v2 calibration set only.
 *
 * This is deliberately separate from initial.live.spec.ts: that spec schedules
 * A+B, while the authorized calibration step tests only the revised B
 * instruction. It makes exactly one B call per frozen fixture (3 total).
 *
 * Run only with the explicit live command documented in evidence/next-test-
 * proposal.md. No automatic retry, no fallback, no overwrite, and no A calls.
 */
import { expect, it } from "vitest";
import { loadEnvLocal } from "../src/env";
import { loadConditionBInstruction, loadFixture, listFixtureIds } from "../src/loaders";
import { runConditionB } from "../src/condition-b";
import { LUNA_MODEL } from "../src/experiment-config";
import { saveRunRecord, type ExperimentRunRecord } from "../src/records";

loadEnvLocal();

it(
  "B v2 calibration: one buyer-decision call per frozen fixture (3 calls)",
  async () => {
    const instructionId = process.env.BDQ_INSTRUCTION_ID?.trim();
    expect(
      instructionId,
      "B v2 calibration requires BDQ_INSTRUCTION_ID=condition-b-v2",
    ).toBe("condition-b-v2");

    const fixtures = listFixtureIds();
    expect(fixtures, "three frozen fixtures").toHaveLength(3);
    const instruction = loadConditionBInstruction("condition-b-v2");
    const records: ExperimentRunRecord[] = [];
    let totalCalls = 0;

    for (const fixtureId of fixtures) {
      const fixture = loadFixture(fixtureId);
      const result = await runConditionB({
        fixture,
        instruction,
        model: LUNA_MODEL,
        runKind: "initial",
      });
      totalCalls += result.attempts;
      const filePath = saveRunRecord(result.record);
      records.push(result.record);
      console.log(
        `[b-v2] ${fixtureId} → ${result.record.status} valid=${result.record.output.valid} ` +
          `issues=${result.record.output.validation_issues.length} calls=${result.attempts} (${filePath})`,
      );
    }

    expect(totalCalls, "exactly three scheduled B v2 calls").toBe(3);
    expect(records).toHaveLength(3);
    for (const record of records) {
      expect(record.condition).toBe("B");
      expect(record.instruction.id).toBe("condition-b-v2");
      expect(record.instruction.version).toBe("condition-b-v2");
      expect(record.status, `B v2/${record.fixture_id} must complete`).toBe("completed");
      expect(
        record.output.valid,
        `B v2/${record.fixture_id} contract issues:\n` +
          record.output.validation_issues.map((issue) => `- ${issue.message}`).join("\n"),
      ).toBe(true);
      expect(record.provenance_errors).toEqual([]);
      expect(record.model.requested).toBe(LUNA_MODEL);
      expect(record.model.returned).toBe(LUNA_MODEL);
      expect(record.http.calls_made).toBe(1);
    }

    console.log(
      `\nB V2 CALIBRATION SUMMARY (${records.length} records, ${totalCalls} calls)\n` +
        JSON.stringify(
          records.map((record) => ({
            fixture: record.fixture_id,
            role: fixtures.find((fixtureId) => fixtureId === record.fixture_id),
            status: record.status,
            instruction: record.instruction.version,
            requested_model: record.model.requested,
            returned_model: record.model.returned,
            latency_ms: record.latency_ms,
            unnamed: record.output.classification.unnamed,
            named: record.output.classification.named,
            issues: record.output.validation_issues.length,
            provenance_errors: record.provenance_errors,
          })),
          null,
          2,
        ),
    );
  },
  600_000,
);
