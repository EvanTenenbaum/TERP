#!/bin/bash
# TERP Task Startup Script (Enhanced with Ad-Hoc Support)
# Enforces protocol adherence by automating session creation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# If ad-hoc mode, generate task ID
if [ "$ADHOC_MODE" = true ]; then
  if [ -z "$TASK_DESCRIPTION" ]; then
    echo -e "${RED}❌ ERROR: Task description is required for ad-hoc tasks${NC}"
    echo "Usage: pnpm start-task --adhoc \"Task description\""
    echo "Example: pnpm start-task --adhoc \"Fix login bug\" --category bug"
    exit 1
  fi
  
  echo -e "${BLUE}🔄 Ad-hoc mode: Generating task ID...${NC}"
  echo ""
  
  # Generate task ID
  DATE=$(date +%Y%m%d)
  
  # Determine prefix based on category
  case "$CATEGORY" in
    bug)
      PREFIX="BUG"
      ;;
    feature)
      PREFIX="FEAT"
      ;;
    performance)
      PREFIX="PERF"
      ;;
    refactor)
      PREFIX="REFACTOR"
      ;;
    test)
      PREFIX="TEST"
      ;;
    docs)
      PREFIX="DOCS"
      ;;
    *)
      PREFIX="ADHOC"
      ;;
  esac
  
  # Find next sequence number for today
  LAST_SEQ=$(grep -oP "${PREFIX}-${DATE}-\K[0-9]+" docs/roadmaps/MASTER_ROADMAP.md 2>/dev/null | sort -n | tail -1 || echo "0")
  NEXT_SEQ=$(printf "%03d" $((LAST_SEQ + 1)))
  
  TASK_ID="${PREFIX}-${DATE}-${NEXT_SEQ}"
  
  echo -e "${GREEN}🆔 Generated Task ID: ${TASK_ID}${NC}"
  echo -e "${GREEN}📝 Description: ${TASK_DESCRIPTION}${NC}"
  if [ -n "$CATEGORY" ]; then
    echo -e "${GREEN}🏷️  Category: ${CATEGORY}${NC}"
  fi
  echo ""
  
  # Add task to MASTER_ROADMAP.md
  echo "" >> docs/roadmaps/MASTER_ROADMAP.md
  echo "### ${TASK_ID}" >> docs/roadmaps/MASTER_ROADMAP.md
  echo "- [ ] ${TASK_DESCRIPTION}" >> docs/roadmaps/MASTER_ROADMAP.md
  echo "- **Priority:** 🔴 HIGH" >> docs/roadmaps/MASTER_ROADMAP.md
  echo "- **Category:** ${CATEGORY:-adhoc}" >> docs/roadmaps/MASTER_ROADMAP.md
  echo "- **Test Status:** ⚪ Untested" >> docs/roadmaps/MASTER_ROADMAP.md
  echo "- **Created:** $(date +\"%Y-%m-%d %H:%M:%S\")" >> docs/roadmaps/MASTER_ROADMAP.md
  
  echo -e "${GREEN}✅ Task added to MASTER_ROADMAP.md${NC}"
  echo ""
fi

# Check if TASK_ID is provided
if [ -z "$TASK_ID" ]; then
  echo -e "${RED}❌ ERROR: Task ID is required${NC}"
  echo ""
  echo "Usage:"
  echo "  Mode 1 (Existing task): pnpm start-task \"TASK_ID\""
  echo "  Mode 2 (Ad-hoc task):   pnpm start-task --adhoc \"Description\" [--category bug|feature|performance|refactor|test|docs]"
  echo ""
  echo "Examples:"
  echo "  pnpm start-task \"FEAT-001\""
  echo "  pnpm start-task --adhoc \"Fix login bug\" --category bug"
  echo "  pnpm start-task -a \"Add dark mode\" -c feature"
  exit 1
fi

SESSION_ID=$(date +%Y%m%d)-$(openssl rand -hex 4)
BRANCH_NAME="claude/${TASK_ID}-${SESSION_ID}"
SESSION_FILE="docs/sessions/active/Session-${SESSION_ID}.md"

echo -e "${GREEN}🚀 Starting task: ${TASK_ID}${NC}"
echo ""

# Step 1: Validate task exists in roadmap (skip if ad-hoc since we just added it)
if [ "$ADHOC_MODE" = false ]; then
  echo "📋 Step 1: Validating task..."

  TASK_IN_MASTER=$(grep -c "\[${TASK_ID}\]" docs/roadmaps/MASTER_ROADMAP.md 2>/dev/null || echo "0")
  TASK_IN_TESTING=$(grep -c "\[${TASK_ID}\]" docs/roadmaps/TESTING_ROADMAP.md 2>/dev/null || echo "0")

  if [ "$TASK_IN_MASTER" -eq "0" ] && [ "$TASK_IN_TESTING" -eq "0" ]; then
    echo -e "${RED}❌ ERROR: Task ${TASK_ID} not found in MASTER_ROADMAP.md or TESTING_ROADMAP.md${NC}"
    echo "Please add the task to the appropriate roadmap first, or use --adhoc mode."
    exit 1
  fi

  # Determine which roadmap the task is in
  if [ "$TASK_IN_MASTER" -gt "0" ]; then
    ROADMAP_FILE="docs/roadmaps/MASTER_ROADMAP.md"
    ROADMAP_TYPE="MASTER"
  else
    ROADMAP_FILE="docs/roadmaps/TESTING_ROADMAP.md"
    ROADMAP_TYPE="TESTING"
  fi

  echo -e "${GREEN}✅ Task found in ${ROADMAP_TYPE}_ROADMAP.md${NC}"
