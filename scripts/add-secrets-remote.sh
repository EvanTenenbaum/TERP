#!/bin/bash

# Add secrets to GitHub Secrets from environment variables
# Can be run from anywhere - just set environment variables
# 
# Usage:
#   export JWT_SECRET="your-secret"
#   export CLERK_SECRET_KEY="your-key"
#   # ... set other secrets
#   ./scripts/add-secrets-remote.sh

echo "🔐 Adding secrets to GitHub Secrets from environment variables..."
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found."
    echo "   Install: https://cli.github.com/"
    echo "   Or run from GitHub Actions workflow instead"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub."
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Counter for secrets added
ADDED=0

# Service secrets
echo "📋 Adding service secrets..."

if [ -n "$JWT_SECRET" ]; then
    echo "$JWT_SECRET" | gh secret set JWT_SECRET --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set JWT_SECRET"
    ((ADDED++))
fi

if [ -n "$CLERK_SECRET_KEY" ]; then
    echo "$CLERK_SECRET_KEY" | gh secret set CLERK_SECRET_KEY --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set CLERK_SECRET_KEY"
    ((ADDED++))
fi

if [ -n "$CLERK_PUBLISHABLE_KEY" ]; then
    echo "$CLERK_PUBLISHABLE_KEY" | gh secret set CLERK_PUBLISHABLE_KEY --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set CLERK_PUBLISHABLE_KEY"
    ((ADDED++))
fi

if [ -n "$DATABASE_URL" ]; then
    echo "$DATABASE_URL" | gh secret set DATABASE_URL --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set DATABASE_URL"
    ((ADDED++))
fi

if [ -n "$GITHUB_WEBHOOK_SECRET" ]; then
    echo "$GITHUB_WEBHOOK_SECRET" | gh secret set GITHUB_WEBHOOK_SECRET --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set GITHUB_WEBHOOK_SECRET"
    ((ADDED++))
fi

# Monitoring secrets
echo ""
echo "📋 Adding monitoring secrets..."

if [ -n "$SOLARWINDS_TOKEN" ]; then
    echo "$SOLARWINDS_TOKEN" | gh secret set SOLARWINDS_TOKEN --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set SOLARWINDS_TOKEN"
    ((ADDED++))
fi

if [ -n "$SENTRY_DSN" ]; then
    echo "$SENTRY_DSN" | gh secret set SENTRY_DSN --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set SENTRY_DSN"
    ((ADDED++))
fi

if [ -n "$VITE_SENTRY_DSN" ]; then
    echo "$VITE_SENTRY_DSN" | gh secret set VITE_SENTRY_DSN --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set VITE_SENTRY_DSN"
    ((ADDED++))
fi

# Worker secrets
echo ""
echo "📋 Adding worker secrets..."

if [ -n "$SLACK_BOT_TOKEN" ]; then
    echo "$SLACK_BOT_TOKEN" | gh secret set SLACK_BOT_TOKEN --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set SLACK_BOT_TOKEN"
    ((ADDED++))
fi

if [ -n "$SLACK_APP_TOKEN" ]; then
    echo "$SLACK_APP_TOKEN" | gh secret set SLACK_APP_TOKEN --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set SLACK_APP_TOKEN"
    ((ADDED++))
fi

if [ -n "$GITHUB_TOKEN" ]; then
    echo "$GITHUB_TOKEN" | gh secret set GITHUB_TOKEN --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set GITHUB_TOKEN"
    ((ADDED++))
fi

if [ -n "$GEMINI_API_KEY" ]; then
    echo "$GEMINI_API_KEY" | gh secret set GEMINI_API_KEY --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set GEMINI_API_KEY"
    ((ADDED++))
fi

if [ -n "$DIGITALOCEAN_TOKEN" ]; then
    echo "$DIGITALOCEAN_TOKEN" | gh secret set DIGITALOCEAN_TOKEN --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "$DIGITALOCEAN_TOKEN" | gh secret set DIGITALOCEAN_ACCESS_TOKEN --body-file /dev/stdin --repo EvanTenenbaum/TERP
    echo "✅ Set DIGITALOCEAN_TOKEN and DIGITALOCEAN_ACCESS_TOKEN"
    ((ADDED+=2))
fi

echo ""
echo "=================================================="
echo "✅ Successfully added $ADDED secret(s)"
echo "=================================================="
echo ""
echo "💡 To add more secrets, set environment variables and run again:"
echo "   export SECRET_NAME=\"secret-value\""
echo "   ./scripts/add-secrets-remote.sh"
echo ""
echo "💡 Or use GitHub Actions workflow:"
echo "   gh workflow run \"Add Secrets to GitHub Secrets\""

