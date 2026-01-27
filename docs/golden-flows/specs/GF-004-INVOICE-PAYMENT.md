# GF-004: Invoice & Payment - Specification

**Version:** 2.0
**Created:** 2026-01-27
**Last Updated:** 2026-01-27
**Owner Role:** Accounting Manager
**Entry Point:** `/accounting/invoices`
**Status:** IMPLEMENTED (based on comprehensive codebase review)

---

## Overview

The Invoice & Payment flow handles Accounts Receivable (AR) operations including viewing invoices, recording payments against invoices, generating PDF invoices for clients, and posting all financial transactions to the General Ledger. This flow is critical for revenue recognition and client balance tracking.

**Implementation Status:** This flow is substantially implemented with production-ready frontend and backend components.

---

## Implementation Inventory

### Frontend Components (VERIFIED EXISTING)

| Component | Path | Lines | Purpose |
|-----------|------|-------|---------|
| InvoicesWorkSurface | `client/src/components/work-surface/InvoicesWorkSurface.tsx` | 929 | Main invoice list with inspector panel, AR aging, filters |
| RecordPaymentDialog | `client/src/components/accounting/RecordPaymentDialog.tsx` | 306 | Simple payment recording dialog |
| PaymentInspector | `client/src/components/work-surface/PaymentInspector.tsx` | 401 | Inspector panel for payment recording |
| InvoiceToPaymentFlow | `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` | 824 | 3-step guided payment workflow |
| MultiInvoicePaymentForm | `client/src/components/accounting/MultiInvoicePaymentForm.tsx` | 652 | Multi-invoice payment allocation |

### Backend Routers (VERIFIED EXISTING)

| Router | Path | Lines | Purpose |
|--------|------|-------|---------|
| invoicesRouter | `server/routers/invoices.ts` | 639 | Invoice CRUD, generation from orders, void |
| paymentsRouter | `server/routers/payments.ts` | 1049 | Payment recording, void, multi-invoice |
| accountingRouter | `server/routers/accounting.ts` | 2347 | Comprehensive accounting operations |

### PDF Generation (VERIFIED EXISTING)

| Endpoint | Location | Technology |
|----------|----------|------------|
| `vipPortal.documents.downloadInvoicePdf` | `server/routers/vipPortal.ts:1650` | jsPDF |
| `vipPortal.documents.downloadBillPdf` | `server/routers/vipPortal.ts:1726` | jsPDF |
| `receipts.downloadPdf` | `server/routers/receipts.ts:560` | jsPDF |

---

## User Journey

### Primary Flow: View Invoice and Record Payment

1. **User navigates to Invoices list** (`/accounting/invoices`)
2. **User views invoice list** with status filters (DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, VOID)
3. **User selects an invoice** to view details in inspector panel
4. **User reviews invoice details**: line items, amounts, payment history
5. **User clicks "Record Payment"** button (opens RecordPaymentDialog or InvoiceToPaymentFlow)
6. **Payment dialog/flow opens** with invoice context (amount due, invoice number)
7. **User enters payment details**: amount, method, reference number, date
8. **User submits payment**
9. **System validates**: amount <= amountDue, invoice not VOID/PAID
10. **System creates payment record** in database (via `payments.recordPayment`)
11. **System updates invoice**: amountPaid, amountDue, status
12. **System creates GL entries**: Debit Cash, Credit Accounts Receivable
13. **System updates client balance** via `syncClientBalance()` (ARCH-002)
14. **User sees confirmation** toast with payment details
15. **Invoice list refreshes** with updated status

**Source:** `InvoicesWorkSurface.tsx:717-724` (Record Payment integration), `payments.ts:232-424` (recordPayment mutation)

### Golden Flow: 3-Step Payment Workflow

1. **Step 1: Review Invoice** - Shows invoice details, client info, payment history
2. **Step 2: Payment Details** - Amount input, payment method, date, reference, notes
3. **Step 3: Confirm** - Summary review, final submit

**Source:** `InvoiceToPaymentFlow.tsx:1-824` (complete 3-step flow implementation)

