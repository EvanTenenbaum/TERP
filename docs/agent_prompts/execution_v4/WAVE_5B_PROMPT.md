# Wave 5B: Inventory Workflow Completion

**Agent Role**: Full Stack Developer  
**Duration**: 8-10 hours  
**Priority**: P1  
**Dependencies**: Wave 4 complete  
**Can Run Parallel With**: Wave 5A, 5C (different domains)

---

## Overview

Complete the end-to-end inventory workflow: Purchase Order → Receive Goods → Create Batch → Photography → Publish to Catalog. This is critical for maintaining accurate inventory.

---

## File Domain

**Your files**: 
- `server/routers/purchaseOrders.ts`
- `server/routers/receiving.ts`
- `server/routers/inventory.ts` (batch creation)
- `server/routers/photography.ts`
- `server/services/liveCatalogService.ts`
- `client/src/pages/PurchaseOrder*.tsx`
- `client/src/pages/Receiving*.tsx`
- `client/src/pages/Photography*.tsx`

**Do NOT modify**: 
- Sales files (Wave 5A domain)
- Accounting files (Wave 5C domain)

---

## Task 1: Purchase Order Creation (2 hours)

### Backend: Purchase Order Router

```typescript
// server/routers/purchaseOrders.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { purchaseOrders, purchaseOrderItems, vendors, products } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../lib/logger';

const poItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
  unitCost: z.number().min(0),
  notes: z.string().optional(),
});

const createPOSchema = z.object({
  vendorId: z.number(),
  items: z.array(poItemSchema).min(1),
  expectedDeliveryDate: z.date().optional(),
  notes: z.string().optional(),
  shippingAddress: z.string().optional(),
});

export const purchaseOrdersRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'submitted', 'confirmed', 'shipped', 'partial', 'received', 'cancelled']).optional(),
      vendorId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.status) conditions.push(eq(purchaseOrders.status, input.status));
      if (input.vendorId) conditions.push(eq(purchaseOrders.vendorId, input.vendorId));

      return db.query.purchaseOrders.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          vendor: true,
          items: { with: { product: true } },
          createdBy: { columns: { id: true, name: true } },
        },
        orderBy: desc(purchaseOrders.createdAt),
        limit: input.limit,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const po = await db.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, input.id),
        with: {
          vendor: true,
          items: { 
            with: { 
              product: true,
              receivedBatches: true,
            } 
          },
          createdBy: { columns: { id: true, name: true } },
        },
      });

      if (!po) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
      }

      return po;
    }),

  create: protectedProcedure
    .input(createPOSchema)
    .mutation(async ({ ctx, input }) => {
      logger.info('[PO] Creating purchase order', { vendorId: input.vendorId, itemCount: input.items.length });

      // Validate vendor exists
      const vendor = await db.query.vendors.findFirst({
        where: eq(vendors.id, input.vendorId),
      });
      if (!vendor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' });
      }

      // Calculate totals
      const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

      // Generate PO number
      const poNumber = await generatePONumber();

      // Create PO
      const [po] = await db.insert(purchaseOrders).values({
        poNumber,
        vendorId: input.vendorId,
        status: 'draft',
        subtotal,
        total: subtotal,
        expectedDeliveryDate: input.expectedDeliveryDate,
        notes: input.notes,
        shippingAddress: input.shippingAddress,
        createdById: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      // Create PO items
      await db.insert(purchaseOrderItems).values(
        input.items.map(item => ({
          purchaseOrderId: po.id,
          productId: item.productId,
          orderedQuantity: item.quantity,
          receivedQuantity: 0,
          unitCost: item.unitCost,
          total: item.quantity * item.unitCost,
          notes: item.notes,
        }))
      );

      logger.info('[PO] Purchase order created', { poId: po.id, poNumber });

      return po;
    }),

  submit: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [po] = await db.update(purchaseOrders)
        .set({
          status: 'submitted',
          submittedAt: new Date(),
          submittedById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, input.id))
        .returning();

      logger.info('[PO] Purchase order submitted', { poId: input.id });

      return po;
    }),

  confirm: protectedProcedure
    .input(z.object({
      id: z.number(),
      vendorConfirmationNumber: z.string().optional(),
      confirmedDeliveryDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const [po] = await db.update(purchaseOrders)
        .set({
          status: 'confirmed',
          vendorConfirmationNumber: input.vendorConfirmationNumber,
          confirmedDeliveryDate: input.confirmedDeliveryDate,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, input.id))
        .returning();

      logger.info('[PO] Purchase order confirmed', { poId: input.id });

      return po;
    }),
});

async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.select({ count: sql<number>`count(*)` })
    .from(purchaseOrders)
    .where(sql`EXTRACT(YEAR FROM created_at) = ${year}`);
  const num = (count[0]?.count || 0) + 1;
  return `PO-${year}-${String(num).padStart(5, '0')}`;
}
```

