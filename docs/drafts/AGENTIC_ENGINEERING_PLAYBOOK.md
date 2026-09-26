# Agentic Engineering Playbook

> Revision: 0.2.1 / R2.1 (targeted revision of R2 `42e2045`; R1 is preserved in Git at `ac4bd62`)
> Status: **In review — not adopted**
> Brief: [`docs/briefs/agentic-engineering-playbook-r2.md`](../briefs/agentic-engineering-playbook-r2.md)
> Review applied: [`agentic-engineering-playbook-r2-review-2026-09-26.md`](../reviews/findings/agentic-engineering-playbook-r2-review-2026-09-26.md) (`360e84c`), F-1 to F-9
> Sources: the talk via review §2, pstack at `ecc249f`, and the R1 review (see § Sources)

Part A is the portable core. An agent loads Part A in one read (the lines between the `core` markers).
Part B binds it to Nuave. The appendix is optional hardening with activation triggers. Source tags:
**[T]** = the talk, **[P]** = pstack, **[G]** = this guide's own addition.

<!-- core:start -->
## Part A — Portable core

### 1. The idea

- **Trust limits scale, not model capability.** [T 00:19–00:47] The *trust graph* plots how many agents
  you can leave running unsupervised. The hardest stage to leave is 1–5 agents, where you babysit
  every chat. [T ~05:30, 05:38–06:05]
- **Build a Michelin kitchen, not a factory.** [T 00:57–01:55] You own the dish. Your work is the
  stations, the equipment, and the training.
- **"I am the bottleneck."** [T 04:37–04:59] Move what you know out of your head and out of documents.
  Put it into the environment: code structure, static checks, and a verification skill any agent can run.
- **Three levers:** verification, engineering skills, and agent-friendly architecture. [T ~07:15]
- **Who decides what.** [P never-block-on-the-human] The owner decides product direction and
  irreversible actions: force-push, deleting production data, sending external messages [P], plus
  merge, deploy, and spend [G; pstack's autopilot can let a PR's owner merge]. Reversible engineering
  work (writing code, running tests, committing to a feature branch) goes ahead. The agent presents
  evidence, and the owner corrects afterwards. Do not ask "should I do X?" about reversible work.
- **Finish condition first.** [P guide 06/07] Every task states what "done" means as a check that can
  pass or fail. "Work on it for 4 hours" is not a finish condition.

### 2. The correction loop

Every time a human corrects an agent, put the lesson into the **highest layer that works**. [T ~16:30,
36:09–37:03]

| Layer | Worked example |
|---|---|
| 1. Codebase | An agent calls the payment API directly. Make the client module the only export, so the wrong call cannot be written. |
| 2. Static analysis | Agents keep importing server code into the browser bundle. Add an import-boundary lint rule. |
| 3. Rules / bot review | "Never log a request body" cannot be checked statically yet. Add a rule or bot-review check. |
| 4. Skills | Agents debug slow pages by guessing. Add "take a trace first" to the perf playbook. |
| 5. Style guide / human review | A naming taste you cannot automate. Treat it as a *discovery source* for layers 1–4, not a control. |

Layers 3–5 are guidance, and agents or operators can skip them. [T 17:08–18:36] Standard for a new
layer-1/2 control [G, from R1]: **reject the class, not the instance.** Each rule ships with a
known-bad case that fails and a known-good case that passes. CI must actually run it. Existing
violations go into an explicit baseline that blocks new ones.

**Encode the rule, delete the instruction.** [P encode-lessons-in-structure] If you write the same
instruction a second time, turn it into a lint rule, a type, a runtime check, or a script, then delete
the prose. "The instruction is the symptom."

### 3. Verification skill (build this first)

A verification skill is a **CLI plus a feature map**, kept in the repository's skill directory.
[T 09:16–11:34] It replaces the throwaway probe scripts agents write in each session, and it becomes
critical infrastructure. [T 11:42–12:20] It proves *correctness* only, not performance or code
quality. [T 12:39–13:06]

**Anatomy** [P create-verification-skill]. `SKILL.md` has these sections:

- **Launch:** the exact start command, how to tell the app is ready, and how to shut it down.
- **Doctor:** one read-only check that the instance is worth driving: right process, right build/SHA,
  our port, right mode.
