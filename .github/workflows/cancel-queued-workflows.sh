#!/bin/bash
# Script to cancel queued GitHub Actions workflows
# Usage: Run this in GitHub Actions or locally with gh CLI

echo "🔍 Finding queued workflow runs..."

# Cancel all queued runs for specific workflows
WORKFLOWS=(
  "Sync pnpm-lock.yaml"
  "Update Lockfile on Package.json Changes"
  "Deploy Watchdog"
)

for workflow in "${WORKFLOWS[@]}"; do
  echo ""
  echo "Checking: $workflow"
  
  # Get queued runs
  RUNS=$(gh run list --workflow="$workflow" --status=queued --json databaseId --jq '.[].databaseId' 2>/dev/null)
  
  if [ -z "$RUNS" ]; then
    echo "  ✅ No queued runs"
  else
    echo "  📋 Found queued runs: $RUNS"
    for run_id in $RUNS; do
      echo "  🛑 Canceling run $run_id..."
      gh run cancel $run_id 2>/dev/null && echo "    ✅ Canceled" || echo "    ⚠️  Failed to cancel"
    done
  fi
done

echo ""
echo "✅ Done! Check https://github.com/EvanTenenbaum/TERP/actions for status"

