# Wave 1: Schema Alignment Agent Prompt

**Version:** 1.0
**Created:** January 4, 2026
**Priority:** P0 - BLOCKING
**Estimated Duration:** 6-8 hours

---

## Mission Statement

You are a senior TypeScript engineer tasked with fixing schema mismatches in the TERP codebase. Your goal is to remove all `@ts-nocheck` directives by updating code to use the correct database column names. This is the **highest priority task** - all other development is blocked until this is complete.

---

## Pre-Flight Checklist

Before writing any code, execute these commands and verify all pass:

```bash
# 1. Clone and setup
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install

# 2. Verify current state
pnpm check 2>&1 | grep "error TS" | wc -l
# Expected: 0 (but fragile due to @ts-nocheck)

# 3. Count @ts-nocheck files
grep -r "@ts-nocheck" --include="*.ts" --include="*.tsx" -l | wc -l
# Expected: 25

# 4. Verify you're on main branch
git branch --show-current
# Expected: main

# 5. Create feature branch
git checkout -b wave-1/schema-alignment
```

**If any check fails, STOP and report the issue before proceeding.**

---

## Schema Reference

### Products Table
```typescript
// ACTUAL COLUMNS (use these):
products.id
products.brandId
products.strainId
products.nameCanonical  // NOT "name"
products.category
products.subcategory
products.uomSellable
products.description
products.createdAt
products.updatedAt
products.deletedAt

// DOES NOT EXIST (remove references):
// products.name - use nameCanonical
// products.sku - sku is on batches table
// products.targetStockLevel - does not exist
// products.minStockLevel - does not exist
// products.unit - use uomSellable
```

### Batches Table
```typescript
// ACTUAL COLUMNS (use these):
batches.id
batches.code
batches.sku
batches.productId
batches.lotId
batches.batchStatus
batches.grade
batches.onHandQty      // NOT "quantity"
batches.sampleQty
batches.reservedQty
batches.quarantineQty
batches.holdQty
batches.defectiveQty
batches.cogsMode
batches.unitCogs
batches.paymentTerms
batches.metadata
batches.createdAt
batches.updatedAt
batches.deletedAt

// DOES NOT EXIST (remove references):
// batches.quantity - use onHandQty
```

### ClientNeeds Table
```typescript
// ACTUAL COLUMNS (use these):
clientNeeds.id
clientNeeds.clientId
clientNeeds.strain
clientNeeds.productName
clientNeeds.strainId
clientNeeds.strainType
clientNeeds.category     // NOT "productType"
clientNeeds.subcategory
clientNeeds.grade
clientNeeds.quantityMin  // NOT "quantity"
clientNeeds.quantityMax
clientNeeds.priceMax
clientNeeds.status       // ENUM: ACTIVE, FULFILLED, EXPIRED, CANCELLED
clientNeeds.priority
clientNeeds.neededBy
clientNeeds.expiresAt
clientNeeds.notes
clientNeeds.createdAt
clientNeeds.updatedAt

// DOES NOT EXIST (remove references):
// clientNeeds.productType - use category
// clientNeeds.quantity - use quantityMin/quantityMax
```

### Clients Table
```typescript
// ACTUAL COLUMNS (use these):
clients.id
clients.name             // This DOES exist
clients.teriCode
clients.email
clients.phone
clients.address
clients.isBuyer
clients.isSeller
clients.isBrand
clients.isReferee
clients.isContractor
clients.tags
clients.pricingProfileId
clients.creditLimit
clients.vipPortalEnabled
clients.wishlist
clients.createdAt
clients.updatedAt

// DOES NOT EXIST (remove references):
// clients.tier - does not exist
```

---

## Files to Fix (25 total)

### Server Routers (13 files)

#### 1. `server/routers/alerts.ts` (24 errors)
**Common Issues:**
- `products.name` → `products.nameCanonical`
- `products.sku` → Remove or get from joined batch
- `products.targetStockLevel` → Remove (feature not implemented)
- `products.minStockLevel` → Remove (feature not implemented)
- `batches.quantity` → `batches.onHandQty`

**Fix Strategy:** This router implements low-stock alerts. Since `targetStockLevel` and `minStockLevel` don't exist, you have two options:
1. **Recommended:** Comment out the low-stock alert functionality with a TODO
2. **Alternative:** Add the columns via migration (not recommended without product approval)

