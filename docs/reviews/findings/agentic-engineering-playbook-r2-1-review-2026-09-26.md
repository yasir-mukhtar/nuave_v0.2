# Review: Agentic Engineering Playbook R2.1

> Reviewed: `docs/drafts/AGENTIC_ENGINEERING_PLAYBOOK.md` at commit `6e6d408` (Revision 0.2.1 / R2.1)
> Against: the R2 review `360e84c` (F-1 to F-9), the brief's "Quality bar", R1 review §2 (talk summary),
> pstack at `ecc249f`, and the Nuave code at `6e6d408` (runtime, tests, scripts, and workflows identical
> to `d45a944`; `git diff --stat d45a944 6e6d408 -- src tests scripts .github package.json playwright*.ts`
> is empty)
> Date: 2026-09-26
> Verdict: **ACCEPT WITH CHANGES.** All nine findings are resolved. One wrong count (N-1) must be corrected.
> N-2 and N-3 are small clarifications that can go in the same edit or into the first slice's PR. No new
> revision round is needed.

## 1. Findings F-1 to F-9

| # | Status | Evidence |
|---|---|---|
| F-1 | **Resolved** | `launch` now records `{pgid, port, root, mode}` with `root` from `git rev-parse --show-toplevel`, and gives the `next dev` reason for recording no SHA. `doctor` fails when the server came from another root, or on a dirty tree without `--allow-dirty`. `drive` stamps `HEAD` plus a dirty flag at drive time. The SHA check is kept only for `--pr`. Finish condition (d) now reads "another worktree". Side check: a dev run does not dirty the tree, because `next-env.d.ts` and `*.tsbuildinfo` are git-ignored (`.gitignore:18,42`). |
| F-2 | **Resolved** | Feature 5 declares `drive report-and-recovery --inject usefulness-failure` with evidence marked `fault-injected (not user-reachable in synthetic mode)`, and the *Open* note is gone. The cited stub is real: `tests/e2e/new-intake-glm.spec.ts:273` is `page.route("**/api/audit/report", …)`, which fulfills a 422 with `REPORT_USEFULNESS_FAILURE` once and falls back after that. |
| F-3 | **Resolved** | `enter()` is at `new-intake-journey.spec.ts:29`, and `track()` and `toQuestions()` are at `new-intake-glm.spec.ts:24,35`. The shared driver absorbs all three. `helpers.ts` is 77 lines with 4 exports, as stated. Finish condition (e) is now a number. I ran `playwright test --list` in a checkout of `6e6d408`: **30 tests in 5 files**. With `-c playwright.config.disabled.ts` it lists **3 tests in 1 file**. The 5 specs hold 28 `test(` blocks, and two of them are generated in loops (`offline-network.spec.ts:11`, `new-intake-glm.spec.ts:376`), so each runs twice. Both the review ("28 blocks") and the draft ("30 tests") are right, and the draft reconciles them. |
| F-4 | **Resolved** | (1) The guard also matches `"NUAVE_*"` literals. `LOCAL_PACK_DIR_ENV = "NUAVE_LOCAL_AUDIT_PACK_DIR"` is at `local-direct-ten-audit.ts:52` and is read at `:138`. (2) `NUAVE_GLM_EVIDENCE_DIR` has 2 code reads (`glm-local.ts:115,602`); line 24 has it only in a comment. (3) The blanking caveat is accurate. `package-lock.json` pins `@next/env` 16.3.5. Its `processEnv` applies a file value only when `typeof initialEnv[key] === "undefined"`, so `""` does block `.env.local`. `:115` uses `??` (unsafe), while `:602` (`?.trim() \|\| undefined`) and `:138` (`\|\|`) treat `""` as unset. I diffed every `NUAVE_*` token in non-test `src/` against `shared-config.ts`. Six keys are missing there. Four of them (`NUAVE_AUDIT_LIVE_AUTHORIZED`, `NUAVE_GLM_LIVE_AUTHORIZED`, `NUAVE_GLM_LOCAL_EXPERIMENT`, `NUAVE_NEW_INTAKE_JOURNEY_CONTRACT`) appear only in comments, so "two keys" is correct. |
| F-5 | **Resolved, with a wrong count (N-1)** | The guard matches string literals only, not comments. Fixtures count as test code, and that claim holds: `report-golden.ts` is imported only by `*.test.*` files and `report-presentation.fixture.ts`, which is imported only by `report-presentation.test.ts` and `report-body.test.tsx`. (`measurement-matrix.ts` contains the text `report-golden` only as an ID string, not as an import.) The comment files are listed correctly. The file count is wrong: see N-1. |
| F-6 | **Resolved** | §6: "drives the same feature on the base and on the head; if the base lacks the feature, it says so." pstack `shipping.md` step 1 says "against parent versus head". Attribution nit: see N-4. |
| F-7 | **Resolved** | The skip now uses "the PR's diff file list". It excludes `SKILL.md`, `features/*.md`, `AGENTS.md`, `CLAUDE.md`, and CI workflow files. The Sources attribution lists "the doc-only skip and its exclusions" as [G]. |
| F-8 | **Resolved** | §1 lists "force-push, deleting production data, sending external messages [P]". pstack `principle-never-block-on-the-human/SKILL.md:18` uses exactly those three. "Merge, deploy, and spend" is tagged [G]. The note on autopilot merge is accurate: `autopilot-full.md` step 5 says "the operator's full-autonomy grant plus the root's clean verdict is the merge authorization". |
| F-9 | **Resolved as a hypothesis** | `launch` starts its own process group, and `cleanup` stops only that group. The gotcha is labelled "a hypothesis, to confirm during the prove-once run", is checked by finish condition (c), and forbids killing processes this run did not start. Placement nit: it is filed under "every feature file's Gotchas", but it concerns launch and cleanup, so `SKILL.md`'s Cleanup section is the natural home. This does not block acceptance. |