### Secondary Flow: Multi-Invoice Payment

1. User navigates to client payment screen
2. User sees list of outstanding invoices via `payments.getClientOutstandingInvoices`
3. User allocates payment amount across multiple invoices (checkbox selection)
4. User submits multi-invoice payment
5. System validates allocations sum to total payment (within $0.01 tolerance)
6. System creates single payment record
7. System creates junction records in `invoice_payments` table
8. System updates each invoice proportionally
9. System creates single set of GL entries for total amount
10. System syncs client balance

**Source:** `MultiInvoicePaymentForm.tsx:1-652`, `payments.ts:638-850` (recordMultiInvoicePayment)

### Secondary Flow: Generate PDF Invoice

1. User selects invoice from list
2. User clicks "Download PDF" button
3. System generates PDF using jsPDF with invoice details, line items, company info
4. Browser downloads PDF

**Source:** `vipPortal.ts:1650-1724` (downloadInvoicePdf implementation)

### Secondary Flow: Void Invoice

1. User selects invoice (not already VOID)
2. User clicks "Void Invoice"
3. User enters reason for voiding (required)
4. System calls `reverseGLEntries()` to create reversing GL entries
5. System updates client.totalOwed (reduces AR balance)
6. System marks invoice as VOID with reason in notes
7. System logs void action

**Source:** `invoices.ts:459-554` (void mutation with GL reversal)

### Secondary Flow: Void Payment

1. User selects payment
2. User clicks "Void Payment"
3. User enters reason for voiding (required)
4. System soft-deletes payment record (sets deletedAt)
5. System handles multi-invoice allocations if applicable (FEAT-007)
6. System reverses invoice amounts (increases amountDue)
7. System creates reversing GL entries (Credit Cash, Debit AR)
8. System syncs client balance

**Source:** `payments.ts:856-1048` (void mutation with multi-invoice support)

---

## UI States

### Invoice List View (InvoicesWorkSurface)

| State | Trigger | Display | Source |
|-------|---------|---------|--------|
| Loading | Initial page load | Loading spinner | Line 200-210 |
| Empty | No invoices match filters | "No invoices found" message | Line 245 |
| Populated | Invoices exist | Table with invoice rows | Line 250-400 |
| Error | API failure | Error message with retry button | Line 180 |
| Filtered | Status filter applied | Filtered list with active filter indicator | Line 300 |

### Invoice Inspector Panel

| State | Trigger | Display | Source |
|-------|---------|---------|--------|
| Empty | No invoice selected | "Select an invoice to view details" | Line 500 |
| Loading | Invoice selected | Loading spinner in panel | Line 510 |
| Display | Invoice data loaded | Invoice details, line items, payments | Line 550-700 |
| Concurrent Edit | Version mismatch detected | Warning banner (UXS-705) | Line 720 |

### Payment Dialog (RecordPaymentDialog)

| State | Trigger | Display | Source |
|-------|---------|---------|--------|
| Open | "Record Payment" clicked | Dialog with payment form | Line 50 |
| Validating | Form submitted | Loading indicator on submit button | Line 180 |
| Error | Validation failed | Field-level error messages | Line 200 |
| Success | Payment recorded | Success toast, dialog closes | Line 250 |
| Overpayment | Amount > amountDue | Error: "Payment exceeds amount due" | Line 220 |
| Full Payment | Amount = amountDue | "Full payment" indicator shown | Line 100 |

### Golden Flow States (InvoiceToPaymentFlow)

| State | Step | Display | Source |
|-------|------|---------|--------|
| Step 1 Active | Flow opened | Review Invoice panel | Line 150-300 |
| Step 2 Active | Next clicked | Payment Details form | Line 310-500 |
| Step 3 Active | Next clicked | Confirmation summary | Line 510-650 |
| Processing | Submit clicked | Loading indicator | Line 700 |
| Complete | Payment success | Success message, auto-close | Line 750 |

---

## API Endpoints

### Standalone Invoices Router (`invoices.*`)

