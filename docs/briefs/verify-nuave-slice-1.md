# Worker prompt: build the `verify-nuave` skill (slice 1)

> Status: **Ready to hand over** once PR #83 is merged
> Owner: Orchestrator
> Approved plan: [`AGENTIC_ENGINEERING_PLAYBOOK.md`](../AGENTIC_ENGINEERING_PLAYBOOK.md) §B.2
> (founder decision 2026-09-26 in [`DECISION_LOG.md`](../DECISION_LOG.md): B.2 is the go-ahead, no
> separate spec)
> Output: one PR from branch `feat/verify-nuave`, not merged

Copy everything below the line into a fresh worker session.

---

You are the worker for one bounded task in the Nuave repository (`yasir-mukhtar/nuave_v0.2`).

**Objective:** build the `verify-nuave` verification skill described in the playbook's §B.2, as one
pull request. The skill is a command-line tool plus a feature map that lets any agent:

- start the app in synthetic mode;
- check it is the right server;
- drive the audit journey the way a user would;
- save evidence;
- clean up afterwards.

**Start from:** a fresh branch `feat/verify-nuave` off the current `main`, which must include PR #83
(`docs/AGENTIC_ENGINEERING_PLAYBOOK.md` exists there). If it does not, stop and report.

Read these files completely, in this order:

1. `AGENTS.md`: the project rules.
2. `docs/AGENTIC_ENGINEERING_PLAYBOOK.md`: all of Part A §3 (verification skill) and §6 (landing), and
   all of Part B. **§B.2 is your approved plan and finish condition.** §B.1 lists controls you must
   not weaken.
3. pstack's `create-verification-skill` at the pinned commit, for the skill's shape:
   `https://github.com/cursor/plugins/tree/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill`
   (`SKILL.md` and `references/feature-map-example/`).
4. The code B.2 names:
   - `tests/e2e/` (all six specs, plus `helpers.ts`, `network-guard.ts`, `shared-config.ts`);
   - `playwright.config.ts` and `playwright.config.disabled.ts`;
   - `.github/workflows/pr-preview.yml`;
   - `package.json`.

Do not read other drafts, specs, or historical plans.

## Scope

You may create or modify:

- `.agents/skills/verify-nuave/**`: the skill. It contains:
  - `SKILL.md`, with the sections Launch, Doctor, Drive, Evidence, Cleanup, and Helpers;
  - `features/README.md`, plus one file per feature, each with exactly the four H2 sections;
  - `bin/verify-nuave` and its source.
- `.claude/skills/verify-nuave`: a symlink to `../../.agents/skills/verify-nuave`. It is a relative
  link, so it works in any checkout.
- `tests/e2e/**`: move the journey steps into one shared driver module. The specs and the CLI both
  import it. B.2 names the steps: the inline steps in `smart-intake.spec.ts`, `enter()` in
  `new-intake-journey.spec.ts`, and `track()`/`toQuestions()` in `new-intake-glm.spec.ts`.
- `.github/workflows/pr-preview.yml`: **only** the published commit. Publish the PR head SHA
  (`github.event.pull_request.head.sha`), not `${GITHUB_SHA}`.
- `package.json`: only if the CLI needs a script entry.

You may run:

- `npm run verify` and `npm run test:e2e`;
- `npx playwright test --list`, with and without `-c playwright.config.disabled.ts`;
- `npm run dev` through your own CLI;
- `git`, and `gh pr create` / `gh pr view` for your own PR.

**Commit and push only to `feat/verify-nuave`, and open one ready (not draft) PR.** The founder
authorizes this by handing you this prompt. Do not merge.

## Out of scope

- **Live mode.** Synthetic mode only. Never set `NUAVE_AUDIT_MODE=live`, never make a live
  AI-provider call, and never spend money.
- **Product behavior.** No change to product code under `src/`. If the driver refactor seems to need
  one, stop and report.
- **Rule documents.** No change to the playbook, `AGENTS.md`, `docs/WORKFLOW.md`, `docs/NOW.md`, or
  `docs/DECISION_LOG.md`. Report anything in them that looks wrong instead.
- **Controls.** No weakening of any B.1 control: the offline network guard, `offlineE2EServerEnv`,
  the archive-isolation test, or the preview's isolation.
- **Other slices.** No class A/B guards (that is slice 2), and no other proposal (P-1 to P-4, P-6,
  P-7).
- **Dependencies.** No new dependency unless nothing already in the repo can do the job. The repo
  runs Node 22 and already has Playwright. If you add one, justify it in the PR description.

## Deliverable

One PR containing the skill, the symlink, the shared driver, and the preview SHA fix. Its description
is the **evidence record** (playbook §6):

- the finish condition;
- each command you ran, with its output;
- the evidence paths;
- a `Corrections:` line in the playbook's §7 format.

## Acceptance requirements (from B.2, plus the self-checks)

1. **Before refactoring, recount the tests on your base** with `npx playwright test --list`. The
   expected counts are 30 tests in 5 files, and 3 with `-c playwright.config.disabled.ts`. If your
   numbers differ, record yours and use them.
2. Launch, doctor, drive, capture, and cleanup behave as B.2's command table says:
   - **launch** starts `next dev` as its own process group and records `{pgid, port, root, mode}`;
   - **doctor** checks that the server was started from this checkout, and fails on a dirty tree
     unless `--allow-dirty` is passed;
   - **drive** stamps the evidence with `HEAD` and a dirty flag at drive time;
   - **cleanup** stops only this run's process group.
3. All five features in B.2's feature map are driven. Recovery uses
   `drive report-and-recovery --inject usefulness-failure`, reusing the existing 422 route stub. Mark
   its evidence `fault-injected (not user-reachable in synthetic mode)`.
4. B.2's finish condition (a) to (e) holds when you run the skill yourself from a clean checkout of
   your PR head:
   - **(c):** after cleanup, show that the port is free (for example, `lsof -i :3100` returns
     nothing).
   - **(d), the known-bad case:** show that doctor **fails on the root mismatch**. Set it up with a
     state file whose `root` is this checkout, while the server on the port was started from another
     worktree, created with `git worktree add` and removed afterwards. It must not fail merely
     because a file is missing.
   - **(e):** `npm run verify` passes, and the test counts match step 1.
5. **Cleanup gotcha (F-9).** The playbook says cleanup's port behaviour is a guess. Record what
   actually happened in `SKILL.md`'s Cleanup section. If the port was not freed, fix the stop logic
   without killing processes this run did not start.
6. **Doctor's root check.** Record in `SKILL.md` how doctor finds the folder the server was started
   from (for example, the process's working directory via `lsof -a -p <pid> -d cwd -Fn` on macOS).
   Say which operating systems it is known to work on.
7. **Skill discovery.** Start a fresh session in your own tool, without telling it the path, and
   report whether it lists `verify-nuave`. The later independent run checks the other tools.
8. **Evidence location.** Evidence lands under `.local-evidence/verify-nuave/<run-id>/`, which is
   already git-ignored. Do not commit it.

Your own run is **self-proof**, not the verdict. Per playbook §6, a different agent will run the skill
from a fresh session and post the `PASS` / `PASS+NOTES` / `FAIL` verdict. Do not post one yourself.

**Stop and report, rather than work around it, if:**

- the refactor changes the test count;
- the preview fix needs more than the published-SHA change;
- doctor cannot reliably tell which folder the server came from;
- a requirement cannot be met without a product-code change or a live call.

At completion, report:

1. the outcome and the PR link;
2. files changed;
3. checks run and results;
4. assumptions made;
5. unresolved risks or blockers; and
6. the next smallest useful action (expected: the independent prove-once run).