## 2. P-5 verification

All three citations were checked against the live docs on 2026-09-26.

- **Codex: confirmed.** `developers.openai.com/codex/skills` returns a 308 redirect to
  `learn.chatgpt.com/docs/build-skills`, as the draft says. The page says: "For repositories, Codex scans
  `.agents/skills` in every directory from your current working directory up to the repository root"
  and "Codex supports symlinked skill folders and follows the symlink target when scanning these
  locations."
- **Claude Code: confirmed.** `code.claude.com/docs/en/skills`:
  - project skills load from `.claude/skills/<skill-name>/SKILL.md`, "in the directory where you start
    it and in every parent directory up to the repository root";
  - in a linked worktree, the search stops at the worktree root;
  - "a `<skill-name>` entry in the … project location can be a symlink to a directory elsewhere on
    disk."

  I downloaded the full page (1.15 MB) and searched it for `.agents`. It has **0 occurrences**, while
  `symlink` has 13. So `.agents/skills` is absent from the docs, as the draft says. That shows only the
  docs are silent, not what Claude Code actually does, and the draft words it that way.

  One extra fact the draft does not need: from v2.1.277, a linked worktree with no `.claude/skills` at
  its root falls back to the main checkout's skills. A committed symlink makes this irrelevant.
- **Cursor: confirmed.** `cursor.com/docs/context/skills` loads `.agents/skills/` and `.cursor/skills/`.
  It also loads, "for compatibility", `.claude/skills/` and `.codex/skills/`. The page does not mention
  symlinks, as the draft says. "Cursor needs nothing extra" therefore holds.
- **Devin:** not checked (carried from R2, and the draft says so).

## 3. New problems introduced by R2.1

**N-1 (Low, factual, must fix): class A file count.** B.3 row A says the literal "still appears 7 times
in 6 non-test `src/lib/audit/` files". The sites it lists are in **5** files: `types.ts`,
`questions-id-provider.ts`, `production-observation-method.ts`, `openai.ts` (×2), and `contracts.ts`
(×2). That makes 7 literals in 5 files, or **8 literals in 6 files** counting the fixture. The R2 review's
"8 literals in 6 files" was correct. The worker's hand-back claim of "8 literals in 7 files, not 6" is
wrong. The draft's own list contradicts its number. *Change:* "7 times in 5 non-test files".

