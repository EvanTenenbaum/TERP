# Stability Audit Report: QUAL-004 & ST-024

**Date:** 2026-01-09
**Tasks:** QUAL-004 (Referential Integrity Review), ST-024 (Comments Feature Review)
**Status:** ✅ COMPLETED

---

## QUAL-004: Referential Integrity (CASCADE Deletes) Audit

### Executive Summary
✅ **2 CRITICAL ISSUES FIXED**
⚠️ **1 POTENTIAL CONCERN IDENTIFIED**
✅ **3 CRITICAL TABLES VERIFIED SAFE**

### Critical Issues Fixed

#### 1. inventoryMovements.batchId (FIXED)
- **File:** `/home/user/TERP/drizzle/schema.ts` (Line 2858)
- **Issue:** Had `onDelete: "cascade"` - would delete entire inventory audit trail if a batch was deleted
- **Fix:** Changed to `onDelete: "restrict"` to protect audit trail
- **Impact:** Prevents accidental loss of inventory movement history
- **Migration Required:** Yes - database constraint needs updating

**Before:**
```typescript
batchId: int("batchId")
  .notNull()
  .references(() => batches.id, { onDelete: "cascade" }),
```

**After:**
```typescript
batchId: int("batchId")
  .notNull()
  .references(() => batches.id, { onDelete: "restrict" }), // QUAL-004: Protect audit trail
```

#### 2. orderStatusHistory.orderId (FIXED)
- **File:** `/home/user/TERP/drizzle/schema.ts` (Line 2351)
- **Issue:** Had `onDelete: "cascade"` - would delete all status history if an order was deleted
- **Fix:** Changed to `onDelete: "restrict"` to protect audit trail
- **Impact:** Preserves complete order fulfillment history
- **Migration Required:** Yes - database constraint needs updating

**Before:**
```typescript
orderId: int("order_id")
  .notNull()
  .references(() => orders.id, { onDelete: "cascade" }),
```

**After:**
```typescript
orderId: int("order_id")
  .notNull()
  .references(() => orders.id, { onDelete: "restrict" }), // QUAL-004: Protect audit trail
```

### Critical Tables Verified Safe

#### ✅ ledgerEntries
- **Status:** SAFE
- **Finding:** No CASCADE deletes found
- **Foreign Keys:** No explicit onDelete behavior defined, defaults to RESTRICT

#### ✅ payments
- **Status:** SAFE
- **Finding:** All foreign keys use `onDelete: "restrict"`
- **Foreign Keys:**
  - `bankAccountId` → `bankAccounts.id` (restrict)
  - `customerId` → `clients.id` (restrict)
  - `vendorId` → `clients.id` (restrict)

#### ✅ invoices
- **Status:** SAFE
- **Finding:** All foreign keys use `onDelete: "restrict"`
- **Foreign Keys:**
  - `customerId` → `clients.id` (restrict)

### Potential Concern: invoiceLineItems

⚠️ **invoiceLineItems.invoiceId has CASCADE delete**
- **File:** `/home/user/TERP/drizzle/schema.ts` (Line 1007)
- **Current:** `onDelete: "cascade"`
- **Assessment:** ACCEPTABLE for now, but worth monitoring
- **Reasoning:**
  1. Invoice line items are detail records with no independent meaning
  2. Parent `invoices` table has soft delete support (`deletedAt`)
  3. Hard deletes should not occur in normal operations
  4. However, if a hard delete happens, financial detail is lost
- **Recommendation:** Consider adding soft delete enforcement at application level

### Other CASCADE Deletes Found

Total CASCADE deletes in schema: **106 occurrences**

Most are acceptable for:
- Detail records (e.g., order bags, calendar event attendees)
- User-owned records (e.g., user sessions, user preferences)
- Hierarchical data (e.g., tag groups → tags)
- Calendar/todo relationships

### Migration Required

Two database migrations needed to align constraints:

1. **Migration: inventoryMovements_restrict_cascade**
```sql
ALTER TABLE inventoryMovements
DROP FOREIGN KEY inventoryMovements_batchId_batches_id_fk;

ALTER TABLE inventoryMovements
ADD CONSTRAINT inventoryMovements_batchId_batches_id_fk
FOREIGN KEY (batchId) REFERENCES batches(id) ON DELETE RESTRICT;
```

