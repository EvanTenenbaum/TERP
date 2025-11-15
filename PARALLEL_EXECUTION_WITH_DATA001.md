# Parallel Execution Guide: DATA-001 + 8 Additional Tasks

**Date:** November 14, 2025  
**Primary Task:** DATA-001 (Comprehensive Production Data Seeding)  
**Parallel Tasks:** 8 tasks safe to run alongside DATA-001

---

## 🎯 Strategy

DATA-001 is the priority (3-4 weeks, P0 critical). While it's running, execute 8 additional tasks in parallel that have zero file conflicts with the seeding work.

**Why This Works:**

- DATA-001 touches: `scripts/generators/`, `scripts/seed-*.ts`
- Parallel tasks touch: Frontend components, API routes, GitHub workflows, validation scripts
- **Zero file overlap** = No merge conflicts

---

## 📊 Recommended Agent Allocation

### Agent 1: DATA-001 (Primary - 3-4 weeks)

**Priority:** P0 CRITICAL  
**Time:** 120-160 hours  
**Prompt:** `docs/prompts/DATA-001.md`

**What:** Seed all 107 database tables with operationally coherent data representing 22 months of business operations.

---

### Agent 2: QA-028 (4-8 hours)

**Priority:** P1 High  
**Prompt:** `docs/prompts/QA-028.md`

**What:** Fix old sidebar navigation appearing on dashboard (especially mobile).

**Files:** Frontend components, CSS  
**Conflict Risk:** None

---

### Agent 3: QA-033 (8-16 hours)

**Priority:** P1 High  
**Prompt:** `docs/prompts/QA-033.md`

**What:** Fix "Custom" layout preset resulting in blank dashboard.

**Files:** Dashboard components  
**Conflict Risk:** None

---

### Agent 4: QA-034 (4-8 hours)

**Priority:** P1 High  
**Prompt:** `docs/prompts/QA-034.md`

**What:** Fix "Widget Visibility" options disappearing when "Custom" layout selected.

**Files:** Dashboard widget components  
**Conflict Risk:** None

---

### Agent 5: QA-044 (16-24 hours)

**Priority:** P1 High  
**Prompt:** `docs/prompts/QA-044.md`

**What:** Implement event invitation workflow with auto-accept options and admin controls.

**Files:** Event components, API routes  
**Conflict Risk:** None

---

### Agent 6: QA-015 (4-6 hours)

**Priority:** P2 Medium  
**Prompt:** `docs/prompts/QA-015.md`

**What:** Fix "Add Need" button in Matchmaking module returning 404.

**Files:** Matchmaking components, routes  
**Conflict Risk:** None

---

### Agent 7: QA-016 (4-6 hours)

**Priority:** P2 Medium  
**Prompt:** `docs/prompts/QA-016.md`

**What:** Fix "Add Supply" button in Matchmaking module returning 404.

**Files:** Matchmaking components, routes  
**Conflict Risk:** None

---

### Agent 8: INFRA-001 (1-2 hours)

**Priority:** P2 Infrastructure  
**Prompt:** `docs/prompts/INFRA-001.md`

**What:** Remove 3 obsolete PR-based GitHub workflows that are failing.

**Files:** `.github/workflows/`  
**Conflict Risk:** None

---

### Agent 9: INFRA-002 (2-4 hours)

**Priority:** P2 Infrastructure  
**Prompt:** `docs/prompts/INFRA-002.md`

**What:** Add automated validation to prevent stale sessions in ACTIVE_SESSIONS.md.

**Files:** `.husky/`, `scripts/validate-session-cleanup.ts`  
**Conflict Risk:** None

---

## ⏱️ Timeline Projection

### Week 1

- **DATA-001:** Operational flow mapping, architecture enhancement
- **QA-028, QA-034, INFRA-001, INFRA-002:** ✅ Complete
- **QA-033, QA-015, QA-016:** In progress
- **QA-044:** In progress

### Week 2

- **DATA-001:** Core operational data generation
- **QA-033, QA-015, QA-016, QA-044:** ✅ Complete
- **All parallel tasks done**

### Week 3-4

- **DATA-001:** Feature-specific data, validation, deployment
- **No parallel tasks** (all complete)

**Result:** By end of Week 2, you'll have:

- 8 QA/infrastructure tasks complete
- DATA-001 50% complete
- Clear runway for DATA-001 to finish without conflicts

---

## 🚀 Execution Instructions

### Step 1: Start DATA-001 (Agent 1)

```bash
# Copy the entire prompt
cat docs/prompts/DATA-001.md

# Paste to Agent 1 (Claude, Cursor, etc.)
# This agent will work for 3-4 weeks
```

### Step 2: Start Parallel Agents (Agents 2-9)

For each agent, copy the corresponding prompt:

**Agent 2:**

```bash
cat docs/prompts/QA-028.md
```

**Agent 3:**

```bash
cat docs/prompts/QA-033.md
```

**Agent 4:**

```bash
cat docs/prompts/QA-034.md
```

**Agent 5:**

```bash
cat docs/prompts/QA-044.md
```

**Agent 6:**

