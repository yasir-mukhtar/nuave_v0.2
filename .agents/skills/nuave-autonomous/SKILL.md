---
name: nuave-autonomous
description: Carry an approved Nuave plan slice through implementation, independent review, bounded repairs, verification, and a pull request in Devin Desktop.
argument-hint: "<approved spec path> <bounded slice or acceptance criteria>"
---

# Nuave autonomous implementation

Use this in the parent session. It coordinates work; it is not a background
service or a substitute for tool permissions. Read `docs/AUTONOMOUS_WORK.md`
relative to the repository root for setup and the limits of this local mode.
Do not apply this skill to another repository.

## 1. Establish the job

Read `AGENTS.md`, `README.md`, `docs/NOW.md`, `docs/WORKFLOW.md`, then the
requested approved spec and only its required context. Use the existing
`docs/templates/SPEC.md` and `docs/templates/WORKER_PROMPT.md`; do not create a
second product plan format. An internal engineering task needs a checkable
finish condition instead of a product spec. A spec already Implementing must
have evidence of prior approval; status alone is not approval.

Fetch `origin` and record the full base SHA, current branches/worktrees, open
PRs for the requested slice, and any existing writer. Reconcile stale status
documents with merged PRs and the approved plan before choosing work. Preserve
user edits. Resume an existing approved job only after confirming its current
head and exclusive ownership; never run a second writer for the same task.
Otherwise start a dedicated worktree/feature branch from current `origin/main`.
Never implement on `main` or silently incorporate unrelated uncommitted work.

The parent settles the scope, acceptance criteria, implementation interfaces,
edge cases, exact test commands, allowed files, and non-goals. Decompose the
selected slice into dependency-ordered packages and map every acceptance
criterion to a package and a verification step. Keep coupled changes together.
Do not dispatch an unresolved product decision. State the deliverable and
expected files before editing. Continue all authorized technical work without
asking the founder to approve routine fixes, review rounds, or Git operations.

## 2. Select an available execution path

Invoke `delivery-team` when available. Discover and invoke `dynamic-workflows`
if it is exposed, and follow its runtime instructions. Never invent an
`agent()` API or run a workflow with ordinary Python in place of its runtime.

When that runtime is unavailable, disclose local parent/child execution and
use the available implementation worker (the sidekick or a write-capable
subagent) followed by a separate reviewer subagent. Default to one active
child at a time. Use blocking calls or supported completion notifications;
never use a polling mailbox to wake unrelated Desktop tabs, remove session
locks, or launch replacements for an explicitly assigned existing session.
If a specific session is mandatory and unreachable, report that blocker.

Local children share the machine and filesystem, not an isolated VM. Give the
worker an exclusive worktree and the reviewer a separate detached worktree at
the supplied commit. Separate worktrees are not a security sandbox. Carry
state through the parent and Git commits rather than shared writable status
files. Never overwrite an agent's personal/team record.

Explain that child agents consume usage. Default to at most three
worker/reviewer cycles (six child dispatches) for the entire selected slice,
including fixes, integration, and any later CI/PR-review repairs. Record the
count before each dispatch, including resumed worker/reviewer calls. Do not
reset this budget after a failure or session restart. This is a call-count
limit, not an ACU, currency, or elapsed-time cap. Do not change models, buy
credits, or create Cloud sessions without applicable authorization. If the
slice needs more calls, checkpoint the work and report the remaining scope.

## 3. Implement and review

Use this worker brief, fully filled in by the parent:

> Delivery role: B (worker). Do not appoint agents. Implement this single
> settled package: [objective and exact acceptance criteria]. Repository and
> exclusive worktree: [paths]. Base: [full SHA]. Branch: [feature branch].
> Required context: [ordered files/sections]. Allowed edits: [paths]. Exact
> implementation interfaces and edge cases: [parent-authored code/decisions].
> Non-goals and permissions: [explicit constraints]. Validation: [exact
> commands and expected behavior]. Previous findings: [all, or none]. Runtime
> state: [owned servers/ports, reuse/cleanup instructions]. Reproduce bugs and
> preserve regression coverage when practical. Do not weaken tests or gates.
> Return your complete diff and checks to the parent before committing. After
> parent review, commit and push only this feature branch when directed. Do
> not merge, deploy, force-push, make live provider calls, or edit approvals.

Have the worker return these fields, with real values rather than placeholders:

- `status`: implemented, blocked, or failed
- `branch`, `base_sha`, `head_sha` (null until committed), `pushed`
- `files_changed`, `implementation_summary`
- `acceptance_results`: each criterion, evidence, and pass/fail/not_checked
- `tests_run`: exact command, result, evidence path or accessible artifact
- `known_risks`, `blockers`, `owned_runtime`