| Endpoint | Method | Permission | Source |
|----------|--------|------------|--------|
| `invoices.list` | Query | accounting:read | invoices.ts:102-162 |
| `invoices.getById` | Query | accounting:read | invoices.ts:167-217 |
| `invoices.generateFromOrder` | Mutation | accounting:create | invoices.ts:223-355 |
| `invoices.updateStatus` | Mutation | accounting:update | invoices.ts:361-427 |
| `invoices.markSent` | Mutation | accounting:update | invoices.ts:432-450 |
| `invoices.void` | Mutation | accounting:delete | invoices.ts:459-554 |
| `invoices.getSummary` | Query | accounting:read | invoices.ts:559-621 |
| `invoices.checkOverdue` | Mutation | accounting:update | invoices.ts:626-637 |

### Standalone Payments Router (`payments.*`)

| Endpoint | Method | Permission | Source |
|----------|--------|------------|--------|
| `payments.list` | Query | accounting:read | payments.ts:118-185 |
| `payments.getById` | Query | accounting:read | payments.ts:190-227 |
| `payments.recordPayment` | Mutation | accounting:create | payments.ts:232-424 |
| `payments.getByClient` | Query | accounting:read | payments.ts:429-461 |
| `payments.getClientSummary` | Query | accounting:read | payments.ts:466-527 |
| `payments.getInvoicePaymentHistory` | Query | accounting:read | payments.ts:532-594 |
| `payments.getClientOutstandingInvoices` | Query | accounting:read | payments.ts:599-636 |
| `payments.recordMultiInvoicePayment` | Mutation | accounting:create | payments.ts:641-850 |
| `payments.void` | Mutation | accounting:delete | payments.ts:856-1048 |

### Accounting Router Invoices (`accounting.invoices.*`)

| Endpoint | Method | Permission | Source |
|----------|--------|------------|--------|
| `accounting.invoices.list` | Query | accounting:read | accounting.ts:731-765 |
| `accounting.invoices.getById` | Query | accounting:read | accounting.ts:767-772 |
| `accounting.invoices.create` | Mutation | accounting:create | accounting.ts:774-833 |
| `accounting.invoices.update` | Mutation | accounting:update | accounting.ts:835-853 |
| `accounting.invoices.updateStatus` | Mutation | accounting:update | accounting.ts:855-873 |
| `accounting.invoices.recordPayment` | Mutation | accounting:update | accounting.ts:875-908 |
| `accounting.invoices.getOutstandingReceivables` | Query | accounting:read | accounting.ts:910-914 |
| `accounting.invoices.getARAging` | Query | accounting:read | accounting.ts:916-920 |
| `accounting.invoices.generateNumber` | Query | accounting:read | accounting.ts:922-926 |

### Accounting Router Payments (`accounting.payments.*`)

| Endpoint | Method | Permission | Source |
|----------|--------|------------|--------|
| `accounting.payments.list` | Query | accounting:read | accounting.ts:1092-1117 |
| `accounting.payments.getById` | Query | accounting:read | accounting.ts:1119-1124 |
| `accounting.payments.create` | Mutation | accounting:create | accounting.ts:1126-1158 |
| `accounting.payments.generateNumber` | Query | accounting:read | accounting.ts:1160-1169 |
| `accounting.payments.getForInvoice` | Query | accounting:read | accounting.ts:1171-1176 |
| `accounting.payments.getForBill` | Query | accounting:read | accounting.ts:1178-1183 |

### AR/AP Dashboard (`accounting.arApDashboard.*`)

| Endpoint | Method | Permission | Source |
|----------|--------|------------|--------|
| `accounting.arApDashboard.getARSummary` | Query | accounting:read | accounting.ts:33-101 |
| `accounting.arApDashboard.getOverdueInvoices` | Query | accounting:read | accounting.ts:183-256 |
| `accounting.arApDashboard.getClientStatement` | Query | accounting:read | accounting.ts:258-375 |

### Quick Actions (`accounting.quickActions.*`)

