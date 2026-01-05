# PARALLEL Wave 3: Inventory Lifecycle - Agent Prompt

**⚡ PARALLEL EXECUTION MODE**
You are running in parallel with Wave 1 (Sales) and Wave 4 (Operations).
DO NOT touch files outside your assigned scope.

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP system for cannabis businesses managing inventory, sales, VIP portal, accounting, and operations.

**Production URL:** https://terp-app-b9s35.ondigitalocean.app
**Repository:** https://github.com/EvanTenenbaum/TERP

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
❌ Touch files outside YOUR SCOPE (see below)
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Commit frequently with clear messages
✅ Verify deployment succeeds
```

---

## 🔒 YOUR EXCLUSIVE FILE SCOPE

**You own these files - ONLY touch these:**

### Client Pages
```
client/src/pages/PhotographyPage.tsx     ← PRIMARY TARGET (@ts-nocheck)
client/src/pages/VendorsPage.tsx
client/src/pages/PurchaseOrdersPage.tsx
client/src/pages/ProductsPage.tsx
```

### Server Routers
```
server/routers/photography.ts    ← PRIMARY TARGET (@ts-nocheck)
server/routers/inventory.ts
server/routers/vendors.ts
server/routers/purchaseOrders.ts
server/routers/products.ts
```

### Shared (READ ONLY - coordinate before editing)
```
server/routers/batches.ts  ← Shared - READ ONLY
```

**⛔ DO NOT TOUCH (Other agents own these):**
```
# Wave 1 owns:
client/src/pages/UnifiedSalesPortalPage.tsx
server/routers/orders.ts
server/routers/quotes.ts
server/routers/unifiedSalesPortal.ts

# Wave 4 owns:
client/src/pages/NotificationsPage.tsx
client/src/pages/settings/NotificationPreferences.tsx
server/routers/notifications.ts
server/routers/calendar.ts
```

---

## 📋 Schema Reference

### Products Table
```typescript
// ✅ EXIST:
products.id, products.brandId, products.strainId
products.nameCanonical  // NOT "name"
products.category, products.subcategory

// ❌ DO NOT EXIST:
products.name           // Use nameCanonical
products.sku            // SKU is on batches
```

### Batches Table
```typescript
// ✅ EXIST:
batches.id, batches.code, batches.sku
batches.productId, batches.lotId
batches.batchStatus
batches.onHandQty       // NOT "quantity"
batches.metadata        // JSON field
batches.publishEcom, batches.publishB2b

// ❌ DO NOT EXIST:
batches.quantity        // Use onHandQty
batches.batchNumber     // Use code
```

### Strains Table (for joins)
```typescript
strains.id, strains.name, strains.type
strains.thcPotential, strains.cbdPotential
```

---

# PART 2: YOUR TASK - INVENTORY LIFECYCLE

## 🎯 Mission

Ensure users can complete the entire inventory intake process.

**Goal:** Vendor → PO → Receive → Batch → Photo → Publish
**Estimated Time:** 12-17 hours

---

## 📋 Task Checklist

### Task 1: Fix PhotographyPage (3-4 hours)
**Path:** `client/src/pages/PhotographyPage.tsx`

```bash
# Check if it has @ts-nocheck
head -3 client/src/pages/PhotographyPage.tsx

# If yes, remove and fix
sed -i '1d' client/src/pages/PhotographyPage.tsx
pnpm check 2>&1 | grep "PhotographyPage"
```

**Likely Issues:**
- Batch type mismatches (code vs batchNumber)
- Product name references (nameCanonical vs name)
- Image upload type handling

### Task 2: Fix Photography Router (3-4 hours)
**Path:** `server/routers/photography.ts`

```bash
head -3 server/routers/photography.ts
# If @ts-nocheck, remove and fix
sed -i '1d' server/routers/photography.ts
pnpm check 2>&1 | grep "photography.ts"
```

**Likely Issues:**
- Batch/product joins
- Strain name lookups (need to join strains table)

### Task 3: Verify Intake Flow (2-3 hours)

Test:
1. Create or select a vendor
2. Create a purchase order
3. Receive goods (create batch)
4. Verify batch appears in inventory

### Task 4: Verify Photography → Publish Flow (3-4 hours)

Test:
1. Select batch needing photos
2. Upload images
3. Set primary image
4. Publish batch (publishEcom or publishB2b)
5. Verify in catalog

---

## 🔧 Common Fixes

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
// Strain is on products via strainId, not directly on batches
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

### Fix 4: Quantity Field
```typescript
// Before (error)
const qty = batch.quantity;

// After (fixed)
const qty = batch.onHandQty;
```

---

## ✅ Exit Criteria

Wave 3 is complete when:

- [ ] `PhotographyPage.tsx` has no @ts-nocheck
- [ ] `server/routers/photography.ts` has no @ts-nocheck
- [ ] Can create vendor and PO
- [ ] Can receive goods and create batch
- [ ] Can photograph batch
- [ ] Can publish batch to catalog
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Deployment verified

---

## 🔄 Git Workflow

```bash
# After each fix
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

If blocked:
1. Document in `WAVE_3_BLOCKERS.md`
2. Move to next task
3. Flag for human review

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass (Wave 0 complete)

# Start with PhotographyPage
head -3 client/src/pages/PhotographyPage.tsx
```

**Remember: Stay in your lane - only touch YOUR files!**
