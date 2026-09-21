# Review: Smart consultant intake plan, revision R2

> Status: **Independent review — advice for the founder, not implementation authority**
> Date: 2026-09-21
> Reviewer: independent agent (Claude), no part in writing the plan
> Plan reviewed:
> [`docs/drafts/SMART_CONSULTANT_INTAKE_PLAN_SOL.md`](../../drafts/SMART_CONSULTANT_INTAKE_PLAN_SOL.md)
> at commit `a7ea89e` (R2)
> Previous review:
> [`smart-consultant-intake-plan-review-2026-09-20.md`](./smart-consultant-intake-plan-review-2026-09-20.md)
> Review lens, set by the founder: pragmatic and outcome-first.

I read R2 in full and checked its new claims against the current source. I
made no provider calls and changed no application code.

## 1. Judgement

**R2 is good enough to become the spec. Do not commission another plan
revision.** It took every point from the first review faithfully, shrank from
667 to 525 lines, and nothing important was lost in the cut.

One real problem remains, and it is about the outcome, not about correctness:
**as written, every customer — including the best-case one — still answers
three blank questions on a detour screen.** §3 below explains it and gives a
cheap fix. The other findings (§4) are small clarifications the spec author can
absorb in passing.

Fold §3 and §4 into the spec itself. They are not a reason for an R3.

## 2. What R2 got right

| First-review point                   | R2                                                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Indonesian extraction text           | Adopted (§7.2), with a fixture assertion.                                                                                                                                           |
| Look at real drafts before code      | Adopted as Step 0 (§7.1), with a sensible cap: it may simplify rows, it may not grow into a five-business study.                                                                    |
| Competitors optional, unknown ≠ none | Adopted (§4, §6), including the frozen-input `unknown` mode. I checked: `question-facts-v3.ts` already has an `unresolved` comparison kind to map it to, so this is a small change. |
| One confirmation on the happy path   | Adopted (§5.6). The summary is the review; `s-review` goes away.                                                                                                                    |
| Amendments table                     | Adopted (§4), and it names the six rules being replaced.                                                                                                                            |
| Failing-layer rule                   | Adopted as a working rule inside the live check (work block D), not as a build phase.                                                                                               |
| Drop per-item evidence matching      | Adopted (§7.4). The gap rule is now one sentence: “Ask only when an active required meaning is empty.”                                                                              |
| No name-matching algorithm           | Adopted (§5.3).                                                                                                                                                                     |
| Customer context optional            | Adopted (§6, decision 5).                                                                                                                                                           |
| Seven acceptance outcomes            | Adopted (§11).                                                                                                                                                                      |

Also good and new in R2: the explicit “Audit already started/completed — never
migrate it” row, and the risk row that names this review's own concern
(“Intake work delays report usefulness”).

## 3. The remaining problem: three always-blank questions

### What happens today under R2

Three required meanings are never prepared by Nuave:

- **Audit focus** — must be an explicit choice (§4 protections).
- **Service channels** — “no reliable structured field” (§7.5).
- **Market reach and area** — the extraction returns a prose sentence, but the
  intake needs one of four fixed reach kinds plus, for local reach, an area.

So R2's own best case is: summary → pick focus → leave the summary for the
`Perlu dipastikan` stage → pick channel → pick reach → come back to the
summary → confirm. R2 is honest about this — its four-decision budget is
literally “scope, service channel, market reach, and final confirmation” (§1).

That is a much shorter questionnaire, but it is still a questionnaire at the
exact moment the founder wants the customer to think “they already know my
business.” Of four decisions, three are Nuave asking and only one is the
customer confirming.

### The rich test case avoids Nuave's actual customer

AC-01 defines the rich fixture as having “a nationwide or international market
context that needs no area choice.” But `docs/PRODUCT.md` defines the customer
as a small or medium Indonesian business “that depends on being chosen
locally.” In the current code a local reach is only valid with exactly one
area (`isMarketAnswerValid` in `src/lib/intake/state.ts`). So for the typical
customer the area is required, R2 has nowhere to get it from, and the customer
types it. The zero-typing test passes on a business Nuave is not targeting and
says nothing about the one it is.

### The fix — about a day of work, no new call

**a. Ask the existing extraction for three more structured fields.** The
extraction already uses a strict output schema (`extractionModelDraftSchema` in
`openai.ts`), and work block A already edits its instruction for Indonesian.
In the same edit, add:

- `service_channels`: zero or more of the four existing fixed channel values;
- `market_reach`: one of the four existing reach kinds, or empty;
- `market_areas`: short place names as published, or empty.

Same call, same cost, same “leave empty when the website does not support it”
rule. These become ordinary preselected proposals on the summary. When empty,
R2's gap rule still applies unchanged and the customer is asked — so nothing
gets worse for thin websites. (`gemini.ts` carries the same English line and
schema; change both or state that only the OpenAI path is live.)

