# Specification: WS-009 - Inventory Movement & Shrinkage Tracking

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 20h  
**Module:** Pick & Pack / Inventory  
**Dependencies:** WS-003 (Pick & Pack Module)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The business needs to track inventory movement when batches shrink (e.g., a "size 20" becomes a "size 10" after splitting or loss). Currently, there's no systematic way to:

1. Record when inventory is transferred between locations/containers
2. Track shrinkage (loss, spillage, quality issues)
3. Maintain audit trail of why quantities changed

This leads to inventory discrepancies and difficulty reconciling physical counts with system records.

## 2. User Stories

1. **As a warehouse worker**, I want to record when I move inventory from one location to another, so that the system reflects actual physical locations.

2. **As a warehouse worker**, I want to log shrinkage with a reason, so that discrepancies are documented.

3. **As a manager**, I want to see a history of all inventory movements for a batch, so that I can audit changes.

4. **As a manager**, I want to see shrinkage reports, so that I can identify patterns and reduce loss.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Transfer inventory between locations | Must Have |
| FR-02 | Record shrinkage with reason code | Must Have |
| FR-03 | Require reason for all quantity adjustments | Must Have |
| FR-04 | Movement history per batch | Must Have |
| FR-05 | Shrinkage report by reason, date, product | Must Have |
| FR-06 | Split batch into multiple batches | Should Have |
| FR-07 | Merge batches (same product/strain) | Should Have |
| FR-08 | Barcode/QR scan for location transfer | Nice to Have |
| FR-09 | Automated shrinkage alerts (high loss rate) | Nice to Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | All quantity changes require a reason | No unexplained adjustments |
| BR-02 | Shrinkage reasons are predefined | Dropdown, not free text |
| BR-03 | Transfers don't change total quantity | Move 10 from A to B = A-10, B+10 |
| BR-04 | Shrinkage reduces total quantity | Loss of 5 = total -5 |
| BR-05 | All movements logged with timestamp and user | Full audit trail |
| BR-06 | Batch split creates new batch with same origin | Traceability maintained |

### 3.3 Shrinkage Reason Codes

| Code | Reason | Description |
|------|--------|-------------|
| LOSS | Loss/Missing | Cannot locate inventory |
| SPILL | Spillage | Physical spillage |
| QUALITY | Quality Issue | Failed quality check, disposed |
| SAMPLE | Sample/Testing | Used for samples or testing |
| THEFT | Theft/Suspected Theft | Suspected theft |
| COUNT_ADJ | Count Adjustment | Physical count differs from system |
| DAMAGE | Damaged | Physical damage |
| EXPIRED | Expired | Past expiration date |
| OTHER | Other | Requires note |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- Inventory movements table
CREATE TABLE inventory_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL REFERENCES batches(id),
  movement_type ENUM('TRANSFER', 'SHRINKAGE', 'ADJUSTMENT', 'SPLIT', 'MERGE', 'INTAKE', 'SALE') NOT NULL,
  quantity INT NOT NULL, -- Positive for in, negative for out
  
  -- For transfers
  from_location_id INT REFERENCES locations(id),
  to_location_id INT REFERENCES locations(id),
  
  -- For shrinkage/adjustments
  reason_code VARCHAR(20),
  reason_note TEXT,
  
  -- For splits/merges
  related_batch_id INT REFERENCES batches(id),
  
  -- Audit
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Running total for audit
  quantity_before INT NOT NULL,
  quantity_after INT NOT NULL,
  
  INDEX idx_batch_movements (batch_id, created_at),
  INDEX idx_movement_type (movement_type, created_at),
  INDEX idx_shrinkage (movement_type, reason_code, created_at)
);

