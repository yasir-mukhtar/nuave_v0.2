/**
 * AUTHORIZED STAGE 1 — protocol-v3 screen.
 *
 * Exactly one S call per fixture and one planner + one realizer call per
 * fixture. No retries, repairs, ranking, or replacement runs. Results are
 * additive under protocol-v3/results and remain separate from historical BDQ.
 */
import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvLocal } from "../src/env";
import { LUNA_MODEL, OPENCODEGO_CREDENTIAL_VAR, RESPONSES_ENDPOINT, requestTimeoutMs } from "../src/experiment-config";
import { extractResponsesUsage, instrumentedFetch, postResponses, assertLiveRunAllowed } from "../src/provider-io";

const ROOT = path.resolve(process.cwd(), "experiments/buyer-decision-questions/protocol-v3");
const FIXTURES = path.join(ROOT, "fixtures");
const RESULTS = path.join(ROOT, "results");
const CONTRACT = JSON.parse(readFileSync(path.join(ROOT, "contract.json"), "utf8"));
const OUTPUT_SCHEMA = JSON.parse(readFileSync(path.join(ROOT, "output-schema.json"), "utf8"));
const S_INSTRUCTION = readFileSync(path.join(ROOT, "instruction-s.md"), "utf8");
const P_INSTRUCTION = readFileSync(path.join(ROOT, "instruction-p.md"), "utf8");

function fixtureFiles(): string[] {
  return JSON.parse(readFileSync(path.join(FIXTURES, "manifest.json"), "utf8")).fixtures
    .map((entry: { file: string }) => entry.file).sort();
}

function outputText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  for (const item of (body as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }).output ?? []) {
    for (const part of item.content ?? []) if (part.type === "output_text" && typeof part.text === "string") return part.text;
  }
  return "";
}

function parseJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

function validatePack(value: unknown): string[] {
  const issues: string[] = [];
  if (!value || typeof value !== "object") return ["output is not an object"];
  const record = value as { questions?: unknown; limitations?: unknown };
  const questions = Array.isArray(record.questions) ? record.questions : [];
  if (!Array.isArray(record.questions) || questions.length !== 10) issues.push("questions must contain exactly 10 items");
  for (const [index, question] of questions.entries()) {
    if (!question || typeof question !== "object") { issues.push(`question ${index + 1} is not an object`); continue; }
    const q = question as Record<string, unknown>;
    for (const field of ["text", "intended_measurement", "identity_mode", "comparison_mode", "evidence_refs"]) if (!(field in q)) issues.push(`question ${index + 1} missing ${field}`);
    if (typeof q.text !== "string" || !q.text.trim()) issues.push(`question ${index + 1} has empty text`);
    if (q.identity_mode !== "named" && q.identity_mode !== "unnamed") issues.push(`question ${index + 1} has invalid identity_mode`);
    if (!["none", "unnamed", "named"].includes(String(q.comparison_mode))) issues.push(`question ${index + 1} has invalid comparison_mode`);
    if (!Array.isArray(q.evidence_refs)) issues.push(`question ${index + 1} evidence_refs is not an array`);
  }
  if (!Array.isArray(record.limitations)) issues.push("limitations must be an array");
  return issues;
}

