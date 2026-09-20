#!/usr/bin/env node
// Spec 010 R-10a — Workers runtime check for the public direct-ten audit.
//
// The browser e2e harness runs `next dev`, so this script exercises the real
// OpenNext bundle inside workerd via `wrangler dev` (local mode — no network,
// no provider calls, synthetic audit mode):
//
//   1. generate request payloads with the app's own intake helpers
//      (scripts/test-workers-payloads.ts, bundled by esbuild);
//   2. `opennextjs-cloudflare build` (the same artifact deploy produces);
//   3. `wrangler dev` with NUAVE_NEW_AUDIT_ENABLED=true, NUAVE_AUDIT_MODE=
//      synthetic — the rate-limit bindings from wrangler.jsonc are live:
//        a. legacy/omitted methods → 400 before rate limiting;
//        b. two valid GLM generations → 200, the third → 429 (limit 2/60s);
//        c. one synthetic direct-ten run → run_completed with 10 observations;
//        d. one report request → 200 with a report;
//        e. archived legacy routes → 404;
//        f. no filesystem access attempted (no evidence dir is set and the
//           worker log must not show fs errors);
//   4. `wrangler dev` with the switch off → /audit unavailable UI, API 404s.
//
// The script writes a temporary `.env.production.local` with dummy build-time
// provider values — identical to scripts/verify-offline.mjs — and always
// restores the previous file, present or absent. Run: `npm run test:workers`.

import { spawn, spawnSync } from "node:child_process";
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
const ENABLED_PORT = 8_787;
const DISABLED_PORT = 8_788;
const READY_TIMEOUT_MS = 180_000;
const REQUEST_TIMEOUT_MS = 60_000;
const SAFETY_ID = "workers-check-01";

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

const results = [];
const record = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const productionEnvPath = resolve(".env.production.local");
const productionEnvSnapshot = captureFileSnapshot(productionEnvPath);
const workDir = mkdtempSync(join(tmpdir(), "nuave-workers-check-"));
const activeChildren = new Set();
let interrupted = false;

function cleanup() {
  for (const child of activeChildren) terminateProcessTree(child, "SIGTERM");
  restoreFileSnapshot(productionEnvSnapshot);
  rmSync(workDir, { recursive: true, force: true });
}

const onSignal = (signal) => {
  if (interrupted) return;
  interrupted = true;
  console.error(`\nInterrupted by ${signal}; restoring .env.production.local.`);
  cleanup();
  process.exit(signal === "SIGINT" ? 130 : 143);
};
process.once("SIGINT", onSignal);
process.once("SIGTERM", onSignal);

function runSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: offlineVerifierEnv(),
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
}

async function waitReady(port, child) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`wrangler dev on :${port} exited ${child.exitCode}`);
    }
    try {
      await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(5_000),
      });
      return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 1_000));
    }
  }
  throw new Error(`wrangler dev on :${port} not ready within ${READY_TIMEOUT_MS}ms`);
}

function startWrangler(port, vars) {
  const args = ["wrangler", "dev", "--ip", "127.0.0.1", "--port", String(port)];
  for (const [key, value] of Object.entries(vars)) {
    args.push("--var", `${key}:${value}`);
  }
  const child = spawn(npxExecutable, args, {
    env: {
      ...offlineVerifierEnv(),
      CI: "1",
      WRANGLER_SEND_METRICS: "false",
      ...vars,
    },
    detached: process.platform !== "win32",
  });
  activeChildren.add(child);
  let log = "";
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));
  return { child, log: () => log };
}

async function postJson(port, path, body) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ndjson streams and HTML are not JSON */
  }
  return { status: response.status, text, json };
}

