#!/bin/bash
# TERP QA Standards Enforcement v2.0

# --- Configuration ---
CONFIG_FILE=".husky/qa-config.sh"

# Source shared config
if [ -f "$CONFIG_FILE" ]; then
  . "$CONFIG_FILE"
else
  # Default regex if config file not found
  BRANCH_NAME_REGEX=
fi

# --- Main Script ---
echo "🔍 Running QA checks..."
BLOCKED=0

# --- Functions ---
block_commit() {
  echo -e "\033[0;31m❌ BLOCKED: $1\033[0m"
  echo "   Fix: $2"
  BLOCKED=1
}

warn() {
  echo -e "\033[1;33m⚠️  WARNING: $1\033[0m"
  echo "   Recommendation: $2"
}

# --- Checks ---

# 1. Check branch name format
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! "$CURRENT_BRANCH" =~ $BRANCH_NAME_REGEX ]] && [[ "$CURRENT_BRANCH" != "main" ]]; then
  block_commit "Invalid branch name format: $CURRENT_BRANCH" "Use 'pnpm start-task' to create a proper branch."
fi

# 2. Check for new \'any\' types
if git diff --cached --diff-filter=ACM | grep "^+" | grep -q ': "any"'; then
  block_commit "Found new 'any' types" "Define proper TypeScript interfaces."
fi

# 3. Check for large files (exclude drizzle/ schema files and autoMigrate.ts which are consolidated by design)
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | grep -v '^drizzle/' | grep -v 'server/autoMigrate.ts'); do
  if [ -f "$file" ] && [ $(wc -l < "$file") -gt 500 ]; then
    block_commit "$file has more than 500 lines" "Split into smaller modules."
  fi
done

# 4. Check for hardcoded credentials (exclude docs and test files)
if git diff --cached --diff-filter=ACM --name-only | grep -vE "\.(test|spec)\.ts$|^docs/|\.md$" | xargs -I {} git diff --cached {} 2>/dev/null | grep "^+" | grep -qiE "(password|secret|api_key|token).*=.*[\"']"; then
  block_commit "Possible hardcoded credentials detected" "Use environment variables instead."
fi

# 5. Check if roadmap is updated when code changes
CODE_FILES_CHANGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | wc -l)
ROADMAP_CHANGED=$(git diff --cached --name-only | grep -E 'MASTER_ROADMAP\.md|TESTING_ROADMAP\.md' | wc -l)
if [ "$CODE_FILES_CHANGED" -gt 0 ] && [ "$ROADMAP_CHANGED" -eq 0 ]; then
  warn "Code files changed but roadmap not updated" "Please update MASTER_ROADMAP.md or TESTING_ROADMAP.md"
fi

# --- Final Verdict ---
echo ""
if [ $BLOCKED -eq 1 ]; then
  echo "❌ COMMIT BLOCKED - Fix issues above"
  exit 1
else
  echo "✅ All QA checks passed"
  exit 0
fi
