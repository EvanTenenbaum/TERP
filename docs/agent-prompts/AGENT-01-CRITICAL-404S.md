# Agent 1: Critical 404 Fixes

**Agent ID:** Agent-01  
**Module:** Core Navigation  
**Priority:** P0 (Critical)  
**Estimated Time:** 6-10 hours  
**Session ID:** `Session-20251114-critical-404s-[GENERATE_RANDOM]`

---

## 🎯 Your Mission

Fix 3 critical 404 errors in core navigation modules. These are blocking users from accessing essential features.

---

## 📋 Your Tasks

### Task 1: QA-001 - Fix 404 Error - Todo Lists Module
**Priority:** P0 | **Estimate:** 2-4h

**Problem:** Users get 404 when trying to access Todo Lists module

**Action Required:**
1. Check if `server/routers/todoLists.ts` exists
2. If missing: Create router with basic CRUD operations
3. If exists: Fix route registration in `server/routers/_app.ts`
4. Test the route works: `/api/trpc/todoLists.list`
5. Verify UI can access the route

**Files to Check/Modify:**
- `server/routers/todoLists.ts` (create or fix)
- `server/routers/_app.ts` (router registration)
- `src/pages/TodoLists/*.tsx` (verify routing)

---

### Task 2: QA-002 - Fix 404 Error - Accounting Module
**Priority:** P0 | **Estimate:** 2-4h

**Problem:** Users get 404 when trying to access Accounting module

**Action Required:**
1. Check if `server/routers/accounting.ts` exists
2. If missing: Create router with basic CRUD operations
3. If exists: Fix route registration in `server/routers/_app.ts`
4. Test the route works: `/api/trpc/accounting.list`
5. Verify UI can access the route

**Files to Check/Modify:**
- `server/routers/accounting.ts` (create or fix)
- `server/routers/_app.ts` (router registration)
- `src/pages/Accounting/*.tsx` (verify routing)

---

### Task 3: QA-003 - Fix 404 Error - COGS Settings Module
**Priority:** P0 | **Estimate:** 2-4h

**Problem:** Users get 404 when trying to access COGS Settings module

**Action Required:**
1. Check if `server/routers/cogsSettings.ts` exists
2. If missing: Create router with basic CRUD operations
3. If exists: Fix route registration in `server/routers/_app.ts`
4. Test the route works: `/api/trpc/cogsSettings.get`
5. Verify UI can access the route

**Files to Check/Modify:**
- `server/routers/cogsSettings.ts` (create or fix)
- `server/routers/_app.ts` (router registration)
- `src/pages/Settings/COGS*.tsx` (verify routing)

---

## 🚀 Getting Started

### Step 1: Setup
```bash
# Clone repository
gh repo clone EvanTenenbaum/TERP
cd TERP

# Read the Bible (mandatory)
cat docs/DEVELOPMENT_PROTOCOLS.md
cat docs/CLAUDE_WORKFLOW.md
cat docs/roadmaps/MASTER_ROADMAP.md
```

### Step 2: Register Your Session
```bash
# Generate your session ID
SESSION_ID="Session-20251114-critical-404s-$(openssl rand -hex 3 | tr '[:lower:]' '[:upper:]')"

# Create session file
cat > "docs/sessions/active/${SESSION_ID}.md" << EOF
# Critical 404 Fixes - Agent 01

**Agent:** Agent-01
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress

## Tasks
- [ ] QA-001: Fix 404 Error - Todo Lists Module
- [ ] QA-002: Fix 404 Error - Accounting Module
- [ ] QA-003: Fix 404 Error - COGS Settings Module

## Progress
Starting work on critical 404 fixes...
EOF

# Register in ACTIVE_SESSIONS.md
echo "- Agent-01: ${SESSION_ID} - Critical 404 Fixes (QA-001, QA-002, QA-003)" >> docs/ACTIVE_SESSIONS.md

# Update roadmap
# Mark QA-001, QA-002, QA-003 as [~] in progress

# Commit and push
git add -A
git commit -m "Register Agent-01 session: Critical 404 fixes"
git push origin main
```

### Step 3: Create Your Branch
```bash
git checkout -b "claude/critical-404s-${SESSION_ID}"
```

### Step 4: Do Your Work
Follow the task instructions above. For each task:
1. Investigate the issue
2. Implement the fix
3. Test thoroughly
4. Commit with clear message
5. Update session file with progress

### Step 5: Complete and Deploy
```bash
# Push your branch
git push origin "claude/critical-404s-${SESSION_ID}"

# Merge to main
git checkout main
git pull origin main
git merge "claude/critical-404s-${SESSION_ID}"
git push origin main

# Verify deployment (MANDATORY)
# Wait 5-10 minutes for Digital Ocean to deploy
# Check deployment status with doctl or GitHub Actions

# Mark tasks complete in roadmap
# Move session file to docs/sessions/completed/
# Remove from ACTIVE_SESSIONS.md
# Push final updates
```

---

## ⚠️ Critical Protocols

### Must Follow
1. ✅ Read DEVELOPMENT_PROTOCOLS.md before starting
2. ✅ Register session in ACTIVE_SESSIONS.md immediately
3. ✅ Update roadmap status for each task
4. ✅ Push to GitHub after every major change
5. ✅ Test thoroughly before merging
6. ✅ Verify deployment before reporting complete
7. ✅ Archive session when done

### Must NOT Do
1. ❌ Do not work on files assigned to other agents
2. ❌ Do not skip testing
3. ❌ Do not report complete without deployment verification
4. ❌ Do not leave session files in active/ when done
5. ❌ Do not force push without coordination

---

## 🔍 Testing Checklist

For each fixed route:
- [ ] Route responds without 404
- [ ] Data loads correctly
- [ ] UI displays properly
- [ ] No console errors
- [ ] Database queries work
- [ ] All tests pass

---

## 📊 Completion Criteria

**You are done when:**
1. ✅ All 3 tasks completed
2. ✅ All routes return 200 (not 404)
3. ✅ All tests passing
4. ✅ Code pushed to main
5. ✅ Deployment verified successful
6. ✅ Session archived
7. ✅ Roadmap updated to [x] complete

---

## 🆘 If You Get Stuck

1. Check existing routers for patterns (e.g., `server/routers/clients.ts`)
2. Review tRPC documentation
3. Check database schema in `drizzle/schema.ts`
4. Look for similar fixes in git history
5. Document the blocker in your session file

---

**Good luck! You're fixing critical issues that are blocking users right now.**
