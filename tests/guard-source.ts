import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import * as ts from "typescript";

/**
 * Shared helpers for the static guard tests (`tests/*.guard.test.ts`). The
 * guards scan `src/` with the real TypeScript parser rather than regexes over
 * raw text, so comments can never produce a match and string literals are
 * compared exactly.
 */

export const REPO_ROOT = process.cwd();

/** Every TS/TSX/MTS/MJS file under `dir` (defaults to `src/`). */
export function* sourceFiles(
  dir: string = join(REPO_ROOT, "src"),
): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|tsx|mts|mjs)$/.test(entry)) yield path;
  }
}

/**
 * Whether a path counts as test code for the guards: the `*.test.*` and
 * `*.spec.*` suites, every `src/**​/fixtures/` directory (fixture modules are
 * only imported by tests), and the `*.fixture.ts` convention.
 */
export function isTestCodePath(absolutePath: string): boolean {
  const rel = relative(REPO_ROOT, absolutePath).split(sep).join("/");
  const base = rel.slice(rel.lastIndexOf("/") + 1);
  return (
    base.includes(".test.") ||
    base.includes(".spec.") ||
    base.endsWith(".fixture.ts") ||
    rel.includes("/fixtures/")
  );
}

/**
 * Calls `visit` on every AST node of one source file, parsed with the real
 * TypeScript parser — comments never produce nodes, so comment text can never
 * match a literal check. The file is parsed, not type-checked.
 */
export function forEachSourceNode(
  fileName: string,
  source: string,
  visit: (node: ts.Node, sourceFile: ts.SourceFile) => void,
): void {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const walk = (node: ts.Node): void => {
    visit(node, sourceFile);
    ts.forEachChild(node, walk);
  };
  walk(sourceFile);
}
