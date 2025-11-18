# ST-013 & RF-001 Analysis Report

**Session:** Session-20251117-data-integrity-b9bcdea1  
**Agent:** Agent-05  
**Date:** 2025-11-17  
**Status:** Analysis Complete

---

## Executive Summary

This document provides a comprehensive analysis of the current codebase state for implementing:
1. **ST-013**: Standardize soft deletes across all tables
2. **RF-001**: Consolidate orders router

Both tasks are P2 (Medium) priority with low conflict risk.

---

## Part 1: ST-013 Soft Delete Analysis

### Current State

**Total Tables:** 110 tables in `drizzle/schema.ts`

**Tables with Soft Delete:** 1 table
- `calendarEvents` - has `deletedAt: timestamp("deleted_at")`

**Tables without Soft Delete:** 109 tables

### Critical Tables Requiring Soft Delete (Priority Order)

#### Tier 1: Financial Data (Highest Priority)
1. `invoices` - Financial records, audit trail required
2. `invoiceLineItems` - Invoice details
3. `payments` - Payment records
4. `ledgerEntries` - General ledger entries
5. `bills` - Vendor bills
6. `billLineItems` - Bill details
7. `transactions` - Financial transactions
8. `paymentHistory` - Payment audit trail

#### Tier 2: Core Business Data
9. `orders` - Sales orders
10. `orderLineItems` - Order details
11. `clients` - Customer records
12. `vendors` - Vendor records
13. `batches` - Inventory batches
14. `products` - Product catalog

#### Tier 3: Supporting Data
15. `clientNeeds` - Client requirements
16. `purchaseOrders` - PO records
17. `purchaseOrderItems` - PO details
18. `returns` - Return records
19. `credits` - Credit records

#### Tier 4: Reference Data (Lower Priority)
20. All remaining tables (categories, tags, notes, etc.)

### Implementation Strategy

**Phase 1: Schema Updates**
```typescript
// Add to all tables:
deletedAt: timestamp("deleted_at"),
```

**Phase 2: Utility Functions**
Create `server/utils/softDelete.ts`:
```typescript
export async function softDelete<T>(
  table: any,
  id: number
): Promise<void> {
  const db = await getDb();
  await db.update(table)
    .set({ deletedAt: new Date() })
    .where(eq(table.id, id));
}

export async function restore<T>(
  table: any,
  id: number
): Promise<void> {
  const db = await getDb();
  await db.update(table)
    .set({ deletedAt: null })
    .where(eq(table.id, id));
}

export function excludeDeleted<T>(table: any) {
  return isNull(table.deletedAt);
}
```

**Phase 3: Update Delete Operations**
Search for all `delete()` operations and replace with `softDelete()`:
```bash
# Find all delete operations
grep -r "\.delete(" server/ --include="*.ts" | grep -v test | grep -v node_modules
```

**Phase 4: Update Query Filters**
Add `.where(isNull(table.deletedAt))` to all queries:
- All `findFirst()` calls
- All `findMany()` calls
- All `select()` calls

**Phase 5: Admin Restore Endpoint**
Create admin procedures:
- `admin.viewDeleted` - List soft-deleted records
- `admin.restore` - Restore deleted records
- `admin.permanentDelete` - Hard delete (admin only)

### Files to Modify

1. `drizzle/schema.ts` - Add deletedAt to all tables
2. `server/utils/softDelete.ts` - New utility file
3. `server/routers/*.ts` - Update all routers with delete operations
4. `server/*Db.ts` - Update all database functions
5. `server/routers/admin.ts` - Add restore procedures

### Testing Strategy

1. **Unit Tests**: Test soft delete utilities
2. **Integration Tests**: Test each router's delete operations
3. **Migration Tests**: Verify schema changes apply correctly
4. **Restore Tests**: Test admin restore functionality

---

## Part 2: RF-001 Orders Router Consolidation Analysis

### Current State

**Orders-Related Routers:**
1. `server/routers/orders.ts` (7,375 bytes, 17 procedures)
2. `server/routers/ordersEnhancedV2.ts` (20,125 bytes, 8 procedures)
3. `server/routers/orderEnhancements.ts` (8,368 bytes, purpose unclear)
4. `server/routers/purchaseOrders.ts` (10,705 bytes, separate - NOT to consolidate)

**Backup Files:**
- `server/routers/ordersEnhancedV2.ts.backup` (19,072 bytes) - Should be deleted

### Procedure Comparison

