# Agent Prompt Template - Strict Protocol Enforcement

**Use this template to create agent prompts that ensure 100% protocol compliance.**

---

## Template Structure

````markdown
# Agent [NUMBER]: [TASK_CATEGORY]

You are Agent-[NUMBER] working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

[List 2-3 tasks with full details]

Example:

- **ST-005:** Add Missing Database Indexes (P1, 4-6h)
  - Add indexes to foreign keys in drizzle/schema.ts
  - Test query performance improvements
  - Document changes in migration file

## ⚠️ CRITICAL: MANDATORY PROTOCOLS

You MUST complete ALL of these steps in order. Skipping ANY step is a protocol violation.

### ✅ Verification Over Persuasion (Mandatory)

- Follow `.kiro/steering/08-adaptive-qa-protocol.md`
- Select SAFE/STRICT/RED mode and apply its verification rules
- Do not claim success without logs from required checks

### PHASE 1: Pre-Flight (MANDATORY - 15 minutes)

1. **Clone and Setup**
   ```bash
   gh repo clone EvanTenenbaum/TERP
   cd TERP
   ```
````

2. **Read ALL Protocol Documents** (DO NOT SKIP)

   ```bash
   cat docs/DEVELOPMENT_PROTOCOLS.md
   cat docs/CLAUDE_WORKFLOW.md
   cat docs/roadmaps/MASTER_ROADMAP.md
   ```

   - You MUST read these files completely
   - You MUST understand the protocols before proceeding
   - You MUST follow every protocol exactly

3. **Generate Session ID**

   ```bash
   SESSION_ID="Session-$(date +%Y%m%d)-[task-name]-$(openssl rand -hex 4)"
   echo $SESSION_ID > /tmp/session_id.txt
   echo "Your session ID: $SESSION_ID"
   ```

4. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

### PHASE 2: Session Registration (MANDATORY - 10 minutes)

**CRITICAL:** You MUST register your session BEFORE starting any work.

1. **Create Session File**

   ```bash
   SESSION_ID=$(cat /tmp/session_id.txt)
   cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
   # [Task Name] - Agent [NUMBER]

   **Session ID:** [SESSION_ID]
   **Agent:** Agent-[NUMBER]
   **Started:** $(date +%Y-%m-%d)
   **Status:** In Progress

   ## Tasks
   - [ ] [TASK-ID-1]: [Task description]
   - [ ] [TASK-ID-2]: [Task description]

   ## Progress
   Starting work...
   EOF
   ```

2. **Register in ACTIVE_SESSIONS.md**

   ```bash
   echo "- Agent-[NUMBER]: ${SESSION_ID} - [Task Category] ([TASK-IDs])" >> docs/ACTIVE_SESSIONS.md
   ```

3. **Mark Tasks In Progress in Roadmap**

   For EACH task, update docs/roadmaps/MASTER_ROADMAP.md:
   - Change `- [ ]` to `- [~]` (in progress marker)
   - OR update the Status field to "🟡 In Progress"

   Example:

   ```markdown
   ### ST-005: Add Missing Database Indexes

   **Priority:** P1 | **Status:** 🟡 In Progress (Agent-[NUMBER], [SESSION_ID]) | **Effort:** 4-6h
   ```

4. **Create Feature Branch**

   ```bash
   git checkout -b "agent-[NUMBER]/[task-category]-${SESSION_ID}"
   ```

5. **Commit and Push Registration** (MANDATORY)

   ```bash
   git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md docs/roadmaps/MASTER_ROADMAP.md
   git commit -m "Register Agent-[NUMBER]: [Task Category]

   - Session: ${SESSION_ID}
   - Tasks: [TASK-IDs]
   - Status: In Progress"
   git push origin "agent-[NUMBER]/[task-category]-${SESSION_ID}"
   ```

   **VERIFICATION:** Confirm push succeeded before continuing.

