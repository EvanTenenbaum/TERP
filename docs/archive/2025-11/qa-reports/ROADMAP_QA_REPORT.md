# TERP Roadmap QA Report

**Date:** November 12, 2025  
**Reviewer:** Claude (Manus)  
**Roadmap Version:** 2.0  
**Status:** QA Complete

---

## Executive Summary

This QA report identifies **critical issues**, **vague instructions**, **missing context**, and **potential system conflicts** in the MASTER_ROADMAP.md v2.0. The analysis found **12 high-priority issues** that could lead to incorrect implementations, system breakage, or wasted effort.

**Risk Level:** 🔴 HIGH - Several tasks lack sufficient detail for safe execution

---

## 🚨 Critical Issues Found

### Issue #1: CL-001 SQL Injection - Incomplete Specification

**Task:** CL-001: Fix SQL Injection Vulnerability  
**Current Description:** "Rewrite to use parameterized queries"  
**Problem:** Too vague - doesn't specify which lines or what the vulnerability is

**Specific Vulnerability Found:**
- **File:** `server/advancedTagFeatures.ts`
- **Lines:** 94, 121, 143
- **Issue:** String interpolation in SQL queries using template literals
- **Code Example:**
  ```typescript
  // Line 94 - VULNERABLE
  .where(sql`LOWER(${tags.name}) IN (${andTerms.map(t => `'${t}'`).join(',')})`)
  
  // Line 121 - VULNERABLE
  .where(sql`LOWER(${tags.name}) IN (${orTerms.map(t => `'${t}'`).join(',')})`)
  
  // Line 143 - VULNERABLE
  .where(sql`LOWER(${tags.name}) IN (${notTerms.map(t => `'${t}'`).join(',')})`)
  ```

**Risk:** An agent might miss these specific lines or implement the fix incorrectly

**Recommendation:** Update task with:
- Exact line numbers
- Code examples showing the vulnerability
- Correct implementation using `inArray()` with proper escaping
- Test cases to verify the fix

---

### Issue #2: CL-002 Secret Rotation - No Guidance on Which Secrets

**Task:** CL-002: Purge Secrets from Git History  
**Current Description:** "Rotate all secrets"  
**Problem:** Doesn't specify which secrets need rotation or where they're used

**Missing Information:**
- Which specific secrets are exposed in `.env.backup`?
- Where are these secrets used in the codebase?
- What services need to be updated (DigitalOcean, database, APIs)?
- Is there a documented procedure for secret rotation?
- Who has access to generate new secrets?

**Risk:** Agent might:
- Miss rotating some secrets
- Break production by rotating wrong secrets
- Not update all locations where secrets are used
- Cause service outages

**Recommendation:** Add detailed checklist:
1. List all exposed secrets
2. Map each secret to its service
3. Provide rotation procedure for each service type
4. Include verification steps
5. Add rollback plan

---

### Issue #3: CL-003 Admin Endpoints - Incorrect Count

**Task:** CL-003: Secure Admin Endpoints  
**Current Description:** "6 admin routers"  
**Actual Count:** 7 admin router files found (including 1 test file)

**Files Found:**
1. `server/routers/admin.ts`
2. `server/routers/adminImport.ts`
3. `server/routers/adminMigrations.ts`
4. `server/routers/adminQuickFix.ts`
5. `server/routers/adminSchemaPush.ts`
6. `server/routers/vipPortalAdmin.ts`
7. `server/routers/vipPortalAdmin.liveCatalog.test.ts` (test file)

**Problem:** 
- Count is off by 1 (or 2 if test file should be excluded)
- Doesn't specify if `vipPortalAdmin.ts` needs the same treatment
- No guidance on how to identify `adminProcedure` vs `publicProcedure`

**Risk:** Agent might:
- Miss one or more admin routers
- Incorrectly modify test files
- Not understand which procedures need changing

