---
name: verify-nuave
description: Drive the Nuave web app's public audit journey (landing → /audit entry → summary → ten questions → synthetic audit → report, PDF and JSON downloads, answers-only recovery) in a real browser, in synthetic mode, and save evidence. Use to prove a Nuave change works on the real user path, to reproduce a Nuave bug report, or to give an independent PASS/FAIL verdict on a Nuave PR.
---

# verify-nuave

A CLI plus a feature map for proving Nuave's audit journey works the way a user
experiences it. Synthetic mode only: no live AI-provider call, no spend.

Read [`features/README.md`](features/README.md) before driving, then the
feature file you need. All commands run from anywhere inside the checkout:

```sh
V=.agents/skills/verify-nuave/bin/verify-nuave   # or .claude/skills/verify-nuave/bin/verify-nuave
$V launch && $V doctor && $V drive all && $V capture; $V cleanup
```

Always run `cleanup`, even after a failure.

## Launch

`$V launch [--port 3100]` (needs `npm ci` done once in this checkout).

- Starts `npm run dev -- --port <p> --hostname 127.0.0.1` from the checkout
  root as its own process group, with the environment from
  `offlineE2EServerEnv({ NUAVE_NEW_AUDIT_ENABLED: "true", NUAVE_AUDIT_MODE: "synthetic" })`
  (`tests/e2e/shared-config.ts`): provider keys blanked, audit on, synthetic.
- Refuses a port that is already in use. Never drive a server this run did not
  start.
- Ready when `http://127.0.0.1:<p>/` answers (about 8 s on a warm machine).
  The first page visit then compiles for several seconds; `doctor` absorbs it.
- Writes `.local-evidence/verify-nuave/<run-id>/state.json` with
  `{runId, pgid, port, root, mode, launchedAt, logFile, status}` and points
  `.local-evidence/verify-nuave/current` at the run. `root` is
  `git rev-parse --show-toplevel`. No SHA is recorded: `next dev` serves the
  working tree as it is at request time, so a launch-time SHA would prove
  nothing. `drive` stamps the SHA instead.
- The server log is `<run-id>/server.log`.
- Shut down with `cleanup`.
- Port 3100 is also the port `npm run test:e2e:disabled` uses. Do not run the
  two at the same time; pass `--port 3200` if you must.

## Doctor

`$V doctor [--allow-dirty] [--run <id>]`: one read-only check. Every line
prints `PASS`, `FAIL` or `SKIP`. The exit code is 1 on any `FAIL`.

| Check | Fails when |
|---|---|
| `state-root-is-this-checkout` | the state file was written by another checkout |
| `process-group-alive` | the recorded process group is gone |
| `port-owned-by-this-run` | nothing listens on the port, or the listener is in another process group |
| `server-started-from-state-root` | the listening process was started from a different folder (another checkout or worktree). Prints `ROOT MISMATCH` |
| `port-answers` | `http://127.0.0.1:<port>/` does not answer |
| `state-mode-synthetic` | the state does not record `synthetic` |
| `audit-entry-renders` | `/audit` does not show `[data-intake-screen="entry"]` (the entry screen `audit-entry.spec.ts` asserts) |
| `served-mode-synthetic` | `/audit` does not show "Mode uji lokal menggunakan pengganti sintetis berlabel." (it shows only when the server is not live) |
| `doctor-made-no-api-call` | loading `/audit` made an `/api/*` request |
| `working-tree-clean` | `git status --porcelain` is not empty, unless `--allow-dirty` |

**How doctor finds the folder a server was started from:** it lists the PIDs
listening on the port with `lsof -nP -iTCP:<port> -sTCP:LISTEN -t`. The
listener is `next-server`, a child of `npm`. Doctor reads each PID's working
directory, which `npm run` sets to the package root. On macOS it uses
`lsof -a -p <pid> -d cwd -Fn`. On Linux it uses `readlink /proc/<pid>/cwd`.
Both paths are resolved with `realpath`, so `/tmp` and `/private/tmp` compare
equal. It then compares that directory with the state file's `root`.

- **macOS:** proven (Darwin 25.5, 2026-09-26), including the known-bad case:
  a server started from another `git worktree` fails with `ROOT MISMATCH`.
- **Linux:** the code path exists but has not been run yet; it needs `lsof`
  installed to list listeners.
- **Windows:** not supported.

`$V doctor --pr <n>` checks a PR preview instead of a local server. It reads
the `<!-- nuave-pr-preview -->` comment and requires its
`Updated from commit` SHA to equal `gh pr view <n> --json headRefOid`. It also
requires the preview's `/audit` to show the synthetic label. Previews built
before `pr-preview.yml` published the PR head SHA show the merge commit and
fail this check by design.

## Drive

`$V drive <feature> [--run <id>]`, `$V drive report-and-recovery --inject usefulness-failure`,
or `$V drive all` (five features, then the injected recovery).

