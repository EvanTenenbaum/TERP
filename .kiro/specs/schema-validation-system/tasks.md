# Implementation Plan

- [x] 1. Set up utility infrastructure and naming conventions
  - Create `scripts/utils/` directory structure
  - Implement core naming convention utilities (camelToSnake, snakeToCamel)
  - Implement type normalization utilities
  - _Requirements: 2.3, 2.4, 7.1, 7.2_

- [ ]\* 1.1 Write property test for naming convention conversions
  - **Property 8: CamelCase to Snake_case Conversion Consistency**
  - **Property 30: Snake_case to CamelCase Conversion Consistency**
  - **Validates: Requirements 2.3, 7.1, 7.2**

- [x] 2. Implement database introspection utilities
  - Create `scripts/utils/schema-introspection.ts`
  - Implement `getTableList()` function to query information_schema.TABLES
  - Implement `getTableColumns()` function to query DESCRIBE and information_schema.COLUMNS
  - Implement `getEnumValues()` function to parse COLUMN_TYPE for enum values
  - Implement `getForeignKeys()` function to query information_schema.KEY_COLUMN_USAGE
  - Implement `getIndexes()` function to query information_schema.STATISTICS
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]\* 2.1 Write property test for table discovery completeness
  - **Property 1: Complete Table Discovery**
  - **Validates: Requirements 1.1**

- [ ]\* 2.2 Write property test for column metadata extraction
  - **Property 2: Complete Column Metadata Extraction**
  - **Validates: Requirements 1.2**

- [ ]\* 2.3 Write property test for enum value extraction
  - **Property 3: Enum Value Extraction Completeness**
  - **Validates: Requirements 1.3**

- [ ]\* 2.4 Write property test for foreign key discovery
  - **Property 4: Foreign Key Discovery Completeness**
  - **Validates: Requirements 1.4**

- [ ]\* 2.5 Write property test for index discovery
  - **Property 5: Index Discovery Completeness**
  - **Validates: Requirements 1.5**

- [x] 3. Implement schema comparison utilities
  - Implement `normalizeDataType()` function for MySQL/Drizzle type comparison
  - Implement `compareColumnDefinitions()` function to generate detailed diffs
  - Implement enum set comparison logic
  - Implement nullable constraint comparison
  - Implement default value comparison
  - Implement foreign key comparison
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]\* 3.1 Write property test for data type equivalence detection
  - **Property 12: Data Type Equivalence Detection**
  - **Validates: Requirements 3.2**

- [ ]\* 3.2 Write property test for enum set difference detection
  - **Property 13: Enum Set Difference Detection**
  - **Validates: Requirements 3.3**

- [ ]\* 3.3 Write property test for column name mismatch detection
  - **Property 11: Column Name Mismatch Detection**
  - **Validates: Requirements 3.1, 7.3**

- [x] 4. Implement comprehensive validation tool
  - Create `scripts/validate-schema-comprehensive.ts`
  - Implement database connection and introspection orchestration
  - Implement Drizzle schema file parsing for all three schema files
  - Implement schema comparison logic using utility functions
  - Implement issue prioritization (critical tables first)
  - Implement severity assignment based on issue type and table
  - _Requirements: 2.1, 2.2, 2.5, 3.1-3.6, 4.1, 4.2_

- [ ]\* 4.1 Write property test for schema parsing completeness
  - **Property 6: Schema Parsing Completeness**
  - **Property 7: Column Definition Extraction Completeness**
  - **Validates: Requirements 2.1, 2.2**

- [ ]\* 4.2 Write property test for critical table prioritization
  - **Property 17: Critical Table Prioritization**
  - **Validates: Requirements 4.1**

- [ ]\* 4.3 Write property test for severity assignment consistency
  - **Property 18: Severity Assignment Consistency**
  - **Validates: Requirements 4.2**

- [x] 5. Implement report generation
  - Implement JSON report generation (schema-validation-report.json)
  - Implement Markdown report generation (SCHEMA_VALIDATION_REPORT.md)
  - Implement color-coded console output (green/red/yellow)
  - Implement summary statistics calculation and display
  - _Requirements: 4.3, 4.4, 4.5, 9.4_

- [ ]\* 5.1 Write property test for JSON report validity
  - **Property 19: JSON Report Validity**
  - **Validates: Requirements 4.3**

- [ ]\* 5.2 Write property test for markdown report generation
  - **Property 20: Markdown Report Generation**
  - **Validates: Requirements 4.4**

- [ ]\* 5.3 Write unit test for console output color coding
  - Test that color codes are present in output
  - **Validates: Requirements 4.5**

- [x] 6. Implement fix recommendation generator
  - Create `scripts/fix-schema-drift.ts`
  - Implement validation report parsing
  - Implement critical table prioritization in fix generation
  - Implement fix recommendation generation for each issue type:
    - Column name mismatches
    - Data type mismatches
    - Enum value mismatches
    - Nullable constraint mismatches
    - Missing columns
    - Extra columns
  - Implement before/after code example generation
  - Implement SCHEMA_DRIFT_FIXES.md markdown generation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]\* 6.1 Write property test for validation report parsing completeness
  - **Property 21: Validation Report Parsing Completeness**
  - **Validates: Requirements 5.1**

- [ ]\* 6.2 Write property test for fix recommendation prioritization
  - **Property 22: Fix Recommendation Prioritization**
  - **Validates: Requirements 5.2**

