# Requirements Document

## Introduction

This specification addresses systematic data display issues in the TERP ERP system where seeded data exists in the database but fails to display correctly on the frontend. Through rigorous analysis, the following root causes have been verified:

1. **API Response Structure Mismatch**: APIs return `{ invoices: [], total: 0 }` but frontend checks `Array.isArray(response)` which fails because the response is an object
2. **Missing Seeded Data Relationships**: Orders are seeded but `clientTransactions` are NOT created, causing client stats to show $0
3. **Hardcoded Placeholder Values**: VendorProfilePage has hardcoded "0" values and doesn't query actual data
4. **Schema/API Validation Mismatch**: Invoice status "VIEWED" exists in database schema but is missing from API Zod validation

## Glossary

- **API Response Structure**: The shape of data returned by tRPC endpoints (e.g., `{ invoices: [], total: 0 }` vs direct array)
- **Forward Relationship**: Query from entity to its reference (e.g., Order → Client)
- **Reverse Relationship**: Query from reference to entities (e.g., Client → Orders)
- **Client Transaction**: A record in `clientTransactions` table that tracks financial interactions with clients
- **Seeding System**: The modular database seeding infrastructure in `scripts/seed/`
- **Dashboard Widget**: A UI component on the dashboard that displays aggregated data
- **Lot**: An intake record that links batches to vendors via `lots.vendorId`

## Requirements

### Requirement 1

**User Story:** As a user, I want the Invoices page to display all invoices correctly, so that I can manage accounts receivable.

#### Acceptance Criteria

1. WHEN the `accounting.invoices.list` API returns `{ invoices: [], total: 0 }` THEN the frontend SHALL extract the `invoices` array property using `response.invoices` or `response?.invoices || []`
2. WHEN invoices exist in the database THEN the Invoices page SHALL display all invoices with correct counts
3. WHEN filtering by status "VIEWED" THEN the API SHALL accept this status value (currently missing from Zod schema)
4. WHEN the AR aging calculation returns data THEN the invoice list SHALL also display data from the same source

### Requirement 2

**User Story:** As a user, I want the Bills page to display all bills correctly, so that I can manage accounts payable.

#### Acceptance Criteria

1. WHEN the `accounting.bills.list` API returns `{ bills: [], total: 0 }` THEN the frontend SHALL extract the `bills` array property using `response.bills` or `response?.bills || []`
2. WHEN bills exist in the database THEN the Bills page SHALL display all bills with correct counts
3. WHEN filtering by status THEN the system SHALL return only bills matching that status

### Requirement 3

**User Story:** As a user, I want the Payments page to display all payments correctly, so that I can track payment history.

#### Acceptance Criteria

1. WHEN the `accounting.payments.list` API returns `{ payments: [], total: 0 }` THEN the frontend SHALL extract the `payments` array property using `response.payments` or `response?.payments || []`
2. WHEN payments exist in the database THEN the Payments page SHALL display all payments with correct counts

### Requirement 4

**User Story:** As a user, I want the Expenses page to display all expenses correctly, so that I can track business expenses.

#### Acceptance Criteria

1. WHEN the `accounting.expenses.list` API returns `{ expenses: [], total: 0 }` THEN the frontend SHALL extract the `expenses` array property using `response.expenses` or `response?.expenses || []`
2. WHEN expenses exist in the database THEN the Expenses page SHALL display all expenses with correct counts

### Requirement 5

**User Story:** As a user, I want the Accounting Dashboard to display correct totals and recent items, so that I can see financial overview.

#### Acceptance Criteria

1. WHEN the dashboard queries invoices THEN the system SHALL extract the array using `response.invoices` instead of checking `Array.isArray(response)`
2. WHEN the dashboard queries bills THEN the system SHALL extract the array using `response.bills` instead of checking `Array.isArray(response)`
3. WHEN the dashboard queries outstanding receivables THEN the system SHALL extract the array using `response.invoices` (returns `{ total, invoices }`)
4. WHEN the dashboard queries outstanding payables THEN the system SHALL extract the array using `response.bills` (returns `{ total, bills }`)

### Requirement 6

**User Story:** As a user, I want client profiles to show accurate financial statistics, so that I can understand client value.

#### Acceptance Criteria

1. WHEN orders are seeded for a client THEN the seeding system SHALL also create corresponding `clientTransactions` records with matching amounts
2. WHEN viewing a client profile THEN the Total Spent field SHALL reflect the sum of client transactions (calculated via `updateClientStats`)
3. WHEN viewing a client profile THEN the Amount Owed field SHALL reflect unpaid transaction amounts
4. WHEN seeding completes THEN the system SHALL call `updateClientStats` for each client with transactions

### Requirement 7

**User Story:** As a user, I want vendor profiles to show products and batches supplied, so that I can track vendor relationships.

#### Acceptance Criteria

1. WHEN viewing a vendor profile THEN the system SHALL query batches via the lots table relationship (batches.lotId → lots.vendorId)
2. WHEN viewing a vendor profile THEN the Products Supplied count SHALL reflect actual count from the query
3. WHEN viewing a vendor profile THEN the Total Purchase Orders count SHALL query actual purchase orders for that vendor
4. WHEN no data exists THEN the vendor profile SHALL display "0" with appropriate empty state messaging

### Requirement 8

**User Story:** As a user, I want dashboard widgets to display real data, so that I can monitor business metrics.

#### Acceptance Criteria

1. WHEN the Transaction Snapshot widget loads THEN the system SHALL display sales, cash collected, and units sold from invoices and payments (backend correctly extracts `.invoices` and `.payments`)
2. WHEN the Cash Flow widget loads THEN the system SHALL display actual cash flow data
3. IF no data exists THEN the widgets SHALL display appropriate empty states with "0" values, not infinite loading

### Requirement 9

**User Story:** As a developer, I want the seeding system to create complete data relationships, so that all features work correctly.

#### Acceptance Criteria

1. WHEN seeding orders THEN the system SHALL also create corresponding `clientTransactions` records with type "ORDER" and matching amounts
2. WHEN seeding invoices THEN the system SHALL link them to orders via `referenceType: "ORDER"` and `referenceId: orderId`
3. WHEN seeding payments THEN the system SHALL link them to invoices via `invoiceId` and update invoice `amountPaid` and `status`
4. WHEN seeding completes THEN the system SHALL recalculate client stats for all affected clients

### Requirement 10

**User Story:** As a developer, I want consistent API response handling, so that frontend components work reliably.

#### Acceptance Criteria

1. WHEN an API returns paginated data THEN the response structure SHALL consistently be `{ [entityName]: [], total: number }` (e.g., `{ invoices: [], total: 0 }`)
2. WHEN the frontend receives paginated responses THEN the system SHALL extract the items array using the entity name property, not `Array.isArray()` check
3. WHEN the API Zod schema defines allowed values THEN the schema SHALL match the database enum values (add "VIEWED" to invoice status)

