import { chromium } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { collectRequests } from "../../../../tests/e2e/helpers";
import { trackApiCalls } from "../../../../tests/e2e/journey";
import { unexpectedExternalRequests } from "../../../../tests/e2e/network-guard";
import { offlineE2EServerEnv } from "../../../../tests/e2e/shared-config";
import {
  createContext,
  FEATURES,
  INJECTIONS,
  recipe,
  type Feature,
} from "./features";
import {
  checkoutRoot,
  cwdOf,
  groupAlive,
  groupMembers,
  listeners,
  newRunId,
  pgidOf,
  readState,
  runDir,
  stamp,
  writeState,
  type RunState,
} from "./run-state";

const FAULT_INJECTED = "fault-injected (not user-reachable in synthetic mode)";
const SYNTHETIC_LABEL =
  "Mode uji lokal menggunakan pengganti sintetis berlabel.";

const USAGE = `verify-nuave — drive the Nuave audit journey in synthetic mode

  launch  [--port 3100]                 start next dev (synthetic) as its own process group
  doctor  [--allow-dirty] [--run <id>]  read-only: is this instance worth driving?
  doctor  --pr <n>                      preview: comment commit == PR head SHA
  drive   <feature|all> [--inject usefulness-failure] [--run <id>]
  capture [--run <id>]                  check and index the run's evidence
  cleanup [--run <id>]                  stop this run's process group only

features: ${FEATURES.join(", ")}
evidence: .local-evidence/verify-nuave/<run-id>/`;

type Check = { name: string; ok: boolean | "skip"; detail: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function answers(url: string) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(5_000) });
    return true;
  } catch {
    return false;
  }
}

function tail(file: string, lines = 30) {
  return existsSync(file)
    ? readFileSync(file, "utf8").split("\n").slice(-lines).join("\n")
    : "";
}

async function launch(root: string, port: number) {
  const busy = listeners(port);
  if (busy.length)
    throw new Error(
      `Port ${port} is already in use (pid ${busy.join(", ")}). Pick another --port; never drive a server this run did not start.`,
    );
  const runId = newRunId();
  const dir = runDir(root, runId);
  mkdirSync(dir, { recursive: true });
  const logFile = join(dir, "server.log");
  const log = openSync(logFile, "a");
  const child = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev", "--", "--port", String(port), "--hostname", "127.0.0.1"],
    {
      cwd: root,
      // Own process group (setsid), so cleanup can stop npm and every
      // next dev child it spawns — and nothing else.
      detached: true,
      stdio: ["ignore", log, log],
      env: offlineE2EServerEnv({
        NUAVE_NEW_AUDIT_ENABLED: "true",
        NUAVE_AUDIT_MODE: "synthetic",
      }),
    },
  );
  child.unref();
  const state: RunState = {
    runId,
    pgid: child.pid!,
    port,
    root,
    mode: "synthetic",
    launchedAt: new Date().toISOString(),
    logFile: relative(root, logFile),
    status: "running",
  };
  writeState(root, state);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (!groupAlive(state.pgid))
      throw new Error(`next dev exited during launch:\n${tail(logFile)}`);
    if (await answers(`http://127.0.0.1:${port}/`)) {
      console.log(JSON.stringify({ ready: true, ...state }, null, 2));
      return;
    }
    await sleep(500);
  }
  throw new Error(
    `http://127.0.0.1:${port}/ did not answer within 120 s. Run cleanup.\n${tail(logFile)}`,
  );
}

/** The process checks drive also runs: alive, owns the port, right folder. */
function processChecks(root: string, state: RunState): Check[] {
  const checks: Check[] = [];
  checks.push({
    name: "state-root-is-this-checkout",
    ok: state.root === root,
    detail: `state root ${state.root}; this checkout ${root}`,
  });
  const alive = groupAlive(state.pgid);
  checks.push({
    name: "process-group-alive",
    ok: alive,
    detail: `pgid ${state.pgid}`,
  });
  const pids = listeners(state.port);
  const owned = pids.filter((pid) => pgidOf(pid) === state.pgid);
  checks.push({
    name: "port-owned-by-this-run",
    ok: pids.length > 0 && owned.length === pids.length,
    detail: pids.length
      ? pids.map((pid) => `pid ${pid} pgid ${pgidOf(pid)}`).join("; ")
      : `nothing listens on ${state.port}`,
  });
  const cwds = pids.map((pid) => ({ pid, cwd: cwdOf(pid) }));
  checks.push({
    name: "server-started-from-state-root",
    ok:
      cwds.length === 0 ? "skip" : cwds.every(({ cwd }) => cwd === state.root),
    detail: cwds.length
      ? cwds
          .map(({ pid, cwd }) =>
            cwd === state.root
              ? `pid ${pid} cwd ${cwd}`
              : `ROOT MISMATCH: pid ${pid} was started from ${cwd ?? "(unknown)"}, state root is ${state.root}`,
          )
          .join("; ")
      : "no listener to inspect",
  });
  return checks;
}

