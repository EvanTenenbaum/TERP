# Next Batch: Parallel Agent Execution Guide

**Date:** November 14, 2025  
**Batch:** #2  
**Remaining Tasks:** 15 (10 selected for this batch)  
**Recommended Agents:** 6-8 parallel agents

---

## 🎯 Batch Strategy

This batch focuses on completing the remaining **P1 high-priority tasks** plus selected **P2 medium-priority tasks** that don't have dependencies.

**Excluded from this batch:**

- **QA-041:** Merge Inbox and To-Do List Modules (24-40h) - Too large, save for dedicated session
- **QA-048:** Design @ Mention Workflow (8-16h) - Design task, may need user input
- **P3 tasks:** Testing/audit tasks - Save for final batch

---

## 📋 Recommended Agent Assignments

### **Agent 1: QA-028 (P1, 4-8h)**

**Task:** Fix Old Sidebar Navigation  
**Prompt:** `docs/prompts/QA-028.md`  
**Priority:** High  
**Estimated Time:** 4-8 hours  
**Complexity:** Medium

**Quick Start:**

```bash
# Copy this prompt to Agent 1
cat docs/prompts/QA-028.md
```

---

### **Agent 2: QA-033 (P1, 8-16h)**

**Task:** Fix Custom Layout Blank Dashboard  
**Prompt:** `docs/prompts/QA-033.md`  
**Priority:** High  
**Estimated Time:** 8-16 hours  
**Complexity:** High

**Quick Start:**

```bash
# Copy this prompt to Agent 2
cat docs/prompts/QA-033.md
```

---

### **Agent 3: QA-034 (P1, 4-8h)**

**Task:** Fix Widget Visibility Disappearing  
**Prompt:** `docs/prompts/QA-034.md`  
**Priority:** High  
**Estimated Time:** 4-8 hours  
**Complexity:** Medium

**Quick Start:**

```bash
# Copy this prompt to Agent 3
cat docs/prompts/QA-034.md
```

---

### **Agent 4: QA-044 (P1, 16-24h)**

**Task:** Implement Event Invitation Workflow  
**Prompt:** `docs/prompts/QA-044.md`  
**Priority:** High  
**Estimated Time:** 16-24 hours  
**Complexity:** Very High

**Quick Start:**

```bash
# Copy this prompt to Agent 4
cat docs/prompts/QA-044.md
```

**Note:** This is the most complex task in the batch. Consider assigning to your most capable agent.

---

### **Agent 5: QA-015 (P2, 4-6h)**

**Task:** Fix Matchmaking - Add Need Button 404  
**Prompt:** `docs/prompts/QA-015.md`  
**Priority:** Medium  
**Estimated Time:** 4-6 hours  
**Complexity:** Low-Medium

**Quick Start:**

```bash
# Copy this prompt to Agent 5
cat docs/prompts/QA-015.md
```

**Note:** This task had duplicate sessions in the previous batch (race condition). Should work fine now.

---

### **Agent 6: QA-016 (P2, 4-6h)**

**Task:** Fix Matchmaking - Add Supply Button 404  
**Prompt:** `docs/prompts/QA-016.md`  
**Priority:** Medium  
**Estimated Time:** 4-6 hours  
**Complexity:** Low-Medium

**Quick Start:**

```bash
# Copy this prompt to Agent 6
cat docs/prompts/QA-016.md
```

**Note:** Very similar to QA-015, likely same fix pattern.

---

### **Agent 7: QA-036 (P2, 4-8h)** [OPTIONAL]

**Task:** Fix Time Period Filters on Widgets  
**Prompt:** `docs/prompts/QA-036.md`  
**Priority:** Medium  
**Estimated Time:** 4-8 hours  
**Complexity:** Medium

**Quick Start:**

```bash
# Copy this prompt to Agent 7
cat docs/prompts/QA-036.md
```

---

### **Agent 8: QA-045 (P2, 8-16h)** [OPTIONAL]

**Task:** Link Events to Clients  
**Prompt:** `docs/prompts/QA-045.md`  
**Priority:** Medium  
**Estimated Time:** 8-16 hours  
**Complexity:** High

**Quick Start:**

```bash
# Copy this prompt to Agent 8
cat docs/prompts/QA-045.md
```

---

## 🚀 Execution Instructions

### Step 1: Prepare Repository

```bash
cd /home/ubuntu/TERP
git pull origin main
git status  # Ensure clean working directory
```

### Step 2: Launch Agents

For each agent, provide:

1. **The task prompt** (from `docs/prompts/QA-XXX.md`)
2. **Repository access** (GitHub: EvanTenenbaum/TERP)
3. **Instructions:** "Follow the 4-phase protocol in the prompt exactly"

### Step 3: Monitor Progress

