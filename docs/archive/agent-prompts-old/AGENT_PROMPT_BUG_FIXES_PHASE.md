# Agent Prompt: Add Bug Fixes to Roadmap & Execute Per Protocol

**Date:** November 24, 2025  
**Agent Role:** Roadmap Manager & Execution Coordinator  
**Objective:** Add all bug fixes from the Next Phase Report to MASTER_ROADMAP.md and execute them according to established protocols

---

## 🎯 Your Mission

You are tasked with:

1. **Adding all bug fixes** from `docs/NEXT_PHASE_BUG_FIXES_REPORT_2025-11-24.md` to `docs/roadmaps/MASTER_ROADMAP.md`
2. **Creating agent prompts** for each task following the template in `docs/templates/PROMPT_TEMPLATE.md`
3. **Executing the fixes** in strategic waves according to the execution plan
4. **Following all protocols** defined in `docs/ROADMAP_AGENT_GUIDE.md`

---

## 📋 Step 1: Read Required Files

Before starting, you MUST read these files to understand the context and protocols:

1. **`docs/NEXT_PHASE_BUG_FIXES_REPORT_2025-11-24.md`** - Complete bug fixes report with all task details
2. **`docs/roadmaps/MASTER_ROADMAP.md`** - Current roadmap (read relevant sections)
3. **`docs/ROADMAP_AGENT_GUIDE.md`** - Your operating manual (read sections on adding tasks, updating status, validation)
4. **`docs/templates/TASK_TEMPLATE.md`** - Template for adding tasks to roadmap
5. **`docs/templates/PROMPT_TEMPLATE.md`** - Template for creating agent prompts

---

## 📝 Step 2: Add Tasks to MASTER_ROADMAP.md

### Task List to Add (from the report):

**Critical Priority (P0):**

1. BUG-012: Add Item Button Not Responding (Created: 2025-11-22)
2. BUG-013: Inventory Table Not Displaying Data (Created: 2025-11-22)

**High Priority (P1):** 3. BUG-011: Debug Dashboard Visible in Production (Created: 2025-11-22) 4. BUG-014: Todo Lists Page Returns 404 (Created: 2025-11-22) 5. QA-028: Fix Old Sidebar Navigation (Created: 2025-11-14) 6. QA-034: Fix Widget Visibility Disappearing (Created: 2025-11-14) 7. QA-044: Implement Event Invitation Workflow (Created: 2025-11-14) - ⚠️ Needs DB migration

**Medium Priority (P2):** 8. BUG-015: Cmd+K Command Palette Not Working (Created: 2025-11-22) 9. BUG-016: Theme Toggle Not Implemented (Created: 2025-11-22) 10. QA-036: Fix Time Period Filters on Widgets (Created: 2025-11-14) 11. QA-045: Link Events to Clients (Created: 2025-11-14)

**Prerequisites:**

- PREREQ-001: Apply Database Migration for QA-044 (Created: 2025-11-14)

### Instructions for Adding Tasks:

1. **Read the current MASTER_ROADMAP.md** to find the appropriate sections:
   - Critical bugs → "🔴 CRITICAL BUG FIXES" section
   - High priority → "🔴 HIGH PRIORITY" or "🔴 QA-IDENTIFIED HIGH PRIORITY BUGS" section
   - Medium priority → "🟡 QA-IDENTIFIED MEDIUM PRIORITY BUGS" section
   - Prerequisites → Create new "🔧 PREREQUISITES" section if needed

