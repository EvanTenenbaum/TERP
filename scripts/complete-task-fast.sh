#!/bin/bash
# TERP Task Fast Completion v1.0
# Runs tsc + lint only (~2 min). Used by git hooks and DONE.sh.
# Full test suite runs in CI — do not add it here.
# Usage: bash scripts/complete-task-fast.sh [task-id]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

error_exit() {
  echo -e "${RED}❌ ERROR: $1${NC}"
  exit 1
}

if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
  error_exit "Must be run from TERP repo root."
fi

TASK_ID="${1:-}"
if [ -z "$TASK_ID" ]; then
  CURRENT_BRANCH=$(git branch --show-current)
  TASK_ID=$(echo "$CURRENT_BRANCH" | grep -oP 'TER-[0-9]+' | head -1 || true)
fi

echo -e "${BLUE}⚡ Running fast verification (tsc + lint)...${NC}"

# TypeScript check (hard fail)
echo -e "${BLUE}  Checking TypeScript...${NC}"
if ! pnpm check 2>/dev/null; then
  error_exit "TypeScript errors found. Fix before completing task."
fi
echo -e "${GREEN}  ✓ TypeScript OK${NC}"

# Lint check (warn on error, don't fail)
echo -e "${BLUE}  Checking ESLint...${NC}"
if ! pnpm lint 2>/dev/null; then
  echo -e "${YELLOW}  ⚠️  Lint warnings detected (CI will run full check)${NC}"
else
  echo -e "${GREEN}  ✓ Lint OK${NC}"
fi

echo -e "${GREEN}✅ Fast verification passed.${NC}"
echo -e "${YELLOW}ℹ️  Full test suite (pnpm test + pnpm build) runs in CI on PR open.${NC}"

# Write fast-completion marker for session tracking
CURRENT_BRANCH=$(git branch --show-current)
if [ -n "$TASK_ID" ]; then
  FAST_COMPLETE_FILE="docs/agent-handoff/.fast-complete-${TASK_ID}"
  echo "{\"taskId\":\"${TASK_ID}\",\"branch\":\"${CURRENT_BRANCH}\",\"completedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"fast\"}" > "$FAST_COMPLETE_FILE"
fi

exit 0
