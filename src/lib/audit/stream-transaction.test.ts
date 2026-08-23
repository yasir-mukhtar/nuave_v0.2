import { describe, expect, it } from "vitest";
import { AuditRunEventParser, encodeAuditRunEvent } from "./stream";

describe("AuditRunEventParser transactional delivery", () => {
  it("delivers valid events before a malformed later event in the same chunk", () => {
    const parser = new AuditRunEventParser();
    const first = encodeAuditRunEvent({
      type: "run_started",
      total: 10,
      max_attempts_per_question: 3,
      max_automatic_retries: 2,
      observation_stage_max_calls: 30,
    });
    const second = encodeAuditRunEvent({
      type: "prompt_started",
      index: 0,
      prompt_id: "NVA-ID-01",
      attempt: 1,
      is_retry: false,
    });

    const events = parser.push(`${first}${second}{not-json}\n`);
    expect(events.map((event) => event.type)).toEqual([
      "run_started",
      "prompt_started",
    ]);
    expect(() => parser.finish()).toThrow();
  });

  it("never accepts later bytes after a terminal malformed event", () => {
    const parser = new AuditRunEventParser();
    parser.push("{not-json}\n");
    expect(() =>
      parser.push(
        encodeAuditRunEvent({
          type: "run_started",
          total: 10,
          max_attempts_per_question: 3,
          max_automatic_retries: 2,
          observation_stage_max_calls: 30,
        }),
      ),
    ).toThrow();
  });
});
