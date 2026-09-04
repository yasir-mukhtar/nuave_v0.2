# New intake module (isolated, Phase 1 + Phase 4 shell)

Location decision: `src/lib/intake/` was chosen over a route-colocated module
because the journey shell (`IntakeJourney`) and canonical screen order
(`screens.ts`) are router-independent logic. `lib/` keeps them importable by
the guard test and any future entry without coupling to the App Router; the
only route surface is the single thin preview page at
`src/app/audit/new-intake/page.tsx`. Both candidate paths were confirmed
absent before creation.

## Files

- `screens.ts` — canonical `INTAKE_SCREEN_ORDER` (14 `s-*` screens in
  `intake-prototype.html` document order) + `IntakeScreenId` type.
- `navigation.ts` — journey graph (`resolveJourneyPath` + next/prev),
  4-chapter fractional progress model, kicker/Continue-label lookups, funnel
  hook (`useIntakeFunnel`), and the pinned screen-slot contract types.
- `progress.tsx` — four-segment chapter progress (fill only, no numerals).
- `IntakeJourney.tsx` — isolated new shell: frame, graph walk, Back/Continue
  bar, focus + scroll restoration, transition slots, funnel emission.
  Never falls through to legacy UI.
- `IntakeFixturePlaceholder.tsx` — purpose-built placeholder rendered inside
  the new shell for unfinished screens. Never the old form.
- `navigation.test.ts` — unit contract for the graph + progress model.
- `intake-isolation.guard.test.ts` — deterministic architectural guard.
- `fixtures.ts` — fixture data/shapes (sibling worker owns this file).

## Isolation rule (enforced by the guard test)

Nothing under `src/lib/intake/` or the preview page may reference:

- legacy intake renderers: `AuditWorkflow`, `AuditStages`, `SourceHero`,
  `AuditPrePaymentJourney`, `B1BriefStep`, `LandingAuditHero`;
- legacy intake styles: `audit.module.css`, `tweakcn-intake.css`;
- the recovery-branch per-screen surface flag mechanism: `intakeSurface`,
  `IntakeSurface`, `PRODUCTION_INTAKE_SURFACE`, `PREVIEW_INTAKE_SURFACE`,
  `intake-preview`, `intakeSurface.ts`;
- legacy journey routes/components via import path (`app/audit/v2`,
  `components/`).

The only allowed experience switch selects the whole journey (plan §4.8) —
never renderers per screen.

## Screen-slot contract (pinned for wave-2 content workers)

Screen content renders only through this contract. Until a screen is
implemented, the shell renders `IntakeFixturePlaceholder` for its id.

```tsx
import type {
  IntakeScreenSlot,
  IntakeScreenSlotProps,
} from "@/lib/intake/navigation";

const MyScreen: IntakeScreenSlot = ({ screenId, fixture, nav, emit }) => {
  // screenId: IntakeScreenId — the screen being rendered.
  // fixture:  unknown (opaque) — shell currently passes stub graph data
  //           ({ entry, scope, brandNeedsFix, marketSkipped }); the fixture
  //           worker pins the real shape without changing this contract.
  // nav:      { onContinue, onBack, canContinue, canGoBack, continueLabel }
  //           — call onContinue/onBack from screen controls; bind blocking
  //           screens to canContinue; label the primary action continueLabel.
  // emit:     funnel emitter — (validation_failed | answer_corrected |
  //           resumed) with allowlist payload only (ids/counters, never text).
  return null;
};
```

Rules for implementers:

- Drive `nav.canContinue` on blocking screens (`s-brand`, `s-brand-fix`,
  `s-scope`, `s-branch`, `s-product`, `s-category`); non-blocking screens
  never block.
- Report corrections via `emit({ event: "intake_answer_corrected", ... })`
  with counts only — never what changed.
- Copy strings come ONLY from the contract deck (`§6`); no new wording.
- Never import legacy intake presentation (guard test fails the module).

The shell injects content via the `ScreenSlot` prop on `IntakeJourney`
(default: the fixture placeholder). There are no per-screen flags.

## Shell frame (ledger §2)

One coherent frame across the whole journey: `nuave` wordmark, chapter
progress (every screen after `s-crawl`), kicker, then content, then the
sticky bottom bar with ghost `Kembali` (left) and the primary action
(right). Touch targets are 44px+. `s-crawl` is bare (own chrome,
auto-advances, no bar); the terminal `done` state shows `Audit dimulai`
with no bar. Single 560px centered column; tokens via CSS variables.

## Journey graph (ledger §1)

`resolveJourneyPath({ entry, scope, brandNeedsFix, marketSkipped })`:

- read entry: `s-crawl → s-brand → s-scope …`; manual entry starts at
  `s-scope` (Back hidden at journey start in both cases).
- `brandNeedsFix`: one `s-brand-fix → s-crawl → s-brand` loop after `s-brand`.
- scope XOR: `cabang` adds `s-branch`, `produk` adds `s-product`, `brand`
  adds neither — at most one entity screen.
- `marketSkipped` drops `s-market` (Back from `s-competitors` then lands on
  `s-customers`).
- Tail is always `… → s-facts → s-review → s-questions`.
- Back restores position by walking the same resolved path; `s-crawl`
  auto-advances after its wait.

Transition slots: s-review Continue emits `intake_continued` +
`intake_completed` and calls `onReviewConfirm` (default: advance to
`s-questions`); s-questions Continue calls `onQuestionsConfirm` (default:
terminal `done` state). Every transition scrolls to top and moves focus to
the shell frame.

## Progress model (ledger §1, deck §6.1)

Four chapters (0: crawl/brand/fix · 1: scope→customers · 2: market/
competitors · 3: facts/review/questions). `chapterFills(path, current)`
returns one fractional fill per chapter: past chapters 1, future chapters 0,
current chapter (position + 1) / visible-in-chapter. No interstitials, no
numerals, no step counts. Empty chapters (e.g. chapter 0 on manual entry)
read complete once passed.

## Funnel (fixtures §2)

`useIntakeFunnel(sink?)` stamps one random single-tab `sessionId` per mount
plus ISO timestamps and forwards the 7 allowlist-only events
(`intake_started`, `intake_screen_viewed`, `intake_continued`,
`intake_validation_failed`, `intake_answer_corrected`, `intake_resumed`,
`intake_completed`). The default sink is a silent no-op — the shell makes no
network calls. Never emit answer text, field values, source content, brand
names, or contact/payment data.

## Preview stub drivers (no live data)

`/audit/new-intake` (behind `NUAVE_NEW_INTAKE_PREVIEW_ENABLED=true`):

- `?entry=manual` — manual path, enters at `s-scope`.
- `?scope=cabang` / `?scope=produk` — the XOR entity branch.
- `?brand=fix` — wrong-identity loop once.
- `?market=skip` — geography-immaterial path.
