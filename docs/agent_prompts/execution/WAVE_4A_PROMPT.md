# Wave 4A: SQL Safety Fixes

**Agent Role**: Backend Developer  
**Duration**: 6-8 hours  
**Priority**: P1 - HIGH (but post-Thursday)  
**Timeline**: Week 2  
**Dependencies**: Thursday deployment stable  
**Can Run Parallel With**: Wave 4B

---

## Context

You are fixing SQL safety issues where empty arrays passed to `inArray()` or `sql.raw()` can cause database errors. These are edge cases that likely won't hit during normal usage but could cause crashes for new users or unusual data states.

---

## Pattern to Fix

**Problem Pattern**:
```typescript
// This crashes when array is empty
const results = await db.select()
  .from(table)
  .where(inArray(table.id, someArray)); // Fails if someArray = []
```

**Fix Pattern**:
```typescript
// Add empty array check
if (someArray.length === 0) {
  return []; // or appropriate empty result
}
const results = await db.select()
  .from(table)
  .where(inArray(table.id, someArray));
```

---

## Tasks

### Task 1: Audit All inArray() Calls

**Time Estimate**: 2-3 hours

```bash
# Find all inArray usages
grep -rn "inArray" server/ --include="*.ts"
```

**For each occurrence**:
1. Check if the array can ever be empty
2. If yes, add empty array guard
3. Document the fix

**Known Locations to Check**:

| File | Line | Variable | Status |
|------|------|----------|--------|
| `server/services/permissionService.ts` | ~190 | `permissionIds` | Fixed in Wave 1A |
| `server/routers/vipPortal.ts` | ~1825 | `batchIds` | Check |
| `server/routers/vipPortal.ts` | ~2045 | `batchIds` | Check |
| `server/services/liveCatalogService.ts` | Various | `batchIds` | Check |
| `server/routers/tags.ts` | Various | `tagIds` | Check |
| `server/services/creditEngine.ts` | Various | `sessionIds` | Check |

---

### Task 2: BUG-044 - VIP Portal Empty Batch IDs

**File**: `server/routers/vipPortal.ts`  
**Lines**: ~1825, ~2045  
**Time Estimate**: 1 hour

**Check if already fixed** (may have been done):
```bash
grep -B5 "inArray.*batchIds" server/routers/vipPortal.ts
```

**If not fixed, add guards**:
```typescript
// Around line 1825
if (batchIds.length === 0) {
  return { batches: [], total: 0 };
}

// Around line 2045
if (batchIds.length === 0) {
  return { items: [] };
}
```

---

### Task 3: BUG-049 - Live Catalog SQL Injection

**File**: `server/services/liveCatalogService.ts`  
**Time Estimate**: 1 hour

**Find the issue**:
```bash
grep -n "inArray\|sql.raw" server/services/liveCatalogService.ts
```

**Add guards where needed**:
```typescript
// Before any inArray call
if (batchIds.length === 0) {
  return [];
}
```

---

### Task 4: BUG-052 - Tag Management Empty Array

**File**: `server/routers/tags.ts`  
**Time Estimate**: 1 hour

**Find the issue**:
```bash
grep -n "inArray" server/routers/tags.ts
```

**Add guards**:
```typescript
// Before tag operations
if (tagIds.length === 0) {
  return { success: true, affected: 0 };
}
```

---

### Task 5: BUG-053 - Credit Engine Empty Session IDs

**File**: `server/services/creditEngine.ts`  
**Time Estimate**: 1 hour

**Find the issue**:
```bash
grep -n "inArray\|sessionIds" server/services/creditEngine.ts
```

**Add guards**:
```typescript
// Before credit calculations
if (sessionIds.length === 0) {
  return { credits: [], total: 0 };
}
```

---

### Task 6: SQL-001 - Comprehensive Audit

**Time Estimate**: 2-3 hours

Create a comprehensive audit document:

```markdown
# SQL Safety Audit

## inArray() Usage

| File | Line | Array Variable | Can Be Empty? | Guard Added? |
|------|------|----------------|---------------|--------------|
| permissionService.ts | 190 | permissionIds | Yes | ✅ |
| vipPortal.ts | 1825 | batchIds | Yes | ✅ |
| ... | ... | ... | ... | ... |

## sql.raw() Usage

| File | Line | Usage | Risk | Fixed? |
|------|------|-------|------|--------|
| pricingEngine.ts | 350 | ruleIds.join() | High | ✅ |
| ... | ... | ... | ... | ... |

## Recommendations

1. Create a utility function for safe inArray:
\`\`\`typescript
function safeInArray<T>(column: Column, values: T[]) {
  if (values.length === 0) {
    return sql`false`; // Never matches
  }
  return inArray(column, values);
}
\`\`\`

2. Add ESLint rule to warn on direct inArray usage
3. Add unit tests for empty array cases
```

---

## Git Workflow

```bash
# Create feature branch
git checkout -b fix/wave-4a-sql-safety

# Commit each fix
git add server/routers/vipPortal.ts
git commit -m "fix(BUG-044): Add empty array guards in VIP Portal

- Prevents SQL error when batchIds is empty
- Returns empty result instead of crashing"

git add server/services/liveCatalogService.ts
git commit -m "fix(BUG-049): Add empty array guards in Live Catalog

- Prevents SQL error when filtering with empty arrays"

git add server/routers/tags.ts
git commit -m "fix(BUG-052): Add empty array guards in Tag Management

- Prevents SQL error when tagIds is empty"

git add server/services/creditEngine.ts
git commit -m "fix(BUG-053): Add empty array guards in Credit Engine

- Prevents SQL error when sessionIds is empty"

git add docs/security/SQL_SAFETY_AUDIT.md
git commit -m "docs: Add SQL safety audit

- Documented all inArray and sql.raw usage
- Recommendations for preventing future issues"

# Push and create PR
git push origin fix/wave-4a-sql-safety
```

---

## Success Criteria

- [ ] All inArray() calls have empty array guards
- [ ] All sql.raw() calls handle empty inputs
- [ ] Audit document created
- [ ] No SQL errors in edge cases
- [ ] Unit tests added for empty array scenarios

---

## Handoff

When complete, update the roadmap and notify the team. These fixes can be deployed independently of Wave 4B.
