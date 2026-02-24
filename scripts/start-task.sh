#!/bin/bash
# TERP Task Startup Script v2.0 (Ironclad Edition)
# Enforces protocol adherence by automating session creation

set -e  # Exit on error

# --- Configuration ---
RED=\'\033[0;31m\'
GREEN=\'\033[0;32m\'
YELLOW=\'\033[1;33m\'
BLUE=\'\033[0;34m\'
NC=\'\033[0m\' # No Color

MASTER_ROADMAP="docs/roadmaps/MASTER_ROADMAP.md"
TESTING_ROADMAP="docs/roadmaps/TESTING_ROADMAP.md"
ACTIVE_SESSIONS="docs/ACTIVE_SESSIONS.md"
SESSION_DIR="docs/sessions/active"
LOCK_FILE="/tmp/start-task.lock"

# --- Functions ---

# Generic error handler
error_exit() {
  echo -e "${RED}❌ ERROR: $1${NC}"
  # Clean up lock file on error
  rm -f "$LOCK_FILE"
  exit 1
}

# --- Main Script ---

# Acquire lock to prevent race conditions
if [ -e "$LOCK_FILE" ]; then
  error_exit "Another start-task process is running. Please wait."
fi
touch "$LOCK_FILE"

# Ensure we are in the root of the TERP repository
if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
  error_exit "This script must be run from the root of the TERP repository."
fi

# Parse arguments
ADHOC_MODE=false
TASK_DESCRIPTION=""
CATEGORY=""
TASK_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --adhoc|-a)
      ADHOC_MODE=true
      TASK_DESCRIPTION="$2"
      shift 2
      ;;
    --category|-c)
      CATEGORY="$2"
      shift 2
      ;;
    *)
      if [ -z "$TASK_ID" ]; then
        TASK_ID="$1"
      fi
      shift
      ;;
  esac
done

