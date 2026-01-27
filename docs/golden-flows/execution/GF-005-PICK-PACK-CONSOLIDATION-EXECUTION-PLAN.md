# GF-005 Pick & Pack Consolidation Execution Plan

**Task**: Consolidate dual pick & pack systems to single ordersRouter-based system
**Source Analysis**: `docs/golden-flows/analysis/PICK-PACK-CONSOLIDATION-ANALYSIS.md`
**Created**: 2026-01-27
**Priority**: Focus on ROBUSTNESS and EFFICACY first, efficiency second

---

## Executive Summary

This execution plan consolidates TERP's two parallel pick & pack systems:
- **WS-003 pickPackRouter** (bag-based, uses `pickPackStatus`)
- **ordersRouter fulfillment** (shipping workflow, uses `fulfillmentStatus`)

**Target**: Single system using `fulfillmentStatus` with bag management capabilities.

**Key Principle**: Every step must be independently verifiable and reversible.

---

## Pre-Execution Checklist

Before starting ANY phase:

- [ ] Read `CLAUDE.md` verification protocol (Section 2)
- [ ] Confirm no active sessions on related files (`docs/ACTIVE_SESSIONS.md`)
- [ ] Verify branch is up to date: `git pull --rebase origin main`
- [ ] Run baseline verification: `pnpm check && pnpm lint && pnpm test`

---

## Phase 0: Data Audit & Risk Assessment

**Mode**: 🔴 RED (Data integrity critical path)
**Objective**: Understand current state before any changes
**Estimate**: 4-8h
**Dependencies**: None

### Step 0.1: Inventory Current WS-003 State

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 0.1.1 | Query: Count orders by pickPackStatus | Returns counts for PENDING, PICKING, PACKED, READY | 10m |
| 0.1.2 | Query: Count order_bags records | Returns total bag count | 5m |
| 0.1.3 | Query: Count order_item_bags records | Returns total item-bag assignments | 5m |
| 0.1.4 | Query: Identify orders with bags but no order_line_items | Returns list of problem orders | 15m |
| 0.1.5 | Document findings in audit report | Audit report created | 20m |

**SQL Queries for 0.1.1-0.1.4**:
```sql
-- 0.1.1: Orders by pickPackStatus
SELECT pickPackStatus, COUNT(*) as count
FROM orders
WHERE orderType = 'SALE' AND deletedAt IS NULL
GROUP BY pickPackStatus;

-- 0.1.2: Total bags
SELECT COUNT(*) as bag_count FROM order_bags;

-- 0.1.3: Total item-bag assignments
SELECT COUNT(*) as item_bag_count FROM order_item_bags;

-- 0.1.4: Orders with bags but no order_line_items (PROBLEM ORDERS)
SELECT DISTINCT ob.order_id, o.orderNumber, o.pickPackStatus
FROM order_bags ob
JOIN orders o ON ob.order_id = o.id
LEFT JOIN order_line_items oli ON o.id = oli.orderId
WHERE oli.id IS NULL;
```

**Acceptance Criteria**:
- Audit report exists at `docs/migration/PICK-PACK-DATA-AUDIT.md`
- Problem order count documented
- Zero surprises in data state

### Step 0.2: Analyze order_item_bags.orderItemId Values

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 0.2.1 | Query: Distribution of orderItemId values | Understand if using indices vs IDs | 15m |
| 0.2.2 | Compare with order JSON items array lengths | Confirm index-based referencing | 15m |
| 0.2.3 | Document the mapping strategy needed | Strategy documented | 15m |

**SQL Queries**:
```sql
-- 0.2.1: Distribution of orderItemId values
SELECT
  MIN(order_item_id) as min_id,
  MAX(order_item_id) as max_id,
  COUNT(DISTINCT order_item_id) as unique_ids
FROM order_item_bags;

-- 0.2.2: Compare with order items array
SELECT
  ob.order_id,
  oib.order_item_id,
  JSON_LENGTH(o.items) as items_array_length
FROM order_item_bags oib
JOIN order_bags ob ON oib.bag_id = ob.id
JOIN orders o ON ob.order_id = o.id
LIMIT 100;
```

