# Report v2 prototype (Spec 021)

A clickable, standalone mock of the reworked report, built to judge the layout
and the depth of writing before any product code changes. It is not served by
the app.

- `index.html`: open it in a browser (phone or laptop). Built file; do not edit.
- `template.html`: the page.
- `build.py`: fills the template with the real answers saved in
  `../dataforseo-sozo/results/answers/SUMMARY.md` (run 2026-10-24).
  Run `python3 experiments/report-v2-poc/build.py` from the repository root.

Limits: in that test each question went to one source only (1–5 ChatGPT,
6–10 Google), so the other tab says "not asked". The mention judgements, the
findings, the competitor reasons and the recommendations were written by hand
from those answers, as an example of what Spec 021 Part B should produce.
