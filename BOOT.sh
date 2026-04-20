#!/usr/bin/env bash
# BOOT.sh — agent startup helper
# Thin wrapper: refreshes context and prepares session
# Enforcement lives at git hooks + CI, not here.

set -e

TASK_ID="${1:-}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "🔄 Refreshing agent context..."
cd "$REPO_ROOT"

# Refresh context (best-effort — never blocks)
if command -v pnpm &>/dev/null; then
  pnpm context:refresh 2>/dev/null && echo "✅ Context refreshed" || echo "⚠️  context:refresh failed (continuing)"
fi

# Show handoff state if it exists
if [ -f "docs/agent-handoff/handoff.json" ]; then
  echo ""
  echo "📋 Last handoff:"
  python3 -c "
import json, sys
try:
  d = json.load(open('docs/agent-handoff/handoff.json'))
  print(f'  Branch: {d.get("branch", "unknown")}')
  print(f'  Status: {d.get("status", "unknown")}')
  done = d.get('whatWasDone', [])
  next_ = d.get('whatIsNext', [])
  if done: print(f'  Done: {done[0]}')
  if next_: print(f'  Next: {next_[0]}')
except: pass
" 2>/dev/null || true
fi

echo ""
echo "📂 START_HERE.md:"
head -20 docs/agent-context/START_HERE.md 2>/dev/null || echo "  (not found — run pnpm context:refresh)"

# If task ID provided, start session
if [ -n "$TASK_ID" ]; then
  echo ""
  echo "🚀 Starting task session for $TASK_ID..."
  bash scripts/start-task.sh "$TASK_ID"
fi

echo ""
echo "⚠️  Enforcement is at git hooks + CI — not in this script."
echo "   Forbidden patterns, session validation, and TSC are enforced at commit/push/PR time."