The parent reviews the entire diff before commit/push and resolves all findings
in one bounded brief. Before a branch is declared ready, the worker must run
`npm run verify` offline. Use focused tests during repairs; rerun required
gates when changes invalidate their evidence. Never push known-failing code
to use CI as a debugger. Check that the pushed SHA equals the reviewed commit.
Local-only paths cannot serve as a handoff to a Cloud reviewer: use Git and
accessible sanitized evidence, without publishing private raw data.

The parent opens or updates the PR. Use an independent reviewer that did not
write the change; select the available `mia` profile when appropriate. Give it
the original brief and all acceptance criteria, PR, base and full head SHA,
complete changed-file scope, required verification, and previous findings.
Its job is to read the actual entire diff and independently assess evidence:

> Delivery role: C (reviewer). Do not edit the implementation or appoint
> agents. Check the exact supplied commit in your own detached worktree
> against the original approved brief, repository rules, and every acceptance
> criterion. Verify head/base, inspect the complete diff, and run the required
> checks. Treat worker summaries as claims, not proof. Distinguish your own
> observations from supplied evidence. For customer-visible journey changes,
> use `verify-nuave` in synthetic mode as required by the task. Never make live
> provider calls. Return PASS or CHANGES_REQUIRED, exact head/base, findings
> with file/line and expected behavior, checks/evidence, and limitations. Use
> BLOCKED when access or missing evidence prevents a verdict. Do not commit,
> push, merge, deploy, or approve via GitHub review.

The parent validates the structured results; missing criteria, missing SHA,
wrong commit, malformed output, or absent required evidence cannot count as
PASS. Map a reviewer's FAIL to CHANGES_REQUIRED only when actionable findings
are provided; otherwise record BLOCKED. Return concrete findings to the
worker, then obtain a new independent verdict on the revised commit. Stop on
repeated unresolved findings, unchanged artifacts after attempted repair,
unavailable permissions/access, no meaningful progress, or the call limit.
Never silently switch the reviewer into a fixer or call self-review independent.

## 4. Integrate and finish

For the initial local mode, implement dependent packages sequentially on the
same feature branch; the final review covers the whole selected slice. Do not
start parallel coders without an explicit larger job budget and disjoint
worktree/file ownership. If multiple branches already belong to the approved
job, assign integration to a worker: combine in dependency order on a feature
branch, resolve conflicts, run `npm run verify` and end-to-end acceptance,
then independently review the resulting full diff and exact integrated SHA.
Individual package PASS results do not accept an unreviewed integration.

The parent owns the PR description, reviewer verdict comment, CI follow-up,
and technical review replies. Record the finish condition, actual checks,
evidence, limitations, and the `Corrections: <n> — <what> → <control or reason>`
line required by `docs/WORKFLOW.md`. Publish the independent verdict with
attribution and the exact reviewed SHA; do not fabricate a reviewer identity.
Use the repository's public verdict format: PASS stays PASS; an explicit
PASS+NOTES stays PASS+NOTES with its nonblocking notes; CHANGES_REQUIRED or
FAIL publishes as FAIL with findings; BLOCKED publishes as FAIL with a clear
blocked/missing-evidence explanation. Preserve the internal status in the
comment. PASS+NOTES satisfies the review gate only if all criteria pass and
its notes are nonblocking. Never turn missing evidence into acceptance.

Check required CI on the current PR head and resolve actionable review
findings through the same bounded loop. Devin Review is an additional check,
not the specification reviewer. An Auto-Fix commit changes the head and
invalidates its old acceptance. Observe/fetch the new head, rerun affected
verification, and obtain independent review before declaring it accepted.
Do not change account Auto-Fix/Auto-review settings or branch protections
without applicable authorization. Treat a changed base or integration update
as needing a fresh consistency check, and re-review any changed final head.

Completion means every selected criterion has evidence, the final integrated
head has an independent PASS, required CI is green for that head, and required
review conversations are resolved. Report `READY_FOR_FOUNDER` with the PR,
base/head, evidence, remaining limitations, and the next approved slice.
This is not merged, deployed, full-spec acceptance, or proof of live providers.
Do not auto-merge: Nuave requires the founder's release authorization.

On a blocker or interruption, save a sanitized checkpoint under ignored
`.local-evidence/autonomous/<task-id>/`: scope/spec, approval source, base,
branch/head, package/criterion status, child IDs and dispatch count, review
findings, PR/check state, evidence paths, owned processes, blocker and next
action. Do not store secrets. On resume, validate Git/PR state, prior verdict
SHA, and owned processes before continuing; never replay stale approvals.
A saved checkpoint does not wake a sleeping session or promise continuation
after Desktop exits. Ask the founder only for a real product decision,
unavailable access, or permission that the current job does not already have.
