# Design Document: Data Display Fix

## Overview

This document outlines the design for fixing systematic data display issues in the TERP ERP system. The issues fall into four categories:

1. **API Response Structure Mismatch**: Frontend pages incorrectly check `Array.isArray(response)` when APIs return `{ items: [], total: 0 }`
2. **Missing Seeded Data Relationships**: Orders are seeded without corresponding `clientTransactions`, causing client stats to show $0
3. **Hardcoded Placeholder Values**: VendorProfilePage doesn't query actual data
4. **Schema/API Validation Mismatch**: Invoice status "VIEWED" exists in database but not in API Zod schema

## Architecture

The fix involves changes across three layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Fix Architecture                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   API Layer     │     │   Seeding       │
│   (React)       │     │   (tRPC)        │     │   System        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ Fix response          │ Fix Zod              │ Add client
         │ extraction            │ schemas              │ transactions
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Invoices.tsx    │     │ accounting.ts   │     │ seed-orders.ts  │
│ Bills.tsx       │     │ (add VIEWED)    │     │ seed-invoices.ts│
│ Payments.tsx    │     │                 │     │ seed-payments.ts│
│ Expenses.tsx    │     │                 │     │                 │
│ Dashboard.tsx   │     │                 │     │                 │
│ VendorProfile   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Components and Interfaces

### Component 1: Response Extraction Utility

Create a type-safe utility for extracting arrays from paginated API responses.

**Location**: `client/src/lib/api-utils.ts`

```typescript
/**
 * Extracts array from paginated API response
 * Handles both direct arrays and { items: [], total } structures
 */
export function extractArray<T>(
  response: T[] | { [key: string]: T[] | number } | undefined,
  key: string
): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  const items = (response as Record<string, unknown>)[key];
  return Array.isArray(items) ? items : [];
}

// Usage examples:
// extractArray(invoicesResponse, 'invoices')
// extractArray(billsResponse, 'bills')
```

### Component 2: Updated Frontend Pages

**Files to modify**:
- `client/src/pages/accounting/Invoices.tsx`
- `client/src/pages/accounting/Bills.tsx`
- `client/src/pages/accounting/Payments.tsx`
- `client/src/pages/accounting/Expenses.tsx`
- `client/src/pages/accounting/AccountingDashboard.tsx`
- `client/src/pages/accounting/BankTransactions.tsx`

**Change pattern**:
```typescript
// BEFORE (incorrect)
const invoiceList = Array.isArray(invoices) ? invoices : [];

// AFTER (correct)
const invoiceList = invoices?.invoices ?? [];
// OR using utility:
const invoiceList = extractArray(invoices, 'invoices');
```

### Component 3: API Schema Fix

**File**: `server/routers/accounting.ts`

Add "VIEWED" to invoice status enum:

```typescript
// BEFORE
status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID"]).optional(),

// AFTER
status: z.enum(["DRAFT", "SENT", "VIEWED", "PARTIAL", "PAID", "OVERDUE", "VOID"]).optional(),
```

### Component 4: Client Transactions Seeder

**File**: `scripts/seed/seeders/seed-client-transactions.ts` (new file)

Create client transactions from seeded orders:

```typescript
export async function seedClientTransactions(
  validator: SchemaValidator,
  masker: PIIMasker
): Promise<SeederResult> {
  // Get all seeded orders
  const existingOrders = await db.select().from(orders);
  
  // Create client transaction for each order
  for (const order of existingOrders) {
    await db.insert(clientTransactions).values({
      clientId: order.clientId,
      transactionType: "ORDER",
      transactionNumber: order.orderNumber,
      transactionDate: order.createdAt,
      amount: order.total,
      paymentStatus: order.saleStatus === "PAID" ? "PAID" : "PENDING",
      // ... other fields
    });
  }
  
  // Update client stats
  const clientIds = [...new Set(existingOrders.map(o => o.clientId))];
  for (const clientId of clientIds) {
    await updateClientStats(clientId);
  }
}
```

### Component 5: Vendor Profile Data Queries

**File**: `client/src/pages/VendorProfilePage.tsx`

Add queries for vendor batches and purchase orders:

```typescript
// Add new queries
const { data: vendorBatches } = trpc.inventory.getBatchesByVendor.useQuery(
  { vendorId: Number(id) },
  { enabled: !!id }
);

const { data: vendorPOs } = trpc.purchaseOrders.getByVendor.useQuery(
  { vendorId: Number(id) },
  { enabled: !!id }
);

// Update stats display
<div className="text-2xl font-bold">{vendorBatches?.length ?? 0}</div>
<div className="text-2xl font-bold">{vendorPOs?.length ?? 0}</div>
```