2. **Migration: orderStatusHistory_restrict_cascade**
```sql
ALTER TABLE order_status_history
DROP FOREIGN KEY order_status_history_orderId_orders_id_fk;

ALTER TABLE order_status_history
ADD CONSTRAINT order_status_history_orderId_orders_id_fk
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;
```

**Note:** Actual foreign key constraint names may differ. Use `SHOW CREATE TABLE` to verify exact names.

### Verification

TypeScript compilation: ✅ PASSED (no new errors introduced)

---

## ST-024: Comments Feature Review

### Executive Summary
✅ **FEATURE IS ACTIVELY USED - NO ACTION REQUIRED**

### Findings

#### Comments Feature Status: ACTIVE AND CRITICAL
- **Router:** `/home/user/TERP/server/routers/comments.ts` (465 lines)
- **Registration:** Active in main router (`server/routers.ts:181`)
- **Tests:** Comprehensive test suite exists (`server/routers/comments.test.ts`)

#### Feature Capabilities
1. **Core Functionality:**
   - Create, read, update, delete comments
   - Polymorphic comments (works with orders, batches, clients, products, invoices, notes, tasks)
   - Comment resolution/unresolve workflow
   - Pagination support (PERF-003)

2. **Advanced Features:**
   - @mention parsing and notifications
   - Inbox integration for mentions
   - User permission-based access control
   - Comprehensive TypeScript typing

3. **Frontend Components:**
   - `/home/user/TERP/client/src/components/comments/CommentWidget.tsx` - Main UI
   - `/home/user/TERP/client/src/components/comments/CommentList.tsx`
   - `/home/user/TERP/client/src/components/comments/CommentItem.tsx`
   - `/home/user/TERP/client/src/components/comments/MentionInput.tsx`
   - `/home/user/TERP/client/src/components/dashboard/widgets-v2/CommentsPanel.tsx`

4. **RBAC Integration:**
   - 7 permission types defined (`comments:access`, `comments:read`, `comments:create`, `comments:update`, `comments:update_all`, `comments:delete`, `comments:delete_all`)
   - Integrated into 8 role definitions (Sales Manager, Sales Rep, Operations Manager, Warehouse Staff, Customer Service Rep, Buyer, Viewer)

#### Database Schema
- **comments table:** Supports soft deletes, user associations
- **commentMentions table:** Tracks @mentions with CASCADE delete (acceptable)
- **Integration:** Links to inbox notifications

### Decision: KEEP AS-IS

**Rationale:**
1. Feature is actively used across multiple entity types
2. Well-integrated with RBAC and permissions system
3. Has comprehensive test coverage
4. Frontend components actively render and interact
5. Critical for collaboration and communication workflow
6. @mention system integrates with inbox notifications

**No deprecation or removal warranted.**

---

## Recommendations

### Immediate Actions Required
1. ✅ **COMPLETED:** Update schema file with RESTRICT constraints
2. 🔄 **TODO:** Create and run database migrations for the two fixed tables
3. 🔄 **TODO:** Test that batch/order deletion is properly prevented by new constraints

### Future Considerations
1. **Soft Delete Enforcement:**
   - Consider adding application-level checks to prevent hard deletes on financial tables
   - Invoice and payment deletions should always be soft deletes

2. **Audit Trail Protection:**
   - Document policy: Never hard-delete records that reference audit tables
   - Add database triggers or application middleware to enforce this

3. **invoiceLineItems:**
   - Monitor for any accidental invoice hard deletes
   - Consider adding explicit audit logging before any invoice deletion

### Testing Checklist
- [ ] Verify batch deletion is prevented when inventory movements exist
- [ ] Verify order deletion is prevented when status history exists
- [ ] Verify soft deletes still work correctly
- [ ] Verify application handles RESTRICT constraint errors gracefully

---

## Files Modified

1. `/home/user/TERP/drizzle/schema.ts`
   - Line 2351: orderStatusHistory.orderId (cascade → restrict)
   - Line 2858: inventoryMovements.batchId (cascade → restrict)

## Files Created

1. `/home/user/TERP/STABILITY_AUDIT_QUAL-004_ST-024.md` (this report)

---

## Sign-off

**Tasks Completed:**
- ✅ QUAL-004: Referential integrity audit complete, 2 critical issues fixed
- ✅ ST-024: Comments feature review complete, confirmed active usage

**Next Steps:**
1. Review and approve this audit report
2. Create database migrations for the two constraint changes
3. Test migrations in development environment
4. Deploy migrations to production after validation
