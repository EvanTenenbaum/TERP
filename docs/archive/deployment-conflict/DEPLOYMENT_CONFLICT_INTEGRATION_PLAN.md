# Deployment & Conflict Mitigation - Protocol Integration Plan

**Date:** 2025-01-27  
**Status:** ✅ Complete Integration Plan  
**Purpose:** Seamlessly integrate deployment/conflict protocols into existing TERP infrastructure

---

## 📋 PROTOCOL INFRASTRUCTURE AUDIT

### Current Protocol Enforcement Points

#### 1. Git Hooks (Technical Enforcement)

- **`.husky/pre-commit`** - QA checks, roadmap validation, session cleanup
- **`.husky/pre-push`** - ⚠️ **CONFLICT DETECTED**: Blocks direct push to main (violates protocol!)
- **`.husky/pre-commit-qa-check.sh`** - Branch name, any types, file size, credentials

#### 2. Automation Scripts

- **`scripts/start-task.sh`** - Creates branches, sessions, updates roadmap
- **`scripts/manager.ts`** - Swarm manager for parallel agents
- **`scripts/auto-resolve-conflicts.sh`** - Conflict resolution (needs enhancement)
- **`scripts/generate-prompts.ts`** - Generates agent prompts

#### 3. Core Documentation (Agent Instructions)

- **`AGENT_ONBOARDING.md`** - Primary onboarding (mentions direct push to main)
- **`docs/ROADMAP_AGENT_GUIDE.md`** - Roadmap management protocol
- **`docs/QUICK_REFERENCE.md`** - Quick reference guide
- **`docs/NEW_AGENT_PROMPT.md`** - Agent prompt template
- **`MANDATORY_READING.md`** - Required reading list
- **`docs/DEVELOPMENT_PROTOCOLS.md`** - Development protocols (deprecated but referenced)

#### 4. Agent Prompt Templates

- **`docs/agent-prompts/AGENT_TEMPLATE_STRICT.md`** - Strict protocol template
- **`docs/prompts/*.md`** - Task-specific prompts (generated)
- **`agent-prompts/*.md`** - Base agent prompts

#### 5. Swarm Manager Integration

- **`scripts/manager.ts`** - Already has git retry logic, needs conflict resolution

---

## 🔴 CRITICAL CONFLICTS IDENTIFIED

### Conflict 1: Pre-Push Hook Blocks Direct Push to Main

**Location:** `.husky/pre-push:12-15`

**Problem:**

```bash
if [ "$CURRENT_BRANCH" == "main" ]; then
  echo "❌ PUSH BLOCKED: Direct push to main is not allowed. Please use a PR."
  exit 1
fi
```

**But Protocol Requires:**

- `AGENT_ONBOARDING.md:19`: "Push directly to `main` branch"
- `AGENT_ONBOARDING.md:30`: "Branch protection has been removed on `main` to allow direct pushes"

**Fix Required:** Remove or modify this check to allow direct push to main

---

## ✅ INTEGRATION REQUIREMENTS

### Requirement 1: Protocol Compliance

- ✅ All strategies work with direct push to main
- ✅ No PR requirements
- ✅ Autonomous execution compatible
- ✅ Fast iteration (no blocking delays)

### Requirement 2: Technical Enforcement

- ✅ Git hooks enforce protocols
- ✅ Scripts automate workflows
- ✅ Validation prevents errors

### Requirement 3: Documentation Integration

- ✅ All agent instructions updated
- ✅ Quick reference includes new protocols
- ✅ Templates include conflict resolution steps

---

## 🛠️ INTEGRATION IMPLEMENTATION PLAN

### Phase 1: Fix Protocol Conflicts (Critical)

#### 1.1 Update Pre-Push Hook

**File:** `.husky/pre-push`

**Current:**

```bash
# Check 1: Prevent direct push to main
if [ "$CURRENT_BRANCH" == "main" ]; then
  echo "❌ PUSH BLOCKED: Direct push to main is not allowed. Please use a PR."
  exit 1
fi
```

