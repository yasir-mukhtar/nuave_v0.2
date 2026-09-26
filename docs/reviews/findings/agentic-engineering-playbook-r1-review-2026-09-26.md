# Review: Agentic Engineering Playbook R1

> Reviewed artifact: [`docs/drafts/AGENTIC_ENGINEERING_PLAYBOOK.md`](../../drafts/AGENTIC_ENGINEERING_PLAYBOOK.md)
> at commit `ac4bd620e561df3fdff7270c6db5c4e2d0c4f6a2` (branch `docs/agentic-engineering-playbook-r1`)
> Review date: 2026-09-26
> Editorial verdict: **REVISE**
> Scope: how faithfully the plan reproduces Lauren's (poteto) workflow and technique, and whether it can
> realistically be adopted in Nuave and in future projects. This review does not adopt the playbook, change
> runtime code, or certify any control.

## 0. Summary

The plan correctly identifies the talk's core ideas: trust before throughput, verification skills,
feature maps, the five-layer enforcement order, codebase as memory, gardening, and outer-loop automation
last. Its safety reasoning (writer ≠ verifier, stale-evidence, no inferred passes) is sound.

It still misses the point of the talk in one important way. The talk is about **moving trust out of
people and documents and into the environment**: the codebase, lint rules, and a verification CLI plus
feature map that any agent can run. The plan does the opposite. About 80% of its 441 lines are governance
prose: binding tables, maturity levels, a YAML evidence contract, freshness matrices, trusted-publisher
design, and twelve workflow acceptance probes. By Lauren's own ordering, that is layer-4/5 material, the
weakest kind. It also never names the first two concrete things the talk says to build: a project
verification skill (CLI + feature map) and lint rules taken from recurring corrections.

For Nuave this matters because process weight is the current bottleneck, not missing governance. The
founder said the last milestone "took too long" (`docs/NOW.md`). Spec 011 alone holds 38 Markdown files
(prompts, results, reviews, re-reviews). Adopting R1 as written would add more of the same.

**Recommended direction for R2:** cut the portable core to about 100–150 lines built around the talk's
actual artifacts. Move the heavy landing/certification machinery into an optional appendix gated on real
scale. Add a concrete first Nuave slice: `verify-nuave` skill + feature map + two lint rules taken from
past corrections. Details are in §4 and §5.

## 1. Source basis for this review

The plan admits (§0 "Basis and limits") that its author did not watch the video. This review closes that gap.