-- Locations table (if not exists)
CREATE TABLE IF NOT EXISTS locations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  type ENUM('WAREHOUSE', 'SHELF', 'BIN', 'FREEZER', 'DISPLAY', 'OTHER') DEFAULT 'WAREHOUSE',
  parent_location_id INT REFERENCES locations(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add location tracking to batches
ALTER TABLE batches ADD COLUMN current_location_id INT REFERENCES locations(id);
```

### 4.2 API Contracts

```typescript
// Transfer inventory between locations
inventory.transfer = adminProcedure
  .input(z.object({
    batchId: z.number(),
    fromLocationId: z.number(),
    toLocationId: z.number(),
    quantity: z.number().positive(),
    note: z.string().optional()
  }))
  .output(z.object({
    movementId: z.number(),
    success: z.boolean(),
    newLocation: z.string()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Validate batch has sufficient quantity at fromLocation
    // 2. Create movement record
    // 3. Update batch location (if full transfer)
    // 4. Return result
  });

// Record shrinkage
inventory.recordShrinkage = adminProcedure
  .input(z.object({
    batchId: z.number(),
    quantity: z.number().positive(),
    reasonCode: z.enum(['LOSS', 'SPILL', 'QUALITY', 'SAMPLE', 'THEFT', 'COUNT_ADJ', 'DAMAGE', 'EXPIRED', 'OTHER']),
    reasonNote: z.string().optional() // Required if reasonCode = 'OTHER'
  }))
  .output(z.object({
    movementId: z.number(),
    success: z.boolean(),
    newQuantity: z.number()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Validate batch has sufficient quantity
    // 2. Create shrinkage movement record
    // 3. Update batch quantity
    // 4. Return result
  });

// Adjust inventory (count correction)
inventory.adjust = adminProcedure
  .input(z.object({
    batchId: z.number(),
    newQuantity: z.number().min(0),
    reasonCode: z.enum(['COUNT_ADJ', 'OTHER']),
    reasonNote: z.string() // Required for adjustments
  }))
  .output(z.object({
    movementId: z.number(),
    success: z.boolean(),
    quantityChange: z.number()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Calculate difference
    // 2. Create adjustment movement
    // 3. Update batch quantity
    // 4. Return result
  });

// Split batch
inventory.splitBatch = adminProcedure
  .input(z.object({
    sourceBatchId: z.number(),
    splitQuantity: z.number().positive(),
    newBatchNumber: z.string().optional(), // Auto-generate if not provided
    newLocationId: z.number().optional()
  }))
  .output(z.object({
    newBatchId: z.number(),
    newBatchNumber: z.string(),
    sourceNewQuantity: z.number()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Validate source has sufficient quantity
    // 2. Create new batch with same product/strain
    // 3. Create movement records for both batches
    // 4. Return result
  });

// Get movement history for batch
inventory.getMovementHistory = adminProcedure
  .input(z.object({
    batchId: z.number(),
    movementType: z.enum(['TRANSFER', 'SHRINKAGE', 'ADJUSTMENT', 'SPLIT', 'MERGE', 'ALL']).default('ALL'),
    limit: z.number().default(50)
  }))
  .output(z.array(z.object({
    id: z.number(),
    movementType: z.string(),
    quantity: z.number(),
    fromLocation: z.string().nullable(),
    toLocation: z.string().nullable(),
    reasonCode: z.string().nullable(),
    reasonNote: z.string().nullable(),
    quantityBefore: z.number(),
    quantityAfter: z.number(),
    createdBy: z.string(),
    createdAt: z.date()
  })))
  .query(async ({ input }) => {
    // Return movement history
  });

// Shrinkage report
inventory.getShrinkageReport = adminProcedure
  .input(z.object({
    dateFrom: z.date(),
    dateTo: z.date(),
    reasonCode: z.string().optional(),
    productId: z.number().optional()
  }))
  .output(z.object({
    totalShrinkage: z.number(),
    totalValue: z.number(),
    byReason: z.array(z.object({
      reasonCode: z.string(),
      quantity: z.number(),
      value: z.number(),
      percentage: z.number()
    })),
    byProduct: z.array(z.object({
      productName: z.string(),
      quantity: z.number(),
      value: z.number()
    })),
    details: z.array(z.object({
      date: z.date(),
      batchNumber: z.string(),
      productName: z.string(),
      quantity: z.number(),
      reasonCode: z.string(),
      reasonNote: z.string().nullable(),
      createdBy: z.string()
    }))
  }))
  .query(async ({ input }) => {
    // Generate shrinkage report
  });
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Batches | Read/Write | Update quantities, locations |
| WS-005 Audit Trail | Read | Movement history for audit |
| Locations | Read | Get location names |
| Reports | Read | Shrinkage reporting |
| Dashboard | Read | Shrinkage alerts widget |

## 5. UI/UX Specification

### 5.1 User Flow: Transfer Inventory

```
[Open Batch Details]
    → [Click "Transfer" Button]
    → [Select Destination Location]
    → [Enter Quantity (or "All")]
    → [Optional: Add Note]
    → [Confirm Transfer]
    → [Success Message]
```

### 5.2 User Flow: Record Shrinkage

```
[Open Batch Details]
    → [Click "Adjust Quantity" Button]
    → [Select "Record Shrinkage"]
    → [Enter Quantity Lost]
    → [Select Reason Code]
    → [Add Note (required for "Other")]
    → [Confirm]
    → [Success Message with New Quantity]
```

### 5.3 Wireframe: Batch Detail with Movement Actions

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Batch: BD-2024-001 | Blue Dream                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Quantity: 45 oz          Location: Warehouse A - Shelf 3   │
│  Status: Available        Value: $4,500.00                  │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Transfer │ │ Adjust   │ │ Split    │ │ History  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Wireframe: Transfer Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  📍 Transfer Inventory                                 [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Batch: BD-2024-001 | Blue Dream                            │
│  Current Location: Warehouse A - Shelf 3                    │
│  Available Quantity: 45 oz                                  │
│                                                             │
│  Transfer To: [Select Location          ▼]                  │
│               ○ Warehouse B                                 │
│               ○ Display Case 1                              │
│               ○ Freezer                                     │
│                                                             │
│  Quantity: [45_____] oz  [Transfer All ☑]                  │
│                                                             │
│  Note: [________________________________]                   │
│                                                             │
│  [Cancel]                              [Confirm Transfer]   │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Wireframe: Shrinkage Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Record Shrinkage                                   [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Batch: BD-2024-001 | Blue Dream                            │
│  Current Quantity: 45 oz                                    │
│                                                             │
│  Quantity Lost: [5______] oz                                │
│                                                             │
│  Reason: [Select Reason              ▼]                     │
│          ○ Loss/Missing                                     │
│          ○ Spillage                                         │
│          ○ Quality Issue                                    │
│          ○ Sample/Testing                                   │
│          ○ Damage                                           │
│          ○ Other (requires note)                            │
│                                                             │
│  Note: [________________________________]                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ After this adjustment:                              │   │
│  │ New Quantity: 40 oz                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancel]                              [Confirm Shrinkage]  │
└─────────────────────────────────────────────────────────────┘
```

### 5.6 Wireframe: Movement History

```
┌─────────────────────────────────────────────────────────────┐
│  📜 Movement History: BD-2024-001                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: [All Types ▼]                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Date       │ Type     │ Qty  │ Details        │ By  │   │
│  ├────────────┼──────────┼──────┼────────────────┼─────┤   │
│  │ 12/30 2pm  │ SHRINKAGE│ -5   │ Spillage       │ John│   │
│  │ 12/28 10am │ TRANSFER │ 0    │ Shelf 2→Shelf 3│ Jane│   │
│  │ 12/25 3pm  │ SALE     │ -10  │ Order #1234    │ Mike│   │
│  │ 12/20 9am  │ INTAKE   │ +50  │ Initial intake │ John│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Running Total: 50 → 50 → 40 → 35 (current)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.7 Acceptance Criteria (UI)

- [ ] Transfer dialog shows current and destination locations
- [ ] Shrinkage dialog requires reason selection
- [ ] "Other" reason requires note (validation)
- [ ] Movement history shows running total
- [ ] All actions show confirmation before executing
- [ ] Success/error feedback after each action

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Transfer more than available | Validation error |
| Shrinkage more than available | Validation error |
| Transfer to same location | Validation error |
| Split entire batch | Validation error (use transfer) |
| Merge different products | Validation error |
| Reason "Other" without note | Validation error |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Transfer updates both locations correctly
- [ ] Shrinkage reduces quantity correctly
- [ ] Movement record created with correct data
- [ ] Running totals calculated correctly
- [ ] Reason validation works

### 7.2 Integration Tests

- [ ] Transfer flow end-to-end
- [ ] Shrinkage flow end-to-end
- [ ] Movement history displays correctly
- [ ] Shrinkage report aggregates correctly

### 7.3 E2E Tests

- [ ] Complete transfer workflow
- [ ] Complete shrinkage workflow with all reason codes
- [ ] View movement history for batch
- [ ] Generate shrinkage report

## 8. Migration & Rollout

### 8.1 Data Migration

```sql
-- Create initial movement records for existing batches
INSERT INTO inventory_movements (batch_id, movement_type, quantity, reason_code, reason_note, created_by, created_at, quantity_before, quantity_after)
SELECT id, 'INTAKE', quantity, 'COUNT_ADJ', 'Initial migration', 1, created_at, 0, quantity
FROM batches
WHERE quantity > 0;
```

### 8.2 Feature Flag

`FEATURE_INVENTORY_MOVEMENTS` - Enable for warehouse users first.

### 8.3 Rollback Plan

1. Disable feature flag
2. Movement buttons hidden
3. Existing movement data preserved
4. Direct quantity edits as fallback

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Inventory accuracy | 98%+ | Physical count vs. system |
| Shrinkage documented | 100% | All losses have reason codes |
| Audit resolution time | 50% reduction | Time to explain discrepancy |

## 10. Open Questions

- [x] Should we support partial transfers? **Yes, any quantity up to available**
- [x] Should shrinkage affect value/accounting? **Yes, creates adjustment entry**
- [ ] Should we support undo for movements? **Future enhancement, use reverse entry**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
