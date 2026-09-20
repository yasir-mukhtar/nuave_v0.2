import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Spec 010 R-09 / AC-09: nothing under `src/` or `tests/` may import from
 * `archive/` — archived code is traceable history, not a dependency. The
 * check scans every source file's import specifiers, the same pattern the
 * intake isolation guard uses for its allowlist.
 */

const ROOT = process.cwd();
const SCANNED_DIRS = ["src", "tests"];
const IMPORT_SPECIFIER_PATTERN =
  /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|tsx|mts|mjs)$/.test(entry)) yield path;
  }
}

describe("archive isolation", () => {
  it("no active source file imports from archive/", () => {
    const offenders: string[] = [];
    for (const dir of SCANNED_DIRS) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(IMPORT_SPECIFIER_PATTERN)) {
          const specifier = match[1];
          if (
            specifier.includes("archive/") ||
            specifier.includes("Archive Candidates")
          ) {
            offenders.push(`${relative(ROOT, file)} -> ${specifier}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
