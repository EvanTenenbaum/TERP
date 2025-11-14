# Parallel Agent Prompts - Batch 2

**Date:** November 13, 2025  
**Batch:** 3 parallel agents  
**Coordination:** Independent modules, no conflicts expected  
**Previous Batch:** 2/3 completed (ST-001 ✅, ST-002 ✅, ST-006 ❌)

---

## Agent 1: Remove Dead Code (ST-006) - RETRY

### Prompt

````
You are Agent 1 of 3 parallel agents working on the TERP project.

TASK: ST-006 - Remove Dead Code (RETRY - previous agent failed to start)
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Dead code removal (server/routers/, unused files)

⚠️ IMPORTANT: Previous agent assigned to this task NEVER STARTED WORK. You are starting fresh.

PARALLEL WORK COORDINATION:
- Agent 2 is working on: ST-003 Consolidate Documentation (docs/ files)
- Agent 3 is working on: ST-004 Remove Outdated References (codebase-wide search/replace)
- NO CONFLICTS EXPECTED - You work on different files

MANDATORY FIRST STEPS:
1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-006 task - line 190-204)
5. Confirm you understand ALL protocols before proceeding
6. IMMEDIATELY create session file to confirm you've started

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
   Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
   Phase 2: Session Startup (create session file, branch, update roadmap) - DO THIS IMMEDIATELY
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
4. Mark ST-006 "in progress" in MASTER_ROADMAP.md (line 190)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)

⚠️ CRITICAL: Complete steps 1-5 within 15 minutes to confirm you've started work!

TASK REQUIREMENTS (from MASTER_ROADMAP.md line 190-204):
- Task ID: ST-006
- **Verified Dead Code:**
  - `server/cogsManagement.ts` (exists at 3.2 KB, verify unused)
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

IMPLEMENTATION STEPS:

**Step 1: Verify cogsManagement.ts is unused (30 min)**
```bash
# Check for imports
grep -r "import.*cogsManagement" server/ src/
grep -r "from.*cogsManagement" server/ src/
grep -r "cogsManagement" server/ src/ --exclude="*.test.ts"

# If no results, it's safe to delete
````

**Step 2: Identify unused routers (1 hour)**

```bash
# List all router files
ls server/routers/*.ts | grep -v ".test.ts"

# Check which are imported in server/routers.ts
cat server/routers.ts

# For each router NOT in routers.ts, verify no imports:
grep -r "import.*routerName" server/ src/
```

**Step 3: Create deletion list for review (30 min)**

- Document all files to be deleted
- Include verification commands run
- Get user approval before deletion

**Step 4: Delete verified dead code (30 min)**

- Delete files
- Run `pnpm check` (verify no TypeScript errors)
- Run `pnpm test` (verify no test failures)
- Commit with detailed message

**Step 5: Documentation (30 min)**

- Create DEAD_CODE_REMOVAL_REPORT.md
- List all deleted files
- Document verification process
- Include before/after metrics

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

⚠️ CRITICAL SUCCESS FACTOR: Create session file within 15 minutes to prove you've started!

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and IMMEDIATELY creating your session file.

```

---

## Agent 2: Consolidate Documentation (ST-003)

### Prompt

```

You are Agent 2 of 3 parallel agents working on the TERP project.

TASK: ST-003 - Consolidate Documentation
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Documentation organization (docs/ directory)

PARALLEL WORK COORDINATION:

- Agent 1 is working on: ST-006 Remove Dead Code (server/routers/, dead files)
- Agent 3 is working on: ST-004 Remove Outdated References (codebase-wide search/replace)
- NO CONFLICTS EXPECTED - You work on different files

MANDATORY FIRST STEPS:

1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-003 task - line 172-176)
5. Confirm you understand ALL protocols before proceeding

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
Phase 2: Session Startup (create session file, branch, update roadmap)
Phase 3: Development (frequent commits)
Phase 4: Completion (merge to main, update roadmap, archive session)

✅ All tests must pass before ANY commit
✅ No 'any' types allowed
✅ All files must be <500 lines
✅ No TODO, FIXME, or placeholder code
✅ Pre-commit hooks must pass (NEVER use --no-verify)
✅ Push to GitHub every 30 minutes minimum
✅ Update session file with progress every 30 minutes

PARALLEL COORDINATION PROTOCOL:

1. Create session file: docs/sessions/active/Session-[YOUR-ID]-ST-003-doc-consolidation.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/ST-003-doc-consolidation-Session-[YOUR-ID]
4. Mark ST-003 "in progress" in MASTER_ROADMAP.md (line 172)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)

TASK REQUIREMENTS (from MASTER_ROADMAP.md line 172-176):

- Task ID: ST-003
- Action: Move 60+ markdown files to `docs/archive/`
- Impact: Cleaner documentation structure
- Estimate: 2 hours

IMPLEMENTATION STEPS:

**Step 1: Audit current documentation (30 min)**

```bash
# Count markdown files in docs/
find docs/ -name "*.md" -type f | wc -l

# List all markdown files
find docs/ -name "*.md" -type f | sort

# Identify which should be archived (old, outdated, superseded)
```

**Step 2: Create archive structure (15 min)**

```bash
# Create archive directory
mkdir -p docs/archive/

# Consider subdirectories for organization:
# docs/archive/old-reports/
# docs/archive/deprecated/
# docs/archive/historical/
```

**Step 3: Identify files to archive (45 min)**

**KEEP (Active Documentation):**

- MASTER_ROADMAP.md (single source of truth)
- ACTIVE_SESSIONS.md (current work tracking)
- AGENT_ONBOARDING.md (agent protocols)
- ENVIRONMENT_VARIABLES.md (just created by Agent 3)
- ERROR_HANDLING_GUIDE.md (just created by Agent 1)
- ABSTRACTION_LAYER_GUIDE.md (recently created)
- Any recent completion reports (last 7 days)

**ARCHIVE (Outdated/Historical):**

- Old QA reports (if superseded by newer ones)
- Deprecated guides
- Historical session files (>30 days old)
- Duplicate documentation
- Outdated roadmaps (if any exist besides MASTER_ROADMAP.md)

**Step 4: Move files to archive (30 min)**

```bash
# Use git mv to preserve history
git mv docs/old-file.md docs/archive/old-file.md

# Commit frequently
git commit -m "docs: Archive old-file.md"
```

**Step 5: Update references (30 min)**

- Search for links to archived files
- Update or remove broken links
- Add redirect notes if needed

**Step 6: Create archive index (15 min)**

- Create docs/archive/README.md
- List all archived files with dates
- Explain archive organization

DELIVERABLES:

- docs/archive/ directory with organized archived files
- docs/archive/README.md (index of archived files)
- Updated links in active documentation
- DOCUMENTATION_CONSOLIDATION_REPORT.md
- Updated MASTER_ROADMAP.md (mark ST-003 complete)
- Session file in docs/sessions/completed/

BEFORE REPORTING DONE:

- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated (ST-003 marked complete)
- [ ] Session archived

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.

```

---

## Agent 3: Remove Outdated References (ST-004)

### Prompt

```

You are Agent 3 of 3 parallel agents working on the TERP project.

TASK: ST-004 - Remove Outdated References
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Codebase-wide cleanup (search and replace)

PARALLEL WORK COORDINATION:

- Agent 1 is working on: ST-006 Remove Dead Code (server/routers/, dead files)
- Agent 2 is working on: ST-003 Consolidate Documentation (docs/ files)
- POTENTIAL MINOR CONFLICTS: You all touch different areas, but coordinate on docs/

MANDATORY FIRST STEPS:

1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-004 task - line 178-182)
5. Confirm you understand ALL protocols before proceeding

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
Phase 2: Session Startup (create session file, branch, update roadmap)
Phase 3: Development (frequent commits)
Phase 4: Completion (merge to main, update roadmap, archive session)

✅ All tests must pass before ANY commit
✅ No 'any' types allowed
✅ All files must be <500 lines
✅ No TODO, FIXME, or placeholder code
✅ Pre-commit hooks must pass (NEVER use --no-verify)
✅ Push to GitHub every 30 minutes minimum
✅ Update session file with progress every 30 minutes

PARALLEL COORDINATION PROTOCOL:

1. Create session file: docs/sessions/active/Session-[YOUR-ID]-ST-004-outdated-refs.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/ST-004-outdated-refs-Session-[YOUR-ID]
4. Mark ST-004 "in progress" in MASTER_ROADMAP.md (line 178)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)
7. Coordinate with Agent 2 if both touching docs/ files

TASK REQUIREMENTS (from MASTER_ROADMAP.md line 178-182):

- Task ID: ST-004
- Action: Remove all Railway and Butterfly Effect references
- Impact: Reduced confusion
- Estimate: 1-2 hours

IMPLEMENTATION STEPS:

**Step 1: Search for Railway references (30 min)**

```bash
# Search for Railway mentions
grep -r "Railway" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "railway" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "RAILWAY" . --exclude-dir=node_modules --exclude-dir=.git

# Common Railway patterns:
# - railway.app URLs
# - Railway deployment configs
# - Railway environment variables
# - Railway CLI commands
```

**Step 2: Search for Butterfly Effect references (30 min)**

```bash
# Search for Butterfly Effect mentions
grep -r "Butterfly Effect" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "butterfly-effect" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "butterflyeffect" . --exclude-dir=node_modules --exclude-dir=.git

# Common patterns:
# - Old project name references
# - URLs or domains
# - Package names
# - Comments or documentation
```

**Step 3: Create removal plan (15 min)**

- List all files with outdated references
- Categorize by type (code, docs, config)
- Determine replacement text (if any)
- Document findings

**Step 4: Remove references systematically (30-45 min)**

**For Railway:**

- Replace with "DigitalOcean" where deployment is mentioned
- Remove Railway-specific configs
- Update deployment documentation

**For Butterfly Effect:**

- Replace with "TERP" (current project name)
- Update any old URLs
- Fix package.json if needed

**Step 5: Verify no breakage (15 min)**

```bash
# Run tests
pnpm test

# Check TypeScript
pnpm check

# Verify app still runs
pnpm dev (quick check)
```

**Step 6: Documentation (15 min)**

- Create OUTDATED_REFERENCES_REMOVAL_REPORT.md
- List all changes made
- Document search patterns used
- Include before/after examples

DELIVERABLES:

- Updated codebase (no Railway/Butterfly Effect references)
- OUTDATED_REFERENCES_REMOVAL_REPORT.md (documentation)
- Updated MASTER_ROADMAP.md (mark ST-004 complete)
- Session file in docs/sessions/completed/

COORDINATION WITH AGENT 2:

- Agent 2 is moving docs to archive
- You are updating references in active docs
- If conflict: Agent 2 moves first, you update after
- Communicate via git commits and session files

BEFORE REPORTING DONE:

- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated (ST-004 marked complete)
- [ ] Session archived

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.

```

---

## Coordination Summary - Batch 2

### Module Assignments (Minimal Conflicts)

| Agent | Task ID | Module | Files | Branch |
|-------|---------|--------|-------|--------|
| Agent 1 | **ST-006** | Dead Code Removal | `server/routers/*`, `cogsManagement.ts` | `claude/ST-006-dead-code-Session-[ID]` |
| Agent 2 | **ST-003** | Doc Consolidation | `docs/*` → `docs/archive/` | `claude/ST-003-doc-consolidation-Session-[ID]` |
| Agent 3 | **ST-004** | Outdated References | Codebase-wide search/replace | `claude/ST-004-outdated-refs-Session-[ID]` |

### Potential Conflicts

**Minor conflict area: docs/ directory**
- Agent 2: Moving files to archive
- Agent 3: Updating references in files

**Resolution:**
- Agent 2 should complete moves first
- Agent 3 should pull latest before updating references
- Both should commit frequently
- If conflict: Agent 3 rebases on Agent 2's work

### Expected Timeline

- **Agent 1 (ST-006):** 3-4 hours
- **Agent 2 (ST-003):** 2 hours
- **Agent 3 (ST-004):** 1-2 hours

**Fastest completion:** Agent 3 (1-2 hours)
**Slowest completion:** Agent 1 (3-4 hours)

### Success Criteria (All Agents)

- ✅ All tests passing (no regressions)
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ Comprehensive documentation
- ✅ Merged to main
- ✅ Roadmap updated (correct task ID marked complete)
- ✅ Session archived
- ✅ Session file created within 15 minutes (especially Agent 1!)

### Communication Protocol

**Each agent MUST:**
1. Register in ACTIVE_SESSIONS.md immediately (within 15 minutes)
2. Push to GitHub every 30 minutes
3. Update session file with progress every 30 minutes
4. Check for updates before each push (git pull --rebase)
5. Mark correct task ID "in progress" in MASTER_ROADMAP.md

### Lessons from Batch 1

**What worked:**
- ✅ Clear task separation (no conflicts)
- ✅ Comprehensive prompts
- ✅ Protocol compliance by working agents

**What to improve:**
- ⚠️ Agent 1 (ST-006 retry) MUST create session file within 15 minutes
- ⚠️ More explicit "prove you've started" requirement
- ⚠️ Earlier check-in requirement

### Special Instructions for Agent 1 (ST-006 Retry)

**⚠️ CRITICAL: Previous agent failed to start work at all.**

You MUST:
1. Create session file within 15 minutes
2. Update ACTIVE_SESSIONS.md within 15 minutes
3. Push initial commit within 30 minutes
4. Provide status update every 30 minutes

This proves you've actually started work and aren't repeating the previous failure.

---

**Ready to start all 3 agents in Batch 2!**
```
