# Specification: FEAT-002 - Vendor Context API

**Status:** Draft
**Priority:** HIGH
**Estimate:** 20h
**Module:** Clients / Vendors
**Dependencies:** None
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

When a sales rep selects a client/vendor during the Purchase Order or Sales workflow, they need immediate access to that vendor's historical context including past products supplied, sales performance of those products, and historical sell-through rates. Currently, this data is scattered across multiple API calls and not easily accessible in context.

**User Quote:**
> "select a client, their information should come up in terms of previous. purchases from them, sales history for their inventory... historical sell through of the spender's product."

## 2. User Stories

1. **As a sales representative**, I want to see a vendor's historical product supply when I select them, so that I can reference past transactions.

2. **As a purchasing manager**, I want to see sell-through rates for each vendor's products, so that I can make informed buying decisions.

3. **As a sales rep**, I want to see the sales performance of a vendor's inventory, so that I can prioritize high-performing vendors.

4. **As an administrator**, I want to see vendor supply history consolidated in one view, so that I can assess vendor relationships.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | API must return vendor's historical product list with supply dates | Must Have |
| FR-02 | API must return sales performance metrics per product (units sold, revenue) | Must Have |
| FR-03 | API must return sell-through rate per product (sold / supplied) | Must Have |
| FR-04 | API must return total business metrics (total supplied, total sold, total revenue) | Must Have |
| FR-05 | API must support date range filtering for historical data | Should Have |
| FR-06 | API must return average days-to-sell per product | Should Have |
| FR-07 | API must return vendor payment history summary | Should Have |
| FR-08 | API must return current active inventory from this vendor | Must Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Sell-through rate = (Units Sold / Units Supplied) * 100 | 80 sold / 100 supplied = 80% |
| BR-02 | Only completed sales count toward sell-through | Cancelled orders excluded |
| BR-03 | Days-to-sell calculated from batch creation to sale date | Created Jan 1, Sold Jan 10 = 9 days avg |
| BR-04 | Historical data defaults to last 12 months | Can be extended via dateRange param |
| BR-05 | Vendor identified by `clients.isSeller=true` with supplier profile | Uses unified client model |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- No schema changes required
-- Query aggregates from existing tables:
-- - lots: vendor supply events (via supplierClientId)
-- - batches: individual products supplied
-- - sales: sale transactions linked to batches
-- - clients: vendor information (isSeller=true)
-- - supplier_profiles: vendor-specific data
```

### 4.2 API Contracts

**File:** `/home/user/TERP/server/routers/vendors.ts`

```typescript
// Vendor Context API - comprehensive vendor history
vendors.getContext = protectedProcedure
  .use(requirePermission("vendors:read"))
  .input(z.object({
    clientId: z.number(), // Vendor's client ID (isSeller=true)
    dateRange: z.object({
      startDate: z.string().optional(), // ISO date
      endDate: z.string().optional(), // ISO date
    }).optional(),
    includeActiveInventory: z.boolean().default(true),
    includePaymentHistory: z.boolean().default(true),
  }))
  .output(z.object({
    vendor: z.object({
      clientId: z.number(),
      name: z.string(),
      contactName: z.string().nullable(),
      contactEmail: z.string().nullable(),
      contactPhone: z.string().nullable(),
      paymentTerms: z.string().nullable(),
      totalLifetimeValue: z.number(), // Total revenue from this vendor's products
      relationshipStartDate: z.string(), // First lot date
    }),

    supplyHistory: z.array(z.object({
      lotId: z.number(),
      lotCode: z.string(),
      supplyDate: z.string(),
      products: z.array(z.object({
        productId: z.number(),
        productName: z.string(),
        category: z.string(),
        batchCode: z.string(),
        quantitySupplied: z.number(),
        unitCogs: z.number(),
        totalCogs: z.number(),
      })),
      totalValue: z.number(),
    })),

    productPerformance: z.array(z.object({
      productId: z.number(),
      productName: z.string(),
      category: z.string(),

      // Supply metrics
      totalSupplied: z.number(),
      totalBatches: z.number(),
      avgSupplyQuantity: z.number(),
      lastSupplyDate: z.string().nullable(),

      // Sales metrics
      totalSold: z.number(),
      totalRevenue: z.number(),
      avgSalePrice: z.number(),

      // Performance metrics
      sellThroughRate: z.number(), // Percentage
      avgDaysToSell: z.number().nullable(),
      currentAvailable: z.number(),
    })),

    aggregateMetrics: z.object({
      totalLotsReceived: z.number(),
      totalUnitsSupplied: z.number(),
      totalCostOfGoods: z.number(),
      totalUnitsSold: z.number(),
      totalRevenue: z.number(),
      totalProfit: z.number(),
      overallSellThroughRate: z.number(),
      avgDaysToSell: z.number().nullable(),
    }),

    activeInventory: z.array(z.object({
      batchId: z.number(),
      batchCode: z.string(),
      productName: z.string(),
      category: z.string(),
      unitsAvailable: z.number(),
      daysOld: z.number(),
      unitCogs: z.number(),
    })).optional(),

    paymentHistory: z.array(z.object({
      paymentId: z.number(),
      paymentDate: z.string(),
      amount: z.number(),
      paymentMethod: z.string(),
      referenceNumber: z.string().nullable(),
      relatedLotCodes: z.array(z.string()),
    })).optional(),
  }))
  .query(async ({ input, ctx }) => {
    // Implementation calls vendorContextDb.getVendorContext()
  });
