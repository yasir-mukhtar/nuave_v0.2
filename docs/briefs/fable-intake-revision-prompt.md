# Prompt for Fable 5 — Nuave intake revision + design-system alignment

> Send the text below the rule directly to Fable. Attach these three files with it:
> `intake-redesign-spec.md`, `intake-handoff.md`, `intake-prototype.html`.

---

You designed an earlier concept for Nuave's intake experience. The three attached
files are your previous work: the design rationale, the engineering handoff, and
the interactive prototype. Read all three before you begin.

Your task now is to **revise that intake experience and bring its visual design
into alignment with Nuave's actual design system.** The product hypothesis has
since been locked, and several things you designed are now out of scope. This
prompt is the binding brief. Where it disagrees with your earlier artifacts, this
prompt wins.

## What Nuave is, and what the intake is for

Nuave audits whether an Indonesian business appears and is recommended when a
prospective customer asks an AI assistant. A business owner pays Rp99.000 for one
audit. After payment, the intake gathers enough context for Nuave to generate ten
audit questions, run them against a live model, and produce a report.

The audit answers four things: does the brand come up **spontaneously** when the
customer never names it; is it actually **recommended** rather than merely
**mentioned**; is it considered a good **fit** for a specific need when named
directly; and how is it **positioned against competitors**.

The intake exists only to make those ten questions good. It is not a business
profile, a CRM record, or a research dataset.

## The single most important idea

**Nuave does more reasoning so the user does less thinking.**

The intake is a **correction loop, not a questionnaire**:

> Nuave reads the source → Nuave drafts its understanding → the user confirms,
> corrects, removes, or adds → Nuave updates → the user reviews a final readback.

The owner should never be asked to explain their business from scratch. Their job
is to fix what is materially wrong.

## Preserve these from your earlier concept

1. **URL/source-first entry.** One input, one paste, and the experience begins.
2. **Nuave reads the source before asking anything.** The reading moment is where
   trust is established.
3. **Nuave produces a draft understanding first.** Screens arrive pre-filled.
4. **Confirm, correct, remove, add** as the dominant interaction model.
5. **Roughly one mental question per screen**, but only where the separation
   genuinely lowers cognitive load. Do not split a single thought across screens
   to look simpler.
6. **An editable final readback** of Nuave's understanding before question
   generation.
7. **The Bahasa Indonesia copy quality and lightweight feeling** of your existing
   prototype. That tone is the strongest thing about it. Keep it.

## Simplify: remove or reduce these

Delete outright:

- the **audit priority** screen — the user never configures what the audit
  prioritizes;
- the dedicated **conversion action** screen ("what should the customer do next")
  — the whole step is gone, not merely optional;
- every visible badge, label, tag, icon, tooltip, or styling treatment that
  communicates **extracted / inferred / provenance / source timestamp /
  confidence / user supplied**. No "Terdeteksi", no "Perkiraan", no "Saran
  Nuave", no "Ditemukan di website", no source attributions, no confidence
  language of any kind. This metadata still exists in the backend; it must not
  reach the interface.

Reduce:

- **"Hal yang wajib benar"** collapses from five prompt expanders plus a textarea
  to **one lightweight optional section** for the single fact that would distort
  the audit if Nuave misunderstood it;
- **competitor correction** stays simple and user-facing — keep, remove, add by
  name. Entity resolution and disambiguation happen behind the scenes. No search
  results UI, no entity pickers, no direct-versus-alternative tagging;
- anything non-material becomes skippable.

And structurally:

- **do not create a UI field or screen for every engine concept.** The backend
  schema does not define the interface;
- **one interaction may represent several backend concepts** when that lowers
  effort. Say so explicitly in your handoff notes when you do it;
- **combine interactions** wherever combining reduces thinking. For example, "why
  customers look for something like this" can carry both customer situations and
  the things they weigh; those were two screens in your earlier concept and
  should not be.

