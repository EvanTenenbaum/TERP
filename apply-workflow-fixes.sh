#!/bin/bash
# Script to apply workflow file fixes
# Run this in your local TERP directory

set -e

echo "Applying workflow file fixes..."

# Check if we're in the right directory
if [ ! -d ".github/workflows" ]; then
    echo "Error: Not in TERP repository root"
    exit 1
fi

# Apply the patch
if [ -f "workflow-fixes.patch" ]; then
    echo "Applying patch file..."
    git apply workflow-fixes.patch
else
    echo "Error: workflow-fixes.patch not found"
    echo "Please run: git pull origin main"
    exit 1
fi

# Commit the changes
echo "Committing changes..."
git add .github/workflows/*.yml
git commit -m "Fix YAML syntax errors in workflow files

- Fixed multiline template literals in pr.yml
- Fixed multiline template literals in merge.yml
- Fixed multiline commit message in pr-auto-fix.yml

All workflow files now pass YAML validation."

# Push to GitHub
echo "Pushing to GitHub..."
git push origin main

echo "✅ Done! Workflow files fixed and pushed to GitHub."
