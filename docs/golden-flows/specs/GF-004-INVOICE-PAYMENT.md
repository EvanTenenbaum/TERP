# GF-004: Invoice & Payment - Specification

**Version:** 1.0
**Created:** 2026-01-27
**Owner Role:** Accounting Manager
**Entry Point:** `/invoices` (proposed: `/accounting/invoices`)
**Status:** PARTIAL (per Jan 26 QA Checkpoint - PDF generation timeout)

---

## Overview

The Invoice & Payment flow handles Accounts Receivable (AR) operations including viewing invoices, recording payments against invoices, generating PDF invoices for clients, and posting all financial transactions to the General Ledger. This flow is critical for revenue recognition and client balance tracking.

---

## User Journey

### Primary Flow: View Invoice and Record Payment

1. **User navigates to Invoices list** (`/accounting/invoices`)
2. **User views invoice list** with status filters (DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, VOID)
3. **User selects an invoice** to view details in inspector panel
4. **User reviews invoice details**: line items, amounts, payment history
5. **User clicks "Record Payment"** button
6. **Payment dialog opens** with invoice context (amount due, invoice number)
7. **User enters payment details**: amount, method, reference number, date
8. **User submits payment**
9. **System validates**: amount <= amountDue, invoice not VOID/PAID
10. **System creates payment record** in database
11. **System updates invoice**: amountPaid, amountDue, status
12. **System creates GL entries**: Debit Cash, Credit Accounts Receivable
13. **System updates client balance** (clients.totalOwed)
14. **User sees confirmation** toast with payment details
15. **Invoice list refreshes** with updated status

### Secondary Flow: Generate PDF Invoice

1. User selects invoice from list
2. User clicks "Download PDF" or "Generate PDF" button
3. System generates PDF with invoice details, line items, company info
4. Browser downloads or opens PDF in new tab
5. (Optional) System marks invoice as SENT if not already

### Secondary Flow: Multi-Invoice Payment

1. User navigates to client payment screen
2. User sees list of outstanding invoices for client
3. User allocates payment amount across multiple invoices
4. User submits multi-invoice payment
5. System validates allocations sum to total payment
6. System updates each invoice proportionally
7. System creates single set of GL entries for total amount

### Secondary Flow: Void Invoice

1. User selects invoice (not already VOID)
2. User clicks "Void Invoice"
3. User enters reason for voiding (required)
4. System creates reversing GL entries
5. System updates client totalOwed (reduces AR balance)
6. System marks invoice as VOID
7. System adds void reason to notes

---

## UI States

### Invoice List View

| State | Trigger | Display |
|-------|---------|---------|
| Loading | Initial page load | Loading spinner |
| Empty | No invoices match filters | "No invoices found" message |
| Populated | Invoices exist | Table with invoice rows |
| Error | API failure | Error message with retry button |
| Filtered | Status filter applied | Filtered list with active filter indicator |

### Invoice Detail/Inspector Panel

| State | Trigger | Display |
|-------|---------|---------|
| Empty | No invoice selected | "Select an invoice to view details" |
| Loading | Invoice selected | Loading spinner in panel |
| Display | Invoice data loaded | Invoice details, line items, payments |
| Error | Load failed | Error message in panel |

### Payment Dialog

| State | Trigger | Display |
|-------|---------|---------|
| Open | "Record Payment" clicked | Dialog with payment form |
| Validating | Form submitted | Loading indicator on submit button |
| Error | Validation failed | Field-level error messages |
| Success | Payment recorded | Success toast, dialog closes |
| Overpayment | Amount > amountDue | Error: "Payment exceeds amount due" |

### PDF Generation

| State | Trigger | Display |
|-------|---------|---------|
| Generating | "Download PDF" clicked | Loading indicator on button |
| Success | PDF ready | Browser download initiates |
| Timeout | Generation exceeds 30s | Error: "PDF generation timed out" |
| Error | Generation failed | Error message with retry option |

---

## API Endpoints

### Invoice Endpoints

