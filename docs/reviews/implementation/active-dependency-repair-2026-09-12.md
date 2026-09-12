# Active dependency repair — Next.js tree (PR #57)

Date: 2026-09-12
Branch: `dependabot/npm_and_yarn/next-16.3.5`
Base at work start: `origin/main` = `505ccd49ce857e8726bf85e796edf10f5738878c`
Pre-repair head: `2d915990d043f1b2e69a0ccfaf812cc195f13914` (Dependabot `next` 16.2.11 → 16.3.5)

## Scope

One bounded security repair of the active root `package-lock.json` dependency
tree: the `next` bump plus the vulnerable `sharp`/`postcss` copies forced by
root overrides and the nested `miniflare → sharp` path. Archived manifests
(`archive/prototypes/report-prototype`, `Archive Candidates/lp-remote`),
development-only alerts (`js-yaml`, `vitest`, `@vitest/mocker`), and unrelated
upgrades are explicitly out of scope.

## Before/after dependency paths

| Path                                          | Before                                      | After                                    | Advisory floor      |
| --------------------------------------------- | ------------------------------------------- | ---------------------------------------- | ------------------- |
| `next`                                        | 16.2.11                                     | 16.3.5                                   | ≥ 16.3.3            |
| `node_modules/sharp` (next optional dep)      | 0.35.0 (forced by `overrides.next.sharp`)   | 0.35.4                                   | ≥ 0.35.4            |
| `node_modules/miniflare/node_modules/sharp`   | 0.35.2 (exact pin, vulnerable)              | removed — deduped to root `sharp@0.35.4` | ≥ 0.35.4            |
| `node_modules/next/node_modules/postcss`      | 8.5.22 (forced by `overrides.next.postcss`) | 8.5.23 (next's own declaration)          | ≥ 8.5.23            |
| other `postcss` copies (tailwind/shadcn/vite) | 8.5.26                                      | 8.5.26                                   | already above floor |
| `@img/sharp-*` platform packages              | 0.35.0 + 0.35.2 (duplicated subtrees)       | 0.35.4 (single set)                      | —                   |

### Manifest change

`package.json` `overrides` was `{ "next": { "postcss": "8.5.22", "sharp":
"0.35.0" } }` and is now `{ "sharp": "0.35.4" }`.

- The `overrides.next` pins originated in `9ce1d01` ("feat: restore previous
  Nuave landing page", 2026-07-23) and were never deliberately maintained.
  `next@16.3.5` declares `optionalDependencies.sharp: ^0.35.4` and
  `dependencies.postcss: 8.5.23`; removing the stale block lets both resolve to
  patched versions without forcing anything.
- The remaining `"sharp": "0.35.4"` override exists solely for
  `miniflare@5.20260811.1-alpha` (dev-only, via `wrangler` →
  `@opennextjs/cloudflare`), which pins `sharp: 0.35.2` exactly and would
  otherwise keep a vulnerable nested copy. For next itself the override is a
  no-op: `^0.35.4` resolves to `0.35.4` anyway.
- Lockfile diff is scoped to `sharp`, `@img/sharp-*`, `semver`, and
  `next/node_modules/postcss` groups only; no unrelated dependency group
  changed. `eslint-config-next` stays at 16.2.11 (dev-only lint config,
  outside the advisory tree).

## Browser-failure diagnosis (the five original failures)

Original `validate` run `34691771986` failed five tests; a rerun (attempt 2)
failed identically — deterministic, not flaky:

- `tests/e2e/landing-audit-handoff.spec.ts:499` (C1 payment boundary)
- `tests/e2e/live-audit-variance.spec.ts:293, :421, :492, :544`

All five assert `expect.poll(budgetCalls).toBe(1)` and received `2`.
`budgetCalls` counts `GET /api/audit/extract` requests stubbed by the test.

### Causal chain (verified locally on the pre-repair tree)

| Environment                                       | `GET /api/audit/extract` count |
| ------------------------------------------------- | ------------------------------ |
| `next dev` @ 16.3.5                               | 2                              |
| `next dev` @ 16.2.11 (repo-hygiene worktree)      | 1                              |
| `next dev` @ 16.3.5 with `reactStrictMode: false` | 1                              |
| `next build && next start` @ 16.3.5               | 1                              |

`src/app/audit/AuditWorkflow.tsx` fetches the budget once per mount in an
empty-dependency `useEffect`. React StrictMode requires mount effects to
double-invoke in development. React 19 had a bug where that double-invocation
did **not** fire during hydration (vercel/next.js issue #66210; fixed by
facebook/react PR #35961). Next.js vendors its own React for the app router:

- `next@16.2.11` vendors `react-dom@19.3.0-canary-3f0b9e61-20260317` (pre-fix)
- `next@16.3.5` vendors `react-dom@19.3.0-canary-cbb046ab-20260731` (post-fix)

So under 16.3.5 `next dev`, the hydration mount now correctly re-invokes the
bootstrap effect and a second identical `GET /api/audit/extract` reaches the
network. This is expected React dev semantics newly taking effect — not a
product regression. Production behavior is identical on both versions (the
double-invoke is dev-only by design).

### Correction applied

`AuditWorkflow.tsx`: the bootstrap request is now held in
`budgetRequest = useRef<Promise<number> | null>(null)` and created with `??=`.
StrictMode's same-fiber effect replay shares the in-flight promise, so exactly
one request is dispatched per mount instance; each replay attaches its own
`then`/`catch` handler, so the existing `cancelled` unmount guard still works.
A real unmount/remount creates a new ref and refetches as before, and a
rejected promise is not re-armed incorrectly — identical semantics to the
previous code. `AbortController` was tried first and abandoned: both requests
are already dispatched before the synchronous cleanup's `abort()` takes
effect, so aborting cannot reduce the observed request count. No test was
changed; all five assertions still verify "exactly one bootstrap GET".

### Post-fix results

- Probe: 1 GET on `/audit` under `next dev` @ 16.3.5 with StrictMode on.
- The five originally-failing specs pass locally (5/5).
- Unrelated intermittent failure observed locally: the transient
  `"Membaca identitas bisnis"` scan frame in
  `e1-postpayment-journey.spec.ts:611` and `e1-runnable-journey.spec.ts:60`
  is occasionally skipped by the visibility poll under this machine's load
  (load average ≈ 15). Verified **version-independent**: both specs failed
  identically on the 16.2.11 baseline worktree and pass in isolation on both
  versions; both also passed in CI on the pre-repair 16.3.5 head. Not caused
  by this change (the failing step precedes `/audit` mounting; the fix only
  touches `AuditWorkflow`).

## Local verification

Tree: this branch head (see commit below). Environment: macOS arm64,
Node v22.23.2, npm 10.9.8.

- `npm ci` clean install: 966 packages, no errors.
- `npm ls`/`npm explain`: all sharp copies resolve to 0.35.4
  (`miniflare → sharp@0.35.4 deduped`); `next/node_modules/postcss` resolves
  to 8.5.23; next 16.3.5.
- `sharp` functional check: module loads; PNG create → resize → JPEG
  transcode succeeds (native binary healthy under the override).
- `next build` (Turbopack) and `opennextjs-cloudflare build`: pass.
- Affected browser specs: 5/5 pass.
- `npm run verify`: every stage passed on this tree — `check` (typecheck,
  lint, format, typography), unit tests, `next build`, `opennextjs-cloudflare
build`, and `test:e2e` (79 + 3 + 2 across all three Playwright configs in
  one complete run). Two subsequent full-suite runs each hit one
  environment-flaky transient-state spec (see above); the same assertions
  pass in isolation and in CI on both Next versions.

(Verification results for the final published head are recorded in the PR
checks; this file is updated if local re-verification was re-run.)

## Remaining alerts by scope

- **Active root tree — now patched**: `next` (2 critical advisories —
  AVIF/libheif image processing via sharp; Windows-hosted server), `sharp`,
  `postcss`. Note on exposure: production deploys to Cloudflare Workers via
  OpenNext (non-Windows, and the Worker does not run the native sharp binary);
  the versions are nonetheless patched as required.
- **Active root tree — remaining, development-only**: `js-yaml` (→ #55),
  `vitest`/`@vitest/mocker` (→ #54 / #56, which duplicate each other).
- **Archived/staged manifests — separate disposition**:
  `archive/prototypes/report-prototype` (11 alerts incl. `hono` → #53) and
  `Archive Candidates/lp-remote` (8 alerts). Not active or deployed.

## Boundaries

- No merge, auto-merge, `main` push, or production deployment under this
  task. Merging this PR would trigger the production deploy workflow;
  production has not yet received the patched tree.
- No live/paid AI-provider calls were made; verification is offline with
  dummy credentials per `scripts/verify-offline.mjs`.
- Dependabot preview jobs are skipped per repository policy (Dependabot runs
  lack the secrets scope for Cloudflare deployment); required `validate` is
  the authoritative check.