try {
  // ── 1. Payloads ──────────────────────────────────────────────────────────
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
  const payloads = JSON.parse(generated.stdout);
  const promptsFor = (questions) =>
    questions.map((question, index) => ({
      prompt_id: payloads.promptIds[index],
      question,
      review_status: "needs_human_review",
    }));
  record("payloads generated from the app intake helpers", true);

  // ── 2. OpenNext build ────────────────────────────────────────────────────
  writeFileSync(productionEnvPath, buildOnlyEnv, "utf8");
  runSync(npxExecutable, ["opennextjs-cloudflare", "build"]);
  record("opennextjs-cloudflare build", true);

  // ── 3a. Switch-off instance ──────────────────────────────────────────────
  const off = startWrangler(DISABLED_PORT, {
    NUAVE_NEW_AUDIT_ENABLED: "false",
    NUAVE_AUDIT_MODE: "synthetic",
  });
  await waitReady(DISABLED_PORT, off.child);

  const offPage = await fetch(`http://127.0.0.1:${DISABLED_PORT}/audit`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const offPageText = await offPage.text();
  record(
    "switch off: /audit shows the unavailable UI",
    offPage.status === 200 && offPageText.includes("tidak tersedia"),
    `status ${offPage.status}`,
  );

  const offApi = await postJson(DISABLED_PORT, "/api/audit/run", {
    question_method: "direct-ten",
  });
  record(
    "switch off: /api/audit/run → 404 before any work",
    offApi.status === 404,
    `status ${offApi.status}`,
  );
  terminateProcessTree(off.child, "SIGTERM");
  activeChildren.delete(off.child);

  // ── 3b. Enabled synthetic instance ───────────────────────────────────────
  const on = startWrangler(ENABLED_PORT, {
    NUAVE_NEW_AUDIT_ENABLED: "true",
    NUAVE_AUDIT_MODE: "synthetic",
  });
  await waitReady(ENABLED_PORT, on.child);

  // Legacy methods rejected before rate limiting (they must not consume the
  // budget): omitted, canonical, glm-slots and unknown values are all 400.
  for (const [label, body] of [
    ["omitted", {}],
    ["canonical", { question_method: "canonical" }],
    ["glm-slots", { question_method: "glm-slots" }],
    ["unknown", { question_method: "whatever" }],
  ]) {
    const res = await postJson(ENABLED_PORT, "/api/audit/run", body);
    record(`legacy method ${label}: /api/audit/run → 400`, res.status === 400, `status ${res.status}`);
  }
  for (const method of ["glm-slots", "canonical"]) {
    const res = await postJson(ENABLED_PORT, "/api/audit/glm-questions", { method });
    record(`legacy method ${method}: /api/audit/glm-questions → 400`, res.status === 400, `status ${res.status}`);
  }
  const reportLegacy = await postJson(ENABLED_PORT, "/api/audit/report", {
    question_method: "canonical",
  });
  record(
    "legacy method canonical: /api/audit/report → 400",
    reportLegacy.status === 400,
    `status ${reportLegacy.status}`,
  );

  // Archived routes are gone entirely.
  for (const path of ["/api/audit/prompts", "/api/audit/variance", "/api/audit/local-audit", "/audit/v2"]) {
    const res = await fetch(`http://127.0.0.1:${ENABLED_PORT}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    await res.text();
    record(`archived route ${path} → 404`, res.status === 404, `status ${res.status}`);
  }

  // GLM generation: two valid calls (limit 2/60s), the third rate-limited.
  const glmBody = { method: "direct-ten", intake: payloads.intake };
  const glmOne = await postJson(ENABLED_PORT, "/api/audit/glm-questions", glmBody);
  const glmTwo = await postJson(ENABLED_PORT, "/api/audit/glm-questions", glmBody);
  const glmThree = await postJson(ENABLED_PORT, "/api/audit/glm-questions", glmBody);
  const questions = glmOne.json?.questions;
  record(
    "glm-questions: two synthetic generations succeed",
    glmOne.status === 200 &&
      glmOne.json?.status === "ok" &&
      glmOne.json?.provenance?.transport === "synthetic-stub" &&
      Array.isArray(questions) &&
      questions.length === 10 &&
      glmTwo.status === 200,
    `statuses ${glmOne.status}/${glmTwo.status}`,
  );
  record(
    "glm-questions: third call inside 60s → 429 (binding active in workerd)",
    glmThree.status === 429,
    `status ${glmThree.status}`,
  );
  if (!Array.isArray(questions) || questions.length !== 10) {
    throw new Error("GLM generation did not return ten questions — cannot continue");
  }

  // Synthetic direct-ten run: ndjson stream must end in run_completed.
  const runBody = {
    client_contract_version: payloads.clientContractVersion,
    question_method: "direct-ten",
    brief: payloads.brief,
    prompts: promptsFor(questions),
    safety_identifier: SAFETY_ID,
    budget: {
      limit_usd: payloads.costLimitUsd,
      carryover_cost_usd: 0,
      calls: [],
    },
  };
  const run = await postJson(ENABLED_PORT, "/api/audit/run", runBody);
  const events = run.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const fatal = events.find((event) => event.type === "fatal_error");
  const completed = events.find((event) => event.type === "run_completed");
  record(
    "synthetic direct-ten run completes with ten observations",
    run.status === 200 &&
      !fatal &&
      Array.isArray(completed?.observations) &&
      completed.observations.length === 10 &&
      completed.observations.every(
        (observation) => observation.run_status === "completed",
      ),
    fatal ? `fatal_error: ${fatal.message}` : `events ${events.length}`,
  );
  if (!completed) {
    throw new Error(`run did not complete — last events: ${run.text.slice(-400)}`);
  }

  // Report over the same-session observations.
  const report = await postJson(ENABLED_PORT, "/api/audit/report", {
    ...runBody,
    observations: completed.observations,
  });
  record(
    "synthetic report request succeeds",
    report.status === 200 && Boolean(report.json?.report),
    `status ${report.status}`,
  );

  // No filesystem work was configured (NUAVE_GLM_EVIDENCE_DIR unset) and the
  // worker log must show no fs failures — workerd also has no writable fs.
  const workerLog = on.log();
  record(
    "no filesystem access attempted in workerd",
    !/ENOENT|EPERM|EACCES|node:fs|writeFileSync|readFileSync/i.test(workerLog),
  );

  terminateProcessTree(on.child, "SIGTERM");
  activeChildren.delete(on.child);

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
} finally {
  cleanup();
  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);
}
