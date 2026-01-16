# Specification: FEAT-003 - In-line Product Creation API

**Status:** Draft
**Priority:** HIGH
**Estimate:** 24h
**Module:** Products / Purchase Orders
**Dependencies:** None
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

Currently, when a user is creating a Purchase Order and encounters a new product that doesn't exist in the system, they must navigate away from the PO workflow to create the product separately, then return to add it to the PO. This breaks the user flow and causes friction. Users need the ability to create a new product and SKU directly within the Purchase Order workflow.

**User Quote:**
> "skew product creation process should be happening here. You shouldn't have to go somewhere else to create a product and then add it to an intake process."

## 2. User Stories

1. **As a purchasing manager**, I want to create a new product while building a Purchase Order, so that I don't have to leave the PO workflow.

2. **As a warehouse staff member**, I want to quickly add new products during intake, so that I can process vendor deliveries efficiently.

3. **As an administrator**, I want all in-line created products to follow the same validation rules as regular product creation, so that data quality is maintained.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | API must accept product creation data within PO line item context | Must Have |
| FR-02 | API must auto-generate SKU following naming convention | Must Have |
| FR-03 | API must validate all required product fields | Must Have |
| FR-04 | API must create brand if not exists (with vendor link) | Should Have |
| FR-05 | API must return created product ID for immediate use in PO | Must Have |
| FR-06 | API must support strain lookup/creation for flower products | Should Have |
| FR-07 | API must support batch creation with initial COGS | Must Have |
| FR-08 | Transaction must be atomic (product + batch created together) | Must Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | SKU format: {BRAND_CODE}-{STRAIN/PRODUCT}-{CATEGORY}-{SEQ} | ABC-BLUEDREAM-FLW-001 |
| BR-02 | Brand code derived from first 3 chars of brand name | "Blue River" → "BLU" |
| BR-03 | If brand doesn't exist, create and link to vendor | New brand "Blue River" → brandId linked to vendorId |
| BR-04 | Strain must be validated against strain library if provided | Unknown strain creates new entry |
| BR-05 | Initial batch created in AWAITING_INTAKE status | Can be moved to LIVE after QC |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- No schema changes required
-- Uses existing tables:
-- - products: new product record
-- - brands: new or existing brand
-- - strains: strain lookup/creation
-- - batches: initial batch record
-- - lots: lot reference
-- - purchase_order_items: link to PO
```

### 4.2 API Contracts

**File:** `/home/user/TERP/server/routers/products.ts`

```typescript
// In-line product creation with batch
products.createInline = protectedProcedure
  .use(requirePermission("products:create"))
  .input(z.object({
    // Product definition
    product: z.object({
      nameCanonical: z.string().min(1).max(500),
      category: z.string().min(1),
      subcategory: z.string().optional(),
      description: z.string().optional(),
      uomSellable: z.string().default("EA"),
    }),

    // Brand (existing or new)
    brand: z.union([
      z.object({ type: z.literal("existing"), brandId: z.number() }),
      z.object({
        type: z.literal("new"),
        name: z.string().min(1),
        vendorClientId: z.number().optional(), // Link to vendor if known
      }),
    ]),

    // Strain (for flower products)
    strain: z.union([
      z.object({ type: z.literal("existing"), strainId: z.number() }),
      z.object({
        type: z.literal("new"),
        name: z.string().min(1),
        category: z.enum(["Indica", "Sativa", "Hybrid"]).optional(),
      }),
      z.object({ type: z.literal("none") }),
    ]).optional(),

    // Initial batch (optional, for immediate intake)
    initialBatch: z.object({
      lotId: z.number().optional(), // Existing lot or create new
      quantity: z.number().positive(),
      cogsMode: z.enum(["FIXED", "RANGE"]),
      unitCogs: z.number().optional(), // Required for FIXED
      unitCogsMin: z.number().optional(), // Required for RANGE
      unitCogsMax: z.number().optional(), // Required for RANGE
      paymentTerms: z.enum(["COD", "NET_7", "NET_15", "NET_30", "CONSIGNMENT", "PARTIAL"]),
      grade: z.string().optional(),
    }).optional(),

    // Purchase Order context (for linking)
    purchaseOrderId: z.number().optional(),
  }))
  .output(z.object({
    productId: z.number(),
    sku: z.string(),
    brandId: z.number(),
    brandName: z.string(),
    strainId: z.number().nullable(),
    batchId: z.number().nullable(),
    batchCode: z.string().nullable(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Implementation in productsDb.createProductInline()
    // Uses transaction for atomicity
  });
```

**File:** `/home/user/TERP/server/productsDb.ts` (additions)

```typescript
import { getDb, withTransaction } from "./db";
import { generateSku, generateBatchCode, generateLotCode } from "./sequenceDb";

export interface InlineProductInput {
  product: {
    nameCanonical: string;
    category: string;
    subcategory?: string;
    description?: string;
    uomSellable: string;
  };
  brand: { type: "existing"; brandId: number } | { type: "new"; name: string; vendorClientId?: number };
  strain?: { type: "existing"; strainId: number } | { type: "new"; name: string; category?: string } | { type: "none" };
  initialBatch?: {
    lotId?: number;
    quantity: number;
    cogsMode: "FIXED" | "RANGE";
    unitCogs?: number;
    unitCogsMin?: number;
    unitCogsMax?: number;
    paymentTerms: string;
    grade?: string;
  };
  purchaseOrderId?: number;
  createdBy: number;
}

export interface InlineProductResult {
  productId: number;
  sku: string;
  brandId: number;
  brandName: string;
  strainId: number | null;
  batchId: number | null;
  batchCode: string | null;
}

export async function createProductInline(input: InlineProductInput): Promise<InlineProductResult> {
  return await withTransaction(async (tx) => {
    // 1. Resolve or create brand
    let brandId: number;
    let brandName: string;

    if (input.brand.type === "existing") {
      const brand = await tx.select().from(brands).where(eq(brands.id, input.brand.brandId)).limit(1);
      if (!brand[0]) throw new Error("Brand not found");
      brandId = brand[0].id;
      brandName = brand[0].name;
    } else {
      // Create new brand
      const result = await tx.insert(brands).values({
        name: input.brand.name,
        vendorId: input.brand.vendorClientId,
      });
      brandId = Number(result[0].insertId);
      brandName = input.brand.name;
    }

    // 2. Resolve or create strain (if applicable)
    let strainId: number | null = null;

    if (input.strain) {
      if (input.strain.type === "existing") {
        strainId = input.strain.strainId;
      } else if (input.strain.type === "new") {
        const result = await tx.insert(strains).values({
          name: input.strain.name,
          standardizedName: input.strain.name.toLowerCase().replace(/\s+/g, "-"),
          category: input.strain.category,
        });
        strainId = Number(result[0].insertId);
      }
    }

    // 3. Generate SKU
    const sku = await generateSku(brandName, input.product.nameCanonical, input.product.category);

    // 4. Create product
    const productResult = await tx.insert(products).values({
      brandId,
      strainId,
      nameCanonical: input.product.nameCanonical,
      category: input.product.category,
      subcategory: input.product.subcategory,
      description: input.product.description,
      uomSellable: input.product.uomSellable,
    });
    const productId = Number(productResult[0].insertId);

    // 5. Create initial batch if requested
    let batchId: number | null = null;
    let batchCode: string | null = null;

    if (input.initialBatch) {
      batchCode = await generateBatchCode();

      const batchResult = await tx.insert(batches).values({
        code: batchCode,
        sku,
        productId,
        lotId: input.initialBatch.lotId || await createDefaultLot(tx, input.createdBy),
        batchStatus: "AWAITING_INTAKE",
        cogsMode: input.initialBatch.cogsMode,
        unitCogs: input.initialBatch.unitCogs?.toString(),
        unitCogsMin: input.initialBatch.unitCogsMin?.toString(),
        unitCogsMax: input.initialBatch.unitCogsMax?.toString(),
        paymentTerms: input.initialBatch.paymentTerms,
        onHandQty: input.initialBatch.quantity.toString(),
        grade: input.initialBatch.grade,
      });
      batchId = Number(batchResult[0].insertId);
    }

    return {
      productId,
      sku,
      brandId,
      brandName,
      strainId,
      batchId,
      batchCode,
    };
  });
}
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Products | Write | Create new product record |
| Brands | Read/Write | Lookup or create brand |
| Strains | Read/Write | Lookup or create strain |
| Batches | Write | Create initial batch |
| Lots | Read/Write | Link to existing or create lot |
| Sequences | Read/Write | Generate SKU, batch code |
| Purchase Orders | Write | Link to PO if context provided |

## 5. UI/UX Specification

### 5.1 User Flow

```
[User adds line item to PO]
    → [Product search returns no results]
    → [User clicks "Create New Product"]
    → [Inline modal opens with product form]
    → [User fills: Name, Category, Brand (dropdown + "Add New"), COGS]
    → [User clicks "Create & Add"]
    → [Product created, batch created, line item added to PO]
    → [Modal closes, PO updated]
```

### 5.2 Wireframe Description

Not applicable - this is a backend API spec. See ENH-003 for frontend implementation.

### 5.3 Acceptance Criteria (API)

- [ ] `POST /api/trpc/products.createInline` creates product atomically
- [ ] SKU generated following naming convention
- [ ] Brand created if "new" type specified
- [ ] Strain created if "new" type specified for flower category
- [ ] Batch created with correct COGS mode and values
- [ ] Transaction rolls back on any failure
- [ ] Created product ID returned for immediate use

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Duplicate product name | Allow (differentiated by brand/SKU) |
| Invalid category | Return 400 error: "Invalid category" |
| COGS mode mismatch (FIXED without unitCogs) | Return 400 error: "unitCogs required for FIXED mode" |
| Brand creation fails | Roll back entire transaction |
| Network timeout during creation | Transaction rolled back, retry safe |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] SKU generation follows naming convention
- [ ] Brand creation correctly links to vendor
- [ ] Strain creation normalizes name correctly
- [ ] COGS mode validation works correctly

### 7.2 Integration Tests

- [ ] Full inline creation with all components
- [ ] Transaction rollback on failure
- [ ] Batch correctly linked to product and lot

### 7.3 E2E Tests

- [ ] API endpoint accessible with valid auth
- [ ] Created product appears in product list
- [ ] Created batch appears in inventory

## 8. Migration & Rollout

### 8.1 Data Migration

No migration required.

### 8.2 Feature Flag

`FEATURE_INLINE_PRODUCT_CREATION` - Enable for testing.

### 8.3 Rollback Plan

1. Disable feature flag
2. "Create New Product" button hidden in PO form
3. Users directed to standard product creation flow

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Inline creation success rate | > 99% | Transaction logging |
| Time to create product | < 2s | APM monitoring |
| User adoption | 50% of new products created inline | Analytics |

## 10. Open Questions

- [x] Should we auto-create lot if not provided? **Yes, create default lot**
- [ ] Should we support bulk inline creation? **Future enhancement**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
