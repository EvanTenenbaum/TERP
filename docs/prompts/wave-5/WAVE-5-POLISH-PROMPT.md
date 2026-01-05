# Wave 5: Polish & Technical Debt Cleanup - Complete Agent Prompt

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
❌ Run migrations or drizzle-kit commands
❌ Use `: any` types
❌ Add NEW @ts-nocheck or @ts-ignore (removing is the goal!)
❌ Delete routers that have frontend references
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Commit frequently with clear messages
✅ Verify deployment succeeds
✅ Check frontend usage before deleting any router
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
products.targetStockLevel  // Does not exist
products.minStockLevel     // Does not exist
```

### Batches Table
```typescript
// ✅ EXIST:
batches.id, batches.code, batches.sku
batches.productId, batches.lotId
batches.batchStatus
batches.onHandQty       // NOT "quantity"
batches.metadata        // JSON field for extra data

// ❌ DO NOT EXIST:
batches.quantity        // Use onHandQty
batches.batchNumber     // Use code
```

### Clients Table
```typescript
// ✅ EXIST:
clients.id, clients.teriCode, clients.name
clients.email, clients.phone
clients.clientType      // EXISTS

// ❌ DO NOT EXIST:
clients.tier            // Does not exist
```

---

# PART 2: YOUR TASK - TECHNICAL DEBT CLEANUP

## 🎯 Mission

Remove all @ts-nocheck directives and fix the underlying type issues.

**Goal:** 14 files with @ts-nocheck → 0 files
**Estimated Time:** 21-34 hours

---

## 📁 Files to Fix (Prioritized)

### Priority 1: USED Routers (Fix these - they have frontend references)

| File | Frontend Refs | Estimated Hours |
|------|---------------|-----------------|
| `server/routers/analytics.ts` | 52 | 3-4 |
| `server/routers/audit.ts` | 53 | 3-4 |
| `server/routers/featureFlags.ts` | 19 | 2-3 |
| `server/routers/alerts.ts` | 17 | 2-3 |
| `server/routers/referrals.ts` | 5 | 2-3 |

### Priority 2: Client Components (Fix these)

| File | Estimated Hours |
|------|-----------------|
| `client/src/pages/InterestListPage.tsx` | 1-2 |
| `client/src/pages/settings/FeatureFlagsPage.tsx` | 1-2 |
| `client/src/components/settings/VIPImpersonationManager.tsx` | 1-2 |

### Priority 3: UNUSED Routers (Can DELETE safely - 0 frontend refs)

| File | Action |
|------|--------|
| `server/routers/customerPreferences.ts` | DELETE |
| `server/routers/flowerIntake.ts` | DELETE |
| `server/routers/inventoryShrinkage.ts` | DELETE |
| `server/routers/quickCustomer.ts` | DELETE |

### Priority 4: Other Files

| File | Action |
|------|--------|
| `server/db/seed/productionSeed.ts` | Fix or ignore (seed script) |
| `server/services/featureFlagService.ts` | Fix (used by featureFlags router) |

---

## 📋 Task Checklist

### Task 1: Delete Unused Routers (1-2 hours)

These routers have **0 frontend references** and can be safely deleted:

```bash
# Verify no frontend usage
grep -r "customerPreferences" client/src --include="*.tsx" | wc -l  # Should be 0
grep -r "flowerIntake" client/src --include="*.tsx" | wc -l         # Should be 0
grep -r "inventoryShrinkage" client/src --include="*.tsx" | wc -l   # Should be 0
grep -r "quickCustomer" client/src --include="*.tsx" | wc -l        # Should be 0

# If all return 0, delete the files
rm server/routers/customerPreferences.ts
rm server/routers/flowerIntake.ts
rm server/routers/inventoryShrinkage.ts
rm server/routers/quickCustomer.ts

