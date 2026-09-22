# Nuave Report Redesign — Investigation, Design Strategy, and Implementation Plan — Astra (v3.1)

> Status: **Draft v3.1 for independent review**
> Author: Astra
> Date: 2026-09-22
> Investigated baseline: `main` at `4e6b2cf6302a0679aa7820d163b214ac8b486e1f`
> Deliverable: one reviewable plan; no runtime changes, new audits, or deployment
> Authority: founder decisions below are settled; this draft is not an approved implementation specification

## Changelog v3 → v3.1

Applied by the tech lead from the [v3 review](./NUAVE_REPORT_REDESIGN_PLAN_ASTRA_V3_REVIEW.md) at `a16af5a`, because Astra's local v3.1 commit could not be pushed. Content follows that review's G1–G4 exactly.

- **G1 / recovery scope:** the answers-only recovery state applies whenever the final useful-report gate fails after repair with ten usable observations, whichever required section is empty, not only when both are empty. No surviving analysis is ever exposed in that state. This matches Founder answer 2 and avoids a case that would be worse than today's delivery.
- **G2 / no collapse controls in PR A:** answers are always visible. Removed every "if retained" collapse hedge, the `keepMounted` obligation, and the related AC02/AC08/AC10 and fixture clauses.
- **G3 / one PDF label everywhere:** change the `pdfLabel` default in `src/components/product/ReportToolbar.tsx` to `Download PDF` instead of overriding it only at the direct-ten call site.
- **G4 / recorded in block 0:** the answers-only state has copy but no print/JSON save path; the founder is to confirm this in block 0.

## Changelog v2 → v3

- **F1 / founder labels:** use the settled appearance wording, record the new recommendation label for `VOICE.md`, and restore `Download PDF` through the PR A toolbar prop.
- **F2 / founder recovery:** explicitly amend Spec 010 at specification time for the approved answers-only recovery state; keep that integration and non-corrective actions in PR B2.
- **F3 / founder print order:** print the single screen tree in screen order using CSS; remove the proposed appendix and separate direct-ten print tree.
- **F5–F6:** make every answer-body URL inert, with live links only in its sources list; split later work into B1 (bounds, instructions, header) and B2 (non-corrective path, recovery).
- **Optional findings:** apply F8's adapter denominator regression. Carry F4's precise per-question analysis gate and F7's alternative quiet context into the numbered spec; neither blocks this revision.

## Changelog v1 → v2

- **Changed:** all ten answers open by default; Markdown retained; one to ten findings and actions without padding; PR A starts from current main without waiting for Spec 011, PR B waits for its verified merge; E08 and the stale evidence-export version reference corrected.
- **Taken from Sol:** the eleven requested ideas are incorporated and traced in section 2, including stable layer labels, two summary counts, explicit method routing, adapter validation, single action placement, print rules, and stop conditions.
- **Rejected or deferred:** Sol's plain-text-only renderer and three-item cap conflict with founder decisions; waiting for Spec 011 before PR A is superseded; synthesis-based other-business extraction remains deferred because it expands scope and overlaps Spec 011's comparator work.

## 1. Recommendation and intended outcome

Make the report an understandable record of the tested conversation, followed by useful interpretation and work the owner can choose to do.

The report should answer, in order:

1. **Did my business appear or receive a recommendation in this test?**
2. **What question was asked, and what exactly did AI answer?**
3. **What can we reasonably learn from those answers?**
4. **What should I check or change first, and what would count as done?**

Today, the report has much of the necessary data but puts the second question behind three sections and an excerpt-only disclosure. The main remedy is to bring the exact questions and complete retained answers into the normal reading experience. A visual refresh alone will not repair weak excerpts, repetitive interpretation, or unsupported advice.

**Recommended first release:** two summary counts with quiet run context; all ten exact questions, result labels, and complete Markdown answers visible by default; concise findings with working evidence links; one to ten concrete, defensible actions; and a PDF printing the same complete content in the same order as the screen. Findings also have a minimum of one and maximum of ten. If the evidence supports three, show three. Reuse retained observations and preserve the audit method, counts, provider gates, and evidence export.

Do not introduce a dashboard, report chat, new research agent, automated website audit, or another observation pass to achieve this outcome.

## 2. Investigation scope, confidence, and authority

### What was inspected

The investigation traced the active `ReportView` and report CSS, the observation/report types, synthesis and normalization, excerpt selection, priority validation and repair, direct-ten method, customer evidence export, report/session handoff, relevant tests, and the current product and audit contracts.

It also read the recorded report-quality observations in [Spec 009 deferred notes](../../specs/009-recommendation-eligible-audit/DEFERRED_NOTES.md). Those notes describe prior private live runs; their findings are attributed to that record, not presented as a new inspection of the private answers.

A standalone inspection render was built from the current component and CSS with explicitly fictional direct-ten data. The browser's local-file policy prevented visual inspection. **No desktop/mobile screenshot or newly generated PDF was visually verified in this investigation.** Composition judgments below are grounded in source, with visual confirmation made an implementation acceptance gate. No production audit was run, and no private retained evidence or credentials were opened.

The owner critiques are an expert perspective exercise, **not interviews or measured usability findings**. Proposed comprehension targets are acceptance hypotheses, not existing product metrics.

### Authority and related work

