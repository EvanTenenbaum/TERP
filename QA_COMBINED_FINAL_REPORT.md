# TERP Combined QA Audit Report - FINAL

**Date:** 2026-01-14
**Sources:**
- Claude Code Deep Audit (this session)
- PR #217 Deep QA Codebase Report (Session-20260114-QA-TERP-664c9b)

**Status:** Combined, deduplicated, and verified

---

## Executive Summary

This report consolidates findings from two independent deep QA audits of the TERP codebase. After removing duplicates and false positives, we have:

| Category | Count | Status |
|----------|-------|--------|
| **Security Issues** | 5 | NEW - Must fix |
| **Data Integrity Issues** | 8 | Critical |
| **Placeholder/Stub Features** | 32 | In progress |
| **Frontend Issues** | 35 | Various severity |
| **Schema/Database Issues** | 15 | Migration needed |
| **Known Open Bugs** | 20+ | From roadmap |

---

# PART 1: CRITICAL SECURITY ISSUES

*Source: Claude Code audit - NEW findings not in PR #217*

## SEC-001: Hardcoded Admin Setup Secret Key
**File:** `server/routers/adminSetup.ts:76`
```typescript
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || "terp-admin-setup-2024";
```
**Impact:** Anyone knowing the default key can promote users to admin
**Priority:** P0 - IMMEDIATE

## SEC-002: 12 Public Endpoints Exposing Sensitive Data
**File:** `server/routers/matchingEnhanced.ts`
**Endpoints:** `findMatchesForNeed`, `findMatchesForBatch`, `analyzeClientPurchaseHistory`, `identifyLapsedBuyers`, `getAllActiveNeedsWithMatches`, `getPredictiveReorderOpportunities`, `findBuyersForInventory`, `findHistoricalBuyers`, `findProductsByStrain`, `groupProductsBySubcategory`, `findSimilarStrains`, `findMatchesForVendorSupply`
**Impact:** All use `publicProcedure` - leaks client data without auth
**Priority:** P0 - IMMEDIATE

## SEC-003: 5 Public Mutations in Calendar
**File:** `server/routers/calendarRecurrence.ts`
**Mutations:** `modifyInstance`, `cancelInstance`, `regenerateInstances`, `updateRecurrenceRule`, `deleteRecurrenceRule`
**Impact:** Unauthenticated calendar modifications
**Priority:** P0 - IMMEDIATE

## SEC-004: Token in URL Query Parameter
**File:** `src/hooks/useLiveSessionClient.ts:40`
```typescript
const url = `...?token=${encodeURIComponent(sessionToken)}`;
```
**Impact:** Token exposed in logs, browser history
**Priority:** P1

## SEC-005: Hardcoded Production URLs
**Files:**
- `server/routers/vipPortal.ts:533` - DigitalOcean URL
- `server/routers/receipts.ts:562` - Production domain
**Impact:** Infrastructure disclosure, wrong URLs if env missing
**Priority:** P2

---

# PART 2: DATA INTEGRITY ISSUES

## DI-001: Transaction Helper is Placeholder ⚠️ CRITICAL
*Source: PR #217*
**File:** `server/dbTransaction.ts:12-36`
```typescript
// withTransaction does NOT actually wrap a database transaction!
```
**Impact:** No atomicity for critical writes, data corruption risk
**Priority:** P0 - IMMEDIATE

## DI-002: Credit Application Race Condition
*Source: Claude Code audit*
**File:** `server/creditsDb.ts:206-313`
**Issue:** Code itself acknowledges: "⚠️ RACE CONDITION RISK"
**Impact:** Credits can be double-applied
**Priority:** P0

## DI-003: Cascading Delete Without Transaction
*Source: Claude Code audit*
**File:** `server/routers/intakeReceipts.ts:1079-1087`
**Impact:** Items orphaned if second delete fails
**Priority:** P1

