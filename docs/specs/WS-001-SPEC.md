# Specification: WS-001 - Quick Action: Receive Client Payment (Cash Drop-off)

**Status:** Approved  
**Priority:** CRITICAL  
**Estimate:** 12h  
**Module:** Accounting  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The current Journal Entry feature is "overbuilt" for the most common use case: recording a client cash drop-off. Users need to process a $40K cash payment in **3 clicks or less**, but the current flow requires navigating through complex accounting forms. This friction costs significant time when processing multiple daily transactions.

## 2. User Stories

1. **As a staff member**, I want to quickly record a client's cash payment with minimal clicks, so that I can process high-volume transactions efficiently.

2. **As a staff member**, I want to immediately see the client's updated tab balance after recording a payment, so that I can confirm the transaction was applied correctly.

3. **As a staff member**, I want to generate a receipt/screenshot of the updated balance, so that I can provide proof of payment to the client.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Quick Action button accessible from Accounting dashboard and Client Profile | Must Have |
| FR-02 | Simple 3-field form: Client, Amount, Payment Type (Cash/Check/Wire) | Must Have |
| FR-03 | Real-time tab balance preview before saving | Must Have |
| FR-04 | Single "Save & Generate Receipt" button to complete transaction | Must Have |
| FR-05 | Auto-populate client field when accessed from Client Profile | Should Have |
| FR-06 | Optional note field for transaction reference | Should Have |
| FR-07 | Keyboard shortcuts for power users (Tab to navigate, Enter to save) | Nice to Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Payment amount must be positive and non-zero | Reject $0 or negative amounts |
| BR-02 | Payment reduces client's outstanding balance (tab) | $40K payment on $50K tab → $10K remaining |
| BR-03 | Overpayment creates credit balance | $40K payment on $30K tab → -$10K (credit) |
| BR-04 | All payments must be logged with timestamp and user | Audit trail requirement |
| BR-05 | Payment type determines journal entry categorization | Cash → Cash account, Check → Bank account |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- No new tables required
-- Uses existing tables:
-- - payments (for recording the payment)
-- - journal_entries (for double-entry accounting)
-- - clients (for tab balance)

