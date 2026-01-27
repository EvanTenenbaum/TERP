# GF-007: Inventory Management Specification

**Version**: 1.0
**Status**: Draft
**Created**: 2026-01-27
**Last Updated**: 2026-01-27

---

## Overview

The Inventory Management flow handles core inventory operations for TERP's THCA wholesale cannabis business. This flow enables users to:

- **View** batch inventory with advanced filtering and sorting
- **Adjust** quantities with full audit trail
- **Transfer** inventory between locations (planned)
- **Report** on inventory status, aging, and valuation

Inventory is tracked at the **batch** level, where each batch represents a discrete lot of product from a supplier. The system maintains multiple quantity buckets per batch (on-hand, reserved, quarantine, hold) to support complex warehouse operations.

---

## User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INVENTORY MANAGEMENT FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. VIEW INVENTORY                                                           │
│     └─> Navigate to /inventory                                               │
│         └─> See dashboard stats (total items, value, availability)           │
│             └─> Browse batch list with key metrics                           │
│                                                                              │
│  2. FILTER & SEARCH                                                          │
│     └─> Use search bar (SKU, batch code, product name)                       │
│         └─> Apply advanced filters (status, category, vendor, grade, etc.)   │
│             └─> Sort by columns (SKU, on-hand, available, age, status)       │
│                 └─> Save views for quick access                              │
│                                                                              │
│  3. SELECT BATCH                                                             │
│     └─> Click row to open BatchDetailDrawer                                  │
│         └─> View quantities (on-hand, reserved, quarantine, available)       │
│             └─> See cost details, locations, audit trail                     │
│                                                                              │
│  4. MAKE ADJUSTMENT                                                          │
│     └─> Click "Adjust Quantity" button                                       │
│         └─> Enter adjustment amount (+/-) and reason                         │
│             └─> System validates (prevents negative inventory)               │
│                 └─> Movement recorded in inventory_movements                 │
│                     └─> Audit log created                                    │
│                                                                              │
│  5. CHANGE STATUS                                                            │
│     └─> Click "Change Status" button                                         │
│         └─> Select new status and provide reason                             │
│             └─> System validates status transition                           │
│                 └─> Quarantine sync (moves qty between buckets)              │
│                     └─> Audit log created                                    │
│                                                                              │
│  6. BULK OPERATIONS                                                          │
│     └─> Select multiple batches via checkboxes                               │
│         └─> Use bulk action bar (change status, delete)                      │
│             └─> Confirm action in dialog                                     │
│                 └─> System processes each batch with validation              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI States

### Batch List View (`/inventory`)

| State          | Description                        | UI Behavior                                            |
| -------------- | ---------------------------------- | ------------------------------------------------------ |
| **Loading**    | Initial page load or filter change | Show `DashboardSkeleton` and `TableSkeleton`           |
| **Empty**      | No batches in system               | Show empty state with "Create First Batch" CTA         |
| **No Results** | Filters return zero matches        | Show "No matching inventory" with clear filters button |
| **Loaded**     | Batches available                  | Show table with pagination, sorting, and filtering     |
| **Error**      | API failure                        | Show error message with retry option                   |

### Batch Detail Drawer

| State         | Description            | UI Behavior                           |
| ------------- | ---------------------- | ------------------------------------- |
| **Loading**   | Fetching batch details | Show `DrawerSkeleton` with 5 sections |
| **Loaded**    | Batch data available   | Show full detail view with actions    |
| **Not Found** | Batch ID invalid       | Show "Batch not found" message        |
| **Error**     | API failure            | Show error with retry button          |

### Adjustment Dialog

| State          | Description               | UI Behavior                               |
| -------------- | ------------------------- | ----------------------------------------- |
| **Input**      | User entering adjustment  | Show form with amount and reason fields   |
| **Validating** | Checking constraints      | Disable submit button                     |
| **Submitting** | API call in progress      | Show "Saving..." on button                |
| **Success**    | Adjustment complete       | Toast success, close dialog, refetch data |
| **Error**      | Validation or API failure | Toast error with message                  |

### Status Change Dialog

| State          | Description                       | UI Behavior                               |
| -------------- | --------------------------------- | ----------------------------------------- |
| **Input**      | User selecting status             | Show dropdown with valid statuses         |
| **Submitting** | API call in progress              | Show "Saving..." on button                |
| **Success**    | Status updated                    | Toast success, close dialog, refetch data |
| **Error**      | Invalid transition or API failure | Toast error with specific message         |

---

## API Endpoints

### Read Operations

