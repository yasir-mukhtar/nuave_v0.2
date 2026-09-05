# Nuave intake experience handoff

Status: **Founder-approved, 5 September 2026**  
Companion prototype: `nuave-intake-design-workbench.html`
Approved prototype SHA-256: `b7adc54fd2d83def25552e25961dd50eba7e63883a217861811e2f394f830a1c`

## Orchestrator directive

Implement the post-payment intake as one clean, coherent journey. Use the companion HTML as the approved customer-visible reference. Do not blend it with legacy intake screens, legacy components that change its interaction model, or parallel per-screen variants.

The HTML workbench governs composition, hierarchy, copy meaning, control patterns, and represented states. The journey contract governs routing, Back behavior, errors, Review-edit returns, dependency invalidation, and downstream boundaries. Gate 0 and the rebuild plan govern technical architecture and data representation.

Do not copy the workbench navigation, hash routing, fixture values, status messages, or simplified demo state handling into production.

## Authority order

1. Latest founder decisions in this handoff.
2. The rendered product screens in `nuave-intake-design-workbench.html`.
3. `docs/drafts/NUAVE_NEW_INTAKE_JOURNEY_CONTRACT.md` for journey wiring.
4. The approved Gate 0 Experience/Data/Fixture package.
5. `docs/drafts/NUAVE_AIRBNB_INTAKE_CLEAN_REBUILD_PLAN.md` for implementation sequencing.

If two sources conflict, apply this order. Do not silently compromise between them; surface any conflict that changes customer experience.

## Post-contract founder amendments

These decisions supersede stale clauses in the journey contract:

- `s-service` is **multi-select**. Store one or more exact channels: at the business location, at the customer location, delivered, and online. Require at least one. Remove the vague `mixed` mode.
- Remove aliases/supporting sources from `s-review`. Do not build the “Nama lain dan sumber” row or `s-review:identifiers-edit`. Derive aliases from the primary source unless future evidence justifies explicit customer confirmation.
- Every `s-review` row is one full-width editable control with a right chevron. Do not use visible `Ubah` links.

## Locked routes

- Whole brand: `s-crawl → s-brand → s-scope → s-category → s-offerings → s-customers → s-service → s-market → s-competitors → s-facts → s-review`
- One location: `… → s-scope → s-branch → s-category → s-offerings → s-customers → s-service → s-market → s-competitors → s-facts → s-review`
- One product/service: `… → s-scope → s-product → s-category → skip s-offerings → s-customers → s-service → s-market → s-competitors → s-facts → s-review`
- Wrong brand: `s-brand → s-brand-fix → s-crawl → s-brand`

Back returns through stable screens actually visited. Processing states never enter Back history. A saved Review edit returns to Review after required dependent reconfirmation; Cancel or Back returns to unchanged Review. It must not resume the remaining linear journey.

## Screen contract

| State | Approved screen/grammar | Leave condition |
|---|---|---|
| `s-crawl` | “Kami sedang mengenali bisnis Anda”; honest three-step reading progress | Successful preparation auto-advances; failure behavior comes from the journey contract |
| `s-brand` | Editorial brand card: large logo, brand name, source, reliable short description, small `Ubah`; footer `Lanjut` implicitly confirms | Successfully prepared identity exists |
| `s-brand-fix` | “Perbaiki brand”; edit name and primary source; `Batal` / `Periksa lagi` | Valid values are reprocessed and reconfirmed |
| `s-scope` | Icon-led single-select cards: whole brand, one location, one product/service | Exactly one explicit choice |
| `s-branch` | Text-led single-select detected locations with distinguishing address; manual-add fallback | Exactly one location |
| `s-product` | Text-led single-select detected products/services; manual-add fallback; vertically center titles when descriptions are absent | Exactly one product/service |
| `s-category` | Prepared customer-language categories; text-led single-select; add fallback | Exactly one category |
| `s-offerings` | Prepared text chips to prune/add | At least one; inactive for product scope |
| `s-customers` | Optional prepared text chips to prune/add; explain that selections make audit questions reflect real customer needs/situations | Empty or any valid selection |
| `s-service` | Fixed icon-led cards with checkboxes; select every applicable service channel | At least one channel |
| `s-market` | Fixed icon-led single-select cards; border indicates selection; area chips appear only for area-based reach | One reach; required area selection where applicable |
| `s-competitors` | Prepared competitor names only, with checkboxes; add fallback; mutually exclusive “Tidak ada pesaing langsung yang saya tahu” | At least one named competitor or explicit no-direct-competitor mode |
| `s-facts` | “Apa yang tidak boleh Nuave salah pahami?”; one optional public fact; no private/payment/secret data | Empty or one safe valid fact |
| `s-review` | “Konfirmasi informasi brand Anda”; uncontained, generously spaced summary rows; medium row titles; whole row clickable with chevron | Every active required answer is valid; CTA `Buat pertanyaan audit` |

## Repeatable experience rules

- One primary mental question per stable screen. Do not add chapter eyebrows above the main heading.
- The journey should feel like **confirm, pick, prune, or correct**, not form filling. Typing is limited to correction, manual-add fallbacks, and the optional fact.
- `Lanjut` validates and commits the visible answer. Never add a redundant Yes/No confirmation before it.
- AI-prepared values are not confirmed merely because they are displayed or preselected.
- Use a persistent footer with low-emphasis `Kembali` and one dark primary action.
- The four-segment progress bar represents chapters, not screen count. `s-crawl` has no progress bar.
- Fixed conceptual single-select groups use an icon and selected border. Fixed conceptual multi-select groups use an icon and checkbox.
- Dynamic or AI-generated options remain text-led. Do not invent unreliable icons for categories, offerings, customer reasons, locations, products, or competitors.
- Exact icon glyphs and wording polish may change later; icon placement, control grammar, hierarchy, and meaning are locked.
- Cards are reserved for bounded choices and the editorial brand focal point. Review rows remain uncontained.
- Do not show provenance, confidence, internal modes, or implementation terminology.
- Competitors display names only. Internal category-alternative behavior must not add explanatory copy back to each competitor.
- Review shows only active answers the customer encountered and could change. Omit inactive scope branches and the removed identifiers concept.

## Data and dependency wiring

- Use one canonical committed intake draft across screens, Review, question generation, and audit start.
- Condition prepared suggestions on the committed scope and exact target; never relabel whole-brand fixtures as target-specific answers.
- Clear inactive branch data rather than merely hiding it.
- Preserve customer-created answers only when still semantically valid after a parent change; otherwise require reconfirmation according to the journey contract.
- The Review projection and the frozen question-generation payload must match exactly.
- The HTML contains illustrative fixtures only. Production must use real prepared candidates and customer state.

## Acceptance gate

Before implementation is accepted:

1. Compare every rendered screen and important selected/empty/manual-add state against the HTML at mobile width and desktop.
2. Walk all three scope routes, the wrong-brand loop, empty prepared locations/products, no-direct-competitor mode, and both market area branches.
3. Verify Back skips unvisited branches and never enters processing states.
4. Verify every Review row opens its owner, Save returns to updated Review, and Cancel returns to unchanged Review.
5. Verify Review contains no “Nama lain dan sumber” row and service supports one-or-more exact channels.
6. Reject technically valid work that changes the approved interaction grammar or reintroduces legacy UI. Any material deviation requires founder review.

Question Review, `Mulai audit`, payment, preparation internals, generation internals, audit execution, reporting, persistence, and deployment remain owned by their existing contracts and plans.
