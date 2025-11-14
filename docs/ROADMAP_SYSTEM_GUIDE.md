# Roadmap System - Complete Guide

**Version:** 2.0 (Optimized)  
**Last Updated:** November 13, 2025

---

## 🎯 Purpose

This system enables efficient parallel agent deployment by:

1. Ensuring every task follows exact protocol
2. Calculating safe parallel capacity automatically
3. Generating simple one-line deployment instructions
4. Preventing conflicts and coordination issues

---

## 📁 Architecture

```
docs/roadmaps/MASTER_ROADMAP.md     ← Single source of truth (task metadata)
docs/prompts/ST-XXX.md              ← Auto-generated agent prompts
docs/templates/                     ← Templates for new tasks/prompts
scripts/roadmap.ts                  ← Validation, capacity, generation
.husky/pre-commit                   ← Automatic validation on commit
```

---

## 🚀 Quick Start

### For You (Deploying Agents)

```bash
# See how many agents you can safely deploy
pnpm roadmap:next-batch

# Output:
# ✅ Deploy 4 agent(s):
#
# Agent 1: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-005.md
# Agent 2: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-008.md
# Agent 3: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-009.md
# Agent 4: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-007.md
```

**Then:** Copy each URL and give to an agent. That's it!

### For Agents (Executing Tasks)

```
You receive: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-005.md

1. Click the URL
2. Read the complete prompt (everything you need is there)
3. Execute following the implementation guide
4. Complete all deliverables
```

---

## 📋 Commands

### Validation

```bash
# Validate entire roadmap
pnpm roadmap:validate

# Validate only changed tasks (faster)
pnpm roadmap validate --incremental
```

**What it checks:**

- All required fields present
- Objectives >= 3
- Deliverables >= 5
- Dependencies exist
- Prompt file exists and complete
- No duplicate task IDs
- No circular dependencies
- Estimate format valid

### Capacity Analysis

```bash
# See current roadmap status and capacity
pnpm roadmap:capacity
```

**Output:**

```
📊 Status:
- Total tasks: 15
- Complete: 6 ✅
- In progress: 0 ⏳
- Ready: 7 📋
- Blocked: 2 🚫

🎯 Recommended: 4 agents

📋 Reasoning:
- 7 tasks ready
- ST-005: Added to batch (no conflicts)
- ST-008: Added to batch (no conflicts)
- ST-009: Added to batch (no conflicts)
- ST-007: Added to batch (no conflicts)
- ST-010: Skipped (conflicts with ST-007)
```

### Next Batch Deployment

```bash
# Get deployment URLs for next batch
pnpm roadmap:next-batch
```

**This is your main command** - use this to deploy agents.

### Generate Prompt

```bash
# Generate prompt file for a new task
pnpm roadmap generate-prompt ST-011

# Force overwrite existing prompt (careful!)
pnpm roadmap generate-prompt ST-011 --force
```

### List Tasks

```bash
# See all tasks grouped by status
pnpm roadmap:list
```

### Check Task Status

```bash
# Get detailed info about a specific task
pnpm roadmap status ST-005
```

---

## 📝 Adding a New Task

### Step 1: Copy Template

```bash
cp docs/templates/TASK_TEMPLATE.md /tmp/new-task.md
```

### Step 2: Fill In Metadata

```markdown
### ST-011: Your Task Title

**Status:** 📋 Ready
**Priority:** 🔴 HIGH
**Estimate:** 4-6h
**Module:** `server/path/to/module`
**Dependencies:** ST-005, ST-008
**Prompt:** [`docs/prompts/ST-011.md`](../prompts/ST-011.md)

**Objectives:**

- First objective
- Second objective
- Third objective

**Deliverables:**

- [ ] First deliverable
- [ ] Second deliverable
- [ ] Third deliverable
- [ ] Fourth deliverable
- [ ] Fifth deliverable
- [ ] All tests passing
- [ ] Zero TypeScript errors
- [ ] Session archived
```

### Step 3: Add to Roadmap

Paste into `docs/roadmaps/MASTER_ROADMAP.md` in appropriate section.

### Step 4: Generate Prompt

