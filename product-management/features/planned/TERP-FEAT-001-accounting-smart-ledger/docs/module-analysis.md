# TERP Accounting Module - Expert Product Manager Analysis

**Created:** November 3, 2025  
**Purpose:** Comprehensive knowledge base for the TERP Accounting Module  
**Status:** In Progress - Deep Analysis Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [API Structure](#api-structure)
5. [Business Logic](#business-logic)
6. [Frontend Components](#frontend-components)
7. [Key Features](#key-features)
8. [Design Patterns](#design-patterns)
9. [Product Roadmap Insights](#product-roadmap-insights)
10. [Technical Debt & Opportunities](#technical-debt--opportunities)

---

## Executive Summary

The TERP Accounting Module is a **production-ready, double-entry accounting system** designed specifically for the cannabis industry. It implements industry-standard accounting principles with modern web technologies.

### Core Capabilities
- **Chart of Accounts** - Hierarchical account structure with 5 account types
- **General Ledger** - Immutable double-entry bookkeeping system
- **Fiscal Period Management** - Period close and lock functionality
- **Accounts Receivable** - Customer invoicing with aging tracking
- **Accounts Payable** - Vendor bill management
- **Cash Management** - Bank accounts and transaction reconciliation
- **Expense Tracking** - Hierarchical expense categorization

### Technology Stack
- **Backend:** Node.js + Express + tRPC + Drizzle ORM
- **Frontend:** React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Database:** MySQL 8.0 (DigitalOcean Managed)
- **Deployment:** DigitalOcean App Platform (auto-deploy)

---

## System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 FRONTEND (React + tRPC)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Pages: 10 accounting pages                      │   │
│  │  - AccountingDashboard, ChartOfAccounts          │   │
│  │  - GeneralLedger, FiscalPeriods                  │   │
│  │  - Invoices, Bills, Payments                     │   │
│  │  - BankAccounts, BankTransactions, Expenses      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Components: 7 reusable components               │   │
│  │  - AccountSelector, FiscalPeriodSelector         │   │
│  │  - AmountInput, StatusBadge, AgingBadge          │   │
│  │  - JournalEntryForm                              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │ tRPC (Type-Safe RPC)
┌─────────────────────────┴───────────────────────────────┐
│                 BACKEND (tRPC Routers)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  accountingRouter (755 lines)                    │   │
│  │  - accounts, ledger, fiscalPeriods               │   │
│  │  - invoices, bills, payments                     │   │
│  │  - bankAccounts, bankTransactions, expenses      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Database Services                               │   │
│  │  - accountingDb.ts (544 lines)                   │   │
│  │  - arApDb.ts (AR/AP logic)                       │   │
│  │  - cashExpensesDb.ts (Cash & Expenses)           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │ Drizzle ORM
┌─────────────────────────┴───────────────────────────────┐
│                 DATABASE (MySQL 8.0)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  12 Accounting Tables                            │   │
│  │  - accounts, ledgerEntries, fiscalPeriods        │   │
│  │  - invoices, invoiceLineItems                    │   │
│  │  - bills, billLineItems                          │   │
│  │  - payments, bankAccounts, bankTransactions      │   │
│  │  - expenses, expenseCategories                   │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 12 Production Tables

#### 1. **accounts** - Chart of Accounts
```sql
- id (PK, auto-increment)
- accountNumber (VARCHAR 20, UNIQUE) - e.g., "1000", "2100"
- accountName (VARCHAR 255) - e.g., "Cash", "Accounts Payable"
- accountType (ENUM) - ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
- parentAccountId (FK → accounts.id) - Hierarchical structure
- isActive (BOOLEAN, default TRUE)
- normalBalance (ENUM) - DEBIT or CREDIT
- description (TEXT)
- createdAt, updatedAt (TIMESTAMP)
```

**Key Design Patterns:**
- **Hierarchical Structure:** Self-referencing foreign key for parent-child relationships
- **Account Types:** Standard 5-type classification (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
- **Normal Balance:** Determines whether increases are debits or credits
- **Soft Delete:** Uses `isActive` flag instead of hard deletes

#### 2. **ledgerEntries** - General Ledger (Immutable)
```sql
- id (PK, auto-increment)
- entryNumber (VARCHAR 50, UNIQUE) - e.g., "JE-2025-000001"
- entryDate (DATE) - Transaction date
- accountId (FK → accounts.id)
- debit (DECIMAL 12,2, default 0.00)
- credit (DECIMAL 12,2, default 0.00)
- description (TEXT)
- referenceType (VARCHAR 50) - INVOICE, BILL, PAYMENT, EXPENSE, ADJUSTMENT
- referenceId (INT) - Links to source transaction
- fiscalPeriodId (FK → fiscalPeriods.id)
- isManual (BOOLEAN, default FALSE) - Manual journal entry vs. system-generated
- isPosted (BOOLEAN, default FALSE) - Posted to GL
- postedAt (TIMESTAMP)
- postedBy (FK → users.id)
- createdBy (FK → users.id)
- createdAt, updatedAt (TIMESTAMP)
```

**Key Design Patterns:**
- **Immutable Ledger:** Once posted, entries cannot be modified (audit trail)
- **Double-Entry:** Every transaction has matching debit and credit entries
- **Entry Number:** Auto-generated unique identifier (JE-YYYY-NNNNNN)
- **Reference Tracking:** Links back to source documents (invoices, bills, etc.)
- **Posting Workflow:** Draft → Posted (with timestamp and user tracking)

#### 3. **fiscalPeriods** - Accounting Periods
```sql
- id (PK, auto-increment)
- periodName (VARCHAR 100) - e.g., "January 2025", "Q1 2025"
- startDate (DATE)
- endDate (DATE)
- fiscalYear (INT)
- status (ENUM) - OPEN, CLOSED, LOCKED
- closedAt (TIMESTAMP)
- closedBy (FK → users.id)
- createdAt, updatedAt (TIMESTAMP)
```

**Key Design Patterns:**
- **Period Close Workflow:** OPEN → CLOSED → LOCKED
- **Audit Trail:** Tracks who closed the period and when
- **Date Range:** Non-overlapping periods for financial reporting

#### 4. **invoices** - Accounts Receivable
```sql
- id (PK, auto-increment)
- invoiceNumber (VARCHAR 50, UNIQUE) - e.g., "INV-2025-00001"
- customerId (FK → clients.id)
- invoiceDate (DATE)
- dueDate (DATE)
- subtotal (DECIMAL 12,2)
- taxAmount (DECIMAL 12,2, default 0.00)
- discountAmount (DECIMAL 12,2, default 0.00)
- totalAmount (DECIMAL 12,2)
- amountPaid (DECIMAL 12,2, default 0.00)
- amountDue (DECIMAL 12,2) - Calculated: totalAmount - amountPaid
- status (ENUM) - DRAFT, SENT, PARTIAL, PAID, OVERDUE, VOID
- paymentTerms (VARCHAR 100) - e.g., "Net 30"
- notes (TEXT)
- referenceType (VARCHAR 50) - Links to source (e.g., QUOTE)
- referenceId (INT)
- createdBy (FK → users.id)
- createdAt, updatedAt (TIMESTAMP)
```

**Key Design Patterns:**
- **Status Workflow:** DRAFT → SENT → PARTIAL → PAID (or OVERDUE/VOID)
- **Amount Tracking:** Separate fields for total, paid, and due amounts
- **Aging Calculation:** Based on dueDate vs. current date
- **Line Items:** Separate table (invoiceLineItems) for detail

#### 5. **bills** - Accounts Payable
```sql
- Similar structure to invoices
- billNumber (VARCHAR 50, UNIQUE)
- vendorId (FK → vendors.id)
- status (ENUM) - DRAFT, RECEIVED, PARTIAL, PAID, OVERDUE, VOID
```

**Key Design Patterns:**
- **Mirror of Invoices:** Same structure for consistency
- **Vendor vs. Customer:** Different foreign key relationship

#### 6. **payments** - Unified Payment Tracking
```sql
- id (PK, auto-increment)
- paymentNumber (VARCHAR 50, UNIQUE) - e.g., "PAY-2025-00001"
- paymentType (ENUM) - RECEIVED (AR), SENT (AP)
- paymentDate (DATE)
- amount (DECIMAL 12,2)
- paymentMethod (ENUM) - CASH, CHECK, WIRE, ACH, CREDIT_CARD, DEBIT_CARD, OTHER
- referenceNumber (VARCHAR 100) - Check number, wire confirmation, etc.
- bankAccountId (FK → bankAccounts.id)
- notes (TEXT)
- createdBy (FK → users.id)
- createdAt, updatedAt (TIMESTAMP)
```

**Key Design Patterns:**
- **Unified Table:** Both AR and AP payments in one table (differentiated by paymentType)
- **Payment Methods:** Comprehensive enum for all payment types
- **Bank Account Linking:** Tracks which bank account received/sent the payment

#### 7. **bankAccounts** - Bank Account Management
```sql
- id (PK, auto-increment)
- accountName (VARCHAR 255) - e.g., "Operating Account - Chase"
- accountNumber (VARCHAR 50) - Last 4 digits for security
- bankName (VARCHAR 255)
- accountType (ENUM) - CHECKING, SAVINGS, MONEY_MARKET, CREDIT_CARD
- currency (VARCHAR 3, default 'USD')
- currentBalance (DECIMAL 12,2, default 0.00)
- isActive (BOOLEAN, default TRUE)
- ledgerAccountId (FK → accounts.id) - Links to Chart of Accounts
- createdAt, updatedAt (TIMESTAMP)
```

**Key Design Patterns:**
- **GL Integration:** Links to Chart of Accounts for reconciliation
- **Balance Tracking:** Current balance updated with transactions
- **Multi-Currency:** Supports different currencies (default USD)

#### 8. **bankTransactions** - Bank Transaction Records
```sql
- id (PK, auto-increment)
- bankAccountId (FK → bankAccounts.id)
- transactionDate (DATE)
- transactionType (ENUM) - DEPOSIT, WITHDRAWAL, TRANSFER, FEE, INTEREST
- amount (DECIMAL 12,2)
- description (TEXT)
- referenceNumber (VARCHAR 100)
- paymentId (FK → payments.id) - Links to payment if applicable
- isReconciled (BOOLEAN, default FALSE)
- reconciledAt (TIMESTAMP)
- createdAt, updatedAt (TIMESTAMP)
```

**Key Design Patterns:**
- **Reconciliation Workflow:** Unreconciled → Reconciled (with timestamp)
- **Payment Linking:** Optional link to payments table
- **Transaction Types:** Comprehensive enum for all bank transaction types

#### 9. **expenses** - Expense Tracking
```sql
- id (PK, auto-increment)
- expenseNumber (VARCHAR 50, UNIQUE) - e.g., "EXP-2025-00001"
- expenseDate (DATE)
- categoryId (FK → expenseCategories.id)
- vendorId (FK → vendors.id) - Optional
- amount (DECIMAL 12,2)
- taxAmount (DECIMAL 12,2, default 0.00)
- totalAmount (DECIMAL 12,2)
- paymentMethod (ENUM) - CASH, CHECK, CREDIT_CARD, DEBIT_CARD
- receiptUrl (VARCHAR 500) - Link to receipt image/PDF
- description (TEXT)
- notes (TEXT)
- status (ENUM) - DRAFT, SUBMITTED, APPROVED, PAID, REJECTED
- approvedBy (FK → users.id)
- approvedAt (TIMESTAMP)
- createdBy (FK → users.id)
- createdAt, updatedAt (TIMESTAMP)
```

**Key Design Patterns:**
- **Approval Workflow:** DRAFT → SUBMITTED → APPROVED → PAID (or REJECTED)
- **Receipt Attachment:** URL to uploaded receipt
- **Category Hierarchy:** Links to hierarchical expense categories

#### 10. **expenseCategories** - Expense Categorization
```sql
- id (PK, auto-increment)
- categoryName (VARCHAR 255) - e.g., "Office Supplies", "Travel"
- parentCategoryId (FK → expenseCategories.id) - Hierarchical
- ledgerAccountId (FK → accounts.id) - Links to Chart of Accounts
- isActive (BOOLEAN, default TRUE)
- createdAt, updatedAt (TIMESTAMP)
```

**Key Design Patterns:**
- **Hierarchical Structure:** Self-referencing for parent-child relationships
- **GL Mapping:** Each category maps to a GL account

---

## API Structure

### tRPC Router Organization

The accounting module uses **nested routers** for logical organization:

```typescript
accountingRouter
├── accounts (Chart of Accounts)
│   ├── list (query)
│   ├── getById (query)
│   ├── getByNumber (query)
│   ├── create (mutation)
│   ├── update (mutation)
│   ├── getBalance (query)
│   └── getChartOfAccounts (query)
├── ledger (General Ledger)
│   ├── list (query)
│   ├── getById (query)
│   ├── create (mutation)
│   ├── postJournalEntry (mutation)
│   └── getTrialBalance (query)
├── fiscalPeriods
│   ├── list (query)
│   ├── getById (query)
│   ├── getCurrent (query)
│   ├── create (mutation)
│   ├── close (mutation)
│   ├── lock (mutation)
│   └── reopen (mutation)
├── invoices (AR)
│   ├── list (query)
│   ├── getById (query)
│   ├── create (mutation)
│   ├── update (mutation)
│   ├── updateStatus (mutation)
│   ├── recordPayment (mutation)
│   └── getOutstandingReceivables (query)
├── bills (AP)
│   ├── [similar structure to invoices]
├── payments
│   ├── list (query)
│   ├── getById (query)
│   ├── create (mutation)
│   └── allocateToInvoice/Bill (mutation)
├── bankAccounts
│   ├── list (query)
│   ├── getById (query)
│   ├── create (mutation)
│   └── update (mutation)
├── bankTransactions
│   ├── list (query)
│   ├── create (mutation)
│   └── reconcile (mutation)
└── expenses
    ├── list (query)
    ├── getById (query)
    ├── create (mutation)
    ├── update (mutation)
    └── approve/reject (mutation)
```

---

## Business Logic

### Double-Entry Accounting Implementation

**Core Principle:** Every transaction has equal debits and credits.

#### Example: Journal Entry Posting

```typescript
// From accountingDb.ts - postJournalEntry()
export async function postJournalEntry(params: {
  entryDate: Date;
  debitAccountId: number;
  creditAccountId: number;
  amount: number;
  description: string;
  fiscalPeriodId: number;
  referenceType?: string;
  referenceId?: number;
  createdBy: number;
}) {
  const db = await getDb();
  
  // Use transaction to ensure atomicity
  return await db.transaction(async (tx) => {
    // Generate unique entry number
    const entryNumber = await generateEntryNumber(); // e.g., "JE-2025-000001"
    
    // Create debit entry
    await tx.insert(ledgerEntries).values({
      entryNumber,
      entryDate: params.entryDate,
      accountId: params.debitAccountId,
      debit: params.amount.toFixed(2),
      credit: "0.00",
      description: params.description,
      fiscalPeriodId: params.fiscalPeriodId,
      isManual: true,
      isPosted: true,
      postedAt: new Date(),
      postedBy: params.createdBy,
    });
    
    // Create credit entry
    await tx.insert(ledgerEntries).values({
      entryNumber,
      entryDate: params.entryDate,
      accountId: params.creditAccountId,
      debit: "0.00",
      credit: params.amount.toFixed(2),
      description: params.description,
      fiscalPeriodId: params.fiscalPeriodId,
      isManual: true,
      isPosted: true,
      postedAt: new Date(),
      postedBy: params.createdBy,
    });
    
    return entryNumber;
  });
}
```

**Key Insights:**
- **Database Transactions:** Ensures both debit and credit are created atomically
- **Entry Number Generation:** Auto-incremented with year prefix
- **Immutability:** Once posted (isPosted = true), entries cannot be modified
- **Audit Trail:** Tracks who posted and when

---

## Analysis Status

✅ **Completed:**
- Database schema analysis (12 tables)
- API structure mapping (tRPC routers)
- Core business logic review (double-entry accounting)

🔄 **In Progress:**
- Frontend component analysis
- Design patterns documentation
- Product roadmap insights

⏳ **Next Steps:**
- Complete frontend analysis
- Research industry best practices
- Create comprehensive product recommendations



## 2. TERP Accounting Module Overview

The TERP accounting module is a comprehensive, double-entry accounting system designed to provide robust financial management capabilities within the TERP ERP platform. The module is built on a modern technology stack, utilizing a PostgreSQL database, a tRPC API layer, and a React-based frontend with TypeScript. The module is composed of ten distinct pages, each addressing a specific accounting function.

### 2.1. Core Accounting

*   **Accounting Dashboard**: Provides a high-level overview of the company's financial health, including key metrics such as cash, accounts receivable, accounts payable, and net position. It also features AR/AP aging reports, an expense breakdown by category, and a feed of recent activity.
*   **Chart of Accounts**: A hierarchical listing of all financial accounts, categorized into assets, liabilities, equity, revenue, and expenses. Users can create, edit, and manage accounts, view their balances, and set their status as active or inactive.
*   **General Ledger**: The central repository for all financial transactions, presenting a detailed log of journal entries. It supports the creation of new journal entries with double-entry validation (debits must equal credits) and provides a trial balance view.
*   **Fiscal Periods**: Enables the management of accounting periods, allowing users to define quarterly or annual periods, and to open, close, or lock them to ensure financial data integrity.

### 2.2. Accounts Receivable (AR)

*   **Invoices**: This section manages all customer invoices, tracking their status from draft to paid. It includes an AR aging report to monitor outstanding receivables and allows for the creation and editing of invoices with detailed line items.

### 2.3. Accounts Payable (AP)

*   **Bills**: Manages all vendor bills, tracking their status from draft to paid. It includes an AP aging report to monitor outstanding payables and allows for the creation and editing of bills with detailed line items.
*   **Payments**: A unified view of all incoming and outgoing payments, categorized as either received (AR) or sent (AP). It supports various payment methods and links each payment to its corresponding invoice or bill.

### 2.4. Cash & Expenses

*   **Bank Accounts**: A centralized list of all bank accounts, including checking, savings, and credit card accounts. It provides a consolidated view of the company's total cash balance.
*   **Bank Transactions**: A detailed log of all transactions for each bank account, providing a clear audit trail of all cash movements.
*   **Expenses**: This section allows for the tracking and categorization of all business expenses, providing insights into spending patterns and helping to manage costs effectively.


## 3. Frontend Components

The accounting module's frontend is built with a set of reusable React components that ensure a consistent user experience and streamline development. These components are located in `/home/ubuntu/TERP/client/src/components/accounting/` and are built using `shadcn/ui` and `Tailwind CSS`.

### 3.1. AccountSelector.tsx

This component provides a dropdown menu for selecting accounts from the chart of accounts. It fetches the account list from the API and can be filtered by account type. The accounts are displayed hierarchically, with sub-accounts indented for clarity. It also includes a loading state to provide feedback to the user while the data is being fetched.

### 3.2. AgingBadge.tsx

This component displays a color-coded badge that indicates the aging bucket of an invoice or bill (e.g., "Current", "30 Days", "60 Days"). The color of the badge changes based on the severity of the aging, providing a quick visual cue to the user. It can also optionally display the amount associated with the aging bucket.

### 3.3. AmountInput.tsx

This is a specialized input component for currency values. It automatically formats the input as currency (e.g., adding dollar signs and commas) and handles decimal precision. It also includes validation to ensure that only numeric values are entered.


## 4. Key Features

The TERP accounting module provides a rich set of features that are essential for effective financial management. These features are designed to be intuitive, efficient, and compliant with accounting standards.

### 4.1. Double-Entry Bookkeeping

The entire module is built on the principle of double-entry bookkeeping, ensuring that every financial transaction is recorded with equal debits and credits. This maintains the integrity of the financial data and provides a clear audit trail.

### 4.2. Accounts Receivable and Payable Management

The module includes dedicated sections for managing accounts receivable (AR) and accounts payable (AP). Users can create and track invoices and bills, monitor their status, and record payments. The aging reports provide a clear overview of outstanding receivables and payables, helping to manage cash flow effectively.

### 4.3. Financial Reporting

The module provides a range of financial reports, including a trial balance, AR/AP aging reports, and an expense breakdown by category. These reports provide valuable insights into the company's financial performance and help to support decision-making.

### 4.4. Bank Reconciliation

The module allows users to connect their bank accounts and reconcile their bank transactions with the transactions recorded in the system. This helps to ensure the accuracy of the financial records and to identify any discrepancies in a timely manner.


## 5. Design Patterns

The TERP accounting module leverages several key design patterns to ensure a robust, scalable, and maintainable system.

### 5.1. Hierarchical Data Structures

The Chart of Accounts and Expense Categories both utilize a hierarchical data structure, implemented through a self-referencing foreign key (`parentAccountId` and `parentCategoryId`). This allows for a flexible and intuitive organization of accounts and categories, with unlimited levels of nesting.

### 5.2. Immutable Ledger

The `ledgerEntries` table is designed to be immutable, meaning that once a transaction is posted, it cannot be altered. This is a critical design pattern for accounting systems, as it ensures a complete and tamper-proof audit trail. Any corrections are made through new, reversing journal entries.

### 5.3. Status-Based Workflows

Invoices, bills, and expenses all follow a status-based workflow (e.g., `DRAFT` -> `SENT` -> `PAID`). This provides a clear and consistent way to track the lifecycle of a transaction and to trigger different actions based on its status.

### 5.4. Unified Payment Tracking

Both Accounts Receivable and Accounts Payable payments are managed in a single `payments` table. This unified approach simplifies the process of tracking all cash movements and provides a consolidated view of all payment activity.


## 6. Product Roadmap Insights

Based on the comprehensive analysis of the TERP accounting module and the broader ERP landscape, several key opportunities for future development have been identified. These insights can inform the product roadmap and help to prioritize future features.

### 6.1. Advanced Financial Reporting

While the current module provides essential financial reports, there is a significant opportunity to expand the reporting capabilities. This could include:

*   **Profit and Loss Statement (P&L)**: A standard financial statement that summarizes the revenues, costs, and expenses incurred during a specified period.
*   **Balance Sheet**: A statement of the assets, liabilities, and capital of a business or other organization at a particular point in time, detailing the balance of income and expenditure over the preceding period.
*   **Cash Flow Statement**: A financial statement that shows how changes in balance sheet accounts and income affect cash and cash equivalents, and breaks the analysis down to operating, investing, and financing activities.
*   **Customizable Reports**: The ability for users to create their own reports by selecting different accounts, time periods, and other parameters.

### 6.2. Budgeting and Forecasting

Integrating budgeting and forecasting tools would provide significant value to users. This could include:

*   **Budget Creation**: The ability to create budgets for different departments, projects, or the entire organization.
*   **Budget vs. Actuals Reporting**: Reports that compare actual financial performance to the budgeted amounts, helping to identify variances and to manage costs more effectively.
*   **Forecasting**: Tools that use historical data and other inputs to forecast future financial performance.

### 6.3. Multi-Currency Support

As the business expands, there may be a need to handle transactions in multiple currencies. This would require:

*   **Currency Exchange Rates**: The ability to define and manage currency exchange rates.
*   **Multi-Currency Transactions**: The ability to record transactions in different currencies and to automatically convert them to the base currency.
*   **Reporting in Multiple Currencies**: The ability to generate financial reports in different currencies.
