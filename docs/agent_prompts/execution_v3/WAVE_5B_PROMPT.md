# Wave 5B: Inventory Workflow Completion

**Agent Role**: Full Stack Developer  
**Duration**: 8-10 hours  
**Priority**: P1  
**Timeline**: Week 2-3  
**Can Run Parallel With**: Wave 5A, 5C

---

## Overview

Complete the end-to-end inventory workflow from vendor creation through batch publishing to the catalog.

---

## Workflow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Create    │───▶│   Create    │───▶│   Receive   │
│   Vendor    │    │     PO      │    │    Goods    │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
                                            ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Publish   │◀───│ Photograph  │◀───│   Create    │
│  to Catalog │    │    Batch    │    │    Batch    │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## Task 1: Vendor Creation (1.5 hours)

### Verify Current State

```bash
grep -rn "vendor" server/routers/ --include="*.ts"
grep -rn "Vendor" client/src/pages/ --include="*.tsx"
```

### Backend: Vendor Router

```typescript
// server/routers/vendors.ts

export const vendorsRouter = router({
  create: protectedProcedure
    .input(createVendorSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate
      const existing = await db.query.vendors.findFirst({
        where: or(
          eq(vendors.name, input.name),
          input.email ? eq(vendors.email, input.email) : undefined
        ),
      });
      
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A vendor with this name or email already exists',
        });
      }

      const [vendor] = await db.insert(vendors).values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        contactName: input.contactName,
        paymentTerms: input.paymentTerms ?? 30,
        notes: input.notes,
        createdBy: ctx.user.id,
      }).returning();

      await logAudit({
        action: 'CREATE',
        entityType: 'vendor',
        entityId: vendor.id,
        userId: ctx.user.id,
      });

      return vendor;
    }),

  list: protectedProcedure
    .input(listVendorsSchema.optional())
    .query(async ({ input }) => {
      return db.query.vendors.findMany({
        where: input?.search 
          ? ilike(vendors.name, `%${input.search}%`)
          : undefined,
        orderBy: asc(vendors.name),
        limit: input?.limit ?? 100,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const vendor = await db.query.vendors.findFirst({
        where: eq(vendors.id, input.id),
        with: {
          purchaseOrders: {
            orderBy: desc(purchaseOrders.createdAt),
            limit: 10,
          },
          batches: {
            orderBy: desc(batches.createdAt),
            limit: 10,
          },
        },
      });

      if (!vendor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' });
      }

      return vendor;
    }),

  update: protectedProcedure
    .input(updateVendorSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      
      await db.update(vendors)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(vendors.id, id));

      await logAudit({
        action: 'UPDATE',
        entityType: 'vendor',
        entityId: id,
        userId: ctx.user.id,
        details: updates,
      });

      return { success: true };
    }),
});
```

### Frontend: Vendor Form

```typescript
// client/src/components/vendors/VendorForm.tsx

const vendorFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactName: z.string().optional(),
  paymentTerms: z.number().min(0).max(365).default(30),
  notes: z.string().optional(),
});

export function VendorForm({ vendor, onSuccess }: VendorFormProps) {
  const form = useForm<z.infer<typeof vendorFormSchema>>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: vendor ?? { paymentTerms: 30 },
  });

  const createVendor = trpc.vendors.create.useMutation({
    onSuccess: (data) => {
      toast.success('Vendor created');
      onSuccess?.(data);
    },
  });

  const updateVendor = trpc.vendors.update.useMutation({
    onSuccess: () => {
      toast.success('Vendor updated');
      onSuccess?.();
    },
  });

  const onSubmit = (data: z.infer<typeof vendorFormSchema>) => {
    if (vendor) {
      updateVendor.mutate({ id: vendor.id, ...data });
    } else {
      createVendor.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="name" label="Vendor Name" required />
        <FormField name="contactName" label="Contact Name" />
        <FormField name="email" label="Email" type="email" />
        <FormField name="phone" label="Phone" />
        <FormField name="address" label="Address" />
        <FormField name="paymentTerms" label="Payment Terms (days)" type="number" />
        <FormField name="notes" label="Notes" multiline />
        
        <Button type="submit" disabled={createVendor.isLoading || updateVendor.isLoading}>
          {vendor ? 'Update Vendor' : 'Create Vendor'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Task 2: Purchase Order Creation (2 hours)

### Backend: Purchase Order Router

```typescript
// server/routers/purchaseOrders.ts

