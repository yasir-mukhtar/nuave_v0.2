import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Live config for the buyer-decision experiment: ONLY the explicit paid-run
 * spec files. Running any of them without EXPERIMENT_BDQ_LIVE=1 fails closed
 * before a provider call is made. Never run this config as part of offline
 * verification.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    include: ["experiments/buyer-decision-questions/live/**/*.live.spec.ts"],
    exclude: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
    passWithNoTests: false,
  },
});