| Endpoint                           | Purpose                                     | Input                                               | Output                                                                               |
| ---------------------------------- | ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `inventory.list`                   | Paginated batch list (legacy)               | `{ query?, limit, cursor, status?, category? }`     | `{ items, nextCursor, hasMore }`                                                     |
| `inventory.getEnhanced`            | Enhanced batch list with aging/stock status | `{ page, pageSize, sortBy, sortOrder, filters... }` | `{ items, pagination, summary }`                                                     |
| `inventory.getById`                | Single batch details                        | `batchId: number`                                   | `{ batch, locations, auditLogs, availableQty }`                                      |
| `inventory.batch`                  | Single batch (simplified)                   | `{ batchId }`                                       | `Batch`                                                                              |
| `inventory.batches`                | Multiple batches                            | `{ limit, cursor, status?, category?, search? }`    | `{ items, nextCursor, hasMore }`                                                     |
| `inventory.dashboardStats`         | Dashboard statistics                        | none                                                | `{ totalInventoryValue, totalUnits, statusCounts, categoryStats, subcategoryStats }` |
| `inventory.getAgingSummary`        | Aging analysis                              | none                                                | `{ summary, agingItemsCount, topAgingItems }`                                        |
| `inventory.getAvailableForProduct` | Available batches for a product             | `{ productId, minQuantity? }`                       | `AvailableBatch[]`                                                                   |

### Write Operations

| Endpoint                      | Purpose               | Input                                       | Output                                  |
| ----------------------------- | --------------------- | ------------------------------------------- | --------------------------------------- |
| `inventory.adjustQty`         | Adjust batch quantity | `{ id, field, adjustment, reason }`         | `{ success }`                           |
| `inventory.updateStatus`      | Change batch status   | `{ id, status, reason, version? }`          | `{ success }`                           |
| `inventory.updateBatch`       | Update batch fields   | `{ id, version?, ticket?, notes?, reason }` | `{ success }`                           |
| `inventory.intake`            | Create new batch      | `IntakeSchema`                              | `{ success, batch }`                    |
| `inventory.bulk.updateStatus` | Bulk status change    | `{ batchIds, newStatus }`                   | `{ success, updated, skipped, errors }` |
| `inventory.bulk.delete`       | Bulk soft delete      | `batchIds[]`                                | `{ success, deleted }`                  |

### Views & Reporting

| Endpoint                          | Purpose                      | Input                          | Output                 |
| --------------------------------- | ---------------------------- | ------------------------------ | ---------------------- |
| `inventory.views.list`            | Get saved views              | none                           | `SavedView[]`          |
| `inventory.views.save`            | Save current filters as view | `{ name, filters, isShared? }` | `{ success, id }`      |
| `inventory.views.delete`          | Delete saved view            | `viewId: number`               | `{ success }`          |
| `inventory.profitability.batch`   | Batch profitability          | `batchId: number`              | `ProfitabilityMetrics` |
| `inventory.profitability.summary` | Overall profitability        | none                           | `ProfitabilitySummary` |

---

## Data Model

