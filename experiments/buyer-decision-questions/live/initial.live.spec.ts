/**
 * LIVE RUN — initial comparison: three fixtures × two conditions (A and B) =
 * six generation calls on the Luna model via the existing OpenCode Go
 * provider and credential.
 *
 * This spec performs PAID provider calls. Run it explicitly:
 *
 *   npx vitest run --config experiments/buyer-decision-questions/vitest.live.config.mts initial
 *
 * Guardrails: refuses to run without EXPERIMENT_BDQ_LIVE=1 and the
 * OPENCODEGO_API_KEY credential (zero calls otherwise); one call per
 * scheduled condition and fixture; no best-of selection, no hidden retries;
 * results are saved under fresh run ids and never overwrite existing
 * results. Condition A drifts with the production writer instruction by
 * design; any drift from the freeze-time snapshot is reported loudly.
 */
import { expect, it } from "vitest";
import { loadEnvLocal } from "../src/env";
import { loadFixture, loadConditionBInstruction, loadConditionASnapshot, listFixtureIds } from "../src/loaders";
import { runConditionA } from "../src/condition-a";
import { runConditionB } from "../src/condition-b";
import { LUNA_MODEL } from "../src/experiment-config";
import { saveRunRecord, type ExperimentRunRecord } from "../src/records";

loadEnvLocal();

// The same harness drives condition B v1 (frozen, already live-run) and the
// calibration revision v2. v2 is used ONLY when explicitly requested with
// BDQ_INSTRUCTION_ID=condition-b-v2; the default remains v1 so historical
// reruns reproduce the exact original instruction.
const B_INSTRUCTION_ID = process.env.BDQ_INSTRUCTION_ID?.trim() ?? "condition-b-v1";

it(
  "initial comparison: 3 fixtures × (A current writer, B buyer-decision) on gpt-5.6-luna",
  async () => {
    const fixtures = listFixtureIds();
    expect(fixtures, "three frozen fixtures").toHaveLength(3);

    const instruction = loadConditionBInstruction(B_INSTRUCTION_ID);
    const aSnapshot = loadConditionASnapshot();
    const records: ExperimentRunRecord[] = [];
    let totalCalls = 0;

    for (const fixtureId of fixtures) {
      const fixture = loadFixture(fixtureId);

      const a = await runConditionA({ fixture, runKind: "initial" });
      totalCalls += a.attempts;
      const aFile = saveRunRecord(a.record);
      records.push(a.record);
      console.log(
        `[initial] A  ${fixtureId} → ${a.record.status} source=${a.record.output.source} calls=${a.attempts} (${aFile})`,
      );
      if (aSnapshot && a.record.instruction.sha256 !== aSnapshot.instruction_sha256) {
        console.warn(
          `[initial] NOTE: production question-writer instruction drifted since the experiment freeze ` +
            `(snapshot ${aSnapshot.captured_at} hash ${aSnapshot.instruction_sha256.slice(0, 12)}…, ` +
            `current ${a.record.instruction.sha256.slice(0, 12)}…). Condition A now compares against the CURRENT writer.`,
        );
      }

      const b = await runConditionB({
        fixture,
        instruction,
        model: LUNA_MODEL,
        runKind: "initial",
      });
      totalCalls += b.attempts;
      const bFile = saveRunRecord(b.record);
      records.push(b.record);
      console.log(
        `[initial] B  ${fixtureId} → ${b.record.status} valid=${b.record.output.valid} issues=${b.record.output.validation_issues.length} calls=${b.attempts} (${bFile})`,
      );
    }

    expect(totalCalls, "exactly six scheduled generation calls").toBe(6);
    expect(records).toHaveLength(6);

    for (const record of records) {
      expect(
        record.status,
        `${record.condition}/${record.fixture_id} must not hard-fail`,
      ).not.toBe("failed");
      if (record.condition === "B") {
        expect(
          record.status,
          `B/${record.fixture_id} must complete (no provider failure)`,
        ).toBe("completed");
        expect(
          record.output.valid,
          `B/${record.fixture_id} must satisfy its contract (count 10, 6/4 composition, no duplicates, coverage)` +
            `\n${record.output.validation_issues.map((issue) => `- ${issue.message}`).join("\n")}`,
        ).toBe(true);
        expect(
          record.provenance_errors,
          `B/${record.fixture_id} model identity must be verified`,
        ).toEqual([]);
      }
    }

    const summary = records.map((record) => ({
      condition: record.condition,
      fixture: record.fixture_id,
      status: record.status,
      source: record.output.source,
      warnings: record.output.warnings,
      requested_model: record.model.requested,
      returned_model: record.model.returned,
      latency_ms: record.latency_ms,
      unnamed: record.output.classification.unnamed,
      named: record.output.classification.named,
      b_issues: record.output.validation_issues.length,
      provenance_errors: record.provenance_errors,
    }));
    console.log(`\nINITIAL RUN SUMMARY (${records.length} records, ${totalCalls} calls)\n${JSON.stringify(summary, null, 2)}`);
  },
  600_000,
);