2. **For each task, use the format from TASK_TEMPLATE.md:**

   ```markdown
   - [ ] **BUG-XXX: Task Title** (Created: YYYY-MM-DD) 🔴 CRITICAL
     - Task ID: BUG-XXX
     - Priority: P0/P1/P2 (CRITICAL/HIGH/MEDIUM)
     - Session: TBD
     - **Problem:** [From report - detailed problem description]
     - **Current State:** [From report if available]
     - **Root Cause:** [From report - investigation needed if unknown]
     - **Impact:** [From report]
     - **Objectives:**
       1. [Objective 1]
       2. [Objective 2]
       3. [Objective 3]
     - **Deliverables:**
       - [ ] [Deliverable 1]
       - [ ] [Deliverable 2]
       - [ ] [Deliverable 3]
       - [ ] [Deliverable 4]
       - [ ] [Deliverable 5]
       - [ ] All tests passing
       - [ ] Zero TypeScript errors
       - [ ] Session archived
     - **Files to Check/Modify:** [From report]
     - **Estimate:** X-Y hours
     - **Status:** 📋 PLANNED
     - **Dependencies:** [From report]
     - **Prerequisites:** [From report]
   ```

3. **For tasks that already exist in roadmap (QA-028, QA-034, QA-036, QA-044, QA-045):**
   - **DO NOT** duplicate them
   - **UPDATE** their status if they're marked as complete but shouldn't be
   - **ENHANCE** their descriptions with details from the bug fixes report if missing
   - **VERIFY** they're in the correct priority section

4. **For PREREQ-001:**
   - Add to a new "🔧 PREREQUISITES & INFRASTRUCTURE" section
   - Mark as blocking QA-044
   - Include database migration instructions from the report

5. **After adding all tasks:**
   - Run validation: `pnpm roadmap:validate`
   - Fix any validation errors
   - Commit changes: `git add docs/roadmaps/MASTER_ROADMAP.md && git commit -m "Add bug fixes phase tasks to roadmap" && git push origin main`

---

## 📄 Step 3: Create Agent Prompts

For each NEW task (BUG-011, BUG-012, BUG-013, BUG-014, BUG-015, BUG-016, PREREQ-001), create a prompt file in `docs/prompts/` following `docs/templates/PROMPT_TEMPLATE.md`.

### Prompt Creation Checklist:

For each prompt file (`docs/prompts/BUG-XXX.md` or `docs/prompts/PREREQ-001.md`):

1. **Use PROMPT_TEMPLATE.md structure:**
   - Task ID and Title
   - Status, Priority, Estimate
   - Quick Summary
   - Objectives (minimum 3)
   - Deliverables (minimum 5)
   - Detailed Implementation Steps
   - Pre-flight Checks
   - Session Registration
   - Branch Creation
   - Development Steps
   - Completion Steps
   - Success Criteria

2. **Include all details from the bug fixes report:**
   - Problem description
   - Root cause (or investigation steps if unknown)
   - Files to check/modify
   - Expected behavior
   - Impact description

3. **For PREREQ-001 (Database Migration):**
   - Include exact migration commands from the report
   - Include verification steps
   - Include rollback plan
   - Mark as blocking QA-044

4. **Save prompts:**
   - `docs/prompts/BUG-011.md`
   - `docs/prompts/BUG-012.md`
   - `docs/prompts/BUG-013.md`
   - `docs/prompts/BUG-014.md`
   - `docs/prompts/BUG-015.md`
   - `docs/prompts/BUG-016.md`
   - `docs/prompts/PREREQ-001.md`

5. **Update roadmap task entries** to reference the prompts:
   - Add `- **Prompt:** \`docs/prompts/BUG-XXX.md\`` to each task

6. **Commit prompts:**
   ```bash
   git add docs/prompts/*.md
   git commit -m "Add agent prompts for bug fixes phase"
   git push origin main
   ```

---

## 🚀 Step 4: Execute According to Strategic Plan

### Execution Protocol:

Follow the execution plan from the bug fixes report:

#### Wave 1: Critical Blockers (P0) - Sequential

**Execute these FIRST to unblock workflows:**

1. **BUG-012: Add Item Button Not Responding**
   - Create session: `docs/sessions/active/Session-YYYYMMDD-BUG-012-<random>.md`
   - Create branch: `bug-012-add-item-button`
   - Follow prompt: `docs/prompts/BUG-012.md`
   - Complete all deliverables
   - Update roadmap status to `✅ COMPLETE`
   - Archive session
   - Deploy and verify

