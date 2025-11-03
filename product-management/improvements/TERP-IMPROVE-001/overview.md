# TERP Inventory System Improvement Plan

## Executive Summary

This document outlines a comprehensive plan to improve the **efficacy, stability, and robustness** of the TERP inventory system without adding new features. The focus is on strengthening existing functionality through better data integrity, error handling, performance optimization, and code quality.

## Critical Priority Improvements (P0)

### 1. Implement Database Transactions with Row-Level Locking

**Problem:** Race condition in `decreaseInventory` function allows concurrent sales to cause negative inventory.

**Location:** `server/inventoryMovementsDb.ts:69-126`

**Current Code:**
```typescript
// Get current batch quantity
const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
// ... validation ...
// Update batch quantity (NOT ATOMIC!)
await db.update(batches).set({ onHandQty: newQty.toString() }).where(eq(batches.id, batchId));
```

**Solution:**
```typescript
export async function decreaseInventory(
  batchId: number,
  quantity: string,
  referenceType: string,
  referenceId: number,
  userId: number,
  reason?: string
): Promise<InventoryMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Start transaction
  return await db.transaction(async (tx) => {
    // Lock the batch row for update
    const [batch] = await tx
      .select()
      .from(batches)
      .where(eq(batches.id, batchId))
      .for('update'); // Row-level lock
    
    if (!batch) {
      throw new AppError(`Batch ${batchId} not found`, "NOT_FOUND");
    }
    
    const onHandQty = parseFloat(batch.onHandQty || "0");
    const decreaseQty = parseFloat(quantity);
    
    if (isNaN(decreaseQty) || decreaseQty <= 0) {
      throw new AppError("Invalid quantity", "VALIDATION_ERROR");
    }
    
    if (decreaseQty > onHandQty) {
      throw new AppError(
        `Insufficient inventory. Available: ${onHandQty}, Requested: ${decreaseQty}`,
        "INSUFFICIENT_INVENTORY"
      );
    }
    
    const newQty = onHandQty - decreaseQty;
    
    // Update batch quantity within transaction
    await tx
      .update(batches)
      .set({ onHandQty: newQty.toString() })
      .where(eq(batches.id, batchId));
    
    // Record movement within same transaction
    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        batchId,
        movementType: "SALE",
        quantityChange: `-${quantity}`,
        quantityBefore: onHandQty.toString(),
        quantityAfter: newQty.toString(),
        referenceType,
        referenceId,
        reason,
        performedBy: userId
      })
      .$returningId();
    
    const [record] = await tx
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.id, movement.id));
    
    return record!;
  });
}
```

**Impact:**
- Prevents negative inventory
- Ensures data consistency
- Eliminates race conditions
- Maintains audit trail integrity

**Files to Update:**
- `server/inventoryMovementsDb.ts` (decreaseInventory, increaseInventory, adjustInventory)
- `server/routers/inventory.ts` (intake mutation - wrap in transaction)
- Add transaction retry logic for deadlock handling

**Testing Requirements:**
- Concurrent sale simulation (10+ simultaneous requests)
- Deadlock recovery testing
- Transaction rollback verification

---

### 2. Fix Hardcoded Sequence Numbers

**Problem:** Batch and lot codes use hardcoded or random sequences, risking collisions.

**Locations:**
- `server/routers/inventory.ts:149` - `const batchSequence = 1; // TODO`
- `server/inventoryUtils.ts:100` - `Math.floor(Math.random() * 1000)`

**Solution A: Database Sequence Table**

Create new table:
```sql
CREATE TABLE sequences (
  name VARCHAR(50) PRIMARY KEY,
  current_value INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO sequences (name, current_value) VALUES 
  ('lot_sequence', 0),
  ('batch_sequence', 0);
```

