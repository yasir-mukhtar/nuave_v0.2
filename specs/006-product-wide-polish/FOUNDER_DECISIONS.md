# Founder decision record — product-wide design pass

> Status: **Draft** — decision record accompanying the draft design-pass SPEC.
> Created: 2026-08-19
> Context: all nine decisions were put to the founder during the 2026-08-19
> design-pass planning session, each with options and a recommendation. This
> file records the questions, the options offered, the founder's answers, and
> what each answer implies for the pass.
>
> On SPEC approval, the material entries fold into `docs/DECISION_LOG.md` per
> `docs/WORKFLOW.md` promotion; until then this draft is their only home.

## Settled decisions

### D1 — Sequencing: when the design pass runs

**Question.** Run the redesign now in parallel with specs 003/004, or gate it
as END_TO_END Phase 6 (after real payment and durable delivery)?

**Options offered.** (a) Decide now, build in waves — foundation + landing
parallel-safe with 003/004, paid-journey screens after the report-quality
gate, payment/report polish aligned to Phases 4–5 *(recommended)*; (b)
strictly Phase 6; (c) full parallel now.

**Answer: (a) — decide now, build in waves.**

**Implication.** P0 (foundation) and P1 (landing) may start as soon as the
SPEC is approved. P2–P7 wait for the report-quality gate. The live VOICE
violations and the two-hero duplication get fixed on the earliest safe
schedule instead of waiting for Phase 6.

### D2 — Taste direction

**Question.** Which visual direction should the redesign take?

**Options offered.** (a) Calm instrument — old-Apple restraint: white/ink
canvas, Geist discipline, one restrained accent, generous whitespace, motion
bound to real state; references apple.com, vercel.com, gov.uk
*(recommended)*; (b) warm Indonesian craft; (c) editorial evidence-first.
The founder first asked to see dummy concept boards; three boards were
produced (`directions/` in this folder) and reviewed before the decision.

**Answer: (a) — calm instrument**, chosen after reviewing the three concept
boards.

**Implication.** The foundation tokens, the per-screen concepts, and every
phase's visual QA judge against this direction. Warm-craft and editorial are
retired as product-wide directions; the editorial instinct survives only as
the report's document treatment (see D5).

### D3 — Typography

**Question.** Typography pairing under calm instrument, given the Geist
baseline and Indonesian text?

**Options offered.** (a) Geist Sans product-wide with a system serif stack
(Iowan Old Style / Palatino / Georgia) reserved for report display surfaces —
zero new font payload *(recommended)*; (b) Geist everywhere including the
report; (c) add a self-hosted document serif webfont.

**Answer: (a) — Geist + report serif.**

**Implication.** No new font files; the serif appears only on the report
cover, business name, and display result. The currently loaded but unused
Lora webfont becomes a removal question (SPEC OQ-02).

### D4 — Color

**Question.** Color system for the calm-instrument direction, including the
report accent and the 4/10 result presentation?

**Options offered.** (a) Ink + refined purple — keep `#533afd` as the single
action accent; semantic colors rare and muted; the 4/10 result always in ink
*(recommended)*; (b) ink + black (retire purple); (c) a new accent hue.

**Answer: (a) — ink + refined purple.**

**Implication.** The deployed accent survives, tightened to actions and
active states. Performance numerals never carry color semantics; no gauge,
percentage, or rank visualization is permitted anywhere (SPEC R-04).

### D5 — Report artifact feel

**Question.** What should the report (web + PDF) feel like?

**Options offered.** (a) Designed document — calm product chrome around a
document-grade report; A4-native PDF with identical facts *(recommended)*;
(b) formal document (maximum sobriety); (c) rich designed artifact.

**Answer: (a) — designed document.**

**Implication.** The live ReportView's serif instinct is kept and refined;
the fixture's divergent sans-card report is retired into the same language;
the PDF gets real art direction (cover, running structure, page numbers)
instead of a print-stylesheet afterthought.

### D6 — Motion budget

**Question.** Which screens may move, and how much?

**Options offered.** (a) Beat-bound motion — landing entrance stagger +
intake scan-line; edit micro-transitions; one payment status pulse; honest
run-screen state transitions; the report stays still; 150–400ms ease-out;
reduced-motion fallbacks mandatory; perpetual decorative motion removed
*(recommended)*; (b) functional transitions only; (c) richer ambient motion.

