#!/usr/bin/env node
// Workers runtime check for the order flow (spec 010 R-10a, spec 016 R-15,
// R-33, AC-10, AC-11).
//
// The browser e2e harness runs `next dev`, so this script exercises the real
// OpenNext bundle and the custom worker entry (worker.mjs) inside workerd via
// `wrangler dev --test-scheduled`, with a LOCAL D1 database (no network, no
// provider calls, synthetic mode, the fake email sender):
//
//   1. `opennextjs-cloudflare build` (the same artifact deploy produces);
//   2. the migrations are applied to a temporary local database;
//   3. wrangler dev with NO `--var`: the settings are written to `.dev.vars`
//      (the local form of the Worker secrets the deploy job sets), and the
//      build environment does NOT carry the audit switch, so a cron that could
//      not see the Worker's settings would do nothing;
//   3a. (R-33) the FIRST thing the fresh worker receives is the cron: it expires
//      an overdue open order put straight into the local database, proving it
//      sees the Worker's own settings and database before any web request;
//   4. an order is made, its questions approved, and the cron (`__scheduled`)
//      runs the audit and delivers it, which shows the cron sees the same
//      settings and the same local D1 database as a web request;
//   5. the dev-only trigger and the internal cron route answer 404 on the
//      built worker; the retired run/report routes refuse;
//   5b. (spec 016 S3b, in the same worker) the private report page and its data
//      route: private headers, one identical answer for any wrong or switched-off
//      secret, and the saved report for a secret whose hash is stored;
//   6. restarts: an approved order is left unfinished, then a worker with the
//      switch off, and one with an unclear mode, run the cron and change
//      nothing; a worker with the right settings then finishes it;
//   7. `wrangler deploy --dry-run` bundles the worker for production and for
//      the preview environment, and the script records the gzipped size.
//
// It writes a temporary `.env.production.local` (dummy build-time provider
// values, as scripts/verify-offline.mjs) and a temporary `.dev.vars`, and
// always restores both. Run: `npm run test:workers`.

import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  captureFileSnapshot,
  offlineVerifierEnv,
  restoreFileSnapshot,
  terminateProcessTree,
} from "./verify-offline-helpers.mjs";

const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";
const PORT = 8_787;
const READY_TIMEOUT_MS = 180_000;
const REQUEST_TIMEOUT_MS = 60_000;
/** The Workers Free limit on a gzipped worker, in KiB. Not checked against
 * Cloudflare's docs from here (no network): it is the figure the PR lists as
 * "to verify". */
const FREE_PLAN_GZIP_LIMIT_KIB = 3_072;

const buildOnlyEnv = `NUAVE_PROVIDER=opencodego
NUAVE_QUESTION_PROVIDER=opencodego
OPENCODEGO_API_KEY=dummy-build-only-key
OPENAI_API_KEY=dummy-build-only-key
OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
OPENAI_AUDIT_MODEL=gpt-5.6-luna
OPENAI_AUDIT_REASONING_EFFORT=low
NUAVE_LIVE_PROVIDER_TESTING=0
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
`;