2. **BUG-013: Inventory Table Not Displaying Data**
   - Can run parallel with BUG-012 if different modules
   - Create session: `docs/sessions/active/Session-YYYYMMDD-BUG-013-<random>.md`
   - Create branch: `bug-013-inventory-table`
   - Follow prompt: `docs/prompts/BUG-013.md`
   - Complete all deliverables
   - Update roadmap status to `✅ COMPLETE`
   - Archive session
   - Deploy and verify

#### Wave 2: High Priority Fixes (P1) - Parallel Execution

**Execute these in parallel (3-4 agents):**

3. **PREREQ-001: Apply Database Migration for QA-044**
   - **MUST complete before QA-044**
   - Create session: `docs/sessions/active/Session-YYYYMMDD-PREREQ-001-<random>.md`
   - Follow prompt: `docs/prompts/PREREQ-001.md`
   - Apply migration: `drizzle/0036_add_event_invitations.sql`
   - Verify tables created
   - Update roadmap status
   - Archive session

4. **BUG-011: Debug Dashboard Visible in Production** (Quick win - 15-30min)
   - Create session and branch
   - Follow prompt: `docs/prompts/BUG-011.md`
   - Complete and deploy

5. **BUG-014: Todo Lists Page Returns 404**
   - **DECISION REQUIRED:** Implement feature or remove sidebar link?
   - If implementing: 8-16 hours
   - If removing link: 1-2 hours
   - Create session and branch
   - Follow prompt: `docs/prompts/BUG-014.md`
   - Complete and deploy

6. **QA-028: Fix Old Sidebar Navigation**
   - Check if already in roadmap (should be)
   - If not complete, create session and execute
   - Follow existing prompt or create new one

7. **QA-034: Fix Widget Visibility Disappearing**
   - Check if already in roadmap (should be)
   - If not complete, create session and execute
   - Follow existing prompt or create new one

8. **QA-044: Implement Event Invitation Workflow**
   - **MUST wait for PREREQ-001 completion**
   - Check roadmap status (should show incomplete - needs migration)
   - Apply database migration first (PREREQ-001)
   - Verify feature works
   - Update status to complete

#### Wave 3: Medium Priority Fixes (P2) - Parallel Execution

**Execute these in parallel (2-3 agents):**

9. **BUG-015: Cmd+K Command Palette Not Working**
   - Create session and branch
   - Follow prompt: `docs/prompts/BUG-015.md`
   - Complete and deploy

10. **BUG-016: Theme Toggle Not Implemented**
    - Create session and branch
    - Follow prompt: `docs/prompts/BUG-016.md`
    - Complete and deploy

11. **QA-036: Fix Time Period Filters on Widgets**
    - Check if already in roadmap (should be)
    - If not complete, create session and execute

12. **QA-045: Link Events to Clients**
    - Check if already in roadmap (should be)
    - If not complete, create session and execute

---

## ✅ Step 5: Execution Checklist for Each Task

For EVERY task you execute, follow this checklist:

### Pre-Execution:

- [ ] Read the task details in MASTER_ROADMAP.md
- [ ] Read the agent prompt file (`docs/prompts/TASK-ID.md`)
- [ ] Verify prerequisites are met (if any)
- [ ] Check dependencies are complete (if any)

### During Execution:

- [ ] Create session file: `docs/sessions/active/Session-YYYYMMDD-TASK-ID-<random>.md`
- [ ] Create feature branch: `git checkout -b task-id-description`
- [ ] Follow the prompt instructions step-by-step
- [ ] Update session file with progress
- [ ] Run tests: `pnpm test`
- [ ] Check TypeScript: `pnpm check`
- [ ] Validate roadmap: `pnpm roadmap:validate`

### Post-Execution:

- [ ] Update roadmap: Mark task as `✅ COMPLETE` with completion date
- [ ] Add key commits to roadmap entry
- [ ] Add actual time spent to roadmap entry
- [ ] Archive session: Move from `active/` to `archive/`
- [ ] Commit and push: `git add . && git commit -m "Complete TASK-ID: Description" && git push origin main`
- [ ] Verify deployment (if applicable)
- [ ] Update any related documentation

