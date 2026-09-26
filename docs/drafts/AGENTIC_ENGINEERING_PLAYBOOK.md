# Agentic Engineering Playbook

> Revision: **0.1 / R1** · 2026-09-26
> Status: **In review — not adopted**
> Purpose: A portable playbook for establishing and improving evidence-driven AI engineering in existing and new projects.
> Publication of this draft does not change its host repository's workflow, grant execution permissions, or certify an implementation.

## 0. Read first

**Build an environment in which correct work is the easiest path, known mistakes fail early, and a separate verifier proves the behavior before the change lands.**

This is a bootstrap and improvement playbook, not a substitute for architecture, tests, tools, or judgment. Its success is measured by the controls it materializes, not by how many agents promise to follow it. A new session should need a short project entry point, the relevant feature map, and the relevant skill—not this entire document and its history.

Use it in one of two modes:

- **Existing project:** inspect the actual system; preserve effective controls; close the most consequential gaps through small, approved changes.
- **New project:** establish a minimal safe scaffold; build one runnable slice and its verification together; add stronger controls as real surfaces and risks appear.

Neither mode authorizes a rewrite, new infrastructure spending, production access, or automatic merging. The project's existing authority and permission boundaries remain in force until its owner explicitly adopts a bounded change. Resolve conflicts rather than silently replacing local rules.

### Basis and limits

