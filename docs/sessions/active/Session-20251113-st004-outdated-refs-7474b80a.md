# Session: ST-004 Remove Outdated References

**Session ID:** Session-20251113-st004-outdated-refs-7474b80a
**Task ID:** ST-004
**Branch:** claude/ST-004-outdated-refs-Session-20251113-st004-outdated-refs-7474b80a
**Agent:** Agent 3 (Parallel Development)
**Started:** 2025-11-13
**Status:** 🟢 IN PROGRESS

---

## Task Overview

**Goal:** Remove all Railway and Butterfly Effect references from the TERP codebase

**Priority:** 🟡 MEDIUM

**Estimate:** 1-2 hours

**Impact:** Reduced confusion from outdated deployment platform and old project name references

---

## Parallel Coordination

- **Agent 1:** ST-006 Remove Dead Code (server/routers/, dead files)
- **Agent 2:** ST-003 Consolidate Documentation (docs/ files)
- **Agent 3 (This Session):** ST-004 Remove Outdated References (codebase-wide)

**Potential Conflicts:** Minimal - different focus areas. May coordinate on docs/ if needed.

---

## Implementation Plan

### Step 1: Search for Railway References (30 min)
- Search entire codebase for "Railway" (case-insensitive)
- Document all occurrences with file paths and line numbers
- Categorize by type (code, docs, config)

### Step 2: Search for Butterfly Effect References (30 min)
- Search entire codebase for "Butterfly Effect" and "butterfly-effect" (case-insensitive)
- Document all occurrences with file paths and line numbers
- Categorize by type (code, docs, config)

### Step 3: Create Removal Plan (15 min)
- List all files requiring changes
- Determine replacement text:
  - Railway → DigitalOcean (deployment context)
  - Butterfly Effect → TERP (project name)
- Document findings in removal report

### Step 4: Remove References Systematically (30-45 min)
- Update files with proper replacements
- Remove Railway-specific configurations
- Update deployment documentation
- Fix package.json and other configs if needed

### Step 5: Verify No Breakage (15 min)
- Run `pnpm check` (TypeScript validation)
- Run `pnpm test` (all tests must pass)
- Verify no broken imports or references

### Step 6: Documentation (15 min)
- Create OUTDATED_REFERENCES_REMOVAL_REPORT.md
- List all changes made
- Document search patterns used
- Include before/after examples

---

## Progress Log

### 2025-11-13 - Session Start
- ✅ Pre-Flight Check complete
- ✅ Reviewed AGENT_ONBOARDING.md
- ✅ Checked ACTIVE_SESSIONS.md (no conflicts)
- ✅ Read MASTER_ROADMAP.md (ST-004 details)
- ✅ Created session file
- ✅ Created feature branch
- 🔄 Starting Phase 2: Session Startup

**Next:** Update ACTIVE_SESSIONS.md and MASTER_ROADMAP.md, then begin development

---

## Deliverables

- [ ] Updated codebase (no Railway/Butterfly Effect references)
- [ ] OUTDATED_REFERENCES_REMOVAL_REPORT.md
- [ ] Updated MASTER_ROADMAP.md (mark ST-004 complete)
- [ ] Session file archived to docs/sessions/completed/

---

## Quality Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] Zero TypeScript errors (`pnpm check`)
- [ ] No TODO, FIXME, or placeholder comments
- [ ] Pre-commit hooks pass
- [ ] Documentation complete
- [ ] Changes pushed to GitHub
- [ ] Merged to main
- [ ] Roadmap updated

---

**Last Updated:** 2025-11-13 (Session Startup)