- **Drive:** the CLI, using real, stable handles (ARIA roles and names, routes), never coordinates.
- **Evidence:** what to capture and where it goes.
- **Cleanup:** kill only what this run started. Keep the evidence.
- **Helpers:** executable scripts, each with its invocation shown in the skill body.

**Feature map** (`features/`): a `README.md` index (baseline setup, driving conventions, proof rules)
plus one file per user-facing feature. Each feature file has exactly four H2 sections: `Sub-features`,
`How to get to it (user POV)`, `Driving it with <cli>`, `Gotchas`. The map says what exists, how a user
reaches it, and what end state proves it works. It also lets agents interpret vague bug reports.
[T 10:13–11:34]

**Evidence standard** [P]: use the real user path, not internal setters or test-only endpoints.
Capture the action *and* the resulting state. Check side effects (downloads, stored values, network
requests). Mock only where a production boundary already isolates the external system. Confirm by
observation what a "dry-run" or synthetic mode actually skips.

**Prove once.** A skill that has never been run is a draft. Before it counts, a fresh session runs
launch → doctor → drive one feature → capture → cleanup, then confirms the evidence survived cleanup.
[P]

**Maintenance pass** [P maintain-verification-skill]: one read-only source reader per feature, then
one live pass that drives every feature. The outcome is exactly one of `clean`, `changed` (one PR,
edits confined to the skill directory), or `blocked` (with the named blocker). It never edits product
code. A product regression gets reported, not written out of the docs. The talk runs this as an
automation. [T 10:13–11:34] Start manually, after any PR that changes a user-facing flow.

### 4. Engineering playbooks

Short task-type recipes that teach agents to engineer your way. [T 13:06–14:50] Install pstack where
your tool supports it. Otherwise keep a starter set in the skill directory:

- **Bug fix:** reproduce on the real surface with the verify skill → narrow down the cause with
  runtime evidence → smallest fix the evidence supports → re-run the same repro. Commit the failing
  test before the fix when a cheap test path exists. [P bug-fix]
- **Feature:** name the data shape first → build in small verifiable units → verify on the matching
  surface. "Inconclusive" or wrong surface is not a pass. [P feature]
- **Investigation:** read-only. Answer with file and line citations and runtime evidence where it
  matters. Change nothing. [P investigation]

**Growth:** after a long or painful task, reflect and edit the relevant playbook. [P reflect] Don't
write a policy document. If a lesson can go into layer 1–2, it goes there instead (§2).

### 5. Codebase as memory and gardening

Agents extend the patterns they read, so the codebase is their memory. [T 15:41–16:23] Anti-patterns
spread by copying: every copy makes the next one likelier. [T 20:43–21:31]

- **One paved path per concern.** Make the shortcut the right path, even if that is "annoying for
  humans." [T 19:01–20:29]
- **Lint before cleanup.** When you see a bad pattern, add the rule first to stop it spreading, with a
  baseline for existing cases. Then delete the tech debt. [T 24:24–26:36]
- **At least one enforced import/dependency boundary per major runtime split** (server/browser,
  worker/node, active/archived code). [T 27:45–29:09 main→renderer example]
- **Workaround comments license more workarounds.** [T 23:00–24:24] Agents read a nearby "hack because
  X" comment as permission. Treat *workaround + justifying comment* as a lint-worthy smell. Comments
  that state a real external constraint may stay. You may be proportionate, but name the mechanism
  when you allow one. [G]
- **Quality bar:** would you be happy if the next agent copied this? [T 24:24–26:36]

### 6. Writer ≠ verifier, and landing (single PR)

[P shipping; not in the talk] The agent that wrote a change does not certify it. A fresh session runs
the verify skill against the PR head and posts one verdict comment: `PASS`, `PASS+NOTES`, or `FAIL`,
with evidence paths. It drives the same feature on the base and on the head; if the base lacks the
feature, it says so. [P shipping 1; autopilot-full 4] Missing evidence means `FAIL / blocked`,
never an inferred pass [G, from R1]. Green CI and bot approval are not verdicts. **Evidence record:**
the PR description (finish condition, commands run with outputs, verify-skill evidence, corrections)
plus that one verdict comment. Nothing else. [G]
**Freshness** [P]: if the stable `git patch-id` (a fingerprint of the diff that survives a rebase) is
unchanged, the code verdict stands. Re-run only mergeability and CI. **Doc-only changes** skip
independent verification when the PR's diff file list shows no executable file. [G] Files that
steer agents or CI never count as doc-only: `SKILL.md`, `features/*.md`, `AGENTS.md`, `CLAUDE.md`,
and CI workflow files. Stacked PRs: see the appendix.

