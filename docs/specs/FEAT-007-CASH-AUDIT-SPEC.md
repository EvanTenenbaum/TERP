# FEAT-007: Cash Audit System

## Specification for MEET-001 to MEET-004

**Status:** ✅ APPROVED (2026-01-12)
**Priority:** CRITICAL (Wave 1)
**Estimate:** 48h (24h Backend + 24h Frontend)
**Source:** Customer Meeting 2026-01-11

### Approval Notes
- Locations must be dynamic (not hardcoded "Z" / "Doc")
- Use "Location 1", "Location 2" as defaults
- Admin can add, rename, or deactivate locations

---

## Problem Statement

> "I kept my audit tipping off every fucking week and it's driving me crazy"
> "There's just many areas for error versus just in and out"

Weekly cash audits are failing due to:
1. Multiple error points in spreadsheet tracking
2. Copy/paste errors during data entry
3. No distinction between cash locations (multiple physical locations)
4. Manual reconciliation prone to mistakes

---

## Requirements

### MEET-001: Dashboard Available Money Display

**User Story:** As a manager, I want to see available money on the dashboard so I know what cash is actually usable.

**Acceptance Criteria:**
- [ ] Dashboard displays "Total Cash on Hand"
- [ ] Dashboard displays "Scheduled Payables"
- [ ] Dashboard displays "Available Cash" (Total - Payables)
- [ ] Values update in real-time when transactions occur

**API Contract:**
```typescript
// New endpoint: accounting.getCashDashboard
type CashDashboardResponse = {
  totalCashOnHand: number;
  scheduledPayables: number;
  availableCash: number;
  lastUpdated: Date;
};
```

### MEET-002: Multi-Location Cash Tracking

**User Story:** As a manager, I want to track cash at multiple locations separately.

**Acceptance Criteria:**
- [ ] Support multiple cash locations (dynamic, not hardcoded)
- [ ] Each location has independent balance
- [ ] Transfers between locations tracked with audit trail
- [ ] Admin can add new locations
- [ ] Admin can rename existing locations
- [ ] Admin can deactivate (soft delete) locations
- [ ] Default seed: "Location 1", "Location 2"

**Data Model:**
```typescript
// New table: cash_locations
type CashLocation = {
  id: number;
  name: string;          // "Location 1", "Location 2", or custom names
  currentBalance: number;
  isActive: boolean;     // Soft delete support
  createdAt: Date;
  updatedAt: Date;
};

// New table: cash_location_transactions
type CashLocationTransaction = {
  id: number;
  locationId: number;
  type: 'IN' | 'OUT' | 'TRANSFER';
  amount: number;
  description: string;
  createdBy: number;
  createdAt: Date;
};
```

### MEET-003: In/Out Ledger

**User Story:** As a manager, I want a simple in/out ledger for each location that automatically reconciles.

**Acceptance Criteria:**
- [ ] Single view showing all ins and outs per location
- [ ] Running balance calculation
- [ ] Filter by date range
- [ ] Export to CSV/PDF
- [ ] Auto-reconciliation check against expected balance

**UI Wireframe:**
```
┌─────────────────────────────────────────────────────────┐
│ Location 1 Ledger                         Balance: $XXX │
├─────────────────────────────────────────────────────────┤
│ Date       │ Description           │ In      │ Out    │ Bal │
│ 01/10/2026 │ Client Payment        │ $500    │        │ $500│
│ 01/10/2026 │ Vendor Payment        │         │ $200   │ $300│
│ 01/11/2026 │ Transfer from Loc 2   │ $1000   │        │$1300│
└─────────────────────────────────────────────────────────┘
```

### MEET-004: Shift Payment Tracking with Reset

**User Story:** As a manager, I want to track payments received during a shift and reset at end of day.

**Acceptance Criteria:**
- [ ] Track payments by shift
- [ ] Show running total for current shift
- [ ] "Reset Shift" button with confirmation
- [ ] Reset creates audit trail entry
- [ ] Cannot reset until current balance matches expected

**API Contract:**
```typescript
// New endpoint: accounting.getShiftPayments
type ShiftPaymentsResponse = {
  shiftStart: Date;
  totalReceived: number;
  transactionCount: number;
  transactions: ShiftTransaction[];
};

// New endpoint: accounting.resetShift
type ResetShiftRequest = {
  actualCashCount: number;  // What they physically counted
  notes?: string;
};

type ResetShiftResponse = {
  previousBalance: number;
  actualCount: number;
  variance: number;         // Should be 0 for clean audit
  auditEntryId: number;
  newShiftStart: Date;
};
```

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| API-010 (accounting.*) | Must be registered | Sprint 0 |
| BUG-084 (pricing_defaults) | Must be fixed | Sprint 0 |

---

## Database Changes

### New Tables

```sql
-- cash_locations
CREATE TABLE cash_locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  current_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- cash_location_transactions
CREATE TABLE cash_location_transactions (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES cash_locations(id),
  transaction_type VARCHAR(20) NOT NULL, -- 'IN', 'OUT', 'TRANSFER'
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  reference_type VARCHAR(50), -- 'ORDER', 'VENDOR_PAYMENT', 'TRANSFER', 'MANUAL'
  reference_id INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- shift_audits
CREATE TABLE shift_audits (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES cash_locations(id),
  shift_start TIMESTAMP NOT NULL,
  shift_end TIMESTAMP,
  expected_balance DECIMAL(12,2),
  actual_count DECIMAL(12,2),
  variance DECIMAL(12,2),
  notes TEXT,
  reset_by INTEGER REFERENCES users(id),
  reset_at TIMESTAMP
);
```

---

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `cash_audit_enabled` | true | Enable cash audit system |
| `multi_location_cash` | true | Enable multiple cash locations |
| `shift_tracking_enabled` | true | Enable shift payment tracking |

---

## Test Plan

### Unit Tests
- [ ] CashLocation CRUD operations
- [ ] Transaction recording
- [ ] Balance calculation
- [ ] Shift reset logic
- [ ] Variance detection

### Integration Tests
- [ ] Full audit flow (start shift → transactions → reset)
- [ ] Transfer between locations
- [ ] Multi-user concurrent access

### E2E Tests
- [ ] Dashboard cash display updates
- [ ] Ledger filtering and export
- [ ] Shift reset with variance handling

---

## Success Metrics

> **User Quote:** "Zero audit variance for 4 consecutive weeks"

- [ ] Weekly audit variance < $1
- [ ] Audit completion time reduced by 50%
- [ ] Zero copy/paste errors (all data in system)

---

**Spec Status:** ✅ APPROVED
**Created:** 2026-01-12
**Approved:** 2026-01-12 by Product Owner
