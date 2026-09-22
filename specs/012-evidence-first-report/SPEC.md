# Spec 012: Evidence-first AI Visibility Report — Astra

> Status: **Approved** — founder instruction 2026-09-22: "approve Spec 012", after independent review 1 (S1–S6) was applied and re-checked at `afacda5`
> Owner: Founder / orchestrator; specification author: Astra
> Updated: 2026-09-22 (revision 1: S1–S6 applied; founder-approved)
> Implements: `docs/PRODUCT.md` — see what AI says about your business and choose evidence-backed work
> Promotes: Astra report redesign plan **v3.1**, published at `316ac5bf090fca23dfcd8043782bfaabbc696777`
> Scope of this change: documentation only; no runtime, dependency, fixture, provider, or deployment changes

All eight founder decisions below are settled. This document is the reviewable
implementation contract requested by block 0 of the plan. It is
**Approved** by the founder on 2026-09-22 after review 1; approval does not
reopen those decisions. The tech lead approved the exact dependency
pins and approved the templates subject to S3/S4, now applied below.
Implementation of PR A may start from current `main`. No individual PR
constitutes acceptance of the whole report redesign.

## Revision 1: independent review S1–S6

Applied [SPEC_REVIEW_1.md](./SPEC_REVIEW_1.md), reviewed against `be8187a`.
The founder approved the corrected spec on 2026-09-22.

| Finding | Resolution |
|---|---|
| S1 | Restore both live-flow items beside report work in `NOW.md`; keep its report pointer short. Spec 011 owns intake state and Spec 012 owns report state. Merge the intake branch first, then rebase this documentation branch once and reconcile shared operating documents. |
| S2 | G4 removes Nuave download controls/export routes only. Remove recovery print suppression and its acceptance/failure cases; leave browser-native printing alone. |
| S3 | Use `Tidak dinilai dari jawaban yang tersedia` for detail-level non-assessment and template V. Reserve `Tidak diuji` for aggregate empty-denominator labels and existing historical contracts. |
| S4 | No templates in model requests, including language-only retries. B2 allows zero priorities in direct-ten synthesis only; code selects at most one eligible P/V after repair and any permitted language revision. Finished-report minimum one is unchanged. |
| S5 | Add the PDF label constant in `report-labels.ts` and its test to PR A's narrow allowlist, alongside the shared toolbar default. |
| S6 | Confirmed the runtime calibration at `4e6b2cf`: advisory ceiling 20 words, no floor, hard ceiling 25, no Indonesian field totals. Correct R-11 and require B1 to recheck the constants on its integration base. |

## Required context

Read in order:

1. [AGENTS.md](../../AGENTS.md), [README.md](../../README.md),
   [NOW.md](../../docs/NOW.md), and [WORKFLOW.md](../../docs/WORKFLOW.md).
2. This specification, then [VISION.md](../../docs/VISION.md), **Product
   principles**, and [PRODUCT.md](../../docs/PRODUCT.md), **Customer**,
   **Promise**, **How results are reported**, and **Delivery**.
3. [AUDIT.md](../../docs/AUDIT.md), **Report format**, **Report acceptance
   checklist**, **Handle missing and weak evidence**, and **Data boundaries**;
   [VOICE.md](../../docs/VOICE.md), **Terminology table** and **Report**;
   [DESIGN.md](../../docs/DESIGN.md); [journey 06](../../docs/journey/06-audit-report.md),
   **Direct-ten report contract**.
