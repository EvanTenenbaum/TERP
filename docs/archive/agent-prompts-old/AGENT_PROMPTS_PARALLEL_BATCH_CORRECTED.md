# Parallel Agent Prompts - Batch 1 (CORRECTED)

**Date:** November 13, 2025  
**Batch:** 3 parallel agents  
**Coordination:** Independent modules, no conflicts expected  
**Status:** ✅ CORRECTED - Matches MASTER_ROADMAP.md

**CORRECTION:** Previous version had wrong task IDs. This version matches the actual MASTER_ROADMAP.md (Single Source of Truth).

---

## Agent 1: Global Error Handling (ST-002)

### Prompt

```
You are Agent 1 of 3 parallel agents working on the TERP project.

TASK: ST-002 - Implement Global Error Handling
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Error handling middleware (server/_core/)

IMPORTANT: This is ST-002 from MASTER_ROADMAP.md (NOT ST-005)

PARALLEL WORK COORDINATION:
- Agent 2 is working on: ST-006 Remove Dead Code (server/routers/, dead files)
- Agent 3 is working on: ST-001 Consolidate .env Files (root .env files)
- NO CONFLICTS EXPECTED - You work on different files

MANDATORY FIRST STEPS:
1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-002 task - line 141-145)
5. Confirm you understand ALL protocols before proceeding

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
   Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
   Phase 2: Session Startup (create session file, branch, update roadmap)
   Phase 3: Development (TDD - tests first, frequent commits)
   Phase 4: Completion (merge to main, update roadmap, archive session)

✅ TDD is MANDATORY - Write tests FIRST, then implementation
✅ All tests must pass before ANY commit
✅ No 'any' types allowed
✅ All files must be <500 lines
✅ No TODO, FIXME, or placeholder code
✅ Pre-commit hooks must pass (NEVER use --no-verify)
✅ Push to GitHub every 30 minutes minimum
✅ Update session file with progress every 30 minutes

PARALLEL COORDINATION PROTOCOL:
1. Create session file: docs/sessions/active/Session-[YOUR-ID]-ST-002-error-handling.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/ST-002-error-handling-Session-[YOUR-ID]
4. Mark ST-002 "in progress" in MASTER_ROADMAP.md (line 141)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)

TASK REQUIREMENTS (from MASTER_ROADMAP.md):
- Task ID: ST-002
- Action: Add tRPC error handling middleware
- Impact: Better error tracking and debugging
- Estimate: 3-4 hours

IMPLEMENTATION DETAILS:
- Create server/_core/errorHandler.ts
- Add tRPC error handling middleware
- Implement consistent error response format
- Add error logging integration
- Create comprehensive tests (TDD)
- Document error codes and handling patterns
- Update relevant routers to use new error handler

DELIVERABLES:
- errorHandler.ts (<500 lines)
- errorHandler.test.ts (100% test coverage)
- ERROR_HANDLING_GUIDE.md (documentation)
- Updated MASTER_ROADMAP.md (mark ST-002 complete)
- Session file in docs/sessions/completed/

BEFORE REPORTING DONE:
- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated (ST-002 marked complete)
- [ ] Session archived

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.
```

---

## Agent 2: Remove Dead Code (ST-006)

### Prompt

