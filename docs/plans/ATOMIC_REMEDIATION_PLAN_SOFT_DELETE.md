# Atomic Remediation Plan: Complete Soft-Delete Implementation

**Date**: 2025-12-17

**Plan ID**: ATOMIC-REMEDIATION-SOFT-DELETE-001

**Status**: 📋 **READY FOR EXECUTION**

**Estimated Time**: 2-3 hours

**Risk Level**: 🟡 **MEDIUM** (Critical fixes, but low risk of breaking existing functionality)

---

## 1. Executive Summary

This atomic plan addresses all gaps identified in the post-implementation audit of the dashboard soft-delete fix. The plan is structured in four phases, each with clear deliverables, acceptance criteria, and rollback procedures.

The goal is to achieve a **complete, production-ready soft-delete implementation** across the entire `arApDb.ts` module, with proper database indexes and comprehensive test coverage.

---

## 2. Scope and Objectives

### In Scope

- Add soft-delete filters to all 17 missed functions in `server/arApDb.ts`
- Create and deploy database migration for `deletedAt` indexes
- Expand test coverage to include all patched functions
- Full Red Hat QA validation before deployment

### Out of Scope (Future Work)

- Refactoring `arApDb.ts` into smaller modules (tracked separately as technical debt)
- Creating reusable soft-delete query helper (tracked separately)
- Auditing other database modules beyond `arApDb.ts`

---

## 3. Phase Breakdown

### Phase 1: Add Soft-Delete Filters to All Missed Functions

**Objective**: Systematically add `deletedAt IS NULL` filters to all functions that query `invoices`, `payments`, or `bills` tables.

**Functions to Patch** (17 total):

#### Invoices Table (5 functions)

1. `getInvoiceById` - Line 105
2. `getOutstandingReceivables` - Line 212
3. `calculateARAging` - Line 242
4. `recordInvoicePayment` - Line 176
5. `generateInvoiceNumber` - Line 286

#### Payments Table (2 functions)

6. `getPaymentById` - Line 648
7. `generatePaymentNumber` - Line 672

#### Bills Table (7 functions)

8. `getBills` - Line 337
9. `getBillById` - Line 374
10. `getOutstandingPayables` - Line 481
11. `calculateAPAging` - Line 510
12. `recordBillPayment` - Line 445
13. `generateBillNumber` - Line 554

**Implementation Pattern**:

```typescript
// For single-record queries (getById)
.where(and(
  eq(table.id, id),
  sql`${table.deletedAt} IS NULL`
))

// For multi-condition queries
conditions.push(sql`${table.deletedAt} IS NULL`);
```

**Acceptance Criteria**:

- ✅ All 17 functions have soft-delete filter applied
- ✅ No TypeScript errors
- ✅ Code follows existing patterns
- ✅ Automated audit script returns zero gaps

---

### Phase 2: Create and Apply Database Index Migration

**Objective**: Add database indexes on `deletedAt` columns to prevent performance degradation.

**Migration File**: `drizzle/migrations/YYYYMMDD_add_deleted_at_indexes.sql`

**SQL to Execute**:

```sql
-- Add indexes for soft-delete columns
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_bills_deleted_at ON bills(deleted_at);
```

**Acceptance Criteria**:

- ✅ Migration file created
- ✅ Migration tested in development environment
- ✅ Indexes verified in database schema
- ✅ Query performance validated (EXPLAIN ANALYZE)

---

### Phase 3: Expand Test Coverage

**Objective**: Add comprehensive unit tests for all patched functions to ensure soft-delete logic works correctly.

**Test File**: `server/arApDb.test.ts` (expand existing file)

**Test Cases to Add**:

1. `getInvoiceById` excludes soft-deleted invoices
2. `getOutstandingReceivables` excludes soft-deleted invoices
3. `calculateARAging` excludes soft-deleted invoices
4. `getBills` excludes soft-deleted bills
5. `getBillById` excludes soft-deleted bills
6. `getOutstandingPayables` excludes soft-deleted bills
7. `calculateAPAging` excludes soft-deleted bills
8. `getPaymentById` excludes soft-deleted payments

