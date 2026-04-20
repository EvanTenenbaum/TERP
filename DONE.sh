#!/usr/bin/env bash
# DONE.sh — agent session closeout helper
# Commits, pushes, opens PR, then polls CI for TSC/lint validation.
# Full validation runs on GHA — local TSC removed to prevent Mac Mini saturation.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

BRANCH=$(git branch --show-current)
TASK_ID=$(echo "$BRANCH" | grep -oE 'TER-[0-9]+' | head -1 || echo "unknown")

echo "🔍 Verifying working tree..."

# Quick sanity: confirm branch is not main
if [ "$BRANCH" = "main" ]; then
  echo "❌ On main branch — switch to a task branch first."
  exit 1
fi

# Confirm there's something to push
AHEAD=$(git rev-list origin/main..HEAD --count 2>/dev/null || echo "0")
if [ "$AHEAD" = "0" ]; then
  echo "⚠️  No commits ahead of origin/main — nothing to push."
fi

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
  git add docs/agent-handoff/handoff.json 2>/dev/null || true
  git diff --cached --quiet || git commit -m "chore: mark session COMPLETE [skip ci]" 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📬 Push and open PR..."
echo ""

# Push
git push origin "$BRANCH" 2>&1

# Open PR if not already open
EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number' 2>/dev/null || echo "")
if [ -z "$EXISTING_PR" ]; then
  PR_URL=$(gh pr create --base main --head "$BRANCH" \
    --title "fix: $TASK_ID agent implementation" \
    --body "Closes $TASK_ID

Implemented by autonomous agent. CI (TypeScript check, lint, static analysis, E2E) runs on GHA." \
    2>&1)
  echo "  ✅ PR created: $PR_URL"
  PR_NUM=$(echo "$PR_URL" | grep -oE '[0-9]+$' | head -1)
else
  PR_NUM="$EXISTING_PR"
  echo "  ✅ PR #$PR_NUM already open"
fi

# Poll GHA CI for required checks (tsc, lint, quality-gate)
echo ""
echo "⏳ Waiting for CI checks (GHA validates TSC + lint)..."
REQUIRED_CHECKS="typescript-check quality-gate static-analysis"
MAX_WAIT=1800  # 30 min max
ELAPSED=0
POLL_INTERVAL=30

while [ "$ELAPSED" -lt "$MAX_WAIT" ]; do
  sleep "$POLL_INTERVAL"
  ELAPSED=$((ELAPSED + POLL_INTERVAL))

  # Get check statuses
  CHECK_JSON=$(gh pr checks "$PR_NUM" --json name,state,conclusion 2>/dev/null || echo "[]")

  ALL_PASS=true
  ANY_FAIL=false
  STATUS_LINE=""

  for CHECK in $REQUIRED_CHECKS; do
    CONCLUSION=$(echo "$CHECK_JSON" | python3 -c "
import json,sys
checks = json.load(sys.stdin)
for c in checks:
  if c.get('name','').lower().replace('-','') == '$CHECK'.lower().replace('-',''):
    print(c.get('conclusion') or c.get('state','pending'))
    sys.exit(0)
print('pending')
" 2>/dev/null || echo "pending")

    STATUS_LINE="$STATUS_LINE $CHECK:$CONCLUSION"
    if [ "$CONCLUSION" != "success" ] && [ "$CONCLUSION" != "SUCCESS" ]; then
      ALL_PASS=false
    fi
    if [ "$CONCLUSION" = "failure" ] || [ "$CONCLUSION" = "FAILURE" ]; then
      ANY_FAIL=true
    fi
  done

  echo "  [${ELAPSED}s]$STATUS_LINE"

  if $ALL_PASS; then
    echo ""
    echo "✅ All CI checks passed. PR #$PR_NUM is clean."
    echo "   Merge with: gh pr merge $PR_NUM --squash --admin --delete-branch"
    break
  fi

  if $ANY_FAIL; then
    echo ""
    echo "❌ CI check failed. Review logs:"
    gh pr checks "$PR_NUM" 2>/dev/null | grep -E 'fail|error' || true
    exit 1
  fi
done

if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
  echo "⚠️  CI polling timed out after ${MAX_WAIT}s. Check manually: gh pr checks $PR_NUM"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 Session closed: $TASK_ID on branch $BRANCH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