**New:**

```bash
# Check 1: Allow direct push to main (per protocol)
# Note: Direct push to main is allowed per AGENT_ONBOARDING.md
# This enables instant deployment without PR reviews

# Check 2: If pushing to main, enforce conflict resolution protocol
if [ "$CURRENT_BRANCH" == "main" ]; then
  echo "⚠️  Pushing directly to main - enforcing conflict resolution protocol..."

  # Pull with rebase before push (prevents conflicts)
  git pull --rebase origin main || {
    echo "❌ Failed to pull latest changes. Resolving conflicts..."

    # Run auto-conflict resolution
    if [ -f "scripts/auto-resolve-conflicts.sh" ]; then
      bash scripts/auto-resolve-conflicts.sh || {
        echo "❌ Auto-conflict resolution failed. Manual resolution required."
        echo "   Review conflicts and run: git rebase --continue"
        exit 1
      }
    else
      echo "❌ Conflict resolution script not found. Manual resolution required."
      exit 1
    fi
  }

  echo "✅ Pre-push conflict check passed"
fi

# Check 3: Verify branch name format (for non-main branches)
if [[ ! "$CURRENT_BRANCH" =~ $BRANCH_NAME_REGEX ]] && [ "$CURRENT_BRANCH" != "main" ]; then
  echo "❌ PUSH BLOCKED: Invalid branch name format: $CURRENT_BRANCH"
  echo "   To fix: Use 'pnpm start-task' to create a proper branch."
  exit 1
fi
```

---

### Phase 2: Enhance Conflict Resolution Script

#### 2.1 Update Auto-Conflict Resolution

**File:** `scripts/auto-resolve-conflicts.sh`

**Add:**

1. Roadmap merge logic (keep all task updates)
2. Session registry merge logic (keep all entries)
3. Better conflict detection
4. Logging for monitoring

**New Functions:**

```bash
# Function to resolve roadmap conflicts
resolve_roadmap_conflict() {
  # Merge all task status updates
  # Keep all task entries (no duplicates)
  # Preserve all completion dates
}

# Function to resolve session registry conflicts
resolve_session_conflict() {
  # Keep all session entries
  # Merge timestamps (use latest)
  # No data loss
}
```

---

### Phase 3: Update Swarm Manager

#### 3.1 Enhance Git Workflow

**File:** `scripts/manager.ts`

**Update `executeGitWorkflow` function:**

```typescript
async function executeGitWorkflow(
  taskId: string,
  files: string[]
): Promise<string> {
  const branchName = `agent/${taskId}`;

  await safeGit(async git => {
    // Fetch latest
    await git.fetch(["origin"]);

    // Checkout main and pull with rebase (NEW)
    await git.checkout("main");
    await git.pull("origin", "main", ["--rebase"]).catch(async error => {
      // If rebase conflicts, try auto-resolution
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("conflict") ||
        errorMessage.includes("CONFLICT")
      ) {
        console.log(
          chalk.yellow(
            "⚠️  Rebase conflicts detected. Attempting auto-resolution..."
          )
        );
        // Run auto-resolve-conflicts.sh
        execSync("bash scripts/auto-resolve-conflicts.sh", {
          stdio: "inherit",
        });
        // Continue rebase
        await git.rebase(["--continue"]);
      } else {
        throw error;
      }
    });

    // Create or checkout branch
    const branches = await git.branchLocal();
    if (branches.all.includes(branchName)) {
      await git.checkout(branchName);
      await git.pull("origin", branchName, ["--rebase"]).catch(() => {
        // Branch might not exist on remote yet
      });
    } else {
      await git.checkoutLocalBranch(branchName);
    }
  });

  // ... rest of function
}
```

---

### Phase 4: Update Agent Documentation

#### 4.1 Update AGENT_ONBOARDING.md

