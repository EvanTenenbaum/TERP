# Implementation Plan: Canonical Model Unification

## Phase 0: Data Audit & Pre-Migration Validation

- [x] 1. Create data audit infrastructure
  - [x] 1.1 Create orphan detection script for customerId columns
    - Write SQL queries to find customerId values not in clients table
    - Cover: invoices, sales, payments tables
    - Output: CSV report of orphaned records
    - _Requirements: 9.1, 9.2_
  - [x] 1.2 Create vendor-to-client collision detection script
    - Find vendors with names matching existing clients
    - Identify potential merge vs rename candidates
    - Output: Manual review queue
    - _Requirements: 7.1_
  - [x] 1.3 Create schema drift detection script
    - Compare Drizzle schema to actual database structure
    - Identify missing columns, wrong types, missing FKs
    - Output: Drift report JSON
    - _Requirements: 6.1, 6.2_
  - [x] 1.4 Write property test for orphan detection
    - **Property 9: Orphan Record Detection**
    - **Validates: Requirements 9.2**
    - Created `scripts/audit/orphan-detection.test.ts` with 16 tests

- [ ] 2. Execute data audit
  - [ ] 2.1 Run orphan detection on production (read-only)
    - Execute queries against production database
    - Document findings
    - _Requirements: 9.1_
  - [ ] 2.2 Run collision detection on production (read-only)
    - Execute vendor-client name matching
    - Create resolution plan for each collision
    - _Requirements: 7.1_
  - [ ] 2.3 Run schema drift detection
    - Compare all 110 tables
    - Prioritize critical tables for migration
    - _Requirements: 6.1_

- [ ] 3. Checkpoint - Review audit results with stakeholder
  - Ensure all tests pass, ask the user if questions arise.

## Phase 1: Authentication Hardening (Critical Security Fix)

- [-] 4. Fix public user fallback vulnerability
  - [x] 4.1 Create `strictlyProtectedProcedure` middleware
    - Reject requests where `ctx.user.id === -1`
    - Throw UNAUTHORIZED error for public user on mutations
    - Keep fallback for read-only operations if needed
    - _Requirements: 5.4_
  - [x] 4.2 Update `protectedProcedure` to reject public user for mutations
    - Add check in requireUser middleware
    - Log attempts to use public user for writes
    - _Requirements: 5.3, 5.4_
  - [x] 4.3 Write property test for authentication enforcement
    - **Property 7: No Fallback User ID Pattern**
    - **Validates: Requirements 5.3, 5.4, 5.5**
    - Created `scripts/audit/auth-security.test.ts` with Property 7 tests

- [-] 5. Remove `ctx.user?.id || 1` fallback patterns
  - [x] 5.1 Fix orders.ts router (8 occurrences)
    - Replace fallback with strict auth check
    - Throw error if user not authenticated
    - _Requirements: 5.3_
  - [x] 5.2 Fix calendar routers (34 occurrences total)
    - calendar.ts, calendarViews.ts, calendarParticipants.ts
    - calendarMeetings.ts, calendarRecurrence.ts, calendarReminders.ts
    - calendarFinancials.ts, calendarInvitations.ts
    - _Requirements: 5.3_
  - [x] 5.3 Fix salesSheets.ts router (2 occurrences)
    - _Requirements: 5.3_
  - [x] 5.4 Fix pricingDefaults.ts router (1 occurrence)
    - _Requirements: 5.3_
  - [x] 5.5 Write unit tests for auth rejection
    - Test that unauthenticated requests are rejected
    - Test that public user is rejected for mutations
    - _Requirements: 5.4_
    - Included in `scripts/audit/auth-security.test.ts`

- [-] 6. Secure public mutations
  - [x] 6.1 Convert salesSheetEnhancements.deactivateExpired to protectedProcedure
    - Add RBAC permission check
    - Consider converting to scheduled job
    - _Requirements: 4.1, 4.2_
  - [x] 6.2 Write property test for public mutation restriction
    - **Property 5: Public Mutation Restriction**
    - **Validates: Requirements 4.1, 4.2**
    - Created `scripts/audit/auth-security.test.ts` with Property 5 tests

- [-] 7. Fix actor attribution from input
  - [x] 7.1 Remove createdBy from refunds.ts input schema
    - Derive from ctx.user.id instead
    - _Requirements: 5.1, 5.2_
  - [x] 7.2 Audit all routers for actor fields in input
    - Search for createdBy, updatedBy, receivedBy, actorId in input schemas
    - Remove and derive from context
    - _Requirements: 5.1_
  - [x] 7.3 Write property test for actor attribution
    - **Property 6: Actor Attribution from Context**
    - **Validates: Requirements 5.1, 5.2**
    - Created `scripts/audit/auth-security.test.ts` with Property 6 tests

- [ ] 8. Checkpoint - Verify authentication hardening
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Schema Foundation (Non-Breaking)

