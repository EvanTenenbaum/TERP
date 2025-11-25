# TERP Deployment Failure - Detailed Analysis for AI Agent

**Date:** 2025-11-24  
**Status:** 🔴 BLOCKED - Deployment failing, lockfile fix workflow issues  
**Priority:** CRITICAL - TERP app cannot deploy

---

## 🎯 PRIMARY OBJECTIVE

**Goal:** Fix TERP DigitalOcean app deployment so it becomes `ACTIVE` instead of `ERROR`.

**Current State:** TERP app deployment fails with `ERR_PNPM_OUTDATED_LOCKFILE` error.

---

## 🔴 THE CORE PROBLEM

### Error Message
```
ERR_PNPM_OUTDATED_LOCKFILE
Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json
```

### Root Cause Analysis

1. **DigitalOcean uses Heroku buildpack** (not Nixpacks, despite `nixpacks.toml` existing)
2. **Heroku buildpack behavior:**
   - Automatically runs `pnpm install --frozen-lockfile` BEFORE our custom `build_command`
   - This happens in CI mode (detected automatically)
   - Cannot be overridden by `build_command`, `nixpacks.toml`, or environment variables
3. **The lockfile is out of sync:**
   - `pnpm-lock.yaml` does not match `package.json`
   - This happened because dependencies were added/modified without updating lockfile
   - Local development may have used `--no-frozen-lockfile` flag

### Why Previous Fixes Failed

**Attempt 1: Modify build_command**
- Changed to: `pnpm install --no-frozen-lockfile && pnpm run build:production`
- **Result:** FAILED - Buildpack runs its own install BEFORE build_command

**Attempt 2: Use nixpacks.toml**
- Added `cmds` for `phases.install` with `--no-frozen-lockfile`
- **Result:** FAILED - DigitalOcean doesn't use Nixpacks, uses Heroku buildpack

**Attempt 3: Environment variables**
- Added `CI: "false"` and `PNPM_CONFIG_FROZEN_LOCKFILE: "false"` with `BUILD_TIME` scope
- **Result:** FAILED - Buildpack still detects CI environment and enforces frozen lockfile

**Attempt 4: GitHub Actions workflow**
- Created `fix-lockfile-now.yml` workflow to update lockfile and create PR
- **Result:** UNKNOWN/FAILED - Workflow triggered but status unclear

---

## 📋 CURRENT STATE

### DigitalOcean App Configuration

**File:** `.do/app.yaml`

```yaml
name: TERP
region: nyc

services:
  - name: terp-production
    github:
      repo: EvanTenenbaum/TERP
      branch: main
      deploy_on_push: true
    build_command: pnpm install --no-frozen-lockfile && pnpm run build:production
    run_command: pnpm run start:production
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: CI
        value: "false"
        scope: BUILD_TIME
      - key: PNPM_CONFIG_FROZEN_LOCKFILE
        value: "false"
        scope: BUILD_TIME
      # ... other env vars ...
```

**Key Points:**
- App ID: `1fd40be5-b9af-4e71-ab1d-3af0864a7da4` (from previous commands)
- Repository: `EvanTenenbaum/TERP`
- Branch: `main`
- Build system: Heroku buildpack (auto-detected, not configurable)

### GitHub Repository State

**Branch:** `main` (production branch)
**Current Issue:** `pnpm-lock.yaml` is out of sync with `package.json`

**Workflow Files:**
- `.github/workflows/fix-lockfile-now.yml` - Manual trigger to fix lockfile
- `.github/workflows/sync-lockfile.yml` - Auto-sync on package.json changes (on branch `fix-lockfile-workflows-clean`, not merged)
- `.github/workflows/update-lockfile.yml` - Old workflow (may be redundant)

**Branch Status:**
- `main` - Production branch (has outdated lockfile)
- `fix-lockfile-workflows-clean` - Contains workflow fixes (not merged to main)

### Workflow Attempt Status

**Workflow Run:** https://github.com/EvanTenenbaum/TERP/actions/runs/19659972795
**Workflow:** `fix-lockfile-now.yml`
**Trigger:** Manual dispatch via GitHub API
**Status:** UNKNOWN - May be queued, running, or failed