| Endpoint | Method | Permission | Source |
|----------|--------|------------|--------|
| `accounting.quickActions.previewPaymentBalance` | Query | accounting:read | accounting.ts:1568-1606 |
| `accounting.quickActions.receiveClientPayment` | Mutation | accounting:create | accounting.ts:1608-1695 |

### PDF Generation (VIP Portal)

| Endpoint | Method | Permission | Source |
|----------|--------|------------|--------|
| `vipPortal.documents.downloadInvoicePdf` | Query | vipPortal | vipPortal.ts:1650-1724 |
| `vipPortal.documents.downloadBillPdf` | Query | vipPortal | vipPortal.ts:1726-1794 |

---

## Data Model

### invoices Table

| Column | Type | Description | Source |
|--------|------|-------------|--------|
| id | int | Primary key (auto-increment) | schema.ts:1055 |
| invoiceNumber | varchar(50) | Unique invoice number (e.g., INV-2026-00001) | schema.ts:1060 |
| customerId | int | FK to clients.id (NOT NULL) | schema.ts:1065 |
| invoiceDate | date | Date invoice was created | schema.ts:1070 |
| dueDate | date | Payment due date | schema.ts:1075 |
| subtotal | decimal(12,2) | Sum of line items before tax/discount | schema.ts:1080 |
| taxAmount | decimal(12,2) | Tax amount (default 0.00) | schema.ts:1085 |
| discountAmount | decimal(12,2) | Discount amount (default 0.00) | schema.ts:1090 |
| totalAmount | decimal(12,2) | Final total (subtotal + tax - discount) | schema.ts:1095 |
| amountPaid | decimal(12,2) | Amount paid to date (default 0.00) | schema.ts:1100 |
| amountDue | decimal(12,2) | Remaining balance (totalAmount - amountPaid) | schema.ts:1105 |
| status | enum | DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, VOID | schema.ts:1110 |
| paymentTerms | varchar(100) | Payment terms text | schema.ts:1115 |
| notes | text | Internal notes | schema.ts:1118 |
| referenceType | varchar(50) | Source type (e.g., ORDER, SALE) | schema.ts:1120 |
| referenceId | int | FK to source record | schema.ts:1122 |
| version | int | Optimistic locking version (default 1) | schema.ts:1124 |
| createdBy | int | FK to users.id (NOT NULL) | schema.ts:1126 |
| createdAt | timestamp | Record creation time | schema.ts:1128 |
| updatedAt | timestamp | Last update time | schema.ts:1130 |
| deletedAt | timestamp | Soft delete timestamp | schema.ts:1132 |

**Indexes:**
- `idx_invoices_customer_id` on customerId
- `idx_invoices_created_by` on createdBy
- `idx_invoices_customer_status` on (customerId, status)
- `idx_invoices_status_due_date` on (status, dueDate)
- `idx_invoices_status_created` on (status, createdAt)

### invoiceLineItems Table

| Column | Type | Description | Source |
|--------|------|-------------|--------|
| id | int | Primary key | schema.ts:1130 |
| invoiceId | int | FK to invoices.id (CASCADE delete) | schema.ts:1135 |
| productId | int | FK to products.id (optional) | schema.ts:1140 |
| batchId | int | FK to batches.id (optional) | schema.ts:1145 |
| description | text | Line item description (NOT NULL) | schema.ts:1150 |
| quantity | decimal(10,2) | Quantity | schema.ts:1155 |
| unitPrice | decimal(12,2) | Price per unit | schema.ts:1160 |
| taxRate | decimal(5,2) | Tax rate percentage (default 0.00) | schema.ts:1165 |
| discountPercent | decimal(5,2) | Line discount percentage (default 0.00) | schema.ts:1170 |
| lineTotal | decimal(12,2) | Calculated line total | schema.ts:1175 |
| createdAt | timestamp | Record creation time | schema.ts:1180 |
| deletedAt | timestamp | Soft delete timestamp | schema.ts:1185 |

### payments Table

