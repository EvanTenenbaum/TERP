# TERP Commander - Separate Repository Implementation Plan

**Date:** 2025-11-25  
**Purpose:** Create a separate repository for the Slack bot to eliminate deployment conflicts

---

## 🎯 Goal

Create a minimal, independent repository for `terp-commander` that:
- Eliminates lockfile conflicts with TERP
- Deploys faster (minimal dependencies)
- Can be updated independently
- Still accesses TERP roadmap files at runtime

---

## 📁 Repository Structure

```
terp-commander/
├── .gitignore
├── README.md
├── package.json          # Minimal dependencies
├── Dockerfile            # Simple Node.js + git
├── .dockerignore
├── scripts/
│   ├── slack-bot.ts      # Bot code (from TERP)
│   ├── manager.ts        # Roadmap manager (from TERP)
│   └── bot-start.sh      # Startup script (clones TERP at runtime)
└── docs/                 # Copied from TERP (or cloned at runtime)
    └── roadmaps/
        └── MASTER_ROADMAP.md
```

---

## 📦 Minimal package.json

```json
{
  "name": "terp-commander",
  "version": "1.0.0",
  "description": "TERP Slack Bot - Roadmap Manager",
  "type": "module",
  "scripts": {
    "start": "tsx scripts/slack-bot.ts",
    "health": "tsx scripts/slack-bot-health-check.ts"
  },
  "dependencies": {
    "@slack/bolt": "^3.17.1",
    "@google/generative-ai": "^0.24.1",
    "simple-git": "^3.30.0",
    "commander": "^14.0.2",
    "dotenv": "^17.2.3",
    "ora": "^9.0.0",
    "chalk": "^5.6.2"
  },
  "devDependencies": {
    "@types/node": "^24.10.0",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3"
  }
}
```

---

## 🐳 Simple Dockerfile

```dockerfile
FROM node:20-slim

# Install git (required for cloning TERP repo)
RUN apt-get update && apt-get install -y --no-install-recommends git curl && \
    rm -rf /var/lib/apt/lists/*

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy bot code
COPY scripts/ ./scripts/
COPY .dockerignore ./

# Make startup script executable
RUN chmod +x scripts/bot-start.sh

# Start the bot
CMD ["/bin/sh", "scripts/bot-start.sh"]
```

---

## 🚀 Startup Script (bot-start.sh)

```bash
#!/bin/sh
set -e

echo "🚀 TERP Commander - Startup"
echo "============================"

# Validate environment variables
REQUIRED_VARS="GITHUB_TOKEN SLACK_BOT_TOKEN SLACK_APP_TOKEN GEMINI_API_KEY"
for VAR in $REQUIRED_VARS; do
    eval VALUE=\$$VAR
    if [ -z "$VALUE" ]; then
        echo "❌ Missing required variable: $VAR"
        exit 1
    fi
done

# Clone TERP repo to access roadmap files
REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/EvanTenenbaum/TERP.git"
TERP_DIR="/app/terp"

if [ ! -d "$TERP_DIR/.git" ]; then
    echo "📦 Cloning TERP repository..."
    git clone "$REPO_URL" "$TERP_DIR"
else
    echo "📥 Updating TERP repository..."
    cd "$TERP_DIR"
    git pull origin main
    cd /app
fi

# Configure git for manager.ts operations
cd "$TERP_DIR"
git config user.email "bot@terp.ai"
git config user.name "TERP Commander"

# Install TERP dependencies (needed for manager.ts)
echo "📥 Installing TERP dependencies..."
corepack enable
corepack prepare pnpm@latest --activate
pnpm install --no-frozen-lockfile

# Return to app directory and start bot
cd /app
echo "✅ Starting TERP Commander..."
exec npx tsx scripts/slack-bot.ts
```

---

## 🔧 DigitalOcean App Spec

