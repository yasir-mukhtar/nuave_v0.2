import { describe, expect, it } from "vitest";
import {
  readWranglerConfig,
  type WranglerEnvironment as Environment,
} from "../orders/wrangler-config.test-helper";

const config = readWranglerConfig();

const NAMES = [
  "IDENTITY_CALLER_RATE_LIMITER",
  "IDENTITY_DESTINATION_RATE_LIMITER",
  "EXTRACT_CALLER_RATE_LIMITER",
  "GLM_CALLER_RATE_LIMITER",
  "ORDER_CREATE_CALLER_RATE_LIMITER",
  "ORDER_STATUS_CALLER_RATE_LIMITER",
  "REPORT_DATA_CALLER_RATE_LIMITER",
];

describe("Worker rate-limit configuration", () => {
  it("declares exactly the seven approved independent 60-second limiters in production", () => {
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
        namespace_id: "301",
        simple: { limit: 2, period: 60 },
      },
      // Spec 016 R-05: order creation and order status, per caller IP.
      {
        name: "ORDER_CREATE_CALLER_RATE_LIMITER",
        namespace_id: "304",
        simple: { limit: 5, period: 60 },
      },
      {
        name: "ORDER_STATUS_CALLER_RATE_LIMITER",
        namespace_id: "305",
        simple: { limit: 30, period: 60 },
      },
      // Spec 016 R-27: the saved-report data route, per caller IP.
      {
        name: "REPORT_DATA_CALLER_RATE_LIMITER",
        namespace_id: "306",
        simple: { limit: 20, period: 60 },
      },
    ]);
  });

  it("every environment declares the same limiters, with counters of its own", () => {
    const seen = new Set<string>();
    for (const [label, environment] of Object.entries({
      production: config as Environment,
      ...config.env,
    })) {
      expect(
        environment.ratelimits?.map((binding) => binding.name),
        label,
      ).toEqual(NAMES);
      for (const binding of environment.ratelimits ?? []) {
        // A shared namespace id would share counters between environments.
        expect(seen.has(binding.namespace_id), `${label} ${binding.name}`).toBe(
          false,
        );
        seen.add(binding.namespace_id);
      }
    }
  });

  it("local limits are test-only and far above the production ones", () => {
    for (const binding of config.env?.dev?.ratelimits ?? []) {
      expect(binding.simple.limit).toBeGreaterThanOrEqual(10_000);
    }
  });
});
