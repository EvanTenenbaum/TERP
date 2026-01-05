# Wave 3: Complete Inventory Lifecycle - Complete Agent Prompt

**Copy this entire prompt to give to a new agent.**
**Prerequisites:** Wave 0 must be complete.

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP system for cannabis businesses. The **Inventory Lifecycle** covers:
- Vendor management
- Purchase order creation
- Goods receipt and batch creation
- Photography and media
- Publishing to catalog

**Production URL:** https://terp-app-b9s35.ondigitalocean.app
**Repository:** https://github.com/EvanTenenbaum/TERP

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express, tRPC |
| **Database** | MySQL (TiDB), Drizzle ORM |

---

## 🚨 CRITICAL CONSTRAINTS

### NEVER DO:
```
❌ Modify drizzle/schema.ts
❌ Run migrations
❌ Use `: any` types
❌ Add @ts-nocheck or @ts-ignore
❌ Skip tests before committing
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Verify deployment succeeds
```

---

## 📋 Schema Reference

### Vendors Table
```typescript
// ✅ EXIST:
vendors.id, vendors.name, vendors.code
vendors.email, vendors.phone
vendors.address, vendors.notes
vendors.isActive
```

### Products Table
```typescript
// ✅ EXIST:
products.id, products.brandId, products.strainId
products.nameCanonical  // NOT "name"
products.category, products.subcategory
```

### Batches Table
```typescript
// ✅ EXIST:
batches.id, batches.code, batches.sku
batches.productId, batches.lotId
batches.batchStatus
batches.onHandQty       // NOT "quantity"
batches.metadata        // JSON field for extra data
batches.publishEcom, batches.publishB2b
```

### Purchase Orders Table
```typescript
// ✅ EXIST:
purchaseOrders.id, purchaseOrders.poNumber
purchaseOrders.vendorId, purchaseOrders.status
purchaseOrders.expectedDeliveryDate
purchaseOrders.totalAmount
```

---

# PART 2: YOUR TASK - WAVE 3 INVENTORY LIFECYCLE

## 🎯 Mission

Ensure users can complete the entire inventory intake process from vendor to published catalog.

**Goal:** User can: Vendor → PO → Receive → Batch → Photo → Publish
**Estimated Time:** 12-17 hours
**Dependencies:** Wave 0 complete

---

## 📁 Inventory Files

```
client/src/pages/
├── VendorsPage.tsx           # Vendor management (OK)
├── PurchaseOrdersPage.tsx    # PO management (OK)
├── Inventory.tsx             # Batch management (Fixed in Wave 0)
├── ProductsPage.tsx          # Product catalog (OK)
├── PhotographyPage.tsx       # Photo workflow (@ts-nocheck - NEEDS FIX)

server/routers/
├── vendors.ts                # Vendor API (OK)
├── purchaseOrders.ts         # PO API (OK)
├── inventory.ts              # Inventory API (OK)
├── products.ts               # Products API (OK)
├── photography.ts            # Photo API (@ts-nocheck - NEEDS FIX)
```

---

## 📋 Task Checklist

### Task 1: Fix PhotographyPage (3-4 hours)
**Path:** `client/src/pages/PhotographyPage.tsx`

```bash
# Remove @ts-nocheck and check errors
sed -i '1d' client/src/pages/PhotographyPage.tsx
pnpm check 2>&1 | grep "PhotographyPage"
```

**Likely Issues:**
- Batch type mismatches (code vs batchNumber)
- Product name references (nameCanonical)
- Image upload type handling

### Task 2: Fix Photography Router (3-4 hours)
**Path:** `server/routers/photography.ts`

```bash
# Remove @ts-nocheck and check errors
sed -i '1d' server/routers/photography.ts
pnpm check 2>&1 | grep "photography.ts"
```

**Likely Issues:**
- Batch/product joins
- Strain name lookups (need to join strains table)
- Image metadata types

### Task 3: Verify Intake Flow (2-3 hours)

Test the complete flow:
1. Create or select a vendor
2. Create a purchase order
3. Receive goods (create batch)
4. Verify batch appears in inventory

**Files to check:**
- `server/routers/vendors.ts`
- `server/routers/purchaseOrders.ts`
- `server/routers/inventory.ts`

### Task 4: Verify Photography Flow (2-3 hours)

Test the complete flow:
1. Select a batch needing photos
2. Upload images
3. Set primary image
4. Verify images appear on batch

### Task 5: Verify Publish Flow (2-3 hours)

Test the complete flow:
1. Select a batch with photos
2. Set publishEcom or publishB2b to true
3. Verify batch appears in live catalog
4. Verify VIP portal can see the batch

---

## 🔧 Common Photography Fixes

### Fix 1: Batch Code vs BatchNumber
```typescript
// Before (error - batchNumber doesn't exist)
const batchNumber = batch.batchNumber;

// After (fixed)
const batchCode = batch.code;
```

### Fix 2: Product Name
```typescript
// Before (error - name doesn't exist)
const productName = product.name;

// After (fixed)
const productName = product.nameCanonical;
```

### Fix 3: Strain Name (requires join)
```typescript
// The batches table doesn't have strain directly
// Need to join: batches → products → strains

// In router query:
const batchWithStrain = await db.query.batches.findFirst({
  where: eq(batches.id, batchId),
  with: {
    product: {
      with: {
        strain: true
      }
    }
  }
});

// Access strain name:
const strainName = batchWithStrain?.product?.strain?.name ?? 'Unknown';
```

---

## 🧪 End-to-End Test Script

```typescript
// tests/e2e/inventory-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Inventory Lifecycle', () => {
  test('complete intake flow', async ({ page }) => {
    // 1. Go to vendors
    await page.goto('/vendors');
    await expect(page.locator('[data-testid="vendor-list"]')).toBeVisible();

    // 2. Create PO
    await page.goto('/purchase-orders');
    await page.click('[data-testid="new-po"]');
    // ... fill PO form

    // 3. Receive goods
    await page.click('[data-testid="receive-goods"]');
    // ... create batch

    // 4. Verify in inventory
    await page.goto('/inventory');
    await expect(page.locator('[data-testid="batch-row"]').first()).toBeVisible();
  });

  test('photography workflow', async ({ page }) => {
    await page.goto('/photography');
    
    // Select batch needing photos
    await page.click('[data-testid="batch-needing-photos"]');
    
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-image.jpg');
    
    // Verify upload
    await expect(page.locator('[data-testid="uploaded-image"]')).toBeVisible();
  });
});
```

---

## ✅ Exit Criteria

Wave 3 is complete when:

- [ ] `PhotographyPage.tsx` has no @ts-nocheck
- [ ] `server/routers/photography.ts` has no @ts-nocheck
- [ ] Can create vendor
- [ ] Can create purchase order
- [ ] Can receive goods and create batch
- [ ] Can photograph batch
- [ ] Can publish batch to catalog
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Deployment verified successful

---

## 🔄 Git Workflow

```bash
# After each task
pnpm check && pnpm test
git add -A
git commit -m "fix(inventory): [description]"
git push origin main

# Verify deployment
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md
```

---

## 🆘 Escalation

If you encounter issues:
1. Document in `WAVE_3_BLOCKERS.md`
2. Include file, line, error, attempts
3. Move to next task
4. Flag for human review

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass

# Start with PhotographyPage
sed -i '1d' client/src/pages/PhotographyPage.tsx
pnpm check 2>&1 | grep "PhotographyPage"
```

**Good luck! Focus on the complete inventory intake workflow.**