```yaml
name: terp-commander
region: nyc

services:
  - name: terp-commander
    github:
      repo: EvanTenenbaum/terp-commander
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile
    instance_count: 1
    instance_size_slug: apps-s-1vcpu-0.5gb
    envs:
      - key: SLACK_BOT_TOKEN
        value: ${SLACK_BOT_TOKEN}
        scope: RUN_TIME
        type: SECRET
      - key: SLACK_APP_TOKEN
        value: ${SLACK_APP_TOKEN}
        scope: RUN_TIME
        type: SECRET
      - key: GITHUB_TOKEN
        value: ${GITHUB_TOKEN}
        scope: RUN_TIME
        type: SECRET
      - key: GEMINI_API_KEY
        value: ${GEMINI_API_KEY}
        scope: RUN_TIME
        type: SECRET
      - key: DIGITALOCEAN_ACCESS_TOKEN
        value: ${DIGITALOCEAN_ACCESS_TOKEN}
        scope: RUN_TIME
        type: SECRET
```

---

## 📝 Implementation Steps

### Step 1: Create GitHub Repository

1. Go to GitHub
2. Create new repository: `terp-commander`
3. Make it private (contains secrets in env vars)
4. Don't initialize with README (we'll add our own)

### Step 2: Copy Files from TERP

```bash
# In TERP repo
cd /path/to/TERP

# Create terp-commander directory structure
mkdir -p ../terp-commander/scripts
mkdir -p ../terp-commander/docs/roadmaps

# Copy bot files
cp scripts/slack-bot.ts ../terp-commander/scripts/
cp scripts/manager.ts ../terp-commander/scripts/
cp scripts/bot-start.sh ../terp-commander/scripts/
cp docs/roadmaps/MASTER_ROADMAP.md ../terp-commander/docs/roadmaps/

# Create minimal package.json (see above)
# Create Dockerfile (see above)
# Create .gitignore
# Create README.md
```

### Step 3: Initialize Repository

```bash
cd ../terp-commander
git init
git add .
git commit -m "Initial commit: TERP Commander bot"
git branch -M main
git remote add origin https://github.com/EvanTenenbaum/terp-commander.git
git push -u origin main
```

### Step 4: Deploy to DigitalOcean

```bash
# Create app spec file
cat > app.yaml <<EOF
# (see DigitalOcean App Spec above)
EOF

# Create app
doctl apps create --spec app.yaml

# Or update existing app
doctl apps update [APP_ID] --spec app.yaml
```

### Step 5: Remove Bot from TERP App

```bash
# In TERP repo, update .do/app.yaml
# Remove the workers section for terp-commander
```

---

## ✅ Benefits

1. **No lockfile conflicts:** Separate repo = separate lockfile
2. **Faster builds:** ~10 packages vs 1000+
3. **Independent deployment:** Bot updates don't affect TERP app
4. **Simpler debugging:** Clear separation of concerns
5. **Easier scaling:** Can scale bot independently

---

## 🔄 Keeping Roadmap in Sync

**Option 1: Runtime Clone (Current)**
- Bot clones TERP repo at startup
- Always has latest roadmap
- Slightly slower startup (~10-20 seconds)

**Option 2: Periodic Sync**
- Bot pulls TERP repo every N minutes
- Faster startup
- May have stale data briefly

**Option 3: Webhook Updates**
- TERP repo sends webhook when roadmap changes
- Bot pulls immediately
- Most complex but most responsive

**Recommendation:** Start with Option 1 (runtime clone), optimize later if needed.

---

## 🎯 Next Actions

1. ✅ Analysis complete
2. ⏳ Create GitHub repository
3. ⏳ Copy files and set up structure
4. ⏳ Deploy to DigitalOcean
5. ⏳ Remove bot from TERP app
6. ⏳ Test and verify

---

**Estimated Time:** 30-45 minutes  
**Complexity:** Low  
**Risk:** Low (can keep TERP bot as backup during transition)