export const purchaseOrdersRouter = router({
  create: protectedProcedure
    .input(createPOSchema)
    .mutation(async ({ ctx, input }) => {
      const vendor = await getVendor(input.vendorId);
      if (!vendor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' });
      }

      const po = await db.transaction(async (tx) => {
        const [po] = await tx.insert(purchaseOrders).values({
          vendorId: input.vendorId,
          poNumber: await generatePONumber(tx),
          status: 'draft',
          expectedDeliveryDate: input.expectedDeliveryDate,
          notes: input.notes,
          createdBy: ctx.user.id,
        }).returning();

        if (input.items?.length > 0) {
          await tx.insert(purchaseOrderItems).values(
            input.items.map(item => ({
              purchaseOrderId: po.id,
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
            }))
          );
        }

        return po;
      });

      return po;
    }),

  submit: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const po = await getPO(input.id);
      
      if (po.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft POs can be submitted',
        });
      }

      await db.update(purchaseOrders)
        .set({ 
          status: 'submitted',
          submittedAt: new Date(),
          submittedBy: ctx.user.id,
        })
        .where(eq(purchaseOrders.id, input.id));

      // Send to vendor if email configured
      const vendor = await getVendor(po.vendorId);
      if (vendor.email) {
        await sendPOEmail(po, vendor);
      }

      return { success: true };
    }),

  receive: protectedProcedure
    .input(receivePOSchema)
    .mutation(async ({ ctx, input }) => {
      const po = await getPOWithItems(input.id);
      
      if (!['submitted', 'partial'].includes(po.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'PO is not in a receivable state',
        });
      }

      const batches = await db.transaction(async (tx) => {
        const createdBatches = [];

        for (const receipt of input.receipts) {
          const poItem = po.items.find(i => i.id === receipt.poItemId);
          if (!poItem) continue;

          // Create batch for received goods
          const [batch] = await tx.insert(batches).values({
            productId: poItem.productId,
            vendorId: po.vendorId,
            purchaseOrderId: po.id,
            code: await generateBatchCode(tx),
            quantity: receipt.receivedQuantity,
            unitCost: poItem.unitCost,
            status: 'received',
            receivedAt: new Date(),
            receivedBy: ctx.user.id,
            locationId: receipt.locationId,
          }).returning();

          createdBatches.push(batch);

          // Update PO item received quantity
          await tx.update(purchaseOrderItems)
            .set({ 
              receivedQuantity: sql`${purchaseOrderItems.receivedQuantity} + ${receipt.receivedQuantity}`,
            })
            .where(eq(purchaseOrderItems.id, receipt.poItemId));
        }

        // Update PO status
        const allReceived = await checkAllItemsReceived(tx, po.id);
        await tx.update(purchaseOrders)
          .set({ 
            status: allReceived ? 'received' : 'partial',
            receivedAt: allReceived ? new Date() : null,
          })
          .where(eq(purchaseOrders.id, po.id));

        return createdBatches;
      });

      return { batches };
    }),
});
```

---

## Task 3: Goods Receiving & Batch Creation (2 hours)

### BUG-028: Batch Form Input Fields

**File**: `client/src/components/inventory/BatchForm.tsx`

```typescript
// Ensure all form fields are functional
export function BatchForm({ batch, onSuccess }: BatchFormProps) {
  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: batch ?? {
      quantity: 0,
      status: 'received',
    },
  });

  // Ensure controlled inputs
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
              <ProductSelector 
                value={field.value} 
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field}
                  onChange={e => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unitCost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Cost</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01"
                  {...field}
                  onChange={e => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Add all other fields similarly */}
      </form>
    </Form>
  );
}
```

### Receiving Interface

```typescript
// client/src/pages/ReceiveGoodsPage.tsx

