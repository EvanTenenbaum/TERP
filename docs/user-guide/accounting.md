# Accounting Features

**Module:** Accounting  
**Last Updated:** 2025-12-31

---

## Overview

The Accounting module provides comprehensive financial management including quick payment actions, chart of accounts, general ledger, invoicing, and receipt generation. This guide covers the key features implemented in the Cooper Rd Working Session Sprint.

---

## Quick Actions

### Receive Client Payment (WS-001)

Record a client cash drop-off or payment in **3 clicks or less**.

#### How to Use

1. **Access the Quick Action:**
   - From Dashboard: Click **"Receive Payment"** quick action button
   - From Client Profile: Click **"Receive Payment"** in the Actions menu

2. **Fill in the Form:**
   | Field | Description | Required |
   |-------|-------------|----------|
   | Client | Select client (auto-filled from profile) | Yes |
   | Amount | Payment amount (e.g., $40,000) | Yes |
   | Payment Type | Cash, Check, Wire, ACH | Yes |
   | Note | Optional reference or memo | No |

3. **Review & Save:**
   - Preview shows current balance and new balance after payment
   - Click **"Save & Generate Receipt"** to complete

#### Example Workflow

```
Current Tab: $50,000
Payment: $40,000 (Cash)
─────────────────────
New Balance: $10,000
```

#### Business Rules

- Payment amount must be positive
- Overpayments create a credit balance (shown as negative)
- All payments are logged with timestamp and user for audit

---

### Pay Vendor (WS-002)

Record a vendor payment (cash out) quickly.

#### How to Use

1. **Access the Quick Action:**
   - From Dashboard: Click **"Pay Vendor"** quick action button
   - From Vendor Profile: Click **"Pay Vendor"** in the Actions menu

2. **Fill in the Form:**
   | Field | Description | Required |
   |-------|-------------|----------|
   | Vendor | Select vendor | Yes |
   | Amount | Payment amount | Yes |
   | Payment Type | Cash, Check, Wire, ACH | Yes |
   | Reference | Check number or reference | No |
   | Note | Optional memo | No |

3. **Apply to Bills (Optional):**
   - Select specific bills to apply the payment
   - Or let the system auto-apply to oldest bills

4. **Save:**
   - Click **"Save Payment"** to complete
   - Receipt/confirmation is generated automatically

---

### Immediate Tab Screenshot/Receipt (WS-006)

Generate a receipt or screenshot of a client's current tab balance.

#### How to Use

1. **From Client Profile:**
   - Navigate to the client's profile
   - Click **"Generate Receipt"** or **"Tab Screenshot"**

2. **From Payment Confirmation:**
   - After recording a payment, click **"Download Receipt"**

3. **Receipt Contents:**
   - Client name and contact info
   - Current balance
   - Recent transactions
   - Date and time generated
   - QR code for verification (optional)

#### Receipt Format Options

- **PDF** - For printing or email
- **Image** - For quick sharing
- **Print** - Direct to printer

---

## Chart of Accounts

Manage your account structure for proper financial tracking.

### Account Types

| Type          | Normal Balance | Examples                             |
| ------------- | -------------- | ------------------------------------ |
| **Asset**     | Debit          | Cash, Accounts Receivable, Inventory |
| **Liability** | Credit         | Accounts Payable, Loans              |
| **Equity**    | Credit         | Owner's Equity, Retained Earnings    |
| **Revenue**   | Credit         | Sales, Service Income                |
| **Expense**   | Debit          | COGS, Wages, Rent                    |

### Managing Accounts

1. **View Accounts:**
   - Navigate to Accounting → Chart of Accounts
   - Filter by type, status, or search

2. **Create Account:**
   - Click **"+ New Account"**
   - Enter account number, name, type
   - Set parent account for sub-accounts

3. **Edit Account:**
   - Click on account row
   - Modify name, description, or status
   - Note: Account type cannot be changed after creation

---

## General Ledger

View and manage journal entries.

### Viewing Entries

1. Navigate to Accounting → General Ledger
2. Filter by:
   - Account
   - Date range
   - Fiscal period
   - Reference type (Order, Invoice, etc.)

### Creating Journal Entries

For manual adjustments:

1. Click **"+ New Entry"**
2. Select debit and credit accounts
3. Enter amount and description
4. Choose fiscal period
5. Click **"Post Entry"**

**Important:** Debits must equal credits for balanced entries.

---

## Invoices (Accounts Receivable)

### Creating an Invoice

1. Navigate to Accounting → Invoices
2. Click **"+ New Invoice"**
3. Fill in:
   - Customer
   - Invoice date and due date
   - Line items (products, quantities, prices)
   - Tax and discounts (if applicable)
4. Click **"Save as Draft"** or **"Send Invoice"**

### Invoice Statuses

| Status  | Description           |
| ------- | --------------------- |
| Draft   | Not yet sent          |
| Sent    | Delivered to customer |
| Viewed  | Customer has opened   |
| Partial | Partially paid        |
| Paid    | Fully paid            |
| Overdue | Past due date         |
| Void    | Cancelled             |

### Recording Payment Against Invoice

1. Open the invoice
2. Click **"Record Payment"**
3. Enter amount received
4. System updates invoice status automatically

---

## Bills (Accounts Payable)

### Creating a Bill

1. Navigate to Accounting → Bills
2. Click **"+ New Bill"**
3. Fill in:
   - Vendor
   - Bill date and due date
   - Line items
4. Save the bill

### Paying Bills

Use the **Pay Vendor** quick action or:

1. Open the bill
2. Click **"Record Payment"**
3. Enter payment details
4. System updates bill status

---

## Fiscal Periods

Manage accounting periods for proper financial reporting.

### Period Statuses

| Status | Description                |
| ------ | -------------------------- |
| Open   | Accepts new entries        |
| Closed | No new entries, can reopen |
| Locked | Permanently closed         |

### Managing Periods

1. Navigate to Accounting → Fiscal Periods
2. View current and past periods
3. Actions:
   - **Close Period** - Prevent new entries
   - **Lock Period** - Permanent closure
   - **Reopen Period** - Restore closed period (not locked)

---

## Reports

### Trial Balance

View account balances for a fiscal period:

1. Navigate to Accounting → Reports → Trial Balance
2. Select fiscal period
3. View debit and credit totals (should match)

### Account Balance

Check balance for any account as of a specific date:

1. Navigate to Accounting → Reports → Account Balance
2. Select account and date
3. View running balance

---

## Tips & Best Practices

1. **Use Quick Actions** for routine payments - they're faster and create proper audit trails

2. **Generate Receipts** immediately after payments for customer records

3. **Review Trial Balance** regularly to ensure books are balanced

4. **Close Periods** monthly to prevent backdated entries

5. **Use Notes** on payments for reference (check numbers, wire references)

---

## Troubleshooting

### "Cannot post to closed period"

The fiscal period is closed. Either reopen it (if not locked) or adjust the entry date.

### "Debits don't equal credits"

Journal entries must balance. Check your amounts.

### "Client not found"

Ensure the client exists and is not deleted. Use global search to verify.

---

_For technical issues, contact your system administrator._