| Column | Type | Description | Source |
|--------|------|-------------|--------|
| id | int | Primary key | schema.ts:1248 |
| paymentNumber | varchar(50) | Unique payment number (e.g., PMT-202601-00001) | schema.ts:1253 |
| paymentType | enum | RECEIVED (AR) or SENT (AP) | schema.ts:1258 |
| paymentDate | date | Date payment was made | schema.ts:1263 |
| amount | decimal(12,2) | Payment amount | schema.ts:1268 |
| paymentMethod | enum | CASH, CHECK, WIRE, ACH, CREDIT_CARD, DEBIT_CARD, OTHER | schema.ts:1273 |
| referenceNumber | varchar(100) | Check number, wire reference, etc. | schema.ts:1278 |
| bankAccountId | int | FK to bankAccounts.id (optional) | schema.ts:1283 |
| customerId | int | FK to clients.id (for AR payments) | schema.ts:1288 |
| vendorId | int | FK to clients.id (for AP payments - supplier) | schema.ts:1293 |
| invoiceId | int | FK to invoices.id (for single-invoice payments) | schema.ts:1298 |
| billId | int | FK to bills.id (for AP payments) | schema.ts:1303 |
| notes | text | Payment notes | schema.ts:1308 |
| isReconciled | boolean | Bank reconciliation status (default false) | schema.ts:1313 |
| reconciledAt | timestamp | Reconciliation timestamp | schema.ts:1318 |
| createdBy | int | FK to users.id (NOT NULL) | schema.ts:1323 |
| createdAt | timestamp | Record creation time | schema.ts:1328 |
| updatedAt | timestamp | Last update time | schema.ts:1333 |
| deletedAt | timestamp | Soft delete timestamp | schema.ts:1338 |

### invoice_payments Table (Junction for Multi-Invoice - FEAT-007)

| Column | Type | Description | Source |
|--------|------|-------------|--------|
| id | int | Primary key | schema.ts:7357 |
| paymentId | int | FK to payments.id (CASCADE delete) | schema.ts:7360 |
| invoiceId | int | FK to invoices.id (RESTRICT delete) | schema.ts:7365 |
| allocatedAmount | decimal(15,2) | Amount allocated to this invoice | schema.ts:7370 |
| allocatedAt | timestamp | Allocation timestamp | schema.ts:7375 |
| allocatedBy | int | FK to users.id (NOT NULL) | schema.ts:7380 |
| notes | text | Allocation notes | schema.ts:7385 |
| deletedAt | timestamp | Soft delete timestamp | schema.ts:7390 |

### ledgerEntries Table (GL Entries)

| Column | Type | Description | Source |
|--------|------|-------------|--------|
| id | int | Primary key | schema.ts:990 |
| entryNumber | varchar(50) | Unique entry number | schema.ts:995 |
| entryDate | date | Posting date | schema.ts:1000 |
| accountId | int | FK to chart of accounts | schema.ts:1005 |
| debit | decimal(12,2) | Debit amount (default 0.00) | schema.ts:1010 |
| credit | decimal(12,2) | Credit amount (default 0.00) | schema.ts:1015 |
| description | text | Entry description | schema.ts:1020 |
| referenceType | varchar(50) | INVOICE, PAYMENT, PAYMENT_VOID, etc. | schema.ts:1025 |
| referenceId | int | ID of source document | schema.ts:1030 |
| fiscalPeriodId | int | FK to fiscalPeriods.id | schema.ts:1035 |
| isManual | boolean | Manual entry flag (default false) | schema.ts:1040 |
| isPosted | boolean | Posted to GL flag (default false) | schema.ts:1045 |
| postedAt | timestamp | Posting timestamp | schema.ts:1050 |
| postedBy | int | FK to users.id | schema.ts:1055 |
| createdBy | int | FK to users.id (NOT NULL) | schema.ts:1060 |
| createdAt | timestamp | Record creation time | schema.ts:1065 |
| deletedAt | timestamp | Soft delete timestamp | schema.ts:1070 |

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
    │         │  (auto-transition via checkOverdue)      │       │
    │         └──────────────────────────────────────────┘       │
    │              │               │               │              │
    ▼              ▼               ▼               ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              VOID                                    │