| Endpoint | Method | Request Shape | Response Shape |
|----------|--------|---------------|----------------|
| `invoices.list` | Query | `{ status?, clientId?, startDate?, endDate?, limit?, offset? }` | `{ items: Invoice[], total, limit, offset }` |
| `invoices.getById` | Query | `{ id: number }` | `Invoice & { lineItems, payments, client, createdBy }` |
| `invoices.generateFromOrder` | Mutation | `{ orderId: number }` | `Invoice` |
| `invoices.updateStatus` | Mutation | `{ id, version?, status, notes? }` | `{ success, invoiceId, status }` |
| `invoices.markSent` | Mutation | `{ id: number }` | `{ success, invoiceId }` |
| `invoices.void` | Mutation | `{ id, reason: string }` | `{ success, invoiceId }` |
| `invoices.getSummary` | Query | `{ clientId? }` | `{ byStatus: [], totals }` |
| `invoices.checkOverdue` | Mutation | `{}` | `{ success, overdueCount }` |

### Payment Endpoints

| Endpoint | Method | Request Shape | Response Shape |
|----------|--------|---------------|----------------|
| `payments.list` | Query | `{ invoiceId?, clientId?, paymentMethod?, startDate?, endDate?, limit?, offset? }` | `{ items: Payment[], total, limit, offset }` |
| `payments.getById` | Query | `{ id: number }` | `Payment & { invoice, client, recordedBy }` |
| `payments.recordPayment` | Mutation | `{ invoiceId, amount, paymentMethod, referenceNumber?, notes?, paymentDate? }` | `{ paymentId, paymentNumber, invoiceId, invoiceStatus, amountDue }` |
| `payments.recordMultiInvoicePayment` | Mutation | `{ clientId, totalAmount, allocations[], paymentMethod, referenceNumber?, notes? }` | `{ paymentId, paymentNumber, invoiceAllocations[] }` |
| `payments.getByClient` | Query | `{ clientId, limit? }` | `Payment[]` |
| `payments.getClientSummary` | Query | `{ clientId }` | `{ totalPayments, totalAmount, outstandingBalance, byMethod[] }` |
| `payments.getInvoicePaymentHistory` | Query | `{ invoiceId }` | `PaymentAllocation[]` |
| `payments.getClientOutstandingInvoices` | Query | `{ clientId }` | `OutstandingInvoice[]` |
| `payments.void` | Mutation | `{ id, reason: string }` | `{ success, paymentId }` |

### PDF Endpoints (TO BE IMPLEMENTED)

| Endpoint | Method | Request Shape | Response Shape |
|----------|--------|---------------|----------------|
| `invoices.generatePdf` | Query/Mutation | `{ id: number }` | `Binary PDF or { url: string }` |

---

## Data Model

### invoices Table

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key (auto-increment) |
| invoiceNumber | varchar(50) | Unique invoice number (e.g., INV-2026-00001) |
| customerId | int | FK to clients.id (NOT NULL) |
| invoiceDate | date | Date invoice was created |
| dueDate | date | Payment due date |
| subtotal | decimal(12,2) | Sum of line items before tax/discount |
| taxAmount | decimal(12,2) | Tax amount (default 0.00) |
| discountAmount | decimal(12,2) | Discount amount (default 0.00) |
| totalAmount | decimal(12,2) | Final total (subtotal + tax - discount) |
| amountPaid | decimal(12,2) | Amount paid to date (default 0.00) |
| amountDue | decimal(12,2) | Remaining balance (totalAmount - amountPaid) |
| status | enum | DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, VOID |
| paymentTerms | varchar(100) | Payment terms text |
| notes | text | Internal notes |
| referenceType | varchar(50) | Source type (e.g., ORDER, SALE, CONTRACT) |
| referenceId | int | FK to source record |
| version | int | Optimistic locking version (default 1) |
| createdBy | int | FK to users.id (NOT NULL) |
| createdAt | timestamp | Record creation time |
| updatedAt | timestamp | Last update time |
| deletedAt | timestamp | Soft delete timestamp |

**Indexes:**
- `idx_invoices_customer_id` on customerId
- `idx_invoices_created_by` on createdBy
- `idx_invoices_customer_status` on (customerId, status)
- `idx_invoices_status_due_date` on (status, dueDate)
- `idx_invoices_status_created` on (status, createdAt)

### invoiceLineItems Table

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| invoiceId | int | FK to invoices.id (CASCADE delete) |
| productId | int | FK to products.id (optional) |
| batchId | int | FK to batches.id (optional) |
| description | text | Line item description (NOT NULL) |
| quantity | decimal(10,2) | Quantity |
| unitPrice | decimal(12,2) | Price per unit |
| taxRate | decimal(5,2) | Tax rate percentage (default 0.00) |
| discountPercent | decimal(5,2) | Line discount percentage (default 0.00) |
| lineTotal | decimal(12,2) | Calculated line total |
| createdAt | timestamp | Record creation time |
| deletedAt | timestamp | Soft delete timestamp |

