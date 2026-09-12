# Repository hygiene record — 2026-09-12

> Status: factual record of one bounded repository-maintenance task, corrected
> by a second review pass the same day.
> Authorization: `docs/drafts/REPO_HYGIENE_EXECUTION_HANDOFF_2026-09-12.md`.
> No PR was merged and no production deployment was performed by this task.
> Private recovery evidence stays outside Git; this file records only public,
> non-sensitive state.

## What changed on the remote

- `main` is now protected: pull requests required with the `validate` check on
  an up-to-date branch, resolved conversations required, force pushes and
  branch deletion blocked. The CI `verify-main-origin` deployment gate is
  unchanged and remains a second layer.
- Repository settings enabled: automatic head-branch deletion after merge,
  secret scanning, secret-scanning push protection, Dependabot alerts, and
  Dependabot security updates. Repository visibility is unchanged (public).
- Enabling Dependabot security updates opened PRs #53–#57 (dependency bumps,
  including `next` and `vitest`). They are unmerged and await founder review;
  dependency changes are out of this task's scope.
- **Tags: 43 total** on the remote, in three distinct groups:
  - `baseline/2026-09-12-pre-hygiene` — 1 tag at `main` `505ccd49` (CI run
    `34663621711`, all three jobs green).
  - `archive/2026-09-12/<branch>` — 39 tags, one per retired unmerged
    historical branch tip.
  - Other preservation tags under `archive/2026-09-12/` — 3 tags:
    `intake-handoff-2026-09-05` at `955ae90` (approved intake handoff/workbench
    source), `feat/spec-008-g1-facts-context` at `e9cd00c` (older local-only
    G1 chain), and `stash-pre-sync-audit-work` at `25088c6` (dropped pre-sync
    stash, content superseded by merged A-track work).
- 55 remote branch refs were deleted with expected-SHA leases: 16 verified
  ancestors of `main` and the 39 tagged historical tips. No archive tag was
  moved or overwritten.
- **Remote heads: 60 → 13.** Retained: `main`; work branches
  `codex/complete-local-intake`, `codex/repo-hygiene-2026-09-12` (this PR),
  `codex/spec-007-approved-s2-repair`, `codex/spec008-g1-adapter`,
  `docs/spec-008-live-check-resolved`; parked `feat/cheaperinference-glm-5-3-flash`;
  preserved-without-PR `feat/spec-008-g1-facts-context`; and five
  `dependabot/*` branches for PRs #53–#57.
- Draft PRs #21 and #30 were closed with supersession notes after their tips
  were tagged.

## Continuing work