**Acceptance Criteria**:
- Confirmed whether orderItemId is JSON index or something else
- Mapping strategy documented for migration

### Step 0.3: Identify Status Conflicts

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 0.3.1 | Query: Orders with conflicting pickPackStatus vs fulfillmentStatus | List of conflicts | 20m |
| 0.3.2 | Categorize conflicts by severity | Severity matrix created | 15m |
| 0.3.3 | Define resolution strategy for each category | Resolution plan documented | 30m |

**SQL Query**:
```sql
-- Orders with potential status conflicts
SELECT
  id,
  orderNumber,
  pickPackStatus,
  fulfillmentStatus,
  CASE
    WHEN pickPackStatus = 'READY' AND fulfillmentStatus = 'PENDING' THEN 'HIGH: Ready but not fulfilled'
    WHEN pickPackStatus = 'PICKING' AND fulfillmentStatus IN ('SHIPPED', 'DELIVERED') THEN 'CRITICAL: Still picking but shipped'
    WHEN pickPackStatus = 'PACKED' AND fulfillmentStatus = 'CANCELLED' THEN 'MEDIUM: Packed but cancelled'
    ELSE 'LOW: No conflict'
  END as conflict_severity
FROM orders
WHERE orderType = 'SALE'
  AND deletedAt IS NULL
  AND (pickPackStatus IS NOT NULL OR fulfillmentStatus IS NOT NULL)
HAVING conflict_severity != 'LOW: No conflict';
```

**Acceptance Criteria**:
- All conflicts identified and categorized
- Resolution strategy for each conflict type

### Step 0.4: Create Rollback Script

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 0.4.1 | Create backup table script | Script creates order_bags_backup, order_item_bags_backup | 15m |
| 0.4.2 | Create restore script | Script restores from backups | 15m |
| 0.4.3 | Test backup/restore cycle on staging | Successful round-trip | 30m |
| 0.4.4 | Document rollback procedure | Procedure documented | 15m |

**File**: `scripts/migration/pick-pack-rollback.sql`

**Acceptance Criteria**:
- Backup script tested on staging
- Restore script tested on staging
- Rollback procedure documented

### Phase 0 Deliverables

- [ ] `docs/migration/PICK-PACK-DATA-AUDIT.md` - Current state analysis
- [ ] `docs/migration/PICK-PACK-STATUS-CONFLICTS.md` - Conflict resolution plan
- [ ] `scripts/migration/pick-pack-backup.sql` - Backup script
- [ ] `scripts/migration/pick-pack-rollback.sql` - Rollback script

### Phase 0 Verification

```bash
# Must pass before proceeding to Phase 1
pnpm check && pnpm lint && pnpm test
# Audit documents must exist
ls docs/migration/PICK-PACK-*.md
# Scripts must exist and be executable
ls scripts/migration/pick-pack-*.sql
```

---

## Phase 1: Backend Extension (Robustness Focus)

**Mode**: 🟡 STRICT
**Objective**: Add bag management to ordersRouter without breaking existing functionality
**Estimate**: 8-12h
**Dependencies**: Phase 0 complete

### Step 1.1: Add `orders:pack` Permission

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 1.1.1 | Add `orders:pack` to permission enum in schema | `pnpm check` passes | 10m |
| 1.1.2 | Create migration for permission | Migration file created | 10m |
| 1.1.3 | Add permission to relevant roles (Fulfillment, Admin) | Seed script updated | 15m |
| 1.1.4 | Run migration and seed | Database updated | 10m |
| 1.1.5 | Write unit test for permission check | Test passes | 15m |

**Files Modified**:
- `drizzle/schema.ts` - Add permission enum value
- `server/db/seeds/permissions.ts` - Assign to roles
- `server/routers/orders.test.ts` - Unit test

**Acceptance Criteria**:
- `orders:pack` permission exists
- Assigned to Fulfillment and Admin roles
- Unit test verifies permission check

