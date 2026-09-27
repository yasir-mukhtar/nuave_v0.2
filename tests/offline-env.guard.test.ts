import { readFileSync } from "node:fs";
import { relative } from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";
import { offlineE2EServerEnv } from "./e2e/shared-config";
import {
  forEachNode,
  isTestCodePath,
  parseSource,
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
 *
 * Coverage: `process.env.KEY` reads, `process.env["KEY"]` reads, `NUAVE_*`
 * string literals anywhere (which catches reads through named constants like
 * `const KEY = "NUAVE_X"; process.env[KEY]`), `const { NUAVE_X } = process.env`
 * destructuring, and same-file constant indirection in computed accesses
 * (`process.env[variable]` where `variable` resolves to literal candidates).
 * A `process.env` read whose key cannot be resolved to fixed literals — a
 * template like `process.env[`NUAVE_${x}`]`, a `...rest` destructure, an
 * argument passed `process.env` wholesale — fails closed: the guard cannot
 * prove coverage, so it is a violation. Bulk enumeration
 * (`Object.keys(process.env)`, `Reflect.get`) is outside what a source guard
 * can enumerate; the named-key rule is what makes coverage checkable.
 */

// NUAVE_* keys are UPPER_SNAKE and end in a letter or digit, so a bare
// "NUAVE_" prefix-check string is not mistaken for a key.
const NUAVE_KEY = /^NUAVE_[A-Z0-9_]*[A-Z0-9]$/;

/** `process.env` or `globalThis.process.env` — the object every read starts
 *  from. */
function isProcessEnvExpression(node: ts.Expression): boolean {
  if (!ts.isPropertyAccessExpression(node) || node.name.text !== "env") {
    return false;
  }
  const inner = node.expression;
  if (ts.isIdentifier(inner)) return inner.text === "process";
  return (
    ts.isPropertyAccessExpression(inner) &&
    inner.name.text === "process" &&
    ts.isIdentifier(inner.expression) &&
    inner.expression.text === "globalThis"
  );
}

function collectBoundNames(name: ts.BindingName, into: Set<string>): void {
  if (ts.isIdentifier(name)) {
    into.add(name.text);
    return;
  }
  for (const el of name.elements) {
    if (ts.isBindingElement(el)) collectBoundNames(el.name, into);
  }
}

/** A `process.env` node is a named access when its parent reads a member or
 *  destructures it — only an unconsumed bare `process.env` escapes wholesale. */
function isConsumedByNamedAccess(node: ts.Expression): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) {
    return parent.expression === node;
  }
  return ts.isVariableDeclaration(parent) && parent.initializer === node;
}

type NameInfo = {
  /** `const name = init` bindings; `null` marks a name declared twice. */
  constInits: Map<string, ts.Expression | null>;
  /** Names bound by params, `let`/`var`, or binding patterns — an identifier
   *  with any of these cannot be trusted to hold its file-level `const`
   *  initializer, so resolution fails closed. */
  shadowed: Set<string>;
};

function collectNameInfo(sourceFile: ts.SourceFile): NameInfo {
  const constInits = new Map<string, ts.Expression | null>();
  const shadowed = new Set<string>();
  forEachNode(sourceFile, (node) => {
    if (ts.isVariableDeclaration(node)) {
      const list = node.parent;
      const isConst =
        ts.isVariableDeclarationList(list) &&
        (list.flags & ts.NodeFlags.Const) !== 0;
      if (!ts.isIdentifier(node.name)) {
        collectBoundNames(node.name, shadowed);
        return;
      }
      if (!isConst || !node.initializer || constInits.has(node.name.text)) {
        // `let`/`var`, for-of/in bindings, or a redeclared name: unresolvable.
        shadowed.add(node.name.text);
        constInits.set(node.name.text, null);
        return;
      }
      constInits.set(node.name.text, node.initializer);
      return;
    }
    if (ts.isParameter(node)) collectBoundNames(node.name, shadowed);
  });
  return { constInits, shadowed };
}

type EnvScan = {
  /** Resolved NUAVE_* keys the source references. */
  keys: string[];
  /** `line:col` — `process.env` reads the guard cannot name a fixed key for. */
  unverifiable: string[];
};

/**
 * The `NUAVE_*` keys one source references, plus any `process.env` access the
 * guard cannot resolve to fixed literal keys. Literal `NUAVE_*` strings are
 * keys in their own right (they are how reads through named constants name
 * the key); non-literal computed accesses resolve through same-file `const`
 * initializers, conditional branches, and object-literal member values.
 */
