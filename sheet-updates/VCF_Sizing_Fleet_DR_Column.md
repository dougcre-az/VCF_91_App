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
| **Good — minimum** | P0 foundation locked on only (Edges optional — don't forget Edges or VNAs) |
| **Better — staged (no SRM)** | Good + pre-size DEFER apps that ran on primary + primary networking recommends; manual DR test / failback runbooks |
| **Best — SRM / ACC** | Good + always size Ops / Automation / Blueprint; SRM test plans + reprotect / failback |

**Restore later** rows (Identity, License, Depot, Log Management) stay off in the maturity baseline but are **clickable** — checking them raises the red “current DR payload” ceiling without changing the violet Good/Better/Best target.

**Don't forget:** NSX Edges *or* VNAs for overlay/NAT/VPN/LB before recovering dependent VMs.

Identity, License, Depot, and Log Management are not a second active copy at any maturity.


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
