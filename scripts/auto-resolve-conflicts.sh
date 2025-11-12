#!/usr/bin/env bash
# Auto-resolve merge conflicts intelligently
# This script handles common conflict patterns for TERP repository

set -e

echo "🔍 Auto-Conflict Resolution Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if we resolved anything
RESOLVED_COUNT=0
FAILED_COUNT=0

# Check if we're in a rebase/merge
if [ ! -d ".git/rebase-merge" ] && [ ! -f ".git/MERGE_HEAD" ]; then
    echo -e "${RED}❌ Not currently in a merge or rebase${NC}"
    echo "Run 'git rebase origin/main' or 'git merge origin/main' first"
    exit 1
fi

# Get list of conflicted files
CONFLICTED_FILES=$(git diff --name-only --diff-filter=U)

if [ -z "$CONFLICTED_FILES" ]; then
    echo -e "${GREEN}✅ No conflicts to resolve!${NC}"
    exit 0
fi

echo "Found conflicts in:"
echo "$CONFLICTED_FILES"
echo ""

# Function to resolve documentation merge conflicts
resolve_doc_conflict() {
    local file=$1
    echo -e "${YELLOW}📄 Resolving documentation conflict: $file${NC}"

    # For AGENT_ONBOARDING.md, use our pre-merged version
    if [[ "$file" == ".claude/AGENT_ONBOARDING.md" ]]; then
        if [ -f ".claude/AGENT_ONBOARDING_MERGED.md" ]; then
            cp .claude/AGENT_ONBOARDING_MERGED.md .claude/AGENT_ONBOARDING.md
            git add .claude/AGENT_ONBOARDING.md
            echo -e "${GREEN}✅ Used intelligent merge for AGENT_ONBOARDING.md${NC}"
            ((RESOLVED_COUNT++))
            return 0
        fi
    fi

    # For other docs that are "both added" with similar content,
    # try to merge them intelligently
    if git show :2:"$file" > /tmp/ours.txt 2>/dev/null && \
       git show :3:"$file" > /tmp/theirs.txt 2>/dev/null; then

        # If files are identical except for timestamps/metadata, use ours
        if diff -I "Last Updated:" -I "Date:" -I "<!-- Generated" \
            /tmp/ours.txt /tmp/theirs.txt > /dev/null 2>&1; then
            git checkout --ours "$file"
            git add "$file"
            echo -e "${GREEN}✅ Files nearly identical, using our version${NC}"
            ((RESOLVED_COUNT++))
            return 0
        fi

        # For QA/template files where both versions exist,
        # if they're both complete, use ours (newer)
        if [[ "$file" == *.md ]] && [[ "$file" == *"QA"* || "$file" == *"TEMPLATE"* ]]; then
            # Check if both are complete (have closing sections)
            if grep -q "^##" /tmp/ours.txt && grep -q "^##" /tmp/theirs.txt; then
                git checkout --ours "$file"
                git add "$file"
                echo -e "${GREEN}✅ Both versions complete, using our version${NC}"
                ((RESOLVED_COUNT++))
                return 0
            fi
        fi
    fi

    return 1
}

# Function to resolve config file conflicts
resolve_config_conflict() {
    local file=$1
    echo -e "${YELLOW}⚙️  Resolving config conflict: $file${NC}"

    # For pre-commit hooks and similar configs,  prefer ours if it's additive
    if [[ "$file" == ".husky/pre-commit" || "$file" == ".husky/pre-commit-qa-check.sh" ]]; then
        # Check if our version contains their version (additive change)
        if git show :2:"$file" > /tmp/ours.txt 2>/dev/null && \
           git show :3:"$file" > /tmp/theirs.txt 2>/dev/null; then

            # If our version contains all lines from their version, it's additive
            if grep -F -f /tmp/theirs.txt /tmp/ours.txt > /dev/null 2>&1; then
                git checkout --ours "$file"
                git add "$file"
                echo -e "${GREEN}✅ Our version is additive, using it${NC}"
                ((RESOLVED_COUNT++))
                return 0
            fi
        fi
    fi

    return 1
}

# Function to resolve GitHub template conflicts
resolve_github_template_conflict() {
    local file=$1
    echo -e "${YELLOW}📋 Resolving GitHub template conflict: $file${NC}"

    # For GitHub issue/PR templates that are "both added",
    # if both versions are complete templates, use ours (newer)
    if [[ "$file" == .github/ISSUE_TEMPLATE/* || "$file" == ".github/PULL_REQUEST_TEMPLATE.md" ]]; then
        if git show :2:"$file" > /tmp/ours.txt 2>/dev/null && \
           git show :3:"$file" > /tmp/theirs.txt 2>/dev/null; then

            # Check if both have YAML frontmatter (complete templates)
            if head -1 /tmp/ours.txt | grep -q "^---$" && \
               head -1 /tmp/theirs.txt | grep -q "^---$"; then
                git checkout --ours "$file"
                git add "$file"
                echo -e "${GREEN}✅ Both versions complete, using our version${NC}"
                ((RESOLVED_COUNT++))
                return 0
            fi
        fi
    fi

    return 1
}

# Main resolution loop
while IFS= read -r file; do
    echo ""
    echo "Processing: $file"

    # Skip empty lines
    [ -z "$file" ] && continue

    # Try different resolution strategies
    if resolve_doc_conflict "$file"; then
        continue
    elif resolve_config_conflict "$file"; then
        continue
    elif resolve_github_template_conflict "$file"; then
        continue
    else
        echo -e "${RED}❌ Could not auto-resolve: $file${NC}"
        echo "   Manual resolution required"
        ((FAILED_COUNT++))
    fi
done <<< "$CONFLICTED_FILES"

echo ""
echo "=================================="
echo "Resolution Summary:"
echo -e "${GREEN}✅ Auto-resolved: $RESOLVED_COUNT files${NC}"
echo -e "${RED}❌ Need manual resolution: $FAILED_COUNT files${NC}"
echo ""

if [ $FAILED_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All conflicts resolved! Ready to continue rebase.${NC}"
    echo "Run: git rebase --continue"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some conflicts need manual resolution${NC}"
    echo "Review the files above, resolve them, then run:"
    echo "  git add <resolved-files>"
    echo "  git rebase --continue"
    exit 1
fi
