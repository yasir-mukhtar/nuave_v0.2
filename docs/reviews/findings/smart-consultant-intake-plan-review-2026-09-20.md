# Review: the two smart-consultant intake plans

> Status: **Independent review — advice for the founder, not implementation authority**
> Date: 2026-09-20
> Reviewer: independent agent (Claude), no part in writing either plan
> Review lens, set by the founder: prefer the pragmatic plan that delivers the
> outcome over the methodical plan that strives for correctness.

Plans reviewed:

- **Plan A — “Confirmation-first”** (Codex):
  `docs/drafts/NUAVE_CONFIRMATION_FIRST_INTAKE_PLAN.md` on branch
  `codex/confirmation-first-intake-plan`.
- **Plan B — “Smart consultant”** (SOL):
  [`docs/drafts/SMART_CONSULTANT_INTAKE_PLAN_SOL.md`](../../drafts/SMART_CONSULTANT_INTAKE_PLAN_SOL.md)
  at commit `1d117de`.

I read both plans in full and checked their main code claims against the
current source. I made no provider calls and changed no application code.

## 1. Judgement

**Build from Plan B. Borrow six specific things from Plan A. Cut four things
from Plan B before it becomes a spec.**

Both plans diagnose the same problem correctly and propose the same shape:
name + URL → Nuave shows what it understood → one confirmation → only the
questions that matter → existing question review, audit, and report. Neither
adds a crawler, a chat box, or a second model call. The direction is not in
dispute; the difference is how close each one is to something a worker can
build this week.

**Why Plan B is closer to the outcome**

1. **It is buildable as written.** It has the field-by-field map from the
   existing extraction result to what the customer sees (§8.1), a small data
   shape, the exact steps of the one-click confirmation (§9.1), and a list of
   files per work block. Plan A describes the same behavior in prose and
   leaves all of that design to a later spec — one more planning round before
   any outcome.
2. **It makes the pragmatic cuts.** Manual location fallback in the first
   release; old browser sessions are restarted, not migrated; one live
   preparation check instead of five; product scope simply reuses the
   extracted offerings. Plan A requires real branch/product candidates for all
   three scopes, safe migration of old unfinished sessions, and a five-business
   live evaluation before release. Plan B names this exact danger in its own
   risk table: “Branch/product cases delay the whole outcome → confirmation-first
   never ships.”
3. **It turns the founder's wish into a number a test can fail.** Zero typed
   characters after `Periksa`, at most three content stages, at most four
   decisions, for a rich whole-brand case (§12.4). Plan A has a similar target
   but Plan B defines the terms tightly enough to automate.
4. **It is honest about what today's extraction cannot give.** There is no
   extracted field for service channels or for a list of locations. Plan B says
   so and uses a fixed four-choice click and a focused manual fallback. Plan A
   asks for “discovered targets” without saying where they would come from.
5. **Its test approach closes the real gap.** Today's synthetic extraction
   returns an empty draft, so current tests prove the pipeline but never the
   prepared experience. Plan B intercepts the two existing requests with rich,
   partial, conflict, and empty payloads that still run through the production
   mapping. (Plan A reaches the same conclusion; Plan B specifies it.)

**Where Plan A is better** — it has sharper product judgement in several
places, and one factual catch Plan B missed entirely. Those are the borrowings
in §3 below.

**Where Plan B drifts into the methodical trap** — its evidence-matching
machinery can quietly rebuild the questionnaire it is meant to remove. That is
the most important finding of this review; see §4.1.

### Code claims I verified