- Start with [AGENTS.md](../../AGENTS.md), [README](../../README.md), [NOW](../NOW.md), and [WORKFLOW](../WORKFLOW.md).
- [PRODUCT](../PRODUCT.md), [AUDIT](../AUDIT.md), [VOICE](../VOICE.md), [DESIGN](../DESIGN.md), and [journey 06](../journey/06-audit-report.md) govern the buyer, evidence standard, exact labels, presentation stack, and report obligations.
- [Spec 009](../../specs/009-recommendation-eligible-audit/SPEC.md), especially R-07, governs the active ten unnamed questions. Its explicit direct-ten amendment takes precedence over older fixed 6/4 assumptions. Historical audits retain their own semantics.
- [Spec 010](../../specs/010-gated-new-audit-flow/SPEC.md) governs the active trial journey and recovery/cost boundaries.
- [Spec 011](https://github.com/yasir-mukhtar/nuave_v0.2/blob/194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4/specs/011-smart-consultant-intake/SPEC.md) was inspected on `devin/sol-smart-consultant-intake-plan` at `194f0f4`; it was not present on the investigated `main`. Its R-23 sizing gate and R-27 boundary explicitly keep intake work from becoming a report redesign.

The [founder iteration prompt](./NUAVE_REPORT_REDESIGN_PLAN_ASTRA_ITERATION_PROMPT.md), committed on this branch at `e5d7d91`, fixes four decisions: answers open by default; Markdown rendering; one to ten findings and actions without padding; and the PR A/PR B sequence in section 8. Do not reopen those decisions. The current task is to revise and publish this documentation on `docs/astra-report-redesign-plan`; it does not authorize runtime work, provider calls, merging, or deployment. The numbered-spec approval gate still applies before implementation; PR A has no dependency on Spec 011 approval or merge.

The [v2 review and Founder answers](./NUAVE_REPORT_REDESIGN_PLAN_ASTRA_V2_REVIEW.md), at `4f8e93c`, settle three additional decisions. Apply them without reopening them:

| Decision | Settled requirement | Specification task, not an edit in this revision |
|---|---|---|
| Labels | `Bisnis Anda muncul di X dari 10 pertanyaan`; `Bisnis Anda direkomendasikan di Y dari 10 pertanyaan`; `Download PDF`. | Add the recommendation label to `VOICE.md`. The appearance and PDF labels are already settled; restore their implementation rather than changing the voice contract. |
| Recovery | Whenever the final useful-report gate fails after repair (findings empty, actions empty, or both) and all ten observations remain usable, the customer may read all ten retained model answers with a clear unfinished-analysis notice. No findings, actions, or partial report are delivered, and no surviving analysis is exposed. | Amend Spec 010's “Observation/report failure” row explicitly; implement the bounded exception in PR B2. |
| Print order | The PDF follows the screen order, with no appendix. | Use one screen tree and print CSS only for direct-ten; retain pagination/completeness checks. |

The settled reading order, summary, and item bounds refine `AUDIT.md` and journey 06. Block 0 records the necessary canonical-document and Spec 010 amendments during numbered-spec approval. This revision edits only the plan; it does not silently amend those sources or treat founder-approved recovery as already permitted by the baseline failure table. PR B is now split into B1 and B2 under review finding F6.

Required review findings F1, F2, F3, F5, and F6 are resolved in sections 6–10. Optional F8 is added to the adapter gate. The [v3 review](./NUAVE_REPORT_REDESIGN_PLAN_ASTRA_V3_REVIEW.md) at `a16af5a` adds G1 (recovery scope), G2 (no collapse controls in PR A), G3 (toolbar default label), and G4 (block 0 note); all four are applied in this v3.1. F4 and F7 are carried to the numbered spec as bounded presentation refinements: define a deterministic rule for omitting status-only per-question analysis, and consider replacing the constant completion line with the existing unnamed-question method statement. Until then, omit repetitive per-question copy as already required and retain quiet completion plus the method explanation; add no semantic model call or empty analysis placeholder.

### Revision sources and adoption trace

[Sol's plan](https://github.com/yasir-mukhtar/nuave_v0.2/blob/23687cab0953d61c78c9f96d4a6d5cadc79cc6e3/docs/drafts/NUAVE_REPORT_REDESIGN_IMPLEMENTATION_PLAN_SOL.md) was read in full at `23687ca`. It is design input, not authority over the founder decisions. This table attributes the eleven requested adoptions; the matching sections contain the operative requirements.

| Sol source / adopted idea | Integrated requirement |
|---|---|
| §8.1, AC-11 — three named layers | §6.1–6.2: `Jawaban model AI`, `Analisis Nuave`, `Yang dapat dilakukan` on screen and in print. |
| §8.2 A — two counts plus quiet context | §6.1, §6.5, AC05: mentions, recommendations, and low-prominence completion; no untested tiles. |
| §9.2 — recorded-method routing | §7.1, AC09: only `report.provenance.question_method === "direct-ten"` selects the new body. |
| §9.1 / phase 1 — adapter fails loudly | §7.1, block 1, §10: authoritative-source map and explicit missing/duplicate/order failures before UI work. |
| §8.2 C–D, AC-12 — actions appear once | §6.4, §6.7, AC04: complete actions only in `Yang dapat dilakukan`, never repeated inside findings. |
| §15 — implementation stop conditions | §12.1: return to the founder instead of improvising across contract or evidence boundaries. |
| §13 — two-column test matrix | §10: each fixture names its required observable assertion. |
| §8.3, AC-19 — print pagination | §6.8, AC08: headings stay with content; short answers stay together when practical; long answers may break. |
| §14 — unnecessary personal data | §12 risk row and §12.1: stop, restrict access, escalate; never silently rewrite evidence. |
| §8.2 C, AC-16 — neutral other-business label | §6.6, AC07: `Bisnis lain yang disebut` for the existing narrow comparator summary; Sol §9.3 extraction is not adopted. |
| §16 — review verdict and blockers | §13: identify blocking product decisions and return one of the three specified verdicts. |

All existing-code claims and file references were rechecked against `main` at `4e6b2cf6302a0679aa7820d163b214ac8b486e1f`; the branch has no runtime differences from that baseline. Proposed new files and behavior are labeled as proposals. Spec 011's unpushed working-tree changes are founder-supplied context, distinguished from source-confirmed baseline behavior in section 7.4. Visual judgments remain hypotheses until the screen/PDF checks run.

## 3. Current report: evidence inventory

All code references below refer to the investigated baseline. Links resolve within this repository; use the baseline SHA when comparing later changes.

| ID | Verified behavior | Source and implication |
|---|---|---|
| E01 | Five sections: Hasil utama → Temuan utama → Langkah berikutnya → Hasil tiap pertanyaan → Cara kerja audit. | [ReportView](../../src/app/audit/ReportView.tsx), section order and contents navigation. Evidence comes after conclusions and advice. |
| E02 | A collapsed question row exposes an ordinal, category/fallback label, result label, and technical prompt ID. The actual question is inside the disclosure. | `ReportView`, `measurementLabel`, `detailTrigger`, and `DetailContent`. Direct-ten IDs have no matrix label, so rows can repeatedly say “Pertanyaan” and “Tidak disebut.” |
| E03 | Expanded screen and print details render `answer_excerpt`, never `observation.raw_answer`. | `DetailContent`, reused by screen and print. Opening the disclosure does not answer the request for the complete answer. |
| E04 | `exactAnswerExcerpt()` returns the first sentence when it fits within 320 characters; otherwise it uses a bounded prefix. | [report-excerpt.ts](../../src/lib/audit/report-excerpt.ts). A response beginning “Ya.” can produce exactly that excerpt. The deferred notes report one-word live examples and clipped heading fragments. |
| E05 | A finding displays the first nonempty excerpt among its referenced details, and the first action sharing any evidence ID. | `ReportView`, `key_findings.map`. Shared question IDs do not establish that a quote proves this finding or that this is the right action for it. |
| E06 | Per-question “meaning” is largely deterministic status wording, such as an absent-brand finding followed by a note that the retained answer does not name the business. | [contracts.ts](../../src/lib/audit/contracts.ts), `deterministicDetailCopy`. The two sentences can repeat the result without adding a business implication. |
| E07 | `raw_answer`, exact question, observed time, requested/returned observation model, and sources already exist. The component already receives observations. | [types.ts](../../src/lib/audit/types.ts), `AuditObservation`; [LocalAuditStage](../../src/app/audit/LocalAuditStage.tsx); [customer-evidence-export.ts](../../src/lib/audit/customer-evidence-export.ts). Full-answer access does not require another audit or a new database. |
| E08 | The summary renders four equal-weight tiles: overall, unnamed, named, and completion. `indonesianCountLabel()` returns `Tidak diuji` for every denominator ≤ 0. | `ReportView`; [report-labels.ts](../../src/lib/audit/report-labels.ts). The defect is redundant overall/unnamed results and a named-recognition tile for a dimension outside direct-ten, not a broken zero-denominator formatter. |
| E09 | Direct-ten recommendation counts use all completed eligible answers, including `not_assessed`; historical methods have different denominator rules. | `contracts.ts`, `buildAuditReport`. The current generic “pertanyaan yang dinilai” wording does not explain this distinction well. Do not redesign the metric by changing its denominator. |
| E10 | The main synthesis assembler discovers only the supplied `verified_competitor.name`; it does not enumerate every other business in the answer. | `contracts.ts`, `assembleReportContent`. An empty structured competitor list does not mean AI named no alternatives. |
| E11 | Source links display mostly hostnames. Source records contain URL/title, without a general retained quote-to-citation span mapping. | `ReportView`, `sourceTitle`; `types.ts`, `sourceSchema`. The UI cannot honestly manufacture sentence-level citation attribution. |
| E12 | The report has large serif display tokens, substantial cover/section padding, and a 9.5rem desktop content offset. Question status has greater prominence than question wording. | [audit.module.css](../../src/app/audit/audit.module.css), report selectors; [tokens.css](../../src/styles/tokens.css), report display roles. These are source-confirmed layout choices; their visual severity still needs browser review. |
| E13 | PDF is browser print. The current renderer has separate expanded print detail markup using the excerpt-only component; `.printDetail` avoids page breaks across the whole item. | `ReportView`; [ReportToolbar](../../src/components/product/ReportToolbar.tsx); print CSS. PR A replaces this duplication for direct-ten with the same screen tree in the same order, styled for print. Keep headings with content and permit long-answer page breaks. |
| E14 | The UI labels `report.generated_at` as audit date, while each observation has its own `observed_at`. | `ReportView`. Re-synthesizing a report must not make the evidence look newly observed. |
| E15 | Priority validation requires an observed gap. Repair may remove priorities/findings; the repair diagnostic does not itself create useful replacement content. Tests explicitly permit delivery with no surviving priorities. | [report-priority.ts](../../src/lib/audit/report-priority.ts), `validateReportContent`, [report-quality-repair.ts](../../src/lib/audit/report-quality-repair.ts), and [report-delivery-resilience.test.ts](../../src/lib/audit/report-delivery-resilience.test.ts). This needs reconciliation with the product's permitted maintenance/investigation actions and one-action delivery minimum. |
| E16 | The current report schema caps findings and priorities at 5 and priority `order` at 5; `reportSynthesisSchema` derives these fields from it. | `types.ts`, `reportContentSchema` / `reportSynthesisSchema`; existing priority instructions in [openai.ts](../../src/lib/audit/openai.ts) and [gemini.ts](../../src/lib/audit/gemini.ts) also cap at five. PR B1 must widen all three bounds and align instructions, not only change display copy. |
| E17 | The existing report/export stamps are `nuave-report-v3` and `nuave-evidence-v4`. | `types.ts`, `buildAuditReport`, and `makeEvidenceExport` in `contracts.ts`. Keep those actual versions; v1 of this plan named the export version incorrectly. |

**Keep the existing strengths:** clear separation of result dimensions in the data, direct counts, ten retained questions, known evidence IDs, exact-excerpt integrity, Indonesian writing limits, actionable fields including `done_when`, and one shared report record for screen/export. The design should make these strengths usable, not replace the audit engine.

## 4. Critique from a business owner's perspective

The quotations in this table are hypothetical owner questions, not research quotations.

| Priority | Owner's question or concern | Critique and practical consequence | Evidence |
|---|---|---|---|
| Critical | “What exactly did AI say about us?” | The owner is given Nuave's interpretation but cannot read the full answer in the report. They must understand a JSON download to inspect the central evidence. | E01–E04, E07 |
| High | “Which customer question is this result about?” | Repeated result labels hide the differences among ten purchase situations. The owner must open rows one at a time to locate a relevant question. | E02 |
| High | “How does ‘Ya.’ prove that conclusion?” | Verbatim text is not automatically useful evidence. Short opening sentences and the first available quote can undermine confidence in an otherwise valid result. | E04–E05 |
| High | “Does zero mean nobody knows my business?” | A sampled absence can sound like a market-wide verdict. Redundant counts, an untested named-recognition tile, and method-agnostic labels add confusion. | E08–E09 |
| High | “Did AI recommend someone else? Who, and under what conditions?” | The structured alternative list is incomplete by construction. The full answer is the reliable place to see the actual choices and caveats. | E03, E10 |
| High | “Why should I spend time on this change?” | A prompt ID proves an answer exists, not that a particular website change is needed. Answer omissions must not become diagnoses of missing website content. | E05–E06, E15; deferred live-review notes |
| Medium | “I see the result. What new information am I getting?” | Repeating the same absence as finding, meaning, and conclusion creates reading effort without helping a decision. | E05–E06 |
| Medium | “Can I send this to the person doing the work?” | Useful owner/completion fields already exist, but their evidence references are plain text and the PDF still omits full answers. | E05, E13 |
| Medium | “When was this tested, and which AI answered?” | Report-generation date and evidence date are different. The observation model must not be confused with the question writer or synthesis model. | E07, E14 |
| Medium | “Can I understand this on my phone?” | Large display elements, generous repeated spacing, and hidden question text may impose too much scrolling and opening. Verify the redesign on an actual narrow viewport. | E02, E12 |

The central failure is a broken trust path: **result → exact question → complete answer → bounded interpretation → justified action**. Better typography helps, but the missing links must be repaired first.

## 5. Design challenges and strategy

| Challenge | Design strategy | Concrete response | Validation |
|---|---|---|---|
| D1. Show the actual answer without making ten long answers compulsory reading. | Make complete evidence visible by default; support scanning and section navigation. | All ten exact questions, result labels, and complete answers always visible in approved order. No collapse controls and no preview selector in PR A. | AC01–AC03 |
| D2. Make a conclusion inspectable instead of merely authoritative. | Treat evidence navigation as a core interaction. | Every finding/action reference opens the correct answer and moves focus there. Remove automatic first-quote/first-action matching. | AC04 |
| D3. Explain the result without exaggerating the test. | Display the actual method and denominators. | Two direct-ten counts for mention/recommendation, quiet completion context, no untested tiles, and a short snapshot statement. | AC05 |
| D4. Convert observations into useful work without inventing causes. | Separate an observed fact, an interpretation, and a proposed check/change. | Stronger writing instructions, concrete `done_when`, preservation/investigation when appropriate, and a report-level usefulness gate. | AC06, AC11 |
| D5. Preserve uncertainty and contradictory evidence. | Keep qualifications accessible and avoid unsupported compression. | Full raw text, honest `not_assessed` labels, no sentence-level citation claim without mapping, no exhaustive competitor claim. | AC03, AC05–AC07 |
| D6. Make screen and PDF support different reading situations. | Keep one content tree and reading order; adapt typography and pagination with print CSS. | The same full answers follow the summary in screen and PDF. No appendix, duplicate direct-ten print tree, or second synthesis. | AC08 |
| D7. Ship presentation work while intake changes continue. | Isolate new presentation logic and consume Spec 011's verified shared boundary later. | PR A starts from current main; keep header/brief and shared contracts untouched, then rebase once after Spec 011 merges. B1 and B2 wait for its verified merge, with separate scopes. | AC09–AC10, §7.4 |

## 6. Proposed report experience

### 6.1 Reading order and composition

The three stable visible layer labels are **Jawaban model AI**, **Analisis Nuave**, and **Yang dapat dilakukan**, adopted from Sol §8.1 and AC-11. Use them consistently in the new direct-ten screen and print views; do not alternate with `Interpretasi Nuave` or an unlabeled quotation. A conclusion is also labeled `Analisis Nuave`, even when it appears inside the summary.

Screen order: **Hasil singkat → Jawaban model AI → Analisis Nuave → Yang dapat dilakukan → Tentang audit ini.**

Use compact anchor destinations rather than oversized section introductions. The owner can jump directly to evidence or actions without closing answers. Preserve the existing section anchor IDs where possible so links remain valid. The current header contains the contents navigation; its label/order cleanup waits for PR B1 under section 7.4.

| Region | Content and behavior |
|---|---|
| Compact identity/header — final target | Business and exact scope, observation date/range with explicit timezone, a plain observation-surface label, and print action. Exact model identifiers and report generation time stay in method/per-answer details. Neutral Nuave attribution. Header/brief edits are deferred to the post-Spec-011 integration in PR B1. |
| Hasil singkat | Exactly two prominent measures: `Bisnis Anda muncul di X dari 10 pertanyaan` and `Bisnis Anda direkomendasikan di Y dari 10 pertanyaan`. Quiet run context: `10 dari 10 pertanyaan berhasil diuji`. One short validated conclusion labeled `Analisis Nuave`, a link to answers, and a snapshot limitation. No duplicate unnamed count or untested named/comparison/information tiles. |
| Jawaban model AI | All ten exact questions, result labels, and complete answers are visible without any click, in approved order. Use stable human ordinals; technical prompt IDs stay in technical evidence. No collapse controls in PR A (G2); section anchors support scanning. |
| Analisis Nuave | One to ten material findings, each with an observed pattern, bounded interpretation, and working links to every cited answer. No arbitrary excerpt or repeated action. The optional narrow `Bisnis lain yang disebut` summary belongs here. |
| Yang dapat dilakukan | One to ten ordered actions, each appearing once. Emphasize the first useful action, then show the rest with action, why, evidence basis, suggested owner, completion check, and caveat where needed. Three supported actions means three displayed actions. |
| Tentang audit ini | Method, recorded observation surface/models, evidence dates, report creation time, untested scope, limitations, and secondary JSON export. Preserve the truthful API-versus-consumer-app disclosure. |

The two-count summary and quiet completion context adopt Sol §8.2 A, with the exact wording corrected by F1 and the founder's v3 label decision. The appearance and recommendation labels above are mandatory, not example copy. A real zero such as `0 dari 10` remains visible; suppressing untested tiles must never suppress a valid zero result.

**Density direction:** retain the light neutral canvas, quiet rules, existing action color, and approved Geist/serif system. Use core 16px reading copy, 14px supporting copy, and existing functional heading roles. Reserve the report serif for a restrained title/result accent. Remove the 9.5rem content offset and reduce repeated padding for the new direct-ten body only; leave historical styles compatible. Keep long-answer text roughly 60–75 characters wide on desktop. These are design hypotheses for fixture review, not new global typography scales or permission to alter the protected header in PR A.

At 390px, use one reading column with modest gutters, wrapping questions, and no sideways page scrolling. At 320px and 200% zoom, preserve content and controls. Status must have text, not color alone. Keep touch targets approximately 44px for the remaining controls: copy, `Teks asli`, and evidence links. Avoid a nested scrolling transcript or modal reader.

### 6.2 The question and answer interaction

Each question entry has these parts in this order:

1. `Pertanyaan 01` and the **exact approved question**, never shortened or line-clamped.
2. Separate appearance and recommendation labels from validated detail data. Additional comparison/information results appear only when relevant; non-assessment remains explicit.
3. **Jawaban model AI**, containing the complete retained answer rendered as Markdown, already open.
4. **Analisis Nuave**, only for the existing validated per-question explanation; keep it distinct from the model's text and omit purely duplicated presentation copy without inventing a replacement interpretation.
5. `Sumber yang disertakan dalam jawaban`, using retained titles and domains with original URLs available. An empty set means no source links were retained, not that the model did no search.
6. Observation time and observation model, with secondary `Teks asli` and exact-copy controls.

**All ten full answers are always visible.** There is no “read full answer” action, no collapse control, and no preview selector in PR A (G2). Reading the report requires no expansion interaction, and no answer body is ever unmounted or clipped. Copy and `Teks asli` controls sit beside the answer, never inside a heading or trigger. A later request for collapse controls is a small follow-up outside this plan.

Finding/action references use human labels such as `Pertanyaan 03`. Following one scrolls and focuses the exact question heading; if the owner previously closed that answer, it reopens only that answer while preserving the other states. Use stable, uniquely namespaced anchors based on retained IDs. Reload can reset the disclosure state to all-open but must preserve the saved report and make no provider calls.

`Salin pertanyaan & jawaban` copies the stored question and raw answer with provenance labels, preserving the exact string values rather than reconstructing the rendered Markdown. Give a short success/failure message. This supports delegation without a sharing backend.

### 6.3 Full-answer fidelity and formatting

`AuditObservation.raw_answer` is the full answer **captured by Nuave**, not the provider's response envelope or hidden reasoning. Use only that text and an explicit allowlist of question, source, date, and model fields in customer presentation. Never dump observation telemetry or failure diagnostics into the answer reader.

Render ordinary Markdown paragraphs, lists, emphasis, headings, and tables so the answer remains readable. Keep an escaped `Teks asli` view and copy action for the exact string. Rendering must not translate, rewrite, reorder, remove caveats, or silently shorten the answer. Map answer headings below the report hierarchy, preserve list numbering, and wrap long URLs. Unsupported notation remains visible as text.

Use one small Markdown renderer, not a home-made Markdown parser or new UI stack. The proposed dependency is `react-markdown`, with `remark-gfm` for common tables/lists. Its documentation describes safe default rendering and configurable element/URL handling; GFM supplies tables and related syntax. Pin compatible versions during implementation and keep raw HTML interpretation disabled. Review custom renderers because extensions can change those guarantees. See the official [react-markdown documentation](https://github.com/remarkjs/react-markdown) and [remark-gfm documentation](https://github.com/remarkjs/remark-gfm), checked 2026-09-22.

For this product, render only text-oriented elements; never load answer-authored images, embeds, scripts, forms, or remote resources. **All URLs and Markdown links inside the answer body are inert text**, including URLs that also occur in retained sources. Render link labels/destinations as readable, noninteractive text; do not autolink, create anchors, or style them as actionable links. The separate sources list beneath that answer is the only clickable external-evidence link surface, using retained HTTP(S) URLs and saved titles/domains. Report navigation/evidence references remain ordinary internal links. This deterministic policy applies F5 without attempting URL matching between prose and source objects. Original text stays available. No source-page fetch occurs when an answer opens. Sensitive content discovered in evidence follows the existing repository stop/restrict/escalate rule; it is not silently redacted and relabeled “exact.”

### 6.4 Full evidence replaces the preview path

Remove the display-only preview selector from the first release. With all answers open, neither a clipped first sentence nor a new preview heuristic is needed. Keep persisted `answer_excerpt` and its existing integrity checks unchanged for compatibility; the new direct-ten reader presents `observation.raw_answer`.

Findings link to **all** cited questions instead of displaying the first available excerpt as proof. A future claim-specific quotation feature would require explicit claim-to-span support and is outside this release. Remove the action snippet attached to each finding: actions appear once in `Yang dapat dilakukan`. These two changes adopt Sol §8.2 C–D and AC-12.

### 6.5 Counts and honest result language

| Situation | Required presentation |
|---|---|
| Active direct-ten, complete run | `Bisnis Anda muncul di X dari 10 pertanyaan` and `Bisnis Anda direkomendasikan di Y dari 10 pertanyaan`; quiet `10 dari 10 pertanyaan berhasil diuji`. State all ten questions were asked without the business name. Read validated `measures`; do not recompute a new score in React. |
| Same overall and unnamed population | Explain the unnamed scope underneath the main count; avoid a second equal-sized duplicate tile. |
| No named questions | Omit the named-recognition tile from the direct-ten summary. Explain the unnamed-only scope in method details. The existing formatter's `Tidak diuji` remains correct wherever a historical or detail-level contract needs it. |
| Comparison/information not assessed | `Tidak dinilai dari jawaban yang tersedia` at detail level; keep established `Tidak diuji` where the aggregate contract requires it. No green reassurance from missing evidence. |
| Mention without endorsement | Show appearance separately. Do not turn mention into recommendation or `not_assessed` into explicit rejection. |
| Direct-ten `not_assessed` recommendation | Keep it visibly unassessed at question level. The aggregate denominator still follows direct-ten's ten evaluable answers; it does not imply ten explicit recommendation judgments. |
| All ten omit the business | Valid `0/10` result; state it concerns these answers only. Offer a bounded investigation action, not a diagnosis of poor service, lost customers, or missing website content. |
| Historical canonical/mixed pack | Preserve its actual name/no-name populations, eligible denominators, and method label. Do not reinterpret it as direct-ten or compare unlike methods as improvement. |
| Any failed/non-evaluable observation | Stay in existing recovery; no delivered customer report. A technical failure is never “Tidak disebut.” |

Model attribution comes from **the observations**, not GLM question-generation provenance or the report writer. If more than one model appears, disclose the set and per-answer details. Audit date comes from observation timestamps; label report creation separately and use the same explicit timezone in screen and PDF. PR A adds correct observation metadata in its new body/components; the existing header's mislabeled synthesis date (E14) remains a declared limitation until the post-Spec-011 header integration in PR B1. Do not claim that part of AC05 has passed in PR A.

### 6.6 Other businesses and sources

The complete answer is the primary way to see which alternatives were actually named and under what conditions. Do not present the current `observed_competitors` array as an exhaustive market or answer list.

Use **Bisnis lain yang disebut** as the visible label for the optional existing comparator summary, adopting Sol §8.2 C and AC-16. Add a narrow scope note: this lists the retained comparator records, and complete answers may contain other names. Keep only already validated names, relationships, and working question references. An empty array suppresses this summary; it must not claim that AI mentioned no alternatives. Do not add automatic entity discovery, ranking, or new cross-answer frequency analysis.

**Do not adopt Sol §9.3.** Extending synthesis to extract other-business names adds validation/schema work and overlaps Spec 011's comparator changes. Full answers already expose the original names and conditions. Revisit that separate enhancement only after its need and boundary are approved.

Label retained URLs as sources attached to the answer, not independently verified support for every claim. Distinguish buyer-supplied facts from observed answer claims. There is no current general citation-span map: do not attach a source to an individual sentence by guessing from its hostname or order.

### 6.7 Findings and actions that earn their place

Use the existing synthesis shape: `conclusion`, `key_findings`, `priorities`, and per-answer assessments. Improve its instructions and review standards rather than introducing a large new report schema.

Each finding must add something beyond repeating a status: a meaningful situation where the business is absent/present, an explicit condition or caveat attached to a recommendation, a supported contradiction, or a contrast among the retained answers. A count-level finding is enough when that is genuinely all the evidence supports. Do not imply the questions represent all customer demand.

Each action must specify a concrete object and a completion check. Use the existing fields, with `Penanggung jawab yang disarankan` to avoid pretending Nuave knows the owner's team.

| Evidence available | Defensible action | Unsupported leap |
|---|---|---|
| Business omitted; no public-page deficiency verified | Check whether official information clearly states the relevant offering/area; if already present, investigate further rather than automatically rewrite it. | “Create a service page because the website lacks one.” |
| AI makes a specific factual claim inconsistent with owner-supplied facts only | Confirm the correct fact against a suitable official source before prescribing a correction. | “AI is wrong” or “your website is wrong.” |
| A retained answer contains an explicit qualification | Check whether the qualifying need matches the intended customer, using that exact answer as the basis. | Rewrite positioning based on an invented reason for exclusion. |
| Answers support a strength; no corrective gap | Maintain the verified information or inspect a clearly labeled untested aspect. | Invent a weakness to satisfy the action minimum. |
| No recommendation outcome was assessed | Explain the limit; propose a bounded evidence check. | Treat non-assessment as a rejection or an SEO diagnosis. |

For example, a fictional action could be: “Periksa apakah halaman layanan menyebut antar-jemput dan wilayah layanan yang sesuai.” Done when: “URL dan teks yang menjelaskan keduanya sudah dicatat; bila belum ada, tambahkan informasi yang benar.” This is a proposed check, not a claim that either item is currently missing.

**Each newly synthesized direct-ten report must contain a minimum of one and maximum of ten findings, and a minimum of one and maximum of ten actions, never padded. If the evidence supports three, show three.** These are independent upper bounds, not a target or one finding/action per question. Actions appear only once in `Yang dapat dilakukan` in each screen/print representation, never as snippets inside findings.

PR B1 widens the current `types.ts` bounds for `key_findings`, `priorities`, and priority `order` from 5 to 10 and aligns the derived synthesis contract and provider instructions. Its cap regressions exercise repair/validation without changing their gap or empty-content behavior. B2 owns the constrained non-corrective path and final minimum gate below. PR A only renders retained content and never retrospectively pads or re-synthesizes an older report.

Preserve the existing Indonesian writing limits in [report-language.ts](../../src/lib/audit/report-language.ts): guidance of at most 20 words per sentence, a hard 25-word sentence ceiling for Nuave-authored fields, no minimum sentence length, and no invented Indonesian field-total limits. Exact questions, raw answers, names, and source text remain exempt. Increasing the number of items is not permission to make each item verbose.

**Known validator mismatch:** the current action gate accepts only an observed gap, while the product permits maintaining a strength or investigating an unknown. Do not solve this by accepting any model-authored action that cites a positive answer: that would admit corrective advice with no corrective evidence.

In PR B2, keep the existing gap rule for model-authored corrective priorities. Add one narrow code-owned non-corrective path for complete runs without a supported corrective gap:

- Define a small set of reviewed Indonesian preservation/verification templates. Before synthesis, prepare eligible candidate objects from the completed observation IDs, exact questions, and already observable business mentions only; do not depend on classifications that the pending synthesis call has not produced.
- After evidence normalization, select at most one candidate compatible with a specific validated strength or unassessed limit. Its basis identifies the actual question and its completion check is concrete. Reconstruct it in code, using the existing priority fields and an explicit preservation/investigation label in customer copy.
- The validator accepts this exception only when the complete action object matches the deterministic builder's expected fields and evidence references for the current observations, allowing only display-order renumbering. Do not recognize intent from a word such as “maintain” or trust a model-supplied flag.
- Keep the original regression that rejects a corrective action citing only positive evidence. Add separate coverage for the legitimate code-owned action, unknown IDs, forged template fields, and retry stability.
- Update synthesis instructions so the model is not pressured to invent a deficiency. Where a structured response still requires one priority, supply the precomputed permitted candidates in the synthesis input and allow one when appropriate; post-normalization code still checks eligibility and the exact object independently. This avoids a circular dependency on the model's own pending assessments. Do not add another call or a persisted field.

This is intentionally narrower than a new general action taxonomy. It must still pass the human usefulness rubric; if no template produces a defensible, useful action, preserve the evidence and use report recovery. A later need for freely generated maintenance categories would require a separately reviewed schema/validation amendment.

Deterministic validation can verify IDs, text integrity, counts, statuses, and some contradictions. It cannot establish that arbitrary prose is logically justified. The qualitative review rubric in section 11 remains necessary; do not claim that a regex or a valid citation proves causality.

**Approved recovery exception — F2 and Founder answer 2; implement in PR B2.** When the final useful-report gate fails after repair, whichever required section is empty (findings, actions, or both), and all ten completed observations remain usable, show the retained exact questions and model answers with a prominent note such as `Analisis Nuave belum selesai. Berikut jawaban model AI yang sudah tersimpan.` This is an **answers-only recovery state**, not a report-ready state. Do not render conclusions, aggregate judgments, per-question Nuave interpretations, findings, or actions from the failed synthesis. In particular, do not present a partial report and attempt to legitimize it with a label.

This explicitly changes Spec 010's current “Observation/report failure” row, which permits only the existing interrupted/failed states. **Block 0 must record the approved amendment to that row before B2 implementation.** Preserve completed observations, existing retry/cost limits, and the prohibition on rerunning completed observations. Observation failures, incomplete ten-answer sets, unsafe/unusable evidence, and other report failures keep their existing recovery behavior; this permission is not a general partial-delivery path.

Use the same retained-observation projection and answer component, not another store or a fabricated `AuditReport`. The recovery projection accepts the ten usable observations without requiring `report.details`: exact questions, raw answers, sources, observation time/model, and the unfinished-analysis notice are enough. Result classifications or interpretation from a rejected report must not leak into this reader. Keep the ordinary explicit report-retry control; viewing/reloading answers makes no new request. Do not show report-ready/PDF-report delivery controls or export a failed synthesis as a completed report.

The final useful-report gate still requires at least one supported finding and one supported action. If either section is empty after repair, the report is not delivered and the answers-only recovery state applies (G1). Surviving findings or actions from that failed synthesis are never exposed in it: the reader shows questions, answers, sources, provenance, and the unfinished-analysis notice only. This keeps the customer outcome monotonic: a synthesis that kept some analysis is never shown less than one that kept none, and neither is shown less than today's delivery of the retained evidence. A supported maintenance/investigation action may satisfy the minimum; filler may not. No automatic observation rerun or extra synthesis pass is introduced.

B2 changes the assertions in `report-delivery-resilience.test.ts` and `report-priority.test.ts` that currently permit delivery after all priorities are removed. Define the precise non-corrective builder and final minimum gate in the numbered spec. **PR A and PR B1 preserve baseline recovery and empty-content delivery behavior**; neither edits `LocalAuditStage` to expose an unfinished report. B1's independent widening/instruction work does not wait for the B2 template/recovery implementation.

### 6.8 Screen, PDF, and JSON

**Founder answer 3: the PDF mirrors screen order, with no appendix.** Print the same direct-ten screen tree using print CSS only:

1. Hasil singkat.
2. Jawaban model AI — all ten exact questions and complete answers, in approved order, with retained sources and metadata.
3. Analisis Nuave.
4. Yang dapat dilakukan.
5. Tentang audit ini.

Use one answer DOM tree and one set of question anchors. Remove the separate direct-ten `detailsPrint` / `aria-hidden` answer copy; do not replace it with another hidden print component, duplicate Markdown rendering, portal, or print-time clone. Historical-method rendering remains compatible under section 7.1. Print CSS controls spacing, pagination, URL wrapping, and visibility of controls, without reordering sections or generating another report.

All answers are always visible on screen, so the print tree is the screen tree with no state to reconcile (G2). Remove height/overflow clipping in print. Do not add a second print tree or a JavaScript regeneration path. Hide copy and `Teks asli` controls in print while retaining the question, answer, sources, and provenance.

Keep headings with following content so they never orphan. Keep short answer blocks together **when practical**; allow long answers to break across pages. Do not apply whole-answer `break-inside: avoid` indiscriminately. Test headings, nested lists, tables, long paragraphs, and URLs. Retained source titles and URLs must remain readable on paper. Accept necessary evidence length; there is no front-brief page target, forced appendix, clipping, or excessive type shrinking to meet a page count.

**Founder answer 1 / F1 / G3: revert the toolbar label to the settled `Download PDF` for every report.** In PR A, change the `pdfLabel` prop default in `src/components/product/ReportToolbar.tsx` from `Cetak / simpan PDF` to `Download PDF`. That file is not a protected shared file, and `VOICE.md` settles the label for all customer-facing surfaces, so historical reports change too. Do not override the label only at the direct-ten call site. This corrects a pre-existing code-versus-`VOICE.md` discrepancy; it is not a new voice decision. Keep the existing `window.print()` mechanism and ordinary browser save-as-PDF flow. Do not introduce a hosted PDF service or promise an automatically downloaded file. Update the exact-label browser test locator in `tests/e2e/new-intake-glm.spec.ts`, retaining its existing print/no-repeat assertions.

JSON remains the complete technical evidence export with internal telemetry/failure diagnostics omitted. It stays secondary to reading/PDF. Screen, print, copy, and JSON must agree on stored questions, answers, and outcomes; no synthesis or source fetch occurs for formatting. The B2 answers-only recovery state is not a completed report and must not use these report-delivery controls.

## 7. Technical approach and compatibility

### 7.1 Small presentation boundary and explicit method routing

Keep the existing `ReportView({report, brief, observations, ...})` boundary. Route presentation using **`report.provenance.question_method`**, adopting Sol §9.2:

- `direct-ten` selects the new report body; that same tree prints in the same order.
- Absent or historical methods retain the current compatible renderer and original denominators.
- Never infer the method from IDs, question count, or branded/unbranded counts. Do not silently migrate historical reports.

Add the proposed pure module `src/lib/audit/report-presentation.ts`. It joins details to observations by `prompt_id`, validates bindings, preserves the retained approved order, assigns human ordinals/anchors, and formats metadata. It does not use the `brief` to manufacture missing facts or create a competing identity shape.

| Displayed value | One authoritative source |
|---|---|
| Method/layout selection | `report.provenance.question_method`. |
| Mention and explicit-recommendation counts | `report.measures.overall` and `report.measures.recommendation`; do not reclassify answers. |
| Completion context | Validated `report.measures.overall.total` and `report.counts.failed`, consistent with the ten completed retained observations. |
| Exact question, answer, order | `observations`, already bound to the approved pack by the existing pipeline; join classifications by ID, never by array position alone. |
| Result labels and per-answer Nuave explanation | Matching validated `report.details`. |
| Findings, actions, and narrow comparator summary | `report.key_findings`, `report.priorities`, and `report.observed_competitors`; map all cited IDs to answer anchors. |
| Source URLs/titles, observation date/model | The matched observation's retained source and provenance fields. |
| Report generation time | `report.generated_at`, explicitly labeled as report creation, never observation time. |

**F8 regression:** the adapter test for ten completed direct-ten observations with one recommendation and nine `not_assessed` judgments must assert numerator 1 and denominator **10**, sourced from `report.measures.recommendation`. Do not hardcode a display-only ten to conceal changed upstream arithmetic. The generic AC-17 comment on `types.ts` does not describe direct-ten correctly; its appearance-gated wording must not override `buildAuditReport` or this regression. PR A leaves that protected file untouched; B1 may correct the comment while widening its bounds.

**Adapter gate, adopted from Sol §9.1 and phase 1:** no React or CSS change until every displayed value has one authoritative source and adapter unit tests pass. Test missing/extra IDs, duplicate observations, duplicate details, absent raw answers, and independently reordered detail/observation arrays. An order mismatch must surface an explicit binding failure, consistent with the current `validateReportContent` order rule; do not silently sort, zip, or repair evidence to conceal it. Valid data preserves its retained order, including IDs whose lexical order differs from the approved sequence.

Fail loudly in tests with a specific binding diagnostic. At runtime, handle invalid saved evidence with an honest unavailable/recovery state and preserve usable retained data; do not crash the whole journey, display a mismatched answer, or call an excerpt “complete.” Do not fabricate an order the inputs cannot establish.

All new presentation logic belongs in new report-local answer, evidence-reference, and body components. The helper must not classify, score, call providers, fetch sources, mutate reports, or create a second evidence store. Compose existing shadcn/Base UI primitives; search BeUI before custom disclosure work as required by `DESIGN.md`.

### 7.2 No storage migration for presentation

The first slice needs no database, report endpoint, observation schema, or saved-session migration. Keep the actual baseline stamps `nuave-report-v3` and `nuave-evidence-v4`; these are schema versions, not evidence of a new observation. Full answers already travel with the saved observation array and customer export.

PR B1 widens existing item-count constraints without adding persisted fields; it must continue to read previously valid records. Historical non-direct-ten rendering remains unchanged. After B2, the complete one-to-ten usefulness/minimum gate applies to newly synthesized direct-ten output; B1 widens the bounds while preserving current repair/delivery behavior. An older delivered report stays inspectable without automatic rewriting.

Changing layout must not regenerate synthesis on mount, expansion, copy, print, Back, or reload. Reformat existing reports from their retained data. A newly authorized re-synthesis is a new report instance with new synthesis provenance and generation time; preserve the original observation times and the previously delivered report. Do not overwrite a delivered interpretation in place.

If implementation discovers a need for persisted fields or a different report schema, return a bounded amendment for review before proceeding. Do not add speculative schemas or automatic historical migrations under this plan.

### 7.3 Content changes use the existing synthesis call

Apply F6 with two independently reviewable PRs after Spec 011 is verified and merged:

- **B1 — bounds, instructions, header integration.** Widen findings, priorities, and priority order to ten; tighten evidence-led, non-causal, non-padding synthesis instructions; finish the deferred header/date/contents work. Inspect all report adapters, including `openai.ts`, `gemini.ts`, `groq.ts`, and `openrouter.ts`, for hardcoded caps and shared schema use. Keep provider transports/observation execution unchanged. Preserve the current gap validator, empty-content delivery/recovery behavior, and `LocalAuditStage`; B1 must not claim B2's final usefulness/minimum handling.
- **B2 — non-corrective path and recovery.** Add the exact code-owned preservation/verification path, final minimum-usefulness handling, and the founder-approved answers-only recovery state with its Spec 010 amendment. This owns the necessary validator/repair/pipeline and small `LocalAuditStage` changes. It consumes B1's widened contract and PR A's existing reader; no duplicate UI or store.

Limit new generation/usefulness rules to direct-ten, preserve historical behavior, and remain inside the existing synthesis/retry budget. B1's instructions must not authorize the maintenance-template exception before B2 validates it, and neither PR may invent a gap to fill the minimum. Template or recovery implementation issues in B2 must not block B1's bounded work.

Increase `REPORT_SYNTHESIS_PROMPT_VERSION` for material instruction changes in either PR. Keep `plain-id-v1` while preserving its existing writing limits. Protect the language-only retry's classifications, IDs, timing/owner fields, sources, and answer text. No additional critique/rewriting call or observation pass.

### 7.4 Spec 011 integration boundary and fixed PR sequence

**PR A (blocks 1, 2, 4) starts from current main without waiting for Spec 011. PR B1 (block 3a) and PR B2 (block 3b) wait for its verified merge.** B1 and B2 split the previously approved PR B scope; they do not move shared-file work into A. The numbered-spec approval gate precedes runtime work. This task remains documentation only.

The iteration prompt reports that Spec 011 changes `ReportView`'s `brief` from `BusinessBrief` to `AuditSubject`, confines its view edits to the header/identity block, and changes `contracts.ts`, `report-pipeline.ts`, `report-priority.ts`, `types.ts`, and `customer-evidence-export.ts`. The v2 reviewer confirms the header isolation. This remains supplied working-tree evidence, not a change in the investigated baseline or the previously inspected `194f0f4` remote snapshot. Verify the merged diff at integration; do not guess the final shape.

| Boundary | PR A — presentation now | PR B1 — bounds, instructions, header | PR B2 — non-corrective path, recovery |
|---|---|---|---|
| Base | Then-current `origin/main`; record SHA and differences from the investigation baseline. | Main containing verified Spec 011; record merge SHA and verification evidence. Consume integrated PR A before final verification. | Verified Spec 011 plus B1 and the existing PR A reader; record those dependencies. |
| New logic | New `report-presentation.ts` and report-local answer/reference/body components, focused tests, and scoped print CSS for the same tree. | Widen count/order bounds and align instructions across report adapters; preserve current validators/recovery. | Exact code-owned non-corrective actions, final minimum gate, and answers-only recovery projection/integration. |
| `ReportView.tsx` | Imports and method/body wiring outside header/brief; no `pdfLabel` override (the default changes in `ReportToolbar.tsx`, G3). No header/type rewrite or speculative brief shim. | Consume the verified `AuditSubject` boundary; integrate header/date/attribution and contents labels/order. | Reuse the integrated reader; do not duplicate report rendering for recovery. |
| Shared files | Do **not** edit `contracts.ts`, `report-pipeline.ts`, `report-priority.ts`, `types.ts`, or `customer-evidence-export.ts`. Leave providers, `LocalAuditStage`, and intake/request projections untouched. | Narrow `types.ts` bounds/comment edits, instruction/version changes and relevant provider tests; header integration. No non-corrective exception or `LocalAuditStage` recovery edit. | Necessary `contracts.ts`, `report-priority.ts`, `report-quality-repair.ts`, `report-pipeline.ts`, template instruction plumbing, and small `LocalAuditStage` changes, after reconciliation with Spec 011/B1. |
| Styles / export | Direct-ten body/print CSS only; no indirect header edits through global tokens. Existing JSON exporter unchanged. | Final header styling and label/date checks; preserve exporter contract. | Recovery notice and existing answer component; no completed-report export of rejected synthesis. |
| Integration | Rebase the open branch once after Spec 011 merges; inspect prop/header/export differences and rerun affected tests. If already merged, verify combined main without rewriting history. | Do not bundle B2 to make B1 deliverable. | Implement under the explicit Spec 010 failure-table amendment and reviewed template contract. |

E14's date correction, header compactness, and contents-label/order cleanup belong to **B1**. PR A already shows correct observation metadata in its new body; it must declare the unchanged header limitation, not hide it through styling. The final useful-report minimum and approved recovery exception belong to **B2**. Interim PR acceptance is not whole-plan completion.

Do not change intake screens/state, frozen inputs, question wording/generation, approval fingerprints, audit execution, rate limits, payment, or accounts. Keep unknown optional values unknown. Stop the affected integration if the actual Spec 011 diff breaks these boundaries; propose a narrow correction rather than another brief/state/projection.

## 8. Proposed implementation sequence

There are three reviewable PRs: A now, then B1 and B2 after verified Spec 011. Block 0 promotes this plan to one numbered specification. Labels, answers-only recovery, and print order are settled founder decisions, not questions to ask again.

| Block | Work and likely files | Exit evidence / dependency |
|---|---|---|
| 0. Record decisions and approve the spec | Review v3, then create one numbered spec. Record all seven founder decisions. Amend `docs/VOICE.md` at that stage to settle **Bisnis Anda direkomendasikan di Y dari 10 pertanyaan**; retain **Bisnis Anda muncul di X dari 10 pertanyaan** and **Download PDF**. Record the `ReportToolbar` default-label change as a correction to code, not a new voice choice. Explicitly amend Spec 010's **“Observation/report failure”** row for the approved ten-answer recovery case whenever the final gate fails (findings empty, actions empty, or both): answers plus unfinished-analysis notice only, no surviving analysis exposed, existing retry/cost rules, no completed-observation rerun or partial report. **G4 note for the founder:** in that state the customer can copy answers but cannot print or download them; the retry control is the intended path. Confirm this or ask for print in that state. Record same-order/single-tree print and reconcile `AUDIT.md` / journey 06. Preserve the gate for explicit approval of `react-markdown` and `remark-gfm` with exact compatible pins; review the concrete non-corrective template contract. | One approved spec, exact labels and dependency pins, required canonical/Spec 010 amendments, fixtures/rubric, and separate A/B1/B2 allowlists. Founder decisions are recorded, not reopened. This task performs none of those other file edits or installs. |
| 1. Expose exact answers — A | Pure adapter/tests first, then new answer/body/reference components and minimal method/body wiring outside the protected header. All exact questions/results/full Markdown answers open by default, source list, dates/models, raw view/copy. Answer-body URLs always inert. | Adapter source/binding tests and F8 denominator-10 regression pass before React/CSS work. Ten full answers require zero clicks; only the separate retained-source list contains active external evidence links. |
| 2. Make the report readable — A | Exact settled count labels with quiet completion; fixed layer labels; no untested tiles, arbitrary finding quote, or repeated action. Scoped body CSS; change the `ReportToolbar` `pdfLabel` default to `Download PDF` for every report; update the affected exact-label browser locator. Keep stored content and backend limits/recovery unchanged. | Desktop/mobile hierarchy, exact labels, evidence links/copy, and compatible historical renderer pass. Header/date limits and B2 usefulness work are explicitly deferred. |
| 3a. Widen bounds and improve instructions/header — B1 | After verified Spec 011, widen `types.ts` findings/priorities/order to ten, correct its method-misleading denominator comment without changing arithmetic, align report adapter instructions/versioning, and finish deferred header/date/contents integration. | Three supported items stay three; 10-item/order-10 cases pass and 11 fails. Exact evidence, historical denominators, language-retry protection, and date/label semantics stay correct. Existing gap validation and empty-content recovery/delivery remain unchanged. No dependency on B2 templates/recovery to complete B1. |
| 3b. Add non-corrective actions and recovery — B2 | Implement the reviewed code-owned path and final useful-report minimum in validators/repair/pipeline; add the small `LocalAuditStage` answers-only recovery integration under the explicit Spec 010 amendment. Reuse A's reader with observations alone, never a fake report. | Supported maintenance survives and forged/unsupported exceptions fail. Ten usable answers remain readable whenever the final gate fails, with a clear unfinished notice and no findings/actions/partial report. Other failure states preserve their specified behavior; no extra calls or observation reruns. |
| 4. Complete print/export parity — A | Print the single screen tree in screen order using CSS; remove the separate direct-ten answer print copy. Keep `customer-evidence-export.ts` unchanged. | Browser A4 PDF contains each question/full answer once in screen order, no appendix or hidden duplicate tree; headings stay with content, short blocks group when practical, long ones reflow. JSON unchanged. Recheck after the Spec 011 rebase. |
| 5. Verify and judge usefulness — each PR and combined | Focused tests, `npm run verify`, full diff review, and private founder walkthrough of authorized retained evidence. Record A/B1/B2-specific acceptance plus the final integrated outcome. | A passes presentation/print gates; B1 adds bounds/instructions/header; B2 adds non-corrective/recovery/minimum gates. Whole-plan acceptance requires all three and the human rubric, not an interim PR's test pass. |

**A = blocks 1, 2, 4; B1 = block 3a; B2 = block 3b.** Each includes its block 5 checks. Both B PRs start from main containing the verified Spec 011 result; B2 consumes B1 and the integrated A reader. Do not merge or deploy any PR, or run live providers, without the required authorization.

Follow the existing `README.md` lockfile procedure during authorized implementation. New PR A logic remains in new files; its allowed existing-file changes are the narrow report-body/method wiring, toolbar prop, scoped styles, and focused test updates. Optional F4/F7 refinements are specification work, not permission to broaden A.

## 9. Acceptance criteria

These are the final combined criteria. PR A records presentation/print acceptance; B1 adds bounds/instructions/header; B2 adds non-corrective actions, the final minimum, and amended recovery. No interim subset implies completion.

| ID | Observable requirement |
|---|---|
| AC01 | On first render and reload of a complete direct-ten report, all ten exact approved questions, result labels, and complete retained answers are open and visible without any click, in approved order. No ID, category, preview, excerpt, or line clamp replaces the evidence. |
| AC02 | The direct-ten view has no collapse controls; every answer body stays mounted and visible. Reading, copying, printing, and navigation trigger zero generation, observation, report, or source-fetch requests. |
| AC03 | `Teks asli` and copy preserve exact question/answer strings, including line breaks, repeated whitespace, punctuation, and Unicode. Markdown preserves all substantive text and qualifiers. Invalid/unavailable evidence is distinguished from absence; an excerpt never substitutes for a missing full answer. |
| AC04 | Every finding/action reference reaches all its exact cited answers with usable focus/scroll behavior. Actions appear once, only in `Yang dapat dilakukan`, in the shared screen/print tree. No first-shared-ID pairing, arbitrary finding quote, duplicate anchor, or lexical-ID ordering. |
| AC05 | Direct-ten uses exactly `Bisnis Anda muncul di X dari 10 pertanyaan` and `Bisnis Anda direkomendasikan di Y dari 10 pertanyaan`, plus quiet completion. No duplicate unnamed or untested tiles. Historical, mention-only, non-assessment, zero-appearance, and failed-run meanings stay correct; the adapter pins direct-ten recommendation denominator to ten without recomputing evidence. No invented rank/model. B1 completes observation-date versus synthesis-time header labeling. |
| AC06 | The final post-B2 direct-ten report has one to ten findings and one to ten actions, never padded; three supported items means three shown. Every item has valid evidence and passes the rubric. Only the exact code-owned exception admits a non-corrective action without an observed gap. For ten usable observations where the final gate fails (findings empty, actions empty, or both), the amended recovery view contains retained questions/answers, sources/provenance, and an unfinished-analysis notice only: no conclusions, classifications from rejected synthesis, findings, actions, or partial/report-ready delivery. A/B1 retain baseline recovery; B2 enforces the final minimum and approved exception. |
| AC07 | Answers follow the bounded Markdown policy: no active HTML, images/embeds/remote assets, unsafe links, or hidden requests. Every answer-body URL/link is inert, even when present in retained sources. Only the separate retained HTTP(S) sources list provides active external evidence links. No invented citation mapping or exhaustive competitor claim; use `Bisnis lain yang disebut` for the narrow retained summary. No provider envelope/telemetry in the reader. |
| AC08 | `Download PDF` invokes the existing browser print path. PDF prints the single screen tree in screen order, with all ten exact questions/full answers appearing once, no appendix or duplicate direct-ten print tree. Print is complete through both the toolbar and the browser's own print command. Inspect every page: no orphan headings, short blocks together when practical, long answers/tables/URLs reflow. Screen/PDF/JSON retain the same evidence. |
| AC09 | Only `report.provenance.question_method === "direct-ten"` selects the new presentation. Absent/historical methods keep the current renderer and denominators, even when IDs/counts resemble direct-ten. Back/reload preserve the completed report with zero calls; truthful synthetic/live notices and unknown optional intake facts remain intact. |
| AC10 | At 390px and 1440px, questions, full answers, controls, and action hierarchy are usable; also check 320px reflow and 200% zoom. Keyboard users can follow references and reach the copy and `Teks asli` controls with visible focus. The new direct-ten view contains one answer tree and one set of anchors; there is no duplicate print tree to hide from screen readers. |
| AC11 | A timed founder walkthrough establishes whether the reader understands the sampled result, reads a complete answer, distinguishes `Jawaban model AI`, `Analisis Nuave`, and `Yang dapat dilakukan`, and explains one justified next step. Record actual confusion/outcome; test passes alone do not prove usefulness. |
| AC12 | Final `npm run verify` passes offline on the implementation branch. Diff contains only approved scope, no temporary inspection route, private evidence, credentials, or debug bypass. Record build/browser evidence and unresolved limits separately. This documentation revision claims no runtime verification. |
| AC13 | Before any React/CSS edit, adapter tests establish one authoritative source per displayed value and explicit failure for missing, duplicate, or reordered bindings. Valid inputs retain exact strings/order without mutation; corrupt records never produce plausible mismatched answers. |
| AC14 | PR A starts from current main, puts new logic in new files, leaves header/brief and protected shared contracts untouched, and is integrated once after Spec 011 merges. B1 and B2 start from main containing its verified result, with B2 consuming B1 and the existing reader. No intake edits, parallel brief/state/projection, or silent relaxation of these boundaries. |

## 10. Fixture and test plan

Use fictional public fixtures, not actual business answers. Preserve historical fixtures as historical. This two-column matrix absorbs Sol §13; each row defines its required assertion. No fixture is created in this documentation task.

| Fixture | Required assertion |
|---|---|
| Ten completed direct-ten answers, no appearance | Both summary counts are truthful; all ten exact questions/results/full answers are already visible; absence is not a diagnosed business defect. |
| Mention without explicit recommendation | Appearance and recommendation remain distinct in aggregate and question labels. |
| One explicit recommendation plus nine `not_assessed` answers | The pure adapter explicitly asserts numerator 1/denominator 10 from validated measures (F8); all nine non-assessments remain honestly labeled and historical denominator tests stay separate. |
| Recommendation qualified in a later paragraph | The full answer includes the condition; neither rendering nor interpretation silently drops it. |
| Opening “Ya.” followed by substantive paragraphs | Every paragraph is shown by default; no excerpt or display-preview selector substitutes for the answer. |
| All-positive answers | B2's supported code-owned preservation/verification action satisfies the minimum without inventing a gap; A/B1 do not claim this new behavior. |
| Forged template object, unknown ID, or positive-only corrective action | Each unsupported candidate fails the exception; wording or a model-supplied flag cannot activate it. |
| Exactly three supported findings and actions | Exactly three of each display; no padding to ten or enforced three-item cap on other cases. |
| Ten supported findings/actions, including priority order 10 | All ten pass B1's widened bounds without truncation; a separate 11-item/order-11 case fails the cap. |
| Final gate fails after repair (findings empty, actions empty, or both); ten usable observations remain | B2 shows the answers-only reader and unfinished-analysis notice under the amended Spec 010 row, with no rejected classifications, conclusions, findings/actions, report-ready controls, or new calls. A/B1 preserve baseline recovery. |
| Findings survive repair but every action is removed | B2 shows the answers-only reader; the surviving findings are not exposed anywhere. |
| Ten-answer set incomplete or unsafe | B2 delivers no partial report and does not show the answers-only reader; the applicable existing failure/retry or data-handling path remains in force. |
| Owner-supplied fact conflicts with an answer | The proposed step confirms the fact before correction; source links do not imply independent verification. |
| No structured comparator, but other names in raw answers | Full answers expose the names; the optional summary is absent without claiming there were no alternatives. |
| One validated comparator | `Bisnis lain yang disebut` shows only the retained record with correct answer links and a non-exhaustive scope note. |
| Missing/duplicate/unknown comparator evidence reference | No ungrounded link/name is rendered; expose the integrity issue rather than adding extraction or inventing a relationship. |
| Failed observation or interrupted synthesis | Existing recovery remains available; no partial audit is delivered and evidence reading never reruns observations. |
| Headings, nested lists, table, long URL, HTML/script and image payload | The full answer follows the text-oriented Markdown allowlist, nothing executes or loads remotely, and print reflows the content. |
| Answer-body URLs, including one also present in retained sources, plus unretained/unsafe links | Every body URL is inert/noninteractive; only the separate retained HTTP(S) source entry is clickable with its saved title/domain. No automatic source fetch or source-matching link exception. |
| CRLF, Unicode, repeated spaces, and punctuation | Raw view, copy, and JSON preserve exact stored strings without normalization. |
| Missing observation, missing detail, missing full answer — separate cases | The adapter gives an explicit binding/evidence failure; no different answer or excerpt substitutes. |
| Duplicate observation ID or duplicate detail ID — separate cases | The adapter fails before a map can silently overwrite a record. |
| Details reordered independently of observations, and vice versa | The adapter reports an order/binding mismatch; it never pairs by position or conceals the defect by sorting. |
| Valid approved sequence with IDs outside lexical order | Human ordinals follow retained order and every detail/reference binds by actual ID. |
| Absent/historical method with direct-ten-looking IDs/counts | The existing historical renderer and original denominators remain selected. |
| Missing optional intake values after Spec 011 | The integrated presentation consumes the verified boundary and leaves unknown values unknown. |
| Different observation timestamps/models and later synthesis time | Answer/method metadata uses observation provenance; B1's header separates evidence date from creation time. |
| Finding/action cites several answers | Each reference focuses the correct question heading; no action snippet repeats in findings. |
| Back/reload, copy, collapse, PDF/JSON actions | The saved snapshot persists, reload starts all-open, and generation/run/report counters do not increase. |
| Single-tree browser PDF with short/multi-page answers | PDF section order matches the screen, each question/full answer appears once, and every page passes heading/grouping/reflow checks; no duplicate tree or appendix. |
| Toolbar label for every report and exact-label browser selector | The visible action is `Download PDF` on direct-ten and historical reports, backed by the existing print callback; the test locator uses the settled wording without weakening no-repeat assertions. |
| JSON export before/after presentation changes | Fields, questions, answers, provenance, and existing export version stay intact; PR A does not edit the exporter. |
| Fictional unnecessary-personal-data marker | Review stops and invokes existing restrict/escalate handling; no silent rewrite, publication, or real personal data enters the fixture. |

Coverage sequence:

- **Adapter first:** unit tests for the source map, exact values/order, binding failures, recorded-method routing, metadata, and allowed URLs. No UI work until this gate passes.
- **Components/browser:** default-open answers, optional accessible controls, evidence focus/links, exact copy, settled labels, one answer tree/anchor set, inert body URLs versus the clickable sources list, historical compatibility, and existing synthetic-journey request counters.
- **B1 pipeline:** one-to-ten array/order bounds, non-padding instructions, header/date integration, and unchanged current gap/repair/delivery behavior. **B2 pipeline:** constrained non-corrective actions, forged-exception rejection, final minimum gate, the amended answers-only recovery state, and unchanged retry evidence protection.
- **Print:** use the actual toolbar and browser print paths on the same DOM tree; verify order and each question/answer exactly once, including after optional collapse. Extract text, then inspect every page. Text presence alone does not prove pagination quality.

Reuse existing suites under `src/lib/audit/`: `direct-ten-audit.test.ts`, `report-excerpt.test.ts`, `report-labels.test.ts`, `report-gaps.test.ts`, `report-priority.test.ts`, `report-pipeline.test.ts`, `report-language-id.test.ts`, `report-delivery-resilience.test.ts`, and `customer-evidence-export.test.ts`, plus `tests/e2e/new-intake-glm.spec.ts`. Their paths and relevant assertions were rechecked at the baseline. The presentation helper/test are proposed new files. Resolve moved paths after integration instead of adding duplicate suites.

This documentation revision checks references, decisions, and the diff. It does not run providers, add fixtures, install dependencies, or claim implementation tests or visual verification passed.

## 11. Human usefulness gate

Before coding, use this same rubric to mark a current retained report, without another observation call. Repeat after the redesign with the same evidence. The founder can inspect private evidence locally; public verification records should contain pass/fail findings and field-level descriptions, not customer answers.

Proposed walkthrough targets:

- **Within 30 seconds:** explain what `x/10` means and what it does not mean.
- **Within 60 seconds:** find a particular customer question and read what AI actually said, including a condition or caveat.
- **Within three minutes:** explain the basis of the first action and what would count as done.
- **Within about ten minutes:** understand the useful core of the report without needing to read all ten long answers.

These are lightweight founder checks, not a statistically validated usability study. A few target-owner sessions can follow when external contact is separately authorized.

For every material finding/action, the reviewer answers:

1. What exact observation supports it?
2. Is this an observed fact, Nuave interpretation, or proposed investigation?
3. Did the text imply a cause, missing page, wrong business fact, service quality, or lost revenue that was not established?
4. Does a caveat elsewhere in the answer materially change the claim?
5. Can the owner do something specific, and recognize when it is done?
6. **Would this survive with no minimum?** Keep only items worth including on their own evidence; ten is not a quota. If three are supported, show three, and never pad to make the report look fuller.

Any unsupported material claim fails the quality gate. A readable report with only generic advice also fails the usefulness gate. A thin but honest result should lead to a bounded investigation, not fabricated certainty. If the retained evidence cannot support useful interpretation even after this work, return that finding to the founder; do not hide a method limitation behind design polish or initiate new research automatically.

## 12. Risks, limits, and deliberate exclusions

| Risk or limit | Response |
|---|---|
| All-open answers increase scrolling. | Keep the two-count summary compact, provide anchors and clear typography. Accept necessary evidence length; no clipping and no collapse controls in PR A. |
| Better evidence access exposes weak synthesis. | Complete B1's instruction work, B2's support/minimum/recovery work, and the rubric; presentation alone cannot make advice useful. |
| A ten-item cap becomes a generation target. | Minimum one/maximum ten for each section, never pad; test three supported items and reject unsupported/redundant material. |
| Arbitrary prose cannot be fully verified by code. | Keep deterministic integrity checks and qualitative review; no extra model-judge loop. |
| Data cannot support complete other-business/source attribution. | Use full answers, retained links, and the narrowly labeled comparator summary. Defer Sol §9.3 extraction. |
| Shared files change under Spec 011. | Protect PR A's header/brief and shared-file boundary; rebase once after its merge. Start B1/B2 only from the verified result; stop affected work if the actual diff invalidates isolation. |
| PR A leaves known header/content defects. | Record E14/header cleanup and caps as B1 work, and non-corrective/minimum/recovery as B2 work. No interim PR counts as final acceptance. |
| A saved report lacks usable evidence. | Show honest unavailability/recovery, preserve usable records, and never reconstruct or rerun automatically. Historical rendering stays compatible. |
| Markdown/print becomes unsafe or unreadable. | One bounded renderer with approved exact pins, no active HTML/assets, inert answer-body URLs and a separate retained-source list, with single-tree screen/PDF verification. |
| A raw answer contains unnecessary personal data. | **Stop and treat it as a source/data-handling defect**, adopting Sol §14. Restrict access and tell the founder under the existing repository rule; do not copy it into another tool, Git, or an export for review. Never silently redact/rewrite it and label it exact. A safe subsequent evidence/delivery decision must be explicit. |

Excluded: new observation models/providers, new questions, causal SEO diagnosis, webpage crawls, rankings/benchmarks, model comparisons, report chat, recurring monitoring, task management, accounts, durable hosting, payment changes, new privacy/retention promises, and automatic retrospective rewriting of delivered reports.

### 12.1 Implementation stop conditions

Adopted from Sol §15 and adapted to the settled PR split. Stop the affected work and return the concrete problem to the founder or orchestrator if:

- runtime work lacks an approved numbered spec, or the Markdown dependencies and exact pins lack approval before dependency changes;
- PR A needs a protected shared-file/header/brief edit, or new logic cannot stay in the allowed new files without changing that boundary;
- B1 or B2 is about to start without main containing the verified Spec 011 result; **this does not block PR A**;
- the actual Spec 011 diff invalidates isolation, requires another state/brief/projection, or changes intake/frozen-question semantics;
- retained answers are missing, duplicated, mismatched, or unsafe and the specified unavailable/recovery behavior cannot preserve them honestly;
- unnecessary personal data is found: stop processing it, restrict access, and notify the founder under the existing rule;
- a claim requires unsupported causation, ranking, service quality, or business performance, or useful content cannot meet the minimum without padding;
- a summary requires entity extraction beyond the retained comparator, a provider call, source fetch, or another observation pass;
- B2 is about to change recovery before the approved Spec 010 failure-table amendment is recorded, or would expose rejected analysis or broaden the permitted answers-only case;
- a solution needs persisted schema extensions, automatic historical migration, new privacy/retention promises, a duplicate direct-ten print tree, or another generation path for PDF;
- print cannot retain every answer legibly, or historical method meaning cannot be preserved within the approved scope.

Expected bad-input fixtures exercise the specified failure behavior; they do not authorize weakening it. Do not reopen the four founder decisions over routine implementation choices. Return the smallest concrete conflict and proposed correction.

## 13. Independent reviewer handoff

**Role:** independent product-design, software-architecture, and evidence-integrity reviewer. Review the proposal; do not implement it or assume that detail implies correctness.

**Read in order:** `AGENTS.md`; the linked v2 review including its Founder answers; the earlier iteration prompt; this v3 plan; Sol's cited sections for attribution; Spec 009 R-07 and its continuation amendment; Spec 010's report/recovery boundaries; `AUDIT.md` sections “Turn evidence into findings,” “Report format,” and “Report acceptance checklist”; `VOICE.md` exact labels; `DESIGN.md`; then only the code linked in section 3. Check claims at `4e6b2cf` and inspect current integration state separately. Read Spec 011's R-23/R-27 boundaries at the linked branch if unmerged. Do not read private evidence or archive material.

Check, in particular:

1. Is this the smallest complete change that answers “What exactly did AI say?” and makes the report useful?
2. Do all-open answers, two summary counts, and stable layer labels satisfy the settled direction while preserving a quick reading path?
3. Are direct-ten and historical denominators preserved, including `not_assessed` handling?
4. Does the plan distinguish complete Markdown answers, exact raw text, Nuave analysis, actions, and source attribution without retaining a preview dependency?
5. Is supported-basis validation precise enough for positive and thin-evidence reports without weakening integrity?
6. Can B1's bounds/instructions/header work stand independently of B2's non-corrective/minimum/recovery work, preserving current intermediate behavior and the final evidence/retry protections?
7. Are same-order/single-tree print, inert answer URLs, and the amended answers-only recovery state concretely testable, including absence of rejected report analysis?
8. Can A respect the protected header/shared-file boundary now, and can B1/B2 integrate after verified Spec 011? Are the toolbar override, exact labels, canonical amendments, and remaining limitations explicit?
9. Are the method-routing and adapter gates sufficient, and which narrow details or unresolved decisions block specification approval? Do not reopen the four original founder decisions or the three v3 Founder answers.

Return findings first, ordered by severity. For each give the plan section, repository evidence, likely failure, smallest correction, and whether it blocks implementation. Distinguish source-confirmed defects from hypotheses and preferences. **Name blocking product decisions explicitly**, separating them from all seven settled decisions and ordinary implementation choices. Do not rewrite the plan before reporting findings. Following Sol §16, end with exactly one verdict: **ready for specification / ready after narrow fixes / requires redesign**.

## 14. Completion record for this planning task

- Applied required findings **F1, F2, F3, F5, F6** and all three Founder answers from the v2 review at `4f8e93c`; the earlier four decisions and Sol adoption trace remain in force except where these explicit decisions refine them.
- Added **Changelog v2 → v3** under the header. Applied optional F8; F4/F7 are named refinements for specification work, not hidden implementation requirements.
- Rechecked affected baseline evidence: `VOICE.md` exact labels, Spec 010's failure row, toolbar label prop/callback, print/disclosure markup, report adapters, and direct-ten denominator behavior. No new runtime verification is claimed.
- A, B1, and B2 have separate scope/gates. The recommendation-label and Spec 010 amendments are explicit future specification tasks; the answers-only state does not deliver a partial report.
- No private evidence, production UI, or new PDF was inspected. Implementation still requires the stated visual and usefulness gates.
- This revision changes only this plan. No runtime code, fixtures, dependency installs, providers, canonical-document edits, `docs/NOW.md`, or `docs/DECISION_LOG.md` changes.
- **v3.1:** applied G1–G4 from the v3 review at `a16af5a`; edited by the tech lead because Astra's local v3.1 could not be pushed. No other content changed.
- **Next smallest action: founder confirms the G4 note, then promotion to one numbered specification.**