```
You are Agent 2 of 3 parallel agents working on the TERP project.

TASK: ST-006 - Remove Dead Code
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Dead code removal (server/routers/, unused files)

IMPORTANT: This is ST-006 from MASTER_ROADMAP.md (NOT logging task)

PARALLEL WORK COORDINATION:
- Agent 1 is working on: ST-002 Global Error Handling (server/_core/errorHandler.ts)
- Agent 3 is working on: ST-001 Consolidate .env Files (root .env files)
- NO CONFLICTS EXPECTED - You work on different files

MANDATORY FIRST STEPS:
1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-006 task - line 165-179)
5. Confirm you understand ALL protocols before proceeding

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
   Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
   Phase 2: Session Startup (create session file, branch, update roadmap)
   Phase 3: Development (TDD where applicable, frequent commits)
   Phase 4: Completion (merge to main, update roadmap, archive session)

✅ TDD where applicable (write tests to verify no regressions)
✅ All tests must pass before ANY commit
✅ No 'any' types allowed
✅ All files must be <500 lines
✅ No TODO, FIXME, or placeholder code
✅ Pre-commit hooks must pass (NEVER use --no-verify)
✅ Push to GitHub every 30 minutes minimum
✅ Update session file with progress every 30 minutes

PARALLEL COORDINATION PROTOCOL:
1. Create session file: docs/sessions/active/Session-[YOUR-ID]-ST-006-dead-code.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/ST-006-dead-code-Session-[YOUR-ID]
4. Mark ST-006 "in progress" in MASTER_ROADMAP.md (line 165)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)

TASK REQUIREMENTS (from MASTER_ROADMAP.md):
- Task ID: ST-006
- **Verified Dead Code:**
  - `server/cogsManagement.ts` (exists, verify unused)
  - Note: `clientNeeds.ts` and `ComponentShowcase.tsx` already deleted
- **29 Unused Routers:** Requires investigation to identify
- Action: Identify and delete unused files and routers
- Impact: Reduced codebase complexity
- Estimate: 3-4 hours (increased for verification)

VERIFICATION METHOD (from roadmap):
1. ☐ Run `grep -r "import.*cogsManagement" server/ src/` to verify no imports
2. ☐ Identify unused routers: Compare `server/routers.ts` imports vs files in `server/routers/`
3. ☐ For each unused router: Verify no imports in codebase
4. ☐ Delete files and run `pnpm check` and `pnpm test`
5. ☐ Create list of 29 routers before deletion for review

DELIVERABLES:
- List of identified dead code (for review before deletion)
- Deleted files (with verification)
- Updated server/routers.ts (if needed)
- DEAD_CODE_REMOVAL_REPORT.md (documentation)
- Updated MASTER_ROADMAP.md (mark ST-006 complete)
- Session file in docs/sessions/completed/

BEFORE REPORTING DONE:
- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated (ST-006 marked complete)
- [ ] Session archived

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.
```

---

## Agent 3: Consolidate .env Files (ST-001)

### Prompt

```
You are Agent 3 of 3 parallel agents working on the TERP project.

TASK: ST-001 - Consolidate .env Files
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Environment configuration (root .env files)

IMPORTANT: This is ST-001 from MASTER_ROADMAP.md

PARALLEL WORK COORDINATION:
- Agent 1 is working on: ST-002 Global Error Handling (server/_core/errorHandler.ts)
- Agent 2 is working on: ST-006 Remove Dead Code (server/routers/, dead files)
- NO CONFLICTS EXPECTED - You work on different files

MANDATORY FIRST STEPS:
1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-001 task - line 135-139)
5. Confirm you understand ALL protocols before proceeding

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
   Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
   Phase 2: Session Startup (create session file, branch, update roadmap)
   Phase 3: Development (TDD where applicable, frequent commits)
   Phase 4: Completion (merge to main, update roadmap, archive session)

✅ TDD where applicable (write tests for env validation)
✅ All tests must pass before ANY commit
✅ No 'any' types allowed
✅ All files must be <500 lines
✅ No TODO, FIXME, or placeholder code
✅ Pre-commit hooks must pass (NEVER use --no-verify)
✅ Push to GitHub every 30 minutes minimum
✅ Update session file with progress every 30 minutes

PARALLEL COORDINATION PROTOCOL:
1. Create session file: docs/sessions/active/Session-[YOUR-ID]-ST-001-env-consolidation.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/ST-001-env-consolidation-Session-[YOUR-ID]
4. Mark ST-001 "in progress" in MASTER_ROADMAP.md (line 135)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)

TASK REQUIREMENTS (from MASTER_ROADMAP.md):
- Task ID: ST-001
- Action: Create single accurate `.env.example`, delete all others
- Impact: Improved developer onboarding
- Estimate: 1 hour

IMPLEMENTATION DETAILS:
- Audit all .env* files in repository
- Create single accurate .env.example
- Document all required environment variables
- Delete redundant .env variants (.env.backup, .env.local, etc.)
- Create environment variable validation
- Update deployment documentation
- Ensure .env is properly gitignored

DELIVERABLES:
- Single .env.example file (comprehensive)
- Environment variable validation (with tests)
- ENVIRONMENT_VARIABLES.md (documentation)
- Updated deployment docs
- Updated MASTER_ROADMAP.md (mark ST-001 complete)
- Session file in docs/sessions/completed/

BEFORE REPORTING DONE:
- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated (ST-001 marked complete)
- [ ] Session archived

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.
```