Add schema definition:
```typescript
// drizzle/schema.ts
export const sequences = mysqlTable("sequences", {
  name: varchar("name", { length: 50 }).primaryKey(),
  currentValue: int("currentValue").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

Create utility function:
```typescript
// server/sequenceDb.ts
export async function getNextSequence(name: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx) => {
    // Lock and increment atomically
    await tx
      .update(sequences)
      .set({ currentValue: sql`current_value + 1` })
      .where(eq(sequences.name, name));
    
    const [result] = await tx
      .select()
      .from(sequences)
      .where(eq(sequences.name, name))
      .for('update');
    
    return result.currentValue;
  });
}
```

Update code generation:
```typescript
// server/inventoryUtils.ts
export async function generateLotCode(date: Date): Promise<string> {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const sequence = await getNextSequence('lot_sequence');
  const seqStr = sequence.toString().padStart(3, '0');
  return `LOT-${dateStr}-${seqStr}`;
}
```

**Solution B: Use Database Auto-Increment**

Alternative approach using batch.id:
```typescript
export function generateBatchCode(lotCode: string, batchId: number): string {
  const seqStr = batchId.toString().padStart(6, "0");
  return `BCH-${lotCode}-${seqStr}`;
}
```

**Recommendation:** Use Solution A for predictable, sequential codes.

**Files to Update:**
- `drizzle/schema.ts` - Add sequences table
- `server/sequenceDb.ts` - New file for sequence operations
- `server/inventoryUtils.ts` - Update generateLotCode, generateBatchCode
- `server/routers/inventory.ts` - Remove hardcoded sequence
- Create migration: `drizzle/00XX_add_sequences_table.sql`

**Testing Requirements:**
- Concurrent sequence generation (ensure no duplicates)
- Sequence rollover handling
- Migration testing on production data

---

### 3. Wrap Multi-Step Operations in Transactions

**Problem:** Batch intake creates vendor, brand, product, lot, batch, location, and audit log without transaction protection.

**Location:** `server/routers/inventory.ts:64-202` (intake mutation)

**Current Structure:**
```typescript
intake: protectedProcedure
  .mutation(async ({ input, ctx }) => {
    // 1. Find/create vendor
    // 2. Find/create brand
    // 3. Find/create product
    // 4. Find/create lot
    // 5. Create batch
    // 6. Create batch location
    // 7. Create audit log
    // All separate operations - no rollback if step 7 fails!
  })
```

**Solution:**
```typescript
intake: protectedProcedure
  .input(/* ... */)
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new AppError("Database not available", "INTERNAL_SERVER_ERROR");
    
    // Validate COGS before transaction
    const cogsValidation = inventoryUtils.validateCOGS(
      input.cogsMode,
      input.unitCogs,
      input.unitCogsMin,
      input.unitCogsMax
    );
    if (!cogsValidation.valid) {
      throw new AppError(cogsValidation.error!, "VALIDATION_ERROR");
    }
    
    // Execute all operations in single transaction
    return await db.transaction(async (tx) => {
      // 1. Find or create vendor
      const vendor = await findOrCreateVendor(tx, input.vendorName);
      
      // 2. Find or create brand
      const brand = await findOrCreateBrand(tx, input.brandName, vendor.id);
      
      // 3. Find or create product
      const product = await findOrCreateProduct(tx, {
        brandId: brand.id,
        nameCanonical: inventoryUtils.normalizeProductName(input.productName),
        category: input.category,
        subcategory: input.subcategory,
        strainId: input.strainId,
      });
      
      // 4. Find or create lot
      const lotCode = await inventoryUtils.generateLotCode(new Date());
      const lot = await findOrCreateLot(tx, lotCode, vendor.id, new Date());
      
      // 5. Generate codes and create batch
      const batchSequence = await getNextSequence('batch_sequence');
      const batchCode = inventoryUtils.generateBatchCode(lotCode, batchSequence);
      const sku = inventoryUtils.generateSKU(
        inventoryUtils.normalizeToKey(brand.name),
        inventoryUtils.normalizeToKey(product.nameCanonical),
        new Date(),
        batchSequence
      );
      
      const batch = await createBatch(tx, {
        code: batchCode,
        sku: sku,
        productId: product.id,
        lotId: lot.id,
        status: "AWAITING_INTAKE",
        grade: input.grade,
        isSample: 0,
        cogsMode: input.cogsMode,
        unitCogs: input.unitCogs,
        unitCogsMin: input.unitCogsMin,
        unitCogsMax: input.unitCogsMax,
        paymentTerms: input.paymentTerms,
        metadata: input.metadata ? inventoryUtils.stringifyMetadata(input.metadata) : null,
        onHandQty: inventoryUtils.formatQty(input.quantity),
        reservedQty: "0",
        quarantineQty: "0",
        holdQty: "0",
        defectiveQty: "0",
      });
      
      // 6. Create batch location
      await createBatchLocation(tx, {
        batchId: batch.id,
        site: input.location.site,
        zone: input.location.zone,
        rack: input.location.rack,
        shelf: input.location.shelf,
        bin: input.location.bin,
        qty: inventoryUtils.formatQty(input.quantity),
      });
      
      // 7. Create audit log
      await createAuditLog(tx, {
        actorId: ctx.user?.id || 0,
        entity: "Batch",
        entityId: batch.id,
        action: "CREATED",
        after: inventoryUtils.createAuditSnapshot(batch),
        reason: "Initial intake",
      });
      
      return { success: true, batch };
    });
  })
