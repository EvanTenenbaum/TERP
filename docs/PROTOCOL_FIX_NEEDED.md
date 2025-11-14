# Protocol Fix Needed: Agents Not Updating Roadmap

**Date:** November 14, 2025  
**Issue:** Agents completing tasks but not updating the roadmap  
**Impact:** Manual intervention required to track progress

---

## Problem

Agents completed QA-001 and QA-005 but:

1. ❌ Created PRs instead of pushing directly to main
2. ❌ Did not update roadmap status to "Complete"
3. ❌ Left tasks showing "In Progress" or "Not Started"

This defeats the purpose of the self-managing roadmap system.

---

## Root Cause

The protocol in `docs/ROADMAP_AGENT_GUIDE.md` was recently updated to say "push to main" but:

1. **Agents may have cached old instructions** that said "create PR"
2. **The prompt template still had PR language** (now fixed)
3. **Individual task prompts may still reference PRs** (partially fixed)

---

## What Should Happen

When an agent completes a task, it should:

1. ✅ Update `docs/roadmaps/MASTER_ROADMAP.md`
   - Change status from "Not Started" → "✅ Complete (YYYY-MM-DD)"
   - Add resolution summary
   - Reference completion report

2. ✅ Push directly to main
   - No PRs
   - No waiting for human review
   - Immediate integration

3. ✅ Archive session file
   - Move from `docs/sessions/active/` to `docs/sessions/completed/`

---

## Fixes Applied

### ✅ Already Fixed

- Updated `docs/ROADMAP_AGENT_GUIDE.md` to say "push to main"
- Updated `docs/templates/PROMPT_TEMPLATE.md` to remove PR language
- Updated existing task prompts (ST-005, ST-007, ST-008, ST-009, ST-010, TEST-001)
- Removed `.claude/` directory (platform-agnostic)

### ⚠️ Still Needed

- **Update all QA task prompts** (QA-001 through QA-027) to:
  - Remove PR language
  - Add explicit "Update roadmap status" step
  - Add example of roadmap update

---

## Immediate Action Required

Before starting more agents, update all QA task prompts to include:

```markdown
### Step 4.3: Update Roadmap Status

Edit `docs/roadmaps/MASTER_ROADMAP.md` and update your task:

**Before:**
```

**Priority:** P0 | **Status:** Not Started | **Effort:** 4-8h

```

**After:**
```

**Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-8h

**Resolution:** [Brief summary of what was done]
See docs/[TASK-ID]-COMPLETION-REPORT.md for details.

````

### Step 4.4: Push to Main

```bash
git add -A
git commit -m "Complete [TASK-ID]: [Brief description]"
git push origin main
````

**DO NOT create a pull request.**

```

---

## Prevention

1. **Generate prompts programmatically** from templates
2. **Validate prompts** before agents use them
3. **Add roadmap update to completion checklist** in every prompt
4. **Test with one agent** before spinning up parallel agents

---

## Status

- ✅ Roadmap manually updated for QA-001 and QA-005
- ✅ PRs merged
- ⚠️ Protocol documentation updated but not all prompts
- ❌ QA task prompts not yet updated

**Next:** Update all QA task prompts before starting Agent 1-6.
```