**What the workflow should do:**
1. Checkout repository
2. Setup Node.js 20 and pnpm
3. Run `pnpm install --lockfile-only` to update lockfile
4. Check if lockfile changed
5. If changed, create PR with updated lockfile
6. PR branch: `fix-lockfile-sync`

**Potential Issues:**
- Workflow may be stuck in queue (many workflows queued)
- Workflow may have failed (need to check logs)
- PR may not have been created (need to verify)
- Branch protection may prevent PR merge

---

## 🛠️ ATTEMPTED SOLUTIONS (Detailed)

### Solution 1: Direct Lockfile Update (BLOCKED)

**Approach:** Update `pnpm-lock.yaml` locally and push to main

**Why it failed:**
- Local environment doesn't have `pnpm` installed
- User requirement: "work from anywhere, not rely on anything running on my local system"
- Cannot run `pnpm install` locally

**Command that would work (if pnpm was available):**
```bash
cd /Users/evan/spec-erp-docker/TERP/TERP
pnpm install --lockfile-only
git add pnpm-lock.yaml
git commit -m "fix: Sync pnpm-lock.yaml with package.json"
git push origin main
```

### Solution 2: GitHub Actions Workflow (IN PROGRESS/FAILED)

**Approach:** Use GitHub Actions to update lockfile in CI environment

**Workflow File:** `.github/workflows/fix-lockfile-now.yml`

**Workflow Steps:**
1. Checkout repo with full history
2. Setup Node.js 20 with pnpm cache
3. Install pnpm
4. Run `pnpm install --lockfile-only`
5. Check if lockfile changed
6. If changed, create PR using `peter-evans/create-pull-request@v5`

**Trigger Method:**
```bash
curl -H "Authorization: token YOUR_GITHUB_TOKEN_HERE" \
  -X POST "https://api.github.com/repos/EvanTenenbaum/TERP/actions/workflows/fix-lockfile-now.yml/dispatches" \
  -d '{"ref":"main"}'
```

**Current Status:**
- Workflow was triggered successfully (HTTP 204 response)
- Workflow run ID: `19659972795`
- Status check shows "queued" but may have progressed or failed
- Need to verify if PR was created

**Potential Issues:**
1. **Workflow queued behind many others** - May take long time
2. **Workflow failed** - Need to check logs for errors
3. **PR creation failed** - `peter-evans/create-pull-request` may have issues
4. **Branch protection** - PR may be created but cannot be auto-merged
5. **Token permissions** - `GITHUB_TOKEN` may not have required scopes

### Solution 3: Alternative Workflow Approach (NOT ATTEMPTED)

**Approach:** Create workflow that pushes directly to main (bypassing PR)

**Why not attempted:**
- Branch protection likely prevents direct pushes
- Safer to use PR approach
- But if PR approach fails, this might be necessary

**Workflow would need:**
- Personal Access Token (PAT) with `repo` scope
- Direct push to main branch
- Bypass branch protection (if possible)

---

## 🔍 WHAT NEEDS TO BE INVESTIGATED

### 1. Check Workflow Status
```bash
# Get workflow run details
curl -H "Authorization: token YOUR_GITHUB_TOKEN_HERE" \
  "https://api.github.com/repos/EvanTenenbaum/TERP/actions/runs/19659972795"

# Check workflow logs
curl -H "Authorization: token YOUR_GITHUB_TOKEN_HERE" \
  "https://api.github.com/repos/EvanTenenbaum/TERP/actions/runs/19659972795/logs"
```

### 2. Check if PR Was Created
```bash
# List recent PRs
curl -H "Authorization: token YOUR_GITHUB_TOKEN_HERE" \
  "https://api.github.com/repos/EvanTenenbaum/TERP/pulls?state=open&head=fix-lockfile-sync"
```

### 3. Check DigitalOcean Deployment Status
```bash
TERP_APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
doctl apps get $TERP_APP_ID --format ActiveDeployment.Phase
doctl apps list-deployments $TERP_APP_ID --format ID,Phase,Created,Updated --no-header | head -1
```

