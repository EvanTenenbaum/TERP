# TERP Destructive QA Test Report

**Date**: 2026-01-25
**Conducted By**: Claude (Opus 4.5) - Parallel Agents
**Total Bugs Found**: 92

## Executive Summary

This report documents findings from a comprehensive destructive testing audit across all TERP modules. Eight parallel agents systematically attempted to break every system, trace every user flow, and find every edge case failure.

### Severity Distribution

| Severity | Count | Domains                                                      |
| -------- | ----- | ------------------------------------------------------------ |
| CRITICAL | 19    | Orders, Inventory, Financial, Party, Permissions, User Flows |
| HIGH     | 22    | All domains                                                  |
| MEDIUM   | 38    | All domains                                                  |
| LOW      | 13    | Navigation, API, User Flows                                  |

### Domain Summary

| Domain                    | Bugs | Critical | High | Medium | Low |
| ------------------------- | ---- | -------- | ---- | ------ | --- |
| Order Business Logic      | 20   | 4        | 6    | 10     | 0   |
| Inventory System          | 10   | 4        | 2    | 3      | 1   |
| Financial/Accounting      | 10   | 2        | 4    | 4      | 0   |
| Client/Vendor Party Model | 12   | 5        | 4    | 3      | 0   |
| User Flows E2E            | 14   | 4        | 4    | 6      | 0   |
| Permissions/RBAC          | 9    | 2        | 2    | 5      | 0   |
| Frontend Navigation       | 10   | 0        | 2    | 5      | 3   |
| API Contracts             | 7    | 0        | 1    | 3      | 3   |

---

## CRITICAL BUGS (Must Fix Before Production)

### CRIT-001: Invoice Created Before Fulfillment

- **Domain**: User Flows / Financial
- **Location**: `server/ordersDb.ts:362-373`
- **Description**: Invoices are created immediately when SALE orders are created, BEFORE fulfillment. Revenue and AR are recognized before goods ship.
- **Impact**: Financial statements show revenue for unshipped goods. Violates revenue recognition principles.

### CRIT-002: No Inventory Deduction on Ship/Fulfill

- **Domain**: Inventory
- **Location**: `server/routers/orders.ts:1355-1428`
- **Description**: `shipOrder()` and `deliverOrder()` update order status but NEVER deduct inventory. Fulfillment doesn't reduce `onHandQty`.
- **Impact**: Phantom inventory. System reports units as available after they've shipped.

### CRIT-003: Race Condition in Draft Order Confirmation

- **Domain**: Inventory
- **Location**: `server/ordersDb.ts:1137-1161`
- **Description**: `confirmDraftOrder()` checks inventory WITHOUT row-level locks. Concurrent confirmations can both succeed when combined they exceed available inventory.
- **Impact**: Overselling. Double-allocation of same inventory.

### CRIT-004: Return/Refund Flow Creates No Credit Memo

- **Domain**: User Flows / Financial
- **Location**: `server/routers/returns.ts:231-328`
- **Description**: Returns restock inventory but don't create credit memos, reverse invoices, update client.totalOwed, or create reversing GL entries.
- **Impact**: Customers who return goods still show as owing money. AR overstated.

### CRIT-005: Invoice Void Creates No GL Reversals

- **Domain**: Financial
- **Location**: `server/routers/invoices.ts:449-497`
- **Description**: Voiding an invoice only sets status to VOID. No reversing GL entries created. Client balance not updated.
- **Impact**: GL doesn't balance. Phantom AR in aged trial balance.

### CRIT-006: Race Condition in Invoice Number Generation

- **Domain**: Financial
- **Location**: `server/arApDb.ts:315-327, 606-618, 728-740`
- **Description**: All number generation uses non-atomic `MAX(id) + 1`. Concurrent requests get duplicate numbers.
- **Impact**: Duplicate invoice/bill/payment numbers. Audit trail gaps.

### CRIT-007: Can Post GL Entries to Closed Fiscal Periods

- **Domain**: Financial
- **Location**: `server/accountingDb.ts:278-338`
- **Description**: `postJournalEntry()` doesn't validate fiscal period is OPEN before posting.
- **Impact**: Financial statements for prior periods can be altered. Audit integrity destroyed.

### CRIT-008: Admin Setup Endpoints Are Public

- **Domain**: Permissions
- **Location**: `server/routers/adminSetup.ts:104-259`
- **Description**: `listUsers`, `promoteToAdmin`, `promoteAllToAdmin` use `publicProcedure` with only weak setupKey protection.
- **Impact**: Complete privilege escalation if setup key leaked.

### CRIT-009: Debug Endpoints Expose Database Schema

- **Domain**: Permissions
- **Location**: `server/routers/debug.ts:18-522`
- **Description**: Six debug endpoints are completely public. Reveal all table names, schema, and data counts.
- **Impact**: Complete information disclosure for attack planning.