This playbook synthesizes three supplied inputs: the operating thesis pasted in the originating conversation; GPT-5.6 Sol's structured extraction of Lauren's talk; and the subsequent discussion about a portable meta-playbook. The original [video link](https://x.com/poteto/status/2102050467505430555) is a provenance pointer. The author of this draft has **not independently verified the recording or its transcript**. Do not attribute every prescription here to Lauren or treat the earlier extraction as a verbatim primary source.

**Source-inspired core:** trust before throughput; a kitchen/environment designed for capable workers; product knowledge in feature maps; real-system control and empirical verification; engineering playbooks; the five enforcement layers; codebase as memory; gardening; and outer-loop automation after a trustworthy inner loop. Independent per-PR verification and bottom-up landing are also explicit in the supplied operating thesis.

**Design additions in this draft:** adoption stages, project binding, permissions, evidence records, blocked-state handling, secure verdict publication, conservative freshness rules, and acceptance tests for the workflow itself. These are proposals for review, not claims about the speaker's exact implementation. Technical references are collected in section 13.

### Reading routes

| Reader | Start with |
|---|---|
| Adopting orchestrator | Sections 1–3, then assess the remaining requirements against the repository |
| Implementer after adoption | The project's short workflow, assigned scope, surface map, and selected skill |
| Independent verifier | Sections 5–8 and the project's bound verification procedure |
| Maintainer/gardener | Sections 2, 9, and 10 |
| Reviewer of this draft | Appendix B, checking the whole document for contradictions |

## 1. Operating model and invariants

Trust means **bounded confidence supported by observable evidence**, not certainty that all behavior is correct. Automated checks reject specified error classes; they do not prove the absence of every defect. Model agreement is not independent empirical evidence.

The working loop is:

```text
approved outcome and scope
  -> small implementation
  -> writer self-check
  -> independent verification of the exact candidate
  -> fresh, authorized landing
  -> correction promoted into a durable control
```

The following invariants use **must** for adoption requirements. **Should** means a default whose deviation needs a concrete reason. Optional mechanisms are identified explicitly.

| ID | Invariant |
|---|---|
| I-01 | The writer must not issue the independent certification of its own patch. |
| I-02 | Every required behavioral claim must have an appropriate observable check; a build or approving bot alone is insufficient. |
| I-03 | Verification must identify the exact candidate, comparison base, environment, and evidence. Stale or mismatched evidence must not authorize landing. |
| I-04 | Missing capability or required evidence must remain a visible block, not become an inferred pass. |
| I-05 | Repeated failure classes must move toward stronger, proportionate enforcement, rather than accumulating warnings in chat. |
| I-06 | Each concern must have a nominated supported path. Alternate implementations must not silently become competing defaults. |
| I-07 | Only an authorized actor may merge or release, and only within the approved scope. Passing verification does not grant permission. |
| I-08 | Work must preserve unrelated changes, user data, evidence integrity, and the ability to recover. |
| I-09 | Parallelism must not exceed the system's ability to independently verify and safely integrate the resulting work. |

### Responsibilities, not a mandatory organization chart

The **owner** decides product intent, acceptable risk, spending, and publication authority. The **orchestrator** defines bounded work, selects context and verification, and manages dependencies. The **writer** implements and self-checks. The **verifier** independently tests the candidate and reports findings. The **lander** checks freshness, permissions, and integration before merging. The **gardener** removes misleading patterns and promotes lessons.

One person or service may coordinate several roles. Writer and verifier must remain separate execution sessions for a given candidate; a different model is optional. The writer must not control the certification/merge credentials in an automatically enforced setup. A reviewer that supplies a corrective production patch becomes a contributor to that patch: another independent verifier must certify the revised candidate. Reviewer-only probes kept outside the product patch do not make the verifier its author.

## 2. Encode knowledge at the strongest appropriate layer

This is an **enforcement priority**, not a demand to finish all architectural work before writing a test.

| Priority | Layer | What to encode |
|---|---|---|
| 1 | Architecture, types, data structures, module boundaries | Ownership, valid states, permitted dependencies, one supported execution path |
| 2 | Compiler, static analysis, tests, CI | Mechanically detectable violations and reproducible regressions |
| 3 | Rules and review/bug bots | Useful checks not yet reliable or economical as hard failures |
| 4 | Versioned skills and playbooks | Investigation, operation, evidence collection, and engineering methods |
| 5 | Style guidance and human review | Irreducible product judgment and genuinely exceptional decisions |

### Architecture: make the supported path obvious

Keep examples short, current, and safe to copy. Collocate behavior where it clarifies ownership. Expose explicit contracts between features, server/client boundaries, and external services. Prefer shared constructors and validated state transitions over repeated checks and casts at call sites.

Remove unused competing paths after checking callers and compatibility obligations. When a migration must coexist with an older implementation, isolate it behind a named boundary, prevent new callers, and specify an owner and removal condition. Do not delete retained customer records or audit evidence to satisfy a cleanliness goal. Multiple provider adapters behind one supported interface are not automatically multiple architectures.

Treat repeated escape hatches, unchecked casts, and duplicated workarounds as investigation signals—not proof that a rewrite is necessary. Keep the repair proportionate. Do not universally ban comments, `useEffect`, abstractions, or a particular library because one source project did; target demonstrated harmful patterns. Comments that explain a real invariant or external constraint can remain useful.

### Static controls: reject the class, not just the reported instance

When a rule is objective, implement it in the existing check system where practical. Examples include forbidden runtime imports, server-only dependencies in client code, an invalid lockfile shape, or bypasses of a common validation boundary. Types/static rules belong here; runtime and integration regressions are equally legitimate hard controls when behavior cannot be checked statically.

Every new guard needs a known-bad case that fails and a valid case that passes. Confirm CI actually invokes it with failure propagated. Start with the highest-risk boundaries, not a repository-wide tooling migration. Where legacy violations cannot be fixed safely now, use an explicit baseline that prevents new violations and has a removal owner. Blanket ignores, unlimited suppressions, and a warning nobody acts on are not equivalent to enforcement.

## 3. Adoption: materialize, do not merely document

### 3.1 Bind the portable playbook to the project

Use an existing workflow document if possible. Create a new binding only when no suitable canonical location exists. A binding records concrete answers to the following—not a second product specification:

| Binding | Required project decision |
|---|---|
| Authority | Canonical product/spec sources; workflow owner; approved playbook revision |
| Scope | Active surfaces, protected data/contracts, permitted changes, adoption target |
| Work routing | Task/PR location, branch/worktree practice, context entry point |
| Commands | Exact setup, fast checks, full gate, surface verification, and cleanup commands |
| Environment | Toolchain, fixtures, services, isolation, runnable URL/binary, revision identity |
| Independence | How a separate verifier is started; what it can read, execute, and publish |
| Evidence | Required artifacts, access, redaction, retention, and a machine-readable record format if automated |
| Landing | Trunk, gate names, trusted publisher, freshness check, authorized merger, release policy |
| Limits | Spend/call/iteration/concurrency limits, stop conditions, exception authority |
| Maintenance | Owners and triggers for refreshing maps, skills, rules, and this binding |

Mark unresolved values **unknown**; never invent a command, integration, permission, or installed capability. Map existing files to these responsibilities before creating new ones. `AGENTS.md` should route to the binding and task-specific skills, not duplicate them. Tool-specific instruction files should point to the same authority where supported.

### 3.2 Existing project: assess before changing

Inspect current code, scripts, workflows, applicable protection settings, representative recent PRs, and accessible evidence—not just plans or historical summaries. Distinguish **declared**, **implemented**, **exercised**, and **enforced**. An inaccessible setting is unverified, not absent. Do not rerun costly or sensitive work merely to complete an inventory.

Produce one compact assessment in the project's normal task location:

```text
control / current evidence and revision / maturity
failure or exposure / proposed hardest appropriate layer
KEEP | IMPROVE | ADD | DEFER | NOT APPLICABLE
smallest change / acceptance test / dependency / owner
```

Prioritize by harm, recurrence, exposure, and verification cost. Preserve working conventions. Obtain approval for the bounded adoption plan; then implement its controls through the existing approved workflow until the new one is independently demonstrated and adopted. Do not use a proposed gate to certify its own installation.

Pilot one representative change. Add the smallest missing capability that closes its trust loop. Evaluate broader rollout only after the pilot passes section 10. A weak workflow does not justify pausing all useful product work for an engineering-platform rebuild.

### 3.3 New project: bootstrap progressively

Before substantive product implementation, establish a short authority/scope record, one directory/module convention, repeatable setup, available language/static checks, a canonical verification entry point, safe test credentials/fixtures, and explicit writer/verifier/merge responsibilities.

For an empty repository, the owner may authorize a minimal seed commit that creates these foundations. Record that bootstrap exception; it is not evidence of an already enforced PR process. The first runnable slice must add real surface verification, a small feature map, and an independently exercised handoff before it is treated as verified product work.

Do not fabricate checks for nonexistent surfaces. A placeholder verification command that always succeeds is not a gate. Where no independent runner is available, continue authorized prototyping but keep it explicitly uncertified and unshipped under this workflow. A separate approved prototype policy must not be relabeled as verified delivery.

### 3.4 Assess maturity per dimension

Assess architecture, automated checks, product memory, runnable control, independent proof, and landing separately. Do not average away a missing critical gate or assign an unsupported percentage.

| Level | Evidence required |
|---|---|
| L0 — Prompt-driven | Behavior depends on individual sessions and manual reconstruction |
| L1 — Documented | Current authority and procedures are discoverable |
| L2 — Guarded | Applicable machine checks run, and known-bad inputs demonstrate rejection |
| L3 — Empirically verifiable | A fresh agent can operate a real surface and retain evidence |
| L4 — Independently certified | A separate verifier produces fresh evidence and landing enforces its verdict |
| L5 — Safely parallelizable | Isolated units integrate with dependency-aware verification and bounded concurrency |
| L6 — Autonomous intake | Authorized external signals feed a reliable, bounded verify-and-land loop |

Target L2 for the initial scaffold and L3 as a surface becomes runnable. L4 is required before calling the workflow independently certified or allowing unattended landing. L5/L6 are optional investments, not completion requirements for a small project.

## 4. Durable product memory and executable skills

### 4.1 Feature maps: how to reach and test a surface

Maintain one compact map per meaningful surface, with its verification procedure or beside its feature. A map should record:

```text
Surface and owning code / contract
Entry route or binary; prerequisites and safe fixture/reset path
Primary interactions and observable state transitions
Stable accessible names/selectors, shortcuts, or CLI arguments
Failure/recovery states and forbidden side effects
Relevant tests, control commands, and evidence oracle
Known traps and honest environment limits
Owner; last verified revision; linked verification skill
```

Prefer semantic interaction handles where practical. Do not turn incidental DOM nesting into the product contract. A code map alone is insufficient: the next agent must be able to reach, operate, and recognize the behavior. Link to the owning specification rather than copying its requirements. Update affected map entries with the behavior change; remove superseded instructions.

### 4.2 Verification skills: reusable instruments

A skill must name prerequisites, supported environments, exact commands or tool interfaces, fixtures/reset, scenarios, expected observations, required artifacts, cleanup, and failure escalation. It must distinguish passing assertions from human/agent visual inspection. Test it in a fresh session without private chat history.

Use stable, versioned helper commands instead of repeatedly inventing scratch automation. Reuse existing test helpers without requiring the verifier to trust the writer's conclusions. Promote a scratch probe when it covers a durable regression; not every diagnostic script belongs in the product tree.

Verification skills ask **whether the behavior works**. Engineering playbooks teach **how to solve it properly**: reproduce, investigate, consider alternatives, repair the cause, prove the result, and ship within authority. Keep them distinct but connected. One general bug-fix playbook and one relevant surface skill are a sufficient starting point.

### 4.3 Keep context small and authoritative

The daily entry point should identify current intent, active contracts, nominated patterns, exact checks, and permission limits. Do not load every past review by default. Keep the present state separate from historical decisions. Prefer a link to live PR status over duplicating its transient details in several documents.

Garden instructions as well as code. Maintain one canonical procedure, preserve meaningful decision evidence, and remove duplicated warnings after their replacement control is working. Version adopted playbook changes; downstream projects review an upgrade rather than silently inheriting new policy.

## 5. Default execution protocol

### 5.1 Plan a verifiable unit

Define one outcome, scope/non-scope, acceptance criteria, comparison base, change type, risk, and required oracle before implementation. An **oracle** is the observation or criterion used to judge correctness. Record who verifies, which environment is available, and the permitted budget/actions.

If the architecture is unclear, conduct a bounded investigation and compare plausible designs before implementation. Prefer a small interface/type sketch when it resolves the ambiguity. Do not force an architect phase on a trivial correction.

Prefer roughly tens to a few hundred changed lines when that produces a coherent unit, but never optimize for a line quota. Distinguish production, tests, generated files, and documentation. Split independent behavioral claims; keep changes together when separation would create an unsafe intermediate state. Record the reason for an unusually large unit.

### 5.2 Implement and self-check

Use an isolated branch/worktree and preserve unrelated work. Reproduce a bug before changing its cause when feasible; add a lasting regression. Follow the supported path. Do not weaken a test, swallow an error, or add a bypass merely to turn the gate green.

Run applicable fast checks while iterating and the bound full gate before handoff. Collect writer evidence, inspect the entire patch, and remove accidental diagnostics and credentials. Commit a reproducible candidate under project permissions. If committing is not authorized, a complete immutable patch plus file manifest can support review, but must be reconciled to the eventual published commit before landing.

When reproduction is impossible, explain exactly what was attempted and what is unobserved. A plausible cause is not an observed cause. Do not claim the bug is reproduced because a newly written unit test models the writer's hypothesis.

### 5.3 Independently verify

Start a genuinely separate session/process with access to the same approved intent, candidate, relevant maps/skills, and necessary environment. Read the diff and writer report as inputs—not authority. Independently execute the required scenario and relevant regressions. Add reviewer-selected probes for plausible failure paths; a second agent rerunning only the writer's assertions may share the same blind spot.

The verifier must not edit the candidate while certifying it. Return a bounded fix list to the writer. Record candidate identity before and after execution to detect mutation. Missing tooling leads to a blocked verdict or a handoff to a capable verifier, never a simulated second personality in the writer's session.

### 5.4 Resolve and land

The writer addresses findings. Changed candidates return to verification; the verifier may reuse unaffected evidence only through section 7's freshness procedure. Land only after required CI, independent verdict, freshness, dependency readiness, and authorization all hold. Release is separate unless the project explicitly couples merge and deployment; where coupled, merge permission must cover that release.

After a release, perform its authorized smoke check and use the documented rollback/containment path on failure. A successful deployment job alone does not establish healthy production behavior. Never erase failed evidence to make the delivery record look clean.

## 6. Verification contract

### 6.1 Use the oracle appropriate to the claim

| Change | Minimum appropriate evidence, selected by risk and scope |
|---|---|
| Bug fix | Same scenario against base and candidate; observed failure then success; durable regression |
| New behavior | Base behavior/absence characterized; candidate acceptance path and relevant failure/recovery paths |
| UI / interaction | Actual browser interaction, relevant screenshots, console/network observations, and required keyboard/reflow checks |
| CLI / API / background work | Actual binary or running service; input/output, exit/status, and relevant state/side-effect assertions |
| Report / export / visual parity | Rendered output and content checks; inspect affected pages/states; all pages where pagination can change |
| Performance | Comparable base/candidate workloads, environment and repetition policy; traces/profiles and variability, not one unexplained timing |
| Refactor / architecture | Behavior parity plus boundary checks, caller/contract coverage, and proof the retired path cannot gain new callers |
| Prompt / model-dependent behavior | Deterministic contract tests plus explicitly scoped evaluation on retained or authorized live cases; report sample limits |
| Documentation / workflow | Source/authority consistency, links/examples, scenario walkthroughs; execute commands or control probes when operational behavior changes |

Select only relevant checks, but do not classify a change as documentation-only when it changes executable workflows, prompts used at runtime, permissions, or release behavior. For a feature absent in the base, do not fabricate a failing preexisting test. For protected historical/live inputs, use an authorized safe comparison or record the missing evidence.

A real surface may be a locally running product or an isolated deployment of the candidate. A separate demonstration mockup is not the same surface. Synthetic provider responses can prove application behavior but not live provider quality, billing, production configuration, or business usefulness. Record what is substituted. Public-provider calls require their own authority and budget.

Verify a preview's deployed revision; a mutable URL alone is insufficient. Browser-side request interception alone does not establish absence of server-side egress. Bound credentials and outbound access at the relevant execution layers and record the controls used. Use retained inputs for comparable evaluations where safe; nondeterministic output requires an appropriate sample and qualified conclusions, not exact-output expectations by default.

### 6.2 Claims carry evidence and scope

Use these labels for material technical claims in a handoff:

- **MEASURED:** directly observed by the reporting actor, with artifact/command and environment in the same statement.
- **INFERRED:** derived from identified evidence; state the reasoning boundary and attribution, including another actor's reported result.
- **GUESS:** an untested explanation or prediction; it cannot satisfy a required criterion.

Example: `MEASURED — two rapid retry clicks produced one report request in synthetic preview <revision>; trace <artifact>. Live billing was not tested.`

A source file demonstrates what it contains, not that its runtime behavior was exercised. A screenshot demonstrates a state, not necessarily the path or absence of hidden side effects. Do not hand the owner a check the agent can safely run within its actual permissions; do hand over genuine product judgments, unavailable capabilities, and unauthorized actions.

### 6.3 One bounded verdict

Use exactly one technical verdict: **PASS | PASS+NOTES | FAIL**.

- **PASS:** all required checks for the stated scope passed with adequate evidence.
- **PASS+NOTES:** all required checks passed; only nonblocking limitations or improvements remain.
- **FAIL:** a required check failed or required evidence is unavailable.

Record execution separately as `complete`, `blocked`, or `not-run`. Thus `FAIL / blocked / browser unavailable` does not falsely claim a product defect. `PASS+NOTES` must not conceal an unmet criterion, stale evidence, missing independence, or an unauthorized test. An owner may explicitly revise scope or accept an exception through the project's policy; preserve the original failure and identify the resulting scope/exception. Never relabel untested behavior as measured.

Use the existing evidence format where possible. For automated gating, bind a strict machine-readable format with equivalent fields:

```yaml
record_version: 1
verdict: FAIL
execution: blocked
reason: required evidence not collected
unit: <task or PR>
scope_and_criteria: <approved reference and revision>
review_base_sha: <exact comparison base>
candidate_head_sha: <exact candidate commit>
candidate_tree_oid: <candidate tree identity>
integration_target_sha: <trunk revision considered>
patch_id: <value and mode, or explicit not-applicable reason>
writer_run_id: <execution identity>
verifier_run_id: <separate execution identity>
verification_procedure_ref: <trusted procedure revision>
environment_and_fixtures: <versions, modes, substitutions, input identity>
criteria_results: <per-criterion pass/fail/not-run and evidence>
evidence_manifest: <durable authorized location and integrity digest>
limitations: <bounded conclusions and unresolved findings>
recorded_at: <timestamp>
```

This is a field contract, not a claim that a validator already exists. Bootstrap with no parent uses an explicit empty-tree comparison, not an invented base commit. Retain meaningful command outcomes, traces, screenshots, logs, and input identities as appropriate. Redact before publication; private customer/provider evidence stays in approved restricted storage. Reviewers need access through landing, and release-relevant evidence needs the project's stated retention period. Local temporary paths alone are not durable evidence for another machine.

## 7. Freshness and trusted landing

### 7.1 Evidence belongs to a candidate, not a branch name

Record the comparison base, candidate head/tree, integration target, approved criteria, verification procedure, environment, and fixtures. A stacked PR's comparison base is the exact lower dependency head, not an ambiguous moving branch. For a standalone PR, use the recorded base from which its isolated change is reviewed.

Retain the base-to-head diff and its generation method; include binary changes where applicable. Compute `git patch-id --stable` as a **supplementary similarity signal**. Git documents that this mode ignores whitespace, so equal patch IDs do not prove equivalent behavior. They also do not establish equivalent surrounding code or environment. Never use patch ID alone as a certificate. See reference T1.

**Conservative default:** any new head, changed review base, or changed relevant test environment invalidates the old landing authorization until a verifier reconciles it. A changed integration target requires a fresh integration assessment even if the patch appears identical.

| Event | Required action |
|---|---|
| Candidate behavior, tests, dependencies, or relevant controls change | Re-verify affected criteria and regressions; issue a new record |
| Rebase or trunk/dependency moves | Review changed surroundings; test integration against the new target; record new identities |
| Claimed documentation/metadata-only change | A separate verifier confirms exact impact, runs applicable checks, and explicitly reissues/reaffirms for the new head |
| Fixture, model, config, or environment changes | Reassess which evidence remains valid; rerun the dependent checks |
| Missing or wrong-revision artifacts | Keep blocked until adequate matching evidence is available |

Reuse can avoid expensive repetition, but it must name what was reused, why it still applies, and what was newly checked. “Same commit message,” “only whitespace,” and an old green check are insufficient. Store final verdicts outside the candidate tree, such as an immutable run artifact referenced from a PR comment, to avoid endlessly changing HEAD by committing its own certificate.

### 7.2 Enforce the verdict, not a comment containing PASS

The automated target is: a trusted publisher validates verifier identity, separate execution, exact scope/refs, required results, and accessible evidence; it publishes a required check for that candidate. A lander independently checks current target/freshness and authorization immediately before landing.

A writer-authored JSON file or spoofable comment is not independent proof. The protected procedure and gate evaluator must come from a trusted version, not solely from the patch they judge. Changes to those controls require separate trusted review. Record the actual trust limit: two sessions sharing unrestricted credentials are a useful procedural separation, not strong permission isolation.

For GitHub, validate the repository's actual protection capabilities and bypass policy. Required checks can be restricted to an expected GitHub App, and native review rules can dismiss stale approvals; neither independently establishes empirical verification. GitHub accepts some skipped/neutral check conclusions, so the verdict evaluator must explicitly fail when mandatory evidence is absent rather than skipping its own decision. See reference T2.

Keep execution of candidate code away from certification and merge credentials. Treat source, task text, application content, and uploaded artifacts as untrusted data, not instructions that can override the verifier's authority. Privileged automation must not execute an untrusted PR with repository secrets; GitHub's security guidance describes this risk across multiple workflow triggers. See reference T3.

A publisher alone cannot make a stale result on the same HEAD safe after trunk moves. Bind target identity and reevaluate on target changes; use the platform's supported up-to-date/queue controls where available. Serialize authorized landing and perform a final fresh check. If the platform cannot close the race or protect the trusted gate, state the limitation and retain a controlled human-operated landing path. Do not claim hard enforcement from a convention alone.

### 7.3 Capability and budget fallback

| Available setup | Honest operating mode |
|---|---|
| Separate capable verifier plus protected gate/publisher | Independently certified, mechanically gated delivery after the controls are exercised |
| Separate capable verifier; no protected automatic publisher | Independent evidence with a manual landing gate; no unattended merge claim |
| Only the writer can run the product | Self-check complete; independent verification blocked |
| Reviewer can read code but cannot run the required surface | Code review complete; empirical certification blocked |

A manual mode should present a compact evidence-backed decision, not ask the human to repeat runnable tests. Keep genuine product approval and spending decisions with the owner. Use the existing local runner, fixtures, and subscriptions before proposing new services. No paid CI tier, bot, cloud agent, or multi-model subscription is universally required.

## 8. Work units, stacks, and parallelism

Start with single-PR delivery. Use stacks only when dependent work gains a real advantage. Use separate writers on independent slices only after defining ownership, integration seams, and verifier capacity. Do not run concurrent agents in an uncoordinated shared dirty tree.

For a stack, give **each PR its own independent verifier execution and verdict**, against its immediate recorded base. One broad stack review cannot substitute for those verdicts. Then:

1. Walk from the lowest unmerged PR upward. Only a contiguous run of fresh `PASS` or `PASS+NOTES` verdicts is eligible; stop at the first missing/failed verdict.
2. Prepare **only the bottom PR** against current trunk. Rebase/retarget as appropriate, recompute identities and patch ID, and apply section 7 before landing.
3. Recheck required CI, the independent verdict, scope, target, and authorization. Squash-merge one PR when that is the project's approved strategy; otherwise use its bound equivalent without changing policy opportunistically.
4. Confirm the actual merge result. Recompute the new bottom, reconcile its new base, and repeat. Do not mass-retarget the remaining stack or carry an old verdict across conflict resolution.

A verified upper PR is not landable above an unverified dependency. `autoMergeRequest`, an enabled auto-merge toggle, or being in a queue is not evidence of stack readiness. Integration checks complement rather than replace per-PR proof.

## 9. Correction promotion and gardening

After each meaningful human or agent correction, ask **what made this failure possible and what will detect or prevent its recurrence?**

| Failure class | Preferred durable response |
|---|---|
| Illegal dependency, competing path, invalid state | Reshape the boundary/state; remove or isolate the alternative |
| Reproducible behavior defect | Regression at the appropriate unit/integration/surface layer |
| Repeated mechanically detectable mistake | Compiler/static/CI rule with negative and positive tests |
| Investigation or execution miss | Improve the shared engineering or verification skill |
| Missing product knowledge | Update the feature map and relevant oracle |
| Unsupported success or stale approval | Strengthen evidence validation, freshness, and trusted publication |
| Misleading inherited pattern | Clean the example; block new occurrences while safe cleanup proceeds |

Use the existing issue/PR to record the class, replacement control, and its check. Do not create a second lessons database by default. A repeated class—especially one corrected several times—must not close with “remember next time” alone. Not every first mistake merits a new lint: document a proportionate prevention decision, including a named follow-up when immediate enforcement is unsafe or uneconomical.

The gardener periodically inspects changed areas and recurring findings, not the entire repository indiscriminately. Prune obsolete examples, conflicting procedures, broad suppressions, and abandoned compatibility paths. Preserve historical evidence and approved data obligations. Test that a new agent can discover and use the supported path without a private explanation. The quality question is: **would we be comfortable with the next agent copying this?**

## 10. Verify the workflow itself

A file inventory is not acceptance. Demonstrate the adopted controls in a disposable branch/environment; never inject a defect into production to prove a gate.

| Probe | Required result |
|---|---|
| Fresh-session start | An agent reaches the relevant surface and procedure without hidden history |
| Known-bad boundary/regression | Relevant check fails; valid counterpart passes |
| Writer-generated PASS | It cannot satisfy the independent gate |
| Missing verifier or artifacts | Landing stays blocked; reason distinguishes missing evidence from a defect |
| Changed head after PASS | Old authorization no longer permits landing |
| Same patch ID, changed base/meaningful whitespace | Equality alone does not restore authorization |
| Wrong preview revision | Verification detects mismatch before certifying the surface |
| Gate/procedure modified by candidate | Candidate cannot approve the changed gate using only its own implementation |
| Representative base/head scenario | A separate verifier reproduces the result and retains accessible evidence |
| Secret/egress boundary | Synthetic verification cannot silently use live credentials or exceed its approved access |
| Stack gap, when stacks are adopted | Upper passing PR cannot bypass an unverified lower dependency |
| Authorized clean candidate | The intended legitimate path can land; guards do not make all work impossible |

Run only applicable probes, but mark unavailable ones pending and do not claim their target maturity. Confirm rollback/disable behavior for new automation within owner authority. The installer cannot be its own independent acceptance reviewer.

Track a small set of useful signals: escaped/repeated defects, stale-verdict blocks, human interventions caused by missing agent capability, verification cost/time, and approved-outcome lead time. PR count, LOC, raw test count, and model confidence are not success targets. Excessive false positives and ceremonial reruns are also defects in the workflow.

## 11. Outer-loop automation comes last

The inner loop delivers one approved task safely. The optional outer loop converts complaints, failures, telemetry, and ideas into a bounded queue of candidate tasks.

Do not let external messages authorize themselves. Triage, deduplicate, classify risk, and attach approved acceptance criteria and limits before execution. Bound concurrency, retries, spend, and privilege; provide a stop switch. Pause on no-progress loops or repeated verification failures rather than consuming the entire budget.

Cloud execution and model diversity are implementation choices. Add them only when they reduce a measured bottleneck. No `/swarm`, `/loop`, or named skill should be assumed installed because it appeared in the source discussion. The owner still supplies product direction and accepts genuine product tradeoffs; automation does not eliminate responsibility.

## 12. Adoption completion and maintenance

An adoption slice is complete only when its bound controls exist, applicable negative/positive probes have passed independently, the legitimate work path has been demonstrated, and current instructions route fresh agents to it. Record remaining gaps and the actual maturity—not the desired maturity.

Promote the approved local workflow through the repository's normal authority process. Keep this portable document separate from project-specific commands, versions, URLs, and status. Revisit the binding when architecture, surfaces, runtime, permissions, or hosting change, or when a failure exposes a missing control. Do not propagate a playbook revision silently across projects.

The durable outcome is not that every agent remembers this file. It is that the environment teaches the current pattern, rejects known bad paths, and preserves independent evidence with minimal human reconstruction.

## 13. Technical references and provenance

The behavioral prescriptions above are this draft's design. These references support specific platform mechanics, not the claim that a project has implemented them. Consult current official documentation when materializing a platform-specific gate.

- **S1 — Supplied operating thesis:** originating conversation, beginning “Trust is the throughput bottleneck.” Source of the explicit enforcement ordering, per-PR verification and stack protocol.
- **S2 — Supplied talk extraction:** GPT-5.6 Sol's structured response in that conversation. Secondary inspiration for feature maps, control/verification skills, engineering methods, codebase memory, and gardening; not independently authenticated here.
- **S3 — User decisions in that conversation:** portable Markdown; adoption for existing and new projects; materialize controls rather than rely on prose; independent review before adoption.
- **T1 — [Git: git-patch-id](https://git-scm.com/docs/git-patch-id):** stable patch IDs ignore whitespace and are intended to identify likely duplicate patches. Referenced for the limitation in section 7.1.
- **T2 — [GitHub: protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches):** required checks, expected check publisher, stale reviews, up-to-date requirements, and bypass considerations.
- **T3 — [GitHub: secure use of Actions](https://docs.github.com/en/actions/reference/security/secure-use):** trust boundaries when privileged workflows interact with untrusted code and artifacts.

T1–T3 were consulted on 2026-09-26. This document does not depend on the earlier conversation's numerical Nuave maturity estimates, model recommendations, or reported talk throughput figures.

## Appendix A. Reusable adoption briefs

### Existing project, including Nuave

> Assess this repository against Agentic Engineering Playbook R1. Do not assume the playbook is adopted or that earlier chat assessments describe the current repository. Read current authority, inspect implemented controls and representative evidence, and distinguish declared, implemented, exercised, enforced, and unknown. Preserve effective conventions. Propose KEEP / IMPROVE / ADD / DEFER decisions, with the smallest verifiable adoption slice, permissions, costs, and acceptance probes. Use existing workflow/spec locations; do not create a parallel authority system. Do not change runtime, protections, permissions, release behavior, or paid integrations without authorization. Once a bounded slice is approved, implement it through the existing workflow and obtain separate verification of the controls themselves.

For Nuave, discover its actual routing from `AGENTS.md` and the canonical index. Existing specification, verification, preview, and review mechanisms are candidates for reuse—not a frozen inventory or permission to alter them. Keep this draft outside active authority until reviewed and explicitly adopted.

### New project

> Use Agentic Engineering Playbook R1 to propose a minimal project binding and safe scaffold for this project's stack and risk. Establish current authority, reproducible setup, applicable checks, candidate isolation, permissions, and a real independent-verifier route. Build the first runnable slice with its feature map and executable verification; do not invent checks for a product that does not exist. Demonstrate the relevant acceptance probes before claiming the workflow enforced. Defer paid orchestration, stacks, and autonomous intake unless a concrete need justifies them. Obtain the required approvals before committing/publishing or changing operational permissions.

## Appendix B. Independent review brief for this draft

You are reviewing the **playbook**, not certifying any host repository. You are not its author, implementer, or defender. Do not treat its length or detail as evidence of correctness. Do not adopt or implement it during this review.

Check source fidelity and clearly identified additions; portability; authority; practicality for a solo founder; clarity of independence; appropriate behavioral oracles; evidence integrity and retention; base/head/patch freshness; secure gate publication; stack safety; bootstrap/degraded modes; and unnecessary process cost.

Attack these cases in particular: all agents share one credential; verifier cannot use a browser; live calls are forbidden; a passing preview serves an older revision; a rebased patch keeps the same patch ID; a candidate changes its own gate; a higher stacked PR passes while the bottom fails; a report passes assertions but has unreadable pages; and a one-line documentation change is burdened with the entire production test suite.

For each material finding provide severity, exact section, failure scenario, consequence, and smallest correction. Separate blocking contradictions from optional improvements. State which conclusions follow from reading, which probes were executed, and which remain untested. Return **APPROVE | REVISE | REJECT** for the document, with rationale; these are editorial verdicts, not the runtime certification vocabulary in section 6. Do not claim a second-pass review by the author is independent review.
