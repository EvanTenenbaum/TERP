#!/bin/bash

# Quick script to add secrets to GitHub Secrets using GitHub CLI
# Requires: gh CLI installed and authenticated

echo "🔐 Adding secrets to GitHub Secrets..."
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Installing..."
    echo "   Visit: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Extract secrets from deployment_details.json
if [ ! -f "deployment_details.json" ]; then
    echo "❌ deployment_details.json not found"
    exit 1
fi

# Extract secrets from local deployment files
# This script reads from current_spec.yaml and deployment_details.json
# These files should NOT be committed to git (they're in .gitignore)

echo "📋 Extracting secrets from local deployment files..."
echo ""

# Function to extract value from YAML
extract_yaml_value() {
  local key="$1"
  local file="$2"
  grep -A 1 "- key: $key" "$file" | grep "value:" | sed 's/.*value: *\(.*\)/\1/' | sed 's/^"\(.*\)"$/\1/'
}

# Function to extract value from JSON
extract_json_value() {
  local key="$1"
  local file="$2"
  jq -r ".[0].spec.services[0].envs[]? | select(.key==\"$key\") | .value" "$file" 2>/dev/null || \
  jq -r ".[0].spec.workers[0].envs[]? | select(.key==\"$key\") | .value" "$file" 2>/dev/null
}

# Service secrets
echo "📋 Adding service secrets..."
JWT_SECRET=$(extract_yaml_value "JWT_SECRET" "current_spec.yaml" || extract_json_value "JWT_SECRET" "deployment_details.json")
if [ -n "$JWT_SECRET" ]; then gh secret set JWT_SECRET --body "$JWT_SECRET" --repo EvanTenenbaum/TERP; fi

CLERK_SECRET=$(extract_yaml_value "CLERK_SECRET_KEY" "current_spec.yaml" || extract_json_value "CLERK_SECRET_KEY" "deployment_details.json")
if [ -n "$CLERK_SECRET" ]; then gh secret set CLERK_SECRET_KEY --body "$CLERK_SECRET" --repo EvanTenenbaum/TERP; fi

CLERK_PUB=$(extract_yaml_value "CLERK_PUBLISHABLE_KEY" "current_spec.yaml" || extract_json_value "CLERK_PUBLISHABLE_KEY" "deployment_details.json")
if [ -n "$CLERK_PUB" ]; then gh secret set CLERK_PUBLISHABLE_KEY --body "$CLERK_PUB" --repo EvanTenenbaum/TERP; fi

DB_URL=$(extract_yaml_value "DATABASE_URL" "current_spec.yaml" || extract_json_value "DATABASE_URL" "deployment_details.json")
if [ -n "$DB_URL" ]; then gh secret set DATABASE_URL --body "$DB_URL" --repo EvanTenenbaum/TERP; fi

WEBHOOK_SECRET=$(extract_yaml_value "GITHUB_WEBHOOK_SECRET" "current_spec.yaml" || extract_json_value "GITHUB_WEBHOOK_SECRET" "deployment_details.json")
if [ -n "$WEBHOOK_SECRET" ]; then gh secret set GITHUB_WEBHOOK_SECRET --body "$WEBHOOK_SECRET" --repo EvanTenenbaum/TERP; fi

# Monitoring secrets
echo "📋 Adding monitoring secrets..."
SOLARWINDS=$(extract_yaml_value "SOLARWINDS_TOKEN" "current_spec.yaml" || extract_json_value "SOLARWINDS_TOKEN" "deployment_details.json")
if [ -n "$SOLARWINDS" ]; then gh secret set SOLARWINDS_TOKEN --body "$SOLARWINDS" --repo EvanTenenbaum/TERP; fi

SENTRY=$(extract_yaml_value "SENTRY_DSN" "current_spec.yaml" || extract_json_value "SENTRY_DSN" "deployment_details.json")
if [ -n "$SENTRY" ]; then gh secret set SENTRY_DSN --body "$SENTRY" --repo EvanTenenbaum/TERP; fi

VITE_SENTRY=$(extract_yaml_value "VITE_SENTRY_DSN" "current_spec.yaml" || extract_json_value "VITE_SENTRY_DSN" "deployment_details.json")
if [ -n "$VITE_SENTRY" ]; then gh secret set VITE_SENTRY_DSN --body "$VITE_SENTRY" --repo EvanTenenbaum/TERP; fi

# Worker secrets (from JSON worker section)
echo "📋 Adding worker secrets..."
if [ -f "deployment_details.json" ]; then
  SLACK_BOT=$(jq -r '.[0].spec.workers[0].envs[]? | select(.key=="SLACK_BOT_TOKEN") | .value' deployment_details.json 2>/dev/null)
  if [ -n "$SLACK_BOT" ] && [ "$SLACK_BOT" != "null" ]; then
    gh secret set SLACK_BOT_TOKEN --body "$SLACK_BOT" --repo EvanTenenbaum/TERP
  fi
  
  SLACK_APP=$(jq -r '.[0].spec.workers[0].envs[]? | select(.key=="SLACK_APP_TOKEN") | .value' deployment_details.json 2>/dev/null)
  if [ -n "$SLACK_APP" ] && [ "$SLACK_APP" != "null" ]; then
    gh secret set SLACK_APP_TOKEN --body "$SLACK_APP" --repo EvanTenenbaum/TERP
  fi
  
  GH_TOKEN=$(jq -r '.[0].spec.workers[0].envs[]? | select(.key=="GITHUB_TOKEN") | .value' deployment_details.json 2>/dev/null)
  if [ -n "$GH_TOKEN" ] && [ "$GH_TOKEN" != "null" ]; then
    gh secret set GITHUB_TOKEN --body "$GH_TOKEN" --repo EvanTenenbaum/TERP
  fi
  
  GEMINI=$(jq -r '.[0].spec.workers[0].envs[]? | select(.key=="GEMINI_API_KEY") | .value' deployment_details.json 2>/dev/null)
  if [ -n "$GEMINI" ] && [ "$GEMINI" != "null" ]; then
    gh secret set GEMINI_API_KEY --body "$GEMINI" --repo EvanTenenbaum/TERP
  fi
  
  DO_TOKEN=$(jq -r '.[0].spec.workers[0].envs[]? | select(.key=="DIGITALOCEAN_ACCESS_TOKEN") | .value' deployment_details.json 2>/dev/null)
  if [ -n "$DO_TOKEN" ] && [ "$DO_TOKEN" != "null" ]; then
    gh secret set DIGITALOCEAN_TOKEN --body "$DO_TOKEN" --repo EvanTenenbaum/TERP
    gh secret set DIGITALOCEAN_ACCESS_TOKEN --body "$DO_TOKEN" --repo EvanTenenbaum/TERP
  fi
fi

echo ""
echo "✅ All secrets added to GitHub Secrets!"
echo ""
echo "📋 List of secrets added:"
echo "   Service secrets: JWT_SECRET, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, DATABASE_URL, GITHUB_WEBHOOK_SECRET"
echo "   Monitoring: SOLARWINDS_TOKEN, SENTRY_DSN, VITE_SENTRY_DSN"
echo "   Worker secrets: SLACK_BOT_TOKEN, SLACK_APP_TOKEN, GITHUB_TOKEN, GEMINI_API_KEY, DIGITALOCEAN_TOKEN"
echo ""
echo "💡 Next steps:"
echo "   1. Verify secrets: gh secret list --repo EvanTenenbaum/TERP"
echo "   2. Sync to DigitalOcean: gh workflow run 'Set Secrets to DigitalOcean'"

