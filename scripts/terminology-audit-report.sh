#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUDIT_MODE="changed"
STRICT=false
FILES_CSV=""
OUTPUT_DIR="$REPO_ROOT/docs/audits"
SKIP_CENSUS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --audit-mode)
      AUDIT_MODE="${2:-changed}"
      shift 2
      ;;
    --strict)
      STRICT=true
      shift
      ;;
    --files)
      FILES_CSV="${2:-}"
      AUDIT_MODE="files"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-$OUTPUT_DIR}"
      shift 2
      ;;
    --skip-census)
      SKIP_CENSUS=true
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: bash scripts/terminology-audit-report.sh [--audit-mode changed|staged|all|files] [--files a.ts,b.ts] [--strict] [--output-dir DIR]" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$OUTPUT_DIR"
CENSUS_JSON="$OUTPUT_DIR/terminology-census.json"
AUDIT_JSON="$OUTPUT_DIR/terminology-audit.json"
AUDIT_MD="$OUTPUT_DIR/terminology-audit.md"
AUDIT_RAW="$OUTPUT_DIR/terminology-audit.txt"

# Census JSON artifact
if [[ "$SKIP_CENSUS" == "true" ]]; then
  echo '{"skipped":true}' > "$CENSUS_JSON"
else
  bash "$REPO_ROOT/scripts/terminology-census.sh" --json > "$CENSUS_JSON"
fi

DRIFT_ARGS=()
case "$AUDIT_MODE" in
  changed) DRIFT_ARGS+=(--changed) ;;
  staged) DRIFT_ARGS+=(--staged) ;;
  all) ;;
  files)
    if [[ -z "$FILES_CSV" ]]; then
      echo "--files is required when --audit-mode files" >&2
      exit 1
    fi
    DRIFT_ARGS+=(--files "$FILES_CSV")
    ;;
  *)
    echo "Invalid audit mode: $AUDIT_MODE" >&2
    exit 1
    ;;
esac

if [[ "$STRICT" == "true" ]]; then
  DRIFT_ARGS+=(--strict)
fi

set +e
bash "$REPO_ROOT/scripts/terminology-drift-audit.sh" "${DRIFT_ARGS[@]}" > "$AUDIT_RAW" 2>&1
AUDIT_EXIT=$?
set -e

node - "$AUDIT_RAW" "$AUDIT_JSON" "$AUDIT_MD" "$AUDIT_MODE" "$STRICT" "$AUDIT_EXIT" <<'NODE'
const fs = require("fs");
const rawPath = process.argv[2];
const jsonPath = process.argv[3];
const mdPath = process.argv[4];
const mode = process.argv[5];
const strict = process.argv[6] === "true";
const exitCode = Number(process.argv[7]);

const raw = fs.readFileSync(rawPath, "utf8");
const lines = raw.split(/\r?\n/);

const violations = [];
for (const line of lines) {
  const m = line.match(/^\s*\[(error|warning)\]\s+(.+?)\s\|\s(\d+):(.*?)\s\|\suse '(.+?)' instead of '(.+?)'\s*$/);
  if (!m) continue;
  violations.push({
    severity: m[1],
    file: m[2],
    line: Number(m[3]),
    excerpt: m[4].trim(),
    canonical: m[5],
    deprecated: m[6]
  });
}

const severityCounts = {
  error: violations.filter(v => v.severity === "error").length,
  warning: violations.filter(v => v.severity === "warning").length
};

const status = exitCode === 0
  ? (severityCounts.warning > 0 ? "WARN" : "PASS")
  : "FAIL";

const payload = {
  generatedAt: new Date().toISOString(),
  mode,
  strict,
  status,
  exitCode,
  severityCounts,
  violationCount: violations.length,
  violations
};

fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2) + "\n");

let md = "# Terminology Audit Report\n\n";
md += `- Status: **${status}**\n`;
md += `- Mode: \`${mode}\`\n`;
md += `- Strict: \`${strict}\`\n`;
md += `- Exit Code: \`${exitCode}\`\n`;
md += `- Errors: \`${severityCounts.error}\`\n`;
md += `- Warnings: \`${severityCounts.warning}\`\n`;
md += "\n";

if (violations.length === 0) {
  md += "No terminology drift violations detected.\n";
} else {
  md += "## Violations\n\n";
  for (const v of violations) {
    md += `- [${v.severity}] ${v.file}:${v.line} — use \`${v.canonical}\` instead of \`${v.deprecated}\`\n`;
  }
}

fs.writeFileSync(mdPath, md);
NODE

echo "Wrote: $CENSUS_JSON"
echo "Wrote: $AUDIT_JSON"
echo "Wrote: $AUDIT_MD"
exit "$AUDIT_EXIT"
