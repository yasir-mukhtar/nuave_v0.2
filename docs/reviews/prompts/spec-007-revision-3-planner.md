# Task — write revision 3 of Spec 007

You are producing **revision 3** of `specs/007-intake-airbnb-revamp/SPEC.md`.

Revision 2 was adversarially reviewed and found **not ready**: five blockers,
fourteen material gaps. Four founder decisions and one live network test have
since resolved most of them, and the scope has been narrowed to **flow-first**.

Your job is to write revision 3 against that narrowed scope, incorporating the
decisions and verified facts below. **You are not re-reviewing the spec** — the
review is done and its conclusions are given to you.

---

## Scope change: flow-first

Revision 2 tried to land the payment boundary, a global design-token migration, a
global focus migration, the question-pack change, and the whole new journey in one
spec. Revision 3 delivers **a working journey first**.

**In scope**

- The journey state machine: `AuditWorkflow` step ownership, persistence shape,
  restore behavior, browser history.
- The unpaid identity boundary — **website sources only**.
- The manual brand-name fallback (see D-11).
- All journey screens, built at `/audit/v2` on the **tokens that exist today**.
- The question pack moving to 6 unbranded / 4 branded, and the guard-derivation
  refactor that must precede it.
- Per-screen and final validation, error routing, confirmation.
- Payment as a click-through simulation with its disclosure, with the `paid` flag
  present in state but not defended.

**Explicitly deferred — do not plan these**

- Real payment enforcement / server-side gate / Midtrans Snap.
- The Instagram identity parser.
- The global design-token migration, the global focus migration, and deleting
  `tweakcn-intake.css` (revision 2 phases 3, 4, 5).
- Moving `/audit/v2` to `/audit`, and superseding spec 004.
- Google Maps sources, analytics, durable persistence, accounts, real email.

The deferred design migrations are polish. They were also the sole reason
revision 2 had to warn that the old `/audit` route stops being a usable
comparison baseline, and the reason its phase 2 disturbed live surfaces early.
Removing them from scope removes both problems. Say so in the spec's non-scope
section rather than leaving it implied.

---

## Settled decisions — do not reopen

D-1 through D-8 from revision 2 remain binding **except where superseded below**.
New decisions, taken 2026-08-30:

**D-9 · The paywall is real by design, bypassable for now.**
The `paid` flag is client-side and bypassable until Midtrans is wired in. The
spec must say this plainly rather than implying enforcement. Remove revision 2's
"never a silent second charge" and "does not double-charge" language — there is
no charge to duplicate. Record that `/api/audit/extract` needs a server-side gate
before real money moves.

State explicitly that the exposure is **founder cost, not customer fraud**: each
extraction is a real provider call (≈USD 0.003, per the 2026-08-17 decision-log
entry), and the USD 5 carryover ceiling is currently the only bound on an open
endpoint. Name that ceiling as load-bearing.

**D-10 · `businessBriefSchema` may change.**
This supersedes revision 2's stop-condition clause *"decomposing the intake
requires changing `businessBriefSchema` field definitions rather than only their
collection order."* Reword that clause so a schema change reads as approved.

**D-11 · Manual brand-name entry returns as a fallback only — never an option.**
It appears only *after* identification fails. It is never presented on the source
screen. Two conditions:
- a typed name is **unverified**; the reveal must say "we couldn't read this
  source — confirm your business name," never "we found your business";
- this is not the prototype's `Mulai tanpa sumber` path, which stays deleted — that
  admitted people with no source at all.

