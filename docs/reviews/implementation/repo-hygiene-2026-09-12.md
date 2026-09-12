# Repository hygiene record — 2026-09-12

> Status: factual record of one bounded repository-maintenance task.
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
- Annotated tags created: `baseline/2026-09-12-pre-hygiene` at `main`
  `505ccd49` (CI run `34663621711`, all three jobs green),
  `archive/2026-09-12/intake-handoff-2026-09-05` at `955ae90` (the approved
  intake handoff/workbench source), `archive/2026-09-12/<branch>` for each of
  the 39 retired unmerged historical branches,
  `archive/2026-09-12/feat/spec-008-g1-facts-context` for the older local-only
  G1 chain, and `archive/2026-09-12/stash-pre-sync-audit-work` for the dropped
  pre-sync stash (`25088c6`, content superseded by merged A-track work).
- 55 remote branch refs were deleted with expected-SHA leases: 16 verified
  ancestors of `main` and the 39 tagged historical tips. No archive tag was
  moved or overwritten.
- Draft PRs #21 and #30 were closed with supersession notes after their tips
  were tagged.

## Continuing work

| PR                                                         | Branch                                | Purpose                                                        | State                                                |
| ---------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| [#58](https://github.com/yasir-mukhtar/nuave_v0.2/pull/58) | `codex/complete-local-intake`         | Complete local intake journey (founder-accepted local preview) | Draft; unmerged; verified offline locally            |
| [#59](https://github.com/yasir-mukhtar/nuave_v0.2/pull/59) | `codex/spec008-g1-adapter`            | Spec 008 G1 dormant facts/context adapters                     | Draft; unmerged; dormant — no live provider behavior |
| [#60](https://github.com/yasir-mukhtar/nuave_v0.2/pull/60) | `codex/spec-007-approved-s2-repair`   | Earlier five-screen S2 intake repair, preserved for review     | Draft; unmerged; preservation candidate              |
| [#52](https://github.com/yasir-mukhtar/nuave_v0.2/pull/52) | `docs/spec-008-live-check-resolved`   | Spec 008 live-check documentation                              | Open, non-draft; founder decision                    |
| [#47](https://github.com/yasir-mukhtar/nuave_v0.2/pull/47) | `feat/cheaperinference-glm-5-3-flash` | GLM experiment                                                 | Open draft; parked                                   |

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
- `.github/workflows/pr-preview.yml`: the cleanup job no longer swallows a
  failed worker delete. The PR comment claims removal only after a successful
  delete or a confirmed-absent result; otherwise the comment reports the
  failure and the job fails visibly.

## Verification

- `npm run verify` on this branch: see the PR checks.
- Fresh remote-only clone: continuing branches and all archive tags are
  retrievable; the retired unmerged tips remain reachable through
  `archive/2026-09-12/*` tags.

## Remaining actions (founder)

1. Decide on PR #52 and on this maintenance PR. **Merging either deploys
   production** — the deploy job runs on every `main` push.
2. Review the intake candidates (#58, #60) and the dormant G1 adapter (#59)
   separately; none of them is bundled into any merge request here.
3. Review Dependabot PRs #53–#57 or the underlying alerts (GitHub reported 26
   vulnerabilities on the default branch: 4 critical, 12 high, 10 moderate).
4. Delete the unused `NUAVE_ACCESS_CODE` secret when ready (founder action).
5. Cloudflare follow-ups: stale fixed-name preview workers (`nuave-pr-<N>`) for
   closed PRs are cleaned by the updated workflow going forward; any older
   leftover workers or stale registrations need separate authorization.
