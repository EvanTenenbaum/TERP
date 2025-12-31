# Specification: QA-051 - Inventory Accuracy Audit System

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 24h  
**Module:** Inventory/QA  
**Dependencies:** WS-005 (Audit Trail)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The business needs to ensure inventory accuracy through regular audits. Currently, there's no systematic way to:
- Schedule and track inventory counts
- Compare physical counts to system records
- Identify and resolve discrepancies
- Track audit history and trends

## 2. User Stories

1. **As a manager**, I want to schedule inventory audits, so that accuracy is maintained.

2. **As a warehouse worker**, I want a guided audit workflow, so that I can efficiently count inventory.

3. **As a manager**, I want to see discrepancy reports, so that I can investigate issues.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Create audit sessions | Must Have |
| FR-02 | Record physical counts | Must Have |
| FR-03 | Compare to system quantities | Must Have |
| FR-04 | Generate discrepancy report | Must Have |
| FR-05 | Adjust inventory based on audit | Must Have |
| FR-06 | Audit history and trends | Should Have |
| FR-07 | Scheduled/recurring audits | Should Have |
| FR-08 | Partial audits (by location/category) | Should Have |

## 4. Technical Specification

### 4.1 Data Model

```sql
CREATE TABLE inventory_audits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  audit_date DATE NOT NULL,
  status ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNED',
  audit_type ENUM('FULL', 'PARTIAL', 'SPOT_CHECK') NOT NULL,
  
  -- Scope
  location_id INT REFERENCES locations(id),
  category_id INT REFERENCES categories(id),
  
  -- Results
  total_items_counted INT,
  discrepancies_found INT,
  total_variance_value DECIMAL(12,2),
  
  -- Audit trail
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by INT REFERENCES users(id),
  completed_by INT REFERENCES users(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (audit_date),
  INDEX idx_status (status)
);

CREATE TABLE audit_counts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  audit_id INT NOT NULL REFERENCES inventory_audits(id),
  batch_id INT NOT NULL REFERENCES batches(id),
  
  -- Counts
  system_quantity DECIMAL(10,2) NOT NULL,
  physical_quantity DECIMAL(10,2) NOT NULL,
  variance DECIMAL(10,2) GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED,
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_type ENUM('ADJUSTED', 'EXPLAINED', 'INVESTIGATING'),
  resolution_notes TEXT,
  resolved_by INT REFERENCES users(id),
  resolved_at TIMESTAMP,
  
  counted_by INT REFERENCES users(id),
  counted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_audit (audit_id),
  INDEX idx_variance (variance)
);
```

### 4.2 API Contracts

```typescript
audits.create = adminProcedure
  .input(z.object({
    auditDate: z.date(),
    auditType: z.enum(['FULL', 'PARTIAL', 'SPOT_CHECK']),
    locationId: z.number().optional(),
    categoryId: z.number().optional()
  }))
  .output(z.object({ auditId: z.number() }))
  .mutation(async ({ input, ctx }) => {});

audits.recordCount = adminProcedure
  .input(z.object({
    auditId: z.number(),
    batchId: z.number(),
    physicalQuantity: z.number()
  }))
  .output(z.object({
    countId: z.number(),
    systemQuantity: z.number(),
    variance: z.number()
  }))
  .mutation(async ({ input, ctx }) => {});

audits.getDiscrepancies = adminProcedure
  .input(z.object({ auditId: z.number() }))
  .output(z.array(z.object({
    batchId: z.number(),
    productName: z.string(),
    systemQuantity: z.number(),
    physicalQuantity: z.number(),
    variance: z.number(),
    varianceValue: z.number(),
    isResolved: z.boolean()
  })))
  .query(async ({ input }) => {});

audits.resolveDiscrepancy = adminProcedure
  .input(z.object({
    countId: z.number(),
    resolutionType: z.enum(['ADJUSTED', 'EXPLAINED', 'INVESTIGATING']),
    notes: z.string(),
    adjustInventory: z.boolean().default(false)
  }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input, ctx }) => {});
```

## 5. UI/UX Specification

### 5.1 Wireframe: Audit Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Inventory Audit - Jan 2, 2025                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Progress: [████████████░░░░░░░░] 60% (30/50 items)        │
│                                                             │
│  Current Item:                                              │
│  ─────────────────────────────────────────                  │
│  Blue Dream (BD-2024-001) | Location: Shelf A1             │
│  System Quantity: 25 oz                                    │
│                                                             │
│  Physical Count: [____] oz                    [Record]      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Discrepancies Found: 3                              │   │
│  │                                                     │   │
│  │ • OG Kush: System 50, Counted 48 (-2 oz)           │   │
│  │ • Sour Diesel: System 30, Counted 32 (+2 oz)       │   │
│  │ • Purple Haze: System 20, Counted 18 (-2 oz)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Save & Exit]                              [Complete Audit]│
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria

- [ ] Audit sessions can be created
- [ ] Physical counts can be recorded
- [ ] Discrepancies automatically calculated
- [ ] Discrepancies can be resolved
- [ ] Inventory can be adjusted from audit

## 6. Testing Requirements

- [ ] Audit CRUD operations
- [ ] Variance calculations
- [ ] Inventory adjustment accuracy
- [ ] Audit history tracking

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
