# ST-006: Dead Code Deletion List

**Session ID:** 20251113-st006-deadcode-2f6b7778
**Date:** 2025-11-13
**Status:** ⏸️ AWAITING USER APPROVAL

---

## Summary

**Total Files to Delete:** 5
**Total Size:** ~46.9 KB

---

## Verified Dead Code

### 1. server/cogsManagement.ts
- **Size:** 3.2 KB
- **Status:** ✅ VERIFIED UNUSED
- **Verification:**
  - ☑️ No imports found in codebase (`grep -r "import.*cogsManagement" server/ src/`)
  - ☑️ No references found in codebase (`grep -r "cogsManagement" server/ src/`)
- **Reason for Deletion:** File exists but is not imported or referenced anywhere in the codebase

---

## Unused Routers (Not Imported in server/routers.ts)

### 2. server/routers/calendar.v32.ts
- **Size:** 26 KB
- **Status:** ✅ VERIFIED UNUSED
- **Verification:**
  - ☑️ Not imported in `server/routers.ts`
  - ☑️ No direct imports found in codebase
- **Reason for Deletion:** Old version file, not registered in main router

### 3. server/routers/calendarHealth.generated.ts
- **Size:** 1.3 KB
- **Status:** ✅ VERIFIED UNUSED
- **Verification:**
  - ☑️ Not imported in `server/routers.ts`
  - ☑️ No direct imports found in codebase
- **Reason for Deletion:** Generated file not in use, not registered in main router

### 4. server/routers/clientNeeds.ts
- **Size:** 8.7 KB
- **Status:** ✅ VERIFIED UNUSED
- **Verification:**
  - ☑️ Not imported in `server/routers.ts` (replaced by `clientNeedsEnhanced.ts`)
  - ☑️ No direct imports found in codebase
- **Note:** Roadmap indicated this was "already deleted" but file still exists
- **Reason for Deletion:** Superseded by `clientNeedsEnhanced.ts`

### 5. server/routers/matching.ts
- **Size:** 7.7 KB
- **Status:** ✅ VERIFIED UNUSED
- **Verification:**
  - ☑️ Not imported in `server/routers.ts` (replaced by `matchingEnhanced.ts`)
  - ☑️ No direct imports found in codebase
- **Reason for Deletion:** Superseded by `matchingEnhanced.ts`

---

## Discrepancy with Roadmap

**Roadmap Claim:** "29 Unused Routers"
**Actual Finding:** 4 unused routers

**Analysis:**
- Total router files in `server/routers/`: 70
- Total routers imported in `server/routers.ts`: 66
- Unused routers: 4 (not 29)

**Possible Explanations:**
1. The roadmap estimate was based on older data
2. Previous cleanup efforts removed many unused routers
3. The "29" may have included other types of files or been a projection

---

## Verification Commands Used

```bash
# List all router files
ls -1 server/routers/*.ts | grep -v "\.test\.ts$"

# Check imports in routers.ts
grep "from \"./routers/" server/routers.ts

# Verify cogsManagement.ts is unused
grep -r "import.*cogsManagement" server/ src/
grep -r "from.*cogsManagement" server/ src/
grep -r "cogsManagement" server/ src/ --exclude="*.test.ts"

# Verify each unused router
grep -r "from.*routers/[filename]" server/ src/
grep -r "import.*[filename]" server/ src/
```

---

## Next Steps (Pending Approval)

1. ✅ **User reviews this deletion list**
2. ⏸️ Delete all 5 verified files
3. ⏸️ Run `pnpm check` (verify no TypeScript errors)
4. ⏸️ Run `pnpm test` (verify all tests pass)
5. ⏸️ Commit changes with detailed message
6. ⏸️ Create DEAD_CODE_REMOVAL_REPORT.md
7. ⏸️ Update MASTER_ROADMAP.md (mark ST-006 complete)
8. ⏸️ Merge to main

---

## Impact Assessment

**Benefits:**
- Reduced codebase size by ~46.9 KB
- Removed 5 unused files
- Improved code maintainability
- Reduced confusion for future developers

**Risks:**
- Low risk: All files verified as unused with multiple verification methods
- Mitigation: All changes are in version control and can be reverted if needed

---

**AWAITING USER APPROVAL TO PROCEED WITH DELETION**
