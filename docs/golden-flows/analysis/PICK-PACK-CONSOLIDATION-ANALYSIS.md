# Pick & Pack System Consolidation Analysis

**Document Type**: Technical Analysis & Recommendation
**Version**: 1.0
**Created**: 2026-01-27
**Author**: Claude Agent
**Related**: GF-005 Pick & Pack Specification

---

## Executive Summary

TERP currently has **two parallel pick & pack systems** that operate on different columns of the `orders` table with different data models, status workflows, and capabilities. This analysis recommends **consolidating to the ordersRouter fulfillment system** while migrating the valuable bag management features from WS-003.

**Recommendation**: Use `fulfillmentStatus` (ordersRouter) as canonical, deprecate `pickPackStatus` (WS-003)

---

## System Comparison

### System 1: pickPackRouter (WS-003)
**File**: `server/routers/pickPack.ts` (741 lines)

| Aspect | Details |
|--------|---------|
| **Status Column** | `orders.pickPackStatus` |
| **Status Values** | PENDING → PICKING → PACKED → READY (4 states) |
| **Data Model** | Works with `orders.items` JSON field (denormalized) |
| **Tables Used** | `order_bags`, `order_item_bags` |
| **Inventory** | ❌ Does NOT handle inventory allocation/release |
| **State Machine** | ❌ No formal transition validation |
| **Auth Pattern** | ⚠️ Uses `ctx.user?.id` (code smell, QA-001) |
| **Endpoints** | 8: getPickList, getOrderDetails, packItems, unpackItems, markAllPacked, markOrderReady, updateStatus, getStats |

**Strengths**:
- Bag management with identifiers (BAG-001, etc.)
- Multi-item packing into containers
- Dedicated warehouse worker UI
- Unpack capability with audit logging

**Weaknesses**:
- Uses denormalized JSON items (not order_line_items)
- No inventory allocation tracking
- No state machine validation
- `ctx.user?.id` instead of `getAuthenticatedUserId()`
- Terminal state (READY) doesn't connect to shipping

---

### System 2: ordersRouter Fulfillment
**File**: `server/routers/orders.ts` (2345 lines)

| Aspect | Details |
|--------|---------|
| **Status Column** | `orders.fulfillmentStatus` |
| **Status Values** | DRAFT → CONFIRMED → PENDING → PACKED → SHIPPED → DELIVERED → RETURNED → RESTOCKED/RETURNED_TO_VENDOR (10 states) |
| **Data Model** | Uses normalized `order_line_items` + `order_line_item_allocations` |
| **Tables Used** | `order_line_items`, `order_line_item_allocations`, `inventory_movements`, `order_status_history` |
| **Inventory** | ✅ Full allocation/release with reservedQty tracking |
| **State Machine** | ✅ `orderStateMachine.ts` with validateTransition() |
| **Auth Pattern** | ✅ Uses `getAuthenticatedUserId(ctx)` |
| **Endpoints** | 8+: confirmOrder, fulfillOrder, shipOrder, deliverOrder, markAsReturned, processRestock, processVendorReturn, allocateBatchesToLineItem |

**Strengths**:
- Full order lifecycle (draft to delivery to returns)
- Proper inventory allocation with batch reservations
- Normalized data model with COGS tracking per line item
- Formal state machine with transition validation
- Inventory movement audit trail
- Return processing workflow

**Weaknesses**:
- No bag/container management
- Picking is per-item, not multi-select into bags
- Less visual/tactile for warehouse workers

---

## Data Flow Differences

### WS-003 pickPackRouter Flow
```
Order Confirmed
      ↓
pickPackStatus = PENDING (default)
      ↓
[Worker selects items] → packItems mutation
      ↓
Creates: order_bags record
Creates: order_item_bags assignments
pickPackStatus = PICKING
      ↓
[All items packed] → markOrderReady mutation
      ↓
pickPackStatus = READY
      ↓
??? (No connection to shipping/delivery)
```

