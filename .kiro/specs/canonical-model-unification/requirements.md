# Requirements Document

## Introduction

This specification addresses the system-wide canonical model issues in TERP, focusing on unifying the party identity model around the `clients` table as the single canonical Counterparty table. The project will fix foreign key integrity gaps, secure public write surfaces, eliminate fallback user ID patterns, and prevent schema drift.

**Canonical Decision**: Keep the table name `clients` and treat it as the single canonical Counterparty table for all external business parties. Do not add a new "counterparties" table name.

## Glossary

- **Counterparty**: A `clients` row representing any external business party (canonical identity)
- **Customer**: A `clients` row representing a party you sell to (AR side) - not a separate table
- **Supplier**: A `clients` row representing a party you buy from (AP + intake) - preferred term over "vendor"
- **Client**: The canonical table name for all counterparties
- **clientId**: Always refers to `clients.id`
- **userId**: Always refers to `users.id`
- **Actor Fields**: Fields like `createdBy`, `updatedBy`, `receivedBy`, `actorId` that identify who performed an action
- **Schema Drift**: Mismatch between Drizzle schema definition and actual database structure
- **RBAC**: Role-Based Access Control system defined in `drizzle/schema-rbac.ts`

## Requirements

### Requirement 1: Party Model Unification

**User Story:** As a system architect, I want a unified party identity model, so that all external business relationships are consistently represented and queryable.

#### Acceptance Criteria

1. THE System SHALL use `clients` as the single canonical table for all external business parties (customers, suppliers, brands, referees, contractors)
2. WHEN a supplier relationship is needed THEN the System SHALL use `clients.id` with appropriate role flags (`isBuyer`, `isSeller`, `isBrand`, etc.)
3. THE System SHALL maintain the existing `vendors` table for backward compatibility during migration, with a documented deprecation path
4. WHEN `intakeSessions.vendorId` references `clients.id` THEN the System SHALL document this as the canonical supplier reference pattern
5. THE System SHALL provide a supplier-profile extension mechanism keyed by `clients.id` for supplier-specific fields

### Requirement 2: Foreign Key Integrity

**User Story:** As a database administrator, I want all FK-like columns to have proper `.references()` declarations, so that referential integrity is enforced at the database level.

#### Acceptance Criteria

1. WHEN a column named `customerId` exists THEN the System SHALL either add `.references(() => clients.id)` or rename to `clientId` with proper FK
2. WHEN a column named `vendorId` exists in accounting tables (invoices, payments, bills) THEN the System SHALL reference `clients.id` with clear documentation
3. THE System SHALL add missing `.references()` to all FK-like int columns identified in the audit (~59 columns)
4. WHEN adding FK constraints THEN the System SHALL include appropriate `onDelete` behavior (cascade, restrict, or set null)
5. THE System SHALL add indexes for all foreign key columns to ensure query performance

### Requirement 3: Column Normalization

**User Story:** As a developer, I want consistent column naming for party references, so that the codebase is predictable and maintainable.

#### Acceptance Criteria

1. WHEN a column references a customer THEN the System SHALL use `clientId` (not `customerId`) with FK to `clients.id`
2. WHEN a column references a supplier THEN the System SHALL use `supplierClientId` or document the `vendorId` → `clients.id` mapping
3. THE System SHALL not leave ambiguous `vendorId` columns that sometimes mean `vendors.id` and sometimes mean `clients.id`
4. WHEN renaming columns THEN the System SHALL provide migration scripts with data preservation
5. THE System SHALL update all application code to use the new column names

### Requirement 4: Public Procedure Security

**User Story:** As a security engineer, I want all state-mutating endpoints to require authentication, so that unauthorized access is prevented.

#### Acceptance Criteria