### Step 1.2: Add Bag Management Endpoints to ordersRouter

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 1.2.1 | Create `orders.getBagsForOrder` query | Returns bags for order | 30m |
| 1.2.2 | Create `orders.createBag` mutation | Creates bag with identifier | 30m |
| 1.2.3 | Create `orders.addItemsToBag` mutation | Assigns line items to bag | 45m |
| 1.2.4 | Create `orders.removeItemsFromBag` mutation | Removes with audit log | 45m |
| 1.2.5 | Create `orders.deleteBag` mutation | Soft deletes empty bag | 20m |
| 1.2.6 | Write unit tests for all endpoints | All tests pass | 60m |

**Implementation Requirements** (ROBUSTNESS):

```typescript
// 1.2.3: addItemsToBag MUST:
// - Use transaction for atomicity
// - Reference order_line_items.id (NOT JSON index)
// - Validate order is in packable state (not SHIPPED, DELIVERED, CANCELLED)
// - Validate line items belong to the order
// - Use getAuthenticatedUserId(ctx) for actor
// - Log to audit_logs on success

// 1.2.4: removeItemsFromBag MUST:
// - Require reason parameter (audit trail)
// - Use transaction
// - Log removal to audit_logs with before/after state
// - Use getAuthenticatedUserId(ctx)
```

**Files Modified**:
- `server/routers/orders.ts` - Add 5 new endpoints
- `server/routers/orders.test.ts` - Unit tests

**Acceptance Criteria**:
- All 5 endpoints functional
- All use `getAuthenticatedUserId(ctx)` (NOT `ctx.user?.id`)
- All mutations use transactions
- All mutations log to audit_logs
- Unit tests pass

### Step 1.3: Add FK Constraint to order_item_bags

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 1.3.1 | Create migration: add orderLineItemId column | Migration created | 15m |
| 1.3.2 | Create migration: add FK constraint | Migration created | 10m |
| 1.3.3 | Write data migration script | Script converts JSON index → line item ID | 60m |
| 1.3.4 | Test migration on staging | Successful migration | 30m |
| 1.3.5 | Create migration: drop old orderItemId column (FUTURE) | Migration ready but NOT run | 10m |

**CRITICAL**: Do NOT drop `orderItemId` yet. Keep both columns during transition.

**Data Migration Logic**:
```sql
-- For each order_item_bags record:
-- 1. Get the order_id from the bag
-- 2. Get the order's items JSON
-- 3. Map JSON index to actual batchId
-- 4. Find order_line_items.id where orderId=X AND batchId=Y
-- 5. Update order_item_bags.orderLineItemId = found ID
```

**Acceptance Criteria**:
- New `orderLineItemId` column exists with FK
- Migration script tested on staging
- Existing data preserved

### Step 1.4: Status Synchronization Logic

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 1.4.1 | Create `syncPickPackStatus` service function | Function exists | 30m |
| 1.4.2 | Call sync from orders.shipOrder | Sync happens on ship | 15m |
| 1.4.3 | Call sync from orders.deliverOrder | Sync happens on deliver | 15m |
| 1.4.4 | Write unit tests for sync logic | Tests pass | 30m |

**Sync Logic**:
```typescript
// When fulfillmentStatus changes, update pickPackStatus accordingly:
// SHIPPED → pickPackStatus = null (cleared)
// DELIVERED → pickPackStatus = null (cleared)
// CANCELLED → pickPackStatus = null (cleared)
// PACKED (fulfillment) → pickPackStatus = PACKED (sync)
```

**Acceptance Criteria**:
- Status sync prevents conflicts
- Unit tests verify sync behavior

### Phase 1 Deliverables

- [ ] `orders:pack` permission added and assigned
- [ ] 5 bag management endpoints in ordersRouter
- [ ] `orderLineItemId` FK column added to order_item_bags
- [ ] Data migration script for existing data
- [ ] Status synchronization logic implemented
- [ ] Unit tests for all new code

### Phase 1 Verification

