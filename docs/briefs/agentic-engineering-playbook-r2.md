# Document brief: Agentic Engineering Playbook R2

> Status: **Draft brief**
> Owner: Orchestrator
> Output: `docs/drafts/AGENTIC_ENGINEERING_PLAYBOOK.md` (replace R1 in place on branch
> `docs/agentic-engineering-playbook-r1`; Git keeps R1 at `ac4bd62`)

## Objective

Rewrite the playbook as a short, portable guide that reproduces Lauren's (poteto) trust-building method.
The method says to move knowledge out of people and documents and into the environment: the codebase,
static checks, and a verification skill any agent can run. The guide should get a project from
"babysitting 1–5 agents" to "trusting agents with reversible engineering work," in Nuave now and in
future projects.

R2 is a **fresh rewrite**, not an edit of R1. R1 got most ideas right but put about 80% of its weight on
governance prose (layer 4–5 material by the talk's own ordering) and named nothing concrete to build.

## Audience and downstream use

- **Agents starting a session** in a project that has adopted the guide. They need to know which
  artifacts exist and what to do when they are corrected.
- **The founder**, who decides whether to adopt it and must understand it in one sitting.
- **The implementer of the first Nuave slice** (§ Required content, item 8), who will build from it.

## Authority and required context

Read in order:

1. `AGENTS.md`. These are Nuave's current rules. R2 must not silently override them and must name every
   proposed change to them.
2. The review
   [`docs/reviews/findings/agentic-engineering-playbook-r1-review-2026-09-26.md`](../reviews/findings/agentic-engineering-playbook-r1-review-2026-09-26.md),
   all of it. §2 is the authenticated structured summary of the talk. §3–§4 are the findings R2 must
   resolve. §6 is the consolidated change list.
3. **The talk.** Review §2 is the authoritative source for this task. It is a structured summary made from
   a full local transcript and the key slides, with timestamps. The raw transcript stays private on the
   founder's machine and is deliberately not in this public repository, so do not try to obtain,
   reconstruct, or publish it. Cite talk claims with review §2's timestamps.
4. **pstack at pinned commit `ecc249f`** (Lauren's published toolkit):
   <https://github.com/cursor/plugins/tree/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack>. Read:
   - `README.md` and `docs/guide/06-verify-and-ship.md`, `07-overnight.md`, `10-recipes-and-pitfalls.md`.
     These cover her philosophy, finish conditions, and pitfalls.
   - `skills/create-verification-skill/SKILL.md` and its `references/feature-map-example/`, plus
     `skills/maintain-verification-skill/SKILL.md`. These define the verification-skill anatomy R2 must
     adopt.
   - `skills/poteto-mode/playbooks/shipping.md`, `bug-fix.md`, and `feature.md`. These cover landing,
     reproduce-first, and the playbook shape.
   - `skills/principle-encode-lessons-in-structure`, `principle-never-block-on-the-human`,
     `principle-prove-it-works`, and `principle-laziness-protocol`.
5. `docs/WORKFLOW.md`. This is Nuave's current role and spec process, which R2's Nuave section must fit
   or propose changes to.
6. R1 (`docs/drafts/AGENTIC_ENGINEERING_PLAYBOOK.md` at `ac4bd62`). Read it **only after** writing your
   outline, and only to salvage the items listed under Settled decisions.
7. Nuave files needed for the first-slice section: `package.json` scripts, `tests/e2e/helpers.ts`,
   `tests/e2e/network-guard.ts`, `tests/archive-isolation.guard.test.ts`, `.github/workflows/ci.yml`,
   and `.github/workflows/pr-preview.yml`.

## Excluded context

- The R1 author's "supplied operating thesis" and "GPT-5.6 Sol extraction". They are unauthenticated;
  use review §2 and pstack instead.
- Spec 009–012 packages, `archive/`, and historical plans. The review's findings already cover their
  process-weight evidence.
- `.secrets/`, `.env*`, and `.local-evidence/`.

## Settled decisions

Founder-directed:
- Two modes: existing project (Nuave) and new project. The guide is portable Markdown, with
  project-specific commands kept out of the portable core.
- Controls must be built, not merely described.
- R2 is a fresh rewrite by a new session, grounded in the talk (via review §2) and pstack.

Carried from the review (preserve these):
- The five-layer correction order (codebase → static analysis → rules/bots → skills → style guide) is
  the organizing loop.
- A verification skill is a **CLI plus a feature map** stored in the repo, in pstack's anatomy (Launch,
  Doctor, Drive, Evidence, Cleanup + `features/`). It must be proven once end to end before it counts,
  and it is kept current by a maintenance pass with outcomes `clean | changed | blocked`.
- The owner decides product direction and irreversible actions. Reversible engineering work proceeds,
  and the owner corrects it afterwards.
- Salvage from R1, condensed: the writer does not certify their own change; missing evidence means
  **blocked**, never an inferred pass; the reject-the-class lint standard (a known-bad case and a
  known-good case, plus a baseline for legacy violations); and the stack rule (verify each PR, land the
  contiguous verified run bottom-up).
- Attribute per-PR verification and stack landing to pstack `shipping.md`, not to the talk.

## Questions this document may resolve

- The exact structure and wording of the portable core.
- Which R1 hardening material goes in the optional appendix, and the concrete triggers that activate it
  (for example: more than one concurrent writer, unattended merge, a second human contributor).
- How evidence for a change is recorded with the fewest artifacts. The review's default is the PR
  description (finish condition, commands run, verify-skill output) plus one independent verdict comment.
- The freshness rule. The default is pstack's: an unchanged stable patch-id keeps the code verdict, and
  mergeability and CI are re-run. Label any stricter rule as a deliberate deviation.
- Whether doc-only changes may skip independent verification when CI shows no executable file changed.
  The review recommends yes.

## Questions this document must not resolve

These need founder approval. Write each as an explicit proposal for the founder to accept or reject:
- Amending `AGENTS.md` "Do not commit or push unless the founder explicitly requests it" to
  pre-authorize commits and pushes on feature branches.
- Relaxing the spec gate for internal engineering changes whose finish condition is checkable.
- Any paid tool (bot reviewer, cloud agents, extra model subscriptions).
- Merge or deploy authority for agents.
- Where the canonical skills directory lives. Propose one location that every tool in use actually loads,
  and name the check that proves it (a fresh session discovers the skill). Do not pick silently.

## Required content

1. **The idea in five lines.** Trust is the constraint; the trust graph (how many agents you can leave
   unsupervised); the Michelin-kitchen framing; "I am the bottleneck."
2. **The correction loop.** On every human correction, pick the highest effective layer from the five.
   Include one worked example per layer, and apply the "encode the rule, delete the instruction"
   principle.
3. **Verification skill.** The anatomy, the feature-map file shape, prove-once, the maintenance pass, and
   evidence standards (real user path, action plus resulting state, side effects checked).
4. **Engineering playbooks.** A starter set (bug fix with reproduce-first, feature, investigation) and how
   the set grows through "reflect after a long task → edit the skill." Allow installing pstack where the
   tool supports it.
5. **Codebase as memory / gardening.** One paved path; delete tech debt; lint before cleanup to stop the
   bleeding; at least one enforced import/dependency boundary per major runtime split; and the
   workaround-comment mechanism (comments that justify a workaround license the next workaround).
   Proportionality is allowed, but the mechanism must be stated.
6. **Writer ≠ verifier and landing.** One paragraph for the default single-PR case. Stacks go in the
   appendix.
7. **Measuring progress.** The primary signal is corrections per merged change and which layer each was
   promoted to, recorded in the PR description rather than a new tracker. Secondary signals are escaped
   defects and time from approval to merge. PR count and lines of code are explicitly not targets.
8. **Nuave binding (short section or companion file; the author chooses and justifies).**
   - Existing controls to keep, taken from review §4.1.
   - **The first slice, specified exactly enough to implement:** a `verify-nuave` skill with a small CLI
     wrapping `tests/e2e/helpers.ts`, run in synthetic/offline mode, whose Doctor step compares the
     preview's head SHA; a feature map of about five features (audit entry, smart intake summary,
     question review, audit run, report + JSON/PDF download / answers-only recovery); and a prove-once
     run in a fresh session. Name its finish condition.
   - **The second slice:** mine two or three recurring correction classes from real PR history and encode
     each as a lint rule or guard test. The review's candidates (PR #70, PR #71, the `.env.local` e2e
     leak) are **unconfirmed**; confirm them against the PRs before listing them as facts.
   - An explicit goal to **reduce** per-change artifacts compared with Specs 011–012.
   - The founder proposals listed under "Questions this document must not resolve."
