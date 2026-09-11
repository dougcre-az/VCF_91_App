# VCF Sizing — Primary Required vs Fleet DR

Two independent columns drive Placement:

| Column | Purpose | Consumed when |
|---|---|---|
| **Primary Required** | Mandatory on the **primary** VCF instance | Full estate |
| **Fleet DR** | Recovery-site guidance in DR-only mode | Placement payload = DR only |

`Required=Yes` on Identity Broker / License / Automation does **not** mean lock them on at DR.

## Good-minimum model (sizer)

Aligned to recovery priority P0→P5 and the Good/Better/Best clipboard:

| Badge | Checkbox | Components |
|---|---|---|
| **DR min** | Locked **on** | Mgmt vCenter, SDDC Manager, NSX Managers, NSX Edges, MS runtime control/worker, Cloud Proxy (, Protection & Recovery OVA if present) |
| **Restore later** | Locked **off** | Identity Broker, License Server, Log Management, Software Depot (, Salt / Fleet LCM) |
| **Restore later** | **Off**, unlocked | VCF Automation, VCF Operations, Protection Blueprint — check only to pre-size Better/Best |
| **Recommend / From primary** | Conditional | Ops for Networks + collector, Virtual Network Appliances |
| **Opt-in** | Off, unlocked | Avi, SSP, WLD vCenter/NSX, etc. |

### Why Automation is not locked on
Broadcom Fleet DR recovers Automation by deploying/staging on the recovery site and restoring from backup (P4). Good minimum: *not required for initial workload recovery*. Same for Ops (P3) — native vCenter/NSX monitoring covers the gap until restored or failed over via P&R.

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