**File**: `server/routers/inventory.ts`

Add endpoint for vendor batches:

```typescript
getBatchesByVendor: protectedProcedure
  .input(z.object({ vendorId: z.number() }))
  .query(async ({ input }) => {
    return await inventoryDb.getBatchesByVendor(input.vendorId);
  }),
```

**File**: `server/inventoryDb.ts`

Add database function:

```typescript
export async function getBatchesByVendor(vendorId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Join batches → lots → filter by vendorId
  return db
    .select({
      batch: batches,
      lot: lots,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(eq(lots.vendorId, vendorId));
}
```

## Data Models

No new tables required. Changes involve:

1. **clientTransactions**: Seeding will populate this existing table
2. **invoices**: No schema change, only API validation change
3. **batches/lots**: No change, just new query patterns

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Paginated Response Extraction Consistency
*For any* paginated API response with structure `{ entityName: T[], total: number }`, the extraction utility SHALL return the array at `response[entityName]`, and for any direct array response, the utility SHALL return the array unchanged.
**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 5.2, 5.3, 5.4, 10.2**

### Property 2: Invoice Status Schema Completeness
*For any* invoice status value that exists in the database schema enum, the API Zod schema SHALL accept that value as valid input.
**Validates: Requirements 1.3, 10.3**

### Property 3: Client Transaction Creation from Orders
*For any* seeded order, there SHALL exist a corresponding clientTransaction record with matching `clientId`, `amount` equal to order `total`, and `transactionType` equal to "ORDER".
**Validates: Requirements 6.1, 9.1**

### Property 4: Client Total Spent Calculation
*For any* client with transactions, the `totalSpent` field SHALL equal the sum of all transaction amounts where `transactionType` is "INVOICE" or "ORDER".
**Validates: Requirements 6.2**

### Property 5: Client Amount Owed Calculation
*For any* client with unpaid transactions, the `totalOwed` field SHALL equal the sum of amounts for transactions where `paymentStatus` is not "PAID".
**Validates: Requirements 6.3**

### Property 6: Vendor Batch Query Completeness
*For any* vendor with lots, the `getBatchesByVendor` query SHALL return all batches where `batch.lotId` references a lot with `lot.vendorId` equal to the vendor's ID.
**Validates: Requirements 7.1, 7.2**

### Property 7: Invoice-Payment Linkage Integrity
*For any* seeded payment linked to an invoice, the invoice's `amountPaid` SHALL increase by the payment amount, and the invoice's `status` SHALL update to "PARTIAL" or "PAID" accordingly.
**Validates: Requirements 9.3**

### Property 8: Status Filter Correctness
*For any* list query with a status filter, all returned items SHALL have a status matching the filter value.
**Validates: Requirements 2.3**

## Error Handling

### API Response Errors
- If API returns undefined, extraction utility returns empty array
- If API returns unexpected structure, extraction utility returns empty array
- Frontend displays "No data" message for empty arrays

### Seeding Errors
- If order has no clientId, skip client transaction creation
- If updateClientStats fails, log error but continue with other clients
- Transaction rollback on batch insert failure

### Query Errors
- Vendor batch query returns empty array if vendor has no lots
- Purchase order query returns empty array if vendor has no POs

## Testing Strategy

### Dual Testing Approach

**Unit Tests**: Verify specific examples and edge cases
- Response extraction with various input shapes
- Client stats calculation with known values
- Vendor batch query with test data

**Property-Based Tests**: Verify universal properties using fast-check
- Property 1: Response extraction consistency
- Property 2: Schema completeness
- Property 3: Client transaction creation
- Property 4-5: Client stats calculations
- Property 6: Vendor batch query
- Property 7: Invoice-payment linkage
- Property 8: Status filter correctness

### Property-Based Testing Library
Use **fast-check** for TypeScript property-based testing.

### Test Annotations
Each property-based test MUST include:
```typescript
// **Feature: data-display-fix, Property 1: Paginated Response Extraction Consistency**
// **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 5.2, 5.3, 5.4, 10.2**
```

### Test File Locations
- `client/src/lib/api-utils.test.ts` - Response extraction tests
- `server/routers/accounting.test.ts` - Schema validation tests
- `scripts/seed/seeders/seed-client-transactions.test.ts` - Seeding tests
- `server/clientsDb.test.ts` - Client stats calculation tests
- `server/inventoryDb.test.ts` - Vendor batch query tests
