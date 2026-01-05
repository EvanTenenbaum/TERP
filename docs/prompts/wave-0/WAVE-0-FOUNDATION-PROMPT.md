# Wave 0: Foundation - Remove @ts-nocheck from Core Workflow Pages

**Priority:** BLOCKING - All other work depends on this
**Estimated Time:** 8-16 hours
**Goal:** Remove @ts-nocheck from the 4 core workflow pages so users can complete end-to-end business processes

---

## 🚨 CRITICAL CONSTRAINTS

### NEVER DO:
```
❌ Modify drizzle/schema.ts
❌ Run any migrations
❌ Add database columns
❌ Use drizzle-kit
❌ Add new @ts-nocheck or @ts-ignore
❌ Use `: any` types
```

### ALWAYS DO:
```
✅ Only modify TypeScript/React code
✅ Use existing schema columns
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Commit working code frequently
✅ Document issues you can't fix
```

---

## Pre-Flight Checklist

Before starting, verify:

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Should show 0 errors
```

If `pnpm check` fails, STOP and report the issue.

---

## Target Files (Priority Order)

### 1. Inventory.tsx (Inventory Lifecycle)
**Path:** `client/src/pages/Inventory.tsx`
**Impact:** Users cannot view inventory batches

### 2. OrderCreatorPage.tsx (Sales Lifecycle)
**Path:** `client/src/pages/OrderCreatorPage.tsx`
**Impact:** Users cannot create orders

### 3. VIPDashboard.tsx (VIP Portal Lifecycle)
**Path:** `client/src/pages/vip-portal/VIPDashboard.tsx`
**Impact:** Clients cannot use VIP portal

### 4. Invoices.tsx (Financial Lifecycle)
**Path:** `client/src/pages/accounting/Invoices.tsx`
**Impact:** Users cannot manage invoices

---

## Fix Strategy

### Step 1: Identify the Errors

For each file, remove the @ts-nocheck comment and run:

```bash
# Remove @ts-nocheck from the file
sed -i '1d' client/src/pages/Inventory.tsx

# Check what errors appear
pnpm check 2>&1 | grep "Inventory.tsx"
```

### Step 2: Categorize Errors

Most errors will be one of these types:

| Error Type | Example | Fix |
|------------|---------|-----|
| **Null/undefined mismatch** | `Type 'string \| undefined' is not assignable to type 'string'` | Add optional chaining `?.` or nullish coalescing `??` |
| **Property doesn't exist** | `Property 'name' does not exist on type` | Use correct property name from schema |
| **Type inference failure** | `Argument of type 'X' is not assignable to parameter of type 'Y'` | Add explicit type annotations |
| **Missing properties** | `Property 'X' is missing in type` | Add the missing property or make it optional |

### Step 3: Common Fixes

#### Fix 1: Null/Undefined Handling
```typescript
// Before (error)
const name = client.name;

// After (fixed)
const name = client?.name ?? 'Unknown';
```

#### Fix 2: Property Name Mismatch
```typescript
// Before (error - products.name doesn't exist)
const productName = product.name;

// After (fixed - use actual column name)
const productName = product.nameCanonical;
```

#### Fix 3: Type Narrowing
```typescript
// Before (error)
function handleClient(client: Client | undefined) {
  return client.name; // Error: client might be undefined
}

// After (fixed)
function handleClient(client: Client | undefined) {
  if (!client) return 'Unknown';
  return client.name;
}
```

#### Fix 4: Explicit Type Annotations
```typescript
// Before (error - type inference fails)
const [data, setData] = useState([]);

// After (fixed)
const [data, setData] = useState<BatchWithDetails[]>([]);
```

---

## Schema Reference

### Products Table (actual columns)
```typescript
// ✅ These columns EXIST:
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