### PHASE 3: Implementation (Main Work)

**Now you can start your actual work.**

For EACH task:

1. **Understand Requirements**
   - Read task description in MASTER_ROADMAP.md
   - Identify files to modify
   - Plan implementation approach

2. **Implement Changes**
   - Write clean, production-ready code
   - Follow existing code patterns
   - Add proper error handling
   - Include TypeScript types (NO `any` types)

3. **Write Tests** (MANDATORY for code changes)

   ```bash
   # Create test file alongside implementation
   # Example: server/routers/myRouter.ts → server/routers/myRouter.test.ts
   ```

   Test requirements:
   - Unit tests for all new functions
   - Integration tests for API endpoints
   - Edge case coverage
   - Error handling tests

4. **Commit Frequently**

   ```bash
   git add [files]
   git commit -m "[TASK-ID]: [Clear description of change]"
   git push origin "agent-[NUMBER]/[task-category]-${SESSION_ID}"
   ```

5. **Update Session File Progress**
   ```bash
   # Update docs/sessions/active/${SESSION_ID}.md
   # Mark completed subtasks with [x]
   ```

### PHASE 4: Testing & Validation (MANDATORY - DO NOT SKIP)

**You MUST complete ALL these tests before marking tasks complete.**

1. **TypeScript Compilation** (MANDATORY)

   ```bash
   pnpm check
   ```

   - MUST show ZERO errors
   - Fix ALL type errors before proceeding
   - NO `any` types allowed

2. **Run All Tests** (MANDATORY)

   ```bash
   pnpm test
   ```

   - ALL tests MUST pass
   - If any test fails, fix it before proceeding
   - Add new tests for your changes

3. **Run Lint** (MANDATORY)

   ```bash
   pnpm lint
   ```

4. **Build** (MANDATORY for shipped code)

   ```bash
   pnpm build
   ```

5. **E2E Tests** (MANDATORY when UI/business flows change)

   ```bash
   pnpm test:e2e
   ```

6. **Manual Testing** (MANDATORY)

   For EACH feature you modified:
   - [ ] Start development server: `pnpm dev`
   - [ ] Test the feature works in browser
   - [ ] Test happy path (normal usage)
   - [ ] Test error cases
   - [ ] Test edge cases
   - [ ] Verify no console errors
   - [ ] Verify no network errors

7. **Code Quality Checks**

   ```bash
   # Check for console.log statements (remove them)
   rg "console.log" src/ server/ --glob "!*.test.ts"

   # Check for TODO comments (convert to tickets)
   rg "TODO" src/ server/ --glob "!*.test.ts"
   ```

8. **Create Test Report**

   ```bash
   cat > "docs/testing/Agent-[NUMBER]-Test-Report.md" << 'EOF'
   # Test Report - Agent [NUMBER]

   **Session:** [SESSION_ID]
   **Date:** $(date +%Y-%m-%d)

   ## Tests Run

   ### TypeScript Compilation
   - [ ] ✅ PASSED - Zero errors

   ### Unit Tests
   - [ ] ✅ PASSED - All tests passing
   - [ ] New tests added: [count]

   ### Integration Tests
   - [ ] ✅ PASSED - All endpoints working

   ### Manual Testing
   - [ ] ✅ Feature works in browser
   - [ ] ✅ Error handling works
   - [ ] ✅ No console errors

   ## Test Coverage
   - Files tested: [list]
   - Test cases added: [count]

   ## Issues Found
   - [List any issues and how you fixed them]

   ## Sign-off
   All tests passed. Ready for deployment.
   EOF
   ```

### PHASE 5: Documentation (MANDATORY)

1. **Update CHANGELOG.md**

   ```bash
   # Add entry at the top of CHANGELOG.md
   cat >> CHANGELOG.md << 'EOF'
   ## [DATE] - Agent [NUMBER]

   ### Added
   - [TASK-ID]: [Description of what was added]

   ### Fixed
   - [TASK-ID]: [Description of what was fixed]

   ### Changed
   - [TASK-ID]: [Description of what changed]
   EOF
   ```