---

## Task 2: Goods Receiving (2.5 hours)

### Backend: Receiving Router

```typescript
// server/routers/receiving.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { batches, purchaseOrderItems, purchaseOrders, batchLocations, locations } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../lib/logger';

const receiveItemSchema = z.object({
  poItemId: z.number(),
  quantity: z.number().min(1),
  locationId: z.number(),
  lotNumber: z.string().optional(),
  expirationDate: z.date().optional(),
  notes: z.string().optional(),
});

export const receivingRouter = router({
  receiveGoods: protectedProcedure
    .input(z.object({
      purchaseOrderId: z.number(),
      items: z.array(receiveItemSchema).min(1),
      receivingNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[Receiving] Receiving goods', { poId: input.purchaseOrderId, itemCount: input.items.length });

      const po = await db.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, input.purchaseOrderId),
        with: { items: { with: { product: true } }, vendor: true },
      });

      if (!po) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
      }

      if (!['confirmed', 'shipped', 'partial'].includes(po.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Purchase order cannot be received' });
      }

      const createdBatches = [];

      for (const item of input.items) {
        const poItem = po.items.find(i => i.id === item.poItemId);
        if (!poItem) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `PO item ${item.poItemId} not found` });
        }

        // Validate location
        const location = await db.query.locations.findFirst({
          where: eq(locations.id, item.locationId),
        });
        if (!location) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Location not found' });
        }

        // Check if receiving more than ordered
        const remainingToReceive = poItem.orderedQuantity - poItem.receivedQuantity;
        if (item.quantity > remainingToReceive) {
          logger.warn('[Receiving] Receiving more than ordered', {
            poItemId: item.poItemId,
            ordered: poItem.orderedQuantity,
            alreadyReceived: poItem.receivedQuantity,
            receiving: item.quantity,
          });
        }

        // Generate batch code
        const batchCode = await generateBatchCode(poItem.product.sku);

        // Create batch
        const [batch] = await db.insert(batches).values({
          code: batchCode,
          sku: poItem.product.sku,
          productId: poItem.productId,
          vendorId: po.vendorId,
          purchaseOrderItemId: poItem.id,
          quantity: item.quantity,
          reservedQuantity: 0,
          unitCost: poItem.unitCost,
          totalCost: item.quantity * poItem.unitCost,
          lotNumber: item.lotNumber,
          expirationDate: item.expirationDate,
          status: 'awaiting_intake',
          receivedAt: new Date(),
          receivedById: ctx.user.id,
          notes: item.notes,
          createdAt: new Date(),
        }).returning();

        // Create batch location
        await db.insert(batchLocations).values({
          batchId: batch.id,
          locationId: item.locationId,
          quantity: item.quantity,
          createdAt: new Date(),
        });

        // Update PO item received quantity
        await db.update(purchaseOrderItems)
          .set({
            receivedQuantity: sql`received_quantity + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(purchaseOrderItems.id, item.poItemId));

        createdBatches.push(batch);

        logger.info('[Receiving] Batch created', { batchId: batch.id, batchCode, quantity: item.quantity });
      }

      // Update PO status
      const updatedPO = await db.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, input.purchaseOrderId),
        with: { items: true },
      });

      const allReceived = updatedPO?.items.every(item => item.receivedQuantity >= item.orderedQuantity);
      const anyReceived = updatedPO?.items.some(item => item.receivedQuantity > 0);

      const newStatus = allReceived ? 'received' : (anyReceived ? 'partial' : po.status);

      await db.update(purchaseOrders)
        .set({
          status: newStatus,
          receivedAt: allReceived ? new Date() : null,
          receivingNotes: input.receivingNotes,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, input.purchaseOrderId));

      logger.info('[Receiving] Goods received', { poId: input.purchaseOrderId, newStatus, batchCount: createdBatches.length });

      return { batches: createdBatches, purchaseOrderStatus: newStatus };
    }),

  getPendingReceiving: protectedProcedure
    .query(async () => {
      return db.query.purchaseOrders.findMany({
        where: and(
          eq(purchaseOrders.status, 'confirmed'),
          // or status = 'shipped' or status = 'partial'
        ),
        with: {
          vendor: true,
          items: { with: { product: true } },
        },
        orderBy: purchaseOrders.expectedDeliveryDate,
      });
    }),
});

async function generateBatchCode(sku: string): Promise<string> {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const count = await db.select({ count: sql<number>`count(*)` })
    .from(batches)
    .where(sql`DATE(created_at) = CURRENT_DATE`);
  const seq = String((count[0]?.count || 0) + 1).padStart(3, '0');
  return `${sku}-${dateStr}-${seq}`;
}
```

---

## Task 3: Photography Workflow (2 hours)

### Backend: Photography Router

```typescript
// server/routers/photography.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { batches, batchPhotos } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../lib/logger';
import { uploadToS3, deleteFromS3 } from '../lib/s3';

