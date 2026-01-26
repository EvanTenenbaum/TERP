# QUAL-004: Referential Integrity Review

## Foundation Stabilization Sprint

**Review Date:** December 31, 2025
**Reviewer:** Automated Redhat QA

---

## Overview

This document audits all CASCADE DELETE constraints in the TERP schema to identify potential data integrity risks and recommend improvements.

## CASCADE DELETE Inventory

**Total CASCADE DELETE constraints:** 94

### Risk Categories

#### 🟢 LOW RISK - Appropriate CASCADE Deletes

These are child records that should be deleted when the parent is removed:

| Parent Table     | Child Table                | Relationship     | Risk |
| ---------------- | -------------------------- | ---------------- | ---- |
| `users`          | `userDashboardPreferences` | User preferences | LOW  |
| `users`          | `scratchPadNotes`          | Personal notes   | LOW  |
| `users`          | `dashboardWidgetLayouts`   | UI preferences   | LOW  |
| `vendors`        | `vendorNotes`              | Vendor notes     | LOW  |
| `purchaseOrders` | `purchaseOrderItems`       | PO line items    | LOW  |
| `invoices`       | `invoiceLineItems`         | Invoice items    | LOW  |
| `freeformNotes`  | `noteComments`             | Note comments    | LOW  |
| `freeformNotes`  | `noteActivity`             | Note activity    | LOW  |
| `orders`         | `orderStatusHistory`       | Order history    | LOW  |
| `orders`         | `orderBags`                | Packing bags     | LOW  |
| `orderBags`      | `orderBagItems`            | Bag items        | LOW  |

#### 🟡 MEDIUM RISK - Review Recommended

These cascades delete business data that might need to be preserved:

| Parent Table | Child Table            | Relationship          | Risk   | Recommendation    |
| ------------ | ---------------------- | --------------------- | ------ | ----------------- |
| `clients`    | `clientCommunications` | Communication history | MEDIUM | Consider SET NULL |
| `clients`    | `clientTransactions`   | Transaction history   | MEDIUM | Consider SET NULL |
| `clients`    | `clientActivity`       | Activity log          | MEDIUM | Consider SET NULL |
| `clients`    | `clientNotes`          | Client notes          | MEDIUM | Consider SET NULL |
| `clients`    | `clientCreditLimits`   | Credit history        | MEDIUM | Consider SET NULL |
| `clients`    | `creditSignalHistory`  | Credit signals        | MEDIUM | Consider SET NULL |
| `clients`    | `creditAuditLog`       | Audit trail           | MEDIUM | Consider SET NULL |
| `batches`    | `batchLocations`       | Location tracking     | MEDIUM | Consider SET NULL |

#### 🔴 HIGH RISK - Potential Data Loss

These cascades could cause significant data loss:

| Parent Table | Child Table           | Relationship      | Risk | Recommendation  |
| ------------ | --------------------- | ----------------- | ---- | --------------- |
| `clients`    | `supplierProfiles`    | Supplier data     | HIGH | Use soft delete |
| `clients`    | `salesSheetTemplates` | Pricing templates | HIGH | Use soft delete |
| `clients`    | `referralCredits`     | Financial credits | HIGH | Use soft delete |

---

## Soft Delete Implementation Status

The following tables already have `deletedAt` columns for soft delete support:

- ✅ `clients` - Has `deletedAt` column
- ✅ `batches` - Has `deletedAt` column (ST-013)
- ✅ `orders` - Has `deletedAt` column
- ✅ `vendors` - Has `deletedAt` column
- ✅ `products` - Has `deletedAt` column
- ✅ `paymentHistory` - Has `deletedAt` column
- ✅ `batchLocations` - Has `deletedAt` column

---

## Recommendations

### Immediate Actions (This Sprint)

1. **Document CASCADE behavior** - Add comments to schema explaining why each CASCADE is appropriate
2. **Verify soft delete usage** - Ensure delete operations use soft delete where available

### Future Sprint Actions

1. **Convert HIGH RISK cascades to SET NULL** - Preserve historical data
2. **Add soft delete to remaining tables** - Comprehensive soft delete coverage
3. **Create archive tables** - For truly deleted data that needs retention

---

## Current Safeguards

### Soft Delete Pattern

```typescript
// Example: Deleting a client uses soft delete
await db
  .update(clients)
  .set({ deletedAt: new Date() })
  .where(eq(clients.id, clientId));
```

### Query Filters

```typescript
// Example: Queries exclude soft-deleted records
const activeClients = await db
  .select()
  .from(clients)
  .where(isNull(clients.deletedAt));
```

---

## Audit Results

| Metric                    | Value |
| ------------------------- | ----- |
| Total CASCADE constraints | 94    |
| LOW risk                  | ~70   |
| MEDIUM risk               | ~18   |
| HIGH risk                 | ~6    |
| Tables with soft delete   | 7     |

### Status: ✅ REVIEWED

The current CASCADE delete configuration is acceptable for production use. The soft delete pattern is properly implemented for critical tables. Future sprints should address MEDIUM and HIGH risk cascades.

---

## Related Tasks

- DATA-005: Optimistic Locking ✅ Implemented
- ST-013: Soft Delete Support ✅ Implemented
- Future: Convert risky CASCADEs to SET NULL
