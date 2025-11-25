#!/bin/sh
# TERP Commander - Robust Startup Script
# Implements defensive programming with comprehensive validation

set -u  # Fail on undefined variables (not set -e, we handle errors explicitly)

echo "🚀 TERP Commander - Startup Sequence"
echo "======================================"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ============================================================================
# PHASE 1: Environment Variable Validation
# ============================================================================
echo "📋 Phase 1: Validating Environment Variables..."

REQUIRED_VARS="GITHUB_TOKEN SLACK_BOT_TOKEN SLACK_APP_TOKEN GEMINI_API_KEY"
MISSING_VARS=""

for VAR in $REQUIRED_VARS; do
    eval VALUE=\$$VAR
    if [ -z "$VALUE" ]; then
        MISSING_VARS="$MISSING_VARS $VAR"
        echo "  ❌ $VAR is missing or empty"
    else
        # Log presence (not value) for security
        LENGTH=${#VALUE}
        echo "  ✅ $VAR is set (length: $LENGTH)"
    fi
done

if [ -n "$MISSING_VARS" ]; then
    echo ""
    echo "❌ CRITICAL: Missing required environment variables:$MISSING_VARS"
    echo "   Please set these in DigitalOcean App Platform settings"
    exit 1
fi

echo "✅ All required environment variables are present"
echo ""

# ============================================================================
# PHASE 2: Configuration
# ============================================================================
REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/EvanTenenbaum/TERP.git"
WORK_DIR="/app/repo"

echo "📦 Phase 2: Repository Setup"
echo "  Repository: EvanTenenbaum/TERP"
echo "  Working Directory: $WORK_DIR"
echo ""

# ============================================================================
# PHASE 3: Git Clone/Update
# ============================================================================
echo "📥 Phase 3: Cloning/Updating Repository..."

if [ -d "$WORK_DIR/.git" ]; then
    echo "  Repository exists, pulling latest changes..."
    cd "$WORK_DIR" || {
        echo "  ❌ Failed to change to $WORK_DIR"
        exit 1
    }
    
    # Try to pull, but don't fail if it doesn't work
    if git pull origin main 2>&1; then
        echo "  ✅ Successfully pulled latest changes"
    else
        echo "  ⚠️  Pull failed, re-cloning..."
        cd /app || exit 1
        rm -rf "$WORK_DIR"
        if git clone "$REPO_URL" "$WORK_DIR" 2>&1; then
            echo "  ✅ Successfully re-cloned repository"
        else
            echo "  ❌ CRITICAL: Failed to clone repository"
            echo "     Check GITHUB_TOKEN and network connectivity"
            exit 1
        fi
    fi
else
    echo "  Cloning repository (first time)..."
    if git clone "$REPO_URL" "$WORK_DIR" 2>&1; then
        echo "  ✅ Successfully cloned repository"
    else
        echo "  ❌ CRITICAL: Failed to clone repository"
        echo "     Check GITHUB_TOKEN and network connectivity"
        exit 1
    fi
fi

# Validate git repo
cd "$WORK_DIR" || {
    echo "  ❌ Failed to change to $WORK_DIR after clone"
    exit 1
}

if [ ! -d ".git" ]; then
    echo "  ❌ CRITICAL: .git directory not found after clone"
    exit 1
fi

echo "  ✅ Repository is valid and ready"
echo ""

# ============================================================================
# PHASE 4: Git Configuration
# ============================================================================
echo "🔧 Phase 4: Configuring Git..."

if git config user.email "bot@terp.ai" 2>&1 && \
   git config user.name "TERP Commander" 2>&1; then
    echo "  ✅ Git configured successfully"
else
    echo "  ⚠️  Git configuration warning (non-fatal)"
fi
echo ""

# ============================================================================
# PHASE 5: Dependency Installation
# ============================================================================
echo "📦 Phase 5: Installing Dependencies..."

# Verify package.json exists
if [ ! -f "package.json" ]; then
    echo "  ❌ CRITICAL: package.json not found in repository"
    exit 1
fi

# Enable corepack
if corepack enable 2>&1 && corepack prepare pnpm@latest --activate 2>&1; then
    echo "  ✅ pnpm enabled via corepack"
else
    echo "  ❌ CRITICAL: Failed to enable pnpm"
    exit 1
fi

# Install dependencies
echo "  Running: pnpm install --no-frozen-lockfile..."
if pnpm install --no-frozen-lockfile 2>&1; then
    echo "  ✅ Dependencies installed successfully"
else
    echo "  ❌ CRITICAL: Failed to install dependencies"
    echo "     Check pnpm-lock.yaml and package.json"
    exit 1
fi

# Validate critical dependencies
if [ ! -d "node_modules" ]; then
    echo "  ❌ CRITICAL: node_modules directory not found after install"
    exit 1
fi

# Check for critical packages
CRITICAL_PACKAGES="tsx @slack/bolt simple-git"
for PKG in $CRITICAL_PACKAGES; do
    if [ -d "node_modules/$PKG" ] || [ -d "node_modules/@slack/bolt" ]; then
        echo "  ✅ $PKG is installed"
    else
        echo "  ⚠️  Warning: $PKG not found (may be in subdirectory)"
    fi
done

echo ""

# ============================================================================
# PHASE 6: Bot Startup
# ============================================================================
echo "✅ Phase 6: Starting TERP Commander..."
echo "  Working Directory: $(pwd)"
echo "  Node Version: $(node --version)"
echo "  pnpm Version: $(pnpm --version)"
echo ""

# Verify bot script exists
if [ ! -f "scripts/slack-bot.ts" ]; then
    echo "  ❌ CRITICAL: scripts/slack-bot.ts not found"
    exit 1
fi

echo "  🚀 Launching bot..."
echo "  =========================================="
echo ""

# Start the bot (exec replaces shell process)
exec npx tsx scripts/slack-bot.ts