-- Ensure payments table has:
-- - payment_type ENUM('CASH', 'CHECK', 'WIRE', 'ACH', 'OTHER')
-- - note TEXT (optional)
-- - receipt_generated_at TIMESTAMP (new column if not exists)
```

### 4.2 API Contracts

```typescript
// New Quick Action endpoint
accounting.receiveClientPayment = adminProcedure
  .input(z.object({
    clientId: z.number(),
    amount: z.number().positive(),
    paymentType: z.enum(['CASH', 'CHECK', 'WIRE', 'ACH', 'OTHER']),
    note: z.string().optional(),
    generateReceipt: z.boolean().default(true)
  }))
  .output(z.object({
    paymentId: z.number(),
    previousBalance: z.number(),
    newBalance: z.number(),
    receiptUrl: z.string().optional(),
    journalEntryId: z.number()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Get current client balance
    // 2. Create payment record
    // 3. Create journal entry (debit cash/bank, credit AR)
    // 4. Update client tab balance
    // 5. Generate receipt if requested
    // 6. Return new balance and receipt URL
  });

// Balance preview endpoint (for real-time preview)
accounting.previewPaymentBalance = publicProcedure
  .input(z.object({
    clientId: z.number(),
    amount: z.number()
  }))
  .output(z.object({
    currentBalance: z.number(),
    projectedBalance: z.number()
  }))
  .query(async ({ input }) => {
    // Return current and projected balance
  });
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Client Profile | Read | Fetch current tab balance |
| Journal Entry | Write | Create double-entry accounting record |
| Payments | Write | Record payment transaction |
| Receipt Generator | Write | Generate PDF receipt (WS-006) |
| Audit Log | Write | Log transaction for audit trail |

## 5. UI/UX Specification

### 5.1 User Flow

```
[Click "Receive Payment" Quick Action] 
    → [Select Client (or auto-filled)] 
    → [Enter Amount] 
    → [Select Payment Type] 
    → [See Balance Preview] 
    → [Click "Save & Generate Receipt"] 
    → [View Receipt / Return to Dashboard]
```

### 5.2 Wireframe Description

**Quick Action Modal/Drawer:**

```
┌─────────────────────────────────────────────┐
│  💵 Receive Client Payment                  │
├─────────────────────────────────────────────┤
│                                             │
│  Client: [Searchable Dropdown      ▼]       │
│                                             │
│  Amount: [$____________] USD                │
│                                             │
│  Payment Type: ○ Cash  ○ Check  ○ Wire     │
│                                             │
│  Note (optional): [________________]        │
│                                             │
├─────────────────────────────────────────────┤
│  📊 Balance Preview                         │
│  ┌─────────────────────────────────────┐   │
│  │ Current Balance:    $50,000.00      │   │
│  │ Payment Amount:    -$40,000.00      │   │
│  │ ─────────────────────────────────── │   │
│  │ New Balance:        $10,000.00      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Cancel]          [Save & Generate Receipt]│
└─────────────────────────────────────────────┘
```

**Design Requirements:**
- Modal width: 480px (centered)
- Client dropdown with search and recent clients
- Amount field with currency formatting (auto-add commas)
- Payment type as radio buttons (large touch targets)
- Balance preview updates in real-time as amount changes
- Primary action button prominent (green/blue)
- Cancel button secondary (gray/outline)

### 5.3 Acceptance Criteria (UI)

- [ ] Modal opens within 200ms of clicking Quick Action
- [ ] Client dropdown shows recent clients first, then alphabetical
- [ ] Amount field accepts numeric input only, formats with commas
- [ ] Balance preview updates within 300ms of amount change
- [ ] Form submits on Enter key when all required fields filled
- [ ] Success state shows receipt preview with download/email options
- [ ] Error states clearly indicate what went wrong

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Client has no existing balance | Show "Current Balance: $0.00", allow payment (creates credit) |
| Amount exceeds typical range (>$100K) | Show confirmation dialog: "Large payment - please confirm" |
| Network error during save | Show retry button, preserve form data |
| Concurrent payment by another user | Refresh balance, show warning if changed |
| Client not found | Show "Client not found" error, clear selection |
| Invalid amount format | Real-time validation, prevent non-numeric input |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] `receiveClientPayment` correctly calculates new balance
- [ ] Journal entry created with correct debit/credit accounts
- [ ] Payment type maps to correct account codes
- [ ] Validation rejects zero/negative amounts
- [ ] Note field properly sanitized

### 7.2 Integration Tests

- [ ] Full flow: payment → journal entry → balance update
- [ ] Receipt generation triggered correctly
- [ ] Audit log entry created
- [ ] Concurrent payment handling

### 7.3 E2E Tests

- [ ] Complete payment flow from Accounting dashboard
- [ ] Complete payment flow from Client Profile
- [ ] Receipt download works
- [ ] Balance reflects correctly after payment

## 8. Migration & Rollout

### 8.1 Data Migration

No migration required. Uses existing payment and journal entry tables.

### 8.2 Feature Flag

`FEATURE_QUICK_PAYMENT_ACTION` - Enable gradual rollout to test with subset of users.

### 8.3 Rollback Plan

1. Disable feature flag
2. Quick Action button hidden
3. Users fall back to standard Journal Entry flow
4. No data rollback needed (payments are valid regardless of entry method)

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Time to complete payment | < 10 seconds | Analytics: form open → submit |
| Click count | ≤ 3 clicks | UX audit |
| Error rate | < 1% | Error logging |
| User adoption | 80% of payments via Quick Action | Payment source tracking |

## 10. Open Questions

- [x] Should overpayments be allowed? **Yes, creates credit balance**
- [x] Receipt format - PDF or image? **PDF, with option for screenshot (WS-006)**
- [ ] Should we support partial payments with allocation? **Defer to future enhancement**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
