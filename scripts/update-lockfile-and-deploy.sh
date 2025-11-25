#!/bin/bash
# Update pnpm-lock.yaml and deploy
# This script syncs the lockfile with package.json and pushes the fix

set -e

echo "🔧 Updating pnpm-lock.yaml to match package.json..."
echo ""

# Ensure we're in the repo root
cd "$(dirname "$0")/.."

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed"
    echo "   Install with: npm install -g pnpm"
    exit 1
fi

# Update lockfile
echo "Running: pnpm install..."
pnpm install

# Check if lockfile changed
if git diff --quiet pnpm-lock.yaml; then
    echo "✅ Lockfile is already in sync"
else
    echo "✅ Lockfile updated"
    echo ""
    echo "Committing updated lockfile..."
    git add pnpm-lock.yaml
    git commit -m "fix: Update pnpm-lock.yaml to sync with package.json

This resolves the frozen-lockfile build errors by ensuring
the lockfile matches the current package.json dependencies.

The lockfile was out of sync, causing Heroku buildpack to fail
during automatic 'pnpm install --frozen-lockfile' step."
    
    echo ""
    echo "Pushing to main..."
    git push origin main
    
    echo ""
    echo "✅ Lockfile updated and pushed!"
    echo "   DigitalOcean will automatically start a new deployment"
    echo ""
    echo "Monitor deployment with:"
    echo "   doctl apps list-deployments [APP_ID] --format ID,Phase,Created"
fi

