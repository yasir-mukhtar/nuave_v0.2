# Resume the September 19 development checkpoint

This is the portable pause checkpoint for Spec 009. Its branch is
`codex/pause-checkpoint-2026-09-19` in
`https://github.com/yasir-mukhtar/nuave_v0.2`.
It combines the reviewed implementation with the latest canonical instructions.
It is a development backup, not a merge, deployment or customer-ready release.

**Publication status, September 19:** the combined checkpoint passed
`npm run verify` independently: 1,241 unit tests in 95 files, 102 browser tests,
both builds and all required static checks (lint has warnings, no errors).
Publication cleanup generalized the real test business's identifying
references (name, URL, private directory and artifact names) in public files
and replaced them with clearly-labeled fictional or withheld placeholders;
recorded evidence hashes were not changed. The branch is published as
`codex/pause-checkpoint-2026-09-19`; confirm the remote tip matches local
`HEAD` before relying on it.

## Start on another laptop

Install Git and Node.js 22 with npm. In Terminal (macOS/Linux, or Windows WSL):

```sh
git clone --branch codex/pause-checkpoint-2026-09-19 https://github.com/yasir-mukhtar/nuave_v0.2.git
cd nuave_v0.2
npm ci
npx playwright install chromium
```

Use the checkout you just cloned for both code and project instructions.
Historical `/Users/yasir/...` paths describe the original machine; do not
recreate them or open a stale second checkout. Start with this file, AGENTS.md,
README.md, current docs/NOW.md and the current orchestrator handoff. Read only
the approved Spec 009 context those pages identify. Do not execute old handoffs.

For an offline local preview, without adding provider credentials:

```sh
NUAVE_NEW_INTAKE_PREVIEW_ENABLED=1 NUAVE_GLM_LOCAL_EXPERIMENT=1 NUAVE_AUDIT_LIVE_AUTHORIZED=0 NUAVE_GLM_LIVE_AUTHORIZED=0 NUAVE_LIVE_PROVIDER_TESTING=0 npm run dev -- --port 3031 --hostname 127.0.0.1
```

Open `http://127.0.0.1:3031/audit/new-intake?glm=1`.
This intentionally uses labeled synthetic answers. Missing private evidence
does not prevent a fresh offline intake. Stop the preview with Ctrl+C when done.

Before preparing code changes for handoff, use the normal offline gate:

```sh
npm run verify
```

The first installation may also need the operating-system browser dependencies
specified by Playwright. This checkpoint does not include installed packages,
browser binaries, build caches or a running development server.

## What is complete and what comes next

The direct-ten question approach was accepted. A retained real pack completed
ten grounded answers and a report. The newly connected ordinary intake passed
the offline browser flow, edit/approval, recovery and evidence-download checks;
the founder reports having reviewed its PDF. The report remains an interim
format and Spec 009 is not globally Verified.

The next bounded task is one complete real end-to-end test, including fresh
source preparation and real GLM question generation. First prepare the exact
scope, expected cost and retry/accounting limits for the founder's approval.
All previous paid permissions are consumed. Reading this checkpoint, restoring
files or possessing an API key is not permission to make another paid call.
Do not redesign the report or repeat completed worker rounds before that test.

## Private files are a separate backup

The public Git branch does not include API keys, `.env.local`, `.dev.vars`,
`.secrets/`, `.local-evidence/`, raw provider responses or live report artifacts.
Obtain credentials through the founder's private secret storage only when a
specific real run is authorized; do not restore an old live-enabled environment.

If the founder retained the private evidence backup, extract it into this
checkout according to its included manifest. Evidence belongs under ignored
`.secrets/` and retained-pack files under ignored `.local-evidence/`. Confirm
these remain ignored with `git check-ignore` before any staging. Do not add
private files to Git, even on a private branch of this public repository.

The retained-pack demo (`/audit/local-report`) reads
`.local-evidence/direct-ten-retained/` by default — a generic public name —
or the directory named by `NUAVE_LOCAL_AUDIT_PACK_DIR`. When restoring the
private backup, either rename its `direct-ten-*` directory to
`direct-ten-retained` or set that env var to the restored path. The real
directory name stays only in the private backup.

The private backup preserves captured records and original local notes. Browser
tabs and session storage do not move between laptops. Use the saved evidence
files to review earlier runs rather than paying to recreate them.

## Verification and publication

The combined checkpoint's verification result and remote commit are recorded
in the final pause handoff. A push to this branch alone does not run the
repository's main-branch deployment workflow. Do not merge, deploy or enable
live providers to complete a backup. The original local worktrees were preserved.

The prepared private file is `nuave-private-evidence-2026-09-19.zip` in the
original checkout's ignored `.secrets/backups/` directory. It contains 125
evidence/note files plus a manifest and readme, with every file hash verified.
It contains no API keys or executable helpers and preserves both consumed
authorization markers. It is **not encrypted and has not been uploaded**;
the founder must store it privately before relying on it from another laptop.
