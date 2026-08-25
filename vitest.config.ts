import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Default Vitest discovery is intentionally offline-safe. Credentialed/live
// provider evaluations stay behind the explicit vitest.live-provider config.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "src"),
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.test.{ts,tsx,mjs}"],
    exclude: ["**/node_modules/**", "**/.git/**", "**/.next/**", "scripts/**"],
  },
});
