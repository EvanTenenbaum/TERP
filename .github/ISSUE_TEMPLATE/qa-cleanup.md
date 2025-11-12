---
name: 🧹 Code Cleanup
about: Remove dead code identified in QA report
title: '[CLEANUP] '
labels: technical-debt, qa-report
assignees: ''
---

## Dead Code Identified

**QA Report Reference:**
- See: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 2 (Dead Code Detection)

## Items to Remove

### Files
- [ ] `path/to/unused/file.ts` (XXX lines)
- [ ] `path/to/backup.ts.backup` (XXX lines)
- [ ] `path/to/unused/component.tsx` (XXX lines)

**Total:** XXX lines to remove

### Unused Exports
- [ ] Router: `unusedRouter` in `server/routers.ts`
- [ ] Service: `unusedService.ts`
- [ ] Component: `UnusedComponent.tsx`

### Unused Database Tables
- [ ] Table: `unused_table` in `drizzle/schema.ts`
- [ ] Move to: `drizzle/schema-deprecated.ts`

### Commented Out Code
- [ ] File: `path/to/file.ts:lines XX-YY`
- [ ] Reason for commenting: ___
- [ ] Decision: Remove or implement

### Duplicate Code
- [ ] Keep: `enhanced/version.ts`
- [ ] Remove: `old/version.ts`
- [ ] Update imports

## Verification Steps

**Before removing, verify:**

```bash
# 1. Check if file is imported anywhere
grep -r "import.*filename" server/ client/src/

# 2. Check if router is used by frontend
grep -r "trpc.routerName" client/src/

# 3. Check if table has data (production)
# SELECT COUNT(*) FROM table_name;

# 4. Check git history for context
git log --all -- path/to/file.ts
```

## Removal Checklist

- [ ] Verified file/code is unused
- [ ] No imports found
- [ ] Removed file/code
- [ ] Removed from `routers.ts` (if router)
- [ ] Removed from `schema.ts` (if table)
- [ ] Updated tests (removed test file if needed)
- [ ] Updated documentation
- [ ] Verified build passes: `pnpm build`
- [ ] Verified tests pass: `pnpm test`

## Impact

**Lines of Code Removed:** XXX
**Files Removed:** X
**Tables Deprecated:** X

**Benefits:**
- Reduced codebase complexity
- Faster builds
- Easier maintenance
- Less confusion for developers

## Phase
- Phase 3: Technical Debt Cleanup (Weeks 5-7)

## Safety Note

⚠️ **For database tables:**
- DO NOT drop tables in production without backup
- Move to `schema-deprecated.ts` first
- Monitor for 2 weeks
- Only drop if confirmed unused
