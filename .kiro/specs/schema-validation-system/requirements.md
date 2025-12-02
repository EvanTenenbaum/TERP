# Requirements Document

## Introduction

The Schema Validation System is a comprehensive toolset designed to detect, report, and fix schema drift between Drizzle ORM schema definitions and the actual MySQL database structure in production. This system is critical for ensuring data seeding operations succeed and maintaining database integrity across the TERP application.

## Glossary

- **Schema Drift**: Discrepancies between the Drizzle ORM schema definitions (TypeScript) and the actual database structure (MySQL)
- **Drizzle ORM**: The TypeScript ORM used by TERP for database operations
- **Database Introspection**: The process of querying the actual database to discover its structure
- **Critical Tables**: The six tables required for Phase 2 seeding operations: inventoryMovements, orderStatusHistory, invoices, ledgerEntries, payments, clientActivity
- **Validation Report**: A document detailing all schema drift issues found during validation
- **Fix Recommendation**: Specific code changes suggested to resolve schema drift issues
- **Source of Truth**: The actual MySQL database structure, which Drizzle schema definitions must match

## Requirements

### Requirement 1: Database Schema Introspection

**User Story:** As a developer, I want to query the actual database structure programmatically, so that I can compare it against my Drizzle schema definitions.

#### Acceptance Criteria

1. WHEN the introspection utility queries the database THEN the system SHALL retrieve all table names from information_schema.TABLES
2. WHEN querying a specific table THEN the system SHALL retrieve column names, data types, nullable status, default values, and key types using DESCRIBE and information_schema.COLUMNS
3. WHEN a column has an ENUM type THEN the system SHALL extract all valid enum values from the COLUMN_TYPE field
4. WHEN querying foreign key relationships THEN the system SHALL retrieve referenced tables and columns from information_schema.KEY_COLUMN_USAGE
5. WHEN querying indexes THEN the system SHALL retrieve index information from information_schema.STATISTICS

### Requirement 2: Schema Definition Parsing

**User Story:** As a developer, I want to parse Drizzle schema files programmatically, so that I can extract table and column definitions for comparison.

#### Acceptance Criteria

1. WHEN parsing schema files THEN the system SHALL extract table definitions from all three schema files (schema.ts, schema-rbac.ts, schema-vip-portal.ts)
2. WHEN extracting column definitions THEN the system SHALL identify column names, data types, nullable status, default values, and foreign key references
3. WHEN encountering camelCase column names THEN the system SHALL convert them to snake_case for database comparison
4. WHEN encountering snake_case column names THEN the system SHALL preserve them for direct database comparison
5. WHEN parsing enum definitions THEN the system SHALL extract all valid enum values from the Drizzle schema

### Requirement 3: Comprehensive Schema Comparison

**User Story:** As a developer, I want to compare Drizzle schema definitions against the actual database structure, so that I can identify all schema drift issues.

#### Acceptance Criteria

1. WHEN comparing column names THEN the system SHALL detect mismatches between camelCase Drizzle names and snake_case database names
2. WHEN comparing data types THEN the system SHALL normalize and compare MySQL types with Drizzle type definitions
3. WHEN comparing enum values THEN the system SHALL detect missing, extra, or mismatched enum values
4. WHEN comparing nullable constraints THEN the system SHALL detect mismatches between NOT NULL in database and .notNull() in Drizzle
5. WHEN comparing default values THEN the system SHALL detect mismatches between database defaults and Drizzle defaults
6. WHEN comparing foreign keys THEN the system SHALL detect mismatches between database foreign key constraints and .references() in Drizzle

### Requirement 4: Prioritized Validation Reporting

**User Story:** As a developer, I want validation reports that prioritize critical issues, so that I can focus on fixing the most important problems first.

#### Acceptance Criteria

1. WHEN generating validation reports THEN the system SHALL prioritize the six critical tables for seeding operations
2. WHEN categorizing issues THEN the system SHALL assign severity levels (Critical, High, Medium, Low) based on impact
3. WHEN generating JSON reports THEN the system SHALL create machine-readable output in schema-validation-report.json
4. WHEN generating markdown reports THEN the system SHALL create human-readable output in SCHEMA_VALIDATION_REPORT.md
5. WHEN displaying console output THEN the system SHALL use color coding (green for matches, red for mismatches, yellow for warnings)

