# Review: Agentic Engineering Playbook R2

> Reviewed: `docs/drafts/AGENTIC_ENGINEERING_PLAYBOOK.md` at commit `42e2045` (Revision 0.2 / R2)
> Against: the brief `docs/briefs/agentic-engineering-playbook-r2.md`, R1 review §2, pstack at
> `ecc249f`, the talk transcript (private, local copy only), and the Nuave code at `42e2045`
> (runtime and tests identical to `d45a944`)
> Date: 2026-09-26
> Verdict: **ACCEPT WITH CHANGES.** The portable core can be adopted once F-6 to F-8 are applied. Part B
> needs F-1 to F-5 fixed before anyone builds the first slice from it.

## 1. Summary

R2 does what the R1 review asked for. It is a fresh rewrite, the core is 143 lines (checked between the
`core` markers), and every section tells an agent what to build or run. Rules are tagged by source, R1's
heavy controls sit in an appendix with activation triggers, and every brief requirement (sections 1–11,
proposals P-1 to P-5, reduced artifacts) is present. Its two new findings hold up:

- **Preview SHA: confirmed.** `pr-preview.yml` checks out `github.event.pull_request.head.sha`
  (line 33) but publishes `${GITHUB_SHA}` (line 103). On `pull_request` events that is GitHub's
  temporary merge commit, so a head-SHA comparison could never match.
- **`helpers.ts` is not a journey driver: confirmed.** It holds only `grantAccess`, `collectRequests`, and
  the request filter (77 lines).

The remaining problems are all in the Part B implementation detail. Two of them would make the first
slice's finish condition wrong or impossible to meet as written.

## 2. Fidelity check

**Talk (review §2, spot-checked against the private transcript).** These all match:
- trust thesis [00:19]; "never set out to ship 2000 PRs" [04:21]; "I am the bottleneck" [04:46];
- verification means correctness, not performance or quality [12:39–13:06]; feature map plus CLI
  [10:13–11:42]; "critical" infrastructure [12:04];
- codebase as memory [15:41]; static-analysis layer [16:29–17:01]; spreads "like a virus"
  [21:03–21:23]; comment mechanism [23:00–23:48];
- delete debt → paved path → lint [25:17–26:21]; renderer boundary [27:55–28:35]; outer loop and "company
  brain" [32:37–33:36]; closing five-layer slide [36:09–37:03].

"Three levers ~07:15" rests on the slide cited in review §2.3, not on the spoken words. That is acceptable.

**pstack (checked at `ecc249f`).** These are faithful:
- Launch/Doctor/Drive/Evidence/Cleanup/Helpers, the evidence standard, and prove-once
  (`create-verification-skill/SKILL.md` §2–4);
- the four H2 headings of a feature file;
- `clean | changed | blocked`, never editing product code (guide 06, `maintain-verification-skill`);
- `PASS | PASS+NOTES | FAIL`, "CI green is not a verdict", patch-id freshness (`shipping.md` steps 1 and 3);
- "The instruction is the symptom" (encode-lessons); "the best spec is code" (README:241).

Two points drift, covered in F-6 and F-8.

**Class A–C evidence.**
- PR #69 "Admit direct OpenAI on the protected live path", #70 "Fix GLM live transport for workerd
  (redirect manual)", and #71 "accept direct OpenAI as a protected production observation system" were
  all merged on 2026-09-20.
- `6a27c51` (2026-08-23, empty body) touches only `tests/e2e/shared-config.ts`.
- `test:workers` is in neither `scripts/verify-offline.mjs` nor `ci.yml`.

The classification (A recurring, B twice, C held back) is sound. The counts and the guard design need the
corrections in F-4 and F-5.

**The "unconfirmed assumptions" the author asked about:**
- **Codex skill folder: resolved.** The Codex docs (developers.openai.com/codex/skills) say repository
  skills load from `.agents/skills` in every folder from the working directory up to the repo root, and
  that symlinked skill folders are followed.
- **Claude Code skill folder: still open.** From memory, Claude Code reads `.claude/skills/`, not
  `.agents/skills/`, so the symlink P-5 suggests would be needed. I did not re-check this against Claude
  Code's docs. pstack's own default is `.cursor/skills/verify-<app>/`, so Cursor would need the same
  treatment if it is in use. P-5's discovery check is the right test; keep it.
- **Answers-only recovery in synthetic mode: answerable now.** See F-2.

## 3. Findings

### Part B: fix before the first slice is built

**F-1 (High): Doctor's SHA check does not fit `next dev`.** `launch` records the SHA at start time, and
Doctor compares it with `git rev-parse HEAD`. But `next dev` hot-reloads, so it always serves whatever is
in the working tree. The launch SHA says nothing about the code being served. As a result, finish
condition (d), "doctor fails against a server launched from a different SHA", tests something that isn't
a defect. The real failure it should catch, a server started from a *different checkout or worktree*,
would pass the check.
*Change:*
- Doctor stamps the evidence with `HEAD` plus a dirty flag at **drive time**.
- The state file records the checkout's absolute root. Doctor fails when the process on the port was
  launched from another root, or when the tree is dirty and `--allow-dirty` was not passed.
