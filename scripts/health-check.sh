#!/bin/bash
# Health Check Script
# Verifies GitHub sync, detects stale sessions, checks for issues
# Usage: ./scripts/health-check.sh

set -e

echo "🏥 TERP System Health Check"
echo "=========================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Git Status
echo "1️⃣  Checking git status..."
UNTRACKED=$(git status --porcelain | grep "^??" | wc -l)
UNCOMMITTED=$(git status --porcelain | grep "^ M\|^M " | wc -l)

if [ $UNCOMMITTED -gt 0 ]; then
    echo "⚠️  Warning: $UNCOMMITTED uncommitted changes"
    git status --short | grep "^ M\|^M "
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ No uncommitted changes"
fi

if [ $UNTRACKED -gt 0 ]; then
    echo "⚠️  Warning: $UNTRACKED untracked files"
    git status --short | grep "^??"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ No untracked files"
fi

# Check 2: Unpushed Commits
echo ""
echo "2️⃣  Checking for unpushed commits..."
CURRENT_BRANCH=$(git branch --show-current)
UNPUSHED=$(git log origin/$CURRENT_BRANCH..HEAD --oneline 2>/dev/null | wc -l || echo 0)

if [ $UNPUSHED -gt 0 ]; then
    echo "⚠️  Warning: $UNPUSHED unpushed commits on $CURRENT_BRANCH"
    git log origin/$CURRENT_BRANCH..HEAD --oneline
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ All commits pushed"
fi

# Check 3: Stale Sessions
echo ""
echo "3️⃣  Checking for stale sessions..."
STALE_COUNT=0

if [ -d "docs/sessions/active" ]; then
    for file in docs/sessions/active/*.md; do
        if [ -f "$file" ]; then
            # Check if last updated > 4 hours ago
            LAST_MODIFIED=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null)
            NOW=$(date +%s)
            AGE=$((NOW - LAST_MODIFIED))

            if [ $AGE -gt 14400 ]; then  # 4 hours = 14400 seconds
                echo "⚠️  Stale session: $(basename $file) ($(($AGE / 3600)) hours old)"
                STALE_COUNT=$((STALE_COUNT + 1))
            fi
        fi
    done
fi

if [ $STALE_COUNT -gt 0 ]; then
    echo "⚠️  Warning: $STALE_COUNT stale sessions found"
    echo "   Consider moving to abandoned/ or updating status"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ No stale sessions"
fi

# Check 4: TypeScript Errors
echo ""
echo "4️⃣  Checking for TypeScript errors..."
if command -v pnpm &> /dev/null; then
    if pnpm check &> /dev/null; then
        echo "✅ No TypeScript errors"
    else
        echo "❌ TypeScript errors found"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "⚠️  Warning: pnpm not found, skipping TypeScript check"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 5: Test Status
echo ""
echo "5️⃣  Checking test status..."
if command -v pnpm &> /dev/null; then
    if pnpm test --run &> /dev/null; then
        echo "✅ All tests passing"
    else
        echo "❌ Tests failing"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "⚠️  Warning: pnpm not found, skipping test check"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 6: Active Sessions Count
echo ""
echo "6️⃣  Checking active session count..."
ACTIVE_COUNT=$(find docs/sessions/active -name "*.md" 2>/dev/null | wc -l)

echo "   Active sessions: $ACTIVE_COUNT"

if [ $ACTIVE_COUNT -gt 4 ]; then
    echo "⚠️  Warning: More than 4 concurrent sessions (risk of conflicts)"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ Session count within limits"
fi

# Check 7: GitHub Sync
echo ""
echo "7️⃣  Checking GitHub sync..."
if git fetch origin &> /dev/null; then
    LOCAL_HASH=$(git rev-parse HEAD)
    REMOTE_HASH=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "unknown")

    if [ "$LOCAL_HASH" == "$REMOTE_HASH" ]; then
        echo "✅ Local and GitHub are in sync"
    else
        echo "⚠️  Warning: Local and GitHub are out of sync"
        echo "   Local:  $LOCAL_HASH"
        echo "   Remote: $REMOTE_HASH"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "❌ Cannot fetch from GitHub"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "=========================="
echo "📊 Health Check Summary"
echo "=========================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed!"
    echo "   System is healthy"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  $WARNINGS warnings found"
    echo "   System is operational but has minor issues"
    exit 0
else
    echo "❌ $ERRORS errors and $WARNINGS warnings found"
    echo "   System has critical issues that need attention"
    exit 1
fi
