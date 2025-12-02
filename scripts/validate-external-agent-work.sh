#!/bin/bash

# Validate External Agent Work
# Run this after an external agent completes work to verify they followed protocols

set -e

echo "🔍 Validating External Agent Work"
echo "=================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Session file exists and is properly formatted
echo "📋 Check 1: Session Registration"
if [ -z "$(ls docs/sessions/completed/Session-*-*.md 2>/dev/null | tail -1)" ]; then
    echo "  ❌ No completed session file found"
    ERRORS=$((ERRORS + 1))
else
    LATEST_SESSION=$(ls docs/sessions/completed/Session-*-*.md | tail -1)
    echo "  ✅ Found session: $LATEST_SESSION"
    
    # Check if it mentions external platform
    if grep -q "External\|Claude\|ChatGPT" "$LATEST_SESSION"; then
        echo "  ✅ Session marked as external agent"
    else
        echo "  ⚠️  Session doesn't mention external platform"
        WARNINGS=$((WARNINGS + 1))
    fi
fi
echo ""

# Check 2: TypeScript compliance
echo "🔤 Check 2: TypeScript Standards"
if pnpm typecheck 2>&1 | grep -q "error"; then
    echo "  ❌ TypeScript errors found"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No TypeScript errors"
fi
echo ""

# Check 3: Linting
echo "🎨 Check 3: Linting Standards"
if pnpm lint 2>&1 | grep -q "error"; then
    echo "  ❌ Linting errors found"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No linting errors"
fi
echo ""

# Check 4: Tests
echo "🧪 Check 4: Testing Standards"
if pnpm test 2>&1 | grep -q "FAIL"; then
    echo "  ❌ Tests failing"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ All tests passing"
fi
echo ""

# Check 5: No 'any' types in recent commits
echo "🚫 Check 5: No 'any' Types"
RECENT_FILES=$(git diff HEAD~1 --name-only | grep -E '\.(ts|tsx)$' || true)
if [ -n "$RECENT_FILES" ]; then
    ANY_COUNT=0
    for file in $RECENT_FILES; do
        if [ -f "$file" ]; then
            COUNT=$(grep -c ": any\|<any>\|any\[\]" "$file" || true)
            ANY_COUNT=$((ANY_COUNT + COUNT))
        fi
    done
    
    if [ $ANY_COUNT -gt 0 ]; then
        echo "  ❌ Found $ANY_COUNT 'any' types in recent changes"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ✅ No 'any' types found"
    fi
else
    echo "  ℹ️  No TypeScript files changed"
fi
echo ""

# Check 6: Roadmap updated
echo "📊 Check 6: Roadmap Updated"
if git diff HEAD~1 docs/roadmaps/MASTER_ROADMAP.md | grep -q "Status.*complete"; then
    echo "  ✅ Roadmap updated with completion"
else
    echo "  ⚠️  Roadmap may not be updated"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 7: Roadmap validates
echo "✅ Check 7: Roadmap Validation"
if pnpm roadmap:validate 2>&1 | grep -q "error\|Error"; then
    echo "  ❌ Roadmap validation failed"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ Roadmap validates"
fi
echo ""

# Check 8: Deployment status
echo "🚀 Check 8: Deployment Status"
LATEST_COMMIT=$(git rev-parse HEAD | cut -c1-7)
if [ -f ".deployment-status-$LATEST_COMMIT.log" ]; then
    if grep -q "success\|deployed" ".deployment-status-$LATEST_COMMIT.log"; then
        echo "  ✅ Deployment succeeded"
    else
        echo "  ❌ Deployment may have failed"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  ⚠️  No deployment log found (may still be deploying)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 9: Commit message format
echo "📝 Check 9: Commit Message Format"
LATEST_MSG=$(git log -1 --pretty=%B)
if echo "$LATEST_MSG" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?:"; then
    echo "  ✅ Commit message follows convention"
else
    echo "  ⚠️  Commit message doesn't follow conventional format"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 10: No active sessions left
echo "🔒 Check 10: Session Cleanup"
if grep -q "Session-.*External" docs/ACTIVE_SESSIONS.md 2>/dev/null; then
    echo "  ❌ External agent session still active (should be archived)"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No active external sessions"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Validation Summary"
echo "=================================="
echo ""
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed! External agent followed protocols correctly."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  All critical checks passed, but there are $WARNINGS warnings."
    echo "Review warnings above and consider fixing them."
    exit 0
else
    echo "❌ Validation failed with $ERRORS errors."
    echo "External agent did not follow protocols correctly."
    echo "Review errors above and fix before proceeding."
    exit 1
fi