const context = {
  version: "nuave-direct-ten-context-v2",
  identity: {
    name: "Kopi Nuave",
    source: "https://kopinuave.example/",
    sourceOrigin: "owner",
    aliases: ["Nuave Coffee"],
    origin: "owner",
  },
  focus: { value: { kind: "brand" }, origin: "nuave" },
  category: { value: "kedai kopi", origin: "website" },
  offerings: { value: ["kopi"], origin: "website" },
  serviceChannels: { value: ["on_premise"], origin: "website" },
  market: { value: { reach: "sekitar", areas: ["Jakarta"] }, origin: "website" },
  comparators: { value: { mode: "unknown" }, origin: "nuave" },
};
const prompts = Array.from({ length: 10 }, (_, index) => ({
  prompt_id: `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
  question: `Apa pilihan coffee shop di Jakarta untuk kebutuhan ${index + 1}?`,
  review_status: "needs_human_review",
}));

const results = [];
const record = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const productionEnvPath = resolve(".env.production.local");
const devVarsPath = resolve(".dev.vars");
const productionEnvSnapshot = captureFileSnapshot(productionEnvPath);
const devVarsSnapshot = captureFileSnapshot(devVarsPath);
const workDir = mkdtempSync(join(tmpdir(), "nuave-workers-check-"));
const stateDir = join(workDir, "state");
const activeChildren = new Set();
let interrupted = false;

function cleanup() {
  for (const child of activeChildren) terminateProcessTree(child, "SIGTERM");
  restoreFileSnapshot(productionEnvSnapshot);
  restoreFileSnapshot(devVarsSnapshot);
  rmSync(workDir, { recursive: true, force: true });
}

const onSignal = (signal) => {
  if (interrupted) return;
  interrupted = true;
  console.error(`\nInterrupted by ${signal}; restoring temporary files.`);
  cleanup();
  process.exit(signal === "SIGINT" ? 130 : 143);
};
process.once("SIGINT", onSignal);
process.once("SIGTERM", onSignal);

const baseEnv = () => ({
  ...offlineVerifierEnv(),
  CI: "1",
  WRANGLER_SEND_METRICS: "false",
});

function runSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: baseEnv(),
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
}

// Ready means the port accepts a connection (no HTTP request is sent), NOT a web
// request to the worker: the first thing a fresh worker receives here is the
// cron (R-33).
function portOpen() {
  return new Promise((resolvePort) => {
    const socket = net.connect({ host: "127.0.0.1", port: PORT });
    socket.once("connect", () => {
      socket.destroy();
      resolvePort(true);
    });
    socket.once("error", () => resolvePort(false));
  });
}

async function waitReady(child) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`wrangler dev on :${PORT} exited ${child.exitCode}`);
    }
    if (await portOpen()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`wrangler dev on :${PORT} not ready within ${READY_TIMEOUT_MS}ms`);
}

/** The Worker's settings, as the deploy job sets them (here: `.dev.vars`).
 * No `--var` is used anywhere. */
function writeDevVars(settings) {
  writeFileSync(
    devVarsPath,
    Object.entries(settings)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
    "utf8",
  );
}

let currentWorker = null;

async function startWorker(settings) {
  writeDevVars({ NUAVE_SITE_URL: `http://127.0.0.1:${PORT}`, ...settings });
  const child = spawn(
    npxExecutable,
    [
      "wrangler",
      "dev",
      "--ip",
      "127.0.0.1",
      "--port",
      String(PORT),
      "--test-scheduled",
      "--persist-to",
      stateDir,
    ],
    { env: baseEnv(), detached: process.platform !== "win32" },
  );
  activeChildren.add(child);
  let log = "";
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));
  await waitReady(child);
  currentWorker = { log: () => log };
  return {
    child,
    log: () => log,
    stop() {
      terminateProcessTree(child, "SIGTERM");
      activeChildren.delete(child);
    },
  };
}

// One connection per request: workerd closes idle keep-alive sockets, which
// made a reused connection fail with "other side closed" in Node's fetch.
const noKeepAlive = new http.Agent({ keepAlive: false });

function request(path, { method = "GET", body, headers = {} } = {}) {
  const payload = body ? JSON.stringify(body) : undefined;
  return new Promise((resolveRequest, rejectRequest) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: PORT,
        path,
        method,
        agent: noKeepAlive,
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* HTML and empty bodies are not JSON */
          }
          resolveRequest({ status: response.statusCode ?? 0, text, json, headers: response.headers });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`${method} ${path} timed out`)));
    req.on("error", rejectRequest);
    if (payload) req.write(payload);
    req.end();
  });
}

/** One cron tick, the way `wrangler dev --test-scheduled` fires it. */
const cron = () => request("/__scheduled?cron=*+*+*+*+*");