#### orders.ts (17 procedures)
1. `create` - Create order
2. `getById` - Get order by ID
3. `getByClient` - Get orders by client
4. `getAll` - Get all orders
5. `update` - Update order
6. `delete` - Delete order
7. `convertToSale` - Convert quote to sale (duplicate)
8. `confirmDraftOrder` - Confirm draft
9. `updateDraftOrder` - Update draft
10. `deleteDraftOrder` - Delete draft
11. `export` - Export order
12. `updateOrderStatus` - Update fulfillment status
13. `getOrderStatusHistory` - Get status history
14. `processReturn` - Process return
15. `getOrderReturns` - Get returns
16. `convertQuoteToSale` - Convert quote (duplicate of #7)

#### ordersEnhancedV2.ts (8 procedures)
1. `createDraft` - Create draft order (enhanced with COGS/margin)
2. `updateDraft` - Update draft order (enhanced)
3. `finalize` - Finalize draft order
4. `getOrderWithLineItems` - Get order with details
5. `getMarginForProduct` - Get margin calculation
6. `calculatePrice` - Calculate price
7. `updateLineItemCOGS` - Update COGS
8. `getAuditLog` - Get audit log

### Duplication Analysis

**Duplicate Functionality:**
- `orders.create` vs `ordersEnhancedV2.createDraft` - Similar but enhanced version has COGS/margin
- `orders.updateDraftOrder` vs `ordersEnhancedV2.updateDraft` - Enhanced version has pricing
- `orders.convertToSale` appears TWICE in orders.ts (lines 79 and 188)

**Unique to orders.ts:**
- Basic CRUD operations
- Status management
- Returns processing
- Export functionality

**Unique to ordersEnhancedV2.ts:**
- COGS visibility
- Margin management
- Pricing calculations
- Audit logging
- Enhanced draft workflow

### Consolidation Strategy

**Option 1: Merge into Single Router (Recommended)**
- Keep all procedures from both routers
- Rename enhanced procedures: `createDraftEnhanced`, `updateDraftEnhanced`
- Maintain backward compatibility
- Deprecate old procedures gradually

**Option 2: Keep Separate but Rename**
- Rename `ordersEnhancedV2.ts` to `ordersAdvanced.ts`
- Clear separation: basic vs advanced features
- Less risk of breaking changes

**Recommendation:** Option 1 - Full consolidation
- Single source of truth
- Easier to maintain
- Clear migration path

### Implementation Plan

**Step 1: Analysis**
- ✅ Identify all procedures
- ✅ Find duplicates
- ✅ Map dependencies

**Step 2: Create Consolidated Router**
```typescript
// server/routers/orders.ts (consolidated)
export const ordersRouter = router({
  // Basic CRUD (from orders.ts)
  create: ...,
  getById: ...,
  getAll: ...,
  update: ...,
  delete: ..., // Will be updated to soft delete in ST-013
  
  // Enhanced Draft Workflow (from ordersEnhancedV2.ts)
  createDraftEnhanced: ...,
  updateDraftEnhanced: ...,
  finalizeDraft: ...,
  
  // Pricing & Margin (from ordersEnhancedV2.ts)
  getMarginForProduct: ...,
  calculatePrice: ...,
  updateLineItemCOGS: ...,
  
  // Status Management
  updateOrderStatus: ...,
  getOrderStatusHistory: ...,
  
  // Returns
  processReturn: ...,
  getOrderReturns: ...,
  
  // Conversion
  convertQuoteToSale: ..., // Remove duplicate
  
  // Export
  export: ...,
  
  // Audit
  getAuditLog: ...,
});
```

**Step 3: Update Imports**
```bash
# Find all imports of ordersEnhancedV2Router
grep -r "ordersEnhancedV2Router" src/ server/ --include="*.ts" --include="*.tsx"
```

**Step 4: Update server/routers.ts**
```typescript
// Before:
import { ordersRouter } from "./routers/orders";
import { ordersEnhancedV2Router } from "./routers/ordersEnhancedV2";

export const appRouter = router({
  orders: ordersRouter,
  ordersEnhancedV2: ordersEnhancedV2Router,
  // ...
});

// After:
import { ordersRouter } from "./routers/orders";

export const appRouter = router({
  orders: ordersRouter,
  // ...
});
```

**Step 5: Cleanup**
- Delete `server/routers/ordersEnhancedV2.ts`
- Delete `server/routers/ordersEnhancedV2.ts.backup`
- Update all frontend imports

### Files to Modify

1. `server/routers/orders.ts` - Merge procedures
2. `server/routers.ts` - Remove ordersEnhancedV2 import
3. Frontend files using `trpc.ordersEnhancedV2.*` - Update to `trpc.orders.*`
4. Delete: `server/routers/ordersEnhancedV2.ts`
5. Delete: `server/routers/ordersEnhancedV2.ts.backup`

### Testing Strategy

1. **Unit Tests**: Update `orders.test.ts` with all procedures
2. **Integration Tests**: Test all order workflows
3. **Frontend Tests**: Verify all order pages work
4. **Backward Compatibility**: Ensure no breaking changes

---

## Risk Assessment

### ST-013 Risks
- **Low Risk**: Schema changes are additive (adding column)
- **Medium Risk**: Updating all queries requires thorough testing
- **Mitigation**: Comprehensive test coverage, gradual rollout

### RF-001 Risks
- **Low Risk**: Consolidation is mostly renaming/moving code
- **Medium Risk**: Frontend imports need updating
- **Mitigation**: Search all imports, update atomically, test thoroughly

---

## Implementation Order

**Recommended Sequence:**
1. **RF-001 First** - Consolidate routers (less risk, cleaner codebase)
2. **ST-013 Second** - Implement soft deletes (benefits from consolidated router)

**Rationale:**
- RF-001 simplifies the codebase before ST-013
- ST-013 will only need to update one orders router instead of two
- Cleaner separation of concerns

---

## Time Estimates

### ST-013: Standardize Soft Deletes
- Schema updates: 1 hour
- Utility functions: 1 hour
- Update delete operations: 3-4 hours
- Update query filters: 2-3 hours
- Admin restore endpoints: 1-2 hours
- Testing: 2-3 hours
- **Total: 10-14 hours (1.5-2 days)**

### RF-001: Consolidate Orders Router
- Merge routers: 2-3 hours
- Update imports: 1-2 hours
- Update tests: 1-2 hours
- Frontend updates: 2-3 hours
- Testing: 2-3 hours
- **Total: 8-13 hours (1-1.5 days)**

**Combined Total: 18-27 hours (2.5-3.5 days)**

---

## Next Steps

1. ✅ Complete analysis (this document)
2. ⏭️ Begin RF-001 implementation
3. ⏭️ Begin ST-013 implementation
4. ⏭️ Comprehensive testing
5. ⏭️ Documentation updates
6. ⏭️ Deploy and verify

---

## Notes

- Both tasks follow TDD workflow
- All changes will be on feature branch
- Deploy for review before merging to main
- User approval required before final merge
