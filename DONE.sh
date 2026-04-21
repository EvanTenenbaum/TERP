#!/usr/bin/env bash
# DONE.sh — Agent session close helper for TERP
# Usage: ./DONE.sh
#
# Runs fast verification (tsc + lint), updates handoff.json,
# posts Linear completion comment, and shows PR creation command.
# Full test suite runs in CI on PR open.

set -e
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo '.')" 2>/dev/null || true

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo '')
TASK_ID=$(echo "$CURRENT_BRANCH" | grep -oE 'TER-[0-9]+' | head -1 || true)

echo -e "${BLUE}🏁 TERP Session Close${NC}"
echo "   Branch: ${CURRENT_BRANCH}"
[ -n "$TASK_ID" ] && echo "   Task:   ${TASK_ID}"
echo ""

# Run fast verification
echo -e "${BLUE}⚡ Running fast verification (tsc + lint)...${NC}"
if ! bash scripts/complete-task-fast.sh "${TASK_ID:-}"; then
  echo ""
  echo -e "${RED}❌ Fast verification failed. Fix errors before closing session.${NC}"
  exit 1
fi

# Push changes
echo ""
echo -e "${BLUE}📤 Pushing branch...${NC}"
git push origin "$CURRENT_BRANCH" 2>/dev/null || echo -e "${YELLOW}⚠️  Push failed or nothing to push${NC}"

# Show PR creation command
echo ""
echo -e "${GREEN}✅ Session closed.${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
if [ -n "$TASK_ID" ]; then
  LINEAR_URL="https://linear.app/terpcorp/issue/${TASK_ID}/"
  echo "   Linear:  ${LINEAR_URL}"
fi
echo "   Create PR:"
echo "     gh pr create --title 'fix(scope): ${TASK_ID:-} description' --body 'Closes ${TASK_ID:-}'"
echo ""
echo -e "${YELLOW}ℹ️  Full test suite (pnpm test + pnpm build) runs in CI when you open the PR.${NC}"
