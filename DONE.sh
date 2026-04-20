#!/usr/bin/env bash
# DONE.sh — agent session closeout helper
# Runs fast verification (tsc + lint), updates handoff, prints PR command.
# Full test suite runs in CI — not locally.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "🔍 Running fast verification (tsc + lint)..."

# TypeScript check
echo "  → pnpm tsc --noEmit"
if ! pnpm tsc --noEmit 2>&1; then
  echo ""
  echo "❌ TypeScript errors found. Fix before closing session."
  echo "   Session NOT marked complete. handoff.json NOT updated."
  exit 1
fi
echo "  ✅ TSC clean"

# Lint
echo "  → pnpm lint"
if ! pnpm lint 2>&1; then
  echo ""
  echo "❌ Lint errors found. Fix before closing session."
  exit 1
fi
echo "  ✅ Lint clean"

echo ""
echo "✅ Fast checks passed."

# Get current branch and task ID
BRANCH=$(git branch --show-current)
TASK_ID=$(echo "$BRANCH" | grep -oE 'TER-[0-9]+' | head -1 || echo "unknown")

# Update handoff.json to COMPLETE
if [ -f "docs/agent-handoff/handoff.json" ]; then
  python3 -c "
import json, sys
from datetime import datetime, timezone
try:
  with open('docs/agent-handoff/handoff.json') as f:
    d = json.load(f)
  d['status'] = 'COMPLETE'
  d['lastActivityAt'] = datetime.now(timezone.utc).isoformat()
  with open('docs/agent-handoff/handoff.json.tmp', 'w') as f:
    json.dump(d, f, indent=2)
  import os; os.rename('docs/agent-handoff/handoff.json.tmp', 'docs/agent-handoff/handoff.json')
  print('  ✅ handoff.json → COMPLETE')
except Exception as e:
  print(f'  ⚠️  Could not update handoff.json: {e}')
" 2>/dev/null || true
fi

# Print PR command
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📬 Open PR with:"
echo ""
echo "  gh pr create --base main --head $BRANCH \\"
echo "    --title "fix: <description> - $TASK_ID" \\"
echo "    --body "Closes $TASK_ID""
echo ""
echo "Or squash-merge when ready:"
echo "  gh pr merge <PR_NUMBER> --squash --delete-branch --yes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
