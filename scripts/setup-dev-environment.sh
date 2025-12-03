#!/bin/bash

# TERP Development Environment Setup Script
# Creates a separate development app on DigitalOcean

set -e

echo "🚀 TERP Development Environment Setup"
echo "======================================"
echo ""

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ Error: doctl is not installed"
    echo "Install: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if authenticated
if ! doctl auth list &> /dev/null; then
    echo "❌ Error: Not authenticated with DigitalOcean"
    echo "Run: doctl auth init"
    exit 1
fi

echo "✅ Prerequisites met"
echo ""

# Get production app ID
echo "📋 Step 1: Finding production app..."
PROD_APP_ID=$(doctl apps list --format ID,Name --no-header | grep terp-app | awk '{print $1}')

if [ -z "$PROD_APP_ID" ]; then
    echo "❌ Error: Could not find production app"
    echo "Please set PROD_APP_ID manually"
    exit 1
fi

echo "   Production App ID: $PROD_APP_ID"
echo ""

# Export production spec
echo "📋 Step 2: Exporting production app spec..."
doctl apps spec get $PROD_APP_ID > .do/app-production.yaml
echo "   Saved to .do/app-production.yaml"
echo ""

# Create development spec
echo "📋 Step 3: Creating development app spec..."
cat > .do/app-development.yaml << 'EOF'
name: terp-dev-app
region: nyc

services:
- name: web
  github:
    repo: REPLACE_WITH_YOUR_REPO
    branch: develop
    deploy_on_push: true
  
  # Smaller instance for dev (cost savings)
  instance_size_slug: basic-xs
  instance_count: 1
  
  http_port: 3000
  
  routes:
  - path: /
  
  health_check:
    http_path: /health
    initial_delay_seconds: 60
    period_seconds: 10
    timeout_seconds: 5
    success_threshold: 1
    failure_threshold: 3
  
  envs:
  - key: NODE_ENV
    value: "development"
  - key: DATABASE_URL
    scope: SECRET
    type: SECRET
    value: "REPLACE_WITH_DEV_DATABASE_URL"
  - key: CLERK_SECRET_KEY
    scope: SECRET
    type: SECRET
    value: "REPLACE_WITH_TEST_KEY"
  - key: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    value: "REPLACE_WITH_TEST_KEY"
  
  build_command: pnpm install && pnpm build
  run_command: pnpm start
  
  source_dir: /
EOF

echo "   Created .do/app-development.yaml"
echo "   ⚠️  You need to edit this file and replace:"
echo "      - REPLACE_WITH_YOUR_REPO"
echo "      - REPLACE_WITH_DEV_DATABASE_URL"
echo "      - REPLACE_WITH_TEST_KEY (Clerk test keys)"
echo ""

# Create develop branch
echo "📋 Step 4: Creating develop branch..."
if git show-ref --verify --quiet refs/heads/develop; then
    echo "   ℹ️  develop branch already exists"
else
    git checkout -b develop
    git push -u origin develop
    echo "   ✅ Created and pushed develop branch"
fi
echo ""

# Create helper scripts
echo "📋 Step 5: Creating helper scripts..."

# Dev status script
cat > scripts/dev-status.sh << 'SCRIPT'
#!/bin/bash

# Load app IDs
source .env.app-ids 2>/dev/null || true

if [ -z "$PROD_APP_ID" ] || [ -z "$DEV_APP_ID" ]; then
    echo "❌ Error: App IDs not configured"
    echo "Run: ./scripts/setup-dev-environment.sh"
    exit 1
fi

echo "=== TERP Environment Status ==="
echo ""

echo "🏭 Production:"
doctl apps get $PROD_APP_ID --format Name,ActiveDeployment.Phase,UpdatedAt
echo "   URL: https://terp-app-b9s35.ondigitalocean.app"
echo ""

echo "🔧 Development:"
doctl apps get $DEV_APP_ID --format Name,ActiveDeployment.Phase,UpdatedAt
DEV_URL=$(doctl apps get $DEV_APP_ID --format DefaultIngress --no-header)
echo "   URL: https://$DEV_URL"
echo ""

echo "📊 Recent Commits:"
echo "   main:    $(git log main -1 --oneline)"
echo "   develop: $(git log develop -1 --oneline)"
SCRIPT