- Features: `audit-entry`, `smart-intake-summary`, `question-review`,
  `audit-run`, `report-and-recovery`. The recipes live in the feature files and
  in `src/features.ts`.
- Refuses to drive unless the process checks from doctor pass (right group,
  right folder, owns the port).
- Each drive opens a fresh headless Chromium context (1280×900) at the
  feature's baseline: an empty session on `/` or `/audit`.
- Every journey step comes from the shared driver `tests/e2e/journey.ts`, the
  same module the e2e specs use. Add or fix a selector there, never inline.
- Stamps the evidence with `git rev-parse HEAD`, a dirty flag and the dirty
  file list **at drive time**.
- Records every request with `collectRequests` (`tests/e2e/helpers.ts`). The
  drive fails if `unexpectedExternalRequests` (`tests/e2e/network-guard.ts`)
  is not empty.
- Status is `passed`, `failed`, or, for `--inject usefulness-failure`,
  `fault-injected (not user-reachable in synthetic mode)`. That drive answers
  the first `/api/audit/report` with a fake 422 through
  `injectUsefulnessFailureOnce` (the same stub the e2e spec uses). It is never
  reported as plain `passed`.

## Evidence

Everything lands in `.local-evidence/verify-nuave/<run-id>/`, which is
git-ignored. Never commit it.

```text
<run-id>/
  state.json  server.log  capture.json  cleanup.json
  <feature>[--inject-<name>]/
    NN-<step>.png        full-page screenshot after each user action
    NN-<step>.aria.yml   ARIA snapshot of <body> after each user action
    network.json         collectRequests URLs, method/status detail, /api call counts, unexpected external requests
    result.json          status, error, HEAD/dirty stamp, steps, observed checks, artifacts
    failure.png          only when the drive failed
  report-and-recovery/
    report-a4.headless.pdf   page.pdf() A4 in print media, labelled "headless, not native print"
    download-evidence.json   the JSON the user downloads with "Unduh bukti JSON"
```

- **Capture happens during each drive,** because a browser session cannot
  outlive one CLI call.
- **`$V capture [--run <id>]`** then checks and indexes the run. It confirms
  every step's screenshot and ARIA file, `network.json`, the PDF and the JSON
  exist. It lists features not driven and failed drives. It writes
  `capture.json` with every file's size and sha256. The exit code is 1 on any
  problem.

Proof rules:

- Use the real user path.
- Report a fault-injected drive as fault-injected.
- `Download PDF` is proved by the `window.print()` call it makes. Headless
  Chromium cannot show the print dialog, so the drive counts the call. The PDF
  is `page.pdf()`, not the browser's own print output.

## Cleanup

`$V cleanup [--run <id>]` sends SIGTERM to the whole recorded process group
(`kill -TERM -<pgid>`). It waits up to 15 s, then sends SIGKILL to the group.
It then checks the port.

- It never kills by name or port.
- It refuses a group with no `npm`/`next` member, which would be a stale or
  reused PGID.
- If something outside the group still holds the port, it reports it and
  exits 1 without killing it.
- It writes `cleanup.json` and marks `state.json` `stopped`. Evidence stays.

**Port gotcha (playbook F-9), as observed on macOS, npm 10.9.8, Next 16.3.5,
2026-09-26:** the process group holds `npm run dev`, `next dev`,
`next-server` and one or two Turbopack `pool_entry` workers. The port listener
is `next-server`, not the recorded `npm` PID.

| Stop method | Observed result |
|---|---|
| SIGTERM to the group | the whole group exits after one SIGTERM (no SIGKILL needed); `lsof -i :3100` is empty |
| SIGTERM to the `npm` PID alone | the port was freed too, because npm forwards SIGTERM to its child |
| SIGKILL to the `npm` PID alone | `next dev`, `next-server` and a Turbopack worker stayed alive, and `next-server` kept port 3100 |

So stopping only the recorded PID is unsafe. Cleanup signals the group, which
also frees the port after an `npm` crash. It found the group alive without its
leader and stopped it.

## Helpers

- `bin/verify-nuave`: the CLI. It is a Node script that bundles `src/cli.ts`
  with the repo's own esbuild into `node_modules/.cache/verify-nuave/cli.mjs`
  on each call, then runs it. `$V --help` prints the usage.
- `src/cli.ts`: the commands. `src/features.ts`: the five recipes.
  `src/run-state.ts`: state file, git stamp, process and port lookups.
- `tests/e2e/journey.ts`: the shared journey driver (outside the skill,
  because the specs import it too).
- Typecheck the skill's source with `npx tsc --noEmit -p .agents/skills/verify-nuave`.
  The root `tsconfig.json` does not include dot-directories, so
  `npm run typecheck` skips it. `npm run lint` does cover it.