1. THE System SHALL restrict `publicProcedure.mutation` to only VIP portal authentication primitives (login/session/forgot/reset) and deprecated endpoints that throw
2. WHEN a mutation modifies database state THEN the System SHALL require `protectedProcedure` with `requirePermission(...)` (RBAC)
3. WHEN a VIP portal write is needed THEN the System SHALL verify portal session token and resolve to a `clientId` with strict authorization
4. THE System SHALL audit and convert all existing `publicProcedure.mutation` calls to appropriate protected procedures
5. THE System SHALL document which endpoints are intentionally public and why

### Requirement 5: Actor Attribution Security

**User Story:** As an auditor, I want all database writes to be attributed to authenticated principals, so that audit trails are reliable.

#### Acceptance Criteria

1. THE System SHALL not accept `createdBy`, `updatedBy`, `receivedBy`, or `actorId` fields from client request payloads
2. WHEN recording actor attribution THEN the System SHALL derive the value from authenticated context or validated portal session
3. THE System SHALL remove all `ctx.user?.id || 1` fallback patterns from write paths
4. WHEN a write operation lacks authenticated context THEN the System SHALL reject the request with an appropriate error
5. THE System SHALL ensure every write is attributable to a real principal (user or system account)

### Requirement 6: Schema Drift Prevention

**User Story:** As a DevOps engineer, I want schema drift to be detected and prevented, so that production failures like the `deleted_at` incident don't recur.

#### Acceptance Criteria

1. THE System SHALL include a schema verification step before migrations that compares Drizzle schema to actual database structure
2. WHEN schema drift is detected THEN the System SHALL block deployment and report the specific mismatches
3. THE System SHALL maintain consistent naming conventions (either camelCase or snake_case, not mixed)
4. WHEN adding soft delete columns THEN the System SHALL verify the column exists in the target database before deployment
5. THE System SHALL include schema drift detection in CI pipeline

### Requirement 7: Data Migration Safety

**User Story:** As a database administrator, I want migrations to be safe and reversible, so that production data is protected.

#### Acceptance Criteria

1. WHEN migrating vendor records to clients THEN the System SHALL provide dedupe/matching rules to prevent collisions
2. THE System SHALL create backfill scripts that preserve existing data relationships
3. WHEN renaming columns THEN the System SHALL use temporary alias columns during transition
4. THE System SHALL provide rollback procedures for each migration step
5. WHEN running migrations THEN the System SHALL verify environment (dev vs prod) and require explicit confirmation for production

### Requirement 8: Backward Compatibility

**User Story:** As a developer, I want the migration to be incremental, so that existing functionality continues to work during the transition.

#### Acceptance Criteria

1. THE System SHALL maintain dual-write capability during migration (writing to both old and new structures)
2. WHEN deprecating the `vendors` table THEN the System SHALL provide a mapping layer that translates vendor queries to client queries
3. THE System SHALL support both old and new column names during the transition period
4. WHEN removing deprecated code THEN the System SHALL do so only after verifying no active usage
5. THE System SHALL document the deprecation timeline and migration path

### Requirement 9: Validation and Audit

**User Story:** As a QA engineer, I want comprehensive validation of the migration, so that data integrity is verified.

#### Acceptance Criteria

1. THE System SHALL provide data audit scripts that verify `customerId` values match `clients.id`
2. THE System SHALL provide scripts to detect orphaned records after migration
3. WHEN migration completes THEN the System SHALL generate a validation report showing record counts and integrity checks
4. THE System SHALL log all migration operations for audit purposes
5. THE System SHALL provide rollback verification that confirms data restoration

### Requirement 10: Documentation

**User Story:** As a developer, I want clear documentation of the canonical model, so that future development follows consistent patterns.

#### Acceptance Criteria

1. THE System SHALL provide a canonical dictionary document defining terms, tables, ID fields, relationships, and write authorization rules
2. THE System SHALL document which routers have been secured and their authorization requirements
3. THE System SHALL document the migration timeline and deprecation schedule
4. WHEN adding new party-related features THEN developers SHALL follow the documented canonical model
5. THE System SHALL include red-team analysis documenting assumptions, counterexamples, and mitigations
