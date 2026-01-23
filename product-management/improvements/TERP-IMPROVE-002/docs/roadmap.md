# TERP Dashboard Widgets Improvement Roadmap

**Version:** 1.0
**Date:** January 23, 2026
**Status:** Phase 1 Complete, Phase 2 Ready for Implementation
**Priority:** High
**Risk Level:** Low

---

## 1. Executive Summary

This improvement addresses critical issues in the TERP dashboard widgets where data was being pulled from inconsistent sources, hardcoded values were masking real business metrics, and time period filtering was inconsistent across endpoints.

**Problem Statement:** Dashboard widgets were not working correctly and pulling from different data sources, leading to:

- Hardcoded profit margins (25% in analytics, 60% assumption in dashboard)
- Inconsistent time period filtering across endpoints
- N+1 query patterns causing performance issues
- Missing error handling in frontend widgets

**Current State:** Phase 1 complete (88/100 rating). Key fixes implemented and tested.

**Phase 2 Goal:** Reach 95/100 rating with remaining improvements.

---

## 2. Roadmap Overview

| Phase | Title               | Focus                         | Status       | Key Outcomes                                             |
| :---- | :------------------ | :---------------------------- | :----------- | :------------------------------------------------------- |
| **1** | Critical Fixes      | Data Accuracy & Consistency   | **COMPLETE** | Real profit margins, consistent time filtering, N+1 fix  |
| **2** | Alignment & Cleanup | Code Quality & Data Alignment | Ready        | Analytics alignment, dead code removal, additional tests |

---

## 3. Phase 1: Critical Fixes (COMPLETE)

**Timeline:** Completed January 23, 2026
**Rating:** 88/100

### Completed Tasks

| Task ID  | Task Description                              | Priority     | Files Modified                                                            | Status   |
| :------- | :-------------------------------------------- | :----------- | :------------------------------------------------------------------------ | :------- |
| **1.1**  | Fix hardcoded profitMargin in dashboard.ts    | **Critical** | `server/routers/dashboard.ts`                                             | **DONE** |
| **1.2**  | Fix hardcoded profitMargin in analytics.ts    | **Critical** | `server/routers/analytics.ts`                                             | **DONE** |
| **1.3**  | Fix N+1 query in fetchClientNamesMap          | **High**     | `server/dashboardHelpers.ts`                                              | **DONE** |
| **1.4**  | Add time period filtering to getCashCollected | **High**     | `server/routers/dashboard.ts`                                             | **DONE** |
| **1.5**  | Add time period filtering to getClientDebt    | **High**     | `server/routers/dashboard.ts`                                             | **DONE** |
| **1.6**  | Update CashCollectedLeaderboard widget        | **High**     | `client/src/components/dashboard/widgets-v2/CashCollectedLeaderboard.tsx` | **DONE** |
| **1.7**  | Update ClientDebtLeaderboard widget           | **High**     | `client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx`    | **DONE** |
| **1.8**  | Fix test regression in dashboard.test.ts      | **Critical** | `server/routers/dashboard.test.ts`                                        | **DONE** |
| **1.9**  | Add error handling to all widgets             | **Medium**   | Multiple widget files                                                     | **DONE** |
| **1.10** | Remove unused imports                         | **Low**      | `server/routers/dashboard.ts`                                             | **DONE** |

### Technical Details

**1.1 & 1.2: Profit Margin Fix**

- **Before:** `profitMargin: 25` (hardcoded) and `cost = revenue * 0.4` (assumed 60% margin)
- **After:** Actual COGS calculation from `invoiceLineItems` joined with `batches.unitCogs`
- **Fallback:** 70% margin for legacy invoices without batch-linked line items

**1.3: N+1 Query Fix**

- **Before:** Individual DB call per customer ID
- **After:** Bulk `IN` clause query for all customer IDs at once

**1.4-1.7: Time Period Filtering**

- Added consistent `timePeriod` enum: `LIFETIME | YEAR | QUARTER | MONTH`
- Applied to: `getSalesByClient`, `getCashCollected`, `getClientDebt`, `getClientProfitMargin`, `getCashFlow`

---

## 4. Phase 2: Alignment & Cleanup (TO DO)

**Timeline:** 2-3 hours
**Target Rating:** 95/100

| Task ID | Task Description                                      | Priority   | Files to Modify                    | Acceptance Criteria                                                                   |
| :------ | :---------------------------------------------------- | :--------- | :--------------------------------- | :------------------------------------------------------------------------------------ |
| **2.1** | Align analytics profit margin to use invoiceLineItems | **Medium** | `server/routers/analytics.ts`      | Analytics and dashboard endpoints use same data source for profit margin calculations |
| **2.2** | Remove dead calculateARAging() call                   | **Low**    | `server/routers/dashboard.ts:574`  | Unused database call removed to improve performance                                   |
| **2.3** | Add integration tests for time period filtering       | **Medium** | `server/routers/dashboard.test.ts` | Tests verify LIFETIME, YEAR, QUARTER, MONTH filtering works correctly                 |
| **2.4** | Add null check for cogsPerUnit in analytics           | **Low**    | `server/routers/analytics.ts`      | Defensive coding for cases where cogsPerUnit is NULL                                  |
| **2.5** | Document inventoryChange limitation                   | **Low**    | `server/routers/dashboard.ts`      | Clear documentation that inventoryChange requires snapshot infrastructure             |