### ordersRouter Fulfillment Flow
```
Order Created (isDraft = true)
      ↓
orders.confirm → fulfillmentStatus = CONFIRMED
      ↓                 ↓
Reserves inventory   Creates order_line_items
(batches.reservedQty++)
      ↓
orders.fulfillOrder → Records picked quantities
      ↓
fulfillmentStatus = PACKED
      ↓
orders.shipOrder → Releases reservations
      ↓            Creates inventory_movements
fulfillmentStatus = SHIPPED
      ↓
orders.deliverOrder
      ↓
fulfillmentStatus = DELIVERED
      ↓ (if return)
fulfillmentStatus = RETURNED → RESTOCKED or RETURNED_TO_VENDOR
```

---

## Consumer Analysis (Blast Radius)

### WS-003 pickPackRouter Consumers

| Consumer | Type | Files | Impact |
|----------|------|-------|--------|
| PickPackPage | UI Component | `client/src/pages/PickPackPage.tsx` | 466 lines, MAJOR rewrite |
| PickPackWorkSurface | UI Component | `client/src/components/work-surface/PickPackWorkSurface.tsx` | ~400 lines, MAJOR rewrite |
| PickPackGrid | Spreadsheet View | `client/src/components/spreadsheet/PickPackGrid.tsx` | ~200 lines, MAJOR rewrite |
| App.tsx | Router | `client/src/App.tsx` | Route definition only |
| SpreadsheetViewPage | Integration | `client/src/pages/SpreadsheetViewPage.tsx` | Minor integration point |
| E2E Tests | Test | Various | Need migration |

**Total UI Components to Migrate**: 3 major + several minor

### ordersRouter Fulfillment Consumers

| Consumer | Type | Files | Impact |
|----------|------|-------|--------|
| OrderFulfillment | UI Component | `client/src/components/orders/OrderFulfillment.tsx` | 700 lines, KEEP |
| OrdersWorkSurface | Work Surface | `client/src/components/work-surface/OrdersWorkSurface.tsx` | KEEP + extend |
| orderOrchestrator | Service | `server/services/orderOrchestrator.ts` | KEEP |
| returnProcessing | Service | `server/services/returnProcessing.ts` | KEEP |
| E2E Tests | Test | Various | KEEP |

---

## Schema Dependencies

### Tables Unique to WS-003
```sql
-- order_bags: Created in migration 0013
CREATE TABLE order_bags (
  id INT PRIMARY KEY,
  order_id INT NOT NULL,
  bag_identifier VARCHAR(50) NOT NULL,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP
);

-- order_item_bags: Created in migration 0013
CREATE TABLE order_item_bags (
  id INT PRIMARY KEY,
  order_item_id INT NOT NULL,  -- References virtual item index, NOT order_line_items.id
  bag_id INT NOT NULL,
  packed_at TIMESTAMP,
  packed_by INT
);
```

### Tables Unique to ordersRouter Fulfillment
```sql
-- order_line_items: Normalized line items with COGS
-- order_line_item_allocations: Batch-to-line-item assignments
-- inventory_movements: Audit trail for inventory changes
-- order_status_history: Status change audit trail
```

### Shared Schema
- `orders.pickPackStatus` - Used by WS-003
- `orders.fulfillmentStatus` - Used by ordersRouter
- `orders.packedAt`, `orders.packedBy` - Used by BOTH

---

## Recommendation

### **RECOMMENDED: Consolidate to ordersRouter Fulfillment**

**Rationale**:

1. **Inventory Integrity** (Critical)
   - ordersRouter properly tracks reservedQty
   - ordersRouter releases inventory on ship
   - WS-003 has no inventory management = potential overselling

2. **Data Model** (Important)
   - ordersRouter uses normalized `order_line_items` table
   - WS-003 uses JSON `items` field (hard to query, no referential integrity)
   - COGS and margin tracking only in order_line_items

