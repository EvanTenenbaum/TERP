#!/usr/bin/env bash
# ============================================================
# Docker Image Size Guard
# ============================================================
# Prevents Docker image bloat by checking that production-only
# node_modules stay under a safe threshold.
#
# Context: DigitalOcean App Platform has a 4 GiB ephemeral disk
# limit. The Docker image must leave enough headroom for runtime
# artifacts (logs, temp files, caches). This script ensures the
# production dependency footprint doesn't silently grow.
#
# This does NOT build a Docker image — it's a fast, lightweight
# check that installs prod deps in a temp directory and measures.
# ============================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────
# Max allowed size for production node_modules (in MB).
# Current prod deps are ~450 MB. Threshold set at 550 MB to
# allow organic growth without false positives, while catching
# major regressions (e.g., accidentally adding all devDeps).
MAX_PROD_DEPS_MB=550

# ── Setup ──────────────────────────────────────────────────
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "📦 Checking production dependency size..."
echo "   Threshold: ${MAX_PROD_DEPS_MB} MB"
echo ""

# Copy only what pnpm needs to resolve prod deps
cp package.json pnpm-lock.yaml "$TEMP_DIR/"
if [ -d patches ]; then
  cp -r patches "$TEMP_DIR/"
fi

# Install production-only dependencies
cd "$TEMP_DIR"
pnpm install --prod --frozen-lockfile --ignore-scripts 2>/dev/null

# Measure size
ACTUAL_SIZE_KB=$(du -sk node_modules/ | cut -f1)
ACTUAL_SIZE_MB=$((ACTUAL_SIZE_KB / 1024))

echo "   Actual size: ${ACTUAL_SIZE_MB} MB"
echo ""

# ── Verdict ────────────────────────────────────────────────
if [ "$ACTUAL_SIZE_MB" -gt "$MAX_PROD_DEPS_MB" ]; then
  echo "❌ FAIL: Production dependencies (${ACTUAL_SIZE_MB} MB) exceed threshold (${MAX_PROD_DEPS_MB} MB)"
  echo ""
  echo "   This likely means a large package was added to 'dependencies'"
  echo "   that should be in 'devDependencies' instead."
  echo ""
  echo "   To debug, run locally:"
  echo "     pnpm install --prod --frozen-lockfile --ignore-scripts"
  echo "     du -sh node_modules/.pnpm/*/node_modules/* | sort -rh | head -20"
  echo ""
  exit 1
else
  echo "✅ PASS: Production dependencies (${ACTUAL_SIZE_MB} MB) are within threshold (${MAX_PROD_DEPS_MB} MB)"
fi
