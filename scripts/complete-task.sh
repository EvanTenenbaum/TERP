#!/bin/bash
# TERP Task Completion Script v1.0
# Enforces protocol adherence by automating session completion

set -e  # Exit on error

# --- Configuration ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MASTER_ROADMAP="docs/roadmaps/MASTER_ROADMAP.md"
TESTING_ROADMAP="docs/roadmaps/TESTING_ROADMAP.md"
ACTIVE_SESSIONS="docs/ACTIVE_SESSIONS.md"
SESSION_DIR="docs/sessions/active"
COMPLETED_DIR="docs/sessions/completed"
LOCK_FILE="/tmp/complete-task.lock"

# --- Functions ---

error_exit() {
  echo -e "${RED}❌ ERROR: $1${NC}"
  rm -f "$LOCK_FILE"
  exit 1
}

success_exit() {
  echo -e "${GREEN}✅ $1${NC}"
  rm -f "$LOCK_FILE"
  exit 0
}

# --- Main Script ---

# Acquire lock
if [ -e "$LOCK_FILE" ]; then
  error_exit "Another complete-task process is running. Please wait."
fi
touch "$LOCK_FILE"

# Ensure we are in the root of the TERP repository
if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
  error_exit "This script must be run from the root of the TERP repository."
fi

# Parse arguments
TASK_ID=""
SESSION_ID=""
SKIP_VERIFY=false
FAST_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --session|-s)
      SESSION_ID="$2"
      shift 2
      ;;
    --skip-verify)
      SKIP_VERIFY=true
      shift
      ;;
    --fast|-f)
      FAST_MODE=true
      shift
      ;;
    *)
      if [ -z "$TASK_ID" ]; then
        TASK_ID="$1"
      fi
      shift
      ;;
  esac
done

# --- Validation ---
if [ -z "$TASK_ID" ]; then
  # Try to detect task ID from current branch
  CURRENT_BRANCH=$(git branch --show-current)
  if [[ "$CURRENT_BRANCH" =~ ^claude/([A-Z]+-[0-9]+) ]]; then
    TASK_ID="${BASH_REMATCH[1]}"
    echo -e "${BLUE}🔍 Auto-detected Task ID: ${TASK_ID}${NC}"
  else
    error_exit "Task ID is required. Use 'pnpm complete-task \"TASK_ID\"' or run from a task branch."
  fi
fi

echo -e "${GREEN}🏁 Completing task: ${TASK_ID}${NC}"

# Fast mode delegates to complete-task-fast.sh
if [ "$FAST_MODE" = true ]; then
  exec bash scripts/complete-task-fast.sh "$TASK_ID"
fi

# --- Pre-Completion Verification ---
if [ "$SKIP_VERIFY" = false ]; then
  echo -e "${BLUE}🔄 Running verification checks...${NC}"

  # 1. TypeScript check
  echo -e "${BLUE}  Checking TypeScript...${NC}"
  if ! pnpm check 2>/dev/null; then
    error_exit "TypeScript check failed. Fix errors before completing task."
  fi
  echo -e "${GREEN}  ✓ TypeScript OK${NC}"

  # 2. Lint check
  echo -e "${BLUE}  Checking ESLint...${NC}"
  if ! pnpm lint 2>/dev/null; then
    echo -e "${YELLOW}  ⚠ Lint warnings detected (continuing)${NC}"
  else
    echo -e "${GREEN}  ✓ Lint OK${NC}"
  fi

  # 3. Test check
  echo -e "${BLUE}  Running tests...${NC}"
  if ! pnpm test --run 2>/dev/null; then
    error_exit "Tests failed. Fix test failures before completing task."
  fi
  echo -e "${GREEN}  ✓ Tests OK${NC}"

  # 4. Build check
  echo -e "${BLUE}  Checking build...${NC}"
  if ! pnpm build 2>/dev/null; then
    error_exit "Build failed. Fix build errors before completing task."
  fi
  echo -e "${GREEN}  ✓ Build OK${NC}"

  echo -e "${GREEN}✅ All verification checks passed!${NC}"
fi

