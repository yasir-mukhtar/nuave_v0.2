import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extractResponsesUsage, postResponses, instrumentedFetch, type CapturingFetch } from "../src/provider-io";
import { LUNA_MODEL, RESPONSES_ENDPOINT } from "../src/experiment-config";

export type Stage = "one-shot" | "planner" | "realizer";
export const ROOT = path.resolve(process.cwd(), "experiments/buyer-decision-questions/protocol-v4");
export const RESULTS = path.join(ROOT, "results");
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
export const parse = (file: string) => JSON.parse(read(file));
export const finalSchema = parse("final-schema.json");
export const plannerSchema = parse("planner-schema.json");
export const settings = parse("manifest.json").settings;

export function verifyManifest(): void {
  const manifest = parse("manifest.json");
  for (const entry of manifest.files) {
    if (sha256(read(entry.file)) !== entry.sha256) throw new Error(`Manifest hash mismatch: ${entry.file}`);
  }
  for (const entry of manifest.fixtures) {
    if (sha256(read(entry.file)) !== entry.sha256) throw new Error(`Fixture hash mismatch: ${entry.fixture_id}`);
  }
}

export function outputText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  for (const item of (body as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }).output ?? []) {
    for (const part of item.content ?? []) if (part.type === "output_text" && typeof part.text === "string") return part.text;
  }
  return "";
}

export function validatePlan(value: unknown): string[] {
  const issues: string[] = [];
  if (!value || typeof value !== "object") return ["plan is not an object"];
  const p = value as Record<string, unknown>;
  if ("questions" in p) issues.push("question-shaped output is not an intermediate plan");
  const intents = Array.isArray(p.intents) ? p.intents : [];
  if (intents.length !== 10) issues.push("plan must contain exactly 10 intents");
  let named = 0; let unnamed = 0; let namedComparison = 0; let unnamedComparison = 0;
  for (const [index, raw] of intents.entries()) {
    if (!raw || typeof raw !== "object") { issues.push(`intent ${index + 1} is not an object`); continue; }
    const i = raw as Record<string, unknown>;
    for (const key of ["decision", "evidence_refs", "identity_mode", "required_scope", "intended_measurement", "comparison_target", "rationale"]) if (!(key in i)) issues.push(`intent ${index + 1} missing ${key}`);
    if (typeof i.decision !== "string" || !i.decision.trim()) issues.push(`intent ${index + 1} has no decision`);
    if (i.identity_mode === "named") named++; else if (i.identity_mode === "unnamed") unnamed++; else issues.push(`intent ${index + 1} has invalid identity_mode`);
    if (i.comparison_target !== null && typeof i.comparison_target === "string" && i.comparison_target.trim()) {
      if (i.identity_mode === "named") namedComparison++; else unnamedComparison++;
    }
    if ("text" in i) issues.push(`intent ${index + 1} contains final question text`);
  }
  if (named !== 4 || unnamed !== 6) issues.push(`plan composition must be 6 unnamed + 4 named, found ${unnamed} + ${named}`);
  if (namedComparison < 1 || unnamedComparison < 1) issues.push("plan must include named and unnamed comparisons");
  if (!Array.isArray(p.limitations)) issues.push("plan limitations must be an array");
  return issues;
}

export function validateFinal(value: unknown): string[] {
  const issues: string[] = [];
  if (!value || typeof value !== "object") return ["final output is not an object"];
  const p = value as Record<string, unknown>;
  const questions = Array.isArray(p.questions) ? p.questions : [];
  if (questions.length !== 10) issues.push("final output must contain exactly 10 questions");
  let named = 0; let unnamed = 0; let namedComparison = 0; let unnamedComparison = 0;
  for (const [index, raw] of questions.entries()) {
    if (!raw || typeof raw !== "object") { issues.push(`question ${index + 1} is not an object`); continue; }
    const q = raw as Record<string, unknown>;
    for (const key of ["text", "intended_measurement", "identity_mode", "comparison_mode", "evidence_refs"]) if (!(key in q)) issues.push(`question ${index + 1} missing ${key}`);
    if (typeof q.text !== "string" || !q.text.trim()) issues.push(`question ${index + 1} has empty text`);
    if (q.identity_mode === "named") named++; else if (q.identity_mode === "unnamed") unnamed++; else issues.push(`question ${index + 1} has invalid identity_mode`);
    if (q.comparison_mode === "named") namedComparison++; else if (q.comparison_mode === "unnamed") unnamedComparison++;
  }
  if (named !== 4 || unnamed !== 6) issues.push(`final composition must be 6 unnamed + 4 named, found ${unnamed} + ${named}`);
  if (namedComparison < 1 || unnamedComparison < 1) issues.push("final output must include named and unnamed comparisons");
  if (!Array.isArray(p.limitations)) issues.push("final limitations must be an array");
  return issues;
}

