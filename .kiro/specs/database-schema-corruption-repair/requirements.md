# Requirements Document

## Introduction

The Database Schema Corruption Repair Pilot is a safety-first system designed to identify and surgically repair corrupted schema definitions in the TERP codebase, specifically targeting malformed `deletedAt` timestamp fields that have been incorrectly nested inside other column option objects. This system prioritizes local testing, explicit guardrails, and a pilot-first approach using the `inventoryMovements` table as a proof of concept before scaling to other tables.

## Glossary

- **Schema Corruption**: Malformed `deletedAt: timestamp("deleted_at")` fields incorrectly nested inside other column option objects (e.g., inside `varchar` or `references` configs)
- **Pilot Table**: The `inventoryMovements` table used as the first test case for the repair process
- **Local Test Harness**: Docker MySQL environment accessed via `pnpm test:env:up` and `pnpm test:db:reset light`
- **DB-First Approach**: Treating the actual database structure as the source of truth and updating Drizzle schema to match
- **Safe Migration**: ADD or widen-only database changes that cannot cause data loss
- **Host Guards**: Code protections that prevent accidental execution against staging or production databases
- **Surgical Repair**: Minimal, targeted fixes that only address the specific corruption without touching unrelated code
- **Validation Harness**: The existing `pnpm validate:schema` system used to verify schema alignment
- **Drift Output**: Results from schema validation showing mismatches between database and Drizzle definitions

## Requirements

### Requirement 1: Local Environment Safety

**User Story:** As a developer, I want to work exclusively with local Docker MySQL, so that I can safely test schema repairs without any risk to staging or production data.

#### Acceptance Criteria

1. WHEN the system starts THEN it SHALL verify connection is to local test database only
2. WHEN host guards are implemented THEN the system SHALL block connections to `ondigitalocean.com` domains
3. WHEN using test harness THEN the system SHALL use `pnpm test:env:up` and `pnpm test:db:reset light` commands
4. WHEN validating environment THEN the system SHALL confirm `.env` points to local test DB credentials
5. WHEN any script detects non-local host THEN the system SHALL terminate with clear error message

### Requirement 2: Corruption Detection and Surgical Repair

**User Story:** As a developer, I want to identify and surgically fix corrupted `deletedAt` fields, so that I can restore proper schema structure without affecting unrelated code.

#### Acceptance Criteria

1. WHEN scanning schema files THEN the system SHALL locate `deletedAt: timestamp("deleted_at")` nested inside other column options
2. WHEN corruption is detected THEN the system SHALL note exact locations without making changes initially
3. WHEN performing surgical repair THEN the system SHALL remove malformed `deletedAt` from options objects
4. WHEN performing surgical repair THEN the system SHALL add proper table-level `deletedAt: timestamp("deleted_at"),` field
5. WHEN repair is complete THEN the system SHALL run `pnpm check` and verify zero TypeScript errors

### Requirement 3: Pilot Table Validation

**User Story:** As a developer, I want to use `inventoryMovements` as a pilot table, so that I can validate the repair process on a single table before scaling to others.

#### Acceptance Criteria

1. WHEN starting pilot process THEN the system SHALL reset local DB with `pnpm test:db:reset light`
2. WHEN running validation THEN the system SHALL execute `pnpm validate:schema` and capture fresh drift output
3. WHEN focusing on pilot table THEN the system SHALL update only `inventoryMovements` table definition in `drizzle/schema.ts`
4. WHEN aligning with database THEN the system SHALL match column types, nullability, and constraints to actual DB structure
5. WHEN pilot is complete THEN the system SHALL show 0 validation issues for `inventoryMovements` table

### Requirement 4: Database-First Schema Alignment

**User Story:** As a developer, I want to align Drizzle schema with actual database structure, so that the schema definitions accurately reflect production reality.

#### Acceptance Criteria

1. WHEN comparing schemas THEN the system SHALL treat database structure as the source of truth
2. WHEN updating column types THEN the system SHALL align Drizzle types (e.g., `int`, `decimal`, `timestamp`) to match DB
3. WHEN updating nullability THEN the system SHALL add/remove `.notNull()` to match database constraints
4. WHEN adding columns THEN the system SHALL only add columns that already exist in the database
5. WHEN avoiding destructive changes THEN the system SHALL never rename or remove columns during pilot

### Requirement 5: Safe Migration Testing

**User Story:** As a developer, I want to optionally test safe migrations, so that I can verify the process works for adding missing benign columns.

#### Acceptance Criteria

1. WHEN creating migrations THEN the system SHALL use only ADD or widen-only changes
2. WHEN avoiding destructive operations THEN the system SHALL never use DROP, rename, or narrowing MODIFY
3. WHEN testing migrations THEN the system SHALL create `migrations/drift-fixes/001_pilot_inventoryMovements.sql`
4. WHEN handling MySQL versions THEN the system SHALL verify MySQL version supports `ADD COLUMN IF NOT EXISTS` or use equivalent guards
5. WHEN including verification THEN the system SHALL add comments for `DESCRIBE inventoryMovements;` verification
6. WHEN ensuring reversibility THEN the system SHALL include commented rollback commands