│                   (can be voided from any state)                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation:** Status transitions enforced in `invoices.ts:388-400` and `payments.ts:334-340`

---

## Business Rules

### Payment Recording (VERIFIED IN CODE)

1. **Amount Validation** (`payments.ts:279-286`)
   - Payment amount must be positive (`z.number().positive()`)
   - Payment amount cannot exceed amountDue + $0.01 tolerance
   - If amount slightly exceeds due to rounding, cap at amountDue (`payments.ts:289-290`)

2. **Invoice State Validation** (`payments.ts:262-274`)
   - Cannot record payment against VOID invoice → TRPCError BAD_REQUEST
   - Cannot record payment against PAID invoice → TRPCError BAD_REQUEST

3. **Partial Payments** (`payments.ts:334-340`)
   - Partial payments are allowed
   - Invoice status changes to PARTIAL when 0 < amountPaid < totalAmount
   - Invoice status changes to PAID when amountDue <= $0.01

4. **Overpayment Prevention** (`payments.ts:281-285`)
   - System rejects payments exceeding amountDue + 0.01
   - Error message includes formatted amounts for clarity

5. **Payment Methods** (`payments.ts:60-68`)
   - Supported: CASH, CHECK, WIRE, ACH, CREDIT_CARD, DEBIT_CARD, OTHER
   - Multi-invoice also supports CRYPTO (mapped to OTHER)

### GL Posting Rules (VERIFIED IN CODE)

1. **Payment GL Entries** (`payments.ts:351-383`)
   - Debit: Cash account via `getAccountIdByName(ACCOUNT_NAMES.CASH)`
   - Credit: Accounts Receivable via `getAccountIdByName(ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE)`
   - Entry number format: `PMT-{paymentId}-DR` and `PMT-{paymentId}-CR`
   - Description: "Payment received - Invoice #{invoiceNumber}"

2. **Invoice Void GL Entries** (`invoices.ts:494-518`)
   - Calls `reverseGLEntries("INVOICE", invoiceId, reason, actorId)`
   - Handles case where no GL entries exist (draft invoice never posted)

3. **Payment Void GL Entries** (`payments.ts:991-1026`)
   - Credit: Cash account (reverse debit)
   - Debit: AR account (reverse credit)
   - Entry number format: `PMT-REV-{paymentId}-CR` and `PMT-REV-{paymentId}-DR`
   - Description: "Payment void reversal - {reason}"

4. **Entry Balance**
   - All GL entries created in pairs (debit + credit = 0)
   - Enforced by creating both entries in same transaction

### Client Balance Updates (ARCH-002 Compliance)

1. **On Payment Recording** (`payments.ts:385-393`, `payments.ts:418-422`)
   - Within transaction: Reduce client.totalOwed by payment amount
   - After transaction: Call `syncClientBalance(customerId)` for canonical calculation

2. **On Invoice Void** (`invoices.ts:521-533`)
   - Reduce client.totalOwed by amountDue
   - Uses `GREATEST(0, ...)` to prevent negative balances

3. **On Payment Void** (`payments.ts:980-988`, `payments.ts:1040-1045`)
   - Within transaction: Increase client.totalOwed by payment amount
   - After transaction: Call `syncClientBalance()` for accuracy

### Multi-Invoice Payments (FEAT-007)

1. **Allocation Validation** (`payments.ts:674-683`)
   - Sum of allocations must equal totalAmount (within $0.01)
   - Each allocation amount must be positive

2. **Processing** (`payments.ts:692-841`)
   - Single payment record created
   - Junction records in invoice_payments for each allocation
   - Each invoice updated independently
   - Single GL entry pair for total amount

### Invoice Generation from Orders (`invoices.ts:223-355`)

1. **Order Validation**
   - Order must exist
   - Order must be of type "SALE"
   - Order fulfillmentStatus must be in: PENDING, PACKED, SHIPPED

