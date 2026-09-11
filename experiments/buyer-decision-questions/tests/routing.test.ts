/**
 * Routing and provenance tests for both conditions, all offline: exactly one
 * scheduled call per condition and fixture, identical model/provider/settings,
 * no tools, no retries, raw vs displayed provenance, condition B never
 * repaired with the old deterministic fallback, and no provider calls at all
 * when the live guard is off.
 */
import { describe, expect, it, afterEach, vi } from "vitest";
import {
  INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME,
  INDONESIAN_QUESTION_WRITER_INSTRUCTION,
} from "../../../src/lib/audit/questions-id-provider";
import { loadFixture, loadConditionBInstruction } from "../src/loaders";
import { runConditionA } from "../src/condition-a";
import { runConditionB } from "../src/condition-b";
import {
  B_STRUCTURED_OUTPUT_NAME,
  LUNA_MODEL,
  OPENCODEGO_CREDENTIAL_VAR,
  LIVE_ENV_FLAG,
} from "../src/experiment-config";
import { conditionAInput, conditionBInput } from "../src/briefs";
import {
  aPackTexts,
  bBody,
  okFetch,
  responsesBody,
  stubLiveEnv,
} from "./helpers";

function fixture1() {
  return loadFixture("fixture-1-kopi-sudut");
}

describe("condition A (current writer) routing", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("makes exactly one call with the real writer instruction, minimized brief and Luna settings", async () => {
    stubLiveEnv();
    const fixture = fixture1();
    const { texts } = aPackTexts(fixture.business);
    const capturedBodies: unknown[] = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedBodies.push(JSON.parse(String(init?.body ?? "{}")));
      return okFetch(responsesBody({ questions: texts }))(input, init);
    };

    const { record, attempts } = await runConditionA({ fixture, runKind: "initial", fetcher });

    expect(attempts).toBe(1);
    expect(record.status).toBe("completed");
    expect(record.model.requested).toBe(LUNA_MODEL);
    expect(record.model.returned).toBe(LUNA_MODEL);
    expect(record.provenance_errors).toEqual([]);
    expect(record.output.source).toBe("model");
    expect(record.output.warnings).toEqual([]);
    expect(record.raw_output.kind).toBe("structured");
    expect(record.output.questions).toHaveLength(10);
    expect(record.output.classification).toEqual({ total: 10, unnamed: 6, named: 4 });

    const body = capturedBodies[0] as Record<string, unknown>;
    expect(body.model).toBe(LUNA_MODEL);
    expect((body.reasoning as Record<string, unknown>).effort).toBe("low");
    expect(body.store).toBe(false);
    expect(body.service_tier).toBe("default");
    expect(body.max_output_tokens).toBe(2048);
    const textFormat = (body.text as Record<string, unknown>).format as Record<string, unknown>;
    expect(textFormat.type).toBe("json_schema");
    expect(textFormat.name).toBe(INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME);
    expect(textFormat.strict).toBe(true);
    const input = body.input as Array<{ role: string; content: string }>;
    expect(input[0].role).toBe("developer");
    expect(input[0].content).toBe(INDONESIAN_QUESTION_WRITER_INSTRUCTION);
    expect(input[1].role).toBe("user");
    expect(JSON.parse(input[1].content)).toEqual(conditionAInput(fixture.business));
  });

  it("records raw vs displayed and per-question provenance when the boundary repairs a slot", async () => {
    stubLiveEnv();
    const fixture = fixture1();
    const { texts } = aPackTexts(fixture.business);
    // Slot 7 must name the business; make the model output violate it so the
    // boundary applies its deterministic slot repair (real current behavior).
    const leakingTexts = [...texts];
    leakingTexts[6] = "Apakah ada rekomendasi tempat ngopi enak di Depok?";
    const fetcher = okFetch(responsesBody({ questions: leakingTexts }));

    const { record } = await runConditionA({ fixture, runKind: "initial", fetcher });

    expect(record.status).toBe("completed");
    expect(record.output.source).toBe("model");
    expect(record.output.warnings).toContain("slot_safety_repair:7");
    expect(record.raw_output.kind).toBe("structured");
    const repairedQuestion = record.output.questions[6];
    expect(repairedQuestion.generated_by).toBe("deterministic_slot_repair");
    expect(repairedQuestion.text).not.toBe(leakingTexts[6]);
    expect(repairedQuestion.original_suggestion).toBe(leakingTexts[6]);
    // The raw provider output is preserved un-repaired.
    if (record.raw_output.kind === "structured") {
      expect(record.raw_output.questions[6]).toBe(leakingTexts[6]);
    }
    // The other slots were NOT repaired.
    expect(record.output.questions[0].generated_by).toBe("model");
    expect(record.output.questions[0].text).toBe(texts[0]);
  });

  it("marks the deterministic fallback clearly instead of attributing it to the model", async () => {
    stubLiveEnv();
    const fixture = fixture1();
    // Model returns only nine questions → the boundary falls back.
    const short = aPackTexts(fixture.business).texts.slice(0, 9);
    const fetcher = okFetch(responsesBody({ questions: short }));
    const { record } = await runConditionA({ fixture, runKind: "initial", fetcher });

    expect(record.status).toBe("completed_with_deterministic_fallback");
    expect(record.output.source).toBe("fallback");
    expect(record.output.warnings).toContain("fallback_used");
    expect(record.output.valid).toBe(false);
    expect(
      record.output.questions.every(
        (question) => question.generated_by === "deterministic_fallback",
      ),
    ).toBe(true);
  });

  it("refuses to make any provider call when the live flag is unset (throws, no record)", async () => {
    const fixture = fixture1();
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      throw new Error("must not be called");
    };
    await expect(
      runConditionA({ fixture, runKind: "initial", fetcher }),
    ).rejects.toThrow(LIVE_ENV_FLAG);
    expect(calls).toBe(0);
  });

  it("fails closed when the credential is missing (throws, no record)", async () => {
    stubLiveEnv();
    vi.stubEnv(OPENCODEGO_CREDENTIAL_VAR, "");
    const fixture = fixture1();
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      throw new Error("must not be called");
    };
    await expect(
      runConditionA({ fixture, runKind: "initial", fetcher }),
    ).rejects.toThrow(OPENCODEGO_CREDENTIAL_VAR);
    expect(calls).toBe(0);
  });
});