---

## Coordination Summary (CORRECTED)

### Module Assignments (No Conflicts)

| Agent   | Task ID    | Module            | Files                          | Branch                                         |
| ------- | ---------- | ----------------- | ------------------------------ | ---------------------------------------------- |
| Agent 1 | **ST-002** | Error Handling    | `server/_core/errorHandler.ts` | `claude/ST-002-error-handling-Session-[ID]`    |
| Agent 2 | **ST-006** | Dead Code Removal | `server/routers/*`, dead files | `claude/ST-006-dead-code-Session-[ID]`         |
| Agent 3 | **ST-001** | Environment       | `.env.example`, root files     | `claude/ST-001-env-consolidation-Session-[ID]` |

### Task Details from MASTER_ROADMAP.md

**ST-001: Consolidate .env Files** (Line 135-139)

- Priority: 🟡 MEDIUM
- Estimate: 1 hour
- Impact: Improved developer onboarding

**ST-002: Implement Global Error Handling** (Line 141-145)

- Priority: 🟡 MEDIUM
- Estimate: 3-4 hours
- Impact: Better error tracking and debugging

**ST-006: Remove Dead Code** (Line 165-179)

- Priority: 🟡 MEDIUM
- Estimate: 3-4 hours
- Impact: Reduced codebase complexity
- Note: 29 unused routers need investigation

### Expected Timeline

- **Agent 1 (ST-002):** 3-4 hours
- **Agent 2 (ST-006):** 3-4 hours
- **Agent 3 (ST-001):** 1 hour

### Conflict Prevention

**No conflicts expected** because:

- Agent 1: Works in `server/_core/errorHandler.ts` (new file)
- Agent 2: Works in `server/routers/*` and dead files (removal)
- Agent 3: Works in root `.env` files (different area)

**If conflict occurs:**

1. Agent pulls latest: `git pull --rebase origin main`
2. Resolves conflicts locally
3. Runs tests to verify
4. Pushes resolved version

### Communication Protocol

**Each agent MUST:**

1. Register in ACTIVE_SESSIONS.md immediately
2. Push to GitHub every 30 minutes
3. Update session file with progress
4. Check for updates before each push
5. Mark correct task ID "in progress" in MASTER_ROADMAP.md

### Success Criteria (All Agents)

- ✅ All tests passing (no regressions)
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ Comprehensive documentation
- ✅ Merged to main
- ✅ Roadmap updated (correct task ID marked complete)
- ✅ Session archived

---

## CORRECTION SUMMARY

**What Changed:**

- ❌ OLD: Agent 1 = ST-005 (error handling) - WRONG
- ✅ NEW: Agent 1 = ST-002 (error handling) - CORRECT

- ❌ OLD: Agent 2 = ST-006 (logging) - WRONG
- ✅ NEW: Agent 2 = ST-006 (dead code removal) - CORRECT

- ✅ Agent 3 = ST-001 (env consolidation) - UNCHANGED (was correct)

**Why This Matters:**

- MASTER_ROADMAP.md is the Single Source of Truth
- Task IDs must match exactly
- Agents correctly caught this protocol violation
- This demonstrates proper protocol compliance

**Ready to start all 3 agents with CORRECTED prompts!**