### payments Table

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| paymentNumber | varchar(50) | Unique payment number (e.g., PMT-202601-00001) |
| paymentType | enum | RECEIVED (AR) or SENT (AP) |
| paymentDate | date | Date payment was made |
| amount | decimal(12,2) | Payment amount |
| paymentMethod | enum | CASH, CHECK, WIRE, ACH, CREDIT_CARD, DEBIT_CARD, OTHER |
| referenceNumber | varchar(100) | Check number, wire reference, etc. |
| bankAccountId | int | FK to bankAccounts.id (optional) |
| customerId | int | FK to clients.id (for AR payments) |
| vendorId | int | FK to clients.id (for AP payments - supplier) |
| invoiceId | int | FK to invoices.id (for single-invoice payments) |
| billId | int | FK to bills.id (for AP payments) |
| notes | text | Payment notes |
| isReconciled | boolean | Bank reconciliation status (default false) |
| reconciledAt | timestamp | Reconciliation timestamp |
| createdBy | int | FK to users.id (NOT NULL) |
| createdAt | timestamp | Record creation time |
| updatedAt | timestamp | Last update time |
| deletedAt | timestamp | Soft delete timestamp |

### invoice_payments Table (Junction for Multi-Invoice)

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| paymentId | int | FK to payments.id (CASCADE delete) |
| invoiceId | int | FK to invoices.id (RESTRICT delete) |
| allocatedAmount | decimal(15,2) | Amount allocated to this invoice |
| allocatedAt | timestamp | Allocation timestamp |
| allocatedBy | int | FK to users.id (NOT NULL) |
| notes | text | Allocation notes |
| deletedAt | timestamp | Soft delete timestamp |

### ledgerEntries Table (GL Entries)

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| entryNumber | varchar(50) | Unique entry number |
| entryDate | date | Posting date |
| accountId | int | FK to chart of accounts |
| debit | decimal(12,2) | Debit amount (default 0.00) |
| credit | decimal(12,2) | Credit amount (default 0.00) |
| description | text | Entry description |
| referenceType | varchar(50) | INVOICE, PAYMENT, PAYMENT_VOID, etc. |
| referenceId | int | ID of source document |
| fiscalPeriodId | int | FK to fiscalPeriods.id |
| isManual | boolean | Manual entry flag (default false) |
| isPosted | boolean | Posted to GL flag (default false) |
| postedAt | timestamp | Posting timestamp |
| postedBy | int | FK to users.id |
| createdBy | int | FK to users.id (NOT NULL) |
| createdAt | timestamp | Record creation time |
| deletedAt | timestamp | Soft delete timestamp |

---

## Invoice Status States

### Status Definitions

| Status | Description |
|--------|-------------|
| DRAFT | Invoice created but not sent to client |
| SENT | Invoice sent/emailed to client |
| VIEWED | Client has viewed the invoice (if tracking enabled) |
| PARTIAL | Some payment received, balance remaining |
| PAID | Fully paid (amountDue <= 0.01) |
| OVERDUE | Past dueDate and not fully paid |
| VOID | Invoice cancelled, GL reversed |

### State Transitions

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
┌───────┐      ┌───────┐      ┌─────────┐      ┌─────────┐       │
│ DRAFT │ ───▶ │ SENT  │ ───▶ │ VIEWED  │ ───▶ │ PARTIAL │ ──────┤
└───────┘      └───────┘      └─────────┘      └─────────┘       │
    │              │               │               │              │
    │              │               │               │              ▼
    │              │               │               │         ┌─────────┐
    │              │               │               └───────▶ │  PAID   │
    │              │               │                         └─────────┘
    │              │               │                              │
    │              ▼               ▼               ▼              │
    │         ┌──────────────────────────────────────────┐       │
    │         │                OVERDUE                    │       │
    │         │  (auto-transition when past dueDate)     │       │
    │         └──────────────────────────────────────────┘       │
    │              │               │               │              │
    ▼              ▼               ▼               ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              VOID                                    │
│                   (can be voided from any state)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Valid Transitions