```

Extract helper functions:
```typescript
// server/inventoryDb.ts
async function findOrCreateVendor(tx: Transaction, name: string) {
  const existing = await tx.select().from(vendors).where(eq(vendors.name, name)).limit(1);
  if (existing[0]) return existing[0];
  
  const [created] = await tx.insert(vendors).values({ name }).$returningId();
  const [vendor] = await tx.select().from(vendors).where(eq(vendors.id, created.id));
  return vendor!;
}

// Similar for brand, product, lot...
```

**Impact:**
- Atomic intake operations
- Automatic rollback on failure
- No orphaned records
- Consistent data state

**Files to Update:**
- `server/routers/inventory.ts` - Wrap intake in transaction
- `server/inventoryDb.ts` - Add transaction-aware helper functions
- `server/routers/inventory.ts` - Wrap updateStatus, adjustQty in transactions

**Testing Requirements:**
- Simulate failures at each step
- Verify rollback behavior
- Test partial failure scenarios

---

## High Priority Improvements (P1)

### 4. Standardize Error Handling

**Problem:** Inconsistent error types and messages throughout codebase.

**Current Issues:**
```typescript
throw new Error("Batch not found");  // Generic Error
throw new AppError("...", "NOT_FOUND", 404);  // AppError with HTTP code
throw new Error(`Failed to...`);  // String interpolation
```

**Solution:**

Create error catalog:
```typescript
// server/_core/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Inventory-specific errors
export const InventoryErrors = {
  BATCH_NOT_FOUND: (batchId: number) => 
    new AppError(
      `Batch ${batchId} not found`,
      "BATCH_NOT_FOUND",
      404,
      { batchId }
    ),
  
  INSUFFICIENT_INVENTORY: (batchId: number, available: number, requested: number) =>
    new AppError(
      `Insufficient inventory for batch ${batchId}. Available: ${available}, Requested: ${requested}`,
      "INSUFFICIENT_INVENTORY",
      400,
      { batchId, available, requested }
    ),
  
  INVALID_STATUS_TRANSITION: (from: string, to: string) =>
    new AppError(
      `Invalid status transition from ${from} to ${to}`,
      "INVALID_STATUS_TRANSITION",
      400,
      { from, to }
    ),
  
  INVALID_QUANTITY: (quantity: any) =>
    new AppError(
      `Invalid quantity: ${quantity}`,
      "INVALID_QUANTITY",
      400,
      { quantity }
    ),
  
  NEGATIVE_QUANTITY: (batchId: number, quantity: number) =>
    new AppError(
      `Quantity cannot be negative for batch ${batchId}: ${quantity}`,
      "NEGATIVE_QUANTITY",
      400,
      { batchId, quantity }
    ),
};
```

Update all error throwing:
```typescript
// Before
if (!batch) throw new Error("Batch not found");

