#!/bin/bash
# Auto-update GitHub Pages dashboard when dashboard.json changes
# This script should be run after dashboard.json is updated

set -e

echo "🚀 Updating GitHub Pages dashboard..."

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)

# Check if dashboard.json has changes
if ! git diff --quiet HEAD -- product-management/pm-evaluation/dashboard.json 2>/dev/null; then
    echo "⚠️  Warning: dashboard.json has uncommitted changes. Commit them first."
    exit 1
fi

# Fetch latest
git fetch origin

# Switch to gh-pages branch
echo "📦 Switching to gh-pages branch..."
git checkout gh-pages

# Merge latest dashboard from main
echo "🔄 Updating dashboard from main branch..."
git checkout origin/main -- product-management/pm-evaluation/roadmap-dashboard.html
cp product-management/pm-evaluation/roadmap-dashboard.html index.html

# Commit and push
if git diff --quiet HEAD -- index.html; then
    echo "✅ Dashboard already up to date"
else
    git add index.html
    git commit -m "Update dashboard - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    git push origin gh-pages
    echo "✅ GitHub Pages updated successfully!"
    echo "🌐 Live at: https://evantenenbaum.github.io/TERP/"
fi

# Switch back to original branch
git checkout "$CURRENT_BRANCH"

echo "✅ Done!"