| Claim (both plans)                                                                                                    | Verified in source                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The extraction returns a rich draft, but intake keeps only category, offerings, customer needs, and competitor names. | `prepareBoundaryIdentity` in `src/lib/intake/preparation.ts` accepts only those four fields; market, target customer, decision criteria, USP, evidence, and warnings are dropped at the call site in `IntakeJourney.tsx`. |
| Prepared candidates arrive unselected, so the customer re-taps what Nuave already found.                              | Same function: every screen is built with `selected: []`.                                                                                                                                                                 |
| The brand card only echoes the typed name.                                                                            | Same function: label is `trimmedName`; the discovered display name is passed in and unused.                                                                                                                               |
| Target customer and buyer preferences never reach the question writer, although the writer can use them.              | `question-facts-v3.ts` sets `targetCustomer: null` and `buyerConstraints: []`; `questions-id-direct-ten.ts` prints both when present.                                                                                     |
| An older adapter invents completeness from unrelated fields (Plan B §9.4).                                            | `local-questions.ts` builds `target_customer` from the first customer reason and falls back to service-channel labels as “decision criteria”.                                                                             |
| The extractor writes English prose (Plan A only).                                                                     | `openai.ts`, `extractionRequest`: “Write all explanatory text in clear, natural English.”                                                                                                                                 |
| Identity `confidence` only means a display name was found (Plan B only).                                              | `source-identity.ts`: `confidence: Boolean(displayName)`.                                                                                                                                                                 |

## 2. What to keep from Plan B unchanged

- The decision summary (§1) and the “reading pipeline feeding a polite
  questionnaire” diagnosis (§2).
- Click first, type only as an escape hatch (§4.5), including length and
  sensitive-text guards on every text fallback.
- The field map (§8.1) as the backbone of the spec.
- Two separate values in the session: what Nuave prepared (never edited) and
  what the customer confirmed.
- One-click confirmation covers only what is visible; nothing hidden or
  collapsed is confirmed (§7.3, §9.1).
- No fabricated completeness (§9.4): never fill one field from a different
  meaning just to satisfy an old minimum.
- Reject old in-progress sessions and bump the frozen-input version together
  with the server literal (work block D). Nuave is pre-customer; nobody loses
  real work.
- The experience budget (§12.4) and the intercepted-request browser tests
  (§12.3).
- One PR, because every merge to `main` deploys; `NUAVE_NEW_AUDIT_ENABLED`
  stays the only off switch.

## 3. Borrow these six things from Plan A

### 3.1 Fix the extraction language — Plan B would ship an English summary

This is the most concrete gap in Plan B. The extractor is told to write
English. Today that barely shows, because the customer mostly sees chips. A
summary-first screen titled “Ini yang Nuave pahami” that then shows English
sentences for market, target customer, and differentiator would break the
consultant illusion on the first screen. Plan A §6 catches it: ask for concise
natural Indonesian display text while keeping official names, places, and
source wording as published. It is a one-line change to the existing request,
not a new call. Put it in work block B and add it to the rich-fixture test.

### 3.2 Look at real extraction output before designing around imagined output

Plan A's Step 0: use the private evidence already retained from the authorized
Masryef and earlier runs to see what a real draft contains — which fields are
filled, how good the evidence records are, what is empty. Neither plan author
has looked. This costs nothing, needs no new authorization if the retained
evidence is used, and should decide two open questions before code: whether
the provenance labels are worth their cost (§4.1) and whether a required
customer-context question (§4.3) would fire on almost every business. If no
retained draft is usable, ask the founder for one preparation-only call on the
current app — before building, not after.

### 3.3 Make competitors optional

Plan B keeps “named comparison candidates or explicit category alternatives”
as a required meaning. Plan A points out that the direct-ten question method
needs no named competitor, so the question can be optional, with “Lewati /
belum tahu” meaning _unknown_ — not “there are no competitors”. This removes
one forced decision from every journey and one way for a thin extraction to
push the customer back into question-answering. Suggested competitors still
appear on the summary when the extraction returns them; they just never block.

### 3.4 One confirmation on the happy path, not two

Plan B's rich path is: summary → **Ya, sudah tepat** → final confirmation →
**Buat pertanyaan audit**. When nothing needed clarifying, the second screen
shows the same content the customer approved seconds ago. Plan A's flow is
better: follow-ups (if any) return to the _same_ summary, and one action —
“Sudah sesuai — buat pertanyaan audit” — confirms and proceeds. Recommendation:
a separate final review appears only when a clarification or correction changed
something after the first confirmation. For the rich whole-brand case the
budget then becomes two stages, not three.

