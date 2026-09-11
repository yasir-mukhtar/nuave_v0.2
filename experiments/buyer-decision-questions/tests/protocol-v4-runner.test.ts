import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildPayload, callStage, finalSchema, plannerSchema, sha256, validatePlan } from "../protocol-v4/runner";

const fixture = { fixture_id: "test-fixture", business: { brand_name: "Test Bisnis", entity_scope: "Jakarta" } };
const plan = { intents: Array.from({ length: 10 }, (_, n) => ({ decision: `decision ${n}`, evidence_refs: ["business.entity_scope"], identity_mode: n < 6 ? "unnamed" : "named", required_scope: "Jakarta", intended_measurement: "evaluation", comparison_target: n === 0 ? "alternatif lain" : n === 6 ? "Pembanding" : null, rationale: "supported" })), limitations: [] };
const final = { questions: Array.from({ length: 10 }, (_, n) => ({ text: `Pertanyaan ${n}?`, intended_measurement: "evaluation", identity_mode: n < 6 ? "unnamed" : "named", comparison_mode: n === 0 ? "unnamed" : n === 6 ? "named" : "none", evidence_refs: ["business.entity_scope"] })), limitations: [] };
function response(value: unknown, model = "gpt-5.6-luna") { return new Response(JSON.stringify({ status: "completed", id: "resp_test", model, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 }, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] }), { status: 200, headers: { "content-type": "application/json" } }); }

describe("protocol-v4 execution contract", () => {
  it("routes planner and final stages to distinct schemas and instructions", () => {
    const p = buildPayload("planner", fixture); const r = buildPayload("realizer", fixture, plan);
    const pFormat = (p.payload.text as { format: { schema: unknown; name: string } }).format;
    const rFormat = (r.payload.text as { format: { schema: unknown; name: string } }).format;
    expect(pFormat.schema).toEqual(plannerSchema); expect(pFormat.name).toContain("plan");
    expect(rFormat.schema).toEqual(finalSchema); expect(rFormat.name).toContain("final");
    const realizerUser = JSON.parse((r.payload.input as Array<{ content: string }>)[1].content);
    expect(realizerUser.plan).toEqual(plan);
    expect(p.instruction).toContain("Do not write customer questions"); expect(r.instruction).toContain("validated intent plan");
  });
  it("rejects question-shaped plans before making a realizer request", async () => {
    let calls = 0; const dir = mkdtempSync(path.join(tmpdir(), "v4-plan-"));
    try { const result = await callStage({ stage: "realizer", fixture, fixtureId: "test", fixtureSha: "f".repeat(64), runId: "blocked", plan: { questions: [] }, fetcher: async () => { calls++; return response(final); }, resultsDir: dir }); expect(result.status).toBe("failed"); expect(result.attempts).toBe(0); expect(calls).toBe(0); } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("persists exact request provenance before the intercepted request and preserves validated parent identity", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "v4-provenance-")); let sawPre = false;
    try { const result = await callStage({ stage: "planner", fixture, fixtureId: "test", fixtureSha: "f".repeat(64), runId: "planner-one", fetcher: async () => { sawPre = existsSync(path.join(dir, "attempts", "planner-one-planner.json")); return response(plan); }, resultsDir: dir }); expect(sawPre).toBe(true); expect(result.status).toBe("completed"); const pre = JSON.parse(readFileSync(path.join(dir, "attempts", "planner-one-planner.json"), "utf8")); expect(pre.request_body_sha256).toBe(sha256(JSON.stringify(pre.request_body))); expect(pre.instruction_text).toContain("Do not write customer questions"); } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("makes provider identity mismatch a failed outcome", async () => { const dir = mkdtempSync(path.join(tmpdir(), "v4-mismatch-")); try { const result = await callStage({ stage: "planner", fixture, fixtureId: "test", fixtureSha: "f".repeat(64), runId: "mismatch", fetcher: async () => response(plan, "other-model"), resultsDir: dir }); expect(result.status).toBe("failed"); expect((result.provenance_errors as string[]).join(" ")).toContain("returned model"); } finally { rmSync(dir, { recursive: true, force: true }); } });
  it("validates composition separately from semantic review", () => { expect(validatePlan(plan)).toEqual([]); expect(validatePlan({ ...plan, intents: plan.intents.slice(0, 9) })).toContain("plan must contain exactly 10 intents"); });
});