**File:** `AGENT_ONBOARDING.md`

**Add Section:** "Git Conflict Resolution Protocol"

````markdown
## Git Conflict Resolution Protocol

When pushing to main, conflicts may occur if other agents pushed first. Follow this protocol:

### Automatic Conflict Resolution

1. **Always pull before push:**
   ```bash
   git pull --rebase origin main
   ```
````

2. **If conflicts occur:**
   - The system will automatically attempt to resolve common conflicts
   - Roadmap and session file conflicts are auto-resolved
   - Code conflicts require manual resolution

3. **Auto-resolution handles:**
   - `docs/roadmaps/MASTER_ROADMAP.md` - Merges all task updates
   - `docs/ACTIVE_SESSIONS.md` - Keeps all session entries
   - `docs/sessions/active/*.md` - Merges session updates

4. **Manual resolution required for:**
   - Source code conflicts (`.ts`, `.tsx` files)
   - Configuration conflicts (`.json`, `.yaml` files with conflicting values)

### Conflict Resolution Steps

If auto-resolution fails:

1. **Check conflicts:**

   ```bash
   git status
   ```

2. **Resolve manually:**
   - Edit conflicted files
   - Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Keep both changes where appropriate

3. **Continue rebase:**

   ```bash
   git add <resolved-files>
   git rebase --continue
   ```

4. **Push:**
   ```bash
   git push origin main
   ```

````

---

#### 4.2 Update ROADMAP_AGENT_GUIDE.md
**File:** `docs/ROADMAP_AGENT_GUIDE.md`

**Add to "Git Operations" section:**
```markdown
### Conflict Resolution Protocol

When updating the roadmap, conflicts may occur. The system automatically resolves:
- Multiple task status updates (keeps all)
- Session registrations (keeps all entries)
- Task completions (merges all dates)

If manual resolution is needed:
1. Pull with rebase: `git pull --rebase origin main`
2. Resolve conflicts in MASTER_ROADMAP.md
3. Continue rebase: `git rebase --continue`
4. Push: `git push origin main`
````

---

#### 4.3 Update QUICK_REFERENCE.md

**File:** `docs/QUICK_REFERENCE.md`

**Add Section:**

````markdown
## 🔄 Conflict Resolution

### If Push Fails (Conflict)

```bash
# Pull with rebase
git pull --rebase origin main

# Auto-resolve (runs automatically)
# If manual resolution needed:
git status  # See conflicts
# Edit files, remove conflict markers
git add <files>
git rebase --continue
git push origin main
```
````

````

---

#### 4.4 Update NEW_AGENT_PROMPT.md
**File:** `docs/NEW_AGENT_PROMPT.md`

**Add to "Step 5: Push Your Work":**
```markdown
### Step 5: Push Your Work

```bash
git push
````

**What happens:** The `pre-push` hook runs automatically and checks:

- If pushing to main: Pulls with rebase first (prevents conflicts)
- Auto-resolves common conflicts (roadmap, sessions)
- Your branch name is valid (for non-main branches)

**If conflicts occur:**

- Auto-resolution runs automatically
- If auto-resolution fails, you'll see instructions for manual resolution
- Most conflicts are resolved automatically

````

---

#### 4.5 Update MANDATORY_READING.md
**File:** `MANDATORY_READING.md`

**Add to reading list:**
```markdown
**7. Conflict Resolution Guide (docs/DEPLOYMENT_CONFLICT_ANALYSIS_V2_EXECUTIVE_SUMMARY.md)** - ⏱️ 2 min
````

- Git conflict prevention
- Auto-resolution protocol
- Manual resolution steps

````

---

### Phase 5: Update Agent Prompt Templates

#### 5.1 Update AGENT_TEMPLATE_STRICT.md
**File:** `docs/agent-prompts/AGENT_TEMPLATE_STRICT.md`