| Source | What was done | Location |
|---|---|---|
| Talk video (38:02, posted 2026-09-21) | Downloaded from X's CDN. Transcribed locally with `mlx-whisper` (`whisper-large-v3-turbo`), full coverage 0:00–38:08. 129 de-duplicated slide frames extracted and key slides inspected | Local only: `/private/tmp/poteto-talk/` (not committed; third-party media) |
| pstack plugin (Lauren's published toolkit, referenced in the talk at 13:14) | Read README, guide, `poteto-mode`, the `shipping`, `bug-fix`, `feature`, and `autopilot-*` playbooks, `create-verification-skill`, `maintain-verification-skill`, and the principle skills | [cursor/plugins@ecc249f/pstack](https://github.com/cursor/plugins/tree/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack) |
| Nuave repository | Read `AGENTS.md`, `docs/WORKFLOW.md`, `docs/NOW.md`, CI and preview workflows, `scripts/verify-offline.mjs`, and the existing guard tests. Checked spec package sizes and merged-PR count (60) | This branch |

Timestamps below (`[mm:ss]`) refer to the talk transcript.

## 2. Structured knowledge: what the talk actually says

### 2.1 Thesis

- **Trust is the constraint on scale.** [00:19–00:47] If you set up your agents' environment well enough,
  you get a personal or team "software factory" producing high-quality code at much higher rates.
- **"Michelin kitchen," not "factory."** [00:57–01:55] The work is creative, and you still own the final
  dish. Your job is the kitchen setup: stations, equipment, training, and staffing ratios.
- **"I am the bottleneck."** [04:37–04:59] The goal is to transfer the engineer's knowledge into the agents'
  environment so the human stops being the blocker for everything. 2,000+ PRs a month were a *result*,
  never a target [04:21].

### 2.2 The trust graph (slide at ~05:30)

The x-axis is the number of agents you can run concurrently (1 → 1–5 → 5–10 → 10–20 → hundreds →
thousands). The y-axis is trust, and the curve rises steeply and then flattens.

- The **1–5 stage is the hardest to escape** [05:38–06:05]. You babysit every chat and constantly correct,
  and nothing happens without you.
- Scaling agents *without* trust yields "a ton of slop pull requests… regressions… bugs shipped" [06:23–06:39].

### 2.3 Three ways to increase trust (slide at ~07:15)

1. **Verification for correctness.**
2. **High-quality skills that teach agents to work like real software engineers** (e.g. pstack).
3. **Refactoring or rewriting the architecture to be agent-friendly** (annotated "greenfield vs brownfield").

### 2.4 Verification (06:50–12:30)

- It is a spectrum. At the practical end are *verification skills* that teach the agent to run the app and
  debug it (CDP, traces, heap snapshots). At the hard end is formal verification (Lean, TLA+). "With
  verification skills, you can get very far." [07:05–08:31]
- Origin story: manual perf work on Cursor's agent window. She could not keep up with incoming PRs, so she
  built **Control Glass**, a skill that runs the app and takes traces over CDP. [02:57–04:05, 08:39]
- **A verification skill has two parts** (slide "High-quality verification: a feature map gives context.
  A CLI gives control."):
  - **CLI inside the skill directory** [09:16–10:13]. Agents run the app reproducibly and collect empirical
    evidence. This replaces per-session scratch scripts. "You need to actually invest in it and make it
    good."
  - **Feature map** [10:13–11:34]. This is "materialized memory," like a sitemap: what features exist, how
    a user reaches them (shortcuts, DOM elements), and what they do. It is stored in the skill directory in
    the repo and **maintained by an automation**. It was invented because vague bug reports ("a screenshot
    and three question marks") left agents guessing.
- Together, the two let an agent verify its own work *and* interpret vague internal or external reports.
  They became "critical infrastructure" that is constantly maintained [11:42–12:20].
- **Verification = correctness** ("does the checkout button check out the cart"). It says nothing about
  performance or code quality, which is why the second lever exists [12:39–13:06].

### 2.5 Engineering skills (13:06–14:50)

- pstack is a collection of workflows (debugging, feature development, prototyping, and more) that teach
  agents to engineer the way *you* want.
- Senior engineers contribute by building a **team repository of skills**.
- Engineering skills combined with verification give correct *and* high-quality work, backed by real
  performance numbers.

### 2.6 The five-layer order: "whenever you correct your agent" (slide at ~16:30, repeated as the closing slide at ~36:15)

1. **Codebase** (architecture, data structures). Make the mistake "categorically impossible."
2. **Static analysis** (lint / compiler / CI).
3. **Rules / Bugbot.**
4. **Skills.**
5. **"Style guide."** This is human review only, and it is impossible at high PR rates. Use it as a
   *discovery source* for what is missing, not as a control. [17:53–18:36]

Layers 3–4 are guidance, not enforcement. Agents may skip a rule, or the operator may ignore it
[17:08–17:40]. The closing message [36:09–37:03] is the one takeaway: on every correction, pick the
highest effective layer in this order.

### 2.7 Codebase as memory, gardening, agent-friendly framework (14:55–31:35)

- **Agents extend existing patterns.** The files they read are their context, so the codebase is the best
  form of memory [15:41–16:23].
- **Anti-patterns spread like a virus** (slide "one workaround → copy → copy → the pattern. Each copy makes
  the next copy likelier.") [20:43–21:31].
- **Dune**, the GrokBot framework [19:01–20:29]. Its principle is that agents love shortcuts, so the
  shortcut must be the right path. It is "locked down… annoying for humans" but ideal for low-context
  agents and non-engineer contributors (designers, PMs, CEOs).
- **Comments banned in Dune** [23:00–24:24]. Agents used nearby comments as justification to paper over
  problems instead of solving them. The mechanism matters more than the rule: *workaround comments license
  more workarounds.*
- **Gardener role** (slide "delete tech debt → keep one paved path → lint against anti-patterns") [24:24–26:36]:
  - Delete existing tech debt.
  - Keep **one paved path** for blessed patterns, so agents don't guess.
  - When you see a bad pattern, **write a lint rule first** to "stop the bleeding," even before cleanup.
  - Quality bar: keep the codebase in a state "you would be happy if an agent were to copy."
- **Enforced boundaries via the import/dependency graph.** Example: main-process code must never reach the
  renderer (a 16 ms / 8 ms frame budget) [27:45–29:09]. A class of perf bugs was eliminated architecturally.
- This moves tribal knowledge out of code review and into the framework [29:37–30:33].

### 2.8 Outer loop (32:37–35:15; slide "building a michelin kitchen")

- GrokBot connects Slack, Datadog, Sentry, and PlanetScale, and *routines* subscribe to threads and alerts
  and kick off cloud agents. Cursor automations and the Agent SDK build further bots on the same
  skills/rules.
- "You don't really have to invest in a lot of infrastructure." She explicitly rejects a sophisticated
  "company brain" because agents are good at using tools [33:08–33:36].
- The demo screenshot shows a Slack bot ("Benny") reproducing a user's vague report, explaining the gap in
  the existing tests, and instructing the fixer: *"re-run the repro path above to verify your fix. Write a
  failing test, then fix the issue."*
- Everything compounds: codebase, rules, and skills are reused by every automation.

### 2.9 What the talk does NOT contain

The talk does **not** describe independent per-PR verifier agents, PASS / PASS+NOTES / FAIL verdicts,
bottom-up stack landing, patch-id freshness, evidence records, or trusted publishers. Those come from
pstack's [`shipping.md`](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/shipping.md)
and `autopilot-*` playbooks. They are legitimate parts of *her workflow*, but they belong to the pstack
layer, not the talk's thesis.

### 2.10 Relevant pstack philosophy the plan should know

- "if you want to go fast, go deep first… write less, but higher quality code." (README)
- "**i don't believe in planning. the best spec is code.**" Plans are available but "not a default."
  (README, "why are there no planning skills?")
- **Never block on the human.** "Product direction comes from the human. *Execution* should not block."
  Confirmation is reserved for irreversible actions. (`principle-never-block-on-the-human`)
- **Encode lessons in structure.** When you write the same instruction twice, make it a lint, flag,
  runtime check, or script, *and delete the instruction*. "The instruction is the symptom."
- **Verification skill anatomy** (`create-verification-skill`): Launch, Doctor, Drive, Evidence, and
  Cleanup, plus `features/` with one file per feature (Sub-features / How to get to it / Driving it /
  Gotchas). The generated skill must be **proved once end to end before handover**. A never-executed skill
  "is a draft, not a deliverable."
- **Maintenance loop** (`maintain-verification-skill`): parallel source readers per feature, one live pass
  driving every feature, and outcome `clean | changed | blocked`. It never edits product code.
- **A finish condition up front.** "Give the agent a goal and a way to check it." The overnight contract
  is: goal, done-predicate, permissions, and an escape hatch.

## 3. Fidelity assessment

### 3.1 What the plan gets right

| Talk / pstack idea | Plan section | Assessment |
|---|---|---|
| Trust before throughput; PR count is not a goal | §1, §10 signals | Faithful |
| Five-layer order | §2 table | Faithful. Layers 3/4/5 map correctly |
| Reject the class, not the instance; lint to stop bleeding with a baseline | §2 "Static controls" | Faithful and well adapted (negative + positive case) |
| Feature map contents | §4.1 | Mostly faithful. Includes "how to reach it" and selectors |
| Stable helper commands instead of scratch scripts | §4.2 | Present, but only as one sentence |
| Gardener; "would we be comfortable with the next agent copying this?" | §9 | Faithful |
| Independent per-PR verdict, bottom-up contiguous landing, `autoMergeRequest` is not readiness | §5.3, §8 | Faithful to pstack `shipping.md` |
| Outer loop last, and no big infrastructure required | §11, §7.3 | Faithful |
| Separate verification skills from engineering playbooks | §4.2 | Faithful |

### 3.2 Fidelity findings

**F-1 (High): The weight of the plan inverts the talk's thesis.** The talk's one takeaway is to push every
correction to the *highest* layer (codebase > static analysis > rules > skills > style guide). The plan puts
most of its content at layers 4–5: prose procedures, tables, and a YAML contract with no validator ("This is
a field contract, not a claim that a validator already exists"). It even states that "success is measured
by the controls it materializes," but it materializes none and names none for a first slice.
*Correction:* make R2's core a short list of **artifacts to build** (verify skill, feature map, lint rules,
single-path boundaries, a correction→control habit). Move §6.3's YAML, §7.2's trusted publisher, and §10's
12-probe matrix into an optional "L4+ hardening" appendix.

**F-2 (High): The verification CLI and skill anatomy are underspecified.** The talk says a verification
skill is a *CLI plus a feature map* in the skill directory, invested in heavily, with a maintenance
automation. The plan's §4.2 lists what a skill "must name" but never says "build a CLI," never names the
Launch/Doctor/Drive/Evidence/Cleanup structure, never requires the generated skill to be proved once end
to end, and omits the automated feature-map maintenance loop.
*Correction:* adopt pstack's `create-verification-skill` anatomy verbatim as the default. Add a periodic
`maintain` pass with outcomes `clean | changed | blocked` that edits only the skill directory.

**F-3 (High): "Never block on the human" and "best spec is code" are missing, and their opposite is
amplified.** The talk's motive is removing the human bottleneck [04:37]. pstack draws the line explicitly:
the human owns product direction and irreversible actions, and execution proceeds. The plan adds approval
points everywhere (§0, §3.2 "Obtain approval," I-07, §7.3, §12) and does not mention the "execution should
not block" principle. It also inherits a spec-first stance without acknowledging that pstack treats plans
as optional.
*Correction:* add an invariant that separates **product/irreversible decisions** (owner) from **reversible
engineering execution** (agent proceeds, presents evidence, owner corrects afterward). Say explicitly
that a spec is required for product-behavior changes, not for internal engineering changes whose finish
condition is checkable.

**F-4 (Medium): Agent-friendly architecture is softened into near-absence.** The talk calls rewriting
architecture to be agent-friendly "one of the most important things" [15:01]. It explicitly endorses a
codebase that is "annoying for humans" and forbids "even innocent-looking patterns" [22:32–22:55]. The plan
mostly warns *against* doing this ("not proof that a rewrite is necessary," "Do not universally ban
comments, `useEffect`…"). Proportionality is reasonable, but the plan drops the mechanism behind the comment
ban (workaround comments license workarounds) and the dependency-graph boundary enforcement example.
*Correction:* keep proportionality, but state the mechanism. Require at least one enforced import/dependency
boundary per major runtime split, and treat "workaround + justifying comment" as a lint-worthy smell.

**F-5 (Medium): The maturity ladder replaces the talk's actual metric.** L0–L6 is the plan's invention and
it is labeled as such, which is fine. But the talk's axis is concrete: *how many agents can you run
concurrently without babysitting?* Measured by that axis, the plan's signal list (§10) lacks the most
direct measure: **human corrections per merged change** and **which layer each correction was promoted
to**.
*Correction:* keep the levels if wanted, but make the primary signal "corrections per change and where they
went" (a lightweight ledger inside PR descriptions, not a new database).

**F-6 (Medium): Engineering skills are reduced to "one bug-fix playbook."** The talk treats task-type
playbooks (debugging, feature, prototyping, perf) as one of three trust levers. §4.2's "one general bug-fix
playbook… is a sufficient starting point" is a sensible start but has no growth path.
*Correction:* allow projects to install pstack-equivalent playbooks (or pstack itself where the tool
supports it). Grow them via "reflect after a long task → skill edit," not by writing policy.

**F-7 (Low): Provenance should cite the primary sources now available.** §0 and §13 list S1/S2 as
"supplied" and unauthenticated. With the transcript and pstack available, cite them directly. Attribute
the stack/landing protocol to pstack `shipping.md`, not the talk.

**F-8 (Low): The freshness rule is stricter than the source, without saying so.** pstack keeps a code
verdict when the stable patch-id is unchanged after a rebase and re-runs only mergeability and CI. It also
has a build-twice noise procedure for tests/docs/lint-only differences. The plan's "any new head
invalidates" (§7.1) is safer but costs more.
*Correction:* label it as a deliberate deviation, and offer pstack's rule as the default for single-owner
repos without stacks.

## 4. Realism assessment

### 4.1 Nuave (existing project)

**What Nuave already has** (the plan should build on these, not re-specify them):

| Talk layer | Existing Nuave control | Maturity |
|---|---|---|
| Static analysis / CI | `npm run verify` offline gate; `validate` required check; branch protection; `verify-main-origin` deployment gate | Enforced |
| Codebase boundary | `tests/archive-isolation.guard.test.ts` (no imports from `archive/`) | Enforced (test-based lint) |
| Codebase boundary | `tests/e2e/network-guard.ts` + `offline-network.spec.ts` (no live egress in offline tests) | Enforced |
| Real surface per candidate | `pr-preview.yml`: isolated preview worker per PR, head SHA published in the PR comment | Implemented |
| Writer ≠ reviewer | `docs/WORKFLOW.md` roles, fresh-session reviewer, `templates/VERIFICATION.md` | Declared and practised manually |
| Verification skill (CLI + feature map) | **None.** Every verification round writes fresh scratch probes (e.g. B2 visual verification built its own Playwright/PyMuPDF scripts under `/private/tmp`) | **Missing — this is the talk's #1 lever** |
| Correction → lint | Not systematic. Corrections accumulate in spec amendments, reviews, and `AGENTS.md` prose | Missing |

**Realism findings:**

**R-1 (High): R1 would make Nuave's actual bottleneck worse.** Nuave's recurring cost is document and
review ceremony: 38 files in Spec 011, 12 in Spec 012, hash manifests of 316–331 files per review, and
worker/reviewer prompt pairs for each step. The founder's recorded feedback is about pace. R1 adds a
binding table, per-change evidence records, a freshness matrix, and a 12-probe acceptance suite. Nothing
in the talk requires any of this for a solo founder at ~60 total PRs.
*Correction:* R2's Nuave brief should state as a goal that it **reduces** per-change artifacts. A change is
evidenced by its PR description (finish condition, commands, and verify-skill output) plus one independent
verdict comment. Spec packages hold only the spec and one verification record.

**R-2 (High): There is no concrete first slice.** Appendix A's Nuave brief asks another agent to *assess*
again. The assessment above is enough to start. Proposed first slice (one PR, reviewable in a day):
1. `verify-nuave` skill in the repo's canonical skills location. **Launch:** local dev server in synthetic
   mode with the existing offline env. **Doctor:** port, build, and mode check. **Drive:** a small CLI
   wrapping existing `tests/e2e/helpers.ts`, with commands such as `drive intake <url>`, `drive report`,
   `capture proof` (screenshots, PDF, JSON, network log). **Evidence:** written to one named
   ignored directory. **Cleanup.**
2. A feature map with about 5 files: audit entry, smart intake summary, question review, audit run, and
   report + JSON/PDF download / answers-only recovery.
3. Proof that the skill works once end to end in a fresh session, per pstack's rule.

This is the single change that most directly reproduces the talk. It also removes scratch-probe work from
every future verification round.

**R-3 (Medium): The correction-to-control backlog should be mined, not invented.** Nuave's review history
already contains recurring correction classes. The plan should instruct the adopter to pick 2–3 and encode
them. Candidates visible in this session's context, to be confirmed against the actual history:
- Provider/system identity strings accepted in one place but not another (the PR #71 class).
- Workerd-incompatible fetch options (`redirect: "error"`, PR #70).
- Local `.env.local` leaking into hermetic e2e (the `shared-config.ts` fix).

Each becomes a lint rule or guard test with a known-bad and a known-good case (the plan's §2 already has
the right standard for this).

**R-4 (Medium): Tooling assumptions must stay tool-neutral.** Lauren's stack is Cursor (skills, Bugbot,
cloud agents, `/loop`) plus GrokBot. Nuave's sessions use Devin, Codex, and Claude. The plan is correctly
tool-neutral, but it should add one binding decision: **a single canonical skills directory that every tool
in use actually loads**, verified by a fresh session discovering the skill. It should not rely on
duplicated copies per tool. Bugbot-equivalent review (layer 3) is optional. Nuave has no bot reviewer
today, and adding one is a spending decision.

**R-5 (Low): Existing Nuave rules conflict with parts of pstack, and the conflict should be resolved
explicitly.** `AGENTS.md` says "Do not commit or push unless the founder explicitly requests it" and
"Do not merge." That is compatible with "never block on the human" only if commits on feature branches are
pre-authorized (they are reversible). R2 should propose that exact amendment for the founder to accept or
reject, rather than leaving the conflict implicit.

### 4.2 Future projects

The "new project" mode (§3.3) is mostly realistic. Adjust it as follows:
- The bootstrap order should follow the talk: **(1)** one paved-path module/boundary convention with an
  enforced import rule, **(2)** lint + typecheck + one canonical verify command, **(3)** as soon as
  anything runs, generate the verification skill + feature map (pstack `create-verification-skill` works
  for any stack), **(4)** skills/playbooks. Evidence records and publishers come later, if ever.
- "Greenfield vs brownfield" (slide at ~07:15): greenfield is where the locked-down, agent-friendly
  framework is cheapest. The plan should *encourage* strictness in new projects rather than only warning
  against over-banning.
- Keep the portable doc short enough to be loaded as a skill. At 441 lines it contradicts its own §0
  ("A new session should need… not this entire document").

## 5. Answers to Appendix B attack cases (reading-based; no probes executed)

| Case | Plan handles it? | Note |
|---|---|---|
| All agents share one credential | Yes (§7.2 "record the actual trust limit") | Honest. For Nuave this is the reality, so the manual landing mode applies |
| Verifier cannot use a browser | Yes (§7.3 → blocked) | The better fix is the verify-skill CLI, which makes the browser a scripted dependency |
| Live calls forbidden | Yes (§6.1 synthetic substitution) | Nuave's network guard already enforces this |
| Preview serves an older revision | Yes (§6.1) | Nuave's preview comment publishes the head SHA. The Doctor step should compare it |
| Rebased patch keeps the same patch-id | Yes, but stricter than pstack (F-8) | — |
| Candidate changes its own gate | Yes (§7.2) | — |
| Upper stacked PR passes, bottom fails | Yes (§8) | Stacks are rare in Nuave. Mark the section optional |
| Report passes assertions but has unreadable pages | Yes (§6.1 "all pages where pagination can change") | Belongs in the feature map's report entry as a Gotcha |
| One-line doc change burdened with the full test suite | **Partly.** §6.1 says "select only relevant checks," but §7.1 requires "a separate verifier… explicitly reissues" even for doc-only changes | Contradiction with the cost goal. Allow doc-only changes to skip independent verification when CI proves no executable file changed |

## 6. Required changes for R2 (consolidated)

1. **Restructure (F-1, R-1).** Core ≤ ~150 lines: the thesis, the five-layer correction loop, the
   verification skill (CLI + feature map + maintenance), engineering playbooks, gardening/paved path,
   writer ≠ verifier, and outer loop last. Everything else goes to an "optional hardening" appendix, gated
   on concrete triggers (multiple concurrent writers, unattended merge, a team).
2. **Adopt pstack's verification-skill anatomy and prove-once rule (F-2).**
3. **Add the execution-vs-product decision invariant and the "spec only for product behavior" rule
   (F-3, R-5).**
4. **Restore the agent-friendly-architecture mechanism and the dependency-boundary example (F-4).**
5. **Make "corrections per change → promoted layer" the primary signal (F-5).**
6. **Cite the transcript and pstack as primary sources. Attribute landing to pstack (F-7). Label the
   freshness deviation (F-8).**
7. **Replace Appendix A's Nuave brief with the concrete first slice in R-2 and the correction mining in
   R-3, and add an explicit artifact-reduction goal (R-1).**
8. **Resolve the doc-only verification contradiction (§5, last row).**

## 7. What this review did and did not verify

- **Measured:** full transcript coverage and key slide contents of the talk. Contents of pstack at commit
  `ecc249f`. Nuave file counts, workflows, guard tests, and merged-PR count on this branch's base (`d45a944`).
- **Inferred:** Nuave's correction classes in R-3 come from session history summaries and PR titles, and
  must be confirmed against the actual PRs before encoding.
- **Not done:** no playbook control was implemented or probed, and no second independent review of this
  review was performed.
