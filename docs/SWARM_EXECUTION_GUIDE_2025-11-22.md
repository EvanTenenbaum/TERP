# Swarm Execution Guide: Sprint Nov 22-29, 2025

**Date:** November 22, 2025  
**Sprint:** Phase 2.5 Completion & Phase 3 Workflow Verification  
**Swarm Manager:** `scripts/manager.ts`  
**Status:** Ready for Execution

---

## 🎯 Overview

This guide provides step-by-step instructions for executing the strategic sprint plan using the swarm manager system. The sprint is organized into 4 waves with strategic parallelization.

---

## 📋 Prerequisites

### Environment Setup

1. **Verify swarm manager is available:**

   ```bash
   cd /Users/evan/spec-erp-docker/TERP/TERP
   ls scripts/manager.ts
   ```

2. **Check package manager:**

   ```bash
   which pnpm || which npm
   ```

3. **Verify roadmap is up to date:**

   ```bash
   git pull origin main
   ```

4. **Check swarm status:**
   ```bash
   npm run swarm status
   # or
   pnpm swarm status
   ```

### Required Environment Variables

Ensure these are set (swarm manager will check):

- `GOOGLE_GEMINI_API_KEY` or `GEMINI_API_KEY`

---

## 🚀 Wave 1: Phase 2.5 Completion

**Objective:** Complete the last critical bug to unblock Phase 3  
**Agent Count:** 1  
**Estimated Time:** 2-4 hours

### Task

- **BUG-007:** Missing Permissions & Safety Checks

### Execution

```bash
npm run swarm execute --batch=BUG-007
```

**Or manually:**

```bash
npx tsx scripts/manager.ts execute --batch=BUG-007
```

### Expected Output

```
📊 Execution Results:
==================================================

BUG-007: SUCCESS
  Message: [AI response]
  Branch: agent/BUG-007
```

### Verification

After completion:

1. Check roadmap: BUG-007 should be marked complete
2. Verify code changes pushed to `agent/BUG-007` branch
3. Test the changes in production
4. Proceed to Wave 2

---

## 🚀 Wave 2: Parallel Execution (3 Agents)

**Objective:** Execute independent high-priority tasks  
**Agent Count:** 3  
**Estimated Time:** 4-8 hours (parallel)

### Tasks

- **WF-001:** End-to-End Order Creation Workflow
- **WF-002:** End-to-End Inventory Intake Workflow
- **BUG-010:** Global Search Bar Returns 404 Error

### Execution

```bash
npm run swarm execute --batch=WF-001,WF-002,BUG-010
```

**Or manually:**

```bash
npx tsx scripts/manager.ts execute --batch=WF-001,WF-002,BUG-010
```

### Expected Output

```
📊 Execution Results:
==================================================

WF-001: SUCCESS
  Message: [AI response]
  Branch: agent/WF-001

WF-002: SUCCESS
  Message: [AI response]
  Branch: agent/WF-002

BUG-010: SUCCESS
  Message: [AI response]
  Branch: agent/BUG-010
```

### Verification

After completion:

1. Check roadmap: All tasks should be marked complete
2. Verify branches created: `agent/WF-001`, `agent/WF-002`, `agent/BUG-010`
3. Review verification reports for WF-001 and WF-002
4. Test BUG-010 in production
5. Proceed to Wave 3

---

## 🚀 Wave 3: Parallel Execution (2 Agents)

**Objective:** Complete remaining workflow verification and data augmentation  
**Agent Count:** 2  
**Estimated Time:** 6-8 hours (parallel)

### Tasks

- **WF-003:** End-to-End Returns Workflow
- **DATA-002-AUGMENT:** Augment Seeded Data for Realistic Relationships

### Execution

```bash
npm run swarm execute --batch=WF-003,DATA-002-AUGMENT
```

**Or manually:**

```bash
npx tsx scripts/manager.ts execute --batch=WF-003,DATA-002-AUGMENT
```

### Expected Output

```
📊 Execution Results:
==================================================

WF-003: SUCCESS
  Message: [AI response]
  Branch: agent/WF-003

DATA-002-AUGMENT: SUCCESS
  Message: [AI response]
  Branch: agent/DATA-002-AUGMENT
```

### Verification

After completion:

1. Check roadmap: All tasks should be marked complete
2. Verify branches created: `agent/WF-003`, `agent/DATA-002-AUGMENT`
3. Review verification report for WF-003
4. Verify data augmentation scripts and results
5. Proceed to Wave 4

---