### 7. Measuring progress

Primary signal: **human corrections per merged change, and the layer each was promoted to.** Record
them in the PR description as `Corrections: <n> — <what> → <layer/control or "not promoted: why">`, not
in a new tracker. [G, following T's axis] The trend you want: fewer corrections, and more of them
landing in layers 1–2. Secondary signals: escaped defects (found after merge), and time from owner
approval to merge. **PR count and lines of code are not targets.** [T 04:21; P README]

### 8. New-project bootstrap

Greenfield is where strictness is cheapest, so lock it down early. [T ~07:15] In order:

1. One paved-path module layout with an **enforced import rule** between runtime splits.
2. Lint, typecheck, and **one** canonical verify command that CI runs and that makes no live calls.
3. As soon as anything runs: the verification skill + feature map (§3), proved once.
4. Playbooks (§4): install pstack or copy the starter set.
5. The outer loop comes last: bots that react to alerts and reports, reusing the same skills. It needs
   little infrastructure and no "company brain." [T 32:37–35:15, 33:08–33:36]
<!-- core:end -->

## Part B — Nuave binding

Kept in this file rather than a companion so the founder reviews one artifact. It sits outside the
core markers, so the core stays portable. After adoption it moves into the skill directory.
Nuave-specific commands appear only here.

### B.1 Controls to keep (from review §4.1)

`npm run verify` (offline gate) and the required `validate` check. Branch protection plus the
`verify-main-origin` deploy gate. `tests/archive-isolation.guard.test.ts` (import boundary).
`tests/e2e/network-guard.ts` with `offline-network.spec.ts` (no live egress offline).
`offlineE2EServerEnv` in `tests/e2e/shared-config.ts` (blanks credentials). `pr-preview.yml`
(isolated synthetic preview per PR). Founder authority over merge, deploy, live calls, and spend
(`AGENTS.md`). R2.1 changes none of these.

### B.2 First slice: `verify-nuave` (one PR)

**Location:** proposal P-5 below. Paths here are relative to that skill directory.

**CLI** `bin/verify-nuave` (Node/TypeScript on the Playwright library already in the repo):

| Command | Behavior |
|---|---|
| `launch [--port 3100]` | Starts `npm run dev -- --port <p> --hostname 127.0.0.1` (`dev` is `next dev`) as its own process group, with env from `offlineE2EServerEnv({ NUAVE_NEW_AUDIT_ENABLED: "true", NUAVE_AUDIT_MODE: "synthetic" })`. Waits until the URL answers. Writes `{pgid, port, root, mode}` to the run's state file, where `root` is the checkout's absolute path (`git rev-parse --show-toplevel`). No SHA is recorded here: `next dev` hot-reloads, so it serves whatever is in the working tree, and a launch-time SHA says nothing about the code being served. |
| `doctor [--pr <n>] [--allow-dirty]` | Read-only. Local: the process group from the state file is alive, the port answers, the process on the port was launched from the state file's `root` (fail if it came from another checkout or worktree), `/audit` renders the entry screen asserted in `audit-entry.spec.ts`, and mode is `synthetic`. Fails on a dirty tree unless `--allow-dirty` is passed. `--pr`: the preview is a fixed build, so here the SHA check stays: the preview comment's commit equals `gh pr view <n> --json headRefOid` (depends on the fix below). |
| `drive <feature>` | Runs one feature-map recipe from its baseline state. Stamps the evidence with `git rev-parse HEAD` and a dirty flag **at drive time**. Records every request with `collectRequests` (`helpers.ts`) and fails on `unexpectedExternalRequests` (`network-guard.ts`). |
| `capture` | Screenshot and ARIA snapshot per step, the downloaded JSON, an A4 PDF via `page.pdf()` in print media (labelled "headless, not native print"), and the network log. |
| `cleanup` | Stops the whole process group recorded by this run's `launch` (`npm` plus the `next dev` children it spawns), and nothing else. Evidence stays. |

- **Evidence directory:** `.local-evidence/verify-nuave/<run-id>/`. It is already git-ignored, so no
  new ignore rule is needed.
- **One paved path:** the journey steps are spread over three specs today: inline in
  `tests/e2e/smart-intake.spec.ts`, `enter()` in `new-intake-journey.spec.ts:29`, and `track()` and
  `toQuestions()` in `new-intake-glm.spec.ts:24,35`. Move all three into one shared driver module. The
  specs and the CLI both import it, so selectors live in one place. A driver built from only one spec
  would leave parallel ways to do the same steps (§5). `tests/e2e/helpers.ts` (77 lines:
  `grantAccess`, `collectRequests`, `sideEffectViolations`, `assertNoSideEffects`) holds only the
  access cookie and request checks. It is not a journey driver, so wrapping it alone would not be enough.
- **Preview SHA fix (in scope for this slice):** `pr-preview.yml` publishes `${GITHUB_SHA}`. On
  `pull_request` events that is the merge commit, not the PR head it checked out
  (`github.event.pull_request.head.sha`). Publish the head SHA, or Doctor can never match.

**Feature map** (`features/`, four H2 sections each):

1. `audit-entry`: landing call-to-action → `/audit` → brand and URL entry, plus its validation.
2. `smart-intake-summary`: "Ini yang Nuave pahami." summary, row edits, focus, then
   `Sudah sesuai — buat pertanyaan audit`.
3. `question-review`: "Periksa pertanyaan audit", edits, `Mulai audit`.
4. `audit-run`: ten synthetic observations, the labelled synthetic notice, no duplicate run on reload.
5. `report-and-recovery`: report, `Download PDF`, and JSON download on the real user path.
   Answers-only recovery is **not user-reachable in synthetic mode**: the only existing route to it
   answers `/api/audit/report` with a fake 422 (`REPORT_USEFULNESS_FAILURE`) through
   `page.route().fulfill()` (`tests/e2e/new-intake-glm.spec.ts:273`). §3's evidence standard forbids
   that as proof of a user path, so recovery gets its own named, labelled drive:
   `drive report-and-recovery --inject usefulness-failure`, reusing that exact route stub. Its evidence
   is marked `fault-injected (not user-reachable in synthetic mode)`, never plain `passed`. Gotchas:
   check every PDF page for clipping, and note the known cosmetic 320 px wrap.

**Gotcha for `SKILL.md`'s Cleanup section (a hypothesis, to confirm during the prove-once run, not a
fact):**
- `cleanup` may leave the port bound if it kills only the recorded `npm` process ID, because
  `next dev` starts child processes of its own. The process-group design above assumes this; the
  prove-once run confirms it by checking that the port is free after cleanup (finish condition (c)).
  If it is not free, fix the stop logic. Do not widen it to kill processes this run did not start.