**Recommendation:** 
- Provide exact list of files
- Show example of current vs. correct code
- Explain how to identify admin procedures
- Add verification query to check for remaining `publicProcedure` in admin routers

---

### Issue #4: CL-004 Duplicate Schema - Actually Not a Duplicate

**Task:** CL-004: Delete Duplicate Schema  
**Current Description:** "Remove duplicate schema file"  
**Problem:** `schema_po_addition.ts` is NOT a duplicate - it's an **addition file**

**Analysis:**
- File contains `purchaseOrders` and `purchaseOrderItems` tables
- Main schema (`drizzle/schema.ts`) also has `purchaseOrders` defined
- This appears to be a **merge conflict** or **incomplete migration**, not a duplicate
- Simply deleting could break purchase order functionality

**Risk:** 🔴 **CRITICAL** - Deleting this file could:
- Break purchase order features
- Cause database migration issues
- Lose table definitions if they're not in main schema

**Recommendation:** Change task to:
1. **First:** Compare `schema_po_addition.ts` with main `schema.ts`
2. **Verify:** Check if purchase order tables are fully defined in main schema
3. **Test:** Ensure all PO functionality works without this file
4. **Then:** Delete only if confirmed redundant
5. **Add:** Database migration to ensure no data loss

---

### Issue #5: ST-003 Documentation Consolidation - No Criteria

**Task:** ST-003: Consolidate Documentation  
**Current Description:** "Move 60+ markdown files to `docs/archive/`"  
**Problem:** No criteria for which files to archive

**Missing Information:**
- Which 60+ files should be archived?
- What makes a file "outdated" vs "active"?
- Are there dependencies between docs?
- Should README files be preserved?
- What about files referenced in code comments?

**Risk:** Agent might:
- Archive important documentation
- Miss outdated files
- Break documentation links
- Remove files still referenced in code

**Recommendation:** Add specific criteria:
- List files to archive OR provide clear rules
- Specify files that MUST NOT be archived
- Require link checking before archiving
- Add step to update references in code/docs

---

### Issue #6: ST-004 Outdated References - Incomplete Scope

**Task:** ST-004: Remove Outdated References  
**Current Description:** "Remove all Railway and Butterfly Effect references"  
**Problem:** Doesn't specify where to look or what to replace them with

**Missing Information:**
- Are these in code, docs, or both?
- What should replace these references?
- Are there environment variables to update?
- Are there deployment scripts affected?
- What about comments vs. actual code?

**Risk:** Agent might:
- Miss references in certain file types
- Remove comments that provide historical context
- Break deployment if references are in active configs

**Recommendation:** Specify:
- Search scope (code, docs, configs, scripts)
- Replacement values (e.g., "Railway" → "DigitalOcean")
- Files to exclude (e.g., CHANGELOG.md)
- Verification command to check for remaining references

---

### Issue #7: ST-005 Database Indexes - No Audit Method

**Task:** ST-005: Add Missing Database Indexes  
**Current Description:** "Audit all foreign keys and add missing indexes"  
**Problem:** No guidance on how to perform the audit

**Missing Information:**
- How to identify which foreign keys lack indexes?
- What's the query to check current indexes?
- Are there performance metrics to guide prioritization?
- Should all foreign keys have indexes?
- What about composite indexes?

**Risk:** Agent might:
- Miss foreign keys without indexes
- Add unnecessary indexes (performance impact)
- Not test index effectiveness
- Create duplicate indexes

**Recommendation:** Provide:
- SQL query to list foreign keys without indexes
- Performance testing methodology
- Index naming conventions
- Migration script template
- Before/after performance comparison steps

---

### Issue #8: ST-006 Dead Code - File Not Found

**Task:** ST-006: Remove Dead Code  
**Current Description:** Files include `clientNeeds.ts`, `ComponentShowcase.tsx`, `cogsManagement.ts`

