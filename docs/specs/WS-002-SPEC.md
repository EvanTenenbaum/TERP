# Specification: WS-002 - Quick Action: Pay Supplier (Cash Out)

**Status:** Approved  
**Priority:** CRITICAL  
**Estimate:** 12h  
**Module:** Accounting  
**Dependencies:** None (mirrors WS-001 flow)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30

---

## 1. Problem Statement

Paying suppliers in cash is a frequent operation that currently requires navigating through the full Journal Entry system. Users need a streamlined "opposite flow" to WS-001 that allows recording supplier cash payments in **3 clicks or less**, maintaining consistency with the Receive Payment quick action while handling the different accounting treatment (AP reduction vs AR reduction).

## 2. User Stories

1. **As a staff member**, I want to quickly record a cash payment to a supplier, so that I can process supplier payments efficiently without navigating complex forms.

2. **As a staff member**, I want to see the supplier's updated balance after payment, so that I can confirm how much we still owe.

3. **As a staff member**, I want to generate a payment confirmation/receipt, so that I have documentation for the supplier and our records.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID    | Requirement                                                                   | Priority     |
| ----- | ----------------------------------------------------------------------------- | ------------ |
| FR-01 | Quick Action button accessible from Accounting dashboard and Supplier Profile | Must Have    |
| FR-02 | Simple 3-field form: Supplier, Amount, Payment Type (Cash/Check/Wire)         | Must Have    |
| FR-03 | Real-time supplier balance preview before saving                              | Must Have    |
| FR-04 | Single "Save & Generate Confirmation" button to complete transaction          | Must Have    |
| FR-05 | Auto-populate supplier field when accessed from Supplier Profile              | Should Have  |
| FR-06 | Optional note/reference field (e.g., invoice number)                          | Should Have  |
| FR-07 | Link payment to specific bills/invoices (optional allocation)                 | Nice to Have |

### 3.2 Business Rules

| ID    | Rule                                                 | Example                                    |
| ----- | ---------------------------------------------------- | ------------------------------------------ |
| BR-01 | Payment amount must be positive and non-zero         | Reject $0 or negative amounts              |
| BR-02 | Payment reduces amount owed to supplier (AP)         | $10K payment on $25K owed → $15K remaining |
| BR-03 | Overpayment creates prepayment/credit with supplier  | $10K payment on $5K owed → -$5K (prepaid)  |
| BR-04 | All payments must be logged with timestamp and user  | Audit trail requirement                    |
| BR-05 | Payment type determines journal entry categorization | Cash → Cash account, Check → Bank account  |
| BR-06 | Supplier payments debit AP, credit Cash/Bank         | Opposite of client payment accounting      |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- No new tables required
-- Uses existing tables:
-- - vendor_payments (for recording the payment)
-- - journal_entries (for double-entry accounting)
-- - vendors (for balance tracking)