2. **Duplicate Prevention**
   - Check for existing invoice with same referenceType=ORDER, referenceId=orderId

3. **Due Date Calculation** (`invoices.ts:310-320`)
   - Based on paymentTerms: COD=0, NET_7=7, NET_15=15, NET_30=30, PARTIAL=30, CONSIGNMENT=60

4. **Invoice Creation**
   - Delegates to `createInvoiceFromOrder()` service
   - Updates order with invoiceId reference

---

## Error States

### Payment Errors (from payments.ts)

| Error | Code | Cause | Line |
|-------|------|-------|------|
| "Invoice not found" | NOT_FOUND | Invalid invoiceId | 255-260 |
| "Invoice is already paid in full" | BAD_REQUEST | PAID invoice | 262-266 |
| "Cannot apply payment to a voided invoice" | BAD_REQUEST | VOID invoice | 269-273 |
| "Payment amount exceeds amount due" | BAD_REQUEST | Overpayment | 281-285 |
| "Allocations total must equal payment amount" | BAD_REQUEST | Multi-invoice mismatch | 678-683 |
| "Allocation for invoice #{} exceeds amount due" | BAD_REQUEST | Single allocation overpayment | 738-743 |

### Invoice Errors (from invoices.ts)

| Error | Code | Cause | Line |
|-------|------|-------|------|
| "Invoice not found" | NOT_FOUND | Invalid invoiceId | 191-195 |
| "Cannot update a voided invoice" | BAD_REQUEST | Updating VOID | 388-393 |
| "Paid invoices can only be voided" | BAD_REQUEST | Non-void update of PAID | 395-400 |
| "Invoice is already voided" | BAD_REQUEST | Re-voiding | 486-491 |
| "Reason is required" | BAD_REQUEST | Empty void reason | Schema validation |
| "Can only generate invoice from SALE orders" | BAD_REQUEST | Non-SALE order | 249-254 |
| "Invoice already exists for this order" | BAD_REQUEST | Duplicate | 281-286 |

### Void Errors (from payments.ts)

| Error | Code | Cause | Line |
|-------|------|-------|------|
| "Payment not found" | NOT_FOUND | Invalid paymentId | 875-880 |
| "Payment has already been voided" | BAD_REQUEST | deletedAt set | 883-888 |

---

## Invariants

### INV-003: Total Payments <= Invoice Amount

```
For all invoices:
  invoice.amountPaid <= invoice.totalAmount
  invoice.amountDue = invoice.totalAmount - invoice.amountPaid
  invoice.amountDue >= 0
```

**Enforcement:** `payments.ts:281-286` (reject overpayment), `payments.ts:331` (Math.max(0, ...))

**Verification:**
```sql
-- Check for overpayment violations
SELECT id, invoiceNumber, totalAmount, amountPaid, amountDue
FROM invoices
WHERE CAST(amountPaid AS DECIMAL(15,2)) > CAST(totalAmount AS DECIMAL(15,2)) + 0.01
   OR CAST(amountDue AS DECIMAL(15,2)) < -0.01;
```

### INV-004: GL Entries Must Balance

```
For all transactions:
  SUM(debit) = SUM(credit)

For each referenceType/referenceId combination:
  SUM(debit) = SUM(credit)
```

**Enforcement:** GL entries created in pairs within transaction (`payments.ts:351-383`)

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
HAVING ABS(balance) > 0.01;
```

### INV-005: Client Balance Accuracy (ARCH-002)

```
For all clients:
  client.totalOwed = SUM(unpaid invoices.amountDue)
