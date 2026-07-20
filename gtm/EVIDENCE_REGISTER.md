# Nuave v2 GTM evidence register

> Status: **Live evidence index**
> Updated: 2026-07-19
> Evidence rules: [`../docs/v2/CMO_OPERATING_SYSTEM.md`](../docs/v2/CMO_OPERATING_SYSTEM.md)

This register indexes evidence that may materially affect go-to-market
recommendations. It is not a place to manufacture a complete-looking history.
Sensitive source material should remain in an appropriately restricted location
and be linked by a non-identifying record.

## Evidence register

| ID | Date | Type | Segment/city | Evidence | Source | Limitation | Decision impact |
|---|---|---|---|---|---|---|---|
| GTM-EV-001 | 2026-07-19 | FOUNDER_INPUT | Nuave v2 / all | Nuave v2 is a new product with zero customers | Founder-confirmed repository baseline | Does not establish the number of prospects contacted or any market response | Prohibits customer-derived claims and makes customer rates not applicable or not measured |
| GTM-EV-002 | 2026-07-19 | PRODUCT_CONTRACT | Single-location dental clinics / provisional Jakarta | EXP-001 has a locked identity sample but no provider observations or result | [`../experiments/EXP-001/README.md`](../experiments/EXP-001/README.md) | Preparation is not feasibility evidence; launch city remains open | Continue Gate 0 and do not claim methodology feasibility |
| GTM-EV-003 | 2026-07-19 | HYPOTHESIS | Single-location dental clinics / provisional Jakarta | Competitive discovery is the first working message family | [`../docs/v2/DECISION_LOG.md`](../docs/v2/DECISION_LOG.md) | No buyer-language, conversion, or paid evidence exists | Use consistently for P1 artifacts; do not describe it as validated positioning |

## Evidence coverage

| Evidence category | Current coverage | State |
|---|---|---|
| Founder constraints and direction | Zero-customer baseline and repository-backed CMO authorization recorded | PARTIAL |
| Market observations | None completed for EXP-001 | NONE |
| Prospect evidence | No dated repository records | NONE |
| Customer evidence | No customers | NOT_APPLICABLE |
| Funnel data | No measured funnel cohort | NONE |
| Financial data | Rp0 v2 revenue due to zero customers; no actual unit-cost baseline | PARTIAL |
| Experiment results | None; EXP-001 has a locked sample only | NONE |

## Required fields for future evidence

- stable evidence ID and date;
- evidence type;
- segment, city, and lifecycle stage;
- factual observation separated from interpretation;
- source or link to the underlying record;
- sample size and denominator where applicable;
- limitations and contradictory evidence;
- consent, confidentiality, and publication boundary; and
- decision or experiment affected.
