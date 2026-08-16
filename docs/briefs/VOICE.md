# Document brief: Nuave voice and language

> Status: **Approved brief**
> Owner: Orchestrator
> Output: `docs/drafts/VOICE.md`

## Objective

Define how Nuave communicates in natural Indonesian across reports, product
interfaces, support, outreach, and marketing so fresh AI sessions produce
consistent, trustworthy language without weakening evidence or overstating the
product.

## Audience and downstream use

The guide is for AI agents, writers, designers, and engineers creating:

- customer-facing reports;
- intake, review, progress, completion, and failure states;
- help and support content;
- outreach and sales material;
- landing pages and pitch material; and
- runtime writing contracts and language tests.

It governs voice, tone, terminology, and writing behavior. It does not contain
final copy for a particular screen or campaign.

## Authority and required context

Read in order:

1. `AGENTS.md` for safety, evidence, and working rules.
2. `docs/VISION.md`, especially the customer, promise, principles, boundaries,
   and downstream guidance.
3. `docs/PRODUCT.md` for the offer, reader, report, re-check, and success
   signals.
4. `docs/AUDIT.md` for evidence terminology, report layers, limitations, and
   exact-quote rules.
5. `docs/PROMPT_GENERATION_CONTEXT.md` for natural Indonesian customer-question
   requirements.
6. `src/lib/audit/report-language.ts` to understand the current English runtime
   contract and why a separate Indonesian contract is needed.
7. `src/messages/id.json` and `src/app/audit/` only as evidence of current
   language gaps, not as approved copy.
8. The human-authored public reference
   [bahasa-indonesia-plain](https://gist.github.com/orepras/3e1ca8974fc51d11825f142fa6a66635)
   for plain Indonesian, respectful failure language, accessible numbers, UI
   conventions, and the RASA review lens.

## Excluded context

- Everything under `archive/`.
- Prior Nuave design studies and report prototypes.
- English customer-facing copy as a source of Indonesian sentence structure.
- The external skill as a template to copy verbatim.

## Settled decisions

- The primary reader is the owner or person accountable for marketing in an
  Indonesian small or medium business.
- Leadership and implementers may also receive the report.
- Nuave uses `Anda`, not `kamu`, across customer-facing product communication.
- Nuave sounds like a careful adviser: plain, calm, specific, respectful, and
  never alarmist or all-knowing.
- Indonesian must be written naturally, not translated sentence by sentence
  from English.
- Observations, interpretations, and actions remain separate.
- Exact questions, names, source titles, model names, and evidence excerpts
  remain exact even when they do not follow Nuave prose rules.
- Counts keep their denominators. A sampled result is never presented as a
  permanent ranking or causal proof.
- Errors explain what happened, what was preserved when known, and what the
  reader can do next without blame or false reassurance.
- Nuave does not use false urgency, fear, unsupported forecasts, or promises of
  leads, revenue, rankings, or future inclusion.

## Questions this document may resolve

- Nuave's voice traits and contextual tone.
- Pronouns and point of view.
- Preferred Indonesian customer terminology.
- Writing conventions for reports, interfaces, errors, outreach, and marketing.
- Number, date, count, and comparison presentation.
- Patterns and words to avoid.
- A Nuave-adapted RASA quality review.

## Questions this document must not resolve

- The customer, offer, promise, price, cadence, or business model.
- Audit scope, question count, measurement classifications, or score formula.
- Product flow, interface layout, visual design, architecture, or storage.
- Exact field limits in the Indonesian runtime contract.
- Final copy for a specific page, report, or message.
- Legal, privacy, refund, retention, or commercial commitments.

## Required content

- Purpose and ownership.
- Reader relationship and pronouns.
- Core voice and tone by situation.
- Evidence and certainty language.
- Preferred terminology and avoided alternatives.
- Report, UI, error, customer-question, outreach, and marketing guidance.
- Numbers, dates, formatting, and accessibility.
- Examples that demonstrate principles without becoming universal templates.
- RASA review and final acceptance checklist.

## Non-goals

- Reproducing a general Indonesian style manual.
- Copying the external skill.
- Replacing `AUDIT.md` or `PRODUCT.md`.
- Encoding field-level word limits that have not been tested in Indonesian.
- Rewriting current application strings during this task.

## Quality bar

The candidate must be:

- consistent with every parent document;
- usable by an AI agent without additional interpretation;
- specific enough to distinguish good Nuave language from merely grammatical
  Indonesian;
- explicit about evidence that must remain unchanged;
- flexible across product surfaces without becoming vague;
- honest about heuristics that still require testing; and
- no longer than needed to guide downstream work.

## Deliverable

Write one complete candidate to `docs/drafts/VOICE.md`. Do not modify canonical
documents, application copy, or runtime language rules. End with no unresolved
strategic question; surface only issues that genuinely require founder review.