## DI-004: Soft-Delete Schema Gap for Clients
*Source: Both audits*
**Files:**
- `server/inventoryDb.ts:442-456` - Supplier deletion flips `isSeller=false`
- `server/routers/clients.ts:173-183` - Archive is alias for delete
**Impact:** No real soft delete, audit trail lost
**Priority:** P1

## DI-005: Startup Seeding Disabled
*Source: PR #217*
**File:** `server/_core/index.ts:161-183`
**Issue:** Disabled due to schema drift
**Impact:** No initial data on first run
**Priority:** P1

## DI-006: Missing Foreign Key Constraints
*Source: Claude Code audit*
**Tables:** clientInterestLists, clientWantMatches, salesSheetHistory
**Columns:** reviewedBy, convertedToOrderId, convertedBy
**Impact:** Orphaned records possible
**Priority:** P2

## DI-007: VARCHAR for Numeric Columns (44+ columns)
*Source: Claude Code audit*
**Tables:** batches, inventoryMovements, salePrices, cogsHistory, payments, etc.
**Impact:** Type casting issues, precision loss
**Priority:** P2

## DI-008: SSE Event Listener Memory Leaks
*Source: Claude Code audit*
**Files:** `WarehousePickList.tsx`, `LiveShoppingSession.tsx`, `useLiveSessionSSE.ts`, `useLiveSessionClient.ts`
**Impact:** Memory exhaustion, infinite loops
**Priority:** P2

---

# PART 3: PLACEHOLDER / STUB FEATURES

## Frontend Placeholders

| ID | File | Description | Source |
|----|------|-------------|--------|
| FE-001 | `widgets-v3/index.ts:1-6` | v3 widgets intentionally empty | PR #217 |
| FE-002 | `TemplateSelector.tsx:20-79` | Template uses `id: "TODO"` | PR #217 |
| FE-003 | `LiveShoppingPage.tsx:380-418` | "Console view coming soon" alert | Both |
| FE-004 | `BatchDetailDrawer.tsx:452-485` | Product relationship UI commented out | PR #217 |
| FE-005 | `BatchDetailDrawer.tsx:880-892` | `currentAvgPrice` hardcoded to 0 | Both |
| FE-006 | `data-cards/analytics.ts:16-56` | Analytics stored in sessionStorage only | PR #217 |
| FE-007 | 27 files | `key={index}` anti-pattern | Claude |

## Backend Placeholders

| ID | File | Description | Source |
|----|------|-------------|--------|
| BE-001 | `matchingEngineReverseSimplified.ts:142-148` | Vendor supply matching returns empty | PR #217 |
| BE-002 | `vipPortalAdminService.ts:440-493` | VIP tier config hardcoded, update no-op | Both |
| BE-003 | `liveCatalogService.ts:355-375` | Brand list empty, price hardcoded | Both |
| BE-004 | `quotes.ts:283-304` | Quote send lacks email notification | Both |
| BE-005 | `scheduling.ts:1140-1154` | Referral stats missing date filters | PR #217 |
| BE-006 | `receipts.ts:490-543` | Email/SMS integrations placeholder | Both |
| BE-007 | `receipts.ts:41-71` | Receipt creation helper deprecated | PR #217 |
| BE-008 | `matchingEngineEnhanced.ts:639-651` | strainType hardcoded null | PR #217 |
| BE-009 | `dataCardMetricsDb.ts:252-396` | Metrics return zeros (missing columns) | Both |
| BE-010 | `priceAlertsCron.ts:39-47` | Cron stop is placeholder | PR #217 |
| BE-011 | `supplierMetrics.ts:166-225` | Quality score/return rate return null | Both |
| BE-012 | `cogsChangeIntegrationService.ts:103-118` | COGS stats are placeholder zeros | PR #217 |
| BE-013 | `audit.ts:530-561` | Account balance breakdown placeholder | PR #217 |
| BE-014 | `leaderboard.ts:324-360` | Export needs real file generation | PR #217 |
| BE-015 | `db.ts:33-56` | DB fallback throws on any access | PR #217 |
| BE-016 | `seedLiveCatalogTestData.ts:205-216` | Uses placeholder batch IDs 1-11 | PR #217 |
| BE-017 | `accounting.test.ts:246-373` | 4 sub-routers not implemented | Claude |

