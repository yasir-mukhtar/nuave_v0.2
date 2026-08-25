import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

export function captureFileSnapshot(path) {
  return {
    path,
    existed: existsSync(path),
    contents: existsSync(path) ? readFileSync(path, "utf8") : null,
  };
}

export function restoreFileSnapshot(snapshot) {
  if (snapshot.existed) {
    writeFileSync(snapshot.path, snapshot.contents ?? "", "utf8");
    return;
  }
  rmSync(snapshot.path, { force: true });
}

export function offlineVerifierEnv(source = process.env) {
  return {
    ...source,
    NUAVE_PROVIDER: "opencodego",
    NUAVE_QUESTION_PROVIDER: "opencodego",
    OPENCODEGO_API_KEY: "dummy-build-only-key",
    OPENAI_API_KEY: "dummy-build-only-key",
    OPENAI_BASE_URL: "https://opencode.ai/zen/go/v1",
    OPENAI_AUDIT_MODEL: "gpt-5.6-luna",
    OPENAI_AUDIT_REASONING_EFFORT: "low",
    NUAVE_LIVE_PROVIDER_TESTING: "0",
    GEMINI_API_KEY: "",
    GROQ_API_KEY: "",
    OPENROUTER_API_KEY: "",
  };
}

export function terminateProcessTree(child, signal = "SIGTERM") {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    try {
      child.kill(signal);
    } catch {
      // The process may already have exited.
    }
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // The process group may already have exited.
    }
  }
}