```bash
# Definition of Done
pnpm check          # TypeScript: PASS
pnpm lint           # ESLint: PASS
pnpm test           # Tests: PASS (including new tests)
pnpm build          # Build: PASS

# Specific checks
grep -r "ctx.user?.id" server/routers/orders.ts  # Should return 0 matches in new code
```

---

## Phase 2: Feature Flag & UI Adapter

**Mode**: 🟡 STRICT
**Objective**: Enable switching between systems without code deployment
**Estimate**: 8-12h
**Dependencies**: Phase 1 complete

### Step 2.1: Create Feature Flag

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 2.1.1 | Add `USE_UNIFIED_PICK_PACK` feature flag to DB | Flag exists in feature_flags table | 15m |
| 2.1.2 | Create server-side flag check utility | Utility returns flag state | 20m |
| 2.1.3 | Create client-side flag hook | `useFeatureFlag('USE_UNIFIED_PICK_PACK')` works | 20m |
| 2.1.4 | Default flag to FALSE (old system) | Flag is off by default | 5m |

**Files Modified**:
- `server/db/seeds/featureFlags.ts`
- `server/services/featureFlagService.ts`
- `client/src/hooks/useFeatureFlag.ts`

**Acceptance Criteria**:
- Flag can be toggled in admin UI
- Server and client both respect flag

### Step 2.2: Create API Adapter Layer

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 2.2.1 | Create `usePickPackAdapter` hook | Hook created | 30m |
| 2.2.2 | Implement getPickList adapter | Returns same shape from either backend | 45m |
| 2.2.3 | Implement packItems adapter | Works with either backend | 45m |
| 2.2.4 | Implement unpackItems adapter | Works with either backend | 30m |
| 2.2.5 | Implement markOrderReady adapter | Works with either backend | 30m |
| 2.2.6 | Write integration tests | Tests pass for both flag states | 60m |

**Adapter Shape**:
```typescript
// client/src/hooks/usePickPackAdapter.ts
export function usePickPackAdapter() {
  const useUnified = useFeatureFlag('USE_UNIFIED_PICK_PACK');

  const getPickList = useCallback(async (filters) => {
    if (useUnified) {
      // Call orders.getAll with fulfillmentStatus filter
      // Transform response to PickPack shape
    } else {
      // Call pickPack.getPickList
    }
  }, [useUnified]);

  // ... other methods
}
```

**Acceptance Criteria**:
- UI works identically with flag on OR off
- No visible difference to users during transition

### Step 2.3: Update UI Components to Use Adapter

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 2.3.1 | Update PickPackPage to use adapter | Page works with both backends | 45m |
| 2.3.2 | Update PickPackWorkSurface to use adapter | Component works with both | 45m |
| 2.3.3 | Update PickPackGrid to use adapter | Grid works with both | 30m |
| 2.3.4 | Manual QA with flag OFF | Existing behavior preserved | 30m |
| 2.3.5 | Manual QA with flag ON | New behavior works | 30m |

**Acceptance Criteria**:
- All UI components use adapter
- No direct pickPack.* calls remain in UI

### Phase 2 Deliverables

- [ ] `USE_UNIFIED_PICK_PACK` feature flag
- [ ] `usePickPackAdapter` hook with full implementation
- [ ] All UI components updated to use adapter
- [ ] Integration tests for both flag states

### Phase 2 Verification

```bash
pnpm check && pnpm lint && pnpm test && pnpm build

# Manual verification
# 1. Set flag OFF → verify existing behavior
# 2. Set flag ON → verify new behavior
# 3. Toggle flag → verify no errors
```

---

## Phase 3: Data Migration & Cutover

**Mode**: 🔴 RED (Production data changes)
**Objective**: Migrate existing data and enable new system
**Estimate**: 4-6h
**Dependencies**: Phase 2 complete, verified on staging

### Step 3.1: Pre-Migration Checklist

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 3.1.1 | Create full database backup | Backup verified | 15m |
| 3.1.2 | Verify rollback script is ready | Script tested on staging | 10m |
| 3.1.3 | Notify stakeholders of planned migration | Acknowledgment received | 10m |
| 3.1.4 | Schedule migration for low-traffic period | Time confirmed | 5m |

