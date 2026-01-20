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

---

## QA Pass - Additional Findings

The following items were identified in a follow-up QA pass:

### Missed in Initial Analysis

#### 1. CreditsPage - Fully Built But Not Routed
- **File:** `client/src/pages/CreditsPage.tsx`
- **Status:** Complete page with issue/apply/void functionality
- **Issue:** Imported in App.tsx but NO ROUTE defined - users cannot access this feature

#### 2. VendorSupplyPage - Creation Disabled
- **File:** `client/src/pages/VendorSupplyPage.tsx:96`
- **Status:** Shows "Feature In Development" alert when trying to add supply
- **Missing:** Supply creation form, edit functionality, "Find Matching Clients" button

#### 3. MatchmakingServicePage - Action Buttons Not Wired
- **File:** `client/src/pages/MatchmakingServicePage.tsx`
- **Missing Handlers:**
  - "View Buyers" button (line 385) - no implementation
  - "Reserve" button (line 388) - no implementation
  - "Create Quote" button (line 456) - may not connect to workflow
  - "Dismiss" button (line 459) - no dismissal logic

#### 4. Audit Router - Placeholder Accounting Data
- **File:** `server/routers/audit.ts`
- **Line 532:** `getAccountBalanceBreakdown` - "placeholder - journal entries table not implemented"
- **Line 645:** `getEntityHistory` returns `[]` for transactions/orders - "not yet implemented"

#### 5. Alerts Router - Stock Thresholds Disabled
- **File:** `server/routers/alerts.ts:379-398`
- **Status:** `setThresholds` mutation throws "not yet available - requires schema migration"
- **Missing:** `minStockLevel` and `targetStockLevel` columns in schema

#### 6. Quotes Router - Email Not Sent
- **File:** `server/routers/quotes.ts:294`
- **Status:** TODO comment: "Send email notification to client"
- **Issue:** `sendQuote` mutation doesn't actually send emails

#### 7. Live Catalog Service - Brand/Pricing Incomplete
- **File:** `server/services/liveCatalogService.ts`
- **Line 357:** TODO: implement when brand data is available
- **Line 367:** TODO: implement with pricing engine

#### 8. Calendar Test Data - Recurring Events Missing
- **File:** `server/scripts/seed-calendar-test-data.ts:201`
- **Status:** TODO: Create recurring events (requires schema migration)

#### 9. BatchDetailDrawer - Product Relations Disabled
- **File:** `client/src/components/inventory/BatchDetailDrawer.tsx`
- **Lines 465, 475:** TODO: Re-enable when API includes product relation
- **Line 891:** TODO: Calculate from profitability data

#### 10. Dashboard Widgets V3 Migration Incomplete
- **File:** `client/src/components/dashboard/widgets-v3/index.ts:2`
- **Status:** TODO: Widgets are being migrated from v2 to v3

### Additional Hidden Routes (Not in Navigation)

These routes exist in App.tsx but are not accessible via navigation:

| Route | Description |
|-------|-------------|
| `/account` | User account settings |
| `/client-ledger` | Client ledger view |
| `/help` | Help/documentation center |
| `/inbox` | Messages inbox |
| `/intake-receipts` | Intake verification (FEAT-008) |
| `/leaderboard` | Team leaderboard |
| `/locations` | Location management |
| `/needs` | Client needs |
| `/returns` | Returns management |
| `/sales-portal` | Unified sales portal |
| `/settings/cogs` | COGS settings |
| `/settings/notifications` | Notification preferences |
| `/vendor-supply` | Vendor supply management |

### VIP Portal Backup File TODOs

The `vipPortal.ts.backup` file contains stub implementations:
- `sendPasswordReset` - returns token without sending email
- `getClientDashboard` - returns hardcoded `creditUtilization: 0`
- `createSupply`, `updateSupply`, `cancelSupply` - all return stub responses

---

## Updated Summary

| Category | Original Count | QA Pass Additions | Total |
|----------|----------------|-------------------|-------|
| P0 Blockers | 4 | 0 | 4 |
| Missing Features | 15 | 10 | 25 |
| Hidden Routes | 8 | 13 | 21 |
| Stub/Placeholder Code | 2 | 8 | 10 |
| Disabled UI Actions | 0 | 4 | 4 |

---

---

## Deep QA Pass - Critical Additional Findings