-- Ensure vendor_payments table has:
-- - payment_type ENUM('CASH', 'CHECK', 'WIRE', 'ACH', 'OTHER')
-- - note TEXT (optional)
-- - reference_number VARCHAR(100) (for invoice/PO reference)
-- - confirmation_generated_at TIMESTAMP
```

### 4.2 API Contracts

```typescript
// New Quick Action endpoint
accounting.payVendor = adminProcedure
  .input(
    z.object({
      vendorId: z.number(),
      amount: z.number().positive(),
      paymentType: z.enum(["CASH", "CHECK", "WIRE", "ACH", "OTHER"]),
      note: z.string().optional(),
      referenceNumber: z.string().optional(),
      generateConfirmation: z.boolean().default(true),
    })
  )
  .output(
    z.object({
      paymentId: z.number(),
      previousBalance: z.number(),
      newBalance: z.number(),
      confirmationUrl: z.string().optional(),
      journalEntryId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    // 1. Get current vendor balance (amount owed)
    // 2. Create vendor payment record
    // 3. Create journal entry (debit AP, credit cash/bank)
    // 4. Update vendor balance
    // 5. Generate confirmation if requested
    // 6. Return new balance and confirmation URL
  });

// Balance preview endpoint
accounting.previewVendorPaymentBalance = publicProcedure
  .input(
    z.object({
      vendorId: z.number(),
      amount: z.number(),
    })
  )
  .output(
    z.object({
      currentOwed: z.number(),
      projectedOwed: z.number(),
    })
  )
  .query(async ({ input }) => {
    // Return current and projected amount owed
  });
```

### 4.3 Integration Points

| System                 | Integration Type | Description                                  |
| ---------------------- | ---------------- | -------------------------------------------- |
| Supplier Profile       | Read             | Fetch current amount owed                    |
| Journal Entry          | Write            | Create double-entry accounting record        |
| Supplier Payments      | Write            | Record payment transaction                   |
| Confirmation Generator | Write            | Generate PDF confirmation                    |
| Audit Log              | Write            | Log transaction for audit trail              |
| Bills/Invoices         | Read/Write       | Optional: allocate payment to specific bills |

## 5. UI/UX Specification

### 5.1 User Flow

```
[Click "Pay Supplier" Quick Action]
    → [Select Supplier (or auto-filled)]
    → [Enter Amount]
    → [Select Payment Type]
    → [See Balance Preview]
    → [Click "Save & Generate Confirmation"]
    → [View Confirmation / Return to Dashboard]
```

### 5.2 Wireframe Description

**Quick Action Modal/Drawer:**

```
┌─────────────────────────────────────────────┐
│  💸 Pay Supplier                             │
├─────────────────────────────────────────────┤
│                                             │
│  Supplier: [Searchable Dropdown    ▼]       │
│                                             │
│  Amount: [$____________] USD                │
│                                             │
│  Payment Type: ○ Cash  ○ Check  ○ Wire     │
│                                             │
│  Reference # (optional): [________________] │
│                                             │
│  Note (optional): [________________]        │
│                                             │
├─────────────────────────────────────────────┤
│  📊 Balance Preview                         │
│  ┌─────────────────────────────────────┐   │
│  │ Currently Owed:     $25,000.00      │   │
│  │ Payment Amount:    -$10,000.00      │   │
│  │ ─────────────────────────────────── │   │
│  │ Remaining Owed:     $15,000.00      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Cancel]       [Save & Generate Confirmation]│
└─────────────────────────────────────────────┘
```

**Design Requirements:**

- Mirror WS-001 layout for consistency
- Modal width: 480px (centered)
- Supplier dropdown with search and recent suppliers
- Amount field with currency formatting
- Reference # field for invoice/PO tracking
- Balance preview shows "Currently Owed" → "Remaining Owed"
- Color coding: payments reduce owed amount (green indicator)

### 5.3 Acceptance Criteria (UI)

- [ ] Modal opens within 200ms of clicking Quick Action
- [ ] Supplier dropdown shows recent suppliers first, then alphabetical
- [ ] Amount field accepts numeric input only, formats with commas
- [ ] Balance preview updates within 300ms of amount change
- [ ] Form submits on Enter key when all required fields filled
- [ ] Success state shows confirmation preview with download/email options
- [ ] Error states clearly indicate what went wrong
- [ ] UI mirrors WS-001 for muscle memory consistency

## 6. Edge Cases & Error Handling

| Scenario                             | Expected Behavior                                                |
| ------------------------------------ | ---------------------------------------------------------------- |
| Supplier has no outstanding balance  | Show "Currently Owed: $0.00", allow payment (creates prepayment) |
| Amount exceeds amount owed           | Show info: "This will create a prepayment credit of $X"          |
| Amount exceeds typical range (>$50K) | Show confirmation dialog: "Large payment - please confirm"       |
| Network error during save            | Show retry button, preserve form data                            |
| Concurrent payment by another user   | Refresh balance, show warning if changed                         |
| Supplier not found                   | Show "Supplier not found" error, clear selection                 |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] `payVendor` correctly calculates new balance
- [ ] Journal entry created with correct debit AP/credit Cash
- [ ] Payment type maps to correct account codes
- [ ] Validation rejects zero/negative amounts
- [ ] Prepayment scenario handled correctly

### 7.2 Integration Tests

- [ ] Full flow: payment → journal entry → balance update
- [ ] Confirmation generation triggered correctly
- [ ] Audit log entry created
- [ ] Concurrent payment handling

### 7.3 E2E Tests

- [ ] Complete payment flow from Accounting dashboard
- [ ] Complete payment flow from Supplier Profile
- [ ] Confirmation download works
- [ ] Balance reflects correctly after payment

## 8. Migration & Rollout

### 8.1 Data Migration

No migration required. Uses existing supplier payment and journal entry tables.

### 8.2 Feature Flag

`FEATURE_QUICK_VENDOR_PAYMENT` - Enable alongside WS-001 for consistent rollout.

### 8.3 Rollback Plan

1. Disable feature flag
2. Quick Action button hidden
3. Users fall back to standard Journal Entry flow
4. No data rollback needed

## 9. Success Metrics

| Metric                   | Target                                    | Measurement Method            |
| ------------------------ | ----------------------------------------- | ----------------------------- |
| Time to complete payment | < 10 seconds                              | Analytics: form open → submit |
| Click count              | ≤ 3 clicks                                | UX audit                      |
| Error rate               | < 1%                                      | Error logging                 |
| User adoption            | 80% of supplier payments via Quick Action | Payment source tracking       |

## 10. Open Questions

- [x] Should prepayments be allowed? **Yes, creates credit with supplier**
- [x] Should we require linking to specific bills? **No, optional for MVP**
- [ ] Should we support recurring supplier payments? **Defer to future enhancement**

---

**Approval:**

- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
