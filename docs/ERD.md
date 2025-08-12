# ERPv2 Entity Relationship Diagram (ERD)

**Version:** 1.0  
**Last Updated:** August 12, 2025  
**Author:** Manus AI  
**Database:** PostgreSQL with Prisma ORM  

## Overview

This document provides a comprehensive Entity Relationship Diagram (ERD) for the ERPv2 system, detailing all database entities, their relationships, and the business logic that governs data integrity and operations. The ERD represents the complete data model as implemented in the Prisma schema, ensuring alignment with the business requirements outlined in the CONTEXT.md specification.

## Entity Summary

The ERPv2 database consists of 19 core entities organized into logical domains that support the comprehensive business operations of an Enterprise Resource Planning system. These entities are designed to handle complex business workflows including inventory management, sales operations, financial tracking, customer relationship management, and user access control.

| Entity | Purpose | Key Business Rule |
|--------|---------|-------------------|
| **User** | System access and role-based security | Server-side RBAC enforcement |
| **Product** | Catalog management and pricing | Default pricing fallback hierarchy |
| **Vendor** | Supplier relationship management | VendorCode masking everywhere except profiles |
| **Customer** | Client relationship and credit management | Credit limits and payment terms tracking |
| **Batch** | Inventory lot tracking with vendor source | Quantity tracking and expiration management |
| **BatchCost** | Historical cost tracking by effective date | COGS calculation at allocation date |
| **InventoryLot** | Current inventory positions | Real-time availability calculations |
| **Order** | Customer purchase transactions | Allocation date determines cost basis |
| **OrderItem** | Line-level order details with batch allocation | Immutable COGS once allocated |
| **AccountsReceivable** | Customer invoicing and outstanding balances | Unique invoice numbering |
| **Payment** | Customer payment processing | Multiple payment methods support |
| **PaymentApplication** | FIFO payment allocation to invoices | Automated oldest-first application |
| **AccountsPayable** | Vendor invoice management | Vendor-specific invoice numbering |
| **CrmNote** | Customer and vendor interaction history | Flexible note categorization |
| **SalesQuote** | Customer quotations with tokenized sharing | Expiration date management |
| **SalesQuoteItem** | Quote line items with pricing | Price validation on order conversion |
| **PriceBook** | Tiered pricing structures | Customer > Role > Global precedence |
| **PriceBookEntry** | Product-specific pricing rules | Effective date and quantity tiers |
| **DebtAdjustment** | Customer account adjustments | Notes-only documentation, reversible |
| **SampleTransaction** | Sample inventory without revenue | Four transaction types supported |
| **IntakePhoto** | Document management for entities | JPEG/WEBP only, 4 photo maximum |

## Core Business Logic Implementation

### Cost of Goods Sold (COGS) Calculation

The relationship between OrderItem, Batch, and BatchCost entities implements the critical COGS calculation business rule. When an OrderItem is allocated to a specific Batch, the system queries the BatchCost entity for the cost record with the latest effectiveFrom date that is less than or equal to the OrderItem's allocationDate.

This relationship design ensures that COGS calculations reflect the actual cost basis at the time of sale, providing accurate margin analysis and financial reporting. The immutable nature of the allocationDate field prevents retroactive cost adjustments that could compromise financial integrity.

### Price Precedence Hierarchy

The relationship structure between Customer, PriceBook, PriceBookEntry, and Product entities implements the sophisticated price precedence system. The system evaluates pricing in the following order: customer-specific PriceBook entries, role-based PriceBook entries, global PriceBook entries, and finally Product default pricing.

This hierarchy is implemented through the relationship design and business logic, ensuring that customers always receive the most favorable pricing they are entitled to receive while maintaining clear audit trails for pricing decisions.

### FIFO Payment Application

The relationship between Payment, PaymentApplication, and AccountsReceivable entities implements the FIFO payment allocation methodology. When payments are processed, the system queries AccountsReceivable records for the customer ordered by invoice date, applying payment amounts to the oldest outstanding invoices first.

This relationship design ensures consistent payment application practices and supports accurate aging analysis for accounts receivable management. The PaymentApplication entity maintains complete audit trails for all payment allocations, supporting financial compliance and dispute resolution.

### Vendor Code Masking

The Vendor entity relationship design supports the critical vendor code masking business rule. The vendorCode field is used for all system displays and exports, while the companyName field is only accessible through vendor profile views.

This design ensures that sensitive vendor information is protected while maintaining operational efficiency through consistent vendor identification codes. The relationship structure supports this masking requirement across all related entities including Batch, AccountsPayable, and CrmNote.

## Data Integrity and Constraints

### Primary Key Strategy

All entities in the ERPv2 system utilize CUID (Collision-resistant Unique Identifier) primary keys, providing globally unique identifiers that support distributed system architectures and prevent collision issues during data synchronization or migration operations.

### Foreign Key Relationships and Referential Integrity

The database design implements comprehensive foreign key constraints to ensure referential integrity across all entity relationships. These constraints prevent orphaned records and maintain data consistency during complex business operations.

Critical foreign key relationships include the Order to Customer relationship, which ensures that all orders are associated with valid customers, and the OrderItem to Batch relationship, which guarantees that inventory allocations reference valid inventory lots.

The PaymentApplication entity implements dual foreign key constraints to both Payment and AccountsReceivable entities, ensuring that payment allocations always reference valid payments and invoices. This design prevents data corruption during the critical FIFO payment application process.

### Unique Constraints and Business Rules

Several entities implement unique constraints to enforce business rules and prevent data duplication. The Vendor entity enforces uniqueness on the vendorCode field, ensuring that vendor identification codes remain unique across the system.

The AccountsReceivable entity implements a unique constraint on the invoiceNumber field, preventing duplicate invoice numbers that could cause confusion in financial reporting and customer communications.

The BatchCost entity implements a composite unique constraint on batchId and effectiveFrom fields, ensuring that each batch has only one cost record for any given effective date. This constraint is critical for accurate COGS calculations and prevents ambiguous cost determinations.

### Enumeration Constraints

The system implements several enumeration types to constrain field values and ensure data consistency. The UserRole enumeration defines the four supported user roles: SUPER_ADMIN, SALES, ACCOUNTING, and READ_ONLY, preventing invalid role assignments.

OrderStatus enumeration constrains order status values to valid business states including DRAFT, CONFIRMED, ALLOCATED, SHIPPED, DELIVERED, and CANCELLED. This constraint ensures that order workflow tracking remains consistent and supports accurate business reporting.

SalesQuoteStatus enumeration similarly constrains quote status values to DRAFT, SENT, ACCEPTED, EXPIRED, and CANCELLED, supporting proper quote lifecycle management and preventing invalid status transitions.

## Conclusion

The ERPv2 Entity Relationship Diagram represents a comprehensive and sophisticated database design that supports complex business operations while maintaining data integrity and performance efficiency. The relationship structure implements critical business rules including COGS calculation, price precedence, FIFO payment application, and vendor code masking through proper entity design and constraint implementation.

The design supports scalability and evolution through proper normalization, strategic indexing, and flexible relationship patterns. The polymorphic relationship designs in IntakePhoto and SampleTransaction entities provide extensibility for future enhancements while maintaining current functionality and performance.

This ERD serves as the foundation for all database operations in the ERPv2 system, ensuring that business requirements are properly implemented through robust data structures and relationship designs. The comprehensive relationship documentation supports ongoing development, maintenance, and enhancement activities while maintaining system integrity and performance.

