# Specification: FEAT-001 - Expose Full Inventory Data API

**Status:** Draft
**Priority:** CRITICAL
**Estimate:** 16h
**Module:** Inventory
**Dependencies:** None
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

The current inventory API endpoints do not expose all the data fields required for the enhanced Sales Sheet and Order Creation workflows. Users need to see Brand/Farmer, COGS, Customer Retail pricing, Units Available, and Days Old in the inventory browser. The backend must be enhanced to return these additional fields efficiently.

**User Quote:**
> "have my inventory view in front of me that has the product name, the brand has the cogs pricing and the customer. Retail pricing as the number of units available days old category"

## 2. User Stories

1. **As a sales representative**, I want to see the complete inventory data (Brand/Farmer, COGS, Retail Price, Units, Days Old) in a single API call, so that I can make informed decisions when building orders.

2. **As a warehouse manager**, I want to quickly assess inventory age and availability, so that I can prioritize older stock for sale.

3. **As an administrator**, I want the inventory API to return pricing data based on client-specific rules, so that sales reps see accurate customer-facing prices.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | API must return `brandName` (or `farmerName` for flower category) for each inventory item | Must Have |
| FR-02 | API must return `unitCogs` (COGS per unit) from the batch record | Must Have |
| FR-03 | API must return `customerRetailPrice` calculated via pricing engine for the specified client | Must Have |
| FR-04 | API must return `unitsAvailable` (onHandQty - reservedQty - holdQty) | Must Have |
| FR-05 | API must return `daysOld` calculated from batch `createdAt` date | Must Have |
| FR-06 | API must return `category` and `subcategory` for filtering | Must Have |
| FR-07 | API must support optional `clientId` parameter for client-specific pricing | Should Have |
| FR-08 | API must support pagination with configurable page size | Must Have |
| FR-09 | API must support filtering by category, status, and availability | Should Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | `unitsAvailable` must never be negative; floor at 0 | onHand=10, reserved=15 → available=0 |
| BR-02 | `daysOld` calculated as difference from batch creation to current date | Created 2026-01-01, Today 2026-01-12 → 11 days |
| BR-03 | `customerRetailPrice` uses client's pricing profile if `clientId` provided | Client with 20% markup profile → basePrice * 1.20 |
| BR-04 | Only LIVE and PHOTOGRAPHY_COMPLETE batches returned by default | AWAITING_INTAKE excluded unless explicitly requested |
| BR-05 | For flower category, return "Farmer" label; for all others, return "Brand" | Flower → farmerName, Concentrate → brandName |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- No schema changes required
-- All required data exists in existing tables:
-- - batches: onHandQty, reservedQty, holdQty, unitCogs, createdAt, batchStatus
-- - products: category, subcategory, nameCanonical
-- - brands: name (brand/farmer name)
-- - lots: date (intake date)
```

### 4.2 API Contracts

**File:** `/home/user/TERP/server/routers/inventory.ts`

```typescript
// New enhanced inventory list endpoint
inventory.listEnhanced = protectedProcedure
  .use(requirePermission("inventory:read"))
  .input(z.object({
    clientId: z.number().optional(), // For client-specific pricing
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(50),
    filters: z.object({
      category: z.string().optional(),
      subcategory: z.string().optional(),
      status: z.array(z.enum([
        "LIVE",
        "PHOTOGRAPHY_COMPLETE",
        "AWAITING_INTAKE",
        "ON_HOLD",
        "QUARANTINED"
      ])).optional(),
      minAvailability: z.number().optional(),
      brandId: z.number().optional(),
      search: z.string().optional(),
    }).optional(),
    sortBy: z.enum([
      "daysOld",
      "unitsAvailable",
      "customerRetailPrice",
      "productName"
    ]).default("daysOld"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }))
  .output(z.object({
    items: z.array(z.object({
      // Batch identifiers
      batchId: z.number(),
      batchCode: z.string(),
      sku: z.string(),

      // Product info
      productId: z.number(),
      productName: z.string(),
      category: z.string(),
      subcategory: z.string().nullable(),

      // Brand/Farmer (contextual label)
      brandId: z.number(),
      brandName: z.string(),
      labelType: z.enum(["Brand", "Farmer"]), // UI hint

      // Pricing
      unitCogs: z.number(),
      cogsMode: z.enum(["FIXED", "RANGE"]),
      unitCogsMin: z.number().nullable(),
      unitCogsMax: z.number().nullable(),
      customerRetailPrice: z.number(), // Calculated per client
      priceRulesApplied: z.array(z.string()), // Names of applied rules

      // Availability
      onHandQty: z.number(),
      reservedQty: z.number(),
      holdQty: z.number(),
      unitsAvailable: z.number(),

      // Age
      createdAt: z.string(), // ISO date
      daysOld: z.number(),

      // Status
      batchStatus: z.string(),
      grade: z.string().nullable(),
    })),
    pagination: z.object({
      page: z.number(),
      pageSize: z.number(),
      totalItems: z.number(),
      totalPages: z.number(),
    }),
  }))
  .query(async ({ input, ctx }) => {
    // Implementation calls inventoryDb.getEnhancedInventoryList()
  });
```

**File:** `/home/user/TERP/server/inventoryDb.ts`

```typescript
// Add new function for enhanced inventory query
export interface EnhancedInventoryItem {
  batchId: number;
  batchCode: string;
  sku: string;
  productId: number;
  productName: string;
  category: string;
  subcategory: string | null;
  brandId: number;
  brandName: string;
  labelType: "Brand" | "Farmer";
  unitCogs: number;
  cogsMode: "FIXED" | "RANGE";
  unitCogsMin: number | null;
  unitCogsMax: number | null;
  customerRetailPrice: number;
  priceRulesApplied: string[];
  onHandQty: number;
  reservedQty: number;
  holdQty: number;
  unitsAvailable: number;
  createdAt: Date;
  daysOld: number;
  batchStatus: string;
  grade: string | null;
}

export async function getEnhancedInventoryList(params: {
  clientId?: number;
  page: number;
  pageSize: number;
  filters?: {
    category?: string;
    subcategory?: string;
    status?: string[];
    minAvailability?: number;
    brandId?: number;
    search?: string;
  };
  sortBy: string;
  sortOrder: "asc" | "desc";
}): Promise<{ items: EnhancedInventoryItem[]; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Build query joining batches, products, brands
  // Calculate unitsAvailable = onHandQty - reservedQty - holdQty
  // Calculate daysOld = DATEDIFF(NOW(), createdAt)
  // Apply pricing engine for customerRetailPrice if clientId provided
  // ...implementation
}
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Pricing Engine | Read | Calculate customerRetailPrice based on client pricing profile |
| Products | Read | Join for product name, category, subcategory |
| Brands | Read | Join for brand/farmer name |
| Batches | Read | Primary data source for inventory quantities and COGS |
| Clients | Read | Fetch client pricing profile for personalized pricing |

## 5. UI/UX Specification

### 5.1 User Flow

```
[Sales Rep opens Sales Sheet]
    → [API fetches enhanced inventory with clientId]
    → [Table displays: Product, Brand/Farmer, COGS, Retail, Available, Days Old]
    → [User can sort by any column]
    → [User can filter by category]
```

### 5.2 Wireframe Description

Not applicable - this is a backend API spec. See ENH-001 for frontend implementation.

### 5.3 Acceptance Criteria (API)

- [ ] `GET /api/trpc/inventory.listEnhanced` returns all required fields
- [ ] Response includes `brandName` with correct `labelType` based on category
- [ ] `unitsAvailable` correctly calculated as `onHandQty - reservedQty - holdQty`
- [ ] `daysOld` correctly calculated from `createdAt` to current date
- [ ] `customerRetailPrice` calculated using pricing engine when `clientId` provided
- [ ] Default price returned when no `clientId` provided
- [ ] Pagination works correctly (page, pageSize, totalItems, totalPages)
- [ ] Filters correctly narrow results (category, status, availability)
- [ ] Sorting works on all sortable fields
- [ ] Response time < 500ms for 50 items with all joins

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Batch with no brand | Return "Unknown" as brandName |
| Client with no pricing profile | Use default base price (COGS * 1.30) |
| All inventory reserved | Return unitsAvailable = 0, not negative |
| Very old batch (>365 days) | No special handling, return actual daysOld |
| Invalid clientId | Return 404 error: "Client not found" |
| Empty inventory | Return empty items array with pagination showing totalItems = 0 |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] `getEnhancedInventoryList` returns correct shape
- [ ] `unitsAvailable` calculation is correct for various quantity combinations
- [ ] `daysOld` calculation handles timezone correctly
- [ ] `labelType` correctly determined by product category
- [ ] Filters applied correctly to query

### 7.2 Integration Tests

- [ ] Full query with joins executes successfully
- [ ] Pricing engine integration returns correct customerRetailPrice
- [ ] Client pricing profile applied correctly
- [ ] Pagination returns correct slices of data

### 7.3 E2E Tests

- [ ] API endpoint accessible with valid auth token
- [ ] Response matches expected schema
- [ ] Performance benchmark: 50 items < 500ms

## 8. Migration & Rollout

### 8.1 Data Migration

No migration required. Uses existing data.

### 8.2 Feature Flag

`FEATURE_ENHANCED_INVENTORY_API` - Enable gradually for testing.

### 8.3 Rollback Plan

1. Disable feature flag
2. Frontend falls back to existing `inventory.list` endpoint
3. No data changes to rollback

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| API Response Time | < 500ms p95 | APM monitoring |
| Cache Hit Rate | > 80% | Redis metrics |
| Error Rate | < 0.1% | Error logging |

## 10. Open Questions

- [x] Should COGS display mode differ for RANGE vs FIXED? **Show min-max range for RANGE mode**
- [ ] Should we cache pricing calculations? **Recommend: Yes, with 5-minute TTL per client**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