Since these instructions replace the confidence system you designed, here is the
replacement principle: **if Nuave is confident, it simply states the thing, with
an edit affordance. If Nuave is unsure, it shows a pre-selected, one-tap
removable option.** The removability is the honesty signal. A confidence label
asks the owner to audit Nuave's epistemics, which is not their job.

## What the intake still needs to capture or confirm

Lightly, and not necessarily one screen or field each:

- brand identity and the business scope being audited;
- a sufficiently specific business category — specific enough to appear in a real
  customer's question ("kedai kopi susu di Jakarta" works, "F&B" does not);
- important offerings;
- relevant customer situations, needs, problems, or goals;
- market or location **only when it materially affects recommendation quality**
  — a business with no physical location should not be asked;
- competitors or alternatives when materially relevant;
- one optional fact Nuave must not misunderstand.

You may combine, infer, prefill, or progressively reveal any of these.

## The audit that follows

After intake, Nuave generates **exactly ten questions: 6 unbranded and 4
branded.** The user does not configure this composition, weighting, or priority.
Do not add controls for it.

The **6 unbranded** questions must not contain the brand name or any alias. They
test spontaneous discovery and recommendation: category recommendation; a
customer situation or occasion; fit against a need or decision criterion; an
offering for a specific use case; shortlist creation; comparison among several
possible choices.

The **4 branded** questions may name the brand. They test fit for a need; whether
the model explicitly recommends the brand; comparison with a competitor or
alternative; and where the brand is a good fit, a poor fit, or carries trade-offs.

Two consequences for your design:

- brand **aliases and common misspellings** matter, because unbranded questions
  are screened against them. Derive them; surface them only in the readback as an
  editable line; never ask for them as a question;
- questions about address, opening hours, or how to order are **excluded** from
  the default audit. Do not design intake to feed them.

The intake must end with the user seeing the ten questions and explicitly
choosing to run the audit. Keep that review step.

## Payment boundary

Payment is a **precondition** and is already solved. The revised intake begins
after a successful payment. Do not redesign checkout, pricing, or payment. You
may show payment success as a brief entry state for prototype continuity, and
nothing more.

## Design system — align to this, do not invent a parallel one

Nuave's presentation layer is **Tailwind CSS v4 + shadcn/ui on Base UI**, with
**Tabler Icons** as the only icon library and a **BeUI light** visual baseline:
light canvas, clear ink hierarchy, quiet hairlines, restrained radii and shadows,
one focused action accent. The historical Nuave purple is retired.

Author your prototype with these exact CSS custom-property names and values, so
engineering can map it mechanically:

**Color — near-monochrome zinc.**
```
--bg-page: #ffffff        --bg-surface: #fafafa      --bg-surface-raised: #f4f4f5
--border-light: #ececec   --border-default: #e5e7eb  --border-strong: #d1d5db
--text-heading: #18181b   --text-body: #3f3f46       --text-muted: #52525b
--text-placeholder: #a1a1aa
--action: #18181b         --action-hover: #27272a    --action-foreground: #ffffff
--action-soft: #f4f4f5
```
Green `#16a34a`, red `#dc2626`, amber `#f59e0b` exist for **status only** and
should barely appear in intake. There is no brand hue. The accent is near-black.

**Typography — Geist Sans only.** `font-family: Geist, ui-sans-serif, system-ui`.
Geist Mono exists for technical text and is not needed here. Do not introduce
Inter or any other UI font. A serif is permitted only inside the report, which
you are not designing.

The only permitted sizes are 12 / 14 / 16 / 18 / 20 / 24 / 32 / 48 / 64px. Use
these semantic roles, each of which owns its own family, size, weight, line
height, and tracking — never override one locally:

| Role | Size | Weight | Leading | Tracking |
|---|---|---|---|---|
| `type-heading-lg` | 32px | 600 | 1.15 | -0.03em |
| `type-heading-md` | 24px | 600 | 1.25 | -0.025em |
| `type-heading-sm` | 20px | 600 | 1.3 | -0.02em |
| `type-copy-lg` | 18px | 400 | 1.5 | -0.01em |
| `type-copy` | 16px | 400 | 1.5 | normal |
| `type-copy-sm` | 14px | 400 | 1.5 | normal |
| `type-label` | 14px | 500 | 1.4 | normal |
| `type-label-sm` | 12px | 500 | 1.35 | normal |

