import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const productionEnvPath = resolve(".env.production.local");
const hadProductionEnv = existsSync(productionEnvPath);
const originalProductionEnv = hadProductionEnv
  ? readFileSync(productionEnvPath, "utf8")
  : null;

const buildOnlyEnv = `NUAVE_PROVIDER=opencodego
NUAVE_QUESTION_PROVIDER=opencodego
OPENCODEGO_API_KEY=dummy-build-only-key
OPENAI_API_KEY=dummy-build-only-key
OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
OPENAI_AUDIT_MODEL=gpt-5.6-luna
OPENAI_AUDIT_REASONING_EFFORT=low
`;

const offlineProcessEnv = {
  ...process.env,
  NUAVE_PROVIDER: "opencodego",
  NUAVE_QUESTION_PROVIDER: "opencodego",
  OPENCODEGO_API_KEY: "dummy-build-only-key",
  OPENAI_API_KEY: "dummy-build-only-key",
  OPENAI_BASE_URL: "https://opencode.ai/zen/go/v1",
  OPENAI_AUDIT_MODEL: "gpt-5.6-luna",
  OPENAI_AUDIT_REASONING_EFFORT: "low",
  NUAVE_LIVE_PROVIDER_TESTING: "0",
};

function restoreProductionEnv() {
  if (hadProductionEnv) {
    writeFileSync(productionEnvPath, originalProductionEnv, "utf8");
    return;
  }

  rmSync(productionEnvPath, { force: true });
}

function run(scriptName) {
  console.log(`\n> npm run ${scriptName}`);
  const result = spawnSync("npm", ["run", scriptName], {
    stdio: "inherit",
    env: offlineProcessEnv,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`npm run ${scriptName} failed with exit code ${result.status}`);
  }
}

writeFileSync(productionEnvPath, buildOnlyEnv, "utf8");

try {
  run("check");
  run("test:unit");
  run("build");
  run("build:cf");
  run("test:e2e");
  console.log("\nOffline verification passed.");
} catch (error) {
  console.error("\nOffline verification failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  restoreProductionEnv();
}
