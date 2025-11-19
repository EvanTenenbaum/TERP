# DATA-006: Seed Batches

**Task ID:** DATA-006  
**Priority:** P1 (High) - BLOCKING DATA-004  
**Estimate:** 2-2.5 hours  
**Status:** ready  
**Depends On:** Products, Lots

---

## Objective

Seed 20-30 batches for existing products to enable inventory management and unblock order creation (DATA-004).

**Tables to Seed:**

1. `batches` - 20-30 batch records with inventory quantities
2. `lots` - Create lots if they don't exist (prerequisite for batches)

---

## Context

**Why This Matters:**

- Batches are REQUIRED for order line items (`order_line_items.batch_id` FK)
- Currently BLOCKING DATA-004 (order seeding)
- Essential for inventory management and tracking
- Enables price alerts (DATA-009)
- Enables inventory movements (DATA-007)

**Current State:**

- `batches`: 0 records (EMPTY) ❌
- `lots`: Unknown (need to check)
- `products`: 100+ products exist ✅
- `order_line_items`: 0 records (waiting for batches)

**Complexity:** HIGH

- Batches require `productId` and `lotId`
- Need to verify lots exist or create them
- Complex schema with many required fields
- Batch codes/SKUs must be unique
- Inventory quantities must be realistic

---

## Deliverables

1. ✅ `scripts/seed-batches.ts` - Batch seeding script
2. ✅ Lots created (if needed)
3. ✅ 20-30 batches created
4. ✅ Unique batch codes and SKUs
5. ✅ Realistic inventory quantities
6. ✅ Batch statuses set appropriately
7. ✅ COGS data populated
8. ✅ Validation that batches are queryable
9. ✅ Roadmap updated to complete

---

## Implementation Protocol

### Phase 1: Setup & Prerequisites (30 min)

**Step 1.1: Register session**

```bash
cd /home/ubuntu/TERP
SESSION_ID="Session-$(date +%Y%m%d)-DATA-006-$(openssl rand -hex 4)"
echo "- DATA-006: $SESSION_ID ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
git add docs/ACTIVE_SESSIONS.md
git commit -m "Register DATA-006 session"
git push origin main
```

**Step 1.2: Check lots table**

```sql
-- Check if lots table exists
SHOW TABLES LIKE '%lot%';

-- If lots table exists, check structure
DESCRIBE lots;

-- Check how many lots exist
SELECT COUNT(*) FROM lots;

-- Get sample lots
SELECT * FROM lots LIMIT 5;
```

**Step 1.3: Check products**

```sql
-- Get products for batch creation
SELECT id, name, category FROM products LIMIT 30;
```

**Step 1.4: Understand batch schema**

The `batches` table has these key fields (from earlier discovery):

- `id` - Auto-increment
- `code` - Unique batch code (e.g., "BATCH-2025-001")
- `sku` - Unique SKU (e.g., "SKU-PROD123-001")
- `productId` - FK to products (REQUIRED)
- `lotId` - FK to lots (REQUIRED)
- `batchStatus` - ENUM: AWAITING_INTAKE, LIVE, PHOTOGRAPHY_COMPLETE, ON_HOLD, QUARANTINED, SOLD_OUT, CLOSED
- `cogsMode` - ENUM: FIXED, RANGE
- `unitCogs` - Cost per unit (if FIXED)
- `unitCogsMin`, `unitCogsMax` - Cost range (if RANGE)
- `paymentTerms` - ENUM: COD, NET_7, NET_15, NET_30, CONSIGNMENT, PARTIAL
- `onHandQty` - Available quantity
- `sampleQty`, `reservedQty`, `quarantineQty`, `holdQty`, `defectiveQty` - Other quantities
- `publishEcom`, `publishB2b` - Boolean flags

---

### Phase 2: Create or Verify Lots (20-30 min)

**Step 2.1: Check if lots exist**

If lots table exists and has records:

```sql
SELECT id, lot_number, product_id FROM lots LIMIT 10;
```