Screen questions should sit at `type-heading-md` or `type-heading-sm` on mobile,
not at display sizes. Keep responsive typography scarce: normal copy, labels, and
controls stay stable across breakpoints.

**Spacing:** 4 / 8 / 16 / 24 / 32 / 48 / 64px only.

**Radii:** 3 / 6 / 8 / 12 / 16 / 20 / 24px and full. The approved intake theme
uses a 10px base radius, with 6px small, 8px medium, 10px large, and 14px extra
large derived from it. Buttons sit at 6 to 8px. Nothing in intake should be more
rounded than 16px except a pill control.

**Controls.** Button heights 32 (sm) / 40 (default) / 48 (lg); variants are
`default` (near-black fill), `outline`, `secondary`, `ghost`, `destructive`,
`link`. Minimum touch target 44px on mobile. Focus is a two-layer ring:
`0 0 0 2px var(--bg-page), 0 0 0 4px var(--action)`.

**Surfaces and shadows.** Cards are a white surface, a 1px `--border-default`
hairline, and at most `0 1px 2px rgba(0,0,0,0.05)`. No glassmorphism, no
gradients, no heavy elevation.

**Motion.** Durations `fast` 150ms, `base` 250ms, `slow` 400ms, with one ease-out
curve `cubic-bezier(0.16, 1, 0.3, 1)`. Motion marks a real state transition,
progressive disclosure, or genuine AI work in progress. No perpetual loops, no
cursor glows, no drifting gradients, no animated filler. The reading/extraction
screen is the one place an indeterminate indicator is legitimate, and only while
real work is happening. `prefers-reduced-motion` must remove spatial motion while
preserving all state and information.

**Components you may assume exist** (shadcn/Base UI, already in the repo):
accordion, badge, button, checkbox, field (with `FieldSet`, `FieldGroup`,
`FieldLabel`, `FieldDescription`), input, label, progress, separator, sheet,
textarea. If your design needs a radio group, segmented control, chip/tag, or
select, name the standard shadcn component you are assuming rather than inventing
a new primitive language. Product-specific composition is fine; a parallel design
system is not.

**Accessibility is not optional:** keyboard operation, visible focus, Escape and
focus return where applicable, status announcements for the reading state, and
~44px targets.

**For context, the current shipped intake** is a single dense two-column form of
roughly twenty labelled fields plus an "optional details" accordion, an
extraction-notes accordion, a required confirmation checkbox, and a sticky action
bar, under a four-step progress header labelled `Fakta bisnis · Periksa fakta ·
Periksa pertanyaan · Jalankan audit`. Its component vocabulary and tokens are
correct and you should inherit them. **Its information structure is exactly what
this redesign replaces** — do not let it pull the experience back toward a form.

Avoid gratuitous AI metaphors, decorative "thinking" indicators, sparkle icons,
dashboards, or any UI that does not help the owner finish the intake.

## Copy rules — Bahasa Indonesia

All interface copy is Bahasa Indonesia. Nuave sounds like a careful adviser:
plain, calm, specific, respectful, never alarmist or all-knowing.

- Address the owner as **Anda**. Never `kamu`, `Bapak/Ibu`, or `pengguna`.
- Use **`brand Anda`** in general prose.
- **No em dashes or en dashes in prose.** Use a comma, a period, or
  `sampai`/`hingga`.
- Short sentences. One idea per sentence.
- Active voice, specific verbs: `samakan`, `tambahkan`, `perbarui`, `periksa`.
- No hype, fear, urgency, scarcity, guarantees, rankings, or forecasts.
- No corporate or technical filler, and no internal vocabulary (`schema`,
  `provenance`, `extraction`, `prompt`, `telemetry`) in customer copy.
