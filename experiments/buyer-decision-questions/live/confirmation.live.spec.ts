/**
 * LIVE RUN — confirmation: condition B generated once more on the two
 * held-out fixtures (two calls). It must reuse the frozen B instruction and
 * the Luna model with unchanged settings, so a confirmation result can only
 * be compared against the initial runs when the instruction is still the
 * frozen one (enforced by the loader hash check) and the model is still
 * Luna (enforced by the runner).
 *
 *   npx vitest run --config experiments/buyer-decision-questions/vitest.live.config.mts confirmation
 */
import { expect, it } from "vitest";
import { loadEnvLocal } from "../src/env";
import { fixtureIdsForRole, loadConditionBInstruction, loadFixture } from "../src/loaders";
import { runConditionB } from "../src/condition-b";
import { LUNA_MODEL } from "../src/experiment-config";
import { saveRunRecord, type ExperimentRunRecord } from "../src/records";

loadEnvLocal();

// Same instruction-version switch as initial.live.spec.ts: v1 by default,
// v2 only when BDQ_INSTRUCTION_ID=condition-b-v2 is explicitly requested.
const B_INSTRUCTION_ID = process.env.BDQ_INSTRUCTION_ID?.trim() ?? "condition-b-v1";

it(
  "confirmation: condition B on the two held-out fixtures with the frozen instruction (2 calls)",
  async () => {
    const heldOut = fixtureIdsForRole("held-out");
    expect(heldOut, "exactly two held-out fixtures").toHaveLength(2);

    const instruction = loadConditionBInstruction(B_INSTRUCTION_ID);
    const records: ExperimentRunRecord[] = [];
    let totalCalls = 0;

    for (const fixtureId of heldOut) {
      const fixture = loadFixture(fixtureId);
      const b = await runConditionB({
        fixture,
        instruction,
        model: LUNA_MODEL,
        runKind: "confirmation",
      });
      totalCalls += b.attempts;
      const filePath = saveRunRecord(b.record);
      records.push(b.record);
      console.log(
        `[confirmation] B  ${fixtureId} → ${b.record.status} valid=${b.record.output.valid} issues=${b.record.output.validation_issues.length} calls=${b.attempts} (${filePath})`,
      );
    }

    expect(totalCalls, "exactly two scheduled confirmation calls").toBe(2);
    for (const record of records) {
      expect(record.status, `B/${record.fixture_id} must complete`).toBe("completed");
      expect(
        record.output.valid,
        `B/${record.fixture_id} must satisfy its contract (count 10, 6/4 composition, no duplicates, coverage)` +
          `\n${record.output.validation_issues.map((issue) => `- ${issue.message}`).join("\n")}`,
      ).toBe(true);
      expect(record.provenance_errors, `B/${record.fixture_id} model identity`).toEqual([]);
      expect(
        record.instruction.sha256,
        `B/${record.fixture_id} must reuse the frozen instruction`,
      ).toBe(instruction.sha256);
      expect(record.model.requested, `B/${record.fixture_id} must request Luna`).toBe(LUNA_MODEL);
    }

    console.log(
      `\nCONFIRMATION SUMMARY (${records.length} records, ${totalCalls} calls)\n${JSON.stringify(
        records.map((record) => ({
          fixture: record.fixture_id,
          status: record.status,
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
      )}`,
    );
  },
  300_000,
);
