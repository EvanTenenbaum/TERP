# Implementation Plan

## Phase 1: Backend Unification

- [ ] 1. Update inventoryDb vendor functions to use clients table
  - [ ] 1.1 Create `getAllSuppliers()` function that queries clients with isSeller=true
    - Query clients table with isSeller=true filter
    - Join with supplier_profiles relation
    - Order by name ascending
    - _Requirements: 1.1_
  - [ ] 1.2 Create `getSupplierByClientId()` function
    - Query single client by ID with isSeller check
    - Include supplier_profile relation
    - _Requirements: 1.1_
  - [ ] 1.3 Create `getSupplierByLegacyVendorId()` function
    - Query supplier_profiles by legacyVendorId
    - Return client with profile
    - _Requirements: 6.1_
  - [ ] 1.4 Update `getAllVendors()` to call `getAllSuppliers()` with deprecation warning
    - Add console.warn for deprecation tracking
    - Transform response to legacy format
    - _Requirements: 6.4_
  - [ ]* 1.5 Write property test for supplier query functions
    - **Property 1: Supplier Data Consistency**
    - **Validates: Requirements 1.1**

- [ ] 2. Update vendors router to use clients table
  - [ ] 2.1 Update `getAll` to use getAllSuppliers with legacy format transform
    - Include _clientId in response for migration
    - _Requirements: 1.1_
  - [ ] 2.2 Update `create` to create client + supplier_profile
    - Create client with isSeller=true
    - Create supplier_profile with contact info
    - Return legacy format with _clientId
    - _Requirements: 1.2_
  - [ ] 2.3 Update `update` to update client + supplier_profile
    - Update client name if changed
    - Update supplier_profile fields
    - _Requirements: 1.3_
  - [ ] 2.4 Update `delete` to soft-delete client
    - Set deletedAt on client record
    - Do not hard delete
    - _Requirements: 1.4_
  - [ ] 2.5 Update `getById` to use getSupplierByLegacyVendorId
    - Support both legacy vendorId and clientId lookup
    - _Requirements: 6.1_
  - [ ]* 2.6 Write property test for vendor router facade
    - **Property 2: Legacy Vendor ID Resolution**
    - **Validates: Requirements 6.1**

- [ ] 3. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Purchase Orders Update

- [ ] 4. Add supplier_client_id to purchase_orders
  - [ ] 4.1 Create migration to add supplier_client_id column
    - Add nullable INT column
    - Add index for performance
    - _Requirements: 2.1_
  - [ ] 4.2 Create backfill script for existing purchase orders
    - Join with supplier_profiles on legacy_vendor_id
    - Update supplier_client_id from mapping
    - _Requirements: 6.2_
  - [ ] 4.3 Run backfill on production database
    - Execute via prod-db-query.ts
    - Verify all POs have supplier_client_id
    - _Requirements: 6.2_

- [ ] 5. Update purchaseOrders router
  - [ ] 5.1 Update create mutation to accept supplierClientId
    - Add supplierClientId to input schema
    - Keep vendorId as optional for backward compat
    - Resolve vendorId to clientId if needed
    - _Requirements: 2.1_
  - [ ] 5.2 Update getAll to include supplier from clients table
    - Join with clients on supplier_client_id
    - Fall back to vendor lookup if supplier_client_id null
    - _Requirements: 2.2_
  - [ ] 5.3 Update getByVendor to getBySupplier
    - Accept supplierClientId parameter
    - Support legacy vendorId with mapping
    - _Requirements: 2.3_
  - [ ]* 5.4 Write property test for PO supplier reference
    - **Property 3: Purchase Order Supplier Reference Integrity**
    - **Validates: Requirements 2.1**

- [ ] 6. Checkpoint - Ensure PO tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Frontend Client Profile Enhancement

- [ ] 7. Create SupplierProfileSection component
  - [ ] 7.1 Create component file with supplier info display
    - Show payment terms, license, preferred payment
    - Handle null supplier_profile gracefully
    - _Requirements: 3.1, 3.2_
  - [ ] 7.2 Add purchase orders summary to section
    - Query POs by supplierClientId
    - Show recent 5 with link to full list
    - _Requirements: 3.3_
  - [ ] 7.3 Add products supplied summary to section
    - Query batches by supplierClientId
    - Show count and recent items
    - _Requirements: 3.4_
  - [ ] 7.4 Add edit functionality for supplier fields
    - Edit dialog for supplier_profile fields
    - Update via clients router
    - _Requirements: 3.5_