export function buildPayload(stage: Stage, fixture: unknown, plan?: unknown): { payload: Record<string, unknown>; schema: unknown; instruction: string } {
  const instructionFile = stage === "one-shot" ? "instruction-s.md" : stage === "planner" ? "instruction-planner.md" : "instruction-realizer.md";
  const instruction = read(instructionFile);
  const schema = stage === "planner" ? plannerSchema : finalSchema;
  const user = stage === "realizer" ? { brief: fixture, plan, final_output_contract: finalSchema } : { brief: fixture, contract: parse("contract.json"), final_output_contract: stage === "one-shot" ? finalSchema : undefined, task: stage === "planner" ? "Return only the intermediate intent plan." : undefined };
  return { schema, instruction, payload: { model: LUNA_MODEL, reasoning: { effort: "low" }, store: false, service_tier: "default", max_output_tokens: 4096, text: { format: { type: "json_schema", name: stage === "planner" ? "nuave_buyer_decision_v4_plan" : "nuave_buyer_decision_v4_final", schema, strict: true }, verbosity: "low" }, input: [{ role: "developer", content: instruction }, { role: "user", content: JSON.stringify(user) }] } };
}

export async function callStage(input: { stage: Stage; fixture: unknown; fixtureId: string; fixtureSha: string; runId: string; plan?: unknown; planSha?: string; fetcher?: CapturingFetch; resultsDir?: string }): Promise<Record<string, unknown>> {
  if (input.stage === "realizer") {
    const planIssues = validatePlan(input.plan);
    if (planIssues.length) {
      return { stage: input.stage, status: "failed", attempts: 0, raw_response: null, output_text: "", parsed_output: null, usage: null, validation_issues: planIssues, provenance_errors: ["validated plan rejected; realizer request not sent"], parent_plan_sha256: input.planSha ?? null };
    }
  }
  const built = buildPayload(input.stage, input.fixture, input.plan);
  const body = JSON.stringify(built.payload);
  const attemptId = `${input.runId}-${input.stage}`;
  const resultDir = input.resultsDir ?? RESULTS;
  mkdirSync(path.join(resultDir, "attempts"), { recursive: true });
  const attemptPath = path.join(resultDir, "attempts", `${attemptId}.json`);
  if (existsSync(attemptPath)) throw new Error(`Refusing to overwrite attempt ${attemptId}`);
  const pre = { schema: "nuave-buyer-decision-v4-attempt-v1", attempt_id: attemptId, run_id: input.runId, stage: input.stage, fixture_id: input.fixtureId, fixture_sha256: input.fixtureSha, instruction_sha256: sha256(built.instruction), instruction_text: built.instruction, schema_sha256: sha256(JSON.stringify(built.schema)), output_schema: built.schema, settings, parent_plan_sha256: input.planSha ?? null, request_body: built.payload, request_body_sha256: sha256(body), persisted_before_request: true };
  writeFileSync(attemptPath, `${JSON.stringify(pre, null, 2)}\n`, "utf8");
  const instrumented = instrumentedFetch(input.fetcher);
  const started = Date.now();
  try {
    const response = await postResponses(built.payload, instrumented.fetcher);
    const usage = extractResponsesUsage(response.body);
    const text = outputText(response.body);
    const parsed = (() => { try { return JSON.parse(text); } catch { return null; } })();
    const validation = input.stage === "planner" ? validatePlan(parsed) : validateFinal(parsed);
    const provenance: string[] = [];
    if (response.http_status !== 200) provenance.push(`provider returned HTTP ${response.http_status}`);
    if (!usage?.response_id) provenance.push("provider returned no response identity");
    if (usage?.model !== LUNA_MODEL) provenance.push(`provider returned model ${usage?.model || ""}; requested ${LUNA_MODEL}`);
    return { stage: input.stage, attempt_id: attemptId, status: provenance.length || validation.length ? "failed" : "completed", http_status: response.http_status, latency_ms: Date.now()-started, raw_response: response.body, output_text: text, parsed_output: parsed, usage, validation_issues: validation, provenance_errors: provenance, attempts: instrumented.attempts(), request_body_sha256: pre.request_body_sha256, instruction_sha256: pre.instruction_sha256, schema_sha256: pre.schema_sha256, parent_plan_sha256: input.planSha ?? null, endpoint: RESPONSES_ENDPOINT };
  } catch (error) {
    return { stage: input.stage, attempt_id: attemptId, status: "failed", http_status: null, latency_ms: Date.now()-started, raw_response: null, output_text: "", parsed_output: null, usage: null, validation_issues: [], provenance_errors: [error instanceof Error ? error.message : "provider failure"], attempts: instrumented.attempts(), request_body_sha256: pre.request_body_sha256, instruction_sha256: pre.instruction_sha256, schema_sha256: pre.schema_sha256, parent_plan_sha256: input.planSha ?? null, endpoint: RESPONSES_ENDPOINT };
  }
}
