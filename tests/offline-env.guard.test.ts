import { readFileSync } from "node:fs";
import { relative } from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";
import { offlineE2EServerEnv } from "./e2e/shared-config";
import {
  forEachSourceNode,
  isTestCodePath,
  REPO_ROOT,
  sourceFiles,
} from "./guard-source";

/**
 * Playbook §B.3 class B: `next dev` fills any key absent from its starting
 * environment out of a developer `.env*` file. `offlineE2EServerEnv()` is the
 * only environment the offline e2e server gets, so every `NUAVE_*` key that
 * `src/` reads must be set there explicitly — otherwise a founder-local value
 * (a live evidence directory, a retained pack) can reach the "offline"
 * journey. Retired keys that survive only in comments do not flag.
 */

// NUAVE_* keys are UPPER_SNAKE and end in a letter or digit, so a bare
// "NUAVE_" prefix-check string is not mistaken for a key.
const NUAVE_KEY = /^NUAVE_[A-Z0-9_]*[A-Z0-9]$/;

function isProcessEnvAccess(
  node: ts.Node,
): node is ts.PropertyAccessExpression {
  return (
    ts.isPropertyAccessExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "process" &&
    node.expression.name.text === "env"
  );
}

/**
 * The distinct `NUAVE_*` keys one source references: `process.env.NUAVE_*`
 * reads plus `NUAVE_*` string literals in any quote style — a literal catches
 * reads made through a named constant (`const KEY = "NUAVE_*"` read later as
 * `process.env[KEY]`).
 */
function nuaveEnvKeysIn(path: string, source: string): string[] {
  const keys = new Set<string>();
  forEachSourceNode(path, source, (node) => {
    if (ts.isStringLiteralLike(node) && NUAVE_KEY.test(node.text)) {
      keys.add(node.text);
      return;
    }
    if (isProcessEnvAccess(node) && NUAVE_KEY.test(node.name.text)) {
      keys.add(node.name.text);
    }
  });
  return [...keys];
}

describe("offline e2e env coverage (§B.3 class B)", () => {
  // The allowed set comes from calling the real function, never from parsing
  // its source, so the guard cannot drift from what the server env sets.
  const allowed = new Set(Object.keys(offlineE2EServerEnv()));

  it("matcher: env reads and key literals flag, comments do not", () => {
    // Known bad: direct read; bracket read; read through a named constant.
    expect(
      nuaveEnvKeysIn("src/x.ts", "const v = process.env.NUAVE_B3_PROBE;"),
    ).toEqual(["NUAVE_B3_PROBE"]);
    expect(
      nuaveEnvKeysIn("src/x.ts", "const v = process.env['NUAVE_B3_PROBE'];"),
    ).toEqual(["NUAVE_B3_PROBE"]);
    expect(
      nuaveEnvKeysIn(
        "src/x.ts",
        'const KEY = "NUAVE_B3_PROBE";\nconst v = process.env[KEY];',
      ),
    ).toEqual(["NUAVE_B3_PROBE"]);
    expect(nuaveEnvKeysIn("src/x.ts", "const k = `NUAVE_B3_PROBE`;")).toEqual([
      "NUAVE_B3_PROBE",
    ]);
    // Known good: comments never produce nodes.
    expect(
      nuaveEnvKeysIn(
        "src/x.ts",
        '// process.env.NUAVE_B3_PROBE\n/* "NUAVE_B3_PROBE" */\nconst v = 1;',
      ),
    ).toEqual([]);
    // Known good: a key the offline env sets is not a violation.
    expect(
      nuaveEnvKeysIn("src/x.ts", "const v = process.env.NUAVE_AUDIT_MODE;"),
    ).toEqual(["NUAVE_AUDIT_MODE"]);
    expect(allowed.has("NUAVE_AUDIT_MODE")).toBe(true);
  });

  it("every NUAVE_* key read in non-test src/ is set by offlineE2EServerEnv()", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      if (isTestCodePath(file)) continue;
      for (const key of nuaveEnvKeysIn(file, readFileSync(file, "utf8"))) {
        if (!allowed.has(key)) {
          offenders.push(`${relative(REPO_ROOT, file)} reads ${key}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
