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
 * Key coverage — every `process.env` read must name its key: `process.env.KEY`,
 * `process.env["KEY"]`, `"KEY" in process.env`, `const { KEY } = process.env`,
 * `NUAVE_*` string literals anywhere (catches reads through named constants
 * like `const KEY = "NUAVE_X"; process.env[KEY]`), and computed accesses whose
 * argument resolves to fixed literals in the same file (identifier → `const`
 * init, `?:` branches, record member lookups — the two credential selectors
 * resolve cleanly to non-NUAVE literals). `process["env"]` and
 * `globalThis.process.env` are recognized spellings of the same object.
 *
 * Fail closed — an env read whose key cannot be named statically is a
 * violation: a template like ``process.env[`NUAVE_${x}`]``, an unresolved
 * identifier or parameter, a `...rest` destructure, a wholesale `process.env`
 * escape (`const e = process.env`, `f(process.env)`), and the same for the
 * `process` object itself (`const { env } = process`, `process[k]`,
 * `import { env } from "node:process"`).
 *
 * Not enumerable by design: a file that receives the env object smuggled in
 * from somewhere the guard does not flag (e.g. a `{ process }` shorthand or a
 * module that holds a cached copy) — the named-key rule is what makes
 * coverage checkable, so anything that passes the object around without
 * naming keys is rejected instead of trusted.
 */

// NUAVE_* keys are UPPER_SNAKE and end in a letter or digit, so a bare
// "NUAVE_" prefix-check string is not mistaken for a key.
const NUAVE_KEY = /^NUAVE_[A-Z0-9_]*[A-Z0-9]$/;

const PROCESS_MODULE = /^node:process$|^process$/;

/** The `process` object itself: `process` or `globalThis.process` (in either
 *  `["…"]` spelling). */
function isProcessObjectExpression(node: ts.Expression): boolean {
  if (ts.isIdentifier(node)) return node.text === "process";
  const isGlobalThis = (e: ts.Expression) =>
    ts.isIdentifier(e) && e.text === "globalThis";
  if (
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "process"
  ) {
    return isGlobalThis(node.expression);
  }
  if (ts.isElementAccessExpression(node)) {
    const arg = node.argumentExpression;
    return (
      isGlobalThis(node.expression) &&
      !!arg &&
      ts.isStringLiteralLike(arg) &&
      arg.text === "process"
    );
  }
  return false;
}

/** `process.env`, `process["env"]`, `globalThis.process.env` — the object
 *  every env read starts from. */
function isProcessEnvExpression(node: ts.Expression): boolean {
  if (ts.isPropertyAccessExpression(node) && node.name.text === "env") {
    return isProcessObjectExpression(node.expression);
  }
  if (ts.isElementAccessExpression(node)) {
    const arg = node.argumentExpression;
    return (
      !!arg &&
      ts.isStringLiteralLike(arg) &&
      arg.text === "env" &&
      isProcessObjectExpression(node.expression)
    );
  }
  return false;
}

/** A `process.env` node is a named access when its parent reads a member,
 *  destructures it, or `in`-checks a key — only an unconsumed bare
 *  `process.env` escapes wholesale. */
function isConsumedByNamedAccess(node: ts.Expression): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (
    ts.isPropertyAccessExpression(parent) ||
    ts.isElementAccessExpression(parent)
  ) {
    return parent.expression === node;
  }
  if (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.InKeyword &&
    parent.right === node
  ) {
    return true;
  }
  if (parent.kind === ts.SyntaxKind.TypeQuery) return true; // `typeof process.env` is a type, not a read
  return ts.isVariableDeclaration(parent) && parent.initializer === node;
}

/** The `process` object is consumed when its parent reads a member or binds
 *  it in a declaration (which has its own check); name slots
 *  (`x.process`, `{ process: x }`, `import {x as process}`) are not the
 *  global. */