| From | To | Trigger |
|------|-----|---------|
| DRAFT | SENT | markSent mutation |
| DRAFT | VOID | void mutation |
| SENT | VIEWED | Client views invoice |
| SENT | PARTIAL | Payment < amountDue |
| SENT | PAID | Payment >= amountDue |
| SENT | OVERDUE | dueDate passed |
| SENT | VOID | void mutation |
| VIEWED | PARTIAL | Payment < amountDue |
| VIEWED | PAID | Payment >= amountDue |
| VIEWED | OVERDUE | dueDate passed |
| VIEWED | VOID | void mutation |
| PARTIAL | PAID | Payment covers remaining |
| PARTIAL | OVERDUE | dueDate passed |
| PARTIAL | VOID | void mutation |
| OVERDUE | PARTIAL | Payment < amountDue |
| OVERDUE | PAID | Payment >= amountDue |
| OVERDUE | VOID | void mutation |
| PAID | VOID | void mutation (with reason) |

### Invalid Transitions

- VOID -> any state (voided invoices cannot be un-voided)
- PAID -> any state except VOID (paid invoices can only be voided)

---

## Business Rules

### Payment Recording

1. **Amount Validation**
   - Payment amount must be positive (`amount > 0`)
   - Payment amount cannot exceed amountDue + $0.01 tolerance
   - If amount slightly exceeds due to rounding, cap at amountDue

2. **Invoice State Validation**
   - Cannot record payment against VOID invoice
   - Cannot record payment against PAID invoice
   - DRAFT invoices should be SENT first (soft requirement)

3. **Partial Payments**
   - Partial payments are allowed
   - Invoice status changes to PARTIAL when 0 < amountPaid < totalAmount
   - Invoice status changes to PAID when amountDue <= $0.01

4. **Overpayment Prevention**
   - System rejects payments exceeding amountDue
   - Error message: "Payment amount ({amount}) exceeds amount due ({amountDue}). Overpayments are not allowed."

5. **Payment Methods**
   - Supported: CASH, CHECK, WIRE, ACH, CREDIT_CARD, DEBIT_CARD, OTHER
   - Reference number encouraged for CHECK, WIRE, ACH

### GL Posting Rules

1. **Payment GL Entries** (on recordPayment)
   - Debit: Cash account (increase asset)
   - Credit: Accounts Receivable (decrease asset)
   - Entry description: "Payment received - Invoice #{invoiceNumber}"

2. **Invoice Void GL Entries** (on void)
   - Create reversing entries for original invoice posting
   - Entry description: "Invoice void reversal - {reason}"

3. **Payment Void GL Entries** (on void)
   - Credit: Cash account (decrease asset)
   - Debit: Accounts Receivable (increase asset)
   - Entry description: "Payment void reversal - {reason}"

4. **Entry Balance**
   - All GL entries must balance (total debits = total credits)
   - This is enforced at transaction level

### Client Balance Updates

1. **On Payment Recording**
   - Reduce client.totalOwed by payment amount
   - Sync via `syncClientBalance()` after transaction

2. **On Invoice Void**
   - Reduce client.totalOwed by amountDue
   - Prevents negative balances with `GREATEST(0, ...)`

3. **On Payment Void**
   - Increase client.totalOwed by payment amount
   - Recalculate from invoices for accuracy

### Multi-Invoice Payments

1. **Allocation Validation**
   - Sum of allocations must equal totalAmount (within $0.01)
   - Each allocation must be positive
   - Each allocation cannot exceed invoice's amountDue

2. **Processing**
   - Single payment record created
   - Junction records in invoice_payments for each allocation
   - Each invoice updated independently
   - Single GL entry pair for total amount

### PDF Generation (TO BE IMPLEMENTED)

1. **Content Requirements**
   - Company header/logo
   - Client billing information
   - Invoice number, date, due date
   - Line items with quantities, prices, totals
   - Subtotal, tax, discount, total
   - Payment terms
   - Payment instructions

2. **Performance Requirements**
   - Generation must complete within 30 seconds
   - Add timeout handling

---

## Error States

### Payment Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| "Invoice not found" | Invalid invoiceId | Refresh list, verify invoice exists |
| "Invoice is already paid in full" | Attempting payment on PAID invoice | No action needed |
| "Cannot apply payment to voided invoice" | Attempting payment on VOID invoice | No action needed |
| "Payment amount exceeds amount due" | Overpayment attempt | Reduce payment amount |
| "Allocations total must equal payment amount" | Multi-invoice allocation mismatch | Adjust allocations |
| "Database not available" | DB connection failure | Retry, contact support |

### Invoice Void Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| "Invoice not found" | Invalid invoiceId | Refresh list |
| "Invoice is already voided" | Re-voiding attempt | No action needed |
| "Reason is required" | Empty void reason | Provide reason |
| "Failed to reverse GL entries" | GL posting failure | Contact accounting |