This satisfies `PRODUCT.md:113-115` ("If a confident business name cannot be
found, ask for the name and location needed to present the order; never guess
between branches") **without amending it**. Revision 2 planned to leave that
sentence contradicted; revision 3 must not.

**D-12 · The comparison category carries the two unbranded questions.**
Slot 6 (`NUAVE-BRAND-COMPARISON-02`) flips from branded to unbranded. Every other
slot is untouched. See "The ten slots" below.

**D-13 · Flow-first scope**, as set out above.

---

## Verified facts — use these, do not re-derive

Every item below was checked against the working tree on branch
`feat/intake-big-revamp`. Revision 2 contains factual errors in two of these
areas; where this section and revision 2 disagree, **this section is correct**.

### The ten slots (`contracts.ts:153`, mirrored at `questions-id.ts:352`)

| # | Slot id | Category | Branded today |
|---|---|---|---|
| 1–2 | NEED-01/02 | need_discovery | no, no |
| 3–4 | SOLUTION-01/02 | solution_discovery | no, no |
| 5 | COMPARISON-01 | comparison | no |
| **6** | **COMPARISON-02** | **comparison** | **yes → flip to no** |
| 7–8 | VALIDATION-01/02 | validation | yes, yes |
| 9–10 | ACTION-01/02 | action | yes, yes |

**Revision 2's R-06 is wrong about this.** It claims 6/4 works by giving "one
category two unbranded questions, the other four one unbranded and one branded
each" — an *interleaved* layout. The real layout is **blocked**. Implemented
literally, R-06 would move four slots and change what the validation and action
questions mean. Replace R-06's reasoning with this table.

Slot 6 is also the designated competitor slot (`questions-id.ts:598`,
`contracts.ts:726`). Unbranded, it becomes *"asked about your competitor, does AI
mention you anyway?"* — spontaneous appearance in a competitive comparison.
Record this as an intended improvement, not a side effect.

### The question-mix safety rule — three layers, two already safe

**Layer 1 — `contracts.ts:711-722` is already correct.** It selects which
questions to name-check by reading each question's own branded flag
(`.filter((prompt) => !prompt.branded)`), not by slot number. Flipping slot 6 in
`PROMPT_MATRIX` extends the check automatically. Its competitor check
(`contracts.ts:726`) keys on the slot id `NUAVE-BRAND-COMPARISON-02`, not the
number 6.

**Layer 2 — reported denominators are already text-derived.**
`classifyIndonesianQuestion` (`questions-id.ts:300`) reads final question text and
ignores slot position, so a leaked question is counted correctly. The
customer-facing number is not at risk. This is also what already satisfies the
2026-08-17 decision-log requirement to derive denominators from the actual final
pack.

**Layer 3 — `questions-id.ts` hardcodes positions.** Two guards:
`slot <= 5` (identity leakage, `:585`) and `slot !== 6` (competitor leakage,
`:598`). These run *before* the customer sees anything.

**The actual failure if slot 6 flips without touching layer 3:** the model knows
the brand name (needed for slots 7–10), so a leak into slot 6 is plausible.
Nothing blocks it, so a question labelled "tanpa menyebut bisnis Anda" that names
the business reaches the review screen. If approved, layer 2 classifies it as
branded, the pack comes out 5-and-5, and a hardened `!== 4` validator then hard-
blocks the customer at the end of intake because of a question generated six
screens earlier.

**Required plan:** refactor layer 3 to derive from the matrix the way layer 1
already does — `slot <= 5` becomes "is this slot unbranded per the matrix";
`slot !== 6` becomes "is this the designated comparison slot per the matrix" —
**then** flip slot 6. `questions-id.ts` imports only `./types` and `contracts.ts`
does not import it back, so it can read `PROMPT_MATRIX` directly with no cycle.

**Required test**, because no existing test would catch this: not a count, an
agreement check — *for every slot the matrix marks unbranded, a question
containing the brand name must be rejected*, derived from the matrix, never from
a literal. Revision 2's acceptance criteria (counts and category distribution)
are structurally incapable of detecting this.

**Open item to confirm during planning:** whether the live Indonesian pack also
runs through `validatePromptPack`, and whether its `branded` flags come from text
classification or from the slot matrix. This determines whether layer 1's
protection covers the live path or only the deterministic fallback.

### Every site that must change for 6/4

Revision 2's R-07 table is incomplete. It omits the files that actually determine
composition. The full set:

| Site | What |
|---|---|
| `contracts.ts:153` `PROMPT_MATRIX` | slot 6 branded flag — **omitted by R-07** |
| `questions-id.ts:371-378` `INDONESIAN_SLOT_MATRIX` | `default_branded: index >= 5` — **omitted by R-07** |
| `questions-id.ts:585` | identity-leakage guard `slot <= 5` — **omitted by R-07** |
| `questions-id.ts:598` | competitor guard `slot !== 6` — **omitted by R-07** |
| `contracts.ts:336-337` | `unbranded_prompts: 5` / `branded_prompts: 5` |
| `contracts.ts:343-344` | `five_unbranded` / `five_branded` flags → composition-neutral names |
| `contracts.ts:777` | branded count `!== 5` → `!== 4`, message updated |
| `types.ts:171-172` | `five_unbranded` **and** `five_branded` (R-07 lists only the first) |
| `locked-question-pack.ts:16` | matrix consumer — **omitted by R-07** |
| `fixtures/report-golden.ts:76` | matrix consumer — **omitted by R-07** |
| `questions.test.ts:94-99` | pins matrix per-slot |
| `contracts.test.ts`, `wave2-route-contract.test.ts` | expectations |
| `fixtures/fixture-kopi-taman-senja.ts` | pack composition |
| `AuditStages.tsx:644` | customer-visible string, currently *"Nuave builds five unbranded and five branded questions from these"* — body copy, not a group heading as R-07 says, and currently in English |
| `docs/content/website/FAQ.md:61` | *"lima pertanyaan tanpa nama bisnis Anda dan lima…"* |

`V1_PRODUCT_CONTRACT.md:299` already warned about `PROMPT_MATRIX`. It is in the
spec's own required reading.

### `businessBriefSchema` (`types.ts:63-96`) — what D-6 must actually constrain

D-6 makes every presented field required. These fields are currently
unconstrained, and they are exactly the screens revision 2 strips "Opsional" from:

| Field | Screen | Current constraint |
|---|---|---|
| `verified_customer_needs` | customer reasons | `.max(12)` — no `.min`, `[]` valid |
| `verified_decision_criteria` | customer reasons | `.max(12)` — no `.min`, `[]` valid |
| `verified_competitor.name` / `.scope` | competitors | plain `z.string().trim()` — `""` valid |
| `customer_supplied_facts` | facts | `.max(20)` — no `.min`, `[]` valid |

Revision 2's R-51 enforces D-6 by requiring each screen's fields to "satisfy their
`businessBriefSchema` constraints" — which on these screens is always true, so
Next never disables. Per D-10 the schema may now be tightened. Name the exact
constraint changes in the spec.

Also resolve R-51's internal contradiction: it pairs a **disabled** Next button
with "a customer-facing Indonesian reason on the responsible field." A disabled
control announces nothing. Pick one mechanism.

(R-51's diagnosis of current behavior is correct and worth keeping:
`friendlyBriefError` at `AuditWorkflow.tsx:209` emits raw schema paths such as
`Lengkapi verified_offerings.0: …`.)

### Identity endpoint — tested 2026-08-30

A plain server-side fetch (`curl/8.7.1`, no browser, no API key, no login)
returned HTTP 200 and a usable `og:title` for `instagram.com/instagram`,
`/natgeo`, and `/kopikenangan.id`. A normal website (`kopikenangan.com`) returned
a clean `<title>`, a real `og:site_name`, and a genuine `og:description`.

Three corrections to revision 2's R-10, which apply to the **website** parser now
and to the Instagram parser when it is picked up later:

1. **`og:site_name` does not exist on Instagram.** R-10 lists it as a field to
   read. Instagram's name lives in `og:title` and must be split on ` (@`.
2. **Instagram's `og:description` is follower counts** — *"751K Followers, 18
   Following, 3,928 Posts…"*. It must never become the reveal's description.
3. **`og:image` is a signed, expiring `scontent.cdninstagram.com` URL.** It cannot
   be linked directly — it expires, and rendering it in the browser fails
   `tests/e2e/network-guard.ts`, which rejects **every** non-localhost request.
   Proxy it or omit the icon.

Point 3 applies to website favicons too. Plan for a same-origin proxy or an
inlined icon; a direct third-party image URL breaks the offline-network suite.

**Untested and still deferred:** whether Instagram fetching survives Cloudflare
Workers' datacenter egress. Not needed for revision 3 — Instagram sources route to
the D-11 fallback.

**Also specify** what revision 2 omitted entirely for this endpoint: allowlist or
scheme/IP restriction, redirect cap, response size cap, timeout as a *control*
rather than only a failure state, and a rate limit. It is an unauthenticated
public route that fetches user-supplied URLs server-side.

### Sequencing and test facts

- `tests/e2e/landing-audit-handoff.spec.ts:160` asserts `extractCalls === 1` after
  a valid landing submission, and it is in the **default** `testMatch`
  (`playwright.config.ts:13`). Any change to the landing→extract handoff red-lines
  the main suite. Revision 2's claim that *"existing Playwright files keep passing
  against `/audit` until R-59"* is false; do not repeat it.
- `tests/e2e/wave1-workflow-lifecycle.spec.ts` matches **no** configured
  `testMatch` across all three configs. It cannot be claimed as coverage until it
  is added to one.
- `tests/e2e/network-guard.ts:3` treats every non-localhost hostname as a
  violation.
- Since revision 3 builds only at `/audit/v2` and does not rewire the landing
  page, the live funnel stays intact. State the sequencing constraint explicitly
  anyway, so the deferred payment work inherits it.

### Component stack

The repo is **Base UI**, not Radix. `components.json` sets `"style": "base-nova"`,
and every primitive imports from `@base-ui/react` (accordion, badge, button,
checkbox, input, progress, separator, sheet). A `@beui` registry is configured,
and `DESIGN.md:50` requires recording BeUI provenance.

Revision 2's R-37 says `npx shadcn add radio-group toggle-group card`, which
resolves against the default registry and pulls **Radix** — forking the primitive
stack. Correct it to Base UI / `@beui` sources. `card`, `radio-group`, and
`toggle-group` are genuinely absent from `src/components/ui/` and are genuinely
needed.

### Canon reconciliation still required

- **`DECISION_LOG.md` carries three SETTLED 5/5 entries**, not one: 2026-07-29
  (`:34`), 2026-07-31 (`:41`), 2026-08-17 (`:60`). Revision 2's R-02 supersedes
  only the third. Supersede all three and update the supersession table at
  `:98-101`.
- **The 2026-08-17 entry calls 5/5 a *default coverage brief*** that "customers
  may freely replace… and alter the default composition." Revision 2's D-2 calls
  6/4 "canonical" and R-06 hardens the validator to reject anything but exactly 4
  branded — which would reject a legitimately customer-edited pack, the freedom
  R-08 depends on. Resolve this: either the validator checks the *suggested*
  pack only, or the hard rejection goes. Note that layer 2 above already handles
  post-edit composition correctly, so the honest answer is probably that the
  validator binds generation, not the final pack.
- **`V1_PRODUCT_CONTRACT.md` records a second open conflict** — factual-lookup
  questions in slots 7–8, `docs/journey/04-questions.md` ~line 457. Phase 1
  rewrites the generation brief, the exact surface. Resolve it or explicitly defer
  it with a reason.
- **`PRODUCT.md:113-115`** is satisfied by D-11 without amendment. Say so.
- **`PRODUCT.md` Google Maps** (`:109`) still needs the revision-2 R-05 amendment.

### Small factual corrections to carry forward

- `--destructive-foreground` and `--color-destructive-foreground` do **not** exist
  (`globals.css` has only `--destructive: var(--red)` at `:23` and
  `--color-destructive` at `:443`). If any deferred work needs it, both
  declarations are required, not just the token.
- `--focus-ring` (`tokens.css:184`) is genuinely dead, but so are
  `--focus-ring-color`, `--focus-ring-offset`, `--focus-ring-width` (`:185-187`).
  Revision 2 deletes only the first. (Deferred with the focus migration.)
- `SavedState` already has `websiteUrl` as its first field
  (`AuditWorkflow.tsx:82`); revision 2's R-55 lists "source URL" as a new addition.
- `--chart-1..5` already exist at `globals.css:35-39` aliased to text/border
  tokens. Revision 2's R-27 says they are "not added." `recharts` is installed with
  zero importers.
- Revision 2's citations drift 2–5 lines in roughly eight places
  (`PRODUCT.md:107/108/118/120/161`, `V1_PRODUCT_CONTRACT.md:52`,
  `VOICE.md:39/165`, `contracts.ts:770`, `playwright.config.ts:12`). Verify every
  line number you cite before writing it.

---

## What revision 3 must contain

Standard spec shape per `docs/WORKFLOW.md:116-126` — user outcome, scope,
non-scope, customer-visible failure states, observable acceptance criteria,
resolved product decisions. Plus:

1. **A phase order matching the flow-first build sequence**, roughly:
   journey state machine → identity endpoint (website only) → manual-name fallback
   → screens and composition primitives at `/audit/v2` → guard refactor then slot-6
   flip (independent, can run in parallel) → validation and error routing.
2. **A screen-to-schema mapping** naming which `BusinessBrief` fields each screen
   writes, including how customer reasons splits across `target_customer`,
   `verified_customer_needs`, and `verified_decision_criteria`. Revision 2's R-50
   is a good starting point.
3. **Restore behavior for every journey state**, and a browser-history contract.
4. **Explicit acceptance criteria that could fail.** Revision 2's Phase 1 criteria
   could not detect its own principal risk; do not repeat that shape.
5. **A non-scope section** that names the deferred design migrations and says why
   deferring them removes the baseline problem.
6. **Register the spec in `docs/INDEX.md`.** Spec 007 is currently absent while
   001–004 and 006 are listed. Its own required reading opens with
   `INDEX.md §Authority`.
7. **Governance housekeeping:** `intake-prototype.html` and `prepay-handoff.md` are
   untracked in git, and the spec treats the prototype as the sole comparison
   baseline. Commit them, or stop relying on them as a baseline.

## Rules

- Do not reopen D-1 through D-13.
- Verify every line number before citing it. Revision 2 opened by correcting nine
  factual errors and still shipped drift in eight citations.
- Where revision 2 and the "Verified facts" section disagree, this prompt wins.
- Do not cite the previous review as a source — it exists only as an untracked
  prompt file, and its findings are reproduced here instead.
- If planning reveals a missing product decision, stop and return it rather than
  inventing an answer. Revision 2 wrote "Open questions: None" while leaving two
  unresolved (R-25's motion approach, R-30's undefined subtree boundary).
- Do not run live or paid provider calls at any point.