// ❌ These columns DO NOT EXIST:
products.name           // Use nameCanonical
products.sku            // SKU is on batches
products.minStockLevel  // Does not exist
products.targetStockLevel // Does not exist
```

### Batches Table (actual columns)
```typescript
// ✅ These columns EXIST:
batches.id
batches.code
batches.sku
batches.productId
batches.lotId
batches.batchStatus
batches.grade
batches.onHandQty       // NOT "quantity"
batches.sampleQty
batches.reservedQty
batches.metadata        // JSON field for extra data

// ❌ These columns DO NOT EXIST:
batches.quantity        // Use onHandQty
batches.batchNumber     // Use code
```

### Clients Table (actual columns)
```typescript
// ✅ These columns EXIST:
clients.id
clients.teriCode
clients.name            // This DOES exist on clients
clients.email
clients.phone
clients.address
clients.isBuyer
clients.isSeller
clients.vipPortalEnabled
clients.creditLimit
clients.totalOwed

// ❌ These columns DO NOT EXIST:
clients.tier            // Does not exist
clients.clientType      // Use isBuyer/isSeller flags
```

---

## File-Specific Guidance

### Inventory.tsx

**Likely Issues:**
1. Batch type mismatches (quantity vs onHandQty)
2. Product name references (name vs nameCanonical)
3. Null handling for optional fields

**Check these imports:**
```typescript
import { type Batch, type Product } from '@/types';
```

Make sure the types match the actual schema.

### OrderCreatorPage.tsx

**Likely Issues:**
1. Client type mismatches
2. Order item type definitions
3. Price calculation types (string vs number)

**Note:** Prices in the schema are often `varchar` (strings), not numbers. You may need to parse them.

### VIPDashboard.tsx

**Likely Issues:**
1. VIP portal config type mismatches
2. Module enable/disable flags
3. Client data type mismatches

**Check the VipPortalConfig interface** at the top of the file and compare to the actual `vipPortalConfigurations` table.

### Invoices.tsx

**Likely Issues:**
1. Invoice line item types
2. Payment status types
3. Date handling (Date vs string)

---

## Testing Each Fix

After fixing each file:

```bash
# 1. Check TypeScript compiles
pnpm check

# 2. Run tests
pnpm test

# 3. If both pass, commit
git add -A
git commit -m "fix: remove @ts-nocheck from [filename]"
```

---

## Exit Criteria

Wave 0 is complete when:

- [ ] `client/src/pages/Inventory.tsx` has no @ts-nocheck
- [ ] `client/src/pages/OrderCreatorPage.tsx` has no @ts-nocheck
- [ ] `client/src/pages/vip-portal/VIPDashboard.tsx` has no @ts-nocheck
- [ ] `client/src/pages/accounting/Invoices.tsx` has no @ts-nocheck
- [ ] `pnpm check` passes with 0 errors
- [ ] `pnpm test` passes
- [ ] All changes committed and pushed

---

## Escalation

If you encounter issues you cannot resolve:

1. **Document the exact error** in a file called `WAVE_0_BLOCKERS.md`
2. **Include:**
   - File name
   - Line number
   - Exact error message
   - What you tried
   - Why it didn't work
3. **Do NOT add @ts-nocheck back** - leave the file broken and document it
4. **Move to the next file** and continue

---

## Commit Strategy

Make small, frequent commits:

```bash
# After fixing one type of error in one file
git add client/src/pages/Inventory.tsx
git commit -m "fix(Inventory): handle null batch quantities"

# After completing a file
git add -A
git commit -m "fix: remove @ts-nocheck from Inventory.tsx"

# Push after each file is complete
git push origin main
```

---

## Success Verification

When you think you're done:

```bash
# Full verification
cd ~/TERP
git pull origin main
pnpm install
pnpm check    # Must show 0 errors
pnpm test     # Must pass

# Verify no @ts-nocheck in target files
grep -l "@ts-nocheck" client/src/pages/Inventory.tsx client/src/pages/OrderCreatorPage.tsx client/src/pages/vip-portal/VIPDashboard.tsx client/src/pages/accounting/Invoices.tsx
# Should return nothing (no matches)
```

If all checks pass, Wave 0 is complete. Proceed to Wave 1.