# --- Find Session ---
if [ -z "$SESSION_ID" ]; then
  # Try to find session from ACTIVE_SESSIONS.md
  if [ -f "$ACTIVE_SESSIONS" ]; then
    SESSION_LINE=$(grep -A2 "Task ID.*${TASK_ID}" "$ACTIVE_SESSIONS" | head -4 || true)
    if [ -n "$SESSION_LINE" ]; then
      SESSION_ID=$(echo "$SESSION_LINE" | grep -oP 'Session: \K[0-9]+-[a-f0-9]+' | head -1 || true)
    fi
  fi

  # Try to find from session files
  if [ -z "$SESSION_ID" ] && [ -d "$SESSION_DIR" ]; then
    SESSION_FILE=$(grep -l "Task ID.*${TASK_ID}" "$SESSION_DIR"/*.md 2>/dev/null | head -1 || true)
    if [ -n "$SESSION_FILE" ]; then
      SESSION_ID=$(basename "$SESSION_FILE" | sed 's/Session-//' | sed 's/.md//')
    fi
  fi
fi

if [ -z "$SESSION_ID" ]; then
  echo -e "${YELLOW}⚠ Could not find session ID for task ${TASK_ID}. Proceeding without session archival.${NC}"
fi

# --- Update Roadmap Status ---
echo -e "${BLUE}📝 Updating roadmap...${NC}"

ROADMAP_FILE="$MASTER_ROADMAP"
if ! grep -q "${TASK_ID}" "$MASTER_ROADMAP"; then
  ROADMAP_FILE="$TESTING_ROADMAP"
fi

if grep -q "${TASK_ID}" "$ROADMAP_FILE"; then
  # Change [~] to [x]
  sed -i "s/\(${TASK_ID}.*\)\[~\]/\1[x]/" "$ROADMAP_FILE"
  # Also change [ ] to [x] if not in progress yet
  sed -i "s/\(${TASK_ID}.*\)\[ \]/\1[x]/" "$ROADMAP_FILE"
  # Add completion date
  TODAY=$(date +"%Y-%m-%d")
  if ! grep -A5 "${TASK_ID}" "$ROADMAP_FILE" | grep -q "Completed:"; then
    sed -i "/${TASK_ID}/a - **Completed:** ${TODAY}" "$ROADMAP_FILE"
  fi
  echo -e "${GREEN}  ✓ Roadmap updated${NC}"
else
  echo -e "${YELLOW}  ⚠ Task not found in roadmap${NC}"
fi

# --- Archive Session ---
if [ -n "$SESSION_ID" ]; then
  SESSION_FILE="${SESSION_DIR}/Session-${SESSION_ID}.md"
  ARCHIVE_FILE="${COMPLETED_DIR}/Session-${SESSION_ID}.md"

  if [ -f "$SESSION_FILE" ]; then
    echo -e "${BLUE}📁 Archiving session...${NC}"
    mkdir -p "$COMPLETED_DIR"

    # Update session status
    sed -i 's/🟡 In Progress/✅ Completed/' "$SESSION_FILE"
    sed -i "/^## Completion Checklist/a\\
\\- [x] Task completed on $(date +\"%Y-%m-%d %H:%M\")" "$SESSION_FILE"

    # Move to completed
    mv "$SESSION_FILE" "$ARCHIVE_FILE"
    echo -e "${GREEN}  ✓ Session archived to ${ARCHIVE_FILE}${NC}"
  fi
fi

# --- Update ACTIVE_SESSIONS.md ---
if [ -f "$ACTIVE_SESSIONS" ]; then
  echo -e "${BLUE}📋 Updating ACTIVE_SESSIONS.md...${NC}"

  # Remove the session entry (multi-line removal)
  if [ -n "$SESSION_ID" ]; then
    # Create temp file without the session block
    awk -v session="Session: ${SESSION_ID}" '
      /^## Session:/ {
        if ($0 ~ session) {
          skip = 1
          next
        }
      }
      /^## Session:/ && skip { skip = 0 }
      /^$/ && skip { next }
      !skip { print }
    ' "$ACTIVE_SESSIONS" > "${ACTIVE_SESSIONS}.tmp"
    mv "${ACTIVE_SESSIONS}.tmp" "$ACTIVE_SESSIONS"
    echo -e "${GREEN}  ✓ Removed from ACTIVE_SESSIONS.md${NC}"
  fi
fi

# --- Commit Changes ---
echo -e "${BLUE}💾 Committing changes...${NC}"
git add . || true
git commit -m "chore: complete task ${TASK_ID}${SESSION_ID:+ (Session: ${SESSION_ID})}" --no-verify || echo -e "${YELLOW}  ⚠ No changes to commit${NC}"

# --- Success ---
rm -f "$LOCK_FILE"

echo ""
echo -e "${GREEN}🎉 Task ${TASK_ID} completed successfully!${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Push changes: ${BLUE}git push${NC}"
echo -e "  2. Create PR if needed: ${BLUE}gh pr create${NC}"
echo -e "  3. Monitor deployment: ${BLUE}./scripts/watch-deploy.sh${NC}"