### Primary Tables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              batches                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  id              INT PRIMARY KEY AUTO_INCREMENT                              │
│  code            VARCHAR(100) UNIQUE NOT NULL      -- Batch code             │
│  sku             VARCHAR(100) NOT NULL             -- Stock keeping unit     │
│  productId       INT FK → products.id                                        │
│  lotId           INT FK → lots.id                                            │
│  batchStatus     ENUM (see Status Values)                                    │
│  grade           VARCHAR(20)                       -- Quality grade          │
│  isSample        TINYINT DEFAULT 0                                           │
│  ─────────────── QUANTITY BUCKETS ───────────────                            │
│  onHandQty       DECIMAL(15,4) DEFAULT 0           -- Total physical qty     │
│  reservedQty     DECIMAL(15,4) DEFAULT 0           -- Reserved for orders    │
│  quarantineQty   DECIMAL(15,4) DEFAULT 0           -- Quarantined qty        │
│  holdQty         DECIMAL(15,4) DEFAULT 0           -- On hold qty            │
│  defectiveQty    DECIMAL(15,4) DEFAULT 0           -- Defective qty          │
│  ─────────────── COSTING ────────────────────────                            │
│  cogsMode        ENUM('FIXED','RANGE')                                       │
│  unitCogs        DECIMAL(15,4)                     -- Cost per unit          │
│  unitCogsMin     DECIMAL(15,4)                     -- Range min              │
│  unitCogsMax     DECIMAL(15,4)                     -- Range max              │
│  paymentTerms    ENUM (payment terms)                                        │
│  ─────────────── METADATA ───────────────────────                            │
│  metadata        JSON                              -- Flexible extra data    │
│  version         INT DEFAULT 1                     -- Optimistic locking     │
│  createdAt       TIMESTAMP DEFAULT NOW()                                     │
│  updatedAt       TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           batch_locations                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  id              INT PRIMARY KEY AUTO_INCREMENT                              │
│  batchId         INT FK → batches.id                                         │
│  site            VARCHAR(100)                      -- Warehouse site         │
│  zone            VARCHAR(50)                       -- Zone within site       │
│  rack            VARCHAR(50)                       -- Rack identifier        │
│  shelf           VARCHAR(50)                       -- Shelf position         │
│  bin             VARCHAR(50)                       -- Bin location           │
│  qty             DECIMAL(15,4)                     -- Qty at this location   │
│  createdAt       TIMESTAMP DEFAULT NOW()                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         inventory_movements                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  id                    INT PRIMARY KEY AUTO_INCREMENT                        │
│  batchId               INT FK → batches.id (RESTRICT)                        │
│  inventoryMovementType ENUM (see Movement Types)                             │
│  quantityChange        DECIMAL(15,4) NOT NULL      -- +/- change amount      │
│  quantityBefore        DECIMAL(15,4) NOT NULL      -- Qty before change      │
│  quantityAfter         DECIMAL(15,4) NOT NULL      -- Qty after change       │
│  referenceType         VARCHAR(50)                 -- ORDER, ADJUSTMENT, etc │
│  referenceId           INT                         -- Related entity ID      │
│  adjustmentReason      ENUM (see Adjustment Reasons)                         │
│  notes                 TEXT                        -- Additional context     │
│  performedBy           INT FK → users.id                                     │
│  createdAt             TIMESTAMP DEFAULT NOW()                               │
│  deletedAt             TIMESTAMP                   -- Soft delete            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Related Tables

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   products   │────<│   batches    │>────│     lots     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    brands    │     │batch_locations│    │   clients    │
└──────────────┘     └──────────────┘     │ (isSeller)   │
                            │             └──────────────┘
                            ▼
                     ┌──────────────┐
                     │  locations   │
                     └──────────────┘
```

### Available Quantity Calculation

```typescript
availableQty = onHandQty - reservedQty - quarantineQty - holdQty;
```

---

## Adjustment Types

### Movement Types (inventoryMovementType)

| Type                      | Description                | Direction       | Typical Source              |
| ------------------------- | -------------------------- | --------------- | --------------------------- |
| `INTAKE`                  | New inventory received     | +               | Direct intake from supplier |
| `SALE`                    | Inventory sold to customer | -               | Order fulfillment           |
| `RETURN`                  | Customer return (legacy)   | +               | Return processing           |
| `REFUND_RETURN`           | Customer refund/return     | +               | Order refund                |
| `ADJUSTMENT`              | Manual quantity adjustment | +/-             | Physical count discrepancy  |
| `QUARANTINE`              | Move to quarantine         | - (from onHand) | Quality issue               |
| `RELEASE_FROM_QUARANTINE` | Release from quarantine    | + (to onHand)   | QC passed                   |
| `DISPOSAL`                | Inventory disposed         | -               | Expired/damaged write-off   |
| `TRANSFER`                | Move between locations     | 0 (net)         | Warehouse reorganization    |
| `SAMPLE`                  | Sent as sample             | -               | Sales samples               |

### Adjustment Reasons (adjustmentReason)

| Reason              | Description                        | Use Case                      |
| ------------------- | ---------------------------------- | ----------------------------- |
| `DAMAGED`           | Physical damage to product         | Broken packages, water damage |
| `EXPIRED`           | Product past expiration            | Time-based write-off          |
| `LOST`              | Inventory cannot be located        | Missing after audit           |
| `THEFT`             | Suspected or confirmed theft       | Security incident             |
| `COUNT_DISCREPANCY` | Physical count differs from system | Cycle count adjustment        |
| `QUALITY_ISSUE`     | Product fails quality check        | QC rejection                  |
| `REWEIGH`           | Weight correction                  | Scale calibration             |
| `OTHER`             | Other reason (requires notes)      | Miscellaneous                 |

---

## Business Rules

### Quantity Validation

| Rule ID | Rule                          | Enforcement                                                                   |
| ------- | ----------------------------- | ----------------------------------------------------------------------------- |
| INV-001 | `onHandQty >= 0`              | Validated in `adjustQty`, throws error if adjustment would result in negative |
| INV-002 | `reservedQty >= 0`            | Validated at reservation time                                                 |
| INV-003 | `quarantineQty >= 0`          | Validated in quarantine operations                                            |
| INV-004 | `holdQty >= 0`                | Validated in hold operations                                                  |
| INV-005 | `availableQty >= 0` (derived) | Implicit from above rules                                                     |

### Movement Audit Trail

| Rule ID | Rule                                          | Enforcement                                    |
| ------- | --------------------------------------------- | ---------------------------------------------- |
| INV-006 | Every quantity change creates movement record | Enforced in `adjustQty`, `updateStatus`        |
| INV-007 | Movement debits = credits (for transfers)     | Validated in transfer logic                    |
| INV-008 | Movements cannot be hard deleted              | `onDelete: "restrict"` on FK, soft delete only |
| INV-009 | Reason required for adjustments               | Validated in `adjustQty` (min length 1)        |

### Status Transitions

```
Valid Status Transitions:
─────────────────────────

