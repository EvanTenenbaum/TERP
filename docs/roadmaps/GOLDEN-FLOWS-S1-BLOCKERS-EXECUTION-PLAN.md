# Golden Flows S1-Blockers Execution Plan

**Task:** Fix all S1-Critical blockers preventing Golden Flows release
**Created:** 2026-01-29
**Total Estimate:** 16-20h
**Parallel Agents:** Up to 6 concurrent

---

## Executive Summary

Live browser testing on 2026-01-29 revealed 6 S1-Critical bugs blocking release. Root cause: production schema drift where `products.strainId` column exists in Drizzle schema but NOT in production database.

**Strategy:** Fix in 4 parallel pockets with dependencies respected.

---

## Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │  POCKET 0: Foundation (Sequential)  │
                    │         SCHEMA-015 (4h)             │
                    │   Remove strainId + vendors joins   │
                    └──────────────┬──────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐      ┌───────────────────┐      ┌─────────────────────┐
│  POCKET 1A    │      │    POCKET 1B      │      │     POCKET 1C       │
│  Backend DB   │      │    Frontend       │      │     Security        │
│  (2 agents)   │      │    (2 agents)     │      │     (2 agents)      │
├───────────────┤      ├───────────────────┤      ├─────────────────────┤
│ BUG-130 (2h)  │      │ BUG-131 (1h)      │      │ SEC-031 (1h)        │
│ BUG-132 (2h)  │      │ BUG-133 (2h)      │      │ SEC-032 (1h)        │
└───────┬───────┘      └───────────────────┘      └─────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    POCKET 2: PO System + Cleanup (4 agents)           │
├───────────────────┬──────────────────┬─────────────────┬──────────────┤
│ BUG-134 (1h)      │ BUG-135 (1h)     │ BUG-136 (1h)    │ BUG-137 (2h) │
│ PO Add Item       │ Create PO        │ Edit Modal      │ Test Data    │
│ Depends: BUG-132  │ Depends: BUG-132 │ Independent     │ Independent  │
└───────────────────┴──────────────────┴─────────────────┴──────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    POCKET 3: Verification (2 agents)                  │
├───────────────────────────────────────────────────────────────────────┤
│ VERIFY-GF: Run all 8 Golden Flow E2E tests                           │
│ VERIFY-BUILD: pnpm check && pnpm lint && pnpm test && pnpm build     │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Pocket 0: Foundation (SEQUENTIAL - Must complete first)

**Agents:** 1
**Time:** 4h
**Mode:** RED (Critical path)

### SCHEMA-015: Remove strainId + vendors joins from production queries

**Status:** ready
**Priority:** P0 - RELEASE BLOCKER
**Estimate:** 4h
**Module:** `server/salesSheetsDb.ts`, `server/productsDb.ts`, `server/inventoryDb.ts`
**Blocks:** BUG-130, BUG-132

**Problem:**
- `products.strainId` column defined in Drizzle schema but MISSING from production DB
- 27+ files reference this non-existent column
- Queries fail at runtime with "Unknown column" errors

**Files to Fix (Priority Order):**

| # | File | Line | Change Required | Est |
|---|------|------|-----------------|-----|
| 1 | `server/salesSheetsDb.ts` | 117-129 | Remove strains + vendors join, use fallback pattern | 1h |
| 2 | `server/productsDb.ts` | 117 | Verify fallback works, remove primary strains join | 30m |
| 3 | `server/inventoryDb.ts` | 887, 950 | Remove vendors join (use clients.isSeller) | 1h |
| 4 | `server/matchingEngine.ts` | TBD | Check strainId refs, add fallback | 30m |
| 5 | `server/routers/photography.ts` | TBD | Already has isSchemaError() fallback - verify | 15m |
| 6 | `server/routers/search.ts` | TBD | Check strainId references | 15m |
| 7 | Remaining 21 files | Various | Audit and fix as needed | 30m |

**Implementation Pattern:**

```typescript
// BEFORE (BROKEN - strainId doesn't exist)
const results = await db
  .select({ product: products, strain: strains })
  .from(products)
  .leftJoin(strains, eq(products.strainId, strains.id));

// AFTER (SAFE - no strainId dependency)
const results = await db
  .select({ product: products })
  .from(products);
// Note: strain info not available until strainId column added to production
```

