import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claude: vi.fn(async () => "claude"),
  openai: vi.fn(async () => "openai"),
}));
vi.mock("./anthropic-report", () => ({
  configuredReportWriter: () => process.env.NUAVE_REPORT_WRITER || null,
  generateClaudeReportContent: mocks.claude,
}));
vi.mock("./openai", async (importActual) => ({
  ...(await importActual<typeof import("./openai")>()),
  generateReportContent: mocks.openai,
}));

import { DIRECT_TEN_CONTEXT_VERSION } from "./direct-ten-context-v2";
import { liveGenerateReportContent } from "./provider";

// Spec 021 PR 6b: the new two-source writer goes to Claude when the deploy
// names a Claude writer; every other report keeps today's writer.

type Input = Parameters<typeof liveGenerateReportContent>[0];
const brief = {
  version: DIRECT_TEN_CONTEXT_VERSION,
} as unknown as Input["brief"];
const withWriter = {
  brief,
  two_source_facts: { writer: { questions: [], businesses: [] } },
} as unknown as Input;
const withoutWriter = {
  brief,
  two_source_facts: { counts: {} },
} as unknown as Input;

beforeEach(() => {
  vi.stubEnv("NUAVE_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
  mocks.claude.mockClear();
  mocks.openai.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("which writer writes a live report", () => {
  it("Claude, when the deploy names it and the report has the new writer's facts", async () => {
    vi.stubEnv("NUAVE_REPORT_WRITER", "claude-opus-5-5");
    expect(await liveGenerateReportContent(withWriter)).toBe("claude");
    expect(mocks.openai).not.toHaveBeenCalled();
  });

  it("today's writer for a report without them, or when no Claude writer is named", async () => {
    vi.stubEnv("NUAVE_REPORT_WRITER", "claude-opus-5-5");
    expect(await liveGenerateReportContent(withoutWriter)).toBe("openai");
    vi.stubEnv("NUAVE_REPORT_WRITER", "");
    expect(await liveGenerateReportContent(withWriter)).toBe("openai");
    expect(mocks.claude).not.toHaveBeenCalled();
  });
});