### 3.5 The “amendments” table

Plan A §3 lists each currently locked rule next to its proposed replacement
(the September 5 handoff forbids skipping screens; each screen must be
committed individually; provenance is hidden; competitors are required;
optional screens are mandatory). Plan B folds this into “founder decisions”
but never names the rules being overturned. The spec should carry Plan A's
table so the founder approves the overrides knowingly and they land in
`docs/DECISION_LOG.md` once, instead of surfacing later as a review blocker.

### 3.6 When the summary is thin, find which layer lost the information

Plan A Slice 3: for each missing fact, say whether the website lacks it, the
fetch failed, the extraction missed it, the mapping dropped it, or the screen
hid it — then fix that layer, with one regression example. Do not tune the
prompt repeatedly without a named failure. Keep this as a working rule for the
live check, **not** as a build phase. Plan A's “read up to four more pages”
idea stays out of the first release, as Plan B already says; revisit it only
if the live check shows the website had the facts and the extraction missed
them.

## 4. Cut or simplify these four things in Plan B

### 4.1 Drop per-item evidence matching (§8.2) — it can rebuild the questionnaire

Plan B matches each displayed value to an evidence record by exact normalized
text. If no record matches, the value is downgraded to “Saran Nuave” or “Perlu
dipastikan”, and **a required unmatched value enters the clarification queue.**

The evidence `field` and `value` are free text written by a model. Exact
matches will often fail for harmless reasons — wording, punctuation, and
certainly after the summary text becomes Indonesian (§3.1). The likely result:
a correctly extracted category or offering gets flagged as unsupported and the
customer is asked about it again. That is the questionnaire returning through
the back door, in the name of correctness. It also brings a per-field mapping
table, a per-item data wrapper, conflict detection between “distinct supported
values”, and five customer-facing labels — a lot of machinery whose only
customer-visible product is a small label.

The extraction prompt already does the honest work: every ordinary fact must
be supported by the official website, and `similar_businesses` is explicitly
the one suggestion list. So provenance can come from **which field a value
came from**, with no matching at all:

| Shown to the customer | Rule                                                    |
| --------------------- | ------------------------------------------------------- |
| **Dari website Anda** | Any value from the extraction, except the two below.    |
| **Saran Nuave**       | `similar_businesses`, and `target_customer` when shown. |
| **Dari Anda**         | Anything the customer typed or changed.                 |

Three labels, zero matching logic, and no path by which a good extraction
produces extra questions. Keep the source links available behind a small
“lihat sumber” disclosure if the evidence list is non-empty. Drop “Sumber
berbeda” as a label: a single extraction returns one category, so a true
source conflict has no way to arise in the first release. The one real
conflict — typed name versus discovered name — is handled in §4.2.

A value goes to the clarification queue for exactly one reason: **it is
required and empty.**

### 4.2 Shrink identity mismatch detection to “show both names”

Plan B asks the spec to define a “conservative deterministic comparison” of
the typed and discovered names. That is a small research problem (“Masryef” vs
“Masryef Advisory — Konsultan Pajak Jakarta”). Simpler: the identity row shows
the typed name and, when different, the name found on the site, as two
selectable options with the typed name preselected. The customer's one-click
confirmation settles it. No comparison algorithm, no blocking state. Block
only when the source could not be read at all, which the failure table already
covers.

### 4.3 Do not make a customer-context answer mandatory (founder decision 6)

Plan B recommends requiring one customer need or target-customer answer before
questions. But the extraction prompt deliberately says “Do not infer … target
demographics”, so `target_customer` will often come back empty, and this
requirement would put a forced question in front of many customers. The writer
already copes with the gap — it lists “kebutuhan pelanggan” under unknowns.
Follow Plan A: customer context is optional, proposed when found, reachable
from an optional “Tambah detail” action, and never blocking. Let §3.2's look at
real drafts confirm this. If question quality later suffers, make it required
then, with evidence.

