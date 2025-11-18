# Soft Delete Implementation Guide

**Task:** ST-013: Standardize Soft Deletes  
**Status:** ✅ Core Infrastructure Complete  
**Date:** 2025-11-17  
**Agent:** Agent-05

---

## Overview

This document describes the soft delete implementation for the TERP system. Soft deletes allow records to be marked as deleted without permanently removing them from the database, enabling data recovery and maintaining audit trails.

## Implementation Status

### ✅ Completed

1. **Schema Changes (44 tables)**
   - Added `deletedAt: timestamp("deleted_at")` to all major tables
   - Created migration: `drizzle/0039_add_soft_delete_to_all_tables.sql`
   - Added indexes on high-traffic tables for performance

2. **Utility Functions**
   - Created `server/utils/softDelete.ts` with comprehensive helpers:
     - `softDelete(table, id)` - Soft delete a single record
     - `softDeleteMany(table, ids)` - Soft delete multiple records
     - `restoreDeleted(table, id)` - Restore a soft-deleted record
     - `hardDelete(table, id)` - Permanent deletion (use with caution)
     - `excludeDeleted(table)` - Query filter to exclude deleted records
     - `onlyDeleted(table)` - Query filter for deleted records only
     - `withExcludeDeleted(table, ...conditions)` - Combine filters
     - `isDeleted(table, id)` - Check if record is deleted
     - `getDeleted(table, limit)` - Get all deleted records
     - `countDeleted(table)` - Count deleted records

3. **Router Updates**
   - **Orders Router** (`server/routers/orders.ts`)
     - Updated `delete` procedure to use `softDelete()`
     - Added `restore` procedure for recovery
     - Added `includeDeleted` option to `getAll` query
     - All 21 tests passing

4. **Automation Scripts**
   - `scripts/add-soft-delete-to-schema.ts` - Automated schema updates

### 🚧 Remaining Work

The following routers still need to be updated to use soft delete:

#### High Priority (Financial & Core Data)
- [ ] `server/routers/clients.ts` - Client management
- [ ] `server/routers/invoices.ts` - Invoice management
- [ ] `server/routers/payments.ts` - Payment processing
- [ ] `server/routers/inventory.ts` - Inventory/batches
- [ ] `server/routers/vendors.ts` - Vendor management
- [ ] `server/routers/purchaseOrders.ts` - Purchase orders

#### Medium Priority (Operational)
- [ ] `server/routers/salesSheets.ts` - Sales sheets
- [ ] `server/routers/samples.ts` - Sample management
- [ ] `server/routers/returns.ts` - Returns processing
- [ ] `server/routers/refunds.ts` - Refund processing
- [ ] `server/routers/products.ts` - Product catalog
- [ ] `server/routers/strains.ts` - Strain management

#### Low Priority (Supporting Features)
- [ ] `server/routers/freeformNotes.ts` - Notes
- [ ] `server/routers/scratchPad.ts` - Scratch pad
- [ ] `server/routers/todoLists.ts` - Todo lists
- [ ] `server/routers/todoTasks.ts` - Tasks
- [ ] `server/routers/comments.ts` - Comments
- [ ] `server/routers/calendar.ts` - Calendar events

---

## Usage Guide

### Basic Soft Delete

```typescript
import { softDelete, restoreDeleted } from '../utils/softDelete';
import { orders } from '../../drizzle/schema';

// Soft delete an order
const rowsAffected = await softDelete(orders, orderId);

// Restore a deleted order
const restored = await restoreDeleted(orders, orderId);
```

### Updating Router Delete Procedures

**Before (Hard Delete):**
```typescript
delete: protectedProcedure
  .use(requirePermission("orders:delete"))
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    await ordersDb.deleteOrder(input.id);
    return { success: true };
  }),
```

**After (Soft Delete):**
```typescript
import { softDelete, restoreDeleted } from "../utils/softDelete";

delete: protectedProcedure
  .use(requirePermission("orders:delete"))
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    const rowsAffected = await softDelete(orders, input.id);
    return { success: rowsAffected > 0 };
  }),

restore: protectedProcedure
  .use(requirePermission("orders:delete"))
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    const rowsAffected = await restoreDeleted(orders, input.id);
    return { success: rowsAffected > 0 };
  }),
```