// After
if (!batch) throw InventoryErrors.BATCH_NOT_FOUND(input.id);
```

Add structured logging:
```typescript
// server/_core/logger.ts
export const logger = {
  error: (message: string, error: Error, context?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof AppError ? { code: error.code, statusCode: error.statusCode } : {})
      },
      context,
      timestamp: new Date().toISOString(),
    }));
  },
  
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString(),
    }));
  },
  
  info: (message: string, context?: Record<string, any>) => {
    console.info(JSON.stringify({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
    }));
  },
};
```

Update error handlers:
```typescript
// server/routers/inventory.ts
try {
  // ... operation ...
} catch (error) {
  logger.error("Failed to decrease inventory", error as Error, {
    batchId: input.batchId,
    quantity: input.quantity,
    userId: ctx.user?.id,
  });
  throw error;
}
```

**Files to Update:**
- `server/_core/errors.ts` - Add error catalog
- `server/_core/logger.ts` - Add structured logger
- `server/routers/inventory.ts` - Update all error handling
- `server/routers/inventoryMovements.ts` - Update all error handling
- `server/inventoryDb.ts` - Update all error handling
- `server/inventoryMovementsDb.ts` - Update all error handling

---

### 5. Add Comprehensive Input Validation

**Problem:** Missing validation for edge cases and business rules.

**Solution:**

Enhance Zod schemas:
```typescript
// server/routers/inventory.ts
const intakeInputSchema = z.object({
  vendorName: z.string().min(1).max(255).trim(),
  brandName: z.string().min(1).max(255).trim(),
  productName: z.string().min(1).max(500).trim(),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  grade: z.string().max(10).optional(),
  strainId: z.number().int().positive().nullable().optional(),
  quantity: z.number().positive().finite(),
  cogsMode: z.enum(["FIXED", "RANGE"]),
  unitCogs: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  unitCogsMin: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  unitCogsMax: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  paymentTerms: z.enum(["COD", "NET_7", "NET_15", "NET_30", "CONSIGNMENT", "PARTIAL"]),
  location: z.object({
    site: z.string().min(1).max(100),
    zone: z.string().max(50).optional(),
    rack: z.string().max(50).optional(),
    shelf: z.string().max(50).optional(),
    bin: z.string().max(50).optional(),
  }),
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => {
    if (data.cogsMode === "FIXED") {
      return !!data.unitCogs;
    }
    return !!data.unitCogsMin && !!data.unitCogsMax;
  },
  {
    message: "FIXED mode requires unitCogs, RANGE mode requires unitCogsMin and unitCogsMax",
  }
).refine(
  (data) => {
    if (data.cogsMode === "RANGE" && data.unitCogsMin && data.unitCogsMax) {
      return parseFloat(data.unitCogsMin) < parseFloat(data.unitCogsMax);
    }
    return true;
  },
  {
    message: "unitCogsMin must be less than unitCogsMax",
  }
);

intake: protectedProcedure
  .input(intakeInputSchema)
  .mutation(async ({ input, ctx }) => {
    // Input is now fully validated
  })
```

Add business rule validation:
```typescript
// server/inventoryUtils.ts
export function validateBatchUpdate(
  currentBatch: Batch,
  updates: Partial<Batch>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Cannot reduce quantity below reserved
  if (updates.onHandQty) {
    const newOnHand = parseFloat(updates.onHandQty);
    const reserved = parseFloat(currentBatch.reservedQty);
    if (newOnHand < reserved) {
      errors.push(`Cannot reduce on-hand quantity below reserved quantity (${reserved})`);
    }
  }
  
  // Cannot change COGS mode if batch has sales
  if (updates.cogsMode && updates.cogsMode !== currentBatch.cogsMode) {
    // Check if batch has any sales (would need to query inventoryMovements)
    errors.push("Cannot change COGS mode after sales have been made");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

**Files to Update:**
- `server/routers/inventory.ts` - Enhance all input schemas
- `server/routers/inventoryMovements.ts` - Enhance all input schemas
- `server/inventoryUtils.ts` - Add business rule validators

---

### 6. Add Missing Database Indexes

**Problem:** Queries on frequently filtered/sorted fields lack indexes.

**Current State:**
- `inventoryMovements` has indexes on batchId, movementType, reference, createdAt ✓
- `inventoryAlerts` has indexes on batchId, status, alertType, severity ✓
- `batches` table missing indexes on status, createdAt, category

**Solution:**

Create migration:
```sql
-- drizzle/00XX_add_inventory_indexes.sql

-- Batches table indexes
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_created_at ON batches(createdAt);
CREATE INDEX idx_batches_product_id ON batches(productId);
CREATE INDEX idx_batches_lot_id ON batches(lotId);

-- Products table indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_subcategory ON products(subcategory);
CREATE INDEX idx_products_brand_id ON products(brandId);

-- Batch locations index
CREATE INDEX idx_batch_locations_site ON batchLocations(site);

-- Composite indexes for common queries
CREATE INDEX idx_batches_status_created ON batches(status, createdAt);
CREATE INDEX idx_products_category_brand ON products(category, brandId);
```

Update schema:
```typescript
// drizzle/schema.ts
export const batches = mysqlTable("batches", {
  // ... fields ...
}, (table) => ({
  statusIdx: index("idx_batches_status").on(table.status),
  createdAtIdx: index("idx_batches_created_at").on(table.createdAt),
  productIdIdx: index("idx_batches_product_id").on(table.productId),
  lotIdIdx: index("idx_batches_lot_id").on(table.lotId),
  statusCreatedIdx: index("idx_batches_status_created").on(table.status, table.createdAt),
}));

export const products = mysqlTable("products", {
  // ... fields ...
}, (table) => ({
  categoryIdx: index("idx_products_category").on(table.category),
  subcategoryIdx: index("idx_products_subcategory").on(table.subcategory),
  brandIdIdx: index("idx_products_brand_id").on(table.brandId),
  categoryBrandIdx: index("idx_products_category_brand").on(table.category, table.brandId),
}));
```

**Impact:**
- Faster filtering by status
- Improved sort performance
- Better join performance
- Reduced query latency

**Files to Update:**
- `drizzle/schema.ts` - Add index definitions
- Create migration SQL file
- Test on production data size

---

## Medium Priority Improvements (P2)

### 7. Implement Quantity Calculation Consistency

**Problem:** Available quantity calculated in multiple places with potential for drift.

**Solution:**

Create single source of truth:
```typescript
// server/inventoryUtils.ts
export interface BatchQuantities {
  onHand: number;
  reserved: number;
  quarantine: number;
  hold: number;
  defective: number;
  sample: number;
  available: number;
}

export function calculateBatchQuantities(batch: Batch): BatchQuantities {
  const onHand = parseQty(batch.onHandQty);
  const reserved = parseQty(batch.reservedQty);
  const quarantine = parseQty(batch.quarantineQty);
  const hold = parseQty(batch.holdQty);
  const defective = parseQty(batch.defectiveQty);
  const sample = parseQty(batch.sampleQty);
  
  const available = Math.max(0, onHand - reserved - quarantine - hold);
  
  return {
    onHand,
    reserved,
    quarantine,
    hold,
    defective,
    sample,
    available,
  };
}

// Validation helper
export function validateQuantityInvariants(quantities: BatchQuantities): boolean {
  // Invariant: reserved + quarantine + hold <= onHand
  return (quantities.reserved + quantities.quarantine + quantities.hold) <= quantities.onHand;
}
```

Add database constraint (MySQL 8.0 supports generated columns):
```sql
ALTER TABLE batches 
ADD COLUMN availableQty VARCHAR(20) 
GENERATED ALWAYS AS (
  GREATEST(0, 
    CAST(onHandQty AS DECIMAL(10,2)) - 
    CAST(reservedQty AS DECIMAL(10,2)) - 
    CAST(quarantineQty AS DECIMAL(10,2)) - 
    CAST(holdQty AS DECIMAL(10,2))
  )
) STORED;

CREATE INDEX idx_batches_available_qty ON batches(availableQty);
```

Update client-side to use server calculation:
```typescript
// client/src/pages/Inventory.tsx
// Remove local calculation
const available = item.batch.availableQty; // Use server-provided value
```

**Files to Update:**
- `server/inventoryUtils.ts` - Add calculation functions
- `drizzle/schema.ts` - Add generated column
- `client/src/pages/Inventory.tsx` - Remove duplicate calculation
- Create migration for generated column

---

### 8. Improve Metadata Handling

**Problem:** Metadata stored as JSON text with no schema validation.

**Solution:**

Define metadata schemas:
```typescript
// server/inventoryUtils.ts
import { z } from "zod";

export const BatchMetadataSchema = z.object({
  testResults: z.object({
    thc: z.number().min(0).max(100).optional(),
    cbd: z.number().min(0).max(100).optional(),
    terpenes: z.array(z.object({
      name: z.string(),
      percentage: z.number().min(0).max(100),
    })).optional(),
  }).optional(),
  
  harvestCode: z.string().max(100).optional(),
  coaUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
  
  customFields: z.record(z.string(), z.any()).optional(),
});

export type BatchMetadata = z.infer<typeof BatchMetadataSchema>;

export function validateMetadata(metadata: unknown): BatchMetadata {
  return BatchMetadataSchema.parse(metadata);
}

export function parseMetadataSafe(metadataStr: string | null): BatchMetadata | null {
  if (!metadataStr) return null;
  
  try {
    const parsed = JSON.parse(metadataStr);
    return BatchMetadataSchema.parse(parsed);
  } catch (error) {
    logger.warn("Failed to parse batch metadata", { metadataStr, error });
    return null;
  }
}
```

Update intake to validate metadata:
```typescript
intake: protectedProcedure
  .input(z.object({
    // ... other fields ...
    metadata: BatchMetadataSchema.optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Metadata is now validated
    const metadataStr = input.metadata 
      ? inventoryUtils.stringifyMetadata(input.metadata)
      : null;
    
    // ... rest of intake ...
  })
```

**Files to Update:**
- `server/inventoryUtils.ts` - Add metadata schema and validation
- `server/routers/inventory.ts` - Use validated metadata
- Add migration to validate existing metadata

---

### 9. Add Comprehensive Audit Logging

**Problem:** Not all operations create audit logs consistently.

**Solution:**

Create audit middleware:
```typescript
// server/_core/auditMiddleware.ts
import { middleware } from './trpc';
import { createAuditLog } from '../inventoryDb';

export const auditedProcedure = protectedProcedure.use(
  middleware(async ({ ctx, next, path, type, input }) => {
    const result = await next();
    
    // Log all mutations
    if (type === 'mutation') {
      await createAuditLog({
        actorId: ctx.user?.id || 0,
        entity: "API",
        entityId: 0,
        action: path,
        before: null,
        after: JSON.stringify({ input, result }),
        reason: `API call: ${path}`,
      });
    }
    
    return result;
  })
);
```

Add database triggers as backup:
```sql
-- Trigger for batch updates
DELIMITER $$
CREATE TRIGGER batch_update_audit
AFTER UPDATE ON batches
FOR EACH ROW
BEGIN
  INSERT INTO auditLogs (actorId, entity, entityId, action, before, after, createdAt)
  VALUES (
    0, -- System user
    'Batch',
    NEW.id,
    'UPDATE',
    JSON_OBJECT(
      'status', OLD.status,
      'onHandQty', OLD.onHandQty,
      'reservedQty', OLD.reservedQty
    ),
    JSON_OBJECT(
      'status', NEW.status,
      'onHandQty', NEW.onHandQty,
      'reservedQty', NEW.reservedQty
    ),
    NOW()
  );
END$$
DELIMITER ;
```

**Files to Update:**
- `server/_core/auditMiddleware.ts` - New file
- `server/routers/inventory.ts` - Use auditedProcedure
- Create migration for database triggers

---

### 10. Add Unit and Integration Tests

**Problem:** No automated tests for critical inventory operations.

**Solution:**

Setup test infrastructure:
```typescript
// server/tests/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { getDb } from '../db';

beforeAll(async () => {
  // Setup test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

afterAll(async () => {
  // Cleanup
});

beforeEach(async () => {
  // Clear tables
  const db = await getDb();
  await db.delete(inventoryMovements);
  await db.delete(batches);
  await db.delete(lots);
  // ... etc
});
```

Add unit tests:
```typescript
// server/tests/inventoryUtils.test.ts
import { describe, it, expect } from 'vitest';
import * as inventoryUtils from '../inventoryUtils';

describe('calculateAvailableQty', () => {
  it('should calculate available quantity correctly', () => {
    const batch = {
      onHandQty: "100",
      reservedQty: "20",
      quarantineQty: "10",
      holdQty: "5",
    } as any;
    
    expect(inventoryUtils.calculateAvailableQty(batch)).toBe(65);
  });
  
  it('should never return negative values', () => {
    const batch = {
      onHandQty: "10",
      reservedQty: "20",
      quarantineQty: "0",
      holdQty: "0",
    } as any;
    
    expect(inventoryUtils.calculateAvailableQty(batch)).toBe(0);
  });
});

describe('isValidStatusTransition', () => {
  it('should allow valid transitions', () => {
    expect(inventoryUtils.isValidStatusTransition('AWAITING_INTAKE', 'LIVE')).toBe(true);
    expect(inventoryUtils.isValidStatusTransition('LIVE', 'ON_HOLD')).toBe(true);
  });
  
  it('should reject invalid transitions', () => {
    expect(inventoryUtils.isValidStatusTransition('AWAITING_INTAKE', 'SOLD_OUT')).toBe(false);
    expect(inventoryUtils.isValidStatusTransition('CLOSED', 'LIVE')).toBe(false);
  });
});
```

Add integration tests:
```typescript
// server/tests/inventory.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { decreaseInventory } from '../inventoryMovementsDb';
import { createBatch, getBatchById } from '../inventoryDb';

describe('decreaseInventory', () => {
  let testBatchId: number;
  
  beforeEach(async () => {
    // Setup test batch
    const batch = await createTestBatch({ onHandQty: "100" });
    testBatchId = batch.id;
  });
  
  it('should decrease inventory correctly', async () => {
    await decreaseInventory(testBatchId, "30", "ORDER", 1, 1);
    
    const batch = await getBatchById(testBatchId);
    expect(batch?.onHandQty).toBe("70");
  });
  
  it('should prevent overselling', async () => {
    await expect(
      decreaseInventory(testBatchId, "150", "ORDER", 1, 1)
    ).rejects.toThrow("Insufficient inventory");
  });
  
  it('should handle concurrent decreases correctly', async () => {
    // Simulate race condition
    const promises = Array.from({ length: 10 }, () =>
      decreaseInventory(testBatchId, "10", "ORDER", 1, 1)
    );
    
    await Promise.all(promises);
    
    const batch = await getBatchById(testBatchId);
    expect(batch?.onHandQty).toBe("0");
  });
});
```

**Files to Create:**
- `server/tests/setup.ts`
- `server/tests/inventoryUtils.test.ts`
- `server/tests/inventoryDb.test.ts`
- `server/tests/inventory.integration.test.ts`
- `server/tests/inventoryMovements.integration.test.ts`

**Testing Coverage Goals:**
- Utility functions: 100%
- Database operations: 80%+
- API endpoints: 70%+

---

## Low Priority Improvements (P3)

### 11. Optimize Query Performance

**Problem:** Large result sets and N+1 query patterns.

**Solutions:**

A. Implement cursor-based pagination:
```typescript
list: protectedProcedure
  .input(z.object({
    query: z.string().optional(),
    cursor: z.number().optional(),
    limit: z.number().min(1).max(100).default(50),
  }))
  .query(async ({ input }) => {
    const results = await inventoryDb.getBatchesWithDetails({
      query: input.query,
      cursor: input.cursor,
      limit: input.limit + 1, // Fetch one extra to determine if there's more
    });
    
    let nextCursor: number | undefined = undefined;
    if (results.length > input.limit) {
      const nextItem = results.pop();
      nextCursor = nextItem?.batch.id;
    }
    
    return {
      items: results,
      nextCursor,
    };
  })
```

B. Add result caching:
```typescript
// server/_core/cache.ts
const cache = new Map<string, { data: any; expires: number }>();

export function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return Promise.resolve(cached.data);
  }
  
  return fn().then(data => {
    cache.set(key, {
      data,
      expires: Date.now() + ttlSeconds * 1000,
    });
    return data;
  });
}
```

C. Optimize joins:
```typescript
// Use subqueries for aggregations
export async function getBatchesWithStats(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      batch: batches,
      product: products,
      brand: brands,
      vendor: vendors,
      movementCount: sql<number>`(
        SELECT COUNT(*) 
        FROM inventoryMovements 
        WHERE batchId = ${batches.id}
      )`.as('movementCount'),
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(lots, eq(batches.lotId, lots.id))
    .leftJoin(vendors, eq(lots.vendorId, vendors.id))
    .orderBy(desc(batches.createdAt))
    .limit(limit);
}
```

---

### 12. Reduce Code Duplication

**Problem:** Repeated patterns for entity creation.

**Solution:**

Create generic entity finder:
```typescript
// server/inventoryDb.ts
async function findOrCreate<T extends { id: number; name: string }>(
  tx: Transaction,
  table: any,
  name: string,
  additionalFields?: Record<string, any>
): Promise<T> {
  const existing = await tx
    .select()
    .from(table)
    .where(eq(table.name, name))
    .limit(1);
  
  if (existing[0]) return existing[0] as T;
  
  const [created] = await tx
    .insert(table)
    .values({ name, ...additionalFields })
    .$returningId();
  
  const [entity] = await tx
    .select()
    .from(table)
    .where(eq(table.id, created.id));
  
  return entity as T;
}

// Usage
const vendor = await findOrCreate(tx, vendors, input.vendorName);
const brand = await findOrCreate(tx, brands, input.brandName, { vendorId: vendor.id });
```

---

### 13. Improve Type Safety

**Problem:** Use of `any` types and type assertions.

**Solution:**

Eliminate `any` types:
```typescript
// Before
metadata: z.any().optional()

// After
metadata: BatchMetadataSchema.optional()
```

Add runtime type guards:
```typescript
export function isBatch(value: unknown): value is Batch {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'code' in value &&
    'sku' in value
  );
}
```

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1-2)
1. Implement database transactions with row-level locking
2. Fix hardcoded sequence numbers
3. Wrap multi-step operations in transactions

**Deliverables:**
- Updated `inventoryMovementsDb.ts` with transactions
- New `sequenceDb.ts` module
- Migration for sequences table
- Updated `inventory.ts` router with transactions

### Phase 2: Stability Improvements (Week 3-4)
4. Standardize error handling
5. Add comprehensive input validation
6. Add missing database indexes

**Deliverables:**
- Error catalog in `_core/errors.ts`
- Structured logger in `_core/logger.ts`
- Enhanced Zod schemas
- Index migration

### Phase 3: Robustness Enhancements (Week 5-6)
7. Implement quantity calculation consistency
8. Improve metadata handling
9. Add comprehensive audit logging
10. Add unit and integration tests

**Deliverables:**
- Quantity calculation utilities
- Metadata schemas
- Audit middleware
- Test suite with 70%+ coverage

### Phase 4: Optimization (Week 7-8)
11. Optimize query performance
12. Reduce code duplication
13. Improve type safety

**Deliverables:**
- Pagination implementation
- Caching layer
- Refactored entity management
- Type safety improvements

## Success Metrics

### Data Integrity
- ✅ Zero negative inventory incidents
- ✅ Zero SKU/code collisions
- ✅ 100% transaction rollback success rate

### Stability
- ✅ 99.9% uptime for inventory operations
- ✅ <100ms p95 latency for inventory queries
- ✅ Zero data corruption incidents

### Code Quality
- ✅ 70%+ test coverage
- ✅ Zero TypeScript errors
- ✅ <5 critical code smells (SonarQube)

### Observability
- ✅ 100% error logging coverage
- ✅ Structured logs for all operations
- ✅ Audit trail for all mutations

## Risk Mitigation

### Database Migration Risks
- **Risk:** Migrations fail on production data
- **Mitigation:** 
  - Test on production data snapshot
  - Implement rollback scripts
  - Execute during low-traffic window

### Performance Degradation
- **Risk:** New indexes/transactions slow down operations
- **Mitigation:**
  - Benchmark before/after
  - Monitor query performance
  - Add caching if needed

### Breaking Changes
- **Risk:** Transaction changes break existing integrations
- **Mitigation:**
  - Maintain backward compatibility
  - Add feature flags for gradual rollout
  - Comprehensive testing

## Conclusion

This improvement plan focuses on strengthening the existing inventory system through:
1. **Data integrity** via transactions and locking
2. **Stability** via error handling and validation
3. **Robustness** via testing and monitoring
4. **Performance** via indexing and optimization

All improvements maintain the current feature set while making the system more reliable, maintainable, and production-ready.
