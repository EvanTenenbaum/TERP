#!/usr/bin/env bash
# BOOT.sh — Agent orientation helper for TERP
# Usage: ./BOOT.sh [TER-NNNN]
#
# This script is a CONVENIENCE HELPER — not enforcement.
# Enforcement is at the git layer (hooks + CI + branch protection).
# Any agent, any tool: run this first to orient yourself.

set -e
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo '.')" 2>/dev/null || true

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
TASK_ID="${1:-}"

echo -e "${BLUE}🚀 TERP Agent Bootstrap${NC}"
echo ""

# 1. Refresh context (best-effort, silent on failure)
echo -e "${BLUE}🔄 Refreshing project context...${NC}"
pnpm context:refresh 2>/dev/null && echo -e "${GREEN}✓ Context refreshed${NC}" || echo -e "${YELLOW}⚠️  Context refresh failed — using last known state${NC}"

# 2. Branch/state consistency check
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo '')
STATE_BRANCH=$(python3 -c "import json; print(json.load(open('docs/agent-context/state.json'))['git']['branch'])" 2>/dev/null || echo '')
if [ -n "$STATE_BRANCH" ] && [ "$CURRENT_BRANCH" != "$STATE_BRANCH" ] && [ "$STATE_BRANCH" != 'HEAD' ]; then
  echo -e "${YELLOW}⚠️  Branch mismatch: on '${CURRENT_BRANCH}' but state.json recorded '${STATE_BRANCH}'${NC}"
fi

# 3. Show previous handoff state
HANDOFF="docs/agent-handoff/handoff.json"
if [ -f "$HANDOFF" ]; then
  echo ""
  echo -e "${BLUE}📋 Previous session handoff:${NC}"
  python3 - << 'PYEOF'
import json, sys
try:
    d = json.load(open('docs/agent-handoff/handoff.json'))
    print(f"  Task:    {d.get('taskId','?')} | Status: {d.get('status','?')} | Tool: {d.get('agentTool','?')}")
    print(f"  Branch:  {d.get('branch','?')}")
    print(f"  Head:    {d.get('headSha','?')[:12]}")
    done = d.get('whatWasDone', [])
    if done:
        print(f"  Done:    {done[-1][:80]}" + (' (+more)' if len(done) > 1 else ''))
    nxt = d.get('whatIsNext', [])
    if nxt:
        print(f"  Next:    {nxt[0][:80]}")
    dnt = d.get('doNotTouch', [])
    if dnt:
        print(f"  ⚠️  DoNotTouch: {', '.join(dnt[:3])}")
except Exception as e:
    print(f"  (could not read handoff.json: {e})")
PYEOF
fi

# 4. Start or resume task if provided
if [ -n "$TASK_ID" ]; then
  echo ""
  echo -e "${BLUE}🎯 Starting task: ${TASK_ID}${NC}"
  pnpm start-task "$TASK_ID"
else
  echo ""
  echo -e "${GREEN}📌 Ready. Next steps:${NC}"
  echo "   ./BOOT.sh TER-NNNN          — start or resume a specific task"
  echo "   cat docs/agent-context/START_HERE.md  — full project orientation"
  echo "   pnpm roadmap:list           — see open tasks"
  echo ""
  echo -e "${YELLOW}ℹ️  Enforcement note: git hooks block commits without a valid session.${NC}"
  echo -e "${YELLOW}   This script is a helper. Hooks are the real enforcement.${NC}"
fi
