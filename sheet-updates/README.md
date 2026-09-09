# Google Sheet updates for Design Package handoff

Import these into the spreadsheet referenced by Apps Script property `VCF_DATA_SPREADSHEET_ID`.

## 1. Design Decisions — Options / Defaults

File: `Design_Decisions_Options_Patch.csv` (also `.xlsx`)

Align Options with what the app actually exports:

- `archMode`: include **BROWNFIELD** (and keep IMPORT/CONVERT/UPGRADE)
- `hldRecoveryObjectives`: `UNRESOLVED | MISSION_CRITICAL | BUSINESS_CRITICAL | STANDARD_OBJ | CUSTOM`
- `hldNicProfile`: `2 | 4`
- `hldStorageProto`: `VSAN_ESA | VSAN_OSA | EXTERNAL`
- `hldStorageTopology`: `HCI | DISAGGREGATED | EXTERNAL`
- `fleetWldMapping`, `hldEdgeStrategy`, placement/AI profiles: match app enums in the patch file

## 2. Design IDs — append rows

File: `Design_IDs_Add.csv`

| ID | Trigger |
|---|---|
| `VCF-NET-REQD-CFG-011` | `hldNicProfile=2` |
| `VCF-VSAN-REQD-CFG-016` | `hldStorageProto=VSAN_OSA` |

Without these, 2-NIC and OSA selections stay on baseline IDs only (export still works; coverage shows a temporary “until sheet loaded” hint).

## 3. VCF Sizing — optional `fleet_dr` column

See `VCF_Sizing_Fleet_DR_Column.md`. Placement Engine **DR only** mode uses this to decide which catalog rows to size at the recovery site (overrides name heuristics).

## After import

1. Reload the web app (or re-run `getVcgCoreData`).
2. Export Design Package — dictionary rebuilds from the live sheet.
3. Confirm `01_Meta.crosswalkChecksum` changes and NIC/OSA Design IDs appear when those options are selected.