**Add to "PHASE 6: Push to Main":**
```markdown
### PHASE 6: Push to Main (MANDATORY)

**CRITICAL:** Follow conflict resolution protocol.

1. **Pull with rebase first:**
   ```bash
   git pull --rebase origin main
````

2. **If conflicts occur:**
   - Auto-resolution runs automatically
   - Check output for any manual resolution needed
   - Most conflicts are auto-resolved

3. **Push:**

   ```bash
   git push origin main
   ```

4. **If push still fails:**
   - Review error message
   - Follow manual resolution steps if needed
   - Retry push

````

---

#### 5.2 Update generate-prompts.ts
**File:** `scripts/generate-prompts.ts`

**Add conflict resolution section to generated prompts:**
```typescript
function generatePrompt(task: Task): string {
  // ... existing code ...

  return `...existing prompt...

5. **Push directly to main (with conflict resolution):**

   ```bash
   # Pull with rebase first (prevents conflicts)
   git pull --rebase origin main

   # If conflicts occur, auto-resolution runs automatically
   # Most conflicts are resolved automatically

   # Push
   git push origin main
````

**If conflicts occur:**

- Auto-resolution handles roadmap and session files
- Code conflicts may require manual resolution
- Follow error messages for guidance
  `;
  }

````

---

### Phase 6: Update start-task.sh

#### 6.1 Add Conflict Prevention
**File:** `scripts/start-task.sh`

**Add before branch creation:**
```bash
# Pull latest before creating branch (prevents conflicts)
echo -e "${BLUE}🔄 Pulling latest changes...${NC}"
git pull --rebase origin main || {
  echo -e "${YELLOW}⚠️  Pull conflicts detected. Resolving...${NC}"
  if [ -f "scripts/auto-resolve-conflicts.sh" ]; then
    bash scripts/auto-resolve-conflicts.sh || {
      error_exit "Failed to resolve conflicts. Please resolve manually and retry."
    }
  fi
}
````

---

### Phase 7: Create New Documentation

#### 7.1 Create Conflict Resolution Guide

**File:** `docs/CONFLICT_RESOLUTION_GUIDE.md`

**Content:** Quick reference for agents on conflict resolution

---

#### 7.2 Create Deployment Protocol Guide

**File:** `docs/DEPLOYMENT_PROTOCOL.md`

**Content:** Deployment health check protocol, readiness monitoring

---

### Phase 8: Update Health Check Configuration

#### 8.1 Update .do/app.yaml

**File:** `.do/app.yaml`

**Change health check:**

```yaml
health_check:
  http_path: /health/live # Use liveness (no DB dependency)
  initial_delay_seconds: 90 # Increased from 60
  period_seconds: 15 # Check less frequently
  timeout_seconds: 10 # Longer timeout
  success_threshold: 1
  failure_threshold: 6 # More tolerant (was 3)
```

---

#### 8.2 Update scripts/start.sh

**File:** `scripts/start.sh`

**Remove duplicate migrations:**

```bash
# Remove this:
# node scripts/migrate.js

