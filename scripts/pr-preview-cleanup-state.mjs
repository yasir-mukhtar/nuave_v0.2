#!/usr/bin/env node
// Classify the PR-preview cleanup outcome for .github/workflows/pr-preview.yml.
//
// Inputs arrive via environment from earlier steps:
//   REMOVE_OUTCOME    the wrangler delete step's outcome (success/failure/…)
//   PROBE_HTTP_CODE   HTTP status of the worker-existence probe
//                     (GET workers/scripts/<name>); empty when the probe did
//                     not run.
//
// Only a successful delete or a worker-specific 404 may report the preview as
// removed. Any other combination — delete failure, probe 200, auth or network
// failure, missing/crashed output — is "failed" so the job turns red instead
// of claiming a removal that did not happen.
export function classifyPreviewCleanup(removeOutcome, probeHttpCode) {
  if (removeOutcome === "success") return "removed";
  if (probeHttpCode === "404") return "absent";
  return "failed";
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url ===
    (await import("node:url")).pathToFileURL(
      (await import("node:path")).resolve(process.argv[1]),
    ).href;

if (invokedDirectly) {
  const result = classifyPreviewCleanup(
    process.env.REMOVE_OUTCOME ?? "",
    process.env.PROBE_HTTP_CODE ?? "",
  );
  const line = `result=${result}\n`;
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_OUTPUT, line);
  } else {
    process.stdout.write(line);
  }
}
