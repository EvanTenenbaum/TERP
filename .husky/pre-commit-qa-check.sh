#!/bin/bash
# TERP QA Standards Enforcement
# Auto-blocks commits that violate quality standards

echo "🔍 Running QA checks..."

BLOCKED=0

# 1. Check for new 'any' types
echo "Checking for new 'any' types..."
NEW_ANY=$(git diff --cached --diff-filter=ACM | grep "^+" | grep -c ": ""any" || true)
if [ "$NEW_ANY" -gt 0 ]; then
  echo "❌ BLOCKED: Found $NEW_ANY new 'any' types"
  echo "   Fix: Define proper TypeScript interfaces"
  echo "   See: CODE_QA_EXECUTIVE_SUMMARY.md → Type Safety Crisis"
  BLOCKED=1
fi

# 2. Check for files over 500 lines
echo "Checking for large files..."
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$'); do
  if [ -f "$file" ]; then
    LINES=$(wc -l < "$file")
    if [ "$LINES" -gt 500 ]; then
      echo "❌ BLOCKED: $file has $LINES lines (max 500)"
      echo "   Fix: Split into smaller modules"
      echo "   See: CODE_QA_DETAILED_TECHNICAL_REPORT.md → Component Analysis"
      BLOCKED=1
    fi
  fi
done

# 3. Check for console.log (should use logger)
echo "Checking for console.log usage..."
CONSOLE_LOGS=$(git diff --cached --diff-filter=ACM | grep -c "console\\.log\\|console\\.error\\|console\\.warn" || true)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
  echo "⚠️  WARNING: Found $CONSOLE_LOGS console.log/error/warn statements"
  echo "   Recommendation: Use logger instead"
  echo "   import { logger } from '../_core/logger';"
  # Not blocking, just warning
fi

# 4. Check for publicProcedure in admin/financial routers
echo "Checking for security issues..."
if git diff --cached --diff-filter=ACM | grep -q "publicProcedure" ; then
  echo "⚠️  WARNING: Found publicProcedure usage"
  echo "   Verify: Is this endpoint truly public?"
  echo "   Admin/financial endpoints MUST use protectedProcedure or adminProcedure"
  echo "   See: CODE_QA_EXECUTIVE_SUMMARY.md → Security Vulnerabilities"
  # Not blocking, but requires manual review
fi

# 5. Check for N+1 query patterns
echo "Checking for N+1 query patterns..."
if git diff --cached --diff-filter=ACM | grep -E "for.*of.*await.*findFirst|map.*async.*findFirst" ; then
  echo "⚠️  WARNING: Possible N+1 query pattern detected"
  echo "   Review: Use batch loading with findMany + inArray"
  echo "   See: CODE_QA_DETAILED_TECHNICAL_REPORT.md → Performance Bottlenecks"
fi

# 6. Check if new router has tests
echo "Checking for test coverage..."
for file in $(git diff --cached --name-only --diff-filter=A | grep "server/routers/.*\.ts$" | grep -v "\.test\.ts$"); do
  TEST_FILE="${file%.ts}.test.ts"
  if [ ! -f "$TEST_FILE" ]; then
    echo "⚠️  WARNING: New router $file has no test file"
    echo "   Create: $TEST_FILE"
    echo "   See: CODE_QA_DETAILED_TECHNICAL_REPORT.md → Test Coverage"
    # Not blocking, but strongly recommended
  fi
done

# 7. Check branch name format
echo "Checking branch name format..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ ! "$CURRENT_BRANCH" =~ ^claude/[A-Z]+-[0-9]+-?[0-9]*-[0-9]{8}-[a-f0-9]{8}$ ]] && [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "❌ BLOCKED: Invalid branch name format"
  echo "   Current branch: $CURRENT_BRANCH"
  echo "   Expected format: claude/TASK_ID-SESSION_ID"
  echo "   Example: claude/FEAT-001-20251119-a1b2c3d4"
  echo ""
  echo "   To fix: Use 'pnpm start-task \"TASK_ID\"' to create a proper branch"
  echo "   Or for ad-hoc tasks: 'pnpm start-task --adhoc \"Description\"'"
  BLOCKED=1
fi

# 8. Check if roadmap is updated when code changes
echo "Checking roadmap updates..."
CODE_FILES_CHANGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | grep -v '\.test\.' | wc -l)
ROADMAP_CHANGED=$(git diff --cached --name-only | grep -E 'MASTER_ROADMAP\.md|TESTING_ROADMAP\.md' | wc -l)

if [ "$CODE_FILES_CHANGED" -gt 0 ] && [ "$ROADMAP_CHANGED" -eq 0 ]; then
  echo "⚠️  WARNING: Code files changed but roadmap not updated"
  echo "   Changed files: $CODE_FILES_CHANGED"
  echo "   Please update MASTER_ROADMAP.md or TESTING_ROADMAP.md"
  echo "   (This is a warning, not blocking)"
fi

# 9. Check for hardcoded credentials (excluding test files)
echo "Checking for hardcoded secrets..."
SECRET_MATCHES=$(git diff --cached --diff-filter=ACM --name-only | grep -vE "\.(test|spec)\.ts$" | xargs -I {} git diff --cached {} | grep "^+" | grep -iE "(password|secret|api_key|token).*=.*['\"]" | grep -v "JWT_SECRET" | grep -v "GITHUB_WEBHOOK_SECRET" || true)
if [ -n "$SECRET_MATCHES" ]; then
  echo "🚨 CRITICAL: Possible hardcoded credentials detected!"
  echo "$SECRET_MATCHES"
  echo "   NEVER commit secrets to git"
  echo "   Use environment variables instead"
  BLOCKED=1
fi

echo ""
if [ $BLOCKED -eq 1 ]; then
  echo "❌ COMMIT BLOCKED - Fix issues above"
  echo ""
  echo "📚 Resources:"
  echo "   - .claude/AGENT_ONBOARDING.md"
  echo "   - CODE_QA_EXECUTIVE_SUMMARY.md"
  echo "   - CODE_QA_DETAILED_TECHNICAL_REPORT.md"
  exit 1
else
  echo "✅ All QA checks passed"
  exit 0
fi