**Answer: (a) — beat-bound motion.**

**Implication.** The logo marquee, cursor-glow cards, and drifting hero
gradients are deleted (SPEC R-05, R-12). Motion becomes a reviewed design
element with tokens and fallbacks, not an ambient default.

### D7 — Two-hero consolidation

**Question.** How should SourceHero (glow design, wired) and Spec004Hero
(scan design, unwired) be consolidated?

**Options offered.** (a) Consolidate on Spec004's interaction model —
parser, detection chip, scan transition, reduced-motion handling — restyled
to the chosen direction; retire SourceHero and the dead `hero.module.css`;
stop the spec004 demo route's live API spend *(recommended)*; (b) consolidate
on SourceHero; (c) keep both for now.

**Answer: (a) — consolidate on Spec004.**

**Implication.** Execution lands in P2 with a coordination flag: Spec 004 is
mid-implementation, so P2 starts after it reaches Verified or after an
explicit founder handoff of step-0 wiring (see `EXECUTION_PLAN.md` P2).

### D8 — Landing copy

**Question.** Rewrite the landing to VOICE compliance inside this pass, or
defer copy to a separate approved task?

**Options offered.** (a) Excise now, rewrite separately — this pass removes
the prohibited claims (5x/67%/73%, 49%/90%, "Pertama Ditemukan", agency AEO
framing) and ships minimal VOICE-safe interim copy; a separate approved copy
task writes the final landing copy *(recommended)*; (b) full copy rewrite in
this pass; (c) defer copy entirely.

**Answer: (a) — excise now, rewrite separately.**

**Implication.** The SPEC carries an interim copy table (approved at spec
approval via OQ-04); `docs/content/landing-copy.md` still contains the
prohibited claims and is corrected by the separate copy task, not this pass.

### D9 — Audit-run animation

**Question.** May the audit-run screen animate beyond honest per-question
states?

**Options offered.** (a) State-bound only — row status transitions, a subtle
pulse on the actively-tested row, elapsed time, stage transitions; forbidden:
progress bars beyond the completed count, fake streaming, synthetic fills,
celebration at 10/10 *(recommended)*; (b) fully static run screen; (c)
richer "live" animation.

**Answer: (a) — state-bound only.**

**Implication.** Encoded as SPEC R-30 through R-32 and verified by AC-12:
nothing on the run screen moves without a real state change.

## Open-item resolutions (founder, 2026-08-20)

The seven residual questions from the drafting session were answered by the
founder on 2026-08-20. None remain open.

| ID | Question | Answer | Consequence |
|---|---|---|---|
| OQ-01 | Em dash in `Saya sudah membayar — cek lagi` vs VOICE.md §3 | No em dash. Label settled as **`Saya sudah membayar. Cek lagi.`** | SPEC and concepts updated; `docs/journey/02-payment.md` corrected in the same change; unblocks P3 |
| OQ-02 | Unload the unused Lora webfont? | **Unload it.** | SPEC R-03; P0 scope |
| OQ-03 | Report-ready email visual-language ownership? | **Defer to Phase 4** (email templates). | This pass defines no email visuals |
| OQ-04 | Approve the interim landing copy table? | **Approved as written.** | Unblocks P1; the final-copy task may still replace any row |
| OQ-05 | Dark mode? | **Light only; remove the dormant `.dark` tokens.** | SPEC R-01; P0 scope |
| OQ-06 | Landing intake destination? | **Submits to `/audit`; remove the access gate.** | SPEC R-10 + Implementation notes; P1 scope. Recorded prerequisite: NOW.md lists rate limits/cost controls before external use, so the P1 handoff pairs removal with a minimal guard unless the founder accepts interim exposure |
| OQ-07 | Support page "1–2 hari kerja" promise without an approved SLA? | **Approved as written.** | No longer flagged; support page content stands |

## Next decision this record feeds

The SPEC now has no open questions and is ready for founder approval. On
approval: the SPEC moves to `specs/` (candidate `006-product-wide-polish`),
all sixteen decisions (D1–D9 and OQ-01–OQ-07) fold into
`docs/DECISION_LOG.md`, `docs/NOW.md` is updated so its `Not now` and
`Do now` lists no longer hold this pass's Wave 1 behind checkout and
persistence (D1 supersedes that ordering for P0 and P1), and Wave 1 (P0 +
P1) becomes delegable to workers.