**Finish condition:** a fresh session given only the skill, on a clean checkout of the slice's PR head:
(a) runs launch → doctor → drive all five features (recovery through its labelled fault-injected
drive) → capture → cleanup; (b) evidence exists after cleanup, is stamped with the drive-time `HEAD`
and dirty flag, and the network log shows zero unexpected external requests; (c) the port is free
after cleanup; (d) known-bad case: with a state file whose `root` is this checkout while the process
on the port was started from another worktree, doctor **fails on the root mismatch** (not on a
missing state file); (e) `npm run verify` passes and the e2e suites still list the same tests as
before the refactor: 30 tests from `playwright test --list` (28 `test(` blocks in the five specs matched by
`playwright.config.ts`, two of them generated in loops) plus 3 in `preview-disabled.spec.ts` under
`playwright.config.disabled.ts`. Counts checked at `360e84c`; re-count on the slice's base before
starting.

### B.3 Second slice: controls from real corrections

I checked each class against the PRs and the current code at `d45a944`. R2.1 re-checked the counts at
`360e84c`, whose runtime, test, script, and workflow files are identical to `d45a944`:

| # | Class | Evidence | Control (layer) | Status |
|---|---|---|---|---|
| A | Approved provider or system identity hard-coded in several places | PR #69 (live gate pinned to OpenCode Go → 503) and PR #71 (observation integrity pinned to one label → 422), same live run, 2026-09-20. The string literal `"OpenAI Responses API"` still appears 7 times in 5 non-test `src/lib/audit/` files (`types.ts:281`, `questions-id-provider.ts:60`, `production-observation-method.ts:11`, `openai.ts:568,600`, `contracts.ts:1195–1196`), plus once in the fixture `fixtures/report-golden.ts:169`. The same words also appear in comments (`contracts.ts`, `telemetry.ts`, `groq.ts`, `gemini.ts`) | One registry module exports the approved live providers and their system labels, and every gate derives from it (L1). A guard test fails when a label appears as a **string literal** (not in a comment) in non-test `src/` outside the registry (L2). Fixtures count as test code: `report-golden.ts` is imported only by `*.test.*` files and `report-presentation.fixture.ts`, which is itself imported only by tests | **Confirmed, recurring.** Encode |
| B | Developer `.env.local` leaks into the "offline" e2e server (`next dev` reads it from disk, and only explicitly set keys override it) | `6a27c51` (2026-08-23 "isolate Playwright server environment"; the commit body is empty, so the trigger is inferred) and the 2026-09-19 local fix for `NUAVE_NEW_INTAKE_PREVIEW_ENABLED` (session record; never merged; the flag has since been removed). Today two keys read by `src/` are not set by `offlineE2EServerEnv`: `NUAVE_GLM_EVIDENCE_DIR` (2 code reads, `src/lib/intake/glm-local.ts:115,602`) and `NUAVE_LOCAL_AUDIT_PACK_DIR` (read through the constant `LOCAL_PACK_DIR_ENV`, `src/lib/audit/local-direct-ten-audit.ts:52,138`) | A guard test: every `NUAVE_*` key read in non-test `src/` is a key that `offlineE2EServerEnv()` sets explicitly (L2). It matches `process.env.NUAVE_*` reads and `"NUAVE_*"` string literals only, not comments, so reads through a constant are caught while comment-only mentions (e.g. the three retired keys in `src/lib/audit/deployment-gate.ts:5–6`) are ignored. **Blanking caveat:** setting a key to `""` does block `.env.local` (`@next/env` 16.3.5 `processEnv` applies a file value only when the key is `undefined` in the starting environment), but `""` is not neutral for every reader. `glm-local.ts:115` (`glmEvidenceDir`) uses `??`, so `""` would resolve to the current directory; `glm-local.ts:602` (`?.trim() \|\| undefined`) and `local-direct-ten-audit.ts:138` (`\|\|`) treat `""` as unset. Before blanking a key, make its readers treat `""` as unset, reader by reader | **Confirmed twice.** Encode. The current gap is inferred, so the implementer confirms it with the known-bad case |
| C | Worker-runtime-incompatible API that passes under Node (`fetch` `redirect: "error"`) | PR #70, once. It was found only in production because `test:workers` runs synthetic mode (the live transport never executes) and is not part of `verify` or CI | Hold. On a second worker-only failure, promote (P-7) | **Single occurrence.** Not encoded |