## 🚀 Wave 4: Final Verification (Sequential)

**Objective:** Comprehensive data integrity verification  
**Agent Count:** 1  
**Estimated Time:** 6-8 hours

### Task

- **WF-004:** Data Integrity Verification

### Execution

```bash
npm run swarm execute --batch=WF-004
```

**Or manually:**

```bash
npx tsx scripts/manager.ts execute --batch=WF-004
```

### Expected Output

```
📊 Execution Results:
==================================================

WF-004: SUCCESS
  Message: [AI response]
  Branch: agent/WF-004
```

### Verification

After completion:

1. Check roadmap: WF-004 should be marked complete
2. Verify branch created: `agent/WF-004`
3. Review comprehensive verification report
4. Verify test suite created
5. Sprint complete!

---

## 📊 Monitoring Progress

### Check Status

```bash
npm run swarm status
```

**Output:**

```json
{
  "phase": "Phase 2.5 Completion & Phase 3 Workflow Verification",
  "pending": [
    "BUG-007",
    "WF-001",
    "WF-002",
    "BUG-010",
    "WF-003",
    "DATA-002-AUGMENT",
    "WF-004"
  ],
  "recommended": ["BUG-007"]
}
```

### Check Active Sessions

```bash
ls docs/sessions/active/
```

### Check Roadmap Status

```bash
grep -A 5 "BUG-007\|WF-001\|WF-002\|BUG-010\|WF-003\|DATA-002-AUGMENT\|WF-004" docs/roadmaps/MASTER_ROADMAP.md
```

---

## 🚨 Troubleshooting

### Issue: Swarm Manager Not Found

**Error:** `command not found: pnpm` or `npm not found`

**Solution:**

```bash
# Install dependencies first
npm install
# or
pnpm install

# Then retry
npm run swarm status
```

### Issue: API Key Missing

**Error:** `GOOGLE_GEMINI_API_KEY not set`

**Solution:**

```bash
export GOOGLE_GEMINI_API_KEY="your-key-here"
# or add to .env file
echo "GOOGLE_GEMINI_API_KEY=your-key-here" >> .env
```

### Issue: Git Lock Errors

**Error:** `fatal: Unable to create '.../.git/index.lock': File exists`

**Solution:**
The swarm manager auto-retries up to 3 times. If persistent:

```bash
rm .git/index.lock
git pull origin main
# Retry command
```

### Issue: Task Execution Timeout

**Error:** `TIMEOUT` in execution results

**Solution:**

- Check if task is actually complete (may have finished but timed out)
- Review branch for changes
- Manually verify and update roadmap if needed
- Retry specific task if incomplete

### Issue: Module Not Found

**Error:** `Module not found` when running swarm manager

**Solution:**

```bash
npm install
# or
pnpm install
# Retry command
```

---

## 📝 Post-Execution Checklist

After each wave completes:

- [ ] All tasks marked complete in roadmap
- [ ] Branches created and pushed
- [ ] Verification reports created (for WF tasks)
- [ ] Code changes reviewed
- [ ] Production deployment verified
- [ ] Next wave ready to execute

After sprint completion:

- [ ] All 8 tasks complete
- [ ] All verification reports reviewed
- [ ] Roadmap statistics updated
- [ ] Lessons learned documented
- [ ] Next sprint planned

---

## 🔄 Manual Agent Deployment (Alternative)

If swarm manager is unavailable, deploy agents manually using prompts:

### Wave 1

- `docs/prompts/BUG-007.md`

### Wave 2

- `docs/prompts/WF-001.md`
- `docs/prompts/WF-002.md`
- `docs/prompts/BUG-010.md`

### Wave 3

- `docs/prompts/WF-003.md`
- `docs/prompts/DATA-002-AUGMENT.md`

### Wave 4

- `docs/prompts/WF-004.md`

**Instructions:**

1. Copy prompt content
2. Provide to AI agent (Claude, ChatGPT, etc.)
3. Agent will follow prompt instructions
4. Verify completion and update roadmap

---

## 📞 Support

**Issues:**

- Check `docs/SPRINT_PLAN_2025-11-22.md` for detailed plan
- Review `docs/ROADMAP_AGENT_GUIDE.md` for agent protocols
- Check `scripts/manager.ts` for swarm manager implementation

**Questions:**

- Refer to roadmap: `docs/roadmaps/MASTER_ROADMAP.md`
- Check task prompts: `docs/prompts/[TASK_ID].md`

---

**Last Updated:** November 22, 2025  
**Status:** Ready for Execution