**Verification Results:**
- ❌ `server/clientNeeds.ts` - **NOT FOUND**
- ❌ `src/components/ComponentShowcase.tsx` - **NOT FOUND**
- ✅ `server/cogsManagement.ts` - **EXISTS**
- ❓ "29 unused routers" - **NOT VERIFIED**

**Problem:**
- 2 of 3 specific files don't exist (already deleted?)
- No list of the "29 unused routers"
- No method to verify if routers are truly unused

**Risk:** Agent might:
- Waste time searching for non-existent files
- Delete routers that are actually used
- Miss truly unused routers

**Recommendation:**
- Remove non-existent files from list
- Provide actual list of 29 unused routers
- Add verification method (grep for router imports)
- Include test to ensure no broken imports after deletion

---

### Issue #9: RF-001 Consolidate Orders Router - Missing Migration Plan

**Task:** RF-001: Consolidate Orders Router  
**Current Description:** "Merge `orders` and `ordersEnhancedV2` into a single router"  
**Problem:** No guidance on how to merge or which version to keep

**Missing Information:**
- Which router is the "source of truth"?
- Are there conflicting implementations?
- How to handle different API signatures?
- What about existing API clients?
- Is this a breaking change?

**Risk:** Agent might:
- Choose wrong router as base
- Break existing API consumers
- Lose functionality from one router
- Create inconsistent API

**Recommendation:** Specify:
- Which router to use as base
- Conflict resolution strategy
- API compatibility requirements
- Migration path for API consumers
- Testing requirements

---

### Issue #10: RF-003 Fix `any` Types - No Prioritization

**Task:** RF-003: Systematically Fix `any` Types  
**Current Description:** "Start with the top 10 files with the most `any` types"  
**Problem:** Doesn't specify which files or how to identify them

**Missing Information:**
- Which are the top 10 files?
- How to count `any` types per file?
- Are there files that MUST keep `any` (e.g., type guards)?
- What's the acceptable replacement strategy?

**Risk:** Agent might:
- Work on wrong files
- Spend time counting instead of fixing
- Replace `any` with incorrect types
- Break type inference

**Recommendation:** Provide:
- List of top 10 files (or command to generate it)
- Type replacement guidelines
- Files to exclude from refactoring
- Testing requirements for type changes

---

### Issue #11: RF-006 Remove Dependencies - Potential Breaking Change

**Task:** RF-006: Remove Unused Dependencies  
**Current Description:** "Uninstall Clerk and Socket.io"  
**Problem:** These might not be unused - need verification

**Verification Needed:**
- Is Clerk still used for authentication?
- Are there any Socket.io imports in the codebase?
- What about type dependencies?
- Are these in devDependencies or dependencies?

**Risk:** 🔴 **HIGH** - Removing Clerk could:
- Break authentication system
- Remove type definitions
- Cause build failures

**Recommendation:** Change to:
1. **First:** Verify Clerk is truly unused (check for imports)
2. **Check:** Current auth system (appears to be custom, not Clerk)
3. **Verify:** Socket.io is not imported anywhere
4. **Test:** Build and type-check after removal
5. **Document:** What replaced these dependencies

---

### Issue #12: CI-002 Incomplete Features - Too Vague

**Task:** CI-002: Complete Incomplete Features  
**Current Description:** "Modules: Dashboard, calendar, COGS"  
**Problem:** "Missing logic" is too vague - what specifically is incomplete?

**Missing Information:**
- What specific logic is missing in each module?
- How to identify incomplete features?
- What's the definition of "complete"?
- Are there TODO comments marking these?

**Risk:** Agent might:
- Not know what to implement
- Implement wrong features
- Miss actual incomplete logic
- Waste time investigating

**Recommendation:** Either:
- Provide specific list of incomplete features per module
- OR remove this task and create specific tasks for each feature
- OR link to TODO comments that need addressing

---

## 📊 Dependency Analysis

### Identified Dependencies (Not in Roadmap)

Several tasks have **hidden dependencies** not documented:

1. **CL-003 (Secure Admin Endpoints)** depends on:
   - Understanding current auth system
   - Knowing what `adminProcedure` middleware does
   - Access to test admin functionality

2. **ST-005 (Database Indexes)** should happen BEFORE:
   - RF-001 (Consolidate Orders Router) - might change queries
   - Any major refactoring that changes data access patterns

3. **RF-001 (Consolidate Orders Router)** should happen AFTER:
   - Abstraction Layer implementation (listed as dependency)
   - BUT also should wait for ST-005 (indexes) to avoid re-optimization

4. **RF-006 (Remove Clerk)** conflicts with:
   - Current roadmap mentions "current Clerk auth is fine" (line 265)
   - This contradiction needs resolution

---

## 🔄 Task Ordering Issues

### Current Order Problems

1. **Phase 1 tasks can be parallelized** but roadmap doesn't indicate this
2. **ST-005 (Indexes)** should be earlier - affects performance testing of other tasks
3. **RF-001 (Orders Router)** is in Next Sprint but depends on current sprint's Abstraction Layer
4. **Documentation consolidation (ST-003)** should happen LAST in Phase 2, not in the middle

### Recommended Order Changes

**Phase 1 (Parallel execution possible):**
- CL-001, CL-002, CL-003 can run in parallel
- CL-004 needs investigation first (not deletion)

**Phase 2 (Suggested order):**
1. ST-005 (Indexes) - affects all performance work
2. ST-002 (Error Handling) - helps debug other tasks
3. ST-006 (Dead Code) - cleanup before refactoring
4. ST-004 (Outdated References) - cleanup
5. ST-001 (.env Consolidation) - developer experience
6. ST-003 (Documentation) - LAST, after all changes

---

## ⚠️ Missing Context

### Information Not in Roadmap

1. **Testing Requirements:** No mention of test coverage for fixes
2. **Rollback Plans:** No guidance on reverting if something breaks
3. **Performance Metrics:** No baseline or target metrics
4. **Breaking Changes:** No indication of API compatibility concerns
5. **User Communication:** No plan for notifying users of changes
6. **Deployment Strategy:** Should these be deployed individually or batched?

---

## 🎯 Recommendations Summary

### Immediate Actions Required

1. **Update CL-001** with specific line numbers and code examples
2. **Investigate CL-004** before marking as "delete" task
3. **Verify RF-006** - Clerk might still be in use
4. **Create detailed checklist for CL-002** (secret rotation)
5. **Provide file lists** for ST-003 and ST-006
6. **Add verification methods** for all cleanup tasks

### Process Improvements

1. **Add "Verification" section** to each task
2. **Include "Rollback Plan"** for risky changes
3. **Specify "Success Criteria"** for each task
4. **Add "Dependencies"** section explicitly
5. **Include "Breaking Changes"** flag where applicable
6. **Provide "Testing Requirements"** for each task

### Documentation Improvements

1. **Create task templates** with required fields
2. **Add "Agent Checklist"** to each task
3. **Include "Common Pitfalls"** section
4. **Provide "Example Implementation"** for complex tasks
5. **Link to related documentation** or code examples

---

## 📋 Severity Breakdown

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 3 | CL-004 (not duplicate), RF-006 (Clerk), CL-002 (secret rotation) |
| 🟡 High | 6 | CL-001, CL-003, ST-003, ST-006, RF-001, CI-002 |
| 🟢 Medium | 3 | ST-004, ST-005, RF-003 |

**Total Issues:** 12

---

## ✅ Next Steps

1. **Review this QA report** with the team
2. **Update MASTER_ROADMAP.md** with clarifications
3. **Create detailed task specifications** for critical issues
4. **Add verification scripts** where applicable
5. **Document dependencies** explicitly
6. **Re-review** before assigning tasks to agents

---

**Prepared By:** Claude (Manus)  
**Review Date:** November 12, 2025  
**Status:** Ready for roadmap updates