- [x] 9. Create supplier profiles table
  - [x] 9.1 Add supplierProfiles table to schema
    - Define table with clientId FK, supplier-specific fields
    - Add legacyVendorId for migration tracking
    - Add indexes
    - _Requirements: 1.5_
  - [x] 9.2 Generate and apply migration
    - Run pnpm db:generate
    - Review migration SQL
    - Apply to database
    - _Requirements: 1.5_
  - [x] 9.3 Write unit tests for supplier profile CRUD
    - _Requirements: 1.5_

- [x] 10. Add missing FK constraints (Phase 1 - Safe additions)
  - [x] 10.1 Add FK to invoices.customerId → clients.id
    - First resolve any orphaned records
    - Add .references() to schema
    - Generate migration
    - _Requirements: 2.1_
  - [x] 10.2 Add FK to invoices.createdBy → users.id
    - _Requirements: 2.3_
  - [x] 10.3 Add FK to invoiceLineItems columns
    - invoiceId → invoices.id
    - productId → products.id
    - batchId → batches.id
    - _Requirements: 2.3_
  - [x] 10.4 Add FK to sales.customerId → clients.id
    - First resolve any orphaned records
    - _Requirements: 2.1_
  - [x] 10.5 Add FK to sales.createdBy → users.id
    - _Requirements: 2.3_
  - [x] 10.6 Write property test for FK referential integrity
    - **Property 2: Foreign Key Referential Integrity**
    - **Validates: Requirements 2.1, 2.2, 2.3, 9.1**

- [x] 11. Add missing FK constraints (Phase 2 - Payments/Bills)
  - [x] 11.1 Add FK to payments.customerId → clients.id
    - _Requirements: 2.1_
  - [x] 11.2 Add FK to payments.vendorId → clients.id (as supplier)
    - Document this references clients, not vendors
    - _Requirements: 2.2_
  - [x] 11.3 Add FK to payments.bankAccountId → bankAccounts.id
    - _Requirements: 2.3_
  - [x] 11.4 Add FK to payments.invoiceId → invoices.id
    - _Requirements: 2.3_
  - [x] 11.5 Add FK to payments.billId → bills.id
    - _Requirements: 2.3_

- [x] 12. Add missing indexes for FK columns
  - [x] 12.1 Add indexes for all new FK columns
    - Ensure query performance
    - _Requirements: 2.5_
  - [x] 12.2 Write property test for index coverage
    - **Property 3: Foreign Key Index Coverage**
    - **Validates: Requirements 2.4, 2.5**

- [x] 13. Checkpoint - Verify schema foundation
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Vendor-to-Client Migration

- [x] 14. Create vendor mapping service
  - [x] 14.1 Implement VendorMappingService interface
    - getClientIdForVendor()
    - getSupplierByLegacyVendorId()
    - migrateVendorToClient()
    - isVendorMigrated()
    - _Requirements: 8.2_
  - [x] 14.2 Create vendor-to-client migration script
    - Generate unique teriCode for each vendor
    - Set isSeller=true for migrated vendors
    - Create supplier profile with vendor fields
    - Store legacyVendorId mapping
    - _Requirements: 7.1, 7.2_
  - [x] 14.3 Write property test for vendor-client mapping
    - **Property 8: Vendor-to-Client Mapping Correctness**
    - **Validates: Requirements 8.2**
    - Created `server/services/vendorMappingService.test.ts` with 29 tests
  - [x] 14.4 Write unit tests for migration edge cases
    - Test collision handling (skip, merge, rename strategies)
    - Test idempotency, boundary conditions, data preservation
    - _Requirements: 7.1_

- [ ] 15. Execute vendor migration (Production)
  - [ ] 15.1 Run dry-run migration on production
    - Command: `pnpm tsx scripts/migrate-vendors-to-clients.ts --dry-run --verbose`
    - Review output for collisions and potential issues
    - Document any vendors that will be skipped/renamed
    - _Requirements: 7.5_
  - [ ] 15.2 Execute migration on production
    - Command: `pnpm tsx scripts/migrate-vendors-to-clients.ts --confirm-production --verbose`
    - Verify all vendors migrated
    - Verify supplier profiles created
    - Verify legacy mapping populated
    - _Requirements: 7.5_
  - [ ] 15.3 Validate production migration
    - Run orphan detection script
    - Run collision detection script
    - Verify application functionality
    - _Requirements: 9.3_

- [ ] 16. Update FK references to use clients
  - [ ] 16.1 Update lots.vendorId to reference clients.id
    - Add supplierClientId column
    - Backfill from vendor mapping
    - Update application code
    - _Requirements: 2.2, 3.2_
  - [ ] 16.2 Update paymentHistory.vendorId to reference clients.id
    - _Requirements: 2.2_
  - [ ] 16.3 Update brands.vendorId to reference clients.id
    - _Requirements: 2.2_
  - [ ] 16.4 Update expenses.vendorId to reference clients.id
    - _Requirements: 2.2_

