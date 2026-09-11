/**
 * Record persistence: fresh run ids, no overwrites, no secret material in
 * records, and directory isolation for tests.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadFixture } from "../src/loaders";
import { newRunId, saveRunRecord, loadRunRecords } from "../src/records";
import type { ExperimentRunRecord } from "../src/records";
import { runConditionA } from "../src/condition-a";
import { aPackTexts, okFetch, responsesBody, stubLiveEnv } from "./helpers";

function minimalRecord(): ExperimentRunRecord {
  const fixture = loadFixture("fixture-1-kopi-sudut");
  return {
    schema: "nuave-bdq-run-record-v1",
    run_id: newRunId("initial"),
    run_kind: "initial",
    condition: "B",
    fixture_id: fixture.fixture_id,
    fixture_version: fixture.version,
    fixture_sha256: fixture.sha256,
    status: "completed",
    failure_reason: null,
    started_at: "2026-09-06T00:00:00.000Z",
    completed_at: "2026-09-06T00:00:01.000Z",
    latency_ms: 1000,
    instruction: {
      id: "condition-b-v1",
      version: "condition-b-v1",
      sha256: "f".repeat(64),
      text: "instruction",
      source: "frozen-condition-b-v1",
      freeze_snapshot_sha256: null,
    },
    model: { requested: "gpt-5.6-luna", returned: "gpt-5.6-luna", response_id: "resp_1" },
    provider: {
      name: "opencodego",
      endpoint: "https://opencode.ai/zen/go/v1/responses",
      credential_var_name: "OPENCODEGO_API_KEY",
      system: "OpenCode Go Responses API",
    },
    settings: {
      reasoning_effort: "low",
      service_tier: "default",
      max_output_tokens: 2048,
      text_verbosity: "low",
      output_schema: "nuave_buyer_decision_questions",
      timeout_ms: 5000,
      web_search_tools: false,
    },
    http: { calls_made: 1, last_status: 200, provider_error: null, timed_out: false },
    input: { kind: "buyer_brief", payload: { buyer_brief: { business_name: "Kopi Sudut" } } },
    raw_output: { kind: "none", note: "mock" },
    output: {
      source: "model",
      warnings: [],
      questions: [],
      classification: { total: 0, unnamed: 0, named: 0 },
      valid: true,
      validation_issues: [],
    },
    provenance_errors: [],
    notes: [],
  };
}

describe("run records", () => {
  let dir = "";
  afterEach(() => {
    vi.unstubAllEnvs();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("generates distinct run ids and refuses to overwrite an existing record", () => {
    dir = mkdtempSync(path.join(tmpdir(), "bdq-records-"));
    const record = minimalRecord();
    const filePath = saveRunRecord(record, dir);
    expect(existsSync(filePath)).toBe(true);
    expect(() => saveRunRecord(record, dir)).toThrow(/never overwritten/);

    const second = minimalRecord();
    expect(second.run_id).not.toBe(record.run_id);
    const secondPath = saveRunRecord(second, dir);
    expect(secondPath).not.toBe(filePath);
    expect(loadRunRecords(dir)).toHaveLength(2);
  });

  it("never writes credential values or Authorization headers into records", async () => {
    stubLiveEnv();
    dir = mkdtempSync(path.join(tmpdir(), "bdq-records-"));
    const fixture = loadFixture("fixture-1-kopi-sudut");
    const { texts } = aPackTexts(fixture.business);
    const fetcher = okFetch(responsesBody({ questions: texts }));
    const { record } = await runConditionA({ fixture, runKind: "initial", fetcher });
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("dummy-experiment-key");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("Authorization");
    expect(record.provider.credential_var_name).toBe("OPENCODEGO_API_KEY");
    saveRunRecord(record, dir);
    const onDisk = readFileSync(path.join(dir, `${record.run_id}.json`), "utf8");
    expect(onDisk).not.toContain("dummy-experiment-key");
  });
});
