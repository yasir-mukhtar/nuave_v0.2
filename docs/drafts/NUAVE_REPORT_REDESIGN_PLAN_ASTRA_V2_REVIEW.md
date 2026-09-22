# Adversarial review — Astra report redesign plan v2

> Reviewed: `docs/drafts/NUAVE_REPORT_REDESIGN_IMPLEMENTATION_PLAN_ASTRA.md` at `12fdcb9`
> Baseline checked: `main` at `4e6b2cf`
> Reviewer role: tech lead, acting as independent product-design, architecture, and evidence-integrity reviewer
> Date: 2026-09-22

## Verdict

**Ready after narrow fixes.**

The v2 plan applies all four founder decisions faithfully. Every existing-code
claim I rechecked holds at the baseline. It has one source-confirmed defect,
one product decision that is bundled into the plan and must be separated, and
several design choices that will cost PR A more than they should. Nothing
requires a redesign.

The four settled decisions (answers open by default, Markdown rendering,
one-to-ten cap without padding, PR A now / PR B after Spec 011) are not
reopened here.

## Findings, ordered by severity

### F1 — Blocking defect: summary labels break the settled voice contract

- **Plan sections:** 6.1, 6.5, AC05.
- **Evidence:** `docs/VOICE.md` lists **Bisnis Anda muncul di X dari 10
  pertanyaan** as a verbatim settled label and forbids "any paraphrase or
  spelling variant". The plan mandates `Brand Anda disebut di X dari 10
  jawaban`, changing the verb, the noun, and the denominator word. The same
  file settles **Download PDF**; the toolbar currently says
  `Cetak / simpan PDF` and §6.8 tells implementers to keep it.
- **Origin:** the wording came from Sol §8.2 A through the founder iteration
  prompt (§4 item 2). The error is the prompt's as much as the plan's.
- **Likely failure:** the numbered spec ships copy that contradicts the voice
  contract; the language tests or a later review force a rewrite.
- **Smallest fix:** use the settled label for the appearance count. The
  recommendation count has no settled label yet; block 0 must settle one and
  the numbered spec must amend `VOICE.md`. Flag the PDF button wording as a
  pre-existing code-versus-voice discrepancy for block 0 instead of endorsing
  the current code.
- **Blocks implementation:** yes, until the labels are settled.

### F2 — Blocking product decision, currently bundled: evidence reader during recovery

- **Plan sections:** 6.7 (last three paragraphs), block 3, AC06, fixture
  "Repair removes all findings or all actions".
- **Evidence:** Spec 010 "Failure and recovery" table: an observation/report
  failure shows only the existing interrupted or failed states. The plan
  proposes showing all ten retained answers "labeled as retained answers while
  report interpretation is unfinished; it is not a delivered partial audit."
- **Likely failure:** ten complete model answers shown to a customer without
  a report is a partial delivery in substance, whatever the label. Building it
  inside PR B commits the product to a Spec 010 amendment nobody approved.
- **Smallest fix:** list it as a separate blocking decision with two options:
  keep Spec 010 behavior (no answers visible until a report exists), or amend
  Spec 010. Keep the `LocalAuditStage` recovery integration out of PR B until
  decided.
- **Blocks implementation:** PR B only.

### F3 — High: PDF order differs from screen order, which forces the duplicate render tree

- **Plan sections:** 6.1 (screen order), 6.8 (PDF order), E13.
- **Evidence:** screen order is Hasil singkat → Jawaban model AI → Analisis
  Nuave → Yang dapat dilakukan → Tentang audit ini. The PDF puts the answers
  last as `Lampiran`. `ReportView.tsx` today keeps a second aria-hidden print
  tree (`detailsPrint`) only because the screen tree hides collapsed content.
- **Likely failure:** with all answers open by default, the screen tree could
  print as is. The appendix reorder is the only reason to keep a duplicate
  tree, now holding ten Markdown-rendered answers twice, with namespaced
  anchors and copy buttons to hide from print and assistive technology.
- **Smallest fix:** print mirrors screen order and PR A uses print CSS only.
  If the founder wants the appendix, record it in block 0 as an explicit
  choice with this cost stated.
- **Blocks implementation:** no, but it materially changes PR A's size.

### F4 — Medium: "Analisis Nuave" carries three different things

- **Plan sections:** 6.1, 6.2 item 4, E06.
- **Evidence:** the label names the summary conclusion, the findings section,
  and the per-question deterministic copy that E06 already says mostly
  restates the status.
- **Likely failure:** ten questions each followed by an "Analisis Nuave"
  block saying the brand was not mentioned reads as filler under a label meant
  to signal judgment. §6.2 says to omit duplicated copy without inventing
  replacements, so most direct-ten questions render an empty slot.
- **Smallest fix:** PR A renders per-question analysis only when the
  interpretation note adds information beyond the result label. Write that
  test into the adapter so it is deterministic.
- **Blocks implementation:** no.

### F5 — Medium: the answer link policy is not implementable as written

- **Plan section:** 6.3, AC07, fixture "Retained HTTP(S) source plus
  unretained URLs".
- **Evidence:** retained sources are separate objects on the observation
  (`sourceSchema`). Answer bodies from search-backed providers rarely contain
  those same URLs verbatim.
- **Likely failure:** the rule yields almost no live links and a custom link
  renderer whose behavior the owner cannot predict (some links clickable, some
  not, no visual difference).
- **Smallest fix:** all URLs inside answer text are inert text. The sources
  list under each answer is the only clickable surface.
- **Blocks implementation:** no.

### F6 — Medium: PR B carries five unrelated concerns

- **Plan sections:** 7.3, 7.4, block 3.
- **Evidence:** PR B now includes widening bounds across four provider
  adapters, the synthesis instruction rewrite, the header/date integration,
  the code-owned non-corrective template path, and the recovery change. The
  last two depend on the decisions in F2 and block 0.
- **Smallest fix:** split into **B1** (bounds, instructions, header
  integration) and **B2** (non-corrective path, recovery), so a stalled
  decision does not block the widening.
- **Blocks implementation:** no.

### F7 — Low: the quiet completion line is a constant

- **Plan sections:** 6.1, 6.5, AC05.
- **Evidence:** the report route and Spec 009 refuse delivery below ten
  completed observations, so `10 dari 10 pertanyaan berhasil diuji` is true
  on every delivered report.
- **Smallest fix:** replace it with the method statement the plan already
  wants: all ten questions were asked without naming the business.

### F8 — Low: pin the direct-ten recommendation denominator in adapter tests

- **Evidence:** E09 is correct; `contracts.ts` includes every
  recommendation-class record for direct-ten. But the AC-17 comment on the
  `measures` type says "assessed" means the brand appeared *and* was judged,
  which contradicts direct-ten behavior. A future cleanup of that comment
  could silently change the summary denominator.
- **Smallest fix:** an adapter test asserting the direct-ten recommendation
  denominator equals ten.

## Verified and not defects

- Method routing on `report.provenance.question_method` is sound; the local
  audit stage always sends `direct-ten`, so the synthetic browser journey
  exercises the new renderer.
- Existing e2e selectors in `tests/e2e/new-intake-glm.spec.ts` do not touch
  report internals; removing the accordion will not break them.
- Section anchor IDs (`summary`, `findings`, `priorities`, `detail`,
  `method`) survive the reorder.
- E08 correction, `nuave-evidence-v4` correction, E16 bounds (5 → 10 across
  `key_findings`, `priorities`, and `order`), and E17 are accurate.
- Spec 011's working-tree changes to `ReportView.tsx` are confined to the
  header/identity block; PR A's boundary is achievable.

## Blocking decisions for the founder

Separate from the four settled decisions and from ordinary implementation
choices:

1. **Labels.** The exact settled wording for the recommendation count, and
   whether the PDF button reverts to **Download PDF**.
2. **Recovery.** Whether retained answers may be shown when no report exists,
   which amends Spec 010.
3. **Print order.** Whether the PDF mirrors the screen order or keeps the
   answers as an appendix.

## Requested changes before specification

Apply F1, F2, F3, F5, F6 in a v3 of the plan; F4, F7, F8 may be applied in v3
or carried into the numbered spec. Record the three decisions above in
block 0 with the founder's answers.