---

# PART 4: FRONTEND/BACKEND MISALIGNMENTS

## API Contract Drift (Claude Code audit)

| Issue | Frontend | Backend |
|-------|----------|---------|
| Pagination params | Mixed usage | page/pageSize vs limit/offset |
| VIP Token | `{ sessionToken }` input | `x-vip-session-token` header |
| Success response | Expects object | Some return `{ success: boolean }` |
| Auth endpoints | REST fetch() | Should use tRPC |

## Missing Relations (PR #217)

| Issue | File | Description |
|-------|------|-------------|
| Product relation missing | `BatchDetailDrawer.tsx:452-485` | API lacks product relation data |
| Strain type missing | `matchingEngineEnhanced.ts:639-651` | strainType not included |

---

# PART 5: KNOWN OPEN BUGS FROM ROADMAP

*Source: PR #217 - `docs/roadmaps/MASTER_ROADMAP.md`*

## P0/P1 Critical Bugs (Lines 213-233)
- Inventory loading issues
- Form resets
- Auth errors
- Search/filter failures
- Notification system issues

## E2E-Discovered API Failures (Lines 234-248)
- Orders
- Quotes
- Invoices
- Calendar
- COGS
- Pricing defaults
- Notifications

## API Registration Gaps (Lines 283-299)
- Can cause `NOT_FOUND` errors
- Missing routes in tRPC

---

# PART 6: UI/UX ISSUES

## Destructive Actions Without Confirmation (Claude Code - 14 instances)

| File | Line | Action |
|------|------|--------|
| Settings.tsx | 505 | Delete location |
| Settings.tsx | 639 | Delete category |
| Settings.tsx | 687-689 | Delete subcategory (BROKEN - no handler!) |
| Settings.tsx | 803 | Delete grade |
| RoomManagementModal.tsx | 308 | Remove feature |
| AddClientWizard.tsx | 464 | Remove tag |
| UserSelector.tsx | 121 | Remove user |
| EditBatchModal.tsx | 288 | Remove media |
| PricingRulesPage.tsx | 296 | Remove condition |
| ReturnsPage.tsx | 352 | Remove return item |
| OrganizationSettings.tsx | 587 | Delete unit type |
| OrganizationSettings.tsx | 885 | Delete finance status |
| CalendarAppointmentTypes.tsx | 201 | Delete appointment type |
| CalendarAvailabilitySettings.tsx | 265 | Delete blocked time |

## Other UI Issues

| Issue | File | Source |
|-------|------|--------|
| window.alert() usage | `EventFormDialog.tsx:195` | Claude |
| Margin >=100% inconsistency | Frontend vs Backend | Claude |
| Audit trail truncated at 10 | `BatchDetailDrawer.tsx:675-703` | Claude |

---

# PART 7: BUILD/TEST STATUS

*Source: PR #217*

## Missing Scripts
- `pnpm typecheck` - Not defined
- `pnpm lint` - Not defined
- Only `pnpm check` exists

## Test Failures
Multiple test files failing (interrupted after ~52s):
- Accounting tests
- Pricing tests
- Security/auth tests
- Permissions tests
- Inventory tests

---

# PART 8: FALSE POSITIVES (Removed)

These were incorrectly flagged in the Claude audit:

| Original Claim | Why False |
|----------------|-----------|
| BUG-001: refetch undefined | refetch IS defined at line 260 |
| BUG-003: Division by zero | Already guarded with length check |
| BUG-004: Date math wrong | JS Date handles negative months |
| BUG-005: VIP metrics NaN | `\|\| "0"` fallback prevents it |
| BUG-017: Redundant check | Intentional defensive code |
| AuditModal key={index} | Files don't contain pattern |

---

# PART 9: CONSOLIDATED PRIORITY FIX PLAN