### PDF Generation Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| "PDF generation timed out" | Processing > 30s | Retry, simplify invoice |
| "Invoice not found" | Invalid invoiceId | Refresh, select valid invoice |
| "Template error" | PDF template issue | Contact support |

### Validation Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| "Amount must be positive" | amount <= 0 | Enter positive amount |
| "Invalid payment method" | Unknown method | Select from dropdown |
| "Invalid date format" | Malformed date | Use date picker |

---

## Invariants

### INV-003: Total Payments <= Invoice Amount

```
For all invoices:
  invoice.amountPaid <= invoice.totalAmount
  invoice.amountDue = invoice.totalAmount - invoice.amountPaid
  invoice.amountDue >= 0
```

**Verification:**
```sql
-- Check for overpayment violations
SELECT id, invoiceNumber, totalAmount, amountPaid, amountDue
FROM invoices
WHERE amountPaid > totalAmount + 0.01
   OR amountDue < -0.01;
```

### INV-004: GL Entries Must Balance

```
For all transactions:
  SUM(debit) = SUM(credit)

For each referenceType/referenceId combination:
  SUM(debit) = SUM(credit)
```

**Verification:**
```sql
-- Check for unbalanced GL entries by source
SELECT referenceType, referenceId,
       SUM(CAST(debit AS DECIMAL(15,2))) as total_debit,
       SUM(CAST(credit AS DECIMAL(15,2))) as total_credit,
       SUM(CAST(debit AS DECIMAL(15,2))) - SUM(CAST(credit AS DECIMAL(15,2))) as balance
FROM ledgerEntries
WHERE deletedAt IS NULL
GROUP BY referenceType, referenceId
HAVING balance != 0;
```

### INV-005: Client Balance Accuracy

```
For all clients:
  client.totalOwed = SUM(unpaid invoices.amountDue)
```

**Verification:**
```sql
-- Check for client balance mismatches
SELECT c.id, c.name, c.totalOwed,
       COALESCE(SUM(CAST(i.amountDue AS DECIMAL(15,2))), 0) as calculated_owed,
       CAST(c.totalOwed AS DECIMAL(15,2)) - COALESCE(SUM(CAST(i.amountDue AS DECIMAL(15,2))), 0) as difference
FROM clients c
LEFT JOIN invoices i ON i.customerId = c.id
                     AND i.status NOT IN ('PAID', 'VOID')
                     AND i.deletedAt IS NULL
WHERE c.deletedAt IS NULL
GROUP BY c.id, c.name, c.totalOwed
HAVING ABS(difference) > 0.01;
```

### Additional Invariants

**INV-004a: Payment Amount Matches GL Entry**
```
For each payment:
  payment.amount = ledgerEntry.debit (for Cash account)
  payment.amount = ledgerEntry.credit (for AR account)
```

**INV-004b: Void Creates Reversing Entries**
```
For each voided invoice/payment:
  Original entries + Reversal entries = Net 0
```

---

## Cross-Flow Touchpoints

### GF-003: Order-to-Cash -> GF-004: Invoice & Payment

| Touchpoint | Description | Data Flow |
|------------|-------------|-----------|
| Invoice Generation | GF-003 creates invoices from confirmed orders | `invoices.generateFromOrder` called from order flow |
| Order Reference | Invoice references source order | `invoice.referenceType = 'ORDER'`, `invoice.referenceId = orderId` |
| Status Update | Invoice status reflects in order | Order shows invoice status in details |

**Integration Points:**
- `server/routers/invoices.ts:generateFromOrder` - Creates invoice from order
- `server/services/orderAccountingService.ts:createInvoiceFromOrder` - Core creation logic

### GF-004: Invoice & Payment -> GF-006: Client Ledger

| Touchpoint | Description | Data Flow |
|------------|-------------|-----------|
| Client Balance | Payments update client.totalOwed | `syncClientBalance()` after payment |
| Transaction History | Payments appear in client ledger | Ledger queries payments by clientId |
| Aging Report | Open invoices contribute to aging | Aging calculates from invoice dueDate |

**Integration Points:**
- `server/services/clientBalanceService.ts:syncClientBalance` - Recalculates client balance
- `clients.totalOwed` column - Denormalized balance for performance
- Client detail page shows payment history and outstanding invoices

### GF-004: Invoice & Payment -> Accounting Module