# --- Ad-Hoc Task Generation ---
if [ "$ADHOC_MODE" = true ]; then
  # Validate task description
  if [ -z "$TASK_DESCRIPTION" ] || [[ "$TASK_DESCRIPTION" =~ [\`\*\#\[\]\(\)] ]]; then
    error_exit "Task description is required and cannot contain special characters like \"\`*#[]()\"."
  fi
  
  echo -e "${BLUE}🔄 Ad-hoc mode: Generating task ID...${NC}"
  
  DATE=$(date +%Y%m%d)
  PREFIX=$(echo "${CATEGORY:-adhoc}" | tr '[:lower:]' '[:upper:]')
  
  # Find next sequence number for today
  LAST_SEQ=$(grep -oP "${PREFIX}-${DATE}-\K[0-9]+" "$MASTER_ROADMAP" 2>/dev/null | sort -n | tail -1 || echo "0")
  NEXT_SEQ=$(printf "%03d" $((LAST_SEQ + 1)))
  
  TASK_ID="${PREFIX}-${DATE}-${NEXT_SEQ}"
  
  echo -e "${GREEN}🆔 Generated Task ID: ${TASK_ID}${NC}"
  
  # Add task to MASTER_ROADMAP.md
  echo "" >> "$MASTER_ROADMAP"
  echo "### ${TASK_ID}" >> "$MASTER_ROADMAP"
  echo "- [ ] ${TASK_DESCRIPTION}" >> "$MASTER_ROADMAP"
  echo "- **Priority:** 🔴 HIGH" >> "$MASTER_ROADMAP"
  echo "- **Category:** ${CATEGORY:-adhoc}" >> "$MASTER_ROADMAP"
  echo "- **Test Status:** ⚪ Untested" >> "$MASTER_ROADMAP"
  echo "- **Created:** $(date +\"%Y-%m-%d %H:%M:%S\")" >> "$MASTER_ROADMAP"
  
  echo -e "${GREEN}✅ Task added to MASTER_ROADMAP.md${NC}"

  # Auto-generate test task for features
  if [ "$PREFIX" == "FEAT" ]; then
    TEST_TASK_ID="TEST-${TASK_ID}"
    echo "" >> "$TESTING_ROADMAP"
    echo "### ${TEST_TASK_ID}" >> "$TESTING_ROADMAP"
    echo "- [ ] Write and pass all tests for feature ${TASK_ID}" >> "$TESTING_ROADMAP"
    echo "- **Linked Feature:** ${TASK_ID}" >> "$TESTING_ROADMAP"
    echo "- **Priority:** 🔴 HIGH" >> "$TESTING_ROADMAP"
    echo "- **Created:** $(date +\"%Y-%m-%d %H:%M:%S\")" >> "$TESTING_ROADMAP"
    echo -e "${GREEN}✅ Linked test task ${TEST_TASK_ID} created in TESTING_ROADMAP.md${NC}"
  fi
fi

# --- Validation ---
if [ -z "$TASK_ID" ]; then
  error_exit "Task ID is required. Use 'pnpm start-task \"TASK_ID\"' or 'pnpm start-task --adhoc \"Description\"'."
fi

SESSION_ID=$(date +%Y%m%d)-$(openssl rand -hex 4)
# Use AGENT_PREFIX env var if set, otherwise default to "agent"
# Examples: AGENT_PREFIX=claude, AGENT_PREFIX=cursor, AGENT_PREFIX=manus
BRANCH_PREFIX="${AGENT_PREFIX:-agent}"
BRANCH_NAME="${BRANCH_PREFIX}/${TASK_ID}-${SESSION_ID}"
SESSION_FILE="${SESSION_DIR}/Session-${SESSION_ID}.md"

# --- Pre-flight Checks ---
echo -e "${GREEN}🚀 Starting task: ${TASK_ID}${NC}"

# 1. Validate task exists
if [ "$ADHOC_MODE" = false ]; then
  if ! grep -q "${TASK_ID}" "$MASTER_ROADMAP" && ! grep -q "${TASK_ID}" "$TESTING_ROADMAP"; then
    error_exit "Task ${TASK_ID} not found in any roadmap. Use --adhoc mode to create it."
  fi
fi

# 2. Check if task is already assigned
ROADMAP_FILE="$MASTER_ROADMAP"
if ! grep -q "${TASK_ID}" "$MASTER_ROADMAP"; then
  ROADMAP_FILE="$TESTING_ROADMAP"
fi

TASK_STATUS=$(grep "${TASK_ID}" "$ROADMAP_FILE" | grep -o "\[.\]" | head -1 || echo "")
if [ "$TASK_STATUS" == "[~]" ] || [ "$TASK_STATUS" == "[x]" ]; then
  error_exit "Task ${TASK_ID} is already in progress or completed."
fi

# 3. Check for conflicts
if [ -f "$ACTIVE_SESSIONS" ] && grep -q "${TASK_ID}" "$ACTIVE_SESSIONS"; then
  error_exit "Task ${TASK_ID} is already being worked on. Check ACTIVE_SESSIONS.md."
fi

# --- Execution with Rollback ---

# Create a function to rollback changes
rollback() {
  echo -e "${RED}🔄 Rolling back changes...${NC}"
  git checkout -f HEAD
  git branch -D "$BRANCH_NAME" 2>/dev/null || true
  rm -f "$SESSION_FILE" 2>/dev/null || true
  error_exit "Task startup failed. System has been restored to its previous state."
}

# Trap errors and call rollback function
trap rollback ERR

# 4. Create Git branch
git checkout -b "$BRANCH_NAME" || error_exit "Failed to create Git branch."

# 5. Create session file
mkdir -p "$SESSION_DIR"
cat > "$SESSION_FILE" << EOF
# Session: ${SESSION_ID}

**Task ID:** ${TASK_ID}  
**Branch:** \`${BRANCH_NAME}\`  
**Started:** $(date +"%Y-%m-%d %H:%M:%S")  
**Agent:** ${AGENT_PREFIX:-agent}  
**Status:** 🟡 In Progress

---

## Objective

${TASK_DESCRIPTION:-[Describe what you are working on]}

---

## Progress Log

### $(date +"%Y-%m-%d %H:%M")
- Session started

---

## Completion Checklist

- [ ] Code written
- [ ] Tests written & passing
- [ ] Roadmap updated
- [ ] User approval received
- [ ] Merged to main
- [ ] Session file archived
EOF

# 6. Update roadmap
sed -i "s/\(${TASK_ID}.*\)\[ \]/\1[~]/" "$ROADMAP_FILE"
sed -i "s/\(${TASK_ID}.*\[~\]\)/\1 (Session: ${SESSION_ID})/" "$ROADMAP_FILE"

# 7. Update ACTIVE_SESSIONS.md
if [ ! -f "$ACTIVE_SESSIONS" ]; then
  echo "# Active Development Sessions" > "$ACTIVE_SESSIONS"
fi
echo "
## Session: ${SESSION_ID}

**Task ID:** ${TASK_ID}  
**Branch:** \`${BRANCH_NAME}\`  
**Started:** $(date +"%Y-%m-%d %H:%M:%S")" >> "$ACTIVE_SESSIONS"

# 8. Commit and push
git add . || error_exit "Failed to stage files."
git commit -m "chore: start task ${TASK_ID} (Session: ${SESSION_ID})" --no-verify || error_exit "Failed to commit changes."
git push -u origin "$BRANCH_NAME" || error_exit "Failed to push to GitHub."

# --- Success ---

# Disable error trap
trap - ERR

# Clean up lock file
rm -f "$LOCK_FILE"

echo -e "${GREEN}🎉 Task startup complete! You are now on branch ${BRANCH_NAME}.${NC}"