export function ReceiveGoodsPage() {
  const { poId } = useParams();
  const { data: po } = trpc.purchaseOrders.getById.useQuery({ id: Number(poId) });
  
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  
  const receivePO = trpc.purchaseOrders.receive.useMutation({
    onSuccess: ({ batches }) => {
      toast.success(`Received ${batches.length} batches`);
      navigate('/inventory');
    },
  });

  return (
    <div className="space-y-6">
      <h1>Receive Goods - PO #{po?.poNumber}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Items to Receive</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Previously Received</TableHead>
                <TableHead>Receiving Now</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po?.items.map(item => (
                <ReceiveItemRow
                  key={item.id}
                  item={item}
                  receipt={receipts.find(r => r.poItemId === item.id)}
                  onReceiptChange={(receipt) => {
                    setReceipts(prev => {
                      const filtered = prev.filter(r => r.poItemId !== item.id);
                      return receipt.receivedQuantity > 0 
                        ? [...filtered, receipt]
                        : filtered;
                    });
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button 
        onClick={() => receivePO.mutate({ id: Number(poId), receipts })}
        disabled={receipts.length === 0 || receivePO.isLoading}
      >
        Receive Selected Items
      </Button>
    </div>
  );
}
```

---

## Task 4: Batch Photography (1.5 hours)

### Backend: Photo Upload

```typescript
// server/routers/batches.ts

uploadPhotos: protectedProcedure
  .input(z.object({
    batchId: z.number(),
    photos: z.array(z.object({
      url: z.string().url(),
      isPrimary: z.boolean().default(false),
      caption: z.string().optional(),
    })),
  }))
  .mutation(async ({ ctx, input }) => {
    const batch = await getBatch(input.batchId);
    if (!batch) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });
    }

    // If setting a new primary, unset existing
    if (input.photos.some(p => p.isPrimary)) {
      await db.update(batchPhotos)
        .set({ isPrimary: false })
        .where(eq(batchPhotos.batchId, input.batchId));
    }

    await db.insert(batchPhotos).values(
      input.photos.map(photo => ({
        batchId: input.batchId,
        url: photo.url,
        isPrimary: photo.isPrimary,
        caption: photo.caption,
        uploadedBy: ctx.user.id,
      }))
    );

    // Update batch status if first photos
    if (batch.status === 'received') {
      await db.update(batches)
        .set({ status: 'photographed' })
        .where(eq(batches.id, input.batchId));
    }

    return { success: true };
  }),
```

### Frontend: Photo Upload Component

```typescript
// client/src/components/inventory/BatchPhotoUpload.tsx

export function BatchPhotoUpload({ batchId }: { batchId: number }) {
  const [uploading, setUploading] = useState(false);
  const { data: batch, refetch } = trpc.batches.getById.useQuery({ id: batchId });
  
  const uploadPhotos = trpc.batches.uploadPhotos.useMutation({
    onSuccess: () => {
      toast.success('Photos uploaded');
      refetch();
    },
  });

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploadedUrls = await Promise.all(
        Array.from(files).map(file => uploadToS3(file))
      );
      
      await uploadPhotos.mutateAsync({
        batchId,
        photos: uploadedUrls.map((url, i) => ({
          url,
          isPrimary: i === 0 && !batch?.photos?.length,
        })),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {batch?.photos?.map(photo => (
          <div key={photo.id} className="relative">
            <img src={photo.url} alt="" className="rounded-lg" />
            {photo.isPrimary && (
              <Badge className="absolute top-2 left-2">Primary</Badge>
            )}
          </div>
        ))}
      </div>
      
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          disabled={uploading}
        />
        <p className="text-muted-foreground mt-2">
          Drag & drop photos or click to browse
        </p>
      </div>
    </div>
  );
}
```

---

## Task 5: Batch Publishing to Catalog (1.5 hours)

### Backend: Publish Batch

```typescript
// server/routers/batches.ts

publish: protectedProcedure
  .input(z.object({
    batchId: z.number(),
    pricing: z.object({
      basePrice: z.number().positive(),
      tierPricing: z.array(z.object({
        minQuantity: z.number(),
        price: z.number(),
      })).optional(),
    }),
  }))
  .mutation(async ({ ctx, input }) => {
    const batch = await getBatchWithPhotos(input.batchId);
    
    if (!batch) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });
    }

    // Validation
    if (!batch.photos?.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Batch must have at least one photo before publishing',
      });
    }

    if (batch.quantity <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Batch must have available quantity to publish',
      });
    }

    await db.transaction(async (tx) => {
      // Update batch status and pricing
      await tx.update(batches)
        .set({
          status: 'published',
          publishedAt: new Date(),
          publishedBy: ctx.user.id,
          basePrice: input.pricing.basePrice,
        })
        .where(eq(batches.id, input.batchId));

      // Add tier pricing if provided
      if (input.pricing.tierPricing?.length) {
        await tx.insert(batchPricingTiers).values(
          input.pricing.tierPricing.map(tier => ({
            batchId: input.batchId,
            minQuantity: tier.minQuantity,
            price: tier.price,
          }))
        );
      }

      // Add to live catalog
      await tx.insert(catalogItems).values({
        batchId: input.batchId,
        productId: batch.productId,
        isActive: true,
      });
    });

    return { success: true };
  }),