3. **State Machine** (Important)
   - ordersRouter has formal `orderStateMachine.ts`
   - Prevents invalid transitions (can't ship before pack, etc.)
   - WS-003 has no transition validation

4. **Complete Lifecycle**
   - ordersRouter: draft → confirmed → packed → shipped → delivered → returned
   - WS-003: pending → picking → packed → ready (dead end, doesn't connect to ship)

5. **Code Quality**
   - ordersRouter uses `getAuthenticatedUserId(ctx)`
   - WS-003 uses `ctx.user?.id` (4 instances - security code smell)

### Migration Strategy

**Phase 1: Add Bag Management to ordersRouter** (Extend canonical system)
- Create `orders.addItemsToBag` endpoint
- Create `orders.removeBagItems` endpoint
- Create `orders.getBagsForOrder` endpoint
- Reuse existing `order_bags` and `order_item_bags` tables
- BUT reference `order_line_items.id` instead of virtual item index

**Phase 2: Migrate UI Components**
- Migrate PickPackPage to use ordersRouter + new bag endpoints
- Migrate PickPackWorkSurface similarly
- Migrate PickPackGrid similarly
- Update status colors/labels for fulfillmentStatus

**Phase 3: Deprecate WS-003**
- Mark pickPackRouter endpoints as deprecated
- Add warning logs on usage
- Remove after confirming no usage

**Phase 4: Schema Cleanup**
- Remove `orders.pickPackStatus` column (migration)
- Update `order_item_bags.order_item_id` to reference `order_line_items.id`

---

## Blast Radius Summary

| Category | Impact Level | Items Affected |
|----------|--------------|----------------|
| **Server Router** | LOW | Remove 1 router (pickPack.ts, 741 lines) |
| **Server Services** | NONE | No services use WS-003 exclusively |
| **Client Pages** | HIGH | 3 UI components need rewrite (~1100 lines total) |
| **Client Routes** | LOW | Update 1-2 route imports |
| **Schema** | MEDIUM | 1 column removal, 1 FK update |
| **E2E Tests** | MEDIUM | Update tests using pickPack.* endpoints |
| **Documentation** | LOW | Update GF-005 spec after consolidation |

### Estimated Effort

| Phase | Estimate |
|-------|----------|
| Phase 1: Bag endpoints in ordersRouter | 4-8 hours |
| Phase 2: UI migration | 16-24 hours |
| Phase 3: Deprecation & monitoring | 2-4 hours |
| Phase 4: Schema cleanup | 2-4 hours |
| **Total** | **24-40 hours** |

---

## Decision Matrix

| Criterion | Keep WS-003 | Keep ordersRouter | Winner |
|-----------|-------------|-------------------|--------|
| Inventory management | ❌ None | ✅ Full allocation | ordersRouter |
| Data model | ❌ JSON blob | ✅ Normalized | ordersRouter |
| State validation | ❌ None | ✅ State machine | ordersRouter |
| Complete lifecycle | ❌ Ends at READY | ✅ Through delivery | ordersRouter |
| Auth pattern | ⚠️ ctx.user?.id | ✅ getAuthenticatedUserId | ordersRouter |
| Bag management | ✅ Has feature | ❌ Missing | WS-003 |
| Warehouse UX | ✅ Better UI | ⚠️ Less visual | WS-003 |

**Verdict**: ordersRouter wins 5-2. The bag management and warehouse UX from WS-003 should be migrated to ordersRouter rather than building inventory/state machine into WS-003.

---

## Appendix: Files to Modify

### Server Files
- `server/routers/orders.ts` - Add bag management endpoints
- `server/routers/pickPack.ts` - Mark deprecated, eventually remove
- `server/routers/_app.ts` - Remove pickPack import after deprecation

### Client Files
- `client/src/pages/PickPackPage.tsx` - Rewrite to use orders.*
- `client/src/components/work-surface/PickPackWorkSurface.tsx` - Rewrite
- `client/src/components/spreadsheet/PickPackGrid.tsx` - Rewrite
- `client/src/App.tsx` - Update imports if needed

### Schema Files
- `drizzle/schema.ts` - Remove pickPackStatusEnum after migration
- New migration: Update order_item_bags FK

### Test Files
- Any E2E tests using `pickPack.*` endpoints

---

## Next Steps

1. [ ] Get stakeholder approval for consolidation direction
2. [ ] Create detailed execution plan for Phase 1 (bag endpoints)
3. [ ] Implement Phase 1 and validate with tests
4. [ ] Plan UI migration (Phase 2) with UX review
5. [ ] Execute migration in stages with feature flags if needed
