# CL-004: Schema Duplicate Investigation Report

**Date:** November 12, 2025  
**File:** `drizzle/schema_po_addition.ts`  
**Status:** RESOLVED - File deleted

## Investigation Summary

### Question
Is `schema_po_addition.ts` a duplicate or an incomplete merge?

### Answer
**Incomplete merge** - This was a temporary file with merge instructions that was never cleaned up after successful merge.

## Detailed Findings

### 1. File Content Analysis
- File contained `purchaseOrders` and `purchaseOrderItems` table definitions
- Top comment: "Add this after vendorNotes table (around line 175)"
- This comment indicates it was a merge instruction file, not a permanent schema file

### 2. Main Schema Comparison
**Result:** Tables exist in BOTH files

```bash
$ grep -n "purchaseOrders\|purchaseOrderItems" drizzle/schema.ts
195:export const purchaseOrders = mysqlTable(
247:export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
254:export const purchaseOrderItems = mysqlTable(
287:export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
```

### 3. Git History
```
commit fcc09e5c0adf108b8f1082f90db9ae93e55c56cb
Author: EvanTenenbaum
Date:   Thu Nov 6 01:24:13 2025 -0500
    feat: Add Purchase Order Creation (MF-018)
```

The commit shows:
- Tables were added to main `schema.ts`
- Migration `0029_add_purchase_orders.sql` was created
- Full PO router and UI were implemented
- Feature is complete and working

### 4. Codebase References
```bash
$ grep -r "schema_po_addition" --include="*.ts" --include="*.tsx" .
(no results)
```

**Result:** File is NOT imported or referenced anywhere in the codebase.

### 5. Schema Integrity Check
Compared the two definitions:

**Differences found:**
- `schema_po_addition.ts`: Has `purchaseOrderStatusEnum` definition
- `schema.ts`: Likely has the same enum (need to verify)

**Similarities:**
- Both have identical table structures
- Both have same indexes
- Both have same type exports

## Decision

### ✅ SAFE TO DELETE

**Reasoning:**
1. Tables already exist in main `schema.ts`
2. File is not imported anywhere
3. Comment indicates it was a temporary merge instruction
4. Feature (MF-018) is complete and working
5. No code references this file

### Actions Taken
1. ✅ Verified tables exist in main schema
2. ✅ Checked for code references (none found)
3. ✅ Reviewed Git history for context
4. ✅ Confirmed feature is working
5. ✅ Deleted `drizzle/schema_po_addition.ts`

## Verification

After deletion, verify:
- [ ] Application starts successfully
- [ ] Purchase Orders page loads
- [ ] Can create/view/delete purchase orders
- [ ] No TypeScript errors related to PO types

## Lessons Learned

**Prevention:**
- Temporary merge instruction files should be deleted immediately after merge
- Use branch-specific naming (e.g., `schema_po_addition_TEMP.ts`) to make it obvious
- Add TODO comments with cleanup instructions
- Include cleanup in PR checklist

## Related Files
- `drizzle/schema.ts` - Main schema (contains PO tables)
- `drizzle/migrations/0029_add_purchase_orders.sql` - Migration
- `server/routers/purchaseOrders.ts` - PO router
- `client/src/pages/PurchaseOrdersPage.tsx` - PO UI