- [ ] 8. Integrate SupplierProfileSection into ClientProfilePage
  - [ ] 8.1 Add conditional render when isSeller=true
    - Check client.isSeller flag
    - Render SupplierProfileSection component
    - _Requirements: 3.1_
  - [ ] 8.2 Fetch supplier_profile data in page query
    - Include supplierProfile in clients.getById response
    - Pass to SupplierProfileSection
    - _Requirements: 3.2_

- [ ] 9. Checkpoint - Ensure client profile works
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Frontend Navigation Consolidation

- [ ] 10. Update ClientsListPage with supplier enhancements
  - [ ] 10.1 Rename "Sellers Only" filter to "Suppliers"
    - Update defaultViews array
    - More intuitive terminology
    - _Requirements: 4.4, 7.1_
  - [ ] 10.2 Add "Add Supplier" button when on suppliers filter
    - Show when clientTypes includes 'seller'
    - Pre-populate isSeller=true in wizard
    - _Requirements: 4.4_
  - [ ] 10.3 Add supplier-specific columns when filtering
    - Show payment terms column
    - Show PO count column
    - _Requirements: 4.4_

- [ ] 11. Add route redirects for /vendors paths
  - [ ] 11.1 Add redirect from /vendors to /clients?clientTypes=seller
    - Use wouter Redirect component
    - _Requirements: 4.1_
  - [ ] 11.2 Create VendorRedirect component for /vendors/:id
    - Query vendor to get _clientId
    - Redirect to /clients/:clientId
    - Handle not found gracefully
    - _Requirements: 4.2_
  - [ ]* 11.3 Write property test for route redirects
    - **Property 4: Route Redirect Correctness**
    - **Validates: Requirements 4.2**

- [ ] 12. Update navigation sidebar
  - [ ] 12.1 Remove "Vendors" menu item from DashboardLayout
    - Remove from menuItems array
    - _Requirements: 4.3_
  - [ ] 12.2 Remove "Vendors" from AppSidebar if present
    - Check and remove if exists
    - _Requirements: 4.3_

- [ ] 13. Checkpoint - Ensure navigation works
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Purchase Orders Page Update

- [ ] 14. Update PurchaseOrdersPage to use clients
  - [ ] 14.1 Replace vendors query with clients query
    - Query clients.list with clientTypes=['seller']
    - _Requirements: 5.1_
  - [ ] 14.2 Update supplier dropdown to use clients data
    - Map clients to dropdown options
    - Use client.id as value
    - _Requirements: 5.1, 5.3_
  - [ ] 14.3 Update form submission to use supplierClientId
    - Change vendorId to supplierClientId in mutation
    - _Requirements: 5.2_
  - [ ] 14.4 Update terminology from "Vendor" to "Supplier"
    - Update labels, placeholders, column headers
    - _Requirements: 5.4, 7.2, 7.3_

- [ ] 15. Update PO table display
  - [ ] 15.1 Update getVendorName to getSupplierName
    - Use clients data instead of vendors
    - _Requirements: 5.3_
  - [ ] 15.2 Update search to search by supplier name
    - Filter using clients data
    - _Requirements: 5.1_

- [ ] 16. Checkpoint - Ensure PO page works
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Data Migration and Cleanup

- [ ] 17. Migrate vendor_notes to client_notes
  - [ ] 17.1 Create client_notes table if not exists
    - Schema matching vendor_notes structure
    - FK to clients.id
    - _Requirements: 6.3_
  - [ ] 17.2 Create migration script for notes
    - Join vendor_notes with supplier_profiles
    - Insert into client_notes with client_id
    - _Requirements: 6.3_
  - [ ] 17.3 Run migration on production
    - Execute via script
    - Verify note counts match
    - _Requirements: 6.3_

- [ ] 18. Update notes queries to use client_notes
  - [ ] 18.1 Update vendors.getNotes to query client_notes
    - Map vendorId to clientId
    - Query client_notes table
    - _Requirements: 1.5_
  - [ ] 18.2 Add notes section to ClientProfilePage
    - Query client_notes for client
    - Display in profile
    - _Requirements: 3.1_

- [ ] 19. Final cleanup
  - [ ] 19.1 Add deprecation comments to vendors table in schema
    - Document deprecation timeline
    - _Requirements: 6.4_
  - [ ] 19.2 Update CANONICAL_DICTIONARY.md with completion status
    - Mark frontend migration complete
    - _Requirements: 7.4_
  - [ ] 19.3 Delete VendorsPage.tsx, VendorProfilePage.tsx, VendorNotesDialog.tsx
    - Remove deprecated components
    - Routes now redirect
    - _Requirements: 4.1, 4.2_

- [ ] 20. Final Checkpoint - Full E2E verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify /vendors redirects work
  - Verify supplier creation from Clients page
  - Verify PO creation with supplier
  - Verify client profile shows supplier section
