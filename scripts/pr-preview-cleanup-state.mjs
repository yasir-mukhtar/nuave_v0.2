#!/usr/bin/env node
// Classify the PR-preview cleanup outcome for .github/workflows/pr-preview.yml.
//
// Inputs arrive via environment from earlier steps:
//   REMOVE_OUTCOME   the wrangler delete step's outcome (success/failure/…)
//   PROBE_EVIDENCE   the worker-existence probe's evidence:
//                    exists | absent | unconfirmed (empty when the probe did
//                    not run)
//
// Only a successful delete or a probe-confirmed worker-not-found may report
// the preview as removed. Any other combination — delete failure, a live
// worker, an unconfirmed probe, or missing/crashed output — is "failed" so
// the job turns red instead of claiming a removal that did not happen.
export function classifyPreviewCleanup(removeOutcome, probeEvidence) {
  if (removeOutcome === "success") return "removed";
  if (probeEvidence === "absent") return "absent";
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
    process.env.PROBE_EVIDENCE ?? "",
  );
  const line = `result=${result}\n`;
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_OUTPUT, line);
  } else {
    process.stdout.write(line);
  }
}
