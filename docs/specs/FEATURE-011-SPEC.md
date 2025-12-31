# Specification: FEATURE-011 - Unified Product Catalogue

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 80-120h (3-4 weeks)  
**Module:** Products (Core)  
**Dependencies:** None (Foundation for other features)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The current product/inventory structure is fragmented, making it difficult to:
- Maintain a consistent product catalog
- Track the same product across multiple batches
- Generate meaningful reports
- Support future features (VIP Portal, Live Shopping, etc.)

A unified product catalogue will serve as the **single source of truth** for all product information, with batches representing specific inventory instances.

## 2. User Stories

1. **As a manager**, I want a centralized product catalog, so that product information is consistent across the system.

2. **As a staff member**, I want to select from existing products when creating batches, so that I don't have to re-enter product details.

3. **As a buyer**, I want to see all batches of a specific product, so that I can compare options.

4. **As a developer**, I want a clean product/batch separation, so that I can build features on a solid foundation.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Product master catalog (name, category, attributes) | Must Have |
| FR-02 | Batch = instance of product (quantity, location, price) | Must Have |
| FR-03 | Product search and filtering | Must Have |
| FR-04 | Product attributes (strain, type, THC%, etc.) | Must Have |
| FR-05 | Product images linked at product level | Must Have |
| FR-06 | Batch inherits product attributes | Must Have |
| FR-07 | Product merge (combine duplicates) | Should Have |
| FR-08 | Product variants (sizes, packaging) | Should Have |
| FR-09 | Product history (all batches ever) | Should Have |
| FR-10 | Product templates for quick batch creation | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model

```sql
-- Product master table
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  category_id INT REFERENCES categories(id),
  
  -- Attributes
  strain VARCHAR(255),
  strain_type ENUM('INDICA', 'SATIVA', 'HYBRID', 'CBD', 'OTHER'),
  thc_percent DECIMAL(5,2),
  cbd_percent DECIMAL(5,2),
  terpene_profile JSON,
  
  -- Pricing defaults
  default_unit VARCHAR(20) DEFAULT 'oz',
  default_price_per_unit DECIMAL(10,2),
  
  -- Metadata
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  
  INDEX idx_category (category_id),
  INDEX idx_strain (strain),
  FULLTEXT idx_search (name, strain, description)
);

-- Batches reference products
ALTER TABLE batches ADD COLUMN product_id INT REFERENCES products(id);
ALTER TABLE batches ADD COLUMN batch_number VARCHAR(50) UNIQUE;
ALTER TABLE batches ADD COLUMN vendor_id INT REFERENCES vendors(id);
ALTER TABLE batches ADD COLUMN intake_date DATE;
ALTER TABLE batches ADD COLUMN expiration_date DATE;
ALTER TABLE batches ADD COLUMN cost_per_unit DECIMAL(10,2);
ALTER TABLE batches ADD COLUMN sell_price_per_unit DECIMAL(10,2);
ALTER TABLE batches ADD COLUMN status ENUM('AVAILABLE', 'RESERVED', 'SOLD', 'EXPIRED', 'DISPOSED') DEFAULT 'AVAILABLE';

-- Product photos at product level
ALTER TABLE product_photos ADD CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id);

-- Categories hierarchy
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  parent_id INT REFERENCES categories(id),
  slug VARCHAR(100) UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  INDEX idx_parent (parent_id)
);
```

### 4.2 API Contracts

