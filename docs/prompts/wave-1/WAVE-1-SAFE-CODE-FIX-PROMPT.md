# Wave 1: Safe Code Fix Agent Prompt

**Version:** 2.0 (SAFE - No Schema Changes)
**Created:** January 4, 2026
**Priority:** P0 - BLOCKING
**Estimated Duration:** 4-6 hours

---

## ⚠️ CRITICAL CONSTRAINTS ⚠️

**YOU MUST NOT:**
1. ❌ Modify `drizzle/schema.ts` in ANY way
2. ❌ Run `drizzle-kit generate` or `drizzle-kit push`
3. ❌ Run ANY SQL migrations
4. ❌ Add columns to the database
5. ❌ Suggest schema changes as a solution

**YOU MUST:**
1. ✅ Only modify application code (routers, components)
2. ✅ Delete unused code rather than fix it
3. ✅ Use existing schema columns
4. ✅ Verify changes don't break existing functionality

**If you encounter a situation where schema changes seem necessary, STOP and report it. Do not proceed.**

---

## Mission Statement

You are a senior TypeScript engineer tasked with fixing code that references non-existent database columns. Your goal is to remove all `@ts-nocheck` directives by:
1. **Deleting** unused routers (5 files)
2. **Fixing** used routers to use correct column names (6 files)
3. **Fixing** client components (12 files)

---

## Pre-Flight Checklist

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

# 4. Create feature branch
git checkout -b wave-1/safe-code-fix
```

---

## Phase 1: Delete Unused Routers

These routers have **ZERO frontend references** and can be safely deleted:

### Step 1.1: Delete Router Files

```bash
rm server/routers/alerts.ts
rm server/routers/inventoryShrinkage.ts
rm server/routers/customerPreferences.ts
rm server/routers/quickCustomer.ts
rm server/routers/flowerIntake.ts
```

### Step 1.2: Update server/routers.ts

Remove the imports and router registrations for the deleted files.

**Before:**
```typescript
import { alertsRouter } from "./routers/alerts";
import { inventoryShrinkageRouter } from "./routers/inventoryShrinkage";
// ... etc
```

**After:**
```typescript
// DELETED: alertsRouter, inventoryShrinkageRouter, customerPreferencesRouter, 
// quickCustomerRouter, flowerIntakeRouter - unused (0 frontend references)
```

### Step 1.3: Verify Deletion

```bash
pnpm check 2>&1 | grep "error TS" | wc -l
# Should not increase errors
```

---

## Phase 2: Fix Used Routers

### Actual Schema Reference (DO NOT MODIFY)

```typescript
// Products table - ACTUAL columns
products.id
products.brandId
products.strainId
products.nameCanonical  // NOT "name"
products.category
products.subcategory
products.uomSellable
products.description
products.deletedAt
products.createdAt
products.updatedAt

// Batches table - ACTUAL columns
batches.id
batches.code           // NOT "batchNumber"
batches.sku
batches.productId
batches.lotId
batches.batchStatus
batches.grade
batches.onHandQty      // NOT "quantity"
batches.sampleQty
batches.reservedQty
batches.deletedAt
batches.createdAt
batches.updatedAt

// Clients table - ACTUAL columns
clients.id
clients.name
clients.teriCode
clients.email
clients.phone
clients.isBuyer        // NOT "clientType"
clients.isSeller
clients.isBrand
clients.tags           // NOT "tier"
clients.totalOwed
clients.creditLimit
clients.vipPortalEnabled
clients.deletedAt
clients.createdAt
clients.updatedAt
```

### Fix: photography.ts

**Bad References → Correct References:**
| Bad | Correct | Action |
|-----|---------|--------|
| `batches.batchNumber` | `batches.code` | Replace |
| `batches.strain` | N/A | Remove field or join to strains table |
| `batches.quantity` | `batches.onHandQty` | Replace |
| `batches.unit` | `products.uomSellable` | Replace with join |
| `products.name` | `products.nameCanonical` | Replace |

### Fix: referrals.ts

**Bad References → Correct References:**
| Bad | Correct | Action |
|-----|---------|--------|
| `clients.tier` | N/A | Remove field entirely or use hardcoded 'standard' |

### Fix: analytics.ts

**Bad References → Correct References:**
| Bad | Correct | Action |
|-----|---------|--------|
| `clients.clientType` | `clients.isBuyer`/`clients.isSeller` | Replace with boolean logic |
| `batches.batchNumber` | `batches.code` | Replace |
| `batches.quantity` | `batches.onHandQty` | Replace |

### Fix: audit.ts

Check actual errors and fix column references.

### Fix: unifiedSalesPortal.ts

Check actual errors and fix column references.

### Fix: featureFlags.ts

Check actual errors and fix type definitions.

---

## Phase 3: Fix Client Components

For each component:

1. Remove `@ts-nocheck` from first line
2. Run `pnpm check` to see errors
3. Fix each error (usually `null` vs `undefined` or field name changes)
4. Test the page manually

### Components to Fix:
1. `client/src/pages/Inventory.tsx`
2. `client/src/pages/PhotographyPage.tsx`
3. `client/src/hooks/useInventorySort.ts`
4. `client/src/pages/vip-portal/VIPDashboard.tsx`
5. `client/src/pages/settings/FeatureFlagsPage.tsx`
6. `client/src/pages/accounting/Invoices.tsx`
7. `client/src/pages/UnifiedSalesPortalPage.tsx`
8. `client/src/pages/InterestListPage.tsx`
9. `client/src/components/settings/VIPImpersonationManager.tsx`
10. `client/src/pages/settings/NotificationPreferences.tsx`
11. `client/src/pages/OrderCreatorPage.tsx`
12. `client/src/pages/NotificationsPage.tsx`

### Common Client Fixes:

**Null vs Undefined:**
```typescript
// BEFORE (wrong):
interface Props {
  email: string | undefined;
}

