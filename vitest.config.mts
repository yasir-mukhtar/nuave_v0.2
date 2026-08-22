import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Root Vitest configuration for the Nuave audit suite.
//
// - `test:audit` runs `vitest run src/lib/audit` (path-filtered).
// - Nested `.claude/worktrees/*` checkouts are full repo clones that vitest
//   project auto-discovery can pick up; exclude them so the reported test
//   count always reflects THIS checkout only.
// - Match the TypeScript `@/*` path alias so route-level regression tests use
//   the same module resolution as the application build.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.claude/worktrees/**",
      "**/archive/**",
    ],
  },
});