| Touchpoint | Description | Data Flow |
|------------|-------------|-----------|
| GL Posting | All payments create GL entries | `ledgerEntries` table updated |
| Account Balances | Cash and AR accounts affected | Account balances recalculated |
| Financial Reports | Payments appear in cash flow | Reports query ledgerEntries |

**Integration Points:**
- `server/_core/accountLookup.ts` - Resolves account IDs
- `server/_core/fiscalPeriod.ts` - Determines posting period

---

## Security Considerations

### Permission Requirements

| Action | Required Permission |
|--------|---------------------|
| View invoices | `accounting:read` |
| View payments | `accounting:read` |
| Record payment | `accounting:create` |
| Update invoice status | `accounting:update` |
| Void invoice | `accounting:delete` |
| Void payment | `accounting:delete` |
| Generate PDF | `accounting:read` |

### Actor Attribution

All mutations require authenticated user context:
```typescript
const userId = getAuthenticatedUserId(ctx);
// Never: const userId = input.createdBy || 1  // FORBIDDEN
```

### Audit Trail

- All payments have `createdBy` populated from context
- All invoice updates have `updatedAt` auto-updated
- Void operations include reason in notes
- GL entries reference source document

---

## Performance Considerations

### Caching

- Invoice list should support pagination (default limit: 50)
- Client balance may be cached (invalidate on payment)
- Invoice summary stats may be cached (short TTL)

### Query Optimization

- Indexes on customerId, status, dueDate for common filters
- Composite indexes for common query patterns
- Avoid N+1 queries when loading payments for invoice

### PDF Generation

- Implement request timeout (30 seconds)
- Consider async generation for large invoices
- Cache generated PDFs for repeated downloads

---

## Testing Checklist

### Unit Tests

- [ ] Payment amount validation (positive, not exceeding due)
- [ ] Status transition validation
- [ ] GL entry balance calculation
- [ ] Multi-invoice allocation validation

### Integration Tests

- [ ] Record payment updates invoice correctly
- [ ] GL entries created and balanced
- [ ] Client balance updated via sync
- [ ] Void creates reversing entries

### E2E Tests (tests-e2e/golden-flows/)

- [ ] Complete invoice viewing flow
- [ ] Complete payment recording flow
- [ ] Multi-invoice payment flow
- [ ] Invoice void flow
- [ ] PDF generation flow (when implemented)

### Test Data Requirements

- Clients with outstanding invoices (various statuses)
- Invoices with partial payments
- Multi-invoice payment history
- Overdue invoices

---

## Known Issues & Limitations

### Current Status (Jan 26, 2026)

| Issue | Status | Priority | Tracking |
|-------|--------|----------|----------|
| PDF generation timeout | OPEN | MEDIUM | GF-PHASE1-004 |
| Payment recording is STUB | OPEN | HIGH | GF-PHASE2-001 |

### Planned Improvements

1. **PDF Service Implementation** (GF-PHASE1-004)
   - Create `server/services/pdfService.ts`
   - Add proper timeout handling
   - Support invoice templates

2. **Wire Payment Mutation** (GF-PHASE2-001)
   - Connect frontend to `payments.recordPayment`
   - Replace stub with actual API call

3. **Email Integration**
   - Send invoice PDF via email
   - Track email delivery status

---

## UI Components (Proposed)

### Existing/Planned Components

| Component | Path | Purpose |
|-----------|------|---------|
| InvoicesWorkSurface | `client/src/components/work-surface/InvoicesWorkSurface.tsx` | Main invoice list and inspector |
| PaymentDialog | `client/src/components/payments/PaymentDialog.tsx` | Payment recording form |
| InvoiceInspector | `client/src/components/invoices/InvoiceInspector.tsx` | Invoice detail panel |
| PaymentHistory | `client/src/components/payments/PaymentHistory.tsx` | Payment list for invoice |

### Work Surface Pattern

The invoice flow should follow the TERP Work Surface pattern:
- Main list on left
- Inspector panel on right
- Actions in toolbar/context menu
- Keyboard navigation support (documented in E2E tests)

---

## Appendix: Payment Number Format

Format: `PMT-{YYYYMM}-{NNNNN}`

Example: `PMT-202601-00042`

- YYYY: 4-digit year
- MM: 2-digit month (zero-padded)
- NNNNN: 5-digit sequence within month (zero-padded)

## Appendix: Invoice Number Format

Format: `INV-{YYYY}{MM}-{NNNNN}`

Example: `INV-202601-00001`

(Generated in `server/services/orderAccountingService.ts`)