function printChecks(checks: Check[]) {
  for (const check of checks)
    console.log(
      `${check.ok === "skip" ? "SKIP" : check.ok ? "PASS" : "FAIL"}  ${check.name}  — ${check.detail}`,
    );
  const failed = checks.filter((check) => check.ok === false);
  console.log(
    failed.length
      ? `\ndoctor: FAIL (${failed.map((c) => c.name).join(", ")})`
      : "\ndoctor: OK",
  );
  return failed.length === 0;
}

async function doctorLocal(
  root: string,
  runId: string | undefined,
  allowDirty: boolean,
) {
  const state = readState(root, runId);
  const checks = processChecks(root, state);
  const base = `http://127.0.0.1:${state.port}`;
  checks.push({
    name: "port-answers",
    ok: await answers(`${base}/`),
    detail: `${base}/`,
  });
  checks.push({
    name: "state-mode-synthetic",
    ok: state.mode === "synthetic",
    detail: `recorded mode ${state.mode}`,
  });
  if (checks.every((check) => check.ok !== false)) {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ baseURL: base });
      const calls = trackApiCalls(page);
      await page.goto("/audit", { timeout: 90_000 });
      const entry = await page
        .locator('[data-intake-screen="entry"]')
        .waitFor({ state: "visible", timeout: 60_000 })
        .then(() => true)
        .catch(() => false);
      checks.push({
        name: "audit-entry-renders",
        ok: entry,
        detail: entry
          ? "[data-intake-screen=entry] visible"
          : "entry screen not visible",
      });
      const label = await page
        .getByText(SYNTHETIC_LABEL, { exact: true })
        .isVisible();
      checks.push({
        name: "served-mode-synthetic",
        ok: label,
        detail: label
          ? `"${SYNTHETIC_LABEL}" shown`
          : "synthetic label missing (live or disabled?)",
      });
      checks.push({
        name: "doctor-made-no-api-call",
        ok: Object.keys(calls).length === 0,
        detail: JSON.stringify(calls),
      });
    } finally {
      await browser.close();
    }
  } else {
    for (const name of [
      "audit-entry-renders",
      "served-mode-synthetic",
      "doctor-made-no-api-call",
    ])
      checks.push({ name, ok: "skip", detail: "earlier check failed" });
  }
  const now = stamp(root);
  checks.push({
    name: "working-tree-clean",
    ok: !now.dirty || allowDirty,
    detail: now.dirty
      ? `${allowDirty ? "dirty, allowed by --allow-dirty" : "dirty"}: ${now.dirtyFiles.join(", ")}`
      : `clean at ${now.head}`,
  });
  return printChecks(checks);
}

async function doctorPreview(pr: number) {
  const repo = execFileSync(
    "gh",
    ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
    { encoding: "utf8" },
  ).trim();
  const head = execFileSync(
    "gh",
    ["pr", "view", String(pr), "--json", "headRefOid", "-q", ".headRefOid"],
    { encoding: "utf8" },
  ).trim();
  const bodies = execFileSync(
    "gh",
    [
      "api",
      `/repos/${repo}/issues/${pr}/comments`,
      "--paginate",
      "--jq",
      '.[] | select(.user.login == "github-actions[bot]" and (.body | contains("<!-- nuave-pr-preview -->"))) | .body | @json',
    ],
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string);
  const body = bodies.at(-1) ?? "";
  const commit =
    body.match(/Updated from commit `([0-9a-f]{40})`/)?.[1] ?? null;
  const url = body.match(/\*\*Landing page:\*\* (\S+)/)?.[1] ?? null;
  const checks: Check[] = [
    {
      name: "preview-comment-found",
      ok: !!body,
      detail: body ? "found" : "no nuave-pr-preview comment",
    },
    {
      name: "preview-commit-is-pr-head",
      ok: commit === head,
      detail: `comment ${commit ?? "(none)"}; PR head ${head}`,
    },
  ];
  if (url) {
    // The journey renders after hydration, so the raw HTML never carries the
    // label; render /audit in a browser as the local doctor does.
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const response = await page.goto(`${url}/audit`).catch(() => null);
      const label = await page
        .getByText(SYNTHETIC_LABEL, { exact: true })
        .waitFor({ state: "visible", timeout: 30_000 })
        .then(() => true)
        .catch(() => false);
      checks.push({
        name: "preview-audit-synthetic",
        ok: !!response?.ok() && label,
        detail: `${url}/audit → ${response?.status() ?? "no answer"}; ${label ? "synthetic label shown" : "synthetic label missing"}`,
      });
    } finally {
      await browser.close();
    }
  }
  return printChecks(checks);
}