AWAITING_INTAKE ───┬───> LIVE
                   └───> CLOSED (cancelled)

LIVE ───┬───> PHOTOGRAPHY_COMPLETE
        ├───> ON_HOLD
        ├───> QUARANTINED
        ├───> SOLD_OUT (when qty = 0)
        └───> CLOSED

PHOTOGRAPHY_COMPLETE ───┬───> LIVE
                        ├───> ON_HOLD
                        └───> QUARANTINED

ON_HOLD ───┬───> LIVE
           ├───> QUARANTINED
           └───> CLOSED

QUARANTINED ───┬───> LIVE (release)
               └───> CLOSED (disposal)

SOLD_OUT ───> CLOSED (archive)

CLOSED ───> (terminal state, no transitions out)
```

### Quarantine-Quantity Sync

When status changes involve QUARANTINED:

- **TO QUARANTINED**: `quarantineQty += onHandQty`, `onHandQty = 0`
- **FROM QUARANTINED to LIVE**: `onHandQty += quarantineQty`, `quarantineQty = 0`

### Bulk Operations

| Rule ID | Rule                                               | Enforcement                       |
| ------- | -------------------------------------------------- | --------------------------------- |
| INV-010 | Bulk status change validates each transition       | Loop with individual validation   |
| INV-011 | Bulk delete only allowed if `onHandQty = 0`        | Throws error if inventory remains |
| INV-012 | Bulk delete is soft delete (sets status to CLOSED) | Uses `updateStatus`               |

---

## Error States

### User-Facing Errors

| Error                       | Message                                                                                               | Resolution                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------- |
| `BATCH_NOT_FOUND`           | "Batch {id} not found"                                                                                | Verify batch ID exists      |
| `NEGATIVE_INVENTORY`        | "Adjustment would result in negative inventory. Current {field}: {current}, adjustment: {adjustment}" | Reduce adjustment amount    |
| `INVALID_STATUS_TRANSITION` | "Cannot transition from {current} to {new}"                                                           | Use valid status transition |
| `OPTIMISTIC_LOCK_CONFLICT`  | "Batch was modified by another user"                                                                  | Refresh and retry           |
| `ADJUSTMENT_TOO_LARGE`      | "Adjustment too large"                                                                                | Reduce to within ±1,000,000 |
| `REASON_REQUIRED`           | "Reason is required"                                                                                  | Provide adjustment reason   |

### System Errors

| Error                | Cause                                  | Handling                          |
| -------------------- | -------------------------------------- | --------------------------------- |
| Database unavailable | Connection failure                     | Retry with backoff, show error UI |
| Permission denied    | Missing `inventory:read/update/delete` | Show access denied message        |
| Validation failure   | Schema validation error                | Show field-specific errors        |

---

## Invariants

### Data Invariants

| ID      | Invariant                                                                            | Verification                      |
| ------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| INV-001 | `onHandQty >= 0` for all batches                                                     | Pre-update validation             |
| INV-002 | `availableQty = onHandQty - reservedQty - quarantineQty - holdQty`                   | Derived, not stored               |
| INV-003 | Every `adjustQty` call creates an `inventory_movements` record                       | Post-insert assertion             |
| INV-004 | `performedBy` on movements is never NULL for manual adjustments                      | FK constraint, authenticated user |
| INV-005 | `version` increments on every batch update                                           | SQL `version + 1` in updates      |
| INV-006 | Movement debits = credits for TRANSFER type                                          | Business logic validation         |
| INV-007 | Batches with `batchStatus = 'QUARANTINED'` have `quarantineQty > 0 OR onHandQty = 0` | Status sync logic                 |

### UI Invariants

| ID     | Invariant                                       | Verification                       |
| ------ | ----------------------------------------------- | ---------------------------------- |
| UI-001 | Drawer closes cleanly without crashes           | `handleSafeClose` with ref guard   |
| UI-002 | Locations and auditLogs always render as arrays | Defensive `Array.isArray()` checks |
| UI-003 | Filters persist across page navigation          | URL params and local storage       |
| UI-004 | Bulk selection clears on successful operation   | `setSelectedBatchIds(new Set())`   |

---

## Cross-Flow Touchpoints

### Inbound Flows (Add Inventory)

| Flow                      | Touchpoint            | Description                              |
| ------------------------- | --------------------- | ---------------------------------------- |
| **GF-001: Direct Intake** | `inventory.intake`    | Creates new batch with INTAKE movement   |
| **GF-002: Order Intake**  | `inventory.intake`    | Same as direct, linked to purchase order |
| **Returns**               | `inventory.adjustQty` | Adds back qty with REFUND_RETURN type    |

### Outbound Flows (Reduce Inventory)

| Flow                    | Touchpoint            | Description                                 |
| ----------------------- | --------------------- | ------------------------------------------- |
| **GF-003: Order Entry** | `orders.create`       | Reserves inventory (`reservedQty` increase) |
| **GF-005: Pick & Pack** | `inventoryMovements`  | Decrements `onHandQty` with SALE movement   |
| **Samples**             | `inventory.adjustQty` | Decrements with SAMPLE movement type        |

### Reporting Flows

| Flow              | Touchpoint                  | Description                                             |
| ----------------- | --------------------------- | ------------------------------------------------------- |
| **Dashboard**     | `inventory.dashboardStats`  | Provides total value, units, category breakdown         |
| **Aging Reports** | `inventory.getAgingSummary` | Age bracket analysis (FRESH, MODERATE, AGING, CRITICAL) |
| **Profitability** | `inventory.profitability.*` | Cost vs. revenue analysis per batch                     |

---

## Implementation Checklist

### Phase 0 (Specification) - Current

- [x] Document user journey
- [x] Define UI states and error handling
- [x] Document API endpoints
- [x] Define data model
- [x] List adjustment types and business rules
- [x] Document error states
- [x] Define invariants
- [x] Map cross-flow touchpoints

### Phase 1 (Planned Enhancements)

- [ ] Transfer between locations (full implementation)
- [ ] Expiration date tracking and alerts
- [ ] Reorder point automation
- [ ] Barcode/QR scanning integration
- [ ] Mobile-optimized inventory counting

### Phase 2 (Future Considerations)

- [ ] Multi-warehouse support
- [ ] Batch splitting
- [ ] Batch merging
- [ ] Consignment inventory tracking

---

## Appendix: Component Reference

### Frontend Components

| Component              | Path                                                       | Purpose                  |
| ---------------------- | ---------------------------------------------------------- | ------------------------ |
| `Inventory`            | `client/src/pages/Inventory.tsx`                           | Main inventory list page |
| `BatchDetailDrawer`    | `client/src/components/inventory/BatchDetailDrawer.tsx`    | Batch detail slide-out   |
| `AdvancedFilters`      | `client/src/components/inventory/AdvancedFilters.tsx`      | Filter panel             |
| `FilterChips`          | `client/src/components/inventory/FilterChips.tsx`          | Active filter display    |
| `BulkActionsBar`       | `client/src/components/inventory/BulkActionsBar.tsx`       | Bulk operation toolbar   |
| `MovementHistoryPanel` | `client/src/components/inventory/MovementHistoryPanel.tsx` | Movement history table   |
| `StockStatusBadge`     | `client/src/components/inventory/StockStatusBadge.tsx`     | Stock level indicator    |
| `AgingBadge`           | `client/src/components/inventory/AgingBadge.tsx`           | Age bracket indicator    |
| `CogsEditModal`        | `client/src/components/inventory/CogsEditModal.tsx`        | Cost editing             |
| `PurchaseModal`        | `client/src/components/inventory/PurchaseModal.tsx`        | New intake form          |

### Backend Files

| File                | Path                          | Purpose                                     |
| ------------------- | ----------------------------- | ------------------------------------------- |
| `inventory.ts`      | `server/routers/inventory.ts` | tRPC router with all endpoints              |
| `inventoryDb.ts`    | `server/inventoryDb.ts`       | Database query helpers                      |
| `inventoryUtils.ts` | `server/inventoryUtils.ts`    | Utility functions (qty parsing, validation) |
| `schema.ts`         | `drizzle/schema.ts`           | Database schema definitions                 |

---

_Document generated for GF-PHASE0A-007_
