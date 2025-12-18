# Requirements Document

## Introduction

This specification addresses the incomplete vendor-to-client migration in TERP. The backend migration created `supplier_profiles` and copied vendors to `clients`, but the `vendors` router and frontend still operate on the deprecated `vendors` table. This creates data integrity issues where suppliers can exist in two places without synchronization.

The goal is to complete the migration so all supplier data flows through the canonical `clients` table, providing a single source of truth and unified user experience.

## Glossary

- **Client**: Any business entity that interacts with TERP (buyer, seller, or both) - stored in `clients` table
- **Supplier**: A client with `isSeller=true` who sells products to TERP
- **Vendor**: **DEPRECATED** term for supplier - legacy `vendors` table
- **Supplier Profile**: Extended supplier-specific data in `supplier_profiles` table
- **Purchase Order (PO)**: An order placed with a supplier for inventory

## Requirements

### Requirement 1: Backend Vendor Router Unification

**User Story:** As a system administrator, I want all vendor/supplier operations to use the canonical clients table, so that there is a single source of truth for supplier data.

#### Acceptance Criteria

1. WHEN the vendors.getAll endpoint is called THEN the system SHALL return clients with `isSeller=true` joined with their supplier profiles
2. WHEN a new vendor is created via vendors.create THEN the system SHALL create a client record with `isSeller=true` and a corresponding supplier_profile record
3. WHEN a vendor is updated via vendors.update THEN the system SHALL update the corresponding client and supplier_profile records
4. WHEN a vendor is deleted via vendors.delete THEN the system SHALL soft-delete the client record (set deletedAt)
5. WHEN vendor notes are requested THEN the system SHALL return notes associated with the client record

### Requirement 2: Purchase Orders Supplier Reference Update

**User Story:** As a purchasing manager, I want purchase orders to reference suppliers via the clients table, so that supplier data is consistent across the system.

#### Acceptance Criteria

1. WHEN a purchase order is created THEN the system SHALL store the supplier reference as `supplierClientId` pointing to `clients.id`
2. WHEN displaying purchase orders THEN the system SHALL resolve supplier names from the clients table
3. WHEN filtering purchase orders by supplier THEN the system SHALL use `supplierClientId` for the filter
4. WHEN existing purchase orders have only `vendorId` THEN the system SHALL resolve the supplier via the legacy vendor mapping

### Requirement 3: Frontend Client Profile Supplier Section

**User Story:** As a user viewing a client profile, I want to see supplier-specific information when the client is a seller, so that I can manage supplier relationships from a single location.

#### Acceptance Criteria

1. WHEN viewing a client profile where `isSeller=true` THEN the system SHALL display a supplier information section
2. WHEN the supplier section is displayed THEN the system SHALL show payment terms, license number, and preferred payment method from supplier_profiles
3. WHEN the supplier section is displayed THEN the system SHALL show recent purchase orders for this supplier
4. WHEN the supplier section is displayed THEN the system SHALL show products/batches supplied by this supplier
5. WHEN editing a client with `isSeller=true` THEN the system SHALL allow editing supplier-specific fields

### Requirement 4: Frontend Navigation and Route Consolidation

**User Story:** As a user, I want a single location to manage all business relationships (buyers and sellers), so that I don't have to navigate between separate Vendors and Clients sections.

#### Acceptance Criteria

1. WHEN the user navigates to /vendors THEN the system SHALL redirect to /clients with a seller filter applied
2. WHEN the user navigates to /vendors/:id THEN the system SHALL redirect to the corresponding client profile
3. WHEN the sidebar navigation is displayed THEN the system SHALL show "Clients" without a separate "Vendors" entry
4. WHEN the clients list is displayed THEN the system SHALL provide a prominent "Suppliers" quick filter

### Requirement 5: Purchase Orders Page Supplier Selection

**User Story:** As a purchasing manager creating a purchase order, I want to select suppliers from the unified clients list, so that I'm using current supplier data.

#### Acceptance Criteria

1. WHEN creating a purchase order THEN the system SHALL display a supplier dropdown populated from clients with `isSeller=true`
2. WHEN a supplier is selected THEN the system SHALL store the reference as `supplierClientId`
3. WHEN displaying the supplier dropdown THEN the system SHALL show the client name and any relevant supplier profile info
4. WHEN the form label is displayed THEN the system SHALL use "Supplier" terminology (not "Vendor")

### Requirement 6: Data Migration and Backward Compatibility

**User Story:** As a system administrator, I want existing vendor references to continue working during the transition, so that no data is lost or broken.

#### Acceptance Criteria

1. WHEN a legacy vendorId is encountered THEN the system SHALL resolve it to the corresponding clientId via supplier_profiles.legacyVendorId
2. WHEN purchase_orders.supplierClientId is null but vendorId exists THEN the system SHALL use the legacy mapping to resolve the supplier
3. WHEN vendor_notes exist for a legacy vendor THEN the system SHALL migrate them to client_notes using the legacy mapping
4. WHEN the vendors table is queried directly THEN the system SHALL log a deprecation warning

### Requirement 7: Terminology Consistency

**User Story:** As a user, I want consistent terminology throughout the application, so that I understand the system without confusion.

#### Acceptance Criteria

1. WHEN displaying supplier-related UI elements THEN the system SHALL use "Supplier" terminology (not "Vendor")
2. WHEN displaying form labels for supplier selection THEN the system SHALL use "Supplier" label
3. WHEN displaying page titles for supplier management THEN the system SHALL use "Supplier" in the title
4. WHEN displaying help text or descriptions THEN the system SHALL use "Supplier" consistently
