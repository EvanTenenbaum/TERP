#!/bin/bash
# Fix DigitalOcean Environment Variables
# This script updates the TERP app configuration to match .do/app.yaml

set -e

APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"

echo "🔧 Fixing DigitalOcean Environment Variables for TERP app"
echo "App ID: $APP_ID"
echo ""

# Get current spec
echo "📥 Fetching current app spec..."
doctl apps spec get "$APP_ID" --format json > /tmp/terp-current-spec.json

# Backup current spec
BACKUP_FILE="/tmp/terp-spec-backup-$(date +%Y%m%d-%H%M%S).json"
cp /tmp/terp-current-spec.json "$BACKUP_FILE"
echo "✅ Backed up current spec to: $BACKUP_FILE"

# Extract existing SECRET values
echo "🔍 Extracting existing SECRET values..."
DATABASE_URL_SECRET=$(cat /tmp/terp-current-spec.json | jq -r '.services[0].envs[] | select(.key == "DATABASE_URL" and .type == "SECRET") | .value')
NEXTAUTH_SECRET=$(cat /tmp/terp-current-spec.json | jq -r '.services[0].envs[] | select(.key == "NEXTAUTH_SECRET") | .value')
NEXTAUTH_URL=$(cat /tmp/terp-current-spec.json | jq -r '.services[0].envs[] | select(.key == "NEXTAUTH_URL") | .value')
SENTRY_DSN=$(cat /tmp/terp-current-spec.json | jq -r '.services[0].envs[] | select(.key == "SENTRY_DSN") | .value')
CRON_SECRET=$(cat /tmp/terp-current-spec.json | jq -r '.services[0].envs[] | select(.key == "CRON_SECRET") | .value')
PAPERTRAIL=$(cat /tmp/terp-current-spec.json | jq -r '.services[0].envs[] | select(.key == "PAPERTRAIL_ENDPOINT") | .value')

echo "✅ Extracted existing secrets"

# Update the spec using jq
echo "🔄 Building corrected environment configuration..."

cat /tmp/terp-current-spec.json | jq --arg db_url "$DATABASE_URL_SECRET" \
  --arg nextauth_secret "$NEXTAUTH_SECRET" \
  --arg nextauth_url "$NEXTAUTH_URL" \
  --arg sentry "$SENTRY_DSN" \
  --arg cron "$CRON_SECRET" \
  --arg papertrail "$PAPERTRAIL" '
  .services[0].envs = [
    # Basic config
    {"key": "NODE_ENV", "value": "production", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    {"key": "RATE_LIMIT_GET", "value": "1000", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    {"key": "ENABLE_RBAC", "value": "true", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    {"key": "ENABLE_QA_CRONS", "value": "true", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    {"key": "UPLOAD_DIR", "value": "/tmp/uploads", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    
    # Vite frontend variables (required for build)
    {"key": "VITE_APP_TITLE", "value": "TERP", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    {"key": "VITE_APP_LOGO", "value": "/logo.png", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    {"key": "VITE_APP_ID", "value": "terp-app", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    
    # Clerk auth
    {"key": "VITE_CLERK_PUBLISHABLE_KEY", "value": "pk_test_Y2xlYXItY2FyZGluYWwtNjMuY2xlcmsuYWNjb3VudHMuZGV2JA", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    {"key": "CLERK_SECRET_KEY", "value": "sk_test_gLGRGGDzMjmxvYMdxTfPuRQQeUMpvbOQkJBKBJCZBD", "scope": "RUN_TIME", "type": "PLAIN"},
    
    # Database - SINGLE ENTRY ONLY (using managed database reference)
    {"key": "DATABASE_URL", "value": "${terp-mysql-db.DATABASE_URL}", "scope": "RUN_AND_BUILD_TIME", "type": "PLAIN"},
    
    # Auth & Security secrets (preserve existing values)
    {"key": "NEXTAUTH_SECRET", "value": $nextauth_secret, "scope": "RUN_TIME", "type": "SECRET"},
    {"key": "NEXTAUTH_URL", "value": $nextauth_url, "scope": "RUN_TIME", "type": "SECRET"},
    
    # Monitoring (preserve existing values)
    {"key": "SENTRY_DSN", "value": $sentry, "scope": "RUN_TIME", "type": "SECRET"},
    {"key": "PAPERTRAIL_ENDPOINT", "value": $papertrail, "scope": "RUN_TIME", "type": "SECRET"},
    
    # Cron (preserve existing value)
    {"key": "CRON_SECRET", "value": $cron, "scope": "RUN_TIME", "type": "SECRET"}
  ]
' > /tmp/terp-updated-spec.json

echo "✅ Spec updated"
echo ""
echo "📋 Changes made:"
echo "  ✅ Removed duplicate DATABASE_URL entries"
echo "  ✅ Using managed database reference: \${terp-mysql-db.DATABASE_URL}"
echo "  ✅ Added missing Vite variables (VITE_APP_TITLE, VITE_APP_LOGO, VITE_APP_ID)"
echo "  ✅ Added missing Clerk variables (VITE_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)"
echo "  ✅ Removed unexpected JWT_SECRET"
echo "  ✅ Preserved all existing SECRET values"
echo ""
echo "📋 Final environment variables:"
cat /tmp/terp-updated-spec.json | jq -r '.services[0].envs[] | "\(.key): \(.scope) (\(.type))"'
echo ""

read -p "❓ Apply this configuration? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Applying configuration..."
    doctl apps update "$APP_ID" --spec /tmp/terp-updated-spec.json
    echo "✅ Configuration applied!"
    echo ""
    echo "⏳ This will trigger a new deployment. Monitor with:"
    echo "   ./scripts/watch-deploy.sh"
    echo ""
    echo "📝 Backup saved at: $BACKUP_FILE"
else
    echo "❌ Cancelled. No changes made."
    echo "📝 Review the updated spec at: /tmp/terp-updated-spec.json"
    echo "📝 Backup saved at: $BACKUP_FILE"
fi
