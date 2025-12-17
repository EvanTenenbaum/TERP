# Design Document: Data Completeness Fix

## Overview

This document outlines the design for fixing data completeness issues in the TERP ERP system. The issues fall into two categories:

1. **Bug Fixes**: Two actual bugs causing incorrect display in Client Purchase History
2. **Data Gaps**: Ten areas showing zeros due to unseeded data types

The fix involves:
- Enhancing the order items seeder to include product metadata (strain, category, grade)
- Adding field name compatibility (`price` alongside `unitPrice`)
- Creating new seeders for vendor bills, purchase orders, and reservations
- Modifying existing seeders to include workflow queue statuses and draft orders

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Data Completeness Fix Architecture                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Bug Fixes     │     │   New Seeders   │     │ Seeder Updates  │
│                 │     │                 │     │                 │
│ • Order items   │     │ • Vendor bills  │     │ • Batches       │
│   metadata      │     │ • Purchase      │     │   (workflow     │
│ • Price field   │     │   orders        │     │   statuses)     │
│   compatibility │     │ • Reservations  │     │ • Orders        │
│                 │     │                 │     │   (drafts,      │
│                 │     │                 │     │   today's date) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Complete Seed CLI     │
                    │   pnpm seed:new         │
                    │   --complete            │
                    └─────────────────────────┘
```

## Components and Interfaces

### Component 1: Enhanced Order Items Generator

**File**: `scripts/seed/seeders/seed-orders.ts`

Update the `generateOrderItems` function to include product metadata:

```typescript
interface EnhancedOrderItem {
  batchId: number;
  productId: number;
  displayName: string;
  originalName: string;
  // NEW: Product metadata for purchase history analysis
  strain: string | null;
  category: string;
  subcategory: string | null;
  grade: string | null;
  // Pricing (include both field names for compatibility)
  quantity: number;
  unitPrice: number;
  price: number; // NEW: Alias for unitPrice for compatibility
  // ... existing fields
}
```

### Component 2: Vendor Bills Seeder

**File**: `scripts/seed/seeders/seed-vendor-bills.ts` (new)

Creates vendor bills linked to lots/vendors:

```typescript
export async function seedVendorBills(
  count: number,
  validator: SchemaValidator,
  masker: PIIMasker
): Promise<SeederResult> {
  // Get existing vendors and lots
  // Create bills with various statuses: DRAFT, PENDING, APPROVED, PARTIAL, PAID, OVERDUE
  // Link to vendors via vendorId
  // Link to lots via referenceType: "LOT", referenceId: lotId
  // Set createdBy to 1 (system user)
  // Create billLineItems for each bill
  // Create corresponding vendor payments for PAID/PARTIAL bills
}
```

**Required Fields**:
- `billNumber`: Unique bill number (e.g., "BILL-000001")
- `vendorId`: Reference to vendors table
- `billDate`, `dueDate`: Date fields
- `subtotal`, `taxAmount`, `discountAmount`, `totalAmount`, `amountPaid`, `amountDue`: Financial fields
- `status`: One of DRAFT, PENDING, APPROVED, PARTIAL, PAID, OVERDUE
- `referenceType`: "LOT" to link to intake lots
- `referenceId`: The lot ID
- `createdBy`: User ID (use 1 for system user)

### Component 3: Purchase Orders Seeder

**File**: `scripts/seed/seeders/seed-purchase-orders.ts` (new)

Creates purchase orders linked to vendors:

```typescript
export async function seedPurchaseOrders(
  count: number,
  validator: SchemaValidator,
  masker: PIIMasker
): Promise<SeederResult> {
  // Get existing vendors and products
  // Create POs with various statuses
  // Create PO line items linked to products
}
```

### Component 4: Batch Reserved Quantity (No Separate Table)

**Note**: There is no separate `inventoryReservations` table in the schema. The `reservedQty` field on the `batches` table tracks reserved inventory directly.

**File**: `scripts/seed/seeders/seed-batches.ts`

Update batch seeder to set `reservedQty` for some batches:

```typescript
// For 10-20% of LIVE batches, set reservedQty to a portion of onHandQty
// Ensure reservedQty <= onHandQty
const reservedQty = Math.floor(onHandQty * (0.1 + Math.random() * 0.3)); // 10-40% of onHand
```

### Component 5: Updated Batches Seeder

**File**: `scripts/seed/seeders/seed-batches.ts`

Modify status distribution:

```typescript
// Current: All batches are LIVE or SOLD_OUT
// New distribution:
// - 60% LIVE
// - 15% SOLD_OUT
// - 15% AWAITING_INTAKE (workflow queue)
// - 5% ON_HOLD (workflow queue)
// - 3% QUARANTINED (workflow queue)
// - 2% CLOSED
```

### Component 6: Updated Orders Seeder

**File**: `scripts/seed/seeders/seed-orders.ts`

Add draft orders and today's orders:

```typescript
// New distribution:
// - 85% confirmed SALE orders (existing)
// - 10% draft orders (isDraft: true)
// - 5% orders with today's date
```

### Component 7: CLI Enhancement

**File**: `scripts/seed/lib/cli.ts`

Add `--complete` flag:

```typescript
interface SeedOptions {
  // ... existing options
  complete?: boolean; // Seed all data types including bills, POs, reservations
}
```

## Data Models

No new tables required. Changes involve populating existing tables:

| Table | Current State | After Fix |
|-------|---------------|-----------|
| `orders.items` | Missing strain/category/grade | Includes full product metadata |
| `batches` | All LIVE/SOLD_OUT | Includes workflow queue statuses |
| `bills` | Empty | Populated with vendor bills |
| `purchaseOrders` | Empty | Populated with POs |
| `purchaseOrderItems` | Empty | Populated with PO line items |
| `batches.reservedQty` | All zeros | 10-20% of LIVE batches have non-zero reservedQty |
| `billLineItems` | Empty | Populated with bill line items |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Order Items Product Metadata Completeness
*For any* seeded order item, the item SHALL contain `strain` (or null if product has no strain), `category` (non-null), and `grade` fields populated from the associated batch/product data.
**Validates: Requirements 1.1, 3.1, 3.2, 3.3**

### Property 2: Price Field Compatibility
*For any* seeded order item, the `price` field SHALL equal the `unitPrice` field, ensuring compatibility with both field names.
**Validates: Requirements 2.1**

### Property 3: Purchase History Analysis Accuracy
*For any* client with seeded orders, the `analyzeClientPurchaseHistory` function SHALL return patterns with non-null `strain` or `category` values (not "Unknown Product") and non-zero `avgPrice` values.
**Validates: Requirements 1.2, 2.2, 2.3**

### Property 4: Batch Status Distribution
*For any* complete seed operation, the batch status distribution SHALL include: 10-20% AWAITING_INTAKE, 5-10% ON_HOLD, and 2-5% QUARANTINED batches.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 5: Draft Orders Presence
*For any* complete seed operation, 10-15% of orders SHALL have `isDraft: true` with `saleStatus` null.
**Validates: Requirements 5.1, 5.2**

### Property 6: Vendor Bills Completeness
*For any* complete seed operation, vendor bills SHALL exist with valid vendor references, various statuses (DRAFT, PENDING, APPROVED, PARTIAL, PAID, OVERDUE), corresponding billLineItems, and payments for PAID/PARTIAL bills.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 7: Purchase Orders Completeness
*For any* complete seed operation, purchase orders SHALL exist with valid vendor references, various statuses, and line items linked to valid products.
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 8: Today's Orders Presence
*For any* complete seed operation, 3-5 orders SHALL have `createdAt` set to today's date, distributed across different clients.
**Validates: Requirements 8.1, 8.2**

### Property 9: Reserved Quantity Validity
*For any* batch with non-zero `reservedQty`, the value SHALL be less than or equal to `onHandQty`, and 10-20% of LIVE batches SHALL have non-zero reservedQty.
**Validates: Requirements 9.1, 9.2**

### Property 10: Referential Integrity
*For any* complete seed operation, all foreign key references SHALL point to existing records (no orphaned records).
**Validates: Requirements 10.2**

## Error Handling

### Missing Dependencies
- If products table is empty when seeding orders, log error and skip order item metadata enrichment
- If vendors table is empty when seeding bills/POs, skip those seeders with warning
- If lots table is empty when seeding bills, skip with warning (bills link to lots)
- If no user with ID 1 exists, create bills/POs with createdBy = 1 anyway (FK may fail)

### Validation Errors
- Log specific field-level validation errors
- Continue with other records on validation failure
- Report total skipped records in summary

### FK Constraint Errors
- Use `--clean` flag to clear and reseed in correct order
- Seeder order: vendors → products → purchaseOrders → batches → clients → orders → invoices → bills → payments

### Edge Cases
- **Products without strains**: Use category as fallback for display name
- **Batches without grades**: Set grade to null in order items
- **Bills with zero line items**: Ensure at least one line item per bill
- **POs with zero items**: Ensure at least one item per PO
- **Reserved quantity exceeds onHand**: Cap reservedQty at onHandQty

## Testing Strategy

### Dual Testing Approach

**Unit Tests**: Verify specific examples and edge cases
- Order item metadata population
- Price field compatibility
- Status distribution calculations

**Property-Based Tests**: Verify universal properties using fast-check
- Property 1-10 as defined above

### Property-Based Testing Library
Use **fast-check** for TypeScript property-based testing.

### Test Annotations
Each property-based test MUST include:
```typescript
// **Feature: data-completeness-fix, Property 1: Order Items Product Metadata Completeness**
// **Validates: Requirements 1.1, 3.1, 3.2, 3.3**
```

### Test File Locations
- `scripts/seed/seeders/seed-orders.test.ts` - Order item metadata tests
- `scripts/seed/seeders/seed-batches.test.ts` - Batch status distribution tests
- `scripts/seed/seeders/seed-vendor-bills.test.ts` - Vendor bills tests
- `scripts/seed/seeders/seed-purchase-orders.test.ts` - Purchase orders tests
- `scripts/seed/seeders/seed-reservations.test.ts` - Reservations tests
- `server/historicalAnalysis.test.ts` - Purchase history analysis tests

## Implementation Priority

### Phase 1: Bug Fixes (High Priority)
1. Fix order items to include product metadata
2. Add `price` field for compatibility
3. Verify purchase history analysis works

### Phase 2: Workflow Queue Data (Medium Priority)
4. Update batch seeder for workflow statuses
5. Verify workflow queue widget displays data

### Phase 3: Draft Orders & Today's Sales (Medium Priority)
6. Update order seeder for drafts and today's orders
7. Verify draft orders tab and today's metrics

### Phase 4: Accounts Payable Data (Lower Priority)
8. Create vendor bills seeder
9. Create purchase orders seeder
10. Verify AP widgets display data

### Phase 5: Reservations (Lower Priority)
11. Create reservations seeder
12. Verify inventory reserved column

### Phase 6: CLI Enhancement (Final)
13. Add `--complete` flag to CLI
14. Integration testing
