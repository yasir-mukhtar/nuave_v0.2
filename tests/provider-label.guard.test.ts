import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";
import { APPROVED_LIVE_SYSTEMS } from "../src/lib/audit/approved-live-providers";
import {
  forEachSourceNode,
  isTestCodePath,
  REPO_ROOT,
  sourceFiles,
} from "./guard-source";

/**
 * Playbook §B.3 class A: an approved live-provider `system` label is typed
 * exactly once — in `src/lib/audit/approved-live-providers.ts` — and every
 * gate derives from that registry. A label written again as a string literal
 * elsewhere in non-test `src/` is the same defect that pinned the live gate
 * and the observation-integrity check to one provider (PRs #69/#71).
 * Test code may keep literals: fixtures and specs deliberately record them.
 */

const REGISTRY = join(REPO_ROOT, "src/lib/audit/approved-live-providers.ts");
const APPROVED_LABELS: readonly string[] = APPROVED_LIVE_SYSTEMS;

/**
 * `file:line` entries for every string literal whose whole content is an
 * approved live `system` label — `"…"`, `'…'`, and `` `…` `` forms — outside
 * the registry and outside test code. A label embedded in a larger string is
 * not the label and does not flag.
 */
function collectLabelViolations(path: string, source: string): string[] {
  if (path === REGISTRY || isTestCodePath(path)) return [];
  const violations: string[] = [];
  forEachSourceNode(path, source, (node, sourceFile) => {
    if (!ts.isStringLiteralLike(node)) return;
    if (!APPROVED_LABELS.includes(node.text)) return;
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    violations.push(
      `${relative(REPO_ROOT, path)}:${line + 1}:${character + 1} ${JSON.stringify(node.text)}`,
    );
  });
  return violations;
}

describe("provider label registry (§B.3 class A)", () => {
  it("matcher: literals flag, comments and test code do not", () => {
    for (const label of APPROVED_LABELS) {
      // Known bad: the label as a string literal in a non-test file.
      expect(
        collectLabelViolations(
          "src/lib/x.ts",
          `const s = ${JSON.stringify(label)};`,
        ),
      ).toHaveLength(1);
      expect(
        collectLabelViolations("src/lib/x.ts", `const s = '${label}';`),
      ).toHaveLength(1);
      expect(
        collectLabelViolations("src/lib/x.ts", `const s = \`${label}\`;`),
      ).toHaveLength(1);
      // Known good: the same text inside comments is never a node.
      expect(
        collectLabelViolations(
          "src/lib/x.ts",
          `// uses "${label}"\n/* and "${label}" */\nconst s = system;`,
        ),
      ).toHaveLength(0);
      // Known good: test code and the registry itself are skipped.
      expect(
        collectLabelViolations("src/lib/x.test.ts", `const s = "${label}";`),
      ).toHaveLength(0);
      expect(
        collectLabelViolations("src/lib/x.fixture.ts", `const s = "${label}";`),
      ).toHaveLength(0);
      expect(
        collectLabelViolations(
          "src/lib/fixtures/x.ts",
          `const s = "${label}";`,
        ),
      ).toHaveLength(0);
      expect(
        collectLabelViolations(REGISTRY, `const s = "${label}";`),
      ).toHaveLength(0);
      // Known good: a label inside a larger string is not the label; derived
      // use carries no literal at all.
      expect(
        collectLabelViolations(
          "src/lib/x.ts",
          `const s = "sent via ${label} today";`,
        ),
      ).toHaveLength(0);
      expect(
        collectLabelViolations(
          "src/lib/x.ts",
          'import { OPENAI_SYSTEM } from "./approved-live-providers";\nconst s = OPENAI_SYSTEM;',
        ),
      ).toHaveLength(0);
    }
  });

  it("no approved live system label is a string literal outside the registry", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      offenders.push(
        ...collectLabelViolations(file, readFileSync(file, "utf8")),
      );
    }
    expect(offenders).toEqual([]);
  });
});