- [ ] 17. Checkpoint - Verify vendor migration
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Column Normalization

- [ ] 18. Rename customerId to clientId
  - [-] 18.1 Add clientId alias columns (dual-write)
    - Add clientId column to invoices, sales, payments
    - Trigger to sync customerId ↔ clientId
    - _Requirements: 3.1, 8.3_
  - [ ] 18.2 Update application code to use clientId
    - Update routers
    - Update services
    - Update client components
    - _Requirements: 3.5_
  - [ ] 18.3 Verify no code uses customerId
    - Grep for customerId usage
    - Update any remaining references
    - _Requirements: 3.5_
  - [ ] 18.4 Remove customerId column (after verification)
    - Drop alias trigger
    - Drop customerId column
    - _Requirements: 3.1_
  - [ ] 18.5 Write property test for naming convention
    - **Property 4: Naming Convention Consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3, 6.3**

- [ ] 19. Document vendorId → clients.id pattern
  - [ ] 19.1 Add schema comments for vendorId columns
    - Document which vendorId columns reference clients.id
    - Document which reference vendors.id (deprecated)
    - _Requirements: 3.3_
  - [ ] 19.2 Update API documentation
    - Document canonical party model
    - Document supplier reference pattern
    - _Requirements: 10.2_

- [ ] 20. Checkpoint - Verify column normalization
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: VIP Portal Security

- [x] 21. Create VIP portal procedure middleware
  - [x] 21.1 Implement vipPortalProcedure in trpc.ts
    - Verify session token from header
    - Resolve to clientId
    - Set actorId for audit
    - _Requirements: 4.3_
    - **Implemented in `server/_core/trpc.ts`**
  - [x] 21.2 Update VIP portal routers to use vipPortalProcedure
    - Identify all VIP portal write endpoints
    - Convert to vipPortalProcedure
    - _Requirements: 4.3_
    - **All mutations in `server/routers/vipPortal.ts` use vipPortalProcedure**
  - [x] 21.3 Write unit tests for VIP portal auth
    - Test session verification
    - Test expired session rejection
    - _Requirements: 4.3_
    - **Created `server/tests/vipPortalAuth.test.ts` with 18 tests**

- [x] 22. Checkpoint - Verify VIP portal security
  - All 18 VIP portal auth tests pass

## Phase 6: Schema Drift Prevention

- [ ] 23. Add schema drift detection to CI
  - [ ] 23.1 Create CI workflow for schema validation
    - Run schema drift detection on PR
    - Block merge if drift detected
    - _Requirements: 6.5_
  - [ ] 23.2 Add pre-deployment schema check
    - Compare schema before migration
    - Require explicit confirmation for production
    - _Requirements: 6.1, 6.2_
  - [ ] 23.3 Write integration test for drift detection
    - _Requirements: 6.1_

- [ ] 24. Standardize naming conventions
  - [ ] 24.1 Document naming convention standard
    - snake_case for database columns
    - camelCase for TypeScript
    - _Requirements: 6.3_
  - [ ] 24.2 Add linting rule for schema naming
    - Warn on mixed conventions
    - _Requirements: 6.3_

## Phase 7: Documentation & Cleanup

- [ ] 25. Create canonical dictionary document
  - [ ] 25.1 Write canonical dictionary
    - Term definitions
    - Table mappings
    - ID field rules
    - Write authorization rules
    - _Requirements: 10.1_
  - [ ] 25.2 Document secured routers
    - List all routers with auth requirements
    - Document RBAC permissions
    - _Requirements: 10.2_
  - [ ] 25.3 Document migration timeline
    - Deprecation schedule for vendors table
    - Removal timeline for customerId columns
    - _Requirements: 10.3_

- [ ] 26. Deprecate vendors table
  - [ ] 26.1 Mark vendors table as deprecated in schema
    - Add deprecation comment
    - Add console warning on vendor queries
    - _Requirements: 1.3_
  - [ ] 26.2 Create vendor query mapping layer
    - Redirect vendor queries to clients + supplierProfiles
    - Log usage for monitoring
    - _Requirements: 8.2_
  - [ ] 26.3 Write property test for canonical party model
    - **Property 1: Canonical Party Model Integrity**
    - **Validates: Requirements 1.1, 1.2**

- [ ] 27. Final validation
  - [ ] 27.1 Run full data integrity check
    - Verify all FKs valid
    - Verify no orphaned records
    - Verify all migrations applied
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ] 27.2 Run security audit
    - Verify no public mutations (except allowed)
    - Verify no fallback user patterns
    - Verify actor attribution from context
    - _Requirements: 4.1, 5.1, 5.3_
  - [ ] 27.3 Generate final validation report
    - Record counts
    - Integrity checks
    - Security checks
    - _Requirements: 9.3_

- [ ] 28. Final Checkpoint - Verify complete implementation
  - Ensure all tests pass, ask the user if questions arise.