**Verification:**

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
# Manually test: GET /api/trpc/inventory.getInventory
# Manually test: GET /api/trpc/products.getProducts
```

---

## Pocket 1: Parallel Fixes (6 agents)

**Start:** After SCHEMA-015 complete
**Time:** 2-3h (parallel)

### Pocket 1A: Backend Database Fixes (2 agents)

#### BUG-130: Inventory Query Failure

**Status:** ready
**Priority:** S1-CRITICAL
**Estimate:** 2h
**Agent:** 1A-1
**Module:** `server/salesSheetsDb.ts:117-129`
**Dependencies:** SCHEMA-015
**GF Impact:** GF-001, GF-003, GF-007

**Problem:** `getInventoryForSalesSheet()` fails because it joins both:
- `strains` table via `products.strainId` (doesn't exist)
- `vendors` table (deprecated, should use `clients.isSeller`)

**Fix:**

```typescript
// server/salesSheetsDb.ts:117-129
// Remove: .leftJoin(vendors, eq(lots.vendorId, vendors.id))
// Remove: .leftJoin(strains, eq(products.strainId, strains.id))
// Add: .leftJoin(clients, eq(lots.supplierClientId, clients.id))

const inventoryWithDetails = await db
  .select({
    batch: batches,
    product: products,
    lot: lots,
    supplier: clients, // Changed from vendor
    // strain: REMOVED until column exists
  })
  .from(batches)
  .leftJoin(products, eq(batches.productId, products.id))
  .leftJoin(lots, eq(batches.lotId, lots.id))
  .leftJoin(clients, and(
    eq(lots.supplierClientId, clients.id),
    eq(clients.isSeller, true)
  ))
  .where(/* existing conditions */);
```

**Deliverables:**
- [ ] Remove strains join from salesSheetsDb.ts
- [ ] Replace vendors join with clients (isSeller=true)
- [ ] Update return type to remove strain field
- [ ] Update any callers expecting strain data
- [ ] Add integration test

---

#### BUG-132: Product Dropdown Empty in PO

**Status:** ready
**Priority:** S1-CRITICAL
**Estimate:** 2h
**Agent:** 1A-2
**Module:** `server/productsDb.ts:117`
**Dependencies:** SCHEMA-015
**GF Impact:** GF-002

**Problem:** `getProducts()` query fails due to strainId join. Has fallback but returns empty array when strainId filter requested.

**Fix:**

```typescript
// server/productsDb.ts - Make strains join optional
// Primary query should work WITHOUT strainId

const results = await db
  .select({
    product: products,
    brandName: brands.name,
    // strainName: REMOVED - not available
  })
  .from(products)
  .leftJoin(brands, eq(products.brandId, brands.id))
  // NO strains join
  .where(fullConditions)
  .orderBy(desc(products.updatedAt));
```

**Deliverables:**
- [ ] Remove strains join from primary query
- [ ] Remove strainId from filter conditions
- [ ] Update return type
- [ ] Verify PO product dropdown populates
- [ ] Add integration test

---

### Pocket 1B: Frontend Fixes (2 agents)

#### BUG-131: Add Batch Button Non-Functional

**Status:** ready
**Priority:** S1-CRITICAL
**Estimate:** 1h
**Agent:** 1B-1
**Module:** `client/src/pages/Inventory.tsx`, `client/src/components/work-surface/InventoryWorkSurface.tsx`
**Dependencies:** None (frontend only)
**GF Impact:** GF-001

**Problem:** "Add Batch" button click handler not properly bound or event not propagating.

**Investigation Steps:**
1. Find Add Batch button in Inventory.tsx
2. Check onClick handler binding
3. Verify modal state management
4. Test button visibility/disabled state

**Deliverables:**
- [ ] Identify missing click handler
- [ ] Bind onClick to proper function
- [ ] Verify modal opens on click
- [ ] Test batch creation flow end-to-end

---

#### BUG-133: RBAC Roles Non-Interactive

**Status:** ready
**Priority:** S1-CRITICAL
**Estimate:** 2h
**Agent:** 1B-2
**Module:** `client/src/pages/Settings.tsx` or RBAC admin pages
**Dependencies:** None (frontend only)
**GF Impact:** Admin functionality

**Problem:** Role management buttons (create, edit, delete) don't respond to clicks.

**Investigation Steps:**
1. Find RBAC roles management page
2. Check button onClick handlers
3. Verify tRPC mutations connected
4. Test permission checks (may be blocking UI)

**Deliverables:**
- [ ] Identify RBAC roles page location
- [ ] Fix click handlers for role buttons
- [ ] Verify mutations fire correctly
- [ ] Test role CRUD operations

---

### Pocket 1C: Security Fixes (2 agents)

#### SEC-031: Fix createdBy from input in inventoryDb

**Status:** ready
**Priority:** HIGH
**Estimate:** 1h
**Agent:** 1C-1
**Module:** `server/inventoryDb.ts:1618`
**Dependencies:** None
**GF Impact:** All (security)

**Problem:** Actor attribution from input is FORBIDDEN per CLAUDE.md - allows user impersonation.

**Fix:**

```typescript
// BEFORE (BLOCKED BY PRE-COMMIT HOOK)
await tx.insert(inventoryMovements).values({
  createdBy: input.createdBy, // FORBIDDEN
});