```typescript
// Product CRUD
products.create = adminProcedure
  .input(z.object({
    name: z.string().min(1).max(255),
    categoryId: z.number().optional(),
    strain: z.string().optional(),
    strainType: z.enum(['INDICA', 'SATIVA', 'HYBRID', 'CBD', 'OTHER']).optional(),
    thcPercent: z.number().min(0).max(100).optional(),
    cbdPercent: z.number().min(0).max(100).optional(),
    defaultUnit: z.string().default('oz'),
    defaultPricePerUnit: z.number().optional(),
    description: z.string().optional()
  }))
  .output(z.object({
    productId: z.number(),
    slug: z.string()
  }))
  .mutation(async ({ input, ctx }) => {});

products.list = publicProcedure
  .input(z.object({
    categoryId: z.number().optional(),
    strainType: z.string().optional(),
    search: z.string().optional(),
    hasInventory: z.boolean().optional(),
    page: z.number().default(1),
    pageSize: z.number().default(50)
  }))
  .output(z.object({
    products: z.array(z.object({
      id: z.number(),
      name: z.string(),
      categoryName: z.string(),
      strain: z.string().nullable(),
      strainType: z.string().nullable(),
      primaryPhotoUrl: z.string().nullable(),
      totalQuantity: z.number(),
      batchCount: z.number(),
      priceRange: z.object({
        min: z.number(),
        max: z.number()
      }).nullable()
    })),
    total: z.number(),
    page: z.number(),
    pageSize: z.number()
  }))
  .query(async ({ input }) => {});

products.getById = publicProcedure
  .input(z.object({ productId: z.number() }))
  .output(z.object({
    id: z.number(),
    name: z.string(),
    category: z.object({ id: z.number(), name: z.string() }).nullable(),
    strain: z.string().nullable(),
    strainType: z.string().nullable(),
    thcPercent: z.number().nullable(),
    cbdPercent: z.number().nullable(),
    description: z.string().nullable(),
    photos: z.array(z.object({
      id: z.number(),
      url: z.string(),
      isPrimary: z.boolean()
    })),
    batches: z.array(z.object({
      id: z.number(),
      batchNumber: z.string(),
      quantity: z.number(),
      unit: z.string(),
      pricePerUnit: z.number(),
      vendorName: z.string().nullable(),
      intakeDate: z.date()
    })),
    stats: z.object({
      totalSold: z.number(),
      totalRevenue: z.number(),
      avgPrice: z.number()
    })
  }))
  .query(async ({ input }) => {});

// Batch creation now references product
batches.create = adminProcedure
  .input(z.object({
    productId: z.number(),
    quantity: z.number().positive(),
    unit: z.string(),
    vendorId: z.number().optional(),
    costPerUnit: z.number().optional(),
    sellPricePerUnit: z.number(),
    locationId: z.number().optional(),
    intakeDate: z.date().optional(),
    expirationDate: z.date().optional(),
    notes: z.string().optional()
  }))
  .output(z.object({
    batchId: z.number(),
    batchNumber: z.string()
  }))
  .mutation(async ({ input, ctx }) => {});

// Product merge (combine duplicates)
products.merge = adminProcedure
  .input(z.object({
    sourceProductIds: z.array(z.number()).min(1),
    targetProductId: z.number()
  }))
  .output(z.object({
    success: z.boolean(),
    batchesMoved: z.number()
  }))
  .mutation(async ({ input }) => {
    // Move all batches from source products to target
    // Merge photos
    // Deactivate source products
  });
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Batches | Read/Write | Batches reference products |
| Photos | Read/Write | Photos linked to products |
| Orders | Read | Order items reference batches→products |
| VIP Portal | Read | Display product catalog |
| Reports | Read | Product-level reporting |
| Search | Read | Full-text product search |

## 5. UI/UX Specification

### 5.1 Wireframe: Product Catalog

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Product Catalog                           [+ New Product]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search: [____________________] Category: [All ▼] Type: [All ▼]│
│  ☑ Show only in-stock                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📷 Blue Dream                                       │   │
│  │    Hybrid | THC: 22% | 3 batches | 75 oz available │   │
│  │    Price: $90-110/oz                               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📷 OG Kush                                          │   │
│  │    Indica | THC: 25% | 2 batches | 50 oz available │   │
│  │    Price: $100-120/oz                              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📷 Sour Diesel                                      │   │
│  │    Sativa | THC: 20% | 1 batch | 30 oz available   │   │
│  │    Price: $95/oz                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Wireframe: Product Detail

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Catalog                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  Blue Dream                        [Edit]      │
│  │         │  ─────────────────────────────────────────     │
│  │   📷    │  Category: Flower | Type: Hybrid              │
│  │         │  THC: 22% | CBD: 0.5%                         │
│  └─────────┘                                                │
│                                                             │
│  Description:                                               │
│  A classic strain known for balanced effects...            │
│                                                             │
│  📊 Stats                                                   │
│  ─────────────────────────────────────────                  │
│  Total Sold: 500 oz | Revenue: $50,000 | Avg Price: $100   │
│                                                             │
│  📦 Available Batches                        [+ New Batch]  │
│  ─────────────────────────────────────────                  │
│  │ Batch      │ Qty  │ Price  │ Vendor    │ Intake    │    │
│  │ BD-2024-001│ 25 oz│ $100/oz│ Farm A    │ Dec 15    │    │
│  │ BD-2024-002│ 30 oz│ $95/oz │ Farm B    │ Dec 20    │    │
│  │ BD-2024-003│ 20 oz│ $110/oz│ Farm A    │ Dec 28    │    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Acceptance Criteria

- [ ] Products can be created/edited/deactivated
- [ ] Batches must reference a product
- [ ] Product search works (name, strain)
- [ ] Category filtering works
- [ ] Product detail shows all batches
- [ ] Photos linked at product level
- [ ] Product merge combines duplicates

## 6. Migration Plan

### 6.1 Data Migration

```sql
-- 1. Create products from existing batch data
INSERT INTO products (name, strain, category_id, created_at)
SELECT DISTINCT 
  COALESCE(strain, 'Unknown') as name,
  strain,
  category_id,
  MIN(created_at)
FROM batches
GROUP BY strain, category_id;

-- 2. Link batches to products
UPDATE batches b
JOIN products p ON b.strain = p.strain AND b.category_id = p.category_id
SET b.product_id = p.id;

-- 3. Migrate photos from batch to product level
UPDATE product_photos pp
JOIN batches b ON pp.batch_id = b.id
SET pp.product_id = b.product_id
WHERE pp.product_id IS NULL;
```

### 6.2 Feature Flag

`FEATURE_UNIFIED_CATALOG` - Enable after migration verified.

### 6.3 Rollback Plan

1. Keep legacy batch fields populated
2. Disable feature flag
3. Revert to batch-centric views
4. No data loss

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Product CRUD operations
- [ ] Batch-product relationship
- [ ] Search and filtering
- [ ] Product merge logic

### 7.2 Integration Tests

- [ ] Migration script accuracy
- [ ] Photo inheritance
- [ ] Order flow with products
- [ ] Reporting accuracy

### 7.3 E2E Tests

- [ ] Create product → create batch → sell → verify reports
- [ ] Search and filter products
- [ ] Merge duplicate products

## 8. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Duplicate products | 0 | Product audit |
| Data consistency | 100% | Batch-product linkage |
| Search accuracy | 95%+ | User feedback |

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
