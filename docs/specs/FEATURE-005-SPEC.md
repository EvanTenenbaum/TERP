# Specification: FEATURE-005 - Unit Tracking with QR/NFC

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 120-180h (6-9 weeks)  
**Module:** Inventory (Core Enhancement)  
**Dependencies:** FEATURE-011 (Unified Catalogue), WS-003 (Pick & Pack)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

Currently, inventory is tracked at the batch level (e.g., "50 oz of Blue Dream"). For better traceability, loss prevention, and operational efficiency, the business needs to track **individual units** (e.g., each bag, jar, or package) with unique identifiers (QR codes or NFC tags).

**Note:** The user indicated RFID for bags is "wonky" and "not that accurate." This spec focuses on **QR codes as the primary method**, with NFC as an optional enhancement.

## 2. User Stories

1. **As a warehouse worker**, I want to scan a QR code to identify a specific unit, so that I can quickly verify what I'm handling.

2. **As a manager**, I want to track each unit from intake to sale, so that I have full chain of custody.

3. **As a salesperson**, I want to scan units to add them to an order, so that inventory is automatically updated.

4. **As a manager**, I want to see which units are in which location, so that I can manage warehouse organization.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Generate unique QR codes for units | Must Have |
| FR-02 | Print QR code labels | Must Have |
| FR-03 | Scan QR to view unit details | Must Have |
| FR-04 | Scan QR to add to order | Must Have |
| FR-05 | Track unit location/movement | Must Have |
| FR-06 | Unit status (available, reserved, sold, disposed) | Must Have |
| FR-07 | Bulk unit creation from batch | Must Have |
| FR-08 | Unit history (full audit trail) | Should Have |
| FR-09 | NFC tag support (optional) | Nice to Have |
| FR-10 | Mobile scanning app | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model

```sql
-- Individual units
CREATE TABLE units (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL REFERENCES batches(id),
  unit_code VARCHAR(50) UNIQUE NOT NULL, -- QR code value
  
  -- Physical attributes
  quantity DECIMAL(10,2) NOT NULL, -- e.g., 1 oz, 0.5 oz
  unit_type VARCHAR(20) NOT NULL, -- oz, gram, each
  package_type VARCHAR(50), -- jar, bag, container
  
  -- Status
  status ENUM('AVAILABLE', 'RESERVED', 'SOLD', 'DISPOSED', 'LOST') DEFAULT 'AVAILABLE',
  location_id INT REFERENCES locations(id),
  
  -- Tracking
  nfc_tag_id VARCHAR(100), -- Optional NFC
  reserved_for_order_id INT REFERENCES orders(id),
  sold_in_order_id INT REFERENCES orders(id),
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id),
  
  INDEX idx_batch (batch_id),
  INDEX idx_status (status),
  INDEX idx_location (location_id),
  INDEX idx_code (unit_code)
);

-- Unit movement history
CREATE TABLE unit_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  unit_id INT NOT NULL REFERENCES units(id),
  movement_type ENUM('CREATED', 'MOVED', 'RESERVED', 'SOLD', 'DISPOSED', 'RETURNED', 'ADJUSTED') NOT NULL,
  from_location_id INT REFERENCES locations(id),
  to_location_id INT REFERENCES locations(id),
  from_status VARCHAR(20),
  to_status VARCHAR(20),
  order_id INT REFERENCES orders(id),
  notes TEXT,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_history (unit_id, created_at)
);

-- Locations (shelves, bins, etc.)
CREATE TABLE locations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE, -- e.g., "A1", "B2"
  parent_id INT REFERENCES locations(id), -- For hierarchy
  location_type ENUM('WAREHOUSE', 'ROOM', 'SHELF', 'BIN') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_parent (parent_id)
);
```

### 4.2 QR Code Format

```
Unit Code Format: TERP-{BATCH_PREFIX}-{SEQUENCE}-{CHECK}
Example: TERP-BD2024001-0001-A7

QR Code Content (JSON):
{
  "type": "TERP_UNIT",
  "code": "TERP-BD2024001-0001-A7",
  "v": 1
}

Or simple URL:
https://app.terp.com/unit/TERP-BD2024001-0001-A7
```

### 4.3 API Contracts