export const photographyRouter = router({
  getQueue: protectedProcedure
    .input(z.object({
      status: z.enum(['awaiting_photography', 'in_progress']).optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(batches.status, input.status || 'awaiting_photography'),
      ];

      return db.query.batches.findMany({
        where: and(...conditions),
        with: {
          product: true,
          vendor: true,
          photos: true,
        },
        orderBy: batches.receivedAt,
      });
    }),

  startSession: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await db.query.batches.findFirst({
        where: eq(batches.id, input.batchId),
      });

      if (!batch) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });
      }

      if (batch.status !== 'awaiting_photography') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Batch not awaiting photography' });
      }

      const [updated] = await db.update(batches)
        .set({
          status: 'in_progress',
          photographyStartedAt: new Date(),
          photographyById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, input.batchId))
        .returning();

      logger.info('[Photography] Session started', { batchId: input.batchId });

      return updated;
    }),

  uploadPhoto: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      photoData: z.string(), // base64
      photoType: z.enum(['primary', 'secondary', 'detail', 'packaging']),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const batch = await db.query.batches.findFirst({
        where: eq(batches.id, input.batchId),
      });

      if (!batch) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });
      }

      // Upload to S3
      const buffer = Buffer.from(input.photoData, 'base64');
      const key = `batches/${batch.code}/${input.photoType}-${Date.now()}.jpg`;
      const url = await uploadToS3(buffer, key, 'image/jpeg');

      // Create photo record
      const [photo] = await db.insert(batchPhotos).values({
        batchId: input.batchId,
        url,
        s3Key: key,
        photoType: input.photoType,
        sortOrder: input.sortOrder || 0,
        uploadedById: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      logger.info('[Photography] Photo uploaded', { batchId: input.batchId, photoId: photo.id });

      return photo;
    }),

  completeSession: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await db.query.batches.findFirst({
        where: eq(batches.id, input.batchId),
        with: { photos: true },
      });

      if (!batch) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });
      }

      // Require at least one primary photo
      const hasPrimary = batch.photos.some(p => p.photoType === 'primary');
      if (!hasPrimary) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'At least one primary photo is required' });
      }

      const [updated] = await db.update(batches)
        .set({
          status: 'ready_for_sale',
          photographyCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(batches.id, input.batchId))
        .returning();

      logger.info('[Photography] Session completed', { batchId: input.batchId, photoCount: batch.photos.length });

      return updated;
    }),

  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.number() }))
    .mutation(async ({ input }) => {
      const photo = await db.query.batchPhotos.findFirst({
        where: eq(batchPhotos.id, input.photoId),
      });

      if (!photo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
      }

      // Delete from S3
      await deleteFromS3(photo.s3Key);

      // Delete record
      await db.delete(batchPhotos).where(eq(batchPhotos.id, input.photoId));

      logger.info('[Photography] Photo deleted', { photoId: input.photoId });

      return { success: true };
    }),
});
```

---

## Task 4: Catalog Publishing (2 hours)

### Backend: Live Catalog Service

```typescript
// server/services/liveCatalogService.ts

import { db } from '../db';
import { batches, catalogItems, batchPhotos } from '../db/schema';
import { eq, and, gt, inArray } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { safeInArray } from '../lib/sqlSafety';

export async function publishBatchToCatalog(batchId: number, publishedById: number): Promise<void> {
  logger.info('[Catalog] Publishing batch to catalog', { batchId });

  const batch = await db.query.batches.findFirst({
    where: eq(batches.id, batchId),
    with: {
      product: true,
      photos: true,
      vendor: true,
    },
  });

  if (!batch) {
    throw new Error('Batch not found');
  }

  if (batch.status !== 'ready_for_sale') {
    throw new Error('Batch not ready for sale');
  }

  if (batch.quantity <= 0) {
    throw new Error('Batch has no available quantity');
  }

  // Check if already in catalog
  const existing = await db.query.catalogItems.findFirst({
    where: eq(catalogItems.batchId, batchId),
  });

  if (existing) {
    // Update existing catalog item
    await db.update(catalogItems)
      .set({
        availableQuantity: batch.quantity - batch.reservedQuantity,
        updatedAt: new Date(),
      })
      .where(eq(catalogItems.id, existing.id));

    logger.info('[Catalog] Catalog item updated', { catalogItemId: existing.id });
  } else {
    // Create new catalog item
    const primaryPhoto = batch.photos.find(p => p.photoType === 'primary');

    const [catalogItem] = await db.insert(catalogItems).values({
      batchId: batch.id,
      productId: batch.productId,
      name: batch.product.name,
      description: batch.product.description,
      category: batch.product.category,
      subcategory: batch.product.subcategory,
      strain: batch.product.strain,
      thcPercentage: batch.thcPercentage,
      cbdPercentage: batch.cbdPercentage,
      availableQuantity: batch.quantity - batch.reservedQuantity,
      unitOfMeasure: batch.product.unitOfMeasure,
      primaryPhotoUrl: primaryPhoto?.url,
      isActive: true,
      publishedAt: new Date(),
      publishedById,
      createdAt: new Date(),
    }).returning();

    // Update batch status
    await db.update(batches)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(batches.id, batchId));

    logger.info('[Catalog] Batch published to catalog', { batchId, catalogItemId: catalogItem.id });
  }
}