**Acceptance Criteria**:

- ✅ All critical functions have test coverage
- ✅ Tests create both active and soft-deleted records
- ✅ Tests verify that only active records are returned
- ✅ All tests pass

---

### Phase 4: Red Hat QA Validation and Deployment

**Objective**: Perform comprehensive QA validation and deploy to production with monitoring.

**QA Checklist**:

- ✅ Re-run automated audit script (zero gaps)
- ✅ All unit tests pass
- ✅ Manual smoke test of dashboard
- ✅ Manual smoke test of AR/AP pages
- ✅ Database indexes verified
- ✅ Performance test (query execution time <50ms)
- ✅ Code review completed
- ✅ Documentation updated

**Deployment Steps**:

1. Commit all changes with conventional commit message
2. Push to main branch
3. Monitor deployment logs
4. Run database migration
5. Verify application health
6. Monitor error logs for 1 hour

**Rollback Procedure**:

- If critical issues arise, revert commits via `git revert`
- Database indexes are safe to keep (no rollback needed)

---

## 4. Risk Assessment

| Risk                            | Likelihood | Impact | Mitigation                                    |
| ------------------------------- | ---------- | ------ | --------------------------------------------- |
| Breaking existing functionality | Low        | High   | Comprehensive test coverage before deployment |
| Performance degradation         | Low        | Medium | Add indexes before deploying code changes     |
| Incomplete implementation       | Low        | High   | Automated audit script validates completeness |
| Database migration failure      | Low        | Medium | Test migration in dev environment first       |

---

## 5. Success Metrics

This remediation will be considered successful when:

1. **Completeness**: Automated audit script reports zero gaps
2. **Correctness**: All unit tests pass (100% of patched functions)
3. **Performance**: Query execution time remains <50ms with indexes
4. **Production Stability**: No errors in production logs for 24 hours post-deployment
5. **User Experience**: Dashboard and AR/AP pages function correctly

---

## 6. Timeline

| Phase                     | Estimated Time | Dependencies        |
| ------------------------- | -------------- | ------------------- |
| Phase 1: Add filters      | 45 minutes     | None                |
| Phase 2: Database indexes | 30 minutes     | None                |
| Phase 3: Test coverage    | 60 minutes     | Phase 1 complete    |
| Phase 4: QA & deployment  | 30 minutes     | Phases 1-3 complete |
| **Total**                 | **2-3 hours**  | -                   |

---

## 7. Post-Deployment Monitoring

**Immediate (0-1 hour)**:

- Monitor application error logs
- Verify dashboard loads correctly
- Check AR/AP pages for data accuracy

**Short-term (1-24 hours)**:

- Monitor database query performance
- Collect user feedback
- Verify no regression in other features

**Medium-term (1-7 days)**:

- Monitor error rates
- Track query performance trends
- Plan technical debt work (file refactoring)

---

## 8. Technical Debt Tracking

The following items are **out of scope** for this remediation but should be tracked as technical debt:

1. **Refactor `arApDb.ts`**: Break into smaller modules (invoices.db.ts, payments.db.ts, bills.db.ts)
2. **Create soft-delete query helper**: Reusable middleware to automatically apply filters
3. **Audit other modules**: Check if other database modules have similar issues
4. **Strengthen pre-commit hooks**: Add formal bypass process with documentation requirements

---

## 9. Approval and Sign-Off

**Plan Author**: Manus AI (QE Team)

**Reviewed By**: _(Pending)_

**Approved By**: _(Pending)_

**Execution Start**: _(Upon approval)_

---

**Note**: This plan follows ATOMIC COMPLETE principles, ensuring that each phase is fully completed and verified before moving to the next. No phase will be considered "done" until it meets all acceptance criteria.