describe("condition B (buyer-decision) routing", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("makes exactly one call with the frozen instruction, buyer brief and matching settings", async () => {
    stubLiveEnv();
    const fixture = fixture1();
    const instruction = loadConditionBInstruction();
    const capturedBodies: unknown[] = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedBodies.push(JSON.parse(String(init?.body ?? "{}")));
      return okFetch(bBody(fixture.business))(input, init);
    };

    const { record, attempts } = await runConditionB({
      fixture,
      instruction,
      model: LUNA_MODEL,
      runKind: "initial",
      fetcher,
    });

    expect(attempts).toBe(1);
    expect(record.status).toBe("completed");
    expect(record.output.valid).toBe(true);
    expect(record.output.validation_issues).toEqual([]);
    expect(record.output.questions).toHaveLength(10);
    expect(record.output.classification).toEqual({ total: 10, unnamed: 6, named: 4 });
    expect(record.provenance_errors).toEqual([]);
    expect(record.instruction.sha256).toBe(instruction.sha256);
    expect(record.instruction.source).toBe("frozen-condition-b-v1");

    const body = capturedBodies[0] as Record<string, unknown>;
    expect(body.model).toBe(LUNA_MODEL);
    expect((body.reasoning as Record<string, unknown>).effort).toBe("low");
    expect(body.store).toBe(false);
    expect(body.service_tier).toBe("default");
    expect(body.max_output_tokens).toBe(2048);
    const textFormat = (body.text as Record<string, unknown>).format as Record<string, unknown>;
    expect(textFormat.type).toBe("json_schema");
    expect(textFormat.name).toBe(B_STRUCTURED_OUTPUT_NAME);
    expect(textFormat.strict).toBe(true);
    const input = body.input as Array<{ role: string; content: string }>;
    expect(input[0].role).toBe("developer");
    expect(input[0].content).toBe(instruction.text);
    expect(JSON.parse(input[1].content)).toEqual({
      buyer_brief: conditionBInput(fixture.business),
    });
  });

  it("never applies the old deterministic fallback or slot repair to B output", async () => {
    stubLiveEnv();
    const fixture = fixture1();
    const instruction = loadConditionBInstruction();
    // Provider returns 10 well-formed questions with a broken named composition
    // (5 named / 5 unnamed) — an exposed contract failure, not a repaired pack.
    const mock = bBody(fixture.business);
    const parsed = JSON.parse(
      String((mock.output[0].content[0] as { text?: string }).text ?? "{}"),
    ) as { questions: Array<{ text: string; coverage: string }> };
    // Replace an UNNAMED question with a brand-naming one → 5 named / 5
    // unnamed: an exposed contract failure, not a repaired pack.
    parsed.questions = parsed.questions.map((question, index) =>
      index === 0 ? { ...question, text: "Kopi Sudut di Depok enak nggak buat santai?" } : question,
    );
    const fetcher = okFetch(responsesBody(parsed));

    const { record } = await runConditionB({
      fixture,
      instruction,
      model: LUNA_MODEL,
      runKind: "initial",
      fetcher,
    });

    expect(record.status).toBe("completed");
    expect(record.output.valid).toBe(false);
    expect(
      record.output.validation_issues.some((issue) => issue.rule === "named_composition"),
    ).toBe(true);
    // No fallback wording, no repairs: every question is marked as model
    // output even when the contract fails.
    expect(
      record.output.questions.every((question) => question.generated_by === "model"),
    ).toBe(true);
    expect(record.output.questions).toHaveLength(10);
  });

  it("records an unresolved attempt as failed when the provider output is unusable (no hidden retry)", async () => {
    stubLiveEnv();
    const fixture = fixture1();
    const instruction = loadConditionBInstruction();
    const nine = (
      await Promise.resolve(bBody(fixture.business))
    ).output[0].content[0];
    const parsed = JSON.parse(String(nine.text ?? "{}")) as {
      questions: Array<{ text: string; coverage: string }>;
      limitations: string[];
    };
    parsed.questions = parsed.questions.slice(0, 9);
    let calls = 0;
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      return okFetch(responsesBody(parsed))(input, init);
    };

    const { record, attempts } = await runConditionB({
      fixture,
      instruction,
      model: LUNA_MODEL,
      runKind: "initial",
      fetcher,
    });
    expect(calls).toBe(1);
    expect(attempts).toBe(1);
    expect(record.status).toBe("failed");
    expect(record.failure_reason).toContain("B contract");
    expect(record.output.questions).toEqual([]);
  });

  it("refuses to run B on the Luna model while OPENAI_AUDIT_MODEL points elsewhere (throws, no record)", async () => {
    stubLiveEnv();
    vi.stubEnv("OPENAI_AUDIT_MODEL", "gpt-5.6-terra");
    const fixture = fixture1();
    const instruction = loadConditionBInstruction();
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      throw new Error("must not be called");
    };
    await expect(
      runConditionB({
        fixture,
        instruction,
        model: LUNA_MODEL,
        runKind: "confirmation",
        fetcher,
      }),
    ).rejects.toThrow("OPENAI_AUDIT_MODEL");
    expect(calls).toBe(0);
  });
});
