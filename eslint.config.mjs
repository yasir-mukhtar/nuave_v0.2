import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".open-next/**",
    "next-env.d.ts",
    "archive/**",
    "Archive Candidates/**",
    // Git-ignored local evidence, credentials and review scratch folders.
    ".local-evidence/**",
    ".secrets/**",
    "acceptance-review-*/**",
  ]),
]);