**Step 2.2: Create lots if needed**

If lots table is empty or doesn't exist, create lots:

```typescript
// Create lots for products
const productsResult = await db.execute(sql`SELECT id FROM products LIMIT 30`);
const products = productsResult[0] as { id: number }[];

for (const product of products) {
  const lotNumber = `LOT-${new Date().getFullYear()}-${String(product.id).padStart(4, "0")}`;

  await db.execute(sql`
    INSERT INTO lots (lot_number, product_id, received_date)
    VALUES (${lotNumber}, ${product.id}, CURDATE())
  `);
}
```

---

### Phase 3: Seed Batches (40-60 min)

**Step 3.1: Create seeding script**

```typescript
// scripts/seed-batches.ts
import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING BATCHES ===\n");

async function seedBatches() {
  try {
    // Phase 1: Verify prerequisites
    console.log("📋 Phase 1: Verifying prerequisites...");

    const productsResult = await db.execute(
      sql`SELECT id, name FROM products LIMIT 30`
    );
    const products = productsResult[0] as { id: number; name: string }[];

    const lotsResult = await db.execute(
      sql`SELECT id, lot_number, product_id FROM lots LIMIT 30`
    );
    const lots = lotsResult[0] as {
      id: number;
      lot_number: string;
      product_id: number;
    }[];

    console.log(`✓ Found ${products.length} products`);
    console.log(`✓ Found ${lots.length} lots\n`);

    if (products.length === 0) {
      console.error("❌ No products found");
      process.exit(1);
    }

    if (lots.length === 0) {
      console.error("❌ No lots found - need to create lots first");
      process.exit(1);
    }

    // Phase 2: Seed Batches
    console.log("📦 Phase 2: Seeding batches...");

    const batchStatuses = [
      "LIVE",
      "LIVE",
      "LIVE",
      "ON_HOLD",
      "AWAITING_INTAKE",
    ];
    const batchCount = 25; // Target 25 batches
    const createdBatches: number[] = [];

    for (let i = 0; i < batchCount; i++) {
      const lot = lots[i % lots.length];
      const product =
        products.find(p => p.id === lot.product_id) || products[0];
      const status = batchStatuses[i % batchStatuses.length];

      // Generate unique codes
      const batchCode = `BATCH-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`;
      const sku = `SKU-${product.id}-${String(i + 1).padStart(3, "0")}`;

      // Random quantities
      const onHandQty = 50 + Math.floor(Math.random() * 450); // 50-500 units
      const sampleQty = Math.floor(onHandQty * 0.05); // 5% samples

      // Random COGS ($5-$50 per unit)
      const unitCogs = (5 + Math.random() * 45).toFixed(2);

      // Insert batch
      await db.execute(sql`
        INSERT INTO batches (
          code,
          sku,
          productId,
          lotId,
          batchStatus,
          cogsMode,
          unitCogs,
          paymentTerms,
          onHandQty,
          sampleQty,
          reservedQty,
          quarantineQty,
          holdQty,
          defectiveQty,
          publishEcom,
          publishB2b
        ) VALUES (
          ${batchCode},
          ${sku},
          ${product.id},
          ${lot.id},
          ${status},
          'FIXED',
          ${unitCogs},
          'NET_30',
          ${onHandQty},
          ${sampleQty},
          0,
          0,
          0,
          0,
          1,
          1
        )
      `);

      const batchIdResult = await db.execute(
        sql`SELECT LAST_INSERT_ID() as id`
      );
      const batchId = (batchIdResult[0] as { id: number }[])[0].id;
      createdBatches.push(batchId);
    }

    console.log(`✓ Created ${batchCount} batches\n`);

    // Phase 3: Validation
    console.log("✅ Phase 3: Validating seeded data...");

    const batchesCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM batches`
    );
    const statusDist = await db.execute(sql`
      SELECT batchStatus, COUNT(*) as count 
      FROM batches 
      GROUP BY batchStatus
    `);

    console.log("📊 Summary:");
    console.log(
      `  - Total Batches: ${(batchesCount[0] as { count: number }[])[0].count}`
    );
    console.log("\n📈 Batches by Status:");
    (statusDist[0] as { batchStatus: string; count: number }[]).forEach(row => {
      console.log(`  - ${row.batchStatus}: ${row.count}`);
    });

    // Show sample batches
    const sampleBatches = await db.execute(sql`
      SELECT b.id, b.code, b.sku, b.batchStatus, b.onHandQty, b.unitCogs
      FROM batches b
      LIMIT 5
    `);
    console.log("\n📦 Sample Batches:");
    (sampleBatches[0] as any[]).forEach(batch => {
      console.log(
        `  - ${batch.code}: ${batch.onHandQty} units @ $${batch.unitCogs} (${batch.batchStatus})`
      );
    });
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedBatches();
```

**Step 3.2: Run the seeding script**

```bash
cd /home/ubuntu/TERP
pnpm exec tsx scripts/seed-batches.ts
```

---

### Phase 4: Validation (15 min)

**Step 4.1: Verify batch data**

```sql
-- Check batch counts
SELECT COUNT(*) FROM batches;

