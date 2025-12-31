# Specification: WS-006 - Immediate Tab Screenshot/Receipt Generation

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 16h  
**Module:** Accounting/Client Profile  
**Dependencies:** WS-001 (Receive Payment)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

After recording a payment or flower drop-off, staff need to immediately provide clients with proof of the transaction and their updated balance. Currently, there's no quick way to generate a professional receipt or balance statement. Users need a **one-click solution** to generate and share a tab screenshot/receipt immediately after any transaction.

## 2. User Stories

1. **As a staff member**, I want to generate a receipt immediately after recording a payment, so that I can provide proof to the client on the spot.

2. **As a staff member**, I want to send the receipt via email or text with one click, so that I don't have to manually compose messages.

3. **As a client**, I want to receive a professional-looking statement showing my payment and new balance, so that I have documentation for my records.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Generate receipt/statement immediately after transaction | Must Have |
| FR-02 | Show previous balance, transaction amount, new balance | Must Have |
| FR-03 | Include transaction details (date, type, reference) | Must Have |
| FR-04 | Download as PDF | Must Have |
| FR-05 | Send via email with one click | Must Have |
| FR-06 | Professional, branded template | Must Have |
| FR-07 | Send via SMS/text (if phone number available) | Should Have |
| FR-08 | Copy shareable link | Should Have |
| FR-09 | Print directly | Nice to Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Receipt generated only for completed transactions | Not for pending/draft |
| BR-02 | Receipt includes company branding | Logo, contact info |
| BR-03 | Receipt has unique reference number | RCP-2024-001234 |
| BR-04 | Email sent from company email address | noreply@company.com |
| BR-05 | Receipt data is point-in-time snapshot | Doesn't change if balance changes later |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- New table for receipt tracking
CREATE TABLE receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INT NOT NULL REFERENCES clients(id),
  transaction_type ENUM('PAYMENT', 'CREDIT', 'ADJUSTMENT', 'STATEMENT') NOT NULL,
  transaction_id INT, -- Reference to payment/credit/etc.
  previous_balance DECIMAL(12,2) NOT NULL,
  transaction_amount DECIMAL(12,2) NOT NULL,
  new_balance DECIMAL(12,2) NOT NULL,
  pdf_url VARCHAR(500),
  emailed_to VARCHAR(255),
  emailed_at TIMESTAMP,
  sms_sent_to VARCHAR(20),
  sms_sent_at TIMESTAMP,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_client (client_id),
  INDEX idx_receipt_number (receipt_number)
);
```

### 4.2 API Contracts

```typescript
// Generate receipt for a transaction
receipts.generate = adminProcedure
  .input(z.object({
    clientId: z.number(),
    transactionType: z.enum(['PAYMENT', 'CREDIT', 'ADJUSTMENT', 'STATEMENT']),
    transactionId: z.number().optional(),
    previousBalance: z.number(),
    transactionAmount: z.number(),
    newBalance: z.number(),
    note: z.string().optional()
  }))
  .output(z.object({
    receiptId: z.number(),
    receiptNumber: z.string(),
    pdfUrl: z.string(),
    previewHtml: z.string()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Generate unique receipt number
    // 2. Create receipt record
    // 3. Generate PDF
    // 4. Upload to storage
    // 5. Return URLs
  });

// Send receipt via email
receipts.sendEmail = adminProcedure
  .input(z.object({
    receiptId: z.number(),
    email: z.string().email(),
    customMessage: z.string().optional()
  }))
  .output(z.object({
    success: z.boolean(),
    sentAt: z.date()
  }))
  .mutation(async ({ input }) => {
    // Send email with PDF attachment
  });

// Send receipt via SMS
receipts.sendSms = adminProcedure
  .input(z.object({
    receiptId: z.number(),
    phoneNumber: z.string()
  }))
  .output(z.object({
    success: z.boolean(),
    sentAt: z.date()
  }))
  .mutation(async ({ input }) => {
    // Send SMS with link to receipt
  });

// Get shareable link
receipts.getShareableLink = adminProcedure
  .input(z.object({ receiptId: z.number() }))
  .output(z.object({
    url: z.string(),
    expiresAt: z.date().optional()
  }))
  .query(async ({ input }) => {
    // Return public URL (optionally time-limited)
  });

// Get receipt history for client
receipts.getClientHistory = adminProcedure
  .input(z.object({
    clientId: z.number(),
    limit: z.number().default(20)
  }))
  .output(z.array(z.object({
    id: z.number(),
    receiptNumber: z.string(),
    transactionType: z.string(),
    amount: z.number(),
    createdAt: z.date(),
    pdfUrl: z.string()
  })))
  .query(async ({ input }) => {
    // Return recent receipts for client
  });
```

### 4.3 PDF Template Structure

```html
<!-- Receipt Template (simplified) -->
<div class="receipt">
  <header>
    <img src="{{company_logo}}" alt="Company Logo" />
    <h1>Payment Receipt</h1>
    <p>Receipt #: {{receipt_number}}</p>
    <p>Date: {{date}}</p>
  </header>
  
  <section class="client-info">
    <h2>{{client_name}}</h2>
    <p>{{client_address}}</p>
  </section>
  
  <section class="transaction">
    <table>
      <tr>
        <td>Previous Balance:</td>
        <td class="amount">{{previous_balance}}</td>
      </tr>
      <tr>
        <td>{{transaction_type}}:</td>
        <td class="amount {{credit_class}}">{{transaction_amount}}</td>
      </tr>
      <tr class="total">
        <td>New Balance:</td>
        <td class="amount">{{new_balance}}</td>
      </tr>
    </table>
  </section>
  
  <footer>
    <p>Thank you for your business!</p>
    <p>{{company_contact}}</p>
  </footer>
</div>
```

### 4.4 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| WS-001/WS-002 | Trigger | Auto-generate after payment |
| Email Service | Write | Send receipt emails |
| SMS Service | Write | Send receipt links |
| Storage (S3) | Write | Store PDF files |
| Client Profile | Read | Get client info for receipt |

## 5. UI/UX Specification

### 5.1 User Flow

```
[Complete Transaction (WS-001/WS-002)]
    → [Success Screen with Receipt Preview]
    → [Choose Action: Download / Email / SMS / Copy Link]
    → [Action Completed]
    → [Return to Dashboard or Client Profile]
```

### 5.2 Wireframe: Post-Transaction Receipt Screen

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Payment Recorded Successfully                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    [COMPANY LOGO]                   │   │
│  │                                                     │   │
│  │              PAYMENT RECEIPT                        │   │
│  │              #RCP-2024-001234                       │   │
│  │                                                     │   │
│  │  Client: Acme Corp                                  │   │
│  │  Date: December 30, 2024                            │   │
│  │                                                     │   │
│  │  Previous Balance:     $50,000.00                   │   │
│  │  Payment Received:    -$40,000.00                   │   │
│  │  ─────────────────────────────────                  │   │
│  │  New Balance:          $10,000.00                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 📥 PDF   │ │ 📧 Email │ │ 💬 SMS   │ │ 🔗 Link  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  [Done - Return to Dashboard]                               │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Wireframe: Email Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  📧 Send Receipt via Email                             [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  To: [client@example.com_____________]                      │
│       (Pre-filled from client profile)                      │
│                                                             │
│  Message (optional):                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Thank you for your payment!                         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancel]                              [Send Receipt]       │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Acceptance Criteria (UI)

- [ ] Receipt preview renders within 1 second of transaction completion
- [ ] PDF download starts within 2 seconds of clicking
- [ ] Email dialog pre-fills client's email address
- [ ] SMS option only shown if client has phone number
- [ ] Copy link shows "Copied!" confirmation
- [ ] All actions show success/error feedback
- [ ] Receipt accessible from client profile history

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Client has no email | Email button disabled, show tooltip |
| Client has no phone | SMS button disabled, show tooltip |
| PDF generation fails | Show error, offer retry |
| Email send fails | Show error, offer retry or copy link |
| Very large balance numbers | Format with appropriate precision |
| Negative balance (credit) | Show as "Credit Balance: $X" |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Receipt number generation is unique
- [ ] PDF renders correctly with all data
- [ ] Balance calculations display correctly
- [ ] Email template renders correctly

### 7.2 Integration Tests

- [ ] PDF uploads to storage successfully
- [ ] Email sends with attachment
- [ ] SMS sends with link
- [ ] Receipt record created in database

### 7.3 E2E Tests

- [ ] Complete payment → generate receipt → download PDF
- [ ] Complete payment → send email → verify received
- [ ] View receipt history in client profile

## 8. Migration & Rollout

### 8.1 Data Migration

No migration required. New receipts table created empty.

### 8.2 Feature Flag

`FEATURE_RECEIPT_GENERATION` - Enable alongside WS-001/WS-002.

### 8.3 Rollback Plan

1. Disable feature flag
2. Receipt buttons hidden
3. Existing receipts remain accessible
4. Transactions continue without receipt generation

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Receipt generation rate | 80% of payments | Receipts / Payments ratio |
| Email send rate | 50% of receipts | Emails / Receipts ratio |
| PDF download rate | 30% of receipts | Downloads / Receipts ratio |
| Client satisfaction | Improved | Feedback |

## 10. Open Questions

- [x] Should receipts expire? **No, permanent record**
- [x] Should we support custom branding per client? **Defer, use company branding**
- [ ] Should we support batch receipt generation (monthly statements)? **Future enhancement**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