9. **New-project bootstrap.** In order: a paved-path boundary with an enforced import rule; lint,
   typecheck, and one verify command; a verification skill as soon as anything runs; then playbooks.
   Greenfield is where strictness is cheapest, so encourage it.
10. **Optional hardening appendix.** Condensed R1 material (evidence record, trusted publisher, freshness
    matrix, stack protocol, workflow probes), each item with its activation trigger.
11. **Sources.** The talk (via review §2, with timestamps for key claims), pstack at `ecc249f`, and the
    review.
    State which prescriptions are the talk's, which are pstack's, and which are this guide's additions.

## Non-goals

- A second governance system parallel to `docs/WORKFLOW.md`.
- Re-assessing Nuave from scratch; review §4.1 is the assessment.
- Implementing any control, skill, lint rule, or workflow change in this task.
- Tool-specific setup (Cursor, Devin, Codex, Claude) in the portable core.
- Copying pstack skills verbatim beyond short quoted rules.

## Quality bar

The candidate must be:

- consistent with `AGENTS.md`, with every proposed change to it listed as a proposal;
- faithful to the talk (review §2) and pstack, with additions labelled;
- **≤ ~150 lines for the portable core** (sections 1–7 and 9), excluding the Nuave binding and the
  appendix. It must be loadable as a skill in one read;
- centred on artifacts to build, with prose rules only where no stronger layer is possible;
- explicit about unvalidated assumptions (for example, the unconfirmed correction classes);
- free of fabricated evidence or outcomes; and
- written in plain language, explaining unavoidable terms once (for example: feature map, patch-id,
  stacked PR).

Self-check before handing it over: does each section tell an agent what to **build or run**, or only
what to **believe**? Cut or move anything in the second category.

## Deliverable

Write one complete candidate to `docs/drafts/AGENTIC_ENGINEERING_PLAYBOOK.md` on branch
`docs/agentic-engineering-playbook-r1`, with header `Revision: 0.2 / R2`, status "In review — not
adopted". Do not modify canonical documents, `AGENTS.md`, runtime code, or workflows. The founder
authorizes one commit to this branch, containing only the playbook file, and a push to the same branch.
Do not open a pull request, merge, or push anywhere else.

End with a short report covering:
- how each item in review §6 was resolved;
- the portable-core line count;
- the commit SHA;
- open founder proposals;
- assumptions; and
- files changed.
