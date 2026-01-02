# TypeScript Error Mitigation Plan

**Version:** 1.0  
**Created:** January 2, 2026  
**Status:** PLANNED

---

## Current State

**Pre-existing TypeScript Errors:** 249  
**Source:** Sprint A baseline capture (January 2, 2026)

---

## Error Categories

Based on Sprint A analysis, the errors fall into these categories:

| Category                       | Count (Est.) | Severity | Priority |
| ------------------------------ | ------------ | -------- | -------- |
| `saleStatus` enum mismatch     | ~50          | HIGH     | P1       |
| `db` possibly null checks      | ~30          | MEDIUM   | P2       |
| Missing method implementations | ~10          | MEDIUM   | P2       |
| Type inference issues          | ~100         | LOW      | P3       |
| Import path issues             | ~30          | LOW      | P3       |
| Other                          | ~29          | VARIES   | P3       |

---

## Mitigation Strategy

### Phase 1: Immediate (This Week)

**Goal:** Prevent new errors from being introduced

1. **Enable strict mode for new files:**

   ```json
   // tsconfig.json - add to compilerOptions
   "noImplicitAny": true,  // for new files only via path pattern
   ```

2. **Add pre-commit hook:**

   ```bash
   # .husky/pre-commit
   pnpm typecheck --files $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
   ```

3. **Document known errors:**
   - Create `docs/tech-debt/KNOWN_TS_ERRORS.md`
   - List each error with file, line, and reason

### Phase 2: Short-Term (Sprint B)

**Goal:** Fix high-severity errors

1. **Fix `saleStatus` enum issues:**
   - File: `server/routers/unifiedSalesPortal.ts`
   - Issue: Using `FULFILLED`/`DELIVERED` which are `fulfillmentStatus` values
   - Solution: Use correct enum or add missing values

2. **Fix `db` null checks:**
   - Files: `server/routers/vendorReminders.ts` and others
   - Issue: `db` can be null in some contexts
   - Solution: Add null guards or use non-null assertion where safe

3. **Add missing method implementations:**
   - File: `server/services/featureFlagService.ts`
   - Issue: Missing `getAuditHistory` method
   - Solution: Implement the method

### Phase 3: Medium-Term (Sprints C-D)

**Goal:** Reduce error count by 50%

1. **Type inference fixes:**
   - Add explicit type annotations where inference fails
   - Use generics properly in utility functions

2. **Import path cleanup:**
   - Standardize import paths
   - Use path aliases consistently

### Phase 4: Long-Term (Q2 2026)

**Goal:** Zero TypeScript errors

1. **Enable strict mode globally:**

   ```json
   // tsconfig.json
   "strict": true
   ```

2. **Add CI/CD gate:**
   - Fail builds on any TypeScript error
   - Currently: warnings only

---

## Success Metrics

| Milestone        | Target Date  | Error Count  |
| ---------------- | ------------ | ------------ |
| Baseline         | Jan 2, 2026  | 249          |
| Phase 1 Complete | Jan 9, 2026  | 249 (no new) |
| Phase 2 Complete | Jan 23, 2026 | <150         |
| Phase 3 Complete | Feb 20, 2026 | <125         |
| Phase 4 Complete | Apr 30, 2026 | 0            |

---

## Resources Required

- **Developer Time:** 2-3 days per phase
- **Testing:** Regression testing after each phase
- **Review:** Code review for all fixes

---

## Risk Mitigation

1. **Breaking Changes:** All enum fixes must be backward compatible
2. **Regression:** Full test suite must pass after each phase
3. **Scope Creep:** Focus only on TypeScript errors, not refactoring

---

## Tracking

Progress will be tracked in:

- GitHub Issues: Label `tech-debt:typescript`
- Sprint Planning: Allocate 10% capacity per sprint
- Weekly Report: Include error count trend

---

**Owner:** Development Team  
**Reviewer:** Tech Lead