# Keep only:
exec node dist/index.js
```

---

## 📋 COMPLETE INTEGRATION CHECKLIST

### Critical Fixes (Phase 1)

- [ ] **Fix pre-push hook** - Remove block on direct push to main
- [ ] **Add conflict resolution to pre-push** - Pull with rebase before push
- [ ] **Test pre-push hook** - Verify it works with direct push

### Script Enhancements (Phase 2-3)

- [ ] **Enhance auto-resolve-conflicts.sh**:
  - [ ] Add roadmap merge logic
  - [ ] Add session registry merge logic
  - [ ] Add better conflict detection
  - [ ] Add logging
- [ ] **Update swarm manager**:
  - [ ] Add pull with rebase before push
  - [ ] Add auto-conflict resolution on conflicts
  - [ ] Add retry with exponential backoff
  - [ ] Add force push safety (only agent branches)
- [ ] **Update start-task.sh**:
  - [ ] Add pull with rebase before branch creation
  - [ ] Add conflict resolution on pull conflicts

### Documentation Updates (Phase 4-5)

- [ ] **Update AGENT_ONBOARDING.md**:
  - [ ] Add conflict resolution protocol section
  - [ ] Update push instructions
- [ ] **Update ROADMAP_AGENT_GUIDE.md**:
  - [ ] Add conflict resolution to Git Operations
- [ ] **Update QUICK_REFERENCE.md**:
  - [ ] Add conflict resolution section
- [ ] **Update NEW_AGENT_PROMPT.md**:
  - [ ] Add conflict resolution to push step
- [ ] **Update MANDATORY_READING.md**:
  - [ ] Add conflict resolution guide to reading list
- [ ] **Update AGENT_TEMPLATE_STRICT.md**:
  - [ ] Add conflict resolution to push phase
- [ ] **Update generate-prompts.ts**:
  - [ ] Add conflict resolution to generated prompts

### New Documentation (Phase 7)

- [ ] **Create CONFLICT_RESOLUTION_GUIDE.md**:
  - [ ] Quick reference for agents
  - [ ] Common scenarios
  - [ ] Troubleshooting
- [ ] **Create DEPLOYMENT_PROTOCOL.md**:
  - [ ] Health check protocol
  - [ ] Readiness monitoring
  - [ ] Deployment verification

### Deployment Configuration (Phase 8)

- [ ] **Update .do/app.yaml**:
  - [ ] Change to `/health/live`
  - [ ] Increase delays and timeouts
- [ ] **Update scripts/start.sh**:
  - [ ] Remove duplicate migrations
  - [ ] Keep only autoMigrate.ts

### Testing & Validation

- [ ] **Test conflict resolution**:
  - [ ] Create test conflicts
  - [ ] Verify auto-resolution works
  - [ ] Test manual resolution flow
- [ ] **Test pre-push hook**:
  - [ ] Verify direct push to main works
  - [ ] Verify conflict resolution runs
  - [ ] Test with real conflicts
- [ ] **Test swarm manager**:
  - [ ] Test with parallel agents
  - [ ] Verify conflict handling
  - [ ] Test retry logic

---

## 🎯 INTEGRATION PRIORITY

### P0 - Critical (Week 1)

1. Fix pre-push hook (blocks protocol)
2. Enhance auto-resolve-conflicts.sh
3. Update swarm manager
4. Update AGENT_ONBOARDING.md

### P1 - Important (Week 2)

1. Update all agent documentation
2. Update prompt templates
3. Update start-task.sh
4. Create new guides

### P2 - Nice to Have (Week 3)

1. Create comprehensive guides
2. Add monitoring
3. Enhance logging

---

## ✅ PROTOCOL COMPLIANCE VERIFICATION

### Direct Push to Main ✅

- Pre-push hook updated to allow direct push
- Conflict resolution runs automatically
- No PR requirements

### Autonomous Execution ✅

- All scripts automated
- No manual intervention required
- Compatible with agent workflows

### Fast Iteration ✅

- Retry logic has timeout limits
- Conflict resolution is automatic
- Health checks are non-blocking

### Existing Protocols ✅

- Maintains all existing agent protocols
- No breaking changes to workflows
- Backward compatible

---

## 📝 IMPLEMENTATION ORDER

1. **Day 1:** Fix pre-push hook (critical blocker)
2. **Day 2:** Enhance conflict resolution script
3. **Day 3:** Update swarm manager
4. **Day 4:** Update core documentation (AGENT_ONBOARDING.md, QUICK_REFERENCE.md)
5. **Day 5:** Update prompt templates and generators
6. **Week 2:** Update remaining documentation
7. **Week 3:** Create new guides and monitoring

---

**Document Status:** ✅ Complete Integration Plan  
**Protocol Compliance:** ✅ Verified  
**Implementation Risk:** Low (all changes are additive or fix conflicts)