2. **Update Task Documentation**
   - If task has a prompt file (docs/prompts/[TASK-ID].md), mark it complete
   - Add any important notes or learnings

3. **Commit Documentation**
   ```bash
   git add CHANGELOG.md docs/testing/
   git commit -m "[TASK-ID]: Add documentation and test reports"
   git push origin "agent-[NUMBER]/[task-category]-${SESSION_ID}"
   ```

### PHASE 6: Merge to Main (MANDATORY)

1. **Final Pre-Merge Checks**

   ```bash
   # Pull latest main
   git checkout main
   git pull origin main

   # Merge your branch
   git merge "agent-[NUMBER]/[task-category]-${SESSION_ID}"

   # Resolve any conflicts
   # Re-run tests after merge
   pnpm check
   pnpm test
   ```

2. **Push to Main**

   ```bash
   git push origin main
   ```

   **VERIFICATION:** Confirm push succeeded.

### PHASE 7: Deployment Verification (MANDATORY)

**CRITICAL:** You are NOT done until deployment is verified.

1. **Wait for Deployment** (5-10 minutes)
   - Digital Ocean auto-deploys from main branch
   - Wait for deployment to complete

2. **Verify Deployment**

   ```bash
   # Check deployment status
   curl -I https://terp-app.ondigitalocean.app/

   # Should return 200 OK
   ```

3. **Test in Production** (MANDATORY)
   - Open production URL in browser
   - Test EACH feature you modified
   - Verify everything works
   - Check for errors in browser console

4. **If Deployment Fails**
   - Check Digital Ocean logs
   - Fix issues immediately
   - Redeploy
   - DO NOT mark tasks complete until deployment succeeds

### PHASE 8: Completion & Cleanup (MANDATORY)

**Only complete this phase after deployment is verified.**

1. **Update Roadmap to Complete**

   For EACH task in docs/roadmaps/MASTER_ROADMAP.md:

   Change from:

   ```markdown
   ### [TASK-ID]: [Task Name]

   **Priority:** P1 | **Status:** 🟡 In Progress | **Effort:** 4-6h
   ```

   To:

   ```markdown
   ### [TASK-ID]: [Task Name]

   **Priority:** P1 | **Status:** ✅ Complete ($(date +%Y-%m-%d)) | **Effort:** 4-6h
   ```

   OR change checkbox:

   ```markdown
   - [x] **[TASK-ID]: [Task Name]** (Completed: $(date +%Y-%m-%d))
   ```

2. **Update Session File to Complete**

   ```bash
   SESSION_ID=$(cat /tmp/session_id.txt)
   # Update docs/sessions/active/${SESSION_ID}.md
   # Change Status to: ✅ Complete
   # Mark all tasks [x] complete
   # Add completion timestamp
   ```

3. **Archive Session File**

   ```bash
   mv "docs/sessions/active/${SESSION_ID}.md" "docs/sessions/completed/"
   ```

4. **Remove from ACTIVE_SESSIONS.md**

   ```bash
   # Remove your session line from docs/ACTIVE_SESSIONS.md
   # Or mark it as complete in the "Completed Today" section
   ```

5. **Final Commit**

   ```bash
   git add docs/roadmaps/MASTER_ROADMAP.md docs/sessions/ docs/ACTIVE_SESSIONS.md
   git commit -m "Complete Agent-[NUMBER]: [Task Category]

   Tasks completed:
   - [TASK-ID-1]: [Description]
   - [TASK-ID-2]: [Description]

   All tests passing, deployment verified."
   git push origin main
   ```

6. **Final Verification**
   - [ ] All tasks marked ✅ in roadmap
   - [ ] Session archived to completed/
   - [ ] Removed from ACTIVE_SESSIONS.md
   - [ ] All code pushed to main
   - [ ] Deployment verified in production
   - [ ] All tests passing