Check active sessions:

```bash
ls -la docs/sessions/active/
```

Check roadmap status:

```bash
grep "Status.*✅ Complete" docs/roadmaps/MASTER_ROADMAP.md | wc -l
```

Monitor GitHub Actions:

```bash
gh run list --limit 10
```

### Step 4: Handle Issues

If merge conflicts occur:

- Agents will handle via git rebase (built into prompts)
- Session registration prevents most conflicts
- Monitor for any stuck agents

If deployment fails:

- Agents will see the failure via deployment monitoring
- They should fix and retry
- Check GitHub Actions logs for details

---

## 📊 Expected Outcomes

### Completion Estimates

**Minimum (6 agents):**

- 4 P1 tasks + 2 P2 tasks = 6 tasks
- Estimated time: 6-10 hours (parallel)
- New completion: 41/50 (82%)

**Optimal (8 agents):**

- 4 P1 tasks + 4 P2 tasks = 8 tasks
- Estimated time: 8-12 hours (parallel)
- New completion: 43/50 (86%)

### After This Batch

**Remaining tasks:** 7-5 tasks

- P1: 0 remaining (all complete!)
- P2: 2-4 remaining
- P3: 5 remaining (testing/audit)

---

## ⚠️ Important Notes

### Task Dependencies

✅ **No dependencies** - All selected tasks are independent  
✅ **No conflicts** - Tasks touch different parts of codebase  
✅ **Parallel safe** - Can run simultaneously without issues

### Excluded Tasks

**QA-041: Merge Inbox and To-Do List Modules (24-40h)**

- Too large for batch execution
- Recommend dedicated session with single agent
- High complexity, needs focused attention

**QA-048: Design @ Mention Workflow (8-16h)**

- Design task, may need user input
- Better suited for interactive session
- Can be done after technical tasks complete

**P3 Tasks (5 remaining):**

- QA-023: Mobile Responsiveness Testing (16-24h)
- QA-024: Test Settings Forms (6-8h)
- QA-025: Test User Profile (4-6h)
- QA-026: Performance Testing (16-24h)
- QA-027: Security Audit (16-24h)
- Save for final batch after all features complete

---

## 🎯 Success Criteria

This batch is successful when:

✅ All 4 P1 tasks complete (QA-028, QA-033, QA-034, QA-044)  
✅ At least 2 P2 tasks complete (QA-015, QA-016 minimum)  
✅ All deployments successful  
✅ No merge conflicts or session issues  
✅ Roadmap updated correctly  
✅ Sessions properly archived

**Target:** 82-86% completion (41-43/50 tasks)

---

## 📝 Quick Reference

### Get All Prompts at Once

```bash
cd /home/ubuntu/TERP

# P1 tasks (required)
cat docs/prompts/QA-028.md  # Agent 1
cat docs/prompts/QA-033.md  # Agent 2
cat docs/prompts/QA-034.md  # Agent 3
cat docs/prompts/QA-044.md  # Agent 4

# P2 tasks (recommended)
cat docs/prompts/QA-015.md  # Agent 5
cat docs/prompts/QA-016.md  # Agent 6

# P2 tasks (optional)
cat docs/prompts/QA-036.md  # Agent 7
cat docs/prompts/QA-045.md  # Agent 8
```

### Monitor All Agents

```bash
# Watch active sessions
watch -n 10 'ls -la docs/sessions/active/ | grep QA'

# Watch completion count
watch -n 30 'grep "Status.*✅ Complete" docs/roadmaps/MASTER_ROADMAP.md | wc -l'

# Watch GitHub Actions
watch -n 30 'gh run list --limit 5'
```

---

## 🔄 After Batch Completion

1. **Verify all tasks complete:**

   ```bash
   grep -E "QA-(028|033|034|044|015|016|036|045)" docs/roadmaps/MASTER_ROADMAP.md | grep "Status"
   ```

2. **Check deployment status:**

   ```bash
   gh run list --limit 10 --json conclusion
   ```

3. **Clean up sessions:**

   ```bash
   ls docs/sessions/active/ | grep QA
   # Should be empty or only show in-progress tasks
   ```

4. **Generate progress report:**
   - Update completion percentage
   - Document any issues
   - Plan next batch (if needed)

---

## 📞 Support

If issues arise:

1. Check `docs/ACTIVE_SESSIONS.md` for conflicts
2. Review GitHub Actions logs for deployment failures
3. Check `docs/sessions/abandoned/` for failed attempts
4. Refer to `docs/ROADMAP_SYSTEM_GITHUB_NATIVE_V3.2_FINAL.md` for system details

---

**Ready to launch!** 🚀

Copy the prompts to your agents and let them work in parallel. The system will handle coordination automatically.
