# VCF Sizing — Primary Required vs Fleet DR

Two independent columns drive Placement:

| Column | Purpose | Consumed when |
|---|---|---|
| **Required** (or rename to **Primary Required**) | Mandatory on the **primary** VCF instance | Full estate / normal placement |
| **Fleet DR** | What to **size at the recovery site** in DR-only mode | Placement payload scope = DR only |

They must not be conflated. `Required=Yes` on Identity Broker does **not** mean size it at DR — Fleet DR should be `Restore`.

## Fleet DR values

| Value | Checkbox in DR only |
|---|---|
| **Yes** | On — size at recovery |
| **Protect** | On — Ops / Ops for Networks (P&R) |
| **Redeploy** | On — Automation (new deploy + restore) |
| **Restore** | Off — restore onto recovery VCFMS; do not pre-deploy |
| **No** | Off — not Fleet DR minimum |

## Recommended Fleet DR map

See `VCF_Sizing_Fleet_DR_Map.csv` / `VCF_Sizing_Fleet_DR_Filled.csv`.

### Must size at recovery (foundation + P&R + redeploy)
vCenter (mgmt), NSX Managers (mgmt), NSX Edges (mgmt), VNA (mgmt), SDDC Manager, License Server, Cloud Proxy, MS runtime control/worker, Protection Blueprint Requirements, VCF Operations (`Protect`), Ops for Networks + collector (`Protect`), VCF Automation (`Redeploy`).

### Restore only (do not pre-deploy)
Identity Broker, Offline Software Depot, Log Management (, Salt / Fleet LCM if present).

### No (not DR mgmt-app minimum)
Avi, SSP (mgmt + WLD), WLD vCenter / NSX, Real-time Metrics, Licensing Hub.

## App behavior notes
- DR-only **ignores** Primary Required when deciding the locked minimum — only Fleet DR / heuristics for **DR min**.
- **DR min (locked on):** Ops, Automation, SDDC Manager, mgmt vCenter, mgmt NSX Managers, MS runtime.
- **From primary / Recommend:** Edges, VNA, License, Cloud Proxy, Protection Blueprint, Ops for Networks — included if they were on primary; otherwise amber **Recommend** to click (or Enable all recommended).
- **Restore later:** Identity Broker, Depot, Log Management — dimmed, not sized.
- Red callout = Primary Required ∪ pre–DR selections ∪ DR-min sized rows (one site) — always ≥ blue DR-minimum target.
- **Fleet DR pair never multiplies fit validation ×2.** Primary and recovery are sized as separate single-site payloads.
- Sheet Location typo `Serices` is normalized to `Services`; SSP mgmt and WLD are separate optional groups.
