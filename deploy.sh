#!/usr/bin/env bash
# Build the HtmlService bundle and push Code.gs + Index.html with clasp.
set -euo pipefail
cd "$(dirname "$0")"

EXAMPLE=".clasp.json.example"
PLACEHOLDER="PASTE_SCRIPT_ID_HERE"

ensure_clasp_config() {
  if [[ -n "${SCRIPT_ID:-}" ]]; then
    printf '{\n  "scriptId": "%s",\n  "rootDir": "dist/gas"\n}\n' "$SCRIPT_ID" > .clasp.json
    return
  fi
  if [[ ! -f .clasp.json ]]; then
    echo "error: .clasp.json is missing." >&2
    echo "  1. npx clasp login   (or npm run clasp:login)" >&2
    echo "  2. Apps Script → Project Settings → copy Script ID" >&2
    echo "  3. cp $EXAMPLE .clasp.json && edit scriptId  (or export SCRIPT_ID=...)" >&2
    exit 1
  fi
  local script_id
  script_id="$(node -e 'const c=require("./.clasp.json"); process.stdout.write(String(c.scriptId||""))')"
  if [[ -z "$script_id" || "$script_id" == "$PLACEHOLDER" ]]; then
    echo "error: set scriptId in .clasp.json (Apps Script → Project Settings → Script ID)." >&2
    exit 1
  fi
}

stage_gas_bundle() {
  npm run build

  local html=""
  if [[ -f dist/Index.html ]]; then
    html=dist/Index.html
  elif [[ -f dist/index.html ]]; then
    html=dist/index.html
  else
    echo "error: dist/Index.html was not produced" >&2
    exit 1
  fi

  rm -rf dist/gas
  mkdir -p dist/gas
  # Copy into a fresh dir so the GAS file name is Index.html even on APFS.
  cp "$html" dist/gas/Index.html
  cp -f Code_fixed.gs dist/gas/Code.gs
  cp -f appsscript.json dist/gas/appsscript.json
}

ensure_clasp_config
stage_gas_bundle

CLASP=(npx --no-install clasp)
if [[ ! -x node_modules/.bin/clasp ]]; then
  echo "error: @google/clasp is not installed. Run npm install." >&2
  exit 1
fi

bytes="$(wc -c < dist/gas/Index.html | tr -d ' ')"
echo "Pushing dist/gas (Index.html ${bytes} bytes + Code.gs) via clasp..."
"${CLASP[@]}" push --force

echo "Pushed to Apps Script (HtmlService.createHtmlOutputFromFile('Index'))."
echo "Web-app /exec URL is unchanged until you create a new deployment if needed."
