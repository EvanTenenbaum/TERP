# Parallel Agent Prompts - Batch 1

**Date:** November 13, 2025  
**Batch:** 3 parallel agents  
**Coordination:** Independent modules, no conflicts expected

---

## Agent 1: Error Handling Implementation (ST-005)

### Prompt

```
You are Agent 1 of 3 parallel agents working on the TERP project.

TASK: ST-005 - Implement Comprehensive Error Handling
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Error handling middleware (server/_core/)

PARALLEL WORK COORDINATION:
- Agent 2 is working on: Request/Response Logging (server/_core/logging.ts)
- Agent 3 is working on: Environment File Consolidation (root .env files)
- NO CONFLICTS EXPECTED - You work on different files

MANDATORY FIRST STEPS:
1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-005 task)
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
1. Create session file: docs/sessions/active/Session-[YOUR-ID]-error-handling.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/error-handling-Session-[YOUR-ID]
4. Mark task "in progress" in MASTER_ROADMAP.md
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)

TASK REQUIREMENTS:
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
- Updated MASTER_ROADMAP.md
- Session file in docs/sessions/completed/

BEFORE REPORTING DONE:
- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated
- [ ] Session archived

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.
```

---

## Agent 2: Request/Response Logging (ST-006)

### Prompt

```
You are Agent 2 of 3 parallel agents working on the TERP project.

TASK: ST-006 - Add Request/Response Logging
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Logging middleware (server/_core/)

PARALLEL WORK COORDINATION:
- Agent 1 is working on: Error Handling (server/_core/errorHandler.ts)
- Agent 3 is working on: Environment File Consolidation (root .env files)
- NO CONFLICTS EXPECTED - You work on different files

MANDATORY FIRST STEPS:
1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-006 task)
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
1. Create session file: docs/sessions/active/Session-[YOUR-ID]-logging.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/logging-Session-[YOUR-ID]
4. Mark task "in progress" in MASTER_ROADMAP.md
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)

TASK REQUIREMENTS:
- Create server/_core/logger.ts
- Implement request/response logging middleware
- Add structured logging with context (user, request ID, etc.)
- Include performance metrics (response time)
- Create comprehensive tests (TDD)
- Document logging patterns and best practices
- Replace console.log usage with proper logger

DELIVERABLES:
- logger.ts (<500 lines)
- logger.test.ts (100% test coverage)
- LOGGING_GUIDE.md (documentation)
- Updated MASTER_ROADMAP.md
- Session file in docs/sessions/completed/

BEFORE REPORTING DONE:
- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated
- [ ] Session archived

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.
```

---

## Agent 3: Environment File Consolidation (ST-001)

### Prompt

```
You are Agent 3 of 3 parallel agents working on the TERP project.

TASK: ST-001 - Consolidate .env Files
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Environment configuration (root .env files)

PARALLEL WORK COORDINATION:
- Agent 1 is working on: Error Handling (server/_core/errorHandler.ts)
- Agent 2 is working on: Request/Response Logging (server/_core/logger.ts)
- NO CONFLICTS EXPECTED - You work on different files

MANDATORY FIRST STEPS:
1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-001 task)
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
1. Create session file: docs/sessions/active/Session-[YOUR-ID]-env-consolidation.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/env-consolidation-Session-[YOUR-ID]
4. Mark task "in progress" in MASTER_ROADMAP.md
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)

TASK REQUIREMENTS:
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
- Updated MASTER_ROADMAP.md
- Session file in docs/sessions/completed/

BEFORE REPORTING DONE:
- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated
- [ ] Session archived

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.
```

---

## Coordination Summary

### Module Assignments (No Conflicts)

| Agent   | Module         | Files                          | Branch                                  |
| ------- | -------------- | ------------------------------ | --------------------------------------- |
| Agent 1 | Error Handling | `server/_core/errorHandler.ts` | `claude/error-handling-Session-[ID]`    |
| Agent 2 | Logging        | `server/_core/logger.ts`       | `claude/logging-Session-[ID]`           |
| Agent 3 | Environment    | `.env.example`, root files     | `claude/env-consolidation-Session-[ID]` |

### Expected Timeline

- **Phase 1-2:** 30 minutes each (setup)
- **Phase 3:** 2-4 hours (development)
- **Phase 4:** 30 minutes (completion)
- **Total:** 3-5 hours per agent

### Conflict Prevention

**No conflicts expected** because:

- Agent 1: Works in `server/_core/errorHandler.ts` (new file)
- Agent 2: Works in `server/_core/logger.ts` (new file)
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
5. Mark task "in progress" in MASTER_ROADMAP.md

### Success Criteria (All Agents)

- ✅ All tests passing (no regressions)
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ Comprehensive documentation
- ✅ Merged to main
- ✅ Roadmap updated
- ✅ Session archived

---

**Ready to start all 3 agents in parallel!**