**Acceptance Criteria**:
- Backup exists and is verified
- Stakeholders notified
- Migration window scheduled

### Step 3.2: Execute Data Migration

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 3.2.1 | Run backup script | Backup tables created | 10m |
| 3.2.2 | Run orderItemId → orderLineItemId migration | All records updated | 30m |
| 3.2.3 | Verify migration counts match | Before/after counts equal | 10m |
| 3.2.4 | Run status conflict resolution | Conflicts resolved | 30m |
| 3.2.5 | Verify no orphaned records | Query returns 0 | 10m |

**Verification Queries**:
```sql
-- Verify migration
SELECT COUNT(*) FROM order_item_bags WHERE orderLineItemId IS NULL;
-- Should return 0

-- Verify no orphans
SELECT COUNT(*) FROM order_item_bags oib
LEFT JOIN order_line_items oli ON oib.orderLineItemId = oli.id
WHERE oli.id IS NULL;
-- Should return 0
```

**Acceptance Criteria**:
- All order_item_bags have valid orderLineItemId
- No orphaned records
- Counts match pre-migration

### Step 3.3: Enable Feature Flag

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 3.3.1 | Enable `USE_UNIFIED_PICK_PACK` flag | Flag is ON | 5m |
| 3.3.2 | Monitor error logs for 15 minutes | No new errors | 15m |
| 3.3.3 | Verify UI functions correctly | Manual smoke test | 15m |
| 3.3.4 | Monitor for 1 hour | Stable operation | 60m |

**Acceptance Criteria**:
- Flag enabled
- No errors in logs
- UI functions correctly

### Step 3.4: 1-Week Observation Period

| Day | Action | Verification |
|-----|--------|--------------|
| Day 1 | Monitor errors, check user feedback | No critical issues |
| Day 2 | Review audit logs for unusual activity | Normal patterns |
| Day 3 | Check performance metrics | No degradation |
| Day 4-7 | Continue monitoring | Stable operation |

**Rollback Trigger Criteria** (if any occur, rollback immediately):
- Data corruption detected
- Critical UI functionality broken
- Error rate > 5% increase
- User-reported data loss

### Phase 3 Deliverables

- [ ] Database backup verified
- [ ] Data migration complete
- [ ] Feature flag enabled
- [ ] 1-week observation completed successfully

---

## Phase 4: Cleanup & Deprecation

**Mode**: 🟡 STRICT
**Objective**: Remove old system, clean schema
**Estimate**: 4-6h
**Dependencies**: Phase 3 observation complete (1 week)

### Step 4.1: Remove Feature Flag

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 4.1.1 | Remove feature flag check from adapter | Direct calls to new system | 30m |
| 4.1.2 | Delete adapter hook (no longer needed) | Hook removed | 15m |
| 4.1.3 | Update UI to call orders.* directly | UI updated | 30m |
| 4.1.4 | Delete feature flag from database | Flag removed | 10m |

**Acceptance Criteria**:
- No feature flag logic remains
- UI calls orders.* directly

### Step 4.2: Deprecate pickPackRouter

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 4.2.1 | Add deprecation warning to all pickPack endpoints | Warnings log on call | 30m |
| 4.2.2 | Monitor for 1 week for any calls | Check logs | - |
| 4.2.3 | Remove pickPackRouter from _app.ts | Router removed | 15m |
| 4.2.4 | Delete pickPack.ts file | File deleted | 5m |

**Acceptance Criteria**:
- No calls to pickPack.* in logs
- Router removed

### Step 4.3: Schema Cleanup

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 4.3.1 | Create migration: drop orderItemId column | Migration created | 10m |
| 4.3.2 | Create migration: drop pickPackStatus column | Migration created | 10m |
| 4.3.3 | Create migration: remove pickPackStatusEnum | Migration created | 10m |
| 4.3.4 | Run migrations | Schema updated | 15m |
| 4.3.5 | Update schema.ts to remove deprecated code | Schema clean | 15m |

