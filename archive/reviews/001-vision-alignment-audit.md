# Nuave vision alignment audit — 001

> Status: Review artifact. No canonical file was changed by this review.
> Date: 2026-08-09
> Scope: `docs/PRODUCT.md`, `docs/AUDIT.md`, `docs/NOW.md` reviewed against the
> canonical `docs/VISION.md` (2026-08-09 adoption) and the 2026-08-08 /
> 2026-08-09 entries plus "Superseded directions" table of
> `docs/DECISION_LOG.md`.
> Method: full read of the seven core documents in INDEX order, then the
> dated decision-log entries and superseded table only. No archive, draft,
> experiment, prototype, or code was read.

## Executive summary

The three downstream documents are in good shape: all were last updated on
2026-08-09, the same day the independently rewritten vision was adopted, and
`docs/INDEX.md` already anticipated this alignment review ("alignment review
follows the vision promotion"). The authority chain is stated correctly in all
three documents ("where they disagree, the vision governs"), the buyer shift
from agency to direct owner is fully propagated, the Indonesian requirement is
carried with honest flagging of known English gaps, and the banded-score /
counts-with-denominators decision is reflected consistently.

Six findings, all low-to-medium priority; none blocks the current pipeline
work and none requires a new product decision — each fix aligns downstream
wording with already-settled canonical text (one finding is a contradiction by
omission in PRODUCT.md's restatement of the settled build order; the rest are
framing, wording, or missing-implication items). One additional note records a
count inconsistency inside the decision log itself (seven vs. nine principles)
that is resolved by the authority chain but worth a clarifying row.

No A-class finding contradicts the vision's substance; the closest is VA-01,
where PRODUCT.md restates the 2026-08-09 build order without its
report-quality gate.

## Findings

### VA-01 — PRODUCT.md build-order restatement drops the report-quality gate

| Field | Value |
|---|---|
| 1. Finding ID | VA-01 |
| 2. Classification / priority | **A — Direct conflict** (with a newer settled decision) · Medium |
| 3. Affected file / section | `docs/PRODUCT.md` — "Customer journey" intro (paragraph before step 1) |
| 4. Canonical reference | `DECISION_LOG.md` 2026-08-09 (build-whole-journey order, step 2: "a gate — read the pipeline's first real report and stop if it holds no finding worth paying for"); supported by `VISION.md` principle 6 (fail clearly rather than invisible manual rescue) |
| 5. Explanation | PRODUCT.md claims to restate "the current build order … [per] the newest founder-approved entry", then lists "the measurement path first (steps 4 to 6), then payment and report persistence (step 3), then one polish pass … then owners". The report-quality gate — step 2 of the settled order, positioned between the measurement path and payment/persistence — is silently omitted. A reader of PRODUCT.md alone would sequence straight into payment without the stop-if-no-finding gate. The mapping of journey steps to the order is otherwise correct (steps 4–6 = measurement path, step 3 = payment/persistence). |
| 6. Smallest revision | Either insert the gate into the parenthetical (mirroring NOW.md's "A report-quality gate comes immediately after the pipeline" bullet), or delete the restatement and defer entirely to `NOW.md` / `DECISION_LOG.md`, which PRODUCT.md already names as the owners of build order. |
| 7. Resolution | **Mechanical alignment — orchestrator may resolve.** No product decision involved; the gate is already settled and already stated in NOW.md. |

### VA-02 — AUDIT.md customer framing narrows the canonical user to "the owner"

| Field | Value |
|---|---|
| 1. Finding ID | VA-02 |
| 2. Classification / priority | **B — Outdated assumption** (narrower customer definition than canonical) · Low |
| 3. Affected file / section | `docs/AUDIT.md` — header "Customer context" block; also "Purpose" ("an Indonesian business owner can read in ten minutes") and Report format ("prepared for the business owner") |
| 4. Canonical reference | `VISION.md` "Who Nuave serves": the person accountable for marketing performance in an Indonesian SMB — "the owner, a marketing lead, or another decision-maker"; `PRODUCT.md` "Customer": "owner or marketing decision-maker" |
| 5. Explanation | The canonical vision deliberately names three possible users; PRODUCT.md reflects this ("owner or marketing decision-maker"), but AUDIT.md's header states "the customer is the owner of a small or medium Indonesian business". The audit method itself does not depend on which of the three roles buys, so the header is a framing statement, not a method constraint — but as written it under-states the canonical customer and will propagate "owner-only" language into the report's prepared-for line. |
| 6. Smallest revision | Widen the header wording to mirror PRODUCT.md ("the owner or marketing decision-maker of a small or medium Indonesian business, ordering an audit of the business they are accountable for") and soften the Purpose/prepared-for lines to "business owner or marketing decision-maker" or keep "prepared for the business owner" as acceptable operational shorthand. |
| 7. Resolution | **Mechanical alignment — orchestrator may resolve.** If the founder prefers owner-centric language for the method, that is a conscious deviation to record; the default is to follow the vision's wording. |

### VA-03 — NOW.md still frames the universal prompt matrix as the working default scope

| Field | Value |
|---|---|
| 1. Finding ID | VA-03 |
| 2. Classification / priority | **B — Outdated assumption** (reflects a superseded direction) · Low |
| 3. Affected file / section | `docs/NOW.md` — "What is known": the two bullets on the universal brand prompt context / `generate-ai-visibility-prompts` skill and the universal matrix |
| 4. Canonical reference | `DECISION_LOG.md` "Superseded directions": "Universal multi-industry prompt matrix as the default scope → SUPERSEDED → One vertical in one city until it works"; `PRODUCT.md` journey step 1: "Pick one vertical in one city" |
| 5. Explanation | NOW.md describes the universal matrix as "the working method" that "support[s] varied business categories through one verified brand scope". The superseded table replaced the universal matrix as the default scope with one-vertical-in-one-city, and PRODUCT.md already implements that. The NOW.md bullets are hedged ("not validated cross-industry proof") but still present multi-category support as the active framing rather than the one-vertical-one-city default, so a fresh session could re-infer the superseded default. |
| 6. Smallest revision | Reframe the two bullets to state the scope default explicitly (e.g. "the prompt template is the mechanism; the active scope remains one vertical in one city until it works") or mark the universal matrix as superseded tooling retained for later use. |
| 7. Resolution | **Mechanical alignment — orchestrator may resolve.** No product decision; the scope default is already settled and stated in PRODUCT.md. |

### VA-04 — PRODUCT.md states the band's reliability property as fact before it is measured

| Field | Value |
|---|---|
| 1. Finding ID | VA-04 |
| 2. Classification / priority | **C — Unproven downstream commitment** · Medium |
| 3. Affected file / section | `docs/PRODUCT.md` — "How results are reported", second paragraph ("A band only changes when something real has changed, which means a re-check cannot show an owner an improvement they did not earn or a decline they did not cause") |
| 4. Canonical reference | `VISION.md` principle 2 (avoid exact-looking claims until their reliability is demonstrated); `AUDIT.md` band rules ("the band must be wider than the observed variation between identical runs … and it has never been measured"); `NOW.md` "What is not known" ("How wide the score bands need to be … has not been measured") |
| 5. Explanation | PRODUCT.md asserts as an accomplished property that a re-check "cannot show an owner an improvement they did not earn". That guarantee depends on the band being wider than run-to-run variation — which AUDIT.md and NOW.md both record has never been measured (it is the explicit purpose of re-asking two or three questions in NOW.md's Do-now item 6). The same idea in AUDIT.md is correctly phrased as a requirement ("must be wider than … so that a change in the band means a change in the world"). PRODUCT.md overstates the current state of evidence. |
| 6. Smallest revision | Rephrase as design intent / requirement, matching AUDIT.md's conditional framing ("the band is designed so that …"), so the property is presented as the goal the method enforces, not as an already-demonstrated fact. |
| 7. Resolution | **Mechanical alignment — orchestrator may resolve.** Wording-only; the banded-score decision itself is settled. |

### VA-05 — Report-as-argument-for-approval is not operationalized downstream

| Field | Value |
|---|---|
| 1. Finding ID | VA-05 |
| 2. Classification / priority | **D — Missing implication** · Low |
| 3. Affected file / section | `docs/PRODUCT.md` — "Customer journey" step 6 (Delivery contents) and "Current success signals"; `docs/AUDIT.md` — "Report format" (prepared-for line and Main Result list) |
| 4. Canonical reference | `VISION.md` "Who Nuave serves": the report "must therefore help the primary user do two things: understand the evidence and communicate its significance to the people who approve action"; principle 5: the report must be shareable with leadership and the person who will carry out an action |
| 5. Explanation | The vision explicitly assigns the report a second job: it is the artifact the primary user takes to a budget holder or implementer. Downstream documents cover durability and private access but never state this share-to-approver function. PRODUCT.md's delivery list (headline counts, what was tested, appearances, competitors, inaccuracies, top three actions, sources/limitations) stops at the owner; AUDIT.md's prepared-for line names only the owner. The function is implied (the report is downloadable) but never declared, so it is easy to drop from the delivery spec. |
| 6. Smallest revision | Add one line to PRODUCT.md step 6 (e.g. "the report is designed to be shared with the person who approves or completes an action") and/or AUDIT.md report format, so the design constraint is explicit. |
| 7. Resolution | **Mechanical alignment — orchestrator may resolve.** Additive copy derived directly from canonical vision text; no product decision. |

### VA-06 — PRODUCT.md customer definition drops the vision's initial-focus qualifier

| Field | Value |
|---|---|
| 1. Finding ID | VA-06 |
| 2. Classification / priority | **D — Missing implication** · Low |
| 3. Affected file / section | `docs/PRODUCT.md` — "Customer" section (first paragraph) and journey step 1 ("Pick one vertical in one city") |
| 4. Canonical reference | `VISION.md` "Who Nuave serves": "The initial focus is businesses whose customers research and compare options before choosing, and for which accurate representation during that process can materially affect consideration" |
| 5. Explanation | PRODUCT.md's customer is "a small or medium Indonesian business that depends on being chosen locally". The vision's initial-focus qualifier — customers research and compare before choosing, and representation affects consideration — is absent. "Chosen locally" is a different (compatible but incomplete) filter; without the research-and-compare qualifier, the vertical-selection step could drift toward businesses chosen habitually, where the audit problem is weak. |
| 6. Smallest revision | Add the qualifier to the Customer section and/or journey step 1 (e.g. "Pick one vertical, in one city, whose customers research and compare options before choosing"). |
| 7. Resolution | **Mechanical alignment — orchestrator may resolve** (adopts canonical vision text). If the founder intends "chosen locally" as a deliberate alternative filter, record that as a product decision; otherwise align. |

## Canonical-source note (outside the three-doc scope)

- `DECISION_LOG.md` 2026-08-09 ("Delete principle 8 … The principles section
  becomes seven") and the Superseded directions table ("Seven principles;
  scope restraint moved to AGENTS.md and NOW.md") both describe the principles
  section as having seven entries. The adopted canonical `docs/VISION.md`
  (adopted the same day by the newer decision-log row "Adopt the independently
  rewritten docs/VISION.md") actually contains **nine** numbered principles
  (1 Observed evidence comes first … 9 Privacy and permission are part of
  trust). The "Manual until it hurts" principle is indeed gone, so the
  deletion decision was honoured; the "seven" wording describes the
  pre-rewrite draft and is stale relative to the adopted rewrite.
- Per the authority chain in `docs/INDEX.md`, the newest founder-approved
  decision (the 2026-08-09 adoption row) governs and the adopted document has
  nine principles. No winner needs to be chosen beyond that. The smallest
  useful action is an additive decision-log row (the log forbids editing old
  rows) clarifying that the adopted rewrite contains nine principles, so a
  future session does not "correct" the document back to seven. This is
  orchestrator/founder maintenance, not part of this review's scope.

## Correctly aligned statements to preserve

These statements match the canonical vision / settled decisions and should not
be changed during any subsequent revision:

`docs/PRODUCT.md`
- Customer: "owner or marketing decision-maker of a small or medium Indonesian
  business", audited business is their own; "working launch hypothesis".
- Deferred agency/white-label paragraph ("If one approaches us, we serve them;
  we do not market to them").
- Promise block bounded by "sampled observations at a recorded time, not a
  permanent ranking"; no inclusion/revenue/lead/forecast promise.
- Offer: one audit, ten-minute Indonesian report; re-check at 6–8 weeks as the
  recurring offer with the "recommended cadence, not scientifically derived"
  caveat; Rp149,000 explicitly not an anchor; price provisional at checkout.
- Banded score with denominators, published/versioned formula, same-version
  re-check comparison, no peer benchmark before it is earned.
- Journey steps 1–8 content: demonstrate-before-selling (vertical, city,
  unbranded Indonesian questions, approach only non-appearing businesses),
  business confirmation, no-account payment link, intake scope, ten Indonesian
  questions run independently with web search, pipeline-produced report
  ("a run that needs a person to rescue it mid-way is a defect"), re-check
  with verbatim replay, feedback questions.
- Non-goals list (rankings, guarantees, monitoring, exact-integer score,
  clinical quality, SEO audit, client management, agency offer, multi-vertical,
  replacing the owner's implementation work).
- Success signals mirroring the vision's value-creation list; open terms block.

`docs/AUDIT.md`
- Measurement statement (not a permanent/universal/personalized ranking).
- Scope of one audit: one verified business, ten-question pack (five unbranded
  / five branded), one honestly named surface (OpenAI Responses API, exact
  model, web-search condition), recorded run design; earlier five-question,
  two-system evidence explicitly not silently converted.
- Question rules (natural Indonesian, no brand leakage, verified facts).
- Evidence terms (appearance / mention / recommendation / non-appearance /
  failed test) and one-count-per-answer.
- Indonesian source hierarchy; conflicting sources recorded as findings.
- Observation / interpretation / action separation; no causation claims.
- Missing-and-weak-evidence handling (failed test never becomes zero
  visibility; partial report or stop; never fill).
- Five-section report format; band stated as a requirement, with "it has never
  been measured" stated honestly; limitation beside the summary.
- Acceptance checklist; data boundaries; finite private links; permission
  before publishing; agency attribution line deferred.

`docs/NOW.md`
- Stage and objective (pipeline first); build order including the
  report-quality gate; Done-for-this-cycle gate definition.
- "VISION.md governs this repository" and the authority-chain statement.
- Buyer bullet ("owner or marketing decision-maker … own business, not a
  client's"); agency layer deferred; demonstrate-before-selling bullet.
- Indonesian-across-touchpoints bullet with honest, explicit flagging of the
  current English gaps (template set, `/audit` workflow, plain-en-v1 contract)
  and the landing-page contradiction already tracked for the polish pass.
- Score bullet (counts-led headline, band beneath, components keep
  denominators); re-check bullet; pricing bullets.
- "What is not known" list mirroring the vision's hypotheses (willingness to
  pay, price, action, re-check interval, band width, ~20-audit benchmark,
  vertical transfer, outreach conversion).
- "Not now" list and public-exposure prerequisites; unguessable-link Do-now
  item; report-persistence mechanism explicitly open until Phase 3.

## Duplicate ownership between documents

1. **Build order** — `DECISION_LOG.md` (2026-08-09), `NOW.md` (bullets, Do
   now, Done for this cycle), and `PRODUCT.md` (journey intro) all carry it.
   PRODUCT.md's copy is the one that drifted (VA-01). Recommendation: keep
   NOW.md as the single operating owner and have PRODUCT.md reference it
   without restating the sequence.
2. **Score / band rules** — `PRODUCT.md` "How results are reported",
   `AUDIT.md` report-format band rules, `NOW.md` score bullet, and the
   2026-08-08 decision row all state the band requirement. The split is
   workable (AUDIT.md owns measurement mechanics, PRODUCT.md owns the
   offer-level statement, NOW.md owns status), but the property claim in
   PRODUCT.md duplicates AUDIT.md's requirement with a confidence mismatch
   (VA-04). Keep AUDIT.md as the single owner of band mechanics; PRODUCT.md
   should state the offer and defer.
3. **Customer definition** — `VISION.md` (canonical), `PRODUCT.md` (current
   owner), `AUDIT.md` header, `NOW.md` bullets. PRODUCT.md is the canonical
   current statement; AUDIT.md/NOW.md summarize it, and AUDIT.md's summary is
   the one that narrows (VA-02).
4. **Re-check cadence (6–8 weeks)** — `PRODUCT.md` (offer + journey step 7),
   `NOW.md` bullet, `DECISION_LOG.md` 2026-08-08. Acceptable duplication;
   PRODUCT.md is the offer owner and the others cite the same figure.
5. **Demonstrate-before-selling** — `PRODUCT.md` journey step 1, `NOW.md`
   bullet, `DECISION_LOG.md` 2026-08-08. Acceptable; PRODUCT.md owns the
   journey, NOW.md the status.
6. **Privacy / retention / permission** — `AUDIT.md` "Data boundaries",
   `PRODUCT.md` intake and open-terms, `AGENTS.md` rules 9–12. Consistent;
   AUDIT.md owns the data rules and the others defer.
7. **Indonesian requirement** — `VISION.md` principle 4, `PRODUCT.md` offer,
   `AUDIT.md` question rules and writing standard, `NOW.md` touchpoints
   bullet, `DECISION_LOG.md` 2026-08-08. Consistent; AUDIT.md owns the writing
   contract, NOW.md owns the gap status.

## Proposed revision order

1. `docs/PRODUCT.md` — VA-01 (build-order restatement: restore the gate or
   delete the restatement). Highest priority: it misstates a settled decision
   in the document most sessions read first.
2. `docs/PRODUCT.md` — VA-04 (band property → design intent). Promise-level
   wording tied to the re-check offer.
3. `docs/PRODUCT.md` — VA-05 and VA-06 (additive lines: share-to-approver
   function; research-and-compare qualifier). Small copy additions.
4. `docs/AUDIT.md` — VA-02 (header / purpose / prepared-for wording).
5. `docs/NOW.md` — VA-03 (reframe universal-matrix bullets to the
   one-vertical-one-city default).
6. `docs/DECISION_LOG.md` — (canonical-source note, optional) additive row
   clarifying the nine-principle count; orchestrator/founder decision.

Rationale: fix the direct conflict first, then promise-level overstatement,
then additive missing implications, then framing items; PRODUCT.md before
AUDIT.md/NOW.md because the latter two mirror PRODUCT.md's customer wording.

## Change confirmation

No canonical file was modified. This review created a single new artifact,
`docs/reviews/001-vision-alignment-audit.md`. No file in `docs/` (including
`VISION.md`, `PRODUCT.md`, `AUDIT.md`, `NOW.md`, `INDEX.md`, `WORKFLOW.md`,
`DECISION_LOG.md`), `AGENTS.md`, or any other repository path was edited.
Nothing was committed or pushed.