### 4. Verify Lockfile State
```bash
# Check if lockfile exists and is recent
cd /Users/evan/spec-erp-docker/TERP/TERP
ls -lh pnpm-lock.yaml
git log -1 --format="%ai %s" -- pnpm-lock.yaml
```

---

## 🎯 RECOMMENDED SOLUTION PATH

### Option A: Fix Workflow and Retry (PREFERRED)

1. **Check workflow status** - Determine if it failed or is still running
2. **If failed:**
   - Read workflow logs to identify error
   - Fix workflow file if needed
   - Retry workflow dispatch
3. **If succeeded but no PR:**
   - Check if lockfile was actually updated
   - Manually create PR if needed
   - Or push directly if branch protection allows
4. **If PR exists:**
   - Merge PR immediately (it's safe - just lockfile sync)
   - Monitor TERP deployment until ACTIVE

### Option B: Direct Lockfile Update via Alternative Method

1. **Use GitHub Codespaces or similar:**
   - Create temporary environment with pnpm
   - Update lockfile
   - Commit and push

2. **Use Docker container:**
   ```bash
   docker run -it --rm -v $(pwd):/workspace -w /workspace node:20 bash
   corepack enable && corepack prepare pnpm@latest --activate
   pnpm install --lockfile-only
   exit
   git add pnpm-lock.yaml && git commit -m "fix: Sync lockfile" && git push
   ```

3. **Use GitHub API to create file:**
   - Generate lockfile content (complex, not recommended)

### Option C: Temporarily Disable Frozen Lockfile (NOT RECOMMENDED)

**This is not possible** - Heroku buildpack enforces it in CI mode and cannot be disabled.

---

## 📝 FILES TO REVIEW

1. **`.do/app.yaml`** - DigitalOcean app configuration
2. **`.github/workflows/fix-lockfile-now.yml`** - Workflow that should fix lockfile
3. **`package.json`** - Dependencies that need lockfile sync
4. **`pnpm-lock.yaml`** - Current lockfile (out of sync)
5. **`.github/workflows/sync-lockfile.yml`** - Future prevention workflow (on branch, not merged)

---

## 🔑 KEY CONSTRAINTS

1. **Cannot use local pnpm** - User requirement: "work from anywhere"
2. **Heroku buildpack cannot be disabled** - It's automatic in DigitalOcean
3. **Frozen lockfile is enforced** - Cannot bypass in CI mode
4. **Branch protection may exist** - May prevent direct pushes to main
5. **Many workflows queued** - May delay workflow execution

---

## 🚨 CRITICAL INFORMATION FOR NEXT AGENT

**GitHub Token:** `[REDACTED - Check environment or previous context]`  
**TERP App ID:** `1fd40be5-b9af-4e71-ab1d-3af0864a7da4`  
**Repository:** `EvanTenenbaum/TERP`  
**Branch:** `main`  
**Workflow Run ID:** `19659972795`  
**Workflow File:** `.github/workflows/fix-lockfile-now.yml`

**Immediate Actions:**
1. Check workflow run `19659972795` status and logs
2. Verify if PR was created (branch: `fix-lockfile-sync`)
3. If PR exists, merge it
4. If workflow failed, identify error and fix
5. Monitor TERP deployment until ACTIVE

**Success Criteria:**
- `pnpm-lock.yaml` is in sync with `package.json`
- TERP DigitalOcean app deployment shows `ACTIVE` phase
- No more `ERR_PNPM_OUTDATED_LOCKFILE` errors

---

## 📚 ADDITIONAL CONTEXT

**Previous Work:**
- Created separate `terp-commander` bot repository (completed)
- Fixed workflow triggers to prevent unnecessary runs (completed)
- Created lockfile sync workflows for future prevention (on branch, not merged)

**Related Files:**
- `FIX_TERP_DEPLOYMENT.md` - Original fix instructions
- `DEPLOYMENT_FIX_IN_PROGRESS.md` - Workflow tracking
- `BULK_CANCEL_WORKFLOWS.md` - Workflow queue management

**User Requirements:**
- Must work from anywhere (no local dependencies)
- Autonomous execution preferred
- TERP deployment is highest priority
- Bot deployment can wait if needed

---

**END OF ANALYSIS**