// AFTER (correct - match API response):
interface Props {
  email: string | null;
}
```

**Field Name Changes:**
```typescript
// BEFORE (wrong):
const name = product.name;

// AFTER (correct):
const name = product.nameCanonical;
```

---

## Phase 4: Final Verification

```bash
# 1. No @ts-nocheck remaining
grep -r "@ts-nocheck" --include="*.ts" --include="*.tsx" -l | wc -l
# Expected: 0

# 2. TypeScript passes
pnpm check
# Expected: 0 errors

# 3. Tests pass
pnpm test
# Expected: No new failures

# 4. Schema unchanged
git diff drizzle/schema.ts
# Expected: No changes

# 5. No migrations
ls -la drizzle/*.sql | tail -5
# Expected: No new files
```

---

## Commit Strategy

```bash
# After deleting unused routers
git add -A
git commit -m "chore: delete unused routers (0 frontend references)

Deleted routers:
- alerts.ts (WS-008) - 0 references
- inventoryShrinkage.ts (WS-009) - 0 references
- customerPreferences.ts (WS-012) - 0 references
- quickCustomer.ts (WS-011) - 0 references
- flowerIntake.ts (WS-007) - 0 references

These routers referenced non-existent schema columns and were never
integrated into the frontend. Deleting is safer than fixing."

# After fixing used routers
git add server/routers/*.ts
git commit -m "fix: update routers to use correct schema columns

- photography.ts: batches.code instead of batchNumber, onHandQty instead of quantity
- referrals.ts: removed clients.tier reference
- analytics.ts: use isBuyer/isSeller instead of clientType
- Remove @ts-nocheck from all fixed files

NO SCHEMA CHANGES - code-only fixes"

# After fixing client components
git add client/src/**/*.ts client/src/**/*.tsx
git commit -m "fix: update client components to match API types

- Fix null vs undefined type mismatches
- Update field references to match actual schema
- Remove @ts-nocheck from all fixed files

NO SCHEMA CHANGES - code-only fixes"
```

---

## Exit Criteria

Your task is complete when:

- [ ] `grep -r "@ts-nocheck" | wc -l` returns **0**
- [ ] `pnpm check` returns **0 errors**
- [ ] `pnpm test` passes with **no new failures**
- [ ] `git diff drizzle/schema.ts` shows **NO changes**
- [ ] All changes committed to `wave-1/safe-code-fix` branch
- [ ] PR created with description of changes

---

## Escalation

If you encounter:
1. **A feature that truly requires schema changes:** STOP and document. Do not proceed.
2. **A router that's actually used but you thought was unused:** Fix it instead of deleting.
3. **Test failures unrelated to your changes:** Document and proceed.

---

## What NOT To Do

❌ **DO NOT** add columns to schema
❌ **DO NOT** run migrations
❌ **DO NOT** use drizzle-kit
❌ **DO NOT** modify database
❌ **DO NOT** suggest "just add the column"
❌ **DO NOT** create new migration files

---

## Resources

- Safe Fix Strategy: `docs/roadmaps/SAFE_FIX_STRATEGY_JAN_2026.md`
- Schema file (READ ONLY): `drizzle/schema.ts`
- Previous issues: `docs/DATABASE_SCHEMA_SYNC.md`