| PR                                                         | Branch                                | Head         | Purpose                                                        | State                                                |
| ---------------------------------------------------------- | ------------------------------------- | ------------ | -------------------------------------------------------------- | ---------------------------------------------------- |
| [#58](https://github.com/yasir-mukhtar/nuave_v0.2/pull/58) | `codex/complete-local-intake`         | `641e312e`   | Complete local intake journey (founder-accepted local preview) | Draft; unmerged; verified offline locally            |
| [#59](https://github.com/yasir-mukhtar/nuave_v0.2/pull/59) | `codex/spec008-g1-adapter`            | `04d6a204`   | Spec 008 G1 dormant facts/context adapters                     | Draft; unmerged; dormant — no live provider behavior |
| [#60](https://github.com/yasir-mukhtar/nuave_v0.2/pull/60) | `codex/spec-007-approved-s2-repair`   | `62cabb90`   | Earlier five-screen S2 intake repair, preserved for review     | Draft; unmerged; preservation candidate              |
| [#52](https://github.com/yasir-mukhtar/nuave_v0.2/pull/52) | `docs/spec-008-live-check-resolved`   | `e0be3110`   | Spec 008 live-check documentation                              | Open, non-draft; founder decision                    |
| [#47](https://github.com/yasir-mukhtar/nuave_v0.2/pull/47) | `feat/cheaperinference-glm-5-3-flash` | `2dbd8673`   | GLM experiment                                                 | Open draft; parked                                   |

The older local-only G1 chain also exists as remote branch
`feat/spec-008-g1-facts-context` plus its archive tag; it is not equivalent to
the G1 adapter above and needs no PR.

## This maintenance change

- `AGENTS.md`: the stale "private repository / Free plan" note now records that
  the public repository has branch protection; `verify-main-origin` remains.
- `docs/NOW.md`: updated stamp, recorded the merged UI-stack migration (PR
  #22), the real `ci.yml` deploy path, the currently deployed commit
  (`505ccd49`), the ungated live build, merged Spec 007 packages, the unmerged
  intake candidates (draft PRs #58/#60), and Spec 008 G0 completion with the
  dormant G1 adapter (draft PR #59).
- `docs/INDEX.md`, `specs/README.md`,
  `specs/007-intake-airbnb-revamp/EXECUTION_PLAN.md`: status ledgers reconciled
  with merged packages (PRs #35–#40, #42, #43, #49).
- `docs/DECISION_LOG.md`: the 2026-08-19 entry now points at the archived plan
  locations.
- Archive moves (already decided 2026-08-19):
  `Archive Candidates/completed-plans/V2_SUBDOMAIN_LAUNCH_PLAN.md` →
  `archive/completed-plans/V2_SUBDOMAIN_LAUNCH_PLAN.md`, and
  `Archive Candidates/superseded-plans/DOMAIN_TRANSITION_PLAN.md` →
  `archive/superseded-plans/DOMAIN_TRANSITION_PLAN.md`. Their internal links
  and the `Archive Candidates/README.md` table were repaired.
- `vitest.config.mts` was dead configuration (`vitest.config.ts` resolves
  first). Its defensive excludes were folded into `vitest.config.ts`; the
  offline include boundary is unchanged and `vitest.live-provider.config.ts`
  stays separate. All three Playwright configs are untouched.
- `.github/workflows/pr-preview.yml` cleanup job, corrected in the second
  pass: `cloudflare/wrangler-action@v4` sets its `command-output` and
  `command-stderr` step outputs only when the wrangler command **succeeds**
  (verified in the action source: `setOutput` runs after `exec` returns, and
  the failure path rethrows before any output is set). Parsing a failed
  delete's output for "not found" wording is therefore impossible. Instead:
  - the delete attempt runs visibly (`continue-on-error` keeps the job going
    while its outcome is recorded);
  - when the delete fails, a direct Cloudflare API probe of that exact
    worker's script (`GET workers/scripts/<name>`) runs; only HTTP 404
    confirms absence;
  - classification lives in `scripts/pr-preview-cleanup-state.mjs`, covered by
    `tests/pr-preview-cleanup-state.test.mjs` (10 tests: success, 404-absent,
    live-worker, auth/server/network failure, missing/crashed output, skipped
    step, and a regression case showing free-text "not found" output is not
    treated as proof);
  - the PR comment claims removal only for `removed` or `absent`; anything
    else reports the failure truthfully and fails the job;
  - cleanup is skipped for `dependabot[bot]`-authored PRs: those runs receive
    Dependabot-scoped secrets, never see `CLOUDFLARE_API_TOKEN`, and can never
    have deployed a preview — there is nothing to remove.

## Verification

- `npm run verify` on this branch passed locally before the original push
  (72 unit-test files / 836 tests, Next + OpenNext builds, 79 + 3 + 2
  Playwright tests across all three configs). One earlier run had two
  unrelated browser flakes that passed on isolated rerun and in the recorded
  clean run. A second full verify on the corrected tree passed (73 files /
  846 tests — the new cleanup-classifier file included — same builds and
  Playwright totals); see PR #61 checks for the published-head CI result.
- GitHub CI on `fa06fba3`: `validate` passed (run `34693486175`), PR preview
  deployed (run `34693486207`); main-only jobs correctly skipped.
- Draft PR #59's first CI run at `17b5f8d` failed typecheck (`TS18048`,
  `tests/spec008-review-port.test.ts` treated `webServer.env` as optional).
  Fixed at `04d6a204` by guarding on `env` before asserting the dummy
  credentials; `npm run verify` passed locally on the corrected tree (74
  files / 897 tests, all Playwright configs); GitHub CI runs `34695761407`
  (CI) and `34695761310` (preview) were in progress at record time — see PR
  #59 checks for the published-head result.
- Fresh remote-only clone (verified before the follow-up commits): `main`
  `505ccd49`, all retained branches, all 43 tags peel to the reviewed SHAs,
  and the S2 reference commit `955ae90` is retrievable with its recorded
  workbench hash.

## Dependency and security triage (report only — no upgrades made)

26 open Dependabot alerts on the default branch, by manifest:

- **Active application — `package-lock.json` (7):**
  - `next` ×2 **critical** (CVE-2026-75604, GHSA-2xp9-vwfh-vxw4), runtime,
    `>=16.0.0 <16.3.3`, patched `16.3.3` → bot PR **#57** (`next` 16.3.5).
  - `sharp` ×1 **high** (GHSA-rgj7-g3m4-5g8c), runtime, `<0.35.4` → bot PR
    **#54** (multi-package group).
  - `postcss` ×1 medium (CVE-2026-69153), runtime, `<=8.5.22` → also in #54.
  - `js-yaml` ×1 **high** (CVE-2026-84375), development, `>=4.0.0 <4.3.2` →
    bot PR **#55**.
  - `vitest` + `@vitest/mocker` ×2 medium (CVE-2026-84373), development,
    `>=2.1.0 <4.1.11` → bot PR **#56**.
- **`archive/prototypes/report-prototype/package-lock.json` (11):** fast-uri
  ×4 high, hono ×3 medium (bot PR **#53** targets this manifest), qs ×2
  medium, nanoid ×1 high, js-yaml ×1 high. Archived prototype code — not
  deployed; lowest urgency.
- **`Archive Candidates/lp-remote/package-lock.json` (8):** `next` ×2
  critical, postcss ×4, sharp ×2 high. Staged old application — also not
  deployed; no bot PRs opened for this manifest.

Bot-PR check status at record time: `validate` passed on #53–#56 and failed on
**#57** (run `34691771986`): five browser tests failed — all four
`live-audit-variance` orchestration tests plus the C1 payment-boundary bypass
test — while all 836 unit tests and the build passed. The failures are
storage/timing-sensitive browser tests; a rerun is needed to distinguish a
flake from a real `next` 16.3.5 regression. Branch protection already blocks
merge while `validate` is red. All five bot PRs' preview deploys failed for
the expected reason — runs use Dependabot-scoped secrets and
`CLOUDFLARE_API_TOKEN` is absent (log: "Secret source: Dependabot"), so no
preview worker exists for them.

Prioritized recommendation: (1) rerun or repair #57 — the `next` critical pair
is the only runtime critical set in the deployable app; (2) then #54 (sharp,
runtime high) and #55 (js-yaml, dev high); (3) #56 (vitest, dev medium) and
#53 (archived prototype) last. Alerts on archived/staged manifests can be
resolved by deleting those lockfiles if the founder decides the code is dead —
that deletion is not authorized here.

## Remaining actions (founder)

1. Decide on PR #52 and on this maintenance PR. **Merging either deploys
   production** — the deploy job runs on every `main` push.
2. Review the intake candidates (#58, #60) and the dormant G1 adapter (#59)
   separately; none of them is bundled into any merge request here. G1 still
   needs its own R5 acceptance review.
3. Review Dependabot PRs #53–#57 per the triage above.
4. Delete the unused `NUAVE_ACCESS_CODE` secret when ready (founder action).
5. Cloudflare follow-ups: stale fixed-name preview workers (`nuave-pr-<N>`)
   for closed PRs are cleaned by the updated workflow going forward; any older
   leftover workers need separate authorization.
6. PR #52 consistency finding (report only; not modified by this task): the
   adoption-record row it edits still carries the older clause "PR #46
   `feat/airbnb-intake-rebuild` remains OPEN at `afd518dd…`", contradicting
   the post-merge text in the same row that correctly records #46 closed
   unmerged 2026-09-11. Proposed patch: change "remains OPEN at `afd518dd…`
   with question wiring still unowned by intake" to "closed unmerged
   2026-09-11 (tip `afd518dd`); question wiring stayed unowned by intake".
   Optional consistency note: R5's G1 row reads "Not started" while the
   dormant adapter exists on #59 — not contradictory (acceptance vs
   preparation), but a pointer would help future readers.

## Stale workflow registrations

Besides `ci.yml` and `pr-preview.yml`, 27 registered workflows existed only on
deleted branches (one-shot formatters, previews, PR-28/PR-20 helpers,
`agent-j-*`, wave helpers, and similar). Each was verified absent from every
retained branch and disabled — a reversible registration change, not a file
deletion. Dependabot's own `dynamic/dependabot/dependabot-updates` registration
was left active.

## Not verified by this task

- Other laptops' clones and local work were not inventoried.
- `archive/` and `Archive Candidates/` content was not audited beyond the two
  moved files and the Dependabot manifests above.
- The recovery copy under `~/nuave-recovery/2026-09-12/` holds private
  evidence outside Git; its contents are intentionally not listed here.
- Whether #57's five browser-test failures are a flake or a `next` regression
  is unresolved at record time.