- Rewrite (d) as: "doctor fails against a server launched from another worktree."
- Keep the SHA equality check only for `--pr`, where the preview is a fixed build.

**F-2 (High): the recovery question is already answered, and it conflicts with the evidence standard.**
`tests/e2e/new-intake-glm.spec.ts:273` reaches answers-only recovery only by answering
`/api/audit/report` with a fake 422 through `page.route().fulfill()`. So a user cannot reach it in
synthetic mode, and the only existing route is an internal fault injection, which §3's evidence standard
forbids.
*Change:* feature 5 declares a named, labelled drive, `drive report-and-recovery --inject
usefulness-failure`, reusing that exact route stub. Its evidence is marked `fault-injected (not
user-reachable in synthetic mode)`. The download sub-features stay on the real path. Delete the *Open*
note.

**F-3 (Medium): the journey steps are spread over three specs, not one.** Besides the steps written inline
in `smart-intake.spec.ts`, there are `enter()` in `new-intake-journey.spec.ts:29` and `track()` and
`toQuestions()` in `new-intake-glm.spec.ts:24,35`. A driver built from only one spec would leave two
parallel ways of doing the same steps, which is the pattern §5 warns against.
*Change:* the shared driver absorbs all three. Pin finish condition (e) to a number: all five specs matched
by `playwright.config.ts`, currently 28 `test(` blocks, still pass, along with the 3 in
`preview-disabled.spec.ts` (which runs under `playwright.config.disabled.ts`).

**F-4 (Medium): class B's guard misses one current gap and could cause a new bug.**
1. **Missed key.** `NUAVE_LOCAL_AUDIT_PACK_DIR` is read through a constant (`LOCAL_PACK_DIR_ENV`,
   `src/lib/audit/local-direct-ten-audit.ts:52`), and `offlineE2EServerEnv` does not set it either. A guard
   that only matches `process.env.NUAVE_*` would not see it. The guard must also match `"NUAVE_*"` string
   literals.
2. **Wrong count.** `NUAVE_GLM_EVIDENCE_DIR` has 2 code reads (`glm-local.ts:115,602`), not 3.
3. **Blanking has a side effect.** Setting a key to `""` really does block `.env.local`: `@next/env`
   `processEnv` only fills keys that are `undefined`. But `""` is not a neutral value for every reader.
   `glmEvidenceDir()` (`glm-local.ts:112–117`) uses `??`, so it would return `""`, which resolves to the
   current directory. The control must either make readers treat `""` as unset, or require the
   implementer to check each reader before blanking it.

**F-5 (Low): class A's literal count is too low, and the guard must ignore comments.**
- **Code literals:** `types.ts:281`, `questions-id-provider.ts:60`, `production-observation-method.ts:11`,
  `openai.ts:568,600`, `contracts.ts:1195–1196`, and the fixture `fixtures/report-golden.ts:169`. That is 8
  literals in 6 files, 7 outside the fixture, not "6 sites".
- **Comments:** the string also appears in comments in `contracts.ts`, `telemetry.ts`, `groq.ts`, and
  `gemini.ts`.

The guard should match string literals only, not comments. The draft should also say whether fixtures
count as test code or source.

### Part A: small edits before adoption

**F-6 (Low): §6 leaves out pstack's comparison against the base.** `shipping.md` step 1 has the verifier
exercise the real surface "against parent versus head", and autopilot adds a regression lane against
trunk. Add one clause: "drive the same feature on the base and on the head; if the base lacks the feature,
say so."

**F-7 (Low): the doc-only skip needs two fixes.**
- **Missing artifact.** Nuave's CI produces no "changed-file list". Use the PR's diff file list instead.
- **Behaviour-changing files.** Some Markdown and YAML files change what agents or CI do, so they are not
  doc-only:
  - `SKILL.md` and `features/*.md`;
  - `AGENTS.md` and `CLAUDE.md`;
  - `.github/workflows/*`.

  Exclude them from the skip. Otherwise a change to the verification skill itself would skip verification.

**F-8 (Low): §1 credits pstack with more than it says.** pstack's irreversible list is force-push, deleting
production data, and sending external messages. Its autopilot even lets the agent that owns a PR merge it
under a full-autonomy grant. "Merge, deploy, spend" is this guide's own (or Nuave's) choice. Tag that part
**[G]**.

**F-9 (Low, hypothesis): Cleanup may leave the port in use.** `npm run dev` records npm's process ID, and
`next dev` starts child processes of its own. Killing only the recorded ID may leave the port bound, which
would fail finish condition (c). Start the server as its own process group and stop the whole group. That
still kills only what this run started. Confirm during the prove-once run.

## 4. Things not to change

- The core's length and shape. The self-check (build or run, not believe) passes for §§2–8.
- The appendix triggers. They are concrete and match the brief's examples.
- Proposals P-1 to P-7 as written. P-6 and P-7 go beyond the brief but are correctly framed as
  proposals.
- Holding back class C after one occurrence. It applies the draft's own "reject the class" rule honestly.

## 5. Next step

Apply F-1 to F-8 in one revision (R2.1). No full rewrite is needed. After that the founder can decide on
P-1 to P-7. P-5 has to be decided first, because the `verify-nuave` slice cannot be placed until it is.
