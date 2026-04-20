#!/bin/bash
# TERP Force Close Session v1.0
# Recover from a crashed agent leaving a session in [~] state.
# Usage: bash scripts/force-close-session.sh <TASK_ID> "<reason>"
# Example: bash scripts/force-close-session.sh TER-1073 "agent crashed mid-execution"

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TASK_ID="${1:-}"
REASON="${2:-}"

if [ -z "$TASK_ID" ] || [ -z "$REASON" ]; then
  echo -e "${RED}Usage: bash scripts/force-close-session.sh <TASK_ID> \"<reason>\"${NC}"
  exit 1
fi

if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
  echo -e "${RED}Must be run from TERP repo root.${NC}"
  exit 1
fi

SESSION_DIR="docs/sessions/active"
ABANDONED_DIR="docs/sessions/abandoned"
AUDIT_LOG="docs/agent-handoff/audit.log"

mkdir -p "$ABANDONED_DIR" "docs/agent-handoff"

echo -e "${YELLOW}⚠️  Force-closing session for ${TASK_ID}...${NC}"

# Find session file
SESSION_FILE=$(grep -rl "Task ID.*${TASK_ID}" "$SESSION_DIR/" 2>/dev/null | head -1 || true)

if [ -n "$SESSION_FILE" ]; then
  SESSION_NAME=$(basename "$SESSION_FILE")
  ARCHIVE_FILE="${ABANDONED_DIR}/${SESSION_NAME}"

  # Mark as abandoned
  sed -i '' 's/🟡 In Progress/🔴 ABANDONED/' "$SESSION_FILE" 2>/dev/null || \
  sed -i 's/🟡 In Progress/🔴 ABANDONED/' "$SESSION_FILE"

  # Append abandon record
  cat >> "$SESSION_FILE" << EOF

## Force Close Record
- **Closed by:** force-close-session.sh
- **Closed at:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Reason:** ${REASON}
- **Operator:** $(git config user.email 2>/dev/null || echo 'unknown')
EOF

  mv "$SESSION_FILE" "$ARCHIVE_FILE"
  echo -e "${GREEN}✓ Session archived to ${ARCHIVE_FILE}${NC}"
else
  echo -e "${YELLOW}⚠️  No session file found for ${TASK_ID} in ${SESSION_DIR}/${NC}"
fi

# Append to audit log
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | FORCE_CLOSE | ${TASK_ID} | reason: ${REASON} | operator: $(git config user.email 2>/dev/null || echo 'unknown') | branch: $(git branch --show-current)" >> "$AUDIT_LOG"
echo -e "${GREEN}✓ Audit log updated: ${AUDIT_LOG}${NC}"

echo -e "${GREEN}✅ Session force-closed. Task ${TASK_ID} can now be started fresh.${NC}"