### CRIT-010: Order Total Can Go Negative

- **Domain**: Order Logic
- **Location**: `server/services/orderPricingService.ts:508-518`
- **Description**: Order-level discounts can exceed subtotal creating negative invoice totals.
- **Impact**: Negative invoices cause accounting imbalance.

### CRIT-011: Purchase Orders Never Create Inventory

- **Domain**: User Flows
- **Location**: `server/routers/purchaseOrders.ts`
- **Description**: POs can be marked RECEIVED but no batches are created. No GL entries for inventory/AP.
- **Impact**: Goods receipt doesn't update inventory. Beginning inventory never reconciles.

### CRIT-012: Hard Deletes in Vendors Router

- **Domain**: Party Model
- **Location**: `server/routers/vendors.ts:350`
- **Description**: Vendor deletion is hard delete, not soft delete.
- **Impact**: Lost audit trail. Orphaned references in POs, lots, bills.

### CRIT-013: vendorId NOT NULL on Purchase Orders

- **Domain**: Party Model
- **Location**: `drizzle/schema.ts:237-239`
- **Description**: Purchase orders require vendorId (deprecated table) as NOT NULL.
- **Impact**: Cannot migrate to party model. Hard dependency on deprecated table.

### CRIT-014: Bills Table Has No FK Constraint

- **Domain**: Party Model
- **Location**: `drizzle/schema.ts:1140`
- **Description**: Bills table has vendorId as NOT NULL but no foreign key reference.
- **Impact**: Bills can reference non-existent vendors. No cascade behavior.

### CRIT-015: Lots Table Requires vendorId

- **Domain**: Party Model
- **Location**: `drizzle/schema.ts:540`
- **Description**: Lots require vendorId (deprecated) as NOT NULL.
- **Impact**: Cannot track lots through canonical clients table.

### CRIT-016: Negative Prices Allowed in Orders

- **Domain**: Order Logic
- **Location**: `server/ordersDb.ts:199`, `server/services/orderService.ts:57`
- **Description**: Orders accept zero or negative prices without validation.
- **Impact**: $0 invoices hide actual revenue.

### CRIT-017: Invalid State Transitions (PACKED → PENDING)

- **Domain**: Order Logic
- **Location**: `server/services/orderStateMachine.ts:26`
- **Description**: Order state machine allows PACKED to transition back to PENDING.
- **Impact**: Can "unpack" orders and claim double fulfillment.

### CRIT-018: Inventory Reduced Before Payables (Non-Atomic)

- **Domain**: Order Logic
- **Location**: `server/ordersDb.ts:335-358`
- **Description**: Inventory is reduced, THEN payables updated. If payables fails, inventory is wrong.
- **Impact**: Ledger mismatch. Inventory reduced but COGS not recorded.

### CRIT-019: Client.totalOwed Never Updated

- **Domain**: User Flows
- **Location**: `server/services/orderAccountingService.ts:306-339`
- **Description**: `updateClientCreditExposure` only LOGS exposure, doesn't UPDATE clients.totalOwed.
- **Impact**: Client accounts show $0 outstanding even with unpaid invoices.

---

## HIGH PRIORITY BUGS

### HIGH-001: Missing `/alerts` Route

- **Location**: `client/src/components/alerts/AlertsPanel.tsx:185`
- **Description**: AlertsPanel navigates to `/alerts` which doesn't exist.

### HIGH-002: Missing `/reports/shrinkage` Route

- **Location**: `client/src/components/inventory/ShrinkageReport.tsx:182`
- **Description**: ShrinkageReport navigates to undefined route.

### HIGH-003: Missing Reservation Release on Order Cancellation

- **Location**: `server/routers/orders.ts`
- **Description**: No order cancellation procedure releases reservedQty.

### HIGH-004: Discount Limit Bypass via Fixed-Amount

- **Location**: `server/services/orderPricingService.ts:586-681`
- **Description**: Fixed-amount discounts bypass percentage authority checks.

### HIGH-005: Quote Conversion After Expiration

- **Location**: `server/ordersDb.ts:796-948`
- **Description**: Quote expiration checked at transaction START. Can expire during execution.

### HIGH-006: Overpayment Not Prevented in arApDb

- **Location**: `server/arApDb.ts:192-224`
- **Description**: Payment amount validation is in router, not service layer.

### HIGH-007: Payment on VOID Invoices Not Prevented

- **Location**: `server/arApDb.ts:192-224`
- **Description**: No status check before accepting payment.

### HIGH-008: GL Entry Number Collision Risk

- **Location**: `server/accountingDb.ts:343-354`
- **Description**: Entry numbers can collide on invoice void/recreate.

### HIGH-009: Credit Override Doesn't Update Order Amount