### Requirement 5: Fix Recommendation Generation

**User Story:** As a developer, I want automated fix recommendations for schema drift issues, so that I can quickly understand what code changes are needed.

#### Acceptance Criteria

1. WHEN reading validation reports THEN the system SHALL parse all detected schema drift issues
2. WHEN generating fix recommendations THEN the system SHALL focus on the six critical tables first
3. WHEN recommending column name fixes THEN the system SHALL show the correct Drizzle definition to match the database column name
4. WHEN recommending data type fixes THEN the system SHALL show the correct Drizzle type definition matching the database type
5. WHEN recommending enum fixes THEN the system SHALL show the correct enum values from the database
6. WHEN generating fix reports THEN the system SHALL create SCHEMA_DRIFT_FIXES.md with before/after code examples

### Requirement 6: Schema Fix Verification

**User Story:** As a developer, I want to verify that schema fixes were applied correctly, so that I can confirm the schema drift is resolved before proceeding to seeding.

#### Acceptance Criteria

1. WHEN running fix verification THEN the system SHALL re-validate only the six critical tables that were fixed
2. WHEN comparing before and after THEN the system SHALL show the number of issues resolved
3. WHEN all critical issues are resolved THEN the system SHALL return exit code 0 for CI/CD integration
4. WHEN critical issues remain THEN the system SHALL return exit code 1 and display remaining issues
5. WHEN generating verification reports THEN the system SHALL show improvement metrics (issues before, issues after, percentage improvement)

### Requirement 7: Naming Convention Handling

**User Story:** As a developer, I want the system to handle both camelCase and snake_case naming conventions, so that it works with all three schema files in the codebase.

#### Acceptance Criteria

1. WHEN converting camelCase to snake_case THEN the system SHALL correctly transform names (e.g., invoiceNumber → invoice_number)
2. WHEN converting snake_case to camelCase THEN the system SHALL correctly transform names (e.g., invoice_number → invoiceNumber)
3. WHEN comparing column names THEN the system SHALL normalize both sides to the same case before comparison
4. WHEN the main schema uses camelCase THEN the system SHALL convert to snake_case for database comparison
5. WHEN RBAC or VIP Portal schemas use snake_case THEN the system SHALL use direct comparison with database

### Requirement 8: Database-First Approach

**User Story:** As a developer, I want the system to treat the database as the source of truth, so that Drizzle schema definitions are updated to match production reality.

#### Acceptance Criteria

1. WHEN generating fix recommendations THEN the system SHALL recommend changes to Drizzle schema, not database structure
2. WHEN a column exists in database but not in Drizzle THEN the system SHALL recommend adding the column to Drizzle schema
3. WHEN a column exists in Drizzle but not in database THEN the system SHALL flag it as an extra column requiring investigation
4. WHEN data types differ THEN the system SHALL recommend updating Drizzle to match the database type
5. WHEN enum values differ THEN the system SHALL recommend updating Drizzle enum to match database enum values

### Requirement 9: Developer Workflow Integration

**User Story:** As a developer, I want convenient npm scripts for the validation workflow, so that I can easily run validation, generate fixes, and verify corrections.

#### Acceptance Criteria

1. WHEN running pnpm validate:schema THEN the system SHALL execute comprehensive schema validation
2. WHEN running pnpm fix:schema:report THEN the system SHALL generate fix recommendations
3. WHEN running pnpm validate:schema:fixes THEN the system SHALL verify that fixes were applied correctly
4. WHEN validation completes THEN the system SHALL display summary statistics in the console
5. WHEN validation fails THEN the system SHALL provide clear next steps for the developer

### Requirement 10: Documentation and Guidance

**User Story:** As a developer, I want clear documentation on the schema validation workflow, so that I understand when and how to use these tools.

#### Acceptance Criteria

1. WHEN reading README.md THEN the developer SHALL find a Schema Validation section explaining the workflow
2. WHEN reading documentation THEN the developer SHALL understand why schema validation is critical for seeding
3. WHEN reading documentation THEN the developer SHALL see examples of running each validation command
4. WHEN reading documentation THEN the developer SHALL understand the six critical tables and their importance
5. WHEN encountering the old validation script THEN the developer SHALL see a deprecation notice pointing to the comprehensive tool