```bash
pnpm roadmap generate-prompt ST-011
```

This creates `docs/prompts/ST-011.md` with auto-populated metadata.

### Step 5: Fill Implementation Guide

Edit `docs/prompts/ST-011.md` and replace:

```markdown
## Implementation Guide

[FILL IN: Step-by-step implementation instructions]
```

With detailed steps:

```markdown
## Implementation Guide

### Phase 1: Setup (30 min)

1. Review existing code in `server/path/to/module`
2. Understand current architecture
3. Create feature branch

### Phase 2: Implementation (3 hours)

1. Create new file `server/path/to/module/feature.ts`
2. Implement core logic:
   \`\`\`typescript
   export function newFeature() {
   // Implementation
   }
   \`\`\`
3. Add tests

### Phase 3: Testing (1 hour)

\`\`\`bash
pnpm test
pnpm check
\`\`\`

### Phase 4: Documentation (30 min)

- Update README
- Add inline comments
```

### Step 6: Validate

```bash
pnpm roadmap:validate
```

If validation passes, commit:

```bash
git add docs/roadmaps/MASTER_ROADMAP.md docs/prompts/ST-011.md
git commit -m "feat: Add ST-011 task"
git push
```

---

## 🔒 Enforcement (Automatic)

### Pre-commit Hook

Every commit automatically validates the roadmap:

```bash
git commit
# → Runs validation if MASTER_ROADMAP.md changed
# → Blocks commit if validation fails
```

**What it checks:**

- All required fields
- Prompt files exist and complete
- No duplicate IDs
- No circular dependencies
- Proper estimate format

### CI/CD (Future)

```yaml
# .github/workflows/validate-roadmap.yml
name: Validate Roadmap
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm roadmap:validate
```

---

## 📊 Capacity Rules

The system uses these rules to calculate safe capacity:

### Rule 1: Maximum 4 Agents

Based on empirical data from Batches 1-3, 4 agents is optimal for:

- Manageable coordination overhead
- Reasonable completion window
- Low conflict probability

### Rule 2: No Module Conflicts

Two tasks conflict if they modify:

- Same file
- Same directory
- Parent/child directories

**Examples:**

- ✅ `server/routers/accounting.ts` + `server/routers/analytics.ts` = **NO CONFLICT**
- ❌ `server/routers/` + `server/routers/accounting.ts` = **CONFLICT**
- ❌ `server/db/schema/users.ts` + `server/db/schema/users.ts` = **CONFLICT**

### Rule 3: Max 1 Long Task

If any task >16h (2 days), reduce capacity to 3 agents to avoid completion time spread.

### Rule 4: Priority Sorting

HIGH priority tasks selected first, then MEDIUM, then LOW.

---

## 🎯 Workflow Example

### Scenario: You Want to Deploy Next Batch

```bash
# 1. Check capacity
$ pnpm roadmap:next-batch

✅ Deploy 4 agent(s):

Agent 1: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-005.md
         (ST-005: Add Missing Database Indexes)
         Estimate: 4-6h, Priority: HIGH

Agent 2: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-008.md
         (ST-008: Implement Error Tracking)
         Estimate: 1-2d, Priority: HIGH

Agent 3: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-009.md
         (ST-009: Implement API Monitoring)
         Estimate: 2-3d, Priority: MEDIUM

Agent 4: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-007.md
         (ST-007: Implement System-Wide Pagination)
         Estimate: 3-4d, Priority: MEDIUM

✅ Safe to deploy all 4 agents in parallel

⚠️  Coordination notes:
- 1 task(s) >2 days - reducing capacity to 3 agents
```

**2. Deploy agents:**

```
Agent 1: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-005.md
Agent 2: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-008.md
Agent 3: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-009.md
```

(Note: Only deployed 3 due to warning about long tasks)

**3. Monitor progress:**

Check `docs/ACTIVE_SESSIONS.md` to see agent progress.

**4. After completion:**

```bash
# Verify all complete
pnpm roadmap:list

# Deploy next batch
pnpm roadmap:next-batch
```

---

## 🐛 Troubleshooting