## ✅ COMPLETION CHECKLIST

You are ONLY complete when ALL of these are checked:

### Pre-Flight

- [ ] Cloned repository
- [ ] Read ALL protocol documents
- [ ] Generated session ID

### Registration

- [ ] Created session file in docs/sessions/active/
- [ ] Registered in ACTIVE_SESSIONS.md
- [ ] Marked tasks [~] in progress in roadmap
- [ ] Created feature branch
- [ ] Pushed registration to GitHub

### Implementation

- [ ] Completed all assigned tasks
- [ ] Wrote clean, production-ready code
- [ ] NO `any` types used
- [ ] Proper error handling added
- [ ] Committed changes frequently

### Testing

- [ ] TypeScript compilation: ZERO errors
- [ ] All unit tests: PASSING
- [ ] All integration tests: PASSING
- [ ] Manual testing: COMPLETE
- [ ] Test report: CREATED

### Documentation

- [ ] CHANGELOG.md updated
- [ ] Test report created
- [ ] Session file updated with progress

### Deployment

- [ ] Merged to main branch
- [ ] Pushed to GitHub
- [ ] Waited for deployment (5-10 min)
- [ ] Verified deployment successful
- [ ] Tested in production

### Completion

- [ ] All tasks marked ✅ in roadmap
- [ ] Session file marked complete
- [ ] Session archived to completed/
- [ ] Removed from ACTIVE_SESSIONS.md
- [ ] Final commit pushed

## 🚨 PROTOCOL VIOLATIONS

**The following are VIOLATIONS and will cause your work to be rejected:**

❌ Skipping protocol document reading  
❌ Not registering session before starting work  
❌ Not updating roadmap to "in progress"  
❌ Not creating session file  
❌ Using `any` types in TypeScript  
❌ Skipping tests  
❌ Not running TypeScript compilation check  
❌ Marking complete without deployment verification  
❌ Not archiving session file  
❌ Leaving session in ACTIVE_SESSIONS.md after completion  
❌ Not updating roadmap to complete

## 📊 TIME ESTIMATES

- Phase 1 (Pre-Flight): 15 minutes
- Phase 2 (Registration): 10 minutes
- Phase 3 (Implementation): [Task estimate]
- Phase 4 (Testing): 30-60 minutes
- Phase 5 (Documentation): 15 minutes
- Phase 6 (Merge): 10 minutes
- Phase 7 (Deployment): 15 minutes
- Phase 8 (Completion): 15 minutes

**Total Overhead:** ~2 hours (for protocols and quality assurance)

## 🎯 SUCCESS CRITERIA

You have successfully completed your work when:

1. ✅ All assigned tasks are functionally complete
2. ✅ All tests are passing (TypeScript, unit, integration)
3. ✅ Code is deployed to production and verified working
4. ✅ Roadmap is updated to show tasks complete
5. ✅ Session is archived and removed from active list
6. ✅ All documentation is updated
7. ✅ ZERO protocol violations

---

**Remember:** Following these protocols ensures high-quality work, prevents conflicts, and maintains project integrity. DO NOT take shortcuts.

```

---

## How to Use This Template

1. **Copy this template** for each new agent
2. **Fill in the placeholders:**
   - `[NUMBER]` - Agent number (01, 02, etc.)
   - `[TASK_CATEGORY]` - Category name (e.g., "Database Performance")
   - `[TASK-ID]` - Actual task IDs (e.g., ST-005, ST-015)
   - `[task-name]` - Short task name for session ID
3. **Add specific task details** in the "YOUR TASKS" section
4. **Keep all protocol sections** exactly as written
5. **Deploy to agents** via copy-paste or file URL

---

## Example: Filled Template

See next file: `AGENT-EXAMPLE-DB-PERFORMANCE.md`
```
