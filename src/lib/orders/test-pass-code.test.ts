import { afterEach, describe, expect, it, vi } from "vitest";
import { testPassCodeMatches } from "./config";

// Spec 017 R-20: the /uji form trims the typed code, so the secret is trimmed
// too, and the 24-character rule counts the trimmed secret.

const CODE = "test-pass-code-of-at-least-24-chars";

afterEach(() => vi.unstubAllEnvs());

describe("testPassCodeMatches trims both sides", () => {
  it("accepts a secret saved with a trailing newline", async () => {
    vi.stubEnv("NUAVE_TEST_PASS_CODE", `${CODE}\n`);
    expect(await testPassCodeMatches(CODE)).toBe(true);
    expect(await testPassCodeMatches(`  ${CODE} `)).toBe(true);
    expect(await testPassCodeMatches("wrong-" + CODE)).toBe(false);
  });

  it("counts the 24 characters after trimming", async () => {
    const short = "x".repeat(23);
    vi.stubEnv("NUAVE_TEST_PASS_CODE", `${short}\n  `);
    expect(await testPassCodeMatches(short)).toBe(false);
  });

  it("never matches an empty or whitespace-only code", async () => {
    vi.stubEnv("NUAVE_TEST_PASS_CODE", "   ");
    expect(await testPassCodeMatches("   ")).toBe(false);
    expect(await testPassCodeMatches("")).toBe(false);
  });
});