**Dependencies:** Phase 1 Complete (done)

---

## 5. Phase 3: Inventory Snapshots (FUTURE)

**Timeline:** 3-5 hours
**Status:** Backlog - Low Priority

| Task ID | Task Description                 | Priority   | Files to Create/Modify                 | Acceptance Criteria                                               |
| :------ | :------------------------------- | :--------- | :------------------------------------- | :---------------------------------------------------------------- |
| **3.1** | Create inventory_snapshots table | **Medium** | `drizzle/schema.ts`, migration         | Table stores daily inventory value snapshots                      |
| **3.2** | Implement snapshot cron job      | **Medium** | `server/cron/inventorySnapshotCron.ts` | Daily job captures inventory totals at midnight                   |
| **3.3** | Update getKpis to use snapshots  | **Medium** | `server/routers/dashboard.ts`          | `inventoryChange` KPI shows real percentage change vs 30 days ago |

**Dependencies:** Phase 2 Complete

---

## 6. Known Limitations

| Limitation                                                         | Impact                            | Workaround                   | Future Fix              |
| :----------------------------------------------------------------- | :-------------------------------- | :--------------------------- | :---------------------- |
| `inventoryChange` always returns 0                                 | Low - KPI shows no change         | Documented in code           | Phase 3 implementation  |
| Analytics uses `orderLineItems`, Dashboard uses `invoiceLineItems` | Medium - Different profit margins | Documented                   | Phase 2 Task 2.1        |
| Debts without dates included in time filters                       | Low - Edge case                   | `return true` for null dates | Consider `return false` |

---

## 7. Files Modified (Phase 1)

### Backend

- `server/routers/dashboard.ts` - Major refactor for real COGS, time filtering
- `server/routers/analytics.ts` - Real profit margin from orderLineItems
- `server/dashboardHelpers.ts` - Bulk query for client names
- `server/routers/dashboard.test.ts` - Fixed test regression

### Frontend

- `client/src/components/dashboard/widgets-v2/CashCollectedLeaderboard.tsx`
- `client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx`
- `client/src/components/dashboard/widgets-v2/ClientProfitMarginLeaderboard.tsx`
- `client/src/components/dashboard/widgets-v2/SalesByClientWidget.tsx`
- `client/src/components/dashboard/widgets-v2/CashFlowWidget.tsx`
- `client/src/components/dashboard/widgets-v2/TotalDebtWidget.tsx`
- `client/src/components/dashboard/widgets-v2/TransactionSnapshotWidget.tsx`
- `client/src/components/dashboard/widgets-v2/ProfitabilityWidget.tsx`

---

## 8. Test Results

```
Test Files: 3 passed (3)
Tests: 31 passed (31)
Duration: 17.36s

Suites:
- server/routers/dashboard.test.ts (8 tests)
- server/routers/dashboard.pagination.test.ts (10 tests)
- server/routers/analytics.test.ts (13 tests)
```

---

## 9. Success Metrics

### Phase 1 (Complete)

- [x] Real profit margins calculated from actual COGS data
- [x] Consistent time period filtering across all dashboard endpoints
- [x] N+1 query eliminated from client name lookups
- [x] All 31 tests passing
- [x] Build succeeds with no errors
- [x] No lint errors

### Phase 2 (Target)

- [ ] Analytics and dashboard profit margins aligned to same data source
- [ ] Dead code removed
- [ ] Additional test coverage for time period filtering
- [ ] Rating: 95/100

### Phase 3 (Future)

- [ ] `inventoryChange` KPI shows real percentage change
- [ ] Daily inventory snapshots captured
- [ ] Rating: 98/100

---

## 10. Commits

| Commit Hash | Description                                                                  |
| :---------- | :--------------------------------------------------------------------------- |
| `92bf7a3`   | fix: Dashboard widgets comprehensive fixes                                   |
| `dd667e2`   | fix: Dashboard improvements - real profit margin & consistent time filtering |
| `b575d17`   | fix: Add missing mock for getInvoices in dashboard test                      |

---

## 11. References

- **Branch:** `claude/fix-dashboard-widgets-OxGSc`
- **Session:** https://claude.ai/code/session_011p2csmMqy5EfVnT6h6Xvdc
- **Related Files:**
  - `server/dashboardHelpers.ts`
  - `server/arApDb.ts`
  - `server/inventoryDb.ts`
  - `drizzle/schema.ts` (batches, invoiceLineItems, orderLineItems tables)