chmod +x scripts/dev-status.sh
echo "   ✅ Created scripts/dev-status.sh"

# Sync env vars script
cat > scripts/sync-env-vars.sh << 'SCRIPT'
#!/bin/bash

ENV=$1

if [ -z "$ENV" ]; then
    echo "Usage: ./scripts/sync-env-vars.sh [production|development]"
    exit 1
fi

# Load app IDs
source .env.app-ids 2>/dev/null || true

if [ "$ENV" = "production" ]; then
    APP_ID=$PROD_APP_ID
    ENV_FILE=.env.production
elif [ "$ENV" = "development" ]; then
    APP_ID=$DEV_APP_ID
    ENV_FILE=.env.development
else
    echo "❌ Error: Environment must be 'production' or 'development'"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    exit 1
fi

echo "🔄 Syncing environment variables to $ENV..."
echo ""

# Read and update each variable
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue
    
    echo "   Setting $key..."
    doctl apps update $APP_ID --env "$key=$value" > /dev/null
done < "$ENV_FILE"

echo ""
echo "✅ Environment variables synced"
echo "   Triggering redeployment..."
doctl apps create-deployment $APP_ID
SCRIPT

chmod +x scripts/sync-env-vars.sh
echo "   ✅ Created scripts/sync-env-vars.sh"

# Deploy to dev script
cat > scripts/deploy-to-dev.sh << 'SCRIPT'
#!/bin/bash

# Quick deploy to development

echo "🚀 Deploying to Development"
echo ""

# Ensure on develop branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "⚠️  Warning: You're on '$CURRENT_BRANCH', not 'develop'"
    read -p "Switch to develop? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout develop
        git pull origin develop
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

# Run checks
echo "🔍 Running checks..."
pnpm typecheck || { echo "❌ Type check failed"; exit 1; }
pnpm lint || { echo "❌ Lint failed"; exit 1; }
pnpm test || { echo "❌ Tests failed"; exit 1; }

echo "✅ All checks passed"
echo ""

# Commit and push
echo "📝 Commit message:"
read -r COMMIT_MSG

git add .
git commit -m "$COMMIT_MSG"
git push origin develop

echo ""
echo "✅ Pushed to develop"
echo "   Deployment will start automatically"
echo ""
echo "Monitor: ./scripts/watch-deploy.sh --dev"
SCRIPT

chmod +x scripts/deploy-to-dev.sh
echo "   ✅ Created scripts/deploy-to-dev.sh"

# Promote to production script
cat > scripts/promote-to-production.sh << 'SCRIPT'
#!/bin/bash

# Promote develop to production

echo "🚀 Promote to Production"
echo "========================"
echo ""

# Verify on develop
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "❌ Error: Must be on develop branch"
    exit 1
fi

# Show what will be promoted
echo "📋 Changes to be promoted:"
git log main..develop --oneline
echo ""

read -p "Promote these changes to production? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

# Merge to main
git checkout main
git pull origin main
git merge develop --no-ff -m "chore: promote develop to production"
git push origin main

echo ""
echo "✅ Promoted to production"
echo "   Deployment will start automatically"
echo ""
echo "Monitor: ./scripts/watch-deploy.sh --prod"

# Return to develop
git checkout develop
SCRIPT

chmod +x scripts/promote-to-production.sh
echo "   ✅ Created scripts/promote-to-production.sh"

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Edit .do/app-development.yaml:"
echo "   - Replace REPLACE_WITH_YOUR_REPO with your GitHub repo"
echo "   - Add your development database URL"
echo "   - Add Clerk test keys"
echo ""
echo "2. Create development database:"
echo "   doctl databases create terp-dev-mysql \\"
echo "     --engine mysql \\"
echo "     --version 8 \\"
echo "     --size db-s-1vcpu-1gb \\"
echo "     --region nyc3"
echo ""
echo "3. Deploy development app:"
echo "   doctl apps create --spec .do/app-development.yaml"
echo ""
echo "4. Save app IDs to .env.app-ids:"
echo "   echo 'PROD_APP_ID=$PROD_APP_ID' > .env.app-ids"
echo "   echo 'DEV_APP_ID=<your-dev-app-id>' >> .env.app-ids"
echo ""
echo "5. Start using new workflow:"
echo "   ./scripts/deploy-to-dev.sh"
echo ""