function scanEnvReads(path: string, source: string): EnvScan {
  const sourceFile = parseSource(path, source);
  const { constInits, shadowed } = collectNameInfo(sourceFile);
  const keys = new Set<string>();
  const unverifiable: string[] = [];
  const at = (node: ts.Node): string => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    return `${line + 1}:${character + 1}`;
  };

  /** Fixed literal values `expr` can evaluate to, resolved through same-file
   *  const initializers, `?:` branches, and record member lookups. `null` =
   *  cannot fully resolve (call, template, parameter, dynamic member over a
   *  non-literal object, …). */
  const resolveCandidates = (
    expr: ts.Expression,
    depth: number,
  ): string[] | null => {
    if (depth > 4) return null;
    if (ts.isStringLiteralLike(expr)) return [expr.text];
    if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr)) {
      return resolveCandidates(expr.expression, depth + 1);
    }
    if (ts.isIdentifier(expr)) {
      if (shadowed.has(expr.text)) return null;
      const init = constInits.get(expr.text);
      return init ? resolveCandidates(init, depth + 1) : null;
    }
    if (ts.isConditionalExpression(expr)) {
      const a = resolveCandidates(expr.whenTrue, depth + 1);
      const b = resolveCandidates(expr.whenFalse, depth + 1);
      return a && b ? [...a, ...b] : null;
    }
    if (ts.isElementAccessExpression(expr)) {
      const targetExpr = ts.isIdentifier(expr.expression)
        ? shadowed.has(expr.expression.text)
          ? null
          : (constInits.get(expr.expression.text) ?? null)
        : expr.expression;
      if (!targetExpr || !ts.isObjectLiteralExpression(targetExpr)) return null;
      const memberValues = (p: ts.ObjectLiteralElementLike) =>
        ts.isPropertyAssignment(p)
          ? resolveCandidates(p.initializer, depth + 1)
          : null;
      const arg = expr.argumentExpression;
      if (arg && ts.isStringLiteralLike(arg)) {
        const member = targetExpr.properties.find(
          (p) =>
            ts.isPropertyAssignment(p) &&
            (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
            p.name.text === arg.text,
        );
        return member ? memberValues(member) : null;
      }
      // Dynamic member (`record[name]`): every property value is a candidate.
      const all: string[] = [];
      for (const p of targetExpr.properties) {
        const vals = memberValues(p);
        if (vals === null) return null;
        all.push(...vals);
      }
      return all;
    }
    return null;
  };
  const addResolved = (candidates: string[] | null, node: ts.Node): void => {
    if (candidates === null) {
      unverifiable.push(`${at(node)} reads process.env with a non-static key`);
      return;
    }
    for (const key of candidates) {
      if (NUAVE_KEY.test(key)) keys.add(key);
    }
  };

  forEachNode(sourceFile, (node) => {
    // A NUAVE_* string literal — a direct key or the name behind a named
    // constant (`const K = "NUAVE_X"` read later as `process.env[K]`).
    if (ts.isStringLiteralLike(node) && NUAVE_KEY.test(node.text)) {
      keys.add(node.text);
      return;
    }
    // `process.env.KEY` (also matches `globalThis.process.env.KEY`).
    if (
      ts.isPropertyAccessExpression(node) &&
      isProcessEnvExpression(node.expression)
    ) {
      if (NUAVE_KEY.test(node.name.text)) keys.add(node.name.text);
      return;
    }
    // `process.env[...]` — literal args already matched above; anything else
    // must resolve to fixed literal keys or it fails closed.
    if (
      ts.isElementAccessExpression(node) &&
      isProcessEnvExpression(node.expression)
    ) {
      const arg = node.argumentExpression;
      if (!arg || ts.isStringLiteralLike(arg)) return;
      addResolved(resolveCandidates(arg, 0), node);
      return;
    }
    // `const { A, B: b, ...rest } = process.env` and `const e = process.env`.
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      isProcessEnvExpression(node.initializer)
    ) {
      if (!ts.isObjectBindingPattern(node.name)) {
        unverifiable.push(
          `${at(node)} binds process.env wholesale — keys not enumerable`,
        );
        return;
      }
      for (const el of node.name.elements) {
        if (el.dotDotDotToken) {
          unverifiable.push(
            `${at(el)} destructures the rest of process.env — keys not enumerable`,
          );
          continue;
        }
        const keyNode = el.propertyName ?? el.name;
        if (ts.isComputedPropertyName(keyNode)) {
          addResolved(resolveCandidates(keyNode.expression, 0), el);
          continue;
        }
        if (ts.isIdentifier(keyNode) || ts.isStringLiteral(keyNode)) {
          if (NUAVE_KEY.test(keyNode.text)) keys.add(keyNode.text);
        } else {
          unverifiable.push(
            `${at(el)} destructures process.env under a non-literal key`,
          );
        }
      }
      return;
    }
    // Any other `process.env` use — passed as an argument, spread, returned:
    // the whole object escapes and its NUAVE_* keys cannot be enumerated. A
    // `process.env` node consumed by a named access or destructure above is
    // not a wholesale use.
    if (
      ts.isPropertyAccessExpression(node) &&
      isProcessEnvExpression(node) &&
      !isConsumedByNamedAccess(node)
    ) {
      unverifiable.push(
        `${at(node)} uses process.env wholesale — keys not enumerable`,
      );
    }
  });
  return { keys: [...keys], unverifiable };
}