#### 2. `server/routers/analytics.ts` (5 errors)
**Common Issues:**
- `products.name` → `products.nameCanonical`

#### 3. `server/routers/audit.ts` (10 errors)
**Common Issues:**
- Context type mismatches - update function signatures

#### 4. `server/routers/customerPreferences.ts` (10 errors)
**Common Issues:**
- `clients.tier` → Remove or use tags

#### 5. `server/routers/featureFlags.ts` (2 errors)
**Common Issues:**
- Feature flag schema types

#### 6. `server/routers/flowerIntake.ts` (1 error)
**Common Issues:**
- `batches.quantity` → `batches.onHandQty`

#### 7. `server/routers/inventoryShrinkage.ts` (15 errors)
**Common Issues:**
- `batches.quantity` → `batches.onHandQty`
- `products.name` → `products.nameCanonical`

#### 8. `server/routers/photography.ts` (5 errors)
**Common Issues:**
- `batches.quantity` → `batches.onHandQty`
- `products.name` → `products.nameCanonical`

#### 9. `server/routers/quickCustomer.ts` (9 errors)
**Common Issues:**
- `clients.tier` → Remove

#### 10. `server/routers/referrals.ts` (3 errors)
**Common Issues:**
- Referral schema types

#### 11. `server/routers/unifiedSalesPortal.ts` (12 errors)
**Common Issues:**
- Multiple schema mismatches

#### 12. `server/services/featureFlagService.ts` (1 error)
**Common Issues:**
- Feature flag types

#### 13. `server/db/seed/productionSeed.ts` (2 errors)
**Common Issues:**
- Seed data schema

### Client Components (12 files)

#### 14. `client/src/pages/Inventory.tsx` (32 errors)
**Common Issues:**
- Type inference from API responses
- `batch.quantity` → `batch.onHandQty`

#### 15. `client/src/pages/PhotographyPage.tsx` (7 errors)
**Common Issues:**
- Batch type inference

#### 16. `client/src/hooks/useInventorySort.ts` (4 errors)
**Common Issues:**
- Sorting by non-existent columns

#### 17. `client/src/pages/vip-portal/VIPDashboard.tsx` (2 errors)
**Common Issues:**
- Client type null vs undefined

#### 18. `client/src/pages/settings/FeatureFlagsPage.tsx` (2 errors)
**Common Issues:**
- Feature flag types

#### 19. `client/src/pages/accounting/Invoices.tsx` (2 errors)
**Common Issues:**
- Invoice types

#### 20. `client/src/pages/UnifiedSalesPortalPage.tsx` (2 errors)
**Common Issues:**
- Portal types

#### 21. `client/src/pages/InterestListPage.tsx` (2 errors)
**Common Issues:**
- ClientNeeds type (null vs undefined)

#### 22. `client/src/components/settings/VIPImpersonationManager.tsx` (2 errors)
**Common Issues:**
- Client type null vs undefined

#### 23. `client/src/pages/settings/NotificationPreferences.tsx` (1 error)
**Common Issues:**
- Notification types

#### 24. `client/src/pages/OrderCreatorPage.tsx` (1 error)
**Common Issues:**
- Order types

#### 25. `client/src/pages/NotificationsPage.tsx` (1 error)
**Common Issues:**
- Notification types

---

## Execution Steps

### Step 1: Fix Server Routers (Priority Order)

```bash
# Start with the highest-error files first
# After each file, run:
pnpm check 2>&1 | grep "error TS" | wc -l
```

**Order of operations:**
1. `alerts.ts` (24 errors) - Most complex, do first
2. `inventoryShrinkage.ts` (15 errors)
3. `unifiedSalesPortal.ts` (12 errors)
4. `audit.ts` (10 errors)
5. `customerPreferences.ts` (10 errors)
6. `quickCustomer.ts` (9 errors)
7. `analytics.ts` (5 errors)
8. `photography.ts` (5 errors)
9. `referrals.ts` (3 errors)
10. `featureFlags.ts` (2 errors)
11. `productionSeed.ts` (2 errors)
12. `featureFlagService.ts` (1 error)
13. `flowerIntake.ts` (1 error)

### Step 2: Fix Client Components

