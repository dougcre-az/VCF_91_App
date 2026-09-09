# VCF Sizing sheet — `fleet_dr` column (optional)

Add a column on the **VCF Sizing** tab named one of:

`fleet_dr` · `Fleet DR` · `dr_minimum` · `DR Minimum`

The Placement Engine **DR only** mode reads this first; blank cells fall back to Broadcom Fleet DR heuristics in the app.

## Allowed values

| Value | Meaning | Checkbox in DR only |
|---|---|---|
| **Yes** | Size this appliance at the recovery site | On (locked) |
| **Protect** | Protection & Recovery target (Ops / Ops for Networks) | On (locked) |
| **Redeploy** | New deploy on recovery + restore (Automation) | On (locked) |
| **Restore** | Restore onto recovery VCFMS — do **not** pre-deploy | Off (locked) |
| **No** | Not part of Fleet DR minimum | Off (manual OK) |
| *(blank)* | Use app heuristic | — |

## Recommended starter map (Broadcom Fleet DR blueprint)

| Component (match sheet name) | `fleet_dr` |
|---|---|
| VCF Operations | Protect |
| VCF Operations for networks | Protect |
| VCF Operations for networks collector | Protect |
| VCF Automation | Redeploy |
| VCF services runtime control nodes | Yes |
| VCF services runtime worker nodes | Yes |
| SDDC Manager | Yes |
| License Server | Yes |
| Cloud Proxy | Yes |
| Identity Broker | Restore |
| Offline Software Depot / Software Depot | Restore |
| Log Management | Restore |
| Salt / Salt RaaS | Restore |
| Fleet Lifecycle | Restore |
| Avi / SSP / HCX / WLD / Real-time Metrics | No |

### Automation note

Automation is **not** restore-only. Broadcom: deploy a **new** Automation instance on the recovery site, then restore from backup. It must be sized at DR (`Redeploy` / `Yes`), unlike Identity Broker / Depot.
