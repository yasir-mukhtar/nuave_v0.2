import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Offline verification config for the buyer-decision experiment. Discovery is
 * intentionally offline-safe: only *.test.ts / *.test.mjs files under
 * experiments/buyer-decision-questions are included; the live spec files
 * (*.live.spec.ts) never run here and require the explicit live config plus
 * EXPERIMENT_BDQ_LIVE=1.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    include: [
      "experiments/buyer-decision-questions/tests/**/*.test.ts",
      "experiments/buyer-decision-questions/tests/**/*.test.mjs",
    ],
    exclude: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
    passWithNoTests: false,
  },
});