```bash
cat docs/prompts/QA-015.md
```

**Agent 7:**

```bash
cat docs/prompts/QA-016.md
```

**Agent 8:**

```bash
cat docs/prompts/INFRA-001.md
```

**Agent 9:**

```bash
cat docs/prompts/INFRA-002.md
```

### Step 3: Monitor Progress

**Check active sessions:**

```bash
cat docs/ACTIVE_SESSIONS.md
```

**Check GitHub Actions:**

- https://github.com/EvanTenenbaum/TERP/actions
- Verify all deployments succeed

**Check roadmap:**

```bash
grep "✅ Complete" docs/roadmaps/MASTER_ROADMAP.md
```

---

## 🔍 Conflict Resolution

**If merge conflicts occur:**

1. **Identify the conflict:**

   ```bash
   git status
   ```

2. **Most likely conflicts:**
   - `docs/ACTIVE_SESSIONS.md` - Multiple agents registering simultaneously
   - `docs/roadmaps/MASTER_ROADMAP.md` - Multiple agents marking complete

3. **Resolution strategy:**

   ```bash
   # Pull latest
   git pull --rebase origin main

   # For ACTIVE_SESSIONS.md: Keep all entries
   # For MASTER_ROADMAP.md: Keep all completions

   # Continue rebase
   git rebase --continue
   git push origin main
   ```

**Prevention:**

- Agents register sessions atomically (pull → add → commit → push)
- If push fails, they pull and retry
- Session IDs are unique (timestamp + random hex)

---

## 📊 Expected Results

### By End of Week 1

- ✅ INFRA-001 complete (obsolete workflows removed)
- ✅ INFRA-002 complete (session validation added)
- ✅ QA-028 complete (sidebar fixed)
- ✅ QA-034 complete (widget visibility fixed)
- 🟡 QA-033 in progress (custom layout)
- 🟡 QA-015 in progress (matchmaking need button)
- 🟡 QA-016 in progress (matchmaking supply button)
- 🟡 QA-044 in progress (event invitations)
- 🟡 DATA-001 25% complete (architecture done)

### By End of Week 2

- ✅ All 8 parallel tasks complete
- 🟡 DATA-001 50% complete (core data generated)

### By End of Week 4

- ✅ DATA-001 complete (all 107 tables seeded)
- ✅ Production database fully operational
- ✅ 9 total tasks complete (8 parallel + DATA-001)

---

## 🎯 Success Metrics

**Completion Rate:**

- Week 1: 4/9 tasks (44%)
- Week 2: 8/9 tasks (89%)
- Week 4: 9/9 tasks (100%)

**Deployment Success:**

- Target: 100% successful deployments
- Monitor: GitHub Actions

**Merge Conflicts:**

- Expected: 0-2 minor conflicts in ACTIVE_SESSIONS.md
- Resolution time: <5 minutes each

**Production Impact:**

- Zero downtime
- Zero data loss
- Zero broken features

---

## ⚠️ Important Notes

**For DATA-001 Agent:**

- This is a 3-4 week project - don't rush
- Quality and operational coherence are critical
- Test continuously, validate after each generator
- Backup before production seeding (Week 4)

**For Parallel Task Agents:**

- Follow standard 4-phase protocol
- Push directly to main (no PRs)
- Handle merge conflicts gracefully
- Verify deployment succeeds before marking complete

**Coordination:**

- All agents use ACTIVE_SESSIONS.md to avoid conflicts
- Session IDs are unique (timestamp + random hex)
- Agents retry if push fails (another agent pushed first)
- No manual coordination needed - system handles it

---

## 📋 Quick Reference: All Prompts

| Agent | Task      | Priority | Time     | Prompt                      |
| ----- | --------- | -------- | -------- | --------------------------- |
| 1     | DATA-001  | P0       | 120-160h | `docs/prompts/DATA-001.md`  |
| 2     | QA-028    | P1       | 4-8h     | `docs/prompts/QA-028.md`    |
| 3     | QA-033    | P1       | 8-16h    | `docs/prompts/QA-033.md`    |
| 4     | QA-034    | P1       | 4-8h     | `docs/prompts/QA-034.md`    |
| 5     | QA-044    | P1       | 16-24h   | `docs/prompts/QA-044.md`    |
| 6     | QA-015    | P2       | 4-6h     | `docs/prompts/QA-015.md`    |
| 7     | QA-016    | P2       | 4-6h     | `docs/prompts/QA-016.md`    |
| 8     | INFRA-001 | P2       | 1-2h     | `docs/prompts/INFRA-001.md` |
| 9     | INFRA-002 | P2       | 2-4h     | `docs/prompts/INFRA-002.md` |

**Total:** 9 agents, 154-220 hours of work, 2-4 weeks elapsed time

---

## 🚀 Ready to Execute

All prompts are ready. Simply copy each prompt file and paste to a new AI agent. The agents will:

1. Register their sessions automatically
2. Execute their tasks following the 4-phase protocol
3. Handle merge conflicts gracefully
4. Update the roadmap when complete
5. Archive their sessions

No manual coordination needed - the system handles everything!

---

**Let's ship it! 🎉**
