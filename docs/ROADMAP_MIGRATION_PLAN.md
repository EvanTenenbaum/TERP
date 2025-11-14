# MASTER_ROADMAP Migration Plan

**Date:** November 13, 2025  
**Purpose:** Safely migrate roadmap to new structured format without creating confusion

---

## 🎯 Goals

1. **No information loss** - Preserve all existing task details
2. **No confusion** - Clear which format is which
3. **Incremental** - Migrate only what's needed now
4. **Backward compatible** - Old format still readable

---

## 📊 Current State

**Format:** Bullet points with checkboxes

```markdown
- [x] **ST-001: Task Title** (Completed: 2025-11-13) 🟡 MEDIUM
  - Task ID: ST-001
  - Action: Do something
  - Deliverables: List of items
  - Status: ✅ COMPLETE
```

**Issues:**

- Not parseable by roadmap.ts script
- Can't auto-generate prompts
- Can't calculate capacity
- Manual coordination required

---

## ✅ Safe Migration Strategy

### Phase 1: Add New Section (No Changes to Existing)

**Action:** Create new "Active Tasks" section with structured format

**Location:** After "Current Sprint" section, before completed tasks

```markdown
## 🚀 Active Tasks (Structured Format)

> **Note:** Tasks in this section use the new structured format for automated
> agent deployment. See docs/ROADMAP_SYSTEM_GUIDE.md for details.

### ST-005: Add Missing Database Indexes

**Status:** 📋 Ready
**Priority:** 🔴 HIGH
...
```

**Benefits:**

- ✅ No confusion - clearly labeled "new format"
- ✅ No information loss - old tasks unchanged
- ✅ Easy to understand - note explains purpose
- ✅ Gradual adoption - migrate tasks one at a time

### Phase 2: Migrate Only "Ready" Tasks

**Action:** Convert unstarted tasks from old → new format

**Criteria for migration:**

- Status: Ready (not started, not in progress)
- Has clear requirements
- Ready for agent deployment

**Do NOT migrate:**