-- Check batch distribution by status
SELECT batchStatus, COUNT(*)
FROM batches
GROUP BY batchStatus;

-- Verify batch-product-lot relationships
SELECT
  b.id,
  b.code,
  b.sku,
  p.name as product_name,
  l.lot_number,
  b.onHandQty,
  b.unitCogs
FROM batches b
JOIN products p ON b.productId = p.id
JOIN lots l ON b.lotId = l.id
LIMIT 10;

-- Check for duplicate codes/SKUs
SELECT code, COUNT(*) as count
FROM batches
GROUP BY code
HAVING count > 1;
-- Should return 0 rows

SELECT sku, COUNT(*) as count
FROM batches
GROUP BY sku
HAVING count > 1;
-- Should return 0 rows
```

---

### Phase 5: Documentation & Commit (15-20 min)

**Step 5.1: Update session file**

**Step 5.2: Update DATA-004 session**

Update `docs/sessions/active/Session-20251118-DATA-004-09debf2b.md` to mark blocker as resolved.

**Step 5.3: Update roadmap**

Mark DATA-006 as complete in `docs/roadmaps/MASTER_ROADMAP.md`.

**Step 5.4: Commit and push**

```bash
git add -A
git commit -m "DATA-006: Seed batches

- Created seed-batches.ts script
- Created lots if needed
- Seeded [count] batches
- All batches have unique codes and SKUs
- Realistic inventory quantities and COGS
- Unblocks DATA-004 (order seeding)
- Complete documentation"

git push origin main
```

---

## Success Criteria

✅ Lots table verified or created  
✅ 20-30 batches created  
✅ All batches have unique codes  
✅ All batches have unique SKUs  
✅ All batches linked to valid products  
✅ All batches linked to valid lots  
✅ Realistic inventory quantities (50-500 units)  
✅ COGS data populated ($5-$50 per unit)  
✅ Mix of batch statuses  
✅ No duplicate codes or SKUs  
✅ Batches are queryable and joinable  
✅ DATA-004 unblocked

---

## Notes

### Complexity Factors

- Lots table may or may not exist
- Need to create lots if missing
- Batch codes and SKUs must be globally unique
- Many required fields in batches table
- Need realistic inventory quantities

### Data Quality

- Batch codes: `BATCH-YYYY-####`
- SKUs: `SKU-{productId}-###`
- Inventory: 50-500 units per batch
- COGS: $5-$50 per unit
- Most batches should be LIVE status

### Impact

- **Unblocks DATA-004** - Can now create orders with line items
- **Enables DATA-007** - Can track inventory movements
- **Enables DATA-009** - Can create price alerts
- **Enables inventory management** - Core ERP functionality

---

**Estimated Time:** 2-2.5 hours  
**Complexity:** HIGH  
**Priority:** P1 (BLOCKING)  
**Dependencies:** Products (exist), Lots (may need to create)