function runId(arm: "S" | "P", fixtureId: string): string {
  return `stage1-${arm}-${fixtureId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function call(label: string, instruction: string, user: unknown): Promise<Record<string, unknown>> {
  const instrumented = instrumentedFetch();
  const started = Date.now();
  try {
    const response = await postResponses({
      model: LUNA_MODEL,
      reasoning: { effort: "low" },
      store: false,
      service_tier: "default",
      max_output_tokens: 4096,
      text: { format: { type: "json_schema", name: "nuave_buyer_decision_v3", schema: OUTPUT_SCHEMA, strict: true }, verbosity: "low" },
      input: [{ role: "developer", content: instruction }, { role: "user", content: JSON.stringify(user) }],
    }, instrumented.fetcher);
    const usage = extractResponsesUsage(response.body);
    const text = outputText(response.body);
    return { label, status: "completed", http_status: response.http_status, latency_ms: Date.now() - started, attempts: instrumented.attempts(), raw_response: response.body, output_text: text, parsed_output: parseJson(text), usage };
  } catch (error) {
    return { label, status: "failed", http_status: null, latency_ms: Date.now() - started, attempts: instrumented.attempts(), raw_response: null, output_text: "", parsed_output: null, usage: null, error: error instanceof Error ? error.message : "unknown provider error" };
  }
}

function save(record: Record<string, unknown>): void {
  mkdirSync(RESULTS, { recursive: true });
  const file = path.join(RESULTS, `${record.run_id}.json`);
  if (existsSync(file)) throw new Error(`Refusing to overwrite ${file}`);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

describe("protocol-v3 Stage 1 authorized generation", () => {
  it("runs the frozen screen with no retries or substitutions", async () => {
    loadEnvLocal();
    assertLiveRunAllowed();
    expect(process.env.OPENAI_AUDIT_MODEL?.trim() || LUNA_MODEL).toBe(LUNA_MODEL);
    expect(process.env.OPENAI_AUDIT_REASONING_EFFORT?.trim() || "low").toBe("low");
    expect(OPENCODEGO_CREDENTIAL_VAR).toBe("OPENCODEGO_API_KEY");
    expect(RESPONSES_ENDPOINT).toContain("opencode.ai");
    expect(requestTimeoutMs()).toBeGreaterThan(0);
    const files = fixtureFiles();
    expect(files).toHaveLength(8);
    const existingStage1 = existsSync(RESULTS)
      ? readdirSync(RESULTS).filter((file) => file.startsWith("stage1-") && file.endsWith(".json"))
      : [];
    expect(existingStage1, "Stage 1 must not create replacement runs").toHaveLength(0);
    const attempted: Record<string, unknown>[] = [];
    for (const file of files) {
      const fixture = JSON.parse(readFileSync(path.join(FIXTURES, file), "utf8"));
      const base = { protocol: "protocol-v3", fixture, contract: CONTRACT.version, model: LUNA_MODEL, settings: { reasoning_effort: "low", web_search_tools: false, retries: 0, ranking: false, repairs: false } };
      const sRun = { schema: "nuave-buyer-decision-stage1-record-v1", run_id: runId("S", fixture.fixture_id), arm: "S", fixture_id: fixture.fixture_id, fixture_file: file, started_at: new Date().toISOString(), calls: [] as Record<string, unknown>[], ...base };
      const sCall = await call("one-shot", S_INSTRUCTION, { brief: fixture, contract: CONTRACT, final_output_contract: OUTPUT_SCHEMA });
      sRun.calls.push(sCall); attempted.push(sRun); save({ ...sRun, status: sCall.status === "completed" && validatePack(sCall.parsed_output).length === 0 ? "completed" : "failed", validation_issues: validatePack(sCall.parsed_output), completed_at: new Date().toISOString() });

      const pRun = { schema: "nuave-buyer-decision-stage1-record-v1", run_id: runId("P", fixture.fixture_id), arm: "P", fixture_id: fixture.fixture_id, fixture_file: file, started_at: new Date().toISOString(), calls: [] as Record<string, unknown>[], ...base };
      const planCall = await call("planner", P_INSTRUCTION, { brief: fixture, contract: CONTRACT, task: "Return a JSON plan with exactly ten supported intents; include evidence_refs, identity_mode, scope_needed, intended_measurement, comparison_target, and limitations." });
      pRun.calls.push(planCall);
      let realization: Record<string, unknown> | null = null;
      if (planCall.status === "completed" && planCall.parsed_output) {
        realization = await call("realizer", P_INSTRUCTION, { brief: fixture, contract: CONTRACT, final_output_contract: OUTPUT_SCHEMA, plan: planCall.parsed_output });
        pRun.calls.push(realization);
      }
      const finalIssues = realization ? validatePack(realization.parsed_output) : ["planner failed; realizer was not attempted"];
      attempted.push(pRun); save({ ...pRun, raw_plan: planCall.parsed_output, status: realization?.status === "completed" && finalIssues.length === 0 ? "completed" : "failed", validation_issues: finalIssues, completed_at: new Date().toISOString() });
    }
    expect(attempted).toHaveLength(16);
    const calls = attempted.reduce((total, record) => total + (record.calls as unknown[]).length, 0);
    expect(calls).toBeLessThanOrEqual(24);
    console.log(`STAGE1 SUMMARY records=${attempted.length} calls=${calls} results=${RESULTS}`);
  }, 1_800_000);
});