function isProcessObjectConsumed(node: ts.Expression): boolean {
  const parent = node.parent;
  if (!parent) return false;
  // `process.X` — the member access is checked separately; a `.process`
  // name slot (`x.process`) is a different object entirely.
  if (ts.isPropertyAccessExpression(parent)) {
    return parent.expression === node || parent.name === node;
  }
  // `process[x]` — member base, checked by the process-indexing clause.
  // (`x[process]` uses the object as a key — that is an escape.)
  if (ts.isElementAccessExpression(parent)) {
    return parent.expression === node;
  }
  if (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.InKeyword
  ) {
    return true; // `"env" in process` — a presence check, not an env read
  }
  if (parent.kind === ts.SyntaxKind.TypeQuery) return true;
  if (ts.isVariableDeclaration(parent)) return true; // clause flags the decl
  return (
    (parent as { name?: ts.Node }).name === node ||
    (parent as { propertyName?: ts.Node }).propertyName === node
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
  /** `line:col` — `process.env`/`process` uses the guard cannot name a fixed
   *  key for. */
  unverifiable: string[];
};

/** Strips expression wrappers that carry no runtime value. */
function unwrapExpression(expr: ts.Expression): ts.Expression {
  while (
    ts.isParenthesizedExpression(expr) ||
    ts.isAsExpression(expr) ||
    ts.isSatisfiesExpression(expr) ||
    ts.isNonNullExpression(expr)
  ) {
    expr = expr.expression;
  }
  return expr;
}

/**
 * The `NUAVE_*` keys one source references, plus any `process.env`/`process`
 * use the guard cannot resolve to fixed literal keys. Literal `NUAVE_*`
 * strings are keys in their own right (they are how reads through named
 * constants name the key); computed accesses resolve through same-file
 * `const` initializers, conditional branches, and object-literal member
 * values (including `as const` / `satisfies` / `!` wrappers).
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
    expr = unwrapExpression(expr);
    if (ts.isStringLiteralLike(expr)) return [expr.text];
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
      // `RECORD[key]`: resolve the object literal behind the identifier
      // (through `as const`/`satisfies`/`!`/paren wrappers), then the member.
      let target: ts.Expression | null = expr.expression;
      for (let i = 0; i < 6 && target; i++) {
        target = unwrapExpression(target);
        if (ts.isIdentifier(target)) {
          if (shadowed.has(target.text)) {
            target = null;
            break;
          }
          target = constInits.get(target.text) ?? null;
          continue;
        }
        break;
      }
      if (!target || !ts.isObjectLiteralExpression(target)) return null;
      const memberValues = (p: ts.ObjectLiteralElementLike) =>
        ts.isPropertyAssignment(p)
          ? resolveCandidates(p.initializer, depth + 1)
          : null;
      const arg = expr.argumentExpression;
      if (arg && ts.isStringLiteralLike(arg)) {
        const member = target.properties.find(
          (p) =>
            ts.isPropertyAssignment(p) &&
            (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
            p.name.text === arg.text,
        );
        return member ? memberValues(member) : null;
      }
      // Dynamic member (`record[name]`): every property value is a candidate.
      const all: string[] = [];
      for (const p of target.properties) {
        const vals = memberValues(p);
        if (vals === null) return null;
        all.push(...vals);
      }
      return all;
    }
    return null;
  };
  const addResolved = (
    candidates: string[] | null,
    node: ts.Node,
    message: string,
  ): void => {
    if (candidates === null) {
      unverifiable.push(`${at(node)} ${message}`);
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
    // `import … from "process"|"node:process"`, `export … from "process"`,
    // and `require("process")`: the module hands over `env` without naming
    // keys. Type-only imports create no runtime binding.
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      PROCESS_MODULE.test(node.moduleSpecifier.text)
    ) {
      if (!(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly)) {
        unverifiable.push(
          `${at(node)} loads the process module — env reads not enumerable`,
        );
      }
      return;
    }
    if (
      ts.isCallExpression(node) &&
      ((ts.isIdentifier(node.expression) &&
        node.expression.text === "require") ||
        node.expression.kind === ts.SyntaxKind.ImportKeyword) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      PROCESS_MODULE.test(node.arguments[0].text)
    ) {
      unverifiable.push(
        `${at(node)} loads the process module — env reads not enumerable`,
      );
      return;
    }
    // `process.env.KEY` (also `globalThis.process.env.KEY`,
    // `process["env"].KEY`).
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
      addResolved(
        resolveCandidates(arg, 0),
        node,
        "reads process.env with a non-static key",
      );
      return;
    }
    // `"KEY" in process.env` / `key in process.env` — a presence check names
    // a key the same way a read does.
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.InKeyword &&
      isProcessEnvExpression(node.right)
    ) {
      if (!ts.isStringLiteralLike(node.left)) {
        addResolved(
          resolveCandidates(node.left, 0),
          node,
          "tests process.env with a non-static key",
        );
      }
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
          addResolved(
            resolveCandidates(keyNode.expression, 0),
            el,
            "destructures process.env under a computed key",
          );
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
    // `const { env } = process` / `const p = process` — the whole object.
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      isProcessObjectExpression(node.initializer)
    ) {
      unverifiable.push(
        `${at(node)} binds the process object — env reads not enumerable`,
      );
      return;
    }
    // Any other `process.env` use — passed as an argument, spread, returned,
    // `Object.keys(process.env)`: the whole object escapes.
    if (
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      isProcessEnvExpression(node) &&
      !isConsumedByNamedAccess(node)
    ) {
      unverifiable.push(
        `${at(node)} uses process.env wholesale — keys not enumerable`,
      );
      return;
    }
    // `process["env"]` is handled above; `process[<unresolved>]` might be it.
    if (
      ts.isElementAccessExpression(node) &&
      isProcessObjectExpression(node.expression)
    ) {
      const arg = node.argumentExpression;
      if (!arg || ts.isStringLiteralLike(arg)) return;
      const candidates = resolveCandidates(arg, 0);
      if (candidates === null || candidates.includes("env")) {
        unverifiable.push(
          `${at(node)} indexes process with a key that may reach env`,
        );
      }
      return;
    }
    // A bare `process` escape — `f(process)`, `x = process`, iteration.
    if (
      (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) &&
      isProcessObjectExpression(node) &&
      !isProcessObjectConsumed(node)
    ) {
      unverifiable.push(
        `${at(node)} uses process wholesale — env reads not enumerable`,
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
    // Known good: the same record lookup behind `as const` / `satisfies` /
    // `!` wrappers — the usual way such a table is written.
    expect(
      scanEnvReads(
        "src/x.ts",
        'const M = { a: "A_API_KEY", b: "B_API_KEY" } as const;\nconst v = process.env[M[name]];',
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

  it("matcher: other spellings of the env object are covered", () => {
    // Known bad: the three alternate spellings from review — an env import,
    // a destructure of `process`, and `process["env"]`.
    expect(
      scanEnvReads(
        "src/x.ts",
        'import { env } from "node:process";\nexport const a = env.NUAVE_B3_PROBE;',
      ).unverifiable,
    ).toHaveLength(1);
    expect(
      scanEnvReads("src/x.ts", "const { env: e2 } = process;").unverifiable,
    ).toHaveLength(1);
    expect(
      scanEnvReads("src/x.ts", 'const v = process["env"].NUAVE_B3_PROBE;').keys,
    ).toEqual(["NUAVE_B3_PROBE"]);
    // Known bad: the env object reached through `process` still fails closed.
    expect(
      scanEnvReads("src/x.ts", "const p = process;").unverifiable,
    ).toHaveLength(1);
    expect(
      scanEnvReads("src/x.ts", "f(process);").unverifiable,
    ).toHaveLength(1);
    expect(
      scanEnvReads("src/x.ts", 'const v = process[key];').unverifiable,
    ).toHaveLength(1);
    expect(
      scanEnvReads("src/x.ts", 'require("process");').unverifiable,
    ).toHaveLength(1);
    // Known bad: a presence check on a key the env does not set.
    expect(
      scanEnvReads("src/x.ts", 'if ("NUAVE_B3_PROBE" in process.env) {}').keys,
    ).toEqual(["NUAVE_B3_PROBE"]);
    expect(
      scanEnvReads("src/x.ts", "if (key in process.env) {}").unverifiable,
    ).toHaveLength(1);
    // Known good: `process.cwd()` and other members are not env reads.
    expect(
      scanEnvReads("src/x.ts", "const d = process.cwd();"),
    ).toEqual({ keys: [], unverifiable: [] });
    // Known good: a literal `in` check on an allowed key is not a violation.
    expect(
      scanEnvReads(
        "src/x.ts",
        'if ("NUAVE_AUDIT_MODE" in process.env) {}',
      ),
    ).toEqual({ keys: ["NUAVE_AUDIT_MODE"], unverifiable: [] });
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