## P0 - IMMEDIATE (This Week)

### Security
- [ ] Remove hardcoded admin setup key fallback
- [ ] Change 12 `matchingEnhanced` endpoints to `protectedProcedure`
- [ ] Change 5 `calendarRecurrence` mutations to `protectedProcedure`

### Data Integrity
- [ ] Implement real `withTransaction` wrapper
- [ ] Add transaction to credit application
- [ ] Add transaction to cascading deletes

## P1 - HIGH (Next Week)

### Database
- [ ] Add soft-delete support for clients
- [ ] Fix schema drift for seeding
- [ ] Add foreign key constraints

### Features
- [ ] Fix delete subcategory button (no onClick handler)
- [ ] Align frontend/backend margin handling
- [ ] Replace window.alert with toast

## P2 - MEDIUM (This Sprint)

### Frontend
- [ ] Replace `key={index}` in 27 files
- [ ] Add confirmation dialogs for 14 delete actions
- [ ] Fix SSE event listener cleanup

### Backend
- [ ] Complete email/SMS integration OR remove UI
- [ ] Implement VIP tier config storage
- [ ] Fix vendor supply matching
- [ ] Complete dashboard metrics schema

## P3 - TECHNICAL DEBT (Ongoing)

### Code Quality
- [ ] Remove 150+ console.log statements
- [ ] Add typecheck/lint scripts
- [ ] Fix failing tests
- [ ] Migrate VARCHAR to DECIMAL (44+ columns)

---

# APPENDIX A: Issue Deduplication

Issues found in BOTH audits (counted once):

| Issue | PR #217 | Claude | Combined |
|-------|---------|--------|----------|
| VIP tier config hardcoded | ✓ | ✓ | 1 issue |
| Email/SMS placeholder | ✓ | ✓ | 1 issue |
| Soft-delete gaps | ✓ | ✓ | 1 issue |
| Supplier metrics null | ✓ | ✓ | 1 issue |
| Dashboard metrics disabled | ✓ | ✓ | 1 issue |
| Live Shopping "coming soon" | ✓ | ✓ | 1 issue |
| Quote notification TODO | ✓ | ✓ | 1 issue |
| Live catalog filters | ✓ | ✓ | 1 issue |
| currentAvgPrice = 0 | ✓ | ✓ | 1 issue |

## Unique to PR #217
- v3 widgets empty
- Template selector TODO
- withTransaction placeholder (CRITICAL)
- Receipt creation deprecated
- strainType hardcoded
- Cron stop placeholder
- COGS stats placeholder
- Audit balance placeholder
- Leaderboard export placeholder
- DB fallback proxy
- Seed placeholder IDs
- Build script issues

## Unique to Claude Audit
- Security issues (admin key, public endpoints, public mutations)
- Token in URL
- Hardcoded production URLs
- Race conditions (credit application)
- Cascading delete transaction
- Foreign key constraints
- VARCHAR numeric columns
- SSE memory leaks
- React key={index} pattern (27 files)
- API contract drift
- 14 destructive actions without confirmation
- window.alert usage
- Margin handling inconsistency

---

# APPENDIX B: Files Most Affected

| File | Issue Count | Categories |
|------|-------------|------------|
| `server/routers/matchingEnhanced.ts` | 12+ | Security (all public) |
| `server/routers/vipPortal.ts` | 10+ | Placeholders, hardcoded URLs |
| `server/services/orderPricingService.ts` | 8+ | Math, transactions |
| `client/src/components/inventory/BatchDetailDrawer.tsx` | 6+ | Placeholders, keys |
| `server/creditsDb.ts` | 5+ | Race conditions, precision |
| `client/src/pages/Settings.tsx` | 5+ | No confirmation, broken button |
| `server/dbTransaction.ts` | 1 | CRITICAL - placeholder transaction |

---

*Combined QA Report - 2026-01-14*
*Sources: Claude Code Audit + PR #217 Deep QA Report*