**IMPORTANT**: Only run after confirming no usage of old system.

**Acceptance Criteria**:
- `orderItemId` column removed
- `pickPackStatus` column removed
- Schema file cleaned up

### Step 4.4: Documentation Update

| Step | Action | Verification | Est |
|------|--------|--------------|-----|
| 4.4.1 | Update GF-005-PICK-PACK.md spec | Spec reflects single system | 30m |
| 4.4.2 | Archive WS-003-SPEC.md | Moved to archive | 10m |
| 4.4.3 | Update API documentation | Docs reflect changes | 20m |
| 4.4.4 | Create migration completion report | Report created | 30m |

**Acceptance Criteria**:
- All documentation updated
- Migration report filed

### Phase 4 Deliverables

- [ ] Feature flag removed
- [ ] pickPackRouter deprecated and removed
- [ ] Schema cleaned (columns dropped)
- [ ] Documentation updated
- [ ] Migration completion report filed

---

## Verification Protocol (All Phases)

Before marking ANY phase complete:

```bash
# Definition of Done (8 Criteria from CLAUDE.md)
pnpm check          # 1. TypeScript: PASS
pnpm lint           # 2. ESLint: PASS
pnpm test           # 3. Tests: PASS
pnpm build          # 4. Build: PASS
pnpm roadmap:validate # 5. Roadmap: VALID (if modified)
# 6. E2E tests: PASS (run manually)
# 7. Deployment verified (if pushed)
# 8. No new errors in logs
```

---

## Rollback Procedures

### Phase 1 Rollback
```bash
# Revert commits
git revert HEAD~N  # N = number of Phase 1 commits

# Drop new columns (if migration ran)
# Run: scripts/migration/phase1-rollback.sql
```

### Phase 2 Rollback
```bash
# Disable feature flag
UPDATE feature_flags SET enabled = false WHERE name = 'USE_UNIFIED_PICK_PACK';

# Revert adapter code
git revert HEAD~N
```

### Phase 3 Rollback
```bash
# 1. Disable feature flag immediately
UPDATE feature_flags SET enabled = false WHERE name = 'USE_UNIFIED_PICK_PACK';

# 2. Restore from backup tables
# Run: scripts/migration/pick-pack-rollback.sql

# 3. Verify restoration
SELECT COUNT(*) FROM order_item_bags;
SELECT COUNT(*) FROM order_item_bags_backup;
-- Counts should match
```

---

## Risk Mitigations

| Risk | Mitigation | Owner |
|------|------------|-------|
| Data corruption | Phase 0 audit + backup + rollback script | Agent |
| Status conflicts | Status sync logic in Phase 1 | Agent |
| Permission issues | New `orders:pack` permission | Agent |
| UI breaks | Feature flag + adapter layer | Agent |
| Performance regression | Monitor after cutover | Agent |

---

## Estimated Total Effort

| Phase | Focus | Estimate |
|-------|-------|----------|
| Phase 0 | Robustness (data audit) | 4-8h |
| Phase 1 | Efficacy (backend extension) | 8-12h |
| Phase 2 | Efficiency (UI adapter) | 8-12h |
| Phase 3 | Robustness (migration) | 4-6h |
| Phase 4 | Efficiency (cleanup) | 4-6h |
| **Total** | | **28-44h** |

---

## Roadmap Tasks

The following tasks should be added to MASTER_ROADMAP.md:

