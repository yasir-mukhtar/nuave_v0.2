# Model-agnostic design intelligence plan — adversarial review

> Target: "NUAVE — Model-Agnostic Design Intelligence Implementation Plan" (Proposed)
> Branch: `claude/nuave-design-review-i7r5sz` · Reviewed 2026-09-01 · Read-only pass
> Method: every claim the plan makes about existing Nuave infrastructure was
> checked against the working tree. Nothing was implemented, and no provider
> call was made.

## 1 · Verdict

**Reject as scoped. Approve a much smaller Package A; defer B, C, D, E.**

The plan's diagnosis is partly right — Nuave's design judgment is real but
scattered — and its instincts about restraint are good. It correctly refuses to
build a design linter, an LLM judge, or a benchmark.

But it is wrong about the gap. The plan assumes the judgment does not exist and
proposes to author it. It already exists, in canonical documents, and the plan
proposes to restate it in a fourth place — which its own §2 non-goals forbid
("duplicate product rules manually into another maintained document"). Of the
ten proposed principles, seven are restatements of settled canonical rules and
one, as worded, would license an agent to delete an approved requirement.

Three findings are blocking (F-1, F-2, F-3). Two are structural objections to
Package B's premise (F-4, F-5). One is about timing and is arguably the most
important (F-9).

The smallest durable version of this plan is roughly **40 lines added to one
existing file**, and no new script, directory, check, or public artifact.

---

## 2 · Blocking findings

### F-1 · "Provenance theater" over-generalizes past a settled line and would license deleting an approved requirement — **critical**

Package A2 proposes the anti-pattern:

> **Provenance theater** — Extraction provenance, confidence, timestamps, or
> internal system state become visible without helping the customer's current
> decision.

Spec 006 `SPEC.md:439-443` (**R-23**, founder-approved 2026-08-20) requires the
opposite for the screen where this matters most:

```
- **R-23:** The screen renders in Indonesian per `docs/VOICE.md` §7.2, as an
  AI-prepared draft: every prepared value carries one of the six provenance
  labels (`Ditemukan di website`, `Ditemukan di Google Maps`, `Ditemukan di
  Instagram`, `Saran Nuave`, `Ditambahkan oleh Anda`, `Perlu diperiksa`); no
  internal schema terms, confidence scores, or superlatives appear.
```

This requirement survives the 2026-08-28 visual-stack supersession notice
(`specs/006-product-wide-polish/SPEC.md:14-22`), which supersedes the palette
and component stack but explicitly instructs: "preserve the behavioral
contracts and acceptance intent." `SPEC.md:277` carries the same requirement as
a visual system ("six provenance pills"), and `SCREEN_CONCEPTS.md:241` states
the design position directly: **"provenance is the interface."**

Note what R-23 already does: it draws the exact line the proposed anti-pattern
is reaching for — provenance labels **required**, confidence scores **banned**.
The settled decision is more precise than the proposed replacement.

**Failure scenario:** an agent is asked to build the Business Facts screen and
is given `docs/DESIGN.md` as its canonical presentation authority, as
`AGENTS.md` §11 instructs. It reads "Provenance theater" and reasons that six
source labels on every field are internal system state that does not help the
customer's current decision. It ships the screen without them. `npm run verify`
passes — there is no check for R-23. The screen now violates an approved spec,
and the intake stops communicating "Nuave did the work," which is the screen's
entire assigned emotional beat (`SCREEN_CONCEPTS.md:43`).

This is reviewer question 2 answering itself: **yes**, a proposed anti-pattern
accidentally makes a product decision — by negation, which is the harder kind
to notice in review.

### F-2 · `nuave.id` is not a Nuave domain anywhere in this repository — **critical**

Package B targets `https://nuave.id/design.md`. A full-tree search for
`nuave.id` across markdown, TypeScript, JSON, and config returns **zero
matches**.

The domains the repository actually knows about are `v2.nuave.ai` (live,
Cloudflare Workers, `docs/NOW.md:32`), `nuave.ai` and `www.nuave.ai`
("untouched", `NOW.md:33`), and the worker fallback
`nuave-v2.mail-yasirmukhtar.workers.dev`.

Either the plan means `nuave.ai` and the URL is a typo carried through four
sections, or it assumes acquiring a domain — which is spending money, and
`AGENTS.md` requires founder approval before that. A plan whose public contract
names a domain the repository has no evidence Nuave controls cannot be
implemented as written.

### F-3 · Publishing the design authority is a founder publishing decision, and the site is deliberately closed — **critical**

`AGENTS.md` (final section): founder approval is required before "publishing."
`docs/WORKFLOW.md` assigns publishing decisions to the founder role.