- [ ]\* 6.3 Write property test for column name fix correctness
  - **Property 23: Column Name Fix Correctness**
  - **Validates: Requirements 5.3**

- [ ]\* 6.4 Write property test for data type fix correctness
  - **Property 24: Data Type Fix Correctness**
  - **Validates: Requirements 5.4**

- [ ]\* 6.5 Write property test for enum fix correctness
  - **Property 25: Enum Fix Correctness**
  - **Validates: Requirements 5.5**

- [ ]\* 6.6 Write property test for fix report generation completeness
  - **Property 26: Fix Report Generation Completeness**
  - **Validates: Requirements 5.6**

- [ ]\* 6.7 Write property test for fix target consistency
  - **Property 33: Fix Target Consistency**
  - **Validates: Requirements 8.1**

- [ ]\* 6.8 Write property test for missing column recommendations
  - **Property 34: Missing Column Recommendation**
  - **Validates: Requirements 8.2**

- [ ]\* 6.9 Write property test for extra column detection
  - **Property 35: Extra Column Detection**
  - **Validates: Requirements 8.3**

- [x] 7. Implement verification tool
  - Create `scripts/validate-schema-fixes.ts`
  - Implement critical table re-validation (only 6 tables)
  - Implement before/after comparison logic
  - Implement improvement metrics calculation
  - Implement pass/fail determination and exit codes
  - Implement verification report generation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]\* 7.1 Write property test for verification scope limitation
  - **Property 27: Verification Scope Limitation**
  - **Validates: Requirements 6.1**

- [ ]\* 7.2 Write property test for issue resolution calculation
  - **Property 28: Issue Resolution Calculation Accuracy**
  - **Validates: Requirements 6.2**

- [ ]\* 7.3 Write property test for verification metrics completeness
  - **Property 29: Verification Report Metrics Completeness**
  - **Validates: Requirements 6.5**

- [ ]\* 7.4 Write unit test for exit code behavior
  - Test exit code 0 when all critical issues resolved
  - Test exit code 1 when critical issues remain
  - **Validates: Requirements 6.3, 6.4**

- [x] 8. Add npm scripts and integrate with package.json
  - Add `validate:schema` script to run comprehensive validation
  - Add `fix:schema:report` script to generate fix recommendations
  - Add `validate:schema:fixes` script to verify fixes
  - Update package.json with new scripts
  - _Requirements: 9.1, 9.2, 9.3_

- [ ]\* 8.1 Write integration test for npm script execution
  - Test that `pnpm validate:schema` executes correctly
  - Test that `pnpm fix:schema:report` executes correctly
  - Test that `pnpm validate:schema:fixes` executes correctly
  - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 9. Update existing validation script with deprecation notice
  - Modify `scripts/validate-schema-sync.ts`
  - Add deprecation comment at top of file
  - Add console warning pointing to comprehensive tool
  - _Requirements: 10.5_

- [ ]\* 9.1 Write unit test for deprecation notice
  - Test that deprecation notice is displayed
  - **Validates: Requirements 10.5**

- [x] 10. Add documentation to README.md
  - Add Schema Validation section to README.md
  - Document the validation workflow with examples
  - Document the three npm scripts
  - Document the six critical tables and their importance
  - Add reference to CONSULTANT_ANALYSIS_SEEDING_STRATEGY.md
  - _Requirements: 10.1, 10.3_

- [ ]\* 10.1 Write unit test for documentation presence
  - Test that Schema Validation section exists in README.md
  - Test that command examples are present
  - **Validates: Requirements 10.1, 10.3**

- [x] 11. Implement error handling and validation failure guidance
  - Add database connection error handling with clear messages
  - Add schema parsing error handling with graceful degradation
  - Add report generation error handling
  - Implement validation failure guidance (next steps for developer)
  - _Requirements: 9.5_

- [ ]\* 11.1 Write property test for validation failure guidance
  - **Property 39: Validation Failure Guidance**
  - **Validates: Requirements 9.5**

- [x] 12. Implement schema-specific conversion behavior
  - Add logic to detect which schema file a table comes from
  - Implement camelCase conversion for main schema (schema.ts)
  - Implement direct comparison for RBAC and VIP Portal schemas
  - _Requirements: 7.4, 7.5_

- [ ]\* 12.1 Write property test for schema-specific conversion
  - **Property 31: Schema-Specific Conversion Behavior**
  - **Property 32: Schema-Specific Direct Comparison**
  - **Validates: Requirements 7.4, 7.5**

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Manual testing and validation
  - Ran validation against production database: 120 tables, 1345 columns
  - All critical tables detected and validated
  - Reports generated correctly (JSON and Markdown)
  - Color-coded console output displays correctly
  - _Requirements: All_

- [x] 15. Apply fixes to critical tables in drizzle/schema.ts
  - Fixed `invoices` table: Added missing `deleted_at` column
  - Fixed `payments` table: Added missing `deleted_at` column
  - All other critical tables already matched database structure
  - Comments added above fixed tables
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 16. Run verification and confirm fixes
  - Ran `pnpm validate:schema` - exit code 0
  - Total Issues: 0 (was 2 before fixes)
  - All 120 tables pass validation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 17. Final checkpoint - Schema validation complete
  - All schema drift issues resolved
  - Validation passes with 0 issues
