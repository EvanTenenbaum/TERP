#!/usr/bin/env bash
# ============================================================================
# resolve-affected-tests.sh
#
# Determines which E2E test specs to run based on the files changed in a PR.
# Uses the domain-test-map.json configuration to map source paths to tests.
#
# Usage:
#   ./scripts/ci/resolve-affected-tests.sh <changed-files-list>
#
# Output (to stdout):
#   - "SKIP"              → No E2E tests needed (docs/config-only changes)
#   - "SMOKE"             → Shared infrastructure changed, run smoke subset
#   - Space-separated list of spec file paths to run
#
# Exit codes:
#   0 = success
#   1 = error (missing input, bad config)
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAP_FILE="${SCRIPT_DIR}/domain-test-map.json"
CHANGED_FILES_INPUT="${1:-}"

if [ -z "$CHANGED_FILES_INPUT" ]; then
  echo "Usage: $0 <file-with-changed-paths | - for stdin>" >&2
  exit 1
fi

if [ ! -f "$MAP_FILE" ]; then
  echo "ERROR: domain-test-map.json not found at $MAP_FILE" >&2
  exit 1
fi

# Read changed files (from file or stdin)
if [ "$CHANGED_FILES_INPUT" = "-" ]; then
  CHANGED_FILES=$(cat)
else
  CHANGED_FILES=$(cat "$CHANGED_FILES_INPUT")
fi

# If no files changed, skip
if [ -z "$CHANGED_FILES" ]; then
  echo "SKIP"
  exit 0
fi

# ---- Step 1: Check if ALL changes are skip-eligible ----
# Uses node for reliable JSON parsing and glob matching
RESULT=$(node -e "
const fs = require('fs');
const path = require('path');

const map = JSON.parse(fs.readFileSync('$MAP_FILE', 'utf8'));
const changedFiles = \`$CHANGED_FILES\`.trim().split('\n').filter(Boolean);

// Simple glob matcher (supports *, **, and ?)
function globMatch(pattern, filepath) {
  // Convert glob to regex
  let regex = pattern
    .replace(/\./g, '\\\\.')
    .replace(/\*\*/g, '__DOUBLESTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLESTAR__/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp('^' + regex + '\$').test(filepath);
}

function matchesAnyPattern(file, patterns) {
  return patterns.some(p => globMatch(p, file));
}

// Step 1: Check if ALL files match skip patterns
const skipPatterns = map.skip_e2e_patterns.patterns;
const allSkippable = changedFiles.every(f => matchesAnyPattern(f, skipPatterns));
if (allSkippable) {
  console.log('SKIP');
  process.exit(0);
}

// Step 2: Check if any file matches shared infrastructure
const sharedPatterns = map.shared_infrastructure.patterns;
const touchesShared = changedFiles.some(f => matchesAnyPattern(f, sharedPatterns));

// Step 3: Collect domain-specific tests
const affectedSpecs = new Set();

// If shared infra is touched, add the smoke subset
if (touchesShared) {
  for (const spec of map.shared_infrastructure.e2e_specs) {
    affectedSpecs.add(spec);
  }
}

// Match each changed file against domain patterns
for (const file of changedFiles) {
  for (const [domainName, domain] of Object.entries(map.domains)) {
    if (matchesAnyPattern(file, domain.source_patterns)) {
      for (const spec of domain.e2e_specs) {
        affectedSpecs.add(spec);
      }
    }
  }
}

// If we found specific specs, output them
if (affectedSpecs.size > 0) {
  console.log([...affectedSpecs].join(' '));
} else if (touchesShared) {
  // Shared infra touched but no specific specs mapped — run smoke
  console.log('SMOKE');
} else {
  // Changed files don't match any domain — skip E2E
  // (e.g., a new router with no E2E coverage yet)
  console.log('SKIP');
}
")

echo "$RESULT"