### 4.4 Trim the verification load to what protects the outcome

Fifteen acceptance criteria plus three test matrices is a lot of ceremony for
a pre-customer trial whose report the founder has already called “not useful
enough yet”. Every day spent here delays that work. Suggested minimum for the
spec:

1. Rich whole-brand case: zero typing after `Periksa`, within the stage and
   decision budget, entered through the real route with intercepted requests.
2. Exactly what was visible and confirmed reaches the frozen input and the
   question writer — including target customer and decision considerations
   when confirmed — and nothing else does.
3. Partial and empty extraction: only required-and-empty meanings are asked;
   no fixture facts appear for an entered business.
4. Product scope picks an extracted offering without typing; location scope
   shows the honest manual fallback.
5. Reload, Back, and double-click never repeat a paid request; an edit after
   questions exist invalidates the pack.
6. The existing question review → audit → report → downloads path still
   passes, and `npm run verify` is green.
7. Founder walkthrough on desktop and phone: “does this feel like confirming a
   consultant's work?”

The accessibility items in Plan B §12.2 are right but mostly come free from
reusing the existing shadcn/Base UI controls; assert them where a new
component is introduced, not as a separate matrix. Session-migration tests
disappear because old sessions are rejected.

## 5. Recommended sequence

Small enough that each step produces something the founder can look at.

1. **Look at real drafts (half a day, no code).** §3.2. Settle the provenance
   labels and the optional-customer-context question from what is actually
   there.
2. **Founder decisions.** Plan B §16, amended: competitors optional (§3.3);
   customer context optional (§4.3); single confirmation on the happy path
   (§3.4); three field-based labels (§4.1). Present them in Plan A's
   “current rule → replacement” table (§3.5) and log them once.
3. **One spec (next free number), then one PR**, built in this order inside
   the branch so there is something to see early:
   - **a. Stop losing data.** Pass the full draft through; Indonesian display
     text; proposals preselected; discovered name shown. _Even inside the
     current screens this already removes most tapping — a useful checkpoint
     for a founder look on a local preview._
   - **b. Summary screen + one-click confirmation + scope choice**, with the
     existing category/offering/market/competitor editors reused as the
     per-row correction surfaces.
   - **c. Clarification stage** for required-and-empty meanings only (service
     channels, market reach/area, location/product target).
   - **d. Handoff.** Distinct target customer and decision considerations
     through the frozen input to the writer; version bump; old sessions
     rejected; remove the invented-completeness fallbacks.
4. **Offline verification** per §4.4, then **one authorized live preparation**
   on a founder-chosen business, judged with Plan B §13's measures (typed
   characters, decisions, corrections, time) and Plan A's failing-layer rule
   (§3.6) for anything missing.
5. **Decide from that one run** whether retrieval needs work. Only then
   consider Plan A's bounded extra-page reading.

## 6. Risks that remain under either plan

- **Thin extraction is the real unknown.** A domain-restricted web search on a
  small Indonesian business site, or an Instagram-only business, may return
  little. The design degrades honestly, but the “smart consultant” feeling
  depends on extraction quality that neither plan has measured. Step 1 above
  is the cheapest way to find out early.
- **Preselected proposals invite careless confirmation.** Both plans accept
  this trade. The mitigation that matters is keeping the summary short enough
  to actually read — five or six rows, not a dashboard. Resist adding rows.
- **This work competes with report usefulness.** The founder's standing
  verdict is that the report is not yet useful. A smoother intake feeding the
  same report does not change that. Keeping this change small is the way to
  get back to it quickly.

## 7. Next smallest useful action

Founder reads §1 and §3–§4, then answers the four amended decisions in §5
step 2. With those answers, the orchestrator can turn Plan B plus this review
into one draft spec without another planning round.