export async function unpublishBatchFromCatalog(batchId: number): Promise<void> {
  logger.info('[Catalog] Unpublishing batch from catalog', { batchId });

  await db.update(catalogItems)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(catalogItems.batchId, batchId));

  await db.update(batches)
    .set({
      status: 'ready_for_sale',
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(batches.id, batchId));

  logger.info('[Catalog] Batch unpublished', { batchId });
}

export async function syncCatalogQuantities(): Promise<void> {
  logger.info('[Catalog] Syncing catalog quantities');

  const activeCatalogItems = await db.query.catalogItems.findMany({
    where: eq(catalogItems.isActive, true),
    with: { batch: true },
  });

  for (const item of activeCatalogItems) {
    const availableQty = item.batch.quantity - item.batch.reservedQuantity;

    if (availableQty !== item.availableQuantity) {
      await db.update(catalogItems)
        .set({
          availableQuantity: availableQty,
          updatedAt: new Date(),
        })
        .where(eq(catalogItems.id, item.id));

      // Auto-unpublish if no quantity
      if (availableQty <= 0) {
        await db.update(catalogItems)
          .set({ isActive: false })
          .where(eq(catalogItems.id, item.id));
        
        logger.info('[Catalog] Auto-unpublished item with no quantity', { catalogItemId: item.id });
      }
    }
  }

  logger.info('[Catalog] Catalog sync complete');
}
```

### Backend: Catalog Router

```typescript
// server/routers/catalog.ts

export const catalogRouter = router({
  publish: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await publishBatchToCatalog(input.batchId, ctx.user.id);
      return { success: true };
    }),

  unpublish: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ input }) => {
      await unpublishBatchFromCatalog(input.batchId);
      return { success: true };
    }),

  getPublicCatalog: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(catalogItems.isActive, true),
        gt(catalogItems.availableQuantity, 0),
      ];

      if (input.category) {
        conditions.push(eq(catalogItems.category, input.category));
      }

      return db.query.catalogItems.findMany({
        where: and(...conditions),
        with: {
          batch: {
            with: {
              photos: true,
            },
          },
        },
        orderBy: desc(catalogItems.publishedAt),
        limit: input.limit,
      });
    }),
});
```

---

## Git Workflow

```bash
git checkout -b feat/wave-5b-inventory-workflow

# Purchase order creation
git add server/routers/purchaseOrders.ts client/src/pages/PurchaseOrder*.tsx
git commit -m "feat(INV-1): Implement purchase order creation and management"

# Goods receiving
git add server/routers/receiving.ts client/src/pages/Receiving*.tsx
git commit -m "feat(INV-2): Implement goods receiving with batch creation"

# Photography workflow
git add server/routers/photography.ts client/src/pages/Photography*.tsx
git commit -m "feat(INV-3): Implement photography workflow"

# Catalog publishing
git add server/services/liveCatalogService.ts server/routers/catalog.ts
git commit -m "feat(INV-4): Implement catalog publishing"

git push origin feat/wave-5b-inventory-workflow
gh pr create --title "Wave 5B: Inventory Workflow Completion" --body "
## Summary
Complete end-to-end inventory workflow: PO → Receive → Batch → Photography → Catalog

## Changes
- Purchase order creation and management
- Goods receiving with batch creation
- Photography workflow with S3 upload
- Catalog publishing and sync

## Testing
- [ ] Can create purchase order
- [ ] Can receive goods and create batches
- [ ] Can photograph batches
- [ ] Can publish to catalog
- [ ] Quantities sync correctly

## Parallel Safety
Only touches inventory-related files
"
```

---

## Success Criteria

- [ ] PO creation works
- [ ] Goods receiving creates batches
- [ ] Batches have correct status flow
- [ ] Photography uploads to S3
- [ ] Catalog publishing works
- [ ] Quantity sync is accurate
- [ ] Full workflow tested end-to-end

---

## Handoff

After Wave 5B completion:

1. PR ready for review
2. Document the complete workflow
3. Coordinate merge with Wave 5A/5C

**Merge Order**: 5B can merge independently