A more thorough QA pass uncovered significant additional issues:

### 1. Silent Financial Data Loss (CRITICAL)

**File:** `server/accountingHooks.ts`

GL posting failures are **silently ignored**, allowing financial transactions to complete without creating ledger entries:

| Function | Line | Issue |
|----------|------|-------|
| `postSaleGLEntries` | 173 | Standard accounts not found → GL skipped but sale completes |
| `postPaymentGLEntries` | 224 | Standard accounts not found → GL skipped but payment completes |
| `postRefundGLEntries` | 274 | Standard accounts not found → GL skipped but refund completes |
| `postCOGSGLEntries` | 323 | Standard accounts not found → GL skipped but COGS completes |

**Impact:** Financial records may be incomplete. Sales/payments recorded but accounting ledger entries missing.

---

### 2. PII Leak Detection Triggers (SECURITY)

**File:** `server/services/leaderboard/privacySanitizer.ts`

The privacy sanitizer is actively detecting and blocking PII leaks:

| Line | Detection |
|------|-----------|
| 126 | "CRITICAL: PII detected in sanitized response, returning empty" |
| 154 | "PII LEAK DETECTED: Found forbidden field..." (client names) |
| 162 | "PII LEAK DETECTED: Found TERI code pattern..." |
| 169 | "PII LEAK DETECTED: Found email pattern..." |
| 176 | "PII LEAK DETECTED: Found phone pattern..." |

**Impact:** These defensive checks indicate production PII leak attempts are being blocked.

---

### 3. Database Schema Mismatches (Active Bugs)

