import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.test.{ts,tsx,mjs}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.git/**",
      "**/.next/**",
      "scripts/**",
    ],
  },
});
