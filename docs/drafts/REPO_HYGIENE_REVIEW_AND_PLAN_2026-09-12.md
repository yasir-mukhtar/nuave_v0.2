# Repository hygiene: review and cleanup plan

Date: 12 September 2026. Reviewed: local checkout at `/Users/yasir/nuave_v0.2`
(plus four extra worktrees) and `origin` = `github.com/yasir-mukhtar/nuave_v0.2`.
Goal: `origin/main` is the single source of truth; every laptop is a
disposable mirror and sandbox.

Nothing was changed during this review. Every step below is a proposal.

---

## 1. Summary

The remote `main` branch itself is healthy: CI is green on the last eight
pushes, and every push to `main` deploys to Cloudflare. The mess is around
it.

| Area | Finding |
| --- | --- |
| Remote branches | 59 branches. Only 4 have an open PR. 16 are already fully merged into `main`. 10 belong to closed, unmerged PRs. 16 are docs-only review reports that were never merged. The rest are stale code from August with no PR. |
| Open PRs | 4 open. One is a clean 1-file docs PR ready to merge. Three are drafts from late August, one of them conflicting. |
| Unpushed local work | 1 local branch with 2 commits that exist nowhere on GitHub. |
| Uncommitted local work | 4 dirty working trees holding roughly 1,500 changed lines and 14 new files, spread across 3 different branches. |
| Duplicated effort | The Spec 008 G1 adapter was implemented twice on two branches. The intake journey is being worked on in three competing places. |
| Worktrees | 3 of the 5 worktrees live under `/private/tmp`, which macOS clears. Two of them hold uncommitted work. |
| Stash | 1 stash from a branch whose PR merged on 1 September. |
| GitHub settings | Repo is **public**. No branch protection, no rulesets, no tags, no releases, "delete branch on merge" is off. `AGENTS.md` still claims branch protection is unavailable because the repo is private on the Free plan. |
| Local git config | No `fetch.prune`, no `pull.rebase`. Two local branches have their upstream set to `origin/main` instead of their own remote branch, so `git status` reports the wrong ahead/behind numbers. |

---

## 2. Detailed findings

### 2.1 Remote `main`

