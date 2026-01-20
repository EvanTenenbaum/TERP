# Incomplete Features Audit - January 2026

**Generated:** 2026-01-20
**Analysis Period:** December 20, 2025 - January 20, 2026
**Total Commits Analyzed:** 484
**Method:** Git commit history analysis (not roadmap-based)

---

## Executive Summary

This audit analyzed every commit from the past month to identify features, tools, and product work that was started but not completed. The analysis was conducted by examining actual code changes, not roadmap documentation.

### Key Findings

| Category | Incomplete Features | Severity |
|----------|---------------------|----------|
| Work Surfaces | 24 issues (3 P0, 8 P1) | Critical |
| Live Shopping | 15 incomplete items | High |
| E2E Testing | 15+ routes untested, 38 mobile issues | High |
| Hour Tracking (MEET-048) | Backend complete, no frontend | High |
| Navigation Accessibility | 8 hidden routes not surfaced | Medium |
| Photography Module | UI not integrated | Medium |
| Sales Sheets | 5 features incomplete | Medium |
| Accounting | 3 sub-routers missing | Medium |
| Mobile Responsiveness | 38 documented issues | Medium |
| Notifications | Email/SMS not implemented | Medium |
| TypeScript Debt | 615 `as any` casts, 2 compiler errors | Low-Medium |

---

## 1. Work Surfaces Feature (95% Implemented, 24 Issues)

**Commits:** Sprints 0-8 (commits `e8b59cf` through `6938ce4`)

### P0 Blockers (Block Production)

| Issue | File | Description |
|-------|------|-------------|
| **P0-001** | `InvoicesWorkSurface.tsx:717-724` | Payment recording mutation is a stub - shows success without saving |
| **P0-002** | `InventoryWorkSurface.tsx`, `inventoryUtils.ts` | Flexible lot selection not implemented - users can't select specific batches |
| **P0-003** | `schema.ts`, `ordersDb.ts:1564-1570` | Order status machine incomplete - missing RETURNED status with restock/vendor-return paths |

### P1 Critical Issues (8 total)

- Missing void reason field on invoices
- No debounce on rapid state transitions
- Optimistic locking optional (version check skipped)
- Mixed feature flag evaluation patterns
- Query error states not displayed
- Uses deprecated `vendors.getAll` endpoint
- `getEffectiveFlags` missing permission check
- **Zero component unit tests** for all 9 Work Surface components

### Work Surfaces Not Yet Routed
All 9 Work Surface components exist but are NOT wired into `App.tsx` routes. They sit dormant behind feature flags.

---

## 2. Live Shopping Module (Substantially Implemented, Critical Gaps)

**Commits:** `MEET-075-BE`, `MEET-075-FE`, SSE infrastructure

### Incomplete Features

| Feature | Status | Location |
|---------|--------|----------|
| Extension count validation | TODO at line 382 | `sessionTimeoutService.ts` |
| SSE event naming mismatch | Backend: `SESSION_TIMEOUT_WARNING`, Frontend expects: `TIMEOUT_WARNING` | `useLiveSessionSSE.ts:135-147` |
| Schema extensions not applied | `liveSessionId` FK not added to orders | `schema-extensions-live-shopping.ts` |
| VIP client detail view | Shows "Console view coming soon" alert | `LiveShoppingPage.tsx:~77` |
| Price negotiation timeout handling | Unclear what happens if session times out during negotiation | `vipPortalLiveShopping.ts` |
| Sample request fulfillment | Items marked SAMPLE_REQUEST but no fulfillment workflow | `sessionCartService.ts` |
| Client-side timeout timer | No VIP-facing timer component | - |

---

## 3. E2E Testing Infrastructure (Significant Gaps)

**Commits:** `E2E-001`, `E2E-002`, `E2E-003` (completed infrastructure, incomplete coverage)

### Routes Needing Test Coverage

- `/accounting/chart-of-accounts`, `/accounting/general-ledger`, `/accounting/expenses`, `/accounting/bank-accounts`
- `/vendor-supply`, `/sampling`, `/analytics`, `/scheduling`
- `/photography`, `/matchmaking`, `/live-shopping`, `/help`
- `/intake/verify/:token`, `/admin-setup`

### Test Quality Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Skipped tests | `orders-crud.spec.ts:226, 261` | Search and filter tests conditionally skipped |
| Known bugs documented | `kpi-actionability.spec.ts:137` | BUG-031: Table filtering broken |
| Mobile testing | 60% coverage only | MOB-003 to MOB-005 need testing |
| Visual regression | Not in CI | Argos not activated |
| Accessibility violations | Logged but not failing tests | `accessibility.spec.ts:55` |

---

## 4. Scheduling System - MEET-048 Hour Tracking (Backend Only)

**Commits:** `fa25947` - employee hour tracking router

