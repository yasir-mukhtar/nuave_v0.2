# Repository hygiene record — 2026-09-12

> Status: factual record of one bounded repository-maintenance task, corrected
> by follow-up review passes the same day.
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

| PR                                                         | Branch                                | Head       | Purpose                                                        | State                                                |
| ---------------------------------------------------------- | ------------------------------------- | ---------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| [#58](https://github.com/yasir-mukhtar/nuave_v0.2/pull/58) | `codex/complete-local-intake`         | `641e312e` | Complete local intake journey (founder-accepted local preview) | Draft; unmerged; verified offline locally            |
| [#59](https://github.com/yasir-mukhtar/nuave_v0.2/pull/59) | `codex/spec008-g1-adapter`            | `04d6a204` | Spec 008 G1 dormant facts/context adapters                     | Draft; unmerged; dormant — no live provider behavior |
| [#60](https://github.com/yasir-mukhtar/nuave_v0.2/pull/60) | `codex/spec-007-approved-s2-repair`   | `62cabb90` | Earlier five-screen S2 intake repair, preserved for review     | Draft; unmerged; preservation candidate              |
| [#52](https://github.com/yasir-mukhtar/nuave_v0.2/pull/52) | `docs/spec-008-live-check-resolved`   | `e0be3110` | Spec 008 live-check documentation                              | Open, non-draft; founder decision                    |
| [#47](https://github.com/yasir-mukhtar/nuave_v0.2/pull/47) | `feat/cheaperinference-glm-5-3-flash` | `2dbd8673` | GLM experiment                                                 | Open draft; parked                                   |

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
  and third passes: `cloudflare/wrangler-action@v4` sets its
  `command-output` and `command-stderr` step outputs only when the wrangler
  command **succeeds** (verified in the action source: `setOutput` runs after
  `exec` returns, and the failure path rethrows before any output is set).
  Parsing a failed delete's output for "not found" wording is therefore
  impossible. Instead:
  - the delete attempt runs visibly (`continue-on-error` keeps the job going
    while its outcome is recorded);
  - when the delete fails, `scripts/pr-preview-probe-worker.mjs` calls the
    exact worker endpoint
    (`GET /accounts/<id>/workers/scripts/<name>`). Absence is claimed only
    on a structured worker-not-found response: HTTP 404 plus the JSON
    envelope `{success:false, errors:[{code:10007}]}` — 10007 is the
    documented "Worker or workers.dev subdomain not found" code for the
    Scripts API. A 200 with a fully read body means the worker exists (the
    body is raw script and never printed); a bare/generic 404, non-JSON
    body, any other status, transport failure before or after headers, or
    missing/malformed configuration all stay `unconfirmed`;
  - classification lives in `scripts/pr-preview-cleanup-state.mjs`, covered
    by `tests/pr-preview-cleanup-state.test.mjs` — mocked-request cases
    through the real probe→classification path, plus spawned-CLI cases
    against a local stub API server (`CLOUDFLARE_API_BASE` override);
  - the PR comment claims removal only for `removed` or `absent`; anything
    else reports the failure truthfully and fails the job;
  - repository policy applied consistently to both jobs:
    Dependabot-authored PRs do not deploy previews and their close events
    run no cleanup — Dependabot-triggered runs receive Dependabot-scoped
    secrets, so this repo's Cloudflare credentials are unavailable to them.
    The condition keys on the PR author (`pull_request.user.login`), so a
    human-triggered event on a bot PR is still skipped. Whether historical
    preview workers were actually deleted is not inferred; that stays
    separately scoped. `scripts/pr-preview-policy.mjs` expresses the policy
    once and `tests/pr-preview-policy.test.mjs` keeps the workflow `if:`
    conditions in sync with it.

## Verification

- `npm run verify` on this branch passed locally before the original push
  (72 unit-test files / 836 tests, Next + OpenNext builds, 79 + 3 + 2
  Playwright tests across all three configs). One earlier run had two
  unrelated browser flakes that passed on isolated rerun and in the recorded
  clean run. Full verify re-ran green after the second pass (73 files /
  846 tests) and after the third pass (74 files / 860 tests — the probe,
  policy, and expanded classifier suites included); see PR #61 checks for
  the published-head CI result.
- Coverage caveat: ordinary PR checks exercise the preview/deploy path but
  never the close-event cleanup path (it only runs when a PR closes). The
  cleanup path is therefore covered locally by the mocked-request and
  stub-API tests in `tests/pr-preview-cleanup-state.test.mjs`, not by any CI
  run on this PR.
- GitHub CI on `fa06fba3`: `validate` passed (run `34693486175`), PR preview
  deployed (run `34693486207`); on `d6e6a827` (second pass): `validate`
  passed (run `34696092679`), preview deployed (run `34696092656`);
  main-only jobs correctly skipped. Third-pass head CI is on the PR checks.
- Draft PR #59's first CI run at `17b5f8d` failed typecheck (`TS18048`,
  `tests/spec008-review-port.test.ts` treated `webServer.env` as optional).
  Fixed at `04d6a204` by guarding on `env` before asserting the dummy
  credentials; `npm run verify` passed locally on the corrected tree (74
  files / 897 tests, all Playwright configs); published-head CI passed —
  `validate` run `34695761407`, preview run `34695761310`.
- Fresh remote-only clone (verified before the follow-up commits): `main`
  `505ccd49`, all retained branches, all 43 tags peel to the reviewed SHAs,
  and the S2 reference commit `955ae90` is retrievable with its recorded
  workbench hash.

## Dependency and security triage (report only — no upgrades made)

26 open Dependabot alerts on the default branch, by manifest:

- **Active application — `package-lock.json` (7):** (alert "scope" labels are
  Dependabot's classification; whether a dependency actually ships in the
  production bundle needs dependency-tree inspection, not the label alone)
  - `next` ×2 **critical** (CVE-2026-75604, GHSA-2xp9-vwfh-vxw4), installed
    `16.2.11`, range `>=16.0.0 <16.3.3`, patched `16.3.3` → bot PR **#57**
    (`next` 16.3.5).
  - `sharp` ×1 **high** (GHSA-rgj7-g3m4-5g8c), `<0.35.4`, patched `0.35.4`.
    Transitive via `next`: hoisted `sharp@0.35.0` is pinned by the root
    manifest's `overrides.next.sharp: "0.35.0"`, and nested
    `miniflare/…/sharp@0.35.2` is also vulnerable. **No open bot PR fixes
    this** — repairing it means inspecting the `next` dependency tree and
    updating the override (plus the miniflare copy) in the lockfile.
  - `postcss` ×1 medium (CVE-2026-69153), `<=8.5.22`, patched `8.5.23`. The
    top-level install is `8.5.26` (not vulnerable); the flagged instance is
    `next`'s nested `postcss`, pinned by `overrides.next.postcss: "8.5.22"`.
    **No open bot PR fixes this** — same Next-dependency-tree repair as
    sharp; note #57 leaves both overrides unchanged, so it does not clear
    these two alerts either.
  - `js-yaml` ×1 **high** (CVE-2026-84375), development, `>=4.0.0 <4.3.2` →
    bot PR **#55**.
  - `vitest` + `@vitest/mocker` ×2 medium (CVE-2026-84373), development,
    `>=2.1.0 <4.1.11` → bot PRs **#54 and #56**, which carry the _same_
    vitest/mocker bump (a grouped "multi" PR plus the single-dependency PR).
    Only one should be merged; the other is redundant and can be closed by
    the founder — closing is not done in this task.
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
test — while all 836 unit tests and the build passed. Branch protection
blocked merge while `validate` was red. All five bot PRs' preview deploys
failed for the expected reason — runs use Dependabot-scoped secrets and
`CLOUDFLARE_API_TOKEN` is absent (log: "Secret source: Dependabot").

**Post-record integration update (2026-09-13):** the #57 failures were
diagnosed and repaired on the same branch — they were deterministic (the
authorized rerun `34691771986` attempt 2 failed identically), caused by React
StrictMode mount-effect replay newly active in dev under 16.3.5's vendored
React (post-facebook/react#35961 build), and fixed by holding the bootstrap
request in a ref so the replay shares the in-flight promise. The repaired PR
also removed the stale `overrides.next` pins and added `overrides.sharp:
0.35.4`, patching every active sharp/postcss copy including miniflare's nested
`0.35.2`. #57 merged as `e8df42818510ef6768e3cfa377ae74536851dcb1`; main CI
run `34725425535` (validate, verify-main-origin, deploy all green) deployed
`nuave-v2` version `5708d948-9b8f-40e5-90a1-8bf924c2270c`. Full diagnosis and
verification: `docs/reviews/implementation/active-dependency-repair-2026-09-12.md`.

**Correction to the preview claim above:** a preview worker did exist for #57.
The repair push was made by a human actor, so the `pull_request` run received
repository secrets and deployed `nuave-pr-57` (run `34702110811`). Its
close-event cleanup then ran the pre-correction workflow: the
`wrangler delete` step failed with Cloudflare authentication error 10000 on a
KV-namespace pre-check, yet the job still commented "has been removed" — the
misreporting this branch's corrected cleanup is designed to prevent. The
workers.dev URL now returns error 1042 (no worker serves the route), but
script-level deletion is unverified; `nuave-pr-57` needs a founder dashboard
check or a credential-scoped deletion as a separately authorized action.

Prioritized recommendation, updated: (1) ~~Next-dependency-tree repair~~ —
**done** (merged via #57 as `e8df428`, see post-record update above); (2) #55
(`js-yaml`, dev high); (3) one of #54/#56 (`vitest` dev medium — they
duplicate each other); (4) #53 (archived prototype) last. Alerts on archived/staged manifests can be resolved by
deleting those lockfiles if the founder decides the code is dead — that
deletion is not authorized here.

## Remaining actions (founder)

1. Decide on PR #52 and on this maintenance PR. **Merging either deploys
   production** — the deploy job runs on every `main` push. Both diffs
   contain no intended application-code change (docs, tests, CI workflow,
   and config only), but the deployment still runs.
2. Review the intake candidates (#58, #60) and the dormant G1 adapter (#59)
   separately; none of them is bundled into any merge request here. G1 still
   needs its own R5 acceptance review.
3. Review Dependabot PRs #53–#57 per the triage above.
4. Delete the unused `NUAVE_ACCESS_CODE` secret when ready (founder action).
5. Cloudflare follow-ups: `nuave-pr-57`'s close-event deletion failed under
   the pre-correction workflow (auth error 10000 on a KV pre-check) while the
   job misreported success; its workers.dev route now returns 1042, but
   script-level removal is unverified — check the Cloudflare dashboard or run
   a credential-scoped deletion under separate authorization. Other stale
   `nuave-pr-<N>` workers likewise need separate authorization.
6. PR #52 consistency note (report only; #52 is not modified by this task):
   the adoption-record row opens with evidence **at baseline** — where "PR
   #46 `feat/airbnb-intake-rebuild` remains OPEN at `afd518dd…`" describes
   the baseline snapshot — and then records subsequent reconciliation that
   correctly says #46 closed unmerged 2026-09-11. The two statements are
   different points in time, not a contradiction; replacing the baseline
   clause with the later closed state would rewrite the snapshot. If a
   clarification is wanted, "was open at this baseline" is the accurate
   wording — optional, not a required repair. Optional consistency note:
   R5's G1 row reads "Not started" while the dormant adapter exists on #59
   — not contradictory (acceptance vs preparation), but a pointer would
   help future readers.

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
- #57's five browser-test failures are resolved (deterministic dev-mode
  StrictMode effect replay; see post-record update). Whether `nuave-pr-57`'s
  script was actually deleted remains unverified — route-level 1042 observed,
  API-level absence not checkable without credentials.