### Validation Fails

```bash
$ pnpm roadmap:validate
❌ Validation FAILED

Line 145 [ST-005]: Missing field: Estimate
Line 203 [ST-008]: Must have at least 3 objectives
Line 267 [ST-009]: Prompt: Implementation guide not filled in
```

**Fix:** Edit `MASTER_ROADMAP.md` and fix errors, then re-validate.

### Prompt Generation Fails

```bash
$ pnpm roadmap generate-prompt ST-005
❌ Prompt file already exists: docs/prompts/ST-005.md
   Use --force to overwrite (will lose manual edits)
```

**Fix:** Either:

- Use `--force` if you want to regenerate (loses manual edits)
- Edit existing file manually

### No Tasks Ready

```bash
$ pnpm roadmap:next-batch
⚠️  No tasks ready. All tasks are either complete, in progress, or blocked.
```

**Fix:**

- Complete in-progress tasks
- Unblock blocked tasks
- Add new tasks to roadmap

### Module Conflicts

```bash
$ pnpm roadmap:capacity
- ST-010: Skipped (conflicts with ST-007)
```

**Fix:** Deploy ST-007 first, then ST-010 in next batch.

---

## 📈 Performance

### Caching

The system caches:

- Parsed roadmap (cleared on file change)
- Conflict map (cleared on roadmap change)

**Result:** Validation is ~8x faster on subsequent runs.

### Incremental Validation

```bash
# Only validates changed tasks
pnpm roadmap validate --incremental
```

**Use case:** Pre-commit hook (fast commits).

---

## 🎯 Best Practices

### For You

1. **Always run `next-batch` before deploying** - Don't guess capacity
2. **Deploy all recommended agents** - System calculates safe maximum
3. **Monitor ACTIVE_SESSIONS.md** - Track agent progress
4. **Update roadmap when tasks complete** - Keep status current

### For Agents

1. **Read entire prompt before starting** - Understand full scope
2. **Update session file daily** - Report progress
3. **Follow 4-phase workflow** - Pre-flight, startup, development, completion
4. **Update roadmap status when done** - Mark task complete

### For Task Authors

1. **Use template** - Ensures all required fields
2. **Generate prompt immediately** - Don't delay
3. **Fill implementation guide completely** - No placeholders
4. **Validate before committing** - Catch errors early

---

## 📊 Metrics

Track these metrics over time:

- **Completion rate:** % of deployed agents that complete
- **Average time:** Actual vs estimated time
- **Conflict rate:** % of batches with conflicts
- **Validation failures:** Errors caught before deployment

**Goal:** 90%+ completion rate, <10% conflict rate.

---

## 🔄 Maintenance

### Weekly

- Review completed tasks
- Archive old session files
- Update estimates based on actual time

### Monthly

- Analyze metrics
- Adjust capacity rules if needed
- Update templates based on learnings

---

## ❓ FAQ

**Q: Can I deploy more than 4 agents?**  
A: System caps at 4 based on empirical data. You can override manually but risk conflicts.

**Q: What if two agents want the same task?**  
A: First agent to update ACTIVE_SESSIONS.md wins. Second agent should pick different task.

**Q: Can I edit a prompt after generation?**  
A: Yes! Fill in the implementation guide. Just don't regenerate without `--force`.

**Q: What if validation is too strict?**  
A: Validation rules are based on quality standards. If consistently failing, review the rules.

**Q: How do I remove a task?**  
A: Delete from roadmap, delete prompt file, commit. Validation will pass.

---

## 🎯 Summary

**For deploying agents:**

```bash
pnpm roadmap:next-batch  # Get URLs
# Copy URLs to agents
```

**For adding tasks:**

```bash
# 1. Copy template
# 2. Fill metadata in roadmap
# 3. Generate prompt
# 4. Fill implementation guide
# 5. Validate and commit
```

**For monitoring:**

```bash
pnpm roadmap:list        # See all tasks
pnpm roadmap:capacity    # See capacity analysis
pnpm roadmap status ST-XXX  # Check specific task
```

---

**That's it!** The system handles validation, capacity calculation, and coordination automatically.
