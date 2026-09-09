# VCF Sizing sheet — `fleet_dr` column (optional)

Add a column on the **VCF Sizing** tab named one of:

`fleet_dr` · `Fleet DR` · `dr_minimum` · `DR Minimum`

The Placement Engine **DR only** mode reads this first; blank cells fall back to Broadcom Fleet DR heuristics in the app.

Fill the **same value on every Size/Availability row** for a component (Small/Medium/Large/Simple) so nothing is ambiguous.

## Allowed values

| Value | Meaning | Checkbox in DR only |
|---|---|---|
| **Yes** | Size this appliance at the recovery site | On (locked) |
| **Protect** | Protection & Recovery target (Ops / Ops for Networks) | On (locked) |
| **Redeploy** | New deploy on recovery + restore (Automation) | On (locked) |
| **Restore** | Restore onto recovery VCFMS — do **not** pre-deploy | Off (locked) |
| **No** | Not part of Fleet DR minimum | Off (manual OK) |
| *(blank)* | Use app heuristic | — |

## Recommended map (matches `VCF_Sizing_Fleet_DR_Map.csv`)

### Restore (do not pre-deploy)
| Component | Fleet DR |
|---|---|
| Identity Broker | Restore |
| Offline Software Depot | Restore |
| Log Management | Restore |

### Size at recovery — Protect / Redeploy
| Component | Fleet DR |
|---|---|
| VCF Operations | Protect |
| VCF Operations for networks | Protect |
| VCF Operations for networks collector | Protect |
| VCF Automation | Redeploy |

### Size at recovery — foundation (Yes)
| Component | Fleet DR |
|---|---|
| SDDC Manager | Yes |
| License Server | Yes |
| Cloud Proxy | Yes |
| VCF services runtime control nodes | Yes |
| VCF services runtime worker nodes | Yes |
| Management Domain vCenter | Yes |
| Management Domain NSX Managers (Local / Global) | Yes |
| Management Domain NSX Edges | Yes |
| Management Domain Virtual Network Appliances | Yes |
| Protection Blueprint Requirements | Yes |

### Not Fleet DR mgmt-app minimum (No)
| Component | Fleet DR |
|---|---|
| Management / Workload Domain AVI | No |
| Management / Workload Domain SSP | No |
| vDefend and AVI Licensing Hub | No |
| Workload Domain vCenter | No |
| Workload Domain NSX Managers | No |
| Real-time Metrics | No |

### Automation note

Automation is **not** restore-only. Broadcom: deploy a **new** Automation instance on the recovery site, then restore from backup. Use `Redeploy`.

### Helper files
- `VCF_Sizing_Fleet_DR_Map.csv` — one row per component
- `VCF_Sizing_Fleet_DR_Filled.csv` — full sizing sheet with column J filled
