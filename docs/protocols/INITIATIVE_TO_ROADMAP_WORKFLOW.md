# Initiative to Roadmap Workflow

**Version**: 1.0  
**Status**: ACTIVE  
**Last Updated**: December 2, 2025

---

## Core Principle

**MASTER_ROADMAP.md is the SINGLE SOURCE OF TRUTH for all work.**

Initiatives are **planning documents only**. All executable work MUST be in MASTER_ROADMAP.md.

---

## Workflow Overview

```
Initiative (Planning) → Roadmap Tasks (Execution) → Work → Update Roadmap
```

**Initiative**: High-level plan with phases, goals, metrics (read-only during execution)  
**Roadmap**: Executable tasks with status, estimates, prompts (updated continuously)  
**Work**: Agents execute tasks from roadmap  
**Updates**: Agents update roadmap status, never the initiative  

---

## Step-by-Step Process

### Step 1: Create Initiative (Planning Phase)

**When**: Planning a large body of work (code review, new feature, refactoring)

**What to Include**:
- Problem statement
- Goals and success metrics
- Phases (high-level grouping)
- Task list (overview only)
- Resource requirements
- Timeline

**What NOT to Include**:
- Detailed implementation steps (those go in prompts)
- Status tracking (that's in roadmap)
- Session information (that's in sessions)

**Location**: `docs/initiatives/INITIATIVE-NAME.md`

**Example**: `CODE-QUALITY-IMPROVEMENT-2025.md`

---

### Step 2: Convert Initiative to Roadmap Tasks

**When**: Ready to start work on a phase

**Process**:

1. **Read Initiative**: Understand the phase goals
2. **Create Roadmap Tasks**: Add tasks to MASTER_ROADMAP.md
3. **Link Back**: Reference initiative in task metadata
4. **Create Prompts**: Create detailed prompt files if needed

**Task Format in Roadmap**:
```markdown
### TASK-ID: Task Title

**Status**: ready  
**Priority**: HIGH  
**Estimate**: 8h  
**Initiative**: CODE-QUALITY-2025 (Phase 1)  
**Module**: server/routers/  
**Dependencies**: None  
**Prompt**: docs/prompts/TASK-ID.md

**Problem**: [Brief description]

**Objectives**:
1. Objective 1
2. Objective 2

**Deliverables**:
- [ ] Deliverable 1
- [ ] Deliverable 2

**Acceptance Criteria**:
- Criteria 1
- Criteria 2
```

**Key Fields**:
- `Initiative`: Links to planning doc (optional but recommended)
- `Status`: ready | in-progress | complete | blocked
- `Prompt`: Link to detailed implementation guide (optional)

---

### Step 3: Execute Work (Agent Workflow)

**Agent Process**:

1. **Find Task**: Check MASTER_ROADMAP.md for `ready` tasks
2. **Claim Task**: Update status to `in-progress`
3. **Register Session**: Create session file
4. **Do Work**: Implement the task
5. **Update Roadmap**: Mark deliverables complete, update status
6. **Archive Session**: Move to completed sessions

**DO**:
- ✅ Update MASTER_ROADMAP.md status
- ✅ Update MASTER_ROADMAP.md deliverables
- ✅ Add completion notes to roadmap
- ✅ Validate roadmap before committing

**DON'T**:
- ❌ Update initiative document
- ❌ Create tasks outside roadmap
- ❌ Skip roadmap validation

---

### Step 4: Track Progress

**Weekly**: Review roadmap, update task statuses  
**Monthly**: Update initiative metrics (optional)  
**Continuous**: Roadmap is always current

**Metrics Tracking**:
- Track in roadmap task completion
- Optionally update initiative metrics section
- Use `pnpm roadmap:capacity` to check progress

---

## Rules for Agents

### MUST DO ✅

1. **Always check MASTER_ROADMAP.md first** for available work
2. **Always update MASTER_ROADMAP.md** when starting/completing tasks
3. **Always validate roadmap** before committing (`pnpm roadmap:validate`)
4. **Always link to initiative** if task is part of one
5. **Always create session file** when starting work

### NEVER DO ❌

1. **Never create tasks outside roadmap** - All work goes in MASTER_ROADMAP.md
2. **Never update initiative during execution** - Initiatives are planning docs
3. **Never skip roadmap validation** - Prevents format errors
4. **Never work without a roadmap task** - Even small fixes need tasks
5. **Never leave tasks in limbo** - Update status or mark blocked

---

## Initiative Lifecycle

### Phase 1: Planning (Initiative Created)

**Status**: Planning  
**Action**: Create initiative document  
**Output**: `docs/initiatives/INITIATIVE-NAME.md`

### Phase 2: Conversion (Tasks Added to Roadmap)

**Status**: Active  
**Action**: Convert phase 1 tasks to roadmap  
**Output**: Tasks in MASTER_ROADMAP.md with `Initiative: NAME (Phase 1)`

### Phase 3: Execution (Work Happens)

**Status**: Active  
**Action**: Agents execute tasks from roadmap  
**Output**: Completed tasks, updated roadmap

### Phase 4: Completion (Initiative Done)

**Status**: Complete  
**Action**: Mark initiative complete, archive if needed  
**Output**: All tasks complete, metrics achieved

---

## Examples

### Example 1: Code Review Initiative

**Initiative**: `CODE-QUALITY-IMPROVEMENT-2025.md`
- 4 phases, 30+ tasks
- Planning document with goals and metrics

**Roadmap Tasks** (Phase 1):
```markdown
### PERF-003: Complete Pagination
**Initiative**: CODE-QUALITY-2025 (Phase 1)
**Status**: ready

### ST-018: Implement Rate Limiting
**Initiative**: CODE-QUALITY-2025 (Phase 1)
**Status**: ready
```

**Workflow**:
1. Initiative created (planning)
2. Phase 1 tasks added to roadmap
3. Agents execute from roadmap
4. Roadmap updated continuously
5. When Phase 1 complete, add Phase 2 tasks

---

### Example 2: Small Bug Fix

**No Initiative Needed** - Just add to roadmap:

```markdown
### BUG-024: Fix Login Button Alignment
**Status**: ready
**Priority**: LOW
**Estimate**: 1h
```

**Rule**: Initiatives are for **large bodies of work** (5+ related tasks). Small tasks go directly to roadmap.

---

## When to Create an Initiative

**Create Initiative When**:
- 5+ related tasks
- Multiple phases (weeks/months)
- Needs resource planning
- Requires stakeholder communication
- Has measurable success metrics

**Skip Initiative When**:
- 1-4 tasks
- Single phase (days)
- Straightforward work
- No special planning needed

---

## Keeping Initiative and Roadmap in Sync

### Option 1: Don't Sync (Recommended)

**Approach**: Initiative is planning only, roadmap is execution  
**Pros**: No overhead, clear separation  
**Cons**: Initiative may become outdated  
**When**: Most cases

### Option 2: Monthly Updates (Optional)

**Approach**: Update initiative metrics monthly  
**Pros**: Initiative stays current  
**Cons**: Extra work  
**When**: Long initiatives (3+ months) with stakeholder reporting

### Option 3: One-Time Conversion (Recommended for Large Initiatives)

**Approach**: Convert initiative to roadmap tasks once, then ignore initiative  
**Pros**: No ongoing sync needed  
**Cons**: Initiative becomes historical  
**When**: Large initiatives that will take months

---

## Validation and Quality Control

### Before Committing Roadmap Changes

```bash
# ALWAYS run validation
pnpm roadmap:validate

# Check capacity
pnpm roadmap:capacity

# Verify format
# - Task IDs follow convention
# - Status is valid (ready|in-progress|complete|blocked)
# - Priority is valid (HIGH|MEDIUM|LOW)
# - Estimate format is valid (4h|8h|16h|1d|2d|1w)
```

### Roadmap Validation Checklist

- [ ] Task ID follows convention (CATEGORY-###)
- [ ] Status is valid
- [ ] Priority is valid
- [ ] Estimate format is valid
- [ ] Deliverables are checkboxes
- [ ] Validation passes (`pnpm roadmap:validate`)

---

## Quick Reference

### For Planning

1. Create initiative in `docs/initiatives/`
2. Define phases, goals, metrics
3. List high-level tasks

### For Execution

1. Convert phase tasks to MASTER_ROADMAP.md
2. Agents work from roadmap
3. Update roadmap continuously
4. Validate before committing

### For Tracking

1. Check roadmap for current status
2. Use `pnpm roadmap:capacity` for progress
3. Optionally update initiative metrics monthly

---

## Summary

**Single Source of Truth**: MASTER_ROADMAP.md  
**Planning Documents**: Initiatives (optional, for large work)  
**Execution**: Always from roadmap  
**Updates**: Always to roadmap  
**Validation**: Always before commit  

**Keep it simple**: Most work goes directly to roadmap. Initiatives are for planning large bodies of work only.

---

**Status**: ACTIVE  
**Applies To**: All agents  
**Mandatory**: Yes  
**Last Updated**: December 2, 2025