/** A local D1 read through wrangler (the same database the worker uses). */
function d1(sql) {
  const result = spawnSync(
    npxExecutable,
    ["wrangler", "d1", "execute", "SPEND_DB", "--local", "--persist-to", stateDir, "--json", "--command", sql],
    { env: baseEnv(), encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`d1 execute failed: ${result.stderr}`);
  return JSON.parse(result.stdout)[0].results;
}
const doneQuestions = () =>
  Number(d1("SELECT COUNT(*) AS n FROM order_questions WHERE status = 'done'")[0].n);

const settings = {
  // Deliberately NOT in the build environment above: only the Worker's own
  // settings can switch the audit on, for a request or for the cron.
  NUAVE_NEW_AUDIT_ENABLED: "true",
  NUAVE_AUDIT_MODE: "synthetic",
  NUAVE_DAILY_SPEND_LIMIT_USD: "7",
  // Spec 017: an unpaid order may not be approved, and the simulated payment is
  // a later slice, so these orders are founder test passes (24+ characters).
  NUAVE_TEST_PASS_CODE: "workers-check-test-pass-code-0123",
};

async function makeApprovedOrder(email) {
  const created = await request("/api/orders", {
    method: "POST",
    body: {
      email,
      business_name: "Kopi Nuave",
      website: "https://kopinuave.example/",
      test_pass_code: settings.NUAVE_TEST_PASS_CODE,
    },
  });
  const orderId = created.json?.order_id;
  const approved = await request("/api/orders/approve", {
    method: "POST",
    body: {
      order_id: orderId,
      client_contract_version: contractVersion,
      question_method: "direct-ten",
      context,
      prompts,
      originals: prompts.map((prompt) => prompt.question),
    },
  });
  return { created, approved, orderId };
}

let contractVersion = "";

try {
  // ── 1. Build ─────────────────────────────────────────────────────────────
  const payloadsPath = join(workDir, "payloads.mjs");
  runSync(npxExecutable, [
    "esbuild",
    "scripts/test-workers-payloads.ts",
    "--bundle",
    "--platform=node",
    "--format=esm",
    `--outfile=${payloadsPath}`,
  ]);
  const generated = spawnSync(process.execPath, [payloadsPath], {
    encoding: "utf8",
  });
  if (generated.status !== 0) {
    throw new Error(`payload generation failed: ${generated.stderr}`);
  }
  contractVersion = JSON.parse(generated.stdout).clientContractVersion;
  record("client contract version read from the app", Boolean(contractVersion));

  writeFileSync(productionEnvPath, buildOnlyEnv, "utf8");
  runSync(npxExecutable, ["opennextjs-cloudflare", "build"]);
  record("opennextjs-cloudflare build", true);

  // ── 2. Local database ────────────────────────────────────────────────────
  runSync(npxExecutable, [
    "wrangler",
    "d1",
    "migrations",
    "apply",
    "SPEND_DB",
    "--local",
    "--persist-to",
    stateDir,
  ]);
  record("migrations apply to a fresh local D1 database", true);

  // ── 3. Enabled worker: request path and cron path ────────────────────────
  const on = await startWorker(settings);

  // ── 3a. The cron comes first (R-33) ──────────────────────────────────────
  // This worker has received no web request yet. An `open` order whose time has
  // passed is put straight into the local database; the cron must see the
  // Worker's own settings and the same database, and expire it.
  const overdue = "a".repeat(32);
  d1(
    `INSERT INTO orders (id, email, business_name, website, mode, environment, state, created_at, expires_at)
     VALUES ('${overdue}', 'tertunda@example.com', 'Kopi Tertunda', 'https://tertunda.example/', 'synthetic', 'production', 'open', '2026-01-01T00:00:00.000Z', '2026-01-01T02:00:00.000Z')`,
  );
  const firstTick = await cron();
  const overdueRow = d1(`SELECT state FROM orders WHERE id = '${overdue}'`)[0];
  record(
    "the cron is the first thing a fresh worker receives, and it sees the Worker's settings and the local database (an overdue open order expires)",
    firstTick.status === 200 && overdueRow?.state === "expired",
    `cron status ${firstTick.status}, order ${overdueRow?.state}`,
  );

  const page = await request("/audit");
  record(
    "the Worker's own settings enable the audit for a web request",
    page.status === 200 && !page.text.includes("Audit tidak tersedia saat ini."),
    `status ${page.status}`,
  );

  // AC-11: the dev-only trigger does not exist in a production build.
  const devTrigger = await request("/api/dev/run-cron", { method: "POST" });
  record(
    "built worker: the development trigger answers 404",
    devTrigger.status === 404,
    `status ${devTrigger.status}`,
  );
  const internalNoKey = await request("/api/internal/cron", { method: "POST" });
  const internalGuess = await request("/api/internal/cron", {
    method: "POST",
    headers: { "x-nuave-internal": "guess" },
  });
  record(
    "built worker: the internal cron route answers 404 to a web request",
    internalNoKey.status === 404 && internalGuess.status === 404,
    `statuses ${internalNoKey.status}/${internalGuess.status}`,
  );

  // R-04: the browser-driven run and report routes refuse every request.
  for (const path of ["/api/audit/run", "/api/audit/report"]) {
    const res = await request(path, {
      method: "POST",
      body: { question_method: "direct-ten" },
    });
    record(`retired ${path} refuses (410)`, res.status === 410, `status ${res.status}`);
  }

  // R-03: paid routes need an order.
  const noOrderExtract = await request("/api/audit/extract", {
    method: "POST",
    body: { order_id: "f".repeat(32) },
  });
  record(
    "extract with an unknown order is refused (409) before any work",
    noOrderExtract.status === 409,
    `status ${noOrderExtract.status}`,
  );
  const badEmail = await request("/api/orders", {
    method: "POST",
    body: { email: "not-an-email", business_name: "X", website: "https://x.example/" },
  });
  record("a bad email makes no order (400)", badEmail.status === 400, `status ${badEmail.status}`);

  const first = await makeApprovedOrder("pemilik@example.com");
  record(
    "an order is made (synthetic, no list) and its ten questions approved",
    first.created.status === 200 &&
      /^[0-9a-f]{32}$/.test(first.orderId ?? "") &&
      first.approved.status === 200 &&
      first.approved.json?.state === "running",
    `statuses ${first.created.status}/${first.approved.status}`,
  );

  // The cron runs one audit step per order per run: ten questions, then the
  // report and the email. (State is read from the database, so the per-IP
  // status limiter of the real route is not used up.)
  const orderState = (id) =>
    d1(`SELECT state FROM orders WHERE id = '${id}'`)[0]?.state ?? "unknown";
  let ticks = 0;
  for (; ticks < 11; ticks += 1) {
    const tick = await cron();
    if (tick.status !== 200) throw new Error(`__scheduled answered ${tick.status}`);
  }
  while (ticks < 16 && orderState(first.orderId) !== "delivered") {
    await cron();
    ticks += 1;
  }
  const state = orderState(first.orderId);
  const lastStatus = await request("/api/orders/status", {
    method: "POST",
    body: { order_id: first.orderId },
  });
  record(
    "the cron ran the audit on the same settings and local database as a request: delivered",
    state === "delivered" &&
      lastStatus.json?.state === "delivered" &&
      lastStatus.json?.completed === 10,
    `${ticks} cron runs, state ${state}`,
  );
  record(
    "the status answer never carries the email, the report or a link secret",
    lastStatus?.text !== undefined &&
      !lastStatus.text.includes("pemilik@example.com") &&
      !lastStatus.text.includes("/r#") &&
      !/report/i.test(lastStatus.text),
  );
  const emails = d1("SELECT kind, result FROM order_emails");
  record(
    "one ready email was accepted by the fake sender (no network)",
    emails.length === 1 && emails[0].kind === "ready" && emails[0].result === "accepted",
    JSON.stringify(emails),
  );
  const hashRow = d1(
    `SELECT link_hash, report_json FROM orders WHERE id = '${first.orderId}'`,
  )[0];
  record(
    "only a hash of the link secret is stored, and the report is saved",
    /^[0-9a-f]{64}$/.test(hashRow.link_hash ?? "") && Boolean(hashRow.report_json),
  );

  // ── Private report page and data route (spec 016 R-24..R-27, AC-14, AC-15) ──
  const privateHeaders = (res) =>
    // Next adds more directives to a dynamic answer; `no-store` stays in it.
    /\bno-store\b/.test(res.headers["cache-control"] ?? "") &&
    /noindex/.test(res.headers["x-robots-tag"] ?? "") &&
    res.headers["referrer-policy"] === "no-referrer";
  const reportPage = await request("/r");
  record(
    "built worker: /r answers with no-store, noindex and no-referrer, and carries no business data",
    reportPage.status === 200 &&
      privateHeaders(reportPage) &&
      !reportPage.text.includes("Kopi Nuave"),
    `status ${reportPage.status}, cache-control ${reportPage.headers["cache-control"]}`,
  );
  const wrongA = await request("/api/report", { method: "POST", body: { secret: "A".repeat(32) } });
  const wrongB = await request("/api/report", { method: "POST", body: { secret: "b-_9".repeat(8) } });
  const wrongC = await request("/api/report", { method: "POST", body: { secret: "short" } });
  const sameAnswer = (a, b) =>
    a.status === b.status &&
    a.text === b.text &&
    JSON.stringify(a.headers["cache-control"]) === JSON.stringify(b.headers["cache-control"]) &&
    a.headers["x-robots-tag"] === b.headers["x-robots-tag"] &&
    a.headers["referrer-policy"] === b.headers["referrer-policy"] &&
    a.headers["content-type"] === b.headers["content-type"];
  record(
    "built worker: any wrong secret gets one identical private 404 with no business data",
    wrongA.status === 404 &&
      sameAnswer(wrongA, wrongB) &&
      sameAnswer(wrongA, wrongC) &&
      privateHeaders(wrongA) &&
      !wrongA.text.includes("Kopi Nuave"),
    `statuses ${wrongA.status}/${wrongB.status}/${wrongC.status}; cache-control ${wrongA.headers["cache-control"]}; x-robots-tag ${wrongA.headers["x-robots-tag"]}; referrer-policy ${wrongA.headers["referrer-policy"]}`,
  );
  // The link secret itself is only in the email (the fake sender writes no file
  // in a built worker), so store the hash of a known secret and open it.
  const knownSecret = "Zk3-_Qw9".repeat(4);
  const { createHash } = await import("node:crypto");
  const knownHash = createHash("sha256").update(knownSecret).digest("hex");
  d1(`UPDATE orders SET link_hash = '${knownHash}' WHERE id = '${first.orderId}'`);
  const opened = await request("/api/report", { method: "POST", body: { secret: knownSecret } });
  record(
    "built worker: a secret whose hash is stored opens the saved report (ten answers, private headers, no email, no secret)",
    opened.status === 200 &&
      privateHeaders(opened) &&
      opened.json?.observations?.length === 10 &&
      opened.json?.synthetic === true &&
      !opened.text.includes("pemilik@example.com") &&
      !opened.text.includes(knownSecret),
    `status ${opened.status}`,
  );
  d1(`UPDATE orders SET link_off = 1 WHERE id = '${first.orderId}'`);
  const switchedOff = await request("/api/report", { method: "POST", body: { secret: knownSecret } });
  record(
    "built worker: a switched-off link gives the same neutral answer as a wrong one",
    sameAnswer(switchedOff, wrongA),
    `status ${switchedOff.status}`,
  );

  // A second order is approved and left unfinished for the restart checks.
  const second = await makeApprovedOrder("kedua@example.com");
  record("a second order is approved", second.approved.status === 200);
  for (let i = 0; i < 3; i += 1) await cron();
  const progressBeforeRestart = doneQuestions() - 10;
  record(
    "the second order has some saved results before the worker stops",
    progressBeforeRestart >= 1 && progressBeforeRestart < 10,
    `${progressBeforeRestart} of 10`,
  );

  const log = on.log();
  record(
    "no filesystem access attempted in workerd",
    !/ENOENT|EPERM|EACCES|node:fs|writeFileSync|readFileSync/i.test(log),
  );
  on.stop();

  // ── 4. Restarts and "does nothing" cases (AC-10, AC-11) ──────────────────
  for (const [label, override] of [
    ["the audit switch is off", { NUAVE_NEW_AUDIT_ENABLED: "false" }],
    ["the mode is unclear", { NUAVE_AUDIT_MODE: "Live" }],
    ["the mode is missing", { NUAVE_AUDIT_MODE: "" }],
  ]) {
    const before = doneQuestions();
    const quiet = await startWorker({ ...settings, ...override });
    for (let i = 0; i < 3; i += 1) await cron();
    quiet.stop();
    record(
      `cron does nothing when ${label}`,
      doneQuestions() === before,
      `saved results ${before} -> ${doneQuestions()}`,
    );
  }

  const resumed = await startWorker(settings);
  for (let i = 0; i < 16 && orderState(second.orderId) !== "delivered"; i += 1) {
    await cron();
  }
  const resumedState = orderState(second.orderId);
  const calledOnce = d1(
    "SELECT prompt_id, attempts FROM order_questions WHERE order_id = '" +
      second.orderId +
      "' AND attempts != 1",
  );
  record(
    "after a restart the audit completes and no saved question was called again",
    resumedState === "delivered" && calledOnce.length === 0,
    `state ${resumedState}, questions with attempts != 1: ${calledOnce.length}`,
  );
  resumed.stop();

  // ── 6. Bundles and size ──────────────────────────────────────────────────
  for (const [label, extra] of [
    ["production", []],
    ["preview", ["--env", "preview"]],
  ]) {
    const dry = spawnSync(
      npxExecutable,
      ["wrangler", "deploy", "--dry-run", "--outdir", join(workDir, `dry-${label}`), ...extra],
      { env: baseEnv(), encoding: "utf8" },
    );
    const output = `${dry.stdout}\n${dry.stderr}`;
    const gzip = /gzip:\s*([\d.]+)\s*KiB/.exec(output);
    record(
      `wrangler deploy --dry-run bundles the ${label} worker`,
      dry.status === 0 && Boolean(gzip),
      gzip ? `gzip ${gzip[1]} KiB` : output.slice(-300),
    );
    if (gzip) {
      record(
        `${label} worker gzip size is under the Workers Free limit (${FREE_PLAN_GZIP_LIMIT_KIB} KiB, to verify)`,
        Number(gzip[1]) < FREE_PLAN_GZIP_LIMIT_KIB,
        `${gzip[1]} KiB`,
      );
    }
  }

  const failures = results.filter((entry) => !entry.pass);
  console.log(
    failures.length
      ? `\nWorkers runtime check FAILED — ${failures.length} of ${results.length} checks failed.`
      : `\nWorkers runtime check passed — ${results.length} checks green.`,
  );
  process.exitCode = failures.length ? 1 : 0;
} catch (error) {
  process.exitCode = 1;
  console.error("\nWorkers runtime check failed.");
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof Error && error.cause) console.error(error.cause);
  if (currentWorker) console.error(currentWorker.log().split("\n").slice(-40).join("\n"));
} finally {
  cleanup();
  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);
}
