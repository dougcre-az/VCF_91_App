# VCF Sizing — Primary Required vs Fleet DR

Two independent columns drive Placement:

| Column | Purpose | Consumed when |
|---|---|---|
| **Primary Required** | Mandatory on the **primary** VCF instance | Full estate |
| **Fleet DR** | Recovery-site guidance in DR-only mode | Placement payload = DR only |

`Required=Yes` on Identity Broker / License / Automation does **not** mean lock them on at DR.

## Good / Better / Best (DR-only radios)

| Maturity | Sizer behavior |
|---|---|
| **Good — minimum** | P0 foundation locked on only |
| **Better — staged (no SRM)** | Good + pre-size DEFER apps that ran on primary (Ops, Automation, Blueprint) + primary networking recommends |
| **Best — SRM / ACC** | Good + always size Ops / Automation / Blueprint for Fleet DR P&R and redeploy+restore |

Identity, License, Depot, and Log Management stay restore-later (locked off) at every maturity.


### Sheet values
| Fleet DR cell | Behavior |
|---|---|
| **Restore** | Locked off |
| **No** | Opt-in (still listed) |
| **Yes / Protect / Redeploy** | Do **not** override Good-minimum heuristics for known components |

## App notes
- Fit validation is always **one site** (never ×2 for Fleet DR pair).
- Red ceiling = primary estate ∪ current DR selections.
- Critical-app Avi/firewalls belong in P0 via Opt-in when the customer needs them.
