import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  captureFileSnapshot,
  offlineVerifierEnv,
  restoreFileSnapshot,
} from "../scripts/verify-offline-helpers.mjs";

const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempPath() {
  const dir = mkdtempSync(join(tmpdir(), "nuave-verify-"));
  tempDirs.push(dir);
  return join(dir, ".env.production.local");
}

describe("offline verifier cleanup", () => {
  it("restores a pre-existing production env file exactly", () => {
    const path = tempPath();
    writeFileSync(path, "ORIGINAL=keep-me\n", "utf8");
    const snapshot = captureFileSnapshot(path);

    writeFileSync(path, "TEMPORARY=offline\n", "utf8");
    restoreFileSnapshot(snapshot);

    expect(readFileSync(path, "utf8")).toBe("ORIGINAL=keep-me\n");
  });

  it("removes a temporary production env file when none existed before", () => {
    const path = tempPath();
    const snapshot = captureFileSnapshot(path);

    writeFileSync(path, "TEMPORARY=offline\n", "utf8");
    restoreFileSnapshot(snapshot);

    expect(existsSync(path)).toBe(false);
  });

  it("forces provider-sensitive verifier environment values offline", () => {
    const env = offlineVerifierEnv({
      PATH: "/bin",
      NUAVE_PROVIDER: "gemini",
      NUAVE_QUESTION_PROVIDER: "openrouter",
      NUAVE_LIVE_PROVIDER_TESTING: "1",
      OPENAI_API_KEY: "ambient",
      OPENCODEGO_API_KEY: "ambient",
      GEMINI_API_KEY: "ambient",
      GROQ_API_KEY: "ambient",
      OPENROUTER_API_KEY: "ambient",
    });

    expect(env.NUAVE_PROVIDER).toBe("opencodego");
    expect(env.NUAVE_QUESTION_PROVIDER).toBe("opencodego");
    expect(env.NUAVE_LIVE_PROVIDER_TESTING).toBe("0");
    expect(env.OPENAI_API_KEY).toBe("dummy-build-only-key");
    expect(env.OPENCODEGO_API_KEY).toBe("dummy-build-only-key");
    expect(env.GEMINI_API_KEY).toBe("");
    expect(env.GROQ_API_KEY).toBe("");
    expect(env.OPENROUTER_API_KEY).toBe("");
  });
});