```

**File:** `/home/user/TERP/server/vendorContextDb.ts` (new file)

```typescript
import { getDb } from "./db";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import {
  clients,
  supplierProfiles,
  lots,
  batches,
  products,
  sales,
  payments,
} from "../drizzle/schema";

export interface VendorContext {
  vendor: VendorInfo;
  supplyHistory: SupplyHistoryEntry[];
  productPerformance: ProductPerformanceEntry[];
  aggregateMetrics: AggregateMetrics;
  activeInventory?: ActiveInventoryEntry[];
  paymentHistory?: PaymentHistoryEntry[];
}

export async function getVendorContext(params: {
  clientId: number;
  startDate?: Date;
  endDate?: Date;
  includeActiveInventory: boolean;
  includePaymentHistory: boolean;
}): Promise<VendorContext> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Get vendor info from clients + supplier_profiles
  const vendorInfo = await getVendorInfo(db, params.clientId);

  // 2. Get supply history (lots with batches)
  const supplyHistory = await getSupplyHistory(db, params.clientId, params.startDate, params.endDate);

  // 3. Calculate product performance metrics
  const productPerformance = await getProductPerformance(db, params.clientId, params.startDate, params.endDate);

  // 4. Calculate aggregate metrics
  const aggregateMetrics = calculateAggregateMetrics(productPerformance);

  // 5. Get active inventory if requested
  const activeInventory = params.includeActiveInventory
    ? await getActiveInventory(db, params.clientId)
    : undefined;

  // 6. Get payment history if requested
  const paymentHistory = params.includePaymentHistory
    ? await getPaymentHistory(db, params.clientId, params.startDate, params.endDate)
    : undefined;

  return {
    vendor: vendorInfo,
    supplyHistory,
    productPerformance,
    aggregateMetrics,
    activeInventory,
    paymentHistory,
  };
}

// Helper functions implementation...
async function getVendorInfo(db: any, clientId: number): Promise<VendorInfo> {
  // Join clients with supplier_profiles
  // Calculate totalLifetimeValue and relationshipStartDate
}

async function getSupplyHistory(
  db: any,
  clientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<SupplyHistoryEntry[]> {
  // Query lots with batches for this supplier
  // Group by lot, include product details
}

async function getProductPerformance(
  db: any,
  clientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ProductPerformanceEntry[]> {
  // Aggregate supply and sales data per product
  // Calculate sell-through rate and avg days to sell
}

async function getActiveInventory(db: any, clientId: number): Promise<ActiveInventoryEntry[]> {
  // Get batches with available qty from this vendor's lots
}

async function getPaymentHistory(
  db: any,
  clientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<PaymentHistoryEntry[]> {
  // Get payments made to this vendor
}
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Clients | Read | Vendor info (isSeller=true clients) |
| Supplier Profiles | Read | Vendor-specific data (payment terms, etc.) |
| Lots | Read | Supply events linked to vendor |
| Batches | Read | Individual products in each lot |
| Sales | Read | Sales data for performance metrics |
| Payments | Read | Payment history to vendor |
| Products | Read | Product names and categories |

## 5. UI/UX Specification

### 5.1 User Flow

```
[User selects vendor in PO form]
    → [API fetches vendor context]
    → [Vendor Info Pod displays with tabs:]
        → [History Tab: Supply timeline]
        → [Performance Tab: Product metrics]
        → [Inventory Tab: Current stock]
        → [Payments Tab: Payment history]
```

### 5.2 Wireframe Description

Not applicable - this is a backend API spec. See ENH-002 for frontend implementation.

### 5.3 Acceptance Criteria (API)

- [ ] `GET /api/trpc/vendors.getContext` returns complete vendor context
- [ ] Supply history includes all lots from this vendor with product details
- [ ] Product performance includes accurate sell-through rates
- [ ] Sell-through rate calculated correctly: (sold / supplied) * 100
- [ ] Date range filtering works correctly
- [ ] Active inventory shows only LIVE batches with available quantity
- [ ] Payment history correctly linked to vendor
- [ ] Response time < 1s for vendors with 100+ lots

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Vendor with no supply history | Return empty supplyHistory array, zero metrics |
| Vendor with no sales | Return 0% sell-through rate |
| Product never sold | avgDaysToSell = null |
| Invalid clientId | Return 404 error: "Vendor not found" |
| Client is not a vendor (isSeller=false) | Return 400 error: "Client is not a vendor" |
| Date range with no data | Return empty arrays, zero metrics |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Sell-through rate calculation is correct
- [ ] Days-to-sell calculation handles null cases
- [ ] Date range filtering applies correctly
- [ ] Aggregate metrics sum correctly

### 7.2 Integration Tests

- [ ] Full context query with all joins executes successfully
- [ ] Performance acceptable with large datasets
- [ ] Optional fields excluded when not requested

### 7.3 E2E Tests

- [ ] API endpoint accessible with valid auth
- [ ] Response matches expected schema
- [ ] Real vendor data returns expected results

## 8. Migration & Rollout

### 8.1 Data Migration

No migration required. Uses existing data with new aggregation queries.

### 8.2 Feature Flag

`FEATURE_VENDOR_CONTEXT_API` - Enable for testing.

### 8.3 Rollback Plan

1. Disable feature flag
2. Frontend hides vendor context panel
3. No data changes to rollback

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| API Response Time | < 1s p95 | APM monitoring |
| Query Efficiency | < 10 queries per request | Query logging |
| Error Rate | < 0.1% | Error logging |

## 10. Open Questions

- [ ] Should we cache vendor context? **Recommend: Yes, 5-minute TTL**
- [ ] Should we include vendor notes in context? **Consider for future enhancement**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
