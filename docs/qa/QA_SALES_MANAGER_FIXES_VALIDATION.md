# QA Sales Manager Fixes - Full Validation Report

**Date:** 2026-01-10
**Branch:** claude/terp-qa-roadmap-fixes-Xd8dY
**Status:** Code Complete - Ready for Production Validation

---

## Summary

| Root Cause | Bugs Fixed | Status |
|------------|------------|--------|
| RC-001: Missing Pricing Defaults | BUG-086 (P0), BUG-084 | Code Complete |
| RC-002: API Query/Pagination | BUG-087 (P1), BUG-088 (P1) | Code Complete |
| RC-003: Frontend Event Handlers | BUG-089 (P1), BUG-090 (P2) | Code Complete |
| RC-004: Grid Data Rendering | BUG-091 (P2), BUG-092 (P2) | Code Complete |
| RC-005: RBAC Permission Gaps | BLOCKED-001, BLOCKED-002*, BLOCKED-003 | Code Complete |

*BLOCKED-002 documented as by-design (warehouse-only access)

---

## Commits

1. `d41f843` - fix(pricing): Fix RC-001 - Missing pricing defaults
2. `67acf81` - fix(api): Fix RC-002 - API query/pagination issues
3. `ba585e2` - fix(ui): Fix RC-003 - Frontend event handler wiring
4. `5b911a1` - fix(dashboard): Fix RC-004 - Grid data rendering
5. `067d609` - fix(rbac): Fix RC-005 - RBAC permission gaps

---

## Full Validation Checklist

### RC-001: Pricing Defaults (P0)

**Pre-requisite:** Run `pnpm seed:pricing` to seed pricing defaults

- [ ] **BUG-086**: Sales orders can be finalized without "missing pricing defaults" error
- [ ] Pricing defaults table has 12 categories including "OTHER" and "DEFAULT"
- [ ] Fallback chain works: Customer → Category → OTHER → DEFAULT → 30% fallback

**Test Steps:**
1. Login as Sales Manager
2. Navigate to Sales → Orders → New Order
3. Select a customer
4. Add an inventory item
5. Click "Preview & Finalize" → "Finalize"
6. Verify: Order finalizes successfully

---

### RC-002: API Query/Pagination (P1)

- [ ] **BUG-087**: Products page loads without "limit too large" error
- [ ] **BUG-088**: Spreadsheet Clients detail loads without raw SQL error

**Test Steps:**
1. Navigate to Inventory → Products
   - Verify: Page loads with products list
2. Navigate to Inventory → Spreadsheet View → Clients
   - Select a client from the list
   - Verify: Client detail panel loads (no raw SQL errors visible)

---

### RC-003: Frontend Event Handlers (P1/P2)

- [ ] **BUG-089**: "New Invoice" button opens dialog
- [ ] **BUG-090**: Client edits persist correctly

**Test Steps:**
1. Navigate to Sales → Invoices
   - Click "New Invoice" button
   - Verify: Dialog opens with options (From Sales Order, From Client Profile)
2. Navigate to Sales → Clients → select a client
   - Click Edit, change phone number
   - Save and verify: Phone number persists after page refresh

---

### RC-004: Grid/Dashboard (P2)

- [ ] **BUG-091**: Spreadsheet Inventory grid displays data (if inventory exists)
- [ ] **BUG-092**: AR/AP widgets show data or proper error/empty state

**Test Steps:**
1. Navigate to Inventory → Spreadsheet View → Inventory tab
   - Verify: Grid shows inventory rows OR "No inventory data" message
   - Verify: No stuck "Loading..." state
2. Navigate to Finance → AR/AP dashboard
   - Verify: AR Aging widget shows data OR "No AR data available"
   - Verify: AP Aging widget shows data OR "No AP data available"
   - Verify: No indefinite "Loading..." state

---

### RC-005: RBAC Permissions (P2)

- [ ] **BLOCKED-001**: Sales Manager can view Samples
- [ ] **BLOCKED-002**: Pick & Pack shows permission error (by design - admin only)
- [ ] **BLOCKED-003**: Sales Manager can view Finance Reports

**Test Steps:**
1. Login as Sales Manager (not Admin)
2. Navigate to Inventory → Samples
   - Verify: Samples list loads (or empty state, not permission error)
3. Navigate to Finance → Reports
   - Verify: Reports page loads (or empty state, not permission error)
4. Navigate to Inventory → Spreadsheet View → Pick & Pack
   - Verify: Shows permission error (expected - warehouse-only feature)

---

## Files Modified

### Backend
- `server/services/pricingService.ts` - 4-level fallback chain
- `server/routers/orders.ts` - Use batch category, 30% fallback
- `server/routers/productCatalogue.ts` - Increased limit to 500
- `server/ordersDb.ts` - Added pagination to getOrdersByClient
- `server/services/rbacDefinitions.ts` - Added Sales Manager permissions
- `scripts/seed-pricing.ts` - Fixed column names, added categories
- `scripts/generators/pricing.ts` - Fixed field names

### Frontend
- `client/src/pages/accounting/Invoices.tsx` - New Invoice dialog
- `client/src/pages/ClientProfilePage.tsx` - Cache invalidation on update
- `client/src/pages/accounting/AccountingDashboard.tsx` - Error handling
- `client/src/components/spreadsheet/ClientGrid.tsx` - User-friendly error

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Database seeding not run | Document requirement to run `pnpm seed:pricing` |
| Permission sync | Run `pnpm seed:rbac` to sync new permissions |
| Cache staleness | Users may need to clear browser cache |

---

## Deployment Steps

1. Merge PR to main branch
2. Deploy to staging environment
3. Run database migrations (if any)
4. Run `pnpm seed:pricing` to ensure pricing defaults exist
5. Run `pnpm seed:rbac` to sync RBAC permissions
6. Execute validation checklist above
7. Deploy to production

---

## Success Metrics

After deployment, the following QA metrics should improve:

| Metric | Before | Expected After |
|--------|--------|----------------|
| Total Flows PASS | 5/12 | 11/12 |
| Total Flows FAIL | 6/12 | 0/12 |
| Total Flows BLOCKED | 3/12 | 1/12* |

*BLOCKED-002 (Pick & Pack) remains blocked by design for non-warehouse roles