```typescript
// Create units from batch
units.createFromBatch = adminProcedure
  .input(z.object({
    batchId: z.number(),
    unitQuantity: z.number(), // Amount per unit (e.g., 1 oz)
    unitType: z.string(), // oz, gram, each
    packageType: z.string().optional(),
    count: z.number(), // How many units to create
    locationId: z.number().optional()
  }))
  .output(z.object({
    unitsCreated: z.number(),
    unitCodes: z.array(z.string())
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Validate batch has enough quantity
    // 2. Generate unique codes
    // 3. Create unit records
    // 4. Log movements
  });

// Scan unit (get details)
units.getByCode = publicProcedure
  .input(z.object({ code: z.string() }))
  .output(z.object({
    id: z.number(),
    code: z.string(),
    quantity: z.number(),
    unitType: z.string(),
    status: z.string(),
    location: z.string().nullable(),
    batch: z.object({
      id: z.number(),
      batchNumber: z.string(),
      productName: z.string(),
      strain: z.string().nullable()
    }),
    history: z.array(z.object({
      type: z.string(),
      timestamp: z.date(),
      user: z.string(),
      notes: z.string().nullable()
    }))
  }))
  .query(async ({ input }) => {});

// Move unit(s)
units.move = adminProcedure
  .input(z.object({
    unitIds: z.array(z.number()),
    toLocationId: z.number(),
    notes: z.string().optional()
  }))
  .output(z.object({ success: z.boolean(), moved: z.number() }))
  .mutation(async ({ input, ctx }) => {});

// Add unit to order (via scan)
units.addToOrder = adminProcedure
  .input(z.object({
    unitCode: z.string(),
    orderId: z.number()
  }))
  .output(z.object({
    success: z.boolean(),
    unitDetails: z.object({
      productName: z.string(),
      quantity: z.number(),
      unitType: z.string()
    })
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Validate unit available
    // 2. Reserve unit for order
    // 3. Add to order items
    // 4. Log movement
  });

// Print labels
units.generateLabels = adminProcedure
  .input(z.object({
    unitIds: z.array(z.number()),
    labelFormat: z.enum(['SMALL', 'MEDIUM', 'LARGE']).default('MEDIUM')
  }))
  .output(z.object({
    pdfUrl: z.string() // URL to downloadable PDF
  }))
  .mutation(async ({ input }) => {
    // Generate PDF with QR codes
  });
```

### 4.4 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Batches | Read | Units belong to batches |
| Orders | Read/Write | Units added to orders |
| Pick & Pack | Read/Write | Scan to pick |
| Locations | Read/Write | Track unit locations |
| Label Printer | Write | Print QR labels |

## 5. UI/UX Specification

### 5.1 User Flow: Create Units

```
[Select Batch]
    → [Enter Unit Size (e.g., 1 oz)]
    → [Enter Count (e.g., 50 units)]
    → [Select Location]
    → [Create Units]
    → [Print Labels]
```

### 5.2 Wireframe: Unit Creation

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Create Units from Batch                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Batch: BD-2024-001 (Blue Dream) - 50 oz available         │
│                                                             │
│  Unit Size: [1    ] [oz ▼]                                 │
│  Package Type: [Mylar Bag ▼]                               │
│  Number of Units: [50   ]                                  │
│  Location: [Shelf A1 ▼]                                    │
│                                                             │
│  ─────────────────────────────────────────                  │
│  Preview: 50 units × 1 oz = 50 oz (100% of batch)          │
│  ─────────────────────────────────────────                  │
│                                                             │
│  [Cancel]                    [Create Units & Print Labels]  │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Wireframe: Scan Unit

```
┌─────────────────────────────────────────────────────────────┐
│  📱 Scan Unit                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              [Camera Viewfinder]                   │   │
│  │                                                     │   │
│  │                   ▢ QR Code                        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Or enter code: [TERP-BD2024001-0001-A7    ] [Look Up]     │
│                                                             │
│  ─────────────────────────────────────────                  │
│  Last Scanned:                                              │
│  TERP-BD2024001-0001-A7                                    │
│  Blue Dream | 1 oz | Available | Shelf A1                  │
│  [Add to Order] [Move] [View History]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Wireframe: QR Label

```
┌─────────────────────────┐
│  ┌─────────┐            │
│  │ ▓▓▓▓▓▓▓ │ Blue Dream │
│  │ ▓▓▓▓▓▓▓ │ 1 oz       │
│  │ ▓▓▓▓▓▓▓ │            │
│  └─────────┘            │
│  TERP-BD2024001-0001    │
└─────────────────────────┘
```

### 5.5 Acceptance Criteria

- [ ] Units can be created from batch
- [ ] QR codes are unique and scannable
- [ ] Labels can be printed
- [ ] Scanning shows unit details
- [ ] Units can be added to orders via scan
- [ ] Unit location tracking works
- [ ] Full movement history maintained

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Scan invalid QR | "Unit not found" error |
| Scan already-sold unit | Show sold status, block re-sale |
| Create more units than batch quantity | Validation error |
| Unit disposed but scanned | Show disposed status |
| Duplicate QR code (shouldn't happen) | System prevents, unique constraint |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] QR code generation uniqueness
- [ ] Unit creation from batch
- [ ] Status transitions
- [ ] Movement logging

### 7.2 Integration Tests

- [ ] Scan → view details
- [ ] Scan → add to order
- [ ] Batch quantity sync
- [ ] Label PDF generation

### 7.3 E2E Tests

- [ ] Full flow: create units → print → scan → sell
- [ ] Movement tracking accuracy
- [ ] Multi-unit order via scanning

## 8. Migration & Rollout

### 8.1 Phased Rollout

1. **Phase 1:** Enable for new batches only
2. **Phase 2:** Backfill existing inventory (optional)
3. **Phase 3:** Require unit tracking for all sales

### 8.2 Feature Flag

`FEATURE_UNIT_TRACKING` - Enable per warehouse/location.

### 8.3 Hardware Requirements

- QR code scanner (USB or Bluetooth)
- Label printer (Zebra, DYMO, or similar)
- Mobile device with camera (optional)

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Inventory accuracy | 99%+ | Physical vs system count |
| Pick errors | <1% | Mis-picks reported |
| Time to pick | Baseline + 10% | Time tracking |

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