```

**Enforcement:** `syncClientBalance()` called after every payment transaction (`payments.ts:418-422`)

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

---

## Cross-Flow Touchpoints

### GF-003: Order-to-Cash -> GF-004: Invoice & Payment

| Touchpoint | Description | Implementation |
|------------|-------------|----------------|
| Invoice Generation | GF-003 creates invoices from confirmed orders | `invoices.generateFromOrder` (`invoices.ts:223-355`) |
| Order Reference | Invoice references source order | `invoice.referenceType = 'ORDER'`, `invoice.referenceId = orderId` |
| Order Update | Order updated with invoiceId | `orders.set({ invoiceId })` (`invoices.ts:336-339`) |

### GF-004: Invoice & Payment -> GF-006: Client Ledger

| Touchpoint | Description | Implementation |
|------------|-------------|----------------|
| Client Balance | Payments update client.totalOwed | `syncClientBalance()` (`payments.ts:418-422`) |
| Transaction History | Payments appear in client ledger | `accounting.arApDashboard.getClientStatement` |
| AR Aging | Open invoices contribute to aging | `arApDb.calculateARAging()` |

### GF-004: Invoice & Payment -> Accounting Module

| Touchpoint | Description | Implementation |
|------------|-------------|----------------|
| GL Posting | All payments create GL entries | `ledgerEntries` inserts (`payments.ts:351-383`) |
| Account Lookup | Cash and AR accounts resolved | `getAccountIdByName()` (`_core/accountLookup.ts`) |
| Fiscal Period | Posting period determined | `getFiscalPeriodIdOrDefault()` (`_core/fiscalPeriod.ts`) |

---

## Security Considerations

### Permission Requirements (VERIFIED)

| Action | Required Permission | Source |
|--------|---------------------|--------|
| View invoices | `accounting:read` | invoices.ts:103, payments.ts:119 |
| View payments | `accounting:read` | payments.ts:119, 191 |
| Record payment | `accounting:create` | payments.ts:233 |
| Record multi-invoice payment | `accounting:create` | payments.ts:642 |
| Update invoice status | `accounting:update` | invoices.ts:362 |
| Void invoice | `accounting:delete` | invoices.ts:460 |
| Void payment | `accounting:delete` | payments.ts:857 |

### Actor Attribution (VERIFIED)

All mutations use `getAuthenticatedUserId(ctx)`:
- `invoices.ts:230` - generateFromOrder
- `invoices.ts:469` - void
- `payments.ts:239` - recordPayment
- `payments.ts:671` - recordMultiInvoicePayment
- `payments.ts:868` - void

---

## Keyboard Navigation (UX Feature)

The InvoicesWorkSurface supports keyboard navigation per UXS-705:

| Key | Action | Source |
|-----|--------|--------|
| ↑/↓ | Navigate invoice list | InvoicesWorkSurface.tsx |
| Enter | Select invoice for inspector | InvoicesWorkSurface.tsx |
| Cmd+K | Quick search | InvoicesWorkSurface.tsx |

---

## Concurrent Edit Detection (UXS-705/ST-026)

Invoice updates support optimistic locking:
- `version` column on invoices table
- `checkVersion()` called before update (`invoices.ts:369-372`)
- Frontend displays warning if version mismatch detected

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
- [ ] Multi-invoice payment allocates correctly

### E2E Tests (tests-e2e/golden-flows/)

- [ ] Complete invoice viewing flow
- [ ] Complete payment recording flow (RecordPaymentDialog)
- [ ] Golden Flow payment (InvoiceToPaymentFlow)
- [ ] Multi-invoice payment flow
- [ ] Invoice void flow
- [ ] Payment void flow
- [ ] PDF generation flow

---

## Appendix: Payment Number Format

Format: `PMT-{YYYYMM}-{NNNNN}`

Example: `PMT-202601-00042`

**Source:** `payments.ts:81-98` (generatePaymentNumber function)

## Appendix: Invoice Number Format

Format: `INV-{YYYY}{MM}-{NNNNN}`

Example: `INV-202601-00001`

**Source:** `server/services/orderAccountingService.ts` (createInvoiceFromOrder)

## Appendix: GL Entry Number Formats

| Type | Format | Example |
|------|--------|---------|
| Payment | `PMT-{paymentId}-DR/CR` | `PMT-123-DR` |
| Payment Void | `PMT-REV-{paymentId}-DR/CR` | `PMT-REV-123-CR` |
