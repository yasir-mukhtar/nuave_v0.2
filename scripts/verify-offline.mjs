import { spawn } from "node:child_process";
import { resolve } from "node:path";
import {
  captureFileSnapshot,
  offlineVerifierEnv,
  restoreFileSnapshot,
  terminateProcessTree,
} from "./verify-offline-helpers.mjs";

const productionEnvPath = resolve(".env.production.local");
const productionEnvSnapshot = captureFileSnapshot(productionEnvPath);
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

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const signalExitCode = { SIGINT: 130, SIGTERM: 143 };
let activeChild = null;
let interruptedSignal = null;
let restored = false;

function restoreProductionEnv() {
  if (restored) return;
  restored = true;
  restoreFileSnapshot(productionEnvSnapshot);
}

function handleSignal(signal) {
  if (interruptedSignal) return;
  interruptedSignal = signal;
  process.exitCode = signalExitCode[signal] ?? 1;
  terminateProcessTree(activeChild, "SIGTERM");
  restoreProductionEnv();
}

process.once("SIGINT", handleSignal);
process.once("SIGTERM", handleSignal);

function run(scriptName) {
  if (interruptedSignal) {
    throw new Error(`Offline verification interrupted by ${interruptedSignal}.`);
  }

  console.log(`\n> npm run ${scriptName}`);
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(npmExecutable, ["run", scriptName], {
      stdio: "inherit",
      env: offlineVerifierEnv(),
      detached: process.platform !== "win32",
    });
    activeChild = child;

    child.once("error", (error) => {
      terminateProcessTree(child, "SIGTERM");
      activeChild = null;
      rejectRun(error);
    });

    child.once("close", (code, signal) => {
      activeChild = null;
      if (interruptedSignal) {
        rejectRun(
          new Error(`Offline verification interrupted by ${interruptedSignal}.`),
        );
        return;
      }
      if (signal) {
        terminateProcessTree(child, "SIGTERM");
        rejectRun(new Error(`npm run ${scriptName} ended by ${signal}`));
        return;
      }
      if (code !== 0) {
        terminateProcessTree(child, "SIGTERM");
        rejectRun(
          new Error(`npm run ${scriptName} failed with exit code ${code}`),
        );
        return;
      }
      resolveRun();
    });
  });
}

await import("node:fs").then(({ writeFileSync }) =>
  writeFileSync(productionEnvPath, buildOnlyEnv, "utf8"),
);

try {
  await run("check");
  await run("test:unit");
  await run("build");
  await run("build:cf");
  await run("test:e2e");
  console.log("\nOffline verification passed.");
} catch (error) {
  if (!interruptedSignal) process.exitCode = 1;
  console.error("\nOffline verification failed.");
  console.error(error instanceof Error ? error.message : error);
} finally {
  terminateProcessTree(activeChild, "SIGTERM");
  restoreProductionEnv();
  process.removeListener("SIGINT", handleSignal);
  process.removeListener("SIGTERM", handleSignal);
}
