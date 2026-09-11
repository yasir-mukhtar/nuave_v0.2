import { expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvLocal } from "../src/env";
import { assertLiveRunAllowed } from "../src/provider-io";
import { LUNA_MODEL } from "../src/experiment-config";
import { callStage, ROOT, RESULTS, sha256, parse, verifyManifest, validatePlan, validateFinal } from "../protocol-v4/runner";
import { OPENCODEGO_CREDENTIAL_VAR, RESPONSES_ENDPOINT } from "../src/experiment-config";

function writeOnce(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  if (existsSync(file)) throw new Error(`Refusing to overwrite ${file}`);
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function fixtureEntries(): Array<{ fixture_id: string; file: string; sha256: string }> { return parse("manifest.json").fixtures; }

it("clean protocol-v4 Stage 1: 8 S packs + 8 planner-realizer sequences", async () => {
  loadEnvLocal();
  verifyManifest();
  assertLiveRunAllowed();
  expect(process.env.OPENAI_AUDIT_MODEL?.trim() || LUNA_MODEL).toBe(LUNA_MODEL);
  expect(process.env.OPENAI_AUDIT_REASONING_EFFORT?.trim() || "low").toBe("low");
  expect(OPENCODEGO_CREDENTIAL_VAR).toBe("OPENCODEGO_API_KEY");
  expect(RESPONSES_ENDPOINT).toContain("opencode.ai");
  const existing = existsSync(RESULTS) ? readdirSync(RESULTS).filter((x) => x.endsWith(".json") || x === "attempts") : [];
  expect(existing, "clean restart cannot overwrite any prior protocol-v4 execution").toHaveLength(0);
  const entries = fixtureEntries();
  expect(entries).toHaveLength(8);
  let calls = 0;
  for (const [fixtureIndex, entry] of entries.entries()) {
    const fixture = JSON.parse(readFileSync(path.join(ROOT, entry.file), "utf8"));
    const sId = `clean-stage1-S-${fixture.fixture_id}`;
    const s = await callStage({ stage: "one-shot", fixture, fixtureId: fixture.fixture_id, fixtureSha: entry.sha256, runId: sId });
    calls += 1;
    writeOnce(path.join(RESULTS, `${sId}.json`), { schema: "nuave-buyer-decision-v4-pack-v1", protocol: "protocol-v4", arm: "S", fixture_id: fixture.fixture_id, fixture_sha256: entry.sha256, result: s, semantic_review: "pending" });

    const pId = `clean-stage1-P-${fixture.fixture_id}`;
    const plan = await callStage({ stage: "planner", fixture, fixtureId: fixture.fixture_id, fixtureSha: entry.sha256, runId: pId });
    calls += 1;
    writeOnce(path.join(RESULTS, "plans", `${pId}.json`), { schema: "nuave-buyer-decision-v4-plan-result-v1", protocol: "protocol-v4", fixture_id: fixture.fixture_id, fixture_sha256: entry.sha256, result: plan });
    if (plan.status !== "completed" || validatePlan(plan.parsed_output).length) {
      writeOnce(path.join(RESULTS, `${pId}.json`), { schema: "nuave-buyer-decision-v4-pack-v1", protocol: "protocol-v4", arm: "P", fixture_id: fixture.fixture_id, fixture_sha256: entry.sha256, planner: plan, realizer: null, status: "failed", semantic_review: "pending" });
      continue;
    }
    const planSha = sha256(JSON.stringify(plan.parsed_output));
    const realizer = await callStage({ stage: "realizer", fixture, fixtureId: fixture.fixture_id, fixtureSha: entry.sha256, runId: pId, plan: plan.parsed_output, planSha });
    calls += 1;
    writeOnce(path.join(RESULTS, `${pId}.json`), { schema: "nuave-buyer-decision-v4-pack-v1", protocol: "protocol-v4", arm: "P", fixture_id: fixture.fixture_id, fixture_sha256: entry.sha256, planner: plan, plan_sha256: planSha, realizer, final_validation_issues: validateFinal(realizer.parsed_output), status: realizer.status === "completed" ? "completed" : "failed", semantic_review: "pending" });

    if (fixtureIndex === 0) {
      const attemptFiles = readdirSync(path.join(RESULTS, "attempts"));
      expect(attemptFiles).toContain(`${sId}-one-shot.json`);
      expect(attemptFiles).toContain(`${pId}-planner.json`);
      expect(attemptFiles).toContain(`${pId}-realizer.json`);
      const prePlan = JSON.parse(readFileSync(path.join(RESULTS, "attempts", `${pId}-planner.json`), "utf8"));
      const preRealizer = JSON.parse(readFileSync(path.join(RESULTS, "attempts", `${pId}-realizer.json`), "utf8"));
      expect(prePlan.stage).toBe("planner"); expect(prePlan.output_schema.$id).toContain("plan");
      expect(preRealizer.stage).toBe("realizer"); expect(preRealizer.output_schema.$id).toContain("final");
      expect(preRealizer.parent_plan_sha256).toBe(planSha);
      expect(preRealizer.persisted_before_request).toBe(true);
    }
  }
  expect(calls).toBeLessThanOrEqual(24);
  expect(readdirSync(RESULTS).filter((x) => x.startsWith("clean-stage1-") && x.endsWith(".json"))).toHaveLength(16);
  console.log(`CLEAN STAGE1 COMPLETE: 16 packs, ${calls} calls, results=${RESULTS}`);
}, 1_800_000);