| Column Reference | Actual Column | Status | Files |
|------------------|---------------|--------|-------|
| `products.name` | `products.nameCanonical` | **ACTIVE BUG** | storage.ts:1076 |
| `batches.quantity` | `batches.onHandQty` | **DOCUMENTED** | photography.ts, analytics.ts |
| `clients.tier` | N/A (doesn't exist) | **WORKAROUND** | referrals.ts:5, alerts.ts:538 |
| `clients.isActive` | N/A (doesn't exist) | **DOCUMENTED** | referrals.ts:499 |

**Root Cause:** December 31, 2025 migration created columns in database but Drizzle schema NOT updated.

---

### 4. Deprecated Vendor Router (Migration Incomplete)

**File:** `server/routers/vendors.ts`

All 6 procedures deprecated but still in use:

| Procedure | Line | Replacement |
|-----------|------|-------------|
| `vendors.getAll` | 29 | `clients.list` with `clientTypes=['seller']` |
| `vendors.getById` | 71 | `clients.getById` |
| `vendors.search` | 133 | `clients.list` with search |
| `vendors.create` | 181 | `clients.create` with `isSeller=true` |
| `vendors.update` | 243 | `clients.update` |
| `vendors.delete` | 325 | `clients.delete` |

**Also:** `purchaseOrders.ts` has 3 deprecated procedures (lines 103, 194, 431)

---

### 5. Unused Dashboard Widgets (Abandoned Features)

**Location:** `client/src/components/dashboard/widgets-v2/`

5 fully-built widgets exported but NEVER used in DashboardV3:

| Widget | Backend Procedure | Status |
|--------|-------------------|--------|
| CashCollectedLeaderboard | `dashboard.getCashCollected` | NOT INTEGRATED |
| ClientDebtLeaderboard | `dashboard.getClientDebt` | NOT INTEGRATED |
| ClientProfitMarginLeaderboard | `dashboard.getClientProfitMargin` | NOT INTEGRATED |
| TopStrainFamiliesWidget | `useTopStrainFamilies` hook | NOT INTEGRATED |
| SmartOpportunitiesWidget | `clientNeeds.getSmartOpportunities` | NOT INTEGRATED |

**Also:** 3 stub components (ActivityLogPanel, CommentsPanel, TemplateSelector)

---

### 6. RTL/i18n Support (Planned But Abandoned)

**File:** `client/src/lib/rtlUtils.ts`

11 utility functions exported but **0 usages** anywhere:
- `isRTL()`, `getDirection()`, `getDirectionalIconClasses()`
- `getIconWrapperClasses()`, `shouldIconBeMirrored()`
- `getLogicalSpacing()`, `neverMirrorIcons`, `shouldMirrorIcons`, `logicalProperties`

**Indicates:** Right-to-left language support was planned but never implemented.

---

### 7. Known Property Test Bugs (Unfixed)

**Tests skipped due to discovered bugs:**

| Bug ID | File | Issue |
|--------|------|-------|
| PROP-BUG-001 | `adversarial.property.test.ts:128` | `calculateAvailableQty` returns NaN for adversarial inputs |
| PROP-BUG-002 | `validation.property.test.ts:88` | `normalizeProductName` fails to trim whitespace |
| PROP-BUG-003 | `validation.property.test.ts:67` | `normalizeProductName` is NOT idempotent |

---

### 8. Hardcoded Values Requiring Configuration

| File | Line | Value | Issue |
|------|------|-------|-------|
| `vipPortal.ts` | 690 | `creditUtilization = 0` | creditLimit field missing |
| `dashboard.ts` | 192 | `lowStockCount = 0` | Query not implemented |
| `liveCatalogService.ts` | 357 | `brands = []` | Brand data not available |
| `liveCatalogService.ts` | 367 | `priceRange.max = 1000` | Pricing engine not integrated |
| `BatchDetailDrawer.tsx` | 891 | `currentAvgPrice = 0` | Profitability data missing |
| `matchingEngine.ts` | 291, 428 | `strainType: null` | Product join not implemented |

---

### 9. Skipped Test Suites (Features Not Implemented)

| Test File | Line | Reason |
|-----------|------|--------|
| `vipPortal.liveCatalog.test.ts` | 57 | Mixed mock/real DB pattern needs refactoring |
| `calendarInvitations.test.ts` | 24 | Requires real database connection |
| `accounting.test.ts` | 248-375 | 6 tests skipped - sub-routers not implemented |
| `rbac-permissions.test.ts` | 61, 188, 215 | Mock chain issues (TODO comments) |
| `rbac-roles.test.ts` | 124, 160, 512, 561 | Mock chain issues (TODO comments) |
| `inventory.test.ts` | 224, 233 | Dynamic imports hard to mock |
| `credits.test.ts` | 209 | Complex invoice updates |
| `badDebt.test.ts` | 197 | Aggregated data complexity |

---

### 10. Feature Flags Disabled By Default

| Flag | Default | Purpose |
|------|---------|---------|
| `FEATURE_LIVE_CATALOG` | false | VIP Portal Live Catalog |
| `FEATURE_EMAIL_ENABLED` | false | Email integration |
| `FEATURE_SMS_ENABLED` | false | SMS integration |
| `FEATURE_LIVE_SHOPPING_ENABLED` | false | Live Shopping Module |
| `spreadsheet-view` | false | Spreadsheet View nav item |
| Work Surface flags (8) | false | All Work Surface components |

---

### 11. Poor Error Handling (23+ Files)

**Console.error instead of proper logging:**
- 15 router files use `console.error()` instead of logger
- 8 service files use `console.error()` instead of logger

**Silent failures returning empty arrays:**
- `priceAlertsService.ts` - Lines 193-197, 303-309
- `strainMatchingService.ts` - Lines 64, 121, 277, 287
- `audit.ts` - Lines 647, 685-687
- `analytics.ts` - Lines 218, 262
- `productCategories.ts` - Line 594

---

## Final Summary

| Category | Initial | QA Pass 1 | QA Pass 2 | Total |
|----------|---------|-----------|-----------|-------|
| P0 Blockers | 4 | 0 | 1 (GL silent failures) | 5 |
| Missing Features | 15 | 10 | 8 | 33 |
| Hidden Routes | 8 | 13 | 0 | 21 |
| Stub/Placeholder Code | 2 | 8 | 6 | 16 |
| Disabled UI Actions | 0 | 4 | 5 | 9 |
| Schema Mismatches | 0 | 0 | 5 | 5 |
| Abandoned Features | 0 | 0 | 3 | 3 |
| Known Bugs (unfixed) | 0 | 0 | 3 | 3 |
| Deprecated Code | 0 | 0 | 9 | 9 |
| Poor Error Handling | 0 | 0 | 23+ files | 23+ |
| Skipped Tests | 0 | 0 | 20+ | 20+ |

---

*This report was generated by analyzing 484 commits from December 20, 2025 to January 20, 2026.*
*QA pass 1 completed 2026-01-20 to verify completeness.*
*Deep QA pass 2 completed 2026-01-20 for thorough analysis.*
