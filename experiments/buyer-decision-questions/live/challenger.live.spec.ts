/**
 * LIVE RUN — optional challenger: condition B on the two held-out fixtures
 * using GPT-5.6 Terra instead of Luna, IF the existing provider supports it.
 *
 *   npx vitest run --config experiments/buyer-decision-questions/vitest.live.config.mts challenger
 *
 * The actual model identifier is verified, never assumed: the provider's
 * returned model must equal the requested identifier (EXPERIMENT_BDQ_TERRA_MODEL
 * or the default "gpt-5.6-terra"); any mismatch fails the run and is recorded
 * as a provenance error. The instruction and every other generation setting
 * are unchanged from condition B — only the model identifier differs, and
 * that difference is recorded per run.
 */
import { expect, it } from "vitest";
import { loadEnvLocal } from "../src/env";
import { fixtureIdsForRole, loadConditionBInstruction, loadFixture } from "../src/loaders";
import { runConditionB } from "../src/condition-b";
import { TERRA_MODEL_DEFAULT, TERRA_MODEL_ENV } from "../src/experiment-config";
import { saveRunRecord, type ExperimentRunRecord } from "../src/records";

loadEnvLocal();

it(
  "challenger: condition B on held-out fixtures with the Terra identifier (2 calls, identifier verified)",
  async () => {
    const heldOut = fixtureIdsForRole("held-out");
    expect(heldOut, "exactly two held-out fixtures").toHaveLength(2);

    const terraModel = process.env[TERRA_MODEL_ENV]?.trim() || TERRA_MODEL_DEFAULT;
    const instruction = loadConditionBInstruction();
    const records: ExperimentRunRecord[] = [];
    let totalCalls = 0;

    for (const fixtureId of heldOut) {
      const fixture = loadFixture(fixtureId);
      const b = await runConditionB({
        fixture,
        instruction,
        model: terraModel,
        runKind: "challenger",
      });
      totalCalls += b.attempts;
      const filePath = saveRunRecord(b.record);
      records.push(b.record);
      console.log(
        `[challenger] B  ${fixtureId} → ${b.record.status} requested=${b.record.model.requested} returned=${b.record.model.returned} valid=${b.record.output.valid} calls=${b.attempts} (${filePath})`,
      );
    }

    expect(totalCalls, "exactly two scheduled challenger calls").toBe(2);
    for (const record of records) {
      expect(record.status, `B/${record.fixture_id} must complete`).toBe("completed");
      expect(record.model.requested, `B/${record.fixture_id} requested identifier`).toBe(terraModel);
      expect(
        record.provenance_errors,
        `B/${record.fixture_id}: the returned model identifier must equal the requested ${terraModel}; ` +
          `never silently substitute another model.`,
      ).toEqual([]);
      expect(
        record.output.valid,
        `B/${record.fixture_id} must satisfy its contract` +
          `\n${record.output.validation_issues.map((issue) => `- ${issue.message}`).join("\n")}`,
      ).toBe(true);
      expect(
        record.instruction.sha256,
        `B/${record.fixture_id} must reuse the frozen instruction`,
      ).toBe(instruction.sha256);
      expect(
        record.settings,
        `B/${record.fixture_id} generation settings must match condition B except the model identifier`,
      ).toMatchObject({
        reasoning_effort: "low",
        service_tier: "default",
        text_verbosity: "low",
        web_search_tools: false,
      });
    }

    console.log(
      `\nCHALLENGER SUMMARY (${records.length} records, ${totalCalls} calls, identifier ${terraModel})\n${JSON.stringify(
        records.map((record) => ({
          fixture: record.fixture_id,
          status: record.status,
          requested_model: record.model.requested,
          returned_model: record.model.returned,
          response_id: record.model.response_id,
          latency_ms: record.latency_ms,
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
