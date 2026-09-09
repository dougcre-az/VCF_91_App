# Exports for Config Push / Configurator Import

**Producer:** VCF_91_App (`goldcode_aug11_r2.html`)  
**Package schema:** `vcf-design-package/v1`  
**Dictionary schema:** `vcf-design-package-dictionary/v1`

## What Export Design Package downloads

1. `VCF_Design_Package.xlsx` — human workbook (sheets `00`–`11`)
2. `VCF_Design_Package.json` — machine sibling (same object graph)
3. `VCF_Design_Package_dictionary_v1.json` — enum / Design ID / shape crosswalk (checksum in `01_Meta.crosswalkChecksum`)

## Version notes (2026-09-09)

- Added live dictionary download + `crosswalkChecksum` / `integrity.payload_sha256` / `integrity.dictionary_sha256`
- Structured recovery objectives `{ rpoMinutes, rtoMinutes, retentionDays, preset }`
- NIC profile (`2` | `4`) and storage topology/protocol in meta + config stub
- Fleet disposition telemetry + Instance/Domain IDs for blueprint fan-out
- RVTools heuristic `discoveredInventory` (infra + high-value first wave)
- Customer ID field for stable re-export identity
- Per-domain `Target Object ID` override rows when `decisionTargetOverrides` is populated

## Google Sheet updates required (import these)

Import into the configured Apps Script data spreadsheet:

| File | Tab | Action |
|---|---|---|
| `sheet-updates/Design_Decisions_Options_Patch.csv` | Design Decisions | Align **Options** / **Default** with producer enums (`BROWNFIELD`, recovery presets, edge strategies, etc.) |
| `sheet-updates/Design_IDs_Add.csv` | Design IDs | Append `VCF-NET-REQD-CFG-011` (`hldNicProfile=2`) and `VCF-VSAN-REQD-CFG-016` (`hldStorageProto=VSAN_OSA`) |

Also mirrored in repo catalog snapshot: `02_Design_IDs.csv`.

## Key meta fields for importer

| Key | Meaning |
|---|---|
| `customerId` | Stable customer key |
| `nicProfile` | `2` or `4` |
| `storageTopology` | `HCI` \| `DISAGGREGATED` \| `EXTERNAL` |
| `storageProtocol` | `VSAN_ESA` \| `VSAN_OSA` \| `EXTERNAL` |
| `recoveryObjectivesStructured` | JSON object or empty |
| `crosswalkChecksum` | SHA-256 of dictionary JSON |
| `selectionFingerprint` | SHA-256 of canonical selections |
| `strictness` | `lenient` (producer default) |

## Integrity

```json
"integrity": {
  "selection_fingerprint": "<sha256>",
  "payload_sha256": "<sha256 of payload minus integrity>",
  "dictionary_sha256": "<same as crosswalkChecksum>"
}
```

## Samples

See `vcf-design-package/samples/`:

- `sample-minimal-greenfield.json`
- `sample-brownfield-mixed.json`

## Repo dictionary (checked in)

`vcf-design-package/dictionary/v1.json` (+ `v1.sha256`) is the offline reference. Runtime export rebuilds the dictionary from the live Design Decisions / Design IDs sheets so it stays aligned with the customer’s Google Sheet after patches.