4. [Spec 009](../009-recommendation-eligible-audit/SPEC.md), R-07 and the
   continuous-flow amendment; [Spec 010](../010-gated-new-audit-flow/SPEC.md),
   **Failure and recovery**, retry/cost requirements; the verified, merged
   version of Spec 011, R-23/R-27, before B1/B2. The inspected
   [Spec 011 snapshot](https://github.com/yasir-mukhtar/nuave_v0.2/blob/194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4/specs/011-smart-consultant-intake/SPEC.md)
   reserves number 011; its branch existence is not merge/verification proof.
5. Relevant implementation only: `src/app/audit/ReportView.tsx`,
   `audit.module.css`, `LocalAuditStage.tsx`, `AuditRunStep.tsx`;
   `src/components/product/ReportToolbar.tsx`; `src/lib/audit/`
   `types.ts`, `contracts.ts`, `report-labels.ts`, `report-language.ts`,
   `report-pipeline.ts`, `report-priority.ts`, `report-quality-repair.ts`,
   `report-recovery.ts`, `report-prompt-contract.ts`,
   `customer-evidence-export.ts`, and report portions of `openai.ts`,
   `gemini.ts`, `groq.ts`, `openrouter.ts`; `src/lib/intake/local-audit-session.ts`;
   `src/app/api/audit/report/route.ts`; the tests named below.

Decision evidence, only if needed: the [published v3.1 plan](../../docs/drafts/NUAVE_REPORT_REDESIGN_IMPLEMENTATION_PLAN_ASTRA.md),
[iteration prompt](../../docs/drafts/NUAVE_REPORT_REDESIGN_PLAN_ASTRA_ITERATION_PROMPT.md),
[v2 review / Founder answers](../../docs/drafts/NUAVE_REPORT_REDESIGN_PLAN_ASTRA_V2_REVIEW.md),
and [v3 review](../../docs/drafts/NUAVE_REPORT_REDESIGN_PLAN_ASTRA_V3_REVIEW.md).
Do not load `archive/`, credentials, unrelated historical plans, or private raw
answers for this documentation review.

## Problem

**Observed evidence.** The founder says the report leaves the owner asking,
“What exactly did AI say about my business?” The inspected implementation puts
per-question evidence after summary, findings, and priorities. Its disclosure
shows `answer_excerpt`, while complete answers already exist in retained
observations. Findings select an arbitrary first excerpt and can repeat an
action. Priority validation currently requires an observed gap; repair can
leave empty findings/actions in a delivered report. The report renders a
separate print copy of details.

The source investigation used `main` at
`4e6b2cf6302a0679aa7820d163b214ac8b486e1f`. These are code and recorded-founder
findings, not fresh owner interviews or a new live audit. The plan did not
visually verify desktop/mobile screenshots or a PDF; those remain explicit
implementation gates.

**Interpretation.** Owners need direct access to the tested question and full
answer before assessing Nuave's advice. Better typography alone cannot make
generic or unsupported advice useful. The design must preserve exact evidence,
make its limits clear, and distinguish a completed report from readable
observations whose analysis is unfinished.

## Desired outcome

An Indonesian business owner can see whether their business appeared and was
recommended, read exactly what the tested model said, understand Nuave's
evidence-backed interpretation, and choose a concrete action with a completion
check. A finished PDF follows the same reading order and contains every answer
once. If useful analysis cannot be produced from ten usable observations, the
owner can still read and copy those answers and explicitly retry analysis
within existing limits, without receiving a partial report.

## User and situation

The primary reader owns or markets the audited Indonesian business. They have
approved ten unnamed questions and want to understand the result without
learning audit internals. A colleague may later receive the finished PDF and
carry out an action. The reader needs distinctions between mention,
recommendation, unassessed evidence, and a technical failure.

## Scope

- Direct-ten report body, exact-answer reader, summary, evidence references,
  safe Markdown, copying, and single-tree printing (A).
- One-to-ten findings/actions, improved synthesis instructions, final
  identity/date/header/contents integration after Spec 011 (B1).
- A constrained non-corrective action path, final usefulness minimum, and
  answers-only recovery after Spec 011 and integrated A/B1 (B2).
- The shared `Download PDF` default for every report, including historical
  reports. Other historical rendering and semantics remain compatible.
- Block 0's canonical guidance and Spec 010 recovery amendment, documented in
  this change; implementation approval and verification remain separate.

## Non-scope

No new questions, observation pass, research or source fetch, provider/model,
transport, causal website diagnosis, entity-extraction pipeline, rank,
benchmark, dashboard, report chat, task manager, account, checkout, email
delivery, durable hosting, retention promise, persisted field/schema migration,
or retrospective rewriting of delivered reports. No intake redesign or
parallel `BusinessBrief`/`AuditSubject`, frozen state, or request projection.
No collapse controls, print appendix, or duplicate direct-ten print tree.
This task does not authorize runtime work, live calls, merge, or deployment.

## Settled founder decisions and block 0

| ID | Settled decision | Implemented by |
|---|---|---|
| D-01 | All ten answers are visible immediately. G2 removes collapse controls entirely. | R-02, R-04; A |
| D-02 | Render Markdown, with an exact raw-text view and copy. | R-04–R-06; A |
| D-03 | A finished new report has 1–10 findings and 1–10 actions. Never pad; three supported items means three. | R-10–R-14; B1/B2 |
| D-04 | A starts from then-current main without waiting for Spec 011. Shared content work waits for its verified merge; split it into B1 and B2. | R-19; implementation boundaries |
| D-05 | Exact labels: `Bisnis Anda muncul di X dari 10 pertanyaan`, `Bisnis Anda direkomendasikan di Y dari 10 pertanyaan`, `Download PDF`. G3 changes the shared toolbar default. | R-03, R-08; A; `VOICE.md` amendment |
| D-06 | If the final useful-report gate fails after repair with ten usable observations, show answers only. Findings empty, actions empty, or both trigger it. No surviving analysis is exposed. | R-14–R-15; B2; Spec 010 amendment |
| D-07 | PDF follows screen order, using the same DOM tree and print CSS. No appendix or hidden duplicate answer tree. | R-08; A |
| D-08 | G4, founder-confirmed 2026-09-22: answers-only recovery permits copy and explicit report retry, with no Nuave print/PDF/JSON controls or export route. Browser-native printing is unchanged (S2). | R-15; B2 |

All eight decisions are recorded in [DECISION_LOG.md](../../docs/DECISION_LOG.md).
This change also reconciles `PRODUCT.md`, `AUDIT.md`, `VOICE.md`, journey 06,
and Spec 010, and routes the spec from `NOW.md`, `INDEX.md`, and `specs/README.md`.
Older plan references to optional collapse, a direct-ten-only PDF-label
override, “v3,” or seven decisions are superseded by G2/G3 and this table.

Block 0's technical approvals are recorded in review 1: the R-06 exact pins
are approved, and the R-13 templates are approved subject to S3/S4, applied in
this revision. Founder approval of this spec remains pending. No runtime
implementation is claimed here.

## Experience

A complete direct-ten report uses this order on screen and in its PDF:

| Order | Customer label | Stable section ID | Purpose |
|---|---|---|---|
| 1 | Hasil singkat | `summary` | Two counts, a concise conclusion, tested scope, and snapshot limitation |
| 2 | Jawaban model AI | `detail` | Ten exact questions and full retained answers in approved order |
| 3 | Analisis Nuave | `findings` | Useful findings with every evidence reference |
| 4 | Yang dapat dilakukan | `priorities` | Actions once, with basis, suggested owner, and completion check |
| 5 | Tentang audit ini | `method` | Recorded method, observation provenance, synthesis date, and limits |

Each question starts with its human ordinal and exact approved wording, then
separate appearance/recommendation labels, then its whole Markdown answer.
Sources, observation time/model, `Teks asli`, and copy sit with that answer.
Evidence links in findings/actions move focus to the corresponding question
heading; they never open a second copy or trigger a request.

The final header identifies the exact audited business/scope and observation
date or range with timezone. This header and contents-nav work belongs to B1;
A preserves the existing header/brief block and its styling. A's body already
uses the final section order and stable IDs, so older nav links still resolve.

Answers-only recovery is a separate unfinished state. It shows an unfinished
notice, the ten retained questions/answers, sources/provenance, copy, and the
existing permitted report-retry action. It has no performance summary,
classifications from rejected synthesis, conclusion, findings, actions,
report-ready toolbar, or downloadable report artifact.

## Requirements

### Presentation and evidence: A

**R-01 — Method routing and compatibility.** Select the new body only when
`report.provenance.question_method === "direct-ten"`. Do not infer a method
from IDs, counts, missing matrix slots, or question wording. Absent/other
methods select the historical renderer with their original denominators and
contracts. Existing delivered direct-ten records remain inspectable even if
they predate B2's usefulness minimum; never regenerate them on read.

**R-02 — Pure binding adapter, before UI work.** Add a pure, non-persisted
`src/lib/audit/report-presentation.ts`. For a complete report, validate ten
unique observation IDs, ten unique detail IDs, identical ID sets, identical
retained order, nonempty stored questions/full answers, completed/usable
observations, and valid references. Establish uniqueness before constructing a
map; join by ID, never by array position. Fail explicitly for missing, extra,
duplicate, or independently reordered items; do not sort away the defect.
Valid non-lexical ID order remains valid. Ordinals derive from retained order.
Do not substitute excerpts or another answer when evidence is missing.

| Displayed value | Sole source; adapter obligation |
|---|---|
| Question, ordinal/order, raw answer | Retained `observations`, already locked to the approved pack; preserve exact strings |
| Per-question classifications | Validated `report.details` matched by ID; never reinterpret raw prose in the component |
| Appearance numerator/denominator | `report.measures.overall.appeared` / `.total` |
| Recommendation numerator/denominator | `report.measures.recommendation.recommended` / `.assessed`; direct-ten must already be 10 |
| Findings, actions, comparator summary | Validated report content, with all references resolved |
| Sources, observation timestamp, requested/returned answer model | Corresponding observation; no report-synthesis model substitution |
| Report creation time | `report.generated_at`, labeled separately from observation time |
| Identity/scope | Existing approved report input; B1 consumes the verified Spec 011 boundary without fabricated fallback meaning |

Reject inconsistent measure shape/range (including a direct-ten denominator
other than ten); do not hardcode ten over corrupt measures or recalculate
classifications. Do not mutate either input. Return an explicit unavailable
result for invalid saved bindings; it is not B2's answers-only success path.
Adapter tests must pass before React or CSS changes begin.

**R-03 — Summary and honest statuses.** Use D-05's two exact count sentences
with visible numerator/denominator. Show zero honestly. Keep a quiet
`10 dari 10 pertanyaan berhasil diuji` completion line and nearby snapshot
limitation; completion is not performance. Do not repeat the same count in an
unnamed tile or show empty named/comparison/info tiles. Each answer separately
distinguishes mention/absence, explicit recommendation/non-recommendation,
and `Tidak dinilai dari jawaban yang tersedia` for an unassessed dimension.
Reserve `Tidak diuji` for aggregate empty-denominator labels and existing
historical contracts. A factual mention is not a recommendation. Relevant
comparison/information statuses may be shown without inventing an assessment.
Direct-ten recommendation remains out of all ten even
if nine answers are `not_assessed`; historical methods retain their own rules.

**R-04 — Complete answer, permanently visible.** Render every
`observation.raw_answer`, from first character through the final caveat, in
approved order. No excerpt, first-sentence selector, truncation, line clamp,
height cap, “read more,” lazy mounting, accordion, or collapse state. Do not
alter exact approved questions to fit a card. Preserve `answer_excerpt` and its
existing validators/export contract; it is not this reader's body source.

Resolve optional review F4 deterministically: omit per-question Nuave analysis
blocks in this release. The current `deterministicDetailCopy` values repeat
statuses rather than adding a question-specific insight. Do not render
`detail.finding`/`detail.evidence_note` as another analysis paragraph or ask a
model for replacement copy. Substantive interpretation stays in `Analisis
Nuave`. This avoids a vague implementation-time “adds value” text heuristic.

**R-05 — Text-oriented Markdown and exact copy.** Support paragraphs, bounded
heading levels, emphasis, lists, blockquotes, code, tables, and strikethrough.
Retain substantive text and ordering. Every body link/URL is inert, including
autolinks, reference links, URLs matching retained sources, and code URLs.
Show link label plus destination as text when needed to preserve both.
Only the separate retained sources list has active evidence links.

No raw HTML execution, images, video/audio, iframe, embed, form, checkbox input,
script, style, event handler, or remote resource load. Render unsupported HTML,
image notation, and task markers as inert readable text, rather than silently
removing substantive content. Use a bounded AST/component policy; no
`rehype-raw` or `dangerouslySetInnerHTML`. Markdown headings must not take over
the page outline, inject IDs, or create a second reference target.

`Teks asli` exposes the unchanged stored raw string in a selectable, wrapping
text surface. Copy assembles clearly labeled question, answer, and observation
provenance; the question/raw-answer substrings remain byte-for-byte identical
as JavaScript strings, including CRLF, Unicode, repeated spaces, and punctuation.
No whitespace normalization, translation, or reserialization of the raw answer.
Clipboard failure leaves selectable original text and a truthful notice; it
does not fall back to a provider request. Raw-view controls are separate from
the always-visible answer and excluded from print to avoid a duplicate body.

**R-06 — Dependency gate.** The tech lead approved exact pins
`react-markdown@10.1.0` and `remark-gfm@4.0.1` in
[review 1](./SPEC_REVIEW_1.md#approvals-this-review-grants-tech-lead-scope),
without ranges. Official package metadata identifies
both as ESM using unified 11; react-markdown accepts React and React types
`>=18`, compatible with this repository's React 19.2.3/types 19.2.7 at the peer
constraint level. See the [react-markdown metadata](https://registry.npmjs.org/react-markdown/10.1.0)
and [remark-gfm metadata](https://registry.npmjs.org/remark-gfm/4.0.1), read
2026-09-22. Pin approval does not constitute a completed Node 22/Next/OpenNext
build or runtime verification.

A may use these approved pins in
`package.json`/`package-lock.json`. Follow README's lockfile procedure and
verify Node 22, Next/OpenNext builds, and safe-renderer behavior offline. A
different version or additional renderer/plugin dependency requires a reviewed
spec amendment. No dependency was installed by this documentation task.

**R-07 — References and sources.** Every finding/action evidence ID links to
its exact question heading, with one stable unique target and keyboard focus
after navigation. Preserve every cited ID, not only the first. Do not pair an
action with a finding based on one shared ID, repeat action snippets in
findings, or select an arbitrary quote. Actions occur only in their own section.

For each answer, show retained source title/domain and URL; activate only valid
absolute HTTP(S) URLs with safe external-link attributes. Unsafe URLs remain
inert text, not links. Empty source lists mean no source link was retained, not
that the system never searched. Do not fetch sources or infer sentence-level
citation alignment. Source availability does not verify the business claim.

The optional `Bisnis lain yang disebut` summary uses only validated
`observed_competitors`, their retained relationship, and valid question links.
Explain that this list is limited to retained structured records; it is not an
exhaustive list of all names in the answers. Empty means omit the summary, not
“no alternatives.” No extraction, inferred competitive status, frequency,
market share, or rank. Invalid comparator references produce an explicit
integrity/unavailable result rather than plausible names or links.

**R-08 — One screen/print tree and one PDF label.** Change the shared
`ReportToolbar` `pdfLabel` default to **Download PDF**, retaining the existing
`window.print()` callback. Apply it to direct-ten and historical consumers;
update conflicting call-site overrides only if discovered and reviewed within
the toolbar-label scope. Keep finished-report JSON secondary and unchanged.

Also change `INDONESIAN_REPORT_LABELS.download_pdf` in
`src/lib/audit/report-labels.ts` to **Download PDF** and update its assertion
in `report-labels.test.ts`. The currently unused key must not retain the old
`Cetak / simpan PDF` wording or a test that enshrines it. These two narrow
changes are part of A, not deferred to B1.

Direct-ten prints the same DOM tree in the same section order. Each question
and complete answer appears once, with one anchor ID. No print-only renderer,
hidden duplicate answer tree, portal, appendix, or clone in `beforeprint`.
Both toolbar print and browser-native print must include the complete report.
Print CSS hides controls and the auxiliary raw view, keeps headings with their
following content, groups short blocks when practical, and allows long answers
to break across pages. Do not apply `break-inside: avoid` to an entire long
question/answer. Tables, nested lists, code, and long URLs reflow legibly on A4.
No arbitrary page cap, text removal, or type shrinkage to force a short PDF.

**R-09 — Accessible reading.** Use existing semantic tokens and stack: body
text at the 16px base, supporting text at 14px, roughly 60–75 characters per
desktop line, clear heading hierarchy, ordinary flow rather than card grids.
Verify 390px and 1440px layouts, 320px/reflow and 200% zoom, keyboard traversal,
visible focus and anchor destinations, and approximately 44px interaction
targets. Wide tables may use a labeled local scroll region on screen, with
legible print wrapping. Avoid page-wide horizontal overflow. Do not change
global typography or indirectly restyle A's protected header.

### Content and final header: B1

**R-10 — Count bounds without a quota.** Widen the existing findings and
priorities maxima and `priority.order` maximum from five to ten in the shared
schema and all derived/provider schema uses. B1 keeps the existing minimum one
at initial synthesis. B2 then permits zero priorities in the direct-ten
synthesis contract only, as R-13 specifies; the final report-content minimum
remains one, and findings and historical synthesis keep their minima. Ten and
order ten pass; eleven and order eleven fail. Do not truncate
valid items in the renderer. Three supported, distinct findings/actions remain
three. New instruction/usefulness rules are direct-ten-only; accepting a wider
shared schema does not reinterpret or regenerate older records.

B1 preserves the current observed-gap rule, repair behavior, empty-content
delivery behavior, and `LocalAuditStage`. Only B2 introduces the final post-repair
minimum and template exception. B1 must remain reviewable and shippable without
B2's new behavior.

**R-11 — Evidence-led synthesis and language.** Update report instructions in
all four adapters (`openai`, `gemini`, `groq`, `openrouter`) and the shared
direct-ten contract as applicable. Findings explain material observations and
their qualified significance; actions state concrete work, `why`, evidence
`basis`, `owner`, `done_when`, and `caveat`. Display the owner as
`Penanggung jawab yang disarankan`. Every item cites actual supporting IDs.
Non-appearance alone does not diagnose a missing page, a business defect, or
cause. Verify owner-supplied facts before proposing a factual correction.
Material late caveats, contradictory evidence, and unassessed dimensions must
survive interpretation. Generic advice and repeated findings are not padding
for a minimum. Human usefulness review supplements deterministic checks.

Keep `plain-id-v1` and the runtime's existing per-sentence writing limits.
Inspection at `4e6b2cf` confirms `INDONESIAN_REPORT_LANGUAGE_CALIBRATION` in
`src/lib/audit/report-language.ts`: `sentence_target_min_words: null`,
`sentence_target_max_words: 20`, `sentence_hard_ceiling_words` references
`REPORT_MAX_SENTENCE_WORDS = 25`, and `field_word_limits: null`. Guidance is
20 words or fewer, with no floor; the hard ceiling is 25. B1 must reconfirm
these executable constants on its integration base and correct this description
if they differ, without changing language behavior. Do not rely on stale
12–20-word comments or import English total-field limits. Exact
questions, answers, names, and source text are exempt. Protect existing
language-only retry invariants: classifications, IDs, source/excerpt facts,
action order/timing/owner, and evidence must not change. No new critique call.

Increase `REPORT_SYNTHESIS_PROMPT_VERSION` for material B1 and B2 instruction
changes; record the version and method-specific change. B1's instructions must
not advertise a non-corrective exception before B2 validates it. Keep all
provider transports, model choices, observation instructions, and budgets.

**R-12 — Verified intake boundary and observation dates.** After Spec 011's
verified merge, consume its actual `AuditSubject`/equivalent boundary in the
existing header. Never synthesize missing target customers, offerings,
comparators, areas, recipients, or business type from compatibility defaults.
Unknown optional values stay unknown or are omitted. Show identity and exact
audited scope without agency-era attribution. Keep `AI Visibility Report` as
the artifact title; apply the final section labels/order to contents navigation.

The header's date/range comes from retained observation timestamps, with a
named timezone (use an explicitly labeled consistent display timezone, such
as UTC, if no audited locale is recorded). Each answer retains its timestamp
and requested/returned answer model. Name the actual recorded execution surface
plainly, not every consumer ChatGPT experience. `report.generated_at` is
separately labeled as analysis/report creation in `Tentang audit ini`. GLM's
question-writing model and the report-synthesis model never become the
observed-answer model. Correct the stale AC-17 denominator comment in
`types.ts` without changing validated measure arithmetic.

### Useful completion and recovery: B2

**R-13 — Exact, code-owned non-corrective action contract.** Preserve the
existing observed-gap validation for ordinary model-authored corrective
priorities. Add the following bounded direct-ten exception; neither a word
heuristic nor a model-supplied “maintenance” flag can activate it.

B2 permits **zero to ten priorities in direct-ten synthesis**, including a
language-only revision. In `types.ts`, derive a method-specific synthesis
schema from the shared contract and override only the priority minimum to
zero. Use the matching contract for structured output and response parsing.
Keep the final `reportContentSchema.priorities` minimum at one, findings'
minimum at one, and historical synthesis unchanged. This is an intermediate
generation contract, not a persisted report-schema change. Instructions tell
the model to return `priorities: []` when no observed gap supports an action.
It is never forced to invent a gap or produce a maintenance template.

Template candidates never enter the initial prompt or any language-only retry
prompt/draft. Apply the existing normalization and ordinary corrective-priority
support/quality repair first. Complete any already permitted language-only
revision using that model-authored draft, allowing an empty priority list in
the direct-ten retry-shape check and preserving existing retry integrity and
cost limits. An empty priority list never triggers a retry on its own; only
the existing language violations can use the permitted language-retry budget.
Only after that work, code constructs/selects at most one eligible
P or V below. Use retained IDs, exact questions, approved ordinals, normalized
classifications, observations, and confirmed identity with the existing
identity-matching semantics. No model selects, returns, edits, or approves the
code-owned action; no extra call or candidate-payload plumbing is introduced.

The candidate's entire persisted shape is the existing priority shape below.
`{n}` is the human ordinal (1–10), and `{id}` is that observation's actual ID.
The exact question remains attached through its reference, without shortening
it or injecting it into a length-limited Nuave prose field.

| Field | Preservation candidate P | Verification candidate V |
|---|---|---|
| `order` | `1` before final contiguous numbering | `1` before final contiguous numbering |
| `timing` | `do_next` | `do_next` |
| `action` | `Pemeliharaan: periksa dan pertahankan informasi publik yang mendukung rekomendasi pada jawaban pertanyaan {n}.` | `Pemeriksaan lanjutan: cocokkan informasi tentang brand dalam jawaban pertanyaan {n} dengan sumber resmi Anda.` |
| `why` | `Jawaban ini merekomendasikan brand Anda. Pemeriksaan membantu Anda mempertahankan informasi yang benar tanpa menganggap semua informasi sudah lengkap.` | `Jawaban ini menyebut brand Anda, tetapi kebenaran informasinya belum dinilai.` |
| `basis` | `Rekomendasi terlihat pada jawaban pertanyaan {n}.` | `Penilaian informasi pada pertanyaan {n}: Tidak dinilai dari jawaban yang tersedia.` |
| `owner` | `business_owner` | `business_owner` |
| `done_when` | `Informasi tentang brand dalam jawaban sudah diperiksa pada sumber resmi; fakta yang sesuai dan perlu dikonfirmasi dicatat.` | `Setiap informasi tentang brand dalam jawaban ditandai sesuai, perlu konfirmasi, atau tidak tercantum pada sumber resmi.` |
| `evidence_prompt_ids` | `[{id}]` | `[{id}]` |
| `caveat` | `Rekomendasi ini hanya tercatat pada pengujian tersebut dan bukan jaminan hasil berikutnya.` | `Informasi yang belum dinilai bukan berarti salah atau hilang.` |

Post-normalization eligibility requires a completed observation, valid binding,
`appearance === "mentioned"`, and no observed gap under the unchanged gap
predicate for this evidence. P additionally requires `recommendation ===
"recommended"`; V requires `information === "not_assessed"`. A source need
not have been retained: the action asks the owner to check their official
information; it does not claim Nuave checked a source or found a defect.

Every model-authored priority passes the ordinary observed-gap path, even if
it copies a template or supplies a template-like flag. The exception is used
only by the subsequent code-owned insertion. Validate that inserted action by
exact equality with a recomputed eligible object: all strings, enums,
reference IDs/order, and the field set must match; only display `order` may
receive normal contiguous renumbering. Check field sets before a parser could
strip extra keys. Unknown IDs, edited/extra fields, or a forged tag cannot pass
the exception. Unsupported model priorities are discarded by the existing
repair; a forged object is never rewritten into an accepted template.
Non-recoverable integrity failures still stop the pipeline. Keep the existing
saved fields, without a discriminator, score, template ID, or flag.

After repair and any language-only revision, keep supported corrective actions
as usual. If none survive and integrity checks pass, select at most one
eligible code-owned candidate, preferring P then V and the earliest approved
ordinal within that type. Construct it from code even when synthesis returns
`priorities: []`. Never append one as filler to a supported action list, and
never pad findings. Check the inserted text locally against the unchanged
writing contract without sending it back to a model. The builder and selector
are deterministic request-local logic, not another synthesis or persistence
layer. The final minimum gate runs after insertion.

The tech lead approved these templates subject to S3's detail-level label and
S4's code-only insertion; both conditions are applied here. This approval does
not prove usefulness: an irrelevant candidate fails AC-18's human rubric.
If these bounded candidates cannot support useful
work in the retained evidence, report that limitation; do not broaden the
exception or invent a defect to pass the minimum.

**R-14 — Final usefulness gate.** For newly synthesized direct-ten reports,
after evidence normalization, existing support/quality repair, any already
permitted language-only revision, and code-owned candidate handling, require
at least one surviving supported finding and at least one supported action,
each within ten. Any successful language revision is revalidated before
candidate selection and final completion. If findings are empty OR actions are
empty, do not call `buildAuditReport` or
return a report-ready success. Do not backfill a finding, expose the surviving
section, or change an answer/classification to manufacture support. This gate
does not revalidate or rewrite previously delivered reports at read time.

**R-15 — Answers-only recovery, exact scope.** When R-14 fails and the
protected observation gate established ten usable observations, reuse A's
answer renderer with an observation-only projection. No fake `AuditReport`,
`ReportDetail`, measures, or rejected synthesis are supplied to that renderer.
Use a dedicated failure code `REPORT_USEFULNESS_FAILURE` (HTTP 422) on the
existing report-error response, retaining its telemetry/cost fields and adding
no report body. Classify this code as retryable only under the existing
report-attempt and cost ceilings. Integrity failures keep their existing
non-retryable classification. An explicit code distinguishes permitted
recovery from malformed, unsafe, incomplete, or unvalidated evidence.

Persist the code through the existing `report-failed` status and
`reportFailure.code` string field; use the existing retained observations,
report-call attempts, and accounting. No new session schema/version/store.
Preserve failed-call telemetry; reading the answers must not erase spend.
Back/reload restores this state without a request. A successful explicit report
retry may replace the unfinished state with a newly validated report, using
the same observations and original observation times.

Use the notice `Analisis Nuave belum selesai` with explanatory text:
`Sepuluh jawaban model AI sudah tersimpan. Analisis belum memenuhi syarat
laporan. Anda dapat membaca dan menyalin jawaban di bawah.` Render ordinary
single-line strings from these sentences; source-document line wrapping is not
part of product copy. Keep the existing report-retry label and disabled/limit
explanation. Retry remains an explicit action, never automatic on render.

Only questions, full answers, sources, observation provenance, unfinished
notice, copy, and permitted retry appear in the recovery content. No rejected
classification, conclusion, finding, action, comparator summary, score,
report-ready announcement, print/PDF/JSON button, download callback, or export
route is attached. The existing report JSON serializer is not called. G4 is
settled; do not add a recovery export as a convenience. This restriction covers
Nuave's controls and export routes; leave browser-native printing alone.
If ten usable observations were not established, use the existing
failure/recovery path without this reader or a partial report.

### Preserved behavior and integration

**R-16 — Calls, retry, and cost.** Reading, raw view, copy, anchors, print,
JSON, Back, and reload initiate zero extraction, generation, observation,
report, or source-fetch requests. Explicit report retry uses the same locked
questions/observations, existing in-flight guard, rate limits, report-call
ceiling, budget/carryover ledger, and uncertain-attempt accounting. Do not rerun
completed observations for synthesis, PDF, or usefulness. Keep the emergency
switch and server-selected live/synthetic behavior unchanged. No extra
language, critique, or model-judge call is added.

**R-17 — Data and version continuity.** Keep `nuave-report-v3`,
`nuave-evidence-v4`, existing customer-export omissions, exact questions/raw
answers, and saved provenance. A does not edit `customer-evidence-export.ts`.
B1/B2 add no persisted report fields or automatic migrations. Count-bound
widening and a new error-code value are not permission to change export
semantics. New authorized synthesis gets a new creation time/prompt provenance;
it does not overwrite a previously delivered interpretation as a layout effect.

**R-18 — Stop at a real boundary conflict.** Stop affected work and report the
specific conflict if a required implementation needs a protected A edit,
unverified Spec 011 boundary, parallel state/brief/projection, new saved fields,
source extraction/fetch, another provider call, weakened evidence gate,
unsupported material claim, historical reinterpretation, or duplicate print
tree. Expected invalid-input fixtures must exercise defined failures, not cause
requirements to be weakened. Unnecessary personal data invokes existing
restrict/stop/founder-escalation handling; never silently redact and call the
answer exact. Routine choices within this spec do not reopen D-01–D-08.

**R-19 — Fixed integration sequence.** A starts from then-current
`origin/main`, recording its SHA and differences from the investigation base.

For this documentation branch, merge the Spec 011 intake branch first, then
rebase `docs/astra-report-redesign-plan` once before merging it. Both branches
edit `docs/NOW.md`, `docs/DECISION_LOG.md`, `docs/INDEX.md`, and `specs/README.md`;
reconcile their changes instead of replacing those files wholesale. Spec 011
owns intake state; Spec 012 owns report state. Keep the two live-flow tasks in
`NOW.md` alongside report work. Only the report-work deferral was superseded.
This documentation integration order does not block PR A development from
current main after founder spec approval and does not authorize either merge.

B1 and B2 start only from main containing the verified Spec 011 result, with
its merge SHA and verification evidence recorded. Inspect its actual R-23
outcome; do not assume the older remote snapshot already contains `AuditSubject`.
If A remains open when Spec 011 merges, rebase/integrate once and reverify the
combined boundary. If A has merged, verify combined main without rewriting
history. B1 consumes integrated A before final verification; B2 consumes
verified B1 and A. B2 template/recovery issues do not block B1's bounded work.

## Failure and recovery

| Situation | Preserved / customer result | Permitted retry; forbidden inference |
|---|---|---|
| Missing/duplicate/reordered answer-detail binding, missing raw answer, invalid reference | Existing record retained; explicit evidence unavailable state; no plausible mismatched report | No automatic regeneration, sorting repair, excerpt substitution, or inferred zero |
| Fewer than ten usable observations, unsafe evidence, protected observation gate fails | Existing interrupted/failed or restricted-data handling; no new answers-only reader | Existing approved recovery only; no partial report or count from failed tests |
| R-14 fails with ten usable observations, whether findings, actions, or both are empty | Observation-only reader and unfinished notice; all surviving/rejected analysis withheld | Explicit report retry within current limits; no completed-observation rerun or save path |
| Provider/transport failure or interrupted synthesis | Existing recovery and completed work/accounting remain | Existing rules; do not falsely identify it as an R-14 failure |
| Integrity failure | Existing integrity state and safe retained work | No paid retry invitation for deterministic integrity failures |
| Report-attempt/cost/rate limit reached | Retained safe evidence and truthful limit status; a saved `REPORT_USEFULNESS_FAILURE` remains readable even when its retry ceiling is exhausted | No retry while blocked, no ledger reset; a later failure code follows its own existing recovery rules |
| Clipboard unavailable | Selectable exact raw text and failure notice | No request or misleading copied confirmation |
| No retained sources/comparator | Full answers visible; source absence explained, optional comparator summary omitted | No claim that no search/alternatives existed |
| Finished-report PDF/browser save fails | Same validated report remains usable | Repeat print from same record; no report/observation regeneration |

This explicitly refines Spec 010's **Observation/report failure** row only for
the R-14/R-15 case. A/B1 retain baseline recovery until B2 implements it. No
email, access, or delivery service is added by this amendment.

## Evidence, data, privacy, and cost

Only existing retained observations and validated report data feed the reader.
Use fictional public fixtures for automated tests. Do not commit real customer
answers, provider envelopes, credentials, sensitive text, or private source
artifacts. Stop on unnecessary personal data under `AGENTS.md`/`AUDIT.md`; this
spec does not authorize a new detector or silently altered “exact” evidence.

Use already authorized retained evidence privately for before/after human
review, with no new provider calls. Public verification records contain verdicts
and field-level descriptions, not raw customer content. Additional owner
interviews, public samples, live calls, deployment, and publication of business
identity need their existing separate authorization. No new cost estimate,
retention period, access promise, or provider authority is introduced.

## Acceptance criteria

All fixtures below are fictional. Each criterion records its PR owner; the
combined result requires every criterion and the human usefulness gate.

| ID | Given / when / required result | Requirements; owner |
|---|---|---|
| **AC-01** | Given valid direct-ten records, first render and reload show all ten exact approved questions and whole answers in order, without interaction, excerpt substitution, or collapse controls. A `Ya.` opening and a later qualifying paragraph both remain complete. | R-01–R-04; A |
| **AC-02** | Before UI edits, pure-adapter tests cover separate missing observation/detail/raw-answer cases, duplicate IDs on each side, extra/unknown IDs, independent reordering, invalid evidence references, and valid non-lexical IDs. Invalid bindings fail explicitly; valid strings/order/inputs remain unchanged. | R-02; A |
| **AC-03** | Given zero appearance, mention-only, and one recommendation plus nine `not_assessed` answers, summary/status tests keep the distinctions. The last case explicitly reads numerator 1 / denominator 10 from measures; a corrupt denominator fails. Per-question non-assessment says `Tidak dinilai dari jawaban yang tersedia`; `Tidak diuji` remains the aggregate empty-denominator/historical label. No redundant tile or rank appears. | R-03; A |
| **AC-04** | Given headings, nested lists, tables, code, long URLs, images, HTML/script, tasks, autolinks, reference links, and a body URL also in sources, no body link/control executes or resource loads. Every substantive text/qualifier remains readable; only retained safe HTTP(S) source entries are active. | R-05–R-07; A |
| **AC-05** | Given CRLF, repeated spaces, punctuation, Unicode, and an exact long question, raw view and copied question/answer substrings equal stored strings; JSON stays identical. Clipboard failure is truthful and leaves selectable raw text. | R-05, R-17; A |
| **AC-06** | A finding/action citing multiple questions has a working keyboard/focus link to every correct heading. There is one anchor per question, no arbitrary first quote, no per-question repeated analysis paragraph, and no action duplication in findings. | R-04, R-07; A |
| **AC-07** | Given an empty comparator structure with other names in raw text, the summary is absent without an exhaustive claim. A valid comparator shows its actual relationship/references and limited-scope note; invalid references fail explicitly. | R-07; A |
| **AC-08** | Desktop/mobile, 320px/reflow, 200% zoom, focus/keyboard and target-size review pass. Each question/answer appears once in A4 PDF from both toolbar and browser print, in screen order. Extract PDF text and inspect every page for clipped text, orphan headings and table/URL/list reflow. Raw-view-open print also has only one answer copy. | R-08–R-09; A |
| **AC-09** | Historical/absent-method records with direct-ten-looking IDs/counts select their old renderer and original denominators. Every shared toolbar consumer and `INDONESIAN_REPORT_LABELS.download_pdf` say `Download PDF`; the label unit test and two affected exact-label e2e locators assert that wording. Keep the print callback and no-repeat checks. | R-01, R-08; A |
| **AC-10** | Reading, raw view, copy, anchors, PDF/JSON, Back, and reload preserve the snapshot and do not increment any provider/request counter. Safe external sources require an explicit click; no preload/fetch occurs. Export fields, versions, and telemetry omissions match the baseline. | R-16–R-17; A, recheck B1/B2 |
| **AC-11** | Three supported findings/actions stay three. Ten supported items and priority order 10 pass schema/provider-contract tests; eleven items or order 11 fail. B1's existing positive-only action rejection and empty-content delivery/recovery regressions are unchanged. | R-10–R-11; B1 |
| **AC-12** | Four report adapters use aligned method-specific bounds/non-padding/evidence instructions. Synthesis version changes; protected observations and language-retry evidence/order/timing/owner stay unchanged. B1 does not advertise the B2 exception. Verify the executable Indonesian sentence-calibration constants on the integration base and reconcile R-11 if needed, preserving behavior. | R-11; B1 |
| **AC-13** | Given different observation dates/models, later synthesis time, and missing optional intake values, B1 shows honest observation date/range/timezone and model provenance, separate report creation time, correct identity/scope, and no invented optional values. Header/contents order matches the body and verified Spec 011 boundary. | R-12, R-19; B1 |
| **AC-14** | Given all-positive evidence with a supported finding, B2 can produce one exact eligible P action without inventing a gap. Given eligible unassessed information, V can be used. Direct-ten initial/retry synthesis accepts `priorities: []`, while final report content still requires one and historical synthesis still rejects zero. No candidate or inserted template enters any model request/draft. Code selects after repair and any permitted language revision without an extra call; supported corrective actions receive no filler template. | R-13; B2 |
| **AC-15** | All model-authored priorities, including copied templates and flags, undergo ordinary gap validation. Unknown references, edited/extra fields, and forged tags fail exact validation of a code-inserted action; legitimate P/V objects pass. A language-only retry preserves ordinary evidence invariants and receives no inserted template. No forged object is normalized into a passing one. | R-13; B2 |
| **AC-16** | Test separately: findings empty/actions survive; actions empty/findings survive with no eligible candidate; both empty. With ten usable observations each produces `REPORT_USEFULNESS_FAILURE`, not a report. Recovery shows the complete questions/answers, sources/provenance and notice only, with no surviving analysis, rejected classifications, comparator or report-ready controls. | R-14–R-15; B2 |
| **AC-17** | In eligible recovery, copy works; no Nuave print/PDF/JSON control/callback/export route exists. Explicit report retry uses retained observations, costs and attempts; double-click, limit, Back/reload and successful retry cases preserve accounting and never rerun completed observations. Incomplete/unsafe/integrity/transport cases do not enter this new reader. | R-15–R-17; B2 |
| **AC-18** | Using the same already authorized retained evidence before/after, the founder completes the human rubric below. Every material item is useful without a quota and supported despite late caveats or owner-fact conflicts. Generic advice or an unsupported claim fails even when code checks pass. No runtime/new-user success is inferred from this spec. | R-10–R-14; combined |
| **AC-19** | Diff review confirms A/B1/B2 allowlists, recorded base/dependency SHAs and technical approvals, documented intake-first merge/rebase order with both live-flow tasks preserved, no extra persisted fields/schema migration/transport or protected edits, and `npm run verify` passes for each implementation PR and combined result. Expected bad inputs and a fictional personal-data marker exercise the specified unavailable/restrict handling. | R-06, R-18–R-19; each PR |

### Human usefulness rubric

Record a baseline with the current retained report, then repeat on the same
evidence after the integrated redesign. Suggested comprehension checks are
acceptance hypotheses, not measured customer metrics:

- Within 30 seconds, explain both counts and what they do not prove.
- Within 60 seconds, find a requested question and its full answer/caveat.
- Within three minutes, explain the first action's evidence and completion check.
- Within about ten minutes, understand the useful core without having to read
  every long answer in full.

For every material finding/action, identify its exact evidence, distinguish
observation/interpretation/investigation, check contradictions and late caveats,
reject unsupported cause/service-quality/revenue/rank claims, and ask whether
the owner can do the work and know it is done. Would the item survive if no
minimum existed? A thin but honest result may justify a bounded investigation;
generic filler and fabricated defects fail. Record limitations rather than
starting unapproved research. Additional target-owner sessions require their
existing contact authorization.

## Open questions

No founder product decision remains open. Review 1 records tech-lead approval
of R-06's exact pins and R-13's templates subject to S3/S4, now applied. The
founder approved this corrected spec on 2026-09-22. The implementation owner records the actual Spec 011
merge/verification and R-23 boundary before B1/B2, and follows R-19's
documentation integration order. These checks do not reopen D-01–D-08 or
block A development once the spec is approved.

## Implementation notes

### PR boundaries and file allowlists

Paths below describe future implementation; this promotion edits Markdown only.
Resolve moved paths against the verified base and record mappings rather than
adding duplicate implementations. A path listing permits only the named slice,
not unrelated changes in that file. Every PR includes focused tests, complete
diff review, `npm run verify`, and a scoped verification entry.

| PR | Allowed changes | Protected boundary / completion gate |
|---|---|---|
| **A: blocks 1, 2, 4** | New `src/lib/audit/report-presentation.ts` and test; new report-local body/answer/reference/Markdown components and scoped CSS/tests; only imports and method/body wiring in `ReportView.tsx` outside its header/brief; shared `ReportToolbar.tsx` PDF default; only `INDONESIAN_REPORT_LABELS.download_pdf` in `src/lib/audit/report-labels.ts` and its assertion in `report-labels.test.ts`; narrowly scoped `audit.module.css` selectors if needed; approved two-package pins/lockfile; focused report/browser tests including the label locators in `tests/e2e/new-intake-glm.spec.ts`. | Start from current main. Adapter tests pass before UI/CSS. No edits to `contracts.ts`, `report-pipeline.ts`, `report-priority.ts`, `types.ts`, `customer-evidence-export.ts`, provider files, `LocalAuditStage`, intake/request projections, or header/brief/types/contents (including indirect CSS effects). AC-01–AC-10 and A portion of AC-19 pass. |
| **B1: block 3a** | `types.ts`: only findings/priorities/order bounds and denominator-comment correction; report portions of `openai.ts`, `gemini.ts`, `groq.ts`, `openrouter.ts`, `report-prompt-contract.ts`; `contracts.ts`: synthesis-version constant only; `ReportView.tsx` header/identity/date/contents and existing report presentation files/styles; focused schema/instruction/header tests. | Main contains verified Spec 011; integrated A before final verification. No gap-validator, repair, pipeline, `LocalAuditStage`, exporter, intake/projection, observation or transport changes. Record actual `AuditSubject` boundary. AC-11–AC-13 and inherited A regressions pass. No dependency on B2 behavior. |
| **B2: block 3b** | New `src/lib/audit/report-noncorrective.ts` and tests for R-13; necessary priority-validation/identity-helper access and synthesis-version changes in `contracts.ts`; `report-priority.ts`, `report-quality-repair.ts`, `report-pipeline.ts`; `types.ts`: direct-ten synthesis-only priority minimum zero; four report adapters/shared report contract: the no-gap instruction and matching method-specific synthesis-schema selection only, with no candidate-payload plumbing; `report-recovery.ts` failure-code classification; existing `src/app/api/audit/report/route.ts` error plumbing only if needed; small `LocalAuditStage.tsx`/`AuditRunStep.tsx` recovery integration and report reader/adapter observation-only projection; focused pipeline/recovery/session tests. | Verified Spec 011 and B1 plus integrated A. No fake report or second reader/store; reuse existing session fields, retry/cost helpers and API error envelope. No intake, observations, transport, exporter, session-schema or report-field migration. AC-14–AC-17 and all inherited regressions pass; combined AC-18/AC-19 complete the spec. |

Useful existing suites: `src/lib/audit/direct-ten-audit.test.ts`,
`report-excerpt.test.ts`, `report-labels.test.ts`, `report-gaps.test.ts`,
`report-priority.test.ts`, `report-pipeline.test.ts`, `report-language-id.test.ts`,
`report-delivery-resilience.test.ts`, `report-prompt-contract.test.ts`,
`report-recovery.test.ts`, `customer-evidence-export.test.ts`,
`src/lib/intake/local-audit-session.test.ts`, and
`tests/e2e/new-intake-glm.spec.ts`. Add new assertions only for the concrete
risks/criteria above; retain existing cost/no-repeat protections.

### Execution and review order

1. Founder approval was given on 2026-09-22; review 1's technical approvals
   for R-06/R-13 stand. For documentation integration, merge the
   intake branch first and rebase this branch once under R-19. A development
   may start from current main after spec approval; record its SHA and any
   isolation conflict. Create
   `specs/012-evidence-first-report/VERIFICATION.md` only when implementation
   begins, using the repository template.
2. A: implement/test the pure adapter, then body/Markdown/references, then
   single-tree print and toolbar label. Verify presentation and export parity.
3. After Spec 011 is verified and merged, record its SHA/R-23 result, integrate
   A as specified, and complete B1 bounds/instructions/header. Verify B1 with
   baseline repair/recovery unchanged.
4. B2: allow zero priorities in direct-ten synthesis and update the no-gap
   instruction, then implement code-only candidate insertion after repair and
   any permitted language revision. Add the final gate/error classification
   and observation-only recovery projection. Verify all
   three empty-section cases, code/telemetry persistence, retry ceilings, and G4.
5. Verify the integrated report and each actual PDF page; conduct the private
   before/after human rubric. Record per-criterion outcomes and limitations.
   Return concrete review findings; do not mark an interim PR as whole-spec
   completion. Merge, deployment, and live calls retain their separate gates.

## Verification record

- Verification artifact: `specs/012-evidence-first-report/VERIFICATION.md`
  (create when implementation starts; intentionally absent in this docs change).
- Result: Pending implementation and independent acceptance review.
- Date: Pending.
- Verified commit or working-tree state: Pending.
- Required final evidence: A/B1/B2 and Spec 011 SHAs, dependency approval,
  template review, focused/offline test outcomes, full diff review, screenshots,
  PDF text and every-page review, request/cost/export invariants, and AC-18
  founder usefulness verdict. No implementation or visual pass is claimed by
  the documentation checks.