- **Location**: `server/services/orderPricingService.ts:740-790`
- **Description**: Credit override approval sets flag but doesn't authorize order.

### HIGH-010: Default Read Permissions to All Users

- **Location**: `server/services/permissionService.ts:188-241`
- **Description**: Users without roles get automatic read permissions.

### HIGH-011: Demo Users Can Perform Mutations

- **Location**: `server/_core/trpc.ts:163-205`
- **Description**: Demo users with Super Admin role can perform any mutation.

### HIGH-012: Payment History Missing FK

- **Location**: `drizzle/schema.ts:635`
- **Description**: paymentHistory.vendorId has no FK reference.

### HIGH-013: Vendor Harvest Reminders on Deprecated Table

- **Location**: `drizzle/schema.ts:6595`
- **Description**: vendorHarvestReminders references deprecated vendors table.

### HIGH-014: Dual vendorId/supplierClientId Fields

- **Location**: `server/routers/purchaseOrders.ts:35-36`
- **Description**: POs create both fields, creating data inconsistency.

### HIGH-015: Widespread Type Assertions (as any)

- **Location**: Multiple frontend files
- **Description**: Systematic use of `as any` defeats TypeScript safety.

### HIGH-016: Allocation System Never Called

- **Location**: `server/routers/orders.ts:1636-1849`
- **Description**: Sophisticated batch allocation is never called from fulfillOrder.

### HIGH-017: Missing Invariant Validation in Qty Adjustments

- **Location**: `server/routers/inventory.ts:1040-1124`
- **Description**: Adjustments don't validate reserved + quarantine <= onHand.

### HIGH-018: Concurrent Draft Updates Not Protected

- **Location**: `server/ordersDb.ts:1252-1433`
- **Description**: Draft updates lack version checking unlike general updateOrder.

### HIGH-019: No Batch Creation on PO Goods Receipt

- **Location**: `server/routers/purchaseOrders.ts`
- **Description**: Receiving goods doesn't create inventory batches.

### HIGH-020: GL Entry Posted Flag Not Enforced

- **Location**: `server/accountingDb.ts:120`
- **Description**: No guarantee unposted entries excluded from statements.

### HIGH-021: No GL Account Existence Validation

- **Location**: `server/accountingDb.ts:278-338`
- **Description**: Can post to deleted/deactivated accounts.

### HIGH-022: Missing No Batch Quantity Reduction During Pick

- **Location**: `server/routers/orders.ts:1232-1349`
- **Description**: fulfillOrder records picks but never deducts from batches.

---

## MEDIUM PRIORITY BUGS

(38 bugs documented - see individual agent reports for full details)

Key categories:

- Query parameter handling (tabs ignored in /accounting, /settings, /clients/:id)
- Rounding tolerance issues ($0.01 overpayments allowed)
- Pagination response inconsistencies
- Duplicate line items not rejected
- JSON parse failures silently return empty arrays
- Tax always zero, never calculated
- Sample quantity not tracked against total
- Over-receiving not prevented on POs
- Missing permission checks on resource-level operations
- Test token endpoint bypasses rate limiting
- Multiple status fields on orders create confusion

---

## LOW PRIORITY BUGS

(13 bugs documented - see individual agent reports for full details)

Key categories:

- window.location.href instead of setLocation
- Missing error handling for invalid client IDs
- Duplicate navigation methods
- Error code extraction complexity
- Missing product relation in batch API

---

## Recommended Remediation Priority

### Week 1 - Critical Financial/Inventory

1. Fix invoice creation timing (CRIT-001)
2. Add inventory deduction on ship (CRIT-002)
3. Fix race conditions (CRIT-003, CRIT-006)
4. Add GL reversals for voids/returns (CRIT-004, CRIT-005)

### Week 2 - Security

1. Protect admin setup endpoints (CRIT-008)
2. Remove/protect debug endpoints (CRIT-009)
3. Fix default permission grants (HIGH-010)
4. Fix demo user mutation access (HIGH-011)

### Week 3 - Party Model Migration

1. Add nullable supplierClientId to POs (CRIT-013)
2. Add FK constraints to bills (CRIT-014)
3. Migrate lots to use supplierClientId (CRIT-015)
4. Convert hard deletes to soft deletes (CRIT-012)

### Week 4 - Order Logic

1. Validate prices > 0 (CRIT-016)
2. Fix state machine transitions (CRIT-017)
3. Make inventory/payables atomic (CRIT-018)
4. Update client.totalOwed (CRIT-019)

---

## Agent IDs for Follow-up

If additional investigation is needed, these agents can be resumed:

- Navigation: a0c9130
- Order Logic: a457c9c
- Inventory: a35994e
- Financial: a893eb6
- Party Model: a599381
- API Contracts: ae43704
- User Flows: a53887e
- Permissions: a9ed447
