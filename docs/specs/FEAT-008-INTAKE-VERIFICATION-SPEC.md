# FEAT-008: Intake Verification System

## Specification for MEET-064 to MEET-066

**Status:** ✅ APPROVED (2026-01-12)
**Priority:** CRITICAL (Wave 1)
**Estimate:** 34h (18h Backend + 16h Frontend)
**Source:** Customer Meeting 2026-01-11

### Approval Notes
- Discrepancy notifications must go to the person RESPONSIBLE for that transaction (not generic admin)
- System must track who created the intake receipt to determine notification target

---

## Problem Statement

> "We've been off by 12 pounds"
> "The person stacking the weed is not talking... we're not ticking it up"

Inventory intake discrepancies occur because:
1. Person entering receipt doesn't communicate with stacker
2. No verification step before finalizing intake
3. Quantities not confirmed against physical count
4. Terminology confusion ("Intake" vs "Purchase" vs "Receipt")

---

## Requirements

### MEET-064: Intake Receipt Tool

**User Story:** As a receiver, I want to generate an intake receipt that can be sent to the farmer for verification.

**Acceptance Criteria:**
- [ ] Create intake receipt with itemized quantities
- [ ] Include supplier/farmer information
- [ ] Generate shareable link or PDF
- [ ] Receipt shows pending verification status
- [ ] Farmer can acknowledge receipt via link

**Flow:**
```
1. Receiver logs intake → Creates "Pending Receipt"
2. System generates receipt document
3. Receipt sent to farmer (email/link/PDF)
4. Farmer reviews and acknowledges
5. Receipt status changes to "Farmer Verified"
```

**API Contract:**
```typescript
// New endpoint: intake.createReceipt
type CreateIntakeReceiptRequest = {
  supplierId: number;
  items: {
    productId?: number;      // Existing product or null for new
    productName: string;
    quantity: number;
    unit: string;            // 'lb', 'oz', 'unit'
    expectedPrice?: number;
  }[];
  notes?: string;
};

type IntakeReceiptResponse = {
  id: number;
  receiptNumber: string;     // "IR-2026-001234"
  status: 'PENDING' | 'FARMER_VERIFIED' | 'STACKER_VERIFIED' | 'FINALIZED' | 'DISPUTED';
  shareableUrl: string;
  pdfUrl?: string;
  createdAt: Date;
};
```

### MEET-065: Verification Process (Stacker Confirms)

**User Story:** As a stacker, I want to verify received quantities against the intake receipt so discrepancies are caught before finalization.

**Acceptance Criteria:**
- [ ] Stacker sees list of pending receipts
- [ ] Can mark each item as "Verified" or "Discrepancy"
- [ ] Discrepancies require explanation
- [ ] Admin notified of any discrepancies
- [ ] Both parties must verify before inventory update

**Flow:**
```
Intake Receipt Status Flow:
┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌───────────┐
│   PENDING   │───►│ FARMER_VERIFIED │───►│ STACKER_VERIFIED │───►│ FINALIZED │
└─────────────┘    └─────────────────┘    └──────────────────┘    └───────────┘
       │                   │                       │
       │                   │                       │
       ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DISPUTED (requires admin resolution)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**UI Wireframe (Stacker View):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Verify Intake Receipt #IR-2026-001234                                        │
│ Supplier: T12 Farms                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Item              │ Expected │ Actual   │ Status       │ Notes              │
│ Purple Haze (lb)  │ 10       │ [  10  ] │ [✓ Verified] │                    │
│ Blue Dream (lb)   │ 5        │ [   5  ] │ [✓ Verified] │                    │
│ OG Kush (lb)      │ 8        │ [   6  ] │ [✗ Dispute ] │ [Only 6 lbs recv] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                        [Submit Verification] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**API Contract:**
```typescript
// New endpoint: intake.verifyReceipt
type VerifyReceiptRequest = {
  receiptId: number;
  verifications: {
    itemId: number;
    actualQuantity: number;
    status: 'VERIFIED' | 'DISCREPANCY';
    notes?: string;
  }[];
};