// AFTER
// In router, get userId from context
const userId = getAuthenticatedUserId(ctx);
// Pass to service function
await createInventoryMovement({ ...input, actorId: userId });

// In inventoryDb.ts
async function createInventoryMovement(input: Input & { actorId: number }) {
  await tx.insert(inventoryMovements).values({
    createdBy: input.actorId, // From authenticated context
  });
}
```

**Deliverables:**
- [ ] Remove createdBy from input type
- [ ] Add actorId parameter from context
- [ ] Update all callers to pass ctx.user.id
- [ ] Verify pre-commit hook passes

---

#### SEC-032: Fix createdBy from input in payablesService

**Status:** ready
**Priority:** HIGH
**Estimate:** 1h
**Agent:** 1C-2
**Module:** `server/services/payablesService.ts:130`
**Dependencies:** None
**GF Impact:** All (security)

**Fix:** Same pattern as SEC-031.

**Deliverables:**
- [ ] Remove createdBy from input type
- [ ] Add actorId parameter from context
- [ ] Update all callers
- [ ] Verify pre-commit hook passes

---

## Pocket 2: PO System + Cleanup (4 agents)

**Start:** After BUG-132 complete (for PO bugs) or immediately (for independent bugs)
**Time:** 2h (parallel)

#### BUG-134: PO Add Item Button Broken

**Status:** ready
**Priority:** S1-CRITICAL
**Estimate:** 1h
**Agent:** 2-1
**Module:** `client/src/pages/PurchaseOrdersPage.tsx`, `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx`
**Dependencies:** BUG-132 (needs product dropdown working)
**GF Impact:** GF-002

**Problem:** "Add Item" button in PO creation doesn't work. Related to empty product dropdown.

**Deliverables:**
- [ ] Fix Add Item button click handler
- [ ] Ensure product selection works
- [ ] Test adding items to PO

---

#### BUG-135: Create PO Button Broken

**Status:** ready
**Priority:** S1-CRITICAL
**Estimate:** 1h
**Agent:** 2-2
**Module:** `client/src/pages/PurchaseOrdersPage.tsx`
**Dependencies:** BUG-132
**GF Impact:** GF-002

**Problem:** "Create PO" button doesn't work or is disabled.

**Deliverables:**
- [ ] Fix Create PO button handler
- [ ] Verify form validation
- [ ] Test PO creation flow

---

#### BUG-136: Edit Product Opens Archive Modal

**Status:** ready
**Priority:** S2-HIGH
**Estimate:** 1h
**Agent:** 2-3
**Module:** `client/src/pages/Inventory.tsx`, `client/src/components/inventory/EditBatchModal.tsx`
**Dependencies:** None (independent frontend bug)
**GF Impact:** GF-007

**Problem:** Clicking "Edit" on a product/batch opens the Archive modal instead of Edit modal.

**Deliverables:**
- [ ] Trace Edit button click handler
- [ ] Fix modal state binding
- [ ] Verify correct modal opens

---

#### BUG-137: No Test Data for Pick Pack

**Status:** ready
**Priority:** S2-HIGH
**Estimate:** 2h
**Agent:** 2-4
**Module:** `server/db/seed/`, staging environment
**Dependencies:** None (data seeding)
**GF Impact:** GF-005

**Problem:** Pick & Pack page shows no orders because staging DB not seeded with appropriate test data.

**Deliverables:**
- [ ] Create pick-pack-seed.ts script
- [ ] Seed orders with "confirmed" status
- [ ] Seed order items with allocated inventory
- [ ] Run on staging

---

## Pocket 3: Verification (2 agents)

**Start:** After all Pocket 1 and 2 bugs fixed
**Time:** 2h

#### VERIFY-BUILD: Full Build Verification

**Agent:** 3-1

```bash
pnpm check    # TypeScript - must pass
pnpm lint     # ESLint - must pass
pnpm test     # All tests - must pass
pnpm build    # Build - must pass
```

---

#### VERIFY-GF: Golden Flow E2E Verification

**Agent:** 3-2

Test each Golden Flow in staging:

| # | Golden Flow | Test Steps | Expected |
|---|-------------|------------|----------|
| GF-001 | Direct Intake | Create intake with new vendor | Batch created |
| GF-002 | Procure-to-Pay | Create PO, receive items, pay vendor | Full flow works |
| GF-003 | Order-to-Cash | Create order, confirm, fulfill | Order completed |
| GF-004 | Invoice & Payment | Create invoice, record payment | GL entries correct |
| GF-005 | Pick & Pack | Pick and pack order items | Status updated |
| GF-006 | Client Ledger | View client ledger | Balance correct |
| GF-007 | Inventory Mgmt | Adjust inventory | Qty updated |
| GF-008 | Sample Request | Create sample request | Samples allocated |

---

## Execution Timeline

```
Hour 0-4:   POCKET 0 - SCHEMA-015 (1 agent)
            ├── Fix salesSheetsDb.ts strainId+vendors joins
            ├── Fix productsDb.ts strainId join
            ├── Fix inventoryDb.ts vendors join
            └── Audit remaining 24 files

