# Requirements Document

## Introduction

This specification addresses data completeness issues in the TERP ERP system identified through comprehensive analysis. The issues fall into two categories:

1. **Bug Fixes (2 issues)**: Actual code/data bugs causing incorrect display
   - Client Purchase History showing "Unknown Product" (missing strain/category in seeded order items)
   - Client Purchase History showing "$0.00 Average Price" (field name mismatch: `price` vs `unitPrice`)

2. **Data Gaps (10 areas)**: Expected zeros due to unseeded data or missing configuration
   - Profitability metrics (requires COGS configuration)
   - Today's sales (no sales for today's date)
   - Matchmaking opportunities (requires specific data patterns)
   - Workflow queue (batches not in process statuses)
   - Inbox notifications (none generated)
   - Draft orders (all seeded orders are confirmed)
   - Cash spent / Vendor debt (no vendor bills/payables seeded)
   - Reserved inventory (no reservations created)
   - Purchase orders (intentional gap in mock data)

## Glossary

- **Order Items JSON**: The `items` field in the orders table storing line items as JSON array
- **Purchase Pattern Analysis**: The `analyzeClientPurchaseHistory` function that aggregates client purchase behavior
- **Strain**: Cannabis strain name (e.g., "Blue Dream", "OG Kush")
- **COGS**: Cost of Goods Sold - the direct cost of producing goods sold
- **Workflow Queue**: Batches in process statuses (AWAITING_INTAKE, ON_HOLD, QUARANTINED)
- **Vendor Bills**: Accounts payable records for vendor purchases (table: `bills`)
- **Bill Line Items**: Individual items on a vendor bill (table: `billLineItems`)
- **Purchase Order**: Document sent to vendors to order products (table: `purchaseOrders`)
- **Reserved Quantity**: The `reservedQty` field on batches indicating inventory held for pending orders

## Requirements

### Requirement 1

**User Story:** As a user, I want the Client Purchase History to show actual product names, so that I can understand what products each client has purchased.

#### Acceptance Criteria

1. WHEN seeding order items THEN the system SHALL include `strain`, `category`, `subcategory`, and `grade` fields from the associated batch/product
2. WHEN the `analyzeClientPurchaseHistory` function processes order items THEN the system SHALL display the strain name or category instead of "Unknown Product"
3. WHEN a product has no strain THEN the system SHALL fall back to displaying the category name
4. WHEN neither strain nor category exists THEN the system SHALL display the product's canonical name

### Requirement 2

**User Story:** As a user, I want the Client Purchase History to show accurate average prices, so that I can understand client spending patterns.

#### Acceptance Criteria

1. WHEN seeding order items THEN the system SHALL include a `price` field that matches the `unitPrice` value
2. WHEN the `analyzeClientPurchaseHistory` function calculates average price THEN the system SHALL correctly read the price from order items
3. WHEN calculating average price THEN the system SHALL compute `SUM(price * quantity) / SUM(quantity)` for accurate weighted average

### Requirement 3

**User Story:** As a developer, I want the order items seeder to include complete product metadata, so that all downstream features work correctly.

#### Acceptance Criteria

1. WHEN generating order items THEN the seeder SHALL query the product table to get `nameCanonical`, `category`, `subcategory`
2. WHEN generating order items THEN the seeder SHALL query the batch table to get `grade`
3. WHEN generating order items THEN the seeder SHALL query the strain table (via product.strainId) to get strain name
4. WHEN the product has no strain link THEN the seeder SHALL use the product category as fallback

### Requirement 4

**User Story:** As a QA tester, I want some batches in workflow queue statuses, so that I can test the workflow queue feature.

#### Acceptance Criteria

1. WHEN seeding batches THEN the system SHALL create 10-20% of batches with status "AWAITING_INTAKE"
2. WHEN seeding batches THEN the system SHALL create 5-10% of batches with status "ON_HOLD"
3. WHEN seeding batches THEN the system SHALL create 2-5% of batches with status "QUARANTINED"
4. WHEN the workflow queue widget loads THEN the system SHALL display accurate counts per status

### Requirement 5

**User Story:** As a QA tester, I want some draft orders, so that I can test the draft orders workflow.

#### Acceptance Criteria

1. WHEN seeding orders THEN the system SHALL create 10-15% of orders with `isDraft: true`
2. WHEN seeding draft orders THEN the system SHALL set `saleStatus` to null and `quoteStatus` to "DRAFT"
3. WHEN the Orders page loads THEN the Draft Orders tab SHALL display the seeded draft orders

### Requirement 6

**User Story:** As a QA tester, I want vendor bills and payments seeded, so that I can test accounts payable features.

#### Acceptance Criteria

1. WHEN seeding is complete THEN the system SHALL have created vendor bills linked to lots via `referenceType: "LOT"` and `referenceId`
2. WHEN seeding vendor bills THEN the system SHALL create bills with various statuses (DRAFT, PENDING, APPROVED, PARTIAL, PAID, OVERDUE) matching the database enum
3. WHEN seeding vendor bills THEN the system SHALL also create corresponding `billLineItems` records with product/lot references
4. WHEN seeding vendor payments THEN the system SHALL link payments to bills and update bill `amountPaid` and `amountDue`
5. WHEN the Accounting Dashboard loads THEN the Cash Spent and Vendor Debt widgets SHALL display accurate totals

### Requirement 7

**User Story:** As a QA tester, I want purchase orders seeded, so that I can test the purchase order workflow.

#### Acceptance Criteria

1. WHEN seeding is complete THEN the system SHALL have created purchase orders linked to vendors
2. WHEN seeding purchase orders THEN the system SHALL create POs with various statuses (DRAFT, SENT, CONFIRMED, RECEIVED)
3. WHEN seeding purchase order items THEN the system SHALL link items to products with quantities and costs
4. WHEN viewing a vendor profile THEN the Purchase Orders section SHALL display the seeded POs

### Requirement 8

**User Story:** As a QA tester, I want some orders created for today's date, so that I can test the "Today" metrics on the dashboard.

#### Acceptance Criteria

1. WHEN seeding orders THEN the system SHALL create 3-5 orders with `createdAt` set to today's date
2. WHEN seeding today's orders THEN the system SHALL distribute them across different clients
3. WHEN the Transaction Snapshot widget loads THEN the "Sales Today" metric SHALL display the sum of today's orders

### Requirement 9

**User Story:** As a QA tester, I want some batches to have reserved inventory, so that I can test the reservation display.

#### Acceptance Criteria

1. WHEN seeding batches THEN the system SHALL set `reservedQty` to a non-zero value for 10-20% of LIVE batches
2. WHEN setting reservedQty THEN the system SHALL ensure `reservedQty` is less than or equal to `onHandQty`
3. WHEN the Inventory page loads THEN the Reserved column SHALL display the seeded reservation quantities

### Requirement 10

**User Story:** As a developer, I want a single command to seed all missing data types, so that the system is fully testable.

#### Acceptance Criteria

1. WHEN running `pnpm seed:new --complete` THEN the system SHALL seed all data types including bills, POs, and reservations
2. WHEN the complete seed runs THEN the system SHALL maintain referential integrity across all tables
3. WHEN the complete seed finishes THEN the system SHALL report counts for all seeded entity types
