#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -lt 1 ]]; then
  cat <<'USAGE'
Final release-train gate wrapper

Usage:
  scripts/qa/release-train/final-gate.sh <staging-url>

Runs checkpoint gate with all core runtime domains and a `final` checkpoint label.
USAGE
  exit 1
fi

STAGING_URL="$1"

"${SCRIPT_DIR}/checkpoint-gate.sh" \
  --checkpoint final \
  --domains orders,clients,inventory,accounting \
  --staging-url "${STAGING_URL}" \
  --output-root docs/roadmaps/checkpoint-bundles