**N-2 (Low): class B guard should say, as class A does, that it ignores comments.**
`src/lib/audit/deployment-gate.ts:5–6` names three `NUAVE_*` keys that `offlineE2EServerEnv` does not
set, and it names them only in a comment. A guard written with a bare `NUAVE_[A-Z_]+` pattern would fail
on them. The draft's quoted `"NUAVE_*"` wording implies quoted literals, but say it plainly: "string
literals and `process.env.` reads only, not comments".

**N-3 (Low): known-bad case (d) could pass for the wrong reason.** "doctor fails against a server
launched from another worktree" is also met if doctor simply finds no state file in the second
worktree. Pin the setup: doctor reads a state file whose `root` is this checkout, while the process on
the port was started from another worktree. Doctor must fail on the root mismatch, not on a missing
file.

**N-4 (nit): attribution of the base-missing clause.** "If the base lacks the feature, it says so" is
tagged `[P shipping step 1]`. Step 1 only says "parent versus head". The base-lacks-the-feature rule comes
from `autopilot-full.md` step 4 ("If trunk does not have the feature, record that fact"). Tag it
`[P shipping step 1; autopilot-full step 4]`, or leave it as is. The source is still pstack.

## 4. Regression check

`git diff 360e84c 6e6d408` touches only the playbook. Nothing the earlier review confirmed was broken or
weakened:

- **Preview-SHA finding: intact.** `pr-preview.yml:33` checks out `head.sha`, and `:103` publishes
  `${GITHUB_SHA}`. The fix is still "in scope for this slice".
- **Class A–C evidence: intact.** PRs #69 and #71, `6a27c51`, and PR #70 are unchanged. Class C is still
  held, with P-7 as its promotion path.
- **Appendix: intact.** It has no deleted lines, and all six triggers are unchanged.
- **P-1 to P-7: still proposals.** Only P-5's "Why" cell changed. B.5 is still titled "Founder
  proposals (not decisions)".
- **B.1 controls: unchanged.** Doctor's local check is stronger than in R2: a dirty tree now fails
  instead of only being reported.
- **[T] tags in the core: unchanged by the diff.**

## 5. Quality bar

- **Core length: 146 lines** between `<!-- core:start -->` and `<!-- core:end -->` (limit ~150).
- **Source tags:** present on every changed rule. [P] and [G] are split correctly in §1, §6, and
  Sources.
- **No fabricated evidence.** Every path, line, and count I checked matches the code, except N-1, which
  is a miscount rather than invented evidence.
- **Plain language:** kept. New terms (process group, fault-injected) are explained where they first
  appear.

## 6. Assumptions I could not confirm

- **Claude Code and `.agents/skills`.** Claude Code does not read `.agents/skills`. The docs are silent;
  its behaviour was not tested.
- **Committed symlinks on every OS.** A committed symlink works on every contributor's OS. Windows needs
  `core.symlinks` and developer mode or admin rights.
- **Devin.** Devin loads `.agents/skills/`.
- **F-9 process group.** `next dev` children stay in the launched process group, and stopping that group
  frees the port. This was not run.
- **Doctor's root detection.** How doctor finds the launch folder of the process on the port (for
  example, `lsof -p <pid> -d cwd` on macOS) was not validated.
- **Class B triggers.** The trigger for `6a27c51` (empty body) and the 2026-09-19 local fix (a session
  record I cannot see) remain inferred, as the draft says.
- **Talk timestamps.** These are checked only against review §2. The raw transcript is intentionally
  unavailable, and the diff did not change any [T] tag.
- **`npm run verify`.** I did not run it. The e2e counts come from `playwright test --list` only.
- **`@next/env` source.** I read `@next/env` from the main checkout's `node_modules`. `package-lock.json`
  at `6e6d408` pins the same version, 16.3.5.

## 7. Next step

Correct N-1 in the draft. Apply N-2 and N-3 there too, or carry them into the `verify-nuave` slice's PR.
The founder can then decide on P-1 to P-7, starting with P-5, whose citations are now verified.