---

## 🛡️ Protocol Compliance

**CRITICAL:** You MUST follow these protocols:

1. **Roadmap Validation:**
   - Run `pnpm roadmap:validate` after EVERY roadmap change
   - Fix any errors before committing
   - Never commit invalid roadmap changes

2. **Session Management:**
   - Create session file BEFORE starting work
   - Update session file with progress
   - Archive session AFTER completion
   - Never leave orphaned sessions

3. **Branch Management:**
   - Create feature branch for each task
   - Use descriptive branch names: `bug-012-add-item-button`
   - Merge to main after completion
   - Delete branch after merge

4. **Documentation:**
   - Update roadmap with completion status
   - Add key commits and actual time
   - Archive sessions properly
   - Create completion reports if required

5. **Testing:**
   - Run tests before committing
   - Fix any test failures
   - Ensure TypeScript compiles without errors
   - Verify no regressions introduced

---

## 📊 Progress Tracking

After completing each wave, create a progress report:

1. **Wave 1 Completion Report:**
   - List completed tasks
   - Note any blockers or issues
   - Update roadmap statistics

2. **Wave 2 Completion Report:**
   - List completed tasks
   - Note any blockers or issues
   - Update roadmap statistics

3. **Wave 3 Completion Report:**
   - List completed tasks
   - Note any blockers or issues
   - Update roadmap statistics

4. **Final Summary:**
   - Total tasks completed
   - Total time spent
   - Any remaining issues
   - Recommendations for next phase

---

## 🚨 Important Notes

1. **QA-044 Database Migration:**
   - This is CRITICAL - the feature code is already deployed but non-functional
   - PREREQ-001 MUST be completed first
   - Follow the exact migration steps from the bug fixes report
   - Verify tables exist before marking QA-044 complete

2. **BUG-014 Decision:**
   - You need to decide: implement Todo Lists feature or remove sidebar link?
   - If implementing: This is a larger task (8-16 hours)
   - If removing link: Quick fix (1-2 hours)
   - Document your decision in the roadmap

3. **Existing QA Tasks:**
   - QA-028, QA-034, QA-036, QA-044, QA-045 already exist in roadmap
   - DO NOT duplicate them
   - UPDATE their status if needed
   - ENHANCE descriptions if missing details

4. **Parallel Execution:**
   - Wave 2 and Wave 3 can run in parallel
   - Ensure agents work on different modules to avoid conflicts
   - Coordinate through roadmap updates

5. **Validation:**
   - Run `pnpm roadmap:validate` after EVERY change
   - Never skip validation
   - Fix errors immediately

---

## 🎯 Success Criteria

You will have successfully completed this mission when:

- [ ] All 11 bug fixes added to MASTER_ROADMAP.md
- [ ] PREREQ-001 added to roadmap
- [ ] All new tasks have agent prompts created
- [ ] Roadmap validates without errors
- [ ] Wave 1 (Critical Blockers) completed
- [ ] Wave 2 (High Priority) completed
- [ ] Wave 3 (Medium Priority) completed
- [ ] All sessions archived
- [ ] All tasks marked complete in roadmap
- [ ] Final summary report created

---

## 📞 If You Need Help

- **Roadmap questions:** Read `docs/ROADMAP_AGENT_GUIDE.md`
- **Protocol questions:** Read `docs/ROADMAP_SYSTEM_GUIDE.md`
- **Template questions:** Read `docs/templates/TASK_TEMPLATE.md` and `docs/templates/PROMPT_TEMPLATE.md`
- **Validation errors:** Run `pnpm roadmap:validate` and fix errors
- **Execution issues:** Check session files and roadmap status

---

**Good luck! Follow the protocols, validate everything, and execute systematically.**

**Report Location:** `docs/NEXT_PHASE_BUG_FIXES_REPORT_2025-11-24.md`  
**Roadmap Location:** `docs/roadmaps/MASTER_ROADMAP.md`  
**Agent Guide:** `docs/ROADMAP_AGENT_GUIDE.md`