unpublish: protectedProcedure
  .input(z.object({ batchId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    await db.transaction(async (tx) => {
      await tx.update(batches)
        .set({ status: 'photographed' })
        .where(eq(batches.id, input.batchId));

      await tx.delete(catalogItems)
        .where(eq(catalogItems.batchId, input.batchId));
    });

    return { success: true };
  }),
```

### Frontend: Publish Dialog

```typescript
// client/src/components/inventory/PublishBatchDialog.tsx

export function PublishBatchDialog({ batch, open, onClose }: Props) {
  const [basePrice, setBasePrice] = useState(batch.suggestedPrice ?? 0);
  const [tierPricing, setTierPricing] = useState<TierPrice[]>([]);

  const publish = trpc.batches.publish.useMutation({
    onSuccess: () => {
      toast.success('Batch published to catalog');
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish to Catalog</DialogTitle>
          <DialogDescription>
            {batch.product.name} - {batch.code}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Base Price (per unit)</Label>
            <Input
              type="number"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
            />
          </div>

          <div>
            <Label>Volume Pricing (optional)</Label>
            <TierPricingEditor
              tiers={tierPricing}
              onChange={setTierPricing}
            />
          </div>

          <div className="bg-muted p-4 rounded">
            <h4 className="font-medium">Preview</h4>
            <p>Available: {batch.quantity} units</p>
            <p>Base Price: ${basePrice.toFixed(2)}</p>
            {tierPricing.length > 0 && (
              <ul className="text-sm">
                {tierPricing.map((tier, i) => (
                  <li key={i}>{tier.minQuantity}+ units: ${tier.price.toFixed(2)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => publish.mutate({
              batchId: batch.id,
              pricing: { basePrice, tierPricing },
            })}
            disabled={publish.isLoading || basePrice <= 0}
          >
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## QA Tasks

### QA-054: Vendor Supply Management Backend

Ensure all vendor-related endpoints are complete and tested.

---

## Testing Requirements

### End-to-End Test

```typescript
// tests/e2e/inventoryWorkflow.spec.ts

test.describe('Inventory Workflow', () => {
  test('complete inventory cycle', async ({ page }) => {
    // 1. Create vendor
    await page.goto('/vendors/new');
    await page.fill('[name="name"]', 'Test Vendor');
    await page.click('button[type="submit"]');
    
    // 2. Create PO
    await page.goto('/purchase-orders/new');
    await page.click('[data-testid="vendor-selector"]');
    await page.click('text=Test Vendor');
    // ... add items
    await page.click('text=Create PO');
    await page.click('text=Submit PO');
    
    // 3. Receive goods
    await page.click('text=Receive');
    await page.fill('[data-testid="receive-qty-0"]', '100');
    await page.click('text=Receive Selected');
    
    // 4. Photograph batch
    await page.goto('/inventory');
    await page.click('text=View'); // First batch
    await page.setInputFiles('input[type="file"]', 'test-photo.jpg');
    
    // 5. Publish to catalog
    await page.click('text=Publish');
    await page.fill('[name="basePrice"]', '50.00');
    await page.click('text=Publish');
    
    // Verify in catalog
    await page.goto('/catalog');
    await expect(page.locator('text=Test Product')).toBeVisible();
  });
});
```

---

## Git Workflow

```bash
git checkout -b feat/wave-5b-inventory-workflow

git add server/routers/vendors.ts client/src/components/vendors/
git commit -m "feat(INV-1): Implement vendor management"

git add server/routers/purchaseOrders.ts client/src/pages/PurchaseOrdersPage.tsx
git commit -m "feat(INV-2): Implement purchase order creation"

git add server/routers/purchaseOrders.ts client/src/pages/ReceiveGoodsPage.tsx
git commit -m "feat(INV-3): Implement goods receiving and batch creation"

git add server/routers/batches.ts client/src/components/inventory/BatchPhotoUpload.tsx
git commit -m "feat(INV-4): Implement batch photography"

git add server/routers/batches.ts client/src/components/inventory/PublishBatchDialog.tsx
git commit -m "feat(INV-5): Implement batch publishing to catalog"

git push origin feat/wave-5b-inventory-workflow
```

---

## Success Criteria

- [ ] Can create vendor
- [ ] Can create purchase order
- [ ] Can receive goods and create batch
- [ ] Can photograph batch
- [ ] Can publish batch to catalog
- [ ] BUG-028 fixed (batch form inputs)
- [ ] QA-054 complete
- [ ] E2E test passes

---

## Handoff

After Wave 5B completion:

1. Verify batches appear in catalog
2. Coordinate with Wave 5A for order fulfillment integration
3. Update inventory training materials

**Next**: Wave 6A (VIP Portal) uses published catalog
