# Roadmap Add-Task System - Adversarial QA

**Date:** 2025-11-13  
**Target:** ROADMAP_ADD_TASK_SYSTEM.md design

---

## 🔴 Critical Issues (15)

### 1. **Agent Can Still Manually Edit**

**Problem:** Nothing physically prevents agent from editing MASTER_ROADMAP.md directly.  
**Attack:** Agent ignores documentation, edits file, pre-commit catches it but agent uses `--no-verify`.  
**Impact:** 🔴 HIGH - Bypasses entire system  
**Fix:** Make pre-commit hook un-bypassable OR make roadmap read-only except via script

### 2. **Wizard Can Be Interrupted**

**Problem:** Agent can Ctrl+C out of wizard mid-way.  
**Attack:** Start wizard, realize it's tedious, quit, manually edit instead.  
**Impact:** 🔴 HIGH - Incomplete task added  
**Fix:** Save progress, allow resume OR warn on interrupt

### 3. **No Validation of Implementation Guide Content**

**Problem:** Agent can write garbage in implementation guide.  
**Attack:** Fill with "TODO" or copy-paste unrelated content.  
**Impact:** 🔴 MEDIUM - Unusable prompt for future agents  
**Fix:** Validate implementation guide has minimum sections (Setup, Implementation, Testing)

### 4. **Circular Dependency Not Caught in Wizard**

**Problem:** Wizard validates dependencies exist, but not circular deps.  
**Attack:** Add ST-013 depends on ST-014, later add ST-014 depends on ST-013.  
**Impact:** 🔴 MEDIUM - Blocks both tasks  
**Fix:** Check for circular deps in wizard Step 6

### 5. **Agent Can Add Duplicate Task ID**

**Problem:** Wizard validates ID doesn't exist, but race condition possible.  
**Attack:** Two agents add same ID simultaneously.  
**Impact:** 🔴 MEDIUM - Duplicate IDs in roadmap  
**Fix:** Lock file during wizard, or use git lock

### 6. **No Validation That Objectives Are Meaningful**

**Problem:** Agent can enter "Objective 1", "Objective 2", "Objective 3".  
**Attack:** Lazy agent fills minimum required fields with garbage.  
**Impact:** 🔴 MEDIUM - Unusable task definition  
**Fix:** Validate objectives are >20 characters, different from each other

### 7. **Estimate Can Be Unrealistic**

**Problem:** Wizard validates format but not reasonableness.  
**Attack:** Agent enters "1000h" or "1m" (1 minute).  
**Impact:** 🟡 LOW - Bad capacity calculation  
**Fix:** Validate estimate range (1h - 4w reasonable)

### 8. **Module Path Can Be Fake**

**Problem:** Wizard only warns if path doesn't exist.  
**Attack:** Agent enters "fake/path/file.ts" and ignores warning.  
**Impact:** 🟡 LOW - Confusing for future agents  
**Fix:** Require confirmation if path doesn't exist

### 9. **Dependencies Can Be Inappropriate**

**Problem:** Wizard validates IDs exist, not that dependency makes sense.  
**Attack:** Add "depends on ST-001" for every task.  
**Impact:** 🟡 LOW - Incorrect dependency graph  
**Fix:** Can't validate automatically, rely on code review

### 10. **Wizard Doesn't Check ACTIVE_SESSIONS.md**

**Problem:** Agent adds task while another agent working on conflicting module.  
**Attack:** Agent 1 working on `orders.ts`, Agent 2 adds task for `orders.ts`.  
**Impact:** 🔴 MEDIUM - Merge conflicts guaranteed  
**Fix:** Check ACTIVE_SESSIONS.md, warn if module conflict

### 11. **No Rollback on Validation Failure**

**Problem:** Wizard adds task to roadmap, then validation fails.  
**Attack:** Wizard bug causes invalid task to be added.  
**Impact:** 🔴 HIGH - Corrupted roadmap  
**Fix:** Validate BEFORE adding to roadmap, not after

### 12. **Agent Can Skip Commit**

**Problem:** Wizard adds task but agent doesn't commit.  
**Attack:** Agent forgets to commit, changes lost.  
**Impact:** 🟡 MEDIUM - Wasted work  
**Fix:** Wizard auto-commits OR reminds agent

### 13. **No Undo Command**

**Problem:** Agent adds wrong task, no easy way to remove.  
**Attack:** Agent makes mistake, has to manually edit roadmap.  
**Impact:** 🟡 LOW - Frustrating UX  
**Fix:** Add `pnpm roadmap:remove-task ST-XXX`

### 14. **Prompt File Can Be Orphaned**

**Problem:** Agent deletes task from roadmap but not prompt file.  
**Attack:** Manual edit removes task, prompt file remains.  
**Impact:** 🟡 LOW - Clutter in docs/prompts/  
**Fix:** Validation checks all prompt files have corresponding tasks

### 15. **CI/CD Check Can Be Disabled**

**Problem:** User can disable GitHub Actions.  
**Attack:** User turns off CI/CD, invalid roadmaps merge.  
**Impact:** 🔴 MEDIUM - Validation bypassed  
**Fix:** Make CI/CD required status check (GitHub settings)

---

## 🟡 Design Flaws (12)

### 16. **Wizard is Linear (Can't Go Back)**

**Problem:** Agent makes mistake in Step 3, has to restart entire wizard.  
**Impact:** 🟡 MEDIUM - Frustrating UX  
**Fix:** Allow "back" command to return to previous step

### 17. **No Draft Mode**

**Problem:** Agent wants to create task but not ready to commit.  
**Impact:** 🟡 LOW - Forces premature decisions  
**Fix:** Add `--draft` flag, saves to separate file

### 18. **No Bulk Add**