The current posture is not an oversight. `src/app/robots.ts` returns
`disallow: "/"` for all agents, `src/app/layout.tsx:11` sets
`robots: { index: false, follow: false }` site-wide, and `NOW.md:44-46` records
that the site is "noindex and direct-link only" with "a minimal server-side
rate/cost guard … a prerequisite before any public link sharing."

Package B3 and Step 3 would make `/design.md` the first public artifact of a
pre-customer product, exposing the internal stack, component-tree conventions,
repository paths, and product principles. That may well be fine — many
companies publish design docs — but it is the founder's call and the plan
presents it as an engineering step ("Make `/design.md` available through the
deployed Nuave application"). It should be an explicit approval request with
the disclosure surface named.

---

## 3 · Structural objections to Package B

### F-4 · External design agents cannot produce compliant Nuave UI, with or without `/design.md` — **high**

Package B's premise is that a repo-blind tool given the right design context
produces usable Nuave work. Two canonical contracts make that structurally
impossible, and neither is a design rule `/design.md` could carry:

1. **Spec 006 `SPEC.md:378` (R-09):** all customer-facing strings come from the
   `next-intl` message catalogs. The only catalog is `src/messages/id.json`.
2. **`docs/VOICE.md` (founder-approved 2026-08-17)**, applied by
   `SCREEN_CONCEPTS.md:18` and `SPEC.md:16-17`: settled Indonesian labels are
   "copied verbatim and never paraphrased."

An external tool with no repository access will emit English or freshly
invented Indonesian strings inline. `SCREEN_CONCEPTS.md:457-458` lists exactly
this among what the design direction "deliberately avoids": "any customer-facing
string not routed through the locale catalogs, and any paraphrase of a settled
label."

So the best possible outcome of `/design.md` is external output that *looks*
Nuave while violating the two contracts that matter most, and which must be
re-implemented in-repo anyway. The plan's own §11 deferral logic ("do not add
`brand.css` until repeated external-agent work shows `/design.md` alone still
causes agents to reinvent styling mechanics") should be applied one level up:
**do not add `/design.md` until repeated external-agent work exists at all.**
Right now there is none, so the evidence threshold the plan applies to its own
follow-ons has not been met by its own Package B.

### F-5 · The generator is brittle machinery for a file with no current consumer — **medium**

B2 requires the generator to "fail if an expected source section can no longer
be found." Combined with the B3 freshness check wired into `npm run check`, this
couples the *prose headings* of a hand-edited markdown file to the verification
gate that `npm run verify` runs (`scripts/verify-offline.mjs:102`). Renaming a
heading in `docs/DESIGN.md` breaks the build. Every `DESIGN.md` edit becomes a
two-file diff with a generated artifact for review.

That trade is worth it for a contract with real consumers. It has zero today.

Minor, related: the plan's new `scripts/*.mjs` files would fall outside
`format:check`, whose glob is `"*.{json,mjs}"` — root only, not `scripts/`.
`scripts/check-typography.mjs` has the same gap today, so this is pre-existing
rather than introduced, but new files inherit it.

---

## 4 · Package A is mostly already written

### F-6 · Seven of ten proposed principles restate settled canonical rules — **high**

This directly answers reviewer question 1. The judgment exists. Inventory:

| Proposed A1 principle / A2 anti-pattern | Already canonical at |
|---|---|
| "correcting Nuave rather than filling out Nuave's database" | `docs/V1_PRODUCT_CONTRACT.md:34` — "The intake is a **correction loop**, not a blank-form workflow"; spec 007 `SPEC.md:1033` |
| **Form disguised as AI** | same as above |
| **Dashboard reflex** | `docs/PRODUCT.md:241-243`; `docs/AUDIT.md:157` — "Do not turn one response into a percentage or stable rank"; `docs/VISION.md:236` |
| "show the conclusion before supporting methodology" | `docs/VISION.md:140-142` — "**Action before analytics.** The product reduces the result to the few changes worth considering first instead of presenting a dashboard full of metrics" |
| **Premature evidence** | same, plus `docs/VISION.md:138-139` ("Evidence before scoring") |
| "AI activity indicators must correspond to genuine system activity" | `docs/DESIGN.md` §"Motion and accessibility" — "Indeterminate activity indicators may loop only while genuine work is in progress"; spec 006 R-29 (`SPEC.md:465`), R-… (`:477`) |
| **Generic AI chrome** | `docs/DESIGN.md` §"Motion and accessibility" (no perpetual loops, cursor glows, marquees, drifting gradients); `SCREEN_CONCEPTS.md:454-455` |
| **Provenance theater** | **contradicts** spec 006 R-23 — see F-1 |
| "progressive disclosure for secondary evidence" | `docs/DESIGN.md` §"Approved stack" (BeUI owns progressive disclosure); §"Composition and ownership" |
| "one primary mental task per intake step" | `SCREEN_CONCEPTS.md:35-50` — the emotional beat map: "A screen that tries to carry two beats carries neither" |

**Genuinely new and worth adding — three items:**

- **Card soup** — hierarchy and whitespace before containers. Not stated
  anywhere. `SCREEN_CONCEPTS.md:24-25` gets close ("typography that carries
  hierarchy through size and weight rather than color or decoration") but never
  addresses container proliferation.
- **Visual prominence follows product importance, not implementation
  complexity.** Not stated anywhere. Good rule.
- **Mobile composition is a first-class design state.** `docs/DESIGN.md`
  §"Responsive typography" covers type only; spec 006 mentions "mobile parity"
  once (`SPEC.md:142`) without defining it. Real gap.

The correct fix is therefore **routing, not authorship**: a short "Design
judgment" section in `docs/DESIGN.md` that links the seven settled rules to
their owning documents and states the three new ones. That preserves single
source of truth (reviewer question 4), which the plan as written breaks in
Package A before Package B ever gets to it.

### F-7 · One of the plan's own non-goals rules out its own Package A — **medium**

§2 forbids "duplicat[ing] product rules manually into another maintained
document" and "creat[ing] a separate design authority competing with
`docs/DESIGN.md`." §3 A1 says the principles "may summarize already-settled
Nuave product/design decisions." Summarizing settled decisions from
`PRODUCT.md`, `VISION.md`, and `AUDIT.md` into `DESIGN.md` is the duplication
§2 prohibits. The plan does not notice the collision because it treats
`DESIGN.md` as exempt — but `DESIGN.md` is not the owner of "no dashboards";
`PRODUCT.md` is.

---

## 5 · Packages C and D reinvent existing infrastructure

### F-8 · Nuave already runs this exact loop, under different names — **medium**

Package C proposes fixed scenarios, a fresh-context reviewer, and a recorded
verdict. Package D proposes routing failures back into the right layer.

`docs/reviews/prompts/` (14 files) holds fixed review prompts.
`docs/reviews/findings/` (7 files) holds the verdicts, including four rounds on
spec 007 alone. `docs/WORKFLOW.md` §Roles already defines the Reviewer as
approaching "the artifact or implementation from a fresh context," and §Context
rules item 7 already states the model-agnosticism principle the plan spends
Package C establishing: "Independent agents should receive the same settled
facts, not different versions of product truth."

Package D's escalation ladder (judgment → prose, mechanics → tokens,
deterministic → check) is a genuinely good articulation and is *not* written
down anywhere. That is the one part of C/D worth keeping — as a paragraph, in
`DESIGN.md`, not as a package.

### F-9 · The three scenarios restate inputs that three approved documents already own, while one of them is actively being revised — **medium**

- Scenario 1 (Order Preview) → `docs/journey/01-order-preview.md`,
  `docs/content/order-preview-copy.md`, spec 006 `SPEC.md:252` (which already
  specifies the "this is not an audit result" design the scenario's question
  asks about).
- Scenario 2 (Intake Correction) → spec 007, **Approved 2026-08-30**, and still
  under active revision: `docs/reviews/prompts/` contains round-8 closure
  checks, and `git log` shows five spec-007 merges in the last few commits.
- Scenario 3 (Audit Report) → `docs/journey/06-audit-report.md`,
  `docs/AUDIT.md` report contract.

Writing scenario files that restate "input data" and "required product
constraints" creates a fifth copy of the intake contract that will drift from
spec 007 while spec 007 is still moving. C1's instruction to "use fixtures or
synthetic non-sensitive business data" compounds this — the repo already has
fixture infrastructure (`src/app/audit/fixture/`, specs 001/002) that the plan
does not mention or reuse.

**Cheaper form that survives:** each scenario file is a pointer, a task prompt,
a viewport pair, and the rubric — roughly 15 lines, citing the owning documents
by path rather than copying them.

---

## 6 · Timing

### F-10 · This builds design-agent infrastructure ahead of the gate that decides whether the product continues — **high**

`docs/NOW.md:9-13` states the current objective: the remaining Phase 3 gate is
"to produce the first founder-supervised real Indonesian report through the
actual product path and judge whether it contains a finding worth paying for."

`NOW.md:104-105`: "**If the first real report holds no finding worth paying
for, everything commercial stops until the method is fixed.**"

`NOW.md:26-28` also notes Wave 2 of the design pass (P2–P7) is itself explicitly
"gated on the report-quality gate." The plan proposes to add a design-knowledge
layer above a design pass that is deliberately paused for the same reason.

Against the standing instructions:

- `CLAUDE.md`: "raw-MVP mode: produce one functional touchpoint or one piece of
  real evidence at a time … avoid premature systems work."
- `AGENTS.md` working rule 4: "Do not add roadmaps, frameworks, schemas,
  trackers, or architecture unless the current deliverable cannot work without
  them."
- `AGENTS.md` working rule 2: "Work on one bounded deliverable that can be
  reviewed or tested today."

Five packages, two scripts, one public artifact, three scenario documents, a run
record format, and a new check is systems work by any reading. The intake-to-
report path works without all of it.

### F-11 · Step 5's baseline runs are unbudgeted paid observation — **medium**

Step 5 says to "run one baseline evaluation for each scenario using whichever
capable model/tool is convenient." The plan is careful that no provider call
enters CI or `npm run verify` — correct, and it satisfies reviewer question 6 —
but it says nothing about the runs themselves.

`NOW.md:87-89`: "Cumulative accounted private-run spend remains USD 0.4357,
leaving USD 4.5643 under the USD 5 ceiling. **No additional paid observation is
approved.**"

Three scenarios × mobile and desktop × any iteration is not free. This needs
either founder approval against the ceiling or an explicit statement that the
baselines run on already-paid-for tooling.

---

## 7 · Answers to the plan's own reviewer questions

1. **Does Nuave need new design-judgment guidance?** Mostly no. Seven of ten
   items exist canonically (F-6). Three are real gaps: card soup, prominence
   follows importance, mobile composition. The genuine problem is that judgment
   is split across a canonical doc (`VISION`/`PRODUCT`/`AUDIT`), an approved
   spec (006), and an **unapproved draft** (`SCREEN_CONCEPTS.md:3` — "Draft —
   unapproved working document. Do not implement from this") which contains the
   best design writing in the repository and which no agent is permitted to
   implement from. That is worth fixing — by promotion and linking, not
   re-authoring.
2. **Do any proposals introduce new product decisions?** Yes — "Provenance
   theater," by negation, against R-23 (F-1). Review the other nine against
   their owning documents before adoption, not after.
3. **Is `/design.md` useful?** Not yet, and not at the named URL (F-2, F-3,
   F-4). Its structural blocker is the locale contract, which no design
   document can carry.
4. **Is generation single-source-of-truth?** No — Package A breaks it first by
   copying `PRODUCT`/`VISION`/`AUDIT` rules into `DESIGN.md`, so the generator
   would then faithfully project a duplicate (F-7).
5. **Are three scenarios enough?** Three is the right number. The format is
   ~4× larger than it needs to be (F-9).
6. **Anything tied to a model or provider?** The scenario format is clean and
   genuinely model-agnostic — this is the plan's strongest section. The one
   coupling is unbudgeted spend, not vendor lock (F-11).
7. **Deterministic checks on matters that should stay judgment?** No. Package E
   is correctly restrained. Its checks guard only the new infrastructure — which
   is an argument for not building the infrastructure, not against the checks.
8. **Fewer files?** Yes. See below.

---

## 8 · Recommended counter-proposal

**Do now — one file, no new machinery:**

Add a `## Design judgment` section to `docs/DESIGN.md` containing:

1. A short routing list: the seven settled rules, each one sentence, each
   linking to its owning document (`VISION.md`, `PRODUCT.md`, `AUDIT.md`,
   `V1_PRODUCT_CONTRACT.md`, spec 006). No restated prose.
2. The three genuinely new rules: card soup, prominence follows product
   importance, mobile composition as a first-class state.
3. Package D's escalation ladder as one paragraph — judgment to prose,
   mechanics to tokens, deterministic to checks, one-off failures to nothing.
4. **Not** "Provenance theater." If a provenance rule is wanted, cite R-23's
   line instead: source labels required, confidence scores forbidden.

**Defer until after the Phase 3 report-quality gate:** Packages B, C, E, and
Steps 2–6.

**If Package B is later revived:** confirm the real domain, request founder
publishing approval explicitly, generate at build time rather than committing a
generated artifact with a freshness gate, and resolve the locale-contract
problem (F-4) first — otherwise the artifact produces work that cannot ship.

**If Package C is later revived:** three ~15-line prompt files in the existing
`docs/reviews/prompts/`, verdicts in the existing `docs/reviews/findings/`,
scenario inputs cited by path rather than copied, reusing the existing fixture
infrastructure. Zero new directories.

Net: the plan's stated goal — "the smallest durable system that makes
AI-produced Nuave interfaces more consistent" — is achieved by roughly 40 lines
in a file that already exists, and is undermined by everything else in it.