# Remove from router registration in server/routers.ts
# (Comment out or remove the imports and router registrations)
```

### Task 2: Fix analytics.ts Router (3-4 hours)

```bash
# Remove @ts-nocheck and check errors
sed -i '1d' server/routers/analytics.ts
pnpm check 2>&1 | grep "analytics.ts"
```

**Common Issues:**
- Date type mismatches (string vs Date)
- Aggregation return types
- Optional field handling

### Task 3: Fix audit.ts Router (3-4 hours)

```bash
sed -i '1d' server/routers/audit.ts
pnpm check 2>&1 | grep "audit.ts"
```

**Common Issues:**
- User type references
- Action enum types
- Metadata JSON typing

### Task 4: Fix featureFlags.ts Router (2-3 hours)

```bash
sed -i '1d' server/routers/featureFlags.ts
pnpm check 2>&1 | grep "featureFlags.ts"
```

Also fix the service:
```bash
sed -i '1d' server/services/featureFlagService.ts
pnpm check 2>&1 | grep "featureFlagService.ts"
```

### Task 5: Fix alerts.ts Router (2-3 hours)

```bash
sed -i '1d' server/routers/alerts.ts
pnpm check 2>&1 | grep "alerts.ts"
```

**Known Issues:**
- References `products.name` → Use `products.nameCanonical`
- References `products.targetStockLevel` → Does not exist (remove or use alternative)
- References `clients.tier` → Does not exist (remove or use `clientType`)

### Task 6: Fix referrals.ts Router (2-3 hours)

```bash
sed -i '1d' server/routers/referrals.ts
pnpm check 2>&1 | grep "referrals.ts"
```

### Task 7: Fix Client Components (3-6 hours)

```bash
# InterestListPage
sed -i '1d' client/src/pages/InterestListPage.tsx
pnpm check 2>&1 | grep "InterestListPage"

# FeatureFlagsPage
sed -i '1d' client/src/pages/settings/FeatureFlagsPage.tsx
pnpm check 2>&1 | grep "FeatureFlagsPage"

# VIPImpersonationManager
sed -i '1d' client/src/components/settings/VIPImpersonationManager.tsx
pnpm check 2>&1 | grep "VIPImpersonationManager"
```

---

## 🔧 Common Fix Patterns

### Pattern 1: Column Name Fixes
```typescript
// Before (error - column doesn't exist)
const name = product.name;

// After (fixed)
const name = product.nameCanonical;
```

### Pattern 2: Quantity Field
```typescript
// Before (error)
const qty = batch.quantity;

// After (fixed)
const qty = batch.onHandQty;
```

### Pattern 3: Remove Non-Existent Fields
```typescript
// Before (error - targetStockLevel doesn't exist)
where: lt(products.quantity, products.targetStockLevel)

// After (remove the feature or use alternative logic)
// Option A: Remove the alert type entirely
// Option B: Use a hardcoded threshold
where: lt(batches.onHandQty, 10)
```

### Pattern 4: Date Handling
```typescript
// Before (error - might be string)
const date = record.createdAt.toISOString();

// After (fixed)
const date = new Date(record.createdAt).toISOString();
```

### Pattern 5: Optional Chaining
```typescript
// Before (error - might be undefined)
const value = data.field.subfield;

// After (fixed)
const value = data?.field?.subfield ?? defaultValue;
```

---

## ✅ Exit Criteria

Wave 5 is complete when:

- [ ] All 4 unused routers deleted
- [ ] `server/routers/analytics.ts` - no @ts-nocheck
- [ ] `server/routers/audit.ts` - no @ts-nocheck
- [ ] `server/routers/featureFlags.ts` - no @ts-nocheck
- [ ] `server/routers/alerts.ts` - no @ts-nocheck
- [ ] `server/routers/referrals.ts` - no @ts-nocheck
- [ ] `server/services/featureFlagService.ts` - no @ts-nocheck
- [ ] `client/src/pages/InterestListPage.tsx` - no @ts-nocheck
- [ ] `client/src/pages/settings/FeatureFlagsPage.tsx` - no @ts-nocheck
- [ ] `client/src/components/settings/VIPImpersonationManager.tsx` - no @ts-nocheck
- [ ] `pnpm check` passes with 0 errors
- [ ] `pnpm test` passes
- [ ] Deployment verified

**Final Check:**
```bash
grep -r "@ts-nocheck" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v productionSeed
# Should return nothing (productionSeed.ts can be ignored)
```

---

## 🔄 Git Workflow

```bash
# After each file fix
pnpm check && pnpm test
git add -A
git commit -m "fix(types): remove @ts-nocheck from [filename]"
git push origin main
```

---

## 🆘 Escalation

If a file cannot be fixed without schema changes:
1. Document the specific issue in `WAVE_5_BLOCKERS.md`
2. Note which schema columns would need to be added
3. Move to next file
4. Flag for human review

**DO NOT add schema columns - document and skip instead.**

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass

# Start with deleting unused routers (quick win)
grep -r "customerPreferences" client/src --include="*.tsx" | wc -l

# Then tackle the used routers one by one
```

**Goal: Zero @ts-nocheck files (except seed scripts)**