- Tip `505ccd4` (merge of PR #51), pushed 12 September 2026.
- CI on `main` runs `validate`, `verify-main-origin`, and `deploy` (Cloudflare
  Workers). All recent runs succeeded.
- Every PR gets an isolated preview worker via `pr-preview.yml`.
- There are no tags and no GitHub releases, so there is no named "known good"
  point other than `main` itself.

### 2.2 Open pull requests

| PR | Branch | State | Assessment |
| --- | --- | --- | --- |
| #52 | `docs/spec-008-live-check-resolved` | clean, +2/-2 | Ready to merge. |
| #47 | `feat/cheaperinference-glm-5-3-flash` (draft) | clean, 22 behind `main`, +714/-79 | Real work (GLM-5.3 Flash question generation). Needs a decision: rebase and finish, or close. Its worktree at `~/nuave-glm-test` is clean. |
| #30 | `feat/progressive-business-facts` (draft) | **conflicting** since 29 August | Two weeks stale, 81 commits behind. Recommend close and tag. |
| #21 | `design/intake-brief-concept` (draft) | clean, 106 behind, +1793/-0 | Design concept from 27 August, superseded by the Spec 007 Airbnb work. Recommend close and tag. |

### 2.3 Remote branches by disposition

Full table in Appendix A. Grouped:

**A. Fully merged into `main` (16 branches). Safe to delete now, nothing lost.**
`design/hero-background-handoff-2026-09-05`, `docs/spec-008-g0-baseline-reconcile`,
`fix/bundled-beach-artwork`, `fix/exact-beach-artwork`,
`fix/landing-hero-mobile-spacing`, `fix/opencodego-session-header`,
`fix/staged-responsive-hero`, `fix/wave1-identity-pack-2026-08-23`,
`fix/wave2-intake-facts-2026-08-23`, `fix/wave2-public-truth-a11y-2026-08-23`,
`fix/wave2-report-error-ui-2026-08-23`, `fix/wave2-test-ci-isolation-2026-08-23`,
`noop-check`, `scratch/pr20-prettier-certification`,
`style/audit-heading-gelasio-metrics`, `ui/audit-url-intake-refresh`.

**B. Closed PR, never merged (10 branches). Safe to delete; GitHub keeps the
PR and its commits under the closed PR forever.**
`feat/airbnb-intake-rebuild` (#46), `docs/spec-007-orchestrator-handover` (#34),
`refactor/typography-system` (#29, replaced by merged #31),
`style/refero-apple-foundations` (#26, marked abandoned),
`fix/audit-budget-handoff-flash` (#16), `docs/ai-handoff-20260822` (#12),
`fix/localize-hero-sky` (#11), `agent-c-restore-question-provider-tests` (#4),
`spec-003-finish-live-quality-gate` (#3), `fix/spec-003-live-audit-reliability` (#5).

Caution on `feat/airbnb-intake-rebuild`: commit `955ae90` on it is the only
place in git history holding the approved 5 September experience handoff and
workbench HTML. The S2 repair plan cites that commit by hash. Before deleting
the branch, land those two files on `main` (they are already in
`codex/complete-local-intake`) or tag the commit. See Phase 2.

**C. Docs-only review reports, no PR (16 branches).** Each adds one to three
markdown files and nothing else: `review/overnight-*` (6),
`review/pilot-*` (2), `review/wave3-*` (4),
`claude/adversarial-plan-review-nsz2td`, `claude/nuave-design-review-i7r5sz`,
`claude/nuave-intake-recovery-plan-tlv905`,
`docs/airbnb-intake-clean-rebuild-plan`. These are historical evidence, not
active docs. Recommend: tag each tip as `archive/<branch>` and delete the
branch. Do not merge them into the active docs surface.

**D. Stale August code branches, no PR (12 branches).** Superseded by
merged PRs #6, #14, #17, #18: `agent-b-spec003-method-integrity`,
`agent-d-spec003-retire-sozo-live-tools`, `archive/pr9-pre-cleanup-20260822`,
`archive/pr10-pre-pr9-sync-20260822`, `fix/beach-hero-cta-background`,
`fix/source-hero-prettier`, `fix/wave1-protected-attempt-2026-08-23`,
`fix/wave1-workflow-lifecycle-2026-08-23`, `style/source-hero-white-focus-logo`,
`design/airbnb-intake-prototype`, `claude/screen-design-critique-6e0zxl`.
Recommend: tag and delete.

**E. Active, unmerged (3 branches, all from 12 September).**
`codex/complete-local-intake` (2 commits, 47 files, no PR),
`codex/spec008-g1-adapter` (1 commit, 8 files, no PR),
`docs/spec-008-live-check-resolved` (PR #52). See 2.5.

### 2.4 Local checkout state

**Worktrees**

| Path | Branch | Dirty state |
| --- | --- | --- |
| `~/nuave_v0.2` | `codex/spec-007-approved-s2-repair` | 19 modified + 9 untracked files: the S2 intake screen repair. Not committed anywhere. |
| `/private/tmp/nuave-intake-complete` | `codex/complete-local-intake` | 3 modified docs + new `G1_INTAKE_BOUNDARY_REVIEW.md`. |
| `/private/tmp/nuave-spec008-g1` | `codex/spec008-g1-adapter` | +571/-60 lines of code and tests on the G1 adapter, uncommitted. |
| `/private/tmp/nuave-spec008-g1-review` | detached at `8ef15a4` | Throwaway `.review/` dir and two review test files. |
| `~/nuave-glm-test` | `feat/cheaperinference-glm-5-3-flash` | clean |

`/private/tmp` is wiped by macOS on reboot and by periodic cleanup. Two of
those worktrees hold unsaved work.

**Local branches**

- `feat/spec-008-g1-facts-context`: 2 commits ahead of `origin/main`, never
  pushed. Contains a second G1 adapter (`questions-id-v3-context.ts`) plus an
  unrelated intake-preview commit stacked on top.
- `main`: 4 commits behind `origin/main`.
- `docs/spec-008-g0-baseline-reconcile`, `fix/opencodego-session-header`:
  merged, can be deleted locally.
- `docs/spec-007-orchestrator-handover`: PR closed, can be deleted locally.
- `codex/spec-007-approved-s2-repair` and `feat/spec-008-g1-facts-context`
  have upstream = `origin/main`. That makes `git status` lie about
  ahead/behind and makes `git push` ambiguous.

**Stash**

`stash@{0}` "pre-sync local audit work" on `feat/spec-007-d1-safe-source-handling`.
Touches six files under `src/lib/audit/` (+466/-229). PR #35 from that
branch merged on 1 September. Almost certainly superseded; needs a 5-minute
look before dropping.

**Git config**

`fetch.prune`, `pull.rebase`, and `push.default` are all unset.

### 2.5 Duplicated and competing work

This is the most important finding, because deleting branches is easy and
choosing the wrong intake line is not.

**Spec 008 G1 adapter, implemented twice on the same day**

| Branch | Files | Pushed | Extra uncommitted |
| --- | --- | --- | --- |
| `codex/spec008-g1-adapter` | `question-facts-v3.ts`, `question-context-v3.ts`, tests | yes | +571 lines in its worktree, including 234 more test lines |
| `feat/spec-008-g1-facts-context` (local only) | `questions-id-v3-context.ts`, tests | **no** | none |

Recommendation: keep `codex/spec008-g1-adapter` (further along, pushed,
worktree has the newer tests). Cherry-pick anything unique from the local
branch, then delete it.

**Intake journey, three competing lines**

1. `origin/feat/airbnb-intake-rebuild` (PR #46 closed). The original Airbnb
   Gate 1 work, and the home of the approved 5 September handoff.
2. `origin/codex/complete-local-intake` (pushed, no PR). New `src/lib/intake/`
   journey and `/audit/new-intake` route. `docs/NOW.md` on that branch says
   "prepare this branch's PR for review".
3. Uncommitted S2 repair in `~/nuave_v0.2`. Repairs the existing
   `src/app/audit/intake` screens and adds a `?demo=1` gallery. The
   `CLI_HANDOFF_INTAKE_END_TO_END.md` draft records that the founder
   challenged this result ("five isolated screens instead of the flow")
   and wants the complete journey.

Recommendation: line 2 is the canonical intake going forward. Line 3 is
preserved on its own branch (commit + push), not merged, until the founder
decides whether any of its screen-level fixes should port over. Line 1 is
closed once its two approved documents are on `main`.

### 2.6 GitHub repository settings

- Visibility is **public**. Branch protection and rulesets are free on
  public repos. `AGENTS.md` rule 8 is out of date.
- No branch protection on `main`: force pushes and direct pushes are
  possible. Only the CI `verify-main-origin` gate stops a direct push from
  deploying; it does not stop it from landing.
- `deleteBranchOnMerge` is off, which is why 16 merged branches still exist.
- No tags or releases.
- Note for the founder: the memory note "work directly on main; commit small
  work to main" contradicts `AGENTS.md` rules 1 and 8. One of them has to
  win. This plan assumes `AGENTS.md` wins (all changes via PR), because
  pushing `main` deploys production.

---

## 3. Plan

Ordered so that nothing can be lost before anything is deleted. Phases 1
and 2 need founder decisions. Phases 3 to 5 are mechanical.

### Phase 0: safety net (10 minutes, no decisions)

1. Push a backup tag for every remote branch tip that is about to be
   deleted and has no PR: `archive/<branch-name>` at the current commit.
   Tags are invisible in the branch list but keep the commits reachable
   forever.
2. Create a local bundle as a belt-and-braces copy:
   `git bundle create ~/nuave-backup-2026-09-12.bundle --all`.

### Phase 1: rescue every piece of uncommitted and unpushed work (today)

The rule: nothing valuable may exist only on one laptop's disk.

1. `~/nuave_v0.2` (S2 repair): commit all 28 files to
   `codex/spec-007-approved-s2-repair` as one commit, fix its upstream to
   `origin/codex/spec-007-approved-s2-repair`, push. Open a **draft** PR
   titled "S2 intake screen repair (preserved, pending founder decision)".
2. `/private/tmp/nuave-spec008-g1`: commit the +571 lines to
   `codex/spec008-g1-adapter`, push.
3. `/private/tmp/nuave-intake-complete`: commit the docs and the new boundary
   review to `codex/complete-local-intake`, push.
4. `feat/spec-008-g1-facts-context`: push as-is so it exists on GitHub, then
   handle in Phase 2.
5. `/private/tmp/nuave-spec008-g1-review`: confirm the two test files are
   throwaway, then `git worktree remove`.
6. Stash: `git stash show -p stash@{0}` against current `main`. If nothing
   is unique, `git stash drop`. If something is, commit it to a branch and push.
7. Move the two surviving `/private/tmp` worktrees to `~/nuave-worktrees/`
   (`git worktree move`), or remove them now that the work is pushed and
   re-create when needed.

After Phase 1 every worktree is clean and every branch has a remote copy.

### Phase 2: founder decisions on competing work (needs you)

| Decision | Recommended default |
| --- | --- |
| Canonical intake line | `codex/complete-local-intake`. Open its PR. |
| S2 repair branch | Keep as draft PR for reference. Close after porting any wanted fixes. |
| `feat/airbnb-intake-rebuild` | Close-and-delete once the handoff and workbench files are on `main` via the intake PR. Tag `955ae90` as `archive/intake-handoff-2026-09-05` regardless. |
| G1 adapter | Keep `codex/spec008-g1-adapter`. Cherry-pick unique parts of `feat/spec-008-g1-facts-context`, then delete it. Split its intake-preview commit into the intake PR or drop it. |
| PR #47 GLM Flash | Rebase onto `main` and finish, or close and tag. Founder call on whether cheaper inference is still wanted now. |
| PR #30 progressive facts | Close and tag. Conflicting for two weeks and superseded by the intake rebuild. |
| PR #21 design concept | Close and tag. Superseded by Spec 007. |
| Branching rule | `AGENTS.md` wins: everything through a PR. Delete the "work directly on main" memory note. |

### Phase 3: merge or close the open PRs (30 minutes)

1. Merge #52.
2. Apply the Phase 2 decisions to #47, #30, #21.
3. Open PRs for `codex/complete-local-intake` and `codex/spec008-g1-adapter`
   so all live work is visible on the PR list, even as drafts.

### Phase 4: delete stale remote branches (30 minutes, scripted)

Order of operations, each a separate batch so it can be reviewed:

1. Group A (16 merged): delete outright.
2. Group B (10 closed-PR): delete outright. The PR keeps the history.
3. Group C (16 docs-only reviews): tag `archive/<name>`, then delete.
4. Group D (12 stale code): tag `archive/<name>`, then delete.
5. Run the same for local branches: delete the merged and closed ones,
   `git fetch --prune`.

Target end state on `origin`: `main` plus at most 5 active branches, every
one of them with an open PR.

### Phase 5: make the remote the source of truth by configuration (20 minutes)

1. Add a ruleset on `main`: require a pull request, require the `validate`
   status check, block force pushes, block deletion. Allow the founder to
   bypass in emergencies.
2. Turn on "Automatically delete head branches" in repository settings.
3. Tag the current `main` as `v0.2.0-baseline` (or the naming you prefer)
   so there is a named recovery point. Tag future deploy milestones.
4. Update `AGENTS.md` rule 8: the repo is public, branch protection is on,
   and `verify-main-origin` is a second line of defence, not the only one.
5. Optional: enable GitHub Issues if you want a place for founder decisions
   that is not a branch.

### Phase 6: per-laptop routine (once per machine, then habit)

Set on every laptop:

```bash
git config --global fetch.prune true
git config --global pull.rebase true
git config --global push.default current
git config --global push.autoSetupRemote true
```

Habits that keep the mirror model honest:

- Start of a session: `git fetch --prune` and `git switch main && git pull`.
  Branch from `origin/main` only.
- End of a session, every time: commit (WIP commits are fine), push, and open
  a draft PR if none exists. Never leave a laptop with unpushed commits.
- Worktrees live under `~/nuave-worktrees/<branch>`, never under `/tmp`.
  Remove a worktree the moment its branch is pushed and idle.
- One branch per deliverable, named `type/short-name`. Tool prefixes such as
  `codex/` and `claude/` say who typed it, not what it is; prefer
  `feat/`, `fix/`, `docs/`, `spec/`.
- Never `git stash` across days. Commit to the branch instead.
- Monthly: `gh pr list`, `git branch -r`, and delete anything without an
  open PR.

---

## 4. What success looks like

- `origin/main` is protected, tagged at a known-good point, and the only
  thing that deploys.
- The branch list on GitHub fits on one screen and every branch has a PR.
- Every worktree on every laptop is clean at the end of a session.
- `docs/NOW.md` on `main` names the single active intake branch and the
  single active Spec 008 branch, and nothing else claims to be current.

---

## Appendix A: remote branch disposition table

| Branch | PR | Merged into main | Group | Action |
| --- | --- | --- | --- | --- |
| agent-b-spec003-method-integrity | none | no | D | tag + delete |
| agent-c-restore-question-provider-tests | #4 closed | no | B | delete |
| agent-d-spec003-retire-sozo-live-tools | none | no | D | tag + delete |
| archive/pr10-pre-pr9-sync-20260822 | none | no | D | tag + delete |
| archive/pr9-pre-cleanup-20260822 | none | no | D | tag + delete |
| claude/adversarial-plan-review-nsz2td | none | no | C | tag + delete |
| claude/nuave-design-review-i7r5sz | none | no | C | tag + delete |
| claude/nuave-intake-recovery-plan-tlv905 | none | no | C | tag + delete |
| claude/screen-design-critique-6e0zxl | none | no | D | tag + delete |
| codex/complete-local-intake | none | no | E | open PR (canonical intake) |
| codex/spec008-g1-adapter | none | no | E | open PR (canonical G1) |
| design/airbnb-intake-prototype | none | no | D | tag + delete |
| design/hero-background-handoff-2026-09-05 | none | yes | A | delete |
| design/intake-brief-concept | #21 open draft | no | decision | close + tag |
| docs/ai-handoff-20260822 | #12 closed | no | B | delete |
| docs/airbnb-intake-clean-rebuild-plan | none | no | C | tag + delete |
| docs/spec-007-orchestrator-handover | #34 closed | no | B | delete |
| docs/spec-008-g0-baseline-reconcile | #50 merged | yes | A | delete |
| docs/spec-008-live-check-resolved | #52 open | no | E | merge, then delete |
| feat/airbnb-intake-rebuild | #46 closed | no | B | tag 955ae90, then delete |
| feat/cheaperinference-glm-5-3-flash | #47 open draft | no | decision | rebase or close + tag |
| feat/progressive-business-facts | #30 open draft, conflicting | no | decision | close + tag |
| fix/audit-budget-handoff-flash | #16 closed | no | B | delete |
| fix/beach-hero-cta-background | none | no | D | tag + delete |
| fix/bundled-beach-artwork | none | yes | A | delete |
| fix/exact-beach-artwork | none | yes | A | delete |
| fix/landing-hero-mobile-spacing | none | yes | A | delete |
| fix/localize-hero-sky | #11 closed | no | B | delete |
| fix/opencodego-session-header | #51 merged | yes | A | delete |
| fix/source-hero-prettier | none | no | D | tag + delete |
| fix/spec-003-live-audit-reliability | #5 closed | no | B | delete |
| fix/staged-responsive-hero | none | yes | A | delete |
| fix/wave1-identity-pack-2026-08-23 | none | yes | A | delete |
| fix/wave1-protected-attempt-2026-08-23 | none | no | D | tag + delete |
| fix/wave1-workflow-lifecycle-2026-08-23 | none | no | D | tag + delete |
| fix/wave2-intake-facts-2026-08-23 | none | yes | A | delete |
| fix/wave2-public-truth-a11y-2026-08-23 | none | yes | A | delete |
| fix/wave2-report-error-ui-2026-08-23 | none | yes | A | delete |
| fix/wave2-test-ci-isolation-2026-08-23 | none | yes | A | delete |
| main | | | | keep, protect |
| noop-check | none | yes | A | delete |
| refactor/typography-system | #29 closed | no | B | delete |
| review/overnight-a-audit-input | none | no | C | tag + delete |
| review/overnight-b-audit-core | none | no | C | tag + delete |
| review/overnight-c-product-ui | none | no | C | tag + delete |
| review/overnight-d-infra-tests | none | no | C | tag + delete |
| review/overnight-final-synthesis | none | no | C | tag + delete |
| review/overnight-repo-2026-08-22 | none | no | C | tag + delete |
| review/pilot-audit-run-parallel | none | no | C | tag + delete |
| review/pilot-report-variance-parallel | none | no | C | tag + delete |
| review/wave3-browser-release-validator-2026-08-25 | none | no | C | tag + delete |
| review/wave3-contract-validator-2026-08-25 | none | no | C | tag + delete |
| review/wave3-final-verdict-2026-08-25 | none | no | C | tag + delete |
| review/wave3-targeted-rereview-2026-08-25 | none | no | C | tag + delete |
| scratch/pr20-prettier-certification | none | yes | A | delete |
| spec-003-finish-live-quality-gate | #3 closed | no | B | delete |
| style/audit-heading-gelasio-metrics | none | yes | A | delete |
| style/refero-apple-foundations | #26 closed | no | B | delete |
| style/source-hero-white-focus-logo | none | no | D | tag + delete |
| ui/audit-url-intake-refresh | none | yes | A | delete |

## Appendix B: local branch disposition

| Local branch | Action |
| --- | --- |
| main | `git pull` to catch up 4 commits |
| codex/spec-007-approved-s2-repair | commit dirty tree, set upstream to its own remote branch, push, draft PR |
| feat/spec-008-g1-facts-context | push, then fold into `codex/spec008-g1-adapter` and delete |
| codex/complete-local-intake | commit worktree changes, push |
| codex/spec008-g1-adapter | commit worktree changes, push |
| feat/cheaperinference-glm-5-3-flash | follow PR #47 decision |
| docs/spec-008-live-check-resolved | delete after PR #52 merges |
| docs/spec-008-g0-baseline-reconcile | delete (merged) |
| fix/opencodego-session-header | delete (merged) |
| docs/spec-007-orchestrator-handover | delete (PR closed) |
