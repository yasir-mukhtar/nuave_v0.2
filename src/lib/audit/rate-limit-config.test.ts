import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8").replace(
    /,\s*([}\]])/g,
    "$1",
  ),
) as {
  ratelimits?: Array<{
    name: string;
    namespace_id: string;
    simple: { limit: number; period: number };
  }>;
};

describe("Worker rate-limit configuration", () => {
  it("declares exactly the six approved independent 60-second limiters", () => {
    expect(config.ratelimits).toEqual([
      {
        name: "IDENTITY_CALLER_RATE_LIMITER",
        namespace_id: "1053120767",
        simple: { limit: 10, period: 60 },
      },
      {
        name: "IDENTITY_DESTINATION_RATE_LIMITER",
        namespace_id: "1955950742",
        simple: { limit: 20, period: 60 },
      },
      {
        name: "EXTRACT_CALLER_RATE_LIMITER",
        namespace_id: "1945116857",
        simple: { limit: 5, period: 60 },
      },
      // Spec 010 R-03: per-IP burst protection on the paid stages.
      {
        name: "GLM_CALLER_RATE_LIMITER",
        namespace_id: "2073412865",
        simple: { limit: 2, period: 60 },
      },
      {
        name: "AUDIT_RUN_CALLER_RATE_LIMITER",
        namespace_id: "2091558471",
        simple: { limit: 2, period: 60 },
      },
      {
        name: "AUDIT_REPORT_CALLER_RATE_LIMITER",
        namespace_id: "2130826490",
        simple: { limit: 3, period: 60 },
      },
    ]);
    expect(
      new Set(config.ratelimits?.map((binding) => binding.name)).size,
    ).toBe(6);
    expect(
      new Set(config.ratelimits?.map((binding) => binding.namespace_id)).size,
    ).toBe(6);
  });
});
