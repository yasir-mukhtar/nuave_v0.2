// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { AuditCallTelemetry, BusinessBrief } from "../audit/types";
import type { ReportRecoveryState } from "../audit/report-recovery";
import {
  clearLocalAuditRecord,
  LOCAL_AUDIT_STORAGE_KEY,
  localAuditQuestionsKey,
  readLocalAuditRecord,
  reportAttemptsUsed,
  reportRequestCalls,
  reportRetryAllowed,
  writeLocalAuditRecord,
  type LocalAuditRecord,
} from "./local-audit-session";

const PROMPTS = Array.from({ length: 10 }, (_, index) => ({
  prompt_id: `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
  question: `Pertanyaan audit nomor ${index + 1}?`,
}));

function record(overrides: Partial<LocalAuditRecord> = {}): LocalAuditRecord {
  return {
    version: 1,
    inputFingerprint: "fp-confirmed-intake",
    questionsKey: localAuditQuestionsKey(PROMPTS),
    safetyIdentifier: "local-session-test",
    carryoverCostUsd: 0,
    status: "running",
    brief: null,
    preparationCalls: [],
    preparationMode: null,
    observations: [],
    runCalls: [],
    reportCalls: [],
    reportCallAttempts: 0,
    report: null,
    unfinished: null,
    reportFailure: null,
    error: null,
    ...overrides,
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("localAuditQuestionsKey", () => {
  it("binds the ordered prompt_id + exact question pairs", () => {
    const key = localAuditQuestionsKey(PROMPTS);
    expect(JSON.parse(key)).toEqual(
      PROMPTS.map((prompt) => [prompt.prompt_id, prompt.question]),
    );
    // A single wording change is a different key — never a silent match.
    const edited = PROMPTS.map((prompt, index) =>
      index === 0 ? { ...prompt, question: "Pertanyaan yang diedit?" } : prompt,
    );
    expect(localAuditQuestionsKey(edited)).not.toBe(key);
  });
});

describe("readLocalAuditRecord", () => {
  it("returns the stored record only when fingerprint and wording both bind", () => {
    writeLocalAuditRecord(record({ status: "done" }));
    const restored = readLocalAuditRecord(
      "fp-confirmed-intake",
      localAuditQuestionsKey(PROMPTS),
    );
    expect(restored?.status).toBe("done");
    expect(restored?.brief).toBeNull();
  });

  it("rejects a record bound to different confirmed facts", () => {
    writeLocalAuditRecord(record());
    expect(
      readLocalAuditRecord("fp-other-intake", localAuditQuestionsKey(PROMPTS)),
    ).toBeNull();
  });

  it("rejects a record bound to different approved wording", () => {
    writeLocalAuditRecord(record());
    const other = PROMPTS.map((prompt, index) =>
      index === 3 ? { ...prompt, question: "Wording yang berbeda?" } : prompt,
    );
    expect(
      readLocalAuditRecord(
        "fp-confirmed-intake",
        localAuditQuestionsKey(other),
      ),
    ).toBeNull();
  });

  it("discards a malformed stored payload rather than trusting it", () => {
    window.sessionStorage.setItem(
      LOCAL_AUDIT_STORAGE_KEY,
      JSON.stringify({ version: 1, status: "done" }),
    );
    expect(
      readLocalAuditRecord(
        "fp-confirmed-intake",
        localAuditQuestionsKey(PROMPTS),
      ),
    ).toBeNull();
    expect(window.sessionStorage.getItem(LOCAL_AUDIT_STORAGE_KEY)).toBeNull();
  });

  it("rejects a record whose carried fields break the schema", () => {
    writeLocalAuditRecord(record({ reportCallAttempts: 99 }));
    expect(
      readLocalAuditRecord(
        "fp-confirmed-intake",
        localAuditQuestionsKey(PROMPTS),
      ),
    ).toBeNull();
  });

  it("honestly keeps unfinished and report-failure states readable", () => {
    writeLocalAuditRecord(
      record({
        status: "unfinished",
        unfinished: {
          completed: 8,
          failedPromptIds: ["NUAVE-DT-09", "NUAVE-DT-10"],
          message: "Dua pertanyaan tidak dapat dipulihkan.",
        },
      }),
    );
    const restored = readLocalAuditRecord(
      "fp-confirmed-intake",
      localAuditQuestionsKey(PROMPTS),
    );
    expect(restored?.status).toBe("unfinished");
    expect(restored?.unfinished?.failedPromptIds).toHaveLength(2);
  });
});

describe("writeLocalAuditRecord / clearLocalAuditRecord", () => {
  it("clears the stored record", () => {
    writeLocalAuditRecord(record());
    clearLocalAuditRecord();
    expect(
      readLocalAuditRecord(
        "fp-confirmed-intake",
        localAuditQuestionsKey(PROMPTS),
      ),
    ).toBeNull();
  });
});

function call(
  stage: "extract" | "observation" | "report",
  responseId: string,
): AuditCallTelemetry {
  return {
    stage,
    attempt: 1,
    status: "completed",
    response_id: responseId,
    started_at: "2026-01-01T00:00:00.000Z",
    requested_model: "synthetic-local-fixture",
    returned_model: "synthetic-local-fixture",
  } as AuditCallTelemetry;
}

describe("reportRequestCalls", () => {
  it("carries preparation, run and prior report calls into the next request", () => {
    const next = reportRequestCalls({
      preparationCalls: [call("extract", "prep-1")],
      runCalls: [call("observation", "run-1"), call("observation", "run-2")],
      reportCalls: [call("report", "report-1")],
    });
    expect(next.map((entry) => entry.response_id)).toEqual([
      "prep-1",
      "run-1",
      "run-2",
      "report-1",
    ]);
  });

  it("deduplicates a response_id already folded from an earlier stage", () => {
    const shared = call("observation", "shared-1");
    const next = reportRequestCalls({
      preparationCalls: [],
      runCalls: [shared, call("observation", "run-2")],
      reportCalls: [{ ...shared, stage: "report" }],
    });
    expect(next).toHaveLength(2);
    expect(next.map((entry) => entry.response_id)).toEqual([
      "shared-1",
      "run-2",
    ]);
  });
});

describe("reportAttemptsUsed", () => {
  it("counts bounded attempts even when failures returned no telemetry", () => {
    expect(reportAttemptsUsed({ reportCallAttempts: 2, reportCalls: [] })).toBe(
      2,
    );
  });

  it("never under-reports when returned telemetry outnumbers the counter", () => {
    expect(
      reportAttemptsUsed({
        reportCallAttempts: 1,
        reportCalls: [call("report", "r-1"), call("report", "r-2")],
      }),
    ).toBe(2);
  });
});

describe("reportRetryAllowed", () => {
  const recovery = { can_retry: true } as ReportRecoveryState;

  it("permits a retry only for a bound record with a retryable recovery", () => {
    expect(
      reportRetryAllowed({
        record: record({ brief: {} as BusinessBrief }),
        recovery,
        inFlight: false,
      }),
    ).toBe(true);
  });

  it("blocks a repeated click while a retry is already in flight", () => {
    expect(
      reportRetryAllowed({
        record: record({ brief: {} as BusinessBrief }),
        recovery,
        inFlight: true,
      }),
    ).toBe(false);
  });

  it("blocks without a record, without a brief, or past the ceiling", () => {
    expect(
      reportRetryAllowed({ record: null, recovery, inFlight: false }),
    ).toBe(false);
    expect(
      reportRetryAllowed({ record: record(), recovery, inFlight: false }),
    ).toBe(false);
    expect(
      reportRetryAllowed({
        record: record({ brief: {} as BusinessBrief }),
        recovery: { can_retry: false } as ReportRecoveryState,
        inFlight: false,
      }),
    ).toBe(false);
  });
});