**Problem:** Agent needs to add 5 related tasks, runs wizard 5 times.  
**Impact:** 🟡 LOW - Tedious for large additions  
**Fix:** Add `--batch` mode or YAML import

### 19. **Wizard Doesn't Suggest Next ID**

**Problem:** Agent has to manually check what ID to use.  
**Impact:** 🟢 MINOR - Small friction  
**Fix:** Auto-suggest next available ID (already in design)

### 20. **No Task Editing Command**

**Problem:** Agent wants to update estimate, has to manually edit.  
**Impact:** 🟡 MEDIUM - Encourages manual editing  
**Fix:** Add `pnpm roadmap:edit-task ST-XXX`

### 21. **Implementation Guide Editor Not Specified**

**Problem:** "Open editor" - which editor? Vim? Nano? VS Code?  
**Impact:** 🟡 LOW - Confusing for agent  
**Fix:** Use $EDITOR env var, default to nano

### 22. **No Validation of Deliverables Format**

**Problem:** Agent can enter deliverables without action verbs.  
**Impact:** 🟡 LOW - Poor quality deliverables  
**Fix:** Suggest starting with verbs (Create, Update, Fix, etc.)

### 23. **Wizard Doesn't Show Examples**

**Problem:** Agent doesn't know what good objectives look like.  
**Impact:** 🟡 MEDIUM - Low quality task definitions  
**Fix:** Show example after each prompt

### 24. **No Task Preview Before Adding**

**Problem:** Step 10 shows text, but not formatted roadmap entry.  
**Impact:** 🟢 MINOR - Hard to visualize  
**Fix:** Render markdown preview

### 25. **Wizard Doesn't Check Git Status**

**Problem:** Agent has uncommitted changes, wizard adds more.  
**Impact:** 🟡 LOW - Messy git history  
**Fix:** Warn if working directory dirty

### 26. **No Autocomplete for Dependencies**

**Problem:** Agent has to remember exact task IDs.  
**Impact:** 🟢 MINOR - Small friction  
**Fix:** Show list of available task IDs

### 27. **Wizard Doesn't Validate Against Existing Titles**

**Problem:** Agent adds "Fix Bug" when "Fix Bug in Orders" already exists.  
**Impact:** 🟡 LOW - Confusing duplicate titles  
**Fix:** Warn if title similar to existing

---

## ⚡ Performance Issues (3)

### 28. **Wizard Parses Roadmap Multiple Times**

**Problem:** Each validation step re-parses entire roadmap.  
**Impact:** 🟡 LOW - Slow for large roadmaps  
**Fix:** Parse once, cache result

### 29. **Validation Runs Twice (Wizard + Pre-commit)**

**Problem:** Wizard validates, then pre-commit validates again.  
**Impact:** 🟢 MINOR - Redundant work  
**Fix:** Skip validation in pre-commit if wizard just ran

### 30. **No Progress Indicator**

**Problem:** Agent doesn't know how many steps remain.  
**Impact:** 🟢 MINOR - Unclear UX  
**Fix:** Show "Step 3 of 12" in prompts

---

## 🟢 Minor Issues (8)

### 31. **No Help Command**

**Problem:** Agent forgets wizard workflow.  
**Fix:** Add `pnpm roadmap:add-task --help`

### 32. **No Dry Run Mode**

**Problem:** Agent wants to test wizard without adding task.  
**Fix:** Add `--dry-run` flag

### 33. **Error Messages Not Actionable**

**Problem:** "Invalid format" - what's the correct format?  
**Fix:** Include examples in error messages

### 34. **No Logging**

**Problem:** Can't debug wizard issues.  
**Fix:** Log to `.roadmap-wizard.log`

### 35. **No Confirmation Email/Notification**

**Problem:** User doesn't know task was added.  
**Fix:** Optional: Send notification (out of scope)

### 36. **Wizard Doesn't Update ACTIVE_SESSIONS.md**

**Problem:** Agent adds task but forgets to register in active sessions.  
**Fix:** Prompt agent to register if deploying immediately

### 37. **No Task Statistics**

**Problem:** Agent doesn't know how many tasks in roadmap.  
**Fix:** Add `pnpm roadmap:stats` command

### 38. **No Search Command**

**Problem:** Agent can't find existing tasks easily.  
**Fix:** Add `pnpm roadmap:search <query>`

---

## 📊 Summary

**Total Issues:** 38  
**Critical:** 15 (🔴)  
**Design Flaws:** 12 (🟡)  
**Performance:** 3 (⚡)  
**Minor:** 8 (🟢)

---

## 🎯 Must-Fix Before Production (Top 10)

1. ✅ **#11:** Validate BEFORE adding to roadmap
2. ✅ **#1:** Make pre-commit hook un-bypassable (or roadmap read-only)
3. ✅ **#10:** Check ACTIVE_SESSIONS.md for conflicts
4. ✅ **#4:** Check circular dependencies in wizard
5. ✅ **#3:** Validate implementation guide content
6. ✅ **#6:** Validate objectives are meaningful
7. ✅ **#2:** Handle wizard interruption gracefully
8. ✅ **#5:** Prevent duplicate task IDs (locking)
9. ✅ **#15:** Make CI/CD required status check
10. ✅ **#20:** Add edit-task command (or agents will manually edit)

---

## 🔄 Recommended Improvements

**High Priority:**

- #16: Allow going back in wizard
- #23: Show examples in wizard
- #7: Validate estimate reasonableness

**Medium Priority:**

- #13: Add remove-task command
- #17: Add draft mode
- #25: Check git status before wizard

**Low Priority:**

- #18: Bulk add mode
- #37: Statistics command
- #38: Search command

---

**Next Step:** Fix top 10 critical issues and redesign system.
