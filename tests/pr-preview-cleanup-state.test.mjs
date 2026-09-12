import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { classifyPreviewCleanup } from "../scripts/pr-preview-cleanup-state.mjs";

describe("classifyPreviewCleanup", () => {
  it("reports removed only when the wrangler delete step succeeded", () => {
    expect(classifyPreviewCleanup("success", "")).toBe("removed");
    expect(classifyPreviewCleanup("success", "200")).toBe("removed");
    expect(classifyPreviewCleanup("success", "404")).toBe("removed");
  });

  it("reports absent only on a worker-specific 404 after a failed delete", () => {
    expect(classifyPreviewCleanup("failure", "404")).toBe("absent");
  });

  it("fails visibly when the worker still exists", () => {
    expect(classifyPreviewCleanup("failure", "200")).toBe("failed");
  });

  it("fails visibly on auth, server, and network probe failures", () => {
    for (const code of ["401", "403", "500", "503", "000"]) {
      expect(classifyPreviewCleanup("failure", code)).toBe("failed");
    }
  });

  it("fails visibly when the probe never ran or produced no output", () => {
    expect(classifyPreviewCleanup("failure", "")).toBe("failed");
    expect(classifyPreviewCleanup("failure", "undefined")).toBe("failed");
  });

  it("fails visibly when the delete step was skipped, cancelled, or crashed", () => {
    for (const outcome of ["skipped", "cancelled", ""]) {
      expect(classifyPreviewCleanup(outcome, "")).toBe("failed");
      expect(classifyPreviewCleanup(outcome, "404")).toBe("absent");
    }
  });

  it("does not treat free-text error output as proof of absence", () => {
    // Regression for the earlier command-output wording match: a failed
    // delete whose output merely contains 'not found' must not claim removal.
    expect(classifyPreviewCleanup("failure", "not found")).toBe("failed");
    expect(classifyPreviewCleanup("failure", "does not exist")).toBe("failed");
  });
});

describe("scripts/pr-preview-cleanup-state.mjs CLI", () => {
  const run = (env) =>
    execFileSync(process.execPath, ["scripts/pr-preview-cleanup-state.mjs"], {
      env: { ...process.env, ...env, GITHUB_OUTPUT: "" },
      encoding: "utf8",
    }).trim();

  it("writes result=removed for a successful delete", () => {
    expect(run({ REMOVE_OUTCOME: "success" })).toBe("result=removed");
  });

  it("writes result=absent for failed delete + 404 probe", () => {
    expect(run({ REMOVE_OUTCOME: "failure", PROBE_HTTP_CODE: "404" })).toBe(
      "result=absent",
    );
  });

  it("writes result=failed for failed delete + live worker probe", () => {
    expect(run({ REMOVE_OUTCOME: "failure", PROBE_HTTP_CODE: "200" })).toBe(
      "result=failed",
    );
  });
});