Hour 4-7:   POCKET 1 - Parallel (6 agents)
            ├── 1A-1: BUG-130 Inventory query
            ├── 1A-2: BUG-132 Product dropdown
            ├── 1B-1: BUG-131 Add Batch button
            ├── 1B-2: BUG-133 RBAC roles
            ├── 1C-1: SEC-031 inventoryDb actor
            └── 1C-2: SEC-032 payablesService actor

Hour 7-9:   POCKET 2 - Parallel (4 agents)
            ├── 2-1: BUG-134 PO Add Item
            ├── 2-2: BUG-135 Create PO
            ├── 2-3: BUG-136 Edit modal
            └── 2-4: BUG-137 Test data

Hour 9-11:  POCKET 3 - Verification (2 agents)
            ├── 3-1: Build verification
            └── 3-2: Golden Flow E2E

TOTAL: 11 hours (with parallelization)
       16-20 hours (sequential equivalent)
```

---

## Agent Assignment Matrix

| Agent ID | Pocket | Task | Files | Est |
|----------|--------|------|-------|-----|
| P0-1 | 0 | SCHEMA-015 | salesSheetsDb, productsDb, inventoryDb | 4h |
| P1A-1 | 1A | BUG-130 | salesSheetsDb.ts | 2h |
| P1A-2 | 1A | BUG-132 | productsDb.ts | 2h |
| P1B-1 | 1B | BUG-131 | Inventory.tsx | 1h |
| P1B-2 | 1B | BUG-133 | Settings.tsx / RBAC pages | 2h |
| P1C-1 | 1C | SEC-031 | inventoryDb.ts | 1h |
| P1C-2 | 1C | SEC-032 | payablesService.ts | 1h |
| P2-1 | 2 | BUG-134 | PurchaseOrdersPage.tsx | 1h |
| P2-2 | 2 | BUG-135 | PurchaseOrdersPage.tsx | 1h |
| P2-3 | 2 | BUG-136 | Inventory.tsx, EditBatchModal | 1h |
| P2-4 | 2 | BUG-137 | seed scripts | 2h |
| P3-1 | 3 | VERIFY-BUILD | - | 30m |
| P3-2 | 3 | VERIFY-GF | staging env | 1.5h |

---

## Success Criteria

- [ ] All 6 S1-Critical bugs fixed
- [ ] All 2 S2-High bugs fixed
- [ ] All 2 Security violations fixed
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] All 8 Golden Flows pass E2E testing in staging
- [ ] No new errors in production logs

---

## Rollback Plan

If issues found after deployment:

1. **Revert commits** - `git revert <commit-hash>`
2. **Re-deploy** - Push to main triggers auto-deploy
3. **Monitor** - `./scripts/terp-logs.sh run 100 | grep -i error`

---

## Notes

- All agents must use `getAuthenticatedUserId(ctx)` for actor attribution
- No `any` types allowed
- All mutations must use transactions where applicable
- Pre-commit hooks will block forbidden patterns
