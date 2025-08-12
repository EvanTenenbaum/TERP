# ERPv2 System Context Documentation

**Version:** 1.0  
**Last Updated:** August 12, 2025  
**Author:** Manus AI  

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Model](#data-model)
3. [Core Business Flows](#core-business-flows)
4. [Reporting & Analytics](#reporting--analytics)
5. [Security & Access Control](#security--access-control)
6. [Technical Architecture](#technical-architecture)
7. [Business Rules & Constraints](#business-rules--constraints)

---

## System Overview

ERPv2 is a comprehensive Enterprise Resource Planning system designed specifically for online-only operations. The system does not support offline functionality or Progressive Web App (PWA) capabilities, ensuring all operations require active internet connectivity and real-time data synchronization.

### Core Capabilities

The system provides integrated management of inventory, sales, purchasing, customer relationships, and financial operations. Key functional areas include:

- **Inventory Management**: Real-time tracking of products, batches, and stock levels with comprehensive cost accounting
- **Sales Operations**: Quote generation, order processing, and customer relationship management
- **Purchasing & Vendor Management**: Purchase order creation, vendor relationship tracking, and accounts payable
- **Financial Management**: Accounts receivable, payment processing, debt adjustments, and financial reporting
- **Sample Management**: Specialized workflows for sample inventory without revenue recognition
- **Document Management**: Intake photo handling and PDF generation for quotes and purchase orders

### Technology Stack

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript for type safety and developer experience
- **Database**: PostgreSQL for robust data persistence
- **ORM**: Prisma for type-safe database operations
- **Authentication**: Role-based access control (RBAC) with server-side enforcement

---

## Data Model

### Core Entities

#### Product
The Product entity represents items available for sale or internal use. Each product maintains essential information including pricing, categorization, and inventory tracking capabilities.

**Key Fields:**
- `id`: Unique identifier
- `name`: Product display name
- `category`: Product categorization for reporting and filtering
- `defaultPrice`: Base price used when no PriceBook entry exists
- `isActive`: Status flag for product availability

#### Vendor
Vendors represent suppliers and business partners. The system implements a unique vendor code masking system for security and operational purposes.

**Key Fields:**
- `id`: Unique identifier
- `vendorCode`: Unique alphanumeric code (displayed in most contexts)
- `companyName`: Real company name (only visible in vendor profile)
- `contactInfo`: Communication details
- `isActive`: Vendor status

**Critical Rule**: VendorCode must be displayed everywhere except the vendor profile page. Real company names are masked in all exports, reports, and general system views.

#### Customer
Customer entities manage client relationships and purchasing history.

**Key Fields:**
- `id`: Unique identifier
- `companyName`: Customer company name
- `contactInfo`: Primary contact information
- `creditLimit`: Maximum outstanding balance allowed
- `paymentTerms`: Default payment terms for orders

#### Batch & BatchCost
The Batch system tracks inventory lots with associated cost information. BatchCost entries maintain historical cost data with effective date tracking.

**Batch Fields:**
- `id`: Unique identifier
- `productId`: Reference to Product
- `vendorId`: Source vendor
- `lotNumber`: Vendor-provided lot identifier
- `receivedDate`: Date inventory was received
- `expirationDate`: Product expiration (if applicable)
- `quantityReceived`: Initial quantity
- `quantityAvailable`: Current available quantity

**BatchCost Fields:**
- `id`: Unique identifier
- `batchId`: Reference to Batch
- `effectiveFrom`: Date when cost becomes active
- `unitCost`: Cost per unit (stored as integer, representing cents)

**Critical Rule**: COGS (Cost of Goods Sold) is calculated using the BatchCost that was active at the allocationDate for each OrderItem.

#### InventoryLot
Tracks current inventory positions and movements.

**Key Fields:**
- `id`: Unique identifier
- `batchId`: Reference to Batch
- `quantityOnHand`: Current physical quantity
- `quantityAllocated`: Quantity reserved for orders
- `quantityAvailable`: Calculated available quantity
- `lastMovementDate`: Most recent inventory transaction

#### Order & OrderItem
Orders represent customer purchase transactions with detailed line items.

**Order Fields:**
- `id`: Unique identifier
- `customerId`: Reference to Customer
- `orderDate`: Order creation date
- `allocationDate`: Date when inventory was allocated
- `status`: Order processing status
- `totalAmount`: Total order value (integer, cents)

**OrderItem Fields:**
- `id`: Unique identifier
- `orderId`: Reference to Order
- `productId`: Reference to Product
- `batchId`: Allocated inventory batch
- `quantity`: Ordered quantity
- `unitPrice`: Price per unit (integer, cents)
- `allocationDate`: Date inventory was allocated for this item

**Critical Rule**: The allocationDate on OrderItem determines which BatchCost is used for COGS calculation.

#### Accounts Receivable (AR) & Payment System
Manages customer invoicing and payment processing with FIFO application.

**AR Fields:**
- `id`: Unique identifier
- `customerId`: Reference to Customer
- `orderId`: Reference to originating Order
- `invoiceNumber`: Unique invoice identifier
- `invoiceDate`: Invoice creation date
- `dueDate`: Payment due date
- `amount`: Invoice amount (integer, cents)
- `balanceRemaining`: Outstanding balance (integer, cents)

**Payment Fields:**
- `id`: Unique identifier
- `customerId`: Reference to Customer
- `paymentDate`: Date payment received
- `amount`: Payment amount (integer, cents)
- `paymentMethod`: Method of payment
- `referenceNumber`: External payment reference

**PaymentApplication Fields:**
- `id`: Unique identifier
- `paymentId`: Reference to Payment
- `arId`: Reference to AR record
- `appliedAmount`: Amount applied to this AR (integer, cents)
- `applicationDate`: Date of application

**Critical Rule**: Payment applications follow FIFO (First In, First Out) methodology, applying payments to the oldest outstanding AR records first.

#### Accounts Payable (AP)
Manages vendor invoices and payment obligations.

**Key Fields:**
- `id`: Unique identifier
- `vendorId`: Reference to Vendor
- `invoiceNumber`: Vendor invoice number
- `invoiceDate`: Invoice date from vendor
- `dueDate`: Payment due date
- `amount`: Invoice amount (integer, cents)
- `balanceRemaining`: Outstanding balance (integer, cents)

#### CRM Notes
Maintains communication history and customer interaction records.

**Key Fields:**
- `id`: Unique identifier
- `customerId`: Reference to Customer (optional)
- `vendorId`: Reference to Vendor (optional)
- `noteDate`: Date note was created
- `noteType`: Category of note (call, email, meeting, etc.)
- `content`: Note content
- `createdBy`: User who created the note

#### SalesQuote & SalesQuoteItem
Manages customer quotations with tokenized sharing capabilities.

**SalesQuote Fields:**
- `id`: Unique identifier
- `customerId`: Reference to Customer
- `quoteNumber`: Unique quote identifier
- `quoteDate`: Quote creation date
- `expirationDate`: Quote validity period
- `status`: Quote status (draft, sent, accepted, expired)
- `shareToken`: Unique token for external sharing
- `totalAmount`: Total quote value (integer, cents)

**SalesQuoteItem Fields:**
- `id`: Unique identifier
- `quoteId`: Reference to SalesQuote
- `productId`: Reference to Product
- `quantity`: Quoted quantity
- `unitPrice`: Price per unit (integer, cents)
- `lineTotal`: Line item total (integer, cents)

**Critical Rule**: When converting a quote to an order, the system must re-validate both pricing and stock availability before order creation.

#### PriceBook & PriceBookEntry
Manages tiered pricing structures with precedence rules.

**PriceBook Fields:**
- `id`: Unique identifier
- `name`: PriceBook name
- `type`: PriceBook type (customer, role, global)
- `customerId`: Reference to Customer (for customer-specific pricing)
- `roleId`: Reference to Role (for role-based pricing)
- `isActive`: PriceBook status
- `effectiveDate`: Date pricing becomes active
- `expirationDate`: Date pricing expires

**PriceBookEntry Fields:**
- `id`: Unique identifier
- `priceBookId`: Reference to PriceBook
- `productId`: Reference to Product
- `unitPrice`: Price per unit (integer, cents)
- `minimumQuantity`: Minimum quantity for price tier
- `effectiveDate`: Date price becomes active

**Critical Rule**: Price precedence follows this hierarchy:
1. Customer-specific PriceBook
2. Role-based PriceBook
3. Global PriceBook
4. Product default price

#### DebtAdjustment
Manages customer account adjustments with notes-only documentation.

**Key Fields:**
- `id`: Unique identifier
- `customerId`: Reference to Customer
- `adjustmentDate`: Date adjustment was made
- `amount`: Adjustment amount (integer, cents, positive for charges, negative for credits)
- `notes`: Free-form notes explaining the adjustment
- `createdBy`: User who created the adjustment
- `reversedBy`: Reference to counter-entry if reversed

**Critical Rule**: DebtAdjustments use notes only for documentation. No reason codes are implemented. Adjustments are reversible through counter-entries.

#### SampleTransaction
Manages sample inventory movements without revenue recognition.

**Key Fields:**
- `id`: Unique identifier
- `productId`: Reference to Product
- `batchId`: Reference to Batch (for vendor_in transactions)
- `customerId`: Reference to Customer (for client transactions)
- `vendorId`: Reference to Vendor (for vendor transactions)
- `transactionType`: Type of sample transaction
- `quantity`: Transaction quantity
- `unitCostSnapshot`: Cost per unit at transaction time (integer, cents)
- `transactionDate`: Date of transaction
- `notes`: Transaction notes

**Transaction Types:**
- `vendor_in`: Samples received from vendor
- `client_out`: Samples sent to client
- `client_return`: Samples returned by client
- `vendor_return`: Samples returned to vendor

**Critical Rule**: Sample transactions move inventory without generating revenue. Returns restore stock levels.

#### IntakePhoto
Manages photo uploads for various system entities.

**Key Fields:**
- `id`: Unique identifier
- `parentType`: Type of parent entity (order, product, batch, etc.)
- `parentId`: ID of parent entity
- `fileName`: Original file name
- `filePath`: Storage path
- `fileSize`: File size in bytes
- `mimeType`: File MIME type (JPEG/WEBP only)
- `uploadDate`: Date photo was uploaded
- `uploadedBy`: User who uploaded the photo

**Critical Rules:**
- Maximum 4 photos per parent entity
- Only JPEG and WEBP formats accepted
- Files compressed to approximately 1.5MB or less
- Supports direct upload from iPhone/Android devices
- Online-only functionality (no offline photo handling)

---

## Core Business Flows

### Cost of Goods Sold (COGS) Calculation

The COGS calculation is fundamental to accurate financial reporting and profitability analysis. The system implements a date-based cost allocation method that ensures historical accuracy and audit compliance.

When an OrderItem is created, the system captures the allocationDate, which represents the moment inventory was committed to fulfill the order. This date is critical because it determines which BatchCost record is used for COGS calculation.

The COGS calculation process follows these steps:

1. **Allocation Date Capture**: When inventory is allocated to an order, the current date is recorded as the allocationDate on the OrderItem.

2. **BatchCost Lookup**: The system queries BatchCost records for the allocated Batch, finding the record with the latest effectiveFrom date that is less than or equal to the allocationDate.

3. **Cost Application**: The unitCost from the identified BatchCost record is multiplied by the OrderItem quantity to determine the total COGS for that line item.

4. **Historical Integrity**: Once set, the COGS calculation remains fixed, ensuring that subsequent cost changes do not affect previously allocated inventory.

This approach ensures that COGS reflects the actual cost basis at the time of sale, providing accurate margin analysis and financial reporting.

### Price Precedence System

The pricing system implements a hierarchical precedence structure that allows for flexible pricing strategies while maintaining clear business rules. The system evaluates pricing in the following order:

**Customer-Specific PriceBook**: The highest priority pricing comes from PriceBooks specifically assigned to individual customers. These prices override all other pricing structures and are typically used for negotiated rates, volume discounts, or special customer relationships.

**Role-Based PriceBook**: When no customer-specific pricing exists, the system checks for pricing based on the customer's assigned role or customer type. This allows for tiered pricing strategies such as wholesale vs. retail pricing, or different rates for different customer categories.

**Global PriceBook**: Global pricing serves as the standard pricing structure that applies to all customers unless overridden by more specific pricing rules. This typically represents the standard retail or list pricing.

**Product Default Price**: As the final fallback, the system uses the default price stored directly on the Product record. This ensures that every product always has a price available, even if no PriceBook entries exist.

The system evaluates these pricing sources in real-time during quote generation and order processing, ensuring that customers always receive the most favorable pricing they are entitled to receive.

### Search to Order Workflow

The customer purchasing process follows a structured workflow that ensures data integrity and business rule compliance:

**Search Phase**: Customers begin by searching the product catalog using various criteria such as product name, category, or specifications. The search results display available products with appropriate pricing based on the customer's pricing tier.

**Cart Management**: Selected products are added to a shopping cart where quantities can be adjusted and preliminary pricing is calculated. The cart maintains session state and can be saved for future reference.

**Quote Generation**: Cart contents can be converted to a formal sales quote, which captures pricing and availability at a specific point in time. Quotes include expiration dates and unique share tokens for external distribution.

**Quote Sharing**: The tokenized share link allows quotes to be shared with external stakeholders without requiring system access. The token provides read-only access to quote details while maintaining security.

**Order Conversion**: When a quote is converted to an order, the system performs critical re-validation steps:
- **Price Validation**: Current pricing is recalculated based on the customer's current pricing tier and any price changes since quote creation
- **Stock Validation**: Inventory availability is verified to ensure sufficient stock exists for order fulfillment
- **Allocation**: Upon successful validation, inventory is allocated to the order and the allocationDate is recorded

This workflow ensures that orders are always created with current, accurate information while providing customers with the flexibility to plan and share purchasing decisions.

### Sample Management Workflow

Sample transactions represent a specialized inventory management process that handles product samples without revenue recognition. This workflow is essential for businesses that provide samples for customer evaluation or testing purposes.

**Sample Receipt (vendor_in)**: When samples are received from vendors, they are recorded as sample transactions that increase available sample inventory. The unitCostSnapshot captures the cost basis for future reference, but no accounts payable entries are created.

**Sample Distribution (client_out)**: When samples are sent to customers, the transaction reduces sample inventory and records the customer recipient. No revenue is recognized, and no accounts receivable entries are created.

**Sample Returns**: The system handles two types of sample returns:
- **Client Returns (client_return)**: Samples returned by customers restore the sample inventory levels
- **Vendor Returns (vendor_return)**: Samples returned to vendors reduce sample inventory

**Future Enhancement**: The system architecture includes provisions for a "convert sample to sale" feature, which is currently in the backlog. This feature would allow sample transactions to be converted to revenue-generating sales transactions when customers decide to purchase sampled products.

### Returns and Stock Restoration

The returns process ensures accurate inventory management and financial reporting when products are returned by customers. The system handles returns through a structured process that maintains audit trails and restores inventory levels appropriately.

When a return is processed, the system creates a reverse transaction that:
- Restores the returned quantity to available inventory
- Creates appropriate financial adjustments to reverse the original sale
- Maintains linkage to the original order for audit purposes
- Updates customer account balances as necessary

The returns process integrates with the sample management system, allowing returned products to be reclassified as samples if appropriate for the business model.

---

## Reporting & Analytics

### Built-in Dashboard System

The system provides exactly four built-in dashboards designed to meet core business intelligence requirements without overwhelming users with excessive options. Each dashboard focuses on specific business areas while maintaining consistent user controls and data presentation standards.

#### Dashboard User Controls

All dashboards share a standardized set of user controls that provide flexibility while maintaining simplicity:

**Time Range Selection**: Users can select custom date ranges or choose from predefined options such as last 30 days, last quarter, or year-to-date. The time range selection affects all metrics and visualizations within the dashboard.

**Time Grain Control**: Data can be aggregated by different time periods including daily, weekly, monthly, or quarterly views. This allows users to analyze trends at different levels of detail based on their analytical needs.

**Previous Period Comparison**: A toggle control enables comparison with the previous equivalent time period. For example, when viewing monthly data, users can compare with the previous month, or when viewing quarterly data, compare with the previous quarter.

**Filtering Options**: Three primary filter categories are available across all dashboards:
- **Category Filter**: Allows filtering by product categories to focus on specific product lines or business segments
- **Customer Filter**: Enables analysis of specific customers or customer groups
- **VendorCode Filter**: Provides vendor-based filtering while respecting the vendor code masking rules

#### Data Presentation Standards

**Money Values**: All monetary amounts are displayed as whole numbers representing the actual currency value. The system stores money values as integers (representing cents) internally but displays them as dollars without decimal places for clarity and simplicity.

**Percentage Values**: Percentage calculations are displayed with exactly two decimal places to provide sufficient precision for business analysis while maintaining readability.

**VendorCode Masking**: All dashboard displays respect the vendor code masking rule, showing vendor codes rather than real company names except when specifically viewing vendor profile information.

### Dashboard Specifications

#### Sales Performance Dashboard
Focuses on revenue metrics, order volumes, and customer analysis. Key metrics include total revenue, order count, average order value, and customer acquisition trends.

#### Inventory Management Dashboard
Provides visibility into stock levels, inventory turnover, and product performance. Includes metrics for stock on hand, allocation rates, and inventory aging analysis.

#### Financial Overview Dashboard
Presents accounts receivable aging, payment trends, and profitability analysis. Includes cash flow indicators and outstanding balance summaries.

#### Vendor Performance Dashboard
Analyzes vendor relationships, purchase volumes, and cost trends. Displays vendor performance metrics while maintaining vendor code masking throughout.

---

## Security & Access Control

### Role-Based Access Control (RBAC)

The system implements comprehensive server-side RBAC enforcement to ensure data security and appropriate access controls. All security validations occur on the server side, preventing client-side manipulation or bypass attempts.

#### Defined Roles

**SuperAdmin**: Full system access including user management, system configuration, and all business functions. SuperAdmin users can access all data, modify system settings, and manage other user accounts.

**Sales**: Access to customer-facing functions including quote generation, order processing, customer management, and sales reporting. Sales users cannot access financial functions or vendor management beyond viewing vendor codes.

**Accounting**: Access to financial functions including accounts receivable, accounts payable, payment processing, and financial reporting. Accounting users have limited access to sales functions and cannot modify customer or vendor master data.

**ReadOnly**: View-only access to reports and dashboards without the ability to modify data or process transactions. ReadOnly users can access all reporting functions but cannot create, update, or delete any records.

#### Security Implementation

All API endpoints implement role-based authorization checks before processing requests. The system validates user permissions at multiple levels:

- **Endpoint Access**: Each API endpoint specifies required roles for access
- **Data Filtering**: Query results are filtered based on user permissions
- **Action Authorization**: Specific actions within endpoints are validated against user roles
- **Audit Logging**: All user actions are logged for security and compliance purposes

---

## Technical Architecture

### Technology Stack Details

**Next.js 14 App Router**: Provides the foundation for server-side rendering, routing, and modern React features. The App Router architecture enables efficient code splitting and optimized performance.

**TypeScript**: Ensures type safety throughout the application, reducing runtime errors and improving developer experience. All components, API routes, and data models are fully typed.

**Prisma ORM**: Provides type-safe database access with automatic migration management and query optimization. The Prisma schema serves as the single source of truth for database structure.

**PostgreSQL**: Serves as the primary database, providing ACID compliance, advanced querying capabilities, and robust data integrity features essential for financial and inventory data.

### PDF Generation

The system supports PDF export functionality for quotes and purchase orders, enabling professional document distribution and record keeping.

**Quote PDFs**: Generated quotes include complete product details, pricing, terms and conditions, and the tokenized share link for easy distribution. PDFs maintain professional formatting and include all necessary business information.

**Purchase Order PDFs**: PO documents include vendor information (using vendor codes), product specifications, quantities, pricing, and delivery requirements. The PDF format ensures compatibility with vendor systems and provides clear communication of purchase requirements.

### Photo Management

The intake photo system supports online-only photo management with specific technical requirements:

**Supported Formats**: Only JPEG and WEBP formats are accepted to ensure compatibility and optimize storage efficiency.

**File Size Limits**: Photos are automatically compressed to approximately 1.5MB or less to balance image quality with storage and bandwidth requirements.

**Upload Limits**: Maximum of 4 photos per parent entity to prevent storage bloat while providing sufficient documentation capability.

**Device Support**: Direct upload from iPhone and Android devices is supported, enabling field personnel to capture and upload photos directly from mobile devices.

---

## Business Rules & Constraints

### Financial Rules

**Money Storage**: All monetary values are stored as integers representing cents to avoid floating-point precision issues. This ensures accurate financial calculations and prevents rounding errors in critical business operations.

**COGS Immutability**: Once an OrderItem is allocated and COGS is calculated, the cost basis cannot be changed. This ensures historical accuracy and audit compliance for financial reporting.

**Payment Application**: FIFO methodology is strictly enforced for payment applications, ensuring that payments are applied to the oldest outstanding receivables first. This maintains consistency with standard accounting practices.

### Inventory Rules

**Batch Cost Dating**: BatchCost records must have unique effectiveFrom dates within each batch to ensure unambiguous cost determination during allocation.

**Sample Inventory**: Sample transactions do not generate revenue or affect accounts receivable. Sample inventory is tracked separately from regular inventory to maintain clear financial reporting.

**Return Processing**: All returns must reference original transactions to maintain audit trails and ensure proper inventory restoration.

### Data Integrity Rules

**Vendor Code Uniqueness**: Vendor codes must be unique across the system and are used as the primary identifier in all user-facing displays except vendor profiles.

**Quote Token Security**: Share tokens for quotes must be cryptographically secure and have appropriate expiration handling to prevent unauthorized access.

**Photo Associations**: Intake photos must be properly associated with parent entities and cannot exist as orphaned records.

### User Interface Rules

**Vendor Name Masking**: Real vendor company names are never displayed outside of vendor profile pages. All lists, reports, exports, and general system views must use vendor codes exclusively.

**Dashboard Limitations**: The system provides exactly four dashboards with no provision for custom dashboard creation. This constraint ensures consistent user experience and reduces system complexity.

**Decimal Precision**: Money values display as whole numbers while percentages display with exactly two decimal places throughout the system interface.

---

This document serves as the definitive source of truth for ERPv2 system development and maintenance. All development tasks should reference this documentation to ensure consistency with established business rules and technical requirements.

