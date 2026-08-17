#!/usr/bin/env python3
"""Trim en.json/id.json to ONLY the keys the Nuave landing page uses.

Keeps the exact key set referenced by the pulled landing components:
page.tsx, LandingNav, Footer, HowItWorks, VisibilityScoreChart,
RecommendationsPreview, PromptResultPreview, ActionItemPanel, severity-badge.
"""
import json
import sys

# Whitelist of top-level -> subkeys used by the landing (verified by grep).
LANDING_KEYS = {
    "common": ["source"],
    "cta": ["auditBrandFree", "auditBrandFreeNoExclaim", "viewAll"],
    "dashboard": ["findings", "noProblemsDetected"],
    "faqs": [f"{p}{i}" for i in range(1, 11) for p in ("q", "a")],
    "footer": ["terms", "privacy", "contact", "followUs", "tagline", "copyright"],
    "howItWorks": (
        ["heading"]
        + [f"step{n}{s}" for n in (1, 2, 3) for s in ("Label", "Title", "Desc")]
        + [f"step{n}Check{c}" for n in (1, 2, 3) for c in (1, 2, 3)]
    ),
    "landing": (
        ["heroHeading", "heroSubtitle", "marqueeText", "problemHeading"]
        + [f"problemCard{n}{s}" for n in (1, 2) for s in ("Number", "Desc")]
        + [f"problemCard{n}Chip{c}" for n in (1, 2) for c in (1, 2, 3)]
        + ["statsHeading", "statsSubtitle"]
        + [f"stat{n}{s}" for n in (1, 2, 3) for s in ("Number", "Title", "Body")]
        + ["ctaHeading", "faqHeading", "heroStep1", "heroStep2", "heroStep3"]
    ),
    "nav": ["pricing", "contact"],
    "severity": ["critical", "important", "normal"],
}


def trim(path: str) -> None:
    with open(path, encoding="utf-8") as f:
        full = json.load(f)

    missing_top = [k for k in LANDING_KEYS if k not in full]
    if missing_top:
        print(f"WARN {path}: missing top-level keys: {missing_top}")

    trimmed = {}
    for top, subkeys in LANDING_KEYS.items():
        src = full.get(top, {})
        missing = [k for k in subkeys if k not in src]
        if missing:
            print(f"WARN {path}: missing {top} keys: {missing}")
        trimmed[top] = {k: src[k] for k in subkeys if k in src}

    with open(path, "w", encoding="utf-8") as f:
        json.dump(trimmed, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"OK   {path}: {len(trimmed)} top-level, "
          f"{sum(len(v) for v in trimmed.values())} keys total")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        trim(p)
