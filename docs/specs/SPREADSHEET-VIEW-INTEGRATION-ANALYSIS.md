# Spreadsheet View Integration Analysis

## Executive Summary

This document analyzes how to integrate the **Inventory Management**, **Intake**, and **Pick & Pack** workflows into a unified Spreadsheet View interface. The goal is to provide users with a familiar spreadsheet experience while maintaining full ERP functionality, without adding complexity or "torso" (unnecessary middleware/abstraction layers) to the system.

---

## 1. Current System Architecture

### 1.1 Existing Workflows

| Workflow | Current Implementation | Key Entities |
|----------|----------------------|--------------|
| **Inventory Management** | `Inventory.tsx` page with table/card views | `batches`, `products`, `lots`, `vendors` |
| **Intake** | `inventoryIntakeService.ts` with transactional batch creation | `intakeSessions`, `batches`, `lots`, `batchLocations` |
| **Pick & Pack** | `PickPackPage.tsx` with order queue and bag management | `orders`, `orderLineItems`, `orderBags`, `orderItemBags` |

### 1.2 Key Observations

1. **Intake is transactional** - The intake service wraps all operations in a database transaction for data integrity.
2. **Pick & Pack is status-driven** - Orders flow through statuses: PENDING → PICKING → PACKED → READY.
3. **All workflows share common entities** - Products, batches, and clients are referenced across all three workflows.

---

## 2. Integration Strategy: "Views, Not Modules"

### 2.1 Core Principle

The spreadsheet view should be a **presentation layer** over existing functionality, not a parallel system. This means:

- **NO new database tables** - Use existing schema
- **NO new business logic** - Reuse existing services and routers
- **NO duplicate API endpoints** - Create thin wrappers that call existing procedures

### 2.2 Architecture Decision

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPREADSHEET VIEW (Frontend)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Inventory   │  │    Intake    │  │  Pick & Pack │           │
│  │    Grid      │  │    Grid      │  │    Grid      │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXISTING tRPC ROUTERS (No Changes)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   inventory  │  │ flowerIntake │  │   pickPack   │           │
│  │    Router    │  │    Router    │  │    Router    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Decision:** The spreadsheet view will call **existing routers directly**. We will only add a thin `spreadsheetRouter` for data transformation (converting existing data into spreadsheet-friendly row formats).

---

## 3. Workflow-Specific Integration

### 3.1 Inventory Grid

**Purpose:** View and edit existing inventory batches in a spreadsheet format.

**Data Source:** `inventory.getBatches` (existing)

**Spreadsheet Columns:**
| Column | Source | Editable | Notes |
|--------|--------|----------|-------|
| Vendor Code/Date | `lots.code` / `lots.date` | No | Grouping header |
| Source (brand) | `clients.name` (via supplierClientId) | No | |
| Category | `products.category` | No | |
| Item | `products.name` | No | |
| Available | `batches.onHandQty` | Yes | |
| Intake | Derived from audit log | No | Read-only |
| Ticket | `batches.unitCogs` | Yes | |
| Sub | Calculated | No | Auto-calculated |
| Notes | `batches.metadata.notes` | Yes | |
| Confirm | `batches.batchStatus` | Yes | Status dropdown |

**Mutations Used:**
- `inventory.updateBatch` (existing) - for Available, Ticket, Notes
- `inventory.updateBatchStatus` (existing) - for Confirm status

### 3.2 Intake Grid

**Purpose:** Create new inventory batches in a spreadsheet format, mirroring the user's intake workflow.

**Data Source:** New rows created by user, submitted via `flowerIntake.processIntake` (existing)

**Spreadsheet Columns:**
| Column | Maps To | Required | Notes |
|--------|---------|----------|-------|
| Vendor | `vendorName` | Yes | Autocomplete from existing vendors |
| Category | `category` | Yes | Dropdown |
| Item | `productName` | Yes | Autocomplete from existing products |
| Qty | `quantity` | Yes | Numeric |
| COGS | `unitCogs` | Yes | Numeric |
| Payment | `paymentTerms` | Yes | Dropdown |
| Location | `location.site` | Yes | Dropdown |
| Notes | `metadata.notes` | No | Free text |

