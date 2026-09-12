**Repository hygiene execution handoff — 12 September 2026**

Use: issue the prompt below to the execution agent when ready to authorize the bounded work. Merely reading this file during a review is not authorization. This prompt replaces the operational recommendations in the earlier hygiene reviews; those reviews remain supporting evidence.

---

You are the execution agent for one bounded Nuave repository-maintenance task.

Repository: `/Users/yasir/nuave_v0.2`
Remote: `https://github.com/yasir-mukhtar/nuave_v0.2.git`

Objective: preserve all unfinished work, make continuing work visible on GitHub, protect public `main`, retire the explicitly listed historical branches without losing their history, and prepare one verified maintenance PR. Local checkouts should become reproducible mirrors and work areas. Do not turn this into product implementation or merge obsolete features to make branch counts smaller.

**Authorization and final approval boundary**

By issuing this prompt, I authorize the following within its named scope: local recovery copies; Git fetches; dedicated maintenance/preservation branches; commits and pushes of reviewed source/docs; creating and updating the necessary draft PRs and their factual handoff descriptions; the existing dummy-credential PR preview deployments; main protection and the other settings named below; new preservation tags; closing PR #21 and #30 after preservation; deleting the listed retired branch refs after the required checks; removing or moving fully preserved, inactive worktrees; and repository-local Git configuration. Public-repository publication must exclude private credentials and evidence. Existing explicitly approved archive moves are also in scope.

Do not ask again for these authorized operations. If an actual blocker arises, complete independent work first and ask only about the affected concrete action.

I am **not** authorizing any PR merge, push to main, production deployment, live/paid provider call, spending, secret rotation/deletion, change to repository visibility, product-provider decision, or broad rewrite of application code. Leave PR #47 parked. Leave PR #52 and the maintenance PR ready for a final founder merge/deployment decision. Do not enable auto-merge. A documentation-only merge currently also deploys production. Closing the named stale PRs may trigger their preview cleanup; that cleanup is authorized, not production deletion.

Do not amend or force-push existing shared commit history. An expected-SHA lease used solely for an authorized branch deletion is allowed and required to avoid deleting concurrent new work. Do not move or overwrite archive tags.

**Read in this order**

1. `AGENTS.md`, `README.md`, `docs/NOW.md`.
2. `docs/WORKFLOW.md` and this entire prompt, including the disposition list.
3. `docs/INDEX.md`, `specs/README.md`, `.github/workflows/ci.yml`, `.github/workflows/pr-preview.yml`, `package.json`, the three `playwright.config*.ts` files, `vitest.config.ts`, `vitest.config.mts`, `vitest.live-provider.config.ts`, and `scripts/verify-offline.mjs`.
4. For status reconciliation only: the Spec 007 execution/recovery ledger sections, the Spec 008 R5 gate ledger and verification record, the intake/G1 worktrees' current handoff and verification documents, and `Archive Candidates/README.md`.
5. Before any substantive repair to a candidate, read its approved spec and exact authority context. This prompt does not authorize new intake behavior, G1/G2 integration, model changes, or new product decisions. Escalate those to the existing product task.

Do not load historical planning or `archive/` contents in bulk. For the two named archive moves, inspect only the source/destination context necessary for those moves and their links. Keep raw evidence and credential contents out of model context and tool output. Use relevant Cloudflare skills before changing Cloudflare workflow behavior or invoking its CLI.

**Observed starting state — refresh; do not assume unchanged**