type VerifyReceiptResponse = {
  receiptId: number;
  newStatus: IntakeReceiptStatus;
  discrepancies: {
    itemId: number;
    expected: number;
    actual: number;
    difference: number;
  }[];
  adminNotified: boolean;
};
```

### MEET-066: Intake Flow Terminology

**User Story:** As a user, I want consistent terminology so I'm not confused between "Intake", "Purchase", and "Receipt".

**Acceptance Criteria:**
- [ ] "Intake" = The process of receiving product
- [ ] "Intake Receipt" = The document created during intake
- [ ] Remove/hide "Purchase" from intake context
- [ ] Update all UI labels consistently
- [ ] Update help text and tooltips

**Terminology Map:**
| Current Term | New Term | Context |
|--------------|----------|---------|
| Purchase | Intake | Receiving product |
| Purchase Order | Intake Order | Before receiving |
| Purchase Receipt | Intake Receipt | After receiving |
| New Purchase button | New Intake button | Action button |

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| WS-007 (Complex Flower Intake) | Related | Completed |
| Notification system | Integration | Exists |

---

## Database Changes

### New Tables

```sql
-- intake_receipts
CREATE TABLE intake_receipts (
  id SERIAL PRIMARY KEY,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id INTEGER REFERENCES clients(id),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  -- 'PENDING', 'FARMER_VERIFIED', 'STACKER_VERIFIED', 'FINALIZED', 'DISPUTED'

  farmer_verified_at TIMESTAMP,
  farmer_verified_by INTEGER REFERENCES users(id),
  stacker_verified_at TIMESTAMP,
  stacker_verified_by INTEGER REFERENCES users(id),
  finalized_at TIMESTAMP,
  finalized_by INTEGER REFERENCES users(id),

  notes TEXT,
  shareable_token VARCHAR(100),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- intake_receipt_items
CREATE TABLE intake_receipt_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER REFERENCES intake_receipts(id),
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  expected_quantity DECIMAL(12,4) NOT NULL,
  actual_quantity DECIMAL(12,4),
  unit VARCHAR(20) NOT NULL,
  expected_price DECIMAL(12,2),
  verification_status VARCHAR(20), -- 'PENDING', 'VERIFIED', 'DISCREPANCY'
  discrepancy_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- intake_discrepancies
CREATE TABLE intake_discrepancies (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER REFERENCES intake_receipts(id),
  item_id INTEGER REFERENCES intake_receipt_items(id),
  expected_quantity DECIMAL(12,4),
  actual_quantity DECIMAL(12,4),
  difference DECIMAL(12,4),
  resolution VARCHAR(50), -- 'ACCEPTED', 'ADJUSTED', 'REJECTED'
  resolution_notes TEXT,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_intake_receipts_supplier ON intake_receipts(supplier_id);
CREATE INDEX idx_intake_receipts_status ON intake_receipts(status);
CREATE INDEX idx_intake_receipts_created ON intake_receipts(created_at);
CREATE INDEX idx_intake_receipt_items_receipt ON intake_receipt_items(receipt_id);
```

---

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `intake_verification_enabled` | true | Enable two-step verification |
| `intake_farmer_verification` | true | Require farmer verification |
| `intake_new_terminology` | true | Use new terminology |

---

## Notification Triggers

| Event | Recipients | Channel |
|-------|------------|---------|
| Receipt created | Supplier (farmer) | Email + In-app |
| Farmer verified | Stacker (warehouse) | In-app |
| Discrepancy found | **Person responsible for transaction** (receipt creator) | In-app + Email |
| Receipt finalized | Creator | In-app |

**Note:** Discrepancy notifications go to whoever created the intake receipt (the responsible party), NOT a generic admin role.

---

## Test Plan

### Unit Tests
- [ ] Receipt creation
- [ ] Receipt number generation
- [ ] Status transitions
- [ ] Discrepancy calculation
- [ ] Verification logic

### Integration Tests
- [ ] Full intake flow (create → farmer verify → stacker verify → finalize)
- [ ] Discrepancy handling and admin notification
- [ ] Inventory update only after finalization

### E2E Tests
- [ ] Shareable link works for farmer
- [ ] Stacker verification UI
- [ ] Admin discrepancy resolution

---

## Success Metrics

> **User Quote:** "We've been off by 12 pounds" → Target: Zero discrepancies

- [ ] 100% of intakes use verification flow
- [ ] Discrepancy rate < 1%
- [ ] Discrepancies caught before inventory update
- [ ] Time to resolve discrepancy < 24h

---

**Spec Status:** ✅ APPROVED
**Created:** 2026-01-12
**Approved:** 2026-01-12 by Product Owner
