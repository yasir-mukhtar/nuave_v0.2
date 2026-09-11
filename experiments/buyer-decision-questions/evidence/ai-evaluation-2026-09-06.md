# Nuave question-generation evaluation

Latest six initial packs selected exactly as the supplied page does, plus both confirmation packs: 80 questions. Three older A packs and three schema-rejected B attempts retained in source, not substituted into scoring. No challenger runs.

Reviewer: Codex AI. User-authorized editorial proxy review, not founder ratings, native-speaker validation, or a fully blind experiment. No paid calls or production changes.

## Verdict

Prefer B on all three businesses. Initial B scores: Kopi Sudut 6 Keep / 2 Light / 2 Replace (fail); Kopi Bukit Biru 7 / 2 / 1 (pass); Laundry Segar Kilat 7 / 2 / 1 (pass). Confirmation scores: coffee 6 / 3 / 1 (fail); laundry 3 / 5 / 2 (fail). These are judgment-based gates, not measured population preferences.

Both held-out initial B packs pass the revised coverage contract, not equivalence with the old ten-slot matrix. No Terra run is present, so no model comparison can be concluded.

## What improved

B removes the forced three-part segmentation, mostly replaces internal labels with ordinary questions, and handles the missing office location honestly. Concrete pickup, WiFi, price, and named comparison requests are useful. The initial laundry pack is the clearest transfer beyond coffee examples.

## Remaining causes and smallest next change

1. Generic checklists fill spare unnamed positions: Apa saja yang perlu saya cek/periksa... These may be legitimate questions elsewhere, but add little visibility evidence in these packs. In the next experimental instruction, require unnamed requests to identify or compare actual providers; keep general shopping advice outside this ten-question discovery allocation. This is a coverage change and must be versioned.
2. Audience descriptions leak into speech: untuk keluarga atau pekerja, pekerja remote atau mahasiswa. Transform them into the shared first-person need; do not make the customer recite every segment in the brief.
3. Long bundles of every supplied criterion persist, especially in the fourth named question. Use one decision and only its material criteria; do not impose a rigid word count or universally ban multi-criterion comparisons. Laundry comparisons can reasonably use several criteria.
4. Sparse coffee still produces almost duplicate discovery questions and a local-versus-large-chain decision inferred from taxonomy. Prohibit taxonomy-derived buyer preferences. If ten slots cannot be useful, acknowledge a deliberate wording-variant test or reopen count instead of introducing new intentions.

Keep Luna for the next targeted revision: useful outputs already demonstrate capability; these results do not establish that model capacity is the limiting factor. Use fresh held-out fixtures for any subsequent confirmation because these outputs have now guided diagnosis.

## Repair attribution

All three latest A packs have deterministic slot-9 replacements. Raw Luna comparisons are much cleaner (shown beside their ratings in the HTML). Thus some of B's advantage is removal of bad repair logic, not superior underlying language generation. Other A questions independently show repetition and unnatural segmentation.

## Review-tool findings

1. Confirmed gate bug: compute-gates.mjs returns pass2.items objects such as {status:"issue",note:"..."}; gateBPack compares the object directly with "issue". An offline ten-Keep example with grounding marked issue incorrectly PASSED; the same values normalized to status strings FAILED. Missing statuses have the same risk.
2. Repetition and audit_coverage checklist items are omitted from gateBPack's required checks. Record sanity findings are printed without blocking the verdict. Decide which checks are informational versus blocking, and enforce the documented distinction. Changed old measurements should not automatically invalidate an explicitly revised experimental contract, but must not disappear.
3. Blinding is incomplete: renderFixture always appends A then B and randomizes only their labels. Extras explicitly label confirmation/challenger before metadata reveal. This review is therefore explicitly not blind.
4. The original export hardcodes Founder review. The provided ai-review.json is compatible but explicitly declares AI provenance; importing/re-exporting through the original page may lose that label. Keep this original AI export.

## Run history

The bundle has 14 records: six latest initial, two confirmation, three older successful A runs, and three B requests rejected for invalid JSON schema. The latter are infrastructure failures, not language-quality failures. Selection follows the supplied page's latest-run rule rather than cherry-picking. No challenger is bundled. Instruction hashes and settings match between successful B initial and confirmation records.

## Files

- index.html: completed readable evaluation, all 80 exact questions and individual notes.
- ai-review.json: original review export schema with explicit AI provenance.
- independent-summary.json: independently calculated gates and run IDs.

Original source page, data and browser-local founder marks were not changed.
