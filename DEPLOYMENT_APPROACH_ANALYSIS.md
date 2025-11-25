# Deployment Approach Analysis: Fundamental Issues & Solutions

**Date:** 2025-11-25  
**Purpose:** Deep analysis of deployment failures and whether we're thinking about this wrong

---

## 🔍 Current Situation

### What We're Trying to Deploy

1. **Main App (`terp-production`):**
   - Next.js web application
   - Uses Heroku buildpack (auto-detects `pnpm-lock.yaml`)
   - Build command: `pnpm install --no-frozen-lockfile && pnpm run build:production`
   - **Problem:** Buildpack runs `pnpm install --frozen-lockfile` BEFORE our build_command

2. **Slack Bot Worker (`terp-commander`):**
   - Simple Node.js worker
   - Listens to Slack messages
   - Runs `scripts/manager.ts` commands
   - Needs: `manager.ts`, `MASTER_ROADMAP.md`, `ROADMAP_AGENT_GUIDE.md`
   - **Current approach:** Clone entire TERP repo at runtime, install all dependencies

---

## 🚨 Root Cause Analysis

### Problem 1: Lockfile Conflict (Main App)

**Issue:** Heroku buildpack auto-runs `pnpm install --frozen-lockfile` before our `build_command`.

**Why it happens:**
- DigitalOcean uses Heroku buildpack for Node.js apps
- Buildpack detects `pnpm-lock.yaml` and runs install automatically
- This happens BEFORE our custom `build_command` executes
- Environment variables (`CI=false`, `PNPM_CONFIG_FROZEN_LOCKFILE=false`) don't override this

**Impact:**
- Build fails if `pnpm-lock.yaml` is out of sync with `package.json`
- This is a **TERP repo issue**, not a deployment issue

**Solution Options:**
1. ✅ **Keep lockfile in sync** (manual, script, or GitHub Action)
2. ❌ **Switch to Docker build** (more complex, loses buildpack benefits)
3. ❌ **Override buildpack** (not possible with current setup)

### Problem 2: Bot Deployment Complexity

**Current Approach:**
- Deploy bot as worker in same DigitalOcean app
- Use Dockerfile that clones entire TERP repo at runtime
- Install all TERP dependencies (thousands of packages)
- Run bot script

**Why this is problematic:**
1. **Lockfile conflicts:** Bot worker shares same app, could conflict with main app
2. **Resource waste:** Bot only needs 5 files, but installs entire TERP dependency tree
3. **Build complexity:** Runtime cloning, dependency installation, error-prone
4. **Deployment coupling:** Bot failures can affect main app visibility

**What the bot actually needs:**
- `scripts/slack-bot.ts` (bot code)
- `scripts/manager.ts` (roadmap manager)
- `docs/roadmaps/MASTER_ROADMAP.md` (roadmap file)
- `docs/ROADMAP_AGENT_GUIDE.md` (guide, referenced by manager.ts)
- Dependencies: `@slack/bolt`, `tsx`, `simple-git`, `commander`, `dotenv`, `@google/generative-ai`, `ora`, `chalk`
- Git access to TERP repo (for manager.ts operations)

---

## 💡 Proposed Solution: Separate Bot Repository

### Architecture

```
terp-commander (separate repo)
├── package.json (minimal: just bot dependencies)
├── Dockerfile (simple: Node.js + git)
├── scripts/
│   ├── slack-bot.ts (bot code)
│   ├── manager.ts (roadmap manager)
│   └── bot-start.sh (clones TERP at runtime)
└── docs/ (copied from TERP)
    ├── roadmaps/MASTER_ROADMAP.md
    └── ROADMAP_AGENT_GUIDE.md
```

### Benefits

1. **No lockfile conflicts:** Separate repo = separate lockfile
2. **Faster builds:** Minimal dependencies (~10 packages vs 1000+)
3. **Simpler deployment:** Standard Dockerfile, no runtime cloning complexity
4. **Independent scaling:** Bot can be deployed/updated without affecting main app
5. **Clear separation:** Bot is a service, not part of TERP app

### How It Works

1. **Build time:**
   - Dockerfile installs Node.js, git, pnpm
   - Copies bot code and minimal dependencies
   - Builds minimal Docker image