```markdown
### INFRA-020: Pick & Pack Consolidation Phase 0 - Data Audit

**Status**: ready
**Priority**: HIGH
**Estimate**: 8h
**Module**: docs/migration/, scripts/migration/
**Dependencies**: None

**Problem**: Two parallel pick & pack systems create state conflicts and data integrity risks.

**Objectives**:
1. Audit current WS-003 usage and data state
2. Identify status conflicts between pickPackStatus and fulfillmentStatus
3. Create backup and rollback scripts

**Deliverables**:
- [ ] Data audit report (PICK-PACK-DATA-AUDIT.md)
- [ ] Status conflict analysis (PICK-PACK-STATUS-CONFLICTS.md)
- [ ] Backup script (pick-pack-backup.sql)
- [ ] Rollback script (pick-pack-rollback.sql)

**Acceptance Criteria**:
- All queries documented and tested
- Rollback procedure verified on staging
---

### INFRA-021: Pick & Pack Consolidation Phase 1 - Backend Extension

**Status**: ready
**Priority**: HIGH
**Estimate**: 16h
**Module**: server/routers/orders.ts, drizzle/schema.ts
**Dependencies**: INFRA-020

**Problem**: ordersRouter lacks bag management capabilities.

**Objectives**:
1. Add `orders:pack` permission
2. Add 5 bag management endpoints to ordersRouter
3. Add FK constraint to order_item_bags
4. Implement status synchronization logic

**Deliverables**:
- [ ] `orders:pack` permission added
- [ ] getBagsForOrder endpoint
- [ ] createBag endpoint
- [ ] addItemsToBag endpoint
- [ ] removeItemsFromBag endpoint
- [ ] deleteBag endpoint
- [ ] orderLineItemId FK migration
- [ ] Status sync logic
- [ ] Unit tests (100% coverage for new code)

**Acceptance Criteria**:
- All endpoints use getAuthenticatedUserId(ctx)
- All mutations use transactions
- All mutations log to audit_logs
- pnpm check && pnpm lint && pnpm test passes
---

### INFRA-022: Pick & Pack Consolidation Phase 2 - Feature Flag & UI Adapter

**Status**: ready
**Priority**: HIGH
**Estimate**: 16h
**Module**: client/src/hooks/, client/src/pages/
**Dependencies**: INFRA-021

**Problem**: Need ability to switch systems without code deployment.

**Objectives**:
1. Create USE_UNIFIED_PICK_PACK feature flag
2. Create API adapter layer for UI
3. Update UI components to use adapter

**Deliverables**:
- [ ] Feature flag created and configurable
- [ ] usePickPackAdapter hook implemented
- [ ] PickPackPage uses adapter
- [ ] PickPackWorkSurface uses adapter
- [ ] PickPackGrid uses adapter
- [ ] Integration tests for both flag states

**Acceptance Criteria**:
- UI works identically with flag ON or OFF
- No direct pickPack.* calls in UI code
---

### INFRA-023: Pick & Pack Consolidation Phase 3 - Migration & Cutover

**Status**: ready
**Priority**: HIGH
**Estimate**: 8h
**Module**: Database, production
**Dependencies**: INFRA-022

**Problem**: Need to migrate existing data and enable new system.

**Objectives**:
1. Execute data migration
2. Enable feature flag
3. Complete 1-week observation period

**Deliverables**:
- [ ] Database backup verified
- [ ] Data migration complete
- [ ] Feature flag enabled
- [ ] 1-week observation log

**Acceptance Criteria**:
- No data corruption
- No error rate increase
- No user-reported issues
---

### INFRA-024: Pick & Pack Consolidation Phase 4 - Cleanup

**Status**: ready
**Priority**: MEDIUM
**Estimate**: 8h
**Module**: server/routers/, drizzle/schema.ts
**Dependencies**: INFRA-023

**Problem**: Old system code and schema remain after migration.

**Objectives**:
1. Remove feature flag logic
2. Deprecate and remove pickPackRouter
3. Clean up schema (drop columns)
4. Update documentation

**Deliverables**:
- [ ] Feature flag removed
- [ ] pickPackRouter removed
- [ ] orderItemId column dropped
- [ ] pickPackStatus column dropped
- [ ] GF-005 spec updated
- [ ] Migration completion report

**Acceptance Criteria**:
- No deprecated code remains
- Schema is clean
- Documentation is current
```

---

## Approval

- [ ] Stakeholder review of Phase 0 audit results
- [ ] Stakeholder approval for Phase 3 migration timing
- [ ] Final sign-off after Phase 4 completion