### Excluding Deleted Records in Queries

```typescript
import { excludeDeleted } from '../utils/softDelete';
import { orders } from '../../drizzle/schema';

// Get only non-deleted orders
const activeOrders = await db
  .select()
  .from(orders)
  .where(excludeDeleted(orders));

// Combine with other conditions
const clientOrders = await db
  .select()
  .from(orders)
  .where(
    and(
      excludeDeleted(orders),
      eq(orders.clientId, clientId)
    )
  );
```

### Admin Interface for Deleted Records

```typescript
import { onlyDeleted, getDeleted } from '../utils/softDelete';

// Get all deleted orders
const deletedOrders = await getDeleted(orders, 100);

// Count deleted records
const deletedCount = await countDeleted(orders);

// Check if specific record is deleted
const isOrderDeleted = await isDeleted(orders, orderId);
```

---

## Migration Instructions

### For Development

The schema changes have been applied to `drizzle/schema.ts`. When you pull the latest code:

1. Run `pnpm install` to ensure dependencies are up to date
2. The schema changes are already in the TypeScript definitions
3. The migration SQL will be applied automatically on next deployment

### For Production

The migration file `drizzle/0039_add_soft_delete_to_all_tables.sql` will be applied automatically during the next deployment. It:

1. Adds `deleted_at TIMESTAMP NULL DEFAULT NULL` to all tables
2. Creates indexes on high-traffic tables for performance
3. Is safe to run (uses `ADD COLUMN` which is non-destructive)

---

## Testing Guidelines

When updating a router to use soft delete:

1. **Update the delete test:**
   ```typescript
   it("should soft delete a record", async () => {
     // Mock the database update
     const mockUpdate = vi.fn().mockReturnValue({
       set: vi.fn().mockReturnThis(),
       where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
     });
     vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

     const result = await caller.routerName.delete({ id: 1 });
     expect(result.success).toBe(true);
   });
   ```

2. **Add restore test:**
   ```typescript
   it("should restore a deleted record", async () => {
     const mockUpdate = vi.fn().mockReturnValue({
       set: vi.fn().mockReturnThis(),
       where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
     });
     vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

     const result = await caller.routerName.restore({ id: 1 });
     expect(result.success).toBe(true);
   });
   ```

3. **Test query filtering:**
   - Verify that list queries exclude deleted records by default
   - Test `includeDeleted` option if implemented

---

## Performance Considerations

### Indexed Tables

The following tables have indexes on `deleted_at` for optimal query performance:

- users
- clients
- orders
- batches
- invoices
- payments
- vendors
- products
- purchase_orders
- sales_sheets
- todo_tasks
- calendar_events

### Query Optimization

When querying large tables:

1. **Always use the index:**
   ```sql
   WHERE deleted_at IS NULL  -- Uses index
   ```

2. **Avoid:**
   ```sql
   WHERE deleted_at = NULL  -- Does NOT use index
   ```

3. **Use the utility functions** - they generate the correct SQL automatically

---

## Benefits

1. **Data Recovery** - Accidentally deleted records can be restored
2. **Audit Trail** - Maintain history of all deletions
3. **Compliance** - Meet data retention requirements
4. **Safety** - Reduce risk of permanent data loss
5. **Analytics** - Analyze deletion patterns and reasons

---

## Future Enhancements

Potential improvements for future iterations:

1. **Deletion Metadata**
   - Add `deletedBy` (user ID) column
   - Add `deletionReason` text field
   - Track deletion timestamp more precisely

2. **Automatic Cleanup**
   - Scheduled job to hard-delete old soft-deleted records
   - Configurable retention period per table

3. **Admin UI**
   - Dashboard showing recently deleted records
   - Bulk restore functionality
   - Deletion audit log

4. **Cascade Soft Delete**
   - Automatically soft-delete related records
   - Example: Deleting an order soft-deletes its line items

---

## Support

For questions or issues with soft delete implementation:

1. Review this documentation
2. Check `server/utils/softDelete.ts` for available functions
3. Reference `server/routers/orders.ts` as an example implementation
4. Consult the Master Roadmap for ST-013 status updates

---

**Last Updated:** 2025-11-17  
**Maintained By:** TERP Development Team
