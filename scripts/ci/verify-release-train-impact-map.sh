#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVER="${SCRIPT_DIR}/resolve-affected-tests.sh"

if [[ ! -x "${RESOLVER}" ]]; then
  echo "ERROR: resolver script not executable: ${RESOLVER}" >&2
  exit 1
fi

CASES=(
  "client/src/components/orders/LineItemTable.tsx|NON_SKIP"
  "client/src/components/work-surface/OrdersWorkSurface.tsx|NON_SKIP"
  "client/src/components/work-surface/PickPackWorkSurface.tsx|NON_SKIP"
  "client/src/components/work-surface/InventoryWorkSurface.tsx|NON_SKIP"
  "client/src/pages/ConsolidatedWorkspaces.test.tsx|NON_SKIP"
  "server/routers/orders.ts|NON_SKIP"
  "server/routers/inventory.ts|NON_SKIP"
  "docs/roadmaps/notes.md|SKIP"
)

failures=0

for case_entry in "${CASES[@]}"; do
  file_path="${case_entry%%|*}"
  expected="${case_entry##*|}"

  result="$(printf '%s\n' "${file_path}" | "${RESOLVER}" -)"
  echo "${file_path} => ${result}"

  if [[ "${expected}" == "SKIP" ]]; then
    if [[ "${result}" != "SKIP" ]]; then
      echo "  FAIL: expected SKIP" >&2
      failures=$((failures + 1))
    fi
  else
    if [[ "${result}" == "SKIP" ]]; then
      echo "  FAIL: expected NON_SKIP but resolver returned SKIP" >&2
      failures=$((failures + 1))
    fi
  fi
done

if [[ ${failures} -gt 0 ]]; then
  echo "Impact map verification failed: ${failures} case(s)" >&2
  exit 1
fi

echo "Impact map verification passed (${#CASES[@]} cases)."
