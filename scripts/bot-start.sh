#!/bin/sh
set -e

echo "🚀 TERP Commander - Startup Sequence"
echo "======================================"

# Configuration
REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/EvanTenenbaum/TERP.git"
WORK_DIR="/app/repo"

# Step 1: Clone the repository
echo "📦 Cloning repository..."
if [ -d "$WORK_DIR" ]; then
    echo "  Repository exists, pulling latest..."
    cd "$WORK_DIR"
    git pull origin main || {
        echo "  Pull failed, re-cloning..."
        cd /app
        rm -rf "$WORK_DIR"
        git clone "$REPO_URL" "$WORK_DIR"
    }
else
    git clone "$REPO_URL" "$WORK_DIR"
fi

cd "$WORK_DIR"

# Step 2: Configure git
echo "🔧 Configuring git..."
git config user.email "bot@terp.ai"
git config user.name "TERP Commander"

# Step 3: Install dependencies
echo "📥 Installing dependencies..."
corepack enable
corepack prepare pnpm@latest --activate
pnpm install --no-frozen-lockfile

# Step 4: Start the bot
echo "✅ Starting TERP Commander..."
exec npx tsx scripts/slack-bot.ts