Remote main was `505ccd49ce857e8726bf85e796edf10f5738878c`, with passing CI/origin/deployment jobs at run `34663621711`. The live API listed 60 branches including main, four open PRs (#21, #30, #47, #52), no tags, main unprotected, automatic merged-branch deletion disabled. Public visibility is intentional. Issues are already enabled.

At 11:17 UTC on 12 September, five worktrees held 27 modified tracked files and 20 untracked entries, including two symlinks. This prompt itself adds a further draft; other tasks may also have changed files.

| Worktree | Branch / committed HEAD | Local work at that snapshot |
|---|---|---|
| `/Users/yasir/nuave_v0.2` | `codex/spec-007-approved-s2-repair` / `505ccd4` | 19 modified source/docs/tests, 10 untracked files before this prompt; S2 repair and handoffs |
| `/private/tmp/nuave-intake-complete` | `codex/complete-local-intake` / `7fcf500` | 3 modified docs and untracked `specs/008-recommendation-eligible-question-generation/G1_INTAKE_BOUNDARY_REVIEW.md` |
| `/private/tmp/nuave-spec008-g1` | `codex/spec008-g1-adapter` / `8ef15a4` | 5 modified files, +575/-60; adapter review fixes, tests, verification and decision log |
| `/private/tmp/nuave-spec008-g1-review` | Detached / `8ef15a4` | Independent review tests, copied reference source, symlinks |
| `/Users/yasir/nuave-glm-test` | `feat/cheaperinference-glm-5-3-flash` / `2dbd867` | Source clean; ignored local configuration exists |

Local `main` was four commits behind. `feat/spec-008-g1-facts-context` has two local-only commits, `c974ec481b852bf69738a5a7109fd24de8b13171` and `e9cd00c729f547c24cb5f97dd13ceb80e5da9b6c`; it contains a different G1 implementation and an unrelated preview commit. It is not equivalent to the pushed adapter. Both that branch and the root S2 branch incorrectly track `origin/main` for feature-sync purposes.

Stash `25088c66c75df87ae15328f05b539a298b26687d` contains seven files, +858/-229 **including its untracked third parent**. Earlier recovery inspection found 69 commits unreachable from current refs when reflogs are excluded, 17 tips, and two dropped stashes. Do not assume merged PR #35 makes this stash disposable.

The independent tests are `tests/spec008-independent-review.test.ts` and `tests/spec008-review-port.test.ts`. They check provenance/privacy and offline server configuration; they are not automatically throwaway. Some old assertions may have been superseded by a later recorded product decision. Preserve their originals and provenance; do not blindly add contradictory assertions to the permanent suite. The review `node_modules` symlink targets the implementation worktree.

**Execution sequence**

1. **Inventory and establish a verified recovery copy before mutation.**

   Record full SHAs, dirty/staged/untracked paths for every worktree, stash parents, local-only refs, relevant reflog/unreachable recovery candidates, current PR head/base/state, and remote settings. Do not fetch/prune away evidence before recording the existing local refs. If actual concurrent edits are detected, have that affected task paused before taking a destructive step; do not interrupt other agents or discard their work.

   Use a private recovery directory outside the repository and outside temporary storage, such as `/Users/yasir/nuave-recovery/2026-09-12/`, with restricted permissions. Save the common Git object store, refs/reflogs and worktree administrative metadata, plus each worktree's tracked modifications, staged changes, untracked source and review artifacts, preserving symlinks and file modes. Separately secure ignored credentials/configuration and irreplaceable private evidence without displaying their contents. Generated caches can be excluded once identified.

   Create a Git bundle as an additional portable copy, **not** the sole backup. A bundle alone omits working-tree files and may omit unreachable objects. Verify bundle integrity and practice restoration in a disposable location: recover a dirty source file, an untracked review file, the stash's untracked-parent file, and a recovery-only commit. Compare hashes. Before proceeding, confirm the source snapshot did not change during copying.

   Keep one concise operation log plus machine-readable ref/hash manifest inside the recovery directory. Include restoration instructions. This is recovery evidence for this bounded task, not a new product tracker. Do not upload this private recovery directory, Git object-store copy or bundle to the public repo. Other laptops remain unverified until individually inventoried; do not claim their private work is preserved.

2. **Protect main and create verified baseline references.**

   Fetch current remote refs after preserving the starting state. Create `codex/repo-hygiene-2026-09-12` from current `origin/main` in a separate persistent worktree. Never mix maintenance changes into the dirty S2 checkout.

   Require PRs and the GitHub Actions `validate` check on an up-to-date revision for main; block force pushes/deletion; require resolved conversations; apply protection to admins without a routine broad bypass. Preserve existing stronger rules if any have appeared. Do not require the main-push-only origin or deployment job as a PR check. Keep `verify-main-origin` in CI. Do not require a second human approver if none is eligible.

   Enable automatic head-branch deletion after merge and appropriate available public-repository secret scanning, push protection and Dependabot security updates, without purchasing services or enabling automatic dependency merges. Read settings back to verify enforcement. Report security alerts safely; do not rotate/delete secrets or upgrade dependencies as part of this task.

   Create annotated `baseline/2026-09-12-pre-hygiene` at the freshly verified current main, referencing its passing CI. If main's current checks are not green, wait/report rather than calling it known good. This is a recovery marker, not a release or a passed product-quality gate. If the tag already exists at the intended commit, reuse it; if different, preserve it and choose a new dated/suffixed name.

   Preserve source commit `955ae90` with annotated `archive/2026-09-12/intake-handoff-2026-09-05`. It contains the original approved handoff and workbench used by S2. Workbench SHA-256: `b7adc54fd2d83def25552e25961dd50eba7e63883a217861811e2f394f830a1c`. Verify remote tag target and object retrieval. Do not create a GitHub release.

3. **Preserve unfinished source and expose continuing work through PRs.**

   Treat `codex/complete-local-intake` as the continuing intake review candidate and `codex/spec008-g1-adapter` as the continuing G1 review candidate, consistent with their recorded handoffs. This is not permission to merge them or certify all product gates. Check the latest recorded decisions before describing their status.

   Review and commit each worktree's screened, coherent changes to its own branch. S2 is a separate preservation candidate; do not merge it into complete intake. Preserve the older local-only G1 commits independently; do not cherry-pick functional differences into the newer adapter during cleanup. Keep a short disposition note explaining their location and whether further product review is needed. Keep the competing hygiene drafts as historical review evidence; the maintenance PR should contain one concise current outcome/handoff, not several competing live plans.

   Verify source candidates offline before pushing as review-ready. Follow `npm run verify`; do not push known-failing changes just to use CI as a debugger. If a product failure prevents readiness, do not silently fix product behavior or claim it passed. I authorize a privacy-reviewed archival snapshot tag for preservation-only history, explicitly labelled incomplete/not for merge, without presenting it as an active verified implementation or creating a release. For the older local-only G1 chain, prefer `archive/2026-09-12/feat/spec-008-g1-facts-context` at its full tip, with both original commits recorded. Verify the new remote reference and retrieval before retiring its local branch. If privacy or incomplete review prevents publication, preserve the full snapshot privately, keep the affected branch/worktree, and report that remote preservation remains incomplete. Recovery copies permit other cleanup to continue safely.

   Create or reuse draft PRs for complete intake, G1 and the S2 preservation candidate, with precise tested SHA, purpose, remaining limitations and next action. Screen all new files before publication. Be explicit that S2 is preserved for review, and G1 remains dormant. The existing preview deployment with dummy provider credentials is authorized. Check that previews do not expose real provider credentials before triggering them.

   Review the two independent tests and copied source references. Retain original evidence in recovery storage and preserve the meaningful regression coverage/provenance on the owning branch where it agrees with approved behavior. Do not mark failing historical repro assertions as current passing tests. Preserve the new boundary-review document.

   Resolve the stash by comparing **all parents**, including untracked content, with chosen code. Drop it only when the exact original can be restored from the verified recovery copy and every useful difference is either preserved remotely or explicitly retained for follow-up. Use an isolated worktree for any inspection/application; never apply it into a dirty active checkout.

4. **Archive and retire the explicit historical set.**

   Use the full current SHA for every branch; compare its present state with the snapshot before mutation. If a listed branch has new commits, an active consumer, a new PR or a changed purpose, skip that branch and report it; do not infer that the new work is obsolete. Do not act on newly discovered, unlisted branches.

   The 16 exact-ancestor candidates below may be deleted after rechecking ancestry to current main, remote tip stability, and absence of an active worktree/PR dependency. Main preserves their history.

   For every listed unmerged retirement candidate, including **closed-PR branches**, first create an annotated remote tag `archive/2026-09-12/<original-branch-name>` at its full tip. Include original name, SHA and disposition in the annotation. Verify the peeled remote commit SHA and retrieve it from a fresh remote-only verification repository. Existing PR history alone is not the deletion condition. Never overwrite an existing archive tag.

   Close #21 and #30 after their tips are tagged and any newer activity is ruled out; give a short factual supersession explanation in the existing PR record. Preserve historical code rather than merging it. Leave #47 and #52 open. An already-closed PR does not need closing again.

   Delete refs in small reviewed batches with an expected-tip lease. For example, a deletion may use `git push --force-with-lease=refs/heads/<branch>:<expected-full-sha> origin :refs/heads/<branch>`; this is conditional ref deletion, not permission to rewrite history. Stop and refresh the affected branch if the lease fails. Record the exact result. Never use wildcard/mirror deletion, force a dirty worktree removal, run blanket `git clean`, or expire/prune recovery objects.

5. **Prepare one bounded maintenance PR.**

   Work only in `codex/repo-hygiene-2026-09-12`. Allowed maintenance scope:
   - `AGENTS.md`, `README.md`, `docs/NOW.md`, `docs/INDEX.md`, `specs/README.md`, existing Spec 007/008 status/verification ledgers and affected handoff links.
   - The two already-decided archive moves: `Archive Candidates/completed-plans/V2_SUBDOMAIN_LAUNCH_PLAN.md` to `archive/completed-plans/V2_SUBDOMAIN_LAUNCH_PLAN.md`, and `Archive Candidates/superseded-plans/DOMAIN_TRANSITION_PLAN.md` to `archive/superseded-plans/DOMAIN_TRANSITION_PLAN.md`; check destination collisions and repair references. Do not overwrite existing history. Other archive/root artifact decisions remain deferred unless already explicitly settled.
   - `vitest.config.ts`, `vitest.config.mts` and necessary test/script references to consolidate redundant default config without changing the offline include boundary. Keep `vitest.live-provider.config.ts` separate. Keep **all three** Playwright configs and the tests they invoke.
   - `.github/workflows/pr-preview.yml` and proportionate verification to ensure cleanup failures remain visible and the PR comment claims removal only after success/confirmed absence. Preserve dummy-provider isolation and the production-origin gate.
   - A concise final factual maintenance record under `docs/reviews/implementation/repo-hygiene-2026-09-12.md` with remote PR/tag links and the remaining next action. Keep private backup details and sensitive evidence out of Git.

   Fix factual drift: public/protected repo; actual current CI workflow and deployed SHA; UI migration already merged; Spec 007's old ledger versus shipped packages; Spec 008 G0 complete but later gates accurately qualified; chosen intake/G1 PRs and local versus remote verification. Do not turn an unmerged branch's implementation into a main-shipped claim. Distinguish founder acceptance, tested commit, merged code and deployed commit.

   Source files needed only as historical design authority should be routed precisely; do not relocate required `intake-prototype.html` simply because no code imports it. Preserve the 93 deliberately retained experiment files. Do not read unrelated archive material, broadly tidy application source, install another UI stack, modify providers/payments/report behavior, or implement new facts/projection decisions.

   Inspect the full diff; verify relevant links and unchanged offline test discovery; run `npm run verify`. Remove temporary diagnostic changes, not permanent protections. Commit, push and create/update the maintenance PR only once local validation passes; require current GitHub validation. Do not merge it.

6. **Make the local workspace reproducible and verify completion.**

   After recovery and publication checks, move continuing inactive worktrees under `/Users/yasir/nuave-worktrees/` using `git worktree move`; preserve or repair necessary symlinks. Keep any still-active or unresolved worktree until safely coordinated. Remove redundant worktrees only when all tracked, untracked and necessary ignored material has an explicit preserved disposition.

   Once the root S2 checkout is clean and preserved and nobody is editing it, switch the root checkout to local main and fast-forward it to origin/main; stop on unexpected divergence rather than resetting. Keep active feature work in its dedicated worktree.

   Apply **repository-local**, not global, configuration:
   `fetch.prune=true`, `pull.ff=only`, `pull.rebase=false`, `push.default=simple`, `push.autoSetupRemote=true`.
   Set every continuing branch's upstream to its same-name origin branch. Remove only disposed local refs and prune confirmed deleted tracking refs. Use `codex/` for new branches; do not mass-rename historical branches.

   In a fresh remote-only clone, verify main and continuing branches are available, every retired unmerged tip is retrievable through its archive tag, S2's original reference commit is retrievable, and another agent can identify authoritative docs, current PRs and next actions. An independent clone on this laptop verifies remote reproducibility; it does not prove preservation of uninspected work on other laptops.

   Record remaining stale workflow registrations and potential fixed-name preview resources. Disable only registrations proven obsolete and with no retained branch dependency. Do not delete Cloudflare workers, production resources or credentials just because a name looks old; direct resource cleanup beyond the named PR-close workflow is a separate approval. Do not create recurring automations.

**Explicit disposition list**

Exact-ancestor candidates (16; each row is branch name followed by its reviewed full SHA; recheck before deletion):

```text
design/hero-background-handoff-2026-09-05 e531ff4653c324007eb049bee93f2a3b922cf216
docs/spec-008-g0-baseline-reconcile 8f89e9fb0e2b1dd1659b8a2327ef0e391e4c8629
fix/bundled-beach-artwork b1c2105cb2a84c1425de057ab34ea8e94212ddcf
fix/exact-beach-artwork be90f815d0b7149531d429ea1b707c030fd79393
fix/landing-hero-mobile-spacing 18936b9d0faed8b0dc826797f587aee85c828bfd
fix/opencodego-session-header ce979e14e7c5b1bd786aebdca0e855af81eb5282
fix/staged-responsive-hero c2f1ffb483ac16539f8b5354c1e94e830ac4eccb
fix/wave1-identity-pack-2026-08-23 80353d655252f61bf672f9c6335e282a064a8161
fix/wave2-intake-facts-2026-08-23 b842afdadf1757e79d073931203da8ecaf69b9f6
fix/wave2-public-truth-a11y-2026-08-23 00c435dc313877499d45f93681503f68006bb2c7
fix/wave2-report-error-ui-2026-08-23 4558f60e30537d5e3cc02e2a57eb5aa300b0bb7d
fix/wave2-test-ci-isolation-2026-08-23 4e561de1dec6d6b87d44710f540c3a732f2cef61
noop-check 2d79fca8fa53291609969337d005b947b3c412b5
scratch/pr20-prettier-certification db36834475e6c495524976da6b8ea5dcc29f1c1c
style/audit-heading-gelasio-metrics d00b7ed7834089f522f4105cca09c00886ca79c4
ui/audit-url-intake-refresh 1312a01730a7294cd3fc427fe420725f5e30a05c
```

Historical candidates (39; each row is branch name followed by its reviewed full SHA; tag verified tip before deleting, including closed PRs and the two PRs authorized for closure):

```text
agent-b-spec003-method-integrity 13ffa1847f0ef003e1134e40e619cba5b949612f
agent-c-restore-question-provider-tests 4f79a8dfdc11df4a10f60984b577ad38d313e9d4
agent-d-spec003-retire-sozo-live-tools e79f9fc5df7e857ab9505b3be49083473acd70f5
archive/pr9-pre-cleanup-20260822 023680e57291c8fbbf20b275d907c2bcbd013ee9
archive/pr10-pre-pr9-sync-20260822 0fee22261a8760795ef6ec53299f7266ac332aa7
claude/adversarial-plan-review-nsz2td 064f682679d0487349fd25e90429bdb81c3311ab
claude/nuave-design-review-i7r5sz 97b2498785984d6d5d6b25d51e7be5fe5917762d
claude/nuave-intake-recovery-plan-tlv905 676f09e3af5b73b3fb3786f622c257983050a276
claude/screen-design-critique-6e0zxl 5c31ac98f55f0bce30c7cfa4ac42bef117030b38
design/airbnb-intake-prototype 3166fd798f77742ff928142f56fcbabbeb0b5d82
design/intake-brief-concept 78c3b068f7064d537684d8941d3e452db5e4f602
docs/ai-handoff-20260822 cdf5505029f36c127467eda7bd057adad6d233ea
docs/airbnb-intake-clean-rebuild-plan 483d6348c91a059733fec14977787400b9933915
docs/spec-007-orchestrator-handover 2baa7673eeee87ad0530954079da99e38a529d60
feat/airbnb-intake-rebuild afd518dd75d436319c7a5f1c31db9d640e2728d3
feat/progressive-business-facts 8ac58e687b841a87bd1dea6f209e8f3722dc6c74
fix/audit-budget-handoff-flash 6cc17c6284e15ea78c6af8e35842bd16242a6f94
fix/beach-hero-cta-background e95b212cd1940b62a0d6bd0c45ba11347c52cb17
fix/localize-hero-sky 417568198cea2072d4fcee65fdb4b46f9fe2b55b
fix/source-hero-prettier 5a0e035533d446a3cd2ba72ec971b482fd204f3d
fix/spec-003-live-audit-reliability 8edd556f48ef1462afe8401f2ecebade9f80cc3f
fix/wave1-protected-attempt-2026-08-23 2ca952c55119d297b03a42c58dcdd85cce87f65e
fix/wave1-workflow-lifecycle-2026-08-23 2f673b243136f3b78838d065ec42449f143d1665
refactor/typography-system 7a5b22ad4bd756dc051b69c4a467ad62352347b5
review/overnight-a-audit-input aee7317a5f0156e6aac7329e75afb0ef023b2435
review/overnight-b-audit-core bbc30effc5aa88352cee085a0dcaaa4e85d26826
review/overnight-c-product-ui 588b1bf2987edb8c0e2ccc46b645161205444b70
review/overnight-d-infra-tests c66b6809880143bc8fb444fb98bec8e991a02581
review/overnight-final-synthesis d96531a607ccd66f085bf8298cd6ac42a5931318
review/overnight-repo-2026-08-22 20f6ab948837ae7adedbf28a2a5c516ce59121b8
review/pilot-audit-run-parallel 53fb43ae2166d85190b458ac77b78a0cc156d117
review/pilot-report-variance-parallel b604d1c1b1a1f602b65cb99e365f424a4b787b96
review/wave3-browser-release-validator-2026-08-25 93946f7968c77527cdba60e8fa57e6b561476251
review/wave3-contract-validator-2026-08-25 498741f0f6ffc782ed8d6ff43ddec9162237d438
review/wave3-final-verdict-2026-08-25 0e47b998efcb288010f7e3b76f06ff34e6651d06
review/wave3-targeted-rereview-2026-08-25 79e82422b696f45c801879e01d6ec60ca2a5850c
spec-003-finish-live-quality-gate a0fae0b5dd3ff4200f02be2dac0b11adfb4bc80b
style/refero-apple-foundations 9626fe09ce71f30f1faf1fa7069d048ae2040a0d
style/source-hero-white-focus-logo 895f95ad0bdafd2011e382408ef3c9392c93f3c3
```

The list above accounts for 55 potential retirements; the five retained names below complete the reviewed set of 60. Match full SHAs to the current API before mutation; if any differs, skip that branch and review the new work. Counts are an audit check, not a deletion target. Keep `main`, `codex/complete-local-intake`, `codex/spec008-g1-adapter`, `docs/spec-008-live-check-resolved`, and `feat/cheaperinference-glm-5-3-flash`. Also preserve newly published S2/older-G1 branches and the maintenance branch until their own disposition is explicit. Do not impose an arbitrary five-branch limit.

**Acceptance and final report**

Complete all authorized work that can proceed safely. Report exceptions precisely; do not claim the entire remote is settled while maintenance changes remain unmerged.

Return:
1. Protection/settings actually enabled, with readback evidence.
2. Recovery location and restore checks, without private contents; original and final worktree/ref counts.
3. New or updated PR links, exact tested SHAs, local `npm run verify` and current CI results.
4. Exact branch deletions and their surviving main ancestry/archive tags; skipped branches and reasons.
5. Files changed in the maintenance PR and any candidate preservation commits; no hidden product changes.
6. Proof from the fresh clone that remote work and retired history are retrievable.
7. Remaining product choices, unavailable other-laptop inventory or resource follow-ups.
8. One final, concrete request identifying which ready PRs may be merged and warning that these merges deploy production. Recommend PR #52 and the maintenance PR only when actually ready; do not bundle unreviewed intake/G1/GLM merges into that request.

Do not stop at another plan or generic advice. Execute the issued scope, preserve evidence, validate it, and finish at that specific production-approval boundary.