Each encoded control ships with its known-bad and known-good cases (§2).

### B.4 Goal: fewer artifacts per change

Specs 011–012 produced 38 and 12 Markdown files, prompt/result pairs, and 316–331-file hash manifests
per review. Target per change: **the PR description plus one verdict comment** (§6). A product-behavior
spec package holds only `SPEC.md` and `VERIFICATION.md`. Worker prompts, results, and manifests stay
out of Git unless the founder asks. This changes `docs/WORKFLOW.md`, so it is proposal P-6.

### B.5 Founder proposals (not decisions)

| ID | Proposal | Why |
|---|---|---|
| P-1 | Amend `AGENTS.md` "Do not commit or push unless the founder explicitly requests it" to: *agents may commit and push to their own non-`main` feature branches without asking; merge, deploy, force-push, and anything on `main` stay founder-only.* | Feature-branch commits are reversible. This is what [P] never-block-on-the-human requires |
| P-2 | Relax the spec gate: internal engineering changes with no customer-visible behavior change and a checkable finish condition need no spec. The finish condition goes in the PR description. | [P] "the best spec is code". Keeps specs for product behavior |
| P-3 | No paid tools now (no bot reviewer, cloud agents, or extra subscriptions). Revisit when §7 shows a layer-3 gap that humans keep catching. | Spending decision |
| P-4 | Merge and deploy stay with the founder. Revisit only after the appendix's trusted-verdict item is built. | Unchanged authority; stated so it is explicit |
| P-5 | Canonical skill directory `.agents/skills/` (so `.agents/skills/verify-nuave/`). If Claude Code is in use, add a `.claude/skills/verify-nuave` symlink pointing to it. Cursor needs nothing extra. **Check:** a fresh session in each tool in use lists `verify-nuave` without being told the path. | Documented (checked 2026-09-26): **Codex** scans `.agents/skills` in every directory from the working directory up to the repo root and follows symlinked skill folders ([Codex docs](https://developers.openai.com/codex/skills), now redirecting to learn.chatgpt.com/docs/build-skills). **Claude Code** loads project skills from `.claude/skills/<name>/SKILL.md`, from the start directory up to the repo root (only up to the worktree root in a linked worktree); a `<name>` entry may be a symlink to a directory elsewhere; `.agents/skills` is not among its listed locations ([Claude Code docs](https://code.claude.com/docs/en/skills)). **Cursor** loads `.agents/skills/` and `.cursor/skills/`, plus `.claude/skills/` and `.codex/skills/` for compatibility ([Cursor docs](https://cursor.com/docs/context/skills)); it says nothing about symlinks, which does not matter here since it reads `.agents/skills/` directly. Devin's docs list `.agents/skills/` as loaded (per R2, not re-checked). **Assumptions:** that Claude Code does not also read `.agents/skills` (only its absence from the listed locations was confirmed); that the symlink resolves correctly when committed to Git on every contributor's OS. The check proves both |
| P-6 | Amend `docs/WORKFLOW.md` to the per-change evidence rule in B.4. | Removes the current bottleneck (review R-1) |
| P-7 | Add `npm run test:workers` to CI or `verify` when class C recurs. | Changes the canonical gate |

## Appendix — Optional hardening (activate only on the trigger)

Condensed from R1 §§6–10. None of this is needed for one founder with one writer at a time.

| Item | What it adds | Activation trigger |
|---|---|---|
| Structured evidence record | Machine-readable verdict: base/head SHA, patch-id, writer and verifier run IDs, per-criterion results, evidence digest | A machine (not the founder) consumes verdicts to decide merges |
| Trusted verdict publisher | A required check published only by a verifier identity the writer cannot use, evaluated from trusted (base) code, failing when evidence is absent | Agents may merge without a founder click (P-4 reversed) |
| Stricter freshness | Any new head invalidates the verdict (a deliberate deviation from [P]'s patch-id rule) | Several concurrent writers on one base, or a regulated release |
| Stack landing | [P shipping]: one verdict per PR against its immediate base. Land only the contiguous verified run from the bottom, one PR at a time. Recompute after each merge. `autoMergeRequest` is not readiness | The first stacked PR (a PR built on another unmerged PR) |
| Workflow probes | For each gate adopted: a disposable known-bad case proves it blocks, and a clean case proves it passes (e.g. writer-authored PASS, changed head, wrong preview SHA) | Whenever a gate from this table is adopted. Probe only that gate |
| Credential separation | Writer and verifier sessions stop sharing credentials | A second human contributor, or unattended merge |

## Sources

- **Talk:** Lauren (poteto), 38 min, posted 2026-09-21, via the structured summary in review §2
  ([`docs/reviews/findings/agentic-engineering-playbook-r1-review-2026-09-26.md`](../reviews/findings/agentic-engineering-playbook-r1-review-2026-09-26.md)).
  Timestamps above are review §2's. The raw transcript is private and was not used.
- **pstack at `ecc249f`:**
  <https://github.com/cursor/plugins/tree/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack>: README,
  guide 06/07/10, `create-verification-skill` (+ feature-map example), `maintain-verification-skill`,
  `poteto-mode/playbooks/{shipping,bug-fix,feature}.md`, and the principles encode-lessons-in-structure,
  never-block-on-the-human, prove-it-works, and laziness-protocol.
- **Attribution.** *Talk:* trust thesis, trust graph, three levers, CLI + feature map, five-layer order,
  codebase as memory, paved path, lint-first gardening, the workaround-comment mechanism, dependency
  boundaries, outer loop last. *pstack:* Launch/Doctor/Drive/Evidence/Cleanup anatomy, prove-once,
  the maintenance pass and its outcomes, the evidence standard, playbook steps, never-block-on-the-human,
  finish conditions, per-PR independent verdicts with a base-versus-head comparison, stack landing,
  patch-id freshness. *This guide [G]:* the evidence record as PR description + verdict comment, the
  doc-only skip and its exclusions, merge/deploy/spend as owner-only actions, the corrections-per-change
  format, the reject-the-class standard with a baseline and missing-evidence-means-blocked (salvaged
  from R1), the Nuave binding, and the appendix triggers.
