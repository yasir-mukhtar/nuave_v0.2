# Repair the existing intake screens

Status: **Approved bounded repair, 12 September 2026**. The founder rejected
the current S2 presentation, identified the approved references, and approved
correcting the implementation plan and the existing screens before expansion.

## Authority

The September 5 [experience handoff](../../docs/drafts/NUAVE_INTAKE_EXPERIENCE_HANDOFF.md)
and [workbench](../../docs/drafts/nuave-intake-design-workbench.html) govern the
customer-visible result. Both are restored verbatim from commit `955ae90` on
`origin/feat/airbnb-intake-rebuild`. The workbench SHA-256 is
`b7adc54fd2d83def25552e25961dd50eba7e63883a217861811e2f394f830a1c`.

These later founder decisions supersede the recovery plan's smaller frame,
chapter eyebrow, separate review Ubah links, and editable aliases. Geist,
canonical typography roles, shadcn/Base UI, and Tabler remain the stack.
The workbench's 28/30px heading and 650 weight map to the existing 32px/600
heading role. Choice titles map to the 20px heading role, and body copy to
the 16px and 18px copy roles; no new font, typography scale, or icon library
is introduced. The review-only workbench surround is not product chrome.

## Deliverable

Repair Scope, Branch, Offerings, and Review, and carry the shared frame into
the existing Question Review. Use the approved headings, quiet wordmark,
top chapter progress, larger controls, generous spacing, and persistent footer.
Keep the production surface constant empty.

- Scope uses the approved three icon-led cards. Prepared brand type remains
  in the existing engine brief without the old separate readback on Scope.
  Its required-input fallback remains available if that value is empty or
  invalid, so current engine validation cannot strand the customer.
- Branch uses text-led selection with the indicator on the right and a
  secondary manual-add disclosure. Only supplied values are available;
  this slice does not invent detected locations or addresses.
- Offerings keeps prepared choices visible when deselected, so they can be
  selected again. Adding another choice opens a secondary disclosure.
- Review combines brand and its primary source, has full-width editable rows
  with chevrons, shows the active scope target, and removes the alias editor.
  Existing customer context, needs, and criteria remain visible together;
  values and engine field writes stay separate. No unavailable service-channel
  value is invented. Existing USP/fact values remain readable together.
- Editing from Review returns to Review after validation and any required
  reconfirmation. Back cancels the edit. Scope changes must still complete
  their required branch/product target. This is an envelope around the
  existing workflow functions, not a replacement state machine.
- Question Review retains its existing save validator and fixed question
  groups. It adopts the repaired frame; this work does not redesign questions.
- `?demo=1` becomes an explicitly fictional, isolated five-screen review
  harness using the real presentation components, including sample questions.
  It makes no API requests and does not read/write the real workflow session.
  The route without `demo=1` continues to exercise the real controller.

## Limits of this repair

The complete September 5 journey is not delivered by these five screens.
Service channels, the optional combined customer-reasons model, multiple
comparators, product-specific preparation and offerings omission, complete
source-correction routing, and the canonical intake-to-engine projection
require a reconciled data/routing package before the remaining screens.
Do not implement the old S3–S5 handoff or silently force those concepts into
the existing BusinessBrief. Do not alter `src/lib/audit/`, API routes,
providers, extraction, payment, report execution, or production entry points.

## Verification

Extend the existing preview E2E suites to pin the approved frame, full-row
editing, absence of aliases/eyebrows, visible and reachable controls,
deselect/reselect/add behavior, Review save/cancel and dependent validation,
and all five offline demo screens. Preserve question-save regression coverage.
Run the workflow authority and navigation tests unchanged, then `npm run verify`.
Compare the repaired screens with the workbench at phone and desktop widths.
Record measured results separately from founder visual acceptance. Do not mark
the whole intake or the founder gate passed on the basis of automated tests.
