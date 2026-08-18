import { describe, expect, it } from "vitest";
import { sideEffectViolations } from "./helpers";

describe("sideEffectViolations", () => {
  it("allows local navigation and asset requests", () => {
    expect(
      sideEffectViolations([
        "http://localhost:3000/audit/fixture",
        "http://localhost:3000/_next/static/chunk.js",
        "http://localhost:3000/preview-step-1.png",
      ]),
    ).toEqual([]);
  });

  it("allows the tolerated static-asset CDN", () => {
    expect(
      sideEffectViolations(["https://framerusercontent.com/images/logo.svg"]),
    ).toEqual([]);
  });

  it("flags any /api/* request, not just /api/audit/*", () => {
    // A same-origin route like /api/proxy that forwards to a real provider
    // server-side would otherwise pass as "local" — every local API route is
    // forbidden so that gap cannot reopen silently.
    const violations = sideEffectViolations([
      "http://localhost:3000/api/audit/run",
      "http://localhost:3000/api/proxy",
    ]);
    expect(violations).toEqual([
      "http://localhost:3000/api/audit/run",
      "http://localhost:3000/api/proxy",
    ]);
  });

  it("flags any external host that is not the tolerated static-asset CDN", () => {
    expect(
      sideEffectViolations(["https://api.openai.com/v1/responses"]),
    ).toEqual(["https://api.openai.com/v1/responses"]);
  });

  it("reports a URL once even when it trips both the /api/ and external-host checks", () => {
    expect(sideEffectViolations(["https://example.com/api/x"])).toEqual([
      "https://example.com/api/x",
    ]);
  });
});