else
  echo "📋 Step 1: Skipping validation (ad-hoc task just created)"
  ROADMAP_FILE="docs/roadmaps/MASTER_ROADMAP.md"
  ROADMAP_TYPE="MASTER"
fi

# Step 2: Check if task is already assigned
echo "🔍 Step 2: Checking if task is already assigned..."

TASK_STATUS=$(grep "\[${TASK_ID}\]" "$ROADMAP_FILE" 2>/dev/null | grep -o "\[.\]" | head -1 || echo "")

if [ "$TASK_STATUS" == "[~]" ] || [ "$TASK_STATUS" == "[x]" ]; then
  echo -e "${RED}❌ ERROR: Task ${TASK_ID} is already in progress or completed${NC}"
  echo "Current status: $TASK_STATUS"
  echo "Check ACTIVE_SESSIONS.md for details."
  exit 1
fi

echo -e "${GREEN}✅ Task is available${NC}"

# Step 3: Check for conflicts with active sessions
echo "🔒 Step 3: Checking for conflicts with active sessions..."

if [ -f "docs/ACTIVE_SESSIONS.md" ] && grep -q "${TASK_ID}" docs/ACTIVE_SESSIONS.md; then
  echo -e "${RED}❌ ERROR: Task ${TASK_ID} is already being worked on${NC}"
  echo "Check ACTIVE_SESSIONS.md for details."
  exit 1
fi

echo -e "${GREEN}✅ No conflicts detected${NC}"

# Step 4: Create Git branch
echo "🌿 Step 4: Creating Git branch..."

git checkout -b "$BRANCH_NAME"

echo -e "${GREEN}✅ Branch created: ${BRANCH_NAME}${NC}"

# Step 5: Create session file directory if needed
echo "📝 Step 5: Creating session file..."

mkdir -p docs/sessions/active

cat > "$SESSION_FILE" << EOF
# Session: ${SESSION_ID}

**Task ID:** ${TASK_ID}  
**Branch:** \`${BRANCH_NAME}\`  
**Started:** $(date +"%Y-%m-%d %H:%M:%S")  
**Agent:** Claude (Manus AI)  
**Status:** 🟡 In Progress

---

## Objective

${TASK_DESCRIPTION:-[Describe what you're working on]}

---

## Progress Log

### $(date +"%Y-%m-%d %H:%M")
- Session started
- Branch created: \`${BRANCH_NAME}\`

---

## Completion Checklist

- [ ] Code written
- [ ] Tests written
- [ ] All tests pass
- [ ] No linting/type errors
- [ ] Roadmap updated
- [ ] User approval received
- [ ] Merged to main
- [ ] Session file moved to completed/
EOF

echo -e "${GREEN}✅ Session file created: ${SESSION_FILE}${NC}"

# Step 6: Update roadmap
echo "📊 Step 6: Updating roadmap..."

# Replace [ ] with [~] for the task
sed -i "s/\(${TASK_ID}.*\)\[ \]/\1[~]/" "$ROADMAP_FILE"

# Add session ID to the task line (if not already there)
if ! grep -q "${TASK_ID}.*Session: ${SESSION_ID}" "$ROADMAP_FILE"; then
  sed -i "s/\(${TASK_ID}.*\[~\]\)/\1 (Session: ${SESSION_ID})/" "$ROADMAP_FILE"
fi

echo -e "${GREEN}✅ Roadmap updated${NC}"

# Step 7: Update ACTIVE_SESSIONS.md
echo "📋 Step 7: Updating ACTIVE_SESSIONS.md..."

# Create ACTIVE_SESSIONS.md if it doesn't exist
if [ ! -f "docs/ACTIVE_SESSIONS.md" ]; then
  cat > docs/ACTIVE_SESSIONS.md << EOF
# Active Development Sessions

This file tracks all currently active development sessions to prevent conflicts.

**Last Updated:** $(date +"%Y-%m-%d %H:%M:%S")

---

EOF
fi

cat >> docs/ACTIVE_SESSIONS.md << EOF

## Session: ${SESSION_ID}

**Task ID:** ${TASK_ID}  
**Branch:** \`${BRANCH_NAME}\`  
**Started:** $(date +"%Y-%m-%d %H:%M:%S")  
**Agent:** Claude (Manus AI)  
**Status:** 🟡 In Progress

EOF

echo -e "${GREEN}✅ ACTIVE_SESSIONS.md updated${NC}"

# Step 8: Commit and push
echo "💾 Step 8: Committing and pushing changes..."

git add "$SESSION_FILE" "$ROADMAP_FILE" docs/ACTIVE_SESSIONS.md
git commit -m "chore: start task ${TASK_ID} (Session: ${SESSION_ID})"
git push -u origin "$BRANCH_NAME"

echo -e "${GREEN}✅ Changes pushed to GitHub${NC}"
echo ""
echo -e "${GREEN}🎉 Task startup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Write your code"
echo "2. Commit with: git commit -m \"feat: your changes\""
echo "3. Push with: git push"
echo "4. Request review from the user"
echo ""
echo "Session file: ${SESSION_FILE}"
echo "Branch: ${BRANCH_NAME}"