- Say `pesaing`, not `kompetitor`. Say `pelanggan`, not `klien` or `customer`.
  Say `calon pelanggan` for a prospective customer. Say `model AI` when the model
  is the actor being tested, and `AI` for the general category.

**Settled labels — use these exact strings, do not paraphrase:**

- the two question-composition labels: **Tanpa menyebut bisnis Anda** and
  **Menyebut bisnis Anda**;
- the action that generates the questions: **Buat pertanyaan audit**;
- the question-review step: **Periksa pertanyaan audit**;
- the action that starts the run: **Jalankan audit**.

The ten generated questions themselves are written in a different register: they
must sound like something a real prospective customer would actually type to an
AI assistant, so natural informality is correct there (`ngopi`, `nggak`, `aja`,
`Bandingin`, `WFC`) where the category and audience warrant it. That informality
applies to the question text only, never to Nuave's own interface copy.

## Required states

The prototype must demonstrate all four, and each must be reachable and
inspectable:

**1. Successful extraction.** Nuave has enough evidence to draft a genuinely
useful understanding. The owner mostly confirms, with small corrections. This is
the state that should feel almost effortless.

**2. Thin evidence.** Nuave finds the business but the source is sparse — a
one-page site, a quiet Instagram. Nuave makes reasonable provisional assumptions
where it can and asks only for what materially improves the audit. Thin evidence
must **not** silently degrade into a long blank form. Show what Nuave still
committed to a guess about, and what it genuinely had to ask.

**3. Wrong-brand correction.** Nuave identifies the wrong business. The owner
needs a plain, immediate way to reject it and point Nuave at the right one,
without a recovery flow, a wizard, or a restart that discards everything.

**4. Manual fallback.** Extraction fails or the business has no usable source.
Provide the **minimum viable** manual path that still yields a runnable audit.
This is the state most likely to collapse back into a questionnaire. It must not.
Apply the same principle: Nuave infers from whatever it is given (a name and a
category is a lot) and asks only for what it truly cannot know.

## Deliverables

**1. Revised interaction rationale.** Concise and implementation-oriented. Cover
the revised mental model; why each screen is separated or combined; where Nuave
now infers instead of asking, and what it infers from; how the design lowers
cognitive effort; and how the flow satisfies the product contract above.

**2. Screen-by-screen specification.** For every screen and state: purpose;
information shown; user actions; important copy, written out in final Bahasa
Indonesia; system behavior; transition to the next state; and the data or events
required. **Clearly separate what the user edits from what Nuave derives.**

**3. An updated interactive HTML prototype.** Self-contained, mobile-first, and
usable enough for product and engineering review. Real navigation, real
conditional logic, real editing behavior. It should hold up at desktop width too,
since the product ships responsive.

**4. All four required states inside that prototype**, reachable through an
obvious mechanism so a reviewer can inspect each without editing code.

**5. Engineering handoff notes.** State plainly: which prototype data is mocked;
which interactions require real extraction or model reasoning; what events and
data engineering must supply; what must persist between steps; and every
assumption the prototype makes. Where one interaction normalizes into several
backend concepts, say which. Describe the interface contract only. Do not
prescribe backend architecture.

## Constraints

Do not: add a new questionnaire; add an intake dashboard; add audit-priority
selection; add a conversion-action step; expose provenance or confidence
metadata; force completion of non-critical information; create UI that exists
only to satisfy backend schema shape; add complex competitor-resolution UI;
redesign payment; add decorative AI UI with no functional purpose; change the
6-unbranded / 4-branded model; or blur the distinction between spontaneous
discovery, mention, and recommendation.

Where a small detail is undefined, choose the **simplest reversible V1
hypothesis** and state the assumption. Do not expand the flow to eliminate minor
uncertainty.

## The bar

The result should feel substantially lighter than a business-information form:

> **Nuave shows what it believes. The owner fixes what matters. Nuave then
> creates the audit.**

If a screen cannot justify itself against that sentence, it should not exist.