- ❌ Completed tasks (keep as-is for history)
- ❌ In-progress tasks (don't disrupt active work)
- ❌ Blocked tasks (wait until unblocked)

### Phase 3: Generate Prompts

**Action:** Create prompt files for migrated tasks

```bash
pnpm roadmap generate-prompt ST-005
pnpm roadmap generate-prompt ST-007
# etc.
```

### Phase 4: Test

**Action:** Verify system works

```bash
pnpm roadmap:validate
pnpm roadmap:capacity
pnpm roadmap:next-batch
```

---

## 📋 Tasks to Migrate (Ready Status)

Based on current roadmap, these tasks are ready for migration:

1. **ST-005:** Add Missing Database Indexes
2. **ST-007:** Implement System-Wide Pagination
3. **ST-008:** Implement Error Tracking (Sentry)
4. **ST-009:** Implement API Monitoring (Datadog)
5. **ST-010:** Implement Caching Layer (Redis)

**Total:** 5 tasks

---

## 🚫 What NOT to Change

### Keep As-Is (Completed Tasks)

All completed tasks (ST-001 through ST-006, CL-001 through CL-004) stay in current format:

**Reasons:**

- Historical record
- Already documented
- No need for automation
- Changing creates confusion

### Keep As-Is (In-Progress Tasks)

Any task currently being worked on stays in current format until complete.

### Keep As-Is (Blocked Tasks)

Blocked tasks stay in current format until unblocked.

---

## 📝 Migration Template

### Old Format (Keep for Completed)

```markdown
- [x] **ST-001: Task Title** (Completed: 2025-11-13)
  - Task ID: ST-001
  - Action: Description
  - Status: ✅ COMPLETE
```

### New Format (Use for Ready)

```markdown
### ST-005: Add Missing Database Indexes

**Status:** 📋 Ready
**Priority:** 🔴 HIGH
**Estimate:** 4-6h
**Module:** `server/db/schema/`
**Dependencies:** None
**Prompt:** [`docs/prompts/ST-005.md`](../prompts/ST-005.md)

**Objectives:**

- Audit all foreign keys for missing indexes
- Add indexes to improve query performance
- Measure performance improvements

**Deliverables:**

- [ ] Index audit report
- [ ] Migration file with new indexes
- [ ] Performance benchmark results
- [ ] Tests updated
- [ ] All tests passing
- [ ] Zero TypeScript errors
- [ ] Session archived
```

---

## ✅ Success Criteria

After migration:

1. ✅ `pnpm roadmap:validate` passes
2. ✅ `pnpm roadmap:capacity` shows 4-5 ready tasks
3. ✅ `pnpm roadmap:next-batch` generates URLs
4. ✅ All completed tasks still readable
5. ✅ No information lost
6. ✅ Clear which format is which

---

## 🎯 Execution Plan

### Step 1: Backup (Safety)

```bash
cp docs/roadmaps/MASTER_ROADMAP.md docs/roadmaps/MASTER_ROADMAP.backup.md
```

### Step 2: Add New Section

- Insert "Active Tasks" section
- Add explanatory note
- Keep all existing content

### Step 3: Migrate 5 Ready Tasks

- ST-005, ST-007, ST-008, ST-009, ST-010
- Use template for each
- Fill in all required fields

### Step 4: Generate Prompts

```bash
for id in ST-005 ST-007 ST-008 ST-009 ST-010; do
  pnpm roadmap generate-prompt $id
done
```

### Step 5: Fill Implementation Guides

- Edit each prompt file
- Add step-by-step instructions
- Include code examples

### Step 6: Validate

```bash
pnpm roadmap:validate
pnpm roadmap:capacity
pnpm roadmap:next-batch
```

### Step 7: Commit

```bash
git add docs/roadmaps/MASTER_ROADMAP.md docs/prompts/
git commit -m "feat: Migrate 5 ready tasks to structured format"
```

---

## 📊 Before/After Comparison

### Before

```
## Current Sprint
- [x] ST-001: Done
- [x] ST-002: Done
- [ ] ST-005: Not started
- [ ] ST-007: Not started
```

**Issues:** Can't parse, can't automate

### After

```
## Current Sprint
- [x] ST-001: Done (old format - historical)
- [x] ST-002: Done (old format - historical)

## Active Tasks (Structured Format)

### ST-005: Add Missing Database Indexes
**Status:** 📋 Ready
**Priority:** 🔴 HIGH
...

### ST-007: Implement System-Wide Pagination
**Status:** 📋 Ready
**Priority:** 🟡 MEDIUM
...
```

**Benefits:** Parseable, automatable, clear separation

---

## ⚠️ Risks & Mitigation

| Risk                        | Mitigation                     |
| --------------------------- | ------------------------------ |
| Information loss            | Backup file before changes     |
| Format confusion            | Clear section labels and notes |
| Breaking existing workflows | Keep completed tasks unchanged |
| Validation errors           | Test before committing         |
| Prompt generation fails     | Manual fallback available      |

---

## 🎯 Timeline

- **Step 1-2:** 15 minutes (backup + add section)
- **Step 3:** 30 minutes (migrate 5 tasks)
- **Step 4:** 5 minutes (generate prompts)
- **Step 5:** 60 minutes (fill implementation guides)
- **Step 6:** 5 minutes (validate)
- **Step 7:** 5 minutes (commit)

**Total:** 2 hours

---

## ✅ Ready to Execute?

**Checklist before starting:**

- [ ] Backup created
- [ ] Migration plan reviewed
- [ ] Templates ready
- [ ] Time allocated (2 hours)
- [ ] No other agents working on roadmap

**Approval needed:** YES / NO

---

**This plan ensures:**

- ✅ No confusion (clear labels)
- ✅ No information loss (backup + keep old format)
- ✅ Incremental (5 tasks only)
- ✅ Safe (validate before commit)
- ✅ Reversible (backup exists)