**Workflow:**
1. User adds rows to the intake grid (local state only)
2. User clicks "Submit Intake" button
3. System calls `flowerIntake.processIntake` for each row in a transaction
4. Grid refreshes to show newly created batches in Inventory Grid

**Key Simplification:** Instead of building a complex multi-row transaction system, we process each row individually using the existing, battle-tested `processIntake` function. This maintains data integrity without new code.

### 3.3 Pick & Pack Grid

**Purpose:** View and manage orders in the pick/pack queue in a spreadsheet format.

**Data Source:** `pickPack.getPickList` (existing)

**Spreadsheet Columns:**
| Column | Source | Editable | Notes |
|--------|--------|----------|-------|
| Order # | `orders.orderNumber` | No | |
| Client | `clients.name` | No | |
| Date | `orders.createdAt` | No | Grouping header |
| Item | `orderLineItems.productDisplayName` | No | |
| Qty | `orderLineItems.quantity` | No | |
| Location | `batchLocations.locationCode` | No | For picking |
| Packed | `orderItemBags.bagId` (not null) | Yes | Checkbox |
| Bag # | `orderBags.identifier` | Yes | Dropdown |
| Status | `orders.pickPackStatus` | Yes | Dropdown |

**Mutations Used:**
- `pickPack.packItems` (existing) - for marking items packed
- `pickPack.updateOrderStatus` (existing) - for status changes

---

## 4. Efficiency Analysis

### 4.1 What We're NOT Building

| Avoided Complexity | Reason |
|--------------------|--------|
| New database tables | Spreadsheet view is presentation-only |
| New business logic services | Reuse existing services |
| Custom transaction handling | Use existing transactional services |
| Duplicate validation | Existing routers handle validation |
| New authentication/authorization | Use existing `protectedProcedure` |

### 4.2 What We ARE Building

| New Component | Purpose | Complexity |
|---------------|---------|------------|
| `SpreadsheetViewPage.tsx` | Container page with tabs | Low |
| `InventoryGrid.tsx` | AG-Grid for inventory | Medium |
| `IntakeGrid.tsx` | AG-Grid for new intakes | Medium |
| `PickPackGrid.tsx` | AG-Grid for pick/pack | Medium |
| `spreadsheetRouter.ts` | Data transformation only | Low |

### 4.3 Lines of Code Estimate

| Component | Estimated LOC | Notes |
|-----------|---------------|-------|
| SpreadsheetViewPage | ~150 | Tab container, layout |
| InventoryGrid | ~300 | AG-Grid config, cell renderers |
| IntakeGrid | ~250 | AG-Grid config, row creation |
| PickPackGrid | ~300 | AG-Grid config, status handling |
| spreadsheetRouter | ~200 | Data transformation queries |
| **Total** | **~1,200** | Minimal footprint |

---

## 5. Robustness Considerations

### 5.1 Data Integrity

- **Intake:** Uses existing transactional `processIntake` service
- **Inventory Updates:** Uses existing `updateBatch` with optimistic locking
- **Pick & Pack:** Uses existing `packItems` with validation

### 5.2 Error Handling

- **Cell-level errors:** Display inline validation errors (red border + tooltip)
- **Row-level errors:** Highlight entire row, show error in status column
- **Batch submission errors:** Show summary dialog with failed rows

### 5.3 Concurrent Editing

- **Optimistic locking:** All updates include `version` field
- **Conflict resolution:** Show "Record modified" error, prompt refresh
- **Auto-refresh:** Optional polling every 30 seconds for pick/pack queue

---

## 6. Recommendation

**Proceed with the "Views, Not Modules" approach.** This strategy:

1. **Minimizes new code** - ~1,200 LOC vs. potentially 5,000+ for a parallel system
2. **Reuses battle-tested logic** - No new bugs in business logic
3. **Maintains single source of truth** - All data flows through existing routers
4. **Enables incremental rollout** - Each grid can be developed and deployed independently
5. **Simplifies maintenance** - Changes to business logic automatically apply to spreadsheet view

---

## 7. Implementation Order

1. **Phase 1:** Inventory Grid (foundation, most similar to user's current spreadsheet)
2. **Phase 2:** Client View (order history per client)
3. **Phase 3:** Intake Grid (new batch creation)
4. **Phase 4:** Pick & Pack Grid (warehouse operations)

Each phase can be released independently behind the `spreadsheet-view` feature flag.