2. **Runtime:**
   - `bot-start.sh` clones TERP repo to `/app/terp`
   - Installs only TERP dependencies needed for `manager.ts`
   - Runs bot from `/app` (bot code)
   - `manager.ts` reads roadmap from `/app/terp/docs/roadmaps/MASTER_ROADMAP.md`

### Alternative: Keep in TERP but Simplify

If we keep bot in TERP repo:

1. **Fix lockfile sync** (required for main app anyway)
2. **Simplify bot Dockerfile:**
   - Don't clone at runtime
   - Copy only needed files during build
   - Use multi-stage build to minimize image size

**Trade-off:** Still shares lockfile with main app, but simpler than runtime cloning.

---

## 🎯 Recommended Approach

### Option A: Separate Repository (RECOMMENDED)

**Pros:**
- ✅ Eliminates all lockfile conflicts
- ✅ Faster builds (minimal dependencies)
- ✅ Independent deployment
- ✅ Clear separation of concerns

**Cons:**
- ❌ Need to maintain roadmap files in sync (or clone at runtime)
- ❌ Two repos to manage

**Implementation:**
1. Create `terp-commander` repo
2. Copy bot code + manager.ts
3. Copy roadmap files (or clone at runtime)
4. Deploy as separate DigitalOcean app

### Option B: Fix Lockfile + Simplify Dockerfile

**Pros:**
- ✅ Single repo
- ✅ Simpler than current runtime clone approach

**Cons:**
- ❌ Still shares lockfile with main app
- ❌ More complex than separate repo

**Implementation:**
1. Fix lockfile sync (required anyway)
2. Simplify Dockerfile to copy files at build time
3. Use multi-stage build

---

## 🔧 Immediate Actions

### For Main App (Required Either Way)

1. **Update lockfile:**
   ```bash
   pnpm install
   git add pnpm-lock.yaml
   git commit -m "fix: Sync pnpm-lock.yaml with package.json"
   git push
   ```

2. **Add pre-commit hook** to prevent future lockfile issues

3. **Add GitHub Action** to auto-update lockfile when `package.json` changes

### For Bot (Choose Approach)

**If Option A (Separate Repo):**
1. Create `terp-commander` repository
2. Set up minimal package.json
3. Copy bot code and manager.ts
4. Deploy as separate DigitalOcean app

**If Option B (Keep in TERP):**
1. Simplify Dockerfile (remove runtime cloning)
2. Copy needed files at build time
3. Use multi-stage build

---

## 📊 Comparison

| Aspect | Current | Option A (Separate) | Option B (Simplified) |
|--------|---------|---------------------|----------------------|
| Lockfile conflicts | ❌ Yes | ✅ No | ⚠️ Possible |
| Build time | Slow (runtime clone) | Fast (minimal deps) | Medium |
| Complexity | High | Low | Medium |
| Maintenance | High | Low | Medium |
| Deployment coupling | High | None | Medium |

---

## 🎯 Recommendation

**Separate the bot into its own repository (Option A).**

**Reasoning:**
1. The bot is a **service**, not part of the TERP application
2. It has minimal dependencies and doesn't need the entire TERP codebase
3. Separating eliminates all lockfile conflicts
4. Faster builds and simpler deployment
5. Independent scaling and updates

**Implementation time:** ~30 minutes
- Create repo
- Copy files
- Set up minimal package.json
- Deploy to DigitalOcean

**Long-term benefit:** Cleaner architecture, easier maintenance, no deployment coupling.

---

## ✅ Next Steps

1. **Decide:** Option A (separate repo) or Option B (simplified Dockerfile)
2. **Fix main app lockfile** (required either way)
3. **Implement chosen approach**
4. **Deploy and verify**

---

## 🤔 Questions to Consider

1. **Do we want the bot to be part of TERP or a separate service?**
   - If separate service → Option A
   - If part of TERP → Option B

2. **How often does the roadmap change?**
   - If frequent → Runtime clone makes sense
   - If infrequent → Copy at build time

3. **Do we need the bot to have access to the entire TERP codebase?**
   - Currently: No (only needs roadmap files)
   - Future: Maybe (if bot needs to read code)

---

**Conclusion:** The fundamental issue is that we're trying to deploy a simple service (bot) using the same infrastructure as a complex app (TERP). Separating them would solve most problems and create a cleaner architecture.