### Complete (Backend)
- `clockIn`, `clockOut`, `startBreak`, `endBreak`
- `listTimeEntries`, `createManualEntry`, `adjustTimeEntry`
- `approveTimeEntry`, `getTimesheet`, `getHoursReport`, `getOvertimeReport`
- Full database schema in `schema-scheduling.ts:662-955`

### Missing (Frontend)
- No `HourTrackingPage.tsx`
- No clock in/out UI component
- No timesheet view component
- No time entry management UI
- No route in `App.tsx`

---

## 5. Navigation Accessibility (8 Routes Hidden)

**Commits:** `21d4676` (added NAV-001-005), `9c90f02` (spec added)

### Hidden Routes Not in Sidebar

| Route | Target Group | Status |
|-------|--------------|--------|
| `/leaderboard` | Sales | Hidden |
| `/needs` | Sales | Hidden |
| `/matchmaking` | Sales | Hidden |
| `/quotes` | Sales | Hidden |
| `/returns` | Sales | Hidden |
| `/vendor-supply` | Inventory | Hidden |
| `/pricing/rules` | Finance | Hidden |
| `/workflow-queue` | Admin | Hidden |

**Also Missing:** These 8 routes not in Command Palette (Cmd+K)

---

## 6. Photography Module (Backend Complete, UI Not Integrated)

**Commits:** `WS-010`

### Incomplete Integration

| Feature | Status | Location |
|---------|--------|----------|
| PhotographyModule component | Built (689 lines) but never used | `PhotographyModule.tsx` |
| PhotographyPage | Only shows queue, no upload capability | `PhotographyPage.tsx` |
| Upload implementation | Simulates upload, doesn't persist | Lines 228-252 |
| Presigned URLs | Not implemented | Spec requires `photos.getUploadUrl` |
| Photo approval workflow | Not implemented | No review endpoint |
| Image cropping | Declared in header, not implemented | Line 1-11 |
| Background removal | Declared in header, not implemented | Line 1-11 |

---

## 7. Sales Sheets Module (Partial)

**Commits:** Multiple sales sheet improvement commits

### Incomplete Features

| Feature | Status | Backend |
|---------|--------|---------|
| Template management UI | Not implemented | Functions exist |
| Column visibility toggle | Schema supports, no UI | - |
| Sales sheet history view | No UI page | Queries exist |
| Convert to Quote button | Only "To Order" in UI | Backend supports both |
| Bulk orders creation | No UI | `createBulkOrdersFromSalesSheet()` exists |

---

## 8. Accounting Module (Core Complete, Reports Missing)

**Commits:** Various accounting-related

### Skipped Tests (indicating missing features)

```
accounting.test.ts:248 - getARSummary (NOT_IMPLEMENTED)
accounting.test.ts:272 - getAPSummary (NOT_IMPLEMENTED)
accounting.test.ts:298 - listExpenses (sub-router not implemented)
accounting.test.ts:318 - createExpense (depends on above)
accounting.test.ts:350 - generateBalanceSheet (sub-router not implemented)
accounting.test.ts:375 - generateIncomeStatement (sub-router not implemented)
```

### Missing Sub-routers
- `arAp` sub-router
- `cashExpenses` sub-router
- `reports` sub-router

---

## 9. Mobile Responsiveness (38 Issues Documented)

**Commits:** Multiple mobile-related fixes

### QA-049 Critical Issues

| Issue | Component | Status |
|-------|-----------|--------|
| #1 | Sidebar Navigation | Basic only |
| #2 | Data Tables | Horizontal scroll not optimized |
| #3 | Dashboard Widgets | Not responsive |
| #4 | Modal Dialogs | Not mobile-adapted |
| #5 | Order Creator Page | Multi-column not stacked |
| #6 | Inventory Cards Grid | May not adapt |
| #7 | Calendar Views | Unusable on mobile |
| #12 | VIP Portal | Not optimized for mobile clients |

### Missing Mobile Patterns
- Swipe gestures (specified but not implemented)
- Long-press context menus
- Pull-to-refresh
- Touch targets not 44x44px

---

## 10. Notification System (Core Works, Email/SMS Not Implemented)

**Commits:** `NOTIF-001`

### NOT_IMPLEMENTED Endpoints

```typescript
// receipts.ts:462-475
sendEmail: throws NOT_IMPLEMENTED

// receipts.ts:481-493
sendSms: throws NOT_IMPLEMENTED
```

### Other Incomplete

| Feature | Status |
|---------|--------|
| FEAT-023 Admin UI | Backend complete, no admin settings page |
| Quiet hours enforcement | Settings stored, not enforced |
| Email channel delivery | Stored but never sent |

---

## 11. VIP Portal (Core Complete, Minor Gaps)

**Commits:** `MEET-041`, `MEET-042`, `MEET-043`

### Incomplete Items

