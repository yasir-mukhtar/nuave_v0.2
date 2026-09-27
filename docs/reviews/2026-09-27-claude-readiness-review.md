# Claude Readiness Review — Gaps to Serving Paying Customers (2026-09-27)

> **Author:** Claude (Opus 5.5), acting as an external business and technical reviewer
> **Requested by:** the founder
> **Baseline:** `main` at `3c07495` (after PR #90), 2026-09-27
> **Status:** advisory and non-authoritative. It does not override `docs/NOW.md`,
> `docs/DECISION_LOG.md` or any approved spec. Where it recommends changing a
> recorded decision, the founder must decide and record that change.

## 1. Bottom line

Nuave has a working audit engine but not yet a business. The full path works:
business input, prepared facts, ten approved questions, grounded AI
observations, report, and PDF/JSON download. It ran for real on 2026-09-19
(Masryef, about USD 0.17, zero retries).

Three things are still missing:

- **Nobody outside the team has used it.** No target owner has seen a report.
- **Nobody can pay for it.** Checkout is simulated.
- **Nothing is saved.** A report exists only in the browser session and is lost
  when the tab closes.

The largest unknown is whether an Indonesian SME owner values the report enough
to pay Rp99.000. That is a business question, not an engineering one.

## 2. Gaps, in order of business risk

| # | Gap | Evidence in repo | Why it matters | Effort |
|---|---|---|---|---|
| 1 | No real owner has seen a report | `docs/NOW.md` "Not now": showing the product to any target customer comes *after* the polish pass. Plan Phase 7 (known-owner pilot) comes after Phases 4–6. | Value and willingness to pay are unvalidated. | Small effort, highest value |
| 2 | No real payment | `README.md`: "clearly simulated checkout". No Midtrans code in `src/`. Plan Phase 5. | No revenue path. | Medium |
| 3 | No durability or delivery | `README.md`: "no database, payments, customer accounts … or hosted report access". State lives in browser session storage. `wrangler.jsonc` has only the `ASSETS` binding and rate limiters, with no storage binding. Plan Phase 4. | A paid run can be lost when the tab closes. There is no private report link, no report-ready email and no access recovery. | Largest build |
| 4 | Remedy and policy decisions | `docs/END_TO_END_PLAN.md` §13 "Needed before durable delivery / real checkout". | Decisions still needed: delivery promise, refund/remedy, retention period, recipient change, privacy/terms copy. | Founder decisions, little code |
| 5 | Launch safety | `docs/NOW.md` "Deferred security work": `fast-uri` 3.1.6 needs 3.1.7 or later; `hono` 4.13.5 needs 4.13.7 or later. README requires a server-side rate/cost guard before public sharing. `/audit` is public behind an on/off switch plus per-IP rate limits. | Must be done before any link reaches a stranger. `npm audit` and Dependabot do **not** flag these yet, so check the lockfile directly. | About a day |
| 6 | Landing page targets the wrong customer | `README.md`: the `src/` landing copy "still describes the agency-facing raw-MVP offer". | The first impression contradicts `docs/VISION.md`. | Small to medium |

### Process gap (cross-cutting)

- The repo holds about 470,000 words of Markdown across 191 files in `docs/`
  and `specs/`, against about 66,000 lines of `src/` code.
- `docs/NOW.md` is 954 lines, mostly historical narrative.
- Of the roughly 40 non-merge commits in the last week, 25 were `docs:`.
- On 2026-09-19 the founder said the milestone came "too slow" (see
  `docs/DECISION_LOG.md`, around line 758).
- `CLAUDE.md` says to "avoid premature systems work". The current verification
  and paperwork weight suits a regulated product with customers, not a
  pre-customer MVP whose job is to learn quickly.

## 3. Current progress: latest work toward the finish line

| Work | PRs | State |
|---|---|---|
| End-to-end real test (Masryef) | — | Done 2026-09-19. The engine works, but Masryef appeared in 0 of 10 answers. |
| Spec 011: prepared intake (summary instead of questionnaire) | #78, #79 | Verified and released |
| Spec 012: evidence-first report redesign | #80, #81, #82 | Verified with the founder-approved AC-18 exception. Founder accepted the report "for now" on 2026-09-26; formatting improvements deferred. |
| Engineering process: agentic playbook, `verify-nuave` skill, lint, docs housekeeping | #83–#90 | Merged. #90 records the deferred security work. |

Against the plan's phases (`docs/END_TO_END_PLAN.md` §7), Phases 0–3 are
effectively complete. That covers the simulated shell, the Indonesian audit
contract, and the live engine plus report-quality gate. Phases 4–9 are not
started: durable delivery, real checkout, polish, known-owner pilot, public
launch and re-check.

The official next action in `docs/NOW.md` is open: **the founder chooses the
next product outcome.**

## 4. Recommendation

The current plan runs: polish, then durability, then payment, then pilot. That
puts the only real market test last. The recommendation is to move a manual
pilot forward.

1. **Safety minimum (about 1 day).**
   - Update `fast-uri` and `hono` to patched versions and verify the root
     `package-lock.json` directly.
   - Add the server-side cost cap.
   - Pass `npm run verify`.
2. **Founder-assisted pilot (2–3 weeks), with 3–5 real owners in one city and
   one business category.**
   - Run each audit with the existing live flow.
   - Deliver the PDF by hand.
   - Ask for Rp99.000 by manual bank transfer or static QRIS.
   - Ask the three canonical feedback questions in `docs/PRODUCT.md`.
   - Record whether each owner found something new, shared the report, took one
     action, or paid.
   - This needs almost no new code.
3. **Build only what the pilot proves necessary**, most likely in this order:
   1. Durable report storage, private link and report-ready email (plan Phase 4,
      reduced).
   2. Midtrans checkout (Phase 5).
   3. Landing-page rewrite for owners (part of Phase 6).
4. **Lighten the process.**
   - Keep `docs/NOW.md` short (under 100 lines, current state only).
   - Use a PR description plus one verdict as the evidence for each change, as
     already adopted in `docs/WORKFLOW.md`.
   - Keep heavy independent verification for payment, security and data
     handling only.

### Founder decisions this recommendation needs

- **Revisit** the `docs/NOW.md` "Not now" item that delays showing the product
  to target customers until after polish. If changed, record it in
  `docs/DECISION_LOG.md`.
- **Choose** the launch wedge: one city and one business category (still open;
  plan §13).
- **Approve** a provider-cost allowance for the pilot runs. At about USD 0.17
  per run, five runs cost under USD 1.
- **Approve** manual payment collection during the pilot and the wording that
  goes with it.

## 5. Notes for an agent picking this up

- Read `docs/NOW.md` and `docs/DECISION_LOG.md` first. This review is advice,
  not a decision record.
- Do not start a live provider call, merge or deploy without explicit founder
  authorization. Merge and deploy stay with the founder (see `docs/NOW.md`
  "Engineering track").
- Step 1 (security and cost cap) is internal engineering work. Under the
  2026-09-27 playbook acceptance it needs no spec. Use a feature branch and
  prove it with the `verify-nuave` skill.
- Step 2 is founder-led operations, not a build task. An agent's role there is
  limited to running authorized audits and recording pilot findings.