### Requirement 6: Host Protection and Safety Guards

**User Story:** As a developer, I want explicit protection against production access, so that I can never accidentally affect staging or production databases.

#### Acceptance Criteria

1. WHEN implementing host guards THEN the system SHALL maintain a denylist of non-local hosts
2. WHEN detecting production hosts THEN the system SHALL block `ondigitalocean.com` and similar domains
3. WHEN creating helper scripts THEN the system SHALL bake in host protection by default
4. WHEN validating environment THEN the system SHALL verify DATABASE_URL points to local test instance
5. WHEN any production indicator is detected THEN the system SHALL terminate immediately with clear warning

### Requirement 7: Validation Integration

**User Story:** As a developer, I want to integrate with existing validation tools, so that I can leverage the current `pnpm validate:schema` system for verification.

#### Acceptance Criteria

1. WHEN using validation harness THEN the system SHALL execute existing `pnpm validate:schema` command
2. WHEN capturing drift output THEN the system SHALL parse validation results for `inventoryMovements` table
3. WHEN iterating fixes THEN the system SHALL re-run validation until 0 issues remain
4. WHEN validation passes THEN the system SHALL confirm schema alignment is complete
5. WHEN validation fails THEN the system SHALL provide clear next steps for remaining issues

### Requirement 8: Minimal Scope and Surgical Precision

**User Story:** As a developer, I want to limit changes to corruption repair and pilot table only, so that I minimize risk and maintain focus.

#### Acceptance Criteria

1. WHEN defining scope THEN the system SHALL limit changes to corruption repair and `inventoryMovements` pilot
2. WHEN avoiding scope creep THEN the system SHALL not fix unrelated schema issues during pilot
3. WHEN making changes THEN the system SHALL keep modifications surgical and targeted
4. WHEN documenting changes THEN the system SHALL clearly identify what was broken and what was fixed
5. WHEN completing pilot THEN the system SHALL provide foundation for scaling to additional tables

### Requirement 9: Documentation and Audit Trail

**User Story:** As a developer, I want comprehensive documentation of the pilot process, so that I can understand what was done and replicate the process for other tables.

#### Acceptance Criteria

1. WHEN documenting pilot THEN the system SHALL create `docs/PILOT_INVENTORYMOVEMENTS.md` with complete details
2. WHEN recording corruption fixes THEN the system SHALL document what was broken (deletedAt corruption)
3. WHEN recording solutions THEN the system SHALL document what was fixed (schema corrections, optional ADD)
4. WHEN documenting commands THEN the system SHALL list all commands used during the process
5. WHEN showing results THEN the system SHALL confirm `pnpm validate:schema` shows 0 issues for `inventoryMovements`

### Requirement 10: Success Criteria and Validation

**User Story:** As a developer, I want clear success criteria for the pilot, so that I can confidently determine when the process is complete and ready for scaling.

#### Acceptance Criteria

1. WHEN checking TypeScript THEN `drizzle/schema.ts` SHALL pass `pnpm check` with zero errors
2. WHEN validating schema THEN `pnpm validate:schema` SHALL report zero issues for `inventoryMovements` on local DB
3. WHEN testing migrations THEN any created migration SHALL apply and rollback cleanly with validation remaining clean
4. WHEN verifying safety THEN no staging/prod SHALL have been touched and host guards SHALL be in place
5. WHEN documenting completion THEN pilot steps SHALL be fully documented for future reference

### Requirement 11: Rollback and Recovery

**User Story:** As a developer, I want clear rollback procedures, so that I can safely revert changes if issues are discovered.

#### Acceptance Criteria

1. WHEN providing rollback THEN the system SHALL document how to revert schema changes
2. WHEN testing rollback THEN migration rollback commands SHALL be tested on local DB
3. WHEN ensuring safety THEN rollback procedures SHALL be validated before applying any changes
4. WHEN documenting recovery THEN clear steps SHALL be provided for returning to previous state
5. WHEN rollback is needed THEN the process SHALL be executable without data loss

### Requirement 12: Foundation for Scaling

**User Story:** As a developer, I want the pilot to establish patterns for scaling, so that I can apply the same safe process to additional tables after pilot success.

#### Acceptance Criteria

1. WHEN pilot succeeds THEN the system SHALL provide a template for processing additional tables
2. WHEN scaling considerations THEN the system SHALL identify which tables need similar treatment
3. WHEN establishing patterns THEN the system SHALL document the DB-first, non-destructive approach
4. WHEN planning next steps THEN the system SHALL maintain the same safety guardrails for future work
5. WHEN scaling process THEN the system SHALL keep DROP/rename/type narrowing as manual, human-reviewed items only