| Feature | Status | Location |
|---------|--------|----------|
| Supply listing endpoints | TODO - awaiting schema | `vipPortal.ts.backup:577, 595, 606` |
| Password reset email | Stub only | `vipPortal.ts.backup:154` |
| Credit utilization calculation | Returns 0, TODO | `vipPortal.ts.backup:271` |
| Tier history query | SQL joins may not work in Drizzle | `vipTiers.ts:359-371` |

---

## 12. Inventory Features (Mostly Complete)

**Commits:** `MEET-023`, `WS-008`, `WS-009`, `MEET-067`, `MEET-068`

### One Major Gap

| Feature | Task | Status |
|---------|------|--------|
| Batch Tracking by Vendor | MEET-023 | NOT STARTED |

**Implemented:** Low stock alerts (WS-008), Shrinkage tracking (WS-009), Storage zones (MEET-067), Multi-site support (MEET-068)

---

## 13. Security/RBAC (Production Ready, Test Gaps)

**Commits:** `SEC-001` through `SEC-022`

### Test Mock Issues (8 TODOs)

Files with broken mock chains:
- `rbac-roles.test.ts`: Lines 123, 159, 511, 560
- `rbac-permissions.test.ts`: Lines 60, 187, 214, 564

### E2E Test Coverage Gaps

| Test | Status |
|------|--------|
| SEC-004 Inventory Manager restrictions | Partial |
| SEC-005 Accountant restrictions | Partial |
| SEC-006 Auditor read-only access | Needs testing |

---

## 14. TypeScript & Technical Debt

**Commits:** `TS-001`, various TypeScript fix commits

### Current State

| Issue | Count |
|-------|-------|
| Compiler errors | 2 (missing type definitions) |
| `as any` type casts | 615 across 158 files |
| Files with @ts- directives | 6 |

### Top Offending Files

- `optimisticLocking.test.ts`: 24 `as any`
- `rbac-roles.test.ts`: 24 `as any`
- `rbac-permissions.test.ts`: 22 `as any`
- `SalesSheetEnhancements.ts`: 11 `as any`

---

## 15. Spreadsheet/Grid Features (Race Conditions)

**Commits:** Various spreadsheet improvements

### Critical Issues

| Issue | File | Description |
|-------|------|-------------|
| P2-006 | `PickPackGrid.tsx` | Race condition - uses separate `refetch()` calls instead of `Promise.all()` |
| Row grouping | `InventoryGrid.tsx` | Removed due to AG-Grid Community edition |
| Flexible lot selection | All grids | P0-002 - blocks production |

---

## Validation Against Roadmap

Cross-referencing with `MASTER_ROADMAP.md` confirms:

### Roadmap Says Complete, Actually Incomplete:
- WS-010 Photography Module (marked complete, UI not integrated)
- FEAT-023 Notification Preferences (marked complete, admin UI missing)

### Roadmap Accurately Tracks:
- Navigation Enhancement (NAV-006 to NAV-016) - 11 tasks open
- Work Surfaces Deployment (DEPLOY-001 to DEPLOY-008)
- Work Surfaces QA Blockers (WSQA-001 to WSQA-003)
- All Beta reliability tasks (REL-001 to REL-017)

---

## Recommendations

### Immediate (P0 - Production Blockers)
1. **WSQA-001**: Wire payment recording mutation in InvoicesWorkSurface
2. **WSQA-002**: Implement flexible lot selection
3. **WSQA-003**: Add RETURNED order status with processing paths
4. Fix Live Shopping SSE event naming mismatch

### High Priority (P1)
1. Create Hour Tracking frontend (MEET-048)
2. Integrate PhotographyModule into PhotographyPage
3. Add 8 hidden routes to navigation sidebar (NAV-006 to NAV-013)
4. Fix PickPackGrid race condition
5. Implement accounting reports sub-router

### Medium Priority (P2)
1. Complete Sales Sheets template management UI
2. Implement Email/SMS notification delivery
3. Add mobile responsiveness fixes (38 issues)
4. Create Work Surface component unit tests (9 needed)
5. Fix TypeScript `as any` casts (target high-traffic files first)

---

## Files Reference

All incomplete feature locations documented with absolute paths throughout this report. Key directories:

- Work Surfaces: `/home/user/TERP/client/src/components/work-surface/`
- Live Shopping: `/home/user/TERP/server/services/live-shopping/`
- Scheduling: `/home/user/TERP/server/routers/scheduling.ts`, `/home/user/TERP/server/routers/hourTracking.ts`
- Photography: `/home/user/TERP/client/src/components/inventory/PhotographyModule.tsx`
- Navigation: `/home/user/TERP/client/src/config/navigation.ts`
- E2E Tests: `/home/user/TERP/tests-e2e/`

---

*This report was generated by analyzing 484 commits from December 20, 2025 to January 20, 2026.*