async function drive(
  root: string,
  feature: Feature,
  inject: string | undefined,
  runId: string | undefined,
) {
  const state = readState(root, runId);
  const pre = processChecks(root, state);
  if (pre.some((check) => check.ok === false)) {
    printChecks(pre);
    throw new Error(
      "Refusing to drive: this is not the server this run started. Run doctor.",
    );
  }
  const label = inject ? `${feature}--inject-${inject}` : feature;
  const dir = join(runDir(root, state.runId), label);
  // A re-drive replaces that feature's evidence; stale files never mix in.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const stamped = stamp(root);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: `http://127.0.0.1:${state.port}`,
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(90_000);
  const urls = collectRequests(page);
  const calls = trackApiCalls(page);
  const network: { method: string; url: string; status: number | string }[] =
    [];
  // Response lookups can outlive the recipe; settle them before closing the
  // browser, or a lookup rejected by the close would end the process.
  const pending: Promise<void>[] = [];
  page.on("requestfinished", (request) =>
    pending.push(
      request
        .response()
        .then(
          (response) => response?.status() ?? "none",
          () => "none",
        )
        .then((status) => {
          network.push({
            method: request.method(),
            url: request.url(),
            status,
          });
        }),
    ),
  );
  page.on("requestfailed", (request) =>
    network.push({
      method: request.method(),
      url: request.url(),
      status: `failed: ${request.failure()?.errorText}`,
    }),
  );
  const ctx = createContext(page, dir, calls);
  let error: string | null = null;
  try {
    await recipe(feature, inject)(ctx);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    await page
      .screenshot({ path: join(dir, "failure.png"), fullPage: true })
      .catch(() => {});
  }
  await Promise.allSettled(pending);
  await browser.close();
  const unexpected = unexpectedExternalRequests(urls);
  if (!error && unexpected.length)
    error = `unexpected external requests: ${unexpected.join(", ")}`;
  writeFileSync(
    join(dir, "network.json"),
    `${JSON.stringify({ collectRequests: urls, detail: network, apiCalls: calls, unexpectedExternalRequests: unexpected }, null, 2)}\n`,
  );
  const status = error ? "failed" : inject ? FAULT_INJECTED : "passed";
  const result = {
    feature,
    inject: inject ?? null,
    status,
    error,
    runId: state.runId,
    stamp: stamped,
    baseURL: `http://127.0.0.1:${state.port}`,
    mode: state.mode,
    steps: ctx.steps,
    checks: ctx.checks,
    artifacts: ctx.artifacts,
    network: "network.json",
    unexpectedExternalRequests: unexpected,
  };
  writeFileSync(
    join(dir, "result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(
    `${status.toUpperCase()}  ${label}  (HEAD ${stamped.head.slice(0, 7)}${stamped.dirty ? ", dirty" : ""})  → ${relative(root, dir)}`,
  );
  if (error) console.log(`  ${error.split("\n").slice(0, 6).join("\n  ")}`);
  return !error;
}

function capture(root: string, runId: string | undefined) {
  const state = readState(root, runId);
  const dir = runDir(root, state.runId);
  const drives = readdirSync(dir)
    .filter((name) => existsSync(join(dir, name, "result.json")))
    .map((name) => ({
      name,
      result: JSON.parse(readFileSync(join(dir, name, "result.json"), "utf8")),
    }));
  const problems: string[] = [];
  for (const { name, result } of drives) {
    const needed = [
      result.network,
      ...result.steps.flatMap((s: { screenshot: string; aria: string }) => [
        s.screenshot,
        s.aria,
      ]),
      ...(result.artifacts.pdf ? [result.artifacts.pdf] : []),
      ...(result.artifacts.json ? [result.artifacts.json] : []),
    ];
    for (const file of needed)
      if (!existsSync(join(dir, name, file)))
        problems.push(`${name}: missing ${file}`);
    if (result.status === "failed")
      problems.push(`${name}: drive failed — ${result.error}`);
    if (result.unexpectedExternalRequests.length)
      problems.push(`${name}: unexpected external requests`);
  }
  const driven = new Set(drives.map((d) => d.name));
  const missing = [
    ...FEATURES,
    "report-and-recovery--inject-usefulness-failure",
  ].filter((name) => !driven.has(name));
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = join(entry.parentPath, entry.name);
      return {
        path: relative(dir, path),
        bytes: statSync(path).size,
        sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
      };
    })
    .filter((file) => file.path !== "capture.json");
  const manifest = {
    runId: state.runId,
    capturedAt: new Date().toISOString(),
    drives: drives.map(({ name, result }) => ({
      name,
      status: result.status,
      head: result.stamp.head,
      dirty: result.stamp.dirty,
      steps: result.steps.length,
      unexpectedExternalRequests: result.unexpectedExternalRequests.length,
    })),
    notDriven: missing,
    problems,
    files,
  };
  writeFileSync(
    join(dir, "capture.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  for (const drive of manifest.drives)
    console.log(
      `${drive.status.padEnd(8)}  ${drive.name}  HEAD ${drive.head.slice(0, 7)}${drive.dirty ? " dirty" : ""}  steps ${drive.steps}  external ${drive.unexpectedExternalRequests}`,
    );
  if (missing.length) console.log(`not driven: ${missing.join(", ")}`);
  for (const problem of problems) console.log(`PROBLEM  ${problem}`);
  console.log(
    `${files.length} files indexed → ${relative(root, join(dir, "capture.json"))}`,
  );
  return problems.length === 0;
}

async function cleanup(root: string, runId: string | undefined) {
  const state = readState(root, runId);
  const members = groupMembers(state.pgid);
  const record: Record<string, unknown> = {
    pgid: state.pgid,
    membersBefore: members,
    listenersBefore: listeners(state.port),
  };
  if (
    members.length &&
    !members.some(({ command }) => /npm|next/.test(command))
  )
    throw new Error(
      `Process group ${state.pgid} has no npm/next member; it is not this run's server. Nothing stopped.`,
    );
  const signals: string[] = [];
  for (const [signal, wait] of [
    ["SIGTERM", 15_000],
    ["SIGKILL", 5_000],
  ] as const) {
    if (!groupAlive(state.pgid)) break;
    process.kill(-state.pgid, signal);
    signals.push(signal);
    const deadline = Date.now() + wait;
    while (groupAlive(state.pgid) && Date.now() < deadline) await sleep(250);
  }
  const after = listeners(state.port);
  Object.assign(record, {
    signals,
    groupGone: !groupAlive(state.pgid),
    listenersAfter: after.map((pid) => ({
      pid,
      pgid: pgidOf(pid),
      cwd: cwdOf(pid),
    })),
    portFree: after.length === 0,
    stoppedAt: new Date().toISOString(),
  });
  writeFileSync(
    join(runDir(root, state.runId), "cleanup.json"),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  writeState(root, {
    ...state,
    status: "stopped",
    stoppedAt: record.stoppedAt as string,
  });
  console.log(JSON.stringify(record, null, 2));
  if (after.length)
    throw new Error(
      `Port ${state.port} is still bound by pid ${after.join(", ")}. Not killed: not in this run's process group ${state.pgid}.`,
    );
  console.log(
    `cleanup: stopped process group ${state.pgid}; port ${state.port} is free; evidence kept in ${relative(root, runDir(root, state.runId))}`,
  );
}

export async function main(argv: string[], from: string) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      port: { type: "string", default: "3100" },
      run: { type: "string" },
      pr: { type: "string" },
      inject: { type: "string" },
      "allow-dirty": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const [command, target] = positionals;
  if (!command || values.help) {
    console.log(USAGE);
    return 0;
  }
  const root = checkoutRoot(from);
  switch (command) {
    case "launch":
      await launch(root, Number(values.port));
      return 0;
    case "doctor":
      return (
        values.pr
          ? await doctorPreview(Number(values.pr))
          : await doctorLocal(root, values.run, values["allow-dirty"])
      )
        ? 0
        : 1;
    case "drive": {
      if (target === "all") {
        let ok = true;
        for (const feature of FEATURES)
          ok = (await drive(root, feature, undefined, values.run)) && ok;
        for (const [feature, injections] of Object.entries(INJECTIONS))
          for (const inject of injections)
            ok =
              (await drive(root, feature as Feature, inject, values.run)) && ok;
        return ok ? 0 : 1;
      }
      if (!FEATURES.includes(target as Feature))
        throw new Error(`Unknown feature "${target}". ${USAGE}`);
      return (await drive(root, target as Feature, values.inject, values.run))
        ? 0
        : 1;
    }
    case "capture":
      return capture(root, values.run) ? 0 : 1;
    case "cleanup":
      await cleanup(root, values.run);
      return 0;
    default:
      throw new Error(`Unknown command "${command}".\n${USAGE}`);
  }
}