describe("offline e2e env coverage (§B.3 class B)", () => {
  // The allowed set comes from calling the real function, never from parsing
  // its source, so the guard cannot drift from what the server env sets.
  const allowed = new Set(Object.keys(offlineE2EServerEnv()));

  it("matcher: env reads and key literals flag, comments do not", () => {
    // Known bad: direct read; bracket read; read through a named constant.
    expect(
      scanEnvReads("src/x.ts", "const v = process.env.NUAVE_B3_PROBE;").keys,
    ).toEqual(["NUAVE_B3_PROBE"]);
    expect(
      scanEnvReads("src/x.ts", "const v = process.env['NUAVE_B3_PROBE'];").keys,
    ).toEqual(["NUAVE_B3_PROBE"]);
    expect(
      scanEnvReads(
        "src/x.ts",
        'const KEY = "NUAVE_B3_PROBE";\nconst v = process.env[KEY];',
      ).keys,
    ).toEqual(["NUAVE_B3_PROBE"]);
    expect(scanEnvReads("src/x.ts", "const k = `NUAVE_B3_PROBE`;").keys).toEqual(
      ["NUAVE_B3_PROBE"],
    );
    // Known good: comments never produce nodes.
    expect(
      scanEnvReads(
        "src/x.ts",
        '// process.env.NUAVE_B3_PROBE\n/* "NUAVE_B3_PROBE" */\nconst v = 1;',
      ),
    ).toEqual({ keys: [], unverifiable: [] });
    // Known good: a key the offline env sets is not a violation.
    expect(
      scanEnvReads("src/x.ts", "const v = process.env.NUAVE_AUDIT_MODE;").keys,
    ).toEqual(["NUAVE_AUDIT_MODE"]);
    expect(allowed.has("NUAVE_AUDIT_MODE")).toBe(true);
  });

  it("matcher: destructured and computed env reads are covered", () => {
    // Known bad: destructuring a key the offline env does not set.
    expect(
      scanEnvReads("src/x.ts", "const { NUAVE_B3_PROBE } = process.env;").keys,
    ).toEqual(["NUAVE_B3_PROBE"]);
    // Known bad: destructuring under an alias still names the env key.
    expect(
      scanEnvReads(
        "src/x.ts",
        "const { NUAVE_B3_PROBE: probe } = process.env;",
      ).keys,
    ).toEqual(["NUAVE_B3_PROBE"]);
    // Known bad: a computed access whose key is not a fixed literal fails
    // closed — `process.env[`NUAVE_${x}`]` and an unresolved identifier.
    expect(
      scanEnvReads(
        "src/x.ts",
        'const part = "X";\nconst v = process.env[`NUAVE_${part}`];',
      ).unverifiable,
    ).toHaveLength(1);
    expect(
      scanEnvReads(
        "src/x.ts",
        "function f(key: string) {\n  return process.env[key];\n}",
      ).unverifiable,
    ).toHaveLength(1);
    // Known bad: escaping the whole object cannot be enumerated.
    expect(
      scanEnvReads("src/x.ts", "const { ...rest } = process.env;").unverifiable,
    ).toHaveLength(1);
    expect(
      scanEnvReads("src/x.ts", "const env = process.env;").unverifiable,
    ).toHaveLength(1);
    expect(
      scanEnvReads("src/x.ts", "f(process.env);").unverifiable,
    ).toHaveLength(1);
    // Known good: a computed access that resolves to fixed non-NUAVE literals
    // — the credential selector shape in provider.ts / questions-id-provider.ts.
    expect(
      scanEnvReads(
        "src/x.ts",
        'const variable = cond ? "A_API_KEY" : "B_API_KEY";\nconst v = process.env[variable];',
      ),
    ).toEqual({ keys: [], unverifiable: [] });
    expect(
      scanEnvReads(
        "src/x.ts",
        'const M = { a: "A_API_KEY", b: "B_API_KEY" };\nconst v = process.env[M[name]];',
      ),
    ).toEqual({ keys: [], unverifiable: [] });
    // Known good: a destructure of a key the offline env sets is not a
    // violation.
    expect(
      scanEnvReads("src/x.ts", "const { NUAVE_AUDIT_MODE } = process.env;"),
    ).toEqual({ keys: ["NUAVE_AUDIT_MODE"], unverifiable: [] });
    // Known good: destructuring a non-NUAVE key is out of scope.
    expect(
      scanEnvReads("src/x.ts", "const { OPENAI_API_KEY } = process.env;"),
    ).toEqual({ keys: [], unverifiable: [] });
  });

  it("every NUAVE_* key read in non-test src/ is set by offlineE2EServerEnv()", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      if (isTestCodePath(file)) continue;
      const { keys, unverifiable } = scanEnvReads(
        file,
        readFileSync(file, "utf8"),
      );
      for (const key of keys) {
        if (!allowed.has(key)) {
          offenders.push(`${relative(REPO_ROOT, file)} reads ${key}`);
        }
      }
      for (const where of unverifiable) {
        offenders.push(`${relative(REPO_ROOT, file)}:${where}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