**Order of operations:**
1. `Inventory.tsx` (32 errors) - Most complex
2. `PhotographyPage.tsx` (7 errors)
3. `useInventorySort.ts` (4 errors)
4. Remaining files (1-2 errors each)

### Step 3: Remove @ts-nocheck Directives

After fixing each file, remove the `@ts-nocheck` directive:

```bash
# Remove @ts-nocheck from a file
sed -i '1{/@ts-nocheck/d}' path/to/file.ts

# Or manually edit the first line
```

### Step 4: Verify

```bash
# Final verification
pnpm check 2>&1 | grep "error TS" | wc -l
# Expected: 0

grep -r "@ts-nocheck" --include="*.ts" --include="*.tsx" -l | wc -l
# Expected: 0

pnpm test
# Expected: All tests pass
```

---

## Common Fix Patterns

### Pattern 1: Column Rename
```typescript
// BEFORE (wrong):
const name = product.name;

// AFTER (correct):
const name = product.nameCanonical;
```

### Pattern 2: Column Doesn't Exist - Remove
```typescript
// BEFORE (wrong):
const tier = client.tier;

// AFTER (correct):
// Remove the line entirely, or use a default
const tier = 'standard'; // Default value
```

### Pattern 3: Column on Different Table
```typescript
// BEFORE (wrong):
const sku = product.sku;

// AFTER (correct):
// SKU is on batches, not products
// Either join to batches or remove
const sku = batch.sku;
```

### Pattern 4: Null vs Undefined
```typescript
// BEFORE (wrong):
interface Client {
  email: string | undefined;
}

// AFTER (correct - match schema):
interface Client {
  email: string | null;
}
```

### Pattern 5: Feature Not Implemented
```typescript
// BEFORE (wrong):
const lowStock = batch.quantity < product.minStockLevel;

// AFTER (correct):
// TODO: Implement minStockLevel column (FEATURE-XXX)
// For now, use a hardcoded threshold or skip this check
const lowStock = Number(batch.onHandQty) < 10; // Temporary threshold
```

---

## Testing Requirements

After each file fix:

1. **TypeScript Check:**
   ```bash
   pnpm check 2>&1 | grep "error TS" | wc -l
   ```

2. **Unit Tests:**
   ```bash
   pnpm test path/to/affected.test.ts
   ```

3. **Lint:**
   ```bash
   pnpm lint path/to/file.ts
   ```

---

## Commit Strategy

Make atomic commits for each logical group:

```bash
# After fixing server routers
git add server/routers/*.ts server/services/*.ts server/db/seed/*.ts
git commit -m "fix(schema): align server routers with actual database schema

- Update products.name → products.nameCanonical
- Update batches.quantity → batches.onHandQty
- Remove references to non-existent columns
- Remove @ts-nocheck from 13 server files"

# After fixing client components
git add client/src/**/*.ts client/src/**/*.tsx
git commit -m "fix(schema): align client components with actual database schema

- Fix type inference for batch and product types
- Update null vs undefined handling
- Remove @ts-nocheck from 12 client files"
```

---

## Exit Criteria

Your task is complete when:

- [ ] `grep -r "@ts-nocheck" --include="*.ts" --include="*.tsx" -l | wc -l` returns **0**
- [ ] `pnpm check` returns **0 errors**
- [ ] `pnpm test` passes with **no new failures**
- [ ] All changes committed to `wave-1/schema-alignment` branch
- [ ] PR created with description of changes

---

## Escalation

If you encounter issues that cannot be resolved:

1. **Missing column that's actually needed:** Document in PR, suggest migration
2. **Breaking change to API contract:** Document in PR, flag for review
3. **Test failures unrelated to your changes:** Document and proceed
4. **Circular dependencies:** Document and flag for architecture review

---

## Resources

- Schema file: `drizzle/schema.ts`
- Type definitions: `drizzle/schema.ts` (exported types)
- API documentation: `docs/api/`
- Previous TypeScript fix: `docs/technical/TYPESCRIPT_NOCHECK_FILES.md`

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| @ts-nocheck files | 25 | 0 |
| TypeScript errors | 0 (fragile) | 0 (solid) |
| Test pass rate | Current | No regression |

**This task is BLOCKING. Complete it before any other work proceeds.**