**b. Put the always-present choices on the summary itself.** Focus, channels,
and reach are small fixed chip sets. Show them as rows on the summary with
their chips in place, not on a separate stage. Keep `Perlu dipastikan` for
genuine surprises: no category, no offering, no target for a location/product
focus.

**c. Founder decision: preselect “Brand secara keseluruhan”.** R2's own
principle is that preselection never confirms anything; only the one visible
action does. A visible, preselected whole-brand focus is not “silently
inferred” — it is a proposal like every other row, and it is the right answer
for most single-location businesses. The customer who wants one branch or one
product taps a different chip. This is a product decision the founder should
make knowingly; I recommend yes.

**Result.** For a well-read local business the journey becomes one screen:
read it, fix anything wrong, press **Sudah sesuai — buat pertanyaan audit**.
That is the experience the founder described. The budget in §1 and AC-01 then
tightens to: zero typing, **one screen, at most two decisions**, and the rich
fixture becomes a **local** business with a proposed area.

If the founder prefers not to touch the extraction schema in this release, do
(b) and (c) alone. That still removes the detour screen and one decision, and
(a) can follow from what the live check shows.

## 4. Smaller fixes for the spec author

### 4.1 Step 0 is not blocked — the drafts are on this machine

R2 says the retained evidence was “not readable in this planning environment”
and hands Step 0 to “an authorized reviewer with access.” The retained
extraction responses from the two authorized live runs are present under
`.secrets/` in this checkout. My own attempt to summarize their field counts
was stopped by the tool's privacy guard, which is the right default for an
agent, so I did not look. The founder can do Step 0 in ten minutes by opening
one retained extract response and noting, per field, whether it is filled,
empty, or wrong. Do not let this step wait on finding a reviewer.

Two things to look for that bear directly on §3: does `market_context` name a
place, and does the draft say anything usable about how customers receive the
service?

### 4.2 Make the labels strictly per row

§7.4 still has two clauses that need a judgement per item, which is the thing
the first review asked to remove:

- “customer needs/decision considerations _when interpretive_” — a worker
  cannot test “interpretive”.
- “_any normalized summary wording_” is **Saran Nuave** — after §7.2 every
  sentence is normalized Indonesian, so read literally this relabels the whole
  summary.

Simplest rule: the label belongs to the **row**, not the chip. Rows 1–4 of
§5.2 (business, focus, category and offers, how and where) are **Dari website
Anda**; rows 5–6 (customer context, alternatives and differentiator) are
**Saran Nuave**; anything the customer changed is **Dari Anda**. Delete both
clauses.

### 4.3 Trim two fields from the data shape

`PreparedMeaning` carries `alternatives` and `applicability`. In this release
there is one extraction for the whole business and no conflict detection, so
`applicability` is always `"whole"` and `alternatives` is only ever used for
the typed-versus-discovered name. Both are leftovers from ideas that were cut.
Drop them; the identity row can hold its two names directly. Add them back the
day something populates them.

### 4.4 Say what a focus change actually does

§5.4, §8, and AC-04 say a target change “re-evaluates target-specific”
meanings and “never inherits unsupported whole-brand coverage.” With no
target-specific data to re-evaluate from, a worker has to guess. State it as a
table in the spec, for example:

| Focus chosen        | What happens to the summary                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole brand         | Everything stays as proposed.                                                                                                                                                             |
| One product/service | The offers row becomes the chosen offering. Everything else stays as a visible proposal.                                                                                                  |
| One location        | Category, offers, and channels stay as visible proposals. Reach and area are cleared and asked, because a branch's coverage is not the brand's. Name and address use the manual fallback. |

Everything that stays is still only a proposal until the one confirmation, so
this is safe and needs no new machinery.

### 4.5 Tell the founder how AC-07 can actually be done

Deployed previews and synthetic mode return an empty extraction, so the
populated summary can never be seen there. The founder walkthrough therefore
has to ride on the one authorized live preparation, and the session lives in
one browser tab — a phone would need a second paid call. Say explicitly: do
the desktop walkthrough, then the phone walkthrough in the same tab using the
browser's device emulation; or authorize two preparation calls. Small, but
otherwise AC-07 stalls on the day.

## 5. Suggested changes to the founder decisions (R2 §12)

Keep decisions 1–7 as recommended. Change or add:

- **8 (amended).** Rich-case budget: zero typing, one screen, at most two
  decisions; the rich fixture is a local business with a proposed area.
- **9 (new).** Ask the existing extraction for structured service channels,
  reach, and area as proposals — yes; same call, empty when unsupported.
- **10 (new).** Preselect whole-brand focus as a visible proposal — yes.

## 6. Next smallest useful action

Founder: spend ten minutes on Step 0 with one retained extract response
(§4.1), then answer decisions 1–10. Orchestrator: write the numbered spec from
R2 plus §3–§5 of this review. No further planning round is needed.
